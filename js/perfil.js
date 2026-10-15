// Mochi (perfil RPG), mapa de kanji y camino por regiones
import { gsap } from 'gsap';
import { t, tn } from './i18n.js';
import { $, $$, api, registrar, estado, nivelDe, mil, RANGO_COLOR, quieto, chispas, asegurarMochi, prestarSala, devolverSala } from './app.js';
import * as son from './sonido.js';
import { htmlDiario, GRADOS, gradoDe } from './pupitre.js';
import { esc } from './japones.js';
import { rejilla, kbd } from './teclado.js';
import { tienda, cargarJuego, juegoActual, ilustracion, silueta, ponerObjeto, objetoDe, rarezaDe } from './recompensas.js';

const V = () => $('#v-mochi');
// 30-09 · entradas escalonadas con la Web Animations API, no con GSAP: GSAP lee el estilo calculado de cada elemento justo
// después de escribir en el anterior y, en WebKitGTK, eso vuelve a calcular la vista entera una vez por elemento (los 200
// primeros kanji eran 4,7 s de pantalla congelada al entrar en Kanji). el.animate() no lee nada: va entero al compositor.
function entrada(els, { y = 0, escala = 1, dur = 450, paso = 25 } = {}) {
  if (quieto()) return;
  els.forEach((el, i) => el.animate([{ transform: `translateY(${y}px) scale(${escala})`, opacity: 0 }, { transform: 'none', opacity: 1 }],
    { duration: dur, delay: i * paso, easing: 'cubic-bezier(.34, 1.56, .64, 1)', fill: 'backwards' }));
}
const RANGOS = [0, 1, 2, 3, 4].map((i) => t(`rangos.${i}`));
const CSS = `
.inv-hueco.bloq,.inv-hueco.falta{opacity:1;filter:none;background:var(--sup-2);box-shadow:none;border:1.5px dashed var(--linea-2)}
.inv-hueco.bloq b,.inv-hueco.falta b,.inv-hueco.bloq small,.inv-hueco.falta small{color:var(--tinta-3)}
.inv-hueco.falta .rc-ilus.sil{filter:none}
.pf-cab-tit{text-align:center;font:700 13px/1.3 var(--f-texto);letter-spacing:.08em;text-transform:uppercase;color:var(--tinta-2)}
.pf-titulo{display:inline-block;margin-top:12px;padding:4px 12px;border-radius:var(--radio-btn);background:var(--boton);color:var(--boton-tinta);font:700 13px/20px var(--f-texto);letter-spacing:.02em;
  box-shadow:var(--sombra-peq);transform:rotate(-3deg)}
.rc-cuarto-nombre .pf-titulo{display:table}
.pf-titulos{display:flex;flex-wrap:wrap;gap:12px;margin-top:4px}
.pf-titulos .pf-titulo{transform:rotate(-2deg);margin-top:0}
.pf-titulos .pf-titulo.otro{background:var(--sup-2);color:var(--tinta-2);box-shadow:none}
.pf-cuerpo{max-width:1240px;margin:0 auto;padding:0 36px 80px}
.pf-h1{margin:4px 0 8px;font:var(--peso-titulo) clamp(32px,4vw,48px)/1.1 var(--f-titulo);color:var(--tinta);text-wrap:balance}
.pf-sub{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 24px;color:var(--tinta-2);font:500 15px/1.5 var(--f-texto)}
.pf-rango{padding:0 12px;border-radius:var(--radio-btn);background:color-mix(in srgb,var(--rc) 20%,var(--sup));color:var(--tinta);box-shadow:inset 0 -3px 0 var(--rc);font:700 13px/24px var(--f-texto)}
/* mapa de kanji: un kanji por celda; el rango se ve en la franja de abajo y en el tinte */
.kj-mapa{display:grid;grid-template-columns:repeat(auto-fill,minmax(48px,1fr));gap:8px}
.kj-celda{--rc:var(--linea-2);aspect-ratio:1;border:0;padding:0;border-radius:var(--radio-peq);display:grid;place-items:center;font:600 24px/1 var(--f-jp);cursor:pointer;background:var(--sup-2);color:color-mix(in srgb,var(--tinta) 52%,var(--sup-2));
  transition:transform .15s var(--suave),background-color .15s var(--suave)}
.kj-celda[data-r]{background:color-mix(in srgb,var(--rc) 20%,var(--sup));color:var(--tinta);box-shadow:inset 0 -4px 0 var(--rc)}
.kj-celda:hover{transform:translateY(-2px)}
.kj-celda:active{transform:scale(.95)}
.kj-celda:focus-visible{outline:3px solid var(--acento);outline-offset:2px;transform:scale(1.12);position:relative;z-index:1}
.kj-pie{position:sticky;bottom:16px;z-index:2;display:flex;align-items:center;gap:16px;width:max-content;max-width:100%;margin:16px auto 0;padding:12px 20px 12px 12px;border-radius:var(--radio);
  background:var(--sup);border:var(--borde);color:var(--tinta);font:600 14px/1.4 var(--f-texto);box-shadow:var(--sombra-flotante)}
.kj-pie b{display:grid;place-items:center;min-width:48px;height:48px;border-radius:var(--radio-peq);font:600 28px/1 var(--f-jp);color:var(--tinta);background:var(--sup-3)}
.kj-pie b[data-r]{background:color-mix(in srgb,var(--rc) 20%,var(--sup));box-shadow:inset 0 -4px 0 var(--rc)}
.kj-pie small{display:block;font:600 12px var(--f-texto);color:var(--tinta-2)}
.kj-pie kbd{font:700 11px var(--f-texto)}
/* camino por regiones */
.cam{max-width:980px;margin:0 auto;padding:0 36px 80px;position:relative}
.cam-hilo{position:absolute;left:50%;top:0;height:100%;width:40px;transform:translateX(-50%);overflow:visible}
.cam-hilo line{stroke:var(--linea-2);stroke-width:4;stroke-dasharray:2 10;stroke-linecap:round}
.cam-fila{position:relative;display:flex;justify-content:flex-start;margin:16px 0}
.cam-fila.der{justify-content:flex-end}
.cam-region{width:44%;padding:20px 24px;border-radius:var(--radio);background:var(--sup);border:var(--borde);box-shadow:var(--sombra);color:var(--tinta)}
.cam-fila.actual .cam-region{background:var(--acento-suave);box-shadow:inset 0 0 0 2px var(--acento),var(--sombra)}
.cam-fila.lejos .cam-region{opacity:.6}
.cam-n{font:700 11px/1.2 var(--f-texto);letter-spacing:.2em;text-transform:uppercase;color:var(--tinta-2)}
.cam-tit{display:flex;align-items:baseline;gap:12px;margin-top:4px}
.cam-tit span:first-child{font:var(--peso-titulo) 26px/1.2 var(--f-titulo)}
.cam-tit span+span{font:600 18px var(--f-jp);color:var(--tinta-2)}
.cam-muestra{margin-top:4px;font:500 17px/1.5 var(--f-jp);color:var(--tinta-2)}
.cam-barra{height:8px;border-radius:4px;margin-top:12px;overflow:hidden;background:var(--sup-3)}
.cam-barra i{display:block;height:100%;border-radius:4px;background:var(--acento)}
.cam-fila.hecha .cam-barra i{background:var(--bien)}
.cam-cuenta{margin-top:8px;font:500 13px/1.4 var(--f-texto);color:var(--tinta-2);font-variant-numeric:tabular-nums}
.cam-punto{position:absolute;left:50%;top:50%;width:24px;height:24px;margin:-12px 0 0 -12px;border-radius:50%;background:var(--sup-3);box-shadow:0 0 0 6px var(--fondo)}
.cam-fila.actual .cam-punto{background:var(--aviso)}
.cam-fila.hecha .cam-punto{background:var(--bien)}
@media (prefers-reduced-motion: reduce){.kj-celda{transition:none}}
`;
if (!$('#estilo-perfil')) { const s = document.createElement('style'); s.id = 'estilo-perfil'; s.textContent = CSS; document.head.appendChild(s); }
const cab =(titulo) => `<header class="cab-papel"><button class="volver" onclick="location.hash='inicio'">${t('comun.volver_inicio')} <kbd>Esc</kbd></button><div class="pf-cab-tit">${titulo}</div><div></div></header>`;

