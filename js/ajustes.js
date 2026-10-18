// Ajustes: modo de repaso (se guarda en el servidor), sonido, audio automático, idioma y, en la app de escritorio,
// la sincronización entre ordenadores (sincro.js). Todo con teclado.
import { t, idioma, IDIOMAS, cambiarIdioma } from './i18n.js';
import { TEMAS, temaElegido, ponerTema } from './tema.js';
import { gsap } from 'gsap';
import { $, $$, api, estado } from './app.js';
import * as son from './sonido.js';
import { capa, kbd, confirmar } from './teclado.js';
import { LOCAL } from './motor/local.js';
import { abrirAcerca } from './acerca.js';
import { htmlSincro, montarSincro } from './sincro.js';
import { htmlEnlace, montarEnlace } from './enlace-ajustes.js';

export const MODOS = [
  { id: 'mixto', jp: '混' }, { id: 'escribir', jp: '書' }, { id: 'elegir', jp: '選' },
  { id: 'significado', jp: '意' }, { id: 'lectura', jp: '読' }, { id: 'escuchar', jp: '聴' },
].map((m) => ({ ...m, nombre: t(`ajustes.modo.${m.id}`), desc: t(`ajustes.modo.${m.id}.desc`) }));
export const modoDe = (id) => MODOS.find((m) => m.id === id) || MODOS[0];
const quieto = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export function modoActual() { return modoDe(estado.inicio?.ajustes?.modo_repaso).id; }
export async function ponerModo(id) {
  const m = modoDe(id).id;
  if (estado.inicio) estado.inicio.ajustes = { ...(estado.inicio.ajustes || {}), modo_repaso: m };
  dispatchEvent(new CustomEvent('kd:modo', { detail: m }));
  try { await api('/api/ajustes', { modo_repaso: m }); } catch (e) { console.warn('No se pudo guardar el modo', e); }
  return m;
}
export function siguienteModo(id, paso = 1) { const i = MODOS.findIndex((m) => m.id === id); return MODOS[(i + paso + MODOS.length) % MODOS.length].id; }

