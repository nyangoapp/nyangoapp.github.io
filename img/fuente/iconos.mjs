// Iconos de actividad (tarjetas de la portada, HUD y recompensas). Lienzo 256×256.
import { PALETA as P, TINTA as T, capsula, nube, flor, chispa, estrella, poli, ojos, mofletes, bocaW } from './kit.mjs';

const brillos = (k, lista, color = P.oroLuz) => { for (const [x, y, r] of lista) k.p(chispa(x, y, r), color, { vol: 'none', lw: k.IN * 0.6 }); };

// pieza de puzle: lados [arriba, derecha, abajo, izquierda]: 1 saliente, -1 hueco, 0 liso
function puzle(x, y, s, lados) {
  const r = s * 0.17, t0 = 0.36, t1 = 0.64;
  const esq = [[x, y], [x + s, y], [x + s, y + s], [x, y + s]];
  let d = `M${x} ${y}`;
  for (let i = 0; i < 4; i++) {
    const [ax, ay] = esq[i], [bx, by] = esq[(i + 1) % 4], ux = (bx - ax) / s, uy = (by - ay) / s, L = lados[i];
    if (!L) { d += ` L${bx} ${by}`; continue; }
    const p1 = [ax + ux * s * t0, ay + uy * s * t0], p2 = [ax + ux * s * t1, ay + uy * s * t1];
    d += ` L${p1[0].toFixed(1)} ${p1[1].toFixed(1)} A${r.toFixed(1)} ${r.toFixed(1)} 0 1 ${L > 0 ? 1 : 0} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)} L${bx} ${by}`;
  }
  return d + ' Z';
}

