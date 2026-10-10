// ui.js — Ventanas modales, confirmaciones, formularios y captura rápida

let _modalSeq = 0;

function crearModal({ titulo, sub = '', tam = '', cuerpo = '', pie = '', esForm = false }) {
  const id = ++_modalSeq;
  const layer = document.createElement('div');
  layer.className = 'modal-layer';
  const tagName = esForm ? 'form' : 'div';
  layer.innerHTML = `
    <${tagName} class="modal ${tam}" role="dialog" aria-modal="true" aria-labelledby="mt-${id}" ${esForm ? 'novalidate' : ''}>
      <div class="modal-head">
        <div><h2 class="modal-title" id="mt-${id}">${esc(titulo)}</h2>${sub ? `<p class="modal-sub">${esc(sub)}</p>` : ''}</div>
        <button type="button" class="icon-btn" data-cerrar aria-label="Cerrar">${icon('close')}</button>
      </div>
      <div class="modal-body">${cuerpo}</div>
      <div class="modal-foot">${pie}</div>
    </${tagName}>`;
  const raiz = document.getElementById('modal-root');
  raiz.appendChild(layer);
  const previo = document.activeElement;
  const m = { el: layer, caja: layer.firstElementChild, cerrar() {
    document.removeEventListener('keydown', onKey);
    layer.remove();
    if (previo && previo.focus) previo.focus();
    m.alCerrar && m.alCerrar();
  } };
  const onKey = e => { if (e.key === 'Escape' && raiz.lastElementChild === layer) m.cerrar(); };
  document.addEventListener('keydown', onKey);
  layer.querySelectorAll('[data-cerrar]').forEach(b => b.addEventListener('click', () => m.cerrar()));
  setTimeout(() => (layer.querySelector('input:not([type=hidden]):not([type=checkbox]), select, textarea, button.btn-primary') || layer.querySelector('button'))?.focus(), 30);
  return m;
}

function confirmar({ titulo, mensaje, etiqueta = 'Confirmar', peligro = false }) {
  return new Promise(res => {
    const m = crearModal({
      titulo, tam: 'narrow', cuerpo: `<p style="padding-bottom:14px">${esc(mensaje)}</p>`,
      pie: `<button type="button" class="btn" data-no>Cancelar</button><button type="button" class="btn ${peligro ? 'btn-danger' : 'btn-primary'}" data-si>${esc(etiqueta)}</button>`,
    });
    let hecho = false;
    const fin = v => { if (!hecho) { hecho = true; res(v); } };
    m.alCerrar = () => fin(false);
    m.el.querySelector('[data-no]').onclick = () => m.cerrar();
    m.el.querySelector('[data-si]').onclick = () => { fin(true); m.cerrar(); };
    m.el.querySelector('[data-no]').focus();
  });
}

