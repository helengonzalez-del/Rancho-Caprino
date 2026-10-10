// empadre.js — Montas e inseminaciones, diagnóstico de gestación y fecha probable de parto

const vigente = e => e.estado === 'servida' || e.estado === 'gestante';
const diasParto = e => vigente(e) ? daysUntil(e.fecha_parto_estimada) : null;

function cuandoParto(e) {
  const d = diasParto(e);
  if (d == null) return '';
  const cls = d < 0 ? 'neg' : d <= 15 ? 'warn' : 'muted';
  return `<span class="sub ${cls}">${esc(cuandoTexto(d))}</span>`;
}

registrarSeccion({
  key: 'empadre', titulo: 'Empadre', icono: 'heart',
  subtitulo: 'Montas e inseminaciones, confirmación de gestación y fecha probable de parto (150 días).',
  botones: [{ label: 'Registrar empadre', primario: true, accion: () => formEmpadre() }],
  orden: { key: 'monta', dir: 'desc' },
  csv: 'empadres',
  vacio: { titulo: 'Sin empadres registrados', texto: 'Registra la primera monta o inseminación para calcular la fecha probable de parto.' },
  filas: () => store.empadres,
  filtros: [
    { id: 'q', tipo: 'buscar', placeholder: 'Hembra, macho, notas…', texto: r => [animalTexto(r.id_hembra), animalTexto(r.id_macho), r.macho_externo, r.notas] },
    { id: 'estado', tipo: 'select', label: 'Estado', opciones: () => opts('empadre'), prueba: (r, v) => r.estado === v },
    { id: 'monta', tipo: 'select', label: 'Tipo de monta', opciones: () => opts('monta'), prueba: (r, v) => r.tipo_monta === v },
    { id: 'macho', tipo: 'select', label: 'Semental', opciones: () => [...new Set(store.empadres.map(e => e.id_macho).filter(Boolean))].map(id => [id, animalTexto(id)]), prueba: (r, v) => r.id_macho === v },
    { id: 'parto', tipo: 'select', label: 'Parto estimado', todos: 'Cualquier fecha',
      opciones: () => [['7', 'En los próximos 7 días'], ['15', 'En los próximos 15 días'], ['30', 'En los próximos 30 días'], ['60', 'En los próximos 60 días'], ['vencido', 'Fecha ya pasada (sin parto)']],
      prueba: (r, v) => { const d = diasParto(r); return d != null && (v === 'vencido' ? d < 0 : d >= 0 && d <= Number(v)); } },
    { id: 'fechas', tipo: 'fechas', label: 'Fecha de monta', valor: r => r.fecha_monta },
    { id: 'sindiag', tipo: 'check', label: 'Servidas sin diagnóstico (45+ días)', prueba: r => r.estado === 'servida' && diffDays(hoy(), r.fecha_monta) > 45 },
  ],
  columnas: [
    { key: 'hembra', label: 'Hembra', texto: r => animalTexto(r.id_hembra), html: r => animalHtml(r.id_hembra) },
    { key: 'macho', label: 'Macho', texto: r => animalTexto(r.id_macho) || r.macho_externo, html: r => r.id_macho ? animalHtml(r.id_macho) : esc(r.macho_externo || '') },
    { key: 'tipo', label: 'Tipo de monta', texto: r => lbl('monta', r.tipo_monta) },
    { key: 'monta', label: 'Fecha de monta', orden: r => r.fecha_monta, html: r => esc(fmtDate(r.fecha_monta)), csv: r => r.fecha_monta },
    { key: 'diag', label: 'Diagnóstico', orden: r => r.fecha_diagnostico, html: r => r.fecha_diagnostico ? esc(fmtDate(r.fecha_diagnostico)) : (r.estado === 'servida' ? '<span class="muted">Pendiente</span>' : ''), csv: r => r.fecha_diagnostico },
    { key: 'parto', label: 'Parto estimado', orden: r => r.fecha_parto_estimada, html: r => esc(fmtDate(r.fecha_parto_estimada)) + cuandoParto(r), csv: r => r.fecha_parto_estimada },
    { key: 'estado', label: 'Estado', orden: r => r.estado, html: r => badge('empadre', r.estado), csv: r => lbl('empadre', r.estado) },
    { key: 'notas', label: 'Notas', clase: 'wrap', texto: r => r.notas },
  ],
  resumen: f => [
    { label: 'Empadres', valor: fmtNum(f.length, 0) },
    { label: 'En gestación', valor: fmtNum(f.filter(vigente).length, 0), nota: 'Servidas y confirmadas' },
    { label: 'Paridas', valor: fmtNum(f.filter(r => r.estado === 'pario').length, 0) },
    { label: 'Vacías o aborto', valor: fmtNum(f.filter(r => r.estado === 'vacia' || r.estado === 'aborto').length, 0) },
    { label: 'Partos en 30 días', valor: fmtNum(f.filter(r => { const d = diasParto(r); return d != null && d >= 0 && d <= 30; }).length, 0) },
    { label: 'Fecha vencida', valor: fmtNum(f.filter(r => { const d = diasParto(r); return d != null && d < 0; }).length, 0), alerta: f.some(r => { const d = diasParto(r); return d != null && d < 0; }) },
  ],
  acciones: r => [
    ...(r.estado === 'servida' ? [{ act: 'confirmar', label: 'Confirmar gestación', texto: true }] : []),
    ...(vigente(r) ? [{ act: 'parto', label: 'Registrar parto', texto: true }] : []),
    { act: 'editar', label: 'Editar', icono: 'edit' }, { act: 'borrar', label: 'Eliminar', icono: 'trash', peligro: true },
  ],
  manejadores: {
    confirmar: async r => {
      const { error } = await db.from('empadres').update({ estado: 'gestante', fecha_diagnostico: hoy() }).eq('id', r.id);
      if (error) return showToast(errMsg(error), 'error');
      showToast('Gestación confirmada'); recargar('empadres');
    },
    parto: r => formParto({ empadre: r }),
    editar: r => formEmpadre(r),
    borrar: async r => {
      if (!await confirmar({ titulo: 'Eliminar empadre', mensaje: 'Se eliminará este registro de empadre. Los partos asociados se conservan.', etiqueta: 'Eliminar', peligro: true })) return;
      const { error } = await db.from('empadres').delete().eq('id', r.id);
      if (error) return showToast(errMsg(error), 'error');
      showToast('Empadre eliminado'); recargar('empadres');
    },
  },
});

