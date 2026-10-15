// 妖怪退治 · el camino de las regiones con su yōkai y la batalla contra el jefe
// Ruta «camino» (sustituye a la de perfil.js) y ruta «jefe/<región>». Todo el estilo vive aquí: la vista #v-jefe es nuestra.
// La batalla es práctica: no toca la memoria FSRS (nunca llama a /api/responder).
import { gsap } from 'gsap';
import './perfil.js'; // se evalúa antes que este módulo: así nuestro «camino» pisa al suyo
import { t, tn, idioma } from './i18n.js';
import { $, $$, api, registrar, espera, estado, mil } from './app.js';
import { kbd, sobreControl, capaAbierta, rejilla } from './teclado.js';
import { encajar } from './encaje.js';
import { kageDice, momentoCamino } from './kage.js';   // Kage, el rival (30-09)
import { vestirMochi } from './recompensas.js';
import { Mascota } from './mascota.js';
import * as son from './sonido.js';
import { esc, aKana, normLectura, compararSignificado, negrita } from './japones.js';

const V = () => $('#v-jefe');
const SUAVE = matchMedia('(prefers-reduced-motion: reduce)').matches;
const rnd = (a, b) => a + Math.random() * (b - a);
const elegir = (l) => l[Math.floor(Math.random() * l.length)];
const sonar = (f, ...a) => { try { son[f]?.(...a); } catch {} };

// color de cada yōkai (aura, rayos, medalla)
const TONO = { kappa: '#4f9a78', tanuki: '#a0703f', karakasa: '#8f5cc0', nekomata: '#e0869f', rokurokubi: '#9d7fd0', tengu: '#d8412a', kitsune: '#f2a83a', yukionna: '#7fb9e0', oni: '#e2553a', ryu: '#3f6fb8' };
const RAREZA = { comun: [t('recompensas.rareza.comun'), '#9c8a55', 'var(--tinta-3)'], raro: [t('recompensas.rareza.raro'), '#3f7fc4', 'var(--r1)'], epico: [t('recompensas.rareza.epico'), '#9b4fc9', 'var(--t-gram)'], legendario: [t('recompensas.rareza.legendario'), '#f2a114', 'var(--aviso)'] };   // [nombre, color del efecto en el canvas (arte), color de la interfaz (sigue al tema)]
// multiplicadores con los decimales del idioma (×1,25 · ×1.25)
const dec = (x) => Number(x).toLocaleString(idioma === 'es' ? 'es-ES' : 'en-US', { maximumFractionDigits: 2 });
const tono = (j) => TONO[j?.id] || '#c07a3a';

// ───────────────────────── estilo ─────────────────────────
const ruido = (f, o, a, semilla = 3, r = 0.24, g = 0.17, b = 0.08) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='360' height='360'><filter id='n' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='${f}' numOctaves='${o}' seed='${semilla}' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 ${r}  0 0 0 0 ${g}  0 0 0 0 ${b}  ${a * 2.2} 0 0 0 ${-a * 0.9}'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`)}")`;
const GRANO = ruido(0.9, 2, 0.16, 7);
const MANCHAS = ruido(0.008, 4, 0.5, 11);
const GRUMOS = ruido(0.045, 3, 0.28, 5);
const W = ':where(#v-jefe)'; // especificidad baja: las reglas de cada pieza mandan sobre las genéricas