// ═════════════ Mochi: el inventario (estilo RPG) ═════════════
// A la izquierda, LA MISMA sala 3D de la portada (se le presta el lienzo): a Nyan se le gira arrastrando y los objetos
// se mueven o se quitan tocándolos. A la derecha, pestañas con todo a la vista (sin bajar): el equipo de samurái,
// la ropa, los accesorios y la sala, cada cosa un interruptor; sus números y la tienda. Antes era una columna de
// fichas con la colección debajo: había que bajar para ver lo que tenías y no se podía quitar nada del equipo.
const PESTANAS = [['equipo', '装'], ['ropa', '服'], ['accesorio', '飾'], ['aura', '光'], ['sala', '部屋'], ['nyan', '猫'], ['tienda', '店']];
// el glifo de cada pieza del equipo y su color (de los tokens del tema, para que se lea igual en los cuatro)
const EQ_GLIFO = { bufanda: ['巻', 'var(--mal)'], hachimaki: ['鉢', 'var(--t-vocab)'], haori: ['羽', 'var(--t-conj)'], bokken: ['木', 'var(--aviso)'], kabuto: ['兜', 'var(--tinta-2)'], katana: ['刀', 'var(--r1)'], capa: ['套', 'var(--t-gram)'], aura: ['気', 'var(--r3)'] };
const CUPO_SALA = 16;   // huecos de la sala 3D (techo, pared, fondo, suelo y cerca)
let pestana = 'equipo', invD = null;

