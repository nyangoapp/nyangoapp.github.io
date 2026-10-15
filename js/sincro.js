// Sincronización entre ordenadores, en Ajustes. Con la app de escritorio, /api/sincro trae «escritorio»: la tarea en curso con
// sus pasos, la lista de comprobación (Anki, sesión de AnkiWeb, Nyango Sync, medios), los equipos y «sincronizar al cerrar».
// En el modo suelto (python servidor.py) /api/sincro no existe y nada de esto aparece; con el complemento grande (aparcado) sale
// solo la línea de estado y el botón.
// · htmlSincro() + montarSincro(): la sección. «Sincronizar ahora» (N) va paso a paso («Abriendo Anki…», «Sincronizando…»,
//   «Listo · recibido de Portátil Linux») o acaba con el error y qué hacer. Cada paso de la lista, en verde o rojo, con su botón.
// · abrirAsistente(): la primera vez, cómo viaja el progreso en 3 frases y el nombre de este ordenador; después, a la lista.
// · preguntarUnion(): la primera vez que llega progreso de otro equipo y este también tiene el suyo, «unir los dos» (1) o
//   «quedarme con el de X» (2). Hasta contestar no se exporta nada de este equipo. Esc = decidir luego.
import { gsap } from 'gsap';
import { t, idioma, CABECERA, hay } from './i18n.js';
import { capa, kbd } from './teclado.js';
import { esc } from './japones.js';

let ULTIMO = null, sinComplemento = false;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const quieto = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const pedir = async (ruta, datos) => {
  const r = await fetch(ruta, datos === undefined ? { headers: CABECERA } : { method: 'POST', headers: { 'Content-Type': 'application/json', ...CABECERA }, body: JSON.stringify(datos) });
  if (!r.ok) { const e = new Error((await r.json().catch(() => ({}))).error || r.status); e.codigo = r.status; throw e; }
  return r.json();
};
const ANKI_WEB = 'https://apps.ankiweb.net/';

/** Estado de /api/sincro, o null sin sincronización (un 404 basta para no volver a preguntar en esta página). */
export async function pedirSincro() {
  if (sinComplemento) return null;
  try { ULTIMO = await pedir('/api/sincro'); } catch (e) { ULTIMO = null; if (e.codigo === 404) sinComplemento = true; }
  return ULTIMO;
}
export const sincroConocida = () => ULTIMO;

const nombre = (n) => t('sincro.nombre', { nombre: esc(n || '?') });
const lista = (ns) => new Intl.ListFormat(idioma, { type: 'conjunction' }).format((ns || []).map(nombre));
const rtf = new Intl.RelativeTimeFormat(idioma, { numeric: 'auto', style: idioma === 'es' ? 'short' : 'long' });
/** «hace 3 h» · «3 hours ago» (un reloj adelantado cuenta como «hace un momento») */
export function haceCuanto(ts) {
  const s = Date.now() / 1000 - ts;
  if (s < 45) return t('sincro.hace_nada');
  if (s < 3600) return rtf.format(-Math.max(1, Math.round(s / 60)), 'minute');
  if (s < 86400) return rtf.format(-Math.round(s / 3600), 'hour');
  return rtf.format(-Math.round(s / 86400), 'day');
}

const esApp = (e) => !!e?.escritorio?.comprobacion;
const configurada = (e) => !esApp(e) || !!e.escritorio.nombre_equipo;
const enCurso = (e) => !!(e?.sincronizando || (e?.tarea && !e.tarea.t_fin));
const conBuzon = (e) => e?.escritorio?.modo === 'buzon';
const tipoCuerpo = (e) => (!esApp(e) ? 'viejo' : configurada(e) ? 'app' : 'empezar');
function textoError(codigo, detalle) {
  const k = `sincro.error.${codigo}`;
  return hay(k) ? t(k, { perfil: esc(detalle || '?'), detalle: esc(detalle || '') }) : t('sincro.error.error', { detalle: esc(detalle || codigo || '?') });
}

