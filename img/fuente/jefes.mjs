// Los 10 yōkai jefes de región. Se dibujan en el espacio de 256 y se escalan a 512 (ver generar.mjs).
// Diseño propio a partir del folclore: figuras de vinilo chibi, simpáticas pero con mala uva.
import { PALETA as P, TINTA as T, capsula, nube, flor, chispa, estrella, poli, mofletes, curva, afilada, ojoFiero, ceja, copo, llama, palo } from './kit.mjs';

const brillos = (k, lista, color = P.oroLuz) => { for (const [x, y, r] of lista) k.p(chispa(x, y, r), color, { vol: 'none', lw: k.IN * 0.6 }); };
const gota = (k, x, y, s, color = '#8fd3ea', rot = 0) =>
  k.p(`M${x} ${y - 14 * s} Q${x + 10 * s} ${y} ${x + 8 * s} ${y + 5 * s} Q${x + 6 * s} ${y + 11 * s} ${x} ${y + 11 * s} Q${x - 6 * s} ${y + 11 * s} ${x - 8 * s} ${y + 5 * s} Q${x - 10 * s} ${y} ${x} ${y - 14 * s} Z`, color, { vol: 'none', tr: rot ? `rotate(${rot} ${x} ${y})` : undefined });
const humo = (k, x, y, rx, ry, n = 7, fase = 0) => k.p(nube(x, y, rx, ry, n, fase, 0.62), '#f3ede2', { vol: 'v' });

