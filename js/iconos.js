// Iconos de la portada con la estética de la sala (la A): dibujo sencillo con línea de tinta gruesa y rellenos pastel,
// como pegatinas y menús de juego japonés. Sustituyen a los de píxel (probados el 29-09: no cuadraban).
// SVG en línea: nítidos a cualquier tamaño y con la misma tinta (#221817) en todos los temas.
// Son ARTE (pegatinas de papel crema con línea de tinta): van siempre sobre una ficha del color de su tipo de tarjeta (--c, temas.css),
// que es lo que cambia con el tema; por eso sus colores se quedan escritos aquí.
const T = '#221817';
const svg = (cuerpo, clase = 'ico') => `<svg class="${clase}" viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="${T}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round">${cuerpo}</svg>`;

// la cara de Nyan: orejas (la suya naranja), ojos de punto, mofletes y la boquita ω; sin nariz
const CARA_NYAN = `<path d="M10.5 20 12 7.5l8.6 7.6q3.4-.7 6.8 0L36 7.5 37.5 20q3.4 6 .3 12-3.6 6.8-13.8 6.8T10.2 32q-3.1-6 .3-12z" fill="#fffdf7" stroke="none"/>
  <path d="M12 7.5l8.6 7.6q-5.2.4-9.4 4z" fill="#f5c29a" stroke="none"/>
  <path d="M10.5 20 12 7.5l8.6 7.6q3.4-.7 6.8 0L36 7.5 37.5 20q3.4 6 .3 12-3.6 6.8-13.8 6.8T10.2 32q-3.1-6 .3-12z"/>
  <ellipse cx="18.6" cy="25.2" rx="2.2" ry="2.8" fill="${T}" stroke="none"/><ellipse cx="29.4" cy="25.2" rx="2.2" ry="2.8" fill="${T}" stroke="none"/>
  <circle cx="17.9" cy="24.2" r=".8" fill="#fff" stroke="none"/><circle cx="28.7" cy="24.2" r=".8" fill="#fff" stroke="none"/>
  <ellipse cx="13.6" cy="30.6" rx="3" ry="1.8" fill="#f4b3b0" stroke="none"/><ellipse cx="34.4" cy="30.6" rx="3" ry="1.8" fill="#f4b3b0" stroke="none"/>
  <path d="M20.6 30.4q1.7 2.2 3.4 0 1.7 2.2 3.4 0" stroke-width="2.1"/>`;

