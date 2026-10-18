// Antes de arrancar: si falta Anki o sus mazos (Kaishi 1.5k y radicales), no hay contenido que enseñar.
// En vez de romper, se enseña esta pantalla con el mismo estilo de la app y un botón para volver a mirar.
import { gsap } from 'gsap';
import { t, idioma, IDIOMAS, CABECERA, cambiarIdioma } from './i18n.js';
import { esc } from './japones.js';
import { capa } from './teclado.js';

const $ = (s, r = document) => r.querySelector(s);
const enlace = (url, txt) => `<a href="${url}" target="_blank" rel="noopener">${txt}</a>`;
const TEXTOS = Object.fromEntries(['sin_anki', 'faltan_mazos'].map((r) => [r, { tit: t(`arranque.${r}.tit`), p: t(`arranque.${r}.p`) }]));
// el detalle del servidor (anki.py) está en español: en otro idioma se cuenta con la razón y los mazos que faltan
function detalle(d) {
  if (idioma === 'es' || !d.razon) return d.detalle;
  if (d.razon === 'faltan_mazos' && d.faltan?.length) {
    const mazos = d.faltan.map((n) => (/radical|element/i.test(n) ? t('arranque.mazo_radicales') : 'Kaishi 1.5k'));
    return t('arranque.detalle.faltan_mazos', { mazos: mazos.join(t('arranque.y')) });
  }
  return d.detalle ? t(`arranque.detalle.${d.razon}`) : null;
}

export async function comprobarArranque() {
  const d = await fetch('/api/arranque', { headers: CABECERA }).then((r) => r.json()).catch(() => ({ listo: false, razon: 'sin_anki', detalle: null }));
  if (d.listo) return true;
  pintar(d);
  return false;
}

function pintar(d) {
  const tx = TEXTOS[d.razon] || TEXTOS.sin_anki, det = detalle(d);
  const c = document.createElement('div');
  c.className = 'modal-capa'; c.setAttribute('role', 'alertdialog'); c.setAttribute('aria-modal', 'true'); c.setAttribute('aria-labelledby', 'ar-tit');
  c.innerHTML = `<div class="modal-ficha ar-ficha" tabindex="-1" data-foco-capa>
    <span class="m-sello">準備</span>
    <div class="m-ante">${t('arranque.ante')}</div>
    <h2 id="ar-tit">${esc(tx.tit)}</h2>
    <p>${esc(tx.p)}</p>
    <ol class="ar-pasos">
      <li>${t('arranque.paso1', { anki: enlace('https://apps.ankiweb.net/', 'Anki') })}</li>
      <li>${t('arranque.paso2', { kaishi: enlace('https://github.com/donkuri/kaishi/releases/latest', 'Kaishi 1.5k') })}</li>
      <li>${t('arranque.paso3', { radicales: enlace('https://ankiweb.net/shared/info/1722008986', t('arranque.paso3.enlace')) })}</li>
      <li>${t('arranque.paso4')}</li>
    </ol>
    ${det ? `<p class="ar-detalle">${esc(det)}</p>` : ''}
    <button class="boton-tinta" id="ar-reintentar" data-foco>${t('arranque.reintentar')}</button>
    <div class="ar-idioma" role="radiogroup" aria-label="${esc(t('ajustes.idioma'))}">${IDIOMAS.map((i) => `<button role="radio" data-idioma="${i}" lang="${i}" aria-checked="${i === idioma}">${t(`idioma.${i}.nombre`)}</button>`).join('')}</div>
  </div>`;
  document.body.appendChild(c);
  const ficha = c.firstElementChild;
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  gsap.fromTo(c, { opacity: 0 }, { opacity: 1, duration: 0.35 });
  if (!quieto) gsap.fromTo(ficha, { y: 50, scale: 0.9, rotate: -2 }, { y: 0, scale: 1, rotate: 0, duration: 0.7, ease: 'back.out(1.8)' });
  const boton = $('#ar-reintentar', c);
  const reintentar = async () => {
    if (boton.disabled) return;
    boton.disabled = true; boton.textContent = t('arranque.mirando');
    const d2 = await fetch('/api/arranque', { method: 'POST', headers: CABECERA }).then((r) => r.json()).catch(() => ({ listo: false }));
    if (d2.listo) { location.reload(); return; }
    boton.disabled = false; boton.textContent = t('arranque.reintentar');
    boton.focus({ preventScroll: true }); // al deshabilitarlo el foco se fue a <body> e Intro ya no hacía nada
    if (!quieto) gsap.fromTo(ficha, { x: -8 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
  };
  boton.onclick = reintentar;
  c.querySelectorAll('[data-idioma]').forEach((b) => { b.onclick = () => { if (b.dataset.idioma !== idioma) cambiarIdioma(b.dataset.idioma); }; });
  capa(c, (e) => { if (e.key === 'Enter' && document.activeElement === boton) { reintentar(); return true; } return false; });
}
