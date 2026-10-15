// Nyango sin servidor. En la app empaquetada (window.NYANGO_LOCAL, que pone herramientas/construir_app.py; o en Tauri; o con
// ?local para probar) cada fetch('/api/…') lo responde el motor de esta carpeta, dentro de la propia app. El resto de la
// interfaz no cambia: sigue pidiendo lo mismo. Servida por servidor.py (el Nyango de Python) no hace nada.
import { cargarTextos } from './textos.js';
import { cargarCatalogo } from './juego.js';
import { atender, cargarProgreso, esperarGuardado, guardar, iniciarEnlace } from './servidor.js';
import { almacen } from './almacen.js';

export const LOCAL = typeof window !== 'undefined'
  && !!(window.NYANGO_LOCAL || window.__TAURI__ || new URLSearchParams(location.search).has('local'));

if (LOCAL) {
  const listo = (async () => { await cargarTextos(); await cargarCatalogo(); await cargarProgreso(); await iniciarEnlace(); })();
  const original = window.fetch.bind(window);
  window.fetch = async (entrada, init = {}) => {
    const url = new URL(typeof entrada === 'string' ? entrada : entrada.url, location.href);
    if (url.origin !== location.origin || !url.pathname.startsWith('/api/')) return original(entrada, init);
    await listo;
    const metodo = String(init.method || (typeof entrada === 'string' ? 'GET' : entrada.method) || 'GET').toUpperCase();
    let datos = null;
    if (init.body) { try { datos = JSON.parse(init.body); } catch (e) { datos = null; } }
    const [codigo, cuerpo] = await atender(metodo, url.pathname + url.search, datos, new Headers(init.headers || {}).get('X-Nyango-Idioma'));
    return new Response(JSON.stringify(cuerpo), { status: codigo, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  };
  // al cerrar la ventana, que se termine de escribir lo pendiente
  window.addEventListener('pagehide', () => { esperarGuardado(); });
  // antes de recargar a propósito (cambiar de idioma…): que lo último esté escrito, o la recarga lo corta a medias
  window.__nyangoGuardado = () => listo.then(() => esperarGuardado());
  // App de escritorio: al pedir cerrar la ventana, Tauri (src-tauri/src/lib.rs) espera a que esto termine: cada pantalla suelta
  // lo que tenga a medias (evento «nyango:cerrar»: el tiempo de estudio…), se escribe el progreso entero y entonces se cierra.
  // Todo con tope: si algo se cuelga, a los 3 s se cierra igual (y Tauri, a los 4 s, sin esperar a nadie).
  window.__TAURI__?.event?.listen?.('nyango-cerrar', async () => {
    const tope = (ms) => new Promise((ok) => setTimeout(ok, ms));
    try { dispatchEvent(new Event('nyango:cerrar')); } catch (e) { /* que no pare el cierre */ }
    await tope(150);   // las peticiones que acaban de salir llegan al motor
    try { await Promise.race([listo.then(() => guardar()), tope(3000)]); } catch (e) { console.error('Al cerrar: no he podido guardar', e); }
    window.__TAURI__.core.invoke('cerrar_ya');
  });
}

// App de escritorio (Linux): el reproductor de WebKitGTK no sabe leer del protocolo propio de Tauri (tauri://localhost):
// new Audio('/media/x.mp3') falla con «source not supported» (y en el AppImage sin GStreamer, WebKit abortaba). Así que
// cada audio se trae con fetch, que sí funciona, y el reproductor recibe un blob: con lo mismo. Mismo uso de siempre:
// new Audio(url).play(). Se guardan los últimos 300 (una frase pesa ~20 kB).
if (typeof window !== 'undefined' && window.__TAURI__ && window.Audio) {
  const Nativo = window.Audio, blobs = new Map();
  const aBlob = (url) => {
    let p = blobs.get(url);
    if (!p) {
      p = fetch(url).then((r) => { if (!r.ok) throw new Error(r.status); return r.blob(); }).then((b) => URL.createObjectURL(b));
      blobs.set(url, p);
      if (blobs.size > 300) { const [viejo, pv] = blobs.entries().next().value; blobs.delete(viejo); pv.then((u) => URL.revokeObjectURL(u)).catch(() => {}); }
      p.catch(() => blobs.delete(url));
    }
    return p;
  };
  const Audio = function Audio(url) {
    const a = new Nativo();
    if (url) {
      const listo = aBlob(new URL(url, location.href).href).then((b) => { a.src = b; });
      a.play = () => listo.then(() => Nativo.prototype.play.call(a));   // play() antes de tener el blob: espera a que llegue
    }
    return a;
  };
  Audio.prototype = Nativo.prototype;
  window.Audio = Audio;
}

// App de escritorio: diagnostico.json en la carpeta de datos (3D disponible, tarjeta gráfica y errores de los primeros
// segundos), para saber por qué algo no se ve sin tener que hacer capturas.
if (LOCAL && typeof window !== 'undefined' && window.__TAURI__) {
  const errores = [];
  window.addEventListener('error', (e) => errores.push(String(e.message || e.error)));
  window.addEventListener('unhandledrejection', (e) => errores.push(String(e.reason?.message || e.reason)));
  // fotogramas por segundo de verdad (5 s, a partir del segundo 5) y el peor salto entre dos fotogramas
  let fps = null, peor = 0;
  setTimeout(() => {
    let n = 0, t0 = 0, antes = 0;
    const paso = (t) => { if (!t0) t0 = antes = t; n++; peor = Math.max(peor, t - antes); antes = t; if (t - t0 < 5000) requestAnimationFrame(paso); else fps = Math.round((n * 10000) / (t - t0)) / 10; };
    requestAnimationFrame(paso);
  }, 5000);
  // prueba del audio (solo con NYANGO_PROBAR_AUDIO, desde medir.sh): un ruidito en silencio; si el sistema de medios no está, se ve aquí
  let audio = null, pruebaAudio = null, webaudio = null;
  window.__TAURI__.core?.invoke('probar_audio').then((si) => {
    if (!si) return;
    audio = 'probando';
    const a = pruebaAudio = new Audio('sonidos/nyan/nyaa-0.mp3'); a.muted = true;
    a.play().then(() => { audio = 'suena'; }).catch((e) => { audio = 'error: ' + e; });
    fetch('sonidos/nyan/nyaa-1.mp3').then((r) => r.arrayBuffer()).then((b) => new AudioContext().decodeAudioData(b))
      .then((d) => { webaudio = `decodifica (${d.duration.toFixed(2)} s)`; }).catch((e) => { webaudio = 'error: ' + e; });
  }).catch(() => {});
  setTimeout(() => {
    let webgl = null;
    try {
      const gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
      const info = gl && gl.getExtension('WEBGL_debug_renderer_info');
      webgl = gl ? { version: gl.getParameter(gl.VERSION), tarjeta: info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) } : null;
    } catch (e) { webgl = { error: String(e) }; }
    const lienzo = document.querySelector('#mundo3d');
    almacen.escribir('diagnostico.json', JSON.stringify({ t: new Date().toISOString(), navegador: navigator.userAgent, webgl, fps, peor_salto_ms: Math.round(peor), audio, webaudio,
      audio_estado: pruebaAudio && { listo: pruebaAudio.readyState, red: pruebaAudio.networkState, error: pruebaAudio.error?.code ?? null, parado: pruebaAudio.paused, t: pruebaAudio.currentTime },
      pantalla: { dpr: devicePixelRatio, ancho: innerWidth, alto: innerHeight },
      lienzo: lienzo ? { ancho: lienzo.width, alto: lienzo.height } : null, errores: errores.slice(0, 30),
      // cuándo se vio la pantalla de carga y qué tardó más en llegar (para cazar esperas antes del primer pintado)
      carga: (() => { try { const nv = performance.getEntriesByType('navigation')[0] || {}; return { intro: window.__intro || null, t: window.__t || null,
        respuesta: Math.round(nv.responseEnd || 0), interactivo: Math.round(nv.domInteractive || 0), completo: Math.round(nv.loadEventEnd || 0),
        lentos: performance.getEntriesByType('resource').sort((x, y) => y.duration - x.duration).slice(0, 8).map((r) => [r.name.replace(/^.*\/\/[^/]+/, ''), Math.round(r.startTime), Math.round(r.duration)]) }; } catch (e) { return String(e); } })() }, null, 1)).catch(() => {});
  }, 11000);
}