registrar('mochi', {
  seccion: '#v-mochi',
  async entrar() {
    const d = invD = estado.inicio = await api('/api/inicio');
    let j = null; try { j = await cargarJuego(); } catch {}
    const m = asegurarMochi(d, j), nv = nivelDe(d.xp), titulo = j?.titulo || d.titulo;
    V().innerHTML = cab(t('perfil.cab')) + `<div class="inv">
      <section class="inv-sala" id="inv-sala" aria-label="${t('perfil.inv.sala_aria')}">
        <div class="inv-lienzo" id="inv-lienzo"></div>
        <div class="inv-nombre"><div class="rc-logo l">${esc(d.mochi.nombre)}</div><small>${t('perfil.nivel', { nivel: nv.L, dentro: mil(nv.dentro), need: mil(nv.need) })}</small>${titulo ? `<span class="pf-titulo" title="${t('perfil.titulo_jefe')}">${esc(titulo)}</span>` : ''}</div>
        <div class="inv-sabe" title="${t('perfil.inv.sabe_pista')}"><b>${mil(d.nyan_sabe || 0)}</b><span>${t('perfil.inv.sabe', { nombre: esc(d.mochi.nombre) })}</span></div>
        <div class="inv-pista">${t('perfil.inv.pista')}</div>
        <div class="inv-menu" id="inv-menu" hidden></div>
      </section>
      <section class="inv-panel">
        <nav class="inv-pestanas" role="tablist" aria-label="${t('perfil.inv.pestanas')}">${PESTANAS.map(([k, jp], i) => `<button role="tab" data-p="${k}" aria-selected="${k === pestana}" tabindex="${k === pestana ? 0 : -1}" title="${k === 'nyan' ? esc(d.mochi.nombre) : t(`perfil.inv.${k}`)} (${i + 1})"><i>${jp}</i><span>${k === 'nyan' ? esc(d.mochi.nombre) : t(`perfil.inv.${k}`)}</span></button>`).join('')}</nav>
        <div class="inv-cuerpo" id="inv-cuerpo"></div>
        <div class="inv-ficha" id="inv-ficha"></div>
      </section></div>`;
    prestarSala($('#inv-lienzo'));
    enlazarSala(m);
    $$('.inv-pestanas [data-p]', V()).forEach((b) => { b.onclick = () => { son.toque(); ponerPestana(b.dataset.p); }; });
    ponerPestana(pestana, true);
    if (!quieto()) {
      gsap.fromTo('.inv-sala', { x: -40, opacity: 0, rotate: -1.5 }, { x: 0, opacity: 1, rotate: 0, duration: 0.8, ease: 'back.out(1.6)' });
      gsap.fromTo('.inv-panel > *', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.08, ease: 'back.out(1.8)', delay: 0.1 });
      gsap.fromTo('.inv-nombre .rc-logo', { y: -30, opacity: 0, rotation: -6 }, { y: 0, opacity: 1, rotation: 0, duration: 0.7, ease: 'back.out(2.2)', delay: 0.25 });
    }
    setTimeout(() => m.saludar(), 500);
  },
  salir() { cerrarMenu(); devolverSala(); },
});
addEventListener('keydown', (e) => {
  if (!V().classList.contains('activa') || !$('.inv') || e.ctrlKey || e.metaKey || e.altKey || e.target.closest?.('input, textarea')) return;
  if (/^[1-7]$/.test(e.key)) { e.preventDefault(); son.toque(); ponerPestana(PESTANAS[+e.key - 1][0]); }
});

