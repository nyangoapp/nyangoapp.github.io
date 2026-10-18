// «Tu japonés» (30-09): tus números de un vistazo y qué toca ahora. Interfaz con los tokens del tema; el único dibujo es Nyan pintado, como en las clases.
// También cuenta el TIEMPO DE ESTUDIO: segundos con la ventana a la vista, en una pantalla de estudio y con actividad
// en el último minuto; cada medio minuto se lo pasa al motor (/api/tiempo), que lo guarda en tu progreso.
import { gsap } from 'gsap';
import { $, $$, api, registrar, vistaActual, mil, quieto, nivelDe } from './app.js';
import { kbd } from './teclado.js';
import { t, idioma } from './i18n.js';
import { esc, ruby } from './japones.js';
import { recorte } from './clase-arte.js';
import { GRADOS, gradoDe } from './pupitre.js';

const V = () => $('#v-estadisticas');

// ── el reloj de estudio ──
const DE_ESTUDIO = new Set(['estudio', 'clase', 'lecturas', 'gramatica', 'kanji', 'jefe']);
let activo = Date.now(), pendiente = 0;
for (const ev of ['keydown', 'pointerdown', 'wheel', 'touchstart']) addEventListener(ev, () => { activo = Date.now(); }, { passive: true, capture: true });
const pasar = () => { if (!pendiente) return; const s = pendiente; pendiente = 0; api('/api/tiempo', { s }).catch(() => { pendiente += s; }); };
setInterval(() => {
  if (document.visibilityState !== 'visible' || Date.now() - activo > 60000 || !DE_ESTUDIO.has(vistaActual().nombre)) return;
  pendiente += 5;
  if (pendiente >= 30) pasar();
}, 5000);
addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') pasar(); });
addEventListener('nyango:cerrar', pasar);   // al cerrar la app (motor/local.js), lo que quede del último medio minuto

// ── la pantalla ──
const horas = (s) => {
  const m = Math.round((s || 0) / 60);
  return m < 60 ? t('est.min', { m }) : t('est.horas', { h: Math.floor(m / 60), m: m % 60 });
};
const DIAS = () => (idioma === 'en' ? ['S', 'M', 'T', 'W', 'T', 'F', 'S'] : ['D', 'L', 'M', 'X', 'J', 'V', 'S']);
// JLPT aproximado por palabras aprendidas (orientativo, así lo dice la tarjeta)
const METAS = [['N5', 800], ['N4', 1500], ['N3', 3000]];
function anillo(n, total, color) {
  const f = total ? Math.min(1, n / total) : 0, L = 2 * Math.PI * 40;
  return `<svg viewBox="0 0 100 100" class="es-anillo" aria-hidden="true"><circle class="es-anillo-pista" cx="50" cy="50" r="40"/>
    <circle class="es-anillo-arco" cx="50" cy="50" r="40" style="stroke:${color}" stroke-dasharray="${(f * L).toFixed(1)} ${L.toFixed(1)}"/>
    <text x="50" y="57" text-anchor="middle">${mil(n)}</text></svg>`;
}

