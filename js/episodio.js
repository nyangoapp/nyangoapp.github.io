// Las clases como EPISODIOS de juego (formato 2).
//   Misión → Historia interactiva (dice · elige · regla · monta · toca) → El reto de Kage (3 corazones) → Final (estrellas).
// La primera vez las fases se abren en orden y la clase solo cuenta al ganar a Kage. clase.js pone la cabecera, la vista y la
// voz (oir), «la frase cobra vida» (montar) y el teclado; aquí va el juego.
import { gsap } from 'gsap';
import { $, $$, api, chispas, flotar } from './app.js';
import * as son from './sonido.js';
import { esc, ruby } from './japones.js';
import { kbd } from './teclado.js';
import { t, idioma } from './i18n.js';
import { DEFS, figura, MED, esReparto } from './clase-arte.js';
import { componer, oir, colocarBocadillo, montar, ponerTeclas, pararVoz } from './clase.js';
import { MUELLE, SALIDA } from './curvas.js';

const tr = (o) => (o && typeof o === 'object' ? o[idioma] ?? o.es ?? '' : o || '');
const frase = (s) => String(s || '').split(' ').map(ruby).join(' ');
const quieto = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const espera = (ms) => new Promise((r) => setTimeout(r, quieto() ? 0 : ms));
const barajar = (l) => { const a = [...l]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
// Las entradas van con GSAP y NO con el.animate(): en WebKitGTK, cuando acaba una animación ACELERADA (WAAPI o CSS: corre en el hilo del
// compositor) de un elemento grande, se pinta UN fotograma sin él. Medido el 15-10 con los fotogramas reales de la ventana (medir_webkit /
// pruebas/webkit_pasos.py): la capa de «¡Regla nueva!», la escena, la zona del reto, el rincón de Kage... eran los «parpadeos» de las clases
// (10 en una clase entera; con elementos grandes, 7 de cada 8 pruebas). Con GSAP la página escribe el estilo en cada fotograma, al acabar no
// cambia nada y no hay destello (0 de 8). Acepta lo mismo que el.animate: fotogramas con opacity y transform (translateX/Y, scale, rotate).
const T_GSAP = { translateX: 'x', translateY: 'y', scale: 'scale', rotate: 'rotation' }, NEUTRO = { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 };
function propsDe(kf) {
  const p = {};
  if (kf.opacity != null) p.opacity = +kf.opacity;
  for (const [, f, v] of String(kf.transform || '').matchAll(/(translateX|translateY|scale|rotate)\(([^)]+)\)/g)) p[T_GSAP[f]] = parseFloat(v);
  return p;
}
function anima(el, kf, o = {}) {
  if (!el || quieto()) return null;
  const pasos = kf.map(propsDe), claves = [...new Set(pasos.flatMap(Object.keys))];
  const completo = (p) => Object.fromEntries(claves.map((k) => [k, p[k] ?? NEUTRO[k]]));
  const dur = (o.duration ?? 400) / 1000, retraso = (o.delay ?? 0) / 1000, ease = o.easing === 'ease-out' ? SALIDA : MUELLE;   // las mismas curvas que tenía el.animate(): ni un rebote menos
  const limpiar = () => gsap.set(el, { clearProps: [claves.includes('opacity') ? 'opacity' : '', claves.some((k) => k !== 'opacity') ? 'transform' : ''].filter(Boolean).join(',') });
  if (pasos.length === 2) return gsap.fromTo(el, completo(pasos[0]), { ...completo(pasos[1]), duration: dur, delay: retraso, ease, overwrite: 'auto', onComplete: limpiar });   // overwrite: como en WAAPI, la animación nueva manda sobre la que siga viva
  // varios fotogramas (temblores, rebotes): como en WAAPI, la curva reparte el tiempo de TODA la animación y los fotogramas se reparten por igual
  const tramos = pasos.map(completo), prox = { p: 0 };
  return gsap.to(prox, { p: 1, duration: dur, delay: retraso, ease, overwrite: false, onUpdate() {
    const x = prox.p * (tramos.length - 1), i = Math.max(0, Math.min(tramos.length - 2, Math.floor(x))), f = x - i;
    gsap.set(el, Object.fromEntries(claves.map((k) => [k, tramos[i][k] + (tramos[i + 1][k] - tramos[i][k]) * f])));
  }, onComplete: limpiar });
}

// quién habla: su nombre (como en el bocadillo) y qué figura es en la escena
const QUIEN = { nyan: { jp: 'ニャン', fig: 'nyan' }, tama: { jp: 'タマ', fig: 'gato' }, sensei: { jp: 'フクロ先生', fig: 'sensei' },
  tendero: { jp: 'ポン', fig: 'persona' }, kage: { jp: 'カゲ', fig: 'kage' }, kotaro: { jp: 'コタロー', fig: 'perro' } };
const PASOS = ['mision', 'historia', 'reto', 'final'];

let C = null, V = null, voces = new Set(), irClase = null, E = null;

