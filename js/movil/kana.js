// Kana en el móvil: la tabla del grupo entero cabe en la pantalla (las filas se reparten el alto que queda); al tocar un
// kana sube una hoja con sus trazos, su sonido, su pista y una palabra; «Practicar» abre rondas a pantalla completa
// (ver → sonido, oír → kana, sonido → kana) con lo que menos dominas primero. Datos: /kana/kana.json y /api/kana.
import { gsap } from 'gsap';
import { t, tn, idioma } from '../i18n.js';
import * as son from '../sonido.js';
import { esc } from '../japones.js';
import { $, $$, api, vibrar, quieto, CERRAR, PLAY } from './comun.js';

const RONDA = 12;
let D = null, mio = {}, escritura = 'hiragana', grupo = 'basicos', V = null, audio = null, ronda = null;
const cargar = async () => (D ||= await fetch('/kana/kana.json').then((r) => r.json()));
const dominio = (k) => mio[k]?.n || 0;
const grupoActual = () => D.tablas[escritura].find((g) => g.id === grupo) || D.tablas[escritura][0];
const negrita = (x) => esc(x).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');

function sonar(k, boton = null) {
  const r = D.kana[k]?.r; if (!r) return;
  audio?.pause(); audio = son.pista(`/kana/voz/${r}.mp3`);
  boton?.classList.add('sonando'); audio.onended = audio.onpause = () => boton?.classList.remove('sonando');
  audio.play().catch(() => boton?.classList.remove('sonando'));
}

