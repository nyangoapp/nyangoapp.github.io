// Las historias de Nyan en el móvil. #historias: la biblioteca (la que toca, grande, y el estante de lado).
// #historias/<id>: la historia como un libro ilustrado: arriba su portada y debajo las frases, que aparecen una a una con
// la voz de cada personaje; cuando la página se llena se pasa a otra, y deslizando hacia atrás se releen las de antes
// (todo sin desplazar). Al final, de qué iba (preguntas) y qué te ha parecido, y lo ganado (/api/lectura/<id>).
import { gsap } from 'gsap';
import { t, idioma } from '../i18n.js';
import * as son from '../sonido.js';
import { esc, ruby } from '../japones.js';
import { $, $$, api, vibrar, quieto, encajar, chispas, CERRAR, PLAY } from './comun.js';

const tr = (o) => (o && typeof o === 'object' ? o[idioma] ?? o.es ?? '' : o || '');
const frase = (s) => String(s || '').split(' ').map(ruby).join(' ');
const NOMBRE = { nyan: 'ニャン', tama: 'タマ', kage: 'カゲ', pon: 'ポン', fukuro: 'フクロ先生', kotaro: 'コタロウ' };
const COLOR = { nyan: 'nyan', tama: 'tama', kage: 'kage', pon: 'tendero', fukuro: 'sensei', kotaro: 'kotaro' };
const portada = (id, clase = '') => `<img class="${clase}" src="/img/historias/${encodeURIComponent(id)}.webp" alt="">`;
const guardado = (k, def) => { try { const v = localStorage.getItem(k); return v === null ? def : v === '1'; } catch { return def; } };
const guardar = (k, v) => { try { localStorage.setItem(k, v ? '1' : '0'); } catch { /* nada */ } };
let app = null, H = null, voces = new Set(), audio = null, autoplay = true;

function oir(voz) {
  if (!voz || !voces.has(voz)) return;
  audio?.pause(); audio = son.pista(`/sonidos/lecturas/${H.id}/${voz}.mp3`);
  audio.play().catch(() => {});
}

// ───────── la biblioteca ─────────
async function biblioteca(v) {
  const d = await api('/api/lecturas').catch(() => ({ vas: 0, lista: [] }));
  const faltan = (x) => Math.max(1, x.desde - (d.vas || 0));
  const dest = d.lista.find((x) => x.abierta && !x.leida) || d.lista.find((x) => !x.abierta) || d.lista[0];
  const leidas = d.lista.filter((x) => x.leida).length;
  const estado = (x) => (x.leida ? `<em class="leida">${'★'.repeat(x.leida.mejor)}${'☆'.repeat(Math.max(0, x.leida.total - x.leida.mejor))}</em>`
    : x.abierta ? `<em class="nueva">${t('lectura.nueva')}</em>` : `<em>${t('lectura.faltan', { n: faltan(x) })}</em>`);
  v.innerHTML = `<div class="mv-his">
    <header class="mv-cls-cab"><h1 class="mv-tit">${t('lectura.tit')}</h1><span class="mv-apr-cuenta">${leidas} / ${d.lista.length}</span></header>
    ${dest ? `<section class="mv-carta mv-his-dest${dest.abierta ? '' : ' cerrada'}">
      <div class="mv-his-foto">${portada(dest.id)}<span class="mv-his-etq">${dest.abierta ? t('lectura.proxima_nueva') : t('lectura.proxima')}</span></div>
      <div class="mv-his-dest-txt"><b lang="ja">${ruby(dest.titulo?.jp || '')}</b><small>${esc(tr(dest.titulo))}</small>
        ${dest.resumen ? `<p>${esc(dest.resumen)}</p>` : ''}
        ${dest.abierta ? `<a class="mv-btn" href="#historias/${dest.id}">${t('lectura.empezar')}</a>`
          : `<div class="mv-his-falta"><span>${t('lectura.faltan', { n: faltan(dest) })}</span><div class="mv-barra"><i style="width:${Math.min(96, Math.max(4, (100 * (d.vas || 0)) / Math.max(1, dest.desde)))}%"></i></div><small>${t('lectura.acerca')}</small></div>`}</div></section>` : ''}
    <div class="mv-etq mv-his-etq-estante">${t('lectura.biblioteca')}</div>
    <div class="mv-his-estante">${d.lista.map((x) => `<a class="mv-his-libro${x.abierta ? '' : ' cerrada'}" ${x.abierta ? `href="#historias/${x.id}"` : 'aria-disabled="true"'}>
      ${portada(x.id)}<b lang="ja">${ruby(x.titulo?.jp || '')}</b>${estado(x)}</a>`).join('')}</div></div>`;
  encajar($('.mv-his-dest-txt', v), 0.75);
  $$('.mv-his-libro.cerrada', v).forEach((b) => { b.onclick = () => { son.fallo(); vibrar([18, 40, 18]); if (!quieto()) gsap.fromTo(b, { x: -6 }, { x: 0, duration: 0.4, ease: 'elastic.out(1, .3)' }); }; });
  $$('a[href]', v).forEach((a) => a.addEventListener('click', () => vibrar(10)));
  // el estante empieza por la que toca
  const sel = dest && $(`.mv-his-libro[href="#historias/${dest.id}"]`, v); if (sel) sel.scrollIntoView({ inline: 'center', block: 'nearest' });
  if (!quieto()) gsap.fromTo($$('.mv-his > *', v), { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.06, ease: 'back.out(1.5)' });
}

