// Los 42 objetos de las bolsas de la suerte (contenido/juego/catalogo.json). Lienzo 256×256.
import { PALETA as P, TINTA as T, capsula, nube, flor, chispa, estrella, poli, ojos, mofletes, bocaW, ojosFelices } from './kit.mjs';

const brillos = (k, lista, color = P.oroLuz) => { for (const [x, y, r] of lista) k.p(chispa(x, y, r), color, { vol: 'none', lw: k.IN * 0.6 }); };
const petalo = (k, x, y, rot, s = 1, color = '#f6b8c8') =>
  k.p(`M${x} ${y} q${6 * s} ${-9 * s} ${14 * s} ${-2 * s} q${-4 * s} ${9 * s} ${-14 * s} ${2 * s} z`, color, { vol: 'none', lw: 3, tr: `rotate(${rot} ${x} ${y})` });

export const OBJETOS = {
  // ─────────────── comunes ───────────────
  yunomi(k) {
    k.sombra(128, 222, 74, 12);
    k.tubo('M108 76 C96 64 104 52 114 46 C124 40 118 28 110 20', P.crema, 8);
    k.tubo('M148 78 C158 68 152 58 144 52', P.crema, 8);
    const cu = 'M72 96 L82 198 Q85 218 106 218 L150 218 Q171 218 174 198 L184 96 Z';
    k.p(cu, '#eadfc6', { vol: 'h' });
    const cl = k.clip('cu', `<path d="${cu}"/>`);
    k.p('M60 80 L196 80 L196 132 Q186 150 176 134 Q166 118 156 140 Q146 160 134 138 Q124 122 112 142 Q100 158 90 136 Q80 120 60 136 Z', '#86a04c', { vol: 'h', sil: false, clip: cl });
    k.p(cu, 'none', { vol: 'none', sil: false });
    k.linea('M84 200 Q128 210 172 200', 4, '#c9b48e');
    k.e(128, 96, 56, 17, '#efe6d0', { vol: 'none' });
    k.e(128, 99, 46, 11, '#8a9e40', { vol: 'none' });
    k.e(114, 97, 16, 3.5, '#c5d67e', { vol: 'none', borde: false, sil: false });
    k.brillo(96, 162, 7, 26, -4);
  },

  onigiri(k) {
    k.sombra(128, 222, 82, 12);
    const a = 'M128 40 C152 40 166 62 180 90 C196 122 216 160 210 188 C206 212 186 218 128 218 C70 218 50 212 46 188 C40 160 60 122 76 90 C90 62 104 40 128 40 Z';
    k.p(a, P.arroz);
    const cl = k.clip('a', `<path d="${a}"/>`);
    for (const [x, y, r] of [[102, 86, 0], [150, 94, 30], [84, 122, -20], [174, 132, 20], [124, 70, 60], [66, 160, 10], [190, 168, -30]])
      k.raw(`<ellipse cx="${x}" cy="${y}" rx="7" ry="4" transform="rotate(${r} ${x} ${y})" fill="#e6dcc4"/>`);
    k.p('M84 152 Q128 146 172 152 L178 232 L78 232 Z', '#26302a', { sil: false, clip: cl, vol: 'h' });
    k.raw(`<path d="M100 168 L103 204" stroke="#46564a" stroke-width="5" stroke-linecap="round"/>`);
    k.p(a, 'none', { vol: 'none', sil: false });
    ojos(k, [[106, 124], [150, 124]], 8);
    mofletes(k, [[92, 140], [164, 140]], 10, 6);
    bocaW(k, 128, 136, 7);
    k.brillo(100, 82, 10, 20, 35);
  },

  dango(k) {
    k.sombra(116, 228, 56, 10);
    k.tubo('M152 14 L102 238', P.bambu, 9);
    const bolas = [[140, 64, '#f4a7b9', '#e0708c'], [128, 120, P.crema, '#f2a3a3'], [116, 176, '#a3bd5b', '#e9998e']];
    for (const [x, y, c] of bolas) k.c(x, y, 36, c);
    for (const [x, y, , m] of bolas) {
      ojos(k, [[x - 11, y + 2], [x + 11, y + 2]], 4.6);
      mofletes(k, [[x - 20, y + 11], [x + 20, y + 11]], 5.5, 3.4, m);
      k.brillo(x - 15, y - 17, 9, 5, -30);
    }
  },

  zabuton(k) {
    k.sombra(128, 206, 112, 16);
    k.p('M24 150 Q128 170 232 150 Q238 172 228 188 Q128 208 28 188 Q18 172 24 150 Z', '#22375d', { vol: 'h' });
    k.p('M56 92 Q128 80 200 92 Q226 118 232 150 Q128 172 24 150 Q30 118 56 92 Z', P.anil);
    k.raw('<path d="M66 104 Q128 94 190 104 Q208 124 212 142 Q128 158 44 142 Q48 124 66 104 Z" fill="none" stroke="#86a0cc" stroke-width="3.2" stroke-dasharray="7 7" stroke-linecap="round"/>');
    for (const [x, y] of [[56, 92], [200, 92], [24, 150], [232, 150]]) {
      k.p(`M${x - 6} ${y} Q${x - 12} ${y + 20} ${x - 6} ${y + 26} L${x + 6} ${y + 26} Q${x + 12} ${y + 20} ${x + 6} ${y} Z`, P.oro, { vol: 'h', lw: 4 });
      k.c(x, y, 6, P.oro, { lw: 4 });
    }
    k.linea('M116 118 L140 132 M140 118 L116 132', 5, P.crema);
    k.c(128, 125, 6, P.crema, { lw: 4 });
    k.brillo(96, 104, 30, 8, -6, 0.8);
  },

  uchiwa(k) {
    k.sombra(118, 230, 50, 9);
    k.grupo = 'rotate(-16 128 150)';
    k.tubo('M128 164 L128 236', P.maderaClara, 14);
    k.r(114, 150, 28, 22, 7, P.maderaLuz, { vol: 'h' });
    k.c(128, 96, 78, P.crema);
    const cl = k.clip('ab', '<circle cx="128" cy="96" r="78"/>');
    let rayos = '';
    for (let i = -5; i <= 5; i++) { const a = (-90 + i * 15) * Math.PI / 180; rayos += `M128 170 L${(128 + Math.cos(a) * 200).toFixed(1)} ${(170 + Math.sin(a) * 200).toFixed(1)} `; }
    k.raw(`<path d="${rayos}" clip-path="${cl}" stroke="#e2d3b3" stroke-width="3"/>`);
    k.c(154, 70, 24, P.rojo, { sil: false });
    k.p('M40 124 Q64 106 88 124 Q112 142 136 124 Q160 106 184 124 Q208 142 232 124 L232 190 L40 190 Z', P.anil, { sil: false, clip: cl, vol: 'none' });
    let olas = '';
    for (const y of [152, 176]) for (let x = 40 + (y === 176 ? 16 : 0); x < 232; x += 32) olas += `M${x - 13} ${y} A13 13 0 0 1 ${x + 13} ${y} M${x - 7} ${y} A7 7 0 0 1 ${x + 7} ${y} `;
    k.raw(`<path d="${olas}" clip-path="${cl}" fill="none" stroke="#9fb6de" stroke-width="3.2" stroke-linecap="round"/>`);
    k.c(128, 96, 78, 'none', { sil: false });
    k.brillo(88, 58, 18, 8, -40);
  },

  chochin(k) {
    k.halo(128, 128, 124, '#ffb35c', 0.5);
    k.tubo('M128 6 L128 34', P.laca, 5);
    k.p('M92 28 L164 28 Q170 28 170 34 L170 48 L86 48 L86 34 Q86 28 92 28 Z', P.laca, { vol: 'v' });
    const cu = 'M96 46 Q30 66 30 128 Q30 190 96 210 L160 210 Q226 190 226 128 Q226 66 160 46 Z';
    k.def(`<radialGradient id="${k.id('luz')}" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffc07a" stop-opacity=".95"/><stop offset=".55" stop-color="#ff8a4a" stop-opacity=".35"/><stop offset="1" stop-color="#ff8a4a" stop-opacity="0"/></radialGradient>`);
    k.p(cu, P.rojo);
    const cl = k.clip('c', `<path d="${cu}"/>`);
    k.raw(`<path d="${cu}" fill="url(#${k.id('luz')})"/>`);
    let costillas = '';
    for (const y of [68, 90, 112, 134, 156, 178, 198]) costillas += `M20 ${y} Q128 ${y + 8} 236 ${y} `;
    k.raw(`<path d="${costillas}" clip-path="${cl}" fill="none" stroke="#a52f1c" stroke-width="3.5" opacity=".75"/>`);
    k.p(cu, 'none', { vol: 'none', sil: false });
    k.c(128, 128, 32, P.crema, { sil: false, vol: 'none' });
    k.p(flor(128, 128, 22), P.rojo, { vol: 'none', lw: 3 });
    k.c(128, 128, 5, P.oro, { vol: 'none', lw: 2.5 });
    k.p('M92 206 L164 206 Q170 206 170 212 L170 222 Q170 228 164 228 L92 228 Q86 228 86 222 L86 212 Q86 206 92 206 Z', P.laca, { vol: 'v' });
    k.p('M120 228 L136 228 L140 244 L116 244 Z', P.rojo, { vol: 'h', lw: 4 });
    k.brillo(74, 96, 12, 28, 22);
  },

  ramen(k) {
    k.sombra(128, 224, 92, 12);
    k.r(88, 196, 80, 24, 8, P.rojoOsc, { vol: 'v' });
    k.p('M26 116 Q28 198 104 212 L152 212 Q228 198 230 116 Z', P.rojo);
    k.raw('<path d="M36 152 Q128 190 220 152" fill="none" stroke="#f7efdf" stroke-width="15" stroke-linecap="round"/>');
    let meandro = '';
    for (let i = 0; i < 9; i++) { const t = 0.1 + i * 0.1, x = 36 + (220 - 36) * t, y = 152 + 38 * Math.sin(Math.PI * t) * 0.6; meandro += `M${(x - 5).toFixed(1)} ${(y + 4).toFixed(1)} l0 -8 l9 0 l0 5 l-4 0 `; }
    k.raw(`<path d="${meandro}" fill="none" stroke="#d8412a" stroke-width="2.6" stroke-linejoin="round"/>`);
    k.e(128, 116, 102, 30, P.rojo, { vol: 'none' });
    k.e(128, 118, 92, 23, '#f1e4c8', { vol: 'none' });
    k.p('M60 58 L98 66 L96 124 L58 120 Z', '#26302a', { vol: 'h' });
    k.e(128, 122, 86, 18, '#e3a043', { vol: 'none', sil: false });
    k.linea('M58 126 Q68 116 78 126 T98 126 T118 126 M70 134 Q80 124 90 134 T110 134', 5, '#f8d97e');
    k.e(158, 114, 23, 15, P.arroz);
    k.e(160, 114, 11, 8, '#f09a2e', { vol: 'none', lw: 3.5 });
    k.e(112, 118, 19, 12, P.arroz);
    k.raw('<path d="M112 118 m-9 0 a9 5.5 0 1 1 9 5.5 a5.5 3.5 0 1 1 -3.5 -3.5" fill="none" stroke="#ef7d98" stroke-width="3.4" stroke-linecap="round"/>');
    for (const [x, y] of [[136, 130], [88, 128], [186, 124], [140, 108]]) k.c(x, y, 5, P.teLuz, { vol: 'none', lw: 3, sil: false });
    k.tubo('M134 116 L214 26', P.maderaClara, 8);
    k.tubo('M150 120 L236 42', P.maderaClara, 8);
    k.brillo(56, 156, 9, 20, 30);
  },

  cuaderno(k) {
    k.sombra(128, 216, 114, 12);
    k.p('M14 100 Q72 80 128 100 Q184 80 242 100 L242 214 Q184 196 128 218 Q72 196 14 214 Z', P.naranja, { vol: 'v' });
    const iz = 'M24 92 Q76 74 126 94 L126 206 Q76 188 24 204 Z', de = 'M130 94 Q180 74 232 92 L232 204 Q180 188 130 206 Z';
    k.p(iz, P.papel, { vol: 'h', sil: false });
    k.p(de, P.papel, { vol: 'h', sil: false });
    const ci = k.clip('i', `<path d="${iz}"/>`), cd = k.clip('d', `<path d="${de}"/>`);
    let r = '';
    for (const x of [44, 84, 104]) r += `M${x} 60 L${x} 230 `;
    for (const y of [120, 160, 200]) r += `M0 ${y} Q76 ${y - 18} 128 ${y} Q184 ${y - 18} 256 ${y} `;
    k.raw(`<path d="${r}" clip-path="${ci}" fill="none" stroke="#e6a99b" stroke-width="2.4"/>`);
    k.raw(`<path d="${r} M150 60 L150 230 M190 60 L190 230" clip-path="${cd}" fill="none" stroke="#e6a99b" stroke-width="2.4"/>`);
    k.p(iz, 'none', { vol: 'none', sil: false });
    k.p(de, 'none', { vol: 'none', sil: false });
    k.raw(`<path d="M80 102 Q86 104 84 112 Q80 152 50 180 Q44 184 44 178 Q70 150 72 112 Q72 102 80 102 Z M80 134 Q96 164 116 176 Q120 182 112 183 Q92 174 74 140 Z" fill="${T}"/>`);
    k.raw(`<path d="M156 110 L176 110 M166 102 Q166 124 156 136 M200 108 Q210 118 204 132" fill="none" stroke="#7d7263" stroke-width="4" stroke-linecap="round"/>`);
    k.p(poli([[150, 190], [166, 176], [140, 206]]), '#ecd2a0', { vol: 'none', lw: 4.5 });
    k.p(poli([[140, 206], [146, 196], [150, 200]]), T, { vol: 'none', lw: 3 });
    k.p(capsula(160, 182, 222, 122, 20), P.oro, { vol: 'h' });
    k.p(capsula(216, 128, 232, 112, 20), '#f3a0a8', { vol: 'h' });
    k.brillo(56, 100, 16, 5, -16, 0.7);
  },

  fude(k) {
    k.sombra(128, 216, 92, 10);
    k.c(176, 206, 9, '#3a302a', { vol: 'r' });
    k.c(200, 192, 5.5, '#3a302a', { vol: 'none' });
    k.c(150, 216, 5, '#3a302a', { vol: 'none' });
    k.tubo('M214 30 Q236 10 222 4 Q206 2 208 26', P.rojo, 4);
    k.p(capsula(212, 34, 112, 134, 26), P.bambu, { vol: 'r' });
    for (const t of [0.22, 0.55, 0.82]) {
      const x = 212 + (112 - 212) * t, y = 34 + (134 - 34) * t;
      k.linea(`M${x - 9} ${y - 9} L${x + 9} ${y + 9}`, 4, '#b58f4c');
    }
    k.p(capsula(118, 128, 98, 148, 30), '#3a2b20', { vol: 'r' });
    k.p('M92 138 C74 150 56 184 42 216 C68 204 104 182 110 156 Q104 142 92 138 Z', '#3b312b', { vol: 'r' });
    k.brillo(158, 82, 5, 34, 45);
    k.brillo(78, 168, 3.5, 13, 50);
  },

  hanko(k) {
    k.sombra(140, 214, 104, 12);
    k.p('M112 150 L222 130 Q229 129 230 136 L238 194 Q239 201 232 202 L124 222 Q117 223 116 216 L108 158 Q107 151 112 150 Z', P.papel, { vol: 'v' });
    k.raw(`<g transform="rotate(-10 176 174)" fill="#d8412a" opacity=".92"><ellipse cx="176" cy="174" rx="31" ry="29" fill="none" stroke="#d8412a" stroke-width="6"/><ellipse cx="176" cy="182" rx="11" ry="9"/><ellipse cx="162" cy="166" rx="5" ry="6.5"/><ellipse cx="171" cy="159" rx="5" ry="6.5"/><ellipse cx="181" cy="159" rx="5" ry="6.5"/><ellipse cx="190" cy="166" rx="5" ry="6.5"/></g>`);
    k.p('M60 74 Q60 40 92 40 Q124 40 124 74 L128 188 Q128 198 118 198 L70 198 Q60 198 60 188 Z', '#efe1c2', { vol: 'h' });
    k.linea('M62 84 Q92 94 122 84', 4, '#c9b48a');
    k.p('M60 180 L128 180 L128 190 Q128 202 116 202 L72 202 Q60 202 60 190 Z', P.rojo, { vol: 'h', sil: false });
    k.c(92, 112, 5, P.rojo, { vol: 'none', lw: 3 });
    k.brillo(76, 120, 7, 34, 0);
  },

  geta(k) {
    k.sombra(128, 218, 112, 12);
    const una = (tr, tono) => {
      k.r(42, 162, 26, 36, 6, P.madera, { tr, vol: 'h' });
      k.r(146, 162, 26, 36, 6, P.madera, { tr, vol: 'h' });
      k.p('M24 148 Q24 140 34 140 L190 140 Q202 140 202 150 L202 160 Q202 170 192 170 L34 170 Q24 170 24 160 Z', tono, { tr, vol: 'v' });
      k.raw(`<path d="M40 150 Q100 146 180 152 M50 160 Q110 158 170 162" transform="${tr}" fill="none" stroke="#a87a44" stroke-width="3" stroke-linecap="round"/>`);
      k.tubo('M52 142 Q68 98 108 102 Q142 106 152 142', P.rojo, 13, { tr });
      k.raw(`<path d="M62 126 Q76 106 104 108" transform="${tr}" fill="none" stroke="#f08a70" stroke-width="3.5" stroke-linecap="round"/>`);
      k.c(52, 142, 8, P.rojo, { tr, lw: 4 });
    };
    una('translate(44 -30) scale(.9)', '#c28f55');
    una('translate(6 24)', P.maderaClara);
    k.brillo(56, 170, 16, 4, 0, 0.7);
  },

  furin(k) {
    k.tubo('M128 6 L128 44', '#8d6a4a', 4);
    const cam = 'M70 120 Q68 50 128 46 Q188 50 186 120 L186 124 Q186 130 180 130 L76 130 Q70 130 70 124 Z';
    k.p(cam, '#d9f0f4', { op: 0.93 });
    k.c(128, 46, 7, P.oro, { lw: 4 });
    k.p('M96 90 Q108 76 124 86 Q114 98 96 90 Z M124 86 L134 78 L132 94 Z', P.naranja, { sil: false, vol: 'none', lw: 3 });
    k.p('M150 78 Q160 70 170 80 Q160 88 150 78 Z M170 80 L178 74 L177 86 Z', P.rojo, { sil: false, vol: 'none', lw: 3 });
    k.raw('<path d="M74 114 Q128 124 182 114" fill="none" stroke="#d8412a" stroke-width="7" stroke-linecap="round"/>');
    k.e(128, 128, 54, 8, '#9cc6cf', { vol: 'none' });
    k.tubo('M128 128 L128 162', '#8d6a4a', 3);
    k.c(128, 146, 8, '#bfe3ea', { lw: 4 });
    k.p('M112 160 L144 160 Q146 198 152 234 Q136 240 120 238 Q116 200 112 160 Z', '#f6d7a8', { vol: 'h' });
    k.raw('<path d="M122 186 Q130 180 138 186 Q130 194 122 186 M124 208 Q132 202 140 208" fill="none" stroke="#2f4a7a" stroke-width="3" stroke-linecap="round"/>');
    k.brillo(94, 78, 9, 24, 30);
    k.punto(162, 66, 5, 0.9);
  },

  mikan(k) {
    k.sombra(128, 218, 104, 13);
    const m = (cx, cy, rx, ry) => {
      k.e(cx, cy, rx, ry, P.mikan);
      let pts = '';
      for (let i = 0; i < 14; i++) { const a = i * 2.4, r = 0.3 + ((i * 37) % 10) / 16; pts += `<circle cx="${(cx + Math.cos(a) * rx * r * 0.85).toFixed(1)}" cy="${(cy + Math.sin(a) * ry * r * 0.85).toFixed(1)}" r="1.8" fill="#d97a10" opacity=".55"/>`; }
      k.raw(pts);
      k.p(estrella(cx, cy - ry + 5, 10, 4.5, 5), P.hoja, { vol: 'none', lw: 3.5 });
      k.brillo(cx - rx * 0.42, cy - ry * 0.46, rx * 0.22, ry * 0.15, -30);
    };
    m(160, 118, 62, 54);
    k.p('M162 66 Q178 30 216 36 Q200 70 162 66 Z', P.te);
    k.linea('M166 62 Q186 48 206 42', 3, '#4f6326');
    m(94, 166, 60, 50);
    k.p('M96 118 Q82 88 50 92 Q62 120 96 118 Z', P.teLuz);
    k.linea('M92 114 Q76 102 58 96', 3, '#5c7229');
    ojos(k, [[78, 170], [112, 170]], 6.5);
    mofletes(k, [[66, 184], [124, 184]], 9, 5, '#e8603a', 0.7);
    bocaW(k, 95, 180, 6);
  },

  senbei(k) {
    k.sombra(128, 216, 104, 12);
    k.e(112, 188, 82, 28, '#8a5526', { vol: 'h' });
    k.e(112, 180, 82, 27, '#c9853f');
    k.raw('<g fill="#9a5f2a" opacity=".7"><circle cx="84" cy="176" r="3"/><circle cx="130" cy="186" r="2.5"/><circle cx="150" cy="172" r="3"/><circle cx="100" cy="190" r="2"/><circle cx="66" cy="186" r="2.5"/></g>');
    const tr = 'rotate(12 160 112)';
    k.e(166, 116, 64, 68, '#8a5526', { tr });
    k.e(158, 112, 64, 68, '#c47f3c', { tr });
    const cl = k.clip('s', '<ellipse cx="158" cy="112" rx="64" ry="68"/>');
    k.r(138, 30, 40, 170, 3, '#26302a', { tr, clip: cl, sil: false, vol: 'h' });
    k.e(158, 112, 64, 68, 'none', { tr, vol: 'none', sil: false });
    k.raw(`<g transform="${tr}" fill="#9a5f2a" opacity=".7"><circle cx="118" cy="92" r="3"/><circle cx="196" cy="84" r="2.5"/><circle cx="118" cy="140" r="2.5"/><circle cx="198" cy="136" r="3"/><circle cx="108" cy="116" r="2"/></g>`);
    k.brillo(118, 74, 12, 20, 20);
    k.brillo(74, 170, 18, 5, -4, 0.7);
  },

  // ─────────────── raros ───────────────
  bonsai(k) {
    k.sombra(128, 224, 98, 12);
    k.tubo('M124 184 Q120 150 100 132 Q84 116 104 100 Q124 86 152 88', '#7a5237', 18);
    k.tubo('M102 128 Q82 122 70 116', '#7a5237', 10);
    k.tubo('M140 92 Q146 70 124 60', '#7a5237', 8);
    for (const [cx, cy, rx, ry, n, fa] of [[74, 110, 46, 24, 7, 0.3], [164, 84, 54, 28, 8, 0.2], [118, 52, 40, 21, 6, 0.4]]) {
      k.p(nube(cx, cy, rx, ry, n, fa), P.te);
      k.p(nube(cx - 6, cy - 6, rx * 0.62, ry * 0.5, n, fa), P.teLuz, { sil: false, borde: false, vol: 'none' });
    }
    k.p('M72 172 Q128 154 184 172 Z', '#5d6d2e', { vol: 'none' });
    k.r(66, 212, 20, 12, 4, P.anil, { vol: 'none' });
    k.r(170, 212, 20, 12, 4, P.anil, { vol: 'none' });
    k.p('M56 178 L200 178 L188 212 Q186 218 178 218 L78 218 Q70 218 68 212 Z', P.anil, { vol: 'h' });
    k.r(46, 166, 164, 18, 8, P.anilLuz, { vol: 'v' });
    k.brillo(84, 194, 5, 11, 0);
  },

  daruma(k) {
    k.sombra(128, 226, 92, 12);
    const cu = 'M128 24 C194 24 228 84 224 140 C220 200 180 228 128 228 C76 228 36 200 32 140 C28 84 62 24 128 24 Z';
    k.p(cu, P.rojo);
    k.p('M60 184 Q128 214 196 184 Q186 212 128 222 Q70 212 60 184 Z', P.oro, { sil: false, vol: 'none', lw: 4 });
    k.linea('M52 150 Q46 118 64 94 M204 150 Q210 118 192 94', 7, P.oro);
    k.linea('M62 170 Q60 158 66 148 M194 170 Q196 158 190 148', 5, P.oro);
    k.p('M128 56 C168 56 186 84 184 112 C182 148 160 166 128 166 C96 166 74 148 72 112 C70 84 88 56 128 56 Z', P.crema, { sil: false });
    k.linea('M84 84 Q100 68 120 80', 8);
    k.linea('M136 80 Q156 68 172 84', 8);
    k.c(104, 108, 18, '#fff', { sil: false, vol: 'none' });
    k.c(104, 109, 10, T, { sil: false, vol: 'none', borde: false });
    k.punto(100, 104, 3.5);
    k.c(152, 108, 18, '#fff', { sil: false, vol: 'none' });
    k.linea('M104 142 Q116 132 128 140 Q140 132 152 142', 6);
    k.linea('M110 152 Q128 160 146 152', 4);
    k.brillo(74, 66, 13, 26, 38);
  },

  'gato-suerte'(k) {
    k.sombra(128, 226, 82, 12);
    k.p(capsula(172, 164, 194, 96, 36), P.arroz);
    k.p('M72 150 Q58 214 86 222 L170 222 Q198 214 184 150 Z', P.arroz);
    k.c(196, 84, 22, P.arroz);
    for (const [x, y] of [[188, 76], [198, 72], [206, 80]]) k.c(x, y, 3.5, '#f2a3a3', { sil: false, borde: false, vol: 'none' });
    k.p('M70 76 L80 24 L114 58 Z', P.arroz);
    k.p('M142 58 L176 24 L186 76 Z', P.arroz);
    k.p('M82 62 L86 38 L102 56 Z', '#f2a3a3', { sil: false, borde: false, vol: 'none' });
    k.p('M154 56 L170 38 L174 62 Z', '#f2a3a3', { sil: false, borde: false, vol: 'none' });
    k.p('M76 144 Q128 164 180 144 L180 158 Q128 178 76 158 Z', P.rojo, { vol: 'v' });
    const cabeza = '<ellipse cx="128" cy="96" rx="70" ry="56"/>';
    k.e(128, 96, 70, 56, P.arroz);
    const cl = k.clip('cab', cabeza);
    k.p('M48 40 L118 40 Q120 70 96 80 Q66 86 48 70 Z', P.mikan, { sil: false, clip: cl, vol: 'none', borde: false });
    k.p('M168 60 Q190 50 200 70 L200 110 Q180 104 170 90 Q160 72 168 60 Z', '#4a3a30', { sil: false, clip: cl, vol: 'none', borde: false });
    k.e(128, 96, 70, 56, 'none', { vol: 'none', sil: false });
    ojosFelices(k, [[104, 98], [152, 98]], 11, 6);
    mofletes(k, [[88, 116], [168, 116]], 11, 6);
    k.p('M122 108 L134 108 L128 115 Z', '#e8757d', { sil: false, vol: 'none', lw: 3 });
    k.linea('M118 120 Q123 126 128 120 Q133 126 138 120', 4);
    k.linea('M64 106 L40 100 M64 116 L42 120 M192 106 L216 100 M192 116 L214 120', 3.2);
    k.c(128, 172, 14, P.oro);
    k.linea('M128 176 L128 186', 3.5);
    k.linea('M116 168 L140 168', 3);
    k.e(96, 190, 22, 30, P.oro, { tr: 'rotate(-14 96 190)' });
    k.raw('<g transform="rotate(-14 96 190)" fill="none" stroke="#c98a1c" stroke-width="3" stroke-linecap="round"><path d="M84 176 L108 176 M82 190 L110 190 M84 204 L108 204"/></g>');
    k.e(110, 176, 16, 12, P.arroz);
    k.brillo(96, 60, 16, 8, -24);
  },

  kotatsu(k) {
    k.sombra(128, 222, 120, 12);
    const fu = 'M20 118 L236 118 L248 196 Q232 212 212 202 Q190 216 170 204 Q148 218 128 206 Q108 218 86 204 Q66 216 44 202 Q24 212 8 196 Z';
    k.p(fu, P.rojo, { vol: 'v' });
    const cl = k.clip('fu', `<path d="${fu}"/>`);
    let lunares = '';
    for (let y = 136; y < 220; y += 24) for (let x = 20 + ((y / 24) % 2) * 20; x < 250; x += 40) lunares += `<path d="${flor(x, y, 8)}"/>`;
    k.raw(`<g clip-path="${cl}" fill="#f5c9a0" opacity=".85">${lunares}</g>`);
    k.p(fu, 'none', { vol: 'none', sil: false });
    k.c(108, 70, 19, P.mikan);
    k.c(146, 68, 19, P.mikan);
    k.c(127, 52, 18, P.mikan);
    for (const [x, y] of [[108, 52], [146, 50], [127, 35]]) k.c(x, y, 3.5, P.hoja, { vol: 'none', lw: 3 });
    k.p('M86 74 L170 74 Q166 98 128 100 Q90 98 86 74 Z', P.crema, { vol: 'h' });
    k.p('M44 90 L212 90 L240 116 L16 116 Z', '#b07f4c', { vol: 'v' });
    k.p('M86 74 L170 74 Q166 98 128 100 Q90 98 86 74 Z', P.crema, { vol: 'h', sil: false });
    k.raw('<path d="M92 84 Q128 92 164 84" fill="none" stroke="#2f4a7a" stroke-width="4" stroke-linecap="round"/>');
    k.r(14, 112, 228, 16, 5, '#7a5237', { vol: 'h' });
    k.brillo(64, 100, 20, 4, 0, 0.7);
  },

  'sushi-geta'(k) {
    k.sombra(128, 218, 112, 12);
    k.r(44, 174, 24, 32, 5, P.madera, { vol: 'h' });
    k.r(188, 174, 24, 32, 5, P.madera, { vol: 'h' });
    k.p('M40 126 L216 126 L236 164 L20 164 Z', '#d2a86e', { vol: 'v' });
    k.r(18, 160, 220, 22, 7, '#a8793f', { vol: 'h' });
    k.raw('<path d="M50 138 L206 138 M40 150 L220 150" fill="none" stroke="#b88a52" stroke-width="3" stroke-linecap="round"/>');
    const nigiri = (cx, pez, raya) => {
      k.p(nube(cx, 138, 42, 20, 9, 0.2, 0.5), P.arroz);
      k.p(`M${cx - 48} 132 Q${cx - 44} 100 ${cx} 102 Q${cx + 44} 102 ${cx + 48} 126 Q${cx + 44} 138 ${cx} 138 Q${cx - 42} 140 ${cx - 48} 132 Z`, pez);
      k.raw(`<path d="M${cx - 24} 108 Q${cx - 16} 120 ${cx - 22} 134 M${cx} 104 Q${cx + 8} 118 ${cx + 2} 136 M${cx + 22} 106 Q${cx + 30} 118 ${cx + 26} 132" fill="none" stroke="${raya}" stroke-width="4" stroke-linecap="round"/>`);
      k.brillo(cx - 22, 110, 12, 4, -10);
    };
    nigiri(84, '#e0584a', '#f4a092');
    nigiri(166, '#f58a4a', '#fde0c8');
    k.p('M206 146 Q214 130 226 142 Q222 154 206 146 Z', '#f5b9b0', { lw: 4 });
    k.p('M124 150 Q126 140 136 142 Q140 150 132 154 Q124 156 124 150 Z', P.teLuz, { lw: 4 });
  },

  kyusu(k) {
    k.sombra(128, 222, 94, 12);
    k.p('M72 150 Q46 138 32 104 L22 98 Q18 90 28 88 L46 92 Q58 122 86 126 Z', '#a8532e', { vol: 'h' });
    k.p(capsula(176, 132, 236, 98, 26), '#a8532e');
    k.e(236, 98, 7, 13, '#8c3f22', { tr: 'rotate(-30 236 98)', vol: 'none', lw: 4 });
    k.e(124, 150, 76, 64, '#b45c33');
    k.raw('<path d="M58 172 Q124 196 190 172" fill="none" stroke="#8c3f22" stroke-width="4" stroke-linecap="round"/>');
    k.raw('<path d="M84 132 Q96 118 110 128 Q98 138 84 132 Z M110 128 Q124 116 138 126" fill="none" stroke="#e39a6c" stroke-width="3.4" stroke-linecap="round"/>');
    k.e(124, 94, 50, 15, '#8c3f22', { vol: 'none' });
    k.e(124, 90, 42, 12, '#c26a3d', { vol: 'none' });
    k.p('M114 88 Q112 70 124 70 Q136 70 134 88 Z', '#c26a3d', { vol: 'h' });
    k.brillo(88, 120, 14, 26, 30);
    k.punto(60, 106, 3.5, 0.7);
  },

  kendama(k) {
    k.sombra(128, 224, 64, 10);
    k.tubo('M120 176 Q176 210 204 156 Q222 118 196 102', P.crema, 3.5, { sil: false });
    k.p(capsula(118, 112, 118, 214, 26), '#e7c690', { vol: 'h' });
    k.e(118, 214, 16, 6, '#b88a50', { vol: 'none', lw: 4 });
    k.p('M108 110 L118 44 L128 110 Z', '#e7c690', { vol: 'h' });
    k.p(capsula(64, 124, 172, 124, 30), '#d9b77a', { vol: 'v' });
    k.e(60, 124, 9, 22, '#b88a50', { vol: 'none', lw: 4 });
    k.e(176, 124, 6, 15, '#b88a50', { vol: 'none', lw: 4 });
    k.c(188, 70, 40, P.rojo);
    k.raw('<path d="M152 56 Q188 86 226 64" fill="none" stroke="#f7efdf" stroke-width="5" stroke-linecap="round"/>');
    k.e(176, 94, 9, 6, '#5a1a12', { vol: 'none', lw: 3.5 });
    k.brillo(172, 50, 11, 7, -30);
    k.brillo(106, 170, 4, 24, 0);
  },

  orizuru(k) {
    k.sombra(128, 216, 88, 10);
    k.p(poli([[120, 150], [190, 34], [170, 158]]), '#d4607e', { vol: 'none' });
    k.p(poli([[158, 174], [234, 92], [138, 160]]), '#e3738f', { vol: 'none' });
    k.p(poli([[64, 172], [128, 134], [192, 172], [128, 210]]), '#f7b7c5', { vol: 'v' });
    k.linea('M128 136 L128 208', 3.4, '#d6607c');
    k.p(poli([[98, 178], [44, 80], [126, 164]]), '#e3738f', { vol: 'none' });
    k.p(poli([[44, 80], [20, 110], [68, 98]]), '#d4607e', { vol: 'none' });
    k.p(poli([[142, 156], [74, 22], [96, 170]]), '#f49ab0', { vol: 'v' });
    k.linea('M78 32 L118 160', 3.4, '#e07a94');
    k.brillo(100, 168, 18, 5, -28, 0.8);
  },

  radicasete(k) {
    k.sombra(128, 214, 112, 12);
    k.tubo('M200 72 L238 20', '#c8c4ba', 4);
    k.c(238, 20, 6, '#c8c4ba');
    k.p('M60 90 L60 62 Q60 48 74 48 L182 48 Q196 48 196 62 L196 90 L180 90 L180 64 L76 64 L76 90 Z', '#3a3035', { vol: 'v' });
    for (const [x, c] of [[92, P.naranja], [114, P.crema], [136, P.rojo], [158, P.crema]]) k.r(x, 72, 16, 14, 3, c, { vol: 'v', lw: 4 });
    k.r(20, 82, 216, 124, 24, '#e2d6bd');
    k.r(36, 94, 184, 12, 6, P.papel, { vol: 'none', lw: 4, sil: false });
    k.raw('<path d="M60 100 L60 104 M84 100 L84 104 M108 100 L108 104 M132 100 L132 104 M156 100 L156 104 M180 100 L180 104" stroke="#8d7f6a" stroke-width="2.4"/>');
    k.r(140, 95, 4, 10, 2, P.naranja, { sil: false, vol: 'none', borde: false });
    for (const x of [72, 184]) {
      k.c(x, 156, 36, '#3a3035', { sil: false });
      k.c(x, 156, 23, '#5a4d53', { sil: false, lw: 4 });
      k.c(x, 156, 8, '#9a8d92', { sil: false, lw: 3.5 });
    }
    k.r(112, 122, 32, 64, 6, '#3a3035', { sil: false, vol: 'none' });
    k.r(117, 130, 22, 22, 3, '#6f6468', { sil: false, vol: 'none', lw: 3 });
    k.c(123, 141, 4, P.crema, { sil: false, vol: 'none', lw: 2 });
    k.c(133, 141, 4, P.crema, { sil: false, vol: 'none', lw: 2 });
    k.brillo(44, 112, 7, 20, 10);
  },

  consola(k) {
    k.sombra(128, 208, 112, 12);
    k.r(18, 70, 220, 128, 42, P.naranja);
    k.r(70, 86, 116, 92, 12, '#3b3542', { vol: 'none' });
    k.r(82, 96, 92, 68, 6, '#a4c25a', { sil: false, vol: 'none', lw: 4 });
    const px = [[0, 0], [4, 0], [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [0, 2], [2, 2], [4, 2], [0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [1, 4], [2, 4], [3, 4], [5, 3], [6, 2]];
    k.raw(`<g fill="#3e5a22">${px.map(([x, y]) => `<rect x="${108 + x * 7}" y="${114 + y * 7}" width="7" height="7"/>`).join('')}<rect x="82" y="150" width="92" height="7"/></g>`);
    k.p('M40 124 h12 v-12 h12 v12 h12 v12 h-12 v12 h-12 v-12 h-12 Z', '#3b3542', { vol: 'none', lw: 4 });
    k.c(214, 118, 11, P.rojo);
    k.c(196, 144, 11, P.rojo);
    k.r(104, 184, 18, 7, 3.5, '#3b3542', { vol: 'none', sil: false, lw: 3 });
    k.r(134, 184, 18, 7, 3.5, '#3b3542', { vol: 'none', sil: false, lw: 3 });
    k.raw('<path d="M200 170 L218 160 M206 178 L224 168 M212 186 L226 178" stroke="#b8480f" stroke-width="3.4" stroke-linecap="round"/>');
    k.brillo(92, 104, 10, 4, -20, 0.6);
    k.brillo(40, 92, 14, 6, -30);
  },

  // ─────────────── épicos ───────────────
  kingyo(k) {
    k.sombra(128, 228, 86, 12);
    const bol = 'M66 72 Q40 102 42 148 Q46 216 128 220 Q210 216 214 148 Q216 102 190 72 Z';
    const cl = k.clip('bol', `<path d="${bol}"/>`);
    k.p(bol, '#e6f4f7', { op: 0.6, vol: 'none', borde: false });
    k.p('M30 106 Q64 98 96 106 Q128 114 160 106 Q192 98 226 106 L226 232 L30 232 Z', '#7cc2d6', { sil: false, clip: cl, op: 0.85, vol: 'v', lw: 4 });
    for (const [x, y, r, c] of [[70, 204, 10, '#f2a3a3'], [92, 212, 9, P.crema], [150, 212, 11, P.teLuz], [178, 204, 9, P.oro], [120, 214, 8, '#8fb3cf']]) k.c(x, y, r, c, { sil: false, clip: cl, lw: 3.5 });
    k.p('M68 206 Q56 172 72 144 Q80 170 78 206 Z M184 204 Q196 176 186 150 Q176 174 176 204 Z', P.te, { sil: false, clip: cl, lw: 4 });
    k.p('M168 150 Q190 120 206 130 Q194 150 206 172 Q190 180 168 150 Z', '#f7a070', { vol: 'none', lw: 4.5 });
    k.p('M98 150 Q110 124 138 128 Q164 134 170 150 Q164 166 138 172 Q110 176 98 150 Z', P.naranja);
    k.p('M128 128 Q138 112 152 124 Z', '#f7a070', { vol: 'none', lw: 4 });
    k.c(114, 144, 5, T, { vol: 'none', borde: false, sil: false });
    k.punto(113, 142, 1.8);
    k.raw('<g fill="none" stroke="#fff" stroke-width="3"><circle cx="92" cy="122" r="6"/><circle cx="84" cy="100" r="4"/></g>');
    k.p(bol, 'none', { vol: 'none', sil: false });
    k.e(128, 72, 66, 15, '#e6f4f7', { op: 0.85, vol: 'none' });
    k.e(128, 73, 54, 9, '#bfdde5', { vol: 'none', sil: false, lw: 4 });
    k.brillo(66, 134, 7, 30, 10);
    k.punto(186, 104, 4.5);
    brillos(k, [[222, 70, 12]]);
  },

  'tele-crt'(k) {
    k.sombra(128, 228, 106, 12);
    k.tubo('M120 62 L76 12', '#b9b4aa', 4);
    k.tubo('M136 62 L184 16', '#b9b4aa', 4);
    k.c(76, 12, 6, '#b9b4aa');
    k.c(184, 16, 6, '#b9b4aa');
    k.e(128, 62, 24, 11, '#3a3035', { vol: 'v' });
    k.r(44, 206, 18, 22, 5, '#4a3526');
    k.r(194, 206, 18, 22, 5, '#4a3526');
    k.r(20, 62, 216, 150, 28, '#8a5a36');
    k.r(178, 78, 44, 118, 12, '#e2d6bd', { vol: 'v', sil: false });
    k.c(200, 104, 13, '#3a3035', { sil: false });
    k.linea('M200 104 L200 94', 3.5, P.crema);
    k.c(200, 138, 9, '#3a3035', { sil: false });
    k.raw('<path d="M188 164 L212 164 M188 174 L212 174 M188 184 L212 184" stroke="#8d7f6a" stroke-width="3.4" stroke-linecap="round"/>');
    k.r(34, 76, 136, 122, 30, '#3a3035', { sil: false, vol: 'none' });
    k.def(`<linearGradient id="${k.id('cielo')}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#f9d27a"/><stop offset=".55" stop-color="#f28a5c"/><stop offset="1" stop-color="#b35a78"/></linearGradient>`);
    const pant = '<rect x="44" y="86" width="116" height="102" rx="24"/>';
    const cl = k.clip('p', pant);
    k.r(44, 86, 116, 102, 24, `url(#${k.id('cielo')})`, { sil: false, vol: 'none' });
    k.raw(`<g clip-path="${cl}"><circle cx="102" cy="136" r="22" fill="#fff1c2"/><path d="M40 190 L40 164 L72 148 L92 158 L122 140 L164 162 L164 190 Z" fill="#5b3a5e"/><path d="M40 190 L40 174 L90 166 L164 176 L164 190 Z" fill="#3d2745"/></g>`);
    let sl = '';
    for (let y = 90; y < 188; y += 6) sl += `M44 ${y} L160 ${y} `;
    k.raw(`<path d="${sl}" clip-path="${cl}" stroke="#2a211a" stroke-width="1.6" opacity=".22"/>`);
    k.raw(`<path d="M54 120 Q60 96 88 92" clip-path="${cl}" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" opacity=".45"/>`);
    k.r(44, 86, 116, 102, 24, 'none', { sil: false, vol: 'none' });
    k.brillo(30, 110, 5, 22, 0, 0.8);
  },

  andon(k) {
    k.halo(128, 124, 126, '#ffd98a', 0.7);
    k.sombra(128, 230, 74, 10);
    k.r(70, 196, 16, 34, 4, P.madera, { vol: 'h' });
    k.r(170, 196, 16, 34, 4, P.madera, { vol: 'h' });
    k.def(`<radialGradient id="${k.id('papel')}" cx=".5" cy=".55" r=".6"><stop offset="0" stop-color="#fffbe8"/><stop offset=".6" stop-color="#ffe6a6"/><stop offset="1" stop-color="#f4c776"/></radialGradient>`);
    k.p('M76 58 L132 64 L132 204 L76 198 Z', `url(#${k.id('papel')})`, { vol: 'none' });
    k.p('M132 64 L184 58 L184 198 L132 204 Z', '#f2c878', { vol: 'none' });
    k.raw('<path d="M76 104 L132 110 L184 104 M76 152 L132 158 L184 152" fill="none" stroke="#6f4c30" stroke-width="5" stroke-linejoin="round"/>');
    k.raw('<path d="M104 62 L104 200 M158 62 L158 200" fill="none" stroke="#6f4c30" stroke-width="3" opacity=".7"/>');
    k.tubo('M132 64 L132 204', P.madera, 7);
    k.tubo('M100 38 Q132 10 164 38', P.madera, 6);
    k.p('M60 46 L132 36 L200 46 L200 56 L132 68 L60 56 Z', P.madera, { vol: 'v' });
    k.p('M66 196 L132 204 L194 196 L194 208 L132 216 L66 208 Z', P.madera, { vol: 'v' });
    k.c(110, 132, 10, '#fff7d6', { sil: false, borde: false, vol: 'none', op: 0.8 });
  },

  byobu(k) {
    k.sombra(128, 222, 118, 12);
    const xs = [16, 72, 128, 184, 240], arr = [40, 58, 40, 58, 40], ab = [214, 198, 214, 198, 214];
    const paneles = [];
    for (let i = 0; i < 4; i++) paneles.push(poli([[xs[i], arr[i]], [xs[i + 1], arr[i + 1]], [xs[i + 1], ab[i + 1]], [xs[i], ab[i]]]));
    const cl = k.clip('pan', paneles.map((d) => `<path d="${d}"/>`).join(''));
    paneles.forEach((d, i) => k.p(d, i % 2 ? '#cf9c34' : '#f0c35a', { vol: 'none', lw: 5 }));
    k.raw(`<g clip-path="${cl}"><path d="${nube(70, 84, 56, 14, 9, 0.2, 0.55)}" fill="#fbe29a" opacity=".9"/><path d="${nube(184, 118, 64, 14, 9, 0.5, 0.55)}" fill="#fbe29a" opacity=".9"/>`
      + '<path d="M0 186 Q40 170 80 184 Q120 198 160 180 Q200 164 256 182 L256 230 L0 230 Z" fill="#2f4a7a"/><path d="M0 196 Q40 182 80 194 Q120 206 160 190 Q200 176 256 192" fill="none" stroke="#86a0cc" stroke-width="3.5"/></g>');
    const grulla = (x, y, s) => {
      k.p(`M${x} ${y} Q${x + 20 * s} ${y - 34 * s} ${x + 48 * s} ${y - 30 * s} Q${x + 30 * s} ${y - 8 * s} ${x + 16 * s} ${y + 4 * s} Z`, '#fffaf0', { vol: 'none', lw: 3.5, sil: false });
      k.e(x + 6 * s, y + 2 * s, 17 * s, 7 * s, '#fffaf0', { vol: 'none', lw: 3.5, sil: false, tr: `rotate(-12 ${x} ${y})` });
      k.linea(`M${x - 8 * s} ${y + 2 * s} L${x - 28 * s} ${y - 8 * s}`, 3.5);
      k.c(x - 29 * s, y - 9 * s, 3.4 * s, P.rojo, { vol: 'none', lw: 2.5, sil: false });
    };
    grulla(80, 136, 1);
    grulla(170, 84, 0.8);
    for (let i = 0; i < 4; i++) k.p(poli([[xs[i], ab[i] - 10], [xs[i + 1], ab[i + 1] - 10], [xs[i + 1], ab[i + 1]], [xs[i], ab[i]]]), P.laca, { vol: 'none', lw: 4, sil: false });
    paneles.forEach((d) => k.p(d, 'none', { vol: 'none', sil: false, lw: 5 }));
    k.brillo(44, 70, 10, 26, 0, 0.7);
  },

  katanakake(k) {
    k.sombra(128, 218, 100, 12);
    k.grupo = 'translate(128 128) scale(.9) translate(-128 -128)';
    for (const x of [58, 198]) {
      k.p(`M${x - 11} 200 L${x - 11} 78 Q${x - 11} 62 ${x} 62 Q${x + 11} 62 ${x + 11} 78 L${x + 11} 200 Z`, '#b3321f', { vol: 'h' });
      k.r(x - 16, 106, 32, 8, 4, P.laca, { vol: 'none', lw: 4 });
      k.r(x - 16, 156, 32, 8, 4, P.laca, { vol: 'none', lw: 4 });
    }
    k.r(20, 196, 216, 22, 9, P.laca, { vol: 'v' });
    const espada = (x0, x1, y, tsuka) => {
      k.p(`M${x0 + tsuka + 8} ${y - 7} Q${(x0 + x1) / 2} ${y - 16} ${x1} ${y - 11} Q${x1 + 6} ${y - 8} ${x1 + 2} ${y - 2} Q${(x0 + x1) / 2} ${y - 4} ${x0 + tsuka + 8} ${y + 6} Z`, '#2c2320', { vol: 'v' });
      k.r(x1 - 14, y - 12, 14, 12, 4, P.oro, { vol: 'v', lw: 4, tr: `rotate(-4 ${x1} ${y})` });
      k.raw(`<path d="M${x0 + tsuka + 24} ${y - 8} Q${(x0 + x1) / 2} ${y - 15} ${x1 - 24} ${y - 11}" fill="none" stroke="#6b5c57" stroke-width="3" stroke-linecap="round"/>`);
      k.p(`M${x0 + 4} ${y - 6} L${x0 + tsuka} ${y - 7} L${x0 + tsuka} ${y + 7} L${x0 + 4} ${y + 6} Q${x0 - 2} ${y} ${x0 + 4} ${y - 6} Z`, P.anil, { vol: 'v' });
      let rombos = '';
      for (let x = x0 + 12; x < x0 + tsuka - 4; x += 12) rombos += `M${x} ${y} l5 -5 l5 5 l-5 5 z `;
      k.raw(`<path d="${rombos}" fill="#f7efdf"/>`);
      k.e(x0 + tsuka + 4, y, 6, 15, P.oro, { lw: 4 });
    };
    espada(12, 236, 96, 58);
    espada(34, 212, 146, 46);
    k.brillo(46, 98, 3, 44, 0, 0.6);
  },

  tocadiscos(k) {
    k.sombra(128, 218, 114, 12);
    k.p('M18 148 L238 148 L238 188 Q238 198 228 198 L28 198 Q18 198 18 188 Z', '#7a5237', { vol: 'h' });
    k.p('M44 88 L212 88 L238 150 L18 150 Z', '#b07f4c', { vol: 'v' });
    k.e(110, 120, 80, 25, '#3a3035', { vol: 'none' });
    k.raw('<g fill="none" stroke="#5a4e55" stroke-width="2"><ellipse cx="110" cy="120" rx="66" ry="20"/><ellipse cx="110" cy="120" rx="52" ry="16"/><ellipse cx="110" cy="120" rx="38" ry="12"/></g>');
    k.e(110, 120, 22, 7, P.naranja, { vol: 'none', lw: 3.5 });
    k.e(110, 119, 3, 2, '#eee', { vol: 'none', borde: false, sil: false });
    k.raw('<path d="M60 112 Q90 104 124 106" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".35"/>');
    k.c(206, 104, 12, '#cfcac0');
    k.tubo('M206 104 L176 118 L150 124', '#dcd8d0', 5);
    k.r(140, 118, 16, 12, 3, '#9a948a', { lw: 4, tr: 'rotate(-12 148 124)' });
    k.raw('<path d="M30 160 L30 186 M40 160 L40 186 M50 160 L50 186 M60 160 L60 186 M70 160 L70 186" stroke="#5a3d27" stroke-width="3" stroke-linecap="round"/>');
    k.c(196, 172, 9, '#e2d6bd', { lw: 4 });
    k.c(220, 172, 9, '#e2d6bd', { lw: 4 });
    k.c(172, 172, 4, P.rojo, { vol: 'none', lw: 3, sil: false });
  },

  'cuadro-fuji'(k) {
    k.sombra(128, 228, 92, 8, 0.6);
    k.linea('M58 48 L128 16 L198 48', 4, '#8d6a4a');
    k.c(128, 15, 6, '#b9b4aa');
    k.r(26, 40, 204, 178, 12, P.madera);
    k.r(42, 56, 172, 146, 4, '#efe0bf', { vol: 'none' });
    const cl = k.clip('pic', '<rect x="42" y="56" width="172" height="146" rx="4"/>');
    k.p('M118 172 L160 106 Q166 98 172 106 L214 172 Z', P.anil, { sil: false, clip: cl, lw: 4, vol: 'none' });
    k.p('M148 124 L160 106 Q166 98 172 106 L184 124 L176 120 L170 128 L164 120 L156 128 Z', '#fffaf0', { sil: false, clip: cl, lw: 3, vol: 'none' });
    k.p('M42 206 L42 150 Q50 104 98 96 Q136 90 150 118 Q130 106 112 120 Q102 134 118 142 Q96 148 92 170 Q112 182 146 206 Z', '#3a5b8c', { sil: false, clip: cl, lw: 4, vol: 'none' });
    k.raw(`<path d="M98 96 Q136 90 150 118 Q142 110 132 110 M150 118 l-8 -2 M144 110 l-6 -6 M136 106 l-4 -8 M118 142 Q108 150 104 162" clip-path="${cl}" fill="none" stroke="#fffaf0" stroke-width="5" stroke-linecap="round"/>`);
    k.raw(`<g clip-path="${cl}"><path d="M100 196 Q128 178 170 196" fill="none" stroke="#3a5b8c" stroke-width="5" stroke-linecap="round"/><circle cx="72" cy="80" r="11" fill="#d8412a"/></g>`);
    k.r(42, 56, 172, 146, 4, 'none', { sil: false, vol: 'none' });
    k.brillo(78, 74, 26, 6, -30, 0.55);
  },

  kimono(k) {
    k.sombra(128, 226, 104, 10);
    k.grupo = 'translate(128 128) scale(.9) translate(-128 -128)';
    k.r(24, 44, 12, 180, 5, P.laca, { vol: 'h' });
    k.r(220, 44, 12, 180, 5, P.laca, { vol: 'h' });
    k.r(8, 214, 44, 14, 6, P.laca, { vol: 'v' });
    k.r(204, 214, 44, 14, 6, P.laca, { vol: 'v' });
    const ki = 'M20 60 L236 60 L234 146 Q234 156 224 156 L184 156 L180 226 L76 226 L72 156 L32 156 Q22 156 22 146 Z';
    k.p(ki, '#35628a');
    const cl = k.clip('ki', `<path d="${ki}"/>`);
    let ol = '';
    for (let fila = 0; fila < 9; fila++) {
      const y = 76 + fila * 18;
      for (let x = (fila % 2) * 16; x < 256; x += 32) ol += `M${x - 15} ${y} A15 15 0 0 1 ${x + 15} ${y} M${x - 9} ${y} A9 9 0 0 1 ${x + 9} ${y} M${x - 3.5} ${y} A3.5 3.5 0 0 1 ${x + 3.5} ${y} `;
    }
    k.raw(`<path d="${ol}" clip-path="${cl}" fill="none" stroke="#8fb3cf" stroke-width="2.4"/>`);
    k.p(ki, 'none', { vol: 'none', sil: false });
    k.linea('M72 64 L72 154 M184 64 L184 154', 3.5, '#223f5e');
    k.p('M102 60 L128 152 L154 60 L140 60 L128 116 L116 60 Z', P.crema, { sil: false, vol: 'none', lw: 4.5 });
    k.r(74, 146, 108, 30, 4, P.rojo, { sil: false, vol: 'v' });
    k.linea('M76 161 L180 161', 4, P.oro);
    k.c(128, 161, 6, P.oro, { sil: false, lw: 3 });
    k.p(capsula(6, 54, 250, 54, 14), P.laca, { vol: 'v' });
    k.r(2, 46, 12, 16, 4, P.oro, { lw: 4 });
    k.r(242, 46, 12, 16, 4, P.oro, { lw: 4 });
    k.brillo(56, 90, 8, 22, 0, 0.7);
  },

  // ─────────────── legendarios ───────────────
  'sakura-bonsai'(k) {
    k.halo(128, 90, 124, '#ffd6e2', 0.55);
    k.sombra(128, 228, 92, 12);
    k.tubo('M128 188 Q116 150 132 128 Q148 106 124 86', '#5a3d27', 16);
    k.tubo('M132 128 Q162 118 180 98', '#5a3d27', 9);
    k.tubo('M126 110 Q100 102 80 92', '#5a3d27', 8);
    const nubes = [[82, 88, 46, 30, 8, 0.2, '#f6b8c8'], [174, 88, 46, 32, 8, 0.5, '#f6b8c8'], [126, 58, 54, 34, 9, 0.1, '#f9c6d3']];
    for (const [cx, cy, rx, ry, n, fa, c] of nubes) {
      k.p(nube(cx, cy, rx, ry, n, fa), c);
      k.p(nube(cx - 6, cy - 7, rx * 0.6, ry * 0.46, n, fa), '#fde3ea', { sil: false, borde: false, vol: 'none' });
    }
    for (const [x, y, r] of [[66, 80, 9], [102, 96, 8], [118, 44, 10], [150, 66, 8], [186, 76, 9], [168, 104, 7], [88, 60, 7]]) {
      k.p(flor(x, y, r, -90 + x), '#fff1f5', { vol: 'none', lw: 2.6 });
      k.c(x, y, r * 0.28, '#e0567a', { vol: 'none', borde: false, sil: false });
    }
    k.p('M64 178 L192 178 Q190 222 152 226 L104 226 Q66 222 64 178 Z', '#2e2420', { vol: 'h' });
    k.r(56, 168, 144, 18, 9, P.oro, { vol: 'v' });
    k.p(flor(128, 204, 12), P.oro, { vol: 'none', lw: 3 });
    petalo(k, 214, 146, 20);
    petalo(k, 38, 150, -30);
    petalo(k, 206, 188, 60, 0.8);
    brillos(k, [[222, 38, 13], [30, 112, 9]]);
  },

  'kitsune-estatua'(k) {
    k.halo(128, 110, 120, '#ffe7a8', 0.5);
    k.sombra(128, 232, 98, 10);
    k.r(42, 198, 172, 30, 6, P.piedraOsc, { vol: 'v' });
    k.r(56, 180, 144, 22, 5, '#bfb7a4', { vol: 'v' });
    k.p('M148 178 Q212 172 214 118 Q216 78 186 60 Q200 96 184 118 Q168 136 144 140 Z', P.piedra);
    k.p('M186 60 Q204 70 210 92 Q198 86 192 76 Z', P.rojo, { sil: false, vol: 'none', lw: 4 });
    k.p('M90 182 Q82 134 104 108 L152 108 Q174 134 166 182 Z', P.piedra);
    k.p(capsula(110, 146, 110, 180, 20), P.piedra, { sil: false });
    k.p(capsula(146, 146, 146, 180, 20), P.piedra, { sil: false });
    k.p('M94 110 L162 110 Q158 144 128 152 Q98 144 94 110 Z', P.rojo, { vol: 'v' });
    k.p('M90 72 L94 18 L126 52 Z', P.piedra);
    k.p('M130 52 L162 18 L166 72 Z', P.piedra);
    k.p('M99 58 L100 34 L116 51 Z', P.rojo, { sil: false, borde: false, vol: 'none' });
    k.p('M140 51 L156 34 L157 58 Z', P.rojo, { sil: false, borde: false, vol: 'none' });
    k.p('M82 70 Q84 44 128 44 Q172 44 174 70 Q174 94 128 122 Q82 94 82 70 Z', P.piedra);
    k.p('M96 70 Q106 60 118 72 Q106 76 96 70 Z', P.rojo, { sil: false, vol: 'none', lw: 3 });
    k.p('M160 70 Q150 60 138 72 Q150 76 160 70 Z', P.rojo, { sil: false, vol: 'none', lw: 3 });
    k.linea('M100 76 Q108 70 118 78', 5);
    k.linea('M156 76 Q148 70 138 78', 5);
    k.e(128, 110, 7, 5, T, { vol: 'none', borde: false, sil: false });
    k.p('M128 118 Q142 128 142 138 Q142 150 128 150 Q114 150 114 138 Q114 128 128 118 Z', P.oro);
    k.linea('M122 132 Q128 126 134 132', 3, '#c98a1c');
    k.brillo(100, 56, 10, 6, -20);
    brillos(k, [[36, 70, 12], [222, 176, 9], [60, 150, 7]]);
  },

  'kakejiku-ryu'(k) {
    k.linea('M88 30 L128 8 L168 30', 4, '#8d6a4a');
    k.r(96, 34, 9, 40, 1, '#4f6fa6', { vol: 'none', lw: 3 });
    k.r(151, 34, 9, 40, 1, '#4f6fa6', { vol: 'none', lw: 3 });
    k.r(62, 34, 132, 184, 3, P.anil, { vol: 'h' });
    k.raw('<path d="M72 44 l6 6 l-6 6 l-6 -6 z M184 44 l6 6 l-6 6 l-6 -6 z M72 204 l6 6 l-6 6 l-6 -6 z M184 204 l6 6 l-6 6 l-6 -6 z" fill="#f2b43a" opacity=".85"/>');
    k.r(74, 56, 108, 7, 1, P.oro, { sil: false, vol: 'none', lw: 3 });
    k.r(74, 194, 108, 7, 1, P.oro, { sil: false, vol: 'none', lw: 3 });
    k.r(74, 64, 108, 130, 2, P.papel, { sil: false, vol: 'none' });
    const cl = k.clip('papel', '<rect x="74" y="64" width="108" height="130"/>');
    k.raw(`<g clip-path="${cl}"><ellipse cx="110" cy="160" rx="48" ry="13" fill="#dccfb3"/><ellipse cx="156" cy="108" rx="34" ry="10" fill="#dccfb3"/>`
      + `<circle cx="100" cy="92" r="13" fill="#f2b43a" stroke="${T}" stroke-width="3.5"/><circle cx="96" cy="88" r="4" fill="#fff" opacity=".8"/>`
      + `<path d="M150 96 Q108 104 118 132 Q128 160 96 176 Q86 182 80 196" fill="none" stroke="${T}" stroke-width="15" stroke-linecap="round"/>`
      + `<path d="M144 96 l6 -12 l6 11 M124 108 l-8 -10 l12 2 M114 128 l-12 -2 l8 -8 M122 150 l-11 5 l3 -12 M100 170 l-12 2 l6 -10" fill="${T}" stroke="${T}" stroke-width="4" stroke-linejoin="round"/>`
      + `<path d="M140 88 Q148 72 166 76 Q180 80 176 94 L166 96 L174 102 Q164 110 150 106 Q138 102 140 88 Z" fill="${T}"/><circle cx="160" cy="84" r="3.2" fill="#f2b43a"/>`
      + `<path d="M172 96 Q188 104 180 118 M170 80 Q186 70 176 62 M150 76 Q148 64 158 60" fill="none" stroke="${T}" stroke-width="3" stroke-linecap="round"/>`
      + `<path d="M120 116 l-14 6 M116 138 l14 8" stroke="${T}" stroke-width="5" stroke-linecap="round"/></g>`);
    k.r(160, 170, 13, 15, 1, P.rojo, { sil: false, vol: 'none', borde: false });
    k.r(74, 64, 108, 130, 2, 'none', { sil: false, vol: 'none' });
    k.r(56, 26, 144, 12, 6, P.madera, { vol: 'v' });
    k.r(52, 212, 152, 14, 7, P.madera, { vol: 'v' });
    k.r(40, 208, 16, 22, 5, P.oro, { vol: 'h', lw: 4 });
    k.r(200, 208, 16, 22, 5, P.oro, { vol: 'h', lw: 4 });
    brillos(k, [[226, 60, 12], [30, 120, 9], [228, 160, 7]]);
  },

  taiko(k) {
    k.sombra(128, 234, 106, 10);
    k.tubo('M62 150 L38 226', P.madera, 14);
    k.tubo('M194 150 L218 226', P.madera, 14);
    k.tubo('M66 200 L190 200', P.madera, 10);
    k.e(142, 118, 84, 88, '#8e2a22', { vol: 'h' });
    k.raw('<path d="M178 44 Q226 118 178 196" fill="none" stroke="#f2b43a" stroke-width="5" stroke-linecap="round" opacity=".9"/>');
    k.c(208, 118, 12, 'none', { vol: 'none', lw: 7, sil: false });
    k.raw('<circle cx="208" cy="118" r="12" fill="none" stroke="#f2b43a" stroke-width="4"/>');
    k.c(126, 118, 86, '#f1e2c4');
    k.raw('<circle cx="126" cy="118" r="72" fill="none" stroke="#d9c49c" stroke-width="3"/>');
    let tachas = '';
    for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2; tachas += `<circle cx="${(126 + Math.cos(a) * 79).toFixed(1)}" cy="${(118 + Math.sin(a) * 79).toFixed(1)}" r="3.2"/>`; }
    k.raw(`<g fill="#3a2b20">${tachas}</g>`);
    const tomoe = (rot, color) => {
      const cx = 126, cy = 118, a0 = (rot * Math.PI) / 180, d = 24, h = 17, Rf = 54, span = 2.3, n = 18;
      const pt = (a, r) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
      const ext = [], int = [];
      for (let i = 0; i <= n; i++) {
        const t = i / n, a = a0 + span * t, rho = d + (Rf - d) * t ** 0.8, w = h * (1 - t) ** 0.9;
        ext.push(pt(a, rho + w)); int.push(pt(a, rho - w));
      }
      const f = ([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`;
      let dd = `M${f(ext[0])}`;
      for (let i = 1; i <= n; i++) dd += ` L${f(ext[i])}`;
      for (let i = n - 1; i >= 0; i--) dd += ` L${f(int[i])}`;
      dd += ` A${h} ${h} 0 1 1 ${f(ext[0])} Z`;
      k.p(dd, color, { sil: false, vol: 'none', lw: 4 });
    };
    tomoe(-90, P.rojo);
    tomoe(30, P.oro);
    tomoe(150, P.anil);
    k.c(126, 118, 86, 'none', { sil: false });
    k.tubo('M150 26 L236 92', '#ead3a0', 10);
    k.tubo('M238 30 L166 100', '#ead3a0', 10);
    k.brillo(84, 72, 14, 24, 40);
    brillos(k, [[30, 40, 12], [236, 190, 9]]);
  },

  // ─────────────── accesorios ───────────────
  'gafas-sol'(k) {
    k.sombra(128, 196, 92, 10, 0.7);
    k.grupo = 'translate(128 128) scale(.9) translate(-128 -128)';
    k.tubo('M30 110 L12 90', P.naranja, 9);
    k.tubo('M226 110 L244 90', P.naranja, 9);
    const lente = (x, i = 0) => `M${x + i} ${104 + i * 0.4} Q${x + i} ${94 + i} ${x + 10 + i} ${94 + i} L${x + 84 - i} ${94 + i} Q${x + 94 - i} ${94 + i} ${x + 92 - i} ${106 + i * 0.4} Q${x + 88 - i} ${162 - i} ${x + 46} ${164 - i} Q${x + 4 + i} ${162 - i} ${x + i} ${110}`;
    k.p(lente(20) + ' Z', P.naranja);
    k.p(lente(142) + ' Z', P.naranja);
    k.tubo('M110 108 Q128 94 146 108', P.naranja, 9);
    k.def(`<linearGradient id="${k.id('cr')}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#4b3a5c"/><stop offset=".6" stop-color="#2b3350"/><stop offset="1" stop-color="#d8412a"/></linearGradient>`);
    for (const x of [20, 142]) {
      const d = lente(x, 10) + ' Z';
      k.p(d, `url(#${k.id('cr')})`, { sil: false, vol: 'none', lw: 4 });
      const c = k.clip('l' + x, `<path d="${d}"/>`);
      k.raw(`<path d="M${x + 20} 170 L${x + 70} 90 M${x + 38} 170 L${x + 84} 96" clip-path="${c}" stroke="#fff" stroke-width="9" opacity=".45"/>`);
    }
    brillos(k, [[206, 92, 13]], '#fff7e0');
  },

  boina(k) {
    k.sombra(128, 208, 102, 10);
    k.p('M34 134 Q34 78 128 72 Q222 78 222 130 Q224 158 190 166 Q128 182 66 166 Q32 158 34 134 Z', '#b3322a');
    k.p('M64 160 Q128 178 192 160 L188 180 Q128 196 68 180 Z', '#7e241e', { vol: 'h' });
    k.p(capsula(126, 78, 134, 54, 11), '#7e241e');
    k.p(flor(172, 120, 17, -80), P.oro, { vol: 'r', lw: 4 });
    k.c(172, 120, 5, '#fff1c2', { vol: 'none', lw: 3, sil: false });
    k.brillo(86, 98, 30, 10, -16);
  },

  mugiwara(k) {
    k.sombra(128, 206, 112, 12);
    k.e(128, 152, 118, 46, '#e8c77a');
    k.raw('<g fill="none" stroke="#c9a352" stroke-width="3"><ellipse cx="128" cy="152" rx="100" ry="38"/><ellipse cx="128" cy="152" rx="84" ry="31"/></g>');
    k.p('M70 150 Q66 84 128 80 Q190 84 186 150 Q128 166 70 150 Z', '#eccf85');
    k.raw('<g fill="none" stroke="#c9a352" stroke-width="3"><path d="M72 112 Q128 100 184 112"/><path d="M76 96 Q128 84 180 96"/></g>');
    k.p('M70 130 Q128 146 186 130 L187 148 Q128 164 69 148 Z', P.rojo, { vol: 'h' });
    k.p('M180 138 Q206 150 212 176 Q196 168 186 152 Z', P.rojo, { vol: 'none', lw: 4.5 });
    k.brillo(102, 100, 18, 9, -20);
  },

  cascos(k) {
    k.sombra(128, 226, 98, 10);
    k.tubo('M52 156 Q44 42 128 38 Q212 42 204 156', '#3a3035', 16);
    k.tubo('M86 60 Q128 44 170 60', P.crema, 12);
    k.e(62, 162, 16, 40, P.crema, { vol: 'h' });
    k.e(194, 162, 16, 40, P.crema, { vol: 'h' });
    k.e(46, 162, 30, 48, P.naranja);
    k.e(210, 162, 30, 48, P.naranja);
    for (const x of [46, 210]) {
      k.c(x, 164, 15, P.crema, { vol: 'none', lw: 4, sil: false });
      k.raw(`<g fill="#f2a3a3"><ellipse cx="${x}" cy="169" rx="6" ry="5"/><circle cx="${x - 7}" cy="160" r="2.8"/><circle cx="${x}" cy="157" r="2.8"/><circle cx="${x + 7}" cy="160" r="2.8"/></g>`);
    }
    k.brillo(36, 140, 6, 16, 10);
    k.brillo(200, 140, 6, 16, 10);
  },

  hanakanmuri(k) {
    k.sombra(128, 204, 104, 10);
    const pos = (a, rx = 94, ry = 42) => [128 + Math.cos(a) * rx, 142 + Math.sin(a) * ry];
    k.tubo('M34 142 A94 42 0 1 0 222 142 A94 42 0 1 0 34 142', P.hoja, 10);
    const hojas = [0.4, 1.3, 2.3, 3.4, 4.2, 5.1, 5.9];
    for (const a of hojas) { const [x, y] = pos(a); k.p(`M${x} ${y} q12 -14 26 -6 q-12 14 -26 6 z`, P.teLuz, { vol: 'none', lw: 3.5, tr: `rotate(${(a * 57) % 360} ${x} ${y})` }); }
    const colores = ['#f6b8c8', '#fbd3dd', '#f29ab0'];
    const detras = [3.5, 3.95, 4.4, 4.85, 5.3, 5.75];
    detras.forEach((a, i) => { const [x, y] = pos(a); k.p(flor(x, y, 17, -90 + i * 20), colores[i % 3], { vol: 'r' }); k.c(x, y, 4.5, '#e0567a', { vol: 'none', lw: 2.5, sil: false }); });
    const delante = [0.05, 0.6, 1.15, 1.7, 2.25, 2.8];
    delante.forEach((a, i) => { const [x, y] = pos(a); k.p(flor(x, y, 25, -80 + i * 17), colores[(i + 1) % 3], { vol: 'r' }); k.c(x, y, 6, P.oro, { vol: 'none', lw: 3, sil: false }); });
    brillos(k, [[128, 60, 12]]);
  },

  'kitsune-men'(k) {
    k.tubo('M52 116 Q18 150 34 196', P.rojo, 5);
    k.tubo('M204 116 Q238 150 222 196', P.rojo, 5);
    k.p('M26 190 L42 190 L44 214 L24 214 Z', P.rojo, { lw: 4 });
    k.p('M214 190 L230 190 L232 214 L212 214 Z', P.rojo, { lw: 4 });
    const cara = 'M64 96 L60 28 Q62 20 70 25 L108 62 Q128 56 148 62 L186 25 Q194 20 196 28 L192 96 Q212 124 200 148 Q176 190 128 224 Q80 190 56 148 Q44 124 64 96 Z';
    k.p(cara, P.arroz);
    k.p('M72 82 L70 40 L100 66 Z', P.rojo, { sil: false, borde: false, vol: 'none' });
    k.p('M184 82 L186 40 L156 66 Z', P.rojo, { sil: false, borde: false, vol: 'none' });
    k.p('M78 112 Q86 84 118 96 Q96 100 78 112 Z', P.rojo, { sil: false, vol: 'none', lw: 3 });
    k.p('M178 112 Q170 84 138 96 Q160 100 178 112 Z', P.rojo, { sil: false, vol: 'none', lw: 3 });
    k.p('M84 124 Q102 106 120 126 Q102 124 84 124 Z', T, { sil: false, vol: 'none', lw: 3 });
    k.p('M172 124 Q154 106 136 126 Q154 124 172 124 Z', T, { sil: false, vol: 'none', lw: 3 });
    k.p('M128 66 Q140 82 128 98 Q116 82 128 66 Z', P.rojo, { sil: false, vol: 'none', lw: 3 });
    k.c(128, 84, 3.5, P.oro, { sil: false, vol: 'none', borde: false });
    k.e(128, 194, 10, 7, T, { sil: false, vol: 'none', borde: false });
    k.punto(125, 192, 2.2, 0.7);
    k.linea('M96 172 Q128 190 160 172', 4, P.rojo);
    k.raw('<g fill="#d8412a"><circle cx="78" cy="150" r="3.2"/><circle cx="88" cy="160" r="3.2"/><circle cx="74" cy="164" r="3.2"/><circle cx="178" cy="150" r="3.2"/><circle cx="168" cy="160" r="3.2"/><circle cx="182" cy="164" r="3.2"/></g>');
    k.brillo(92, 68, 9, 20, 30);
  },

  // ─────────────── ropa de Mochi ───────────────
  yukata(k) {
    k.sombra(128, 226, 104, 10);
    k.grupo = 'translate(128 128) scale(.9) translate(-128 -128)';
    const ki = 'M20 60 L236 60 L234 146 Q234 156 224 156 L184 156 L180 226 L76 226 L72 156 L32 156 Q22 156 22 146 Z';
    k.p(ki, '#a996d8');
    const cl = k.clip('ki', `<path d="${ki}"/>`);
    const flores = [[52, 88], [196, 86], [62, 190], [186, 196], [102, 76], [150, 198], [46, 132], [206, 134], [128, 208]];
    k.raw(`<g clip-path="${cl}">${flores.map(([x, y], i) => `<path d="${flor(x, y, 9 + (i % 2) * 2, -90)}" fill="${i % 2 ? '#fbd3dd' : '#ffffff'}"/><circle cx="${x}" cy="${y}" r="2.6" fill="#2f4a7a"/>`).join('')}</g>`);
    k.p(ki, 'none', { vol: 'none', sil: false });
    k.linea('M72 64 L72 154 M184 64 L184 154', 3.5, '#7d6bab');
    k.p('M102 60 L128 152 L154 60 L140 60 L128 116 L116 60 Z', P.crema, { sil: false, vol: 'none', lw: 4.5 });
    k.r(74, 146, 108, 30, 4, P.oro, { sil: false, vol: 'v' });
    k.linea('M76 161 L180 161', 4, '#fff1c2');
    k.c(128, 161, 6, '#fff1c2', { sil: false, lw: 3 });
    k.brillo(56, 90, 8, 22, 0, 0.7);
  },

  maekake(k) {
    k.sombra(128, 224, 96, 12);
    k.tubo('M118 48 Q128 34 138 48', '#f7efdf', 5);
    k.r(58, 46, 140, 176, 10, '#26345e', { vol: 'v' });
    const cl = k.clip('ap', '<rect x="58" y="46" width="140" height="176" rx="10"/>');
    k.raw(`<path d="M58 194 L198 194 L198 202 L58 202 Z M58 210 L198 210 L198 218 L58 218 Z" clip-path="${cl}" fill="${P.rojo}"/>`);
    k.raw(`<g clip-path="${cl}" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"><path d="M96 92 L184 92 L184 172 L96 172 Z M96 132 L184 132 M140 92 L140 172"/><path d="M74 104 L74 158 M66 112 L82 112 M66 150 L82 150"/></g>`);
    k.raw(`<rect x="58" y="46" width="140" height="176" rx="10" clip-path="${cl}" fill="none" stroke="#f7efdf" stroke-width="3" stroke-dasharray="8 6" opacity=".8"/>`);
    k.r(58, 46, 140, 176, 10, 'none', { vol: 'none', sil: false });
    k.p('M58 142 L28 130 L33 146 L28 162 Z', '#f7efdf', { vol: 'none', lw: 3.5 });
    k.p('M198 142 L228 130 L223 146 L228 162 Z', '#f7efdf', { vol: 'none', lw: 3.5 });
    k.brillo(80, 74, 14, 30, 10, 0.6);
  },

  happi(k) {
    k.sombra(128, 226, 104, 10);
    k.grupo = 'translate(128 128) scale(.9) translate(-128 -128)';
    const ki = 'M20 60 L236 60 L234 146 Q234 156 224 156 L184 156 L180 226 L76 226 L72 156 L32 156 Q22 156 22 146 Z';
    k.p(ki, P.rojo);
    const cl = k.clip('ki', `<path d="${ki}"/>`);
    k.raw(`<path d="M64 198 L192 198 L188 226 L68 226 Z" clip-path="${cl}" fill="#fffaf0"/>`);
    let olas = '';
    for (let x = 58; x < 202; x += 22) olas += `M${x - 10} 216 A10 10 0 0 1 ${x + 10} 216 M${x - 5} 216 A5 5 0 0 1 ${x + 5} 216 `;
    k.raw(`<path d="${olas}" clip-path="${cl}" fill="none" stroke="#1f2c4c" stroke-width="2.6"/>`);
    k.p(ki, 'none', { vol: 'none', sil: false });
    k.p('M106 60 L124 60 L118 224 L100 224 Z', '#1f2c4c', { sil: false, vol: 'h', lw: 4 });
    k.p('M132 60 L150 60 L156 224 L138 224 Z', '#1f2c4c', { sil: false, vol: 'h', lw: 4 });
    k.raw('<path d="M110 82 L120 82 M115 82 L115 100 M108 100 L122 100" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none"/>');
    k.raw('<path d="M136 82 L146 82 M141 82 L141 100 M134 100 L148 100" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none"/>');
    k.linea('M92 152 L164 152', 4, '#fffaf0');
    k.brillo(56, 90, 8, 22, 0, 0.7);
  },

  parka(k) {
    k.sombra(128, 224, 100, 12);
    k.e(128, 84, 46, 18, '#6fb497', { vol: 'h' });
    const oreja = (x) => {
      k.p(`M${x - 14} 96 Q${x - 17} 66 ${x} 54 Q${x + 17} 66 ${x + 14} 96 Z`, '#86c6a8', { vol: 'r' });
      k.p(`M${x - 7} 90 Q${x - 8} 72 ${x} 66 Q${x + 8} 72 ${x + 7} 90 Z`, P.rubor, { sil: false, vol: 'none' });
    };
    oreja(90);
    oreja(166);
    k.p(capsula(80, 108, 34, 190, 36), '#86c6a8', { vol: 'h' });
    k.p(capsula(176, 108, 222, 190, 36), '#86c6a8', { vol: 'h' });
    k.e(34, 190, 18, 20, '#5fa588', { tr: 'rotate(24 34 190)', vol: 'none', lw: 4 });
    k.e(222, 190, 18, 20, '#5fa588', { tr: 'rotate(-24 222 190)', vol: 'none', lw: 4 });
    k.r(66, 86, 124, 138, 32, '#86c6a8', { vol: 'h' });
    k.r(72, 208, 112, 20, 9, '#5fa588', { vol: 'h' });
    k.r(90, 168, 76, 46, 16, '#5fa588', { vol: 'h' });
    k.linea('M90 178 Q128 190 166 178', 3, '#3f7d64');
    k.tubo('M116 88 Q112 120 116 150', P.crema, 6);
    k.tubo('M140 88 Q144 120 140 150', P.crema, 6);
    k.c(116, 154, 5.5, P.oro, { lw: 3 });
    k.c(140, 154, 5.5, P.oro, { lw: 3 });
    k.e(128, 128, 10, 8, P.crema, { sil: false, vol: 'none', lw: 3 });
    k.e(115, 114, 5, 6, P.crema, { sil: false, vol: 'none', lw: 2.5 });
    k.e(128, 110, 5, 6, P.crema, { sil: false, vol: 'none', lw: 2.5 });
    k.e(141, 114, 5, 6, P.crema, { sil: false, vol: 'none', lw: 2.5 });
    k.brillo(84, 108, 14, 28, 10);
  },

  gakuran(k) {
    k.sombra(128, 224, 96, 12);
    k.p(capsula(66, 96, 58, 212, 32), '#1c1f2e', { vol: 'h' });
    k.p(capsula(190, 96, 198, 212, 32), '#1c1f2e', { vol: 'h' });
    k.r(76, 82, 104, 148, 12, '#1c1f2e', { vol: 'h' });
    k.p('M100 82 Q128 66 156 82 L156 102 Q128 92 100 102 Z', '#262a3c', { vol: 'v', lw: 4 });
    k.raw(`<path d="M104 86 Q128 74 152 86" fill="none" stroke="${P.oroOsc}" stroke-width="3" stroke-linecap="round"/>`);
    k.r(118, 84, 20, 12, 3, P.oro, { sil: false, vol: 'h', lw: 3 });
    for (const y of [112, 138, 164, 190, 214]) k.c(128, y, 6.5, P.oro, { vol: 'h', lw: 3 });
    for (const x of [58, 198]) {
      k.c(x, 196, 4.5, P.oro, { vol: 'none', lw: 2.5 });
      k.c(x, 210, 4.5, P.oro, { vol: 'none', lw: 2.5 });
    }
    k.brillo(90, 110, 10, 28, 10, 0.5);
  },

  sukajan(k) {
    k.sombra(128, 224, 100, 12);
    k.p(capsula(80, 104, 36, 194, 34), '#1f6b5a', { vol: 'h' });
    k.p(capsula(176, 104, 220, 194, 34), '#1f6b5a', { vol: 'h' });
    k.r(66, 84, 124, 140, 30, '#1f6b5a', { vol: 'h' });
    k.e(128, 86, 46, 16, '#16483c', { vol: 'v' });
    k.linea('M86 82 Q128 92 170 82', 3, P.naranja);
    k.linea('M84 90 Q128 100 172 90', 3, P.crema);
    k.c(34, 194, 19, '#16483c', { lw: 4 });
    k.c(222, 194, 19, '#16483c', { lw: 4 });
    for (const x of [34, 222]) {
      k.raw(`<circle cx="${x}" cy="188" r="15" fill="none" stroke="${P.naranja}" stroke-width="2.6"/>`);
      k.raw(`<circle cx="${x}" cy="198" r="13" fill="none" stroke="${P.crema}" stroke-width="2.6" opacity=".8"/>`);
    }
    k.r(72, 206, 112, 20, 9, '#16483c', { vol: 'h' });
    k.linea('M78 212 L182 212', 3, P.naranja);
    k.linea('M78 220 L182 220', 3, P.crema);
    k.tubo('M128 90 L128 220', P.oro, 5);
    k.r(121, 150, 14, 16, 3, P.oro, { vol: 'h', lw: 3 });
    k.p(flor(96, 128, 15, -90), '#f6b8c8', { vol: 'none', lw: 3.5 });
    k.c(96, 128, 4, '#e0567a', { vol: 'none', borde: false, sil: false });
    k.brillo(94, 108, 22, 34, 12, 0.85);
    k.brillo(150, 170, 10, 22, 30, 0.5);
  },
};