const CSS = `
#v-jefe{--yeso:#8e7747;--yeso-os:#6a5733;--yeso-luz:#b09a63;--tatami:#c2b27a;--tatami-2:#a8965e;--madera:#6f4c30;--madera-2:#94693f;  /* arte: la sala detrás de la foto */
  --luz:#f7efdf;--oro-luz:#f2b43a;--tinta-arte:#261f19;  /* arte: letras y tinta de lo que va sobre la escena (siempre oscura, en cualquier tema) */
  --muelle-j:var(--muelle);
  background:var(--yeso);color:var(--tinta);font:16px/1.45 var(--f-texto);overflow:hidden}
${W} *{box-sizing:border-box}
${W} button{font:inherit;color:inherit;cursor:pointer}
@keyframes bj-latido{0%,100%{filter:brightness(1)}50%{filter:brightness(1.35)}}
@keyframes bj-lineas{to{background-position:-140px 0}}
@keyframes bj-gira{to{transform:rotate(360deg)}}
@keyframes bj-tiembla{0%,100%{transform:translate(0,0)}25%{transform:translate(-2px,1px)}50%{transform:translate(2px,-1px)}75%{transform:translate(-1px,-2px)}}
@keyframes bj-flota{0%,100%{transform:translateY(0) rotate(-1.5deg)}50%{transform:translateY(-8px) rotate(1.5deg)}}
@keyframes bj-pulso{0%{box-shadow:inset 0 0 0 6px var(--tono,var(--acento)),var(--sombra),0 0 0 0 color-mix(in srgb,var(--tono,var(--acento)) 55%,transparent)}100%{box-shadow:inset 0 0 0 6px var(--tono,var(--acento)),var(--sombra),0 0 0 24px transparent}}

/* piezas de vinilo */
/* piezas: superficies planas del tema (sobre la escena llevan una sombra algo más profunda) */
${W} .ficha{position:relative;background:var(--sup);border:var(--borde);border-radius:var(--radio);color:var(--tinta);box-shadow:var(--sombra-flotante)}
${W} .pop{font-family:var(--f-titulo);font-weight:var(--peso-titulo);color:var(--acento);-webkit-text-stroke:var(--trazo,10px) var(--luz);paint-order:stroke fill;
  text-shadow:0 calc(var(--hondo,6px) * .6) calc(var(--hondo,6px) * 2) color-mix(in srgb,var(--tinta-arte) 38%,transparent);letter-spacing:.01em}
${W} .pegatina{--c:var(--acento);display:inline-flex;align-items:center;gap:8px;padding:4px 12px;border-radius:var(--radio-btn);font:700 12.5px/20px var(--f-texto);letter-spacing:.03em;color:color-mix(in srgb,var(--c) 50%,var(--tinta));
  background:color-mix(in srgb,var(--c) 16%,var(--sup));box-shadow:inset 0 0 0 2px var(--c),var(--sombra-peq);transform:rotate(-4deg);white-space:nowrap}
${W} .pegatina.anil{--c:var(--t-kanji)} ${W} .pegatina.te{--c:var(--bien)} ${W} .pegatina.tinta{--c:var(--tinta-2)} ${W} .pegatina.oro{--c:var(--aviso)}
${W} .bj-boton{display:inline-flex;align-items:center;justify-content:center;gap:12px;border:0;border-radius:var(--radio-btn);min-height:48px;padding:12px 24px;font:700 17px/1.2 var(--f-texto);letter-spacing:.01em;color:var(--boton-tinta);
  background:var(--boton);box-shadow:var(--sombra-btn);transition:transform .15s var(--suave),filter .15s var(--suave);white-space:nowrap}
${W} .bj-boton:hover{transform:translateY(-2px);filter:brightness(1.06)}
${W} .bj-boton:active{transform:translateY(2px);filter:none}
${W} .bj-boton.claro{background:var(--sup);color:var(--tinta);border:var(--borde);box-shadow:var(--sombra-peq)}
${W} .bj-boton.claro:hover{background:var(--sup-2);filter:none}
${W} .bj-boton.claro:active{transform:translateY(2px)}
${W} .bj-boton.peq{min-height:40px;padding:8px 16px;font-size:14px}
${W} .ficha .pop{-webkit-text-stroke-color:var(--sup)}
${W} .bj-boton:focus-visible{outline:3px solid var(--acento);outline-offset:3px}
${W} .bj-boton kbd{font:700 11px var(--f-texto);opacity:.8}
${W} .bj-boton .k{font:var(--peso-titulo) 20px/1 var(--f-titulo)}
${W} .bj-boton.peq .k{font-size:16px}

/* ── escenario de la batalla: la habitación de Mochi ── */
.bj{position:absolute;inset:0;overflow:hidden;user-select:none;-webkit-user-select:none}
.bj-mundo{position:absolute;inset:-2.5%;will-change:transform}
/* 30-09 · el camino de los yōkai y sus peleas, en una foto real (Gion al anochecer, con lluvia) en vez de la sala dibujada */
.bj-pared{background:#1c2430 url(/img/escenarios/noche-grande.webp) 50% 62%/cover no-repeat!important}
.bj-pared::before{display:none!important}.bj-zocalo,.bj-suelo{display:none!important}
.bj-pared{position:absolute;inset:0;background-color:var(--yeso);
  background-image:radial-gradient(58% 60% at 50% 34%,rgba(226,200,138,.58),rgba(226,200,138,0) 72%),${MANCHAS},${GRUMOS},${GRANO},linear-gradient(180deg,#76623a 0%,#8e7747 42%,#6a5733 100%)}
.bj-pared::after{content:"";position:absolute;inset:0;background:radial-gradient(120% 90% at 50% 38%,rgba(0,0,0,0) 55%,rgba(38,24,8,.55) 100%)}
.bj-luz{position:absolute;left:50%;top:6%;width:900px;height:640px;margin-left:-450px;border-radius:50%;pointer-events:none;
  background:radial-gradient(closest-side,var(--aura,rgba(255,220,150,.5)),rgba(0,0,0,0));mix-blend-mode:soft-light;opacity:.9}
.bj-zocalo{position:absolute;left:0;right:0;bottom:36%;height:14px;background:linear-gradient(180deg,#9a7045,#6f4c30 60%,#4d3420);box-shadow:0 3px 8px rgba(30,18,6,.45)}
.bj-suelo{position:absolute;left:0;right:0;bottom:0;height:36%;overflow:hidden;perspective:520px;perspective-origin:50% -10%}
.bj-tatami{position:absolute;left:-80%;right:-80%;top:0;height:360%;transform-origin:50% 0;transform:rotateX(64deg);
  background-color:var(--tatami);
  background-image:linear-gradient(90deg,rgba(0,0,0,0) calc(50% - 44px),#4c3420 calc(50% - 44px),#6f4c30 calc(50% - 40px),#7d5634 calc(50% - 20px),#3b2818 calc(50% - 20px),#3b2818 calc(50% - 15px),#7d5634 calc(50% - 15px),#7d5634 calc(50% + 15px),#3b2818 calc(50% + 15px),#3b2818 calc(50% + 20px),#7d5634 calc(50% + 20px),#6f4c30 calc(50% + 40px),#4c3420 calc(50% + 44px),rgba(0,0,0,0) calc(50% + 44px)),
    linear-gradient(180deg,#5b5a34 0 22px,rgba(0,0,0,0) 22px),
    repeating-linear-gradient(180deg,rgba(96,78,36,.16) 0 2px,rgba(0,0,0,0) 2px 7px),
    repeating-linear-gradient(90deg,rgba(0,0,0,0) 0 520px,rgba(80,64,30,.35) 520px 524px),${GRANO}}
.bj-suelo::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(38,24,8,.45),rgba(38,24,8,0) 30%,rgba(38,24,8,0) 70%,rgba(38,24,8,.35))}
.bj-atrezo{position:absolute;pointer-events:none;filter:blur(7px)}
.bj-atrezo.geta{right:-40px;bottom:-30px;width:300px;height:170px}
.bj-atrezo.nigiri{right:6%;bottom:-70px;width:250px;height:180px;filter:blur(9px)}
.bj-atrezo.taza{left:30%;bottom:34.5%;width:90px;height:70px;filter:blur(2.2px);opacity:.9}

.bj-jefe{position:absolute;left:50%;bottom:34.5%;width:min(47vh,440px);aspect-ratio:1;margin-left:calc(min(47vh,440px) / -2);--tono:#c07a3a}
.bj-aura{position:absolute;inset:-18%;border-radius:50%;background:radial-gradient(closest-side,color-mix(in srgb,var(--tono) 60%,rgba(255,255,255,0)),rgba(0,0,0,0));opacity:.55;mix-blend-mode:screen;transition:opacity .4s}
.bj-jefe.carga .bj-aura{background:radial-gradient(closest-side,rgba(216,65,42,.85),rgba(0,0,0,0));opacity:.8;animation:bj-latido .5s infinite}
.bj-escala,.bj-golpe,.bj-tiemblo,.bj-flota,.bj-cuerpo{position:absolute;inset:0}
.bj-escala{transform-origin:50% 96%}
.bj-golpe{transform-origin:50% 90%}
.bj-jefe.carga .bj-tiemblo{animation:bj-tiembla .09s infinite}
.bj-cuerpo{transform-origin:50% 95%;filter:drop-shadow(0 14px 10px rgba(38,24,8,.28))}
.bj-cuerpo svg{width:100%;height:100%;display:block;overflow:visible}
.bj-sombra{position:absolute;left:20%;right:20%;bottom:0;height:9%;border-radius:50%;background:radial-gradient(closest-side,rgba(40,24,8,.6),rgba(40,24,8,0))}
.bj-tajos{position:absolute;inset:-10%;width:120%;height:120%;overflow:visible;pointer-events:none}
/* arte: la bruma y el aura del yōkai quedan; el bocadillo es interfaz */
.bj-bocadillo{position:absolute;right:78%;top:6%;padding:12px 16px;border-radius:var(--radio);background:var(--sup);border:var(--borde);font:700 17px/1.25 var(--f-texto);color:var(--tinta);white-space:nowrap;
  box-shadow:var(--sombra-flotante);transform-origin:100% 100%;opacity:0;z-index:3}
.bj-bocadillo::before{content:"";position:absolute;right:16px;bottom:-13px;border-left:9px solid transparent;border-right:9px solid transparent;border-top:15px solid var(--sup)}
.bj-mochi{position:absolute;left:1%;bottom:0;width:320px;height:360px;transform-origin:50% 90%;pointer-events:none}

/* HUD */
.bj-hud{position:absolute;left:0;right:0;top:0;z-index:6;display:flex;align-items:flex-start;gap:16px;padding:20px 22px;pointer-events:none}
.bj-hud>*{pointer-events:auto}
.bj-placa{display:grid;grid-template-columns:auto 1fr;column-gap:14px;align-items:center;width:min(540px,46vw);padding:12px 18px 16px 14px}
.bj-placa .jp{grid-row:span 2;display:grid;place-items:center;min-width:72px;height:72px;padding:0 12px;border-radius:var(--radio-peq);background:var(--tono,var(--acento));font:var(--peso-titulo) 34px/1 var(--f-titulo);color:var(--luz);
  -webkit-text-stroke:6px var(--tinta-arte);paint-order:stroke fill}
.bj-placa .jp.largo{font-size:21px}
.bj-placa .nombre{display:flex;align-items:baseline;gap:12px;font:700 21px/1.2 var(--f-texto);min-width:0}
.bj-placa .nombre span{flex:none;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bj-placa .nombre small{min-width:0;overflow:hidden;text-overflow:ellipsis;font:600 12px var(--f-texto);color:var(--tinta-2);letter-spacing:.04em;white-space:nowrap}
.bj-vida{position:relative;height:24px;margin-top:8px;border-radius:12px;background:var(--sup-3);box-shadow:inset 0 0 0 2px var(--linea-2);overflow:hidden}
.bj-vida i{position:absolute;left:0;top:0;bottom:0;width:100%;border-radius:inherit}
.bj-vida .fantasma{background:color-mix(in srgb,var(--aviso) 45%,var(--sup))}
.bj-vida .llena{background:var(--acento)}
.bj-vida .marcas{position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 calc(10% - 2px),color-mix(in srgb,var(--tinta) 22%,transparent) calc(10% - 2px) 10%)}
.bj-vida .brillo{position:absolute;inset:0;background:color-mix(in srgb,var(--aviso) 30%,white);opacity:0}
.bj-vida b{position:absolute;right:8px;top:50%;transform:translateY(-52%);padding:2px 8px;border-radius:99px;background:var(--sup);font:700 13px/16px var(--f-texto);font-variant-numeric:tabular-nums;color:var(--tinta)}
.bj-vida.critica .llena{background:var(--mal);animation:bj-latido .7s infinite}
.bj-hud .hueco{flex:1}
.bj-yo{display:flex;flex-direction:column;align-items:flex-end;gap:10px;padding:12px 16px 14px}
.bj-yo .fila{display:flex;align-items:center;gap:10px}
.bj-yo .etq{font:700 12px var(--f-texto);letter-spacing:.14em;text-transform:uppercase;color:var(--tinta-2)}
.bj-corazones{display:flex;gap:4px}
.bj-corazon{position:relative;width:40px;height:38px}
.bj-corazon svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.bj-ki{display:flex;gap:5px}
.bj-ki i{width:18px;height:18px;border-radius:50%;background:var(--sup-3);box-shadow:inset 0 0 0 2px var(--linea-2)}
.bj-ki i.on{background:var(--acento);box-shadow:none}
.bj-ki.listo i.on{animation:bj-latido .6s infinite;background:var(--aviso)}
.bj-ki-t{font:var(--peso-titulo) 13px/1 var(--f-titulo);color:var(--tinta)}

.bj-combo{position:absolute;right:3.2%;top:30%;z-index:6;text-align:center;pointer-events:none;opacity:0;transform-origin:50% 60%}
.bj-combo b{display:block;font-size:104px;line-height:1;--trazo:14px;--hondo:8px}
.bj-combo span{display:block;margin-top:8px;font:700 17px/1 var(--f-texto);color:var(--luz);letter-spacing:.06em;text-shadow:0 2px 0 rgba(38,31,25,.55)}
.bj-combo em{display:inline-block;margin-top:12px;padding:6px 12px;border-radius:999px;background:var(--tinta-arte);color:var(--oro-luz);font:700 18px/1 var(--f-texto);font-style:normal;box-shadow:0 0 0 3px var(--luz)}

/* pregunta */
.bj-pregunta{position:absolute;left:50%;bottom:24px;width:min(620px,calc(100% - 32px));margin-left:calc(min(620px,calc(100% - 32px)) / -2);z-index:6;perspective:900px}
.bj-carta{padding:24px 28px 20px;text-align:center;border-radius:var(--radio);transform-origin:50% 100%}
.bj-carta>.pegatina{position:absolute;left:-8px;top:-15px;font-size:14px;padding:7px 14px 8px}
.bj-carta .tipo{position:absolute;left:24px;top:22px;font:700 11px var(--f-texto);letter-spacing:.16em;text-transform:uppercase;color:var(--tinta-2)}
.bj-palabra{font:600 84px/1.1 var(--f-jp);color:var(--tinta);margin:12px 0 0;letter-spacing:.02em}
.bj-palabra.media{font-size:64px}.bj-palabra.larga{font-size:46px}
.bj-pista{font:600 13.5px/1.4 var(--f-texto);color:var(--tinta-2);margin-top:4px}
.bj-form{display:flex;gap:10px;margin-top:16px}
.bj-form input{flex:1;min-width:0;height:60px;border:1.5px solid var(--linea-2);border-radius:var(--radio-peq);padding:0 20px;font:600 25px var(--f-jp);color:var(--tinta);background:var(--sup-2);
  outline:none;transition:background-color .2s var(--suave),border-color .2s var(--suave),color .2s var(--suave)}
.bj-form input:focus{border-color:var(--acento);box-shadow:0 0 0 3px var(--acento-suave)}
.bj-form input::placeholder{color:var(--tinta-3)}
.bj-form input.bien{background:var(--bien-suave);color:var(--tinta);border-color:var(--bien)}
.bj-form input.mal{background:var(--mal-suave);color:var(--tinta);border-color:var(--mal)}
.bj-form .bj-boton{height:60px;border-radius:var(--radio-peq);padding:0 24px}
.bj-ayuda{margin-top:12px;font:500 12.5px var(--f-texto);color:var(--tinta-2)}
.bj-ayuda kbd{font:700 11px var(--f-texto);padding:2px 8px;border-radius:6px;background:var(--sup-3);color:var(--tinta-2)}
.bj-anillo{position:absolute;right:-22px;top:-30px;width:88px;height:88px;border-radius:50%;background:var(--sup);box-shadow:var(--sombra-flotante)}
.bj-anillo svg{position:absolute;inset:0;width:100%;height:100%;transform:rotate(-90deg)}
.bj-anillo b{position:absolute;inset:0;display:grid;place-items:center;font:700 28px/1 var(--f-texto);font-variant-numeric:tabular-nums;color:var(--tinta)}
  .bj-anillo .pista{stroke:var(--sup-3)}
.bj-anillo .prog{stroke:var(--acento);transition:stroke .3s}
.bj-anillo.prisa .prog{stroke:var(--mal)}
.bj-anillo.prisa b{color:var(--mal-txt)}
.bj-solucion{display:none;margin-top:16px;padding:12px 16px;border-radius:var(--radio-peq);background:var(--sup-2);text-align:left;overflow:hidden}
.bj-solucion.si{display:block}
.bj-solucion .linea{font:600 15px var(--f-texto);color:var(--tinta-2)}
.bj-solucion .linea b{font:600 30px var(--f-jp);color:var(--acento-tinta);margin-left:8px}
.bj-solucion .linea b.es{font:700 26px var(--f-texto)}
.bj-solucion p{margin:8px 0 0;font:500 15px/1.5 var(--f-texto);color:var(--tinta)}
.bj-solucion p b{color:var(--acento-tinta)}
.bj-sello{position:absolute;right:26px;top:20px;width:92px;height:92px;border-radius:var(--radio-peq);border:5px solid var(--mal);color:var(--mal);display:grid;place-items:center;
  font:var(--peso-titulo) 54px/1 var(--f-titulo);transform:rotate(-12deg);opacity:0;pointer-events:none;background:color-mix(in srgb,var(--sup) 70%,transparent)}
.bj-tiempo{position:absolute;left:0;right:0;top:-14px;text-align:center;font-size:44px;line-height:1;--trazo:10px;opacity:0;white-space:nowrap;pointer-events:none}

/* efectos */
.bj-lienzo{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:7}
.bj-fx{position:absolute;inset:0;pointer-events:none;z-index:8;overflow:hidden}
.bj-destello{position:absolute;inset:0;background:#fff8e6;opacity:0;pointer-events:none;z-index:9}
.bj-vineta{position:absolute;inset:0;pointer-events:none;z-index:9;opacity:0;background:radial-gradient(ellipse at center,rgba(216,65,42,0) 42%,rgba(216,65,42,.8) 100%)}
.bj-zarpazo{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:9;overflow:visible}
.bj-dano{position:absolute;left:0;top:0;font-size:70px;line-height:1;--trazo:12px;--hondo:7px;white-space:nowrap;pointer-events:none;color:var(--luz);-webkit-text-stroke:12px var(--tinta-arte);text-shadow:0 7px 0 var(--tinta-arte),0 16px 22px rgba(38,31,25,.35)}
.bj-dano.crit{color:var(--oro-luz);font-size:96px}
.bj-dano.esp{color:var(--acento);font-size:124px;-webkit-text-stroke:15px var(--luz);text-shadow:0 9px 0 rgba(38,31,25,.4),0 22px 30px rgba(38,31,25,.4)}
.bj-dano small{display:block;font:700 22px/1 var(--f-texto);-webkit-text-stroke:0;text-shadow:0 2px 0 var(--tinta-arte),0 0 12px rgba(38,31,25,.5);color:var(--luz);text-align:center;margin-bottom:6px;letter-spacing:.06em}
.bj-rotulo{position:absolute;left:50%;top:44%;font-size:64px;line-height:1;white-space:nowrap;pointer-events:none;--trazo:12px;--hondo:7px;text-align:center}
.bj-rotulo small{display:block;text-align:center;font:700 20px/1 var(--f-texto);color:var(--luz);-webkit-text-stroke:0;text-shadow:0 2px 0 rgba(38,31,25,.6);margin-top:10px;letter-spacing:.04em}
.bj-corte{position:absolute;left:-12%;right:-12%;top:36%;height:200px;z-index:10;transform:skewY(-7deg);background:var(--acento);overflow:hidden;
  box-shadow:0 0 0 9px var(--luz),0 0 0 14px var(--tinta-arte),0 30px 60px rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;gap:40px}
.bj-corte::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(90deg,rgba(255,255,255,.22) 0 3px,rgba(0,0,0,0) 3px 70px);animation:bj-lineas .2s linear infinite}
.bj-corte .txt{position:relative;transform:skewY(7deg);text-align:center}
.bj-corte b{display:block;font:var(--peso-titulo) 96px/1 var(--f-titulo);color:var(--luz);-webkit-text-stroke:14px var(--tinta-arte);paint-order:stroke fill;text-shadow:0 8px 0 var(--tinta-arte)}
.bj-corte span{display:block;margin-top:12px;font:700 22px/1 var(--f-texto);color:var(--tinta-arte);letter-spacing:.12em;text-transform:uppercase}
.bj-corte .kat{position:relative;transform:skewY(7deg);font:var(--peso-titulo) 150px/1 var(--f-titulo);color:var(--tinta-arte);opacity:.18}

/* intro y final */
.bj-presenta{position:absolute;left:50%;top:40%;z-index:10;text-align:center;pointer-events:none;width:min(760px,92%);margin-left:calc(min(760px,92%) / -2)}
.bj-presenta .region{display:inline-flex;font-size:15px;padding:8px 16px 9px}
.bj-presenta .jp{display:block;font-size:clamp(70px,11vw,150px);line-height:1.05;margin-top:18px;--trazo:16px;--hondo:10px}
.bj-presenta .nombre{display:block;margin-top:8px;font:700 40px/1.15 var(--f-texto);color:var(--luz);text-shadow:0 3px 0 rgba(38,31,25,.55),0 12px 26px rgba(38,31,25,.4)}
.bj-presenta .desc{display:inline-block;max-width:560px;margin-top:16px;padding:12px 20px;border-radius:var(--radio-peq);background:rgba(38,31,25,.6);color:var(--luz);font:500 16px/1.5 var(--f-texto)}
.bj-velo{position:absolute;inset:0;z-index:9;background:radial-gradient(ellipse at center,rgba(38,24,8,.15),rgba(38,24,8,.72));opacity:0;pointer-events:none}
.bj-final{position:absolute;inset:0;z-index:12;display:grid;place-items:center;padding:24px;overflow:auto}
.bj-final .panel{width:min(620px,100%);padding:24px 32px;text-align:center;border-radius:var(--radio)}
.bj-final .panel>*:not(.bj-premio):not(.bj-perfecto){position:relative;z-index:1}
.bj-final .titulo{font-size:clamp(56px,7vw,88px);line-height:1.1;--trazo:14px;--hondo:8px}
.bj-final .sub{margin:12px 0 0;font:700 19px/1.3 var(--f-texto);color:var(--tinta)}
.bj-final .nota{margin:8px auto 0;max-width:470px;font:500 15px/1.5 var(--f-texto);color:var(--tinta-2)}
.bj-cifras{display:flex;justify-content:center;gap:10px;margin:16px 0 2px;flex-wrap:wrap}
.bj-cifras div{min-width:108px;padding:8px 12px 12px;border-radius:var(--radio-peq);background:var(--sup-2)}
.bj-cifras b{display:block;font:700 30px/1.1 var(--f-texto);font-variant-numeric:tabular-nums;color:var(--tinta)}
.bj-cifras small{font:600 12px var(--f-texto);color:var(--tinta-2)}
.bj-acciones{display:flex;gap:12px;justify-content:center;margin-top:18px;flex-wrap:wrap}
.bj-perfecto{position:absolute;right:-14px;top:18px;z-index:3;display:grid;place-items:center;width:96px;height:96px;border-radius:50%;background:color-mix(in srgb,var(--aviso) 22%,var(--sup));color:var(--aviso-txt);text-align:center;font:700 12px/1.15 var(--f-texto);box-shadow:inset 0 0 0 3px var(--aviso),var(--sombra-flotante);transform:rotate(12deg)}
.bj-perfecto b{display:block;font:var(--peso-titulo) 26px/1 var(--f-titulo);color:var(--aviso-txt);-webkit-text-stroke:0}
.bj-combo.fuego b{animation:bj-latido .5s infinite}
.bj-combo.fuego::before{content:"";position:absolute;left:50%;top:40px;width:190px;height:190px;margin:-95px 0 0 -95px;border-radius:50%;background:radial-gradient(closest-side,rgba(242,180,58,.55),rgba(242,102,27,0));z-index:-1;animation:bj-latido .5s infinite}
.bj-premio{position:relative;z-index:0;margin:18px auto 8px;width:176px;height:176px;perspective:900px}
.bj-rayos{position:absolute;z-index:-1;left:50%;top:50%;width:540px;height:540px;margin:-270px 0 0 -270px;border-radius:50%;pointer-events:none;opacity:.5;
  background:repeating-conic-gradient(from 0deg,var(--rar,var(--t-gram)) 0deg 9deg,rgba(0,0,0,0) 9deg 20deg);
  -webkit-mask:radial-gradient(closest-side,#000 22%,rgba(0,0,0,0));mask:radial-gradient(closest-side,#000 22%,rgba(0,0,0,0));animation:bj-gira 14s linear infinite}
.bj-premio .gira{position:absolute;inset:0;transform-style:preserve-3d}
.bj-premio .dorso,.bj-premio .cara{position:absolute;inset:0;border-radius:var(--radio);backface-visibility:hidden;-webkit-backface-visibility:hidden;display:grid;place-items:center}
.bj-premio .dorso{background:var(--rar,var(--acento));box-shadow:inset 0 0 0 8px var(--luz),var(--sombra-flotante);
  font:var(--peso-titulo) 92px/1 var(--f-titulo);color:var(--luz);-webkit-text-stroke:10px var(--tinta-arte);paint-order:stroke fill}
.bj-premio .cara{transform:rotateY(180deg);background:var(--sup);box-shadow:inset 0 0 0 6px var(--rar,var(--acento)),var(--sombra-flotante)}
.bj-premio .cara img,.bj-premio .cara .sin{width:72%;height:72%;object-fit:contain;filter:drop-shadow(0 6px 5px rgba(38,31,25,.25))}
.bj-premio .cara .sin{display:grid;place-items:center;font:var(--peso-titulo) 60px/1 var(--f-titulo);color:color-mix(in srgb,var(--rar) 60%,var(--tinta))}
.bj-premio .rar{--c:var(--rar);position:absolute;left:50%;bottom:-14px;transform:translateX(-50%) rotate(-3deg);font-size:14px;padding:4px 16px}
.bj-obj{margin-top:16px}
.bj-obj b{display:block;font:700 24px/1.2 var(--f-texto)}
.bj-obj span{font:600 16px var(--f-jp);color:var(--tinta-2)}
.bj-obj p{margin:8px auto 0;max-width:420px;font:500 14.5px/1.5 var(--f-texto);color:var(--tinta-2)}
.bj-botin{display:flex;justify-content:center;gap:12px;margin-top:16px;flex-wrap:wrap}
.bj-botin .pegatina{font-size:15px;padding:4px 16px;transform:rotate(-2deg)}
.bj-koban-img{width:22px;height:22px;object-fit:contain;margin:-4px 0}
.bj-koban{display:inline-block;width:14px;height:19px;border-radius:50%;background:#ffd46b;box-shadow:inset 0 0 0 2px #b8840f,inset 0 -3px 0 rgba(0,0,0,.15)}  /* arte: la moneda */
.bj-vacio{position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:24px}
.bj-vacio .panel{width:min(520px,100%);padding:32px;border-radius:var(--radio)}

/* ── camino: el tablero de los yōkai ── */
/* el tablero: la página del tema (la foto de arriba es la escena) */
.cm{position:absolute;inset:0;overflow:auto;overflow-x:hidden;background:var(--fondo)}
.cm-cab{position:sticky;top:0;z-index:20;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:16px;padding:16px 22px;pointer-events:none}
.cm-cab>*{pointer-events:auto}
.cm-cab .der{justify-self:end;display:flex;gap:10px}
.cm-cab .centro{padding:8px 20px;border-radius:var(--radio-btn);font:700 14px var(--f-texto);letter-spacing:.02em}
.cm-cab .centro i{font:var(--peso-titulo) 15px var(--f-titulo);font-style:normal;color:var(--acento-tinta);margin-right:8px}
.cm-heroe{position:relative;height:min(640px,80vh);margin-top:-78px;overflow:hidden}
.cm-heroe .bj-luz{display:none}  /* la foto ya trae su luz: sin el velo de color del yōkai (era una mancha tenue arriba) */
.cm-heroe .bj-mundo{inset:0}
.cm-heroe .bj-suelo{height:30%}
.cm-heroe .bj-zocalo{bottom:30%}
.cm-heroe-txt{position:absolute;left:6%;top:22%;z-index:3;max-width:520px}
.cm-heroe-txt h1{margin:0;font-size:clamp(64px,8.6vw,124px);line-height:1.05;--trazo:16px;--hondo:10px}
.cm-heroe-txt .es{margin:12px 0 0;font:700 30px/1.15 var(--f-texto);color:var(--luz);text-shadow:0 3px 0 rgba(38,31,25,.5)}
.cm-heroe-txt p{margin:16px 0 0;max-width:440px;font:500 16px/1.5 var(--f-texto);color:var(--luz);text-shadow:0 1px 2px rgba(38,24,8,.6)}
.cm-heroe-txt .cifras{display:flex;gap:12px;margin-top:22px;flex-wrap:wrap}
.cm-heroe-txt .cifras .pegatina{font-size:14px;padding:8px 14px 9px;transform:rotate(-2deg)}
.cm-heroe-jefe{position:absolute;right:7%;bottom:7%;z-index:3;width:min(460px,40vw);display:flex;flex-direction:column;align-items:center}
.cm-heroe-jefe .figura{position:relative;width:min(330px,28vw);aspect-ratio:1;cursor:pointer}
.cm-heroe-jefe .figura .img{position:absolute;inset:0;animation:bj-flota 3.2s ease-in-out infinite;filter:drop-shadow(0 16px 12px rgba(38,24,8,.3))}
.cm-heroe-jefe .figura .img>*{width:100%;height:100%;display:block}
.cm-heroe-jefe .figura .sombra{position:absolute;left:22%;right:22%;bottom:-2%;height:9%;border-radius:50%;background:radial-gradient(closest-side,rgba(40,24,8,.55),rgba(40,24,8,0))}
.cm-heroe-jefe .figura.dormido .img{filter:brightness(.18) sepia(.4) drop-shadow(0 16px 12px rgba(38,24,8,.3));animation-duration:6s}
.cm-heroe-jefe .figura .zzz{position:absolute;right:6%;top:4%;font:var(--peso-titulo) 34px/1 var(--f-titulo);color:var(--luz);-webkit-text-stroke:8px var(--tinta-arte);paint-order:stroke fill}
.cm-heroe-jefe .tarjeta{margin-top:-6px;width:100%;padding:20px;border-radius:var(--radio);text-align:center}
.cm-heroe-jefe .tarjeta .pegatina{position:absolute;left:50%;top:-14px;transform:translateX(-50%) rotate(-3deg);font-size:14px;padding:7px 14px 8px}
.cm-heroe-jefe .tarjeta h2{margin:8px 0 0;font:700 27px/1.2 var(--f-texto)}
.cm-heroe-jefe .tarjeta h2 span{font:var(--peso-titulo) 22px var(--f-titulo);color:var(--acento-tinta);margin-left:8px}
.cm-heroe-jefe .tarjeta p{margin:8px 0 16px;font:500 14px/1.5 var(--f-texto);color:var(--tinta-2)}
.cm-barra{position:relative;height:16px;border-radius:8px;background:var(--sup-3)}
.cm-barra>i{position:absolute;left:0;top:0;bottom:0;border-radius:8px;background:var(--bien)}
.cm-barra>i.lista{background:var(--acento)}
.cm-barra .umbral{position:absolute;left:80%;top:-6px;bottom:-6px;width:4px;margin-left:-2px;border-radius:2px;background:var(--tinta)}
.cm-tablero{position:relative;max-width:1060px;margin:0 auto;padding:80px 28px 140px}
.cm-senda{position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;pointer-events:none}
.cm-fila{position:relative;display:grid;grid-template-columns:minmax(0,1fr) 190px minmax(0,1fr);align-items:center;min-height:200px}
.cm-region{grid-column:1;grid-row:1;min-width:0;padding:20px 24px;will-change:transform}
.cm-fila.der .cm-region{grid-column:3}
.cm-region>.pegatina{position:absolute;top:-13px;left:18px}
.cm-fila.der .cm-region>.pegatina{left:auto;right:18px;transform:rotate(4deg)}
.cm-region h3{margin:8px 0 0;display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;font:700 25px/1.2 var(--f-texto)}
.cm-region h3 small{font:600 17px var(--f-jp);color:var(--tinta-2)}
.cm-region .muestra{margin:8px 0 12px;font:500 16px var(--f-jp);color:var(--tinta-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cm-region .datos{margin-top:8px;font:500 12.5px var(--f-texto);color:var(--tinta-2)}
.cm-region .guardian{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:12px;padding-top:12px;border-top:1px solid var(--linea)}
.cm-region .guardian .quien{font:700 14px var(--f-texto);color:var(--tinta);min-width:0}
.cm-region .guardian .quien span{font:var(--peso-titulo) 15px var(--f-titulo);color:var(--acento-tinta);margin-right:8px}
.cm-region .guardian .quien small{display:block;font:500 12px var(--f-texto);color:var(--tinta-2)}
.cm-region.futura{filter:saturate(.55) brightness(.97)}
.cm-region.aqui{box-shadow:0 0 0 3px var(--acento),var(--sombra-flotante)}
.cm-medalla{grid-column:2;grid-row:1;justify-self:center;position:relative;width:136px;height:136px;cursor:pointer;z-index:2}
.cm-fila.izq .cm-medalla{left:-22px}.cm-fila.der .cm-medalla{left:22px}
.cm-medalla .disco{position:absolute;inset:0;border-radius:50%;background:var(--sup);overflow:hidden;
  box-shadow:inset 0 0 0 6px var(--tono,var(--acento)),inset 0 0 0 9px var(--sup),var(--sombra)}
.cm-medalla .disco .img{position:absolute;inset:10%;display:grid;place-items:center}
.cm-medalla .disco .img>*{width:100%;height:100%;display:block}
.cm-medalla.bloqueado .disco .img{filter:brightness(.1) sepia(.5);opacity:.5}
.cm-medalla.bloqueado .disco{box-shadow:inset 0 0 0 6px var(--linea-2),inset 0 0 0 9px var(--sup),var(--sombra)}
.cm-medalla .ofuda{position:absolute;left:50%;top:50%;width:44px;height:96px;margin:-48px 0 0 -22px;border-radius:4px;background:#f6ecd2;box-shadow:inset 0 0 0 3px #d8412a,0 4px 8px rgba(38,31,25,.35);  /* arte: el ofuda */
  transform:rotate(-14deg);display:grid;place-items:center;font:var(--peso-titulo) 30px/1 var(--f-titulo);color:#d8412a}
.cm-medalla.disponible .anima{animation:bj-flota 2.4s ease-in-out infinite}
.cm-medalla.disponible .disco{animation:bj-pulso 1.5s ease-out infinite}
.cm-medalla .anima{position:absolute;inset:0}
.cm-medalla .cm-hanko{position:absolute;right:-12px;bottom:6px;width:62px;height:62px;border-radius:var(--radio-peq);border:4px solid var(--mal);background:color-mix(in srgb,var(--sup) 90%,transparent);color:var(--mal-txt);
  display:grid;place-items:center;font:var(--peso-titulo) 20px/1.05 var(--f-titulo);text-align:center;transform:rotate(-14deg)}
.cm-medalla .nv{position:absolute;left:50%;bottom:-14px;transform:translateX(-50%) rotate(-3deg);font-size:12px;padding:4px 12px}
.cm-medalla .mochi-ficha{position:absolute;left:50%;top:-58px;margin-left:-31px;width:62px;height:62px;border-radius:50%;background:var(--sup);display:grid;place-items:center;
  box-shadow:inset 0 0 0 4px var(--acento),var(--sombra);animation:bj-flota 2s ease-in-out infinite;font:var(--peso-titulo) 26px/1 var(--f-titulo);color:var(--acento-tinta)}
.cm-medalla .mochi-ficha img{width:78%;height:78%;object-fit:contain}
.cm-fin{text-align:center;padding:40px 0 0;font:700 18px var(--f-texto);color:var(--tinta-2)}
.cm-fin b{display:block;font:var(--peso-titulo) 56px/1.15 var(--f-titulo);color:var(--acento);-webkit-text-stroke:10px var(--sup);paint-order:stroke fill}
.cm-hoja{position:absolute;inset:0;z-index:30;display:grid;place-items:center;padding:24px;background:var(--velo);opacity:0}
.cm-hoja .panel{position:relative;width:min(560px,100%);padding:28px;border-radius:var(--radio);text-align:center}
.cm-hoja .figura{position:relative;width:220px;height:220px;margin:-120px auto 0}
.cm-hoja .figura .img{position:absolute;inset:0;animation:bj-flota 3s ease-in-out infinite;filter:drop-shadow(0 14px 10px rgba(38,24,8,.35))}
.cm-hoja .figura .img>*{width:100%;height:100%;display:block}
.cm-hoja .figura.dormido .img{filter:brightness(.15) sepia(.4)}
.cm-hoja h2{margin:8px 0 0;font:700 28px/1.2 var(--f-texto)}
.cm-hoja h2 span{display:block;font:var(--peso-titulo) 40px/1.25 var(--f-titulo);color:var(--acento);-webkit-text-stroke:10px var(--sup);paint-order:stroke fill}
.cm-hoja .desc{margin:12px auto 0;max-width:440px;font:500 15px/1.5 var(--f-texto);color:var(--tinta-2)}
.cm-hoja .reglas{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:18px 0 0}
.cm-hoja .reglas div{padding:12px 8px;border-radius:var(--radio-peq);background:var(--sup-2);font:500 12.5px/1.35 var(--f-texto);color:var(--tinta-2)}
.cm-hoja .reglas b{display:block;font:700 20px/1.2 var(--f-texto);color:var(--tinta)}
/* clases para preparar al jefe: qué falta y botones que llevan directo a ello */
.cm-plan{margin:16px 0 0;padding:16px;border-radius:var(--radio-peq);background:var(--sup-2);text-align:left}
.cm-plan-cab{display:flex;align-items:center;gap:12px}
.cm-plan-cab .sello{flex:none;display:grid;place-items:center;width:44px;height:44px;border-radius:var(--radio-peq);background:color-mix(in srgb,var(--mal) 12%,var(--sup));color:var(--mal-txt);font:var(--peso-titulo) 15px/1 var(--f-titulo);transform:rotate(-6deg);
  box-shadow:inset 0 0 0 2px var(--mal)}
.cm-plan-cab b{display:block;font:700 17px/1.25 var(--f-texto);color:var(--tinta)}
.cm-plan-cab small{display:block;margin-top:2px;font:500 13.5px/1.35 var(--f-texto);color:var(--tinta-2)}
.cm-plan-cab small b{display:inline;font:inherit;font-weight:700;color:var(--acento-tinta)}
.cm-plan-sig{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 0}
.cm-plan-sig span{padding:4px 12px;border-radius:var(--radio-peq);background:var(--sup);font:500 15px/1.5 var(--f-jp);color:var(--tinta)}
.cm-plan-sig span.mas{background:transparent;color:var(--tinta-2)}
.cm-plan-botones{display:flex;flex-wrap:wrap;gap:12px 10px;margin:14px 0 4px}
.cm-plan-botones>.bj-boton{flex:1 1 auto;padding:12px 18px 13px;font-size:15.5px}
.cm-plan-botones .bj-boton .k{font-size:17px}
.cm-plan-gram{margin:10px 0 0}
.cm-plan-gram>small{display:block;margin:0 0 8px;font:700 11.5px var(--f-texto);letter-spacing:.12em;text-transform:uppercase;color:var(--tinta-2)}
.cm-plan-gram .fila{display:flex;flex-wrap:wrap;gap:10px}
.cm-plan-gram .bj-boton{padding:9px 14px 10px;font-size:14px;gap:8px;white-space:normal;text-align:left;line-height:1.15}
.cm-plan-gram .bj-boton .k{--c:var(--t-gram);font:700 14px/1 var(--f-texto);width:24px;height:24px;flex:none;display:grid;place-items:center;border-radius:8px;background:color-mix(in srgb,var(--c) 18%,var(--sup));color:color-mix(in srgb,var(--c) 55%,var(--tinta))}
.cm-plan-gram .bj-boton.hecha .k{--c:var(--bien)}
.cm-plan .bj-boton[disabled]{opacity:.5;pointer-events:none}
.cm-plan .bj-boton kbd{opacity:1;font:700 11px var(--f-texto);padding:4px 8px;border-radius:8px;min-width:0;height:auto}
.cm-plan .bj-boton:not(.claro) kbd{background:color-mix(in srgb,var(--boton-tinta) 16%,transparent);color:var(--boton-tinta)}
.cm-plan .bj-boton.claro kbd{background:var(--sup-3);color:var(--tinta-2)}
.cm-plan .bj-boton:focus-visible{outline:3px solid var(--acento);outline-offset:3px}
.cm-heroe-jefe.con-plan{bottom:5%;right:5%;width:min(660px,50vw);flex-direction:row;align-items:flex-end}
.cm-heroe-jefe.con-plan .figura{flex:none;width:min(170px,13vw);margin:0 -30px 34px 0;z-index:2}
.cm-heroe-jefe.con-plan .tarjeta{flex:1;min-width:0;margin-top:0;padding:18px 18px 14px 36px;text-align:left}
.cm-heroe-jefe.con-plan .tarjeta .pegatina{left:40px;transform:rotate(-3deg)}
.cm-heroe-jefe.con-plan .tarjeta h2{font-size:24px}
.cm-heroe-jefe.con-plan .tarjeta>p{margin:4px 0 10px}
.cm-heroe-jefe.con-plan .cm-plan{margin-top:10px;padding:12px 12px 10px}
.cm-heroe-jefe.con-plan .cm-plan-sig{display:none}
.cm-heroe-jefe.con-plan .cm-plan-gram .bj-boton{padding:7px 12px 8px;font-size:13px}
.cm-hoja .panel.con-plan{width:min(620px,100%)}
.cm-hoja .panel.con-plan .figura{width:170px;height:170px;margin-top:-96px}
.cm-region .guardian .bj-boton.preparar{gap:8px}
.cm-hoja{overflow:auto}
@media (max-height:820px){.cm-hoja .panel.con-plan{padding-top:18px}.cm-hoja .panel.con-plan .figura{width:120px;height:120px;margin-top:-64px}.cm-hoja .panel.con-plan .desc{margin-top:6px}.cm-plan-sig{display:none}}

/* ventanas medianas: Mochi encoge para no quedar detrás de la carta; más estrecho, sube por encima de ella */
@media (max-width:1100px){.bj-mochi{--mw:clamp(150px,calc(50vw - 330px),320px);width:var(--mw);height:calc(var(--mw) * 1.125)}}
@media (max-width:900px){.bj-mochi{--mw:170px;bottom:300px}.bj-placa .nombre small{display:none}}
@media (max-width:1000px) and (min-width:761px){
  .cm-heroe-txt{max-width:calc(100% - 40vw - 16%)}
  .cm-heroe:has(.con-plan) .cm-heroe-txt{max-width:calc(100% - 50vw - 12%)}
  .cm-heroe-txt p{max-width:100%}
  .cm-heroe:has(.con-plan){height:740px}
  .cm-heroe-jefe.con-plan .cm-plan-botones>.bj-boton{flex:1 1 100%;white-space:normal;justify-content:flex-start;text-align:left}
}
@media (max-width:760px){
  .bj-jefe{width:min(34vh,270px);margin-left:calc(min(34vh,270px) / -2);bottom:42%}
  .bj-mochi{width:124px;height:146px;bottom:auto;top:35%;left:-18px}
  .bj-placa .nombre small{display:none}
  .bj-placa .jp{min-width:56px;height:56px;font-size:26px}
  .bj-bocadillo{right:auto;left:14%;top:-10%;transform-origin:20% 100%}
  .bj-bocadillo::before{right:auto;left:22px}
  .bj-hud{flex-wrap:wrap;padding:12px;gap:10px}
  .bj-placa{order:3;width:100%}
  .bj-yo{padding:8px 12px 10px;gap:6px}
  .bj-palabra{font-size:58px}.bj-palabra.media{font-size:46px}.bj-palabra.larga{font-size:34px}
  .bj-form .bj-boton .t{display:none}
  .bj-anillo{width:68px;height:68px;right:-6px;top:-24px}.bj-anillo b{font-size:22px}
  .bj-combo{top:auto;bottom:330px;right:10px}.bj-combo b{font-size:60px}
  .bj-atrezo.nigiri,.bj-atrezo.geta{display:none}
  .bj-corte b{font-size:56px}.bj-corte .kat{display:none}
  .bj-dano{font-size:50px}.bj-dano.crit{font-size:62px}.bj-dano.esp{font-size:78px}
  .cm-heroe{height:860px}
  .cm-heroe-txt{left:16px;right:16px;top:12%}
  .cm-heroe-jefe{right:50%;transform:translateX(50%);width:calc(100% - 32px);bottom:3%}
  .cm-heroe-jefe .figura{width:56vw}
  .cm-cab{grid-template-columns:auto 1fr;padding:12px}.cm-cab .centro{display:none}
  .cm-tablero{padding:60px 16px 100px}
  .cm-fila,.cm-fila.der{grid-template-columns:96px minmax(0,1fr);min-height:0;margin:26px 0}
  .cm-region{padding:18px 16px 16px}.cm-region h3{font-size:21px}
  .cm-region .guardian{flex-wrap:wrap}
  .cm-fila .cm-region,.cm-fila.der .cm-region{grid-column:2}
  .cm-medalla,.cm-fila.der .cm-medalla,.cm-fila.izq .cm-medalla{grid-column:1;left:0;width:86px;height:86px}
  .cm-medalla .mochi-ficha,.cm-fila.der .cm-medalla .mochi-ficha{left:-10px;right:auto;top:-34px;width:44px;height:44px}
  .cm-medalla .cm-hanko{width:44px;height:44px;font-size:14px;right:-8px}
  .cm-hoja .reglas{grid-template-columns:1fr}
  .cm-heroe-jefe.con-plan{width:calc(100% - 32px);right:50%;flex-direction:column;align-items:center}
  .cm-heroe-jefe.con-plan .figura{width:30vw;margin:0 0 -4px}
  .cm-heroe-jefe.con-plan .tarjeta{padding:18px 16px 14px}
  .cm-plan-botones>.bj-boton{flex:1 1 100%}
}
@media (prefers-reduced-motion:reduce){
  .cm-medalla.disponible .anima,.cm-medalla.disponible .disco,.cm-heroe-jefe .figura .img,.cm-hoja .figura .img,.bj-rayos,.cm-medalla .mochi-ficha,.bj-jefe.carga .bj-tiemblo{animation:none}
}
`;
function estilos() {
  if (!$('#estilo-jefe')) { const s = document.createElement('style'); s.id = 'estilo-jefe'; s.textContent = CSS; document.head.appendChild(s); }
  if (!$$('link[rel="stylesheet"]').some((l) => /fuentes.css/.test(l.href))) {
    const l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = '/vendor/fuentes/fuentes.css';
    document.head.appendChild(l);
  }
}

