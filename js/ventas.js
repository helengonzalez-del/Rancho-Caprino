// ventas.js — Ventas de carne, pie de cría, leche y otros; los animales vendidos cambian de estado solos

function ventasFilas() {
  const porVenta = {};
  store.venta_animales.forEach(va => (porVenta[va.venta_id] = porVenta[va.venta_id] || []).push(va.animal_id));
  return store.ventas.map(v => ({ ...v, _animales: porVenta[v.id] || [] }));
}

registrarSeccion({
  key: 'ventas', titulo: 'Ventas', icono: 'receipt',
  subtitulo: 'Ventas de animales (carne o pie de cría), leche y otros ingresos, con costo y utilidad.',
  botones: [{ label: 'Registrar venta', primario: true, accion: () => formVenta() }],
  orden: { key: 'fecha', dir: 'desc' },
  csv: 'ventas',
  vacio: { titulo: 'Sin ventas registradas', texto: 'Registra tu primera venta. Los animales vendidos pasan solos a estado "Vendido".' },
  filas: ventasFilas,
  filtros: [
    { id: 'q', tipo: 'buscar', placeholder: 'Cliente, notas o arete…', texto: r => [r.cliente, r.notas, ...r._animales.map(animalTexto)] },
    { id: 'tipo', tipo: 'select', label: 'Tipo de venta', opciones: () => opts('venta'), prueba: (r, v) => r.tipo === v },
    { id: 'cliente', tipo: 'select', label: 'Cliente', opciones: () => [...new Set(store.ventas.map(v => v.cliente).filter(Boolean))].sort().map(x => [x, x]), prueba: (r, v) => r.cliente === v },
    { id: 'res', tipo: 'select', label: 'Resultado', opciones: () => [['ganancia', 'Con utilidad'], ['perdida', 'Con pérdida']], prueba: (r, v) => v === 'ganancia' ? r.utilidad >= 0 : r.utilidad < 0 },
    { id: 'fechas', tipo: 'fechas', label: 'Fecha', valor: r => r.fecha },
    { id: 'ingreso', tipo: 'rango', label: 'Ingreso ($)', valor: r => Number(r.ingreso) },
  ],
  columnas: [
    { key: 'fecha', label: 'Fecha', orden: r => r.fecha, html: r => esc(fmtDate(r.fecha)), csv: r => r.fecha },
    { key: 'cliente', label: 'Cliente', texto: r => r.cliente },
    { key: 'tipo', label: 'Tipo', orden: r => r.tipo, html: r => badge('venta', r.tipo), csv: r => lbl('venta', r.tipo) },
    { key: 'det', label: 'Detalle', clase: 'wrap',
      html: r => {
        const a = r._animales.slice(0, 3).map(id => animalHtml(id)).join(' ') + (r._animales.length > 3 ? ` <span class="muted">+${r._animales.length - 3}</span>` : '');
        const extra = r.tipo === 'leche' && r.litros ? `${fmtNum(r.litros, 1)} L · ${fmtMoney(r.ingreso / r.litros)}/L`
          : r.peso_vivo ? `Vivo ${fmtNum(r.peso_vivo)} kg${r.peso_canal ? ` · Canal ${fmtNum(r.peso_canal)} kg (${fmtNum(r.rendimiento)}%)` : ''}` : '';
        return a + (extra ? `<span class="sub">${esc(extra)}</span>` : '');
      },
      csv: r => r._animales.map(animalTexto).join('; ') || (r.litros ? r.litros + ' L' : '') },
    { key: 'ingreso', label: 'Ingreso', clase: 'num', orden: r => Number(r.ingreso), html: r => fmtMoney(r.ingreso), csv: r => r.ingreso },
    { key: 'costo', label: 'Costo', clase: 'num', orden: r => Number(r.costo), html: r => fmtMoney(r.costo), csv: r => r.costo },
    { key: 'util', label: 'Utilidad', clase: 'num', orden: r => Number(r.utilidad), html: r => `<strong class="${r.utilidad < 0 ? 'neg' : 'pos'}">${fmtMoney(r.utilidad)}</strong>`, csv: r => r.utilidad },
    { key: 'notas', label: 'Notas', clase: 'wrap', texto: r => r.notas },
  ],
  resumen: f => [
    { label: 'Ventas', valor: fmtNum(f.length, 0) },
    { label: 'Ingresos', valor: fmtMoney(sum(f, r => r.ingreso)) },
    { label: 'Costos', valor: fmtMoney(sum(f, r => r.costo)) },
    { label: 'Utilidad', valor: fmtMoney(sum(f, r => r.utilidad)), alerta: sum(f, r => r.utilidad) < 0 },
    { label: 'Animales vendidos', valor: fmtNum(sum(f, r => r._animales.length), 0) },
    { label: 'Leche vendida', valor: fmtNum(sum(f.filter(r => r.tipo === 'leche'), r => r.litros), 0), unidad: 'L' },
  ],
  acciones: () => [{ act: 'editar', label: 'Editar', icono: 'edit' }, { act: 'borrar', label: 'Eliminar', icono: 'trash', peligro: true }],
  manejadores: {
    editar: r => formVenta(r),
    borrar: async r => {
      if (!await confirmar({ titulo: 'Eliminar venta', mensaje: r._animales.length ? `Se eliminará la venta y ${r._animales.length} animal(es) volverán a estado "Activo".` : 'Se eliminará esta venta.', etiqueta: 'Eliminar venta', peligro: true })) return;
      const { error } = await db.from('ventas').delete().eq('id', r.id);
      if (error) return showToast(errMsg(error), 'error');
      showToast('Venta eliminada'); recargar(['ventas', 'venta_animales']);
    },
  },
});

