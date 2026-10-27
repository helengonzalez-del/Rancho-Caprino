// ventas.js — Ventas de carne, pie de cría, leche y otros; los animales vendidos cambian de estado solos

function ventasFilas() {
  const porVenta = {};
  store.venta_animales.forEach(va => (porVenta[va.venta_id] = porVenta[va.venta_id] || []).push(va.animal_id));
  return datosE().ventas.map(v => ({ ...v, _animales: porVenta[v.id] || [] }));
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
    { id: 'tipo', tipo: 'select', label: 'Tipo de venta', opciones: () => opts('venta').filter(([k]) => esp.actual !== 'ovino' || k !== 'leche'), prueba: (r, v) => r.tipo === v },
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
          : r.peso_vivo ? `Vivo ${fmtNum(r.peso_vivo)} kg${r.peso_canal ? ` · Canal ${fmtNum(r.peso_canal)} kg (${fmtNum(r.rendimiento)}%)` : ''}${r.precio_unitario ? ` · ${fmtMoney(r.precio_unitario)}/kg` : ''}` : '';
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

const r2 = n => Math.round(n * 100) / 100;

// Ingreso = precio × cantidad, según el tipo de venta. Devuelve undefined cuando se captura a mano ("Otro").
function calcularIngreso(v) {
  if (v.tipo === 'carne') {
    const peso = v.base_precio === 'canal' ? v.peso_canal : v.peso_vivo;
    return (v.precio_kg != null && peso) ? r2(v.precio_kg * peso) : null;
  }
  if (v.tipo === 'leche') return (v.precio_litro != null && v.litros) ? r2(v.precio_litro * v.litros) : null;
  if (v.tipo === 'pie_cria') return (v.precio_animal != null && (v.animales || []).length) ? r2(v.precio_animal * v.animales.length) : null;
  return undefined;
}

function formVenta(venta) {
  const edit = !!venta;
  const originales = edit ? venta._animales : [];
  const conAnimales = v => v.tipo === 'carne' || v.tipo === 'pie_cria';

  // Al editar ventas anteriores (sin precio guardado) se deduce el precio para no cambiar el ingreso.
  let valores = { fecha: hoy(), ingreso: null, costo: null, animales: [], base_precio: 'vivo' };
  if (edit) {
    const base = venta.base_precio || 'vivo';
    let precio = venta.precio_unitario;
    if (precio == null) {
      if (venta.tipo === 'carne') { const peso = base === 'canal' ? venta.peso_canal : venta.peso_vivo; precio = peso ? r2(venta.ingreso / peso) : null; }
      else if (venta.tipo === 'leche') precio = venta.litros ? r2(venta.ingreso / venta.litros) : null;
      else if (venta.tipo === 'pie_cria') precio = originales.length ? r2(venta.ingreso / originales.length) : null;
    }
    valores = { ...venta, animales: originales, base_precio: base, precio_kg: venta.tipo === 'carne' ? precio : null, precio_litro: venta.tipo === 'leche' ? precio : null, precio_animal: venta.tipo === 'pie_cria' ? precio : null };
  }

  abrirFormulario({
    titulo: edit ? 'Editar venta' : 'Registrar venta', tam: 'wide',
    sub: 'El ingreso se calcula solo con el precio y la cantidad.',
    valores,
    campos: [
      { name: 'fecha', label: 'Fecha', tipo: 'date', requerido: true },
      { name: 'cliente', label: 'Cliente', tipo: 'text', lista: () => [...new Set(store.ventas.map(v => v.cliente).filter(Boolean))] },
      { name: 'tipo', label: 'Tipo de venta', tipo: 'select', requerido: true, opciones: () => opts('venta').filter(([k]) => esp.actual !== 'ovino' || k !== 'leche') },
      { name: 'animales', label: 'Animales vendidos', tipo: 'animales', requerido: true, mostrarSi: conAnimales,
        opciones: () => animalesE().filter(a => a.estado === 'activo' || originales.includes(a.id)).sort((a, b) => a.identificador.localeCompare(b.identificador, 'es', { numeric: true })).map(opcionAnimal) },
      { name: 'peso_vivo', label: 'Peso vivo total (kg)', tipo: 'number', min: 0.01, paso: '0.1', mostrarSi: v => v.tipo === 'carne' },
      { name: 'peso_canal', label: 'Peso en canal total (kg)', tipo: 'number', min: 0.01, paso: '0.1', mostrarSi: v => v.tipo === 'carne' },
      { name: 'base_precio', label: 'El precio por kg es sobre', tipo: 'select', sinVacio: true, mostrarSi: v => v.tipo === 'carne', opciones: [['vivo', 'Peso vivo (en pie)'], ['canal', 'Peso en canal']] },
      { name: 'precio_kg', label: 'Precio por kg ($)', tipo: 'number', requerido: true, min: 0, paso: '0.01', mostrarSi: v => v.tipo === 'carne' },
      { name: 'litros', label: 'Litros vendidos', tipo: 'number', requerido: true, min: 0.01, paso: '0.01', mostrarSi: v => v.tipo === 'leche' },
      { name: 'precio_litro', label: 'Precio por litro ($)', tipo: 'number', requerido: true, min: 0, paso: '0.01', mostrarSi: v => v.tipo === 'leche' },
      { name: 'precio_animal', label: 'Precio por animal ($)', tipo: 'number', requerido: true, min: 0, paso: '0.01', mostrarSi: v => v.tipo === 'pie_cria' },
      { name: 'ingreso', label: 'Ingreso ($)', tipo: 'number', min: 0, paso: '0.01', calculado: calcularIngreso, ayuda: 'Se calcula solo. En "Otro" lo escribes tú.' },
      { name: 'calc', tipo: 'info', calcular: v => {
        const i = calcularIngreso(v); if (i == null) return '';
        const rend = v.tipo === 'carne' && v.peso_vivo && v.peso_canal ? ` · Rendimiento en canal: ${fmtNum(v.peso_canal / v.peso_vivo * 100)} %` : '';
        if (v.tipo === 'carne') return `${fmtNum(v.base_precio === 'canal' ? v.peso_canal : v.peso_vivo, 2)} kg × ${fmtMoney(v.precio_kg)} = ${fmtMoney(i)}${rend}`;
        if (v.tipo === 'leche') return `${fmtNum(v.litros, 2)} L × ${fmtMoney(v.precio_litro)} = ${fmtMoney(i)}`;
        return `${v.animales.length} animal${v.animales.length === 1 ? '' : 'es'} × ${fmtMoney(v.precio_animal)} = ${fmtMoney(i)}`;
      } },
      { name: 'costo', label: 'Costo asociado ($)', tipo: 'number', min: 0, paso: '0.01', ayuda: 'Transporte, matanza, comisiones, etc.' },
      { name: 'notas', label: 'Notas', tipo: 'textarea' },
    ],
    validar: v => {
      if (v.peso_vivo && v.peso_canal && v.peso_canal > v.peso_vivo) return { peso_canal: 'El peso en canal no puede ser mayor al peso vivo.' };
      if (v.tipo === 'carne' && v.ingreso == null) return v.base_precio === 'canal' ? { peso_canal: 'Indica el peso en canal para calcular el ingreso.' } : { peso_vivo: 'Indica el peso vivo para calcular el ingreso.' };
      if (v.tipo === 'otro' && v.ingreso == null) return { ingreso: 'Escribe el ingreso.' };
      if (v.ingreso == null) return { ingreso: 'No se pudo calcular el ingreso. Revisa el precio y la cantidad.' };
    },
    alGuardar: async v => {
      const precio = v.tipo === 'carne' ? v.precio_kg : v.tipo === 'leche' ? v.precio_litro : v.tipo === 'pie_cria' ? v.precio_animal : null;
      const d = { especie: esp.actual, fecha: v.fecha, cliente: v.cliente, tipo: v.tipo, ingreso: v.ingreso, costo: v.costo || 0, precio_unitario: precio ?? null, base_precio: v.tipo === 'carne' ? v.base_precio : null, litros: v.tipo === 'leche' ? v.litros : null, peso_vivo: v.tipo === 'carne' ? (v.peso_vivo ?? null) : null, peso_canal: v.tipo === 'carne' ? (v.peso_canal ?? null) : null, notas: v.notas };
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
