// Lo que aún no tiene pantalla en el móvil (las clases y el lector de historias): un aviso amable con Nyan.
import { t } from '../i18n.js';

export async function entrar(v) {
  const id = v.dataset.v === 'clase' ? 'aprender' : v.dataset.v;
  v.innerHTML = `<div class="mv-pronto">
    <img src="/img/reparto/nyan-pensando.webp" alt="" width="200" height="200">
    <h2 class="mv-tit">${t('mv.pest.' + id)}</h2>
    <p>${t('mv.pronto')}</p>
    <a class="mv-btn" href="${id === 'aprender' ? '#aprender' : '#inicio'}">${t(id === 'aprender' ? 'mv.volver' : 'mv.volver_inicio')}</a></div>`;
}
