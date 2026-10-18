// Gramática: la guía de Tae Kim en español como un fichero de lecciones. Cada lección es una ficha con su estado
// (nueva · leída · ejercicios con su mejor nota · tarjetas en el repaso) y ejercicios que cambian de orden y de frases en cada intento.
// Todo con teclado: ← → lección · ↑ ↓ índice · Intro ejercicio que toca · 1–4 eligen · 1–9 ponen piezas · Retroceso quita · E repite.
import { gsap } from 'gsap';
import { $, $$, api, registrar, flotar, chispas } from './app.js';
import * as son from './sonido.js';
import { esc, ruby, textoRico, aKana, normLectura, sinFurigana } from './japones.js';
import { kbd, escribiendo, sobreControl, capaAbierta, rejilla, confirmar, desplazar } from './teclado.js';
import { t, tn } from './i18n.js';
import { htmlBannerClase, pintarIndiceClases } from './clase.js';
import { LOCAL } from './motor/local.js';
import { esInvertida, ordenBien, conjugacionBien, armar } from './gramatica-ejercicios.js';

const V = () => $('#v-gramatica');
let indice = [], slugActual = null, lecActual = null, xpSesion = 0, intento = 1;
const quieto = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const barajar = (l) => { const a = [...l]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const RANGO_COLOR = ['var(--r0)', 'var(--r1)', 'var(--r2)', 'var(--r3)', 'var(--r4)'];
const NOTA = [[95, '秀', t('gramatica.nota.sobresaliente')], [85, '優', t('gramatica.nota.notable')], [70, '良', t('gramatica.nota.bien')], [50, '可', t('gramatica.nota.aprobado')], [0, '再', t('gramatica.nota.otra_vuelta')]];
const notaDe = (pct) => NOTA.find(([t]) => pct >= t);


// ───────────────────────── estilos propios de la vista ─────────────────────────
function estilos() {
  if ($('#gm-estilos')) return;
  const s = document.createElement('style');
  s.id = 'gm-estilos';
  s.textContent = `
/* tarjetas de la guía (11-10): el tarjetero al pie de cada sección */
.gm-tarj { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 12px; margin: 24px 0 8px; padding: 16px; border-radius: var(--radio); background: var(--sup); border: var(--borde); box-shadow: var(--sombra-peq); }
.gm-tarj-ico { flex: none; position: relative; width: 30px; height: 24px; margin: 0 4px 0 2px; }
.gm-tarj-ico i { position: absolute; inset: 0; border-radius: 6px; background: var(--sup); box-shadow: inset 0 0 0 2px var(--tinta-2); }
.gm-tarj-ico i:first-child { rotate: -12deg; translate: -2px 1px; }
.gm-tarj-ico i:last-child { rotate: 7deg; translate: 3px -1px; }
.gm-tarj.todas .gm-tarj-ico i:last-child { background: var(--bien); box-shadow: none; }
.gm-tarj-txt { flex: 1; min-width: 180px; font: 700 14px var(--f-texto); color: var(--tinta); }
.gm-tarj-txt small { display: block; font: 500 12.5px var(--f-texto); color: var(--tinta-2); }
.gm-tarj .boton-claro { height: 42px; padding: 0 18px; font-size: 14px; }
.gm-tarj .boton-claro, .gm-acciones .boton-claro, .hoja-gram .volver { background: var(--sup-2); }
.gm-tarj-chips { display: flex; flex-wrap: wrap; gap: 8px; flex-basis: 100%; }
.gm-chip { min-height: 32px; cursor: pointer; padding: 0 12px; border: var(--borde); border-radius: var(--radio-btn); font: 600 13px var(--f-texto); color: var(--tinta-2); background: var(--sup-2); transition: color .15s, border-color .15s, background .15s; }
.gm-chip:hover { color: var(--tinta); border-color: var(--linea-2); }
.gm-chip.si { background: var(--bien-suave); color: color-mix(in srgb, var(--tinta) 45%, var(--bien)); box-shadow: inset 0 0 0 1.5px var(--bien); border-color: transparent; }
.gm-chip.si::before { content: "✓ "; }
.gm-chip.espera { background: color-mix(in srgb, var(--t-gram) 14%, var(--sup)); color: color-mix(in srgb, var(--tinta) 40%, var(--t-gram)); box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--t-gram) 45%, transparent); border-color: transparent; }
.gm-chip.espera::before { content: "◷ "; }
#v-gramatica .gm-xp { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 14px; border: var(--borde); border-radius: var(--radio-btn); background: var(--sup); font: 700 14px var(--f-texto); color: var(--tinta); box-shadow: var(--sombra-peq); }
#v-gramatica .gm-xp b { color: var(--acento-tinta); font-variant-numeric: tabular-nums; }
#v-gramatica .contador { display: flex; gap: 10px; align-items: center; }
:is(#v-gramatica, .hoja-gram) :is(.gm-chip, .gm-repetir, .indice a):focus-visible { outline: 2px solid var(--acento); outline-offset: 2px; }
/* índice por capítulos */
.gm-cap { margin-bottom: 8px; }
.gm-cap h4 { display: flex; align-items: baseline; gap: 8px; }
.gm-cap h4 span { margin-left: auto; margin-right: 10px; font: 700 11px var(--f-texto); letter-spacing: 0; color: var(--tinta-2); font-variant-numeric: tabular-nums; }
.gm-cap-barra { height: 6px; margin: 0 10px 8px; border-radius: 99px; background: var(--sup-3); overflow: hidden; }
.gm-cap-barra i { display: block; height: 100%; border-radius: inherit; background: var(--bien); transform-origin: left; }
.indice a.gm-i { align-items: center; }
.indice a.gm-i .t { flex: 1; }
.indice a.gm-i.hecha::after { content: none; }
.gm-est { flex: none; display: inline-flex; align-items: center; justify-content: center; white-space: nowrap; min-width: 26px; height: 26px; padding: 0 7px; border-radius: var(--radio-btn); font: 700 11px var(--f-texto); color: var(--tinta-2); box-shadow: inset 0 0 0 2px var(--linea-2); font-variant-numeric: tabular-nums; }
.gm-est.e-leida { background: color-mix(in srgb, var(--t-gram) 14%, var(--sup)); color: color-mix(in srgb, var(--tinta) 40%, var(--t-gram)); box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--t-gram) 50%, transparent); font-family: var(--f-jp); }
.gm-est.e-hecha { background: var(--bien-suave); color: color-mix(in srgb, var(--tinta) 45%, var(--bien)); box-shadow: inset 0 0 0 2px var(--bien); }
.gm-est.e-repaso { gap: 4px; --rc: var(--r0); background: var(--sup); color: var(--tinta); box-shadow: inset 0 0 0 2px var(--rc); }
.gm-est.e-repaso::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: var(--rc); }
.gm-est small { font-size: 9px; margin-left: 1px; opacity: .85; }
.indice a.aqui .gm-est { box-shadow: 0 0 0 2px var(--sup); }
.indice a.aqui .gm-est:not([class*=' e-']) { background: var(--sup); box-shadow: inset 0 0 0 2px var(--linea-2); }
/* ficha de la lección */
.gm-ficha { position: relative; margin: 8px 0 36px; padding: 32px 36px 28px; border-radius: var(--radio); background: var(--sup); border: var(--borde); box-shadow: var(--sombra); }
.gm-ficha .eyebrow { font: 700 11px var(--f-texto); letter-spacing: .16em; text-transform: uppercase; color: var(--tinta-2); }
.gm-ficha h1 { margin: 8px 0 12px; padding-right: 150px; text-wrap: balance; }
.gm-ficha .resumen { margin: 0; text-wrap: pretty; }
/* la pegatina de estado: una ficha con el color del estado (nueva · leída · hecha · en repaso con el color de su rango) */
.gm-pegatina { --pc: var(--acento); position: absolute; top: 24px; right: 24px; display: grid; justify-items: center; gap: 2px; min-width: 112px; padding: 12px 16px 10px; border-radius: var(--radio-peq); rotate: 5deg;
  background: color-mix(in srgb, var(--pc) 14%, var(--sup)); color: color-mix(in srgb, var(--tinta) 45%, var(--pc)); border: 0; box-shadow: inset 0 0 0 2.5px var(--pc); }
.gm-pegatina b { text-shadow: none; font: var(--peso-titulo) 30px/1 var(--f-titulo); }
.gm-pegatina span { font: 700 11px var(--f-texto); letter-spacing: .12em; text-transform: uppercase; }
.gm-pegatina.e-nueva { --pc: var(--acento); }
.gm-pegatina.e-leida { --pc: var(--t-gram); }
.gm-pegatina.e-hecha { --pc: var(--bien); }
.gm-pegatina.e-repaso { --pc: var(--rc, var(--r0)); }
.ejer[data-hecho] .piezas.origen:empty { display: none; }
.gm-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 24px; }
.gm-stat { padding: 12px 16px; border-radius: var(--radio-peq); background: var(--sup-2); border: var(--borde); box-shadow: none; }
.gm-stat small { display: block; font: 700 10.5px var(--f-texto); letter-spacing: .12em; text-transform: uppercase; color: var(--tinta-2); }
.gm-stat b { display: block; margin-top: 4px; font: 700 19px var(--f-texto); color: var(--tinta); }
.gm-stat em { font: 500 12.5px var(--f-texto); font-style: normal; color: var(--tinta-2); }
.gm-stat.off b { color: var(--tinta-2); }
.gm-stat .gm-dot { display: inline-block; width: 11px; height: 11px; margin-right: 6px; border-radius: 50%; background: var(--rc, var(--r0)); vertical-align: 1px; }
.gm-acciones { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
.gm-acciones .boton-tinta kbd, .gm-fin .boton-tinta kbd { --kbd-fondo: color-mix(in srgb, var(--boton-tinta) 16%, transparent); --kbd-tinta: var(--boton-tinta); background: var(--kbd-fondo); color: var(--kbd-tinta); box-shadow: none; }
.gm-acciones .boton-claro { display: inline-flex; align-items: center; gap: 10px; }
/* práctica: el panel de ejercicios es una tarjeta más (los ejercicios, filas rehundidas dentro de ella) */
:is(#v-gramatica, .hoja-gram) .ejercicios { position: relative; margin-top: 56px; padding: 28px; border-radius: var(--radio); background: var(--sup); border: var(--borde); box-shadow: var(--sombra); color: var(--tinta); }
:is(#v-gramatica, .hoja-gram) .ejercicios h2 { margin: 0 0 6px; color: var(--tinta); text-wrap: balance; }
:is(#v-gramatica, .hoja-gram) .ejercicios :focus-visible { outline-color: var(--acento); }
:is(#v-gramatica, .hoja-gram) .ejer { margin-top: 16px; padding: 20px; border-radius: var(--radio-peq); background: var(--sup-2); border: var(--borde); box-shadow: none; }
:is(#v-gramatica, .hoja-gram) .ejer.actual { background: var(--sup-2); box-shadow: inset 0 0 0 2px var(--acento), 0 0 0 4px var(--acento-suave); }
:is(#v-gramatica, .hoja-gram) .ejer.ok { box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--bien) 55%, transparent); }
:is(#v-gramatica, .hoja-gram) .ejer .p { font-size: 15px; opacity: 1; color: var(--tinta-2); }
:is(#v-gramatica, .hoja-gram) .ejer .jp { font-family: var(--f-jp); }
:is(#v-gramatica, .hoja-gram) .ejer .jp rt { opacity: 1; color: var(--tinta-2); }
:is(#v-gramatica, .hoja-gram) .ejer .ej-teclas { color: var(--tinta-2); }
:is(#v-gramatica, .hoja-gram) .ejer .opciones button { position: relative; height: auto; min-height: 50px; padding: 10px 18px; text-align: left; line-height: 1.3; background: var(--sup); color: var(--tinta); border: var(--borde); border-radius: var(--radio-peq);
  box-shadow: var(--sombra-peq); font: 600 20px var(--f-jp); transition: translate .15s var(--suave), background .15s, box-shadow .15s, border-color .15s; }
:is(#v-gramatica, .hoja-gram) .ejer .opciones button:hover:not([disabled]) { translate: 0 -2px; border-color: var(--linea-2); }
:is(#v-gramatica, .hoja-gram) .ejer .opciones button:active:not([disabled]) { translate: 0 1px; }
:is(#v-gramatica, .hoja-gram) .ejer .opciones button.bien { background: var(--bien-suave); color: var(--tinta); box-shadow: inset 0 0 0 2px var(--bien); border-color: transparent; }
:is(#v-gramatica, .hoja-gram) .ejer .opciones button.mal { background: var(--mal-suave); color: var(--tinta); box-shadow: inset 0 0 0 2px var(--mal); border-color: transparent; }
:is(#v-gramatica, .hoja-gram) .ejer .opciones button[disabled] { cursor: default; translate: none; }
:is(#v-gramatica, .hoja-gram) .piezas { display: flex; gap: 8px; flex-wrap: wrap; min-height: 56px; padding: 8px; border-radius: var(--radio-peq); background: none; }
:is(#v-gramatica, .hoja-gram) .piezas.destino { border: 2px dashed color-mix(in srgb, var(--tinta-3) 82%, var(--sup)); margin-bottom: 8px; }   /* el hueco se ve (≥ 3:1) en los cuatro temas */
:is(#v-gramatica, .hoja-gram) .pieza { height: 46px; padding: 0 16px; border: var(--borde); border-radius: var(--radio-peq); background: var(--sup); color: var(--tinta); font: 500 20px var(--f-jp); box-shadow: var(--sombra-peq); rotate: none; transition: translate .15s var(--suave), border-color .15s; }
:is(#v-gramatica, .hoja-gram) .pieza:hover { translate: 0 -2px; rotate: none; border-color: var(--linea-2); }
:is(#v-gramatica, .hoja-gram) .explicacion { margin-top: 10px; font-size: 14px; opacity: 1; color: color-mix(in srgb, var(--tinta) 45%, var(--bien)); }
:is(#v-gramatica, .hoja-gram) .explicacion.mal { color: color-mix(in srgb, var(--tinta) 45%, var(--mal)); }
:is(#v-gramatica, .hoja-gram) .ejer input { width: 100%; height: 52px; border: 0; border-radius: var(--radio-peq); padding: 0 16px; font: 500 20px var(--f-jp); background: var(--sup); color: var(--tinta); box-shadow: inset 0 0 0 2px var(--linea); transition: box-shadow .15s var(--suave); }
:is(#v-gramatica, .hoja-gram) .ejer input:hover { box-shadow: inset 0 0 0 2px var(--linea-2); }
:is(#v-gramatica, .hoja-gram) .ejer input:focus { box-shadow: inset 0 0 0 2px var(--acento); }
:is(#v-gramatica, .hoja-gram) .ejercicios .gm-p-cab { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 10px 18px; }
:is(#v-gramatica, .hoja-gram) .ejercicios .gm-p-cab p { margin: 0; color: var(--tinta-2); opacity: 1; }
.gm-p-der { margin-left: auto; display: flex; align-items: center; gap: 10px; }
.gm-intento { font: 700 12px var(--f-texto); letter-spacing: .06em; padding: 7px 12px; border-radius: var(--radio-btn); background: var(--aviso-suave); color: color-mix(in srgb, var(--tinta) 45%, var(--aviso)); }
html .gm-repetir { display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 16px; border: var(--borde); border-radius: var(--radio-btn); background: var(--sup-2); color: var(--tinta); font: 700 14px var(--f-texto); cursor: pointer; box-shadow: var(--sombra-peq); transition: translate .15s var(--suave), border-color .15s; }
.gm-repetir:hover { translate: 0 -2px; border-color: var(--linea-2); }
.gm-repetir:active { translate: 0 1px; }
.gm-barra { position: sticky; top: 86px; z-index: 6; display: flex; align-items: center; gap: 12px; margin: 18px -12px 4px; padding: 12px 16px; border-radius: var(--radio-peq);
  background: var(--sup); border: var(--borde); box-shadow: var(--sombra-flotante); }
.gm-pips { flex: 1; display: flex; gap: 5px; }
.gm-pip { flex: 1; height: 14px; border-radius: 99px; background: var(--sup-3); }
.gm-pip.ok { background: var(--bien); }
.gm-pip.ko { background: var(--mal); }
.gm-pip.aqui { box-shadow: inset 0 0 0 2px var(--acento); }
.gm-cuenta { font: 700 15px var(--f-texto); color: var(--tinta); font-variant-numeric: tabular-nums; min-width: 52px; text-align: right; }
.gm-combo { min-width: 0; font: 700 13px var(--f-texto); color: color-mix(in srgb, var(--tinta) 45%, var(--aviso)); white-space: nowrap; }
.ejer .p { display: flex; flex-wrap: wrap; gap: 6px 10px; align-items: baseline; }
.ejer .gm-n { display: inline-grid; place-items: center; min-width: 26px; height: 26px; border-radius: 9px; background: var(--sup); font: 700 13px var(--f-texto); font-variant-numeric: tabular-nums; }
.ejer .gm-enun { margin-top: 4px; font: 700 11px var(--f-texto); letter-spacing: .12em; text-transform: uppercase; color: var(--tinta-2); }
.gm-nueva { padding: 3px 9px; border-radius: var(--radio-btn); background: var(--aviso-suave); color: color-mix(in srgb, var(--tinta) 45%, var(--aviso)); font: 700 10.5px var(--f-texto); letter-spacing: .08em; text-transform: uppercase; }
.gm-busca-mal { display: inline-flex; align-items: center; gap: 6px; margin: 8px 0 2px; padding: 5px 12px; border-radius: var(--radio-peq); background: var(--mal-suave); color: color-mix(in srgb, var(--tinta) 45%, var(--mal)); font: 700 12.5px var(--f-texto); box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--mal) 45%, transparent); }
/* el sello de cada ejercicio hecho: 正 / 見 si va bien, 惜 si no */
.gm-sello { position: absolute; right: 18px; top: 12px; display: grid; place-items: center; width: 58px; height: 58px; border-radius: 50%; pointer-events: none; z-index: 2;
  font: 400 28px/1 var(--f-kaisho); color: var(--acento-tinta); box-shadow: inset 0 0 0 3px var(--acento); rotate: -12deg; }
.gm-sello.suave { color: var(--tinta-2); box-shadow: inset 0 0 0 3px var(--linea-2); }
.ejer.actual .gm-sello { display: none; }
/* «¿cuál está mal?»: la opción buscada es una frase MALA → se tacha en rojo, nunca en verde */
:is(#v-gramatica, .hoja-gram) .ejer .opciones button.pillada { background: var(--mal-suave); color: var(--tinta); box-shadow: inset 0 0 0 2px var(--mal); border-color: transparent; }
.opciones button.pillada .gm-op { text-decoration: line-through wavy var(--mal) 2px; text-decoration-skip-ink: none; }
.opciones button.pillada kbd { background: color-mix(in srgb, var(--mal) 25%, var(--sup)); color: var(--tinta); }
:is(#v-gramatica, .hoja-gram) .ejer .opciones button.bien-dicha { background: var(--sup); color: var(--tinta); box-shadow: inset 0 0 0 2px var(--bien); border-color: transparent; }
:is(#v-gramatica, .hoja-gram) .ejer .opciones button.bien-dicha.elegida { box-shadow: inset 0 0 0 2px var(--aviso); }
.gm-tag { position: absolute; left: 10px; top: -13px; padding: 3px 10px; border-radius: var(--radio-peq); font: 700 11px var(--f-texto); white-space: nowrap; letter-spacing: .02em; color: var(--tinta); rotate: -2deg; }
.gm-tag.mal { background: color-mix(in srgb, var(--mal) 20%, var(--sup)); box-shadow: inset 0 0 0 1.5px var(--mal); }
.gm-tag.bien { background: color-mix(in srgb, var(--bien) 20%, var(--sup)); box-shadow: inset 0 0 0 1.5px var(--bien); }
.gm-corregida { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; margin-top: 16px; padding: 12px 16px; border-radius: var(--radio-peq); background: var(--sup); box-shadow: inset 0 0 0 1.5px var(--linea); }
.gm-corregida .mal { font: 500 20px var(--f-jp); color: color-mix(in srgb, var(--tinta) 45%, var(--mal)); text-decoration: line-through wavy var(--mal) 2px; }
.gm-corregida .flecha { color: var(--tinta-2); font-weight: 700; }
.gm-corregida .bien { font: 600 22px var(--f-jp); color: color-mix(in srgb, var(--tinta) 45%, var(--bien)); }
.gm-corregida small { display: block; font: 700 10.5px var(--f-texto); letter-spacing: .12em; text-transform: uppercase; color: var(--tinta-2); }
/* fin de la práctica */
.gm-fin { margin-top: 24px; padding: 28px; border-radius: var(--radio-peq); background: var(--sup-2); border: var(--borde); color: var(--tinta); display: grid; grid-template-columns: auto 1fr; gap: 10px 28px; align-items: center; }
.gm-fin[hidden] { display: none; }
.gm-fin .gm-hanko { grid-row: span 3; display: grid; place-items: center; width: 132px; height: 132px; border-radius: 50%; background: var(--sup); color: var(--acento-tinta); font: 400 72px/1 var(--f-kaisho);
  box-shadow: inset 0 0 0 6px var(--acento); rotate: -10deg; }
.gm-fin h3 { margin: 0; font: 700 32px/1.1 var(--f-texto); text-wrap: balance; }
.gm-fin h3 b { color: var(--acento-tinta); font-variant-numeric: tabular-nums; }
.gm-fin .gm-logros { display: flex; flex-wrap: wrap; gap: 8px; }
.gm-logro { padding: 6px 12px; border-radius: var(--radio-peq); background: var(--sup); font: 700 13.5px var(--f-texto); box-shadow: inset 0 0 0 1.5px var(--linea); }
.gm-logro.oro { background: var(--aviso-suave); color: color-mix(in srgb, var(--tinta) 45%, var(--aviso)); box-shadow: inset 0 0 0 1.5px var(--aviso); }
.gm-logro.te { background: var(--bien-suave); color: color-mix(in srgb, var(--tinta) 45%, var(--bien)); box-shadow: inset 0 0 0 1.5px var(--bien); }
.gm-fin .gm-fin-acc { display: flex; flex-wrap: wrap; gap: 12px; }
.gm-fin .boton-claro { display: inline-flex; align-items: center; gap: 10px; }
.gm-vuela { position: fixed; z-index: 60; left: 0; top: 0; pointer-events: none; padding: 6px 14px; border-radius: var(--radio-btn); background: var(--sup); color: color-mix(in srgb, var(--tinta) 45%, var(--aviso)); font: 700 15px var(--f-texto);
  box-shadow: inset 0 0 0 2px var(--aviso), var(--sombra-flotante); white-space: nowrap; font-variant-numeric: tabular-nums; }
/* la hoja de una lección que se abre desde el repaso */
.hoja-gram { position: fixed; top: 14px; right: 14px; bottom: 14px; width: min(820px, 94vw); border-radius: var(--radio); z-index: 45; background: var(--fondo); border: var(--borde); overflow: auto; padding: 24px 40px 80px; box-shadow: var(--sombra-flotante); }
@media (max-width: 900px) { .gm-stats { grid-template-columns: 1fr; } .gm-ficha h1 { padding-right: 0; } .gm-pegatina { position: static; width: fit-content; margin-bottom: 12px; rotate: -2deg; } .gm-fin { grid-template-columns: 1fr; } .gm-fin .gm-hanko { grid-row: auto; } }
@media (prefers-reduced-motion: reduce) { .gm-repetir, .indice a, .gm-chip, .ejer .opciones button, .pieza, .ejer input { transition: none; } }
`;
  document.head.appendChild(s);
}

// ───────────────────────── lección ─────────────────────────
function bloque(b) {
  switch (b.tipo) {
    case 'texto': return `<p>${textoRico(b.md)}</p>`;
    case 'regla': return `<div class="bl-regla"><strong>${ruby(b.titulo || t('gramatica.regla'))}</strong>${textoRico(b.md)}</div>`;
    case 'ojo': return `<div class="bl-ojo">${textoRico(b.md)}</div>`;
    case 'ejemplos': return `<div class="bl-ejemplos">${(b.items || []).map((e, i) => `<div class="ej"><span class="n">${i + 1}</span><div><div class="jp">${ruby(e.jp)}</div><div class="es">${esc(e.es)}</div>${e.nota ? `<div class="nota">${textoRico(e.nota)}</div>` : ''}</div></div>`).join('')}</div>`;
    case 'tabla': return `<div class="bl-tabla"><table><thead><tr>${(b.columnas || []).map((c) => `<th>${textoRico(c)}</th>`).join('')}</tr></thead><tbody>${(b.filas || []).map((f) => `<tr>${f.map((c) => `<td>${textoRico(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    case 'dialogo': return `<div class="bl-dialogo">${(b.lineas || []).map((l) => `<div class="l"><span class="q">${esc(l.quien)}</span><div class="ej" style="grid-template-columns:1fr"><div><div class="jp">${ruby(l.jp)}</div><div class="es">${esc(l.es)}</div></div></div></div>`).join('')}</div>`;
    default: return b.md ? `<p>${textoRico(b.md)}</p>` : '';
  }
}
function ejercicio(e, i) {
  const enun = e.pregunta || (e.tipo === 'ordenar' ? t('gramatica.ej.ordena') : e.tipo === 'conjugar' ? t('gramatica.ej.conjuga', { base: sinFurigana(e.base), forma: e.forma }) : t('gramatica.ej.elige'));
  const marca = e.generada ? `<span class="gm-nueva">${e.origen === 'kaishi' ? t('gramatica.ej.de_tus_frases') : t('gramatica.ej.frase_nueva')}</span>` : '';
  const cab = `${e.enunciado ? `<div class="gm-enun">${esc(e.enunciado)}</div>` : ''}<div class="p"><b class="gm-n">${i + 1}</b><span>${textoRico(enun)}</span>${marca}</div>`;
  if (e.tipo === 'elegir') {
    const n = (e.opciones || []).length, inv = esInvertida(e);
    const ops = barajar((e.opciones || []).map((o, k) => ({ o, k })));
    return `<div class="ejer" data-i="${i}" data-tipo="elegir"${inv ? ' data-inv="1"' : ''}><span class="ej-teclas">${t('gramatica.ej.teclas_elige', { de: kbd('1'), a: kbd(n) })}</span>${cab}
      ${inv ? `<div class="gm-busca-mal">${t('gramatica.ej.busca_mal')}</div>` : ''}${e.jp ? `<div class="jp">${ruby(e.jp)}</div>` : ''}
      <div class="opciones">${ops.map(({ o, k }, j) => `<button data-k="${k}">${kbd(j + 1)}<span class="gm-op">${ruby(o)}</span></button>`).join('')}</div><div class="explicacion" hidden></div></div>`;
  }
  if (e.tipo === 'ordenar') {
    const piezas = barajar([...(e.piezas || [])].map((p, k) => ({ p, k })));
    return `<div class="ejer" data-i="${i}" data-tipo="ordenar"><span class="ej-teclas">${t('gramatica.ej.teclas_ordenar', { de: kbd('1'), a: kbd(piezas.length), quita: kbd('Retroceso') })}</span>${cab}<div class="p" style="opacity:.6">${esc(e.es || '')}</div><div class="piezas destino"></div><div class="piezas origen">${piezas.map(({ p, k }, n) => `<button class="pieza" data-k="${k}" data-n="${n + 1}">${kbd(n + 1)}${ruby(p)}</button>`).join('')}</div><div class="explicacion" hidden></div></div>`;
  }
  return `<div class="ejer" data-i="${i}" data-tipo="conjugar"><span class="ej-teclas">${t('gramatica.ej.teclas_escribir', { k: kbd('Intro') })}</span>${cab}<form><input placeholder="${t('gramatica.ej.ph')}" autocomplete="off" aria-label="${t('gramatica.ej.tu_respuesta')}"></form><div class="explicacion" hidden></div></div>`;
}

// +XP que vuela desde el ejercicio hasta el contador de la cabecera
function volarXP(desde, n) {
  const chip = V()?.classList.contains('activa') && !document.querySelector('.hoja-gram') ? $('#gm-xp') : null;
  xpSesion += n;
  if (!desde?.isConnected) return;
  const r = desde.getBoundingClientRect();
  if (!chip || quieto()) { if (chip) $('b', chip).textContent = xpSesion; flotar(`+${n} XP`, r.right - 70, r.top + 20, 'var(--aviso)'); return; }
  const d = chip.getBoundingClientRect(), et = document.createElement('div');
  et.className = 'gm-vuela'; et.textContent = `+${n} XP`; document.body.appendChild(et);
  const x0 = r.right - 110, y0 = r.top + 16, x1 = d.left + d.width / 2 - 30, y1 = d.top + 4, total = xpSesion;
  gsap.timeline({ onComplete: () => {
    et.remove();
    const b = $('b', chip), o = { v: +b.textContent || 0 };
    gsap.to(o, { v: total, duration: 0.4, ease: 'power2.out', onUpdate: () => { b.textContent = Math.round(o.v); } });
    gsap.fromTo(chip, { scale: 1.18 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
    son.koto(son.escalon(8, 62), 0, 0.18);
  } })
    .fromTo(et, { x: x0, y: y0, scale: 0.5, opacity: 0 }, { y: y0 - 34, scale: 1.1, opacity: 1, duration: 0.35, ease: 'back.out(2.6)' })
    .to(et, { x: x1, duration: 0.6, ease: 'power2.inOut' }, '+=0.1')
    .to(et, { y: y1, scale: 0.6, duration: 0.6, ease: 'back.in(1.4)' }, '<');
}
// sello hanko al acertar (o uno suave al fallar, sin humillar)
function sellar(el, ok) {
  const s = document.createElement('span');
  s.className = 'gm-sello' + (ok ? '' : ' suave'); s.textContent = ok ? (el.dataset.inv ? '見' : '正') : '惜';
  s.setAttribute('aria-hidden', 'true'); el.appendChild(s);
  if (quieto()) return;
  gsap.fromTo(s, { scale: 2.4, rotate: -40, opacity: 0 }, { scale: 1, rotate: -12, opacity: 1, duration: ok ? 0.42 : 0.5, ease: ok ? 'back.out(3)' : 'power2.out' });
  if (ok) { gsap.fromTo(el, { y: 0 }, { y: 3, duration: 0.07, yoyo: true, repeat: 1, delay: 0.16 }); setTimeout(() => son.sello(), 150); }
}

/**
 * Monta los ejercicios ya pintados en cont. ejs es la lista en el orden en que se pintó.
 * Devuelve nada; deja en cont.__ej el control con teclado (numero, quitar, ir).
 */
function montarEjercicios(cont, ejs, alTerminar) {
  let hechos = 0, aciertos = 0, racha = 0, porTeclado = false;
  const pips = $$('.gm-pip', cont);
  const pendiente = () => $$('.ejer', cont).find((el) => !el.dataset.hecho);
  const marcar = () => {
    const a = pendiente();
    $$('.ejer', cont).forEach((el) => el.classList.toggle('actual', el === a));
    pips.forEach((p, j) => p.classList.toggle('aqui', !!a && j === +a.dataset.i));
    return a;
  };
  const alVista = (el) => { const r = el.getBoundingClientRect(); return r.bottom > 150 && r.top < innerHeight - 60; };
  const llevar = (el, { enfocar = true } = {}) => {
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: quieto() ? 'auto' : 'smooth' });
    if (!quieto()) gsap.fromTo(el, { scale: 0.985 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
    if (enfocar && el.dataset.tipo === 'conjugar') setTimeout(() => { if (!el.dataset.hecho) $('input', el)?.focus({ preventScroll: true }); }, quieto() ? 0 : 320);
  };
  const cerrar = (el, ok, e) => {
    hechos++;
    if (ok) { aciertos++; racha++; } else racha = 0;
    el.dataset.hecho = 1; el.classList.add(ok ? 'ok' : 'ko');
    const ex = $('.explicacion', el); ex.hidden = false; ex.classList.toggle('mal', !ok);
    ex.innerHTML = (ok ? (el.dataset.inv ? t('gramatica.ej.bien_visto') : t('gramatica.ej.bien')) : t('gramatica.ej.mal')) + ' ' + textoRico(e.explica || '');
    sellar(el, ok);
    if (ok) { son.acierto(racha); if (son.esHito(racha)) son.tramo(racha); volarXP(el, 5); } else son.fallo();
    if (!quieto()) gsap.fromTo(ex, { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35 });
    // barra de la lección
    const pip = pips[+el.dataset.i];
    if (pip) { pip.classList.add(ok ? 'ok' : 'ko'); if (!quieto()) gsap.fromTo(pip, { scaleY: 1.9, scaleX: 1.15 }, { scaleY: 1, scaleX: 1, duration: 0.55, ease: 'elastic.out(1, 0.35)' }); }
    const cuenta = $('.gm-cuenta b', cont); if (cuenta) cuenta.textContent = hechos;
    $('.gm-barra', cont)?.setAttribute('aria-valuenow', hechos);
    const combo = $('.gm-combo', cont);
    if (combo) {
      combo.textContent = racha >= 3 ? tn('gramatica.ej.seguidas', racha) : '';
      if (racha >= 3 && !quieto()) { gsap.fromTo(combo, { scale: 1.5, rotate: -6 }, { scale: 1, rotate: 0, duration: 0.5, ease: 'back.out(3)' }); if (son.esHito(racha)) chispas(combo, { n: 10, fuerza: 0.8 }); }
    }
    const sig = marcar();
    if (porTeclado && sig) setTimeout(() => { if (!sig.dataset.hecho) llevar(sig); }, 700);
    porTeclado = false;
    if (hechos === ejs.length) alTerminar(aciertos, ejs.length);
  };
  $$('.ejer', cont).forEach((el) => {
    const e = ejs[+el.dataset.i];
    if (e.tipo === 'elegir') {
      const inv = !!el.dataset.inv;
      $$('.opciones button', el).forEach((b) => {
        b.onclick = () => {
          if (el.dataset.hecho) return;
          const ok = +b.dataset.k === e.correcta;
          const botones = $$('.opciones button', el);
          botones.forEach((x) => { x.disabled = true; });
          if (inv) {
            // la buscada es una frase MALA: se tacha en rojo con su etiqueta; las demás están bien dichas
            botones.forEach((x) => {
              const mala = +x.dataset.k === e.correcta;
              x.classList.add(mala ? 'pillada' : 'bien-dicha');
              if (mala) x.insertAdjacentHTML('afterbegin', `<span class="gm-tag mal">${t('gramatica.ej.tag_mal')}</span>`);
              else if (x === b) { x.classList.add('elegida'); x.insertAdjacentHTML('afterbegin', `<span class="gm-tag bien">${t('gramatica.ej.tag_bien')}</span>`); }
            });
            const mala = e.opciones[e.correcta];
            if (e.corregida) {
              $('.opciones', el).insertAdjacentHTML('afterend', `<div class="gm-corregida"><div><small>${t('gramatica.ej.corregida_mal')}</small><span class="mal">${ruby(mala)}</span></div><span class="flecha">→</span><div><small>${t('gramatica.ej.corregida_bien')}</small><span class="bien">${ruby(e.corregida)}</span></div></div>`);
              if (!quieto()) gsap.fromTo($('.gm-corregida', el), { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, delay: 0.15, ease: 'back.out(2)' });
            }
            const objetivo = botones.find((x) => +x.dataset.k === e.correcta);
            if (!quieto()) gsap.fromTo($('.gm-tag', objetivo), { scale: 0, rotate: -20 }, { scale: 1, rotate: -2, duration: 0.45, ease: 'back.out(3)' });
            if (!ok && !quieto()) gsap.fromTo(b, { x: -8 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
          } else {
            botones.forEach((x) => { if (+x.dataset.k === e.correcta) x.classList.add('bien'); });
            if (!ok) { b.classList.add('mal'); if (!quieto()) gsap.fromTo(b, { x: -8 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' }); }
            else if (!quieto()) gsap.fromTo(b, { scale: 1.08 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.35)' });
          }
          cerrar(el, ok, e);
        };
      });
    } else if (e.tipo === 'ordenar') {
      const destino = $('.destino', el), origen = $('.origen', el);
      $$('.pieza', el).forEach((b) => {
        b.onclick = () => {
          if (el.dataset.hecho) return;
          (b.parentElement === origen ? destino : origen).appendChild(b); son.toque();
          if (!quieto()) gsap.fromTo(b, { y: -10, scale: 0.9 }, { y: 0, scale: 1, duration: 0.35, ease: 'back.out(2.5)' });
          if (!origen.children.length) {
            const orden = [...destino.children].map((x) => +x.dataset.k);
            const { ok, exacto } = ordenBien(e, orden);
            destino.style.borderColor = ok ? 'var(--bien)' : 'var(--mal)';
            if (!ok) destino.insertAdjacentHTML('afterend', `<div class="p" style="margin:6px 0">${t('gramatica.ej.orden_correcto', { frase: e.piezas.map((p) => ruby(p)).join(' ') })}</div>`);
            else if (!exacto) destino.insertAdjacentHTML('afterend', `<div class="p" style="margin:6px 0">${t('gramatica.ej.orden_tambien', { frase: e.piezas.map((p) => ruby(p)).join(' ') })}</div>`);
            cerrar(el, ok, e);
          }
        };
      });
    } else {
      const inp = $('input', el);
      inp.addEventListener('input', () => { if (/[a-z]/i.test(inp.value)) inp.value = aKana(inp.value); });
      $('form', el).onsubmit = (ev) => {
        ev.preventDefault(); if (el.dataset.hecho) return;
        const v = normLectura(aKana(inp.value, true)); if (!v) return;
        inp.readOnly = true; porTeclado = true;
        const ok = conjugacionBien(e, inp.value);
        inp.style.outline = `3px solid ${ok ? 'var(--bien)' : 'var(--mal)'}`;
        if (!ok) inp.insertAdjacentHTML('afterend', `<div class="p" style="margin-top:6px">${t('gramatica.ej.respuesta', { r: esc(sinFurigana((e.respuestas || [])[0] || '')) })}</div>`);
        cerrar(el, ok, e);
      };
    }
  });
  marcar();
  cont.__ej = {
    numero(n) {
      const el = pendiente(); if (!el) return false;
      if (!alVista(el)) { llevar(el, { enfocar: false }); return true; } // primero se enseña; la siguiente tecla ya responde
      porTeclado = true;
      if (el.dataset.tipo === 'elegir') { const b = $$('.opciones button', el)[n - 1]; if (b) b.click(); else porTeclado = false; }
      else if (el.dataset.tipo === 'ordenar') { const b = $(`.pieza[data-n="${n}"]`, el); if (b) b.click(); else porTeclado = false; }
      else { porTeclado = false; llevar(el); }
      return true;
    },
    quitar() {
      const el = pendiente(); if (!el || el.dataset.tipo !== 'ordenar') return false;
      const ult = $('.destino', el).lastElementChild; if (!ult) return false;
      ult.click(); return true;
    },
    ir() { const el = pendiente(); if (!el) return false; llevar(el); return true; },
    aMedias: () => hechos > 0 && hechos < ejs.length,
  };
}

function htmlPractica(ejs, variar) {
  if (!ejs.length) return '';
  return `<section class="ejercicios" id="gm-practica" aria-label="${t('gramatica.practica')}">
    <div class="gm-p-cab"><div><h2>${t('gramatica.practica')}</h2><p>${tn('gramatica.practica.sub', ejs.length, { intro: kbd('Intro') })}</p></div>
      <div class="gm-p-der">${variar ? `<span class="gm-intento">${t('gramatica.practica.intento', { n: intento })}</span>` : ''}<button class="gm-repetir" data-repetir>↻ ${t('gramatica.practica.repetir')} ${kbd('E')}</button></div></div>
    <div class="gm-barra" role="progressbar" aria-label="${t('gramatica.practica.hechos_aria')}" aria-valuemin="0" aria-valuemax="${ejs.length}" aria-valuenow="0">
      <div class="gm-pips">${ejs.map(() => '<i class="gm-pip"></i>').join('')}</div><span class="gm-combo"></span><span class="gm-cuenta"><b>0</b>/${ejs.length}</span></div>
    <div class="gm-lista">${ejs.map(ejercicio).join('')}</div>
    <div class="gm-fin" hidden></div></section>`;
}
export function htmlLeccion(lec, ejs = lec.ejercicios || []) {
  const tus = (lec.en_tus_palabras || []);
  return `<article class="pagina"><div class="eyebrow" style="font:700 11px var(--f-texto);letter-spacing:.16em;text-transform:uppercase;color:var(--tinta-2)">${t('gramatica.leccion.eyebrow', { capitulo: esc(lec.capitulo || ''), orden: lec.orden })}</div>
    <h1>${ruby(lec.titulo)}</h1><p class="resumen">${textoRico(lec.resumen || '')}</p>
    ${cuerpo(lec, tus)}
    ${ejs.length ? `<section class="ejercicios"><h2>${t('gramatica.practica')}</h2><p style="opacity:.7;margin:0">${tn('gramatica.practica.sub', ejs.length, { intro: kbd('Intro') })}</p>${ejs.map(ejercicio).join('')}<div class="gm-fin" hidden></div></section>` : ''}
    <p style="margin-top:40px;font-size:12px;color:var(--tinta-2)">${esc(lec.fuente || '')}</p></article>`;
}
// las tarjetas de una sección: cada una se añade o se quita sola, o todas con el botón
function htmlTarjetero(lec, i) {
  const fs = (lec.fichas || []).filter((f) => f.seccion === i);
  if (!fs.length || !lec.fichas_mias) return '';
  const mias = lec.fichas_mias, n = fs.filter((f) => f.id in mias).length, todas = n === fs.length;
  const chip = (f) => { const m = mias[f.id]; const cls = !m ? '' : m.espera ? ' si espera' : ' si';
    const tit = m?.espera ? t('gramatica.fichas.espera', { dia: new Date(m.espera * 1000).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric' }) }) : t(m ? 'gramatica.fichas.quitar_una' : 'gramatica.fichas.anadir_una');
    return `<button class="gm-chip${cls}" data-ficha="${esc(f.id)}" title="${esc(tit)}">${esc(f.titulo)}</button>`; };
  return `<div class="gm-tarj${todas ? ' todas' : ''}" data-tarjetero="${i}"><span class="gm-tarj-ico" aria-hidden="true"><i></i><i></i></span>
    <div class="gm-tarj-txt">${tn('gramatica.fichas.n', fs.length)}<small>${n ? tn('gramatica.fichas.en_repaso', n) : t('gramatica.fichas.sub')}</small></div>
    <button class="boton-claro" data-fichas-sec="${i}">${todas ? t('gramatica.fichas.quitar') : n ? t('gramatica.fichas.anadir_resto') : t('gramatica.fichas.anadir')}</button>
    <div class="gm-tarj-chips">${fs.map(chip).join('')}</div></div>`;
}
function botonFichasLeccion(lec) {
  const fs = lec.fichas || [], mias = lec.fichas_mias || {}, faltan = fs.filter((f) => !(f.id in mias)).length;
  if (!fs.length || !lec.fichas_mias) return '';
  return `<button class="boton-claro" data-fichas-todas${faltan ? '' : ' disabled'}>${faltan ? tn('gramatica.fichas.anadir_todas', faltan) : t('gramatica.fichas.todas_ya')}</button>`;
}
async function cambiarFichas(lec, ids, quitar) {
  if (!ids.length) return;
  const r = await api(`/api/gramatica/${lec.slug}/fichas`, { ids, quitar });
  if (lec !== lecActual) return;
  lec.fichas_mias = r.fichas_mias;
  for (const el of $$('[data-tarjetero]', V())) {
    const nuevo = htmlTarjetero(lec, +el.dataset.tarjetero);
    el.outerHTML = nuevo;
  }
  const b = $('[data-fichas-todas]', V()); if (b) b.outerHTML = botonFichasLeccion(lec);
  if (!quieto()) for (const id of ids) { const c = $(`.gm-chip[data-ficha="${CSS.escape(id)}"]`, V()); if (c) gsap.fromTo(c, { scale: 0.8 }, { scale: 1, duration: 0.35, ease: 'back.out(3)' }); }
  if (quitar) son.toque(); else son.burbuja();
}
function montarFichas() {
  V().addEventListener('click', (e) => {
    const lec = lecActual;
    if (!lec?.fichas_mias) return;
    const chip = e.target.closest('.gm-chip[data-ficha]'), sec = e.target.closest('[data-fichas-sec]'), todas = e.target.closest('[data-fichas-todas]');
    const mias = lec.fichas_mias || {};
    if (chip) cambiarFichas(lec, [chip.dataset.ficha], chip.dataset.ficha in mias);
    else if (sec) {
      const fs = (lec.fichas || []).filter((f) => f.seccion === +sec.dataset.fichasSec), faltan = fs.filter((f) => !(f.id in mias));
      cambiarFichas(lec, (faltan.length ? faltan : fs).map((f) => f.id), !faltan.length);
    } else if (todas) cambiarFichas(lec, (lec.fichas || []).filter((f) => !(f.id in mias)).map((f) => f.id), false);
  });
}
function cuerpo(lec, tus, conFichas = false) {
  return `${(lec.secciones || []).map((s, i) => `<section><h2>${ruby(s.titulo)}</h2>${(s.bloques || []).map(bloque).join('')}${conFichas ? htmlTarjetero(lec, i) : ''}</section>`).join('')}
    ${tus.length ? `<section class="en-tus"><h2>${t('gramatica.en_tus')}</h2><div class="bl-ejemplos">${tus.map((x) => `<div class="ej"><span class="n">${esc(x.palabra)}</span><div><div class="jp">${ruby(x.frase)}</div><div class="es">${esc(x.frase_es)}</div>${x.nota ? `<div class="nota">${textoRico(x.nota)}</div>` : ''}</div></div>`).join('')}</div></section>` : ''}`;
}

// ───────────────────────── estado de cada lección ─────────────────────────
function pegatina(l) {
  const p = l.progreso || l, est = p.estado || 'nueva', tj = p.tarjetas || {}, ej = p.ejercicios || {};
  const rc = tj.rango >= 0 ? RANGO_COLOR[tj.rango] : '';
  const cara = est === 'repaso' ? `<b>${ej.mejor ?? '–'}<small style="font-size:.5em">%</small></b><span>${t('gramatica.estado.repaso')}</span>`
    : est === 'hecha' ? `<b>${ej.mejor ?? 0}<small style="font-size:.5em">%</small></b><span>${t('gramatica.estado.hecha')}</span>`
    : est === 'leida' ? `<b>読</b><span>${t('gramatica.estado.leida')}</span>` : `<b>新</b><span>${t('gramatica.estado.nueva')}</span>`;
  return `<div class="gm-pegatina e-${est}" style="${rc ? `--rc:${rc}` : ''}" aria-label="${t('gramatica.estado.aria', { estado: esc(cara.replace(/<[^>]+>/g, ' ')) })}">${cara}</div>`;
}
function stats(l) {
  const p = l.progreso || l, ej = p.ejercicios || {}, tj = p.tarjetas || {};
  const vista = p.vista ? `<b>${t('gramatica.stats.si')}</b><em>${t('gramatica.stats.abierta')}</em>` : `<b>${t('gramatica.stats.aun_no')}</b><em>${t('gramatica.stats.con_calma')}</em>`;
  const ejer = ej.intentos ? `<b>${t('gramatica.stats.mejor', { n: ej.mejor })}</b><em>${tn('gramatica.stats.ultima', ej.intentos, { ultima: ej.ultima })}</em>`
    : `<b>${t('gramatica.stats.sin_hacer')}</b><em>${tn('gramatica.stats.esperan', ej.total || 0)}</em>`;
  const tarj = tj.total ? `<b><span class="gm-dot" style="--rc:${RANGO_COLOR[Math.max(0, tj.rango)]}"></span>${tj.rango_es}</b><em>${tj.pendientes ? tn('gramatica.stats.tarjetas_hoy', tj.total, { hoy: tj.pendientes }) : tn('gramatica.stats.tarjetas', tj.total)}</em>`
    : `<b>${t('gramatica.stats.ninguna')}</b><em>${t('gramatica.stats.nacen')}</em>`;
  return `<div class="gm-stats"><div class="gm-stat ${p.vista ? '' : 'off'}"><small>${t('gramatica.estado.leida')}</small>${vista}</div><div class="gm-stat ${ej.intentos ? '' : 'off'}"><small>${t('gramatica.stats.ejercicios')}</small>${ejer}</div><div class="gm-stat ${tj.total ? '' : 'off'}"><small>${t('gramatica.stats.tarjetas_tit')}</small>${tarj}</div></div>`;
}
function iconoIndice(l) {
  const est = l.estado || (l.hecha ? 'hecha' : 'nueva'), ej = l.ejercicios || {}, tj = l.tarjetas || {};
  if (est === 'repaso') return `<span class="gm-est e-repaso" style="--rc:${RANGO_COLOR[Math.max(0, tj.rango)]}" title="${t('gramatica.indice.repaso', { n: ej.mejor })}">${ej.mejor ?? '✓'}<small>%</small></span>`;
  if (est === 'hecha') return `<span class="gm-est e-hecha" title="${t('gramatica.indice.hecha', { n: ej.mejor })}">${ej.mejor ?? '✓'}<small>%</small></span>`;
  if (est === 'leida') return `<span class="gm-est e-leida" title="${t('gramatica.estado.leida')}">読</span>`;
  return `<span class="gm-est" title="${t('gramatica.estado.nueva')}"></span>`;
}
function htmlIndice(slug) {
  const cap = {};
  indice.forEach((l) => { (cap[l.capitulo] = cap[l.capitulo] || []).push(l); });
  return Object.entries(cap).map(([c, ls]) => {
    const hechas = ls.filter((l) => l.hecha).length;
    return `<section class="gm-cap"><h4>${esc(c)}<span>${hechas}/${ls.length}</span></h4><div class="gm-cap-barra"><i style="width:${(100 * hechas) / ls.length}%"></i></div>
      ${ls.map((l) => `<a href="#gramatica/${l.slug}" data-slug="${l.slug}" class="gm-i ${l.slug === slug ? 'aqui' : ''} ${l.hecha ? 'hecha' : ''}" ${l.slug === slug ? 'aria-current="page"' : ''}><small>${l.orden}</small><span class="t">${esc(sinFurigana(l.titulo))}</span>${iconoIndice(l)}</a>`).join('')}</section>`;
  }).join('');
}
function refrescarIndice({ pop = null } = {}) {
  const ind = $('.indice', V()); if (!ind) return;
  const foco = document.activeElement?.closest?.('.indice a')?.dataset.slug;
  const arriba = ind.scrollTop;
  ind.innerHTML = htmlIndice(slugActual);
  const aqui = $('.indice a.aqui', V());
  rejilla(ind, 'a', { eje: 'lista', inicial: aqui });
  ind.scrollTop = arriba;
  if (foco) $(`.indice a[data-slug="${foco}"]`, V())?.focus({ preventScroll: true });
  const c = $('.cab-papel .contador .gm-hechas', V()); if (c) c.textContent = indice.filter((l) => l.hecha).length;
  if (pop && !quieto()) {
    const est = $(`.indice a[data-slug="${pop}"] .gm-est`, V());
    if (est) gsap.fromTo(est, { scale: 2.2, rotate: -30 }, { scale: 1, rotate: 0, duration: 0.6, ease: 'back.out(3)' });
    gsap.fromTo($$('.gm-cap-barra i', V()), { scaleX: 0.9 }, { scaleX: 1, duration: 0.6, ease: 'elastic.out(1, 0.5)' });
  }
}
function pintarEstado(prog, { golpe = false } = {}) {
  const ficha = $('.gm-ficha', V()); if (!ficha) return;
  lecActual.progreso = prog;
  $('.gm-pegatina', ficha).outerHTML = pegatina(lecActual);
  $('.gm-stats', ficha).outerHTML = stats(lecActual);
  if (golpe && !quieto()) {
    gsap.fromTo($('.gm-pegatina', ficha), { scale: 2, rotate: -25, opacity: 0 }, { scale: 1, rotate: 5, opacity: 1, duration: 0.55, ease: 'back.out(2.6)' });
    gsap.fromTo($$('.gm-stat', ficha), { y: 10 }, { y: 0, duration: 0.5, stagger: 0.06, ease: 'back.out(3)' });
  }
}

// ───────────────────────── navegación ─────────────────────────
function vecinas(slug) {
  const i = indice.findIndex((l) => l.slug === slug);
  return { ant: i > 0 ? indice[i - 1] : null, sig: i >= 0 && i < indice.length - 1 ? indice[i + 1] : null };
}
function irLeccion(paso) {
  const { ant, sig } = vecinas(slugActual), l = paso < 0 ? ant : sig;
  if (!l) { if (!quieto()) gsap.fromTo('.gm-ficha', { x: paso * 10 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' }); return; }
  son.papel(); location.hash = 'gramatica/' + l.slug;
}
function moverIndice(paso) {
  const lista = $$('.indice a', V()); if (!lista.length) return;
  const i = Math.max(0, lista.findIndex((a) => a.classList.contains('aqui')));
  const a = lista[Math.max(0, Math.min(lista.length - 1, i + paso))];
  a.focus({ preventScroll: true }); a.scrollIntoView({ block: 'nearest', behavior: quieto() ? 'auto' : 'smooth' });
}

// monta (o vuelve a montar) la práctica: la primera vez de siempre; al repetir o si ya la hiciste, con variaciones
function montarPractica(lec, variar) {
  const ejs = armar(lec, variar);
  const viejo = $('#gm-practica', V());
  const html = htmlPractica(ejs, variar);
  if (viejo) viejo.outerHTML = html; else $('.gm-sitio-practica', V()).innerHTML = html;
  const sec = $('#gm-practica', V()); if (!sec) return null;
  $('[data-repetir]', sec).onclick = () => pedirRepetir();
  montarEjercicios(sec, ejs, (bien, total) => terminar(lec, bien, total));
  V().__ej = sec.__ej;
  return sec;
}
async function repetir() {
  if (!lecActual) return;
  const slug = slugActual;
  let lec;
  try { lec = await api('/api/gramatica/' + slug); } catch { lec = lecActual; }
  if (slug !== slugActual) return;
  lec.progreso = lec.progreso || lecActual.progreso;
  lecActual = lec; intento = (lec.progreso?.ejercicios?.intentos || 0) + 1;
  son.papel();
  const sec = montarPractica(lec, true);
  if (!sec) return;
  sec.scrollIntoView({ block: 'start', behavior: quieto() ? 'auto' : 'smooth' });
  if (!quieto()) {
    gsap.fromTo(sec, { y: 30, rotate: -0.6 }, { y: 0, rotate: 0, duration: 0.6, ease: 'back.out(2)' });
    gsap.fromTo($$('.ejer', sec), { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.035, delay: 0.15, ease: 'power3.out' });
    gsap.fromTo($$('.gm-pip', sec), { scaleX: 0 }, { scaleX: 1, duration: 0.35, stagger: 0.02, ease: 'back.out(2)' });
  }
  setTimeout(() => sec.__ej?.ir(), quieto() ? 0 : 500);
}
// E o «Repetir» con la práctica a medias: antes de borrar lo hecho, se pregunta
async function pedirRepetir() {
  if (V().__ej?.aMedias?.() && !(await confirmar({ sello: '再', titulo: t('gramatica.repetir.tit'), texto: t('gramatica.repetir.texto'), si: t('gramatica.repetir.si'), no: t('gramatica.repetir.no') }))) return;
  repetir();
}

async function terminar(lec, bien, total) {
  const slug = lec.slug;
  let r;
  try { r = await api('/api/gramatica/' + slug, { aciertos: bien, total }); } catch { flotar(t('gramatica.no_guardado'), innerWidth / 2, innerHeight / 2, 'var(--mal)'); return; }
  if (slug !== slugActual) return;
  const sec = $('#gm-practica', V()), fin = $('.gm-fin', sec);
  const { sig } = vecinas(slug);
  const hanko = pintarFin(fin, r, bien, total, `<button class="boton-claro" data-repetir-fin>↻ ${t('gramatica.fin.repetir')} ${kbd('E')}</button>
      ${sig ? `<button class="boton-tinta" data-sig-fin data-foco title="${esc(sinFurigana(sig.titulo))}">${t('gramatica.fin.siguiente')} ${kbd('Intro')}</button>` : ''}`);
  $('[data-repetir-fin]', fin).onclick = () => repetir();
  const bs = $('[data-sig-fin]', fin); if (bs) bs.onclick = () => irLeccion(1);
  (bs || $('[data-repetir-fin]', fin)).focus({ preventScroll: true });
  volarXP(hanko, r.xp - 5 * bien > 0 ? r.xp - 5 * bien : 0);
  // estado de la lección y del índice
  pintarEstado(r.progreso, { golpe: true });
  lecActual.progreso = r.progreso;
  try { indice = await api('/api/gramatica'); refrescarIndice({ pop: slug }); } catch {}
  const rc = await import('./recompensas.js').catch(() => null);
  if (rc && r.nivel > r.nivel_antes) await rc.celebrarNivel(r.nivel, { bolsas: r.bolsas_ganadas ?? 1, koban: r.koban_ganados ?? 0 });
  rc?.finSesion({ respuestas: 0, aciertos: 0, mejor_racha: 0, lecciones: 0, gramatica: 1 });
}
// el final de la práctica (en la vista y en la hoja de gramática): sello con la nota, logros y XP. Devuelve el sello.
function pintarFin(fin, r, bien, total, acciones) {
  const pct = r.nota ?? Math.round((100 * bien) / Math.max(1, total)), [, kanji, texto] = notaDe(pct);
  fin.innerHTML = `<div class="gm-hanko" aria-hidden="true">${kanji}</div>
    <h3>${t('gramatica.fin.nota', { nota: texto, pct: '<b data-pct>0</b>' })}</h3>
    <div class="gm-logros">${r.primera ? `<span class="gm-logro te">${t('gramatica.fin.completada')}</span>` : ''}${r.record ? `<span class="gm-logro oro">${t('gramatica.fin.record')}</span>` : ''}
      <span class="gm-logro">${t('gramatica.fin.aciertos', { bien, total })}</span><span class="gm-logro oro">+${r.xp} XP</span>
      ${r.tarjetas_nuevas ? `<span class="gm-logro te">${tn('gramatica.fin.tarjetas', r.tarjetas_nuevas)}</span>` : ''}</div>
    <div class="gm-fin-acc">${acciones}</div>`;
  fin.hidden = false;
  fin.scrollIntoView({ block: 'center', behavior: quieto() ? 'auto' : 'smooth' });
  son.fanfarria();
  const hanko = $('.gm-hanko', fin), num = $('[data-pct]', fin);
  if (quieto()) num.textContent = pct;
  else {
    const o = { v: 0 };
    gsap.timeline()
      .fromTo(fin, { y: 40, scale: 0.94, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2)' })
      .fromTo(hanko, { scale: 3, rotate: -60, opacity: 0 }, { scale: 1, rotate: -10, opacity: 1, duration: 0.45, ease: 'back.out(2.2)', onComplete: () => { son.sello(); chispas(hanko, { n: 26, fuerza: 1.6 }); } }, '-=0.1')
      .to(o, { v: pct, duration: 0.9, ease: 'power2.out', onUpdate: () => { num.textContent = Math.round(o.v); } }, '<')
      .fromTo($$('.gm-logro', fin), { y: 14, scale: 0.6, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.4, stagger: 0.08, ease: 'back.out(3)' }, '-=0.5');
    setTimeout(() => chispas($('h3', fin), { n: 18, fuerza: 1.2 }), 650);
  }
  return hanko;
}

async function abrir(slug) {
  estilos();
  const lec = await api('/api/gramatica/' + slug);
  const venia = !!document.activeElement?.closest?.('#v-gramatica .indice');
  slugActual = slug; lecActual = lec;
  const hecha = (lec.progreso?.ejercicios?.intentos || 0) > 0;
  intento = (lec.progreso?.ejercicios?.intentos || 0) + 1;
  const { ant, sig } = vecinas(slug);
  const tus = lec.en_tus_palabras || [];
  V().innerHTML = `<header class="cab-papel"><button class="volver" data-inicio>${t('comun.volver_inicio')} ${kbd('Esc')}</button><div style="display:grid;gap:6px;justify-items:center"><div style="text-align:center;font:600 13px var(--f-texto);color:var(--tinta-2)">${t('gramatica.cab.guia')}</div>
      <div class="gram-teclas">${t('gramatica.cab.teclas', { lecciones: kbd('←') + kbd('→'), indice: kbd('↑') + kbd('↓'), intro: kbd('Intro'), e: kbd('E') })}</div></div>
      <div class="contador"><span class="gm-xp" id="gm-xp" title="${t('gramatica.cab.xp_tit')}">+<b>${xpSesion}</b> XP</span><span>${t('gramatica.cab.hechas', { hechas: `<b class="gm-hechas">${indice.filter((l) => l.hecha).length}</b>`, total: indice.length })}</span></div></header>
    <div class="libro"><nav class="indice" aria-label="${t('gramatica.indice.aria')}">${htmlIndice(slug)}</nav>
    <div><article class="pagina">
      ${LOCAL ? htmlBannerClase() : ''}
      <div class="gm-ficha">${pegatina(lec)}<div class="eyebrow">${t('gramatica.leccion.eyebrow', { capitulo: esc(lec.capitulo || ''), orden: lec.orden })}</div>
        <h1>${ruby(lec.titulo)}</h1><p class="resumen">${textoRico(lec.resumen || '')}</p>${stats(lec)}
        ${(lec.ejercicios || []).length ? `<div class="gm-acciones"><button class="boton-tinta" data-a-practica>${hecha ? t('gramatica.leccion.ir_practica') : t('gramatica.leccion.leer')} ${kbd('Intro')}</button>${hecha ? `<button class="boton-claro" data-repetir-top>↻ ${t('gramatica.leccion.repetir')} ${kbd('E')}</button>` : ''}${botonFichasLeccion(lec)}</div>` : ''}</div>
      ${cuerpo(lec, tus, true)}
      <div class="gm-sitio-practica"></div>
      <p style="margin-top:40px;font-size:12px;color:var(--tinta-2)">${esc(lec.fuente || '')}</p></article>
      <nav class="gram-pie" aria-label="${t('gramatica.pie.aria')}">${ant ? `<a href="#gramatica/${ant.slug}">${kbd('←')}<span><small>${t('gramatica.pie.anterior')}</small>${esc(sinFurigana(ant.titulo))}</span></a>` : ''}${sig ? `<a class="sig" href="#gramatica/${sig.slug}"><span><small>${t('gramatica.pie.siguiente')}</small>${esc(sinFurigana(sig.titulo))}</span>${kbd('→')}</a>` : ''}</nav></div></div>`;
  $('[data-inicio]', V()).onclick = () => { location.hash = 'inicio'; };
  const ind = $('.indice', V()), aqui = $('.indice a.aqui', V());
  rejilla(ind, 'a', { eje: 'lista', inicial: aqui });
  if (aqui) ind.scrollTop = Math.max(0, aqui.offsetTop - ind.clientHeight / 2);
  if (venia) aqui?.focus({ preventScroll: true });
  montarPractica(lec, hecha);
  if (!V().__fichas) { V().__fichas = true; montarFichas(); }
  $('[data-a-practica]', V())?.addEventListener('click', (e) => {
    V().__ej?.ir() || $('#gm-practica', V())?.scrollIntoView({ block: 'start', behavior: quieto() ? 'auto' : 'smooth' });
    if (document.activeElement === e.currentTarget) e.currentTarget.blur(); // la vista baja al ejercicio: el foco no se queda en un botón que ya no se ve
  });
  $('[data-repetir-top]', V())?.addEventListener('click', () => pedirRepetir());
  V().scrollTo(0, 0);
  if (!quieto()) {
    const ficha = $('.gm-ficha', V());
    gsap.timeline()
      .fromTo(ficha, { y: 40, rotate: -1.2, scale: 0.97, opacity: 0 }, { y: 0, rotate: 0, scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(1.8)' })
      .fromTo($('.gm-pegatina', ficha), { scale: 2.2, rotate: -30, opacity: 0 }, { scale: 1, rotate: 5, opacity: 1, duration: 0.45, ease: 'back.out(2.6)' }, '-=0.25')
      .fromTo($$('.gm-stat, .gm-acciones > *', ficha), { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease: 'back.out(2.4)' }, '-=0.3');
    gsap.fromTo($$('.pagina > section, .pagina > .gm-sitio-practica', V()).slice(0, 4), { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.06, delay: 0.2, ease: 'power3.out' });
  }
  // la has abierto: pasa a «leída» (con su pegatina) si era nueva
  if (!lec.progreso?.vista) {
    api(`/api/gramatica/${slug}/vista`, {}).then((v) => {
      if (slug !== slugActual) return;
      const l = indice.find((x) => x.slug === slug); if (l) { l.vista = v.vista; if (l.estado === 'nueva') l.estado = 'leida'; }
      const prog = { ...lec.progreso, vista: v.vista, estado: lec.progreso?.estado === 'nueva' ? 'leida' : lec.progreso?.estado };
      setTimeout(() => { if (slug !== slugActual) return; pintarEstado(prog, { golpe: true }); refrescarIndice({ pop: slug }); son.toque(); }, quieto() ? 0 : 1100);
    }).catch(() => {});
  }
}

export async function abrirHojaGramatica(slug) {
  estilos();
  let lec;
  try { lec = await api('/api/gramatica/' + slug); } catch { flotar(t('gramatica.hoja.sin'), innerWidth / 2, innerHeight / 2, 'var(--t-gram)'); return; }
  const capa = document.createElement('div');
  capa.className = 'hoja-gram'; capa.setAttribute('role', 'dialog'); capa.setAttribute('aria-modal', 'true'); capa.setAttribute('aria-label', sinFurigana(lec.titulo) || t('gramatica.hoja.aria'));
  capa.tabIndex = -1; capa.setAttribute('data-foco-capa', '');
    const ejs = armar(lec, (lec.progreso?.ejercicios?.intentos || 0) > 0);
  capa.innerHTML = `<div style="position:sticky;top:0;display:flex;justify-content:flex-end;z-index:2"><button class="volver" id="cerrar-g">${t('comun.cerrar')} ${kbd('Esc')}</button></div>` + htmlLeccion(lec, ejs);
  document.body.appendChild(capa);
  // al terminar, como en la vista: nota, XP a la barra de debajo, misiones y bolsa
  montarEjercicios(capa, ejs, async (bien, total) => {
    let r;
    try { r = await api('/api/gramatica/' + slug, { aciertos: bien, total }); } catch { flotar(t('gramatica.no_guardado'), innerWidth / 2, innerHeight / 2, 'var(--mal)'); return; }
    if (!capa.isConnected) return;
    const fin = $('.gm-fin', capa);
    const hanko = pintarFin(fin, r, bien, total, `<button class="boton-tinta" data-cerrar-fin data-foco>${t('gramatica.hoja.seguir')} ${kbd('Intro')}</button>`);
    const b = $('[data-cerrar-fin]', fin); b.onclick = cerrar; b.focus({ preventScroll: true });
    const rc = await import('./recompensas.js').catch(() => null);
    rc?.xpVuela(hanko, r.xp, r.xp_total);
    if (rc && r.nivel > r.nivel_antes) await rc.celebrarNivel(r.nivel, { bolsas: r.bolsas_ganadas ?? 1, koban: r.koban_ganados ?? 0 });
    rc?.finSesion({ respuestas: 0, aciertos: 0, mejor_racha: 0, lecciones: 0, gramatica: 1 });
  });
  api(`/api/gramatica/${slug}/vista`, {}).catch(() => {});
  if (quieto()) gsap.fromTo(capa, { opacity: 0 }, { opacity: 1, duration: 0.2 }); else gsap.fromTo(capa, { x: '100%' }, { x: '0%', duration: 0.6, ease: 'power3.out' });
  son.papel();
  let cerrada = false;
  const cerrar = () => {
    if (cerrada) return; cerrada = true; removeEventListener('keydown', tecla, true);
    gsap.to(capa, quieto() ? { opacity: 0, duration: 0.15, onComplete: () => capa.remove() } : { x: '105%', duration: 0.45, ease: 'power3.in', onComplete: () => capa.remove() });
  };
  // la hoja se queda con sus teclas: nada se cuela a la lámina ni al repaso de debajo (Tab lo atrapa teclado.js)
  const tecla = (e) => {
    if (!capa.isConnected) { removeEventListener('keydown', tecla, true); return; }
    if (e.key === 'Tab' || capaAbierta() !== capa) return;
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Escape') { e.preventDefault(); cerrar(); return; }
    if (escribiendo(e)) return; // en una casilla de conjugar, Intro envía
    const ctl = capa.__ej, k = e.key;
    if (/^[1-9]$/.test(k)) { if (ctl?.numero(+k)) e.preventDefault(); }
    else if (k === 'Backspace') { if (ctl?.quitar()) e.preventDefault(); }
    else if (k === 'Enter' && (!sobreControl(e) || e.target.readOnly)) { e.preventDefault(); if ($('.gm-fin:not([hidden])', capa)) cerrar(); else ctl?.ir(); }
    else desplazar(e, capa);
  };
  $('#cerrar-g', capa).onclick = cerrar; addEventListener('keydown', tecla, true);
}

// teclado de la vista (la hoja de gramática lleva el suyo, en abrirHojaGramatica)
addEventListener('keydown', (e) => {
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
  if (!V()?.classList.contains('activa') || capaAbierta()) return;
  if (escribiendo(e)) return; // en una casilla de conjugar, Intro envía
  const k = e.key, enIndice = !!e.target.closest?.('.indice');
  // Intro sobre la lección que ya está abierta en el índice: a practicar (si no, Intro se quedaba abriendo la misma lección)
  if (k === 'Enter' && enIndice && e.target.closest?.('a')?.classList.contains('aqui')) {
    e.preventDefault();
    const cta = $('[data-a-practica]', V());
    if (cta) { cta.focus({ preventScroll: true }); cta.click(); } else V().__ej?.ir();
    return;
  }
  if ((k === 'ArrowLeft' || k === 'ArrowRight') && !enIndice) { e.preventDefault(); irLeccion(k === 'ArrowLeft' ? -1 : 1); return; }
  if ((k === 'ArrowUp' || k === 'ArrowDown') && !enIndice) { e.preventDefault(); moverIndice(k === 'ArrowUp' ? -1 : 1); return; }
  if ((k === 'e' || k === 'E') && !e.repeat) { e.preventDefault(); pedirRepetir(); return; }
  const ctl = V().__ej;
  if (!ctl) return;
  if (/^[1-9]$/.test(k)) { if (ctl.numero(+k)) e.preventDefault(); return; }
  if (k === 'Backspace') { if (ctl.quitar()) e.preventDefault(); return; }
  if (k === 'Enter' && (!sobreControl(e) || e.target.readOnly)) { // también desde una casilla ya respondida
    const fin = $('#gm-practica .gm-fin:not([hidden])', V());
    if (fin) { e.preventDefault(); ($('[data-sig-fin]', fin) || $('[data-repetir-fin]', fin))?.click(); return; }
    if (ctl.ir()) e.preventDefault();
  }
});

registrar('gramatica', {
  seccion: '#v-gramatica',
  async entrar([slug]) {
    estilos();
    // con el motor JS (la app empaquetada), Gramática son las clases de Nyan; las lecciones de antes quedan como consulta
    if (LOCAL && !slug) { slugActual = null; await pintarIndiceClases(V()); return; }
    indice = await api('/api/gramatica');
    if (!indice.length) { V().innerHTML = `<header class="cab-papel"><button class="volver" data-inicio>${t('comun.volver_inicio')} ${kbd('Esc')}</button></header><p class="vacio-papel">${t('gramatica.vacio')}</p>`; $('[data-inicio]', V()).onclick = () => { location.hash = 'inicio'; }; return; }
    await abrir(slug || (indice.find((l) => !l.hecha && l.orden > 3) || indice[0]).slug);
  },
  actualizar([slug]) {
    if (slug && !slugActual && LOCAL) { this.entrar([slug]); return; }
    if (slug) abrir(slug); else if (LOCAL) { slugActual = null; pintarIndiceClases(V()); }
  },
  contexto: () => 'gramatica',
});
