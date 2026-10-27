// salud.js — Vacunas, desparasitaciones, enfermedades y tratamientos, con días de retiro

// Tipos de evento: enfermedades comunes del caprino + procedimientos. La opción "Agregar otra" guarda tipos nuevos.
const ENFERMEDADES_COMUNES = ['Mastitis', 'Neumonía', 'Diarrea / coccidiosis', 'Parasitosis interna', 'Pietín (cojera)', 'Enterotoxemia', 'Queratoconjuntivitis', 'Ectima contagioso (boquera)', 'Timpanismo', 'Toxemia de la gestación', 'Retención de placenta', 'Abscesos (linfadenitis caseosa)'];
const PROCEDIMIENTOS = ['Castración', 'Despezuñar'];
const NO_CASO = [...PROCEDIMIENTOS, 'vacuna', 'desparasitacion', 'prueba', 'revision'];   // los últimos son de registros anteriores
function tiposDisponibles(actual) {
  const base = [...ENFERMEDADES_COMUNES, ...PROCEDIMIENTOS];
  const usados = [...new Set(store.salud.map(x => x.tipo).concat(actual ? [actual] : []))].filter(t => t && !base.includes(t)).sort();
  return [...base.map(t => [t, t]), ...usados.map(t => [t, lbl('salud', t)])];
}
function badgeTipo(t) {
  const tono = PROCEDIMIENTOS.includes(t) ? 'info' : ['vacuna'].includes(t) ? 'ok' : ['desparasitacion', 'prueba'].includes(t) ? 'info' : t === 'revision' ? '' : 'peligro';
  return `<span class="badge ${tono}">${esc(lbl('salud', t))}</span>`;
}
const tratamientoDe = r => r.tratamiento || r.medicamento;

const retiroActivo = (s, tipo) => { const f = s['fin_retiro_' + tipo]; return !!f && s.fecha <= hoy() && f >= hoy(); };
// Una "próxima fecha" está pendiente si no se registró después otro evento del mismo tipo para ese animal
const proximaPendiente = s => !!s.proxima_fecha && !store.salud.some(o => o.id !== s.id && o.id_animal === s.id_animal && o.tipo === s.tipo && o.fecha > s.fecha);

function celdaProxima(s) {
  if (!s.proxima_fecha) return '';
  if (!proximaPendiente(s)) return `<span class="muted">${esc(fmtDate(s.proxima_fecha))}</span><span class="sub">Cumplida</span>`;
  const d = daysUntil(s.proxima_fecha);
  return `${esc(fmtDate(s.proxima_fecha))}<span class="sub ${d < 0 ? 'neg' : d <= 7 ? 'warn' : ''}">${esc(cuandoTexto(d))}</span>`;
}

