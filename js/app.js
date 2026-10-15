// ニャン語 Nyango · núcleo: API, enrutado con puertas shoji y portada: la habitación de Mochi, un muelle de actividades y la carta de la elegida
import './css-lista.js'; // espera a app.css (ya no bloquea el primer pintado: la pantalla de carga sale antes)
import './motor/local.js'; // sin servidor (app empaquetada): el motor responde a /api/… — tiene que ir lo primero
import { t, tn, num, CABECERA } from './i18n.js';
import { gsap } from 'gsap';
import { Mascota } from './mascota.js';
import * as son from './sonido.js';
import { esc, sinFurigana } from './japones.js';
import { iniciarTeclado, sobreControl, escribiendo, capaAbierta, kbd, abrirHoja } from './teclado.js';
import { abrirAjustes, aplicarSonido, modoActual, modoDe } from './ajustes.js';
import { adoptarTemaDelMotor } from './tema.js';
import { comprobarArranque } from './arranque.js';
import { pedirSincro, preguntarUnion } from './sincro.js';
import { empezarCharla, pararCharla, datosCharla, charlaActividad } from './nyan.js';
import { ICONOS, CARITA_NYAN } from './iconos.js';
import { GRADOS, gradoDe } from './pupitre.js';

export const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const api = async (ruta, datos) => {
  const r = await fetch(ruta, datos === undefined ? { headers: CABECERA } : { method: 'POST', headers: { 'Content-Type': 'application/json', ...CABECERA }, body: JSON.stringify(datos) });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.status);
  return r.json();
};
export const espera = (ms) => new Promise((r) => setTimeout(r, ms));
// curva de niveles (idéntica a nivel() en nucleo/juego.py): need(L) = round(150 * L ** 1.45) → 150, 410, 738, 1120…
export function nivelDe(xp) {
  const pide = (n) => Math.round(150 * n ** 1.45);
  let L = 1, need = pide(1), x = Math.max(0, xp || 0);
  while (x >= need) { x -= need; L++; need = pide(L); }
  return { L, dentro: x, need, pct: x / need };
}
export const mil = num;
export const estado = { inicio: null, mochi: null };
export const RANGO_COLOR = ['var(--r0)', 'var(--r1)', 'var(--r2)', 'var(--r3)', 'var(--r4)'];
export const quieto = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
// depuración: ?lento reproduce todas las animaciones GSAP a un cuarto de velocidad
if (new URLSearchParams(location.search).has('lento')) gsap.globalTimeline.timeScale(0.25);

// ── texto flotante y avisos ──
export function flotar(txt, x, y, color = 'var(--tinta)', retraso = 0) {
  const el = document.createElement('div'); el.className = 'flota'; el.textContent = txt; el.style.cssText = `left:${x}px;top:${y}px;color:${color}`;
  $('#capa-fx').appendChild(el);
  if (quieto()) { gsap.fromTo(el, { opacity: 0, y: -40 }, { opacity: 1, duration: 0.2, delay: retraso }); gsap.to(el, { opacity: 0, duration: 0.3, delay: retraso + 1.2, onComplete: () => el.remove() }); return; }
  gsap.fromTo(el, { y: 10, opacity: 0, scale: 0.7 }, { y: -48, opacity: 1, scale: 1, duration: 0.36, delay: retraso, ease: 'back.out(2)' });
  gsap.to(el, { y: -88, opacity: 0, duration: 0.45, delay: retraso + 0.8, ease: 'power2.in', onComplete: () => el.remove() });
}
// la tinta que toca sobre cada color macizo del tema (temas.css): así el texto se lee en los cuatro temas
const TINTA_SOBRE = { '--boton': '--boton-tinta', '--acento': '--acento-sobre', '--aviso': '--aviso-sobre', '--t-vocab': '--t-vocab-tinta', '--t-kanji': '--t-kanji-tinta', '--t-radical': '--t-radical-tinta', '--t-gram': '--t-gram-tinta', '--t-conj': '--t-conj-tinta' };
export function aviso({ jp, es, sub, color = 'var(--tinta)', dur = 2.2 }) {
  const el = document.createElement('div'), nombre = /var\((--[\w-]+)\)/.exec(color)?.[1];
  el.className = 'aviso';
  if (/^--r\d$/.test(nombre || '')) { el.classList.add('aviso-rango'); el.style.setProperty('--rc', color); }   // un rango: tinte suave con su color (como su pastilla)
  else { el.style.background = color; el.style.color = TINTA_SOBRE[nombre] ? `var(${TINTA_SOBRE[nombre]})` : 'var(--tinta-inv)'; }
  el.innerHTML = `<div class="a-jp">${esc(jp)}</div><div class="a-es">${esc(es)}</div>${sub ? `<div class="a-sub">${esc(sub)}</div>` : ''}`;
  $('#capa-fx').appendChild(el);
  if (quieto()) { gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.25 }); gsap.to(el, { opacity: 0, duration: 0.3, delay: dur, onComplete: () => el.remove() }); return; }
  gsap.timeline()
    .fromTo(el, { scale: 0.7, opacity: 0, rotate: -3 }, { scale: 1.03, opacity: 1, rotate: 0, duration: 0.26, ease: 'power3.out' })
    .to(el, { scale: 1, duration: 0.2, ease: 'power2.out' })
    .fromTo(el.children, { y: 10, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.05, duration: 0.3, ease: 'back.out(1.8)' }, 0.1);
  gsap.to(el, { scale: 0.92, opacity: 0, duration: 0.25, delay: dur, ease: 'power2.in', onComplete: () => el.remove() });
}

// chispas de vinilo que saltan desde un elemento (botones, fichas)
export function chispas(el, { n = 14, colores = ['var(--acento)', 'var(--aviso)', 'var(--sup)', 'var(--t-kanji)', 'var(--mal)'], fuerza = 1 } = {}) {   // confeti: los colores del tema
  if (quieto() || !el) return;
  const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  for (let k = 0; k < n; k++) {
    const c = document.createElement('i');
    c.className = 'chispa ' + ['', 'redonda', 'petalo'][k % 3];
    c.style.background = colores[k % colores.length];
    c.style.boxShadow = '0 1px 0 var(--linea-2)';
    document.body.appendChild(c);
    const a = (k / n) * Math.PI * 2 + Math.random() * 0.5, v = (70 + Math.random() * 90) * fuerza;
    gsap.set(c, { x: cx + Math.cos(a) * r.width * 0.3, y: cy + Math.sin(a) * r.height * 0.3, rotate: Math.random() * 360, scale: 0.6 + Math.random() * 0.7 });
    gsap.timeline({ onComplete: () => c.remove() })
      .to(c, { x: `+=${Math.cos(a) * v}`, y: `+=${Math.sin(a) * v - 30}`, rotate: `+=${Math.random() * 300 - 150}`, duration: 0.55, ease: 'power3.out' })
      .to(c, { y: '+=46', opacity: 0, scale: 0.3, duration: 0.45, ease: 'power1.in' }, '>-0.12');
  }
}

// ── enrutado ──
const vistas = {};
export function registrar(nombre, modulo) { vistas[nombre] = modulo; }
let actual = null;
// para el teclado: la vista en pantalla, su módulo y en qué parte está (p. ej. lección o repaso)
export function vistaActual() {
  const [, sub = ''] = (location.hash.slice(1) || 'inicio').split('/');
  const modulo = vistas[actual] || null;
  return { nombre: actual || 'inicio', modulo, sub, contexto: modulo?.contexto?.() || (actual === 'estudio' ? sub : actual) };
}
async function ir() {
  const [nombre, ...resto] = (location.hash.slice(1) || 'inicio').split('/');
  const destino = vistas[nombre] ? nombre : 'inicio';
  const seccion = destino === 'inicio' ? '#v-inicio' : vistas[destino].seccion;
  if (actual === destino && vistas[destino].actualizar) { vistas[destino].actualizar(resto); return; }
  const primera = actual === null;
  if (!primera) await cerrarShoji();
  if (actual && vistas[actual]?.salir) vistas[actual].salir();
  $$('.vista').forEach((v) => v.classList.toggle('activa', v.matches(seccion)));
  $$('#nav a').forEach((a) => a.classList.toggle('activo', a.dataset.v === destino));
  actual = destino;
  await vistas[destino].entrar(resto);
  if (!primera) await abrirShoji();
}
async function cerrarShoji() {
  son.papel();
  const [i, d] = $$('#shoji .hoja');
  await gsap.timeline().to(i, { x: '0%', duration: 0.42, ease: 'power3.inOut' }, 0).to(d, { x: '0%', duration: 0.42, ease: 'power3.inOut' }, 0)
    .to([i, d], { x: (k) => (k ? '-0.6%' : '0.6%'), duration: 0.06, yoyo: true, repeat: 1, ease: 'power1.out' });
}
async function abrirShoji() {
  const [i, d] = $$('#shoji .hoja');
  await gsap.timeline({ delay: 0.08 }).to(i, { x: '-101%', duration: 0.55, ease: 'power3.inOut' }, 0).to(d, { x: '101%', duration: 0.55, ease: 'power3.inOut' }, 0);
}
addEventListener('hashchange', ir);

