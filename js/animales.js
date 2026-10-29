
 // animales.js — Inventario del hato, formulario y ficha individual

function sinPesajeReciente(a) {
  return a.estado === 'activo' && (!a.fecha_ultimo_peso || diffDays(hoy(), a.fecha_ultimo_peso) > 60);
}
function enRetiro(a) { return !!(retiroVigente(a.id, 'leche') || retiroVigente(a.id, 'carne')); }
const edadMeses = a => a.fecha_nacimiento ? diffDays(hoy(), a.fecha_nacimiento) / 30.4375 : null;

registrarSeccion({
  key: 'animales', titulo: 'Animales', icono: 'tag',
  subtitulo: 'Inventario del hato con categoría, genealogía, peso y producción de cada animal.',
  botones: [{ label: 'Registrar animal', primario: true, accion: () => formAnimal() }],
  defaults: { estado: 'activo' },
  orden: { key: 'arete', dir: 'asc' },
  csv: 'animales',
  vacio: { titulo: 'Todavía no hay animales', texto: 'Registra el primer animal del hato para empezar a llevar su historial.' },
  filas: animalesE,
  filtros: [
    { id: 'q', tipo: 'buscar', placeholder: 'Arete, padres, lote, raza…', texto: r => [r.identificador, r.nombre_madre, r.nombre_padre, animalTexto(r.id_madre), animalTexto(r.id_padre), r.lote, r.raza] },
    { id: 'sexo', tipo: 'select', label: 'Sexo', opciones: () => opts('sexo'), prueba: (r, v) => r.sexo === v },
    { id: 'estado', tipo: 'select', label: 'Estado', opciones: () => opts('estado'), prueba: (r, v) => r.estado === v },
    { id: 'cat', tipo: 'select', label: 'Categoría', opciones: () => opts('estado_productivo'), prueba: (r, v) => r.estado_productivo === v },
    { id: 'raza', tipo: 'select', label: 'Raza', opciones: () => razas().map(x => [x, x]), prueba: (r, v) => r.raza === v },
    { id: 'prop', tipo: 'select', label: 'Propósito', opciones: () => opts('proposito'), prueba: (r, v) => r.proposito === v },
    { id: 'lote', tipo: 'select', label: 'Lote', opciones: () => lotes().map(x => [x, x]), prueba: (r, v) => r.lote === v },
    { id: 'origen', tipo: 'select', label: 'Origen', opciones: () => opts('origen'), prueba: (r, v) => r.origen === v },
    { id: 'gest', tipo: 'select', label: 'Gestación', opciones: () => [['si', 'Gestantes'], ['no', 'No gestantes']], prueba: (r, v) => v === 'si' ? r.gestante : (r.sexo === 'hembra' && !r.gestante) },
    { id: 'edad', tipo: 'rango', label: 'Edad (meses)', valor: edadMeses },
    { id: 'peso', tipo: 'rango', label: 'Último peso (kg)', valor: r => r.ultimo_peso == null ? null : Number(r.ultimo_peso) },
    { id: 'sinpeso', tipo: 'check', label: 'Sin pesaje en 60 días', prueba: sinPesajeReciente },
    { id: 'retiro', tipo: 'check', label: 'En retiro por medicamento', prueba: enRetiro },
  ],
  columnas: [
    { key: 'arete', label: 'Arete', texto: r => r.identificador, html: r => animalHtml(r.id, true, false), csv: r => r.identificador },
    { key: 'sexo', label: 'Sexo', texto: r => lbl('sexo', r.sexo) },
    { key: 'raza', label: 'Raza', texto: r => r.raza },
    { key: 'edad', label: 'Edad', orden: r => r.fecha_nacimiento ? diffDays(hoy(), r.fecha_nacimiento) : null, html: r => r.fecha_nacimiento ? `<span title="${esc(fmtDate(r.fecha_nacimiento))}">${esc(edadTexto(r.fecha_nacimiento))}</span>` : '', csv: r => edadTexto(r.fecha_nacimiento) },
    { key: 'cat', label: 'Categoría', orden: r => r.estado_productivo, html: r => (r.estado_productivo ? badge('estado_productivo', r.estado_productivo) : '') + (r.gestante ? ` <span class="badge aviso" title="Parto estimado: ${esc(fmtDate(r.parto_estimado))}">Gestante</span>` : ''), csv: r => lbl('estado_productivo', r.estado_productivo) + (r.gestante ? ' (gestante)' : '') },
    { key: 'lote', label: 'Lote', texto: r => r.lote },
    { key: 'peso', label: 'Último peso', clase: 'num', orden: r => r.ultimo_peso == null ? null : Number(r.ultimo_peso), html: r => r.ultimo_peso == null ? '' : `${fmtNum(r.ultimo_peso)} kg<span class="sub">${esc(fmtDate(r.fecha_ultimo_peso))}</span>`, csv: r => r.ultimo_peso },
    { key: 'partos', label: 'Partos', clase: 'num', orden: r => r.sexo === 'hembra' ? r.numero_partos : null, html: r => r.sexo === 'hembra' ? String(r.numero_partos) : '', csv: r => r.sexo === 'hembra' ? r.numero_partos : '' },
    { key: 'leche', label: 'Leche 30 d', clase: 'num', orden: r => r.sexo === 'hembra' ? Number(r.litros_30d) : null, html: r => Number(r.litros_30d) > 0 ? `${fmtNum(r.litros_30d)} L` : '', csv: r => r.litros_30d },
    { key: 'estado', label: 'Estado', orden: r => r.estado, html: r => badge('estado', r.estado), csv: r => lbl('estado', r.estado) },
  ],
  resumen: f => [
    { label: 'Animales', valor: fmtNum(f.length, 0) },
    { label: 'Hembras', valor: fmtNum(f.filter(r => r.sexo === 'hembra').length, 0) },
    { label: 'Machos', valor: fmtNum(f.filter(r => r.sexo === 'macho').length, 0) },
    { label: 'Gestantes', valor: fmtNum(f.filter(r => r.gestante).length, 0) },
    { label: 'En ordeño', valor: fmtNum(f.filter(r => r.estado_productivo === 'lactando').length, 0) },
    { label: 'Leche últimos 30 días', valor: fmtNum(sum(f, r => r.litros_30d), 0), unidad: 'L' },
  ],
  acciones: () => [{ act: 'ficha', label: 'Ver ficha', icono: 'eye' }, { act: 'editar', label: 'Editar', icono: 'edit' }, { act: 'borrar', label: 'Eliminar', icono: 'trash', peligro: true }],
  manejadores: { ficha: r => abrirFicha(r.id), editar: r => formAnimal(r), borrar: r => borrarAnimal(r) },
});