export const ICONOS = {
  // dos tarjetas y el visto bueno
  repaso: svg(`<rect x="9" y="9" width="23" height="29" rx="4" fill="#fbe0c8" transform="rotate(-10 20.5 23.5)"/>
    <rect x="15" y="11" width="23" height="29" rx="4" fill="#fffdf7"/><path d="M20.5 26.5l4.2 4.2 7.6-9" stroke="#d8663a" stroke-width="3.4"/>`),
  // un libro abierto con un brote (lo nuevo que crece)
  leccion: svg(`<path d="M24 16c-4.5-3-10.5-3.8-16-2.8V37c5.5-1 11.5-.2 16 2.8z" fill="#fffdf7"/><path d="M24 16c4.5-3 10.5-3.8 16-2.8V37c-5.5-1-11.5-.2-16 2.8z" fill="#fbe3e4"/>
    <path d="M24 16v23.8"/><path d="M12 21.5c3-.5 6-.1 8.5 1M12 27c3-.5 6-.1 8.5 1M27.5 22.5c2.5-1.1 5.5-1.5 8.5-1M27.5 28c2.5-1.1 5.5-1.5 8.5-1" stroke-width="1.9"/>
    <path d="M24 14.5c0-3.2.9-5.6 3-7"/><path d="M27 7.5c2.6-.3 4.2 1 4.2 3.6-2.6.3-4.2-1-4.2-3.6z" fill="#c6e2c1" stroke-width="2"/>`),
  // una pieza de puzle (la gramática encaja las palabras)
  gramatica: svg(`<path d="M11 15h8a5 5 0 1 1 10 0h8v8a5 5 0 1 1 0 10v8h-8a5 5 0 1 0-10 0h-8v-8a5 5 0 1 0 0-10z" fill="#bcd4ec"/>
    <text x="24" y="30.5" text-anchor="middle" font-size="15" font-family="Mochiy Pop One, Zen Maru Gothic, sans-serif" fill="${T}" stroke="none">文</text>`),
  // una hoja de práctica con 字
  kanji: svg(`<rect x="10" y="8" width="28" height="33" rx="3.5" fill="#f9efcb"/><path d="M14 13h20M14 36h20" stroke-width="1.7" opacity=".45"/>
    <text x="24" y="32" text-anchor="middle" font-size="19" font-weight="400" font-family="Mochiy Pop One, Zen Maru Gothic, sans-serif" fill="${T}" stroke="none">字</text>`),
  // un mapa con su caminito y la bandera de la meta
  camino: svg(`<path d="M7 14l11-4 12 4 11-4v27l-11 4-12-4-11 4z" fill="#c6e2c1"/><path d="M18 10v27M30 14v27" stroke-width="1.8"/>
    <path d="M11.5 31c4-1 5.5-6.5 10-6.5s6 4.5 10 2.5" stroke="#d8663a" stroke-width="2.3" stroke-dasharray="2.4 3.2"/>
    <path d="M33 27V13.5l7 2.8-7 2.8" fill="#f4c3c6"/>`),
  // un libro de cuentos abierto con un bocadillo encima (las historias de Nyan)
  historias: svg(`<path d="M24 20c-4.5-2.6-10.5-3.3-16-2.4V39c5.5-.9 11.5-.2 16 2.4z" fill="#fff1b8"/><path d="M24 20c4.5-2.6 10.5-3.3 16-2.4V39c-5.5-.9-11.5-.2-16 2.4z" fill="#fffdf7"/>
    <path d="M24 20v21.4"/><path d="M28 26c2.4-.9 5-1.2 7.6-.9M28 31c2.4-.9 5-1.2 7.6-.9M12.4 26c2.6-.3 5.2 0 7.6.9M12.4 31c2.6-.3 5.2 0 7.6.9" stroke-width="1.8"/>
    <path d="M19 5.5h15a4 4 0 0 1 4 4v3.5a4 4 0 0 1-4 4h-8l-4.5 3.2.9-3.2H19a4 4 0 0 1-4-4V9.5a4 4 0 0 1 4-4z" fill="#d6ecf8" stroke-width="2.2"/>
    <circle cx="22" cy="11.3" r="1.2" fill="${T}" stroke="none"/><circle cx="26.5" cy="11.3" r="1.2" fill="${T}" stroke="none"/><circle cx="31" cy="11.3" r="1.2" fill="${T}" stroke="none"/>`),
  mochi: svg(CARA_NYAN),
  // dos fichas de kana: あ (hiragana) y ア (katakana)
  kana: svg(`<rect x="6" y="12" width="21" height="25" rx="4" fill="#fde2ea" transform="rotate(-8 16.5 24.5)"/><rect x="21" y="10" width="21" height="25" rx="4" fill="#fffdf7" transform="rotate(7 31.5 22.5)"/>
    <text x="16.5" y="30.5" text-anchor="middle" font-size="14" font-family="Mochiy Pop One, Zen Maru Gothic, sans-serif" fill="${T}" stroke="none" transform="rotate(-8 16.5 24.5)">あ</text>
    <text x="31.5" y="28.5" text-anchor="middle" font-size="14" font-family="Mochiy Pop One, Zen Maru Gothic, sans-serif" fill="${T}" stroke="none" transform="rotate(7 31.5 22.5)">ア</text>`),
  // una ficha con 活 y la flecha de «cambiar de forma»
  conjugar: svg(`<rect x="7" y="8" width="26" height="31" rx="5" fill="#d6ecf8" transform="rotate(-7 20 23.5)"/><rect x="15" y="10" width="26" height="31" rx="5" fill="#fffdf7"/>
    <text x="28" y="31" text-anchor="middle" font-size="19" font-family="Mochiy Pop One, Zen Maru Gothic, sans-serif" fill="${T}" stroke="none">活</text>
    <path d="M9.5 38.5c0 4.4 4 7 9 6.2" stroke="#d8663a" stroke-width="3.2"/><path d="M15.8 41.2l3.6 3.6-4.2 2.3" stroke="#d8663a" stroke-width="3.2"/>`),
};
// la carita de Nyan en pequeño (la racha de la barra de arriba)
export const CARITA_NYAN = svg(CARA_NYAN, 'ico ico-nyan');