// Qué repasar: tipos de tarjeta y habilidades (se recuerda en ajustes.filtro_repaso y, por si acaso, en este navegador)
export const TIPOS_REPASO = [
  { id: 'vocab', jp: '語', tecla: '1' }, { id: 'kanji', jp: '字', tecla: '2' }, { id: 'radical', jp: '部', tecla: '3' }, { id: 'gramatica', jp: '文', tecla: '4' }, { id: 'conjugacion', jp: '活', tecla: '5' },
].map((x) => ({ ...x, nombre: t(`ajustes.tipo.${x.id}`) }));
// las teclas S y L son las mismas en los dos idiomas (memoria muscular): solo cambia el texto
export const HABS_REPASO = [
  { id: 'sig', jp: '意', tecla: 'S' }, { id: 'lec', jp: '読', tecla: 'L' },
].map((x) => ({ ...x, nombre: t(`ajustes.hab.${x.id}`) }));
export const filtroTodo = () => ({ tipos: TIPOS_REPASO.map((t) => t.id), habilidades: HABS_REPASO.map((h) => h.id) });
function limpiarFiltro(f) {
  const t = (f?.tipos || []).filter((x) => TIPOS_REPASO.some((y) => y.id === x));
  if (!f?.v && t.includes('gramatica') && !t.includes('conjugacion')) t.push('conjugacion');   // 11-10: antes iba dentro de la gramática
  const h = (f?.habilidades || []).filter((x) => HABS_REPASO.some((y) => y.id === x));
  return { tipos: t.length ? t : filtroTodo().tipos, habilidades: h.length ? h : filtroTodo().habilidades, v: 2 };
}
export const esTodo = (f) => f.tipos.length === TIPOS_REPASO.length && f.habilidades.length === HABS_REPASO.length;
export const filtroConjugacion = () => ({ tipos: ['conjugacion'], habilidades: HABS_REPASO.map((h) => h.id), v: 2 });
export function filtroActual() {
  let f = estado.inicio?.ajustes?.filtro_repaso;
  if (!f) { try { f = JSON.parse(localStorage.getItem('nyango-filtro-repaso') || 'null'); } catch {} }
  return limpiarFiltro(f);
}
export async function ponerFiltro(f) {
  const limpio = limpiarFiltro(f);
  if (estado.inicio) estado.inicio.ajustes = { ...(estado.inicio.ajustes || {}), filtro_repaso: limpio };
  try { localStorage.setItem('nyango-filtro-repaso', JSON.stringify(limpio)); } catch {}
  try { await api('/api/ajustes', { filtro_repaso: limpio }); } catch (e) { console.warn('No se pudo guardar el filtro', e); }
  return limpio;
}
/** ¿Esta tarjeta de /api/repaso entra en el filtro? (la gramática no tiene significado/lectura: entra si está su tipo) */
export function pasaFiltro(q, f) {
  const tipo = q.item?.conj ? 'conjugacion' : q.item?.tipo;
  if (!f.tipos.includes(tipo)) return false;
  return tipo === 'gramatica' || tipo === 'conjugacion' || f.habilidades.includes(q.habilidad);
}
export function aplicarSonido() {
  const aj = estado.inicio?.ajustes || {}, vol = (k) => (typeof aj[k] === 'number' ? aj[k] / 100 : 1);
  son.activar(aj.sonido !== false); son.permitirMusica(aj.musica !== false);
  son.volumenes({ musica: vol('vol_musica'), efectos: vol('vol_efectos'), voz: vol('vol_voz') });
}
// tres deslizadores: música, efectos y la voz de Nyan (de 0 a 100)
const VOLUMENES = [['vol_musica', '音', 'musica'], ['vol_efectos', '効', 'efectos'], ['vol_voz', '猫', 'voz']];
const htmlVolumenes = (aj) => `<div class="aj-vols">${VOLUMENES.map(([k, jp, n]) => {
  const v = typeof aj[k] === 'number' ? aj[k] : 100;
  return `<label class="aj-vol"><b>${jp}</b><span>${t(`ajustes.vol.${n}`)}</span><input type="range" min="0" max="100" step="5" value="${v}" data-vol="${k}" style="--v:${v}%"><output>${v}</output></label>`;
}).join('')}</div>`;

// El tema: cinco muestras vivas (cada una lleva los tokens de su tema: temas.css · [data-muestra]) y el cambio al instante.
// Los textos son las claves ajustes.tema.* de web/i18n.
const tipos5 = '<span class="am-tipos"><i></i><i></i><i></i><i></i><i></i></span>';
const cuerpoMuestra = `<i class="am-carta"></i><i class="am-boton"></i>${tipos5}`;
const htmlTemas = () => {
  const el = temaElegido();
  return `<section class="aj-bloque aj-apariencia"><h3 id="aj-tema-t">${t('ajustes.tema.tit')} <small>${kbd('T')}</small></h3>
      <div class="aj-temas" role="radiogroup" aria-labelledby="aj-tema-t">${TEMAS.map((id) => `<button class="aj-tema" role="radio" data-tema="${id}" aria-checked="${id === el}" tabindex="${id === el ? 0 : -1}" title="${t(`ajustes.tema.${id}.desc`)}">
        ${id === 'auto' ? `<span class="aj-muestra auto" aria-hidden="true"><span data-muestra="washi">${cuerpoMuestra}</span><span data-muestra="noche">${cuerpoMuestra}</span></span>`
          : `<span class="aj-muestra" data-muestra="${id}" aria-hidden="true">${cuerpoMuestra}</span>`}<strong>${t(`ajustes.tema.${id}`)}</strong></button>`).join('')}</div>
      <p class="aj-nota">${t('ajustes.tema.nota')}</p></section>`;
};

