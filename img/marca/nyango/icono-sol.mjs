// Icono de la app (30-09, tercera vuelta: «sol naciente»). EL MISMO diseño del icono de antes
// (cara que llena el icono, oreja naranja, cejas de pincel, un ojo algo mayor, cabeza ladeada, lengua que sale de la ω)
// con acabado de icono de app: volumen en la cara, orejas con degradado y mechones, ojos con reflejos, mofletes
// difuminados y lengua con brillo; detrás, el sol rojo. Otros fondos probados: 'cielo' (el de antes) y 'mandarina'.
// mini: para 16–64 px, sin brillos ni detalles finos y con las líneas más gruesas.
const CABEZA = 'M46 94 C72 84 184 84 210 94 C230 102 238 146 236 176 C233 214 190 230 128 230 C66 230 23 214 20 176 C18 146 26 102 46 94 Z';
const OREJA_I = 'M24 150 C26 108 40 64 58 36 C62 29 70 28 75 33 C95 54 112 74 128 98 Z';
const OREJA_D = 'M232 150 C230 108 216 64 198 36 C194 29 186 28 181 33 C161 54 144 74 128 98 Z';
const DENTRO_I = 'M44 118 C47 94 55 70 64 56 C78 71 92 86 104 102 C86 106 62 111 44 118 Z';
const DENTRO_D = 'M212 118 C209 94 201 70 192 56 C178 71 164 86 152 102 C170 106 194 111 212 118 Z';
const T = '#221817';

const FONDOS = {
  // el cielo de ahora, con más cuerpo: degradado, luz arriba, nubes y destellos
  cielo: (id) => `<linearGradient id="${id}-f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fbdf5"/><stop offset=".55" stop-color="#a9d4fa"/><stop offset="1" stop-color="#d6ebff"/></linearGradient>`,
  // un sol rojo detrás, como el de la bandera y el de su hachimaki
  sol: (id) => `<linearGradient id="${id}-f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3dc"/><stop offset="1" stop-color="#ffe2b8"/></linearGradient>`,
  // mandarina de la app
  mandarina: (id) => `<linearGradient id="${id}-f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff9a52"/><stop offset=".6" stop-color="#f7772b"/><stop offset="1" stop-color="#e2560f"/></linearGradient>`,
};
const chispa = (x, y, r, g = 0.22) => { const q = r * g; return `M${x} ${y - r} Q${x + q} ${y - q} ${x + r} ${y} Q${x + q} ${y + q} ${x} ${y + r} Q${x - q} ${y + q} ${x - r} ${y} Q${x - q} ${y - q} ${x} ${y - r} Z`; };

function extrasFondo(tipo) {
  if (tipo === 'cielo') return `
    <ellipse cx="256" cy="40" rx="200" ry="90" fill="#fff" opacity=".35"/>
    <g fill="#fff" opacity=".92">
      <path d="M150 118 q0 -26 26 -26 q8 -22 34 -18 q22 -12 40 6 q26 0 26 24 q0 16 -18 18 h-94 q-14 -2 -14 -4 z" opacity=".75"/>
    </g>
    <path d="${chispa(262, 70, 16)}" fill="#fff"/><path d="${chispa(318, 120, 9)}" fill="#fff" opacity=".9"/><path d="${chispa(222, 150, 7)}" fill="#fff" opacity=".8"/>`;
  if (tipo === 'sol') return `
    <circle cx="256" cy="150" r="118" fill="#e8432f"/>
    <circle cx="256" cy="150" r="118" fill="url(#SOLVOL)"/>
    <path d="${chispa(120, 70, 14)}" fill="#f2b43a"/><path d="${chispa(396, 88, 10)}" fill="#f2b43a"/>`;
  return `
    <circle cx="256" cy="120" r="150" fill="#ffc07a" opacity=".45"/>
    <path d="${chispa(262, 76, 16)}" fill="#fff4d6"/><path d="${chispa(214, 140, 8)}" fill="#fff4d6" opacity=".9"/><path d="${chispa(312, 130, 9)}" fill="#fff4d6" opacity=".9"/>`;
}

