// «Tu móvil» en los Ajustes del escritorio: enlazar el móvil (y otros aparatos) con un QR o un código, y ver/gestionar lo enlazado.
// El motor (motor/enlace.js) hace el trabajo; aquí solo se pide y se pinta. Sin enlazar: una tarjeta con «Vincular el móvil».
// Enlazando: el QR grande, el código para teclear y 3 pasos; mientras está a la vista, se mira cada pocos segundos si el móvil ya
// ha entrado. Enlazado: la línea «Sincronizado hace 1 min», «Sincronizar ahora», los aparatos (con «hace 2 min»), cambiar el
// nombre de este, vincular otro y desvincular (con confirmación). Se repinta solo con 'nyango:enlace'.
import { gsap } from 'gsap';
import { t } from './i18n.js';
import { esc } from './japones.js';
import { confirmar } from './teclado.js';
import * as C from './enlace-comun.js';

const WEB = 'nyangoapp.github.io';
const quieto = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];

export function htmlEnlace() {
  estilos();
  return `<section class="aj-bloque en-bloque" data-en aria-labelledby="en-tit"><h3 id="en-tit">${t('enl.tit')}</h3><div class="en-cuerpo"></div></section>`;
}

/** Engancha la sección ya puesta en la hoja de Ajustes. → { soltar } */
export function montarEnlace(hoja) {
  const sec = $('[data-en]', hoja), caja = $('.en-cuerpo', sec);
  let vivo = true, e = null, qr = null /* {codigo, url, svg} */, verQR = false, mensaje = '', editando = false, tecleando = false, ocupado = false, firma = '';
  let sondeo = null, reloj = null;

  // ── piezas ──
  const aparato = (a) => `<li class="en-aparato${a.yo ? ' yo' : ''}" data-disp="${esc(a.disp)}"><i class="en-ico" aria-hidden="true">${a.yo ? '機' : '携'}</i>
    <span class="en-que"><b>${esc(a.nombre)}${a.yo ? ` <em>(${t('enl.este')})</em>` : ''}</b><small>${a.t ? C.haceCuanto(a.t) : ''}</small></span>
    ${a.yo ? `<button class="en-mini" data-k="nombre">${t('enl.cambiar_nombre')}</button>` : ''}</li>`;
  const panelQR = () => `<div class="en-qr">
      <div class="en-qr-fila"><div class="en-qr-img">${qr ? qr.svg : '<i class="en-cargando"></i>'}</div>
        <ol class="en-pasos"><li><i>1</i><span>${t('enl.paso1', { web: `<b>${WEB}</b>` })}</span></li><li><i>2</i><span>${t('enl.paso2')}</span></li><li><i>3</i><span>${t('enl.paso3')}</span></li></ol></div>
      <div class="en-codigo-caja"><small>${t('enl.o_escribe')}</small><code class="en-codigo" data-k="copiar" tabindex="0" title="${t('enl.copiar')}">${qr ? qr.codigo : '···'}</code>
        <span class="en-botones"><button class="en-mini" data-k="copiar">${t('enl.copiar')}</button><button class="en-mini" data-k="copiar-enlace">${t('enl.copiar_enlace')}</button></span></div>
      ${e.aparatos.length <= 1 ? `<p class="en-esperando" role="status"><i></i>${t('enl.esperando')}</p>` : ''}</div>`;
  const entrada = () => `<div class="en-entrada"><input class="en-input" data-k="codigo-campo" maxlength="31" autocomplete="off" spellcheck="false" placeholder="${t('enl.codigo.ph')}" aria-label="${t('enl.tengo_codigo')}">
      <button class="en-mini fuerte" data-k="unir">${t('enl.codigo.unir')}</button></div>`;

  function cuerpo() {
    if (!e) return `<p class="en-aviso">${t('enl.no.sin_servidor')}</p>`;
    if (!e.disponible) return `<p class="en-aviso">${t(`enl.no.${e.motivo === 'sin_cripto' ? 'sin_cripto' : 'sin_servidor'}`)}</p>`;
    if (!e.enlazado) {
      return `<div class="en-intro"><b class="en-jp" aria-hidden="true">携帯</b><p><strong>${t('enl.intro.tit')}</strong><small>${t('enl.intro.desc')}</small></p>
          <button class="en-grande" data-k="vincular"${ocupado ? ' aria-disabled="true"' : ''}><span>${t('enl.vincular')}</span></button></div>
        ${mensaje ? `<p class="en-mensaje mal" role="alert">${esc(mensaje)}</p>` : ''}
        ${tecleando ? entrada() : `<button class="en-texto" data-k="tengo">${t('enl.tengo_codigo')}</button>`}`;
    }
    const l = C.lineaEstado(e), gira = e.sincronizando || ocupado;
    const mostrar = e.aparatos.length <= 1 || verQR;
    return `<div class="en-caja"><p class="en-linea ${l.clase}" role="status" aria-live="polite">${esc(l.txt)}</p>
        <button class="en-grande${gira ? ' girando' : ''}" data-k="ahora" aria-disabled="${gira}"><i aria-hidden="true"></i><span>${t(gira ? 'enl.sincronizando' : 'enl.ahora')}</span></button></div>
      ${mensaje ? `<p class="en-mensaje bien" role="status">${esc(mensaje)}</p>` : ''}
      <h4 class="en-sub">${t('enl.aparatos')}</h4><ul class="en-aparatos">${e.aparatos.map(aparato).join('')}</ul>
      ${mostrar ? panelQR() : ''}
      <div class="en-pie">${e.aparatos.length > 1 ? `<button class="en-texto" data-k="otro">${t(verQR ? 'enl.ocultar_qr' : 'enl.otro_movil')}</button>` : ''}
        <button class="en-texto peligro" data-k="quitar">${t(e.aparatos.length > 1 ? 'enl.desvincular' : 'enl.cancelar')}</button></div>
      <p class="aj-nota">${t('enl.nota')}</p>`;
  }
  /** Repinta si cambió algo (y no mientras se escribe un nombre o un código). */
  function pintar(forzar) {
    if (!vivo) return;
    const nueva = JSON.stringify([e && { ...e, ultimo: { ...e.ultimo, t: e.ultimo?.t ? Math.floor(e.ultimo.t / 30) : 0 }, aparatos: e.aparatos.map((a) => ({ ...a, t: a.t ? Math.floor(a.t / 30) : 0 })) }, !!qr, verQR, mensaje, tecleando, ocupado, qr && qr.codigo]);
    if (!forzar && nueva === firma) return;
    if (editando || (tecleando && $('.en-input', caja) && document.activeElement === $('.en-input', caja) && !forzar)) return;
    firma = nueva;
    const f = document.activeElement, k = caja.contains(f) ? f.dataset.k : null;
    caja.innerHTML = cuerpo();
    if (k) $(`[data-k="${k}"]`, caja)?.focus({ preventScroll: true });
    vigilar();
  }
  const decir = (txt, ms = 5000) => { mensaje = txt; pintar(true); if (txt) setTimeout(() => { if (mensaje === txt) { mensaje = ''; pintar(true); } }, ms); };
  async function refrescar() { const x = await C.estado(); if (!vivo) return; e = x; if (e?.enlazado && (e.aparatos.length <= 1 || verQR)) await traerQR(); pintar(); }
  async function traerQR() {
    if (qr) return;
    try { const r = await C.crear(); qr = { codigo: r.codigo, url: r.url, svg: await C.qrSvg(r.url) }; } catch (x) { /* sin código por ahora */ }
  }
  // mientras el QR está a la vista y no hay otro aparato: ¿ha entrado ya el móvil?
  function vigilar() {
    const hace = e?.enlazado && e.aparatos.length <= 1;
    if (hace && !sondeo) {
      sondeo = setInterval(async () => {
        if (!vivo || ocupado) return;
        try { await C.ahora(); } catch (x) { /* ya saldrá en la línea de estado */ }
        const x = await C.estado(); if (!vivo || !x) return;
        const eraUno = e.aparatos.length <= 1;
        e = x;
        if (eraUno && e.aparatos.length > 1) { qr = null; verQR = false; decir(t('enl.vinculado_ok'), 9000); if (!quieto()) gsap.fromTo($('.en-mensaje', caja), { scale: 0.9 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)' }); }
        else pintar();
      }, 4000);
    } else if (!hace && sondeo) { clearInterval(sondeo); sondeo = null; }
  }

  // ── acciones ──
  const acciones = {
    async vincular() {
      if (ocupado) return; ocupado = true; mensaje = ''; pintar(true);
      try { const r = await C.crear(); qr = { codigo: r.codigo, url: r.url, svg: await C.qrSvg(r.url) }; e = await C.estado(); }
      catch (x) { mensaje = x.message; }
      ocupado = false; pintar(true);
      if (!quieto() && $('.en-qr', caja)) gsap.fromTo($('.en-qr', caja), { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'back.out(1.6)' });
    },
    tengo() { tecleando = true; mensaje = ''; pintar(true); $('.en-input', caja)?.focus(); },
    async unir() {
      const campo = $('.en-input', caja), codigo = C.sacarCodigo(campo?.value);
      if (!codigo) { mensaje = t('enl.codigo.mal'); pintar(true); $('.en-input', caja)?.focus(); return; }
      ocupado = true; mensaje = ''; pintar(true);
      try { await C.unir(codigo, e?.nombre || ''); tecleando = false; e = await C.estado(); decir(t('enl.unido_ok'), 6000); }
      catch (x) { mensaje = x.message; }
      ocupado = false; pintar(true);
    },
    async ahora() {
      if (ocupado || e?.sincronizando) return; ocupado = true; pintar(true);
      try { const r = await C.ahora(); if (!r.ok && r.ultimo?.error) mensaje = ''; } catch (x) { mensaje = x.message; }
      ocupado = false; e = await C.estado(); pintar(true);
    },
    async otro() { verQR = !verQR; if (verQR) await traerQR(); pintar(true); },
    async copiar() { try { await navigator.clipboard.writeText(qr.codigo); decir(t('enl.copiado'), 2500); } catch (x) { /* sin portapapeles: el código está a la vista */ } },
    async 'copiar-enlace'() { try { await navigator.clipboard.writeText(qr.url); decir(t('enl.copiado'), 2500); } catch (x) { /* ídem */ } },
    nombre() {
      const fila = $('.en-aparato.yo .en-que', caja); if (!fila) return;
      editando = true;
      fila.innerHTML = `<input class="en-input corto" maxlength="24" value="${esc(e.nombre)}" aria-label="${t('enl.cambiar_nombre')}"><small>${t('enl.nombre.pista')}</small>`;
      $('.en-mini[data-k="nombre"]', caja).textContent = t('enl.nombre.guardar'); $('.en-mini[data-k="nombre"]', caja).dataset.k = 'nombre-ok';
      const inp = $('input', fila); inp.focus(); inp.select();
      inp.addEventListener('en:intro', () => acciones['nombre-ok']());
      inp.addEventListener('en:esc', () => { editando = false; pintar(true); });
    },
    async 'nombre-ok'() {
      const v = $('.en-aparato.yo input', caja)?.value.trim(); editando = false;
      if (v) { try { await C.ponerNombre(v); } catch (x) { mensaje = x.message; } }
      e = await C.estado(); pintar(true);
    },
    async quitar() {
      const varios = e.aparatos.length > 1;
      if (varios && !(await confirmar({ titulo: t('enl.desvincular.tit'), texto: t('enl.desvincular.txt'), si: t('enl.desvincular') }))) return;
      try { await C.quitar(); } catch (x) { mensaje = x.message; }
      qr = null; verQR = false; tecleando = false; e = await C.estado(); pintar(true);
    },
  };
  sec.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-k]'); if (!b || !sec.contains(b) || b.getAttribute('aria-disabled') === 'true') return;
    acciones[b.dataset.k]?.();
  });
  // Intro/Esc dentro de un campo los gestiona la capa de Ajustes (ver ajustes.js) y llegan como estos eventos
  const alEnlace = (ev) => { if (ev.detail) { e = ev.detail; pintar(); } };
  addEventListener('nyango:enlace', alEnlace);
  reloj = setInterval(() => pintar(true), 30000);   // «hace 2 min» se va poniendo al día
  refrescar();
  return {
    soltar() { vivo = false; removeEventListener('nyango:enlace', alEnlace); clearInterval(sondeo); clearInterval(reloj); },
    /** ¿Esto es un campo de la sección? (para que Ajustes no use sus atajos con letras mientras se escribe) */
    campo: (el) => !!el?.closest?.('[data-en] input'),
  };
}

