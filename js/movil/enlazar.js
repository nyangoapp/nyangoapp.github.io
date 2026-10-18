// Vincular el móvil con el ordenador (el lado del teléfono). Una hoja que sube desde abajo, como Ajustes, con estas pantallas:
//  · visor    la cámara trasera lee el QR de «Tu móvil» del ordenador (BarcodeDetector o el lector de vendor/qr)
//  · código   para teclear el código (también llega relleno si la página se abre con #enlazar=<código>)
//  · uniendo  mientras se unen los dos progresos
//  · listo    «¡Listo! Tu progreso del ordenador ya está aquí»
//  · estado   ya enlazado: línea de estado, aparatos, nombre de este móvil, sincronizar ahora y desvincular (dos toques)
// Más: el puntito de sincronización junto al engranaje (marcar), la línea de la fila de Ajustes (subtitulo), el aviso que sale
// con #enlazar= (iniciar) y repintar la pantalla cuando llega progreso del ordenador ('nyango:sincronizado').
// El motor (motor/enlace.js) hace el trabajo: aquí solo se pide y se pinta.
import { gsap } from 'gsap';
import { t } from '../i18n.js';
import * as son from '../sonido.js';
import { esc } from '../japones.js';
import { $, $$, nodo, vibrar, quieto, CERRAR } from './comun.js';
import * as C from '../enlace-comun.js';
import { puedeInstalar } from './instalar.js';

const VISOR = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M4 12h16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';

// ───────────────────────── el puntito junto al engranaje ─────────────────────────
const puntos = new Set();
const claseDe = (e) => (!e?.enlazado ? null : e.sincronizando ? 'curso' : e.ultimo?.ok === false ? 'mal' : 'ok');
let ultimoEstado = null;
function pintarPuntos(e) {
  ultimoEstado = e;
  for (const b of puntos) {
    if (!b.isConnected) { puntos.delete(b); continue; }
    const c = claseDe(e);
    if (c) b.dataset.en = c; else delete b.dataset.en;
    if (c) b.title = C.lineaEstado(e).txt;
  }
}
addEventListener('nyango:enlace', (ev) => { if (ev.detail) pintarPuntos(ev.detail); });
/** Pone el puntito de sincronización en un botón (el engranaje de la portada): verde, naranja que late (sincronizando) o rojo. */
export function marcar(boton) {
  if (!boton) return;
  puntos.add(boton);
  if (ultimoEstado) pintarPuntos(ultimoEstado);
  C.estado().then((e) => e && pintarPuntos(e));
}
/** La fila de Ajustes: «Vincular con el ordenador» o, enlazado, «Sincronizado hace 1 min». */
export async function subtitulo(fila) {
  const e = await C.estado(); if (!e || !fila?.isConnected) return;
  const l = C.lineaEstado(e);
  $('.mv-en-fila-t', fila).textContent = e.enlazado ? t('mv.enl.fila_si') : t('mv.enl.fila');
  const s = $('.mv-en-fila-s', fila); s.textContent = e.enlazado ? l.txt : ''; s.dataset.c = l.clase; s.hidden = !e.enlazado;
}

// ───────────────────────── la hoja ─────────────────────────
/**
 * Abre la hoja. opciones: { codigo (relleno, ya listo para unir), alCerrar({unido}) }
 * Con el móvil ya enlazado enseña el estado; si no, el visor de la cámara (o el código, si no hay cámara).
 */
