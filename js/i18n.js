// Idioma de la interfaz: español o inglés. Guía para traducir un módulo: web/i18n/LEEME.md.
// Se carga antes que nada: cada módulo que lo importa espera al diccionario (top-level await), así las constantes de módulo
// (GRUPOS, MODOS, CREDITOS…) ya nacen traducidas. Cambiar de idioma = guardarlo en los ajustes y recargar la página.
// Orden: ?lang=en (pruebas, no se guarda) → el de los ajustes (/api/idioma) → la primera vez, el del navegador (y se guarda).
export const IDIOMAS = ['es', 'en'];
const valido = (x) => (IDIOMAS.includes(x) ? x : null);
const navegador = typeof location !== 'undefined' && typeof fetch === 'function';
const forzado = navegador ? valido(new URLSearchParams(location.search).get('lang')) : null;
const delSistema = () => (String((navigator.languages && navigator.languages[0]) || navigator.language || '').toLowerCase().startsWith('es') ? 'es' : 'en');
const ajustes = navegador && !forzado ? await fetch('/api/idioma').then((r) => (r.ok ? r.json() : null)).catch(() => null) : null;

/** 'es' | 'en' */
export const idioma = forzado || valido(ajustes?.idioma) || (navegador ? delSistema() : valido(globalThis.NYANGO_IDIOMA) || 'es');
/** Cabecera para cada petición a /api/: el servidor responde con el contenido y los textos de este idioma. */
export const CABECERA = { 'X-Nyango-Idioma': idioma };
// la primera vez (nada guardado todavía), el idioma del navegador se queda en los ajustes
if (ajustes && ajustes.idioma === null) fetch('/api/ajustes', { method: 'POST', headers: { 'Content-Type': 'application/json', ...CABECERA }, body: JSON.stringify({ idioma }) }).catch(() => {});

const cargar = (i) => fetch(`/i18n/${i}.json`).then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
const [DIC, BASE] = navegador ? await Promise.all([cargar(idioma), idioma === 'es' ? null : cargar('es')]) : [{}, null];

const avisadas = new Set();
const avisar = (msg) => { if (!avisadas.has(msg)) { avisadas.add(msg); console.warn(msg); } };
function buscar(clave) {
  if (clave in DIC) return DIC[clave];
  if (BASE && clave in BASE) { avisar(`i18n: falta «${clave}» en ${idioma}.json (sale en español)`); return BASE[clave]; }
  if (navegador) avisar(`i18n: no existe la clave «${clave}»`);
  return clave;
}
const rellenar = (s, v = {}) => String(s ?? '').replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));
const formato = new Intl.NumberFormat(idioma === 'es' ? 'es-ES' : 'en-US');
const plurales = new Intl.PluralRules(idioma);

/** Número redondeado con los separadores del idioma (1.500 · 1,500; en español, 1000 sin punto como siempre). */
export const num = (n) => formato.format(Math.round(Number(n) || 0));
/** Texto de la clave con {marcadores} rellenos. Los valores van tal cual: si acaban en innerHTML, escápalos antes (esc). */
export const t = (clave, v) => { const x = buscar(clave); return rellenar(x && typeof x === 'object' ? x.other : x, v); };
/** Plural: la clave vale {"one": "…", "other": "…"}; {n} sale con num() salvo que v traiga su propia n. */
export const tn = (clave, n, v = {}) => {
  const x = buscar(clave);
  return rellenar(x && typeof x === 'object' ? (x[plurales.select(n)] ?? x.other) : x, { n: num(n), ...v });
};
/** ¿Existe la clave en este idioma (o en español)? */
export const hay = (clave) => clave in DIC || !!(BASE && clave in BASE);
/** Etiqueta de una tecla: las teclas son las mismas en los dos idiomas, solo cambia el nombre (Intro → Enter, Mayús + Tab → Shift + Tab). */
export const tecla = (nombre) => (idioma === 'es' ? String(nombre) : String(nombre).replace(/[A-Za-zÁÉÍÓÚáéíóúñ]+/g, (w) => DIC['tecla.' + w] ?? w));
/** <kbd> con la etiqueta traducida (teclado.js la exporta también). */
export const kbd = (nombre) => `<kbd>${tecla(nombre)}</kbd>`;

/** Traduce el HTML estático: data-i18n (texto), data-i18n-title, data-i18n-aria-label y data-i18n-content (atributos). */
export function traducirPagina(raiz = document) {
  for (const el of raiz.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const [atr, dato] of [['title', 'i18nTitle'], ['aria-label', 'i18nAriaLabel'], ['content', 'i18nContent']]) {
    for (const el of raiz.querySelectorAll(`[data-${atr === 'aria-label' ? 'i18n-aria-label' : 'i18n-' + atr}]`)) el.setAttribute(atr, t(el.dataset[dato]));
  }
}
/** Guarda el idioma y recarga la página (sin el ?lang= de las pruebas, que mandaría sobre lo guardado). */
export async function cambiarIdioma(nuevo) {
  if (!valido(nuevo)) return;
  await fetch('/api/ajustes', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Nyango-Idioma': nuevo }, body: JSON.stringify({ idioma: nuevo }) }).catch(() => {});
  // el motor de la app guarda en segundo plano: sin esperar, la recarga cortaba el guardado y volvía el idioma de antes
  await Promise.race([globalThis.__nyangoGuardado?.(), new Promise((ok) => setTimeout(ok, 4000))]).catch(() => {});
  const u = new URL(location.href);
  if (u.searchParams.has('lang')) { u.searchParams.delete('lang'); location.replace(u.toString()); } else location.reload();
}

if (navegador && typeof document !== 'undefined') {
  document.documentElement.lang = idioma;
  // el HTML ya viene en español; en otro idioma se traduce al cargar, antes de que arranque la app
  if (idioma !== 'es') traducirPagina();
  // textos que viven en el CSS (content:): se pasan como variables
  document.documentElement.style.setProperty('--i18n-ojo', JSON.stringify(t('css.ojo')));
}
