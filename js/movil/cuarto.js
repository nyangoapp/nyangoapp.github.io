// El cuarto de Nyan en el móvil: una hoja sobre la portada (Nyan y su cuarto en 3D siguen detrás y cambian al momento).
// Bolsas de la suerte (福袋): se abren aquí, con su sorpresa. Colección: lo que tienes, por tipo; tocar un objeto lo pone
// o lo quita (en el cuarto, o encima de Nyan si es ropa, accesorio o aura). Tienda: bolsas y amuletos con koban.
// Todo cabe sin desplazar: cada tipo de la colección es una página.
import { gsap } from 'gsap';
import { t, tn, num } from '../i18n.js';
import * as son from '../sonido.js';
import { esc } from '../japones.js';
import { $, $$, api, vibrar, quieto, encajar, chispas, nodo, CERRAR } from './comun.js';

const TIPOS = ['habitacion', 'ropa', 'accesorio', 'aura'];
// arte: la bolsa y el omamori (la tienda) son dibujos con sus colores, no interfaz
const BOLSA = `<svg class="mv-cu-bolsa-svg" viewBox="0 0 120 120" aria-hidden="true"><ellipse cx="60" cy="112" rx="36" ry="6" fill="rgba(80,45,10,.18)"/>
  <path d="M28 52 C16 70 18 104 60 106 C102 104 104 70 92 52 Z" fill="#f2661b"/><path d="M28 52 C16 70 18 104 60 106 C40 100 32 76 40 54 Z" fill="#d6531a"/>
  <path d="M40 30 C46 40 74 40 80 30 C88 38 90 48 92 52 C76 60 44 60 28 52 C30 46 33 37 40 30 Z" fill="#ff8c3a"/>
  <path d="M44 46 Q60 54 76 46" fill="none" stroke="#fffaf0" stroke-width="5" stroke-linecap="round"/><circle cx="60" cy="49" r="6" fill="#fffaf0"/>
  <path d="M40 30 C44 18 52 14 56 22 M80 30 C76 18 68 14 64 22" fill="none" stroke="#ff8c3a" stroke-width="7" stroke-linecap="round"/>
  <text x="60" y="88" text-anchor="middle" font-size="30" font-weight="900" fill="#fffaf0" font-family="'Zen Maru Gothic', sans-serif">福</text></svg>`;

let J = null, app = null, m = null, raiz = null, pest = 'bolsas', tipo = 'habitacion';

const objeto = (id) => J.catalogo.objetos.find((o) => o.id === id);
const rareza = (r) => J.catalogo.rarezas[r] || { color: '#9c8a55', nombre: r };   // el color de cada rareza viene del catálogo del juego (dato, no tema)
const tengo = (id) => J.inventario.find((x) => x.id === id);
// Nyan con lo que tiene puesto, y el cuarto con lo que hay colocado
function aplicar() {
  if (!m) return;
  const tipoDe = (id) => objeto(id)?.tipo, ids = J.colocados || [];
  m.decorar?.(ids);
  m.accesorio?.(ids.find((id) => tipoDe(id) === 'accesorio') || null);
  m.ropa?.(ids.find((id) => tipoDe(id) === 'ropa') || null);
  m.auraColeccion?.(ids.find((id) => tipoDe(id) === 'aura') || null);
}
async function poner(id, si) {
  const r = await api('/api/colocar', { id, colocado: si });
  J.colocados = r.colocados; for (const it of J.inventario) it.colocado = r.colocados.includes(it.id);
  aplicar(); son.toque?.(); vibrar(10);
  return r;
}

