// Instalar Nyango en el teléfono (la web publicada es una PWA). En el iPhone no hay botón: se explica «Compartir →
// Añadir a pantalla de inicio» (y es importante: Safari borra los datos de una web que no se abre en 7 días si no está
// instalada). En Android, Chrome avisa (beforeinstallprompt) y basta un botón. Ya instalada, se pide que no se borre nada.
import { gsap } from 'gsap';
import { t } from '../i18n.js';
import { $, vibrar, quieto, nodo, CERRAR } from './comun.js';

let aviso = null;   // el evento de Chrome para instalar, guardado para cuando se pulse el botón
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); aviso = e; });
addEventListener('appinstalled', () => { aviso = null; guardarVisto(); });

export const instalada = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const esIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
// solo tiene sentido en la web publicada (https), sin instalar y fuera de la app de escritorio
export const puedeInstalar = () => !window.__TAURI__ && window.isSecureContext && !!window.NYANGO_SW && !instalada();
const CLAVE = 'nyango-instalar-visto';
function guardarVisto() { try { localStorage.setItem(CLAVE, String(Date.now())); } catch { /* sin almacenamiento */ } }
// el aviso en la portada: hasta que se instale o se diga «ahora no» (y vuelve a la semana)
export function ofrecer() {
  if (!puedeInstalar()) return false;
  try { const v = +localStorage.getItem(CLAVE); if (v && Date.now() - v < 7 * 86400e3) return false; } catch { /* sin almacenamiento */ }
  return true;
}
// ya instalada: que el navegador no borre el progreso por falta de espacio
export function protegerDatos() { if (instalada()) navigator.storage?.persist?.().catch(() => {}); }

const COMPARTIR = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 15V3m0 0L8 7m4-4 4 4M6 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const MAS = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

export function abrir() {
  if ($('.mv-ins')) return;
  const ios = esIOS();
  const raiz = nodo(`<div class="mv-aj mv-ins" role="dialog" aria-modal="true"><div class="mv-aj-velo"></div>
    <div class="mv-hoja mv-ins-hoja"><i class="mv-agarre" aria-hidden="true"></i>
      <header class="mv-aj-cab"><h2 class="mv-tit">${t('mv.ins.tit')}</h2><button class="mv-icono-btn" data-cerrar aria-label="${t('mv.cerrar')}">${CERRAR}</button></header>
      <div class="mv-ins-icono"><img src="/img/marca/nyango/icono-128.png" alt="" width="72" height="72"><p>${t('mv.ins.p')}</p></div>
      ${ios ? `<ol class="mv-ins-pasos"><li><i>${COMPARTIR}</i><span>${t('mv.ins.ios1')}</span></li><li><i>${MAS}</i><span>${t('mv.ins.ios2')}</span></li><li><i>✓</i><span>${t('mv.ins.ios3')}</span></li></ol>`
        : aviso ? '' : `<ol class="mv-ins-pasos"><li><i>⋮</i><span>${t('mv.ins.and1')}</span></li><li><i>${MAS}</i><span>${t('mv.ins.and2')}</span></li></ol>`}
      <p class="mv-aj-pista">${t('mv.ins.datos')}</p>
      <div class="mv-cl-fila">${!ios && aviso ? `<button class="mv-btn" data-instalar>${t('mv.ins.boton')}</button>` : ''}<button class="mv-btn-claro" data-luego>${t('mv.ins.luego')}</button></div>
    </div></div>`);
  $('#movil').appendChild(raiz);
  const cerrar = () => { raiz.remove(); };
  $('[data-cerrar]', raiz).onclick = cerrar; $('.mv-aj-velo', raiz).onclick = cerrar;
  $('[data-luego]', raiz).onclick = () => { guardarVisto(); vibrar(8); cerrar(); dispatchEvent(new Event('nyango:instalar')); };
  $('[data-instalar]', raiz)?.addEventListener('click', async () => {
    vibrar(10); const e = aviso; aviso = null;
    try { await e.prompt(); const r = await e.userChoice; if (r?.outcome === 'accepted') { guardarVisto(); cerrar(); dispatchEvent(new Event('nyango:instalar')); } } catch { /* nada */ }
  });
  if (!quieto()) gsap.fromTo($('.mv-ins-hoja', raiz), { y: '100%' }, { y: '0%', duration: 0.42, ease: 'back.out(1.1)' });
}