// ───────── la tabla ─────────
function pintarTabla() {
  const g = grupoActual(), ancho = Math.max(...g.filas.map((f) => f.length));
  V.innerHTML = `<div class="mv-kana">
    <div class="mv-kana-cab">
      <div class="mv-segm" role="group" aria-label="${t('mv.kana.escritura')}">${['hiragana', 'katakana'].map((e) => `<button aria-pressed="${e === escritura}" data-esc="${e}" lang="ja">${e === 'hiragana' ? 'ひらがな' : 'カタカナ'}</button>`).join('')}</div>
      <a class="mv-btn mv-kana-practicar" href="#kana/practica">${PLAY}${t('mv.kana.practicar')}</a></div>
    <div class="mv-kana-grupos">${D.tablas[escritura].map((x) => `<button class="mv-chip${x.id === g.id ? ' si' : ''}" data-grupo="${x.id}">${t('mv.kana.grupo.' + x.id)}</button>`).join('')}</div>
    <div class="mv-kana-tabla" style="--cols:${ancho};--filas:${g.filas.length}">${g.filas.map((f) => Array.from({ length: ancho }, (_, j) => {
      const k = f[j];
      return k ? `<button class="mv-kana-celda d${Math.min(5, dominio(k))}${k.length > 1 ? ' doble' : ''}" data-k="${k}"><b lang="ja">${k}</b><small>${D.kana[k].r}</small><i></i></button>` : '<span></span>';
    }).join('')).join('')}</div>
    <div class="mv-kana-velo" hidden></div><div class="mv-hoja mv-kana-hoja" aria-live="polite"></div></div>`;
  $$('[data-esc]', V).forEach((b) => (b.onclick = () => { if (b.dataset.esc === escritura) return; vibrar(8); escritura = b.dataset.esc; grupo = 'basicos'; pintarTabla(); }));
  $$('[data-grupo]', V).forEach((b) => (b.onclick = () => { vibrar(8); grupo = b.dataset.grupo; pintarTabla(); }));
  $$('.mv-kana-celda', V).forEach((b) => (b.onclick = () => abrirFicha(b.dataset.k)));
  $('.mv-kana-velo', V).onclick = cerrarFicha;
  if (!quieto()) gsap.fromTo($$('.mv-kana-celda', V), { scale: 0.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, stagger: 0.006, ease: 'back.out(2)' });
}
function svgTrazos(k) {
  const it = D.kana[k], partes = it.partes || [k], W = partes.length > 1 ? 168 : 109;
  let n = 0;
  return `<svg class="mv-kana-svg" viewBox="-4 -4 ${W + 8} 117" role="img" aria-label="${k}"><rect x="0" y="0" width="${W}" height="109" rx="12" class="masu"/>
    <path d="M${W / 2} 4V105M4 54.5H${W - 4}" class="guia"/>${partes.map((pk, j) => `<g transform="translate(${j ? 62 : 0} 0)">${(D.kana[pk]?.trazos || []).map((d) => `<path class="sombra" d="${d}"/>`).join('')}${(D.kana[pk]?.trazos || []).map((d) => `<path class="trazo" data-n="${++n}" d="${d}"/>`).join('')}</g>`).join('')}</svg>`;
}
function animarTrazos(svg) {
  $$('.num', svg).forEach((x) => x.remove());
  let t0 = 200;
  $$('.trazo', svg).forEach((p) => {
    const L = p.getTotalLength(), dur = Math.max(300, L * 8), pt = p.getPointAtLength(0);
    const num = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    num.setAttribute('class', 'num'); num.setAttribute('x', pt.x - 4); num.setAttribute('y', pt.y - 3); num.textContent = p.dataset.n; p.parentNode.appendChild(num);
    if (quieto()) return;
    p.style.strokeDasharray = `${L} ${L}`;
    p.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: dur, delay: t0, fill: 'backwards', easing: 'cubic-bezier(.45,.05,.4,1)' });
    num.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: t0, fill: 'backwards' });
    t0 += dur + 150;
  });
}
async function abrirFicha(k) {
  vibrar(10);
  const it = D.kana[k], h = $('.mv-kana-hoja', V), mn = it[idioma] || it.es;
  $$('.mv-kana-celda.sel', V).forEach((c) => c.classList.remove('sel')); $(`.mv-kana-celda[data-k="${k}"]`, V)?.classList.add('sel');
  h.innerHTML = `<i class="mv-agarre" aria-hidden="true"></i><button class="mv-icono-btn mv-kana-cerrar" aria-label="${t('mv.cerrar')}">${CERRAR}</button>
    <div class="mv-kana-ficha-cab">${svgTrazos(k)}<div><b class="mv-kana-romaji">${it.r}</b>
      <div class="mv-kana-botones"><button class="mv-redondo" data-oir aria-label="${t('mv.escuchar')}">${PLAY}</button>
      <button class="mv-icono-btn" data-otra aria-label="${t('mv.kana.otra')}"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M19 12a7 7 0 1 1-2.05-4.95M19 4v4h-4" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div></div></div>
    ${mn ? `<p class="mv-kana-pista">${negrita(mn)}</p>` : ''}<div class="mv-kana-palabra"></div>`;
  $('.mv-kana-velo', V).hidden = false; h.classList.add('abierta');
  if (!quieto()) gsap.fromTo(h, { y: '100%' }, { y: '0%', duration: 0.4, ease: 'back.out(1.2)' });
  const svg = $('.mv-kana-svg', h); animarTrazos(svg);
  $('[data-oir]', h).onclick = (e) => sonar(k, e.currentTarget);
  $('[data-otra]', h).onclick = () => animarTrazos(svg);
  $('.mv-kana-cerrar', h).onclick = cerrarFicha;
  sonar(k, $('[data-oir]', h));
  let ej = []; try { ej = await api(`/api/kana/ejemplos?k=${encodeURIComponent(k)}&lang=${idioma}`); } catch { /* sin palabras */ }
  const w = ej.find((x) => !/[一-鿿]/.test(x.palabra)) || ej[0], caja = $('.mv-kana-palabra', h);
  if (w && caja) {
    const jp = /[一-鿿]/.test(w.palabra) ? `${esc(w.palabra)} <small>${esc(w.lectura || '')}</small>` : esc(w.palabra).split(esc(k)).join(`<mark>${esc(k)}</mark>`);
    caja.innerHTML = `<button class="mv-btn-claro"${w.audio ? ` data-audio="${esc(w.audio)}"` : ''}><span lang="ja">${jp}</span><span class="es">${esc(w.es || '')}</span>${w.audio ? `<i>${PLAY}</i>` : ''}</button>`;
    $('[data-audio]', caja)?.addEventListener('click', (e) => { audio?.pause(); audio = son.pista('/media/' + encodeURIComponent(e.currentTarget.dataset.audio)); audio.play().catch(() => {}); });
  }
}
function cerrarFicha() {
  const h = $('.mv-kana-hoja', V); if (!h?.classList.contains('abierta')) return;
  $('.mv-kana-velo', V).hidden = true; $$('.mv-kana-celda.sel', V).forEach((c) => c.classList.remove('sel'));
  const fuera = () => { h.classList.remove('abierta'); h.innerHTML = ''; };
  if (quieto()) fuera(); else gsap.to(h, { y: '100%', duration: 0.25, ease: 'power2.in', onComplete: () => { fuera(); gsap.set(h, { y: 0 }); } });
}

