// insumos.js — Compras de alimento (pacas, cereal, maíz, pasta de soya…), precio por kilo
// y cálculo de cuánto alimento comprar según el peso de los animales.
// Cada sistema (caprino u ovino) lleva sus propios insumos y su propia ración.

const TIPOS_INSUMO_BASE = ['Paca', 'Cereal', 'Grano (maíz)', 'Pasta de soya'];
const DESC_TIPO = {
  'Paca': 'Forraje en paca (alfalfa, avena, sorgo, pastos…). Escribe su nombre real en “Producto”.',
  'Cereal': 'Alimento energético: sorgo, avena en grano, cebada o alimento comercial.',
  'Grano (maíz)': 'Maíz entero, quebrado o molido.',
  'Pasta de soya': 'Fuente de proteína.',
};
const UNIDAD_TXT = { paca: ['paca', 'pacas'], costal: ['costal', 'costales'], kilo: ['kilo', 'kilos'] };

function tiposInsumo(extra) {
  const usados = [...new Set(datosE().insumos.map(x => x.tipo).concat(datosE().racion.map(x => x.tipo), extra ? [extra] : []))]
    .filter(t => t && !TIPOS_INSUMO_BASE.includes(t)).sort((a, b) => a.localeCompare(b, 'es'));
  return [...TIPOS_INSUMO_BASE, ...usados];
}
const ultimaCompra = tipo => datosE().insumos.find(x => x.tipo === tipo);   // la lista viene de la más reciente a la más antigua
const presentacion = r => r.unidad === 'kilo' ? `${fmtNum(r.cantidad, 2)} kg a granel` : `${fmtNum(r.cantidad, 2)} ${UNIDAD_TXT[r.unidad][Number(r.cantidad) === 1 ? 0 : 1]} de ${fmtNum(r.kg_por_unidad, 2)} kg`;
const precioUnidadTxt = r => `${fmtMoney(r.precio_unidad)}<span class="sub">por ${UNIDAD_TXT[r.unidad][0]}</span>`;