export async function empezar({ clase, V: vista, voces: vs, ir }) {
  C = clase; V = vista; voces = vs; irClase = ir; estilos();
  E = nuevaPartida(ganadaAntes());
  precalentar();
}
// Todas las imágenes del episodio (fotos, reparto con cada cara y orientación, objetos 3D) se decodifican mientras se lee la
// misión: si no, WebKit las decodifica al aparecer y cada cambio de escena daba un tirón de 100–200 ms.
function precalentar() {
  const svgs = [], escenas = [];
  let prev = null;
  for (const b of [...(C.historia || []), ...(C.epilogo || [])]) { if (b.escena) prev = b.escena; if (prev) escenas.push(conCaras(prev, b)); }
  for (const enc of C.practica?.encargos || []) if (enc.escena) escenas.push(enc.escena);
  for (const e of escenas) svgs.push(componer(e, true));
  for (const q of C.reto?.preguntas || []) if (q.tipo === 'imagen') svgs.push(q.opciones.map((id) => figura(id)).join(''));
  const urls = new Set([...svgs.join('').matchAll(/href="([^"]+)"/g)].map((m) => m[1]));
  ['presumido', 'decidido', 'aburrido'].forEach((c) => urls.add(`/img/reparto/kage-${c}-d.webp`));
  let i = 0; const lista = [...urls];
  const uno = () => { if (i >= lista.length) return; const im = new Image(); im.src = lista[i++]; (im.decode ? im.decode() : Promise.resolve()).catch(() => {}).finally(() => setTimeout(uno, 16)); };
  for (let k = 0; k < 3; k++) uno();
}
// libre navegación solo si ya se ganó a Kage en ESTE formato (las clases hechas con el formato viejo no cuentan)
const ganadaAntes = () => { try { return localStorage.getItem('nyango.episodio.' + C.id) === '1'; } catch { return false; } };
const nuevaPartida = (hecha) => ({ alcanzado: 0, hecha, fallos: 0, corazones: 3, corazonesFinal: 0, reglas: new Set(), combo: 0, ganado: false, guardado: false });
export const puede = (paso) => !E || E.hecha || paso === 'apuntes' || PASOS.indexOf(paso) <= E.alcanzado;
export function avisarCerrado() { son.fallo(); flotar(t('ep.cerrado'), innerWidth / 2, 150, 'var(--acento)'); }
function pintarPasos(aqui) {
  $$('.cl-pasos button', V).forEach((b) => {
    const p = b.dataset.paso;
    b.classList.toggle('aqui', p === aqui);
    b.classList.toggle('hecho', p !== 'apuntes' && PASOS.indexOf(p) < PASOS.indexOf(aqui));
    b.classList.toggle('cerrado', !puede(p));
  });
}
function abrir(paso) { E.alcanzado = Math.max(E.alcanzado, PASOS.indexOf(paso)); irClase(paso); }

// todo cabe en la pantalla, sin scroll: el cuerpo de la clase mide lo que queda bajo la cabecera
function ajustarAlto(cuerpo) {
  const cab = $('.cab-papel', V);
  cuerpo.style.setProperty('--alto', `${Math.max(430, V.clientHeight - (cab?.offsetHeight || 110) - 12)}px`);
}
addEventListener('resize', () => { const c = V?.isConnected && $('.cl-cuerpo.ep-cuerpo', V); if (c) ajustarAlto(c); });
export function ir(paso, cuerpo) {
  cuerpo.classList.add('ep-cuerpo'); ajustarAlto(cuerpo);
  pintarPasos(paso);
  if (paso === 'mision') mision(cuerpo);
  else if (paso === 'historia') { E.fallos = 0; historia(cuerpo, C.historia, () => abrir('reto')); }
  else if (paso === 'reto') reto(cuerpo);
  else final(cuerpo);
}

// ───────────────────────── la escena (foto + reparto 3D + bocadillo) ─────────────────────────
function conCaras(e, b = {}) {
  const cosas = (e?.cosas || []).map((c) => ({ ...c }));
  const busca = (q) => cosas.find((c) => c.id === q) || cosas.find((c) => c.que === QUIEN[q]?.fig);
  const f = busca(b.habla || 'nyan');
  if (f && b.cara) f.cara = b.cara;
  if (f && b.brazo) f.brazo = b.brazo;
  for (const [q, cara] of Object.entries(b.reacciona || {})) { const o = busca(q); if (o) o.cara = cara; }
  return { ...e, cosas };
}
function crearEscenario(sitio) {
  sitio.innerHTML = `<figure class="cl-vineta mostrada ep-escena" data-hx=".5"><div class="cl-arte">
    <svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMax slice" aria-hidden="true"></svg><div class="cl-bocadillo" hidden></div></div></figure>`;
  return $('.ep-escena', sitio);
}
// pinta la escena; con «plano: medio», la cámara se acerca a quien habla
function pintarEscena(stage, e, b = {}) {
  const svg = $('svg', stage), cosas = conCaras(e, b), habla = cosas.cosas.find((c) => c.id === (b.por || b.habla || 'nyan')) || cosas.cosas.find((c) => c.que === QUIEN[b.habla || 'nyan']?.fig);
  const cx = Math.min(330, Math.max(70, habla?.x ?? 200)), z = b.plano === 'medio' ? 1.28 : 1;
  const arte = componer(cosas, true);
  stage.dataset.hablaId = habla ? habla.id || habla.que : '';
  const clave = JSON.stringify({ f: e?.fondo, c: (e?.cosas || []).map((c) => [c.que, c.x, c.id]), z, cx: z > 1 ? cx : 0 });
  const nueva = clave !== stage.dataset.clave; stage.dataset.clave = clave;
  svg.innerHTML = DEFS + (z > 1 ? `<g transform="translate(${cx} 178) scale(${z}) translate(${-cx} -178)">${arte}</g>` : arte);
  stage.dataset.hx = String((((z > 1 ? z * ((habla?.x ?? 200) - cx) + cx : habla?.x ?? 200)) / 400).toFixed(3));
  if (nueva) anima(svg, [{ opacity: 0, transform: 'scale(1.04)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'ease-out' });
  return habla;
}
function hablar(stage, b) {
  const bo = $('.cl-bocadillo', stage), q = b.habla || 'nyan';
  bo.className = `cl-bocadillo quien-${q}`;
  bo.innerHTML = `${q !== 'nyan' ? `<b class="cl-quien" lang="ja">${QUIEN[q]?.jp || ''}</b>` : ''}<div class="cl-jp" lang="ja">${frase(b.jp)}</div><div class="cl-tr">${esc(tr(b.tr))}</div>`;
  bo.hidden = false; colocarBocadillo(stage);
  anima(bo, [{ transform: 'scale(.4)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 380 });
  // quien habla da un saltito
  const fig = stage.dataset.hablaId && $$('.cosa', stage).find((g) => g.dataset.id === stage.dataset.hablaId);
  const m = fig && $('.mueve', fig); if (m && !quieto()) gsap.fromTo(m, { y: 0 }, { y: -9, duration: 0.14, yoyo: true, repeat: 1, ease: 'power2.out' });
  if (b.voz) setTimeout(() => oir(b.voz, { forzar: true }), quieto() ? 0 : 180);
}
const callar = (stage) => { const bo = $('.cl-bocadillo', stage); if (bo) bo.hidden = true; };

// ───────────────────────── 1 · la misión ─────────────────────────
function mision(cuerpo) {
  const M = C.mision || {}, e = M.escena || C.historia.find((b) => b.escena)?.escena;
  cuerpo.innerHTML = `<section class="ep-mision">
    <figure class="ep-mision-foto"><svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMax slice" aria-hidden="true">${DEFS}${componer(conCaras(e, M))}</svg></figure>
    <div class="ep-mision-carta">
      <small>${t('ep.mision.eyebrow', { n: C.clase })}</small>
      <h1 lang="ja">${ruby(tr(C.titulo))}</h1>
      <p class="ep-mision-txt"><b>${t('ep.mision.tit')}</b>${ruby(tr(M.texto))}</p>
      <ul class="ep-objetivos">${['1', '2', '3'].map((k) => `<li><i>★</i>${t('ep.obj.' + k)}</li>`).join('')}</ul>
      <div class="ep-aprende"><small>${t('ep.mision.aprenderas')}</small>${(C.reglas || []).map((r) => `<span lang="ja">${ruby(tr(r.nombre))}</span>`).join('')}</div>
      <button class="boton-tinta ep-empezar" data-empezar>${t(E.hecha ? 'ep.mision.otra' : 'ep.mision.empezar')} ${kbd('Intro')}</button>
    </div></section>`;
  const carta = $('.ep-mision-carta', cuerpo);
  anima(carta, [{ transform: 'translateY(40px) rotate(-1.5deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 650, delay: 120 });
  $$('.ep-objetivos li', cuerpo).forEach((li, i) => anima(li, [{ transform: 'translateX(-16px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, delay: 500 + i * 120 }));
  if (M.voz) setTimeout(() => oir(M.voz, { forzar: true }), 700);
  son.papel();
  const empezarYa = () => { son.toque(); E.fallos = 0; abrir('historia'); };
  $('[data-empezar]', cuerpo).onclick = empezarYa;
  ponerTeclas({ intro: empezarYa, oir: () => oir(M.voz, { forzar: true }) });
}

// ───────────────────────── 2 · la historia interactiva ─────────────────────────
function historia(cuerpo, beats, alFinal) {
  cuerpo.innerHTML = `<section class="ep-historia"><div class="ep-barra"><i></i></div><div class="ep-sitio"></div><div class="ep-mando" aria-live="polite"></div></section>`;
  const sec = $('.ep-historia', cuerpo), sitio = $('.ep-sitio', sec), mando = $('.ep-mando', sec), barra = $('.ep-barra i', sec);
  const stage = crearEscenario(sitio);
  let i = -1, escena = null;
  const seguir = (txt = t('ep.seguir')) => {
    mando.innerHTML = `<div class="ep-fila"><button class="boton-tinta ep-seguir" data-seguir>${txt} ${kbd('Intro')}</button></div>`;
    const b = $('[data-seguir]', mando); b.onclick = () => { son.toque(); siguiente(); };
    anima(b, [{ transform: 'translateY(10px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 300 });
    ponerTeclas({ intro: () => b.click(), oir: () => oir(beats[i]?.voz, { forzar: true }) });
  };
  function siguiente() {
    i++;
    barra.style.width = `${Math.min(100, (100 * i) / beats.length)}%`;
    if (i >= beats.length) { alFinal(); return; }
    const b = beats[i];
    if (b.escena) escena = b.escena;
    ({ dice, elige, regla, monta, toca }[b.t] || dice)(b);
  }
  function dice(b) {
    pintarEscena(stage, escena, b); hablar(stage, b);
    seguir(i === beats.length - 1 ? t('ep.seguir_fin') : t('ep.seguir'));
  }
  // las opciones largas bajan de tamaño para caber en su columna sin partirse a lo loco
  const largo = (ops) => { const n = Math.max(...ops.map((o) => o.jp.replace(/\[[^\]]*\]/g, '').replace(/\s/g, '').length)); return n > 16 ? 'largas' : n > 11 ? 'medias' : ''; };
  function elige(b) {
    pintarEscena(stage, escena, { ...b, cara: b.cara_pide || 'pensando' }); callar(stage);
    const ops = barajar(b.opciones.map((o, k) => ({ ...o, k })));
    mando.innerHTML = `<p class="ep-pide">${ruby(tr(b.pide) || t('ep.elige'))}</p>
      <div class="ep-opciones ${largo(ops)}">${ops.map((o, n) => `<button class="ep-opcion" data-k="${o.k}"><span lang="ja">${frase(o.jp)}</span>${kbd(String(n + 1))}</button>`).join('')}</div><p class="ep-porque" hidden></p>`;
    const botones = $$('.ep-opcion', mando), porque = $('.ep-porque', mando);
    botones.forEach((bt, n) => anima(bt, [{ transform: 'translateY(14px) scale(.96)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 360, delay: 60 + n * 70 }));
    let fallado = false;
    const elegir = (bt) => {
      if (!bt || bt.disabled) return;
      const o = b.opciones[+bt.dataset.k];
      if (o.bien) {
        botones.forEach((x) => { x.disabled = true; }); bt.classList.add('ok');
        E.combo++; son.acierto(Math.min(5, E.combo)); chispas(bt, { n: 14 });
        pintarEscena(stage, escena, { ...b, cara: o.cara || b.cara || 'feliz', reacciona: o.reacciona || b.reacciona });
        hablar(stage, { habla: b.habla || 'nyan', jp: o.jp, tr: o.tr, voz: o.voz });
        porque.hidden = !o.porque; if (o.porque) porque.innerHTML = `<b>✓</b> ${ruby(tr(o.porque))}`;
        porque.className = 'ep-porque ok';
        setTimeout(() => seguir(), quieto() ? 0 : 500);
      } else {
        bt.disabled = true; bt.classList.add('mal'); E.combo = 0; son.fallo(); son.voz('eh');
        if (!fallado) { fallado = true; E.fallos++; }
        anima(bt, [{ transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(-5px)' }, { transform: 'none' }], { duration: 320, easing: 'ease-out' });
        pintarEscena(stage, escena, { ...b, cara: 'sorpresa', reacciona: o.reacciona || b.reacciona_mal || {} });
        porque.hidden = false; porque.className = 'ep-porque mal'; porque.innerHTML = `<b>✗</b> ${ruby(tr(o.porque) || t('ep.casi'))}`;
        anima(porque, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 300 });
      }
    };
    botones.forEach((bt) => { bt.onclick = () => elegir(bt); });
    ponerTeclas({ numero: (k) => { elegir(botones[k - 1]); return true; }, oir: () => {} });
  }
  function regla(b) {
    const r = (C.reglas || []).find((x) => x.id === b.regla);
    if (!r) { siguiente(); return; }
    mando.innerHTML = '';
    cartaRegla(r, () => { E.reglas.add(r.id); siguiente(); });
  }
  function monta(b) {
    sitio.hidden = true; mando.innerHTML = ''; mando.hidden = true;
    const caja = document.createElement('div'); caja.className = 'ep-monta'; sec.appendChild(caja);
    anima(caja, [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 400 });
    montar(caja, C.practica, { solo: b.encargo, alFinal: (algunFallo) => {
      if (algunFallo) E.fallos++; else { E.combo++; }
      caja.remove(); sitio.hidden = false; mando.hidden = false; siguiente();
    } });
  }
  function toca(b) {
    pintarEscena(stage, escena, b); callar(stage);
    mando.innerHTML = `<p class="ep-pide">${ruby(tr(b.pide))}</p>${b.jp ? `<p class="ep-toca-jp" lang="ja">${frase(b.jp)}</p>` : ''}<p class="ep-porque" hidden></p>`;
    if (b.voz) oir(b.voz, { forzar: true });
    const porque = $('.ep-porque', mando);
    let fallado = false, hecho = false;
    // cada cosa se toca por SU silueta (una caja a su medida), no por el cuadrado entero de su imagen: el de Tama tapaba el onigiri.
    // Las que no son del reparto llevan un halo que late: se ve que se pueden tocar.
    $$('.cosa[data-id]', stage).forEach((g) => {
      const que = g.dataset.que, md = MED[que] || { w: 60, h: 60 }, w = esReparto(que) ? md.w * 0.62 : md.w, h = md.h;
      if (!esReparto(que)) $('.mueve', g)?.insertAdjacentHTML('afterbegin', `<ellipse class="ep-aura" cx="0" cy="${(-h / 2).toFixed(1)}" rx="${(w * 0.72 + 8).toFixed(1)}" ry="${(h * 0.66 + 8).toFixed(1)}" fill="url(#ep-halo)"/>`);
      $('.mueve', g)?.insertAdjacentHTML('beforeend', `<rect class="ep-hit" x="${(-w / 2).toFixed(1)}" y="${(-h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="transparent"/>`);
      g.classList.add('ep-tocable');
      g.addEventListener('click', () => {
        if (hecho) return;
        const m = $('.mueve', g);
        if (g.dataset.id === b.bien) {
          hecho = true; E.combo++; son.acierto(Math.min(5, E.combo)); chispas(g, { n: 16 });
          if (m && !quieto()) gsap.to(m, { y: -16, duration: 0.18, yoyo: true, repeat: 3, ease: 'power2.out' });
          porque.hidden = !b.bien_msg; porque.className = 'ep-porque ok'; if (b.bien_msg) porque.innerHTML = `<b>✓</b> ${ruby(tr(b.bien_msg))}`;
          $$('.ep-tocable', stage).forEach((x) => x.classList.remove('ep-tocable')); $$('.ep-aura', stage).forEach((a) => a.remove());
          setTimeout(() => seguir(), quieto() ? 0 : 600);
        } else {
          E.combo = 0; son.fallo(); if (!fallado) { fallado = true; E.fallos++; }
          if (m && !quieto()) gsap.fromTo(m, { x: -5 }, { x: 5, repeat: 5, yoyo: true, duration: 0.05, onComplete: () => gsap.set(m, { x: 0 }) });
          porque.hidden = false; porque.className = 'ep-porque mal'; porque.innerHTML = `<b>✗</b> ${ruby(tr(b.mal_msg) || t('ep.toca_mal'))}`;
        }
      });
    });
    ponerTeclas({ oir: () => oir(b.voz, { forzar: true }) });
  }
  siguiente();
}

// la carta de una regla: sale cuando la historia la necesita y se guarda en los apuntes
export function patronHTML(p) {
  return String(tr(p) || '').split(/(〔[^〕]*〕)/).filter(Boolean).map((x) => (x.startsWith('〔') ? `<span class="ep-hueco">${ruby(x.slice(1, -1))}</span>` : x.trim() ? `<span class="ep-fija" lang="ja">${ruby(x.trim())}</span>` : '')).join('');
}
function cartaRegla(r, alCerrar) {
  const n = (C.reglas || []).indexOf(r) + 1;
  const capa = document.createElement('div'); capa.className = 'ep-regla-capa';
  capa.innerHTML = `<article class="ep-regla" role="dialog" aria-modal="true">
    <small class="ep-regla-nueva">${t('ep.regla.nueva')} · ${n}/${C.reglas.length}</small>
    <h2 lang="ja">${ruby(tr(r.nombre))}</h2>
    <div class="ep-patron">${patronHTML(r.patron)}</div>
    <p class="ep-explica">${ruby(tr(r.explica))}</p>
    <ul class="ep-ejemplos">${(r.ejemplos || []).map((ej) => `<li>${ej.voz && voces.has(ej.voz) ? `<button class="ap-oir" data-voz="${ej.voz}" aria-label="${t('clase.apuntes.oir')}">▶</button>` : '<i></i>'}<div><span lang="ja">${frase(ej.jp)}</span><small>${esc(ej[idioma] || ej.es)}</small></div></li>`).join('')}</ul>
    ${r.ojo ? `<p class="ep-ojo"><b>${t('ep.regla.ojo')}</b> ${ruby(tr(r.ojo))}</p>` : ''}
    <button class="boton-tinta" data-vale>${t('ep.regla.vale')} ${kbd('Intro')}</button>
  </article>`;
  V.appendChild(capa);
  const carta = $('.ep-regla', capa);
  son.papel(); setTimeout(() => son.acierto(3), quieto() ? 0 : 250);
  anima(capa, [{ opacity: 0 }, { opacity: 1 }], { duration: 250, easing: 'ease-out' });
  anima(carta, [{ transform: 'translateY(40px) scale(.82) rotate(-3deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 600, delay: 60 });
  setTimeout(() => chispas($('h2', carta), { n: 18 }), quieto() ? 0 : 520);
  const primera = (r.ejemplos || []).find((ej) => voces.has(ej.voz));
  if (primera) setTimeout(() => oir(primera.voz, { forzar: true }), quieto() ? 0 : 900);
  $$('.ap-oir', carta).forEach((b) => { b.onclick = () => oir(b.dataset.voz, { forzar: true }); });
  const cerrar = () => { son.toque(); capa.remove(); alCerrar(); };
  $('[data-vale]', carta).onclick = cerrar;
  ponerTeclas({ intro: cerrar, oir: () => primera && oir(primera.voz, { forzar: true }) });
}

// ───────────────────────── 3 · el reto de Kage ─────────────────────────
function reto(cuerpo) {
  const R = C.reto, preguntas = R.preguntas;
  E.corazones = 3; E.combo = 0;
  cuerpo.innerHTML = `<section class="ep-reto">
    <header class="ep-reto-cab">
      <div class="ep-kage"><img src="/img/reparto/kage-presumido-d.webp" alt="" draggable="false"><div class="cl-bocadillo quien-kage ep-kage-dice" hidden></div></div>
      <div class="ep-marcador"><div class="ep-corazones" aria-label="${t('ep.reto.vidas')}">${'<i>♥</i>'.repeat(3)}</div><div class="ep-combo" hidden></div>
        <div class="ep-puntos">${preguntas.map(() => '<i></i>').join('')}</div></div>
    </header>
    <div class="ep-pregunta"></div>
  </section>`;
  const sec = $('.ep-reto', cuerpo), zona = $('.ep-pregunta', sec), kage = $('.ep-kage img', sec), dice = $('.ep-kage-dice', sec);
  const puntos = $$('.ep-puntos i', sec), combo = $('.ep-combo', sec);
  const kageDice = (l, cara = 'presumido') => {
    if (!l) return;
    kage.src = `/img/reparto/kage-${cara}-d.webp`;
    dice.hidden = false; dice.innerHTML = `<b class="cl-quien" lang="ja">カゲ</b><div class="cl-jp" lang="ja">${frase(l.jp)}</div><div class="cl-tr">${esc(tr(l.tr))}</div>`;
    anima(dice, [{ transform: 'scale(.5)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 360 });
    if (!quieto()) gsap.fromTo(kage, { y: 0 }, { y: -10, duration: 0.15, yoyo: true, repeat: 1 });
    if (l.voz) oir(l.voz, { forzar: true });
  };
  anima($('.ep-kage', sec), [{ transform: 'translateX(-60px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 600 });
  kageDice(R.intro);
  let q = -1;
  const perderCorazon = () => {
    E.corazones--; const c = $$('.ep-corazones i', sec)[E.corazones];
    if (c) { c.classList.add('roto'); anima(c, [{ transform: 'scale(1.6) rotate(-20deg)' }, { transform: 'scale(1)' }], { duration: 450 }); }
    anima(sec, [{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], { duration: 260, easing: 'ease-out' });
  };
  const marcarCombo = () => {
    combo.hidden = E.combo < 2; combo.textContent = `×${E.combo}`;
    if (E.combo >= 2) anima(combo, [{ transform: 'scale(1.8)' }, { transform: 'scale(1)' }], { duration: 380 });
  };
  function siguiente() {
    q++;
    if (q >= preguntas.length) { victoria(); return; }
    pregunta(preguntas[q]);
  }
  function pregunta(p) {
    puntos.forEach((d, k) => d.classList.toggle('ahora', k === q));
    let html = '', opciones = [];
    if (p.tipo === 'bien_mal') {
      kageDice({ jp: p.jp, tr: p.tr, voz: p.voz }, 'decidido');
      html = `<p class="ep-pide">${t('ep.reto.bien_mal')}</p>`;
      opciones = [{ html: `◯ ${t('ep.reto.bien')}`, ok: !!p.correcta }, { html: `✕ ${t('ep.reto.mal')}`, ok: !p.correcta }];
    } else if (p.tipo === 'oye') {
      html = `<p class="ep-pide">${t('ep.reto.oye')}</p><button class="ep-oye" data-oye aria-label="${t('clase.apuntes.oir')}">▶</button>`;
      opciones = p.opciones.map((o, k) => ({ html: esc(tr(o)), ok: k === p.bien }));
    } else if (p.tipo === 'imagen') {
      html = `<p class="ep-pide">${ruby(tr(p.pide) || t('ep.reto.imagen'))}</p><p class="ep-q-jp" lang="ja">${frase(p.jp)}</p>`;
      opciones = p.opciones.map((id, k) => ({ html: `<svg viewBox="-50 -98 100 104" aria-hidden="true">${figura(id)}</svg>`, ok: k === p.bien, imagen: true }));
    } else {
      html = `<p class="ep-pide">${ruby(tr(p.pide) || t('ep.reto.elige'))}</p><p class="ep-q-jp" lang="ja">${frase(p.jp).replace('＿', '<span class="ep-blanco">？</span>')}</p>${p.tr ? `<small class="ep-q-tr">${esc(tr(p.tr))}</small>` : ''}`;
      opciones = p.opciones.map((o, k) => ({ html: `<span lang="ja">${ruby(o)}</span>`, ok: k === p.bien, jp: o }));
    }
    const orden = p.tipo === 'bien_mal' ? opciones : barajar(opciones);
    zona.innerHTML = `${html}<div class="ep-opciones${orden.some((o) => o.imagen) ? ' imagenes' : ''}">${orden.map((o, n) => `<button class="ep-opcion" data-n="${n}">${o.html}${kbd(String(n + 1))}</button>`).join('')}</div>
      <p class="ep-porque" hidden></p><div class="ep-fila"></div>`;
    anima(zona, [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }], { duration: 380 });
    if (p.tipo === 'oye') { const b = $('[data-oye]', zona); b.onclick = () => oir(p.voz, { forzar: true }); setTimeout(() => oir(p.voz, { forzar: true }), 250); }
    const botones = $$('.ep-opcion', zona), porque = $('.ep-porque', zona), fila = $('.ep-fila', zona);
    let listo = false;
    const responder = (bt) => {
      if (!bt || listo) return; listo = true;
      const o = orden[+bt.dataset.n];
      botones.forEach((x) => { x.disabled = true; const oo = orden[+x.dataset.n]; if (oo.ok) x.classList.add('ok'); });
      const blanco = $('.ep-blanco', zona);
      if (blanco) { const buena = orden.find((x) => x.ok); blanco.innerHTML = ruby(buena.jp || ''); blanco.classList.add('lleno'); }
      if (o.ok) {
        E.combo++; marcarCombo(); son.acierto(Math.min(5, E.combo)); chispas(bt, { n: 16 }); puntos[q].classList.add('bien');
        if (p.voz && p.tipo !== 'oye' && p.tipo !== 'bien_mal') oir(p.voz, { forzar: true });
        if (E.combo >= 3 && Math.random() < 0.5) kageDice(R.pica || { jp: '…やるな。', tr: { es: '…No está mal.', en: '…Not bad.' } }, 'aburrido');
        if (p.porque) { porque.hidden = false; porque.className = 'ep-porque ok'; porque.innerHTML = `<b>✓</b> ${ruby(tr(p.porque))}`; }
        setTimeout(siguiente, quieto() ? 0 : p.porque ? 1500 : 900);
      } else {
        bt.classList.add('mal'); E.combo = 0; marcarCombo(); son.fallo(); puntos[q].classList.add('mal'); perderCorazon();
        porque.hidden = false; porque.className = 'ep-porque mal'; porque.innerHTML = `<b>✗</b> ${ruby(tr(p.porque) || t('ep.casi'))}`;
        if (E.corazones <= 0) { setTimeout(derrota, quieto() ? 0 : 900); return; }
        kageDice(R.burla || { jp: 'ふん！', tr: { es: '¡Ja!', en: 'Hah!' } }, 'presumido');
        fila.innerHTML = `<button class="boton-tinta" data-sig>${t('ep.reto.vale')} ${kbd('Intro')}</button>`;
        $('[data-sig]', fila).onclick = siguiente;
        ponerTeclas({ intro: siguiente });
      }
    };
    botones.forEach((bt) => { bt.onclick = () => responder(bt); });
    ponerTeclas({ numero: (k) => { responder(botones[k - 1]); return true; }, oir: () => p.voz && oir(p.voz, { forzar: true }) });
  }
  function victoria() {
    E.ganado = true; E.corazonesFinal = E.corazones; son.fanfarria();
    kageDice(R.gana, 'aburrido');
    zona.innerHTML = `<div class="ep-gana"><b>${t('ep.reto.ganaste')}</b><small>${t('ep.reto.corazones', { n: E.corazones })}</small></div><div class="ep-fila"><button class="boton-tinta" data-seguir>${t('ep.seguir')} ${kbd('Intro')}</button></div>`;
    chispas($('.ep-gana', zona), { n: 40 });
    anima($('.ep-gana', zona), [{ transform: 'scale(.4) rotate(-6deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 700 });
    const ir = () => {
      pararVoz();
      if ((C.epilogo || []).length) historia(cuerpo, C.epilogo, () => abrir('final'));
      else abrir('final');
    };
    $('[data-seguir]', zona).onclick = ir; ponerTeclas({ intro: ir });
  }
  function derrota() {
    kageDice(R.pierde, 'presumido');
    zona.innerHTML = `<div class="ep-pierde"><b>${t('ep.reto.perdiste')}</b><small>${t('ep.reto.animo')}</small></div>
      <div class="ep-fila"><button class="boton-claro" data-historia>${t('ep.reto.repasar')}</button><button class="boton-tinta" data-otra>${t('ep.reto.otra')} ${kbd('Intro')}</button></div>`;
    anima($('.ep-pierde', zona), [{ transform: 'scale(.6)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 500 });
    const otra = () => { son.toque(); irClase('reto'); };
    $('[data-otra]', zona).onclick = otra; $('[data-historia]', zona).onclick = () => irClase('historia');
    ponerTeclas({ intro: otra });
  }
  setTimeout(siguiente, quieto() ? 0 : 1300);
}

// ───────────────────────── 4 · el final: estrellas, recompensa y la próxima ─────────────────────────
async function final(cuerpo) {
  const logros = [true, E.fallos <= 2, E.corazonesFinal === 3], n = E.ganado ? logros.filter(Boolean).length : 0;
  const indice = await fetch('clases/indice.json').then((r) => r.json()).catch(() => []);
  const k = indice.findIndex((c) => c.id === C.id), sig = k >= 0 ? indice[k + 1] : null, abierta = !!sig?.hay; // la siguiente puede estar aún por llegar
  cuerpo.innerHTML = `<section class="ep-final">
    <div class="ep-estrellas">${[0, 1, 2].map((j) => `<i class="${E.ganado && logros[j] ? 'si' : ''}">★</i>`).join('')}</div>
    <h2>${t(n === 3 ? 'ep.final.perfecto' : 'ep.final.cumplida')}</h2>
    <ul class="ep-objetivos">${logros.map((ok, j) => `<li class="${E.ganado && ok ? 'si' : 'no'}"><i>${E.ganado && ok ? '★' : '☆'}</i>${t('ep.obj.' + (j + 1))}</li>`).join('')}</ul>
    ${(C.reglas || []).length ? `<div class="ep-ganadas"><small>${t('ep.final.reglas', { n: C.reglas.length })}</small>${C.reglas.map((r) => `<span lang="ja">${ruby(tr(r.nombre))}</span>`).join('')}</div>` : ''}
    ${sig ? `<div class="ep-proxima ${abierta ? '' : 'pronto'}"><svg viewBox="-50 -98 100 104" aria-hidden="true">${figura(sig.icono || 'libro')}</svg><div><small>${t('ep.final.proxima', { n: sig.clase })}${abierta ? '' : ` · ${t('clase.indice.pronto')}`}</small>
      <b lang="ja">${ruby(tr(sig.titulo))}</b>${C.siguiente && abierta ? `<p>${ruby(tr(C.siguiente))}</p>` : ''}</div></div>` : ''}
    <p class="ep-guia" hidden></p>
    <div class="ep-fila"><button class="boton-claro" data-repetir>↻ ${t('ep.final.repetir')}</button><button class="boton-claro" data-apuntes><span lang="ja">帳</span> ${t('clase.apuntes.boton')}</button>
      <button class="boton-tinta" data-sig>${abierta ? t('ep.final.siguiente') : t('clase.volver')} ${kbd('Intro')}</button></div>
  </section>`;
  const est = $$('.ep-estrellas i', cuerpo);
  est.forEach((s, j) => {
    anima(s, [{ transform: 'scale(0) rotate(-40deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 520, delay: 250 + j * 380 });
    if (s.classList.contains('si')) setTimeout(() => { son.acierto(j + 2); chispas(s, { n: 18 }); }, quieto() ? 0 : 480 + j * 380);
  });
  anima($('.ep-proxima', cuerpo), [{ transform: 'translateY(20px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 500, delay: 1500 });
  $('[data-repetir]', cuerpo).onclick = () => { const hecha = E.hecha || E.ganado; E = nuevaPartida(hecha); irClase('mision'); };
  $('[data-apuntes]', cuerpo).onclick = () => irClase('apuntes');
  const ir = () => { location.hash = abierta ? `clase/${sig.id}` : 'gramatica'; };
  // para estudiarlo a fondo: las lecciones de la guía de gramática que tratan los puntos de esta clase
  const puntos = new Set(indice[k]?.puntos || []);
  api('/api/gramatica').then((lecs) => {
    const ls = lecs.filter((l) => (l.puntos || []).some((x) => puntos.has(x))).sort((x, y) => x.orden - y.orden).slice(0, 2);
    const g = $('.ep-guia', cuerpo); if (!g || !ls.length) return;
    g.innerHTML = t('ep.final.guia', { lecciones: ls.map((l) => `<a href="#gramatica/${l.slug}">${ruby(l.titulo)}</a>`).join(t('ep.final.guia_y')) });
    g.hidden = false;
    anima(g, [{ transform: 'translateY(10px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 450, delay: 300 });
  }).catch(() => {});
  $('[data-sig]', cuerpo).onclick = ir;
  ponerTeclas({ intro: ir });
  // se guarda una vez por partida ganada: la nota sale de las estrellas (el mapa enseña ★ con ≥ 90 %, ≥ 70 %…)
  if (E.ganado && !E.guardado) {
    E.guardado = true; E.hecha = true;
    try { localStorage.setItem('nyango.episodio.' + C.id, '1'); } catch { /* sin almacenamiento: se juega en orden la próxima vez */ }
    let r = null;
    try { r = await api(`/api/clase/${C.id}`, { aciertos: [6, 8, 10][n - 1], total: 10 }); } catch { flotar(t('clase.fin.no_guardado'), innerWidth / 2, innerHeight / 2, 'var(--mal)'); }
    if (!r) return;
    son.fanfarria();
    const rc = await import('./recompensas.js').catch(() => null);
    rc?.xpVuela($('[data-sig]', cuerpo), r.xp, r.xp_total);
    if (r.tarjetas > 0) setTimeout(() => flotar(t('ep.final.tarjetas', { n: r.tarjetas }), innerWidth / 2, innerHeight * 0.32, 'var(--t-gram)'), 900);   // lo de la clase, al repaso
    if (rc && r.nivel > r.nivel_antes) await rc.celebrarNivel(r.nivel, { bolsas: r.bolsas_ganadas ?? 1, koban: r.koban_ganados ?? 0 });
    rc?.finSesion({ respuestas: 0, aciertos: 0, mejor_racha: 0, lecciones: 0, gramatica: 1 });
  }
}

// ───────────────────────── estilos ─────────────────────────
let puestos = false;
function estilos() {
  if (puestos) return; puestos = true;
  const s = document.createElement('style');
  s.textContent = `
.cl-pasos button.cerrado { opacity: .72; cursor: not-allowed; }   /* cerrado pero legible: con .45 «Reto de Kage» quedaba a 2,7:1 */
.cl-pasos button.cerrado i::after { content: "🔒"; font-size: 9px; margin-left: 1px; }
/* misión */
.ep-mision { position: relative; max-width: 1080px; margin: 0 auto; display: grid; grid-template-columns: 1.25fr 1fr; gap: 0; align-items: center; height: var(--alto); }
.ep-mision-foto { margin: 0; border-radius: var(--radio); overflow: hidden; border: var(--borde); box-shadow: var(--sombra); }
.ep-mision-foto svg { display: block; width: 100%; height: auto; aspect-ratio: 400 / 290; max-height: calc(var(--alto) - 40px); }
.ep-mision-carta { position: relative; margin-left: -60px; padding: 28px 28px 24px; border-radius: var(--radio); background: var(--sup); border: var(--borde); box-shadow: var(--sombra); }
.ep-mision-carta > small { font: 800 12px/1.2 var(--f-texto); letter-spacing: .14em; text-transform: uppercase; color: var(--acento-tinta); }
.ep-mision-carta h1 { margin: 8px 0 12px; font: var(--peso-titulo) clamp(24px, 2.6vw, 32px)/1.25 var(--f-titulo); color: var(--tinta); text-wrap: balance; }
.ep-mision-carta h1 rt { font-size: .4em; }
.ep-mision-txt { margin: 0 0 16px; padding: 12px 16px; border-radius: var(--radio-peq); background: var(--aviso-suave); font: 700 15.5px/1.5 var(--f-texto); color: var(--tinta); }
.ep-mision-txt b { display: block; margin-bottom: 2px; font: var(--peso-titulo) 15px var(--f-titulo); color: var(--acento-tinta); }
.ep-objetivos { list-style: none; margin: 0 0 16px; padding: 0; display: grid; gap: 8px; }
.ep-objetivos li { display: flex; align-items: center; gap: 12px; font: 700 14px/1.4 var(--f-texto); color: var(--tinta); }
.ep-objetivos i { font-style: normal; font-size: 20px; line-height: 1; color: var(--aviso); text-shadow: 0 1.5px 0 color-mix(in srgb, var(--aviso) 40%, var(--tinta)); }
.ep-objetivos li.no { color: var(--tinta-2); } .ep-objetivos li.no i { color: color-mix(in srgb, var(--tinta-3) 82%, var(--sup)); text-shadow: none; }
.ep-aprende { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 20px; }
.ep-aprende small, .ep-ganadas small { width: 100%; font: 800 11px/1.2 var(--f-texto); letter-spacing: .1em; text-transform: uppercase; color: var(--tinta-2); }
.ep-aprende span, .ep-ganadas span { padding: 4px 12px; border-radius: var(--radio-btn); background: color-mix(in srgb, var(--t-vocab) 14%, var(--sup)); font: 700 13.5px/1.5 var(--f-jp); color: color-mix(in srgb, var(--t-vocab) 50%, var(--tinta)); }
.ep-empezar { width: 100%; height: 56px; font-size: 18px; }
/* historia */
.ep-cuerpo { padding-bottom: 0 !important; overflow-x: hidden; }
#v-clase:has(.ep-cuerpo) { overflow-x: hidden; }
.ep-historia { max-width: 1180px; margin: 0 auto; height: var(--alto); display: flex; flex-direction: column; gap: 12px; }
.ep-historia > .ep-barra { flex: none; }
.ep-sitio { flex: 1 1 0; min-height: 0; display: flex; justify-content: center; }
.ep-sitio[hidden], .ep-mando[hidden] { display: none; }
.ep-escena { width: 100%; height: 100%; max-width: calc((var(--alto) - 200px) * 2.05); margin: 0 auto; }
.ep-escena .cl-arte { height: 100%; }
.ep-monta { flex: 1 1 0; min-height: 0; }
.ep-monta .cl-intro { margin: 0 auto 8px; }
.ep-monta .cl-escena { max-width: calc((var(--alto) - 190px) * 1.54); }
.ep-monta .cl-col-escena { top: 0; }
.ep-escena image { pointer-events: none; }
.ep-hit { pointer-events: all; cursor: pointer; }
.ep-aura { animation: ep-aura 1.3s ease-in-out infinite; }
@keyframes ep-aura { 0%, 100% { opacity: .35; } 50% { opacity: 1; } }
.ep-barra { height: 8px; border-radius: 99px; background: var(--sup-3); overflow: hidden; }
.ep-barra i { display: block; height: 100%; width: 0; border-radius: 99px; background: var(--acento); transition: width .45s var(--suave); }
.ep-escena .cl-arte svg { width: 100%; height: 100%; aspect-ratio: auto; }
.ep-escena .cl-bocadillo { max-width: 62%; }
.ep-escena .cl-bocadillo .cl-jp { font-size: clamp(20px, 2.1vw, 27px); }
.ep-mando { flex: 0 0 168px; display: grid; gap: 8px; align-content: start; }
.ep-pide { margin: 0; text-align: center; font: var(--peso-titulo) 19px/1.35 var(--f-titulo); color: var(--tinta); text-wrap: balance; }
.ep-opciones { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 12px; }
.ep-opcion { position: relative; display: flex; align-items: center; justify-content: center; gap: 12px; min-height: 68px; padding: 8px 16px; border: var(--borde); border-radius: var(--radio-peq);
  background: var(--sup); box-shadow: var(--sombra-peq); font: 700 20px/1.6 var(--f-jp); color: var(--tinta); cursor: pointer; transition: transform .15s var(--suave), background-color .15s var(--suave); }
.ep-opcion:hover:not(:disabled) { transform: translateY(-2px); background: var(--sup-2); }
.ep-opcion:active:not(:disabled) { transform: translateY(2px); }
.ep-opcion:focus-visible { outline: 3px solid var(--acento); outline-offset: 3px; }
.ep-opcion kbd { position: absolute; right: 8px; top: 8px; }
.ep-opcion > span { padding-right: 16px; }
.ep-opciones.medias .ep-opcion { font-size: 18px; }
.ep-opciones.largas .ep-opcion { font-size: 16px; line-height: 1.5; padding: 8px 16px; }
.ep-opcion.ok { background: var(--bien-suave); box-shadow: inset 0 0 0 2px var(--bien); }
.ep-opcion.mal { background: var(--mal-suave); box-shadow: inset 0 0 0 2px var(--mal); }
.ep-opcion:disabled { cursor: default; }
.ep-opcion:disabled:not(.ok):not(.mal) { opacity: .6; }
.ep-opcion rt { font-size: .5em; }
.ep-porque { margin: 0; padding: 12px 16px; border-radius: var(--radio-peq); font: 600 15px/1.5 var(--f-texto); color: var(--tinta); }
.ep-porque.ok { background: var(--bien-suave); box-shadow: inset 4px 0 0 var(--bien); } .ep-porque.mal { background: var(--mal-suave); box-shadow: inset 4px 0 0 var(--mal); }
.ep-porque b { margin-right: 8px; } .ep-porque.ok b { color: var(--bien-txt); } .ep-porque.mal b { color: var(--mal-txt); }
.ep-fila { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; }
.ep-seguir { min-width: 220px; height: 56px; font-size: 17px; }
.ep-toca-jp { margin: 0; text-align: center; font: 700 24px/1.8 var(--f-jp); color: var(--tinta); }
.ep-tocable { cursor: pointer; }
.ep-tocable .mueve { transition: filter .15s var(--suave); } .ep-tocable:hover .mueve { filter: drop-shadow(0 0 3px var(--aviso)) drop-shadow(0 0 8px var(--aviso)); }
.ep-monta { margin-top: 4px; }
/* la carta de una regla */
.ep-regla-capa { position: fixed; inset: 0; z-index: 60; display: flex; padding: 16px; background: var(--velo); overflow: auto; }   /* flex + margin:auto: centrada, y si no cabe, se lee desde arriba */
.ep-regla { position: relative; margin: auto; width: min(620px, 100%); padding: 28px 28px 24px; border-radius: var(--radio); background: var(--sup); box-shadow: var(--sombra-flotante); border: 1px solid var(--linea); }
.ep-regla-nueva { display: inline-block; padding: 4px 12px; border-radius: var(--radio-btn); background: color-mix(in srgb, var(--aviso) 18%, var(--sup)); color: var(--aviso-txt); font: 800 12px/1.2 var(--f-texto); letter-spacing: .1em; text-transform: uppercase; }
.ep-regla h2 { margin: 12px 0 12px; font: var(--peso-titulo) 26px/1.3 var(--f-titulo); color: var(--tinta); text-wrap: balance; } .ep-regla h2 rt { font-size: .45em; }
.ep-patron { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 16px; padding: 16px; border-radius: var(--radio-peq); background: var(--sup-2); }
.ep-hueco { padding: 4px 16px; border-radius: var(--radio-peq); background: var(--sup); border: 1.5px dashed color-mix(in srgb, var(--tinta-3) 82%, var(--sup)); /* el hueco se ve (≥ 3:1) en los cuatro temas */ font: 700 16px/1.6 var(--f-texto); color: var(--tinta-2); }
.ep-fija { padding: 4px 16px; border-radius: var(--radio-peq); background: var(--boton); color: var(--boton-tinta); font: 700 21px/1.5 var(--f-jp); box-shadow: var(--sombra-btn); }
.ep-fija rt { font-size: .5em; }
.ep-explica { margin: 0 0 12px; font: 600 16px/1.6 var(--f-texto); color: var(--tinta); } .ep-explica rt { font-size: .55em; }
.ep-ejemplos { list-style: none; margin: 0 0 12px; padding: 0; display: grid; gap: 8px; }
.ep-ejemplos li { display: flex; align-items: center; gap: 12px; padding: 8px 12px; border-radius: var(--radio-peq); background: var(--sup-2); }
.ep-ejemplos li > i { width: 40px; }
.ep-ejemplos span { font: 700 19px/1.8 var(--f-jp); color: var(--tinta); } .ep-ejemplos small { display: block; font: 600 13px/1.4 var(--f-texto); color: var(--tinta-2); }
.ep-ojo { margin: 0 0 16px; padding: 12px 16px; border-radius: var(--radio-peq); background: var(--mal-suave); box-shadow: inset 4px 0 0 var(--mal); font: 600 14.5px/1.5 var(--f-texto); color: var(--tinta); }
.ep-ojo b { color: var(--mal-txt); }
.ep-regla [data-vale] { width: 100%; height: 56px; }
/* el reto de Kage: su rincón es oscuro en todos los temas (arte del personaje) */
.ep-reto { max-width: 920px; margin: 0 auto; display: grid; gap: 16px; }
.ep-reto-cab { display: grid; grid-template-columns: 1fr auto; align-items: end; gap: 16px; padding: 16px 20px; border-radius: var(--radio); background: #28202c; /* arte: el rincón de Kage */ border: 1px solid var(--linea); box-shadow: var(--sombra); color: #f4eee8; }
.ep-kage { position: relative; display: flex; align-items: flex-end; gap: 12px; min-height: 150px; }
.ep-kage img { width: 150px; height: 150px; object-fit: contain; margin-bottom: -12px; filter: drop-shadow(0 6px 8px rgba(0, 0, 0, .45)); /* arte */ }
.ep-kage .cl-bocadillo { position: relative; left: auto; top: auto; max-width: 440px; margin-bottom: 32px; }
.cl-bocadillo.quien-kage { --boc: color-mix(in srgb, var(--tinta-2) 20%, var(--sup)); --c: var(--tinta-2); }
.cl-bocadillo.quien-kotaro { --boc: color-mix(in srgb, var(--acento) 18%, var(--sup)); --c: var(--acento); }
.ep-marcador { display: grid; justify-items: end; gap: 8px; }
.ep-corazones { display: flex; gap: 8px; font-size: 28px; line-height: 1; }
.ep-corazones i { font-style: normal; color: #ff6b81; /* arte: sobre el rincón oscuro de Kage */ text-shadow: 0 3px 0 #9e2338; transition: color .3s var(--suave), filter .3s var(--suave); }
.ep-corazones i.roto { color: #8f7d8a; /* arte: el corazón perdido se sigue viendo sobre el rincón oscuro (≥ 3:1) */ text-shadow: none; filter: grayscale(1); }
.ep-combo { padding: 4px 12px; border-radius: var(--radio-btn); background: var(--aviso); color: var(--aviso-sobre); font: 800 18px/1.2 var(--f-texto); font-variant-numeric: tabular-nums; }
.ep-puntos { display: flex; gap: 8px; } .ep-puntos i { width: 14px; height: 14px; border-radius: 50%; background: rgba(255, 255, 255, .25); /* sobre el rincón oscuro */ transition: transform .2s var(--muelle), background-color .2s var(--suave); }
.ep-puntos i.ahora { background: #fff; transform: scale(1.25); } .ep-puntos i.bien { background: var(--bien); } .ep-puntos i.mal { background: var(--mal); }
.ep-pregunta { display: grid; gap: 16px; padding: 24px; border-radius: var(--radio); background: var(--sup); border: var(--borde); box-shadow: var(--sombra); }
.ep-q-jp { margin: 0; text-align: center; font: 700 clamp(24px, 3vw, 34px)/1.9 var(--f-jp); color: var(--tinta); } .ep-q-jp rt { font-size: .45em; }
.ep-q-tr { text-align: center; font: 600 14px/1.4 var(--f-texto); color: var(--tinta-2); margin-top: -12px; }
.ep-blanco { display: inline-block; min-width: 1.6em; padding: 0 .25em; border-radius: 8px; background: var(--aviso-suave); border: 2px dashed var(--aviso); color: var(--aviso-txt); }
.ep-blanco.lleno { background: var(--bien-suave); border-style: solid; border-color: var(--bien); color: var(--bien-txt); }
.ep-oye { justify-self: center; width: 84px; height: 84px; border-radius: 50%; border: 0; background: var(--boton); color: var(--boton-tinta); font-size: 30px; box-shadow: var(--sombra-btn); cursor: pointer; transition: transform .15s var(--suave); }
.ep-oye:hover { transform: translateY(-2px); } .ep-oye:active { transform: translateY(2px); } .ep-oye:focus-visible { outline: 3px solid var(--acento); outline-offset: 3px; }
.ep-opciones.imagenes .ep-opcion { min-height: 140px; } .ep-opciones.imagenes svg { width: 120px; height: 124px; }
.ep-gana, .ep-pierde { display: grid; justify-items: center; gap: 4px; padding: 12px; text-align: center; }
.ep-gana b { font: var(--peso-titulo) 34px/1.2 var(--f-titulo); color: var(--bien-txt); } .ep-pierde b { font: var(--peso-titulo) 30px/1.2 var(--f-titulo); color: var(--acento-tinta); }
.ep-gana small, .ep-pierde small { font: 700 15px/1.4 var(--f-texto); color: var(--tinta-2); }
/* final */
.ep-final { max-width: 720px; margin: 0 auto; padding: 28px 32px 24px; border-radius: var(--radio); background: var(--sup); border: var(--borde); box-shadow: var(--sombra); display: grid; gap: 16px; justify-items: center; text-align: center; }
.ep-estrellas { display: flex; gap: 16px; font-size: 64px; line-height: 1; }
.ep-estrellas i { font-style: normal; color: color-mix(in srgb, var(--tinta-3) 82%, var(--sup)); } .ep-estrellas i.si { color: color-mix(in srgb, var(--aviso) 88%, var(--tinta)); text-shadow: 0 4px 0 color-mix(in srgb, var(--aviso) 45%, var(--tinta)); }
.ep-estrellas i:nth-child(2) { font-size: 80px; margin-top: -12px; }
.ep-final h2 { margin: 0; font: var(--peso-titulo) 30px/1.25 var(--f-titulo); color: var(--tinta); text-wrap: balance; }
.ep-guia { margin: 0; padding: 12px 16px; border-radius: var(--radio-peq); background: color-mix(in srgb, var(--t-gram) 10%, var(--sup)); font: 600 14px/1.5 var(--f-texto); color: var(--tinta-2); }
.ep-guia a { color: color-mix(in srgb, var(--t-gram) 60%, var(--tinta)); font-weight: 700; text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 3px; }
.ep-guia a:focus-visible { outline: 2px solid var(--acento); outline-offset: 3px; border-radius: 4px; }
.ep-guia rt { font-size: .5em; }
.ep-proxima.pronto { opacity: .7; } .ep-proxima.pronto svg { filter: saturate(.4); }
.ep-final .ep-objetivos { justify-self: stretch; text-align: left; padding: 12px 16px; border-radius: var(--radio-peq); background: var(--sup-2); }
.ep-ganadas { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }
.ep-proxima { display: grid; grid-template-columns: 96px 1fr; align-items: center; gap: 16px; justify-self: stretch; padding: 12px 16px; border-radius: var(--radio-peq); background: color-mix(in srgb, var(--acento) 10%, var(--sup)); text-align: left; }
.ep-proxima svg { width: 96px; height: 100px; }
.ep-proxima small { font: 800 11px/1.2 var(--f-texto); letter-spacing: .1em; text-transform: uppercase; color: var(--acento-tinta); }
.ep-proxima b { display: block; font: 700 17px/1.5 var(--f-jp); color: var(--tinta); } .ep-proxima p { margin: 4px 0 0; font: 600 13.5px/1.45 var(--f-texto); color: var(--tinta-2); }
/* en vertical (móvil), la escena no se estira hacia arriba (recortaría a los personajes por los lados): casi su
   proporción de 400 × 260, y el sitio que sobra es para el mando */
@media (max-aspect-ratio: 4/5) {
  .ep-historia { justify-content: center; }
  .ep-sitio { flex: 0 0 auto; }
  .ep-escena { height: auto; }
  .ep-escena .cl-arte svg { aspect-ratio: 400 / 300; height: auto; }
  .ep-mando { flex: 1 1 auto; }
  /* «monta» en un móvil: escena más baja y piezas más compactas para que la bandeja y los botones quepan */
  .ep-monta { overflow-y: auto; }
  .ep-monta .cl-escena { max-width: calc(21vh * 1.54); margin: 0 auto; }
  .ep-monta .cl-dice { margin-top: 6px; min-height: 0; }
  .ep-monta .cl-huecos { margin: 8px auto 4px; gap: 6px; }
  .ep-monta .cl-hueco, .ep-monta .cl-montar .cl-huecos .cl-hueco { height: 46px; min-width: 48px; font-size: 18px; }
  .ep-monta .cl-pieza { height: 44px; font-size: 16px; padding: 0 8px 0 12px; }
  .ep-monta .cl-bandeja { gap: 8px; }
  .ep-monta .cl-encargo { padding: 8px 12px; }
  /* el reto de Kage, igual de compacto */
  .ep-reto { gap: 12px; }
  .ep-reto-cab { padding: 12px 16px; }
  .ep-kage img { width: 92px; height: 92px; }
}
/* ventanas bajas (1000 × 680): la carta del final se compacta para que quepa con sus botones sin bajar */
@media (max-height: 760px) {
  .ep-final { padding: 16px 24px 16px; gap: 8px; }
  .ep-estrellas { gap: 12px; font-size: 44px; } .ep-estrellas i:nth-child(2) { font-size: 56px; margin-top: -8px; }
  .ep-final h2 { font-size: 26px; }
  .ep-final .ep-objetivos { padding: 8px 16px; gap: 4px; margin-bottom: 0; }
  .ep-ganadas { gap: 4px 8px; } .ep-ganadas span { padding: 2px 12px; }
  .ep-proxima { grid-template-columns: 64px 1fr; gap: 12px; padding: 8px 16px; } .ep-proxima svg { width: 64px; height: 68px; }
  .ep-guia { padding: 8px 16px; }
}
@media (max-width: 820px) {
  .ep-mision { grid-template-columns: 1fr; } .ep-mision-carta { margin: -40px 12px 0; }
  .ep-reto-cab { grid-template-columns: 1fr; } .ep-kage img { width: 112px; height: 112px; }
}
@media (prefers-reduced-motion: reduce) {
  .ep-aura { animation: none; }
  .ep-opcion, .ep-barra i, .ep-oye, .ep-tocable .mueve, .ep-puntos i, .ep-corazones i { transition: none; }
}
`;
  document.head.appendChild(s);
}
