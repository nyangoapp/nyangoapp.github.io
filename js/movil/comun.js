// Nyango en el móvil: una interfaz propia sobre el mismo motor (web/js/motor), no la de escritorio encogida.
// Lo común a sus pantallas: atajos del DOM, la llamada al motor, el nivel por XP, la vibración y los iconos.
import { gsap } from 'gsap';
import { CABECERA } from '../i18n.js';
import { ICONOS } from '../iconos.js';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const api = async (ruta, datos) => {
  const r = await fetch(ruta, datos === undefined ? { headers: CABECERA } : { method: 'POST', headers: { 'Content-Type': 'application/json', ...CABECERA }, body: JSON.stringify(datos) });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.status);
  return r.json();
};
export const quieto = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const vibrar = (ms = 12) => { try { navigator.vibrate?.(ms); } catch { /* sin vibración */ } };
// que algo quepa sin desplazar: si su contenido se sale, se encoge su letra (y con ella todo lo que vaya en em) hasta que
// entre, sin bajar de «min» veces el tamaño normal
export function encajar(caja, min = 0.7) {
  if (!caja) return;
  caja.style.fontSize = '';
  for (let e = 1; caja.scrollHeight > caja.clientHeight + 1 && e > min; ) { e = Math.max(min, e - 0.05); caja.style.fontSize = `${e}em`; }
}
// un trozo de HTML → su primer elemento
export function nodo(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
// la misma curva de niveles que el escritorio (app.js): need(L) = round(150 · L^1.45)
export function nivelDe(xp) {
  const pide = (n) => Math.round(150 * n ** 1.45);
  let L = 1, need = pide(1), x = Math.max(0, xp || 0);
  while (x >= need) { x -= need; L++; need = pide(L); }
  return { L, dentro: x, need, pct: x / need };
}
// los iconos de la app (iconos.js), al tamaño que se pida
export const icono = (id, t = 28) => (ICONOS[id] || '').replace('class="ico" ', `width="${t}" height="${t}" `);
export const CERRAR = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
export const PLAY = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>';
export const CHECK = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
export const AJUSTES = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.3"/><circle cx="9" cy="17" r="2.3"/></g></svg>';

// Nyan en 3D, a la medida de cada teléfono (se guarda en el propio teléfono, no en el progreso): resolución (píxeles por
// punto), tamaño de la sombra, suavizado de bordes y tope de fotogramas. «foto»: sin 3D, Nyan en imagen
export const NIVELES_3D = {
  alta: { pr: 2, sombra: 2048, aa: true, fps: 0 },
  normal: { pr: 1.25, sombra: 1024, aa: true, fps: 0 },
  ligera: { pr: 1, sombra: 512, aa: false, fps: 30 },
  foto: null,
};
const CLAVE_3D = 'nyango-nyan-3d';
export function nivel3d() {
  try { const n = localStorage.getItem(CLAVE_3D); if (n && n in NIVELES_3D) return n; } catch { /* sin almacenamiento */ }
  return 'normal';
}
export function ponerNivel3d(n) {
  if (!(n in NIVELES_3D)) return;
  try { localStorage.setItem(CLAVE_3D, n); } catch { /* sin almacenamiento: vale para esta vez */ }
  dispatchEvent(new CustomEvent('nyango:nivel3d', { detail: n }));
}

// el valor de un token del tema (--acento…) tal como está ahora: para lo que se pinta desde JS (confeti)
export const token = (nombre) => getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
// confeti al acertar: unas pocas piezas que saltan desde el elemento (sin nada si se prefiere menos movimiento); por defecto, con los colores del tema
export function chispas(el, { n = 12, colores = ['--acento', '--aviso', '--t-kanji', '--bien', '--mal'] } = {}) {
  if (quieto() || !el) return;
  colores = colores.map((c) => (c.startsWith('--') ? token(c) : c));
  const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  for (let k = 0; k < n; k++) {
    const c = document.createElement('i'); c.className = 'mv-chispa' + (k % 3 === 1 ? ' redonda' : '');
    c.style.background = colores[k % colores.length]; document.body.appendChild(c);
    const a = (k / n) * Math.PI * 2 + Math.random() * 0.5, v = 60 + Math.random() * 70;
    gsap.set(c, { x: cx + Math.cos(a) * r.width * 0.25, y: cy + Math.sin(a) * r.height * 0.25, rotate: Math.random() * 360, scale: 0.6 + Math.random() * 0.6 });
    gsap.timeline({ onComplete: () => c.remove() })
      .to(c, { x: `+=${Math.cos(a) * v}`, y: `+=${Math.sin(a) * v - 26}`, rotate: '+=180', duration: 0.5, ease: 'power3.out' })
      .to(c, { y: '+=40', opacity: 0, scale: 0.3, duration: 0.4, ease: 'power1.in' }, '>-0.1');
  }
}
