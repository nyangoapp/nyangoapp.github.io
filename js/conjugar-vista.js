// La sección de conjugar (11-10), la pantalla de #conjugar.
//  #conjugar          tres pestañas (Verbos · Adjetivos · Tabla 活用) con sus formas en fichas: cómo las llevas y si te tocan en el repaso
//  #conjugar/<forma>  una ronda: te da la palabra y la forma; escribes la respuesta en kana (el rōmaji se convierte al vuelo) o en kanji.
//                     Con las formas de verbo y adjetivo, una palabra por pantalla; con la tabla, un verbo y todas sus celdas de golpe
// El motor (web/js/conjugar.js y motor/conjugacion.js) pone las preguntas y la regla de cada respuesta; aquí solo se pinta y se comprueba.
// Al terminar, la forma entra en el repaso (POST /api/conjugar/<forma>).
import { gsap } from 'gsap';
import { $, $$, api, registrar, flotar, quieto, estado, RANGO_COLOR } from './app.js';
import * as son from './sonido.js';
import { esc, ruby, textoRico, aKana, normLectura } from './japones.js';
import { kbd, escribiendo, capaAbierta, rejilla, capa } from './teclado.js';
import { t, tn, idioma } from './i18n.js';
import { xpVuela, htmlBarraXP, ponerXP, xpActual } from './recompensas.js';
import { reglaTabla, enunciado, FILAS, BASES as NOMBRE_BASE, baseRuby, furiBases } from './conjugar.js';
import { paginasTutorial, tutorialVisto, marcarTutorialVisto } from './conjugar-tutorial.js';
import { pintarEjemplo, parrafos, ponerEstilosEjemplos } from './conjugar-tutorial-ejemplos.js';

const V = () => $('#v-conjugar');
const PESTANAS = [['verbos', 'verbo', '動詞'], ['adjetivos', 'adjetivo', '形容詞'], ['tabla', 'tabla', '活用']];
const RANGOS = ['見習い', '剣士', '侍', '師範', '伝説'];
const BASES = { '未然形': 'mizen', '連用形': 'renyo', '終止形': 'shushi', '連体形': 'rentai', '仮定形': 'katei', '命令形': 'meirei' };
const FINAL = { 'g-u': 'う', 'g-ku': 'く', 'g-gu': 'ぐ', 'g-su': 'す', 'g-tsu': 'つ', 'g-nu': 'ぬ', 'g-bu': 'ぶ', 'g-mu': 'む', 'g-ru': 'る', iku: 'く', aru: 'る' };
let datos = null, pestana = 'verbos', fase = 'lista', ronda = null, ultima = null, vivo = 0;
let dominados = false;   // 「活用の名前」 al día (rango ≥ 2): los nombres de las bases ya no llevan furigana (nombres_dominados del motor)

const grupoDe = (p) => PESTANAS.find((x) => x[0] === p)[1];
const formaDe = (id) => datos?.formas.find((f) => f.id === id);
const cuando = (ts) => {
  const s = ts - Date.now() / 1000;
  return s < 3600 ? tn('app.cuando.min', Math.max(1, Math.round(s / 60))) : s < 86400 ? tn('app.cuando.horas', Math.round(s / 3600)) : tn('app.cuando.dias', Math.round(s / 86400));
};
// ¿vale lo que has escrito? Kanji o kana, la respuesta o cualquiera de sus variantes (静かじゃない = 静かではない)
function acepta(r, texto) {
  const x = normLectura(texto);
  return !!x && [r.respuesta, ...(r.otras || [])].some((o) => [o.kanji, o.kana].some((y) => normLectura(y) === x));
}
const jp = (furi) => `<span class="jp" lang="ja">${ruby(furi)}</span>`;
// furigana de los nombres de la tabla: las bases (未然形…) la pierden al dominarlas; 活用, 動詞, 五段活用… la conservan
const nombreRuby = (b) => ruby(baseRuby(b, dominados));
const palabra = (x) => ruby(baseRuby(x, dominados));
const significadoBase = (b) => NOMBRE_BASE[b]?.[idioma === 'en' ? 'en' : 'es'] || '';

// ───────────────────────── cabeceras ─────────────────────────
const cabeceraLista = () => `<header class="cab-papel cj-cab"><button class="volver" data-volver>${t('estudio.salir')} ${kbd('Esc')}</button>
  <div class="cj-pestanas" role="tablist">${PESTANAS.map(([id, g, glifo], i) => {
    const fs = datos.formas.filter((f) => f.grupo === g), n = fs.filter((f) => f.en_repaso).length;
    return `<button role="tab" class="cj-pestana ${id === pestana ? 'si' : ''}" data-pestana="${id}" aria-selected="${id === pestana}"><b lang="ja">${palabra(glifo)}</b>
      <span>${t(`conj.tab.${id}`)}</span><small>${t('conj.tab.cuenta', { n, total: fs.length })}</small>${kbd(i + 1)}</button>`;
  }).join('')}</div><div class="contador"><button class="cj-ayuda" type="button" data-ayuda><i aria-hidden="true">?</i>${t('conj.tut.boton')}</button>${htmlBarraXP()}</div></header>`;
const cabeceraRonda = (centro = '', cuenta = '') => `<header class="cab-papel cj-cab"><button class="volver" data-volver>${t('estudio.salir')} ${kbd('Esc')}</button>
  <div class="cab-centro">${centro}</div><div class="contador">${cuenta}${htmlBarraXP()}</div></header>`;
const progreso = (i, n) => `<div class="rc-progreso"><i style="width:${Math.max(3, (100 * i) / n)}%"></i></div>`;

// ───────────────────────── la lista de formas ─────────────────────────
function ficha(f, i) {
  const largo = f.jp.length > 7, partes = f.grupo === 'adjetivo' ? f.jp.split('・') : [f.jp];
  const estado_ = f.pendiente ? 'toca' : f.en_repaso ? 'repaso' : 'nueva';
  const titulo = f.pendiente || !f.en_repaso || !f.vence ? '' : ` title="${esc(t('conj.estado.vence', { cuando: cuando(f.vence) }))}"`;
  return `<button class="cj-ficha e-${estado_}${f.id === 't-nombres' ? ' nombres' : ''}" data-id="${f.id}" style="--i:${i}">
    ${f.rango >= 0 ? `<i class="cj-rango" style="--rc:${RANGO_COLOR[f.rango]}" title="${t(`rangos.${f.rango}`)}">${RANGOS[f.rango]}</i>` : ''}
    <span class="cj-jp ${largo && partes.length === 1 ? 'larga' : ''} ${partes.length > 1 ? 'dos' : ''}" lang="ja">${partes.map((x) => `<em>${palabra(x)}</em>`).join('')}</span>
    <b class="cj-tit">${palabra(f.titulo)}</b><span class="cj-expl">${esc(f.explica)}</span>
    <span class="cj-estado"${titulo}><i></i>${t(`conj.estado.${estado_}`)}</span></button>`;
}
function nota() {
  if (pestana === 'tabla') return '';
  const v = pestana === 'verbos', n = datos[v ? 'verbos' : 'adjetivos'] || 0;
  return n ? tn(`conj.nota.${pestana}`, n) : t(`conj.nota.sin_${pestana}`);
}
function pintarLista(animar = true) {
  fase = 'lista'; ronda = null; vivo++;
  const v = V(), fs = datos.formas.filter((f) => f.grupo === grupoDe(pestana));
  v.innerHTML = cabeceraLista() + `<div class="cj-cuerpo"><p class="cj-intro">${ruby(furiBases(t(`conj.intro.${pestana}`), dominados))}</p>
    <div class="cj-rejilla n${fs.length}" role="list">${fs.map(ficha).join('')}</div>
    <p class="cj-nota">${nota()}</p>${datos.formas.some((f) => f.en_repaso) ? `<a class="boton-tinta cj-repasar" href="#estudio/conjugacion">${(() => { const n = datos.formas.filter((f) => f.pendiente).length; return n ? tn('conj.repasar_n', n) : t('conj.repasar'); })()}</a>` : ''}
    <p class="cj-pista">${kbd('←')}${kbd('→')}${kbd('↑')}${kbd('↓')} ${t('conj.pista.mover')}<span>·</span>${kbd('Intro')} ${t('conj.pista.empezar')}<span>·</span>${kbd(1)}${kbd(2)}${kbd(3)} ${t('conj.pista.pestanas')}</p></div>`;
  const rej = $('.cj-rejilla', v), primera = $(`.cj-ficha[data-id="${ultima}"]`, v) || $('.cj-ficha', v);
  rejilla(rej, '.cj-ficha', { inicial: primera });
  $$('.cj-ficha', v).forEach((b) => (b.onclick = () => { ultima = b.dataset.id; son.toque(); location.hash = `conjugar/${b.dataset.id}`; }));
  $$('.cj-pestana', v).forEach((b) => (b.onclick = () => cambiarPestana(b.dataset.pestana)));
  $('[data-ayuda]', v).onclick = () => abrirTutorial();
  if (animar && !quieto()) {
    gsap.fromTo($$('.cj-ficha', v), { y: 26, opacity: 0, scale: 0.92 }, { y: 0, opacity: 1, scale: 1, duration: 0.45, stagger: 0.04, ease: 'back.out(1.8)' });
    gsap.fromTo($('.cj-intro', v), { y: -8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 });
  }
  setTimeout(() => { if (fase === 'lista' && !escribiendo({ target: document.activeElement })) primera?.focus({ preventScroll: true }); }, 60);
}
function cambiarPestana(id) {
  if (fase !== 'lista' || id === pestana) return;
  son.cambio(PESTANAS.findIndex((x) => x[0] === id));
  pestana = id; ultima = null; pintarLista();
}

