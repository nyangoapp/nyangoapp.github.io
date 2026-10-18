// Nyango en el móvil (03-10): interfaz propia sobre el mismo motor y el mismo contenido que el escritorio.
// Pestañas abajo (Nyan · Aprender · Repasar · Kana · Historias), todo al alcance del pulgar, y las sesiones (repaso,
// práctica de kana…) a pantalla completa, sin pestañas y sin desplazar. Lo carga movil.html (index.html manda allí a los
// teléfonos, o con ?movil); su pantalla de carga avanza con window.__carga en cada paso del arranque.
import '../motor/local.js'; // el motor responde a /api/…: tiene que ir lo primero
import { gsap } from 'gsap';
import { t } from '../i18n.js';
import * as son from '../sonido.js';
import { $, $$, api, nodo, icono, vibrar, quieto } from './comun.js';
import { adoptarTemaDelMotor } from '../tema.js';

// una página abierta con #enlazar=<código> (el QR del ordenador, leído con la cámara del sistema): se guarda el código ya y se
// quita de la dirección, que si no el aviso de la bienvenida lo pisaría; enlazar.js lo ofrece cuando arranca la primera pantalla
const CODIGO_ENLACE = (location.hash.match(/^#enlazar=([^&]*)/) || [])[1] || '';
if (CODIGO_ENLACE) history.replaceState(null, '', '#inicio');
const carga = (p) => window.__carga?.(p);
carga(0.45); // el código ya está aquí; falta el motor (contenido y progreso)

const PESTANAS = [
  { id: 'inicio', ico: 'mochi' }, { id: 'aprender', ico: 'leccion' }, { id: 'repasar', ico: 'repaso', centro: true },
  { id: 'kana', ico: 'kana' }, { id: 'historias', ico: 'historias' },
];
// cada ruta, su módulo; las que no son pestaña van a pantalla completa
const MODULOS = { inicio: './inicio.js', aprender: './aprender.js', leccion: './leccion.js', clase: './clase.js', clases: './clases.js', guia: './guia.js', conjugar: './conjugar.js', bienvenida: './bienvenida.js', repaso: './repaso.js', kana: './kana.js', historias: './historias.js' };
const COMPLETAS = new Set(['repaso', 'leccion', 'clase', 'bienvenida']);
const PESTANA_DE = { repaso: 'repasar', leccion: 'aprender', clase: 'aprender', clases: 'aprender', guia: 'aprender', conjugar: 'aprender' }; // las rutas que no son pestaña, bajo cuál van

const raiz = nodo(`<div id="movil"><main class="mv-vistas"></main><nav class="mv-pestanas" aria-label="${t('mv.secciones')}">
  ${PESTANAS.map((p) => `<a class="mv-pest${p.centro ? ' mv-pest-centro' : ''}" href="#${p.id === 'repasar' ? 'repaso' : p.id}" data-p="${p.id}">
    <span class="mv-pest-ico">${icono(p.ico, p.centro ? 34 : 28)}${p.centro ? '<span class="mv-insignia" hidden></span>' : ''}</span>${t('mv.pest.' + p.id)}</a>`).join('')}</nav></div>`);
document.body.appendChild(raiz);
const vistas = $('.mv-vistas', raiz);

let actual = null, modActual = null, datos = null;
export const app = {
  // /api/inicio, guardado: lo comparten las pantallas (la portada lo pide al entrar; las sesiones lo refrescan al acabar)
  async inicio(fresco = false) {
    if (!datos || fresco) { datos = await api('/api/inicio'); pintarInsignia(); aplicarSonido(); }
    return datos;
  },
  get ajustes() { return datos?.ajustes || {}; },
  get datos() { return datos; },
  // un ajuste del progreso (sonido, autoplay, volúmenes…): se aplica al momento y, si guardar, va al motor
  cambiarAjuste(k, v, guardar = true) {
    if (datos) datos.ajustes = { ...(datos.ajustes || {}), [k]: v };
    aplicarSonido();
    if (guardar) api('/api/ajustes', { [k]: v }).catch(() => {});
  },
  completa(si) { raiz.classList.toggle('completa', !!si); },
  ir(ruta) { if (location.hash !== '#' + ruta) location.hash = ruta; else navegar(); },
  // llegó progreso de otro aparato: lo de la pantalla se vuelve a pedir (las sesiones a pantalla completa no se tocan: al acabar piden lo suyo)
  async refrescar() {
    await this.inicio(true).catch(() => {});
    if (actual && !COMPLETAS.has(actual) && !$('.mv-aj') && !(actual === 'kana' && location.hash.includes('practica'))) navegar();
  },
};
// los mismos ajustes de sonido que el escritorio: efectos sí/no y volúmenes (de 0 a 100)
function aplicarSonido() {
  const aj = datos?.ajustes || {}, vol = (k) => (typeof aj[k] === 'number' ? aj[k] / 100 : 1);
  son.activar(aj.sonido !== false);
  son.volumenes({ musica: vol('vol_musica'), efectos: vol('vol_efectos'), voz: vol('vol_voz') });
}
function pintarInsignia() {
  const b = $('.mv-insignia', raiz), n = datos?.repasos_ahora || 0;
  b.hidden = !n; b.textContent = n > 999 ? '999+' : String(n);
}

async function navegar() {
  const [ruta, ...resto] = (location.hash.slice(1) || 'inicio').split('/');
  const nombre = MODULOS[ruta] ? ruta : 'inicio';
  if (modActual?.salir) { try { modActual.salir(); } catch (e) { console.error(e); } }
  let sec = $(`.mv-vista[data-v="${nombre}"]`, vistas);
  if (!sec) { sec = nodo(`<section class="vista mv-vista" data-v="${nombre}"></section>`); vistas.appendChild(sec); }
  $$('.mv-vista', vistas).forEach((v) => v.classList.toggle('activa', v === sec));
  $$('.mv-pest', raiz).forEach((a) => a.classList.toggle('si', a.dataset.p === (PESTANA_DE[nombre] || nombre)));
  app.completa(COMPLETAS.has(nombre) || (nombre === 'kana' && resto[0] === 'practica') || (['guia', 'historias', 'conjugar'].includes(nombre) && !!resto[0]));
  actual = nombre;
  try {
    modActual = await import(MODULOS[nombre]);
    await modActual.entrar(sec, resto, app);
  } catch (e) { console.error(e); sec.innerHTML = `<p class="mv-error">${t('mv.error')}</p>`; }
  if (!quieto()) gsap.fromTo(sec, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power1.out' });
  quitarIntro();
}
addEventListener('hashchange', navegar);
$$('.mv-pest', raiz).forEach((a) => a.addEventListener('click', () => { vibrar(8); son.toque?.(); }));
// el audio solo arranca con un toque «de verdad»: en Safari, pointerdown con el dedo no cuenta (touchend y click sí). Cada
// toque lo reanuda si el sistema lo suspendió (una llamada, otra app…)
for (const ev of ['touchend', 'click']) addEventListener(ev, () => son.iniciar(), { passive: true, capture: true });

let introFuera = false;
function quitarIntro() {
  if (introFuera) return; introFuera = true;
  const el = document.getElementById('intro'); if (!el) return;
  carga(1); // la barra se llena y, entonces, la pantalla de carga se va
  setTimeout(() => { el.classList.add('fuera'); setTimeout(() => el.remove(), 500); }, 300);
}
// quien llega nuevo (sin perfil, sin nada aprendido y sin progreso traído) empieza conociendo a Nyan
app.inicio().then((d) => {
  adoptarTemaDelMotor(d?.ajustes);   // el tema de otra visita (o de la app instalada, que guarda aparte): si este teléfono aún no ha elegido, vale el del progreso
  if (!d?.perfil?.hecho && !d?.cuenta?.aprendidos && !(d?.herencia?.repasos || d?.herencia?.items) && !location.hash.startsWith('#bienvenida')) history.replaceState(null, '', '#bienvenida');
}).catch(() => {}).finally(() => { carga(0.8); navegar(); iniciarEnlace(); });
// vincular con el ordenador: el aviso de #enlazar= y, cuando llega progreso del otro aparato, repintar lo que se ve
function iniciarEnlace() {
  if (CODIGO_ENLACE) setTimeout(() => import('./enlazar.js').then((m) => m.iniciar(app, CODIGO_ENLACE)), 900);
  addEventListener('nyango:sincronizado', (e) => { if (e.detail?.cambios) app.refrescar(); });
  addEventListener('hashchange', () => { const c = (location.hash.match(/^#enlazar=([^&]*)/) || [])[1]; if (c) { history.replaceState(null, '', '#inicio'); import('./enlazar.js').then((m) => m.iniciar(app, c)); } });
}
export const vistaActual = () => actual;
