// tablekit.js — Motor genérico de secciones: filtros, resumen, tabla, orden, paginación y CSV
//
// Cada sección (animales.js, leche.js, …) solo declara su configuración;
// aquí se dibuja todo de la misma manera.

const SECCIONES = {};
const estadoSec = {};

function registrarSeccion(cfg) {
  SECCIONES[cfg.key] = cfg;
  estadoSec[cfg.key] = {
    filtros: Object.assign({}, typeof cfg.defaults === 'function' ? cfg.defaults() : (cfg.defaults || {})),
    orden: cfg.orden ? { ...cfg.orden } : null,
    pagina: 1, tam: 25,
    colapsado: window.innerWidth <= 960,
    esp: null,
  };
}

// Al cambiar de sistema (caprino ↔ ovino) los filtros vuelven a sus valores iniciales.
function reiniciarSeccion(key) {
  const cfg = SECCIONES[key], st = estadoSec[key];
  // Quita el foco antes: al salir de un campo, el navegador confirma su texto y lo volvería a guardar.
  const activo = document.activeElement;
  if (activo && activo.closest && activo.closest('#filters-' + key)) activo.blur();
  st.filtros = Object.assign({}, typeof cfg.defaults === 'function' ? cfg.defaults() : (cfg.defaults || {}));
  st.pagina = 1; st.esp = esp.actual;
  const panel = document.getElementById('filters-' + key);
  if (panel) panel.innerHTML = '';
}

function htmlVista(cfg) {
  const botones = (cfg.botones || []).map((b, i) =>
    `<button type="button" class="btn ${b.primario ? 'btn-primary' : ''}" data-boton="${i}">${icon(b.icono || 'plus', 'icon-sm')}${esc(b.label)}</button>`).join('');
  return `
  <section class="view" id="view-${cfg.key}" hidden aria-labelledby="h-${cfg.key}">
    <header class="view-head">
      <div><div class="esp-tag" id="esp-${cfg.key}"></div><h1 id="h-${cfg.key}">${esc(cfg.titulo)}</h1><p class="view-sub">${esc(cfg.subtitulo || '')}</p></div>
      <div class="view-actions">${botones}</div>
    </header>
    <div class="banner" id="banner-${cfg.key}" hidden></div>
    <div class="panel filters" id="filters-${cfg.key}"></div>
    <div class="summary" id="summary-${cfg.key}"></div>
    <div id="extra-${cfg.key}">${cfg.extraHtml || ''}</div>
    <div class="panel table-panel">
      <div class="table-tools">
        <span class="table-count" id="count-${cfg.key}"></span>
        <button type="button" class="btn btn-sm" data-export>${icon('download', 'icon-sm')}Exportar CSV</button>
      </div>
      <div class="table-wrap" id="table-${cfg.key}"></div>
      <div class="table-foot" id="foot-${cfg.key}"></div>
    </div>
  </section>`;
}

// ---------- Filtros ----------
function contarFiltros(cfg) {
  const f = estadoSec[cfg.key].filtros;
  return cfg.filtros.filter(fl => {
    if (fl.tipo === 'rango') return (f[fl.id + '_min'] ?? '') !== '' || (f[fl.id + '_max'] ?? '') !== '';
    if (fl.tipo === 'fechas') return !!(f[fl.id + '_desde'] || f[fl.id + '_hasta']);
    if (fl.tipo === 'check') return !!f[fl.id];
    return !!f[fl.id];
  }).length;
}