// ───────────────────────── el tutorial («¿Cómo funciona?») ─────────────────────────
// Páginas de conjugar-tutorial.js en una hoja de papel: ← → pasan de página, Esc cierra. Los ejemplos los pinta y anima
// conjugar-tutorial-ejemplos.js. La primera vez que entras en la lista se abre solo.
let tut = null;
function abrirTutorial() {
  if (tut || fase !== 'lista') return;
  estilos(); ponerEstilosEjemplos(); marcarTutorialVisto();
  const pags = paginasTutorial(idioma);
  let i = 0, ej = null;
  const c = document.createElement('div');
  c.className = 'modal-capa ct-capa'; c.setAttribute('role', 'dialog'); c.setAttribute('aria-modal', 'true'); c.setAttribute('aria-label', t('conj.tut.aria'));
  c.innerHTML = `<div class="ct-hoja">
    <header class="ct-cab"><span class="ct-n" aria-hidden="true"></span><div class="ct-puntos">${pags.map((p, k) => `<button type="button" class="ct-punto" data-k="${k}" aria-label="${esc(t('conj.tut.pagina', { n: k + 1, total: pags.length }))}"></button>`).join('')}</div>
      <button class="volver" data-cerrar>${t('comun.cerrar')} ${kbd('Esc')}</button></header>
    <div class="ct-pag"></div>
    <footer class="ct-pie"><button class="boton-claro ct-atras" type="button">${t('conj.tut.ant')} ${kbd('←')}</button>
      <span class="ct-pista">${kbd('←')}${kbd('→')} ${t('conj.tut.pista')}</span>
      <button class="boton-tinta ct-sig" type="button"><span></span> ${kbd('→')}</button></footer></div>`;
  document.body.appendChild(c);
  const hoja = $('.ct-hoja', c), pag = $('.ct-pag', c), sig = $('.ct-sig', c), atras = $('.ct-atras', c);
  const pintar = (dir = 0) => {
    ej?.parar(); ej = null;
    const p = pags[i], ultima = i === pags.length - 1;
    $('.ct-n', c).textContent = `${i + 1} / ${pags.length}`;
    $$('.ct-punto', c).forEach((b, k) => { b.classList.toggle('si', k === i); b.classList.toggle('hecho', k < i); if (k === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
    atras.style.visibility = i ? 'visible' : 'hidden';
    $('span', sig).textContent = t(ultima ? 'conj.tut.fin' : 'conj.tut.sig');
    pag.innerHTML = `<h2 class="ct-tit" lang="${idioma}">${textoRico(p.titulo)}</h2>
      <div class="ct-cols${p.ejemplo ? '' : ' sin'}"><div class="ct-texto">${parrafos(p.texto)}</div>
        <div class="ct-ej" lang="ja">${p.ejemplo ? '' : `<img class="ct-nyan" src="/img/reparto/nyan-feliz-i.webp" alt="" draggable="false"><button class="boton-claro ct-probar" type="button">${t('conj.tut.probar')}</button>`}</div></div>`;
    if (p.ejemplo) ej = pintarEjemplo(p.ejemplo, $('.ct-ej', pag), { quieto });
    else $('.ct-probar', pag).onclick = () => { cerrar(); location.hash = 'conjugar/t-godan'; };
    if (!quieto()) {
      gsap.fromTo([$('.ct-tit', pag), $('.ct-texto', pag)], { x: dir * 36, opacity: 0 }, { x: 0, opacity: 1, duration: 0.38, stagger: 0.06, ease: 'power3.out' });
      if (!p.ejemplo) gsap.fromTo($$('.ct-ej > *', pag), { y: 20, opacity: 0, scale: 0.92 }, { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.1, delay: 0.15, ease: 'back.out(1.8)' });
    }
  };
  const ir = (d) => {
    const k = i + d;
    if (k < 0) return;
    if (k >= pags.length) { cerrar(); return; }
    i = k; son.cambio?.(i); pintar(d);
  };
  const cerrar = (ya) => {
    if (!tut) return;
    tut = null; ej?.parar(); soltar();
    if (ya || quieto()) c.remove(); else gsap.to(c, { opacity: 0, duration: 0.18, onComplete: () => c.remove() });
  };
  const soltar = capa(c, (e) => {
    if (e.key === 'Escape') { cerrar(); return true; }
    if (e.key === 'ArrowRight') { ir(1); return true; }
    if (e.key === 'ArrowLeft') { ir(-1); return true; }
    return false;
  }, { foco: sig });
  tut = { cierra: () => cerrar(true) };
  $('[data-cerrar]', c).onclick = () => cerrar();
  c.addEventListener('click', (e) => { if (e.target === c) cerrar(); });
  sig.onclick = () => ir(1); atras.onclick = () => ir(-1);
  $$('.ct-punto', c).forEach((b) => (b.onclick = () => { const k = +b.dataset.k; if (k !== i) { const d = k > i ? 1 : -1; i = k; pintar(d); } }));
  if (!quieto()) {
    gsap.fromTo(c, { opacity: 0 }, { opacity: 1, duration: 0.2 });
    gsap.fromTo(hoja, { y: 50, scale: 0.94, rotate: -1 }, { y: 0, scale: 1, rotate: 0, duration: 0.5, ease: 'back.out(1.7)' });
  }
  pintar();
}

// ───────────────────────── una ronda ─────────────────────────
async function empezar(id) {
  const v = V(), n = ++vivo;
  fase = 'carga';
  let r;
  try { r = await api(`/api/conjugar/${id}`); } catch { r = null; }
  if (n !== vivo) return; // te fuiste mientras cargaba
  const f = r?.forma;
  if (!f || !r.preguntas?.length) {
    fase = 'vacio';
    v.innerHTML = cabeceraRonda() + `<div class="cj-juego"><div class="carta-rep cj-carta cj-vacia"><div class="cj-vacia-jp" lang="ja">活</div><h2>${r ? t('conj.vacio.tit') : t('conj.error')}</h2>
      ${r ? `<p>${t('conj.vacio.txt')}</p>` : ''}<button class="boton-tinta" id="cj-volver">${t('conj.fin.volver')} ${kbd('Esc')}</button></div></div>`;
    $('#cj-volver', v).onclick = () => { location.hash = 'conjugar'; };
    return;
  }
  dominados = !!f.nombres_dominados;
  ronda = { forma: f, id, qs: r.preguntas, i: 0, bien: 0, total: 0, racha: 0, malos: [], hecha: false, tabla: f.grupo === 'tabla' && !f.nombres, nombres: !!f.nombres };
  pintarPregunta();
}
const caraNyan = (cara) => {
  const img = $('.cj-nyan', V()); if (!img) return;
  img.src = `/img/reparto/nyan-${cara}-i.webp`;
  if (!quieto()) gsap.fromTo(img, { y: 0, scale: 1 }, { y: -14, scale: 1.08, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out' });
};
const entrada = (inp) => { // el rōmaji se vuelve kana según escribes; Intro comprueba (o pasa a la siguiente)
  inp.addEventListener('input', () => { const val = aKana(inp.value); if (val !== inp.value) { inp.value = val; inp.setSelectionRange(val.length, val.length); } });
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); e.stopPropagation(); pulsarIntro(); }
    else if (ronda?.tabla && (e.key === 'ArrowDown' || e.key === 'ArrowUp') && !e.isComposing) {
      e.preventDefault(); const l = $$('.cj-in', V()), j = l.indexOf(inp) + (e.key === 'ArrowDown' ? 1 : -1); l[j]?.focus();
    }
  });
};
function pintarPregunta() {
  ronda.hecha = false; fase = 'ronda';
  if (ronda.nombres) return pintarNombre();
  if (ronda.tabla) return pintarTablaRonda();
  const v = V(), q = ronda.qs[ronda.i], f = ronda.forma, adj = f.grupo === 'adjetivo';
  const cinta = esc(enunciado(f.id, null, idioma)), quitar = f.jp.replace(/〜/g, '');
  v.innerHTML = cabeceraRonda(progreso(ronda.i, ronda.qs.length), `<span class="cj-cuenta"><b>${ronda.i + 1}</b> / ${ronda.qs.length}</span>`) + `<div class="cj-juego">
    <div class="carta-rep cj-carta"><img class="cj-nyan" src="/img/reparto/nyan-normal-i.webp" alt="" draggable="false">
      <span class="tipo">${t(adj ? 'conj.tipo.adjetivo' : 'conj.tipo.verbo')}</span>
      <div class="cj-palabra">${jp(q.furigana)}</div><div class="cj-es">${esc(q.es)}</div></div>
    <div class="cinta lec cj-cinta">${cinta}${!adj && !f.titulo.includes(quitar) ? `<small>${esc(f.titulo)}</small>` : ''}</div>
    <div class="respuesta cj-resp"><input id="cj-in" class="cj-in" spellcheck="false" autocapitalize="off" autocomplete="off" lang="ja" aria-label="${t('conj.tu_respuesta')}" placeholder="こたえ…">
      <button class="enviar" type="button" aria-label="${t('conj.comprobar')}">↵</button></div>
    <div class="cj-sol" aria-live="polite"></div></div>`;
  const inp = $('#cj-in', v); entrada(inp);
  $('.enviar', v).onclick = () => pulsarIntro();
  $('.cj-nyan', v).hidden = !(innerWidth > 900);
  if (!quieto()) {
    gsap.fromTo($('.cj-carta', v), { y: 24, opacity: 0, rotate: -1.5 }, { y: 0, opacity: 1, rotate: 0, duration: 0.5, ease: 'back.out(1.8)' });
    gsap.fromTo($('.cj-cinta', v), { scaleX: 0.2, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 0.45, delay: 0.1, ease: 'power3.out' });
    gsap.fromTo($('.cj-resp', v), { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, delay: 0.18, ease: 'power3.out' });
  }
  setTimeout(() => inp.focus({ preventScroll: true }), 40);
  caber();
}
// 11-10: la ronda entera cabe en la ventana: si sobra algo, se compacta (dos escalones)
function caber() {
  const v = V(), j = $('.cj-juego', v);
  if (!j) return;
  j.classList.remove('apretada', 'muy-apretada');
  const sobra = () => v.scrollHeight > v.clientHeight + 1 || document.documentElement.scrollHeight > innerHeight + 1;
  for (const c of ['apretada', 'muy-apretada']) { if (!sobra()) break; j.classList.add(c); }
}
addEventListener('resize', () => { if (V()?.classList.contains('activa')) caber(); });
function pulsarIntro() {
  if (!ronda || fase !== 'ronda' && fase !== 'ronda-hecha') return;
  if (ronda.hecha) { if (performance.now() - (ronda.t || 0) > 160) siguiente(); return; }
  if (ronda.nombres) comprobarNombre(); else if (ronda.tabla) comprobarTabla(); else comprobar();
}
function comprobar() {
  const v = V(), q = ronda.qs[ronda.i], inp = $('#cj-in', v), texto = aKana(inp.value.trim(), true);
  inp.value = texto;
  const ok = acepta(q, texto);
  ronda.hecha = true; ronda.t = performance.now(); ronda.total++; fase = 'ronda-hecha';
  inp.readOnly = true; inp.classList.add(ok ? 'bien' : 'mal');
  if (ok) { ronda.bien++; ronda.racha++; son.acierto(ronda.racha); caraNyan(ronda.racha >= 3 ? 'feliz' : 'normal'); }
  else { ronda.racha = 0; son.fallo(); caraNyan('pensando'); ronda.malos.push({ pregunta: q.furigana, respuesta: q.respuesta.furigana }); }
  const otras = (q.otras || []).filter((o) => o.kana !== q.respuesta.kana), ultimaP = ronda.i === ronda.qs.length - 1;
  $('.cj-sol', v).innerHTML = `<div class="cj-veredicto ${ok ? 'bien' : 'mal'}">
      <div class="cj-correcta"><span class="cj-marca">${ok ? '✓' : '✗'}</span>${ok ? '' : `<small>${texto ? t('conj.res.mal') : t('conj.res.vacia')}</small>`}<b>${jp(q.respuesta.furigana)}</b></div>
      ${!ok && texto ? `<div class="cj-tu">${t('conj.res.tu', { x: `<span class="jp" lang="ja">${esc(texto)}</span>` })}</div>` : ''}
      ${otras.length ? `<div class="cj-tu">${t('conj.res.tambien', { otras: otras.map((o) => `<span class="jp" lang="ja">${ruby(o.furigana)}</span>`).join(' · ') })}</div>` : ''}
      ${q.tipo ? `<div class="cj-clase${ok ? '' : ' mal'}">${ruby(q.tipo)}</div>` : ''}<p class="cj-explica">${textoRico(q.explica)}</p>
      <button class="boton-tinta cj-sig">${ultimaP ? t('conj.terminar') : t('conj.siguiente')} ${kbd('Intro')}</button></div>`;
  $('.cj-sig', v).onclick = () => siguiente();
  caber();
  setTimeout(() => $('.cj-sig', v)?.focus({ preventScroll: true }), 30);
  if (ok) { const r = inp.getBoundingClientRect(); flotar(t('conj.bien'), r.left + r.width / 2, r.top - 4, 'var(--bien)'); }
  if (!quieto()) {
    gsap.fromTo($('.cj-veredicto', v), { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: 'power3.out' });
    if (!ok) gsap.fromTo($('.cj-carta', v), { x: -10 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
  }
}
function siguiente() {
  if (!ronda) return;
  ronda.i++; fase = 'ronda';
  if (ronda.i >= ronda.qs.length) return finRonda();
  pintarPregunta();
}

// ───────────────────────── «Los nombres de la tabla» (t-nombres) ─────────────────────────
// Una pregunta por nombre de base: el nombre en kanji, sin furigana, y se escribe cómo se lee. Al comprobar: lectura, significado,
// de dónde sale cada kanji y qué se le pega.
function pintarNombre() {
  const v = V(), q = ronda.qs[ronda.i], f = ronda.forma;
  v.innerHTML = cabeceraRonda(progreso(ronda.i, ronda.qs.length), `<span class="cj-cuenta"><b>${ronda.i + 1}</b> / ${ronda.qs.length}</span>`) + `<div class="cj-juego">
    <div class="carta-rep cj-carta"><img class="cj-nyan" src="/img/reparto/nyan-normal-i.webp" alt="" draggable="false">
      <span class="tipo">${palabra(f.titulo)}</span>
      <div class="cj-palabra cj-nombre" lang="ja">${esc(q.jp)}</div><div class="cj-es">${t('conj.nombres.pregunta')}</div></div>
    <div class="cinta lec cj-cinta">${t('conj.nombres.cinta')}<small>${t('conj.nombres.cinta_peq')}</small></div>
    <div class="respuesta cj-resp"><input id="cj-in" class="cj-in" spellcheck="false" autocapitalize="off" autocomplete="off" lang="ja" aria-label="${t('conj.tu_respuesta')}" placeholder="よみかた…">
      <button class="enviar" type="button" aria-label="${t('conj.comprobar')}">↵</button></div>
    <div class="cj-sol" aria-live="polite"></div></div>`;
  const inp = $('#cj-in', v); entrada(inp);
  $('.enviar', v).onclick = () => pulsarIntro();
  $('.cj-nyan', v).hidden = !(innerWidth > 900);
  if (!quieto()) {
    gsap.fromTo($('.cj-carta', v), { y: 24, opacity: 0, rotate: -1.5 }, { y: 0, opacity: 1, rotate: 0, duration: 0.5, ease: 'back.out(1.8)' });
    gsap.fromTo($('.cj-cinta', v), { scaleX: 0.2, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 0.45, delay: 0.1, ease: 'power3.out' });
    gsap.fromTo($('.cj-resp', v), { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, delay: 0.18, ease: 'power3.out' });
  }
  setTimeout(() => inp.focus({ preventScroll: true }), 40);
  caber();
}
function comprobarNombre() {
  const v = V(), q = ronda.qs[ronda.i], inp = $('#cj-in', v), texto = aKana(inp.value.trim(), true);
  inp.value = texto;
  const ok = !!texto && normLectura(texto) === normLectura(q.lectura);   // solo vale la lectura: escribir el propio kanji no cuenta
  ronda.hecha = true; ronda.t = performance.now(); ronda.total++; fase = 'ronda-hecha';
  inp.readOnly = true; inp.classList.add(ok ? 'bien' : 'mal');
  if (ok) { ronda.bien++; ronda.racha++; son.acierto(ronda.racha); caraNyan(ronda.racha >= 3 ? 'feliz' : 'normal'); }
  else { ronda.racha = 0; son.fallo(); caraNyan('pensando'); ronda.malos.push({ pregunta: q.jp, respuesta: q.lectura }); }
  const ultimaP = ronda.i === ronda.qs.length - 1;
  $('.cj-sol', v).innerHTML = `<div class="cj-veredicto ${ok ? 'bien' : 'mal'}">
      <div class="cj-correcta"><span class="cj-marca">${ok ? '✓' : '✗'}</span>${ok ? '' : `<small>${texto ? t('conj.res.mal') : t('conj.res.vacia')}</small>`}<b lang="ja">${esc(q.lectura)}</b></div>
      ${!ok && texto ? `<div class="cj-tu">${t('conj.res.tu', { x: `<span class="jp" lang="ja">${esc(texto)}</span>` })}</div>` : ''}
      <div class="cj-clase${ok ? '' : ' mal'}">${esc(q.es)}</div>
      <p class="cj-explica" lang="ja">${textoRico(q.kanji)}</p>
      <div class="cj-pega-nombre">${t('conj.nombres.pega')} <b lang="ja">${esc(q.pega)}</b></div>
      <button class="boton-tinta cj-sig">${ultimaP ? t('conj.terminar') : t('conj.siguiente')} ${kbd('Intro')}</button></div>`;
  $('.cj-sig', v).onclick = () => siguiente();
  caber();
  setTimeout(() => $('.cj-sig', v)?.focus({ preventScroll: true }), 30);
  if (ok) { const r = inp.getBoundingClientRect(); flotar(t('conj.bien'), r.left + r.width / 2, r.top - 4, 'var(--bien)'); }
  if (!quieto()) {
    gsap.fromTo($('.cj-veredicto', v), { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: 'power3.out' });
    if (!ok) gsap.fromTo($('.cj-carta', v), { x: -10 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
  }
}

// ───────────────────────── la ronda de tabla ─────────────────────────
// la tabla escolar de cada clase: [nombre de la base, vocal de la fila (solo 五段), kana, lo que se le pega]
function refDe(clase) {
  const N = ['未然形', '連用形', '終止形', '連体形', '仮定形', '命令形'], P = ['ない・う', 'ます・て', '', 'とき', 'ば', ''];
  if (FINAL[clase] && clase !== 'aru') {
    const f = FILAS[FINAL[clase]];
    return { n: N, fila: ['あ・お', 'い', 'う', 'う', 'え', 'え'], k: [`${f.a}・${f.o}`, f.i, f.u, f.u, f.e, f.e], p: P };
  }
  if (clase === 'ichi') return { n: N, k: ['―', '―', 'る', 'る', 'れ', 'ろ'], p: ['ない・よう', 'ます・て', '', 'とき', 'ば', ''] };
  if (clase === 'kureru') return { n: N, k: ['―', '―', 'る', 'る', 'れ', 'れ'], p: ['ない・よう', 'ます・て', '', 'とき', 'ば', ''] };
  if (clase === 'suru' || clase === 'suru-n') return { n: N, k: ['し', 'し', 'する', 'する', 'すれ', 'しろ'], p: ['ない・よう', 'ます・て', '', 'とき', 'ば', ''] };
  if (clase === 'kuru') return { n: N, k: ['こ', 'き', 'くる', 'くる', 'くれ', 'こい'], p: ['ない・よう', 'ます・て', '', 'とき', 'ば', ''] };
  const N4 = ['連用形', '終止形', '連体形', '仮定形'];
  if (clase === 'adj-ii') return { n: N4, k: ['よく・よかっ', 'いい', 'いい', 'よけれ'], p: ['ない・て・た', '', 'とき', 'ば'] };
  if (clase === 'adj-i') return { n: N4, k: ['く・かっ', 'い', 'い', 'けれ'], p: ['ない・て・た', '', 'とき', 'ば'] };
  return { n: N4, k: ['じゃ・で・だっ', 'だ', 'な', 'なら'], p: ['ない・て・た', '', 'とき', ''] }; // な
}
function htmlRef(clase, activa = null) {
  const r = refDe(clase);
  return `<table class="cj-ref" lang="ja"><thead><tr>${r.n.map((x, i) => `<th data-b="${x}" class="${activa === r.n[i] ? 'a' : ''}">${nombreRuby(x)}</th>`).join('')}</tr></thead><tbody>
    ${r.fila ? `<tr class="f">${r.fila.map((x) => `<td>${x}<small>段</small></td>`).join('')}</tr>` : ''}
    <tr class="k">${r.k.map((x) => `<td><b>${x}</b></td>`).join('')}</tr>
    <tr class="p">${r.p.map((x) => `<td>${x ? `<span>${x.split('・').map((y) => '+' + y).join('<br>')}</span>` : ''}</td>`).join('')}</tr></tbody></table>`;
}
function ladoAntes() {
  const bases = [...new Set(ronda.forma.celdas.map((c) => c.base))];
  return `<h3>${t('conj.tabla.bases')}</h3><ul class="cj-leyenda">${bases.map((b) => `<li><b lang="ja">${nombreRuby(b)}</b><span>${t(`conj.base.${BASES[b]}`)}</span></li>`).join('')}</ul>
    <p class="cj-aviso">${t('conj.tabla.escribe')}</p>`;
}
function ladoDespues(q, celda = null) {
  return `<h3>${t('conj.tabla.ref')}</h3>${htmlRef(q.clase, celda?.base)}<p class="cj-regla">${ruby(furiBases(reglaTabla(q.clase, idioma), dominados))}</p>
    <div class="cj-porque" aria-live="polite">${celda ? textoRico(celda.explica) : `<em>${t('conj.tabla.fila_pista')}</em>`}</div>`;
}
function pintarTablaRonda() {
  const v = V(), q = ronda.qs[ronda.i], f = ronda.forma, adj = ['adj-i', 'adj-ii', 'adj-na'].includes(q.clase);
  v.innerHTML = cabeceraRonda(progreso(ronda.i, ronda.qs.length), `<span class="cj-cuenta"><b>${ronda.i + 1}</b> / ${ronda.qs.length}</span>`) + `<div class="cj-juego tabla">
    <div class="cj-mesa"><div class="carta-rep cj-carta cj-tabla"><span class="tipo">${palabra(f.titulo)}</span>
      <div class="cj-cab-tabla"><div class="cj-palabra">${jp(q.furigana)}</div><div class="cj-es">${esc(q.es)}<small>${t(adj ? 'conj.tabla.nombre_adj' : 'conj.tabla.nombre', { i: ronda.i + 1, n: ronda.qs.length })}</small></div></div>
      <div class="cj-filas">${q.celdas.map((c, k) => `<div class="cj-fila" data-k="${k}"><span class="cj-base" lang="ja"><span class="cj-bn">${nombreRuby(c.base)}</span><small>${esc(significadoBase(c.base))}</small></span><span class="cj-pega" lang="ja">${c.pega ? '〜' + esc(c.pega) : ''}</span>
        <input class="cj-in" data-k="${k}" spellcheck="false" autocapitalize="off" autocomplete="off" lang="ja" aria-label="${c.base}${c.pega ? ' 〜' + c.pega : ''}"><span class="cj-res" lang="ja"></span></div>`).join('')}</div>
      <div class="cj-tabla-pie"><button class="boton-tinta cj-comp">${t('conj.comprobar')} ${kbd('Intro')}</button></div></div>
    <aside class="cj-lado"><div class="cj-lado-cuerpo">${ladoAntes()}</div><img class="cj-nyan" src="/img/reparto/nyan-normal-i.webp" alt="" draggable="false"></aside></div></div>`;
  $$('.cj-in', v).forEach(entrada);
  $('.cj-comp', v).onclick = () => pulsarIntro();
  if (!quieto()) {
    gsap.fromTo($('.cj-tabla', v), { y: 24, opacity: 0, rotate: -1 }, { y: 0, opacity: 1, rotate: 0, duration: 0.5, ease: 'back.out(1.8)' });
    gsap.fromTo($$('.cj-fila', v), { x: -14, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3, stagger: 0.035, delay: 0.12, ease: 'power3.out' });
    gsap.fromTo($('.cj-lado', v), { x: 24, opacity: 0 }, { x: 0, opacity: 1, duration: 0.45, delay: 0.15, ease: 'power3.out' });
  }
  setTimeout(() => $('.cj-in', v)?.focus({ preventScroll: true }), 40);
  caber();
}
function comprobarTabla() {
  const v = V(), q = ronda.qs[ronda.i];
  let bien = 0;
  q.celdas.forEach((c, k) => {
    const inp = $(`.cj-in[data-k="${k}"]`, v), fila = inp.closest('.cj-fila'), texto = aKana(inp.value.trim(), true);
    inp.value = texto; inp.readOnly = true;
    const ok = acepta(c, texto);
    if (ok) bien++; else ronda.malos.push({ pregunta: `${q.furigana} · ${c.base}${c.pega ? '〜' + c.pega : ''}`, respuesta: c.respuesta.furigana });
    inp.classList.add(ok ? 'bien' : 'mal'); fila.classList.add(ok ? 'ok' : 'ko');
    $('.cj-res', fila).innerHTML = `${ok ? '<span class="cj-marca">✓</span>' : '<span class="cj-marca">→</span><b>' + jp(c.respuesta.furigana) + '</b>'}<small>${ruby(c.base_furigana || c.base_txt)}</small>${(c.tambien || []).length ? `<em class="cj-tambien">${t('conj.tambien')} ${c.tambien.map((x) => jp(x.furigana)).join('・')}</em>` : ''}`;
    fila.tabIndex = 0;
    const ver = () => { $('.cj-porque', v).innerHTML = textoRico(c.explica); $$('.cj-ref th', v).forEach((th) => th.classList.toggle('a', th.dataset.b === c.base)); $$('.cj-fila', v).forEach((x) => x.classList.toggle('mira', x === fila)); };
    fila.addEventListener('mouseenter', ver); fila.addEventListener('focus', ver);
  });
  ronda.bien += bien; ronda.total += q.celdas.length; ronda.hecha = true; ronda.t = performance.now(); fase = 'ronda-hecha';
  const todo = bien === q.celdas.length, ultimaP = ronda.i === ronda.qs.length - 1;
  if (todo) { ronda.racha++; son.acierto(ronda.racha); } else { ronda.racha = 0; son.fallo(); }
  caraNyan(todo ? 'feliz' : bien >= q.celdas.length / 2 ? 'normal' : 'pensando');
  const primerMal = q.celdas.find((c, k) => $(`.cj-in[data-k="${k}"]`, v).classList.contains('mal')) || null;
  $('.cj-lado-cuerpo', v).innerHTML = ladoDespues(q, primerMal);
  if (primerMal) { $$('.cj-fila', v).forEach((x, k) => x.classList.toggle('mira', q.celdas[k] === primerMal)); }
  $('.cj-tabla-pie', v).innerHTML = `<span class="cj-nota-celdas ${todo ? 'bien' : ''}"><b>${bien}</b> / ${q.celdas.length}</span>
    <button class="boton-tinta cj-sig">${ultimaP ? t('conj.terminar') : t('conj.siguiente')} ${kbd('Intro')}</button>`;
  $('.cj-sig', v).onclick = () => siguiente();
  caber();
  setTimeout(() => $('.cj-sig', v)?.focus({ preventScroll: true }), 30);
  if (!quieto()) {
    gsap.fromTo($$('.cj-fila', v), { scale: 0.97 }, { scale: 1, duration: 0.4, stagger: 0.03, ease: 'back.out(2.4)' });
    gsap.fromTo($('.cj-lado-cuerpo', v), { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: 'power3.out' });
    if (!todo) gsap.fromTo($('.cj-tabla', v), { x: -8 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
  }
}

// ───────────────────────── el final ─────────────────────────
async function finRonda() {
  fase = 'fin';
  const v = V(), { bien, total, malos, forma: f } = ronda, perfecto = bien === total;
  son.fanfarria();
  const vistos = new Set(), lista = malos.filter((m) => !vistos.has(m.pregunta + m.respuesta) && vistos.add(m.pregunta + m.respuesta)).slice(0, 6);
  v.innerHTML = cabeceraRonda() + `<div class="cj-juego"><div class="carta-rep cj-carta cj-fin"><img class="cj-nyan grande" src="/img/reparto/nyan-${perfecto ? 'feliz' : bien >= total / 2 ? 'normal' : 'pensando'}-i.webp" alt="" draggable="false">
      <span class="tipo">${palabra(f.titulo)}</span>
      <div class="cj-fin-tit">${perfecto ? t('conj.fin.perfecto') : t('conj.fin.tit')}</div>
      <div class="cj-fin-num"><b>${bien}</b> / ${total}</div><div class="rc-logo m cj-fin-xp">+0 XP</div>
      <p class="cj-fin-repaso">&nbsp;</p>
      ${lista.length ? `<div class="cj-repasa"><span>${t('conj.fin.repasa')}</span>${lista.map((m) => `<div class="cj-chip">${jp(m.pregunta.replace(/ · .*$/, ''))}${m.pregunta.includes(' · ') ? `<small>${ruby(furiBases(m.pregunta.split(' · ')[1], dominados))}</small>` : ''}<i>→</i>${jp(m.respuesta)}</div>`).join('')}</div>` : ''}</div>
    <div class="cj-fin-botones"><button class="boton-claro" id="cj-formas">${t('conj.fin.volver')} ${kbd('Esc')}</button><button class="boton-tinta" id="cj-otra">${t('conj.fin.otra')} ${kbd('Intro')}</button></div></div>`;
  $('#cj-formas', v).onclick = () => { location.hash = 'conjugar'; };
  $('#cj-otra', v).onclick = () => empezar(ronda.id);
  $('#cj-otra', v).focus({ preventScroll: true });
  if (!quieto()) gsap.fromTo($('.cj-fin', v), { scale: 0.85, opacity: 0, rotate: -2 }, { scale: 1, opacity: 1, rotate: 0, duration: 0.6, ease: 'back.out(1.8)' });
  const id = ronda.id, n = vivo;
  try {
    const r = await api(`/api/conjugar/${id}`, { aciertos: bien, total });
    if (n !== vivo || fase !== 'fin') return;
    const xpEl = $('.cj-fin-xp', v);
    if (xpEl) { xpEl.textContent = `+${r.xp} XP`; if (r.xp) xpVuela(xpEl, r.xp, r.xp_total); }
    const p = $('.cj-fin-repaso', v); if (p) p.textContent = r.nueva ? t('conj.fin.nueva') : t('conj.fin.sigue');
  } catch {}
}

// ───────────────────────── vista y teclas ─────────────────────────
async function mostrar(resto = []) {
  const id = resto[0];
  if (id) return empezar(id);
  ronda = null; vivo++;
  try { datos = await api('/api/conjugar'); } catch { datos = datos || { formas: [], verbos: 0, adjetivos: 0 }; }
  dominados = !!datos.nombres_dominados;
  pintarLista(fase !== 'lista');
}
const volver = () => { location.hash = fase === 'lista' ? 'inicio' : 'conjugar'; };
registrar('conjugar', {
  seccion: '#v-conjugar',
  async entrar(resto = []) {
    if (!estado.inicio) estado.inicio = await api('/api/inicio').catch(() => null);
    ponerXP(Math.max(xpActual(), estado.inicio?.xp || 0));
    estilos();
    fase = 'carga';
    await mostrar(resto);
    // la primera vez, el tutorial se abre solo (si entras directo a una ronda, no se te cruza)
    if (!resto[0] && fase === 'lista' && !tutorialVisto()) setTimeout(() => { if (fase === 'lista' && V()?.classList.contains('activa') && !capaAbierta()) abrirTutorial(); }, 450);
  },
  actualizar(resto = []) { mostrar(resto); },
  salir() { vivo++; ronda = null; fase = 'lista'; tut?.cierra(); },
  volver,
});
V()?.addEventListener('click', (e) => { if (e.target.closest('[data-volver]')) { e.preventDefault(); volver(); } });
addEventListener('keydown', (e) => {
  if (!V()?.classList.contains('activa') || e.defaultPrevented || capaAbierta() || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
  if (escribiendo(e)) return;
  if (fase === 'lista' && /^[1-3]$/.test(e.key)) { e.preventDefault(); cambiarPestana(PESTANAS[+e.key - 1][0]); }
  else if (e.key === 'Enter' && !e.target.closest?.('button, a, [role="tab"]')) {
    if (fase === 'ronda-hecha') { e.preventDefault(); pulsarIntro(); }
    else if (fase === 'fin') { e.preventDefault(); empezar(ronda.id); }
  }
});

let puestos = false;
function estilos() {
  if (puestos) return; puestos = true;
  const s = document.createElement('style');
  s.textContent = `
/* esta pantalla es la de las conjugaciones: su color es el de ese tipo de tarjeta (--t-conj); --c-suave y --c-tinta son su tinta suave y su texto, que se leen igual en los cuatro temas */
#v-conjugar, .ct-hoja { --c: var(--t-conj); --c-suave: color-mix(in srgb, var(--t-conj) 14%, var(--sup)); --c-tinta: color-mix(in srgb, var(--tinta) 40%, var(--t-conj)); }
#v-conjugar { display: flex; flex-direction: column; }
#v-conjugar > .cab-papel { flex: none; padding-bottom: 10px; }
#v-conjugar .jp rt { font-size: .42em; color: var(--tinta-2); }
/* furigana de los nombres de la tabla y de 活用, 動詞… (baseRuby) */
#v-conjugar ruby { ruby-align: center; }
#v-conjugar ruby rt { font-size: .45em; font-weight: 500; letter-spacing: 0; color: var(--tinta-2); }
.cj-pestana b ruby rt { font-size: 8.5px; }
.cj-jp ruby rt { font-size: 10px; } .cj-tit rt { font-size: 8.5px; } .carta-rep .tipo rt { font-size: 7px; } .cj-intro rt { font-size: 7.5px; }
/* pestañas */
.cj-pestanas { display: flex; justify-content: center; gap: 12px; }
.cj-pestana { display: grid; grid-template-columns: auto auto auto; align-items: baseline; gap: 0 10px; min-height: 52px; padding: 8px 14px 9px 16px; border: var(--borde); border-radius: var(--radio-peq); background: var(--sup-2); color: var(--tinta-2);
  box-shadow: var(--sombra-peq); cursor: pointer; font: 700 15px var(--f-texto); transition: translate .15s var(--suave), background .15s, box-shadow .15s, border-color .15s; text-align: left; }
.cj-pestana b { grid-row: span 2; align-self: center; white-space: nowrap; font: var(--peso-titulo) 22px/1 var(--f-titulo); color: var(--tinta); }
.cj-pestana small { grid-column: 2 / 4; font: 600 11.5px var(--f-texto); color: var(--tinta-2); text-wrap: balance; }
.cj-pestana kbd { grid-row: 1; grid-column: 3; align-self: center; justify-self: end; }
.cj-pestana:hover { translate: 0 -2px; border-color: var(--linea-2); }
.cj-pestana:active { translate: 0 1px; }
.cj-pestana.si { background: var(--c-suave); color: var(--tinta); box-shadow: inset 0 0 0 2px var(--c); border-color: transparent; }
.cj-pestana.si b { color: var(--c-tinta); }
:is(.cj-pestana, .cj-ficha, .cj-ayuda, .cj-repasar, .ct-punto):focus-visible { outline: 2px solid var(--acento); outline-offset: 2px; }
/* la lista de formas */
.cj-cuerpo { flex: 1 1 auto; display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 0 28px 24px; max-width: 1180px; width: 100%; margin: 0 auto; }
.cj-intro { margin: 0; padding: 8px 20px; border-radius: var(--radio-btn); background: var(--sup); border: var(--borde); box-shadow: var(--sombra-peq); font: 600 15px/1.4 var(--f-texto); color: var(--tinta-2); text-align: center; text-wrap: balance; }
.cj-rejilla { width: 100%; display: grid; gap: 16px; grid-template-columns: repeat(3, minmax(0, 1fr)); margin-top: 4px; }
.cj-rejilla.n4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
/* la pestaña Tabla: «Los nombres de la tabla» ocupa la primera columna entera y las seis tablas se reparten las otras tres */
.cj-rejilla.n7 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.cj-ficha.nombres { grid-row: span 2; justify-content: center; }
.cj-ficha { position: relative; display: flex; flex-direction: column; align-items: flex-start; gap: 6px; min-height: 150px; padding: 16px 20px; border: var(--borde); border-radius: var(--radio); text-align: left; cursor: pointer; color: var(--tinta);
  background: var(--sup); box-shadow: var(--sombra); transition: translate .18s var(--suave), box-shadow .18s, border-color .18s; }
.cj-ficha:hover { translate: 0 -3px; border-color: var(--linea-2); }
.cj-ficha:active { translate: 0 2px; }
.cj-jp { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0 12px; font: 500 34px/1.15 var(--f-jp); color: var(--tinta); }
.cj-jp.larga { font-size: 28px; } .cj-jp.dos { flex-direction: column; gap: 0; font-size: 25px; line-height: 1.2; }
.cj-jp em { font-style: normal; }
.cj-tit { font: 700 17px var(--f-texto); color: var(--tinta); }
.cj-expl { flex: 1 1 auto; font: 500 13.5px/1.45 var(--f-texto); color: var(--tinta-2); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.cj-estado { display: inline-flex; align-items: center; gap: 8px; padding: 5px 12px 5px 10px; border-radius: var(--radio-btn); background: var(--sup-2); font: 700 12.5px var(--f-texto); color: var(--tinta-2); }
.cj-estado i { width: 8px; height: 8px; border-radius: 50%; background: currentColor; opacity: .55; }
.cj-ficha.e-repaso .cj-estado { background: var(--bien-suave); color: color-mix(in srgb, var(--tinta) 45%, var(--bien)); } .cj-ficha.e-repaso .cj-estado i { opacity: 1; background: var(--bien); }
.cj-ficha.e-toca .cj-estado { background: var(--acento-suave); color: var(--acento-tinta); } .cj-ficha.e-toca .cj-estado i { opacity: 1; background: var(--acento); animation: cj-late 1.4s ease-in-out infinite; }
@keyframes cj-late { 50% { scale: 1.45; } }
/* el rango: una pastilla con el color del rango, suave y con el texto oscuro (el color de relleno entero no se lee en todos los temas) */
.cj-rango { --rc: var(--r0); padding: 6px 10px; border-radius: var(--radio-peq); font: var(--peso-titulo) 13px/1 var(--f-titulo); font-style: normal; border: 0; transform: none;
  background: color-mix(in srgb, var(--rc) 16%, var(--sup)); color: color-mix(in srgb, var(--tinta) 45%, var(--rc)); box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--rc) 65%, transparent); }
.cj-rango { position: absolute; right: 16px; top: 14px; }
.cj-nota, .cj-pista { margin: 0; padding: 5px 16px; border-radius: var(--radio-btn); background: var(--sup); border: var(--borde); box-shadow: var(--sombra-peq); font: 600 13.5px var(--f-texto); color: var(--tinta-2); text-align: center; }
.cj-nota:empty { display: none; }
.cj-pista { font-size: 12.5px; padding: 4px 16px; } .cj-pista span { margin: 0 8px; } .cj-pista kbd { margin: 0 1px; }
/* la ronda */
.cj-cuenta { font: 600 14px var(--f-texto); color: var(--tinta-2); margin-right: 14px; font-variant-numeric: tabular-nums; } .cj-cuenta b { font-size: 18px; color: var(--tinta); }
.cj-juego { flex: 1 1 auto; display: flex; flex-direction: column; align-items: center; padding: clamp(0px, 3vh, 26px) 24px 32px; }
.cj-carta { width: min(560px, 100%); height: auto; min-height: 0; padding: 62px 28px 26px; display: grid; justify-items: center; align-content: center; gap: 6px; text-align: center; overflow: visible; }
.cj-palabra { font: 500 clamp(54px, 10.5vh, 92px)/1.25 var(--f-jp); color: var(--tinta); white-space: nowrap; }
.cj-es { font: 600 20px/1.3 var(--f-texto); color: var(--tinta-2); }
.cj-es small { display: block; margin-top: 2px; font: 600 12.5px var(--f-texto); color: var(--tinta-2); letter-spacing: .04em; }
.cj-cinta { width: min(420px, 90%); }
.cj-nyan { position: absolute; left: -62px; bottom: -34px; width: clamp(130px, 22vh, 190px); height: auto; aspect-ratio: 1; object-fit: contain; filter: drop-shadow(0 6px 8px rgba(0, 0, 0, .25)) /* arte */; pointer-events: none; z-index: 2; }
.cj-nyan.grande { left: -60px; width: clamp(160px, 28vh, 240px); }
.cj-resp { margin-top: 24px; }
.cj-resp input, .cj-in { font-family: var(--f-jp); }
.cj-sol { width: min(560px, 100%); }
.cj-sol:empty { display: none; }
.cj-veredicto { margin-top: 20px; padding: 16px 20px 20px; display: grid; justify-items: center; gap: 8px; border: var(--borde); border-radius: var(--radio); text-align: center; background: var(--sup);
  box-shadow: var(--sombra); }
.cj-veredicto.bien { background: var(--bien-suave); box-shadow: inset 0 0 0 2px var(--bien); border-color: transparent; }
.cj-veredicto.mal { background: var(--mal-suave); box-shadow: inset 0 0 0 2px var(--mal); border-color: transparent; }
.cj-correcta { display: flex; align-items: baseline; justify-content: center; gap: 12px; flex-wrap: wrap; }
.cj-correcta b { font: 500 36px/1.4 var(--f-jp); color: var(--tinta); }
.cj-correcta small { font: 700 13px var(--f-texto); color: var(--tinta-2); }
.cj-marca { align-self: center; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; font: 700 17px/1 var(--f-texto); color: color-mix(in srgb, var(--tinta) 45%, var(--bien)); background: var(--bien-suave); box-shadow: inset 0 0 0 2px var(--bien); }
.cj-veredicto.mal .cj-marca { color: color-mix(in srgb, var(--tinta) 45%, var(--mal)); background: var(--mal-suave); box-shadow: inset 0 0 0 2px var(--mal); }
.cj-tu { font: 600 14px var(--f-texto); color: var(--tinta-2); }
.cj-explica { margin: 2px 0 6px; max-width: 480px; font: 500 15px/1.6 var(--f-texto); color: var(--tinta); text-wrap: pretty; }
.cj-veredicto .boton-tinta, .cj-tabla-pie .boton-tinta, .cj-fin-botones .boton-tinta { height: 52px; }
/* la tabla */
.cj-juego.tabla { align-items: stretch; }
.cj-mesa { width: 100%; max-width: 1180px; margin: 0 auto; display: grid; grid-template-columns: minmax(0, 1fr) minmax(300px, 380px); gap: 24px; align-items: start; }
.cj-carta.cj-tabla { width: 100%; padding: 20px 28px 16px; gap: 8px; justify-items: stretch; text-align: left; }
.cj-cab-tabla { display: flex; align-items: baseline; justify-content: center; gap: 24px; flex-wrap: wrap; text-align: center; padding: 14px 0 2px; }
.cj-cab-tabla .cj-palabra { font-size: clamp(38px, 6.4vh, 56px); line-height: 1.25; }
.cj-filas { display: grid; gap: 4px; }
.cj-fila { display: grid; grid-template-columns: 108px 58px minmax(150px, 230px) minmax(0, 1fr); align-items: center; gap: 12px; padding: 4px 8px 4px 12px; border-radius: var(--radio-peq); transition: background .2s var(--suave), box-shadow .2s; }
.cj-fila.mira { background: var(--c-suave); box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--c) 45%, transparent); }
.cj-fila:focus-visible { outline: none; box-shadow: inset 0 0 0 2px var(--acento); }
.cj-base { display: flex; flex-direction: column; align-items: flex-start; min-width: 0; font: 700 16px/1.1 var(--f-jp); color: var(--tinta); }
.cj-bn { line-height: 1.5; } .cj-base rt { font-size: 7.5px; font-weight: 500; color: var(--tinta-2); }
.cj-base small { max-width: 100%; margin-top: -2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font: 600 10.5px/1.2 var(--f-texto); color: var(--tinta-2); }
.cj-pega { font: 600 16px var(--f-jp); color: var(--tinta-2); }
.cj-fila .cj-in { width: 100%; height: 40px; border: 0; border-radius: var(--radio-peq); padding: 0 14px; background: var(--sup-2); color: var(--tinta); outline: none; text-align: center; font: 500 20px var(--f-jp);
  box-shadow: inset 0 0 0 2px var(--linea); transition: box-shadow .15s var(--suave), background .15s; }
.cj-fila .cj-in:hover { box-shadow: inset 0 0 0 2px var(--linea-2); }
.cj-fila .cj-in:focus { background: var(--sup); box-shadow: inset 0 0 0 2px var(--acento); }
.cj-fila .cj-in.bien { background: var(--bien-suave); box-shadow: inset 0 0 0 2px var(--bien); }
.cj-fila .cj-in.mal { background: var(--mal-suave); box-shadow: inset 0 0 0 2px var(--mal); }
.cj-res { display: flex; align-items: center; gap: 8px; min-width: 0; white-space: nowrap; overflow: hidden; }
.cj-res b { font: 500 21px/1.4 var(--f-jp); color: var(--tinta); } .cj-res small { font: 500 14px var(--f-jp); color: var(--tinta-2); }
.cj-res .cj-marca { flex: none; width: 24px; height: 24px; font-size: 14px; }
.cj-fila.ko .cj-res .cj-marca { color: color-mix(in srgb, var(--tinta) 45%, var(--mal)); background: var(--mal-suave); box-shadow: inset 0 0 0 2px var(--mal); }
.cj-tabla-pie { display: flex; align-items: center; justify-content: flex-end; gap: 16px; padding-top: 4px; min-height: 52px; }
.cj-nota-celdas { font: 600 16px var(--f-texto); color: var(--tinta-2); } .cj-nota-celdas b { font: var(--peso-titulo) 30px/1 var(--f-titulo); color: var(--acento-tinta); font-variant-numeric: tabular-nums; }
.cj-nota-celdas.bien b { color: color-mix(in srgb, var(--tinta) 45%, var(--bien)); }
.cj-lado { position: relative; display: flex; flex-direction: column; margin-top: 18px; padding: 20px 22px 22px; border-radius: var(--radio); background: var(--sup); border: var(--borde); box-shadow: var(--sombra); }
.cj-lado .cj-nyan { position: static; align-self: flex-end; width: 92px; margin: 6px -4px -10px 0; }
.cj-lado h3 { margin: 0 0 12px; font: 700 12px var(--f-texto); letter-spacing: .14em; text-transform: uppercase; color: var(--tinta-2); }
.cj-leyenda { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.cj-leyenda li { display: grid; grid-template-columns: 62px 1fr; align-items: baseline; gap: 10px; } .cj-leyenda b { font: 700 15px var(--f-jp); color: var(--c-tinta); } .cj-leyenda span { font: 500 14px/1.4 var(--f-texto); color: var(--tinta-2); }
.cj-aviso { margin: 16px 0 0; padding: 12px 16px; border-radius: var(--radio-peq); background: var(--aviso-suave); font: 600 13.5px/1.5 var(--f-texto); color: var(--tinta); }
.cj-ref { width: 100%; border-collapse: separate; border-spacing: 4px; table-layout: fixed; text-align: center; }
.cj-ref th { padding: 6px 0; border-radius: var(--radio-peq); background: var(--sup-2); font: 700 12px var(--f-jp); color: var(--tinta-2); transition: background .2s, color .2s; }
.cj-ref th rt { font-size: 6.5px; font-weight: 500; letter-spacing: 0; }
.cj-ref th.a { background: var(--c-suave); color: var(--c-tinta); box-shadow: inset 0 0 0 2px var(--c); } .cj-ref th.a rt { color: inherit; }
.cj-ref td { padding: 2px 0; font: 500 12px var(--f-jp); color: var(--tinta-2); } .cj-ref td small { margin-left: 1px; font-size: 10px; }
.cj-ref tr.k td { padding: 8px 0; border-radius: var(--radio-peq); background: var(--c-suave); box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--c) 35%, transparent); } .cj-ref tr.k b { font: 500 15px var(--f-jp); color: var(--tinta); white-space: nowrap; letter-spacing: -.02em; }
.cj-ref tr.p td span { font: 600 10.5px/1.3 var(--f-jp); }
.cj-regla { margin: 12px 0 0; font: 600 13px/1.5 var(--f-texto); color: var(--tinta-2); }
.cj-porque { margin-top: 12px; padding: 12px 16px; min-height: 64px; border-radius: var(--radio-peq); background: var(--sup-2); font: 500 14px/1.6 var(--f-texto); color: var(--tinta); } .cj-porque em { color: var(--tinta-2); font-style: normal; }
/* «Los nombres de la tabla» */
.cj-nombre { font-size: clamp(56px, 11vh, 100px); letter-spacing: .06em; }
.cj-pega-nombre { font: 600 14px var(--f-texto); color: var(--tinta-2); } .cj-pega-nombre b { margin-left: 4px; font: 700 17px var(--f-jp); color: var(--c-tinta); }
.cj-juego.apretada .cj-nombre { font-size: clamp(40px, 7.5vh, 66px); } .cj-juego.muy-apretada .cj-nombre { font-size: clamp(32px, 5.5vh, 48px); }
/* sin nada que practicar */
.cj-vacia { padding: 44px 34px 38px; gap: 10px; } .cj-vacia h2 { margin: 6px 0 0; font: 700 26px/1.2 var(--f-texto); text-wrap: balance; } .cj-vacia p { margin: 0 0 14px; max-width: 420px; color: var(--tinta-2); font: 500 16px/1.5 var(--f-texto); text-wrap: pretty; }
.cj-vacia-jp { font: var(--peso-titulo) 72px/1 var(--f-titulo); color: var(--c-tinta); }
/* el final */
.cj-fin { padding: 56px 28px 28px; gap: 8px; }
.cj-fin-tit { font: var(--peso-titulo) clamp(24px, 4vh, 34px) var(--f-titulo); color: var(--tinta); text-wrap: balance; }
.cj-fin-num { font: 600 18px var(--f-texto); color: var(--tinta-2); font-variant-numeric: tabular-nums; } .cj-fin-num b { font: var(--peso-titulo) 54px/1 var(--f-titulo); color: var(--acento-tinta); }
.cj-fin-xp { font-size: 30px; }
.cj-fin-repaso { margin: 4px 0 0; max-width: 400px; font: 600 15px/1.45 var(--f-texto); color: var(--tinta-2); text-wrap: pretty; }
.cj-repasa { display: grid; justify-items: center; gap: 6px; margin-top: 6px; } .cj-repasa > span { font: 700 11.5px var(--f-texto); letter-spacing: .12em; text-transform: uppercase; color: var(--tinta-2); }
.cj-chip { display: inline-flex; align-items: baseline; gap: 8px; padding: 6px 16px; border: var(--borde); border-radius: var(--radio-btn); background: var(--sup-2); box-shadow: var(--sombra-peq); font: 500 19px/1.45 var(--f-jp); color: var(--tinta); }
.cj-chip small { font: 600 12px var(--f-texto); color: var(--tinta-2); } .cj-chip i { font-style: normal; color: var(--acento-tinta); }
.cj-fin-botones { display: flex; gap: 12px; margin-top: 24px; }
@media (max-width: 1100px) { .cj-mesa { grid-template-columns: minmax(0, 1fr) 300px; gap: 16px; } .cj-fila { grid-template-columns: 92px 54px minmax(104px, 140px) minmax(0, 1fr); } .cj-pestana small { display: none; } .cj-pestana kbd { display: none; } .cj-pestana { padding: 8px 14px 9px 14px; }
  .cj-ref tr.k b { font-size: 13px; letter-spacing: -.04em; } .cj-ref tr.f td { white-space: nowrap; } .cj-ref tr.f td small { display: none; } }
@media (max-width: 900px) { .cj-mesa { grid-template-columns: minmax(0, 1fr); } .cj-lado { margin-top: 4px; } .cj-rejilla, .cj-rejilla.n4, .cj-rejilla.n7 { grid-template-columns: repeat(2, minmax(0, 1fr)); } .cj-ficha.nombres { grid-column: 1 / -1; grid-row: auto; } .cj-pestana kbd { display: none; } }
/* tipo de verbo al resolver, y la ronda compacta cuando no cabe (caber) */
.cj-clase { padding: 4px 12px; border-radius: var(--radio-btn); background: var(--bien-suave); font: 700 13px var(--f-texto); color: color-mix(in srgb, var(--tinta) 45%, var(--bien)); }
.cj-clase.mal { background: var(--mal-suave); color: color-mix(in srgb, var(--tinta) 45%, var(--mal)); font-size: 14px; }
.cj-juego.apretada { padding-top: 0; padding-bottom: 10px; }
.cj-juego.apretada .cj-carta { padding: 42px 24px 14px; gap: 2px; }
.cj-juego.apretada .cj-palabra { font-size: clamp(40px, 7.5vh, 66px); }
.cj-juego.apretada .cj-resp { margin-top: 10px; }
.cj-juego.apretada .cj-veredicto { margin-top: 10px; padding: 10px 16px 12px; gap: 4px; }
.cj-juego.apretada .cj-correcta b { font-size: 28px; }
.cj-juego.apretada .cj-explica { margin: 0 0 2px; font-size: 14px; line-height: 1.45; }
.cj-juego.apretada .boton-tinta { height: 44px; }
.cj-juego.apretada .cj-fila .cj-in { height: 32px; font-size: 18px; }
.cj-juego.apretada .cj-filas { gap: 2px; }
.cj-juego.apretada .cj-cab-tabla { padding-top: 4px; }
.cj-juego.apretada .cj-cab-tabla .cj-palabra { font-size: clamp(30px, 5vh, 44px); }
.cj-juego.muy-apretada .cj-nyan { display: none; }
.cj-juego.muy-apretada .cj-carta { padding: 34px 20px 10px; }
.cj-juego.muy-apretada .cj-palabra { font-size: clamp(32px, 5.5vh, 48px); }
.cj-juego.muy-apretada .cj-es { font-size: 16px; }
.cj-juego.muy-apretada .cj-correcta b { font-size: 24px; }
.cj-juego.muy-apretada .cj-fila .cj-in { height: 28px; font-size: 16px; }
.cj-juego.muy-apretada .cj-base small { display: none; } .cj-juego.muy-apretada .cj-bn { line-height: 1.2; }
.cj-juego.muy-apretada .cj-res b { font-size: 18px; }
.cj-repasar { display: flex; width: fit-content; align-items: center; justify-content: center; margin: 6px auto 0; height: 50px; padding: 0 24px; text-decoration: none; }
.cj-res:has(.cj-tambien) { flex-wrap: wrap; row-gap: 0; white-space: normal; }
.cj-tambien { flex-basis: 100%; padding-left: 32px; font: 500 13px/1.3 var(--f-jp); font-style: normal; color: var(--tinta-2); } .cj-tambien .jp, .cj-tambien ruby { color: var(--tinta-2); }
@media (max-height: 760px) { .cj-ficha { min-height: 130px; } .cj-carta { padding-top: 54px; } .cj-fila .cj-in { height: 36px; } }
/* el botón «¿Cómo funciona?» de la cabecera de la lista */
.cj-cab .contador { display: flex; align-items: center; gap: 14px; }
.cj-ayuda { display: inline-flex; align-items: center; gap: 8px; height: 44px; padding: 0 18px 0 8px; border: var(--borde); border-radius: var(--radio-btn); background: var(--sup); color: var(--tinta); cursor: pointer; white-space: nowrap;
  font: 700 14px var(--f-texto); box-shadow: var(--sombra-peq); transition: translate .15s var(--suave), border-color .15s; }
.cj-ayuda i { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: var(--boton); color: var(--boton-tinta); font: var(--peso-titulo) 16px/1 var(--f-titulo); font-style: normal; }
.cj-ayuda:hover { translate: 0 -2px; border-color: var(--linea-2); } .cj-ayuda:active { translate: 0 1px; }
@media (max-width: 1100px) { .cj-ayuda { padding: 0 8px; font-size: 0; gap: 0; } }
/* el tutorial: una hoja de papel con el texto a un lado y el ejemplo animado al otro */
.ct-hoja { position: relative; display: flex; flex-direction: column; width: min(960px, 94vw); height: min(660px, 92vh); padding: 24px 40px 28px; border-radius: var(--radio); background: var(--sup); border: var(--borde);
  box-shadow: var(--sombra-flotante); }
.ct-cab { flex: none; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 16px; }
.ct-cab .volver { justify-self: end; }
.ct-hoja :is(.volver, .boton-claro), .cj-fin-botones .boton-claro, .cj-vacia .boton-claro { background: var(--sup-2); }
.ct-n { font: 700 13px var(--f-texto); letter-spacing: .14em; color: var(--tinta-2); font-variant-numeric: tabular-nums; }
.ct-puntos { display: flex; align-items: center; gap: 8px; }
.ct-punto { position: relative; width: 11px; height: 11px; padding: 0; border: 0; border-radius: 99px; background: var(--linea-2); cursor: pointer; transition: width .25s var(--suave), background .2s; }
.ct-punto::after { content: ""; position: absolute; inset: -14px -4px; }
.ct-punto.hecho { background: color-mix(in srgb, var(--acento) 45%, var(--sup)); } .ct-punto.si { width: 30px; background: var(--acento); }
.ct-pag { flex: 1 1 0; min-height: 0; display: flex; flex-direction: column; justify-content: center; gap: 20px; padding: 8px 0 6px; }
.ct-tit { margin: 0; font: 700 clamp(26px, 4.4vh, 36px)/1.15 var(--f-texto); letter-spacing: -.01em; color: var(--tinta); text-align: center; text-wrap: balance; }
.ct-tit rt, .ct-texto rt { font-size: .5em; color: var(--tinta-2); }
.ct-cols { flex: 0 1 auto; min-height: 0; display: grid; grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr); gap: 44px; align-items: center; }
.ct-cols.sin { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
.ct-texto { font: 500 clamp(15px, 2.5vh, 18px)/1.8 var(--f-texto); color: var(--tinta-2); }
.ct-texto p { margin: 0 0 .85em; } .ct-texto p:last-child { margin: 0; }
.ct-texto b { border-radius: .25em; background: var(--acento-suave); box-shadow: 0 0 0 .14em var(--acento-suave); font-weight: 700; color: var(--tinta); }
.ct-ej { font-size: clamp(13px, 2.15vh, 17px); }
.ct-cols.sin .ct-ej { display: grid; justify-items: center; gap: 14px; }
.ct-nyan { width: clamp(120px, 24vh, 190px); height: auto; filter: drop-shadow(0 8px 10px rgba(0, 0, 0, .25)) /* arte */; }
.ct-probar { height: 52px; }
.ct-pie { flex: none; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 16px; }
.ct-pie .ct-atras { justify-self: start; height: 52px; } .ct-pie .ct-sig { justify-self: end; height: 52px; }
.ct-pista { display: inline-flex; align-items: center; gap: 4px; font: 600 13px var(--f-texto); color: var(--tinta-2); }
@media (max-width: 860px) { .ct-hoja { padding: 18px 22px 20px; } .ct-cols, .ct-cols.sin { grid-template-columns: minmax(0, 1fr); gap: 14px; } .ct-pista { display: none; } .ct-pie { grid-template-columns: auto 1fr auto; } .ct-pie .ct-sig { grid-column: 3; } }
@media (max-height: 640px) { .ct-hoja { padding-top: 16px; padding-bottom: 18px; } .ct-pag { gap: 10px; } .ct-pie .ct-atras, .ct-pie .ct-sig { height: 46px; } .ct-texto p { margin-bottom: .6em; } }
@media (prefers-reduced-motion: reduce) { .ct-punto, .cj-ayuda, .cj-ficha, .cj-pestana, .cj-fila, .cj-fila .cj-in { transition: none; } .cj-ficha.e-toca .cj-estado i { animation: none; } .cj-ficha:hover, .cj-pestana:hover, .cj-ayuda:hover { translate: none; } }`;

  document.head.appendChild(s);
}
