// Clases nuevas de gramática: en vez de leer un texto y contestar preguntas, cada clase es un cómic corto y dos juegos.
//  1. Manga: Nyan se topa con la gramática en cuatro viñetas, con su voz (ずんだもん).
//  2. «La frase cobra vida»: montas la frase con piezas y la habitación hace EXACTAMENTE lo que dices. Si te equivocas
//     pasa algo gracioso: いる con una cosa → le salen patas; ある con un animal → se queda tieso como un peluche;
//     partículas al revés → la mesa acaba encima del libro.
//  3. Minijuego rápido (¿いる o ある?), con la explicación de las trampas.
//  4. Manga de cierre con la explicación y la chuleta; al terminar, XP como una lección de gramática.
// El contenido está en web/clases/<id>.json, los dibujos en clase-arte.js y las voces en web/sonidos/clases/<id>/
// (herramientas/voz_clase.py). Todo SVG + GSAP: ligero también en el móvil.
// Teclado: Intro sigue · E repite la voz · 1–7 palabras, N に, G が, I いる, A ある · ⌫ quita · ← → en el minijuego.
import { gsap } from 'gsap';
import { $, $$, api, registrar, flotar, chispas } from './app.js';
import * as son from './sonido.js';
import { esc, ruby } from './japones.js';
import { kbd, capaAbierta, capa } from './teclado.js';
import { t, idioma } from './i18n.js';
import { MUELLE } from './curvas.js';
import { C, ARTE, MED, DEFS, FONDOS, nyan, figura, vida, etiqueta, manpu, recorte, esReparto } from './clase-arte.js';
import { NS, componer, nyan3d, insignia, cumple, efectosEn } from './clase-escena.js';

