// Conjugar en el móvil: la tabla de formas (verbos, adjetivos y la tabla escolar 活用) y rondas a pantalla completa, tecleando
// en kana (el rōmaji se convierte al escribir). Verbos y adjetivos: una palabra por pantalla. Tabla: un verbo con todas sus
// celdas, en dos páginas de cuatro para que quepan con el teclado abierto; al comprobar salen todas con su corrección.
// Datos: /api/conjugar (formas y cómo las llevas) y /api/conjugar/<forma> (la ronda); el motor del escritorio es el mismo.
import { gsap } from 'gsap';
import { t, tn, idioma } from '../i18n.js';
import * as son from '../sonido.js';
import { esc, ruby, textoRico, aKana, normLectura } from '../japones.js';
import { reglaTabla, BASES as NOMBRE_BASE, baseRuby, furiBases } from '../conjugar.js';
import { $, $$, api, vibrar, quieto, encajar, nodo, CERRAR } from './comun.js';
import { paginasTutorial, tutorialVisto, marcarTutorialVisto } from '../conjugar-tutorial.js';
import { pintarEjemplo, parrafos, ponerEstilosEjemplos } from '../conjugar-tutorial-ejemplos.js';

const RANGOS = ['見習い', '剣士', '侍', '師範', '伝説'];
const NOTAS = [[95, '秀', 'sobresaliente'], [85, '優', 'notable'], [70, '良', 'bien'], [0, '可', 'aprobado']];
const TABS = [['verbo', 'verbos'], ['adjetivo', 'adjetivos'], ['tabla', 'tabla']];
let V = null, app = null, lista = null, tab = 'verbo', S = null;
let dominados = false;   // «Los nombres de la tabla» al día (rango ≥ 2): las bases (未然形…) ya no llevan furigana (nombres_dominados del motor)
// furigana de los nombres de la tabla: las bases la pierden al dominarlas; 活用, 動詞, 五段活用… la conservan
const palabra = (x) => ruby(baseRuby(x, dominados));
const significadoBase = (b) => NOMBRE_BASE[b]?.[idioma === 'en' ? 'en' : 'es'] || '';

