// Ajustes en el móvil: una hoja que sube desde abajo (desde el engranaje de la portada) y cabe entera sin desplazar.
// Nyan en 3D (a la medida de este teléfono), sonidos, volúmenes e idioma. Lo del 3D se guarda en el teléfono; lo demás,
// en el progreso, como en el escritorio (/api/ajustes).
import { gsap } from 'gsap';
import { t, hay, idioma, cambiarIdioma } from '../i18n.js';
import * as son from '../sonido.js';
import { $, $$, api, nodo, vibrar, quieto, CERRAR, NIVELES_3D, nivel3d, ponerNivel3d } from './comun.js';
import { puedeInstalar, abrir as abrirInstalar } from './instalar.js';
import { TEMAS, temaElegido, ponerTema } from '../tema.js';   // el mismo del escritorio: letras precargadas, fundido y guardado (navegador + ajuste del motor)

const VOLUMENES = ['vol_efectos', 'vol_voz'];
// los nombres de los temas son nombres propios (iguales en los dos idiomas); «Tema» y «Auto» salen del diccionario
const NOMBRE_TEMA = { washi: 'Washi', noche: 'Noche', pop: 'Pop', sumi: 'Sumi' };
const nombreTema = (id) => NOMBRE_TEMA[id] || (hay('mv.ajustes.tema_auto') ? t('mv.ajustes.tema_auto') : 'Auto');
const tituloTema = () => (hay('mv.ajustes.tema') ? t('mv.ajustes.tema') : idioma === 'en' ? 'Theme' : 'Tema');