// ───────────────────────── piezas comunes ─────────────────────────
// ficha que se inclina hacia el cursor con brillo especular y se aplasta al pulsar
function inclinable(el, fuerza = 8) {
  if (SUAVE || !el) return;
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect(), u = (e.clientX - r.left) / r.width, v = (e.clientY - r.top) / r.height;
    el.style.setProperty('--mx', `${u * 100}%`); el.style.setProperty('--my', `${v * 100}%`); el.style.setProperty('--brillo', 1);
    gsap.to(el, { rotateY: (u - 0.5) * fuerza, rotateX: (0.5 - v) * fuerza, transformPerspective: 900, duration: 0.45, ease: 'power3.out', overwrite: 'auto' });
  });
  el.addEventListener('pointerleave', () => { el.style.setProperty('--brillo', 0); gsap.to(el, { rotateX: 0, rotateY: 0, scaleX: 1, scaleY: 1, duration: 0.7, ease: 'elastic.out(1, 0.5)', overwrite: 'auto' }); });
  el.addEventListener('pointerdown', () => gsap.to(el, { scaleX: 1.04, scaleY: 0.93, duration: 0.12, ease: 'power2.out', overwrite: 'auto' }));
  el.addEventListener('pointerup', () => gsap.to(el, { scaleX: 1, scaleY: 1, duration: 0.6, ease: 'elastic.out(1.2, 0.4)', overwrite: 'auto' }));
}

// yōkai de reserva si aún no existe su ilustración: un obake de vinilo con su ofuda
function svgReserva(j, p = 'rs') {
  const t = tono(j), letras = [...String(j.jp || '妖')].slice(0, 2);
  return `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg"><defs>
    <radialGradient id="${p}-c" cx="38%" cy="28%" r="80%"><stop offset="0" stop-color="#fffbf2"/><stop offset=".55" stop-color="#f1e6cf"/><stop offset="1" stop-color="${t}"/></radialGradient>
    <radialGradient id="${p}-b" cx="50%" cy="0%" r="100%"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
    <path d="M200 46C292 46 330 124 330 206V322Q314 352 294 326Q274 300 254 326Q234 352 214 326Q194 300 174 326Q154 352 134 326Q114 300 94 326Q82 342 70 322V206C70 124 108 46 200 46Z" fill="url(#${p}-c)"/>
    <ellipse cx="170" cy="92" rx="70" ry="30" fill="url(#${p}-b)"/>
    <ellipse cx="138" cy="226" rx="26" ry="14" fill="#f2a3a3" opacity=".85"/><ellipse cx="262" cy="226" rx="26" ry="14" fill="#f2a3a3" opacity=".85"/>
    <g class="ojo"><ellipse cx="160" cy="192" rx="14" ry="20" fill="#261f19"/><circle cx="165" cy="184" r="5.5" fill="#fff"/></g>
    <g class="ojo"><ellipse cx="240" cy="192" rx="14" ry="20" fill="#261f19"/><circle cx="245" cy="184" r="5.5" fill="#fff"/></g>
    <path d="M184 234Q200 250 216 234" stroke="#261f19" stroke-width="7" fill="none" stroke-linecap="round"/>
    <g transform="rotate(-8 200 108)"><rect x="174" y="60" width="52" height="${letras.length > 1 ? 104 : 70}" rx="5" fill="#f7efdf" stroke="#d8412a" stroke-width="4"/>
    ${letras.map((c, i) => `<text x="200" y="${100 + i * 40}" text-anchor="middle" font-family="Mochiy Pop One, Zen Maru Gothic, sans-serif" font-size="32" fill="#d8412a">${esc(c)}</text>`).join('')}</g></svg>`;
}
const CACHE_SVG = new Map();
function textoSVG(j) {
  if (!CACHE_SVG.has(j.id)) {
    CACHE_SVG.set(j.id, fetch(`/img/jefes/${encodeURIComponent(j.id)}.svg`).then((r) => (r.ok ? r.text() : null)).then((t) => (t && /<svg[\s>]/.test(t) ? t : null)).catch(() => null));
  }
  return CACHE_SVG.get(j.id);
}
// SVG en línea con los id prefijados (para animar sus ojos sin chocar con otros SVG de la página)
async function svgEnLinea(j, prefijo) {
  const t = (await textoSVG(j)) || svgReserva(j);
  return t.replace(/<\?xml[^>]*>|<!DOCTYPE[^>]*>|<script[\s\S]*?<\/script>/gi, '')
    .replace(/\sid="([^"]+)"/g, ` id="${prefijo}$1"`).replace(/url\(#([^)]+)\)/g, `url(#${prefijo}$1)`).replace(/(xlink:)?href="#([^"]+)"/g, `$1href="#${prefijo}$2"`);
}
// imagen del jefe para el mapa (img; si no existe el archivo, el obake de reserva)
const imgJefe = (j) => `<img src="/img/jefes/${encodeURIComponent(j.id)}.svg" alt="" draggable="false" data-reserva="${esc(j.id)}">`;
let nReserva = 0;
function reservas(cont, jefes) {
  $$('img[data-reserva]', cont).forEach((img) => {
    const j = jefes.find((x) => x.id === img.dataset.reserva) || { id: img.dataset.reserva, jp: '' };
    textoSVG(j).then((t) => {
      if (t || !img.isConnected) return;
      const d = document.createElement('div'); d.innerHTML = svgReserva(j, 'rs' + ++nReserva);
      img.replaceWith(d.firstElementChild);
    });
  });
}

// corazón de vinilo partido en dos mitades (para romperlo)
function corazon(lleno = true, n = 0) {
  const d = 'M20 35C8 26 2 19 2 11.5A8.8 8.8 0 0 1 20 6.5A8.8 8.8 0 0 1 38 11.5C38 19 32 26 20 35Z';
  const relleno = lleno ? '#d8412a' : 'rgba(38,31,25,.14)';
  return `<svg viewBox="0 0 40 38"><defs><clipPath id="cz-i${n}"><path d="M0 0H21L17 10L23 17L18 25L21 38H0Z"/></clipPath><clipPath id="cz-d${n}"><path d="M21 0H40V38H21L18 25L23 17L17 10Z"/></clipPath></defs>
    ${['i', 'd'].map((l) => `<g class="mitad ${l}" clip-path="url(#cz-${l}${n})"><path d="${d}" fill="${relleno}" stroke="${lleno ? '#261f19' : 'rgba(38,31,25,.35)'}" stroke-width="2.6" stroke-linejoin="round" ${lleno ? '' : 'stroke-dasharray="3 3"'}/>
    ${lleno ? '<path d="M7 11.5A5 5 0 0 1 14 7.5" stroke="#fff" stroke-opacity=".75" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M9 24C13 28.5 17 31.5 20 33" stroke="#8d2a17" stroke-opacity=".45" stroke-width="3" fill="none" stroke-linecap="round"/>' : ''}</g>`).join('')}</svg>`;
}