registrarSeccion({
  key: 'insumos', titulo: 'Insumos', icono: 'box',
  subtitulo: 'Compras de alimento, precio por kilo y cuánto comprar según el peso de los animales.',
  botones: [{ label: 'Registrar compra', primario: true, accion: () => formInsumo() }],
  orden: { key: 'fecha', dir: 'desc' },
  csv: 'insumos',
  vacio: { titulo: 'Sin compras de alimento', texto: 'Registra la compra de pacas, cereal, maíz o pasta de soya para conocer el precio por kilo.' },
  filas: () => datosE().insumos,
  filtros: [
    { id: 'q', tipo: 'buscar', placeholder: 'Tipo, producto, proveedor o notas…', texto: r => [r.tipo, r.producto, r.proveedor, r.notas] },
    { id: 'tipo', tipo: 'select', label: 'Tipo de insumo', opciones: () => tiposInsumo().map(t => [t, t]), prueba: (r, v) => r.tipo === v },
    { id: 'producto', tipo: 'select', label: 'Producto', opciones: () => [...new Set(datosE().insumos.map(x => x.producto).filter(Boolean))].sort().map(x => [x, x]), prueba: (r, v) => r.producto === v },
    { id: 'unidad', tipo: 'select', label: 'Presentación', opciones: () => opts('insumo_unidad'), prueba: (r, v) => r.unidad === v },
    { id: 'prov', tipo: 'select', label: 'Proveedor', opciones: () => [...new Set(datosE().insumos.map(x => x.proveedor).filter(Boolean))].sort().map(x => [x, x]), prueba: (r, v) => r.proveedor === v },
    { id: 'fechas', tipo: 'fechas', label: 'Fecha de compra', valor: r => r.fecha },
    { id: 'pkg', tipo: 'rango', label: 'Precio por kilo ($)', valor: r => Number(r.precio_kg) },
  ],
  columnas: [
    { key: 'fecha', label: 'Fecha', orden: r => r.fecha, html: r => esc(fmtDate(r.fecha)), csv: r => r.fecha },
    { key: 'tipo', label: 'Tipo', texto: r => r.tipo, html: r => `<span class="badge">${esc(r.tipo)}</span>` },
    { key: 'producto', label: 'Producto', texto: r => r.producto },
    { key: 'pres', label: 'Presentación', orden: r => Number(r.kg_total), html: r => esc(presentacion(r)), csv: r => presentacion(r) },
    { key: 'kg', label: 'Kilos totales', clase: 'num', orden: r => Number(r.kg_total), html: r => `<strong>${fmtNum(r.kg_total, 1)}</strong>`, csv: r => r.kg_total },
    { key: 'pu', label: 'Precio por unidad', clase: 'num', orden: r => Number(r.precio_unidad), html: precioUnidadTxt, csv: r => r.precio_unidad },
    { key: 'costo', label: 'Costo total', clase: 'num', orden: r => Number(r.costo_total), html: r => fmtMoney(r.costo_total), csv: r => r.costo_total },
    { key: 'pkg', label: 'Precio por kilo', clase: 'num', orden: r => Number(r.precio_kg), html: r => `<strong>${fmtMoney(r.precio_kg)}</strong>`, csv: r => Number(r.precio_kg).toFixed(2) },
    { key: 'prov', label: 'Proveedor', texto: r => r.proveedor },
    { key: 'notas', label: 'Notas', clase: 'wrap', texto: r => r.notas },
  ],
  resumen: f => {
    const kg = sum(f, r => r.kg_total), gasto = sum(f, r => r.costo_total);
    const pacas = sum(f.filter(r => r.unidad === 'paca'), r => r.cantidad);
    const ultima = f.reduce((m, r) => (!m || r.fecha > m ? r.fecha : m), null);
    return [
      { label: 'Compras', valor: fmtNum(f.length, 0) },
      { label: 'Kilos ingresados', valor: fmtNum(kg, 1), unidad: 'kg', nota: pacas ? `${fmtNum(pacas, 0)} pacas` : '' },
      { label: 'Gasto total', valor: fmtMoney(gasto) },
      { label: 'Precio promedio por kilo', valor: kg ? fmtMoney(gasto / kg) : '—', nota: 'Gasto ÷ kilos' },
      { label: 'Última compra', valor: ultima ? esc(fmtDate(ultima)) : '—' },
    ];
  },
  arribaHtml: `
    <div class="panel calc-panel" id="calc-insumos">
      <div class="panel-head"><span class="panel-title">Cuánto alimento comprar</span><span class="panel-note">Con base en el último peso de cada animal</span></div>
      <div class="panel-body">
        <div class="calc-controles">
          <div class="field"><label for="ci-pct">Consumo ideal (% del peso vivo por día)</label><input type="number" id="ci-pct" step="0.1" min="0.5" max="10" inputmode="decimal"></div>
          <div class="field"><label for="ci-dias">Días que quieres cubrir</label><input type="number" id="ci-dias" step="1" min="1" inputmode="numeric"></div>
          <div class="field"><label for="ci-lote">Lote</label><select id="ci-lote"></select></div>
          <div class="field"><label for="ci-cat">Categoría</label><select id="ci-cat"></select></div>
        </div>
        <div class="summary" id="ci-res"></div>
        <div id="ci-aviso"></div>
        <div class="table-wrap calc-tabla-wrap">
          <table class="calc-tabla">
            <thead><tr><th>Tipo de insumo</th><th class="num">% de la ración</th><th class="num">Kilos a comprar</th><th class="num">Equivale a</th><th class="num">Precio por kilo</th><th class="num">Costo estimado</th></tr></thead>
            <tbody id="ci-filas"></tbody><tfoot id="ci-total"></tfoot>
          </table>
        </div>
        <p class="calc-nota">El consumo ideal se calcula sobre el peso vivo, con alimento seco (paca, grano y pasta de soya). El precio por kilo es el de la última compra de cada tipo. El porcentaje de cada tipo lo defines tú y se guarda para todo el equipo; si aún no lo has definido, se sugiere según lo que has comprado en los últimos 90 días. <span id="ci-guardado"></span></p>
      </div>
    </div>`,
  extraHtml: `<div class="panel" style="margin-bottom:14px"><div class="panel-head"><span class="panel-title">Resumen por tipo de insumo</span><span class="panel-note">Con los filtros aplicados</span></div><div class="table-wrap" id="insumos-tipos"></div></div>`,
  alRenderizar: filas => { resumenPorTipo(filas); renderCalc(); },
  acciones: () => [{ act: 'editar', label: 'Editar', icono: 'edit' }, { act: 'borrar', label: 'Eliminar', icono: 'trash', peligro: true }],
  manejadores: {
    editar: r => formInsumo(r),
    borrar: async r => {
      if (!await confirmar({ titulo: 'Eliminar compra', mensaje: `Se eliminará la compra de ${r.tipo}${r.producto ? ' (' + r.producto + ')' : ''} del ${fmtDate(r.fecha)}.`, etiqueta: 'Eliminar', peligro: true })) return;
      const { error } = await db.from('insumos').delete().eq('id', r.id);
      if (error) return showToast(errMsg(error), 'error');
      showToast('Compra eliminada'); recargar('insumos');
    },
  },
});

