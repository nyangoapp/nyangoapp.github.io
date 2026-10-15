// Repasar en el móvil: tandas cortas (20 tarjetas), una pregunta por pantalla y todo sin desplazar. Arriba la tarjeta
// (lo que se pregunta), abajo las opciones apiladas al alcance del pulgar y, tras responder, «Siguiente» en el mismo
// sitio. Las falladas vuelven en la misma tanda. Lo que no tiene opciones (algunas de gramática) se autoevalúa:
// «Ver respuesta» → «Lo sabía» / «No lo sabía». Al acabar, la nota y lo ganado, en una sola pantalla.
// La prueba de una lección (leccion.js) usa estas mismas pantallas con prueba(): sin guardar cada respuesta (lo aprendido
// se guarda junto al final) y apuntando los fallos de cada palabra.
import { gsap } from 'gsap';
import { t, tn, num } from '../i18n.js';
import * as son from '../sonido.js';
import { esc, ruby, textoRico, sinFurigana, aKana, normLectura } from '../japones.js';
import { cargarPool, armarOpciones } from '../opciones.js';
import { $, $$, api, vibrar, quieto, CERRAR, CHECK } from './comun.js';

const TANDA = 20;
const RANGOS = ['見習い', '剣士', '侍', '師範', '伝説'];
const NOTAS = { 秀: 'sobresaliente', 優: 'notable', 良: 'bien', 可: 'aprobado' };
let V = null, app = null, s = null, audio = null;

const esJapones = (x) => /[぀-ヿ一-鿿]/.test(x || '');
function tamanoGrande(txt) { const n = [...sinFurigana(txt)].length; return n <= 1 ? 128 : n <= 2 ? 104 : n <= 4 ? 76 : n <= 6 ? 56 : 42; }
// lo que vale como respuesta tecleada: cada solución, en kanji o en lectura (como comprobarGram del escritorio)
const lecturaFurigana = (x) => String(x || '').replace(/( ?)([^ 　>\[\]]+?)\[([^\]]+)\]/g, '$3');
const suena = (x) => normLectura(x).replace(/は/g, 'わ').replace(/を/g, 'お').replace(/へ/g, 'え'); // rōmaji Hepburn: wa, o, e
const validasGram = (xs) => new Set(xs.filter(Boolean).flatMap((x) => [suena(sinFurigana(x)), suena(lecturaFurigana(x))]).filter(Boolean));
const caracter = (it) => (it.tipo === 'vocab' ? it.palabra : it.caracter || it.elemento || '');

// la pregunta de una tarjeta: qué se enseña, qué se pide y sus opciones (o null: se autoevalúa)
function pregunta(q) {
  const it = q.item;
  if (it.tipo === 'gramatica') {
    // «transforma» (completar): sus opciones son todas las respuestas que valen, así que se autoevalúa
    const p = it.pregunta || {}, completar = p.tipo === 'completar', ops = completar ? [] : (p.opciones || []).map(String);
    const buena = typeof p.correcta === 'number' ? p.correcta : ops.indexOf(String(p.correcta ?? ''));
    const respuesta = completar ? String(p.solucion ?? (p.opciones || [])[0] ?? '') : buena >= 0 ? ops[buena] : String(p.correcta ?? p.solucion ?? '');
    const hueco = String(p.jp || '').includes('＿'), frase = ruby(p.jp || '').replace('＿', '<span class="mv-hueco">？</span>');
    // como en el escritorio: en los huecos, o si el nombre del punto contiene la respuesta, el punto no sale hasta responder
    const nombre = `${it.jp || ''} ${it.titulo || ''}`, r0 = sinFurigana(respuesta);
    const delata = hueco || (r0 && nombre.includes(r0));
    // «completar» con respuestas: se teclea (rōmaji → kana) en vez de autoevaluarse. Las de conjugar enseñan también el significado
    const validas = completar ? validasGram([respuesta, ...(p.opciones || []), p.solucion]) : new Set();
    const es = p.es && (hueco || it.conj) ? esc(p.es) : '';
    return { tipo: 'gram', cinta: t(validas.size ? 'mv.rep.gramatica_escribe' : 'mv.rep.gramatica'), titulo: delata || it.conj ? '' : esc(it.jp || it.titulo || ''), enun: es && !it.conj ? '' : ruby(p.enunciado || ''), frase, es,
      teclea: validas.size ? validas : null,
      opciones: ops.length >= 2 && buena >= 0 ? ops.map((x, i) => ({ html: esJapones(x) ? ruby(x) : esc(x), jp: esJapones(x), ok: i === buena })) : null,
      respuesta: esJapones(respuesta) ? ruby(respuesta) : esc(respuesta), explica: textoRico(p.explica || '') };
  }
  const o = armarOpciones(it, q.habilidad, 4);
  const sig = q.habilidad === 'sig';
  return { tipo: it.tipo, cinta: t(sig ? 'mv.rep.significado' : 'mv.rep.lectura'), grande: caracter(it),
    opciones: o ? o.opciones.map((x) => ({ html: esc(x.texto), jp: !sig, ok: x.ok })) : null,
    respuesta: sig ? esc(it.es || it.clave || it.nombre || '') : esc(it.lectura || (it.lecturas || []).map((l) => l.lectura).slice(0, 2).join('、')),
    otra: sig ? esc(it.lectura || '') : esc(it.es || it.clave || it.nombre || '') };
}

