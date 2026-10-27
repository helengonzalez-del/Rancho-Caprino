// store.js — Datos en memoria, carga desde Supabase y consultas de apoyo

const store = { razas: [], animales: [], empadres: [], partos: [], pesajes: [], leche: [], salud: [], manejo: [], ventas: [], venta_animales: [] };
let lecheDesde = null;            // fecha desde la que se cargó leche (null = todo el historial)
const animalMap = new Map();

const FUENTES = {
  razas:          { tabla: 'razas',          orden: 'nombre' },
  animales:       { tabla: 'v_animales',     orden: 'identificador' },
  empadres:       { tabla: 'empadres',       orden: 'fecha_monta', desc: true },
  partos:         { tabla: 'partos',         orden: 'fecha_parto', desc: true },
  pesajes:        { tabla: 'v_pesajes',      orden: 'fecha', desc: true },
  leche:          { tabla: 'leche',          orden: 'fecha', desc: true },
  salud:          { tabla: 'salud',          orden: 'fecha', desc: true },
  manejo:         { tabla: 'manejo',         orden: 'fecha', desc: true },
  ventas:         { tabla: 'ventas',         orden: 'fecha', desc: true },
  venta_animales: { tabla: 'venta_animales', orden: 'id' },
};

// Si cambia una tabla, estas son las que hay que volver a cargar
const DEPENDENCIAS = {
  razas: ['razas'],
  animales: ['animales'],
  empadres: ['empadres', 'animales'],
  partos: ['partos', 'empadres', 'animales'],
  pesajes: ['pesajes', 'animales'],
  leche: ['leche', 'animales'],
  salud: ['salud'],
  manejo: ['manejo', 'animales'],
  ventas: ['ventas'],
  venta_animales: ['venta_animales', 'ventas', 'animales'],
};

// Supabase devuelve máximo 1000 filas por consulta: se pide por páginas.
async function fetchAll(consulta) {
  const TAM = 1000;
  let todo = [];
  for (let desde = 0; ; desde += TAM) {
    const { data, error } = await consulta().range(desde, desde + TAM - 1);
    if (error) throw error;
    todo = todo.concat(data || []);
    if (!data || data.length < TAM) break;
  }
  return todo;
}

async function cargarTabla(key) {
  const f = FUENTES[key];
  store[key] = await fetchAll(() => {
    let q = db.from(f.tabla).select('*');
    if (key === 'leche' && lecheDesde) q = q.gte('fecha', lecheDesde);
    q = q.order(f.orden, { ascending: !f.desc });
    return f.orden === 'id' ? q : q.order('id');
  });
}

let _onData = () => {};
function alCambiarDatos(fn) { _onData = fn; }

function indexar() {
  animalMap.clear();
  store.animales.forEach(a => animalMap.set(a.id, a));
}

async function cargarTodo() {
  lecheDesde = addDays(hoy(), -LECHE_DIAS_INICIAL);
  await Promise.all(Object.keys(FUENTES).map(cargarTabla));
  indexar();
  _onData();
}

let _pend = new Set(), _timer = null;
function recargar(tablas) {
  const claves = new Set();
  [].concat(tablas).forEach(t => (DEPENDENCIAS[t] || [t]).forEach(k => claves.add(k)));
  claves.forEach(k => _pend.add(k));
  clearTimeout(_timer);
  return new Promise(res => {
    _timer = setTimeout(async () => {
      const lote = [..._pend]; _pend = new Set();
      try { await Promise.all(lote.map(cargarTabla)); indexar(); _onData(); }
      catch (e) { showToast('No se pudieron actualizar los datos: ' + errMsg(e), 'error'); }
      res();
    }, 60);
  });
}

// Carga más historial de leche si se necesita una fecha anterior a la cargada
async function asegurarLeche(desde) {
  if (lecheDesde === null || !desde || desde >= lecheDesde) return false;
  lecheDesde = desde < addDays(hoy(), -LECHE_DIAS_INICIAL) ? null : desde;
  await cargarTabla('leche');
  _onData();
  return true;
}
async function cargarHistorialLeche() { lecheDesde = null; await cargarTabla('leche'); _onData(); }

// ---------- Consultas de apoyo ----------
// ---------- Especie activa ----------
// Cada sección muestra solo los datos de la especie elegida en el menú.
// 'todos' se usa únicamente en el dashboard general.
const esp = { actual: 'caprino' };   // 'caprino' | 'ovino' | 'todos'
const ESPECIES = { caprino: 'Sistema caprino', ovino: 'Sistema ovino' };
const enEsp = especie => esp.actual === 'todos' || especie === esp.actual;
const animalesE = () => store.animales.filter(a => enEsp(a.especie));
const deAnimal = (filas, campo) => filas.filter(r => enEsp((animalMap.get(r[campo]) || {}).especie));
function datosE() {
  return {
    animales: animalesE(),
    empadres: deAnimal(store.empadres, 'id_hembra'),
    partos: deAnimal(store.partos, 'id_madre'),
    pesajes: deAnimal(store.pesajes, 'id_animal'),
    leche: deAnimal(store.leche, 'id_animal'),
    salud: deAnimal(store.salud, 'id_animal'),
    manejo: store.manejo.filter(x => enEsp(x.especie)),
    ventas: store.ventas.filter(x => enEsp(x.especie)),
  };
}

const animal = id => animalMap.get(id);
const animalesActivos = (f) => animalesE().filter(a => a.estado === 'activo' && (!f || f(a)));
const lotes = () => [...new Set(animalesE().map(a => a.lote).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
const razas = () => [...new Set([...store.razas.filter(r => enEsp(r.especie)).map(r => r.nombre), ...animalesE().map(a => a.raza).filter(Boolean)])].sort((a, b) => a.localeCompare(b, 'es'));

function areteHtml(a) { return `<span class="arete">${esc(a.identificador)}</span>`; }
function animalHtml(id, conFicha = true, conNombre = true) {
  const a = animal(id);
  if (!a) return '<span class="muted">—</span>';
  const chip = conFicha
    ? `<button type="button" class="link-arete" data-ficha="${a.id}" title="Ver ficha de ${esc(a.identificador)}">${areteHtml(a)}</button>`
    : areteHtml(a);
  return `<span class="animal-celda">${chip}</span>`;
}
function animalTexto(id) {
  const a = animal(id);
  return a ? a.identificador : '';
}
function opcionAnimal(a) {
  return { id: a.id, html: areteHtml(a), meta: a.lote || '', texto: norm([a.identificador, a.lote, a.raza].join(' ')) };
}

// Retiro por medicamento: leche o carne no aptas
function retiroVigente(animalId, tipo = 'leche', fecha = hoy()) {
  const campo = tipo === 'leche' ? 'fin_retiro_leche' : 'fin_retiro_carne';
  return store.salud
    .filter(s => s.id_animal === animalId && s[campo] && s.fecha <= fecha && s[campo] >= fecha)
    .sort((a, b) => b[campo].localeCompare(a[campo]))[0] || null;
}