function ponerPestana(k, entrada = false) {
  const antes = pestana; pestana = k;
  $$('.inv-pestanas [data-p]', V()).forEach((b) => { const si = b.dataset.p === k; b.setAttribute('aria-selected', si); b.tabIndex = si ? 0 : -1; });
  const sel = $(`.inv-pestanas [data-p="${k}"]`, V());
  if (sel && !quieto() && (antes !== k || entrada)) gsap.fromTo(sel, { scale: 0.86 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1.1, 0.4)' });
  pintarPestana(true);
}
const fichaVacia = () => `<div class="inv-ficha-vacia">${t('perfil.inv.ficha_vacia')}</div>`;
function pintarPestana(animar = false) {
  const cuerpo = $('#inv-cuerpo'); if (!cuerpo) return;
  const d = invD, j = juegoActual();
  $('#inv-ficha').innerHTML = fichaVacia();
  if (pestana === 'tienda') { cuerpo.innerHTML = '<div id="inv-tienda"></div>'; tienda($('#inv-tienda')); return; }
  if (pestana === 'nyan') { cuerpo.innerHTML = htmlNyan(d, j); animarEntrada(cuerpo, '.stat, .rangos > div, .pf-titulo', animar); llenarLibreta($('#inv-libreta', cuerpo), animar); return; }
  if (pestana === 'equipo') {
    const quitado = new Set(d.mochi.quitado || []);
    cuerpo.innerHTML = `<div class="inv-cab"><div><b>${t('perfil.inv.equipo_tit')}</b><small>${t('perfil.inv.equipo_sub', { n: d.equipo, total: d.equipo_lista.length })}</small></div>
      ${d.equipo ? `<button class="inv-todo" data-todo>${quitado.size ? t('perfil.inv.poner_todo') : t('perfil.inv.quitar_todo')}</button>` : ''}</div>
      <div class="inv-rejilla">${d.equipo_lista.map((e, i) => {
        const ganado = i < d.equipo, puesto = ganado && !quitado.has(e.id), [gl, col] = EQ_GLIFO[e.id] || ['？', 'var(--tinta-2)'];
        return `<button class="inv-hueco ${ganado ? '' : 'bloq'} ${puesto ? 'puesto' : ''}" data-eq="${esc(e.id)}"${ganado ? ` style="--c:${col}"` : ''}><span class="inv-token${ganado ? '' : ' vacio'}">${gl}</span><b>${esc(e.nombre)}</b><small>${ganado ? (puesto ? t('perfil.inv.puesto') : t('perfil.inv.quitado')) : t('perfil.inv.bloqueado')}</small><i class="inv-check">✓</i></button>`;
      }).join('')}</div>`;
    $$('[data-eq]', cuerpo).forEach((b) => {
      const e = d.equipo_lista.find((x) => x.id === b.dataset.eq), i = d.equipo_lista.indexOf(e);
      enlazarHueco(b, () => fichaEquipo(e, i < d.equipo, !new Set(d.mochi.quitado || []).has(e.id)), () => { if (i < d.equipo) cambiarEquipo(e.id); else negar(b); });
    });
    const todo = $('[data-todo]', cuerpo);
    if (todo) todo.onclick = () => { const l = (d.mochi.quitado || []).length ? [] : d.equipo_lista.slice(0, d.equipo).map((e) => e.id); ponerQuitado(l, !l.length, '[data-todo]'); };
  } else {
    const tipo = pestana === 'sala' ? 'habitacion' : pestana, inv = new Map((j?.inventario || []).map((x) => [x.id, x]));
    const objs = (j?.catalogo?.objetos || []).filter((o) => o.tipo === tipo), puestos = new Set(j?.colocados || []);
    const tienes = objs.filter((o) => inv.has(o.id)), enSala = tienes.filter((o) => puestos.has(o.id)).length;
    const ninguno = tipo !== 'habitacion' ? `<button class="inv-hueco nada ${tienes.some((o) => puestos.has(o.id)) ? '' : 'puesto'}" data-nada><span class="inv-token vacio">✕</span><b>${t(tipo === 'ropa' ? 'perfil.inv.sin_ropa' : tipo === 'aura' ? 'perfil.inv.sin_aura' : 'perfil.inv.sin_accesorio')}</b><small>&nbsp;</small><i class="inv-check">✓</i></button>` : '';
    cuerpo.innerHTML = `<div class="inv-cab"><div><b>${t(`perfil.inv.${pestana}_tit`)}</b><small>${tipo === 'habitacion' ? t('perfil.inv.sala_sub', { n: enSala, cupo: CUPO_SALA, tienes: tienes.length, total: objs.length }) : t('perfil.inv.tienes', { n: tienes.length, total: objs.length })}</small></div>
      ${tipo === 'habitacion' && enSala ? `<button class="inv-todo" data-vaciar>${t('perfil.inv.vaciar')}</button>` : ''}</div>
      <div class="inv-rejilla">${ninguno}${objs.map((o) => {
        const x = inv.get(o.id), puesto = puestos.has(o.id), r = rarezaDe(o.rareza);
        if (!x) return `<div class="inv-hueco falta">${silueta(o)}<b>？？？</b><small>${esc(r.nombre)}</small></div>`;
        return `<button class="inv-hueco ${puesto ? 'puesto' : ''}" data-obj="${esc(o.id)}" style="--r:${r.token}">${ilustracion(o)}<b>${esc(o.nombre)}</b><small>${esc(o.jp || '')}</small><i class="inv-check">✓</i>${x.nuevo ? `<em class="inv-nuevo">${t('recompensas.nuevo')}</em>` : ''}</button>`;
      }).join('')}</div>`;
    $$('[data-obj]', cuerpo).forEach((b) => { const o = objetoDe(b.dataset.obj); enlazarHueco(b, () => fichaObjeto(o, puestos.has(o.id)), () => cambiarObjeto(o, b)); });
    const nada = $('[data-nada]', cuerpo);
    if (nada) enlazarHueco(nada, () => `<div class="inv-ficha-vacia">${t(tipo === 'ropa' ? 'perfil.inv.nada_ropa' : tipo === 'aura' ? 'perfil.inv.nada_aura' : 'perfil.inv.nada_acc')}</div>`, async () => {
      const ya = tienes.find((o) => puestos.has(o.id)); if (!ya) return negar(nada);
      await cambiarObjeto(ya, nada);
    });
    const vaciar = $('[data-vaciar]', cuerpo);
    if (vaciar) vaciar.onclick = async () => { son.toque(); for (const o of tienes.filter((x) => puestos.has(x.id))) await ponerObjeto(o.id, false).catch(() => {}); invD.mochi.sitios = {}; estado.mochi?.ponerSitios?.({}); api('/api/ajustes', { sitios: {} }).catch(() => {}); pintarPestana(true); };
  }
  animarEntrada(cuerpo, '.inv-hueco', animar);
  rejilla($('.inv-rejilla', cuerpo), 'button.inv-hueco');
}
function animarEntrada(cuerpo, sel, animar) {
  if (!animar || quieto()) return;
  const els = $$(sel, cuerpo);   // muchas (la rejilla de objetos): entra el bloque entero, una sola capa; pocas, una a una
  entrada(els.length > 8 ? [els[0].parentElement] : els, els.length > 8 ? { y: 22, escala: 0.97 } : { y: 22, escala: 0.86 });
}
// cada hueco: su ficha abajo al pasar por encima (o con el foco), y al pulsarlo, se pone o se quita
function enlazarHueco(b, ficha, accion) {
  const ver = () => { $('#inv-ficha').innerHTML = ficha(); if (!quieto()) gsap.fromTo('#inv-ficha > *', { y: 6, opacity: 0.4 }, { y: 0, opacity: 1, duration: 0.25, ease: 'power2.out' }); };
  b.addEventListener('pointerenter', () => { son.roce(); ver(); });
  b.addEventListener('focus', ver);
  b.addEventListener('click', () => { accion(); });
}
function negar(b) { son.fallo(); if (!quieto()) gsap.fromTo(b, { x: -7 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' }); }
function sellar(b, puesto) {
  son.sello();
  if (quieto()) return;
  gsap.timeline().to(b, { scaleX: 1.12, scaleY: 0.86, duration: 0.09 }).to(b, { scaleX: 1, scaleY: 1, duration: 0.6, ease: 'elastic.out(1.2, 0.35)' });
  if (puesto) chispas(b, { n: 12, colores: ['#f2661b', '#f2b43a', '#fff6e4'] });
}
// Nyan reacciona a lo que le pones o le quitas
function reaccionar(puesto) {
  const m = estado.mochi; if (!m) return;
  if (puesto) { m.expresion('doya', 1600); m.hablar('fun'); } else { m.expresion('sorpresa', 1100); m.hablar('eh'); }
}
// puesto: si lo que acabas de hacer es ponérselo (true) o quitárselo; sel: el hueco que se sella tras repintar
function ponerQuitado(lista, puesto, sel) {
  invD.mochi.quitado = lista;
  estado.mochi?.quitarEquipo?.(lista);
  api('/api/ajustes', { equipo_quitado: lista }).catch(() => {});
  reaccionar(puesto); pintarPestana(false);
  const nb = sel && $(sel, V()); if (nb) sellar(nb, puesto); else son.sello();
}
function cambiarEquipo(id) {
  const q = new Set(invD.mochi.quitado || []), puesto = q.has(id);
  if (puesto) q.delete(id); else q.add(id);
  ponerQuitado([...q], puesto, `[data-eq="${id}"]`);
  $('#inv-ficha').innerHTML = fichaEquipo(invD.equipo_lista.find((e) => e.id === id), true, puesto);
}
async function cambiarObjeto(o, b) {
  const puesto = (juegoActual()?.colocados || []).includes(o.id);
  try { await ponerObjeto(o.id, !puesto); } catch { negar(b); return; }
  reaccionar(!puesto); // la rejilla ya la ha vuelto a pintar el aviso rc:juego de ponerObjeto (antes se pintaba dos veces)
  if (!$('.inv-rejilla', V())) pintarPestana(false);
  const nb = $(`[data-obj="${o.id}"]`, V()) || (b.matches('[data-nada]') && $('[data-nada]', V())); if (nb) sellar(nb, !puesto); else son.sello();
  $('#inv-ficha').innerHTML = fichaObjeto(o, !puesto);
}
function fichaEquipo(e, ganado, puesto) {
  const [gl, col] = EQ_GLIFO[e.id] || ['？', 'var(--tinta-2)'];
  return `<span class="inv-token grande${ganado ? '' : ' vacio'}"${ganado ? ` style="--c:${col}"` : ''}>${gl}</span><div><b>${esc(e.nombre)}</b><small>${ganado ? (puesto ? t('perfil.inv.puesto') : t('perfil.inv.quitado')) : t('perfil.inv.bloqueado')}</small>
    <p>${ganado ? t('perfil.inv.pulsa') : esc(e.hito)}</p></div>`;
}
function fichaObjeto(o, puesto) {
  const r = rarezaDe(o.rareza), mio = ['ropa', 'accesorio', 'aura'].includes(o.tipo);
  return `${ilustracion(o, 'grande')}<div><b>${esc(o.nombre)} <span class="jp">${esc(o.jp || '')}</span></b><small style="color:color-mix(in srgb, ${r.token} 55%, var(--tinta))">${esc(r.nombre)} · ${puesto ? (mio ? t('perfil.inv.puesto') : t('perfil.inv.en_sala')) : (mio ? t('perfil.inv.quitado') : t('perfil.inv.guardado'))}</small>
    <p>${esc(o.desc || '')}</p></div>`;
}
function htmlNyan(d, j) {
  const titulos = j?.titulos || [], titulo = j?.titulo || d.titulo;
  return `<div class="inv-cab"><div><b>${t('perfil.inv.nyan_tit', { nombre: esc(d.mochi.nombre) })}</b><small>${t('perfil.inv.sabe_largo', { nombre: esc(d.mochi.nombre), n: mil(d.nyan_sabe || 0) })}</small></div></div>
    <h3 class="inv-h3">${t('perfil.inv.libreta', { nombre: esc(d.mochi.nombre) })}</h3>
    <div class="inv-libreta" id="inv-libreta">${htmlGrado(d.nyan_sabe || 0)}<div class="il-palabras"></div></div>
    <div class="stats">
      <div class="stat"><i>力</i><b>${mil(Object.values(d.dias).reduce((a, b) => a + b, 0))}</b><small>${t('perfil.stat.fuerza')}</small></div>
      <div class="stat"><i>知</i><b>${d.cuenta.aprendidos}</b><small>${t('perfil.stat.saber')}</small></div>
      <div class="stat"><i>技</i><b>${d.cuenta.kanji1}</b><small>${t('perfil.stat.tecnica')}</small></div>
      <div class="stat"><i>心</i><b>${d.racha}</b><small>${t('perfil.stat.espiritu')}</small></div>
    </div>
    <h3 class="inv-h3">${t('perfil.rangos')}</h3>
    <div class="rangos">${d.rangos.map((r, i) => `<div style="--rc:${RANGO_COLOR[i]}"><i>${r.jp}</i><b>${d.por_rango[i]}</b><small>${r.es}</small></div>`).join('')}</div>
    <p class="inv-nota">${t('perfil.equipo.nota')}</p>
    ${titulos.length ? `<h3 class="inv-h3">${t('perfil.titulos')}</h3><div class="pf-titulos">${titulos.map((x) => `<span class="pf-titulo ${x === titulo ? '' : 'otro'}">${esc(x)}</span>`).join('')}</div>` : ''}
    <h3 class="inv-h3">${t('perfil.inv.diario')}</h3>
    ${(d.nyan_diario || []).length ? `<div class="inv-diario">${(d.nyan_diario || []).slice().reverse().map((e) => htmlDiario(e.lineas, new Date(e.t * 1000))).join('')}</div>` : `<p class="inv-nota">${t('perfil.inv.diario_vacio', { nombre: esc(d.mochi.nombre) })}</p>`}`;
}

// ── la libreta de Nyan: lo que sabe (se lo enseñas al repasar y al corregirle) y su «grado», que sube con ello ──
function htmlGrado(n) {
  const g = gradoDe(n), sig = GRADOS[g + 1], base = GRADOS[g];
  const pct = sig ? Math.round((100 * (n - base)) / (sig - base)) : 100;
  return `<div class="il-grado"><span class="il-sello">${'一二三四五六七八'[g]}</span><div><b>${t(`perfil.inv.grado.${g}`)}</b>
    <small>${sig ? t('perfil.inv.grado_sig', { n: mil(sig - n), grado: t(`perfil.inv.grado.${g + 1}`) }) : t('perfil.inv.grado_max')}</small>
    <i class="il-barra"><i style="width:${pct}%"></i></i></div></div>`;
}
async function llenarLibreta(el, animar) {
  const cont = el && $('.il-palabras', el); if (!cont) return;
  const r = await api('/api/nyan/libreta').catch(() => null);
  if (!r || !cont.isConnected) return;
  if (!r.palabras.length) { cont.innerHTML = `<p class="inv-nota">${t('perfil.inv.libreta_vacia', { nombre: esc(invD.mochi.nombre) })}</p>`; return; }
  cont.innerHTML = r.palabras.map((w) => `<span class="il-p" title="${esc(w.lectura || '')}"><b lang="ja">${esc(w.jp)}</b><small>${esc(w.es)}</small></span>`).join('')
    + (r.sabe > r.palabras.length ? `<span class="il-mas">${t('perfil.inv.libreta_mas', { n: mil(r.sabe - r.palabras.length) })}</span>` : '');
  if (animar) entrada($$('.il-p', cont).slice(0, 24), { y: 10, dur: 350, paso: 20 });
}

// la sala: arrastrar gira a Nyan; tocar un objeto abre su menú (mover a otro hueco o quitarlo)
function enlazarSala(m) {
  const sala = $('#inv-sala');
  let x0 = null, xa = 0, movido = false;
  sala.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.inv-menu')) return;
    x0 = xa = e.clientX; movido = false; try { sala.setPointerCapture(e.pointerId); } catch { /* sin puntero activo */ }
  });
  sala.addEventListener('pointermove', (e) => {
    if (x0 == null) return;
    if (Math.abs(e.clientX - x0) > 5) { movido = true; cerrarMenu(); }
    if (movido) { m.girarManual((e.clientX - xa) * 0.012); xa = e.clientX; }
  });
  sala.addEventListener('pointerup', (e) => {
    if (x0 == null) return; x0 = null;
    if (movido) return;
    const id = m.propEn(e.clientX, e.clientY);
    if (id) abrirMenu(id, e.clientX, e.clientY); else cerrarMenu();
  });
}
// objetos de la sala que en el catálogo son varios (la bandeja lleva la tetera y el vaso; el cuaderno, el pincel)
const DE_PROP = { bandeja: ['kyusu', 'yunomi'], cuaderno: ['cuaderno', 'fude'] };
function abrirMenu(prop, cx, cy) {
  const menu = $('#inv-menu'), sala = $('#inv-sala').getBoundingClientRect(), ids = DE_PROP[prop] || [prop];
  const o = objetoDe(ids.find((i) => (juegoActual()?.colocados || []).includes(i)) || ids[0]);
  menu.innerHTML = `<b>${esc(o?.nombre || prop)}</b><button data-m="mover">${t('perfil.inv.mover')}</button><button data-m="quitar" class="no">${t('perfil.inv.quitar')}</button>`;
  menu.hidden = false; menu.style.left = `${Math.min(sala.width - 230, Math.max(10, cx - sala.left - 20))}px`; menu.style.top = `${Math.max(10, cy - sala.top - 70)}px`;
  son.burbuja();
  if (!quieto()) gsap.fromTo(menu, { scale: 0.5, opacity: 0, y: 10 }, { scale: 1, opacity: 1, y: 0, duration: 0.4, ease: 'back.out(2.6)' });
  $('[data-m="mover"]', menu).onclick = () => {
    const sitios = estado.mochi?.moverProp?.(prop); son.cambio(3);
    if (sitios) { invD.mochi.sitios = sitios; api('/api/ajustes', { sitios }).catch(() => {}); }
    cerrarMenu();
  };
  $('[data-m="quitar"]', menu).onclick = async () => {
    son.toque(); cerrarMenu();
    for (const i of ids) if ((juegoActual()?.colocados || []).includes(i)) await ponerObjeto(i, false).catch(() => {});
    reaccionar(false); if (pestana === 'sala') pintarPestana(false);
  };
}
function cerrarMenu() { const m = $('#inv-menu'); if (m) m.hidden = true; }
addEventListener('rc:juego', () => { if (V().classList.contains('activa') && $('.inv') && ['ropa', 'accesorio', 'aura', 'sala'].includes(pestana)) pintarPestana(false); });

registrar('kanji', {
  seccion: '#v-mochi',
  async entrar() {
    const lista = await api('/api/kanji');
    const vivos = lista.filter((k) => k.r >= 0).length;
    V().innerHTML = cab(t('perfil.kanji.cab')) + `<div class="pf-cuerpo">
      <h1 class="pf-h1">${t('perfil.kanji.h1', { n: vivos, total: lista.length })}</h1>
      <p class="pf-sub">${t('perfil.kanji.p', { rangos: RANGOS.map((r, i) => `<span class="pf-rango" style="--rc:${RANGO_COLOR[i]}">${r}</span>`).join(' ') })}</p>
      <div class="kj-mapa" aria-label="${t('perfil.kanji.aria')}">${lista.map((k, i) => `<button class="kj-celda" data-i="${i}" aria-label="${esc(k.k)}: ${esc(k.clave)}, ${k.r >= 0 ? RANGOS[k.r] : t('perfil.kanji.sin')}" ${k.r >= 0 ? ` data-r="${k.r}" style="--rc:${RANGO_COLOR[k.r]}"` : ''}>${esc(k.k)}</button>`).join('')}</div>
      <div class="kj-pie" aria-live="polite"></div></div>`;
    const mapa = $('.kj-mapa', V()), pie = $('.kj-pie', V());
    const pintarPie = (k) => { pie.innerHTML = k ? `<b${k.r >= 0 ? ` data-r="${k.r}" style="--rc:${RANGO_COLOR[k.r]}"` : ''}>${esc(k.k)}</b><div>${esc(k.clave)}<small>${k.r >= 0 ? RANGOS[k.r] : t('perfil.kanji.sin_estudiar')} · ${t('perfil.kanji.abre', { intro: kbd('Intro') })}</small></div>`
      : `<div>${t('perfil.kanji.elige', { tab: kbd('Tab') })}<small>${t('perfil.kanji.abre', { intro: kbd('Intro') })} · ${t('perfil.kanji.vuelve', { esc: kbd('Esc') })}</small></div>`; };
    pintarPie(null);
    const deCelda = (el) => lista[+el?.closest?.('.kj-celda')?.dataset.i];
    mapa.addEventListener('focusin', (e) => pintarPie(deCelda(e.target)));
    mapa.addEventListener('pointerover', (e) => { const k = deCelda(e.target); if (k) pintarPie(k); });
    mapa.addEventListener('click', async (e) => {
      const el = e.target.closest('.kj-celda'), k = deCelda(el); if (!k) return;
      const m = await import('./estudio.js').catch(() => null);
      if (m?.abrirFichaKanji) m.abrirFichaKanji(k.k, el);
      else { pintarPie(k); gsap.fromTo(pie, { scale: 1.06 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' }); }
    });
    rejilla(mapa, '.kj-celda');
    entrada([mapa], { y: 28, escala: 0.97, dur: 520 });   // la rejilla entera, una sola capa: 200 celdas animadas a la vez iban a 15 fps
  },
});

registrar('camino', {
  seccion: '#v-mochi',
  async entrar() {
    const regiones = await api('/api/camino');
    const actual = regiones.findIndex((r) => r.hechas < r.total);
    V().innerHTML = cab(t('perfil.camino.cab')) + `<div class="cam">
      <svg class="cam-hilo" preserveAspectRatio="none" aria-hidden="true"><line x1="20" y1="0" x2="20" y2="100%"/></svg>
      ${regiones.map((r, i) => `<div class="cam-fila${i % 2 ? ' der' : ''}${i === actual ? ' actual' : ''}${r.hechas === r.total ? ' hecha' : ''}${i > actual + 1 ? ' lejos' : ''}">
        <div class="cam-region">
          <div class="cam-n">${t('perfil.camino.region', { n: i + 1 })}</div>
          <div class="cam-tit"><span>${esc(r.nombre)}</span><span>${esc(r.jp)}</span></div>
          <div class="cam-muestra">${r.muestra.map(esc).join('・')}…</div>
          <div class="cam-barra"><i style="width:${100 * r.hechas / r.total}%"></i></div>
          <div class="cam-cuenta">${t('perfil.camino.cuenta', { hechas: r.hechas, total: r.total, fuertes: r.fuertes })}</div></div>
        <div class="cam-punto"></div></div>`).join('')}</div>`;
    gsap.fromTo($$('.cab-papel ~ div > div', V()), { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.03, ease: 'power3.out' });
    setTimeout(() => $$('.cab-papel ~ div > div', V())[actual + 1]?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 400);
  },
});
