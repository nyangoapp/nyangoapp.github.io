// Textos del motor (nucleo/textos.py): las claves «srv.*» de web/i18n/<idioma>.json y los nombres del juego de
// datos/juego/textos.<idioma>.json. El idioma de cada petición lo pone el enrutador (cabecera X-Nyango-Idioma o ajustes).
export const IDIOMAS = ['es', 'en'];
const I18N = {}, JUEGO = {};
let actual = 'es';

export const valido = (i) => (IDIOMAS.includes(i) ? i : null);
export const poner = (i) => { actual = valido(i) || 'es'; };
export const idioma = () => actual;

const leer = async (ruta) => { try { const r = await fetch(ruta); return r.ok ? await r.json() : {}; } catch (e) { return {}; } };
export async function cargarTextos() {
  await Promise.all(IDIOMAS.flatMap((i) => [
    leer(`/i18n/${i}.json`).then((d) => { I18N[i] = d; }),
    leer(`/datos/juego/textos.${i}.json`).then((d) => { JUEGO[i] = d; }),
  ]));
}

export const plural = (n) => (n === 1 ? 'one' : 'other');
export const rellenar = (texto, v = {}) => String(texto).replace(/\{(\w+)\}/g, (m, k) => (k in v ? String(v[k]) : m));

/** Texto del servidor en el idioma de la petición; si falta, el español; si tampoco, la clave */
export function tx(clave, v = {}, i = null) {
  const id = valido(i) || actual;
  let x;
  for (const k of [...new Set([id, 'es'])]) { x = (I18N[k] || {})['srv.' + clave]; if (x !== undefined) break; }
  if (x === undefined) return clave;
  if (x && typeof x === 'object') x = x[plural(v.n)] || x.other || '';
  return rellenar(x, v);
}

/** Nombres del juego por id en el idioma pedido; lo que falte, en español */
export function juego(i = null) {
  const id = valido(i) || actual, es = JUEGO.es || {};
  if (id === 'es') return es;
  const otro = JUEGO[id] || {}, salida = {};
  for (const k of new Set([...Object.keys(es), ...Object.keys(otro)])) {
    const a = es[k], b = otro[k];
    salida[k] = a && b && typeof a === 'object' && !Array.isArray(a) && typeof b === 'object' && !Array.isArray(b) ? { ...a, ...b } : (b !== undefined ? b : a);
  }
  return salida;
}