export async function abrir(app, { codigo = '', alCerrar = null } = {}) {
  if ($('.mv-en')) return;
  estilos();
  const raiz = nodo(`<div class="mv-aj mv-en" role="dialog" aria-modal="true" aria-labelledby="mv-en-tit"><div class="mv-aj-velo"></div>
    <div class="mv-hoja mv-aj-hoja mv-en-hoja"><i class="mv-agarre" aria-hidden="true"></i>
      <header class="mv-aj-cab"><h2 class="mv-tit mv-en-tit" id="mv-en-tit"></h2><button class="mv-icono-btn" data-cerrar type="button" aria-label="${t('mv.cerrar')}">${CERRAR}</button></header>
      <div class="mv-en-cuerpo"></div></div></div>`);
  $('#movil').appendChild(raiz);
  const hoja = $('.mv-en-hoja', raiz), cuerpo = $('.mv-en-cuerpo', raiz), titulo = $('.mv-en-tit', raiz);
  if (!quieto()) { gsap.fromTo(hoja, { y: '100%' }, { y: '0%', duration: 0.42, ease: 'back.out(1.1)' }); gsap.fromTo($('.mv-aj-velo', raiz), { opacity: 0 }, { opacity: 1, duration: 0.3 }); }
  // con el teclado de iOS delante, la hoja sube con él (sino el campo queda tapado)
  const vv = window.visualViewport;
  const alVisor = () => { raiz.style.height = vv ? `${vv.height}px` : ''; raiz.style.top = vv ? `${vv.offsetTop}px` : ''; };
  if (vv) { vv.addEventListener('resize', alVisor); vv.addEventListener('scroll', alVisor); }

  let camara = null, vivo = true, unido = false, sondeo = null, e = await C.estado();
  const parar = () => { camara?.parar(); camara = null; clearInterval(sondeo); sondeo = null; };
  const cerrar = () => {
    if (raiz.dataset.fuera) return; raiz.dataset.fuera = '1'; vivo = false; parar();
    vv?.removeEventListener('resize', alVisor); vv?.removeEventListener('scroll', alVisor); removeEventListener('nyango:enlace', alEstado);
    const fin = () => { raiz.remove(); alCerrar?.({ unido }); };
    if (quieto()) return fin();
    gsap.to($('.mv-aj-velo', raiz), { opacity: 0, duration: 0.22 });
    gsap.to(hoja, { y: '100%', duration: 0.26, ease: 'power2.in', onComplete: fin });
    setTimeout(() => { if (raiz.isConnected) fin(); }, 450);
  };
  $('[data-cerrar]', raiz).onclick = cerrar;
  $('.mv-aj-velo', raiz).onclick = cerrar;
  addEventListener('hashchange', cerrar, { once: true });

  /** Cambia de pantalla: título, HTML y qué enganchar. */
  const pantalla = (nombre, tit, html, enganchar) => {
    parar(); cuerpo.dataset.p = nombre; titulo.textContent = tit; cuerpo.innerHTML = html; enganchar?.();
    if (!quieto()) gsap.fromTo([...cuerpo.children], { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.32, stagger: 0.04, ease: 'power2.out' });
  };
  const toque = () => { son.toque?.(); vibrar(8); };

  // ── no se puede (sin cifrado en esta página, sin servidor…) ──
  const noSePuede = () => pantalla('no', t('mv.enl.tit'), `<p class="mv-en-p">${t(`enl.no.${e?.motivo === 'sin_cripto' ? 'sin_cripto' : 'sin_servidor'}`)}</p>
    <button class="mv-btn-claro" data-ok type="button">${t('mv.enl.cerrar')}</button>`, () => { $('[data-ok]', cuerpo).onclick = cerrar; });

  // ── el visor de la cámara ──
  const visor = () => {
    pantalla('visor', t('mv.enl.tit'), `<div class="mv-en-visor"><video muted playsinline></video><i class="mv-en-marco" aria-hidden="true"></i><p class="mv-en-estado" aria-live="polite">${t('mv.enl.pidiendo')}</p></div>
      <p class="mv-en-p">${t('mv.enl.visor_p')}</p>
      ${puedeInstalar() ? `<p class="mv-en-p suave">${t('mv.enl.instalar_antes')}</p>` : ''}
      <button class="mv-btn-claro" data-teclear type="button">${t('mv.enl.escribir')}</button>`, async () => {
      $('[data-teclear]', cuerpo).onclick = () => { toque(); teclear(); };
      const estado = $('.mv-en-estado', cuerpo);
      try {
        const cam = await C.escanear($('video', cuerpo), (texto) => {
          const c = C.sacarCodigo(texto);
          if (!c) { estado.textContent = t('mv.enl.no_es'); setTimeout(() => { if (estado.isConnected) estado.textContent = t('mv.enl.apunta'); }, 2200); return; }
          vibrar(14); unirCon(c);
        });
        if (!vivo || cuerpo.dataset.p !== 'visor') { cam.parar(); return; }
        camara = cam; estado.textContent = t('mv.enl.apunta');
      } catch (err) {
        if (cuerpo.dataset.p === 'visor') teclear('', t(err?.name === 'NotAllowedError' || err?.name === 'SecurityError' ? 'mv.enl.sin_permiso' : 'mv.enl.sin_camara'));
      }
    });
  };

  // ── teclear el código ──
  const teclear = (relleno = '', nota = '') => {
    const hayCam = C.hayCamara();
    pantalla('codigo', t('mv.enl.tit'), `<p class="mv-en-p">${nota ? esc(nota) : t('mv.enl.codigo_p')}</p>
      <input class="mv-en-campo" inputmode="text" autocomplete="off" autocapitalize="characters" autocorrect="off" spellcheck="false" maxlength="31" enterkeyhint="go" placeholder="${t('enl.codigo.ph')}" aria-label="${t('mv.enl.codigo_label')}" value="${esc(relleno)}">
      <p class="mv-en-error" role="alert" hidden></p>
      <div class="mv-cl-fila mv-en-fila">${hayCam ? `<button class="mv-btn-claro" data-camara type="button" aria-label="${t('mv.enl.con_camara')}">${VISOR}</button>` : ''}<button class="mv-btn" data-unir type="button">${t('mv.enl.vincular')}</button></div>`, () => {
      const campo = $('.mv-en-campo', cuerpo), error = $('.mv-en-error', cuerpo);
      campo.addEventListener('input', () => { const p = campo.selectionStart, antes = campo.value.length; campo.value = C.agrupar(campo.value); const d = campo.value.length - antes; try { campo.setSelectionRange(p + d, p + d); } catch { /* sin selección */ } error.hidden = true; });
      const ir = () => {
        const c = C.sacarCodigo(campo.value);
        if (!c) { error.textContent = t('enl.codigo.mal'); error.hidden = false; vibrar([10, 40, 10]); campo.focus(); return; }
        campo.blur(); toque(); unirCon(c);
      };
      $('[data-unir]', cuerpo).onclick = ir;
      campo.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); ir(); } });
      $('[data-camara]', cuerpo)?.addEventListener('click', () => { toque(); visor(); });
      if (relleno) campo.value = C.agrupar(relleno);
      else setTimeout(() => campo.focus({ preventScroll: true }), 350);
    });
  };

  // ── unir ──
  async function unirCon(c) {
    if (cuerpo.dataset.p === 'uniendo') return;
    pantalla('uniendo', t('mv.enl.tit'), `<div class="mv-en-espera"><i class="mv-en-giro" aria-hidden="true"></i><p class="mv-en-p" role="status">${t('mv.enl.uniendo')}</p></div>`);
    try {
      const r = await C.unir(c, C.nombreMovil());
      if (!vivo) return;
      unido = true; e = await C.estado();
      await app.inicio(true).catch(() => {});
      listo(r);
    } catch (err) {
      if (!vivo) return;
      vibrar([14, 40, 14]);
      teclear(c, '');
      const error = $('.mv-en-error', cuerpo); error.textContent = err.message; error.hidden = false;
    }
  }

  // ── listo ──
  const listo = (r) => {
    son.fanfarria?.(); vibrar([12, 50, 12]);
    pantalla('listo', t('mv.enl.tit'), `<div class="mv-en-listo"><img src="/img/reparto/nyan-feliz.webp" alt="" width="120" height="120"><h3>${t('mv.enl.listo_tit')}</h3>
      <p class="mv-en-p">${t(r?.cambios > 0 ? 'mv.enl.listo_p' : 'mv.enl.listo_p0')}</p></div>
      <button class="mv-btn" data-ok type="button">${t('mv.enl.seguir')}</button>`, () => {
      $('[data-ok]', cuerpo).onclick = () => { toque(); cerrar(); };
      if (!quieto()) gsap.fromTo($('.mv-en-listo img', cuerpo), { scale: 0.6, rotate: -8 }, { scale: 1, rotate: 0, duration: 0.7, ease: 'elastic.out(1, 0.5)' });
    });
  };

  // ── ya enlazado ──
  const fila = (a) => `<li class="${a.yo ? 'yo' : ''}"><i aria-hidden="true">${a.yo ? '携' : '機'}</i><span><b>${esc(a.nombre)}${a.yo ? ` <em>(${t('enl.este')})</em>` : ''}</b><small>${a.t ? C.haceCuanto(a.t) : ''}</small></span></li>`;
  const repintar = () => {   // la línea, el botón y la lista, sin cambiar de pantalla ni animar
    const l = C.lineaEstado(e), el = $('.mv-en-linea', cuerpo), b = $('[data-ahora]', cuerpo); if (!el || !b) return;
    el.className = `mv-en-linea ${l.clase}`; $('span', el).textContent = l.txt;
    b.classList.toggle('girando', !!e.sincronizando); b.disabled = !!e.sincronizando; $('span', b).textContent = t(e.sincronizando ? 'enl.sincronizando' : 'enl.ahora');
    $('.mv-en-lista', cuerpo).innerHTML = (e.aparatos || []).map(fila).join('');
  };
  const estadoPantalla = () => {
    pantalla('estado', t('mv.enl.tit_si'), `<p class="mv-en-linea"><i class="mv-en-p-dot" aria-hidden="true"></i><span></span></p>
      <ul class="mv-en-lista"></ul>
      <label class="mv-en-nombre"><span>${t('mv.enl.nombre')}</span><input maxlength="24" autocomplete="off" spellcheck="false" enterkeyhint="done" value="${esc(e.nombre || '')}"></label>
      <button class="mv-btn" data-ahora type="button"><i class="mv-en-giro" aria-hidden="true"></i><span></span></button>
      <button class="mv-btn-claro mv-en-quitar" data-quitar type="button">${t('enl.desvincular')}</button>
      <p class="mv-aj-pista">${t('enl.nota')}</p>`, () => {
      repintar();
      const campo = $('.mv-en-nombre input', cuerpo);
      const guardar = async () => { const v = campo.value.trim(); if (v && v !== e.nombre) { try { await C.ponerNombre(v); e = await C.estado(); repintar(); } catch { /* se queda el de antes */ } } };
      campo.addEventListener('change', guardar);
      campo.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); campo.blur(); } });
      $('[data-ahora]', cuerpo).onclick = async () => { toque(); await C.ahora().catch(() => {}); e = await C.estado(); repintar(); };
      const q = $('[data-quitar]', cuerpo);
      q.onclick = async () => {
        if (q.dataset.seguro !== '1') { q.dataset.seguro = '1'; q.textContent = t('mv.ajustes.seguro'); vibrar([10, 30, 10]); setTimeout(() => { if (q.isConnected) { q.dataset.seguro = ''; q.textContent = t('enl.desvincular'); } }, 4000); return; }
        try { await C.quitar(); } catch { /* se quedará enlazado */ }
        e = await C.estado(); vibrar(12);
        if (!e?.enlazado) visor(); else repintar();
      };
      sondeo = setInterval(repintar, 20000);   // «hace 2 min» al día
    });
  };
  function alEstado(ev) { if (ev.detail) { e = ev.detail; if (cuerpo.dataset.p === 'estado') repintar(); } }
  addEventListener('nyango:enlace', alEstado);

  // ── por dónde empezar ──
  if (!e?.disponible) noSePuede();
  else if (e.enlazado) estadoPantalla();
  else if (codigo) teclear(codigo, t('mv.enl.codigo_traido'));
  else if (C.hayCamara()) visor();
  else teclear('', t('mv.enl.sin_camara'));
}