// ---------- Resumen por tipo ----------
function resumenPorTipo(filas) {
  const el = document.getElementById('insumos-tipos'); if (!el) return;
  const g = {};
  filas.forEach(r => { const o = g[r.tipo] = g[r.tipo] || { n: 0, kg: 0, gasto: 0 }; o.n++; o.kg += Number(r.kg_total); o.gasto += Number(r.costo_total); });
  const tipos = Object.keys(g).sort((a, b) => g[b].gasto - g[a].gasto);
  if (!tipos.length) { el.innerHTML = '<div class="list-empty">No hay compras con los filtros actuales.</div>'; return; }
  const kg = sum(tipos, t => g[t].kg), gasto = sum(tipos, t => g[t].gasto);
  el.innerHTML = `<table class="calc-tabla"><thead><tr><th>Tipo</th><th class="num">Compras</th><th class="num">Kilos</th><th class="num">Gasto</th><th class="num">Precio promedio por kilo</th><th class="num">% del gasto</th></tr></thead><tbody>${
    tipos.map(t => `<tr><td><span class="badge">${esc(t)}</span></td><td class="num">${g[t].n}</td><td class="num">${fmtNum(g[t].kg, 1)}</td><td class="num">${fmtMoney(g[t].gasto)}</td><td class="num"><strong>${fmtMoney(g[t].gasto / g[t].kg)}</strong></td><td class="num">${fmtNum(g[t].gasto / gasto * 100, 0)} %</td></tr>`).join('')
  }</tbody><tfoot><tr><td>Total</td><td class="num">${filas.length}</td><td class="num">${fmtNum(kg, 1)}</td><td class="num">${fmtMoney(gasto)}</td><td class="num">${fmtMoney(gasto / kg)}</td><td></td></tr></tfoot></table>`;
}

// ---------- Calculadora: cuánto comprar ----------
const calcEst = { esp: null, sig: '', temporizador: null };

// Mezcla que se ha comprado en los últimos 90 días (en % de kilos), para sugerir la ración
function racionSugerida() {
  const desde = addDays(hoy(), -90), r = datosE().insumos.filter(x => x.fecha >= desde), tot = sum(r, x => x.kg_total), m = {};
  r.forEach(x => { m[x.tipo] = (m[x.tipo] || 0) + Number(x.kg_total); });
  return tot ? Object.fromEntries(Object.entries(m).map(([t, k]) => [t, Math.round(k / tot * 1000) / 10])) : {};
}
function pctRacion(tipo) {
  const g = datosE().racion.find(x => x.tipo === tipo);
  return g ? Number(g.porcentaje) : (racionSugerida()[tipo] || 0);
}