// ============ FORMULARIOS ============
// campos: [{ name, label, tipo, requerido, opciones, placeholder, ayuda, full, mostrarSi(vals), ... }]
// tipos: text, number, date, select, textarea, check, animales, crias, info, section
function abrirFormulario({ titulo, sub, campos, valores = {}, etiqueta = 'Guardar', tam = '', alCambiar, validar, alGuardar }) {
  const m = crearModal({
    titulo, sub, tam, esForm: true,
    cuerpo: `<div class="form-error" data-error hidden></div><div class="form-grid">${campos.map(c => htmlCampo(c)).join('')}</div>`,
    pie: `<button type="button" class="btn" data-cerrar>Cancelar</button><button type="submit" class="btn btn-primary">${esc(etiqueta)}</button>`,
  });
  const form = m.caja;
  const cont = n => form.querySelector(`[data-campo="${n}"]`);

  // Valores iniciales
  campos.forEach(c => poner(c, valores[c.name]));

  function poner(c, v) {
    const el = cont(c.name); if (!el) return;
    if (c.tipo === 'check') el.querySelector('input').checked = !!v;
    else if (c.tipo === 'animales') {
      const sel = new Set(v || []);
      el.querySelectorAll('.picker-item input').forEach(i => { i.checked = sel.has(i.value); });
      contarPicker(el);
    } else if (c.tipo === 'crias') { el.querySelector('.crias-list').innerHTML = ''; (v || []).forEach(f => agregarCria(el, f)); }
    else if (['info', 'section'].includes(c.tipo)) return;
    else { const i = el.querySelector('input,select,textarea'); if (i) i.value = v ?? ''; }
  }

  function crudo() {
    const v = {};
    for (const c of campos) {
      if (['info', 'section'].includes(c.tipo)) continue;
      const el = cont(c.name);
      if (c.tipo === 'check') v[c.name] = el.querySelector('input').checked;
      else if (c.tipo === 'animales') v[c.name] = [...el.querySelectorAll('.picker-item input:checked')].map(i => i.value);
      else if (c.tipo === 'crias') v[c.name] = [...el.querySelectorAll('.cria-row')].map(r => ({
        identificador: r.querySelector('[data-k=identificador]').value.trim(), nombre: r.querySelector('[data-k=nombre]').value.trim(),
        sexo: r.querySelector('[data-k=sexo]').value, peso: r.querySelector('[data-k=peso]').value }));
      else {
        const raw = el.querySelector('input,select,textarea').value;
        v[c.name] = c.tipo === 'number' ? (raw === '' ? null : Number(raw)) : (raw.trim() === '' ? null : (c.tipo === 'textarea' || c.tipo === 'text' ? raw.trim() : raw));
      }
    }
    return v;
  }
  function visibles() {
    const v = crudo();
    campos.forEach(c => { if (c.mostrarSi) { const el = cont(c.name); if (el) el.hidden = !c.mostrarSi(v); } });
    const out = {};
    campos.forEach(c => { if (['info', 'section'].includes(c.tipo)) return; const el = cont(c.name); if (!el.hidden) out[c.name] = v[c.name]; });
    campos.filter(c => c.tipo === 'info').forEach(c => {
      const el = cont(c.name); const r = c.calcular ? c.calcular(out) : '';
      el.hidden = el.hidden || !r;
      const txt = r && r.texto !== undefined ? r.texto : r;
      el.textContent = txt || ''; el.classList.toggle('aviso', !!(r && r.aviso));
    });
    return out;
  }
  const api = { valores: visibles, poner: (n, v) => { const c = campos.find(x => x.name === n); if (c) { poner(c, v); refrescar(); } } };
  function refrescar() { const v = visibles(); alCambiar && alCambiar(v, api); }
  form.addEventListener('input', refrescar);
  form.addEventListener('change', refrescar);

  // Listas de animales
  form.querySelectorAll('.picker').forEach(p => {
    const q = p.querySelector('[data-pq]');
    q.addEventListener('input', () => { const t = norm(q.value); p.querySelectorAll('.picker-item').forEach(i => { i.hidden = !!t && !i.dataset.texto.includes(t); }); contarPicker(p.parentElement); });
    p.querySelector('[data-todos]').onclick = () => { p.querySelectorAll('.picker-item:not([hidden]) input').forEach(i => i.checked = true); contarPicker(p.parentElement); form.dispatchEvent(new Event('change')); };
    p.querySelector('[data-ninguno]').onclick = () => { p.querySelectorAll('.picker-item input').forEach(i => i.checked = false); contarPicker(p.parentElement); form.dispatchEvent(new Event('change')); };
    p.addEventListener('change', e => { e.stopPropagation(); contarPicker(p.parentElement); form.dispatchEvent(new Event('change')); });
  });
  // Repetidor de crías
  form.querySelectorAll('[data-campo]').forEach(el => {
    const c = campos.find(x => x.name === el.dataset.campo);
    if (!c || c.tipo !== 'crias') return;
    el.querySelector('[data-add]').onclick = () => { agregarCria(el, {}); refrescar(); };
    el.querySelector('[data-preparar]').onclick = () => {
      const { machos = 0, hembras = 0 } = c.contar ? c.contar(visibles()) : {};
      el.querySelector('.crias-list').innerHTML = '';
      for (let i = 0; i < machos; i++) agregarCria(el, { sexo: 'macho' });
      for (let i = 0; i < hembras; i++) agregarCria(el, { sexo: 'hembra' });
      refrescar();
    };
    el.addEventListener('click', e => { const b = e.target.closest('[data-quitar]'); if (b) { b.closest('.cria-row').remove(); refrescar(); } });
  });

  function mostrarError(msg) { const e = form.querySelector('[data-error]'); e.textContent = msg; e.hidden = !msg; if (msg) e.scrollIntoView({ block: 'nearest' }); }
  function marcar(errs) {
    form.querySelectorAll('.field.invalid').forEach(f => { f.classList.remove('invalid'); f.querySelector('.error')?.remove(); });
    let primero = null;
    Object.entries(errs).forEach(([n, msg]) => {
      if (n === '_form') { mostrarError(msg); return; }
      const el = cont(n); if (!el) { mostrarError(msg); return; }
      el.classList.add('invalid');
      el.insertAdjacentHTML('beforeend', `<div class="error">${esc(msg)}</div>`);
      primero = primero || el;
    });
    if (primero) { primero.scrollIntoView({ block: 'center' }); primero.querySelector('input,select,textarea')?.focus(); }
  }

  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    mostrarError(''); marcar({});
    const vals = visibles();
    let errs = {};
    for (const c of campos) {
      if (!(c.name in vals)) continue;
      const v = vals[c.name];
      const vacio = v == null || v === '' || (Array.isArray(v) && !v.length);
      if (c.requerido && vacio) errs[c.name] = c.tipo === 'animales' ? 'Selecciona al menos un animal.' : 'Este campo es obligatorio.';
      else if (c.tipo === 'number' && v != null) {
        if (isNaN(v)) errs[c.name] = 'Escribe un número válido.';
        else if (c.min != null && v < c.min) errs[c.name] = `Debe ser ${c.min} o más.`;
        else if (c.max != null && v > c.max) errs[c.name] = `Debe ser ${c.max} o menos.`;
      }
    }
    if (!Object.keys(errs).length && validar) { const r = await validar(vals); if (r) errs = typeof r === 'string' ? { _form: r } : r; }
    if (Object.keys(errs).length) { marcar(errs); return; }
    const btn = form.querySelector('[type=submit]'), txt = btn.textContent;
    btn.disabled = true; btn.textContent = 'Guardando…';
    try {
      const ok = await alGuardar(vals);
      if (ok !== false) m.cerrar();
    } catch (e) { mostrarError(errMsg(e)); }
    finally { btn.disabled = false; btn.textContent = txt; }
  });

  refrescar();
  return m;
}

