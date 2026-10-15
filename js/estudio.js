// Lecciones (presentar → probar) y repasos (escribir o elegir, sello, rangos) sobre papel washi. Todo se maneja con el teclado.
// · Antes de repasar eliges qué: palabras, kanji, elementos, gramática · significado, lectura (se recuerda).
// · «No lo sé» (0) cuenta como fallo y enseña la respuesta; al fallar, la carta se da la vuelta y muestra la respuesta completa.
// · Los kanji de una palabra se pulsan (o K y su número) para abrir su ficha sin perder el sitio; Esc vuelve.
// · Las tarjetas de gramática (item.tipo 'gramatica', item.pregunta) se repasan aquí con su estética añil.
import { gsap } from 'gsap';
import { $, $$, api, registrar, flotar, aviso, estado, mil, RANGO_COLOR, nuevoEquipo, nivelDe, quieto } from './app.js';
import { Mascota } from './mascota.js';
import * as son from './sonido.js';
import { esc, ruby, negrita, textoRico, sinFurigana, aHira, aKana, normLectura, compararSignificado, medioPunto, tonoMoras, svgTono } from './japones.js';
import { abrirHojaGramatica } from './gramatica.js';
import { efectoCombo, limpiarCombo, xpVuela, ponerXP, xpActual, htmlBarraXP, celebrarNivel, finSesion, contar, vestirMochi, cargarJuego, juegoActual } from './recompensas.js';
import { encajar } from './encaje.js';
import { cargarPool, armarOpciones, formatoMixto } from './opciones.js';
import { MODOS, modoDe, modoActual, ponerModo, siguienteModo, TIPOS_REPASO, HABS_REPASO, filtroActual, ponerFiltro, pasaFiltro, esTodo, filtroTodo, filtroConjugacion } from './ajustes.js';
import { kbd, confirmar, escribiendo, sobreControl, capaAbierta, capa, visible } from './teclado.js';
import { t, tn } from './i18n.js';
import { furiBases } from './conjugar.js';
import { prepararPupitre, verLibreta, ordenDisponible, nyanLeccion, alResponder, quizaAdelantarse, yaRespondido, materialDe, htmlRota, subirMaterial, arreglar, karaoke, lineasDiario, htmlDiario, animarDiario, guardarDiario, trazarKanji } from './pupitre.js';
import { visita } from './visita.js';

const V = () => $('#v-estudio');
let mini = null, audio = null, sesion = null, cuenta = null; // cuenta: respuestas de la sesión en curso (para /api/sesion/fin)
let fase = null; // 'filtro' | 'leccion' | 'prueba' | 'repaso' | 'fin' (para Esc, la hoja de atajos y los avisos al salir)
let salida = 'inicio'; // adónde lleva «Salir» (la práctica de una región vuelve al camino)
let alModo = null; // oyente de kd:modo (el modo cambiado desde Ajustes) de la pantalla en curso: uno solo
function oirModo(fn) {
  if (alModo) removeEventListener('kd:modo', alModo);
  alModo = fn; if (fn) addEventListener('kd:modo', fn);
}
const cara = (nombre, ms) => mini?.expresion?.(nombre, ms);
const NOTAS = { 秀: t('estudio.nota.sobresaliente'), 優: t('estudio.nota.notable'), 良: t('estudio.nota.bien'), 可: t('estudio.nota.aprobado') };
const TOPE_REPASO = 80, TOPE_PRACTICA = 30; // tarjetas por sesión
let preguntando = false, nivelPendiente = null; // la celebración de nivel espera a que no haya una pregunta a medias (se comería las teclas)
// subida de nivel: celebración a pantalla completa (Mochi se ríe); vale lo que diga el servidor o, si no lo dice, la curva de la app
function quizaNivel(r, retraso = 1100) {
  if (r?.xp_total == null) return;
  const antes = r.nivel_antes ?? nivelDe(r.xp_total - (r.xp || 0)).L, ahora = r.nivel ?? nivelDe(r.xp_total).L;
  if (ahora <= antes) return;
  nivelPendiente = { nivel: Math.max(ahora, nivelPendiente?.nivel || 0), bolsas: (nivelPendiente?.bolsas || 0) + (r.bolsas_ganadas ?? 0),
                     koban: (nivelPendiente?.koban || 0) + (r.koban_ganados ?? 0) };
  setTimeout(soltarNivel, retraso);
}
function soltarNivel() {
  if (!nivelPendiente || preguntando) return;
  const { nivel, bolsas, koban } = nivelPendiente; nivelPendiente = null;
  cara('risa', 3500); mini?.celebrar();
  celebrarNivel(nivel, { bolsas, koban }).then(() => $('#resp', V())?.focus({ preventScroll: true }));
}
// «el próximo, en 3 min»
function enCuanto(ts) {
  const s = ts - Date.now() / 1000;
  return s < 3600 ? tn('app.cuando.min', Math.max(1, Math.round(s / 60))) : s < 86400 ? tn('app.cuando.horas', Math.round(s / 3600)) : tn('app.cuando.dias', Math.round(s / 86400));
}

// ───────────────────────── opciones, homógrafos y traducciones ─────────────────────────
let pool = null; // /api/opciones: { lista, porId }
const conPool = () => cargarPool().then((p) => (pool = p)).catch(() => null);
// las palabras de un kanji traen solo el inglés: su español está en la ficha de la palabra (v + n)
const esDe = (p) => p.es || pool?.porId.get('v' + p.n)?.s || p.en;
// sinónimos para enseñar, sin el inglés del mazo
const altEs = (it) => (it.alt || []).filter((a) => a && a !== it.en);
// homógrafos (高い caro/alto) y, al escuchar, homófonos: comprobar() acepta también su respuesta; si ha valido por eso, se dice cuál era esta
function comprobarTarjeta(it, hab, resp, escucha = false) {
  const c = comprobar(it, hab, resp, escucha);
  if (!c.ok || !(it.gemelos?.length || (escucha && it.homofonos?.length))) return c;
  if (comprobar({ ...it, gemelos: [], homofonos: [] }, hab, resp).ok) return c;
  return { ...c, gemelo: hab === 'sig' ? t('estudio.gemelo.sig', { sig: it.es || it.en }) : t('estudio.gemelo.lec', { lec: String(it.lectura || '').split(/[、・]/)[0] }) };
}
// ¿esta lectura del kanji sale en sus palabras? (on'yomi en katakana; kun con okurigana: す.く → す)
const lecturaUsada = (usadas, x) => { const n = aHira(x).replace(/[*\-]/g, ''); return usadas.has(n.replace('.', '')) || usadas.has(n.split('.')[0]); };
const lecturasUsadas = (it) => new Set((it.lecturas || []).map((l) => aHira(l.lectura || '')));
const RANGOS = ['見習い', '剣士', '侍', '師範', '伝説'].map((jp, i) => [jp, t(`rangos.${i}`)]);
const TIPO = { radical: ['部', t('estudio.tipo.radical')], kanji: ['字', t('estudio.tipo.kanji')], vocab: ['語', t('estudio.tipo.vocab')], gramatica: ['文', t('estudio.tipo.gramatica')] };
const tipoDe = (it) => TIPO[it?.tipo] || ['札', t('estudio.tipo.tarjeta')];
// tamaños máximos de la palabra encajada: un kanji suelto puede ser enorme; una palabra, algo menos
const MAX_CASILLA = (n) => (n === 1 ? 250 : 176);
const MAX_CARTA = (n) => (n === 1 ? 150 : 120);
const MAX_DORSO = (n) => (n === 1 ? 128 : 96);

function caracter(it) { return it.tipo === 'vocab' ? it.palabra : it.tipo === 'gramatica' ? (it.jp || it.titulo || '') : it.caracter; }
function claseGrande(it) { return it.tipo === 'vocab' ? 'palabra' : ''; }
function tocar(nombre, boton) {
  if (audio) audio.pause();
  if (!nombre) return;
  audio = son.pista('/media/' + encodeURIComponent(nombre));   // por el AudioContext de toda la app (sonido.js)
  boton?.classList.add('sonando'); audio.onended = audio.onpause = () => boton?.classList.remove('sonando');
  audio.play().catch(() => boton?.classList.remove('sonando'));
}
// la frase de ejemplo suena y se ilumina al ritmo (karaoke)
function tocarFrase(it, cartaEl) { if (!it?.audio_frase) return; tocar(it.audio_frase); karaoke($('.frase-jp', cartaEl), audio); }
function cabecera(titulo, extra = '') {
  return `<header class="cab-papel"><button class="volver" data-volver>${t('estudio.salir')} ${kbd('Esc')}</button><div class="cab-centro">${titulo}</div><div class="contador">${extra}</div></header>`;
}
const flotarSobre = (el, txt, color) => { const r = el.getBoundingClientRect(); flotar(txt, r.left + r.width / 2, r.top - 8, color); };

// Salir / Volver: un solo manejador para todos los botones de la vista (la prueba pide confirmación si hay algo hecho)
// puedeSalir: también la piden los atajos globales que cambian de vista (I R L G K C M, teclado.js)
async function puedeSalir() {
  if (!(fase === 'prueba' && cuenta && !cuenta.cerrada && cuenta.hechas > 0)) return true;
  const pregunta = confirmar({ sello: '退', titulo: t('estudio.salir.tit'), texto: t('estudio.salir.texto'), si: t('estudio.salir.si'), no: t('estudio.salir.no') });
  // el anillo empieza en «Seguir»: Intro es la tecla de avanzar en la prueba
  requestAnimationFrame(() => requestAnimationFrame(() => $('.tk-confirmar [data-no]')?.focus({ preventScroll: true })));
  const si = await pregunta;
  if (!si) $('#resp', V())?.focus({ preventScroll: true });
  return si;
}
async function volver() {
  if (await puedeSalir()) location.hash = salida;
}

// ───────────────────────── kanji que se pulsan (ficha sin perder el sitio) ─────────────────────────
// los kanji de una palabra que tienen ficha propia
function kanjiDe(it) {
  if (it?.tipo === 'vocab') return new Set((it.kanji_info || []).map((k) => k.caracter));
  return new Set();
}
// para encajar(): envuelve cada kanji con ficha en algo que se pulsa
const marcador = (conj) => (conj.size ? (l) => [...l].map((ch) => (conj.has(ch) ? `<span class="kj" data-kj="${esc(ch)}" title="${t('estudio.kj.tit', { kj: esc(ch) })}">${esc(ch)}</span>` : esc(ch))).join('') : undefined);

let kjEspera = null; // tras pulsar K en una palabra con varios kanji: { lista, raiz, t }
function cancelarK() {
  if (!kjEspera) return;
  clearTimeout(kjEspera.t);
  kjEspera.raiz.classList.remove('kj-eligiendo');
  $$('[data-kj][data-n]', kjEspera.raiz).forEach((x) => x.removeAttribute('data-n'));
  kjEspera = null;
}
/** K abre la ficha del kanji (si hay varios, pide su número 1–9). Devuelve true si la tecla era suya. */
function teclaK(e, raiz, { propio = null } = {}) {
  const k = e.key;
  if (kjEspera) {
    const espera = kjEspera;
    if (/^[1-9]$/.test(k)) {
      e.preventDefault(); cancelarK();
      const ch = espera.lista[+k - 1];
      if (ch) abrirFichaKanji(ch, $(`[data-kj="${ch}"]`, espera.raiz));
      return true;
    }
    cancelarK();
    if (k === 'Escape' || k.toLowerCase() === 'k') { e.preventDefault(); return true; }
    return false;
  }
  if (k.toLowerCase() !== 'k') return false;
  e.preventDefault();
  const lista = [...new Set($$('[data-kj]', raiz).filter(visible).map((x) => x.dataset.kj))].slice(0, 9);
  if (!lista.length) {
    if (propio) { abrirFichaKanji(propio, $('.grande', raiz)); return true; }
    const r = raiz.getBoundingClientRect(); flotar(t('estudio.kj.sin'), r.left + r.width / 2, Math.max(r.top + 40, 120), 'var(--tinta-2)');
    return true;
  }
  if (lista.length === 1) { abrirFichaKanji(lista[0], $(`[data-kj="${lista[0]}"]`, raiz)); return true; }
  $$('[data-kj]', raiz).forEach((x) => { const i = lista.indexOf(x.dataset.kj); if (i >= 0) x.dataset.n = i + 1; });
  raiz.classList.add('kj-eligiendo'); son.toque();
  if (!quieto()) gsap.fromTo($$('[data-kj][data-n]', raiz), { '--kj-escala': 0.3 }, { '--kj-escala': 1, duration: 0.45, stagger: 0.06, ease: 'back.out(3)' });
  const r = raiz.getBoundingClientRect(); flotar(t('estudio.kj.cual', { n: lista.length }), r.left + r.width / 2, Math.max(r.top + 30, 120), 'var(--acento)');
  kjEspera = { lista, raiz, t: setTimeout(cancelarK, 4500) };
  return true;
}
// clic en un kanji de la vista o de la lámina emergente
function alPulsarKanji(e) {
  const x = e.target.closest?.('[data-kj]');
  if (!x) return;
  e.preventDefault(); e.stopPropagation(); cancelarK();
  abrirFichaKanji(x.dataset.kj, x);
}