let conEstilos = false;
function estilos() {
  if (conEstilos) return; conEstilos = true;
  const s = document.createElement('style'); s.id = 'enlace-css'; s.textContent = HOJA; document.head.appendChild(s);
}
const HOJA = String.raw`
.en-intro, .en-caja { display: flex; align-items: center; gap: 16px; padding: 12px 12px 12px 16px; border-radius: var(--radio); background: var(--sup-2); border: var(--borde); }
.en-intro p { flex: 1; margin: 0; }
.en-intro strong { display: block; font: 700 16px/1.25 var(--f-texto); color: var(--tinta); }
.en-intro small { display: block; margin-top: 4px; font: 500 13px/1.4 var(--f-texto); color: var(--tinta-2); }
.en-jp { flex: none; display: grid; place-items: center; width: 52px; height: 52px; border-radius: var(--radio-peq); background: var(--boton); color: var(--boton-tinta); font: var(--peso-titulo) 17px/1 var(--f-titulo); }
.en-linea { flex: 1; margin: 0; font: 700 15px/1.4 var(--f-texto); color: var(--tinta); }
.en-linea.bien { color: var(--bien-txt); } .en-linea.mal { color: var(--mal-txt); } .en-linea.curso { color: var(--acento-tinta); }
.en-grande { flex: none; display: inline-flex; align-items: center; gap: 8px; height: 48px; padding: 0 20px; border: 0; border-radius: var(--radio-btn); background: var(--boton); color: var(--boton-tinta); font: 700 14.5px var(--f-texto); cursor: pointer;
  box-shadow: var(--sombra-btn); transition: translate var(--d-2) var(--suave), box-shadow var(--d-2), filter var(--d-2), opacity var(--d-2); }
.en-grande:hover { translate: 0 -1px; filter: brightness(1.07); }
.en-grande:active { translate: 0 3px; box-shadow: none; filter: none; }
.en-grande[aria-disabled="true"] { opacity: 0.6; cursor: default; translate: none; filter: none; }
.en-grande i { width: 16px; height: 16px; border-radius: 50%; border: 2.5px solid currentColor; border-right-color: transparent; display: none; }
.en-grande.girando { cursor: progress; } .en-grande.girando i { display: block; animation: en-giro 0.8s linear infinite; }
@keyframes en-giro { to { rotate: 360deg; } }
.en-grande:focus-visible, .en-mini:focus-visible, .en-texto:focus-visible, .en-codigo:focus-visible, .en-input:focus-visible { outline: 2px solid var(--acento); outline-offset: 3px; }
.en-sub { margin: 20px 4px 8px; font: 700 11.5px var(--f-texto); letter-spacing: 0.16em; text-transform: uppercase; color: var(--tinta-3); }
.en-aparatos { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.en-aparato { display: flex; align-items: center; gap: 12px; padding: 8px 8px 8px 12px; border-radius: var(--radio); background: var(--sup-2); border: var(--borde); }
.en-ico { flex: none; display: grid; place-items: center; width: 40px; height: 40px; border-radius: var(--radio-peq); background: var(--sup-3); color: var(--tinta-2); font: var(--peso-titulo) 16px/1 var(--f-titulo); font-style: normal; }
.en-aparato.yo .en-ico { background: var(--acento-suave); color: var(--acento-tinta); box-shadow: inset 0 0 0 2px var(--acento); }
.en-que { flex: 1; min-width: 0; } .en-que b { display: block; font: 700 15px/1.25 var(--f-texto); color: var(--tinta); } .en-que b em { font: 500 13px var(--f-texto); font-style: normal; color: var(--tinta-3); }
.en-que small { display: block; margin-top: 2px; font: 500 12.5px/1.35 var(--f-texto); color: var(--tinta-2); }
.en-mini { flex: none; height: 40px; padding: 0 16px; border: var(--borde); border-radius: var(--radio-btn); background: var(--sup); color: var(--tinta); font: 700 13px var(--f-texto); cursor: pointer; box-shadow: var(--sombra-peq); transition: translate var(--d-2) var(--suave), background-color var(--d-2); }
.en-mini:hover { translate: 0 -1px; background: var(--sup-3); } .en-mini:active { translate: 0 2px; box-shadow: none; }
.en-mini.fuerte { background: var(--boton); color: var(--boton-tinta); border: 0; box-shadow: var(--sombra-btn); }
.en-texto { margin: 12px 4px 0; padding: 8px 4px; border: 0; background: none; color: var(--tinta-2); font: 700 13.5px var(--f-texto); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
.en-texto.peligro { color: var(--mal-txt); }
.en-pie { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.en-input { flex: 1; min-width: 0; height: 44px; padding: 0 16px; border: 2px solid var(--linea-2); border-radius: var(--radio-peq); background: var(--sup); color: var(--tinta); font: 700 16px/1 ui-monospace, "SFMono-Regular", Menlo, monospace; letter-spacing: 0.06em; text-transform: uppercase; outline: none; transition: border-color var(--d-2), box-shadow var(--d-2); }
.en-input.corto { height: 40px; font: 700 15px var(--f-texto); letter-spacing: 0; text-transform: none; }
.en-input:focus { border-color: var(--acento); box-shadow: 0 0 0 4px var(--acento-suave); }
.en-entrada { display: flex; gap: 8px; margin-top: 12px; }
.en-qr { margin-top: 16px; padding: 16px; border-radius: var(--radio); background: var(--sup-2); border: var(--borde); }
.en-qr-fila { display: flex; gap: 24px; align-items: center; }
/* el código QR va siempre en negro sobre blanco (es un código de lectura, no interfaz) */
.en-qr-img { flex: none; width: 216px; height: 216px; padding: 8px; border-radius: var(--radio-peq); background: white; box-shadow: 0 0 0 1px var(--linea-2); display: grid; place-items: center; }
.en-qr-img svg { display: block; width: 100%; height: 100%; border-radius: 4px; }
.en-cargando { width: 24px; height: 24px; border-radius: 50%; border: 3px solid var(--acento); border-right-color: transparent; animation: en-giro 0.8s linear infinite; }
.en-pasos { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; flex: 1; }
.en-pasos li { display: flex; gap: 12px; align-items: flex-start; font: 600 14.5px/1.45 var(--f-texto); color: var(--tinta); }
.en-pasos i { flex: none; display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: var(--acento-suave); color: var(--acento-tinta); font: var(--peso-titulo) 14px/1 var(--f-titulo); font-style: normal; }
.en-pasos b { color: var(--acento-tinta); }
.en-codigo-caja { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 12px; margin-top: 16px; padding-top: 16px; border-top: 1px dashed var(--linea-2); }
.en-codigo-caja small { flex: 1 0 100%; font: 500 12.5px var(--f-texto); color: var(--tinta-2); }
.en-codigo { flex: 1; min-width: 0; padding: 8px 12px; border-radius: var(--radio-peq); background: var(--sup-3); color: var(--tinta); font: 700 15.5px/1.25 ui-monospace, "SFMono-Regular", Menlo, monospace; letter-spacing: 0.04em; cursor: copy; user-select: all; white-space: nowrap; overflow-x: auto; }
.en-botones { display: flex; gap: 8px; }
.en-esperando { display: flex; align-items: center; gap: 12px; margin: 12px 0 0; font: 700 13.5px var(--f-texto); color: var(--tinta-2); }
.en-esperando i { width: 12px; height: 12px; border-radius: 50%; background: var(--acento); animation: en-late 1.4s ease-in-out infinite; }
@keyframes en-late { 50% { scale: 0.55; opacity: 0.5; } }
.en-mensaje { margin: 12px 4px 0; font: 700 14px/1.4 var(--f-texto); } .en-mensaje.bien { color: var(--bien-txt); } .en-mensaje.mal { color: var(--mal-txt); }
.en-aviso { margin: 0; font: 500 14px/1.5 var(--f-texto); color: var(--tinta-2); }
@media (max-width: 640px) { .en-qr-fila { flex-direction: column; align-items: stretch; } .en-qr-img { align-self: center; } }
@media (prefers-reduced-motion: reduce) { .en-esperando i, .en-grande.girando i, .en-cargando { animation-duration: 3s; } }
`;
