// Inicio del móvil: Nyan en su cuarto (3D) llena la parte de arriba; abajo, una hoja con UN siguiente paso (lo que más
// importa ahora) y, debajo, lo que viene después en tarjetas que se deslizan de lado. Todo cabe sin desplazar.
import { gsap } from 'gsap';
import { t, tn, num } from '../i18n.js';
import { Mascota } from '../mascota.js';
import { esc, sinFurigana } from '../japones.js';
import { $, $$, api, nodo, nivelDe, icono, vibrar, quieto, AJUSTES, NIVELES_3D, nivel3d } from './comun.js';
import * as instalar from './instalar.js';

let m = null, juego = null;

// lo que toca ahora y lo que viene después, por orden de importancia
function pasos(d) {
  const l = [];
  const nuevo = !d.cuenta?.aprendidos && (d.kana?.hiragana || 0) < 46;
  if (nuevo) l.push({ id: 'kana', ir: '#kana', ico: 'kana', tit: t('mv.paso.kana'), sub: t('mv.paso.kana_sub', { n: d.kana?.hiragana || 0 }) });
  if (d.repasos_ahora) l.push({ id: 'repaso', ir: '#repaso', ico: 'repaso', tit: t('mv.paso.repaso'), sub: tn('mv.paso.repaso_sub', d.repasos_ahora, { n: num(d.repasos_ahora), tanda: Math.min(d.repasos_ahora, 20), min: Math.max(1, Math.round(Math.min(d.repasos_ahora, 20) * 6 / 60)) }) });
  if (d.leccion?.palabras?.length) l.push({ id: 'leccion', ir: '#aprender', ico: 'leccion', tit: t('mv.paso.leccion'), sub: tn('mv.paso.leccion_sub', d.leccion.nuevas || d.leccion.palabras.length), jp: d.leccion.palabras.slice(0, 3).join('・') });
  if (d.gramatica) l.push({ id: 'clase', ir: '#aprender', ico: 'gramatica', tit: esc(d.gramatica.capitulo || t('mv.paso.clase')), sub: esc(sinFurigana(d.gramatica.titulo).split(':')[0]) });
  if (d.lectura) l.push({ id: 'historia', ir: '#historias', ico: 'historias', tit: t('mv.paso.historia'), sub: esc(sinFurigana(d.lectura.titulo?.jp || '')) });
  // en la web publicada, sin instalar: instalarla (en el iPhone, Safari borra lo de las webs sin instalar a los 7 días)
  if (instalar.ofrecer()) l.splice(Math.min(1, l.length), 0, { id: 'instalar', ir: '#inicio/instalar', ico: 'mochi', tit: t('mv.ins.tit'), sub: t('mv.ins.sub') });
  if (!nuevo && (d.kana?.hiragana || 0) < 46) l.push({ id: 'kana', ir: '#kana', ico: 'kana', tit: t('mv.paso.kana'), sub: t('mv.paso.kana_sub', { n: d.kana?.hiragana || 0 }) });
  return l;
}
function bocadillo(d) {
  if (!d.cuenta?.aprendidos && (d.kana?.hiragana || 0) < 46) return t('mv.boc.kana');
  if (d.repasos_ahora) return tn('mv.boc.repaso', d.repasos_ahora, { n: num(d.repasos_ahora) });
  if (d.leccion?.palabras?.length) return t('mv.boc.leccion');
  return t('mv.boc.al_dia');
}

// Nyan en su cuarto: el mismo de la portada de escritorio, con lo que tenga colocado, a la calidad que se haya elegido para
// este teléfono (ajustes). Si el teléfono no puede con el 3D (o se lo quita por memoria), Nyan en foto: la app sigue igual
function crearNyan(v, d) {
  const sala = $('.mv-ini-sala', v), nivel = NIVELES_3D[nivel3d()];
  try { m?.destruir?.(); } catch { /* ya no estaba */ }
  m = null; $('.mv-ini-fijo', sala)?.remove();
  // un lienzo nuevo cada vez: el de un Nyan destruido ya no tiene contexto que dar
  const viejo = $('.mv-ini-lienzo', sala), lienzo = nodo(`<canvas class="mv-ini-lienzo" aria-label="${t('mv.ini.nyan')}"></canvas>`);
  viejo ? viejo.replaceWith(lienzo) : sala.prepend(lienzo);
  if (!nivel) return enFoto(v);
  try {
    m = new Mascota(lienzo, { equipo: d.mochi?.equipo_visto || 0, ligera: nivel });
    m.ponerSitios?.(d.mochi?.sitios);
    m.decorar?.(juego?.colocados || []);
    if (juego) import('./cuarto.js').then((c) => c.aplicarJuego(m, juego)).catch(() => {}); // su ropa, accesorio y aura
    m.quitarEquipo?.(d.mochi?.quitado || []);
    m.mirarVista?.();
    m.encuadrar?.(-0.07); // Nyan un poco a la derecha: a su izquierda va su bocadillo
    lienzo.addEventListener('click', () => { vibrar(10); m?.saludar?.(); });
    lienzo.addEventListener('webglcontextlost', () => enFoto(v)); // el sistema le quita la GPU (falta memoria)
  } catch (e) { console.warn('Nyan en 3D no arranca en este teléfono', e); enFoto(v); }
}
function enFoto(v) {
  const sala = $('.mv-ini-sala', v); if (!sala || $('.mv-ini-fijo', sala)) return;
  try { m?.destruir?.(); } catch { /* ya no estaba */ }
  m = null; $('.mv-ini-lienzo', v).hidden = true;
  sala.insertAdjacentHTML('afterbegin', '<img class="mv-ini-fijo" src="/img/reparto/nyan-feliz.webp" alt="" width="512" height="512">');
}
let ultimo = null; // los datos con los que se pintó Nyan (para rehacerlo si cambia la calidad)
addEventListener('nyango:nivel3d', () => { const v = $('.mv-vista[data-v="inicio"]'); if (v && ultimo) crearNyan(v, ultimo); });