function cabecera() {
  return `<div class="mv-cu-cab"><h2 class="mv-tit">${t('mv.cu.tit')}</h2>
    <span class="mv-chip"><img src="/img/iconos/koban.svg" alt="" width="22" height="22">${num(J.monedas)}</span>
    <button class="mv-icono-btn" data-cerrar aria-label="${t('mv.cerrar')}">${CERRAR}</button></div>
    <div class="mv-aj-seg mv-cu-pests" role="tablist">${['bolsas', 'coleccion', 'tienda'].map((p) => `<button role="tab" data-p="${p}" aria-checked="${p === pest}">${t('mv.cu.' + p)}${p === 'bolsas' && J.bolsas ? ` <b class="mv-cu-n">${J.bolsas}</b>` : ''}</button>`).join('')}</div>`;
}
function pintar() {
  const hoja = $('.mv-cu-hoja', raiz);
  hoja.innerHTML = `<i class="mv-agarre" aria-hidden="true"></i>${cabecera()}<div class="mv-cu-cuerpo"></div>`;
  $('[data-cerrar]', hoja).onclick = cerrar;
  $$('[data-p]', hoja).forEach((b) => { b.onclick = () => { if (pest === b.dataset.p) return; pest = b.dataset.p; vibrar(8); pintar(); }; });
  ({ bolsas, coleccion, tienda })[pest]($('.mv-cu-cuerpo', hoja));
}

// ── bolsas ──
function bolsas(c) {
  c.innerHTML = `<div class="mv-cu-bolsas"><button class="mv-cu-bolsa" ${J.bolsas ? '' : 'disabled'} aria-label="${t('mv.cu.abrir')}">${BOLSA}</button>
    <p class="mv-cu-cuenta">${J.bolsas ? tn('mv.cu.tienes', J.bolsas, { n: J.bolsas }) : t('mv.cu.ninguna')}</p>
    <p class="mv-cu-pista">${J.bolsas ? t('mv.cu.legendaria', { n: J.legendario_en }) : t('mv.cu.como_ganar')}</p>
    ${J.bolsas ? `<button class="mv-btn" data-abrir>${t('mv.cu.abrir')}</button>` : `<button class="mv-btn-claro" data-a-tienda>${t('mv.cu.ir_tienda')}</button>`}</div>`;
  const abrirla = () => abrirBolsa(c);
  $('.mv-cu-bolsa', c).onclick = () => J.bolsas && abrirla();
  $('[data-abrir]', c)?.addEventListener('click', abrirla);
  $('[data-a-tienda]', c)?.addEventListener('click', () => { pest = 'tienda'; pintar(); });
  if (J.bolsas && !quieto()) gsap.to($('.mv-cu-bolsa-svg', c), { rotation: 4, yoyo: true, repeat: -1, duration: 0.9, ease: 'sine.inOut', transformOrigin: '50% 90%' });
}
async function abrirBolsa(c) {
  const bolsa = $('.mv-cu-bolsa-svg', c); if (!bolsa || c.dataset.abriendo) return;
  c.dataset.abriendo = '1'; vibrar(12);
  let r;
  try { r = await api('/api/bolsa/abrir', {}); } catch { delete c.dataset.abriendo; return; }
  J.bolsas = r.bolsas_restantes; J.monedas = r.monedas; J.legendario_en = r.legendario_en;
  if (!tengo(r.objeto.id)) J.inventario.push({ id: r.objeto.id, n: 1, colocado: false, nuevo: true }); else tengo(r.objeto.id).n = r.veces;
  // la bolsa tiembla cada vez más y revienta
  if (!quieto()) {
    gsap.killTweensOf(bolsa);
    await gsap.timeline().to(bolsa, { rotation: -8, duration: 0.08, yoyo: true, repeat: 5, transformOrigin: '50% 90%' })
      .to(bolsa, { rotation: 12, scale: 1.08, duration: 0.06, yoyo: true, repeat: 7 }).to(bolsa, { scale: 1.3, opacity: 0, duration: 0.18, ease: 'power2.in' }).then();
  }
  son.fanfarria?.(); vibrar([20, 40, 30]);
  const o = r.objeto, ra = rareza(o.rareza), puesto = (J.colocados || []).includes(o.id), paraNyan = o.tipo !== 'habitacion';
  c.innerHTML = `<div class="mv-cu-sale" style="--rc:${ra.color}">
    <div class="mv-cu-luz"></div><img class="mv-cu-obj" src="/img/objetos/${encodeURIComponent(o.id)}.svg" alt="">
    <span class="mv-cu-rareza">${esc(ra.nombre || o.rareza)}</span><h3>${esc(o.nombre || o.id)} <small lang="ja">${esc(o.jp || '')}</small></h3>
    <p>${esc(o.desc || '')}</p>
    <p class="mv-cu-extra">${r.nuevo ? `<b class="mv-cu-nuevo">${t('mv.cu.nuevo')}</b>` : t('mv.cu.repetido', { n: r.monedas_ganadas })}</p>
    <div class="mv-cu-fila">${r.nuevo && !puesto ? `<button class="mv-btn-claro" data-poner>${paraNyan ? t('mv.cu.ponselo') : t('mv.cu.ponlo')}</button>` : ''}
      ${J.bolsas ? `<button class="mv-btn" data-otra>${t('mv.cu.otra', { n: J.bolsas })}</button>` : `<button class="mv-btn" data-vale>${t('mv.cu.vale')}</button>`}</div></div>`;
  encajar($('.mv-cu-sale', c), 0.7);
  chispas($('.mv-cu-obj', c), { n: o.rareza === 'legendario' ? 28 : 16, colores: [ra.color, '--aviso', '--sup', '--acento'] });
  if (!quieto()) {
    gsap.fromTo($('.mv-cu-obj', c), { scale: 0.2, rotation: -20, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: 0.6, ease: 'back.out(2.2)' });
    gsap.fromTo($('.mv-cu-luz', c), { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6 });
    gsap.to($('.mv-cu-luz', c), { rotation: 360, duration: 14, repeat: -1, ease: 'none' });
    gsap.fromTo($$('.mv-cu-sale > :not(.mv-cu-luz):not(.mv-cu-obj)', c), { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, stagger: 0.06, delay: 0.35 });
  }
  $('[data-poner]', c)?.addEventListener('click', async (e) => { const b = e.currentTarget; b.disabled = true; await poner(o.id, true).catch(() => {}); b.textContent = t('mv.cu.puesto'); });
  $('[data-otra]', c)?.addEventListener('click', () => { delete c.dataset.abriendo; pintar(); });
  $('[data-vale]', c)?.addEventListener('click', () => { delete c.dataset.abriendo; pintar(); });
  app.inicio(true).catch(() => {});
}

