// La guía de gramática en el móvil. #guia: el índice, un capítulo por página. #guia/<lección>: la lección como un libro,
// en páginas que caben en la pantalla (se reparten al abrirla según el tamaño del teléfono) y se pasan deslizando; al
// final, la práctica, un ejercicio por pantalla (lo que decide si está bien es lo mismo que en el escritorio:
// gramatica-ejercicios.js), y la nota.
import { gsap } from 'gsap';
import { t, tn } from '../i18n.js';
import * as son from '../sonido.js';
import { esc, ruby, textoRico, aKana, sinFurigana } from '../japones.js';
import { esInvertida, ordenBien, conjugacionBien, armar } from '../gramatica-ejercicios.js';
import { $, $$, api, vibrar, quieto, encajar, chispas, CERRAR, PLAY } from './comun.js';

const barajar = (l) => { const a = [...l]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const NOTA = [[95, '秀', 'sobresaliente'], [85, '優', 'notable'], [70, '良', 'bien'], [50, '可', 'aprobado'], [0, '再', 'otra_vuelta']];
let app = null, audio = null;

function tocar(archivo, boton) {
  if (!archivo) return;
  audio?.pause(); audio = son.pista('/media/' + encodeURIComponent(archivo));
  boton?.classList.add('sonando'); audio.onended = () => boton?.classList.remove('sonando');
  audio.play().catch(() => boton?.classList.remove('sonando'));
}
// deslizar a los lados sobre un elemento: izquierda → siguiente, derecha → anterior
function deslizar(el, sig, ant) {
  let x0 = null, y0 = 0;
  el.addEventListener('pointerdown', (e) => { if (e.target.closest('button, a, input')) return; x0 = e.clientX; y0 = e.clientY; });
  el.addEventListener('pointerup', (e) => { if (x0 == null) return; const dx = e.clientX - x0, dy = e.clientY - y0; x0 = null; if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) (dx < 0 ? sig : ant)(); });
  el.addEventListener('pointercancel', () => { x0 = null; });
}

// ───────── el índice: un capítulo por página ─────────
async function indice(v) {
  const lista = await api('/api/gramatica').catch(() => []);
  const caps = [];
  for (const l of lista) { let c = caps.find((x) => x.titulo === l.capitulo); if (!c) caps.push(c = { titulo: l.capitulo, lecciones: [] }); c.lecciones.push(l); }
  if (!caps.length) { v.innerHTML = `<p class="mv-error">${t('mv.error')}</p>`; return; }
  let cap = Math.max(0, caps.findIndex((c) => c.lecciones.some((l) => l.estado !== 'hecha')));
  const hechas = lista.filter((l) => l.estado === 'hecha').length;
  v.innerHTML = `<div class="mv-cls mv-gu-ind">
    <header class="mv-cls-cab"><a class="mv-icono-btn" href="#aprender" aria-label="${t('mv.volver')}">‹</a>
      <h1 class="mv-tit">${t('mv.apr.guia')}</h1><span class="mv-apr-cuenta">${hechas} / ${lista.length}</span></header>
    <nav class="mv-aj-seg mv-cls-pests" role="tablist">${caps.map((c, i) => `<button class="mv-cls-pest" role="tab" data-c="${i}" aria-checked="${i === cap}">${i + 1}</button>`).join('')}</nav>
    <p class="mv-cls-cap"></p><div class="mv-gu-lista"></div></div>`;
  const pintar = (dir = 0) => {
    const c = caps[cap];
    $$('.mv-cls-pest', v).forEach((b, i) => b.setAttribute('aria-checked', i === cap));
    $('.mv-cls-cap', v).textContent = c.titulo;
    const caja = $('.mv-gu-lista', v);
    caja.innerHTML = c.lecciones.map((l) => {
      const est = l.estado === 'hecha' ? `<em class="hecha">★ ${l.hecha?.mejor ?? l.ejercicios?.mejor ?? ''}%</em>` : l.estado === 'nueva' ? `<em class="nueva">${t('gramatica.estado.nueva')}</em>` : `<em>${t('gramatica.estado.leida')}</em>`;
      return `<a class="mv-gu-fila" href="#guia/${encodeURIComponent(l.slug)}"><i>${l.orden}</i><b>${ruby(l.titulo)}</b>${est}</a>`;
    }).join('');
    encajar(caja, 0.7);
    $$('a', caja).forEach((a) => a.addEventListener('click', () => vibrar(10)));
    if (!quieto()) gsap.fromTo($$('.mv-gu-fila', caja), { x: dir * 30, opacity: 0 }, { x: 0, opacity: 1, duration: 0.28, stagger: 0.02 });
  };
  const ir = (k) => { if (k < 0 || k >= caps.length || k === cap) return; const dir = k > cap ? 1 : -1; cap = k; vibrar(8); pintar(dir); };
  $$('.mv-cls-pest', v).forEach((b) => { b.onclick = () => ir(+b.dataset.c); });
  deslizar($('.mv-gu-lista', v), () => ir(cap + 1), () => ir(cap - 1));
  pintar();
}

