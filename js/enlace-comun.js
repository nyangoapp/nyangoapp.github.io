// Lo que comparten las pantallas de «vincular el móvil» (escritorio: enlace-ajustes.js; móvil: movil/enlazar.js): hablar con el
// motor (/api/enlace/*, ver motor/enlace.js), el código para teclear, el QR (vendor/qr, se carga solo cuando hace falta), la
// cámara que lee el QR y cómo se cuenta «hace 2 min». Sin nada de interfaz.
import { t, idioma, CABECERA } from './i18n.js';

const pedir = async (ruta, datos) => {
  const r = await fetch(ruta, datos === undefined ? { headers: CABECERA } : { method: 'POST', headers: { 'Content-Type': 'application/json', ...CABECERA }, body: JSON.stringify(datos) });
  const cuerpo = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(cuerpo.error || String(r.status)); e.clave = cuerpo.clave || null; throw e; }
  return cuerpo;
};
/** Estado del enlace ({disponible, motivo, enlazado, nombre, aparatos, ultimo, sincronizando}) o null si el motor no responde. */
export const estado = () => pedir('/api/enlace').catch(() => null);
export const crear = (nombre = '') => pedir('/api/enlace/crear', { nombre });
export const unir = (codigo, nombre = '') => pedir('/api/enlace/unir', { codigo, nombre });
export const ahora = () => pedir('/api/enlace/ahora', {});
export const quitar = () => pedir('/api/enlace/quitar', {});
export const ponerNombre = (nombre) => pedir('/api/enlace/nombre', { nombre });

// ── el código ──
const ALFABETO = /[^0-9A-HJKMNP-TV-Z]/g;
/** Lo que haya en el campo, limpio y con guiones cada 4 (XXXX-XXXX-XXXX-XXXX-XXXX-XXXXXX); O→0, I y L→1, como en el motor. */
export function agrupar(texto) {
  const c = String(texto || '').toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1').replace(ALFABETO, '').slice(0, 26);
  const trozos = []; let i = 0;
  for (const n of [4, 4, 4, 4, 4, 6]) { if (i >= c.length) break; trozos.push(c.slice(i, i + n)); i += n; }
  return trozos.join('-');
}
/** El código dentro de lo leído de un QR o pegado (el enlace entero o solo el código); '' si no hay nada con pinta de código. */
export function sacarCodigo(texto) {
  let x = String(texto || '').trim();
  const m = x.match(/enlazar=([^&\s]+)/i);
  if (m) x = decodeURIComponent(m[1]);
  const g = agrupar(x);
  return g.replace(/-/g, '').length === 26 ? g : '';
}

// ── el QR ──
/** SVG del QR de `texto` (módulos oscuros sobre blanco, con su margen). Colores fijos a propósito (arte): un escáner necesita oscuro sobre claro en cualquier tema. */
export async function qrSvg(texto, { oscuro = '#3b2a1c', claro = '#ffffff', ecc = 'medium' } = {}) {
  const { encodeQR } = await import('../vendor/qr/qr.js');
  const m = encodeQR(texto, 'raw', { ecc, border: 0 }), n = m.length, b = 3;      // 3 módulos de margen: más de los 2 mínimos, el móvil lo lee mejor
  let d = '';
  m.forEach((fila, y) => { let x = 0; while (x < n) { if (!fila[x]) { x++; continue; } let w = 1; while (x + w < n && fila[x + w]) w++; d += `M${x + b} ${y + b}h${w}v1h${-w}z`; x += w; } });
  const L = n + 2 * b;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L} ${L}" shape-rendering="crispEdges" role="img" aria-label="${t('enl.qr.alt')}"><rect width="${L}" height="${L}" fill="${claro}"/><path d="${d}" fill="${oscuro}"/></svg>`;
}

// ── la cámara ──
export const hayCamara = () => !!(navigator.mediaDevices?.getUserMedia && window.isSecureContext);
/**
 * Abre la cámara trasera en `video` y llama a `alLeer(texto)` con cada QR que lea (una vez por QR distinto cada 2 s).
 * Primero BarcodeDetector (si el navegador lo tiene) y, si no, el lector de vendor/qr. En el iPhone (también en la app instalada)
 * hace falta playsinline y muted, y que el vídeo se pida con facingMode. → { parar() }; lanza si no hay permiso o cámara.
 */