let abierta = null;
export function abrirAjustes({ seccion = 'modo' } = {}) {
  if (abierta) return;
  const aj = { sonido: true, autoplay: true, musica: true, ...(estado.inicio?.ajustes || {}) };
  let modo = modoActual();
  const c = document.createElement('div');
  c.className = 'tk-capa tk-ajustes'; c.setAttribute('role', 'dialog'); c.setAttribute('aria-modal', 'true'); c.setAttribute('aria-labelledby', 'aj-tit');
  c.innerHTML = `<div class="tk-hoja aj-hoja">
    <header class="tk-cab"><span class="tk-logo">設</span><div><div class="tk-ante">${t('ajustes.ante')}</div><h2 id="aj-tit">${t('ajustes.tit')}</h2></div>
      <button class="volver" data-cerrar>${t('ajustes.listo')} ${kbd('Esc')}</button></header>
    <section class="aj-bloque"><h3 id="aj-modo-t">${t('ajustes.modo.tit')} <small>${t('ajustes.modo.teclas', { flechas: kbd('↑') + kbd('↓'), numeros: `${kbd('1')}–${kbd('6')}` })}</small></h3>
      <div class="aj-modos" role="radiogroup" aria-labelledby="aj-modo-t">${MODOS.map((m, i) => `<button class="aj-modo" role="radio" data-modo="${m.id}" aria-checked="${m.id === modo}" tabindex="${m.id === modo ? 0 : -1}">
        <b class="aj-jp">${m.jp}</b><span><strong>${m.nombre}</strong><small>${m.desc}</small></span>${kbd(i + 1)}</button>`).join('')}</div>
      <p class="aj-nota">${t('ajustes.modo.nota', { m: kbd('M') })}</p></section>
    ${htmlTemas()}
    <section class="aj-bloque"><h3>${t('ajustes.sonido')}</h3>
      <button class="aj-interruptor" role="switch" data-aj="sonido" aria-checked="${aj.sonido !== false}"><span>${t('ajustes.sonido.efectos')}</span><i></i>${kbd('S')}</button>
      <button class="aj-interruptor" role="switch" data-aj="autoplay" aria-checked="${aj.autoplay !== false}"><span>${t('ajustes.sonido.autoplay')}</span><i></i>${kbd('U')}</button>
      <button class="aj-interruptor" role="switch" data-aj="musica" aria-checked="${aj.musica !== false}"><span>${t('ajustes.sonido.musica')}</span><i></i>${kbd('B')}</button>
      ${htmlVolumenes(aj)}</section>
    <section class="aj-bloque aj-nyan"><h3>${t('ajustes.bv.tit')}</h3><p class="aj-nota">${t('ajustes.bv.nota')}</p>
      <div class="aj-botones"><button class="boton-claro" data-bv="bienvenida">${t('ajustes.bv.bienvenida')}</button><button class="boton-claro" data-bv="tour">${t('ajustes.bv.tour')}</button></div>
      ${estado.inicio?.de_nivel ? `<p class="aj-nota">${t('ajustes.nivel.nota', { n: estado.inicio.de_nivel })}</p><div class="aj-botones"><button class="boton-claro" data-deshacer-nivel>${t('ajustes.nivel.deshacer')}</button></div>` : ''}</section>
    ${LOCAL ? htmlEnlace() : ''}
    ${LOCAL ? htmlProgreso() : ''}
    ${htmlSincro()}
    <footer class="tk-pie aj-pie"><button class="volver" data-acerca>${t('comun.acerca')}</button>
      <div class="aj-idiomas" role="radiogroup" aria-label="${t('ajustes.idioma')}" title="${t('ajustes.idioma.nota')}">${IDIOMAS.map((i) => `<button role="radio" data-idioma="${i}" lang="${i}" aria-checked="${i === idioma}" tabindex="${i === idioma ? 0 : -1}" title="${t(`idioma.${i}.desc`)}"><b>${t(`idioma.${i}.jp`)}</b>${t(`idioma.${i}.nombre`)}</button>`).join('')}</div></footer>
  </div>`;
  document.body.appendChild(c);
  const hoja = c.firstElementChild;
  gsap.fromTo(c, { opacity: 0 }, { opacity: 1, duration: 0.2 });
  if (!quieto()) {
    gsap.fromTo(hoja, { y: 60, scale: 0.92, rotate: 1.5 }, { y: 0, scale: 1, rotate: 0, duration: 0.6, ease: 'back.out(1.8)' });
    gsap.fromTo($$('.aj-modo, .aj-interruptor', c), { x: -20, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, stagger: 0.035, delay: 0.12, ease: 'back.out(2)' });
  }
  const botones = $$('.aj-modo', c);
  const elegir = (id, enfocarlo = true) => {
    if (id === modo) { if (enfocarlo) $(`[data-modo="${id}"]`, c).focus(); return; }
    modo = id; son.toque();
    botones.forEach((b) => { const si = b.dataset.modo === id; b.setAttribute('aria-checked', si); b.tabIndex = si ? 0 : -1; });
    const b = $(`[data-modo="${id}"]`, c);
    if (enfocarlo) b.focus();
    if (!quieto()) gsap.fromTo(b, { scaleX: 1.04, scaleY: 0.92 }, { scaleX: 1, scaleY: 1, duration: 0.5, ease: 'elastic.out(1, 0.35)' });
    ponerModo(id);
  };
  botones.forEach((b) => { b.onclick = () => elegir(b.dataset.modo); });
  const conmutar = (k) => {
    const b = $(`[data-aj="${k}"]`, c), v = b.getAttribute('aria-checked') !== 'true';
    b.setAttribute('aria-checked', v);
    if (estado.inicio) estado.inicio.ajustes = { ...(estado.inicio.ajustes || {}), [k]: v };
    if (k === 'sonido') { aplicarSonido(); if (v) son.toque(); }
    if (k === 'musica') aplicarSonido();
    if (!quieto()) gsap.fromTo($('i', b), { scale: 0.8 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' });
    api('/api/ajustes', { [k]: v }).catch(() => {});
  };
  $$('[data-aj]', c).forEach((b) => { b.onclick = () => conmutar(b.dataset.aj); });
  // repetir la bienvenida de Nyan (o solo el tour): en la portada, con la sala detrás
  // deshacer la prueba de nivel: lo que dio por sabido vuelve a estar por aprender (lo aprendido en lecciones se queda)
  const deshacer = $('[data-deshacer-nivel]', c);
  if (deshacer) deshacer.onclick = async () => {
    if (!(await confirmar({ titulo: t('ajustes.nivel.deshacer'), texto: t('ajustes.nivel.confirmar', { n: estado.inicio?.de_nivel || 0 }) }))) return;
    try { await api('/api/nivel/deshacer', {}); } catch (e) { console.warn('No se pudo deshacer la prueba de nivel', e); return; }
    deshacer.closest('.aj-botones')?.previousElementSibling?.remove(); deshacer.closest('.aj-botones')?.remove();
    if (estado.inicio) estado.inicio.de_nivel = 0;
    dispatchEvent(new Event('nyango:progreso'));
  };
  $$('[data-bv]', c).forEach((b) => { b.onclick = () => {
    const que = b.dataset.bv; $('[data-cerrar]', c).click();
    const lanzar = () => import('./bienvenida.js').then((m) => (que === 'tour' ? m.tour(estado.mochi) : m.bienvenida(estado.inicio, estado.mochi)));
    if ((location.hash.slice(1) || 'inicio').split('/')[0] !== 'inicio') { location.hash = 'inicio'; setTimeout(lanzar, 1900); } else setTimeout(lanzar, 400);
  }; });
  // volumen: suena en vivo al arrastrar y se guarda al soltar, con una muestra de lo que se está ajustando
  $$('[data-vol]', c).forEach((r) => {
    const k = r.dataset.vol, poner = () => {
      const v = +r.value; r.style.setProperty('--v', `${v}%`); r.nextElementSibling.textContent = v;
      if (estado.inicio) estado.inicio.ajustes = { ...(estado.inicio.ajustes || {}), [k]: v };
      aplicarSonido();
    };
    r.addEventListener('input', poner);
    r.addEventListener('change', () => {
      poner(); api('/api/ajustes', { [k]: +r.value }).catch(() => {});
      if (k === 'vol_efectos') son.cambio(2); else if (k === 'vol_voz') son.voz('nya');
    });
  });
  // idioma: se guarda y la página se recarga (hay textos en constantes de módulo)
  const idiomas = $$('[data-idioma]', c);
  const ponerIdioma = (i) => { if (i === idioma) return; son.toque(); idiomas.forEach((b) => b.setAttribute('aria-checked', b.dataset.idioma === i)); cambiarIdioma(i); };
  idiomas.forEach((b) => { b.onclick = () => ponerIdioma(b.dataset.idioma); });
  // tema: elegir una muestra lo aplica al instante (y lo guarda); flechas para moverse, Intro/Espacio para elegir, T para pasar al siguiente
  const temas = $$('[data-tema]', c);
  const elegirTema = (id, enfocar = false) => {
    if (id === temaElegido()) { if (enfocar) $(`[data-tema="${id}"]`, c).focus(); return; }
    son.toque(); ponerTema(id);
    temas.forEach((b) => { const si = b.dataset.tema === id; b.setAttribute('aria-checked', si); b.tabIndex = si ? 0 : -1; });
    if (enfocar) $(`[data-tema="${id}"]`, c).focus();
  };
  temas.forEach((b) => { b.onclick = () => elegirTema(b.dataset.tema); });
  const siguienteTema = (paso) => TEMAS[(TEMAS.indexOf(temaElegido()) + paso + TEMAS.length) % TEMAS.length];
  $('[data-acerca]', c).onclick = () => { cerrar(); abrirAcerca(); };
  if (LOCAL) montarProgreso(c);
  // «Tu móvil»: enlazar el móvil con un QR o un código (enlace-ajustes.js); solo donde está el motor (app de escritorio y PWA)
  const en = LOCAL ? montarEnlace(hoja) : null;
  // sincronización entre ordenadores: solo en la app de escritorio (si /api/sincro no responde, la sección no aparece)
  const sc = montarSincro(hoja, $('.aj-pie', c));
  const cerrar = () => {
    if (!abierta) return;
    abierta = null; soltar(); sc.soltar(); en?.soltar();
    gsap.to(c, { opacity: 0, duration: 0.18, onComplete: () => c.remove() });
  };
  $('[data-cerrar]', c).onclick = cerrar;
  c.addEventListener('click', (e) => { if (e.target === c) cerrar(); });
  const soltar = capa(c, (e) => {
    const k = e.key, f = document.activeElement, enModos = f?.closest?.('.aj-modos');
    if (en?.campo(f)) { // escribiendo un nombre o un código: nada de atajos con letras; Intro y Esc llegan al campo como eventos
      if (k === 'Enter' || k === 'Escape') { f.dispatchEvent(new Event(k === 'Enter' ? 'en:intro' : 'en:esc')); return true; }
      return false;
    }
    if (f?.dataset?.idioma) { // idioma: flechas para moverse, Intro o Espacio para cambiar
      if (['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(k)) { const l = idiomas, j = (l.indexOf(f) + (k === 'ArrowDown' || k === 'ArrowRight' ? 1 : -1) + l.length) % l.length; l.forEach((b, n) => { b.tabIndex = n === j ? 0 : -1; }); l[j].focus(); return true; }
      if (k === 'Enter' || k === ' ') { ponerIdioma(f.dataset.idioma); return true; }
    }
    if (f?.dataset?.tema) { // tema: flechas para moverse entre muestras, Intro o Espacio para elegir
      if (['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(k)) { elegirTema(siguienteTema(k === 'ArrowDown' || k === 'ArrowRight' ? 1 : -1), true); return true; }
      if (k === 'Enter' || k === ' ') { elegirTema(f.dataset.tema); return true; }
    }
    if (k === 'Enter' && f?.dataset?.modo) elegir(f.dataset.modo, false); // Intro sobre un modo: ese, y listo
    // Intro cierra, salvo en los interruptores, «Listo», «Acerca de» y los botones de la sincronización, que hacen lo suyo
    if (k === 'Escape' || (k === 'Enter' && !f?.closest?.('[data-aj], [data-cerrar], [data-acerca], [data-sc] [data-k], [data-en] [data-k]'))) { cerrar(); return true; }
    if (k.toLowerCase() === 'n' && !e.ctrlKey && sc.ahora()) return true;
    if (/^[1-6]$/.test(k)) { elegir(MODOS[+k - 1].id); return true; }
    if (enModos && ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(k)) { elegir(siguienteModo(modo, k === 'ArrowDown' || k === 'ArrowRight' ? 1 : -1)); return true; }
    if (k.toLowerCase() === 't' && !e.ctrlKey && !e.metaKey && !e.altKey) { elegirTema(siguienteTema(e.shiftKey ? -1 : 1), false); return true; }
    if (k.toLowerCase() === 's' && !e.ctrlKey) { conmutar('sonido'); return true; }
    if (k.toLowerCase() === 'u' && !e.ctrlKey) { conmutar('autoplay'); return true; }
    if (k.toLowerCase() === 'b' && !e.ctrlKey) { conmutar('musica'); return true; }
    if (k.toLowerCase() === 'm' && !e.ctrlKey) { elegir(siguienteModo(modo, e.shiftKey ? -1 : 1)); return true; }
    return false;
  }, { foco: seccion === 'modo' ? $(`[data-modo="${modo}"]`, c) : $('[data-aj]', c) });
  abierta = c;
}

// ── tu progreso (solo sin servidor: la app de escritorio y la PWA) ──
// Vive fuera de la app (web/js/motor/almacen.js), así que las actualizaciones no lo tocan. Aquí: guardar una copia (en
// Descargas en el escritorio; como descarga en el navegador) y traer una (o el progress.json del Nyango de antes, con las
// palabras de Kaishi pasadas a NyanDeck).
function htmlProgreso() {
  return `<section class="aj-bloque aj-progreso"><h3>${t('ajustes.progreso.tit')}</h3>
      <p class="aj-nota">${t('ajustes.progreso.nota')}</p>
      <div class="aj-botones"><button class="boton-claro" data-progreso="exportar">${t('ajustes.progreso.exportar')}</button>
        <button class="boton-claro" data-progreso="importar">${t('ajustes.progreso.importar')}</button>
        <input type="file" accept=".json,application/json" hidden data-progreso-archivo></div>
      <p class="aj-progreso-msg" aria-live="polite"></p></section>`;
}
function montarProgreso(c) {
  const msg = $('.aj-progreso-msg', c), archivo = $('[data-progreso-archivo]', c);
  const decir = (x) => { msg.textContent = x; };
  $('[data-progreso="exportar"]', c).onclick = async () => {
    const p = await api('/api/progreso/exportar');
    const texto = JSON.stringify(p), d = new Date();
    const nombre = `nyango-progreso-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`;
    const fs = window.__TAURI__?.fs;
    if (fs) {
      try { await fs.writeTextFile(nombre, texto, { baseDir: fs.BaseDirectory.Download }); decir(t('ajustes.progreso.guardado', { donde: `${t('ajustes.progreso.descargas')}/${nombre}` })); } catch (e) { decir(String(e)); }
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([texto], { type: 'application/json' })); a.download = nombre; a.click();
    decir(t('ajustes.progreso.guardado', { donde: nombre }));
  };
  $('[data-progreso="importar"]', c).onclick = () => archivo.click();
  archivo.onchange = async () => {
    const f = archivo.files?.[0]; archivo.value = '';
    if (!f) return;
    const texto = await f.text();
    if (!(await confirmar({ titulo: t('ajustes.progreso.importar'), texto: t('ajustes.progreso.confirmar') }))) return;
    try {
      const r = await api('/api/progreso/importar', { texto });
      decir(t('ajustes.progreso.traido', { aprendidos: r.aprendidos, xp: r.xp, palabras: r.palabras }));
      setTimeout(() => location.reload(), 1800);
    } catch (e) { decir(t('ajustes.progreso.error')); }
  };
}
