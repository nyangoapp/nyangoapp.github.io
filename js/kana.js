// La sección de kana (02-10).
//  #kana            la tabla (hiragana | katakana; básicos, con ゛ y ゜, combinados y, en katakana, los sonidos de fuera) y la
//                   ficha del elegido: se dibuja trazo a trazo, suena, su mnemotecnia, con qué se confunde y palabras de ejemplo
//  #kana/practica   rondas cortas: ver → sonido, oír → kana, sonido → kana, con las columnas que elijas
// Datos: web/kana/kana.json (herramientas/kana.py; trazos de KanjiVG, CC BY-SA 3.0) · voz: web/kana/voz/<romaji>.mp3
// En la tabla no hay Nyan en 3D: reacciona con sus renders (web/img/reparto/nyan-*.webp), nunca dibujado en 2D.
import { gsap } from 'gsap';
import { $, $$, api, registrar, flotar, quieto, estado } from './app.js';
import * as son from './sonido.js';
import { esc } from './japones.js';
import { kbd, escribiendo, capaAbierta } from './teclado.js';
import { t, tn, idioma } from './i18n.js';
import { xpVuela, htmlBarraXP, ponerXP, xpActual } from './recompensas.js';

const V = () => $('#v-kana');
const ESCRITURAS = ['hiragana', 'katakana'];
const VOCALES = { basicos: ['a', 'i', 'u', 'e', 'o'], tenten: ['a', 'i', 'u', 'e', 'o'], combinados: ['a', 'u', 'o'], extra: [] };
const RONDA = 12;
let D = null, mio = {}, escritura = 'hiragana', grupo = 'basicos', sel = null, elegidas = {}, audio = null, fase = 'tabla', ronda = null;
const cargar = async () => (D ||= await fetch('/kana/kana.json').then((r) => r.json()));
const dominio = (k) => mio[k]?.n || 0;
const grupoActual = () => D.tablas[escritura].find((g) => g.id === grupo) || D.tablas[escritura][0];
const negrita = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
const consonante = (fila) => { const k = fila.find(Boolean); return k ? D.kana[k].r.replace(/[aiueo]$/, '') || '·' : ''; };
const vertical = () => matchMedia('(max-aspect-ratio: 4/5), (max-width: 700px)').matches;

function sonar(k, boton = null) {
  const r = D.kana[k]?.r; if (!r) return;
  audio?.pause();
  audio = son.pista(`/kana/voz/${r}.mp3`);
  boton?.classList.add('sonando'); audio.onended = audio.onpause = () => boton?.classList.remove('sonando');
  audio.play().catch(() => boton?.classList.remove('sonando'));
}

// ───────────────────────── la tabla ─────────────────────────
// columnas elegidas para practicar (por escritura y grupo): las que ya has tocado y la siguiente; al menos una
function columnasPorDefecto(g) {
  const tocadas = g.filas.map((f, i) => (f.some((k) => k && dominio(k) > 0) ? i : -1)).filter((i) => i >= 0);
  const sig = g.filas.findIndex((f, i) => !tocadas.includes(i));
  return new Set([...tocadas, ...(sig >= 0 ? [sig] : [])].slice(0, g.filas.length));
}
const claveSel = () => `${escritura}:${grupo}`;
const elegidasAhora = () => (elegidas[claveSel()] ||= columnasPorDefecto(grupoActual()));
const poolPractica = () => { const g = grupoActual(), s = elegidasAhora(); return g.filas.flatMap((f, i) => (s.has(i) ? f.filter(Boolean) : [])); };
const dominados = (esc_) => D.tablas[esc_][0].filas.flat().filter((k) => k && dominio(k) >= 3).length;
const totalBasicos = (esc_) => D.tablas[esc_][0].filas.flat().filter(Boolean).length;