// ───────────────────────── Ajustes: las piezas ─────────────────────────
function linea(e) {
  const r = e.recibidos?.[0];
  return !e.activa ? t('sincro.inactiva') : r ? t('sincro.ultimo', { nombre: nombre(r.nombre), cuando: haceCuanto(r.t) }) : t('sincro.nada');
}
/** La línea con el complemento grande (aparcado): lo último recibido y cómo se ve este equipo. */
const lineaVieja = (e) => ({ txt: linea(e) + (e.activa && e.nombre ? `<small>${t('sincro.equipo', { nombre: nombre(e.nombre) })}</small>` : ''), clase: '' });
/** { txt, clase } de la línea de estado: el paso en curso, cómo acabó la última vez, o lo último recibido. */
function lineaApp(e, ocupado) {
  const x = e.tarea;
  if (enCurso(e) || ocupado) return { txt: t(`sincro.fase.${x && !x.t_fin ? x.fase : 'preparando'}`), clase: 'curso' };
  if (x?.t_fin) {
    if (x.fase !== 'listo') return { txt: textoError(x.resultado, x.detalle), clase: 'mal' };
    const txt = x.resultado === 'directo' ? t('sincro.listo.directo') : x.recibidos?.length ? t('sincro.listo.de', { nombres: lista(x.recibidos) }) : t('sincro.listo.nada');
    return { txt, clase: 'bien' };
  }
  return { txt: linea(e), clase: '' };
}
function avisos(e) {
  const a = [];
  if (!esApp(e)) {
    if (e.media_activada === false) a.push(t('sincro.aviso.media'));
    if (e.sesion === false) a.push(t('sincro.aviso.sesion'));
    for (const r of e.recibidos || []) if (r.futuro) a.push(t('sincro.aviso.reloj', { nombre: nombre(r.nombre) }));
  }
  if (e.pregunta) a.push(t('sincro.aviso.pregunta', { nombre: lista(e.pregunta.nombres) }));
  if (e.error) a.push(t('sincro.aviso.error'));
  return a.map((x) => `<li>${x}</li>`).join('');
}
function pasos(e, local) {
  const c = e.escritorio.comprobacion, a = e.escritorio.arreglo, comp = c.complemento, est = comp.estado;
  const arreglando = (q) => !!a && a.que === q && a.resultado == null;
  const fallo = (q) => (a && a.que === q && a.resultado && a.resultado !== 'ok' && Date.now() / 1000 - a.t < 600 ? `<em class="sc-fallo">${textoError(a.resultado, a.detalle)}</em>` : '');
  const boton = (k, txt, parado) => `<button class="sc-arreglo" data-k="${k}" aria-disabled="${!!parado}">${txt}</button>`;
  const nuevo = est === 'activo' && !!comp.version && comp.version !== comp.incluida;
  const detComp = local.instalando ? t('sincro.paso.complemento.instalando')
    : local.falloInstalar ? t('sincro.paso.complemento.fallo', { motivo: esc(local.falloInstalar) })
    : est === 'activo' ? t(nuevo ? 'sincro.paso.complemento.viejo' : 'sincro.paso.complemento.ok', { version: esc(comp.version || '?') })
    : est === 'instalado' ? t(comp.reiniciar ? 'sincro.paso.complemento.reiniciar' : 'sincro.paso.complemento.instalado')
    : est === 'desactivado' ? t('sincro.paso.complemento.desactivado')
    : est === 'sin_anki' ? t('sincro.paso.complemento.sin_anki') : t('sincro.paso.complemento.no');
  const cuenta = (q) => (arreglando(q) ? t('sincro.paso.arreglando') : c[q].ok === true ? t(`sincro.paso.${q}.ok`)
    : c[q].ok === false ? (q === 'sesion' && a?.que === 'sesion' && a.resultado === 'ok' ? t('sincro.paso.sesion.abierta') : t(`sincro.paso.${q}.mal`)) : t('sincro.paso.nose'));
  const items = [
    { id: 'anki', ok: c.anki.ok, det: c.anki.ok ? t('sincro.paso.anki.ok', { perfil: esc(c.anki.perfil) }) : t(c.anki.instalado ? 'sincro.paso.anki.perfil' : 'sincro.paso.anki.no'),
      boton: c.anki.instalado ? '' : `<a class="sc-arreglo" data-k="descargar" href="${ANKI_WEB}" target="_blank" rel="noopener">${t('sincro.paso.anki.boton')}</a>` },
    { id: 'complemento', ok: comp.ok && !nuevo, det: detComp,
      boton: est !== 'sin_anki' && (est === 'no' || nuevo || local.falloInstalar) ? boton('instalar', t(nuevo ? 'sincro.paso.complemento.actualizar' : 'sincro.paso.complemento.boton'), local.instalando) : '' },
    { id: 'sesion', ok: c.sesion.ok === true, det: cuenta('sesion'), fallo: fallo('sesion'),
      boton: conBuzon(e) && c.sesion.ok === false ? boton('arreglar:sesion', t('sincro.paso.sesion.boton'), arreglando('sesion')) : '' },
    { id: 'medios', ok: c.medios.ok === true, det: cuenta('medios'), fallo: fallo('medios'),
      boton: conBuzon(e) && c.medios.ok === false ? boton('arreglar:medios', t('sincro.paso.medios.boton'), arreglando('medios')) : '' },
  ];
  return `<h4 class="sc-sub" id="sc-lista-t">${t('sincro.lista')}</h4><ol class="sc-pasos" aria-labelledby="sc-lista-t">${items.map((p, i) => `<li class="sc-paso ${p.ok ? 'ok' : 'mal'}" data-paso="${p.id}">
    <i class="sc-marca" role="img" aria-label="${t(p.ok ? 'sincro.paso.si' : 'sincro.paso.no')}">${p.ok ? '✓' : i + 1}</i>
    <span class="sc-que"><strong>${t(`sincro.paso.${p.id}`)}</strong><small>${p.det}</small>${p.fallo || ''}</span>${p.boton}</li>`).join('')}</ol>`;
}
function equipos(e) {
  const l = e.escritorio.equipos || [];
  const fila = (q) => {
    const bits = [];
    if (q.yo) {
      bits.push(t('sincro.equipo.este'));
      if (conBuzon(e)) bits.push(q.pendiente ? t('sincro.equipo.pendiente') : q.subido ? t('sincro.equipo.subido', { cuando: haceCuanto(q.subido) }) : t('sincro.equipo.nunca'));
    } else {
      if (q.recibido) bits.push(t('sincro.equipo.recibido', { cuando: haceCuanto(q.recibido) }));
      if (q.sin_progreso) bits.push(t('sincro.equipo.sin_progreso'));
      if (q.futuro) bits.push(`<b class="sc-aviso">${t('sincro.equipo.reloj')}</b>`);
    }
    const b = q.yo ? `<button class="sc-mini" data-k="nombre">${t('sincro.equipo.cambiar')}</button>`
      : q.sin_progreso ? `<button class="sc-mini" data-k="olvidar:${esc(q.id)}">${t('sincro.equipo.olvidar')}</button>` : '';
    return `<li class="sc-equipo${q.yo ? ' yo' : ''}${q.sin_progreso ? ' viejo' : ''}"><span class="sc-que"><b>${esc(q.nombre || q.id)}</b><small>${bits.join(' · ')}</small></span>${b}</li>`;
  };
  return `<h4 class="sc-sub" id="sc-equipos-t">${t('sincro.equipos')}</h4><ul class="sc-equipos" aria-labelledby="sc-equipos-t">${l.map(fila).join('')}</ul>`
    + (l.length < 2 ? `<p class="sc-vacio">${t('sincro.equipo.ninguno')}</p>` : '');
}
function resto(e, local) {
  const a = avisos(e);
  return (a ? `<ul class="sc-avisos">${a}</ul>` : '') + pasos(e, local) + equipos(e)
    + (conBuzon(e) ? `<button class="aj-interruptor sc-cerrar" role="switch" data-k="cerrar" aria-checked="${!!e.escritorio.al_cerrar}"><span>${t('sincro.al_cerrar')}<small>${t('sincro.al_cerrar.nota')}</small></span><i></i></button>` : '')
    + `<p class="aj-nota">${t(conBuzon(e) ? 'sincro.nota.app' : 'sincro.nota.directo')}</p>`;
}
function cuerpo(e, local, ocupado) {
  const tipo = tipoCuerpo(e);
  if (tipo === 'empezar') {
    return `<div class="sc-empezar"><b class="sc-jp" aria-hidden="true">同期</b><p><strong>${t('sincro.empezar.tit')}</strong><small>${t('sincro.empezar.desc')}</small></p>
      <button class="sc-ahora" data-k="empezar"><span>${t('sincro.empezar')}</span>${kbd('N')}</button></div>`;
  }
  const l = tipo === 'app' ? lineaApp(e, ocupado) : lineaVieja(e);
  const gira = enCurso(e) || ocupado, parado = gira || !e.activa;
  const caja = `<div class="sc-caja"><p class="sc-linea ${l.clase}" role="status" aria-live="polite">${l.txt}</p>
      <button class="sc-ahora${gira ? ' girando' : ''}" data-k="ahora" aria-disabled="${parado}"><i aria-hidden="true"></i><span>${t(gira ? 'sincro.sincronizando' : 'sincro.ahora')}</span>${kbd('N')}</button></div>`;
  if (tipo === 'app') return caja + `<div class="sc-resto">${resto(e, local)}</div>`;
  const a = avisos(e);
  return caja + `<ul class="sc-avisos"${a ? '' : ' hidden'}>${a}</ul><p class="aj-nota">${t('sincro.nota')}</p>`;
}

