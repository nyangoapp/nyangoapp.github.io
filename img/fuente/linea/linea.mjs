// Estilo LÍNEA (como pegatinas de línea): trazo marrón redondeado de grosor
// constante, relleno plano crema (sin degradados ni borde blanco), la cara en la mitad baja de la cabeza, rubor
// rosa liso. La silueta se contornea ENTERA: primero el trazo gordo de todas las piezas y luego sus rellenos
// encima, así cabeza, cuello y cuerpo son una sola figura (nada de cabezas pegadas encima de un tronco).
import { writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

export const LIN = '#5a3a22', CREMA = '#fff7e4', NAR = '#f5a35a', NAR_IN = '#f9c089', MELOC = '#fbd9b8', RUBOR = '#f8b2b6', BOCA = '#b94a4f', LENGUA = '#f2868f';
const n = (v) => +v.toFixed(1);

// piezas: { d (path), relleno } → contorno de la unión + rellenos
export function silueta(piezas, lw = 7) {
  const trazos = piezas.map((p) => `<path d="${p.d}" fill="${LIN}" stroke="${LIN}" stroke-width="${lw * 2}" stroke-linejoin="round" stroke-linecap="round"/>`).join('');
  const rellenos = piezas.map((p) => `<path d="${p.d}" fill="${p.relleno || CREMA}"/>`).join('');
  return trazos + rellenos;
}
// tubo con contorno (brazos, patas): línea gorda marrón y encima la crema
export function tubo(d, w, lw = 7, relleno = CREMA) {
  return `<path d="${d}" fill="none" stroke="${LIN}" stroke-width="${w + lw * 2}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${relleno}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
}
export const trazo = (d, w = 6, c = LIN) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
export const elipse = (cx, cy, rx, ry, c, extra = '') => `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}" fill="${c}" ${extra}/>`;

// ─────────────── Nyan (coordenadas de la cabeza: centro en 0,0; ~212 de ancho) ───────────────
const CAB = 'M0 104 C56 104 104 90 106 50 C108 6 94 -58 80 -102 Q76 -116 64 -106 L24 -70 Q0 -60 -24 -70 L-64 -106 Q-76 -116 -80 -102 C-94 -58 -108 6 -106 50 C-104 90 -56 104 0 104 Z';
const OJO_X = 40, OJO_Y = 34, MOF = [70, 62], BOCA_Y = 60;

const OJOS = {
  punto: () => [-1, 1].map((s) => elipse(s * OJO_X, OJO_Y, 7.5, 9.5, LIN)).join(''),
  feliz: () => [-1, 1].map((s) => trazo(`M${s * OJO_X - 13} ${OJO_Y + 6} Q${s * OJO_X} ${OJO_Y - 12} ${s * OJO_X + 13} ${OJO_Y + 6}`, 6.5)).join(''),
  cerrados: () => [-1, 1].map((s) => trazo(`M${s * OJO_X + s * 13} ${OJO_Y - 11} L${s * OJO_X - s * 11} ${OJO_Y} L${s * OJO_X + s * 13} ${OJO_Y + 11}`, 6.5)).join(''),
  sueno: () => [-1, 1].map((s) => trazo(`M${s * OJO_X - 13} ${OJO_Y} Q${s * OJO_X} ${OJO_Y + 9} ${s * OJO_X + 13} ${OJO_Y}`, 6)).join(''),
  duda: () => trazo(`M${-OJO_X - 14} ${OJO_Y + 1} L${-OJO_X + 12} ${OJO_Y - 3}`, 6) + elipse(OJO_X, OJO_Y, 7.5, 9.5, LIN) + trazo(`M${OJO_X - 16} ${OJO_Y - 22} Q${OJO_X} ${OJO_Y - 30} ${OJO_X + 16} ${OJO_Y - 24}`, 5),
  gusto: () => [-1, 1].map((s) => trazo(`M${s * OJO_X - 13} ${OJO_Y + 2} Q${s * OJO_X} ${OJO_Y + 10} ${s * OJO_X + 13} ${OJO_Y + 2}`, 6) + trazo(`M${s * 18} ${OJO_Y - 26} Q${s * 34} ${OJO_Y - 32} ${s * 52} ${OJO_Y - 22}`, 4.5)).join(''),
};
const BOCAS = {
  w: () => trazo(`M-13 ${BOCA_Y - 4} Q-6 ${BOCA_Y + 6} 0 ${BOCA_Y - 2} Q6 ${BOCA_Y + 6} 13 ${BOCA_Y - 4}`, 5.5),
  abierta: () => `<path d="M-19 ${BOCA_Y - 7} Q0 ${BOCA_Y - 3} 19 ${BOCA_Y - 7} Q17 ${BOCA_Y + 24} 0 ${BOCA_Y + 25} Q-17 ${BOCA_Y + 24} -19 ${BOCA_Y - 7} Z" fill="${BOCA}" stroke="${LIN}" stroke-width="5.5" stroke-linejoin="round"/>` + `<path d="M-10 ${BOCA_Y + 16} Q0 ${BOCA_Y + 9} 10 ${BOCA_Y + 16} Q6 ${BOCA_Y + 22} 0 ${BOCA_Y + 22} Q-6 ${BOCA_Y + 22} -10 ${BOCA_Y + 16} Z" fill="${LENGUA}"/>`,
  ondulada: () => trazo(`M-16 ${BOCA_Y + 2} q4 -6 8 0 t8 0 t8 0 t8 0`, 5),
  risita: () => `<path d="M-14 ${BOCA_Y - 4} Q0 ${BOCA_Y} 14 ${BOCA_Y - 4} Q10 ${BOCA_Y + 12} 0 ${BOCA_Y + 12} Q-10 ${BOCA_Y + 12} -14 ${BOCA_Y - 4} Z" fill="${CREMA}" stroke="${LIN}" stroke-width="5" stroke-linejoin="round"/>`,
};

// la cabeza (con sus orejas, la naranja a su derecha = izquierda de la pantalla) y la cara
function cabeza({ ojos = 'punto', boca = 'w', rubor = true } = {}, id = 'n') {
  let s = `<defs><clipPath id="${id}c"><path d="${CAB}"/></clipPath></defs>`;
  s += `<g clip-path="url(#${id}c)">`;
  s += `<path d="M-20 -64 L-130 -140 L-130 -18 L-104 -22 Z" fill="${NAR}"/>`;                       // la oreja naranja entera
  s += `<path d="M-66 -92 C-58 -82 -48 -74 -38 -68 C-52 -62 -66 -56 -80 -52 C-78 -66 -73 -80 -66 -92 Z" fill="${NAR_IN}"/>`;
  s += `<path d="M66 -92 C58 -82 48 -74 38 -68 C52 -62 66 -56 80 -52 C78 -66 73 -80 66 -92 Z" fill="${MELOC}"/>`;
  s += '</g>';
  if (rubor) for (const x of [-MOF[0], MOF[0]]) s += elipse(x, MOF[1], 17, 10.5, RUBOR);
  s += OJOS[ojos]() + BOCAS[boca]();
  return s;
}
// Nyan entero: cuerpo de tubo y patitas que salen de la cabeza sin corte
export function nyan(o = {}, id = 'n') {
  const { brazos = [], cuerpo = true, cab = {}, rotCab = 0 } = o;
  const piezas = [{ d: CAB }];
  if (cuerpo) piezas.unshift({ d: 'M-30 92 C-33 118 -36 146 -34 168 Q0 178 34 168 C36 146 33 118 30 92 Z' });
  let s = '';
  if (cuerpo) s += tubo('M-17 164 L-18 200', 20) + tubo('M17 164 L18 200', 20);                       // patitas (detrás)
  s += `<g transform="rotate(${rotCab} 0 100)">` + silueta(piezas) + cabeza(cab, id) + '</g>';
  for (const b of brazos) s += tubo(b, 18);
  return s;
}

// ─────────────── adornos ───────────────
export const chispa = (x, y, r, c = '#f6c343') => `<path d="M${x} ${y - r} Q${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y} Q${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r} Q${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y} Q${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r} Z" fill="${c}"/>`;
export const gota = (x, y, r = 10) => `<path d="M${x} ${y - r * 1.5} Q${x + r} ${y} ${x} ${y + r * 0.8} Q${x - r} ${y} ${x} ${y - r * 1.5} Z" fill="#cfeaf8" stroke="#5b9ccc" stroke-width="3.5" stroke-linejoin="round"/>`;
export const letra = (t, x, y, tam, c, rot = 0) => `<text x="${x}" y="${y}" font-family="Zen Maru Gothic, sans-serif" font-weight="900" font-size="${tam}" fill="${c}" transform="rotate(${rot} ${x} ${y})">${t}</text>`;

export function guardar(dir, nombre, svg, tam = 320) {
  mkdirSync(dir, { recursive: true });
  const f = `${dir}/${nombre}.svg`; writeFileSync(f, svg);
  execFileSync('rsvg-convert', ['-w', String(tam), '-h', String(tam), '-o', `${dir}/${nombre}.png`, f]);
}
export const lienzo = (cuerpo, vb = 320) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vb} ${vb}" width="${vb}" height="${vb}">${cuerpo}</svg>`;