let fichaAbierta = false;
export async function abrirFichaKanji(ch, origen = null) { // también la abre el mapa de kanji (perfil.js)
  if (fichaAbierta || !ch) return;
  fichaAbierta = true;
  let d;
  try { d = await api('/api/item/' + encodeURIComponent('k' + ch)); } catch {
    fichaAbierta = false;
    const r = origen?.getBoundingClientRect?.();
    flotar(t('estudio.ficha.sin', { kj: ch }), r ? r.left + r.width / 2 : innerWidth / 2, r ? r.top : innerHeight / 2, 'var(--mal)');
    return;
  }
  const usadas = lecturasUsadas(d);
  const lect = [...(d.on || []).map((x) => ['音', x]), ...(d.kun || []).map((x) => ['訓', x])];
  const palabras = (d.vocab_con || []).slice().sort((a, b) => (b.aprendido ? 1 : 0) - (a.aprendido ? 1 : 0)).slice(0, 8);
  const rg = Math.max(-1, ...Object.values(d.rangos || {}));
  const c = document.createElement('div');
  c.className = 'fk-capa'; c.setAttribute('role', 'dialog'); c.setAttribute('aria-modal', 'true'); c.setAttribute('aria-label', t('estudio.ficha.aria', { kj: d.caracter }));
  c.innerHTML = `<div class="fk-ficha explica" tabindex="-1">
    <button class="volver fk-cerrar" data-cerrar>${t('estudio.volver')} ${kbd('Esc')}</button>
    <div class="fk-cab">
      <div class="fk-casilla"><div class="marco-rojo"></div><b lang="ja">${esc(d.caracter)}</b><span class="fk-sello">字</span><button class="fk-orden" data-orden hidden aria-pressed="false" title="${t('estudio.ficha.orden')}">①<span>${t('estudio.ficha.orden')}</span> ${kbd('O')}</button><button class="fk-trazar" data-trazar>✎ ${t('estudio.ficha.trazar')} ${kbd('T')}</button></div>
      <div><div class="eyebrow">${t('estudio.tipo.kanji')} · 漢字 <span class="fk-estado ${d.aprendido ? 'si' : ''}">${d.aprendido ? t('estudio.ficha.estudiado') : t('estudio.ficha.no_estudiado')}</span></div>
        <h2>${esc(d.clave)}</h2>${d.alt?.length ? `<div class="alt">${esc(d.alt.slice(0, 4).join(' · '))}</div>` : ''}
        ${rg >= 0 ? `<div class="fk-rango"><i style="--rc:${RANGO_COLOR[rg]}">${RANGOS[rg][0]}</i>${RANGOS[rg][1]}</div>` : ''}</div>
    </div>
    ${d.partes?.length ? `<h3>${t('estudio.lamina.piezas')}</h3><div class="partes">${d.partes.map(htmlParte).join('')}<span class="mas">=</span><div class="parte"><b>${esc(d.caracter)}</b><span>${esc(d.clave)}</span></div></div>` : ''}
    ${d.mnemo ? `<h3>${t('estudio.lamina.historia')}</h3><p class="mnemo">${negrita(d.mnemo)}</p>` : ''}
    ${lect.length ? `<h3>${t('estudio.lamina.lecturas')}</h3><div class="lecturas">${lect.map(([ol, x]) => `<span class="lectura ${lecturaUsada(usadas, x) ? 'usada' : ''}" lang="ja"><small>${ol}</small>${esc(x)}</span>`).join('')}</div>` : ''}
    ${d.mnemo_lectura ? `<p class="mnemo fk-mnemo-l">${negrita(d.mnemo_lectura)}</p>` : ''}
    ${palabras.length ? `<h3>${t('estudio.ficha.palabras', { kj: esc(d.caracter) })}</h3><div class="fk-palabras">${palabras.map((p) => `<span class="fk-pal ${p.aprendido ? '' : 'no'}"><b lang="ja">${esc(p.palabra)}</b><small lang="ja">${esc(p.lectura)}</small><em>${esc(p.es)}</em></span>`).join('')}</div>` : ''}
  </div>`;
  document.body.appendChild(c);
  const ficha = $('.fk-ficha', c);
  son.papel();
  const r0 = origen?.isConnected ? origen.getBoundingClientRect() : null, rf = ficha.getBoundingClientRect();
  const dx = r0 ? r0.left + r0.width / 2 - (rf.left + rf.width / 2) : 0, dy = r0 ? r0.top + r0.height / 2 - (rf.top + rf.height / 2) : 80;
  gsap.fromTo(c, { opacity: 0 }, { opacity: 1, duration: 0.22 });
  if (!quieto()) {
    gsap.fromTo(ficha, { x: dx, y: dy, scale: 0.12, rotate: -8, opacity: 0 }, { x: 0, y: 0, scale: 1, rotate: 0, opacity: 1, duration: 0.62, ease: 'back.out(1.35)' });
    gsap.fromTo($('.fk-casilla b', c), { scale: 0.4, opacity: 0, filter: 'blur(6px)' }, { scale: 1, opacity: 1, filter: 'blur(0px)', duration: 0.6, delay: 0.22, ease: 'back.out(2)' });
    gsap.fromTo($('.fk-sello', c), { scale: 2.4, opacity: 0, rotate: 20 }, { scale: 1, opacity: 1, rotate: -6, duration: 0.4, delay: 0.5, ease: 'back.out(2.5)' });
    gsap.fromTo($$('.fk-ficha > :not(.fk-cab):not(.fk-cerrar)', c), { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.04, delay: 0.3, ease: 'power3.out' });
    const partes = $$('.parte', c);
    if (partes.length) gsap.fromTo(partes, { y: 18, opacity: 0, scale: 0.8 }, { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.1, delay: 0.45, ease: 'back.out(2)' });
  }
  let cerrada = false;
  const cerrar = () => {
    if (cerrada) return; cerrada = true; soltar();
    const vuelta = origen?.isConnected ? origen.getBoundingClientRect() : null, ahora = ficha.getBoundingClientRect();
    gsap.to(c, { opacity: 0, duration: 0.26, delay: 0.08, onComplete: () => { c.remove(); fichaAbierta = false; } });
    if (!quieto()) gsap.to(ficha, { x: vuelta ? vuelta.left + vuelta.width / 2 - (ahora.left + ahora.width / 2) : 0, y: vuelta ? vuelta.top + vuelta.height / 2 - (ahora.top + ahora.height / 2) : 60, scale: 0.12, rotate: 6, opacity: 0, duration: 0.34, ease: 'power3.in' });
    if (origen?.isConnected && !quieto()) gsap.fromTo(origen, { scale: 1.25 }, { scale: 1, duration: 0.6, delay: 0.3, ease: 'elastic.out(1, 0.4)', clearProps: 'scale' });
  };
  const soltar = capa(c, (e) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (k === 't') { trazarKanji(d.caracter); return true; }
    if (k === 'o' && !$('[data-orden]', c).hidden) { verOrden(); return true; }
    if (k === 'Escape' || k === 'k' || k === 'Backspace' || (k === 'Enter' && !document.activeElement?.closest?.('[data-cerrar]'))) { cerrar(); return true; }
    return false; // flechas y AvPág desplazan la ficha
  }, { foco: ficha });
  $('[data-cerrar]', c).onclick = cerrar;
  $('[data-trazar]', c).onclick = () => trazarKanji(d.caracter);
  // el orden de los trazos (con números), si el Anki del usuario trae la fuente
  const bOrden = $('[data-orden]', c), casilla = $('.fk-casilla', c);
  const verOrden = () => { const si = !casilla.classList.contains('con-orden'); casilla.classList.toggle('con-orden', si); bOrden.setAttribute('aria-pressed', String(si)); son.papel(); if (!quieto()) gsap.fromTo($('b', casilla), { scale: 0.85, opacity: 0.3 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(2.4)' }); };
  bOrden.onclick = verOrden;
  ordenDisponible(d.caracter).then((si) => { if (si) bOrden.hidden = false; });
  c.addEventListener('click', (e) => { if (e.target === c) cerrar(); });
}

// ───────────────────────── lámina de presentación ─────────────────────────
// pieza de un kanji: su carácter y su nombre (sin repetir el carácter si no tiene nombre)
const htmlParte = (p, i) => `${i ? '<span class="mas">+</span>' : ''}<div class="parte"><b>${esc((p.elemento || '').split(' ')[0])}</b>${p.nombre ? `<span>${esc(p.nombre)}</span>` : ''}</div>`;
function lamina(it, ctx = {}) {
  const [sello, nombreTipo] = tipoDe(it);
  let h = '';
  if (it.tipo === 'radical') {
    h += `<div class="eyebrow">${nombreTipo} · 部品</div><h2>${esc(it.nombre)}</h2><div class="alt">${esc(altEs(it).slice(0, 3).join(' · '))}</div>`;
    if (it.mnemo) h += `<h3>${t('estudio.lamina.recordar')}</h3><p class="mnemo">${negrita(it.mnemo)}</p>`;
    if (it.forma) h += `<p class="alt" style="margin-top:10px">${esc(it.forma)}</p>`;
    if (it.ejemplos?.length) h += `<h3>${t('estudio.lamina.encontraras')} <small class="pista-kj">${t('estudio.lamina.pulsa', { k: kbd('K') })}</small></h3><div class="chips">${it.ejemplos.slice(0, 12).map((k) => `<button class="chip-k" data-kj="${esc(k)}"><b>${esc(k)}</b></button>`).join('')}</div>`;
  } else if (it.tipo === 'kanji') {
    h += `<div class="eyebrow">${nombreTipo} · 漢字</div><h2>${esc(it.clave)}</h2>${it.alt?.length ? `<div class="alt">${esc(it.alt.slice(0, 3).join(' · '))}</div>` : ''}`;
    if (it.partes?.length) h += `<h3>${t('estudio.lamina.piezas')}</h3><div class="partes">${it.partes.map(htmlParte).join('')}<span class="mas">=</span><div class="parte"><b>${esc(it.caracter)}</b><span>${esc(it.clave)}</span></div></div>`;
    if (it.mnemo) h += `<h3>${t('estudio.lamina.historia')}</h3><p class="mnemo">${negrita(it.mnemo)}</p>`;
    const usadas = lecturasUsadas(it);
    const lect = [...(it.on || []).map((x) => ['音', x]), ...(it.kun || []).map((x) => ['訓', x])];
    if (lect.length) h += `<h3>${t('estudio.lamina.lecturas')}</h3><div class="lecturas">${lect.map(([ol, x]) => `<span class="lectura ${lecturaUsada(usadas, x) ? 'usada' : ''}"><small>${ol}</small>${esc(x)}</span>`).join('')}</div>`;
    if (it.mnemo_lectura) h += `<p class="mnemo" style="font-size:18px;margin-top:12px">${negrita(it.mnemo_lectura)}</p>`;
    if (it.palabras?.length) h += `<h3>${t('estudio.lamina.veras')}</h3><div class="chips">${it.palabras.map((p) => `<span class="chip-k" style="padding:8px 12px"><span style="font:500 19px var(--f-jp)">${ruby(p.furigana || p.palabra)}</span><span style="color:var(--tinta-2);font-size:13px">${esc(esDe(p))}</span></span>`).join('')}</div>`;
    if (it.nota) h += `<div class="matiz" style="margin-top:16px">${negrita(it.nota)}</div>`;
  } else {
    const conocida = ctx.conocida ? `<span class="chip-k" style="margin-left:10px;padding:4px 10px;font-size:12px">${t('estudio.lamina.conocida')}</span>` : '';
    h += `<div class="eyebrow">${nombreTipo} · 語彙 ${conocida}</div><h2>${esc(it.es || it.en)}</h2><div class="alt">${esc(altEs(it).slice(0, 3).join(' · '))}</div>`;
    const moras = tonoMoras(it.tono);
    h += `<h3>${t('estudio.lamina.pronunciacion')}</h3><div class="pron">${moras ? svgTono(moras, /[ぁ-ゖ]/.test(it.lectura || '')) : `<span class="kana">${esc(it.lectura)}</span>`}${it.audio ? `<button class="boton-audio" data-audio="${esc(it.audio)}">▶ ${t('estudio.lamina.escuchar')} ${kbd('R')}</button>` : ''}</div>`;
    if (it.frase) {
      h += `<h3>${t('estudio.lamina.frase')}</h3><div class="frase-bloque ${it.imagen ? '' : 'sin-img'}">${it.imagen ? `<img src="/media/${encodeURIComponent(it.imagen)}" alt="" onerror="this.remove()">` : ''}<div><div class="frase-jp">${ruby(it.frase_furigana || it.frase)}</div><div class="frase-es">${esc(it.frase_es || it.frase_en)}</div>${it.audio_frase ? `<button class="boton-audio" data-audio="${esc(it.audio_frase)}" style="margin-top:8px">▶ ${t('estudio.lamina.boton_frase')} ${kbd('E')}</button>` : ''}</div></div>`;
    }
    if (it.gramatica?.length) h += `<h3>${t('estudio.lamina.gramatica')}</h3><div class="gram">${it.gramatica.map((g) => `<button class="gram-item" data-leccion="${esc(g.leccion)}"><b>${esc(g.jp)}</b><span>${esc(g.nota)}</span><em>${t('estudio.lamina.leccion')}</em></button>`).join('')}</div>`;
    if (it.kanji_info?.length) h += `<h3>${t('estudio.lamina.sus_kanji')} <small class="pista-kj">${t('estudio.lamina.pulsa', { k: kbd('K') })}</small></h3><div class="chips">${it.kanji_info.map((k) => `<button class="chip-k ${k.aprendido ? '' : 'no'}" data-kj="${esc(k.caracter)}"><b>${esc(k.caracter)}</b>${esc(k.clave)}</button>`).join('')}</div>`;
    if (it.matiz) h += `<h3>${t('estudio.lamina.matiz')}</h3><div class="matiz">${negrita(it.matiz)}</div>`;
    if (it.mnemo) h += `<h3>${t('estudio.lamina.truco')}</h3><p class="mnemo">${negrita(it.mnemo)}</p>`;
  }
  return `<div class="lamina">
    <div class="casilla"><div class="marco-rojo"></div><div class="grande ${claseGrande(it)}" lang="ja">${esc(caracter(it))}</div><div class="tipo-sello ${it.tipo}">${sello}</div></div>
    <div class="explica">${h}</div></div>`;
}
function enlazarLamina(cont) {
  $$('[data-audio]', cont).forEach((b) => { b.onclick = () => tocar(b.dataset.audio, b); });
  $$('[data-leccion]', cont).forEach((b) => { b.onclick = () => b.dataset.leccion && abrirHojaGramatica(b.dataset.leccion); });
}
function animarLamina(cont, dir = 1, it = null) {
  const casilla = $('.casilla', cont), grande = $('.grande', cont);
  encajar(grande, { caja: $('.marco-rojo', cont), margen: 0.09, max: MAX_CASILLA, marcar: marcador(kanjiDe(it)) });
  gsap.fromTo(casilla, { x: -40 * dir, opacity: 0, rotate: -2 * dir }, { x: 0, opacity: 1, rotate: 0, duration: 0.6, ease: 'power3.out' });
  gsap.fromTo(grande, { scale: 0.7, opacity: 0, filter: 'blur(6px)' }, { scale: 1, opacity: 1, filter: 'blur(0px)', duration: 0.7, delay: 0.1, ease: 'back.out(1.6)' });
  gsap.fromTo($('.tipo-sello', cont), { scale: 2.2, opacity: 0, rotate: 18 }, { scale: 1, opacity: 1, rotate: -6, duration: 0.45, delay: 0.45, ease: 'back.out(2.5)' });
  gsap.fromTo($$('.explica > *', cont), { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, stagger: 0.045, delay: 0.12, ease: 'power3.out' });
  const partes = $$('.parte', cont);
  if (partes.length) gsap.fromTo(partes, { y: 20, opacity: 0, scale: 0.8 }, { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.12, delay: 0.35, ease: 'back.out(2)' });
}

// ───────────────────────── gramática: datos de la pregunta ─────────────────────────
// item.pregunta = {tipo 'elegir'|'completar', enunciado, jp (＿ en el hueco, si lo hay), opciones, correcta, es, explica, solucion}
// completar: se escribe y todas las opciones valen (opciones[correcta] es la que se enseña)
function datosGram(it) {
  const p = it.pregunta || {};
  const opciones = (p.opciones || []).map((x) => String(x));
  const buena = typeof p.correcta === 'number' ? p.correcta : opciones.indexOf(String(p.correcta ?? ''));
  const respuesta = buena >= 0 && opciones[buena] != null ? opciones[buena] : String(p.correcta ?? p.solucion ?? '');
  return { p, opciones, buena, respuesta, hueco: String(p.jp || '').includes('＿'),
    titulo: it.jp || it.titulo || '文法', sub: it.jp ? (it.titulo || '') : '', slug: it.leccion || '', leccion: it.leccion_titulo || it.titulo || it.jp || '' };
}
function opcionesGram(it) {
  const g = datosGram(it);
  const escribir = g.p.tipo === 'completar' || !(g.opciones.length >= 2 && g.buena >= 0);
  return { formato: escribir ? 'escribir' : 'elegir', opciones: escribir ? null : { opciones: g.opciones.map((t, i) => ({ texto: t, html: esJapones(t) ? ruby(t) : esc(t), es: !esJapones(t), ok: i === g.buena })), buena: g.buena } };
}
const esJapones = (s) => /[぀-ヿ一-鿿]/.test(s || '');
// lo que se ve dentro del hueco (una respuesta en español, «nada: van pegados», se queda en ∅)
const rellenoGram = (g) => (esJapones(g.respuesta) ? ruby(g.respuesta) : '<i class="vacio">∅</i>');
function fraseGram(jp, relleno = null, clase = '') {
  const hueco = relleno == null ? `<span class="hueco" aria-label="${t('estudio.gram.hueco')}">？</span>` : `<span class="hueco lleno ${clase}">${relleno}</span>`;
  return ruby(jp || '').replace('＿', () => hueco).replace(/\n/g, '<br>');
}
// tamaño de la frase según lo larga que sea
const claseFrase = (jp) => { const n = sinFurigana(jp || '').length; return n > 40 ? 'muy-larga' : n > 22 ? 'larga' : ''; };
const lecturaFurigana = (s) => String(s || '').replace(/( ?)([^ 　>\[\]]+?)\[([^\]]+)\]/g, '$3');
const normGram = (s) => aHira(String(s || '')).replace(/[\s　＿_。、,.!！?？「」『』]/g, '').toLowerCase();
function comprobarGram(g, resp) {
  const validas = new Set();
  // el rōmaji Hepburn escribe las partículas como suenan («dewa», «o», «e»): は/わ, を/お y へ/え cuentan igual
  const suena = (s) => normGram(s).replace(/は/g, 'わ').replace(/を/g, 'お').replace(/へ/g, 'え');
  const lista = [g.respuesta, ...(g.p.tipo === 'completar' ? g.opciones : []), ...(g.hueco ? [] : [g.p.solucion])];
  lista.filter(Boolean).forEach((x) => { validas.add(suena(sinFurigana(x))); validas.add(suena(lecturaFurigana(x))); });
  const a = suena(aKana(resp, true)), b = suena(resp);
  if (!a && !b) return { ok: false };
  const ok = validas.has(a) || validas.has(b);
  return { ok, exacto: ok };
}

// ───────────────────────── pregunta (lección y repaso): escribir o elegir ─────────────────────────
// hab 'en': el inglés del mazo, que solo vale exacto. También vale lo de su homógrafo (高い: «caro» y «alto») y, al escuchar, lo que suena igual
function validas(it, hab, escucha = false) {
  const otras = [...(it.gemelos || []), ...(escucha ? it.homofonos || [] : [])];
  if (hab === 'en') return it.tipo === 'kanji' ? [] : [it.en, ...otras.map((g) => g.en)];
  if (hab === 'sig') return it.tipo === 'radical' ? [it.nombre, ...(it.alt || [])] : it.tipo === 'kanji' ? [it.clave, ...(it.alt || [])] : [it.es, ...(it.alt || []), ...otras.flatMap((g) => [g.es, ...(g.alt || [])])];
  if (it.tipo === 'kanji') return it.lecturas_validas || [];
  return [it.lectura, ...(it.gemelos || []).map((g) => g.lectura)].flatMap((l) => String(l || '').split(/[、,，/／・]/));
}
function comprobar(it, hab, resp, escucha = false) {
  const sig = (r) => compararSignificado(r, validas(it, 'sig', escucha), validas(it, 'en', escucha));
  if (hab === 'sig') {
    if (/^[぀-ヿ]+$/.test(resp.trim())) return { aviso: t('estudio.aviso.sig') };
    const c = sig(resp), medio = c.ok ? null : medioPunto(resp, it.casi);
    return medio ? { ok: false, medio } : c;
  }
  const kana = normLectura(aKana(resp, true));
  if (!kana) return { ok: false };
  if (/[a-z]/i.test(kana)) return { aviso: t('estudio.aviso.kana') };
  const ok = validas(it, 'lec').map(normLectura).includes(kana);
  if (!ok && sig(resp).ok) return { aviso: t('estudio.aviso.lec') };
  return { ok, exacto: ok };
}
// medio punto: por qué casi vale y en qué se diferencia («mover» es 動かす; 動く es «moverse»)
function notaMedio(it, m, escrito) {
  const tuya = esc(String(escrito || m.r[0]).trim());
  const lead = m.con ? t('estudio.medio.otra', { tuya, con: `<b lang="ja">${ruby(m.con + (m.lectura && m.lectura !== m.con ? `[${m.lectura}]` : ''))}</b>`, es: esc(m.es) })
    : t('estudio.medio.se', { tuya });
  return `<div class="medio-nota"><span class="medio-sello" aria-hidden="true">半</span><div><b class="medio-tit">${t('estudio.medio.tit')}</b>
    <p>${lead} ${t('estudio.medio.aqui', { palabra: `<b lang="ja">${esc(caracter(it))}</b>`, es: esc(it.es) })}</p>${m.nota ? `<p class="medio-matiz">${negrita(m.nota)}</p>` : ''}</div></div>`;
}
// lo común de todas las cartas: respuesta (opciones o casilla), «No lo sé», ayuda de teclas y zona de solución
function pieCarta(hab, formato, opciones, modos, { gram = false } = {}) {
  const n = opciones?.opciones?.length || 0;
  const resp = formato === 'elegir'
    ? `<div class="opciones-rep ${hab} ${opciones.opciones.some((o) => o.texto.length > 26) ? 'lista' : n === 3 ? 'tres' : ''}" role="group" aria-label="${t('estudio.carta.opciones')}">${opciones.opciones.map((o, i) => `<button class="opcion" data-k="${i}">${kbd(i + 1)}<span ${o.es ? 'class="es"' : hab !== 'sig' ? 'lang="ja"' : ''}>${o.html ?? esc(o.texto)}</span></button>`).join('')}</div>`
    : `<form class="respuesta" autocomplete="off"><input id="resp" spellcheck="false" autocapitalize="off" aria-label="${gram ? t('estudio.carta.tu_respuesta') : hab === 'sig' ? t('estudio.cinta.significado') : t('estudio.cinta.lectura')}" placeholder="${gram ? 'こたえ…' : hab === 'sig' ? t('estudio.carta.ph_sig') : 'よみかた…'}"><button class="enviar" type="submit" aria-label="${t('estudio.carta.comprobar')}">↵</button></form>`;
  const ayuda = formato === 'elegir'
    ? [t('estudio.ayuda.elige', { de: kbd('1'), a: kbd(Math.max(2, n)) }), t('estudio.ayuda.no_se', { k: kbd('0') }), t('estudio.ayuda.siguiente', { k: kbd('Intro') }),
      ...(gram ? [] : [t('estudio.ayuda.lamina', { k: kbd('F') })]), ...(modos ? [t('estudio.ayuda.modo', { k: kbd('M') })] : [])].join(' · ')
    : [t('estudio.ayuda.comprobar', { k: kbd('Intro') }), t('estudio.ayuda.no_se_vacia', { k: kbd('0') }), t('estudio.ayuda.errata_si', { k: kbd('Retroceso') }),
      ...(modos ? [t('estudio.ayuda.otro_modo', { k: kbd('↑') + kbd('↓') })] : [])].join(' · ');
  return `${resp}<button class="no-se" type="button" data-nose><span class="no-se-ico" aria-hidden="true">？</span>${t('estudio.no_se')} ${kbd('0')}</button>
    <div class="ayuda-rep">${ayuda}</div><div class="solucion" id="solucion" aria-live="polite"></div>`;
}
function carta(it, hab, r, { formato = 'escribir', opciones = null, escucha = false, modos = false, rota = false } = {}) {
  const rango = r != null && r >= 0 ? `<div class="rango"><i style="--rc:${RANGO_COLOR[r]}">${RANGOS[r][0]}</i>${RANGOS[r][1]}</div>` : '';
  if (it.tipo === 'gramatica') {
    const g = datosGram(it);
    const pista = g.hueco && g.p.es ? g.p.es : ''; // la traducción solo si no delata la respuesta
    // 01-10: «も: también / ni siquiera» encima de «今回＿、…» era darle la respuesta. En los huecos, o si el
    // nombre del punto contiene la respuesta, el punto no sale hasta que se responde (en el dorso sí está)
    const delata = g.hueco || (g.respuesta && sinFurigana(g.respuesta).length && (g.titulo + ' ' + g.sub).includes(sinFurigana(g.respuesta)));
    const que = formato === 'elegir' ? (g.hueco ? t('estudio.cinta.gram_elige_hueco') : t('estudio.cinta.elige')) : (g.hueco ? t('estudio.cinta.gram_escribe_hueco') : t('estudio.cinta.gram_escribe'));
    return `<div class="carta-rep gram${materialDe(r)}${rota ? ' rota' : ''}" data-formato="${formato}">${rota ? htmlRota() : ''}<span class="tipo">${t(it.conj ? 'estudio.tipo.conjugacion' : 'estudio.tipo.gramatica')}</span>${rango}
      <div class="zona-gram">${delata ? '' : `<div class="gram-punto"><b lang="ja">${it.conj ? ruby(furiBases(g.titulo)) : esc(g.titulo)}</b>${g.sub ? `<small>${it.conj ? ruby(furiBases(g.sub)) : esc(g.sub)}</small>` : ''}</div>`}
        ${g.p.enunciado ? `<div class="gram-enunciado">${ruby(g.p.enunciado)}</div>` : ''}
        <div class="gram-frase ${claseFrase(g.p.jp)}" lang="ja">${fraseGram(g.p.jp)}</div>${pista ? `<div class="gram-es">${esc(pista)}</div>` : ''}</div></div>
      <div class="cinta uso">${t(it.conj ? 'estudio.tipo.conjugacion' : 'estudio.tipo.gramatica')}<small>${que}</small></div>` + pieCarta(hab, formato, opciones, modos, { gram: true });
  }
  const [, nombreTipo] = tipoDe(it);
  const frente = escucha
    ? `<button class="altavoz" data-audio="${esc(it.audio)}" aria-label="${t('estudio.carta.otra_vez_aria')}"><span class="ondas"><i></i><i></i><i></i></span><span class="altavoz-ico">▶</span><small>${t('estudio.carta.otra_vez', { k: formato === 'elegir' ? kbd('R') : kbd('Espacio') })}</small></button>`
    : `<div class="grande ${claseGrande(it)}" lang="ja">${esc(caracter(it))}</div>`;
  const cinta = escucha ? `<div class="cinta sig">${t('estudio.cinta.escucha')}<small>${t('estudio.cinta.que_significa')}</small></div>`
    : `<div class="cinta ${hab}">${hab === 'sig' ? t('estudio.cinta.significado') : t('estudio.cinta.lectura')}<small>${formato === 'elegir' ? t('estudio.cinta.elige') : hab === 'sig' ? (it.tipo === 'radical' ? t('estudio.cinta.elemento') : t('estudio.cinta.idioma')) : t('estudio.cinta.kana')}</small></div>`;
  return `<div class="carta-rep ${escucha ? 'escucha' : ''}${materialDe(r)}${rota ? ' rota' : ''}" data-formato="${formato}">${rota ? htmlRota() : ''}<span class="tipo">${nombreTipo}</span>${rango}<div class="zona-palabra">${frente}</div></div>
    ${cinta}` + pieCarta(hab, formato, opciones, modos);
}

// ── el dorso de la carta: la respuesta completa ──
function htmlDorso(it, hab, { noSe = false } = {}) {
  const marca = `<span class="dorso-marca"><b>答</b>${noSe ? t('estudio.dorso.asi_se') : t('estudio.dorso.asi_era')}</span>`;
  if (it.tipo === 'gramatica') {
    const g = datosGram(it), resp = esJapones(g.respuesta) ? ruby(g.respuesta) : esc(g.respuesta);
    let frase;
    if (g.hueco) frase = `<div class="gram-frase ${claseFrase(g.p.jp)}" lang="ja">${fraseGram(g.p.jp, rellenoGram(g), 'bien')}</div>`;
    else if (g.p.tipo === 'completar') frase = `<div class="gram-frase ${claseFrase(g.p.jp + g.respuesta)}" lang="ja">${fraseGram(g.p.jp)}<span class="gram-flecha">→</span><span class="hueco lleno bien">${resp}</span></div>`;
    else frase = `<div class="gram-frase ${claseFrase(g.p.jp)}" lang="ja">${fraseGram(g.p.solucion || g.p.jp)}</div><div class="gram-resp"><span>${t('estudio.dorso.respuesta')}</span><b ${esJapones(g.respuesta) ? 'lang="ja"' : ''}>${resp}</b></div>`;
    return `<span class="tipo">${t(it.conj ? 'estudio.tipo.conjugacion' : 'estudio.tipo.gramatica')}</span>${marca}<div class="zona-gram dorso-gram">
      <div class="gram-punto"><b lang="ja">${it.conj ? ruby(furiBases(g.titulo)) : esc(g.titulo)}</b>${g.sub ? `<small>${it.conj ? ruby(furiBases(g.sub)) : esc(g.sub)}</small>` : ''}</div>
      ${g.p.enunciado ? `<div class="gram-enunciado">${ruby(g.p.enunciado)}</div>` : ''}${frase}${g.p.es && g.p.es !== g.respuesta ? `<div class="gram-es">${esc(g.p.es)}</div>` : ''}
      ${g.p.explica ? `<div class="gram-explica">${textoRico(g.p.explica)}</div>` : ''}
      ${g.slug ? `<button class="enlace gram-ir" data-leccion="${esc(g.slug)}">${t('estudio.dorso.repasar', { leccion: esc(g.leccion) })} ${kbd('F')}</button>` : ''}</div>`;
  }
  const [, nombreTipo] = tipoDe(it);
  const te = (h) => (h === hab ? `<span class="dorso-te-pedia">${h === 'sig' ? t('estudio.dorso.te_pedia_sig') : t('estudio.dorso.te_pedia_lec')}</span>` : '');
  const pedido = (h) => (h === hab ? ' pedido' : '');
  let izq = `<div class="dorso-caja"><div class="grande ${claseGrande(it)}" lang="ja">${esc(caracter(it))}</div></div>`;
  let der = '';
  if (it.tipo === 'vocab') {
    const moras = tonoMoras(it.tono);
    const alt = altEs(it).slice(0, 3).join(' · ');
    const sig = `<div class="dorso-sig${pedido('sig')}">${te('sig')}<b>${esc(it.es || it.en)}</b>${alt ? `<small>${esc(alt)}</small>` : ''}</div>`;
    const lec = `<div class="dorso-lec${pedido('lec')}">${te('lec')}<div class="dorso-pron">${moras ? svgTono(moras, /[ぁ-ゖ]/.test(it.lectura || '')) : `<span class="kana" lang="ja">${esc(it.lectura)}</span>`}${it.audio ? `<button class="boton-audio" data-audio="${esc(it.audio)}">▶ ${kbd('R')}</button>` : ''}</div></div>`;
    der = hab === 'lec' ? lec + sig : sig + lec;
    const truco = hab === 'lec' && it.mnemo_lectura ? it.mnemo_lectura : it.mnemo;
    if (truco) der += `<p class="dorso-truco"><span>${t('estudio.lamina.truco')}</span>${negrita(truco)}</p>`;
    if (it.frase) der += `<div class="dorso-frase"><div class="frase-jp" lang="ja">${ruby(it.frase_furigana || it.frase)}</div><div class="frase-es">${esc(it.frase_es || it.frase_en || '')}${it.audio_frase ? ` · ${t('estudio.ayuda.escuchar', { k: kbd('E') })}` : ''}</div></div>`;
    if (it.kanji_info?.length) izq += `<div class="dorso-kanji">${it.kanji_info.map((k) => `<button class="chip-k ${k.aprendido ? '' : 'no'}" data-kj="${esc(k.caracter)}"><b>${esc(k.caracter)}</b>${esc(k.clave)}</button>`).join('')}</div><div class="dorso-pista">${t('estudio.dorso.pulsa_kanji', { k: kbd('K') })}</div>`;
  } else if (it.tipo === 'kanji') {
    const usadas = lecturasUsadas(it);
    const lect = [...(it.on || []).map((x) => ['音', x]), ...(it.kun || []).map((x) => ['訓', x])];
    const sig = `<div class="dorso-sig${pedido('sig')}">${te('sig')}<b>${esc(it.clave)}</b>${it.alt?.length ? `<small>${esc(it.alt.slice(0, 3).join(' · '))}</small>` : ''}</div>`;
    const lec = `<div class="dorso-lec${pedido('lec')}">${te('lec')}<div class="lecturas">${lect.map(([ol, x]) => `<span class="lectura ${lecturaUsada(usadas, x) ? 'usada' : ''}" lang="ja"><small>${ol}</small>${esc(x)}</span>`).join('')}</div></div>`;
    der = hab === 'lec' ? lec + sig : sig + lec;
    const truco = hab === 'lec' ? (it.mnemo_lectura || it.mnemo) : it.mnemo;
    if (truco) der += `<p class="dorso-truco"><span>${hab === 'lec' ? t('estudio.lamina.truco') : t('estudio.lamina.historia')}</span>${negrita(truco)}</p>`;
    if (it.palabras?.length) der += `<div class="chips dorso-palabras">${it.palabras.slice(0, 3).map((p) => `<span class="chip-k"><span lang="ja">${ruby(p.furigana || p.palabra)}</span><small>${esc(esDe(p))}</small></span>`).join('')}</div>`;
    izq += `<div class="dorso-pista">${t('estudio.dorso.ficha', { k: kbd('K') })}</div>`;
  } else {
    der = `<div class="dorso-sig pedido">${te('sig')}<b>${esc(it.nombre)}</b>${altEs(it).length ? `<small>${esc(altEs(it).slice(0, 3).join(' · '))}</small>` : ''}</div>`;
    if (it.mnemo) der += `<p class="dorso-truco"><span>${t('estudio.lamina.recordar')}</span>${negrita(it.mnemo)}</p>`;
    if (it.ejemplos?.length) der += `<div class="chips dorso-kanji">${it.ejemplos.slice(0, 9).map((k) => `<button class="chip-k" data-kj="${esc(k)}"><b>${esc(k)}</b></button>`).join('')}</div><div class="dorso-pista" style="text-align:left">${t('estudio.dorso.encontraras', { k: kbd('K') })}</div>`;
  }
  return `<span class="tipo">${nombreTipo}</span>${marca}<div class="dorso-rejilla"><div class="dorso-izq">${izq}</div><div class="dorso-der">${der}</div></div>`;
}
function encajarDorso(cartaEl, it) {
  const g = $('.dorso-caja .grande', cartaEl);
  if (g) encajar(g, { caja: $('.dorso-caja', cartaEl), margen: 0.08, max: MAX_DORSO, marcar: marcador(kanjiDe(it)) });
}
// gira la carta en 3D y cambia su cara a mitad de giro (y su alto, suave)
function girarCarta(el, pintar) {
  return new Promise((fin) => {
    gsap.killTweensOf(el);
    if (quieto()) { gsap.set(el, { y: 0, scale: 1 }); pintar(); gsap.fromTo(el, { opacity: 0.3 }, { opacity: 1, duration: 0.25, onComplete: fin }); return; }
    const h0 = el.offsetHeight;
    son.papel();
    gsap.timeline({ onComplete: () => { gsap.set(el, { clearProps: 'transform,filter' }); fin(); } })
      .set(el, { x: 0, y: 0, opacity: 1, transformPerspective: 1600 })
      .to(el, { rotationY: 90, scale: 0.95, filter: 'brightness(0.82)', duration: 0.24, ease: 'power2.in' })
      .call(() => {
        pintar();
        gsap.set(el, { height: 'auto' }); const h1 = el.offsetHeight; gsap.set(el, { height: h0 });
        gsap.to(el, { height: h1, duration: 0.55, ease: 'power3.out', onComplete: () => gsap.set(el, { clearProps: 'height' }) });
      })
      .fromTo(el, { rotationY: -90, filter: 'brightness(0.82)' }, { rotationY: 0, scale: 1, filter: 'brightness(1)', duration: 0.66, ease: 'back.out(1.6)' });
  });
}
// al acertar: un giro breve (y una vuelta entera si sube de rango)
function giroAcierto(el, entera = false) {
  if (quieto()) return;
  if (entera) gsap.fromTo(el, { rotationY: 0 }, { rotationY: 360, duration: 0.95, ease: 'back.out(1.3)', transformPerspective: 1600, clearProps: 'transform' });
  else gsap.timeline().to(el, { rotationY: -16, rotationX: 5, duration: 0.14, ease: 'power2.out', transformPerspective: 1600 })
    .to(el, { rotationY: 0, rotationX: 0, duration: 0.85, ease: 'elastic.out(1, 0.36)', clearProps: 'transform' });
}
function selloEn(el, kanji = '正', color = 'var(--mal)') {
  const s = document.createElement('div'); s.className = 'sello'; s.textContent = kanji; s.style.color = color;
  const r = el.getBoundingClientRect(), pr = V().getBoundingClientRect();
  s.style.left = (r.right - pr.left - 190) + 'px'; s.style.top = (r.top - pr.top + V().scrollTop + 30) + 'px';
  V().appendChild(s);
  gsap.fromTo(s, { scale: 2.4, opacity: 0, rotate: -24 }, { scale: 1, opacity: 0.92, rotate: -8, duration: 0.32, ease: 'power4.in', onComplete: () => { son.sello(); gsap.fromTo(el, { y: 0 }, { y: 4, duration: 0.07, yoyo: true, repeat: 1 }); } });
  gsap.to(s, { opacity: 0, duration: 0.5, delay: 1.3, onComplete: () => s.remove() });
}
// 01-10: la pregunta entera (carta, cinta,
// respuesta u opciones, «No lo sé» y ayuda) cabe en la vista sin desplazar. Si no cabe, las opciones se compactan y la
// carta se encoge (zoom) lo justo; con más sitio, vuelve a su tamaño.
function encajarVista(v = V()) {
  const carta = $('.carta-rep', v);
  if (!carta || !v.isConnected) return;
  carta.style.zoom = ''; v.classList.remove('rep-justa');
  const sobra = () => v.scrollHeight - v.clientHeight;
  if (sobra() <= 0) return;
  v.classList.add('rep-justa');
  const s = sobra();
  if (s <= 0) return;
  const h = carta.offsetHeight;
  if (h > 0) carta.style.zoom = String(Math.max(0.65, (h - s - 6) / h));   // más pequeña no se leería: antes, que desplace
}
let encajeT = 0;
addEventListener('resize', () => { clearTimeout(encajeT); encajeT = setTimeout(() => { if (V()?.classList.contains('activa')) { encajarVista(); encajarFin(); } }, 120); });
function encajarCarta(cont = V(), marcar) {
  const g = $('.carta-rep .zona-palabra .grande', cont);
  if (g) encajar(g, { caja: $('.carta-rep .zona-palabra', cont), margen: 0.02, max: MAX_CARTA, marcar });
}

/**
 * Monta la pregunta de la carta ya pintada: evalúa, anima y espera a Intro para seguir.
 * ctx: { formato, opciones, escucha, registrar(ok, ms, c), siguiente(), verLamina(), cambiarModo(dir)? }
 */
function montarPregunta(it, hab, ctx) {
  const v = V(), inp = $('#resp', v), form = $('.respuesta', v), sol = $('#solucion', v), cartaEl = $('.carta-rep', v), noSeBtn = $('.no-se', v);
  const ops = $$('.opcion[data-k]', v), eligiendo = ctx.formato === 'elegir';
  const gram = it.tipo === 'gramatica', g = gram ? datosGram(it) : null;
  const kjs = kanjiDe(it), enKana = hab !== 'sig';
  const t0 = performance.now();
  let estadoP = 'preguntando', resultado = null, volteada = false, frente = null, girando = false, ultimo = null;
  preguntando = true;
  // con poca altura, la carta girada empuja la solución fuera de la vista: se desplaza lo justo para verla,
  // sin meter bajo la cabecera lo que se pedía (la respuesta del dorso o la palabra)
  const asomar = () => {
    if (!sol.isConnected) return;
    encajarVista(v);
    const tope = $('.cab-papel', v)?.getBoundingClientRect().bottom ?? v.getBoundingClientRect().top;
    const clave = $('.dorso-der .pedido, .dorso-gram .gram-frase, .zona-palabra, .zona-gram', cartaEl);
    let falta = sol.getBoundingClientRect().bottom + 16 - v.getBoundingClientRect().bottom;
    if (clave) falta = Math.min(falta, clave.getBoundingClientRect().top - tope - 8);
    if (falta > 0) v.scrollBy({ top: falta, behavior: quieto() ? 'auto' : 'smooth' });
  };
  v.classList.remove('rep-dorso'); encajarCarta(v); encajarVista(v);
  gsap.fromTo(cartaEl, { y: 30, opacity: 0, scale: 0.97 }, { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: 'power3.out' });
  gsap.fromTo($('.cinta', v), { scaleX: 0.2, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 0.45, delay: 0.1, ease: 'power3.out' });
  if (noSeBtn) gsap.fromTo(noSeBtn, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, delay: 0.45, ease: 'back.out(2)' });
  if (gram) gsap.fromTo($$('.zona-gram > *', v), { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.07, delay: 0.12, ease: 'power3.out' });
  if (ops.length) {
    // las opciones entran escalonadas, cada una con su nota de koto
    gsap.fromTo(ops, { y: 28, opacity: 0, scale: 0.84, rotate: (i) => (i % 2 ? 4 : -4) }, { y: 0, opacity: 1, scale: 1, rotate: 0, duration: 0.55, stagger: 0.075, delay: 0.16, ease: 'back.out(2.2)' });
    ops.forEach((_, i) => setTimeout(() => son.koto(son.escalon(i + 3, 62), 0, 0.18, (i - 1.5) / 5), 180 + i * 75));
  }
  if (inp && ctx.autofoco !== false) setTimeout(() => inp.focus({ preventScroll: true }), 30);
  if (ctx.escucha) setTimeout(() => tocar(it.audio, $('.altavoz', v)), 380);
  $('.altavoz', v)?.addEventListener('click', () => { tocar(it.audio, $('.altavoz', v)); inp?.focus({ preventScroll: true }); });
  if (enKana && inp) inp.addEventListener('input', () => { const val = aKana(inp.value); if (val !== inp.value) { inp.value = val; inp.setSelectionRange(val.length, val.length); } });

  // en Escuchar, al resolver aparece la palabra
  const revelar = (animar = true) => {
    const z = $('.zona-palabra', cartaEl); if (!z || !ctx.escucha) return;
    z.innerHTML = `<div class="grande ${claseGrande(it)}" lang="ja">${esc(caracter(it))}</div>${it.lectura && it.lectura !== caracter(it) ? `<div class="lectura-rev" lang="ja">${esc(it.lectura)}</div>` : ''}`;
    encajarCarta(v, marcador(kjs));
    if (!animar) return;
    gsap.fromTo($('.grande', z), { scale: 0.6, opacity: 0, filter: 'blur(8px)' }, { scale: 1, opacity: 1, filter: 'blur(0px)', duration: 0.6, ease: 'back.out(1.8)', clearProps: 'filter' });
    if ($('.lectura-rev', z)) gsap.fromTo($('.lectura-rev', z), { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, delay: 0.25 });
  };
  // gramática: la respuesta cae en el hueco
  const llenarHueco = (ok) => {
    const h = $('.gram-frase .hueco', cartaEl); if (!h) return;
    h.innerHTML = rellenoGram(g); h.classList.add('lleno', ok ? 'bien' : 'mal');
    if (!quieto()) gsap.fromTo(h, { scale: 0.3, y: -26, opacity: 0 }, { scale: 1, y: 0, opacity: 1, duration: 0.55, ease: 'back.out(2.6)' });
  };
  // la carta se da la vuelta: por detrás, la respuesta completa (V la vuelve a girar)
  const voltear = async (aDorso = !volteada) => {
    if (girando || aDorso === volteada || !cartaEl.isConnected) return;
    girando = true;
    await girarCarta(cartaEl, () => {
      if (aDorso) {
        frente = cartaEl.innerHTML;
        cartaEl.innerHTML = htmlDorso(it, hab, { noSe: ultimo?.noSe });
        cartaEl.classList.add('dorso'); cartaEl.classList.toggle('fallo', !ultimo?.ok);
        encajarDorso(cartaEl, it);
        $$('[data-audio]', cartaEl).forEach((b) => { b.onclick = () => tocar(b.dataset.audio, b); });
        const fr = $('.dorso-frase', cartaEl); if (fr && it.audio_frase) { fr.classList.add('con-audio'); fr.onclick = () => tocarFrase(it, cartaEl); }
        $$('[data-leccion]', cartaEl).forEach((b) => { b.onclick = () => abrirHojaGramatica(b.dataset.leccion); });
      } else {
        cartaEl.innerHTML = frente; cartaEl.classList.remove('dorso', 'fallo');
        gsap.set($$('.grande, .lectura-rev, .hueco', cartaEl), { clearProps: 'transform,opacity,filter,scale' });
        encajarCarta(v, marcador(kjs));
      }
    });
    volteada = aDorso; girando = false;
    v.classList.toggle('rep-dorso', aDorso);   // con el dorso a la vista, las opciones ya no hacen falta (la respuesta está en la carta)
    if (!aDorso) encajarVista(v);
    if (aDorso && !quieto()) gsap.fromTo($$('.dorso-der > *, .dorso-kanji > *, .dorso-gram > *', cartaEl), { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease: 'power3.out' });
    const b = $('#voltear', sol); if (b) b.firstChild.textContent = (volteada ? t('estudio.sol.ver_pregunta') : t('estudio.sol.voltear')) + ' ';
    if (aDorso) setTimeout(asomar, quieto() ? 0 : 450); // cuando el dorso ya ha entrado
  };
  const ayudaResuelta = (c) => {
    const partes = [t('estudio.ayuda.siguiente', { k: kbd('Intro') }), t('estudio.ayuda.vuelta', { k: kbd('V') }), gram ? t('estudio.ayuda.leccion', { k: kbd('F') }) : t('estudio.ayuda.lamina', { k: kbd('F') })];
    if (kjs.size || it.tipo === 'kanji') partes.push(t('estudio.ayuda.kanji', { k: kbd('K') }));
    if (it.audio && !gram) partes.push(t('estudio.ayuda.escuchar', { k: kbd('R') }));
    if (it.audio_frase) partes.push(t('estudio.ayuda.frase', { k: kbd('E') }));
    if (!c.ok && resultado?.corregible) partes.push(t('estudio.ayuda.errata', { k: kbd('Retroceso') }));
    if (ctx.cambiarModo) partes.push(t('estudio.ayuda.modo', { k: kbd('M') }));
    $('.ayuda-rep', v).innerHTML = partes.join(' · ');
  };
  const resolver = async (c) => {
    estadoP = 'evaluando'; ultimo = c; yaRespondido();
    if (noSeBtn) { noSeBtn.disabled = true; gsap.to(noSeBtn, { opacity: 0, y: 6, duration: 0.25, onComplete: () => noSeBtn.classList.add('fuera') }); }
    const habia = !!nivelPendiente;
    resultado = await ctx.registrar(c.ok, performance.now() - t0, { ...c, formato: ctx.formato });
    estadoP = 'resuelto'; preguntando = false;
    if (habia) setTimeout(soltarNivel, 900); // la subida de nivel que esperaba a que terminaras de escribir
    if (gram) llenarHueco(c.ok);
    revelar(c.ok);
    if (c.ok) {
      if (kjs.size && !ctx.escucha) encajarCarta(v, marcador(kjs));
      selloEn(cartaEl, resultado?.sube ? '昇' : '正');
      giroAcierto(cartaEl, !!resultado?.sube);
      if (resultado?.sube) subirMaterial(cartaEl, resultado.rango);
      arreglar(cartaEl);
      if (c.gemelo && inp) flotarSobre(inp, c.gemelo, 'var(--bien)');
      else if (c.exacto === false && inp) flotarSobre(inp, t('estudio.casi', { con: c.con }), 'var(--bien)');
      sol.innerHTML = `<div class="sol-acciones"><button class="enlace" id="voltear">${t('estudio.sol.voltear')} ${kbd('V')}</button></div>`;
      asomar();
    } else if (c.medio) {
      selloEn(cartaEl, '半', 'var(--aviso)');   // medio punto: no es un fallo, pero vuelve antes y se explica
      setTimeout(() => voltear(true), 330);
      sol.innerHTML = notaMedio(it, c.medio, inp?.value) + `<div class="sol-acciones"><button class="enlace" id="voltear">${t('estudio.sol.ver_pregunta')} ${kbd('V')}</button><button class="enlace" id="ver-l">${t('estudio.sol.ver_lamina')} ${kbd('F')}</button></div>`;
      $('#ver-l', sol).onclick = ctx.verLamina;
    } else {
      son.fallo(); mini?.apenado();
      selloEn(cartaEl, '再', 'var(--acento)');   // «otra vez»: vuelve dentro de un rato
      if (!quieto()) gsap.fromTo(cartaEl, { x: -10 }, { x: 0, duration: 0.3, ease: 'power2.out' });
      setTimeout(() => voltear(true), eligiendo ? 480 : 330);
      sol.innerHTML = `<div class="sol-acciones"><button class="enlace" id="voltear">${t('estudio.sol.ver_pregunta')} ${kbd('V')}</button><button class="enlace" id="ver-l">${gram ? t('estudio.sol.repasar_leccion') : t('estudio.sol.ver_lamina')} ${kbd('F')}</button>${resultado?.corregible ? `<button class="enlace" id="corregir">${t('estudio.sol.corregir')} ${kbd('Retroceso')}</button>` : ''}</div>`;
      $('#ver-l', sol).onclick = ctx.verLamina;
      if ($('#corregir', sol)) $('#corregir', sol).onclick = corregir;
    }
    $('#voltear', sol).onclick = () => voltear();
    gsap.fromTo(sol.children, { y: 12, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.06, duration: 0.4, delay: c.ok ? 0.3 : 0.9 });
    ayudaResuelta(c);
    if (hab === 'lec' && it.tipo === 'vocab' && it.audio && !ctx.escucha) tocar(it.audio);
    if (ctx.escucha && it.audio) tocar(it.audio);
  };
  const corregir = async () => {
    if (!resultado?.corregible) return;
    resultado.corregible = false;
    const cc = await resultado.corregir();
    ultimo = { ...ultimo, ok: true };
    inp?.classList.replace('mal', 'bien');
    if (volteada) await voltear(false);
    const h = $('.gram-frase .hueco', cartaEl); if (h) h.classList.replace('mal', 'bien');
    sol.innerHTML = `<div class="sol-acciones"><button class="enlace" id="voltear">${t('estudio.sol.voltear')} ${kbd('V')}</button></div>`;
    $('#voltear', sol).onclick = () => voltear();
    selloEn(cartaEl, cc?.sube ? '昇' : '正'); giroAcierto(cartaEl, !!cc?.sube);
    ayudaResuelta({ ok: true });
  };
  // «No lo sé»: cuenta como fallo y enseña la respuesta
  const noLoSe = () => {
    if (estadoP !== 'preguntando') return;
    if (eligiendo) {
      const buena = ops[ctx.opciones.buena];
      ops.forEach((x) => { x.setAttribute('aria-disabled', 'true'); x.classList.add('cerrada'); if (x !== buena) x.classList.add('apagada'); });
      setTimeout(() => { buena?.classList.add('bien'); if (buena) gsap.fromTo(buena, { scale: 0.94 }, { scale: 1.04, duration: 0.25, yoyo: true, repeat: 1, ease: 'power2.out' }); }, 180);
    } else if (inp) { inp.value = ''; inp.placeholder = t('estudio.no_se'); inp.readOnly = true; inp.classList.add('mal'); }
    if (noSeBtn && !quieto()) gsap.fromTo(noSeBtn, { scale: 0.9 }, { scale: 1, duration: 0.3, ease: 'back.out(3)' });
    resolver({ ok: false, noSe: true });
  };
  if (noSeBtn) noSeBtn.onclick = noLoSe;
  if (form) form.onsubmit = async (e) => {
    e.preventDefault();
    if (estadoP === 'resuelto') return ctx.siguiente();
    if (estadoP !== 'preguntando') return;
    const valor = enKana ? aKana(inp.value, true) : inp.value;
    if (!valor.trim()) {
      flotarSobre(inp, t('estudio.escribe_algo', { k: '0' }), 'var(--tinta-2)');
      if (noSeBtn && !quieto()) gsap.fromTo(noSeBtn, { y: 0 }, { y: -6, duration: 0.12, yoyo: true, repeat: 3, ease: 'power1.inOut' });
      return;
    }
    const c = gram ? comprobarGram(g, valor) : comprobarTarjeta(it, hab, valor, !!ctx.escucha);
    if (c.aviso) { gsap.fromTo(inp, { x: -8 }, { x: 0, duration: 0.4, ease: 'elastic.out(1, 0.3)' }); flotarSobre(inp, c.aviso, 'var(--acento)'); return; }
    inp.value = valor; inp.readOnly = true;
    inp.classList.add(c.ok ? 'bien' : c.medio ? 'medio' : 'mal');
    await resolver(c);
  };
  const elegir = (k) => {
    if (estadoP !== 'preguntando' || !ops[k]) return;
    const o = ctx.opciones.opciones[k], b = ops[k], buena = ops[ctx.opciones.buena];
    ops.forEach((x) => { x.setAttribute('aria-disabled', 'true'); x.classList.add('cerrada'); if (x !== b && x !== buena) x.classList.add('apagada'); });
    b.classList.add('elegida', o.ok ? 'bien' : 'mal');
    if (o.ok) {
      gsap.fromTo(b, { scale: 1 }, { scale: 1.07, duration: 0.14, yoyo: true, repeat: 1, ease: 'power2.out' });
      gsap.fromTo(b, { '--brillo': 1 }, { '--brillo': 0, duration: 1.2, ease: 'power2.out' });
    } else {
      gsap.fromTo(b, { x: -12 }, { x: 0, duration: 0.6, ease: 'elastic.out(1.1, 0.25)' });
      setTimeout(() => { buena.classList.add('bien'); gsap.fromTo(buena, { scale: 0.94 }, { scale: 1.05, duration: 0.25, yoyo: true, repeat: 1, ease: 'power2.out' }); gsap.fromTo(buena, { '--brillo': 1 }, { '--brillo': 0, duration: 1.4 }); }, 260);
    }
    resolver({ ok: o.ok, exacto: o.ok });
  };
  ops.forEach((b) => { b.onclick = () => elegir(+b.dataset.k); });
  cartaEl.addEventListener('click', (e) => { if (estadoP === 'resuelto') alPulsarKanji(e); });

  sesion = { tecla: (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key, enInput = inp && e.target === inp;
    if (kjEspera && teclaK(e, cartaEl)) return;
    if (escribiendo(e)) { // solo la casilla de respuesta mientras escribes
      if (!enInput) return;
      if ((k === 'ArrowDown' || k === 'ArrowUp') && !inp.value && ctx.cambiarModo) { e.preventDefault(); ctx.cambiarModo(k === 'ArrowDown' ? 1 : -1); }
      else if (k === ' ' && !inp.value && ctx.escucha) { e.preventDefault(); tocar(it.audio, $('.altavoz', v)); }
      else if (k === '0' && !inp.value.trim()) { e.preventDefault(); noLoSe(); }
      return;
    }
    const l = k.length === 1 ? k.toLowerCase() : k;
    if (k === 'Enter') {
      if (enInput) return; // lo hace el formulario
      if (estadoP === 'resuelto' && (!sobreControl(e) || e.target.closest('.opcion, .no-se'))) { e.preventDefault(); ctx.siguiente(); }
      return;
    }
    if (k === '0' || (l === 'n' && eligiendo)) { e.preventDefault(); noLoSe(); return; }
    if (eligiendo && /^[1-9]$/.test(k)) { e.preventDefault(); if (estadoP === 'preguntando') elegir(+k - 1); return; }
    if (l === 'k') { // K = los kanji de esta carta (no te saca del repaso)
      e.preventDefault();
      if (estadoP === 'resuelto') teclaK(e, cartaEl, { propio: it.tipo === 'kanji' ? it.caracter : null });
      else if (kjs.size || it.tipo === 'kanji') flotarSobre(cartaEl, t('estudio.kj.primero', { k: 'K' }), 'var(--tinta-2)');
      return;
    }
    if (l === 'v') { e.preventDefault(); if (estadoP === 'resuelto') voltear(); return; }
    if (l === 'm' && ctx.cambiarModo) { e.preventDefault(); ctx.cambiarModo(e.shiftKey ? -1 : 1); return; }
    if (l === 'f') { e.preventDefault(); if (estadoP === 'resuelto') ctx.verLamina(); return; }
    if (l === 'r') { e.preventDefault(); if (estadoP === 'resuelto' || ctx.escucha) tocar(it.audio, $('.altavoz', v) || $('[data-audio]', cartaEl)); return; }
    if (l === 'e') { e.preventDefault(); if (estadoP === 'resuelto') tocarFrase(it, cartaEl); return; }
    if (k === 'Backspace') { e.preventDefault(); if (estadoP === 'resuelto') corregir(); }
  } };
  return { get estado() { return estadoP; } };
}

