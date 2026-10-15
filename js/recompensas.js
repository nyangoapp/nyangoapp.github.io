// Recompensas de Nyango: bolsas de la suerte 福袋, subida de nivel, combos, orbes de XP, misiones del día, fin de sesión y colección 図鑑.
// Estética «habitación de Mochi»: fichas de vinilo con canto, pared de yeso ocre, tatami, logotipo naranja con contorno crema.
import { gsap } from 'gsap';
import { t, tn, kbd } from './i18n.js';
import { $, $$, api, espera, nivelDe, mil } from './app.js';
import * as son from './sonido.js';
import { esc } from './japones.js';
import { rejilla, escribiendo, capaAbierta } from './teclado.js';

// ───────────────────────── utilidades ─────────────────────────
const QUIETO = matchMedia('(prefers-reduced-motion: reduce)');
const quieto = () => QUIETO.matches;
const azar = (a, b) => a + Math.random() * (b - a);
const elegir = (l) => l[Math.floor(Math.random() * l.length)];
const centro = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, r }; };
const ORDEN = ['comun', 'raro', 'epico', 'legendario'];
// color / luz: los de los efectos del canvas (arte, no admiten var()); token: el de la interfaz, que sigue al tema
const RAREZA = {
  comun: { nombre: t('recompensas.rareza.comun'), color: '#9c8a55', luz: '#fff3d2', token: 'var(--tinta-3)' },
  raro: { nombre: t('recompensas.rareza.raro'), color: '#3f7fc4', luz: '#9fd0ff', token: 'var(--r1)' },
  epico: { nombre: t('recompensas.rareza.epico'), color: '#9b4fc9', luz: '#d9a6ff', token: 'var(--t-gram)' },
  legendario: { nombre: t('recompensas.rareza.legendario'), color: '#f2a114', luz: '#ffd25a', token: 'var(--aviso)' },
};
let JUEGO = null; // última foto de /api/juego
const catalogo = () => JUEGO?.catalogo?.objetos || [];
const objeto = (id) => catalogo().find((o) => o.id === id);
export async function cargarJuego() {
  const j = await api('/api/juego');
  JUEGO = j;
  for (const [k, v] of Object.entries(j?.catalogo?.rarezas || {})) if (RAREZA[k] && v.nombre) RAREZA[k].nombre = v.nombre;
  return j;
}
export const juegoActual = () => JUEGO;
const PARA_MOCHI = { accesorio: t('recompensas.para_mochi.accesorio'), ropa: t('recompensas.para_mochi.ropa'), aura: t('recompensas.para_mochi.aura') };      // lo que se «pone» Mochi (no va a la habitación)
const ORDEN_TIPO = ['habitacion', 'accesorio', 'ropa', 'aura'];
// viste una Mochi 3D con lo que lleva puesto de la colección (un accesorio y una prenda)
export function vestirMochi(m, j = JUEGO) {
  if (!m || !j) return;
  const ids = j.colocados || [], tipo = (id) => (j.catalogo?.objetos || []).find((o) => o.id === id)?.tipo;
  m.accesorio?.(ids.find((id) => tipo(id) === 'accesorio') || null);
  m.ropa?.(ids.find((id) => tipo(id) === 'ropa') || null);
  m.auraColeccion?.(ids.find((id) => tipo(id) === 'aura') || null);
}
// el inventario (perfil.js) pone y quita cosas de golpe, sin abrir la ficha grande
export async function ponerObjeto(id, colocado) {
  const r = await api('/api/colocar', { id, colocado });
  sincronizarPuestos(r.colocados);
  dispatchEvent(new CustomEvent('rc:colocado', { detail: { id, colocado } })); avisarCambio();
  return r;
}
export const objetoDe = (id) => objeto(id);
export const rarezaDe = (r) => RAREZA[r] || RAREZA.comun;
// tras /api/colocar: una prenda nueva quita la anterior, así que se sincronizan todas las marcas
function sincronizarPuestos(colocados) { if (!JUEGO) return; JUEGO.colocados = colocados; for (const it of JUEGO.inventario || []) it.colocado = colocados.includes(it.id); }
function avisarCambio() { dispatchEvent(new CustomEvent('rc:juego', { detail: JUEGO })); }
// contorno grueso del color de la superficie (el logotipo se lee igual sobre la sala oscura que sobre la página), con sombras de texto
function contorno(r, prof, fondo = 'var(--sup)') {
  const s = [];
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; s.push(`${(Math.cos(a) * r).toFixed(1)}px ${(Math.sin(a) * r).toFixed(1)}px 0 ${fondo}`); }
  s.push(`0 ${Math.round(prof / 2)}px ${prof * 2}px color-mix(in srgb, var(--tinta) 28%, transparent)`);
  return s.join(',');
}
const letras = (txt) => [...txt].map((c) => `<span class="rc-l">${c === ' ' ? '&nbsp;' : esc(c)}</span>`).join('');
export function contar(el, desde, hasta, dur = 0.9, fmt = mil) {
  if (!el) return null;
  const o = { v: desde };
  return gsap.to(o, { v: hasta, duration: quieto() ? 0.01 : dur, ease: 'power2.out', onUpdate: () => { el.textContent = fmt(o.v); } });
}

// ───────────────────────── dibujos propios (SVG en línea) ─────────────────────────
let nSvg = 0;
export function svgKoban(tam = 26) {
  return `<svg class="rc-koban" width="${tam}" height="${Math.round(tam * 1.25)}" viewBox="0 0 40 50" aria-hidden="true">
    <ellipse cx="20" cy="27" rx="17" ry="21.5" fill="#a86f12"/><ellipse cx="20" cy="25" rx="17" ry="21.5" fill="#f2b43a"/>
    <ellipse cx="20" cy="25" rx="12.6" ry="17" fill="none" stroke="#c98a1c" stroke-width="1.8"/>
    <path d="M13 15h14M11.5 21h17M11.5 29h17M13 35h14" stroke="#d99a26" stroke-width="1.6" stroke-linecap="round"/>
    <rect x="16" y="21.5" width="8" height="7" rx="1.6" fill="#c98a1c"/>
    <ellipse cx="12.5" cy="13" rx="3.2" ry="5.5" fill="#fff" opacity=".5" transform="rotate(24 12.5 13)"/></svg>`;
}
export function svgBolsa(tam = 30) {
  return `<svg class="rc-bolsa-mini" width="${tam}" height="${tam}" viewBox="0 0 48 48" aria-hidden="true">
    <path d="M24 17 L15 17 C13 13 11 9 8 5 C11 4 12 6 14 4 C16 2 18 5 20 3 C22 2 23 4 24 3 Z" fill="#e8553a"/>
    <path d="M24 17 L33 17 C35 13 37 9 40 5 C37 4 36 6 34 4 C32 2 30 5 28 3 C26 2 25 4 24 3 Z" fill="#e8553a"/>
    <path d="M16 18 C8 21 4 30 5 37 C6 44 14 46 24 46 C34 46 42 44 43 37 C44 30 40 21 32 18 Z" fill="#d8412a"/>
    <circle cx="24" cy="33" r="7.5" fill="#f7efdf"/><text x="24" y="36.6" font-size="9.5" text-anchor="middle" fill="#261f19" font-family="Mochiy Pop One, sans-serif">福</text>
    <rect x="14.5" y="15.5" width="19" height="4.5" rx="2.2" fill="#f2b43a" stroke="#b8801f" stroke-width=".8"/>
    <ellipse cx="12" cy="29" rx="2.2" ry="4.5" fill="#fff" opacity=".28" transform="rotate(20 12 29)"/></svg>`;
}
export function svgOmamori(tam = 34) {
  return `<svg width="${tam}" height="${Math.round(tam * 1.3)}" viewBox="0 0 40 52" aria-hidden="true">
    <path d="M20 9 C14 2 10 6 14 9 M20 9 C26 2 30 6 26 9" stroke="#d8412a" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M8 16 L20 8 L32 16 L32 46 Q32 50 28 50 L12 50 Q8 50 8 46 Z" fill="#2f4a7a"/>
    <path d="M8 16 L20 8 L32 16" fill="none" stroke="#f2b43a" stroke-width="2.2" stroke-linejoin="round"/>
    <rect x="12.5" y="20" width="15" height="24" rx="2" fill="none" stroke="#f2b43a" stroke-width="1.4"/>
    <text x="20" y="37" font-size="13" text-anchor="middle" fill="#f7efdf" font-family="Mochiy Pop One, sans-serif">守</text></svg>`;
}
// la bolsa grande de la apertura: piezas separadas para animarlas (volantes, cordón, nudo, luz)
function svgFuku() {
  const k = ++nSvg;
  return `<svg class="rc-fuku" viewBox="0 0 240 262" aria-hidden="true">
    <defs>
      <radialGradient id="fkc${k}" cx="36%" cy="30%" r="80%"><stop offset="0" stop-color="#f47a52"/><stop offset=".5" stop-color="#d8412a"/><stop offset="1" stop-color="#9d2c18"/></radialGradient>
      <radialGradient id="fkv${k}" cx="50%" cy="100%" r="90%"><stop offset="0" stop-color="#b8341f"/><stop offset=".6" stop-color="#e8553a"/><stop offset="1" stop-color="#f47a52"/></radialGradient>
      <linearGradient id="fko${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd978"/><stop offset="1" stop-color="#dc9a22"/></linearGradient>
      <radialGradient id="fkl${k}"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset=".45" stop-color="#fff3d2" stop-opacity=".85"/><stop offset="1" stop-color="#fff3d2" stop-opacity="0"/></radialGradient>
      <filter id="fkb${k}" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="5"/></filter>
    </defs>
    <ellipse class="fk-sombra" cx="120" cy="244" rx="86" ry="11" fill="#261f19" opacity=".38" filter="url(#fkb${k})"/>
    <g class="fk-bolsa">
      <ellipse class="fk-boca" cx="120" cy="104" rx="30" ry="8" fill="#6d1f10"/>
      <ellipse class="fk-luz" cx="120" cy="80" rx="70" ry="60" fill="url(#fkl${k})" opacity="0"/>
      <g class="fk-vol-i"><path d="M120 106 L89 106 C83 94 70 78 57 58 C65 51 74 58 80 49 C86 39 96 50 102 39 C108 31 116 42 120 37 Z" fill="url(#fkv${k})"/>
        <path d="M105 101 C101 86 94 72 86 58 M96 103 C90 92 82 82 72 70" stroke="#a8301d" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".45"/></g>
      <g class="fk-vol-d"><path d="M120 106 L151 106 C157 94 170 78 183 58 C175 51 166 58 160 49 C154 39 144 50 138 39 C132 31 124 42 120 37 Z" fill="url(#fkv${k})"/>
        <path d="M135 101 C139 86 146 72 154 58 M144 103 C150 92 158 82 168 70" stroke="#a8301d" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".45"/></g>
      <path class="fk-cuerpo" d="M88 106 C52 116 24 156 28 196 C31 228 70 242 120 242 C170 242 209 228 212 196 C216 156 188 116 152 106 Z" fill="url(#fkc${k})"/>
      <path d="M102 114 C92 146 86 178 92 226 M140 114 C150 146 156 178 150 226" stroke="#9d2c18" stroke-width="3" fill="none" stroke-linecap="round" opacity=".32"/>
      <path d="M40 200 C60 222 180 222 200 200" stroke="#7d2212" stroke-width="7" fill="none" stroke-linecap="round" opacity=".22"/>
      <ellipse cx="66" cy="160" rx="11" ry="27" fill="#fff" opacity=".22" transform="rotate(18 66 160)"/>
      <circle cx="120" cy="176" r="37" fill="#f7efdf"/><circle cx="120" cy="176" r="37" fill="none" stroke="url(#fko${k})" stroke-width="5"/>
      <circle cx="120" cy="176" r="29" fill="none" stroke="#e7d9b8" stroke-width="1.5"/>
      <text x="120" y="191" font-size="40" text-anchor="middle" fill="#261f19" font-family="Mochiy Pop One, sans-serif">福</text>
      <g class="fk-cordon"><rect x="84" y="98" width="72" height="14" rx="7" fill="url(#fko${k})" stroke="#b8801f" stroke-width="2"/></g>
      <g class="fk-nudo">
        <path d="M120 104 C104 83 83 88 92 103 C97 111 111 108 120 104 Z" fill="url(#fko${k})" stroke="#b8801f" stroke-width="2"/>
        <path d="M120 104 C136 83 157 88 148 103 C143 111 129 108 120 104 Z" fill="url(#fko${k})" stroke="#b8801f" stroke-width="2"/>
        <path d="M116 108 C112 120 106 129 99 141 M124 108 C130 120 136 128 143 139" stroke="#dc9a22" stroke-width="7" fill="none" stroke-linecap="round"/>
        <circle cx="120" cy="104" r="8" fill="#f2b43a" stroke="#b8801f" stroke-width="2"/></g>
    </g></svg>`;
}
// ilustración de un objeto (SVG del ilustrador) con respaldo tipográfico si aún no existe
export const ilustracion = (o, clase = '', attrs = '') => ILUS(o, clase, attrs);
// lo que aún no tienes: su silueta en el color de texto terciario del tema (sirve igual en claro y en oscuro; la imagen es solo la máscara)
export const silueta = (o) => `<span class="rc-ilus sil" style="--img:url(/img/objetos/${esc(o.id)}.svg)" aria-hidden="true"></span>`;
const ILUS = (o, clase = '', attrs = '') => `<span class="rc-ilus ${clase}" ${attrs}><img src="/img/objetos/${esc(o.id)}.svg" alt="" draggable="false" onerror="this.classList.add('roto')"><span class="rc-ilus-alt">${esc((o.jp || o.nombre || '?').slice(0, 3))}</span></span>`;