export async function escanear(video, alLeer) {
  const flujo = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } });
  video.setAttribute('playsinline', ''); video.setAttribute('webkit-playsinline', ''); video.muted = true; video.autoplay = true;
  video.srcObject = flujo;
  try { await video.play(); } catch (e) { flujo.getTracks().forEach((p) => p.stop()); throw e; }
  let vivo = true, ultimo = '', cuando = 0, timer = 0, detector = null, leer = null;
  try { if ('BarcodeDetector' in window) detector = new BarcodeDetector({ formats: ['qr_code'] }); } catch (e) { detector = null; }
  const lienzo = document.createElement('canvas'), ctx = lienzo.getContext('2d', { willReadFrequently: true });
  const vuelta = async () => {
    if (!vivo) return;
    try {
      if (video.readyState >= 2 && video.videoWidth) {
        let texto = '';
        if (detector) {
          try { texto = (await detector.detect(video))[0]?.rawValue || ''; } catch (e) { detector = null; }
        }
        if (!texto && !detector) {
          leer ||= (await import('../vendor/qr/qr-leer.js')).decodeQR;
          const k = Math.min(1, 720 / video.videoWidth);                         // un fotograma reducido: lee igual y no pesa
          lienzo.width = Math.round(video.videoWidth * k); lienzo.height = Math.round(video.videoHeight * k);
          ctx.drawImage(video, 0, 0, lienzo.width, lienzo.height);
          const img = ctx.getImageData(0, 0, lienzo.width, lienzo.height);
          try { texto = leer({ width: img.width, height: img.height, data: img.data }); } catch (e) { texto = ''; }      // «no hay QR» lanza
        }
        if (texto && vivo && (texto !== ultimo || Date.now() - cuando > 2000)) { ultimo = texto; cuando = Date.now(); alLeer(texto); }
      }
    } catch (e) { /* un fotograma malo no para nada */ }
    if (vivo) timer = setTimeout(vuelta, detector ? 120 : 220);
  };
  timer = setTimeout(vuelta, 300);
  return {
    detector: !!detector,
    parar() { vivo = false; clearTimeout(timer); try { flujo.getTracks().forEach((p) => p.stop()); } catch (e) { /* ya parada */ } video.srcObject = null; },
  };
}

// ── textos ──
const rtf = new Intl.RelativeTimeFormat(idioma, { numeric: 'auto', style: idioma === 'es' ? 'short' : 'long' });
/** «hace 2 min» · «2 minutes ago» (ts en segundos); «ahora mismo» si es de hace nada. */
export function haceCuanto(ts) {
  if (!ts) return '';
  const s = Date.now() / 1000 - ts;
  if (s < 45) return t('enl.ahora_mismo');
  if (s < 3600) return rtf.format(-Math.max(1, Math.round(s / 60)), 'minute');
  if (s < 86400) return rtf.format(-Math.round(s / 3600), 'hour');
  return rtf.format(-Math.round(s / 86400), 'day');
}
/** La línea de estado: { clase: 'curso' | 'mal' | 'bien' | '', txt }. Los errores del motor ya vienen redactados. */
export function lineaEstado(e) {
  if (!e?.enlazado) return { clase: '', txt: '' };
  if (e.sincronizando) return { clase: 'curso', txt: t('enl.sincronizando') };
  const u = e.ultimo || {};
  if (u.ok === false) return { clase: 'mal', txt: u.error || t('enl.error_generico') };
  if (u.t) return { clase: 'bien', txt: t('enl.sincronizado', { cuando: haceCuanto(u.t) }) };
  return { clase: '', txt: t('enl.esperando_primera') };
}
/** Nombre sugerido para este móvil, por el navegador. */
export function nombreMovil() {
  const ua = navigator.userAgent || '';
  if (/iPhone|iPod/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'iPad';
  if (/Android/i.test(ua)) return 'Android';
  return idioma === 'en' ? 'Phone' : 'Móvil';
}