// ───────── la lección: trozos → páginas ─────────
function bloque(b) {
  switch (b.tipo) {
    case 'regla': return [`<div class="mv-gu-regla"><strong>${ruby(b.titulo || t('gramatica.regla'))}</strong>${textoRico(b.md)}</div>`];
    case 'ojo': return [`<div class="mv-gu-ojo">${textoRico(b.md)}</div>`];
    case 'tabla': return [`<div class="mv-gu-tabla"><table><thead><tr>${(b.columnas || []).map((c) => `<th>${textoRico(c)}</th>`).join('')}</tr></thead><tbody>${(b.filas || []).map((f) => `<tr>${f.map((c) => `<td>${textoRico(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`];
    case 'ejemplos': return (b.items || []).map((e, i) => `<div class="mv-gu-ej"><span>${i + 1}</span><div><div class="jp" lang="ja">${ruby(e.jp)}</div><div class="es">${esc(e.es)}</div>${e.nota ? `<div class="nota">${textoRico(e.nota)}</div>` : ''}</div></div>`);
    case 'dialogo': return (b.lineas || []).map((l) => `<div class="mv-gu-ej dialogo"><span>${esc(l.quien)}</span><div><div class="jp" lang="ja">${ruby(l.jp)}</div><div class="es">${esc(l.es)}</div></div></div>`);
    default: return String(b.md || '').split(/\n\n+/).filter((x) => x.trim()).map((p) => ({ html: `<p>${textoRico(p)}</p>`, md: p }));
  }
}
function trozos(lec) {
  const out = [{ html: `<header class="mv-gu-portada"><small>${t('gramatica.leccion.eyebrow', { capitulo: esc(lec.capitulo || ''), orden: lec.orden })}</small>
    <h1>${ruby(lec.titulo)}</h1>${lec.resumen ? `<p class="mv-gu-resumen">${textoRico(lec.resumen)}</p>` : ''}</header>` }];
  (lec.secciones || []).forEach((s, sec) => {
    out.push({ html: `<h2>${ruby(s.titulo || '')}</h2>`, tit: true, sec });
    for (const b of s.bloques || []) for (const h of bloque(b)) out.push(typeof h === 'string' ? { html: h, sec } : { ...h, sec });
  });
  const tus = lec.en_tus_palabras || [];
  if (tus.length) {
    out.push({ html: `<h2>${t('gramatica.en_tus')}</h2>`, tit: true });
    tus.forEach((x) => out.push({ html: `<div class="mv-gu-ej tus"><button class="mv-gu-oir"${x.audio ? ` data-audio="${esc(x.audio)}"` : ' disabled'} aria-label="${t('mv.escuchar')}">${PLAY}</button>
      <div><div class="jp" lang="ja">${ruby(x.frase)}</div><div class="es">${esc(x.frase_es || '')}</div>${x.nota ? `<div class="nota">${textoRico(x.nota)}</div>` : ''}</div></div>` }));
  }
  return out;
}
// reparte los trozos en páginas que quepan en la hoja (se mide con una copia invisible del mismo tamaño); un título nunca
// se queda solo al final de una página
// un párrafo largo que no cabe en lo que queda de página se parte por frases (sin romper una negrita **…**)
function frases(md) {
  const partes = md.split(/(?<=[.!?。…»:])\s+(?=[^\s])/), out = [];
  for (const x of partes) { const prev = out.at(-1); if (prev != null && ((prev.match(/\*\*/g) || []).length % 2)) out[out.length - 1] = prev + ' ' + x; else out.push(x); }
  return out;
}
function paginar(lista, medir) {
  const pags = []; let act = [];
  medir.innerHTML = '';
  for (let tr of lista) {
    medir.insertAdjacentHTML('beforeend', tr.html);
    if (medir.scrollHeight > medir.clientHeight + 1 && act.length && tr.md) {
      // ¿cabe el principio del párrafo? lo que quepa se queda aquí y el resto empieza la página siguiente
      medir.lastElementChild.remove();
      const fs = frases(tr.md); let k = 0;
      for (; k < fs.length; k++) {
        medir.insertAdjacentHTML('beforeend', `<p>${textoRico(fs.slice(0, k + 1).join(' '))}</p>`);
        const sale = medir.scrollHeight > medir.clientHeight + 1; medir.lastElementChild.remove();
        if (sale) break;
      }
      if (k > 0 && k < fs.length) {
        act.push({ html: `<p>${textoRico(fs.slice(0, k).join(' '))}</p>`, sec: tr.sec });
        tr = { html: `<p>${textoRico(fs.slice(k).join(' '))}</p>`, md: fs.slice(k).join(' '), sec: tr.sec };
        pags.push(act); act = [tr]; medir.innerHTML = tr.html;
        continue;
      }
      medir.insertAdjacentHTML('beforeend', tr.html);
    }
    if (medir.scrollHeight > medir.clientHeight + 1 && act.length) {
      const pasa = act.at(-1).tit && act.length > 1 ? [act.pop()] : [];
      pags.push(act); act = [...pasa, tr];
      medir.innerHTML = act.map((x) => x.html).join('');
    } else act.push(tr);
  }
  if (act.length) pags.push(act);
  medir.innerHTML = '';
  // cada página sabe de qué sección es (la de su último trozo): sus tarjetas salen en la cabecera
  return pags.map((a) => ({ html: a.map((x) => x.html).join(''), sec: [...a].reverse().find((x) => x.sec != null)?.sec ?? null }));
}

// ───────── tarjetas de la guía (11-10): las de la sección que lees, a tu repaso ─────────
const TARJ = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><rect x="3.5" y="6" width="12" height="15" rx="2.5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M8.5 3.5h9a3 3 0 0 1 3 3v11" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
const fichasDe = (lec, sec) => (lec.fichas || []).filter((f) => f.seccion === sec);
async function cambiarFichas(lec, ids, quitar) {
  if (!ids.length) return;
  try { const r = await api(`/api/gramatica/${encodeURIComponent(lec.slug)}/fichas`, { ids, quitar }); lec.fichas_mias = r.fichas_mias; } catch { return; }
  if (quitar) son.toque?.(); else { son.burbuja?.(); vibrar(12); }
}
function hojaFichas(lec, sec, alCambiar) {
  if ($('.mv-gu-fh')) return;
  const raiz = document.createElement('div');
  raiz.className = 'mv-aj mv-gu-fh'; raiz.setAttribute('role', 'dialog'); raiz.setAttribute('aria-modal', 'true');
  $('#movil').appendChild(raiz);
  const cerrar = () => { raiz.remove(); alCambiar(); };
  const pintar = () => {
    const fs = fichasDe(lec, sec), mias = lec.fichas_mias || {}, faltan = fs.filter((f) => !(f.id in mias));
    const todasLec = (lec.fichas || []).filter((f) => !(f.id in mias));
    raiz.innerHTML = `<div class="mv-aj-velo"></div><div class="mv-hoja mv-aj-hoja"><i class="mv-agarre" aria-hidden="true"></i>
      <header class="mv-aj-cab"><h2 class="mv-tit">${t('gramatica.fichas.tit')}</h2><button class="mv-icono-btn" data-cerrar aria-label="${t('mv.cerrar')}">${CERRAR}</button></header>
      <p class="mv-aj-pista">${t('gramatica.fichas.sub_movil')}</p>
      <div class="mv-gu-fh-lista">${fs.map((f) => { const m = mias[f.id];
        return `<button class="mv-gu-fh-fila${m ? ' si' : ''}" data-ficha="${esc(f.id)}"><span>${esc(f.titulo)}${m?.espera ? `<small>${t('gramatica.fichas.espera', { dia: new Date(m.espera * 1000).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric' }) })}</small>` : ''}</span><i aria-hidden="true">${m ? '✓' : '+'}</i></button>`; }).join('')}</div>
      <div class="mv-cl-fila">${faltan.length ? `<button class="mv-btn" data-sec>${tn('gramatica.fichas.anadir_n', faltan.length)}</button>` : ''}
        ${todasLec.length > faltan.length ? `<button class="mv-btn-claro" data-todas>${t('gramatica.fichas.toda', { n: todasLec.length })}</button>` : ''}</div></div>`;
    $('[data-cerrar]', raiz).onclick = cerrar; $('.mv-aj-velo', raiz).onclick = cerrar;
    $$('[data-ficha]', raiz).forEach((b) => { b.onclick = async () => { const id = b.dataset.ficha; await cambiarFichas(lec, [id], id in (lec.fichas_mias || {})); pintar(); }; });
    const bs = $('[data-sec]', raiz); if (bs) bs.onclick = async () => { await cambiarFichas(lec, faltan.map((f) => f.id), false); pintar(); };
    const bt = $('[data-todas]', raiz); if (bt) bt.onclick = async () => { await cambiarFichas(lec, todasLec.map((f) => f.id), false); pintar(); };
    encajar($('.mv-gu-fh-lista', raiz), 0.75);
  };
  pintar();
  if (!quieto()) gsap.fromTo($('.mv-hoja', raiz), { y: '100%' }, { y: '0%', duration: 0.42, ease: 'back.out(1.1)' });
}

async function leccion(v, slug) {
  v.innerHTML = `<div class="mv-rep mv-cargando"><div class="mv-etq">${t('mv.gu.abriendo')}</div></div>`;
  let lec;
  try { lec = await api('/api/gramatica/' + encodeURIComponent(slug)); } catch { v.innerHTML = `<div class="mv-pronto"><h2 class="mv-tit">${t('mv.gu.no_existe')}</h2><a class="mv-btn" href="#guia">${t('mv.gu.volver')}</a></div>`; return; }
  api(`/api/gramatica/${encodeURIComponent(slug)}/vista`, {}).catch(() => {});
  v.innerHTML = `<div class="mv-gu">
    <header class="mv-rep-cab"><a class="mv-icono-btn" href="#guia" aria-label="${t('mv.gu.volver')}">${CERRAR}</a><div class="mv-barra"><i></i></div><span class="mv-rep-n"></span>
      <button class="mv-gu-tarj" data-tarj hidden>${TARJ}<b></b></button></header>
    <article class="mv-carta mv-gu-hoja"><div class="mv-gu-pag"></div><div class="mv-gu-pag mv-gu-medir" aria-hidden="true"></div></article>
    <footer class="mv-lec-botones"><button class="mv-btn-claro mv-lec-atras" data-ant aria-label="${t('mv.lec.atras')}">‹</button><button class="mv-btn" data-sig></button></footer></div>`;
  const hoja = $('.mv-gu-hoja', v), pag = $('.mv-gu-pag:not(.mv-gu-medir)', v), medir = $('.mv-gu-medir', v);
  await document.fonts?.ready?.catch?.(() => {});
  let paginas = paginar(trozos(lec), medir), i = 0;
  const tarjetas = () => {
    const b = $('[data-tarj]', v), fs = fichasDe(lec, paginas[i]?.sec), mias = lec.fichas_mias || {};
    b.hidden = !fs.length || !lec.fichas_mias;
    if (b.hidden) return;
    const n = fs.filter((f) => f.id in mias).length;
    b.classList.toggle('todas', n === fs.length);
    $('b', b).textContent = n === fs.length ? '✓' : String(fs.length - n);
    b.setAttribute('aria-label', tn('gramatica.fichas.n', fs.length));
  };
  $('[data-tarj]', v).onclick = () => { vibrar(8); hojaFichas(lec, paginas[i]?.sec, tarjetas); };
  const pintar = (dir = 0) => {
    pag.innerHTML = paginas[i].html; pag.style.fontSize = ''; encajar(pag, 0.75);
    tarjetas();
    $('.mv-barra i', v).style.width = `${Math.max(4, (100 * (i + 1)) / paginas.length)}%`;
    $('.mv-rep-n', v).innerHTML = `<b>${i + 1}</b> / ${paginas.length}`;
    $('[data-ant]', v).hidden = i === 0;
    const ultima = i === paginas.length - 1, hayEj = (lec.ejercicios || []).length > 0;
    $('[data-sig]', v).textContent = ultima ? (hayEj ? t('gramatica.leccion.ir_practica') : t('mv.gu.volver')) : t('mv.siguiente');
    $$('.mv-gu-oir[data-audio]', pag).forEach((b) => { b.onclick = () => tocar(b.dataset.audio, b); });
    if (!quieto() && dir) gsap.fromTo(pag, { x: dir * 50, opacity: 0 }, { x: 0, opacity: 1, duration: 0.32, ease: 'power2.out' });
    if (dir) son.papel?.();
  };
  const sig = () => {
    vibrar(8);
    if (i < paginas.length - 1) { i++; pintar(1); return; }
    if ((lec.ejercicios || []).length) practica(v, lec, armar(lec, false)); else location.hash = 'guia';
  };
  const ant = () => { if (i > 0) { vibrar(8); i--; pintar(-1); } };
  $('[data-sig]', v).onclick = sig; $('[data-ant]', v).onclick = ant;
  deslizar(hoja, sig, ant);
  // si cambia el tamaño (se gira el teléfono), se vuelve a repartir, manteniendo más o menos el sitio
  let reloj = 0;
  addEventListener('resize', function rehacer() {
    if (!pag.isConnected) { removeEventListener('resize', rehacer); return; }
    clearTimeout(reloj); reloj = setTimeout(() => { const f = i / paginas.length; paginas = paginar(trozos(lec), medir); i = Math.min(paginas.length - 1, Math.round(f * paginas.length)); pintar(); }, 250);
  });
  pintar();
}

// ───────── la práctica: un ejercicio por pantalla ─────────
function practica(v, lec, ejs) {
  const st = { i: 0, bien: 0, racha: 0 };
  v.innerHTML = `<div class="mv-gu mv-gu-prac">
    <header class="mv-rep-cab"><a class="mv-icono-btn" href="#guia" aria-label="${t('mv.gu.volver')}">${CERRAR}</a>
      <div class="mv-gu-pips">${ejs.map(() => '<i></i>').join('')}</div><span class="mv-rep-n"></span></header>
    <div class="mv-carta mv-gu-ejer"></div><div class="mv-gu-pie"></div></div>`;
  const caja = $('.mv-gu-ejer', v), pie = $('.mv-gu-pie', v), pips = $$('.mv-gu-pips i', v);
  const cerrar = (ok, extra = '') => {
    const e = ejs[st.i];
    if (ok) { st.bien++; st.racha++; son.acierto(st.racha); vibrar(12); } else { st.racha = 0; son.fallo(); vibrar([18, 50, 18]); }
    pips[st.i].className = ok ? 'ok' : 'ko';
    const ex = $('.mv-gu-explica', caja);
    ex.hidden = false; ex.className = `mv-gu-explica ${ok ? 'bien' : 'mal'}`;
    ex.innerHTML = `${extra}<b>${ok ? (e.tipo === 'elegir' && esInvertida(e) ? t('gramatica.ej.bien_visto') : t('gramatica.ej.bien')) : t('gramatica.ej.mal')}</b> ${textoRico(e.explica || '')}`;
    encajar(caja, 0.7);
    pie.innerHTML = `<button class="mv-btn" data-sig>${st.i < ejs.length - 1 ? t('mv.siguiente') : t('mv.gu.ver_nota')}</button>`;
    $('[data-sig]', pie).onclick = () => { vibrar(8); st.i++; if (st.i < ejs.length) pintar(); else fin(v, lec, st.bien, ejs.length); };
    if (!quieto()) gsap.fromTo([ex, $('[data-sig]', pie)], { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, stagger: 0.05 });
  };
  function pintar() {
    const e = ejs[st.i];
    $('.mv-rep-n', v).innerHTML = `<b>${st.i + 1}</b> / ${ejs.length}`;
    pips.forEach((p, k) => p.classList.toggle('aqui', k === st.i));
    const enun = e.pregunta || (e.tipo === 'ordenar' ? t('gramatica.ej.ordena') : e.tipo === 'conjugar' ? t('gramatica.ej.conjuga', { base: sinFurigana(e.base), forma: e.forma }) : t('gramatica.ej.elige'));
    const cab = `${e.enunciado ? `<div class="mv-gu-enun">${esc(e.enunciado)}</div>` : ''}<p class="mv-gu-preg">${textoRico(enun)}</p>`;
    pie.innerHTML = '';
    if (e.tipo === 'elegir') {
      const inv = esInvertida(e), ops = barajar((e.opciones || []).map((o, k) => ({ o, k })));
      caja.innerHTML = `${cab}${inv ? `<div class="mv-gu-busca">${t('gramatica.ej.busca_mal')}</div>` : ''}${e.jp ? `<div class="mv-gu-jp" lang="ja">${ruby(e.jp)}</div>` : ''}
        <div class="mv-cl-ops">${ops.map(({ o, k }) => `<button class="mv-btn-claro mv-cl-op" data-k="${k}"><span lang="ja">${ruby(o)}</span></button>`).join('')}</div><div class="mv-gu-explica" hidden></div>`;
      $$('.mv-cl-op', caja).forEach((b) => { b.onclick = () => {
        const ok = +b.dataset.k === e.correcta, botones = $$('.mv-cl-op', caja);
        botones.forEach((x) => { x.disabled = true; });
        if (inv) botones.forEach((x) => { if (+x.dataset.k === e.correcta) { x.classList.add('mal'); x.insertAdjacentHTML('afterbegin', `<small class="mv-gu-tag">${t('gramatica.ej.tag_mal')}</small>`); } else if (x === b) x.classList.add('apagada'); });
        else botones.forEach((x) => { if (+x.dataset.k === e.correcta) x.classList.add('bien'); else if (x === b) x.classList.add('mal'); else x.classList.add('apagada'); });
        if (ok) chispas(b);
        cerrar(ok, e.corregida ? `<span class="mv-gu-corr"><small>${t('gramatica.ej.corregida_bien')}</small> <span lang="ja">${ruby(e.corregida)}</span></span>` : '');
      }; });
    } else if (e.tipo === 'ordenar') {
      const piezas = barajar((e.piezas || []).map((p, k) => ({ p, k })));
      caja.innerHTML = `${cab}${e.es ? `<p class="mv-gu-pista">${esc(e.es)}</p>` : ''}<div class="mv-gu-destino"></div>
        <div class="mv-gu-origen">${piezas.map(({ p, k }) => `<button class="mv-cl-pieza" data-k="${k}" data-tipo="palabra"><span lang="ja">${ruby(p)}</span></button>`).join('')}</div><div class="mv-gu-explica" hidden></div>`;
      const destino = $('.mv-gu-destino', caja), origen = $('.mv-gu-origen', caja);
      let hecho = false;
      $$('.mv-cl-pieza', caja).forEach((b) => { b.onclick = () => {
        if (hecho) return;
        (b.parentElement === origen ? destino : origen).appendChild(b); son.toque?.(); vibrar(6);
        if (!quieto()) gsap.fromTo(b, { y: -8, scale: 0.9 }, { y: 0, scale: 1, duration: 0.3, ease: 'back.out(2.5)' });
        if (!origen.children.length) {
          hecho = true;
          const { ok, exacto } = ordenBien(e, [...destino.children].map((x) => +x.dataset.k));
          destino.classList.add(ok ? 'bien' : 'mal');
          const frase = e.piezas.map((p) => ruby(p)).join(' ');
          cerrar(ok, !ok ? `<span class="mv-gu-corr">${t('gramatica.ej.orden_correcto', { frase })}</span>` : !exacto ? `<span class="mv-gu-corr">${t('gramatica.ej.orden_tambien', { frase })}</span>` : '');
        }
      }; });
    } else {
      caja.innerHTML = `${cab}<form class="mv-gu-form"><input lang="ja" placeholder="${t('gramatica.ej.ph')}" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="${t('gramatica.ej.tu_respuesta')}"></form><div class="mv-gu-explica" hidden></div>`;
      pie.innerHTML = `<button class="mv-btn" data-comprobar>${t('mv.gu.comprobar')}</button>`;
      const inp = $('input', caja);
      inp.addEventListener('input', () => { if (/[a-z]/i.test(inp.value)) inp.value = aKana(inp.value); });
      const comprobar = (ev) => {
        ev?.preventDefault(); if (inp.readOnly) return;
        const ok = conjugacionBien(e, inp.value); if (ok === null) return;
        inp.readOnly = true; inp.blur(); inp.classList.add(ok ? 'bien' : 'mal');
        cerrar(ok, ok ? '' : `<span class="mv-gu-corr">${t('gramatica.ej.respuesta', { r: esc(sinFurigana((e.respuestas || [])[0] || '')) })}</span>`);
      };
      $('form', caja).onsubmit = comprobar; $('[data-comprobar]', pie).onclick = comprobar;
    }
    encajar(caja, 0.7);
    if (!quieto()) gsap.fromTo(caja, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: 'back.out(1.5)' });
  }
  pintar();
}

async function fin(v, lec, bien, total) {
  const pct = total ? Math.round((100 * bien) / total) : 0, [, sello, nota] = NOTA.find(([m]) => pct >= m);
  let r = null;
  try { r = await api('/api/gramatica/' + encodeURIComponent(lec.slug), { aciertos: bien, total }); } catch { /* sin guardar */ }
  api('/api/sesion/fin', { respuestas: total, aciertos: bien, mejor_racha: 0, lecciones: 0, gramatica: 1 }).catch(() => {});
  app.inicio(true).catch(() => {});
  son.fanfarria?.();
  v.innerHTML = `<div class="mv-rep mv-fin">
    <div class="mv-fin-cab"><div class="mv-etq">${t('gramatica.fin.completada')}</div><div class="mv-fin-sello" lang="ja">${sello}</div>
      <div class="mv-fin-nota">${t('gramatica.nota.' + nota)}</div>${r?.record ? `<div class="mv-gu-record">${t('gramatica.fin.record')}</div>` : ''}</div>
    <div class="mv-fin-stats">
      <div class="mv-carta"><b>${bien}/${total}</b><small>${t('mv.gu.aciertos')} · ${pct}%</small></div>
      <div class="mv-carta oro"><b>+${r?.xp ?? 0}</b><small>XP</small></div></div>
    ${r?.tarjetas_nuevas ? `<div class="mv-carta mv-fin-premio"><span>${t('ep.final.tarjetas', { n: r.tarjetas_nuevas })}</span></div>` : ''}
    <div class="mv-fin-pie"><button class="mv-btn" data-otra>${t('gramatica.fin.repetir')}</button><a class="mv-btn-claro" href="#guia">${t('mv.gu.volver')}</a></div></div>`;
  $('[data-otra]', v).onclick = () => practica(v, lec, armar(lec, true));
  if (!quieto()) {
    gsap.fromTo($('.mv-fin-sello', v), { scale: 3, rotate: -30, opacity: 0 }, { scale: 1, rotate: -7, opacity: 1, duration: 0.35, ease: 'power4.in', delay: 0.2, onComplete: () => { son.sello?.(); vibrar(25); } });
    gsap.fromTo($$('.mv-fin-stats > *', v), { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.07, delay: 0.5, ease: 'back.out(2)' });
  }
}

export async function entrar(v, resto, a) {
  app = a;
  const [slug] = resto;
  if (slug) await leccion(v, slug); else await indice(v);
}
export function salir() { audio?.pause(); }