const V = () => $('#v-clase');
const PASOS = ['intro', 'frase', 'juego', 'outro'];
const quieto = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const tr = (o) => (o && typeof o === 'object' ? o[idioma] ?? o.es ?? '' : o || '');
const frase = (s) => String(s).split(' ').map(ruby).join(' ');   // los espacios separan trozos, como en los libros para niños
const barajar = (l) => { const a = [...l]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const castizo = (s) => (idioma === 'es' ? s.replace(/\bde el\b/g, 'del').replace(/\ba el\b/g, 'al') : s);

let clase = null, voces = new Set(), autoplay = true, audio = null, ultimaVoz = null, lugarClase = 'cuarto';
let episodio = null;   // las clases de formato 2 (episodios de juego) las lleva episodio.js
const PASOS_EP = ['mision', 'historia', 'reto', 'final'];
let puntos = { frase: 0, frase_total: 0, juego: 0, juego_total: 0 };
let teclas = null;   // lo que hace el teclado en el paso de ahora: { intro, numero, letra, flecha, quitar, oir }

function oir(nombre, { forzar = false } = {}) {
  if (!nombre || !voces.has(nombre) || (!forzar && !autoplay)) return false;
  ultimaVoz = nombre;
  audio?.pause();
  audio = son.pista(`sonidos/clases/${clase.id}/${nombre}.mp3`);   // por el AudioContext de toda la app (sonido.js)
  audio.play().catch(() => {});
  return true;
}

// ───────────────────────── entrada y pasos ─────────────────────────
async function entrar(id, sub = null) {
  estilos();
  teclas = null;
  // las que aún no se han rehecho (candado en el índice) tampoco se abren con un enlace directo
  const ix = await fetch('clases/indice.json').then((r) => r.json()).catch(() => []);
  if (ix.some((x) => x.id === id && !x.hay)) { location.hash = 'gramatica'; return; }
  try {
    const r = await fetch(`clases/${encodeURIComponent(id)}.json`);
    if (!r.ok) throw new Error(r.status);
    clase = await r.json();
    const enIndice = ix.find((x) => x.id === id); if (enIndice) clase.clase = enIndice.clase; // el número es el de su sitio en el índice
  } catch {
    V().innerHTML = `<header class="cab-papel"><button class="volver" data-volver>${t('clase.volver')} ${kbd('Esc')}</button></header><p class="vacio-papel">${t('clase.no_existe')}</p>`;
    $('[data-volver]', V()).onclick = () => { location.hash = 'gramatica'; };
    return;
  }
  voces = new Set(await fetch(`sonidos/clases/${clase.id}/indice.json`).then((r) => (r.ok ? r.json() : [])).catch(() => []));
  autoplay = (await api('/api/inicio').catch(() => null))?.ajustes?.autoplay !== false;
  puntos = { frase: 0, frase_total: 0, juego: 0, juego_total: 0 };
  episodio = clase.formato === 2 ? await import('./episodio.js') : null;
  const sitio = clase.lugar || (clase.historia || clase.intro || []).map((v) => v.escena?.fondo).find(Boolean) || (typeof clase.intro?.[0]?.escena === 'string' ? 'washitsu' : 'cuarto');
  lugarClase = FONDOS[sitio] ? sitio : 'cuarto';
  V().style.setProperty('--foto-papel', `url(/img/fondos/${lugarClase}.webp)`);
  V().innerHTML = `<header class="cab-papel cl-cab"><button class="volver" data-volver>${t('clase.volver')} ${kbd('Esc')}</button>
      <div class="cl-tit"><small>${t('clase.eyebrow', { n: clase.clase, cap: esc(tr(clase.capitulo?.titulo) || '') })}</small><b>${ruby(tr(clase.titulo))}</b></div>
      <nav class="cl-pasos" aria-label="${t('clase.pasos.aria')}">${(episodio ? PASOS_EP : PASOS).map((p, i) => `<button data-paso="${p}"><i>${i + 1}</i><span>${t((episodio ? 'ep.paso.' : 'clase.pasos.') + p)}</span></button>`).join('')}<button class="cl-paso-apuntes" data-paso="apuntes"><i lang="ja">帳</i><span>${t('clase.apuntes.boton')}</span></button></nav></header>
    <main class="cl-cuerpo"></main>`;
  $('[data-volver]', V()).onclick = () => { location.hash = 'gramatica'; };
  $$('[data-paso]', V()).forEach((b) => { b.onclick = () => ir(b.dataset.paso); });
  if (episodio) await episodio.empezar({ clase, V: V(), voces, ir });
  ir(sub === 'apuntes' ? 'apuntes' : episodio ? 'mision' : 'intro');
}

function ir(paso) {
  if (episodio && paso !== 'apuntes' && !episodio.puede(paso)) { episodio.avisarCerrado(paso); return; }
  teclas = null; audio?.pause();
  $$('.cl-pasos button', V()).forEach((b) => {
    b.classList.toggle('aqui', b.dataset.paso === paso);
    b.classList.toggle('hecho', paso !== 'apuntes' && PASOS.includes(b.dataset.paso) && PASOS.indexOf(b.dataset.paso) < PASOS.indexOf(paso));
  });
  const cuerpo = $('.cl-cuerpo', V());
  gsap.killTweensOf($$('*', cuerpo));
  cuerpo.innerHTML = '';
  V().scrollTo(0, 0);
  son.musica(paso === 'apuntes');   // el koto de la portada, solo mientras se leen los apuntes
  if (paso === 'apuntes') apuntes(cuerpo);
  else if (episodio) episodio.ir(paso, cuerpo);
  else if (paso === 'intro') manga(cuerpo, clase.intro, { final: t('clase.a_probar'), alFinal: () => ir('frase') });
  else if (paso === 'frase') (clase.practica?.tipo === 'montar' ? montar : fraseViva)(cuerpo, clase.practica);
  else if (paso === 'juego') minijuego(cuerpo);
  else manga(cuerpo, clase.outro, { final: t('clase.ver_chuleta'), alFinal: () => chuleta(cuerpo) });
}

// ───────────────────────── manga ─────────────────────────
const pon = (id, x, y, s = 1, extra = '') => `<g transform="translate(${x} ${y}) scale(${s})">${figura(id)}${extra}</g>`;
// Nyan en 3D (web/img/reparto; clase-arte.js: recorte) con su cara, el brazo arriba y, si hace falta, su onigiri: en las
// clases ya no sale el Nyan dibujado (30-09: nunca un Nyan dibujado y otro en 3D en la misma pantalla)
const ny = (x, y, s, o) => `<g transform="translate(${x} ${y}) scale(${s})"><g class="cl-ny">${nyan3d(o)}</g></g>`;
// 30-09 · las escenas escritas a mano (la clase 4) van también sobre la foto del cuarto, como todas
const fondoManga = () => FONDOS.washitsu();
const cajaCon = (x, y, s, dentro) => `<g transform="translate(${x} ${y}) scale(${s})">${ARTE.cajaFondo()}<g transform="translate(0 ${MED.caja.dentro}) scale(.9)">${dentro}</g>${ARTE.cajaFrente()}</g>`;
const ESCENAS = {
  despierta: (cara) => pon('cama', 170, 236, 1.5) + ny(176, 176, 1.05, { cara }) + manpu('z', 226, 84, 1.3),
  caja: (cara) => cajaCon(282, 236, 1.35, figura('gato')) + ny(100, 236, 1.2, { cara }) + manpu('excl', 150, 112, 1.3),
  mesa: (cara) => pon('mesa', 282, 236, 1.3) + pon('onigiri', 282, 149, 1.3) + manpu('brillo', 318, 116) + manpu('brillo', 248, 106, 0.7)
    + ny(100, 236, 1.2, { cara }) + manpu('corazon', 152, 112),
  huye: (cara) => manpu('prisa', 222, 196, 1.3) + `<g transform="translate(300 219) scale(1.5)"><g class="cl-corre">${ARTE.onigiri()}${vida(MED.onigiri)}</g></g>`
    + ny(100, 236, 1.2, { cara }) + manpu('sudor', 150, 118, 1.2),
  'resumen-iru': (cara) => ny(86, 236, 1.15, { cara, brazo: 'arriba' }) + pon('gato', 222, 236, 1.3) + pon('perro', 320, 236, 1.3) + manpu('corazon', 272, 118, 0.9),
  'resumen-aru': (cara) => ny(86, 236, 1.15, { cara, brazo: 'arriba' }) + pon('libro', 214, 236, 1.6) + pon('ki', 322, 236, 1.45),
  'resumen-orden': (cara) => ny(80, 236, 1.1, { cara, brazo: 'arriba' }) + cajaCon(292, 236, 1.35, figura('gato'))
    + insignia('が', 348, 104, C.pRosa) + insignia('に', 214, 196, C.menta),
  fin: (cara) => pon('cama', 214, 236, 1.6) + ny(262, 180, 1.0, { cara }) + manpu('z', 304, 80, 1.3),
};
const COLA = { despierta: '72%', fin: '88%' };
const HX_ESCENA = { despierta: 0.44, caja: 0.25, mesa: 0.25, huye: 0.25, 'resumen-iru': 0.22, 'resumen-aru': 0.22, 'resumen-orden': 0.2, fin: 0.66 };   // dónde está Nyan (0–1)   // hacia dónde apunta el pico del bocadillo (Nyan)

// quién habla en cada viñeta (29-09): Nyan habla de tú con Tama y de usted con el sensei o el dependiente. Cada uno, su
// color de bocadillo y su figura en la escena, a la que apunta el pico. Desde el 30-09 son el
// reparto: el sensei es Fukuro (la lechuza maestra) y el dependiente, Pon (el tanuki de la tienda).
const HABLA = { tama: { fig: ['gato'], jp: 'タマ' }, sensei: { fig: ['profesor', 'sensei'], jp: 'フクロ先生' }, tendero: { fig: ['persona'], jp: 'ポン' } };
const quien = (v) => (HABLA[v.habla] ? v.habla : 'nyan');
// el pico del bocadillo apunta a quien habla: Nyan (bocadillo arriba a la izquierda, 3 %–61 % del ancho) o, si habla otro
// que está a la derecha, el bocadillo se va arriba a la derecha (39 %–97 %)
function figDe(v) {
  const q = quien(v), cosas = v.escena?.cosas || [];
  return q === 'nyan' ? cosas.find((c) => c.que === 'nyan') : (cosas.find((c) => c.id === q) || cosas.find((c) => HABLA[q].fig.includes(c.que)));
}
// 30-09 · la «cámara» de cada viñeta, para que no sean cuatro fotos iguales: la primera (y la última) general; en medio, una sí y
// otra no, un plano medio que se acerca a quien habla. Solo es un zoom sobre la escena (se ve siempre entera la viñeta).
function camara(v, i, n) {
  if (typeof v.escena === 'string' || i === 0 || i === n - 1 || i % 2 === 0) return null;
  const f = figDe(v); return { z: 1.3, cx: Math.min(330, Math.max(70, f?.x ?? 200)), cy: 178 };
}
const enPantalla = (cam, x) => (cam ? cam.z * (x - cam.cx) + cam.cx : x);
function colaDe(v, cam = null) {
  if (typeof v.escena === 'string') return COLA[v.escena] || '34%';
  const fig = figDe(v);
  const x = fig ? enPantalla(cam, fig.x ?? 200) / 4 : 20;
  const izq = x < 55 ? 3 : 39;
  return `${Math.round(Math.min(88, Math.max(10, ((x - izq) / 58) * 100)))}%`;
}
const aLaDerecha = (v, cam = null) => {
  if (quien(v) === 'nyan' || typeof v.escena === 'string') return false;
  return enPantalla(cam, figDe(v)?.x ?? 300) / 4 >= 55;
};

function htmlVineta(v, i, n = 4) {
  const arte = typeof v.escena === 'string' ? fondoManga() + (ESCENAS[v.escena] || ESCENAS.fin)(v.cara) : componer(v.escena || {});
  const cam = camara(v, i, n), ancha = i === 0 || (i === n - 1 && (n - 1) % 2 === 1);
  const zoom = cam ? `<g transform="translate(${cam.cx} ${cam.cy}) scale(${cam.z}) translate(${-cam.cx} ${-cam.cy})">${arte}</g>` : arte;
  const hx = typeof v.escena === 'string' ? (HX_ESCENA[v.escena] ?? 0.3) : enPantalla(cam, figDe(v)?.x ?? 80) / 400;
  return `<figure class="cl-vineta${ancha ? ' ancha' : ''}${cam ? ' cerca' : ''}" data-hx="${hx.toFixed(3)}" style="--cola:${colaDe(v, cam)}">
    <div class="cl-arte"><svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMax slice" aria-hidden="true">${DEFS}${zoom}</svg>
      <div class="cl-bocadillo quien-${quien(v)}${aLaDerecha(v, cam) ? ' der' : ''}">${quien(v) !== 'nyan' ? `<b class="cl-quien" lang="ja">${HABLA[quien(v)].jp}</b>` : ''}<div class="cl-jp" lang="ja">${frase(v.jp)}</div><div class="cl-tr">${esc(tr(v.tr))}</div></div>
      <span class="cl-num">${i + 1}</span></div>
    ${v.cartela || v.nota ? `<figcaption>${v.cartela ? `<span class="cl-cartela">${ruby(tr(v.cartela))}</span>` : ''}${v.nota ? `<span class="cl-nota">${ruby(tr(v.nota))}</span>` : ''}</figcaption>` : ''}
  </figure>`;
}

// 30-09 · el bocadillo va encima de quien habla y su pico le apunta: se mide el panel y el bocadillo (su ancho depende del texto)
function colocarBocadillo(p) {
  const arte = $('.cl-arte', p), b = $('.cl-bocadillo', p); if (!arte || !b) return;
  const A = arte.getBoundingClientRect(); if (!A.width) return;
  const w = b.offsetWidth, x = +p.dataset.hx * A.width, izq = Math.min(A.width * 0.97 - w, Math.max(A.width * 0.03, x - w * 0.42));
  b.style.left = `${izq}px`; b.style.right = 'auto';
  b.style.setProperty('--cola', `${Math.min(88, Math.max(10, ((x - izq) / w) * 100)).toFixed(1)}%`);
}
addEventListener('resize', () => $$('.cl-vineta.mostrada').forEach(colocarBocadillo));
function manga(cuerpo, vinetas, { final, alFinal }) {
  cuerpo.insertAdjacentHTML('beforeend', `<div class="cl-manga">${vinetas.map((v, i) => htmlVineta(v, i, vinetas.length)).join('')}</div>
    <div class="cl-acciones cl-acc-manga"><button class="boton-tinta" data-primario>${t('clase.seguir')} ${kbd('Intro')}</button></div>`);
  const paneles = $$('.cl-vineta', cuerpo), acc = $('.cl-acc-manga', cuerpo), boton = $('[data-primario]', acc);
  let i = -1;
  const mostrar = (k) => {
    const p = paneles[k];
    p.classList.add('mostrada'); colocarBocadillo(p);
    if (!quieto()) {
      gsap.fromTo(p, { opacity: 0, scale: 0.9, rotate: k % 2 ? 1.6 : -1.6 }, { opacity: 1, scale: 1, rotate: 0, duration: 0.5, ease: 'back.out(1.8)' });
      gsap.fromTo($('.cl-bocadillo', p), { scale: 0.3, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, delay: 0.25, ease: 'back.out(2.4)', transformOrigin: '30% 100%' });
      gsap.fromTo($('.cl-ny', p), { y: 0 }, { y: -10, duration: 0.16, yoyo: true, repeat: 1, delay: 0.3, ease: 'power2.out' });
      const corre = $('.cl-corre', p);
      if (corre) { gsap.fromTo(corre, { x: -70 }, { x: 16, duration: 1.3, ease: 'power1.out', delay: 0.2 }); gsap.to(corre, { y: -5, duration: 0.13, yoyo: true, repeat: 9, delay: 0.2 }); }
      gsap.fromTo($$('.manpu', p), { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.35, delay: 0.45, stagger: 0.08, ease: 'back.out(3)' });
    }
    son.papel();
    setTimeout(() => oir(vinetas[k].voz), quieto() ? 60 : 380);
    p.scrollIntoView({ block: 'nearest', behavior: quieto() ? 'auto' : 'smooth' });   // scroll-margin: que no quede bajo la cabecera
  };
  const sig = () => {
    if (i >= paneles.length - 1) { acc.remove(); alFinal(); return; }
    i++; mostrar(i);
    if (i === paneles.length - 1) boton.innerHTML = `${final} ${kbd('Intro')}`;
  };
  boton.onclick = sig;
  paneles.forEach((p, k) => { p.onclick = () => { if (k <= i) oir(vinetas[k].voz, { forzar: true }); }; });
  teclas = { intro: sig, oir: () => oir(vinetas[Math.max(i, 0)].voz, { forzar: true }) };
  sig();
}

// ───────────────────────── «la frase cobra vida» ─────────────────────────
const TIPO_HUECO = ['palabra', 'particula', 'palabra', 'particula', 'verbo'];
const CASA = { caja: { x: 82, y: 226, s: 1 }, mesa: { x: 238, y: 226, s: 1 }, cama: { x: 386, y: 226, s: 0.88 } };
const SUELO = [{ x: 160, y: 264 }, { x: 318, y: 264 }], AIRE = [{ x: 238, y: 96 }, { x: 128, y: 100 }];
const ESCALA = { gato: 0.85, perro: 0.85 };

const htmlSala = () => `<svg class="cl-sala" viewBox="0 0 470 280" role="img" aria-label="${t('clase.frase.sala')}">${DEFS}
  <image href="/img/escenarios/washitsu.webp" x="0" y="0" width="470" height="280" preserveAspectRatio="xMidYMax slice"/>
  <ellipse cx="238" cy="244" rx="120" ry="16" fill="rgba(60, 35, 12, .16)"/>
  <g class="c-fondo"></g><g class="c-dentro"></g><g class="c-muebles"></g><g class="c-cosas"></g><g class="c-encima"></g></svg>`;

// el dibujo del encargo: el sitio con la cosa en su sitio
function miniEncargo(e) {
  const m = MED[e.sitio], cosa = figura(e.cosa) + (e.vida ? vida(MED[e.cosa]) : '');
  if (e.sitio === 'caja') return `${ARTE.cajaFondo()}<g transform="translate(0 ${m.dentro}) scale(.85)">${cosa}</g>${ARTE.cajaFrente()}`;
  return `${figura(e.sitio)}<g transform="translate(${m.dx || 0} ${m.sup ?? -m.h}) scale(.85)">${cosa}</g>`;
}

function htmlDice() {
  return `<div class="cl-dice"><svg class="cl-dice-nyan" viewBox="-58 -112 116 118" aria-hidden="true">${recorte('nyan', 'normal')}</svg><p class="cl-dice-txt" aria-live="polite"></p></div>`;
}
function decir(cuerpo, texto, cara = 'normal', html = false) {
  const svg = $('.cl-dice-nyan', cuerpo), p = $('.cl-dice-txt', cuerpo);
  if (svg) svg.innerHTML = recorte('nyan', cara, cara === 'feliz');   // en 3D, como el de la escena (nunca uno dibujado al lado)
  p.innerHTML = html ? castizo(texto) : ruby(castizo(texto));
  if (!quieto()) gsap.fromTo(p, { scale: 0.85, opacity: 0.3 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(2.5)', transformOrigin: '0% 50%' });
}

function fraseViva(cuerpo, pr = clase) {
  const P = pr.piezas, enc = pr.encargos, palabras = Object.keys(P);
  const PIEZAS = [...palabras.map((id, k) => ({ v: id, tipo: 'palabra', jp: P[id].jp, tecla: String(k + 1) })),
    { v: 'ni', tipo: 'particula', jp: 'に', tecla: 'N' }, { v: 'ga', tipo: 'particula', jp: 'が', tecla: 'G' },
    { v: 'iru', tipo: 'verbo', jp: 'いる', tecla: 'I' }, { v: 'aru', tipo: 'verbo', jp: 'ある', tecla: 'A' }];
  const btn = (p) => `<button class="cl-pieza" data-v="${p.v}" data-tipo="${p.tipo}"><span lang="ja">${ruby(p.jp)}</span>${kbd(p.tecla)}</button>`;
  const grupo = (tipo, etq) => `<div class="cl-grupo" data-tipo="${tipo}"><small>${t('clase.frase.' + etq)}</small><div>${PIEZAS.filter((p) => p.tipo === tipo).map(btn).join('')}</div></div>`;
  cuerpo.innerHTML = `<section class="cl-frase">
    <p class="cl-intro">${t('clase.frase.intro')}</p>
    <div class="cl-frase-rejilla">
      <div class="cl-col-escena"><div class="cl-escena">${htmlSala()}</div>${htmlDice()}</div>
      <div class="cl-col-mando">
        <div class="cl-encargo"></div>
        <div class="cl-huecos">${TIPO_HUECO.map((tp, i) => `<button class="cl-hueco" data-i="${i}" data-tipo="${tp}"></button>`).join('')}</div>
        <p class="cl-pista" lang="ja">${esc(tr(clase.chuleta.patron))}</p>
        <div class="cl-bandeja">${grupo('palabra', 'palabras')}${grupo('particula', 'particulas')}${grupo('verbo', 'verbos')}</div>
        <div class="cl-acciones"><button class="boton-claro" data-quitar>${t('clase.frase.quitar')} ${kbd('⌫')}</button><button class="boton-tinta" data-primario hidden></button></div>
      </div>
    </div>
  </section>`;
  const sala = $('.cl-sala', cuerpo), primario = $('[data-primario]', cuerpo), botonQuitar = $('[data-quitar]', cuerpo);
  const capas = { fondo: $('.c-fondo', sala), dentro: $('.c-dentro', sala), muebles: $('.c-muebles', sala), cosas: $('.c-cosas', sala), encima: $('.c-encima', sala) };
  let n = 0, fallos = 0, huecos = [], orden = [], resuelto = false, objs = {};
  puntos.frase = 0; puntos.frase_total = enc.length;

  // ── objetos de la habitación ──
  const cuerpoDe = (o) => $('.cuerpo', o.els.at(-1)), mueveDe = (o) => $('.mueve', o.els.at(-1));
  function crear(id, x, y, s, capa) {
    const nuevo = (dondeCapa, html, conHalo) => {
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'obj');
      g.innerHTML = `${conHalo ? `<ellipse class="halo" cx="0" cy="2" rx="${(MED[id].w * s) / 2 + 10}" ry="8" fill="${C.mante}" stroke="#221817" stroke-width="2.5" opacity="0"/>` : ''}<g class="mueve"><g class="cuerpo" transform="scale(${s})">${html}</g></g>`;
      capas[dondeCapa].appendChild(g);
      gsap.set(g, { x, y });
      return g;
    };
    const els = id === 'caja' ? [nuevo('fondo', ARTE.cajaFondo(), true), nuevo('muebles', ARTE.cajaFrente(), false)] : [nuevo(capa, figura(id), true)];
    return (objs[id] = { id, x, y, s, els });
  }
  function mover(o, x, y, { capa = null, arco = 0, dur = 0.5 } = {}) {
    if (capa) o.els.forEach((el) => capas[capa].appendChild(el));
    const y0 = o.y; o.x = x; o.y = y;
    return new Promise((ok) => {
      if (quieto()) { o.els.forEach((el) => gsap.set(el, { x, y })); ok(); return; }
      o.els.forEach((el, k) => {
        gsap.to(el, { x, duration: dur, ease: 'power1.inOut', overwrite: 'auto' });
        const fin = k === o.els.length - 1 ? ok : null;
        if (arco) gsap.to(el, { keyframes: [{ y: Math.min(y0, y) - arco, duration: dur * 0.45, ease: 'power2.out' }, { y, duration: dur * 0.55, ease: 'bounce.out' }], onComplete: fin });
        else gsap.to(el, { y, duration: dur, ease: 'back.out(1.6)', onComplete: fin });
      });
    });
  }
  const halo = (o, si) => { const h = $('.halo', o.els[0]); if (h) gsap.to(h, { opacity: si ? 0.95 : 0, duration: 0.25 }); };
  function flotarObj(o, si) {
    const c = mueveDe(o);
    gsap.killTweensOf(c, 'y');
    if (si && !quieto()) gsap.fromTo(c, { y: 0 }, { y: -6, duration: 0.7, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    else gsap.set(c, { y: 0 });
  }
  function aparecer(o) { if (!quieto()) o.els.forEach((el) => gsap.fromTo(el, { scale: 0, transformOrigin: '50% 100%' }, { scale: 1, duration: 0.4, ease: 'back.out(2.2)' })); }
  function quitarObj(o) {
    delete objs[o.id];
    o.els.forEach((el) => { gsap.killTweensOf(el); if (quieto()) el.remove(); else gsap.to(el, { scale: 0, duration: 0.22, transformOrigin: '50% 100%', onComplete: () => el.remove() }); });
  }

  // mientras montas la frase, la habitación la va siguiendo: el sitio se ilumina y lo que «hay» flota esperando
  function sincronizar() {
    const quiero = {};
    let suelo = 0, aire = 0;
    for (const [w, p] of [[huecos[0], huecos[1]], [huecos[2], huecos[3]]]) {
      if (!w) continue;
      const mueble = w in CASA;
      if (p === 'ni') quiero[w] = mueble ? { ...CASA[w], papel: 'sitio' } : { ...SUELO[suelo++], papel: 'sitio' };
      else quiero[w] = mueble ? { ...CASA[w], y: CASA[w].y - 16, papel: 'algo' } : { ...AIRE[aire++], papel: 'algo' };
    }
    for (const id of Object.keys(objs)) {
      if (id in quiero) continue;
      if (id in CASA) { mover(objs[id], CASA[id].x, CASA[id].y); halo(objs[id], false); flotarObj(objs[id], false); } else quitarObj(objs[id]);
    }
    for (const [id, q] of Object.entries(quiero)) {
      let o = objs[id];
      if (!o) { o = crear(id, q.x, q.y, ESCALA[id] ?? 1, 'cosas'); aparecer(o); } else if (o.x !== q.x || o.y !== q.y) mover(o, q.x, q.y);
      halo(o, q.papel === 'sitio');
      flotarObj(o, q.papel === 'algo');
    }
  }
  function destino(o) {
    const m = MED[o.id];
    if (o.id === 'caja') return { x: o.x, y: o.y + m.dentro * o.s, capa: 'dentro' };
    if (m.sup != null) return { x: o.x + (m.dx || 0) * o.s, y: o.y + m.sup * o.s, capa: 'encima' };
    return { x: o.x, y: o.y - m.h * o.s + 4, capa: 'encima' };
  }

  // ── reacciones ──
  function cobraVida(o, sitio) {
    const c = cuerpoDe(o);
    c.insertAdjacentHTML('beforeend', vida(MED[o.id]));
    // dentro de la caja no se vería: trepa y se planta en el borde
    if (sitio?.id === 'caja') { o.els.forEach((el) => capas.encima.appendChild(el)); o.y = sitio.y - 54 * sitio.s + 11 * o.s; }
    if (quieto()) { o.els.forEach((el) => gsap.set(el, { y: o.y - 11 * o.s })); return; }
    const vivo = $('.vida', c), m = mueveDe(o);
    gsap.fromTo(vivo, { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.35, ease: 'back.out(3)' });
    o.els.forEach((el) => gsap.to(el, { y: o.y - 11 * o.s, duration: 0.25, ease: 'back.out(3)' }));
    gsap.to(m, { rotation: 9, transformOrigin: '50% 100%', yoyo: true, repeat: 7, duration: 0.16, ease: 'sine.inOut', delay: 0.3 });
    gsap.to(o.els, { keyframes: [{ x: o.x - 14, duration: 0.5 }, { x: o.x + 14, duration: 0.6 }, { x: o.x, duration: 0.4 }], delay: 0.3, ease: 'sine.inOut' });
  }
  function peluche(o) {
    o.els.forEach((el) => $('.cuerpo', el).setAttribute('filter', 'url(#cl-gris)'));
    cuerpoDe(o).insertAdjacentHTML('beforeend', etiqueta(MED[o.id]));
    const m = mueveDe(o);
    if (!quieto()) {
      gsap.fromTo(m, { x: -2 }, { x: 2, repeat: 5, yoyo: true, duration: 0.05 });
      gsap.to(m, { rotation: 84, transformOrigin: '50% 100%', duration: 0.7, ease: 'bounce.out', delay: 0.35 });
    }
  }
  function contento(o) {
    if (!quieto()) o.els.forEach((el) => gsap.to(el, { y: o.y - 14, duration: 0.16, yoyo: true, repeat: 3, ease: 'power2.out' }));
    setTimeout(() => chispas(o.els.at(-1), { n: 16 }), 120);
  }

  // ── huecos y piezas ──
  function pintar(ultimo = -1) {
    $$('.cl-hueco', cuerpo).forEach((h, i) => {
      const p = huecos[i] && PIEZAS.find((x) => x.v === huecos[i]);
      h.classList.toggle('lleno', !!p);
      h.innerHTML = p ? `<span lang="ja">${ruby(p.jp)}</span>` : `<span class="cl-hueco-etq">${t('clase.hueco.' + TIPO_HUECO[i])}</span>`;
      if (i === ultimo && !quieto()) gsap.fromTo(h, { scale: 0.6 }, { scale: 1, duration: 0.35, ease: 'back.out(3)' });
    });
    $$('.cl-pieza', cuerpo).forEach((b) => b.classList.toggle('usada', huecos.includes(b.dataset.v)));
    botonQuitar.disabled = resuelto || !orden.length;
  }
  function poner(v) {
    if (resuelto) return false;
    if (huecos.includes(v)) return quitar(huecos.indexOf(v));
    const p = PIEZAS.find((x) => x.v === v); if (!p) return false;
    const i = TIPO_HUECO.findIndex((tp, k) => tp === p.tipo && !huecos[k]);
    if (i < 0) { const b = $(`.cl-pieza[data-v="${v}"]`, cuerpo); if (b && !quieto()) gsap.fromTo(b, { x: -6 }, { x: 0, duration: 0.4, ease: 'elastic.out(1.2, .25)' }); son.roce(); return true; }
    huecos[i] = v; orden.push(i);
    pintar(i); sincronizar(); son.toque();
    if (TIPO_HUECO.every((_, k) => huecos[k])) setTimeout(resolver, quieto() ? 60 : 420);
    return true;
  }
  function quitar(i = orden.at(-1)) {
    if (resuelto || i == null || !huecos[i]) return false;
    huecos[i] = null; orden = orden.filter((k) => k !== i);
    pintar(); sincronizar(); son.roce();
    return true;
  }

  function ronda() {
    const e = enc[n];
    huecos = [null, null, null, null, null]; orden = []; resuelto = false; objs = {};
    Object.values(capas).forEach((c) => { gsap.killTweensOf($$('*', c)); c.innerHTML = ''; });
    for (const [id, q] of Object.entries(CASA)) crear(id, q.x, q.y, q.s, 'muebles');
    $('.cl-encargo', cuerpo).innerHTML = `<svg class="cl-encargo-img" viewBox="-80 -122 160 128" aria-hidden="true">${DEFS}${miniEncargo(e)}</svg>
      <div><small>${t('clase.frase.encargo', { n: n + 1, total: enc.length })}</small><b>${esc(tr(e.pide))}</b></div>`;
    if (!quieto()) gsap.fromTo($('.cl-encargo', cuerpo), { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'back.out(2)' });
    decir(cuerpo, fallos ? t('clase.frase.otra_vez') : n ? t('clase.frase.siguiente_encargo') : t('clase.frase.primero'), fallos ? 'pensando' : 'normal');
    primario.hidden = true;
    pintar();
  }

  async function resolver() {
    resuelto = true; pintar();
    const e = enc[n], [a, pa, b, , verbo] = huecos;
    const sitio = pa === 'ni' ? a : b, algo = pa === 'ni' ? b : a, ordenF = pa === 'ni' ? 'n' : 'r';
    const vivo = P[algo].vivo, bienVerbo = vivo ? verbo === 'iru' : verbo === 'aru';
    const oS = objs[sitio], oA = objs[algo];
    flotarObj(oA, false); halo(oS, false);
    const d = destino(oS);
    await Promise.race([mover(oA, d.x, d.y, { capa: d.capa, arco: 46, dur: 0.75 }), new Promise((r) => setTimeout(r, 1400))]);
    if (!bienVerbo && !vivo) cobraVida(oA, oS); else if (!bienVerbo) peluche(oA); else contento(oA);
    const voz = `f-${ordenF}-${sitio}-${algo}-${verbo}`;
    if (!oir(voz)) son.voz(bienVerbo ? 'nya' : 'eh');
    const acierto = sitio === e.sitio && algo === e.cosa && (e.vida ? verbo === 'iru' : bienVerbo);
    const nom = (id) => tr(P[id]);
    let msg, cara;
    if (acierto) { msg = e.vida ? t('clase.msg.vida_ok') : ordenF === 'r' ? t('clase.msg.orden') : t('clase.msg.ok'); cara = 'feliz'; }
    else if (sitio === e.cosa && algo === e.sitio) { msg = t('clase.msg.al_reves', { algo: nom(algo), sitio: nom(sitio) }); cara = 'sorpresa'; }
    else if (e.vida && sitio === e.sitio && algo === e.cosa) { msg = t('clase.msg.vida_casi'); cara = 'pensando'; }
    else if (!bienVerbo && !vivo) { msg = t('clase.msg.vida', { algo: nom(algo) }); cara = 'sorpresa'; }
    else if (!bienVerbo) { msg = t('clase.msg.peluche', { algo: nom(algo) }); cara = 'sorpresa'; }
    else { msg = t('clase.msg.otro'); cara = 'pensando'; }
    decir(cuerpo, msg, cara);
    if (acierto) { if (!fallos) puntos.frase++; son.acierto(1); } else { fallos++; son.fallo(); }
    primario.hidden = false;
    primario.innerHTML = `${acierto ? (n < enc.length - 1 ? t('clase.frase.sig') : t('clase.frase.al_juego')) : t('clase.frase.otra')} ${kbd('Intro')}`;
    primario.onclick = () => {
      if (!acierto) { ronda(); return; }
      fallos = 0; n++;
      if (n >= enc.length) ir('juego'); else ronda();
    };
  }

  $$('.cl-pieza', cuerpo).forEach((b) => { b.onclick = () => poner(b.dataset.v); });
  $$('.cl-hueco', cuerpo).forEach((h) => { h.onclick = () => quitar(+h.dataset.i); });
  botonQuitar.onclick = () => quitar();
  const LETRA = { n: 'ni', g: 'ga', i: 'iru', a: 'aru' };
  teclas = {
    intro: () => { if (!primario.hidden) primario.click(); },
    numero: (k) => (palabras[k - 1] ? poner(palabras[k - 1]) : false),
    letra: (k) => (LETRA[k] ? poner(LETRA[k]) : false),
    quitar: () => quitar(),
    oir: () => oir(ultimaVoz, { forzar: true }),
  };
  ronda();
}

// ───────────────────────── «la frase cobra vida», versión general (clases escritas como datos) ─────────────────────────
// practica: {tipo: 'montar', intro, piezas: [{id, jp}], encargos: [{pide, escena, piezas: [ids], bien: [[ids en orden], …],
//   tr, pista, efecto_bien, bien_msg, fallos: [{si: {contiene, falta, en: [i, id], orden}, efecto, msg, cara}], voz}]}
// Las piezas se tocan en orden; con todos los huecos llenos la escena reacciona: si está bien, su efecto_bien; si coincide
// una regla de «fallos», su efecto gracioso y su explicación; si no, Nyan señala el primer hueco que no cuadra.
const EFECTOS = new Set(['brilla', 'vida', 'peluche', 'gigante', 'mini', 'disfraz', 'huye', 'duerme', 'come', 'encima', 'mueve', 'aparece', 'desaparece',
  'tacha', 'nyan', 'texto', 'manpu', 'gira', 'tiembla', 'salta']);
export { EFECTOS };

function montar(cuerpo, pr, opts = {}) {
  const P = Object.fromEntries(pr.piezas.map((x) => [x.id, x])), enc = opts.solo != null ? [pr.encargos[opts.solo]] : pr.encargos, base = opts.solo ?? 0;
  let algunFallo = false;
  cuerpo.innerHTML = `<section class="cl-frase cl-montar">
    <p class="cl-intro">${ruby(tr(pr.intro) || t('clase.montar.intro'))}</p>
    <div class="cl-frase-rejilla">
      <div class="cl-col-escena"><div class="cl-escena"><svg class="cl-sala" viewBox="0 0 400 260" role="img" aria-label="${t('clase.frase.sala')}"></svg></div>${htmlDice()}</div>
      <div class="cl-col-mando">
        <div class="cl-encargo cl-encargo-txt"></div>
        <div class="cl-huecos"></div>
        <p class="cl-pista" lang="ja"></p>
        <div class="cl-bandeja cl-bandeja-libre"></div>
        <div class="cl-acciones"><button class="boton-claro" data-quitar>${t('clase.frase.quitar')} ${kbd('⌫')}</button><button class="boton-tinta" data-primario hidden></button></div>
      </div>
    </div>
  </section>`;
  const sala = $('.cl-sala', cuerpo), primario = $('[data-primario]', cuerpo), botonQuitar = $('[data-quitar]', cuerpo);
  let n = 0, fallos = 0, huecos = [], orden = [], resuelto = false, fichas = [];
  puntos.frase = 0; puntos.frase_total = enc.length;
  const fraseDe = (ids) => ids.map((id) => P[id]?.jp || id).join('');

  // ── la escena (sus efectos están en clase-escena.js) ──
  const { efectos } = efectosEn(sala, { chispas });

  // ── huecos y piezas ──
  function pintar(ultimo = -1) {
    $('.cl-huecos', cuerpo).innerHTML = huecos.map((id, i) => `<button class="cl-hueco${id ? ' lleno' : ''}" data-i="${i}" data-tipo="${id ? P[id]?.tipo || 'palabra' : 'palabra'}">${id ? `<span lang="ja">${ruby(P[id]?.jp || id)}</span>` : `<span class="cl-hueco-etq">${i + 1}</span>`}</button>`).join('');
    $$('.cl-hueco', cuerpo).forEach((h) => { h.onclick = () => quitar(+h.dataset.i); });
    if (ultimo >= 0 && !quieto()) gsap.fromTo($$('.cl-hueco', cuerpo)[ultimo], { scale: 0.6 }, { scale: 1, duration: 0.35, ease: 'back.out(3)' });
    $$('.cl-pieza', cuerpo).forEach((b) => b.classList.toggle('usada', huecos.includes(b.dataset.v)));
    botonQuitar.disabled = resuelto || !orden.length;
  }
  function poner(id) {
    if (resuelto || !id) return false;
    if (huecos.includes(id)) return quitar(huecos.indexOf(id));
    const i = huecos.indexOf(null); if (i < 0) return false;
    huecos[i] = id; orden.push(i); pintar(i); son.toque();
    if (!huecos.includes(null)) setTimeout(resolver, quieto() ? 60 : 380);
    return true;
  }
  function quitar(i = orden.at(-1)) {
    if (resuelto || i == null || !huecos[i]) return false;
    huecos[i] = null; orden = orden.filter((k) => k !== i); pintar(); son.roce(); return true;
  }
  function ronda() {
    const e = enc[n];
    resuelto = false; orden = [];
    huecos = Array(e.bien[0].length).fill(null);
    fichas = barajar(e.piezas || [...new Set(e.bien.flat())]);
    gsap.killTweensOf($$('*', sala));
    sala.innerHTML = DEFS + componer(e.escena || {}, true);
    $('.cl-encargo', cuerpo).innerHTML = `<div>${opts.solo != null ? '' : `<small>${t('clase.frase.encargo', { n: n + 1, total: enc.length })}</small>`}<b>${ruby(tr(e.pide))}</b></div>`;
    $('.cl-pista', cuerpo).innerHTML = e.pista ? ruby(tr(e.pista)) : '';
    $('.cl-bandeja', cuerpo).innerHTML = fichas.map((id, k) => `<button class="cl-pieza" data-v="${esc(id)}" data-tipo="${P[id]?.tipo || 'palabra'}"><span lang="ja">${ruby(P[id]?.jp || id)}</span>${k < 9 ? kbd(String(k + 1)) : ''}</button>`).join('');
    $$('.cl-pieza', cuerpo).forEach((b) => { b.onclick = () => poner(b.dataset.v); });
    if (!quieto()) gsap.fromTo($('.cl-encargo', cuerpo), { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'back.out(2)' });
    decir(cuerpo, fallos ? t('clase.frase.otra_vez') : tr(e.nyan) || (n ? t('clase.frase.siguiente_encargo') : t('clase.montar.primero')), fallos ? 'pensando' : 'normal');
    primario.hidden = true;
    pintar();
  }
  async function resolver() {
    resuelto = true; pintar();
    const e = enc[n], seq = [...huecos];
    const acierto = e.bien.some((b) => b.length === seq.length && b.every((x, k) => x === seq[k]));
    if (acierto) {
      await efectos(e.efecto_bien || { tipo: 'brilla' });
      if (!oir(e.voz || `e${base + n + 1}-${e.bien.findIndex((b) => b.every((x, k) => x === seq[k]))}`) && !oir(`e${base + n + 1}-0`)) son.voz('nyaa');
      decir(cuerpo, `${ruby(tr(e.bien_msg) || t('clase.msg.ok'))}<br><span class="cl-dicho" lang="ja">${frase(fraseDe(seq))}</span>${e.tr ? ` <small>${esc(tr(e.tr))}</small>` : ''}`, 'feliz', true);
      if (!fallos) puntos.frase++;
      son.acierto(1);
    } else {
      const regla = (e.fallos || []).find((r) => cumple(r.si, seq));
      if (regla) { await efectos(regla.efecto); decir(cuerpo, tr(regla.msg), regla.cara || 'sorpresa'); }
      else {
        const b = e.bien[0], k = seq.findIndex((x, i) => x !== b[i]);
        $$('.cl-hueco', cuerpo)[k]?.classList.add('mal');
        decir(cuerpo, t('clase.montar.casi', { n: k + 1 }), 'pensando');
      }
      son.voz('eh'); son.fallo(); fallos++; algunFallo = true;
    }
    primario.hidden = false;
    primario.innerHTML = `${acierto ? (n < enc.length - 1 || opts.alFinal ? t('clase.frase.sig') : t('clase.frase.al_juego')) : t('clase.frase.otra')} ${kbd('Intro')}`;
    requestAnimationFrame(() => primario.scrollIntoView({ block: 'nearest', behavior: quieto() ? 'auto' : 'smooth' }));   // en un móvil puede quedar justo debajo
    primario.onclick = () => {
      if (!acierto) { ronda(); return; }
      fallos = 0; n++;
      if (n >= enc.length) { if (opts.alFinal) opts.alFinal(algunFallo); else ir('juego'); } else ronda();
    };
  }
  botonQuitar.onclick = () => quitar();
  teclas = {
    intro: () => { if (!primario.hidden) primario.click(); },
    numero: (k) => poner(fichas[k - 1]),
    quitar: () => quitar(),
    oir: () => oir(ultimaVoz, { forzar: true }),
  };
  ronda();
}

// ───────────────────────── minijuego: ¿いる o ある? ─────────────────────────
// juego: {cestas: [{id, jp, sub}], cartas: [{id, jp, es, en, cesta, dibujo, truco}]} — una carta puede ser un dibujo con su
// palabra o una frase con hueco «＿» (entonces la voz suena al contestar, con el hueco ya lleno). El formato viejo de la
// clase de いる/ある (una lista con «verbo») se traduce aquí.
function juegoDe(c) {
  if (!Array.isArray(c.juego)) return c.juego;
  return { cestas: [{ id: 'iru', jp: 'いる', sub: t('clase.juego.iru_sub') }, { id: 'aru', jp: 'ある', sub: t('clase.juego.aru_sub') }],
    cartas: c.juego.map((x) => ({ ...x, dibujo: x.dibujo || x.id, cesta: x.verbo })) };
}
function minijuego(cuerpo) {
  const J = juegoDe(clase), cestas = J.cestas, cartas = barajar(J.cartas), tres = cestas.length > 2;
  let k = 0, racha = 0, bloqueado = false;
  puntos.juego = 0; puntos.juego_total = cartas.length;
  const teclaDe = (i) => (tres ? String(i + 1) : i ? '→' : '←');
  const htmlCesta = (c, i) => `<button class="cl-cesta" data-v="${esc(c.id)}" data-i="${i}"><b lang="ja">${ruby(c.jp)}</b><small>${esc(tr(c.sub))}</small>${kbd(teclaDe(i))}</button>`;
  cuerpo.innerHTML = `<section class="cl-juego${tres ? ' tres' : ''}">
    <p class="cl-intro">${ruby(tr(J.intro) || t('clase.juego.intro'))}</p>
    <div class="cl-marcador"><div class="cl-puntos">${cartas.map(() => '<i></i>').join('')}</div><b class="cl-racha"></b></div>
    <div class="cl-tablero">
      ${tres ? '' : htmlCesta(cestas[0], 0)}
      <div class="cl-carta-sitio"></div>
      ${tres ? `<div class="cl-cestas3">${cestas.map(htmlCesta).join('')}</div>` : htmlCesta(cestas[1], 1)}
    </div>
    ${htmlDice()}
    <div class="cl-acciones"><button class="boton-tinta" data-primario hidden></button></div>
  </section>`;
  const sitio = $('.cl-carta-sitio', cuerpo), primario = $('[data-primario]', cuerpo), puntosEl = $$('.cl-puntos i', cuerpo);
  decir(cuerpo, tr(J.nyan) || t('clase.juego.nyan'), 'normal');
  const conHueco = (c) => String(c.jp).includes('＿');
  const jpCarta = (c, lleno = null) => frase(c.jp).replace('＿', `<span class="cl-blanco${lleno ? ' lleno' : ''}">${lleno ? ruby(lleno) : '＿'}</span>`);
  const mostrar = () => {
    const c = cartas[k];
    sitio.innerHTML = `<div class="cl-carta${c.dibujo ? '' : ' sin-dibujo'}" data-id="${esc(c.id)}">${c.dibujo ? `<div class="cl-carta-escena" style="background-image:url(/img/escenarios/${lugarClase}.webp)"><svg viewBox="-50 -98 100 104" aria-hidden="true">${figura(c.dibujo)}</svg></div>` : ''}
      <div class="cl-carta-jp" lang="ja">${jpCarta(c)}</div><small>${esc(tr(c))}</small></div>`;
    if (!quieto()) gsap.fromTo($('.cl-carta', sitio), { y: -40, rotate: -8, opacity: 0 }, { y: 0, rotate: 0, opacity: 1, duration: 0.45, ease: 'back.out(2)' });
    puntosEl[k]?.classList.add('ahora');
    if (!conHueco(c)) setTimeout(() => oir('w-' + c.id), 200);
    bloqueado = false;
  };
  const sig = () => {
    puntosEl[k]?.classList.remove('ahora');
    k++;
    primario.hidden = true;
    if (k < cartas.length) { mostrar(); return; }
    sitio.innerHTML = `<div class="cl-carta cl-carta-fin"><b>${puntos.juego} / ${cartas.length}</b></div>`;
    decir(cuerpo, t(puntos.juego === cartas.length ? 'clase.juego.perfecto' : 'clase.juego.fin', { bien: puntos.juego, total: cartas.length }), 'feliz');
    primario.hidden = false; primario.innerHTML = `${t('clase.juego.al_final')} ${kbd('Intro')}`;
    primario.onclick = () => ir('outro');
    son.voz('nyaa');
  };
  const vuela = (c) => {
    const carta = $('.cl-carta', sitio), cesta = $(`.cl-cesta[data-v="${CSS.escape(c.cesta)}"]`, cuerpo);
    if (!carta || !cesta || quieto()) { sig(); return; }
    const a = carta.getBoundingClientRect(), b = cesta.getBoundingClientRect();
    gsap.to(carta, { x: b.left + b.width / 2 - (a.left + a.width / 2), y: b.top + b.height / 2 - (a.top + a.height / 2), scale: 0.25, rotate: b.left < a.left ? -20 : 20, opacity: 0, duration: 0.45, ease: 'power2.in',
      onComplete: () => { gsap.fromTo(cesta, { scale: 1.12 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1, .4)' }); sig(); } });
  };
  const responder = (v) => {
    if (bloqueado || k >= cartas.length || !v) return false;
    bloqueado = true;
    const c = cartas[k], bien = v === c.cesta, cesta = cestas.find((x) => x.id === c.cesta);
    puntosEl[k].classList.add(bien ? 'bien' : 'mal');
    const jpDe = $('.cl-carta-jp', sitio);
    if (conHueco(c) && jpDe) { jpDe.innerHTML = jpCarta(c, cesta.jp); oir('w-' + c.id); }
    const truco = c.truco ? tr(c.truco) : '';
    if (bien) {
      puntos.juego++; racha++; son.acierto(racha);
      $('.cl-racha', cuerpo).textContent = racha >= 2 ? t('clase.juego.racha', { n: racha }) : '';
      decir(cuerpo, truco ? `${t('clase.juego.bien')} ${truco}` : t('clase.juego.bien'), 'feliz');
      setTimeout(() => vuela(c), truco || conHueco(c) ? 1500 : 350);
    } else {
      racha = 0; son.fallo();
      $('.cl-racha', cuerpo).textContent = '';
      const carta = $('.cl-carta', sitio);
      if (carta && !quieto()) gsap.fromTo(carta, { x: -10 }, { x: 0, duration: 0.5, ease: 'elastic.out(1.2, .2)' });
      decir(cuerpo, truco || t('clase.juego.mal', { cosa: tr(c) || c.jp, verbo: cesta.jp }), 'sorpresa');
      primario.hidden = false; primario.innerHTML = `${t('clase.juego.vale')} ${kbd('Intro')}`;
      primario.onclick = () => { primario.hidden = true; vuela(c); };
    }
    return true;
  };
  $$('.cl-cesta', cuerpo).forEach((b) => { b.onclick = () => responder(b.dataset.v); });
  teclas = {
    intro: () => { if (!primario.hidden) primario.click(); },
    flecha: (dir) => (tres ? responder(cestas[dir < 0 ? 0 : 2]?.id) : responder(cestas[dir < 0 ? 0 : 1].id)),
    numero: (n) => (tres ? responder(cestas[n - 1]?.id) : false),
    abajo: () => (tres ? responder(cestas[1].id) : false),
    oir: () => oir('w-' + cartas[Math.min(k, cartas.length - 1)].id, { forzar: true }),
  };
  mostrar();
}

// ───────────────────────── chuleta y fin ─────────────────────────
function chuleta(cuerpo) {
  const ch = clase.chuleta, total = puntos.frase_total + puntos.juego_total;
  // columnas: [{jp, texto, dibujos: [dos figuras]}] (la de いる/ある trae iru/aru/educado sueltos); filas: ejemplos con traducción
  const mini = (ds = []) => (ds.length ? `<svg viewBox="-90 -96 180 100" aria-hidden="true">${ds.slice(0, 2).map((d, i) => `<g transform="translate(${ds.length > 1 ? (i ? 42 : -42) : 0} 0)">${figura(d)}</g>`).join('')}</svg>` : '');
  const cols = ch.columnas || (ch.iru ? [{ jp: 'いる', texto: ch.iru, dibujos: ['gato', 'perro'] }, { jp: 'ある', texto: ch.aru, dibujos: ['libro', 'ki'] }] : []);
  const COLORES = ['var(--bien)', 'var(--r1)', 'var(--r0)', 'var(--aviso)'];
  cuerpo.insertAdjacentHTML('beforeend', `<section class="cl-chuleta">
    <h2>${t('clase.fin.tit')}</h2>
    <div class="cl-patron" lang="ja">${ruby(tr(ch.patron))}</div><p class="cl-patron-tr">${ruby(tr(ch.patron_tr))}</p>
    ${cols.length ? `<div class="cl-dos" style="grid-template-columns: repeat(${Math.min(cols.length, 3)}, minmax(0, 1fr))">${cols.map((c, i) => `<div class="cl-col" style="--c:${COLORES[i % 4]}"><b lang="ja">${ruby(c.jp)}</b><p>${ruby(tr(c.texto))}</p>${mini(c.dibujos)}</div>`).join('')}</div>` : ''}
    ${(ch.filas || []).length ? `<ul class="cl-filas">${ch.filas.map((f) => `<li>${f.registro ? `<em class="cl-reg ${f.registro}">${t('clase.reg.' + f.registro)}</em>` : ''}<span lang="ja">${frase(f.jp)}</span><small>${esc(tr(f))}</small></li>`).join('')}</ul>` : ''}
    ${ch.consejo || ch.educado ? `<p class="cl-educado">${ruby(tr(ch.consejo || ch.educado))}</p>` : ''}
    ${total ? `<div class="cl-resultado"><span>${t('clase.fin.frase', { bien: puntos.frase, total: puntos.frase_total })}</span><span>${t('clase.fin.juego', { bien: puntos.juego, total: puntos.juego_total })}</span></div>` : ''}
    <div class="cl-acciones"><button class="boton-claro" data-repetir>↻ ${t('clase.fin.repetir')}</button><button class="boton-claro" data-apuntes-fin><span lang="ja">帳</span> ${t('clase.apuntes.boton')}</button><button class="boton-tinta" data-primario>${t('clase.fin.terminar')} ${kbd('Intro')}</button></div>
  </section>`);
  const sec = $('.cl-chuleta', cuerpo), boton = $('[data-primario]', sec);
  if (!quieto()) gsap.fromTo(sec, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.8)' });
  sec.scrollIntoView({ block: 'start', behavior: quieto() ? 'auto' : 'smooth' });
  $('[data-repetir]', sec).onclick = () => ir('intro');
  $('[data-apuntes-fin]', sec).onclick = () => ir('apuntes');
  let hecho = false;
  const terminar = async () => {
    if (hecho) { location.hash = 'gramatica'; return; }
    hecho = true; boton.disabled = true;
    let r = null;
    try { r = await api(`/api/clase/${clase.id}`, { aciertos: puntos.frase + puntos.juego, total }); } catch { flotar(t('clase.fin.no_guardado'), innerWidth / 2, innerHeight / 2, 'var(--mal)'); }
    boton.disabled = false;
    boton.innerHTML = `${t('clase.fin.volver')} ${kbd('Intro')}`;
    if (!r) return;
    son.fanfarria();
    const rc = await import('./recompensas.js').catch(() => null);
    rc?.xpVuela(boton, r.xp, r.xp_total);
    if (rc && r.nivel > r.nivel_antes) await rc.celebrarNivel(r.nivel, { bolsas: r.bolsas_ganadas ?? 1, koban: r.koban_ganados ?? 0 });
    rc?.finSesion({ respuestas: 0, aciertos: 0, mejor_racha: 0, lecciones: 0, gramatica: 1 });
  };
  boton.onclick = terminar;
  teclas = { intro: () => boton.click(), oir: () => oir(ultimaVoz, { forzar: true }) };
}

// ───────────────────────── apuntes ─────────────────────────
// 30-09 · Todo
// sale de la propia clase: su escena de portada, el patrón, las columnas (con sus objetos en 3D), cada explicación de las
// viñetas con su frase y su voz, los ejemplos, el porqué de hablar de tú o educado y el consejo. De fondo, el koto, bajito.
function apuntes(cuerpo) {
  if (episodio) { apuntesEpisodio(cuerpo); return; }
  const ch = clase.chuleta || {}, vs = [...(clase.intro || []), ...(clase.outro || [])];
  const arte = (v) => (typeof v.escena === 'string' ? fondoManga() + (ESCENAS[v.escena] || ESCENAS.fin)(v.cara) : componer(v.escena || {}));
  const portada = vs.find((v) => v.escena && typeof v.escena === 'object' && (v.escena.cosas || []).length > 1) || vs[0];
  const cols = ch.columnas || (ch.iru ? [{ jp: 'いる', texto: ch.iru, dibujos: ['gato', 'perro'] }, { jp: 'ある', texto: ch.aru, dibujos: ['libro', 'ki'] }] : []);
  const COLORES = ['var(--bien)', 'var(--r1)', 'var(--r0)', 'var(--aviso)'];
  const mini = (ds = []) => `<svg viewBox="-90 -96 180 100" aria-hidden="true">${ds.slice(0, 2).map((d, i) => `<g transform="translate(${ds.length > 1 ? (i ? 44 : -44) : 0} 0) scale(1.3)">${figura(d)}</g>`).join('')}</svg>`;
  const pasos = vs.filter((v) => v.cartela || v.nota);
  const texto = (v) => `${tr(v.cartela)} ${tr(v.nota)}`;
  const deTu = false;   // 30-09 · el recuadro del registro, solo en las clases que tratan de ello (formato 2: «registro»); aquí ya lo explican las cartelas
  const quienEs = (v) => (quien(v) === 'nyan' ? 'ニャン' : HABLA[quien(v)].jp);
  cuerpo.innerHTML = `<article class="ap">
    <header class="ap-portada"><svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMax slice" aria-hidden="true">${DEFS}${arte(portada)}</svg>
      <div class="ap-portada-txt"><small>${t('clase.apuntes.eyebrow', { n: clase.clase })}</small><h1 lang="ja">${ruby(tr(clase.titulo))}</h1>${clase.resumen ? `<p>${ruby(tr(clase.resumen))}</p>` : ''}</div></header>
    ${ch.patron ? `<section class="ap-hoja"><h2><i>1</i>${t('clase.apuntes.idea')}</h2>
      <div class="ap-patron" lang="ja">${ruby(tr(ch.patron))}</div><p class="ap-patron-tr">${ruby(tr(ch.patron_tr))}</p>
      ${cols.length ? `<div class="ap-cols">${cols.map((c, i) => `<div class="ap-col" style="--c:${COLORES[i % 4]}">${mini(c.dibujos)}<div><b lang="ja">${ruby(c.jp || '')}</b><span>${ruby(tr(c.texto))}</span></div></div>`).join('')}</div>` : ''}</section>` : ''}
    ${pasos.length ? `<section class="ap-hoja"><h2><i>2</i>${t('clase.apuntes.paso_a_paso')}</h2>
      ${pasos.map((v) => `<div class="ap-paso"><div class="ap-mini"><svg viewBox="0 0 400 260" aria-hidden="true">${DEFS}${arte(v)}</svg></div>
        <div><div class="ap-frase">${v.voz && voces.has(v.voz) ? `<button class="ap-oir" data-voz="${v.voz}" aria-label="${t('clase.apuntes.oir')}">▶</button>` : ''}
          <div><b class="ap-quien quien-${quien(v)}" lang="ja">${quienEs(v)}</b><span lang="ja">${frase(v.jp)}</span><small>${esc(tr(v.tr))}</small></div></div>
          <p class="ap-nota">${[v.cartela, v.nota].filter(Boolean).map((x) => ruby(tr(x))).join('<br>')}</p></div></div>`).join('')}</section>` : ''}
    ${(ch.filas || []).length ? `<section class="ap-hoja"><h2><i>3</i>${t('clase.apuntes.ejemplos')}</h2>
      <ul class="cl-filas">${ch.filas.map((f) => `<li>${f.registro ? `<em class="cl-reg ${f.registro}">${t('clase.reg.' + f.registro)}</em>` : ''}<span lang="ja">${frase(f.jp)}</span><small>${esc(f[idioma] || f.es)}</small></li>`).join('')}</ul></section>` : ''}
    ${deTu ? `<section class="ap-hoja ap-reg"><svg viewBox="-120 -114 240 124" aria-hidden="true"><g transform="translate(-52 0)">${recorte('gato', 'feliz')}</g><g transform="translate(56 0)">${recorte('sensei')}</g></svg>
      <div><h2>${t('clase.apuntes.reg_tit')}</h2><p>${ruby(t('clase.apuntes.reg_txt'))}</p></div></section>` : ''}
    ${ch.consejo || ch.educado ? `<section class="ap-hoja ap-consejo"><svg viewBox="-60 -114 120 124" aria-hidden="true">${nyan3d({ cara: 'feliz', brazo: 'arriba' })}</svg>
      <div class="ap-boc"><b>${t('clase.apuntes.consejo')}</b>${ruby(tr(ch.consejo || ch.educado))}</div></section>` : ''}
    <div class="ap-acciones"><button class="boton-claro" data-a="mapa">${t('clase.volver')}</button><button class="boton-claro" data-a="frase">${t('clase.apuntes.practicar')}</button>
      <button class="boton-tinta" data-a="intro">${t('clase.apuntes.ver_clase')} ${kbd('Intro')}</button></div>
  </article>`;
  son.papel();
  $$('.ap-oir', cuerpo).forEach((b) => { b.onclick = () => { oir(b.dataset.voz, { forzar: true }); b.animate([{ transform: 'scale(.8)' }, { transform: 'scale(1)' }], { duration: 300, easing: 'cubic-bezier(.34, 1.56, .64, 1)' }); }; });
  $$('[data-a]', cuerpo).forEach((b) => { b.onclick = () => { const a = b.dataset.a; if (a === 'mapa') location.hash = 'gramatica'; else ir(a); }; });
  // entrada: cada hoja sube un poco, una tras otra (Web Animations: sin leer estilos; ver perfil.js)
  entradaApuntes(cuerpo);
  teclas = { intro: () => ir('intro'), oir: () => oir(pasos.find((v) => voces.has(v.voz))?.voz, { forzar: true }) };
}

// los apuntes de un episodio (formato 2): las reglas explicadas en prosa, el guion de la historia para releerlo con voz, los
// ejemplos, el porqué del registro y el consejo
function apuntesEpisodio(cuerpo) {
  const ch = clase.chuleta || {}, M = clase.mision || {}, e = M.escena || (clase.historia || []).find((b) => b.escena)?.escena || {};
  const NOMBRE = { nyan: 'ニャン', tama: 'タマ', sensei: 'フクロ先生', tendero: 'ポン', kage: 'カゲ', kotaro: 'コタロー' };
  const lineas = [...(clase.historia || []), ...(clase.epilogo || [])].flatMap((b) => (b.t === 'elige' ? b.opciones.filter((o) => o.bien).map((o) => ({ habla: b.habla || 'nyan', jp: o.jp, tr: o.tr, voz: o.voz }))
    : !b.t || b.t === 'dice' ? [b] : []));
  const boton = (voz) => (voz && voces.has(voz) ? `<button class="ap-oir" data-voz="${voz}" aria-label="${t('clase.apuntes.oir')}">▶</button>` : '<i class="ap-sin-voz"></i>');
  const deTu = !!clase.registro;   // solo en las clases que hablan de ello
  // «Ponte a prueba»: las preguntas del reto de Kage, para repasar sin jugar la clase entera (se destapan al tocar)
  const pruebas = (clase.reto?.preguntas || []).filter((q) => q.tipo === 'elige' || q.tipo === 'bien_mal').slice(0, 4);
  const prueba = (q) => {
    const ops = q.tipo === 'bien_mal' ? [{ html: `○ ${t('clase.apuntes.bien')}`, ok: q.correcta }, { html: `✕ ${t('clase.apuntes.mal')}`, ok: !q.correcta }]
      : barajar(q.opciones.map((o, k) => ({ html: `<span lang="ja">${frase(o)}</span>`, ok: k === q.bien })));
    return `<div class="ap-prueba"><p class="ap-prueba-jp" lang="ja">${frase(q.jp)}</p><div class="ap-prueba-ops">${ops.map((o) => `<button data-ok="${o.ok ? 1 : 0}">${o.html}</button>`).join('')}</div>
      <p class="ap-prueba-pq" hidden>${q.tr ? `<small>${esc(tr(q.tr))}</small>` : ''}${ruby(tr(q.porque))}</p></div>`;
  };
  cuerpo.innerHTML = `<article class="ap">
    <header class="ap-portada"><svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMax slice" aria-hidden="true">${DEFS}${componer(e)}</svg>
      <div class="ap-portada-txt"><small>${t('clase.apuntes.eyebrow', { n: clase.clase })}</small><h1 lang="ja">${ruby(tr(clase.titulo))}</h1>${clase.resumen ? `<p>${ruby(tr(clase.resumen))}</p>` : ''}</div></header>
    <section class="ap-hoja"><h2><i>1</i>${t('clase.apuntes.reglas')}</h2>
      ${(clase.reglas || []).map((r) => `<div class="ap-regla"><h3 lang="ja">${ruby(tr(r.nombre))}</h3><div class="ep-patron">${episodio.patronHTML(r.patron)}</div>
        <p class="ap-explica">${ruby(tr(r.explica))}</p>
        <ul class="ep-ejemplos">${(r.ejemplos || []).map((ej) => `<li>${boton(ej.voz)}<div><span lang="ja">${frase(ej.jp)}</span><small>${esc(ej[idioma] || ej.es)}</small></div></li>`).join('')}</ul>
        ${r.ojo ? `<p class="ep-ojo"><b>${t('ep.regla.ojo')}</b> ${ruby(tr(r.ojo))}</p>` : ''}</div>`).join('')}</section>
    <section class="ap-hoja"><h2><i>2</i>${t('clase.apuntes.guion')}</h2>
      <ol class="ap-guion">${lineas.map((l) => `<li>${boton(l.voz)}<b class="ap-quien quien-${l.habla || 'nyan'}" lang="ja">${NOMBRE[l.habla || 'nyan'] || ''}</b><div><span lang="ja">${frase(l.jp)}</span><small>${esc(tr(l.tr))}</small></div></li>`).join('')}</ol></section>
    ${(ch.filas || []).length ? `<section class="ap-hoja"><h2><i>3</i>${t('clase.apuntes.ejemplos')}</h2>
      <ul class="cl-filas">${ch.filas.map((f) => `<li>${f.registro ? `<em class="cl-reg ${f.registro}">${t('clase.reg.' + f.registro)}</em>` : ''}<span lang="ja">${frase(f.jp)}</span><small>${esc(f[idioma] || f.es)}</small></li>`).join('')}</ul></section>` : ''}
    ${pruebas.length ? `<section class="ap-hoja"><h2><i>${(ch.filas || []).length ? 4 : 3}</i>${t('clase.apuntes.prueba')}</h2><p class="ap-sub">${t('clase.apuntes.prueba_txt')}</p>
      ${pruebas.map(prueba).join('')}</section>` : ''}
    <section class="ap-hoja ap-guia" hidden><h2><i lang="ja">文</i>${t('clase.apuntes.guia')}</h2><p class="ap-sub">${t('clase.apuntes.guia_txt')}</p><ul class="ap-guia-l"></ul></section>
    ${deTu ? `<section class="ap-hoja ap-reg"><svg viewBox="-120 -114 240 124" aria-hidden="true"><g transform="translate(-52 0)">${recorte('gato', 'feliz', false, 'd')}</g><g transform="translate(56 0)">${recorte('sensei', null, false, 'i')}</g></svg>
      <div><h2>${t('clase.apuntes.reg_tit')}</h2><p>${ruby(t('clase.apuntes.reg_txt'))}</p></div></section>` : ''}
    ${ch.consejo ? `<section class="ap-hoja ap-consejo"><svg viewBox="-60 -114 120 124" aria-hidden="true">${nyan3d({ cara: 'feliz', brazo: 'arriba' })}</svg>
      <div class="ap-boc"><b>${t('clase.apuntes.consejo')}</b>${ruby(tr(ch.consejo))}</div></section>` : ''}
    <div class="ap-acciones"><button class="boton-claro" data-a="mapa">${t('clase.volver')}</button><button class="boton-tinta" data-a="mision">${t('clase.apuntes.ver_clase')} ${kbd('Intro')}</button></div>
  </article>`;
  son.papel();
  $$('.ap-oir', cuerpo).forEach((b) => { b.onclick = () => oir(b.dataset.voz, { forzar: true }); });
  $$('[data-a]', cuerpo).forEach((b) => { b.onclick = () => (b.dataset.a === 'mapa' ? (location.hash = 'gramatica') : ir(b.dataset.a)); });
  $$('.ap-prueba', cuerpo).forEach((p) => $$('button', p).forEach((b) => { b.onclick = () => {
    const ok = b.dataset.ok === '1';
    $$('button', p).forEach((x) => { x.disabled = true; if (x.dataset.ok === '1') x.classList.add('ok'); });
    if (ok) { son.acierto(1); chispas(b, { n: 10 }); } else { b.classList.add('mal'); son.fallo(); }
    $('.ap-prueba-pq', p).hidden = false;
  }; }));
  // la guía de gramática (propia) amplía lo de esta clase: sus lecciones, por los puntos que trabaja
  Promise.all([fetch('clases/indice.json').then((r) => r.json()), api('/api/gramatica')]).then(([ind, lecs]) => {
    const ps = new Set(ind.find((c) => c.id === clase.id)?.puntos || []), sitio = $('.ap-guia', cuerpo);
    const ls = lecs.filter((l) => (l.puntos || []).some((x) => ps.has(x))).sort((x, y) => x.orden - y.orden);
    if (!sitio || !ls.length) return;
    $('.ap-guia-l', sitio).innerHTML = ls.map((l) => `<li><a href="#gramatica/${l.slug}"><b lang="ja">${ruby(l.titulo)}</b><small>${ruby(l.resumen || '')}</small></a></li>`).join('');
    sitio.hidden = false;
  }).catch(() => {});
  entradaApuntes(cuerpo);
  teclas = { intro: () => ir('mision') };
}

// ───────────────────────── teclado ─────────────────────────
addEventListener('keydown', (e) => {
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
  if (!V()?.classList.contains('activa') || capaAbierta() || !teclas) return;
  const k = e.key;
  if (k === 'Enter') { e.preventDefault(); teclas.intro?.(); return; }   // Intro es SIEMPRE «seguir», aunque el foco esté en una pieza
  if (e.repeat) return;
  if (k === 'Backspace') { if (teclas.quitar?.()) e.preventDefault(); return; }
  if (k === 'ArrowLeft' || k === 'ArrowRight') { if (teclas.flecha?.(k === 'ArrowLeft' ? -1 : 1)) e.preventDefault(); return; }
  if (k === 'ArrowDown') { if (teclas.abajo?.()) e.preventDefault(); return; }
  if (/^[1-9]$/.test(k)) { if (teclas.numero?.(+k)) e.preventDefault(); return; }
  const l = k.toLowerCase();
  if (l === 'e') { e.preventDefault(); teclas.oir?.(); return; }
  if (l.length === 1 && teclas.letra?.(l)) e.preventDefault();
});

// La entrada de las hojas de los apuntes: con GSAP y no con el.animate(). En WebKitGTK, al acabar una animación ACELERADA (WAAPI/CSS) de un elemento
// grande se pinta un fotograma sin él (medido el 15-10: la portada de los apuntes, 58 % de la ventana; ver episodio.js · anima).
function entradaApuntes(cuerpo) {
  if (quieto()) return;
  $$('.ap > *', cuerpo).forEach((el, i) => gsap.fromTo(el, { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.52, delay: 0.06 + i * 0.09, ease: MUELLE, clearProps: 'transform,opacity' }));
}

// ───────────────────────── estilos ─────────────────────────
function estilos() {
  if ($('#cl-estilos')) return;
  const s = document.createElement('style');
  s.id = 'cl-estilos';
  s.textContent = `
/* etiquetas: fondo teñido del color y texto del mismo color oscurecido (AA en los cuatro temas) */
.cl-reg, .ap-quien, .cl-nodo-n, .cl-ficha-puntos span, .cl-cap > span, .cl-cap-rotulo > span { background: color-mix(in srgb, var(--c, var(--acento)) 14%, var(--sup)); color: color-mix(in srgb, var(--c, var(--acento)) 50%, var(--tinta)); }
.cl-cab { grid-template-columns: auto minmax(0, 1fr) auto; background: var(--fondo); padding-bottom: 16px; }
.cl-guia-btn { text-decoration: none; white-space: nowrap; } .cl-guia-btn span { color: var(--acento-tinta); font-weight: 800; margin-right: 2px; }
.cl-tit { display: grid; justify-items: center; text-align: center; gap: 4px; min-width: 0; }
.cl-tit small { font: 700 11px/1.2 var(--f-texto); letter-spacing: .1em; text-transform: uppercase; color: var(--tinta-2); }
.cl-tit b { max-width: 100%; font: 700 20px/1.3 var(--f-jp); color: var(--tinta); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
@media (max-width: 1100px) { .cl-tit small { display: none; } .cl-tit b { font-size: 16px; } }
.cl-pasos { display: flex; gap: 8px; }
.cl-pasos button { white-space: nowrap; display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 16px 0 6px; border-radius: var(--radio-btn); border: var(--borde); background: var(--sup); box-shadow: var(--sombra-peq); font: 700 12px/1 var(--f-texto); color: var(--tinta); cursor: pointer; transition: transform .15s var(--suave), background-color .15s var(--suave), color .15s var(--suave); }
.cl-pasos button:hover { background: var(--sup-2); }
.cl-pasos button:active { transform: translateY(2px); }
.cl-pasos button.cerrado:hover { background: var(--sup); }
.cl-pasos button.cerrado:active { transform: none; }
.cl-pasos button:focus-visible { outline: 2px solid var(--acento); outline-offset: 2px; }
.cl-pasos button i { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: var(--sup-3); color: var(--tinta-2); font: 700 12px/1 var(--f-texto); font-style: normal; font-variant-numeric: tabular-nums; }
.cl-pasos button.aqui { background: var(--boton); color: var(--boton-tinta); box-shadow: var(--sombra-btn); }
.cl-pasos button.aqui i { background: var(--boton-tinta); color: var(--boton); }
.cl-pasos button.hecho i { background: color-mix(in srgb, var(--bien) 16%, var(--sup)); color: var(--bien-txt); }
.cl-cuerpo { max-width: 1040px; margin: 0 auto; padding: 0 24px 96px; }
.cl-intro { max-width: 640px; margin: 4px auto 20px; text-align: center; font: 600 16px/1.6 var(--f-texto); color: var(--tinta); text-wrap: balance; }
.cl-acciones { display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; margin: 24px 0 8px; }
/* manga */
.cl-manga { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
/* sin «visibility: visible» explícito: heredaría por encima de la vista oculta y las viñetas se quedarían en pantalla al salir */
.cl-vineta { margin: 0; cursor: pointer; scroll-margin: 132px 0 92px; }
.cl-vineta:not(.mostrada) { visibility: hidden; }
.cl-vineta.ancha { grid-column: 1 / -1; }
.cl-vineta.ancha .cl-arte svg { aspect-ratio: 400 / 180; }
.cl-arte { position: relative; border: var(--borde); border-radius: var(--radio); overflow: hidden; background: #fffdf7; /* arte: el papel del cómic */ box-shadow: var(--sombra); }
.cl-arte svg { display: block; width: 100%; height: auto; }
.cl-num { position: absolute; right: 8px; bottom: 8px; min-width: 24px; padding: 0 8px; border-radius: var(--radio-btn); background: var(--sup); color: var(--tinta-2); font: 700 12px/24px var(--f-texto); text-align: center; font-variant-numeric: tabular-nums; }
.cl-bocadillo { --boc: color-mix(in srgb, var(--aviso) 16%, var(--sup)); --perfil: var(--tinta-2); --c: var(--aviso); position: absolute; left: 3%; top: 4%; max-width: 58%; padding: 8px 16px 12px; background: var(--boc); border: 2px solid var(--perfil); border-radius: 22px; }
.cl-bocadillo.der { left: auto; right: 3%; }
.cl-bocadillo.quien-nyan { --boc: color-mix(in srgb, var(--acento) 14%, var(--sup)); }
.cl-bocadillo.quien-tama { --boc: color-mix(in srgb, var(--r0) 24%, var(--sup)); --c: var(--r0); }
.cl-bocadillo.quien-sensei { --boc: color-mix(in srgb, var(--aviso) 18%, var(--sup)); --c: var(--aviso); }
.cl-bocadillo.quien-tendero { --boc: color-mix(in srgb, var(--bien) 16%, var(--sup)); --c: var(--bien); }
.cl-quien { position: absolute; top: -14px; left: 16px; padding: 0 12px; border-radius: var(--radio-btn); border: 2px solid var(--perfil); font: 800 12px/20px var(--f-jp); color: color-mix(in srgb, var(--c) 50%, var(--tinta)); background: var(--boc); }
.cl-bocadillo::before, .cl-bocadillo::after { content: ''; position: absolute; top: 100%; left: var(--cola, 34%); border-style: solid; }
.cl-bocadillo::before { border-width: 17px 5px 0 13px; border-color: var(--perfil) transparent transparent transparent; margin-top: -1px; }
.cl-bocadillo::after { border-width: 11px 2px 0 8px; border-color: var(--boc) transparent transparent transparent; margin-left: 3.5px; margin-top: -1px; }
.cl-jp { font: 700 clamp(15px, 2.1vw, 21px)/1.5 var(--f-jp); color: var(--tinta); }
.cl-jp rt, .cl-dice-txt rt, .cl-pieza rt, .cl-hueco rt, .cl-carta-jp rt { font-size: .5em; font-weight: 600; }
.cl-tr { font: 600 12.5px/1.4 var(--f-texto); color: var(--tinta-2); margin-top: 4px; }
.cl-vineta figcaption { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.cl-cartela { padding: 8px 12px; background: var(--aviso-suave); border: var(--borde); border-radius: var(--radio-peq); font: 700 14px/1.4 var(--f-texto); color: var(--tinta); }
.cl-nota { padding: 8px 12px; background: var(--sup-2); border: 1.5px dashed var(--linea-2); border-radius: var(--radio-btn); font: 700 13px/1.4 var(--f-texto); color: var(--tinta); }
/* la frase cobra vida */
.cl-encargo { display: flex; align-items: center; gap: 16px; max-width: 560px; margin: 0 auto 16px; padding: 8px 20px 8px 8px; background: var(--sup); border: var(--borde); border-radius: var(--radio); box-shadow: var(--sombra); }
.cl-encargo-img { width: 104px; height: 84px; flex: none; background: #fffdf7; /* arte */ border-radius: var(--radio-peq); }
.cl-encargo small { display: block; font: 700 11px/1.2 var(--f-texto); letter-spacing: .1em; text-transform: uppercase; color: var(--tinta-2); font-variant-numeric: tabular-nums; }
.cl-encargo b { font: 700 18px/1.3 var(--f-texto); color: var(--tinta); text-wrap: balance; }
.cl-escena { max-width: 760px; margin: 0 auto; }
.cl-sala { display: block; width: 100%; height: auto; border: var(--borde); border-radius: var(--radio); box-shadow: var(--sombra); background: #fffdf7; /* arte */ }
.cl-dice { display: flex; align-items: center; gap: 12px; max-width: 760px; margin: 16px auto 0; min-height: 64px; }
.cl-dice-nyan { width: 58px; height: 66px; flex: none; }
.cl-dice-txt { position: relative; flex: 1; margin: 0; padding: 12px 16px; background: var(--sup); border: 2px solid var(--linea-2); border-radius: var(--radio-peq); font: 600 15px/1.5 var(--f-texto); color: var(--tinta); }
.cl-dice-txt::before, .cl-dice-txt::after { content: ''; position: absolute; top: 50%; border-style: solid; }
.cl-dice-txt::before { left: -12px; margin-top: -8px; border-width: 8px 12px 8px 0; border-color: transparent var(--linea-2) transparent transparent; }
.cl-dice-txt::after { left: -9px; margin-top: -6px; border-width: 6px 10px 6px 0; border-color: transparent var(--sup) transparent transparent; }
.cl-dice-txt:empty { visibility: hidden; }
.cl-huecos { display: flex; justify-content: center; gap: 8px; margin: 20px auto 8px; flex-wrap: wrap; }
.cl-hueco { --c: var(--tinta-3); min-width: 72px; height: 64px; padding: 0 12px; border-radius: var(--radio-peq); border: 2px dashed var(--tinta-3); background: var(--sup-2); cursor: pointer; font: 700 22px var(--f-jp); color: var(--tinta); transition: transform .15s var(--suave), background-color .15s var(--suave), border-color .15s var(--suave); }
.cl-hueco:hover { border-color: var(--tinta-2); }
.cl-hueco:focus-visible { outline: 2px solid var(--acento); outline-offset: 2px; }
.cl-hueco[data-tipo="particula"] { min-width: 56px; }
.cl-hueco.lleno { border: var(--borde); background: var(--sup); box-shadow: var(--sombra-peq); }
.cl-hueco.lleno[data-tipo="particula"], .cl-pieza[data-tipo="particula"] { --c: var(--r0); background: color-mix(in srgb, var(--r0) 22%, var(--sup)); }
.cl-hueco.lleno[data-tipo="verbo"], .cl-pieza[data-tipo="verbo"] { --c: var(--r1); background: color-mix(in srgb, var(--r1) 18%, var(--sup)); }
.cl-hueco-etq { font: 700 11px var(--f-texto); letter-spacing: .04em; color: var(--tinta-2); }
.cl-pista { margin: 0 auto 16px; text-align: center; font: 600 13px/1.4 var(--f-jp); color: var(--tinta-2); }
.cl-bandeja { display: flex; justify-content: center; gap: 12px 24px; flex-wrap: wrap; max-width: 900px; margin: 0 auto; }
.cl-grupo small { display: block; margin: 0 0 8px 4px; font: 700 11px/1.2 var(--f-texto); letter-spacing: .1em; text-transform: uppercase; color: var(--tinta-2); }
.cl-grupo > div { display: flex; flex-wrap: wrap; gap: 8px; }
.cl-pieza { display: inline-flex; align-items: center; gap: 8px; height: 56px; padding: 0 12px 0 16px; border-radius: var(--radio-peq); border: var(--borde); box-shadow: var(--sombra-peq); background: var(--sup); cursor: pointer; font: 700 20px var(--f-jp); color: var(--tinta); transition: transform .15s var(--suave), opacity .15s var(--suave), background-color .15s var(--suave); }
.cl-pieza:hover { transform: translateY(-2px); }
.cl-pieza:active { transform: translateY(2px); }
.cl-pieza:focus-visible { outline: 2px solid var(--acento); outline-offset: 2px; }
.cl-pieza.usada { opacity: .36; box-shadow: none; transform: translateY(2px); cursor: default; }
.cl-pieza kbd, .cl-cesta kbd { font-size: 10px; }
/* dos columnas (habitación | encargo y piezas) si cabe; si no, una debajo de otra con el encargo arriba */
.cl-frase-rejilla { display: flex; flex-direction: column; gap: 0; }
.cl-col-mando { display: contents; }
.cl-encargo { order: 0; } .cl-col-escena { order: 1; } .cl-huecos, .cl-pista, .cl-bandeja, .cl-frase .cl-acciones { order: 2; }
@media (min-width: 980px) {
  .cl-frase-rejilla { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(330px, 1fr); gap: 24px; align-items: start; }
  .cl-col-mando { display: block; order: 1; }
  .cl-col-escena { order: 0; position: sticky; top: 100px; }
  .cl-frase .cl-encargo { margin: 0 0 8px; }
  .cl-frase .cl-huecos { justify-content: flex-start; margin-top: 16px; }
  .cl-frase .cl-pista { text-align: left; margin-left: 4px; }
  .cl-frase .cl-bandeja { justify-content: flex-start; gap: 12px 20px; }
  .cl-frase .cl-acciones { justify-content: flex-start; }
  .cl-frase .cl-hueco { min-width: 60px; height: 60px; padding: 0 8px; font-size: 20px; }
  .cl-frase .cl-hueco[data-tipo="particula"] { min-width: 48px; }
}
.cl-acc-manga { position: sticky; bottom: 16px; z-index: 5; }
/* montar (clases escritas como datos) */
.cl-encargo-txt { padding: 12px 20px; }
.cl-bandeja-libre { justify-content: center; gap: 8px; }
.cl-montar .cl-huecos .cl-hueco { min-width: 60px; }
.cl-hueco.mal { border: 2px solid var(--mal); background: color-mix(in srgb, var(--mal) 12%, var(--sup)); box-shadow: none; animation: cl-tiembla .4s var(--suave); }
@keyframes cl-tiembla { 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
.cl-dicho { display: inline-block; margin-top: 4px; font: 800 18px var(--f-jp); }
.cl-dice-txt small { display: block; font: 600 12.5px/1.4 var(--f-texto); color: var(--tinta-2); }
.cl-onomato { font: 800 22px var(--f-jp); fill: #221817; /* arte: onomatopeya del cómic, sobre papel */ paint-order: stroke; stroke: #fffdf7; stroke-width: 5px; }
.cl-blanco { display: inline-block; min-width: 1.6em; padding: 0 .2em; border-bottom: 3px solid var(--linea-2); color: transparent; }
.cl-blanco.lleno { color: var(--bien-txt); border-color: var(--bien); }
.cl-carta.sin-dibujo { padding: 32px 16px 24px; }
.cl-carta.sin-dibujo .cl-carta-jp { font-size: 26px; line-height: 1.6; }
.cl-juego.tres .cl-tablero { grid-template-columns: 1fr; grid-template-areas: "carta" "cestas"; max-width: 640px; }
.cl-juego.tres .cl-carta-sitio { grid-area: carta; min-height: 210px; }
.cl-cestas3 { grid-area: cestas; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.cl-cestas3 .cl-cesta { height: 120px; } .cl-cestas3 .cl-cesta b { font-size: 32px; }
.cl-filas { list-style: none; margin: 16px 0 0; padding: 0; display: grid; gap: 8px; }
.cl-filas li { padding: 8px 16px; border-radius: var(--radio-peq); background: var(--sup-2); }
.cl-filas li span { font: 700 18px/1.5 var(--f-jp); color: var(--tinta); }
.cl-filas li small { display: block; font: 600 13px/1.4 var(--f-texto); color: var(--tinta-2); }
.cl-reg { --c: var(--t-kanji); float: right; margin: 4px 0 0 8px; padding: 0 12px; border-radius: var(--radio-btn); font: 800 11px/20px var(--f-texto); letter-spacing: .04em; font-style: normal; }
.cl-reg.educado { --c: var(--t-conj); } .cl-reg.escrito { --c: var(--t-gram); }
/* camino de clases */
.cl-camino { max-width: 900px; }
.cl-cam-hero { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 24px; margin: 8px auto 28px; padding: 20px 24px; border-radius: var(--radio); background: var(--sup); border: var(--borde); box-shadow: var(--sombra); }
.cl-cam-hero-ny { width: 120px; height: 124px; flex: none; animation: cl-bota 2.4s ease-in-out infinite; }
.cl-cam-hero p { margin: 0 0 8px; font: 700 16px/1.4 var(--f-texto); color: var(--tinta); }
.cl-cam-hero small { font: 700 12px var(--f-texto); color: var(--tinta-2); }
.cl-cam-barra { height: 12px; border-radius: 99px; background: var(--sup-3); overflow: hidden; margin-bottom: 4px; }
.cl-cam-barra i { display: block; height: 100%; background: var(--bien); border-radius: 99px; }
.cl-pista { position: relative; padding: 12px 0 20px; }
.cl-linea { position: absolute; inset: 0; width: 100%; pointer-events: none; overflow: visible; }
.cl-linea path { fill: none; stroke-linecap: round; }
.cl-linea-toda { stroke: var(--linea-2); stroke-width: 14; stroke-dasharray: 2 16; }
.cl-linea-hecha { stroke: var(--bien); stroke-width: 14; }
/* cada capítulo, su color (--cc): salen de los tokens del tema, así en cada tema siguen siendo seis colores distintos */
.cap-1 { --cc: var(--t-vocab); --c: var(--t-vocab); } .cap-2 { --cc: var(--t-conj); --c: var(--t-conj); } .cap-3 { --cc: var(--t-gram); --c: var(--t-gram); }
.cap-4 { --cc: var(--r1); --c: var(--r1); } .cap-5 { --cc: var(--aviso); --c: var(--aviso); } .cap-6 { --cc: var(--r0); --c: var(--r0); }
.cl-cap { position: relative; z-index: 1; display: flex; align-items: baseline; gap: 12px; width: fit-content; margin: 28px auto 20px; padding: 8px 20px; border-radius: var(--radio); background: var(--sup); border: var(--borde); box-shadow: var(--sombra); font: 800 17px var(--f-texto); color: var(--tinta); }
.cl-cap span { font: 800 15px var(--f-jp); padding: 2px 8px; border-radius: 8px; }
.cl-cap small { font: 700 11px var(--f-texto); color: var(--tinta-2); }
.cl-fila { --paso: 84px; position: relative; z-index: 1; display: flex; align-items: center; gap: 16px; width: 540px; max-width: 100%; margin: 0 auto 28px; transform: translateX(calc(var(--x) * var(--paso))); }
.cl-nodo { position: relative; flex: none; width: 118px; height: 118px; border-radius: 50%; border: 4px solid var(--sup); background: var(--sup); box-shadow: var(--sombra); cursor: pointer; padding: 0; display: grid; place-items: center; transition: transform .2s var(--suave); }
.cl-nodo svg { position: relative; width: 98px; height: 102px; margin-top: -8px; overflow: visible; }
/* el medallón: la foto del sitio, desenfocada, dentro del aro del color de su estado (30-09) */
.cl-med-foto { position: absolute; inset: 6px; border-radius: 50%; background: var(--sup-3) center / cover; filter: blur(1.2px) saturate(.95); box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--sup) 60%, transparent); }
.cl-nodo:hover { transform: translateY(-4px) rotate(-3deg); }
.cl-nodo:active { transform: translateY(2px); }
.cl-nodo:focus-visible { outline: 3px solid var(--acento); outline-offset: 4px; }
.cl-nodo-n { position: absolute; left: -6px; bottom: -4px; min-width: 32px; height: 32px; padding: 0 8px; border-radius: 99px; border: 3px solid var(--sup); font: 800 15px/26px var(--f-texto); font-variant-numeric: tabular-nums; }
.cl-sello { position: absolute; right: -8px; top: -8px; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; background: var(--mal); color: var(--tinta-inv); font: 800 20px var(--f-jp); border: 3px solid var(--sup); transform: rotate(12deg); }
.cl-estrellas { position: absolute; top: -26px; left: 50%; transform: translateX(-50%); font-size: 19px; letter-spacing: 1px; color: color-mix(in srgb, var(--aviso) 65%, var(--tinta)); /* ≥ 4,5:1 en los cuatro temas */ text-shadow: 0 1.5px 0 color-mix(in srgb, var(--aviso) 40%, var(--tinta)); white-space: nowrap; }
.cl-nodo-txt { display: grid; gap: 4px; min-width: 0; padding: 10px 14px; border-radius: var(--radio-peq); background: color-mix(in srgb, var(--sup) 94%, transparent); border: 1px solid var(--linea); }
.cl-nodo-txt b { font: 700 16px/1.35 var(--f-jp); color: var(--tinta); }
.cl-nodo-txt small { font: 700 11.5px/1.3 var(--f-texto); color: var(--tinta-2); }
/* estados del nodo: hecha (aro del color del capítulo), toca (aro + latido), lista, luego (más tenue) y pronto (a trazos) */
.e-hecha .cl-nodo, .e-toca .cl-nodo { border-color: var(--cc, var(--bien)); }
.e-hecha .cl-nodo-txt small, .e-toca .cl-nodo-txt small { color: color-mix(in srgb, var(--cc, var(--bien)) 55%, var(--tinta)); }
.e-toca .cl-nodo { animation: cl-latido 1.6s ease-in-out infinite; }
.e-toca .cl-nodo-txt { background: color-mix(in srgb, var(--cc, var(--acento)) 12%, var(--sup)); border-color: color-mix(in srgb, var(--cc, var(--acento)) 40%, var(--linea)); }
.e-lista .cl-nodo { border-color: color-mix(in srgb, var(--cc, var(--linea-2)) 45%, var(--sup)); }
.e-luego .cl-nodo { background: var(--sup-2); border-color: var(--sup-2); } .e-luego .cl-med-foto { filter: blur(1.4px) saturate(.55) brightness(1.04); }
.e-pronto .cl-nodo { background: var(--sup-2); border: 2px dashed var(--linea-2); box-shadow: none; } .e-pronto .cl-nodo svg { filter: grayscale(.7); }
.cl-cap[class*="cap-"] { border-top: 4px solid var(--cc); }
.cl-cap[class*="cap-"] span { border: 0; }
.cl-fila[class*="cap-"] .cl-nodo-n { --c: var(--cc); }
.cl-cam-nyan { position: absolute; right: calc(100% - 4px); bottom: 8px; width: 84px; animation: cl-bota 1.8s ease-in-out infinite; pointer-events: none; }
.cl-cam-nyan svg { width: 84px; height: 92px; }
.cl-cam-bocadillo { position: absolute; bottom: 100%; right: -8px; white-space: nowrap; padding: 4px 12px; border-radius: var(--radio-peq); background: var(--sup); border: 1.5px solid var(--linea-2); font: 800 12px var(--f-texto); color: var(--tinta); transform: rotate(-4deg); }
@keyframes cl-latido { 0%, 100% { box-shadow: var(--sombra), 0 0 0 0 color-mix(in srgb, var(--cc, var(--acento)) 55%, transparent); } 50% { box-shadow: var(--sombra), 0 0 0 14px transparent; } }
@keyframes cl-bota { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
.cl-ficha-capa { position: fixed; inset: 0; z-index: 60; display: grid; place-items: center; padding: 16px; background: var(--velo); }
.cl-ficha { position: relative; width: min(460px, 100%); padding: 28px 24px 20px; border-radius: var(--radio); background: var(--sup); border: var(--borde); box-shadow: var(--sombra-flotante); text-align: center; color: var(--tinta); }
.cl-ficha-fig { width: 112px; height: 116px; margin: -72px auto 0; display: block; padding: 8px; border-radius: 50%; background: var(--sup-3); border: 4px solid var(--sup); box-shadow: var(--sombra-peq); }
.cl-ficha.e-hecha .cl-ficha-fig { background: var(--bien-suave); } .cl-ficha.e-toca .cl-ficha-fig { background: var(--acento-suave); }
.cl-ficha-ante { display: block; margin-top: 12px; font: 700 12px var(--f-texto); letter-spacing: .08em; color: var(--tinta-2); }
.cl-ficha h2 { margin: 4px 0 8px; font: 800 21px/1.35 var(--f-jp); text-wrap: balance; }
.cl-ficha p { margin: 0 0 12px; font: 600 14.5px/1.5 var(--f-texto); }
.cl-ficha-puntos { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin: 4px 0 12px; }
.cl-ficha-puntos span { --c: var(--r0); padding: 4px 12px; border-radius: var(--radio-btn); font: 700 14px var(--f-jp); }
.cl-ficha-estado { font: 700 13px var(--f-texto) !important; color: var(--tinta-2); }
.cl-guia { text-align: center; margin: 28px 0 0; } .cl-guia a { font: 700 14px var(--f-texto); color: var(--tinta-2); }
.cl-guia a:hover { color: var(--tinta); } .cl-guia a:focus-visible { outline: 2px solid var(--acento); outline-offset: 4px; border-radius: 4px; }
/* 30-09 · el camino, más grande: carteles de capítulo con su escena pintada, nodos grandes y lo que falta para abrir cada clase */
.cl-cam-hero-txt { display: grid; gap: 8px; min-width: 0; }
.cl-cam-hero-txt b { font: var(--peso-titulo) 24px/1.25 var(--f-titulo); color: var(--tinta); text-wrap: balance; }
.cl-cam-hero-txt > small:first-child { font: 700 12px var(--f-texto); letter-spacing: .12em; text-transform: uppercase; color: var(--acento-tinta); }
.cl-cam-caps { display: flex; gap: 6px; }
.cl-cam-caps span { flex: 1; height: 12px; border-radius: 99px; background: color-mix(in srgb, var(--cc) 20%, var(--sup-3)); overflow: hidden; }
.cl-cam-caps i { display: block; height: 100%; border-radius: 99px; background: var(--cc); }
.cl-cam-ir { height: 64px; }
.cl-cap[class*="cap-"] { display: block; width: min(640px, 100%); margin: 44px auto 28px; padding: 0; border-radius: var(--radio); overflow: hidden; }
.cl-cap[class*="cap-"] .cl-cap-escena { display: block; height: auto; aspect-ratio: 4 / 1; padding: 0; border: 0; border-radius: 0; background-color: var(--sup-3); background-size: cover; background-position: center; filter: var(--escena-filtro); }
.cl-cap[class*="cap-"] .cl-cap-rotulo { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 12px; padding: 12px 20px 16px; border: 0; border-radius: 0; background: var(--sup); font: var(--peso-titulo) 20px/1.25 var(--f-titulo); color: var(--tinta); text-shadow: none; }
.cl-cap[class*="cap-"] .cl-cap-rotulo > span { font: 800 16px var(--f-jp); padding: 2px 12px; border-radius: var(--radio-btn); }
.cl-cap[class*="cap-"] .cl-cap-rotulo small { flex-basis: 100%; font: 700 12px/1.3 var(--f-texto); color: var(--tinta-2); }
.cl-nodo-txt { padding: 10px 14px; border-radius: var(--radio-peq); }
.cl-falta { display: block; height: 8px; margin-top: 4px; border-radius: 99px; background: var(--sup-3); overflow: hidden; }
.cl-falta i { display: block; height: 100%; border-radius: 99px; background: color-mix(in srgb, var(--cc, var(--acento)) 75%, var(--sup)); }
@media (max-width: 760px) { .cl-cam-hero { grid-template-columns: auto 1fr; } .cl-cam-ir { grid-column: 1 / -1; } }
@media (max-width: 620px) {
  .cl-fila { --paso: 26px; width: 330px; gap: 12px; }
  .cl-nodo { width: 72px; height: 72px; } .cl-nodo svg { width: 52px; height: 54px; }
  .cl-nodo-txt b { font-size: 13.5px; }
  .cl-cam-nyan { display: none; }
  .cl-cam-hero-ny { width: 72px; height: 76px; }
}
/* minijuego */
.cl-marcador { display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 16px; }
.cl-puntos { display: flex; gap: 8px; }
.cl-puntos i { width: 14px; height: 14px; border-radius: 50%; border: 2px solid var(--linea-2); background: var(--sup); transition: transform .2s var(--muelle), background-color .2s var(--suave); }
.cl-puntos i.ahora { background: var(--aviso-suave); border-color: var(--aviso); transform: scale(1.25); }
.cl-puntos i.bien { background: var(--bien); border-color: var(--bien); }
.cl-puntos i.mal { background: var(--mal); border-color: var(--mal); }
.cl-racha { min-width: 90px; font: 800 14px var(--f-texto); font-variant-numeric: tabular-nums; color: var(--mal-txt); }
.cl-tablero { display: grid; grid-template-columns: 1fr minmax(210px, 260px) 1fr; gap: 20px; align-items: center; max-width: 820px; margin: 0 auto; }
.cl-cesta { --c: var(--bien); display: grid; justify-items: center; align-content: center; gap: 4px; height: 168px; border-radius: var(--radio); border: var(--borde); box-shadow: var(--sombra); cursor: pointer; color: var(--tinta); background: color-mix(in srgb, var(--c) 16%, var(--sup)); transition: transform .15s var(--suave); }
.cl-cesta[data-v="iru"] { --c: var(--bien); }
.cl-cesta[data-v="aru"] { --c: var(--r1); }
.cl-cestas3 .cl-cesta:nth-child(1) { --c: var(--bien); } .cl-cestas3 .cl-cesta:nth-child(2) { --c: var(--r1); } .cl-cestas3 .cl-cesta:nth-child(3) { --c: var(--r0); }
.cl-cesta:hover { transform: translateY(-2px); }
.cl-cesta:focus-visible { outline: 3px solid var(--acento); outline-offset: 3px; }
.cl-cesta b { font: 800 44px/1.1 var(--f-jp); }
.cl-cesta small { font: 700 13px var(--f-texto); color: var(--tinta-2); }
.cl-cesta:active { transform: translateY(2px); }
.cl-carta-sitio { min-height: 250px; display: grid; place-items: center; }
.cl-carta { width: 100%; padding: 16px 16px 12px; background: var(--sup); border: var(--borde); border-radius: var(--radio); box-shadow: var(--sombra); text-align: center; }
.cl-carta svg { width: 130px; height: 136px; }
/* 30-09 · la carta del minijuego: el objeto en 3D, de pie en el sitio de la clase (su foto), como en un escenario */
.cl-carta-escena { display: grid; place-items: end center; height: 176px; margin: -16px -16px 12px; border-radius: var(--radio) var(--radio) 0 0; background: var(--sup-3) center 72% / cover; box-shadow: inset 0 -30px 40px -30px rgba(40, 25, 10, .35); /* arte */ filter: var(--escena-filtro); }
.cl-carta-escena svg { width: 158px; height: 160px; margin-bottom: -4px; filter: drop-shadow(0 8px 7px rgba(30, 15, 0, .38)); /* arte */ }
.cl-carta-jp { font: 800 30px/1.4 var(--f-jp); color: var(--tinta); }
.cl-carta small { font: 600 13px/1.4 var(--f-texto); color: var(--tinta-2); }
.cl-carta-fin b { font: 800 44px var(--f-texto); font-variant-numeric: tabular-nums; color: var(--tinta); }
/* chuleta */
.cl-chuleta { max-width: 760px; margin: 36px auto 0; padding: 24px 28px 16px; background: var(--sup); border: var(--borde); border-radius: var(--radio); box-shadow: var(--sombra); }
.cl-chuleta h2 { margin: 0 0 12px; text-align: center; font: var(--peso-titulo) 22px/1.3 var(--f-titulo); color: var(--tinta); text-wrap: balance; }
.cl-patron { text-align: center; font: 800 clamp(20px, 3.4vw, 30px)/1.5 var(--f-jp); color: var(--tinta); }
.cl-patron-tr { margin: 4px 0 16px; text-align: center; font: 600 14px/1.5 var(--f-texto); color: var(--tinta-2); }
.cl-dos { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.cl-col { padding: 12px 16px 8px; border-radius: var(--radio-peq); text-align: center; background: color-mix(in srgb, var(--c, var(--bien)) 14%, var(--sup)); }
.cl-col b { font: 800 30px/1.4 var(--f-jp); color: var(--tinta); }
.cl-col p { margin: 2px 0 8px; font: 600 14px/1.4 var(--f-texto); color: var(--tinta); }
.cl-col svg { width: 100%; max-width: 200px; height: auto; }
.cl-educado { margin: 16px 0 0; text-align: center; font: 600 14px/1.5 var(--f-texto); color: var(--tinta); }
.cl-resultado { display: flex; justify-content: center; gap: 8px; flex-wrap: wrap; margin-top: 16px; }
.cl-resultado span { padding: 4px 16px; border-radius: var(--radio-btn); background: var(--sup-2); font: 700 13px/24px var(--f-texto); font-variant-numeric: tabular-nums; color: var(--tinta); }
/* entrada desde gramática */
.cl-banner { display: flex; align-items: center; gap: 16px; margin: 0 0 24px; padding: 12px 20px 12px 12px; border-radius: var(--radio); border: var(--borde); box-shadow: var(--sombra); background: var(--sup); color: var(--tinta); text-decoration: none; transition: transform .15s var(--suave); }
.cl-banner:hover { transform: translateY(-2px); }
.cl-banner:focus-visible { outline: 3px solid var(--acento); outline-offset: 3px; }
.cl-banner-ny { width: 72px; height: 76px; flex: none; }
.cl-banner-txt { flex: 1; display: grid; gap: 4px; }
.cl-banner small { font: 700 11px var(--f-texto); letter-spacing: .1em; text-transform: uppercase; color: var(--tinta-2); }
.cl-banner b { font: 800 19px/1.3 var(--f-jp); }
.cl-banner em { font: 600 13px/1.4 var(--f-texto); font-style: normal; color: var(--tinta-2); }
.cl-banner-ir { flex: none; padding: 0 16px; line-height: 40px; border-radius: var(--radio-btn); background: var(--acento-suave); color: var(--acento-tinta); font: 800 14px var(--f-texto); }
@media (max-width: 760px) {
  .cl-cab { grid-template-columns: auto 1fr; gap: 10px 16px; padding: 12px 16px 12px; }
  .cl-tit small { display: none; }
  .cl-tit b { font-size: 16px; }
  .cl-frase > .cl-intro { display: none; }
  .cl-encargo { padding: 6px 12px 6px 6px; gap: 12px; }
  .cl-encargo-img { width: 76px; height: 64px; }
  .cl-encargo b { font-size: 15px; }
  .cl-pasos { grid-column: 1 / -1; justify-content: center; }
  .cl-pasos button span { display: none; }
  .cl-pasos button { padding: 0 6px; }
  .cl-pasos button.aqui span { display: inline; }
  .cl-pasos button.aqui { padding-right: 12px; }
  .cl-cuerpo { padding: 0 16px 72px; }
  .cl-manga { grid-template-columns: 1fr; max-width: 560px; margin: 0 auto; }
  .cl-bocadillo { max-width: 66%; padding: 6px 12px 10px; }
  .cl-tablero { grid-template-columns: 1fr 1fr; grid-template-areas: "carta carta" "iru aru"; }
  .cl-carta-sitio { grid-area: carta; min-height: 220px; }
  .cl-cesta[data-v="iru"] { grid-area: iru; } .cl-cesta[data-v="aru"] { grid-area: aru; }
  .cl-cesta { height: 120px; } .cl-cesta b { font-size: 32px; }
  .cl-pieza { height: 48px; font-size: 18px; padding: 0 8px 0 12px; }
  .cl-pieza kbd, .cl-cesta kbd { display: none; }
  .cl-hueco { min-width: 56px; height: 56px; font-size: 19px; padding: 0 8px; }
  .cl-banner-ir { display: none; }
}
@media (max-width: 460px) { .cl-dos { grid-template-columns: 1fr; } .cl-bandeja { justify-content: flex-start; } }
/* móvil: la cabecera en dos filas (volver + fases arriba, el título debajo) sin salirse nunca de lado */
@media (max-width: 760px) {
  .cl-cab { grid-template-columns: auto minmax(0, 1fr); }
  .cl-tit { grid-column: 1 / -1; grid-row: 2; min-width: 0; }
  .cl-pasos { grid-column: 2; grid-row: 1; justify-content: flex-end; min-width: 0; overflow-x: auto; scrollbar-width: none; }
}
@media (max-width: 480px) {
  .cl-cab .volver kbd { display: none; }
  .cl-pasos { gap: 4px; }
  .cl-pasos button.aqui span { display: none; }
  .cl-pasos button, .cl-pasos button.aqui { padding: 0 6px; }
}
/* 30-09 · los apuntes de cada clase: portada con su escena, hojas de papel, las frases con su voz y el porqué del registro */
.cl-paso-apuntes { margin-left: 4px; }
.cl-paso-apuntes i { background: var(--acento-suave) !important; color: var(--acento-tinta) !important; font-style: normal; }
.cl-pasos .cl-paso-apuntes.aqui i { background: var(--boton-tinta) !important; color: var(--boton) !important; }
.ap { max-width: 920px; margin: 0 auto; display: grid; gap: 24px; padding-bottom: 20px; }
.ap-portada { position: relative; margin: 0; border-radius: var(--radio); overflow: hidden; background: #2a1d12; /* arte */ box-shadow: var(--sombra); }
.ap-portada svg { display: block; width: 100%; height: auto; aspect-ratio: 400 / 175; }
.ap-portada-txt { position: absolute; left: 0; right: 0; bottom: 0; padding: 72px 32px 24px; background: linear-gradient(rgba(20, 14, 8, 0), rgba(20, 14, 8, .84)); color: #fffaf0; /* sobre la escena: el texto siempre claro sobre el velo oscuro */ }
.ap-portada-txt small { font: 800 12px var(--f-texto); letter-spacing: .14em; text-transform: uppercase; color: #ffd9a8; /* sobre la escena */ }
.ap-portada-txt h1 { margin: 4px 0 8px; font: var(--peso-titulo) clamp(26px, 3.4vw, 40px)/1.2 var(--f-titulo); text-shadow: 0 2px 8px rgba(0, 0, 0, .35); text-wrap: balance; }
.ap-portada-txt h1 rt { font-size: .38em; }
.ap-portada-txt p { margin: 0; max-width: 740px; font: 600 15px/1.6 var(--f-texto); color: #fdf0dc; /* sobre la escena */ }
.ap-hoja { position: relative; background: var(--sup); border: var(--borde); border-radius: var(--radio); padding: 28px 32px; box-shadow: var(--sombra); }
.ap h2 { display: flex; align-items: center; gap: 12px; margin: 0 0 16px; font: var(--peso-titulo) 23px/1.25 var(--f-titulo); color: var(--tinta); text-wrap: balance; }
.ap h2 i { flex: none; width: 36px; height: 36px; display: grid; place-items: center; border-radius: 50%; background: var(--boton); color: var(--boton-tinta); font: 800 16px var(--f-jp); font-style: normal; }
.ap-patron { font: 700 clamp(21px, 2.5vw, 29px)/1.95 var(--f-jp); color: var(--tinta); text-align: center; }
.ap-patron-tr { margin: 4px 0 0; text-align: center; font: 600 15px/1.5 var(--f-texto); color: var(--tinta-2); }
.ap-cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-top: 20px; }
.ap-col { display: grid; grid-template-columns: 104px 1fr; align-items: center; gap: 12px; padding: 12px 16px; border-radius: var(--radio-peq); background: color-mix(in srgb, var(--c) 14%, var(--sup)); }
.ap-col svg { width: 104px; height: 64px; overflow: visible; }
.ap-col b { display: block; font: 700 23px/1.6 var(--f-jp); color: var(--tinta); }
.ap-col span { display: block; font: 600 13.5px/1.5 var(--f-texto); color: var(--tinta-2); }
.ap-paso { display: grid; grid-template-columns: 230px minmax(0, 1fr); gap: 20px; align-items: center; padding: 16px 0; border-top: 1px solid var(--linea); }
.ap-paso:first-of-type { border-top: 0; padding-top: 4px; }
.ap-mini { border-radius: var(--radio-peq); overflow: hidden; box-shadow: var(--sombra-peq); }
.ap-mini svg { display: block; width: 100%; height: auto; }
.ap-frase { display: flex; align-items: flex-start; gap: 12px; }
.ap-frase > div { min-width: 0; }
.ap-frase span { font: 700 19px/1.85 var(--f-jp); color: var(--tinta); }
.ap-frase small { display: block; font: 600 13.5px/1.4 var(--f-texto); color: var(--tinta-2); }
.ap-quien { --c: var(--tinta-2); display: inline-block; margin-right: 8px; padding: 0 12px; border-radius: var(--radio-btn); font: 800 11.5px/20px var(--f-jp); vertical-align: 3px; }
.ap-quien.quien-nyan { --c: var(--acento); } .ap-quien.quien-tama { --c: var(--r0); } .ap-quien.quien-sensei { --c: var(--aviso); } .ap-quien.quien-tendero { --c: var(--bien); }
.ap-oir { flex: none; width: 40px; height: 40px; margin-top: 4px; border-radius: 50%; border: 0; background: var(--boton); color: var(--boton-tinta); font-size: 15px; box-shadow: var(--sombra-btn); cursor: pointer; transition: transform .15s var(--suave); }
.ap-oir:hover { transform: translateY(-1px); } .ap-oir:active { transform: translateY(2px); }
.ap-oir:focus-visible { outline: 2px solid var(--acento); outline-offset: 3px; }
.ap-nota { margin: 12px 0 0; padding: 12px 16px; border-radius: var(--radio-peq); background: var(--aviso-suave); font: 700 14.5px/1.6 var(--f-texto); color: var(--tinta); }
.ap-nota rt { font-size: .55em; }
.ap-reg { display: grid; grid-template-columns: 190px 1fr; gap: 20px; align-items: center; background: color-mix(in srgb, var(--r0) 10%, var(--sup)); }
.ap-reg svg { width: 190px; height: 104px; overflow: visible; }
.ap-reg h2 { margin-bottom: 8px; }
.ap-reg p { margin: 0; font: 600 15px/1.6 var(--f-texto); color: var(--tinta); }
.ap-sub { margin: -4px 0 12px; color: var(--tinta-2); font-size: 15px; }
.ap-prueba { padding: 16px 0; border-top: 1px solid var(--linea); }
.ap-prueba:first-of-type { border-top: 0; }
.ap-prueba-jp { margin: 0 0 8px; font: 700 22px/1.8 var(--f-jp); }
.ap-prueba-ops { display: flex; flex-wrap: wrap; gap: 8px; }
.ap-prueba-ops button { border: var(--borde); border-radius: var(--radio-peq); min-height: 40px; padding: 4px 16px; background: var(--sup-2); box-shadow: var(--sombra-peq); font: 700 17px/1.6 var(--f-jp); color: var(--tinta); cursor: pointer; transition: transform .15s var(--suave), background-color .15s var(--suave); }
.ap-prueba-ops button:hover:not(:disabled) { background: var(--sup-3); }
.ap-prueba-ops button:active:not(:disabled) { transform: translateY(2px); }
.ap-prueba-ops button:focus-visible { outline: 2px solid var(--acento); outline-offset: 2px; }
.ap-prueba-ops button:disabled { cursor: default; }
.ap-prueba-ops button.ok { background: var(--bien-suave); color: var(--tinta); box-shadow: inset 0 0 0 2px var(--bien); }
.ap-prueba-ops button.mal { background: var(--mal-suave); color: var(--tinta); box-shadow: inset 0 0 0 2px var(--mal); }
.ap-prueba-pq { margin: 12px 0 0; font-size: 15px; line-height: 1.6; }
.ap-prueba-pq small { display: block; color: var(--tinta-2); }
.ap-guia-l { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.ap-guia-l a { display: block; padding: 12px 16px; border-radius: var(--radio-peq); background: var(--sup-2); color: inherit; text-decoration: none; transition: background-color .15s var(--suave); }
.ap-guia-l a:hover { background: var(--sup-3); }
.ap-guia-l a:focus-visible { outline: 2px solid var(--acento); outline-offset: 2px; }
.ap-guia-l small { display: block; margin-top: 4px; color: var(--tinta-2); font-size: 14px; }
.ap-consejo { display: grid; grid-template-columns: 110px 1fr; gap: 16px; align-items: center; background: var(--aviso-suave); }
.ap-consejo svg { width: 110px; height: 116px; }
.ap-boc { position: relative; padding: 16px 20px; border-radius: var(--radio); background: var(--sup); border: 1.5px solid var(--linea-2); font: 600 15px/1.6 var(--f-texto); color: var(--tinta); }
.ap-boc b { display: block; margin-bottom: 4px; font: var(--peso-titulo) 17px var(--f-titulo); color: var(--acento-tinta); }
.ap-boc::before { content: ""; position: absolute; left: -12px; top: 42%; border: 8px solid transparent; border-right-color: var(--linea-2); border-left: 0; }
.ap-regla { padding: 4px 0 20px; border-bottom: 1px solid var(--linea); margin-bottom: 20px; } .ap-regla:last-child { border: 0; margin: 0; padding-bottom: 0; }
.ap-regla h3 { margin: 0 0 12px; font: var(--peso-titulo) 21px/1.3 var(--f-titulo); color: var(--acento-tinta); } .ap-regla h3 rt { font-size: .45em; }
.ap-explica { margin: 0 0 12px; font: 600 16px/1.7 var(--f-texto); color: var(--tinta); } .ap-explica rt { font-size: .55em; }
.ap-guion { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
.ap-guion li { display: grid; grid-template-columns: 40px auto 1fr; align-items: center; gap: 12px; padding: 4px 12px; border-radius: var(--radio-peq); }
.ap-guion li:nth-child(odd) { background: var(--sup-2); }
.ap-guion span { font: 700 17px/1.8 var(--f-jp); color: var(--tinta); } .ap-guion small { display: block; font: 600 12.5px/1.4 var(--f-texto); color: var(--tinta-2); }
.ap-sin-voz { width: 40px; }
.ap-acciones { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; margin: 4px 0 32px; }
@media (max-width: 720px) {
  .ap-paso { grid-template-columns: 1fr; }
  .ap-hoja { padding: 20px 16px; }
  .ap-reg { grid-template-columns: 1fr; } .ap-reg svg { margin: 0 auto; }
  .ap-portada-txt { padding: 48px 16px 16px; }
}
/* 30-09 · el mapa de mundos: cada capítulo, una región con su foto; entre una y otra, las fotos se funden */
#v-gramatica:has(.cl-mapa) { background: var(--fondo-2); }
#v-gramatica:has(.cl-mapa)::before, #v-gramatica:has(.cl-mapa)::after { display: none; }
#v-gramatica:has(.cl-mapa) .cab-papel { background: linear-gradient(color-mix(in srgb, var(--fondo) 95%, transparent) 60%, transparent); }
.cl-cuerpo.cl-mapa { max-width: none; padding: 0; }
.cl-mapa .cl-pista { isolation: isolate; padding: 0; }
.cl-mapa .cl-linea { z-index: 2; }
.mp-mundo { position: relative; padding: 0 16px 20px; }
/* la foto del mundo se queda quieta, como un telón, mientras el mapa pasa por encima; entre mundo y mundo, una franja de bruma */
.mp-fondo { position: sticky; top: 0; z-index: 0; height: 100vh; margin: 0 -16px -100vh; background: var(--fondo-2) var(--foto) 50% 62% / cover; filter: var(--escena-filtro); pointer-events: none; }
.mp-fondo::after { content: ""; position: absolute; inset: 0; background: var(--escena-velo); }
.mp-mundo + .mp-mundo::before { content: ""; position: absolute; left: 0; right: 0; top: -120px; z-index: 1; height: 240px; pointer-events: none;
  background: linear-gradient(transparent, color-mix(in srgb, var(--fondo-2) 94%, transparent) 50%, transparent); }
.mp-mundo > .cl-cam-hero { margin-top: 0; }
.mp-mundo > :nth-child(2) { margin-top: 32px; }
.cl-mapa .cl-cam-hero { position: relative; z-index: 3; width: min(900px, 100%); margin: 4px auto 32px; background: color-mix(in srgb, var(--sup) 96%, transparent); }
/* el cartel de cada mundo: una postal clavada en el mapa */
.cl-mapa .cl-cap[class*="cap-"] { position: relative; z-index: 3; width: min(600px, 100%); margin: 8px auto 8px; padding: 8px 8px 0; background: var(--sup); border-radius: var(--radio); transform: rotate(-1.2deg); }
.mp-mundo:nth-child(odd) .cl-cap[class*="cap-"] { transform: rotate(1.1deg); }
.cl-mapa .cl-cap[class*="cap-"] .cl-cap-escena { border-radius: var(--radio-peq) var(--radio-peq) 0 0; }
.cl-mapa .cl-cap[class*="cap-"] .cl-cap-rotulo { margin: 8px -8px 0; }
/* el tablero: cada parada es un punto (0×0) y lo demás se coloca alrededor */
.mp-tablero { position: relative; z-index: 4; max-width: 1000px; height: var(--h3); margin: 0 auto; }
.mp-parada, .mp-giro { position: absolute; left: calc(var(--x3) * 1%); top: calc(var(--y3) * 1px); width: 0; height: 0; }
.mp-giro { visibility: hidden; } .mp-giro.g2 { display: none; }
.mp-parada .cl-nodo { position: absolute; left: -68px; top: -68px; width: 136px; height: 136px; border: 5px solid var(--sup); box-shadow: var(--sombra); }
.mp-parada .cl-med-foto { inset: 8px; }
.mp-parada .cl-nodo svg { width: 114px; height: 118px; margin-top: -10px; }
.mp-parada.e-hecha .cl-nodo, .mp-parada.e-toca .cl-nodo { border-color: var(--cc); }
.mp-parada.e-lista .cl-nodo { border-color: color-mix(in srgb, var(--cc) 45%, var(--sup)); }
.mp-parada.e-luego .cl-nodo { border-color: var(--sup-2); }
.mp-parada.e-pronto .cl-nodo { border: 3px dashed var(--linea-2); box-shadow: none; }
.mp-parada[class*="cap-"] .cl-nodo-n { left: -6px; bottom: 0; min-width: 40px; height: 40px; font-size: 17px; line-height: 34px; border: 3px solid var(--sup); }
.mp-parada .cl-sello { right: -6px; top: -4px; width: 44px; height: 44px; font-size: 22px; }
.cl-candado { position: absolute; right: -6px; top: -4px; width: 40px; height: 40px; display: grid; place-items: center; border-radius: 50%; background: var(--sup); color: var(--tinta-2); border: 2px solid var(--linea-2); rotate: -8deg; z-index: 2; }
.cl-nodo .cl-candado svg, .mp-parada .cl-nodo .cl-candado svg { position: static; width: 22px; height: 22px; margin: 0; filter: none; }
.mp-parada.e-pronto .cl-med-foto, .mp-parada.e-pronto .cl-nodo > svg { filter: saturate(.45) brightness(1.04); }
.e-pronto .cl-nodo-txt small { color: var(--tinta-2); font-weight: 800; letter-spacing: .04em; }
.mp-parada .cl-estrellas { top: -32px; font-size: 23px; text-shadow: 0 2px 0 color-mix(in srgb, var(--aviso) 40%, var(--tinta)); }
.mp-parada .cl-nodo-txt { position: absolute; left: -112px; top: 84px; width: 224px; justify-items: center; text-align: center; padding: 8px 12px 12px; border: 0; border-radius: var(--radio-peq); background: color-mix(in srgb, var(--sup) 96%, transparent); box-shadow: var(--sombra); }
.mp-parada .cl-nodo-txt b { font-size: 14.5px; line-height: 1.3; }
.mp-parada .cl-falta { width: 100%; }
.mp-parada.e-toca .cl-nodo-txt { background: color-mix(in srgb, var(--cc) 12%, var(--sup)); }
.mp-parada .cl-cam-nyan { right: 56px; bottom: -14px; width: 92px; }
.mp-parada .cl-cam-nyan svg { width: 92px; height: 100px; }
/* la última de cada mundo: más grande y con su bandera de meta */
.mp-meta .cl-nodo { left: -80px; top: -80px; width: 160px; height: 160px; }
.mp-meta .cl-nodo svg { width: 134px; height: 138px; }
.mp-meta .cl-nodo-txt { top: 98px; }
.mp-meta .cl-estrellas { top: -34px; }
.mp-meta .cl-cam-nyan { right: auto; left: 70px; }   /* en la última, la bandera ya ocupa su izquierda */
.mp-bandera { position: absolute; left: -112px; top: -100px; z-index: 1; width: 58px; height: 84px; overflow: visible; pointer-events: none; filter: drop-shadow(0 4px 3px rgba(20, 12, 0, .35)); /* arte */ }
.mp-tela { fill: var(--cc); stroke: color-mix(in srgb, var(--cc) 55%, var(--tinta)); stroke-width: 2.5; stroke-linejoin: round; transform-origin: 9px 22px; animation: mp-ondea 2.4s ease-in-out infinite; }
.mp-meta.e-hecha .mp-tela { fill: var(--aviso); stroke: color-mix(in srgb, var(--aviso) 55%, var(--tinta)); }
@keyframes mp-ondea { 0%, 100% { transform: skewY(0) scaleX(1); } 50% { transform: skewY(-5deg) scaleX(.93); } }
/* el sendero: tierra clara con borde, los puntos de lo que falta y lo recorrido en verde */
.cl-mapa .cl-linea-borde { stroke: color-mix(in srgb, var(--tinta) 38%, transparent); stroke-width: 34; }
.cl-mapa .cl-linea-toda { stroke: var(--sup-2); stroke-width: 26; stroke-dasharray: none; }
.cl-mapa .cl-linea-puntos { stroke: var(--linea-2); stroke-width: 8; stroke-dasharray: 0.1 20; }
.cl-mapa .cl-linea-hecha { stroke: var(--bien); stroke-width: 12; }
.cl-mapa .cl-guia { position: relative; z-index: 4; margin: 0; padding: 12px 0 40px; }
.cl-mapa .cl-guia a { display: inline-block; padding: 12px 20px; border-radius: var(--radio-btn); background: color-mix(in srgb, var(--sup) 96%, transparent); box-shadow: var(--sombra-peq); }
@media (max-width: 720px) {
  .mp-tablero { height: var(--h2); }
  .mp-parada, .mp-giro { left: calc(var(--x2) * 1%); top: calc(var(--y2) * 1px); }
  .mp-giro.g3 { display: none; } .mp-giro.g2 { display: block; }
  .mp-parada .cl-nodo { left: -50px; top: -50px; width: 100px; height: 100px; } .mp-parada .cl-nodo svg { width: 84px; height: 88px; margin-top: -8px; }
  .mp-parada .cl-nodo-txt { left: -76px; top: 62px; width: 152px; padding: 8px 8px 8px; } .mp-parada .cl-nodo-txt b { font-size: 13px; }
  .mp-meta .cl-nodo { left: -58px; top: -58px; width: 116px; height: 116px; } .mp-meta .cl-nodo svg { width: 98px; height: 102px; }
  .mp-meta .cl-nodo-txt { top: 70px; }
  .mp-bandera { left: -86px; top: -86px; transform: scale(.8); }
  .mp-mundo { padding: 0 8px 16px; } .mp-fondo { margin: 0 -8px -100vh; }
}
@media (prefers-reduced-motion: reduce) {
  .cl-cam-hero-ny, .cl-cam-nyan, .e-toca .cl-nodo, .mp-tela { animation: none; }
  .cl-pasos button, .cl-hueco, .cl-pieza, .cl-nodo, .cl-cesta, .cl-banner, .cl-puntos i, .ap-oir, .ap-prueba-ops button, .ap-guia-l a { transition: none; }
}
`;
  document.head.appendChild(s);
}
estilos();

// ── el camino de las clases (lo pinta gramatica.js en #gramatica cuando la app va con el motor JS) ──
// Un sendero que serpentea, por capítulos: cada clase es una pegatina redonda con su dibujo. Las hechas llevan el sello 済 y
// estrellas según la nota; en la que te toca está Nyan esperándote. Al tocar una, sale su ficha (resumen, gramática, empezar).
// 30-09 · el camino, como un mapa de mundos (a lo Mario): cada capítulo es una región con su foto de Japón (web/img/mundos/N.webp)
// y sus clases en serpentina, fila a fila; el sendero rodea los carteles al girar. Se calcula con 3 columnas y con 2 (pantalla estrecha).
const MAPA = { 3: { xs: [20, 50, 80], onda: [0, 44, -6], fila: 272, giro: 13 }, 2: { xs: [28, 72], onda: [0, 34], fila: 238, giro: 20 } };
const ARRIBA = 104, ABAJO = 190;   // hueco para las estrellas de arriba y el cartel de la última
function enMapa(n) {
  const r = {};
  for (const cols of [3, 2]) {
    const { xs, onda, fila, giro } = MAPA[cols], filas = Math.ceil(n / cols);
    const sitio = (i) => { const f = Math.floor(i / cols), c = f % 2 ? cols - 1 - (i % cols) : i % cols; return { c, x: xs[c] + (cols === 3 ? (((i * 37) % 7) - 3) * 0.9 : 0), y: ARRIBA + f * fila + onda[c] }; };
    r[cols] = { alto: ARRIBA + (filas - 1) * fila + Math.max(...onda) + ABAJO, sitios: Array.from({ length: n }, (_, i) => sitio(i)),
      giros: Array.from({ length: n }, (_, i) => { if ((i + 1) % cols || i === n - 1) return null; const s = sitio(i); return { x: s.x + (s.c ? giro : -giro), y: s.y + fila / 2 }; }) };
  }
  return r;
}
const BANDERA = '<svg class="mp-bandera" viewBox="0 0 58 84" aria-hidden="true"><path d="M7 82V6" stroke="#5a3a22" stroke-width="4.5" stroke-linecap="round"/><circle cx="7" cy="6" r="5" fill="#f2b43a" stroke="#7a5a12" stroke-width="2"/><path class="mp-tela" d="M9 10 C22 6 38 16 54 12 L50 24 L54 36 C38 40 22 30 9 34 Z"/></svg>';
let roCamino = null;
// el candado de las clases que aún no se han rehecho como episodio
const CANDADO = '<span class="cl-candado" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7.5 10.5V8a4.5 4.5 0 0 1 9 0v2.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><rect x="4.5" y="10" width="15" height="11" rx="3" fill="currentColor"/><circle cx="12" cy="15.2" r="1.7" fill="#fffaf0"/></svg></span>';
// la cabecera de cada capítulo: una banda con foto y el reparto (herramientas/escenas: CAPITULOS y portadas.py --capitulos)
export async function pintarIndiceClases(V) {
  estilos();
  const [indice, hechas, ini] = await Promise.all([fetch('clases/indice.json').then((r) => r.json()).catch(() => []),
    api('/api/clases').catch(() => ({})), api('/api/inicio').catch(() => ({}))]);
  const vas = ini.palabra_actual || 1, total = ini.total_palabras || 0;
  const toca = indice.find((c) => c.hay && !hechas[c.id] && c.desde <= vas + 5) || indice.find((c) => c.hay && !hechas[c.id]);
  const nHechas = indice.filter((c) => hechas[c.id]).length;
  const estado = (c) => (!c.hay ? 'pronto' : hechas[c.id] ? 'hecha' : c === toca ? 'toca' : c.desde <= vas ? 'lista' : 'luego'); // el candado manda
  const estrellas = (n) => (n >= 90 ? 3 : n >= 70 ? 2 : 1);
  const caps = [];
  for (const c of indice) { const k = c.capitulo?.n || 1; (caps[k - 1] ||= { ...c.capitulo, clases: [] }).clases.push(c); }
  // 30-09 · los iconos de clase, en MEDALLÓN (miniaturas en 3D): la foto del sitio, desenfocada, y
  // delante el reparto en 3D con el objeto de la clase en línea (o el personaje solo, si la clase va de él)
  const LUGAR = { cama: 'cuarto', telefono: 'cuarto', tele: 'cuarto', carta: 'cuarto', reloj: 'cuarto', zapato: 'cuarto', regalo: 'cuarto', libro: 'cuarto',
    pizarra: 'escuela', escuela: 'escuela', lapiz: 'escuela', profesor: 'escuela', sensei: 'escuela', bolsa: 'tienda', dinero: 'tienda', pan: 'tienda',
    sushi: 'tienda', onigiri: 'tienda', persona: 'tienda', caja: 'tienda', plato: 'cocina', cuenco: 'cocina', vaso: 'cocina', taza: 'cocina', manzana: 'cocina',
    paraguas: 'calle', nube: 'calle', bici: 'calle', coche: 'calle', tren: 'calle', casa: 'calle', perro: 'calle', luna: 'noche' };
  const CARA = { cama: 'sueno', pizarra: 'pensando', lapiz: 'pensando', libro: 'pensando', nube: 'sorpresa', paraguas: 'sorpresa', reloj: 'sorpresa', regalo: 'sorpresa' };
  const medallon = (ico) => {
    if (esReparto(ico)) return `<g transform="translate(0 6) scale(.86)">${recorte(ico)}</g>`;
    const m = MED[ico] || { w: 60, h: 60 }, so = 46 / Math.max(m.w, m.h);
    return `<g transform="translate(-19 6) scale(.7)">${recorte('nyan', CARA[ico] || 'feliz')}</g><g transform="translate(20 4) scale(${so.toFixed(3)})">${figura(ico)}</g>`;
  };
  const nodo = (c, sitio, meta) => {
    const e = estado(c), h = hechas[c.id];
    return `<div class="mp-parada${meta ? ' mp-meta' : ''} e-${e} cap-${c.capitulo?.n || 1}" style="${sitio}">${meta ? BANDERA : ''}
      <button class="cl-nodo" data-id="${c.id}" aria-label="${t('clase.indice.eyebrow', { n: c.clase })}: ${esc(sinFuriganaTxt(tr(c.titulo)))}">
        <span class="cl-med-foto" style="background-image:url(/img/escenarios/${LUGAR[c.icono] || 'parque'}.webp)"></span><svg viewBox="-50 -98 100 104" aria-hidden="true">${medallon(c.icono || 'libro')}</svg>
        <span class="cl-nodo-n">${c.clase}</span>${e === 'pronto' ? CANDADO : ''}
        ${h ? `<span class="cl-sello" lang="ja">済</span><span class="cl-estrellas">${'★'.repeat(estrellas(h.mejor))}${'☆'.repeat(3 - estrellas(h.mejor))}</span>` : ''}
      </button>
      <div class="cl-nodo-txt"><b lang="ja">${ruby(tr(c.titulo))}</b><small>${e === 'hecha' ? t('clase.indice.hecha', { nota: h.mejor }) : e === 'toca' ? t('clase.indice.ahora')
        : e === 'pronto' ? t('clase.indice.pronto') : e === 'lista' ? t('clase.indice.lista') : t('clase.indice.faltan', { n: Math.max(1, c.desde - vas) })}</small>
        ${e === 'luego' ? `<span class="cl-falta" aria-hidden="true"><i style="width:${Math.min(96, Math.max(4, (100 * vas) / Math.max(1, c.desde)))}%"></i></span>` : ''}</div>
      ${e === 'toca' ? `<div class="cl-cam-nyan" aria-hidden="true"><span class="cl-cam-bocadillo">${t('clase.indice.ahora')}</span><svg viewBox="-60 -114 120 124">${nyan3d({ cara: 'feliz', brazo: 'arriba' })}</svg></div>` : ''}
    </div>`;
  };
  const giro = (g, cols) => (g ? `<i class="mp-giro g${cols}" style="--x${cols}:${g.x.toFixed(1)};--y${cols}:${g.y}"></i>` : '');
  const parada = (c, k, m, meta) => { const a = m[3].sitios[k], b = m[2].sitios[k];
    return nodo(c, `--x3:${a.x.toFixed(1)};--y3:${a.y};--x2:${b.x.toFixed(1)};--y2:${b.y}`, meta) + giro(m[3].giros[k], 3) + giro(m[2].giros[k], 2); };
  const cartel = (cap) => `<h3 class="cl-cap cap-${cap.n || 1}"><span class="cl-cap-escena" style="background-image:url(/img/capitulos/cap-${Math.min(6, cap.n || 1)}.webp)" aria-hidden="true"></span>
          <span class="cl-cap-rotulo"><span lang="ja">${cap.jp}</span>${esc(tr(cap.titulo))}
          <small>${t('clase.indice.cap_rango', { a: cap.clases[0].clase, b: cap.clases.at(-1).clase })} · ${t('clase.indice.cap_hechas', { n: cap.clases.filter((c) => hechas[c.id]).length, total: cap.clases.length })}</small></span></h3>`;
  const heroe = `<section class="cl-cam-hero">
        <svg class="cl-cam-hero-ny" viewBox="-60 -114 120 124" aria-hidden="true">${nyan3d({ cara: 'feliz', brazo: 'arriba', onigiri: true })}</svg>
        <div class="cl-cam-hero-txt"><small>${toca ? esc(sinFuriganaTxt(tr(toca.capitulo?.titulo || ''))) : ''}</small>
          <b>${toca ? t('clase.indice.hero', { n: toca.clase, total: indice.length }) : t('clase.indice.progreso', { n: nHechas, total: indice.length })}</b>
          <div class="cl-cam-caps">${caps.filter(Boolean).map((cap) => { const n = cap.clases.filter((c) => hechas[c.id]).length; return `<span class="cap-${cap.n || 1}" title="${esc(tr(cap.titulo))}"><i style="width:${(100 * n) / cap.clases.length}%"></i></span>`; }).join('')}</div>
          <small>${t('clase.indice.progreso', { n: nHechas, total: indice.length })} · ${t('clase.indice.sub')}</small></div>
        ${toca ? `<button class="boton-tinta cl-cam-ir" data-id="${toca.id}">${t('clase.indice.vamos', { n: toca.clase })}</button>` : ''}
      </section>`;
  V.innerHTML = `<header class="cab-papel cl-cab"><button class="volver" data-inicio>${t('comun.volver_inicio')} ${kbd('Esc')}</button>
      <div class="cl-tit"><small>${total ? t('clase.indice.vas', { n: Math.min(vas, total), total }) : ''}</small><b>${t('clase.indice.tit')}</b></div>
      <a class="volver cl-guia-btn" href="#gramatica/hiragana"><span lang="ja">文</span> ${t('clase.indice.guia_btn')}</a></header>
    <main class="cl-cuerpo cl-camino cl-mapa">
      <div class="cl-pista"><svg class="cl-linea" aria-hidden="true"><path class="cl-linea-borde"/><path class="cl-linea-toda"/><path class="cl-linea-puntos"/><path class="cl-linea-hecha"/></svg>
        ${caps.filter(Boolean).map((cap, w) => { const m = enMapa(cap.clases.length); return `<section class="mp-mundo cap-${cap.n || 1}" style="--foto:url(/img/mundos/${Math.min(6, cap.n || 1)}.webp)"><div class="mp-fondo" aria-hidden="true"></div>${w ? '' : heroe}
        ${cartel(cap)}
        <div class="mp-tablero" style="--h3:${m[3].alto}px;--h2:${m[2].alto}px">${cap.clases.map((c, k) => parada(c, k, m, k === cap.clases.length - 1)).join('')}</div></section>`; }).join('')}
      </div>
      <p class="cl-guia"><a href="#gramatica/hiragana">${t('clase.indice.guia')} →</a></p>
    </main>`;
  $('[data-inicio]', V).onclick = () => { location.hash = 'inicio'; };
  const pista = $('.cl-pista', V);
  // el sendero: una curva suave por el centro de cada pegatina; lo recorrido, en verde y dibujándose
  const trazar = (animar) => {
    const caja = pista.getBoundingClientRect();
    const pts = $$('.cl-nodo, .mp-giro', pista).filter((b) => b.getClientRects().length).map((b) => { const r = b.getBoundingClientRect(); return [r.left + r.width / 2 - caja.left, r.top + r.height / 2 - caja.top, b]; });
    if (pts.length < 2) return;
    const tramos = pts.slice(1).map(([x, y], j) => {
      const k = j + 1, p0 = pts[k - 2] || pts[k - 1], p1 = pts[k - 1], p3 = pts[k + 1] || pts[k], f = (v) => v.toFixed(1);
      return `C${f(p1[0] + (x - p0[0]) / 6)} ${f(p1[1] + (y - p0[1]) / 6)} ${f(x - (p3[0] - p1[0]) / 6)} ${f(y - (p3[1] - p1[1]) / 6)} ${f(x)} ${f(y)}`;
    });
    const inicio = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)} `, todo = inicio + tramos.join(' ');
    const svg = $('.cl-linea', pista);
    svg.setAttribute('viewBox', `0 0 ${caja.width} ${caja.height}`); svg.style.height = caja.height + 'px';
    for (const c of ['borde', 'toda', 'puntos']) $('.cl-linea-' + c, svg).setAttribute('d', todo);
    const ultimaHecha = pts.findLastIndex(([, , b]) => b.closest('.e-hecha'));
    const hecho = $('.cl-linea-hecha', svg);
    hecho.setAttribute('d', ultimaHecha > 0 ? inicio + tramos.slice(0, ultimaHecha).join(' ') : '');
    if (animar && ultimaHecha > 0 && !quieto()) {
      const L = hecho.getTotalLength();
      gsap.fromTo(hecho, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut', delay: 0.3 });
    }
  };
  requestAnimationFrame(() => trazar(true));
  roCamino?.disconnect();   // el de la vez anterior (el índice se vuelve a pintar al volver a Gramática)
  roCamino = new ResizeObserver(() => { if (pista.isConnected) trazar(false); else roCamino.disconnect(); }); roCamino.observe(pista);
  // las pegatinas aparecen al entrar en pantalla
  if (!quieto()) {
    gsap.fromTo($('.cl-cam-hero', V), { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.8)' });
    const io = new IntersectionObserver((es) => es.forEach((en) => {
      if (!en.isIntersecting) return;
      io.unobserve(en.target);
      gsap.fromTo($('.cl-nodo', en.target), { scale: 0.3, rotate: -25 }, { scale: 1, rotate: 0, duration: 0.55, ease: 'back.out(2.6)' });
      gsap.fromTo($('.cl-nodo-txt', en.target), { y: -10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, delay: 0.12, ease: 'power2.out' });
    }), { rootMargin: '0px 0px -8% 0px' });
    $$('.mp-parada', V).forEach((f) => io.observe(f));
  }
  const aqui = $('.mp-parada.e-toca .cl-nodo', V);
  if (aqui) setTimeout(() => { aqui.scrollIntoView({ block: 'center', behavior: quieto() ? 'auto' : 'smooth' }); aqui.focus({ preventScroll: true }); }, 350);
  $$('.cl-nodo, .cl-cam-ir', V).forEach((b) => { b.onclick = () => fichaClase(indice.find((c) => c.id === b.dataset.id), estado, hechas, vas); });
}
const sinFuriganaTxt = (s) => String(s || '').replace(/\[[^\]]*\]/g, '');

// la ficha de una clase: qué enseña y el botón para empezar
function fichaClase(c, estado, hechas, vas) {
  if (!c) return;
  const e = estado(c), h = hechas[c.id];
  const capaEl = document.createElement('div');
  capaEl.className = 'cl-ficha-capa'; capaEl.setAttribute('role', 'dialog'); capaEl.setAttribute('aria-modal', 'true');
  capaEl.innerHTML = `<div class="cl-ficha e-${e}">
    <svg class="cl-ficha-fig" viewBox="-50 -98 100 104" aria-hidden="true">${figura(c.icono || 'libro')}</svg>
    <small class="cl-ficha-ante" lang="ja">${c.capitulo?.jp || ''} · ${t('clase.indice.eyebrow', { n: c.clase })}</small>
    <h2 lang="ja">${ruby(tr(c.titulo))}</h2>
    ${c.resumen ? `<p>${ruby(tr(c.resumen))}</p>` : ''}
    ${(c.puntos_jp || []).length ? `<div class="cl-ficha-puntos">${c.puntos_jp.map((p) => `<span lang="ja">${esc(p)}</span>`).join('')}</div>` : ''}
    <p class="cl-ficha-estado">${e === 'hecha' ? t('clase.indice.f_hecha', { nota: h.mejor }) : e === 'toca' ? t('clase.indice.f_toca')
      : e === 'pronto' ? t('clase.indice.f_pronto') : e === 'luego' ? t('clase.indice.f_luego', { n: Math.max(1, c.desde - vas) }) : t('clase.indice.f_lista')}</p>
    <div class="cl-acciones"><button class="boton-claro" data-cerrar>${t('comun.cerrar')} ${kbd('Esc')}</button>
      ${c.hay ? `<button class="boton-claro" data-apuntes><span lang="ja">帳</span> ${t('clase.apuntes.boton')}</button>` : ''}
      ${c.hay ? `<button class="boton-tinta" data-ir data-foco>${e === 'hecha' ? t('clase.banner.otra') : t('clase.banner.cta')} ${kbd('Intro')}</button>` : ''}</div>
  </div>`;
  document.body.appendChild(capaEl);
  let hecho = false;
  const cerrar = (ir) => {
    if (hecho) return; hecho = true; soltar();
    gsap.to(capaEl, { opacity: 0, duration: 0.18, onComplete: () => { capaEl.remove(); if (ir) location.hash = 'clase/' + c.id; } });
  };
  const soltar = capa(capaEl, (ev) => {
    if (ev.key === 'Escape') { cerrar(false); return true; }
    if (ev.key === 'Enter' && c.hay) { cerrar(true); return true; }
    return false;
  });
  $('[data-cerrar]', capaEl).onclick = () => cerrar(false);
  $('[data-ir]', capaEl)?.addEventListener('click', () => cerrar(true));
  $('[data-apuntes]', capaEl)?.addEventListener('click', () => { if (hecho) return; hecho = true; soltar(); capaEl.remove(); location.hash = `clase/${c.id}/apuntes`; });
  capaEl.addEventListener('click', (ev) => { if (ev.target === capaEl) cerrar(false); });
  gsap.fromTo(capaEl, { opacity: 0 }, { opacity: 1, duration: 0.2 });
  if (!quieto()) gsap.fromTo($('.cl-ficha', capaEl), { y: 40, scale: 0.92, rotate: -1.5 }, { y: 0, scale: 1, rotate: 0, duration: 0.5, ease: 'back.out(2)' });
  son.papel?.();
}

// la tarjeta que lleva a las clases desde una lección de la guía de consulta (la pinta gramatica.js)
export function htmlBannerClase() {
  return `<a class="cl-banner" href="#gramatica"><svg class="cl-banner-ny" viewBox="-60 -114 120 124" aria-hidden="true">${nyan3d({ cara: 'feliz', brazo: 'arriba' })}</svg>
    <span class="cl-banner-txt"><small>${t('clase.banner.eyebrow')}</small><b>${t('clase.indice.tit')}</b><em>${t('clase.indice.sub')}</em></span>
    <span class="cl-banner-ir">${t('clase.banner.cta')} →</span></a>`;
}

registrar('clase', {
  seccion: '#v-clase',
  async entrar([id, sub]) { if (!id) { location.hash = 'gramatica'; return; } await entrar(id, sub); },
  actualizar([id, sub]) { if (!id) return; if (clase?.id === id && $('.cl-cuerpo', V())) ir(sub === 'apuntes' ? 'apuntes' : 'intro'); else entrar(id, sub); },
  salir() { audio?.pause(); teclas = null; son.musica(false); },
  volver() { location.hash = 'gramatica'; },
  atajos: () => false,
  contexto: () => 'clase',
});

// para los episodios (episodio.js)
export { oir, colocarBocadillo, montar, componer };
export const ponerTeclas = (x) => { teclas = x; };
export const pararVoz = () => audio?.pause();