export async function entrar(v, resto, app) {
  const d = await app.inicio(true);
  try { juego = await api('/api/juego'); } catch { juego = null; }
  const nv = nivelDe(d.xp), l = pasos(d), [primero, ...luego] = l;
  if (!$('.mv-ini-sala', v)) {
    v.innerHTML = `<div class="mv-inicio">
      <div class="mv-ini-sala"><div class="mv-ini-chips"></div><div class="mv-boc mv-ini-boc" aria-live="polite"></div></div>
      <div class="mv-hoja mv-ini-hoja"><i class="mv-agarre" aria-hidden="true"></i><div class="mv-ini-paso"></div></div></div>`;
    ultimo = d; crearNyan(v, d);
  } else { ultimo = d; m?.despertar?.(); m?.quitarEquipo?.(d.mochi?.quitado || []); }

  $('.mv-ini-chips', v).innerHTML = `
    <span class="mv-chip" title="${t('mv.racha')}"><span class="mv-chip-glifo">続</span>${tn('mv.dias', d.racha || 0, { n: d.racha || 0 })}</span>
    <button class="mv-chip mv-chip-cuarto" type="button" aria-label="${t('mv.cu.tit')}"><img src="/img/iconos/koban.svg" alt="" width="24" height="24">${num(juego?.monedas ?? 0)}${juego?.bolsas ? `<b class="mv-cu-n" title="${tn('mv.cu.tienes', juego.bolsas, { n: juego.bolsas })}">${juego.bolsas}</b>` : ''}</button>
    <span class="mv-chip mv-chip-nivel" title="${t('mv.nivel', { n: nv.L })}"><b>${nv.L}</b><i class="mv-barrita"><i style="width:${Math.round(nv.pct * 100)}%"></i></i></span>
    <button class="mv-chip mv-chip-aj" type="button" aria-label="${t('mv.ajustes.titulo')}">${AJUSTES}</button>`;
  $('.mv-chip-aj', v).addEventListener('click', () => { vibrar(8); import('./ajustes.js').then((a) => a.abrir(app)); });
  import('./enlazar.js').then((m) => m.marcar($('.mv-chip-aj', v)));   // el puntito de «sincronizado» junto al engranaje (si está enlazado)
  // el cuarto de Nyan (bolsas, colección y tienda): desde los koban, o con #inicio/cuarto (los finales de sesión enlazan aquí)
  const abrirCuarto = (pestana) => import('./cuarto.js').then((c) => c.abrir(app, m, { pestana }));
  $('.mv-chip-cuarto', v).addEventListener('click', () => { vibrar(8); abrirCuarto(); });
  if (resto[0] === 'instalar') { history.replaceState(null, '', '#inicio'); instalar.abrir(); }
  instalar.protegerDatos();
  if (resto[0] === 'cuarto') { history.replaceState(null, '', '#inicio'); setTimeout(() => abrirCuarto('bolsas'), quieto() ? 0 : 500); }
  const boc = $('.mv-ini-boc', v); boc.textContent = bocadillo(d);

  $('.mv-ini-paso', v).innerHTML = primero ? `
    <div class="mv-etq">${t('mv.ini.siguiente')}</div>
    <div class="mv-carta mv-ini-carta">
      <div class="mv-ini-carta-cab"><span class="mv-ini-ico">${icono(primero.ico, 30)}</span>
        <div><b>${primero.tit}</b><small>${primero.sub}</small></div></div>
      <a class="mv-btn" href="${primero.ir}">${t('mv.empezar')}</a></div>
    ${luego.length ? `<div class="mv-etq">${t('mv.ini.despues')}</div>
    <div class="mv-ini-luego">${luego.map((p) => `<a class="mv-carta mv-ini-mini mv-mini-${p.id}" href="${p.ir}"><span class="mv-ini-ico peq">${icono(p.ico, 22)}</span>
      <b>${p.tit}</b><small>${p.sub}</small>${p.jp ? `<span class="mv-ini-jp" lang="ja">${esc(p.jp)}</span>` : ''}</a>`).join('')}</div>` : ''}`
    : `<div class="mv-carta mv-ini-carta"><b>${t('mv.ini.al_dia')}</b><small>${t('mv.ini.al_dia_sub')}</small></div>`;

  if (!quieto()) {
    gsap.fromTo($('.mv-ini-hoja', v), { y: 60 }, { y: 0, duration: 0.45, ease: 'back.out(1.4)' });
    gsap.fromTo(boc, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, delay: 0.5, ease: 'back.out(2.2)' });
    gsap.fromTo($$('.mv-ini-mini', v), { x: 40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, stagger: 0.06, delay: 0.25, ease: 'back.out(1.6)' });
  }
  $$('a.mv-btn, a.mv-ini-mini', v).forEach((a) => a.addEventListener('click', () => vibrar(10)));
}
export function salir() { /* Nyan se pausa solo al ocultarse su vista (mascota.js mira la clase «activa») */ }