function renderCalc() {
  const raiz = document.getElementById('calc-insumos'); if (!raiz) return;
  const tipos = tiposInsumo();
  const sig = [esp.actual, lotes().join('|'), tipos.join('|')].join('#');
  if (calcEst.esp !== esp.actual) {        // al cambiar de sistema se reinicia la calculadora
    calcEst.esp = esp.actual; calcEst.sig = '';
    document.getElementById('ci-pct').value = 3; document.getElementById('ci-dias').value = 30;
    document.getElementById('ci-lote').value = ''; document.getElementById('ci-cat').value = '';
  }
  if (calcEst.sig !== sig) {
    calcEst.sig = sig;
    const lote = document.getElementById('ci-lote'), cat = document.getElementById('ci-cat');
    const vL = lote.value, vC = cat.value;
    lote.innerHTML = '<option value="">Todos los lotes</option>' + lotes().map(l => `<option value="${esc(l)}">${esc(l)}</option>`).join('');
    cat.innerHTML = '<option value="">Todas las categorías</option>' + opts('estado_productivo').map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join('');
    lote.value = lotes().includes(vL) ? vL : ''; cat.value = vC;
    document.getElementById('ci-filas').innerHTML = tipos.map(t => `<tr data-tipo="${esc(t)}"><td><span class="badge">${esc(t)}</span></td>
      <td class="num"><input type="number" class="ci-pct" min="0" max="100" step="1" inputmode="decimal" value="${pctRacion(t)}" aria-label="Porcentaje de ${esc(t)} en la ración"> %</td>
      <td class="num" data-c="kg"></td><td class="num" data-c="uni"></td><td class="num" data-c="pkg"></td><td class="num" data-c="costo"></td></tr>`).join('');
  }
  actualizarCalc();
}

function calcularCompra() {
  const pct = Number(document.getElementById('ci-pct').value) || 0, dias = Number(document.getElementById('ci-dias').value) || 0;
  const lote = document.getElementById('ci-lote').value, cat = document.getElementById('ci-cat').value;
  const grupo = animalesActivos(a => (!lote || a.lote === lote) && (!cat || a.estado_productivo === cat));
  const conPeso = grupo.filter(a => a.ultimo_peso != null);
  const pesoTotal = sum(conPeso, a => a.ultimo_peso);
  const diario = pesoTotal * pct / 100, total = diario * dias;
  const filas = [...document.querySelectorAll('#ci-filas tr')].map(tr => {
    const tipo = tr.dataset.tipo, p = Number(tr.querySelector('.ci-pct').value) || 0, kg = total * p / 100, u = ultimaCompra(tipo);
    const unidades = u && u.unidad !== 'kilo' ? Math.ceil(kg / Number(u.kg_por_unidad) - 1e-9) : null;
    return { tr, tipo, p, kg, u, unidades, pkg: u ? Number(u.precio_kg) : null, costo: u ? kg * Number(u.precio_kg) : null };
  });
  const costoTotal = sum(filas, f => f.costo), costoDia = dias ? costoTotal / dias : 0;
  return { grupo, conPeso, sinPeso: grupo.length - conPeso.length, antiguos: conPeso.filter(a => diffDays(hoy(), a.fecha_ultimo_peso) > 60).length, pesoTotal, pct, dias, diario, total, filas, sumaPct: sum(filas, f => f.p), costoTotal, costoDia };
}