registrarSeccion({
  key: 'salud', titulo: 'Salud', icono: 'health',
  subtitulo: 'Enfermedades, tratamientos y procedimientos del hato. Controla los días de retiro de leche y carne.',
  botones: [{ label: 'Registrar evento', primario: true, accion: () => formSalud() }],
  orden: { key: 'fecha', dir: 'desc' },
  csv: 'salud',
  vacio: { titulo: 'Sin eventos de salud', texto: 'Registra vacunas, desparasitaciones y tratamientos; puedes aplicarlos a varios animales a la vez.' },
  filas: () => datosE().salud,
  filtros: [
    { id: 'q', tipo: 'buscar', placeholder: 'Animal, diagnóstico, medicamento, responsable…', texto: r => [animalTexto(r.id_animal), lbl('salud', r.tipo), r.diagnostico, tratamientoDe(r), r.responsable, r.notas] },
    { id: 'tipo', tipo: 'select', label: 'Tipo de evento', opciones: () => tiposDisponibles(), prueba: (r, v) => r.tipo === v },
    { id: 'estado', tipo: 'select', label: 'Estado del caso', opciones: () => opts('caso'), prueba: (r, v) => r.estado === v },
    { id: 'grav', tipo: 'select', label: 'Gravedad', opciones: () => opts('gravedad'), prueba: (r, v) => r.gravedad === v },
    { id: 'lote', tipo: 'select', label: 'Lote', opciones: () => lotes().map(x => [x, x]), prueba: (r, v) => animalDe(r).lote === v },
    { id: 'trat', tipo: 'select', label: 'Tratamiento', opciones: () => [...new Set(store.salud.map(tratamientoDe).filter(Boolean))].sort().map(x => [x, x]), prueba: (r, v) => tratamientoDe(r) === v },
    { id: 'prox', tipo: 'select', label: 'Próxima fecha', todos: 'Cualquiera', opciones: () => [['vencida', 'Vencidas'], ['7', 'En 7 días'], ['30', 'En 30 días']], prueba: (r, v) => { if (!proximaPendiente(r)) return false; const d = daysUntil(r.proxima_fecha); return v === 'vencida' ? d < 0 : d >= 0 && d <= Number(v); } },
    { id: 'fechas', tipo: 'fechas', label: 'Fecha del evento', valor: r => r.fecha },
    { id: 'costo', tipo: 'rango', label: 'Costo ($)', valor: r => r.costo == null ? null : Number(r.costo) },
    { id: 'retl', tipo: 'check', label: 'Retiro de leche vigente', prueba: r => retiroActivo(r, 'leche') },
    { id: 'retc', tipo: 'check', label: 'Retiro de carne vigente', prueba: r => retiroActivo(r, 'carne') },
  ],
  columnas: [
    { key: 'fecha', label: 'Fecha', orden: r => r.fecha, html: r => esc(fmtDate(r.fecha)), csv: r => r.fecha },
    { key: 'animal', label: 'Animal', texto: r => animalTexto(r.id_animal), html: r => animalHtml(r.id_animal) },
    { key: 'tipo', label: 'Tipo de evento', orden: r => lbl('salud', r.tipo), html: r => badgeTipo(r.tipo), csv: r => lbl('salud', r.tipo) },
    { key: 'det', label: 'Diagnóstico o motivo', clase: 'wrap', texto: r => r.diagnostico },
    { key: 'trat', label: 'Tratamiento', texto: r => tratamientoDe(r), html: r => tratamientoDe(r) ? esc(tratamientoDe(r)) + `<span class="sub">${esc([r.dosis, r.via ? lbl('via', r.via) : ''].filter(Boolean).join(' · '))}</span>` : '', csv: r => [tratamientoDe(r), r.dosis].filter(Boolean).join(' ') },
    { key: 'grav', label: 'Gravedad', orden: r => r.gravedad, html: r => r.gravedad ? badge('gravedad', r.gravedad) : '', csv: r => lbl('gravedad', r.gravedad) },
    { key: 'estado', label: 'Caso', orden: r => r.estado, html: r => badge('caso', r.estado), csv: r => lbl('caso', r.estado) },
    { key: 'ret', label: 'Retiro hasta', clase: 'nowrap', orden: r => r.fin_retiro_carne || r.fin_retiro_leche,
      html: r => [r.fin_retiro_leche ? `<span class="${retiroActivo(r, 'leche') ? 'neg' : 'muted'}">Leche ${esc(fmtDate(r.fin_retiro_leche))}</span>` : '', r.fin_retiro_carne ? `<span class="${retiroActivo(r, 'carne') ? 'neg' : 'muted'}">Carne ${esc(fmtDate(r.fin_retiro_carne))}</span>` : ''].filter(Boolean).join('<br>'),
      csv: r => [r.fin_retiro_leche && 'Leche ' + r.fin_retiro_leche, r.fin_retiro_carne && 'Carne ' + r.fin_retiro_carne].filter(Boolean).join(' / ') },
    { key: 'prox', label: 'Próxima fecha', orden: r => r.proxima_fecha, html: celdaProxima, csv: r => r.proxima_fecha },
    { key: 'costo', label: 'Costo', clase: 'num', orden: r => r.costo == null ? null : Number(r.costo), html: r => r.costo == null ? '' : fmtMoney(r.costo), csv: r => r.costo },
    { key: 'resp', label: 'Responsable', texto: r => r.responsable },
  ],
  resumen: f => {
    const abiertos = f.filter(r => r.estado === 'abierto').length;
    const enRetiro = new Set(f.filter(r => retiroActivo(r, 'leche') || retiroActivo(r, 'carne')).map(r => r.id_animal)).size;
    const prox = f.filter(r => proximaPendiente(r) && daysUntil(r.proxima_fecha) >= 0 && daysUntil(r.proxima_fecha) <= 30).length;
    const venc = f.filter(r => proximaPendiente(r) && daysUntil(r.proxima_fecha) < 0).length;
    return [
      { label: 'Eventos', valor: fmtNum(f.length, 0) },
      { label: 'Casos abiertos', valor: fmtNum(abiertos, 0), alerta: abiertos > 0 },
      { label: 'Animales en retiro', valor: fmtNum(enRetiro, 0), nota: 'Leche o carne no aptas' },
      { label: 'Pendientes en 30 días', valor: fmtNum(prox, 0) },
      { label: 'Pendientes vencidos', valor: fmtNum(venc, 0), alerta: venc > 0 },
      { label: 'Costo total', valor: fmtMoney(sum(f, r => r.costo)) },
    ];
  },
  acciones: r => [
    ...(r.estado === 'abierto' ? [{ act: 'cerrar', label: 'Cerrar caso', texto: true }] : []),
    { act: 'editar', label: 'Editar', icono: 'edit' }, { act: 'borrar', label: 'Eliminar', icono: 'trash', peligro: true },
  ],
  manejadores: {
    cerrar: async r => {
      const { error } = await db.from('salud').update({ estado: 'cerrado' }).eq('id', r.id);
      if (error) return showToast(errMsg(error), 'error');
      showToast('Caso cerrado'); recargar('salud');
    },
    editar: r => formSalud(r),
    borrar: async r => {
      if (!await confirmar({ titulo: 'Eliminar evento', mensaje: `Se eliminará el evento de ${animalTexto(r.id_animal)} del ${fmtDate(r.fecha)}.`, etiqueta: 'Eliminar', peligro: true })) return;
      const { error } = await db.from('salud').delete().eq('id', r.id);
      if (error) return showToast(errMsg(error), 'error');
      showToast('Evento eliminado'); recargar('salud');
    },
  },
});