// ───────────────────────── partículas en lienzo ─────────────────────────
class Chispas {
  constructor(lienzo) {
    this.l = lienzo; this.x = lienzo.getContext('2d'); this.p = []; this.corre = false; this.paso = this.paso.bind(this);
    this.ajustar(); this.ro = new ResizeObserver(() => this.ajustar()); this.ro.observe(lienzo);
  }
  ajustar() { const r = this.l.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); this.w = r.width; this.h = r.height; this.l.width = Math.max(1, r.width * d); this.l.height = Math.max(1, r.height * d); this.x.setTransform(d, 0, 0, d, 0, 0); }
  emitir(n, o) {
    if (SUAVE) n = Math.ceil(n / 3);
    for (let i = 0; i < n; i++) {
      const a = (o.ang ?? -Math.PI / 2) + rnd(-1, 1) * (o.abanico ?? Math.PI), v = rnd(o.vmin ?? 200, o.vmax ?? 600);
      this.p.push({ x: o.x + rnd(-(o.rx || 0), o.rx || 0), y: o.y + rnd(-(o.ry || 0), o.ry || 0), vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: o.g ?? 900, roce: o.roce ?? 0.97,
        vida: -(o.retraso ? rnd(0, o.retraso) : 0), max: rnd(o.dmin ?? 0.6, o.dmax ?? 1.2), tam: rnd(o.tmin ?? 4, o.tmax ?? 10), rot: rnd(0, 6.28), vr: rnd(-9, 9),
        tipo: o.tipo || 'circulo', color: elegir(o.colores || ['#f7efdf']), crece: o.crece || 0, ond: o.ond || 0, fase: rnd(0, 6.28) });
    }
    if (!this.corre) { this.corre = true; this.t = performance.now(); requestAnimationFrame(this.paso); }
  }
  limpiar() { this.p = []; }
  paso(t) {
    const dt = Math.min(0.033, Math.max(0, (t - this.t) / 1000)); this.t = t;
    const x = this.x; x.clearRect(0, 0, this.w, this.h);
    this.p = this.p.filter((p) => (p.vida += dt) < p.max);
    for (const p of this.p) {
      if (p.vida < 0) continue;
      const k = Math.pow(p.roce, dt * 60);
      p.vx *= k; p.vy = p.vy * k + p.g * dt; p.x += (p.vx + Math.sin(p.vida * 3 + p.fase) * p.ond) * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      const u = p.vida / p.max, a = u < 0.65 ? 1 : 1 - (u - 0.65) / 0.35;
      x.save(); x.globalAlpha = Math.max(0, a); x.translate(p.x, p.y); x.fillStyle = p.color;
      const s = p.tam;
      switch (p.tipo) {
        case 'chispa': { x.rotate(Math.atan2(p.vy, p.vx)); const L = Math.min(60, Math.hypot(p.vx, p.vy) * 0.05) + s; x.beginPath(); x.ellipse(0, 0, L, s * 0.32, 0, 0, 6.283); x.fill(); break; }
        case 'petalo': { x.rotate(p.rot); x.scale(Math.cos(p.vida * 5 + p.fase), 1); x.beginPath(); x.ellipse(0, 0, s, s * 0.6, 0, 0, 6.283); x.fill(); x.fillStyle = 'rgba(255,255,255,.45)'; x.beginPath(); x.ellipse(-s * 0.2, -s * 0.1, s * 0.4, s * 0.2, 0, 0, 6.283); x.fill(); break; }
        case 'estrella': { x.rotate(p.rot); const r = s * (1 - u * 0.4); x.beginPath(); for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * 0.38 : r; x.lineTo(Math.cos(i * Math.PI / 4) * rr, Math.sin(i * Math.PI / 4) * rr); } x.closePath(); x.fill(); break; }
        case 'humo': { const r = s * (1 + u * p.crece); x.globalAlpha = Math.max(0, a) * 0.9; x.beginPath(); x.arc(0, 0, r, 0, 6.283); x.fill(); x.globalAlpha = Math.max(0, a) * 0.5; x.fillStyle = '#fff'; x.beginPath(); x.arc(-r * 0.25, -r * 0.3, r * 0.45, 0, 6.283); x.fill(); break; }
        case 'confeti': { x.rotate(p.rot); x.scale(1, Math.cos(p.vida * 7 + p.fase)); x.fillRect(-s / 2, -s / 4, s, s / 2); break; }
        case 'koban': { x.rotate(p.rot * 0.3); x.scale(Math.cos(p.vida * 6 + p.fase), 1); x.beginPath(); x.ellipse(0, 0, s * 0.72, s, 0, 0, 6.283); x.fill(); x.lineWidth = 2; x.strokeStyle = '#b8840f'; x.stroke(); x.fillStyle = 'rgba(255,255,255,.5)'; x.fillRect(-s * 0.1, -s * 0.6, s * 0.2, s * 1.2); break; }
        case 'anillo': { const r = s * (1 + u * p.crece); x.lineWidth = Math.max(1, 10 * (1 - u)); x.strokeStyle = p.color; x.beginPath(); x.arc(0, 0, r, 0, 6.283); x.stroke(); break; }
        default: { x.beginPath(); x.arc(0, 0, s * (1 - u * 0.5), 0, 6.283); x.fill(); }
      }
      x.restore();
    }
    if (this.p.length) requestAnimationFrame(this.paso); else { this.corre = false; x.clearRect(0, 0, this.w, this.h); }
  }
}

// ───────────────────────── datos ─────────────────────────
async function cargarMapa() {
  const [regiones, juego] = await Promise.all([api('/api/camino'), api('/api/juego').catch(() => null)]);
  return { regiones, jefes: juego?.jefes || [], juego };
}
const jefeDe = (jefes, i) => jefes.find((j) => +j.region === i);
const estadoJefe = (j) => (!j ? 'nada' : j.vencido ? 'vencido' : j.desbloqueado ? 'disponible' : 'bloqueado');
const faltan = (r, j) => Math.max(0, j?.necesarias != null && j?.aprendidas != null ? j.necesarias - j.aprendidas : Math.ceil(r.total * 0.8) - r.hechas);

// ───────────────────────── CLASES PARA EL JEFE ─────────────────────────
// Si una región aún no despierta a su yōkai, enseñamos qué falta y botones que llevan directo a ello:
// la lección de esa región, el repaso de práctica de la región y la gramática que sale en sus frases.
const PREP = new Map();
function preparacion(i) {
  if (!PREP.has(i)) PREP.set(i, api(`/api/region/${i}/preparacion`).catch(() => null));
  return PREP.get(i);
}
const palabraDe = (w) => (typeof w === 'string' ? w : w?.palabra || w?.jp || w?.texto || '');
function planHTML(i, r, j, prep) {
  const n = Math.max(0, prep?.faltan ?? faltan(r, j));
  const detalle = prep?.siguientes_detalle || [];
  const sig = (prep?.siguientes || []).map(palabraDe).filter(Boolean).slice(0, 7);
  const pista = (w) => { const d = detalle.find((x) => x?.palabra === w); return d ? ` title="${esc([d.lectura, d.es].filter(Boolean).join(' · '))}"` : ''; };
  const gram = (prep?.gramatica || []).filter((g) => g?.slug).slice(0, 3);
  const aprendidas = prep?.aprendidas ?? r.hechas;
  const practica = (prep?.practica_disponible ?? true) && aprendidas > 0;
  return `<div class="cm-plan" data-plan="${i}">
    <div class="cm-plan-cab"><span class="sello">稽古</span><div><b>${t('jefe.plan.tit')}</b><small>${n ? tn('jefe.plan.faltan', n, { region: esc(r.nombre) }) : t('jefe.plan.casi', { region: esc(r.nombre) })}</small></div></div>
    ${sig.length ? `<div class="cm-plan-sig" lang="ja">${sig.map((w) => `<span${pista(w)}>${esc(w)}</span>`).join('')}${n > sig.length ? '<span class="mas">…</span>' : ''}</div>` : ''}
    <div class="cm-plan-botones">
      ${n ? `<button class="bj-boton" data-ir="estudio/leccion/${i}"><span class="k">新</span>${tn('jefe.plan.aprender', n)} ${kbd('L')}</button>` : ''}
      <button class="bj-boton claro" data-ir="estudio/repaso-region/${i}"${practica ? '' : ` disabled title="${t('jefe.plan.antes')}"`}><span class="k">稽</span>${t('jefe.plan.entrenar')} ${kbd('E')}</button>
    </div>
    ${gram.length ? `<div class="cm-plan-gram"><small>${t('jefe.plan.gramatica')}</small><div class="fila">${gram.map((g, k) => `<button class="bj-boton claro ${g.hecha ? 'hecha' : ''}" data-ir="${/^c\d\d$/.test(g.slug) ? 'clase' : 'gramatica'}/${esc(g.slug)}" title="${g.hecha ? t('jefe.plan.gram_hecha') : t('jefe.plan.gram_pendiente')}"><span class="k">${g.hecha ? '✓' : '文'}</span>${esc(g.titulo || g.slug)} <kbd>${k + 1}</kbd></button>`).join('')}</div></div>` : ''}
  </div>`;
}
// pinta (o repinta con los datos del servidor) el plan dentro de «hueco»; alIr se llama antes de navegar
function montarPlan(hueco, i, r, j, alIr, prep = null, animar = true) {
  if (!hueco?.isConnected) return;
  const teniaFoco = hueco.contains(document.activeElement) ? document.activeElement.dataset.ir : null;
  hueco.innerHTML = planHTML(i, r, j, prep);
  const plan = $('.cm-plan', hueco);
  $$('[data-ir]', plan).forEach((b) => {
    b.onclick = (e) => {
      e.stopPropagation(); sonar('toque');
      gsap.fromTo(b, { scaleX: 1.08, scaleY: 0.9 }, { scaleX: 1, scaleY: 1, duration: 0.4, ease: 'elastic.out(1.2, 0.4)', clearProps: 'transform' });
      alIr?.(); location.hash = b.dataset.ir;
    };
  });
  rejilla(plan, '.bj-boton:not([disabled])', { eje: 'ambos', inicial: teniaFoco ? $(`[data-ir="${teniaFoco}"]`, plan) : null });
  if (teniaFoco) $(`[data-ir="${teniaFoco}"]`, plan)?.focus({ preventScroll: true });
  if (animar && !SUAVE) {
    gsap.fromTo($$('.cm-plan-cab, .cm-plan-botones .bj-boton', plan), { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.06, ease: 'back.out(1.8)', clearProps: 'transform,opacity' });
  }
  const extra = $$('.cm-plan-sig span, .cm-plan-gram .bj-boton', plan);
  if (!SUAVE && extra.length) gsap.fromTo(extra, { y: 12, opacity: 0, scale: 0.85 }, { y: 0, opacity: 1, scale: 1, duration: 0.45, stagger: 0.04, delay: animar ? 0.25 : 0, ease: 'back.out(2.2)', clearProps: 'transform,opacity' });
  if (!prep) preparacion(i).then((d) => { if (d && hueco.isConnected) montarPlan(hueco, i, r, j, alIr, d, false); });
}
// atajos del plan: L aprender, E entrenar, 1–3 gramática; devuelve true si la tecla era suya
function teclaPlan(e, raiz) {
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return false;
  const t = e.target;
  if (t?.closest?.('input, textarea, select, [contenteditable="true"]')) return false;
  const plan = $('.cm-plan', raiz); if (!plan) return false;
  const k = e.key.toLowerCase();
  const b = k === 'l' ? $('[data-ir^="estudio/leccion"]', plan) : k === 'e' ? $('[data-ir^="estudio/repaso-region"]', plan)
    : /^[1-3]$/.test(k) ? $$('.cm-plan-gram [data-ir]', plan)[+k - 1] : null;
  if (!b || b.disabled) return false;
  e.preventDefault(); e.stopPropagation();
  b.click(); return true;
}

// ───────────────────────── CAMINO ─────────────────────────
let camino = null;
registrar('camino', {
  seccion: '#v-jefe',
  async entrar() {
    estilos();
    PREP.clear();
    const d = await cargarMapa();
    camino = { ...d };
    pintarCamino(d);
  },
  salir() {
    if (camino?.obs) camino.obs.disconnect();
    if (camino?.tecla) removeEventListener('keydown', camino.tecla);
    if (camino?.teclaPlan) removeEventListener('keydown', camino.teclaPlan, true);
    camino = null;
  },
  contexto: () => 'camino',
});

function pintarCamino({ regiones, jefes }) {
  const actual = Math.max(0, regiones.findIndex((r) => r.hechas < r.total));
  const vencidos = jefes.filter((j) => j.vencido).length;
  // el héroe: el primer jefe que espera pelea; si no hay, el siguiente por despertar
  const listo = jefes.find((j) => j.desbloqueado && !j.vencido);
  const dormido = jefes.find((j) => !j.desbloqueado);
  const foco = listo || dormido || jefes[jefes.length - 1];
  const rFoco = foco ? regiones[+foco.region] : null;

  const heroe = foco && rFoco ? `<div class="cm-heroe-jefe ${listo ? '' : 'con-plan'}" style="--tono:${tono(foco)}">
      <div class="figura ${listo ? '' : 'dormido'}" data-jefe="${foco.region}"><div class="sombra"></div><div class="img">${imgJefe(foco)}</div>${listo ? '' : '<div class="zzz">Zzz</div>'}</div>
      <div class="tarjeta ficha">
        <span class="pegatina ${listo ? '' : 'tinta'}">${listo ? t('jefe.te_espera') : t('jefe.duerme')}</span>
        <h2>${esc(foco.nombre)}<span>${esc(foco.jp)}</span></h2>
        <p>${t('jefe.guardian', { region: esc(rFoco.nombre), vida: mil(foco.vida) })}</p>
        ${listo ? `<button class="bj-boton" data-luchar="${foco.region}"><span class="k">戦</span> ${t('jefe.a_luchar')} <kbd>↵</kbd></button>`
          : `<div class="cm-barra"><i style="width:${Math.min(100, 100 * rFoco.hechas / rFoco.total)}%"></i><b class="umbral"></b></div>
             <div class="cm-plan-hueco"></div>`}
      </div></div>` : '';

  const filas = regiones.map((r, i) => {
    const j = jefeDe(jefes, i), ej = estadoJefe(j), lado = i % 2 ? 'der' : 'izq';
    const clase = i === actual ? 'aqui' : i > actual + 1 ? 'futura' : '';
    const pct = r.total ? 100 * r.hechas / r.total : 0, quien = j ? { nombre: esc(j.nombre), region: esc(r.nombre) } : null;
    const medalla = j ? `<div class="cm-medalla ${ej}" data-jefe="${i}" style="--tono:${tono(j)}" title="${esc(j.nombre)}" tabindex="-1" role="button" aria-label="${ej === 'vencido' ? t('jefe.medalla.vencido', quien) : ej === 'bloqueado' ? t('jefe.medalla.dormido', quien) : t('jefe.medalla.espera', quien)}"><div class="anima">
        <div class="disco"><div class="img">${imgJefe(j)}</div></div>
        ${ej === 'bloqueado' ? '<div class="ofuda">封</div>' : ''}${ej === 'vencido' ? '<div class="cm-hanko">退<br>治</div>' : ''}
        <span class="pegatina nv ${ej === 'vencido' ? 'te' : ej === 'bloqueado' ? 'tinta' : ''}">${ej === 'vencido' ? t('jefe.vencido') : ej === 'bloqueado' ? t('jefe.medalla.pct', { n: Math.round(Math.min(pct, 80)) }) : t('jefe.lucha')}</span></div>
        ${i === actual ? '<div class="mochi-ficha"><img src="/img/iconos/mochi.svg" alt=""></div>' : ''}
      </div>` : '<div class="cm-medalla"></div>';
    const accion = !j ? '' : ej === 'disponible' ? `<button class="bj-boton peq" data-luchar="${i}"><span class="k">戦</span> ${t('jefe.luchar')}</button>`
      : ej === 'vencido' ? `<button class="bj-boton claro peq" data-luchar="${i}">${t('jefe.revancha')}</button>`
      : `<button class="bj-boton claro peq preparar" data-preparar="${i}" title="${t('jefe.preparar.tit')}"><span class="k">稽</span> ${tn('jefe.preparar', faltan(r, j))}</button>`;
    return `<div class="cm-fila ${lado}" data-i="${i}">
      ${medalla}
      <article class="cm-region ficha ${clase}">
        <span class="pegatina ${r.hechas === r.total ? 'te' : i === actual ? '' : 'anil'}">${i === actual ? t('jefe.region.aqui', { n: i + 1 }) : t('jefe.region', { n: i + 1 })}</span>
        <h3>${esc(r.nombre)}<small>${esc(r.jp)}</small></h3>
        <div class="muestra">${r.muestra.map(esc).join('・')}…</div>
        <div class="cm-barra"><i class="${pct >= 80 ? 'lista' : ''}" style="width:${Math.max(2, pct)}%"></i><b class="umbral"></b></div>
        <div class="datos">${t('jefe.region.cuenta', { hechas: r.hechas, total: r.total, fuertes: r.fuertes })}</div>
        ${j ? `<div class="guardian"><div class="quien"><span>${esc(j.jp)}</span>${esc(j.nombre)}<small>${ej === 'vencido' ? t('jefe.guardian.vencido') : ej === 'disponible' ? t('jefe.guardian.despierto') : t('jefe.guardian.dormido')}</small></div>${accion}</div>` : ''}
      </article></div>`;
  }).join('');

  V().innerHTML = `<div class="cm">
    <header class="cm-cab"><div><button class="bj-boton claro peq" data-inicio>${t('comun.volver_inicio')} ${kbd('Esc')}</button></div><div class="centro ficha"><i>道</i>${t('jefe.camino.tit')}</div>
      <div class="der"><span class="pegatina te" style="font-size:14px;padding:8px 14px 9px">退治 ${vencidos}/${jefes.length || regiones.length}</span></div></header>
    <section class="cm-heroe"><div class="bj-mundo"><div class="bj-pared"></div><div class="bj-luz" style="--aura:${foco ? tono(foco) + '88' : 'rgba(255,220,150,.5)'}"></div><div class="bj-zocalo"></div><div class="bj-suelo"><div class="bj-tatami"></div></div></div>
      <div class="cm-heroe-txt"><h1 class="pop">妖怪の道</h1><div class="es">${t('jefe.camino.es')}</div>
        <p>${t('jefe.camino.p')}</p>
        <div class="cifras"><span class="pegatina">${tn('jefe.camino.regiones', regiones.length)}</span><span class="pegatina anil">${tn('jefe.camino.esperando', jefes.filter((j) => j.desbloqueado && !j.vencido).length)}</span><span class="pegatina te">${tn('jefe.camino.vencidos', vencidos)}</span></div></div>
      ${heroe}${kageDice(momentoCamino(vencidos), 'kg-heroe')}</section>
    <section class="cm-tablero"><svg class="cm-senda"></svg>${filas}
      <div class="cm-fin"><b>富士山</b>${t('jefe.camino.fin')}</div></section></div>`;

  const cont = $('.cm', V());
  reservas(cont, jefes);
  $$('.mochi-ficha img', cont).forEach((img) => img.addEventListener('error', () => { img.replaceWith('猫'); }, { once: true }));
  $('[data-inicio]', cont).onclick = () => { location.hash = 'inicio'; };
  $$('.cm-region', cont).forEach((el) => inclinable(el, 6));
  inclinable($('.cm-heroe-jefe .tarjeta', cont), 6);
  $$('[data-luchar]', cont).forEach((b) => { b.onclick = (e) => { e.stopPropagation(); const i = +b.dataset.luchar, j = jefeDe(jefes, i); if (j && estadoJefe(j) !== 'bloqueado') { sonar('toque'); location.hash = 'jefe/' + i; } }; });
  // medallas: un Tab para entrar al tablero y ↑ ↓ para recorrerlas; Intro o Espacio abren la ficha del yōkai
  rejilla($('.cm-tablero', cont), '.cm-medalla[data-jefe]', { eje: 'lista', inicial: $(`.cm-medalla[data-jefe="${listo?.region ?? actual}"]`, cont) });
  $$('.cm-tablero .cm-medalla[data-jefe]', cont).forEach((m) => m.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); m.click(); }
  }));
  $$('[data-jefe]', cont).forEach((m) => {
    m.onclick = () => {
      const i = +m.dataset.jefe, j = jefeDe(jefes, i);
      if (!j) return;
      sonar('toque');
      gsap.fromTo(m, { scaleX: 1.1, scaleY: 0.86 }, { scaleX: 1, scaleY: 1, duration: 0.55, ease: 'elastic.out(1.2, 0.4)', clearProps: 'transform' });
      fichaJefe(j, regiones[i], jefes);
    };
  });

  $$('[data-preparar]', cont).forEach((b) => { b.onclick = (e) => { e.stopPropagation(); const i = +b.dataset.preparar, j = jefeDe(jefes, i); if (!j) return; sonar('toque'); fichaJefe(j, regiones[i], jefes); }; });
  if (!listo && foco && rFoco) montarPlan($('.cm-plan-hueco', cont), +foco.region, rFoco, foco, null, null, false);

  // senda: una cuerda que une las medallas; la parte recorrida, en naranja
  const trazar = () => {
    const svg = $('.cm-senda', cont), tab = $('.cm-tablero', cont);
    if (!svg || !tab) return;
    const base = tab.getBoundingClientRect();
    const pts = $$('.cm-medalla', tab).map((m) => { const r = m.getBoundingClientRect(); return [r.left - base.left + r.width / 2, r.top - base.top + r.height / 2]; });
    if (pts.length < 2) return;
    const curva = (a) => a.map(([x, y], k) => (k ? `C${a[k - 1][0]} ${(a[k - 1][1] + y) / 2} ${x} ${(a[k - 1][1] + y) / 2} ${x} ${y}` : `M${x} ${y}`)).join(' ');
    const hasta = Math.max(0, Math.min(pts.length - 1, actual));
    svg.setAttribute('viewBox', `0 0 ${base.width} ${base.height}`);
    svg.innerHTML = `<path d="${curva(pts)}" fill="none" stroke="rgba(38,31,25,.16)" stroke-width="18" stroke-linecap="round" transform="translate(0 6)"/>
      <path d="${curva(pts)}" fill="none" style="stroke:var(--linea-2)" stroke-width="12" stroke-linecap="round" stroke-dasharray="1 24"/>
      ${hasta > 0 ? `<path class="hecho" d="${curva(pts.slice(0, hasta + 1))}" fill="none" style="stroke:var(--acento)" stroke-width="12" stroke-linecap="round"/>` : ''}`;
    const h = $('.hecho', svg);
    if (h && !SUAVE && !camino?.trazado) { const L = h.getTotalLength(); gsap.fromTo(h, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, duration: 1.8, delay: 0.3, ease: 'power2.inOut' }); }
    if (camino) camino.trazado = true;
  };
  requestAnimationFrame(trazar);
  document.fonts?.ready.then(() => { if (camino && $('.cm', V()) === cont) { camino.trazado = false; trazar(); } });

  // entradas coreografiadas: el héroe al abrir y cada fila al asomar
  if (!SUAVE) {
    gsap.fromTo($$('.cm-heroe-txt > *', cont), { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, stagger: 0.08, delay: 0.55, ease: 'back.out(1.6)' });
    gsap.fromTo($$('.cm-heroe-jefe .figura, .cm-heroe-jefe .tarjeta', cont), { y: 80, opacity: 0, scale: 0.85 }, { y: 0, opacity: 1, scale: 1, duration: 0.9, stagger: 0.12, delay: 0.75, ease: 'back.out(1.5)' });
    const vistas = new WeakSet();
    const obs = new IntersectionObserver((ents) => ents.forEach((e) => {
      if (!e.isIntersecting || vistas.has(e.target)) return;
      vistas.add(e.target);
      const f = e.target, der = f.classList.contains('der');
      gsap.fromTo($('.cm-region', f), { x: der ? 70 : -70, y: 30, opacity: 0, rotate: der ? 3 : -3 }, { x: 0, y: 0, opacity: 1, rotate: 0, duration: 0.75, ease: 'back.out(1.5)' });
      gsap.fromTo($('.cm-medalla', f), { scale: 0.3, opacity: 0, rotate: -40 }, { scale: 1, opacity: 1, rotate: 0, duration: 0.8, delay: 0.12, ease: 'back.out(2.2)', clearProps: 'transform' });
    }), { root: cont, threshold: 0.12 });
    $$('.cm-fila', cont).forEach((f) => { gsap.set([$('.cm-region', f), $('.cm-medalla', f)], { opacity: 0 }); obs.observe(f); });
    if (camino) camino.obs = obs;
  }
  // Intro: a por el jefe que espera
  if (camino) {
    camino.tecla = (e) => { if (e.key === 'Enter' && listo && !e.defaultPrevented && !sobreControl(e) && !capaAbierta() && V().classList.contains('activa')) { e.preventDefault(); location.hash = 'jefe/' + listo.region; } };
    addEventListener('keydown', camino.tecla);
    // L / E / 1–3 del plan del héroe; en captura, para ganar a los atajos globales (L = lección)
    camino.teclaPlan = (e) => { if (!listo && !capaAbierta() && V().classList.contains('activa')) teclaPlan(e, $('.cm-heroe-jefe', cont) || cont); };
    addEventListener('keydown', camino.teclaPlan, true);
  }
}