// ───────── leer una historia ─────────
async function leer(v, id) {
  v.innerHTML = `<div class="mv-rep mv-cargando"><div class="mv-etq">${t('mv.his.abriendo')}</div></div>`;
  const [h, lista] = await Promise.all([fetch(`/lecturas/${encodeURIComponent(id)}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    api('/api/lecturas').catch(() => ({ lista: [] }))]);
  const info = lista.lista.find((x) => x.id === id);
  if (!h || !info?.abierta) {
    v.innerHTML = `<div class="mv-pronto"><img src="/img/reparto/nyan-pensando.webp" alt="" width="200" height="200"><p>${!h ? t('lectura.no_existe') : t('lectura.cerrada', { n: h.desde })}</p>
      <a class="mv-btn" href="#historias">${t('mv.his.volver')}</a></div>`;
    return;
  }
  H = h;
  voces = new Set(await fetch(`/sonidos/lecturas/${h.id}/indice.json`).then((r) => (r.ok ? r.json() : [])).catch(() => []));
  autoplay = (await app.inicio().catch(() => ({})))?.ajustes?.autoplay !== false;
  v.innerHTML = `<div class="mv-his-leer">
    <header class="mv-rep-cab"><a class="mv-icono-btn" href="#historias" aria-label="${t('mv.his.volver')}">${CERRAR}</a><div class="mv-barra"><i></i></div><span class="mv-rep-n"></span></header>
    <div class="mv-his-cuerpo"></div></div>`;
  portadaHistoria(v);
}
function portadaHistoria(v) {
  const c = $('.mv-his-cuerpo', v);
  $('.mv-barra i', v).style.width = '4%'; $('.mv-rep-n', v).textContent = '';
  c.innerHTML = `<div class="mv-his-portada"><div class="mv-his-foto grande">${portada(H.id)}</div>
    <small class="mv-his-eyebrow">${t('lectura.eyebrow', { n: H.desde })}</small><h1 lang="ja">${ruby(H.titulo.jp)}</h1>
    <p class="mv-his-titulo-tr">${esc(tr(H.titulo))}</p><p class="mv-his-resumen">${esc(tr(H.resumen))}</p></div>
    <button class="mv-btn" data-empezar>${t('lectura.empezar')}</button>`;
  encajar($('.mv-his-portada', c), 0.75);
  if (!quieto()) gsap.fromTo($('.mv-his-portada', c), { y: 26, opacity: 0, rotate: -1.2 }, { y: 0, opacity: 1, rotate: 0, duration: 0.5, ease: 'back.out(1.6)' });
  $('[data-empezar]', c).onclick = () => { vibrar(10); son.papel?.(); texto(v); };
}

function texto(v) {
  const c = $('.mv-his-cuerpo', v);
  let conTr = guardado('nyango.lectura.traduccion', false), conFg = guardado('nyango.lectura.furigana', true);
  c.innerHTML = `<div class="mv-his-libro-hoja${conTr ? ' con-tr' : ''}${conFg ? '' : ' sin-fg'}">
      <div class="mv-his-foto media">${portada(H.id)}</div><div class="mv-his-pag" aria-live="polite"></div><span class="mv-his-npag"></span></div>
    <div class="mv-his-mandos"><button class="mv-chip mv-his-t" data-tr aria-pressed="${conTr}">${t('mv.his.trad')}</button><button class="mv-chip mv-his-t" data-fg aria-pressed="${conFg}">${t('lectura.furigana')}</button>
      <button class="mv-chip mv-his-t" data-oir aria-label="${t('lectura.repetir')}">${PLAY}</button></div>
    <button class="mv-btn" data-sig>${t('lectura.siguiente')}</button>`;
  const hoja = $('.mv-his-libro-hoja', c), pag = $('.mv-his-pag', c), npag = $('.mv-his-npag', c), boton = $('[data-sig]', c);
  const paginas = [[]]; let i = -1, viendo = 0;
  const linea = (k) => {
    const f = H.texto[k], q = NOMBRE[f.quien] ? f.quien : 'narrador';
    return `<p class="mv-his-f quien-${COLOR[q] || 'narrador'}" data-k="${k}">${q !== 'narrador' ? `<b lang="ja">${NOMBRE[q]}</b>` : ''}<span class="jp" lang="ja">${frase(f.jp)}</span><span class="tr">${esc(tr(f))}</span></p>`;
  };
  const pintarPag = (p, anim = 0) => {
    viendo = p;
    pag.innerHTML = paginas[p].map(linea).join('');
    npag.textContent = paginas.length > 1 ? `${p + 1} / ${paginas.length}` : '';
    $$('.mv-his-f', pag).forEach((el) => { el.onclick = () => { vibrar(6); oir(H.texto[+el.dataset.k].voz); }; });
    if (anim && !quieto()) gsap.fromTo(pag, { x: anim * 40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3 });
  };
  const siguiente = () => {
    if (viendo !== paginas.length - 1) { pintarPag(paginas.length - 1, 1); return; } // estaba releyendo: primero, de vuelta
    if (i >= H.texto.length - 1) { son.papel?.(); preguntas(v); return; }
    i++; vibrar(6);
    const actual = paginas.at(-1);
    actual.push(i); pintarPag(paginas.length - 1);
    if (pag.scrollHeight > pag.clientHeight + 1 && actual.length > 1) { actual.pop(); paginas.push([i]); pintarPag(paginas.length - 1, 1); son.papel?.(); }
    const el = $$('.mv-his-f', pag).at(-1);
    if (el && !quieto()) gsap.fromTo(el, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.32, ease: 'power2.out' });
    if (autoplay) oir(H.texto[i].voz);
    $('.mv-barra i', v).style.width = `${Math.max(4, (100 * (i + 1)) / H.texto.length)}%`;
    $('.mv-rep-n', v).innerHTML = `<b>${i + 1}</b> / ${H.texto.length}`;
    boton.textContent = i === H.texto.length - 1 ? t('lectura.preguntas') : t('lectura.siguiente');
  };
  // deslizar hacia la derecha: la página de antes (para releer); hacia la izquierda, la siguiente que ya se ha leído
  let x0 = null, y0 = 0;
  hoja.addEventListener('pointerdown', (e) => { x0 = e.clientX; y0 = e.clientY; });
  hoja.addEventListener('pointerup', (e) => {
    if (x0 == null) return; const dx = e.clientX - x0, dy = e.clientY - y0; x0 = null;
    if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    if (dx > 0 && viendo > 0) { vibrar(6); pintarPag(viendo - 1, -1); } else if (dx < 0 && viendo < paginas.length - 1) { vibrar(6); pintarPag(viendo + 1, 1); }
  });
  const alternar = (b, clase, clave, val) => { b.setAttribute('aria-pressed', val); hoja.classList.toggle(clase, clase === 'sin-fg' ? !val : val); guardar(clave, val); son.toque?.(); vibrar(6); };
  $('[data-tr]', c).onclick = (e) => { conTr = !conTr; alternar(e.currentTarget, 'con-tr', 'nyango.lectura.traduccion', conTr); };
  $('[data-fg]', c).onclick = (e) => { conFg = !conFg; alternar(e.currentTarget, 'sin-fg', 'nyango.lectura.furigana', conFg); };
  $('[data-oir]', c).onclick = () => i >= 0 && oir(H.texto[i].voz);
  boton.onclick = siguiente;
  siguiente();
}

// ───────── de qué iba (y qué te ha parecido) ─────────
function preguntas(v) {
  audio?.pause();
  const lista = H.preguntas || [], comp = lista.filter((p) => (p.tipo || 'comprension') === 'comprension'), c = $('.mv-his-cuerpo', v);
  let k = 0, aciertos = 0, opinion = null;
  $('.mv-barra i', v).style.width = '100%'; $('.mv-rep-n', v).textContent = '';
  const una = () => {
    const p = lista[k], esOp = p.tipo === 'opinion';
    c.innerHTML = `<section class="mv-carta mv-his-preg"><small class="mv-his-eyebrow">${esOp ? t('lectura.opinion') : t('lectura.pregunta_n', { n: comp.indexOf(p) + 1, total: comp.length })}</small>
      <h2 lang="ja">${frase(p.jp)}</h2><button class="mv-his-veres">${t('mv.his.ver_tr')}</button><p class="mv-his-preg-tr" hidden>${esc(tr(p))}</p>
      <div class="mv-cl-ops">${p.opciones.map((o, j) => `<button class="mv-btn-claro mv-cl-op mv-his-op" data-j="${j}"><span lang="ja">${frase(o.jp)}</span><small>${esc(tr(o))}</small></button>`).join('')}</div>
      <div class="mv-his-resp"></div></section><button class="mv-btn" data-sig hidden>${k < lista.length - 1 ? t('lectura.siguiente') : t('lectura.terminar')}</button>`;
    const caja = $('.mv-his-preg', c), ops = $$('.mv-his-op', c), resp = $('.mv-his-resp', c), boton = $('[data-sig]', c);
    encajar(caja, 0.72);
    if (!quieto()) gsap.fromTo(caja, { x: 30, opacity: 0 }, { x: 0, opacity: 1, duration: 0.35, ease: 'power2.out' });
    $('.mv-his-veres', c).onclick = (e) => { e.currentTarget.hidden = true; $('.mv-his-preg-tr', c).hidden = false; encajar(caja, 0.72); };
    let hecho = false;
    ops.forEach((b) => { b.onclick = () => {
      if (hecho) return; hecho = true;
      const j = +b.dataset.j;
      ops.forEach((x) => { x.disabled = true; });
      $('.mv-his-preg-tr', c).hidden = false; $('.mv-his-veres', c).hidden = true;
      if (esOp) {
        opinion = j; b.classList.add('bien');
        const o = p.opciones[j];
        resp.innerHTML = `<div class="mv-his-nyan"><img src="/img/reparto/nyan-feliz-arriba.webp" alt=""><p><span lang="ja">${frase(o.nyan?.jp)}</span><small>${esc(tr(o.nyan))}</small></p></div>`;
        son.acierto(1); vibrar(10);
      } else if (j === p.bien) {
        aciertos++; b.classList.add('bien'); resp.innerHTML = `<p class="mv-cl-porque bien"><b>✓</b> ${t('lectura.bien')}</p>`; son.acierto(aciertos); vibrar(12); chispas(b);
      } else {
        b.classList.add('mal'); ops[p.bien]?.classList.add('bien'); son.fallo(); vibrar([18, 50, 18]);
        resp.innerHTML = `<p class="mv-cl-porque mal"><b>✗</b> ${t('lectura.mal')} ${ruby(tr(p.porque))}</p>`;
      }
      ops.forEach((x) => { if (!x.classList.contains('bien') && !x.classList.contains('mal')) x.classList.add('apagada'); });
      encajar(caja, 0.7);
      boton.hidden = false;
      if (!quieto()) gsap.fromTo([resp, boton], { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, stagger: 0.06 });
    }; });
    boton.onclick = () => { vibrar(8); k++; if (k < lista.length) una(); else fin(v, aciertos, comp.length, opinion); };
  };
  una();
}

async function fin(v, aciertos, total, opinion) {
  const c = $('.mv-his-cuerpo', v);
  c.innerHTML = `<section class="mv-his-fin"><img src="/img/reparto/nyan-${aciertos === total ? 'feliz' : 'normal'}-arriba.webp" alt="">
    <h2 class="mv-tit">${t('lectura.fin_tit')}</h2><p class="mv-his-estrellas">${'★'.repeat(aciertos)}${'☆'.repeat(Math.max(0, total - aciertos))}</p>
    <p>${t('lectura.fin_texto', { a: aciertos, t: total })}</p><p class="mv-cl-xp" hidden></p></section>
    <div class="mv-cl-pie"><div class="mv-cl-fila"><button class="mv-btn-claro" data-otra>↻ ${t('lectura.otra_vez')}</button><a class="mv-btn-claro" href="#historias">${t('mv.his.todas')}</a></div>
      <a class="mv-btn" href="#inicio">${t('mv.volver_inicio')}</a></div>`;
  $('[data-otra]', c).onclick = () => { vibrar(8); portadaHistoria(v); };
  if (!quieto()) gsap.fromTo($('.mv-his-fin', c), { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(2)' });
  let r = null;
  try { r = await api(`/api/lectura/${H.id}`, { aciertos, total, opinion }); } catch { /* sin guardar */ }
  if (!r) return;
  son.fanfarria?.(); app.inicio(true).catch(() => {});
  api('/api/sesion/fin', { respuestas: total, aciertos, mejor_racha: 0, lecciones: 0, gramatica: 0 }).catch(() => {});
  const xp = $('.mv-cl-xp', c); if (xp) { xp.innerHTML = `<b>+${r.xp} XP</b>`; xp.hidden = false; if (!quieto()) gsap.fromTo(xp, { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(2.4)' }); }
}

export async function entrar(v, resto, a) {
  app = a;
  const [id] = resto;
  if (id) await leer(v, id); else await biblioteca(v);
}
export function salir() { audio?.pause(); }
