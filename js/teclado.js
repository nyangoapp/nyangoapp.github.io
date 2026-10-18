// Teclado: todo Nyango se usa sin ratón.
// · Atajos globales cuando no estás escribiendo: I R L G K C M (vistas), B (bolsas), A (ajustes), ? (esta hoja) y Esc (volver).
// · Capas propias (hoja de atajos, ajustes, confirmaciones) con las teclas y el foco atrapados dentro.
// · Las capas de otros módulos (bolsas, colección, jefes, lámina, hoja de gramática) también atrapan Tab,
//   reciben el foco al abrirse y lo devuelven al cerrarse.
// · Rejillas con flechas y tabulación itinerante: un solo Tab para entrar y flechas para moverse.
// · Si nadie usa ↑ ↓ AvPág RePág Inicio Fin o Espacio, desplazan la vista activa o la capa de arriba (aunque el foco esté en <body>).
import { gsap } from 'gsap';
import { t, kbd } from './i18n.js';

const quieto = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
// las teclas son las mismas en los dos idiomas; solo cambia su nombre (Intro → Enter, Mayús → Shift)
export { kbd };

// ── ¿está escribiendo? (entonces las letras son letras, no atajos) ──
export function escribiendo(e) {
  const t = e?.target;
  if (!t || !t.tagName) return false;
  if (t.isContentEditable || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT') return true;
  if (t.tagName === 'INPUT') return !t.readOnly && !['button', 'checkbox', 'radio', 'range', 'submit', 'reset'].includes(t.type);
  return false;
}
// ¿la tecla va a un control con su propio comportamiento (botón, enlace, casilla)?
export const sobreControl = (e) => {
  const t = e?.target;
  return !!(t && t !== document.body && t.closest?.('button, a[href], input, select, textarea, summary, [role="button"], [role="radio"], [role="option"], [role="tab"]'));
};

const ENFOCABLE = 'button:not([disabled]), a[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
export const visible = (el) => !!el && el.isConnected && (el.checkVisibility ? el.checkVisibility({ visibilityProperty: true }) : el.offsetParent !== null);
// tabindex="-1" (radios no elegidos, rejillas itinerantes) queda fuera de la vuelta de Tab
export const enfocables = (raiz) => [...raiz.querySelectorAll(ENFOCABLE)].filter((x) => x.tabIndex >= 0 && visible(x) && !x.closest('[inert]'));
export function primerFoco(raiz) {
  if (!raiz) return null;
  if (raiz.hasAttribute('data-foco-capa')) return raiz;
  const pref = [...raiz.querySelectorAll('[data-foco], [data-a="usar"], [data-ya], .rc-fuku-caja, #h-ok, .boton-tinta, .rc-boton:not(.claro), .bj-boton:not(.claro)')]
    .find((x) => visible(x) && !x.disabled);
  return pref || enfocables(raiz)[0] || null;
}
const enfocar = (el) => { try { el?.focus({ preventScroll: true }); } catch {} };

// ── capas ──
export const CAPAS_AJENAS = '.modal-capa, .rc-capa, .cm-hoja, .capa-lamina, .hoja-gram';
const PILA = []; // capas propias: { el, tecla, t }
let ultimaAjena = { el: null, t: 0 };
const ajenas = () => [...document.querySelectorAll(CAPAS_AJENAS)].filter((x) => x.isConnected && getComputedStyle(x).visibility !== 'hidden');
export function capaAbierta() {
  const mia = PILA[PILA.length - 1];
  const fuera = ajenas().pop();
  if (mia && fuera) return ultimaAjena.el === fuera && ultimaAjena.t > mia.t ? fuera : mia.el;
  return mia?.el || fuera || null;
}

/** Abre una capa propia: sus teclas no llegan a nada de debajo y Tab da vueltas dentro. Devuelve la función para soltarla. */
export function capa(el, tecla, { foco = null } = {}) {
  const previo = document.activeElement;
  const entrada = { el, tecla, t: performance.now() };
  PILA.push(entrada);
  requestAnimationFrame(() => enfocar(foco || primerFoco(el)));
  return () => {
    const i = PILA.indexOf(entrada);
    if (i >= 0) PILA.splice(i, 1);
    if (previo?.isConnected && visible(previo) && !capaAbierta()) enfocar(previo);
  };
}

// Tab atrapado en la capa de arriba (propia o ajena) + teclas de las capas propias, antes que nadie
function atrapar(e, raiz) {
  const f = enfocables(raiz);
  e.preventDefault();
  if (!f.length) { if (raiz.hasAttribute('tabindex')) enfocar(raiz); return; }
  const i = f.indexOf(document.activeElement);
  const j = i < 0 ? (e.shiftKey ? f.length - 1 : 0) : (i + (e.shiftKey ? -1 : 1) + f.length) % f.length;
  f[j].focus();
}
addEventListener('keydown', (e) => {
  const arriba = capaAbierta();
  if (!arriba) return;
  const mia = PILA.find((x) => x.el === arriba);
  if (e.key === 'Tab') { atrapar(e, arriba); if (mia) e.stopImmediatePropagation(); return; }
  if (!mia) return; // las capas ajenas gestionan sus propias teclas
  e.stopImmediatePropagation();
  if (mia.tecla?.(e)) e.preventDefault(); else desplazar(e, arriba);
}, true);

// ── desplazar con el teclado: si nadie usa la tecla, ↑ ↓ AvPág RePág Inicio Fin y Espacio mueven la vista activa o la capa de arriba ──
const TECLAS_SCROLL = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '];
const USA_TECLAS = 'input, select, textarea, [contenteditable], [role="radio"], [role="option"], [role="tab"], [role="slider"], [role="spinbutton"], [role="listbox"], [role="menuitem"], [role="gridcell"], [role="treeitem"]';
const desplazable = (el) => !!el && el.scrollHeight - el.clientHeight > 2 && /auto|scroll/.test(getComputedStyle(el).overflowY);
function scrollDe(raiz) {
  if (!raiz) return null;
  if (desplazable(raiz)) return raiz;
  const r = raiz.getBoundingClientRect();
  const x = Math.min(innerWidth - 2, Math.max(1, r.left + r.width / 2)), y = Math.min(innerHeight - 2, Math.max(1, r.top + r.height / 2));
  const n0 = document.elementsFromPoint(x, y).find((n) => raiz.contains(n));
  for (let n = n0; n && n !== raiz; n = n.parentElement) if (desplazable(n) && n.clientHeight > raiz.clientHeight * 0.4) return n;
  return [...raiz.querySelectorAll(':scope > *, :scope > * > *')].find((n) => desplazable(n) && n.clientHeight > raiz.clientHeight * 0.5) || null;
}
// cuánto tapan arriba y abajo las piezas pegajosas (sticky) del contenedor
function tapas(sc) {
  const s = sc.getBoundingClientRect(), t = { arriba: 0, abajo: 0 };
  for (const x of sc.querySelectorAll(':scope > *, :scope > * > *, .kj-pie, .cm-cab')) {
    const cs = getComputedStyle(x);
    if (cs.position !== 'sticky') continue;
    const r = x.getBoundingClientRect();
    // pegada arriba y a lo ancho (la cabecera, no la columna del índice) · pegada abajo (un pie)
    if (cs.top !== 'auto' && Math.abs(r.top - s.top - parseFloat(cs.top)) < 3 && r.width > s.width * 0.5) t.arriba = Math.max(t.arriba, r.bottom - s.top);
    else if (cs.bottom !== 'auto' && r.bottom >= s.bottom - 80 && r.top < s.bottom) t.abajo = Math.max(t.abajo, s.bottom - r.top);
  }
  return t;
}
/** Desplaza raiz (o su contenedor con scroll) si la tecla no la usa nadie. Devuelve true si la ha usado. */
export function desplazar(e, raiz) {
  const k = e.key, t = e.target, f = document.activeElement;
  if (!TECLAS_SCROLL.includes(k) || e.defaultPrevented || e.isComposing || e.ctrlKey || e.metaKey || e.altKey || (e.shiftKey && k !== ' ')) return false;
  if (escribiendo(e) || escribiendo({ target: f })) return false;
  const soloLectura = t?.tagName === 'INPUT' && t.readOnly && !['Home', 'End', ' '].includes(k); // la casilla ya respondida no usa ↑ ↓ AvPág
  if (t?.closest?.(USA_TECLAS) && !soloLectura) return false;
  if (k === ' ' && sobreControl(e) && !t.closest('a[href]')) return false; // Espacio pulsa el botón con foco
  const sc = scrollDe(raiz);
  if (!sc) return false;
  const { arriba, abajo } = tapas(sc), pagina = Math.max(60, sc.clientHeight - arriba - abajo - 40);
  const dy = { ArrowUp: -80, ArrowDown: 80, PageUp: -pagina, PageDown: pagina, ' ': e.shiftKey ? -pagina : pagina }[k];
  const behavior = quieto() || e.repeat ? 'auto' : 'smooth';
  e.preventDefault();
  if (k === 'Home') sc.scrollTo({ top: 0, behavior });
  else if (k === 'End') sc.scrollTo({ top: sc.scrollHeight, behavior });
  else sc.scrollBy({ top: dy, behavior });
  return true;
}

// las capas ajenas reciben el foco al abrirse y lo devuelven al cerrarse
const recuerdo = new WeakMap();
new MutationObserver((ms) => {
  for (const m of ms) {
    for (const n of m.addedNodes) {
      if (n.nodeType !== 1 || !n.matches(CAPAS_AJENAS)) continue;
      recuerdo.set(n, document.activeElement);
      ultimaAjena = { el: n, t: performance.now() };
      setTimeout(() => { if (n.isConnected && !n.contains(document.activeElement)) enfocar(primerFoco(n)); }, 90);
    }
    for (const n of m.removedNodes) {
      if (n.nodeType !== 1 || !n.matches(CAPAS_AJENAS)) continue;
      const p = recuerdo.get(n);
      setTimeout(() => { if (p?.isConnected && visible(p) && !capaAbierta() && (document.activeElement === document.body || !document.activeElement)) enfocar(p); }, 30);
    }
  }
}).observe(document.body, { childList: true, subtree: true });

// ── rejillas: un Tab para entrar, flechas para moverse (tabulación itinerante) ──
export function rejilla(cont, selector, { eje = 'ambos', inicial = null } = {}) {
  if (!cont) return;
  const items = () => [...cont.querySelectorAll(selector)].filter(visible);
  const l = items();
  if (!l.length) return;
  const actual = (inicial && l.includes(inicial) ? inicial : null) || l.find((x) => x.tabIndex === 0 && x.dataset.rejilla) || l[0];
  l.forEach((x) => { x.tabIndex = x === actual ? 0 : -1; x.dataset.rejilla = '1'; });
  if (cont.__rejilla) return;
  cont.__rejilla = true;
  cont.addEventListener('focusin', (e) => {
    const t = e.target.closest(selector);
    if (t && cont.contains(t)) items().forEach((x) => { x.tabIndex = x === t ? 0 : -1; });
  });
  cont.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key) || e.altKey || e.ctrlKey || e.metaKey) return;
    const lista = items(), i = lista.indexOf(e.target.closest(selector));
    if (i < 0) return;
    const j = e.key === 'Home' ? 0 : e.key === 'End' ? lista.length - 1 : vecino(lista, i, e.key, eje);
    e.preventDefault();
    if (j === i) { if (!quieto()) gsap.fromTo(lista[i], { x: e.key === 'ArrowLeft' ? -4 : e.key === 'ArrowRight' ? 4 : 0, y: e.key === 'ArrowUp' ? -4 : e.key === 'ArrowDown' ? 4 : 0 }, { x: 0, y: 0, duration: 0.3, ease: 'elastic.out(1, 0.4)', clearProps: 'x,y' }); return; }
    lista[j].focus({ preventScroll: true });
    mostrar(lista[j]);
  });
}
// a la vista sin quedar debajo de la cabecera pegajosa: el hueco que tapa se pasa a scroll-padding del contenedor
export function mostrar(el) {
  let sc = el.parentElement;
  while (sc && sc !== document.body && !desplazable(sc)) sc = sc.parentElement;
  if (sc && sc !== document.body) {
    const { arriba, abajo } = tapas(sc);
    sc.style.scrollPaddingTop = arriba ? `${Math.ceil(arriba) + 10}px` : '';
    sc.style.scrollPaddingBottom = `${Math.ceil(abajo) + 12}px`; // también sin pie: si no, el anillo de foco queda cortado por el borde del marco
  }
  el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: quieto() ? 'auto' : 'smooth' });
}
function vecino(l, i, k, eje) {
  const atras = k === 'ArrowLeft' || k === 'ArrowUp';
  if (eje === 'lista') return Math.max(0, Math.min(l.length - 1, i + (atras ? -1 : 1)));
  const c = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, h: r.height, w: r.width }; };
  const o = c(l[i]);
  let mejor = -1, md = Infinity;
  l.forEach((el, j) => {
    if (j === i) return;
    const p = c(el), dx = p.x - o.x, dy = p.y - o.y;
    let d = Infinity;
    if (k === 'ArrowRight' && dx > 2 && Math.abs(dy) < o.h * 0.6) d = dx;
    else if (k === 'ArrowLeft' && dx < -2 && Math.abs(dy) < o.h * 0.6) d = -dx;
    else if (k === 'ArrowDown' && dy > o.h * 0.4) d = dy + Math.abs(dx) * 2;
    else if (k === 'ArrowUp' && dy < -o.h * 0.4) d = -dy + Math.abs(dx) * 2;
    if (d < md) { md = d; mejor = j; }
  });
  if (mejor >= 0) return mejor;
  if (k === 'ArrowRight' && i < l.length - 1) return i + 1; // fin de fila: salta a la siguiente
  if (k === 'ArrowLeft' && i > 0) return i - 1;
  return i;
}