function formEmpadre(e) {
  const edit = !!e;
  abrirFormulario({
    titulo: edit ? 'Editar empadre' : 'Registrar empadre',
    sub: 'La fecha probable de parto se calcula sola: 150 días después de la monta.',
    valores: edit ? e : { tipo_monta: 'monta_natural', fecha_monta: hoy(), estado: 'servida' },
    campos: [
      { name: 'id_hembra', label: 'Hembra', tipo: 'select', requerido: true, opciones: () => store.animales.filter(a => a.sexo === 'hembra' && (a.estado === 'activo' || a.id === e?.id_hembra)).map(a => [a.id, animalTexto(a.id)]) },
      { name: 'id_macho', label: 'Macho (semental)', tipo: 'select', vacio: 'Otro / pajilla externa', opciones: () => store.animales.filter(a => a.sexo === 'macho' && (a.estado === 'activo' || a.id === e?.id_macho)).map(a => [a.id, animalTexto(a.id)]) },
      { name: 'macho_externo', label: 'Semental o pajilla externa', tipo: 'text', mostrarSi: v => !v.id_macho, placeholder: 'Ej: Pajilla Boer importada' },
      { name: 'tipo_monta', label: 'Tipo de monta', tipo: 'select', sinVacio: true, opciones: opts('monta') },
      { name: 'fecha_monta', label: 'Fecha de monta', tipo: 'date', requerido: true },
      { name: 'estado', label: 'Estado', tipo: 'select', sinVacio: true, opciones: Object.entries(L.empadre).filter(([k]) => edit || k !== 'pario') },
      { name: 'fecha_diagnostico', label: 'Fecha del diagnóstico', tipo: 'date', mostrarSi: v => v.estado && v.estado !== 'servida' },
      { name: 'estimada', tipo: 'info', calcular: v => v.fecha_monta ? `Parto estimado: ${fmtDate(addDays(v.fecha_monta, GESTACION_DIAS))}` : '' },
      { name: 'notas', label: 'Notas', tipo: 'textarea' },
    ],
    validar: v => {
      if (vigente(v)) {
        const otro = store.empadres.find(x => x.id_hembra === v.id_hembra && vigente(x) && x.id !== e?.id);
        if (otro) return { id_hembra: `Esta hembra ya tiene un empadre vigente (monta del ${fmtDate(otro.fecha_monta)}). Ciérralo como parto, vacía o aborto antes de registrar otro.` };
      }
    },
    alGuardar: async v => {
      const p = { id_hembra: v.id_hembra, id_macho: v.id_macho, macho_externo: v.id_macho ? null : (v.macho_externo ?? null), tipo_monta: v.tipo_monta, fecha_monta: v.fecha_monta, estado: v.estado, fecha_diagnostico: v.fecha_diagnostico ?? null, notas: v.notas };
      const { error } = edit ? await db.from('empadres').update(p).eq('id', e.id) : await db.from('empadres').insert(p);
      if (error) throw error;
      showToast(edit ? 'Empadre actualizado' : 'Empadre registrado');
      await recargar('empadres');
    },
  });
}
