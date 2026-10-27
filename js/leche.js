// leche.js — Ordeño: registro por cabra, turno y destino; captura rápida del día

function ventanasRetiro() {
  const m = new Map();
  store.salud.filter(s => s.fin_retiro_leche).forEach(s => { if (!m.has(s.id_animal)) m.set(s.id_animal, []); m.get(s.id_animal).push([s.fecha, s.fin_retiro_leche]); });
  return m;
}
function lecheFilas() {
  const v = ventanasRetiro();
  return datosE().leche.map(l => ({ ...l, _retiro: (v.get(l.id_animal) || []).some(([a, b]) => l.fecha >= a && l.fecha <= b) }));
}

registrarSeccion({
  key: 'leche', titulo: 'Leche', icono: 'droplet',
  subtitulo: 'Producción de leche por cabra, turno y destino. Avisa cuando una cabra está en retiro por medicamento.',
  botones: [
    { label: 'Registrar ordeño', primario: true, accion: () => formLeche() },
    { label: 'Captura de ordeño', icono: 'droplet', accion: () => capturaLeche() },
  ],
  defaults: () => ({ fechas_desde: addDays(hoy(), -30) }),
  orden: { key: 'fecha', dir: 'desc' },
  csv: 'leche',
  vacio: { titulo: 'Sin registros de leche', texto: 'Registra el ordeño del día; con "Captura de ordeño" puedes anotar a todas las cabras de una vez.' },
  filas: lecheFilas,
  filtros: [
    { id: 'q', tipo: 'buscar', placeholder: 'Arete, nombre o notas…', texto: r => [animalTexto(r.id_animal), r.notas] },
    { id: 'turno', tipo: 'select', label: 'Turno', opciones: () => opts('turno'), prueba: (r, v) => r.turno === v },
    { id: 'destino', tipo: 'select', label: 'Destino', opciones: () => opts('destino'), prueba: (r, v) => r.destino === v },
    { id: 'lote', tipo: 'select', label: 'Lote', opciones: () => lotes().map(x => [x, x]), prueba: (r, v) => animalDe(r).lote === v },
    { id: 'raza', tipo: 'select', label: 'Raza', opciones: () => razas().map(x => [x, x]), prueba: (r, v) => animalDe(r).raza === v },
    { id: 'fechas', tipo: 'fechas', label: 'Fecha', valor: r => r.fecha },
    { id: 'litros', tipo: 'rango', label: 'Litros', valor: r => Number(r.litros) },
    { id: 'retiro', tipo: 'check', label: 'Solo en retiro por medicamento', prueba: r => r._retiro },
  ],
  alFiltrar: f => { if (f.fechas_desde) asegurarLeche(f.fechas_desde); },
  banner: () => lecheDesde ? { html: `Se cargó el historial desde el ${esc(fmtDate(lecheDesde))}. Para consultar fechas anteriores, usa el filtro de fecha o carga todo el historial. <button type="button" class="btn btn-sm" data-historial>Cargar todo el historial</button>` } : '',
  extraHtml: `<div class="panel" style="margin-bottom:14px"><div class="panel-head"><span class="panel-title">Producción diaria</span><span class="panel-note" id="nota-grafica-leche"></span></div><div class="chart-box" id="caja-grafica-leche"></div></div>`,
  alRenderizar: filas => graficaLeche(filas),
  columnas: [
    { key: 'fecha', label: 'Fecha', orden: r => r.fecha, html: r => esc(fmtDate(r.fecha)), csv: r => r.fecha },
    { key: 'cabra', label: 'Cabra', texto: r => animalTexto(r.id_animal), html: r => animalHtml(r.id_animal) },
    { key: 'turno', label: 'Turno', orden: r => r.turno, html: r => esc(lbl('turno', r.turno)), csv: r => lbl('turno', r.turno) },
    { key: 'litros', label: 'Litros', clase: 'num', orden: r => Number(r.litros), html: r => `<strong>${fmtNum(r.litros, 2)}</strong>`, csv: r => r.litros },
    { key: 'grasa', label: 'Grasa %', clase: 'num', orden: r => r.grasa_pct == null ? null : Number(r.grasa_pct), html: r => r.grasa_pct == null ? '' : fmtNum(r.grasa_pct, 2), csv: r => r.grasa_pct },
    { key: 'prot', label: 'Proteína %', clase: 'num', orden: r => r.proteina_pct == null ? null : Number(r.proteina_pct), html: r => r.proteina_pct == null ? '' : fmtNum(r.proteina_pct, 2), csv: r => r.proteina_pct },
    { key: 'destino', label: 'Destino', orden: r => r.destino, html: r => badge('destino', r.destino) + (r._retiro ? ' <span class="badge peligro" title="La cabra estaba en retiro por medicamento">En retiro</span>' : ''), csv: r => lbl('destino', r.destino) + (r._retiro ? ' (en retiro)' : '') },
    { key: 'notas', label: 'Notas', clase: 'wrap', texto: r => r.notas },
  ],
  resumen: f => {
    const total = sum(f, r => r.litros), dias = new Set(f.map(r => r.fecha)).size;
    const pares = new Set(f.map(r => r.id_animal + r.fecha)).size;
    return [
      { label: 'Litros totales', valor: fmtNum(total, 1), unidad: 'L' },
      { label: 'Promedio diario', valor: dias ? fmtNum(total / dias, 1) : '—', unidad: 'L/día', nota: `${dias} días con registro` },
      { label: 'Cabras ordeñadas', valor: fmtNum(new Set(f.map(r => r.id_animal)).size, 0) },
      { label: 'Promedio por cabra', valor: pares ? fmtNum(total / pares, 2) : '—', unidad: 'L/día' },
      { label: 'Grasa promedio', valor: fmtNum(avg(f, r => r.grasa_pct == null ? null : Number(r.grasa_pct)), 2), unidad: '%' },
      { label: 'Litros de desecho', valor: fmtNum(sum(f.filter(r => r.destino === 'desecho'), r => r.litros), 1), unidad: 'L', alerta: f.some(r => r.destino === 'desecho') },
    ];
  },
  acciones: () => [{ act: 'editar', label: 'Editar', icono: 'edit' }, { act: 'borrar', label: 'Eliminar', icono: 'trash', peligro: true }],
  manejadores: {
    editar: r => formLeche(r),
    borrar: async r => {
      if (!await confirmar({ titulo: 'Eliminar registro', mensaje: `Se eliminará el registro de ${animalTexto(r.id_animal)} del ${fmtDate(r.fecha)}.`, etiqueta: 'Eliminar', peligro: true })) return;
      const { error } = await db.from('leche').delete().eq('id', r.id);
      if (error) return showToast(errMsg(error), 'error');
      showToast('Registro eliminado'); recargar('leche');
    },
  },
});