// ── confirmación con teclado (Intro sí, Esc no) ──
export function confirmar({ titulo, texto = '', si = t('teclado.si'), no = t('teclado.no'), sello = '？' }) {
  return new Promise((resolver) => {
    const c = document.createElement('div');
    c.className = 'tk-capa tk-confirmar'; c.setAttribute('role', 'alertdialog'); c.setAttribute('aria-modal', 'true');
    c.innerHTML = `<div class="tk-ficha"><span class="tk-sello">${sello}</span><h2>${titulo}</h2>${texto ? `<p>${texto}</p>` : ''}
      <div class="tk-acciones"><button class="boton-claro" data-no>${no} ${kbd('Esc')}</button><button class="boton-tinta" data-si data-foco>${si} ${kbd('Intro')}</button></div></div>`;
    document.body.appendChild(c);
    const ficha = c.firstElementChild;
    gsap.fromTo(c, { opacity: 0 }, { opacity: 1, duration: 0.2 });
    if (!quieto()) gsap.fromTo(ficha, { y: 40, scale: 0.9, rotate: -2 }, { y: 0, scale: 1, rotate: 0, duration: 0.55, ease: 'back.out(2)' });
    let hecho = false;
    const fin = (v) => {
      if (hecho) return; hecho = true; soltar();
      gsap.to(c, { opacity: 0, duration: 0.18, onComplete: () => c.remove() });
      resolver(v);
    };
    // Intro es SIEMPRE «sí» (como dice su tecla); Espacio pulsa el botón que tenga el foco, que empieza en «sí»
    const soltar = capa(c, (e) => {
      if (e.key === 'Escape') { fin(false); return true; }
      if (e.key === 'Enter') { fin(true); return true; }
      if (e.key === ' ') { fin(!document.activeElement?.matches?.('[data-no]')); return true; }
      return false;
    }, { foco: c.querySelector('[data-si]') });
    c.querySelector('[data-no]').onclick = () => fin(false);
    c.querySelector('[data-si]').onclick = () => fin(true);
    c.addEventListener('click', (e) => { if (e.target === c) fin(false); });
  });
}

