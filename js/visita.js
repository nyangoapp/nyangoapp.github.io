// Al terminar un repaso, alguien del reparto se pasa a decirte algo (30-09): cada uno en su sitio (una foto de los
// escenarios) y a su manera, según cómo te haya ido. El mini-Mochi (Nyan en 3D) ya celebra en su esquina: aquí vienen los
// demás, también en 3D (web/img/reparto, herramientas/escenas/recortes.py), nunca un Nyan dibujado.
import { ruby } from './japones.js';
import { idioma } from './i18n.js';

const frase = (s) => String(s || '').split(' ').map(ruby).join(' ');
// nivel: 0 = muy bien (秀, 優), 1 = bien (良), 2 = flojo (可)
const REPARTO = {
  tama: { nombre: 'タマ', lugar: 'cuarto', caras: ['feliz', 'normal', 'pensando'], dice: [
    ['すごい！ 今日[きょう]も がんばったね。', '¡Genial! Hoy también te has esforzado.', 'Amazing! You worked hard today too.'],
    ['いい 感[かん]じ！ この 調子[ちょうし]で いこう。', '¡Vas bien! Sigue así.', "You're doing great! Keep it up."],
    ['だいじょうぶ。 明日[あした]も いっしょに やろう。', 'Tranquilo. Mañana lo hacemos juntos.', "It's okay. Let's do it together tomorrow too."]] },
  kage: { nombre: 'カゲ', lugar: 'noche', caras: ['presumido', 'decidido', 'aburrido'], dice: [
    ['ふん…。 まあ、 悪[わる]くない。', 'Hmpf… Bueno, no está mal.', "Hmph… Well, that's not bad."],
    ['まだまだ だな。 俺[おれ]は 負[ま]けないぞ。', 'Aún te queda. Yo no pienso perder.', "You've still got a way to go. I won't lose."],
    ['…明日[あした]は もっと やれ。', '…Mañana, esfuérzate más.', '…Try harder tomorrow.']] },
  pon: { nombre: 'ポン', lugar: 'tienda', caras: ['feliz', 'feliz', 'triste'], dice: [
    ['ははは！ 今日[きょう]は 大[おお]もうけ だね！', '¡Ja, ja! ¡Hoy has hecho el negocio del día!', "Ha ha! You've struck gold today!"],
    ['ははは、 また おいで！', '¡Ja, ja! ¡Vuelve pronto!', 'Ha ha, come back soon!'],
    ['ははは、 そんな 日[ひ]も あるさ。', '¡Ja, ja! Hay días así.', 'Ha ha, some days are like that.']] },
  fukuro: { nombre: 'フクロ先生[せんせい]', lugar: 'escuela', caras: ['sorpresa', 'normal', 'normal'], dice: [
    ['ほう…。 よく できました。', 'Vaya… Muy bien hecho.', 'My… Very well done.'],
    ['ほう。 毎日[まいにち] 少[すこ]しずつ、 ですよ。', 'Hmm. Poco a poco, cada día.', 'Hmm. A little every day, you see.'],
    ['まちがいも 勉強[べんきょう]の うち ですよ。', 'Equivocarse también es parte de aprender.', 'Mistakes are part of learning too.']] },
  kotaro: { nombre: 'コタロウ', lugar: 'parque', caras: ['feliz', 'feliz', 'feliz'], dice: [
    ['ワン！ すごい すごい！', '¡Guau! ¡Increíble, increíble!', 'Woof! Amazing, amazing!'],
    ['ワン！ また あした！', '¡Guau! ¡Hasta mañana!', 'Woof! See you tomorrow!'],
    ['ワン…。 げんき だして！', 'Guau… ¡Ánimo!', 'Woof… Cheer up!']] },
};

export function visita(nota) {
  const nivel = nota === '秀' || nota === '優' ? 0 : nota === '良' ? 1 : 2;
  const ids = Object.keys(REPARTO), id = ids[Math.floor(Math.random() * ids.length)], R = REPARTO[id];
  const [jp, es, en] = R.dice[nivel];
  estilos();
  return `<div class="fin-visita quien-${id}" style="background-image:url(/img/escenarios/${R.lugar}.webp)">
    <img class="fv-fig" src="/img/reparto/${id}-${R.caras[nivel]}.webp" alt="" draggable="false">
    <div class="fv-dice"><b class="fv-quien" lang="ja">${frase(R.nombre)}</b><span class="fv-jp" lang="ja">${frase(jp)}</span><small>${idioma === 'en' ? en : es}</small></div></div>`;
}

let puestos = false;
function estilos() {
  if (puestos) return; puestos = true;
  const s = document.createElement('style');
  s.textContent = `
.fin-visita { position: relative; aspect-ratio: 400 / 260; margin-bottom: 16px; border-radius: var(--radio); overflow: hidden; background: var(--sup-3) center / cover; border: var(--borde); box-shadow: var(--sombra); }
.fin-visita .fv-fig { position: absolute; right: 5%; bottom: 3%; height: 80%; aspect-ratio: 1; object-fit: contain; }
/* cada personaje pone el tinte de su bocadillo (--boc) y de su etiqueta (--etq): son arte, como el propio personaje; el fondo y la tinta salen del tema */
.fin-visita .fv-dice { position: absolute; left: 4%; top: 8%; max-width: 56%; display: grid; gap: 2px; padding: 8px 16px 12px; border-radius: calc(var(--radio) * 1.2); background: color-mix(in srgb, var(--boc) 26%, var(--sup)); border: var(--borde); box-shadow: var(--sombra-peq); }
.fin-visita .fv-quien { position: absolute; top: -12px; left: 16px; padding: 0 12px; border-radius: 99px; font: 800 12px/20px var(--f-jp); color: var(--tinta-inv); background: color-mix(in srgb, var(--etq) 55%, var(--tinta)); }
.fin-visita .fv-quien rt { display: none; }
.fin-visita .fv-jp { font: 700 15px/1.75 var(--f-jp); color: var(--tinta); } .fin-visita .fv-jp rt { font-size: .5em; }
.fin-visita small { font: 600 12.5px var(--f-texto); color: var(--tinta-2); }
.fin-visita { --boc: #fff1b8; --etq: #d4843f; } /* arte */
.fin-visita.quien-tama { --boc: #fde2ea; --etq: #dc6f96; } .fin-visita.quien-kage { --boc: #e7e3df; --etq: #5e5a58; } /* arte */
.fin-visita.quien-pon { --boc: #e9efd3; --etq: #7f9a4a; } .fin-visita.quien-fukuro { --boc: #f2e4d3; --etq: #9a7552; } .fin-visita.quien-kotaro { --boc: #fde5d0; --etq: #d4843f; } /* arte */
`;
  document.head.appendChild(s);
}
