// El service worker de Nyango en la web (lo rellena herramientas/construir_app.py: sin rellenar, no hace nada).
// Lo esencial (páginas, código, estilos y textos) se guarda al instalarse, para que la app abra sin conexión; lo demás
// se guarda la primera vez que se usa: el contenido y las clases, con cada versión; imágenes, voces y audios, aparte
// (los audios llevan un nombre por su contenido y no cambian). Al activarse una versión nueva, se borra lo de la vieja.
const VERSION = '17439bc1fe', MEDIOS_V = 'fc3e48b9ba', PRECACHE = ["/", "/index.html", "/movil.html", "/manifest.webmanifest", "/css/movil.css", "/css/temas.css", "/vendor/fuentes/fuentes.css", "/kana/kana.json", "/clases/indice.json", "/lecturas/indice.json", "/js/acerca.js", "/js/ajustes.js", "/js/antiguo.js", "/js/app.js", "/js/arranque.js", "/js/bienvenida.js", "/js/clase-arte.js", "/js/clase-escena.js", "/js/clase.js", "/js/conjugar-tutorial-ejemplos.js", "/js/conjugar-tutorial.js", "/js/conjugar-vista.js", "/js/conjugar.js", "/js/css-lista.js", "/js/curvas.js", "/js/encaje.js", "/js/enlace-ajustes.js", "/js/enlace-comun.js", "/js/episodio.js", "/js/estadisticas.js", "/js/estudio.js", "/js/gramatica-ejercicios.js", "/js/gramatica.js", "/js/i18n.js", "/js/iconos.js", "/js/japones.js", "/js/jefe.js", "/js/kage.js", "/js/kana.js", "/js/lectura.js", "/js/mascota-v1.js", "/js/mascota.js", "/js/motor/almacen.js", "/js/motor/azar.js", "/js/motor/conjugacion.js", "/js/motor/contenido.js", "/js/motor/enlace-config.js", "/js/motor/enlace-cripto.js", "/js/motor/enlace-union.js", "/js/motor/enlace.js", "/js/motor/fsrs.js", "/js/motor/gramatica.js", "/js/motor/juego.js", "/js/motor/local.js", "/js/motor/servidor.js", "/js/motor/textos.js", "/js/movil/ajustes.js", "/js/movil/app.js", "/js/movil/aprender.js", "/js/movil/bienvenida.js", "/js/movil/clase.js", "/js/movil/clases.js", "/js/movil/comun.js", "/js/movil/conjugar.js", "/js/movil/cuarto.js", "/js/movil/enlazar.js", "/js/movil/guia.js", "/js/movil/historias.js", "/js/movil/inicio.js", "/js/movil/instalar.js", "/js/movil/kana.js", "/js/movil/leccion.js", "/js/movil/pronto.js", "/js/movil/repaso.js", "/js/nyan.js", "/js/opciones.js", "/js/perfil.js", "/js/pupitre.js", "/js/recompensas.js", "/js/reparto.js", "/js/sincro.js", "/js/sonido.js", "/js/teclado.js", "/js/tema.js", "/js/visita.js", "/vendor/three/addons/environments/RoomEnvironment.js", "/vendor/three/addons/geometries/DecalGeometry.js", "/vendor/three/addons/geometries/RoundedBoxGeometry.js", "/vendor/three/addons/lights/RectAreaLightTexturesLib.js", "/vendor/three/addons/lights/RectAreaLightUniformsLib.js", "/vendor/three/addons/loaders/GLTFLoader.js", "/vendor/three/addons/postprocessing/EffectComposer.js", "/vendor/three/addons/postprocessing/MaskPass.js", "/vendor/three/addons/postprocessing/OutputPass.js", "/vendor/three/addons/postprocessing/Pass.js", "/vendor/three/addons/postprocessing/RenderPass.js", "/vendor/three/addons/postprocessing/ShaderPass.js", "/vendor/three/addons/shaders/CopyShader.js", "/vendor/three/addons/shaders/OutputShader.js", "/vendor/three/addons/utils/BufferGeometryUtils.js", "/vendor/three/build/three.module.js", "/vendor/gsap/CSSPlugin.js", "/vendor/gsap/gsap-core.js", "/vendor/gsap/index.js", "/vendor/qr/qr-leer.js", "/vendor/qr/qr.js", "/i18n/en.json", "/i18n/es.json", "/datos/juego/catalogo.json", "/datos/juego/regiones-2.json", "/datos/juego/textos.en.json", "/datos/juego/textos.es.json", "/img/iconos/bolsa.svg", "/img/iconos/camino.svg", "/img/iconos/gramatica.svg", "/img/iconos/kanji.svg", "/img/iconos/koban.svg", "/img/iconos/leccion.svg", "/img/iconos/mision.svg", "/img/iconos/mochi.svg", "/img/iconos/omamori.svg", "/img/iconos/racha.svg", "/img/iconos/repaso.svg", "/img/iconos/trofeo.svg", "/img/iconos/vida.svg", "/img/iconos/xp.svg", "/img/marca/nyango/icono-128.png", "/img/marca/nyango/icono-16.png", "/img/marca/nyango/icono-24.png", "/img/marca/nyango/icono-256.png", "/img/marca/nyango/icono-32.png", "/img/marca/nyango/icono-48.png", "/img/marca/nyango/icono-512.png", "/img/marca/nyango/icono-64.png"];
const NUCLEO = `nyango-${VERSION}`, MEDIOS = `nyango-medios-${MEDIOS_V}`, LISTO = !VERSION.startsWith('__');

self.addEventListener('install', (e) => {
  if (!LISTO) return;
  e.waitUntil(caches.open(NUCLEO).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  if (!LISTO) return;
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('nyango-') && k !== NUCLEO && k !== MEDIOS).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (!LISTO) return;
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== self.location.origin || u.pathname.startsWith('/api/')) return;
  // las páginas: primero la red (así llega la versión nueva); sin red, la guardada
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then((res) => { const c = res.clone(); caches.open(NUCLEO).then((k) => k.put(u.pathname, c)); return res; })
      .catch(() => caches.match(u.pathname).then((x) => x || caches.match('/movil.html'))));
    return;
  }
  const medio = /^\/(media|sonidos|img|vendor\/fuentes)\//.test(u.pathname);
  e.respondWith(caches.match(r, { ignoreSearch: true }).then((x) => x || fetch(r).then((res) => {
    if (res.ok && res.status === 200) { const c = res.clone(); caches.open(medio ? MEDIOS : NUCLEO).then((k) => k.put(r, c)); }
    return res;
  })));
});
