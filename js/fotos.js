// fotos.js — Foto de cada animal: tomar con la cámara o elegir de la galería, guardar en Supabase Storage y mostrar en la ficha

const BUCKET_FOTOS = 'fotos-animales';
const FOTO_LADO_MAX = 1280;      // píxeles del lado más largo
const FOTO_CALIDAD = 0.82;       // calidad JPEG
const _urlsFoto = new Map();     // ruta -> { url, hasta }

// ---------- Almacenamiento ----------
// El bucket es privado: se pide una dirección temporal firmada para mostrar cada foto.
async function urlFoto(ruta) {
  if (!ruta) return null;
  const c = _urlsFoto.get(ruta);
  if (c && c.hasta > Date.now()) return c.url;
  const { data, error } = await db.storage.from(BUCKET_FOTOS).createSignedUrl(ruta, 3600);
  if (error || !data) return null;
  _urlsFoto.set(ruta, { url: data.signedUrl, hasta: Date.now() + 55 * 60 * 1000 });
  return data.signedUrl;
}

// Sube la foto nueva, la liga al animal y borra la anterior
async function guardarFotoAnimal(animalId, blob, rutaAnterior) {
  const ruta = `${animalId}/${Date.now()}.jpg`;
  const bucket = db.storage.from(BUCKET_FOTOS);
  const { error } = await bucket.upload(ruta, blob, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  const { error: e2 } = await db.from('animales').update({ foto: ruta }).eq('id', animalId);
  if (e2) { await bucket.remove([ruta]); throw e2; }
  if (rutaAnterior) { try { await bucket.remove([rutaAnterior]); } catch (e) { /* la foto vieja queda huérfana, no es grave */ } _urlsFoto.delete(rutaAnterior); }
  return ruta;
}

async function quitarFotoAnimal(animalId, ruta) {
  const { error } = await db.from('animales').update({ foto: null }).eq('id', animalId);
  if (error) throw error;
  if (ruta) { try { await db.storage.from(BUCKET_FOTOS).remove([ruta]); } catch (e) { /* nada */ } _urlsFoto.delete(ruta); }
}

// ---------- Procesar la imagen (reducir peso y respetar la orientación) ----------
async function procesarFoto(archivo) {
  let img;
  try { img = await createImageBitmap(archivo, { imageOrientation: 'from-image' }); }
  catch (e) {
    img = await new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => mal(new Error('No se pudo leer la imagen.')); i.src = URL.createObjectURL(archivo); });
  }
  const w = img.width || img.naturalWidth, h = img.height || img.naturalHeight;
  const k = Math.min(1, FOTO_LADO_MAX / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.round(w * k); c.height = Math.round(h * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  const blob = await new Promise(res => c.toBlob(res, 'image/jpeg', FOTO_CALIDAD));
  if (!blob) throw new Error('No se pudo preparar la foto.');
  return blob;
}

// ---------- Cámara (computadoras; en el celular se usa la cámara del teléfono) ----------
// Devuelve la foto (Blob), null si se cancela, o 'sin-camara' si no hay cámara disponible.
function abrirCamara() {
  return new Promise(resolver => {
    let flujo = null, frente = 'environment', listo = false;
    const m = crearModal({
      titulo: 'Tomar foto',
      cuerpo: '<div class="camara"><video playsinline autoplay muted></video></div><p class="hint" style="margin:10px 0 4px;color:var(--texto-3);font-size:12.5px">Si el navegador lo pide, permite el acceso a la cámara.</p>',
      pie: '<button type="button" class="btn btn-ghost" data-girar>Cambiar cámara</button><span class="spacer"></span><button type="button" class="btn" data-cerrar>Cancelar</button><button type="button" class="btn btn-primary" data-capturar disabled>Capturar</button>',
    });
    const video = m.el.querySelector('video'), btn = m.el.querySelector('[data-capturar]');
    const detener = () => { if (flujo) flujo.getTracks().forEach(t => t.stop()); flujo = null; };
    const iniciar = async () => {
      detener();
      try {
        flujo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: frente }, width: { ideal: 1280 } }, audio: false });
        video.srcObject = flujo; btn.disabled = false;
      } catch (e) { listo = true; m.cerrar(); resolver('sin-camara'); }
    };
    m.alCerrar = () => { detener(); if (!listo) { listo = true; resolver(null); } };
    m.el.querySelector('[data-girar]').onclick = () => { frente = frente === 'environment' ? 'user' : 'environment'; iniciar(); };
    btn.onclick = () => {
      const c = document.createElement('canvas'); c.width = video.videoWidth; c.height = video.videoHeight;
      c.getContext('2d').drawImage(video, 0, 0);
      c.toBlob(async b => { listo = true; m.cerrar(); try { resolver(await procesarFoto(b)); } catch (e) { resolver(null); } }, 'image/jpeg', 0.92);
    };
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { listo = true; m.cerrar(); resolver('sin-camara'); return; }
    iniciar();
  });
}