async function pintar() {
  estilos();
  const [ini, e] = await Promise.all([api('/api/inicio'), api('/api/estadisticas')]);
  const dias = e.dias || [];
  const sabe = ini.nyan_sabe || 0, g = gradoDe(sabe), sig = GRADOS[g + 1];
  const vocab = e.aprendidas?.vocab || 0, meta = METAS.find(([, n]) => vocab < n) || METAS.at(-1);
  const maxResp = Math.max(1, ...dias.map((d) => d.respuestas));
  // qué toca ahora, en orden: repasos, la clase que toca, palabras nuevas, la historia abierta
  const pasos = [];
  if (ini.repasos_ahora) pasos.push({ ir: '#estudio/repaso', tit: t('est.paso.repasos', { n: ini.repasos_ahora }), sub: t('est.paso.repasos_sub', { m: Math.max(1, Math.round(ini.repasos_ahora * 0.35)) }) });
  if (ini.gramatica) pasos.push({ ir: `#clase/${ini.gramatica.slug}`, tit: `${esc(ini.gramatica.capitulo)}: <span lang="ja">${ruby(ini.gramatica.titulo || '')}</span>`, sub: t('est.paso.clase_sub') });
  if (ini.leccion?.palabras?.length) pasos.push({ ir: '#estudio/leccion', tit: t('est.paso.leccion', { n: ini.leccion.palabras.length }), sub: `<span lang="ja">${esc(ini.leccion.palabras.slice(0, 4).join('、'))}</span>` });
  if (ini.lectura) pasos.push({ ir: `#lecturas/${ini.lectura.id}`, tit: t('est.paso.historia', { t: `<span lang="ja">${ruby(ini.lectura.titulo?.jp || '')}</span>` }), sub: t('est.paso.historia_sub') });
  V().innerHTML = `<header class="cab-papel es-cab"><button class="volver" data-volver>${t('comun.volver_inicio')} ${kbd('Esc')}</button>
      <div class="lt-tit"><small>${t('est.ante')}</small><b>${t('est.tit')}</b></div><span></span></header>
    <main class="es-cuerpo"><div class="es-col">
      <section class="es-tarjeta es-racha">
        <div class="es-racha-cab"><b>${t('est.racha', { n: ini.racha || 0 })}</b><small>${ini.racha ? t('est.racha_sub') : t('est.racha_cero')}</small></div>
        <div class="es-semana">${dias.map((d) => { const f = new Date(d.dia + 'T12:00'), h = d.dia === dias.at(-1).dia; return `<span class="${d.respuestas || d.s ? 'si' : ''}${h ? ' hoy' : ''}"><i></i><small>${h ? t('est.hoy') : DIAS()[f.getDay()]}</small></span>`; }).join('')}</div>
      </section>
      <section class="es-datos">
        <div class="es-tarjeta es-dato"><small>${t('est.tiempo')}</small><b>${horas(e.tiempo_total)}</b><span>${e.tiempo_semana ? t('est.tiempo_semana', { t: horas(e.tiempo_semana) }) : t('est.tiempo_nuevo')}${e.tiempo_aprox ? ` · ${t('est.aprox')}` : ''}</span></div>
        <div class="es-tarjeta es-dato"><small>${t('est.nivel')}</small><b>${nivelDe(ini.xp || 0).L}</b><span>${t('est.xp', { n: mil(ini.xp || 0) })}</span></div>
        <div class="es-tarjeta es-dato es-actividad"><small>${t('est.actividad')}</small>
          <div class="es-barras">${dias.map((d) => `<span title="${d.respuestas}"><i style="height:${Math.round((100 * d.respuestas) / maxResp)}%"></i></span>`).join('')}</div>
          <span>${e.aciertos_semana != null ? t('est.aciertos', { n: e.aciertos_semana }) : t('est.sin_semana')}</span></div>
      </section>
      </div><div class="es-col">
      <section class="es-tarjeta es-paso">
        <div class="es-paso-cab"><svg viewBox="-60 -114 120 124" aria-hidden="true">${recorte('nyan', 'feliz', true)}</svg>
          <div><small>${t('est.paso.ante')}</small><b>${pasos.length ? t('est.paso.tit') : t('est.paso.nada')}</b></div></div>
        <ol>${pasos.map((p, i) => `<li><span class="es-n">${i + 1}</span><div><b>${p.tit}</b><small>${p.sub}</small></div>${i === 0 ? `<a class="boton-tinta" href="${p.ir}">${t('est.paso.empezar')}</a>` : `<a class="es-ir" href="${p.ir}" aria-label="${t('est.paso.ir')}">→</a>`}</li>`).join('')}</ol>
      </section>
      <section class="es-tarjeta es-meta">
        <div class="es-meta-cab"><b>${t('est.meta', { n: meta[0] })}</b><small>${t('est.meta_sub', { nv: meta[0], n: mil(meta[1]) })}</small></div>
        <div class="es-meta-tubo"><i style="width:${Math.min(100, (100 * vocab) / 3000)}%"></i>${METAS.map(([nv, n]) => `<em style="left:${(100 * n) / 3000}%"><span>${nv}</span></em>`).join('')}</div>
        <small>${t('est.meta_aviso')}</small>
      </section>
      <section class="es-tarjeta es-nyan">
        <span class="es-sello" aria-hidden="true">${'一二三四五六七八'[g]}</span>
        <div><small>${t('est.nyan_ante', { n: g + 1 })}</small><b>${t(`perfil.inv.grado.${g}`)}</b>
        <span>${t('est.nyan_sub', { n: mil(sabe) })}${sig ? ` · ${t('perfil.inv.grado_sig', { n: mil(sig - sabe), grado: t(`perfil.inv.grado.${g + 1}`) })}` : ''}</span></div>
      </section>
      </div>
      <section class="es-tarjeta es-sabes">
        <div>${anillo(vocab, e.totales?.vocab, 'var(--t-vocab)')}<b>${t('est.palabras')}</b><small>${t('est.de', { n: mil(vocab), total: mil(e.totales?.vocab || 0) })}</small></div>
        <div>${anillo(e.aprendidas?.kanji || 0, e.totales?.kanji, 'var(--t-kanji)')}<b>${t('est.kanji')}</b><small>${t('est.de', { n: mil(e.aprendidas?.kanji || 0), total: mil(e.totales?.kanji || 0) })}</small></div>
        <div>${anillo(ini.gramatica_hechas || 0, ini.gramatica_total, 'var(--t-gram)')}<b>${t('est.gramatica')}</b><small>${e.clases_media != null ? t('est.clases_media', { n: e.clases_media }) : t('est.de', { n: ini.gramatica_hechas || 0, total: ini.gramatica_total || 0 })}</small></div>
        <div>${anillo(ini.lecturas_leidas || 0, ini.lecturas_total, 'var(--bien)')}<b>${t('est.historias')}</b><small>${t('est.de', { n: ini.lecturas_leidas || 0, total: ini.lecturas_total || 0 })}</small></div>
      </section>
    </main>`;
  $('[data-volver]', V()).onclick = () => { location.hash = 'inicio'; };
  if (!quieto()) gsap.fromTo($$('.es-tarjeta', V()), { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.05, ease: 'back.out(1.6)' });
}