// lámina completa encima de la pregunta (F o Esc la cierran); en gramática, la hoja de su lección
function verLaminaEmergente(it) {
  if (it.tipo === 'gramatica') { const slug = datosGram(it).slug; if (slug) abrirHojaGramatica(slug); return; }
  const capaL = document.createElement('div');
  capaL.className = 'capa-lamina'; capaL.setAttribute('role', 'dialog'); capaL.setAttribute('aria-modal', 'true'); capaL.setAttribute('aria-label', t('estudio.lamina.completa'));
  capaL.tabIndex = -1; capaL.setAttribute('data-foco-capa', '');
  capaL.innerHTML = `<div class="capa-lamina-cab"><button class="volver" id="cerrar-l">${t('comun.cerrar')} ${kbd('Esc')}</button></div>` + lamina(it);
  document.body.appendChild(capaL); enlazarLamina(capaL); animarLamina(capaL, 1, it);
  capaL.addEventListener('click', alPulsarKanji);
  const cerrar = () => { cancelarK(); capaL.remove(); removeEventListener('keydown', tecla); $('#resp', V())?.focus(); };
  const tecla = (e) => {
    if (fichaAbierta || capaAbierta() !== capaL || e.ctrlKey || e.metaKey || e.altKey) return; // la hoja de gramática abierta encima tiene sus teclas
    if (teclaK(e, capaL, { propio: it.tipo === 'kanji' ? it.caracter : null })) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (k === 'Escape' || k === 'f') { e.preventDefault(); cerrar(); }
    else if (k === 'r') { e.preventDefault(); $('[data-audio]', capaL)?.click(); }
    else if (k === 'e') { e.preventDefault(); $$('[data-audio]', capaL)[1]?.click(); }
  };
  $('#cerrar-l', capaL).onclick = cerrar; setTimeout(() => addEventListener('keydown', tecla), 50);
}

