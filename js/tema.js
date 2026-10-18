// El tema de la interfaz (temas.css): Washi · Noche · Pop · Sumi · Auto.
// Vive en <html data-tema="…"> (lo pone index.html ANTES de pintar, desde localStorage 'nyango-tema'); aquí está lo que se hace
// después: cambiarlo con un fundido corto, guardarlo (este navegador + el ajuste `tema` del motor) y avisar al resto con el evento
// «nyango:tema». «Auto» sigue al sistema: noche si está en oscuro, si no washi. El ajuste del motor no se sincroniza entre
// dispositivos (enlace-union.js · AJUSTES_LOCALES): cada pantalla tiene el suyo.
import { CABECERA } from './i18n.js';

export const TEMAS = ['washi', 'noche', 'pop', 'sumi', 'auto'];
const REALES = ['washi', 'noche', 'pop', 'sumi'];
const COLOR_BARRA = { washi: '#f1e6d0', noche: '#0f1115', pop: '#f3f4f7', sumi: '#f6f5f2' };   // el <meta name="theme-color"> de cada tema
const CLAVE = 'nyango-tema';
const oscuro = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
const quieto = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** El tema que ha elegido la persona (puede ser «auto»). */
export function temaElegido() {
  let t = null;
  try { t = localStorage.getItem(CLAVE); } catch { /* sin almacenamiento: washi */ }
  return TEMAS.includes(t) ? t : 'washi';
}
/** El tema que se está viendo ahora (nunca «auto»). */
export const temaReal = (t = temaElegido()) => (t === 'auto' ? (oscuro?.matches ? 'noche' : 'washi') : REALES.includes(t) ? t : 'washi');

function pintar(elegido) {
  const real = temaReal(elegido), D = document.documentElement;
  D.setAttribute('data-tema', real); D.setAttribute('data-tema-elegido', elegido);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COLOR_BARRA[real]);
  dispatchEvent(new CustomEvent('nyango:tema', { detail: { elegido, real } }));
}

// Antes de cambiar, se piden las letras del tema nuevo (una muestra de latín, kana y kanji): así el texto no «salta» al cambiar de letra.
// Una sonda con data-muestra lleva los tokens del tema aunque la app esté en otro (temas.css). Con tope de 0,6 s: si tarda, se cambia igual.
async function precargarLetras(real) {
  if (!document.fonts?.load || !document.body) return;
  const sonda = document.createElement('i'); sonda.setAttribute('data-muestra', real); sonda.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none';
  document.body.appendChild(sonda);
  const cs = getComputedStyle(sonda), fam = (v) => cs.getPropertyValue(v).trim();
  const lista = [['700 20px', '--f-titulo'], ['400 16px', '--f-texto'], ['700 16px', '--f-texto'], ['500 20px', '--f-jp'], ['600 20px', '--f-kaisho']].map(([p, v]) => `${p} ${fam(v)}`);
  sonda.remove();
  const muestra = 'あいうえおアイウエオ日本語漢字学習 AaBbÑñ 0123';
  await Promise.race([Promise.all(lista.map((f) => document.fonts.load(f, muestra).catch(() => {}))), new Promise((ok) => setTimeout(ok, 600))]);
}

let peticion = 0;
/** Cambia el tema al instante (con un fundido de ~0,28 s) y lo guarda. */
export function ponerTema(id, { guardar = true } = {}) {
  const elegido = TEMAS.includes(id) ? id : 'washi';
  if (guardar) {
    try { localStorage.setItem(CLAVE, elegido); } catch { /* sin almacenamiento */ }
    fetch('/api/ajustes', { method: 'POST', headers: { 'Content-Type': 'application/json', ...CABECERA }, body: JSON.stringify({ tema: elegido }) }).catch(() => {});
  }
  const D = document.documentElement;
  if (temaReal(elegido) === D.getAttribute('data-tema') && elegido === D.getAttribute('data-tema-elegido')) return elegido;
  const mia = ++peticion;
  precargarLetras(temaReal(elegido)).catch(() => {}).then(() => {
    if (mia !== peticion) return;   // mientras tanto se eligió otro
    if (quieto()) pintar(elegido);
    else if (document.startViewTransition) {
      const vt = document.startViewTransition(() => pintar(elegido));
      for (const p of [vt.ready, vt.finished, vt.updateCallbackDone]) p?.catch?.(() => {});   // un cambio que pisa a otro no es un error
    }
    else { D.classList.add('cambiando-tema'); pintar(elegido); setTimeout(() => D.classList.remove('cambiando-tema'), 320); }
  });
  return elegido;
}

/** Al arrancar: si este navegador no tiene tema guardado pero el motor sí (datos copiados, app reinstalada), se adopta el del motor. */
export function adoptarTemaDelMotor(ajustes) {
  let hay = false;
  try { hay = localStorage.getItem(CLAVE) !== null; } catch { /* sin almacenamiento */ }
  const t = ajustes?.tema;
  if (!hay && TEMAS.includes(t)) { try { localStorage.setItem(CLAVE, t); } catch { /* sin almacenamiento */ } pintar(t); }
}

// «auto» sigue al sistema (index.html ya lo hace antes de pintar; aquí se avisa a los demás de que cambió)
const alSistema = () => { if (temaElegido() === 'auto') pintar('auto'); };
if (oscuro) { if (oscuro.addEventListener) oscuro.addEventListener('change', alSistema); else oscuro.addListener?.(alSistema); }
