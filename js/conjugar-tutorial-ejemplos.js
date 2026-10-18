// Los ejemplos animados del tutorial de «Conjugar» (11-10): lo comparten el escritorio (conjugar-vista.js) y el móvil
// (movil/conjugar.js). Cada tipo de ejemplo de conjugar-tutorial.js (fila · tabla · tipos · lista) se pinta aquí y se anima con gsap.
//   pintarEjemplo(ejemplo, caja, { quieto, medir }) → { parar }
// «quieto»: función que dice si hay que respetar «reducir movimiento» (sin animar). «medir»: solo el HTML, sin animar ni
// poner temporizadores (el móvil lo usa para saber si una página cabe). Todo va en em: quien lo aloja manda con el font-size de la caja.
import { gsap } from 'gsap';
import { t } from './i18n.js';
import { esc, ruby, textoRico, sinFurigana } from './japones.js';

const $ = (s, r) => r.querySelector(s);
const $$ = (s, r) => [...r.querySelectorAll(s)];

/** Los párrafos de un texto de página (**negritas**, furigana y saltos de párrafo). */
export const parrafos = (texto) => String(texto || '').split('\n\n').map((p) => `<p>${textoRico(p)}</p>`).join('');

// ───────── fila: la última letra recorre su fila y las 6 casillas del colegio se encienden en orden ─────────
function fila(ej, caja, { quieto, medir }) {
  const { verbo, fila: kanas, orden } = ej, ultimo = [...sinFurigana(verbo)].pop(), raiz = verbo.slice(0, verbo.lastIndexOf(ultimo));
  caja.innerHTML = `<div class="ct-fila">
    <div class="ct-etq">${t('conj.tut.fila_etq')}</div>
    <div class="ct-fichas" lang="ja">${kanas.map((k) => `<span class="ct-ficha" data-k="${esc(k)}">${esc(k)}</span>`).join('')}</div>
    <div class="ct-verbo" lang="ja" aria-live="off">${ruby(raiz)}<em class="ct-cambia">${esc(ultimo)}</em><span class="ct-resto">…</span></div>
    <div class="ct-celdas" lang="ja">${orden.map((k, i) => `<button type="button" class="ct-celda" data-i="${i}" aria-label="${esc(t('conj.tut.casilla', { n: i + 1, kana: k }))}"><small>${i + 1}</small><b>${esc(k)}</b></button>`).join('')}</div>
    <div class="ct-etq">${t('conj.tut.celdas_etq')}</div>
    <button type="button" class="ct-otra">${t(quieto() ? 'conj.tut.paso' : 'conj.tut.otra')}</button></div>`;
  const celdas = $$('.ct-celda', caja), fichas = $$('.ct-ficha', caja), cambia = $('.ct-cambia', caja), resto = $('.ct-resto', caja);
  let tl = null, actual = -1;
  const paso = (i, anima) => {
    actual = i;
    const k = i < 0 ? ultimo : orden[i];
    celdas.forEach((c, j) => { c.classList.toggle('on', j === i); c.classList.toggle('hecha', j < i); });
    fichas.forEach((f) => f.classList.toggle('on', f.dataset.k === k));
    cambia.textContent = k; resto.style.opacity = i < 0 ? 0 : 1;
    if (!anima) return;
    const ficha = fichas.find((f) => f.classList.contains('on'));
    if (i >= 0) gsap.fromTo(celdas[i], { scale: 1.28 }, { scale: 1, duration: 0.42, ease: 'back.out(3)', overwrite: 'auto' });
    if (ficha) gsap.fromTo(ficha, { scale: 1.2 }, { scale: 1, duration: 0.4, ease: 'back.out(3)', overwrite: 'auto' });
    gsap.fromTo(cambia, { y: '-0.35em', opacity: 0 }, { y: 0, opacity: 1, duration: 0.28, ease: 'power2.out', overwrite: 'auto' });
  };
  const jugar = () => {
    tl?.kill(); paso(-1, false);
    tl = gsap.timeline({ delay: 0.5, repeat: 2, repeatDelay: 1.8 });
    tl.call(paso, [-1, false], 0);
    orden.forEach((_, i) => tl.call(paso, [i, true], 0.7 + i * 1.05));
    tl.to({}, { duration: 0.01 }, 0.7 + orden.length * 1.05 + 0.6);
  };
  celdas.forEach((c) => { c.onclick = () => { tl?.kill(); paso(+c.dataset.i, !quieto()); }; });
  $('.ct-otra', caja).onclick = () => { if (quieto()) paso((actual + 1) % orden.length, false); else jugar(); };
  if (medir) return { parar() {} };
  if (quieto()) { paso(0, false); return { parar() {} }; }
  paso(-1, false);
  gsap.from(fichas, { y: 14, opacity: 0, scale: 0.8, duration: 0.4, stagger: 0.06, ease: 'back.out(2)' });
  gsap.from(celdas, { y: 14, opacity: 0, duration: 0.35, stagger: 0.05, delay: 0.25, ease: 'power2.out' });
  jugar();
  return { parar() { tl?.kill(); gsap.killTweensOf([...celdas, ...fichas, cambia]); } };
}

