// Acerca de Nyango: qué es, aviso de no afiliación y créditos de todo lo que no es nuestro. Accesible con teclado, Esc para cerrar.
import { gsap } from 'gsap';
import { t } from './i18n.js';
import { capa, kbd } from './teclado.js';
import { LOCAL } from './motor/local.js';

const enlace = (url, txt) => `<a href="${url}" target="_blank" rel="noopener">${txt}</a>`;
// cada ficha: acerca.<id>.tit y acerca.<id>.cuerpo en web/i18n (los enlaces entran como {marcadores})
// la app suelta (escritorio y web) no usa Anki: sus fichas solo salen en la versión que va con el complemento
const CREDITOS = [
  ...(LOCAL ? [['nyandeck', {}], ['fotos', { unsplash: enlace('https://unsplash.com', 'Unsplash') }]] : [
    ['anki', {}], // qué hace con tu Anki: nunca toca tus tarjetas; con la sincronización, un archivo _nyango en tu carpeta de medios
    ['kaishi', { kaishi: enlace('https://github.com/donkuri/kaishi', 'Kaishi 1.5k') }],
    ['radicales', { nemui: enlace('https://ankiweb.net/shared/info/1722008986', 'ねむい') }],
    ['media', {}]]),
  ['voces', { voicevox: enlace('https://voicevox.hiroshiba.jp/', 'VOICEVOX') }], // obligatorio: «VOICEVOX:nombre» de cada voz usada
  ['gramatica', {}],
  ['kanjium', {}],
  ['kanjivg', { kanjivg: enlace('https://kanjivg.tagaini.net/', 'KanjiVG') }], // los trazos de los kana (CC BY-SA 3.0)
  ['motor', { three: enlace('https://threejs.org/', 'Three.js'), gsap: enlace('https://gsap.com/', 'GSAP') }],
].map(([id, v]) => ({ tit: t(`acerca.${id}.tit`), cuerpo: t(`acerca.${id}.cuerpo`, v) }));

let abierta = null;
export function abrirAcerca() {
  if (abierta) return;
  const c = document.createElement('div');
  c.className = 'tk-capa tk-acerca'; c.setAttribute('role', 'dialog'); c.setAttribute('aria-modal', 'true'); c.setAttribute('aria-labelledby', 'ac-tit');
  c.innerHTML = `<div class="tk-hoja ac-hoja" tabindex="-1" data-foco-capa>
    <header class="tk-cab"><span class="tk-logo">謝</span><div><div class="tk-ante">${t('acerca.ante')}</div><h2 id="ac-tit">${t('acerca.tit')}</h2></div>
      <button class="volver" data-cerrar>${t('comun.cerrar')} ${kbd('Esc')}</button></header>
    <div class="ac-cuerpo">
      <section class="aj-bloque"><h3>${t('acerca.que')}</h3>
        <p>${t(LOCAL ? 'acerca.que.p1_app' : 'acerca.que.p1')}</p>
        <p>${LOCAL ? t('acerca.que.p2_app') : t('acerca.que.p2', { g: kbd('G') })}</p></section>
      <div class="tk-grupos ac-grupos">${CREDITOS.map((x) => `<section class="tk-grupo"><h3>${x.tit}</h3><p>${x.cuerpo}</p></section>`).join('')}</div>
      <p class="ac-error">${t('acerca.error', { enlace: enlace('https://github.com/nyangoapp/nyango/issues', t('acerca.error.enlace')) })}</p>
    </div>
  </div>`;
  document.body.appendChild(c);
  const hoja = c.firstElementChild;
  gsap.fromTo(c, { opacity: 0 }, { opacity: 1, duration: 0.2 });
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.fromTo(hoja, { y: 60, scale: 0.92, rotate: -1.5 }, { y: 0, scale: 1, rotate: 0, duration: 0.6, ease: 'back.out(1.8)' });
    gsap.fromTo(c.querySelectorAll('.ac-grupos .tk-grupo'), { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.04, delay: 0.1, ease: 'back.out(2)' });
  }
  const cerrar = () => {
    if (!abierta) return;
    abierta = null; soltar();
    gsap.to(c, { opacity: 0, duration: 0.18, onComplete: () => c.remove() });
  };
  c.querySelector('[data-cerrar]').onclick = cerrar;
  c.addEventListener('click', (e) => { if (e.target === c) cerrar(); });
  const soltar = capa(c, (e) => { if (e.key === 'Escape') { cerrar(); return true; } return false; });
  abierta = c;
}
addEventListener('kd:acerca', () => abrirAcerca());
