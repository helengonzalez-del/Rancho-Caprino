// utils.js — Funciones compartidas: formato, fechas, etiquetas, avisos

// ---------- Texto y HTML ----------
function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function norm(s) {
  return String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
function debounce(fn, ms = 150) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
function icon(name, cls = '') {
  return `<svg class="icon ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
}

// ---------- Fechas ----------
function pad(n) { return String(n).padStart(2, '0'); }
function isoDate(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function hoy() { return isoDate(new Date()); }
function parseDate(s) { return s ? new Date(s + 'T12:00:00') : null; }
function addDays(s, n) { const d = parseDate(s) || new Date(); d.setDate(d.getDate() + n); return isoDate(d); }
function diffDays(a, b) { return Math.round((parseDate(a) - parseDate(b)) / 86400000); } // a - b
function daysUntil(s) { return s ? diffDays(s, hoy()) : null; }
function fmtDate(s) {
  if (!s) return '—';
  return parseDate(s).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/\./g, '');
}
function fmtMonth(ym) {
  const d = new Date(ym + '-15T12:00:00');
  return d.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' }).replace(/\./g, '');
}
function edadTexto(fecha) {
  if (!fecha) return '—';
  const dias = diffDays(hoy(), fecha);
  if (dias < 0) return '—';
  if (dias < 60) return `${dias} día${dias === 1 ? '' : 's'}`;
  const meses = Math.floor(dias / 30.4375);
  if (meses < 24) return `${meses} meses`;
  const a = Math.floor(meses / 12), m = meses % 12;
  return `${a} año${a > 1 ? 's' : ''}${m ? ' ' + m + ' m' : ''}`;
}
function cuandoTexto(dias) {
  if (dias == null) return '';
  if (dias === 0) return 'hoy';
  if (dias === 1) return 'mañana';
  if (dias === -1) return 'ayer';
  return dias > 0 ? `en ${dias} días` : `hace ${-dias} días`;
}

// ---------- Números ----------
const _num = {};
function fmtNum(n, dec = 1) {
  if (n == null || isNaN(n)) return '—';
  const k = 'd' + dec;
  _num[k] = _num[k] || new Intl.NumberFormat('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: dec });
  return _num[k].format(n);
}
const _money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
function fmtMoney(n) { return n == null || isNaN(n) ? '—' : _money.format(n); }
function sum(arr, f) { return arr.reduce((s, x) => s + (Number(f ? f(x) : x) || 0), 0); }
function avg(arr, f) { const v = arr.map(x => f ? f(x) : x).filter(x => x != null && !isNaN(x)); return v.length ? sum(v) / v.length : null; }
function num(v) { return v === '' || v == null ? null : Number(v); }

// ---------- Etiquetas de catálogos ----------
const L = {
  sexo: { hembra: 'Hembra', macho: 'Macho' },
  estado: { activo: 'Activo', vendido: 'Vendido', muerto: 'Muerto', descartado: 'Descartado' },
  estado_productivo: { cria: 'Cría', destetado: 'Destetado', reemplazo: 'Reemplazo', engorda: 'Engorda', servicio: 'En servicio', gestante: 'Gestante', lactando: 'Lactando', seca: 'Seca', semental: 'Semental' },
  proposito: { leche: 'Leche', carne: 'Carne', doble: 'Doble propósito', pie_de_cria: 'Pie de cría' },
  origen: { nacido_en_rancho: 'Nacido en el rancho', comprado: 'Comprado' },
  empadre: { servida: 'Servida', gestante: 'Gestante', pario: 'Parió', aborto: 'Aborto', vacia: 'Vacía' },
  monta: { monta_natural: 'Monta natural', inseminacion: 'Inseminación' },
  parto: { sencillo: 'Sencillo', doble: 'Doble', triple: 'Triple', multiple: 'Múltiple' },
  dificultad: { normal: 'Normal', asistido: 'Asistido', distocia: 'Distocia' },
  pesaje: { nacimiento: 'Nacimiento', rutina: 'Rutina', destete: 'Destete', engorda: 'Engorda', venta: 'Venta' },
  turno: { manana: 'Mañana', tarde: 'Tarde', unico: 'Único' },
  destino: { venta: 'Venta', consumo: 'Consumo', crias: 'Crías', desecho: 'Desecho' },
  salud: { vacuna: 'Vacuna', desparasitacion: 'Desparasitación', tratamiento: 'Tratamiento', enfermedad: 'Enfermedad', prueba: 'Prueba', revision: 'Revisión' },
  via: { oral: 'Oral', intramuscular: 'Intramuscular', subcutanea: 'Subcutánea', intravenosa: 'Intravenosa', topica: 'Tópica', intramamaria: 'Intramamaria' },
  gravedad: { leve: 'Leve', moderada: 'Moderada', grave: 'Grave' },
  caso: { abierto: 'Abierto', cerrado: 'Cerrado' },
  manejo: { identificacion: 'Identificación', descorne: 'Descorne', destete: 'Destete', castracion: 'Castración', recorte_pezunas: 'Recorte de pezuñas', secado: 'Secado', cambio_lote: 'Cambio de lote', alimentacion: 'Alimentación', seleccion: 'Selección y descarte', limpieza: 'Limpieza de corrales', otro: 'Otro' },
  manejo_estado: { programado: 'Programado', realizado: 'Realizado', vencido: 'Vencido' },
  venta: { carne: 'Carne', pie_cria: 'Pie de cría', leche: 'Leche', otro: 'Otro' },
};
function opts(catalogo) { return Object.entries(L[catalogo]); }
function lbl(cat, v) { return v ? (L[cat][v] || v) : '—'; }

// ---------- Insignias ----------
const TONO = {
  estado: { activo: 'ok', vendido: 'info', muerto: 'peligro', descartado: 'aviso' },
  estado_productivo: { cria: 'info', destetado: 'info', reemplazo: 'info', engorda: 'aviso', servicio: 'aviso', gestante: 'aviso', lactando: 'ok', seca: '', semental: 'info' },
  empadre: { servida: 'aviso', gestante: 'aviso', pario: 'ok', aborto: 'peligro', vacia: '' },
  dificultad: { normal: 'ok', asistido: 'aviso', distocia: 'peligro' },
  salud: { vacuna: 'ok', desparasitacion: 'info', tratamiento: 'aviso', enfermedad: 'peligro', prueba: 'info', revision: '' },
  gravedad: { leve: 'ok', moderada: 'aviso', grave: 'peligro' },
  caso: { abierto: 'aviso', cerrado: 'ok' },
  manejo_estado: { programado: 'info', realizado: 'ok', vencido: 'peligro' },
  destino: { venta: 'ok', consumo: 'info', crias: 'info', desecho: 'peligro' },
  venta: { carne: 'aviso', pie_cria: 'ok', leche: 'info', otro: '' },
  pesaje: { nacimiento: 'info', rutina: '', destete: 'aviso', engorda: 'aviso', venta: 'ok' },
  parto: { sencillo: '', doble: 'info', triple: 'aviso', multiple: 'peligro' },
};
function badge(cat, v, texto) {
  if (!v) return '<span class="muted">—</span>';
  return `<span class="badge ${(TONO[cat] || {})[v] || ''}">${esc(texto || L[cat]?.[v] || v)}</span>`;
}
function tag(texto, tono = '') { return `<span class="badge ${tono}">${esc(texto)}</span>`; }

// ---------- Avisos ----------
function showToast(msg, type = 'ok') {
  let stack = document.getElementById('toast-stack');
  if (!stack) { stack = document.createElement('div'); stack.id = 'toast-stack'; stack.className = 'toast-stack'; stack.setAttribute('role', 'status'); stack.setAttribute('aria-live', 'polite'); document.body.appendChild(stack); }
  const t = document.createElement('div');
  t.className = 'toast ' + (type === 'error' ? 'error' : '');
  t.textContent = msg;
  stack.appendChild(t);
  setTimeout(() => t.remove(), type === 'error' ? 6000 : 3200);
}

// Traduce errores técnicos de la base de datos a mensajes comprensibles
function errMsg(e) {
  const m = (e && (e.message || e.details)) || String(e || 'Error desconocido');
  if (/animales_identificador_uk/.test(m)) return 'Ya existe un animal con ese número de arete.';
  if (/pesajes_uno_por_dia/.test(m)) return 'Ese animal ya tiene un pesaje registrado en esa fecha.';
  if (/leche_un_registro_por_turno/.test(m)) return 'Ya hay un registro de leche de esa cabra en esa fecha y turno.';
  if (/venta_animales_animal_idx|venta_animales_animal_id_fkey|violates foreign key.*venta_animales/.test(m)) return 'No se puede eliminar: el animal tiene ventas registradas. Cámbialo a estado "Descartado" si ya no lo quieres ver.';
  if (/partos_con_crias/.test(m)) return 'El parto debe tener al menos una cría (viva o muerta).';
  if (/permission denied|row-level security/.test(m)) return 'No tienes permiso para esta operación. Revisa que hayas iniciado sesión.';
  if (/Failed to fetch|NetworkError/.test(m)) return 'Sin conexión con el servidor. Revisa tu internet.';
  return m;
}

// ---------- CSV ----------
function descargarCsv(nombre, filas) {
  const csv = filas.map(f => f.map(c => {
    const s = String(c ?? '');
    return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(',')).join('\r\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${nombre}_${hoy()}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