// ficha del jefe antes de luchar (o lo que falta para despertarlo)
function fichaJefe(j, r, jefes) {
  if ($('.cm-hoja', V())) return;
  const ej = estadoJefe(j), dormido = ej === 'bloqueado';
  const capa = document.createElement('div'); capa.className = 'cm-hoja'; capa.setAttribute('role', 'dialog'); capa.setAttribute('aria-modal', 'true'); capa.setAttribute('aria-label', j.nombre);
  capa.innerHTML = `<div class="panel ficha ${dormido ? 'con-plan' : ''}" style="--tono:${tono(j)}">
    <div class="figura ${dormido ? 'dormido' : ''}"><div class="img">${imgJefe(j)}</div></div>
    <span class="pegatina ${dormido ? 'tinta' : ej === 'vencido' ? 'te' : ''}" style="margin-top:4px">${t('jefe.ficha.region', { region: esc(r.nombre), n: +j.region + 1 })}</span>
    <h2><span>${esc(j.jp)}</span>${esc(j.nombre)}</h2>
    <p class="desc">${esc(j.desc)}</p>
    ${j.titulo && ej !== 'vencido' ? `<p class="desc" style="margin-top:8px">${t('jefe.ficha.titulo', { titulo: esc(j.titulo) })}</p>` : ''}
    ${dormido ? `<div style="margin-top:16px"><div class="cm-barra"><i style="width:${Math.min(100, 100 * r.hechas / r.total)}%"></i><b class="umbral"></b></div>
      <div class="cm-plan-hueco"></div></div>`
      : `<div class="reglas"><div>${t('jefe.ficha.vida', { n: mil(j.vida) })}</div><div>${t('jefe.ficha.corazones')}</div><div>${ej === 'vencido' ? t('jefe.ficha.premio_revancha') : t('jefe.ficha.premio')}</div></div>`}
    <div class="bj-acciones">${dormido ? `<button class="bj-boton claro" data-cerrar>${t('jefe.ahora_no')} ${kbd('Esc')}</button>`
      : `<button class="bj-boton claro" data-cerrar>${t('jefe.ahora_no')} ${kbd('Esc')}</button><button class="bj-boton" data-ya><span class="k">戦</span> ${ej === 'vencido' ? t('jefe.revancha') : t('jefe.a_luchar')} <kbd>↵</kbd></button>`}</div></div>`;
  V().appendChild(capa);
  reservas(capa, jefes);
  inclinable($('.panel', capa), 4);
  gsap.to(capa, { opacity: 1, duration: 0.25 });
  gsap.fromTo($('.panel', capa), { y: 90, scale: 0.85, rotate: -3 }, { y: 0, scale: 1, rotate: 0, duration: 0.7, ease: 'back.out(1.7)' });
  gsap.fromTo($('.figura', capa), { y: 60, scale: 0.4 }, { y: 0, scale: 1, duration: 0.8, delay: 0.1, ease: 'back.out(2.4)' });
  const cerrar = () => { removeEventListener('keydown', tecla); gsap.to(capa, { opacity: 0, duration: 0.2, onComplete: () => capa.remove() }); };
  const ya = () => { removeEventListener('keydown', tecla); sonar('toque'); location.hash = 'jefe/' + j.region; };
  const tecla = (e) => {
    if (e.defaultPrevented) return; // el Intro que abrió la ficha desde una medalla no debe lanzar la batalla
    if (e.key === 'Escape') { e.preventDefault(); cerrar(); }
    else if (e.key === 'Enter' && !dormido && !e.target.closest?.('[data-cerrar]')) { e.preventDefault(); ya(); }
    else if (dormido) teclaPlan(e, capa);
  };
  addEventListener('keydown', tecla);
  capa.addEventListener('click', (e) => { if (e.target === capa) cerrar(); });
  $('[data-cerrar]', capa).onclick = cerrar;
  if ($('[data-ya]', capa)) $('[data-ya]', capa).onclick = ya;
  if (dormido) {
    sonar('fallo'); gsap.fromTo($('.figura', capa), { rotate: -8 }, { rotate: 0, duration: 0.9, delay: 0.3, ease: 'elastic.out(1, 0.3)' });
    montarPlan($('.cm-plan-hueco', capa), +j.region, r, j, () => removeEventListener('keydown', tecla));
  }
}

// ───────────────────────── BATALLA ─────────────────────────
const TIPO = { radical: t('jefe.tipo.radical'), kanji: t('jefe.tipo.kanji'), vocab: t('jefe.tipo.vocab') };
const caracter = (it) => (it.tipo === 'vocab' ? it.palabra : it.caracter);
function validas(it, hab) {
  if (hab === 'sig') return it.tipo === 'radical' ? [it.nombre, ...(it.alt || [])] : it.tipo === 'kanji' ? [it.clave, ...(it.alt || [])] : [it.es, ...(it.alt || []), it.en];
  if (it.tipo === 'kanji') return it.lecturas_validas || [];
  return String(it.lectura || '').split(/[、,，/／]/);
}
function comprobar(it, hab, resp) {
  if (hab === 'sig') {
    if (/^[぀-ヿ]+$/.test(resp.trim())) return { aviso: t('jefe.aviso.sig') };
    return compararSignificado(resp, validas(it, 'sig'));
  }
  const kana = normLectura(aKana(resp, true));
  if (!kana) return { ok: false };
  if (/[a-z]/i.test(kana)) return { aviso: t('jefe.aviso.kana') };
  const ok = validas(it, 'lec').map(normLectura).includes(kana);
  if (!ok && compararSignificado(resp, validas(it, 'sig')).ok) return { aviso: t('jefe.aviso.lec') };
  return { ok, exacto: ok };
}
function textoRespuesta(it, hab) {
  if (hab === 'sig') return it.tipo === 'radical' ? it.nombre : it.tipo === 'kanji' ? it.clave : (it.es || it.en);
  if (it.tipo === 'kanji') { const u = (it.lecturas || []).map((l) => l.lectura); return [...new Set(u.length ? u : it.lecturas_validas)].join('、'); }
  return it.lectura;
}

const PULLAS = {
  fallo: [t('jefe.pulla.fallo1'), t('jefe.pulla.fallo2'), t('jefe.pulla.fallo3'), t('jefe.pulla.fallo4'), t('jefe.pulla.fallo5')],
  tiempo: [t('jefe.pulla.tiempo1'), t('jefe.pulla.tiempo2'), t('jefe.pulla.tiempo3')],
  golpe: [t('jefe.pulla.golpe1'), t('jefe.pulla.golpe2'), t('jefe.pulla.golpe3'), t('jefe.pulla.golpe4'), t('jefe.pulla.golpe5')],
  apurado: [t('jefe.pulla.apurado1'), t('jefe.pulla.apurado2'), t('jefe.pulla.apurado3')],
};

let B = null;              // estado de la batalla en curso
let lienzoMochi = null, mochi = null;
let tecla = null;
addEventListener('keydown', (e) => { if (tecla && V()?.classList.contains('activa')) tecla(e); });

registrar('jefe', {
  seccion: '#v-jefe',
  async entrar([region]) { estilos(); await empezar(+region || 0); },
  async actualizar([region]) { await empezar(+region || 0); },
  salir() { terminar(); },
  atajos: () => !B || B.fase === 'fin' || B.fase === 'intro', // mientras hay pregunta, las letras son para responder
  volver() { location.hash = 'camino'; },
  contexto: () => 'camino',
});

function terminar() {
  tecla = null;
  if (!B) return;
  B.vivo = false;
  B.reloj?.kill(); B.parpadeo?.kill(); B.idle?.forEach((t) => t.kill()); B.intro?.kill();
  B.chispas?.ro.disconnect(); B.chispas?.limpiar();
  gsap.globalTimeline.timeScale(1);
  if (lienzoMochi) { gsap.killTweensOf(lienzoMochi); lienzoMochi.style.display = 'none'; document.body.appendChild(lienzoMochi); }
  B = null;
}

async function empezar(region) {
  terminar();
  const id = Symbol('batalla');
  B = { id, vivo: true, cargando: true };
  let datos, regiones;
  try { [datos, regiones] = await Promise.all([api(`/api/jefe/${region}`), api('/api/camino').catch(() => [])]); }
  catch (e) { if (B?.id === id) { B = null; pantallaNoDisponible(region, e); } return; }
  if (B?.id !== id) return;
  if (!datos?.preguntas?.length) { B = null; return pantallaNoDisponible(region, new Error(t('jefe.sin_preguntas'))); }
  if (!estado.inicio) estado.inicio = await api('/api/inicio').catch(() => null);
  const j = datos.jefe, r = regiones[region] || { nombre: j.region_nombre || '', jp: j.region_jp || '' };
  const vidaMax = Math.max(1, +j.vida || 100);
  Object.assign(B, { cargando: false, region, j, r, vidaMax, vida: vidaMax, corazones: 3, combo: 0, mejor: 0, aciertos: 0, respondidas: 0, dano: 0, ki: 0,
    cola: datos.preguntas.slice(), todas: datos.preguntas.slice(), fase: 'intro', ronda: 0 });
  await montarEscena();
  if (!vivo(id)) return;
  setTimeout(() => { if (vivo(id)) intro(); }, 650); // que la puerta shoji termine de abrirse
}
const vivo = (id) => B && B.vivo && B.id === id;

function pantallaNoDisponible(region, e) {
  V().innerHTML = `<div class="bj"><div class="bj-mundo"><div class="bj-pared"></div><div class="bj-zocalo"></div><div class="bj-suelo"><div class="bj-tatami"></div></div></div>
    <div class="bj-vacio"><div class="panel ficha"><div class="pop" style="font-size:72px;--trazo:14px">封</div>
    <h2 style="font:700 28px var(--f-texto);margin:12px 0 4px">${t('jefe.dormido.tit')}</h2>
    <p style="color:var(--tinta-2);margin:0 auto 20px;max-width:400px">${e?.message && !/^\d+$/.test(e.message) ? esc(e.message) : t('jefe.dormido.p')}</p>
    <button class="bj-boton" data-camino>${t('jefe.volver_camino')} <kbd>↵</kbd></button></div></div></div>`;
  $('[data-camino]', V()).onclick = () => { location.hash = 'camino'; };
  tecla = (ev) => { if (ev.key === 'Enter') location.hash = 'camino'; };
  gsap.fromTo($('.bj-vacio .panel', V()), { y: 60, opacity: 0, scale: 0.9 }, { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.6)' });
}

async function montarEscena() {
  const { j, r } = B;
  const jpLargo = [...(j.jp || '')].length > 2;
  V().innerHTML = `<div class="bj" style="--tono:${tono(j)}">
    <div class="bj-mundo">
      <div class="bj-pared"></div><div class="bj-luz" style="--aura:${tono(j)}99"></div>
      <div class="bj-zocalo"></div><div class="bj-suelo"><div class="bj-tatami"></div></div>
      <svg class="bj-atrezo taza" viewBox="0 0 90 70"><ellipse cx="45" cy="62" rx="40" ry="6" fill="rgba(40,24,8,.35)"/><path d="M14 18h62l-6 40a8 8 0 0 1-8 7H28a8 8 0 0 1-8-7Z" fill="#6d7a4a"/><ellipse cx="45" cy="18" rx="31" ry="7" fill="#8a9a5e"/><ellipse cx="45" cy="19" rx="26" ry="5" fill="#c9c27a"/></svg>
      <div class="bj-jefe" style="--tono:${tono(j)}">
        <div class="bj-aura"></div>
        <div class="bj-escala"><div class="bj-sombra"></div><div class="bj-golpe"><div class="bj-tiemblo"><div class="bj-flota"><div class="bj-cuerpo"></div></div></div></div></div>
        <svg class="bj-tajos"></svg>
        <div class="bj-bocadillo"></div>
      </div>
      <svg class="bj-atrezo geta" viewBox="0 0 300 170"><rect x="10" y="40" width="300" height="46" rx="12" fill="#4a3322"/><rect x="10" y="40" width="300" height="12" rx="6" fill="#6f4c30"/><rect x="40" y="96" width="300" height="46" rx="12" fill="#3d2a1c"/><rect x="40" y="96" width="300" height="12" rx="6" fill="#5e412a"/></svg>
      <svg class="bj-atrezo nigiri" viewBox="0 0 250 180"><ellipse cx="130" cy="120" rx="110" ry="50" fill="#f3efe6"/><path d="M20 100C40 40 200 20 240 80C250 110 200 120 130 115C70 112 25 125 20 100Z" fill="#f28a4a"/><path d="M60 70C90 60 120 62 150 80M80 95C110 80 150 82 190 98M120 58C150 52 180 58 210 72" stroke="#fde2cc" stroke-width="7" fill="none" stroke-linecap="round"/></svg>
    </div>
    <div class="bj-hud">
      <button class="bj-boton claro peq bj-huir" data-huir>${t('jefe.huir')} ${kbd('Esc')}</button>
      <div class="bj-placa ficha" style="--tono:${tono(j)}">
        <div class="jp ${jpLargo ? 'largo' : ''}">${esc(j.jp)}</div>
        <div class="nombre"><span>${esc(j.nombre)}</span><small>${r.nombre ? t('jefe.placa.nivel_region', { n: esc(j.nivel ?? B.region + 1), region: esc(r.nombre) }) : t('jefe.placa.nivel', { n: esc(j.nivel ?? B.region + 1) })}</small></div>
        <div class="bj-vida"><i class="fantasma"></i><i class="llena"></i><span class="marcas"></span><span class="brillo"></span><b>${mil(B.vida)} / ${mil(B.vidaMax)}</b></div>
      </div>
      <div class="hueco"></div>
      <div class="bj-yo ficha">
        <div class="fila"><span class="etq">Mochi</span><div class="bj-corazones">${[0, 1, 2].map((n) => `<div class="bj-corazon" data-n="${n}">${corazon(true, n)}</div>`).join('')}</div></div>
        <div class="fila"><span class="bj-ki-t">必殺</span><div class="bj-ki">${'<i></i>'.repeat(5)}</div></div>
      </div>
    </div>
    <div class="bj-combo"><b class="pop">0</b><span>${t('jefe.combo')}</span><em>×1</em></div>
    <div class="bj-pregunta"></div>
    <canvas class="bj-lienzo"></canvas>
    <div class="bj-fx"></div>
    <svg class="bj-zarpazo"></svg>
    <div class="bj-velo"></div><div class="bj-vineta"></div><div class="bj-destello"></div>
  </div>`;
  const raiz = $('.bj', V());
  // el foco del input no debe desplazar el escenario (overflow:hidden también se desplaza)
  [raiz, V()].forEach((c) => c.addEventListener('scroll', () => { c.scrollTop = 0; c.scrollLeft = 0; }));
  B.el = {
    raiz, mundo: $('.bj-mundo', raiz), jefe: $('.bj-jefe', raiz), escala: $('.bj-escala', raiz), golpe: $('.bj-golpe', raiz), tiemblo: $('.bj-tiemblo', raiz), flota: $('.bj-flota', raiz), cuerpo: $('.bj-cuerpo', raiz),
    sombra: $('.bj-sombra', raiz), tajos: $('.bj-tajos', raiz), bocadillo: $('.bj-bocadillo', raiz), hud: $('.bj-hud', raiz), placa: $('.bj-placa', raiz), vida: $('.bj-vida', raiz),
    yo: $('.bj-yo', raiz), combo: $('.bj-combo', raiz), pregunta: $('.bj-pregunta', raiz), fx: $('.bj-fx', raiz), zarpazo: $('.bj-zarpazo', raiz),
    velo: $('.bj-velo', raiz), vineta: $('.bj-vineta', raiz), destello: $('.bj-destello', raiz), huir: $('[data-huir]', raiz),
  };
  B.chispas = new Chispas($('.bj-lienzo', raiz));
  B.el.huir.onclick = () => { location.hash = 'camino'; };
  inclinable(B.el.placa, 5); inclinable(B.el.yo, 5);

  // ilustración del jefe en línea
  B.el.cuerpo.innerHTML = await svgEnLinea(B.j, 'bj' + Date.now().toString(36) + '-');
  const svg = $('svg', B.el.cuerpo);
  if (svg) { svg.removeAttribute('width'); svg.removeAttribute('height'); svg.setAttribute('preserveAspectRatio', 'xMidYMax meet'); }
  B.ojos = svg ? ojosDe(svg) : [];
  B.colas = svg ? exteriores($$('[id*="cola" i],[class*="cola" i],[data-cola]', svg).filter((el) => !el.closest('defs,clipPath,mask'))) : [];
  // su sombra de contacto viene pintada en el SVG: aquí la pone el suelo, que el yōkai flota
  if (svg) $$('ellipse', svg).filter((e) => /-s\)$/.test(e.getAttribute('fill') || '')).forEach((e) => e.setAttribute('display', 'none'));

  // Mochi (un solo lienzo para todas las batallas)
  if (!lienzoMochi) { lienzoMochi = document.createElement('canvas'); lienzoMochi.className = 'bj-mochi'; }
  B.el.mundo.appendChild(lienzoMochi); lienzoMochi.style.display = 'block';
  try {
    const eq = estado.inicio?.mochi?.equipo_visto ?? estado.inicio?.equipo ?? 0;
    if (!mochi) mochi = new Mascota(lienzoMochi, { isla: false, compacta: true, equipo: eq });
    else { mochi.equipar(eq, false); mochi.ajustar?.(); }
    mochi.quitarEquipo?.(estado.inicio?.mochi?.quitado || []);
    vestirMochi(mochi);
  } catch (e) { console.warn('Mochi no pudo montarse', e); }

  // estado inicial de la intro
  gsap.set(B.el.golpe, { y: -innerHeight, opacity: 0 });
  gsap.set(B.el.sombra, { scale: 0.2, opacity: 0 });
  gsap.set([B.el.placa, B.el.yo, B.el.huir], { y: -130, opacity: 0 });
  gsap.set([$('.llena', B.el.vida), $('.fantasma', B.el.vida)], { width: '0%' });
  gsap.set(lienzoMochi, { x: -300, y: 0, rotate: 0, opacity: 0 });
}

