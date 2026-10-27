// app.js — Menú con sistemas (caprino y ovino), navegación y arranque de la aplicación

// Secciones de cada sistema. El ovino no tiene Leche.
const ITEMS_COMUNES = [
  ['resumen', 'Resumen', 'dashboard'], ['animales', 'Animales', 'tag'], ['empadre', 'Empadre', 'heart'], ['partos', 'Partos', 'sprout'],
  ['produccion', 'Producción', 'scale'], ['leche', 'Leche', 'droplet'], ['salud', 'Salud', 'health'], ['manejo', 'Manejo', 'clipboard'], ['ventas', 'Ventas', 'receipt'],
];
const SISTEMAS = {
  caprino: { nombre: 'Sistema caprino', icono: 'goat', items: ITEMS_COMUNES },
  ovino:   { nombre: 'Sistema ovino',   icono: 'sheep', items: ITEMS_COMUNES.filter(i => i[0] !== 'leche') },
};

// Contexto actual: sistema (null = dashboard general), vista del menú y vista que se dibuja
const ctx = { sis: null, vista: 'dashboard', dom: 'dashboard' };

function construirNav() {
  const sistemas = Object.entries(SISTEMAS).map(([k, s]) => `
    <div class="nav-sistema" data-sis="${k}">
      <button type="button" class="nav-sistema-btn" aria-expanded="false" aria-controls="sub-${k}">
        ${icon(s.icono)}<span>${esc(s.nombre)}</span><span class="nav-count" data-cuenta-sis="${k}" hidden></span>${icon('chev-down', 'chev')}
      </button>
      <div class="nav-sub" id="sub-${k}" hidden>
        ${s.items.map(([v, label, ic]) => `<a class="nav-item" href="#/${k}/${v}" data-nav="${k}/${v}">${icon(ic)}<span>${esc(label)}</span><span class="nav-count" data-cuenta="${k}/${v}" hidden></span></a>`).join('')}
      </div>
    </div>`).join('');
  document.getElementById('nav').innerHTML = `
    <div class="nav-group"><a class="nav-item" href="#/dashboard" data-nav="dashboard">${icon('dashboard')}<span>Dashboard general</span></a></div>
    <div class="nav-group-title">Sistemas</div>
    ${sistemas}`;
  document.querySelectorAll('.nav-sistema-btn').forEach(b => b.addEventListener('click', () => {
    const sis = b.closest('.nav-sistema').dataset.sis;
    if (b.getAttribute('aria-expanded') === 'true') { desplegar(null); return; }   // solo pliega
    desplegar(sis);
    if (ctx.sis !== sis) location.hash = `#/${sis}/resumen`;                       // y entra al sistema
  }));
}

// Muestra las secciones de un sistema (solo uno abierto a la vez)
function desplegar(sis) {
  document.querySelectorAll('.nav-sistema').forEach(g => {
    const abierto = g.dataset.sis === sis;
    g.querySelector('.nav-sistema-btn').setAttribute('aria-expanded', String(abierto));
    g.querySelector('.nav-sub').hidden = !abierto;
    g.classList.toggle('abierto', abierto);
  });
}