// Categorías productivas según el sexo del animal
const CAT_HEMBRA = ['cria', 'destetado', 'reemplazo', 'engorda', 'servicio', 'gestante', 'lactando', 'seca'];
const CAT_MACHO = ['cria', 'destetado', 'reemplazo', 'engorda', 'servicio', 'semental'];
function categoriasPorSexo(sexo) {
  const lista = sexo === 'hembra' ? CAT_HEMBRA : sexo === 'macho' ? CAT_MACHO : Object.keys(L.estado_productivo);
  return lista.map(k => [k, L.estado_productivo[k]]);
}

function formAnimal(a) {
  const edit = !!a;
  const hembras = animalesE().filter(x => x.sexo === 'hembra' && x.id !== a?.id).map(x => [x.id, animalTexto(x.id)]);
  const machos = animalesE().filter(x => x.sexo === 'macho' && x.id !== a?.id).map(x => [x.id, animalTexto(x.id)]);
  abrirFormulario({
    titulo: edit ? `Editar ${a.identificador}` : 'Registrar animal',
    sub: edit ? 'Los cambios se reflejan de inmediato en todas las secciones.' : 'Los campos con * son obligatorios.',
    tam: 'wide',
    valores: edit ? { ...a, raza: a.raza || '' } : { estado: 'activo', origen: 'nacido_en_rancho', fecha_ingreso: hoy(), partos_previos: 0 },
    campos: [
      { name: 's1', tipo: 'section', label: 'Identificación' },
      { name: 'identificador', label: 'Número de arete', tipo: 'text', requerido: true, placeholder: 'Ej: C-014' },
      { name: 'sexo', label: 'Sexo', tipo: 'select', requerido: true, opciones: opts('sexo') },
      { name: 'raza', label: 'Raza', tipo: 'select', opciones: () => [...razas().map(x => [x, x]), ['__nueva__', '+ Agregar otra raza…']] },
      { name: 'raza_nueva', label: 'Nombre de la nueva raza', tipo: 'text', requerido: true, mostrarSi: v => v.raza === '__nueva__' },
      { name: 'proposito', label: 'Propósito', tipo: 'select', opciones: opts('proposito') },
      { name: 's2', tipo: 'section', label: 'Origen y estado' },
      { name: 'fecha_nacimiento', label: 'Fecha de nacimiento', tipo: 'date' },
      { name: 'fecha_ingreso', label: 'Fecha de ingreso al rancho', tipo: 'date' },
      { name: 'origen', label: 'Origen', tipo: 'select', sinVacio: true, opciones: opts('origen') },
      { name: 'costo_compra', label: 'Costo de compra ($)', tipo: 'number', requerido: true, min: 0, paso: '0.01', mostrarSi: v => v.origen === 'comprado', ayuda: 'Se utilizará para calcular la utilidad cuando se venda el animal.' },
      { name: 'estado', label: 'Estado general', tipo: 'select', sinVacio: true, opciones: opts('estado') },
      { name: 'estado_productivo', label: 'Categoría productiva', tipo: 'select', dinamico: true, opciones: v => categoriasPorSexo(v.sexo), ayuda: 'Se actualiza sola al registrar partos, secado y destete.' },
      { name: 'lote', label: 'Lote o corral', tipo: 'text', lista: lotes, placeholder: 'Ej: Producción' },
      { name: 'peso_inicial', label: 'Peso inicial (kg)', tipo: 'number', min: 0, paso: '0.01', mostrarSi: () => !edit, ayuda: 'Crea el primer pesaje del animal.' },
      { name: 'partos_previos', label: 'Partos anteriores al sistema', tipo: 'number', min: 0, paso: 1, mostrarSi: v => v.sexo !== 'macho' },
      { name: 'fecha_baja', label: 'Fecha de baja', tipo: 'date', mostrarSi: v => v.estado === 'muerto' || v.estado === 'descartado' },
      { name: 'motivo_baja', label: 'Motivo de baja', tipo: 'text', mostrarSi: v => v.estado === 'muerto' || v.estado === 'descartado' },
      { name: 's3', tipo: 'section', label: 'Genealogía' },
      { name: 'id_padre', label: 'Padre', tipo: 'select', vacio: 'Sin registrar', opciones: machos },
      { name: 'nombre_padre', label: 'Nombre del padre (si no está registrado)', tipo: 'text', mostrarSi: v => !v.id_padre },
      { name: 'id_madre', label: 'Madre', tipo: 'select', vacio: 'Sin registrar', opciones: hembras },
      { name: 'nombre_madre', label: 'Nombre de la madre (si no está registrada)', tipo: 'text', mostrarSi: v => !v.id_madre },
      { name: 'notas', label: 'Notas', tipo: 'textarea' },
    ],
    alGuardar: async v => {
      let raza = v.raza;
      if (raza === '__nueva__') {
        raza = v.raza_nueva;
        const { error } = await db.from('razas').upsert({ nombre: raza, especie: esp.actual }, { onConflict: 'nombre,especie' });
        if (error) throw error;
      }
      const hembra = v.sexo === 'hembra';
      const p = {
        especie: edit ? a.especie : esp.actual, identificador: v.identificador, sexo: v.sexo, raza: raza || null,
        proposito: v.proposito, fecha_nacimiento: v.fecha_nacimiento, fecha_ingreso: v.fecha_ingreso || hoy(), origen: v.origen,
        estado: v.estado, estado_productivo: v.estado_productivo, lote: v.lote, partos_previos: hembra ? (v.partos_previos || 0) : 0,
        costo_compra: v.origen === 'comprado' ? (v.costo_compra ?? null) : null,
        fecha_baja: v.fecha_baja ?? null, motivo_baja: v.motivo_baja ?? null,
        id_padre: v.id_padre, nombre_padre: v.id_padre ? null : (v.nombre_padre ?? null),
        id_madre: v.id_madre, nombre_madre: v.id_madre ? null : (v.nombre_madre ?? null), notas: v.notas,
      };
      if (edit) {
        const { error } = await db.from('animales').update(p).eq('id', a.id);
        if (error) throw error;
      } else {
        if (v.peso_inicial) p.peso_inicial = v.peso_inicial;
        const { data, error } = await db.from('animales').insert(p).select('id').single();
        if (error) throw error;
        if (v.peso_inicial) {
          const { error: e2 } = await db.from('pesajes').insert({ id_animal: data.id, fecha: v.fecha_nacimiento || hoy(), peso: v.peso_inicial, tipo: v.origen === 'nacido_en_rancho' ? 'nacimiento' : 'rutina', observaciones: 'Peso inicial al registrar' });
          if (e2) throw e2;
        }
      }
      showToast(edit ? 'Animal actualizado' : 'Animal registrado');
      await recargar(['animales', 'razas', 'pesajes']);
    },
  });
}