/** La sección de Ajustes con el último estado conocido ('' si no hay sincronización o aún no se sabe: montarSincro la añade). */
export function htmlSincro(e = ULTIMO) {
  if (!e) return '';
  estilos();
  return `<section class="aj-bloque sc-bloque" data-sc data-tipo="${tipoCuerpo(e)}" aria-labelledby="sc-tit"><h3 id="sc-tit">${t('sincro.tit')}</h3>
    <div class="sc-cuerpo">${cuerpo(e, {}, false)}</div></section>`;
}

/** Cambia el HTML de un trozo solo si cambió, y devuelve el foco al mismo control (data-k) si lo tenía dentro. */
function reemplazar(el, html) {
  if (!el || el._html === html) return;
  const f = document.activeElement, dentro = el.contains(f), k = dentro ? f.closest('[data-k]')?.dataset.k : null;
  el.innerHTML = html; el._html = html;
  if (dentro) (k && el.querySelector(`[data-k="${CSS.escape(k)}"]`) || el.closest('[data-sc]')?.querySelector('[data-k="ahora"], [data-k="empezar"]'))?.focus({ preventScroll: true });
}

// ───────────────────────── Ajustes: la sección viva ─────────────────────────
/** Engancha la sección dentro de la hoja de Ajustes (la crea antes de «antes» si aún no estaba). Devuelve { ahora, soltar }. */
export function montarSincro(hoja, antes) {
  let sec = $('[data-sc]', hoja), vivo = true, ocupado = false, e = ULTIMO, reloj = null;
  const local = { instalando: false, falloInstalar: null };
  const pintar = (x) => {
    if (x) e = x;
    if (!e || !sec || !vivo) return;
    const tipo = tipoCuerpo(e), caja = $('.sc-cuerpo', sec);
    if (sec.dataset.tipo !== tipo) { sec.dataset.tipo = tipo; reemplazar(caja, cuerpo(e, local, ocupado)); return; }
    if (tipo === 'empezar') return;
    const l = tipo === 'app' ? lineaApp(e, ocupado) : lineaVieja(e), p = $('.sc-linea', sec);
    if (p._txt !== l.txt) { p.innerHTML = l.txt; p._txt = l.txt; }
    p.className = `sc-linea ${l.clase}`;
    const b = $('[data-k="ahora"]', sec), gira = enCurso(e) || ocupado;
    b.classList.toggle('girando', gira); b.setAttribute('aria-disabled', String(gira || !e.activa));
    $('span', b).textContent = t(gira ? 'sincro.sincronizando' : 'sincro.ahora');
    if (tipo === 'app') reemplazar($('.sc-resto', sec), resto(e, local));
    else { const ul = $('.sc-avisos', sec), a = avisos(e); ul.innerHTML = a; ul.hidden = !a; }
  };
  const refrescar = async () => { const x = await pedirSincro(); if (!vivo || !x) return; if (!sec) poner(x); else pintar(x); };
  const enfocar = (sel) => { const el = sec && $(sel, sec); el?.focus(); return !!el; };
  const siguiente = () => enfocar('.sc-paso.mal .sc-arreglo:not([aria-disabled="true"])') || enfocar('[data-k="ahora"]');
  /** Sondea /api/sincro mientras `seguir(e)` y repinta; tope en ms. */
  const seguir = async (mientras, tope, cada = 700) => {
    for (const hasta = Date.now() + tope; vivo && Date.now() < hasta;) {
      await espera(cada);
      const x = await pedirSincro();
      if (!x || !vivo) return x;
      pintar(x);
      if (!mientras(x)) return x;
    }
  };

  const ahora = async () => {
    if (!sec || ocupado) return;
    if (!configurada(e)) return empezar();
    if (enCurso(e) || !e.activa) return;
    ocupado = true; pintar();
    try {
      const { sincros } = await pedir('/api/sincro/ahora', {});
      await seguir((x) => !(x.sincros > sincros && !x.sincronizando), 11 * 60000, esApp(e) ? 600 : 1500);
    } catch (err) {
      console.warn('No se pudo sincronizar', err);
      ocupado = false;
      if (vivo) { const p = $('.sc-linea', sec); if (p) { p.innerHTML = p._txt = t('sincro.fallo'); p.className = 'sc-linea mal'; } }
      return;
    }
    ocupado = false; pintar();
  };
  const empezar = async () => {
    if (await abrirAsistente(e) && vivo) { pintar(await pedirSincro()); siguiente(); }
  };
  const renombrar = async () => {
    if (await abrirAsistente(e, { soloNombre: true }) && vivo) { pintar(await pedirSincro()); enfocar('[data-k="nombre"]'); }
  };
  const instalar = async () => {
    local.instalando = true; local.falloInstalar = null; pintar();
    try { await pedir('/api/sincro/instalar', {}); } catch (err) { local.falloInstalar = err.message || String(err); }
    local.instalando = false;
    pintar(await pedirSincro()); siguiente();
  };
  const arreglar = async (que) => {
    try { await pedir('/api/sincro/arreglar', { que }); } catch (err) { console.warn('No se pudo arreglar', que, err); return; }
    const x = await seguir((y) => y.escritorio?.arreglo?.resultado == null, 4 * 60000, 1200);
    if (que === 'sesion' && x?.escritorio?.arreglo?.resultado === 'ok') await seguir((y) => y.escritorio?.comprobacion?.sesion?.ok !== true, 5 * 60000, 2000);
  };
  const alCerrar = (b) => {
    const v = b.getAttribute('aria-checked') !== 'true';
    b.setAttribute('aria-checked', String(v));
    if (e?.escritorio) e.escritorio.al_cerrar = v;
    if (!quieto()) gsap.fromTo($('i', b), { scale: 0.8 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' });
    pedir('/api/sincro/ajustes', { al_cerrar: v }).catch((err) => console.warn('No se pudo guardar', err));
  };
  const olvidar = async (id) => {
    try { await pedir('/api/sincro/olvidar', { id }); } catch (err) { console.warn('No se pudo olvidar', err); }
    pintar(await pedirSincro()); enfocar('[data-k="nombre"]');
  };
  const pulsar = (ev) => {
    const b = ev.target.closest('[data-k]');
    if (!b || !sec?.contains(b)) return;
    const k = b.dataset.k;
    if (k === 'descargar') return; // enlace: lo abre el navegador
    ev.preventDefault();
    if (b.getAttribute('aria-disabled') === 'true') return;
    if (k === 'ahora') ahora();
    else if (k === 'empezar') empezar();
    else if (k === 'nombre') renombrar();
    else if (k === 'instalar') instalar();
    else if (k === 'cerrar') alCerrar(b);
    else if (k.startsWith('arreglar:')) arreglar(k.slice(9));
    else if (k.startsWith('olvidar:')) olvidar(k.slice(8));
  };
  const enlazar = () => sec.addEventListener('click', pulsar);
  const poner = (x) => { // primera vez en esta página: la sección aparece al saber que hay sincronización
    e = x;
    antes.insertAdjacentHTML('beforebegin', htmlSincro(x));
    sec = antes.previousElementSibling; enlazar();
    if (!quieto()) gsap.fromTo(sec, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'back.out(2)' });
  };
  if (sec) enlazar();
  refrescar();
  reloj = setInterval(() => { if (!ocupado) refrescar(); }, 10000); // «subido hace…», y lo que haga Anki por su cuenta
  const oir = () => { if (!ocupado) refrescar(); };
  addEventListener('nyango:progreso', oir); addEventListener('nyango:sincro', oir);
  return {
    ahora: () => { if (sec) ahora(); return !!sec; },
    soltar: () => { vivo = false; clearInterval(reloj); removeEventListener('nyango:progreso', oir); removeEventListener('nyango:sincro', oir); },
  };
}

// ───────────────────────── asistente de la primera vez (y cambiar el nombre) ─────────────────────────
/** Cómo viaja el progreso en 3 frases y el nombre de este ordenador. Promesa: true si se guardó el nombre. */
export function abrirAsistente(e = ULTIMO, { soloNombre = false } = {}) {
  estilos();
  return new Promise((resolver) => {
    const sistema = e?.escritorio?.sistema || 'Windows';
    const sug = ['casa', 'portatil', 'trabajo'].map((k) => t(`sincro.asistente.sugerencia.${k}`, { sistema }));
    const c = document.createElement('div');
    c.className = 'modal-capa sc-capa'; c.setAttribute('role', 'dialog'); c.setAttribute('aria-modal', 'true'); c.setAttribute('aria-labelledby', 'sc-a-tit');
    c.innerHTML = `<div class="modal-ficha m-ancha sc-ficha sc-asistente"><span class="m-sello">${soloNombre ? '名前' : '同期'}</span>
      <div class="m-ante">${t(soloNombre ? 'sincro.asistente.ante.nombre' : 'sincro.asistente.ante')}</div>
      <h2 id="sc-a-tit">${t(soloNombre ? 'sincro.asistente.nombre.tit' : 'sincro.asistente.tit')}</h2>
      ${soloNombre ? '' : `<ol class="sc-tres">${['p1', 'p2', 'p3'].map((p, i) => `<li><b aria-hidden="true">${'一二三'[i]}</b><span>${t(`sincro.asistente.${p}`)}</span></li>`).join('')}</ol>`}
      <label class="sc-campo" for="sc-a-nombre">${t('sincro.asistente.nombre')}</label>
      <input id="sc-a-nombre" class="sc-entrada" type="text" maxlength="40" autocomplete="off" spellcheck="false" value="${esc(e?.escritorio?.nombre_equipo || '')}">
      <div class="sc-sugerencias" role="group" aria-label="${t('sincro.asistente.sugerencias')}">${sug.map((s) => `<button type="button" class="sc-sug" data-sug="${esc(s)}">${esc(s)}</button>`).join('')}</div>
      <p class="m-nota sc-nota" role="status" aria-live="polite">${t('sincro.asistente.nota', { esc: kbd('Esc') })}</p>
      <div class="tk-acciones"><button class="boton-tinta" data-seguir>${t(soloNombre ? 'sincro.asistente.guardar' : 'sincro.asistente.seguir')} ${kbd('Intro')}</button></div></div>`;
    document.body.appendChild(c);
    const ficha = c.firstElementChild, input = $('#sc-a-nombre', c), nota = $('.sc-nota', c), seguir = $('[data-seguir]', c);
    gsap.fromTo(c, { opacity: 0 }, { opacity: 1, duration: 0.3 });
    if (!quieto()) {
      gsap.fromTo(ficha, { y: 70, scale: 0.85, rotate: -2 }, { y: 0, scale: 1, rotate: 0, duration: 0.8, ease: 'elastic.out(1, 0.65)' });
      gsap.fromTo($('.m-sello', ficha), { scale: 2.2, opacity: 0, rotate: 20 }, { scale: 1, opacity: 1, rotate: -6, duration: 0.45, delay: 0.4, ease: 'back.out(2.5)' });
      gsap.fromTo($$('.sc-tres li, .sc-sug', ficha), { x: -18, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, stagger: 0.06, delay: 0.2, ease: 'back.out(2)' });
    }
    let ocupado = false;
    const cerrar = (ok) => {
      soltar();
      gsap.to(c, { opacity: 0, duration: 0.2, onComplete: () => c.remove() });
      resolver(ok);
    };
    const guardar = async () => {
      if (ocupado) return;
      const n = input.value.trim();
      if (!n) { nota.innerHTML = `<b class="sc-error">${t('sincro.asistente.vacio')}</b>`; input.focus(); return; }
      ocupado = true; seguir.setAttribute('aria-disabled', 'true');
      try { await pedir('/api/sincro/nombre', { nombre: n }); cerrar(true); } catch (err) {
        console.warn('No se pudo guardar el nombre', err);
        ocupado = false; seguir.removeAttribute('aria-disabled');
        nota.innerHTML = `<b class="sc-error">${t('sincro.asistente.fallo')}</b>`;
      }
    };
    seguir.onclick = guardar;
    $$('.sc-sug', c).forEach((b) => { b.onclick = () => { input.value = b.dataset.sug; input.focus(); input.select(); }; });
    const soltar = capa(c, (ev) => {
      if (ev.key === 'Escape') { if (!ocupado) cerrar(false); return true; }
      if (ev.key === 'Enter' && ev.target === input) { guardar(); return true; }
      return false; // Intro y Espacio en los botones: el suyo; lo demás, a la casilla
    }, { foco: input });
  });
}

// ───────────────────────── la primera vez: unir o quedarse con el del otro ─────────────────────────
let preguntando = false;
/** Pregunta, si la sincronización la tiene pendiente. Al contestar, la página se recarga con el progreso nuevo. */
export function preguntarUnion(e = ULTIMO) {
  if (preguntando || !e?.pregunta) return false;
  preguntando = true; estilos();
  const quien = lista(e.pregunta.nombres);
  const c = document.createElement('div');
  c.className = 'modal-capa sc-capa'; c.setAttribute('role', 'dialog'); c.setAttribute('aria-modal', 'true'); c.setAttribute('aria-labelledby', 'sc-p-tit');
  c.innerHTML = `<div class="modal-ficha m-ancha sc-ficha"><span class="m-sello">同期</span>
    <div class="m-ante">${t('sincro.pregunta.ante')}</div>
    <h2 id="sc-p-tit">${t('sincro.pregunta.tit')}</h2>
    <p>${t('sincro.pregunta.p', { nombre: quien })}</p>
    <div class="sc-opciones" role="group" aria-labelledby="sc-p-tit">
      <button class="sc-opcion" data-eleccion="unir"><b class="sc-jp" aria-hidden="true">合</b><span><strong>${t('sincro.pregunta.unir')}</strong><small>${t('sincro.pregunta.unir.desc')}</small></span>${kbd('1')}</button>
      <button class="sc-opcion" data-eleccion="otro"><b class="sc-jp" aria-hidden="true">他</b><span><strong>${t('sincro.pregunta.otro', { nombre: quien })}</strong><small>${t('sincro.pregunta.otro.desc')}</small></span>${kbd('2')}</button>
    </div>
    <p class="m-nota sc-nota" role="status" aria-live="polite">${t('sincro.pregunta.nota', { esc: kbd('Esc') })}</p></div>`;
  document.body.appendChild(c);
  const ficha = c.firstElementChild, ops = $$('.sc-opcion', c), nota = $('.sc-nota', c);
  gsap.fromTo(c, { opacity: 0 }, { opacity: 1, duration: 0.35 });
  if (!quieto()) {
    gsap.fromTo(ficha, { y: 80, scale: 0.8, rotate: -3 }, { y: 0, scale: 1, rotate: 0, duration: 0.9, ease: 'elastic.out(1, 0.6)' });
    gsap.fromTo($('.m-sello', ficha), { scale: 2.2, opacity: 0, rotate: 20 }, { scale: 1, opacity: 1, rotate: -6, duration: 0.45, delay: 0.45, ease: 'back.out(2.5)' });
    gsap.fromTo(ops, { x: -24, opacity: 0 }, { x: 0, opacity: 1, duration: 0.45, stagger: 0.07, delay: 0.25, ease: 'back.out(2)' });
  }
  let ocupado = false;
  const cerrar = () => {
    soltar(); preguntando = false;
    gsap.to(c, { opacity: 0, duration: 0.2, onComplete: () => c.remove() });
  };
  const elegir = async (eleccion) => {
    if (ocupado) return;
    ocupado = true; ops.forEach((b) => b.setAttribute('aria-disabled', 'true'));
    nota.textContent = t(eleccion === 'unir' ? 'sincro.pregunta.uniendo' : 'sincro.pregunta.cambiando');
    try {
      await pedir('/api/sincro/elegir', { eleccion });
      location.reload(); // progreso (y quizá idioma) nuevos: la portada entera desde cero
    } catch (err) {
      console.warn('No se pudo aplicar la elección', err);
      ocupado = false; ops.forEach((b) => b.removeAttribute('aria-disabled'));
      nota.innerHTML = `<b class="sc-error">${t('sincro.pregunta.fallo')}</b>`;
    }
  };
  ops.forEach((b) => { b.onclick = () => elegir(b.dataset.eleccion); });
  const soltar = capa(c, (ev) => {
    const k = ev.key, i = ops.indexOf(document.activeElement);
    if (k === 'Escape') { if (!ocupado) cerrar(); return true; }
    if (k === '1' || k === '2') { ops[+k - 1].focus(); elegir(ops[+k - 1].dataset.eleccion); return true; }
    if (['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(k)) { ops[(Math.max(0, i) + (k === 'ArrowDown' || k === 'ArrowRight' ? 1 : -1) + ops.length) % ops.length].focus(); return true; }
    return false; // Intro y Espacio: el botón con el foco
  }, { foco: ops[0] });
  return true;
}

// ───────────────────────── estilos (solo se cargan con la sincronización) ─────────────────────────
let conEstilos = false;
function estilos() {
  if (conEstilos) return;
  conEstilos = true;
  const s = document.createElement('style'); s.id = 'sincro-css'; s.textContent = HOJA; document.head.appendChild(s);
}
const HOJA = String.raw`
.sc-caja, .sc-empezar { display: flex; align-items: center; gap: 16px; padding: 12px 12px 12px 16px; border-radius: var(--radio); background: var(--sup-2); border: var(--borde); }
.sc-linea { flex: 1; margin: 0; font: 700 15px/1.4 var(--f-texto); color: var(--tinta); }
.sc-linea small { display: block; margin-top: 4px; font: 500 12.5px/1.35 var(--f-texto); color: var(--tinta-2); }
.sc-linea.bien { color: var(--bien-txt); }
.sc-linea.mal { color: var(--mal-txt); }
.sc-linea.curso { color: var(--acento-tinta); }
.sc-empezar p { flex: 1; margin: 0; }
.sc-empezar strong { display: block; font: 700 16px/1.25 var(--f-texto); color: var(--tinta); }
.sc-empezar small { display: block; margin-top: 4px; font: 500 13px/1.4 var(--f-texto); color: var(--tinta-2); }
.sc-empezar .sc-jp { flex: none; display: grid; place-items: center; width: 52px; height: 52px; border-radius: var(--radio-peq); background: var(--boton); color: var(--boton-tinta); font: var(--peso-titulo) 17px/1 var(--f-titulo); }
.sc-ahora { flex: none; display: inline-flex; align-items: center; gap: 12px; height: 48px; padding: 0 12px 0 16px; border: 0; border-radius: var(--radio-btn); background: var(--boton); color: var(--boton-tinta); font: 700 14.5px var(--f-texto);
  box-shadow: var(--sombra-btn); transition: translate var(--d-2) var(--suave), box-shadow var(--d-2), filter var(--d-2), opacity var(--d-2);
  --kbd-fondo: color-mix(in srgb, var(--boton-tinta) 16%, transparent); --kbd-tinta: var(--boton-tinta); --kbd-borde: color-mix(in srgb, var(--boton-tinta) 34%, transparent); --kbd-canto: transparent; }
.sc-ahora:hover { translate: 0 -1px; filter: brightness(1.07); }
.sc-ahora:active { translate: 0 3px; box-shadow: none; filter: none; }
.sc-ahora:focus-visible, .sc-arreglo:focus-visible, .sc-mini:focus-visible, .sc-sug:focus-visible { outline: 2px solid var(--acento); outline-offset: 3px; }
.sc-ahora[aria-disabled="true"] { opacity: 0.6; cursor: default; translate: none; filter: none; }
.sc-ahora i { width: 16px; height: 16px; border-radius: 50%; border: 2.5px solid currentColor; border-right-color: transparent; }
.sc-ahora.girando { cursor: progress; }
.sc-ahora.girando i { animation: sc-giro 0.8s linear infinite; }
@keyframes sc-giro { to { rotate: 360deg; } }
.sc-sub { margin: 20px 4px 8px; font: 700 11.5px var(--f-texto); letter-spacing: 0.16em; text-transform: uppercase; color: var(--tinta-3); }
.sc-pasos, .sc-equipos { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.sc-paso, .sc-equipo { display: flex; align-items: center; gap: 12px; padding: 8px 8px 8px 12px; border-radius: var(--radio); background: var(--sup-2); border: var(--borde); }
.sc-que { flex: 1; min-width: 0; }
.sc-que strong, .sc-que b { display: block; font: 700 14.5px/1.3 var(--f-texto); color: var(--tinta); }
.sc-que small { display: block; margin-top: 2px; font: 500 12.5px/1.4 var(--f-texto); color: var(--tinta-2); }
.sc-que small b { display: inline; font: inherit; font-weight: 700; }
.sc-fallo { display: block; margin-top: 4px; font: 700 12.5px/1.4 var(--f-texto); font-style: normal; color: var(--mal-txt); }
.sc-marca { flex: none; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; font: 700 14px/1 var(--f-texto); font-style: normal; color: var(--tinta-inv); }
.sc-paso.ok .sc-marca { background: var(--bien); }
.sc-paso.mal .sc-marca { background: var(--mal); }
.sc-paso.mal { box-shadow: inset 0 0 0 2px var(--mal); }
.sc-arreglo { flex: none; display: inline-flex; align-items: center; height: 40px; padding: 0 16px; border: 0; border-radius: var(--radio-btn); background: var(--tinta); color: var(--tinta-inv); font: 700 13.5px var(--f-texto); text-decoration: none;
  transition: translate var(--d-2) var(--suave), filter var(--d-2), opacity var(--d-2); cursor: pointer; }
.sc-arreglo:hover { translate: 0 -1px; filter: brightness(1.12); }
.sc-arreglo[aria-disabled="true"] { opacity: 0.6; cursor: progress; translate: none; }
.sc-mini { flex: none; height: 40px; padding: 0 16px; border: var(--borde); border-radius: var(--radio-btn); background: var(--sup); color: var(--tinta); font: 700 13px var(--f-texto); box-shadow: var(--sombra-peq); transition: background-color var(--d-2), translate var(--d-2) var(--suave); }
.sc-mini:hover { background: var(--sup-3); }
.sc-mini:active { translate: 0 2px; box-shadow: none; }
.sc-equipo.yo .sc-que b::after { content: " ●"; color: var(--acento); font-size: 11px; vertical-align: 2px; }
.sc-equipo.viejo { opacity: 0.78; }
.sc-aviso { color: var(--mal-txt); }
.sc-vacio { margin: 8px 4px 0; font: 500 13px/1.45 var(--f-texto); color: var(--tinta-3); }
.sc-cerrar { margin-top: 16px; }
.sc-cerrar small { display: block; margin-top: 2px; font: 500 12.5px/1.35 var(--f-texto); color: var(--tinta-2); }
.sc-avisos { list-style: none; margin: 12px 0 0; padding: 0; display: grid; gap: 8px; }
.sc-avisos li { position: relative; padding: 12px 16px 12px 48px; border-radius: var(--radio-peq); background: var(--mal-suave); color: var(--tinta); font: 500 13.5px/1.45 var(--f-texto); box-shadow: inset 0 0 0 1px var(--mal); }
.sc-avisos li::before { content: "!"; position: absolute; left: 14px; top: 10px; display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; background: var(--mal); color: var(--tinta-inv); font: 700 13px/1 var(--f-texto); }
.sc-avisos b { font-weight: 700; }
.sc-opciones { display: grid; gap: 12px; margin: 0 0 20px; text-align: left; }
.sc-opcion { display: grid; grid-template-columns: auto 1fr auto; gap: 16px; align-items: center; padding: 16px; border: var(--borde); border-radius: var(--radio); background: var(--sup-2); color: var(--tinta); text-align: left;
  transition: translate var(--d-2) var(--suave), box-shadow var(--d-2), background-color var(--d-2); }
.sc-opcion:hover, .sc-opcion:focus-visible { translate: 0 -1px; outline: none; background: var(--sup-3); box-shadow: 0 0 0 2px var(--acento); }
.sc-opcion strong { display: block; font: 700 17px/1.2 var(--f-texto); }
.sc-opcion small { display: block; margin-top: 4px; font: 500 13px/1.4 var(--f-texto); color: var(--tinta-2); }
.sc-opcion .sc-jp { display: grid; place-items: center; width: 48px; height: 48px; border-radius: var(--radio-peq); background: var(--sup); color: var(--tinta-2); font: var(--peso-titulo) 22px/1 var(--f-titulo); }
.sc-opcion[data-eleccion="unir"] .sc-jp { background: var(--boton); color: var(--boton-tinta); }
.sc-opcion[aria-disabled="true"] { opacity: 0.6; cursor: progress; }
.sc-ficha .sc-nota { margin: 0; }
.sc-error { color: var(--mal-txt); }
.sc-capa { z-index: 95; } /* encima de Ajustes (.tk-capa, 90), desde donde se abre el asistente */
.sc-asistente { text-align: left; }
.sc-asistente .m-ante, .sc-asistente h2 { text-align: center; }
.sc-asistente h2 { font-size: 36px; }
.sc-tres { list-style: none; margin: 4px 0 20px; padding: 0; display: grid; gap: 12px; }
.sc-tres li { display: flex; gap: 12px; align-items: flex-start; color: var(--tinta-2); font: 500 15px/1.5 var(--f-texto); }
.sc-tres b { flex: none; display: grid; place-items: center; width: 32px; height: 32px; border-radius: var(--radio-peq); background: var(--sup-3); color: var(--tinta-2); font: var(--peso-titulo) 15px/1 var(--f-titulo); }
.sc-campo { display: block; margin: 0 0 8px; font: 700 15px/1.3 var(--f-texto); color: var(--tinta); }
.sc-entrada { box-sizing: border-box; width: 100%; height: 52px; padding: 0 16px; border: 2px solid var(--linea-2); border-radius: var(--radio-peq); background: var(--sup); color: var(--tinta); font: 700 17px var(--f-texto); transition: border-color var(--d-2), box-shadow var(--d-2); }
.sc-entrada:focus { outline: none; border-color: var(--acento); box-shadow: 0 0 0 4px var(--acento-suave); }
.sc-sugerencias { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0 16px; }
.sc-sug { height: 40px; padding: 0 16px; border: var(--borde); border-radius: var(--radio-btn); background: var(--sup); color: var(--tinta); font: 700 13.5px var(--f-texto); box-shadow: var(--sombra-peq); transition: background-color var(--d-2), translate var(--d-2) var(--suave); }
.sc-sug:hover { background: var(--sup-3); }
.sc-sug:active { translate: 0 2px; box-shadow: none; }
.sc-asistente .sc-nota { margin: 0 0 16px; text-align: center; }
@media (max-width: 560px) { .sc-caja, .sc-empezar { flex-direction: column; align-items: stretch; } .sc-ahora { justify-content: center; } .sc-paso, .sc-equipo { flex-wrap: wrap; } }
@media (prefers-reduced-motion: reduce) { .sc-ahora.girando i { animation: none; } }
`;