// ───────────────────────── LECCIÓN ─────────────────────────
let regionLeccion = null; // la lección de una región (desde el camino): «Otra lección» sigue en ella
async function leccion(region = null) {
  fase = 'leccion'; regionLeccion = region; preguntando = false;
  // el pool: opciones de la prueba y el español de «Lo verás en»
  const [d] = await Promise.all([api('/api/leccion' + (region != null ? `?region=${encodeURIComponent(region)}` : '')), conPool()]);
  if (!d.items.length) {
    const conRegion = region != null;
    V().innerHTML = cabecera(t('estudio.leccion.sin')) + `<p class="vacio-papel">${conRegion ? t('estudio.leccion.sin_region') : t('estudio.leccion.sin_todo')}</p>
      <div class="pie-accion">${conRegion ? `<button class="boton-claro" data-volver>${t('estudio.volver_camino')} ${kbd('Esc')}</button><button class="boton-tinta" id="a-practica" data-foco>${t('estudio.leccion.entrenar')} ${kbd('Intro')}</button>`
        : `<button class="boton-tinta" data-volver>${t('estudio.volver_mochi')} ${kbd('Intro')}</button>`}</div>`;
    const seguir = () => { location.hash = conRegion ? `estudio/practica/${region}` : salida; };
    if ($('#a-practica', V())) $('#a-practica', V()).onclick = seguir;
    sesion = { tecla: (e) => { if (e.key === 'Enter' && !sobreControl(e)) { e.preventDefault(); seguir(); } } };
    return;
  }
  // una clase de Nyan que estas palabras ya necesitan: se propone antes (una vez por sesión si dices «luego»)
  if (d.clase_antes && !sessionStorage.getItem('nyango.clase.luego.' + d.clase_antes.id)) {
    const ir = await confirmar({ titulo: t('estudio.clase_antes.tit', { n: d.clase_antes.clase }), texto: t('estudio.clase_antes.texto', { titulo: esc(d.clase_antes.titulo) }),
      si: t('estudio.clase_antes.ir'), no: t('estudio.clase_antes.luego'), sello: '文' });
    if (ir) { location.hash = 'clase/' + d.clase_antes.id; return; }
    try { sessionStorage.setItem('nyango.clase.luego.' + d.clase_antes.id, '1'); } catch (e) { /* nada */ }
  }
  const conocidas = new Set(d.ya_sabidas);
  const items = d.items;
  let i = 0;
  const pintar = (dir = 1) => {
    const it = items[i];
    cancelarK();
    V().innerHTML = cabecera(`<div class="progreso-lec">${items.map((_, k) => `<i class="${k < i ? 'hecho' : k === i ? 'aqui' : ''}"></i>`).join('')}</div>`,
      `<span>${d.region ? esc(d.region.jp + ' · ' + d.region.nombre) : ''}</span>`) + lamina(it, { conocida: conocidas.has(it.id) }) +
      `<div class="pie-accion">${i ? `<button class="boton-claro" id="atras">${kbd('←')} ${t('estudio.leccion.atras')}</button>` : ''}<button class="boton-tinta" id="adelante">${i < items.length - 1 ? t('estudio.leccion.siguiente') : t('estudio.leccion.a_prueba')} ${kbd('Espacio')}</button></div>`;
    enlazarLamina(V()); animarLamina(V(), dir, it); son.papel();
    $('#adelante', V()).onclick = avanzar; if ($('#atras', V())) $('#atras', V()).onclick = retroceder;
    if (it.tipo === 'vocab' && it.audio && estado.inicio?.ajustes?.autoplay !== false) setTimeout(() => tocar(it.audio, $('[data-audio]', V())), 500);
    V().scrollTo(0, 0);
    // Nyan mira las láminas desde su pupitre: al empezar y, de vez en cuando, pregunta por la palabra
    if (i === 0 && dir === 1 && !visto.has(0)) setTimeout(() => { if (fase === 'leccion') nyanLeccion('inicio'); }, 1600);   // cuando ya se le ve
    else if (!visto.has(i) && Math.random() < 0.35) nyanLeccion('lamina', it);
    visto.add(i);
  };
  const visto = new Set();
  const avanzar = () => { if (i < items.length - 1) { i++; pintar(1); } else prueba(items.filter((it) => !conocidas.has(it.id)), items); };
  const retroceder = () => { if (i > 0) { i--; pintar(-1); } };
  sesion = { tecla: (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || escribiendo(e)) return;
    if (teclaK(e, V(), { propio: items[i].tipo === 'kanji' ? items[i].caracter : null })) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if ((k === 'Enter' || k === ' ') && sobreControl(e)) return; // el botón con foco hace lo suyo
    if (k === ' ' || k === 'ArrowRight' || k === 'Enter') { e.preventDefault(); avanzar(); }
    else if (k === 'ArrowLeft') { e.preventDefault(); retroceder(); }
    else if (k === 'r') { e.preventDefault(); $('[data-audio]', V())?.click(); }
    else if (k === 'e') { e.preventDefault(); $$('[data-audio]', V())[1]?.click(); }
  } };
  pintar();
}

