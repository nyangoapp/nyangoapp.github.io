// Dibujos 2D de las clases nuevas (manga, habitación de «la frase cobra vida», fichas del minijuego). Estilo pegatina
// de la app: línea de tinta (--linea) y rellenos pastel; Nyan con la piel de mascota.js (oreja de la izquierda naranja,
// cola blanca con la punta naranja, sin nariz). Todo es SVG en texto: pesa poco y va igual de bien en el móvil.
// Cada figura tiene el origen abajo en el centro (lo que toca el suelo) y crece hacia −y; MED dice su ancho y alto.

const L = '#221817', TI = '#1b1310';
export const C = {
  piel: '#fffaf2', nar: '#e58936', narDentro: '#f3b27c', crema: '#f6dcb4', rosa: '#ef9aa0', papel: '#fffdf7',
  madera: '#dba36c', maderaOsc: '#b97d49', carton: '#e8bb88', cartonOsc: '#b98552', cielo: '#bcd4ec', cieloOsc: '#8fb3d9',
  menta: '#c6e2c1', mentaOsc: '#8fbf86', mante: '#efdb9c', lav: '#dccbeb', pRosa: '#f4c3c6', pNar: '#f7b27c', gris: '#cdc6d8', grisOsc: '#9a90ad', shiba: '#eab27d',
};
const T = (w = 3) => `stroke="${L}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
// silueta de pegatina: las formas en tinta y más gruesas, y encima las mismas rellenas (así una unión de círculos tiene UN contorno)
const pegatina = (formas, relleno, w = 6) => `<g fill="${L}" stroke="${L}" stroke-width="${w}" stroke-linejoin="round">${formas}</g><g fill="${relleno}">${formas}</g>`;

// ── Nyan (la cabeza es la de la marca: web/img/marca/nyango/generar.mjs, caja de 256) ──
const CABEZA = 'M46 94 C72 84 184 84 210 94 C230 102 238 146 236 176 C233 214 190 230 128 230 C66 230 23 214 20 176 C18 146 26 102 46 94 Z';
const OREJA_I = 'M24 150 C26 108 40 64 58 36 C62 29 70 28 75 33 C95 54 112 74 128 98 Z';
const OREJA_D = 'M232 150 C230 108 216 64 198 36 C194 29 186 28 181 33 C161 54 144 74 128 98 Z';
const DENTRO_I = 'M44 118 C47 94 55 70 64 56 C78 71 92 86 104 102 C86 106 62 111 44 118 Z';
const DENTRO_D = 'M212 118 C209 94 201 70 192 56 C178 71 164 86 152 102 C170 106 194 111 212 118 Z';
// 30-09 · estilo B: Nyan es un dibujo pintado (web/img/tinta/fig/nyan-<cara>[-arriba][-onigiri].webp, de
// web/img/fuente/figuras-tinta.mjs). cara: normal · feliz · sorpresa · sueno · pensando · triste · enfado.
// brazo: 'arriba' (saluda o señala); onigiri: con su onigiri en la pata (solo con cara normal o feliz).
export function nyan({ cara = 'normal', brazo = null, onigiri = false } = {}) {
  const id = `nyan-${cara}${brazo === 'arriba' ? '-arriba' : ''}${onigiri && (cara === 'normal' || cara === 'feliz') ? '-onigiri' : ''}`;
  return `<g class="nyan">${pintada(MED.nyan, id)}</g>`;
}
export const ARTE = {
  nyan: () => nyan(),
  gato: () => `<path d="M15 -8 C32 -8 36 -26 28 -38" fill="none" stroke="${L}" stroke-width="10" stroke-linecap="round"/>
    <path d="M15 -8 C32 -8 36 -26 28 -38" fill="none" stroke="${C.gris}" stroke-width="4.5" stroke-linecap="round"/>
    <ellipse cx="0" cy="-17" rx="20" ry="17" fill="${C.gris}" ${T()}/>
    <ellipse cx="-8" cy="-2" rx="6" ry="3.5" fill="${C.gris}" ${T(2.5)}/><ellipse cx="8" cy="-2" rx="6" ry="3.5" fill="${C.gris}" ${T(2.5)}/>
    ${pegatina(`<path d="M-21 -50 L-17 -75 L-3 -61 Z"/><path d="M21 -50 L17 -75 L3 -61 Z"/><ellipse cx="0" cy="-47" rx="24" ry="19"/>`, C.gris)}
    <path d="M-6 -64 L-5 -57 M0 -65 L0 -57 M6 -64 L5 -57" stroke="${C.grisOsc}" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="-9" cy="-47" rx="2.8" ry="3.8" fill="${TI}"/><ellipse cx="9" cy="-47" rx="2.8" ry="3.8" fill="${TI}"/>
    <ellipse cx="-15" cy="-40" rx="4.5" ry="2.6" fill="${C.rosa}"/><ellipse cx="15" cy="-40" rx="4.5" ry="2.6" fill="${C.rosa}"/>
    <path d="M-4 -39 Q-2 -36 0 -39 Q2 -36 4 -39" fill="none" stroke="${TI}" stroke-width="2" stroke-linecap="round"/>`,
  perro: () => `<path d="M14 -22 C30 -24 34 -40 22 -42 C13 -43 13 -33 19 -31" fill="none" stroke="${L}" stroke-width="10" stroke-linecap="round"/>
    <path d="M14 -22 C30 -24 34 -40 22 -42 C13 -43 13 -33 19 -31" fill="none" stroke="${C.shiba}" stroke-width="4.5" stroke-linecap="round"/>
    <ellipse cx="0" cy="-17" rx="21" ry="17" fill="${C.shiba}" ${T()}/><ellipse cx="0" cy="-12" rx="11" ry="9.5" fill="${C.papel}"/>
    <ellipse cx="-8" cy="-2" rx="6" ry="3.5" fill="${C.papel}" ${T(2.5)}/><ellipse cx="8" cy="-2" rx="6" ry="3.5" fill="${C.papel}" ${T(2.5)}/>
    ${pegatina(`<path d="M-21 -52 L-17 -76 L-3 -62 Z"/><path d="M21 -52 L17 -76 L3 -62 Z"/><ellipse cx="0" cy="-48" rx="24" ry="19"/>`, C.shiba)}
    <path d="M-16 -56 L-15 -69 L-8 -61 Z M16 -56 L15 -69 L8 -61 Z" fill="${C.pRosa}"/>
    <ellipse cx="0" cy="-40" rx="13" ry="9" fill="${C.papel}"/>
    <ellipse cx="-10" cy="-58" rx="3" ry="2" fill="${C.papel}"/><ellipse cx="10" cy="-58" rx="3" ry="2" fill="${C.papel}"/>
    <circle cx="-10" cy="-50" r="2.9" fill="${TI}"/><circle cx="10" cy="-50" r="2.9" fill="${TI}"/>
    <ellipse cx="0" cy="-44" rx="3.6" ry="2.6" fill="${TI}"/><path d="M-4 -38 Q0 -35 4 -38" fill="none" stroke="${TI}" stroke-width="2" stroke-linecap="round"/>`,
  libro: () => `<rect x="-27" y="-6" width="54" height="6" rx="2" fill="${C.cielo}" ${T()}/>
    <rect x="-24" y="-13" width="50" height="7" fill="${C.papel}" ${T(2.5)}/><path d="M-20 -9.5 H22" stroke="${C.grisOsc}" stroke-width="1.5"/>
    <rect x="-28" y="-18" width="56" height="6" rx="2" fill="${C.cielo}" ${T()}/><rect x="-31" y="-18" width="8" height="18" rx="3" fill="${C.cieloOsc}" ${T()}/>`,
  manzana: () => `<path d="M0 -30 C-10 -37 -23 -31 -21 -16 C-19 -4 -8 1 0 -3 C8 1 19 -4 21 -16 C23 -31 10 -37 0 -30 Z" fill="#ee8a80" ${T()}/>
    <ellipse cx="-10" cy="-21" rx="3.5" ry="5.5" fill="#fff" opacity=".7"/>
    <path d="M0 -30 L2 -39" stroke="${L}" stroke-width="3" stroke-linecap="round"/>
    <path d="M2 -35 C8 -43 17 -41 17 -37 C11 -32 5 -33 2 -35 Z" fill="${C.menta}" ${T(2.5)}/>`,
  onigiri: () => `<path d="M0 -34 C6 -34 22 -9 20 -4 C18 0 -18 0 -20 -4 C-22 -9 -6 -34 0 -34 Z" fill="#fff" ${T()}/>
    <path d="M-10 -1.5 V-13 H10 V-1.5 Z" fill="#2e3b33"/>`,
  // la caja en dos piezas: lo de dentro va entre el fondo y el frente
  cajaFondo: () => `<path d="M-43 -54 L-37 -62 L37 -62 L43 -54 Z" fill="${C.cartonOsc}" ${T()}/>`,
  cajaFrente: () => `<path d="M-46 -54 L-66 -68 L-50 -76 L-34 -58 Z" fill="${C.carton}" ${T()}/><path d="M46 -54 L66 -68 L50 -76 L34 -58 Z" fill="${C.carton}" ${T()}/>
    <rect x="-46" y="-54" width="92" height="54" rx="3" fill="${C.carton}" ${T()}/>
    <rect x="-8" y="-54" width="16" height="18" fill="#f5dcb8" stroke="${L}" stroke-width="2"/>
    <path d="M-30 -18 l6 6 l10 -12" fill="none" stroke="${C.cartonOsc}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
  mesa: () => `<rect x="-54" y="-57" width="9" height="57" fill="${C.maderaOsc}" ${T()}/><rect x="45" y="-57" width="9" height="57" fill="${C.maderaOsc}" ${T()}/>
    <rect x="10" y="-57" width="40" height="22" fill="${C.madera}" ${T()}/><circle cx="30" cy="-46" r="2.6" fill="${L}"/>
    <rect x="-61" y="-67" width="122" height="11" rx="4" fill="${C.madera}" ${T()}/>`,
  cama: () => `<rect x="-66" y="-12" width="8" height="12" fill="${C.maderaOsc}" ${T()}/><rect x="58" y="-12" width="8" height="12" fill="${C.maderaOsc}" ${T()}/>
    <rect x="-75" y="-72" width="17" height="62" rx="7" fill="${C.madera}" ${T()}/>
    <rect x="-70" y="-26" width="140" height="17" rx="5" fill="${C.madera}" ${T()}/>
    <rect x="-60" y="-41" width="128" height="17" rx="7" fill="${C.papel}" ${T()}/>
    <ellipse cx="-42" cy="-45" rx="17" ry="8" fill="${C.cielo}" ${T()}/>
    <path d="M-20 -46 Q22 -53 68 -46 L69 -25 L-20 -25 Z" fill="${C.pRosa}" ${T()}/>
    <g fill="#fff" opacity=".8"><circle cx="0" cy="-38" r="2.5"/><circle cx="20" cy="-32" r="2.5"/><circle cx="40" cy="-40" r="2.5"/><circle cx="56" cy="-31" r="2.5"/></g>`,

  // ── más cosas para las clases ──
  taza: () => `<path d="M16 -24 Q30 -24 30 -15 Q30 -6 16 -8" fill="none" stroke="${L}" stroke-width="4"/>
    <path d="M-18 -32 L18 -32 L14 -4 Q0 2 -14 -4 Z" fill="${C.menta}" ${T()}/><ellipse cx="0" cy="-32" rx="18" ry="4" fill="#b7d9a8" ${T(2.5)}/>
    <path d="M-6 -40 q-4 -6 0 -12 M4 -40 q-4 -6 0 -12" fill="none" stroke="${C.grisOsc}" stroke-width="2" stroke-linecap="round"/>`,
  plato: () => `<ellipse cx="0" cy="-5" rx="30" ry="7" fill="#fff" ${T()}/><ellipse cx="0" cy="-6" rx="18" ry="3.5" fill="none" stroke="${C.gris}" stroke-width="2"/>`,
  cuenco: () => `<path d="M-26 -22 Q-24 0 0 0 Q24 0 26 -22 Z" fill="${C.pRosa}" ${T()}/>
    <path d="M-24 -22 Q-12 -32 0 -26 Q12 -34 24 -22 Z" fill="#fff" ${T(2.5)}/><path d="M6 -40 L-2 -20 M14 -38 L4 -20" stroke="${C.maderaOsc}" stroke-width="3" stroke-linecap="round"/>`,
  regalo: () => `<rect x="-24" y="-38" width="48" height="38" rx="3" fill="${C.pRosa}" ${T()}/><rect x="-27" y="-44" width="54" height="10" rx="3" fill="${C.pRosa}" ${T()}/>
    <path d="M0 -44 V0" stroke="${C.mante}" stroke-width="7"/><path d="M0 -44 V0" stroke="${L}" stroke-width="1.5" opacity=".25"/>
    <path d="M0 -44 C-14 -58 -24 -46 -8 -44 M0 -44 C14 -58 24 -46 8 -44" fill="${C.mante}" ${T(2.5)}/>`,
  casa: () => `<rect x="-40" y="-52" width="80" height="52" fill="${C.papel}" ${T()}/><path d="M-50 -50 L0 -86 L50 -50 Z" fill="#e58f6b" ${T()}/>
    <rect x="-10" y="-30" width="20" height="30" rx="2" fill="${C.madera}" ${T()}/><rect x="-32" y="-40" width="16" height="14" fill="${C.cielo}" ${T(2.5)}/><rect x="16" y="-40" width="16" height="14" fill="${C.cielo}" ${T(2.5)}/>`,
  escuela: () => `<rect x="-62" y="-70" width="124" height="70" fill="${C.papel}" ${T()}/><rect x="-16" y="-94" width="32" height="26" fill="${C.papel}" ${T()}/>
    <circle cx="0" cy="-82" r="8" fill="#fff" ${T(2)}/><path d="M0 -82 V-87 M0 -82 H4" stroke="${L}" stroke-width="1.8"/>
    ${[-48, -28, 16, 36].map((x) => `<rect x="${x}" y="-56" width="14" height="12" fill="${C.cielo}" stroke="${L}" stroke-width="2"/><rect x="${x}" y="-34" width="14" height="12" fill="${C.cielo}" stroke="${L}" stroke-width="2"/>`).join('')}
    <rect x="-9" y="-26" width="18" height="26" fill="${C.madera}" ${T(2.5)}/>`,
  reloj: () => `<rect x="-4" y="-8" width="8" height="8" fill="${C.maderaOsc}" ${T(2)}/><circle cx="0" cy="-30" r="22" fill="#fff" ${T()}/>
    <path d="M0 -30 V-44 M0 -30 L10 -24" stroke="${L}" stroke-width="3" stroke-linecap="round"/><circle cx="0" cy="-30" r="2.5" fill="${L}"/>`,
  silla: () => `<rect x="-18" y="-70" width="6" height="70" fill="${C.maderaOsc}" ${T(2.5)}/><rect x="12" y="-36" width="6" height="36" fill="${C.maderaOsc}" ${T(2.5)}/>
    <rect x="-20" y="-40" width="40" height="8" rx="2" fill="${C.madera}" ${T(2.5)}/><rect x="-20" y="-72" width="12" height="30" rx="3" fill="${C.madera}" ${T(2.5)}/>`,
  bolsa: () => `<path d="M-12 -34 Q-12 -48 0 -48 Q12 -48 12 -34" fill="none" stroke="${L}" stroke-width="3.5"/>
    <path d="M-24 -34 H24 L20 0 H-20 Z" fill="${C.lav}" ${T()}/><path d="M-10 -20 H10" stroke="${L}" stroke-width="2.5" stroke-linecap="round"/>`,
  telefono: () => `<rect x="-14" y="-50" width="28" height="50" rx="6" fill="${C.cieloOsc}" ${T()}/><rect x="-10" y="-44" width="20" height="32" rx="2" fill="#fff" ${T(2)}/><circle cx="0" cy="-6" r="2.5" fill="${L}"/>`,
  tren: () => `<rect x="-60" y="-50" width="120" height="40" rx="10" fill="${C.menta}" ${T()}/><rect x="-60" y="-24" width="120" height="6" fill="#8fbf86"/>
    ${[-46, -20, 6, 32].map((x) => `<rect x="${x}" y="-44" width="18" height="14" rx="2" fill="${C.cielo}" stroke="${L}" stroke-width="2"/>`).join('')}
    <circle cx="-38" cy="-8" r="8" fill="${L}"/><circle cx="38" cy="-8" r="8" fill="${L}"/><path d="M-66 0 H66" stroke="${L}" stroke-width="3"/>`,
  bici: () => `<circle cx="-24" cy="-16" r="15" fill="none" stroke="${L}" stroke-width="3.5"/><circle cx="24" cy="-16" r="15" fill="none" stroke="${L}" stroke-width="3.5"/>
    <path d="M-24 -16 L-6 -40 L16 -40 L24 -16 M-6 -40 L2 -16 L16 -40 M-10 -48 H0 M16 -40 L12 -52 H22" fill="none" stroke="${C.nar}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>`,
  sol: () => `<g stroke="${C.nar}" stroke-width="4" stroke-linecap="round">${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<path d="M0 -40 v-10" transform="rotate(${a} 0 -40)"/>`).join('')}</g>
    <circle cx="0" cy="-40" r="18" fill="${C.mante}" ${T()}/>`,
  nube: () => `${pegatina('<circle cx="-18" cy="-30" r="14"/><circle cx="4" cy="-38" r="18"/><circle cx="24" cy="-28" r="13"/><rect x="-30" y="-30" width="64" height="16" rx="8"/>', '#fff', 5)}
    <g stroke="${C.cieloOsc}" stroke-width="3" stroke-linecap="round"><path d="M-16 -4 l-3 8 M0 -2 l-3 8 M16 -4 l-3 8"/></g>`,
  luna: () => `<path d="M8 -64 A30 30 0 1 0 22 -12 A24 24 0 1 1 8 -64 Z" fill="${C.mante}" ${T()}/>`,
  pizarra: () => `<rect x="-70" y="-90" width="140" height="80" rx="4" fill="#4d6b58" stroke="${C.maderaOsc}" stroke-width="7"/><rect x="-70" y="-90" width="140" height="80" rx="4" fill="none" ${T(2)}/>
    <path d="M-70 -10 H70" stroke="${C.maderaOsc}" stroke-width="5"/><path d="M-50 -64 q10 -8 20 0 t20 0 M-50 -40 h50" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".85"/>`,
  lapiz: () => `<g transform="rotate(-35)"><rect x="-4" y="-50" width="8" height="40" fill="${C.mante}" ${T(2.5)}/><path d="M-4 -10 L0 0 L4 -10 Z" fill="${C.crema}" ${T(2)}/><rect x="-4" y="-56" width="8" height="7" fill="${C.pRosa}" ${T(2)}/></g>`,
  carta: () => `<rect x="-26" y="-36" width="52" height="34" rx="3" fill="#fff" ${T()}/><path d="M-26 -36 L0 -18 L26 -36" fill="none" stroke="${L}" stroke-width="2.5" stroke-linejoin="round"/><circle cx="0" cy="-18" r="4" fill="#e8574a"/>`,
  zapato: () => `<path d="M-26 -4 L-24 -20 Q-20 -28 -10 -24 L4 -14 Q20 -14 26 -8 L26 -2 Q0 2 -26 -2 Z" fill="${C.nar}" ${T()}/><path d="M-26 -2 H26" stroke="#fff" stroke-width="3"/>`,
  vaso: () => `<path d="M-14 -40 L14 -40 L10 0 L-10 0 Z" fill="#e8f3fb" ${T()}/><path d="M-12 -24 L12 -24 L10 0 L-10 0 Z" fill="${C.cielo}"/><path d="M-14 -40 L14 -40 L10 0 L-10 0 Z" fill="none" ${T()}/>`,
  pan: () => `<path d="M-26 -8 Q-28 -34 0 -34 Q28 -34 26 -8 Q0 -2 -26 -8 Z" fill="#e7b97a" ${T()}/><path d="M-12 -26 l6 8 M0 -28 l6 8 M12 -26 l6 8" stroke="#b98552" stroke-width="2.5" stroke-linecap="round"/>`,
  sushi: () => `<ellipse cx="0" cy="-10" rx="22" ry="9" fill="#fff" ${T()}/><path d="M-22 -14 Q0 -30 22 -14 Q0 -22 -22 -14 Z" fill="#f28a6b" ${T(2.5)}/><path d="M-6 -20 l4 6 M4 -21 l4 6" stroke="#fff" stroke-width="2"/>`,
  persona: () => `<rect x="-11" y="-24" width="22" height="24" rx="3" fill="#6d7fa8" ${T()}/>
    <path d="M-20 -22 L-17 -50 Q0 -56 17 -50 L20 -22 Z" fill="${C.pNar}" ${T()}/>
    <circle cx="0" cy="-66" r="15" fill="#f6d6bd" ${T()}/><path d="M-15 -68 Q-16 -84 0 -84 Q16 -84 15 -68 Q10 -76 0 -74 Q-8 -78 -15 -68 Z" fill="#3a2a23" ${T(2.5)}/>
    <circle cx="-5" cy="-66" r="2" fill="${L}"/><circle cx="5" cy="-66" r="2" fill="${L}"/><path d="M-3 -60 Q0 -57 3 -60" fill="none" stroke="${L}" stroke-width="2" stroke-linecap="round"/>
    <ellipse cx="-9" cy="-61" rx="3" ry="1.8" fill="${C.rosa}"/><ellipse cx="9" cy="-61" rx="3" ry="1.8" fill="${C.rosa}"/>`,
  arbol: () => ARTE.ki(),
  flor: () => ARTE.hana(),
  pez: () => ARTE.sakana(),
  pajaro: () => ARTE.tori(),
  coche: () => ARTE.kuruma(),
  tele: () => ARTE.terebi(),
  dinero: () => ARTE.okane(),
  paraguas: () => ARTE.kasa(),
  bicho: () => ARTE.mushi(),
  profesor: () => ARTE.sensei(),

  // ── fichas del minijuego ──
  sensei: () => `<rect x="-12" y="-24" width="24" height="24" rx="3" fill="#7d8fb6" ${T()}/>
    <path d="M-21 -22 L-18 -52 Q0 -58 18 -52 L21 -22 Z" fill="${C.cielo}" ${T()}/><path d="M0 -52 L-3.5 -44 L0 -33 L3.5 -44 Z" fill="${C.rosa}" ${T(2)}/>
    <path d="M18 -44 L38 -76" stroke="${C.maderaOsc}" stroke-width="3.5" stroke-linecap="round"/>
    <circle cx="0" cy="-68" r="15" fill="#f6d6bd" ${T()}/>
    <path d="M-15 -70 Q-14 -86 0 -85 Q14 -86 15 -70 Q8 -78 0 -76 Q-8 -78 -15 -70 Z" fill="#4a3528" ${T(2.5)}/>
    <g fill="none" stroke="${L}" stroke-width="2"><circle cx="-6" cy="-67" r="4.5"/><circle cx="6" cy="-67" r="4.5"/><path d="M-1.5 -67 H1.5"/></g>
    <path d="M-3 -60 Q0 -58 3 -60" fill="none" stroke="${L}" stroke-width="2" stroke-linecap="round"/>`,
  ki: () => `<rect x="-7" y="-36" width="14" height="36" rx="3" fill="${C.maderaOsc}" ${T()}/>
    ${pegatina('<circle cx="-18" cy="-50" r="18"/><circle cx="18" cy="-50" r="18"/><circle cx="0" cy="-68" r="22"/>', C.menta)}
    <g fill="${C.mentaOsc}"><circle cx="-10" cy="-60" r="3"/><circle cx="12" cy="-48" r="3"/><circle cx="4" cy="-74" r="3"/></g>`,
  sakana: () => `<path d="M22 -24 L38 -36 L38 -12 Z" fill="${C.cielo}" ${T()}/>
    <path d="M-28 -24 C-18 -42 14 -42 24 -24 C14 -6 -18 -6 -28 -24 Z" fill="${C.cielo}" ${T()}/>
    <path d="M-4 -36 Q4 -46 12 -36" fill="${C.cieloOsc}" ${T(2.5)}/><circle cx="-17" cy="-26" r="3" fill="${TI}"/>
    <path d="M-4 -24 Q2 -18 -4 -12" fill="none" stroke="${L}" stroke-width="2"/>
    <g fill="none" stroke="${C.cieloOsc}" stroke-width="2"><circle cx="-34" cy="-44" r="3.5"/><circle cx="-40" cy="-54" r="2.5"/></g>`,
  kuruma: () => `<path d="M-38 -12 L-38 -27 Q-36 -31 -28 -31 L-19 -31 L-10 -45 L16 -45 L26 -31 L35 -31 Q40 -29 40 -22 L40 -12 Z" fill="${C.pNar}" ${T()}/>
    <path d="M-8 -41 L-2 -41 L-2 -31 L-14 -31 Z M2 -41 L14 -41 L21 -31 L2 -31 Z" fill="${C.cielo}" ${T(2.5)}/>
    <circle cx="-22" cy="-10" r="9" fill="${L}"/><circle cx="22" cy="-10" r="9" fill="${L}"/>
    <circle cx="-22" cy="-10" r="3.5" fill="#ddd"/><circle cx="22" cy="-10" r="3.5" fill="#ddd"/><rect x="34" y="-26" width="6" height="5" rx="2" fill="${C.mante}"/>`,
  tori: () => `<path d="M-5 -2 V-8 M5 -2 V-8" stroke="${C.nar}" stroke-width="3" stroke-linecap="round"/>
    <path d="M-2 -46 Q0 -54 6 -50" fill="none" stroke="${L}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="0" cy="-26" r="20" fill="${C.mante}" ${T()}/>
    <path d="M-2 -26 Q10 -36 16 -22 Q8 -16 -2 -26 Z" fill="#e9c46f" ${T(2.5)}/>
    <path d="M-19 -30 L-30 -26 L-19 -22 Z" fill="${C.nar}" ${T(2.5)}/><circle cx="-9" cy="-32" r="2.8" fill="${TI}"/>
    <ellipse cx="-12" cy="-23" rx="3.5" ry="2" fill="${C.rosa}"/>`,
  hana: () => `<path d="M0 -26 V-50" stroke="#6fa86a" stroke-width="4" stroke-linecap="round"/><path d="M0 -36 Q12 -44 14 -36 Q8 -30 0 -36 Z" fill="${C.menta}" ${T(2)}/>
    ${pegatina('<circle cx="0" cy="-66" r="7.5"/><circle cx="10" cy="-58" r="7.5"/><circle cx="6" cy="-47" r="7.5"/><circle cx="-6" cy="-47" r="7.5"/><circle cx="-10" cy="-58" r="7.5"/>', C.pRosa, 5)}
    <circle cx="0" cy="-56" r="5.5" fill="${C.mante}" ${T(2)}/>
    <path d="M-15 -22 L15 -22 L11 0 L-11 0 Z" fill="#dd8d66" ${T()}/><rect x="-18" y="-27" width="36" height="6" rx="2" fill="#dd8d66" ${T()}/>`,
  mushi: () => `<g stroke="${L}" stroke-width="2.5" stroke-linecap="round"><path d="M-14 -2 l-4 4 M0 -2 v5 M14 -2 l4 4"/><path d="M-28 -16 q-6 -8 -12 -8 M-26 -14 q-2 -10 -8 -14" fill="none"/></g>
    <circle cx="-24" cy="-9" r="8" fill="${L}"/>
    <path d="M-22 -4 A22 22 0 0 1 22 -4 Z" fill="#e8574a" ${T()}/><path d="M0 -26 V-4" stroke="${L}" stroke-width="2.5"/>
    <g fill="${L}"><circle cx="-10" cy="-14" r="3.5"/><circle cx="10" cy="-16" r="3.5"/><circle cx="-4" cy="-8" r="2.5"/><circle cx="12" cy="-8" r="2.5"/></g>
    <circle cx="-26" cy="-11" r="1.8" fill="#fff"/>`,
  kasa: () => `<path d="M0 -40 V-6 Q0 3 -7 3 Q-12 3 -12 -3" fill="none" stroke="${L}" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M0 -78 V-86" stroke="${L}" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M-36 -40 Q-36 -78 0 -78 Q36 -78 36 -40 Q27 -47 18 -40 Q9 -47 0 -40 Q-9 -47 -18 -40 Q-27 -47 -36 -40 Z" fill="${C.lav}" ${T()}/>
    <path d="M0 -78 Q-10 -60 -18 -40 M0 -78 Q10 -60 18 -40" fill="none" stroke="${L}" stroke-width="2"/>`,
  okane: () => {
    const moneda = (x, y) => `<path d="M${x - 17} ${y} v6 a17 6 0 0 0 34 0 v-6" fill="#e0a93a" ${T(2.5)}/><ellipse cx="${x}" cy="${y}" rx="17" ry="6" fill="#f5cc5a" ${T(2.5)}/>`;
    return `<rect x="-6" y="-40" width="40" height="22" rx="3" transform="rotate(-12 14 -29)" fill="${C.menta}" ${T(2.5)}/>
      ${moneda(-10, -8)}${moneda(-10, -16)}${moneda(-10, -24)}${moneda(-10, -32)}${moneda(20, -8)}${moneda(20, -16)}
      <text x="-10" y="-29" text-anchor="middle" font-size="9" font-weight="800" fill="#8a5a12" font-family="sans-serif">円</text>`;
  },
  terebi: () => `<path d="M-10 -58 L-20 -78 M8 -58 L20 -80" stroke="${L}" stroke-width="3" stroke-linecap="round"/><circle cx="-20" cy="-79" r="3.5" fill="${C.pNar}" ${T(2)}/><circle cx="20" cy="-81" r="3.5" fill="${C.pNar}" ${T(2)}/>
    <path d="M-24 -8 L-28 0 M24 -8 L28 0" stroke="${L}" stroke-width="3.5" stroke-linecap="round"/>
    <rect x="-37" y="-60" width="74" height="53" rx="10" fill="${C.mante}" ${T()}/><rect x="-29" y="-53" width="48" height="39" rx="7" fill="${C.cielo}" ${T()}/>
    <path d="M-22 -46 q6 -3 10 0" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="28" cy="-46" r="3.2" fill="${L}"/><circle cx="28" cy="-34" r="3.2" fill="${L}"/>`,
};
// ancho y alto de cada figura (a escala 1); sup: altura de la superficie donde se pone algo; dentro: el fondo de la caja
export const MED = {
  nyan: { w: 80, h: 96 }, gato: { w: 52, h: 76 }, perro: { w: 54, h: 76 }, libro: { w: 60, h: 18 }, manzana: { w: 44, h: 39 }, onigiri: { w: 44, h: 34 },
  caja: { w: 92, h: 62, dentro: -24 }, mesa: { w: 122, h: 67, sup: -67 }, cama: { w: 150, h: 72, sup: -47, dx: 24 },
  sensei: { w: 60, h: 86 }, ki: { w: 76, h: 92 }, sakana: { w: 76, h: 46 }, kuruma: { w: 80, h: 46 }, tori: { w: 50, h: 54 },
  hana: { w: 36, h: 75 }, mushi: { w: 56, h: 30 }, kasa: { w: 72, h: 86 }, okane: { w: 64, h: 44 }, terebi: { w: 76, h: 82 },
  taza: { w: 48, h: 40, sup: -34 }, plato: { w: 60, h: 12, sup: -8 }, cuenco: { w: 52, h: 40 }, regalo: { w: 54, h: 58, sup: -44 }, casa: { w: 100, h: 86 },
  escuela: { w: 124, h: 94 }, reloj: { w: 44, h: 52 }, silla: { w: 40, h: 72, sup: -40 }, bolsa: { w: 48, h: 48 }, telefono: { w: 28, h: 50 },
  tren: { w: 132, h: 52 }, bici: { w: 78, h: 52 }, sol: { w: 70, h: 90 }, nube: { w: 70, h: 56 }, luna: { w: 56, h: 64 }, pizarra: { w: 148, h: 94 },
  lapiz: { w: 36, h: 50 }, carta: { w: 52, h: 36 }, zapato: { w: 52, h: 28 }, vaso: { w: 28, h: 40 }, pan: { w: 54, h: 34 }, sushi: { w: 44, h: 26 },
  persona: { w: 40, h: 86 }, arbol: { w: 76, h: 92 }, flor: { w: 36, h: 75 }, pez: { w: 76, h: 46 }, pajaro: { w: 50, h: 54 }, coche: { w: 80, h: 46 },
  tele: { w: 76, h: 82 }, dinero: { w: 64, h: 44 }, paraguas: { w: 72, h: 86 }, bicho: { w: 56, h: 30 }, profesor: { w: 60, h: 86 },
  maneki: { w: 58, h: 80 }, mikan: { w: 40, h: 34 }, dango: { w: 30, h: 70 },
  chochin: { w: 40, h: 70 }, kingyo: { w: 50, h: 46 }, taiko: { w: 62, h: 60 }, uchiwa: { w: 44, h: 60 }, daruma: { w: 44, h: 50 }, furin: { w: 30, h: 56 }, senbei: { w: 48, h: 22 },
  maleta: { w: 44, h: 64 }, yukidaruma: { w: 50, h: 76 }, jagaimo: { w: 56, h: 36 }, bufanda: { w: 44, h: 46 }, mapa: { w: 60, h: 44 },
  linterna: { w: 34, h: 44 }, tomare: { w: 44, h: 92 }, ema: { w: 44, h: 32 },
  hagaki: { w: 34, h: 48 }, keki: { w: 56, h: 36 }, soba: { w: 54, h: 34 }, otoshidama: { w: 30, h: 44 }, sori: { w: 70, h: 30 },
  kusuri: { w: 42, h: 40 }, kagamimochi: { w: 48, h: 46 },
};
// los fondos de las escenas (400 × 260): desde el rediseño del 30-09, fotos reales de Japón (herramientas/escenas: los
// escenarios de las historias, sin nadie, recortados por herramientas/escenas/recortes.py)
export const FONDOS = Object.fromEntries(['cuarto', 'calle', 'escuela', 'parque', 'cocina', 'tienda', 'noche', 'washitsu',
  // temporada 3 (30-09), el viaje a Hokkaido: la casa de la abuela, el prado del Yōtei, el camino, la granja, el bosque, la nieve…
  'salon', 'prado', 'camino', 'kitahama', 'granja', 'bosque', 'nieve', 'pueblo', 'santuario',
  // temporada 4 (30-09), el invierno en casa: la sala grande, el cuarto del jardín, el torii de noche, el santuario nevado…
  'sala', 'jardin', 'torii', 'hatsumode', 'ladera', 'dagashi'].map((id) => [id,
  () => `<image href="/img/escenarios/${id}.webp" x="0" y="0" width="400" height="260" preserveAspectRatio="xMidYMid slice"/>`]));

// el reparto en 3D (30-09): cada personaje con cada cara, recortado sobre transparente con la misma cámara
// (herramientas/escenas: RECORTES en escenas.js y recortes.py). El lienzo de 512 tiene el suelo en y = 474 y Nyan mide 410:
// aquí mide 96, como el Nyan dibujado, y los demás guardan su tamaño con él.
const REPARTO_3D = ['nyan', 'gato', 'perro', 'persona', 'profesor', 'sensei'];
const ESPECIE = { nyan: 'nyan', gato: 'tama', perro: 'kotaro', persona: 'pon', profesor: 'fukuro', sensei: 'fukuro' };
const RECORTES = new Set(['nyan-enfado', 'nyan-feliz', 'nyan-normal', 'nyan-pensando', 'nyan-sorpresa', 'nyan-sueno', 'nyan-triste',
  'nyan-enfado-arriba', 'nyan-feliz-arriba', 'nyan-normal-arriba', 'nyan-pensando-arriba', 'nyan-sorpresa-arriba', 'nyan-sueno-arriba',
  'tama-enfado', 'tama-feliz', 'tama-normal', 'tama-pensando', 'tama-sorpresa', 'tama-sueno', 'tama-normal-arriba',
  'fukuro-normal', 'fukuro-sorpresa', 'fukuro-enfado', 'pon-feliz', 'pon-triste', 'kotaro-feliz', 'kage-presumido', 'kage-aburrido', 'kage-decidido']);
// la cara «de siempre» de cada uno (con su carácter): Pon y Kotarō, contentos; Kage, sobrado
const DE_SIEMPRE = { nyan: 'normal', tama: 'normal', fukuro: 'normal', pon: 'feliz', kotaro: 'feliz', kage: 'presumido' };
export const esReparto = (que) => REPARTO_3D.includes(que) || que === 'kage';
// mira: 'd' (a la derecha) o 'i' (a la izquierda), para que en las viñetas se miren al hablar (30-09); sin ella, casi de frente
export function recorte(que, cara, arriba = false, mira = '') {
  const esp = ESPECIE[que] || que, c = cara && cara !== 'normal' ? cara : DE_SIEMPRE[esp];
  const base = [`${esp}-${c}${arriba ? '-arriba' : ''}`, `${esp}-${c}`, `${esp}-${DE_SIEMPRE[esp]}`].find((n) => RECORTES.has(n));
  const nombre = mira ? `${base}-${mira}` : base;
  const S = (96 * 512) / 410;
  return `<image href="/img/reparto/${nombre}.webp" x="${(-S / 2).toFixed(1)}" y="${((-S * 474) / 512).toFixed(1)}" width="${S.toFixed(1)}" height="${S.toFixed(1)}"/>`;
}

// 30-09 · estilo B: cada figura es su dibujo pintado, colocado con sus medidas: el lienzo de 256 del dibujo tiene
// el suelo en y = 236 y el lado mayor de la figura mide 220 (web/img/fuente/figuras-tinta.mjs).
function pintada(m, archivo) {
  const lado = Math.max(m.w, m.h), S = (lado * 256) / 220, y = (-lado * 236) / 220;
  return `<image href="/img/tinta/fig/${archivo}.webp" x="${(-S / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${S.toFixed(1)}" height="${S.toFixed(1)}"/>`;
}
const PINTADAS = ['gato', 'perro', 'persona', 'sensei', 'libro', 'manzana', 'onigiri', 'mesa', 'cama', 'taza', 'plato', 'cuenco', 'regalo', 'casa', 'escuela', 'reloj',
  'silla', 'bolsa', 'telefono', 'tren', 'bici', 'sol', 'nube', 'luna', 'pizarra', 'lapiz', 'carta', 'zapato', 'vaso', 'pan', 'sushi', 'ki', 'hana', 'sakana', 'tori',
  'kuruma', 'terebi', 'okane', 'kasa', 'mushi'];
const ALIAS = { arbol: 'ki', flor: 'hana', pez: 'sakana', pajaro: 'tori', coche: 'kuruma', tele: 'terebi', dinero: 'okane', paraguas: 'kasa', bicho: 'mushi', profesor: 'sensei' };
for (const id of PINTADAS) ARTE[id] = () => pintada(MED[id], id);
for (const [a, b] of Object.entries(ALIAS)) ARTE[a] = () => pintada(MED[a] || MED[b], b);
// 30-09 · los objetos, en el estilo LÍNEA de las pegatinas (web/img/fuente/linea/objetos.mjs), con la misma medida que los
// pintados en tinta (descartados): el suelo en y = 236 y el lado mayor 220 de 256
const LINEA = ['cama', 'pizarra', 'nube', 'vaso', 'tele', 'telefono', 'plato', 'lapiz', 'regalo', 'bici', 'sushi', 'pan', 'dinero', 'pez', 'zapato', 'reloj', 'casa', 'silla',
  'coche', 'bicho', 'pajaro', 'sol', 'arbol', 'bolsa', 'caja', 'flor', 'escuela', 'carta', 'manzana', 'luna', 'taza', 'paraguas', 'tren'];
const enLinea = (m, id) => { const lado = Math.max(m.w, m.h), S = (lado * 256) / 220, y = (-lado * 236) / 220;
  return `<image href="/img/objetos-linea/${id}.svg" x="${(-S / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${S.toFixed(1)}" height="${S.toFixed(1)}"/>`; };
for (const id of LINEA) if (MED[id] && id !== 'caja') ARTE[id] = () => enLinea(MED[id], id);
// 30-09 (noche) · TODOS los objetos de las clases, en 3D como el reparto:
// juguetes de vinilo de herramientas/escenas/objetos-clase.js (y los de la sala de Nyan), recortados a su caja de la viñeta
// por herramientas/escenas/recortes.py. La línea queda solo para lo que no tenga 3D.
const en3D = (id, archivo = id) => `<image href="/img/objetos3d/${archivo}.webp" x="${-MED[id].w / 2}" y="${-MED[id].h}" width="${MED[id].w}" height="${MED[id].h}"/>`;
export const OBJETOS_3D = ['onigiri', 'libro', 'cuenco', 'cama', 'mesa', 'silla', 'caja', 'reloj', 'telefono', 'carta', 'regalo', 'vaso', 'taza', 'plato', 'sushi',
  'pan', 'manzana', 'pez', 'sakana', 'pizarra', 'lapiz', 'escuela', 'casa', 'tren', 'bici', 'coche', 'kuruma', 'paraguas', 'kasa', 'arbol', 'ki', 'flor', 'hana',
  'pajaro', 'tori', 'bicho', 'mushi', 'nube', 'sol', 'luna', 'dinero', 'okane', 'bolsa', 'zapato', 'tele', 'terebi', 'maneki', 'mikan', 'dango', 'kingyo', 'taiko', 'daruma', 'senbei',
  'maleta', 'yukidaruma', 'jagaimo', 'bufanda', 'mapa', 'linterna', 'tomare', 'ema',
  'hagaki', 'keki', 'soba', 'otoshidama', 'sori', 'kusuri', 'kagamimochi'];
for (const id of OBJETOS_3D) if (MED[id]) ARTE[id] = () => en3D(id);
// la caja, en dos piezas con el mismo encuadre: lo de dentro va entre el fondo y el frente
ARTE.cajaFondo = () => en3D('caja', 'caja-fondo'); ARTE.cajaFrente = () => en3D('caja', 'caja-frente');
export const figura = (id) => (esReparto(id) ? recorte(id) : id === 'caja' ? ARTE.cajaFondo() + ARTE.cajaFrente() : (ARTE[id] || (() => ''))());

// ── lo que se le añade a una figura en la habitación ──
// «cobra vida»: ojos y patitas (la figura se levanta sobre ellas)
export function vida({ w, h }) {
  const ox = Math.min(w * 0.18, 12), oy = -Math.max(h * 0.55, 9), px = w * 0.22;
  return `<g class="vida"><g stroke="${L}" stroke-width="3" stroke-linecap="round"><path d="M${-px} 0 l-3 10 M${px} 0 l3 10"/></g>
    <ellipse cx="${-px - 4}" cy="11" rx="5" ry="2.8" fill="${L}"/><ellipse cx="${px + 4}" cy="11" rx="5" ry="2.8" fill="${L}"/>
    <g fill="#fff" stroke="${L}" stroke-width="2"><circle cx="${-ox}" cy="${oy}" r="5.5"/><circle cx="${ox}" cy="${oy}" r="5.5"/></g>
    <circle cx="${-ox + 1}" cy="${oy + 1}" r="2.6" fill="${L}"/><circle cx="${ox + 1}" cy="${oy + 1}" r="2.6" fill="${L}"/>
    <path d="M-3 ${oy + 8} Q0 ${oy + 11} 3 ${oy + 8}" fill="none" stroke="${L}" stroke-width="2" stroke-linecap="round"/></g>`;
}
// «peluche»: etiqueta de juguete (la figura, además, se pone gris y se cae tiesa)
export function etiqueta({ w, h }) {
  return `<g class="etiqueta" transform="translate(${w * 0.3} ${-h * 0.75})"><path d="M-6 -4 Q-14 -10 -10 -18" fill="none" stroke="${L}" stroke-width="1.5"/>
    <path d="M0 0 L22 -7 L30 4 L8 11 Z" fill="${C.papel}" ${T(2)}/><circle cx="5" cy="2" r="1.8" fill="${L}"/>
    <path d="M12 2 L22 -1" stroke="${C.grisOsc}" stroke-width="2" stroke-linecap="round"/></g>`;
}
// signos de manga (漫符) sobre una cabeza
export function manpu(tipo, x, y, s = 1) {
  const g = (c) => `<g class="manpu" transform="translate(${x} ${y}) scale(${s})">${c}</g>`;
  if (tipo === 'excl') return g(`<path d="M-2 -26 L3 -26 L1.5 -6 L-0.5 -6 Z" fill="#e8574a" ${T(2.5)}/><circle cx="0.5" cy="0" r="3" fill="#e8574a" ${T(2)}/>`);
  if (tipo === 'pregunta') return g(`<text x="0" y="0" text-anchor="middle" font-size="30" font-weight="900" fill="${C.cieloOsc}" stroke="${L}" stroke-width="2" paint-order="stroke" font-family="sans-serif">?</text>`);
  if (tipo === 'z') return g(`<g font-weight="900" font-family="sans-serif" fill="${C.lav}" stroke="${L}" stroke-width="1.8" paint-order="stroke"><text x="0" y="0" font-size="18">Z</text><text x="14" y="-14" font-size="13">z</text><text x="24" y="-26" font-size="10">z</text></g>`);
  if (tipo === 'sudor') return g(`<path d="M0 -14 Q7 -4 5 1 Q2 5 -2 3 Q-6 0 0 -14 Z" fill="${C.cielo}" ${T(2)}/>`);
  if (tipo === 'brillo') return g(`<path d="M0 -14 Q2 -2 14 0 Q2 2 0 14 Q-2 2 -14 0 Q-2 -2 0 -14 Z" fill="${C.mante}" ${T(2)}/>`);
  if (tipo === 'corazon') return g(`<path d="M0 6 C-14 -4 -10 -16 -2 -12 L0 -10 L2 -12 C10 -16 14 -4 0 6 Z" fill="${C.rosa}" ${T(2)}/>`);
  if (tipo === 'prisa') return g(`<g stroke="${L}" stroke-width="2.5" stroke-linecap="round"><path d="M0 -10 H22 M4 0 H30 M0 10 H20"/></g>`);
  return '';
}
// filtro gris del «peluche» (una vez por SVG)
export const DEFS = `<defs><filter id="cl-gris"><feColorMatrix type="saturate" values="0.12"/></filter><radialGradient id="cl-sombra"><stop offset="0" stop-color="#1e1208" stop-opacity=".42"/><stop offset=".6" stop-color="#1e1208" stop-opacity=".18"/><stop offset="1" stop-color="#1e1208" stop-opacity="0"/></radialGradient><radialGradient id="ep-halo"><stop offset="0" stop-color="#fff6c2" stop-opacity=".95"/><stop offset=".55" stop-color="#ffd966" stop-opacity=".55"/><stop offset="1" stop-color="#ffc233" stop-opacity="0"/></radialGradient></defs>`;
