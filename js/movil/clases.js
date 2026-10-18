// Todas las clases de Nyan en el móvil: un capítulo por página (hasta 12 clases en una cuadrícula que cabe sin desplazar),
// con sus estrellas, la que toca ahora resaltada y las que aún no están con candado. Se cambia de capítulo con las
// pestañas o deslizando.
import { gsap } from 'gsap';
import { t, idioma } from '../i18n.js';
import { esc, sinFurigana } from '../japones.js';
import { figura } from '../clase-arte.js';
import { cajaFigura } from '../clase-escena.js';
import { $, $$, api, vibrar, quieto, encajar } from './comun.js';

const tr = (o) => (o && typeof o === 'object' ? o[idioma] ?? o.es ?? '' : o || '');
const estrellas = (r) => (!r ? 0 : (r.mejor ?? r.nota ?? 0) >= 90 ? 3 : (r.mejor ?? r.nota ?? 0) >= 70 ? 2 : 1);
let V = null, caps = [], hechas = {}, toca = null, cap = 0;

function pintar(dir = 0) {
  const c = caps[cap];
  $$('.mv-cls-pest', V).forEach((b, i) => b.setAttribute('aria-checked', i === cap));
  $('.mv-cls-cap', V).innerHTML = `<span lang="ja">${esc(c.jp)}</span> ${esc(c.titulo)}`;
  const rej = $('.mv-cls-rejilla', V);
  rej.innerHTML = c.clases.map((x) => {
    const r = hechas[x.id], n = estrellas(r), titulo = sinFurigana(tr(x.titulo)).split(':')[0];
    if (!x.hay) return `<div class="mv-cls-c cerrada" aria-label="${t('clase.indice.pronto')}"><i>${x.clase}</i>
      <svg class="mv-cls-candado" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="3" fill="currentColor"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>
      <small>${t('clase.indice.pronto')}</small></div>`;
    return `<a class="mv-cls-c${x.id === toca ? ' toca' : ''}${r ? ' hecha' : ''}" href="#clase/${encodeURIComponent(x.id)}"><i>${x.clase}</i>
      <svg viewBox="${cajaFigura(x.icono || 'libro')}" aria-hidden="true">${figura(x.icono || 'libro')}</svg>
      <b>${esc(titulo)}</b><span class="mv-cls-est">${[0, 1, 2].map((k) => `<em class="${k < n ? 'si' : ''}">★</em>`).join('')}</span></a>`;
  }).join('');
  encajar(rej, 0.75);
  $$('a.mv-cls-c', rej).forEach((a) => a.addEventListener('click', () => vibrar(10)));
  if (!quieto()) gsap.fromTo($$('.mv-cls-c', rej), { x: dir * 40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.32, stagger: 0.025, ease: 'power2.out' });
}
function ir(k) { if (k < 0 || k >= caps.length || k === cap) return; const dir = k > cap ? 1 : -1; cap = k; vibrar(8); pintar(dir); }

export async function entrar(v, resto, app) {
  V = v;
  const [indice, cls, d] = await Promise.all([fetch('/clases/indice.json').then((r) => r.json()).catch(() => []), api('/api/clases').catch(() => ({})), app.inicio().catch(() => ({}))]);
  hechas = cls || {}; toca = d.gramatica?.slug || null;
  const porN = new Map();
  for (const x of indice) {
    const n = x.capitulo?.n ?? 1;
    if (!porN.has(n)) porN.set(n, { n, jp: x.capitulo?.jp || '', titulo: tr(x.capitulo?.titulo), clases: [] });
    porN.get(n).clases.push(x);
  }
  caps = [...porN.values()].sort((a, b) => a.n - b.n);
  // se abre por el capítulo de la clase que toca (o por el primero)
  cap = Math.max(0, caps.findIndex((c) => c.clases.some((x) => x.id === toca)));
  const total = indice.filter((x) => x.hay).length, hechasN = indice.filter((x) => hechas[x.id]).length;
  v.innerHTML = `<div class="mv-cls">
    <header class="mv-cls-cab"><a class="mv-icono-btn" href="#aprender" aria-label="${t('mv.volver')}">‹</a>
      <h1 class="mv-tit">${t('mv.apr.clases')}</h1><span class="mv-apr-cuenta">${hechasN} / ${total}</span></header>
    <nav class="mv-aj-seg mv-cls-pests" role="tablist">${caps.map((c, i) => `<button class="mv-cls-pest" role="tab" data-c="${i}" aria-checked="${i === cap}" lang="ja">${esc(c.jp.replace(/^第|章$/g, '')) || c.n}</button>`).join('')}</nav>
    <p class="mv-cls-cap"></p>
    <div class="mv-cls-rejilla"></div></div>`;
  $$('.mv-cls-pest', v).forEach((b) => { b.onclick = () => ir(+b.dataset.c); });
  // deslizar: el capítulo siguiente o el de antes
  const rej = $('.mv-cls-rejilla', v); let x0 = null, y0 = 0;
  rej.addEventListener('pointerdown', (e) => { x0 = e.clientX; y0 = e.clientY; });
  rej.addEventListener('pointerup', (e) => { if (x0 == null) return; const dx = e.clientX - x0, dy = e.clientY - y0; x0 = null; if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) ir(cap + (dx < 0 ? 1 : -1)); });
  pintar();
}