// ───────── la tabla de formas ─────────
async function indice() {
  try { lista = await api('/api/conjugar'); } catch { lista = null; }
  if (!lista?.formas) { V.innerHTML = `<p class="mv-error">${t('mv.error')}</p>`; return; }
  dominados = !!lista.nombres_dominados;
  V.innerHTML = `<div class="mv-cls mv-cj">
    <header class="mv-cls-cab"><a class="mv-icono-btn" href="#aprender" aria-label="${t('mv.volver')}">‹</a>
      <h1 class="mv-tit">${t('mv.conj.titulo')}</h1><span class="mv-apr-cuenta mv-cj-cuenta"></span>
      <button class="mv-icono-btn mv-cj-ayuda" type="button" aria-label="${t('mv.conj.tut.ayuda')}">?</button></header>
    <nav class="mv-aj-seg mv-cls-pests" role="tablist">${TABS.map(([id, k]) => `<button role="tab" data-t="${id}" aria-checked="${id === tab}"${id === 'tabla' ? ' lang="ja"' : ''}>${ruby(furiBases(t('mv.conj.tab.' + k), dominados))}</button>`).join('')}</nav>
    <p class="mv-cls-cap mv-cj-cap"></p><div class="mv-cj-rejilla"></div><a class="mv-btn mv-cj-repasar" href="#repaso/conjugacion" hidden></a></div>`;
  $$('[data-t]', V).forEach((b) => (b.onclick = () => { if (b.dataset.t === tab) return; vibrar(8); tab = b.dataset.t; pintarIndice(); }));
  $('.mv-cj-ayuda', V).onclick = () => { vibrar(8); abrirTutorial(); };
  pintarIndice();
  // la primera vez, el tutorial se abre solo
  if (!tutorialVisto()) setTimeout(() => { if (V?.isConnected && !S && !tut && location.hash === '#conjugar') abrirTutorial(); }, 350);
}
function pintarIndice() {
  $$('[data-t]', V).forEach((b) => b.setAttribute('aria-checked', b.dataset.t === tab));
  const fs = lista.formas.filter((f) => f.grupo === tab), n = tab === 'adjetivo' ? lista.adjetivos : lista.verbos;
  const hechas = fs.filter((f) => f.en_repaso).length;
  $('.mv-cj-cuenta', V).textContent = `${hechas} / ${fs.length}`;
  $('.mv-cj-cap', V).textContent = tab === 'tabla' ? t('mv.conj.cap.tabla') : n >= 6 ? tn(tab === 'adjetivo' ? 'mv.conj.cap.adj_tuyos' : 'mv.conj.cap.verbos_tuyos', n) : t(tab === 'adjetivo' ? 'mv.conj.cap.adj_comunes' : 'mv.conj.cap.verbos_comunes');
  const rej = $('.mv-cj-rejilla', V);
  rej.style.setProperty('--filas', tab === 'tabla' ? 1 + Math.ceil((fs.length - 1) / 2) : Math.ceil(fs.length / 2));   // en la tabla, «Los nombres» ocupa una fila entera
  rej.innerHTML = fs.map((f) => {
    const estado = !f.en_repaso ? `<em>${t('mv.conj.sin_empezar')}</em>` : `<em class="${f.pendiente ? 'toca' : 'hecha'}"><i style="--rc:var(--r${Math.max(0, f.rango)})">${RANGOS[Math.max(0, f.rango)]}</i>${f.pendiente ? t('mv.conj.toca') : t('mv.conj.en_repaso_corto')}</em>`;
    return `<a class="mv-cj-f${f.id === 't-nombres' ? ' nombres' : ''}${f.en_repaso ? ' en' : ''}${f.pendiente ? ' toca' : ''}${f.jp.includes('・') ? ' doble' : [...f.jp].length > 6 ? ' larga' : ''}" href="#conjugar/${f.id}"><b lang="ja">${f.jp.split('・').map(palabra).join('<br>')}</b><span>${palabra(f.titulo)}</span>${estado}</a>`;
  }).join('');
  // repasar solo la conjugación (las formas que ya están en tu repaso y tocan hoy)
  const rep = $('.mv-cj-repasar', V), toca = lista.formas.filter((f) => f.pendiente).length;
  rep.hidden = !lista.formas.some((f) => f.en_repaso);
  rep.textContent = toca ? tn('mv.conj.repasar_n', toca) : t('mv.conj.repasar');
  encajar(rej, 0.7);
  $$('a', rej).forEach((a) => a.addEventListener('click', () => vibrar(10)));
  if (!quieto()) gsap.fromTo($$('.mv-cj-f', rej), { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, stagger: 0.03, ease: 'back.out(1.6)' });
}

