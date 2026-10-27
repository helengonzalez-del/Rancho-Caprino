// dashboard.js — Indicadores, gráficas y listas de atención

const COLORES = { bosque: '#2a5a2c', oliva: '#6d8f2f', lima: '#a9c04f', cuerno: '#b99a64', arete: '#f1c83c', peligro: '#a8352a', texto: '#475a4a', rejilla: '#e5eadf' };
const graficas = {};
let periodoDash = '90';
const PERIODOS = [['30', '30 días'], ['90', '90 días'], ['180', '6 meses'], ['365', '12 meses'], ['todo', 'Todo']];

function destruirGrafica(id) { if (graficas[id]) { graficas[id].destroy(); delete graficas[id]; } }
function unir(a, b) {
  const o = { ...a };
  for (const k in b) o[k] = (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a && typeof a[k] === 'object') ? unir(a[k], b[k]) : b[k];
  return o;
}
function dibujarGrafica(id, tipo, etiquetas, datasets, opciones = {}) {
  const el = document.getElementById(id); if (!el) return;
  destruirGrafica(id);
  if (typeof Chart === 'undefined') { el.parentElement.innerHTML = '<div class="chart-empty">No se pudo cargar la librería de gráficas. Revisa tu conexión.</div>'; return; }
  Chart.defaults.font.family = "'IBM Plex Sans', system-ui, -apple-system, 'Segoe UI', sans-serif";
  const base = {
    responsive: true, maintainAspectRatio: false, animation: { duration: 250 },
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { position: 'top', align: 'start', labels: { boxWidth: 10, boxHeight: 10, font: { size: 12 }, color: COLORES.texto } }, tooltip: { padding: 10, cornerRadius: 4 } },
    scales: {
      x: { grid: { display: false }, ticks: { color: COLORES.texto, font: { size: 11.5 }, maxRotation: 0, autoSkip: true } },
      y: { grid: { color: COLORES.rejilla }, border: { display: false }, ticks: { color: COLORES.texto, font: { size: 11.5 } } },
    },
  };
  graficas[id] = new Chart(el, { type: tipo, data: { labels: etiquetas, datasets }, options: unir(base, opciones) });
}
// Prepara la caja de una gráfica: con datos pone un canvas; sin datos, un mensaje.
function prepararCaja(cajaId, canvasId, hayDatos, mensaje) {
  const caja = document.getElementById(cajaId); if (!caja) return false;
  destruirGrafica(canvasId);
  caja.innerHTML = hayDatos ? `<canvas id="${canvasId}" role="img"></canvas>` : `<div class="chart-empty">${esc(mensaje)}</div>`;
  return hayDatos;
}

function htmlDashboard() {
  const panel = (span, titulo, notaId, cajaId, extra = '') => `<div class="panel ${span}"><div class="panel-head"><span class="panel-title" id="t-${cajaId}">${titulo}</span><span class="panel-note" id="${notaId}"></span></div><div class="chart-box ${extra}" id="${cajaId}"></div></div>`;
  return `
  <section class="view" id="view-dashboard" hidden aria-labelledby="h-dashboard">
    <header class="view-head">
      <div><div class="esp-tag" id="esp-dashboard"></div><h1 id="h-dashboard">Dashboard</h1><p class="view-sub" id="dash-sub"></p></div>
      <div class="period" role="group" aria-label="Periodo de análisis">${PERIODOS.map(([v, l]) => `<button type="button" data-periodo="${v}" aria-pressed="${v === periodoDash}">${l}</button>`).join('')}</div>
    </header>
    <div class="summary kpis" id="kpis"></div>
    <div class="dash-grid">
      ${panel('span-8', 'Producción de leche', 'n-leche', 'b-leche', 'alto')}
      ${panel('span-4', 'Hato activo por categoría', 'n-hato', 'b-hato', 'alto')}
      ${panel('span-6', 'Partos y crías por mes', 'n-partos', 'b-partos')}
      ${panel('span-6', 'Ingresos, costos y utilidad por mes', 'n-ventas', 'b-ventas')}
      ${panel('span-6', 'Eventos de salud por tipo', 'n-salud', 'b-salud')}
      ${panel('span-6', 'Ganancia diaria de peso promedio', 'n-gdp', 'b-gdp')}
    </div>
    <div class="dash-grid">
      <div class="panel span-4"><div class="panel-head"><span class="panel-title">Próximos partos</span><span class="panel-note">Hembras en gestación</span></div><div id="l-partos"></div></div>
      <div class="panel span-4"><div class="panel-head"><span class="panel-title">Actividades pendientes</span><span class="panel-note">Manejo y salud</span></div><div id="l-pend"></div></div>
      <div class="panel span-4"><div class="panel-head"><span class="panel-title">Atención de salud</span><span class="panel-note">Casos abiertos y retiros</span></div><div id="l-salud"></div></div>
    </div>
  </section>`;
}

