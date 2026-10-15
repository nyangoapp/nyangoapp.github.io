// Los objetos de las viñetas de las clases, estilo LÍNEA (30-09): sustituyen a los pintados en tinta (descartados). El mismo
// trazo marrón que las pegatinas, relleno plano, una sombra lisa y un brillo; sin caras. Lienzo de 256 con la convención de
// los de antes (web/js/clase-arte.js: el suelo en y = 236 y el lado mayor mide unos 220), para que caigan en su sitio.
// Salen en web/img/objetos-linea/<id>.svg. Uso: node web/img/fuente/linea/objetos.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { silueta, trazo, elipse, lienzo, LIN, CREMA } from './linea.mjs';
import { I as ICONOS } from './iconos2.mjs';   // los que ya estaban dibujados en esta línea

const W = 6, sil = (p) => silueta(p, W), brillo = (d, w = 5) => trazo(d, w, 'rgba(255,255,255,0.85)');
const clip = (id, d, dentro) => `<defs><clipPath id="${id}"><path d="${d}"/></clipPath></defs><g clip-path="url(#${id})">${dentro}</g>`;
const rect = (x, y, w, h, r, c, lw = 5) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${c}" stroke="${LIN}" stroke-width="${lw}"/>`;
const circ = (x, y, r, c, lw = 5) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" stroke="${LIN}" stroke-width="${lw}"/>`;