// ───────── tabla: las 6 bases de un verbo, una tras otra ─────────
function tabla(ej, caja, { quieto, medir }) {
  const sin = sinFurigana(ej.verbo), raiz = [...sin].slice(0, -1).join(''), raizF = ej.verbo.slice(0, ej.verbo.lastIndexOf([...sin].pop()));
  const forma = (f) => { // la letra que cambia, destacada
    if (!f.startsWith(raizF)) return ruby(f);
    const resto = [...f.slice(raizF.length)];
    return `${ruby(raizF)}<b class="ct-cambia">${esc(resto[0] || '')}</b>${esc(resto.slice(1).join(''))}`;
  };
  const kana = (f) => [...sinFurigana(f).slice(raiz.length)][0] || '';
  caja.innerHTML = `<div class="ct-tabla" lang="ja">${ej.filas.map(([base, pega, f]) => `<div class="ct-fila-t"><i class="ct-k">${esc(kana(f))}</i>
    <span class="ct-base"><b>${esc(base)}</b>${pega ? `<small>+ ${esc(pega)}</small>` : ''}</span><span class="ct-forma">${forma(f)}</span></div>`).join('')}</div>
    <button type="button" class="ct-otra">${t('conj.tut.otra')}</button>`;
  const filas = $$('.ct-fila-t', caja);
  let tl = null;
  const jugar = () => {
    tl?.kill(); gsap.set(filas, { opacity: 0, x: -26 }); filas.forEach((f) => f.classList.remove('foco'));
    tl = gsap.timeline({ delay: 0.25 });
    filas.forEach((f, i) => {
      tl.to(f, { opacity: 1, x: 0, duration: 0.4, ease: 'power3.out' }, i * 0.55)
        .fromTo($('.ct-k', f), { scale: 0.4 }, { scale: 1, duration: 0.45, ease: 'back.out(3)' }, i * 0.55)
        .call(() => { filas.forEach((g, j) => g.classList.toggle('foco', j === i)); }, null, i * 0.55);
    });
    tl.call(() => filas.forEach((g) => g.classList.remove('foco')), null, filas.length * 0.55 + 0.5);
  };
  if (medir) return { parar() {} };
  if (quieto()) { $('.ct-otra', caja).hidden = true; return { parar() {} }; }
  $('.ct-otra', caja).onclick = jugar;
  jugar();
  return { parar() { tl?.kill(); gsap.killTweensOf(filas); } };
}

// ───────── tipos: tres tarjetas ─────────
function tipos(ej, caja, { quieto, medir }) {
  caja.innerHTML = `<div class="ct-tipos">${ej.items.map(([nombre, ejemplos, pista], i) => `<div class="ct-tipo k${i}">
    <b class="ct-tipo-n"${/[ぁ-ヿ一-鿿]/.test(nombre) ? ' lang="ja"' : ''}>${esc(nombre)}</b>
    <div class="ct-tipo-ej" lang="ja">${ejemplos.split('・').map((x) => `<span>${ruby(x)}</span>`).join('')}</div>
    <small class="ct-tipo-pista">${esc(pista)}</small></div>`).join('')}</div>`;
  if (medir || quieto()) return { parar() {} };
  const tarjetas = $$('.ct-tipo', caja);
  gsap.from(tarjetas, { y: 22, opacity: 0, scale: 0.94, duration: 0.5, stagger: 0.28, delay: 0.15, ease: 'back.out(1.8)' });
  return { parar() { gsap.killTweensOf(tarjetas); } };
}