// ── colección ──
function coleccion(c) {
  const lista = J.catalogo.objetos.filter((o) => o.tipo === tipo);
  const total = J.catalogo.objetos.length, mias = J.inventario.filter((x) => objeto(x.id)).length;
  c.innerHTML = `<div class="mv-cu-col"><div class="mv-cu-tipos">${TIPOS.map((tp) => `<button class="mv-chip" data-t="${tp}" aria-pressed="${tp === tipo}">${t('mv.cu.tipo.' + tp)}</button>`).join('')}
      <span class="mv-apr-cuenta">${mias} / ${total}</span></div>
    <p class="mv-cu-pista">${tipo === 'habitacion' ? t('mv.cu.pista_cuarto') : t('mv.cu.pista_nyan')}</p>
    <div class="mv-cu-rejilla">${lista.map((o) => {
      const x = tengo(o.id), ra = rareza(o.rareza);
      return x ? `<button class="mv-cu-c${x.colocado ? ' puesto' : ''}" data-id="${o.id}" style="--rc:${ra.color}" aria-pressed="${!!x.colocado}" aria-label="${esc(o.nombre || o.id)}">
          <img src="/img/objetos/${encodeURIComponent(o.id)}.svg" alt=""><small>${esc(o.nombre || o.id)}</small>${x.nuevo ? '<i class="mv-cu-punto"></i>' : ''}</button>`
        : `<div class="mv-cu-c falta" aria-label="${t('mv.cu.falta')}"><img src="/img/objetos/${encodeURIComponent(o.id)}.svg" alt=""><small>?</small></div>`;
    }).join('')}</div></div>`;
  // que quepan todos: primero se encoge; si aún no caben, fuera los nombres (se ven al tocar en la ficha de la bolsa)
  const rej = $('.mv-cu-rejilla', c);
  encajar(rej, 0.82);
  if (rej.scrollHeight > rej.clientHeight + 1) { rej.classList.add('compacta'); encajar(rej, 0.6); }
  $$('[data-t]', c).forEach((b) => { b.onclick = () => { tipo = b.dataset.t; vibrar(6); coleccion(c); }; });
  $$('.mv-cu-c[data-id]', c).forEach((b) => { b.onclick = async () => {
    const id = b.dataset.id, si = b.getAttribute('aria-pressed') !== 'true';
    await poner(id, si).catch(() => {});
    coleccion(c);   // una prenda nueva quita la anterior: se repinta todo
    const nueva = $(`.mv-cu-c[data-id="${id}"]`, c); if (nueva && si && !quieto()) gsap.fromTo(nueva, { scale: 0.85 }, { scale: 1, duration: 0.45, ease: 'elastic.out(1, .4)' });
  }; });
  const nuevos = J.inventario.filter((x) => x.nuevo && objeto(x.id)?.tipo === tipo).map((x) => x.id);
  if (nuevos.length) api('/api/coleccion/visto', { ids: nuevos }).then(() => { for (const x of J.inventario) if (nuevos.includes(x.id)) x.nuevo = false; }).catch(() => {});
}