function htmlCampo(c) {
  const id = 'f-' + c.name + '-' + _modalSeq;
  const req = c.requerido ? '<span class="req" aria-hidden="true">*</span>' : '';
  const ayuda = c.ayuda ? `<div class="hint">${esc(c.ayuda)}</div>` : '';
  const full = (c.full || ['textarea', 'animales', 'crias'].includes(c.tipo)) ? 'full' : '';
  if (c.tipo === 'section') return `<div class="form-section" data-campo="${c.name}">${esc(c.label)}</div>`;
  if (c.tipo === 'info') return `<div class="info-line" data-campo="${c.name}" hidden></div>`;
  let ctl = '';
  const ph = c.placeholder ? `placeholder="${esc(c.placeholder)}"` : '';
  if (c.tipo === 'select') {
    const o = typeof c.opciones === 'function' ? c.opciones() : c.opciones;
    ctl = `<select id="${id}">${c.sinVacio ? '' : `<option value="">${esc(c.vacio || 'Seleccionar…')}</option>`}${o.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('')}</select>`;
  } else if (c.tipo === 'textarea') ctl = `<textarea id="${id}" rows="${c.filas || 2}" ${ph}></textarea>`;
  else if (c.tipo === 'check') return `<div class="field ${full}" data-campo="${c.name}"><label class="check"><input type="checkbox" id="${id}"> ${esc(c.label)}</label>${ayuda}</div>`;
  else if (c.tipo === 'animales') {
    const lista = typeof c.opciones === 'function' ? c.opciones() : c.opciones;
    ctl = `<div class="picker"><div class="picker-tools"><input type="search" data-pq placeholder="Buscar por arete, nombre o lote" aria-label="Buscar animal"><button type="button" class="btn btn-sm" data-todos>Seleccionar visibles</button><button type="button" class="btn btn-sm btn-ghost" data-ninguno>Ninguno</button></div>
      <div class="picker-list">${lista.length ? lista.map(o => `<label class="picker-item" data-texto="${esc(o.texto)}"><input type="checkbox" value="${o.id}">${o.html}<span class="meta">${esc(o.meta)}</span></label>`).join('') : '<div class="list-empty">No hay animales disponibles.</div>'}</div>
      <div class="picker-foot" data-cuenta></div></div>`;
  } else if (c.tipo === 'crias') {
    ctl = `<div class="crias-list"></div><div class="crias-actions"><button type="button" class="btn btn-sm" data-add>${icon('plus', 'icon-sm')} Agregar cría</button>${c.contar ? '<button type="button" class="btn btn-sm btn-ghost" data-preparar>Preparar según machos y hembras</button>' : ''}</div>`;
  } else {
    const t = c.tipo === 'number' ? 'number' : c.tipo === 'date' ? 'date' : 'text';
    const extra = c.tipo === 'number' ? `step="${c.paso || 'any'}" ${c.min != null ? `min="${c.min}"` : ''} ${c.max != null ? `max="${c.max}"` : ''} inputmode="decimal"` : '';
    const lista = c.lista ? `list="dl-${c.name}-${_modalSeq}"` : '';
    ctl = `<input type="${t}" id="${id}" ${extra} ${ph} ${lista} autocomplete="off">` +
      (c.lista ? `<datalist id="dl-${c.name}-${_modalSeq}">${c.lista().map(x => `<option value="${esc(x)}">`).join('')}</datalist>` : '');
  }
  const lab = (c.tipo === 'animales' || c.tipo === 'crias') ? `<span class="field-label">${esc(c.label)}${req}</span>` : `<label for="${id}">${esc(c.label)}${req}</label>`;
  return `<div class="field ${full}" data-campo="${c.name}">${lab}${ctl}${ayuda}</div>`;
}

