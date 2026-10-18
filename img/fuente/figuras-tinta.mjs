// Las figuras de las escenas (clases, portadas de historias, camino de clases) pintadas en el estilo B (30-09).
// Las mismas que dibujaba clase-arte.js en línea, con sus medidas (MED): cada una se pinta en una caja de 256 con el
// suelo en y = 236 y su lado mayor de 220; clase-arte.js las coloca como <image> con esas mismas medidas.
// Se pintan con tinta.mjs (línea de pincel, acuarela, washi). Salida: web/img/tinta/fig/<id>.webp (generar-tinta.mjs).
import { readFileSync } from 'node:fs';
import { PALETA as P, capsula, nube, flor, afilada, estrella } from './kit.mjs';

const KANJI = JSON.parse(readFileSync(new URL('kanji-pincel.json', import.meta.url)));
const f = (v) => +v.toFixed(1);
const kanji = (k, ch, x, y, tam, color) => k.raw(`<path d="${KANJI[ch]}" transform="translate(${x} ${y}) scale(${tam / 100})" fill="${color}"/>`);
export const SUELO = 236, LADO = 220;

// las medidas de clase-arte.js (ancho y alto a escala 1)
export const MED = {
  nyan: { w: 80, h: 96 }, gato: { w: 52, h: 76 }, perro: { w: 54, h: 76 }, libro: { w: 60, h: 18 }, manzana: { w: 44, h: 39 }, onigiri: { w: 44, h: 34 },
  caja: { w: 92, h: 62 }, mesa: { w: 122, h: 67 }, cama: { w: 150, h: 72 }, sensei: { w: 60, h: 86 }, ki: { w: 76, h: 92 }, sakana: { w: 76, h: 46 },
  kuruma: { w: 80, h: 46 }, tori: { w: 50, h: 54 }, hana: { w: 36, h: 75 }, mushi: { w: 56, h: 30 }, kasa: { w: 72, h: 86 }, okane: { w: 64, h: 44 },
  terebi: { w: 76, h: 82 }, taza: { w: 48, h: 40 }, plato: { w: 60, h: 12 }, cuenco: { w: 52, h: 40 }, regalo: { w: 54, h: 58 }, casa: { w: 100, h: 86 },
  escuela: { w: 124, h: 94 }, reloj: { w: 44, h: 52 }, silla: { w: 40, h: 72 }, bolsa: { w: 48, h: 48 }, telefono: { w: 28, h: 50 }, tren: { w: 132, h: 52 },
  bici: { w: 78, h: 52 }, sol: { w: 70, h: 90 }, nube: { w: 70, h: 56 }, luna: { w: 56, h: 64 }, pizarra: { w: 148, h: 94 }, lapiz: { w: 36, h: 50 },
  carta: { w: 52, h: 36 }, zapato: { w: 52, h: 28 }, vaso: { w: 28, h: 40 }, pan: { w: 54, h: 34 }, sushi: { w: 44, h: 26 }, persona: { w: 40, h: 86 },
};
// la caja de cada figura dentro del lienzo de 256: x0..x1, y0..SUELO
export function caja(id) {
  const m = MED[id], k = LADO / Math.max(m.w, m.h), W = m.w * k, H = m.h * k;
  return { k, W, H, x0: 128 - W / 2, x1: 128 + W / 2, y0: SUELO - H, cx: 128 };
}

// ── Nyan de cuerpo entero (misma cabeza que el icono y las portadas) ──
const CABEZA = 'M46 94 C72 84 184 84 210 94 C230 102 238 146 236 176 C233 214 190 230 128 230 C66 230 23 214 20 176 C18 146 26 102 46 94 Z';
const OREJA_I = 'M24 150 C26 108 40 64 58 36 C62 29 70 28 75 33 C95 54 112 74 128 98 Z';
const OREJA_D = 'M232 150 C230 108 216 64 198 36 C194 29 186 28 181 33 C161 54 144 74 128 98 Z';
const DENTRO_I = 'M44 118 C47 94 55 70 64 56 C78 71 92 86 104 102 C86 106 62 111 44 118 Z';
const DENTRO_D = 'M212 118 C209 94 201 70 192 56 C178 71 164 86 152 102 C170 106 194 111 212 118 Z';
function mover(d, M) {
  const t = d.match(/[A-Za-z]|-?\d*\.?\d+/g); let out = '', par = [];
  for (const x of t) { if (/[A-Za-z]/.test(x)) { out += x + ' '; continue; } par.push(+x); if (par.length === 2) { const [a, b] = M(par[0], par[1]); out += `${f(a)} ${f(b)} `; par = []; } }
  return out.trim();
}
const TI = '#221817';
// cara: normal · feliz · sorpresa · sueno · pensando · triste · enfado
function cara(k, M, S, m, tipo) {
  const e = (x, y, rx, ry, c, o = {}) => k.e(...M(x, y), S(rx), S(ry), c, { sil: false, vol: 'none', borde: false, ...o });
  if (tipo === 'feliz' || tipo === 'sueno') {
    const d = tipo === 'feliz' ? 'M76 160 Q92 136 108 160 M148 160 Q164 136 180 160' : 'M76 152 Q92 166 108 152 M148 152 Q164 166 180 152';
    k.linea(m(d), S(10), TI);
  } else if (tipo === 'sorpresa') {
    for (const x of [92, 164]) { e(x, 150, 19, 19, '#fffdf6', { borde: true, lw: S(5) }); e(x, 152, 8, 8, TI); k.punto(...M(x - 3, 148), S(3)); }
  } else {
    const dy = tipo === 'pensando' ? -8 : 0;
    for (const [x, r] of [[92, 1], [164, 1.05]]) { e(x, 154 + dy, 13 * r, 17 * r, TI); k.punto(...M(x - 5, 147 + dy), S(6)); k.punto(...M(x + 5, 161 + dy), S(2.8), 0.9); }
    if (tipo === 'triste') { k.linea(m('M70 124 L108 134 M186 124 L148 134'), S(7), TI); e(88, 188, 7, 11, '#9fd3f5', { borde: true, lw: S(3) }); }
    if (tipo === 'enfado') k.linea(m('M70 126 L110 142 M186 126 L146 142'), S(8), TI);
  }
  e(56, 186, 20, 11, '#f59aa4', { op: 0.9 });
  e(200, 186, 20, 11, '#f59aa4', { op: 0.9 });
  if (tipo === 'sorpresa') e(128, 190, 8, 10, TI);
  else if (tipo === 'feliz') k.p(m('M112 176 Q128 204 144 176 Z'), '#d0616b', { sil: false, vol: 'none', lw: S(5) });
  else if (tipo === 'triste' || tipo === 'enfado') k.linea(m('M114 188 Q128 178 142 188'), S(6), TI);
  else { k.p(m('M122 184 L122 198 C122 208 136 208 136 198 L136 184 Z'), '#f07f8c', { sil: false, vol: 'none', lw: S(3.5) }); k.linea(m('M112 178 Q120 190 128 180 Q136 190 144 178'), S(6), TI); }
}
export function nyanCuerpo(k, cx, cy, s, { cara: tipo = 'normal', brazo = null, onigiri = false } = {}) {
  const M = (x, y) => [cx + (x - 128) * s, cy + (y - 128) * s], m = (d) => mover(d, M), S = (v) => v * s;
  const piel = '#fffaf2', nar = '#ee9448', happi = '#d8412a', azul = '#2f4a7a';
  const cola = afilada([M(176, 300), M(226, 292), M(246, 250), M(232, 214)], S(30), S(20));
  k.p(cola.d, piel);
  const u = cola.muestras.at(-1);
  k.c(u.x, u.y, S(14), nar, { sil: false });
  k.e(...M(98, 326), S(30), S(17), piel);
  k.e(...M(158, 326), S(30), S(17), piel);
  k.p(capsula(...M(182, 236), ...M(206, 290), S(34)), happi);
  k.c(...M(208, 296), S(19), piel);
  k.p(m('M72 212 C66 252 62 292 68 322 Q128 338 188 322 C194 292 190 252 184 212 Q128 228 72 212 Z'), happi);
  k.tubo(m('M96 214 L122 304'), '#fbf4e4', S(16));
  k.tubo(m('M160 214 L134 304'), '#fbf4e4', S(16));
  k.p(m('M66 284 Q128 300 190 284 L191 302 Q128 318 65 302 Z'), azul, { vol: 'h' });
  k.p(m(OREJA_I), nar);
  k.p(m(DENTRO_I), '#f6c093', { sil: false, vol: 'none', borde: false });
  k.p(m(OREJA_D), piel);
  k.p(m(DENTRO_D), '#f6dcb4', { sil: false, vol: 'none', borde: false });
  k.p(m(CABEZA), piel);
  const cab = k.clip('cabF' + Math.round(cx * 10 + cy), `<path d="${m(CABEZA)}"/>`);
  k.p(m('M16 104 C70 92 186 92 240 104 L240 124 C186 112 70 112 16 124 Z'), '#fbf6ea', { sil: false, clip: cab, vol: 'v' });
  k.c(...M(128, 112), S(10), '#e8432f', { sil: false, vol: 'none', lw: S(3) });
  k.p(m('M226 104 Q256 88 266 98 Q252 108 232 116 Z'), '#fbf6ea', { vol: 'none' });
  k.p(m('M228 118 Q260 126 262 142 Q246 136 226 124 Z'), '#fbf6ea', { vol: 'none' });
  k.c(...M(228, 112), S(9), '#f2ead8', { vol: 'none' });
  // el brazo de delante: arriba (saluda o señala) o abajo, y el onigiri en la pata
  const [hx, hy] = brazo === 'arriba' ? [-10, 188] : [52, 300];
  k.p(capsula(...M(76, 242), ...M(brazo === 'arriba' ? -4 : 56, brazo === 'arriba' ? 196 : 292), S(34)), happi);
  if (onigiri) {
    const [ox, oy] = M(hx + (brazo === 'arriba' ? 0 : 6), hy - 30);
    const SO = (v) => S(v * 1.45);
    k.p(`M${f(ox)} ${f(oy - SO(34))} C${f(ox + SO(8))} ${f(oy - SO(34))} ${f(ox + SO(30))} ${f(oy + SO(8))} ${f(ox + SO(26))} ${f(oy + SO(14))} C${f(ox + SO(20))} ${f(oy + SO(20))} ${f(ox - SO(20))} ${f(oy + SO(20))} ${f(ox - SO(26))} ${f(oy + SO(14))} C${f(ox - SO(30))} ${f(oy + SO(8))} ${f(ox - SO(8))} ${f(oy - SO(34))} ${f(ox)} ${f(oy - SO(34))} Z`, '#fbf8f0');
    k.r(ox - SO(12), oy - SO(2), SO(24), SO(22), SO(3), '#243a2c', { sil: false, lw: S(3) });
  }
  k.c(...M(hx, hy), S(21), piel);
  cara(k, M, S, m, tipo);
}