function leerHash() {
  const m = location.hash.match(/^#\/(caprino|ovino)\/(\w+)/);
  if (m) return { sis: m[1], vista: m[2] };
  return { sis: null, vista: 'dashboard' };
}

function mostrarVista(sis, vista) {
  if (sis && !SISTEMAS[sis].items.some(i => i[0] === vista)) vista = 'resumen';   // p. ej. Leche en ovino
  ctx.sis = sis; ctx.vista = sis ? vista : 'dashboard';
  ctx.dom = (!sis || vista === 'resumen') ? 'dashboard' : vista;
  esp.actual = sis || 'todos';

  document.querySelectorAll('.view').forEach(v => { v.hidden = v.id !== 'view-' + ctx.dom; });
  const clave = sis ? `${sis}/${ctx.vista}` : 'dashboard';
  document.querySelectorAll('[data-nav]').forEach(a => { if (a.dataset.nav === clave) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  desplegar(sis);

  const nombre = !sis ? 'Dashboard general' : SISTEMAS[sis].items.find(i => i[0] === ctx.vista)[1];
  document.getElementById('crumb').innerHTML = (sis ? `Sistema ganadero / ${esc(SISTEMAS[sis].nombre)} / ` : 'Sistema ganadero / ') + `<strong>${esc(nombre)}</strong>`;
  document.title = `${nombre}${sis ? ' · ' + SISTEMAS[sis].nombre : ''} · Sistema ganadero`;
  cerrarMenu();
  renderVistaActiva();
  window.scrollTo(0, 0);
}

function renderVistaActiva() {
  if (ctx.dom === 'dashboard') renderDashboard(); else renderSeccion(ctx.dom);
}

function actualizarContadores() {
  const previa = esp.actual;
  Object.keys(SISTEMAS).forEach(sis => {
    esp.actual = sis;
    const D = datosE();
    const n = {
      empadre: D.empadres.filter(e => vigente(e) && diasParto(e) != null && diasParto(e) <= 7).length,
      salud: D.salud.filter(s => s.estado === 'abierto').length,
      manejo: D.manejo.filter(x => estadoManejo(x) === 'vencido').length,
    };
    Object.entries(n).forEach(([k, v]) => {
      const el = document.querySelector(`[data-cuenta="${sis}/${k}"]`); if (!el) return;
      el.hidden = !v; el.textContent = v; el.classList.add('alerta');
      el.title = k === 'empadre' ? 'Partos esperados en 7 días o menos' : k === 'salud' ? 'Casos de salud abiertos' : 'Actividades vencidas';
    });
    const total = n.empadre + n.salud + n.manejo, g = document.querySelector(`[data-cuenta-sis="${sis}"]`);
    if (g) { g.hidden = !total; g.textContent = total; g.classList.add('alerta'); g.title = 'Avisos pendientes en este sistema'; }
  });
  esp.actual = previa;
}

function abrirMenu() { document.getElementById('sidebar').classList.add('open'); document.getElementById('scrim').classList.add('open'); }
function cerrarMenu() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('scrim').classList.remove('open'); }

let vistasListas = false;

function mostrarDesdeHash() { const r = leerHash(); mostrarVista(r.sis, r.vista); }

async function iniciarApp() {
  const cargando = document.getElementById('cargando'), error = document.getElementById('error-carga');
  error.hidden = true; cargando.hidden = false;
  try {
    await cargarTodo();
  } catch (e) {
    cargando.hidden = true; error.hidden = false;
    error.innerHTML = `<div class="empty-title">No se pudieron cargar los datos</div><p>${esc(errMsg(e))}</p><p class="muted">Verifica que ejecutaste database/schema.sql (o las migraciones) en tu proyecto de Supabase y que js/config.js tiene la URL y la clave correctas.</p><button class="btn btn-primary" id="reintentar">Reintentar</button>`;
    document.getElementById('reintentar').onclick = () => { appIniciada = false; iniciarApp(); };
    return;
  }
  cargando.hidden = true;
  if (!vistasListas) { vistasListas = true; iniciarSecciones(); iniciarDashboard(); }
  actualizarContadores();
  mostrarDesdeHash();
  iniciarTiempoReal();
}

alCambiarDatos(() => { if (!vistasListas) return; actualizarContadores(); renderVistaActiva(); });

// ---------- Eventos globales ----------
construirNav();
document.getElementById('menu-toggle').addEventListener('click', abrirMenu);
document.getElementById('scrim').addEventListener('click', cerrarMenu);
window.addEventListener('hashchange', () => { if (appIniciada && vistasListas) mostrarDesdeHash(); });
document.addEventListener('click', e => { const f = e.target.closest('[data-ficha]'); if (f) abrirFicha(f.dataset.ficha); });

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
iniciarAuth();