export const ICONOS = {
  repaso(k) {
    k.sombra(124, 232, 88, 10);
    k.r(64, 44, 116, 156, 18, P.tatami, { tr: 'rotate(12 122 122)' });
    k.raw('<path d="M92 70 L150 70" transform="rotate(12 122 122)" stroke="#a8965e" stroke-width="7" stroke-linecap="round"/>');
    const tr = 'rotate(-8 121 131)';
    k.r(62, 52, 118, 158, 18, P.crema, { tr });
    k.raw(`<g transform="${tr}"><circle cx="121" cy="112" r="31" fill="none" stroke="#d8412a" stroke-width="7"/><path d="M104 112 L117 125 L140 98" fill="none" stroke="#d8412a" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><path d="M86 168 L156 168 M86 188 L136 188" stroke="#d9c9a6" stroke-width="8" stroke-linecap="round"/></g>`);
    k.tubo('M128 178 A44 44 0 1 1 176 222', P.naranja, 17);
    k.p(poli([[172, 198], [174, 246], [142, 223]]), P.naranja, { vol: 'none' });
    k.brillo(84, 76, 6, 20, -8, 0.8);
  },

  leccion(k) {
    k.sombra(128, 226, 108, 12);
    k.p('M16 120 Q72 100 128 120 Q184 100 240 120 L240 212 Q184 196 128 216 Q72 196 16 212 Z', P.anil, { vol: 'v' });
    k.p('M26 112 Q78 92 126 114 L126 204 Q78 188 26 202 Z', P.papel, { vol: 'h', sil: false });
    k.p('M130 114 Q178 92 230 112 L230 202 Q178 188 130 204 Z', P.papel, { vol: 'h', sil: false });
    k.raw('<path d="M44 134 Q76 124 110 134 M44 154 Q76 144 110 154 M44 174 Q70 166 96 172 M146 134 Q178 124 212 134 M146 154 Q178 144 212 154 M146 174 Q172 166 198 172" fill="none" stroke="#cdbb95" stroke-width="5" stroke-linecap="round"/>');
    k.p('M120 206 L136 206 L136 240 L128 232 L120 240 Z', P.rojo, { vol: 'h', lw: 5 });
    k.tubo('M128 116 Q126 90 130 66', P.hoja, 7);
    k.p('M128 86 Q94 90 82 60 Q116 50 128 86 Z', P.te);
    k.p('M130 72 Q150 40 184 46 Q172 80 130 72 Z', P.teLuz);
    k.linea('M124 82 Q106 72 94 62 M134 68 Q156 56 174 50', 3, '#4f6326');
    brillos(k, [[54, 62, 14], [206, 84, 11], [216, 34, 7]]);
  },

  gramatica(k) {
    k.sombra(128, 212, 104, 11);
    const a = puzle(30, 92, 92, [1, 1, 0, 0]);
    const b = puzle(132, 92, 92, [0, 0, 1, -1]);
    k.p(a, P.naranja, { tr: 'rotate(-6 76 138)' });
    k.p(b, P.te, { tr: 'translate(8 -10) rotate(8 178 138)' });
    k.brillo(56, 112, 10, 18, 30, 0.8);
    k.brillo(160, 106, 10, 18, 30, 0.8);
    k.raw('<g stroke="#2a211a" stroke-width="6" stroke-linecap="round"><path d="M126 70 L130 52 M112 74 L100 60 M142 76 L156 64"/></g>');
    brillos(k, [[212, 56, 13], [40, 60, 9]]);
  },

  kanji(k) {
    k.sombra(124, 228, 98, 10);
    const tr = 'rotate(-4 120 122)';
    k.r(38, 34, 164, 178, 14, P.crema, { vol: 'v', tr });
    k.raw(`<g transform="${tr}" fill="none" stroke="#e6a99b" stroke-width="3.5" stroke-dasharray="9 7"><path d="M120 46 L120 200 M50 123 L190 123"/></g>`);
    k.raw(`<g transform="${tr}" fill="${T}"><path d="M62 92 Q120 82 178 84 Q186 88 178 96 Q120 96 66 102 Q56 100 62 92 Z"/><path d="M114 48 Q126 44 127 58 L125 190 Q125 202 116 194 L111 180 Q115 120 110 62 Q108 50 114 48 Z"/><path d="M112 100 Q96 142 56 172 Q48 174 52 164 Q86 136 102 98 Z"/><path d="M126 104 Q150 140 190 160 Q198 166 188 168 Q146 158 120 110 Z"/></g>`);
    k.p(capsula(222, 30, 170, 150, 20), P.bambu, { vol: 'r' });
    k.linea('M198 70 L212 78 M186 100 L200 108', 4, '#b58f4c');
    k.p(capsula(174, 142, 164, 160, 24), '#3a2b20', { vol: 'r' });
    k.p('M158 150 C148 164 146 184 146 200 C156 190 172 176 172 160 Q168 150 158 150 Z', '#3b312b', { vol: 'r' });
    k.brillo(206, 60, 4, 22, 24);
  },

  camino(k) {
    k.sombra(128, 224, 108, 12);
    const xs = [22, 92, 164, 234], ar = [54, 70, 54, 70], ab = [212, 196, 212, 196];
    const pan = [0, 1, 2].map((i) => poli([[xs[i], ar[i]], [xs[i + 1], ar[i + 1]], [xs[i + 1], ab[i + 1]], [xs[i], ab[i]]]));
    pan.forEach((d, i) => k.p(d, i % 2 ? '#cdbd86' : '#ecdfb6', { vol: 'none' }));
    const cl = k.clip('mapa', pan.map((d) => `<path d="${d}"/>`).join(''));
    k.raw(`<g clip-path="${cl}"><path d="${nube(60, 92, 30, 16, 6, 0.3)}" fill="#a6bf5e" stroke="${T}" stroke-width="3.5"/><path d="${nube(196, 170, 34, 16, 6, 0.1)}" fill="#a6bf5e" stroke="${T}" stroke-width="3.5"/>`
      + `<path d="M0 150 Q60 140 100 160 Q140 180 256 150" fill="none" stroke="#7cc4d6" stroke-width="12"/><path d="M168 108 L188 78 L208 108 Z" fill="#6f86b0" stroke="${T}" stroke-width="3.5" stroke-linejoin="round"/><path d="M181 88 L188 78 L195 88 Z" fill="#fff"/></g>`);
    k.raw(`<path d="M44 196 Q60 150 104 150 Q150 150 150 118 Q150 92 190 90" fill="none" stroke="#d8412a" stroke-width="8" stroke-linecap="round" stroke-dasharray="1 17"/>`);
    pan.forEach((d) => k.p(d, 'none', { vol: 'none', sil: false }));
    k.tubo('M198 94 L198 30', P.madera, 6);
    k.p('M202 28 L240 42 L202 58 Z', P.rojo, { vol: 'v' });
    k.c(44, 198, 9, P.oro);
  },

  mochi(k) {
    k.sombra(128, 234, 88, 10);
    k.p('M194 110 Q222 100 236 78 Q236 106 214 122 Z', P.rojo, { vol: 'none' });
    k.p('M198 118 Q228 122 240 112 Q234 136 206 132 Z', '#b3321f', { vol: 'none' });
    k.p('M50 108 L58 34 L114 70 Z', '#f2963a');
    k.p('M142 70 L198 34 L206 108 Z', '#4a3a30');
    k.p('M64 90 L68 54 L96 72 Z', '#f2a3a3', { sil: false, borde: false, vol: 'none' });
    k.p('M160 72 L188 54 L192 90 Z', '#f2a3a3', { sil: false, borde: false, vol: 'none' });
    const cab = 'M128 60 C190 60 228 98 228 148 C228 198 186 224 128 224 C70 224 28 198 28 148 C28 98 66 60 128 60 Z';
    k.p(cab, '#fbf5e8');
    const cl = k.clip('cab', `<path d="${cab}"/>`);
    k.p('M16 40 L118 40 Q118 88 88 102 Q52 114 16 100 Z', '#f2963a', { sil: false, clip: cl, vol: 'none', borde: false });
    k.p('M174 52 Q214 58 236 96 L236 128 Q208 118 194 100 Q178 80 174 52 Z', '#4a3a30', { sil: false, clip: cl, vol: 'none', borde: false });
    k.p(cab, 'none', { vol: 'none', sil: false });
    k.p('M30 118 Q128 80 226 118 L228 140 Q128 102 28 140 Z', P.rojo, { sil: false, vol: 'v' });
    k.c(128, 108, 10, P.crema, { sil: false, vol: 'none', lw: 4 });
    k.c(216, 126, 13, P.rojo);
    ojos(k, [[94, 162], [162, 162]], 13, { ancho: 0.78 });
    mofletes(k, [[70, 184], [186, 184]], 15, 8);
    k.p('M122 172 L134 172 L128 179 Z', '#e8757d', { sil: false, vol: 'none', lw: 3 });
    bocaW(k, 128, 186, 9, 4.5);
    k.linea('M58 168 L32 162 M58 178 L34 184 M198 168 L224 162 M198 178 L222 184', 3.2);
    k.brillo(76, 86, 16, 8, -30);
  },

  koban(k) {
    k.halo(128, 128, 122, '#ffd77a', 0.5);
    k.sombra(128, 236, 64, 9);
    const tr = 'rotate(-14 128 128)';
    k.e(128, 128, 70, 102, P.oro, { tr });
    k.e(128, 128, 56, 88, '#f7c95c', { tr, sil: false, vol: 'none', lw: 4 });
    let marcas = '';
    for (let y = 58; y <= 198; y += 12) {
      const w = 50 * Math.sqrt(Math.max(0, 1 - ((y - 128) / 88) ** 2));
      for (let x = 128 - w + 8; x < 128 + w - 8; x += 18) marcas += `M${x.toFixed(1)} ${y} l10 0 `;
    }
    k.raw(`<path d="${marcas}" transform="${tr}" stroke="#d99a2b" stroke-width="3" stroke-linecap="round"/>`);
    k.r(108, 52, 40, 26, 8, '#fbe08e', { tr, vol: 'none', lw: 4 });
    k.raw(`<path d="M120 58 L120 72 M128 56 L128 74 M136 58 L136 72" transform="${tr}" stroke="#b97a12" stroke-width="3.5" stroke-linecap="round"/>`);
    k.c(128, 128, 20, '#fbe08e', { tr, vol: 'none', lw: 4 });
    k.p(flor(128, 128, 12), '#e9a52c', { tr, vol: 'none', lw: 2.6 });
    k.r(110, 180, 36, 22, 8, '#fbe08e', { tr, vol: 'none', lw: 4 });
    k.brillo(96, 72, 10, 34, 10);
    brillos(k, [[206, 50, 16], [44, 196, 11], [214, 176, 8]], '#fff4c8');
  },

  bolsa(k) {
    k.halo(128, 140, 122, '#ffd77a', 0.45);
    k.sombra(128, 234, 88, 11);
    const cu = 'M72 112 Q40 150 46 190 Q56 230 128 230 Q200 230 210 190 Q216 150 184 112 Z';
    k.p(cu, P.rojo);
    const cl = k.clip('b', `<path d="${cu}"/>`);
    let fl = '';
    for (const [x, y] of [[66, 150], [192, 150], [60, 204], [196, 206], [96, 218], [162, 220]]) fl += `<path d="${flor(x, y, 10)}"/>`;
    k.raw(`<g clip-path="${cl}" fill="#f2b43a" opacity=".9">${fl}</g>`);
    k.p(cu, 'none', { vol: 'none', sil: false });
    k.p('M92 118 Q72 88 84 60 Q100 76 108 58 Q118 76 128 54 Q138 76 148 58 Q156 76 172 60 Q184 88 164 118 Z', P.rojo, { vol: 'v' });
    k.tubo('M82 116 Q128 130 174 116', P.oro, 10);
    k.p('M128 118 Q98 94 88 124 Q102 140 128 122 Z', P.oro);
    k.p('M128 118 Q158 94 168 124 Q154 140 128 122 Z', P.oro);
    k.tubo('M122 124 L108 152', P.oro, 7);
    k.tubo('M134 124 L148 152', P.oro, 7);
    k.c(128, 120, 10, P.oro);
    k.c(128, 184, 30, P.crema, { vol: 'r' });
    k.p(flor(128, 184, 21), P.rojo, { vol: 'none', lw: 3.5 });
    k.c(128, 184, 5, P.oro, { vol: 'none', lw: 2.6 });
    k.brillo(70, 160, 8, 22, 20);
    brillos(k, [[214, 70, 15], [38, 84, 10], [226, 150, 8]], '#fff4c8');
  },

  omamori(k) {
    k.sombra(128, 236, 72, 10);
    k.tubo('M110 64 Q94 22 128 18 Q162 22 146 64', P.oro, 7);
    const bo = 'M74 78 Q128 52 182 78 L182 214 Q182 228 168 228 L88 228 Q74 228 74 214 Z';
    k.p(bo, P.rojo);
    const cl = k.clip('bo', `<path d="${bo}"/>`);
    let rombo = '';
    for (let y = 70; y < 240; y += 22) for (let x = 60 + ((y / 22) % 2) * 11; x < 200; x += 22) rombo += `M${x} ${y - 6} L${x + 6} ${y} L${x} ${y + 6} L${x - 6} ${y} Z `;
    k.raw(`<path d="${rombo}" clip-path="${cl}" fill="#f2b43a" opacity=".45"/>`);
    k.p(bo, 'none', { vol: 'none', sil: false });
    k.e(128, 72, 20, 11, P.oro);
    k.p('M112 74 Q98 90 104 104 L112 100 Q110 88 120 78 Z M144 74 Q158 90 152 104 L144 100 Q146 88 136 78 Z', P.oro, { vol: 'none', lw: 4 });
    k.r(102, 104, 52, 104, 8, P.crema, { sil: false, vol: 'v' });
    k.raw('<g fill="none" stroke="#d8412a" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><path d="M128 118 L128 126"/><path d="M112 138 L112 128 L144 128 L144 138"/><path d="M110 152 L146 152"/><path d="M136 140 L136 188 Q136 196 126 190"/><path d="M118 164 L126 174"/></g>');
    k.brillo(92, 110, 6, 30, 0);
    brillos(k, [[212, 80, 13], [44, 168, 9]]);
  },

  mision(k) {
    k.sombra(128, 236, 90, 10);
    k.r(62, 48, 132, 170, 6, P.papel, { vol: 'v' });
    for (const y of [48, 216]) {
      k.p(capsula(48, y, 208, y, 22), P.maderaLuz, { vol: 'v' });
      k.c(40, y, 11, P.rojo);
      k.c(216, y, 11, P.rojo);
    }
    const filas = [90, 132, 174];
    filas.forEach((y, i) => {
      k.r(80, y - 15, 30, 30, 7, '#fffaf0', { vol: 'none', lw: 5 });
      k.raw(`<path d="M124 ${y} L${i === 2 ? 158 : 176} ${y}" stroke="#d6c59f" stroke-width="9" stroke-linecap="round"/>`);
      if (i < 2) k.tubo(`M84 ${y - 2} L96 ${y + 10} L118 ${y - 20}`, P.rojo, 8);
    });
    brillos(k, [[204, 150, 14], [220, 110, 8]]);
  },
  // ── extra: para combos, XP, vidas del jefe y títulos ──
  racha(k) {
    k.halo(128, 150, 110, '#ffb35c', 0.45);
    k.sombra(128, 234, 70, 9);
    k.p('M128 18 Q150 58 178 80 Q216 112 208 162 Q200 216 128 228 Q56 216 48 162 Q42 120 78 94 Q84 124 102 128 Q92 78 128 18 Z', P.rojo);
    k.p('M128 90 Q148 118 166 132 Q184 152 176 178 Q166 208 128 212 Q90 208 82 178 Q76 152 98 134 Q106 152 118 152 Q112 122 128 90 Z', P.naranja, { sil: false });
    k.p('M128 144 Q144 162 152 178 Q158 200 128 204 Q98 200 104 178 Q112 162 128 144 Z', '#ffd77a', { sil: false });
    k.brillo(88, 120, 7, 22, 30);
    brillos(k, [[208, 56, 13], [44, 64, 9]]);
  },

  xp(k) {
    k.halo(128, 128, 120, '#ffd77a', 0.5);
    k.sombra(128, 232, 70, 9);
    k.p(estrella(128, 124, 104, 50, 5), P.oro);
    k.p(estrella(128, 128, 60, 30, 5), '#ffd77a', { sil: false, vol: 'none', lw: 4 });
    k.brillo(96, 86, 10, 22, 30);
    brillos(k, [[214, 44, 13], [40, 196, 9]], '#fff4c8');
  },

  vida(k) {
    k.sombra(128, 232, 70, 9);
    const c = 'M128 222 Q54 172 36 126 Q22 84 56 62 Q96 40 128 86 Q160 40 200 62 Q234 84 220 126 Q202 172 128 222 Z';
    k.p(c, P.rojo);
    k.p('M128 190 Q84 158 72 128 Q66 108 82 100 Q104 92 128 122 Q152 92 174 100 Q190 108 184 128 Q172 158 128 190 Z', '#ef6a4a', { sil: false, vol: 'none', borde: false });
    k.brillo(74, 88, 12, 22, -40);
    k.punto(96, 76, 5);
  },

  trofeo(k) {
    k.sombra(128, 236, 64, 9);
    k.p('M86 20 L124 20 L140 118 L104 124 Z', P.rojo, { vol: 'h' });
    k.p('M170 20 L132 20 L116 118 L152 124 Z', P.anil, { vol: 'h' });
    k.c(128, 158, 64, P.oro);
    k.c(128, 158, 48, '#ffd77a', { sil: false, vol: 'none', lw: 4 });
    k.p(flor(128, 158, 32), P.rojo, { vol: 'r', lw: 4 });
    k.c(128, 158, 8, P.oro, { vol: 'none', lw: 3 });
    k.brillo(96, 126, 9, 20, 40);
    brillos(k, [[210, 104, 13], [46, 110, 9]], '#fff4c8');
  },
};
