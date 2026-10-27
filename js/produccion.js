// produccion.js — Control de peso y ganancia diaria de peso (GDP)

const animalDe = r => animal(r.id_animal) || {};

registrarSeccion({
  key: 'produccion', titulo: 'Producción', icono: 'scale',
  subtitulo: 'Control de peso y crecimiento. La ganancia diaria (GDP) se calcula contra el pesaje anterior de cada animal.',
  botones: [
    { label: 'Registrar peso', primario: true, accion: () => formPeso() },
    { label: 'Pesaje por lote', icono: 'scale', accion: () => capturaPesos() },
  ],
  orden: { key: 'fecha', dir: 'desc' },
  csv: 'pesajes',
  vacio: { titulo: 'Sin pesajes registrados', texto: 'Registra el peso de tus animales para ver su crecimiento y ganancia diaria.' },
  filas: () => datosE().pesajes,
  filtros: [
    { id: 'q', tipo: 'buscar', placeholder: 'Arete, nombre u observaciones…', texto: r => [animalTexto(r.id_animal), r.observaciones] },
    { id: 'tipo', tipo: 'select', label: 'Tipo de pesaje', opciones: () => opts('pesaje'), prueba: (r, v) => r.tipo === v },
    { id: 'sexo', tipo: 'select', label: 'Sexo', opciones: () => opts('sexo'), prueba: (r, v) => animalDe(r).sexo === v },
    { id: 'cat', tipo: 'select', label: 'Categoría', opciones: () => opts('estado_productivo'), prueba: (r, v) => animalDe(r).estado_productivo === v },
    { id: 'lote', tipo: 'select', label: 'Lote', opciones: () => lotes().map(x => [x, x]), prueba: (r, v) => animalDe(r).lote === v },
    { id: 'est', tipo: 'select', label: 'Estado del animal', opciones: () => opts('estado'), prueba: (r, v) => animalDe(r).estado === v },
    { id: 'fechas', tipo: 'fechas', label: 'Fecha', valor: r => r.fecha },
    { id: 'peso', tipo: 'rango', label: 'Peso (kg)', valor: r => Number(r.peso) },
    { id: 'gdp', tipo: 'rango', label: 'GDP (g/día)', valor: r => r.gdp_g == null ? null : Number(r.gdp_g) },
  ],
  columnas: [
    { key: 'fecha', label: 'Fecha', orden: r => r.fecha, html: r => esc(fmtDate(r.fecha)), csv: r => r.fecha },
    { key: 'animal', label: 'Animal', texto: r => animalTexto(r.id_animal), html: r => animalHtml(r.id_animal) },
    { key: 'cat', label: 'Categoría', orden: r => animalDe(r).estado_productivo, html: r => animalDe(r).estado_productivo ? badge('estado_productivo', animalDe(r).estado_productivo) : '', csv: r => lbl('estado_productivo', animalDe(r).estado_productivo) },
    { key: 'tipo', label: 'Tipo', orden: r => r.tipo, html: r => badge('pesaje', r.tipo), csv: r => lbl('pesaje', r.tipo) },
    { key: 'peso', label: 'Peso', clase: 'num', orden: r => Number(r.peso), html: r => `<strong>${fmtNum(r.peso, 2)} kg</strong>`, csv: r => r.peso },
    { key: 'cambio', label: 'Cambio', clase: 'num', orden: r => r.peso_anterior == null ? null : r.peso - r.peso_anterior, html: r => r.peso_anterior == null ? '' : `<span class="${r.peso - r.peso_anterior < 0 ? 'neg' : 'pos'}">${r.peso - r.peso_anterior > 0 ? '+' : ''}${fmtNum(r.peso - r.peso_anterior, 2)} kg</span>`, csv: r => r.peso_anterior == null ? '' : +(r.peso - r.peso_anterior).toFixed(2) },
    { key: 'dias', label: 'Días', clase: 'num', orden: r => r.dias, html: r => r.dias == null ? '' : String(r.dias), csv: r => r.dias },
    { key: 'gdp', label: 'GDP (g/día)', clase: 'num', orden: r => r.gdp_g == null ? null : Number(r.gdp_g), html: r => r.gdp_g == null ? '' : `<span class="${r.gdp_g < 0 ? 'neg' : ''}">${fmtNum(r.gdp_g, 0)}</span>`, csv: r => r.gdp_g },
    { key: 'obs', label: 'Observaciones', clase: 'wrap', texto: r => r.observaciones },
  ],
  resumen: f => {
    const g = f.filter(r => r.gdp_g != null);
    return [
      { label: 'Pesajes', valor: fmtNum(f.length, 0) },
      { label: 'Animales pesados', valor: fmtNum(new Set(f.map(r => r.id_animal)).size, 0) },
      { label: 'Peso promedio', valor: fmtNum(avg(f, r => Number(r.peso)), 1), unidad: 'kg' },
      { label: 'GDP promedio', valor: fmtNum(avg(g, r => Number(r.gdp_g)), 0), unidad: 'g/día', nota: `${g.length} con pesaje anterior` },
      { label: 'Mayor GDP', valor: g.length ? fmtNum(Math.max(...g.map(r => Number(r.gdp_g))), 0) : '—', unidad: 'g/día' },
      { label: 'Con pérdida de peso', valor: fmtNum(g.filter(r => r.gdp_g < 0).length, 0), alerta: g.some(r => r.gdp_g < 0) },
    ];
  },
  acciones: () => [{ act: 'editar', label: 'Editar', icono: 'edit' }, { act: 'borrar', label: 'Eliminar', icono: 'trash', peligro: true }],
  manejadores: {
    editar: r => formPeso(r),
    borrar: async r => {
      if (!await confirmar({ titulo: 'Eliminar pesaje', mensaje: `Se eliminará el pesaje de ${animalTexto(r.id_animal)} del ${fmtDate(r.fecha)}.`, etiqueta: 'Eliminar', peligro: true })) return;
      const { error } = await db.from('pesajes').delete().eq('id', r.id);
      if (error) return showToast(errMsg(error), 'error');
      showToast('Pesaje eliminado'); recargar('pesajes');
    },
  },
});