function iniciarDashboard() {
  document.getElementById('views').insertAdjacentHTML('afterbegin', htmlDashboard());
  document.getElementById('view-dashboard').addEventListener('click', async e => {
    const b = e.target.closest('[data-periodo]'); if (!b) return;
    periodoDash = b.dataset.periodo;
    document.querySelectorAll('[data-periodo]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.periodo === periodoDash)));
    const desde = desdePeriodo();
    if (periodoDash === 'todo') await cargarHistorialLeche(); else await asegurarLeche(desde);
    renderDashboard();
  });
}

const desdePeriodo = () => periodoDash === 'todo' ? null : addDays(hoy(), -Number(periodoDash));
const enPeriodo = (f, desde) => !desde || f >= desde;

function porMes(filas, fecha, valor, mesesMax = 12) {
  const m = {};
  filas.forEach(r => { const k = fecha(r).slice(0, 7); m[k] = (m[k] || 0) + valor(r); });
  const claves = Object.keys(m).sort().slice(-mesesMax);
  return { claves, valores: claves.map(k => m[k]) };
}

function renderDashboard() {
  const desde = desdePeriodo();
  const D = datosE();
  const activos = D.animales.filter(a => a.estado === 'activo');
  const general = esp.actual === 'todos', ovino = esp.actual === 'ovino';
  const tag = document.getElementById('esp-dashboard');
  tag.textContent = general ? 'Caprinos y ovinos' : ESPECIES[esp.actual]; tag.dataset.esp = esp.actual;
  document.getElementById('h-dashboard').textContent = general ? 'Dashboard general' : 'Resumen del sistema';
  document.getElementById('dash-sub').textContent = `${general ? 'Suma de los dos sistemas. ' : ''}Situación al ${fmtDate(hoy())}. Los indicadores de actividad consideran ${periodoDash === 'todo' ? 'todo el historial' : 'los últimos ' + PERIODOS.find(p => p[0] === periodoDash)[1]}.`;

  // ---------- KPIs ----------
  const hembras = activos.filter(a => a.sexo === 'hembra').length;
  const gest = activos.filter(a => a.gestante);
  const parto30 = D.empadres.filter(e => vigente(e) && diasParto(e) != null && diasParto(e) >= 0 && diasParto(e) <= 30).length;
  const leche7 = D.leche.filter(l => l.fecha > addDays(hoy(), -7));
  const dias7 = new Set(leche7.map(l => l.fecha)).size;
  const ordeno = new Set(leche7.map(l => l.id_animal)).size;
  const partos = D.partos.filter(p => enPeriodo(p.fecha_parto, desde));
  const vivas = sum(partos, p => p.machos + p.hembras), totalN = sum(partos, p => p.total_nacidos);
  const ventas = D.ventas.filter(v => enPeriodo(v.fecha, desde));
  const util = sum(ventas, v => v.utilidad);
  const abiertos = D.salud.filter(s => s.estado === 'abierto');
  const enRet = new Set(D.salud.filter(s => retiroActivo(s, 'leche') || retiroActivo(s, 'carne')).map(s => s.id_animal));
  const pesados = activos.filter(a => a.ultimo_peso != null);
  const kpis = [
    { label: 'Hato activo', valor: fmtNum(activos.length, 0), nota: general ? `${activos.filter(a => a.especie === 'caprino').length} caprinos · ${activos.filter(a => a.especie === 'ovino').length} ovinos` : `${hembras} hembras · ${activos.length - hembras} machos` },
    ovino
      ? { label: 'Peso promedio', valor: pesados.length ? fmtNum(avg(pesados, a => Number(a.ultimo_peso)), 1) : '—', unidad: 'kg', nota: `Último pesaje · ${pesados.length} animales` }
      : { label: 'Leche por día', valor: dias7 ? fmtNum(sum(leche7, l => l.litros) / dias7, 1) : '—', unidad: 'L', nota: `Últimos 7 días · ${ordeno} cabras${general ? ' (solo caprino)' : ''}` },
    { label: 'Hembras gestantes', valor: fmtNum(gest.length, 0), nota: `${parto30} partos en los próximos 30 días` },
    { label: 'Partos del periodo', valor: fmtNum(partos.length, 0), nota: partos.length ? `${vivas} crías vivas · ${fmtNum(totalN / partos.length, 2)} por parto` : 'Sin partos en el periodo' },
    { label: 'Utilidad de ventas', valor: fmtMoney(util), nota: `Ingresos ${fmtMoney(sum(ventas, v => v.ingreso))}`, alerta: util < 0 },
    { label: 'Casos de salud abiertos', valor: fmtNum(abiertos.length, 0), nota: `${enRet.size} animal${enRet.size === 1 ? '' : 'es'} en retiro`, alerta: abiertos.length > 0 },
  ];
  document.getElementById('kpis').innerHTML = kpis.map(s => `<div class="stat ${s.alerta ? 'alerta' : ''}"><div class="stat-label">${esc(s.label)}</div><div class="stat-value">${s.valor}${s.unidad ? `<small>${esc(s.unidad)}</small>` : ''}</div><div class="stat-hint">${esc(s.nota || '')}</div></div>`).join('');

  // ---------- Panel grande: leche (caprino) o peso por categoría (ovino) ----------
  document.getElementById('t-b-leche').textContent = ovino ? 'Peso promedio por categoría' : general ? 'Producción de leche (caprinos)' : 'Producción de leche';
  if (ovino) {
    const pc = {};
    pesados.forEach(a => { const k = a.estado_productivo ? L.estado_productivo[a.estado_productivo] : 'Sin categoría'; (pc[k] = pc[k] || []).push(Number(a.ultimo_peso)); });
    const pk = Object.keys(pc).sort((x, y) => avg(pc[y]) - avg(pc[x]));
    document.getElementById('n-leche').textContent = 'Último peso registrado';
    if (prepararCaja('b-leche', 'g-leche', pk.length > 0, 'Aún no hay pesajes registrados.'))
      dibujarGrafica('g-leche', 'bar', pk, [{ label: 'Peso promedio (kg)', data: pk.map(k => +avg(pc[k]).toFixed(1)), backgroundColor: COLORES.cuerno, borderRadius: 2 }], { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, title: { display: true, text: 'kg' } } } });
  } else {
    const lech = D.leche.filter(l => enPeriodo(l.fecha, desde));
    const dia = {}; lech.forEach(l => { dia[l.fecha] = (dia[l.fecha] || 0) + Number(l.litros); });
    const dias = Object.keys(dia).sort();
    if (prepararCaja('b-leche', 'g-leche', dias.length > 0, 'No hay registros de leche en este periodo.')) {
      if (dias.length <= 120) {
        const vals = dias.map(d => +dia[d].toFixed(1));
        const media = vals.map((_, i) => { const w = vals.slice(Math.max(0, i - 6), i + 1); return +(sum(w) / w.length).toFixed(1); });
        document.getElementById('n-leche').textContent = 'Litros por día';
        dibujarGrafica('g-leche', 'bar', dias.map(d => fmtDate(d).replace(/ \d{4}$/, '')), [
          { type: 'bar', label: 'Litros por día', data: vals, backgroundColor: COLORES.oliva, borderRadius: 2, order: 2 },
          { type: 'line', label: 'Promedio móvil de 7 días', data: media, borderColor: COLORES.bosque, backgroundColor: COLORES.bosque, borderWidth: 2, pointRadius: 0, tension: .3, order: 1 },
        ], { scales: { y: { beginAtZero: true } } });
      } else {
        const m = {}; dias.forEach(d => { const k = d.slice(0, 7); (m[k] = m[k] || []).push(dia[d]); });
        const ks = Object.keys(m).sort();
        document.getElementById('n-leche').textContent = 'Promedio diario por mes';
        dibujarGrafica('g-leche', 'bar', ks.map(fmtMonth), [{ label: 'Litros por día (promedio)', data: ks.map(k => +avg(m[k]).toFixed(1)), backgroundColor: COLORES.oliva, borderRadius: 2 }], { scales: { y: { beginAtZero: true } } });
      }
    } else document.getElementById('n-leche').textContent = '';
  }

  // ---------- Hato por categoría ----------
  const catDe = lista => { const c = {}; lista.forEach(a => { const k = a.estado_productivo ? L.estado_productivo[a.estado_productivo] : 'Sin categoría'; c[k] = (c[k] || 0) + 1; }); return c; };
  const cat = catDe(activos);
  const ck = Object.keys(cat).sort((a, b) => cat[b] - cat[a]);
  document.getElementById('n-hato').textContent = `${activos.length} animales`;
  const dsHato = general
    ? ['caprino', 'ovino'].map((e, i) => { const c = catDe(activos.filter(a => a.especie === e)); return { label: e === 'caprino' ? 'Caprino' : 'Ovino', data: ck.map(k => c[k] || 0), backgroundColor: i ? COLORES.cuerno : COLORES.bosque, borderRadius: 2, stack: 's' }; })
    : [{ label: 'Animales', data: ck.map(k => cat[k]), backgroundColor: COLORES.bosque, borderRadius: 2 }];
  if (prepararCaja('b-hato', 'g-hato', ck.length > 0, 'Aún no hay animales activos.'))
    dibujarGrafica('g-hato', 'bar', ck, dsHato, { indexAxis: 'y', plugins: { legend: { display: general } }, scales: { x: { stacked: general, beginAtZero: true, ticks: { precision: 0 } }, y: { stacked: general, grid: { display: false } } } });

  // ---------- Partos por mes ----------
  const pm = {}; partos.forEach(p => { const k = p.fecha_parto.slice(0, 7); pm[k] = pm[k] || { v: 0, m: 0, n: 0 }; pm[k].v += p.machos + p.hembras; pm[k].m += p.nacidos_muertos; pm[k].n++; });
  const pk = Object.keys(pm).sort().slice(-12);
  document.getElementById('n-partos').textContent = `${partos.length} partos`;
  if (prepararCaja('b-partos', 'g-partos', pk.length > 0, 'No hay partos en este periodo.'))
    dibujarGrafica('g-partos', 'bar', pk.map(fmtMonth), [
      { label: 'Crías vivas', data: pk.map(k => pm[k].v), backgroundColor: COLORES.bosque, borderRadius: 2, stack: 's' },
      { label: 'Nacidos muertos', data: pk.map(k => pm[k].m), backgroundColor: COLORES.peligro, borderRadius: 2, stack: 's' },
    ], { scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } } } });

  // ---------- Ventas por mes ----------
  const vi = porMes(ventas, v => v.fecha, v => Number(v.ingreso)), vc = porMes(ventas, v => v.fecha, v => Number(v.costo));
  const vk = vi.claves;
  document.getElementById('n-ventas').textContent = fmtMoney(sum(ventas, v => v.ingreso)) + ' en ingresos';
  if (prepararCaja('b-ventas', 'g-ventas', vk.length > 0, 'No hay ventas en este periodo.'))
    dibujarGrafica('g-ventas', 'bar', vk.map(fmtMonth), [
      { type: 'bar', label: 'Ingresos', data: vi.valores, backgroundColor: COLORES.oliva, borderRadius: 2, order: 2 },
      { type: 'bar', label: 'Costos', data: vk.map(k => vc.valores[vc.claves.indexOf(k)] || 0), backgroundColor: COLORES.cuerno, borderRadius: 2, order: 2 },
      { type: 'line', label: 'Utilidad', data: vk.map((k, i) => vi.valores[i] - (vc.valores[vc.claves.indexOf(k)] || 0)), borderColor: COLORES.bosque, backgroundColor: COLORES.bosque, borderWidth: 2, tension: .25, pointRadius: 3, order: 1 },
    ], { scales: { y: { beginAtZero: true, ticks: { callback: v => '$' + fmtNum(v, 0) } } }, plugins: { tooltip: { callbacks: { label: c => `${c.dataset.label}: ${fmtMoney(c.parsed.y)}` } } } });

  // ---------- Salud por tipo ----------
  const sal = D.salud.filter(s => enPeriodo(s.fecha, desde)); const st = {}; sal.forEach(s => { st[s.tipo] = (st[s.tipo] || 0) + 1; });
  const sk = Object.keys(st).sort((a, b) => st[b] - st[a]);
  document.getElementById('n-salud').textContent = `${sal.length} eventos`;
  if (prepararCaja('b-salud', 'g-salud', sk.length > 0, 'No hay eventos de salud en este periodo.'))
    dibujarGrafica('g-salud', 'bar', sk.map(k => lbl('salud', k)), [{ label: 'Eventos', data: sk.map(k => st[k]), backgroundColor: COLORES.cuerno, borderRadius: 2 }], { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { precision: 0 } }, y: { grid: { display: false } } } });

  // ---------- GDP ----------
  const pes = D.pesajes.filter(p => p.gdp_g != null && enPeriodo(p.fecha, desde)); const gm = {};
  pes.forEach(p => { const k = p.fecha.slice(0, 7); (gm[k] = gm[k] || []).push(Number(p.gdp_g)); });
  const gk = Object.keys(gm).sort().slice(-12);
  document.getElementById('n-gdp').textContent = pes.length ? `Promedio ${fmtNum(avg(pes, p => Number(p.gdp_g)), 0)} g/día` : '';
  if (prepararCaja('b-gdp', 'g-gdp', gk.length > 0, 'No hay pesajes con peso anterior en este periodo.'))
    dibujarGrafica('g-gdp', 'line', gk.map(fmtMonth), [{ label: 'GDP promedio (g/día)', data: gk.map(k => Math.round(avg(gm[k]))), borderColor: COLORES.bosque, backgroundColor: 'rgba(109,143,47,.16)', fill: true, tension: .3, pointRadius: 3 }], { plugins: { legend: { display: false } } });

  // ---------- Listas ----------
  const fila = (izq, sub, der, subDer, tono) => `<div class="list-row"><div class="grow">${izq}${sub ? `<span class="sub">${sub}</span>` : ''}</div><div class="when ${tono || ''}">${der}${subDer ? `<small>${subDer}</small>` : ''}</div></div>`;

  const ep = D.empadres.filter(vigente).sort((a, b) => a.fecha_parto_estimada.localeCompare(b.fecha_parto_estimada)).slice(0, 7);
  document.getElementById('l-partos').innerHTML = ep.length ? ep.map(e => { const d = diasParto(e); return fila(animalHtml(e.id_hembra), `${lbl('empadre', e.estado)}${e.id_macho ? ' · macho ' + (animal(e.id_macho)?.identificador || '') : ''}`, esc(fmtDate(e.fecha_parto_estimada)), cuandoTexto(d), d < 0 ? 'neg' : d <= 15 ? 'warn' : ''); }).join('') : '<div class="list-empty">No hay hembras en gestación.</div>';

  const grupos = {};
  D.salud.filter(s => proximaPendiente(s) && daysUntil(s.proxima_fecha) <= 30).forEach(s => {
    const k = [s.tipo, tratamientoDe(s) || '', s.proxima_fecha].join('|');
    (grupos[k] = grupos[k] || { fecha: s.proxima_fecha, titulo: `${lbl('salud', s.tipo)}${tratamientoDe(s) ? ' · ' + tratamientoDe(s) : ''}`, animales: [], origen: 'Salud' }).animales.push(s.id_animal);
  });
  const pend = Object.values(grupos);
  D.manejo.filter(x => x.estado === 'programado').forEach(x => pend.push({ fecha: x.fecha, titulo: lbl('manejo', x.tipo), animales: x.id_animal ? [x.id_animal] : [], lote: x.lote, origen: 'Manejo' }));
  pend.sort((a, b) => a.fecha.localeCompare(b.fecha));
  document.getElementById('l-pend').innerHTML = pend.length ? pend.slice(0, 8).map(p => {
    const d = daysUntil(p.fecha);
    const quien = p.animales.length === 1 ? animalTexto(p.animales[0]) : p.animales.length > 1 ? `${p.animales.length} animales` : (p.lote ? 'Lote ' + p.lote : 'Todo el hato');
    return fila(esc(p.titulo), `${esc(p.origen)} · ${esc(quien)}`, esc(fmtDate(p.fecha)), cuandoTexto(d), d < 0 ? 'neg' : d <= 7 ? 'warn' : '');
  }).join('') : '<div class="list-empty">No hay actividades pendientes.</div>';

  const aten = [];
  abiertos.forEach(s => aten.push({ id: s.id_animal, sub: s.diagnostico || lbl('salud', s.tipo), der: 'Caso abierto', subDer: fmtDate(s.fecha), tono: 'warn', orden: 0 }));
  D.salud.filter(s => retiroActivo(s, 'leche')).forEach(s => aten.push({ id: s.id_animal, sub: tratamientoDe(s) || lbl('salud', s.tipo), der: 'Sin leche hasta ' + fmtDate(s.fin_retiro_leche), subDer: cuandoTexto(daysUntil(s.fin_retiro_leche)), tono: 'neg', orden: 1 }));
  D.salud.filter(s => retiroActivo(s, 'carne')).forEach(s => aten.push({ id: s.id_animal, sub: tratamientoDe(s) || lbl('salud', s.tipo), der: 'Sin carne hasta ' + fmtDate(s.fin_retiro_carne), subDer: cuandoTexto(daysUntil(s.fin_retiro_carne)), tono: 'neg', orden: 2 }));
  aten.sort((a, b) => a.orden - b.orden);
  document.getElementById('l-salud').innerHTML = aten.length ? aten.slice(0, 8).map(a => fila(animalHtml(a.id), esc(a.sub), esc(a.der), esc(a.subDer), a.tono)).join('') : '<div class="list-empty">Sin casos abiertos ni retiros vigentes.</div>';
}