function cabecera() {
  return `<header class="cab-papel kn-cab"><button class="volver" data-volver>${t('estudio.salir')} ${kbd('Esc')}</button>
    <div class="kn-escrituras" role="tablist">${ESCRITURAS.map((e) => `<button role="tab" class="kn-esc ${e === escritura ? 'si' : ''}" data-esc="${e}" aria-selected="${e === escritura}">
      <b lang="ja">${e === 'hiragana' ? 'ひらがな' : 'カタカナ'}</b><span>${t(`kana.${e}`)}</span><small>${t('kana.dominados', { n: dominados(e), total: totalBasicos(e) })}</small></button>`).join('')}</div>
    <div class="contador">${htmlBarraXP()}</div></header>`;
}
function pintarTabla() {
  fase = 'tabla';
  const g = grupoActual(), ancho = Math.max(...g.filas.map((f) => f.length)), vocales = VOCALES[g.id] || [], s = elegidasAhora();
  const celdas = [`<span class="kn-esquina"></span>`, ...Array.from({ length: ancho }, (_, i) => `<span class="kn-eje">${vocales[i] || ''}</span>`)];
  g.filas.forEach((f, i) => {
    celdas.push(`<button class="kn-col ${s.has(i) ? 'si' : ''}" data-col="${i}" aria-pressed="${s.has(i)}" title="${t('kana.columna')}">${esc(consonante(f))}</button>`);
    for (let j = 0; j < ancho; j++) {
      const k = f[j];
      celdas.push(k ? `<button class="kn-celda d${Math.min(5, dominio(k))} ${k.length > 1 ? 'doble' : ''} ${s.has(i) ? 'en' : ''} ${k === sel ? 'sel' : ''}" data-k="${k}" data-col="${i}"><b lang="ja">${k}</b><small>${D.kana[k].r}</small><i class="kn-dom"></i></button>`
        : '<span class="kn-vacia"></span>');
    }
  });
  const v = V(), n = poolPractica().length;
  v.innerHTML = cabecera() + `<div class="kn-cuerpo">
    <nav class="kn-grupos">${D.tablas[escritura].map((x) => `<button class="kn-grupo ${x.id === g.id ? 'si' : ''}" data-grupo="${x.id}">${t(`kana.grupo.${x.id}`)}</button>`).join('')}</nav>
    <div class="kn-mesa"><div class="kn-tabla ${vertical() ? 'vertical' : ''}" style="--filas:${ancho};--cols:${g.filas.length}">${celdas.join('')}</div>
      <aside class="kn-ficha" aria-live="polite"></aside></div></div>
    <div class="pie-accion kn-pie"><span class="kn-pista">${Object.keys(mio).length ? t('kana.pista_columnas') : t('kana.pista_nuevo')}</span>
      <button class="boton-tinta" id="kn-practicar" ${n ? '' : 'disabled'}>${tn('kana.practicar', n)} ${kbd('P')}</button></div>`;
  enlazarTabla();
  if (!quieto()) gsap.fromTo($$('.kn-celda', v), { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(2.2)', stagger: { each: 0.008, from: 'start' } });
  if (sel && D.kana[sel]) pintarFicha(sel, false);
  else pintarFichaVacia();
}
function enlazarTabla() {
  const v = V();
  $$('.kn-esc', v).forEach((b) => (b.onclick = () => { if (b.dataset.esc === escritura) return; son.cambio(ESCRITURAS.indexOf(b.dataset.esc)); escritura = b.dataset.esc; grupo = 'basicos'; sel = null; pintarTabla(); }));
  $$('.kn-grupo', v).forEach((b) => (b.onclick = () => { if (b.dataset.grupo === grupo) return; son.toque(); grupo = b.dataset.grupo; sel = null; pintarTabla(); }));
  $$('.kn-celda', v).forEach((b) => (b.onclick = () => elegir(b.dataset.k)));
  $$('.kn-col', v).forEach((b) => (b.onclick = () => {
    const s = elegidasAhora(), i = +b.dataset.col;
    if (s.has(i) && s.size > 1) s.delete(i); else s.add(i);
    son.toque();
    b.classList.toggle('si', s.has(i)); b.setAttribute('aria-pressed', s.has(i));
    $$(`.kn-celda[data-col="${i}"]`, v).forEach((c) => c.classList.toggle('en', s.has(i)));
    const btn = $('#kn-practicar', v), n = poolPractica().length;
    btn.innerHTML = `${tn('kana.practicar', n)} ${kbd('P')}`; btn.disabled = !n;
  }));
  $('#kn-practicar', v).onclick = () => { location.hash = 'kana/practica'; };
}
function elegir(k, sonido = true) {
  sel = k;
  $$('.kn-celda.sel', V()).forEach((c) => c.classList.remove('sel'));
  const c = $(`.kn-celda[data-k="${k}"]`, V()); c?.classList.add('sel');
  if (c && !quieto()) gsap.fromTo(c, { scale: 0.86 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
  pintarFicha(k, sonido);
}
function pintarFichaVacia() {
  const f = $('.kn-ficha', V()); if (!f) return;
  f.classList.remove('abierta');
  f.innerHTML = `<div class="kn-ficha-vacia"><img src="/img/reparto/nyan-feliz-i.webp" alt="" draggable="false"><p>${t('kana.ficha.vacia')}</p></div>`;
}
// lo que explica cada kana: su mnemotecnia o, si se forma con otros, la regla (が = か + ゛)
function explicacion(k) {
  const it = D.kana[k], mn = it[idioma] || it.es;
  if (mn) return `<p class="kn-mnemo">${negrita(mn)}</p>`;
  const base = k.normalize('NFD');
  if (k.length === 1 && base.length === 2) {
    const b = base[0], maru = base[1] === '゚';
    return `<p class="kn-mnemo">${t(maru ? 'kana.regla.maru' : 'kana.regla.tenten', { base: `<b lang="ja">${b}</b>`, rb: D.kana[b]?.r || '', r: `<b>${it.r}</b>` })}</p>`;
  }
  if (it.partes) return `<p class="kn-mnemo">${t(grupo === 'extra' ? 'kana.regla.extra' : 'kana.regla.combinado', { a: `<b lang="ja">${it.partes[0]}</b>`, b: `<b lang="ja">${it.partes[1]}</b>`, r: `<b>${it.r}</b>` })}</p>`;
  return '';
}
function svgTrazos(k) {
  const it = D.kana[k], partes = it.partes || [k], W = partes.length > 1 ? 168 : 109;
  let n = 0;
  const grupos = partes.map((pk, j) => {
    const tr = D.kana[pk]?.trazos || [];
    return `<g transform="translate(${j ? 62 : 0} 0)">${tr.map((d) => `<path class="kn-sombra" d="${d}"/>`).join('')}${tr.map((d) => `<path class="kn-t" data-n="${++n}" d="${d}"/>`).join('')}</g>`;
  }).join('');
  return `<svg class="kn-svg" viewBox="-4 -4 ${W + 8} 117" role="img" aria-label="${k}">
    <g class="kn-masu"><rect x="0" y="0" width="${W}" height="109" rx="10"/><path d="M${W / 2} 4V105M4 54.5H${W - 4}"/></g>${grupos}</svg>`;
}
let trazando = [];
function animarTrazos(svg) {
  trazando.forEach((a) => a.cancel()); trazando = [];
  $$('.kn-num', svg).forEach((x) => x.remove());
  let t0 = 250;
  $$('.kn-t', svg).forEach((p) => {
    const L = p.getTotalLength(), dur = Math.max(320, L * 9);
    const pt = p.getPointAtLength(0), num = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    num.setAttribute('class', 'kn-num'); num.setAttribute('x', pt.x - 4); num.setAttribute('y', pt.y - 3); num.textContent = p.dataset.n;
    p.parentNode.appendChild(num);
    if (quieto()) return;
    p.style.strokeDasharray = `${L} ${L}`;
    trazando.push(p.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: dur, delay: t0, fill: 'backwards', easing: 'cubic-bezier(.45,.05,.4,1)' }));
    trazando.push(num.animate([{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 260, delay: t0, fill: 'backwards', easing: 'cubic-bezier(.3,1.6,.5,1)' }));
    setTimeout(() => { if (svg.isConnected) son.pincel(); }, t0);
    t0 += dur + 170;
  });
}
const resaltar = (s, k) => esc(s).split(esc(k)).join(`<mark>${esc(k)}</mark>`);
async function pintarFicha(k, sonido = true) {
  const f = $('.kn-ficha', V()); if (!f) return;
  const it = D.kana[k], parecidos = D.parecidos.find((g) => g.includes(k))?.filter((x) => x !== k) || [];
  f.innerHTML = `<button class="kn-cerrar" aria-label="${t('kana.ficha.cerrar')}">✕</button>
    <div class="kn-ficha-cab"><div class="kn-dibujo">${svgTrazos(k)}<button class="kn-otra" title="${t('kana.trazos')} (T)">↻ ${kbd('T')}</button></div>
      <div class="kn-sonido"><b class="kn-romaji">${it.r}</b><button class="kn-oir" title="${t('kana.escuchar')} (${t('kana.espacio')})" aria-label="${t('kana.escuchar')}">▶</button>
        <span class="kn-estrellas" title="${t('kana.dominio')}">${[1, 2, 3, 4, 5].map((i) => `<i class="${dominio(k) >= i ? 'si' : ''}"></i>`).join('')}</span></div></div>
    ${explicacion(k)}
    ${parecidos.length ? `<div class="kn-parece"><span>${t('kana.parece')}</span>${parecidos.map((p) => `<button class="kn-chip" data-k="${p}"><b lang="ja">${p}</b>${D.kana[p]?.r || ''}</button>`).join('')}</div>` : ''}
    <div class="kn-ejemplos"><span>${t('kana.palabras', { k })}</span><div class="kn-lista"></div></div>`;
  f.classList.add('abierta');
  const svg = $('.kn-svg', f);
  animarTrazos(svg);
  $('.kn-otra', f).onclick = () => animarTrazos(svg);
  $('.kn-oir', f).onclick = (e) => sonar(k, e.currentTarget);
  $('.kn-cerrar', f).onclick = () => { sel = null; $$('.kn-celda.sel', V()).forEach((c) => c.classList.remove('sel')); pintarFichaVacia(); };
  $$('.kn-chip', f).forEach((b) => (b.onclick = () => irA(b.dataset.k)));
  if (!quieto()) gsap.fromTo($$('.kn-ficha > *:not(.kn-cerrar)', f), { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease: 'back.out(1.8)' });
  if (sonido) sonar(k, $('.kn-oir', f));
  let ej = [];
  try { ej = await api(`/api/kana/ejemplos?k=${encodeURIComponent(k)}&lang=${idioma}`); } catch {}
  if (sel !== k) return;
  const lista = $('.kn-lista', f); if (!lista) return;
  lista.innerHTML = ej.length ? ej.map((w) => {
    const jp = w.palabra.includes(k) && !/[一-鿿]/.test(w.palabra) ? resaltar(w.palabra, k) : `${esc(w.palabra)}<small class="kn-lect">${resaltar(w.lectura || '', k)}</small>`;
    return `<button class="kn-palabra" ${w.audio ? `data-audio="${esc(w.audio)}"` : ''}><span lang="ja">${jp}</span><small>${esc(w.es || '')}</small>${w.audio ? '<i>▶</i>' : ''}</button>`;
  }).join('') : `<p class="kn-nada">${t('kana.sin_palabras')}</p>`;
  $$('.kn-palabra[data-audio]', lista).forEach((b) => (b.onclick = () => { audio?.pause(); audio = son.pista('/media/' + encodeURIComponent(b.dataset.audio)); audio.play().catch(() => {}); }));
  // las que no quepan, fuera (la ficha nunca se desplaza)
  while (lista.children.length > 1 && lista.scrollHeight > lista.clientHeight + 1) lista.lastElementChild.remove();
}
// salta a otro kana (aunque esté en otra escritura o en otro grupo)
function irA(k) {
  const esc_ = /[ァ-ヺ]/.test(k) ? 'katakana' : 'hiragana';
  const g = D.tablas[esc_].find((x) => x.filas.some((f) => f.includes(k)));
  if (esc_ !== escritura || (g && g.id !== grupo)) { escritura = esc_; grupo = g?.id || 'basicos'; sel = k; pintarTabla(); sonar(k); return; }
  elegir(k);
}
function moverSel(dx, dy) {
  const g = grupoActual();
  let fi = 0, co = 0;
  g.filas.forEach((f, i) => { const j = f.indexOf(sel); if (j >= 0) { fi = i; co = j; } });
  if (!sel) return elegir(g.filas[0].find(Boolean));
  // en horizontal las filas de datos son columnas: ← → cambian de fila de datos, ↑ ↓ de posición
  const [df, dc] = vertical() ? [dy, dx] : [dx, dy];
  for (let paso = 1; paso < 12; paso++) {
    const f = g.filas[fi + df * paso] ?? (df ? null : g.filas[fi]), k = f?.[co + dc * paso] ?? (dc ? null : f?.[co]);
    if (!f) return;
    if (k) return elegir(k);
    if (dc && f[co + dc * paso] === undefined) return;
  }
}

// ───────────────────────── la práctica ─────────────────────────
const mezclar = (l) => l.map((x) => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
function preguntas(pool) {
  // primero lo que menos dominas; cada kana sale como mucho dos veces
  const peso = (k) => 6 - dominio(k) + Math.random() * 2.5;
  const orden = [...pool].sort((a, b) => peso(b) - peso(a));
  const lista = [];
  for (let i = 0; lista.length < Math.min(RONDA, pool.length * 2); i++) lista.push(orden[i % orden.length]);
  const tipos = ['ver', 'oir', 'leer'];
  return mezclar(lista).map((k, i) => ({ k, tipo: tipos[(i + Math.floor(Math.random() * 3)) % 3] }));
}
function opcionesDe(q, pool) {
  const todos = grupoActual().filas.flat().filter(Boolean); // del mismo grupo: con los básicos, nada de りゃ
  const r = D.kana[q.k].r, parecidos = D.parecidos.find((g) => g.includes(q.k)) || [];
  const cand = mezclar([...new Set([...parecidos, ...mezclar(pool), ...mezclar(todos)])]).filter((k) => k !== q.k && D.kana[k] && D.kana[k].r !== r);
  // los que se le parecen, primero (si caben): así se aprende a distinguirlos
  const elegidas = [...cand.filter((k) => parecidos.includes(k)), ...cand.filter((k) => !parecidos.includes(k))];
  const vistos = new Set([r]), malas = [];
  for (const k of elegidas) { const rr = D.kana[k].r; if (!vistos.has(rr)) { vistos.add(rr); malas.push(k); } if (malas.length === 3) break; }
  return mezclar([q.k, ...malas]);
}
function empezarRonda() {
  const pool = poolPractica();
  if (!pool.length) { location.hash = 'kana'; return; }
  ronda = { qs: preguntas(pool), i: 0, bien: 0, resp: [], racha: 0, pool };
  fase = 'practica';
  pintarPregunta();
}
function pintarPregunta() {
  const v = V(), q = ronda.qs[ronda.i], ops = opcionesDe(q, ronda.pool), it = D.kana[q.k];
  q.ops = ops; q.hecha = false;
  const enunciado = q.tipo === 'ver' ? `<div class="kn-grande" lang="ja">${q.k}</div>`
    : q.tipo === 'oir' ? `<button class="kn-altavoz" aria-label="${t('kana.p.otra_vez')}"><span>▶</span><small>${t('kana.p.otra_vez')} ${kbd('Espacio')}</small></button>`
    : `<div class="kn-grande romaji">${it.r}</div>`;
  const textoOp = (k) => (q.tipo === 'ver' ? `<span class="es">${D.kana[k].r}</span>` : `<span lang="ja">${k}</span>`);
  v.innerHTML = `<header class="cab-papel kn-cab"><button class="volver" data-volver>${t('estudio.salir')} ${kbd('Esc')}</button>
      <div class="cab-centro"><div class="rc-progreso"><i style="width:${Math.max(3, (100 * ronda.i) / ronda.qs.length)}%"></i></div></div>
      <div class="contador"><span class="kn-cuenta"><b>${ronda.i + 1}</b> / ${ronda.qs.length}</span>${htmlBarraXP()}</div></header>
    <div class="kn-practica"><div class="carta-rep kn-carta"><img class="kn-nyan" src="/img/reparto/nyan-normal-i.webp" alt="" draggable="false">
        <span class="tipo">${t(`kana.${escritura}`)}</span>${enunciado}</div>
      <div class="cinta kn-cinta">${q.tipo === 'ver' ? t('kana.p.ver') : q.tipo === 'oir' ? t('kana.p.oir') : t('kana.p.leer', { r: it.r })}</div>
      <div class="opciones-rep kn-ops ${q.tipo === 'ver' ? '' : 'lec'}">${ops.map((k, i) => `<button class="opcion" data-k="${k}">${kbd(i + 1)}${textoOp(k)}</button>`).join('')}</div>
      <div class="kn-sol" aria-live="polite"></div></div>`;
  $$('.kn-ops .opcion', v).forEach((b) => (b.onclick = () => responder(b.dataset.k)));
  $('.kn-altavoz', v)?.addEventListener('click', (e) => sonar(q.k, e.currentTarget));
  if (q.tipo === 'oir') setTimeout(() => sonar(q.k, $('.kn-altavoz', v)), 300);
  if (!quieto()) {
    gsap.fromTo($('.kn-carta', v), { y: 24, opacity: 0, rotate: -1.5 }, { y: 0, opacity: 1, rotate: 0, duration: 0.5, ease: 'back.out(1.8)' });
    gsap.fromTo($$('.kn-ops .opcion', v), { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, stagger: 0.05, delay: 0.1, ease: 'back.out(2)' });
  }
}
function caraNyan(cara) {
  const img = $('.kn-nyan', V()); if (!img) return;
  img.src = `/img/reparto/nyan-${cara}-i.webp`;
  if (!quieto()) gsap.fromTo(img, { y: 0, scale: 1 }, { y: -14, scale: 1.08, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out' });
}
function responder(k) {
  const q = ronda.qs[ronda.i]; if (!q || q.hecha) return;
  q.hecha = true;
  const ok = k === q.k, v = V(), it = D.kana[q.k];
  ronda.resp.push({ k: q.k, ok });
  $$('.kn-ops .opcion', v).forEach((b) => { b.classList.add('cerrada'); if (b.dataset.k === q.k) b.classList.add('bien'); else if (b.dataset.k === k) b.classList.add('mal'); });
  const sol = $('.kn-sol', v);
  if (ok) {
    ronda.bien++; ronda.racha++;
    son.acierto(ronda.racha); caraNyan(ronda.racha >= 3 ? 'feliz' : 'normal');
    const b = $(`.kn-ops .opcion[data-k="${q.k}"]`, v), r = b.getBoundingClientRect();
    flotar(t('kana.p.bien'), r.left + r.width / 2, r.top - 6, 'var(--bien)');
    if (q.tipo !== 'oir') sonar(q.k);
    setTimeout(() => { if (ronda && ronda.qs[ronda.i] === q) siguiente(); }, 1050);
  } else {
    ronda.racha = 0; son.fallo(); caraNyan('pensando');
    sol.innerHTML = `<p class="kn-era">${t('kana.p.mal', { k: `<b lang="ja">${q.k}</b>`, r: `<b>${it.r}</b>` })}</p>
      ${it[idioma] || it.es ? `<p class="kn-mnemo peq">${negrita(it[idioma] || it.es)}</p>` : ''}
      <button class="boton-tinta kn-sig">${t('kana.p.siguiente')} ${kbd('Intro')}</button>`;
    $('.kn-sig', sol).onclick = siguiente;
    if (!quieto()) gsap.fromTo($('.kn-carta', v), { x: -10 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
    sonar(q.k);
  }
}
function siguiente() {
  if (!ronda) return;
  ronda.i++;
  if (ronda.i >= ronda.qs.length) return finRonda();
  pintarPregunta();
}
async function finRonda() {
  fase = 'fin';
  const v = V(), { bien, qs, resp } = ronda, malos = [...new Set(resp.filter((r) => !r.ok).map((r) => r.k))];
  const perfecto = bien === qs.length;
  son.fanfarria();
  v.innerHTML = `<header class="cab-papel kn-cab"><button class="volver" data-volver>${t('estudio.salir')} ${kbd('Esc')}</button><div class="cab-centro"></div><div class="contador">${htmlBarraXP()}</div></header>
    <div class="kn-practica"><div class="carta-rep kn-carta kn-fin"><img class="kn-nyan grande" src="/img/reparto/nyan-${perfecto ? 'feliz' : bien >= qs.length / 2 ? 'normal' : 'pensando'}-i.webp" alt="" draggable="false">
      <span class="tipo">${t(`kana.${escritura}`)}</span>
      <div class="kn-fin-tit">${perfecto ? t('kana.fin.perfecto') : t('kana.fin.tit')}</div>
      <div class="kn-fin-num"><b>${bien}</b> / ${qs.length}</div><div class="rc-logo m kn-fin-xp">+0 XP</div>
      ${malos.length ? `<div class="kn-parece"><span>${t('kana.fin.repasa')}</span>${malos.map((k) => `<button class="kn-chip" data-k="${k}"><b lang="ja">${k}</b>${D.kana[k].r}</button>`).join('')}</div>` : ''}</div>
      <div class="kn-fin-botones"><button class="boton-claro" id="kn-tabla">${t('kana.fin.tabla')} ${kbd('Esc')}</button><button class="boton-tinta" id="kn-otra">${t('kana.fin.otra')} ${kbd('Intro')}</button></div></div>`;
  $('#kn-tabla', v).onclick = () => { location.hash = 'kana'; };
  $('#kn-otra', v).onclick = () => empezarRonda();
  $$('.kn-chip', v).forEach((b) => (b.onclick = () => { sel = b.dataset.k; location.hash = 'kana'; }));
  if (!quieto()) gsap.fromTo($('.kn-fin', v), { scale: 0.85, opacity: 0, rotate: -2 }, { scale: 1, opacity: 1, rotate: 0, duration: 0.6, ease: 'back.out(1.8)' });
  try {
    const r = await api('/api/kana', { respuestas: resp });
    mio = r.kana || mio;
    const xpEl = $('.kn-fin-xp', v);
    if (xpEl) { xpEl.textContent = `+${r.xp} XP`; if (r.xp) xpVuela(xpEl, r.xp, r.xp_total); }
  } catch {}
}

// ───────────────────────── vista y teclas ─────────────────────────
const mostrar = (resto = []) => { if (resto[0] === 'practica') empezarRonda(); else { ronda = null; pintarTabla(); } };
// Salir / Esc: de la práctica a la tabla; de la tabla, a casa
const volver = () => { location.hash = fase === 'tabla' ? 'inicio' : 'kana'; };
registrar('kana', {
  seccion: '#v-kana',
  async entrar(resto = []) {
    await cargar();
    try { mio = await api('/api/kana'); } catch { mio = {}; }
    if (!estado.inicio) estado.inicio = await api('/api/inicio').catch(() => null);
    ponerXP(Math.max(xpActual(), estado.inicio?.xp || 0)); // la barra de XP de la cabecera parte de lo que llevas
    estilos();
    mostrar(resto);
  },
  actualizar(resto = []) { audio?.pause(); mostrar(resto); }, // #kana ⇄ #kana/practica sin cerrar el shoji
  salir() { audio?.pause(); trazando.forEach((a) => a.cancel()); },
  volver,
});
V()?.addEventListener('click', (e) => { if (e.target.closest('[data-volver]')) { e.preventDefault(); volver(); } });
addEventListener('keydown', (e) => {
  if (!V()?.classList.contains('activa') || e.defaultPrevented || escribiendo(e) || capaAbierta() || e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (fase === 'tabla') {
    const flechas = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (flechas[k]) { e.preventDefault(); moverSel(...flechas[k]); }
    else if (k === ' ' && sel) { e.preventDefault(); sonar(sel, $('.kn-oir', V())); }
    else if (k === 't' && sel) { e.preventDefault(); const svg = $('.kn-svg', V()); if (svg) animarTrazos(svg); }
    else if (k === 'p' && poolPractica().length) { e.preventDefault(); location.hash = 'kana/practica'; }
  } else if (fase === 'practica') {
    const q = ronda?.qs[ronda.i]; if (!q) return;
    if (/^[1-4]$/.test(k) && !q.hecha) { e.preventDefault(); responder(q.ops[+k - 1]); }
    else if (k === ' ' && q.tipo === 'oir') { e.preventDefault(); sonar(q.k, $('.kn-altavoz', V())); }
    else if (k === 'Enter' && q.hecha) { e.preventDefault(); siguiente(); }
  } else if (fase === 'fin' && k === 'Enter') { e.preventDefault(); empezarRonda(); }
});
addEventListener('resize', () => {
  const tb = $('.kn-tabla', V()); if (tb && V()?.classList.contains('activa')) tb.classList.toggle('vertical', vertical());
});

let puestos = false;
function estilos() {
  if (puestos) return; puestos = true;
  const s = document.createElement('style');
  s.textContent = `
#v-kana { display: flex; flex-direction: column; overflow: hidden; }
#v-kana > .cab-papel { flex: none; padding-bottom: 10px; }
.kn-escrituras { display: flex; justify-content: center; gap: 12px; }
.kn-esc { display: grid; grid-template-columns: auto auto; align-items: baseline; gap: 0 12px; min-height: 52px; padding: 8px 20px 9px; border: var(--borde); border-radius: var(--radio-peq); background: var(--sup-2);
  color: var(--tinta-2); box-shadow: var(--sombra-peq); cursor: pointer; font: 700 15px var(--f-texto); transition: translate .15s var(--suave), background .15s, box-shadow .15s, border-color .15s; }
.kn-esc b { grid-row: span 2; font: var(--peso-titulo) 24px/1 var(--f-titulo); color: var(--tinta); }
.kn-esc small { font: 600 11.5px var(--f-texto); color: var(--tinta-2); }
.kn-esc:hover { translate: 0 -2px; border-color: var(--linea-2); }
.kn-esc:active { translate: 0 1px; }
.kn-esc.si { background: var(--acento-suave); color: var(--tinta); box-shadow: inset 0 0 0 2px var(--acento); border-color: transparent; }
.kn-esc.si b { color: var(--acento-tinta); }
.kn-cuerpo { flex: 1 1 0; min-height: 0; display: flex; flex-direction: column; gap: 12px; padding: 0 28px; }
.kn-grupos { display: flex; justify-content: center; gap: 8px; flex-wrap: wrap; }
.kn-grupo { position: relative; height: 36px; padding: 0 16px; border: var(--borde); border-radius: var(--radio-btn); background: var(--sup-2); color: var(--tinta-2); font: 700 14px var(--f-texto); cursor: pointer; box-shadow: var(--sombra-peq); transition: background .15s, color .15s, border-color .15s; }
.kn-grupo::after, .kn-col::after { content: ""; position: absolute; inset: -4px -2px; }
.kn-grupo:hover { border-color: var(--linea-2); color: var(--tinta); }
.kn-grupo.si { background: var(--tinta); color: var(--tinta-inv); border-color: transparent; }
.kn-mesa { flex: 1 1 0; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr) clamp(300px, 30vw, 400px); gap: 24px; max-width: 1320px; width: 100%; margin: 0 auto; }
.kn-tabla { --hueco: clamp(4px, .8vw, 8px); min-height: 0; display: grid; gap: var(--hueco); grid-auto-flow: column; grid-template-rows: auto repeat(var(--filas), minmax(0, 1fr));
  grid-template-columns: auto repeat(var(--cols), minmax(0, 1fr)); align-self: stretch; }
.kn-tabla.vertical { grid-auto-flow: row; grid-template-columns: auto repeat(var(--filas), minmax(0, 1fr)); grid-template-rows: auto repeat(var(--cols), minmax(0, 1fr)); }
.kn-eje, .kn-esquina { display: grid; place-items: center; font: 700 12px var(--f-texto); color: var(--tinta-2); text-transform: uppercase; letter-spacing: .08em; }
.kn-col { position: relative; min-width: 30px; height: 30px; align-self: center; justify-self: center; padding: 0 9px; border: var(--borde); border-radius: var(--radio-btn); background: var(--sup-2); color: var(--tinta-2);
  font: 700 13px var(--f-texto); cursor: pointer; box-shadow: var(--sombra-peq); transition: background .15s, color .15s, border-color .15s; }
.kn-col:hover { border-color: var(--linea-2); color: var(--tinta); }
.kn-col.si { background: var(--acento-suave); color: var(--acento-tinta); box-shadow: inset 0 0 0 2px var(--acento); border-color: transparent; }
.kn-tabla.vertical .kn-col { justify-self: end; }
.kn-celda { position: relative; min-width: 0; min-height: 0; display: grid; place-items: center; align-content: center; gap: 0; padding: 2px; border: var(--borde); border-radius: var(--radio-peq); cursor: pointer;
  background: var(--sup); color: var(--tinta); box-shadow: var(--sombra-peq); opacity: .6; transition: opacity .2s var(--suave), translate .15s var(--suave), box-shadow .15s, background .15s; }
.kn-celda.en { opacity: 1; }
.kn-celda b { font: 500 clamp(20px, min(4.6vh, 3vw), 42px)/1.05 var(--f-jp); white-space: nowrap; }
.kn-celda.doble b { font-size: clamp(15px, min(3.4vh, 2vw), 32px); letter-spacing: -.04em; }
.kn-celda small { font: 700 clamp(10px, 1.5vh, 13px) var(--f-texto); color: var(--tinta-2); }
.kn-celda:hover { translate: 0 -2px; opacity: 1; border-color: var(--linea-2); }
.kn-celda:active { translate: 0 1px; }
.kn-celda.sel { box-shadow: inset 0 0 0 2px var(--acento); border-color: transparent; background: var(--acento-suave); opacity: 1; }
.kn-dom { position: absolute; left: 22%; right: 22%; bottom: 5px; height: 4px; border-radius: 4px; background: var(--linea); overflow: hidden; }
.kn-dom::after { content: ""; position: absolute; inset: 0; width: calc(var(--d, 0) * 20%); border-radius: 4px; background: var(--acento); }
.kn-celda.d1 { --d: 1; } .kn-celda.d2 { --d: 2; } .kn-celda.d3 { --d: 3; } .kn-celda.d4 { --d: 4; } .kn-celda.d5 { --d: 5; }
.kn-celda.d3 .kn-dom::after, .kn-celda.d4 .kn-dom::after, .kn-celda.d5 .kn-dom::after { background: var(--bien); }
:is(.kn-esc, .kn-grupo, .kn-col, .kn-celda, .kn-chip, .kn-palabra, .kn-otra, .kn-cerrar, .kn-oir, .kn-altavoz):focus-visible { outline: 2px solid var(--acento); outline-offset: 2px; }
.kn-ficha { position: relative; min-height: 0; overflow: hidden; display: flex; flex-direction: column; gap: 12px; padding: 16px 20px; border-radius: var(--radio); background: var(--sup);
  border: var(--borde); box-shadow: var(--sombra); }
.kn-ficha-vacia { margin: auto; display: grid; justify-items: center; gap: 12px; text-align: center; font: 600 15px/1.5 var(--f-texto); color: var(--tinta-2); text-wrap: balance; }
.kn-ficha-vacia img { width: 150px; height: 150px; object-fit: contain; animation: kn-flota 3s ease-in-out infinite; }
@keyframes kn-flota { 50% { translate: 0 -8px; } }
.kn-cerrar { position: absolute; right: 12px; top: 10px; width: 40px; height: 40px; border: 0; border-radius: 50%; background: transparent; color: var(--tinta-2); font-size: 18px; cursor: pointer; display: none; }
.kn-cerrar:hover { background: var(--sup-2); color: var(--tinta); }
.kn-ficha-cab { display: flex; gap: 16px; align-items: center; }
.kn-dibujo { position: relative; flex: none; width: clamp(120px, 24vh, 180px); max-width: 55%; }
.kn-dibujo:has(svg[viewBox^="-4 -4 176"]) { width: clamp(160px, 30vh, 240px); max-width: 64%; }
.kn-svg { display: block; width: 100%; height: auto; overflow: visible; }
.kn-masu rect { fill: var(--sup-2); stroke: var(--linea-2); stroke-width: 2; } .kn-masu path { fill: none; stroke: var(--linea-2); stroke-width: 1; stroke-dasharray: 3 3; }
.kn-sombra { fill: none; stroke: var(--sup-3); stroke-width: 6; stroke-linecap: round; stroke-linejoin: round; }
.kn-t { fill: none; stroke: var(--tinta); stroke-width: 6; stroke-linecap: round; stroke-linejoin: round; }
.kn-num { font: 700 9px var(--f-texto); fill: var(--acento); transform-box: fill-box; transform-origin: center; }
.kn-otra { position: absolute; right: -6px; bottom: -6px; height: 32px; padding: 0 10px; border: var(--borde); border-radius: var(--radio-btn); background: var(--sup); box-shadow: var(--sombra-peq);
  font: 700 13px var(--f-texto); color: var(--tinta-2); cursor: pointer; transition: color .15s, border-color .15s; }
.kn-otra:hover { color: var(--tinta); border-color: var(--linea-2); }
.kn-otra kbd { display: none; }
.kn-sonido { min-width: 0; display: grid; gap: 10px; justify-items: start; }
.kn-oir { display: grid; place-items: center; width: 54px; height: 54px; padding: 0 0 0 4px; border: 0; border-radius: 50%; background: var(--boton); color: var(--boton-tinta); font-size: 22px; cursor: pointer;
  box-shadow: var(--sombra-btn); transition: translate .12s var(--suave); }
.kn-oir:hover { translate: 0 -2px; } .kn-oir:active { translate: 0 2px; }
.kn-oir.sonando { animation: kn-late .6s ease-in-out infinite; }
.kn-romaji { font: var(--peso-titulo) clamp(30px, 5.6vh, 50px)/1 var(--f-titulo); color: var(--acento-tinta); }
.kn-estrellas { display: flex; gap: 4px; } .kn-estrellas i { width: 12px; height: 12px; border-radius: 50%; background: var(--linea-2); } .kn-estrellas i.si { background: var(--bien); }
.kn-mnemo { margin: 0; padding: 12px 16px; border-radius: var(--radio-peq); background: var(--acento-suave); font: 600 15.5px/1.5 var(--f-texto); color: var(--tinta); text-wrap: pretty; }
.kn-mnemo b { color: var(--acento-tinta); } .kn-mnemo.peq { font-size: 14px; }
.kn-parece { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.kn-parece > span, .kn-ejemplos > span { width: 100%; font: 700 11.5px var(--f-texto); letter-spacing: .12em; text-transform: uppercase; color: var(--tinta-2); }
.kn-chip { display: inline-flex; align-items: baseline; gap: 6px; height: 36px; padding: 0 14px; border: var(--borde); border-radius: var(--radio-btn); background: var(--sup-2); box-shadow: var(--sombra-peq);
  font: 700 13px var(--f-texto); color: var(--tinta-2); cursor: pointer; transition: translate .15s var(--suave), border-color .15s; } .kn-chip b { font: 500 20px var(--f-jp); color: var(--tinta); }
.kn-chip:hover { translate: 0 -2px; border-color: var(--linea-2); }
.kn-ejemplos { min-height: 0; display: flex; flex-direction: column; gap: 6px; }
.kn-lista { display: grid; gap: 6px; min-height: 0; overflow: hidden; }
.kn-palabra { display: grid; grid-template-columns: 1fr auto; grid-template-rows: auto auto; align-items: center; column-gap: 8px; padding: 6px 12px; border: var(--borde); border-radius: var(--radio-peq); background: var(--sup-2);
  text-align: left; cursor: pointer; color: var(--tinta); transition: border-color .15s, background .15s; }
.kn-palabra:hover { border-color: var(--linea-2); background: var(--sup-3); }
.kn-palabra > span { font: 500 19px/1.3 var(--f-jp); } .kn-palabra rt { font-size: .45em; color: var(--tinta-2); }
.kn-palabra > small { grid-column: 1; font: 600 12.5px var(--f-texto); color: var(--tinta-2); }
.kn-palabra > i { grid-row: 1 / span 2; grid-column: 2; font-style: normal; color: var(--acento-tinta); }
.kn-palabra mark { background: linear-gradient(transparent 55%, color-mix(in srgb, var(--acento) 30%, transparent) 55%); color: inherit; }
.kn-lect { margin-left: 6px; font: 500 13px var(--f-jp); color: var(--tinta-2); }
.kn-nada { margin: 0; font: 600 13px var(--f-texto); color: var(--tinta-2); }
.kn-pie { position: static; transform: none; flex: none; width: auto; justify-content: center; gap: 18px; padding: 12px 24px 20px; }
.kn-pista { max-width: 420px; font: 600 13.5px/1.4 var(--f-texto); color: var(--tinta-2); }
/* la práctica */
.kn-practica { flex: 1 1 0; min-height: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0; padding: 0 20px 20px; }
.kn-carta { width: min(560px, 100%); min-height: 0; height: clamp(170px, 30vh, 280px); display: grid; place-items: center; }
.kn-grande { font: 500 clamp(80px, 17vh, 150px)/1 var(--f-jp); color: var(--tinta); }
.kn-grande.romaji { font: var(--peso-titulo) clamp(60px, 13vh, 110px)/1 var(--f-titulo); color: var(--acento-tinta); }
.kn-nyan { position: absolute; left: -44px; bottom: -30px; width: clamp(130px, 22vh, 190px); height: auto; aspect-ratio: 1; object-fit: contain; filter: drop-shadow(0 6px 8px rgba(0, 0, 0, .25)) /* arte */; pointer-events: none; }
.kn-nyan.grande { left: -60px; width: clamp(160px, 28vh, 240px); }
.kn-altavoz { display: grid; justify-items: center; gap: 10px; border: 0; background: none; cursor: pointer; color: var(--tinta-2); font: 600 13px var(--f-texto); border-radius: var(--radio-peq); }
.kn-altavoz span { display: grid; place-items: center; width: clamp(80px, 14vh, 110px); aspect-ratio: 1; border-radius: 50%; background: var(--boton); color: var(--boton-tinta); font-size: 36px; box-shadow: var(--sombra-btn); }
.kn-altavoz.sonando span { animation: kn-late .6s ease-in-out infinite; } @keyframes kn-late { 50% { scale: 1.08; } }
.kn-cinta { margin-top: 20px; }
.kn-ops { margin-top: 20px; }
.kn-ops.lec .opcion span { font: 500 30px/1.1 var(--f-jp); }
.kn-ops .opcion span.es { font: var(--peso-titulo) 26px/1 var(--f-titulo); }
.kn-sol { min-height: 0; display: grid; justify-items: center; gap: 8px; margin-top: 12px; text-align: center; }
.kn-sol:empty { display: none; }
.kn-era { margin: 0; font: 600 16px var(--f-texto); color: var(--tinta); } .kn-era b { font-size: 1.3em; color: color-mix(in srgb, var(--tinta) 45%, var(--mal)); }
.kn-sol .kn-mnemo { max-width: 560px; }
.kn-cuenta { font: 600 14px var(--f-texto); color: var(--tinta-2); margin-right: 14px; font-variant-numeric: tabular-nums; } .kn-cuenta b { font-size: 18px; color: var(--tinta); }
.kn-fin { height: auto; padding: 24px 24px 28px; display: grid; justify-items: center; gap: 8px; }
.kn-fin-tit { font: var(--peso-titulo) clamp(24px, 4vh, 34px) var(--f-titulo); color: var(--tinta); text-wrap: balance; }
.kn-fin-num { font: 600 18px var(--f-texto); color: var(--tinta-2); font-variant-numeric: tabular-nums; } .kn-fin-num b { font: var(--peso-titulo) 54px/1 var(--f-titulo); color: var(--acento-tinta); }
.kn-fin-xp { font-size: 30px; }
.kn-fin .kn-parece { justify-content: center; } .kn-fin .kn-parece > span { text-align: center; }
.kn-fin-botones { display: flex; gap: 12px; margin-top: 20px; }
.kn-fin-botones .boton-claro { background: var(--sup-2); }
/* estrecho o en vertical: la ficha sale como una hoja desde abajo */
@media (max-aspect-ratio: 4/5), (max-width: 700px) {
  .kn-cuerpo { padding: 0 12px; }
  .kn-mesa { grid-template-columns: minmax(0, 1fr); }
  .kn-ficha { position: fixed; z-index: 30; left: 8px; right: 8px; bottom: 8px; max-height: 72vh; box-shadow: var(--sombra-flotante); translate: 0 110%; transition: translate .35s var(--suave); }
  .kn-ficha.abierta { translate: 0 0; }
  .kn-ficha:not(.abierta) { visibility: hidden; transition: translate .25s var(--suave), visibility 0s .25s; }
  .kn-cerrar { display: block; }
  .kn-esc { display: block; padding: 6px 14px; min-height: 44px; } .kn-esc small, .kn-esc span { display: none; } .kn-esc b { font-size: 19px; white-space: nowrap; }
  .kn-cab .contador { display: none; }
  .kn-pista { display: none; }
  .kn-pie .boton-tinta { width: 100%; justify-content: center; }
  .kn-nyan { left: -8px; bottom: -10px; }
  .kn-ops.lec .opcion span { font-size: 26px; }
}
@media (prefers-reduced-motion: reduce) { .kn-ficha-vacia img, .kn-oir.sonando, .kn-altavoz.sonando span { animation: none; } .kn-esc, .kn-celda, .kn-chip, .kn-grupo, .kn-col, .kn-ficha { transition: none; } .kn-esc:hover, .kn-celda:hover, .kn-chip:hover { translate: none; } }`;
  document.head.appendChild(s);
}