function contarPicker(el) {
  const n = el.querySelectorAll('.picker-item input:checked').length;
  const v = el.querySelectorAll('.picker-item:not([hidden])').length;
  const c = el.querySelector('[data-cuenta]');
  if (c) c.textContent = `${n} seleccionado${n === 1 ? '' : 's'} · ${v} visible${v === 1 ? '' : 's'}`;
}

function agregarCria(el, f = {}) {
  const row = document.createElement('div');
  row.className = 'cria-row';
  row.innerHTML = `
    <div><label>Arete *</label><input type="text" data-k="identificador" value="${esc(f.identificador || '')}" placeholder="Ej: K-107"></div>
    <div><label>Nombre</label><input type="text" data-k="nombre" value="${esc(f.nombre || '')}"></div>
    <div><label>Sexo</label><select data-k="sexo"><option value="hembra" ${f.sexo === 'hembra' ? 'selected' : ''}>Hembra</option><option value="macho" ${f.sexo === 'macho' ? 'selected' : ''}>Macho</option></select></div>
    <div><label>Peso al nacer (kg)</label><input type="number" step="0.01" min="0" data-k="peso" value="${esc(f.peso || '')}"></div>
    <button type="button" class="icon-btn peligro" data-quitar aria-label="Quitar cría">${icon('trash', 'icon-sm')}</button>`;
  el.querySelector('.crias-list').appendChild(row);
}