// prueba de la lección (siempre en Mixto): cada habilidad hasta acertarla; lo fallado vuelve a la cola
async function prueba(items, todos) {
  fase = 'prueba';
  const cola = [];
  items.forEach((it) => it.habilidades.forEach((h) => cola.push({ it, hab: h })));
  cola.sort(() => Math.random() - 0.5);
  const fallos = {}, total = cola.length;
  let hechas = 0;
  const st = cuenta = { hechas: 0, bien: 0, racha: 0, mejor: 0, lecciones: 0, cerrada: false };
  const siguiente = async () => {
    if (!cola.length) return pillaANyan(todos, () => terminarLeccion(items, fallos, st));
    const q = cola[0], { it, hab } = q;
    let formato = formatoMixto(0), opciones = null;
    if (formato === 'elegir') { await conPool(); opciones = armarOpciones(it, hab); if (!opciones) formato = 'escribir'; }
    if (fase !== 'prueba') return;
    V().innerHTML = cabecera(`<div class="progreso-lec">${Array.from({ length: total }, (_, k) => `<i class="${k < hechas ? 'hecho' : k === hechas ? 'aqui' : ''}"></i>`).join('')}</div>`, `<span>${t('estudio.prueba.cab', { modo: modoDe('mixto').nombre })}</span>`) +
      `<div class="ruedo">${carta(it, hab, null, { formato, opciones })}</div>`;
    montarPregunta(it, hab, {
      formato, opciones, siguiente, verLamina: () => verLaminaEmergente(it),
      registrar: async (ok, ms, c) => {
        const k = cola.indexOf(q); if (k >= 0) cola.splice(k, 1);
        const rachaAntes = st.racha;
        st.hechas++;
        if (ok) { hechas++; st.bien++; st.racha++; st.mejor = Math.max(st.mejor, st.racha); son.acierto(st.racha); }
        else if (c?.medio) { hechas++; st.bien += 0.5; fallos[it.id] = Math.max(fallos[it.id] || 0, 1); }   // medio punto: sigue, pero la tarjeta vuelve antes
        else { fallos[it.id] = (fallos[it.id] || 0) + 1; cola.splice(Math.min(cola.length, 3), 0, q); st.racha = 0; }
        const hito = efectoCombo(st.racha);
        cara(c?.medio ? 'pensando' : !ok ? 'triste' : hito >= 10 ? 'estrella' : hito ? 'risa' : 'feliz', ok ? 1400 : 1800);
        return { ok, corregible: !ok && !c?.medio && formato !== 'elegir' && !c?.noSe, corregir: async () => {
          fallos[it.id] = Math.max(0, (fallos[it.id] || 1) - 1);
          const j = cola.indexOf(q); if (j >= 0) cola.splice(j, 1);
          hechas++; st.bien++; st.racha = rachaAntes + 1; st.mejor = Math.max(st.mejor, st.racha);
          son.acierto(st.racha); efectoCombo(st.racha); cara('feliz', 1200);
          const p = $$('.progreso-lec i', V()); p.forEach((x, n) => { x.className = n < hechas ? 'hecho' : n === hechas ? 'aqui' : ''; });
        } };
      },
    });
  };
  siguiente();
}
// ── Pilla a Nyan: al acabar la prueba, Nyan intenta decir la frase de una palabra de la lección
// (en su bocadillo y en voz alta, error incluido) y a veces se equivoca de palabra. Tú decides si está bien y, si no, eliges
// la buena. Cada ronda acaba con la frase correcta y su audio: nunca se queda una forma mal a la vista.
const negritaDe = (it) => (it.frase_furigana || '').match(/<b>(.*?)<\/b>/)?.[1] ?? null;
function frasesParaPillar(todos) {
  // la palabra tiene que salir tal cual en su frase (sin conjugar): así, al cambiarla por otra, la frase sigue teniendo forma
  return todos.filter((it) => it.tipo === 'vocab' && it.frase_es && negritaDe(it) != null && sinFurigana(negritaDe(it)) === it.palabra);
}
function pillaANyan(todos, seguir) {
  const vale = frasesParaPillar(todos);
  if (vale.length < 2) return seguir();
  const rondas = [...vale].sort(() => Math.random() - 0.5).slice(0, 2);
  let r = 0;
  const ronda = () => {
    if (r >= rondas.length) return seguir();
    const it = rondas[r++];
    const otras = vale.filter((o) => o.palabra !== it.palabra);
    // Nyan dice su frase en voz alta: si se equivoca, con la palabra equivocada (audio hecho con herramientas/mazo/audio.py);
    // si de esa pareja no hay audio, se oye al final, ya corregida
    const azar = (xs) => xs[Math.floor(Math.random() * xs.length)];
    const conVoz = otras.filter((o) => it.pilla?.[o.palabra]);
    const intruso = Math.random() < 0.7 ? (conVoz.length ? azar(conVoz) : azar(otras)) : null;
    const vozNyan = intruso ? it.pilla?.[intruso.palabra] : it.audio_frase;
    const buena = it.frase_furigana;
    const dicha = intruso ? buena.replace(/<b>.*?<\/b>/, `<b>${intruso.furigana || intruso.palabra}</b>`) : buena;
    let hecho = false, eligiendo = null;
    V().innerHTML = cabecera(`<span class="pilla-cab">${t('estudio.pilla.titulo')}</span>`, `<span>${r} / ${rondas.length}</span>`) +
      `<div class="ruedo"><div class="carta-rep pilla"><span class="tipo">${t('estudio.pilla.titulo')}</span>
        <div class="pilla-quiere">${t('estudio.pilla.quiere')}<b>«${esc(it.frase_es)}»</b></div>
        <div class="pilla-dice">${t('estudio.pilla.dice')}</div>
        <div class="pilla-bocadillo"><div class="frase-jp pilla-frase" lang="ja">${ruby(dicha)}</div></div>
        ${vozNyan ? `<button class="boton-audio pilla-oir" type="button">▶ ${t('estudio.pilla.otra_vez')} ${kbd('E')}</button>` : ''}</div>
        <div class="cinta sig pilla-cinta">${t('estudio.pilla.pregunta')}</div>
        <div class="opciones-rep pilla-op" role="group">${[['bien', 'estudio.pilla.bien'], ['mal', 'estudio.pilla.mal']].map(([v, k], n) => `<button class="opcion" data-v="${v}">${kbd(n + 1)}<span class="es">${t(k)}</span></button>`).join('')}</div>
        <div class="solucion" id="pilla-sol" aria-live="polite"></div></div>
      <div class="pie-accion"><button class="boton-tinta" id="pilla-seguir" hidden>${t('estudio.pilla.seguir')} ${kbd('Intro')}</button></div>`;
    son.papel(); cara('feliz', 1200);
    const oir = () => { if (!vozNyan || hecho) return; tocar(vozNyan); karaoke($('.pilla-frase', V()), audio); };
    if (vozNyan && estado.inicio?.ajustes?.autoplay !== false) setTimeout(oir, 450);
    $('.pilla-oir', V())?.addEventListener('click', oir);
    const cerrar = (ok, clave) => {
      hecho = true;
      $('.pilla-op', V()).innerHTML = '';
      $('.pilla-frase', V()).innerHTML = ruby(buena); // la de Nyan se sustituye por la buena
      $('.pilla-dice', V()).textContent = t('estudio.pilla.asi');
      $('.pilla-cinta', V()).hidden = true;
      $('#pilla-sol', V()).innerHTML = `<div class="pilla-res ${ok ? 'bien' : 'mal'}">${t(clave, { mala: intruso ? esc(intruso.palabra) : '', buena: esc(it.palabra) })}</div>`;
      if (ok) { son.acierto(1); cara('risa', 1600); } else { son.fallo(); cara('triste', 1600); }
      $('.pilla-bocadillo', V()).classList.add('corregido');
      $('.pilla-oir', V())?.remove();
      if (it.audio_frase && (intruso || !vozNyan)) setTimeout(() => tocarFrase(it, V()), 350); // la buena, si no la acaba de oír
      const b = $('#pilla-seguir', V()); b.hidden = false; b.onclick = ronda; b.focus({ preventScroll: true });
    };
    const elegirBuena = () => {
      const resto = otras.filter((o) => o !== intruso).sort(() => Math.random() - 0.5);
      eligiendo = [it, intruso, ...resto].slice(0, 3).sort(() => Math.random() - 0.5);
      $('.pilla-cinta', V()).textContent = t('estudio.pilla.cual');
      const op = $('.pilla-op', V());
      op.classList.toggle('tres', eligiendo.length === 3);
      op.innerHTML = eligiendo.map((o, n) => `<button class="opcion" data-o="${n}">${kbd(n + 1)}<span lang="ja">${ruby(o.furigana || o.palabra)}</span></button>`).join('');
      $$('.opcion', op).forEach((b) => { b.onclick = () => { const o = eligiendo[+b.dataset.o]; cerrar(o === it, o === it ? 'estudio.pilla.pillado' : 'estudio.pilla.otra'); }; });
    };
    const responder = (v) => {
      if (hecho || eligiendo) return;
      if (v === 'bien') cerrar(!intruso, intruso ? 'estudio.pilla.colado' : 'estudio.pilla.acierto_bien');
      else if (intruso) elegirBuena();
      else cerrar(false, 'estudio.pilla.era_bien');
    };
    $$('.pilla-op .opcion', V()).forEach((b) => { b.onclick = () => responder(b.dataset.v); });
    sesion = { tecla: (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || escribiendo(e)) return;
      if (hecho) { if (e.key === 'Enter' && !sobreControl(e)) { e.preventDefault(); ronda(); } else if (e.key.toLowerCase() === 'e') { e.preventDefault(); tocarFrase(it, V()); } return; }
      if (e.key.toLowerCase() === 'e') { e.preventDefault(); oir(); return; }
      const n = Number(e.key);
      if (eligiendo && n >= 1 && n <= eligiendo.length) { e.preventDefault(); $$('.pilla-op .opcion', V())[n - 1]?.click(); }
      else if (!eligiendo && (n === 1 || n === 2)) { e.preventDefault(); responder(n === 1 ? 'bien' : 'mal'); }
    } };
  };
  ronda();
}
async function terminarLeccion(items, fallos, st) {
  fase = 'fin'; preguntando = false;
  const r = await api('/api/aprender', { items: items.map((it) => ({ id: it.id, fallos: fallos[it.id] || 0 })) });
  limpiarCombo();
  // la barra parte del XP de antes (los orbes la llenan luego), pero el total ya es el nuevo: «Siguiente meta» del botín lo usa
  if (r.xp_total != null) { ponerXP(r.xp_total - r.xp); xpVuela(null, 0, r.xp_total); }
  son.fanfarria(); cara('risa', 2500); mini?.celebrar(); setTimeout(() => nyanLeccion('fin'), 1400);
  V().innerHTML = cabecera('', htmlBarraXP()) + `<div class="ruedo rc-final fin-tablero"><div class="fin-rejilla">
    <div class="fin-col"><section class="fin-res leccion rc-ficha">
      <div class="rc-final-ante">${t('estudio.fin.leccion')}</div>
      <h2 class="rc-final-tit">${tn('estudio.fin.fichas', items.length)}</h2>
      <div class="chips" style="justify-content:center">${items.map((it) => `<span class="chip-k"><b>${esc(caracter(it))}</b>${esc(it.tipo === 'vocab' ? it.es || it.en : it.tipo === 'kanji' ? it.clave : it.nombre)}</span>`).join('')}</div>
      <div class="rc-logo l rc-final-xp" id="xp-ganada">+0 XP</div>
      <p class="rc-final-nota">${t('estudio.fin.nota')}</p></section></div>
    <div class="fin-col"><div id="rc-fin-slot"></div></div></div></div>
    <div class="pie-accion"><button class="boton-claro" data-volver>${t('estudio.volver')} ${kbd('Esc')}</button><button class="boton-tinta" id="otra">${t('estudio.fin.otra')} ${kbd('Intro')}</button></div>`;
  gsap.fromTo($$('.chip-k', V()), { y: 30, opacity: 0, scale: 0.7 }, { y: 0, opacity: 1, scale: 1, stagger: 0.05, duration: 0.5, ease: 'back.out(2)' });
  const xpEl = $('#xp-ganada', V());
  gsap.fromTo(xpEl, { scale: 0.3, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, delay: 0.5, ease: 'back.out(2.6)' });
  setTimeout(() => { contar(xpEl, 0, r.xp, 0.8, (v) => `+${mil(v)} XP`); xpVuela(xpEl, r.xp, r.xp_total); }, 700);
  quizaNivel(r, 1900);
  $('#otra', V()).onclick = () => leccion(regionLeccion);
  sesion = { tecla: (e) => { if (e.key === 'Enter' && !sobreControl(e)) { e.preventDefault(); leccion(regionLeccion); } } };
  st.lecciones = 1; st.cerrada = true;
  encajarFin();
  finSesion({ contenedor: $('#rc-fin-slot', V()), respuestas: st.hechas, aciertos: Math.floor(st.bien), mejor_racha: st.mejor, lecciones: 1, gramatica: 0 }).then(() => encajarFin());
}