// ── Tama: gato gris atigrado, amigo de Nyan (chico) ──
function gatoGris(k, c) {
  const { x0, W, y0, H } = c, X = (u) => x0 + u * W, Y = (v) => y0 + v * H;
  const gris = '#b9b3c6', osc = '#7f7892', claro = '#e7e3ee';
  k.p(afilada([[X(0.72), Y(0.9)], [X(0.95), Y(0.8)], [X(1.0), Y(0.58)], [X(0.9), Y(0.44)]], W * 0.12, W * 0.08).d, gris);
  k.e(X(0.36), Y(0.97), W * 0.14, H * 0.05, claro);
  k.e(X(0.64), Y(0.97), W * 0.14, H * 0.05, claro);
  k.e(X(0.5), Y(0.76), W * 0.36, H * 0.22, gris);
  k.e(X(0.5), Y(0.8), W * 0.2, H * 0.14, claro, { sil: false, vol: 'none' });
  k.p(`M${X(0.16)} ${Y(0.36)} L${X(0.22)} ${Y(0.02)} L${X(0.44)} ${Y(0.2)} Z`, gris);
  k.p(`M${X(0.84)} ${Y(0.36)} L${X(0.78)} ${Y(0.02)} L${X(0.56)} ${Y(0.2)} Z`, gris);
  k.p(`M${X(0.23)} ${Y(0.26)} L${X(0.26)} ${Y(0.1)} L${X(0.37)} ${Y(0.2)} Z`, '#f2c2c8', { sil: false, vol: 'none', borde: false });
  k.p(`M${X(0.77)} ${Y(0.26)} L${X(0.74)} ${Y(0.1)} L${X(0.63)} ${Y(0.2)} Z`, '#f2c2c8', { sil: false, vol: 'none', borde: false });
  k.e(X(0.5), Y(0.4), W * 0.46, H * 0.25, gris);
  k.linea(`M${X(0.42)} ${Y(0.2)} L${X(0.44)} ${Y(0.29)} M${X(0.5)} ${Y(0.19)} L${X(0.5)} ${Y(0.29)} M${X(0.58)} ${Y(0.2)} L${X(0.56)} ${Y(0.29)}`, 4, osc);
  k.linea(`M${X(0.05)} ${Y(0.42)} L${X(0.16)} ${Y(0.44)} M${X(0.95)} ${Y(0.42)} L${X(0.84)} ${Y(0.44)}`, 3.4, osc);
  for (const u of [0.36, 0.64]) { k.e(X(u), Y(0.42), W * 0.05, H * 0.05, TI, { sil: false, vol: 'none', borde: false }); k.punto(X(u) - 2, Y(0.41) - 3, 2.6); }
  k.e(X(0.24), Y(0.5), W * 0.07, H * 0.03, '#f59aa4', { sil: false, vol: 'none', borde: false, op: 0.9 });
  k.e(X(0.76), Y(0.5), W * 0.07, H * 0.03, '#f59aa4', { sil: false, vol: 'none', borde: false, op: 0.9 });
  k.linea(`M${X(0.44)} ${Y(0.5)} Q${X(0.47)} ${Y(0.54)} ${X(0.5)} ${Y(0.5)} Q${X(0.53)} ${Y(0.54)} ${X(0.56)} ${Y(0.5)}`, 3.4, TI);
  // un pañuelo azul al cuello
  k.p(`M${X(0.28)} ${Y(0.58)} Q${X(0.5)} ${Y(0.66)} ${X(0.72)} ${Y(0.58)} L${X(0.62)} ${Y(0.72)} Q${X(0.5)} ${Y(0.68)} ${X(0.38)} ${Y(0.72)} Z`, '#3d6fc2', { lw: 3 });
}
// shiba
function perro(k, c) {
  const { x0, W, y0, H } = c, X = (u) => x0 + u * W, Y = (v) => y0 + v * H;
  const shiba = '#e6a767', blanco = '#fbf3e6';
  k.p(afilada([[X(0.76), Y(0.72)], [X(0.98), Y(0.6)], [X(0.94), Y(0.42)], [X(0.8), Y(0.46)]], W * 0.13, W * 0.08).d, shiba);
  k.e(X(0.36), Y(0.97), W * 0.14, H * 0.05, blanco);
  k.e(X(0.64), Y(0.97), W * 0.14, H * 0.05, blanco);
  k.e(X(0.5), Y(0.76), W * 0.38, H * 0.22, shiba);
  k.e(X(0.5), Y(0.8), W * 0.2, H * 0.15, blanco, { sil: false, vol: 'none' });
  k.p(`M${X(0.14)} ${Y(0.36)} L${X(0.2)} ${Y(0.03)} L${X(0.42)} ${Y(0.2)} Z`, shiba);
  k.p(`M${X(0.86)} ${Y(0.36)} L${X(0.8)} ${Y(0.03)} L${X(0.58)} ${Y(0.2)} Z`, shiba);
  k.e(X(0.5), Y(0.4), W * 0.46, H * 0.25, shiba);
  k.e(X(0.5), Y(0.5), W * 0.26, H * 0.13, blanco, { sil: false, vol: 'none' });
  for (const u of [0.35, 0.65]) { k.e(X(u), Y(0.33), W * 0.05, H * 0.02, blanco, { sil: false, vol: 'none', borde: false }); k.e(X(u), Y(0.4), W * 0.045, H * 0.045, TI, { sil: false, vol: 'none', borde: false }); k.punto(X(u) - 2, Y(0.39) - 2, 2.4); }
  k.e(X(0.5), Y(0.46), W * 0.06, H * 0.03, TI, { sil: false, vol: 'none', borde: false });
  k.linea(`M${X(0.44)} ${Y(0.52)} Q${X(0.5)} ${Y(0.56)} ${X(0.56)} ${Y(0.52)}`, 3.4, TI);
  k.p(`M${X(0.3)} ${Y(0.6)} Q${X(0.5)} ${Y(0.66)} ${X(0.7)} ${Y(0.6)} L${X(0.7)} ${Y(0.65)} Q${X(0.5)} ${Y(0.71)} ${X(0.3)} ${Y(0.65)} Z`, '#d8412a', { lw: 3 });
}
// ojos de anime: pestaña gruesa arriba, iris con degradado, pupila y dos brillos
function ojoAnime(k, x, y, rx, ry, iris = '#7a4a2a', { dir = 1 } = {}) {
  const g = k.id('iris' + Math.round(x * 10 + y));
  k.def(`<linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1a14"/><stop offset=".45" stop-color="${iris}"/><stop offset="1" stop-color="#e3a86a"/></linearGradient>`);
  k.raw(`<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" fill="#fffdf8"/>`);
  k.raw(`<ellipse cx="${f(x + rx * 0.08 * dir)}" cy="${f(y + ry * 0.08)}" rx="${f(rx * 0.78)}" ry="${f(ry * 0.9)}" fill="url(#${g})"/>`);
  k.raw(`<ellipse cx="${f(x + rx * 0.08 * dir)}" cy="${f(y + ry * 0.12)}" rx="${f(rx * 0.34)}" ry="${f(ry * 0.42)}" fill="#1d1510"/>`);
  k.raw(`<ellipse cx="${f(x - rx * 0.28 * dir)}" cy="${f(y - ry * 0.34)}" rx="${f(rx * 0.26)}" ry="${f(ry * 0.22)}" fill="#fff"/><circle cx="${f(x + rx * 0.34 * dir)}" cy="${f(y + ry * 0.36)}" r="${f(rx * 0.12)}" fill="#fff" opacity=".9"/>`);
  // pestaña de arriba: gruesa, con la punta de fuera levantada
  k.raw(`<path d="M${f(x - rx * 1.1)} ${f(y - ry * 0.55)} Q${f(x)} ${f(y - ry * 1.22)} ${f(x + rx * 1.15)} ${f(y - ry * 0.62)} L${f(x + rx * 1.35 * dir)} ${f(y - ry * 0.95)}" fill="none" stroke="#1d1510" stroke-width="${f(ry * 0.2)}" stroke-linecap="round" stroke-linejoin="round"/>`);
}
// persona: chica de instituto en estilo anime (uniforme de marinero, mechones con brillo, ojos grandes)
function persona(k, c) {
  const { x0, W, y0, H } = c, X = (u) => x0 + u * W, Y = (v) => y0 + v * H;
  const piel = '#fde3cf', pelo = '#4a2c24', peloLuz = '#8a5440', marino = '#2f3f6e';
  // pelo de detrás (largo, hasta los hombros)
  k.p(`M${X(0.06)} ${Y(0.24)} Q${X(0.02)} ${Y(0.46)} ${X(0.12)} ${Y(0.56)} L${X(0.3)} ${Y(0.5)} L${X(0.7)} ${Y(0.5)} L${X(0.88)} ${Y(0.56)} Q${X(0.98)} ${Y(0.46)} ${X(0.94)} ${Y(0.24)} Z`, pelo);
  // piernas, calcetines y zapatos
  for (const u of [0.36, 0.64]) {
    k.r(X(u) - W * 0.08, Y(0.78), W * 0.16, H * 0.16, 4, piel, { sil: false });
    k.r(X(u) - W * 0.085, Y(0.86), W * 0.17, H * 0.1, 3, '#fbf8f0', { sil: false, lw: 2 });
    k.e(X(u) + W * 0.02 * (u < 0.5 ? -1 : 1), Y(0.975), W * 0.13, H * 0.03, '#5a3a28');
  }
  // falda de tablas
  k.p(`M${X(0.2)} ${Y(0.64)} H${X(0.8)} L${X(0.92)} ${Y(0.82)} Q${X(0.5)} ${Y(0.86)} ${X(0.08)} ${Y(0.82)} Z`, marino);
  k.linea(`M${X(0.34)} ${Y(0.66)} L${X(0.28)} ${Y(0.83)} M${X(0.5)} ${Y(0.66)} V${Y(0.85)} M${X(0.66)} ${Y(0.66)} L${X(0.72)} ${Y(0.83)}`, 1.6, '#1f2a4a');
  // blusa blanca con cuello de marinero y lazo rojo
  k.p(`M${X(0.22)} ${Y(0.47)} Q${X(0.5)} ${Y(0.43)} ${X(0.78)} ${Y(0.47)} L${X(0.82)} ${Y(0.66)} H${X(0.18)} Z`, '#fbf8f2');
  k.p(capsula(X(0.22), Y(0.49), X(0.12), Y(0.64), W * 0.13), '#fbf8f2');
  k.p(capsula(X(0.78), Y(0.49), X(0.88), Y(0.64), W * 0.13), '#fbf8f2');
  k.c(X(0.12), Y(0.665), W * 0.075, piel); k.c(X(0.88), Y(0.665), W * 0.075, piel);
  k.p(`M${X(0.24)} ${Y(0.46)} L${X(0.5)} ${Y(0.58)} L${X(0.76)} ${Y(0.46)} L${X(0.82)} ${Y(0.5)} L${X(0.5)} ${Y(0.63)} L${X(0.18)} ${Y(0.5)} Z`, marino, { sil: false, lw: 2 });
  k.linea(`M${X(0.22)} ${Y(0.5)} L${X(0.5)} ${Y(0.6)} L${X(0.78)} ${Y(0.5)}`, 1.4, '#fbf8f2');
  k.p(`M${X(0.5)} ${Y(0.58)} L${X(0.36)} ${Y(0.55)} L${X(0.4)} ${Y(0.63)} Z M${X(0.5)} ${Y(0.58)} L${X(0.64)} ${Y(0.55)} L${X(0.6)} ${Y(0.63)} Z`, '#d8412a', { sil: false, lw: 2 });
  k.p(`M${X(0.47)} ${Y(0.59)} L${X(0.42)} ${Y(0.7)} L${X(0.5)} ${Y(0.67)} L${X(0.58)} ${Y(0.7)} L${X(0.53)} ${Y(0.59)} Z`, '#d8412a', { sil: false, lw: 2 });
  // cara: óvalo con la barbilla algo afilada
  k.p(`M${X(0.12)} ${Y(0.22)} Q${X(0.12)} ${Y(0.04)} ${X(0.5)} ${Y(0.04)} Q${X(0.88)} ${Y(0.04)} ${X(0.88)} ${Y(0.22)} Q${X(0.86)} ${Y(0.38)} ${X(0.5)} ${Y(0.45)} Q${X(0.14)} ${Y(0.38)} ${X(0.12)} ${Y(0.22)} Z`, piel);
  ojoAnime(k, X(0.33), Y(0.275), W * 0.125, H * 0.052, '#8a4a2a', { dir: -1 });
  ojoAnime(k, X(0.67), Y(0.275), W * 0.125, H * 0.052, '#8a4a2a');
  k.linea(`M${X(0.24)} ${Y(0.185)} Q${X(0.33)} ${Y(0.165)} ${X(0.41)} ${Y(0.18)} M${X(0.59)} ${Y(0.18)} Q${X(0.67)} ${Y(0.165)} ${X(0.76)} ${Y(0.185)}`, 1.3, '#7a5040');
  k.raw(`<g stroke="#f08a8a" stroke-width="1.6" stroke-linecap="round">${[0.18, 0.24, 0.3].map((u) => `<path d="M${f(X(u))} ${f(Y(0.345))} l-3 4"/>`).join('')}${[0.7, 0.76, 0.82].map((u) => `<path d="M${f(X(u))} ${f(Y(0.345))} l-3 4"/>`).join('')}</g>`);
  k.p(`M${X(0.44)} ${Y(0.37)} Q${X(0.5)} ${Y(0.41)} ${X(0.56)} ${Y(0.37)} Z`, '#c95a60', { sil: false, vol: 'none', lw: 1.6 });
  // flequillo en mechones y el brillo del pelo
  k.p(`M${X(0.08)} ${Y(0.3)} Q${X(0.02)} ${Y(0.02)} ${X(0.5)} ${Y(0.0)} Q${X(0.98)} ${Y(0.02)} ${X(0.92)} ${Y(0.3)} L${X(0.84)} ${Y(0.14)} L${X(0.76)} ${Y(0.17)} L${X(0.66)} ${Y(0.1)} L${X(0.56)} ${Y(0.16)} L${X(0.46)} ${Y(0.09)} L${X(0.36)} ${Y(0.16)} L${X(0.26)} ${Y(0.1)} L${X(0.16)} ${Y(0.17)} Z`, pelo, { sil: false });
  k.p(`M${X(0.2)} ${Y(0.06)} Q${X(0.5)} ${Y(0.0)} ${X(0.8)} ${Y(0.06)} Q${X(0.5)} ${Y(0.05)} ${X(0.2)} ${Y(0.1)} Z`, peloLuz, { sil: false, vol: 'none', borde: false, op: 0.9 });
  // una horquilla roja
  k.r(X(0.72), Y(0.1), W * 0.14, H * 0.018, 2, '#d8412a', { sil: false, lw: 1.4, tr: `rotate(-20 ${f(X(0.79))} ${f(Y(0.11))})` });
}
// sensei: hombre estilizado a lo anime: pelo gris peinado hacia atrás, gafas con destello, haori añil y puntero
function sensei(k, c) {
  const { x0, W, y0, H } = c, X = (u) => x0 + u * W, Y = (v) => y0 + v * H;
  const piel = '#f6dcc4', pelo = '#6b6670', peloLuz = '#b9b4c0', haori = '#2f3f6e';
  // hakama a rayas y pies con tabi
  k.p(`M${X(0.26)} ${Y(0.62)} H${X(0.74)} L${X(0.82)} ${Y(0.95)} H${X(0.18)} Z`, '#8d8a98');
  k.linea(`M${X(0.4)} ${Y(0.64)} L${X(0.36)} ${Y(0.94)} M${X(0.5)} ${Y(0.64)} V${Y(0.94)} M${X(0.6)} ${Y(0.64)} L${X(0.64)} ${Y(0.94)}`, 1.6, '#5f5c6b');
  k.e(X(0.36), Y(0.97), W * 0.1, H * 0.025, '#fbf8f0'); k.e(X(0.64), Y(0.97), W * 0.1, H * 0.025, '#fbf8f0');
  // kimono gris claro y haori añil abierto
  k.p(`M${X(0.3)} ${Y(0.34)} Q${X(0.5)} ${Y(0.31)} ${X(0.7)} ${Y(0.34)} L${X(0.74)} ${Y(0.64)} H${X(0.26)} Z`, '#e3e0e8');
  k.p(`M${X(0.14)} ${Y(0.36)} Q${X(0.3)} ${Y(0.31)} ${X(0.42)} ${Y(0.33)} L${X(0.46)} ${Y(0.66)} L${X(0.12)} ${Y(0.7)} Z`, haori);
  k.p(`M${X(0.86)} ${Y(0.36)} Q${X(0.7)} ${Y(0.31)} ${X(0.58)} ${Y(0.33)} L${X(0.54)} ${Y(0.66)} L${X(0.88)} ${Y(0.7)} Z`, haori);
  k.linea(`M${X(0.42)} ${Y(0.34)} L${X(0.5)} ${Y(0.46)} L${X(0.58)} ${Y(0.34)}`, 1.8, '#2a2220');
  k.c(X(0.4), Y(0.48), W * 0.018, '#fbf8f0', { sil: false, vol: 'none', lw: 1 }); k.c(X(0.6), Y(0.48), W * 0.018, '#fbf8f0', { sil: false, vol: 'none', lw: 1 });
  // brazo con el puntero
  k.p(capsula(X(0.8), Y(0.4), X(0.9), Y(0.56), W * 0.12), haori);
  k.c(X(0.9), Y(0.58), W * 0.055, piel);
  k.linea(`M${X(0.9)} ${Y(0.58)} L${X(1.0)} ${Y(0.28)}`, 3.4, '#6f4c30');
  k.p(capsula(X(0.2), Y(0.4), X(0.16), Y(0.62), W * 0.12), haori);
  k.c(X(0.16), Y(0.64), W * 0.055, piel);
  // cabeza: mandíbula marcada, pelo peinado hacia atrás con un mechón
  k.p(`M${X(0.3)} ${Y(0.14)} Q${X(0.3)} ${Y(0.03)} ${X(0.5)} ${Y(0.03)} Q${X(0.7)} ${Y(0.03)} ${X(0.7)} ${Y(0.14)} L${X(0.68)} ${Y(0.24)} Q${X(0.6)} ${Y(0.32)} ${X(0.5)} ${Y(0.33)} Q${X(0.4)} ${Y(0.32)} ${X(0.32)} ${Y(0.24)} Z`, piel);
  k.p(`M${X(0.28)} ${Y(0.16)} Q${X(0.26)} ${Y(0.0)} ${X(0.5)} ${Y(-0.01)} Q${X(0.76)} ${Y(0.0)} ${X(0.72)} ${Y(0.16)} Q${X(0.66)} ${Y(0.06)} ${X(0.52)} ${Y(0.07)} Q${X(0.4)} ${Y(0.06)} ${X(0.34)} ${Y(0.12)} Q${X(0.36)} ${Y(0.17)} ${X(0.3)} ${Y(0.2)} Z`, pelo, { sil: false });
  k.p(`M${X(0.36)} ${Y(0.03)} Q${X(0.52)} ${Y(-0.005)} ${X(0.66)} ${Y(0.03)} Q${X(0.52)} ${Y(0.02)} ${X(0.4)} ${Y(0.05)} Z`, peloLuz, { sil: false, vol: 'none', borde: false });
  k.linea(`M${X(0.54)} ${Y(0.07)} Q${X(0.62)} ${Y(0.12)} ${X(0.6)} ${Y(0.16)}`, 1.8, pelo);
  // gafas rectangulares con destello y ojos amables
  for (const u of [0.41, 0.59]) {
    k.r(X(u) - W * 0.075, Y(0.155), W * 0.15, H * 0.045, 3, '#eaf4fb', { sil: false, vol: 'none', lw: 2.4 });
    k.linea(`M${X(u) - W * 0.04} ${Y(0.182)} Q${X(u)} ${Y(0.165)} ${X(u) + W * 0.04} ${Y(0.182)}`, 2.2, '#1d1510');
  }
  k.linea(`M${X(0.485)} ${Y(0.17)} H${X(0.515)}`, 2);
  k.raw(`<path d="M${f(X(0.37))} ${f(Y(0.165))} l6 -3 M${f(X(0.55))} ${f(Y(0.165))} l6 -3" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`);
  k.linea(`M${X(0.33)} ${Y(0.14)} L${X(0.44)} ${Y(0.13)} M${X(0.56)} ${Y(0.13)} L${X(0.67)} ${Y(0.14)}`, 2, '#4a4650');
  k.linea(`M${X(0.45)} ${Y(0.265)} Q${X(0.5)} ${Y(0.285)} ${X(0.55)} ${Y(0.265)}`, 1.8, '#1d1510');
}
export const FIGURAS_B = {
  gato: (k) => gatoGris(k, caja('gato')),
  perro: (k) => perro(k, caja('perro')),
  persona: (k) => persona(k, caja('persona')),
  sensei: (k) => sensei(k, caja('sensei')),
};