function formVenta(venta) {
  const edit = !!venta;
  const originales = edit ? venta._animales : [];
  const conAnimales = v => v.tipo === 'carne' || v.tipo === 'pie_cria';
  abrirFormulario({
    titulo: edit ? 'Editar venta' : 'Registrar venta', tam: 'wide',
    valores: edit ? { ...venta, animales: originales } : { fecha: hoy(), ingreso: null, costo: null, animales: [] },
    campos: [
      { name: 'fecha', label: 'Fecha', tipo: 'date', requerido: true },
      { name: 'cliente', label: 'Cliente', tipo: 'text', lista: () => [...new Set(store.ventas.map(v => v.cliente).filter(Boolean))] },
      { name: 'tipo', label: 'Tipo de venta', tipo: 'select', requerido: true, opciones: opts('venta') },
      { name: 'ingreso', label: 'Ingreso ($)', tipo: 'number', requerido: true, min: 0, paso: '0.01' },
      { name: 'costo', label: 'Costo asociado ($)', tipo: 'number', min: 0, paso: '0.01', ayuda: 'Transporte, matanza, comisiones, etc.' },
      { name: 'litros', label: 'Litros vendidos', tipo: 'number', requerido: true, min: 0.01, paso: '0.01', mostrarSi: v => v.tipo === 'leche' },
      { name: 'peso_vivo', label: 'Peso vivo total (kg)', tipo: 'number', min: 0.01, paso: '0.1', mostrarSi: v => v.tipo === 'carne' },
      { name: 'peso_canal', label: 'Peso en canal total (kg)', tipo: 'number', min: 0.01, paso: '0.1', mostrarSi: v => v.tipo === 'carne' },
      { name: 'calc', tipo: 'info', calcular: v => v.tipo === 'carne' && v.peso_vivo && v.peso_canal ? `Rendimiento en canal: ${fmtNum(v.peso_canal / v.peso_vivo * 100)} %` : (v.tipo === 'leche' && v.litros && v.ingreso ? `Precio promedio: ${fmtMoney(v.ingreso / v.litros)} por litro` : '') },
      { name: 'animales', label: 'Animales vendidos', tipo: 'animales', requerido: true, mostrarSi: conAnimales,
        opciones: () => store.animales.filter(a => a.estado === 'activo' || originales.includes(a.id)).sort((a, b) => a.identificador.localeCompare(b.identificador, 'es', { numeric: true })).map(opcionAnimal) },
      { name: 'notas', label: 'Notas', tipo: 'textarea' },
    ],
    validar: v => (v.peso_vivo && v.peso_canal && v.peso_canal > v.peso_vivo) ? { peso_canal: 'El peso en canal no puede ser mayor al peso vivo.' } : null,
    alGuardar: async v => {
      const d = { fecha: v.fecha, cliente: v.cliente, tipo: v.tipo, ingreso: v.ingreso || 0, costo: v.costo || 0, litros: v.tipo === 'leche' ? v.litros : null, peso_vivo: v.tipo === 'carne' ? (v.peso_vivo ?? null) : null, peso_canal: v.tipo === 'carne' ? (v.peso_canal ?? null) : null, notas: v.notas };
      const nuevos = conAnimales(v) ? (v.animales || []) : [];
      let id = venta?.id;
      if (edit) { const { error } = await db.from('ventas').update(d).eq('id', id); if (error) throw error; }
      else { const { data, error } = await db.from('ventas').insert(d).select('id').single(); if (error) throw error; id = data.id; }
      const quitar = originales.filter(a => !nuevos.includes(a)), agregar = nuevos.filter(a => !originales.includes(a));
      if (quitar.length) { const { error } = await db.from('venta_animales').delete().eq('venta_id', id).in('animal_id', quitar); if (error) throw error; }
      if (agregar.length) { const { error } = await db.from('venta_animales').insert(agregar.map(a => ({ venta_id: id, animal_id: a }))); if (error) throw error; }
      showToast(edit ? 'Venta actualizada' : 'Venta registrada'); await recargar(['ventas', 'venta_animales']);
    },
  });
}
