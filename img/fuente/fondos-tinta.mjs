// Los fondos de las escenas (clases y portadas de historias) pintados como grabado (30-09, estilo B).
// Mismo espacio que FONDOS de clase-arte.js: 400 × 260, el suelo en y = 206. Se pintan con grabado.mjs (tinta a pincel,
// papel washi, bokashi de añil arriba en los de fuera) y salen como web/img/tinta/fondo/<id>.webp.
import { readFileSync } from 'node:fs';
import { nube, flor, chispa } from './kit.mjs';

const KANJI = JSON.parse(readFileSync(new URL('kanji-pincel.json', import.meta.url)));
const kanji = (k, ch, x, y, tam, color) => k.raw(`<path d="${KANJI[ch]}" transform="translate(${x} ${y}) scale(${tam / 100})" fill="${color}"/>`);
const SIN = { sil: false }, PLANO = { sil: false, vol: 'none' };
export const ANCHO = 400, ALTO = 260, SUELO = 206;

// papel de fondo y, en los de fuera, la banda de añil de los grabados
function papel(k, color = '#f6e7c8') { k.fondo(`<rect x="0" y="0" width="400" height="260" fill="${color}" filter="url(#${k.id('washi')})"/>`); }
function cielo(k, { arriba = '#1f4e8c', alto = 0.34 } = {}) {
  k.def(`<linearGradient id="${k.id('cielo')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${arriba}"/><stop offset="${alto * 0.35}" stop-color="${arriba}" stop-opacity=".8"/><stop offset="${alto}" stop-color="#8fb0d6" stop-opacity="0"/></linearGradient>`);
  k.fondo(`<rect x="0" y="0" width="400" height="260" fill="url(#${k.id('cielo')})"/>`);
}
function remolinoNube(k, x, y, e = 1) {
  k.p(nube(x, y, 30 * e, 10 * e, 5, 0.3, 0.7), '#f7ecd4', { vol: 'none', lw: 1.8 });
  k.linea(`M${x - 16 * e} ${y + 2 * e} q-5 -7 1 -11 q8 -4 10 4 q1 5 -4 6`, 1.5);
  k.linea(`M${x + 8 * e} ${y + 1 * e} q-2 -8 5 -10 q8 0 7 7 q-1 4 -5 4`, 1.5);
}
function tatami(k, y = SUELO) {
  k.r(-10, y, 420, 70, 0, '#cfc38a', PLANO);
  for (const x of [-10, 130, 270]) k.r(x, y, 140, 70, 0, 'none', { ...PLANO, lw: 2 });
  k.r(-10, y, 420, 6, 0, '#3f5a3a', PLANO);
}