function formSalud(s) {
  const edit = !!s;
  let tipoPrevio = s ? s.tipo : null;
  const esCaso = v => !!v.tipo && !NO_CASO.includes(v.tipo);
  abrirFormulario({
    titulo: edit ? 'Editar evento de salud' : 'Registrar evento de salud', tam: 'wide',
    sub: edit ? '' : 'Puedes aplicarlo a varios animales a la vez (por ejemplo, despezuñar a todo un lote).',
    valores: edit ? { ...s, tratamiento: tratamientoDe(s) } : { fecha: hoy(), estado: 'cerrado', animales: [] },
    campos: [
      { name: 'id_animal', label: 'Animal', tipo: 'select', requerido: true, full: true, mostrarSi: () => edit, opciones: () => animalesE().map(a => [a.id, animalTexto(a.id)]) },
      { name: 'animales', label: 'Animales', tipo: 'animales', requerido: true, mostrarSi: () => !edit, opciones: () => animalesActivos().sort((a, b) => a.identificador.localeCompare(b.identificador, 'es', { numeric: true })).map(opcionAnimal) },
      { name: 'fecha', label: 'Fecha', tipo: 'date', requerido: true },
      { name: 'tipo', label: 'Tipo de evento', tipo: 'select', requerido: true, opciones: () => [...tiposDisponibles(s?.tipo), ['__otra__', '+ Agregar otra…']] },
      { name: 'tipo_otro', label: 'Nombre del nuevo tipo de evento', tipo: 'text', requerido: true, placeholder: 'Ej: Vacunación, Desparasitación', mostrarSi: v => v.tipo === '__otra__' },
      { name: 'estado', label: 'Estado del caso', tipo: 'select', sinVacio: true, opciones: opts('caso'), ayuda: 'Los casos abiertos aparecen en el dashboard hasta que los cierres.' },
      { name: 'gravedad', label: 'Gravedad', tipo: 'select', mostrarSi: esCaso, opciones: opts('gravedad') },
      { name: 'diagnostico', label: 'Diagnóstico o motivo', tipo: 'textarea', placeholder: 'Ej: Ubre derecha inflamada, con grumos en la leche' },
      { name: 'tratamiento', label: 'Tratamiento', tipo: 'text', placeholder: 'Ej: Cefalexina intramamaria', ayuda: 'Medicamento o procedimiento aplicado.' },
      { name: 'dosis', label: 'Dosis', tipo: 'text', placeholder: 'Ej: 2 ml' },
      { name: 'via', label: 'Vía de aplicación', tipo: 'select', opciones: opts('via') },
      { name: 'sr', tipo: 'section', label: 'Retiro y seguimiento' },
      { name: 'dias_retiro_leche', label: 'Días de retiro de leche', tipo: 'number', min: 0, paso: 1 },
      { name: 'dias_retiro_carne', label: 'Días de retiro de carne', tipo: 'number', min: 0, paso: 1 },
      { name: 'retiro', tipo: 'info', calcular: v => v.fecha && (v.dias_retiro_leche != null || v.dias_retiro_carne != null) ? `No vender ni consumir — ${[v.dias_retiro_leche != null && `leche hasta el ${fmtDate(addDays(v.fecha, v.dias_retiro_leche))}`, v.dias_retiro_carne != null && `carne hasta el ${fmtDate(addDays(v.fecha, v.dias_retiro_carne))}`].filter(Boolean).join(' · ')}` : '' },
      { name: 'proxima_fecha', label: 'Próxima fecha (revisión o seguimiento)', tipo: 'date' },
      { name: 'responsable', label: 'Responsable', tipo: 'text', placeholder: 'MVZ o encargado' },
      { name: 'costo', label: edit ? 'Costo ($)' : 'Costo por animal ($)', tipo: 'number', min: 0, paso: '0.01' },
      { name: 'notas', label: 'Notas', tipo: 'textarea' },
    ],
    alCambiar: (v, api) => {
      if (edit || v.tipo === tipoPrevio) return;
      tipoPrevio = v.tipo;
      api.poner('estado', v.tipo && PROCEDIMIENTOS.includes(v.tipo) ? 'cerrado' : 'abierto');
    },
    alGuardar: async v => {
      let tipo = v.tipo;
      if (tipo === '__otra__') {
        const nuevo = v.tipo_otro.charAt(0).toUpperCase() + v.tipo_otro.slice(1);
        const existente = tiposDisponibles().find(([val, l]) => norm(l) === norm(nuevo));
        tipo = existente ? existente[0] : nuevo;
      }
      const caso = !NO_CASO.includes(tipo);
      const d = { fecha: v.fecha, tipo, estado: v.estado, gravedad: caso ? (v.gravedad ?? null) : null, diagnostico: v.diagnostico, tratamiento: v.tratamiento, medicamento: null, dosis: v.dosis, via: v.via, dias_retiro_leche: v.dias_retiro_leche, dias_retiro_carne: v.dias_retiro_carne, proxima_fecha: v.proxima_fecha, responsable: v.responsable, costo: v.costo, notas: v.notas };
      if (edit) { const { error } = await db.from('salud').update({ ...d, id_animal: v.id_animal }).eq('id', s.id); if (error) throw error; }
      else { const { error } = await db.from('salud').insert(v.animales.map(id => ({ ...d, id_animal: id }))); if (error) throw error; }
      showToast(edit ? 'Evento actualizado' : `Evento registrado en ${v.animales.length} animal${v.animales.length === 1 ? '' : 'es'}`);
      await recargar('salud');
    },
  });
}