// ───────────────────────── al abrir la página y al llegar progreso ─────────────────────────
/** Lo llama movil/app.js tras la primera pantalla: ofrece vincular si la página se abrió con #enlazar=<código>. */
export function iniciar(app, codigo) {
  if (!codigo) return;
  const c = C.sacarCodigo(codigo);
  if (!c) return;
  C.estado().then((e) => { if (e?.disponible && !e.enlazado) abrir(app, { codigo: c }); });
}

let estilosPuestos = false;
function estilos() {
  if (estilosPuestos || $('#mv-enlazar-css')) return; estilosPuestos = true;
  const s = document.createElement('style'); s.id = 'mv-enlazar-css'; s.textContent = HOJA; document.head.appendChild(s);
}
const HOJA = String.raw`
.mv-chip-aj { position: relative; }
.mv-chip-aj[data-en]::after { content: ""; position: absolute; top: 4px; right: 3px; width: 10px; height: 10px; border-radius: 50%; background: var(--bien); box-shadow: 0 0 0 2px var(--sup); pointer-events: none; }
.mv-chip-aj[data-en="curso"]::after { background: var(--acento); animation: mv-en-late 1.1s ease-in-out infinite; }
.mv-chip-aj[data-en="mal"]::after { background: var(--mal); }
@keyframes mv-en-late { 50% { transform: scale(.6); opacity: .55; } }
.mv-en-fila-s { display: block; margin-top: 1px; font: 500 12.5px var(--f-texto); color: var(--tinta-2); }
.mv-en-fila-s[data-c="mal"] { color: var(--mal-txt); } .mv-en-fila-s[data-c="bien"] { color: var(--bien-txt); }
.mv-en-fila-t { display: block; font-weight: inherit; }
.mv-en { z-index: 60; }
.mv-en-hoja { gap: 12px; }
.mv-en-tit { flex: 1; min-width: 0; font-size: 20px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mv-en-cuerpo { display: flex; flex-direction: column; gap: 12px; min-height: 0; }
.mv-en-p { margin: 0; font: 500 14.5px/1.45 var(--f-texto); color: var(--tinta-2); text-wrap: pretty; } .mv-en-p.suave { font-size: 13px; }
.mv-en-visor { position: relative; align-self: center; width: min(100%, 42vh, 340px); aspect-ratio: 1; border-radius: var(--radio); overflow: hidden; background: #14110d; box-shadow: var(--sombra); }   /* arte: el visor de la cámara es negro en todos los temas */
.mv-en-visor video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.mv-en-marco { position: absolute; inset: 14%; border-radius: var(--radio-peq); box-shadow: 0 0 0 100vmax rgba(10, 8, 6, .45), inset 0 0 0 3px rgba(255, 250, 240, .95); pointer-events: none; }   /* arte: encuadre sobre la imagen de la cámara */
.mv-en-estado { position: absolute; left: 8px; right: 8px; bottom: 8px; margin: 0; text-align: center; font: 700 13px var(--f-texto); color: #fffaf0; text-shadow: 0 1px 4px rgba(0, 0, 0, .65); }   /* arte: texto sobre la cámara */
.mv-en-campo { height: 56px; padding: 0 16px; border: 0; border-radius: var(--radio-peq); background: var(--sup-2); box-shadow: inset 0 0 0 2px var(--linea-2); color: var(--tinta); text-transform: uppercase;
  font: 800 16px/1 var(--f-texto); font-variant-numeric: tabular-nums; letter-spacing: .12em; -webkit-user-select: text; user-select: text; transition: box-shadow .2s var(--suave); }
.mv-en-campo::placeholder { color: var(--tinta-2); opacity: .8; font-weight: 500; letter-spacing: 0; text-transform: none; }
.mv-en-error { margin: -4px 4px 0; font: 700 13.5px/1.35 var(--f-texto); color: var(--mal-txt); } .mv-en-error[hidden] { display: none; }
.mv-en-fila > .mv-btn-claro { flex: none; width: 56px; min-height: 56px; padding: 0; justify-content: center; }
.mv-en-espera { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 36px 0 28px; text-align: center; }
.mv-en-giro { width: 24px; height: 24px; border-radius: 50%; border: 3px solid currentColor; border-right-color: transparent; }
.mv-en-espera .mv-en-giro { width: 40px; height: 40px; color: var(--acento); animation: mv-en-gira .9s linear infinite; }
.mv-btn .mv-en-giro { display: none; } .mv-btn.girando .mv-en-giro { display: block; animation: mv-en-gira .9s linear infinite; }
@keyframes mv-en-gira { to { transform: rotate(360deg); } }
.mv-en-listo { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 8px 8px 8px; text-align: center; }
.mv-en-listo img { width: 120px; height: 120px; object-fit: contain; }
.mv-en-listo h3 { margin: 0; font: var(--peso-titulo) 26px/1.2 var(--f-titulo); color: var(--tinta); text-wrap: balance; }
.mv-en-linea { display: flex; align-items: center; gap: 12px; margin: 0; padding: 12px 16px; border-radius: var(--radio-peq); background: var(--sup-2); font: 700 14.5px/1.35 var(--f-texto); color: var(--tinta); }
.mv-en-p-dot { flex: none; width: 12px; height: 12px; border-radius: 50%; background: var(--tinta-3); }
.mv-en-linea.bien .mv-en-p-dot { background: var(--bien); } .mv-en-linea.curso .mv-en-p-dot { background: var(--acento); animation: mv-en-late 1.1s ease-in-out infinite; }
.mv-en-linea.mal { color: var(--mal-txt); } .mv-en-linea.mal .mv-en-p-dot { background: var(--mal); }
.mv-en-lista { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.mv-en-lista li { display: flex; align-items: center; gap: 12px; padding: 8px 12px; border-radius: var(--radio-peq); background: var(--sup-2); }
.mv-en-lista i { flex: none; display: grid; place-items: center; width: 36px; height: 36px; border-radius: var(--radio-peq); background: var(--sup); color: var(--tinta-2); font: var(--peso-titulo) 15px/1 var(--f-titulo); font-style: normal; box-shadow: inset 0 0 0 1px var(--linea-2); }
.mv-en-lista li.yo i { background: var(--rel-acento); color: var(--tinta-inv); box-shadow: none; }
.mv-en-lista b { display: block; font: 700 15px/1.2 var(--f-texto); } .mv-en-lista b em { font: 500 13px var(--f-texto); font-style: normal; color: var(--tinta-2); }
.mv-en-lista small { display: block; font: 500 12.5px var(--f-texto); color: var(--tinta-2); }
.mv-en-nombre { display: flex; align-items: center; gap: 12px; font: 600 14px var(--f-texto); color: var(--tinta-2); }
.mv-en-nombre input { flex: 1; min-width: 0; height: 48px; padding: 0 16px; border: 0; border-radius: var(--radio-peq); background: var(--sup-2); box-shadow: inset 0 0 0 2px var(--linea-2); font: 700 16px var(--f-texto); color: var(--tinta); -webkit-user-select: text; user-select: text; }
.mv-en-quitar { min-height: 48px; color: var(--mal-txt); font-size: 15px; }
.mv-en .mv-aj-pista { min-height: 0; margin-top: -4px; }
.mv-en-tarjeta { display: flex; align-items: center; gap: 16px; padding: 16px; border-radius: var(--radio); background: var(--acento-suave); box-shadow: inset 0 0 0 2px var(--acento); }
.mv-en-tarjeta i { flex: none; display: grid; place-items: center; width: 52px; height: 52px; border-radius: var(--radio-peq); background: var(--rel-acento); color: var(--tinta-inv); font: var(--peso-titulo) 17px/1 var(--f-titulo); font-style: normal; }
.mv-en-tarjeta p { margin: 0; } .mv-en-tarjeta strong { display: block; font: 800 1.1em/1.25 var(--f-texto); color: var(--tinta); } .mv-en-tarjeta small { display: block; margin-top: 4px; font: 500 .85em/1.35 var(--f-texto); color: var(--tinta-2); }
@media (max-height: 700px) { .mv-en-hoja { gap: 8px; } .mv-en-cuerpo { gap: 8px; } .mv-en-visor { width: min(100%, 36vh, 340px); } .mv-en-listo img { width: 96px; height: 96px; } }
@media (prefers-reduced-motion: reduce) { .mv-chip-aj[data-en="curso"]::after, .mv-en-linea.curso .mv-en-p-dot { animation: none; } }
`;
estilos();
