// Las historias de Nyan: lecturas graduadas (web/lecturas/<id>.json, herramientas/lecturas.py). Cada una se abre cuando ya
// sabes todas sus palabras y su gramática: japonés seguido y con sentido, que se entiende entero. Se lee frase a frase, con
// la voz de cada personaje (web/sonidos/lecturas/<id>/, herramientas/voz_lectura.py), y al final Nyan pregunta de qué iba
// (con respuestas para elegir) y qué te ha parecido (y te contesta a su manera).
// Teclado: Intro sigue · E repite la voz · T traducción · F furigana · 1–4 responde · Esc vuelve.
import { gsap } from 'gsap';
import { $, $$, api, registrar, flotar, chispas } from './app.js';
import * as son from './sonido.js';
import { esc, ruby } from './japones.js';
import { kbd } from './teclado.js';
import { t, idioma } from './i18n.js';

const V = () => $('#v-lectura');
const tr = (o) => (o && typeof o === 'object' ? o[idioma] ?? o.es ?? '' : o || '');
const frase = (s) => String(s || '').split(' ').map(ruby).join(' ');
const quieto = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
// el reparto (web/js/reparto.js): cada uno con su nombre y su color en el bocadillo
const NOMBRE = { nyan: 'ニャン', tama: 'タマ', kage: 'カゲ', pon: 'ポン', fukuro: 'フクロ先生', kotaro: 'コタロウ' };
const guardado = (k, def) => { try { const v = localStorage.getItem(k); return v === null ? def : v === '1'; } catch { return def; } };
const guardar = (k, v) => { try { localStorage.setItem(k, v ? '1' : '0'); } catch { /* nada */ } };

let hist = null, voces = new Set(), audio = null, teclas = null, autoplay = true;
let conFurigana = guardado('nyango.lectura.furigana', true), conTraduccion = guardado('nyango.lectura.traduccion', false);

function oir(voz, { forzar = false } = {}) {
  if (!voz || !voces.has(voz) || (!forzar && !autoplay)) return;
  audio?.pause();
  audio = son.pista(`sonidos/lecturas/${hist.id}/${voz}.mp3`);   // por el AudioContext de toda la app (sonido.js)
  audio.play().catch(() => {});
}
// la portada: una foto real con el reparto en 3D (herramientas/escenas: historias.js y portadas.py)
const portada = (id, clase = '') => `<img class="${clase}" src="img/historias/${encodeURIComponent(id)}.webp" alt="" loading="lazy" decoding="async">`;
const cabecera = (vuelta, texto) => `<header class="cab-papel lt-cab"><button class="volver" data-volver>${vuelta} ${kbd('Esc')}</button>
  <div class="lt-tit">${texto}</div><span></span></header>`;