document.addEventListener('click', e => { if (e.target.closest('[data-historial]')) { cargarHistorialLeche().then(() => showToast('Historial completo cargado')); } });

function graficaLeche(filas) {
  const caja = document.getElementById('caja-grafica-leche'), nota = document.getElementById('nota-grafica-leche');
  if (!caja) return;
  destruirGrafica('chartLeche');
  const porDia = {};
  filas.forEach(r => { porDia[r.fecha] = (porDia[r.fecha] || 0) + Number(r.litros); });
  const dias = Object.keys(porDia).sort();
  if (!dias.length) { caja.innerHTML = '<div class="chart-empty">No hay registros de leche con los filtros actuales.</div>'; nota.textContent = ''; return; }
  const ult = dias.slice(-120);
  nota.textContent = ult.length < dias.length ? 'Últimos 120 días del filtro' : `${dias.length} días`;
  caja.innerHTML = '<canvas id="chartLeche" aria-label="Gráfica de litros por día" role="img"></canvas>';
  const vals = ult.map(d => +porDia[d].toFixed(2));
  const media = vals.map((_, i) => { const w = vals.slice(Math.max(0, i - 6), i + 1); return +(sum(w) / w.length).toFixed(2); });
  dibujarGrafica('chartLeche', 'bar', ult.map(d => fmtDate(d).replace(/ \d{4}$/, '')), [
    { type: 'bar', label: 'Litros por día', data: vals, backgroundColor: COLORES.oliva, borderRadius: 2, order: 2 },
    { type: 'line', label: 'Promedio de 7 días', data: media, borderColor: COLORES.bosque, backgroundColor: COLORES.bosque, borderWidth: 2, pointRadius: 0, tension: .3, order: 1 },
  ], { scales: { y: { beginAtZero: true, title: { display: true, text: 'Litros' } } } });
}