// ---------- Campo "foto" de los formularios ----------
function htmlCampoFoto() {
  return `<div class="foto-widget">
    <div class="foto-caja"><img alt="Foto del animal" hidden><div class="foto-vacia">${icon('camera')}<span>Sin foto</span></div></div>
    <div class="foto-acciones">
      <button type="button" class="btn btn-sm" data-foto-tomar>${icon('camera', 'icon-sm')}Tomar foto</button>
      <button type="button" class="btn btn-sm" data-foto-elegir>${icon('image', 'icon-sm')}Elegir de la galería</button>
      <button type="button" class="btn btn-sm btn-ghost" data-foto-quitar hidden>Quitar foto</button>
    </div>
    <input type="file" accept="image/*" capture="environment" hidden data-foto-cam>
    <input type="file" accept="image/*" hidden data-foto-gal>
  </div>`;
}

// Activa los botones del campo. "campo" es el contenedor del campo; guarda su estado en campo._foto.
function iniciarCampoFoto(campo, rutaActual, alCambiar) {
  const estado = campo._foto = { blob: null, quitar: false, actual: rutaActual || null, vista: null };
  const img = campo.querySelector('img'), vacia = campo.querySelector('.foto-vacia'), quitar = campo.querySelector('[data-foto-quitar]');
  const pintar = url => { img.hidden = !url; vacia.hidden = !!url; if (url) img.src = url; quitar.hidden = !url; };
  if (rutaActual) urlFoto(rutaActual).then(u => { if (!estado.blob && !estado.quitar) pintar(u); });

  const poner = blob => {
    estado.blob = blob; estado.quitar = false;
    if (estado.vista) URL.revokeObjectURL(estado.vista);
    estado.vista = URL.createObjectURL(blob); pintar(estado.vista); alCambiar && alCambiar();
  };
  const leer = async e => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    try { poner(await procesarFoto(f)); } catch (err) { showToast(errMsg(err), 'error'); }
  };
  campo.querySelector('[data-foto-cam]').addEventListener('change', leer);
  campo.querySelector('[data-foto-gal]').addEventListener('change', leer);
  campo.querySelector('[data-foto-elegir]').onclick = () => campo.querySelector('[data-foto-gal]').click();
  campo.querySelector('[data-foto-tomar]').onclick = async () => {
    // En el celular se abre la cámara del teléfono; en la computadora, la cámara web
    if (window.matchMedia('(pointer: coarse)').matches) { campo.querySelector('[data-foto-cam]').click(); return; }
    const r = await abrirCamara();
    if (r === 'sin-camara') { showToast('No se pudo usar la cámara. Elige una foto de tus archivos.', 'error'); campo.querySelector('[data-foto-gal]').click(); }
    else if (r) poner(r);
  };
  quitar.onclick = () => {
    estado.blob = null; estado.quitar = !!estado.actual;
    if (estado.vista) { URL.revokeObjectURL(estado.vista); estado.vista = null; }
    pintar(null); alCambiar && alCambiar();
  };
}

// ---------- Cambiar la foto desde la ficha ----------
function formFoto(a) {
  const m = abrirFormulario({
    titulo: `Foto de ${a.identificador}`,
    sub: 'Toma una foto nueva o elige una de la galería. Reemplaza a la anterior.',
    etiqueta: 'Guardar foto',
    campos: [{ name: 'foto', label: 'Foto', tipo: 'foto', actual: a.foto, full: true }],
    validar: v => (!v.foto.blob && !v.foto.quitar) ? { foto: 'Toma o elige una foto primero.' } : null,
    alGuardar: async v => {
      if (v.foto.blob) { await guardarFotoAnimal(a.id, v.foto.blob, a.foto); showToast('Foto actualizada'); }
      else { await quitarFotoAnimal(a.id, a.foto); showToast('Foto quitada'); }
      await recargar('animales');
    },
  });
  m.alCerrar = () => abrirFicha(a.id);   // al terminar o cancelar, se vuelve a la ficha
}

// Ver la foto en grande
function verFoto(url, titulo) {
  crearModal({ titulo, tam: 'wide', cuerpo: `<img class="foto-grande" src="${esc(url)}" alt="${esc(titulo)}">`, pie: '<button type="button" class="btn btn-primary" data-cerrar>Cerrar</button>' });
}