// ── objetos (fracciones de su caja: X(0)..X(1) de izquierda a derecha, Y(0) arriba, Y(1) el suelo) ──
const B = (id) => { const c = caja(id); return { ...c, X: (u) => c.x0 + u * c.W, Y: (v) => c.y0 + v * c.H }; };
const R = (k, id, x, y, w, h, rx, color, o) => { const { X, Y, W, H } = B(id); k.r(X(x), Y(y), w * W, h * H, rx, color, o); };
const Cn = { rojo: '#d8412a', nar: '#f08a24', oro: '#e0a92e', oroLuz: '#f6d27a', anil: '#2f4a7a', cielo: '#8fb9e0', verde: '#6f9a3c', verdeOsc: '#4f7a2a', madera: '#9a6b43', maderaOsc: '#6f4c30', papel: '#f7eedb', crema: '#fbf6ea', rosa: '#f4a9b8', gris: '#a9a4b4', laca: '#2a2220', nori: '#243a2c' };
Object.assign(FIGURAS_B, {
  libro(k) { const { X, Y, W, H } = B('libro');
    k.r(X(0.02), Y(0.3), W * 0.96, H * 0.66, 3, Cn.papel); k.linea(`M${X(0.06)} ${Y(0.55)} H${X(0.94)} M${X(0.06)} ${Y(0.75)} H${X(0.94)}`, 1.4, '#c9b48a');
    k.r(X(0), Y(0.02), W, H * 0.34, 4, Cn.anil); k.r(X(0.7), Y(0.02), W * 0.06, H * 0.9, 1, Cn.rojo, { sil: false, lw: 1.6 }); },
  manzana(k) { const { X, Y, W, H } = B('manzana');
    k.p(`M${X(0.5)} ${Y(0.22)} C${X(0.3)} ${Y(0.02)} ${X(-0.02)} ${Y(0.18)} ${X(0.04)} ${Y(0.56)} C${X(0.1)} ${Y(0.92)} ${X(0.36)} ${Y(1.02)} ${X(0.5)} ${Y(0.9)} C${X(0.64)} ${Y(1.02)} ${X(0.9)} ${Y(0.92)} ${X(0.96)} ${Y(0.56)} C${X(1.02)} ${Y(0.18)} ${X(0.7)} ${Y(0.02)} ${X(0.5)} ${Y(0.22)} Z`, Cn.rojo);
    k.tubo(`M${X(0.5)} ${Y(0.22)} Q${X(0.5)} ${Y(0.06)} ${X(0.56)} ${Y(-0.02)}`, Cn.maderaOsc, 5);
    k.p(`M${X(0.56)} ${Y(0.1)} Q${X(0.8)} ${Y(-0.04)} ${X(0.86)} ${Y(0.12)} Q${X(0.7)} ${Y(0.22)} ${X(0.56)} ${Y(0.1)} Z`, Cn.verde, { lw: 2.4 });
    k.brillo(X(0.28), Y(0.4), 10, 6, -40); },
  onigiri(k) { const { X, Y, W, H } = B('onigiri');
    k.p(`M${X(0.5)} ${Y(0.02)} C${X(0.62)} ${Y(0.02)} ${X(1.02)} ${Y(0.74)} ${X(0.96)} ${Y(0.88)} C${X(0.9)} ${Y(1)} ${X(0.1)} ${Y(1)} ${X(0.04)} ${Y(0.88)} C${X(-0.02)} ${Y(0.74)} ${X(0.38)} ${Y(0.02)} ${X(0.5)} ${Y(0.02)} Z`, Cn.crema);
    k.r(X(0.3), Y(0.56), W * 0.4, H * 0.44, 4, Cn.nori, { lw: 2.4 });
    for (const [u, v] of [[0.4, 0.3], [0.58, 0.38], [0.46, 0.46]]) k.e(X(u), Y(v), 2.4, 3.4, '#1d1510', { sil: false, vol: 'none', borde: false, op: 0.35 }); },
  'caja-fondo'(k) { const { X, Y, W, H } = B('caja');
    k.p(`M${X(0.04)} ${Y(0.34)} L${X(0.2)} ${Y(0.02)} L${X(0.8)} ${Y(0.02)} L${X(0.96)} ${Y(0.34)} Z`, '#c98f55');
    k.p(`M${X(0.12)} ${Y(0.3)} L${X(0.24)} ${Y(0.1)} L${X(0.76)} ${Y(0.1)} L${X(0.88)} ${Y(0.3)} Z`, '#8a5a32', { sil: false, vol: 'none', lw: 2 }); },
  'caja-frente'(k) { const { X, Y, W, H } = B('caja');
    k.r(X(0.04), Y(0.32), W * 0.92, H * 0.68, 4, '#dca56a');
    k.p(`M${X(0.04)} ${Y(0.34)} L${X(-0.06)} ${Y(0.16)} L${X(0.3)} ${Y(0.2)} L${X(0.36)} ${Y(0.34)} Z`, '#e8b67c', { lw: 2.4 });
    k.p(`M${X(0.96)} ${Y(0.34)} L${X(1.06)} ${Y(0.16)} L${X(0.7)} ${Y(0.2)} L${X(0.64)} ${Y(0.34)} Z`, '#e8b67c', { lw: 2.4 });
    k.r(X(0.4), Y(0.32), W * 0.2, H * 0.68, 0, '#e9c48f', { sil: false, vol: 'none', lw: 1.6 });
    kanji(k, '猫', X(0.66), Y(0.52), 26, '#8a5a32'); },
  mesa(k) { const { X, Y, W, H } = B('mesa');
    for (const u of [0.08, 0.84]) k.r(X(u), Y(0.14), W * 0.08, H * 0.86, 3, Cn.maderaOsc);
    k.r(X(0), Y(0), W, H * 0.18, 6, Cn.madera, { vol: 'v' }); k.linea(`M${X(0.04)} ${Y(0.08)} H${X(0.96)}`, 1.6, '#c89a6a'); },
  cama(k) { const { X, Y, W, H } = B('cama');
    k.r(X(0), Y(0.12), W * 0.08, H * 0.88, 4, Cn.maderaOsc); k.r(X(0.92), Y(0.36), W * 0.08, H * 0.64, 4, Cn.maderaOsc);
    k.r(X(0.02), Y(0.44), W * 0.96, H * 0.4, 6, Cn.madera);
    k.r(X(0.04), Y(0.3), W * 0.92, H * 0.2, 10, '#f3ecdf');
    k.p(`M${X(0.3)} ${Y(0.32)} Q${X(0.6)} ${Y(0.22)} ${X(0.96)} ${Y(0.32)} L${X(0.96)} ${Y(0.52)} L${X(0.3)} ${Y(0.52)} Z`, '#8fb9e0', { lw: 2.4 });
    k.e(X(0.16), Y(0.3), W * 0.1, H * 0.1, '#fbf6ea'); },
  taza(k) { const { X, Y, W, H } = B('taza');
    k.p(`M${X(0.06)} ${Y(0.16)} H${X(0.94)} L${X(0.84)} ${Y(0.92)} Q${X(0.5)} ${Y(1.02)} ${X(0.16)} ${Y(0.92)} Z`, '#8aa66b');
    k.e(X(0.5), Y(0.16), W * 0.44, H * 0.08, '#c8d9a0', { sil: false, lw: 2 });
    k.linea(`M${X(0.2)} ${Y(0.5)} Q${X(0.5)} ${Y(0.58)} ${X(0.8)} ${Y(0.5)}`, 2, '#5d7a45');
    k.linea(`M${X(0.4)} ${Y(0.02)} q-6 -8 0 -16 M${X(0.6)} ${Y(0.02)} q6 -8 0 -16`, 2.4, '#8d7f72'); },
  plato(k) { const { X, Y, W, H } = B('plato');
    k.e(X(0.5), Y(0.6), W * 0.5, H * 0.5, Cn.crema); k.e(X(0.5), Y(0.5), W * 0.34, H * 0.28, '#f1e6cf', { sil: false, vol: 'none', lw: 1.6 });
    k.linea(`M${X(0.08)} ${Y(0.6)} Q${X(0.5)} ${Y(1.05)} ${X(0.92)} ${Y(0.6)}`, 2, Cn.anil); },
  cuenco(k) { const { X, Y, W, H } = B('cuenco');
    k.p(nube(X(0.5), Y(0.26), W * 0.42, H * 0.16, 7, 0.2), '#fbf8f0', { vol: 'none', lw: 2.2 });
    k.p(`M${X(0.02)} ${Y(0.3)} Q${X(0.06)} ${Y(0.92)} ${X(0.5)} ${Y(0.92)} Q${X(0.94)} ${Y(0.92)} ${X(0.98)} ${Y(0.3)} Z`, Cn.anil);
    k.linea(`M${X(0.12)} ${Y(0.52)} q8 -8 16 0 t16 0 t16 0 t16 0 t16 0`, 2, '#dbe6f4');
    k.r(X(0.34), Y(0.9), W * 0.32, H * 0.1, 3, Cn.anil); },
  regalo(k) { const { X, Y, W, H } = B('regalo');
    k.r(X(0.04), Y(0.3), W * 0.92, H * 0.7, 4, Cn.rojo); k.r(X(0), Y(0.2), W, H * 0.16, 4, '#e8604a');
    k.r(X(0.42), Y(0.2), W * 0.16, H * 0.8, 0, Cn.oro, { sil: false, lw: 2 });
    k.p(`M${X(0.5)} ${Y(0.2)} Q${X(0.2)} ${Y(-0.08)} ${X(0.22)} ${Y(0.14)} Q${X(0.3)} ${Y(0.24)} ${X(0.5)} ${Y(0.2)} Z`, Cn.oro, { lw: 2.4 });
    k.p(`M${X(0.5)} ${Y(0.2)} Q${X(0.8)} ${Y(-0.08)} ${X(0.78)} ${Y(0.14)} Q${X(0.7)} ${Y(0.24)} ${X(0.5)} ${Y(0.2)} Z`, Cn.oro, { lw: 2.4 }); },
  casa(k) { const { X, Y, W, H } = B('casa');
    k.r(X(0.08), Y(0.44), W * 0.84, H * 0.56, 2, '#f7efdf');
    for (const u of [0.08, 0.46, 0.88]) k.r(X(u), Y(0.44), W * 0.04, H * 0.56, 0, Cn.maderaOsc, { sil: false, vol: 'none', lw: 1.4 });
    k.r(X(0.54), Y(0.58), W * 0.28, H * 0.42, 1, '#fbf5e6', { sil: false, lw: 1.8 }); k.linea(`M${X(0.68)} ${Y(0.58)} V${Y(1)} M${X(0.54)} ${Y(0.78)} H${X(0.82)}`, 1.2, Cn.madera);
    k.c(X(0.28), Y(0.66), W * 0.08, '#fbf5e6', { sil: false, lw: 1.8 });
    k.p(`M${X(-0.04)} ${Y(0.48)} Q${X(0.04)} ${Y(0.4)} ${X(0.12)} ${Y(0.38)} L${X(0.3)} ${Y(0.06)} L${X(0.7)} ${Y(0.06)} L${X(0.88)} ${Y(0.38)} Q${X(0.96)} ${Y(0.4)} ${X(1.04)} ${Y(0.48)} Q${X(0.5)} ${Y(0.36)} ${X(-0.04)} ${Y(0.48)} Z`, '#566072', { vol: 'v' });
    k.r(X(0.26), Y(0.02), W * 0.48, H * 0.07, 3, '#3b4150'); },
  escuela(k) { const { X, Y, W, H } = B('escuela');
    k.r(X(0.02), Y(0.3), W * 0.96, H * 0.7, 3, '#f3e6cc');
    for (const fila of [0.42, 0.66]) for (const u of [0.08, 0.26, 0.62, 0.8]) k.r(X(u), Y(fila), W * 0.12, H * 0.14, 2, '#bcd4ec', { sil: false, lw: 1.8 });
    k.r(X(0.42), Y(0.64), W * 0.16, H * 0.36, 2, Cn.maderaOsc, { sil: false, lw: 2 });
    k.r(X(0.36), Y(0.08), W * 0.28, H * 0.26, 3, '#f3e6cc'); k.c(X(0.5), Y(0.2), W * 0.07, '#fbf8f0', { sil: false, lw: 2 });
    k.linea(`M${X(0.5)} ${Y(0.2)} V${Y(0.15)} M${X(0.5)} ${Y(0.2)} H${X(0.54)}`, 2);
    k.p(`M${X(-0.02)} ${Y(0.32)} L${X(0.5)} ${Y(0.24)} L${X(1.02)} ${Y(0.32)} Z`, Cn.rojo, { lw: 2.4 }); },
  reloj(k) { const { X, Y, W, H } = B('reloj');
    k.c(X(0.18), Y(0.14), W * 0.16, Cn.oro); k.c(X(0.82), Y(0.14), W * 0.16, Cn.oro);
    k.c(X(0.5), Y(0.54), W * 0.46, Cn.rojo); k.c(X(0.5), Y(0.54), W * 0.36, '#fbf8f0', { sil: false, lw: 2 });
    k.linea(`M${X(0.5)} ${Y(0.54)} V${Y(0.34)} M${X(0.5)} ${Y(0.54)} L${X(0.66)} ${Y(0.62)}`, 3);
    k.linea(`M${X(0.26)} ${Y(0.94)} L${X(0.18)} ${Y(1)} M${X(0.74)} ${Y(0.94)} L${X(0.82)} ${Y(1)}`, 4); },
  silla(k) { const { X, Y, W, H } = B('silla');
    k.r(X(0.06), Y(0), W * 0.88, H * 0.46, 6, Cn.madera, { vol: 'v' });
    k.r(X(0.16), Y(0.08), W * 0.68, H * 0.12, 3, '#c89a6a', { sil: false, vol: 'none', lw: 1.6 });
    k.r(X(0), Y(0.5), W, H * 0.1, 3, Cn.madera);
    for (const u of [0.06, 0.82]) k.r(X(u), Y(0.58), W * 0.12, H * 0.42, 2, Cn.maderaOsc); },
  bolsa(k) { const { X, Y, W, H } = B('bolsa');
    k.tubo(`M${X(0.3)} ${Y(0.36)} Q${X(0.3)} ${Y(0.02)} ${X(0.5)} ${Y(0.02)} Q${X(0.7)} ${Y(0.02)} ${X(0.7)} ${Y(0.36)}`, Cn.maderaOsc, 5);
    k.p(`M${X(0.06)} ${Y(0.34)} H${X(0.94)} L${X(0.98)} ${Y(1)} H${X(0.02)} Z`, '#e9d6b0');
    kanji(k, '猫', X(0.32), Y(0.46), W * 0.36, Cn.rojo); },
  telefono(k) { const { X, Y, W, H } = B('telefono');
    k.r(X(0), Y(0), W, H, 10, Cn.laca); k.r(X(0.12), Y(0.1), W * 0.76, H * 0.74, 4, '#8fb9e0', { sil: false, lw: 2 });
    k.c(X(0.5), Y(0.92), W * 0.08, '#6b6360', { sil: false, vol: 'none', lw: 1.4 }); k.brillo(X(0.35), Y(0.3), 5, 12, -10, 0.8); },
  tren(k) { const { X, Y, W, H } = B('tren');
    k.p(`M${X(0.02)} ${Y(0.2)} H${X(0.76)} Q${X(0.98)} ${Y(0.22)} ${X(1)} ${Y(0.66)} L${X(1)} ${Y(0.86)} H${X(0.02)} Z`, '#f7f4ee');
    k.r(X(0.02), Y(0.6), W * 0.98, H * 0.1, 0, Cn.anil, { sil: false, vol: 'none', lw: 1.6 });
    for (const u of [0.08, 0.26, 0.44, 0.62]) k.r(X(u), Y(0.32), W * 0.12, H * 0.2, 3, '#8fb9e0', { sil: false, lw: 1.6 });
    k.p(`M${X(0.8)} ${Y(0.3)} Q${X(0.92)} ${Y(0.32)} ${X(0.95)} ${Y(0.52)} H${X(0.8)} Z`, '#8fb9e0', { sil: false, lw: 1.6 });
    for (const u of [0.16, 0.36, 0.7, 0.88]) k.c(X(u), Y(0.9), W * 0.05, '#4a4a55'); },
  bici(k) { const { X, Y, W, H } = B('bici');
    for (const u of [0.2, 0.8]) { const r = W * 0.19, cx = X(u), cy = Y(0.68); k.tubo(`M${f(cx - r)} ${f(cy)} A${f(r)} ${f(r)} 0 1 0 ${f(cx + r)} ${f(cy)} A${f(r)} ${f(r)} 0 1 0 ${f(cx - r)} ${f(cy)}`, '#4a4a55', 6); k.c(cx, cy, W * 0.04, '#4a4a55', { sil: false }); }
    k.linea(`M${X(0.2)} ${Y(0.68)} L${X(0.42)} ${Y(0.36)} L${X(0.66)} ${Y(0.36)} L${X(0.8)} ${Y(0.68)} M${X(0.42)} ${Y(0.36)} L${X(0.5)} ${Y(0.68)} L${X(0.66)} ${Y(0.36)}`, 5, Cn.rojo);
    k.linea(`M${X(0.36)} ${Y(0.28)} H${X(0.48)} M${X(0.64)} ${Y(0.36)} L${X(0.62)} ${Y(0.18)} L${X(0.72)} ${Y(0.14)}`, 4, Cn.laca); },
  sol(k) { const { X, Y, W, H } = B('sol');
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, r1 = W * 0.38, r2 = W * (i % 2 ? 0.5 : 0.56); k.linea(`M${f(X(0.5) + Math.cos(a) * r1)} ${f(Y(0.5) + Math.sin(a) * r1)} L${f(X(0.5) + Math.cos(a) * r2)} ${f(Y(0.5) + Math.sin(a) * r2)}`, 5, Cn.nar); }
    k.c(X(0.5), Y(0.5), W * 0.32, Cn.rojo); k.brillo(X(0.4), Y(0.4), 10, 6, -30); },
  nube(k) { const { X, Y, W, H } = B('nube');
    k.p(nube(X(0.5), Y(0.55), W * 0.46, H * 0.3, 6, 0.3, 0.7), '#fbf6ea', { vol: 'v' });
    k.linea(`M${X(0.3)} ${Y(0.6)} q-6 -8 1 -12 q8 -3 9 4 q1 5 -4 5 M${X(0.62)} ${Y(0.58)} q-2 -8 5 -10 q8 0 7 7 q-1 4 -5 4`, 2.4); },
  luna(k) { const { X, Y, W, H } = B('luna');
    k.p(`M${X(0.62)} ${Y(0.02)} A${W * 0.5} ${W * 0.5} 0 1 0 ${X(0.9)} ${Y(0.84)} A${W * 0.42} ${W * 0.42} 0 1 1 ${X(0.62)} ${Y(0.02)} Z`, '#f6d27a');
    k.c(X(0.36), Y(0.4), W * 0.06, '#e0a92e', { sil: false, vol: 'none', lw: 1.4 }); k.c(X(0.3), Y(0.66), W * 0.05, '#e0a92e', { sil: false, vol: 'none', lw: 1.4 }); },
  pizarra(k) { const { X, Y, W, H } = B('pizarra');
    k.r(X(0), Y(0.04), W, H * 0.8, 4, Cn.maderaOsc); k.r(X(0.04), Y(0.1), W * 0.92, H * 0.66, 2, '#2f4a3a', { sil: false, lw: 2 });
    for (const [ch, u] of [['あ', 0.12], ['猫', 0.38], ['学', 0.64]]) kanji(k, ch, X(u), Y(0.18), W * 0.22, '#f3efe4');
    k.r(X(0.1), Y(0.84), W * 0.8, H * 0.06, 2, Cn.madera); k.r(X(0.7), Y(0.8), W * 0.1, H * 0.05, 2, '#fbf8f0', { sil: false, lw: 1.4 }); },
  lapiz(k) { const { X, Y, W, H } = B('lapiz');
    k.p(capsula(X(0.8), Y(0.04), X(0.24), Y(0.8), W * 0.24), Cn.oro);
    k.p(`M${X(0.3)} ${Y(0.72)} L${X(0.02)} ${Y(1)} L${X(0.16)} ${Y(0.66)} Z`, '#f3d2a8', { lw: 2.4 });
    k.p(`M${X(0.1)} ${Y(0.9)} L${X(0.02)} ${Y(1)} L${X(0.06)} ${Y(0.86)} Z`, Cn.laca, { sil: false, vol: 'none', lw: 1 });
    k.c(X(0.82), Y(0.06), W * 0.14, Cn.rosa); },
  carta(k) { const { X, Y, W, H } = B('carta');
    k.r(X(0), Y(0.08), W, H * 0.9, 3, Cn.papel);
    k.linea(`M${X(0.02)} ${Y(0.1)} L${X(0.5)} ${Y(0.56)} L${X(0.98)} ${Y(0.1)}`, 2.4);
    k.c(X(0.5), Y(0.56), W * 0.1, Cn.rojo, { lw: 2 }); },
  zapato(k) { const { X, Y, W, H } = B('zapato');
    k.p(`M${X(0.02)} ${Y(0.9)} L${X(0.04)} ${Y(0.2)} Q${X(0.12)} ${Y(0)} ${X(0.34)} ${Y(0.1)} L${X(0.56)} ${Y(0.4)} Q${X(0.96)} ${Y(0.42)} ${X(0.98)} ${Y(0.9)} Z`, Cn.rojo);
    k.r(X(0), Y(0.82), W, H * 0.18, 4, '#fbf8f0'); k.linea(`M${X(0.3)} ${Y(0.24)} L${X(0.4)} ${Y(0.34)} M${X(0.4)} ${Y(0.18)} L${X(0.5)} ${Y(0.3)}`, 2.4, '#fbf8f0'); },
  vaso(k) { const { X, Y, W, H } = B('vaso');
    k.p(`M${X(0)} ${Y(0)} H${X(1)} L${X(0.86)} ${Y(1)} H${X(0.14)} Z`, '#dcecf6', { vol: 'none' });
    k.p(`M${X(0.06)} ${Y(0.34)} H${X(0.94)} L${X(0.86)} ${Y(0.98)} H${X(0.14)} Z`, '#f2a14a', { sil: false, vol: 'none', lw: 1.6 }); k.brillo(X(0.3), Y(0.3), 3, 10, 0, 0.9); },
  pan(k) { const { X, Y, W, H } = B('pan');
    k.p(`M${X(0.02)} ${Y(0.9)} Q${X(-0.02)} ${Y(0.04)} ${X(0.5)} ${Y(0.02)} Q${X(1.02)} ${Y(0.04)} ${X(0.98)} ${Y(0.9)} Q${X(0.5)} ${Y(1.02)} ${X(0.02)} ${Y(0.9)} Z`, '#e9b566');
    k.linea(`M${X(0.3)} ${Y(0.3)} L${X(0.4)} ${Y(0.6)} M${X(0.5)} ${Y(0.26)} L${X(0.6)} ${Y(0.58)} M${X(0.7)} ${Y(0.3)} L${X(0.78)} ${Y(0.56)}`, 2.4, '#b8803a'); },
  sushi(k) { const { X, Y, W, H } = B('sushi');
    k.e(X(0.5), Y(0.7), W * 0.46, H * 0.3, Cn.crema);
    k.p(`M${X(0.02)} ${Y(0.5)} Q${X(0.1)} ${Y(0.02)} ${X(0.5)} ${Y(0.04)} Q${X(0.96)} ${Y(0.06)} ${X(0.98)} ${Y(0.5)} Q${X(0.5)} ${Y(0.66)} ${X(0.02)} ${Y(0.5)} Z`, '#f2875a');
    k.linea(`M${X(0.28)} ${Y(0.14)} L${X(0.22)} ${Y(0.5)} M${X(0.5)} ${Y(0.1)} L${X(0.46)} ${Y(0.54)} M${X(0.72)} ${Y(0.14)} L${X(0.7)} ${Y(0.52)}`, 2.4, '#fbd9c4'); },
  ki(k) { const { X, Y, W, H } = B('ki');
    k.p(`M${X(0.42)} ${Y(1)} L${X(0.44)} ${Y(0.56)} L${X(0.56)} ${Y(0.56)} L${X(0.58)} ${Y(1)} Z`, Cn.maderaOsc);
    k.p(nube(X(0.5), Y(0.36), W * 0.46, H * 0.32, 8, 0.1, 0.6), '#7da84a', { vol: 'r' });
    k.p(nube(X(0.36), Y(0.28), W * 0.2, H * 0.14, 6, 0.3, 0.6), '#9cc466', { sil: false, vol: 'none', lw: 2 }); },
  hana(k) { const { X, Y, W, H } = B('hana');
    k.tubo(`M${X(0.5)} ${Y(1)} Q${X(0.44)} ${Y(0.7)} ${X(0.5)} ${Y(0.34)}`, Cn.verde, 5);
    k.p(`M${X(0.48)} ${Y(0.74)} Q${X(0.04)} ${Y(0.6)} ${X(0.06)} ${Y(0.5)} Q${X(0.3)} ${Y(0.52)} ${X(0.48)} ${Y(0.74)} Z`, Cn.verde, { lw: 2.4 });
    k.p(flor(X(0.5), Y(0.24), W * 0.46, -90), Cn.rosa); k.c(X(0.5), Y(0.24), W * 0.1, Cn.oro, { sil: false, vol: 'none', lw: 1.6 }); },
  sakana(k) { const { X, Y, W, H } = B('sakana');
    k.p(`M${X(0.02)} ${Y(0.5)} Q${X(0.3)} ${Y(0.02)} ${X(0.74)} ${Y(0.4)} L${X(1)} ${Y(0.14)} L${X(0.96)} ${Y(0.5)} L${X(1)} ${Y(0.86)} L${X(0.74)} ${Y(0.6)} Q${X(0.3)} ${Y(0.98)} ${X(0.02)} ${Y(0.5)} Z`, Cn.rojo);
    k.p(`M${X(0.3)} ${Y(0.2)} Q${X(0.46)} ${Y(0.04)} ${X(0.6)} ${Y(0.24)} Z`, Cn.rojo, { sil: false, lw: 2 });
    k.c(X(0.18), Y(0.44), W * 0.05, '#fbf8f0', { sil: false, lw: 1.6 }); k.c(X(0.18), Y(0.44), W * 0.02, '#1d1510', { sil: false, vol: 'none', borde: false });
    k.linea(`M${X(0.34)} ${Y(0.32)} q6 8 0 16 M${X(0.44)} ${Y(0.3)} q6 10 0 20`, 1.6, '#f8b8a8'); },
  tori(k) { const { X, Y, W, H } = B('tori');
    k.e(X(0.5), Y(0.56), W * 0.4, H * 0.34, '#b88a5a');
    k.e(X(0.54), Y(0.66), W * 0.24, H * 0.2, '#f3e6cc', { sil: false, vol: 'none' });
    k.p(`M${X(0.66)} ${Y(0.46)} Q${X(1)} ${Y(0.4)} ${X(0.96)} ${Y(0.66)} Q${X(0.82)} ${Y(0.6)} ${X(0.66)} ${Y(0.56)} Z`, '#8a6040', { lw: 2.4 });
    k.p(`M${X(0.14)} ${Y(0.4)} L${X(0.02)} ${Y(0.36)} L${X(0.12)} ${Y(0.48)} Z`, Cn.oro, { lw: 2 });
    k.c(X(0.3), Y(0.4), W * 0.05, '#1d1510', { sil: false, vol: 'none', borde: false }); k.punto(X(0.29), Y(0.38), 1.6);
    k.linea(`M${X(0.44)} ${Y(0.9)} V${Y(1)} M${X(0.58)} ${Y(0.9)} V${Y(1)}`, 2.6, Cn.oro); },
  kuruma(k) { const { X, Y, W, H } = B('kuruma');
    k.p(`M${X(0.02)} ${Y(0.82)} L${X(0.02)} ${Y(0.5)} Q${X(0.04)} ${Y(0.36)} ${X(0.18)} ${Y(0.36)} L${X(0.3)} ${Y(0.06)} H${X(0.72)} L${X(0.84)} ${Y(0.36)} Q${X(0.98)} ${Y(0.38)} ${X(0.98)} ${Y(0.54)} L${X(0.98)} ${Y(0.82)} Z`, '#4f86dc');
    k.p(`M${X(0.34)} ${Y(0.14)} H${X(0.49)} V${Y(0.36)} H${X(0.26)} Z M${X(0.53)} ${Y(0.14)} H${X(0.68)} L${X(0.76)} ${Y(0.36)} H${X(0.53)} Z`, '#dcecf6', { sil: false, lw: 1.6 });
    for (const u of [0.24, 0.76]) { k.c(X(u), Y(0.84), W * 0.12, '#3a3a44'); k.c(X(u), Y(0.84), W * 0.05, '#c9c4d0', { sil: false, vol: 'none', lw: 1.4 }); } },
  terebi(k) { const { X, Y, W, H } = B('terebi');
    k.linea(`M${X(0.44)} ${Y(0.24)} L${X(0.3)} ${Y(0.02)} M${X(0.56)} ${Y(0.24)} L${X(0.72)} ${Y(0)}`, 3);
    k.r(X(0.02), Y(0.22), W * 0.96, H * 0.66, 10, Cn.madera); k.r(X(0.1), Y(0.3), W * 0.62, H * 0.5, 8, '#8fb9e0', { sil: false, lw: 2 });
    k.c(X(0.84), Y(0.4), W * 0.05, Cn.oro, { sil: false, lw: 1.4 }); k.c(X(0.84), Y(0.56), W * 0.05, Cn.oro, { sil: false, lw: 1.4 });
    k.r(X(0.14), Y(0.88), W * 0.12, H * 0.12, 2, Cn.maderaOsc); k.r(X(0.74), Y(0.88), W * 0.12, H * 0.12, 2, Cn.maderaOsc); k.brillo(X(0.24), Y(0.42), 8, 4, -20, 0.8); },
  okane(k) { const { X, Y, W, H } = B('okane');
    k.r(X(0.02), Y(0.3), W * 0.62, H * 0.5, 3, '#cfe0c4', { tr: `rotate(-8 ${X(0.33)} ${Y(0.55)})` });
    kanji(k, '金', X(0.18), Y(0.36), 22, '#4f7a2a');
    for (const [u, v] of [[0.74, 0.86], [0.74, 0.72], [0.74, 0.58]]) k.e(X(u), Y(v), W * 0.24, H * 0.12, Cn.oro);
    k.c(X(0.74), Y(0.58), W * 0.06, '#f6d27a', { sil: false, vol: 'none', lw: 1.4 }); },
  kasa(k) { const { X, Y, W, H } = B('kasa');
    k.tubo(`M${X(0.5)} ${Y(0.34)} V${Y(0.94)} Q${X(0.5)} ${Y(1)} ${X(0.42)} ${Y(0.98)}`, Cn.maderaOsc, 5);
    k.p(`M${X(0.02)} ${Y(0.42)} Q${X(0.1)} ${Y(0.04)} ${X(0.5)} ${Y(0.02)} Q${X(0.9)} ${Y(0.04)} ${X(0.98)} ${Y(0.42)} Q${X(0.5)} ${Y(0.32)} ${X(0.02)} ${Y(0.42)} Z`, Cn.rojo);
    k.linea(`M${X(0.5)} ${Y(0.02)} L${X(0.18)} ${Y(0.4)} M${X(0.5)} ${Y(0.02)} L${X(0.36)} ${Y(0.37)} M${X(0.5)} ${Y(0.02)} L${X(0.64)} ${Y(0.37)} M${X(0.5)} ${Y(0.02)} L${X(0.82)} ${Y(0.4)}`, 1.6, '#9c2a1a');
    k.c(X(0.5), Y(0.24), W * 0.12, '#fbf6ea', { sil: false, lw: 1.6 }); },
  mushi(k) { const { X, Y, W, H } = B('mushi');
    k.e(X(0.5), Y(0.56), W * 0.42, H * 0.42, Cn.rojo);
    k.p(`M${X(0.08)} ${Y(0.52)} Q${X(0.5)} ${Y(0.04)} ${X(0.92)} ${Y(0.52)} Z`, '#1d1510', { sil: false, vol: 'none', lw: 1 });
    k.e(X(0.5), Y(0.36), W * 0.2, H * 0.2, '#1d1510', { sil: false, vol: 'none', borde: false });
    for (const [u, v] of [[0.3, 0.64], [0.7, 0.64], [0.42, 0.84], [0.58, 0.84]]) k.c(X(u), Y(v), W * 0.06, '#1d1510', { sil: false, vol: 'none', borde: false });
    k.linea(`M${X(0.5)} ${Y(0.42)} V${Y(0.98)}`, 1.6); },
});

// Nyan: una imagen por cara, brazo y onigiri (nyan-<cara>[-arriba][-onigiri])
export const CARAS = ['normal', 'feliz', 'sorpresa', 'sueno', 'pensando', 'triste', 'enfado'];
for (const cara of CARAS) {
  for (const brazo of [null, 'arriba']) {
    for (const onigiri of [false, true]) {
      if (onigiri && !['normal', 'feliz'].includes(cara)) continue;
      const id = `nyan-${cara}${brazo ? '-arriba' : ''}${onigiri ? '-onigiri' : ''}`;
      // el cuerpo mide de la punta de la oreja (y 28) a la planta (y 343): 315 unidades del espacio de Nyan
      const c = caja('nyan'), s = c.H / 315, cy = SUELO - (343 - 128) * s;
      FIGURAS_B[id] = (k) => { k.sombra(128, SUELO + 2, c.W * 0.42, 7); nyanCuerpo(k, 128 - 6 * s, cy, s, { cara, brazo, onigiri }); };
    }
  }
}