function formLeche(l) {
  const edit = !!l;
  abrirFormulario({
    titulo: edit ? 'Editar registro de leche' : 'Registrar ordeño',
    valores: edit ? l : { fecha: hoy(), turno: new Date().getHours() >= 12 ? 'tarde' : 'manana', destino: 'venta' },
    campos: [
      { name: 'id_animal', label: 'Cabra', tipo: 'select', requerido: true, full: true, opciones: () => animalesE().filter(a => a.sexo === 'hembra' && (a.estado === 'activo' || a.id === l?.id_animal)).map(a => [a.id, animalTexto(a.id)]) },
      { name: 'fecha', label: 'Fecha', tipo: 'date', requerido: true },
      { name: 'turno', label: 'Turno', tipo: 'select', sinVacio: true, opciones: opts('turno') },
      { name: 'litros', label: 'Litros', tipo: 'number', requerido: true, min: 0, paso: '0.01' },
      { name: 'destino', label: 'Destino', tipo: 'select', sinVacio: true, opciones: opts('destino') },
      { name: 'grasa_pct', label: 'Grasa (%)', tipo: 'number', min: 0, max: 20, paso: '0.01' },
      { name: 'proteina_pct', label: 'Proteína (%)', tipo: 'number', min: 0, max: 20, paso: '0.01' },
      { name: 'retiro', tipo: 'info', calcular: v => { const r = v.id_animal && v.fecha ? retiroVigente(v.id_animal, 'leche', v.fecha) : null; return r ? { aviso: true, texto: `Esta cabra está en retiro por medicamento hasta el ${fmtDate(r.fin_retiro_leche)}. Esa leche no debe venderse ni consumirse: usa el destino "Desecho".` } : ''; } },
      { name: 'notas', label: 'Notas', tipo: 'textarea' },
    ],
    alGuardar: async v => {
      const d = { id_animal: v.id_animal, fecha: v.fecha, turno: v.turno, litros: v.litros, destino: v.destino, grasa_pct: v.grasa_pct, proteina_pct: v.proteina_pct, notas: v.notas };
      const { error } = edit ? await db.from('leche').update(d).eq('id', l.id) : await db.from('leche').insert(d);
      if (error) throw error;
      showToast(edit ? 'Registro actualizado' : 'Ordeño registrado'); await recargar('leche');
    },
  });
}

function capturaLeche() {
  const lista = animalesActivos(a => a.sexo === 'hembra' && a.estado_productivo === 'lactando')
    .sort((a, b) => (a.lote || '').localeCompare(b.lote || '', 'es') || a.identificador.localeCompare(b.identificador, 'es', { numeric: true }));
  if (!lista.length) return showToast('No hay cabras en categoría "Lactando". Cambia la categoría de las cabras en ordeño desde Animales.', 'error');
  const ultima = id => store.leche.find(x => x.id_animal === id);
  abrirCaptura({
    titulo: 'Captura de ordeño', sub: 'Una fila por cabra en ordeño. Deja vacías las que no se ordeñaron.',
    campos: [
      { name: 'fecha', label: 'Fecha', tipo: 'date', valor: hoy() },
      { name: 'turno', label: 'Turno', tipo: 'select', valor: new Date().getHours() >= 12 ? 'tarde' : 'manana', opciones: opts('turno') },
      { name: 'destino', label: 'Destino', tipo: 'select', valor: 'venta', opciones: opts('destino') },
    ],
    animales: lista,
    columna: {
      label: 'Litros', nota: 'Referencia', paso: '0.1',
      placeholder: a => { const u = ultima(a.id); return u ? fmtNum(u.litros, 1) : ''; },
      referencia: (a, g) => retiroVigente(a.id, 'leche', g.fecha) ? '<span class="badge peligro">En retiro: se guarda como desecho</span>' : (ultima(a.id) ? `Último: ${fmtNum(ultima(a.id).litros, 1)} L` : ''),
    },
    nota: 'Si ya existe un registro de la cabra en esa fecha y turno, se reemplaza con el nuevo valor. Las cabras en retiro por medicamento se guardan como desecho.',
    alGuardar: async (datos, g) => {
      const { error } = await db.from('leche').upsert(datos.map(d => ({ id_animal: d.animal.id, fecha: g.fecha, turno: g.turno, litros: d.valor, destino: retiroVigente(d.animal.id, 'leche', g.fecha) ? 'desecho' : g.destino })), { onConflict: 'id_animal,fecha,turno' });
      if (error) throw error;
      showToast(`${datos.length} registros guardados · ${fmtNum(sum(datos, d => d.valor), 1)} L`); await recargar('leche');
    },
  });
}