// ───────────────────────── estilos (propios del módulo) ─────────────────────────
const GRANO = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n' color-interpolation-filters='sRGB'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .3 0 0 0 0 .22 0 0 0 0 .12 0 0 0 .2 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;
const RELIEVE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1400' height='900' viewBox='0 0 1400 900' preserveAspectRatio='none'%3E%3Cfilter id='s' x='0' y='0' width='100%25' height='100%25' color-interpolation-filters='sRGB'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.0042 0.0062' numOctaves='5' seed='23'/%3E%3CfeDiffuseLighting surfaceScale='3.6' diffuseConstant='1.1' lighting-color='%23fff'%3E%3CfeDistantLight azimuth='235' elevation='56'/%3E%3C/feDiffuseLighting%3E%3CfeColorMatrix values='0 0 0 0 .22 0 0 0 0 .15 0 0 0 0 .06 -1.6 0 0 0 1.44'/%3E%3C/filter%3E%3Cfilter id='l' x='0' y='0' width='100%25' height='100%25' color-interpolation-filters='sRGB'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.0042 0.0062' numOctaves='5' seed='23'/%3E%3CfeDiffuseLighting surfaceScale='3.6' diffuseConstant='1.1' lighting-color='%23fff'%3E%3CfeDistantLight azimuth='235' elevation='56'/%3E%3C/feDiffuseLighting%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 .95 0 0 0 0 .82 3 0 0 0 -2.76'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23s)'/%3E%3Crect width='100%25' height='100%25' filter='url(%23l)'/%3E%3C/svg%3E")`;
const ESTILO = `
:root { /* arte: la sala de Mochi (yeso, tatami, madera) y su luz; todo lo demás sale de los tokens del tema */
  --rc-yeso:#8e7747; --rc-yeso-s:#6a5733; --rc-yeso-l:#b09a63; --rc-tatami:#c2b27a; --rc-tatami-2:#a8965e; --rc-madera:#6f4c30; --rc-madera-2:#94693f;
  --rc-sobre-sala:#f7efdf; --rc-oro-sala:#f2b43a; /* texto sobre la sala: ella siempre es oscura, en cualquier tema */
  --sobre-aviso: color-mix(in srgb, var(--aviso) 18%, black); }
.rc-logo { font-family: var(--f-titulo); font-weight: var(--peso-titulo); color: var(--acento); letter-spacing: .01em; line-height: 1; text-shadow: ${contorno(3, 3)}; }
.rc-logo.m { text-shadow: ${contorno(4, 4)}; }
.rc-logo.l { text-shadow: ${contorno(5.5, 6)}; }
.rc-logo.xl { text-shadow: ${contorno(9, 10)}; }
.rc-l { display: inline-block; will-change: transform; }
/* ficha: superficie plana del tema */
.rc-ficha { position: relative; background: var(--sup); border: var(--borde); border-radius: var(--radio); color: var(--tinta); box-shadow: var(--sombra); }
.rc-boton { display: inline-flex; align-items: center; justify-content: center; gap: 12px; height: 56px; padding: 0 24px; border: 0; border-radius: var(--radio-btn); cursor: pointer;
  background: var(--boton); color: var(--boton-tinta); font: 700 17px/1 var(--f-texto); letter-spacing: .01em; white-space: nowrap;
  box-shadow: var(--sombra-btn); transition: transform .15s var(--suave), background-color .15s var(--suave), filter .15s var(--suave); }
.rc-boton:hover { transform: translateY(-2px); filter: brightness(1.06); }
.rc-boton:active { transform: translateY(2px); filter: none; }
.rc-boton:focus-visible { outline: 3px solid var(--acento); outline-offset: 4px; }
.rc-boton.claro { background: var(--sup); color: var(--tinta); border: var(--borde); box-shadow: var(--sombra-peq); }
.rc-boton.claro:hover { background: var(--sup-2); filter: none; }
.rc-boton.peq { height: 40px; padding: 0 16px; font-size: 14px; gap: 8px; }
.rc-boton[disabled] { opacity: .5; pointer-events: none; }
/* teclas: claras sobre el botón de color, neutras sobre el claro */
.rc-boton kbd { font: 700 11px var(--f-texto); padding: 4px 8px; border-radius: 8px; background: color-mix(in srgb, var(--boton-tinta) 16%, transparent); color: var(--boton-tinta); box-shadow: none; }
.rc-boton.claro kbd { background: var(--sup-3); color: var(--tinta-2); }
/* ilustración de objeto con respaldo */
.rc-ilus { position: relative; display: grid; place-items: center; }
.rc-ilus img { width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 6px 5px rgba(38,31,25,.28)); /* arte: sombra del objeto */ user-select: none; }
.rc-ilus img.roto { display: none; }
.rc-ilus-alt { display: none; place-items: center; width: 80%; aspect-ratio: 1; border-radius: 28%; background: var(--sup-3); color: var(--tinta-2); font: var(--peso-titulo) 22px/1 var(--f-titulo); text-align: center; }
.rc-ilus img.roto + .rc-ilus-alt { display: grid; }

/* ── HUD de la portada ── */
.rc-hud { display: flex; flex-direction: column; gap: 12px; width: 100%; min-width: 260px; font-family: var(--f-texto); color: var(--tinta); pointer-events: auto; }
.rc-hud-flotante { position: absolute; left: 24px; bottom: 24px; z-index: 9; width: 300px; }
.rc-hud-fila { display: flex; gap: 12px; }
.rc-chip { display: flex; align-items: center; gap: 8px; height: 48px; box-sizing: border-box; padding: 0 16px 0 8px; border: var(--borde); border-radius: var(--radio); cursor: default; text-align: left; font: inherit;
  background: var(--sup); color: var(--tinta); box-shadow: var(--sombra-peq); transition: transform .15s var(--suave); }
.rc-chip b { display: block; font: 700 20px/1 var(--f-texto); font-variant-numeric: tabular-nums; }
.rc-chip small { display: block; margin-top: 4px; font: 700 10.5px/1.1 var(--f-texto); letter-spacing: .06em; text-transform: uppercase; color: var(--tinta-2); white-space: nowrap; }
@media (max-width: 1100px) { .rc-chip small .rc-largo { display: none; } }
.rc-chip:focus-visible, .rc-fuku-caja:focus-visible { outline: 3px solid var(--acento); outline-offset: 4px; }
.rc-fuku-caja:focus-visible { outline-offset: 6px; border-radius: 44%; }
.rc-chip.bolsas { cursor: pointer; flex: 1; }
.rc-chip.mis-movil { display: none; cursor: pointer; padding: 0 12px 0 8px; }
.rc-chip.mis-movil .rc-logo { font-size: 15px; }
.rc-chip.mis-movil.aviso { box-shadow: 0 0 0 3px var(--bien), var(--sombra-peq); }
.rc-chip.bolsas.con { background: var(--boton); color: var(--boton-tinta); box-shadow: var(--sombra-btn); }
.rc-chip.bolsas.con small { color: color-mix(in srgb, var(--boton-tinta) 80%, transparent); }
.rc-chip.bolsas.con:hover { transform: translateY(-2px); }
.rc-chip.bolsas:active { transform: translateY(2px); }
.rc-chip .rc-ico { width: 36px; height: 36px; display: grid; place-items: center; flex: none; }
.rc-chip .rc-ico img { width: 36px; height: 36px; }
.rc-misiones { padding: 12px 16px 12px; }
.rc-mis-cab { display: flex; align-items: center; gap: 12px; margin-bottom: 4px; }
.rc-mis-cab .rc-logo { font-size: 18px; }
.rc-mis-cab h3 { margin: 0; font: 700 15px/1.2 var(--f-texto); }
.rc-mis-cab p { margin: 2px 0 0; font: 500 11.5px/1.3 var(--f-texto); color: var(--tinta-2); }
.rc-mision { display: grid; grid-template-columns: 24px 1fr auto; align-items: center; gap: 12px; padding: 8px 0; border-top: 1px solid var(--linea); }
.rc-mis-cab + .rc-mision { border-top: 0; }
.rc-mis-check { width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; box-shadow: inset 0 0 0 2px var(--linea-2); font: 700 14px var(--f-texto); color: var(--boton-tinta); }
.rc-mision.hecha .rc-mis-check { background: var(--bien); box-shadow: none; }
.rc-mision.cobrada .rc-mis-check { background: var(--mal); color: var(--tinta-inv); box-shadow: none; font: var(--peso-titulo) 12px var(--f-titulo); }
.rc-mis-linea { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.rc-mis-txt { font: 600 13px/1.3 var(--f-texto); }
.rc-mision.cobrada .rc-mis-txt { color: var(--tinta-2); }
.rc-mis-barra { height: 8px; border-radius: 4px; background: var(--sup-3); margin-top: 4px; overflow: hidden; }
.rc-mis-barra i { display: block; height: 100%; border-radius: 4px; background: var(--acento); }
.rc-mision.hecha .rc-mis-barra i, .rc-mision.cobrada .rc-mis-barra i { background: var(--bien); }
.rc-mis-num { font: 700 11.5px var(--f-texto); font-variant-numeric: tabular-nums; color: var(--tinta-2); white-space: nowrap; }
.rc-mis-premio { display: flex; align-items: center; gap: 4px; font: 700 14px var(--f-texto); font-variant-numeric: tabular-nums; color: var(--aviso-txt); }
.rc-mision.cobrada .rc-mis-premio { opacity: .5; }
.rc-mis-pie { display: flex; align-items: center; gap: 8px; margin-top: 4px; padding: 8px 12px; border-radius: var(--radio-peq); background: var(--sup-2); font: 600 12px/1.3 var(--f-texto); color: var(--tinta-2); }
.rc-mis-pie .rc-puntos { display: flex; gap: 4px; flex: none; }
.rc-mis-pie .rc-puntos i { width: 8px; height: 8px; border-radius: 50%; background: var(--linea-2); }
.rc-mis-pie .rc-puntos i.si { background: var(--acento); }
.rc-omamori-mini { display: flex; align-items: center; gap: 8px; padding: 8px 12px 8px 8px; border-radius: var(--radio-peq); background: var(--sup); border: var(--borde); font: 600 12px var(--f-texto); color: var(--tinta-2); align-self: flex-start; box-shadow: var(--sombra-peq); }

/* ── capa de pantalla completa (bolsas, nivel) ── */
.rc-capa { position: fixed; inset: 0; z-index: 80; overflow: hidden; display: grid; place-items: center; font-family: var(--f-texto); color: var(--tinta); user-select: none; -webkit-user-select: none; }
.rc-sala { position: absolute; inset: 0; --hz: 70%; background: var(--rc-yeso); overflow: hidden; }
.rc-pared { position: absolute; left: 0; right: 0; top: 0; height: var(--hz); background: radial-gradient(56% 70% at 50% 60%, #ae8f4f 0%, #9b7d43 32%, #8a6f3b 58%, #6c552e 88%, #5b4727 100%); }
.rc-pared::before { content: ""; position: absolute; inset: 0; opacity: .75; background: ${RELIEVE} center / cover; }
.rc-pared::after { content: ""; position: absolute; inset: 0; opacity: .6; background: ${GRANO}; background-size: 180px; }
.rc-pared-luz { position: absolute; left: 50%; top: 58%; width: 70%; height: 95%; transform: translate(-50%, -50%); background: radial-gradient(closest-side, rgba(255,226,164,.2), rgba(255,214,140,.06) 55%, transparent); }
.rc-suelo { position: absolute; left: 0; right: 0; top: var(--hz); bottom: 0; overflow: hidden; perspective: 470px; perspective-origin: 50% 0; background: #9d8a55; }
.rc-suelo i { position: absolute; left: -160%; right: -160%; top: 0; height: 1400px; transform-origin: 50% 0; transform: rotateX(74deg); background-color: #ad9a62;
  background-image:
    linear-gradient(90deg, transparent calc(50% - 36px), #a07e55 calc(50% - 36px) calc(50% - 31px), #4a3a2c calc(50% - 31px) calc(50% - 11px), #74604a calc(50% - 11px) calc(50% - 7px), #2b221b calc(50% - 7px) calc(50% + 7px), #74604a calc(50% + 7px) calc(50% + 11px), #4a3a2c calc(50% + 11px) calc(50% + 31px), #86684a calc(50% + 31px) calc(50% + 36px), transparent calc(50% + 36px)),
    repeating-linear-gradient(90deg, transparent 0 488px, #5a4c2b 488px 499px, #857449 499px 502px, transparent 502px 1000px),
    repeating-linear-gradient(0deg, rgba(82,62,24,.3) 0 1.5px, transparent 1.5px 5px),
    repeating-linear-gradient(0deg, rgba(255,246,204,.16) 0 2px, transparent 2px 8px); }
.rc-suelo::after { content: ""; position: absolute; inset: 0; background: linear-gradient(rgba(58,40,18,.5), rgba(58,40,18,0) 14%, rgba(60,38,14,.08) 45%, rgba(52,30,10,.58)); }
.rc-zocalo { position: absolute; left: 0; right: 0; top: calc(var(--hz) - 13px); height: 15px; background: linear-gradient(#a57a4b, var(--rc-madera-2) 30%, var(--rc-madera) 70%, #4b311d);
  box-shadow: 0 -6px 14px -4px rgba(40,24,8,.45), 0 3px 5px rgba(30,18,6,.4); }
.rc-sala .rc-vineta { position: absolute; inset: 0; background: radial-gradient(90% 85% at 50% 46%, transparent 52%, rgba(36,20,6,.45) 100%), linear-gradient(transparent 76%, rgba(34,20,8,.38)); }
.rc-sala .rc-desenfoque { position: absolute; left: -3%; bottom: -4%; width: 20%; height: 18%; border-radius: 16px; background: linear-gradient(180deg, #6a4a2c, #3d2a19); filter: blur(9px); opacity: .9; }
.rc-sala .rc-desenfoque.b { left: auto; right: -2%; bottom: 3%; width: 13%; height: 13%; border-radius: 50% 50% 40% 40%; background: radial-gradient(circle at 40% 35%, #ffb08a, #e9683e); filter: blur(12px); opacity: .85; }
.rc-rayos { position: absolute; left: 50%; top: 46%; width: 1400px; height: 1400px; margin: -700px 0 0 -700px; border-radius: 50%; pointer-events: none; opacity: 0;
  background: repeating-conic-gradient(from 0deg, var(--rc-luz, #fff3d2) 0deg 6deg, transparent 6deg 18deg);
  -webkit-mask: radial-gradient(closest-side, #000 8%, rgba(0,0,0,.5) 40%, transparent 72%); mask: radial-gradient(closest-side, #000 8%, rgba(0,0,0,.5) 40%, transparent 72%); }
.rc-halo { position: absolute; left: 50%; top: 46%; width: 640px; height: 640px; margin: -320px 0 0 -320px; border-radius: 50%; pointer-events: none; opacity: 0;
  background: radial-gradient(closest-side, var(--rc-luz, #fff3d2), transparent); }
.rc-destello { position: absolute; inset: 0; background: #fffaf0; opacity: 0; pointer-events: none; z-index: 5; }
.rc-cab-capa { position: absolute; left: 0; right: 0; top: 0; display: flex; align-items: center; justify-content: space-between; padding: 24px 32px; z-index: 3; }
.rc-cab-capa .rc-titulo { display: flex; align-items: center; gap: 16px; }
.rc-cab-capa .rc-titulo .rc-logo { font-size: 46px; }
.rc-cab-capa .rc-titulo > div { font: 700 16px/1.2 var(--f-texto); color: var(--rc-sobre-sala); text-shadow: 0 1px 6px rgba(20,12,4,.5); }
.rc-cab-capa .rc-titulo small { display: block; font: 600 12.5px var(--f-texto); opacity: .85; margin-top: 4px; }
.rc-cab-der { display: flex; gap: 12px; }
.rc-escena { position: relative; width: 100%; height: 100%; z-index: 2; }
.rc-fuku-caja { position: absolute; left: 50%; top: 72%; width: 280px; height: 306px; margin: -290px 0 0 -140px; cursor: pointer; transform-origin: 50% 94%; outline: none; }
.rc-fuku { width: 100%; height: 100%; overflow: visible; display: block; }
.rc-fuku-brillo { position: absolute; left: 50%; top: 56%; width: 440px; height: 440px; margin: -220px 0 0 -220px; border-radius: 50%; pointer-events: none; opacity: 0;
  background: radial-gradient(closest-side, var(--rc-luz, #fff3d2), transparent 80%); }
.rc-pista { position: absolute; left: 50%; bottom: 7%; transform: translateX(-50%); z-index: 4; display: flex; align-items: center; gap: 12px; padding: 12px 20px; border-radius: var(--radio-peq); border: var(--borde);
  background: color-mix(in srgb, var(--sup) 94%, transparent); box-shadow: var(--sombra-flotante); color: var(--tinta); font: 700 15px var(--f-texto); white-space: nowrap; }
.rc-pista kbd { font: 700 11px var(--f-texto); padding: 4px 8px; border-radius: 8px; background: var(--sup-3); color: var(--tinta-2); box-shadow: none; }
.rc-pista .rc-boton { margin-left: 4px; }
.rc-pista .rc-boton kbd { background: color-mix(in srgb, var(--boton-tinta) 16%, transparent); color: var(--boton-tinta); }
/* «Abrir todas»: rejilla que se llena y resumen */
.rc-todas { position: absolute; left: 50%; top: 92px; transform: translateX(-50%); width: min(1100px, calc(100vw - 32px)); z-index: 3; display: grid; justify-items: center; gap: 16px; }
.rc-todas-cab { display: grid; justify-items: center; gap: 12px; text-align: center; min-height: 96px; align-content: start; }
.rc-todas-cab h2 { margin: 0; font: 700 32px/1.1 var(--f-texto); color: var(--rc-sobre-sala); text-shadow: 0 2px 10px rgba(20,12,4,.5); }
.rc-todas-cab h2 b { color: var(--rc-oro-sala); font-variant-numeric: tabular-nums; }
.rc-todas-cifras { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
.rc-todas-cifras span { display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: var(--radio-peq); background: var(--sup); border: var(--borde); color: var(--tinta); font: 700 14px/1 var(--f-texto); box-shadow: var(--sombra-peq); }
.rc-todas-cifras span i { width: 12px; height: 12px; border-radius: 50%; background: var(--c); }
.rc-todas-cifras span.nuevo b { font: var(--peso-titulo) 13px/1 var(--f-titulo); color: var(--tinta-inv); background: var(--mal); border-radius: 8px; padding: 4px 8px; }
.rc-todas-rejilla { position: relative; display: grid; grid-template-columns: repeat(var(--cols, 5), var(--tam, 140px)); gap: var(--gap, 14px); justify-content: center; padding: 12px 16px 16px; overflow: auto; scrollbar-width: thin; }
.rc-mini { position: relative; width: var(--tam, 140px); aspect-ratio: .8; border-radius: calc(var(--tam, 140px) * .13); display: flex; flex-direction: column; align-items: center; padding: 8% 7% 7%; text-align: center; color: var(--tinta);
  background: var(--sup); box-shadow: inset 0 0 0 3px var(--c), var(--sombra-peq);
  outline: none; transition: transform .2s var(--muelle); }
.rc-mini .rc-mini-ilus { width: 100%; flex: 1; min-height: 0; border-radius: calc(var(--tam, 140px) * .09); background: var(--cl); display: grid; place-items: center; overflow: hidden; }
.rc-mini .rc-ilus { width: 80%; height: 86%; }
.rc-mini .rc-ilus-alt { font-size: calc(var(--tam, 140px) * .16); }
.rc-mini b { margin-top: 6%; font: 700 max(10.5px, calc(var(--tam, 140px) * .095))/1.1 var(--f-texto); max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rc-mini small { font: 700 max(8px, calc(var(--tam, 140px) * .068))/1 var(--f-texto); letter-spacing: .1em; text-transform: uppercase; color: var(--cc); margin-top: 3%; }
/* el sello escala con la carta: en las rejillas grandes no tapa media carta */
.rc-mini-sello { position: absolute; right: calc(var(--tam, 140px) * -.065); top: calc(var(--tam, 140px) * -.065); z-index: 2; min-width: max(22px, calc(var(--tam, 140px) * .23)); height: max(22px, calc(var(--tam, 140px) * .23)); padding: 0 .45em; border-radius: 999px; display: grid; place-items: center;
  font: var(--peso-titulo) max(11px, calc(var(--tam, 140px) * .107))/1 var(--f-titulo); font-style: normal; color: var(--mal-txt); background: color-mix(in srgb, var(--mal) 12%, var(--sup)); box-shadow: inset 0 0 0 2px var(--mal); transform: rotate(10deg); }
.rc-mini-sello.koban { background: color-mix(in srgb, var(--aviso) 20%, var(--sup)); color: var(--aviso-txt); box-shadow: inset 0 0 0 2px var(--aviso); font: 700 max(10px, calc(var(--tam, 140px) * .09))/1 var(--f-texto); font-variant-numeric: tabular-nums; }
.rc-mini .rc-holo { inset: 3px; border-radius: inherit; }
.rc-mini:focus-visible { outline: 3px solid var(--acento); outline-offset: 4px; transform: translateY(-5px) scale(1.04); }
.rc-mini.hueco { visibility: hidden; }
.rc-mini-vuela { position: fixed; left: 0; top: 0; z-index: 6; pointer-events: none; }
.rc-fuku-caja.peq { top: 97%; width: 140px; height: 153px; margin: -158px 0 0 -70px; cursor: default; }
.rc-fuku-brillo.peq { top: 90%; width: 300px; height: 300px; margin: -150px 0 0 -150px; }
.rc-pista-todas { left: auto; right: 28px; bottom: 28px; transform: none; }
@media (max-width: 720px) { .rc-pista-todas { right: 16px; left: 16px; bottom: 16px; justify-content: center; white-space: normal; } }
.rc-acciones { position: absolute; left: 50%; bottom: 6%; transform: translateX(-50%); z-index: 4; display: flex; gap: 12px; align-items: center; }
/* carta de objeto */
.rc-carta-caja { position: absolute; left: 50%; top: 45%; width: 300px; height: 408px; margin: -204px 0 0 -150px; perspective: 1200px; z-index: 3; }
.rc-carta, .rc-carta-inclina { position: absolute; inset: 0; transform-style: preserve-3d; }
.rc-cara, .rc-dorso { position: absolute; inset: 0; border-radius: 28px; backface-visibility: hidden; -webkit-backface-visibility: hidden; }
.rc-cara { background: var(--sup); box-shadow: inset 0 0 0 5px var(--c), var(--sombra-flotante);
  padding: 24px 24px 20px; display: flex; flex-direction: column; align-items: center; text-align: center; }
/* arte: el dorso de la carta (la bolsa de la suerte) */
.rc-dorso { transform: rotateY(180deg); background: radial-gradient(circle at 50% 45%, #f47a52, #d8412a 60%, #a8301d); box-shadow: inset 0 0 0 6px #f2b43a, 0 9px 0 #8a2614, 0 34px 50px -18px rgba(38,31,25,.7);
  display: grid; place-items: center; }
.rc-dorso span { font: var(--peso-titulo) 120px/1 var(--f-titulo); color: #f7efdf; text-shadow: 0 6px 0 rgba(90,20,10,.35); }
.rc-dorso::before { content: ""; position: absolute; inset: 18px; border-radius: 20px; border: 3px dashed rgba(247,239,223,.45); }
.rc-carta-ilus { width: 100%; height: 190px; flex: none; border-radius: var(--radio); background: var(--cl); display: grid; place-items: center; overflow: hidden; }
.rc-carta-ilus .rc-ilus { width: 78%; height: 88%; }
.rc-carta-ilus .rc-ilus-alt { width: 120px; font-size: 34px; }
.rc-carta-jp { margin-top: 16px; font: 700 15px var(--f-jp); color: var(--tinta-2); letter-spacing: .06em; }
.rc-carta-nombre { font: 700 26px/1.15 var(--f-texto); margin-top: 4px; text-wrap: balance; }
.rc-carta-desc { margin: 8px 0 0; font: 500 13.5px/1.45 var(--f-texto); color: var(--tinta-2); }
.rc-carta-tipo { margin-top: auto; padding-top: 8px; font: 700 10.5px var(--f-texto); letter-spacing: .16em; text-transform: uppercase; color: var(--cc); }
.rc-pegatina { position: absolute; left: -12px; top: 20px; z-index: 2; padding: 8px 12px; border-radius: var(--radio-peq); background: var(--sup); color: var(--cc); font: 700 13px/1 var(--f-texto); letter-spacing: .04em;
  transform: rotate(-6deg); box-shadow: inset 0 0 0 2px var(--c), var(--sombra-flotante); }
.rc-nuevo { position: absolute; right: -20px; top: -20px; z-index: 3; width: 92px; height: 92px; border-radius: 50%; display: grid; place-items: center; align-content: center; background: var(--mal); color: var(--tinta-inv);
  text-align: center; transform: rotate(10deg); box-shadow: 0 0 0 4px var(--sup), var(--sombra-flotante); }
.rc-nuevo b { font: var(--peso-titulo) 36px/1 var(--f-titulo); }
.rc-nuevo small { font: 800 11.5px/1 var(--f-texto); letter-spacing: .06em; margin-top: 4px; }
.rc-repe { position: absolute; right: -16px; top: -16px; z-index: 3; padding: 8px 12px; border-radius: var(--radio-peq); display: flex; align-items: center; gap: 8px; background: color-mix(in srgb, var(--aviso) 22%, var(--sup)); color: var(--aviso-txt);
  font: 700 19px/1 var(--f-texto); transform: rotate(8deg); box-shadow: inset 0 0 0 2px var(--aviso), var(--sombra-flotante); text-align: left; }
.rc-repe small { font: 600 11px var(--f-texto); display: block; }
.rc-brillo { position: absolute; inset: 0; border-radius: 30px; pointer-events: none; background: radial-gradient(circle at var(--mx, 30%) var(--my, 18%), rgba(255,255,255,.65), transparent 42%); mix-blend-mode: soft-light; }
.rc-holo { position: absolute; inset: 6px; border-radius: 24px; pointer-events: none; mix-blend-mode: overlay; opacity: .8; background-size: 260% 100%;
  background-image: linear-gradient(115deg, transparent 22%, rgba(255,220,130,.6) 36%, rgba(255,255,255,.75) 42%, rgba(190,140,255,.5) 50%, rgba(120,220,255,.4) 56%, transparent 68%); animation: rc-holo 3.4s linear infinite; }
@keyframes rc-holo { from { background-position: 130% 0; } to { background-position: -130% 0; } }
@media (prefers-reduced-motion: reduce) { .rc-holo { animation: none; } .rc-boton, .rc-chip, .rc-mini, .rc-articulo, .rc-pestana, .rc-filtros button, .rc-progreso i { transition: none; } .rc-boton:hover, .rc-articulo:hover { transform: none; } }
/* la rareza: su color sale de los tokens del tema (--c); --cc para el texto y --cl para el fondo de la ilustración */
.r-comun, .r-raro, .r-epico, .r-legendario { --cc: color-mix(in srgb, var(--c) 55%, var(--tinta)); --cl: color-mix(in srgb, var(--c) 14%, var(--sup)); }
.r-comun { --c: var(--tinta-3); --rc-luz:#fff3d2; }
.r-raro { --c: var(--r1); --rc-luz:#9fd0ff; }
.r-epico { --c: var(--t-gram); --rc-luz:#d9a6ff; }
.r-legendario { --c: var(--aviso); --rc-luz:#ffd25a; }   /* --rc-luz: la luz de la apertura (arte) */

/* subir de nivel */
.rc-nivel-centro { position: relative; z-index: 3; display: grid; justify-items: center; text-align: center; margin-top: -32px; }
.rc-nivel-ante { font: 700 18px var(--f-texto); color: var(--rc-sobre-sala); letter-spacing: .16em; text-transform: uppercase; text-shadow: 0 1px 8px rgba(20,12,4,.5); }
.rc-nivel-titulo { font-size: clamp(52px, 8.4vw, 120px); margin: 16px 0 4px; white-space: nowrap; }
.rc-medalla { position: relative; width: 192px; height: 192px; margin-top: 16px; perspective: 800px; }
.rc-medalla-cara { position: absolute; inset: 0; border-radius: 50%; display: grid; place-items: center; align-content: center; background: var(--boton);
  box-shadow: inset 0 0 0 8px var(--sup), var(--sombra-flotante); color: var(--boton-tinta); }
.rc-medalla-cara small { font: 700 15px var(--f-texto); letter-spacing: .2em; text-transform: uppercase; opacity: .9; }
.rc-medalla-cara b { font: 700 92px/0.92 var(--f-texto); font-variant-numeric: tabular-nums; display: block; height: 86px; overflow: hidden; }
.rc-medalla-cara b span { display: block; }
.rc-premios { display: flex; gap: 16px; margin-top: 32px; }
.rc-premio { display: flex; align-items: center; gap: 12px; padding: 8px 20px 8px 12px; border-radius: var(--radio); font: 700 18px var(--f-texto); font-variant-numeric: tabular-nums; }

/* combo */
.rc-combo { position: fixed; left: 36px; bottom: 32px; z-index: 16; display: flex; align-items: center; gap: 16px; pointer-events: none; font-family: var(--f-texto); }
.rc-combo-ficha { position: relative; width: 84px; height: 84px; border-radius: 50%; display: grid; place-items: center; align-content: center; color: var(--tinta);
  background: var(--sup); --sombra-f: var(--sombra); box-shadow: var(--sombra-f); }
.rc-combo-ficha b { font: 700 38px/0.9 var(--f-texto); font-variant-numeric: tabular-nums; display: block; }
.rc-combo-ficha span { font: var(--peso-titulo) 12px/1 var(--f-titulo); opacity: .75; margin-top: 4px; }
.rc-combo-aura { position: absolute; left: -14px; top: 50%; width: 112px; height: 112px; margin-top: -56px; border-radius: 50%; opacity: 0; pointer-events: none; z-index: -1;
  background: repeating-conic-gradient(from 0deg, var(--aura, #f2b43a) 0deg 9deg, transparent 9deg 30deg);
  -webkit-mask: radial-gradient(closest-side, transparent 60%, #000 64%, rgba(0,0,0,.6) 82%, transparent 100%); mask: radial-gradient(closest-side, transparent 60%, #000 64%, rgba(0,0,0,.6) 82%, transparent 100%); }
@keyframes rc-aura { to { transform: rotate(360deg); } }
@keyframes rc-latido { 0%, 100% { box-shadow: var(--sombra-f), 0 0 0 0 var(--latido, transparent); } 50% { box-shadow: var(--sombra-f), 0 0 0 10px transparent; } }
.rc-combo.c1 .rc-combo-ficha { color: var(--acento-tinta); box-shadow: inset 0 0 0 4px var(--acento), var(--sombra); }
.rc-combo.c2 .rc-combo-ficha, .rc-combo.c3 .rc-combo-ficha, .rc-combo.c4 .rc-combo-ficha, .rc-combo.c5 .rc-combo-ficha, .rc-combo.c6 .rc-combo-ficha { color: var(--tinta-inv); animation: rc-latido 1.6s ease-in-out infinite; }
.rc-combo.c2 .rc-combo-ficha { background: var(--acento); box-shadow: var(--sombra-f); --latido: color-mix(in srgb, var(--acento) 40%, transparent); }
.rc-combo.c3 .rc-combo-ficha, .rc-combo.c4 .rc-combo-ficha { background: var(--mal); box-shadow: var(--sombra-f); --latido: color-mix(in srgb, var(--mal) 45%, transparent); }
.rc-combo.c4 .rc-combo-ficha { animation-duration: 1.1s; }
.rc-combo.c5 .rc-combo-ficha, .rc-combo.c6 .rc-combo-ficha { background: var(--aviso); color: var(--sobre-aviso); box-shadow: var(--sombra-f); --latido: color-mix(in srgb, var(--aviso) 55%, transparent); animation-duration: 1s; }
.rc-combo.c6 .rc-combo-ficha::after { content: ""; position: absolute; inset: 4px; border-radius: 50%; mix-blend-mode: overlay; background-size: 260% 100%; pointer-events: none;
  background-image: linear-gradient(115deg, transparent 22%, rgba(255,220,130,.7) 36%, rgba(255,255,255,.85) 42%, rgba(190,140,255,.55) 50%, rgba(120,220,255,.45) 56%, transparent 68%); animation: rc-holo 2.2s linear infinite; }
.rc-combo.c4 .rc-combo-aura { opacity: .75; --aura: #ff9a52; animation: rc-aura 7s linear infinite; }
.rc-combo.c5 .rc-combo-aura { opacity: .9; --aura: #f2b43a; animation: rc-aura 5s linear infinite; }
.rc-combo.c6 .rc-combo-aura { opacity: 1; --aura: #ffd25a; left: -22px; width: 128px; height: 128px; margin-top: -64px; animation: rc-aura 3s linear infinite; }
.rc-combo-rayos { position: absolute; left: 42px; top: 50%; width: 420px; height: 420px; margin: -210px 0 0 -210px; border-radius: 50%; pointer-events: none; opacity: 0; z-index: -2;
  background: repeating-conic-gradient(from 0deg, rgba(255,226,140,.75) 0deg 7deg, transparent 7deg 20deg); -webkit-mask: radial-gradient(closest-side, #000 10%, rgba(0,0,0,.4) 45%, transparent 75%); mask: radial-gradient(closest-side, #000 10%, rgba(0,0,0,.4) 45%, transparent 75%); }
.rc-flash { position: fixed; inset: 0; z-index: 94; pointer-events: none; opacity: 0; }
@media (prefers-reduced-motion: reduce) { .rc-combo-ficha, .rc-combo-aura, .rc-combo.c6 .rc-combo-ficha::after { animation: none !important; } }
.rc-combo-info { display: grid; gap: 8px; }
.rc-combo-txt { font: 700 16px/1.2 var(--f-texto); color: var(--tinta); }
.rc-combo-barra { width: 130px; height: 8px; border-radius: 4px; background: var(--sup-3); overflow: hidden; }
.rc-combo-barra i { display: block; height: 100%; width: 0; border-radius: 4px; background: var(--acento); }
.rc-combo.c3 .rc-combo-barra i, .rc-combo.c4 .rc-combo-barra i { background: var(--mal); }
.rc-combo.c5 .rc-combo-barra i, .rc-combo.c6 .rc-combo-barra i { background: var(--aviso); }
.rc-combo.c5 .rc-combo-txt, .rc-combo.c6 .rc-combo-txt { color: var(--aviso-txt); }
.rc-combo-x2 { position: absolute; right: -14px; top: -10px; padding: 4px 8px; border-radius: 8px; background: var(--tinta); color: var(--tinta-inv); font: 700 14px/1 var(--f-texto); box-shadow: 0 0 0 2px var(--aviso); transform: rotate(10deg); }
.rc-cinta { position: fixed; left: 32px; bottom: 132px; z-index: 70; pointer-events: none; display: grid; justify-items: start; }
.rc-cinta.grande .rc-logo { font-size: 58px; }
.rc-cinta-banda { padding: 16px 32px; border-radius: var(--radio); background: var(--sup); border: var(--borde); box-shadow: var(--sombra-flotante); display: grid; justify-items: center; }
.rc-cinta .rc-logo { font-size: 44px; white-space: nowrap; }
.rc-cinta small { margin-top: 8px; font: 700 15px var(--f-texto); color: var(--tinta-2); letter-spacing: .04em; }
.rc-luz-escena { position: fixed; inset: 0; z-index: 14; pointer-events: none; opacity: 0; background: radial-gradient(70% 60% at 50% 40%, rgba(255,214,140,.22), rgba(255,190,90,.07) 55%, transparent 75%), radial-gradient(120% 90% at 50% 40%, transparent 60%, rgba(242,102,27,.12)); }
.rc-luz-escena.oro { background: radial-gradient(70% 60% at 50% 40%, rgba(255,226,140,.3), rgba(242,180,58,.1) 55%, transparent 78%), radial-gradient(120% 90% at 50% 40%, transparent 55%, rgba(242,180,58,.2)); }

/* barra de XP */
.rc-xp { display: flex; align-items: center; gap: 12px; min-width: 250px; font-family: var(--f-texto); }
.rc-xp-nivel { position: relative; width: 44px; height: 44px; flex: none; border-radius: 50%; display: grid; place-items: center; align-content: center; color: var(--boton-tinta);
  background: var(--boton); box-shadow: var(--sombra-btn); }
.rc-xp-nivel small { font: 700 8.5px/1 var(--f-texto); letter-spacing: .12em; text-transform: uppercase; }   /* sin opacidad: blanco sobre el botón son 4,7:1; con .9, 4,1 */
.rc-xp-nivel b { font: 700 19px/1 var(--f-texto); font-variant-numeric: tabular-nums; }
.rc-xp-cuerpo { flex: 1; display: grid; gap: 4px; }
.rc-xp-pista { position: relative; height: 12px; border-radius: 6px; background: var(--sup-3); overflow: hidden; }
.rc-xp-relleno { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 6px; background: var(--aviso); }
.rc-xp-destello { position: absolute; inset: 0; background: color-mix(in srgb, var(--aviso) 30%, white); opacity: 0; border-radius: 6px; }
.rc-xp-txt { font: 600 11.5px var(--f-texto); font-variant-numeric: tabular-nums; color: var(--tinta-2); display: flex; justify-content: space-between; gap: 12px; }
.rc-xp-txt b { font: 700 12.5px var(--f-texto); color: var(--tinta); }
.rc-orbe { position: fixed; left: 0; top: 0; width: 16px; height: 16px; margin: -8px 0 0 -8px; border-radius: 50%; z-index: 96; pointer-events: none;
  background: radial-gradient(circle at 35% 30%, #fffbe6, #ffd978 40%, #f2b43a 70%, #c98a1c); box-shadow: 0 0 12px 3px rgba(255,210,110,.7); }
.rc-mas-xp { position: fixed; z-index: 96; pointer-events: none; font: var(--peso-titulo) 24px/1 var(--f-titulo); color: var(--aviso-txt); text-shadow: ${contorno(3, 3)}; transform: translate(-50%, -50%); white-space: nowrap; }
.rc-moneda-vuela { position: fixed; left: 0; top: 0; z-index: 97; pointer-events: none; margin: -16px 0 0 -13px; }

/* fin de sesión */
.rc-fin { display: grid; gap: 16px; width: min(560px, 100%); margin: 28px auto 0; text-align: left; }
.rc-fin .rc-misiones { padding: 16px 20px 12px; }
.rc-fin-cab { display: flex; align-items: center; justify-content: space-between; font: 700 13px var(--f-texto); letter-spacing: .14em; text-transform: uppercase; color: var(--tinta-2); }
.rc-fin-bolsa { display: grid; grid-template-columns: 92px 1fr auto; align-items: center; gap: 16px; padding: 16px 20px; }
.rc-fin-bolsa h4 { margin: 0; font: 700 21px/1.2 var(--f-texto); }
.rc-fin-bolsa p { margin: 4px 0 0; font: 500 13px/1.4 var(--f-texto); color: var(--tinta-2); }
.rc-fin-meta { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: var(--radio-peq); background: var(--sup-2); font: 600 14px/1.4 var(--f-texto); color: var(--tinta-2); }
.rc-fin-meta b { color: var(--tinta); }
.rc-fin-meta .rc-flecha { font: var(--peso-titulo) 20px var(--f-titulo); color: var(--acento-tinta); }

/* pantallas finales del estudio */
.rc-final { text-align: center; padding-top: 24px; font-family: var(--f-texto); color: var(--tinta); }
.rc-progreso { width: min(460px, 100%); height: 12px; margin: 0 auto; border-radius: 6px; background: var(--sup-3); overflow: hidden; }
.rc-progreso i { display: block; height: 100%; border-radius: 6px; background: var(--acento); transition: width .45s var(--suave); }
.rc-final-ante { font: 700 12px var(--f-texto); letter-spacing: .24em; text-transform: uppercase; color: var(--tinta-2); }
.rc-final-tit { margin: 12px 0 16px; font: var(--peso-titulo) clamp(40px, 5vw, 62px)/1.05 var(--f-titulo); letter-spacing: -.01em; text-wrap: balance; }
.rc-final-xp { font-size: 56px; margin: 24px 0 8px; color: var(--acento-tinta); display: inline-block; font-variant-numeric: tabular-nums; }
.rc-final-nota { margin: 8px 0 0; font: 500 15px/1.5 var(--f-texto); color: var(--tinta-2); }
.rc-hanko { display: inline-grid; place-items: center; width: 168px; height: 168px; margin: 16px 0 8px; border-radius: var(--radio); background: var(--mal); color: var(--tinta-inv);
  font: 600 116px/1 var(--f-kaisho); transform: rotate(-6deg);
  box-shadow: inset 0 0 0 8px var(--mal), inset 0 0 0 11px color-mix(in srgb, var(--tinta-inv) 80%, transparent), var(--sombra); }
.rc-hanko-txt { font: 700 22px var(--f-texto); margin-top: 8px; }
.rc-stats { display: flex; gap: 16px; justify-content: center; margin-top: 24px; flex-wrap: wrap; }
.rc-stat { min-width: 132px; padding: 16px 20px 12px; }
.rc-stat b { display: block; font: 700 40px/1.1 var(--f-texto); font-variant-numeric: tabular-nums; }
.rc-stat small { font: 600 12.5px var(--f-texto); color: var(--tinta-2); }
.rc-stat.oro b { color: var(--aviso-txt); }
/* colección 図鑑 */
.rc-zukan { font-family: var(--f-texto); color: var(--tinta); }
.rc-zukan-cab { display: grid; grid-template-columns: auto 1fr auto; gap: 20px; align-items: center; margin-bottom: 20px; }
.rc-zukan-cab .rc-logo { font-size: 50px; }
.rc-zukan-cab h3 { margin: 0; font: 700 28px/1.15 var(--f-texto); }
.rc-zukan-cab p { margin: 4px 0 0; font: 600 14px/1.4 var(--f-texto); color: var(--tinta-2); font-variant-numeric: tabular-nums; }
.rc-zukan-barra { height: 12px; border-radius: 6px; background: var(--sup-3); margin-top: 12px; overflow: hidden; max-width: 440px; }
.rc-zukan-barra i { display: block; height: 100%; border-radius: 6px; background: var(--acento); }
.rc-rarezas { display: flex; gap: 16px; margin-top: 12px; flex-wrap: wrap; }
.rc-rarezas span { display: flex; align-items: center; gap: 8px; font: 600 12.5px var(--f-texto); color: var(--tinta-2); font-variant-numeric: tabular-nums; }
.rc-rarezas i { width: 12px; height: 12px; border-radius: 50%; background: var(--c); }
.rc-filtros { display: flex; gap: 4px; padding: 4px; border-radius: var(--radio-peq); background: var(--sup-2); }
.rc-filtros button { border: 0; background: transparent; min-height: 40px; padding: 0 16px; border-radius: calc(var(--radio-peq) - 2px); font: 700 13.5px var(--f-texto); color: var(--tinta-2); cursor: pointer; transition: background-color .15s var(--suave), color .15s var(--suave); }
.rc-filtros button:hover { color: var(--tinta); }
.rc-filtros button.si { background: var(--sup); color: var(--tinta); box-shadow: var(--sombra-peq); }
.rc-filtros button:focus-visible { outline: 2px solid var(--acento); outline-offset: 2px; }
.rc-rejilla { display: grid; grid-template-columns: repeat(auto-fill, minmax(136px, 1fr)); gap: 16px; perspective: 1000px; }
.rc-hueco { position: relative; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 16px 8px 12px; border: 0; border-radius: var(--radio); text-align: center; font: inherit; color: inherit;
  min-height: 172px; transform-style: preserve-3d; }
.rc-hueco.tiene { cursor: pointer; background: var(--sup); box-shadow: inset 0 0 0 3px var(--c), var(--sombra-peq); }
.rc-hueco.tiene:focus-visible { outline: 3px solid var(--acento); outline-offset: 3px; }
.rc-hueco.falta { background: var(--sup-2); outline: 2px dashed var(--linea-2); outline-offset: -2px; }
.rc-hueco .rc-ilus { width: 92px; height: 92px; }
.rc-ilus.sil { background: var(--tinta-3); opacity: .7; -webkit-mask: var(--img) center / contain no-repeat; mask: var(--img) center / contain no-repeat; }
.rc-hueco.falta .rc-ilus-alt { background: transparent; box-shadow: none; color: var(--tinta-3); }
.rc-hueco b { font: 700 14px/1.2 var(--f-texto); margin-top: 8px; }
.rc-hueco small { font: 600 11.5px var(--f-jp); color: var(--tinta-2); }
.rc-hueco.falta b { color: var(--tinta-3); letter-spacing: .1em; }
.rc-hueco.falta small { color: var(--cc); font-family: var(--f-texto); }
.rc-hueco .rc-n { position: absolute; left: 12px; top: 8px; font: 700 12px var(--f-texto); font-variant-numeric: tabular-nums; color: var(--tinta-2); font-style: normal; }
.rc-hueco .rc-nuevo-mini { position: absolute; right: -8px; top: -8px; padding: 4px 8px; border-radius: 8px; background: color-mix(in srgb, var(--mal) 12%, var(--sup)); color: var(--mal-txt); font: var(--peso-titulo) 10.5px/1 var(--f-titulo); font-style: normal;
  transform: rotate(8deg); box-shadow: inset 0 0 0 2px var(--mal); }
.rc-hueco .rc-puesto { position: absolute; right: 8px; top: 8px; width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; background: var(--bien); color: var(--boton-tinta); font: 700 12px var(--f-texto); }
.rc-hueco .rc-puesto.izq { right: auto; left: 8px; }
.rc-brillo-h { position: absolute; inset: 0; border-radius: 22px; pointer-events: none; background: radial-gradient(circle at var(--mx, 30%) var(--my, 20%), rgba(255,255,255,.75), transparent 45%); mix-blend-mode: soft-light; opacity: 0; transition: opacity .3s; }
.rc-hueco.tiene:hover .rc-brillo-h { opacity: 1; }
.rc-grupo-tit { grid-column: 1 / -1; display: flex; align-items: center; gap: 12px; margin: 8px 0 0; font: 700 13px var(--f-texto); letter-spacing: .12em; text-transform: uppercase; color: var(--tinta-2); }
.rc-grupo-tit::after { content: ""; flex: 1; height: 1px; background: var(--linea); }
.rc-detalle { background: var(--velo); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }

.rc-perfil-bloque { max-width: 1240px; margin: 44px auto 0; padding: 0 36px; }
.rc-perfil-bloque:last-child { padding-bottom: 100px; }
/* tienda */
.rc-tienda-fila { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
.rc-articulo { display: grid; grid-template-columns: 64px 1fr; column-gap: 16px; row-gap: 4px; align-items: center; text-align: left; padding: 16px 20px; border: var(--borde); cursor: pointer; font: inherit; color: inherit; transition: transform .15s var(--suave); }
.rc-articulo:hover { transform: translateY(-2px); }
.rc-articulo:active { transform: translateY(2px); }
.rc-articulo:focus-visible { outline: 3px solid var(--acento); outline-offset: 3px; }
.rc-articulo > span:first-child { grid-row: 1 / 4; display: grid; place-items: center; }
.rc-articulo b { font: 700 19px/1.2 var(--f-texto); }
.rc-articulo small { font: 500 13px/1.4 var(--f-texto); color: var(--tinta-2); }
.rc-precio { display: inline-flex; align-items: center; gap: 8px; margin-top: 8px; justify-self: start; padding: 4px 12px 4px 8px; border-radius: var(--radio-btn); background: var(--acento-suave); color: var(--acento-tinta); font: 700 15px var(--f-texto); font-variant-numeric: tabular-nums; }
.rc-articulo.caro .rc-precio { background: var(--sup-3); color: var(--tinta-2); }

/* habitación de Mochi (vista de perfil) */
.rc-cuarto { position: relative; height: 620px; border-radius: var(--radio); overflow: hidden; isolation: isolate; background: var(--rc-yeso); box-shadow: var(--sombra); }
.rc-cuarto .rc-sala { --hz: 64%; }
.rc-cuarto .rc-desenfoque { display: none; }
.rc-cuarto canvas { position: absolute; left: 50%; bottom: 2%; width: 74%; height: 88%; transform: translateX(-50%); z-index: 3; display: block; }
.rc-cuarto-nombre { position: absolute; left: 24px; top: 24px; z-index: 5; }
.rc-cuarto-nombre .rc-logo { font-size: 52px; }
.rc-cuarto-nombre small { display: block; margin-top: 12px; font: 700 14px var(--f-texto); color: var(--rc-sobre-sala); text-shadow: 0 1px 6px rgba(20,12,4,.5); }
.rc-pins { position: absolute; right: 24px; top: 24px; z-index: 5; display: flex; flex-direction: column; gap: 8px; align-items: flex-end; }
.rc-pin { display: flex; align-items: center; gap: 8px; padding: 4px 12px 4px 4px; border-radius: var(--radio-btn); background: color-mix(in srgb, var(--sup) 94%, transparent); color: var(--tinta); font: 700 12.5px var(--f-texto); box-shadow: var(--sombra-peq); }
.rc-pin .rc-ilus { width: 32px; height: 32px; border-radius: 50%; background: var(--sup-3); overflow: hidden; }
.rc-pin .rc-ilus img { filter: none; }
.rc-pin .rc-ilus-alt { font-size: 10px; }
.rc-objetos { position: absolute; inset: 0; z-index: 2; pointer-events: none; }
.rc-objetos .rc-ilus { position: absolute; }
.rc-objetos .rc-ilus.rc-delante { z-index: 4; }
.rc-objetos .rc-ilus.rc-z-suelo::after { content: ""; position: absolute; left: 14%; right: 14%; bottom: -3%; height: 9%; border-radius: 50%; background: rgba(38,31,25,.38); /* arte: sombra en el suelo */ filter: blur(4px); z-index: -1; }
.rc-objetos .rc-ilus-alt { font-size: 18px; }
.rc-cuarto-vacio { position: absolute; right: 24px; bottom: 24px; z-index: 5; max-width: 250px; padding: 12px 16px; border-radius: var(--radio-peq); background: color-mix(in srgb, var(--sup) 92%, transparent); color: var(--tinta-2); font: 600 13px/1.4 var(--f-texto); }
.rc-cuarto-mas { position: absolute; right: 24px; bottom: 20px; z-index: 5; padding: 8px 12px; border-radius: var(--radio-peq); background: var(--sup); color: var(--tinta); font: 700 12.5px var(--f-texto); box-shadow: var(--sombra-peq); }
.rc-toast { position: fixed; left: 50%; bottom: 40px; z-index: 99; display: flex; align-items: center; gap: 12px; padding: 12px 20px; border-radius: var(--radio); font: 600 14.5px/1.4 var(--f-texto); width: max-content; max-width: min(520px, calc(100vw - 32px)); box-shadow: var(--sombra-flotante); }
@media (max-width: 720px) { .rc-pista-todas { right: 16px; left: 16px; bottom: 16px; justify-content: center; white-space: normal; } }
`;
(function estilos() {
  if (document.getElementById('rc-estilos')) return;
  const st = document.createElement('style'); st.id = 'rc-estilos'; st.textContent = ESTILO; document.head.appendChild(st);
  const tiene = [...document.querySelectorAll('link[href*="fuentes.css"]')].some(Boolean);
  if (!tiene) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = '/vendor/fuentes/fuentes.css'; document.head.appendChild(l); }
})();
// iconos del ilustrador si existen; si no, los dibujos propios
const ICONO = {};
['koban', 'bolsa', 'omamori'].forEach((n) => { const im = new Image(); im.onload = () => { ICONO[n] = true; $$(`[data-ico="${n}"]`).forEach((s) => { s.innerHTML = `<img src="/img/iconos/${n}.svg" alt="">`; }); }; im.src = `/img/iconos/${n}.svg`; });
const ico = (n) => `<span class="rc-ico" data-ico="${n}">${ICONO[n] ? `<img src="/img/iconos/${n}.svg" alt="">` : n === 'koban' ? svgKoban(24) : n === 'bolsa' ? svgBolsa(34) : svgOmamori(26)}</span>`;