function vidaIdle() {
  B.idle?.forEach((t) => t.kill());
  const { flota, cuerpo, sombra } = B.el;
  B.idle = SUAVE ? [] : [
    gsap.to(flota, { y: -16, duration: 1.9, yoyo: true, repeat: -1, ease: 'sine.inOut' }),
    gsap.fromTo(flota, { rotate: -1.8 }, { rotate: 1.8, duration: 3.1, yoyo: true, repeat: -1, ease: 'sine.inOut', transformOrigin: '50% 100%' }),
    gsap.to(cuerpo, { scaleY: 1.035, scaleX: 0.982, duration: 1.25, yoyo: true, repeat: -1, ease: 'sine.inOut' }),
    gsap.to(sombra, { scaleX: 0.84, opacity: 0.7, duration: 1.9, yoyo: true, repeat: -1, ease: 'sine.inOut' }),
  ];
  if (B.colas.length && !SUAVE) B.idle.push(gsap.to(B.colas, { rotate: 7, duration: 0.9, yoyo: true, repeat: -1, ease: 'sine.inOut', transformOrigin: '50% 100%', stagger: 0.2 }));
  const parpadear = () => {
    if (!B?.vivo) return;
    if (B.ojos.length) {
      const tl = gsap.timeline();
      tl.to(B.ojos, { scaleY: 0.08, duration: 0.07, transformOrigin: '50% 60%', ease: 'power2.in' }).to(B.ojos, { scaleY: 1, duration: 0.12, ease: 'power2.out' });
      if (Math.random() < 0.3) tl.to(B.ojos, { scaleY: 0.08, duration: 0.07, delay: 0.08 }).to(B.ojos, { scaleY: 1, duration: 0.12 });
    }
    B.parpadeo = gsap.delayedCall(rnd(1.6, 4.2), parpadear);
  };
  B.parpadeo?.kill(); B.parpadeo = gsap.delayedCall(1.2, parpadear);
}
const pausaIdle = (si) => B?.idle?.forEach((t) => (si ? t.pause() : t.resume()));

// ── coordenadas y efectos de pantalla ──
function centroDe(el, fx = 0.5, fy = 0.5) {
  const b = B.el.raiz.getBoundingClientRect(), r = el.getBoundingClientRect();
  return { x: r.left - b.left + r.width * fx, y: r.top - b.top + r.height * fy };
}
function temblor(fuerza = 10, dur = 0.4, el = B.el.mundo) {
  if (SUAVE) fuerza *= 0.15;
  const tl = gsap.timeline(), n = Math.max(4, Math.round(dur / 0.035));
  for (let i = 0; i < n; i++) { const f = fuerza * (1 - i / n); tl.to(el, { x: rnd(-f, f), y: rnd(-f, f), rotation: rnd(-f, f) * 0.04, duration: 0.035, ease: 'none' }); }
  tl.to(el, { x: 0, y: 0, rotation: 0, duration: 0.08, ease: 'power2.out' });
  return tl;
}
function destello(op = 0.55, dur = 0.3, color = '#fff8e6') {
  B.el.destello.style.background = color;
  gsap.fromTo(B.el.destello, { opacity: op }, { opacity: 0, duration: dur, ease: 'power2.out' });
}
function hablar(txt, ms = 1500) {
  const b = B.el.bocadillo; b.textContent = txt;
  gsap.killTweensOf(b);
  gsap.fromTo(b, { scale: 0.3, opacity: 0, rotate: -10 }, { scale: 1, opacity: 1, rotate: 0, duration: 0.45, ease: 'back.out(2.6)' });
  gsap.to(b, { scale: 0.8, opacity: 0, duration: 0.25, delay: ms / 1000, ease: 'power2.in' });
}
function rotulo(html, { color = 'var(--acento)', x = '50%', y = '40%', dur = 1.1, tam = 64 } = {}) {
  const el = document.createElement('div'); el.className = 'pop bj-rotulo'; el.innerHTML = html; el.style.color = color; el.style.left = x; el.style.top = y; el.style.fontSize = tam + 'px';
  B.el.fx.appendChild(el);
  gsap.set(el, { xPercent: -50, yPercent: -50 });
  const tl = gsap.timeline({ onComplete: () => el.remove() });
  tl.fromTo(el, { scale: 2.6, opacity: 0, rotate: -8 }, { scale: 1, opacity: 1, rotate: -3, duration: 0.38, ease: 'back.out(2.2)' })
    .to(el, { y: -30, opacity: 0, scale: 0.9, duration: 0.35, ease: 'power2.in' }, `+=${dur}`);
  return tl;
}
function rotuloPeq(txt, x, y, color = 'var(--luz)') {
  const el = document.createElement('div'); el.textContent = txt;
  el.style.cssText = `position:absolute;left:${x}px;top:${y}px;font:700 19px var(--f-texto);color:${color};text-shadow:0 2px 0 rgba(38,31,25,.7),0 0 10px rgba(38,31,25,.4);white-space:nowrap`;
  B.el.fx.appendChild(el); gsap.set(el, { xPercent: -50 });
  gsap.fromTo(el, { y: 0, opacity: 0 }, { y: -30, opacity: 1, duration: 0.4, ease: 'power2.out' });
  gsap.to(el, { opacity: 0, y: -50, duration: 0.4, delay: 1.1, onComplete: () => el.remove() });
}
// un SVG superpuesto en píxeles reales (los trazos se dibujan con stroke-dashoffset)
function medirSVG(svg) { const r = svg.getBoundingClientRect(); svg.setAttribute('viewBox', `0 0 ${r.width} ${r.height}`); return { w: r.width, h: r.height }; }

// ── HUD ──
function pintarVida(antes) {
  const pct = 100 * B.vida / B.vidaMax, v = B.el.vida;
  gsap.to($('.llena', v), { width: pct + '%', duration: 0.18, ease: 'power3.out' });
  gsap.to($('.fantasma', v), { width: pct + '%', duration: 0.7, delay: 0.45, ease: 'power2.inOut' });
  gsap.fromTo($('.brillo', v), { opacity: 0.85 }, { opacity: 0, duration: 0.35 });
  const o = { n: antes ?? B.vida };
  gsap.to(o, { n: B.vida, duration: 0.6, ease: 'power2.out', onUpdate: () => { $('b', v).textContent = `${mil(o.n)} / ${mil(B.vidaMax)}`; } });
  v.classList.toggle('critica', pct <= 30 && pct > 0);
  gsap.fromTo(B.el.placa, { rotate: rnd(-3, 3), scale: 1.04 }, { rotate: 0, scale: 1, duration: 0.5, ease: 'elastic.out(1.2, 0.4)' });
}
function pintarKi() {
  const pips = $$('.bj-ki i', B.el.yo);
  pips.forEach((p, k) => p.classList.toggle('on', k < B.ki));
  $('.bj-ki', B.el.yo).classList.toggle('listo', B.ki >= 4);
  if (B.ki > 0) gsap.fromTo(pips[B.ki - 1], { scale: 1.8 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
}
const multiplicador = (c) => (c >= 8 ? 2 : c >= 5 ? 1.5 : c >= 3 ? 1.25 : 1);
const X_ESPECIAL = 2.5; // el golpe especial (必殺) multiplica el daño
function pintarCombo() {
  const c = B.el.combo;
  if (B.combo < 2) return;
  $('b', c).textContent = B.combo; $('em', c).textContent = '×' + dec(multiplicador(B.combo));
  c.classList.toggle('fuego', B.combo >= 5);
  if (B.combo >= 5) { const p = centroDe($('b', c)); B.chispas.emitir(12, { x: p.x, y: p.y + 30, ang: -Math.PI / 2, abanico: 0.7, vmin: 120, vmax: 320, g: -200, roce: 0.96, tipo: 'estrella', colores: ['#f2b43a', '#ff7a2e', '#fffaf0'], tmin: 4, tmax: 8, dmin: 0.5, dmax: 0.9 }); }
  gsap.killTweensOf(c);
  gsap.set(c, { opacity: 1, y: 0, rotate: 0 });
  gsap.fromTo($('b', c), { scale: 1.9, rotate: rnd(-14, 14) }, { scale: 1, rotate: 0, duration: 0.55, ease: 'back.out(3)' });
  gsap.fromTo($('em', c), { scale: 0.4 }, { scale: 1, duration: 0.4, delay: 0.08, ease: 'back.out(3)' });
}
function romperCombo() {
  const c = B.el.combo, p = centroDe(c);
  gsap.killTweensOf(c);
  gsap.timeline().to(c, { rotate: 14, y: 30, duration: 0.25, ease: 'power2.in' }).to(c, { y: 120, opacity: 0, rotate: 30, duration: 0.45, ease: 'power2.in' })
    .add(() => { $('b', c).textContent = '0'; c.classList.remove('fuego'); gsap.set(c, { y: 0, rotate: 0 }); });
  rotuloPeq(t('jefe.combo_roto'), p.x, p.y + 40);
}

// ojos para parpadear: ganchos explícitos (class/id «ojo», data-parpadeo) o, en las ilustraciones del juego,
// cada iris recortado (<g clip-path="url(#…-oNNNN)">) junto a su blanco y su contorno, agrupados al vuelo
const exteriores = (l) => l.filter((el) => !l.some((o) => o !== el && o.contains(el)));
function ojosDe(svg) {
  const explicitos = exteriores($$('[id*="ojo" i],[class*="ojo" i],[id*="eye" i],[class*="eye" i],[data-parpadeo]', svg).filter((el) => !el.closest('defs,clipPath,mask')));
  if (explicitos.length) return explicitos;
  return $$('g[clip-path]', svg).filter((g) => /-o\d+\)/.test(g.getAttribute('clip-path'))).map((g) => {
    const contorno = g.previousElementSibling, blanco = contorno?.previousElementSibling;
    const piezas = [blanco, contorno].filter((e) => e && e.tagName === 'path' && !e.closest('defs'));
    const ojo = document.createElementNS('http://www.w3.org/2000/svg', 'g'); ojo.setAttribute('class', 'ojo-auto');
    g.parentNode.insertBefore(ojo, piezas[0] || g);
    [...piezas, g].forEach((e) => ojo.appendChild(e));
    return ojo;
  });
}
function cerrarOjos(ms = 260) {
  if (!B?.ojos?.length) return;
  gsap.timeline().to(B.ojos, { scaleY: 0.1, duration: 0.05, transformOrigin: '50% 55%', ease: 'power2.in' }).to(B.ojos, { scaleY: 1, duration: 0.14, delay: ms / 1000, ease: 'back.out(2)' });
}

// ───────────────────────── intro ─────────────────────────
function intro() {
  if (!B?.vivo) return;
  const { j, r, el } = B, id = B.id, raiz = el.raiz;
  const pres = document.createElement('div'); pres.className = 'bj-presenta';
  pres.innerHTML = `<span class="pegatina region">${r.nombre ? t('jefe.intro.region', { n: B.region + 1, region: esc(r.nombre) }) : t('jefe.region', { n: B.region + 1 })}</span>
    <b class="jp pop">${esc(j.jp)}</b><span class="nombre">${esc(j.nombre)}</span>${j.desc ? `<span class="desc">${esc(j.desc)}</span>` : ''}`;
  raiz.appendChild(pres);
  gsap.set(pres, { yPercent: -50 });
  const tl = gsap.timeline({ onComplete: () => { pres.remove(); if (vivo(id)) empezarRonda(); } });
  B.intro = tl;
  const desc = $('.desc', pres);
  tl.to(el.velo, { opacity: 1, duration: 0.3 })
    .add(() => sonar('taiko'), 0.1)
    .fromTo($('.region', pres), { y: -40, opacity: 0, rotate: -12 }, { y: 0, opacity: 1, rotate: -4, duration: 0.45, ease: 'back.out(2.5)' }, 0.15)
    .fromTo($('.jp', pres), { scale: 3.2, opacity: 0, rotate: -10 }, { scale: 1, opacity: 1, rotate: -2, duration: 0.5, ease: 'power4.in' }, 0.3)
    .add(() => { sonar('taiko'); temblor(14, 0.35); }, 0.8)
    .fromTo($('.nombre', pres), { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'back.out(2)' }, 0.9);
  if (desc) tl.fromTo(desc, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'power3.out' }, 1.05);
  tl.to(pres, { yPercent: -60, opacity: 0, scale: 0.9, duration: 0.4, ease: 'power2.in' }, 2.7)
    .to(el.velo, { opacity: 0, duration: 0.5 }, 2.8)
    // el yōkai cae del techo y aplasta el tatami
    .to(el.golpe, { y: 0, opacity: 1, duration: 0.42, ease: 'power3.in' }, 2.9)
    .to(el.sombra, { scale: 1, opacity: 1, duration: 0.42, ease: 'power3.in' }, 2.9)
    .add(() => {
      sonar('taiko'); temblor(20, 0.45);
      const p = centroDe(el.jefe, 0.5, 0.97);
      B.chispas.emitir(26, { x: p.x, y: p.y, ang: -Math.PI / 2, abanico: 1.4, vmin: 120, vmax: 420, g: 260, roce: 0.93, tipo: 'humo', colores: ['#e8dcc0', '#d6c7a2', '#f3ead6'], tmin: 14, tmax: 30, crece: 1.2, dmin: 0.6, dmax: 1.1, rx: 80 });
    }, 3.32)
    .fromTo(el.golpe, { scaleY: 0.72, scaleX: 1.22 }, { scaleY: 1, scaleX: 1, duration: 0.8, ease: 'elastic.out(1.2, 0.35)', immediateRender: false }, 3.32)
    .to([el.placa, el.yo, el.huir], { y: 0, opacity: 1, duration: 0.6, stagger: 0.07, ease: 'back.out(1.8)' }, 3.4)
    .to(lienzoMochi, { x: 0, opacity: 1, duration: 0.7, ease: 'back.out(1.6)', onStart: () => { try { mochi?.saludar(); } catch {} } }, 3.45)
    .to($('.llena', el.vida), { width: '100%', duration: 0.8, ease: 'power2.out', onUpdate() { if (Math.random() < 0.3) sonar('toque'); } }, 3.6)
    .set($('.fantasma', el.vida), { width: '100%' }, 4.4)
    .add(() => { vidaIdle(); sonar('taiko'); rotulo(`いざ、勝負！<small>${t('jefe.a_luchar')}</small>`, { y: '42%', dur: 0.7, tam: 72 }); }, 4.3)
    .to({}, { duration: 1.2 });
  // saltar la intro con Intro o un clic: se acelera, no se corta
  const saltar = () => { if (tl.progress() < 0.98) tl.timeScale(5); };
  tecla = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); saltar(); } };
  raiz.addEventListener('pointerdown', function uno(e) { if (!vivo(id) || B.fase !== 'intro') return raiz.removeEventListener('pointerdown', uno); if (!e.target.closest('button')) saltar(); });
}