// ═════════════════════════ portada ═════════════════════════
const ACTIVIDADES = [
  { id: 'repaso', ir: '#estudio/repaso', glifo: '稽' },
  { id: 'leccion', ir: '#estudio/leccion', glifo: '新' },
  { id: 'gramatica', ir: '#gramatica', glifo: '文' },
  { id: 'kanji', ir: '#kanji', glifo: '字' },
  { id: 'camino', ir: '#camino', glifo: '道' },
  { id: 'historias', ir: '#lecturas', glifo: '話' },
  { id: 'mochi', ir: '#mochi', glifo: '猫' },
  { id: 'kana', ir: '#kana', glifo: 'あ' }, // 02-10: hiragana y katakana, para quien empieza
  { id: 'conjugar', ir: '#conjugar', glifo: '活' }, // 11-10: verbos, adjetivos y la tabla 活用
];
// La portada (propuesta A, 29-09): Mochi tiene el centro de la sala; abajo, un muelle con las seis actividades; la elegida sale
// en UNA carta grande a su derecha, con su titular y su botón. Y Mochi se vuelve hacia la carta y reacciona a su manera: te la
// «presenta». Antes seis fichas orbitaban a su alrededor y, en cuanto andaba, se le echaban encima.
const portada = { foco: 0 };
const REACCION = {
  repaso: { cara: 'decidido', voz: 'ura', salta: true },
  leccion: { cara: 'estrella', voz: 'eh', manpu: 'brillo' },
  gramatica: { cara: 'pensando', voz: 'hm', manpu: 'pregunta' },
  kanji: { cara: 'panico', voz: 'wa', manpu: 'gota' },
  camino: { cara: 'feliz', voz: 'ya', salta: true },
  historias: { cara: 'estrella', voz: 'fun', manpu: 'brillo' },
  mochi: { cara: 'doya', voz: 'fun', manpu: 'brillo' },
  kana: { cara: 'feliz', voz: 'nyaa', manpu: 'nota' },
  conjugar: { cara: 'pensando', voz: 'hm', manpu: 'pregunta' },
};
const nombreMuelle = (a, d) => (a.id === 'mochi' ? esc(d.mochi.nombre) : t(`app.muelle.${a.id}`));
// cuánto se corre el encuadre de la sala para que Mochi no quede detrás de la carta (en ventanas estrechas la carta va abajo)
const desvioPortada = () => (innerWidth > 760 ? 0.085 : 0);
const PIE_MODO = Object.fromEntries(['mixto', 'escribir', 'elegir', 'significado', 'lectura', 'escuchar'].map((m) => [m, t(`app.pie_modo.${m}`)]));
// palabras nuevas sin formas repetidas: con lectura del servidor, los homógrafos la llevan (人（ひと）、人（じん）); sin ella, cada forma sale una vez
function nuevas(l, n, html = false) {
  const f = l.palabras, lec = l.lecturas || [], out = [];
  f.forEach((p, i) => {
    const r = lec[i] && f.indexOf(p) !== f.lastIndexOf(p) ? lec[i] : '', t = html ? esc(p) + (r ? `<small>（${esc(r)}）</small>` : '') : p + (r ? `（${r}）` : '');
    if (!out.includes(t)) out.push(t);
  });
  return out.slice(0, n);
}
function contenidoCarta(a, d) {
  const nv = nivelDe(d.xp);
  const eq = d.equipo_siguiente;
  switch (a.id) {
    case 'repaso': {
      // quien aún no ha aprendido nada no tiene «todo repasado»: la ficha le manda a su primera lección
      const nuevo = !d.repasos_ahora && !d.cuenta?.aprendidos, conLeccion = nuevo && d.leccion.palabras.length > 0;
      return { etq: '稽古', insignia: d.repasos_ahora || null, tit: t('app.repaso.tit'), sub: d.repasos_ahora ? t('app.repaso.listos') + (d.hechas_hoy ? ' · ' + tn('app.repaso.hechos_hoy', d.hechas_hoy) : '') : nuevo ? t('app.repaso.sin_tarjetas') : (d.proximo_repaso ? t('app.repaso.proximo', { cuando: cuando(d.proximo_repaso) }) : t('app.repaso.nada')),
        h1: d.repasos_ahora ? t('app.repaso.h1') : nuevo ? t('app.repaso.h1_nuevo') : t('app.repaso.h1_hecho'), ante: t('app.repaso.ante'),
        pie: d.repasos_ahora ? tn('app.repaso.pie_listas', d.repasos_ahora, { modo: PIE_MODO[modoActual()] }) : nuevo ? t('app.repaso.pie_nuevo')
          : d.proximo_repaso ? t('app.repaso.pie_proximo', { cuando: cuando(d.proximo_repaso) }) : t('app.repaso.pie_luego'),
        cta: conLeccion ? t('app.cta.leccion') : t('app.cta.entrenar'), off: !d.repasos_ahora && !conLeccion, modo: !nuevo, ir: conLeccion ? '#estudio/leccion' : null };
    }
    case 'leccion': return { etq: '新', tit: t('app.leccion.tit'), sub: `${tn('app.palabras', d.leccion.palabras.length)} · ${tn('app.piezas', d.leccion.piezas)}`, extra: nuevas(d.leccion, 4).join('・'),
      h1: t('app.leccion.h1', { palabras: `<span class="jp">${nuevas(d.leccion, 3, true).map((x, i, l) => `<span class="u">${x}${i < l.length - 1 ? '、' : ''}</span>`).join('')}</span>` }), ante: `${d.region.jp} · ${d.region.nombre}`,
      pie: t('app.leccion.pie', { piezas: num(d.leccion.piezas), palabras: tn('app.palabras', d.leccion.palabras.length) }), cta: t('app.cta.leccion'), off: !d.leccion.palabras.length };
    case 'gramatica': { // los títulos traen furigana entre corchetes (方[ほう]): aquí van sin ella
      const g = d.gramatica, tit = g && esc(sinFurigana(g.titulo));
      return { etq: '文法', tit: g ? tit : t('app.gramatica.tit'), sub: t('app.gramatica.sub', { hechas: d.gramatica_hechas, total: d.gramatica_total }), barra: d.gramatica_total ? d.gramatica_hechas / d.gramatica_total : 0,
        h1: g ? tit : t('app.gramatica.h1'), ante: g ? g.capitulo : t('app.gramatica.tit'), pie: g ? sinFurigana(g.resumen) : t('app.gramatica.pie'), cta: t('app.gramatica.cta') };
    }
    case 'kanji': return { etq: '漢字', tit: t('app.kanji.tit'), sub: t('app.kanji.sub', { n: d.cuenta.kanji1, total: d.cuenta.kanji_total || 836 }), barra: d.cuenta.kanji1 / (d.cuenta.kanji_total || 836), h1: t('app.kanji.h1'), ante: t('app.kanji.ante'), pie: t('app.kanji.pie'), cta: t('app.kanji.cta') };
    case 'camino': return { etq: '道', tit: esc(d.region.nombre), sub: t('app.camino.sub', { n: mil(d.palabra_actual), total: mil(d.total_palabras) }), barra: d.palabra_actual / d.total_palabras,
      h1: t('app.camino.h1', { region: esc(d.region.nombre) }), ante: t('app.camino.ante', { n: d.region.i + 1, total: Math.ceil(d.total_palabras / 50) }), pie: t('app.camino.pie'), cta: t('app.camino.cta') };
    // las historias de Nyan (lectura.js): la nueva que ya se puede leer, o la estantería
    case 'historias': { const h = d.lectura, jp = h && esc(sinFurigana(h.titulo?.jp || ''));
      return { etq: '話', insignia: h ? 1 : null, tit: h ? jp : t('app.historias.tit'), sub: t('app.historias.sub', { n: d.lecturas_leidas || 0, total: d.lecturas_total || 0 }),
        barra: d.lecturas_total ? (d.lecturas_leidas || 0) / d.lecturas_total : 0, h1: h ? `<span class="jp">${jp}</span>` : t('app.historias.h1'),
        ante: h ? t('app.historias.ante_nueva') : t('app.historias.ante'), pie: h ? esc(h.resumen) : t('app.historias.pie'),
        cta: h ? t('app.historias.cta_leer') : t('app.historias.cta'), ir: h ? `#lecturas/${h.id}` : null }; }
    // los kana: cuántos dominas de cada escritura (dominado = tres aciertos más que fallos en la práctica)
    case 'kana': { const k = d.kana || { hiragana: 0, katakana: 0 }, todo = k.hiragana >= 46 && k.katakana >= 46;
      return { etq: 'かな', tit: t('app.kana.tit'), sub: t('app.kana.sub', { h: k.hiragana, k: k.katakana }), barra: (k.hiragana + k.katakana) / 92,
        h1: todo ? t('app.kana.h1_todo') : t('app.kana.h1'), ante: t('app.kana.ante'), pie: todo ? t('app.kana.pie_todo') : t('app.kana.pie'), cta: t('app.kana.cta') }; }
    // conjugar: las formas del verbo y del adjetivo y la tabla 活用 (cada forma que practicas entra en el repaso)
    case 'conjugar': return { etq: '活用', tit: t('app.conjugar.tit'), sub: t('app.conjugar.sub'), h1: t('app.conjugar.h1'), ante: t('app.conjugar.ante'), pie: t('app.conjugar.pie'), cta: t('app.conjugar.cta') };
    // la carta de Nyan enseña lo que más importa de él: cuánto sabe ya (su grado) y lo que le falta para el siguiente
    case 'mochi': { const sabe = d.nyan_sabe || 0, g = gradoDe(sabe), sig = GRADOS[g + 1];
      return { etq: '猫', tit: t('app.mochi.tit', { nombre: esc(d.mochi.nombre) }), sub: t('app.mochi.grado', { num: g + 1, grado: t(`perfil.inv.grado.${g}`), n: mil(sabe) }), barra: sig ? (sabe - GRADOS[g]) / (sig - GRADOS[g]) : 1,
      h1: t('app.mochi.h1', { nombre: esc(d.mochi.nombre), nivel: nv.L }), ante: t('app.mochi.ante'), pie: eq ? t('app.mochi.pie', { nombre: eq.nombre, hito: eq.hito }) : t('app.mochi.leyenda'), cta: t('app.mochi.cta') }; }
  }
}
function cuando(ts) {
  const s = ts - Date.now() / 1000;
  if (s < 3600) return tn('app.cuando.min', Math.max(1, Math.round(s / 60)));
  if (s < 86400) return tn('app.cuando.horas', Math.round(s / 3600));
  return tn('app.cuando.dias', Math.round(s / 86400));
}