// ───────────────────────── partículas (lienzo propio) ─────────────────────────
const P = { lienzo: null, ctx: null, lista: [], dpr: 1, vivo: false };
function lienzoP() {
  if (!P.lienzo) {
    P.lienzo = document.createElement('canvas');
    P.lienzo.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:95';
    document.body.appendChild(P.lienzo); P.ctx = P.lienzo.getContext('2d');
    const medir = () => { P.dpr = Math.min(2, devicePixelRatio || 1); P.lienzo.width = innerWidth * P.dpr; P.lienzo.height = innerHeight * P.dpr; };
    medir(); addEventListener('resize', medir);
  }
  if (!P.vivo) { P.vivo = true; gsap.ticker.add(pasoP); }
  return P;
}
const PETALOS = ['#f7c4cc', '#f2a3a3', '#fbd9de', '#f5b3bd'];
const CONFETI = ['#f2661b', '#d8412a', '#f2b43a', '#7c8f3c', '#2f4a7a', '#f7efdf', '#f2a3a3'];
function dibujarP(c, p) {
  const s = p.tam;
  c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.globalAlpha = p.alfa;
  if (p.tipo === 'petalo') {
    c.scale(1, Math.cos(p.giro)); c.fillStyle = p.color;
    c.beginPath(); c.moveTo(0, s * 0.95); c.bezierCurveTo(-s * 0.95, s * 0.2, -s * 0.62, -s * 0.95, -s * 0.18, -s * 0.9); c.lineTo(0, -s * 0.6); c.lineTo(s * 0.18, -s * 0.9);
    c.bezierCurveTo(s * 0.62, -s * 0.95, s * 0.95, s * 0.2, 0, s * 0.95); c.fill();
    c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(-s * 0.2, -s * 0.1, s * 0.18, s * 0.42, 0.3, 0, Math.PI * 2); c.fill();
  } else if (p.tipo === 'confeti') {
    c.scale(1, Math.cos(p.giro)); c.fillStyle = p.color; c.fillRect(-s / 2, -s * 0.3, s, s * 0.6);
  } else if (p.tipo === 'chispa') {
    c.fillStyle = p.color; c.beginPath();
    for (let i = 0; i < 8; i++) { const r = i % 2 ? s * 0.28 : s, a = (i / 8) * Math.PI * 2; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    c.closePath(); c.fill();
  } else if (p.tipo === 'koban') {
    c.scale(Math.cos(p.giro), 1); c.fillStyle = '#a86f12'; c.beginPath(); c.ellipse(0, s * 0.08, s * 0.7, s * 0.9, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#f2b43a'; c.beginPath(); c.ellipse(0, 0, s * 0.7, s * 0.9, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#c98a1c'; c.lineWidth = Math.max(1, s * 0.09); c.beginPath(); c.ellipse(0, 0, s * 0.5, s * 0.68, 0, 0, Math.PI * 2); c.stroke();
  } else { // luz / polvo
    const g = c.createRadialGradient(0, 0, 0, 0, 0, s); g.addColorStop(0, p.color); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, s, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}
function pasoP(t, dms) {
  const c = P.ctx, dt = Math.min(0.05, dms / 1000);
  c.setTransform(P.dpr, 0, 0, P.dpr, 0, 0); c.clearRect(0, 0, innerWidth, innerHeight);
  P.lista = P.lista.filter((p) => {
    if (p.retraso > 0) { p.retraso -= dt; return true; }
    p.vida += dt; if (p.vida >= p.max) return false;
    const f60 = dt * 60;
    p.vx *= Math.pow(p.freno, f60); p.vy = p.vy * Math.pow(p.freno, f60) + p.g * dt;
    if (p.vy > p.vmax) p.vy = p.vmax;
    p.x += (p.vx + (p.vaiven ? Math.sin(p.vida * p.fv + p.fase) * p.vaiven : 0)) * dt; p.y += p.vy * dt;
    p.rot += p.vr * dt; p.giro += p.vg * dt;
    const f = p.vida / p.max; p.alfa = f < 0.06 ? f / 0.06 : f > 0.7 ? Math.max(0, 1 - (f - 0.7) / 0.3) : 1;
    if (p.encoge) p.tam = p.tam0 * (1 - f * 0.8);
    dibujarP(c, p); return true;
  });
  if (!P.lista.length) { c.clearRect(0, 0, innerWidth, innerHeight); gsap.ticker.remove(pasoP); P.vivo = false; }
}
function particula(o) {
  const p = { x: 0, y: 0, vx: 0, vy: 0, g: 0, freno: 0.985, vmax: 900, rot: azar(0, 6.28), vr: azar(-6, 6), giro: azar(0, 6.28), vg: azar(4, 12), vida: 0, max: 1.6, tam: 8, color: '#fff', tipo: 'chispa', vaiven: 0, fv: 3, fase: azar(0, 6), retraso: 0, ...o };
  p.tam0 = p.tam; lienzoP(); P.lista.push(p);
}
// estallido radial desde un punto
export function estallido(x, y, { n = 30, tipos = ['confeti', 'chispa'], colores = CONFETI, vel = [260, 620], g = 900, vida = [0.9, 1.6], tam = [6, 12], angulo = -90, abertura = 360, freno = 0.965 } = {}) {
  if (quieto()) n = Math.min(n, 8);
  for (let i = 0; i < n; i++) {
    const a = ((angulo + azar(-abertura / 2, abertura / 2)) * Math.PI) / 180, v = azar(...vel), tipo = elegir(tipos);
    particula({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: tipo === 'petalo' ? g * 0.25 : g, vmax: tipo === 'petalo' ? 160 : 900, freno, max: azar(...vida), tam: azar(...tam), tipo,
      color: tipo === 'petalo' ? elegir(PETALOS) : elegir(colores), vaiven: tipo === 'petalo' ? 60 : 0, encoge: tipo === 'chispa' || tipo === 'luz', vr: tipo === 'chispa' ? azar(-2, 2) : azar(-8, 8) });
  }
}
export function lluviaPetalos(n = 40, dur = 2.5) {
  if (quieto()) n = Math.min(n, 10);
  for (let i = 0; i < n; i++) particula({ tipo: 'petalo', x: azar(-40, innerWidth + 40), y: azar(-60, -10), vx: azar(-30, 50), vy: azar(40, 120), g: 30, vmax: 150, freno: 1, max: azar(3.5, 6), tam: azar(7, 13), color: elegir(PETALOS), vaiven: azar(40, 90), fv: azar(1.5, 3), retraso: azar(0, dur) });
}
function canones(n = 60) {
  if (quieto()) n = 10;
  [[0, innerHeight, -58], [innerWidth, innerHeight, -122]].forEach(([x, y, ang]) => estallido(x, y, { n, tipos: ['confeti', 'confeti', 'petalo'], vel: [700, 1250], g: 1000, vida: [1.6, 2.6], tam: [8, 14], angulo: ang, abertura: 26, freno: 0.975 }));
}

// ───────────────────────── gestos genéricos ─────────────────────────
// inclinar hacia el cursor con brillo especular; aplastar al pulsar y rebotar
export function inclinable(el, { fuerza = 12, sobre = el, perspectiva = 0 } = {}) {
  if (quieto()) return;
  if (perspectiva) gsap.set(el, { transformPerspective: perspectiva });
  const rx = gsap.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3' }), ry = gsap.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3' });
  sobre.addEventListener('pointermove', (e) => {
    const r = sobre.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    ry((px - 0.5) * fuerza * 2); rx(-(py - 0.5) * fuerza * 2);
    el.style.setProperty('--mx', `${px * 100}%`); el.style.setProperty('--my', `${py * 100}%`);
  });
  sobre.addEventListener('pointerleave', () => { rx(0); ry(0); });
  sobre.addEventListener('pointerdown', () => gsap.to(el, { scaleX: 1.04, scaleY: 0.94, duration: 0.1, ease: 'power2.out' }));
  const soltar = () => gsap.to(el, { scaleX: 1, scaleY: 1, duration: 0.6, ease: 'elastic.out(1, 0.35)' });
  sobre.addEventListener('pointerup', soltar); sobre.addEventListener('pointercancel', soltar);
}
function aplastar(el) { if (!quieto()) gsap.fromTo(el, { scaleX: 1.08, scaleY: 0.9 }, { scaleX: 1, scaleY: 1, duration: 0.55, ease: 'elastic.out(1, 0.35)' }); }
function toast(html, dur = 3) {
  const t = document.createElement('div'); t.className = 'rc-toast rc-ficha'; t.innerHTML = html; document.body.appendChild(t);
  gsap.set(t, { xPercent: -50 });
  gsap.fromTo(t, { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.8)' });
  gsap.to(t, { y: 30, opacity: 0, duration: 0.35, delay: dur, onComplete: () => t.remove() });
}
// teclas de una capa modal en fase de captura, para que Intro no llegue al repaso de debajo
// pila: solo la capa de más arriba recibe las teclas (p. ej. subir de nivel encima de una bolsa)
const PILA = [];
addEventListener('keydown', (e) => {
  const fn = PILA[PILA.length - 1];
  if (fn && fn(e) !== false) { e.preventDefault(); e.stopImmediatePropagation(); }
}, true);
function capturarTeclas(fn) {
  PILA.push(fn);
  return () => { const i = PILA.lastIndexOf(fn); if (i >= 0) PILA.splice(i, 1); };
}
// monedas que vuelan de un punto a un contador
async function monedasVuelan(desde, hasta, n) {
  const d = centro(desde), h = centro(hasta);
  n = Math.max(1, Math.min(quieto() ? 3 : 14, n));
  const promesas = [];
  for (let i = 0; i < n; i++) {
    const m = document.createElement('div'); m.className = 'rc-moneda-vuela'; m.innerHTML = svgKoban(26); document.body.appendChild(m);
    const ox = azar(-70, 70), oy = azar(-90, -20);
    gsap.set(m, { x: d.x, y: d.y, scale: 0, rotation: azar(-30, 30) });
    promesas.push(new Promise((ok) => {
      gsap.timeline({ delay: i * 0.05, onComplete: () => { m.remove(); son.acierto(i + 3); ok(); } })
        .set(m, { scale: 0.3 })
        .to(m, { x: d.x + ox, y: d.y + oy, scale: 1, duration: 0.32, ease: 'power2.out' })
        .to(m, { x: h.x, duration: 0.55, ease: 'power1.in' }, '>')
        .to(m, { y: h.y, duration: 0.55, ease: 'back.in(1.4)', rotation: azar(-200, 200), scale: 0.7 }, '<');
    }));
  }
  await Promise.all(promesas);
  if (!quieto()) gsap.fromTo(hasta, { scale: 1.16 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
}
// fondo de sala: yeso ocre, tatami y primer plano desenfocado
const visible = (el) => (el.checkVisibility ? el.checkVisibility({ visibilityProperty: true, opacityProperty: true }) : true);
const salaHTML = () => '<div class="rc-sala"><div class="rc-pared"><div class="rc-pared-luz"></div></div><div class="rc-suelo"><i></i></div><div class="rc-zocalo"></div><div class="rc-desenfoque"></div><div class="rc-desenfoque b"></div><div class="rc-vineta"></div></div>';
export { salaHTML };

// ───────────────────────── HUD de la portada ─────────────────────────
let HUD = null, ociosa = null;
export async function montarInicio(contenedor, datosInicio) {
  let el = contenedor instanceof Element ? contenedor : $('#hud-juego');
  if (!el) { el = document.createElement('div'); el.id = 'hud-juego'; el.className = 'rc-hud-flotante'; $('#v-inicio')?.appendChild(el); }
  HUD = el;
  const primera = !el.dataset.montado;
  // /api/inicio ya trae koban, bolsas y misiones: se pinta al momento y solo se repinta si /api/juego dice otra cosa
  const rapido = datosInicio?.misiones && datosInicio.monedas != null;
  const firma = (x) => JSON.stringify([x.monedas, x.bolsas, x.omamori, x.misiones]);
  if (rapido) { pintarHud(el, { monedas: datosInicio.monedas, bolsas: datosInicio.bolsas, omamori: datosInicio.omamori, misiones: datosInicio.misiones }, primera); el.dataset.montado = '1'; }
  let j;
  try { j = await cargarJuego(); } catch { if (!rapido) el.innerHTML = ''; return; }
  if (!rapido) pintarHud(el, j, primera);
  else if (firma(j) !== firma(datosInicio)) pintarHud(el, j, false);
  el.dataset.montado = '1';
}
function htmlMision(m, antes) {
  const v = antes ?? m.progreso, p = Math.min(1, v / Math.max(1, m.meta));
  const est = m.cobrada ? 'cobrada' : m.hecha ? 'hecha' : '';
  return `<div class="rc-mision ${est}" data-mision="${esc(m.id)}">
    <span class="rc-mis-check">${m.cobrada ? '済' : m.hecha ? '✓' : ''}</span>
    <div title="${esc(m.pista || '')}"><div class="rc-mis-linea"><span class="rc-mis-txt">${esc(m.texto)}</span><span class="rc-mis-num"><span class="rc-mis-prog">${Math.min(m.meta, v)}</span>/${m.meta}</span></div><div class="rc-mis-barra"><i style="width:${Math.max(4, p * 100)}%"></i></div></div>
    <div>${m.hecha && !m.cobrada ? `<button class="rc-boton peq" data-cobrar="${esc(m.id)}" title="${t('recompensas.misiones.cobrar')}">${svgKoban(15)} +${m.recompensa} ${kbd('X')}</button>` : `<span class="rc-mis-premio">${svgKoban(15)} ${m.recompensa}</span>`}</div></div>`;
}
function htmlMisiones(j, antes = {}) {
  const ms = j.misiones || [];
  const cobradas = ms.filter((m) => m.cobrada).length;
  return `<div class="rc-misiones rc-ficha">
    <div class="rc-mis-cab"><span class="rc-logo m">任務</span><div><h3>${t('recompensas.misiones.tit')}</h3><p>${t('recompensas.misiones.hechas', { n: ms.filter((m) => m.hecha).length, total: ms.length })}</p></div></div>
    ${ms.map((m) => htmlMision(m, antes[m.id])).join('')}
    <div class="rc-mis-pie"><span class="rc-puntos">${ms.map((m) => `<i class="${m.cobrada ? 'si' : ''}"></i>`).join('')}</span>${cobradas === ms.length && ms.length ? t('recompensas.misiones.cobradas') : t('recompensas.misiones.cobra_tres')}</div></div>`;
}
function pintarHud(el, j, entrada) {
  ociosa?.kill();
  // al repintar, el foco sigue en su sitio (o pasa a la siguiente misión por cobrar, o a las bolsas)
  const f = el.contains(document.activeElement) ? document.activeElement : null;
  const sitio = !f ? null : f.matches('.rc-chip.bolsas') ? '.rc-chip.bolsas' : f.matches('.rc-chip.mis-movil') ? '.rc-chip.mis-movil' : '[data-cobrar]';
  el.innerHTML = `<div class="rc-hud">
    <div class="rc-hud-fila">
      <div class="rc-chip koban" title="${t('recompensas.hud.koban')}">${ico('koban')}<div><b class="rc-num-koban">${mil(j.monedas || 0)}</b><small>${t('recompensas.koban')}</small></div></div>
      <button class="rc-chip bolsas ${j.bolsas ? 'con' : ''}" title="${t('recompensas.bolsas.tit')}">${ico('bolsa')}<div><b class="rc-num-bolsas">${j.bolsas || 0}</b><small>${j.bolsas ? `${tn('recompensas.hud.abrelas', j.bolsas)} ${kbd('B')}` : t('recompensas.hud.bolsas')}</small></div></button>
      ${(j.misiones || []).length ? `<button class="rc-chip mis-movil ${(j.misiones || []).some((m) => m.hecha && !m.cobrada) ? 'aviso' : ''}" aria-expanded="false" title="${t('recompensas.misiones.tit')}"><span class="rc-logo">任務</span><div><b>${(j.misiones || []).filter((m) => m.hecha).length}/${(j.misiones || []).length}</b><small>${t('recompensas.hud.misiones')}</small></div></button>` : ''}
    </div>
    ${(j.misiones || []).length ? htmlMisiones(j) : ''}
    ${j.omamori ? `<div class="rc-omamori-mini">${svgOmamori(16)} ${tn('recompensas.hud.omamori', j.omamori)}</div>` : ''}
  </div>`;
  const bolsa = $('.rc-chip.bolsas', el), chipMis = $('.rc-chip.mis-movil', el);
  if (chipMis) chipMis.onclick = () => {
    son.toque(); aplastar(chipMis);
    const abierta = el.querySelector('.rc-hud').classList.toggle('mis-abiertas'); chipMis.setAttribute('aria-expanded', abierta);
    if (abierta && !quieto()) gsap.fromTo($('.rc-misiones', el), { y: 20, opacity: 0, scale: 0.95 }, { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(2)' });
  };
  bolsa.onclick = () => { son.toque(); aplastar(bolsa); if (JUEGO?.bolsas) abrirBolsas(); else toast(`${svgBolsa(34)}<span>${t('recompensas.hud.como_ganar')}</span>`); };
  enlazarCobro(el);
  if (sitio) ($(sitio, el) || $('[data-cobrar]', el) || bolsa).focus({ preventScroll: true });
  if (entrada && !quieto()) {
    gsap.fromTo($$('.rc-chip, .rc-misiones, .rc-omamori-mini', el), { y: -24, opacity: 0, scale: 0.9 }, { y: 0, opacity: 1, scale: 1, duration: 0.6, stagger: 0.08, ease: 'back.out(1.7)', delay: 0.2 });
    gsap.fromTo($$('.rc-mision', el), { x: -14, opacity: 0 }, { x: 0, opacity: 1, duration: 0.45, stagger: 0.06, delay: 0.45, ease: 'power3.out' });
    $$('.rc-mis-barra i', el).forEach((b, i) => { const w = b.style.width; gsap.fromTo(b, { width: '4%' }, { width: w, duration: 1, delay: 0.6 + i * 0.08, ease: 'power3.out' }); });
  }
  if (j.bolsas && !quieto()) {
    const icono = $('.rc-ico', bolsa);
    ociosa = gsap.timeline({ repeat: -1, repeatDelay: 3.2, delay: 1.4 })
      .to(icono, { rotation: -14, y: -4, duration: 0.12, ease: 'power2.out' })
      .to(icono, { rotation: 12, duration: 0.12 }).to(icono, { rotation: -8, duration: 0.1 })
      .to(icono, { rotation: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
  }
  $$('[data-cobrar]', el).forEach((b) => { if (!quieto()) gsap.to(b, { scale: 1.07, duration: 0.6, yoyo: true, repeat: -1, ease: 'sine.inOut' }); });
}
// cobrar una misión: sello 済, monedas al contador, y bolsa si son las tres
function enlazarCobro(raiz) {
  $$('[data-cobrar]', raiz).forEach((b) => {
    b.onclick = async (e) => {
      e.stopPropagation(); const teniaFoco = [b, document.body, null].includes(document.activeElement); b.disabled = true; gsap.killTweensOf(b);
      let r; try { r = await api('/api/misiones/cobrar', { id: b.dataset.cobrar }); } catch (err) { b.disabled = false; toast(esc(err.message)); return; }
      const m = (r.misiones || []).find((x) => x.id === b.dataset.cobrar), antesMon = JUEGO?.monedas ?? 0;
      if (JUEGO) { JUEGO.misiones = r.misiones; JUEGO.monedas = r.monedas; if (r.bolsa_ganada) JUEGO.bolsas = (JUEGO.bolsas || 0) + 1; }
      const fila = b.closest('.rc-mision'), cb = centro(b);
      son.sello(); estallido(cb.x, cb.y, { n: 18, tipos: ['chispa', 'koban'], colores: ['#f2b43a', '#ffd978', '#fff6e4'], vel: [160, 420], g: 700 });
      const check = $('.rc-mis-check', fila);
      fila.classList.add('cobrada'); check.textContent = '済';
      gsap.fromTo(check, { scale: 2.4, rotation: -40, opacity: 0 }, { scale: 1, rotation: -10, opacity: 1, duration: 0.34, ease: 'power4.in' });
      const otra = $$('[data-cobrar]', raiz).find((x) => x !== b && !x.disabled);
      const hueco = document.createElement('span'); hueco.className = 'rc-mis-premio'; hueco.innerHTML = `${svgKoban(15)} ${m?.recompensa ?? ''}`; b.replaceWith(hueco);
      if (teniaFoco) (otra || $('.rc-chip.bolsas', raiz))?.focus({ preventScroll: true });
      const destino = $$('.rc-chip.koban').find(visible) || hueco;
      await monedasVuelan(fila, destino, Math.ceil((m?.recompensa || 10) / 3));
      $$('.rc-num-koban').forEach((n) => contar(n, antesMon, r.monedas, 0.8));
      if (r.bolsa_ganada) { await espera(300); lluviaPetalos(24, 1); son.fanfarria(); toast(`${svgBolsa(38)}<span>${t('recompensas.misiones.bolsa_ganada')}</span>`, 3.2); }
      await espera(700);
      avisarCambio();
    };
  });
}
addEventListener('rc:juego', () => { if (HUD?.isConnected && JUEGO) pintarHud(HUD, JUEGO, false); });
// X cobra la primera misión hecha que se vea (portada o fin de sesión), sin tener que llegar a ella con Tab
addEventListener('keydown', (e) => {
  if (e.key !== 'x' && e.key !== 'X') return;
  if (e.defaultPrevented || e.repeat || e.ctrlKey || e.metaKey || e.altKey || escribiendo(e) || capaAbierta()) return;
  const b = $$('[data-cobrar]').find((x) => !x.disabled && visible(x));
  if (b) { e.preventDefault(); b.click(); }
});

// ───────────────────────── bolsas de la suerte 福袋 ─────────────────────────
let abriendo = false;
function cartaHTML(o, { nuevo, monedas, n, colocado } = {}) {
  const r = RAREZA[o.rareza] ? o.rareza : 'comun';
  const tipo = PARA_MOCHI[o.tipo] || (nuevo && colocado ? t('recompensas.carta.ya_en_habitacion') : t('recompensas.carta.habitacion'));
  return `<div class="rc-carta r-${r}"><div class="rc-carta-inclina">
    <div class="rc-cara r-${r}">
      <span class="rc-pegatina">${esc(RAREZA[r].nombre)}</span>
      ${nuevo ? `<span class="rc-nuevo"><b>新</b><small>${t('recompensas.nuevo')}</small></span>` : monedas ? `<span class="rc-repe">${svgKoban(22)}<span>+${monedas}<small>${t('recompensas.carta.repetido')}</small></span></span>` : ''}
      <div class="rc-carta-ilus">${ILUS(o)}</div>
      <div class="rc-carta-jp">${esc(o.jp || '')}</div>
      <div class="rc-carta-nombre">${esc(o.nombre)}</div>
      <p class="rc-carta-desc">${esc(o.desc || '')}</p>
      <div class="rc-carta-tipo">${n > 1 ? t('recompensas.carta.tienes', { tipo, n: mil(n) }) : tipo}</div>
      ${r === 'epico' || r === 'legendario' ? '<div class="rc-holo"></div>' : ''}<div class="rc-brillo"></div>
    </div>
    <div class="rc-dorso"><span>福</span></div>
  </div></div>`;
}
// carta pequeña de la rejilla de «Abrir todas»
function miniHTML(o, res, clase = '') {
  const r = RAREZA[o.rareza] ? o.rareza : 'comun';
  const sello = res.nuevo ? '<i class="rc-mini-sello">新</i>' : res.monedas_ganadas ? `<i class="rc-mini-sello koban">+${res.monedas_ganadas}</i>` : '';
  const v = { nombre: esc(o.nombre), rareza: esc(RAREZA[r].nombre), n: mil(res.monedas_ganadas || 0) };
  const aria = res.nuevo ? t('recompensas.mini.nuevo', v) : res.monedas_ganadas ? t('recompensas.mini.repetido', v) : t('recompensas.mini.aria', v);
  return `<div class="rc-mini r-${r} ${clase}" tabindex="-1" role="img" aria-label="${aria}">
    <span class="rc-mini-ilus">${ILUS(o)}</span><b>${esc(o.nombre)}</b><small>${esc(RAREZA[r].nombre)}</small>${sello}
    ${r === 'epico' || r === 'legendario' ? '<div class="rc-holo"></div>' : ''}</div>`;
}
// columnas y tamaño de carta para que n cartas quepan en el hueco disponible
function medidaRejilla(n, alto) {
  const W = Math.min(1100, innerWidth - 48), H = Math.max(180, alto), gap = innerWidth < 720 ? 10 : 14;
  // la carta más grande que quepa; a igual tamaño, filas más completas y luego más columnas (más ancho que alto)
  let mejor = { cols: 1, tam: 0, vacios: 0 };
  for (let cols = 1; cols <= Math.max(1, n); cols++) {
    const filas = Math.ceil(n / cols), vacios = cols * filas - n;
    const tam = Math.floor(Math.min(150, (W - gap * (cols - 1)) / cols, ((H - gap * (filas - 1)) / filas) * 0.8)); // floor: redondear hacia arriba sumaba píxeles por fila y salía la barra de scroll
    if (tam > mejor.tam || (tam === mejor.tam && vacios <= mejor.vacios)) mejor = { cols, tam, vacios };
  }
  // nunca menos de 96 px: con muchas bolsas, la rejilla se desplaza (y las flechas la recorren) antes que cartas ilegibles
  const tam = Math.floor(Math.max(Math.min(96, W), mejor.tam));
  return { cols: tam > mejor.tam ? Math.max(1, Math.min(n, Math.floor((W + gap) / (tam + gap)))) : mejor.cols, tam, gap };
}
// actualiza la foto local del juego tras abrir una bolsa
function anotarBolsa(res, quedan) {
  if (!JUEGO) return;
  const o = res.objeto, inv = (JUEGO.inventario || []).find((x) => x.id === o.id);
  JUEGO.bolsas = quedan; JUEGO.monedas = res.monedas ?? (JUEGO.monedas || 0) + (res.monedas_ganadas || 0);
  if (inv) inv.n = res.veces ?? inv.n + 1; else (JUEGO.inventario ||= []).push({ id: o.id, n: 1, colocado: !!res.colocado, nuevo: true });
  if (res.colocado && !(JUEGO.colocados || []).includes(o.id)) (JUEGO.colocados ||= []).push(o.id);
}
export async function abrirBolsas() {
  if (abriendo) return; abriendo = true;
  son.iniciar?.();
  let j;
  try { j = await cargarJuego(); } catch { abriendo = false; toast(t('recompensas.bolsas.sin_servidor')); return; }
  if (!j.bolsas) { abriendo = false; toast(`${svgBolsa(34)}<span>${t('recompensas.bolsas.no_quedan')}</span>`); return; }
  const capa = document.createElement('div'); capa.className = 'rc-capa rc-bolsas r-comun'; capa.setAttribute('role', 'dialog'); capa.setAttribute('aria-label', t('recompensas.bolsas.tit'));
  capa.innerHTML = `${salaHTML()}<div class="rc-halo"></div><div class="rc-rayos"></div>
    <div class="rc-cab-capa"><div class="rc-titulo"><span class="rc-logo l">${letras('福袋')}</span><div>${t('recompensas.bolsas.tit')}<small class="rc-quedan"></small></div></div>
      <div class="rc-cab-der"><div class="rc-chip koban">${ico('koban')}<div><b class="rc-num-koban">${mil(j.monedas || 0)}</b><small>${t('recompensas.koban')}</small></div></div></div></div>
    <div class="rc-escena"></div><div class="rc-destello"></div>`;
  document.body.appendChild(capa);
  const escena = $('.rc-escena', capa), quedanEl = $('.rc-quedan', capa), rayos = $('.rc-rayos', capa), halo = $('.rc-halo', capa);
  const ponerQuedan = (n) => { quedanEl.textContent = n ? tn('recompensas.bolsas.quedan', n) : t('recompensas.bolsas.ninguna'); };
  ponerQuedan(j.bolsas);
  gsap.fromTo(capa, { opacity: 0 }, { opacity: 1, duration: 0.35 });
  if (!quieto()) {
    gsap.fromTo($('.rc-sala', capa), { scale: 1.08 }, { scale: 1, duration: 1.2, ease: 'power3.out' });
    gsap.fromTo($$('.rc-titulo .rc-l', capa), { y: -80, rotation: () => azar(-30, 30), opacity: 0 }, { y: 0, rotation: 0, opacity: 1, duration: 0.7, stagger: 0.08, ease: 'back.out(2.4)', delay: 0.15 });
    gsap.fromTo($('.rc-cab-der', capa), { y: -30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, delay: 0.3, ease: 'back.out(2)' });
  }
  let accion = null, quedan = j.bolsas;
  const abiertas = []; // lo que sale en esta visita, para el resumen
  const TODAS = { activo: false, prisa: false, parar: false, resumen: false, cola: false, pendiente: null };
  const esperarAccion = () => new Promise((ok) => { accion = (a) => { accion = null; ok(a); }; });
  // mientras cae la bolsa no hay botones todavía: la tecla se guarda y se usa en cuanto aterriza
  const pedir = (a) => { if (accion) accion(a); else if (TODAS.cola) TODAS.pendiente = a; };
  const soltar = capturarTeclas((e) => {
    const k = e.key;
    if (TODAS.activo) { // abriendo en cadena: Intro acelera, Esc para después de la bolsa en curso
      if (k === 'Enter' || k === ' ') TODAS.prisa = true; else if (k === 'Escape') TODAS.parar = true;
      return k === 'Tab' ? false : undefined;
    }
    const foco = document.activeElement?.closest?.('.rc-capa [data-a]');
    if ((k === 'Enter' || k === ' ') && foco) { foco.click(); return; }
    if (k === 'Enter' || k === ' ') { pedir('sig'); return; }
    if (k === 'Escape') { pedir('cerrar'); return; }
    if ((k === 't' || k === 'T') && !e.ctrlKey && !e.metaKey && !e.altKey) { if ($('[data-a="todas"]', capa)) pedir('todas'); return; }
    if ((k === 'p' || k === 'P') && !e.ctrlKey && !e.metaKey && !e.altKey) { $('.rc-acciones [data-a="usar"]:not([disabled])', capa)?.click(); return; }
    if (TODAS.resumen && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(k)) return false;
    if (k === 'Tab') return false;
  });
  const botonTodas = (n, clase = 'claro') => (n > 1 ? `<button class="rc-boton ${clase}" data-a="todas">${t('recompensas.bolsas.abrir_todas', { n: mil(n) })} ${kbd('T')}</button>` : '');

  // ── «Abrir todas»: una tras otra, cada carta vuela a su hueco de la rejilla; al final, el resumen ──
  async function abrirTodas() {
    TODAS.activo = true; TODAS.prisa = false; TODAS.parar = false;
    gsap.killTweensOf(rayos); gsap.set([rayos, halo], { opacity: 0 }); capa.className = 'rc-capa rc-bolsas r-comun';
    const total = abiertas.length + quedan;
    const cabAlto = 110, abajo = innerWidth < 720 ? 190 : 230;
    const altoAbrir = innerHeight - 92 - cabAlto - abajo, m = medidaRejilla(total, altoAbrir);
    escena.innerHTML = `<div class="rc-todas" style="--cols:${m.cols};--tam:${m.tam}px;--gap:${m.gap}px">
        <div class="rc-todas-cab"><h2>${t('recompensas.todas.abriendo', { n: `<b class="rc-todas-n">${abiertas.length}</b>`, total: mil(total) })}</h2><div class="rc-todas-cifras"></div></div>
        <div class="rc-todas-rejilla" style="max-height:${Math.max(200, altoAbrir + 28)}px">${abiertas.map((x) => miniHTML(x.res.objeto, x.res)).join('')}</div></div>
      <div class="rc-fuku-brillo peq"></div><div class="rc-fuku-caja peq"></div>
      <div class="rc-pista rc-pista-todas">${t('recompensas.todas.pista', { intro: kbd('Intro'), esc: kbd('Esc') })}</div>`;
    const rejillaEl = $('.rc-todas-rejilla', escena), caja = $('.rc-fuku-caja', escena), brillo = $('.rc-fuku-brillo', escena), nEl = $('.rc-todas-n', escena), pista = $('.rc-pista', escena);
    gsap.fromTo($('.rc-todas-cab', escena), { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 });
    gsap.fromTo(pista, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, delay: 0.2 });
    if (abiertas.length && !quieto()) gsap.fromTo($$('.rc-mini', rejillaEl), { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, stagger: 0.04, ease: 'back.out(2)' });
    let i = 0;
    while (quedan > 0 && !TODAS.parar) {
      const rapido = TODAS.prisa || quieto(), vel = rapido ? 0.3 : Math.max(0.55, 1 - i * 0.04);
      caja.innerHTML = svgFuku(); const svg = $('svg', caja);
      const peticion = api('/api/bolsa/abrir', {}).catch((e) => ({ error: e.message }));
      // cae la bolsa y tiembla
      await gsap.timeline()
        .fromTo(caja, { y: -160, opacity: 0, scaleX: 0.9, scaleY: 1.1, rotation: azar(-10, 10) }, { y: 0, opacity: 1, rotation: 0, duration: 0.26 * vel, ease: 'power2.in' })
        .to(caja, { scaleX: 1.14, scaleY: 0.84, duration: 0.06 * vel })
        .to(caja, { scaleX: 1, scaleY: 1, duration: 0.14 * vel, ease: 'power2.out' })
        .to(caja, { rotation: 7, duration: 0.05 * vel, yoyo: true, repeat: rapido ? 1 : 3, ease: 'none' })
        .set(caja, { rotation: 0 });
      const res = await peticion;
      if (!res || res.error || !res.objeto) { toast(esc(res?.error || t('recompensas.bolsas.error'))); break; }
      quedan = res.bolsas_restantes ?? quedan - 1; ponerQuedan(quedan);
      anotarBolsa(res, quedan); abiertas.push({ res });
      const o = res.objeto, rz = RAREZA[o.rareza] ? o.rareza : 'comun', nivelR = ORDEN.indexOf(rz);
      // se abre: nudo fuera, volantes, luz del color de la rareza
      son.bolsaRapida?.(nivelR, i);
      const cb = centro(caja), boca = { x: cb.x, y: cb.r.top + cb.r.height * 0.32 };
      gsap.timeline()
        .to($('.fk-nudo', svg), { scale: 1.5, rotation: 120, opacity: 0, svgOrigin: '120 104', duration: 0.25 * vel }, 0)
        .to($('.fk-cordon', svg), { opacity: 0, duration: 0.2 * vel }, 0)
        .to($('.fk-vol-i', svg), { rotation: -38, svgOrigin: '92 106', duration: 0.3 * vel, ease: 'back.out(2.2)' }, 0.04)
        .to($('.fk-vol-d', svg), { rotation: 38, svgOrigin: '148 106', duration: 0.3 * vel, ease: 'back.out(2.2)' }, 0.04)
        .to($('.fk-luz', svg), { opacity: 1, scale: 1.6, svgOrigin: '120 90', duration: 0.25 * vel }, 0.05)
        .to(caja, { scaleX: 1.12, scaleY: 0.86, duration: 0.08 * vel }, 0.04)
        .to(caja, { scaleX: 1, scaleY: 1, duration: 0.4 * vel, ease: 'elastic.out(1, 0.35)' }, 0.12);
      brillo.style.setProperty('--rc-luz', RAREZA[rz].luz);
      gsap.fromTo(brillo, { opacity: nivelR ? 0.9 : 0.5, scale: 0.6 }, { opacity: 0, scale: 1.3, duration: 0.7 });
      if (!rapido || nivelR >= 2) estallido(boca.x, boca.y, { n: [10, 16, 26, 44][nivelR], tipos: ['confeti', 'chispa'], colores: nivelR ? [RAREZA[rz].color, RAREZA[rz].luz, '#fff6e4'] : CONFETI, vel: [220, 520 + nivelR * 80], g: 900, vida: [0.7, 1.3], tam: [6, 11] });
      if (nivelR === 3) { lluviaPetalos(40, 1.5); canones(24); $('.rc-destello', capa) && gsap.fromTo($('.rc-destello', capa), { opacity: 0.8, background: '#fff0c2' }, { opacity: 0, duration: 0.7 }); }
      // la carta vuela a su hueco
      rejillaEl.insertAdjacentHTML('beforeend', miniHTML(o, res, 'hueco'));
      const hueco = rejillaEl.lastElementChild;
      if (rejillaEl.scrollHeight > rejillaEl.clientHeight) rejillaEl.scrollTop = Math.max(0, hueco.offsetTop + hueco.offsetHeight - rejillaEl.clientHeight + 8);
      const h = hueco.getBoundingClientRect();
      const vuela = document.createElement('div'); vuela.className = 'rc-mini-vuela'; vuela.style.setProperty('--tam', `${m.tam}px`);
      vuela.innerHTML = miniHTML(o, res); capa.appendChild(vuela); gsap.set(vuela, { transformPerspective: 900 });
      await gsap.timeline()
        .fromTo(vuela, { x: boca.x - h.width / 2, y: boca.y - h.height / 2, scale: 0.2, rotationY: 540, rotationZ: -20 },
          { x: h.left, y: h.top, scale: 1, rotationY: 0, rotationZ: 0, duration: (rapido ? 0.22 : 0.62) * (rapido ? 1 : vel), ease: 'power3.out' })
        .to(caja, { y: 40, scale: 0.8, opacity: 0, duration: 0.2 * vel }, 0.1);
      vuela.remove(); hueco.classList.remove('hueco');
      nEl.textContent = abiertas.length;
      if (!quieto()) gsap.fromTo(hueco, { scale: 1.12 }, { scale: 1, duration: 0.45, ease: 'elastic.out(1, 0.4)' });
      if (res.nuevo) { son.sello(); const sl = $('.rc-mini-sello', hueco); if (sl && !quieto()) gsap.fromTo(sl, { scale: 2.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.25, ease: 'power4.in' }); }
      if (res.monedas_ganadas) contar($('.rc-num-koban', capa), (JUEGO?.monedas ?? 0) - res.monedas_ganadas, JUEGO?.monedas ?? 0, 0.4);
      i++;
      if (!rapido) await espera(90);
    }
    TODAS.activo = false;
    // resumen: la bolsa pequeña ya no está, así que la rejilla gana ese hueco de abajo
    gsap.to([caja, brillo, pista], { opacity: 0, duration: 0.25 });
    const altoRes = innerHeight - 92 - cabAlto - (innerWidth < 720 ? 150 : 120), m2 = medidaRejilla(abiertas.length, altoRes - 28); // 28: el relleno de la rejilla
    if (m2.tam > m.tam || m2.cols !== m.cols) { const t = $('.rc-todas', escena); t.style.setProperty('--cols', m2.cols); t.style.setProperty('--tam', `${m2.tam}px`); }
    rejillaEl.style.maxHeight = `${altoRes}px`;
    const cuenta = { comun: 0, raro: 0, epico: 0, legendario: 0 };
    let nuevos = 0, koban = 0;
    abiertas.forEach(({ res }) => { cuenta[RAREZA[res.objeto.rareza] ? res.objeto.rareza : 'comun']++; if (res.nuevo) nuevos++; koban += res.monedas_ganadas || 0; });
    $('.rc-todas-cab h2', escena).innerHTML = tn('recompensas.todas.abiertas', abiertas.length);
    $('.rc-todas-cifras', escena).innerHTML = ORDEN.filter((r) => cuenta[r]).map((r) => `<span class="r-${r}"><i></i>${tn(`recompensas.cuenta.${r}`, cuenta[r])}</span>`).join('')
      + (nuevos ? `<span class="nuevo"><b>新</b>${tn('recompensas.todas.nuevos', nuevos)}</span>` : '')
      + (koban ? `<span>${svgKoban(18)}${t('recompensas.todas.koban', { n: mil(koban) })}</span>` : '');
    const mejor = Math.max(...abiertas.map(({ res }) => ORDEN.indexOf(res.objeto.rareza)), 0);
    capa.className = `rc-capa rc-bolsas r-${ORDEN[mejor]}`;
    gsap.fromTo(rayos, { opacity: 0, scale: 0.4 }, { opacity: [0.25, 0.4, 0.55, 0.8][mejor], scale: 1, duration: 0.9, ease: 'power3.out' });
    if (!quieto()) gsap.to(rayos, { rotation: '+=360', duration: 50, ease: 'none', repeat: -1 });
    gsap.fromTo($$('.rc-todas-cifras span', escena), { y: 16, opacity: 0, scale: 0.8 }, { y: 0, opacity: 1, scale: 1, duration: 0.45, stagger: 0.07, ease: 'back.out(2.2)' });
    son.subida(Math.min(3, 1 + mejor));
    if (!quieto()) {
      const cr = centro($('.rc-todas-cab', escena));
      estallido(cr.x, cr.y, { n: 24 + mejor * 10, tipos: ['confeti', 'chispa'], vel: [260, 620], angulo: -90, abertura: 160 });
      gsap.fromTo($$('.rc-mini', rejillaEl), { y: 0 }, { y: -8, duration: 0.18, yoyo: true, repeat: 1, stagger: 0.025, ease: 'power2.out' });
    }
    const acciones = document.createElement('div'); acciones.className = 'rc-acciones';
    // si paraste a medias, Intro (o T) sigue abriendo las que quedan; Esc las guarda
    acciones.innerHTML = quedan
      ? `<button class="rc-boton claro" data-a="cerrar">${tn('recompensas.todas.guardar', quedan)} ${kbd('Esc')}</button><button class="rc-boton" data-a="todas">${tn('recompensas.todas.abrir_resto', quedan)} ${kbd('Intro')}</button>`
      : `<button class="rc-boton" data-a="sig">${t('recompensas.todas.hecho')} ${kbd('Intro')}</button>`;
    escena.appendChild(acciones);
    gsap.fromTo($$('.rc-boton', acciones), { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.07, ease: 'back.out(2)' });
    $$('[data-a]', acciones).forEach((b) => { b.onclick = () => accion?.(b.dataset.a); });
    TODAS.resumen = true;
    rejilla(rejillaEl, '.rc-mini');
    rejillaEl.scrollTo({ top: 0, behavior: quieto() ? 'auto' : 'smooth' }); // el resumen empieza por la primera carta, que es la que tiene el foco
    $('.rc-mini', rejillaEl)?.focus({ preventScroll: true });
    const a = await esperarAccion();
    TODAS.resumen = false;
    if ((a === 'todas' || a === 'sig') && quedan) { acciones.remove(); return abrirTodas(); }
  }

  try {
    while (quedan > 0) {
      // 1) cae la bolsa
      escena.innerHTML = `<div class="rc-fuku-brillo"></div><div class="rc-fuku-caja" tabindex="0" role="button" aria-label="${t('recompensas.bolsa.abrir')}">${svgFuku()}</div>
        <div class="rc-pista">${t('recompensas.bolsa.pista', { intro: kbd('Intro'), espacio: kbd('Espacio'), esc: kbd('Esc') })}${quedan > 1 ? `<button class="rc-boton peq" data-a="todas">${tn('recompensas.todas.abrir_resto', quedan)} ${kbd('T')}</button>` : ''}</div>`;
      const caja = $('.rc-fuku-caja', escena), brillo = $('.rc-fuku-brillo', escena), pista = $('.rc-pista', escena), svg = $('svg', caja);
      const bt = $('[data-a="todas"]', pista); if (bt) bt.onclick = (e) => { e.stopPropagation(); accion?.('todas'); };
      capa.className = 'rc-capa rc-bolsas r-comun';
      gsap.set([rayos, halo], { opacity: 0 });
      TODAS.cola = true; TODAS.pendiente = null;
      if (quieto()) gsap.fromTo(caja, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      else {
        await gsap.timeline()
          .fromTo(caja, { y: -innerHeight * 0.8, scaleX: 0.9, scaleY: 1.12, rotation: azar(-12, 12) }, { y: 0, rotation: 0, duration: 0.5, ease: 'power2.in' })
          .fromTo($('.fk-sombra', svg), { opacity: 0, scale: 0.3, svgOrigin: '120 244' }, { opacity: 0.38, scale: 1, duration: 0.5, ease: 'power2.in' }, 0)
          .call(() => { son.sello(); const c = centro(caja); estallido(c.x, c.r.bottom - 22, { n: 16, tipos: ['luz'], colores: ['rgba(247,239,223,.85)'], vel: [80, 240], g: -40, vida: [0.5, 0.9], tam: [10, 22], angulo: -90, abertura: 170 }); })
          .to(caja, { scaleX: 1.16, scaleY: 0.8, duration: 0.08, ease: 'power2.out' })
          .to(caja, { scaleX: 1, scaleY: 1, duration: 0.7, ease: 'elastic.out(1, 0.32)' });
      }
      gsap.fromTo(pista, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 });
      const respira = quieto() ? null : gsap.to(caja, { scaleY: 1.035, scaleX: 0.985, duration: 1.1, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      caja.onclick = () => accion?.('sig');
      if (capa.contains(document.activeElement) || [document.body, null].includes(document.activeElement)) caja.focus({ preventScroll: true });
      TODAS.cola = false;
      const a = TODAS.pendiente || await esperarAccion(); TODAS.pendiente = null;
      if (a === 'cerrar') break;
      caja.onclick = null; respira?.kill(); gsap.set(caja, { scaleX: 1, scaleY: 1 });
      caja.tabIndex = -1; caja.removeAttribute('role'); pista.inert = true; // abierta: ni la bolsa ni la pista se enfocan ya
      if (a === 'todas') { gsap.killTweensOf(pista); await gsap.to([caja, pista], { opacity: 0, y: 30, duration: 0.25 }); await abrirTodas(); break; }
      gsap.killTweensOf(pista); gsap.to(pista, { opacity: 0, duration: 0.2 });
      // 2) pide el objeto mientras la bolsa tiembla; el brillo delata la rareza
      const peticion = api('/api/bolsa/abrir', {}).catch((e) => ({ error: e.message }));
      let res = null, total = 2;
      const nSacudidas = { comun: 2, raro: 3, epico: 4, legendario: 5 };
      for (let i = 0; i < total; i++) {
        son.toque(); son.koto(son.escalon(i * 2 + 2, 62), 0, 0.45, i % 2 ? 0.3 : -0.3);
        if (!quieto()) {
          const amp = 7 + i * 4;
          await gsap.timeline()
            .to(caja, { scaleX: 1.1, scaleY: 0.86, duration: 0.1, ease: 'power2.out' })
            .to(caja, { y: -(26 + i * 12), scaleX: 0.94, scaleY: 1.1, rotation: i % 2 ? amp : -amp, duration: 0.17, ease: 'power2.out' })
            .to(caja, { y: 0, scaleX: 1, scaleY: 1, rotation: 0, duration: 0.15, ease: 'power2.in' })
            .to(caja, { scaleX: 1.12, scaleY: 0.86, duration: 0.06 })
            .to(caja, { scaleX: 1, scaleY: 1, duration: 0.12 })
            .to(caja, { rotation: i % 2 ? -amp * 0.6 : amp * 0.6, duration: 0.06, yoyo: true, repeat: 3, ease: 'none' })
            .to(caja, { rotation: 0, duration: 0.08 });
        } else await espera(250);
        if (i === 0) {
          res = await peticion;
          if (res.error) break;
          const r = RAREZA[res.objeto?.rareza] ? res.objeto.rareza : 'comun';
          total = nSacudidas[r];
          capa.className = `rc-capa rc-bolsas r-${r}`;
        }
        if (res && !res.error && res.objeto.rareza !== 'comun') {
          const f = (i + 1) / total, cb = centro(caja);
          gsap.to(brillo, { opacity: 0.2 + f * 0.8, scale: 0.8 + f * 0.5, duration: 0.3 });
          if (ORDEN.indexOf(res.objeto.rareza) >= 2) estallido(cb.x, cb.r.top + cb.r.height * 0.35, { n: 6 + i * 3, tipos: ['chispa'], colores: [RAREZA[res.objeto.rareza].luz, '#fff'], vel: [120, 300], g: 200, vida: [0.4, 0.8], tam: [5, 9] });
          if (res.objeto.rareza === 'legendario' && i === total - 1 && !quieto()) gsap.fromTo($('.rc-sala', capa), { x: -12 }, { x: 0, duration: 0.6, ease: 'elastic.out(1, 0.2)' });
        }
      }
      if (!res || res.error) { toast(esc(res?.error || t('recompensas.bolsas.error'))); break; }
      quedan = res.bolsas_restantes ?? quedan - 1; ponerQuedan(quedan);
      const o = res.objeto, rz = RAREZA[o.rareza] ? o.rareza : 'comun', nivelR = ORDEN.indexOf(rz);
      const inv = (JUEGO?.inventario || []).find((x) => x.id === o.id);
      const vecesAntes = inv ? inv.n : 0;
      anotarBolsa(res, quedan); abiertas.push({ res });
      // 3) se abre: nudo fuera, volantes abiertos, destello, rayos y partículas
      const cb = centro(caja), boca = { x: cb.x, y: cb.r.top + cb.r.height * 0.3 };
      son.papel();
      if (rz === 'comun') [0, 2, 4].forEach((k, n) => son.koto(son.escalon(k + 5, 62), n * 0.07, 0.7));
      else if (rz === 'raro') son.subida(1);
      else if (rz === 'epico') { son.subida(3); son.taiko(0.05); }
      else son.fanfarria();
      gsap.timeline()
        .to($('.fk-nudo', svg), { scale: 1.5, rotation: 120, opacity: 0, svgOrigin: '120 104', duration: 0.4, ease: 'power2.out' }, 0)
        .to($('.fk-cordon', svg), { scaleX: 1.3, opacity: 0, svgOrigin: '120 105', duration: 0.3 }, 0.05)
        .to($('.fk-vol-i', svg), { rotation: -38, svgOrigin: '92 106', duration: 0.45, ease: 'back.out(2.2)' }, 0.08)
        .to($('.fk-vol-d', svg), { rotation: 38, svgOrigin: '148 106', duration: 0.45, ease: 'back.out(2.2)' }, 0.08)
        .to($('.fk-luz', svg), { opacity: 1, scale: 1.6, svgOrigin: '120 90', duration: 0.35 }, 0.1)
        .to(caja, { scaleX: 1.14, scaleY: 0.84, duration: 0.12, ease: 'power2.out' }, 0.08)
        .to(caja, { scaleX: 1, scaleY: 1, duration: 0.6, ease: 'elastic.out(1, 0.35)' }, 0.2)
        .fromTo($('.rc-destello', capa), { opacity: 0, background: nivelR === 3 ? '#fff0c2' : '#fffaf0' }, { opacity: quieto() ? 0.3 : [0.35, 0.55, 0.75, 0.95][nivelR], duration: 0.08 }, 0.14)
        .to($('.rc-destello', capa), { opacity: 0, duration: 0.6, ease: 'power2.out' }, 0.24)
        .fromTo(rayos, { opacity: 0, scale: 0.2 }, { opacity: [0.3, 0.5, 0.65, 0.9][nivelR], scale: 1, duration: 0.9, ease: 'power3.out' }, 0.15)
        .fromTo(halo, { opacity: 0, scale: 0.4 }, { opacity: [0.4, 0.55, 0.7, 0.95][nivelR], scale: 1, duration: 0.8, ease: 'power3.out' }, 0.15);
      if (!quieto()) gsap.to(rayos, { rotation: '+=360', duration: 40, ease: 'none', repeat: -1 });
      setTimeout(() => {
        const cols = [RAREZA[rz].color, RAREZA[rz].luz, '#fff6e4', '#f2b43a'];
        estallido(boca.x, boca.y, { n: [30, 46, 70, 110][nivelR], tipos: ['confeti', 'chispa', 'confeti'], colores: nivelR ? cols : CONFETI, vel: [300, 820 + nivelR * 120], g: 1000, vida: [1, 1.9], tam: [7, 13] });
        if (nivelR >= 2) estallido(boca.x, boca.y, { n: 24, tipos: ['luz'], colores: [RAREZA[rz].luz], vel: [100, 400], g: 0, vida: [0.6, 1.1], tam: [16, 34] });
        if (nivelR === 3) { lluviaPetalos(60, 2.5); canones(40); estallido(boca.x, boca.y, { n: 30, tipos: ['koban'], vel: [400, 900], g: 1100, vida: [1.4, 2.2], tam: [9, 14] }); }
      }, 150);
      // 4) la carta sale de la bolsa girando
      await espera(260);
      const cartaCaja = document.createElement('div'); cartaCaja.className = 'rc-carta-caja';
      cartaCaja.innerHTML = cartaHTML(o, { nuevo: res.nuevo, monedas: res.monedas_ganadas, n: res.veces ?? vecesAntes + 1, colocado: res.colocado });
      escena.appendChild(cartaCaja);
      const carta = $('.rc-carta', cartaCaja), cara = $('.rc-cara', cartaCaja), cc = centro(cartaCaja);
      const pegatina = $('.rc-pegatina', cara), sello = $('.rc-nuevo, .rc-repe', cara), detalles = $$('.rc-carta-jp, .rc-carta-nombre, .rc-carta-desc, .rc-carta-tipo', cara);
      gsap.set([pegatina, sello, ...detalles].filter(Boolean), { opacity: 0 });
      if (quieto()) { gsap.fromTo(carta, { opacity: 0 }, { opacity: 1, duration: 0.4 }); gsap.to(caja, { opacity: 0, duration: 0.3 }); }
      else {
        gsap.timeline()
          .fromTo(carta, { x: boca.x - cc.x, y: boca.y - cc.y + 30, scale: 0.18, rotationY: 900, rotationZ: -20 },
            { x: 0, y: 0, scale: 1, rotationY: 0, rotationZ: 0, duration: 1.05, ease: 'power3.out' })
          .to(caja, { y: 90, scale: 0.7, opacity: 0, duration: 0.5, ease: 'power2.in' }, 0.2)
          .to(brillo, { opacity: 0, duration: 0.4 }, 0.2)
          .to(carta, { scale: 1.05, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.out' }, '>-0.05');
        await espera(1000);
      }
      // 5) detalles: pegatina de rareza, nombre, ¡NUEVO! o koban por repetido
      son.toque();
      gsap.fromTo(pegatina, { scale: 2.2, rotation: -30, opacity: 0 }, { scale: 1, rotation: -7, opacity: 1, duration: 0.4, ease: 'back.out(2.6)' });
      gsap.fromTo(detalles, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.07, delay: 0.1, ease: 'power3.out' });
      if (!quieto()) gsap.to(cartaCaja, { y: -8, duration: 1.8, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 0.4 });
      inclinable($('.rc-carta-inclina', cartaCaja), { fuerza: 14, sobre: cartaCaja });
      await espera(420);
      if (sello && res.nuevo) {
        await gsap.fromTo(sello, { scale: 3, rotation: 40, opacity: 0 }, { scale: 1, rotation: 10, opacity: 1, duration: 0.3, ease: 'power4.in' });
        son.sello(); const cn = centro(sello);
        estallido(cn.x, cn.y, { n: 22, tipos: ['chispa', 'confeti'], colores: ['#d8412a', '#f2b43a', '#fff6e4'], vel: [200, 520], g: 700 });
        if (!quieto()) gsap.fromTo(cara, { x: 6 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
      } else if (sello) {
        gsap.fromTo(sello, { scale: 0.2, rotation: -30, opacity: 0 }, { scale: 1, rotation: 8, opacity: 1, duration: 0.45, ease: 'back.out(2.4)' });
        const num = $('.rc-num-koban', capa), despues = JUEGO?.monedas ?? 0;
        await monedasVuelan(sello, num.closest('.rc-chip'), Math.ceil((res.monedas_ganadas || 5) / 5));
        contar(num, despues - (res.monedas_ganadas || 0), despues, 0.7);
      }
      // 6) acciones
      const acciones = document.createElement('div'); acciones.className = 'rc-acciones';
      const usar = res.nuevo && !res.colocado ? (PARA_MOCHI[o.tipo] ? t('recompensas.usar.ponerselo') : t('recompensas.usar.colocar')) : '';
      acciones.innerHTML = `${usar ? `<button class="rc-boton claro" data-a="usar">${usar} ${kbd('P')}</button>` : ''}<button class="rc-boton claro" data-a="cerrar">${quedan ? t('recompensas.bolsa.guardar_salir') : t('comun.cerrar')} ${kbd('Esc')}</button>
        ${botonTodas(quedan)}<button class="rc-boton" data-a="sig">${quedan ? t('recompensas.bolsa.otra', { n: mil(quedan) }) : t('recompensas.bolsa.terminar')} ${kbd('Intro')}</button>`;
      escena.appendChild(acciones);
      gsap.fromTo($$('.rc-boton', acciones), { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.07, ease: 'back.out(2)' });
      $$('[data-a]', acciones).forEach((b) => { b.onclick = () => accion?.(b.dataset.a); });
      const sigB = $('[data-a="sig"]', acciones);
      sigB.focus({ preventScroll: true }); // el anillo de foco en el botón de Intro
      let elegido = await esperarAccion();
      if (elegido === 'usar') {
        const bu = $('[data-a="usar"]', acciones); bu.disabled = true; sigB.focus({ preventScroll: true });
        try {
          const rr = await api('/api/colocar', { id: o.id, colocado: true });
          sincronizarPuestos(rr.colocados); const it = JUEGO?.inventario.find((x) => x.id === o.id); if (it) it.nuevo = false;
          api('/api/coleccion/visto', { ids: [o.id] }).catch(() => {});
          son.sello(); bu.textContent = PARA_MOCHI[o.tipo] ? t('recompensas.usar.ya_lo_lleva') : t('recompensas.usar.colocado');
          const cbu = centro(bu); estallido(cbu.x, cbu.y, { n: 16, tipos: ['chispa'], colores: ['#7c8f3c', '#f2b43a', '#fff6e4'], vel: [140, 360], g: 500 });
          avisarCambio();
        } catch (err) { toast(esc(err.message)); }
        elegido = await esperarAccion();
      }
      // la carta vuela al título: se guarda en el 図鑑
      gsap.killTweensOf(cartaCaja);
      const logo = $('.rc-titulo .rc-logo', capa), ct = centro(logo), c2 = centro(carta);
      await gsap.timeline()
        .to(acciones, { opacity: 0, y: 20, duration: 0.2 })
        .to(carta, { x: `+=${ct.x - c2.x}`, y: `+=${ct.y - c2.y}`, scale: 0.08, rotationZ: -30, duration: quieto() ? 0.2 : 0.55, ease: 'power3.in' }, 0)
        .to([rayos, halo], { opacity: 0, duration: 0.4 }, 0);
      son.toque();
      if (!quieto()) gsap.fromTo(logo, { scale: 1.25 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.35)' });
      gsap.killTweensOf(rayos);
      if (elegido === 'todas' && quedan) { await abrirTodas(); break; }
      if (elegido !== 'sig' || !quedan) break;
    }
  } finally {
    TODAS.activo = false;
    soltar();
    await gsap.to(capa, { opacity: 0, duration: 0.35 });
    gsap.killTweensOf($$('*', capa)); capa.remove(); abriendo = false;
    try { await cargarJuego(); } catch {}
    avisarCambio();
  }
}

// ───────────────────────── subir de nivel ─────────────────────────
export function celebrarNivel(nivel, { bolsas = 1, koban = 0 } = {}) {
  return new Promise((resolver) => {
    son.iniciar?.();
    const capa = document.createElement('div'); capa.className = 'rc-capa rc-nivel r-legendario'; capa.setAttribute('role', 'dialog'); capa.setAttribute('aria-label', t('recompensas.nivel.aria', { n: nivel }));
    capa.innerHTML = `${salaHTML()}<div class="rc-halo"></div><div class="rc-rayos"></div>
      <div class="rc-nivel-centro">
        <div class="rc-nivel-ante">${t('recompensas.nivel.ante')}</div>
        <div class="rc-logo xl rc-nivel-titulo">${letras('レベルアップ')}</div>
        <div class="rc-medalla"><div class="rc-medalla-cara"><small>${t('recompensas.nivel.medalla')}</small><b><span class="rc-med-num">${nivel - 1}</span></b></div></div>
        <div class="rc-premios">${bolsas ? `<div class="rc-premio rc-ficha">${svgBolsa(34)} +${bolsas} 福袋</div>` : ''}${koban ? `<div class="rc-premio rc-ficha">${svgKoban(28)} +${koban}</div>` : ''}<div class="rc-premio rc-ficha">${svgKoban(20)} ${t('recompensas.nivel.meta', { n: nivel + 1 })}</div></div>
      </div><div class="rc-destello"></div><div class="rc-pista">${t('recompensas.nivel.pista', { intro: kbd('Intro') })}</div>`;
    document.body.appendChild(capa);
    const t0 = performance.now(), q = quieto();
    son.fanfarria();
    gsap.timeline()
      .fromTo(capa, { opacity: 0 }, { opacity: 1, duration: 0.3 })
      .fromTo($('.rc-destello', capa), { opacity: 0.9 }, { opacity: 0, duration: 0.7, ease: 'power2.out' }, 0.05)
      .fromTo($('.rc-sala', capa), { scale: q ? 1 : 1.1 }, { scale: 1, duration: 1.4, ease: 'power3.out' }, 0)
      .fromTo($('.rc-rayos', capa), { scale: 0.2, opacity: 0 }, { scale: 1, opacity: 0.55, duration: 1, ease: 'power3.out' }, 0.1)
      .fromTo($('.rc-halo', capa), { scale: 0.3, opacity: 0 }, { scale: 1, opacity: 0.75, duration: 0.9, ease: 'power3.out' }, 0.1)
      .fromTo($('.rc-nivel-ante', capa), { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 }, 0.15)
      .fromTo($$('.rc-nivel-titulo .rc-l', capa), { y: q ? 0 : -160, opacity: 0, rotation: () => (q ? 0 : azar(-40, 40)) }, { y: 0, opacity: 1, rotation: 0, duration: 0.55, stagger: 0.06, ease: 'back.out(2.2)' }, 0.2)
      .to($$('.rc-nivel-titulo .rc-l', capa), { scaleY: 0.8, scaleX: 1.1, transformOrigin: '50% 100%', duration: 0.07, stagger: 0.06, yoyo: true, repeat: 1 }, 0.62)
      .fromTo($('.rc-medalla', capa), { scale: 0, rotationY: q ? 0 : -540 }, { scale: 1, rotationY: 0, duration: 1, ease: 'back.out(1.6)' }, 0.55)
      .call(() => {
        const b = $('.rc-med-num', capa);
        gsap.timeline().to(b, { yPercent: -110, duration: 0.18, ease: 'power2.in' }).call(() => { b.textContent = nivel; son.taiko(); })
          .fromTo(b, { yPercent: 110 }, { yPercent: 0, duration: 0.45, ease: 'back.out(2.5)' });
        const c = centro($('.rc-medalla', capa));
        estallido(c.x, c.y, { n: 40, tipos: ['chispa', 'confeti'], colores: ['#f2b43a', '#fff6e4', '#f2661b'], vel: [300, 800] });
      }, null, 1.25)
      .fromTo($$('.rc-premio', capa), { y: 40, opacity: 0, scale: 0.8 }, { y: 0, opacity: 1, scale: 1, duration: 0.55, stagger: 0.1, ease: 'back.out(2)' }, 1.5)
      .fromTo($('.rc-pista', capa), { opacity: 0 }, { opacity: 1, duration: 0.4 }, 1.9);
    if (!q) {
      gsap.to($('.rc-rayos', capa), { rotation: 360, duration: 30, ease: 'none', repeat: -1 });
      gsap.to($('.rc-medalla', capa), { y: -10, duration: 1.6, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 1.6 });
    }
    setTimeout(() => canones(70), 250);
    lluviaPetalos(70, 3);
    let hecho = false, auto = 0;
    const soltar = capturarTeclas((e) => { if (['Enter', ' ', 'Escape'].includes(e.key)) cerrar(); else if (e.key === 'Tab') return false; });
    async function cerrar() {
      if (hecho || performance.now() - t0 < 750) return; hecho = true;
      soltar(); clearTimeout(auto);
      await gsap.to(capa, { opacity: 0, scale: 1.04, duration: 0.35, ease: 'power2.in' });
      gsap.killTweensOf($$('*', capa)); capa.remove(); resolver();
    }
    capa.onclick = cerrar;
    auto = setTimeout(cerrar, 6500);
  });
}

// ───────────────────────── combo ─────────────────────────
// Tramos (los mismos que en sonido.js): 3 · 5 · 10 · 15 · 20 · 30, y desde ahí cada 10. Cada tramo añade algo
// (color de la ficha, latido, aura, luz de la escena, pétalos, destellos, sacudida, Mochi que brinca) y los
// efectos pequeños se turnan al azar para que la racha no se vuelva repetitiva.
const COMBO = { el: null, ult: 0, luz: null, micro: -1, grande: -1 };
function comboEl() {
  if (COMBO.el?.isConnected) return COMBO.el;
  const el = document.createElement('div'); el.className = 'rc-combo'; el.setAttribute('aria-live', 'polite');
  el.innerHTML = '<div class="rc-combo-rayos"></div><div class="rc-combo-aura"></div><div class="rc-combo-ficha"><b>0</b><span>連</span></div><div class="rc-combo-info"><div class="rc-combo-txt"></div><div class="rc-combo-barra"><i></i></div></div>';
  document.body.appendChild(el); gsap.set(el, { opacity: 0 });
  COMBO.el = el; return el;
}
// luz de la escena: 0 apagada, 1 cálida, 2 dorada; fuerza 0–1 sube el brillo con la racha
function luzEscena(nivel, fuerza = 0.5) {
  if (!COMBO.luz?.isConnected) { COMBO.luz = document.createElement('div'); COMBO.luz.className = 'rc-luz-escena'; document.body.appendChild(COMBO.luz); }
  const l = COMBO.luz; gsap.killTweensOf(l);
  l.classList.toggle('oro', nivel === 2);
  if (!nivel) { gsap.to(l, { opacity: 0, duration: 0.9 }); return; }
  const fin = Math.min(1, 0.5 + 0.5 * fuerza);
  gsap.timeline().to(l, { opacity: Math.min(1, fin + 0.25), duration: 0.18 }).to(l, { opacity: fin, duration: 1.1, ease: 'power2.out' });
}
function destelloPantalla(color = '#fff6e0', op = 0.3) {
  const f = document.createElement('div'); f.className = 'rc-flash'; f.style.background = `radial-gradient(90% 80% at 50% 45%, ${color}, transparent 80%)`; document.body.appendChild(f);
  gsap.timeline({ onComplete: () => f.remove() }).to(f, { opacity: quieto() ? op * 0.4 : op, duration: 0.07 }).to(f, { opacity: 0, duration: 0.55, ease: 'power2.out' });
}
// sacudida suave de la vista (nunca con movimiento reducido ni si la vista ya tiene su propia transformación)
function sacudida(fuerza = 6) {
  const v = document.querySelector('.vista.activa');
  if (quieto() || !v || v.style.transform || gsap.isTweening(v)) return;
  gsap.timeline({ onComplete: () => gsap.set(v, { clearProps: 'transform' }) })
    .to(v, { x: fuerza, y: -fuerza * 0.4, duration: 0.05, ease: 'power1.out' })
    .to(v, { x: -fuerza * 0.8, y: fuerza * 0.3, duration: 0.07 })
    .to(v, { x: fuerza * 0.45, y: 0, duration: 0.07 })
    .to(v, { x: 0, y: 0, duration: 0.3, ease: 'elastic.out(1, 0.35)' });
}
// Mochi (el lienzo compacto del estudio) brinca más cuanto más larga es la racha
function brincoMochi(fuerza = 1) {
  const m = document.querySelector('canvas.mini-mochi');
  if (quieto() || !m || m.style.display === 'none' || gsap.isTweening(m)) return;
  const tl = gsap.timeline({ onComplete: () => gsap.set(m, { clearProps: 'transform' }) });
  tl.to(m, { scaleX: 1.08, scaleY: 0.9, transformOrigin: '50% 100%', duration: 0.08 })
    .to(m, { y: -18 - 26 * fuerza, scaleX: 0.95, scaleY: 1.06, rotation: fuerza >= 2 ? (Math.random() < 0.5 ? -8 : 8) : 0, duration: 0.2, ease: 'power2.out' })
    .to(m, { y: 0, rotation: 0, scaleX: 1, scaleY: 1, duration: 0.24, ease: 'power2.in' })
    .to(m, { scaleX: 1.1, scaleY: 0.88, duration: 0.06 })
    .to(m, { scaleX: 1, scaleY: 1, duration: 0.45, ease: 'elastic.out(1, 0.35)' });
  if (fuerza >= 3) tl.to(m, { rotation: 360, duration: 0.5, ease: 'back.out(1.4)' }, 0.1).set(m, { rotation: 0 }, '>');
}
function fuegos(n = 3) {
  const cols = [['#f2b43a', '#fff6e4', '#f2661b'], ['#f2a3a3', '#fff6e4', '#d8412a'], ['#9fd0ff', '#fff6e4', '#f2b43a'], ['#d9a6ff', '#fff6e4', '#f2b43a']];
  for (let i = 0; i < n; i++) setTimeout(() => {
    const x = innerWidth * azar(0.22, 0.78), y = innerHeight * azar(0.14, 0.4), c = elegir(cols);
    estallido(x, y, { n: 34, tipos: ['chispa', 'chispa', 'luz'], colores: c, vel: [160, 440], g: 260, vida: [0.8, 1.5], tam: [5, 10], freno: 0.95 });
  }, i * 260);
}
function lluviaKoban(n = 26) {
  if (quieto()) n = 6;
  for (let i = 0; i < n; i++) particula({ tipo: 'koban', x: azar(40, innerWidth - 40), y: azar(-80, -20), vx: azar(-40, 40), vy: azar(160, 320), g: 700, vmax: 900, freno: 1, max: azar(1.4, 2.2), tam: azar(8, 13), retraso: azar(0, 0.8) });
}
function rayosCombo(el, color = 'rgba(255,226,140,.75)') {
  const r = $('.rc-combo-rayos', el); if (!r || quieto()) return;
  gsap.killTweensOf(r);
  r.style.background = `repeating-conic-gradient(from 0deg, ${color} 0deg 7deg, transparent 7deg 20deg)`;
  gsap.timeline().fromTo(r, { opacity: 0, scale: 0.3, rotation: 0 }, { opacity: 0.9, scale: 1, rotation: 40, duration: 0.6, ease: 'power3.out' })
    .to(r, { opacity: 0, rotation: 90, scale: 1.15, duration: 1.2, ease: 'power2.in' });
}
function cinta(titulo, sub, color = 'var(--acento)', grande = false) {
  $$('.rc-cinta').forEach((x) => { gsap.killTweensOf(x); x.remove(); });
  const c = document.createElement('div'); c.className = `rc-cinta${grande ? ' grande' : ''}`;
  c.innerHTML = `<div class="rc-cinta-banda"><div class="rc-logo l" style="color:${color}">${letras(titulo)}</div>${sub ? `<small>${sub}</small>` : ''}</div>`;
  document.body.appendChild(c);
  const banda = $('.rc-cinta-banda', c);
  if (quieto()) { gsap.fromTo(c, { opacity: 0 }, { opacity: 1, duration: 0.3 }); gsap.to(c, { opacity: 0, duration: 0.3, delay: 1.4, onComplete: () => c.remove() }); return; }
  gsap.timeline({ onComplete: () => c.remove() })
    .fromTo(banda, { y: 60, scale: 0.2, rotation: -16, transformOrigin: '12% 100%' }, { y: 0, scale: 1, rotation: -4, duration: 0.5, ease: 'back.out(2.2)' })
    .fromTo($$('.rc-l', c), { y: -30, opacity: 0, scale: 0.6 }, { y: 0, opacity: 1, scale: 1, stagger: 0.035, duration: 0.35, ease: 'back.out(3)' }, 0.12)
    .to(banda, { rotation: -2, y: -4, duration: grande ? 1.3 : 1, ease: 'sine.inOut' })
    .to(banda, { y: -40, scale: 0.9, opacity: 0, duration: 0.35, ease: 'power2.in' });
}
const TEXTO_TRAMO = [t('recompensas.combo.seguidas'), t('recompensas.combo.seguidas'), t('recompensas.combo.racha'), t('recompensas.combo.llamas'), t('recompensas.combo.sin_freno'), t('recompensas.combo.imparable_x2'), t('recompensas.combo.leyenda_x2')];
const tramoDe = (r) => (son.tramoDe ? son.tramoDe(r) : [3, 5, 10, 15, 20, 30].filter((t) => r >= t).length);
const esHito = (r) => (son.esHito ? son.esHito(r) : [3, 5, 10, 15, 20, 30].includes(r) || (r > 30 && r % 10 === 0));
// efecto pequeño de cada acierto (a partir de 5): se elige al azar y nunca el mismo dos veces seguidas
function microEfecto(c, t) {
  let k; do { k = Math.floor(Math.random() * 3); } while (k === COMBO.micro); COMBO.micro = k;
  const n = 3 + t;
  if (k === 0) estallido(c.x, c.y, { n, tipos: ['petalo'], vel: [120, 300], g: 220, vida: [1.2, 2], tam: [7, 11], angulo: -70, abertura: 80 });
  else if (k === 1) estallido(c.x, c.y, { n: n + 2, tipos: ['chispa'], colores: t >= 5 ? ['#ffd25a', '#fff6e4'] : ['#f2661b', '#f2b43a', '#fff6e4'], vel: [160, 360], g: 500, vida: [0.5, 0.9], tam: [5, 9], angulo: -80, abertura: 120 });
  else estallido(c.x, c.y, { n: Math.ceil(n / 2) + 1, tipos: ['luz'], colores: [t >= 5 ? 'rgba(255,214,110,.9)' : 'rgba(255,190,120,.85)'], vel: [60, 180], g: -140, vida: [0.8, 1.3], tam: [10, 20], angulo: -90, abertura: 70 });
  if (t >= 5) lluviaPetalos(2 + (t - 5) * 2, 0.6);
}
// hitos grandes desde 40: se turnan cuatro espectáculos con sus rótulos (nunca el mismo dos veces seguidas)
const GRANDES = [
  [t('recompensas.combo.leyenda_viva'), () => { fuegos(4); canones(26); }],
  [t('recompensas.combo.nadie_te_para'), () => { lluviaPetalos(90, 1.8); fuegos(2); }],
  [t('recompensas.combo.menuda_racha'), () => { lluviaKoban(30); canones(20); }],
  [t('recompensas.combo.samurai'), () => { fuegos(3); lluviaKoban(16); lluviaPetalos(40, 1.2); }],
];
// efectos por tramo de combo; devuelve el hito alcanzado (3, 5, 10, 15, 20, 30, 40…) o 0
export function efectoCombo(racha) {
  const antes = COMBO.ult; COMBO.ult = racha;
  const el = comboEl(), ficha = $('.rc-combo-ficha', el), num = $('b', ficha), txt = $('.rc-combo-txt', el), barra = $('.rc-combo-barra i', el);
  gsap.killTweensOf([el, ficha]);
  if (racha < 2) {
    $$('.rc-cinta').forEach((x) => { gsap.killTweensOf(x); gsap.to(x, { opacity: 0, y: 20, duration: 0.2, onComplete: () => x.remove() }); });
    if (antes >= 3) { // se rompe con suavidad, sin humillar
      son.rachaRota?.(antes);
      txt.textContent = antes >= 10 ? t('recompensas.combo.rota_larga', { n: mil(antes) }) : t('recompensas.combo.rota', { n: mil(antes) });
      $('.rc-combo-x2', ficha)?.remove();
      gsap.timeline()
        .to(ficha, { rotation: -18, y: 8, scale: 0.86, filter: 'saturate(.3)', duration: 0.35, ease: 'power2.out' })
        .to(el, { opacity: 0, y: 16, duration: 0.5, delay: 1.2, ease: 'power2.in' })
        .set(ficha, { rotation: 0, y: 0, scale: 1, filter: 'none' }).set(el, { y: 0 }).call(() => { el.className = 'rc-combo'; });
      luzEscena(0);
    } else gsap.to(el, { opacity: 0, duration: 0.3 });
    return 0;
  }
  const tr = tramoDe(racha);
  el.className = `rc-combo c${tr}`;
  gsap.set(ficha, { rotation: 0, y: 0, filter: 'none' }); gsap.set(el, { y: 0 });
  num.textContent = racha;
  const metas = [3, 5, 10, 15, 20, 30];
  const sig = metas.find((m) => m > racha) ?? Math.floor(racha / 10) * 10 + 10;
  const desde = racha >= 30 ? Math.floor(racha / 10) * 10 : ([...metas].reverse().find((m) => m <= racha) ?? 0);
  txt.textContent = TEXTO_TRAMO[tr];
  gsap.to(el, { opacity: 1, duration: 0.25 });
  gsap.to(barra, { width: `${Math.min(100, ((racha - desde) / (sig - desde)) * 100)}%`, duration: 0.5, ease: 'power3.out' });
  if (!quieto()) {
    gsap.fromTo(num, { scale: 1.5 + tr * 0.12, rotation: tr % 2 ? 12 : -12 }, { scale: 1, rotation: 0, duration: 0.55, ease: 'elastic.out(1, 0.35)' });
    gsap.fromTo(ficha, { scaleX: 1.1 + tr * 0.02, scaleY: 0.9 - tr * 0.015 }, { scaleX: 1, scaleY: 1, duration: 0.5, ease: 'elastic.out(1, 0.35)' });
  }
  const c = centro(ficha);
  // cada acierto: chispas que crecen con el tramo, un efecto variado desde 5 y la luz de la sala que late desde 10
  estallido(c.x, c.y, { n: 3 + tr * 3, tipos: tr >= 5 ? ['chispa', 'koban'] : ['chispa'], colores: tr >= 5 ? ['#f2b43a', '#fff6e4'] : ['#f2661b', '#f2b43a', '#fff6e4'], vel: [120, 260 + tr * 30], g: 400, vida: [0.5, 0.9], tam: [5, 9] });
  if (tr >= 2) microEfecto(c, tr);
  if (tr >= 3) { luzEscena(tr >= 5 ? 2 : 1, Math.min(1, (racha - 10) / 25)); if (tr >= 4) brincoMochi(0.4); }
  if (tr >= 5 && !$('.rc-combo-x2', ficha)) { ficha.insertAdjacentHTML('beforeend', '<span class="rc-combo-x2">×2</span>'); gsap.fromTo($('.rc-combo-x2', ficha), { scale: 0 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' }); }
  if (!esHito(racha)) return 0;
  // hitos
  son.tramo?.(racha);
  if (racha === 3) {
    cinta(t('recompensas.combo.buen_ritmo'), t('recompensas.combo.n_seguidas', { n: mil(3) }), 'var(--bien-txt)');
    estallido(c.x, c.y, { n: 16, tipos: ['chispa', 'confeti'], vel: [200, 420], angulo: -60, abertura: 110 });
    brincoMochi(0.5);
  } else if (racha === 5) {
    cinta(t('recompensas.combo.racha'), t('recompensas.combo.n_seguidas', { n: mil(5) }));
    estallido(c.x, c.y, { n: 30, tipos: ['petalo'], vel: [200, 500], g: 300, vida: [1.6, 2.6], angulo: -60, abertura: 90 }); lluviaPetalos(24, 1.2);
    brincoMochi(1);
  } else if (racha === 10) {
    cinta(t('recompensas.combo.x10'), t('recompensas.combo.sala'), 'var(--mal-txt)');
    estallido(c.x, c.y, { n: 36, tipos: ['chispa', 'confeti'], vel: [240, 640], angulo: -60, abertura: 100 });
    destelloPantalla('#fff0d0', 0.28); sacudida(5); rayosCombo(el); brincoMochi(1.5);
  } else if (racha === 15) {
    cinta(t('recompensas.combo.sin_freno'), t('recompensas.combo.no_se_lo_cree', { n: mil(15) }), 'var(--acento-tinta)');
    canones(22); lluviaPetalos(40, 1.4); estallido(c.x, c.y, { n: 24, tipos: ['luz'], colores: ['rgba(255,190,120,.9)'], vel: [80, 300], g: -60, vida: [0.8, 1.3], tam: [14, 28] });
    destelloPantalla('#ffe2c0', 0.3); sacudida(7); rayosCombo(el, 'rgba(255,170,110,.7)'); brincoMochi(2);
  } else if (racha === 20) {
    cinta(t('recompensas.combo.imparable'), t('recompensas.combo.desde_ahora'), 'var(--aviso-txt)', true);
    luzEscena(2, 0.3); canones(34); destelloPantalla('#fff3c4', 0.38); sacudida(8); rayosCombo(el); brincoMochi(2.5);
  } else {
    let k = 0;
    if (racha > 30) { do { k = Math.floor(Math.random() * GRANDES.length); } while (k === COMBO.grande); }
    COMBO.grande = k;
    const [tit, fx] = racha === 30 ? [t('recompensas.combo.leyenda'), GRANDES[0][1]] : GRANDES[k];
    cinta(tit, t('recompensas.combo.n_seguidas_x2', { n: mil(racha) }), 'var(--aviso-txt)', true);
    fx(); luzEscena(2, 1); destelloPantalla('#fff3c4', 0.42); sacudida(9); rayosCombo(el, 'rgba(255,214,90,.8)'); brincoMochi(3);
  }
  return racha;
}
export function limpiarCombo() {
  COMBO.ult = 0;
  $$('.rc-cinta').forEach((x) => { gsap.killTweensOf(x); x.remove(); });
  if (COMBO.el) { gsap.killTweensOf(COMBO.el); COMBO.el.remove(); COMBO.el = null; }
  if (COMBO.luz) { gsap.killTweensOf(COMBO.luz); COMBO.luz.remove(); COMBO.luz = null; }
}

// ───────────────────────── barra de XP y orbes ─────────────────────────
const XP = { total: 0, mostrado: 0 };
export function ponerXP(total) { XP.total = XP.mostrado = Math.max(0, total || 0); }
export const xpActual = () => XP.total;
export function htmlBarraXP() {
  const nv = nivelDe(XP.mostrado);
  return `<div id="barra-xp" class="rc-xp" title="${t('recompensas.xp.tit')}"><div class="rc-xp-nivel"><small>${t('recompensas.xp.nv')}</small><b>${nv.L}</b></div>
    <div class="rc-xp-cuerpo"><div class="rc-xp-pista"><i class="rc-xp-relleno" style="width:${(nv.pct * 100).toFixed(1)}%"></i><span class="rc-xp-destello"></span></div>
    <div class="rc-xp-txt"><span><b class="rc-xp-dentro">${mil(nv.dentro)}</b> / ${mil(nv.need)} XP</span><span>${t('recompensas.xp.siguiente', { n: nv.L + 1 })}</span></div></div></div>`;
}
function pintarXP(valor, animar = true) {
  const bar = $('#barra-xp');
  const antes = nivelDe(XP.mostrado), nv = nivelDe(valor);
  XP.mostrado = valor;
  if (!bar) return;
  if (!animar || quieto()) { bar.outerHTML = htmlBarraXP(); return; }
  const rel = $('.rc-xp-relleno', bar), dentro = $('.rc-xp-dentro', bar), lv = $('.rc-xp-nivel b', bar), txt = $('.rc-xp-txt', bar);
  if (nv.L > antes.L) {
    gsap.timeline()
      .to(rel, { width: '100%', duration: 0.35, ease: 'power2.in' })
      .to($('.rc-xp-destello', bar), { opacity: 0.9, duration: 0.1, yoyo: true, repeat: 1 })
      .call(() => {
        lv.textContent = nv.L; txt.innerHTML = `<span><b class="rc-xp-dentro">${mil(nv.dentro)}</b> / ${mil(nv.need)} XP</span><span>${t('recompensas.xp.siguiente', { n: nv.L + 1 })}</span>`;
        gsap.fromTo($('.rc-xp-nivel', bar), { scale: 1.5, rotation: -20 }, { scale: 1, rotation: 0, duration: 0.7, ease: 'elastic.out(1, 0.35)' });
      })
      .set(rel, { width: '0%' })
      .to(rel, { width: `${nv.pct * 100}%`, duration: 0.6, ease: 'power3.out' });
  } else {
    gsap.to(rel, { width: `${nv.pct * 100}%`, duration: 0.5, ease: 'power3.out' });
    contar(dentro, antes.dentro, nv.dentro, 0.5);
    gsap.fromTo($('.rc-xp-pista', bar), { scaleY: 1.5 }, { scaleY: 1, duration: 0.45, ease: 'elastic.out(1, 0.4)' });
  }
}
export function xpVuela(desde, cantidad, total, { doble = false } = {}) {
  if (total != null) XP.total = total; else XP.total += cantidad || 0;
  const destino = XP.total, bar = $('#barra-xp');
  if (!cantidad) return;
  if (!bar || !desde?.isConnected) { pintarXP(destino, false); return; }
  const d = centro(desde), meta = centro($('.rc-xp-pista', bar));
  const et = document.createElement('div'); et.className = 'rc-mas-xp'; et.textContent = `+${cantidad} XP${doble ? ' ×2' : ''}`; document.body.appendChild(et);
  gsap.timeline({ onComplete: () => et.remove() })
    .fromTo(et, { left: d.x, top: d.y, scale: 0.4, opacity: 0 }, { top: d.y - 50, scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(2.5)' })
    .to(et, { opacity: 0, top: d.y - 80, duration: 0.4, delay: 0.5, ease: 'power2.in' });
  if (quieto()) { pintarXP(destino, false); return; }
  const n = Math.max(3, Math.min(12, Math.ceil(cantidad / 3))), inicio = XP.mostrado;
  let llegados = 0;
  for (let i = 0; i < n; i++) {
    const o = document.createElement('div'); o.className = 'rc-orbe'; document.body.appendChild(o);
    const ang = azar(0, Math.PI * 2), rad = azar(30, 80);
    gsap.set(o, { x: d.x, y: d.y, scale: 0 });
    gsap.timeline({ delay: 0.12 + i * 0.035, onComplete: () => {
      o.remove(); llegados++;
      if (llegados === 1) son.koto(son.escalon(10, 62), 0, 0.2);
      if (llegados === n) { pintarXP(destino, true); return; }
      const parcial = inicio + ((destino - inicio) * llegados) / n, bv = $('#barra-xp');
      if (bv && nivelDe(parcial).L === nivelDe(inicio).L) $('.rc-xp-relleno', bv).style.width = `${nivelDe(parcial).pct * 100}%`;
    } })
      .to(o, { x: d.x + Math.cos(ang) * rad, y: d.y + Math.sin(ang) * rad, scale: 1, duration: 0.28, ease: 'power2.out' })
      .to(o, { x: meta.x + azar(-20, 20), duration: 0.55, ease: 'power2.in' })
      .to(o, { y: meta.y, scale: 0.6, duration: 0.55, ease: 'back.in(1.2)' }, '<');
  }
}

// ───────────────────────── fin de sesión ─────────────────────────
export async function finSesion(datos = {}) {
  const { contenedor, silencioso, ...cuerpo } = datos;
  let antes = null;
  if (!silencioso) try { antes = await api('/api/juego'); } catch {}
  let r;
  try { r = await api('/api/sesion/fin', cuerpo); } catch { return null; }
  try { await cargarJuego(); } catch {}
  avisarCambio();
  if (silencioso) return r;
  if (!contenedor) { if (r.bolsas_ganadas) toast(`${svgBolsa(38)}<span>${t('recompensas.fin.toast')}</span>`); return r; }
  const previo = {}; (antes?.misiones || []).forEach((m) => { previo[m.id] = m.progreso; });
  const j = { ...(JUEGO || {}), misiones: r.misiones || JUEGO?.misiones || [] };
  const nv = nivelDe(r.xp_total ?? XP.total); // la XP del servidor: la barra aún puede estar animando la de antes
  const pendiente =(j.misiones || []).filter((m) => !m.hecha).sort((a, b) => b.progreso / b.meta - a.progreso / a.meta)[0];
  const meta = { xp: mil(nv.need - nv.dentro), nivel: nv.L + 1, mision: esc(pendiente?.texto) };
  contenedor.innerHTML = `<div class="rc-fin">
    <div class="rc-fin-cab"><span>${t('recompensas.fin.botin')}</span><div class="rc-chip koban">${ico('koban')}<div><b class="rc-num-koban">${mil(JUEGO?.monedas ?? r.monedas ?? 0)}</b><small>${t('recompensas.koban')}</small></div></div></div>
    ${r.bolsas_ganadas ? `<div class="rc-fin-bolsa rc-ficha"><div class="rc-fin-bolsa-ico">${svgBolsa(84)}</div><div><h4>${tn('recompensas.fin.bolsas', r.bolsas_ganadas)}</h4><p>${t('recompensas.fin.bolsa_p')}</p></div><button class="rc-boton" data-abrir>${t('recompensas.fin.abrir')}</button></div>` : ''}
    ${(j.misiones || []).length ? htmlMisiones(j, previo) : ''}
    ${!r.bolsas_ganadas && r.falta_para_bolsa > 0 ? `<div class="rc-fin-meta"><span>${svgBolsa(30)}</span><span>${tn('recompensas.fin.falta', r.falta_para_bolsa)}</span></div>` : ''}
    <div class="rc-fin-meta"><span class="rc-flecha">→</span><span>${pendiente ? tn('recompensas.fin.meta_mision', pendiente.meta - pendiente.progreso, meta) : t('recompensas.fin.meta', meta)}</span></div>
  </div>`;
  const q = quieto();
  gsap.fromTo($$('.rc-fin > *', contenedor), { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: q ? 0.2 : 0.6, stagger: 0.12, ease: 'back.out(1.6)', delay: 0.2 });
  // las barras avanzan desde donde estaban antes de la sesión
  $$('.rc-mision', contenedor).forEach((fila, i) => {
    const m = j.misiones.find((x) => x.id === fila.dataset.mision); if (!m) return;
    const desde = previo[m.id] ?? m.progreso, barra = $('.rc-mis-barra i', fila), prog = $('.rc-mis-prog', fila);
    if (desde === m.progreso) return;
    gsap.to(barra, { width: `${Math.max(4, Math.min(1, m.progreso / m.meta) * 100)}%`, duration: q ? 0.1 : 1.1, delay: 0.7 + i * 0.15, ease: 'power3.out' });
    gsap.delayedCall(0.7 + i * 0.15, () => contar(prog, desde, Math.min(m.meta, m.progreso), 1.1));
    if (m.hecha && desde < m.meta) gsap.delayedCall(1.8 + i * 0.15, () => {
      son.sello(); const c = centro($('.rc-mis-check', fila));
      estallido(c.x, c.y, { n: 20, tipos: ['chispa', 'confeti'], colores: ['#7c8f3c', '#f2b43a', '#fff6e4'], vel: [160, 420], g: 600 });
      gsap.fromTo($('.rc-mis-check', fila), { scale: 2, rotation: -30 }, { scale: 1, rotation: 0, duration: 0.5, ease: 'back.out(3)' });
    });
  });
  enlazarCobro(contenedor);
  const ab = $('[data-abrir]', contenedor);
  if (ab) {
    const bolsaIco = $('.rc-fin-bolsa-ico', contenedor);
    if (!q) {
      gsap.fromTo(bolsaIco, { y: -160, rotation: -20 }, { y: 0, rotation: 0, duration: 0.8, delay: 0.35, ease: 'bounce.out' });
      gsap.to(bolsaIco, { rotation: 8, duration: 0.12, yoyo: true, repeat: 5, repeatDelay: 2.4, delay: 1.8, ease: 'sine.inOut' });
    }
    ab.onclick = async () => { await abrirBolsas(); if (!JUEGO?.bolsas) { ab.textContent = t('recompensas.fin.abierta'); ab.disabled = true; } };
  }
  return r;
}

// ───────────────────────── colección 図鑑 ─────────────────────────
let filtroZukan = 'todo';
export async function coleccion(contenedor) {
  if (!contenedor) return;
  let j;
  try { j = await cargarJuego(); } catch { contenedor.innerHTML = `<p style="font:600 14px var(--f-texto)">${t('recompensas.zukan.sin_servidor')}</p>`; return; }
  pintarZukan(contenedor, j, true);
}
function pintarZukan(cont, j, entrada) {
  const inv = new Map((j.inventario || []).map((x) => [x.id, x]));
  const objs = (j.catalogo?.objetos || []).slice().sort((a, b) => ORDEN_TIPO.indexOf(a.tipo) - ORDEN_TIPO.indexOf(b.tipo) || ORDEN.indexOf(a.rareza) - ORDEN.indexOf(b.rareza));
  const tienes = objs.filter((o) => inv.has(o.id)).length, total = objs.length;
  const visibles = objs.filter((o) => filtroZukan === 'todo' || o.tipo === filtroZukan);
  const porRareza = ORDEN.map((r) => { const l = objs.filter((o) => o.rareza === r); return `<span class="r-${r}"><i></i>${RAREZA[r].nombre} ${l.filter((o) => inv.has(o.id)).length}/${l.length}</span>`; }).join('');
  let tipoAnt = null;
  const huecos = visibles.map((o) => {
    let h = '';
    if (filtroZukan === 'todo' && o.tipo !== tipoAnt) { tipoAnt = o.tipo; h += `<div class="rc-grupo-tit">${{ accesorio: t('recompensas.zukan.grupo.accesorio'), ropa: t('recompensas.zukan.grupo.ropa'), aura: t('recompensas.zukan.grupo.aura') }[o.tipo] || t('recompensas.zukan.grupo.habitacion')}</div>`; }
    const x = inv.get(o.id);
    if (!x) return h + `<div class="rc-hueco falta r-${o.rareza}" title="${t('recompensas.zukan.falta')}">${silueta(o)}<b>？？？</b><small>${RAREZA[o.rareza]?.nombre || ''}</small></div>`;
    return h + `<button class="rc-hueco tiene r-${o.rareza}" data-obj="${esc(o.id)}">${ILUS(o)}<b>${esc(o.nombre)}</b><small>${esc(o.jp)}</small>
      ${x.n > 1 ? `<i class="rc-n">×${x.n}</i>` : ''}${x.nuevo ? `<em class="rc-nuevo-mini">${t('recompensas.nuevo')}</em>` : ''}${x.colocado ? `<span class="rc-puesto ${x.nuevo ? 'izq' : ''}" title="${PARA_MOCHI[o.tipo] ? t('recompensas.zukan.lo_lleva') : t('recompensas.zukan.en_habitacion')}">✓</span>` : ''}<span class="rc-brillo-h"></span></button>`;
  }).join('');
  cont.innerHTML = `<div class="rc-zukan">
    <div class="rc-zukan-cab"><span class="rc-logo l">図鑑</span>
      <div><h3>${t('recompensas.zukan.tit')}</h3><p>${t('recompensas.zukan.cuenta', { tienes: mil(tienes), total: mil(total), huecos: tn('recompensas.zukan.huecos', total - tienes) })}</p><div class="rc-zukan-barra"><i style="width:${(100 * tienes) / Math.max(1, total)}%"></i></div><div class="rc-rarezas">${porRareza}</div></div>
      <div class="rc-filtros">${[['todo', t('recompensas.zukan.filtro.todo')], ['habitacion', t('recompensas.zukan.filtro.habitacion')], ['accesorio', t('recompensas.zukan.filtro.accesorio')], ['ropa', t('recompensas.zukan.filtro.ropa')], ['aura', t('recompensas.zukan.filtro.aura')]].map(([k, nombre]) => `<button data-f="${k}" class="${filtroZukan === k ? 'si' : ''}">${nombre}</button>`).join('')}</div></div>
    <div class="rc-rejilla" aria-label="${t('recompensas.zukan.aria')}">${huecos}</div></div>`;
  $$('[data-f]', cont).forEach((b) => { b.onclick = () => { son.toque(); filtroZukan = b.dataset.f; pintarZukan(cont, JUEGO, true); $(`[data-f="${filtroZukan}"]`, cont)?.focus({ preventScroll: true }); }; });
  rejilla($('.rc-rejilla', cont), '.rc-hueco.tiene');
  $$('.rc-hueco.tiene', cont).forEach((b) => {
    b.onclick = () => { son.toque(); detalle(objeto(b.dataset.obj) || { id: b.dataset.obj, nombre: b.dataset.obj, rareza: 'comun' }, cont); };
    inclinable(b, { fuerza: 10, perspectiva: 700 });
  });
  if (entrada && !quieto()) {
    gsap.fromTo($('.rc-zukan-barra i', cont), { width: '0%' }, { width: `${(100 * tienes) / Math.max(1, total)}%`, duration: 1.1, ease: 'power3.out', delay: 0.2 });
    gsap.fromTo($$('.rc-hueco', cont), { y: 24, opacity: 0, scale: 0.9 }, { y: 0, opacity: 1, scale: 1, duration: 0.45, stagger: 0.018, ease: 'back.out(1.8)', delay: 0.1 });
  }
}
// ficha grande de un objeto con su acción (colocar / quitar, ponérselo / quitárselo)
function detalle(o, cont) {
  const x = (JUEGO?.inventario || []).find((i) => i.id === o.id) || { n: 1 };
  const capa = document.createElement('div'); capa.className = 'rc-capa rc-detalle'; capa.setAttribute('role', 'dialog'); capa.setAttribute('aria-label', o.nombre);
  const txt = (p) => (PARA_MOCHI[o.tipo] ? (p ? t('recompensas.usar.quitarselo') : t('recompensas.usar.ponerselo')) : (p ? t('recompensas.usar.quitar') : t('recompensas.usar.colocar')));
  let puesto = !!x.colocado, ocupado = false;
  capa.innerHTML = `<div class="rc-escena"><div class="rc-carta-caja">${cartaHTML(o, { n: x.n })}</div>
    <div class="rc-acciones"><button class="rc-boton claro" data-a="cerrar">${t('comun.cerrar')} ${kbd('Esc')}</button><button class="rc-boton ${puesto ? 'claro' : ''}" data-a="usar">${txt(puesto)} ${kbd('Intro')}</button></div></div>`;
  document.body.appendChild(capa);
  const caja = $('.rc-carta-caja', capa), carta = $('.rc-carta', capa);
  gsap.fromTo(capa, { opacity: 0 }, { opacity: 1, duration: 0.25 });
  if (!quieto()) gsap.fromTo(carta, { y: 120, scale: 0.6, rotationY: -200 }, { y: 0, scale: 1, rotationY: 0, duration: 0.8, ease: 'back.out(1.4)' });
  gsap.fromTo($$('.rc-boton', capa), { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.06, delay: 0.25, ease: 'back.out(2)' });
  inclinable($('.rc-carta-inclina', capa), { fuerza: 14, sobre: caja });
  if (x.nuevo) api('/api/coleccion/visto', { ids: [o.id] }).catch(() => {});
  const cerrar = async () => {
    soltar(); await gsap.to(capa, { opacity: 0, duration: 0.25 }); gsap.killTweensOf($$('*', capa)); capa.remove();
    x.nuevo = false; pintarZukan(cont, JUEGO, false);
    const vuelta = $(`.rc-hueco[data-obj="${CSS.escape(o.id)}"]`, cont);
    if (vuelta) { $$('.rc-hueco.tiene', cont).forEach((h) => { h.tabIndex = h === vuelta ? 0 : -1; }); vuelta.focus({ preventScroll: true }); }
  };
  const usar = async () => {
    if (ocupado) return; ocupado = true;
    const b = $('[data-a="usar"]', capa);
    try {
      const r = await api('/api/colocar', { id: o.id, colocado: !puesto });
      puesto = !puesto; x.colocado = puesto; x.nuevo = false; sincronizarPuestos(r.colocados);
      son.sello(); aplastar(b);
      const c = centro(b); estallido(c.x, c.y - 20, { n: 16, tipos: ['chispa'], colores: puesto ? ['#7c8f3c', '#f2b43a', '#fff6e4'] : ['#cdb98f', '#fff6e4'], vel: [140, 340], g: 500 });
      b.className = `rc-boton ${puesto ? 'claro' : ''}`; b.innerHTML = `${txt(puesto)} ${kbd('Intro')}`;
      dispatchEvent(new CustomEvent('rc:colocado', { detail: { id: o.id, colocado: puesto } }));
      avisarCambio();
    } catch (err) { toast(esc(err.message)); }
    ocupado = false;
  };
  const soltar = capturarTeclas((e) => {
    const foco = document.activeElement?.closest?.('.rc-detalle [data-a]');
    if (e.key === 'Escape') cerrar(); else if (e.key === 'Enter' || e.key === ' ') (foco ? foco.click() : usar()); else if (e.key === 'Tab') return false;
  });
  capa.onclick = (e) => { if (e.target === capa || e.target.classList.contains('rc-escena')) cerrar(); };
  $('[data-a="cerrar"]', capa).onclick = cerrar; $('[data-a="usar"]', capa).onclick = usar;
}

// ───────────────────────── tienda ─────────────────────────
const PRECIO = { bolsa: 100, omamori: 150 };
export async function tienda(contenedor) {
  if (!contenedor) return;
  let j;
  try { j = await cargarJuego(); } catch { contenedor.innerHTML = ''; return; }
  contenedor.innerHTML = `<div class="rc-zukan"><div class="rc-zukan-cab"><span class="rc-logo l">お店</span><div><h3>${t('recompensas.tienda.tit')}</h3><p>${t('recompensas.tienda.tienes', { koban: `<b class="rc-num-koban">${mil(j.monedas || 0)}</b>`, bolsas: tn('recompensas.tienda.bolsas', j.bolsas || 0), omamori: mil(j.omamori || 0) })}</p></div><div></div></div>
    <div class="rc-tienda-fila">
      <button class="rc-articulo rc-ficha ${j.monedas < PRECIO.bolsa ? 'caro' : ''}" data-art="bolsa"><span>${svgBolsa(60)}</span><b>${t('recompensas.tienda.bolsa')}</b><small>${t('recompensas.tienda.bolsa_desc')}</small><span class="rc-precio">${svgKoban(15)} ${PRECIO.bolsa}</span></button>
      <button class="rc-articulo rc-ficha ${j.monedas < PRECIO.omamori ? 'caro' : ''}" data-art="omamori"><span>${svgOmamori(46)}</span><b>${t('recompensas.tienda.omamori')}</b><small>${t('recompensas.tienda.omamori_desc')}</small><span class="rc-precio">${svgKoban(15)} ${PRECIO.omamori}</span></button>
    </div></div>`;
  $$('[data-art]', contenedor).forEach((b) => {
    inclinable(b, { fuerza: 6, perspectiva: 900 });
    b.onclick = async () => {
      const art = b.dataset.art, tengo = JUEGO?.monedas ?? 0;
      if (tengo < PRECIO[art]) { son.fallo(); gsap.fromTo(b, { x: -8 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' }); toast(`${svgKoban(22)}<span>${t('recompensas.tienda.faltan', { n: mil(PRECIO[art] - tengo) })}</span>`); return; }
      try {
        const r = await api('/api/tienda', { articulo: art });
        Object.assign(JUEGO, { monedas: r.monedas, bolsas: r.bolsas, omamori: r.omamori });
        son.sello(); const c = centro(b); estallido(c.x, c.y, { n: 24, tipos: ['chispa', 'koban'], colores: ['#f2b43a', '#fff6e4'], vel: [160, 420], g: 700 });
        contar($('.rc-num-koban', contenedor), tengo, r.monedas, 0.6);
        avisarCambio();
        if (art === 'bolsa') { await espera(600); await abrirBolsas(); }
        else toast(`${svgOmamori(26)}<span>${t('recompensas.tienda.omamori_ok', { n: mil(r.omamori) })}</span>`);
        await tienda(contenedor);
        $(`[data-art="${art}"]`, contenedor)?.focus({ preventScroll: true }); // el foco vuelve al artículo comprado
      } catch (err) { toast(esc(err.message)); }
    };
  });
}

// ───────────────────────── habitación: objetos colocados ─────────────────────────
// Pinta los objetos colocados dentro de un contenedor posicionado (suelo, pared y colgados). Lo usa la vista de Mochi y puede usarlo la portada.
const PARED = new Set(['kakejiku-ryu', 'cuadro-fuji', 'kimono']), COLGADO = new Set(['furin', 'chochin']);
const GRANDE = new Set(['byobu', 'kotatsu', 'tele-crt', 'taiko', 'kitsune-estatua', 'andon', 'sakura-bonsai', 'tocadiscos', 'katanakake', 'kimono', 'kakejiku-ryu', 'cuadro-fuji']);
const HUECOS = {
  suelo: [[16, 95, 1.1, 1], [84, 95, 1.1, 1], [27, 79, 0.9, 0], [73, 79, 0.9, 0], [8, 73, 0.78, 0], [92, 73, 0.78, 0], [36, 99, 1.15, 1], [64, 99, 1.15, 1]],
  pared: [[20, 50, 1, 0], [80, 50, 1, 0], [50, 30, 0.9, 0]],
  colgado: [[34, 24, 0.8, 0], [66, 24, 0.8, 0]],
};
// orden de preferencia de los huecos del suelo: lo grande a las esquinas, lo pequeño delante y en medio
const PREF_SUELO = { grande: [0, 1, 4, 5, 6, 7, 2, 3], peq: [2, 3, 6, 7, 0, 1, 4, 5] };
export function pintarHabitacion(cont, colocados = JUEGO?.colocados || [], { animarId = null } = {}) {
  if (!cont) return 0;
  // lo más raro y lo más grande, antes: si no cabe todo, se ve lo mejor
  const objs = colocados.map(objeto).filter((o) => o && !PARA_MOCHI[o.tipo])
    .sort((a, b) => ORDEN.indexOf(b.rareza) - ORDEN.indexOf(a.rareza) || GRANDE.has(b.id) - GRANDE.has(a.id));
  const W = cont.clientWidth || 600, H = cont.clientHeight || 620, puestos = [], libres = { suelo: new Set([0, 1, 2, 3, 4, 5, 6, 7]), pared: new Set([0, 1, 2]), colgado: new Set([0, 1]) };
  // caja en píxeles de un objeto en un hueco (anclado abajo en el centro, sin salirse por los lados) y cuánto tapa a los ya puestos
  const caja = ([x, y], tam) => ({ l: Math.min(W - tam - 6, Math.max(6, (x / 100) * W - tam / 2)), t: (y / 100) * H - tam, tam });
  const tapa = (c) => puestos.some((p) => {
    const w = Math.min(c.l + c.tam, p.l + p.tam) - Math.max(c.l, p.l), h = Math.min(c.t + c.tam, p.t + p.tam) - Math.max(c.t, p.t);
    return w > 0 && h > 0 && (w * h) / Math.min(c.tam, p.tam) ** 2 > 0.28;
  });
  let fuera = 0;
  cont.innerHTML = objs.map((o) => {
    const zona = PARED.has(o.id) ? 'pared' : COLGADO.has(o.id) ? 'colgado' : 'suelo', base = GRANDE.has(o.id) ? 150 : 104;
    const orden = zona === 'suelo' ? PREF_SUELO[GRANDE.has(o.id) ? 'grande' : 'peq'] : [...HUECOS[zona].keys()];
    const k = orden.find((i) => libres[zona].has(i) && !tapa(caja(HUECOS[zona][i], Math.round(base * HUECOS[zona][i][2]))));
    if (k == null) { fuera++; return ''; }
    libres[zona].delete(k);
    const [x, y, s, delante] = HUECOS[zona][k], tam = Math.round(base * s);
    puestos.push(caja(HUECOS[zona][k], tam));
    return ILUS(o, `rc-z-${zona} ${delante ? 'rc-delante' : ''}`, `data-id="${esc(o.id)}" style="left:clamp(${tam / 2 + 6}px,${x}%,calc(100% - ${tam / 2 + 6}px));top:${y}%;width:${tam}px;height:${tam}px"`);
  }).join('');
  if (!$('.rc-ilus', cont)) return fuera; // habitación vacía: nada que animar (GSAP avisaría en consola)
  gsap.set($$('.rc-ilus', cont), { xPercent: -50, yPercent: -100, transformOrigin: '50% 100%' });
  if (!quieto()) {
    const el = animarId ? $(`[data-id="${CSS.escape(animarId)}"]`, cont) : null;
    if (el) {
      gsap.fromTo(el, { y: -240, opacity: 0, rotation: azar(-20, 20) }, { y: 0, opacity: 1, rotation: 0, duration: 0.55, ease: 'power2.in', onComplete: () => {
        son.sello(); gsap.fromTo(el, { scaleX: 1.2, scaleY: 0.8 }, { scaleX: 1, scaleY: 1, duration: 0.6, ease: 'elastic.out(1, 0.3)', transformOrigin: '50% 100%' });
        const c = centro(el); estallido(c.x, c.r.bottom, { n: 12, tipos: ['luz'], colores: ['rgba(247,239,223,.85)'], vel: [60, 180], g: -30, vida: [0.5, 0.9], tam: [10, 20], abertura: 170 });
      } });
    } else if (!animarId) gsap.fromTo($$('.rc-ilus', cont), { y: -30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.06, ease: 'bounce.out', delay: 0.3 });
  }
  return fuera;
}
