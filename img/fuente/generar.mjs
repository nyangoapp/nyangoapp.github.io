// Genera las ilustraciones SVG de Nyango y la hoja de contactos.
//   node web/img/fuente/generar.mjs
// Salida: web/img/objetos/<id>.svg, web/img/jefes/<id>.svg, web/img/iconos/<id>.svg y web/img/hoja.html
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lienzo } from './kit.mjs';
import { OBJETOS } from './objetos.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const IMG = join(AQUI, '..');
const RAIZ = join(IMG, '..', '..');
const catalogo = JSON.parse(readFileSync(join(RAIZ, 'contenido', 'juego', 'catalogo.json'), 'utf8'));

let JEFES = {}, ICONOS = {};
try { ({ JEFES } = await import('./jefes.mjs')); } catch (e) { if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e; }
try { ({ ICONOS } = await import('./iconos.mjs')); } catch (e) { if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e; }

const ICONOS_LISTA = [
  ['repaso', 'Repaso'], ['leccion', 'Lección'], ['gramatica', 'Gramática'], ['kanji', 'Kanji'], ['camino', 'Camino'],
  ['mochi', 'Mochi'], ['koban', 'Koban'], ['bolsa', 'Bolsa de la suerte'], ['omamori', 'Omamori'], ['mision', 'Misión'],
  // extra (combos, XP, vidas en la batalla, títulos)
  ['racha', 'Racha / combo'], ['xp', 'XP'], ['vida', 'Vida'], ['trofeo', 'Título / medalla'],
];

const faltan = [];
function dibujar(carpeta, id, tam, fn, opciones) {
  mkdirSync(join(IMG, carpeta), { recursive: true });
  if (!fn) { faltan.push(`${carpeta}/${id}`); return; }
  const k = lienzo(id, tam, opciones);
  fn(k);
  writeFileSync(join(IMG, carpeta, `${id}.svg`), k.render());
}

for (const o of catalogo.objetos) dibujar('objetos', o.id, 256, OBJETOS[o.id]);
// los jefes se dibujan en el espacio de 256 y se escalan a 512, con línea algo más fina para el detalle
for (const j of catalogo.jefes) dibujar('jefes', j.id, 512, JEFES[j.id], { base: 256, grosor: 0.8 });
for (const [id] of ICONOS_LISTA) dibujar('iconos', id, 256, ICONOS[id]);

// ── hoja de contactos ──
const rar = catalogo.rarezas;
const celda = (src, nombre, extra = '') => `<figure class="c">
  <div class="pared"><img src="${src}" width="128" height="128" alt=""></div>
  <div class="carta"><img src="${src}" width="64" height="64" alt=""><img src="${src}" width="32" height="32" alt=""><span class="n">${nombre}${extra}</span></div>
</figure>`;
const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Hoja de ilustraciones</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
:root { --yeso: #8e7747; --crema: #f7efdf; --tinta: #261f19; }
* { box-sizing: border-box; }
body { margin: 0; background: #5d4d2e; color: var(--crema); font: 14px/1.3 "Instrument Sans", system-ui, sans-serif; padding: 24px; }
h2 { font: 700 22px "Fredoka", system-ui, sans-serif; margin: 8px 0 12px; }
section { display: none; }
body:not([data-s]) section, body[data-s="objetos"] #objetos, body[data-s="jefes"] #jefes, body[data-s="iconos"] #iconos, body[data-s="grande"] #grande, body[data-s="zoom"] #zoom { display: block; }
.rejilla { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 12px; }
.c { margin: 0; border-radius: 16px; overflow: hidden; box-shadow: 0 6px 0 #3e331d; }
.pared { height: 150px; display: grid; place-items: center;
  background: radial-gradient(120% 90% at 30% 20%, #b09a63 0%, #8e7747 55%, #6a5733 100%); }
.carta { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: var(--crema); color: var(--tinta); min-height: 80px; }
.n { font-size: 12px; font-weight: 600; line-height: 1.25; }
.n small { display: block; font-weight: 500; opacity: .7; }
.jefes { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
.jefe { border-radius: 18px; overflow: hidden; background: radial-gradient(120% 90% at 50% 20%, #b09a63, #6a5733); text-align: center; padding: 10px 6px 0; }
.jefe img { width: 100%; height: auto; display: block; }
.jefe .fila { display: flex; gap: 8px; align-items: center; justify-content: center; background: var(--crema); color: var(--tinta); padding: 6px; margin: 0 -6px; }
.grande { display: flex; flex-wrap: wrap; gap: 16px; }
.grande img { width: 256px; height: 256px; background: var(--crema); border-radius: 20px; }
</style></head>
<body>
<script>const s = new URLSearchParams(location.search).get('s'); if (s) document.body.dataset.s = s;</script>
<section id="iconos"><h2>Iconos de actividad</h2><div class="rejilla">
${ICONOS_LISTA.map(([id, n]) => celda(`iconos/${id}.svg`, n)).join('\n')}
</div></section>
<section id="objetos"><h2>Objetos (${catalogo.objetos.length})</h2><div class="rejilla">
${catalogo.objetos.map((o) => celda(`objetos/${o.id}.svg`, o.nombre, `<small style="color:${rar[o.rareza].color}">${rar[o.rareza].nombre} · ${o.tipo}</small>`)).join('\n')}
</div></section>
<section id="jefes"><h2>Jefes yōkai</h2><div class="jefes">
${catalogo.jefes.map((j) => `<figure class="jefe" style="margin:0"><img src="jefes/${j.id}.svg" alt=""><div class="fila"><img src="jefes/${j.id}.svg" style="width:64px;height:64px" alt=""><span class="n">${j.nombre}<small>${j.jp}</small></span></div></figure>`).join('\n')}
</div></section>
<section id="grande"><h2>A 256 px</h2><div class="grande">
${ICONOS_LISTA.map(([id]) => `<img src="iconos/${id}.svg" alt="">`).join('')}
</div></section>
<section id="zoom"><div class="grande" id="zoomrej"></div></section>
<script>
// ?s=zoom&t=objetos&desde=0&n=10&tam=256 → vista grande para revisar detalles
const LISTAS = { objetos: ${JSON.stringify(catalogo.objetos.map((o) => o.id))}, jefes: ${JSON.stringify(catalogo.jefes.map((j) => j.id))}, iconos: ${JSON.stringify(ICONOS_LISTA.map(([id]) => id))} };
const q = new URLSearchParams(location.search);
if (q.get('s') === 'zoom') {
  const t = q.get('t') || 'objetos', desde = +(q.get('desde') || 0), n = +(q.get('n') || 10), tam = +(q.get('tam') || 256);
  document.getElementById('zoomrej').innerHTML = LISTAS[t].slice(desde, desde + n).map((id, i) =>
    '<img src="' + t + '/' + id + '.svg" style="width:' + tam + 'px;height:' + tam + 'px;background:' + (i % 2 ? '#f7efdf' : 'radial-gradient(#b09a63,#6a5733)') + '" title="' + id + '">').join('');
}
</script>
</body></html>
`;
writeFileSync(join(IMG, 'hoja.html'), html);
console.log(`objetos ${catalogo.objetos.length}, jefes ${catalogo.jefes.length}, iconos ${ICONOS_LISTA.length}` + (faltan.length ? `\nsin dibujar: ${faltan.join(', ')}` : '\ntodo dibujado'));