export const FONDOS_B = {
  // habitación japonesa: pared de yeso, vigas, shōji a la izquierda y el tokonoma con su kakejiku
  cuarto(k) {
    papel(k, '#f1e3c4');
    k.r(-10, 0, 420, 34, 0, '#8a6040', PLANO);
    k.r(-10, 34, 420, 10, 0, '#6f4c30', PLANO);
    for (const x of [0, 188, 388]) k.r(x, 34, 14, 172, 0, '#8a6040', PLANO);
    k.r(28, 64, 132, 104, 2, '#fbf5e6', SIN);
    k.raw(`<g stroke="#8a6040" stroke-width="2.4">${[50, 72, 94, 116, 138].map((x) => `<path d="M${x} 64 V168"/>`).join('')}${[88, 112, 136].map((y) => `<path d="M28 ${y} H160"/>`).join('')}</g>`);
    k.r(236, 54, 142, 152, 2, '#e8d6b0', SIN);
    k.r(236, 190, 142, 16, 0, '#6f4c30', PLANO);
    k.r(282, 66, 50, 110, 2, '#f6ecd4', SIN);
    k.r(282, 66, 50, 8, 0, '#2f4a7a', PLANO); k.r(282, 168, 50, 8, 0, '#2f4a7a', PLANO);
    kanji(k, '猫', 288, 88, 38, '#1d1510');
    k.r(318, 150, 10, 10, 1, '#c43a26', PLANO);
    k.p('M246 190 Q248 170 256 166 Q264 170 266 190 Z', '#3d6fc2', SIN);
    k.linea('M256 166 Q252 146 262 132 M256 160 Q264 148 272 144', 2, '#6f8a34');
    k.p(flor(262, 130, 6, -90), '#f4a9b8', { sil: false, vol: 'none', lw: 1 });
    tatami(k);
  },
  // calle: cielo de grabado, casas de madera, un poste con sus cables y la calzada
  calle(k) {
    papel(k); cielo(k);
    remolinoNube(k, 90, 40); remolinoNube(k, 320, 28, 0.8);
    k.linea('M0 64 Q120 84 250 70 Q330 62 400 76 M0 72 Q120 92 250 78 Q330 70 400 84', 1.2, '#3b3029');
    const casa = (x, w, h, techo) => {
      k.r(x, SUELO - h, w, h, 1, '#f3e3c3', SIN);
      k.p(`M${x - 8} ${SUELO - h + 4} L${x + w / 2} ${SUELO - h - 26} L${x + w + 8} ${SUELO - h + 4} Z`, techo, SIN);
      k.r(x + w * 0.2, SUELO - h * 0.62, w * 0.24, h * 0.3, 1, '#fbf5e6', SIN);
      k.r(x + w * 0.56, SUELO - h * 0.62, w * 0.24, h * 0.62, 1, '#8a6040', SIN);
    };
    casa(10, 96, 70, '#566072'); casa(130, 84, 58, '#8a3b2a'); casa(236, 100, 76, '#566072'); casa(350, 70, 54, '#3f5a3a');
    k.r(214, 60, 7, 146, 1, '#6b5a4e', PLANO); k.r(204, 72, 27, 5, 1, '#6b5a4e', PLANO);
    k.r(-10, SUELO, 420, 70, 0, '#cfc8bc', PLANO);
    k.r(-10, SUELO, 420, 6, 0, '#a9a291', PLANO);
    k.raw(`<g stroke="#fbf8f0" stroke-width="4" stroke-linecap="round">${[20, 110, 200, 290, 380].map((x) => `<path d="M${x} 236 H${x + 44}"/>`).join('')}</g>`);
  },
  // aula: pizarra verde con tiza, ventana con un cerezo fuera y suelo de madera
  escuela(k) {
    papel(k, '#f1e6cc');
    k.r(-10, 150, 420, 56, 0, '#c89a6a', PLANO);
    k.r(10, 40, 64, 96, 2, '#bcd4ec', SIN);
    k.p(nube(40, 64, 22, 16, 7, 0.2, 0.6), '#f4a9b8', { sil: false, vol: 'none', lw: 1.4 });
    k.raw('<path d="M42 40 V136 M10 88 H74" stroke="#8a6040" stroke-width="3"/>');
    k.r(96, 34, 216, 116, 3, '#8a6040', SIN);
    k.r(104, 42, 200, 100, 2, '#2f4a3a', SIN);
    kanji(k, 'あ', 120, 58, 44, '#f3efe4'); kanji(k, 'い', 172, 58, 44, '#f3efe4'); kanji(k, 'う', 224, 58, 44, '#f3efe4');
    k.linea('M122 124 Q180 112 280 126', 2, '#f3efe4');
    k.r(104, 142, 200, 7, 1, '#6f4c30', PLANO);
    k.r(-10, SUELO, 420, 70, 0, '#d9b27c', PLANO);
    k.raw(`<g stroke="#b8894f" stroke-width="1.6">${[222, 240].map((y) => `<path d="M-10 ${y} H410"/>`).join('')}${[40, 130, 220, 310].map((x) => `<path d="M${x} 206 V222 M${x + 45} 222 V240 M${x} 240 V260"/>`).join('')}</g>`);
  },
  // parque: colinas de aguada, dos cerezos, hierba y un banco
  parque(k) {
    papel(k); cielo(k);
    remolinoNube(k, 200, 36, 0.9);
    k.p('M-10 170 Q80 120 170 150 Q260 120 410 156 V210 H-10 Z', '#b7cf8a', PLANO);
    const cerezo = (x, e) => {
      k.p(`M${x - 6 * e} 202 C${x - 4 * e} 170 ${x - 10 * e} 150 ${x - 18 * e} 134 L${x - 10 * e} 132 C${x - 2 * e} 146 ${x + 2 * e} 160 ${x + 2 * e} 170 C${x + 8 * e} 156 ${x + 16 * e} 150 ${x + 24 * e} 146 L${x + 26 * e} 152 C${x + 14 * e} 158 ${x + 8 * e} 170 ${x + 8 * e} 202 Z`, '#6f4c30', SIN);
      k.p(nube(x, 116 - 8 * e, 44 * e, 32 * e, 9, 0.2, 0.6), '#f4a9b8', SIN);
      k.p(nube(x + 26 * e, 132 - 6 * e, 22 * e, 16 * e, 7, 0.5, 0.6), '#fbd3dd', SIN);
    };
    cerezo(60, 1); cerezo(346, 0.85);
    k.r(-10, 200, 420, 70, 0, '#a6bf5e', PLANO);
    k.r(236, 176, 70, 8, 2, '#8a6040', SIN); k.r(240, 184, 6, 18, 1, '#6f4c30', PLANO); k.r(296, 184, 6, 18, 1, '#6f4c30', PLANO);
    for (const [x, y] of [[150, 60], [230, 90], [120, 150], [300, 40]]) k.p(flor(x, y, 3.4, x), '#f4a9b8', { sil: false, vol: 'none', lw: 0.8 });
  },
  // cocina: azulejos, estante con tarros, noren y la encimera de madera
  cocina(k) {
    papel(k, '#f8f1e2');
    k.raw(`<g stroke="#dcd2bf" stroke-width="1.6">${Array.from({ length: 9 }, (_, i) => `<path d="M${i * 50} 0 V150"/>`).join('')}<path d="M0 50 H400 M0 100 H400"/></g>`);
    k.r(40, 0, 120, 30, 0, '#2f4a7a', SIN);
    k.linea('M80 0 V30 M120 0 V30', 1.6, '#f7ecd4');
    k.r(230, 58, 150, 8, 1, '#8a6040', SIN);
    for (const [x, c, h] of [[240, '#c43a26', 26], [270, '#e0a92e', 20], [298, '#3d6fc2', 30], [330, '#6f8a34', 22], [356, '#f4a9b8', 18]]) k.r(x, 58 - h, 22, h, 4, c, SIN);
    k.r(-10, 150, 420, 56, 0, '#c89a6a', SIN);
    k.r(-10, 150, 420, 8, 0, '#9a6b43', PLANO);
    k.r(40, 166, 90, 34, 2, '#b8894f', SIN); k.r(150, 166, 90, 34, 2, '#b8894f', SIN);
    k.r(-10, SUELO, 420, 70, 0, '#e9dcc5', PLANO);
  },
  // tienda: estanterías con paquetes de colores, noren con 店 y el mostrador
  tienda(k) {
    papel(k, '#fff3e0');
    for (const y of [48, 104]) k.r(10, y, 380, 8, 1, '#8a6040', SIN);
    const col = ['#f4a9b8', '#8fbf86', '#8fb9e0', '#efdb9c', '#dccbeb', '#f7b27c'];
    [30, 70, 110, 250, 290, 330].forEach((x, i) => { k.r(x, (i % 2 ? 104 : 48) - 30, 28, 30, 3, col[i], SIN); k.r(x + 6, (i % 2 ? 104 : 48) - 22, 16, 10, 1, '#fbf8f0', PLANO); });
    [150, 176, 202].forEach((x, i) => k.r(x, 104 - 38, 16, 38, 6, ['#c43a26', '#3d6fc2', '#6f8a34'][i], SIN));
    k.r(140, 0, 120, 30, 0, '#c43a26', SIN);
    kanji(k, '店', 186, 2, 26, '#fbf4e4');
    k.r(-10, 162, 420, 44, 0, '#c89a6a', SIN);
    k.r(-10, 162, 420, 7, 0, '#9a6b43', PLANO);
    k.r(-10, SUELO, 420, 70, 0, '#eadcc5', PLANO);
  },
  // noche: cielo de añil con estrellas, luna dorada, tejados en sombra y un farolillo
  noche(k) {
    k.def(`<linearGradient id="${k.id('nochec')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#18234a"/><stop offset="1" stop-color="#3d4a78"/></linearGradient>`);
    k.fondo(`<rect x="0" y="0" width="400" height="260" fill="url(#${k.id('nochec')})"/>`);
    k.fondo(`<rect x="0" y="0" width="400" height="260" fill="#fff" opacity=".06" filter="url(#${k.id('washi')})"/>`);
    k.halo(300, 70, 60, '#f6d27a', 0.35);
    k.c(300, 70, 26, '#f6d27a', SIN);
    for (const [x, y, r] of [[40, 30, 4], [120, 60, 3], [220, 26, 3.6], [360, 130, 3], [80, 110, 2.6], [170, 90, 2.4]]) k.p(chispa(x, y, r), '#f6d27a', { sil: false, vol: 'none', lw: 0.8 });
    k.p('M-10 206 V150 L40 128 L90 150 V206 Z M110 206 V160 L170 134 L230 160 V206 Z M250 206 V146 L300 122 L350 146 V206 Z', '#232a48', { sil: false, vol: 'none', lw: 1.4 });
    k.r(150, 176, 14, 18, 2, '#f6d27a', PLANO); k.r(300, 166, 14, 18, 2, '#f6d27a', PLANO);
    k.halo(70, 176, 26, '#ffb870', 0.5);
    k.e(70, 176, 9, 12, '#e8432f', { sil: false, lw: 1.4 });
    k.r(-10, SUELO, 420, 70, 0, '#2c3558', PLANO);
  },
};