// ───────────────────────── la biblioteca ─────────────────────────
async function biblioteca() {
  estilos(); teclas = null; audio?.pause();
  const d = await api('/api/lecturas').catch(() => ({ vas: 0, lista: [] }));
  const leidas = d.lista.filter((x) => x.leida).length;
  const faltan = (x) => Math.max(1, x.desde - (d.vas || 0));
  // la que toca: la primera abierta sin leer; si no hay, la próxima que se abrirá
  const destacada = d.lista.find((x) => x.abierta && !x.leida) || d.lista.find((x) => !x.abierta);
  const etiqueta = (x) => (x.leida ? `${t('lectura.leida')} · ${'★'.repeat(x.leida.mejor)}${'☆'.repeat(Math.max(0, x.leida.total - x.leida.mejor))}`
    : x.abierta ? t('lectura.nueva') : t('lectura.faltan', { n: faltan(x) }));
  const barra = (x) => (x.abierta ? '' : `<span class="lt-falta" aria-hidden="true"><i style="width:${Math.min(96, Math.max(4, (100 * (d.vas || 0)) / Math.max(1, x.desde)))}%"></i></span>`);
  V().innerHTML = `${cabecera(t('lectura.inicio'), `<small>${t('lectura.sub', { n: leidas, total: d.lista.length })}</small><b>${t('lectura.tit')}</b>`)}
    <main class="lt-cuerpo">
      ${destacada ? `<section class="lt-destacada${destacada.abierta ? '' : ' cerrada'}">
        <button class="lt-destacada-portada" data-id="${destacada.id}" ${destacada.abierta ? '' : 'aria-disabled="true"'}>${portada(destacada.id, 'lt-mini')}</button>
        <div class="lt-destacada-txt">
          <small>${destacada.abierta ? t('lectura.proxima_nueva') : t('lectura.proxima')}</small>
          <b lang="ja">${ruby(destacada.titulo?.jp || '')}</b><span class="lt-destacada-es">${esc(tr(destacada.titulo))}</span>
          ${destacada.resumen ? `<p>${esc(destacada.resumen)}</p>` : ''}
          ${destacada.abierta ? `<button class="boton-tinta" data-id="${destacada.id}">${t('lectura.empezar')}</button>`
            : `<div class="lt-destacada-falta"><em>${t('lectura.faltan', { n: faltan(destacada) })}</em>${barra(destacada)}<small>${t('lectura.acerca')}</small></div>`}
        </div></section>` : ''}
      ${d.lista.length ? `<div class="lt-estante">${d.lista.map((x) => `<button class="lt-libro${x.abierta ? '' : ' cerrada'}${x.leida ? ' leida' : ''}" data-id="${x.id}" ${x.abierta ? '' : 'aria-disabled="true"'}>
        ${portada(x.id, 'lt-mini')}
        <span class="lt-libro-txt"><b lang="ja">${ruby(x.titulo?.jp || '')}</b><small>${esc(tr(x.titulo))}</small>
        <em>${etiqueta(x)}</em>${barra(x)}</span></button>`).join('')}</div>`
        : `<p class="vacio-papel">${t('lectura.ninguna')}</p>`}
    </main>`;
  $('[data-volver]', V()).onclick = () => { location.hash = 'inicio'; };
  $$('.lt-libro, .lt-destacada [data-id]', V()).forEach((b) => {
    b.onclick = () => {
      if (b.classList.contains('cerrada') || b.getAttribute('aria-disabled') === 'true') { son.fallo(); gsap.fromTo(b, { x: -6 }, { x: 0, duration: 0.4, ease: 'elastic.out(1, 0.3)' }); return; }
      son.toque(); location.hash = `lecturas/${b.dataset.id}`;
    };
  });
  if (!quieto()) gsap.fromTo($$('.lt-destacada, .lt-libro', V()), { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.04, ease: 'back.out(1.6)' });
}