// ───────────────────────── QUÉ REPASAR ─────────────────────────
function htmlModos(modo) {
  return `<div class="modos" role="radiogroup" aria-label="${t('estudio.modos.aria')}">${MODOS.map((m) => `<button class="modo ${m.id === modo ? 'si' : ''}" role="radio" data-modo="${m.id}" aria-checked="${m.id === modo}" tabindex="${m.id === modo ? 0 : -1}" title="${esc(m.desc)}"><b>${m.jp}</b>${m.nombre}</button>`).join('')}<span class="modos-k">${kbd('M')}</span></div>`;
}
// pendientes por tipo (y por habilidad si hay que contarlas aquí)
async function cuentasRepaso() {
  try { estado.inicio = await api('/api/inicio'); } catch {}
  const cr = estado.inicio?.cuenta_repaso;
  if (cr) return { tipo: { vocab: 0, kanji: 0, radical: 0, gramatica: 0, ...cr }, hab: null };
  const l = await api('/api/repaso?n=3000');
  const tipo = { vocab: 0, kanji: 0, radical: 0, gramatica: 0 }, hab = {};
  l.forEach((q) => { const t = q.item?.tipo; tipo[t] = (tipo[t] || 0) + 1; hab[`${t}:${q.habilidad}`] = (hab[`${t}:${q.habilidad}`] || 0) + 1; });
  return { tipo, hab };
}
async function elegirRepaso() {
  fase = 'filtro'; salida = 'inicio';
  const { tipo: cuentas, hab } = await cuentasRepaso();
  if (fase !== 'filtro') return;
  const total = Object.values(cuentas).reduce((a, b) => a + b, 0);
  if (!total) return nadaQueRepasar();
  let f = filtroActual(), modo = modoActual();
  // cuántas entran con esta elección (exacto si se han contado aquí; si no, «hasta»)
  const cuantas = () => {
    let n = 0, aprox = false;
    f.tipos.forEach((t) => {
      if (t === 'gramatica' || !hab) { n += cuentas[t] || 0; if (t !== 'gramatica' && f.habilidades.length < HABS_REPASO.length) aprox = true; }
      else f.habilidades.forEach((h) => { n += hab[`${t}:${h}`] || 0; });
    });
    return { n, aprox };
  };
  V().innerHTML = cabecera(`<div class="fr-cab"><b>稽古</b>${t('estudio.filtro.cab')}</div>`, `<span>${tn('estudio.filtro.pendientes', total, { n: `<b>${mil(total)}</b>` })}</span>`) + `
    <div class="fr-ruedo">
      <div class="fr-intro"><h2>${t('estudio.filtro.tit')}</h2><p>${t('estudio.filtro.p')}</p></div>
      <div class="fr-tipos" role="group" aria-label="${t('estudio.filtro.tipos_aria')}">${TIPOS_REPASO.map((tp) => {
        const n = cuentas[tp.id] || 0;
        return `<button class="fr-tipo t-${tp.id}" data-tipo="${tp.id}" aria-pressed="${f.tipos.includes(tp.id)}" ${n ? '' : 'data-cero'}>
          ${kbd(tp.tecla)}<span class="fr-check" aria-hidden="true">✓</span><span class="fr-glifo" lang="ja">${tp.jp}</span>
          <span class="fr-nombre">${tp.nombre}</span><span class="fr-n">${n ? tn('estudio.filtro.pendientes', n, { n: `<b>${mil(n)}</b>` }) : t('estudio.filtro.al_dia')}</span></button>`;
      }).join('')}</div>
      <div class="fr-fila">
        <div class="fr-habs" role="group" aria-label="${t('estudio.filtro.habs_aria')}">${HABS_REPASO.map((h) => `<button class="fr-hab" data-hab="${h.id}" aria-pressed="${f.habilidades.includes(h.id)}"><b lang="ja">${h.jp}</b>${h.nombre}${kbd(h.tecla)}</button>`).join('')}</div>
        <button class="fr-todo" id="fr-todo" aria-pressed="${esTodo(f)}">${t('estudio.filtro.todo')} ${kbd('T')}</button>
      </div>
      <div class="fr-modo"><span>${t('estudio.filtro.como')}</span>${htmlModos(modo)}</div>
      <p class="fr-nota">${t('estudio.filtro.nota_conj')}</p>
    </div>
    <div class="pie-accion"><button class="boton-claro" data-volver>${t('estudio.volver')} ${kbd('Esc')}</button><button class="boton-tinta" id="fr-empezar" data-foco>${t('estudio.filtro.empezar', { n: '<span id="fr-n">0</span>' })} ${kbd('Intro')}</button></div>`;
  const v = V(), empezarBtn = $('#fr-empezar', v), nEl = $('#fr-n', v);
  let nAntes = 0;
  const pintarN = () => {
    const { n, aprox } = cuantas();
    // una sesión son como mucho TOPE_REPASO tarjetas: «80 de 213 tarjetas»
    const txt = (x) => (x > TOPE_REPASO ? (aprox ? t('estudio.filtro.n_tope_hasta', { tope: mil(TOPE_REPASO), n: mil(x) }) : t('estudio.filtro.n_tope', { tope: mil(TOPE_REPASO), n: mil(x) }))
      : aprox ? tn('estudio.filtro.n_hasta', x) : tn('estudio.filtro.n', x));
    contar(nEl, nAntes, n, 0.45, txt); nAntes = n;
    empezarBtn.classList.toggle('vacio', !n);
  };
  const reflejar = () => {
    $$('.fr-tipo', v).forEach((b) => b.setAttribute('aria-pressed', f.tipos.includes(b.dataset.tipo)));
    $$('.fr-hab', v).forEach((b) => b.setAttribute('aria-pressed', f.habilidades.includes(b.dataset.hab)));
    $('#fr-todo', v).setAttribute('aria-pressed', esTodo(f));
    pintarN();
  };
  const rebote = (b, on) => {
    son.toque(); if (on) son.koto(son.escalon(TIPOS_REPASO.findIndex((t) => t.id === b.dataset.tipo) + 5, 62), 0, 0.3);
    if (quieto()) return;
    gsap.fromTo(b, { scaleX: 1.06, scaleY: 0.9 }, { scaleX: 1, scaleY: 1, duration: 0.6, ease: 'elastic.out(1, 0.35)', clearProps: 'scale' });
    const gl = $('.fr-glifo, b', b); if (gl && on) gsap.fromTo(gl, { rotate: -18, scale: 0.7 }, { rotate: -4, scale: 1, duration: 0.55, ease: 'back.out(3)', clearProps: 'scale' });
  };
  const alternar = (lista, id, b) => {
    const dentro = f[lista].includes(id);
    if (dentro && f[lista].length === 1) { // siempre queda al menos uno
      son.fallo(); if (!quieto()) gsap.fromTo(b, { x: -8 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
      flotarSobre(b, t('estudio.filtro.al_menos'), 'var(--tinta-2)'); return;
    }
    f = { ...f, [lista]: dentro ? f[lista].filter((x) => x !== id) : [...f[lista], id] };
    reflejar(); rebote(b, !dentro);
  };
  const todo = () => {
    f = filtroTodo(); reflejar(); son.subida(1);
    if (!quieto()) gsap.fromTo($$('.fr-tipo, .fr-hab', v), { y: 0 }, { y: -8, duration: 0.14, yoyo: true, repeat: 1, stagger: 0.04, ease: 'power2.out' });
  };
  const ponerModoF = (nuevo) => {
    if (nuevo === modo) return;
    modo = nuevo; ponerModo(nuevo);
    const g = $('.modos', v); g.outerHTML = htmlModos(modo); enlazarModosF();
    const b = $('.modo.si', v); if (b && !quieto()) gsap.fromTo(b, { scaleX: 1.18, scaleY: 0.8 }, { scaleX: 1, scaleY: 1, duration: 0.6, ease: 'elastic.out(1, 0.35)' });
    son.toque();
  };
  const enlazarModosF = () => $$('.modo', v).forEach((b) => { b.onclick = () => ponerModoF(b.dataset.modo); });
  const empezar = async () => {
    const { n } = cuantas();
    if (!n) { son.fallo(); gsap.fromTo(empezarBtn, { x: -10 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' }); flotarSobre(empezarBtn, t('estudio.filtro.nada'), 'var(--mal)'); return; }
    ponerFiltro(f);
    if (!quieto()) await gsap.to($$('.fr-tipo[aria-pressed="true"]', v), { y: -30, opacity: 0, scale: 0.9, duration: 0.3, stagger: 0.05, ease: 'power2.in' });
    repaso({ filtro: f });
  };
  $$('.fr-tipo', v).forEach((b) => { b.onclick = () => alternar('tipos', b.dataset.tipo, b); });
  $$('.fr-hab', v).forEach((b) => { b.onclick = () => alternar('habilidades', b.dataset.hab, b); });
  $('#fr-todo', v).onclick = todo;
  empezarBtn.onclick = empezar;
  enlazarModosF();
  pintarN();
  oirModo((e) => { if (fase === 'filtro' && e.detail !== modo) ponerModoF(e.detail); });
  // entrada: las fichas caen como cartas sobre el tatami
  if (!quieto()) {
    gsap.fromTo($$('.fr-intro > *', v), { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.07, ease: 'power3.out' });
    gsap.fromTo($$('.fr-tipo', v), { y: 60, opacity: 0, rotate: (i) => [-6, 4, -3, 5, -4][i], scale: 0.85 }, { y: 0, opacity: 1, rotate: 0, scale: 1, duration: 0.7, stagger: 0.08, delay: 0.12, ease: 'back.out(1.7)' });
    gsap.fromTo($$('.fr-fila > *, .fr-modo, .fr-nota', v), { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.06, delay: 0.45, ease: 'power3.out' });
    $$('.fr-tipo', v).forEach((b, i) => setTimeout(() => son.koto(son.escalon(i + 4, 62), 0, 0.14, (i - 2) / 5), 160 + i * 80));
  }
  sesion = { tecla: (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || escribiendo(e)) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const tp = TIPOS_REPASO.find((x) => x.tecla === k), h = HABS_REPASO.find((x) => x.tecla.toLowerCase() === k);
    if (tp) { e.preventDefault(); alternar('tipos', tp.id, $(`[data-tipo="${tp.id}"]`, v)); }
    else if (h) { e.preventDefault(); alternar('habilidades', h.id, $(`[data-hab="${h.id}"]`, v)); }
    else if (k === 't') { e.preventDefault(); todo(); }
    else if (k === 'm') { e.preventDefault(); ponerModoF(siguienteModo(modo, e.shiftKey ? -1 : 1)); }
    else if (k === 'Enter' && (!sobreControl(e) || e.target === empezarBtn)) { e.preventDefault(); empezar(); }
    else if (['ArrowLeft', 'ArrowRight'].includes(k) && e.target.closest?.('.fr-tipos, .fr-habs, .modos')) {
      e.preventDefault();
      const grupo = e.target.closest('.fr-tipos, .fr-habs, .modos');
      if (grupo.matches('.modos')) { ponerModoF(siguienteModo(modo, k === 'ArrowRight' ? 1 : -1)); $('.modo.si', v)?.focus(); return; }
      const bs = $$('button', grupo), i = bs.indexOf(e.target.closest('button'));
      bs[(i + (k === 'ArrowRight' ? 1 : -1) + bs.length) % bs.length]?.focus();
    }
  } };
}
async function nadaQueRepasar() {
  const f0 = fase;
  try { estado.inicio = await api('/api/inicio'); } catch {}
  if (fase !== f0) return;
  const px = estado.inicio?.proximo_repaso;
  V().innerHTML = cabecera(t('estudio.nada.tit'), '') + `<p class="vacio-papel">${t('estudio.nada.p')}</p>${px ? `<p class="vacio-cuando">${t('estudio.nada.proximo', { cuando: enCuanto(px) })}</p>` : ''}
    <div class="pie-accion"><button class="boton-claro" id="a-leccion">${t('estudio.nada.leccion')} ${kbd('L')}</button><button class="boton-tinta" data-volver>${t('estudio.volver_mochi')} ${kbd('Intro')}</button></div>`;
  $('#a-leccion', V()).onclick = () => { location.hash = 'estudio/leccion'; };
  sesion = { tecla: (e) => { if (e.key === 'Enter' && !sobreControl(e)) { e.preventDefault(); location.hash = salida; } } };
}

// ───────────────────────── REPASO ─────────────────────────
// filtro: qué tarjetas (null = todo) · practica: entrenar una región con lo ya aprendido (no cambia la memoria)
async function repaso({ filtro = null, region = null, practica = false, recordar = true } = {}) {
  fase = 'repaso'; salida = practica ? 'camino' : 'inicio';
  const parcial = !!filtro && !esTodo(filtro), tope = practica ? TOPE_PRACTICA : TOPE_REPASO;
  // con filtro se piden más y se recortan aquí (por si el servidor aún no filtra por tipo)
  const qs = new URLSearchParams({ n: String(parcial ? 600 : tope) });
  if (parcial) {
    qs.set('tipos', filtro.tipos.join(','));
    qs.set('habilidades', filtro.habilidades.join(',')); // la gramática («uso») entra por su tipo
  }
  if (region != null) qs.set('region', region);
  if (practica) qs.set('practica', '1');
  if (!recordar) qs.set('recordar', '0');   // un atajo (solo conjugación) no cambia el filtro que tienes guardado
  let lista = await api('/api/repaso?' + qs);
  if (filtro) lista = lista.filter((q) => pasaFiltro(q, filtro)).slice(0, tope);
  conPool();
  if (!lista.length) {
    if (!practica) return nadaQueRepasar();
    V().innerHTML = cabecera(t('estudio.practica'), '') + `<div class="ruedo"><div class="carta-rep vacia"><div class="vacia-jp">練</div>
      <h2>${t('estudio.practica.vacia')}</h2><p>${t('estudio.practica.vacia_p')}</p>
      <div class="vacia-acciones"><button class="boton-tinta" data-foco id="a-leccion">${t('estudio.practica.leccion')} ${kbd('Intro')}</button><button class="boton-claro" data-volver>${t('estudio.volver_camino')} ${kbd('Esc')}</button></div></div></div>`;
    const ir = () => { location.hash = `estudio/leccion/${region ?? ''}`; };
    $('#a-leccion', V()).onclick = ir;
    sesion = { tecla: (e) => { if (e.key === 'Enter' && !sobreControl(e)) { e.preventDefault(); ir(); } } };
    return;
  }
  // significado y lectura de un mismo item nunca seguidos
  const pendientes = lista.slice();
  for (let k = 1; k < pendientes.length; k++) if (pendientes[k].item.id === pendientes[k - 1].item.id) { const j = (k + 3) % pendientes.length; [pendientes[k], pendientes[j]] = [pendientes[j], pendientes[k]]; }
  const st = cuenta = { hechas: 0, bien: 0, xp: 0, racha: 0, mejor: 0, subidas: 0, lecciones: 0, cerrada: false, practica, filtro, bienIt: [], malIt: [] };
  if (!estado.inicio) estado.inicio = await api('/api/inicio').catch(() => null);
  ponerXP(Math.max(xpActual(), estado.inicio?.xp || 0));
  let modo = modoActual(), actual = null;
  const encaja = (q, m = modo) => (m === 'significado' ? q.habilidad === 'sig' : m === 'lectura' ? q.habilidad === 'lec'
    : m === 'escuchar' ? q.habilidad === 'sig' && q.item.tipo === 'vocab' && !!q.item.audio : true);
  const quedan = () => pendientes.filter((q) => encaja(q)).length;
  const formatoDe = (q) => (modo === 'escribir' ? 'escribir' : modo === 'elegir' ? 'elegir' : formatoMixto(q.rango));
  const htmlQuedan = () => { const n = quedan(); return tn('estudio.repaso.quedan', n, { n: `<b>${n}</b>` }); };
  const cab = () => cabecera(`<div class="rc-progreso" title="${t('estudio.repaso.progreso', { hechas: st.hechas, total: st.hechas + quedan() })}"><i style="width:${Math.max(3, 100 * (st.hechas / Math.max(1, st.hechas + quedan())))}%"></i></div>${htmlModos(modo)}`,
    `${practica ? `<span class="fr-practica" title="${t('estudio.practica.tit')}">練 ${t('estudio.practica')}</span>` : ''}<span id="rep-quedan">${htmlQuedan()}</span><span id="rep-pct"><b>${st.hechas ? Math.round(100 * st.bien / st.hechas) : 100}%</b></span>${htmlBarraXP()}`);
  const enlazarModos = (enfocar = false) => {
    const g = $('.modos', V()); if (!g) return;
    $$('.modo', g).forEach((b) => { b.onclick = () => ponerModoRepaso(b.dataset.modo, { foco: true }); });
    g.addEventListener('keydown', (e) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
      e.preventDefault(); e.stopPropagation();
      ponerModoRepaso(siguienteModo(modo, e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1), { foco: true });
    });
    if (enfocar) $(`.modo[data-modo="${modo}"]`, g)?.focus({ preventScroll: true });
  };
  const animarModo = () => {
    const b = $('.modo.si', V()); if (!b) return;
    gsap.fromTo(b, { scaleX: 1.18, scaleY: 0.8 }, { scaleX: 1, scaleY: 1, duration: 0.6, ease: 'elastic.out(1, 0.35)' });
    son.toque(); son.koto(son.escalon(MODOS.findIndex((m) => m.id === modo) + 4, 62), 0, 0.35);
  };
  function ponerModoRepaso(nuevo, { foco = false } = {}) {
    if (nuevo === modo) { if (foco) $(`.modo[data-modo="${modo}"]`, V())?.focus(); return; }
    modo = nuevo; ponerModo(nuevo);
    const vivo = !actual || actual.ctrl?.estado === 'preguntando';
    if (vivo) { // la pregunta aún sin responder se vuelve a plantear en el modo nuevo
      if (actual && encaja(actual.q)) pintar(actual.q, { foco }); else siguiente({ foco });
    } else { // ya respondida: cambia la cabecera y el modo vale desde la siguiente
      const g = $('.modos', V()); if (g) { g.outerHTML = htmlModos(modo); enlazarModos(foco); }
      const q = $('#rep-quedan', V()); if (q) q.innerHTML = htmlQuedan();
    }
    animarModo();
    const m = modoDe(nuevo);
    const r = $('.modos', V())?.getBoundingClientRect();
    if (r) flotar(t('estudio.repaso.modo', { modo: m.nombre }), r.left + r.width / 2, r.bottom + 26, 'var(--acento)');
  }
  oirModo((e) => { if (fase === 'repaso' && cuenta === st && e.detail !== modo) ponerModoRepaso(e.detail); });
  // subida de rango, de nivel y pieza nueva de Mochi: tras responder y tras «me he equivocado al escribir»
  const celebrar = (q, r, retrasoNivel) => {
    if (r.sube) { st.subidas++; setTimeout(() => { son.subida(r.rango); cara('estrella', 1800); aviso({ jp: RANGOS[r.rango][0], es: `${caracter(q.item)} · ${RANGOS[r.rango][1]}`, sub: t('estudio.repaso.vuelve', { cuando: r.siguiente }), color: RANGO_COLOR[r.rango], dur: 1.2 }); }, 450); }
    quizaNivel(r, r.sube ? 2100 : retrasoNivel);
    if (r.equipo_nuevo) setTimeout(async () => { estado.inicio = await api('/api/inicio'); if (estado.mochi) await nuevoEquipo(estado.inicio); }, 900);
  };

  async function pintar(q, { foco = false } = {}) {
    let formato = formatoDe(q), opciones = null;
    if (q.item.tipo === 'gramatica') ({ formato, opciones } = opcionesGram(q.item));
    else if (formato === 'elegir') { await conPool(); opciones = armarOpciones(q.item, q.habilidad, 4, { escucha: modo === 'escuchar' }); if (!opciones) formato = 'escribir'; }
    if (fase !== 'repaso' || cuenta !== st) return;
    actual = { q, formato };
    cancelarK();
    const escucha = modo === 'escuchar';
    V().innerHTML = cab() + `<div class="ruedo">${carta(q.item, q.habilidad, q.rango, { formato, opciones, escucha, modos: true, rota: !!q.rota })}</div>`;
    enlazarModos(foco);
    // Nyan se adelanta con un significado equivocado (de las opciones malas, o de unas parecidas)
    let malas = (opciones?.opciones || []).filter((o) => !o.ok).map((o) => o.texto);
    if (!malas.length && q.habilidad === 'sig' && pool) malas = (armarOpciones(q.item, 'sig', 4)?.opciones || []).filter((o) => !o.ok).map((o) => o.texto);
    quizaAdelantarse({ it: q.item, hab: q.habilidad, rango: q.rango, escucha, malas });
    actual.ctrl = montarPregunta(q.item, q.habilidad, {
      formato, opciones, escucha, siguiente, autofoco: !foco, verLamina: () => verLaminaEmergente(q.item), cambiarModo: (dir) => ponerModoRepaso(siguienteModo(modo, dir)),
      registrar: async (ok, ms, c) => {
        const rachaAntes = st.racha;
        const r = await api('/api/responder', { clave: q.clave, correcto: ok || !!c.medio, ms: Math.round(ms), combo: ok ? st.racha + 1 : c.medio ? st.racha : 0, modo: c.formato, repaso: modo, ...(practica ? { practica: true } : {}), ...(c.noSe ? { no_se: true } : {}), ...(c.medio ? { medio: true } : {}) });
        const k = pendientes.indexOf(q); if (k >= 0) pendientes.splice(k, 1);
        st.hechas++; st.xp += r.xp || 0;
        if (ok) { st.bien++; st.racha++; st.mejor = Math.max(st.mejor, st.racha); son.acierto(st.racha); mini?.celebrar(); st.bienIt.push(q.item); q.rota = false; }
        else if (c.medio) { st.bien += 0.5; q.rota = false; }   // medio punto: ni suma ni rompe la racha
        else {
          st.racha = 0; st.malIt.push(q.item); q.rota = true;   // si vuelve en esta sesión, vuelve rota
          if (r.rango != null) q.rango = r.rango; // vuelve con su rango nuevo (reaprendiendo), no con el de antes del fallo
          if (r.otra_vez != null || practica) { pendientes.splice(Math.min(pendientes.length, 4), 0, q); if (q.item.tipo === 'gramatica') otraPregunta(q); }
        }
        alResponder({ ok, r, it: q.item, racha: st.racha });
        const hito = efectoCombo(st.racha);
        cara(c.medio ? 'pensando' : !ok ? 'triste' : r.sube || hito >= 10 ? 'estrella' : hito ? 'risa' : 'feliz', ok ? 1500 : 1800);
        if (r.xp) xpVuela($('.carta-rep', V()), r.xp, r.xp_total, { doble: r.multiplicador === 2 });
        celebrar(q, r, 1500);
        const pct = $('#rep-pct b', V()); if (pct) pct.textContent = `${Math.round(100 * st.bien / st.hechas)}%`;
        return { ...r, corregible: !ok && !c.medio && c.formato !== 'elegir' && !c.noSe, corregir: async () => {
          const cc = await api('/api/corregir', { clave: q.clave, ...(practica ? { practica: true } : {}) }); st.bien++;
          // el servidor deshace el fallo (y su XP) y lo cuenta como acierto: lo que cambia es la diferencia de totales
          st.xp += cc.xp_total != null && r.xp_total != null ? cc.xp_total - r.xp_total : (cc.xp || 0);
          const j = pendientes.indexOf(q); if (j >= 0) pendientes.splice(j, 1);
          st.racha = rachaAntes + 1; st.mejor = Math.max(st.mejor, st.racha); efectoCombo(st.racha); cara(cc.sube ? 'estrella' : 'feliz', 1200);
          if (cc.xp) xpVuela($('.carta-rep', V()), cc.xp, cc.xp_total);
          celebrar(q, cc, 900);
          const pc = $('#rep-pct b', V()); if (pc) pc.textContent = `${Math.round(100 * st.bien / st.hechas)}%`;
          return cc;
        } };
      },
    });
  }
  function siguiente({ foco = false } = {}) {
    const q = pendientes.find((x) => encaja(x));
    if (q) return pintar(q, { foco });
    if (pendientes.length) return sinTarjetasDelModo();
    return finRepaso(st);
  }
  // el modo elegido se ha quedado sin tarjetas, pero quedan en otros
  function sinTarjetasDelModo() {
    actual = null; preguntando = false; soltarNivel();
    const m = modoDe(modo), otras = pendientes.length;
    const hayGram = pendientes.some((q) => q.item.tipo === 'gramatica');
    V().innerHTML = cab() + `<div class="ruedo"><div class="carta-rep vacia"><div class="vacia-jp">${m.jp}</div>
      <h2>${t('estudio.sin_modo.tit', { modo: m.nombre })}</h2><p>${[modo === 'escuchar' ? t('estudio.sin_modo.escuchar') : '',
        hayGram && ['significado', 'lectura', 'escuchar'].includes(modo) ? t('estudio.sin_modo.gramatica', { mixto: modoDe('mixto').nombre, escribir: modoDe('escribir').nombre, elegir: modoDe('elegir').nombre }) : '',
        tn('estudio.sin_modo.quedan', otras)].filter(Boolean).join(' ')}</p>
      <div class="vacia-acciones"><button class="boton-tinta" data-foco id="a-mixto">${t('estudio.sin_modo.seguir', { modo: modoDe('mixto').nombre })} ${kbd('Intro')}</button><button class="boton-claro" id="terminar">${t('estudio.sin_modo.terminar')} ${kbd('T')}</button></div></div></div>`;
    enlazarModos();
    gsap.fromTo($('.carta-rep.vacia', V()), { y: 30, opacity: 0, rotate: -1 }, { y: 0, opacity: 1, rotate: 0, duration: 0.6, ease: 'back.out(1.8)' });
    $('#a-mixto', V()).onclick = () => ponerModoRepaso('mixto');
    $('#terminar', V()).onclick = () => finRepaso(st);
    sesion = { tecla: (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || escribiendo(e)) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k === 'Enter' && !sobreControl(e)) { e.preventDefault(); ponerModoRepaso('mixto'); }
      else if (k === 't') { e.preventDefault(); finRepaso(st); }
      else if (k === 'm') { e.preventDefault(); ponerModoRepaso(siguienteModo(modo, e.shiftKey ? -1 : 1)); }
    } };
  }
  siguiente();
}
function finRepaso(st) {
  fase = 'fin'; preguntando = false;
  limpiarCombo(); st.cerrada = true;
  if (!st.hechas) { location.hash = salida; return; } // «Terminar por hoy» sin haber respondido nada: sin nota ni fanfarria
  setTimeout(soltarNivel, 1200);
  const pct = Math.round(100 * st.bien / st.hechas);
  const nota = pct >= 95 ? '秀' : pct >= 85 ? '優' : pct >= 70 ? '良' : '可';
  son.fanfarria(); cara(pct >= 85 ? 'risa' : 'feliz', 3000); mini?.celebrar();
  // 02-10: todo en una pantalla. A la izquierda lo tuyo (nota y botín), a la derecha la visita y el diario
  const sube = { 可: ['良', 70], 良: ['優', 85], 優: ['秀', 95] }[nota];
  const pista = sube ? t('estudio.fin.para', { nota: sube[0], nombre: NOTAS[sube[0]], pct: sube[1] }) : t('estudio.fin.tope');
  V().innerHTML = cabecera('', htmlBarraXP()) + `<div class="ruedo rc-final fin-tablero"><div class="fin-rejilla">
    <div class="fin-col"><section class="fin-res rc-ficha">
      <div class="rc-final-ante">${st.practica ? t('estudio.fin.practica') : t('estudio.fin.repaso')} · ${tn('estudio.fin.tarjetas', st.hechas)}</div>
      <div class="fin-nota"><div class="rc-hanko" aria-label="${NOTAS[nota]}">${nota}</div>
        <div><div class="rc-hanko-txt">${NOTAS[nota]}</div><p class="fin-pista">${pista}</p></div></div>
      <div class="rc-stats">
        <div class="rc-stat rc-ficha"><b data-n="${pct}" data-suf="%">0%</b><small>${t('estudio.fin.aciertos')}</small></div>
        <div class="rc-stat rc-ficha"><b data-n="${st.mejor}">0</b><small>${t('estudio.fin.racha')}</small></div>
        <div class="rc-stat rc-ficha"><b data-n="${st.subidas}">0</b><small>${t('estudio.fin.subidas')}</small></div>
        <div class="rc-stat rc-ficha oro"><b data-n="${st.xp}" data-pre="+">+0</b><small>XP</small></div></div></section>
      <div id="rc-fin-slot"></div></div>
    <div class="fin-col">${visita(nota)}<div id="rc-diario"></div></div></div></div>
    <div class="pie-accion"><button class="boton-tinta" data-volver>${st.practica ? t('estudio.volver_camino') : t('estudio.volver_mochi')} ${kbd('Intro')}</button></div>`;
  // el diario de Nyan: la página de hoy, escrita a lápiz (y guardada para verla luego en su inventario)
  const lineas = lineasDiario(st), dia = $('#rc-diario', V());
  if (dia) { dia.innerHTML = htmlDiario(lineas); animarDiario(dia); guardarDiario(lineas); }
  encajarFin(); document.fonts?.ready.then(() => encajarFin());
  otraTanda(st);
  const hanko = $('.rc-hanko', V());
  gsap.timeline()
    .fromTo(hanko, { scale: 3, rotation: -30, opacity: 0 }, { scale: 1, rotation: -7, opacity: 1, duration: 0.34, ease: 'power4.in', delay: 0.25 })
    .call(() => { son.sello(); gsap.fromTo($('.rc-final', V()), { y: 6 }, { y: 0, duration: 0.4, ease: 'elastic.out(1, 0.3)' }); })
    .fromTo($('.rc-hanko-txt', V()), { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35 })
    .fromTo($$('.rc-stat', V()), { y: 30, opacity: 0, scale: 0.85 }, { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.08, ease: 'back.out(2)' }, '-=0.1')
    .call(() => $$('.rc-stat b', V()).forEach((b) => contar(b, 0, +b.dataset.n, 1, (v) => `${b.dataset.pre || ''}${mil(v)}${b.dataset.suf || ''}`)));
  sesion = { tecla: (e) => { if (e.key === 'Enter' && !sobreControl(e)) { e.preventDefault(); location.hash = salida; } } };
  finSesion({ contenedor: $('#rc-fin-slot', V()), respuestas: st.hechas, aciertos: Math.floor(st.bien), mejor_racha: st.mejor, lecciones: 0, gramatica: 0 }).then(() => encajarFin());
}
// la pantalla final cabe entera (02-10): el tablero se queda con el alto que dejan la cabecera y los botones. Si lo de
// dentro no cabe, por pasos: primero más apretado (sin la cabecera de las misiones ni la segunda meta), luego, en una
// columna, la visita sin foto (solo quien habla y su bocadillo), y al final se reduce todo junto (nunca por debajo del 70 %)
function encajarFin(v = V()) {
  const caja = $('.fin-tablero', v), rej = caja && $('.fin-rejilla', caja);
  if (!rej || !v.isConnected) return;
  // el alto de la rejilla sin zoom (offsetHeight: las animaciones de entrada, como el sello a escala 3, no cuentan)
  const hay = caja.clientHeight, sobra = () => rej.offsetHeight > hay;
  rej.style.zoom = ''; rej.classList.remove('apretado', 'visita-corta');
  if (sobra()) rej.classList.add('apretado');
  if (sobra() && getComputedStyle(rej).gridTemplateColumns.trim().split(/\s+/).length === 1) rej.classList.add('visita-corta');
  // con zoom el contenido tiene más ancho y se parte menos: el alto final queda por debajo de alto × zoom
  if (sobra()) { rej.style.zoom = String(Math.max(0.7, (hay - 2) / rej.offsetHeight)); return; }
  // en una pantalla grande, con la rejilla ya en su ancho máximo, crece (hasta un 120 %) en vez de dejar márgenes enormes
  const cs = getComputedStyle(caja), ancho = caja.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const crece = Math.min(1.2, (hay - 2) / rej.offsetHeight, ancho / Math.max(1, rej.offsetWidth));
  if (crece > 1.04 && !rej.classList.contains('apretado')) rej.style.zoom = String(crece);
}
// la sesión tiene tope: si quedan pendientes de lo elegido, se ofrece seguir (Intro) y volver pasa a Esc
async function otraTanda(st) {
  if (st.practica) return;
  let d; try { d = await api('/api/inicio'); } catch { return; }
  if (fase !== 'fin' || cuenta !== st) return;
  estado.inicio = d;
  const f = st.filtro || filtroTodo(), cr = d.cuenta_repaso;
  const n = cr ? f.tipos.reduce((a, tp) => a + (cr[tp] || 0), 0) : d.repasos_ahora || 0;
  const pie = $('.pie-accion', V());
  if (!n || !pie) return;
  pie.innerHTML = `<button class="boton-claro" data-volver>${t('estudio.volver_mochi')} ${kbd('Esc')}</button><button class="boton-tinta" id="otra-tanda">${t('estudio.fin.otra_tanda', { n: mil(Math.min(n, TOPE_REPASO)) })} ${kbd('Intro')}</button>`;
  encajarFin();
  const seguir = () => repaso({ filtro: f });
  $('#otra-tanda', pie).onclick = seguir;
  if (!quieto()) gsap.fromTo($('#otra-tanda', pie), { scale: 0.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2.2)' });
  sesion = { tecla: (e) => { if (e.key === 'Enter' && !sobreControl(e)) { e.preventDefault(); seguir(); } } };
}

// una tarjeta de gramática fallada vuelve con otra frase (si no, repetiría la que acabas de ver resuelta)
async function otraPregunta(q) {
  const antes = JSON.stringify(q.item.pregunta || {});
  for (let i = 0; i < 3; i++) {
    let it; try { it = await api('/api/item/' + q.item.id); } catch { return; }
    if (it?.pregunta && JSON.stringify(it.pregunta) !== antes) { q.item = { ...q.item, pregunta: it.pregunta }; return; }
  }
}

// ───────────────────────── rutas ─────────────────────────
// #estudio/repaso (eliges qué) · #estudio/repaso/todo (sin preguntar) · #estudio/leccion[/<región>] · #estudio/practica/<región>
// (también vale ?region=<i>&practica=1 detrás del modo)
function ruta(resto = []) {
  const [camino, qs = ''] = resto.join('/').split('?');
  const partes = camino.split('/').filter(Boolean), p = new URLSearchParams(qs);
  const num = partes.slice(1).find((x) => /^\d+$/.test(x));
  const region = p.get('region') ?? num ?? null;
  // «repaso-region» es el nombre con que el Camino llama a la práctica de una región
  const modo = p.get('practica') === '1' || partes[0] === 'repaso-region' ? 'practica' : partes[0] || 'repaso';
  return { modo, region: region == null || region === '' ? null : +region, todo: partes.includes('todo') };
}
// el mini-Mochi: su lienzo va dentro del marco, debajo de las puertas shoji, y sus shaders se compilan sin bloquear
// (compilarlos mientras se abrían las puertas dejaba la primera entrada congelada varios segundos)
let miniListo = null, verMiniT = 0;
export function prepararMini() {
  if (miniListo) return miniListo;
  const c = document.createElement('canvas'); c.className = 'mini-mochi'; c.style.display = 'none';
  const marco = $('#marco'); if (marco) marco.insertBefore(c, $('#shoji', marco)); else document.body.appendChild(c);
  // vive fijo abajo a la derecha (.mini-mochi): giro negativo para que mire hacia la tarjeta y no hacia el borde
  mini = new Mascota(c, { isla: false, compacta: true, giro: -0.42, equipo: estado.inicio?.mochi?.equipo_visto || 0 });
  mini.bocadilloArriba = () => fase === 'fin' && !!$('.vista.activa .fin-tablero'); // en la pantalla final, encima de la cabeza
  prepararPupitre(mini);
  const r = mini.render; // si la Mascota ya se prepara sola en segundo plano (mini.listo), basta con esperarla
  miniListo = Promise.resolve(mini.listo ?? (r?.compileAsync ? r.compileAsync(mini.escena, mini.camara) : null)).catch(() => {}).then(() => mini);
  return miniListo;
}
// aparece cuando el shoji ya se ha abierto, vestido con lo que lleva (aunque se entre directo, sin pasar por la portada)
async function mostrarMini() {
  const t = ++verMiniT;
  await new Promise((ok) => setTimeout(ok, 750));
  if (!estado.inicio) estado.inicio = await api('/api/inicio').catch(() => null);
  if (!juegoActual()) await cargarJuego().catch(() => null);
  if (t !== verMiniT) return;
  const m = await prepararMini();
  if (t !== verMiniT || !V().classList.contains('activa')) return;
  m.equipar(estado.inicio?.mochi?.equipo_visto || 0, false); m.quitarEquipo?.(estado.inicio?.mochi?.quitado || []); vestirMochi(m);
  if (m.lienzo.style.display === 'none') {
    m.lienzo.style.display = 'block';
    if (!quieto()) gsap.fromTo(m.lienzo, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5, ease: 'back.out(1.8)', clearProps: 'transform,opacity' });
  }
  verLibreta(true, estado.inicio?.nyan_sabe);   // su libreta, plegada encima de él
}
registrar('estudio', {
  seccion: '#v-estudio',
  async entrar(resto) {
    V().innerHTML = '';
    mostrarMini();
    limpiarCombo(); cuenta = null; salida = 'inicio';
    const r = ruta(resto);
    if (r.modo === 'leccion') { salida = r.region != null ? 'camino' : 'inicio'; await leccion(r.region); }
    else if (r.modo === 'practica') await repaso({ practica: true, region: r.region });
    else if (r.todo) await repaso({ filtro: filtroTodo() });
    else if (r.modo === 'conjugacion') await repaso({ filtro: filtroConjugacion(), recordar: false });   // #estudio/conjugacion: solo conjugación
    else await elegirRepaso();
  },
  salir() {
    verMiniT++; if (mini) mini.lienzo.style.display = 'none'; verLibreta(false); if (audio) audio.pause(); sesion = null;
    limpiarCombo(); cancelarK(); oirModo(null);
    // si sales a mitad, lo respondido cuenta igual para las misiones (y para la bolsa si llegaste a 10)
    if (cuenta && !cuenta.cerrada && cuenta.hechas > 0) finSesion({ silencioso: true, respuestas: cuenta.hechas, aciertos: cuenta.bien, mejor_racha: cuenta.mejor, lecciones: 0, gramatica: 0 });
    cuenta = null; fase = null;
    preguntando = false; if (nivelPendiente) setTimeout(soltarNivel, 1200); // la subida de nivel que esperaba, ya fuera
  },
  volver,
  puedeSalir,
  contexto: () => (fase === 'leccion' || fase === 'prueba' ? 'leccion' : fase === 'filtro' ? 'filtro' : 'repaso'),
});
// todos los «Salir» y «Volver» de la vista, también los de la prueba; y los kanji de la lámina de la lección
V().addEventListener('click', (e) => {
  if (e.target.closest('[data-volver]')) { e.preventDefault(); volver(); return; }
  if (fase === 'leccion' && e.target.closest('[data-kj]')) alPulsarKanji(e);
});
addEventListener('keydown', (e) => { if (sesion?.tecla && V().classList.contains('activa') && !e.defaultPrevented && !capaAbierta()) sesion.tecla(e); });

// ───────────────────────── estilos propios del estudio ─────────────────────────
const CSS = String.raw`
/* «No lo sé» */
.no-se { margin-top: 16px; display: inline-flex; align-items: center; gap: 10px; height: 44px; padding: 0 10px 0 8px; border: var(--borde); border-radius: var(--radio-btn); background: var(--sup);
  color: var(--tinta-2); font: 700 14.5px var(--f-texto); box-shadow: var(--sombra-peq); transition: color .15s, translate .2s var(--suave), border-color .15s; }
.no-se:hover { color: var(--tinta); translate: 0 -2px; border-color: var(--linea-2); }
.no-se:active { translate: 0 1px; }
.no-se-ico { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: var(--sup-2); color: var(--tinta-2); font: var(--peso-titulo) 14px/1 var(--f-titulo); }
.no-se kbd { min-width: 26px; height: 26px; border-radius: 8px; font: var(--peso-titulo) 13px/1 var(--f-titulo); background: var(--sup-2); color: var(--tinta-2); box-shadow: none; }
.no-se.fuera { visibility: hidden; }
:is(.no-se, .fr-tipo, .fr-hab, .fr-todo, button.chip-k, .fk-cerrar):focus-visible { outline: 2px solid var(--acento); outline-offset: 3px; }
.opciones-rep.tres { grid-template-columns: repeat(3, 1fr); } @media (max-width: 640px) { .opciones-rep.tres { grid-template-columns: 1fr; } }   /* en el móvil, una debajo de otra: en tres columnas el texto se partía letra a letra */
/* la pastilla del rango (tinta suave con el color del rango y el texto oscuro: se lee igual en los cuatro temas); el color llega en --rc */
.carta-rep .rango i, .fk-rango i { --rc: var(--r0); padding: 6px 10px; border-radius: var(--radio-peq); font: var(--peso-titulo) 13px/1 var(--f-titulo); font-style: normal; border: 0; transform: none;
  background: color-mix(in srgb, var(--rc) 16%, var(--sup)); color: color-mix(in srgb, var(--tinta) 45%, var(--rc)); box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--rc) 65%, transparent); }
/* dorso de la carta: la respuesta completa */
.carta-rep.dorso { display: block; padding: 62px 36px 32px; text-align: left; background-image: none; }
.carta-rep.dorso.fallo { outline: 2px solid color-mix(in srgb, var(--mal) 60%, transparent); outline-offset: -2px; }
.dorso-marca { --m: var(--bien); position: absolute; right: 24px; top: 16px; display: flex; align-items: center; gap: 8px; font: 700 12.5px var(--f-texto); letter-spacing: .04em; color: color-mix(in srgb, var(--tinta) 45%, var(--m)); }
.dorso-marca b { display: grid; place-items: center; width: 38px; height: 38px; border-radius: var(--radio-peq); border: 3px solid var(--m); font: 600 22px/1 var(--f-kaisho); transform: rotate(-8deg); }
.carta-rep.dorso.fallo .dorso-marca { --m: var(--mal); }
.dorso-rejilla { display: grid; grid-template-columns: 236px minmax(0, 1fr); gap: 28px; align-items: start; }
.dorso-caja { position: relative; height: 200px; border-radius: var(--radio); background: var(--sup-2); display: grid; place-items: center; padding: 12px;
  box-shadow: inset 0 0 0 2px var(--linea); }
.dorso-caja::before, .dorso-caja::after { content: ""; position: absolute; pointer-events: none; }
.dorso-caja::before { left: 10%; right: 10%; top: 50%; height: 1.5px; background: repeating-linear-gradient(90deg, var(--linea-2) 0 6px, transparent 6px 12px); }
.dorso-caja::after { top: 10%; bottom: 10%; left: 50%; width: 1.5px; background: repeating-linear-gradient(180deg, var(--linea-2) 0 6px, transparent 6px 12px); }
.dorso-caja .grande { position: relative; z-index: 1; font: 600 110px/1.1 var(--f-kaisho); color: var(--tinta); text-align: center; padding: 0; }
.dorso-kanji { margin-top: 16px; display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
.dorso-der .dorso-kanji { justify-content: flex-start; margin-top: 0; }
.dorso-pista { margin-top: 8px; text-align: center; font: 600 12px var(--f-texto); color: var(--tinta-2); }
.dorso-pista kbd { min-width: 20px; height: 20px; font-size: 10.5px; }
.dorso-der { display: grid; gap: 12px; }
.dorso-sig b { display: block; font: 700 34px/1.08 var(--f-texto); letter-spacing: -.01em; color: var(--tinta); text-wrap: balance; }
.dorso-sig small { display: block; margin-top: 4px; color: var(--tinta-2); font-size: 14.5px; }
.dorso-lec .kana { font: 500 30px var(--f-jp); letter-spacing: .08em; color: var(--tinta); }
.dorso-pron { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; color: var(--tinta-2); }
.dorso-pron .boton-audio { height: 40px; padding: 0 14px; }
.dorso-der .pedido { padding: 12px 16px 14px; border-radius: var(--radio-peq); background: var(--acento-suave); box-shadow: none; }
.dorso-te-pedia { display: block; margin-bottom: 4px; font: 700 10.5px var(--f-texto); letter-spacing: .16em; text-transform: uppercase; color: var(--acento-tinta); }
.dorso-truco { margin: 0; font: 400 16px/1.55 var(--f-texto); color: var(--tinta); text-wrap: pretty; }
.dorso-truco > span:first-child { font: 700 10.5px var(--f-texto); letter-spacing: .16em; text-transform: uppercase; color: var(--tinta-2); margin-right: 8px; }
.dorso-truco b { font-weight: 700; color: var(--acento-tinta); background: linear-gradient(transparent 60%, color-mix(in srgb, var(--acento) 28%, transparent) 60%); }
.dorso-frase { padding: 8px 16px 10px; border-radius: var(--radio-peq); background: var(--sup-2); box-shadow: none; }
.dorso-frase .frase-jp { font-size: 20px; line-height: 1.95; }
.dorso-frase .frase-es { font-size: 14px; }
.dorso-frase kbd { min-width: 18px; height: 18px; font-size: 10px; }
.dorso-der .lecturas .lectura { font-size: 17px; }
.dorso-palabras .chip-k { padding: 6px 12px; font-size: 13px; }
.dorso-palabras .chip-k span { font: 500 17px var(--f-jp); }
.dorso-palabras .chip-k small { color: var(--tinta-2); }
/* kanji que se pulsan (en la palabra y en las fichas) */
.kj { position: relative; cursor: pointer; border-radius: .1em; transition: color .2s, background .2s; }
.kj:hover { color: var(--acento-tinta); background: color-mix(in srgb, var(--acento) 14%, transparent); }
button.chip-k { border: 0; font: inherit; color: inherit; position: relative; transition: translate .2s var(--suave), background .2s; }
button.chip-k[data-kj]:hover { translate: 0 -2px; }
.kj::after, .chip-k[data-kj]::after { content: attr(data-n); position: absolute; left: 50%; top: 0; translate: -50% -70%; min-width: 30px; height: 30px; padding: 0 6px; border-radius: var(--radio-peq);
  background: var(--boton); color: var(--boton-tinta); font: var(--peso-titulo) 16px/30px var(--f-titulo); text-align: center; letter-spacing: 0; box-shadow: var(--sombra-btn); opacity: 0; scale: .4; pointer-events: none; transition: opacity .2s; }
.kj-eligiendo .kj[data-n]::after, .kj-eligiendo .chip-k[data-n]::after { opacity: 1; scale: var(--kj-escala, 1); }
.pista-kj { margin-left: 6px; font: 600 11px var(--f-texto); letter-spacing: .02em; text-transform: none; color: var(--tinta-2); }
.pista-kj kbd { min-width: 18px; height: 18px; font-size: 10px; }
/* ficha de un kanji */
.fk-capa { position: fixed; inset: 0; z-index: 60; display: grid; place-items: center; padding: 24px; background: var(--velo); }
.fk-ficha { position: relative; width: min(780px, 100%); max-height: calc(100vh - 48px); overflow: auto; padding: 32px 36px 36px; border-radius: var(--radio); outline: none; scrollbar-width: thin; scrollbar-color: var(--linea-2) transparent;
  background: var(--sup); border: var(--borde); box-shadow: var(--sombra-flotante); }
.fk-cerrar { position: absolute; right: 22px; top: 20px; z-index: 2; }
.fk-cerrar { background: var(--sup-2); }
.fk-cab { display: grid; grid-template-columns: 168px 1fr; gap: 28px; align-items: center; padding-right: 110px; }
.fk-casilla { position: relative; aspect-ratio: 1; border-radius: var(--radio); background: var(--sup-2); display: grid; place-items: center; box-shadow: inset 0 0 0 2px var(--linea); }
.fk-casilla .marco-rojo { position: absolute; inset: 9%; border: 2px solid var(--linea-2); border-radius: var(--radio-peq); }
.fk-casilla b { position: relative; font: 600 112px/1 var(--f-kaisho); color: var(--tinta); }
.fk-sello { position: absolute; right: -10px; bottom: -10px; width: 42px; height: 42px; border-radius: var(--radio-peq); background: color-mix(in srgb, var(--t-kanji) 16%, var(--sup)); color: color-mix(in srgb, var(--tinta) 40%, var(--t-kanji)); display: grid; place-items: center;
  font: var(--peso-titulo) 20px/1 var(--f-titulo); box-shadow: inset 0 0 0 2.5px var(--t-kanji); transform: rotate(-6deg); }
.fk-ficha h2 { margin: 8px 0 4px; font: 700 50px/1 var(--f-texto); letter-spacing: -.02em; text-wrap: balance; }
.fk-estado { padding: 3px 10px; border-radius: 99px; background: var(--sup-2); color: var(--tinta-2); letter-spacing: .04em; text-transform: none; font-size: 11.5px; }
.fk-estado.si { background: var(--bien-suave); color: color-mix(in srgb, var(--tinta) 45%, var(--bien)); }
.fk-rango { margin-top: 12px; display: flex; align-items: center; gap: 8px; font: 600 12.5px var(--f-texto); color: var(--tinta-2); }
.fk-ficha .mas { font: 700 20px var(--f-texto); color: var(--tinta-2); }
.fk-mnemo-l { font-size: 17px; margin-top: 12px; }
.fk-palabras { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 8px; }
.fk-pal { display: grid; gap: 1px; padding: 10px 14px; border-radius: var(--radio-peq); background: var(--sup-2); }
.fk-pal b { font: 500 22px/1.2 var(--f-jp); }
.fk-pal small { color: var(--tinta-2); font: 500 13px var(--f-jp); }
.fk-pal em { font-style: normal; font-size: 13.5px; color: var(--tinta-2); }
.fk-pal.no { opacity: .6; }
/* qué repasar */
.fr-cab { display: flex; align-items: center; justify-content: center; gap: 10px; font: 700 15px var(--f-texto); color: var(--tinta-2); letter-spacing: .04em; font-variant-numeric: tabular-nums; }
.fr-cab b { font: var(--peso-titulo) 16px/1 var(--f-titulo); color: var(--acento-tinta); }
.fr-ruedo { max-width: 1120px; margin: 0 auto; padding: 0 32px 132px; display: grid; justify-items: center; gap: 20px; }
.fr-intro { text-align: center; }
.fr-intro h2 { margin: 0; font: var(--peso-titulo) 46px/1.15 var(--f-titulo); color: var(--tinta); text-wrap: balance; }
.fr-intro p { margin: 10px 0 0; color: var(--tinta-2); font-size: 15.5px; text-wrap: balance; }
.fr-tipos { width: 100%; max-width: 980px; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 16px; }
.fr-tipo { --c: var(--t-vocab); position: relative; display: grid; justify-items: center; gap: 6px; padding: 28px 8px 20px; border: var(--borde); border-radius: var(--radio);
  background: var(--sup); color: var(--tinta); box-shadow: var(--sombra); transition: translate .2s var(--suave), border-color .2s, background-color .2s; }
.fr-tipo.t-kanji { --c: var(--t-kanji); }
.fr-tipo.t-radical { --c: var(--t-radical); }
.fr-tipo.t-gramatica { --c: var(--t-gram); }
.fr-tipo.t-conjugacion { --c: var(--t-conj); }
.fr-tipo::after { content: ""; position: absolute; inset: 0; border-radius: inherit; box-shadow: inset 0 0 0 2.5px var(--c); opacity: 0; pointer-events: none; transition: opacity .2s; }
.fr-tipo[aria-pressed="true"]::after { opacity: 1; }
.fr-tipo[aria-pressed="true"] { background: color-mix(in srgb, var(--c) 8%, var(--sup)); }
.fr-tipo:hover { translate: 0 -3px; border-color: var(--linea-2); }
.fr-tipo:active { translate: 0 2px; }
.fr-glifo { display: grid; place-items: center; width: 68px; height: 68px; border-radius: var(--radio); background: var(--sup-2); color: var(--tinta-2); font: var(--peso-titulo) 40px/1 var(--f-titulo);
  transition: background .2s, color .2s, box-shadow .2s; }
.fr-tipo[aria-pressed="true"] .fr-glifo { background: color-mix(in srgb, var(--c) 18%, var(--sup)); color: color-mix(in srgb, var(--tinta) 40%, var(--c)); box-shadow: inset 0 0 0 2px var(--c); }
.fr-nombre { margin-top: 4px; font: 700 18px var(--f-texto); transition: color .2s; }
.fr-tipo[aria-pressed="false"] .fr-nombre { color: var(--tinta-2); }
.fr-n { font: 600 13px var(--f-texto); color: var(--tinta-2); font-variant-numeric: tabular-nums; }
.fr-n b { font: var(--peso-titulo) 17px var(--f-titulo); color: var(--tinta); }
.fr-tipo[data-cero] .fr-n { font-style: italic; }
.fr-check { position: absolute; top: 12px; right: 12px; width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; background: color-mix(in srgb, var(--c) 18%, var(--sup)); color: color-mix(in srgb, var(--tinta) 40%, var(--c));
  font: 700 16px/1 var(--f-texto); box-shadow: inset 0 0 0 2px var(--c); scale: 0; transition: scale .3s var(--muelle); }
.fr-tipo[aria-pressed="true"] .fr-check { scale: 1; }
.fr-tipo > kbd { position: absolute; top: 12px; left: 12px; min-width: 30px; height: 30px; border-radius: 8px; font: var(--peso-titulo) 14px/1 var(--f-titulo); background: var(--sup-2); color: var(--tinta-2); box-shadow: none; }
.fr-fila { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; justify-content: center; }
.fr-habs { display: flex; gap: 4px; padding: 4px; border-radius: var(--radio-btn); background: var(--sup-2); box-shadow: inset 0 0 0 1px var(--linea); }
.fr-hab, .fr-todo { display: inline-flex; align-items: center; gap: 8px; height: 46px; padding: 0 12px 0 8px; border: 0; border-radius: var(--radio-btn); background: transparent; color: var(--tinta-2);
  font: 700 15px var(--f-texto); transition: background .2s, color .2s, box-shadow .2s, translate .2s var(--suave); }
.fr-hab b { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; background: var(--sup); font: var(--peso-titulo) 15px/1 var(--f-titulo); color: var(--tinta-2); transition: background .2s, color .2s; }
.fr-hab[aria-pressed="true"] { background: var(--acento-suave); color: var(--tinta); box-shadow: inset 0 0 0 2px var(--acento); }
.fr-hab[aria-pressed="true"] b { color: var(--acento-tinta); box-shadow: inset 0 0 0 2px var(--acento); }
.fr-hab kbd, .fr-todo kbd { min-width: 24px; height: 24px; font-size: 11px; }
.fr-todo { padding: 0 10px 0 18px; box-shadow: inset 0 0 0 1.5px var(--linea-2); }
.fr-todo:hover, .fr-hab:hover { translate: 0 -2px; }
.fr-todo[aria-pressed="true"] { background: var(--tinta); color: var(--tinta-inv); box-shadow: none; }
.fr-todo[aria-pressed="true"] kbd { background: color-mix(in srgb, var(--tinta-inv) 18%, transparent); color: var(--tinta-inv); box-shadow: none; }
.fr-modo { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; justify-content: center; }
.fr-modo > span { font: 700 11.5px var(--f-texto); letter-spacing: .16em; text-transform: uppercase; color: var(--tinta-2); }
.fr-nota { margin: -4px 0 0; max-width: 640px; font-size: 13px; line-height: 1.4; color: var(--tinta-2); text-align: center; text-wrap: balance; }
#fr-empezar.vacio { opacity: .6; }
.fr-practica { padding: 5px 12px; border-radius: var(--radio-btn); background: var(--bien-suave); color: color-mix(in srgb, var(--tinta) 45%, var(--bien)); font: 700 12px var(--f-texto); letter-spacing: .04em; box-shadow: inset 0 0 0 1.5px var(--bien); }
@media (max-height: 760px) { .fr-ruedo { gap: 12px; padding-bottom: 112px; } .fr-intro h2 { font-size: 36px; } .fr-intro p { margin-top: 6px; font-size: 14px; }
  .fr-tipo { padding-top: 24px; padding-bottom: 12px; gap: 3px; } .fr-glifo { width: 54px; height: 54px; font-size: 30px; border-radius: var(--radio-peq); } .fr-nombre { margin-top: 2px; font-size: 16px; }
  .fr-hab, .fr-todo { height: 40px; } .fr-hab b { width: 28px; height: 28px; } }
@media (max-width: 640px) { .fr-tipos { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 900px) { .fr-tipos { gap: 10px; } .fr-tipo { padding-inline: 4px; } .fr-nombre { font-size: 16px; } .fr-n { font-size: 12px; } .dorso-rejilla { grid-template-columns: 1fr; } .fk-cab { grid-template-columns: 120px 1fr; padding-right: 0; } }
/* tarjetas de gramática: el tipo gramática lleva su color (una tira en el borde izquierdo) */
.carta-rep.gram { --tira: var(--t-gram); display: block; background-image: linear-gradient(90deg, var(--tira) 0 8px, transparent 8px); background-size: auto; }
.carta-rep.gram.dorso.fallo { --tira: var(--mal); }
.carta-rep.gram .tipo { left: 32px; background: color-mix(in srgb, var(--t-gram) 14%, var(--sup)); color: color-mix(in srgb, var(--tinta) 40%, var(--t-gram)); box-shadow: none; }
.carta-rep.gram.dorso { padding: 0; text-align: center; }
.zona-gram { width: 100%; padding: 66px 48px 36px 60px; display: grid; justify-items: center; gap: 12px; text-align: center; }
.gram-punto { display: grid; justify-items: center; gap: 4px; }
.gram-punto b { font: var(--peso-titulo) 25px/1.2 var(--f-titulo); color: color-mix(in srgb, var(--tinta) 40%, var(--t-gram)); padding: 8px 20px 10px; border-radius: var(--radio-peq); background: color-mix(in srgb, var(--t-gram) 12%, var(--sup)); box-shadow: none; text-wrap: balance; }
.gram-punto small { font: 600 13.5px var(--f-texto); color: var(--tinta-2); letter-spacing: .02em; }
.gram-frase { font: 500 40px/2.15 var(--f-jp); color: var(--tinta); }
.gram-frase rt { font-size: .4em; color: var(--tinta-2); }
.hueco { display: inline-block; min-width: 2.1em; padding: 0 .22em; margin: 0 .06em; line-height: 1.3; border-radius: var(--radio-peq); background: color-mix(in srgb, var(--t-gram) 12%, var(--sup)); box-shadow: inset 0 -4px 0 var(--t-gram);
  color: color-mix(in srgb, var(--tinta) 40%, var(--t-gram)); text-align: center; }
.hueco:not(.lleno) { animation: nyango-hueco 1.6s ease-in-out infinite; }
@keyframes nyango-hueco { 50% { background: color-mix(in srgb, var(--t-gram) 24%, var(--sup)); } }
.hueco.lleno.bien { background: var(--bien-suave); box-shadow: inset 0 -4px 0 var(--bien); color: color-mix(in srgb, var(--tinta) 45%, var(--bien)); }
.hueco.lleno.mal { background: var(--mal-suave); box-shadow: inset 0 -4px 0 var(--mal); color: color-mix(in srgb, var(--tinta) 45%, var(--mal)); }
.hueco .vacio { font-style: normal; opacity: .65; }
.gram-es { font: 500 17px/1.4 var(--f-texto); color: var(--tinta-2); }
.gram-enunciado { max-width: 620px; font: 600 16.5px/1.4 var(--f-texto); color: color-mix(in srgb, var(--tinta) 40%, var(--t-gram)); text-wrap: balance; }
.gram-frase.larga { font-size: 31px; }
.gram-frase.muy-larga { font-size: 24px; line-height: 2.2; }
.gram-flecha { margin: 0 .35em; font: 700 .7em var(--f-texto); color: var(--t-gram); vertical-align: .12em; }
.gram-resp { display: grid; gap: 2px; justify-items: center; padding: 10px 20px 12px; border-radius: var(--radio-peq); background: var(--bien-suave); box-shadow: none; }
.gram-resp span { font: 700 10.5px var(--f-texto); letter-spacing: .16em; text-transform: uppercase; color: color-mix(in srgb, var(--tinta) 45%, var(--bien)); }
.gram-resp b { font: 700 20px/1.35 var(--f-texto); color: var(--tinta); }
.gram-resp b[lang="ja"] { font: 500 26px/1.6 var(--f-jp); }
.opciones-rep.lista { grid-template-columns: 1fr; width: min(640px, 100%); }
.opciones-rep.uso .opcion span.es { font: 600 17px/1.35 var(--f-texto); }
.gram-explica { max-width: 620px; padding: 12px 20px; border-radius: var(--radio-peq); background: var(--sup-2); box-shadow: none; font: 400 16.5px/1.65 var(--f-texto); text-align: left; text-wrap: pretty; }
.gram-explica rt { font-size: .5em; color: var(--tinta-2); }
.gram-ir { margin-top: 2px; }
.cinta.uso { background: color-mix(in srgb, var(--t-gram) 14%, var(--sup)); color: color-mix(in srgb, var(--tinta) 40%, var(--t-gram)); box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--t-gram) 50%, transparent); transform: none; }
.opciones-rep.uso .opcion span { font: 500 22px/1.5 var(--f-jp); }
.opciones-rep.uso .opcion rt { font-size: .45em; color: var(--tinta-2); }
@media (prefers-reduced-motion: reduce) { .hueco:not(.lleno) { animation: none; } .no-se, .fr-tipo, .fr-hab, .fr-todo, button.chip-k, .kj { transition: none; } .fr-tipo:hover, .fr-hab:hover, .fr-todo:hover { translate: none; } }
/* #v-estudio es la que se desplaza: el final de la lámina sube por encima de los botones fijos (también si van en dos filas) */
#v-estudio .lamina { padding-bottom: 190px; }
.vacio-cuando { margin: 10px 0 0; text-align: center; font: 600 16px var(--f-texto); color: var(--tinta-2); }
/* poca altura: el dorso, más compacto, para que la solución quepa */
@media (max-height: 800px) {
  .carta-rep.dorso { padding: 54px 30px 24px; }
  .dorso-caja { height: 150px; }
  .dorso-caja .grande { font-size: 84px; }
  .dorso-sig b { font-size: 28px; }
  .dorso-der { gap: 9px; }
}
`;
if (!document.getElementById('estilo-estudio')) { const s = document.createElement('style'); s.id = 'estilo-estudio'; s.textContent = CSS; document.head.appendChild(s); }