async function borrarAnimal(a) {
  const ok = await confirmar({
    titulo: `Eliminar ${a.identificador}`, peligro: true, etiqueta: 'Eliminar animal',
    mensaje: 'Se borrarán también sus pesajes, registros de leche, salud, manejo y empadres. Si solo salió del hato, mejor cambia su estado en lugar de eliminarlo.',
  });
  if (!ok) return;
  const { error } = await db.from('animales').delete().eq('id', a.id);
  if (error) { showToast(errMsg(error), 'error'); return; }
  showToast('Animal eliminado');
  await recargar(['animales', 'empadres', 'partos', 'pesajes', 'leche', 'salud', 'manejo']);
}

// ============ FICHA INDIVIDUAL ============
function abrirFicha(id) {
  const a = animal(id); if (!a) return;
  const madre = a.id_madre ? animalHtml(a.id_madre, false) : (a.nombre_madre ? esc(a.nombre_madre) : '<span class="muted">Sin registrar</span>');
  const padre = a.id_padre ? animalHtml(a.id_padre, false) : (a.nombre_padre ? esc(a.nombre_padre) : '<span class="muted">Sin registrar</span>');
  const hijos = store.animales.filter(x => x.id_madre === id || x.id_padre === id);
  const pesos = store.pesajes.filter(p => p.id_animal === id).slice(0, 8);
  const salud = store.salud.filter(s => s.id_animal === id).slice(0, 6);
  // Incluye actividades individuales y actividades registradas para todo el hato
  // o para el lote al que pertenece este animal.
  const manejo = store.manejo.filter(x => {
  // Nunca mezclar eventos de especies diferentes.
    if (x.especie !== a.especie) return false;

  // Actividad registrada directamente para este animal.
   if (x.id_animal === id) return true;

  // Actividad general del hato o de su lote.
    if (!x.id_animal) {
      return !x.lote || x.lote === a.lote;
    }

   return false;
  }).slice(0, 8);
  const empadres = store.empadres.filter(e => e.id_hembra === id || e.id_macho === id).slice(0, 6);
  const partos = store.partos.filter(p => p.id_madre === id).slice(0, 6);
  const leche = store.leche.filter(l => l.id_animal === id && l.fecha >= addDays(hoy(), -30));
  const diasLeche = new Set(leche.map(l => l.fecha)).size;
  const dd = (t, v) => `<div><dt>${t}</dt><dd>${v || '<span class="muted">—</span>'}</dd></div>`;
  const tabla = (cab, filas) => filas.length ? `<table><thead><tr>${cab.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${filas.join('')}</tbody></table>` : '<p class="vacio">Sin registros.</p>';

  const retL = retiroVigente(id, 'leche'), retC = retiroVigente(id, 'carne');
  const cuerpo = `
    <div class="ficha-top">${areteHtml(a)}${badge('estado', a.estado)}${a.estado_productivo ? badge('estado_productivo', a.estado_productivo) : ''}${a.gestante ? `<span class="badge aviso">Gestante · parto ${esc(fmtDate(a.parto_estimado))}</span>` : ''}${retL ? `<span class="badge peligro">Leche en retiro hasta ${esc(fmtDate(retL.fin_retiro_leche))}</span>` : ''}${retC ? `<span class="badge peligro">Carne en retiro hasta ${esc(fmtDate(retC.fin_retiro_carne))}</span>` : ''}</div>
    <dl class="ficha-grid">
      ${dd('Sexo', lbl('sexo', a.sexo))}${dd('Raza', esc(a.raza))}${dd('Propósito', a.proposito ? lbl('proposito', a.proposito) : '')}
      ${dd('Nacimiento', a.fecha_nacimiento ? `${esc(fmtDate(a.fecha_nacimiento))} · ${esc(edadTexto(a.fecha_nacimiento))}` : '')}${dd('Origen', lbl('origen', a.origen))}${dd('Lote', esc(a.lote))}
      ${dd('Madre', madre)}${dd('Padre', padre)}
      ${dd('Último peso', a.ultimo_peso != null ? `${fmtNum(a.ultimo_peso)} kg · ${esc(fmtDate(a.fecha_ultimo_peso))}` : '')}
      ${a.sexo === 'hembra' ? dd('Partos', String(a.numero_partos)) + dd('Leche (30 días)', leche.length ? `${fmtNum(sum(leche, l => l.litros))} L · ${fmtNum(sum(leche, l => l.litros) / (diasLeche || 1))} L/día` : '') : dd('Crías registradas', String(hijos.length))}
    </dl>
    ${a.notas ? `<p style="margin-bottom:6px"><span class="muted">Notas:</span> ${esc(a.notas)}</p>` : ''}
    ${a.sexo === 'hembra' ? `<div class="ficha-block"><h4>Partos</h4>${tabla(['Fecha', 'Tipo', 'Crías (♂/♀/muertas)', 'Dificultad'], partos.map(p => `<tr><td>${esc(fmtDate(p.fecha_parto))}</td><td>${badge('parto', p.tipo_parto)}</td><td>${p.machos} / ${p.hembras} / ${p.nacidos_muertos}</td><td>${badge('dificultad', p.dificultad)}</td></tr>`))}</div>` : ''}
    <div class="ficha-block"><h4>Empadres</h4>${tabla(['Fecha', a.sexo === 'hembra' ? 'Macho' : 'Hembra', 'Parto estimado', 'Estado'], empadres.map(e => `<tr><td>${esc(fmtDate(e.fecha_monta))}</td><td>${animalHtml(a.sexo === 'hembra' ? e.id_macho : e.id_hembra, false) || esc(e.macho_externo || '')}</td><td>${esc(fmtDate(e.fecha_parto_estimada))}</td><td>${badge('empadre', e.estado)}</td></tr>`))}</div>
    ${hijos.length ? `<div class="ficha-block"><h4>Crías en el registro</h4><p>${hijos.map(h => animalHtml(h.id)).join(' &nbsp; ')}</p></div>` : ''}
    <div class="ficha-block"><h4>Pesajes recientes</h4>${tabla(['Fecha', 'Peso', 'GDP (g/día)'], pesos.map(p => `<tr><td>${esc(fmtDate(p.fecha))}</td><td>${fmtNum(p.peso)} kg</td><td class="${p.gdp_g < 0 ? 'neg' : ''}">${p.gdp_g == null ? '—' : fmtNum(p.gdp_g, 0)}</td></tr>`))}</div>
    <div class="ficha-block"><h4>Salud</h4>${tabla(['Fecha', 'Tipo', 'Detalle', 'Estado'], salud.map(s => `<tr><td>${esc(fmtDate(s.fecha))}</td><td>${badgeTipo(s.tipo)}</td><td>${esc(s.diagnostico || tratamientoDe(s) || '')}</td><td>${badge('caso', s.estado)}</td></tr>`))}</div>
    <div class="ficha-block"><h4>Manejo</h4>${tabla(['Fecha', 'Actividad', 'Aplica a', 'Estado'], manejo.map(x => `<tr><td>${esc(fmtDate(x.fecha))}</td><td>${esc(lbl('manejo', x.tipo))}</td><td>${esc(x.id_animal ? animalTexto(x.id_animal) : (x.lote ? 'Lote ' + x.lote : 'Todo el hato'))}</td><td>${badge('manejo_estado', estadoManejo(x))}</td></tr>`))}</div>`;

  const m = crearModal({ titulo: `Ficha de ${a.identificador}`, tam: 'wide', cuerpo, pie: `<button type="button" class="btn" data-editar>${icon('edit', 'icon-sm')}Editar</button><button type="button" class="btn btn-primary" data-cerrar>Cerrar</button>` });
  m.el.querySelector('[data-editar]').onclick = () => { m.cerrar(); formAnimal(a); };
}
