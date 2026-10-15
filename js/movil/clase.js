// Las clases de Nyan en el móvil: los mismos episodios que en el escritorio (Misión → Historia → Reto de Kage → Final), con
// la misma escena (foto, reparto en 3D y objetos: clase-escena.js) y la misma «frase que cobra vida», pero hechos para el
// pulgar: arriba la escena con su bocadillo, abajo lo que hay que hacer, y todo en una pantalla, sin desplazar.
// La primera vez las fases se abren en orden y la clase cuenta al ganar a Kage (/api/clase/<id>).
import { gsap } from 'gsap';
import { t, idioma } from '../i18n.js';
import * as son from '../sonido.js';
import { esc, ruby } from '../japones.js';
import { DEFS, MED, figura, recorte, esReparto } from '../clase-arte.js';
import { componer, efectosEn, cumple, cajaFigura } from '../clase-escena.js';
import { $, $$, api, vibrar, quieto, encajar, chispas, CERRAR, PLAY } from './comun.js';

const tr = (o) => (o && typeof o === 'object' ? o[idioma] ?? o.es ?? '' : o || '');
const frase = (s) => String(s || '').split(' ').map(ruby).join(' ');   // los espacios separan trozos, como en los libros para niños
const barajar = (l) => { const a = [...l]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const espera = (ms) => new Promise((r) => setTimeout(r, quieto() ? 0 : ms));
const QUIEN = { nyan: { jp: 'ニャン', fig: 'nyan' }, tama: { jp: 'タマ', fig: 'gato' }, sensei: { jp: 'フクロ先生', fig: 'sensei' },
  tendero: { jp: 'ポン', fig: 'persona' }, kage: { jp: 'カゲ', fig: 'kage' }, kotaro: { jp: 'コタロー', fig: 'perro' } };
const PASOS = ['mision', 'historia', 'reto', 'final'];

let V = null, app = null, C = null, voces = new Set(), E = null, audio = null, INDICE = [], autoplay = true;

function oir(nombre) {
  if (!nombre || !voces.has(nombre)) return false;
  audio?.pause(); audio = son.pista(`/sonidos/clases/${C.id}/${nombre}.mp3`);
  audio.play().catch(() => {});
  return true;
}
const ganadaAntes = () => { try { return localStorage.getItem('nyango.episodio.' + C.id) === '1'; } catch { return false; } };
const nuevaPartida = (hecha) => ({ alcanzado: 0, hecha, fallos: 0, corazones: 3, corazonesFinal: 0, combo: 0, ganado: false, guardado: false });
const puede = (paso) => E.hecha || PASOS.indexOf(paso) <= E.alcanzado;
const cuerpo = () => $('.mv-cl-cuerpo', V);

// ───────── la escena: foto, reparto y bocadillo ─────────
function conCaras(e, b = {}) {
  const cosas = (e?.cosas || []).map((c) => ({ ...c }));
  const busca = (q) => cosas.find((c) => c.id === q) || cosas.find((c) => c.que === QUIEN[q]?.fig);
  const f = busca(b.habla || 'nyan');
  if (f && b.cara) f.cara = b.cara;
  if (f && b.brazo) f.brazo = b.brazo;
  for (const [q, cara] of Object.entries(b.reacciona || {})) { const o = busca(q); if (o) o.cara = cara; }
  return { ...e, cosas };
}
const htmlEscena = (extra = '') => `<figure class="mv-cl-escena ${extra}"><svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMax slice" aria-hidden="true"></svg><div class="mv-cl-boc" hidden></div></figure>`;
function pintarEscena(fig, e, b = {}) {
  const svg = $('svg', fig), cosas = conCaras(e, b);
  const habla = cosas.cosas.find((c) => c.id === (b.por || b.habla || 'nyan')) || cosas.cosas.find((c) => c.que === QUIEN[b.habla || 'nyan']?.fig);
  // el plano medio acerca la cámara a quien habla; en un marco estrecho el encuadre ya la acerca (y el zoom cortaría al otro)
  const estrecha = fig.clientWidth / Math.max(1, fig.clientHeight) < 1.35;
  const cx = Math.min(330, Math.max(70, habla?.x ?? 200)), z = b.plano === 'medio' && !estrecha ? 1.28 : 1, arte = componer(cosas, true);
  const clave = JSON.stringify({ f: e?.fondo, c: (e?.cosas || []).map((c) => [c.que, c.x, c.id]), z, cx: z > 1 ? cx : 0 });
  const nueva = clave !== fig.dataset.clave; fig.dataset.clave = clave;
  svg.innerHTML = DEFS + (z > 1 ? `<g transform="translate(${cx} 178) scale(${z}) translate(${-cx} -178)">${arte}</g>` : arte);
  fig.dataset.hablaId = habla ? habla.id || habla.que : '';
  const zx = (x) => (z > 1 ? z * (x - cx) + cx : x), [desde, hasta] = extension(cosas.cosas);
  fig.dataset.x = String(zx(habla?.x ?? 200)); fig.dataset.a = String(Math.max(0, zx(desde))); fig.dataset.b = String(Math.min(400, zx(hasta)));
  encuadrar(fig);
  if (nueva && !quieto()) gsap.fromTo(svg, { opacity: 0, scale: 1.04 }, { opacity: 1, scale: 1, duration: 0.4, ease: 'power1.out' });
}
// lo que ocupa la escena a lo ancho (de 0 a 400): para encuadrarla en una pantalla más estrecha sin cortar a nadie
function extension(cosas) {
  let a = 400, b = 0;
  for (const c of cosas || []) {
    if (['manpu', 'texto', 'insignia'].includes(c.que)) continue;
    const w = (MED[c.que]?.w || 60) * (c.s ?? 1.25) * (esReparto(c.que) ? 0.62 : 0.85), x = c.x ?? 200;
    a = Math.min(a, x - w / 2); b = Math.max(b, x + w / 2);
  }
  return a < b ? [a - 10, b + 10] : [0, 400];
}
// el encuadre: la escena es de 400 × 260; si el hueco es más alto que eso, se ve una franja de la foto centrada en lo que
// hay (o, si no cabe todo, en quien habla). Se rehace cuando cambia el tamaño (aparecen o se van las opciones de abajo)
function encuadrar(fig) {
  const svg = $('svg', fig), W = fig.clientWidth, H = fig.clientHeight; if (!svg || !W || !H) return;
  const vw = Math.min(400, (260 * W) / H);
  let x0 = 0;
  if (vw < 400) {
    const a = +(fig.dataset.a ?? 0), b = +(fig.dataset.b ?? 400), hx = +(fig.dataset.x ?? 200);
    const centro = b - a <= vw ? (a + b) / 2 : Math.min(Math.max(hx, a + vw / 2), b - vw / 2);
    x0 = Math.min(400 - vw, Math.max(0, centro - vw / 2));
    svg.setAttribute('viewBox', `${x0.toFixed(1)} 0 ${vw.toFixed(1)} 260`); svg.setAttribute('preserveAspectRatio', 'xMidYMax meet');
  } else { svg.setAttribute('viewBox', '0 0 400 260'); svg.setAttribute('preserveAspectRatio', 'xMidYMax slice'); }
  fig.dataset.x0 = String(x0); fig.dataset.vw = String(vw);
  if (!fig._ro && 'ResizeObserver' in window) { fig._ro = new ResizeObserver(() => encuadrar(fig)); fig._ro.observe(fig); }
  const bo = $('.mv-cl-boc', fig); if (bo && !bo.hidden) colocar(fig, bo);
}
// el bocadillo, encima de quien habla, con el pico hacia él
function colocar(fig, bo) {
  const W = fig.clientWidth, H = fig.clientHeight, vw = +(fig.dataset.vw || 400), hx = +(fig.dataset.x || 200);
  const k = vw < 400 ? W / vw : Math.max(W / 400, H / 260), x = vw < 400 ? (hx - +(fig.dataset.x0 || 0)) * k : (W - 400 * k) / 2 + hx * k;
  const w = bo.offsetWidth, izq = Math.min(W - w - 8, Math.max(8, x - w * 0.42));
  bo.style.left = `${izq}px`; bo.style.setProperty('--cola', `${Math.min(86, Math.max(12, ((x - izq) / w) * 100)).toFixed(1)}%`);
}
function hablar(fig, b) {
  const bo = $('.mv-cl-boc', fig), q = b.habla || 'nyan';
  bo.className = `mv-cl-boc quien-${q}`;
  bo.innerHTML = `${q !== 'nyan' ? `<b class="mv-cl-quien" lang="ja">${QUIEN[q]?.jp || ''}</b>` : ''}<div class="mv-cl-jp" lang="ja">${frase(b.jp)}</div><div class="mv-cl-tr">${esc(tr(b.tr))}</div>`;
  bo.hidden = false; colocar(fig, bo);
  if (!quieto()) gsap.fromTo(bo, { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.38, ease: 'back.out(2.2)', transformOrigin: `${bo.style.getPropertyValue('--cola') || '30%'} 100%` });
  const g = fig.dataset.hablaId && $$('.cosa', fig).find((x) => x.dataset.id === fig.dataset.hablaId), m = g && $('.mueve', g);
  if (m && !quieto()) gsap.fromTo(m, { y: 0 }, { y: -9, duration: 0.14, yoyo: true, repeat: 1, ease: 'power2.out' });
  if (b.voz && autoplay) setTimeout(() => oir(b.voz), quieto() ? 0 : 180);
}
const callar = (fig) => { const bo = $('.mv-cl-boc', fig); if (bo) bo.hidden = true; };

// ───────── la cabecera: salir, las cuatro fases y los apuntes ─────────
function pintarPasos(aqui, dentro = 0) {
  $$('.mv-cl-paso', V).forEach((b) => {
    const p = b.dataset.paso, k = PASOS.indexOf(p), a = PASOS.indexOf(aqui);
    b.classList.toggle('aqui', p === aqui); b.classList.toggle('hecho', k < a); b.classList.toggle('cerrado', !puede(p));
    $('i b', b).style.width = k < a ? '100%' : p === aqui ? `${Math.max(8, dentro * 100)}%` : '0%';
  });
}
// desde la barra de fases: la primera vez, solo lo ya abierto (sin saltarse la clase)
function saltar(paso) {
  if (!puede(paso)) { son.fallo(); vibrar([18, 40, 18]); aviso(t('ep.cerrado')); return; }
  ir(paso);
}
// la clase avanza: abre la fase y la pinta
function ir(paso) {
  audio?.pause(); gsap.killTweensOf($$('*', cuerpo())); $('.mv-cl-capa', V)?.remove();
  E.alcanzado = Math.max(E.alcanzado, PASOS.indexOf(paso));
  pintarPasos(paso, paso === 'final' ? 1 : 0);
  ({ mision, historia: () => historia(C.historia, () => ir('reto')), reto, final })[paso]();
}
function aviso(txt) {
  const a = document.createElement('div'); a.className = 'mv-cl-aviso'; a.textContent = txt; V.appendChild(a);
  if (quieto()) setTimeout(() => a.remove(), 1800);
  else gsap.timeline({ onComplete: () => a.remove() }).fromTo(a, { y: -10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.25 }).to(a, { opacity: 0, duration: 0.3, delay: 1.4 });
}

// ───────── 1 · la misión ─────────
function mision() {
  const M = C.mision || {}, e = M.escena || C.historia.find((b) => b.escena)?.escena;
  cuerpo().innerHTML = `${htmlEscena('baja')}
    <div class="mv-carta mv-cl-mision"><small>${t('ep.mision.eyebrow', { n: C.clase })}</small>
      <h1 lang="ja">${ruby(tr(C.titulo))}</h1>
      <p><b>${t('ep.mision.tit')}</b> ${ruby(tr(M.texto))}</p>
      <ul class="mv-cl-obj">${['1', '2', '3'].map((k) => `<li><i>★</i>${t('ep.obj.' + k)}</li>`).join('')}</ul>
      ${(C.reglas || []).length ? `<div class="mv-cl-gana"><small>${t('ep.mision.aprenderas')}</small>${C.reglas.map((r) => `<span lang="ja">${ruby(tr(r.nombre))}</span>`).join('')}</div>` : ''}</div>
    <button class="mv-btn" data-empezar>${t(E.hecha ? 'ep.mision.otra' : 'ep.mision.empezar')}</button>`;
  const fig = $('.mv-cl-escena', cuerpo()); pintarEscena(fig, e, M);
  if (M.jp) hablar(fig, { habla: 'nyan', jp: M.jp, tr: '', voz: M.voz });
  encajar($('.mv-cl-mision', cuerpo()), 0.72);
  if (!quieto()) { gsap.fromTo($('.mv-cl-mision', cuerpo()), { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.4)' }); gsap.fromTo($$('.mv-cl-obj li', cuerpo()), { x: -14, opacity: 0 }, { x: 0, opacity: 1, duration: 0.35, stagger: 0.1, delay: 0.35 }); }
  son.papel?.();
  $('[data-empezar]', cuerpo()).onclick = () => { vibrar(10); son.toque?.(); E.fallos = 0; ir('historia'); };
}

// ───────── 2 · la historia (dice · elige · regla · monta · toca) ─────────
function historia(beats, alFinal) {
  cuerpo().innerHTML = `${htmlEscena()}<div class="mv-cl-mando" aria-live="polite"></div>`;
  const fig = $('.mv-cl-escena', cuerpo()), mando = $('.mv-cl-mando', cuerpo());
  let i = -1, escena = null;
  const dicho = []; // lo que ya se ha dicho: debajo de la escena, para releerlo (lo más viejo se pierde por arriba)
  const htmlLog = () => (dicho.length ? `<div class="mv-cl-log" aria-label="${t('mv.cl.dicho')}">${dicho.map((l) => `<button class="mv-cl-linea quien-${l.habla || 'nyan'}"${l.voz && voces.has(l.voz) ? ` data-voz="${l.voz}"` : ''}>
    <b lang="ja">${QUIEN[l.habla || 'nyan']?.jp || ''}</b><span lang="ja">${frase(l.jp)}</span><small>${esc(tr(l.tr))}</small></button>`).join('')}</div>` : '');
  const seguir = (txt = t('ep.seguir'), voz = null) => {
    const extra = mando.querySelector('.mv-cl-extra, .mv-cl-log');
    mando.innerHTML = `${extra ? extra.outerHTML : ''}<div class="mv-cl-fila">${voz && voces.has(voz) ? `<button class="mv-btn-claro mv-cl-oir" aria-label="${t('mv.escuchar')}">${PLAY}</button>` : ''}<button class="mv-btn" data-seguir>${txt}</button></div>`;
    $('[data-seguir]', mando).onclick = () => { vibrar(8); son.toque?.(); siguiente(); };
    $$('.mv-cl-linea[data-voz]', mando).forEach((x) => { x.onclick = () => oir(x.dataset.voz); });
    const o = $('.mv-cl-oir', mando); if (o) o.onclick = () => oir(voz);
    if (!quieto()) gsap.fromTo($('.mv-cl-fila', mando), { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'back.out(2)' });
  };
  function siguiente() {
    i++;
    if (beats === C.historia) pintarPasos('historia', i / beats.length);
    if (i >= beats.length) { alFinal(); return; }
    const b = beats[i];
    if (b.escena) escena = b.escena;
    ({ dice, elige, regla, monta, toca }[b.t] || dice)(b);
  }
  function dice(b) {
    fig.hidden = false; pintarEscena(fig, escena, b); hablar(fig, b);
    mando.innerHTML = htmlLog();
    $$('.mv-cl-linea[data-voz]', mando).forEach((x) => { x.onclick = () => oir(x.dataset.voz); });
    dicho.push(b);
    seguir(i === beats.length - 1 ? t('ep.seguir_fin') : t('ep.seguir'), b.voz);
  }
  function elige(b) {
    pintarEscena(fig, escena, { ...b, cara: b.cara_pide || 'pensando' }); callar(fig);
    const ops = barajar(b.opciones.map((o, k) => ({ ...o, k })));
    mando.innerHTML = `<div class="mv-cl-extra"><span class="mv-etq">${t('mv.cl.responde')}</span><p class="mv-cl-pide">${ruby(tr(b.pide) || t('ep.elige'))}</p></div>
      <div class="mv-cl-ops">${ops.map((o) => `<button class="mv-btn-claro mv-cl-op" data-k="${o.k}"><span lang="ja">${frase(o.jp)}</span></button>`).join('')}</div>
      <p class="mv-cl-porque" hidden></p>`;
    const botones = $$('.mv-cl-op', mando), porque = $('.mv-cl-porque', mando);
    if (!quieto()) gsap.fromTo(botones, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.32, stagger: 0.06, ease: 'back.out(1.8)' });
    let fallado = false;
    botones.forEach((bt) => { bt.onclick = () => {
      if (bt.disabled) return;
      const o = b.opciones[+bt.dataset.k];
      if (o.bien) {
        botones.forEach((x) => { x.disabled = true; if (x !== bt) x.classList.add('apagada'); }); bt.classList.add('bien');
        E.combo++; son.acierto(Math.min(5, E.combo)); vibrar(12); chispas(bt);
        pintarEscena(fig, escena, { ...b, cara: o.cara || b.cara || 'feliz', reacciona: o.reacciona || b.reacciona });
        hablar(fig, { habla: b.habla || 'nyan', jp: o.jp, tr: o.tr, voz: o.voz }); dicho.push({ habla: b.habla || 'nyan', jp: o.jp, tr: o.tr, voz: o.voz });
        const extra = $('.mv-cl-extra', mando);
        if (extra) extra.innerHTML = o.porque ? `<p class="mv-cl-porque bien"><b>✓</b> ${ruby(tr(o.porque))}</p>` : '';
        setTimeout(() => seguir(t('ep.seguir'), o.voz), quieto() ? 0 : 450);
      } else {
        bt.disabled = true; bt.classList.add('mal'); E.combo = 0; son.fallo(); son.voz?.('eh'); vibrar([18, 50, 18]);
        if (!fallado) { fallado = true; E.fallos++; }
        if (!quieto()) gsap.fromTo(bt, { x: -8 }, { x: 0, duration: 0.35, ease: 'elastic.out(1, .3)' });
        pintarEscena(fig, escena, { ...b, cara: 'sorpresa', reacciona: o.reacciona || b.reacciona_mal || {} });
        porque.hidden = false; porque.className = 'mv-cl-porque mal'; porque.innerHTML = `<b>✗</b> ${ruby(tr(o.porque) || t('ep.casi'))}`;
      }
    }; });
  }
  function regla(b) {
    const r = (C.reglas || []).find((x) => x.id === b.regla);
    if (!r) { siguiente(); return; }
    cartaRegla(r, siguiente);
  }
  function monta(b) {
    fig.hidden = true; mando.innerHTML = '';
    montar(mando, C.practica, b.encargo, (algunFallo) => { if (algunFallo) E.fallos++; else E.combo++; fig.hidden = false; mando.innerHTML = ''; siguiente(); });
  }
  function toca(b) {
    fig.hidden = false; pintarEscena(fig, escena, b); callar(fig);
    mando.innerHTML = `<div class="mv-cl-extra"><span class="mv-etq">${t('mv.cl.toca')}</span><p class="mv-cl-pide">${ruby(tr(b.pide))}</p>
      ${b.jp ? `<p class="mv-cl-toca-jp" lang="ja">${frase(b.jp)}</p>` : ''}</div><p class="mv-cl-porque" hidden></p>
      ${b.voz && voces.has(b.voz) ? `<div class="mv-cl-fila"><button class="mv-btn-claro mv-cl-oir-ancho">${PLAY} ${t('mv.cl.otra_vez')}</button></div>` : ''}`;
    if (b.voz) oir(b.voz);
    const o = $('.mv-cl-oir-ancho', mando); if (o) o.onclick = () => oir(b.voz);
    const porque = $('.mv-cl-porque', mando);
    let fallado = false, hecho = false;
    // cada cosa se toca por su silueta; las que no son del reparto llevan un halo que late
    $$('.cosa[data-id]', fig).forEach((g) => {
      const que = g.dataset.que, md = MED[que] || { w: 60, h: 60 }, w = (esReparto(que) ? md.w * 0.62 : md.w) + 14, h = md.h + 10;
      if (!esReparto(que)) $('.mueve', g)?.insertAdjacentHTML('afterbegin', `<ellipse class="ep-aura" cx="0" cy="${(-h / 2).toFixed(1)}" rx="${(w * 0.72 + 8).toFixed(1)}" ry="${(h * 0.66 + 8).toFixed(1)}" fill="url(#ep-halo)"/>`);
      $('.mueve', g)?.insertAdjacentHTML('beforeend', `<rect x="${(-w / 2).toFixed(1)}" y="${(-h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="transparent"/>`);
      g.classList.add('mv-tocable');
      g.addEventListener('click', () => {
        if (hecho) return;
        const m = $('.mueve', g);
        if (g.dataset.id === b.bien) {
          hecho = true; E.combo++; son.acierto(Math.min(5, E.combo)); vibrar(12); chispas(g, { n: 14 });
          if (m && !quieto()) gsap.to(m, { y: -16, duration: 0.18, yoyo: true, repeat: 3, ease: 'power2.out' });
          porque.hidden = !b.bien_msg; porque.className = 'mv-cl-porque bien'; if (b.bien_msg) porque.innerHTML = `<b>✓</b> ${ruby(tr(b.bien_msg))}`;
          $$('.mv-tocable', fig).forEach((x) => x.classList.remove('mv-tocable')); $$('.ep-aura', fig).forEach((a) => a.remove());
          setTimeout(() => seguir(), quieto() ? 0 : 600);
        } else {
          E.combo = 0; son.fallo(); vibrar([18, 50, 18]); if (!fallado) { fallado = true; E.fallos++; }
          if (m && !quieto()) gsap.fromTo(m, { x: -5 }, { x: 5, repeat: 5, yoyo: true, duration: 0.05, onComplete: () => gsap.set(m, { x: 0 }) });
          porque.hidden = false; porque.className = 'mv-cl-porque mal'; porque.innerHTML = `<b>✗</b> ${ruby(tr(b.mal_msg) || t('ep.toca_mal'))}`;
        }
      });
    });
  }
  siguiente();
}

// la carta de una regla: a pantalla completa, cuando la historia la necesita
const patronHTML = (p) => String(tr(p) || '').split(/(〔[^〕]*〕)/).filter(Boolean)
  .map((x) => (x.startsWith('〔') ? `<span class="mv-cl-hueco">${ruby(x.slice(1, -1))}</span>` : x.trim() ? `<span class="mv-cl-fija" lang="ja">${ruby(x.trim())}</span>` : '')).join('');
function htmlRegla(r) {
  return `<h2 lang="ja">${ruby(tr(r.nombre))}</h2><div class="mv-cl-patron">${patronHTML(r.patron)}</div>
    <p class="mv-cl-explica">${ruby(tr(r.explica))}</p>
    <ul class="mv-cl-ejemplos">${(r.ejemplos || []).map((ej) => `<li>${ej.voz && voces.has(ej.voz) ? `<button class="mv-cl-oirej" data-voz="${ej.voz}" aria-label="${t('mv.escuchar')}">${PLAY}</button>` : '<i></i>'}
      <div><span lang="ja">${frase(ej.jp)}</span><small>${esc(ej[idioma] || ej.es)}</small></div></li>`).join('')}</ul>
    ${r.ojo ? `<p class="mv-cl-ojo"><b>${t('ep.regla.ojo')}</b> ${ruby(tr(r.ojo))}</p>` : ''}`;
}
function cartaRegla(r, alCerrar) {
  const n = (C.reglas || []).indexOf(r) + 1;
  const capa = document.createElement('div'); capa.className = 'mv-cl-capa';
  capa.innerHTML = `<article class="mv-carta mv-cl-regla" role="dialog" aria-modal="true"><small class="mv-cl-nueva">${t('ep.regla.nueva')} · ${n}/${C.reglas.length}</small>
    <div class="mv-cl-regla-txt">${htmlRegla(r)}</div><button class="mv-btn" data-vale>${t('ep.regla.vale')}</button></article>`;
  V.appendChild(capa);
  const carta = $('.mv-cl-regla', capa);
  encajar($('.mv-cl-regla-txt', capa), 0.68);
  son.papel?.(); setTimeout(() => son.acierto(3), quieto() ? 0 : 250);
  if (!quieto()) { gsap.fromTo(capa, { opacity: 0 }, { opacity: 1, duration: 0.25 }); gsap.fromTo(carta, { y: 50, scale: 0.85, rotate: -3, opacity: 0 }, { y: 0, scale: 1, rotate: 0, opacity: 1, duration: 0.55, ease: 'back.out(1.6)' }); }
  setTimeout(() => chispas($('h2', carta), { n: 16 }), quieto() ? 0 : 500);
  const primera = (r.ejemplos || []).find((ej) => voces.has(ej.voz));
  if (primera && autoplay) setTimeout(() => oir(primera.voz), quieto() ? 0 : 900);
  $$('.mv-cl-oirej', carta).forEach((b) => { b.onclick = () => oir(b.dataset.voz); });
  $('[data-vale]', carta).onclick = () => { vibrar(10); son.toque?.(); audio?.pause(); capa.remove(); alCerrar(); };
}

// «la frase cobra vida»: monta la frase con piezas; la escena hace exactamente lo que dices
function montar(caja, pr, k, alFinal) {
  const P = Object.fromEntries(pr.piezas.map((x) => [x.id, x])), e = pr.encargos[k];
  caja.innerHTML = `<div class="mv-cl-monta">
    <figure class="mv-cl-escena mv-cl-sala"><svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMax slice" aria-hidden="true"></svg></figure>
    <p class="mv-cl-pide fuerte">${ruby(tr(e.pide))}</p>
    <div class="mv-cl-dice"><svg viewBox="-58 -112 116 118" aria-hidden="true"></svg><p aria-live="polite"></p></div>
    <div class="mv-cl-huecos"></div><div class="mv-cl-bandeja"></div>
    <div class="mv-cl-fila"><button class="mv-btn-claro mv-cl-quitar" aria-label="${t('clase.frase.quitar')}">⌫</button><button class="mv-btn" data-primario hidden></button></div></div>`;
  const sala = $('svg', caja), primario = $('[data-primario]', caja), quitarB = $('.mv-cl-quitar', caja);
  const { efectos } = efectosEn(sala, { chispas });
  let huecos = [], orden = [], resuelto = false, fallos = 0, algunFallo = false;
  const decir = (txt, cara = 'normal', html = false) => {
    $('.mv-cl-dice svg', caja).innerHTML = recorte('nyan', cara, cara === 'feliz');
    const p = $('.mv-cl-dice p', caja); p.innerHTML = html ? txt : ruby(txt);
    if (!quieto()) gsap.fromTo(p, { scale: 0.9, opacity: 0.3 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(2.4)', transformOrigin: '0% 50%' });
  };
  const fraseDe = (ids) => ids.map((id) => P[id]?.jp || id).join('');
  function pintar(ultimo = -1) {
    $('.mv-cl-huecos', caja).innerHTML = huecos.map((id, i) => `<button class="mv-cl-h${id ? ' lleno' : ''}" data-i="${i}" data-tipo="${id ? P[id]?.tipo || 'palabra' : ''}">${id ? `<span lang="ja">${ruby(P[id]?.jp || id)}</span>` : `<i>${i + 1}</i>`}</button>`).join('');
    $$('.mv-cl-h', caja).forEach((h) => { h.onclick = () => quitar(+h.dataset.i); });
    if (ultimo >= 0 && !quieto()) gsap.fromTo($$('.mv-cl-h', caja)[ultimo], { scale: 0.6 }, { scale: 1, duration: 0.32, ease: 'back.out(3)' });
    $$('.mv-cl-pieza', caja).forEach((b) => b.classList.toggle('usada', huecos.includes(b.dataset.v)));
    quitarB.disabled = resuelto || !orden.length;
  }
  function poner(id) {
    if (resuelto) return;
    if (huecos.includes(id)) { quitar(huecos.indexOf(id)); return; }
    const i = huecos.indexOf(null); if (i < 0) return;
    huecos[i] = id; orden.push(i); pintar(i); son.toque?.(); vibrar(6);
    if (!huecos.includes(null)) setTimeout(resolver, quieto() ? 60 : 360);
  }
  function quitar(i = orden.at(-1)) {
    if (resuelto || i == null || !huecos[i]) return;
    huecos[i] = null; orden = orden.filter((x) => x !== i); pintar(); son.roce?.();
  }
  function ronda() {
    resuelto = false; orden = []; huecos = Array(e.bien[0].length).fill(null);
    gsap.killTweensOf($$('*', sala));
    sala.innerHTML = DEFS + componer(e.escena || {}, true);
    const fs = sala.parentNode, [a, b] = extension(e.escena?.cosas); fs.dataset.a = String(a); fs.dataset.b = String(b); fs.dataset.x = String((a + b) / 2); encuadrar(fs);
    $('.mv-cl-bandeja', caja).innerHTML = barajar(e.piezas || [...new Set(e.bien.flat())]).map((id) => `<button class="mv-cl-pieza" data-v="${esc(id)}" data-tipo="${P[id]?.tipo || 'palabra'}"><span lang="ja">${ruby(P[id]?.jp || id)}</span></button>`).join('');
    $$('.mv-cl-pieza', caja).forEach((b) => { b.onclick = () => poner(b.dataset.v); });
    decir(fallos ? t('clase.frase.otra_vez') : tr(e.nyan) || t('clase.montar.primero'), fallos ? 'pensando' : 'normal');
    primario.hidden = true; quitarB.hidden = false;
    pintar();
  }
  async function resolver() {
    resuelto = true; pintar();
    const seq = [...huecos], j = e.bien.findIndex((b) => b.length === seq.length && b.every((x, n) => x === seq[n])), acierto = j >= 0;
    if (acierto) {
      await efectos(e.efecto_bien || { tipo: 'brilla' });
      if (!oir(e.voz || `e${k + 1}-${j}`) && !oir(`e${k + 1}-0`)) son.voz?.('nyaa');
      decir(`${ruby(tr(e.bien_msg) || t('clase.msg.ok'))}<br><span class="mv-cl-dicho" lang="ja">${frase(fraseDe(seq))}</span>${e.tr ? ` <small>${esc(tr(e.tr))}</small>` : ''}`, 'feliz', true);
      son.acierto(1); vibrar(12);
    } else {
      const r = (e.fallos || []).find((x) => cumple(x.si, seq));
      if (r) { await efectos(r.efecto); decir(tr(r.msg), r.cara || 'sorpresa'); }
      else {
        const b = e.bien[0], n = seq.findIndex((x, i) => x !== b[i]);
        $$('.mv-cl-h', caja)[n]?.classList.add('mal');
        decir(t('clase.montar.casi', { n: n + 1 }), 'pensando');
      }
      son.voz?.('eh'); son.fallo(); vibrar([18, 50, 18]); fallos++; algunFallo = true;
    }
    quitarB.hidden = true; primario.hidden = false;
    primario.textContent = acierto ? t('ep.seguir') : t('clase.frase.otra');
    primario.onclick = () => { vibrar(8); if (acierto) alFinal(algunFallo); else ronda(); };
  }
  quitarB.onclick = () => quitar();
  if (!quieto()) gsap.fromTo($('.mv-cl-monta', caja), { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 });
  ronda();
}

// ───────── 3 · el reto de Kage ─────────
function reto() {
  const R = C.reto, preguntas = R.preguntas;
  E.corazones = 3; E.combo = 0;
  cuerpo().innerHTML = `<section class="mv-cl-reto">
    <header class="mv-cl-kage"><img src="/img/reparto/kage-presumido-d.webp" alt="" draggable="false">
      <div class="mv-cl-boc quien-kage mv-cl-kage-dice" hidden></div>
      <div class="mv-cl-marcador"><div class="mv-cl-corazones" aria-label="${t('ep.reto.vidas')}">${'<i>♥</i>'.repeat(3)}</div><b class="mv-cl-combo" hidden></b>
        <div class="mv-cl-puntos">${preguntas.map(() => '<i></i>').join('')}</div></div></header>
    <div class="mv-cl-pregunta"></div></section>`;
  const sec = $('.mv-cl-reto', cuerpo()), zona = $('.mv-cl-pregunta', sec), kage = $('.mv-cl-kage img', sec), dice = $('.mv-cl-kage-dice', sec);
  const puntos = $$('.mv-cl-puntos i', sec), combo = $('.mv-cl-combo', sec);
  const kageDice = (l, cara = 'presumido') => {
    if (!l) return;
    kage.src = `/img/reparto/kage-${cara}-d.webp`;
    dice.hidden = false; dice.innerHTML = `<b class="mv-cl-quien" lang="ja">カゲ</b><div class="mv-cl-jp" lang="ja">${frase(l.jp)}</div><div class="mv-cl-tr">${esc(tr(l.tr))}</div>`;
    if (!quieto()) { gsap.fromTo(dice, { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(2)', transformOrigin: '0% 60%' }); gsap.fromTo(kage, { y: 0 }, { y: -8, duration: 0.15, yoyo: true, repeat: 1 }); }
    if (l.voz) oir(l.voz);
  };
  if (!quieto()) gsap.fromTo($('.mv-cl-kage', sec), { x: -40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.4)' });
  kageDice(R.intro);
  let q = -1;
  const perderCorazon = () => {
    E.corazones--; const c = $$('.mv-cl-corazones i', sec)[E.corazones];
    if (c) { c.classList.add('roto'); if (!quieto()) gsap.fromTo(c, { scale: 1.7, rotate: -20 }, { scale: 1, rotate: 0, duration: 0.45, ease: 'back.out(2)' }); }
    if (!quieto()) gsap.fromTo(sec, { x: -6 }, { x: 0, duration: 0.3, ease: 'elastic.out(1, .3)' });
    vibrar([30, 60, 30]);
  };
  const marcarCombo = () => { combo.hidden = E.combo < 2; combo.textContent = `×${E.combo}`; if (E.combo >= 2 && !quieto()) gsap.fromTo(combo, { scale: 1.8 }, { scale: 1, duration: 0.35 }); };
  function siguiente() { q++; if (q >= preguntas.length) victoria(); else pregunta(preguntas[q]); }
  function pregunta(p) {
    puntos.forEach((d, k) => d.classList.toggle('ahora', k === q));
    let html = '', opciones = [];
    if (p.tipo === 'bien_mal') {
      kageDice({ jp: p.jp, tr: p.tr, voz: p.voz }, 'decidido');
      html = `<p class="mv-cl-pide">${t('ep.reto.bien_mal')}</p>`;
      opciones = [{ html: `◯ ${t('ep.reto.bien')}`, ok: !!p.correcta }, { html: `✕ ${t('ep.reto.mal')}`, ok: !p.correcta }];
    } else if (p.tipo === 'oye') {
      html = `<p class="mv-cl-pide">${t('ep.reto.oye')}</p><button class="mv-redondo mv-cl-oye" aria-label="${t('mv.escuchar')}">${PLAY}</button>`;
      opciones = p.opciones.map((o, k) => ({ html: esc(tr(o)), ok: k === p.bien }));
    } else if (p.tipo === 'imagen') {
      html = `<p class="mv-cl-pide">${ruby(tr(p.pide) || t('ep.reto.imagen'))}</p><p class="mv-cl-q" lang="ja">${frase(p.jp)}</p>`;
      opciones = p.opciones.map((id, k) => ({ html: `<svg viewBox="${cajaFigura(id)}" aria-hidden="true">${figura(id)}</svg>`, ok: k === p.bien, imagen: true }));
    } else {
      html = `<p class="mv-cl-pide">${ruby(tr(p.pide) || t('ep.reto.elige'))}</p><p class="mv-cl-q" lang="ja">${frase(p.jp).replace('＿', '<span class="mv-cl-blanco">？</span>')}</p>${p.tr ? `<small class="mv-cl-qtr">${esc(tr(p.tr))}</small>` : ''}`;
      opciones = p.opciones.map((o, k) => ({ html: `<span lang="ja">${ruby(o)}</span>`, ok: k === p.bien, jp: o }));
    }
    const orden = p.tipo === 'bien_mal' ? opciones : barajar(opciones), dos = p.tipo === 'bien_mal', imgs = orden.some((o) => o.imagen);
    zona.innerHTML = `<div class="mv-cl-qcab">${html}</div><div class="mv-cl-ops${imgs ? ' imagenes' : dos ? ' dos' : ''}">${orden.map((o, n) => `<button class="mv-btn-claro mv-cl-op${o.jp ? ' jp' : ''}" data-n="${n}">${o.html}</button>`).join('')}</div>
      <p class="mv-cl-porque" hidden></p><div class="mv-cl-fila"></div>`;
    encajar($('.mv-cl-qcab', zona), 0.7);
    if (!quieto()) gsap.fromTo(zona, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: 'back.out(1.6)' });
    if (p.tipo === 'oye') { $('.mv-cl-oye', zona).onclick = () => oir(p.voz); setTimeout(() => oir(p.voz), 250); }
    const botones = $$('.mv-cl-op', zona), porque = $('.mv-cl-porque', zona), fila = $('.mv-cl-fila', zona);
    let listo = false;
    botones.forEach((bt) => { bt.onclick = () => {
      if (listo) return; listo = true;
      const o = orden[+bt.dataset.n];
      botones.forEach((x) => { x.disabled = true; if (orden[+x.dataset.n].ok) x.classList.add('bien'); else if (x !== bt) x.classList.add('apagada'); });
      const blanco = $('.mv-cl-blanco', zona);
      if (blanco) { blanco.innerHTML = ruby(orden.find((x) => x.ok).jp || ''); blanco.classList.add('lleno'); }
      if (o.ok) {
        E.combo++; marcarCombo(); son.acierto(Math.min(5, E.combo)); vibrar(12); chispas(bt); puntos[q].classList.add('bien');
        if (p.voz && p.tipo !== 'oye' && p.tipo !== 'bien_mal') oir(p.voz);
        if (E.combo >= 3 && Math.random() < 0.5) kageDice(R.pica || { jp: '…やるな。', tr: { es: '…No está mal.', en: '…Not bad.' } }, 'aburrido');
        if (p.porque) { porque.hidden = false; porque.className = 'mv-cl-porque bien'; porque.innerHTML = `<b>✓</b> ${ruby(tr(p.porque))}`; }
        setTimeout(siguiente, quieto() ? 0 : p.porque ? 1600 : 900);
      } else {
        bt.classList.add('mal'); E.combo = 0; marcarCombo(); son.fallo(); puntos[q].classList.add('mal'); perderCorazon();
        porque.hidden = false; porque.className = 'mv-cl-porque mal'; porque.innerHTML = `<b>✗</b> ${ruby(tr(p.porque) || t('ep.casi'))}`;
        if (E.corazones <= 0) { setTimeout(derrota, quieto() ? 0 : 900); return; }
        kageDice(R.burla || { jp: 'ふん！', tr: { es: '¡Ja!', en: 'Hah!' } }, 'presumido');
        fila.innerHTML = `<button class="mv-btn" data-sig>${t('ep.reto.vale')}</button>`;
        $('[data-sig]', fila).onclick = () => { vibrar(8); siguiente(); };
      }
    }; });
  }
  function victoria() {
    E.ganado = true; E.corazonesFinal = E.corazones; son.fanfarria?.();
    kageDice(R.gana, 'aburrido');
    zona.innerHTML = `<div class="mv-cl-gana-reto"><b>${t('ep.reto.ganaste')}</b><small>${t('ep.reto.corazones', { n: E.corazones })}</small></div><div class="mv-cl-fila"><button class="mv-btn" data-seguir>${t('ep.seguir')}</button></div>`;
    chispas($('.mv-cl-gana-reto', zona), { n: 30 });
    if (!quieto()) gsap.fromTo($('.mv-cl-gana-reto', zona), { scale: 0.4, rotate: -6, opacity: 0 }, { scale: 1, rotate: 0, opacity: 1, duration: 0.6, ease: 'back.out(2)' });
    $('[data-seguir]', zona).onclick = () => {
      audio?.pause(); vibrar(8);
      if ((C.epilogo || []).length) historia(C.epilogo, () => ir('final')); else ir('final');
    };
  }
  function derrota() {
    kageDice(R.pierde, 'presumido');
    zona.innerHTML = `<div class="mv-cl-pierde"><b>${t('ep.reto.perdiste')}</b><small>${t('ep.reto.animo')}</small></div>
      <div class="mv-cl-fila"><button class="mv-btn-claro" data-historia>${t('ep.reto.repasar')}</button><button class="mv-btn" data-otra>${t('ep.reto.otra')}</button></div>`;
    if (!quieto()) gsap.fromTo($('.mv-cl-pierde', zona), { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(2)' });
    $('[data-otra]', zona).onclick = () => { son.toque?.(); ir('reto'); };
    $('[data-historia]', zona).onclick = () => ir('historia');
  }
  setTimeout(siguiente, quieto() ? 0 : 1300);
}

// ───────── 4 · el final: estrellas, lo ganado y la próxima ─────────
async function final() {
  const logros = [true, E.fallos <= 2, E.corazonesFinal === 3], n = E.ganado ? logros.filter(Boolean).length : 0;
  const k = INDICE.findIndex((c) => c.id === C.id), sig = k >= 0 ? INDICE[k + 1] : null, abierta = !!sig?.hay;
  cuerpo().innerHTML = `<section class="mv-cl-final">
    <div class="mv-cl-estrellas">${[0, 1, 2].map((j) => `<i class="${E.ganado && logros[j] ? 'si' : ''}">★</i>`).join('')}</div>
    <h2 class="mv-tit">${t(n === 3 ? 'ep.final.perfecto' : 'ep.final.cumplida')}</h2>
    <ul class="mv-cl-obj">${logros.map((ok, j) => `<li class="${E.ganado && ok ? 'si' : 'no'}"><i>${E.ganado && ok ? '★' : '☆'}</i>${t('ep.obj.' + (j + 1))}</li>`).join('')}</ul>
    ${(C.reglas || []).length ? `<div class="mv-cl-gana"><small>${t('ep.final.reglas', { n: C.reglas.length })}</small>${C.reglas.map((r) => `<span lang="ja">${ruby(tr(r.nombre))}</span>`).join('')}</div>` : ''}
    <p class="mv-cl-xp" hidden></p><p class="mv-cl-guia" hidden></p>
    ${sig ? `<div class="mv-carta mv-cl-proxima${abierta ? '' : ' pronto'}"><svg viewBox="${cajaFigura(sig.icono || 'libro')}" aria-hidden="true">${figura(sig.icono || 'libro')}</svg>
      <div><small>${t('ep.final.proxima', { n: sig.clase })}${abierta ? '' : ` · ${t('clase.indice.pronto')}`}</small><b lang="ja">${ruby(tr(sig.titulo))}</b></div></div>` : ''}
    <div class="mv-cl-pie"><div class="mv-cl-fila"><button class="mv-btn-claro" data-repetir>↻ ${t('ep.final.repetir')}</button><button class="mv-btn-claro" data-apuntes><span lang="ja">帳</span> ${t('mv.cl.apuntes')}</button></div>
      <button class="mv-btn" data-sig>${abierta ? t('ep.final.siguiente') : t('mv.cl.volver')}</button></div></section>`;
  encajar($('.mv-cl-final', cuerpo()), 0.7);
  // para estudiarlo a fondo: las lecciones de la guía que tratan los puntos de esta clase
  const puntos = new Set(INDICE[k]?.puntos || []);
  api('/api/gramatica').then((lecs) => {
    const ls = lecs.filter((l) => (l.puntos || []).some((x) => puntos.has(x))).sort((x, y) => x.orden - y.orden).slice(0, 2);
    const g = $('.mv-cl-guia', cuerpo()); if (!g || !ls.length) return;
    g.innerHTML = t('ep.final.guia', { lecciones: ls.map((l) => `<a href="#guia/${encodeURIComponent(l.slug)}">${ruby(l.titulo)}</a>`).join(t('ep.final.guia_y')) });
    g.hidden = false; encajar($('.mv-cl-final', cuerpo()), 0.7);
  }).catch(() => {});
  $$('.mv-cl-estrellas i', cuerpo()).forEach((s, j) => {
    if (!quieto()) gsap.fromTo(s, { scale: 0, rotate: -40, opacity: 0 }, { scale: 1, rotate: 0, opacity: 1, duration: 0.5, delay: 0.25 + j * 0.35, ease: 'back.out(2.4)' });
    if (s.classList.contains('si')) setTimeout(() => { son.acierto(j + 2); chispas(s, { n: 14 }); vibrar(10); }, quieto() ? 0 : 450 + j * 350);
  });
  $('[data-repetir]', cuerpo()).onclick = () => { const hecha = E.hecha || E.ganado; E = nuevaPartida(hecha); ir('mision'); };
  $('[data-apuntes]', cuerpo()).onclick = () => apuntes();
  $('[data-sig]', cuerpo()).onclick = () => { vibrar(10); location.hash = abierta ? `clase/${sig.id}` : 'aprender'; };
  // se guarda una vez por partida ganada; la nota sale de las estrellas
  if (E.ganado && !E.guardado) {
    E.guardado = true; E.hecha = true;
    try { localStorage.setItem('nyango.episodio.' + C.id, '1'); } catch { /* se jugará en orden la próxima vez */ }
    let r = null;
    try { r = await api(`/api/clase/${C.id}`, { aciertos: [6, 8, 10][n - 1], total: 10 }); } catch { aviso(t('clase.fin.no_guardado')); }
    if (!r) return;
    api('/api/sesion/fin', { respuestas: 0, aciertos: 0, mejor_racha: 0, lecciones: 0, gramatica: 1 }).catch(() => {});
    app.inicio(true).catch(() => {});
    const xp = $('.mv-cl-xp', cuerpo());
    if (xp) {
      xp.innerHTML = `<b>+${r.xp} XP</b>${r.tarjetas > 0 ? ` · ${t('ep.final.tarjetas', { n: r.tarjetas })}` : ''}`; xp.hidden = false;
      encajar($('.mv-cl-final', cuerpo()), 0.7);
      if (!quieto()) gsap.fromTo(xp, { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, delay: 1.2, ease: 'back.out(2.4)' });
    }
  }
}

// ───────── los apuntes: la chuleta y cada regla, una página cada una (sin desplazar) ─────────
function apuntes() {
  const ch = C.chuleta, paginas = [];
  if (ch) paginas.push({ tit: t('mv.cl.chuleta'), html: `<div class="mv-cl-patron">${patronHTML(ch.patron)}</div>${ch.patron_tr ? `<p class="mv-cl-explica">${esc(tr(ch.patron_tr))}</p>` : ''}
    <ul class="mv-cl-ejemplos">${(ch.filas || []).map((f) => `<li><i></i><div><span lang="ja">${frase(f.jp)}</span><small>${esc(f[idioma] || f.es)}${f.registro ? ` · <em>${t('mv.cl.reg.' + f.registro)}</em>` : ''}</small></div></li>`).join('')}</ul>
    ${ch.consejo ? `<p class="mv-cl-ojo"><b>${t('clase.apuntes.consejo')}:</b> ${ruby(tr(ch.consejo))}</p>` : ''}` });
  (C.reglas || []).forEach((r, i) => paginas.push({ tit: `${t('mv.cl.regla')} ${i + 1}`, html: htmlRegla(r) }));
  if (!paginas.length) return;
  const capa = document.createElement('div'); capa.className = 'mv-cl-capa';
  capa.innerHTML = `<article class="mv-carta mv-cl-regla mv-cl-apuntes" role="dialog" aria-modal="true">
    <div class="mv-cl-ap-cab"><small class="mv-cl-nueva">${t('clase.apuntes.eyebrow', { n: C.clase })}</small><button class="mv-icono-btn" data-cerrar aria-label="${t('mv.cerrar')}">${CERRAR}</button></div>
    <div class="mv-aj-seg mv-cl-ap-pest" role="tablist">${paginas.map((p, i) => `<button role="tab" data-p="${i}" aria-checked="${i === 0}">${p.tit}</button>`).join('')}</div>
    <div class="mv-cl-regla-txt"></div></article>`;
  V.appendChild(capa);
  const txt = $('.mv-cl-regla-txt', capa);
  const ver = (i) => {
    $$('[data-p]', capa).forEach((b) => b.setAttribute('aria-checked', +b.dataset.p === i));
    txt.innerHTML = paginas[i].html; encajar(txt, 0.66);
    $$('.mv-cl-oirej', txt).forEach((b) => { b.onclick = () => oir(b.dataset.voz); });
    if (!quieto()) gsap.fromTo(txt, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.25 });
  };
  $$('[data-p]', capa).forEach((b) => { b.onclick = () => { vibrar(6); ver(+b.dataset.p); }; });
  $('[data-cerrar]', capa).onclick = () => { audio?.pause(); capa.remove(); };
  if (!quieto()) gsap.fromTo($('.mv-cl-regla', capa), { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'back.out(1.4)' });
  ver(0);
}

// las imágenes del episodio se decodifican mientras se lee la misión: si no, cada cambio de escena da un tirón
function precalentar() {
  const svgs = []; let prev = null;
  for (const b of [...(C.historia || []), ...(C.epilogo || [])]) { if (b.escena) prev = b.escena; if (prev) svgs.push(componer(conCaras(prev, b), true)); }
  for (const enc of C.practica?.encargos || []) if (enc.escena) svgs.push(componer(enc.escena, true));
  const urls = [...new Set([...svgs.join('').matchAll(/href="([^"]+)"/g)].map((m) => m[1]))];
  ['presumido', 'decidido', 'aburrido'].forEach((c) => urls.push(`/img/reparto/kage-${c}-d.webp`));
  let i = 0;
  const uno = () => { if (i >= urls.length) return; const im = new Image(); im.src = urls[i++]; (im.decode ? im.decode() : Promise.resolve()).catch(() => {}).finally(() => setTimeout(uno, 30)); };
  uno(); uno();
}

export async function entrar(v, resto, a) {
  V = v; app = a;
  const [id] = resto;
  if (!id || id === 'guia') { (await import('./pronto.js')).entrar(v); return; }
  v.innerHTML = `<div class="mv-rep mv-cargando"><div class="mv-etq">${t('mv.cl.preparando')}</div></div>`;
  INDICE = await fetch('/clases/indice.json').then((r) => r.json()).catch(() => []);
  const ix = INDICE.find((x) => x.id === id);
  try {
    if (ix && !ix.hay) throw new Error('cerrada');
    const r = await fetch(`/clases/${encodeURIComponent(id)}.json`); if (!r.ok) throw new Error(r.status);
    C = await r.json(); if (ix) C.clase = ix.clase;
    if (C.formato !== 2) throw new Error('formato');
  } catch {
    v.innerHTML = `<div class="mv-pronto"><img src="/img/reparto/nyan-pensando.webp" alt="" width="200" height="200"><h2 class="mv-tit">${t('mv.cl.no_hay')}</h2>
      <p>${t('mv.cl.no_hay_sub')}</p><a class="mv-btn" href="#aprender">${t('mv.cl.volver')}</a></div>`;
    return;
  }
  voces = new Set(await fetch(`/sonidos/clases/${C.id}/indice.json`).then((r) => (r.ok ? r.json() : [])).catch(() => []));
  autoplay = (await app.inicio().catch(() => ({})))?.ajustes?.autoplay !== false;
  E = nuevaPartida(ganadaAntes());
  v.innerHTML = `<div class="mv-cl">
    <header class="mv-cl-cab"><button class="mv-icono-btn" data-salir aria-label="${t('mv.salir')}">${CERRAR}</button>
      <nav class="mv-cl-pasos" aria-label="${t('clase.pasos.aria')}">${PASOS.map((p) => `<button class="mv-cl-paso" data-paso="${p}"><i><b></b></i><span>${t('mv.cl.paso.' + p)}</span></button>`).join('')}</nav>
      <button class="mv-icono-btn mv-cl-ap" data-apuntes aria-label="${t('mv.cl.apuntes')}"><span lang="ja">帳</span></button></header>
    <main class="mv-cl-cuerpo"></main></div>`;
  $('[data-salir]', v).onclick = () => { audio?.pause(); location.hash = 'aprender'; };
  $('[data-apuntes]', v).onclick = () => { vibrar(8); apuntes(); };
  $$('.mv-cl-paso', v).forEach((b) => { b.onclick = () => { if (b.classList.contains('aqui')) return; vibrar(8); saltar(b.dataset.paso); }; });
  precalentar();
  ir('mision');
}
export function salir() { audio?.pause(); }