function htmlFiltros(cfg) {
  const st = estadoSec[cfg.key], f = st.filtros;
  const n = contarFiltros(cfg);
  const campos = cfg.filtros.map(fl => {
    const id = `ff-${cfg.key}-${fl.id}`;
    if (fl.tipo === 'buscar') return `<div class="field f-search ${f[fl.id] ? 'has-value' : ''}"><label for="${id}">${esc(fl.label || 'Buscar')}</label><input type="search" id="${id}" data-f="${fl.id}" value="${esc(f[fl.id] || '')}" placeholder="${esc(fl.placeholder || '')}" autocomplete="off"></div>`;
    if (fl.tipo === 'select') {
      const o = typeof fl.opciones === 'function' ? fl.opciones() : fl.opciones;
      return `<div class="field ${f[fl.id] ? 'has-value' : ''}"><label for="${id}">${esc(fl.label)}</label><select id="${id}" data-f="${fl.id}"><option value="">${esc(fl.todos || 'Todos')}</option>${o.map(([v, l]) => `<option value="${esc(v)}" ${String(f[fl.id]) === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>`;
    }
    if (fl.tipo === 'rango') return `<div class="field f-range ${(f[fl.id + '_min'] || f[fl.id + '_max']) ? 'has-value' : ''}"><span class="field-label">${esc(fl.label)}</span><div class="f-pair"><input type="number" step="any" inputmode="decimal" data-f="${fl.id}_min" value="${esc(f[fl.id + '_min'] ?? '')}" placeholder="Mín." aria-label="${esc(fl.label)} mínimo"><input type="number" step="any" inputmode="decimal" data-f="${fl.id}_max" value="${esc(f[fl.id + '_max'] ?? '')}" placeholder="Máx." aria-label="${esc(fl.label)} máximo"></div></div>`;
    if (fl.tipo === 'fechas') return `<div class="field f-daterange ${(f[fl.id + '_desde'] || f[fl.id + '_hasta']) ? 'has-value' : ''}"><span class="field-label">${esc(fl.label || 'Fecha')}</span><div class="f-pair"><input type="date" data-f="${fl.id}_desde" value="${esc(f[fl.id + '_desde'] || '')}" aria-label="${esc(fl.label || 'Fecha')} desde"><input type="date" data-f="${fl.id}_hasta" value="${esc(f[fl.id + '_hasta'] || '')}" aria-label="${esc(fl.label || 'Fecha')} hasta"></div></div>`;
    if (fl.tipo === 'check') return `<div class="field f-check"><label class="check"><input type="checkbox" data-f="${fl.id}" ${f[fl.id] ? 'checked' : ''}> ${esc(fl.label)}</label></div>`;
    return '';
  }).join('');
  return `
    <div class="filters-head">
      <span class="filters-title">${icon('filter', 'icon-sm')}Filtros ${n ? `<span class="filters-count" aria-label="${n} filtros activos">${n}</span>` : ''}</span>
      <span class="spacer"></span>
      <button type="button" class="btn btn-sm btn-ghost" data-limpiar ${n ? '' : 'disabled'}>Limpiar filtros</button>
      <button type="button" class="btn btn-sm btn-ghost" data-colapsar aria-expanded="${!st.colapsado}">${st.colapsado ? 'Mostrar' : 'Ocultar'}</button>
    </div>
    <div class="filters-body">${campos}</div>`;
}

function aplicarFiltros(cfg, filas) {
  const f = estadoSec[cfg.key].filtros;
  const vacio = v => v === '' || v == null;
  return filas.filter(r => cfg.filtros.every(fl => {
    if (fl.tipo === 'buscar') {
      const q = norm(f[fl.id] || ''); if (!q) return true;
      const h = norm(fl.texto(r).join(' '));
      return q.split(/\s+/).every(t => h.includes(t));
    }
    if (fl.tipo === 'select') return vacio(f[fl.id]) || fl.prueba(r, f[fl.id]);
    if (fl.tipo === 'check') return !f[fl.id] || fl.prueba(r);
    if (fl.tipo === 'rango') {
      const mn = f[fl.id + '_min'], mx = f[fl.id + '_max'];
      if (vacio(mn) && vacio(mx)) return true;
      const x = fl.valor(r); if (x == null) return false;
      return (vacio(mn) || x >= Number(mn)) && (vacio(mx) || x <= Number(mx));
    }
    if (fl.tipo === 'fechas') {
      const d = f[fl.id + '_desde'], h = f[fl.id + '_hasta'];
      if (!d && !h) return true;
      const x = fl.valor(r); if (!x) return false;
      return (!d || x >= d) && (!h || x <= h);
    }
    return true;
  }));
}

// ---------- Orden ----------
function ordenar(cfg, filas) {
  const o = estadoSec[cfg.key].orden;
  if (!o) return filas;
  const col = cfg.columnas.find(c => c.key === o.key);
  if (!col) return filas;
  const val = col.orden || col.texto || (() => null);
  const dir = o.dir === 'desc' ? -1 : 1;
  return [...filas].sort((a, b) => {
    const x = val(a), y = val(b);
    if (x == null && y == null) return 0;
    if (x == null) return 1; if (y == null) return -1;
    if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir;
    return String(x).localeCompare(String(y), 'es', { numeric: true, sensitivity: 'base' }) * dir;
  });
}

// ---------- Dibujo ----------
function renderSeccion(key) {
  const cfg = SECCIONES[key]; if (!cfg) return;
  const panel = document.getElementById('filters-' + key);
  const st = estadoSec[key];
  if (st.esp !== esp.actual) reiniciarSeccion(key);
  const tag = document.getElementById('esp-' + key);
  if (tag) { tag.textContent = ESPECIES[esp.actual] || ''; tag.dataset.esp = esp.actual; }
  if (!panel.contains(document.activeElement) || !panel.innerHTML) {
    panel.innerHTML = htmlFiltros(cfg);
    panel.classList.toggle('collapsed', st.colapsado);
  }
  renderTabla(key);
}

function renderTabla(key) {
  const cfg = SECCIONES[key], st = estadoSec[key];
  const todas = cfg.filas();
  const filas = ordenar(cfg, aplicarFiltros(cfg, todas));
  const nPag = Math.max(1, Math.ceil(filas.length / st.tam));
  st.pagina = Math.min(st.pagina, nPag);
  const pagina = filas.slice((st.pagina - 1) * st.tam, st.pagina * st.tam);

  // Resumen
  document.getElementById('summary-' + key).innerHTML = (cfg.resumen ? cfg.resumen(filas, todas) : []).map(s =>
    `<div class="stat ${s.alerta ? 'alerta' : ''}"><div class="stat-label">${esc(s.label)}</div><div class="stat-value">${s.valor}${s.unidad ? `<small>${esc(s.unidad)}</small>` : ''}</div>${s.nota ? `<div class="stat-hint">${esc(s.nota)}</div>` : ''}</div>`).join('');

  // Banner
  const b = document.getElementById('banner-' + key);
  const bh = cfg.banner ? cfg.banner(filas) : '';
  b.hidden = !bh; b.className = 'banner' + (bh && bh.aviso ? ' aviso' : ''); b.innerHTML = bh ? bh.html : '';

  // Conteo
  document.getElementById('count-' + key).innerHTML = `Mostrando <strong>${fmtNum(filas.length, 0)}</strong> de ${fmtNum(todas.length, 0)} registros`;

  // Tabla
  const cont = document.getElementById('table-' + key);
  if (!filas.length) {
    const hayFiltros = contarFiltros(cfg) > 0;
    const v = todas.length === 0 ? (cfg.vacio || {}) : {};
    cont.innerHTML = `<div class="empty"><div class="empty-mark">${icon(cfg.icono || 'filter')}</div>
      <div class="empty-title">${hayFiltros && todas.length ? 'Ningún registro coincide con los filtros' : esc(v.titulo || 'Aún no hay registros')}</div>
      <p>${hayFiltros && todas.length ? 'Cambia o quita algún filtro para ver más resultados.' : esc(v.texto || '')}</p>
      ${hayFiltros && todas.length ? '<button type="button" class="btn" data-limpiar>Limpiar filtros</button>' : (cfg.botones && cfg.botones[0] ? `<button type="button" class="btn btn-primary" data-boton="0">${esc(cfg.botones[0].label)}</button>` : '')}</div>`;
  } else {
    const o = st.orden;
    const ths = cfg.columnas.map(c => {
      const ord = c.orden || c.texto;
      const aria = ord && o && o.key === c.key ? (o.dir === 'asc' ? 'ascending' : 'descending') : 'none';
      return `<th class="${c.clase === 'num' ? 'num' : ''} ${ord ? 'sortable' : ''}" ${ord ? `data-orden="${c.key}" tabindex="0"` : ''} aria-sort="${aria}">${esc(c.label)}${ord ? `<span class="sort">${o && o.key === c.key ? (o.dir === 'asc' ? '▲' : '▼') : ''}</span>` : ''}</th>`;
    }).join('');
    const trs = pagina.map(r => {
      const tds = cfg.columnas.map(c => {
        let h = c.html ? c.html(r) : esc(c.texto ? c.texto(r) : '');
        if (h == null || h === '' || h === 'null') h = '<span class="muted">—</span>';
        return `<td class="${c.clase || ''}">${h}</td>`;
      }).join('');
      const ac = (cfg.acciones ? cfg.acciones(r) : []).map(a => a.texto
        ? `<button type="button" class="btn btn-sm" data-act="${a.act}">${esc(a.label)}</button>`
        : `<button type="button" class="icon-btn ${a.peligro ? 'peligro' : ''}" data-act="${a.act}" title="${esc(a.label)}" aria-label="${esc(a.label)}">${icon(a.icono, 'icon-sm')}</button>`).join(' ');
      return `<tr data-id="${r.id}">${tds}<td class="acciones">${ac}</td></tr>`;
    }).join('');
    cont.innerHTML = `<table><thead><tr>${ths}<th><span class="sr-only">Acciones</span></th></tr></thead><tbody>${trs}</tbody></table>`;
  }

  // Pie: paginación
  const foot = document.getElementById('foot-' + key);
  if (filas.length) {
    const ini = (st.pagina - 1) * st.tam + 1, fin = Math.min(filas.length, st.pagina * st.tam);
    foot.innerHTML = `<span>${ini}–${fin} de ${fmtNum(filas.length, 0)}</span>
      <div class="pager"><label for="tam-${key}" class="muted">Filas</label>
        <select id="tam-${key}" data-tam>${[25, 50, 100].map(n => `<option ${n === st.tam ? 'selected' : ''}>${n}</option>`).join('')}</select>
        <button type="button" class="btn btn-sm" data-pg="-1" ${st.pagina <= 1 ? 'disabled' : ''} aria-label="Página anterior">${icon('chev-left', 'icon-sm')}</button>
        <span>Página ${st.pagina} de ${nPag}</span>
        <button type="button" class="btn btn-sm" data-pg="1" ${st.pagina >= nPag ? 'disabled' : ''} aria-label="Página siguiente">${icon('chev-right', 'icon-sm')}</button></div>`;
  } else foot.innerHTML = '';

  // Estado del encabezado de filtros
  const panel = document.getElementById('filters-' + key);
  const n = contarFiltros(cfg);
  const cnt = panel.querySelector('.filters-title');
  if (cnt) cnt.innerHTML = `${icon('filter', 'icon-sm')}Filtros ${n ? `<span class="filters-count" aria-label="${n} filtros activos">${n}</span>` : ''}`;
  const lim = panel.querySelector('[data-limpiar]'); if (lim) lim.disabled = !n;

  if (cfg.alRenderizar) cfg.alRenderizar(filas, todas);
}

// ---------- Exportar ----------
function exportarCsv(key) {
  const cfg = SECCIONES[key];
  const filas = ordenar(cfg, aplicarFiltros(cfg, cfg.filas()));
  const cols = cfg.columnas.filter(c => c.csv !== false);
  const plano = h => String(h ?? '').replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
  const dato = (c, r) => c.csv ? c.csv(r) : (c.texto ? c.texto(r) : plano(c.html ? c.html(r) : ''));
  descargarCsv(cfg.csv || key, [cols.map(c => c.label), ...filas.map(r => cols.map(c => dato(c, r) ?? ''))]);
  showToast(`${fmtNum(filas.length, 0)} registros exportados`);
}

// ---------- Eventos (un solo conjunto para todas las vistas) ----------
function iniciarSecciones() {
  const cont = document.getElementById('views');
  cont.innerHTML += Object.values(SECCIONES).map(htmlVista).join('');

  cont.addEventListener('click', e => {
    const vista = e.target.closest('.view'); if (!vista) return;
    const key = vista.id.replace('view-', ''), cfg = SECCIONES[key], st = estadoSec[key];
    if (!cfg) return;
    const t = e.target;
    const bt = t.closest('[data-boton]');
    if (bt) { cfg.botones[+bt.dataset.boton].accion(); return; }
    if (t.closest('[data-export]')) { exportarCsv(key); return; }
    if (t.closest('[data-limpiar]')) {
      st.filtros = {}; st.pagina = 1;
      document.getElementById('filters-' + key).innerHTML = ''; renderSeccion(key);
      if (cfg.alFiltrar) cfg.alFiltrar(st.filtros);
      return;
    }
    if (t.closest('[data-colapsar]')) {
      st.colapsado = !st.colapsado;
      const p = document.getElementById('filters-' + key); p.classList.toggle('collapsed', st.colapsado);
      const b = p.querySelector('[data-colapsar]'); b.textContent = st.colapsado ? 'Mostrar' : 'Ocultar'; b.setAttribute('aria-expanded', String(!st.colapsado));
      return;
    }
    const th = t.closest('th[data-orden]');
    if (th) { ordenarPor(key, th.dataset.orden); return; }
    const pg = t.closest('[data-pg]');
    if (pg) { st.pagina += Number(pg.dataset.pg); renderTabla(key); return; }
    const ac = t.closest('[data-act]');
    if (ac) {
      const id = ac.closest('tr').dataset.id;
      const fila = cfg.filas().find(r => String(r.id) === id);
      const fn = cfg.manejadores && cfg.manejadores[ac.dataset.act];
      if (fila && fn) fn(fila);
    }
  });

  cont.addEventListener('keydown', e => {
    const th = e.target.closest && e.target.closest('th[data-orden]');
    if (th && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); ordenarPor(th.closest('.view').id.replace('view-', ''), th.dataset.orden); }
  });

  // El estado del filtro se guarda al instante; solo el dibujo de la tabla se retrasa un poco.
  const dibujar = {};
  const alEscribir = e => {
    const el = e.target.closest('[data-f]'); if (!el) return;
    const key = el.closest('.view').id.replace('view-', ''), cfg = SECCIONES[key], st = estadoSec[key];
    st.filtros[el.dataset.f] = el.type === 'checkbox' ? el.checked : el.value;
    st.pagina = 1;
    const wrap = el.closest('.field');
    if (wrap && el.type !== 'checkbox') wrap.classList.toggle('has-value', [...wrap.querySelectorAll('[data-f]')].some(i => i.value !== ''));
    if (cfg.alFiltrar) cfg.alFiltrar(st.filtros);
    dibujar[key] = dibujar[key] || debounce(() => renderTabla(key), 100);
    dibujar[key]();
  };
  cont.addEventListener('input', alEscribir);
  cont.addEventListener('change', e => {
    if (e.target.matches('[data-tam]')) {
      const key = e.target.closest('.view').id.replace('view-', '');
      estadoSec[key].tam = Number(e.target.value); estadoSec[key].pagina = 1; renderTabla(key); return;
    }
    alEscribir(e);
  });
}

function ordenarPor(key, col) {
  const st = estadoSec[key];
  if (st.orden && st.orden.key === col) st.orden.dir = st.orden.dir === 'asc' ? 'desc' : 'asc';
  else st.orden = { key: col, dir: 'asc' };
  renderTabla(key);
}
