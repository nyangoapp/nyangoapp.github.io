// Kage, el rival (30-09): en el camino de los yōkai va por delante y te pica; al acabar una pelea, lo reconoce a su manera.
// Serio, seco, tsundere (「ふん」, 俺, ぞ); en 3D como el resto del reparto (web/img/reparto, herramientas/escenas/recortes.py).
import { ruby } from './japones.js';
import { idioma } from './i18n.js';

const frase = (s) => String(s || '').split(' ').map(ruby).join(' ');
const DICE = {
  empieza: ['presumido', 'ふん。 最初[さいしょ]の 妖怪[ようかい]は 俺[おれ]が 倒[たお]す。', 'Hmpf. Al primer yōkai lo derroto yo.', "Hmph. I'll take down the first yōkai."],
  sigue: ['decidido', '…やるな。 でも、 次[つぎ]は 俺[おれ]が 先[さき]だ。', '…No está mal. Pero el siguiente es mío.', "…Not bad. But the next one's mine."],
  lejos: ['presumido', 'ふん。 富士山[ふじさん]まで、 競争[きょうそう]だぞ。', 'Hmpf. Hasta el Fuji, esto es una carrera.', "Hmph. It's a race to Mt. Fuji."],
  perfecto: ['decidido', '…完璧[かんぺき]か。 認[みと]めてやる。', '…¿Perfecto? Te lo reconozco.', "…Perfect? I'll give you that."],
  gana: ['presumido', 'ふん、 まあまあ だな。', 'Hmpf, no ha estado mal.', 'Hmph, not bad.'],
  pierde: ['aburrido', '…俺[おれ]なら 勝[か]ってた。 もう 一回[いっかい] やれ。', '…Yo habría ganado. Inténtalo otra vez.', '…I would have won. Try again.'],
};

// clase: 'kg-heroe' (de pie en el camino) o 'kg-fila' (una fila bajo el resultado de la pelea)
export function kageDice(momento, clase = 'kg-fila') {
  estilos();
  const [cara, jp, es, en] = DICE[momento] || DICE.gana;
  return `<div class="kg ${clase}"><img class="kg-fig" src="/img/reparto/kage-${cara}.webp" alt="" draggable="false">
    <div class="kg-dice"><b class="kg-quien" lang="ja">カゲ</b><span lang="ja">${frase(jp)}</span><small>${idioma === 'en' ? en : es}</small></div></div>`;
}
export const momentoCamino = (vencidos) => (!vencidos ? 'empieza' : vencidos < 10 ? 'sigue' : 'lejos');

let puestos = false;
function estilos() {
  if (puestos) return; puestos = true;
  const s = document.createElement('style');
  s.textContent = `
.kg { --boc: #e7e3df; --etq: #5e5a58; } /* arte: el gris de Kage */
.kg-dice { position: relative; display: grid; gap: 2px; padding: 8px 16px 12px; border-radius: calc(var(--radio) * 1.2); background: color-mix(in srgb, var(--boc) 26%, var(--sup)); border: var(--borde); box-shadow: var(--sombra-peq); text-align: left; }
.kg-quien { position: absolute; top: -12px; left: 12px; padding: 0 12px; border-radius: 99px; font: 800 11.5px/20px var(--f-jp); color: var(--tinta-inv); background: color-mix(in srgb, var(--etq) 55%, var(--tinta)); }
.kg-dice span { font: 700 15px/1.75 var(--f-jp); color: var(--tinta); } .kg-dice rt { font-size: .5em; }
.kg-dice small { font: 600 12px var(--f-texto); color: var(--tinta); }
.kg-fig { object-fit: contain; }
/* de pie en el camino, a la izquierda del guardián, con su bocadillo al lado */
.kg-heroe { position: absolute; left: 4%; bottom: 4%; z-index: 3; display: flex; align-items: flex-end; gap: 6px; pointer-events: none; }
.kg-heroe .kg-fig { order: 2; width: clamp(120px, 15vw, 190px); aspect-ratio: 1; margin-bottom: -6%; }
.kg-heroe .kg-dice { order: 1; max-width: 240px; margin-bottom: 4%; }
/* bajo el resultado de la pelea */
.kg-fila { display: flex; align-items: center; justify-content: center; gap: 10px; margin: 14px auto 0; max-width: 480px; }
.kg-fila .kg-fig { width: 84px; height: 84px; flex: none; }
@media (max-width: 760px) { .kg-heroe { display: none; } }
`;
  document.head.appendChild(s);
}