// ── hoja de atajos ──
// [teclas, clave del texto]: las teclas no cambian con el idioma; el texto, en teclado.<grupo>.<fila> de web/i18n
const GRUPOS = [
  { id: 'global', filas: [
    [['I'], 'inicio'], [['R'], 'repaso'], [['L'], 'leccion'], [['G'], 'gramatica'], [['K'], 'kanji'], [['C'], 'camino'],
    [['M'], 'mochi'], [['E'], 'estadisticas'], [['B'], 'bolsas'], [['A'], 'ajustes'], [['?'], 'hoja'],
    [['Esc'], 'volver'], [['Tab', 'Mayús + Tab'], 'tab'], [['Intro', 'Espacio'], 'pulsar'],
    [['↑', '↓'], 'desplazar'], [['AvPág', 'RePág'], 'pagina'], [['Inicio', 'Fin'], 'extremos']] },
  { id: 'inicio', filas: [[['←', '→'], 'cambiar'], [['1', '…', '6'], 'ir'], [['Intro', 'Espacio'], 'abrir']] },
  { id: 'leccion', filas: [[['Espacio', '→', 'Intro'], 'siguiente'], [['←'], 'anterior'], [['R'], 'palabra'], [['E'], 'frase'],
    [['K'], 'kanji'], [['1', '…', '9'], 'cual']] },
  { id: 'elegir', filas: [
    [['1', '2', '3', '4'], 'tipos'], [['S', 'L'], 'habilidades'], [['T'], 'todo'],
    [['M', 'Mayús + M'], 'modo'], [['Intro'], 'empezar']] },
  { id: 'repaso', filas: [
    [['Intro'], 'comprobar'], [['1', '2', '3', '4'], 'opcion'], [['0', 'N'], 'no_se'],
    [['V'], 'vuelta'], [['K'], 'kanji'], [['1', '…', '9'], 'cual'],
    [['F'], 'lamina'], [['R', 'E'], 'escuchar'], [['Retroceso'], 'corregir'],
    [['M', 'Mayús + M'], 'modo'], [['Tab'], 'tab']] },
  { id: 'gramatica', filas: [
    [['←', '→'], 'lecciones'], [['↑', '↓'], 'indice'], [['AvPág', 'RePág'], 'pagina'], [['Intro'], 'ejercicio'],
    [['1', '2', '3', '4'], 'opcion'], [['1', '…', '9'], 'pieza'], [['Retroceso'], 'quitar'], [['E'], 'repetir']] },
  { id: 'camino', filas: [[['Intro'], 'luchar'], [['↑', '↓'], 'medallas'],
    [['L'], 'aprender'], [['E'], 'entrenar'], [['1', '2', '3'], 'gramatica'],
    [['Intro'], 'atacar'], [['Esc'], 'huir']] },
  { id: 'mochi', filas: [[['Intro', 'Espacio'], 'abrir'], [['T'], 'todas'],
    [['Intro'], 'rapido'], [['Esc'], 'salir'], [['←', '→', '↑', '↓'], 'moverte']] },
].map((g) => ({ ...g, tit: t(`teclado.${g.id}.tit`), filas: g.filas.map(([teclas, que]) => [teclas, t(`teclado.${g.id}.${que}`)]) }));
const CONTEXTO = { inicio: 'inicio', estudio: 'repaso', filtro: 'elegir', leccion: 'leccion', repaso: 'repaso', prueba: 'leccion', gramatica: 'gramatica', camino: 'camino', jefe: 'camino', mochi: 'mochi', kanji: 'global' };
let hojaAbierta = null;
export function abrirHoja(vista = 'inicio', sub = '') {
  if (hojaAbierta) return cerrarHoja();
  const aqui = vista === 'estudio' ? CONTEXTO[sub] || 'repaso' : CONTEXTO[vista] || 'global';
  const c = document.createElement('div');
  c.className = 'tk-capa tk-atajos'; c.setAttribute('role', 'dialog'); c.setAttribute('aria-modal', 'true'); c.setAttribute('aria-labelledby', 'tk-tit');
  const orden = [GRUPOS[0], ...GRUPOS.slice(1).sort((a, b) => (b.id === aqui) - (a.id === aqui))];
  c.innerHTML = `<div class="tk-hoja" tabindex="-1" data-foco-capa>
    <header class="tk-cab"><span class="tk-logo">鍵</span><div><div class="tk-ante">${t('teclado.hoja.ante')}</div><h2 id="tk-tit">${t('teclado.hoja.tit')}</h2></div>
      <button class="volver" data-cerrar>${t('comun.cerrar')} ${kbd('Esc')}</button></header>
    <div class="tk-grupos">${orden.map((g) => `<section class="tk-grupo ${g.id === aqui ? 'aqui' : ''}">${g.id === aqui ? `<span class="tk-aqui">${t('teclado.hoja.aqui')}</span>` : ''}<h3>${g.tit}</h3>
      <dl>${g.filas.map(([teclas, que]) => `<div><dt>${teclas.map((x) => (x === '…' ? `<span class="tk-a">${t('teclado.hoja.a')}</span>` : kbd(x))).join('')}</dt><dd>${que}</dd></div>`).join('')}</dl></section>`).join('')}</div>
    <footer class="tk-pie"><button class="volver" data-acerca>${t('comun.acerca')}</button></footer></div>`;
  document.body.appendChild(c);
  const hoja = c.firstElementChild;
  hoja.querySelector('[data-acerca]').onclick = () => { cerrarHoja(); dispatchEvent(new CustomEvent('kd:acerca')); };
  gsap.fromTo(c, { opacity: 0 }, { opacity: 1, duration: 0.2 });
  if (!quieto()) {
    gsap.fromTo(hoja, { y: 60, scale: 0.92, rotate: -1.5 }, { y: 0, scale: 1, rotate: 0, duration: 0.6, ease: 'back.out(1.8)' });
    gsap.fromTo(c.querySelectorAll('.tk-grupo'), { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.05, delay: 0.1, ease: 'back.out(2)' });
    gsap.fromTo(c.querySelectorAll('.tk-grupo.aqui kbd'), { scale: 0.4 }, { scale: 1, duration: 0.5, stagger: 0.03, delay: 0.35, ease: 'back.out(3)' });
  }
  const soltar = capa(c, (e) => {
    if (e.key === 'Escape' || e.key === '?') { cerrarHoja(); return true; }
    if (e.key === 'Enter' && document.activeElement?.matches?.('[data-cerrar]')) { cerrarHoja(); return true; }
    return false; // flechas y AvPág desplazan la hoja
  });
  c.querySelector('[data-cerrar]').onclick = () => cerrarHoja();
  c.addEventListener('click', (e) => { if (e.target === c) cerrarHoja(); });
  hojaAbierta = { c, soltar };
}
export function cerrarHoja() {
  if (!hojaAbierta) return;
  const { c, soltar } = hojaAbierta; hojaAbierta = null; soltar();
  gsap.to(c, { opacity: 0, duration: 0.18, onComplete: () => c.remove() });
}