// ───────── la práctica ─────────
const mezclar = (l) => l.map((x) => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
function poolPractica() {
  // las filas que ya has tocado y la siguiente (si no has tocado ninguna, las dos primeras)
  const g = grupoActual(), tocadas = g.filas.map((f, i) => (f.some((k) => k && dominio(k) > 0) ? i : -1)).filter((i) => i >= 0);
  const sig = g.filas.findIndex((f, i) => !tocadas.includes(i));
  const filas = new Set([...tocadas, ...(sig >= 0 ? [sig] : []), ...(tocadas.length ? [] : [Math.min(1, g.filas.length - 1)])]);
  return g.filas.flatMap((f, i) => (filas.has(i) ? f.filter(Boolean) : []));
}
function empezarRonda() {
  const pool = poolPractica(), peso = (k) => 6 - dominio(k) + Math.random() * 2.5;
  const orden = [...pool].sort((a, b) => peso(b) - peso(a)), lista = [];
  for (let i = 0; lista.length < Math.min(RONDA, pool.length * 2); i++) lista.push(orden[i % orden.length]);
  ronda = { pool, qs: mezclar(lista).map((k, i) => ({ k, tipo: ['ver', 'oir', 'leer'][(i + Math.floor(Math.random() * 3)) % 3] })), i: 0, bien: 0, resp: [], racha: 0 };
  pintarPregunta();
}
function opciones(q) {
  const todos = grupoActual().filas.flat().filter(Boolean), r = D.kana[q.k].r, par = D.parecidos.find((g) => g.includes(q.k)) || [];
  const cand = mezclar([...new Set([...par, ...mezclar(ronda.pool), ...mezclar(todos)])]).filter((k) => k !== q.k && D.kana[k]?.r !== r);
  const vistos = new Set([r]), malas = [];
  for (const k of [...cand.filter((k) => par.includes(k)), ...cand.filter((k) => !par.includes(k))]) { const rr = D.kana[k].r; if (!vistos.has(rr)) { vistos.add(rr); malas.push(k); } if (malas.length === 3) break; }
  return mezclar([q.k, ...malas]);
}
function pintarPregunta() {
  const q = ronda.qs[ronda.i], it = D.kana[q.k]; q.ops = opciones(q); q.hecha = false;
  const centro = q.tipo === 'ver' ? `<div class="mv-kana-grande" lang="ja">${q.k}</div>`
    : q.tipo === 'oir' ? `<button class="mv-kana-altavoz" aria-label="${t('mv.kana.otra_vez')}"><span>${PLAY}</span><small>${t('mv.kana.otra_vez')}</small></button>`
    : `<div class="mv-kana-grande romaji">${it.r}</div>`;
  V.innerHTML = `<div class="mv-rep mv-kana-prac">
    <div class="mv-rep-cab"><a class="mv-icono-btn" href="#kana" aria-label="${t('mv.salir')}">${CERRAR}</a>
      <div class="mv-barra"><i style="width:${Math.max(4, (100 * ronda.i) / ronda.qs.length)}%"></i></div><span class="mv-rep-n"><b>${ronda.i + 1}</b> / ${ronda.qs.length}</span></div>
    <div class="mv-carta mv-rep-carta"><img class="mv-kana-nyan" src="/img/reparto/nyan-normal-i.webp" alt="" width="120" height="120">${centro}
      <div class="mv-rep-cinta">${q.tipo === 'ver' ? t('mv.kana.p_ver') : q.tipo === 'oir' ? t('mv.kana.p_oir') : t('mv.kana.p_leer', { r: it.r })}</div><div class="mv-rep-sol" hidden></div></div>
    <div class="mv-rep-ops mv-kana-ops">${q.ops.map((k, i) => `<button class="mv-btn-claro mv-rep-op${q.tipo === 'ver' ? '' : ' jp'}" data-i="${i}">${q.tipo === 'ver' ? D.kana[k].r : k}</button>`).join('')}</div>
    <div class="mv-rep-pie"></div></div>`;
  $$('.mv-rep-op', V).forEach((b) => (b.onclick = () => responder(+b.dataset.i)));
  $('.mv-kana-altavoz', V)?.addEventListener('click', (e) => sonar(q.k, e.currentTarget));
  if (q.tipo === 'oir') setTimeout(() => sonar(q.k, $('.mv-kana-altavoz', V)), 250);
  if (!quieto()) gsap.fromTo($('.mv-rep-carta', V), { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: 'back.out(1.6)' });
}
function responder(i) {
  const q = ronda.qs[ronda.i]; if (q.hecha) return; q.hecha = true;
  const ok = q.ops[i] === q.k, it = D.kana[q.k];
  ronda.resp.push({ k: q.k, ok });
  $$('.mv-rep-op', V).forEach((b, j) => { b.disabled = true; if (q.ops[j] === q.k) b.classList.add('bien'); else if (j === i) b.classList.add('mal'); else b.classList.add('apagada'); });
  const img = $('.mv-kana-nyan', V);
  if (ok) { ronda.bien++; ronda.racha++; son.acierto(ronda.racha); vibrar(12); img.src = `/img/reparto/nyan-${ronda.racha >= 3 ? 'feliz' : 'normal'}-i.webp`; }
  else { ronda.racha = 0; son.fallo(); vibrar([18, 50, 18]); img.src = '/img/reparto/nyan-pensando-i.webp'; }
  if (!quieto()) gsap.fromTo(img, { y: 0 }, { y: -12, duration: 0.16, yoyo: true, repeat: 1 });
  const sol = $('.mv-rep-sol', V); $('.mv-rep-cinta', V).hidden = true;
  sol.innerHTML = `<b lang="ja" class="${ok ? 'bien' : 'mal'}">${q.k} · ${it.r}</b>${!ok && (it[idioma] || it.es) ? `<small>${negrita(it[idioma] || it.es)}</small>` : ''}`; sol.hidden = false;
  if (q.tipo !== 'oir' || !ok) sonar(q.k);
  $('.mv-rep-pie', V).innerHTML = `<button class="mv-btn">${ronda.i + 1 < ronda.qs.length ? t('mv.siguiente') : t('mv.kana.terminar')}</button>`;
  $('.mv-rep-pie .mv-btn', V).onclick = () => { ronda.i++; if (ronda.i < ronda.qs.length) pintarPregunta(); else finRonda(); };
}
async function finRonda() {
  const { bien, qs, resp } = ronda, malos = [...new Set(resp.filter((r) => !r.ok).map((r) => r.k))];
  let xp = 0; try { const r = await api('/api/kana', { respuestas: resp }); mio = r.kana || mio; xp = r.xp || 0; } catch { /* nada */ }
  son.fanfarria?.();
  V.innerHTML = `<div class="mv-rep mv-fin">
    <img src="/img/reparto/nyan-${bien === qs.length ? 'feliz' : bien >= qs.length / 2 ? 'normal' : 'pensando'}.webp" alt="" width="170" height="170" style="align-self:center">
    <div class="mv-fin-nota">${bien === qs.length ? t('mv.kana.perfecto') : t('mv.kana.terminada')}</div>
    <div class="mv-fin-stats"><div class="mv-carta"><b>${bien} / ${qs.length}</b><small>${t('mv.fin.aciertos')}</small></div><div class="mv-carta oro"><b>+${xp}</b><small>XP</small></div></div>
    ${malos.length ? `<div class="mv-kana-repasa"><span class="mv-etq">${t('mv.kana.repasa')}</span><div>${malos.map((k) => `<span class="mv-chip" lang="ja"><b>${k}</b> ${D.kana[k].r}</span>`).join('')}</div></div>` : ''}
    <div class="mv-fin-pie"><button class="mv-btn" data-otra>${t('mv.kana.otra_ronda')}</button><a class="mv-btn-claro" href="#kana">${t('mv.kana.volver')}</a></div></div>`;
  $('[data-otra]', V).onclick = () => empezarRonda();
}

export async function entrar(v, resto, app) {
  V = v; await cargar();
  try { mio = await api('/api/kana'); } catch { mio = {}; }
  if (resto[0] === 'practica') empezarRonda(); else { ronda = null; pintarTabla(); }
}
export function salir() { audio?.pause(); }