export function icono(id, { fondo = 'sol', mini = false, giro = -4 } = {}) {
  const k = 2.3, tx = 256 - 128 * k, ty = -20;
  const sil = (a) => `<g ${a}><path d="${OREJA_I}"/><path d="${OREJA_D}"/><path d="${CABEZA}"/></g>`;
  const L = mini ? 24 : 16;
  const narOreja = fondo === 'mandarina' ? ['#ffd3a1', '#f6a15c', '#d9722a'] : ['#f9b46e', '#ee9448', '#d8752c'];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="Nyango"><title>Nyango</title>
<defs>
  <clipPath id="${id}-m"><rect x="14" y="14" width="484" height="484" rx="120"/></clipPath>
  <clipPath id="${id}-cab"><path d="${CABEZA}"/><rect x="-40" y="196" width="336" height="120"/></clipPath>
  <clipPath id="${id}-oi"><path d="${OREJA_I}"/></clipPath>
  <clipPath id="${id}-od"><path d="${OREJA_D}"/></clipPath>
  ${FONDOS[fondo](id)}
  <radialGradient id="SOLVOL" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="#ff8a70" stop-opacity=".7"/><stop offset=".6" stop-color="#e8432f" stop-opacity="0"/><stop offset="1" stop-color="#a82a1e" stop-opacity=".45"/></radialGradient>
  <linearGradient id="${id}-nar" x1=".2" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="${narOreja[0]}"/><stop offset=".45" stop-color="${narOreja[1]}"/><stop offset="1" stop-color="${narOreja[2]}"/></linearGradient>
  <linearGradient id="${id}-narIn" x1=".3" y1="0" x2=".6" y2="1"><stop offset="0" stop-color="#ffd9b8"/><stop offset="1" stop-color="#f4a77a"/></linearGradient>
  <linearGradient id="${id}-crema" x1=".7" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#f3e5cf"/></linearGradient>
  <linearGradient id="${id}-cremaIn" x1=".6" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="#ffe9c9"/><stop offset="1" stop-color="#f4c9a0"/></linearGradient>
  <radialGradient id="${id}-piel" gradientUnits="userSpaceOnUse" cx="112" cy="150" r="190"><stop offset="0" stop-color="#fffdf9"/><stop offset=".5" stop-color="#fdf5e8"/><stop offset=".85" stop-color="#f3e3cb"/><stop offset="1" stop-color="#e9d3b3"/></radialGradient>
  <linearGradient id="${id}-raiz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9bf9c" stop-opacity=".55"/><stop offset="1" stop-color="#d9bf9c" stop-opacity="0"/></linearGradient>
  <linearGradient id="${id}-ojo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#150e0c"/><stop offset=".7" stop-color="#2b1d1a"/><stop offset="1" stop-color="#3d2a25"/></linearGradient>
  <linearGradient id="${id}-iris" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b4636" stop-opacity="0"/><stop offset=".5" stop-color="#8a5a40"/><stop offset="1" stop-color="#c98a5a"/></linearGradient>
  <radialGradient id="${id}-rubor"><stop offset="0" stop-color="#f58c98"/><stop offset=".6" stop-color="#f59aa4" stop-opacity=".85"/><stop offset="1" stop-color="#f7aab2" stop-opacity="0"/></radialGradient>
  <radialGradient id="${id}-asiento"><stop offset=".55" stop-color="#e3cdb0" stop-opacity=".9"/><stop offset="1" stop-color="#e3cdb0" stop-opacity="0"/></radialGradient>
  <linearGradient id="${id}-lengua" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e45d72"/><stop offset=".35" stop-color="#f7808f"/><stop offset="1" stop-color="#ff9aa6"/></linearGradient>
  <linearGradient id="${id}-brillo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <clipPath id="${id}-ojoI"><ellipse cx="172" cy="306" rx="${mini ? 42 : 38}" ry="${mini ? 52 : 48}"/></clipPath>
  <clipPath id="${id}-ojoD"><ellipse cx="344" cy="312" rx="${mini ? 45 : 42}" ry="${mini ? 55 : 52}"/></clipPath>
  <clipPath id="${id}-boca"><path d="M222 372 Q239 400 257 376 Q275 400 293 372 L300 480 L214 480 Z"/></clipPath>
</defs>
<g clip-path="url(#${id}-m)">
  <rect width="512" height="512" fill="url(#${id}-f)"/>
  ${mini ? (fondo === 'sol' ? '<circle cx="256" cy="150" r="118" fill="#e8432f"/>' : '') : extrasFondo(fondo)}
  <g transform="rotate(${giro} 256 330)"><g transform="translate(${tx} ${ty}) scale(${k})">
    <!-- sombra de la cabeza sobre el fondo -->
    ${mini ? '' : sil(`transform="translate(3 5)" fill="#000" opacity=".12"`)}
    ${sil(`fill="${T}" stroke="${T}" stroke-width="${mini ? 10 : 7}" stroke-linejoin="round"`)}
    <!-- oreja naranja: degradado, dentro melocotón, dos mechones y el borde con luz -->
    <path d="${OREJA_I}" fill="url(#${id}-nar)"/>
    ${mini ? '' : `<g clip-path="url(#${id}-oi)">
      <path d="${DENTRO_I}" fill="url(#${id}-narIn)"/>
      <path d="M52 112 C56 92 60 78 66 66" fill="none" stroke="#fff3e6" stroke-width="3" stroke-linecap="round" opacity=".8"/>
      <path d="M62 108 C66 94 70 84 76 76" fill="none" stroke="#fff3e6" stroke-width="2.4" stroke-linecap="round" opacity=".6"/>
      <path d="M40 60 C46 48 52 40 58 36" fill="none" stroke="#ffe0bd" stroke-width="4" stroke-linecap="round" opacity=".9"/>
    </g>`}
    <!-- oreja crema -->
    <path d="${OREJA_D}" fill="url(#${id}-crema)"/>
    ${mini ? '' : `<g clip-path="url(#${id}-od)">
      <path d="${DENTRO_D}" fill="url(#${id}-cremaIn)"/>
      <path d="M204 112 C200 92 196 78 190 66" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".85"/>
      <path d="M216 60 C210 48 204 40 198 36" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".9"/>
    </g>`}
    <!-- la cabeza, con volumen -->
    <path d="${CABEZA}" fill="url(#${id}-piel)"/>
    <rect x="-40" y="196" width="336" height="120" fill="url(#${id}-piel)"/>
    ${mini ? '' : `<path d="M58 106 C78 95 100 91 120 89" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" opacity=".9"/>`}
  </g></g>
</g>
<g clip-path="url(#${id}-m)" transform="rotate(${giro} 256 330)">
  ${mini ? '' : `
  <!-- cejas de pincel -->
  <path d="M136 242 Q168 204 210 226 Q170 219 136 242 Z" fill="${T}" stroke="${T}" stroke-width="7" stroke-linejoin="round"/>
  <path d="M312 244 Q346 230 378 247 Q345 240 312 244 Z" fill="${T}" stroke="${T}" stroke-width="7" stroke-linejoin="round"/>
`}
  <ellipse cx="172" cy="306" rx="${mini ? 42 : 38}" ry="${mini ? 52 : 48}" fill="url(#${id}-ojo)"/>
  <ellipse cx="344" cy="312" rx="${mini ? 45 : 42}" ry="${mini ? 55 : 52}" fill="url(#${id}-ojo)"/>
  ${mini ? '' : `
  <g clip-path="url(#${id}-ojoI)"><ellipse cx="176" cy="350" rx="34" ry="22" fill="url(#${id}-iris)"/><path d="M140 326 Q150 350 176 356" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".35"/></g>
  <g clip-path="url(#${id}-ojoD)"><ellipse cx="348" cy="358" rx="37" ry="23" fill="url(#${id}-iris)"/><path d="M308 332 Q318 358 346 364" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".35"/></g>`}
  <ellipse cx="158" cy="286" rx="${mini ? 17 : 16}" ry="${mini ? 17 : 18}" fill="#fff" transform="rotate(-20 158 286)"/>
  <ellipse cx="328" cy="290" rx="${mini ? 18 : 17}" ry="${mini ? 18 : 19}" fill="#fff" transform="rotate(-20 328 290)"/>
  ${mini ? '' : `<circle cx="189" cy="327" r="7" fill="#fff"/><circle cx="363" cy="334" r="7.5" fill="#fff"/>
  <circle cx="178" cy="276" r="4" fill="#fff" opacity=".85"/><circle cx="350" cy="280" r="4.5" fill="#fff" opacity=".85"/>`}
  <!-- mofletes -->
  <ellipse cx="102" cy="392" rx="${mini ? 44 : 50}" ry="${mini ? 27 : 32}" fill="${mini ? '#ef9aa0' : `url(#${id}-rubor)`}"/>
  <ellipse cx="412" cy="394" rx="${mini ? 44 : 50}" ry="${mini ? 27 : 32}" fill="${mini ? '#ef9aa0' : `url(#${id}-rubor)`}"/>
  ${mini ? '' : `<g stroke="#fff" stroke-opacity=".95" stroke-width="6" stroke-linecap="round"><path d="M86 380 l-9 19 M104 380 l-9 19 M122 380 l-9 19 M396 382 l-9 19 M414 382 l-9 19 M432 382 l-9 19"/></g>`}
  <!-- la lengua sale de la ω -->
  <g clip-path="url(#${id}-boca)"><g transform="rotate(-7 266 380)">
    <path d="M246 350 L246 406 C246 434 286 434 286 406 L286 350 Z" fill="url(#${id}-lengua)" stroke="${T}" stroke-width="${mini ? 12 : 9}" stroke-linejoin="round"/>
    ${mini ? '' : `<path d="M266 388 L266 414" stroke="#d04d63" stroke-width="5" stroke-linecap="round"/><ellipse cx="255" cy="400" rx="5" ry="8" fill="#fff" opacity=".7"/><circle cx="276" cy="416" r="2.5" fill="#fff" opacity=".6"/>`}
  </g></g>
  <path d="M222 372 Q239 400 257 376 Q275 400 293 372" fill="none" stroke="${T}" stroke-width="${mini ? 18 : 13}" stroke-linecap="round" stroke-linejoin="round"/>
</g>
<rect x="14" y="14" width="484" height="484" rx="120" fill="url(#${id}-brillo)"/>
<rect x="14" y="14" width="484" height="484" rx="120" fill="none" stroke="${T}" stroke-width="${L}"/>
</svg>`;
}