// ───────────────────────── rondas ─────────────────────────
const tiempoPara = (hab) => (hab === 'lec' ? 22 : 18) - Math.min(6, Math.floor(B.region / 5));
function siguientePregunta() {
  if (!B.cola.length) B.cola = B.todas.slice().sort(() => Math.random() - 0.5);
  let q = B.cola.shift();
  if (B.ultimo && q.item.id === B.ultimo && B.cola.length) { B.cola.push(q); q = B.cola.shift(); } // no repetir el mismo item seguido
  B.ultimo = q.item.id;
  return q;
}
function empezarRonda() {
  if (!B?.vivo) return;
  B.fase = 'pregunta'; B.ronda++;
  const q = B.q = siguientePregunta(), it = q.item, hab = q.habilidad, id = B.id;
  const txt = caracter(it) || '？', n = [...txt].length;
  B.tiempo = tiempoPara(hab);
  const L = 2 * Math.PI * 36;
  B.el.pregunta.innerHTML = `<div class="bj-carta ficha">
    <span class="pegatina ${hab === 'sig' ? 'anil' : ''}">${hab === 'sig' ? t('jefe.hab.sig') : t('jefe.hab.lec')}</span>
    <div class="bj-anillo"><svg viewBox="0 0 88 88"><circle class="pista" cx="44" cy="44" r="36" fill="none" stroke-width="8"/><circle class="prog" cx="44" cy="44" r="36" fill="none" stroke-width="8" stroke-linecap="round" stroke-dasharray="${L}" stroke-dashoffset="0"/></svg><b>${B.tiempo}</b></div>
    <div class="bj-palabra ${n > 4 ? 'larga' : n > 2 ? 'media' : ''}">${esc(txt)}</div>
    <div class="bj-pista">${hab === 'sig' ? (it.tipo === 'radical' ? t('jefe.pista.radical', { tipo: TIPO[it.tipo] }) : t('jefe.pista.sig', { tipo: TIPO[it.tipo] || '' })) : t('jefe.pista.lec', { tipo: TIPO[it.tipo] || '' })}</div>
    <form class="bj-form" autocomplete="off"><input id="bj-resp" spellcheck="false" autocapitalize="off" placeholder="${hab === 'sig' ? t('jefe.placeholder.sig') : 'よみかた…'}"><button class="bj-boton" type="submit"><span class="k">斬</span><span class="t">${t('jefe.atacar')}</span></button></form>
    <div class="bj-solucion"></div>
    <div class="bj-ayuda">${t('jefe.ayuda', { intro: kbd('Intro') })}</div>
    <div class="bj-sello">正</div><div class="pop bj-tiempo">${t('jefe.tiempo')}</div>
  </div>`;
  const carta = $('.bj-carta', B.el.pregunta), inp = $('#bj-resp', carta), form = $('.bj-form', carta);
  encajar($('.bj-palabra', carta), { caja: $('.bj-palabra', carta), margen: 0.02, max: (n) => (n === 1 ? 84 : 72), umbral: 0 });
  inclinable(carta, 3);
  gsap.fromTo(carta, { y: 160, rotateX: 35, opacity: 0 }, { y: 0, rotateX: 0, opacity: 1, duration: 0.55, ease: 'back.out(1.5)' });
  gsap.fromTo($('.pegatina', carta), { scale: 0, rotate: -40 }, { scale: 1, rotate: -4, duration: 0.5, delay: 0.2, ease: 'back.out(3)' });
  gsap.fromTo($('.bj-anillo', carta), { scale: 0, rotate: -90 }, { scale: 1, rotate: 0, duration: 0.6, delay: 0.15, ease: 'back.out(2.4)' });
  gsap.fromTo($('.bj-palabra', carta), { scale: 0.6, opacity: 0, filter: 'blur(6px)' }, { scale: 1, opacity: 1, filter: 'blur(0px)', duration: 0.6, delay: 0.12, ease: 'back.out(1.8)' });
  setTimeout(() => { if (vivo(id)) inp.focus({ preventScroll: true }); }, 60);
  if (hab === 'lec') inp.addEventListener('input', () => { const v = aKana(inp.value); if (v !== inp.value) { inp.value = v; inp.setSelectionRange(v.length, v.length); } });
  form.onsubmit = (e) => { e.preventDefault(); if (B.fase === 'resuelto') return seguir(); if (B.fase !== 'pregunta') return; const v = hab === 'lec' ? aKana(inp.value, true) : inp.value; if (!v.trim()) return; responder(v); };
  tecla = (e) => { if (e.target === inp) return; if (e.key === 'Enter' && B.fase === 'resuelto') { e.preventDefault(); seguir(); } else if (B.fase === 'pregunta' && e.key.length === 1 && !e.ctrlKey && !e.metaKey) inp.focus({ preventScroll: true }); };
  // reloj
  const aro = $('.prog', carta), cifra = $('.bj-anillo b', carta), anillo = $('.bj-anillo', carta);
  B.t0 = performance.now() + 500; B.seg = B.tiempo; B.rel = { t: B.tiempo };
  B.reloj?.kill();
  B.reloj = gsap.to(B.rel, { t: 0, duration: B.tiempo, delay: 0.5, ease: 'none', onUpdate: () => {
    const u = B.rel.t / B.tiempo; aro.setAttribute('stroke-dashoffset', L * (1 - u));
    const s = Math.ceil(B.rel.t);
    if (s !== B.seg) { B.seg = s; cifra.textContent = s; if (s <= 3 && s > 0) { sonar('toque'); gsap.fromTo(anillo, { scale: 1.25 }, { scale: 1, duration: 0.35, ease: 'back.out(3)' }); } }
    const prisa = u < 0.3; anillo.classList.toggle('prisa', prisa); B.el.jefe.classList.toggle('carga', prisa);
  }, onComplete: () => { if (vivo(id) && B.fase === 'pregunta') responder(null); } });
}

