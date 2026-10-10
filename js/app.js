// app.js — Navegación, vistas y arranque de la aplicación

const NAV = [
  { grupo: null, items: [{ key: 'dashboard', label: 'Dashboard', icono: 'dashboard' }] },
  { grupo: 'Hato', items: [{ key: 'animales', label: 'Animales', icono: 'tag' }, { key: 'empadre', label: 'Empadre', icono: 'heart' }, { key: 'partos', label: 'Partos', icono: 'sprout' }] },
  { grupo: 'Producción', items: [{ key: 'produccion', label: 'Producción', icono: 'scale' }, { key: 'leche', label: 'Leche', icono: 'droplet' }] },
  { grupo: 'Sanidad y manejo', items: [{ key: 'salud', label: 'Salud', icono: 'health' }, { key: 'manejo', label: 'Manejo', icono: 'clipboard' }] },
  { grupo: 'Comercial', items: [{ key: 'ventas', label: 'Ventas', icono: 'receipt' }] },
];
const TITULOS = { dashboard: 'Dashboard' };
let vistaActiva = 'dashboard';

function construirNav() {
  document.getElementById('nav').innerHTML = NAV.map(g => `
    <div class="nav-group">${g.grupo ? `<div class="nav-group-title">${esc(g.grupo)}</div>` : ''}
      ${g.items.map(i => `<a class="nav-item" href="#/${i.key}" data-nav="${i.key}">${icon(i.icono)}<span>${esc(i.label)}</span><span class="nav-count" data-cuenta="${i.key}" hidden></span></a>`).join('')}
    </div>`).join('');
  NAV.forEach(g => g.items.forEach(i => { TITULOS[i.key] = i.label; }));
}

function mostrarVista(key) {
  if (!TITULOS[key]) key = 'dashboard';
  vistaActiva = key;
  document.querySelectorAll('.view').forEach(v => { v.hidden = v.id !== 'view-' + key; });
  document.querySelectorAll('[data-nav]').forEach(a => { if (a.dataset.nav === key) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  document.getElementById('crumb').textContent = TITULOS[key];
  document.title = `${TITULOS[key]} · Rancho Caprino`;
  cerrarMenu();
  renderVistaActiva();
  window.scrollTo(0, 0);
}

function renderVistaActiva() {
  if (vistaActiva === 'dashboard') renderDashboard(); else renderSeccion(vistaActiva);
}

function actualizarContadores() {
  const n = {
    empadre: store.empadres.filter(e => vigente(e) && diasParto(e) != null && diasParto(e) <= 7).length,
    salud: store.salud.filter(s => s.estado === 'abierto').length,
    manejo: store.manejo.filter(x => estadoManejo(x) === 'vencido').length,
  };
  Object.entries(n).forEach(([k, v]) => {
    const el = document.querySelector(`[data-cuenta="${k}"]`); if (!el) return;
    el.hidden = !v; el.textContent = v; el.classList.add('alerta');
    el.title = k === 'empadre' ? 'Partos esperados en 7 días o menos' : k === 'salud' ? 'Casos de salud abiertos' : 'Actividades vencidas';
  });
}

function abrirMenu() { document.getElementById('sidebar').classList.add('open'); document.getElementById('scrim').classList.add('open'); }
function cerrarMenu() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('scrim').classList.remove('open'); }

let vistasListas = false;

async function iniciarApp() {
  const cargando = document.getElementById('cargando'), error = document.getElementById('error-carga');
  error.hidden = true; cargando.hidden = false;
  try {
    await cargarTodo();
  } catch (e) {
    cargando.hidden = true; error.hidden = false;
    error.innerHTML = `<div class="empty-title">No se pudieron cargar los datos</div><p>${esc(errMsg(e))}</p><p class="muted">Verifica que ejecutaste database/schema.sql en tu proyecto de Supabase y que js/config.js tiene la URL y la clave correctas.</p><button class="btn btn-primary" id="reintentar">Reintentar</button>`;
    document.getElementById('reintentar').onclick = () => { appIniciada = false; iniciarApp(); };
    return;
  }
  cargando.hidden = true;
  if (!vistasListas) { vistasListas = true; iniciarSecciones(); iniciarDashboard(); }
  mostrarVista((location.hash.match(/^#\/(\w+)/) || [])[1] || 'dashboard');
  iniciarTiempoReal();
}

alCambiarDatos(() => { if (!vistasListas) return; actualizarContadores(); renderVistaActiva(); });

// ---------- Eventos globales ----------
construirNav();
document.getElementById('menu-toggle').addEventListener('click', abrirMenu);
document.getElementById('scrim').addEventListener('click', cerrarMenu);
window.addEventListener('hashchange', () => { if (appIniciada && vistasListas) mostrarVista((location.hash.match(/^#\/(\w+)/) || [])[1] || 'dashboard'); });
document.addEventListener('click', e => { const f = e.target.closest('[data-ficha]'); if (f) abrirFicha(f.dataset.ficha); });

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
iniciarAuth();