// ───────── el tutorial («¿Cómo funciona?») ─────────
// Las páginas de conjugar-tutorial.js a pantalla completa, sin desplazar: cada una cabe en la pantalla o, si no cabe con el
// texto y el ejemplo juntos, se parte en dos (primero el texto, luego el ejemplo). Se pasa deslizando o con los botones.
let tut = null;
// deslizar a los lados: izquierda → siguiente, derecha → anterior
function deslizar(el, sig, ant) {
  let x0 = null, y0 = 0;
  el.addEventListener('pointerdown', (e) => { if (e.target.closest('button, a, input')) return; x0 = e.clientX; y0 = e.clientY; });
  el.addEventListener('pointerup', (e) => { if (x0 == null) return; const dx = e.clientX - x0, dy = e.clientY - y0; x0 = null; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) (dx < 0 ? sig : ant)(); });
  el.addEventListener('pointercancel', () => { x0 = null; });
}
async function abrirTutorial() {
  if (tut) return;
  tut = { cierra() {} };
  ponerEstilosEjemplos(); marcarTutorialVisto();
  const pags = paginasTutorial(idioma);
  const c = nodo(`<div class="mv-ct" role="dialog" aria-modal="true" aria-label="${esc(t('mv.conj.tut.ayuda'))}">
    <header class="mv-ct-cab"><button class="mv-icono-btn" type="button" data-cerrar aria-label="${t('mv.salir')}">${CERRAR}</button><div class="mv-ct-puntos"></div><span></span></header>
    <div class="mv-ct-pag"><div class="mv-ct-in"></div></div>
    <footer class="mv-ct-pie"><button class="mv-btn-claro mv-ct-atras" type="button" aria-label="${t('mv.conj.tut.ant')}">‹</button><button class="mv-btn mv-ct-sig" type="button"></button></footer></div>`);
  (document.getElementById('movil') || document.body).appendChild(c);
  const pag = $('.mv-ct-pag', c), dentro = $('.mv-ct-in', pag), sig = $('.mv-ct-sig', c), atras = $('.mv-ct-atras', c);
  let n = 0, ej = null, pantallas = [];
  const montar = (P, medir) => {
    const p = pags[P.i];
    pag.className = `mv-ct-pag ${P.parte}`;
    dentro.innerHTML = `<h2 class="mv-ct-tit">${textoRico(p.titulo)}</h2>${P.parte !== 'ej' ? `<div class="mv-ct-texto">${parrafos(p.texto)}</div>` : ''}${P.parte !== 'texto' ? '<div class="mv-ct-ej" lang="ja"></div>' : ''}`;
    const caja = $('.mv-ct-ej', dentro);
    let r = { parar() {} };
    if (caja && p.ejemplo) r = pintarEjemplo(p.ejemplo, caja, { quieto, medir });
    else if (caja) {
      caja.classList.add('sin');
      caja.innerHTML = `<img src="/img/reparto/nyan-feliz-i.webp" alt="" width="130" height="130" draggable="false"><button class="mv-btn-claro mv-ct-probar" type="button">${t('mv.conj.tut.probar')}</button>`;
      $('.mv-ct-probar', caja).onclick = () => { vibrar(10); cerrar(true); location.hash = 'conjugar/t-godan'; };
    }
    encajar(pag, 0.8);
    return r;
  };
  // qué páginas caben enteras con su ejemplo y cuáles hay que partir (según el tamaño de este teléfono)
  try { await document.fonts?.ready; } catch { /* sin fuentes */ }
  if (!c.isConnected) return;
  pags.forEach((p, i) => {
    montar({ i, parte: 'todo' }, true);
    // cabe «de verdad» si sobra aire (no basta con que no desborde) y el texto no ha tenido que encogerse mucho
    if (pag.scrollHeight <= pag.clientHeight + 1 && dentro.offsetHeight + 14 <= pag.clientHeight && parseFloat(pag.style.fontSize || 1) >= 0.95) pantallas.push({ i, parte: 'todo' }); else pantallas.push({ i, parte: 'texto' }, { i, parte: 'ej' });
  });
  $('.mv-ct-puntos', c).innerHTML = pantallas.map(() => '<i></i>').join('');
  $('.mv-ct-puntos', c).setAttribute('aria-label', t('mv.conj.tut.pagina', { n: 1, total: pantallas.length }));
  const pintar = (dir = 0) => {
    ej?.parar();
    ej = montar(pantallas[n], false);
    $$('.mv-ct-puntos i', c).forEach((d, k) => { d.classList.toggle('si', k === n); d.classList.toggle('hecho', k < n); });
    $('.mv-ct-puntos', c).setAttribute('aria-label', t('mv.conj.tut.pagina', { n: n + 1, total: pantallas.length }));
    atras.style.visibility = n ? 'visible' : 'hidden';
    sig.textContent = t(n === pantallas.length - 1 ? 'mv.conj.tut.fin' : 'mv.conj.tut.sig');
    if (!quieto()) gsap.fromTo($$('.mv-ct-tit, .mv-ct-texto', dentro), { x: dir * 34, opacity: 0 }, { x: 0, opacity: 1, duration: 0.32, stagger: 0.05, ease: 'power3.out' });
    if (!quieto() && $('.mv-ct-ej.sin', dentro)) gsap.fromTo($$('.mv-ct-ej > *', dentro), { y: 18, opacity: 0, scale: 0.94 }, { y: 0, opacity: 1, scale: 1, duration: 0.45, stagger: 0.1, delay: 0.1, ease: 'back.out(1.8)' });
  };
  const ir = (d) => {
    const k = n + d;
    if (k < 0) return;
    if (k >= pantallas.length) { vibrar(14); cerrar(); return; }
    n = k; vibrar(8); pintar(d);
  };
  const cerrar = (ya) => {
    if (!tut) return;
    tut = null; ej?.parar();
    if (ya || quieto()) c.remove(); else gsap.to(c, { opacity: 0, duration: 0.18, onComplete: () => c.remove() });
  };
  tut = { cierra: () => cerrar(true) };
  $('[data-cerrar]', c).onclick = () => { vibrar(8); cerrar(); };
  sig.onclick = () => ir(1); atras.onclick = () => ir(-1);
  deslizar(pag, () => ir(1), () => ir(-1));
  if (!quieto()) gsap.fromTo(c, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power3.out' });
  pintar();
}

// ───────── lo común a las rondas ─────────
const valida = (r) => new Set([r.respuesta, ...(r.otras || [])].flatMap((x) => [normLectura(x.kanji), normLectura(x.kana)]).filter(Boolean));
const bienEscrito = (r, texto) => { const v = normLectura(aKana(texto, true)); return !!v && valida(r).has(v); };
function campo(inp) {
  inp.addEventListener('input', () => { if (/[a-z]/i.test(inp.value)) inp.value = aKana(inp.value); });
}
function cabecera() {
  return `<div class="mv-rep-cab"><a class="mv-icono-btn" href="#conjugar" aria-label="${t('mv.salir')}">${CERRAR}</a>
    <div class="mv-barra"><i style="width:${Math.max(4, (100 * S.i) / S.qs.length)}%"></i></div><span class="mv-rep-n"><b>${S.i + 1}</b> / ${S.qs.length}</span></div>`;
}
const atributos = 'lang="ja" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"';
// con el teclado a la vista (pantalla baja) se quita la cabecera y se aprieta lo demás
function alAltura() {
  const r = V && $('.mv-cj-r', V); if (!r) return;
  r.classList.toggle('corto', innerHeight < 500); encajar($('.mv-cj-cuerpo', V), 0.6);
}
const vigilarAltura = () => { addEventListener('resize', alAltura); alAltura(); }; // la misma función: no se acumula
async function cargarRonda(id) {
  V.innerHTML = `<div class="mv-rep mv-cargando"><div class="mv-etq">${t('mv.rep.preparando')}</div></div>`;
  let d = null;
  try { d = await api(`/api/conjugar/${encodeURIComponent(id)}`); } catch { d = null; }
  if (!d?.forma) { V.innerHTML = `<p class="mv-error">${t('mv.conj.no_existe')}</p>`; return; }
  tab = d.forma.grupo; dominados = !!d.forma.nombres_dominados;
  if (!d.preguntas?.length) {
    V.innerHTML = `<div class="mv-pronto"><img src="/img/reparto/nyan-pensando.webp" alt="" width="180" height="180"><h2 class="mv-tit">${t('mv.conj.sin_palabras')}</h2>
      <p>${t('mv.conj.sin_palabras_sub')}</p><a class="mv-btn" href="#conjugar">${t('mv.conj.volver')}</a></div>`;
    return;
  }
  S = { id, forma: d.forma, qs: d.preguntas, i: 0, bien: 0, total: 0, racha: 0, mejor: 0, tabla: d.forma.grupo === 'tabla' && !d.forma.nombres, nombres: !!d.forma.nombres, hecha: false };
  if (S.nombres) pintarNombre(); else if (S.tabla) pintarTabla(); else pintarVerbo();
}

// ───────── verbos y adjetivos: una palabra por pantalla ─────────
function pintarVerbo() {
  const q = S.qs[S.i], F = S.forma; S.hecha = false;
  V.innerHTML = `<div class="mv-rep mv-cj-r">${cabecera()}
    <div class="mv-carta mv-rep-carta mv-cj-carta">
      <span class="mv-rep-tipo mv-cj-tipo" data-tc="conj">${palabra(F.titulo)}</span>
      <div class="mv-cj-cuerpo">
        <div class="mv-cj-verbo" lang="ja">${ruby(q.furigana)}</div>
        <div class="mv-cj-es">${esc(q.es || '')}</div>
        <div class="mv-cj-obj"><i aria-hidden="true">→</i> <b lang="ja">${esc(F.jp)}</b></div>
        <form class="mv-cj-form"><input class="mv-cj-in" ${atributos} enterkeyhint="go" placeholder="${t('gramatica.ej.ph')}" aria-label="${t('gramatica.ej.tu_respuesta')}"></form>
        <div class="mv-rep-sol mv-cj-sol" hidden></div></div></div>
    <div class="mv-rep-pie mv-cj-pie"><button class="mv-btn-claro mv-cj-nose" type="button">${t('mv.rep.no_se')}</button><button class="mv-btn mv-cj-comprobar" type="button">${t('mv.gu.comprobar')}</button></div></div>`;
  const inp = $('.mv-cj-in', V); campo(inp);
  const comprobar = (e) => { e?.preventDefault(); if (S.hecha) return; if (!inp.value.trim()) { inp.focus(); return; } resolverVerbo(q, inp, bienEscrito(q, inp.value)); };
  $('form', V).onsubmit = comprobar; $('.mv-cj-comprobar', V).onclick = comprobar;
  $('.mv-cj-nose', V).onclick = () => { if (!S.hecha) resolverVerbo(q, inp, false); };
  vigilarAltura(); encajar($('.mv-cj-cuerpo', V), 0.6);
  if (!quieto()) {
    gsap.fromTo($('.mv-cj-carta', V), { y: 24, opacity: 0, scale: 0.97 }, { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.6)' });
    gsap.fromTo($('.mv-cj-pie', V), { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, delay: 0.1 });
  }
  setTimeout(() => { if (V.isConnected && !S.hecha) inp.focus({ preventScroll: true }); }, 60);
}
function resolverVerbo(q, inp, ok) {
  S.hecha = true; S.total++;
  if (ok) { S.bien++; S.racha++; S.mejor = Math.max(S.mejor, S.racha); son.acierto(S.racha); vibrar(12); } else { S.racha = 0; son.fallo(); vibrar([18, 50, 18]); }
  inp.readOnly = true; inp.blur(); inp.classList.add(ok ? 'bien' : 'mal');
  const sol = $('.mv-cj-sol', V);
  sol.innerHTML = `<b lang="ja" class="${ok ? 'bien' : 'mal'}">${ruby(q.respuesta.furigana)}</b>${q.tipo ? `<em class="mv-conj-clase${ok ? '' : ' mal'}">${ruby(q.tipo)}</em>` : ''}${q.explica ? `<small lang="ja">${textoRico(q.explica)}</small>` : ''}`;
  sol.hidden = false;
  $('.mv-cj-pie', V).innerHTML = `<button class="mv-btn mv-cj-sig">${S.i < S.qs.length - 1 ? t('mv.siguiente') : t('mv.gu.ver_nota')}</button>`;
  $('.mv-cj-sig', V).onclick = () => { vibrar(8); S.i++; if (S.i < S.qs.length) pintarVerbo(); else fin(); };
  encajar($('.mv-cj-cuerpo', V), 0.6);
  if (!quieto()) gsap.fromTo([sol, $('.mv-cj-sig', V)], { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, stagger: 0.05 });
}

// ───────── «Los nombres de la tabla»: el nombre en kanji, sin furigana, y se escribe cómo se lee ─────────
function pintarNombre() {
  const q = S.qs[S.i], F = S.forma; S.hecha = false;
  V.innerHTML = `<div class="mv-rep mv-cj-r">${cabecera()}
    <div class="mv-carta mv-rep-carta mv-cj-carta">
      <span class="mv-rep-tipo mv-cj-tipo" data-tc="conj">${palabra(F.titulo)}</span>
      <div class="mv-cj-cuerpo">
        <div class="mv-cj-verbo mv-cj-nombre" lang="ja">${esc(q.jp)}</div>
        <div class="mv-cj-es">${t('conj.nombres.pregunta')}</div>
        <form class="mv-cj-form"><input class="mv-cj-in" ${atributos} enterkeyhint="go" placeholder="よみかた…" aria-label="${t('gramatica.ej.tu_respuesta')}"></form>
        <div class="mv-rep-sol mv-cj-sol" hidden></div></div></div>
    <div class="mv-rep-pie mv-cj-pie"><button class="mv-btn-claro mv-cj-nose" type="button">${t('mv.rep.no_se')}</button><button class="mv-btn mv-cj-comprobar" type="button">${t('mv.gu.comprobar')}</button></div></div>`;
  const inp = $('.mv-cj-in', V); campo(inp);
  const comprobar = (e) => { e?.preventDefault(); if (S.hecha) return; if (!inp.value.trim()) { inp.focus(); return; } resolverNombre(q, inp, normLectura(aKana(inp.value, true)) === normLectura(q.lectura)); };
  $('form', V).onsubmit = comprobar; $('.mv-cj-comprobar', V).onclick = comprobar;
  $('.mv-cj-nose', V).onclick = () => { if (!S.hecha) resolverNombre(q, inp, false); };
  vigilarAltura(); encajar($('.mv-cj-cuerpo', V), 0.6);
  if (!quieto()) {
    gsap.fromTo($('.mv-cj-carta', V), { y: 24, opacity: 0, scale: 0.97 }, { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.6)' });
    gsap.fromTo($('.mv-cj-pie', V), { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, delay: 0.1 });
  }
  setTimeout(() => { if (V.isConnected && !S.hecha) inp.focus({ preventScroll: true }); }, 60);
}
function resolverNombre(q, inp, ok) {
  S.hecha = true; S.total++;
  if (ok) { S.bien++; S.racha++; S.mejor = Math.max(S.mejor, S.racha); son.acierto(S.racha); vibrar(12); } else { S.racha = 0; son.fallo(); vibrar([18, 50, 18]); }
  inp.readOnly = true; inp.blur(); inp.classList.add(ok ? 'bien' : 'mal');
  const sol = $('.mv-cj-sol', V);
  sol.innerHTML = `<b lang="ja" class="${ok ? 'bien' : 'mal'}">${esc(q.lectura)}</b><em class="mv-conj-clase${ok ? '' : ' mal'}">${esc(q.es)}</em>
    <small lang="ja">${textoRico(q.kanji)}</small><small class="mv-cj-pegan">${t('conj.nombres.pega')} <b lang="ja">${esc(q.pega)}</b></small>`;
  sol.hidden = false;
  $('.mv-cj-pie', V).innerHTML = `<button class="mv-btn mv-cj-sig">${S.i < S.qs.length - 1 ? t('mv.siguiente') : t('mv.gu.ver_nota')}</button>`;
  $('.mv-cj-sig', V).onclick = () => { vibrar(8); S.i++; if (S.i < S.qs.length) pintarNombre(); else fin(); };
  encajar($('.mv-cj-cuerpo', V), 0.6);
  if (!quieto()) gsap.fromTo([sol, $('.mv-cj-sig', V)], { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, stagger: 0.05 });
}

// ───────── la tabla: un verbo, todas sus celdas ─────────
const paginasDe = (n) => (n > 4 ? [Math.ceil(n / 2), n - Math.ceil(n / 2)] : [n]);
function pintarTabla(pag = 0) {
  const q = S.qs[S.i], cel = q.celdas, pags = paginasDe(cel.length), ini = pags.slice(0, pag).reduce((a, b) => a + b, 0);
  if (pag === 0 && !q.vals) { q.vals = cel.map(() => ''); S.hecha = false; }
  S.pag = pag;
  const filas = cel.slice(ini, ini + pags[pag]);
  V.innerHTML = `<div class="mv-rep mv-cj-r">${cabecera()}
    <div class="mv-carta mv-rep-carta mv-cj-carta">
      <span class="mv-rep-tipo mv-cj-tipo" data-tc="conj" lang="ja">${palabra(S.forma.jp)}${pags.length > 1 ? ` · ${pag + 1}/${pags.length}` : ''}</span>
      <div class="mv-cj-cuerpo">
        <div class="mv-cj-tcab"><div class="mv-cj-verbo peq" lang="ja">${ruby(q.furigana)}</div><div class="mv-cj-es">${esc(q.es || '')}</div></div>
        <form class="mv-cj-celdas">${filas.map((c, k) => `<label class="mv-cj-celda"><span class="mv-cj-base" lang="ja"><span class="mv-cj-bn">${palabra(c.base)}</span>${c.pega ? `<small>〜${esc(c.pega)}</small>` : ''}<small class="sig">${esc(significadoBase(c.base))}</small></span>
          <input class="mv-cj-in" data-k="${ini + k}" ${atributos} enterkeyhint="${ini + k === cel.length - 1 ? 'go' : 'next'}" value="${esc(q.vals[ini + k])}" aria-label="${esc(c.base)}${c.pega ? ' 〜' + esc(c.pega) : ''}"></label>`).join('')}</form></div></div>
    <div class="mv-rep-pie mv-cj-pie">${pag ? `<button class="mv-btn-claro mv-cj-atras" type="button" aria-label="${t('mv.volver')}">‹</button>` : ''}
      <button class="mv-btn mv-cj-comprobar" type="button">${pag < pags.length - 1 ? t('mv.siguiente') : t('mv.gu.comprobar')}</button></div></div>`;
  const ins = $$('.mv-cj-in', V);
  const guardar = () => ins.forEach((i) => { q.vals[+i.dataset.k] = i.value; });
  ins.forEach((i) => campo(i));
  const adelante = () => {
    guardar();
    if (pag < pags.length - 1) { vibrar(8); pintarTabla(pag + 1); } else resolverTabla(q);
  };
  $('form', V).onsubmit = (e) => { e.preventDefault(); const k = ins.indexOf(document.activeElement); if (k >= 0 && k < ins.length - 1) ins[k + 1].focus(); else adelante(); };
  $('.mv-cj-comprobar', V).onclick = adelante;
  const atras = $('.mv-cj-atras', V); if (atras) atras.onclick = () => { guardar(); vibrar(8); pintarTabla(pag - 1); };
  vigilarAltura(); encajar($('.mv-cj-cuerpo', V), 0.6);
  if (!quieto() && pag === 0) gsap.fromTo($('.mv-cj-carta', V), { y: 24, opacity: 0, scale: 0.97 }, { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.6)' });
  setTimeout(() => { if (V.isConnected) (ins.find((i) => !i.value) || ins[0])?.focus({ preventScroll: true }); }, 60);
}
function resolverTabla(q) {
  S.hecha = true;
  const res = q.celdas.map((c, k) => ({ c, v: q.vals[k] || '', ok: bienEscrito(c, q.vals[k] || '') }));
  const bien = res.filter((r) => r.ok).length;
  S.bien += bien; S.total += res.length;
  if (bien >= res.length * 0.7) { S.racha++; S.mejor = Math.max(S.mejor, S.racha); son.acierto(S.racha); vibrar(12); } else { S.racha = 0; son.fallo(); vibrar([18, 50, 18]); }
  document.activeElement?.blur?.();
  V.innerHTML = `<div class="mv-rep mv-cj-r">${cabecera()}
    <div class="mv-carta mv-rep-carta mv-cj-carta">
      <span class="mv-rep-tipo mv-cj-tipo" data-tc="conj" lang="ja">${palabra(S.forma.jp)}</span><span class="mv-rep-rango mv-cj-punt"><i class="${bien === res.length ? 'todo' : ''}">${bien} / ${res.length}</i></span>
      <div class="mv-cj-cuerpo">
        <div class="mv-cj-tcab"><div class="mv-cj-verbo peq" lang="ja">${ruby(q.furigana)}</div><div class="mv-cj-es">${esc(q.es || '')}</div></div>
        <div class="mv-cj-res">${res.map(({ c, v, ok }) => `<div class="mv-cj-fila ${ok ? 'bien' : 'mal'}"><span class="mv-cj-base" lang="ja"><span class="mv-cj-bn">${palabra(c.base)}</span>${c.pega_real ? `<small>〜${esc(c.pega_real)}</small>` : ''}<small class="sig">${esc(significadoBase(c.base))}</small></span>
          <span class="mv-cj-resp" lang="ja"><b>${ruby(c.respuesta.furigana)}</b>${c.base_txt && c.base_txt !== c.respuesta.kanji ? `<small>${esc(c.base_txt)}</small>` : ''}${(c.tambien || []).length ? `<small class="mv-cj-tambien">${t('mv.conj.tambien')} ${c.tambien.map((x) => esc(x.kanji)).join('・')}</small>` : ''}${!ok ? `<s>${esc(v.trim() || '—')}</s>` : ''}</span>
          <i aria-hidden="true">${ok ? '✓' : '✗'}</i></div>`).join('')}</div>
        <p class="mv-cj-regla" lang="ja">${ruby(furiBases(reglaTabla(q.clase, idioma), dominados))}</p></div></div>
    <div class="mv-rep-pie mv-cj-pie"><button class="mv-btn mv-cj-sig">${S.i < S.qs.length - 1 ? t('mv.conj.otro_verbo') : t('mv.gu.ver_nota')}</button></div></div>`;
  $('.mv-cj-sig', V).onclick = () => { vibrar(8); S.i++; if (S.i < S.qs.length) pintarTabla(0); else fin(); };
  vigilarAltura(); encajar($('.mv-cj-cuerpo', V), 0.5);
  if (!quieto()) gsap.fromTo($$('.mv-cj-fila', V), { x: -14, opacity: 0 }, { x: 0, opacity: 1, duration: 0.25, stagger: 0.03 });
}

// ───────── el final ─────────
async function fin() {
  const { bien, total } = S, pct = total ? Math.round((100 * bien) / total) : 0, [, sello, nota] = NOTAS.find(([m]) => pct >= m);
  let r = null;
  try { r = await api('/api/conjugar/' + encodeURIComponent(S.id), { aciertos: bien, total }); } catch { /* sin guardar */ }
  api('/api/sesion/fin', { respuestas: total, aciertos: bien, mejor_racha: S.mejor, lecciones: 0, gramatica: 0 }).catch(() => {});
  app.inicio(true).catch(() => {});
  son.fanfarria?.();
  V.innerHTML = `<div class="mv-rep mv-fin mv-cj-fin">
    <div class="mv-fin-cab"><div class="mv-etq" lang="ja">${palabra(S.forma.jp)}</div><div class="mv-fin-sello" lang="ja">${sello}</div><div class="mv-fin-nota">${t('estudio.nota.' + nota)}</div></div>
    <div class="mv-fin-stats"><div class="mv-carta"><b>${bien}/${total}</b><small>${t('mv.gu.aciertos')} · ${pct}%</small></div><div class="mv-carta oro"><b>+${r?.xp ?? 0}</b><small>XP</small></div></div>
    ${r?.en_repaso ? `<div class="mv-carta mv-fin-premio mv-cj-repaso"><span>${t(r.nueva ? 'mv.conj.entra_repaso' : 'mv.conj.ya_repaso')}</span></div>` : ''}
    <div class="mv-fin-pie"><button class="mv-btn" data-otra>${t('mv.conj.otra_ronda')}</button><a class="mv-btn-claro" href="#conjugar">${t('mv.conj.volver')}</a></div></div>`;
  $('[data-otra]', V).onclick = () => cargarRonda(S.id);
  if (!quieto()) {
    gsap.fromTo($('.mv-fin-sello', V), { scale: 3, rotate: -30, opacity: 0 }, { scale: 1, rotate: -7, opacity: 1, duration: 0.35, ease: 'power4.in', delay: 0.2, onComplete: () => { son.sello?.(); vibrar(25); } });
    gsap.fromTo($$('.mv-fin-stats > *', V), { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.07, delay: 0.5, ease: 'back.out(2)' });
  }
}

export async function entrar(v, resto, a) {
  V = v; app = a; S = null;
  if (resto[0]) await cargarRonda(resto[0]); else await indice();
}
export function salir() { S = null; tut?.cierra(); }