// ── atajos globales: se registran los últimos, así cada vista decide antes (y marca con preventDefault lo que usa) ──
const DESTINO = { i: 'inicio', r: 'estudio/repaso', l: 'estudio/leccion', g: 'gramatica', k: 'kanji', c: 'camino', m: 'mochi', e: 'estadisticas' };
export function iniciarTeclado({ vistaActual, navegar, abrirAjustes, abrirBolsas }) {
  addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;
    if (capaAbierta()) return;
    const v = vistaActual();
    if (e.key === 'Escape') {
      e.preventDefault();
      if (v.modulo?.volver) v.modulo.volver();
      else if (v.nombre !== 'inicio') navegar('inicio');
      return;
    }
    if (escribiendo(e) || e.repeat) return;
    if (e.key === '?') { e.preventDefault(); abrirHoja(v.nombre, v.contexto || v.sub); return; }
    if (e.key.length !== 1) return;
    const permitido = typeof v.modulo?.atajos === 'function' ? v.modulo.atajos(e) : v.modulo?.atajos !== false;
    if (!permitido) return;
    const k = e.key.toLowerCase();
    if (k === 'a') { e.preventDefault(); abrirAjustes?.(); return; }
    if (k === 'b') { e.preventDefault(); abrirBolsas?.(); return; }
    const d = DESTINO[k];
    if (!d) return;
    e.preventDefault();
    if ((location.hash.slice(1) || 'inicio') === d) return;
    // la vista puede pedir confirmación antes de salir (p. ej. la prueba de una lección a medias), igual que con Esc
    if (v.modulo?.puedeSalir) Promise.resolve(v.modulo.puedeSalir(d)).then((si) => { if (si) navegar(d); });
    else navegar(d);
  });
  // lo último: si ninguna vista ni capa ha usado la tecla, ↑ ↓ AvPág RePág Inicio Fin y Espacio desplazan
  addEventListener('keydown', (e) => { desplazar(e, capaAbierta() || document.querySelector('.vista.activa')); });
}
