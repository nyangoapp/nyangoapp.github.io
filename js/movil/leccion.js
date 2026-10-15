// La lección en el móvil: las palabras nuevas de hoy (y los kanji y elementos que las forman), una lámina por pantalla,
// sin desplazar: se pasan deslizando o con el botón del pulgar. Después, la prueba (las pantallas del repaso, con
// prueba()) y, al acabar, lo aprendido se guarda de una vez (/api/aprender) y se celebra en una sola pantalla.
import { gsap } from 'gsap';
import { t, tn, num } from '../i18n.js';
import * as son from '../sonido.js';
import { esc, ruby, negrita } from '../japones.js';
import { cargarPool } from '../opciones.js';
import { $, $$, api, vibrar, quieto, encajar, CERRAR, PLAY } from './comun.js';
import { prueba } from './repaso.js';

let V = null, app = null, L = null, audio = null;

const caracter = (it) => (it.tipo === 'vocab' ? it.palabra : it.caracter || '');
const significado = (it) => (it.tipo === 'vocab' ? it.es || it.en : it.tipo === 'kanji' ? it.clave : it.nombre) || '';
function tamano(txt) { const n = [...txt].length; return n <= 1 ? 7 : n <= 2 ? 5.4 : n <= 3 ? 4.4 : n <= 4 ? 3.6 : n <= 6 ? 2.8 : 2.2; } // em

function tocar(archivo, boton) {
  if (!archivo) return;
  audio?.pause(); audio = son.pista('/media/' + encodeURIComponent(archivo));
  boton?.classList.add('sonando');
  audio.onended = () => boton?.classList.remove('sonando');
  audio.play().catch(() => boton?.classList.remove('sonando'));
}

// ── las láminas ──
function lamina(it) {
  const etq = `<span class="mv-lec-etq" style="--c:var(--t-${it.tipo})">${t('mv.lec.nueva_' + it.tipo)}</span>`;
  if (it.tipo === 'vocab') {
    const alt = (it.alt || []).slice(0, 2).map(esc).join(', ');
    const pista = it.mnemo ? `<div class="mv-lec-pista"><b>${t('mv.lec.truco')}</b> ${negrita(it.mnemo)}</div>` : it.matiz ? `<div class="mv-lec-pista"><b>${t('mv.lec.ojo')}</b> ${esc(it.matiz)}</div>` : '';
    return `${etq}
      ${it.imagen ? `<div class="mv-lec-img"><img src="/media/${encodeURIComponent(it.imagen)}" alt="" onerror="this.parentNode.remove()"></div>` : ''}
      <div class="mv-lec-palabra"><span lang="ja" style="font-size:${tamano(it.palabra)}em">${ruby(it.furigana || it.palabra)}</span>
        ${it.audio ? `<button class="mv-redondo" data-oir aria-label="${t('mv.escuchar')}">${PLAY}</button>` : ''}</div>
      <div class="mv-lec-sig">${esc(significado(it))}</div>${alt ? `<div class="mv-lec-alt">${t('mv.lec.tambien')} ${alt}</div>` : ''}
      ${it.frase ? `<div class="mv-lec-frase"><div lang="ja">${ruby(it.frase_furigana || it.frase)}</div><small>${esc(it.frase_es || it.frase_en || '')}</small>
        ${it.audio_frase ? `<button class="mv-lec-oirfrase" data-oir-frase aria-label="${t('mv.lec.oir_frase')}">${PLAY}</button>` : ''}</div>` : ''}
      ${pista}
      ${(it.kanji_info || []).length ? `<div class="mv-lec-kanjis"><span class="mv-etq">${tn('mv.lec.sus_kanji', it.kanji_info.length)}</span>
        ${it.kanji_info.map((k) => `<span class="mv-lec-k"><b lang="ja">${esc(k.caracter)}</b>${esc(k.clave || '')}</span>`).join('')}</div>` : ''}`;
  }
  const partes = (it.partes || []).map((p) => `<span class="mv-lec-k"><b lang="ja">${esc(String(p.elemento || '').split(' ')[0])}</b>${esc(p.nombre || '')}</span>`).join('');
  const lect = it.tipo === 'kanji' ? [['on', it.on], ['kun', it.kun]].filter(([, l]) => l?.length)
    .map(([k, l]) => `<span><i>${t('mv.lec.' + k)}</i><b lang="ja">${l.slice(0, 3).map(esc).join('、')}</b></span>`).join('') : '';
  return `${etq}
    <div class="mv-lec-kanji"><span class="mv-lec-baldosa" lang="ja">${esc(caracter(it))}</span>
      <div><div class="mv-lec-sig">${esc(significado(it))}</div>${(it.alt || []).length ? `<div class="mv-lec-alt">${t('mv.lec.tambien')} ${it.alt.slice(0, 2).map(esc).join(', ')}</div>` : ''}</div></div>
    ${partes ? `<div class="mv-lec-kanjis"><span class="mv-etq">${t('mv.lec.partes')}</span>${partes}</div>` : ''}
    ${it.mnemo ? `<div class="mv-lec-pista grande">${negrita(it.mnemo)}</div>` : ''}
    ${lect ? `<div class="mv-lec-lecturas">${lect}</div>` : ''}`;
}

