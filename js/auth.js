// auth.js — Inicio de sesión, registro y cierre de sesión (Supabase Auth)

let appIniciada = false;

function cambiarPestanaAuth(cual) {
  document.getElementById('form-login').hidden = cual !== 'login';
  document.getElementById('form-registro').hidden = cual !== 'registro';
  document.querySelectorAll('.auth-tab').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === cual)));
  mensajeAuth('');
}
function mensajeAuth(texto, tipo = 'error') {
  const el = document.getElementById('auth-msg');
  el.textContent = texto; el.className = 'auth-msg' + (texto ? ' show ' + tipo : '');
}

async function entrar(ev) {
  ev.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) return mensajeAuth('Escribe tu correo y tu contraseña.');
  const btn = ev.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Verificando…'; mensajeAuth('');
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  btn.disabled = false; btn.textContent = 'Entrar';
  if (error) return mensajeAuth(error.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : error.message);
  alIniciarSesion(data.user);
}

async function registrar(ev) {
  ev.preventDefault();
  const v = id => document.getElementById(id).value.trim();
  const nombre = v('reg-nombre'), email = v('reg-email'), telefono = v('reg-telefono'), rol = document.getElementById('reg-rol').value;
  const p1 = document.getElementById('reg-password').value, p2 = document.getElementById('reg-password2').value;
  if (!nombre || !email || !p1) return mensajeAuth('Nombre, correo y contraseña son obligatorios.');
  if (p1.length < 6) return mensajeAuth('La contraseña debe tener al menos 6 caracteres.');
  if (p1 !== p2) return mensajeAuth('Las contraseñas no coinciden.');
  const btn = ev.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Creando cuenta…'; mensajeAuth('');
  // El perfil se crea solo en la base de datos con estos datos (ver schema.sql)
  const { data, error } = await db.auth.signUp({ email, password: p1, options: { data: { nombre, rol, telefono } } });
  btn.disabled = false; btn.textContent = 'Crear cuenta';
  if (error) return mensajeAuth(error.message);
  if (data.session) return alIniciarSesion(data.user);
  cambiarPestanaAuth('login');
  document.getElementById('login-email').value = email;
  mensajeAuth('Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.', 'ok');
}

async function cerrarSesion() {
  if (!await confirmar({ titulo: 'Cerrar sesión', mensaje: '¿Quieres salir del sistema?', etiqueta: 'Cerrar sesión' })) return;
  detenerTiempoReal();
  await db.auth.signOut();
  mostrarAuth();
}

function mostrarAuth() {
  appIniciada = false;
  document.getElementById('app-shell').classList.remove('visible');
  document.getElementById('auth-screen').classList.add('visible');
  document.getElementById('login-password').value = '';
}

async function alIniciarSesion(user) {
  if (appIniciada) return;
  appIniciada = true;
  document.getElementById('auth-screen').classList.remove('visible');
  document.getElementById('app-shell').classList.add('visible');
  const email = user.email || '';
  document.getElementById('user-avatar').textContent = email.slice(0, 2).toUpperCase();
  document.getElementById('user-name').textContent = user.user_metadata?.nombre || email;
  document.getElementById('user-role').textContent = user.user_metadata?.rol || '';
  db.from('usuarios').select('nombre,rol').eq('id', user.id).maybeSingle().then(({ data }) => {
    if (data) { document.getElementById('user-name').textContent = data.nombre || email; document.getElementById('user-role').textContent = data.rol || ''; }
  });
  await iniciarApp();
}

function iniciarAuth() {
  document.getElementById('form-login').addEventListener('submit', entrar);
  document.getElementById('form-registro').addEventListener('submit', registrar);
  document.querySelectorAll('.auth-tab').forEach(b => b.addEventListener('click', () => cambiarPestanaAuth(b.dataset.tab)));
  document.getElementById('btn-salir').addEventListener('click', cerrarSesion);

  if (CONFIG_PENDIENTE) {
    document.getElementById('config-pendiente').hidden = false;
    document.querySelectorAll('.auth-form button[type=submit]').forEach(b => { b.disabled = true; });
    document.getElementById('auth-screen').classList.add('visible');
    return;
  }
  db.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) alIniciarSesion(session.user); else document.getElementById('auth-screen').classList.add('visible');
  });
  db.auth.onAuthStateChange(evento => { if (evento === 'SIGNED_OUT') mostrarAuth(); });
}