function responder(valor) {
  const { q } = B, it = q.item, hab = q.habilidad, carta = $('.bj-carta', B.el.pregunta), inp = $('#bj-resp', carta);
  let c = { ok: false };
  if (valor != null) {
    c = comprobar(it, hab, valor);
    if (c.aviso) { gsap.fromTo(inp, { x: -10 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' }); const p = centroDe(inp, 0.5, 0); rotuloPeq(c.aviso, p.x, p.y - 30, 'var(--oro-luz)'); return; }
  }
  B.fase = 'evaluando';
  const ms = performance.now() - B.t0;
  B.reloj?.kill(); B.el.jefe.classList.remove('carga'); $('.bj-anillo', carta).classList.remove('prisa');
  inp.readOnly = true; if (valor != null) inp.value = valor;
  inp.classList.add(c.ok ? 'bien' : 'mal');
  B.respondidas++;
  if (c.ok) acierto(c, ms); else fallo(valor == null);
}

// ───────────────────────── acierto: golpe ─────────────────────────
async function acierto(c, ms) {
  const id = B.id, el = B.el, carta = $('.bj-carta', el.pregunta);
  B.aciertos++; B.combo++; B.mejor = Math.max(B.mejor, B.combo); B.ki = Math.min(5, B.ki + 1);
  const rapido = ms < B.tiempo * 1000 * 0.4;
  const especial = B.ki >= 5;
  const mult = multiplicador(B.combo) * (rapido ? 1.5 : 1) * (especial ? X_ESPECIAL : 1);
  const dano = Math.max(1, Math.round(B.vidaMax / 10 * mult * rnd(0.9, 1.1)));
  const antes = B.vida;
  B.vida = Math.max(0, B.vida - dano); B.dano += antes - B.vida;
  const final = B.vida <= 0;
  pintarKi();
  // sello en la carta
  const sello = $('.bj-sello', carta); sello.textContent = especial ? '斬' : '正';
  gsap.fromTo(sello, { scale: 2.6, opacity: 0, rotate: -30 }, { scale: 1, opacity: 0.95, rotate: -12, duration: 0.28, ease: 'power4.in', onComplete: () => { sonar('sello'); gsap.fromTo(carta, { y: 0 }, { y: 5, duration: 0.07, yoyo: true, repeat: 1 }); } });
  if (c.exacto === false && c.con) { const p = centroDe($('#bj-resp', carta), 0.5, 0); rotuloPeq(t('jefe.casi', { con: c.con }), p.x, p.y - 26, 'var(--oro-luz)'); }
  sonar('acierto', B.combo);
  try { mochi?.expresion(especial || B.combo >= 10 ? 'estrella' : B.combo >= 5 ? 'risa' : 'feliz', 1100); mochi?.celebrar(); } catch {}

  if (especial) { await corteEspecial(); if (!vivo(id)) return; }
  // Mochi se lanza
  gsap.timeline().to(lienzoMochi, { x: 90, y: -30, rotate: 10, duration: 0.14, ease: 'power3.out' }).to(lienzoMochi, { x: 0, y: 0, rotate: 0, duration: 0.6, ease: 'elastic.out(1, 0.45)' });
  await espera(110);
  if (!vivo(id)) return;
  impacto({ dano, rapido, especial, final });
  pintarVida(antes);
  pintarCombo();
  if (especial) { B.ki = 0; setTimeout(() => { if (vivo(id)) pintarKi(); }, 700); }
  // hitos del combo
  if (!final) {
    const lado = innerWidth > 760 ? { x: '22%', y: '38%' } : { x: '50%', y: '30%' };
    if ([3, 5, 8].includes(B.combo)) sonar('tramo', B.combo === 8 ? 10 : B.combo); // la fanfarria de racha del estudio
    if (B.combo === 3) rotulo(t('jefe.rotulo.ritmo', { x: dec(multiplicador(3)) }), { ...lado, tam: 46, dur: 0.6 });
    else if (B.combo === 5) { rotulo(t('jefe.rotulo.racha', { x: dec(multiplicador(5)) }), { ...lado, tam: 58, dur: 0.7 }); lluviaPetalos(40); }
    else if (B.combo === 8) { rotulo(t('jefe.rotulo.imparable', { x: dec(multiplicador(8)) }), { ...lado, tam: 58, dur: 0.8, color: 'var(--oro-luz)' }); lluviaPetalos(70); }
    if (B.ki === 4) { const p = centroDe($('.bj-ki', el.yo), 0.5, 1); rotuloPeq(t('jefe.ki4'), p.x - 40, p.y + 14, 'var(--oro-luz)'); }
    if (B.vida / B.vidaMax <= 0.3 && antes / B.vidaMax > 0.3) hablar(elegir(PULLAS.apurado), 1300);
    else if (rapido || Math.random() < 0.25) hablar(elegir(PULLAS.golpe), 900);
  }
  if (final) return victoria();
  await espera(especial ? 1100 : rapido ? 950 : 850);
  if (!vivo(id)) return;
  await salirCarta(true);
  if (vivo(id)) empezarRonda();
}
function lluviaPetalos(n) {
  const w = B.el.raiz.clientWidth;
  B.chispas.emitir(n, { x: w / 2, y: -20, rx: w / 2, ang: Math.PI / 2, abanico: 0.4, vmin: 40, vmax: 140, g: 60, roce: 0.995, tipo: 'petalo', colores: ['#f2a3a3', '#f7c6cf', '#fbe1e6', '#f2b6c4'], tmin: 6, tmax: 11, dmin: 2.5, dmax: 4, ond: 60, retraso: 0.8 });
}
async function salirCarta(bien) {
  const carta = $('.bj-carta', B?.el.pregunta);
  if (!carta) return;
  await gsap.to(carta, bien ? { y: 120, rotateX: -25, opacity: 0, duration: 0.3, ease: 'power2.in' } : { y: 140, opacity: 0, duration: 0.3, ease: 'power2.in' });
}

// el tajo, el número y el yōkai que encaja el golpe
function impacto({ dano, rapido, especial, final }) {
  const el = B.el;
  pausaIdle(true);
  const parada = final ? 0.34 : especial ? 0.2 : rapido ? 0.12 : 0.08;
  // tajos: uno, dos en cruz o tres
  const { w, h } = medirSVG(el.tajos);
  const n = especial ? 3 : B.combo >= 3 || rapido ? 2 : 1;
  let trazos = '<defs><filter id="bj-desenfoque" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4"/></filter></defs>';
  for (let k = 0; k < n; k++) {
    const a = (k === 1 ? rnd(110, 140) : rnd(20, 42) + k * 18) * Math.PI / 180, cx = w * (0.5 + rnd(-0.05, 0.05)), cy = h * (0.46 + rnd(-0.05, 0.05)), L = Math.min(w, h) * 0.78;
    const dx = Math.cos(a) * L / 2, dy = Math.sin(a) * L / 2, cv = rnd(-0.12, 0.12) * L;
    const d = `M${cx - dx} ${cy - dy} Q${cx - dy * 0.25 + cv} ${cy + dx * 0.25 - cv} ${cx + dx} ${cy + dy}`;
    trazos += `<path d="${d}" fill="none" stroke="${especial ? '#f2661b' : '#f2b43a'}" stroke-width="${especial ? 22 : 16}" stroke-linecap="round" filter="url(#bj-desenfoque)" opacity=".95"/>
      <path d="${d}" fill="none" stroke="#fffaf0" stroke-width="${especial ? 9 : 6}" stroke-linecap="round"/>`;
  }
  el.tajos.innerHTML = trazos;
  $$('path', el.tajos).forEach((p, k) => {
    const Lp = p.getTotalLength(), grupo = Math.floor(k / 2);
    gsap.fromTo(p, { strokeDasharray: Lp, strokeDashoffset: Lp, opacity: 1 }, { strokeDashoffset: 0, duration: 0.11, delay: grupo * 0.08, ease: 'power4.out' });
    gsap.to(p, { opacity: 0, duration: 0.3, delay: 0.26 + grupo * 0.08 });
  });
  cerrarOjos(final ? 900 : especial ? 500 : 260);
  // destello del jefe + parón
  const sombraF = 'drop-shadow(0 14px 10px rgba(38,24,8,.28))';
  gsap.set(el.cuerpo, { filter: `brightness(3.2) saturate(0) ${sombraF}` });
  gsap.to(el.cuerpo, { filter: `brightness(1) saturate(1) ${sombraF}`, duration: 0.25, delay: parada, ease: 'power2.out' });
  setTimeout(() => pausaIdle(false), (parada + 0.1) * 1000);
  // retroceso con squash; el yōkai se encoge según su vida
  gsap.timeline().to(el.golpe, { x: rnd(26, 46), rotate: rnd(5, 10), scaleX: 1.14, scaleY: 0.84, duration: 0.07, ease: 'power4.out' })
    .to(el.golpe, { x: 0, rotate: 0, scaleX: 1, scaleY: 1, duration: 0.7, delay: parada, ease: 'elastic.out(1.1, 0.35)' });
  if (!final) gsap.to(el.escala, { scale: 0.74 + 0.26 * (B.vida / B.vidaMax), duration: 0.8, delay: parada, ease: 'elastic.out(1, 0.5)' });
  temblor(especial ? 30 : rapido ? 18 : 11, especial ? 0.55 : 0.35);
  destello(especial ? 0.8 : rapido ? 0.55 : 0.32, especial ? 0.5 : 0.28);
  sonar('taiko');
  // chispas
  const p = centroDe(el.jefe, 0.5, 0.48);
  B.chispas.emitir(especial ? 46 : 22, { x: p.x, y: p.y, abanico: Math.PI, vmin: 300, vmax: especial ? 1100 : 750, g: 700, roce: 0.93, tipo: 'chispa', colores: ['#fffaf0', '#f2b43a', '#ff7a2e'], tmin: 2.5, tmax: 5, dmin: 0.3, dmax: 0.6 });
  B.chispas.emitir(especial ? 22 : 10, { x: p.x, y: p.y, abanico: Math.PI, vmin: 150, vmax: 500, g: 500, roce: 0.95, tipo: 'estrella', colores: ['#f2b43a', '#fffaf0', '#f2a3a3'], tmin: 7, tmax: 14, dmin: 0.5, dmax: 0.9 });
  B.chispas.emitir(1, { x: p.x, y: p.y, vmin: 0, vmax: 0, g: 0, tipo: 'anillo', colores: ['#fffaf0'], tmin: 30, tmax: 30, crece: especial ? 9 : 5, dmin: 0.35, dmax: 0.35 });
  // número de daño que salta
  const num = document.createElement('div');
  num.className = 'pop bj-dano' + (especial ? ' esp' : rapido ? ' crit' : '');
  num.innerHTML = `${especial ? '<small>必殺</small>' : rapido ? `<small>${t('jefe.critico')}</small>` : ''}${mil(dano)}`;
  el.fx.appendChild(num);
  const q = centroDe(el.jefe, (innerWidth > 760 ? 0.86 : 0.6) + rnd(-0.04, 0.06), 0.2);
  gsap.set(num, { x: q.x, y: q.y, xPercent: -50, yPercent: -50 });
  gsap.timeline({ onComplete: () => num.remove() })
    .fromTo(num, { scale: 0.2, rotate: rnd(-25, 25) }, { scale: especial ? 1.2 : 1.15, rotate: rnd(-8, 8), duration: 0.22, ease: 'back.out(3)' })
    .to(num, { scale: 1, duration: 0.2 })
    .to(num, { x: q.x + rnd(40, 110), duration: 1.15, ease: 'power1.out' }, 0)
    .to(num, { y: q.y - (especial ? 130 : 95), duration: 0.45, ease: 'power2.out' }, 0)
    .to(num, { y: q.y + 70, opacity: 0, duration: 0.55, ease: 'power2.in' }, 0.8);
}

// cut-in del golpe especial (必殺)
async function corteEspecial() {
  const el = B.el;
  const c = document.createElement('div'); c.className = 'bj-corte';
  c.innerHTML = `<div class="kat">刀</div><div class="txt"><b>肉球斬り</b><span>${t('jefe.especial', { x: dec(X_ESPECIAL) })}</span></div><div class="kat">刀</div>`;
  el.raiz.appendChild(c);
  sonar('subida', 4); sonar('taiko');
  const tl = gsap.timeline();
  tl.to(el.velo, { opacity: 1, duration: 0.15 }, 0)
    .fromTo(c, { xPercent: -110 }, { xPercent: 0, duration: 0.28, ease: 'power4.out' }, 0)
    .fromTo($('.txt', c), { scale: 1.6, x: -80 }, { scale: 1, x: 0, duration: 0.5, ease: 'back.out(2)' }, 0.05)
    .to($('.txt', c), { x: 30, duration: 0.6, ease: 'none' }, 0.5)
    .add(() => sonar('taiko'), 0.45)
    .to(c, { xPercent: 110, duration: 0.25, ease: 'power4.in' }, 1.0)
    .to(el.velo, { opacity: 0, duration: 0.2 }, 1.05);
  await tl;
  c.remove();
}

// ───────────────────────── fallo: ataca el yōkai ─────────────────────────
async function fallo(porTiempo) {
  const id = B.id, el = B.el, carta = $('.bj-carta', el.pregunta), q = B.q, it = q.item, hab = q.habilidad;
  const comboAntes = B.combo;
  B.combo = 0; B.ki = Math.max(0, B.ki - 2);
  if (porTiempo) gsap.fromTo($('.bj-tiempo', carta), { scale: 2.4, opacity: 0, y: 0 }, { scale: 1, opacity: 1, y: -30, duration: 0.35, ease: 'back.out(2.6)' });
  sonar('fallo');
  // el yōkai coge impulso… y se lanza hacia la cámara
  pausaIdle(true);
  gsap.timeline()
    .to(el.golpe, { y: -30, scaleY: 1.1, scaleX: 0.92, rotate: -6, duration: 0.22, ease: 'power2.out' })
    .to(el.golpe, { y: 70, scaleX: 1.45, scaleY: 1.45, rotate: 4, duration: 0.14, ease: 'power4.in' })
    .add(() => zarpazo())
    .to(el.golpe, { y: 0, scaleX: 1, scaleY: 1, rotate: 0, duration: 0.7, ease: 'elastic.out(1, 0.5)' }, '+=0.12');
  await espera(360);
  if (!vivo(id)) return;
  sonar('taiko'); temblor(26, 0.5); temblor(10, 0.4, el.hud);
  gsap.fromTo(el.vineta, { opacity: 0.95 }, { opacity: 0, duration: 0.7, ease: 'power2.out' });
  destello(0.35, 0.3, '#ffd9cc');
  gsap.timeline().to(lienzoMochi, { x: -60, rotate: -14, y: 10, duration: 0.12, ease: 'power3.out' }).to(lienzoMochi, { x: 0, rotate: 0, y: 0, duration: 0.8, ease: 'elastic.out(1, 0.4)' });
  try { mochi?.expresion('triste', 1600); mochi?.apenado(); } catch {}
  gsap.fromTo(carta, { x: -16 }, { x: 0, duration: 0.6, ease: 'elastic.out(1, 0.3)' });
  romperCorazon();
  pintarKi();
  if (comboAntes >= 2) romperCombo();
  setTimeout(() => { if (vivo(id)) { pausaIdle(false); hablar(elegir(porTiempo ? PULLAS.tiempo : PULLAS.fallo), 1500); } }, 700);
  // la respuesta, para aprender de verdad
  const sol = $('.bj-solucion', carta);
  const truco = hab === 'lec' && it.mnemo_lectura ? it.mnemo_lectura : it.mnemo;
  sol.innerHTML = `<div class="linea">${t('jefe.solucion', { respuesta: `<b class="${hab === 'lec' ? '' : 'es'}">${esc(textoRespuesta(it, hab))}</b>` })}</div>${truco ? `<p>${negrita(truco)}</p>` : ''}`;
  sol.classList.add('si');
  $('.bj-ayuda', carta).innerHTML = B.corazones > 0 ? t('jefe.seguir_luchando', { intro: kbd('Intro') }) : '';
  gsap.fromTo(sol, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: 0.45, ease: 'power3.out' });
  $('.bj-form .bj-boton', carta).innerHTML = `<span class="t">${t('jefe.seguir')}</span> <kbd>↵</kbd>`;
  if (B.corazones <= 0) { await espera(1500); if (vivo(id)) derrota(); return; }
  B.fase = 'resuelto';
  $('#bj-resp', carta).focus({ preventScroll: true });
}
function seguir() {
  if (B?.fase !== 'resuelto') return;
  B.fase = 'saliendo';
  const id = B.id;
  salirCarta(false).then(() => { if (vivo(id)) empezarRonda(); });
}
function zarpazo() {
  // tres arañazos en media luna que se abren de golpe (una máscara recorre cada curva)
  const z = B.el.zarpazo, { w, h } = medirSVG(z), n = Date.now().toString(36);
  let defs = '', trazos = '';
  [0, 1, 2].forEach((k) => {
    const x0 = w * (0.36 + k * 0.1), y0 = h * (0.08 + k * 0.03), x2 = x0 - w * 0.2, y2 = h * (0.9 - k * 0.04);
    const cx = (x0 + x2) / 2 + w * 0.07, cy = (y0 + y2) / 2 - h * 0.03;
    const L = Math.hypot(x2 - x0, y2 - y0), nx = -(y2 - y0) / L, ny = (x2 - x0) / L, g = 30 - k * 3;
    const d = `M${x0} ${y0}Q${cx + nx * g} ${cy + ny * g} ${x2} ${y2}Q${cx - nx * g} ${cy - ny * g} ${x0} ${y0}Z`;
    const brillo = `M${x0} ${y0}Q${cx + nx * g * 0.5} ${cy + ny * g * 0.5} ${x2} ${y2}Q${cx + nx * g * 0.05} ${cy + ny * g * 0.05} ${x0} ${y0}Z`;
    defs += `<mask id="zp${n}${k}" maskUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}"><path class="guia" d="M${x0} ${y0}Q${cx} ${cy} ${x2} ${y2}" stroke="#fff" stroke-width="110" fill="none" stroke-linecap="round"/></mask>`;
    trazos += `<g mask="url(#zp${n}${k})"><path d="${d}" fill="#5e170c" transform="translate(5 8)" opacity=".45"/><path d="${d}" fill="#d8412a" stroke="#5e170c" stroke-width="5" stroke-linejoin="round"/><path d="${brillo}" fill="#ffc9b8" opacity=".85"/></g>`;
  });
  z.innerHTML = `<defs>${defs}</defs>${trazos}`;
  gsap.killTweensOf(z); gsap.set(z, { opacity: 1 });
  $$('.guia', z).forEach((p, k) => { const L = p.getTotalLength(); gsap.fromTo(p, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, duration: 0.13, delay: k * 0.055, ease: 'power4.out' }); });
  gsap.to(z, { opacity: 0, duration: 0.45, delay: 0.6, ease: 'power2.in' });
}
function romperCorazon() {
  B.corazones = Math.max(0, B.corazones - 1);
  const cz = $(`.bj-corazon[data-n="${B.corazones}"]`, B.el.yo);
  if (!cz) return;
  const [i, d] = $$('.mitad', cz), quedan = B.corazones;
  sonar('koto', 50, 0.1, 0.7);
  gsap.killTweensOf(cz);
  gsap.timeline()
    .to(cz, { scale: 1.5, duration: 0.12, ease: 'power2.out' })
    .to(i, { x: -10, y: 26, rotate: -35, opacity: 0, duration: 0.7, ease: 'power2.in', svgOrigin: '20 38' }, '+=0.05')
    .to(d, { x: 10, y: 26, rotate: 35, opacity: 0, duration: 0.7, ease: 'power2.in', svgOrigin: '20 38' }, '<')
    .to(cz, { scale: 1, duration: 0.3 }, '<')
    .add(() => { cz.innerHTML = corazon(false, 'v' + quedan); gsap.fromTo(cz, { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(3)' }); });
  $$('.bj-corazon', B.el.yo).slice(0, quedan).forEach((c, k) => gsap.fromTo(c, { y: 0 }, { y: -8, duration: 0.12, delay: k * 0.05, yoyo: true, repeat: 1, ease: 'power2.out' }));
  if (quedan === 1) gsap.to($('.bj-corazon[data-n="0"]', B.el.yo), { scale: 1.15, duration: 0.45, delay: 0.3, yoyo: true, repeat: -1, ease: 'sine.inOut' });
}

// ───────────────────────── victoria ─────────────────────────
async function victoria() {
  const id = B.id, el = B.el;
  B.fase = 'fin'; tecla = null; el.pregunta.inert = true; // la carta se va: fuera del Tab y sin el foco
  B.reloj?.kill(); B.parpadeo?.kill();
  // cámara lenta en el último golpe
  if (!SUAVE) { gsap.globalTimeline.timeScale(0.3); await espera(520); gsap.to(gsap.globalTimeline, { timeScale: 1, duration: 0.4 }); }
  if (!vivo(id)) return;
  gsap.to(el.pregunta, { y: 260, opacity: 0, duration: 0.5, ease: 'power2.in' });
  gsap.to(el.combo, { opacity: 0, duration: 0.3 });
  await espera(250);
  if (!vivo(id)) return;
  B.idle?.forEach((t) => t.kill());
  // el yōkai tiembla, parpadea y se esfuma: ¡ドロン!
  hablar(t('jefe.no_puede_ser'), 900);
  gsap.timeline()
    .to(el.tiemblo, { x: 5, duration: 0.04, yoyo: true, repeat: 17, ease: 'none' })
    .to(el.cuerpo, { opacity: 0.25, duration: 0.06, yoyo: true, repeat: 7, ease: 'none' }, 0.1)
    .to(el.golpe, { scaleY: 1.25, scaleX: 0.85, y: -30, duration: 0.25, ease: 'power2.out' }, 0.72)
    .to(el.golpe, { scaleX: 0, scaleY: 0, rotate: 200, y: -60, duration: 0.35, ease: 'back.in(2)' }, 0.97)
    .to(el.sombra, { scale: 0, opacity: 0, duration: 0.35 }, 0.97)
    .to($('.bj-aura', el.raiz), { opacity: 0, duration: 0.4 }, 0.97);
  await espera(1250);
  if (!vivo(id)) return;
  const p = centroDe(el.jefe, 0.5, 0.55);
  sonar('taiko'); sonar('taiko', 0.18); temblor(24, 0.6); destello(0.9, 0.8);
  B.chispas.emitir(40, { x: p.x, y: p.y, abanico: Math.PI, vmin: 100, vmax: 520, g: -30, roce: 0.9, tipo: 'humo', colores: ['#f3ead6', '#e5d8bb', '#fffaf0', '#d8c9a6'], tmin: 20, tmax: 46, crece: 1.4, dmin: 0.9, dmax: 1.6, rx: 40, ry: 40 });
  B.chispas.emitir(30, { x: p.x, y: p.y, abanico: Math.PI, vmin: 300, vmax: 800, g: 500, roce: 0.95, tipo: 'estrella', colores: ['#f2b43a', '#fffaf0', '#f2661b'], tmin: 8, tmax: 16, dmin: 0.6, dmax: 1.1 });
  rotulo('ドロン！', { y: '38%', tam: 100, dur: 0.7, color: 'var(--luz)' });
  await espera(900);
  if (!vivo(id)) return;
  // 勝利
  sonar('fanfarria');
  try { mochi?.expresion('risa', 4000); mochi?.celebrar(); setTimeout(() => { try { mochi?.celebrar(); } catch {} }, 900); } catch {}
  lluviaPetalos(90);
  const w = el.raiz.clientWidth;
  B.chispas.emitir(70, { x: w / 2, y: el.raiz.clientHeight * 0.45, abanico: 1.1, ang: -Math.PI / 2, vmin: 500, vmax: 1100, g: 700, roce: 0.985, tipo: 'confeti', colores: ['#f2661b', '#f2b43a', '#7c8f3c', '#2f4a7a', '#f2a3a3', '#f7efdf'], tmin: 8, tmax: 14, dmin: 2, dmax: 3.2, ond: 40 });
  // recompensa del servidor
  let rec = null;
  try { rec = (await api(`/api/jefe/${B.region}/resultado`, { ganado: true, aciertos: B.aciertos, total: B.respondidas })).recompensa; } catch (e) { console.warn(e); }
  if (!vivo(id)) return;
  panelVictoria(rec || {});
}

function panelVictoria(rec) {
  const el = B.el, o = rec.objeto, [rNombre, rColor, rToken] = RAREZA[o?.rareza] || [t('jefe.premio'), '#f2b43a', 'var(--aviso)'];
  const pct = B.respondidas ? Math.round(100 * B.aciertos / B.respondidas) : 0;
  const f = document.createElement('div'); f.className = 'bj-final';
  f.innerHTML = `<div class="panel ficha" style="--rar:${rToken}">
    ${B.corazones === 3 ? `<div class="bj-perfecto"><div><b>完璧</b>${t('jefe.perfecto')}</div></div>` : ''}
    <div class="titulo pop">勝利！</div>
    <p class="sub">${B.j.vencido ? t('jefe.victoria.revancha', { nombre: esc(B.j.nombre) }) : t('jefe.victoria.sub', { nombre: esc(B.j.nombre) })}</p>
    ${kageDice(B.corazones === 3 ? 'perfecto' : 'gana')}
    ${o ? `<div class="bj-premio"><div class="bj-rayos"></div><div class="gira"><div class="dorso">賞</div><div class="cara"><img src="/img/objetos/${encodeURIComponent(o.id)}.svg" alt=""></div></div>
        <span class="pegatina rar">${esc(rNombre)}</span></div>
      <div class="bj-obj"><b>${esc(o.nombre)}</b><span>${esc(o.jp || '')}</span>${o.desc ? `<p>${esc(o.desc)}</p>` : ''}</div>` : ''}
    <div class="bj-botin">${rec.monedas ? '<span class="pegatina oro"><img class="bj-koban-img" src="/img/iconos/koban.svg" alt="" onerror="this.outerHTML=\'<i class=&quot;bj-koban&quot;></i>\'"> ' + t('jefe.botin.koban', { n: '<b data-koban>0</b>' }) + '</span>' : ''}${rec.titulo ? `<span class="pegatina tinta">${t('jefe.botin.titulo', { titulo: esc(rec.titulo) })}</span>` : ''}${rec.tope_diario ? `<span class="pegatina tinta">${t('jefe.botin.tope')}</span>` : ''}</div>
    <div class="bj-cifras"><div><b>${B.aciertos}/${B.respondidas}</b><small>${t('jefe.cifras.aciertos_pct', { pct })}</small></div><div><b>${B.mejor}</b><small>${t('jefe.cifras.mejor')}</small></div><div><b>${3 - B.corazones}</b><small>${t('jefe.cifras.perdidos')}</small></div></div>
    <div class="bj-acciones"><button class="bj-boton claro" data-inicio>${t('jefe.inicio')} ${kbd('I')}</button><button class="bj-boton" data-camino>${t('jefe.volver_camino')} <kbd>↵</kbd></button></div></div>`;
  el.raiz.appendChild(f);
  const img = $('.cara img', f);
  if (img) img.addEventListener('error', () => { const s = document.createElement('div'); s.className = 'sin'; s.textContent = [...String(o.jp || '賞')].slice(0, 2).join(''); img.replaceWith(s); }, { once: true });
  const panel = $('.panel', f);
  inclinable(panel, 4);
  $('[data-camino]', f).onclick = () => { location.hash = 'camino'; };
  $('[data-inicio]', f).onclick = () => { location.hash = 'inicio'; };
  gsap.to(el.velo, { opacity: 0.8, duration: 0.5 });
  const tl = gsap.timeline();
  tl.fromTo(panel, { y: 300, rotate: -4, scale: 0.8 }, { y: 0, rotate: 0, scale: 1, duration: 0.8, ease: 'back.out(1.5)' })
    .fromTo($('.titulo', f), { scale: 3, opacity: 0, rotate: -12 }, { scale: 1, opacity: 1, rotate: -3, duration: 0.45, ease: 'power4.in', onComplete: () => { sonar('taiko'); } }, 0.35)
    .fromTo($('.sub', f), { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 }, 0.8);
  if (o) {
    const gira = $('.gira', f), p = $('.bj-premio', f);
    gsap.set($('.bj-obj', f), { opacity: 0 });
    tl.fromTo(p, { scale: 0, rotate: -30 }, { scale: 1, rotate: 0, duration: 0.6, ease: 'back.out(2)' }, 0.9)
      .to(gira, { rotateZ: 6, duration: 0.07, yoyo: true, repeat: 9, ease: 'none' }, 1.5)
      .to(gira, { rotateY: 180, rotateZ: 0, duration: 0.7, ease: 'back.out(1.6)', onStart: () => sonar('subida', 4) }, 2.25)
      .add(() => {
        if (!B?.vivo) return;
        const c = centroDe(p);
        const cols = { comun: ['#f7efdf', '#c2b27a'], raro: ['#7fb2ea', '#f7efdf'], epico: ['#c88cf0', '#f7efdf', '#f2b43a'], legendario: ['#f2b43a', '#fff3c2', '#f2661b'] }[o.rareza] || ['#f2b43a', '#f7efdf'];
        B.chispas.emitir(o.rareza === 'legendario' ? 90 : 55, { x: c.x, y: c.y, abanico: Math.PI, vmin: 250, vmax: 900, g: 400, roce: 0.95, tipo: 'estrella', colores: cols, tmin: 6, tmax: 14, dmin: 0.8, dmax: 1.5 });
        B.chispas.emitir(1, { x: c.x, y: c.y, vmin: 0, vmax: 0, g: 0, tipo: 'anillo', colores: [rColor], tmin: 60, tmax: 60, crece: 6, dmin: 0.5, dmax: 0.5 });
        destello(0.6, 0.5);
      }, 2.6)
      .fromTo($('.bj-obj', f), { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'back.out(2)' }, 2.75);
  }
  const t0 = o ? 3.0 : 1.1;
  tl.fromTo($$('.bj-botin .pegatina', f), { scale: 0, rotate: -20 }, { scale: 1, rotate: -2, duration: 0.5, stagger: 0.15, ease: 'back.out(3)' }, t0)
    .add(() => {
      const k = $('[data-koban]', f); if (!k || !B?.vivo) return;
      const n = { v: 0 }; gsap.to(n, { v: rec.monedas, duration: 0.9, ease: 'power2.out', onUpdate: () => { k.textContent = mil(n.v); } });
      const c = centroDe(k); B.chispas.emitir(18, { x: c.x, y: c.y, abanico: 1.2, vmin: 200, vmax: 520, g: 900, tipo: 'koban', colores: ['#f2b43a'], tmin: 7, tmax: 10, dmin: 0.8, dmax: 1.2 });
      sonar('acierto', 6);
    }, t0 + 0.2)
    .fromTo($$('.bj-cifras > div, .bj-acciones > *', f), { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.06, ease: 'back.out(2)' }, t0 + 0.4);
  const perfecto = $('.bj-perfecto', f);
  if (perfecto) tl.fromTo(perfecto, { scale: 3, opacity: 0, rotate: -30 }, { scale: 1, opacity: 1, rotate: 12, duration: 0.4, ease: 'power4.in', onComplete: () => { sonar('sello'); sonar('fanfarria'); temblor(10, 0.25, panel); } }, t0 + 0.9);
  $('[data-camino]', f).focus({ preventScroll: true });
  // Intro: primero acelera el panel; luego pulsa el botón con el foco (o vuelve al camino si no hay ninguno)
  tecla = (e) => {
    if (e.key !== 'Enter') return;
    if (tl.progress() < 1) { e.preventDefault(); tl.timeScale(6); } else if (!sobreControl(e)) { e.preventDefault(); location.hash = 'camino'; }
  };
}

// ───────────────────────── derrota ─────────────────────────
async function derrota() {
  const id = B.id, el = B.el;
  B.fase = 'fin'; tecla = null; B.reloj?.kill(); el.pregunta.inert = true;
  sonar('koto', 57, 0, 0.7); sonar('koto', 53, 0.25, 0.6); sonar('koto', 50, 0.5, 0.6);
  try { mochi?.expresion('triste', 5000); mochi?.apenado(); } catch {}
  gsap.to(lienzoMochi, { y: 40, rotate: -18, opacity: 0.7, duration: 0.9, ease: 'power2.in' });
  gsap.to(el.pregunta, { y: 260, opacity: 0, duration: 0.5, ease: 'power2.in' });
  gsap.to(el.mundo, { filter: 'grayscale(.75) brightness(.8)', duration: 1.1 });
  pausaIdle(true);
  gsap.timeline().to(el.golpe, { y: -24, duration: 0.16, yoyo: true, repeat: 5, ease: 'power2.out' });
  hablar(t('jefe.vuelve_listo'), 2200);
  const pide = api(`/api/jefe/${B.region}/resultado`, { ganado: false, aciertos: B.aciertos, total: B.respondidas }).catch(() => null);
  const [res] = await Promise.all([pide, espera(1400)]);
  if (!vivo(id)) return;
  const consuelo = res?.recompensa?.monedas || 0;
  const quedo = Math.round(100 * B.vida / B.vidaMax);
  const f = document.createElement('div'); f.className = 'bj-final';
  f.innerHTML = `<div class="panel ficha">
    <div class="titulo pop" style="color:var(--tinta-2)">負け…</div>
    <p class="sub">${t('jefe.derrota.sub')}</p>
    <p class="nota">${t('jefe.derrota.nota', { nombre: esc(B.j.nombre), pct: quedo, region: B.r.nombre ? esc(B.r.nombre) : t('jefe.derrota.esta_region') })}</p>
    ${kageDice('pierde')}
    <div style="margin:16px auto 0;max-width:380px"><div class="bj-vida" style="margin:0"><i class="fantasma" style="width:100%"></i><i class="llena" style="width:${quedo}%"></i><span class="marcas"></span></div></div>
    <div class="bj-cifras"><div><b>${mil(B.dano)}</b><small>${t('jefe.cifras.dano')}</small></div><div><b>${B.aciertos}/${B.respondidas}</b><small>${t('jefe.cifras.aciertos')}</small></div><div><b>${B.mejor}</b><small>${t('jefe.cifras.mejor')}</small></div></div>
    ${consuelo ? `<div class="bj-botin"><span class="pegatina oro"><img class="bj-koban-img" src="/img/iconos/koban.svg" alt=""> ${t('jefe.botin.consuelo', { n: mil(consuelo) })}</span></div>`
      : res?.recompensa?.tope_diario ? `<div class="bj-botin"><span class="pegatina tinta">${t('jefe.botin.tope')}</span></div>` : ''}
    <div class="bj-acciones"><button class="bj-boton claro" data-camino>${t('jefe.volver_camino')} ${kbd('Esc')}</button><button class="bj-boton" data-otra>${t('jefe.reintentar')} <kbd>↵</kbd></button></div></div>`;
  el.raiz.appendChild(f);
  gsap.to(el.velo, { opacity: 0.8, duration: 0.5 });
  const panel = $('.panel', f);
  inclinable(panel, 4);
  gsap.fromTo(panel, { y: 300, rotate: 3, scale: 0.85 }, { y: 0, rotate: 0, scale: 1, duration: 0.8, ease: 'back.out(1.4)' });
  gsap.fromTo($('.titulo', f), { y: -40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, delay: 0.3, ease: 'bounce.out' });
  gsap.fromTo($('.bj-vida .llena', f), { width: '100%' }, { width: quedo + '%', duration: 1, delay: 0.6, ease: 'power2.inOut' });
  gsap.fromTo($$('.bj-cifras > div, .bj-botin .pegatina, .bj-acciones > *', f), { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.06, delay: 0.7, ease: 'back.out(2)' });
  const region = B.region;
  const otra = () => { tecla = null; gsap.to(f, { opacity: 0, duration: 0.3, onComplete: () => empezar(region) }); };
  $('[data-camino]', f).onclick = () => { location.hash = 'camino'; };
  $('[data-otra]', f).onclick = otra;
  $('[data-otra]', f).focus({ preventScroll: true });
  tecla = (e) => { if (e.key === 'Enter' && !sobreControl(e)) { e.preventDefault(); otra(); } };
}
