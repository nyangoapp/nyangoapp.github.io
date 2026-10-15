// Aprender en el móvil: lo nuevo, en una pantalla y sin desplazar. Arriba, la lección de hoy (las palabras que tocan, con
// sus kanji); debajo, la siguiente clase de Nyan y la guía de gramática.
import { gsap } from 'gsap';
import { t, tn } from '../i18n.js';
import { esc, sinFurigana } from '../japones.js';
import { $$, vibrar, quieto, icono } from './comun.js';

export async function entrar(v, resto, app) {
  const d = await app.inicio(true).catch(() => ({}));
  const lec = d.leccion || {}, palabras = lec.palabras || [], g = d.gramatica;
  const hechas = d.gramatica_hechas || 0, total = d.gramatica_total || 0;
  v.innerHTML = `<div class="mv-apr">
    <h1 class="mv-tit mv-apr-tit">${t('mv.pest.aprender')}</h1>
    <div class="mv-carta mv-apr-hoy">
      <div class="mv-apr-hoy-cab"><span class="mv-ini-ico">${icono('leccion', 30)}</span>
        <div><span class="mv-etq">${t('mv.apr.hoy')}</span><b>${palabras.length ? tn('mv.paso.leccion_sub', lec.nuevas || palabras.length) : t('mv.apr.hoy_nada')}</b></div></div>
      ${palabras.length ? `<div class="mv-apr-palabras" lang="ja">${palabras.slice(0, 4).map((p) => `<span>${esc(p)}</span>`).join('')}</div>
        <p class="mv-apr-nota">${t('mv.apr.hoy_nota')}</p>
        <a class="mv-btn" href="#leccion">${t('mv.empezar')}</a>` : `<p class="mv-apr-nota">${t('mv.apr.hoy_nada_sub')}</p><a class="mv-btn-claro" href="#repaso">${t('mv.lec.a_repasar')}</a>`}
    </div>
    <div class="mv-apr-fila">
      <span class="mv-etq">${t('mv.apr.clases')}</span><a class="mv-apr-todas" href="#clases">${total ? `${hechas} / ${total} · ` : ''}${t('mv.apr.ver_todas')} ›</a></div>
    ${g ? `<a class="mv-carta mv-apr-clase" data-tc="gram" href="#clase/${encodeURIComponent(g.slug)}">
      <span class="mv-ini-ico">${icono('gramatica', 26)}</span>
      <div><small>${esc(g.capitulo || t('mv.paso.clase'))}</small><b>${esc(sinFurigana(g.titulo).split(':')[0])}</b>
        ${g.resumen ? `<p>${esc(g.resumen)}</p>` : ''}</div><i class="mv-apr-flecha" aria-hidden="true">›</i></a>`
      : `<div class="mv-carta mv-apr-clase"><div><b>${t('mv.apr.clases_todas')}</b></div></div>`}
    <a class="mv-carta mv-apr-guia" href="#guia">
      <span class="mv-ini-ico peq">${icono('historias', 22)}</span><div><b>${t('mv.apr.guia')}</b><small>${t('mv.apr.guia_sub')}</small></div><i class="mv-apr-flecha" aria-hidden="true">›</i></a>
    <a class="mv-carta mv-apr-guia" href="#conjugar">
      <span class="mv-ini-ico peq mv-apr-activ" lang="ja">活</span><div><b>${t('mv.conj.titulo')}</b><small>${t('mv.conj.entrada_sub')}</small></div><i class="mv-apr-flecha" aria-hidden="true">›</i></a>
  </div>`;
  $$('a', v).forEach((a) => a.addEventListener('click', () => vibrar(10)));
  if (!quieto()) gsap.fromTo($$('.mv-apr > *', v), { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease: 'back.out(1.6)' });
}