// el muelle: una ficha redonda por actividad, con su nombre y, si hay algo pendiente, su insignia
function pintarMuelle(d) {
  const m = $('#muelle');
  // las fichas viejas se van con sus tweens (si no, GSAP las sigue animando y reteniendo fuera del documento)
  $$('.m-item, .m-item *, .m-selector', m).forEach((el) => gsap.killTweensOf(el));
  m.innerHTML = '<i class="m-selector" aria-hidden="true"></i>' + ACTIVIDADES.map((a, i) => {
    const c = contenidoCarta(a, d), si = i === portada.foco, nombre = nombreMuelle(a, d);
    return `<button class="m-item a-${a.id}${c.off ? ' apagada' : ''}" role="tab" data-i="${i}" aria-selected="${si}" tabindex="${si ? 0 : -1}" title="${nombre} (${i + 1})">
      <span class="m-ficha">${ICONOS[a.id]}</span>
      <span class="m-nombre">${nombre}</span>${c.insignia ? `<span class="m-insignia" data-n="${c.insignia}">${mil(c.insignia)}</span>` : ''}</button>`;
  }).join('');
  $$('.m-item', m).forEach(enlazarItem);
  moverSelector(false);
}
const elegida = (el) => el.getAttribute('aria-selected') === 'true';
// cada ficha del muelle: se asoma al pasar por encima, se aplasta al pulsar; pulsar la elegida la abre
function enlazarItem(el) {
  const ficha = $('.m-ficha', el);
  el.addEventListener('pointerenter', () => {
    son.roce();
    if (quieto()) return;
    gsap.to(ficha, { y: -6, scale: 1.08, rotate: gsap.utils.random(-5, 5), duration: 0.25, ease: 'back.out(2.4)', overwrite: 'auto' });
  });
  const reposar = () => gsap.to(ficha, { y: elegida(el) ? -4 : 0, scaleX: elegida(el) ? 1.06 : 1, scaleY: elegida(el) ? 1.06 : 1, rotate: 0, duration: 0.35, ease: 'back.out(2)', overwrite: 'auto' });
  el.addEventListener('pointerleave', reposar);
  el.addEventListener('pointerdown', () => { if (!quieto()) gsap.to(ficha, { scaleX: 1.1, scaleY: 0.9, y: 2, duration: 0.1, ease: 'power2.out', overwrite: 'auto' }); });
  el.addEventListener('pointerup', reposar);
  el.addEventListener('pointercancel', reposar);
  el.addEventListener('click', () => { const i = +el.dataset.i; if (i === portada.foco) abrirFoco(); else enfocar(i); });
}
// el platito de la elegida viaja hasta ella estirándose como una gota, y la ficha pega un saltito
function moverSelector(animar = true) {
  const m = $('#muelle'), sel = $('.m-selector', m), el = $(`.m-item[data-i="${portada.foco}"]`, m);
  if (!sel || !el) return;
  const x = el.offsetLeft, w = el.offsetWidth;
  sel.className = `m-selector a-${ACTIVIDADES[portada.foco].id}`;   // el color lo pone la clase de la actividad (sigue al tema solo)
  $$('.m-item', m).forEach((it) => {
    const si = it === el, f = $('.m-ficha', it);
    it.setAttribute('aria-selected', si); it.tabIndex = si ? 0 : -1;
    if (!animar || quieto()) gsap.set(f, { y: si ? -4 : 0, scaleX: si ? 1.06 : 1, scaleY: si ? 1.06 : 1, rotate: 0 });
    else if (si) gsap.timeline().to(f, { y: -14, scaleX: 0.94, scaleY: 1.08, rotate: -6, duration: 0.14, ease: 'power2.out', overwrite: 'auto' })
      .to(f, { y: -4, scaleX: 1.06, scaleY: 1.06, rotate: 0, duration: 0.4, ease: 'back.out(2)' });
    else if (gsap.getProperty(f, 'y') < -1) gsap.to(f, { y: 0, scaleX: 1, scaleY: 1, rotate: 0, duration: 0.45, ease: 'power3.out', overwrite: 'auto' });
  });
  if (!animar || quieto()) { gsap.set(sel, { x, width: w }); return; }
  const dx = Math.abs(x - gsap.getProperty(sel, 'x'));
  gsap.timeline({ overwrite: 'auto' })
    .to(sel, { x, width: w, duration: 0.36, ease: 'power3.inOut' }, 0)
    .to(sel, { scaleX: 1 + Math.min(0.2, dx / 800), scaleY: 0.92, duration: 0.16, ease: 'sine.out' }, 0)
    .to(sel, { scaleX: 1, scaleY: 1, duration: 0.3, ease: 'back.out(2)' }, 0.16);
}
function enfocar(i) {
  const N = ACTIVIDADES.length, nuevo = ((i % N) + N) % N;
  if (nuevo === portada.foco) return;
  const dir = nuevo > portada.foco ? 1 : -1;
  portada.foco = nuevo;
  son.cambio(nuevo);
  moverSelector(true);
  voltearCarta(dir);
  estado.mochi?.atender?.(REACCION[ACTIVIDADES[nuevo].id]);
  charlaActividad(ACTIVIDADES[nuevo].id);
}
// la carta del foco da media vuelta (hacia donde vas en el muelle) y enseña la nueva actividad por el otro lado
let volteo = null;
function voltearCarta(dir = 1) {
  const ap = $('#foco-carta .fc-apoyo');
  volteo?.kill();
  if (quieto()) { pintarFoco(); aparecerTitular(); return; }
  gsap.killTweensOf(['#antetitulo', '#pie-titular', '#cta-foco', '#modo-pill', '#fc-extra', '#h1 .l']);
  // lo que se corta a medias no se queda invisible (si la nueva animación también se corta)
  gsap.set(['#antetitulo', '#pie-titular', '#cta-foco', '#modo-pill', '#fc-extra'], { opacity: 1, x: 0, y: 0, scale: 1, scaleX: 1, scaleY: 1 });
  son.volteo();
  volteo = gsap.timeline()
    .to(ap, { rotateY: 60 * dir, y: -6, scale: 0.97, duration: 0.14, ease: 'power2.in' })
    .add(() => { pintarFoco(); aparecerTitular(); })
    .fromTo(ap, { rotateY: -60 * dir }, { rotateY: 0, y: 0, scale: 1, duration: 0.42, ease: 'back.out(1.5)' })
    .fromTo('#fc-ilus', { scale: 0.5, rotate: -14 * dir, y: 14 }, { scale: 1, rotate: 0, y: 0, duration: 0.42, ease: 'back.out(2)' }, '<0.04')
    .fromTo('#fc-etq', { scale: 0.5, rotate: -30 }, { scale: 1, rotate: -9, duration: 0.36, ease: 'back.out(2.4)' }, '<0.08');
  const ins = $('#fc-insignia');
  if (!ins.hidden) volteo.fromTo(ins, { scale: 0 }, { scale: 1, duration: 0.35, ease: 'back.out(2.4)' }, '<0.1');
}
// rellena la carta con la actividad elegida (sin rehacer el esqueleto: las animaciones apuntan siempre a lo mismo)
function pintarFoco() {
  const d = estado.inicio; if (!d) return;
  const a = ACTIVIDADES[portada.foco], c = contenidoCarta(a, d);
  $('#foco-carta').className = `foco-carta a-${a.id}${c.off ? ' apagada' : ''}`;
  $('#fc-ilus').innerHTML = ICONOS[a.id];
  $('#fc-etq').textContent = c.etq;
  const ins = $('#fc-insignia'); ins.hidden = !c.insignia; if (c.insignia) { ins.dataset.n = c.insignia; ins.textContent = mil(c.insignia); }
  $('#antetitulo').textContent = c.ante; $('#h1').innerHTML = c.h1; partirLetras($('#h1')); $('#pie-titular').textContent = c.pie;
  // la línea corta de las fichas de antes («5 palabras · 0 piezas», «836 de 836»); en el repaso ya lo dicen el titular y el pie
  $('#fc-extra').innerHTML = (c.sub && a.id !== 'repaso' ? `<div class="fc-sub">${c.sub}</div>` : '') + (c.barra != null ? `<div class="c-barra"><i style="width:${Math.max(4, Math.min(100, c.barra * 100)).toFixed(1)}%"></i></div>` : '');
  const b = $('#cta-foco'); b.disabled = !!c.off; b.innerHTML = `${esc(c.cta)} <kbd>↵</kbd>${c.insignia ? `<span class="cta-insignia">${mil(c.insignia)}</span>` : ''}`;
  pintarPildoraModo(!!c.modo);
  encajarH1();
}
// la carta se inclina hacia el puntero con brillo especular (como las fichas de siempre), y su ventana también la abre
function enlazarFoco() {
  const el = $('#foco-carta'), cuerpo = $('.fc-cuerpo', el);
  const rx = gsap.quickTo(cuerpo, '--rx', { duration: 0.5, ease: 'power3' }), ry = gsap.quickTo(cuerpo, '--ry', { duration: 0.5, ease: 'power3' });
  el.addEventListener('pointermove', (e) => {
    if (quieto()) return;
    const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    rx((0.5 - y) * 7); ry((x - 0.5) * 9);
    cuerpo.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`); cuerpo.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
  });
  el.addEventListener('pointerenter', () => gsap.to(cuerpo, { '--alza': 1, '--luz': 1, duration: 0.25, ease: 'power3.out', overwrite: 'auto' }));
  el.addEventListener('pointerleave', () => { rx(0); ry(0); gsap.to(cuerpo, { '--alza': 0, '--luz': 0, duration: 0.3, ease: 'power3.out', overwrite: 'auto' }); });
  $('#fc-ventana').addEventListener('click', () => {
    if (!quieto()) gsap.timeline().to('#fc-ilus', { scale: 0.9, duration: 0.08 }).to('#fc-ilus', { scale: 1, duration: 0.3, ease: 'back.out(2.4)' });
    abrirFoco();
  });
}
enlazarFoco();

// el titular: letra a letra, como pegatinas que caen en su sitio
function partirLetras(el) {
  const andar = (n) => {
    [...n.childNodes].forEach((h) => {
      if (h.nodeType === 3) {
        const frag = document.createDocumentFragment();
        h.textContent.split(/(\s+)/).forEach((trozo) => {
          if (!trozo) return;
          if (/^\s+$/.test(trozo)) { frag.appendChild(document.createTextNode(' ')); return; }
          const w = document.createElement('span'); w.className = 'w';
          [...trozo].forEach((ch) => { const l = document.createElement('span'); l.className = 'l'; l.textContent = ch; w.appendChild(l); });
          frag.appendChild(w);
        });
        h.replaceWith(frag);
      } else if (h.nodeType === 1) andar(h);
    });
  };
  andar(el);
}
function aparecerTitular(retraso = 0) {
  if (quieto()) return gsap.fromTo('#titular > *', { opacity: 0 }, { opacity: 1, duration: 0.4, delay: retraso });
  $$('#fc-extra .c-barra i').forEach((i) => gsap.fromTo(i, { width: '0%' }, { width: i.style.width, duration: 0.6, delay: retraso + 0.25, ease: 'power3.out' }));
  return gsap.timeline({ delay: retraso })
    .fromTo('#antetitulo', { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'power3.out' }, 0)
    .fromTo('#h1 .l', { y: 24, opacity: 0, rotate: () => gsap.utils.random(-8, 8) }, { y: 0, opacity: 1, rotate: 0, duration: 0.38, stagger: { each: 0.012, amount: 0.22 }, ease: 'back.out(1.8)' }, 0.04)
    .fromTo('#pie-titular', { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'power2.out' }, 0.18)
    .fromTo('#fc-extra', { x: -8, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3, ease: 'power3.out' }, 0.2)
    .fromTo('#cta-foco', { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'back.out(1.6)' }, 0.22)
    .fromTo('#modo-pill', { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'power3.out' }, 0.3);
}
// pastilla con el modo de repaso (abre los ajustes); solo con el repaso elegido
function pintarPildoraModo(si) {
  const p = $('#modo-pill'); if (!p) return;
  p.hidden = !si;
  const m = modoDe(modoActual());
  p.innerHTML = `<span>${t('app.modo')}</span><b><i>${m.jp}</i>${esc(m.nombre)}</b>${kbd('A')}`;
  p.title = t('app.modo.tit', { modo: m.nombre });
}
addEventListener('kd:modo', () => {
  if (actual !== 'inicio' || !estado.inicio) return;
  const c = contenidoCarta(ACTIVIDADES[portada.foco], estado.inicio);
  $('#pie-titular').textContent = c.pie; pintarPildoraModo(!!c.modo);
  if (c.modo) gsap.fromTo('#modo-pill', { scale: 1.2 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.35)' });
});
// como mucho dos líneas: los títulos largos (lecciones de gramática) bajan de talla en vez de estirar la carta
function encajarH1() {
  const h1 = $('#h1'); h1.style.fontSize = '';
  for (let k = 0, t; k < 5 && (h1.offsetHeight > (t = parseFloat(getComputedStyle(h1).fontSize)) * 2.6 || h1.scrollWidth > h1.clientWidth + 2); k++) h1.style.fontSize = `${Math.round(t * 0.87)}px`;
}
function titular(animar) {
  if (!estado.inicio) return;
  if (animar) voltearCarta(1); else pintarFoco();
}
function abrirFoco() {
  const a = ACTIVIDADES[portada.foco], c = contenidoCarta(a, estado.inicio);
  if (c.off) {
    estado.mochi?.apenado();
    gsap.fromTo('#cta-foco', { x: -6 }, { x: 0, duration: 0.35, ease: 'elastic.out(1, 0.4)' });
    if (!quieto()) gsap.fromTo('#foco-carta .fc-apoyo', { rotate: -1.5 }, { rotate: 0, duration: 0.4, ease: 'elastic.out(1, 0.4)' });
    return;
  }
  gsap.timeline().to('#cta-foco', { scaleX: 1.05, scaleY: 0.93, duration: 0.08 }).to('#cta-foco', { scaleX: 1, scaleY: 1, duration: 0.3, ease: 'back.out(2.4)' });
  if (!quieto()) gsap.timeline().to('#foco-carta .fc-apoyo', { scaleY: 0.98, scaleX: 1.015, duration: 0.09 }).to('#foco-carta .fc-apoyo', { scaleX: 1, scaleY: 1, duration: 0.3, ease: 'back.out(2.4)' });
  chispas($('#cta-foco'), { n: 16 });
  son.abrir();
  setTimeout(() => { location.hash = (c.ir || a.ir).slice(1); }, 140);
}

// ── estado: racha y barra de XP ──
function htmlBarraXP(xp) {
  const nv = nivelDe(xp);
  return `<b class="bx-nivel"><small>${t('app.xp.nivel')}</small><span>${nv.L}</span></b>
    <div class="bx-cuerpo"><div class="bx-tubo"><i class="bx-lleno" style="width:${(nv.pct * 100).toFixed(1)}%"></i></div>
    <div class="bx-txt"><span><b class="bx-num">${mil(nv.dentro)}</b> / ${mil(nv.need)} XP</span><em>${t('app.xp.faltan', { n: mil(nv.need - nv.dentro) })}</em></div></div>`;
}
function pintarEstado(d) {
  $('#estado').innerHTML = `<button class="chapa teclas" id="btn-atajos" title="${t('app.atajos.tit')}" aria-label="${t('app.atajos')}"><kbd>?</kbd></button>
    <div class="chapa racha${d.racha ? ' viva' : ''}" title="${t('app.racha.tit')}"><b class="racha-b">${CARITA_NYAN}<em>${d.racha}</em></b><span>${tn('app.racha.dias', d.racha)}</span></div>
    <div class="barra-xp" id="barra-xp" title="${t('app.xp.tit')}">${htmlBarraXP(d.xp)}</div>`;
  $('#btn-atajos').onclick = () => abrirHoja('inicio');
}
// sube la barra de XP (la de la portada o cualquier .barra-xp con id barra-xp) contando los números
export function actualizarBarraXP(xp, { desde = null } = {}) {
  const el = $('#barra-xp'); if (!el) return;
  const antes = desde ?? (estado.inicio?.xp ?? xp);
  if (estado.inicio) estado.inicio.xp = xp;
  const o = { v: antes };
  el.classList.remove('late'); void el.offsetWidth; el.classList.add('late');
  gsap.to(o, { v: xp, duration: quieto() ? 0 : 0.9, ease: 'power2.out', onUpdate: () => {
    const nv = nivelDe(o.v);
    $('.bx-nivel span', el).textContent = nv.L; $('.bx-lleno', el).style.width = `${(nv.pct * 100).toFixed(1)}%`;
    $('.bx-num', el).textContent = mil(nv.dentro); $('.bx-txt span', el).lastChild.textContent = ` / ${mil(nv.need)} XP`;
    $('.bx-txt em', el).textContent = t('app.xp.faltan', { n: mil(nv.need - nv.dentro) });
  } });
}

// ── motas de polvo en la luz ──
function sembrarMotas() {
  const c = $('#motas'); if (!c || c.children.length) return;
  c.innerHTML = Array.from({ length: 18 }, () => {
    const t = 1.5 + Math.random() * 2.5;
    return `<i style="left:${(28 + Math.random() * 44).toFixed(1)}%;top:${(22 + Math.random() * 46).toFixed(1)}%;--t:${t.toFixed(1)}px;--d:${(11 + Math.random() * 12).toFixed(1)}s;--r:${(-Math.random() * 20).toFixed(1)}s;--dx:${(Math.random() * 80 - 40).toFixed(0)}px;--dy:${(-60 - Math.random() * 120).toFixed(0)}px;--o:${(0.3 + Math.random() * 0.5).toFixed(2)}"></i>`;
  }).join('');
}

// ── entrada coreografiada de la portada ──
let primeraEntrada = true;
function entradaPortada() {
  if (quieto()) { gsap.fromTo(['.barra', '#foco', '#hud-juego', '#muelle'], { opacity: 0 }, { opacity: 1, duration: 0.5 }); aparecerTitular(0.1); return; }
  const tl = gsap.timeline({ delay: primeraEntrada ? 0 : 0.32 });
  if (primeraEntrada) tl.fromTo('.habitacion', { opacity: 0 }, { opacity: 1, duration: 0.7, ease: 'power1.out' }, 0);
  // el logotipo cae letra a letra y se aplasta al tocar suelo
  $$('.logo-jp b').forEach((b, n) => {
    tl.fromTo(b, { y: -60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'power2.in' }, 0.1 + n * 0.06)
      .to(b, { scaleY: 0.82, scaleX: 1.12, duration: 0.06, transformOrigin: '50% 100%', ease: 'power1.out' }, '>')
      .to(b, { scaleY: 1, scaleX: 1, duration: 0.36, ease: 'back.out(2.2)' }, '>');
  });
  const sel = (el) => el.closest('[aria-selected="true"]');
  tl.fromTo('.logo-es', { y: 12, opacity: 0, scale: 0.6 }, { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(2)' }, 0.4)
    .fromTo(['.pildora', '.estado > *'], { y: -24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease: 'power3.out' }, 0.1)
    // el muelle sube desde abajo y sus fichas brotan una a una; el platito de la elegida llega el último
    .fromTo('#muelle', { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'power3.out' }, 0.15)
    .fromTo('#muelle .m-ficha', { scale: 0.4, y: 16, opacity: 0 },
      { scale: (i, el) => (sel(el) ? 1.06 : 1), y: (i, el) => (sel(el) ? -4 : 0), opacity: 1, duration: 0.4, stagger: 0.03, ease: 'back.out(1.8)' }, 0.3)
    .fromTo('#muelle .m-nombre', { y: 6, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, stagger: 0.025, ease: 'power3.out' }, 0.45)
    .fromTo('#muelle .m-selector', { scaleX: 0.6, scaleY: 0.6, opacity: 0 }, { scaleX: 1, scaleY: 1, opacity: 1, duration: 0.4, ease: 'back.out(1.8)' }, 0.55)
    // la carta sube desde abajo y se asienta
    .fromTo('#foco-carta .fc-apoyo', { y: 48, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }, 0.2)
    .fromTo('#fc-ilus', { scale: 0.6, rotate: -12 }, { scale: 1, rotate: 0, duration: 0.45, ease: 'back.out(2)' }, 0.45)
    .fromTo('#fc-etq', { scale: 0.5, rotate: -30 }, { scale: 1, rotate: -9, duration: 0.4, ease: 'back.out(2.4)' }, 0.55)
    .fromTo('#hud-juego', { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out' }, 0.35)
    .add(aparecerTitular(), 0.4);
  if ($('#muelle .m-insignia')) tl.fromTo('#muelle .m-insignia', { scale: 0 }, { scale: 1, duration: 0.35, stagger: 0.05, ease: 'back.out(2.4)' }, 0.7);
  // los números cuentan
  $$('.m-insignia, #fc-insignia:not([hidden])').forEach((b) => { const o = { v: 0 }, n = +b.dataset.n; tl.to(o, { v: n, duration: 0.8, ease: 'power2.out', onUpdate: () => { b.textContent = mil(o.v); } }, 0.6); });
  const xp = estado.inicio.xp, lleno = $('#barra-xp .bx-lleno'), num = $('#barra-xp .bx-num');
  if (lleno) {
    const nv = nivelDe(xp), o = { v: 0 };
    lleno.style.width = '0%';
    tl.to(o, { v: nv.dentro, duration: 0.9, ease: 'power3.out', onUpdate: () => { lleno.style.width = `${Math.max(3, (o.v / nv.need) * 100).toFixed(1)}%`; num.textContent = mil(o.v); } }, 0.4);
  }
  primeraEntrada = false;
}

// de vez en cuando, lo más urgente da un saltito para llamar la atención: su ficha del muelle o, si ya está elegida, el botón
let llamada = null;
function llamarAtencion() {
  llamada?.kill();
  llamada = gsap.delayedCall(6 + Math.random() * 4, () => {
    const d = estado.inicio;
    if (actual === 'inicio' && d && !quieto()) {
      const i = d.repasos_ahora ? 0 : d.leccion.palabras.length ? 1 : -1;
      if (i >= 0 && portada.foco === i && !$('#cta-foco').matches(':hover')) {
        gsap.timeline()
          .to('#cta-foco', { scaleY: 0.9, scaleX: 1.05, duration: 0.1, ease: 'power2.out' })
          .to('#cta-foco', { y: -12, scaleY: 1.05, scaleX: 0.97, duration: 0.22, ease: 'power2.out' })
          .to('#cta-foco', { y: 0, scaleY: 1, scaleX: 1, duration: 0.6, ease: 'bounce.out' });
      }
      const it = i >= 0 && portada.foco !== i ? $(`.m-item[data-i="${i}"]`) : null;
      if (it && !it.matches(':hover')) {
        const f = $('.m-ficha', it);
        gsap.timeline()
          .to(f, { scaleY: 0.86, scaleX: 1.1, duration: 0.12, ease: 'power2.out' })
          .to(f, { y: -22, scaleY: 1.08, scaleX: 0.94, rotate: -8, duration: 0.26, ease: 'power2.out' })
          .to(f, { y: 0, scaleY: 1, scaleX: 1, rotate: 0, duration: 0.75, ease: 'bounce.out' });
      }
    }
    llamarAtencion();
  });
}

// el chip de koban del HUD, al ganar alguno fuera de recompensas.js (enseñarle a Nyan): cuenta y da un botecito
function ponerKoban(n) {
  const b = $('#hud-juego .rc-num-koban'); if (!b) return;
  const o = { v: +String(b.textContent).replace(/\D/g, '') || 0 };
  gsap.to(o, { v: n, duration: 0.6, ease: 'power2.out', onUpdate: () => { b.textContent = mil(o.v); } });
  if (!quieto()) gsap.fromTo(b.closest('.rc-chip'), { scale: 1.12 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
}

// ── HUD del juego (misiones, bolsas, koban): lo pinta recompensas.js ──
async function montarHud(d) {
  const hud = $('#hud-juego');
  try {
    const m = await import('./recompensas.js');
    if (typeof m.montarInicio === 'function') await m.montarInicio(hud, d);
    decorarMochi(m.juegoActual?.());
  } catch (e) { console.warn('HUD de juego no disponible todavía:', e); }
}
// Mochi de la portada (y del inventario, que le presta el lienzo): se crea una vez, con lo que te has quitado y los sitios
// que has elegido para los objetos de la sala
export function asegurarMochi(d, j = null) {
  if (!estado.mochi) {
    estado.mochi = new Mascota($('#mundo3d'), { equipo: d.mochi.equipo_visto || 0 });
    estado.mochi.ponerSitios?.(d.mochi.sitios);
    if (j) decorarMochi(j); else estado.mochi.decorar?.([]);
  }
  estado.mochi.quitarEquipo?.(d.mochi.quitado || []);
  return estado.mochi;
}
// el inventario usa LA MISMA sala 3D que la portada: se le presta el lienzo y vuelve a su sitio al salir
export function prestarSala(destino) {
  const c = $('#mundo3d'); if (!c || c.parentElement === destino) return;
  destino.appendChild(c); estado.mochi?.mirarVista?.(); estado.mochi?.encuadrar?.(0); estado.mochi?.despertar?.();
}
export function devolverSala() {
  const c = $('#mundo3d'), v = $('#v-inicio'); if (!c || c.parentElement === v) return;
  v.insertBefore(c, $('#motas', v)); estado.mochi?.soltarGiro?.(); estado.mochi?.mirarVista?.();
}
// la habitación 3D de Mochi enseña lo que has colocado de tu colección: objetos en el cuarto, el accesorio y la ropa puestos
let decoMochi = null;
export function decorarMochi(j) {
  const m = estado.mochi; if (!m?.decorar || !j) return;
  const ids = j.colocados || [], firma = ids.join(','); if (firma === decoMochi) return; decoMochi = firma;
  const tipo = (id) => (j.catalogo?.objetos || []).find((o) => o.id === id)?.tipo;
  m.decorar(ids.filter((id) => !['accesorio', 'ropa', 'aura'].includes(tipo(id))));
  m.accesorio?.(ids.find((id) => tipo(id) === 'accesorio') || null);
  m.ropa?.(ids.find((id) => tipo(id) === 'ropa') || null);
  m.auraColeccion?.(ids.find((id) => tipo(id) === 'aura') || null);
}
addEventListener('rc:juego', (e) => decorarMochi(e.detail));

// ── progreso que llega de otro ordenador (complemento de Anki: «nyango:progreso» tras fusionar, «nyango:sincro» si hay que preguntar) ──
// En la portada se repinta en su sitio (cartas, racha, XP, HUD y Mochi). En otra vista no se toca nada: repasos, lecciones y
// combates siguen con lo suyo y, al volver a la portada, entrar() ya lo pide todo nuevo. Con una ventana encima, se espera.
let progresoViejo = false, vigia = null, entradaT = 0;
function alSincro(e) {
  if (e?.type === 'nyango:progreso') progresoViejo = true;
  if (!vigia) vigia = setInterval(probarSincro, 1500);
  probarSincro();
}
async function probarSincro() {
  if (actual !== 'inicio' || !estado.inicio || capaAbierta() || $('.modal-capa') || performance.now() - entradaT < 2600) return;
  clearInterval(vigia); vigia = null;
  const e = await pedirSincro();
  if (e?.pregunta && actual === 'inicio' && !capaAbierta() && !$('.modal-capa')) { preguntarUnion(e); return; }
  if (progresoViejo) { progresoViejo = false; await refrescarPortada(); }
}
async function refrescarPortada() {
  const antes = estado.inicio.xp;
  let d;
  try { d = await api('/api/inicio'); } catch (err) { console.warn('No se pudo refrescar la portada', err); return; }
  if (actual !== 'inicio') return;
  estado.inicio = d;
  const racha = $('#estado .racha');
  if (racha) { racha.classList.toggle('viva', !!d.racha); $('b', racha).innerHTML = `${CARITA_NYAN}<em>${d.racha}</em>`; $('span', racha).textContent = tn('app.racha.dias', d.racha); }
  pintarMuelle(d); titular(false); datosCharla(d);
  if (d.xp !== antes) actualizarBarraXP(d.xp, { desde: antes });
  estado.mochi?.equipar?.(d.mochi.equipo_visto || 0, false);
  montarHud(d);
  if (!quieto()) gsap.fromTo(['#foco-carta .fc-apoyo', '#cta-foco'], { scale: 0.94 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.45)' });
}
addEventListener('nyango:progreso', alSincro);
addEventListener('nyango:sincro', alSincro);
// llega progreso del móvil por el enlace (motor/enlace.js): se repinta la portada como con el complemento de Anki
addEventListener('nyango:sincronizado', (e) => { if (e.detail?.cambios) alSincro({ type: 'nyango:progreso' }); });

registrar('inicio', {
  seccion: '#v-inicio',
  async entrar() {
    progresoViejo = false; entradaT = performance.now(); // lo que llegue a partir de aquí sí hará falta repintarlo
    devolverSala(); // si venía del inventario, el lienzo de la sala vuelve a la portada
    // la primera vez, lo colocado de la colección llega junto a /api/inicio y Mochi nace ya decorado:
    // una sola compilación de materiales en vez de un segundo parón al llegar el HUD
    const [d, j] = await Promise.all([api('/api/inicio'), estado.mochi ? null : api('/api/juego').catch(() => null)]);
    estado.inicio = d;
    adoptarTemaDelMotor(d.ajustes);
    aplicarSonido(); son.musica(true);
    asegurarMochi(d, j);
    if (portada.foco === 0 && !d.repasos_ahora && d.leccion.palabras.length) portada.foco = 1;
    // quien empieza de cero (nada aprendido y sin el hiragana) arranca en los kana
    if (portada.foco <= 1 && !d.cuenta?.aprendidos && (d.kana?.hiragana || 0) < 46) portada.foco = ACTIVIDADES.findIndex((a) => a.id === 'kana');
    pintarEstado(d); pintarMuelle(d);
    titular(false);
    estado.mochi.encuadrar?.(desvioPortada());
    empezarCharla(estado.mochi, d, { api, flotar, koban: ponerKoban });
    sembrarMotas();
    montarHud(d);
    entradaPortada();
    llamarAtencion();
    // 02-10: quien llega nuevo (sin perfil, sin nada aprendido y sin Anki detrás) conoce a Nyan: bienvenida, nivel y tour
    const nuevo = !d.perfil?.hecho && !d.cuenta?.aprendidos && !(d.herencia?.repasos || d.herencia?.items);
    if (nuevo) setTimeout(() => { if (actual === 'inicio' && !$('.modal-capa')) import('./bienvenida.js').then((b) => b.bienvenida(estado.inicio, estado.mochi)).catch((e) => console.error(e)); }, 1200);
    else if (d.herencia && !d.herencia.cobrada) setTimeout(() => { if (actual === 'inicio' && !$('.modal-capa')) herencia(d); }, 1100);
    else if (d.equipo > (d.mochi.equipo_visto || 0)) setTimeout(() => nuevoEquipo(d), 900);
    else setTimeout(() => estado.mochi?.saludar(), 700);
  },
  // la barra de la portada suelta su id al salir para que otra vista pueda tener su propia #barra-xp
  salir() { $('#barra-xp')?.removeAttribute('id'); llamada?.kill(); son.musica(false); pararCharla(); },
});
addEventListener('nyango:tema', () => { if (estado.inicio && actual === 'inicio') requestAnimationFrame(() => moverSelector(false)); });
addEventListener('resize', () => { if (estado.inicio && actual === 'inicio') { moverSelector(false); encajarH1(); estado.mochi?.encuadrar?.(desvioPortada()); } });
$('#cta-foco').onclick = () => abrirFoco();
addEventListener('keydown', (e) => {
  son.iniciar();
  if (actual !== 'inicio' || e.defaultPrevented || escribiendo(e) || capaAbierta() || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 'ArrowLeft') { e.preventDefault(); enfocar(portada.foco - 1); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); enfocar(portada.foco + 1); }
  else if (/^[1-9]$/.test(e.key)) { e.preventDefault(); if (+e.key - 1 !== portada.foco) enfocar(+e.key - 1); }
  // Intro/Espacio abren la actividad elegida, salvo que el foco esté en otro botón o enlace (que hace lo suyo)
  else if (e.key === 'Enter' || e.key === ' ') { if (sobreControl(e)) return; e.preventDefault(); abrirFoco(); }
});
addEventListener('pointerdown', () => son.iniciar(), { once: true });

// ── herencia de Anki: la primera vez, Mochi se equipa con lo que ya sabías ──
// lo que una persona nueva no sabe todavía: el orden de las lecciones, los rangos, koban y 福袋, y el teclado
const CLAVES = `<ul class="m-claves">
  <li>${t('app.claves.lecciones')}</li>
  <li>${t('app.claves.repasos')}</li>
  <li>${t('app.claves.misiones')}</li>
  <li>${t('app.claves.teclado', { intro: kbd('Intro'), ayuda: kbd('?') })}</li></ul>`;
const NO_AFILIADO = () => t('comun.no_afiliado', { kaishi: '<a href="https://github.com/donkuri/kaishi" target="_blank" rel="noopener">Kaishi 1.5k</a>' });
// si Anki no trae nada (0 repasos y 0 tarjetas), en vez del legado sale una bienvenida corta que lleva a la primera lección
function bienvenida(d) {
  const capa = document.createElement('div');
  capa.className = 'modal-capa'; capa.setAttribute('role', 'dialog'); capa.setAttribute('aria-modal', 'true'); capa.setAttribute('aria-labelledby', 'h-tit');
  const conLeccion = d.leccion.palabras.length > 0;
  capa.innerHTML = `<div class="modal-ficha m-ancha"><span class="m-sello">ようこそ</span>
    <div class="m-ante">${t('app.bienvenida.ante')}</div>
    <h2 id="h-tit">${t('app.bienvenida.tit')}</h2>
    <p>${t('app.bienvenida.p')}</p>${CLAVES}
    <div class="tk-acciones"><button class="boton-claro" id="h-no">${t('app.bienvenida.portada')} <kbd>Esc</kbd></button>${conLeccion ? `<button class="boton-tinta" id="h-ok">${t('app.cta.leccion')} <kbd>↵</kbd></button>` : ''}</div></div>`;
  document.body.appendChild(capa);
  const ficha = capa.firstElementChild;
  gsap.fromTo(capa, { opacity: 0 }, { opacity: 1, duration: 0.2 });
  gsap.fromTo(ficha, { y: 32, scale: 0.94 }, { y: 0, scale: 1, duration: 0.42, ease: 'power3.out' });
  gsap.fromTo($('.m-sello', ficha), { scale: 1.8, opacity: 0, rotate: 14 }, { scale: 1, opacity: 1, rotate: -6, duration: 0.35, delay: 0.25, ease: 'back.out(2.2)' });
  let hecho = false;
  const cerrar = async (aLeccion) => {
    if (hecho) return; hecho = true;
    removeEventListener('keydown', tecla);
    api('/api/herencia', {}).catch(() => {}); // sin nada que heredar: solo la marca como vista
    son.toque();
    await gsap.to(ficha, { y: 16, scale: 0.96, opacity: 0, duration: 0.2, ease: 'power2.in' });
    await gsap.to(capa, { opacity: 0, duration: 0.15 });
    capa.remove();
    if (aLeccion && conLeccion) location.hash = 'estudio/leccion';
    else estado.mochi?.saludar();
  };
  const tecla = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); cerrar(false); }
    else if (e.key === 'Enter' && !sobreControl(e)) { e.preventDefault(); cerrar(conLeccion); }
  };
  $('#h-no', capa).onclick = () => cerrar(false);
  if (conLeccion) $('#h-ok', capa).onclick = () => cerrar(true);
  addEventListener('keydown', tecla);
}
async function herencia(d) {
  const h = d.herencia;
  if (!h.repasos && !h.items) return bienvenida(d);
  const capa = document.createElement('div');
  capa.className = 'modal-capa'; capa.setAttribute('role', 'dialog'); capa.setAttribute('aria-modal', 'true'); capa.setAttribute('aria-labelledby', 'h-tit');
  capa.innerHTML = `<div class="modal-ficha m-ancha"><span class="m-sello">お帰り</span>
    <div class="m-ante">${t('app.herencia.ante')}</div>
    <h2 id="h-tit">${t('app.herencia.tit')}</h2>
    <p>${t('app.herencia.p', { repasos: `<b>${mil(h.repasos)}</b>`, items: `<b>${mil(h.items)}</b>` })}</p>
    <p class="m-nota">${NO_AFILIADO()}</p>${CLAVES}
    <div class="m-cifra" id="h-xp">+0 XP</div>
    <button class="boton-tinta" id="h-ok" style="margin-top:24px">${t('app.herencia.cobrar')} <kbd>↵</kbd></button></div>`;
  document.body.appendChild(capa);
  const ficha = capa.firstElementChild;
  gsap.fromTo(capa, { opacity: 0 }, { opacity: 1, duration: 0.2 });
  gsap.fromTo(ficha, { y: 32, scale: 0.94 }, { y: 0, scale: 1, duration: 0.42, ease: 'power3.out' });
  gsap.fromTo($('.m-sello', ficha), { scale: 1.8, opacity: 0, rotate: 14 }, { scale: 1, opacity: 1, rotate: -6, duration: 0.35, delay: 0.25, ease: 'back.out(2.2)' });
  const cobrar = async () => {
    if ($('#h-ok', capa).disabled) return;
    $('#h-ok', capa).disabled = true;
    const r = await api('/api/herencia', {});
    const obj = { v: 0 };
    son.taiko();
    gsap.fromTo('#h-xp', { scale: 1 }, { scale: 1.25, duration: 0.25, yoyo: true, repeat: 5, ease: 'power1.inOut' });
    await gsap.to(obj, { v: r.xp, duration: 1.5, ease: 'power2.out', onUpdate: () => { $('#h-xp', capa).textContent = '+' + mil(obj.v) + ' XP'; } });
    await espera(500);
    await gsap.to(ficha, { y: 16, scale: 0.96, opacity: 0, duration: 0.2, ease: 'power2.in' });
    await gsap.to(capa, { opacity: 0, duration: 0.15 });
    capa.remove(); removeEventListener('keydown', tecla);
    const antes = estado.inicio.xp;
    estado.inicio = await api('/api/inicio'); pintarMuelle(estado.inicio); titular(false); aparecerTitular();
    gsap.fromTo('#muelle .m-ficha', { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.7, stagger: 0.06, ease: 'back.out(2)' });
    actualizarBarraXP(estado.inicio.xp, { desde: antes });
    nuevoEquipo(estado.inicio);
  };
  // Intro cobra el legado, salvo con el foco en el enlace de Kaishi (entonces lo abre, como cualquier enlace)
  const tecla = (e) => { if (e.key === 'Enter' && !e.target?.closest?.('a[href]')) { e.preventDefault(); cobrar(); } };
  $('#h-ok', capa).onclick = cobrar; addEventListener('keydown', tecla);
}
// Mochi se pone las piezas nuevas de una en una
export async function nuevoEquipo(d) {
  const desde = d.mochi.equipo_visto || 0;
  for (let n = desde + 1; n <= d.equipo; n++) {
    const pieza = d.equipo_lista[n - 1];
    estado.mochi.equipar(n, true); son.fanfarria();
    aviso({ jp: '装備', es: pieza.nombre, sub: pieza.hito, color: 'var(--boton)', dur: 1.7 });
    await espera(2700);
  }
  await api('/api/ajustes', { equipo_visto: d.equipo });
  d.mochi.equipo_visto = d.equipo;
}

// ── latido: abierto desde el icono (nyango.pyw), el servidor se apaga solo cuando no queda ninguna ventana de Nyango ──
const latir = () => fetch('/api/latido', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).catch(() => {});
latir(); setInterval(latir, 30000);
addEventListener('pageshow', latir);
addEventListener('pagehide', () => { try { navigator.sendBeacon('/api/adios', new Blob(['{}'], { type: 'application/json' })); } catch {} });

// ── pantalla de carga (index.html, herramientas/intro_nyan.mjs): el reparto corre por el prado mientras se CALIENTA todo lo que daría
// tirones la primera vez que se usa, para que luego la app vaya fluida (30-09):
// · el sonido: al primer audio, WebKitGTK arranca GStreamer (en el AppImage rastrea sus plugins: segundos con todo parado);
// · decodificar audio (WebAudio también pasa por GStreamer) y las tipografías con japonés;
// · la sala 3D con sus shaders compilados (estado.mochi.listo).
// Mínimo, una vuelta entera de la carrera (4,5 s); máximo, 20 s pase lo que pase ──
// Las letras del tema en uso (--f-titulo, --f-texto, --f-jp y --f-kaisho, con sus pesos: 800 va a la cara 900 de Zen Maru) y los kanji del mazo con las
// de los kanji grandes (Klee One: el mapa de kanji y las tarjetas) y las de la interfaz: vienen troceadas en ~120 archivos por grosor y, sin esto, la primera
// vez que sale cada kanji se pedía su trozo y el texto aparecía con la letra de reserva y cambiaba. Las de los otros temas se piden al cambiar (tema.js).
// OJO: WebKitGTK REINICIA el estado de todas las caras (vuelven a «sin cargar») cuando la hoja de estilos cambia por debajo (medido el 15-10: a la vez que
// esto cargaba, los módulos añadían sus hojas y de ~170 caras quedaban ~14). Por eso se vuelve a llamar justo antes de quitar la pantalla de carga: con los
// datos ya en la memoria de WebKit tarda milisegundos.
let kanjiMazo = null;
function letrasDelTema() {
  if (!document.fonts?.load) return Promise.resolve();
  const muestra = 'あいうえおアイウエオ日本語漢字学習 AaBbÑñ 0123';
  const fam = (v) => (getComputedStyle(document.documentElement).getPropertyValue(v) || '').trim();
  const cargar = (lista, txt) => Promise.all(lista.map(([peso, v]) => document.fonts.load(`${peso} ${fam(v)}`, txt).catch(() => [])));
  const base = cargar([['700 20px', '--f-titulo'], ['400 16px', '--f-texto'], ['700 16px', '--f-texto'], ['800 16px', '--f-texto'], ['500 20px', '--f-jp'], ['600 20px', '--f-kaisho']], muestra);
  const peso = (fam('--peso-titulo') || '700');   // el grosor del título cambia con el tema (400 en Washi y Pop, 700 en Noche, 800 en Sumi)
  const kanjis = (kanjiMazo ? Promise.resolve(kanjiMazo) : api('/api/kanji').then((l) => (kanjiMazo = l.map((k) => k.k).join(''))))
    .then((txt) => cargar([['600 24px', '--f-kaisho'], ['700 20px', '--f-texto'], ['500 20px', '--f-jp'], ['800 16px', '--f-texto'], [`${peso} 26px`, '--f-titulo']], txt));
  return Promise.all([base, kanjis]);
}
function calentar() {
  const tope = (p, ms) => Promise.race([Promise.resolve(p).catch(() => {}), espera(ms)]);
  // el audio, en el MISMO AudioContext de toda la app (sonido.js): arrancarlo y descodificar un sonido ya despierta GStreamer.
  // (Antes aquí se abría otro AudioContext y un <audio> mudo: el mezclador del sistema veía «nyango» dos veces.)
  const sonido = tope(son.cargarAudio('sonidos/nyan/nyaa-0.mp3'), 12000);
  const decodificar = tope(son.cargarAudio('sonidos/nyan/nyaa-1.mp3'), 12000);
  const fuentes = tope(letrasDelTema(), 20000);
  return Promise.all([sonido, decodificar, fuentes]);
}
const calentando = document.getElementById('intro') ? calentar() : Promise.resolve();
async function quitarIntro() {
  const el = document.getElementById('intro'); if (!el || el.dataset.saliendo) return;
  el.dataset.saliendo = '1';
  // al menos 5 s de pantalla de carga VISIBLE (desde que se pintó, no desde que se abrió la ventana): que se aprecie la carrera
  const minimo = espera(Math.max(0, (window.__intro?.pintada ?? performance.now()) + 5000 - performance.now()));
  // y la sala 3D con TODA la ropa y los objetos compilados (el inventario va al instante)
  const armario = Promise.resolve(estado.mochi?.listo).then(() => estado.mochi?.precalentarArmario?.()).catch(() => {});
  await Promise.race([Promise.all([minimo, calentando, armario]), espera(20000)]);
  // la hoja de la pantalla de carga vive DENTRO de ella: quitarla reiniciaría otra vez las caras de las letras. Se pasa al <head> (con la pantalla puesta) y
  // se reponen las caras ahora que todas las hojas de los módulos están puestas
  const hojaIntro = el.querySelector('style'); if (hojaIntro) document.head.appendChild(hojaIntro);
  await Promise.race([letrasDelTema().catch(() => {}), espera(4000)]);
  el.classList.add('fuera'); setTimeout(() => el.remove(), 650);
}

// ── arranque: si falta Anki o sus mazos, no hay nada que enseñar (ver arranque.js). Si no, cada módulo se registra solo; si uno falla, los demás siguen ──
comprobarArranque().then((listo) => {
  if (!listo) { quitarIntro(); return; }
  const modulos = ['./estudio.js', './gramatica.js', './clase.js', './lectura.js', './estadisticas.js', './perfil.js', './recompensas.js', './jefe.js', './kana.js', './conjugar-vista.js'];
  Promise.allSettled(modulos.map((m) => import(m))).then((r) => {
    r.forEach((x, i) => { if (x.status === 'rejected') console.error(modulos[i], x.reason); });
    // los atajos globales se registran los últimos: cada vista atiende antes sus propias teclas
    iniciarTeclado({
      vistaActual, navegar: (d) => { location.hash = d; }, abrirAjustes: () => abrirAjustes(),
      abrirBolsas: async () => { try { (await import('./recompensas.js')).abrirBolsas(); } catch (e) { console.warn(e); } },
    });
    ir().finally(quitarIntro);
    setTimeout(() => import('./antiguo.js').then((m) => m.ofrecerProgresoAntiguo()).catch(() => {}), 4000); // escritorio: ¿traer el Nyango de antes?
    alSincro(); // con el complemento: ¿quedó pendiente la pregunta de la primera vez? (en el modo suelto, un 404 y nada más)
  });
});
$('#btn-ajustes')?.addEventListener('click', () => abrirAjustes());
$('#modo-pill')?.addEventListener('click', () => abrirAjustes());
