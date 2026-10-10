// manejo.js — Actividades del hato: individuales, por lote o de todo el hato; programadas o realizadas

const estadoManejo = x => (x.estado === 'programado' && x.fecha < hoy()) ? 'vencido' : x.estado;
const ambitoManejo = x => x.id_animal ? 'animal' : (x.lote ? 'lote' : 'hato');

registrarSeccion({
  key: 'manejo', titulo: 'Manejo', icono: 'clipboard',
  subtitulo: 'Descorne, destete, secado, cambios de lote, recorte de pezuñas y demás actividades, realizadas o programadas.',
  botones: [{ label: 'Registrar actividad', primario: true, accion: () => formManejo() }],
  orden: { key: 'fecha', dir: 'desc' },
  csv: 'manejo',
  vacio: { titulo: 'Sin actividades de manejo', texto: 'Registra lo que hiciste con el hato o programa las próximas actividades para no olvidarlas.' },
  filas: () => store.manejo,
  filtros: [
    { id: 'q', tipo: 'buscar', placeholder: 'Animal, lote, descripción, responsable…', texto: r => [animalTexto(r.id_animal), r.lote, r.descripcion, r.responsable, r.notas] },
    { id: 'tipo', tipo: 'select', label: 'Actividad', opciones: () => opts('manejo'), prueba: (r, v) => r.tipo === v },
    { id: 'estado', tipo: 'select', label: 'Estado', opciones: () => opts('manejo_estado'), prueba: (r, v) => estadoManejo(r) === v },
    { id: 'ambito', tipo: 'select', label: 'Aplica a', opciones: () => [['animal', 'Animales'], ['lote', 'Un lote'], ['hato', 'Todo el hato']], prueba: (r, v) => ambitoManejo(r) === v },
    { id: 'lote', tipo: 'select', label: 'Lote', opciones: () => lotes().map(x => [x, x]), prueba: (r, v) => r.lote === v || animalDe({ id_animal: r.id_animal }).lote === v },
    { id: 'resp', tipo: 'select', label: 'Responsable', opciones: () => [...new Set(store.manejo.map(x => x.responsable).filter(Boolean))].sort().map(x => [x, x]), prueba: (r, v) => r.responsable === v },
    { id: 'fechas', tipo: 'fechas', label: 'Fecha', valor: r => r.fecha },
    { id: 'costo', tipo: 'rango', label: 'Costo ($)', valor: r => r.costo == null ? null : Number(r.costo) },
  ],
  columnas: [
    { key: 'fecha', label: 'Fecha', orden: r => r.fecha, html: r => esc(fmtDate(r.fecha)) + (estadoManejo(r) !== 'realizado' ? `<span class="sub ${estadoManejo(r) === 'vencido' ? 'neg' : ''}">${esc(cuandoTexto(daysUntil(r.fecha)))}</span>` : ''), csv: r => r.fecha },
    { key: 'tipo', label: 'Actividad', texto: r => lbl('manejo', r.tipo) },
    { key: 'aplica', label: 'Aplica a', texto: r => r.id_animal ? animalTexto(r.id_animal) : (r.lote ? 'Lote ' + r.lote : 'Todo el hato'),
      html: r => r.id_animal ? animalHtml(r.id_animal) + (r.tipo === 'cambio_lote' && r.lote ? `<span class="sub">Pasa a ${esc(r.lote)}</span>` : '') : (r.lote ? `Lote ${esc(r.lote)}` : 'Todo el hato') },
    { key: 'desc', label: 'Descripción', clase: 'wrap', texto: r => r.descripcion },
    { key: 'resp', label: 'Responsable', texto: r => r.responsable },
    { key: 'costo', label: 'Costo', clase: 'num', orden: r => r.costo == null ? null : Number(r.costo), html: r => r.costo == null ? '' : fmtMoney(r.costo), csv: r => r.costo },
    { key: 'estado', label: 'Estado', orden: r => estadoManejo(r), html: r => badge('manejo_estado', estadoManejo(r)), csv: r => lbl('manejo_estado', estadoManejo(r)) },
  ],
  resumen: f => {
    const venc = f.filter(r => estadoManejo(r) === 'vencido').length;
    return [
      { label: 'Actividades', valor: fmtNum(f.length, 0) },
      { label: 'Programadas', valor: fmtNum(f.filter(r => r.estado === 'programado').length, 0) },
      { label: 'Vencidas', valor: fmtNum(venc, 0), alerta: venc > 0 },
      { label: 'Realizadas', valor: fmtNum(f.filter(r => r.estado === 'realizado').length, 0) },
      { label: 'Costo total', valor: fmtMoney(sum(f, r => r.costo)) },
    ];
  },
  acciones: r => [
    ...(r.estado === 'programado' ? [{ act: 'realizar', label: 'Marcar realizada', texto: true }] : []),
    { act: 'editar', label: 'Editar', icono: 'edit' }, { act: 'borrar', label: 'Eliminar', icono: 'trash', peligro: true },
  ],
  manejadores: {
    realizar: async r => {
      const { error } = await db.from('manejo').update({ estado: 'realizado' }).eq('id', r.id);
      if (error) return showToast(errMsg(error), 'error');
      showToast('Actividad marcada como realizada'); recargar('manejo');
    },
    editar: r => formManejo(r),
    borrar: async r => {
      if (!await confirmar({ titulo: 'Eliminar actividad', mensaje: `Se eliminará "${lbl('manejo', r.tipo)}" del ${fmtDate(r.fecha)}.`, etiqueta: 'Eliminar', peligro: true })) return;
      const { error } = await db.from('manejo').delete().eq('id', r.id);
      if (error) return showToast(errMsg(error), 'error');
      showToast('Actividad eliminada'); recargar('manejo');
    },
  },
});