// ───────── lista: pares «antes → después» ─────────
function lista(ej, caja, { quieto, medir }) {
  caja.innerHTML = `<div class="ct-lista">${ej.items.map(([izq, der]) => {
    const dobles = izq.includes('→'), marca = der.match(/^(五段|一段)([:：]\s*)(.*)$/);
    return `<div class="ct-par${dobles ? ' doble' : ''}"><span class="ct-izq" lang="ja">${textoRico(izq)}</span>${dobles ? '' : '<i class="ct-flecha" aria-hidden="true">→</i>'}
      <span class="ct-der">${marca ? `<em class="ct-marca" lang="ja">${marca[1]}</em>${textoRico(marca[3])}` : textoRico(der)}</span></div>`;
  }).join('')}</div>`;
  if (medir || quieto()) return { parar() {} };
  const pares = $$('.ct-par', caja);
  gsap.from(pares, { y: 16, x: -10, opacity: 0, duration: 0.42, stagger: 0.3, delay: 0.15, ease: 'power3.out' });
  return { parar() { gsap.killTweensOf(pares); } };
}

const TIPOS = { fila, tabla, tipos, lista };
export function pintarEjemplo(ej, caja, op = {}) {
  const f = TIPOS[ej?.tipo];
  caja.innerHTML = '';
  return f ? f(ej, caja, { quieto: () => false, medir: false, ...op }) : { parar() {} };
}