export const JEFES = {
  kappa(k) {
    const PI = '#8cbc4a', PO = '#5f7a34';
    k.sombra(128, 240, 86, 11);
    k.e(128, 180, 70, 54, PO);
    k.raw('<path d="M64 170 Q70 140 96 132 M192 170 Q186 140 160 132" fill="none" stroke="#8a9a4a" stroke-width="4" stroke-linecap="round"/>');
    k.p(capsula(106, 198, 102, 226, 22), PI);
    k.p(capsula(150, 198, 154, 226, 22), PI);
    for (const x of [100, 156]) k.p(`M${x - 18} 236 Q${x - 16} 220 ${x} 220 Q${x + 16} 220 ${x + 18} 236 Q${x + 12} 231 ${x + 6} 237 Q${x} 230 ${x - 6} 237 Q${x - 12} 231 ${x - 18} 236 Z`, PI);
    k.p('M128 132 C168 132 180 160 178 186 C176 212 156 224 128 224 C100 224 80 212 78 186 C76 160 88 132 128 132 Z', PI);
    k.p('M128 146 C150 146 160 164 158 186 C156 206 144 214 128 214 C112 214 100 206 98 186 C96 164 106 146 128 146 Z', '#f0dc8a', { sil: false });
    k.raw('<path d="M100 168 L156 168 M98 190 L158 190 M128 148 L128 212" fill="none" stroke="#c9b25a" stroke-width="3.2" stroke-linecap="round"/>');
    k.p(capsula(170, 156, 190, 184, 18), PI);
    k.c(192, 188, 11, PI);
    k.p(capsula(88, 158, 62, 134, 18), PI);
    k.p(capsula(38, 176, 78, 56, 24), '#4f8a2e', { vol: 'h' });
    k.raw('<g fill="#9ccf6a"><circle cx="52" cy="150" r="2.6"/><circle cx="60" cy="122" r="2.6"/><circle cx="68" cy="96" r="2.6"/><circle cx="48" cy="130" r="2.2"/><circle cx="58" cy="104" r="2.2"/><circle cx="70" cy="76" r="2.2"/></g>');
    k.p(estrella(80, 50, 11, 5, 5, -70), P.oro, { vol: 'none' });
    k.c(62, 134, 12, PI);
    k.linea('M56 128 Q62 124 68 128', 3);
    k.p('M128 34 C184 34 196 74 194 104 C192 138 164 152 128 152 C92 152 64 138 62 104 C60 74 72 34 128 34 Z', PI);
    k.raw('<g fill="#6fa03a" opacity=".8"><circle cx="80" cy="120" r="4"/><circle cx="88" cy="132" r="3"/><circle cx="178" cy="118" r="4"/><circle cx="170" cy="132" r="3"/></g>');
    k.p('M66 70 Q70 30 128 28 Q186 30 190 70 L180 80 L170 66 L160 82 L148 68 L138 84 L128 70 L118 84 L108 68 L96 82 L86 66 L76 80 Z', '#3d5c2c');
    k.e(128, 34, 36, 11, '#e8f4f6', { vol: 'none' });
    k.e(128, 34, 28, 7, '#7cc4d6', { vol: 'none', sil: false });
    k.e(120, 32, 10, 2.5, '#e8f4f6', { vol: 'none', sil: false, borde: false });
    ojoFiero(k, 104, 104, 15, 16, { iris: '#f2d06b', ang: 16, corte: 0.3, mira: [3, 0] });
    ojoFiero(k, 152, 104, 15, 16, { iris: '#f2d06b', ang: -16, corte: 0.3, mira: [3, 0] });
    ceja(k, 84, 80, 118, 90, 9);
    ceja(k, 172, 80, 138, 90, 9);
    mofletes(k, [[82, 124], [174, 124]], 9, 5, '#e98e7c', 0.8);
    k.p('M100 120 Q128 110 156 120 Q158 142 128 148 Q98 142 100 120 Z', P.oro);
    k.linea('M104 128 Q128 140 152 126', 4);
    k.p('M140 132 Q146 146 136 146 Q130 142 134 134 Z', '#f0798e', { vol: 'none', lw: 3 });
    k.c(120, 118, 2.4, T, { vol: 'none', borde: false, sil: false });
    k.c(136, 118, 2.4, T, { vol: 'none', borde: false, sil: false });
    k.brillo(92, 56, 14, 7, -30);
    gota(k, 210, 70, 1.1, '#8fd3ea', 20);
    gota(k, 226, 104, 0.8, '#8fd3ea', 30);
    gota(k, 32, 34, 0.9, '#8fd3ea', -20);
  },

  tanuki(k) {
    const F = '#a0714a', FO = '#6f4a2f', MA = '#4a3526', CR = '#f3e1bf';
    k.sombra(128, 240, 90, 11);
    const cola = 'M160 200 Q214 200 228 152 Q238 110 206 94 Q222 132 196 152 Q180 166 156 172 Z';
    k.p(cola, F);
    const cc = k.clip('cola', `<path d="${cola}"/>`);
    k.raw(`<path d="M186 190 Q206 176 214 156 M204 176 Q222 160 228 138 M196 128 Q214 124 226 112" clip-path="${cc}" fill="none" stroke="${FO}" stroke-width="9"/>`);
    k.p(cola, 'none', { vol: 'none', sil: false });
    k.p(capsula(104, 206, 100, 228, 24), FO);
    k.p(capsula(152, 206, 156, 228, 24), FO);
    k.e(128, 178, 64, 54, F);
    k.e(128, 190, 44, 38, CR, { sil: false });
    k.raw('<path d="M110 198 Q128 206 146 198" fill="none" stroke="#d9b98a" stroke-width="3.5" stroke-linecap="round"/>');
    k.p('M44 152 Q40 132 52 124 L52 112 Q52 104 60 104 Q68 104 68 112 L68 124 Q80 132 76 152 Q76 178 60 180 Q44 178 44 152 Z', '#efe3c8', { vol: 'h' });
    k.p('M46 138 Q60 144 74 138 L76 156 Q60 162 44 156 Z', P.granate, { vol: 'none', sil: false });
    k.raw('<path d="M55 146 L65 146 M60 142 L60 152" stroke="#f7efdf" stroke-width="2.6" stroke-linecap="round"/>');
    k.tubo('M56 110 Q48 122 58 128', P.oro, 3);
    k.p(capsula(84, 162, 66, 150, 20), F);
    k.c(70, 150, 12, F);
    k.p(capsula(172, 160, 200, 120, 20), F);
    k.c(204, 114, 14, F);
    for (const [x, y, r] of [[196, 100, -20], [206, 98, 0], [216, 102, 20]]) k.p(`M${x - 3} ${y + 2} L${x} ${y - 9} L${x + 3} ${y + 2} Z`, '#fffaf0', { vol: 'none', lw: 3, tr: `rotate(${r} ${x} ${y})` });
    k.e(80, 56, 17, 19, FO);
    k.e(176, 56, 17, 19, FO);
    k.e(80, 58, 8, 10, '#3a2b20', { sil: false, vol: 'none', borde: false });
    k.e(176, 58, 8, 10, '#3a2b20', { sil: false, vol: 'none', borde: false });
    k.p('M56 104 L48 96 L60 92 Q62 62 128 50 Q194 62 196 92 L208 96 L200 104 L208 114 L194 116 Q186 150 128 152 Q70 150 62 116 L48 114 Z', F);
    k.p('M76 96 Q90 78 112 88 Q124 96 120 112 Q106 126 88 118 Q74 110 76 96 Z', MA, { sil: false, vol: 'none', lw: 3 });
    k.p('M180 96 Q166 78 144 88 Q132 96 136 112 Q150 126 168 118 Q182 110 180 96 Z', MA, { sil: false, vol: 'none', lw: 3 });
    ojoFiero(k, 100, 102, 12, 11, { iris: '#f2c94c', rendija: true, ang: 10, corte: 0.42, mira: [2, 0] });
    ojoFiero(k, 156, 102, 12, 11, { iris: '#f2c94c', rendija: true, ang: -10, corte: 0.42, mira: [2, 0] });
    k.e(128, 126, 28, 19, CR, { sil: false, vol: 'none' });
    k.e(128, 114, 9, 6, T, { sil: false, vol: 'none', borde: false });
    k.punto(125, 112, 2);
    k.linea('M108 128 Q118 140 128 130 Q138 140 150 126', 4);
    k.p('M140 132 L144 142 L147 130 Z', '#fffaf0', { vol: 'none', lw: 2.5, sil: false });
    k.p('M128 20 Q152 26 154 46 Q140 50 128 44 Q116 50 102 46 Q104 26 128 20 Z', P.te, { tr: 'rotate(-18 128 44)' });
    k.linea('M128 22 L128 48 M128 34 L118 40 M128 34 L138 40', 2.8, '#4f6326');
    humo(k, 60, 222, 36, 14, 7, 0.3);
    humo(k, 196, 226, 38, 13, 7, 0.1);
    humo(k, 128, 236, 46, 11, 8, 0);
    brillos(k, [[36, 70, 11], [224, 56, 8]]);
  },

  karakasa(k) {
    k.sombra(128, 242, 60, 9);
    for (const [x, y, rx] of [[70, 232, 20], [188, 230, 18]]) k.p(nube(x, y, rx, 9, 6, 0.3), '#f3ede2', { vol: 'v' });
    k.linea('M58 206 L40 210 M64 220 L46 228 M198 206 L216 210', 4.5);
    k.tubo('M54 146 Q30 140 26 112', P.bambu, 8);
    k.c(26, 106, 11, P.bambu);
    k.tubo('M202 146 Q226 142 232 116', P.bambu, 8);
    k.c(232, 110, 11, P.bambu);
    k.tubo('M128 172 L128 214', P.bambu, 14);
    k.r(106, 222, 12, 12, 3, P.madera);
    k.r(138, 222, 12, 12, 3, P.madera);
    k.r(98, 210, 60, 14, 6, P.maderaClara, { vol: 'v' });
    k.tubo('M112 212 Q128 196 144 212', P.rojo, 5);
    k.tubo('M128 26 L128 8', P.laca, 8);
    k.c(128, 7, 6, P.laca);
    const can = 'M128 22 Q152 46 206 140 Q214 156 212 164 Q196 172 184 162 Q170 176 156 166 Q142 180 128 168 Q114 180 100 166 Q86 176 72 162 Q60 172 44 164 Q42 156 50 140 Q104 46 128 22 Z';
    k.p(can, '#d8412a');
    const cl = k.clip('can', `<path d="${can}"/>`);
    k.raw(`<g clip-path="${cl}"><path d="M0 62 Q128 92 256 62 L256 84 Q128 114 0 84 Z" fill="#f7efdf"/><path d="M128 22 L44 170 M128 22 L72 172 M128 22 L100 176 M128 22 L156 176 M128 22 L184 172 M128 22 L212 170" fill="none" stroke="#9e2d1c" stroke-width="3" opacity=".7"/></g>`);
    k.p(can, 'none', { vol: 'none', sil: false });
    k.brillo(92, 80, 7, 30, 30);
    ojoFiero(k, 128, 120, 28, 25, { iris: '#f2b43a', ang: 8, corte: 0.26, mira: [4, 2] });
    ceja(k, 94, 92, 162, 100, 10);
    k.p('M102 146 Q128 168 154 146 Q128 158 102 146 Z', '#5a1a12', { sil: false, vol: 'none' });
    k.p('M122 152 Q116 190 144 200 Q170 208 180 188 Q164 194 152 184 Q140 172 144 154 Z', '#f0798e', { vol: 'v' });
    k.linea('M134 160 Q132 180 152 192', 3, '#c9506a');
    brillos(k, [[222, 40, 12], [32, 58, 9]]);
  },

  nekomata(k) {
    const F = '#5b4d63', CR = '#f3e8d8';
    k.sombra(128, 240, 74, 10);
    const c1 = afilada([[146, 206], [190, 212], [212, 190], [218, 160], [236, 140]], 22, 9);
    const c2 = afilada([[140, 196], [176, 186], [190, 156], [196, 122], [218, 96]], 22, 9);
    k.p(c1.d, F);
    k.p(c2.d, F);
    k.raw('<path d="M196 206 Q212 196 214 176 M182 180 Q192 164 192 140" fill="none" stroke="#7e6d88" stroke-width="3.2" stroke-linecap="round"/>');
    llama(k, 238, 118, 1.05, '#a98bff', '#f1ebff', 14);
    llama(k, 220, 72, 1.1, '#8fd3ff', '#effaff', 8);
    llama(k, 30, 58, 0.7, '#8fd3ff', '#effaff', -10);
    k.p(capsula(110, 204, 106, 228, 20), F);
    k.p(capsula(146, 204, 150, 228, 20), F);
    k.e(104, 230, 13, 7, CR);
    k.e(152, 230, 13, 7, CR);
    k.p('M128 138 C162 138 174 164 172 190 C170 214 152 222 128 222 C104 222 86 214 84 190 C82 164 94 138 128 138 Z', F);
    k.e(128, 190, 24, 28, CR, { sil: false });
    k.p('M96 148 Q128 162 160 148 L160 158 Q128 172 96 158 Z', P.rojo, { vol: 'v' });
    k.c(128, 170, 9, P.oro);
    k.linea('M128 172 L128 178', 2.6);
    k.p(capsula(166, 160, 184, 188, 16), F);
    k.c(186, 192, 10, F);
    k.p(capsula(94, 160, 66, 124, 18), F);
    k.c(62, 118, 15, F);
    k.raw('<g fill="#e49ab0"><ellipse cx="62" cy="122" rx="6" ry="5"/><circle cx="54" cy="113" r="2.8"/><circle cx="62" cy="110" r="2.8"/><circle cx="70" cy="113" r="2.8"/></g>');
    for (const [x, y, r] of [[52, 104, -30], [62, 100, 0], [72, 104, 30]]) k.p(`M${x - 2.6} ${y + 2} L${x} ${y - 9} L${x + 2.6} ${y + 2} Z`, '#fffaf0', { vol: 'none', lw: 2.6, tr: `rotate(${r} ${x} ${y})` });
    k.p('M76 82 L70 22 L118 54 Z', F);
    k.p('M138 54 L186 22 L180 82 Z', F);
    k.p('M84 68 L82 38 L106 56 Z', '#e49ab0', { sil: false, borde: false, vol: 'none' });
    k.p('M150 56 L174 38 L172 68 Z', '#e49ab0', { sil: false, borde: false, vol: 'none' });
    k.p('M128 44 C182 44 196 78 194 104 C192 138 164 150 128 150 C92 150 64 138 62 104 C60 78 74 44 128 44 Z', F);
    k.p('M114 58 Q128 72 142 58 Q128 66 114 58 Z', '#b9a5c6', { sil: false, vol: 'none', lw: 2.5 });
    k.raw('<path d="M64 112 L52 116 L64 122 M192 112 L204 116 L192 122" fill="#5b4d63" stroke="#2a211a" stroke-width="3" stroke-linejoin="round"/>');
    k.e(128, 122, 22, 14, CR, { sil: false, vol: 'none' });
    ojoFiero(k, 102, 98, 16, 13, { iris: '#d6e04a', rendija: true, ang: 12, corte: 0.36, mira: [3, 0], pestana: -1 });
    ojoFiero(k, 154, 98, 16, 13, { iris: '#d6e04a', rendija: true, ang: -12, corte: 0.36, mira: [3, 0], pestana: 1 });
    k.p('M123 113 L133 113 L128 119 Z', '#e8757d', { sil: false, vol: 'none', lw: 2.5 });
    k.linea('M114 124 Q121 132 128 124 Q137 134 146 122', 3.5);
    k.p('M134 128 L137 138 L140 127 Z', '#fffaf0', { vol: 'none', lw: 2.2, sil: false });
    k.linea('M86 120 L58 116 M86 128 L60 132 M170 120 L198 116 M170 128 L196 132', 2.6, '#e9dcef');
    mofletes(k, [[84, 116], [172, 116]], 8, 4.5, '#e49ab0', 0.7);
    k.brillo(96, 62, 14, 7, -26);
  },

  rokurokubi(k) {
    const PIEL = '#f7e8d8', KI = '#7a3b5c', PE = '#3b3347';
    k.halo(176, 80, 90, '#f2b6c4', 0.35);
    k.sombra(108, 240, 76, 10);
    const ki = 'M50 236 Q46 192 70 170 Q88 156 108 156 Q128 156 144 172 Q166 194 162 236 Z';
    k.p(ki, KI);
    const ck = k.clip('ki', `<path d="${ki}"/>`);
    let fl = '';
    for (const [x, y] of [[70, 182], [132, 178], [92, 226], [150, 222], [62, 216]]) fl += `<path d="${flor(x, y, 8)}"/>`;
    k.raw(`<g clip-path="${ck}" fill="#f2b6c4" opacity=".75">${fl}</g>`);
    k.p(ki, 'none', { vol: 'none', sil: false });
    k.p('M56 196 Q106 208 158 196 L159 214 Q106 226 55 214 Z', P.oro, { sil: false, vol: 'v' });
    k.linea('M57 205 Q106 217 158 205', 3, P.rojo);
    k.p('M92 158 L108 186 L124 158 L114 158 L108 172 L102 158 Z', P.crema, { sil: false, vol: 'none', lw: 3.5 });
    const cuello = curva([[108, 166], [94, 138], [98, 112], [122, 102], [150, 112], [170, 118], [178, 104]]);
    k.tubo(cuello.d, PIEL, 18);
    k.raw(`<path d="${cuello.d}" fill="none" stroke="#ecd3c0" stroke-width="5" stroke-linecap="round" transform="translate(3 4)" opacity=".85"/>`);
    k.p(nube(178, 62, 54, 48, 9, 0.2, 0.5), PE);
    k.e(178, 22, 32, 15, PE);
    k.r(146, 30, 64, 11, 5, P.rojo, { vol: 'v' });
    k.tubo('M206 28 L228 18', P.oro, 4);
    k.p(flor(230, 18, 9), '#f2b6c4', { vol: 'none', lw: 2.6 });
    k.tubo('M226 24 L232 44', P.oro, 2.4);
    k.p(flor(233, 48, 6), '#f2b6c4', { vol: 'none', lw: 2.2 });
    k.e(178, 80, 42, 40, PIEL);
    k.p('M136 76 Q138 40 178 38 Q218 40 220 76 Q206 62 192 66 Q178 52 164 66 Q150 62 136 76 Z', PE);
    k.p('M138 72 Q130 104 140 128 L148 116 Q142 94 148 76 Z', PE);
    k.p('M218 72 Q226 104 216 128 L208 116 Q214 94 208 76 Z', PE);
    k.brillo(170, 48, 16, 5, -8, 0.6);
    k.p('M154 82 Q164 76 176 84 Q164 80 154 82 Z', '#e0708c', { sil: false, vol: 'none', borde: false });
    k.p('M180 84 Q192 76 202 82 Q192 80 180 84 Z', '#e0708c', { sil: false, vol: 'none', borde: false });
    ojoFiero(k, 164, 90, 11, 9, { iris: '#b04a6a', ang: -6, corte: 0.46, mira: [2, 1], pestana: -1 });
    ojoFiero(k, 194, 90, 11, 9, { iris: '#b04a6a', ang: 6, corte: 0.46, mira: [2, 1], pestana: 1 });
    mofletes(k, [[154, 104], [204, 104]], 8, 4.5, '#f2a3a3');
    k.p('M170 108 Q179 117 190 108 Q180 112 170 108 Z', P.rojo, { sil: false, vol: 'none', lw: 3 });
    k.p('M181 111 Q186 124 177 126 Q173 119 179 112 Z', '#f0798e', { sil: false, vol: 'none', lw: 2.4 });
    llama(k, 40, 110, 0.9, '#8fd3ff', '#effaff', -8);
    brillos(k, [[40, 56, 11], [74, 30, 7]], '#f2b6c4');
  },

  tengu(k) {
    const RO = '#d8412a', RP = '#efe6d6', AL = '#3a2f36';
    k.sombra(128, 242, 86, 10);
    const ala = 'M112 150 Q64 128 30 82 Q20 102 24 120 Q10 126 14 144 Q4 154 14 170 Q40 180 72 174 Q98 170 112 160 Z';
    k.p(ala, AL);
    k.p(ala, AL, { tr: 'translate(256 0) scale(-1 1)' });
    k.raw('<g fill="none" stroke="#6a5a66" stroke-width="3.2" stroke-linecap="round"><path d="M100 152 Q60 132 34 100 M100 158 Q56 150 24 138 M100 164 Q60 166 24 164"/><path d="M156 152 Q196 132 222 100 M156 158 Q200 150 232 138 M156 164 Q196 166 232 164"/></g>');
    k.r(90, 218, 36, 10, 4, P.maderaClara, { vol: 'v' });
    k.r(130, 218, 36, 10, 4, P.maderaClara, { vol: 'v' });
    k.r(102, 228, 12, 12, 3, P.madera);
    k.r(142, 228, 12, 12, 3, P.madera);
    k.p('M86 150 Q78 190 88 222 L168 222 Q178 190 170 150 Q150 138 128 138 Q106 138 86 150 Z', RP);
    k.p('M88 196 Q128 206 168 196 L170 222 L86 222 Z', '#b9ad96', { sil: false, vol: 'none' });
    k.linea('M128 200 L128 222', 3.5, '#8d8270');
    k.p('M104 148 L128 190 L152 148 L142 146 L128 172 L114 146 Z', '#d8cdb8', { sil: false, vol: 'none', lw: 3 });
    for (const [x, y] of [[112, 160], [144, 160], [112, 180], [144, 180]]) k.c(x, y, 7.5, P.naranja, { lw: 3.5, sil: false });
    k.p(capsula(166, 160, 188, 192, 18), RP);
    k.c(190, 196, 11, RO);
    k.p(capsula(92, 160, 66, 124, 18), RP);
    for (let i = 0; i < 7; i++) {
      const a = -150 + i * 30, r = (a * Math.PI) / 180, cx = 50 + Math.cos(r) * 26, cy = 76 + Math.sin(r) * 26;
      k.e(cx, cy, 22, 9, i % 2 ? '#6f8a34' : P.te, { tr: `rotate(${a} ${cx} ${cy})`, vol: 'r' });
    }
    k.c(50, 76, 10, '#6f8a34');
    k.raw('<path d="M50 76 L50 50 M50 76 L28 62 M50 76 L72 62 M50 76 L30 86 M50 76 L70 86" stroke="#4f6326" stroke-width="2.4" stroke-linecap="round"/>');
    k.tubo('M52 86 L62 118', P.te, 5);
    k.c(64, 120, 11, RO);
    k.p(nube(128, 94, 70, 56, 11, 0.1, 0.6), '#f4ece0', { vol: 'v' });
    k.e(128, 100, 52, 48, RO);
    k.p('M110 56 L116 40 L140 40 L146 56 L140 64 L116 64 Z', P.laca, { vol: 'v' });
    k.linea('M92 62 Q128 72 164 62', 3.5, P.laca);
    ojoFiero(k, 106, 98, 11, 11, { iris: '#f2b43a', ang: 20, corte: 0.36, mira: [3, 0] });
    ojoFiero(k, 150, 98, 11, 11, { iris: '#f2b43a', ang: -20, corte: 0.36, mira: [3, 0] });
    k.p(nube(102, 80, 20, 8, 6, 0.4, 0.6), '#fbf7f0', { vol: 'none' });
    k.p(nube(154, 80, 20, 8, 6, 0.1, 0.6), '#fbf7f0', { vol: 'none' });
    k.p(nube(128, 146, 42, 20, 8, 0.3, 0.6), '#fbf7f0', { vol: 'v' });
    k.linea('M112 138 Q128 130 144 138', 3.5);
    k.p(palo(130, 108, 22, 200, 128, 16), RO);
    k.brillo(176, 116, 14, 3.5, 16, 0.9);
    mofletes(k, [[88, 118], [168, 118]], 7, 4, '#a82e1d', 0.6);
    brillos(k, [[222, 30, 11], [30, 190, 8]]);
  },

  kitsune(k) {
    const BL = '#fbf3e6';
    k.halo(128, 120, 128, '#ffe7a8', 0.55);
    k.sombra(128, 240, 82, 10);
    const colas = [-170, -10, -150, -30, -130, -50, -110, -70, -90];
    for (const g of colas) {
      const a = (g * Math.PI) / 180, bx = 128, by = 196, px = bx + Math.cos(a) * 124, py = by + Math.sin(a) * 150;
      const nx = -Math.sin(a), ny = Math.cos(a), mx = bx + (px - bx) * 0.58, my = by + (py - by) * 0.58;
      const d = `M${(bx + nx * 10).toFixed(1)} ${(by + ny * 10).toFixed(1)} Q${(mx + nx * 44).toFixed(1)} ${(my + ny * 44).toFixed(1)} ${px.toFixed(1)} ${py.toFixed(1)} Q${(mx - nx * 44).toFixed(1)} ${(my - ny * 44).toFixed(1)} ${(bx - nx * 10).toFixed(1)} ${(by - ny * 10).toFixed(1)} Z`;
      const cl = k.clip('c' + (g + 200), `<path d="${d}"/>`);
      k.p(d, '#f8ead2', { vol: 'r' });
      const tx = bx + (px - bx) * 0.6, ty = by + (py - by) * 0.6;
      k.c(px + (tx - px) * 0.1, py + (ty - py) * 0.1, Math.hypot(px - tx, py - ty) * 0.95, P.oro, { sil: false, vol: 'none', clip: cl, borde: false });
      k.c(px + (tx - px) * 0.1, py + (ty - py) * 0.1, Math.hypot(px - tx, py - ty) * 0.5, '#ffd77a', { sil: false, vol: 'none', clip: cl, borde: false });
      k.p(d, 'none', { vol: 'none', sil: false });
    }
    k.p('M128 146 C162 146 172 176 170 200 C168 224 150 232 128 232 C106 232 88 224 86 200 C84 176 94 146 128 146 Z', BL);
    k.p(capsula(110, 196, 108, 230, 18), BL, { sil: false });
    k.p(capsula(146, 196, 148, 230, 18), BL, { sil: false });
    k.p(nube(128, 158, 30, 13, 7, 0.2), '#fffaf2', { sil: false, vol: 'none' });
    k.p('M98 150 Q128 164 158 150 L158 158 Q128 172 98 158 Z', P.rojo, { vol: 'v' });
    k.halo(128, 196, 34, '#bfe8ff', 0.9);
    k.c(128, 198, 17, '#e3f5ff');
    k.p('M128 170 Q136 180 138 190 Q128 184 118 190 Q120 180 128 170 Z', '#8fd3ff', { vol: 'none', lw: 3 });
    k.brillo(122, 192, 6, 4, -20);
    k.c(108, 204, 9, BL);
    k.c(148, 204, 9, BL);
    k.p('M78 82 L70 14 L116 50 Z', BL);
    k.p('M140 50 L186 14 L178 82 Z', BL);
    k.p('M84 68 L80 32 L104 52 Z', '#f07a50', { sil: false, borde: false, vol: 'none' });
    k.p('M152 52 L176 32 L172 68 Z', '#f07a50', { sil: false, borde: false, vol: 'none' });
    k.p('M128 42 C170 42 190 68 192 90 L206 102 L190 108 Q180 136 128 146 Q76 136 66 108 L50 102 L64 90 C66 68 86 42 128 42 Z', BL);
    k.p('M128 56 Q138 70 128 86 Q118 70 128 56 Z', P.rojo, { sil: false, vol: 'none', lw: 2.6 });
    k.p('M84 92 Q94 74 118 86 Q98 86 84 92 Z', P.rojo, { sil: false, vol: 'none', lw: 2.6 });
    k.p('M172 92 Q162 74 138 86 Q158 86 172 92 Z', P.rojo, { sil: false, vol: 'none', lw: 2.6 });
    ojoFiero(k, 104, 102, 14, 11, { iris: '#f2b43a', rendija: true, ang: 14, corte: 0.42, mira: [2, 0], pestana: -1 });
    ojoFiero(k, 152, 102, 14, 11, { iris: '#f2b43a', rendija: true, ang: -14, corte: 0.42, mira: [2, 0], pestana: 1 });
    k.e(128, 124, 7, 5, T, { sil: false, vol: 'none', borde: false });
    k.linea('M116 132 Q122 138 128 132 Q134 138 140 132', 3.2);
    mofletes(k, [[88, 118], [168, 118]], 7, 4, '#f2a3a3');
    llama(k, 30, 176, 1, '#8fd3ff');
    llama(k, 226, 180, 0.9, '#8fd3ff');
    llama(k, 36, 44, 0.8, '#a98bff', '#f1ebff');
    brillos(k, [[222, 36, 11]]);
  },

  yukionna(k) {
    const PI = '#eef1fb', KI = '#f7f9ff', PE = '#2e3150', AZ = '#9fc3ee';
    k.halo(128, 110, 128, '#cfe6ff', 0.6);
    k.p('M86 72 Q80 40 120 32 Q172 28 178 72 Q190 108 214 128 Q236 144 246 176 Q222 170 204 152 Q214 182 236 208 Q196 198 180 164 Q178 192 162 214 Q150 184 150 152 Z', PE);
    k.raw('<path d="M190 120 Q210 140 226 170 M176 150 Q186 172 196 190" fill="none" stroke="#4a4f78" stroke-width="3" stroke-linecap="round"/>');
    const cu = 'M90 142 Q74 180 80 214 Q98 236 128 232 Q160 236 176 214 Q182 180 166 142 Q148 130 128 130 Q108 130 90 142 Z';
    k.p(cu, KI);
    const cl = k.clip('ki', `<path d="${cu}"/>`);
    k.raw(`<g clip-path="${cl}" fill="none" stroke="#b9d3f2" stroke-width="2.6">${[[100, 200], [150, 208], [124, 222], [160, 176]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9"/><circle cx="${x}" cy="${y}" r="4"/>`).join('')}</g>`);
    k.p(cu, 'none', { vol: 'none', sil: false });
    k.p('M86 170 Q128 182 170 170 L170 190 Q128 202 86 190 Z', AZ, { sil: false, vol: 'v' });
    k.linea('M88 180 Q128 192 168 180', 3, '#f7f9ff');
    k.p('M108 134 L128 172 L148 134 L140 134 L128 156 L116 134 Z', '#cfe0f5', { sil: false, vol: 'none', lw: 3 });
    k.tubo('M84 214 Q60 222 50 206 Q44 194 58 190', '#dfeeff', 8);
    k.tubo('M172 216 Q196 226 208 210', '#dfeeff', 8);
    k.p('M162 146 Q198 150 206 196 Q186 208 166 198 Q158 170 162 146 Z', KI);
    k.p('M100 146 Q66 146 50 128 Q56 112 74 116 Q90 128 108 134 Z', KI);
    k.c(50, 116, 9, PI);
    k.e(128, 90, 40, 40, PI);
    k.p('M88 84 Q86 50 128 48 Q170 50 168 84 L160 76 L150 86 L140 74 L128 86 L116 74 L106 86 L96 76 Z', PE);
    k.p('M88 78 L82 144 L96 144 L98 86 Z', PE);
    k.p('M168 78 L174 144 L160 144 L158 86 Z', PE);
    k.brillo(118, 56, 16, 4, -6, 0.5);
    ojoFiero(k, 112, 98, 11, 9, { iris: '#7fb8f0', ang: -8, corte: 0.5, mira: [-2, 1], pestana: 1 });
    ojoFiero(k, 144, 98, 11, 9, { iris: '#7fb8f0', ang: 8, corte: 0.5, mira: [-2, 1], pestana: -1 });
    mofletes(k, [[102, 110], [156, 110]], 7, 3.5, '#c9d4f5');
    k.e(126, 116, 5, 3.5, '#7f8fd6', { sil: false, vol: 'none', lw: 2.4 });
    k.p(nube(96, 120, 13, 7, 6, 0.3), '#e6f3ff', { vol: 'none' });
    k.p(nube(76, 110, 9, 5, 5, 0.1), '#e6f3ff', { vol: 'none' });
    copo(k, 38, 88, 18);
    copo(k, 34, 40, 10);
    copo(k, 214, 44, 12);
    copo(k, 26, 150, 10);
    copo(k, 232, 108, 9);
    copo(k, 62, 30, 8);
  },

  oni(k) {
    const RO = '#d8412a', PE = '#3a2b20', CU = '#f7e3a8';
    k.sombra(128, 240, 92, 11);
    k.p(palo(198, 206, 16, 226, 44, 40), '#4d4a55', { vol: 'h' });
    for (let i = 0; i < 6; i++) {
      const t = 0.38 + i * 0.11, x = 198 + (226 - 198) * t, y = 206 + (44 - 206) * t, w = 16 + 24 * t;
      for (const s of [-1, 0, 1]) k.c(x + s * w * 0.3, y + s * w * 0.05, 3.4, P.oro, { vol: 'none', lw: 2.4, sil: false });
    }
    k.p(capsula(104, 204, 98, 230, 26), RO);
    k.p(capsula(152, 204, 158, 230, 26), RO);
    k.p('M128 134 C174 134 186 166 182 194 C178 218 156 226 128 226 C100 226 78 218 74 194 C70 166 82 134 128 134 Z', RO);
    k.raw('<path d="M104 160 Q116 166 126 160 M130 160 Q140 166 152 160" fill="none" stroke="#a82e1d" stroke-width="3.5" stroke-linecap="round"/>');
    const tig = 'M76 190 Q128 206 180 190 L178 214 Q160 228 128 228 Q96 228 78 214 Z';
    k.p(tig, P.oro, { vol: 'v' });
    const ct = k.clip('tig', `<path d="${tig}"/>`);
    k.raw(`<path d="M92 192 L100 212 M112 198 L116 222 M136 198 L132 224 M156 196 L150 218 M172 192 L166 210" clip-path="${ct}" stroke="${PE}" stroke-width="6" stroke-linecap="round"/>`);
    k.p(tig, 'none', { vol: 'none', sil: false });
    k.p(capsula(84, 160, 56, 180, 26), RO);
    k.r(60, 166, 22, 12, 4, P.oro, { tr: 'rotate(-35 71 172)', lw: 3.5 });
    k.c(50, 184, 16, RO);
    k.linea('M42 180 Q50 176 58 180 M42 188 Q50 184 58 188', 2.6, '#a82e1d');
    k.p(capsula(172, 160, 194, 186, 24), RO);
    k.c(196, 188, 16, RO);
    k.p(nube(128, 84, 76, 58, 11, 0.1, 0.72), PE);
    k.p(palo(98, 52, 18, 88, 12, 6), CU, { vol: 'h' });
    k.p(palo(158, 52, 18, 168, 12, 6), CU, { vol: 'h' });
    k.e(128, 102, 60, 52, RO);
    k.p('M78 80 L88 62 L98 76 L110 58 L120 74 L128 56 L136 74 L146 58 L158 76 L168 62 L178 80 Q128 66 78 80 Z', PE, { vol: 'none' });
    ceja(k, 84, 84, 120, 96, 10, PE);
    ceja(k, 172, 84, 136, 96, 10, PE);
    ojoFiero(k, 104, 104, 13, 12, { iris: '#f2d06b', ang: 22, corte: 0.3 });
    ojoFiero(k, 152, 104, 13, 12, { iris: '#f2d06b', ang: -22, corte: 0.3 });
    k.p('M116 118 Q128 110 140 118 Q142 128 128 130 Q114 128 116 118 Z', '#b83220', { vol: 'none', lw: 3.5 });
    k.p('M88 132 Q128 164 168 132 Q162 152 128 156 Q94 152 88 132 Z', '#5a1a12', { vol: 'none', sil: false });
    k.p('M96 136 Q128 150 160 136 L156 142 Q128 154 100 142 Z', '#fffaf0', { vol: 'none', sil: false, lw: 2.4 });
    k.p('M104 152 L108 136 L114 150 Z', '#fffaf0', { vol: 'none', sil: false, lw: 2.6 });
    k.p('M142 150 L148 136 L152 152 Z', '#fffaf0', { vol: 'none', sil: false, lw: 2.6 });
    k.c(66, 120, 8, 'none', { vol: 'none', lw: 4.5 });
    k.c(190, 120, 8, 'none', { vol: 'none', lw: 4.5 });
    k.raw('<g fill="none" stroke="#f2b43a" stroke-width="3"><circle cx="66" cy="120" r="8"/><circle cx="190" cy="120" r="8"/></g>');
    k.brillo(96, 70, 14, 6, -24);
    brillos(k, [[226, 38, 12], [30, 110, 8]]);
  },

  ryu(k) {
    const AZ = '#2f5a8a', AZL = '#5f8fc4', MA = P.naranja;
    k.halo(128, 104, 130, '#ffe2a8', 0.5);
    k.p('M6 246 L90 150 Q106 134 128 134 Q150 134 166 150 L250 246 Z', '#7086b2', { vol: 'v' });
    k.p('M90 150 Q106 134 128 134 Q150 134 166 150 L178 164 L162 158 L150 172 L138 160 L128 176 L118 160 L106 172 L94 158 L78 164 Z', '#fbfbff', { sil: false, vol: 'none' });
    const cola = afilada([[140, 118], [192, 134], [222, 112], [226, 76], [206, 50], [184, 50]], 32, 12);
    const cuerpo = afilada([[112, 180], [72, 186], [44, 158], [42, 118], [66, 94], [100, 104]], 26, 32);
    for (const [c, s] of [[cola, 1], [cuerpo, -1]]) {
      for (const m of c.muestras.filter((_, i) => i % 4 === 2)) {
        const nx = -m.ty, ny = m.tx, w = (c === cola ? 32 - 20 * m.t : 26 + 6 * m.t) / 2, bx = m.x + nx * w * s, by = m.y + ny * w * s, h = 6 + w * 0.5;
        k.p(`M${(bx - m.tx * 6).toFixed(1)} ${(by - m.ty * 6).toFixed(1)} L${(bx + nx * h * s).toFixed(1)} ${(by + ny * h * s).toFixed(1)} L${(bx + m.tx * 6).toFixed(1)} ${(by + m.ty * 6).toFixed(1)} Z`, MA, { vol: 'none', lw: 3 });
      }
      k.p(c.d, AZ);
      let placas = '';
      for (const m of c.muestras.filter((_, i) => i % 3 === 0).slice(0, -1)) {
        const w = (c === cola ? 32 - 20 * m.t : 26 + 6 * m.t) * 0.2, ang = (Math.atan2(m.ty, m.tx) * 180) / Math.PI;
        placas += `<ellipse cx="${m.x.toFixed(1)}" cy="${m.y.toFixed(1)}" rx="${(w * 0.7).toFixed(1)}" ry="${w.toFixed(1)}" transform="rotate(${ang.toFixed(1)} ${m.x.toFixed(1)} ${m.y.toFixed(1)})"/>`;
      }
      k.raw(`<g fill="${P.oro}" stroke="${T}" stroke-width="2">${placas}</g>`);
    }
    k.p('M186 52 Q168 40 176 22 Q184 36 196 34 Q190 44 200 50 Q192 60 186 52 Z', MA, { vol: 'none' });
    k.p(nube(40, 218, 40, 14, 8, 0.3), '#f3ede2', { vol: 'v' });
    k.p(nube(214, 212, 42, 14, 8, 0.1), '#f3ede2', { vol: 'v' });
    k.p(nube(128, 234, 50, 11, 8, 0), '#f3ede2', { vol: 'v' });
    k.tubo('M194 136 Q206 150 206 164', AZ, 14);
    k.halo(206, 180, 32, '#fff1c2', 0.9);
    k.c(206, 180, 17, '#fff1c2');
    k.p('M206 158 Q214 168 216 176 Q206 170 196 176 Q198 168 206 158 Z', P.oro, { vol: 'none', lw: 3 });
    k.brillo(200, 174, 6, 4, -20);
    for (const [x, y, r] of [[194, 170, -40], [206, 164, 0], [218, 170, 40]]) k.p(`M${x - 3} ${y} L${x} ${y + 10} L${x + 3} ${y} Z`, '#2f5a8a', { vol: 'none', lw: 2.6, tr: `rotate(${r} ${x} ${y})` });
    k.p(nube(128, 86, 64, 50, 9, 0.2, 0.8), MA);
    k.tubo('M104 58 Q96 36 80 26 M92 42 Q76 44 68 36', P.oro, 7);
    k.tubo('M152 58 Q160 36 176 26 M164 42 Q180 44 188 36', P.oro, 7);
    k.p('M128 52 C166 52 182 76 180 100 C178 124 160 138 128 138 C96 138 78 124 76 100 C74 76 90 52 128 52 Z', AZ);
    k.p('M96 118 Q96 100 128 100 Q160 100 160 118 Q160 142 128 144 Q96 142 96 118 Z', AZL);
    k.c(116, 110, 3, T, { vol: 'none', borde: false, sil: false });
    k.c(140, 110, 3, T, { vol: 'none', borde: false, sil: false });
    k.p('M104 124 Q128 146 152 124 Q148 140 128 142 Q108 140 104 124 Z', '#5a1a12', { vol: 'none', sil: false, lw: 3.5 });
    k.p('M110 128 L114 138 L118 131 Z M146 128 L142 138 L138 131 Z', '#fffaf0', { vol: 'none', sil: false, lw: 2.2 });
    k.tubo('M98 118 Q60 118 44 92 Q36 76 52 68', '#f7c56b', 4);
    k.tubo('M158 118 Q196 118 212 92 Q220 76 204 68', '#f7c56b', 4);
    ojoFiero(k, 106, 86, 13, 12, { iris: P.oro, rendija: true, ang: 18, corte: 0.32, mira: [2, 0] });
    ojoFiero(k, 150, 86, 13, 12, { iris: P.oro, rendija: true, ang: -18, corte: 0.32, mira: [2, 0] });
    k.p('M84 74 Q100 58 120 70 Q104 68 88 80 Z', MA, { vol: 'none', lw: 3 });
    k.p('M172 74 Q156 58 136 70 Q152 68 168 80 Z', MA, { vol: 'none', lw: 3 });
    k.brillo(100, 64, 12, 5, -20);
    brillos(k, [[230, 28, 12], [22, 40, 9], [144, 20, 7]]);
  },
};