function formManejo(x) {
  const edit = !!x;
  abrirFormulario({
    titulo: edit ? 'Editar actividad' : 'Registrar actividad', tam: 'wide',
    sub: 'Destete, secado y cambio de lote actualizan al animal cuando la actividad queda como realizada.',
    valores: edit ? { ...x, ambito: ambitoManejo(x) === 'animal' ? 'animales' : ambitoManejo(x) } : { fecha: hoy(), estado: 'realizado', ambito: 'animales', animales: [] },
    campos: [
      { name: 'tipo', label: 'Actividad', tipo: 'select', requerido: true, opciones: opts('manejo') },
      { name: 'estado', label: 'Estado', tipo: 'select', sinVacio: true, opciones: [['realizado', 'Realizada'], ['programado', 'Programada']] },
      { name: 'fecha', label: 'Fecha', tipo: 'date', requerido: true },
      { name: 'ambito', label: 'Aplica a', tipo: 'select', sinVacio: true, opciones: [['animales', 'Animales específicos'], ['lote', 'Un lote completo'], ['hato', 'Todo el hato']] },
      { name: 'animales', label: 'Animales', tipo: 'animales', requerido: true, mostrarSi: v => v.ambito === 'animales' && !edit, opciones: () => animalesActivos().sort((a, b) => a.identificador.localeCompare(b.identificador, 'es', { numeric: true })).map(opcionAnimal) },
      { name: 'id_animal', label: 'Animal', tipo: 'select', requerido: true, mostrarSi: v => v.ambito === 'animales' && edit, opciones: () => store.animales.map(a => [a.id, animalTexto(a.id)]) },
      { name: 'lote', label: 'Lote', tipo: 'text', lista: lotes, requerido: true, mostrarSi: v => v.ambito === 'lote' || v.tipo === 'cambio_lote', ayuda: 'En un cambio de lote, escribe el lote de destino.' },
      { name: 'descripcion', label: 'Descripción', tipo: 'textarea', placeholder: 'Qué se hizo o qué se debe hacer' },
      { name: 'responsable', label: 'Responsable', tipo: 'text' },
      { name: 'costo', label: edit ? 'Costo ($)' : 'Costo por registro ($)', tipo: 'number', min: 0, paso: '0.01' },
      { name: 'notas', label: 'Notas', tipo: 'textarea' },
    ],
    validar: v => v.tipo === 'cambio_lote' && v.ambito !== 'animales' ? { ambito: 'El cambio de lote se aplica a animales específicos.' } : null,
    alGuardar: async v => {
      const base = { tipo: v.tipo, estado: v.estado, fecha: v.fecha, lote: (v.ambito === 'lote' || v.tipo === 'cambio_lote') ? v.lote : null, descripcion: v.descripcion, responsable: v.responsable, costo: v.costo, notas: v.notas };
      if (edit) {
        const { error } = await db.from('manejo').update({ ...base, id_animal: v.ambito === 'animales' ? v.id_animal : null }).eq('id', x.id);
        if (error) throw error;
      } else {
        const filas = v.ambito === 'animales' ? v.animales.map(id => ({ ...base, id_animal: id })) : [{ ...base, id_animal: null }];
        const { error } = await db.from('manejo').insert(filas);
        if (error) throw error;
      }
      showToast(edit ? 'Actividad actualizada' : 'Actividad registrada'); await recargar('manejo');
    },
  });
}