function cabecera() {
  const hechas = s.hechas, total = Math.max(s.total, hechas + s.cola.length);
  return `<div class="mv-rep-cab"><button class="mv-icono-btn" data-salir aria-label="${t('mv.salir')}">${CERRAR}</button>
    <div class="mv-barra"><i style="width:${Math.max(4, (100 * hechas) / Math.max(1, total))}%"></i></div>
    <span class="mv-rep-n"><b>${Math.min(hechas + 1, total)}</b> / ${total}</span></div>`;
}
function pintar() {
  const q = s.cola[0]; if (!q) return fin();
  const P = q.P || (q.P = pregunta(q)), r = q.rango ?? 0;
  s.respondida = false; s.t0 = performance.now();
  const centro = P.tipo === 'gram'
    ? `<div class="mv-rep-gram">${P.titulo ? `<small lang="ja">${P.titulo}</small>` : ''}${P.enun ? `<p class="mv-rep-enun">${P.enun}</p>` : ''}${P.frase ? `<div class="mv-rep-frase" lang="ja">${P.frase}</div>` : ''}${P.es ? `<p>${P.es}</p>` : ''}</div>`
    : `<div class="mv-rep-grande" lang="ja" style="font-size:${tamanoGrande(P.grande)}px">${esc(P.grande)}</div>`;
  V.innerHTML = `<div class="mv-rep">${cabecera()}
    <div class="mv-carta mv-rep-carta">
      <span class="mv-rep-tipo" data-tc="${q.item.conj ? 'conj' : q.item.tipo === 'gramatica' ? 'gram' : q.item.tipo || 'vocab'}">${t('mv.tipo.' + (q.item.conj ? 'conjugacion' : q.item.tipo || 'vocab'))}</span>
      ${s.leccion ? `<span class="mv-rep-rango"><i class="nuevo">${t('mv.lec.nueva')}</i></span>` : `<span class="mv-rep-rango"><i style="--rc:var(--r${r})">${RANGOS[r]}</i></span>`}
      ${centro}
      <div class="mv-rep-cinta">${P.cinta}</div>
      <div class="mv-rep-sol" hidden></div></div>
    <div class="mv-rep-ops${P.teclea ? ' teclea' : ''}">${P.opciones ? P.opciones.map((o, i) => `<button class="mv-btn-claro mv-rep-op${o.jp ? ' jp' : ''}" data-i="${i}">${o.html}</button>`).join('')
      : P.teclea ? `<form class="mv-rep-form"><input class="mv-rep-in" lang="ja" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="go" placeholder="${t('gramatica.ej.ph')}" aria-label="${t('gramatica.ej.tu_respuesta')}">
        <button class="mv-btn mv-rep-comprobar">${t('mv.gu.comprobar')}</button></form>`
      : `<button class="mv-btn-claro mv-rep-ver">${t('mv.rep.ver')}</button>`}</div>
    <div class="mv-rep-pie">${P.opciones || P.teclea ? `<button class="mv-rep-nose">${t('mv.rep.no_se')}</button>` : ''}</div></div>`;
  enlazar(q, P);
  if (!quieto()) {
    gsap.fromTo($('.mv-rep-carta', V), { y: 26, opacity: 0, scale: 0.97 }, { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.6)' });
    gsap.fromTo($$('.mv-rep-op', V), { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, stagger: 0.04, delay: 0.08, ease: 'back.out(1.8)' });
  }
}
function enlazar(q, P) {
  $('[data-salir]', V).onclick = () => salirSesion();
  $$('.mv-rep-op', V).forEach((b) => (b.onclick = () => responder(q, P, +b.dataset.i)));
  const nose = $('.mv-rep-nose', V); if (nose) nose.onclick = () => (P.teclea ? teclear(q, P, null) : responder(q, P, -1, true));
  const inp = $('.mv-rep-in', V);
  if (inp) {
    inp.addEventListener('input', () => { if (/[a-z]/i.test(inp.value)) inp.value = aKana(inp.value); });
    $('.mv-rep-form', V).onsubmit = (e) => { e.preventDefault(); if (inp.value.trim()) teclear(q, P, inp); else inp.focus(); };
    setTimeout(() => { if (V.isConnected && !s.respondida && s.cola[0] === q) inp.focus({ preventScroll: true }); }, 60);
  }
  const ver = $('.mv-rep-ver', V); if (ver) ver.onclick = () => autoevaluar(q, P);
}
function mostrarSolucion(q, P, ok) {
  const sol = $('.mv-rep-sol', V);
  $('.mv-rep-cinta', V).hidden = true;
  sol.innerHTML = `<b lang="ja" class="${ok ? 'bien' : 'mal'}">${P.respuesta}</b>${P.otra ? `<small>${P.otra}</small>` : ''}${P.explica ? `<small>${P.explica}</small>` : ''}`;
  sol.hidden = false;
  if (P.tipo === 'gram') { const h = $('.mv-hueco', V); if (h) { h.innerHTML = P.respuesta; h.classList.add(ok ? 'bien' : 'mal'); } }
  if (!quieto()) gsap.fromTo(sol, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3 });
  // la palabra suena al resolverla (si tiene audio)
  if (q.item.audio && app?.ajustes?.autoplay !== false) { audio?.pause(); audio = son.pista('/media/' + encodeURIComponent(q.item.audio)); audio.play().catch(() => {}); }
}
function botonSiguiente() {
  $('.mv-rep-pie', V).innerHTML = `<button class="mv-btn mv-rep-sig">${t('mv.siguiente')}</button>`;
  const b = $('.mv-rep-sig', V); b.onclick = siguiente;
  if (!quieto()) gsap.fromTo(b, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'back.out(2)' });
}
async function responder(q, P, i, noSe = false) {
  if (s.respondida) return; s.respondida = true;
  const ok = i >= 0 && P.opciones[i].ok;
  $$('.mv-rep-op', V).forEach((b, j) => { b.disabled = true; if (P.opciones[j].ok) b.classList.add('bien'); else if (j === i) b.classList.add('mal'); else b.classList.add('apagada'); });
  await registrar(q, ok, noSe);
  mostrarSolucion(q, P, ok);
  botonSiguiente();
}
// una respuesta tecleada: vale si, escrita en kana, coincide con alguna solución (en kanji o en lectura); null = «No lo sé»
async function teclear(q, P, inp) {
  if (s.respondida) return; s.respondida = true;
  const ok = !!inp && P.teclea.has(suena(aKana(inp.value, true)));
  if (inp) { inp.readOnly = true; inp.classList.add(ok ? 'bien' : 'mal'); }
  document.activeElement?.blur?.();
  $$('.mv-rep-form button', V).forEach((b) => { b.hidden = true; });
  await registrar(q, ok, !inp, 'escribir');
  mostrarSolucion(q, P, ok);
  botonSiguiente();
}
function autoevaluar(q, P) {
  mostrarSolucion(q, P, true);
  $('.mv-rep-ops', V).innerHTML = `<button class="mv-btn-claro mv-rep-op mal-claro" data-v="0">${t('mv.rep.no_sabia')}</button><button class="mv-btn-claro mv-rep-op bien-claro" data-v="1">${t('mv.rep.sabia')}</button>`;
  $('.mv-rep-ops', V).classList.add('dos');
  $$('.mv-rep-op', V).forEach((b) => (b.onclick = async () => {
    if (s.respondida) return; s.respondida = true;
    await registrar(q, b.dataset.v === '1', false);
    siguiente();
  }));
}
async function registrar(q, ok, noSe, modo = 'elegir') {
  const ms = Math.round(performance.now() - s.t0);
  s.hechas++;
  if (ok) { s.bien++; s.racha++; s.mejor = Math.max(s.mejor, s.racha); son.acierto(s.racha); vibrar(12); }
  else { s.racha = 0; son.fallo(); vibrar([18, 50, 18]); }
  if (s.leccion) { // la prueba de una lección: la que falla vuelve dentro de tres
    const hecha = s.cola.shift();
    if (!ok) { s.leccion.fallos[q.item.id] = (s.leccion.fallos[q.item.id] || 0) + 1; s.cola.splice(Math.min(s.cola.length, 3), 0, hecha); }
    return;
  }
  let r = {};
  try { r = await api('/api/responder', { clave: q.clave, correcto: ok, ms, combo: ok ? s.racha : 0, modo, repaso: 'mixto', ...(noSe ? { no_se: true } : {}) }); } catch { /* sin guardar: sigue */ }
  s.xp += r.xp || 0;
  if (r.sube) s.subidas++;
  if (ok && r.xp) flotarXP(r.xp);
  const hecha = s.cola.shift();
  if (!ok && r.otra_vez != null) { if (r.rango != null) hecha.rango = r.rango; hecha.P = null; s.cola.splice(Math.min(s.cola.length, 3), 0, hecha); }
}
function flotarXP(n) {
  const c = $('.mv-rep-carta', V); if (!c || quieto()) return;
  const el = document.createElement('div'); el.className = 'mv-flota'; el.textContent = `+${n} XP`; c.appendChild(el);
  gsap.fromTo(el, { y: 0, opacity: 0, scale: 0.7 }, { y: -36, opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(2)', onComplete: () => gsap.to(el, { opacity: 0, duration: 0.4, delay: 0.4, onComplete: () => el.remove() }) });
}
function siguiente() { audio?.pause(); pintar(); }

async function fin() {
  if (s.leccion) return s.leccion.alAcabar(s);
  const pct = s.hechas ? Math.round((100 * s.bien) / s.hechas) : 0;
  const nota = pct >= 95 ? '秀' : pct >= 85 ? '優' : pct >= 70 ? '良' : '可';
  let r = null;
  try { r = await api('/api/sesion/fin', { respuestas: s.hechas, aciertos: s.bien, mejor_racha: s.mejor, lecciones: 0, gramatica: 0 }); } catch { /* nada */ }
  const d = await app.inicio(true).catch(() => null), quedan = d?.repasos_ahora || 0;
  son.fanfarria?.();
  V.innerHTML = `<div class="mv-rep mv-fin">
    <div class="mv-fin-cab"><div class="mv-etq">${t('mv.fin.ante')}</div>
      <div class="mv-fin-sello" lang="ja">${nota}</div><div class="mv-fin-nota">${t('estudio.nota.' + NOTAS[nota])}</div></div>
    <div class="mv-fin-stats">
      <div class="mv-carta"><b>${pct}%</b><small>${t('mv.fin.aciertos')}</small></div>
      <div class="mv-carta"><b>${s.mejor}</b><small>${t('mv.fin.racha')}</small></div>
      <div class="mv-carta"><b>${s.subidas}</b><small>${t('mv.fin.suben')}</small></div>
      <div class="mv-carta oro"><b>+${num(s.xp)}</b><small>XP</small></div></div>
    ${r?.bolsas_ganadas ? `<a class="mv-carta mv-fin-premio" href="#inicio/cuarto"><img src="/img/iconos/koban.svg" alt="" width="34" height="34"><span>${tn('mv.fin.bolsa', r.bolsas_ganadas)}</span><i class="mv-apr-flecha" aria-hidden="true">›</i></a>` : ''}
    <div class="mv-fin-pie">${quedan ? `<button class="mv-btn" data-otra>${t('mv.fin.otra', { n: Math.min(quedan, TANDA) })}</button>` : ''}
      <a class="mv-btn-claro" href="#inicio">${t('mv.volver_inicio')}</a></div></div>`;
  $('[data-otra]', V)?.addEventListener('click', () => empezar());
  if (!quieto()) {
    gsap.fromTo($('.mv-fin-sello', V), { scale: 3, rotate: -30, opacity: 0 }, { scale: 1, rotate: -7, opacity: 1, duration: 0.35, ease: 'power4.in', delay: 0.2, onComplete: () => { son.sello?.(); vibrar(25); } });
    gsap.fromTo($$('.mv-fin-stats > *', V), { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.07, delay: 0.5, ease: 'back.out(2)' });
  }
}
async function salirSesion() {
  audio?.pause();
  if (s?.leccion) { location.hash = 'aprender'; return; } // sin acabar la prueba, la lección no se guarda
  if (s && s.hechas) { await api('/api/sesion/fin', { respuestas: s.hechas, aciertos: s.bien, mejor_racha: s.mejor, lecciones: 0, gramatica: 0 }).catch(() => {}); }
  location.hash = 'inicio';
}

let soloConj = false;   // #repaso/conjugacion: solo las tarjetas de conjugación (sin cambiar el filtro guardado)
async function empezar() {
  V.innerHTML = `<div class="mv-rep mv-cargando"><div class="mv-etq">${t('mv.rep.preparando')}</div></div>`;
  let lista = [];
  try { [lista] = await Promise.all([api('/api/repaso?n=' + TANDA + (soloConj ? '&tipos=conjugacion&recordar=0' : '')), cargarPool()]); } catch { lista = []; }
  if (!lista.length) {
    V.innerHTML = `<div class="mv-pronto"><img src="/img/reparto/nyan-feliz.webp" alt="" width="200" height="200"><h2 class="mv-tit">${t('mv.rep.nada')}</h2>
      <p>${t('mv.rep.nada_sub')}</p><a class="mv-btn" href="#inicio">${t('mv.volver_inicio')}</a></div>`;
    return;
  }
  s = { cola: lista.slice(), total: lista.length, hechas: 0, bien: 0, racha: 0, mejor: 0, xp: 0, subidas: 0, respondida: false, t0: 0 };
  pintar();
}
// la prueba de una lección: cola de {item, habilidad, clave}; alAcabar(s) recibe aciertos, racha y fallos por palabra
export function prueba(v, a, cola, alAcabar) {
  V = v; app = a;
  s = { cola: cola.slice(), total: cola.length, hechas: 0, bien: 0, racha: 0, mejor: 0, xp: 0, subidas: 0, respondida: false, t0: 0, leccion: { fallos: {}, alAcabar } };
  pintar();
}
export async function entrar(v, resto, a) {
  V = v; app = a;
  try { await app.inicio(); } catch { /* sin datos: los ajustes por defecto */ }
  soloConj = resto?.[0] === 'conjugacion';
  await empezar();
}
export function salir() { audio?.pause(); }