function formPeso(p) {
  const edit = !!p;
  abrirFormulario({
    titulo: edit ? 'Editar pesaje' : 'Registrar peso',
    valores: edit ? p : { fecha: hoy(), tipo: 'rutina' },
    campos: [
      { name: 'id_animal', label: 'Animal', tipo: 'select', requerido: true, full: true, opciones: () => animalesE().filter(a => a.estado === 'activo' || a.id === p?.id_animal).map(a => [a.id, animalTexto(a.id)]) },
      { name: 'fecha', label: 'Fecha', tipo: 'date', requerido: true },
      { name: 'peso', label: 'Peso (kg)', tipo: 'number', requerido: true, min: 0.01, paso: '0.01' },
      { name: 'tipo', label: 'Tipo de pesaje', tipo: 'select', sinVacio: true, opciones: opts('pesaje') },
      { name: 'observaciones', label: 'Observaciones', tipo: 'text' },
    ],
    alGuardar: async v => {
      const d = { id_animal: v.id_animal, fecha: v.fecha, peso: v.peso, tipo: v.tipo, observaciones: v.observaciones };
      const { error } = edit ? await db.from('pesajes').update(d).eq('id', p.id) : await db.from('pesajes').insert(d);
      if (error) throw error;
      showToast(edit ? 'Pesaje actualizado' : 'Peso registrado'); await recargar('pesajes');
    },
  });
}

function capturaPesos() {
  const lista = animalesActivos().sort((a, b) => (a.lote || '').localeCompare(b.lote || '', 'es') || a.identificador.localeCompare(b.identificador, 'es', { numeric: true }));
  if (!lista.length) return showToast('No hay animales activos para pesar.', 'error');
  abrirCaptura({
    titulo: 'Pesaje por lote', sub: 'Escribe el peso de cada animal. Los que dejes vacíos no se registran.',
    campos: [{ name: 'fecha', label: 'Fecha', tipo: 'date', valor: hoy() }, { name: 'tipo', label: 'Tipo de pesaje', tipo: 'select', valor: 'rutina', opciones: opts('pesaje') }],
    animales: lista,
    columna: { label: 'Peso (kg)', nota: 'Último peso', paso: '0.01', placeholder: a => a.ultimo_peso != null ? fmtNum(a.ultimo_peso, 2) : '', referencia: a => a.ultimo_peso != null ? `${fmtNum(a.ultimo_peso, 1)} kg · ${fmtDate(a.fecha_ultimo_peso)}` : '' },
    nota: 'Si ya existe un pesaje del animal en esa fecha, se reemplaza con el nuevo valor.',
    alGuardar: async (datos, g) => {
      if (datos.some(d => d.valor <= 0)) throw new Error('El peso debe ser mayor a 0.');
      const { error } = await db.from('pesajes').upsert(datos.map(d => ({ id_animal: d.animal.id, fecha: g.fecha, peso: d.valor, tipo: g.tipo })), { onConflict: 'id_animal,fecha' });
      if (error) throw error;
      showToast(`${datos.length} pesajes guardados`); await recargar('pesajes');
    },
  });
}
