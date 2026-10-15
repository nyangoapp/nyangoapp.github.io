// App de escritorio: si aquí aún no has estudiado nada y existe el progreso del Nyango de antes (el AppImage con Python),
// te pregunta una vez si lo traes. Se importa con la misma ruta que «Ajustes → Tu progreso → Traer una copia»: las
// palabras de Kaishi pasan a NyanDeck y lo de antes se guarda en copias/. El archivo viejo solo se lee.
import { api } from './app.js';
import { confirmar } from './teclado.js';
import { t } from './i18n.js';
import { nivel } from './motor/juego.js';

const VISTO = 'nyango.antiguo.preguntado';

export async function ofrecerProgresoAntiguo() {
  const invocar = window.__TAURI__?.core?.invoke;
  if (!invocar) return;
  try { if (localStorage.getItem(VISTO)) return; } catch (e) { /* sin almacenamiento: se pregunta */ }
  const actual = await api('/api/progreso/exportar').catch(() => null);
  if (!actual || actual.xp > 0 || Object.keys(actual.aprendidos || {}).length) return;
  const texto = await invocar('progreso_antiguo').catch(() => null);
  if (!texto) return;
  let viejo;
  try { viejo = JSON.parse(texto); } catch (e) { return; }
  const aprendidos = Object.keys(viejo.aprendidos || {}).length;
  if (!aprendidos && !viejo.xp) return;
  const si = await confirmar({ titulo: t('antiguo.titulo'), texto: t('antiguo.texto', { nivel: nivel(viejo.xp || 0), aprendidos }),
    si: t('antiguo.si'), no: t('antiguo.no'), sello: '猫' });
  try { localStorage.setItem(VISTO, '1'); } catch (e) { /* nada */ }
  if (!si) return;
  const r = await api('/api/progreso/importar', { texto }).catch(() => null);
  if (r?.ok) location.reload();
}