function actualizarCalc() {
  const c = calcularCompra();
  document.getElementById('ci-res').innerHTML = [
    { l: 'Animales con peso', v: fmtNum(c.conPeso.length, 0), n: c.sinPeso ? `${c.sinPeso} sin pesaje (no incluidos)` : `de ${c.grupo.length} activos` },
    { l: 'Peso total del grupo', v: fmtNum(c.pesoTotal, 1), u: 'kg', n: c.conPeso.length ? `Promedio ${fmtNum(c.pesoTotal / c.conPeso.length, 1)} kg` : '' },
    { l: 'Consumo ideal por día', v: fmtNum(c.diario, 1), u: 'kg', n: `${fmtNum(c.pct, 1)} % del peso vivo` },
    { l: `Alimento para ${fmtNum(c.dias, 0)} días`, v: fmtNum(c.total, 0), u: 'kg' },
    { l: 'Costo estimado', v: fmtMoney(c.costoTotal), n: c.conPeso.length ? `${fmtMoney(c.costoDia)} por día · ${fmtMoney(c.costoDia / c.conPeso.length)} por animal` : '' },
  ].map(s => `<div class="stat"><div class="stat-label">${esc(s.l)}</div><div class="stat-value">${s.v}${s.u ? `<small>${s.u}</small>` : ''}</div>${s.n ? `<div class="stat-hint">${esc(s.n)}</div>` : ''}</div>`).join('');

  const avisos = [];
  if (!c.conPeso.length) avisos.push('No hay animales con peso registrado en este grupo. Registra pesos en la sección Producción para calcular el consumo.');
  if (c.antiguos) avisos.push(`${c.antiguos} animal${c.antiguos === 1 ? '' : 'es'} tienen su último peso con más de 60 días. Si ya crecieron, el cálculo quedará corto: actualiza los pesos en Producción.`);
  if (c.conPeso.length && Math.abs(c.sumaPct - 100) > 0.05) avisos.push(`La ración suma ${fmtNum(c.sumaPct, 1)} %. Para cubrir el 100 % del consumo, los porcentajes deben sumar 100.`);
  document.getElementById('ci-aviso').innerHTML = avisos.map(a => `<div class="banner aviso">${esc(a)}</div>`).join('');

  c.filas.forEach(f => {
    const cel = k => f.tr.querySelector(`[data-c="${k}"]`);
    cel('kg').textContent = fmtNum(f.kg, 1);
    cel('uni').textContent = f.unidades != null ? `${fmtNum(f.unidades, 0)} ${UNIDAD_TXT[f.u.unidad][f.unidades === 1 ? 0 : 1]} de ${fmtNum(f.u.kg_por_unidad, 1)} kg` : (f.u ? `${fmtNum(f.kg, 1)} kg a granel` : '—');
    cel('pkg').innerHTML = f.pkg != null ? fmtMoney(f.pkg) : '<span class="muted" title="Aún no hay compras de este tipo">Sin compras</span>';
    cel('costo').textContent = f.costo != null ? fmtMoney(f.costo) : '—';
  });
  document.getElementById('ci-total').innerHTML = `<tr><td>Total</td><td class="num ${Math.abs(c.sumaPct - 100) > 0.05 ? 'warn' : ''}">${fmtNum(c.sumaPct, 1)} %</td><td class="num">${fmtNum(sum(c.filas, f => f.kg), 1)}</td><td></td><td></td><td class="num">${fmtMoney(c.costoTotal)}</td></tr>`;
}

// Guarda la ración (porcentajes) para todo el equipo; se llama un momento después de dejar de escribir
function guardarRacion() {
  clearTimeout(calcEst.temporizador);
  calcEst.temporizador = setTimeout(async () => {
    const filas = [...document.querySelectorAll('#ci-filas tr')].map(tr => ({ especie: esp.actual, tipo: tr.dataset.tipo, porcentaje: Math.min(100, Math.max(0, Number(tr.querySelector('.ci-pct').value) || 0)) }));
    const { error } = await db.from('insumos_racion').upsert(filas, { onConflict: 'especie,tipo' });
    const el = document.getElementById('ci-guardado');
    if (error) { showToast('No se pudo guardar la ración: ' + errMsg(error), 'error'); return; }
    store.insumos_racion = [...store.insumos_racion.filter(x => x.especie !== esp.actual), ...filas];
    if (el) { el.textContent = 'Ración guardada.'; setTimeout(() => { el.textContent = ''; }, 2500); }
  }, 700);
}

document.addEventListener('input', e => {
  if (!e.target.closest || !e.target.closest('#calc-insumos')) return;
  if (e.target.classList.contains('ci-pct')) guardarRacion();
  actualizarCalc();
});
document.addEventListener('change', e => { if (e.target.closest && e.target.closest('#calc-insumos') && e.target.matches('select')) actualizarCalc(); });