export function abrir(app) {
  if ($('.mv-aj')) return;
  const aj = app.ajustes, n3d = nivel3d(), tema0 = temaElegido();
  const vol = (k) => (typeof aj[k] === 'number' ? aj[k] : 100);
  const interruptor = (k, si) => `<button class="mv-aj-fila" type="button" role="switch" data-aj="${k}" aria-checked="${si}">
    <span>${t('mv.ajustes.' + k)}</span><i class="mv-interruptor" aria-hidden="true"><i></i></i></button>`;
  const raiz = nodo(`<div class="mv-aj" role="dialog" aria-modal="true" aria-labelledby="mv-aj-tit"><div class="mv-aj-velo"></div>
    <div class="mv-hoja mv-aj-hoja"><i class="mv-agarre" aria-hidden="true"></i>
      <header class="mv-aj-cab"><h2 class="mv-tit" id="mv-aj-tit">${t('mv.ajustes.titulo')}</h2>
        <button class="mv-icono-btn" data-cerrar type="button" aria-label="${t('mv.cerrar')}">${CERRAR}</button></header>
      <section class="mv-aj-sec"><h3 class="mv-etq">${t('mv.ajustes.nyan3d')}</h3>
        <div class="mv-aj-seg" role="radiogroup" aria-label="${t('mv.ajustes.nyan3d')}">${Object.keys(NIVELES_3D).map((n) => `
          <button type="button" role="radio" data-n3d="${n}" aria-checked="${n === n3d}">${t('mv.ajustes.n3d.' + n)}</button>`).join('')}</div>
        <p class="mv-aj-pista" aria-live="polite">${t('mv.ajustes.n3d_pista.' + n3d)}</p></section>
      <section class="mv-aj-sec"><h3 class="mv-etq">${tituloTema()}</h3>
        <div class="mv-aj-temas" role="radiogroup" aria-label="${tituloTema()}">${TEMAS.map((id) => `
          <button type="button" class="mv-tema" role="radio" data-t="${id}" aria-checked="${id === tema0}"><span class="mv-tema-marco" aria-hidden="true">${id === 'auto'
            ? `<span class="mv-tema-ver mv-tema-auto"><span data-muestra="washi"><i></i><b></b></span><span data-muestra="noche"><i></i><b></b></span></span>`
            : `<span class="mv-tema-ver" data-muestra="${id}"><i></i><b></b></span>`}</span>${nombreTema(id)}</button>`).join('')}</div></section>
      <section class="mv-aj-sec"><h3 class="mv-etq">${t('mv.ajustes.sec_sonido')}</h3>
        ${interruptor('sonido', aj.sonido !== false)}${interruptor('autoplay', aj.autoplay !== false)}
        ${VOLUMENES.map((k) => `<label class="mv-aj-vol"><span>${t('mv.ajustes.' + k)}</span>
          <input type="range" min="0" max="100" step="5" value="${vol(k)}" data-vol="${k}" style="--v:${vol(k)}%"><b>${vol(k)}</b></label>`).join('')}</section>
      ${app.datos?.de_nivel ? `<section class="mv-aj-sec"><button class="mv-btn-claro mv-aj-deshacer" data-deshacer-nivel>${t('ajustes.nivel.deshacer')}</button>
        <p class="mv-aj-pista">${t('ajustes.nivel.nota', { n: app.datos.de_nivel })}</p></section>` : ''}
      <section class="mv-aj-sec mv-aj-filas">${puedeInstalar() ? `<button class="mv-aj-fila" data-instalar type="button"><span>${t('mv.ins.tit')}</span><i class="mv-aj-flecha" aria-hidden="true">›</i></button>` : ''}
        <button class="mv-aj-fila" data-enlazar type="button"><span><b class="mv-en-fila-t">${t('mv.enl.fila')}</b><small class="mv-en-fila-s" hidden></small></span><i class="mv-aj-flecha" aria-hidden="true">›</i></button>
        <a class="mv-aj-fila" href="#bienvenida"><span>${t('ajustes.bv.bienvenida')}</span><i class="mv-aj-flecha" aria-hidden="true">›</i></a></section>
      <section class="mv-aj-sec"><h3 class="mv-etq">${t('mv.ajustes.idioma')}</h3>
        <div class="mv-aj-seg" role="radiogroup" aria-label="${t('mv.ajustes.idioma')}">
          <button type="button" role="radio" data-idioma="es" aria-checked="${idioma === 'es'}">Español</button>
          <button type="button" role="radio" data-idioma="en" aria-checked="${idioma === 'en'}">English</button></div></section>
    </div></div>`);
  $('#movil').appendChild(raiz);
  const hoja = $('.mv-aj-hoja', raiz);
  if (!quieto()) { gsap.fromTo(hoja, { y: '100%' }, { y: '0%', duration: 0.42, ease: 'back.out(1.1)' }); gsap.fromTo($('.mv-aj-velo', raiz), { opacity: 0 }, { opacity: 1, duration: 0.3 }); }

  const cerrar = () => {
    if (raiz.dataset.fuera) return; raiz.dataset.fuera = '1';
    if (quieto()) return raiz.remove();
    gsap.to($('.mv-aj-velo', raiz), { opacity: 0, duration: 0.22 });
    gsap.to(hoja, { y: '100%', duration: 0.26, ease: 'power2.in', onComplete: () => raiz.remove() });
    setTimeout(() => raiz.remove(), 450); // por si la animación no llega a acabar (pestaña en segundo plano…)
  };
  $('[data-cerrar]', raiz).onclick = cerrar;
  $('.mv-aj-velo', raiz).onclick = cerrar;
  addEventListener('hashchange', cerrar, { once: true });

  // Nyan en 3D: se rehace al momento con lo elegido (la portada está detrás y se ve el cambio)
  $$('[data-n3d]', raiz).forEach((b) => b.addEventListener('click', () => {
    const n = b.dataset.n3d; if (n === nivel3d()) return;
    vibrar(10); son.toque?.();
    $$('[data-n3d]', raiz).forEach((x) => x.setAttribute('aria-checked', x === b));
    $('.mv-aj-pista', raiz).textContent = t('mv.ajustes.n3d_pista.' + n);
    ponerNivel3d(n);
  }));
  // el tema: se aplica al momento (con un fundido corto) y ponerTema lo guarda en el teléfono y en el progreso (sin sincronizar entre aparatos)
  $$('[data-t]', raiz).forEach((b) => b.addEventListener('click', () => {
    const v = b.dataset.t; if (v === temaElegido()) return;
    vibrar(10); son.toque?.();
    $$('[data-t]', raiz).forEach((x) => x.setAttribute('aria-checked', x === b));
    ponerTema(v);
  }));
  // sonidos y lectura en voz alta: se guardan en el progreso
  $$('[data-aj]', raiz).forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.aj, si = b.getAttribute('aria-checked') !== 'true';
    b.setAttribute('aria-checked', si); vibrar(8);
    app.cambiarAjuste(k, si);
    if (k === 'sonido' && si) son.toque?.();
  }));
  // volúmenes: suenan al soltar, con una muestra de lo que se está ajustando
  $$('[data-vol]', raiz).forEach((r) => {
    const k = r.dataset.vol, poner = () => { r.style.setProperty('--v', `${r.value}%`); r.nextElementSibling.textContent = r.value; app.cambiarAjuste(k, +r.value, false); };
    r.addEventListener('input', poner);
    r.addEventListener('change', () => { poner(); app.cambiarAjuste(k, +r.value); if (k === 'vol_efectos') son.cambio?.(2); else son.voz?.('nya'); });
  });
  // idioma: se guarda y la página se recarga (hay textos en constantes de módulo)
  $$('[data-idioma]', raiz).forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.idioma === idioma) return;
    $$('[data-idioma]', raiz).forEach((x) => x.setAttribute('aria-checked', x === b));
    cambiarIdioma(b.dataset.idioma);
  }));
  // vincular con el ordenador (enlazar.js): la fila cuenta cómo va la sincronización si ya está enlazado
  import('./enlazar.js').then((m) => m.subtitulo($('[data-enlazar]', raiz)));
  $('[data-enlazar]', raiz).addEventListener('click', () => { vibrar(8); cerrar(); setTimeout(() => import('./enlazar.js').then((m) => m.abrir(app)), 300); });
  $('[data-instalar]', raiz)?.addEventListener('click', () => { cerrar(); setTimeout(abrirInstalar, 300); });
  const deshacer = $('[data-deshacer-nivel]', raiz);
  if (deshacer) deshacer.addEventListener('click', async () => {
    if (deshacer.dataset.seguro !== '1') { deshacer.dataset.seguro = '1'; deshacer.textContent = t('mv.ajustes.seguro'); vibrar([10, 30, 10]); return; } // segundo toque: confirma
    try { await api('/api/nivel/deshacer', {}); } catch { return; }
    deshacer.closest('.mv-aj-sec').remove(); vibrar(12); app.inicio(true).catch(() => {});
  });
  $('[data-cerrar]', raiz).focus({ preventScroll: true });
}