// ── tienda ──
function tienda(c) {
  const art = [['bolsa', BOLSA], ['omamori', `<svg viewBox="0 0 60 80" aria-hidden="true"><path d="M12 14 H48 V70 Q30 78 12 70 Z" fill="#d8412a"/><path d="M12 14 L30 4 L48 14" fill="#b8301f"/><rect x="18" y="26" width="24" height="30" rx="3" fill="#ffe3a8"/><text x="30" y="47" text-anchor="middle" font-size="15" font-weight="900" fill="#b8301f" font-family="'Zen Maru Gothic', sans-serif">守</text></svg>`]];
  c.innerHTML = `<div class="mv-cu-tienda">${art.map(([id, svg]) => `<div class="mv-carta mv-cu-art">${svg}<div><b>${t('mv.cu.art.' + id)}</b><small>${t('mv.cu.art.' + id + '_d', { n: J.omamori || 0 })}</small></div>
      <button class="mv-btn mv-cu-comprar" data-comprar="${id}" ${J.monedas < J.precios[id] ? 'disabled' : ''}><img src="/img/iconos/koban.svg" alt="" width="20" height="20">${num(J.precios[id])}</button></div>`).join('')}
    <p class="mv-cu-pista">${t('mv.cu.koban')}</p></div>`;
  $$('[data-comprar]', c).forEach((b) => { b.onclick = async () => {
    b.disabled = true;
    try { const r = await api('/api/tienda', { articulo: b.dataset.comprar }); J.monedas = r.monedas; J.bolsas = r.bolsas; J.omamori = r.omamori; son.moneda?.(); vibrar(12); chispas(b); } catch { vibrar([18, 50, 18]); }
    pintar(); app.inicio(true).catch(() => {});
  }; });
}

function cerrar() {
  if (!raiz || raiz.dataset.fuera) return;
  raiz.dataset.fuera = '1';
  const r = raiz; raiz = null;
  if (quieto()) { r.remove(); return; }
  gsap.to($('.mv-aj-velo', r), { opacity: 0, duration: 0.2 });
  gsap.to($('.mv-cu-hoja', r), { y: '100%', duration: 0.26, ease: 'power2.in', onComplete: () => r.remove() });
  setTimeout(() => r.remove(), 450);
}

export async function abrir(a, mascota, { pestana = null } = {}) {
  if (raiz) return;
  app = a; m = mascota;
  try { J = await api('/api/juego'); } catch { return; }
  pest = pestana || (J.bolsas ? 'bolsas' : 'coleccion');
  raiz = nodo(`<div class="mv-aj mv-cu" role="dialog" aria-modal="true"><div class="mv-aj-velo"></div><div class="mv-hoja mv-cu-hoja"></div></div>`);
  $('#movil').appendChild(raiz);
  $('.mv-aj-velo', raiz).onclick = cerrar;
  addEventListener('hashchange', cerrar, { once: true });
  pintar();
  if (!quieto()) gsap.fromTo($('.mv-cu-hoja', raiz), { y: '100%' }, { y: '0%', duration: 0.42, ease: 'back.out(1.1)' });
}
export const aplicarJuego = (mascota, juego) => { m = mascota; J = juego; if (J) aplicar(); };