// ---------- Formulario de compra ----------
function formInsumo(x) {
  const edit = !!x;
  let tipoPrevio = x ? x.tipo : null;
  const esKilo = v => v.unidad === 'kilo';
  const valores = edit
    ? { ...x, kilos: x.unidad === 'kilo' ? x.cantidad : null, cantidad: x.unidad === 'kilo' ? null : x.cantidad, precio_kilo: x.unidad === 'kilo' ? x.precio_unidad : null, precio_unidad: x.unidad === 'kilo' ? null : x.precio_unidad }
    : { fecha: hoy(), unidad: 'paca' };
  const cuenta = v => {
    if (esKilo(v)) { return (v.kilos && v.precio_kilo != null) ? `${fmtNum(v.kilos, 2)} kg × ${fmtMoney(v.precio_kilo)} = ${fmtMoney(v.kilos * v.precio_kilo)}` : ''; }
    if (!(v.cantidad && v.kg_por_unidad && v.precio_unidad != null)) return '';
    const u = UNIDAD_TXT[v.unidad || 'paca'][v.cantidad === 1 ? 0 : 1];
    return `${fmtNum(v.cantidad, 2)} ${u} × ${fmtNum(v.kg_por_unidad, 2)} kg = ${fmtNum(v.cantidad * v.kg_por_unidad, 1)} kg · ${fmtMoney(v.cantidad * v.precio_unidad)} en total · ${fmtMoney(v.precio_unidad / v.kg_por_unidad)} por kilo`;
  };
  abrirFormulario({
    titulo: edit ? 'Editar compra' : 'Registrar compra de alimento', tam: 'wide',
    sub: 'Con la cantidad, los kilos y el precio, el sistema calcula el precio por kilo.',
    valores,
    campos: [
      { name: 'fecha', label: 'Fecha de compra', tipo: 'date', requerido: true },
      { name: 'tipo', label: 'Tipo de insumo', tipo: 'select', requerido: true, opciones: () => [...tiposInsumo(x?.tipo).map(t => [t, t]), ['__otro__', '+ Agregar otro insumo…']] },
      { name: 'tipo_otro', label: 'Nombre del nuevo insumo', tipo: 'text', requerido: true, placeholder: 'Ej: Melaza, Rastrojo, Alimento comercial', mostrarSi: v => v.tipo === '__otro__' },
      { name: 'producto', label: 'Producto (nombre real)', tipo: 'text', placeholder: 'Ej: Alfalfa, Avena, Maíz quebrado', lista: () => [...new Set(datosE().insumos.map(i => i.producto).filter(Boolean))] },
      { name: 'desc', tipo: 'info', calcular: v => DESC_TIPO[v.tipo] || '' },
      { name: 'unidad', label: 'Se compra por', tipo: 'select', sinVacio: true, opciones: opts('insumo_unidad') },
      { name: 'cantidad', label: 'Cantidad de pacas o costales', tipo: 'number', requerido: true, min: 0.01, paso: 'any', mostrarSi: v => !esKilo(v) },
      { name: 'kg_por_unidad', label: 'Kilos de cada paca o costal', tipo: 'number', requerido: true, min: 0.01, paso: 'any', mostrarSi: v => !esKilo(v) },
      { name: 'precio_unidad', label: 'Precio de cada paca o costal ($)', tipo: 'number', requerido: true, min: 0, paso: '0.01', mostrarSi: v => !esKilo(v) },
      { name: 'kilos', label: 'Kilos comprados', tipo: 'number', requerido: true, min: 0.01, paso: 'any', mostrarSi: esKilo },
      { name: 'precio_kilo', label: 'Precio por kilo ($)', tipo: 'number', requerido: true, min: 0, paso: '0.01', mostrarSi: esKilo },
      { name: 'cuenta', tipo: 'info', calcular: cuenta },
      { name: 'proveedor', label: 'Proveedor', tipo: 'text', lista: () => [...new Set(datosE().insumos.map(i => i.proveedor).filter(Boolean))] },
      { name: 'notas', label: 'Notas', tipo: 'textarea' },
    ],
    alCambiar: (v, api) => {
      if (edit || v.tipo === tipoPrevio) return;
      tipoPrevio = v.tipo;
      api.poner('unidad', v.tipo === 'Paca' ? 'paca' : 'costal');
    },
    alGuardar: async v => {
      let tipo = v.tipo;
      if (tipo === '__otro__') {
        const nuevo = v.tipo_otro.charAt(0).toUpperCase() + v.tipo_otro.slice(1);
        tipo = tiposInsumo().find(t => norm(t) === norm(nuevo)) || nuevo;
      }
      const kilo = esKilo(v);
      const d = { especie: esp.actual, fecha: v.fecha, tipo, producto: v.producto, unidad: v.unidad, cantidad: kilo ? v.kilos : v.cantidad, kg_por_unidad: kilo ? 1 : v.kg_por_unidad, precio_unidad: kilo ? v.precio_kilo : v.precio_unidad, proveedor: v.proveedor, notas: v.notas };
      const { error } = edit ? await db.from('insumos').update(d).eq('id', x.id) : await db.from('insumos').insert(d);
      if (error) throw error;
      showToast(edit ? 'Compra actualizada' : 'Compra registrada'); await recargar('insumos');
    },
  });
}
