// realtime.js — Cambios en vivo: si otra persona registra algo, tu pantalla se actualiza sola

let canalRt = null;

function estadoLive(conectado) {
  const el = document.getElementById('live');
  if (!el) return;
  el.classList.toggle('off', !conectado);
  el.querySelector('span:last-child').textContent = conectado ? 'En vivo' : 'Sin conexión en vivo';
}
function marcarSync() {
  const el = document.getElementById('live'); if (!el) return;
  el.classList.remove('sync'); void el.offsetWidth; el.classList.add('sync');
}

function iniciarTiempoReal() {
  if (canalRt) return;
  try {
    canalRt = db.channel('rancho-caprino');
    Object.keys(DEPENDENCIAS).forEach(tabla => {
      canalRt.on('postgres_changes', { event: '*', schema: 'public', table: tabla }, () => { marcarSync(); recargar(tabla); });
    });
    canalRt.subscribe(estado => estadoLive(estado === 'SUBSCRIBED'));
  } catch (e) { estadoLive(false); }
}

function detenerTiempoReal() {
  if (canalRt) { try { db.removeChannel(canalRt); } catch (e) { /* nada */ } canalRt = null; }
}