let estilosPuestos = false;
function estilos() {
  if (estilosPuestos) return;
  estilosPuestos = true;
  const s = document.createElement('style');
  s.textContent = `
.es-cab .lt-tit { display: grid; justify-items: center; gap: 4px; text-align: center; }
.es-cab .lt-tit small { font: 700 11px/1.2 var(--f-texto); letter-spacing: .12em; text-transform: uppercase; color: var(--tinta-2); }
.es-cab .lt-tit b { font: var(--peso-titulo) 20px/1.25 var(--f-titulo); color: var(--tinta); text-wrap: balance; }
.es-cuerpo { max-width: 1080px; margin: 0 auto; padding: 0 28px 40px; display: grid; grid-template-columns: 5fr 7fr; gap: 20px; align-items: start; }
.es-col { display: grid; gap: 20px; }
.es-tarjeta { border-radius: var(--radio); background: var(--sup); border: var(--borde); box-shadow: var(--sombra); padding: 20px 24px; }
.es-racha { background: var(--acento-suave); }
.es-racha-cab b { display: block; font: var(--peso-titulo) 32px/1.15 var(--f-titulo); color: var(--acento-tinta); text-wrap: balance; }
.es-racha-cab small { font: 700 14px/1.4 var(--f-texto); color: var(--tinta-2); }
.es-semana { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; margin-top: 16px; }
.es-semana span { display: grid; justify-items: center; gap: 8px; }
.es-semana i { width: 100%; height: 32px; border-radius: var(--radio-peq); background: var(--sup-3); }
.es-semana .si i { background: var(--acento); }
.es-semana .hoy i { outline: 2px solid var(--aviso); outline-offset: 2px; }
.es-semana small { font: 700 11px/1 var(--f-texto); color: var(--tinta-2); }
.es-paso { display: grid; align-content: start; gap: 12px; }
.es-paso-cab { display: flex; align-items: center; gap: 12px; }
.es-paso-cab svg { width: 64px; height: 66px; flex: none; }
.es-paso-cab small, .es-dato > small, .es-nyan small { font: 700 12px/1.2 var(--f-texto); letter-spacing: .12em; text-transform: uppercase; color: var(--acento-tinta); }
.es-paso-cab b { display: block; margin-top: 4px; font: var(--peso-titulo) 22px/1.2 var(--f-titulo); color: var(--tinta); text-wrap: balance; }
.es-paso ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.es-paso li { display: flex; align-items: center; gap: 16px; padding: 12px 16px; border-radius: var(--radio-peq); background: var(--sup-2); }
.es-paso li > div { flex: 1; min-width: 0; display: grid; gap: 4px; }
.es-paso li b { font: 700 16px/1.4 var(--f-jp); color: var(--tinta); }
.es-paso li small { font: 600 13px/1.4 var(--f-texto); color: var(--tinta-2); }
.es-n { flex: none; width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; font: 700 15px var(--f-texto); font-variant-numeric: tabular-nums; background: var(--sup-3); color: var(--tinta-2); }
.es-paso li:first-child .es-n { background: var(--boton); color: var(--boton-tinta); }
.es-paso .boton-tinta { height: 48px; padding: 0 20px; font-size: 15px; }
.es-ir { flex: none; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; font: 700 18px var(--f-texto); color: var(--tinta-2); background: var(--sup-3); transition: background-color .15s var(--suave), color .15s var(--suave); }
.es-ir:hover { background: var(--acento-suave); color: var(--acento-tinta); }
.es-ir:focus-visible { outline: 2px solid var(--acento); outline-offset: 2px; }
.es-datos { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.es-dato { display: grid; gap: 4px; align-content: start; }
.es-dato b { font: 700 28px/1.2 var(--f-texto); font-variant-numeric: tabular-nums; color: var(--tinta); text-wrap: balance; }
.es-dato > span { font: 600 13px/1.4 var(--f-texto); color: var(--tinta-2); }
.es-actividad { grid-column: span 2; }
.es-barras { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; height: 72px; align-items: end; }
.es-barras span { height: 100%; display: flex; align-items: flex-end; border-radius: var(--radio-peq); background: var(--sup-3); overflow: hidden; }
.es-barras i { display: block; width: 100%; min-height: 4px; border-radius: var(--radio-peq); background: var(--acento); }
.es-sabes { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.es-sabes > div { display: grid; justify-items: center; gap: 4px; text-align: center; }
.es-anillo { width: 104px; height: 104px; }
.es-anillo-pista { fill: none; stroke: var(--sup-3); stroke-width: 13; }
.es-anillo-arco { fill: none; stroke-width: 13; stroke-linecap: round; transform: rotate(-90deg); transform-origin: 50% 50%; }
.es-anillo text { font: 700 22px var(--f-texto); font-variant-numeric: tabular-nums; fill: var(--tinta); }
.es-sabes b { margin-top: 4px; font: var(--peso-titulo) 17px/1.2 var(--f-titulo); color: var(--tinta); }
.es-sabes small { font: 600 13px/1.4 var(--f-texto); font-variant-numeric: tabular-nums; color: var(--tinta-2); }
.es-meta { display: grid; gap: 12px; }
.es-meta-cab b { display: block; font: var(--peso-titulo) 20px/1.25 var(--f-titulo); color: var(--tinta); text-wrap: balance; }
.es-meta-cab small, .es-meta > small { font: 600 13px/1.4 var(--f-texto); color: var(--tinta-2); }
.es-meta-tubo { position: relative; height: 16px; border-radius: 99px; background: var(--sup-3); margin: 8px 0 24px; }
.es-meta-tubo i { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 99px; background: var(--acento); min-width: 14px; }
.es-meta-tubo em { position: absolute; top: -4px; bottom: -4px; width: 3px; font-style: normal; }
.es-meta-tubo em::before { content: ""; position: absolute; inset: 0; border-radius: 2px; background: var(--tinta-3); }
.es-meta-tubo em span { position: absolute; top: calc(100% + 4px); left: 50%; transform: translateX(-50%); font: 700 12px var(--f-texto); color: var(--tinta-2); }
.es-nyan { display: flex; align-items: center; gap: 16px; background: var(--aviso-suave); }
.es-sello { flex: none; width: 60px; height: 60px; border-radius: var(--radio-peq); display: grid; place-items: center; background: var(--mal); color: var(--tinta-inv); font: 900 30px var(--f-jp); rotate: -5deg; }
.es-nyan b { display: block; margin-top: 4px; font: var(--peso-titulo) 18px/1.2 var(--f-titulo); color: var(--tinta); }
.es-nyan div > span { font: 600 13px/1.4 var(--f-texto); color: var(--tinta-2); }
@media (max-width: 980px) { .es-cuerpo { grid-template-columns: 1fr; } .es-sabes { grid-template-columns: repeat(2, 1fr); } }
@media (prefers-reduced-motion: reduce) { .es-ir { transition: none; } }
`;
  document.head.appendChild(s);
}

registrar('estadisticas', {
  seccion: '#v-estadisticas',
  async entrar() { await pintar(); },
  actualizar() { pintar(); },
  contexto: () => 'estadisticas',
});