// ───────── los estilos (los mismos en escritorio y móvil: todo en em) ─────────
const ESTILO = `
.ct-ej { width: 100%; color: var(--tinta); font-size: 16px; }
.ct-ej, .ct-ej * { box-sizing: border-box; }
.ct-ej rt { font-size: .46em; color: var(--tinta-2); font-weight: 500; }
.ct-ej button { font: inherit; }
.ct-etq { font: 700 .68em/1.2 var(--f-texto); letter-spacing: .12em; text-transform: uppercase; color: var(--tinta-2); text-align: center; }
.ct-cambia { font-style: normal; color: var(--acento-tinta); }
.ct-otra { display: block; margin: 1em auto 0; min-height: 3em; padding: 0 1.4em; border: var(--borde); border-radius: var(--radio-btn); background: var(--sup-2); color: var(--tinta-2); cursor: pointer;
  font: 700 .82em var(--f-texto); box-shadow: var(--sombra-peq); transition: translate .15s var(--suave), color .15s, border-color .15s; }
.ct-otra:hover { translate: 0 -2px; color: var(--tinta); border-color: var(--linea-2); } .ct-otra:active { translate: 0 1px; }
.ct-otra:focus-visible, .ct-celda:focus-visible { outline: 2px solid var(--acento); outline-offset: 2px; }
.ct-otra[hidden] { display: none; }
/* fila */
.ct-fila { display: grid; gap: .7em; justify-items: center; }
.ct-fichas { display: flex; gap: .45em; }
.ct-ficha { display: grid; place-items: center; width: 2.5em; height: 2.5em; border-radius: var(--radio-peq); background: var(--sup-2); color: var(--tinta-2); font: 500 1.35em/1 var(--f-jp);
  border: var(--borde); box-shadow: var(--sombra-peq); transition: background .2s var(--suave), color .2s, box-shadow .2s; }
.ct-ficha.on { background: var(--acento-suave); color: var(--acento-tinta); box-shadow: inset 0 0 0 .1em var(--acento); }
.ct-verbo { min-height: 1.6em; padding: .1em .5em 0; font: 500 2.7em/1.6 var(--f-jp); color: var(--tinta); white-space: nowrap; }
.ct-verbo .ct-cambia { display: inline-block; font-weight: 700; } .ct-resto { color: var(--tinta-2); }
.ct-celdas { display: flex; gap: .4em; width: 100%; justify-content: center; }
.ct-celda { flex: 1 1 0; min-width: 0; max-width: 3.5em; display: grid; justify-items: center; gap: .05em; padding: .3em 0 .45em; border: var(--borde); border-radius: var(--radio-peq); background: var(--sup-2); color: var(--tinta); cursor: pointer;
  box-shadow: var(--sombra-peq); transition: background .2s var(--suave), color .2s, box-shadow .2s, translate .2s var(--suave); }
.ct-celda small { font: 700 .62em/1.2 var(--f-texto); color: var(--tinta-2); font-variant-numeric: tabular-nums; }
.ct-celda b { font: 500 1.5em/1.15 var(--f-jp); }
.ct-celda.hecha { background: var(--sup-3); }
.ct-celda.on { background: var(--boton); color: var(--boton-tinta); translate: 0 -.15em; box-shadow: var(--sombra-btn); border-color: transparent; }
.ct-celda.on small { color: inherit; opacity: .8; }
/* tabla */
.ct-tabla { display: grid; gap: .4em; }
.ct-fila-t { display: grid; grid-template-columns: 2.4em minmax(0, 1fr) auto; align-items: center; gap: .8em; padding: .3em .9em .3em .35em; border-radius: var(--radio-peq); background: var(--sup-2);
  border: var(--borde); transition: background .25s var(--suave), box-shadow .25s; }
.ct-fila-t.foco { background: var(--acento-suave); box-shadow: inset 0 0 0 .13em var(--acento); }
.ct-k { display: grid; place-items: center; width: 2.1em; height: 2.1em; border-radius: var(--radio-peq); background: var(--acento-suave); color: var(--acento-tinta); font: 700 1.2em/1 var(--f-jp); font-style: normal; }
.ct-base { display: flex; flex-direction: column; min-width: 0; line-height: 1.2; }
.ct-base b { font: 700 1em var(--f-jp); color: var(--tinta); }
.ct-base small { margin-top: .12em; font: 600 .8em var(--f-jp); color: var(--tinta-2); }
.ct-forma { font: 500 1.35em/1.7 var(--f-jp); color: var(--tinta); white-space: nowrap; }
.ct-forma .ct-cambia { font-weight: 700; }
/* tipos: cada clase de verbo, con su tinta (la tinta suave lleva texto oscuro: se lee igual en los cuatro temas) */
.ct-tipos { display: grid; gap: .65em; }
.ct-tipo { --c: var(--t-conj); display: grid; grid-template-columns: 4.6em minmax(0, 1fr); column-gap: .9em; row-gap: .15em; align-items: center; padding: .65em 1em .7em .9em; border-radius: var(--radio); background: var(--sup-2);
  border: var(--borde); box-shadow: var(--sombra-peq); }
.ct-tipo-n { grid-row: span 2; display: grid; place-items: center; height: 2.4em; border-radius: var(--radio-peq); background: color-mix(in srgb, var(--c) 16%, var(--sup)); color: color-mix(in srgb, var(--tinta) 40%, var(--c)); font: 700 1.2em/1 var(--f-jp); }
.ct-tipo.k1 { --c: var(--acento); } .ct-tipo.k2 { --c: var(--t-gram); } .ct-tipo.k2 .ct-tipo-n { font-size: .9em; }
.ct-tipo-ej { display: flex; flex-wrap: wrap; gap: .1em .8em; font: 500 1.2em/1.75 var(--f-jp); }
.ct-tipo-pista { font: 600 .82em/1.3 var(--f-texto); color: var(--tinta-2); }
/* lista */
.ct-lista { display: grid; gap: .55em; }
.ct-par { display: grid; grid-template-columns: minmax(0, 1.15fr) auto minmax(0, 1fr); align-items: center; column-gap: .8em; padding: .45em 1em; border-radius: var(--radio-peq); background: var(--sup-2);
  border: var(--borde); box-shadow: var(--sombra-peq); }
.ct-izq { font: 500 1.35em/1.7 var(--f-jp); }
.ct-flecha { font: 700 1em var(--f-jp); font-style: normal; color: var(--acento-tinta); }
.ct-der { font: 600 .88em/1.35 var(--f-texto); color: var(--tinta-2); }
.ct-der .ct-marca { display: inline-block; margin-right: .5em; padding: .05em .55em; border-radius: var(--radio-peq); background: var(--acento-suave); color: var(--acento-tinta); font: 700 1em var(--f-jp); font-style: normal; }
.ct-par.doble { grid-template-columns: minmax(0, 1fr); row-gap: 0; }
.ct-par.doble .ct-der { font-family: var(--f-jp); }
@media (max-width: 520px) { .ct-par { grid-template-columns: auto minmax(0, 1fr); row-gap: .1em; } .ct-izq { grid-column: 1 / -1; } .ct-par .ct-der { grid-column: 2; } .ct-par .ct-flecha { grid-column: 1; }
  .ct-par.doble .ct-der { grid-column: 1 / -1; } }
@media (prefers-reduced-motion: reduce) { .ct-ficha, .ct-celda, .ct-fila-t, .ct-otra { transition: none; } .ct-otra:hover { translate: none; } }`;
export function ponerEstilosEjemplos() {
  if (document.getElementById('ct-estilos')) return;
  const s = document.createElement('style'); s.id = 'ct-estilos'; s.textContent = ESTILO; document.head.appendChild(s);
}
