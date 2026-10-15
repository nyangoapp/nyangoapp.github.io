// Nyan en pegatinas, estilo LÍNEA (referencia: carpeta «Nyan Icons»). Salen en arte/lin/*.svg|png
import { nyan, tubo, trazo, elipse, chispa, gota, letra, guardar, lienzo, LIN, CREMA } from './linea.mjs';
const D = 'lin';
const fig = (o, id, x = 160, y = 116, k = 0.84) => `<g transform="translate(${x} ${y}) scale(${k})">${nyan(o, id)}</g>`;
const pompon = (x, y) => `<g>${Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * Math.PI * 2; return `<circle cx="${x + Math.cos(a) * 17}" cy="${y + Math.sin(a) * 17}" r="13" fill="#f7c948" stroke="${LIN}" stroke-width="5"/>`; }).join('')}${Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * Math.PI * 2; return `<circle cx="${x + Math.cos(a) * 17}" cy="${y + Math.sin(a) * 17}" r="10.5" fill="#f7c948"/>`; }).join('')}<circle cx="${x}" cy="${y}" r="16" fill="#f7c948"/>${trazo(`M${x - 8} ${y - 6} q6 -6 12 0`, 3.5, '#d99a1e')}${trazo(`M${x + 2} ${y + 8} q6 -6 12 0`, 3.5, '#d99a1e')}</g>`;
const confeti = (lista) => lista.map(([x, y, c, r]) => `<rect x="${x}" y="${y}" width="11" height="7" rx="2" fill="${c}" transform="rotate(${r} ${x} ${y})"/>`).join('');

const P = {
  // ¡bien! — al acertar
  bien: fig({ cab: { ojos: 'cerrados', boca: 'abierta' }, rotCab: -5, brazos: ['M-28 116 Q-44 138 -44 156', 'M28 112 Q64 100 78 62'] }, 'b')
    + chispa(262, 60, 15) + chispa(288, 104, 9) + chispa(46, 70, 11, '#8fd0f2'),
  // がんばれ — al empezar un repaso largo
  animo: letra('がんばれ!', 56, 50, 44, '#e2574c', -5)
    + fig({ cab: { ojos: 'cerrados', boca: 'abierta' }, brazos: ['M-28 112 Q-62 100 -80 70', 'M28 112 Q62 100 80 70'] }, 'a', 160, 140, 0.74)
    + pompon(98, 186) + pompon(222, 186)
    + confeti([[34, 110, '#8fd0f2', 25], [282, 96, '#f8b2b6', -20], [40, 210, '#a8dca0', 40], [276, 214, '#f7c948', 10], [250, 40, '#8fd0f2', -35]]),
  // ¿? — dudando (el medio punto: «casi»)
  duda: fig({ cab: { ojos: 'duda', boca: 'risita' }, rotCab: 9, brazos: ['M28 116 Q40 138 40 156', 'M-28 112 Q-44 104 -18 98'] }, 'd', 150)
    + letra('?', 246, 96, 92, '#7cc26a', 8) + `<text x="246" y="96" font-family="Zen Maru Gothic, sans-serif" font-weight="900" font-size="92" fill="none" stroke="${LIN}" stroke-width="3" transform="rotate(8 246 96)" opacity=".0">?</text>`,
  // ¡uy! — al fallar, sin castigo
  uy: fig({ cab: { ojos: 'cerrados', boca: 'ondulada' }, brazos: ['M-28 112 Q-56 108 -66 84', 'M28 112 Q56 108 66 84'] }, 'u')
    + gota(52, 64) + gota(84, 34, 8) + gota(262, 50, 9) + gota(282, 92, 7),
  // a dormir — ya está por hoy
  sueno: `<rect x="62" y="150" width="196" height="64" rx="30" fill="#ffffff" stroke="${LIN}" stroke-width="7"/>`
    + trazo('M92 170 q10 6 20 0 M206 170 q10 6 20 0', 4, '#d9cbb8')
    + `<g transform="translate(158 124) rotate(-12) scale(0.64)">${nyan({ cuerpo: false, cab: { ojos: 'sueno', boca: 'w' } }, 'z')}</g>`
    + `<path d="M22 228 Q24 204 58 202 Q160 190 262 202 Q296 204 298 228 L300 330 L20 330 Z" fill="#8db3e2" stroke="${LIN}" stroke-width="7" stroke-linejoin="round"/>`
    + `<path d="M26 224 Q28 206 58 204 Q160 192 262 204 Q292 206 294 224 Q160 210 26 224 Z" fill="#fff7e4" stroke="${LIN}" stroke-width="5" stroke-linejoin="round"/>`
    + `<g fill="#ffffff" opacity=".75"><circle cx="70" cy="262" r="9"/><circle cx="84" cy="258" r="11"/><circle cx="98" cy="263" r="8"/><circle cx="196" cy="276" r="9"/><circle cx="210" cy="271" r="11"/><circle cx="224" cy="276" r="8"/></g>`
    + letra('Z', 236, 92, 46, '#7f86c8', -10) + letra('z', 274, 56, 32, '#7f86c8', -10),
  // se asoma por la puerta — el recordatorio
  asoma: fig({ cab: { ojos: 'punto', boca: 'w' }, rotCab: 12, cuerpo: true }, 's', 150, 128, 0.86)
    + `<rect x="204" y="-10" width="120" height="340" fill="#8a5a3a" stroke="${LIN}" stroke-width="7"/>`
    + `<g stroke="#b88a60" stroke-width="5">${[40, 100, 160, 220, 280].map((y) => `<path d="M212 ${y} H316"/>`).join('')}<path d="M262 -6 V326"/></g>`
    + tubo('M216 178 L204 172', 18) + trazo('M44 250 q10 -8 20 0 M56 272 q10 -8 20 0', 4.5, '#b88a60'),
  // en el onsen — el premio del final
  onsen: `<g transform="translate(160 122) scale(0.8)">${nyan({ cab: { ojos: 'gusto', boca: 'w' } }, 'o')}</g>`
    + `<path d="M18 236 Q24 212 70 214 Q160 204 250 214 Q298 212 302 236 Q304 290 250 296 Q160 306 70 296 Q16 290 18 236 Z" fill="#6cc5ae" stroke="${LIN}" stroke-width="7" stroke-linejoin="round"/>`
    + trazo('M58 246 h34 M200 262 h44 M120 276 h30', 5, '#ffffff')
    + `<circle cx="86" cy="226" r="16" fill="#f7b538" stroke="${LIN}" stroke-width="5"/><circle cx="244" cy="232" r="14" fill="#e2574c" stroke="${LIN}" stroke-width="5"/>`
    + chispa(64, 70, 12, '#bfe3f8') + chispa(262, 56, 9, '#bfe3f8'),
};
for (const [n, s] of Object.entries(P)) guardar(D, 'peg-' + n, lienzo(s));
console.log(Object.keys(P).join(' '));