function cabecera() {
  const n = L.items.length, i = L.i;
  const barra = n <= 8 ? `<div class="mv-lec-segs">${L.items.map((_, k) => `<i class="${k < i ? 'hecho' : k === i ? 'aqui' : ''}"></i>`).join('')}</div>`
    : `<div class="mv-barra"><i style="width:${Math.max(4, (100 * (i + 1)) / n)}%"></i></div>`;
  return `<div class="mv-rep-cab"><button class="mv-icono-btn" data-salir aria-label="${t('mv.salir')}">${CERRAR}</button>${barra}<span class="mv-rep-n"><b>${i + 1}</b> / ${n}</span></div>`;
}
function pintar(dir = 0) {
  const it = L.items[L.i], ultima = L.i === L.items.length - 1;
  audio?.pause();
  V.innerHTML = `<div class="mv-lec">${cabecera()}
    <div class="mv-carta mv-lec-carta" data-tipo="${it.tipo}" data-tc="${it.tipo}">${lamina(it)}</div>
    <div class="mv-lec-pie">${L.i === 0 ? `<div class="mv-lec-desliza">${t('mv.lec.desliza')}</div>` : ''}
      <div class="mv-lec-botones">${L.i ? `<button class="mv-btn-claro mv-lec-atras" aria-label="${t('mv.lec.atras')}">‹</button>` : ''}
        <button class="mv-btn mv-lec-sig-btn">${ultima ? t('mv.lec.a_prueba') : t('mv.siguiente')}</button></div></div></div>`;
  const carta = $('.mv-lec-carta', V);
  // la palabra, en una sola línea: si no cabe a lo ancho, más pequeña
  const pal = $('.mv-lec-palabra', V);
  if (pal) { const jp = pal.firstElementChild; let f = parseFloat(jp.style.fontSize); while (pal.scrollWidth > carta.clientWidth - 24 && f > 1.4) { f -= 0.2; jp.style.fontSize = `${f}em`; } }
  encajar(carta);
  $('[data-salir]', V).onclick = () => { audio?.pause(); location.hash = 'aprender'; };
  $('.mv-lec-sig-btn', V).onclick = avanzar;
  const atras = $('.mv-lec-atras', V); if (atras) atras.onclick = retroceder;
  const oir = $('[data-oir]', V); if (oir) oir.onclick = () => tocar(it.audio, oir);
  const oirF = $('[data-oir-frase]', V); if (oirF) oirF.onclick = () => tocar(it.audio_frase, oirF);
  deslizar(carta);
  if (!quieto()) gsap.fromTo(carta, { x: dir * 60, opacity: 0, rotate: dir * 1.5 }, { x: 0, opacity: 1, rotate: 0, duration: 0.38, ease: 'back.out(1.4)' });
  son.papel?.();
  if (it.tipo === 'vocab' && it.audio && app.ajustes.autoplay !== false) setTimeout(() => { if (L?.items[L.i] === it) tocar(it.audio, $('[data-oir]', V)); }, 350);
}
// deslizar a la izquierda: la siguiente; a la derecha: la de antes
function deslizar(carta) {
  let x0 = null, y0 = 0;
  carta.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; x0 = e.clientX; y0 = e.clientY; });
  carta.addEventListener('pointerup', (e) => {
    if (x0 == null) return;
    const dx = e.clientX - x0, dy = e.clientY - y0; x0 = null;
    if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    if (dx < 0) avanzar(); else retroceder();
  });
  carta.addEventListener('pointercancel', () => { x0 = null; });
}
function avanzar() {
  vibrar(8);
  if (L.i < L.items.length - 1) { L.i++; pintar(1); } else empezarPrueba();
}
function retroceder() { if (L.i > 0) { vibrar(8); L.i--; pintar(-1); } }

