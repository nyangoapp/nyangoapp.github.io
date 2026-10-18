// node web/i18n/revisar.mjs · comprueba los diccionarios antes de publicar:
// · es.json y en.json tienen las mismas claves (en.json además las «tecla.*»), con los mismos {marcadores} y etiquetas HTML;
// · toda clave literal que usa el código (t('…'), tn('…') en web/js; tx("…") y ErrorJuego("error.…") en Python) existe.
// Sale con código 1 si algo falla.
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const I18N = dirname(fileURLToPath(import.meta.url)), WEB = join(I18N, '..'), RAIZ = join(WEB, '..');
const leer = (r) => JSON.parse(readFileSync(join(I18N, r), 'utf8'));
const es = leer('es.json'), en = leer('en.json');
const fallos = [];
const textos = (v) => (v && typeof v === 'object' ? Object.values(v) : [v]).map(String);
const marcas = (v) => [...new Set(textos(v).flatMap((s) => s.match(/\{\w+\}/g) || []))].sort().join(' ');
const etiquetas = (v) => [...new Set(textos(v).flatMap((s) => s.match(/<\/?[a-z]+/g) || []))].sort().join(' ');

for (const k of Object.keys(es)) {
  if (!(k in en)) { fallos.push(`falta en en.json: ${k}`); continue; }
  if (marcas(es[k]) !== marcas(en[k])) fallos.push(`marcadores distintos en ${k}: es «${marcas(es[k])}» · en «${marcas(en[k])}»`);
  if (etiquetas(es[k]) !== etiquetas(en[k])) fallos.push(`etiquetas HTML distintas en ${k}`);
  if ((typeof es[k] === 'object') !== (typeof en[k] === 'object')) fallos.push(`plural en un idioma y no en el otro: ${k}`);
}
for (const k of Object.keys(en)) if (!(k in es) && !k.startsWith('tecla.')) fallos.push(`sobra en en.json (no está en es.json): ${k}`);

// claves que usa el código
const hay = (k) => k in es;
const prefijoExiste = (p) => Object.keys(es).some((k) => k.startsWith(p));
const js = readdirSync(join(WEB, 'js')).filter((f) => f.endsWith('.js') && !/^personaje-|^mascota-v1/.test(f));
for (const f of js) {
  const s = readFileSync(join(WEB, 'js', f), 'utf8');
  for (const m of s.matchAll(/\bt[n]?\(\s*'([^']+)'/g)) if (!hay(m[1])) fallos.push(`${f}: no existe la clave «${m[1]}»`);
  for (const m of s.matchAll(/\bt[n]?\(\s*`([^`$]*)\$\{/g)) if (!prefijoExiste(m[1])) fallos.push(`${f}: ninguna clave empieza por «${m[1]}»`);
}
const html = readFileSync(join(WEB, 'index.html'), 'utf8');
for (const m of html.matchAll(/data-i18n(?:-[a-z-]+)?="([^"]+)"/g)) if (!hay(m[1])) fallos.push(`index.html: no existe la clave «${m[1]}»`);
const py = ['servidor.py', ...readdirSync(join(RAIZ, 'nucleo')).filter((f) => f.endsWith('.py')).map((f) => join('nucleo', f))];
for (const f of py) {
  const s = readFileSync(join(RAIZ, f), 'utf8');
  for (const m of s.matchAll(/\btx\(\s*"([^"]+)"/g)) if (!hay('srv.' + m[1])) fallos.push(`${f}: no existe la clave «srv.${m[1]}»`);
  for (const m of s.matchAll(/ErrorJuego\(\s*"(error\.[^"]+)"/g)) if (!hay('srv.' + m[1])) fallos.push(`${f}: no existe la clave «srv.${m[1]}»`);
}
// los textos del juego (contenido/juego/textos.*.json): mismas claves e ids
const juego = (i) => JSON.parse(readFileSync(join(RAIZ, 'contenido', 'juego', `textos.${i}.json`), 'utf8'));
const je = juego('es'), ji = juego('en');
for (const k of Object.keys(je)) {
  if (!(k in ji)) { fallos.push(`textos.en.json: falta «${k}»`); continue; }
  const a = je[k], b = ji[k];
  if (Array.isArray(a) ? a.length !== b.length : Object.keys(a).join() !== Object.keys(b).join()) fallos.push(`textos.en.json: «${k}» no tiene los mismos ids que el español`);
}

console.log(fallos.length ? fallos.join('\n') : `bien: ${Object.keys(es).length} claves en es.json y en.json`);
process.exit(fallos.length ? 1 : 0);
