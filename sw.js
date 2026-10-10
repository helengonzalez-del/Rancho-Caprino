// Service worker mínimo: permite instalar la app en el celular.
// No guarda datos en caché a propósito: siempre se muestra la información actual del rancho.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
