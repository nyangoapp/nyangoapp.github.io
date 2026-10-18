// Dibujos del estilo B (30-09): las figuras y los fondos de las escenas, en web/img/tinta/fig y web/img/tinta/fondo.
//   node web/img/fuente/generar-tinta.mjs
// Se dibujan en SVG con tinta.mjs (línea de pincel, acuarela, washi) y se pasan a imagen con rsvg-convert y magick:
// los filtros del SVG son caros de pintar en vivo, así que la app recibe la imagen ya hecha.
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import * as T from './tinta.mjs';
import { FIGURAS_B } from './figuras-tinta.mjs';
import * as G from './grabado.mjs';
import { FONDOS_B } from './fondos-tinta.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const SALIDA = join(AQUI, '..', 'tinta');
mkdirSync(SALIDA, { recursive: true });
mkdirSync(join(SALIDA, 'fig'), { recursive: true });
mkdirSync(join(SALIDA, 'fondo'), { recursive: true });
const tmp = join(tmpdir(), 'nyango-tinta');
mkdirSync(tmp, { recursive: true });
const soloEstos = process.argv.slice(2);

// las figuras de las escenas (clase-arte.js las pone como <image>): web/img/tinta/fig/<id>.webp
const pinta = (svgTxt, nombre, destino, w, h) => {
  const svg = join(tmp, `${nombre}.svg`), png = join(tmp, `${nombre}.png`);
  writeFileSync(svg, svgTxt);
  execFileSync('rsvg-convert', ['-w', String(w), '-h', String(h), svg, '-o', png]);
  execFileSync('magick', [png, '-quality', '88', '-define', 'webp:alpha-quality=100', destino]);
};
for (const [id, fn] of Object.entries(FIGURAS_B)) {
  if (soloEstos.length && !soloEstos.includes(id) && !soloEstos.includes('fig')) continue;
  const k = T.lienzo('f' + id.replace(/[^a-z]/g, ''), 256);
  fn(k);
  pinta(k.render(), 'fig-' + id, join(SALIDA, 'fig', `${id}.webp`), 256, 256);
  console.log('figura:', id);
}
// los fondos de las escenas (400 × 260, como FONDOS de clase-arte.js): web/img/tinta/fondo/<id>.webp
for (const [id, fn] of Object.entries(FONDOS_B)) {
  if (soloEstos.length && !soloEstos.includes(id) && !soloEstos.includes('fondo')) continue;
  const k = G.lienzo('g' + id, 800, { base: 400, grosor: 0.5 });
  fn(k);
  const svg = k.render().replace('viewBox="0 0 800 800" width="800" height="800"', 'viewBox="0 0 800 520" width="800" height="520"');
  pinta(svg, 'fondo-' + id, join(SALIDA, 'fondo', `${id}.webp`), 1000, 650);
  console.log('fondo:', id);
}

rmSync(tmp, { recursive: true, force: true });