// ───────────────────────── leer una historia ─────────────────────────
async function leer(id) {
  estilos(); teclas = null; audio?.pause();
  const [h, lista] = await Promise.all([fetch(`lecturas/${encodeURIComponent(id)}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    api('/api/lecturas').catch(() => ({ lista: [] }))]);
  const info = lista.lista.find((x) => x.id === id);
  if (!h || !info || !info.abierta) {
    V().innerHTML = `${cabecera(t('lectura.biblioteca'), `<b>${t('lectura.tit')}</b>`)}<p class="vacio-papel">${!h ? t('lectura.no_existe') : t('lectura.cerrada', { n: h.desde })}</p>`;
    $('[data-volver]', V()).onclick = () => { location.hash = 'lecturas'; };
    return;
  }
  hist = h;
  voces = new Set(await fetch(`sonidos/lecturas/${h.id}/indice.json`).then((r) => (r.ok ? r.json() : [])).catch(() => []));
  autoplay = (await api('/api/inicio').catch(() => null))?.ajustes?.autoplay !== false;
  V().innerHTML = `${cabecera(t('lectura.biblioteca'), `<small>${t('lectura.eyebrow', { n: h.desde })}</small><b lang="ja">${ruby(h.titulo.jp)}</b>`)}
    <main class="lt-cuerpo lt-leer${conFurigana ? '' : ' sin-furigana'}${conTraduccion ? ' con-tr' : ''}">
      <section class="lt-portada"><div class="lt-foto">${portada(h.id, 'lt-grande')}<h2 class="lt-ddi" lang="ja">${ruby(h.titulo.jp)}</h2></div>
        <p class="lt-titulo-tr">${esc(tr(h.titulo))}</p><p class="lt-resumen">${esc(tr(h.resumen))}</p>
        <div class="lt-acciones"><button class="boton-tinta" data-primario>${t('lectura.empezar')} ${kbd('Intro')}</button></div></section>
    </main>`;
  $('[data-volver]', V()).onclick = () => { location.hash = 'lecturas'; };
  const boton = $('[data-primario]', V());
  boton.onclick = () => { son.papel(); texto(); };
  teclas = { intro: () => boton.click() };
  if (!quieto()) gsap.fromTo('.lt-portada', { y: 30, opacity: 0, rotate: -1.5 }, { y: 0, opacity: 1, rotate: 0, duration: 0.55, ease: 'back.out(1.7)' });
}

function lineaHTML(f, i) {
  const q = NOMBRE[f.quien] ? f.quien : 'narrador';
  return `<p class="lt-f quien-${q}" data-i="${i}">${q !== 'narrador' ? `<b class="lt-quien" lang="ja">${NOMBRE[q]}</b>` : ''}
    <span class="lt-jp" lang="ja">${frase(f.jp)}</span><span class="lt-tr">${esc(tr(f))}</span></p>`;
}

function texto() {
  const main = $('.lt-leer', V());
  main.innerHTML = `<article class="lt-hoja"></article>
    <div class="lt-mandos">
      <button class="lt-mando" data-tr aria-pressed="${conTraduccion}">${t('lectura.traduccion')} ${kbd('T')}</button>
      <button class="lt-mando" data-fg aria-pressed="${conFurigana}">${t('lectura.furigana')} ${kbd('F')}</button>
      <button class="lt-mando" data-oir>${t('lectura.repetir')} ${kbd('E')}</button>
      <button class="boton-tinta" data-primario>${t('lectura.siguiente')} ${kbd('Intro')}</button></div>`;
  const hoja = $('.lt-hoja', main), boton = $('[data-primario]', main);
  let i = -1;
  const siguiente = () => {
    if (i >= hist.texto.length - 1) { son.papel(); preguntas(); return; }
    i++;
    hoja.insertAdjacentHTML('beforeend', lineaHTML(hist.texto[i], i));
    const el = hoja.lastElementChild;
    if (!quieto()) gsap.fromTo(el, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: 'power2.out' });
    el.scrollIntoView({ block: 'nearest', behavior: quieto() ? 'auto' : 'smooth' });
    el.onclick = () => oir(hist.texto[+el.dataset.i].voz, { forzar: true });
    oir(hist.texto[i].voz);
    if (i === hist.texto.length - 1) boton.innerHTML = `${t('lectura.preguntas')} ${kbd('Intro')}`;
  };
  const alternar = (clase, k, b) => {
    const si = !main.classList.contains(clase === 'sin-furigana' ? 'sin-furigana' : 'con-tr');
    if (clase === 'sin-furigana') { conFurigana = !conFurigana; main.classList.toggle('sin-furigana', !conFurigana); b.setAttribute('aria-pressed', conFurigana); guardar(k, conFurigana); }
    else { conTraduccion = si; main.classList.toggle('con-tr', si); b.setAttribute('aria-pressed', si); guardar(k, si); }
    son.toque();
  };
  const bTr = $('[data-tr]', main), bFg = $('[data-fg]', main);
  bTr.onclick = () => alternar('con-tr', 'nyango.lectura.traduccion', bTr);
  bFg.onclick = () => alternar('sin-furigana', 'nyango.lectura.furigana', bFg);
  $('[data-oir]', main).onclick = () => i >= 0 && oir(hist.texto[i].voz, { forzar: true });
  boton.onclick = siguiente;
  teclas = { intro: siguiente, oir: () => i >= 0 && oir(hist.texto[i].voz, { forzar: true }), tr: () => bTr.click(), fg: () => bFg.click() };
  siguiente();
}

// ───────────────────────── de qué iba (y qué te ha parecido) ─────────────────────────
function preguntas() {
  audio?.pause();
  const lista = hist.preguntas || [], comp = lista.filter((p) => (p.tipo || 'comprension') === 'comprension');
  let k = 0, aciertos = 0, opinion = null;
  const main = $('.lt-leer', V());
  const una = () => {
    const p = lista[k], esOpinion = p.tipo === 'opinion';
    main.innerHTML = `<section class="lt-pregunta">
      <small class="lt-cuenta">${esOpinion ? t('lectura.opinion') : t('lectura.pregunta_n', { n: comp.indexOf(p) + 1, total: comp.length })}</small>
      <h3 lang="ja">${frase(p.jp)}</h3>
      <button class="lt-ver-es">${t('lectura.ver_es')}</button><p class="lt-preg-tr" hidden>${esc(tr(p))}</p>
      <div class="lt-opciones">${p.opciones.map((o, j) => `<button class="lt-op" data-j="${j}"><i>${j + 1}</i><span lang="ja">${frase(o.jp)}</span><small>${esc(tr(o))}</small></button>`).join('')}</div>
      <div class="lt-respuesta"></div>
      <div class="lt-acciones"><button class="boton-tinta" data-primario hidden>${k < lista.length - 1 ? t('lectura.siguiente') : t('lectura.terminar')} ${kbd('Intro')}</button></div></section>`;
    if (!quieto()) gsap.fromTo('.lt-pregunta', { x: 30, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, ease: 'power2.out' });
    const ops = $$('.lt-op', main), boton = $('[data-primario]', main), resp = $('.lt-respuesta', main);
    $('.lt-ver-es', main).onclick = (e) => { e.target.hidden = true; $('.lt-preg-tr', main).hidden = false; };
    let hecho = false;
    const elegir = (j) => {
      if (hecho || !ops[j]) return;
      hecho = true;
      ops.forEach((b) => { b.disabled = true; });
      $('.lt-preg-tr', main).hidden = false; $('.lt-ver-es', main).hidden = true;
      if (esOpinion) {
        opinion = j;
        const o = p.opciones[j];
        ops[j].classList.add('elegida');
        resp.innerHTML = `<div class="lt-nyan"><img src="/img/reparto/nyan-feliz-arriba.webp" alt="" draggable="false">
          <p class="lt-dice"><span lang="ja">${frase(o.nyan?.jp)}</span><small>${esc(tr(o.nyan))}</small></p></div>`;
        son.acierto(1);
      } else if (j === p.bien) {
        aciertos++;
        ops[j].classList.add('bien');
        resp.innerHTML = `<p class="lt-bien">${t('lectura.bien')}</p>`;
        son.acierto(aciertos);
        chispas(ops[j]);
      } else {
        ops[j].classList.add('mal'); ops[p.bien]?.classList.add('bien');
        resp.innerHTML = `<p class="lt-mal">${t('lectura.mal')}</p><p class="lt-porque">${ruby(tr(p.porque))}</p>`;
        son.fallo();
      }
      if (!quieto()) gsap.fromTo(resp.children, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, stagger: 0.08 });
      boton.hidden = false;
    };
    ops.forEach((b) => { b.onclick = () => elegir(+b.dataset.j); });
    const seguir = () => { if (!hecho) return; k++; if (k < lista.length) una(); else fin(aciertos, comp.length, opinion); };
    boton.onclick = seguir;
    teclas = { intro: seguir, numero: (n) => elegir(n - 1) };
  };
  una();
}

async function fin(aciertos, total, opinion) {
  const main = $('.lt-leer', V());
  main.innerHTML = `<section class="lt-fin">
    <div class="lt-nyan grande"><img src="/img/reparto/nyan-${aciertos === total ? 'feliz' : 'normal'}-arriba.webp" alt="" draggable="false"></div>
    <h2>${t('lectura.fin_tit')}</h2><p class="lt-estrellas">${'★'.repeat(aciertos)}${'☆'.repeat(Math.max(0, total - aciertos))}</p>
    <p>${t('lectura.fin_texto', { a: aciertos, t: total })}</p>
    <div class="lt-acciones"><button class="boton-claro" data-otra>↻ ${t('lectura.otra_vez')}</button>
      <button class="boton-claro" data-bib>${t('lectura.biblioteca')}</button>
      <button class="boton-tinta" data-primario>${t('lectura.inicio')} ${kbd('Intro')}</button></div></section>`;
  const boton = $('[data-primario]', main);
  $('[data-otra]', main).onclick = () => leer(hist.id);
  $('[data-bib]', main).onclick = () => { location.hash = 'lecturas'; };
  boton.onclick = () => { location.hash = 'inicio'; };
  teclas = { intro: () => boton.click() };
  if (!quieto()) gsap.fromTo('.lt-fin', { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2)' });
  let r = null;
  try { r = await api(`/api/lectura/${hist.id}`, { aciertos, total, opinion }); } catch { flotar(t('clase.fin.no_guardado'), innerWidth / 2, innerHeight / 2, 'var(--mal)'); }
  if (!r) return;
  son.fanfarria();
  const rc = await import('./recompensas.js').catch(() => null);
  rc?.xpVuela(boton, r.xp, r.xp_total);
  if (rc && r.nivel > r.nivel_antes) await rc.celebrarNivel(r.nivel, { bolsas: r.bolsas_ganadas ?? 1, koban: r.koban_ganados ?? 0 });
}

// ───────────────────────── teclado y estilos ─────────────────────────
addEventListener('keydown', (e) => {
  if (!location.hash.startsWith('#lecturas') || !teclas || e.ctrlKey || e.metaKey || e.altKey) return;
  if (document.querySelector('.capa.abierta, dialog[open]')) return;
  const k = e.key.toLowerCase();
  if (k === 'enter' || (k === ' ' && !e.target.closest?.('button'))) { e.preventDefault(); teclas.intro?.(); }
  else if (k === 'e') teclas.oir?.();
  else if (k === 't') teclas.tr?.();
  else if (k === 'f') teclas.fg?.();
  else if (/^[1-4]$/.test(k)) teclas.numero?.(+k);
});

let estilosPuestos = false;
function estilos() {
  if (estilosPuestos) return;
  estilosPuestos = true;
  const s = document.createElement('style');
  s.textContent = `
#v-lectura { overflow-y: auto; }
.lt-cab .lt-tit { display: grid; justify-items: center; gap: 2px; text-align: center; }
.lt-cab .lt-tit small { font: 700 11px/1.2 var(--f-texto); letter-spacing: .14em; text-transform: uppercase; color: var(--tinta-2); }
.lt-cab .lt-tit b { font: 700 19px var(--f-jp); color: var(--tinta); text-wrap: balance; }
.lt-cuerpo { max-width: 860px; margin: 0 auto; padding: 20px 24px 60px; }
.lt-estante { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px; }
.lt-libro { display: grid; gap: 8px; padding: 12px 12px 14px; border-radius: var(--radio); background: var(--sup); border: var(--borde); box-shadow: var(--sombra); text-align: left; transition: translate .15s var(--suave), border-color .15s, background .15s; }
.lt-libro:hover { translate: 0 -3px; border-color: var(--linea-2); }
.lt-libro:active { translate: 0 1px; }
.lt-libro:focus-visible, .lt-destacada-portada:focus-visible, .lt-op:focus-visible, .lt-mando:focus-visible, .lt-ver-es:focus-visible { outline: 2px solid var(--acento); outline-offset: 2px; }
.lt-libro .lt-mini { width: 100%; height: auto; aspect-ratio: 16 / 9; object-fit: cover; border-radius: var(--radio-peq); display: block; background: var(--sup-3); }
.lt-libro-txt { display: grid; gap: 2px; padding: 0 4px; }
.lt-libro-txt b { font: 700 17px/1.5 var(--f-jp); color: var(--tinta); }
.lt-libro-txt small { font: 600 13px var(--f-texto); color: var(--tinta-2); }
.lt-libro-txt em { justify-self: start; margin-top: 4px; padding: 2px 10px; border-radius: var(--radio-btn); font: 700 11.5px/18px var(--f-texto); letter-spacing: .02em; font-style: normal; color: var(--acento-tinta); background: var(--acento-suave); }
.lt-libro.leida .lt-libro-txt em { background: var(--bien-suave); color: color-mix(in srgb, var(--tinta) 45%, var(--bien)); }
.lt-libro.cerrada { cursor: default; }
.lt-libro.cerrada:hover { translate: none; border-color: var(--linea); }
.lt-libro.cerrada .lt-mini { filter: saturate(.45) opacity(.72); }
.lt-libro.cerrada .lt-libro-txt em { background: var(--sup-3); color: var(--tinta-2); }
.lt-libro.cerrada b, .lt-libro.cerrada small { opacity: .75; }
/* la historia que toca, grande arriba (30-09) */
.lt-destacada { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); gap: 28px; align-items: center; margin: 0 auto 32px; padding: 20px; border-radius: var(--radio); background: var(--sup); border: var(--borde); box-shadow: var(--sombra); }
.lt-destacada-portada { padding: 0; border: 0; background: none; cursor: pointer; border-radius: var(--radio-peq); overflow: hidden; }
.lt-destacada.cerrada .lt-destacada-portada { cursor: default; }
.lt-destacada .lt-mini { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; border-radius: var(--radio-peq); display: block; background: var(--sup-3); }
.lt-destacada.cerrada .lt-mini { filter: saturate(.7); }
.lt-destacada-txt { display: grid; gap: 8px; justify-items: start; }
.lt-destacada-txt > small { font: 700 12px var(--f-texto); letter-spacing: .14em; text-transform: uppercase; color: var(--acento-tinta); }
.lt-destacada-txt b { font: 700 clamp(24px, 3vw, 32px)/1.45 var(--f-jp); color: var(--tinta); text-wrap: balance; }
.lt-destacada-es { font: 700 17px var(--f-texto); color: var(--tinta-2); }
.lt-destacada-txt p { margin: 0; font: 600 15px/1.55 var(--f-texto); color: var(--tinta-2); }
.lt-destacada-falta { display: grid; gap: 6px; width: 100%; max-width: 360px; }
.lt-destacada-falta em { justify-self: start; padding: 3px 12px; border-radius: var(--radio-btn); font: 700 13px/20px var(--f-texto); font-style: normal; color: var(--acento-tinta); background: var(--acento-suave); }
.lt-destacada-falta small { font: 600 13px var(--f-texto); color: var(--tinta-2); }
.lt-falta { display: block; height: 8px; margin-top: 4px; border-radius: 99px; background: var(--sup-3); overflow: hidden; }
.lt-falta i { display: block; height: 100%; border-radius: 99px; background: var(--acento); }
.lt-destacada-falta .lt-falta { height: 10px; }
@media (max-width: 820px) { .lt-destacada { grid-template-columns: 1fr; } }
.lt-portada { display: grid; justify-items: center; gap: 8px; text-align: center; padding: 20px; border-radius: var(--radio); background: var(--sup); border: var(--borde); box-shadow: var(--sombra); }
/* la portada: la foto con el título encima en letras gordas, como la pantalla de carga; arriba, que el
   reparto va en la mitad de abajo (herramientas/escenas/portadas.py) */
.lt-foto { position: relative; width: min(680px, 100%); }
.lt-grande { width: 100%; height: auto; aspect-ratio: 16 / 9; object-fit: cover; border-radius: var(--radio-peq); display: block; background: var(--sup-3); box-shadow: var(--sombra-peq); }
/* arte: el rótulo sobre la foto lleva sus colores en cualquier tema */
.lt-ddi { position: absolute; left: 3.5%; top: 6%; max-width: 93%; margin: 0; text-align: left; font: var(--peso-titulo) clamp(24px, 4.4vw, 44px)/1.45 var(--f-titulo); color: #f36a1d;
  -webkit-text-stroke: .2em #fff8ec; paint-order: stroke fill; transform: rotate(-2.5deg); transform-origin: 0 0;
  filter: drop-shadow(0 .06em 0 #b8470f) drop-shadow(0 .16em .12em rgba(40, 20, 5, .45)); }
.lt-ddi rt { font: var(--peso-titulo) .4em/1 var(--f-titulo); color: #b8470f; -webkit-text-stroke: .32em #fff8ec; }
.lt-titulo-tr { margin: 0; font: 700 15px var(--f-texto); color: var(--tinta-2); }
.lt-resumen { margin: 4px 0 6px; max-width: 520px; font: 500 15px/1.5 var(--f-texto); color: var(--tinta); text-wrap: pretty; }
.lt-acciones { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; margin-top: 12px; }
:is(.lt-portada, .lt-pregunta, .lt-fin) .boton-claro { background: var(--sup-2); }
.lt-hoja { display: grid; gap: 12px; padding: 24px; min-height: 40vh; border-radius: var(--radio); background: var(--sup); border: var(--borde); box-shadow: var(--sombra); }
.lt-f { position: relative; margin: 0; cursor: pointer; display: grid; gap: 2px; }
.lt-f .lt-jp { font: 600 clamp(19px, 2.3vw, 24px)/1.9 var(--f-jp); color: var(--tinta); }
.lt-f .lt-jp rt { font-size: .48em; font-weight: 600; color: var(--tinta-2); }
.lt-f .lt-tr { display: none; font: 600 14px/1.4 var(--f-texto); color: var(--tinta-2); }
.con-tr .lt-f .lt-tr { display: block; }
.sin-furigana rt { visibility: hidden; }
/* cada uno, su color (el del reparto: Tama rosa, Kage pizarra, Pon matcha, Fukuro pardo, Kotarō naranja shiba); el globo es una tinta suave sobre la superficie del tema, el rótulo lleva el color lleno */
.lt-f { --hab: var(--acento); }
.lt-f:not(.quien-narrador) { justify-self: start; max-width: 88%; margin-top: 12px; padding: 8px 16px 10px; border-radius: var(--radio-peq); background: color-mix(in srgb, var(--hab) 14%, var(--sup)); box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--hab) 38%, transparent); }
/* arte: colores del reparto */
.lt-f.quien-tama { --hab: #c4527c; } .lt-f.quien-kage { --hab: #5e5a58; } .lt-f.quien-pon { --hab: #5f7d2d; } .lt-f.quien-fukuro { --hab: #8a6342; } .lt-f.quien-kotaro { --hab: #b05f1a; }
.lt-f:is(.quien-tama, .quien-kage, .quien-pon, .quien-fukuro, .quien-kotaro) { justify-self: end; }
.lt-quien { position: absolute; top: -12px; left: 14px; padding: 0 10px; border-radius: var(--radio-btn); font: 700 12px/20px var(--f-jp); color: #fff; /* arte */ background: var(--hab); }
.lt-mandos { position: sticky; bottom: 0; display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 8px; margin-top: 16px; padding: 12px 0 4px; background: linear-gradient(transparent, var(--fondo) 30%); }
.lt-mando { min-height: 40px; padding: 0 16px; border-radius: var(--radio-btn); border: var(--borde); background: var(--sup); box-shadow: var(--sombra-peq); font: 700 13px var(--f-texto); color: var(--tinta); transition: translate .15s var(--suave), background .15s, box-shadow .15s; }
.lt-mando:hover { translate: 0 -2px; }
.lt-mando[aria-pressed="true"] { background: var(--acento-suave); color: var(--acento-tinta); box-shadow: inset 0 0 0 2px var(--acento); }
.lt-pregunta, .lt-fin { display: grid; gap: 12px; padding: 24px; border-radius: var(--radio); background: var(--sup); border: var(--borde); box-shadow: var(--sombra); }
.lt-cuenta { font: 700 12px var(--f-texto); letter-spacing: .12em; text-transform: uppercase; color: var(--acento-tinta); font-variant-numeric: tabular-nums; }
.lt-pregunta h3 { margin: 0; font: 700 clamp(20px, 2.4vw, 26px)/1.8 var(--f-jp); color: var(--tinta); text-wrap: balance; }
.lt-pregunta h3 rt, .lt-op rt, .lt-dice rt { font-size: .5em; }
.lt-ver-es { justify-self: start; min-height: 32px; padding: 0 2px; border: 0; background: none; font: 700 13px var(--f-texto); color: var(--acento-tinta); text-decoration: underline; text-underline-offset: 3px; border-radius: 4px; }
.lt-preg-tr { margin: -4px 0 0; font: 600 14px var(--f-texto); color: var(--tinta-2); }
.lt-opciones { display: grid; gap: 10px; }
.lt-op { display: grid; grid-template-columns: auto 1fr; column-gap: 12px; align-items: center; padding: 10px 16px; border-radius: var(--radio-peq); border: var(--borde); background: var(--sup-2); box-shadow: var(--sombra-peq); text-align: left; transition: translate .15s var(--suave), background .15s, border-color .15s, box-shadow .15s; }
.lt-op:hover:not([disabled]) { translate: 0 -2px; border-color: var(--linea-2); }
.lt-op:active:not([disabled]) { translate: 0 1px; }
.lt-op i { grid-row: span 2; width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; font: 700 13px var(--f-texto); font-style: normal; color: var(--acento-tinta); background: var(--acento-suave); }
.lt-op span { font: 700 18px/1.7 var(--f-jp); color: var(--tinta); }
.lt-op small { font: 600 12.5px var(--f-texto); color: var(--tinta-2); display: none; }
.lt-op[disabled] small { display: block; }
.lt-op.bien { background: var(--bien-suave); box-shadow: inset 0 0 0 2px var(--bien); border-color: transparent; }
.lt-op.mal { background: var(--mal-suave); box-shadow: inset 0 0 0 2px var(--mal); border-color: transparent; }
.lt-op.elegida { background: var(--aviso-suave); box-shadow: inset 0 0 0 2px var(--aviso); border-color: transparent; }
.lt-bien { margin: 0; font: 700 18px var(--f-texto); color: color-mix(in srgb, var(--tinta) 45%, var(--bien)); }
.lt-mal { margin: 0; font: 700 18px var(--f-texto); color: color-mix(in srgb, var(--tinta) 45%, var(--mal)); }
.lt-porque { margin: 0; font: 600 15px/1.5 var(--f-texto); color: var(--tinta); text-wrap: pretty; }
.lt-nyan { display: flex; align-items: flex-end; gap: 10px; }
/* Nyan en 3D, como en las portadas (nunca un Nyan dibujado y otro en 3D en la misma pantalla) */
.lt-nyan img { width: 116px; height: 116px; flex: none; object-fit: contain; }
.lt-nyan.grande { justify-content: center; } .lt-nyan.grande img { width: 180px; height: 180px; }
.lt-dice { margin: 0 0 18px; padding: 10px 16px; border-radius: var(--radio-peq); background: var(--acento-suave); display: grid; gap: 2px; }
.lt-dice span { font: 700 18px/1.7 var(--f-jp); color: var(--tinta); } .lt-dice small { font: 600 13px var(--f-texto); color: var(--tinta-2); }
.lt-fin { justify-items: center; text-align: center; }
.lt-fin h2 { margin: 0; font: 700 26px var(--f-jp); color: var(--tinta); text-wrap: balance; }
.lt-estrellas { margin: 0; font-size: 30px; letter-spacing: 4px; color: var(--aviso); }
@media (max-width: 640px) { .lt-cuerpo { padding: 12px 12px 40px; } .lt-hoja { padding: 16px; } }
@media (prefers-reduced-motion: reduce) { .lt-libro, .lt-op, .lt-mando { transition: none; } .lt-libro:hover, .lt-op:hover:not([disabled]), .lt-mando:hover { translate: none; } }
`;
  document.head.appendChild(s);
}

registrar('lecturas', {
  seccion: '#v-lectura',
  async entrar([id]) { if (id) await leer(id); else await biblioteca(); },
  actualizar([id]) { if (id) leer(id); else biblioteca(); },
  salir() { audio?.pause(); teclas = null; },
  volver() { location.hash = location.hash.split('/').length > 1 ? 'lecturas' : 'inicio'; },
  atajos: () => false,
  contexto: () => 'lecturas',
});