// ── la prueba y el final ──
function empezarPrueba() {
  audio?.pause();
  const cola = [];
  for (const it of L.items) for (const h of it.habilidades || ['sig']) cola.push({ item: it, habilidad: h, clave: `${it.id}:${h}` });
  cola.sort(() => Math.random() - 0.5);
  prueba(V, app, cola, terminar);
}
async function terminar(s) {
  V.innerHTML = `<div class="mv-rep mv-cargando"><div class="mv-etq">${t('mv.lec.guardando')}</div></div>`;
  const fallos = s.leccion.fallos, items = L.items;
  let r = { xp: 0 }, premio = null;
  try { r = await api('/api/aprender', { items: items.map((it) => ({ id: it.id, fallos: fallos[it.id] || 0 })) }); } catch { /* sin guardar */ }
  try { premio = await api('/api/sesion/fin', { respuestas: s.hechas, aciertos: s.bien, mejor_racha: s.mejor, lecciones: 1, gramatica: 0 }); } catch { /* nada */ }
  app.inicio(true).catch(() => {});
  son.fanfarria?.();
  const cuenta = { vocab: 0, kanji: 0, radical: 0 }; items.forEach((it) => cuenta[it.tipo]++);
  const partes = Object.entries(cuenta).filter(([, n]) => n).map(([k, n]) => tn('mv.lec.fin.' + k, n, { n }));
  V.innerHTML = `<div class="mv-rep mv-fin mv-lec-fin">
    <div class="mv-fin-cab"><div class="mv-etq">${t('mv.lec.fin.ante')}</div>
      <div class="mv-fin-sello" lang="ja">覚</div><h2 class="mv-tit">${t('mv.lec.fin.tit')}</h2><p class="mv-lec-fin-sub">${partes.join(' · ')}</p></div>
    <div class="mv-lec-fin-chips">${items.map((it) => `<span class="mv-lec-k"><b lang="ja">${esc(caracter(it))}</b>${esc(significado(it))}</span>`).join('')}</div>
    <div class="mv-fin-stats tres">
      <div class="mv-carta"><b>${s.hechas ? Math.round((100 * s.bien) / s.hechas) : 0}%</b><small>${t('mv.fin.aciertos')}</small></div>
      <div class="mv-carta"><b>${s.mejor}</b><small>${t('mv.fin.racha')}</small></div>
      <div class="mv-carta oro"><b>+${num(r.xp || 0)}</b><small>XP</small></div></div>
    ${premio?.bolsas_ganadas ? `<a class="mv-carta mv-fin-premio" href="#inicio/cuarto"><img src="/img/iconos/koban.svg" alt="" width="34" height="34"><span>${tn('mv.fin.bolsa', premio.bolsas_ganadas)}</span><i class="mv-apr-flecha" aria-hidden="true">›</i></a>` : ''}
    <div class="mv-fin-pie"><button class="mv-btn" data-otra>${t('mv.lec.otra')}</button><a class="mv-btn-claro" href="#inicio">${t('mv.volver_inicio')}</a></div></div>`;
  $('[data-otra]', V).onclick = () => empezar();
  encajar($('.mv-lec-fin-chips', V), 0.6);
  if (!quieto()) {
    gsap.fromTo($('.mv-fin-sello', V), { scale: 3, rotate: -30, opacity: 0 }, { scale: 1, rotate: -7, opacity: 1, duration: 0.35, ease: 'power4.in', delay: 0.2, onComplete: () => { son.sello?.(); vibrar(25); } });
    gsap.fromTo($$('.mv-lec-fin-chips > *', V), { y: 18, opacity: 0, scale: 0.8 }, { y: 0, opacity: 1, scale: 1, duration: 0.35, stagger: 0.03, delay: 0.45, ease: 'back.out(2)' });
    gsap.fromTo($$('.mv-fin-stats > *', V), { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.07, delay: 0.7, ease: 'back.out(2)' });
  }
}

async function empezar() {
  V.innerHTML = `<div class="mv-rep mv-cargando"><div class="mv-etq">${t('mv.lec.preparando')}</div></div>`;
  let d = null;
  try { [d] = await Promise.all([api('/api/leccion'), cargarPool()]); } catch { d = null; }
  // las que ya sabes no se vuelven a enseñar: solo lo nuevo (las palabras y los kanji y elementos que las forman)
  const ya = new Set(d?.ya_sabidas || []), items = (d?.items || []).filter((it) => !ya.has(it.id));
  if (!items.length) {
    V.innerHTML = `<div class="mv-pronto"><img src="/img/reparto/nyan-feliz.webp" alt="" width="200" height="200"><h2 class="mv-tit">${t('mv.lec.sin')}</h2>
      <p>${t('mv.lec.sin_sub')}</p><a class="mv-btn" href="#repaso">${t('mv.lec.a_repasar')}</a></div>`;
    return;
  }
  L = { items, i: 0 };
  pintar();
}
export async function entrar(v, resto, a) {
  V = v; app = a;
  try { await app.inicio(); } catch { /* ajustes por defecto */ }
  await empezar();
}
export function salir() { audio?.pause(); }
