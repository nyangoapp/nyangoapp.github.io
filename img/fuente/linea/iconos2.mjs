// Iconos de clase, estilo LÍNEA (el mismo trazo marrón que las pegatinas de Nyan): objetos con relleno plano,
// una sombra lisa y un brillo; SIN caras en los objetos (solo los animales tienen cara). Salen en arte/lin/ico-*.
import { fileURLToPath } from 'node:url';
import { silueta, tubo, trazo, elipse, guardar, lienzo, LIN, CREMA } from './linea.mjs';
const D = 'lin', W = 6;
const sil = (piezas) => silueta(piezas, W);
const brillo = (d) => trazo(d, 5, 'rgba(255,255,255,0.85)');
const clip = (id, d, dentro) => `<defs><clipPath id="${id}"><path d="${d}"/></clipPath></defs><g clip-path="url(#${id})">${dentro}</g>`;

const I = {
  // gato (clase 1, «esto es un gato»): Tama sentada
  gato: (() => {
    const cab = 'M128 150 C168 150 196 140 198 110 C200 80 190 50 180 26 Q176 18 168 24 L146 46 Q128 40 110 46 L88 24 Q80 18 76 26 C66 50 56 80 58 110 C60 140 88 150 128 150 Z';
    const cuerpo = 'M92 138 C80 170 78 204 84 226 Q128 240 172 226 C178 204 176 170 164 138 Z';
    return sil([{ d: cuerpo, relleno: '#c9c4d2' }, { d: cab, relleno: '#c9c4d2' }])
      + clip('gc', cab, `<path d="M40 150 L216 150 L216 120 Q128 150 40 120 Z" fill="#f4f1ec"/><path d="M128 44 v26 M112 48 l4 20 M144 48 l-4 20" stroke="#8a8499" stroke-width="7" stroke-linecap="round"/><path d="M168 36 C164 46 158 52 150 56 C160 60 170 64 180 66 C178 54 174 44 168 36 Z M88 36 C92 46 98 52 106 56 C96 60 86 64 76 66 C78 54 82 44 88 36 Z" fill="#f2b8bf"/>`)
      + clip('gb', cuerpo, '<ellipse cx="128" cy="196" rx="26" ry="34" fill="#f4f1ec"/>')
      + elipse(104, 108, 6, 7.5, LIN) + elipse(152, 108, 6, 7.5, LIN) + elipse(84, 126, 12, 7, '#f8b2b6') + elipse(172, 126, 12, 7, '#f8b2b6')
      + trazo('M120 124 Q124 131 128 125 Q132 131 136 124', 4.5)
      + `<path d="M98 150 Q128 162 158 150" fill="none" stroke="#3d6fc2" stroke-width="9" stroke-linecap="round"/><circle cx="128" cy="160" r="8" fill="#f2c14e" stroke="${LIN}" stroke-width="4"/>`
      + tubo('M170 214 C210 214 222 186 212 160', 16, W, '#c9c4d2');
  })(),
  // bolsa de la compra con su puerro
  bolsa: sil([{ d: 'M142 78 L152 20 Q158 12 164 20 L160 82 Z', relleno: '#8cc66a' }]) + sil([{ d: 'M112 80 L104 30 Q106 22 114 26 L130 82 Z', relleno: '#f4f1e2' }])
    + sil([{ d: 'M58 86 L198 86 L210 226 Q128 236 46 226 Z', relleno: '#e2b77a' }])
    + clip('bb', 'M58 86 L198 86 L210 226 Q128 236 46 226 Z', '<path d="M160 86 L198 86 L210 226 L168 230 Z" fill="#cf9f5f"/>')
    + trazo('M92 104 Q92 70 112 70 M164 104 Q164 70 144 70', 6) + `<circle cx="92" cy="104" r="5" fill="${LIN}"/><circle cx="164" cy="104" r="5" fill="${LIN}"/>`
    + `<rect x="84" y="140" width="88" height="44" rx="8" fill="#fff7e4" stroke="${LIN}" stroke-width="5"/>` + trazo('M100 162 h56', 5, '#e2574c') + brillo('M70 110 L66 190'),
  onigiri: sil([{ d: 'M128 34 C150 34 214 136 212 176 C210 214 46 214 44 176 C42 136 106 34 128 34 Z', relleno: '#fffdf6' }])
    + clip('oc', 'M128 34 C150 34 214 136 212 176 C210 214 46 214 44 176 C42 136 106 34 128 34 Z', '<path d="M160 60 C190 110 214 150 212 176 C210 204 170 210 150 208 C176 170 176 110 160 60 Z" fill="#efe6d2"/><rect x="92" y="146" width="72" height="72" fill="#2f4a3a"/><path d="M92 146 h72 v8 h-72 Z" fill="#3f6150"/>')
    + trazo('M92 150 V212 M164 150 V212', 5) + brillo('M94 74 Q84 92 78 108') + [[112, 104], [146, 116], [128, 86], [100, 130]].map(([x, y]) => elipse(x, y, 3, 4.5, '#e6dcc4')).join(''),
  // caja de cartón con las solapas abiertas
  caja: sil([{ d: 'M50 98 L128 70 L206 98 L206 196 L128 226 L50 196 Z', relleno: '#d8a66a' }, { d: 'M50 98 L20 70 L98 44 L128 70 Z', relleno: '#e6b97e' }, { d: 'M206 98 L236 70 L158 44 L128 70 Z', relleno: '#e6b97e' }])
    + `<path d="M128 70 L128 226 L206 196 L206 98 Z" fill="#c38f55"/>` + trazo('M50 98 L128 126 L206 98 M128 126 V226', 6)
    + `<path d="M84 110 L84 150 L104 158 L104 118" fill="#f1d7a8" stroke="${LIN}" stroke-width="4" stroke-linejoin="round"/>` + brillo('M64 120 L64 176'),
  // flor en su maceta
  flor: sil([{ d: 'M82 150 L174 150 L162 226 Q128 234 94 226 Z', relleno: '#d9724e' }, { d: 'M72 138 L184 138 L184 158 L72 158 Z', relleno: '#e8886a' }])
    + trazo('M128 138 C128 110 126 96 128 80', 7, '#4f8a3a') + sil([{ d: 'M128 118 C100 104 92 88 98 80 C112 84 124 98 128 118 Z', relleno: '#8cc66a' }])
    + [0, 72, 144, 216, 288].map((a) => { const r = (a * Math.PI) / 180, x = 128 + Math.cos(r - Math.PI / 2) * 28, y = 62 + Math.sin(r - Math.PI / 2) * 28; return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="20" ry="24" transform="rotate(${a} ${x.toFixed(1)} ${y.toFixed(1)})" fill="#f7b3c4" stroke="${LIN}" stroke-width="6"/>`; }).join('')
    + [0, 72, 144, 216, 288].map((a) => { const r = (a * Math.PI) / 180, x = 128 + Math.cos(r - Math.PI / 2) * 28, y = 62 + Math.sin(r - Math.PI / 2) * 28; return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="15" ry="19" transform="rotate(${a} ${x.toFixed(1)} ${y.toFixed(1)})" fill="#f7b3c4"/>`; }).join('')
    + `<circle cx="128" cy="62" r="14" fill="#f7c948" stroke="${LIN}" stroke-width="5"/>` + brillo('M88 170 L92 210'),
  // la escuela, con su reloj
  escuela: sil([{ d: 'M24 118 L232 118 L232 222 L24 222 Z', relleno: '#f4ede0' }, { d: 'M96 70 L160 70 L160 118 L96 118 Z', relleno: '#f4ede0' }])
    + `<path d="M24 118 L232 118 L232 132 L24 132 Z" fill="#9aa9c4"/>` + trazo('M24 132 H232', 5)
    + [44, 84, 148, 188].map((x) => `<rect x="${x}" y="148" width="26" height="26" rx="3" fill="#bfe0f5" stroke="${LIN}" stroke-width="5"/>`).join('')
    + `<rect x="108" y="170" width="40" height="52" rx="3" fill="#b07b54" stroke="${LIN}" stroke-width="5"/>`
    + `<circle cx="128" cy="94" r="16" fill="#fffdf6" stroke="${LIN}" stroke-width="5"/>` + trazo('M128 84 V94 L135 98', 4)
    + trazo('M128 70 V44', 5) + `<path d="M128 44 L152 52 L128 60 Z" fill="#e2574c" stroke="${LIN}" stroke-width="4" stroke-linejoin="round"/>`,
  // carta con su sello
  carta: sil([{ d: 'M30 70 L226 70 L226 196 L30 196 Z', relleno: '#fffdf6' }]) + trazo('M30 70 L128 140 L226 70', 6)
    + `<path d="M30 196 L104 124 M226 196 L152 124" stroke="${LIN}" stroke-width="5" stroke-linecap="round"/>`
    + `<rect x="178" y="84" width="34" height="40" rx="3" fill="#8cc66a" stroke="${LIN}" stroke-width="4"/>` + `<circle cx="195" cy="104" r="8" fill="#fff7e4"/>`
    + `<path d="M128 166 C104 150 106 132 118 132 C124 132 127 137 128 140 C129 137 132 132 138 132 C150 132 152 150 128 166 Z" fill="#e2574c" stroke="${LIN}" stroke-width="5" stroke-linejoin="round"/>`,
  manzana: sil([{ d: 'M128 82 C150 58 212 66 210 130 C208 190 168 222 128 208 C88 222 48 190 46 130 C44 66 106 58 128 82 Z', relleno: '#e2574c' }])
    + clip('mz', 'M128 82 C150 58 212 66 210 130 C208 190 168 222 128 208 C88 222 48 190 46 130 C44 66 106 58 128 82 Z', '<path d="M170 80 C214 100 214 170 180 204 C200 160 196 110 170 80 Z" fill="#c43e36"/>')
    + trazo('M128 82 C128 64 132 50 140 40', 7) + sil([{ d: 'M136 58 C150 36 176 32 188 40 C178 58 158 64 136 58 Z', relleno: '#8cc66a' }]) + brillo('M76 108 Q72 128 78 146'),
  // luna con estrellitas
  luna: sil([{ d: 'M150 34 C92 38 56 88 60 138 C64 192 118 228 172 214 C200 206 218 190 226 172 C170 188 118 156 112 106 C108 72 124 46 150 34 Z', relleno: '#f7d774' }])
    + clip('ln', 'M150 34 C92 38 56 88 60 138 C64 192 118 228 172 214 C200 206 218 190 226 172 C170 188 118 156 112 106 C108 72 124 46 150 34 Z', '<path d="M60 138 C64 192 118 228 172 214 C200 206 218 190 226 172 C190 204 110 210 76 150 Z" fill="#e8bd4a"/>')
    + [[196, 70, 14], [214, 118, 9], [160, 150, 7]].map(([x, y, r]) => `<path d="M${x} ${y - r} L${x + r * 0.3} ${y - r * 0.3} L${x + r} ${y} L${x + r * 0.3} ${y + r * 0.3} L${x} ${y + r} L${x - r * 0.3} ${y + r * 0.3} L${x - r} ${y} L${x - r * 0.3} ${y - r * 0.3} Z" fill="#f7d774" stroke="${LIN}" stroke-width="4" stroke-linejoin="round"/>`).join('')
    + brillo('M92 96 Q82 118 84 142'),
  // taza de té (yunomi) con vapor
  taza: sil([{ d: 'M62 96 L194 96 L184 206 Q128 222 72 206 Z', relleno: '#9cc3a8' }])
    + clip('tz', 'M62 96 L194 96 L184 206 Q128 222 72 206 Z', '<path d="M150 96 L194 96 L184 206 L144 214 Z" fill="#7fae8e"/><path d="M62 132 L194 132 L192 146 L64 146 Z" fill="#fff7e4"/>')
    + `<ellipse cx="128" cy="96" rx="66" ry="12" fill="#c9a96a" stroke="${LIN}" stroke-width="6"/>` + trazo('M104 72 q-10 -14 0 -28 M128 68 q-10 -14 0 -28 M152 72 q-10 -14 0 -28', 5, '#b8a898') + brillo('M80 118 L86 190'),
  // paraguas japonés (wagasa)
  paraguas: trazo('M128 104 V218 Q128 232 116 230', 7) + sil([{ d: 'M24 110 Q128 -2 232 110 Q206 98 180 110 Q154 98 128 110 Q102 98 76 110 Q50 98 24 110 Z', relleno: '#e2574c' }])
    + clip('pg', 'M24 110 Q128 -2 232 110 Q206 98 180 110 Q154 98 128 110 Q102 98 76 110 Q50 98 24 110 Z', '<path d="M24 110 Q128 -2 232 110 Z" fill="none"/><path d="M128 30 L128 110 M128 30 L76 110 M128 30 L180 110 M128 30 L40 104 M128 30 L216 104" stroke="#f6a28c" stroke-width="4"/><path d="M60 70 Q128 40 196 70 L200 82 Q128 52 56 82 Z" fill="#fff7e4"/>')
    + `<circle cx="128" cy="36" r="8" fill="#f7c948" stroke="${LIN}" stroke-width="4"/>`,
  // tren de cercanías
  tren: sil([{ d: 'M40 70 Q40 50 64 50 L192 50 Q216 50 216 70 L216 196 Q216 212 198 212 L58 212 Q40 212 40 196 Z', relleno: '#f4ede0' }])
    + `<path d="M40 150 L216 150 L216 170 L40 170 Z" fill="#8cc66a"/>` + trazo('M40 150 H216 M40 170 H216', 4)
    + `<rect x="62" y="74" width="58" height="52" rx="8" fill="#bfe0f5" stroke="${LIN}" stroke-width="5"/><rect x="136" y="74" width="58" height="52" rx="8" fill="#bfe0f5" stroke="${LIN}" stroke-width="5"/>`
    + `<circle cx="74" cy="190" r="9" fill="#f7c948" stroke="${LIN}" stroke-width="4"/><circle cx="182" cy="190" r="9" fill="#f7c948" stroke="${LIN}" stroke-width="4"/>`
    + trazo('M84 212 L70 236 M172 212 L186 236', 6) + trazo('M52 236 H204', 6) + brillo('M70 86 L84 86'),
};
export { I };
// ejecutado directamente (no importado desde objetos.mjs), guarda los iconos
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  for (const [n, s] of Object.entries(I)) guardar(D, 'ico-' + n, lienzo(s, 256), 256);
  console.log(Object.keys(I).join(' '));
}