const O = {
  // futón sobre el tatami: colchón, edredón con flores y la almohada de trigo sarraceno
  cama: (() => {
    const col = 'M16 204 Q16 196 26 196 L232 196 Q240 196 240 204 L240 228 Q240 236 232 236 L26 236 Q16 236 16 228 Z';
    const edr = 'M78 150 Q78 140 90 140 L228 140 Q240 140 240 152 L240 214 Q240 222 230 222 L90 222 Q78 222 78 212 Z';
    return sil([{ d: col, relleno: CREMA }, { d: edr, relleno: '#a9cbe6' }, { d: 'M20 176 C20 158 40 150 66 152 C92 154 98 170 94 184 C90 198 64 200 44 198 C26 196 20 190 20 176 Z', relleno: '#eadcbc' }])
      + clip('cm', edr, '<path d="M78 196 L240 196 L240 222 L78 222 Z" fill="#8fb6d6"/>')
      + [[108, 166], [150, 158], [196, 170], [130, 196], [178, 200], [222, 190]].map(([x, y]) => [0, 72, 144, 216, 288].map((a) => { const r = (a * Math.PI) / 180; return elipse(x + Math.cos(r) * 6, y + Math.sin(r) * 6, 4.5, 4.5, '#fff7e4'); }).join('') + elipse(x, y, 3, 3, '#f5a35a')).join('')
      + trazo('M78 196 H240', 4) + trazo('M44 172 Q58 164 72 170', 4, '#c9b48c') + brillo('M96 152 L150 150');
  })(),
  // pizarra verde con su marco, su repisa de tizas y las patas
  pizarra: rect(24, 58, 208, 128, 10, '#b98a5c', 6) + rect(36, 70, 184, 104, 4, '#3f6b52', 5)
    + trazo('M60 104 q12 -18 24 0 t24 0 M130 96 v30 M118 110 h26 M168 94 q10 30 30 20', 5, '#e8f0e4')
    + trazo('M50 150 L210 150', 3, 'rgba(232,240,228,0.5)') + rect(52, 186, 152, 10, 4, '#d9b284')
    + `<rect x="80" y="180" width="18" height="7" rx="3" fill="#fffdf6" stroke="${LIN}" stroke-width="3"/><rect x="104" y="180" width="14" height="7" rx="3" fill="#f7c948" stroke="${LIN}" stroke-width="3"/>`
    + trazo('M58 196 L44 236 M198 196 L212 236', 7) + brillo('M46 80 L46 120'),
  // nube (flota: en la viñeta se le pone y)
  nube: sil([{ d: 'M46 186 C18 186 14 150 40 142 C38 112 72 98 94 114 C104 82 152 76 166 108 C188 92 222 106 220 136 C246 140 244 186 214 186 Z', relleno: '#fffdf6' }])
    + clip('nb', 'M46 186 C18 186 14 150 40 142 C38 112 72 98 94 114 C104 82 152 76 166 108 C188 92 222 106 220 136 C246 140 244 186 214 186 Z', '<path d="M20 166 C80 180 180 180 244 160 L244 190 L20 190 Z" fill="#dbe9f2"/>')
    + brillo('M60 132 Q66 120 80 118'),
  // vaso de agua
  vaso: sil([{ d: 'M70 18 L186 18 L170 228 Q128 238 86 228 Z', relleno: '#eef7fb' }])
    + clip('vs', 'M70 18 L186 18 L170 228 Q128 238 86 228 Z', '<path d="M60 84 L196 84 L196 240 L60 240 Z" fill="#a9d6ef"/><path d="M60 84 Q128 96 196 84 L196 92 Q128 104 60 92 Z" fill="#cfeaf8"/><path d="M150 18 L186 18 L170 228 L140 234 Z" fill="rgba(90,150,190,0.18)"/>')
    + trazo('M70 18 L186 18', 6) + brillo('M88 40 L100 200', 6) + elipse(120, 150, 6, 6, '#fff', 'opacity=".8"') + elipse(142, 118, 4, 4, '#fff', 'opacity=".8"'),
  // tele de las de antes, con antena
  tele: trazo('M110 56 L78 16 M146 56 L178 16', 5) + circ(78, 16, 6, '#e2574c', 4) + circ(178, 16, 6, '#e2574c', 4)
    + sil([{ d: 'M24 62 Q24 52 36 52 L220 52 Q232 52 232 62 L232 206 Q232 216 220 216 L36 216 Q24 216 24 206 Z', relleno: '#d9a66a' }])
    + rect(40, 70, 142, 128, 22, '#bfe0f5') + clip('tv', 'M40 92 Q40 70 62 70 L160 70 Q182 70 182 92 L182 176 Q182 198 160 198 L62 198 Q40 198 40 176 Z', '<path d="M40 150 C80 130 130 170 182 140 L182 198 L40 198 Z" fill="#9dc9e8"/>')
    + circ(207, 94, 10, '#f4ede0', 4) + circ(207, 128, 10, '#f4ede0', 4) + trazo('M196 160 H218 M196 172 H218 M196 184 H218', 4)
    + trazo('M58 216 L50 236 M198 216 L206 236', 7) + brillo('M56 90 Q60 80 72 78'),
  // teléfono móvil
  telefono: sil([{ d: 'M78 24 Q78 12 92 12 L164 12 Q178 12 178 24 L178 222 Q178 234 164 234 L92 234 Q78 234 78 222 Z', relleno: '#5a6b86' }])
    + rect(90, 36, 76, 164, 6, '#bfe0f5', 4) + `<rect x="100" y="52" width="26" height="18" rx="4" fill="#8cc66a"/><rect x="132" y="52" width="24" height="18" rx="4" fill="#f5a35a"/><rect x="100" y="80" width="56" height="10" rx="4" fill="#fffdf6"/><rect x="100" y="98" width="40" height="10" rx="4" fill="#fffdf6"/>`
    + trazo('M114 24 H142', 4, '#3c4a60') + circ(128, 216, 7, '#3c4a60', 3) + brillo('M98 44 L98 90'),
  // plato
  plato: `<ellipse cx="128" cy="216" rx="110" ry="22" fill="${LIN}" stroke="${LIN}" stroke-width="12"/><ellipse cx="128" cy="216" rx="110" ry="22" fill="#fffdf6"/>`
    + `<ellipse cx="128" cy="212" rx="72" ry="12" fill="#e9eef2" stroke="#c7d3dc" stroke-width="3"/>` + trazo('M34 222 Q128 246 222 222', 4, '#9cb6d0') + brillo('M60 206 Q80 200 100 200'),
  // lápiz de pie, con su goma
  lapiz: sil([{ d: 'M104 44 L152 44 L152 190 L128 236 L104 190 Z', relleno: '#f7c948' }, { d: 'M104 24 Q104 14 114 14 L142 14 Q152 14 152 24 L152 44 L104 44 Z', relleno: '#f4a6ae' }])
    + `<path d="M104 190 L152 190 L128 236 Z" fill="#f1d7a8"/><path d="M118 218 L138 218 L128 236 Z" fill="${LIN}"/>` + trazo('M104 190 H152 M104 44 H152', 5)
    + trazo('M120 44 V190 M136 44 V190', 3, '#d9a62e') + `<rect x="104" y="36" width="48" height="10" fill="#c9c4d2" stroke="${LIN}" stroke-width="4"/>` + brillo('M112 60 L112 170'),
  // regalo con lazo
  regalo: sil([{ d: 'M40 118 L216 118 L216 230 L40 230 Z', relleno: '#e2574c' }, { d: 'M28 94 L228 94 L228 124 L28 124 Z', relleno: '#ea6c60' },
    { d: 'M128 96 C104 60 64 56 70 80 C74 96 106 98 128 96 Z', relleno: '#f7c948' }, { d: 'M128 96 C152 60 192 56 186 80 C182 96 150 98 128 96 Z', relleno: '#f7c948' }])
    + `<path d="M114 94 L142 94 L142 230 L114 230 Z" fill="#f7c948"/>` + trazo('M114 94 V230 M142 94 V230 M28 124 H228', 5) + circ(128, 96, 10, '#f7c948', 5) + brillo('M54 136 L54 210'),
  // bici (mamachari)
  bici: circ(62, 190, 40, '#fffdf6', 7) + circ(194, 190, 40, '#fffdf6', 7) + circ(62, 190, 8, '#c9c4d2', 4) + circ(194, 190, 8, '#c9c4d2', 4)
    + trazo('M62 190 L110 120 L170 120 L194 190 M110 120 L128 190 L170 120 M128 190 L62 190', 8, '#6fa0d8') + trazo('M62 190 L110 120 L170 120 L194 190 M110 120 L128 190 L170 120 M128 190 L62 190', 3, '#9ec4ec')
    + trazo('M104 104 L100 120', 6) + `<path d="M84 100 Q104 92 120 100 Q104 108 84 100 Z" fill="#5a3a22"/>` + trazo('M170 120 L176 86 M160 84 H196', 7)
    + sil([{ d: 'M176 64 L220 64 L214 92 L182 92 Z', relleno: '#e2b77a' }]) + trazo('M128 190 m-12 0 a12 12 0 1 0 24 0 a12 12 0 1 0 -24 0', 4),
  // nigiri de salmón
  sushi: sil([{ d: 'M40 196 C40 164 216 164 216 196 C216 232 40 232 40 196 Z', relleno: '#fffdf6' }, { d: 'M28 170 C60 128 196 128 228 170 C230 190 200 196 128 194 C56 196 26 190 28 170 Z', relleno: '#f5895a' }])
    + clip('su', 'M28 170 C60 128 196 128 228 170 C230 190 200 196 128 194 C56 196 26 190 28 170 Z', '<path d="M60 140 C80 170 90 180 96 196 M112 136 C128 166 136 180 140 196 M164 138 C176 164 184 180 186 196" stroke="#fff3e6" stroke-width="7" fill="none"/>')
    + [[70, 214], [112, 220], [160, 218], [196, 208]].map(([x, y]) => elipse(x, y, 3, 4, '#e6dcc4')).join('') + brillo('M60 158 Q90 142 120 142'),
  // pan (melonpan)
  pan: sil([{ d: 'M22 196 C22 116 234 116 234 196 C234 228 22 228 22 196 Z', relleno: '#f2c46a' }])
    + clip('pn', 'M22 196 C22 116 234 116 234 196 C234 228 22 228 22 196 Z', '<path d="M22 200 C80 218 176 218 234 200 L234 236 L22 236 Z" fill="#dca24c"/>' + [70, 110, 150, 190].map((x) => `<path d="M${x - 60} 110 L${x + 40} 236" stroke="#dca24c" stroke-width="5"/><path d="M${x + 60} 110 L${x - 40} 236" stroke="#dca24c" stroke-width="5"/>`).join(''))
    + brillo('M58 156 Q80 136 108 134'),
  // dinero: un billete y un montón de monedas
  dinero: sil([{ d: 'M22 120 L178 100 L196 196 L40 216 Z', relleno: '#bfe0b0' }]) + trazo('M52 128 L162 114 M58 196 L176 180', 4, '#7fae8e')
    + circ(108, 158, 22, '#e6f2da', 4) + [236, 216, 196].map((y, i) => `<ellipse cx="190" cy="${y - 10}" rx="44" ry="14" fill="${i === 2 ? '#f7c948' : '#e7b53a'}" stroke="${LIN}" stroke-width="5"/>`).join('')
    + `<ellipse cx="190" cy="186" rx="18" ry="5" fill="none" stroke="#b8871f" stroke-width="3"/>`,
  // pez (un tai rosado)
  pez: sil([{ d: 'M30 150 C60 90 150 84 196 136 L236 104 L232 196 L196 164 C150 216 60 210 30 150 Z', relleno: '#f29a8e' }])
    + clip('pz', 'M30 150 C60 90 150 84 196 136 L236 104 L232 196 L196 164 C150 216 60 210 30 150 Z', '<path d="M30 156 C80 190 150 196 200 160 L236 180 L236 220 L30 220 Z" fill="#fde7df"/>')
    + trazo('M110 110 C124 130 124 170 110 190', 5) + circ(70, 140, 9, LIN, 0) + elipse(67, 137, 3, 3, '#fff') + trazo('M140 120 l10 10 M160 124 l10 10 M150 140 l10 10', 3.5, '#d9786c') + brillo('M60 118 Q80 104 100 102'),
  // zapatilla
  zapato: sil([{ d: 'M20 208 C18 170 50 150 84 150 L116 150 C140 150 150 128 176 128 C206 128 238 176 238 208 Q238 222 224 222 L32 222 Q20 222 20 208 Z', relleno: '#fffdf6' }])
    + `<path d="M20 206 L238 206 L238 214 Q238 224 226 224 L32 224 Q20 224 20 214 Z" fill="#e2574c"/>` + trazo('M20 206 H238', 5)
    + trazo('M128 154 l10 14 M146 146 l10 14 M164 140 l10 14', 5) + `<path d="M60 186 C90 178 150 182 196 170" fill="none" stroke="#6fa0d8" stroke-width="7" stroke-linecap="round"/>` + brillo('M48 176 Q60 164 80 162'),
  // despertador
  reloj: trazo('M84 206 L70 234 M172 206 L186 234', 7) + circ(78, 62, 24, '#f7c948', 6) + circ(178, 62, 24, '#f7c948', 6) + trazo('M128 52 V36 M116 34 H140', 6)
    + sil([{ d: 'M128 54 C186 54 212 98 212 140 C212 190 176 222 128 222 C80 222 44 190 44 140 C44 98 70 54 128 54 Z', relleno: '#e2574c' }])
    + circ(128, 140, 64, '#fffdf6', 5) + [0, 90, 180, 270].map((a) => { const r = (a * Math.PI) / 180; return elipse(128 + Math.cos(r) * 50, 140 + Math.sin(r) * 50, 5, 5, LIN); }).join('')
    + trazo('M128 140 V100 M128 140 L156 156', 6) + circ(128, 140, 6, LIN, 0) + brillo('M76 108 Q82 94 94 88'),
  // casa japonesa con tejado de tejas
  casa: sil([{ d: 'M44 124 L212 124 L212 232 L44 232 Z', relleno: '#f4ede0' }, { d: 'M14 128 Q70 110 128 44 Q186 110 242 128 L226 138 Q170 126 128 74 Q86 126 30 138 Z', relleno: '#5a6b86' }])
    + clip('cs', 'M14 128 Q70 110 128 44 Q186 110 242 128 L226 138 Q170 126 128 74 Q86 126 30 138 Z', '<path d="M128 44 Q186 110 242 128 L242 150 L128 150 Z" fill="#46546c"/>')
    + rect(62, 150, 52, 44, 3, '#bfe0f5', 5) + trazo('M88 150 V194 M62 172 H114', 4) + rect(142, 156, 50, 76, 3, '#b07b54', 5) + trazo('M167 156 V232', 4) + circ(160, 196, 3.5, LIN, 0) + circ(174, 196, 3.5, LIN, 0),
  // silla de madera
  silla: sil([{ d: 'M76 20 Q76 12 86 12 L170 12 Q180 12 180 20 L180 132 L76 132 Z', relleno: '#c98f5a' }, { d: 'M60 128 L196 128 L196 150 L60 150 Z', relleno: '#d9a66a' }])
    + rect(92, 30, 72, 24, 6, '#b07b48', 4) + rect(92, 70, 72, 24, 6, '#b07b48', 4) + trazo('M72 150 L66 236 M184 150 L190 236 M90 150 L92 212 M166 150 L164 212', 8) + trazo('M72 150 L66 236 M184 150 L190 236', 3, '#d9a66a') + brillo('M84 22 L84 120'),
  // coche pequeño (kei car)
  coche: sil([{ d: 'M22 196 Q22 150 58 146 L84 104 Q90 92 104 92 L176 92 Q192 92 200 106 L220 146 Q236 150 236 176 L236 200 Q236 210 226 210 L32 210 Q22 210 22 200 Z', relleno: '#8cc6d9' }])
    + `<path d="M92 142 L106 108 L140 108 L140 142 Z M154 108 L184 108 L200 142 L154 142 Z" fill="#e6f4fa" stroke="${LIN}" stroke-width="5" stroke-linejoin="round"/>`
    + trazo('M22 172 H236', 4) + circ(74, 212, 22, '#5a6b86', 6) + circ(186, 212, 22, '#5a6b86', 6) + circ(74, 212, 8, '#c9c4d2', 3) + circ(186, 212, 8, '#c9c4d2', 3)
    + `<rect x="210" y="156" width="18" height="10" rx="3" fill="#f7c948" stroke="${LIN}" stroke-width="3"/>` + brillo('M40 164 L60 164'),
  // bicho: una mariquita
  bicho: trazo('M104 108 L88 78 M152 108 L168 78', 5) + circ(88, 76, 6, LIN, 0) + circ(168, 76, 6, LIN, 0)
    + sil([{ d: 'M128 104 C188 104 222 150 222 184 C222 220 180 232 128 232 C76 232 34 220 34 184 C34 150 68 104 128 104 Z', relleno: '#e2574c' }, { d: 'M86 128 C86 96 170 96 170 128 Z', relleno: '#3d2a1e' }])
    + trazo('M128 118 V232', 5) + [[84, 160], [172, 160], [100, 202], [156, 202], [66, 196], [190, 196]].map(([x, y]) => elipse(x, y, 11, 11, '#3d2a1e')).join('') + brillo('M66 150 Q76 136 92 132'),
  // pájaro (un gorrión)
  pajaro: sil([{ d: 'M60 160 C60 110 100 84 140 90 C176 96 196 126 196 154 L236 140 L214 176 C204 206 170 222 128 222 C86 222 60 196 60 160 Z', relleno: '#c9a27a' }])
    + clip('pj', 'M60 160 C60 110 100 84 140 90 C176 96 196 126 196 154 L236 140 L214 176 C204 206 170 222 128 222 C86 222 60 196 60 160 Z', '<path d="M60 170 C90 200 160 206 200 180 L220 230 L60 230 Z" fill="#f4ede0"/>')
    + `<path d="M58 132 L30 140 L58 148 Z" fill="#f7c948" stroke="${LIN}" stroke-width="4" stroke-linejoin="round"/>` + circ(86, 124, 6, LIN, 0) + elipse(84, 122, 2, 2, '#fff')
    + `<path d="M118 150 C140 136 176 140 190 160 C170 172 138 172 118 150 Z" fill="#8a6446" stroke="${LIN}" stroke-width="4"/>` + trazo('M112 222 L106 238 M138 222 L140 238', 5),
  // sol
  sol: [0, 45, 90, 135, 180, 225, 270, 315].map((a) => { const r = (a * Math.PI) / 180; return trazo(`M${(128 + Math.cos(r) * 78).toFixed(1)} ${(140 + Math.sin(r) * 78).toFixed(1)} L${(128 + Math.cos(r) * 104).toFixed(1)} ${(140 + Math.sin(r) * 104).toFixed(1)}`, 9, '#f5a35a'); }).join('')
    + sil([{ d: 'M128 80 C162 80 188 106 188 140 C188 174 162 200 128 200 C94 200 68 174 68 140 C68 106 94 80 128 80 Z', relleno: '#f7c948' }])
    + clip('sl', 'M128 80 C162 80 188 106 188 140 C188 174 162 200 128 200 C94 200 68 174 68 140 C68 106 94 80 128 80 Z', '<path d="M150 84 C190 110 190 180 140 200 L200 200 L200 80 Z" fill="#efb53a"/>') + brillo('M92 116 Q98 102 112 96'),
  // árbol
  arbol: sil([{ d: 'M112 236 L116 170 L140 170 L144 236 Z', relleno: '#a0714a' }, { d: 'M128 20 C176 20 214 56 210 98 C236 116 232 164 196 172 C180 196 76 196 60 172 C24 164 20 116 46 98 C42 56 80 20 128 20 Z', relleno: '#8cc66a' }])
    + clip('ar', 'M128 20 C176 20 214 56 210 98 C236 116 232 164 196 172 C180 196 76 196 60 172 C24 164 20 116 46 98 C42 56 80 20 128 20 Z', '<path d="M60 150 C100 176 170 176 220 140 L230 200 L30 200 Z" fill="#6fae52"/>')
    + trazo('M128 170 L128 130 M128 150 L104 130 M128 142 L150 122', 5, '#7a5236') + [[96, 70], [150, 60], [176, 110], [80, 118]].map(([x, y]) => elipse(x, y, 7, 7, '#e2574c')).join('') + brillo('M70 70 Q82 50 104 42'),
};

const DEST = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'objetos-linea');
mkdirSync(DEST, { recursive: true });
for (const n of ['bolsa', 'caja', 'flor', 'escuela', 'carta', 'manzana', 'luna', 'taza', 'paraguas', 'tren']) O[n] = ICONOS[n];
for (const [n, s] of Object.entries(O)) writeFileSync(join(DEST, n + '.svg'), lienzo(s, 256));
console.log(Object.keys(O).length, 'objetos:', Object.keys(O).join(' '));