// ============ CAPTURA RÁPIDA (una fila por animal) ============
// Sirve para registrar ordeños o pesajes de varios animales a la vez.
function abrirCaptura({ titulo, sub, campos, animales, columna, nota, alGuardar }) {
  const m = crearModal({
    titulo, sub, tam: 'wide', esForm: true,
    cuerpo: `<div class="form-error" data-error hidden></div>
      <div class="grid-tools">
        ${campos.map(c => `<div class="field" data-g="${c.name}"><label>${esc(c.label)}</label>${c.tipo === 'select'
          ? `<select>${c.opciones.map(([v, l]) => `<option value="${esc(v)}" ${v === c.valor ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`
          : `<input type="${c.tipo}" value="${esc(c.valor || '')}">`}</div>`).join('')}
        <div class="field"><label>Lote</label><select data-lote><option value="">Todos los lotes</option>${[...new Set(animales.map(a => a.lote).filter(Boolean))].sort().map(l => `<option>${esc(l)}</option>`).join('')}</select></div>
      </div>
      <div class="grid-wrap"><table class="grid-capture"><thead><tr><th>Animal</th><th>Lote</th><th>${esc(columna.nota || 'Referencia')}</th><th class="num">${esc(columna.label)}</th></tr></thead>
      <tbody>${animales.map(a => `<tr data-id="${a.id}" data-lote="${esc(a.lote || '')}"><td>${areteHtml(a)}${a.nombre ? `<span class="nombre">${esc(a.nombre)}</span>` : ''}</td><td class="muted">${esc(a.lote || '—')}</td><td class="muted" data-ref></td>
        <td class="num"><input type="number" step="${columna.paso || 'any'}" min="0" inputmode="decimal" aria-label="${esc(columna.label)} de ${esc(a.identificador)}" placeholder="${esc(columna.placeholder ? columna.placeholder(a) : '')}"></td></tr>`).join('')}</tbody></table></div>
      ${nota ? `<p class="hint" style="margin:10px 0 4px;color:var(--texto-3);font-size:12.5px">${esc(nota)}</p>` : ''}`,
    pie: `<span class="spacer" data-cuenta></span><button type="button" class="btn" data-cerrar>Cancelar</button><button type="submit" class="btn btn-primary">Guardar registros</button>`,
  });
  const form = m.caja;
  const globales = () => Object.fromEntries(campos.map(c => [c.name, form.querySelector(`[data-g="${c.name}"] ${c.tipo === 'select' ? 'select' : 'input'}`).value]));
  const filas = () => [...form.querySelectorAll('tbody tr')];
  const refrescar = () => {
    const g = globales();
    filas().forEach(tr => { tr.querySelector('[data-ref]').innerHTML = columna.referencia ? columna.referencia(animal(tr.dataset.id), g) : ''; });
    form.querySelector('[data-cuenta]').textContent = `${filas().filter(tr => tr.querySelector('input').value !== '').length} con dato`;
  };
  form.querySelector('[data-lote]').addEventListener('change', e => filas().forEach(tr => { tr.hidden = !!e.target.value && tr.dataset.lote !== e.target.value; }));
  form.addEventListener('input', refrescar); form.addEventListener('change', refrescar);
  refrescar();
  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    const err = form.querySelector('[data-error]'); err.hidden = true;
    const datos = filas().filter(tr => tr.querySelector('input').value !== '').map(tr => ({ animal: animal(tr.dataset.id), valor: Number(tr.querySelector('input').value) }));
    const g = globales();
    if (!g[campos[0].name]) { err.textContent = `Indica: ${campos[0].label}.`; err.hidden = false; return; }
    if (!datos.length) { err.textContent = 'Escribe al menos un valor.'; err.hidden = false; return; }
    if (datos.some(d => isNaN(d.valor) || d.valor < 0)) { err.textContent = 'Hay valores no válidos. Usa números mayores o iguales a 0.'; err.hidden = false; return; }
    const btn = form.querySelector('[type=submit]'); btn.disabled = true; btn.textContent = 'Guardando…';
    try { await alGuardar(datos, g); m.cerrar(); }
    catch (e) { err.textContent = errMsg(e); err.hidden = false; btn.disabled = false; btn.textContent = 'Guardar registros'; }
  });
  return m;
}
