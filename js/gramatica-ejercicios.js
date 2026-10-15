// Los ejercicios de la guía de gramática: lo que decide si una respuesta está bien. Lo comparten la guía de escritorio
// (gramatica.js) y la del móvil (movil/guia.js), para que las dos corrijan igual.
import { sinFurigana, aKana, normLectura } from './japones.js';

const barajar = (l) => { const a = [...l]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// solo cuando la pregunta PIDE la frase incorrecta («¿Qué frase está mal?», «Which sentence is incorrect?»): un «mal» suelto
// («le salió mal») no la invierte; MAL en mayúsculas, sí
const INVERTIDA = /(qué|cuál)[^?¿]*\b(está|es|suena) (mal|incorrecta)|which[^?]*\b(is|sounds) (incorrect|wrong)|NO es (una frase )?correcta/i;
export const esInvertida = (e) => e.busca === 'incorrecta' || INVERTIDA.test(e.pregunta || '') || /\bMAL\b/.test(e.pregunta || '');

// «Ordena la frase»: antes del predicado el orden es libre (lección clause) si cada trozo es un nombre con su partícula
// (大学に, 誰が) o un nombre suelto (明日, 二時間). Con verbos, adjetivos o frases dentro, solo vale el orden de la lección.
const PARTICULA = /^(?:は|が|を|に|へ|で|と|も|から|まで|より|では|には|へは|とは|でも|よりも|にも|とも|の|や)$/;
const CIERRA = /(?:は|が|を|に|へ|で|と|も|から|まで|より)$/;
const DETERMINANTE = /^(?:この|その|あの|どの)$/;
const DEICTICO = /^(?:これ|それ|あれ|どれ|ここ|そこ|あそこ|どこ|あいつ|こいつ|そいつ|だれ|なに|いつ)$/;
const COPULA = /^(?:だ|です|じゃ|では|でし|でしょ|だっ|だろ|かもしれ|みたい|らしい|いる$|ある$|います$|あります$)/;
const plano = (p) => sinFurigana(p).replace(/\s+/g, '');
function nominal(s) {
  const b = s.replace(/(?:から|まで|より|では|には|とは|でも|よりも|にも|は|が|を|に|へ|で|と|も|の)+$/, '').replace(/(?:さん|くん|ちゃん|さま)$/, '');
  return DETERMINANTE.test(b) || (!!b && !/[、。？！?!]/.test(b) && (DEICTICO.test(b) || !/[ぁ-ゟ]$/.test(b)));
}
function trozosLibres(piezas) {
  const t = piezas.map(plano), n = t.length;
  const raiz = (i) => i < n - 1 && /^(?:な[いかく]|ず|ぬ|ま[しすせ]|た[いかく](?!さん)|やす|にく|っ)/.test(t[i + 1]); // 分から|ない, 女|っぽい: media palabra
  const cierra = (i) => (PARTICULA.test(t[i]) ? !/^(?:の|や)$/.test(t[i]) : CIERRA.test(t[i]) && !raiz(i));
  const suelto = (i) => i < n - 1 && !PARTICULA.test(t[i]) && !DETERMINANTE.test(t[i]) && !/の$/.test(t[i]) && !raiz(i) && nominal(t[i]) && !PARTICULA.test(t[i + 1]) && !COPULA.test(t[i + 1]);
  let fin = -1, conParticula = false;
  for (let i = 0; i < n - 1; i++) if (cierra(i) || suelto(i)) { fin = i; conParticula ||= cierra(i); }
  if (!conParticula) return null;
  const libres = []; let cur = [];
  for (let i = 0; i <= fin; i++) { cur.push(t[i]); if (cierra(i) || (cur.length === 1 && suelto(i))) { libres.push(cur); cur = []; } }
  const pred = t.slice(fin + 1);
  if (/^(?:な[るっりられ]|す[るれ])/.test(pred[0]) && /[にと]$/.test(libres.at(-1)?.at(-1) || '')) pred.unshift(...libres.pop()); // 中止に なる va junto
  const valen = !cur.length && libres.length > 1 && libres.every((c) => c.some((x) => !PARTICULA.test(x)) && c.every((x) => PARTICULA.test(x) || nominal(x)));
  return valen ? { libres, pred } : null;
}
export function ordenLibre(piezas, orden) {
  const tr = trozosLibres(piezas); if (!tr) return false;
  const u = orden.map((k) => plano(piezas[k])), corte = u.length - tr.pred.length, usado = tr.libres.map(() => false);
  if (u.slice(corte).join('|') !== tr.pred.join('|')) return false;
  const casa = (i) => i === corte || tr.libres.some((c, j) => {
    if (usado[j] || i + c.length > corte || !c.every((x, q) => u[i + q] === x)) return false;
    usado[j] = true; if (casa(i + c.length)) return true; usado[j] = false; return false;
  });
  return casa(0);
}

// «Conjuga»: la casilla solo escribe kana; cada kanji de la respuesta vale también por la lectura que el ejercicio da en su
// furigana (学生[がくせい]). valor: lo escrito (romaji o kana)
export function conjugacionBien(e, valor) {
  const v = normLectura(aKana(valor, true)); if (!v) return null;
  const lect = [...JSON.stringify(e).matchAll(/([一-鿿㐀-䶿々〆ヶ]+)\[([^\]]+)\]/g)].map((m) => [m[1], m[2]]).sort((a, b) => b[0].length - a[0].length);
  const enKana = (r) => lect.reduce((s, [k, l]) => s.split(k).join(l), sinFurigana(r));
  const validas = (e.respuestas || []).flatMap((r) => [normLectura(sinFurigana(r)), normLectura(enKana(r))]);
  return validas.includes(v) || validas.includes(normLectura(valor));
}
// «Ordena»: bien si es el orden de la lección o, cuando el orden es libre, uno que valga
export function ordenBien(e, orden) {
  const exacto = orden.every((k, i) => sinFurigana(e.piezas[k]) === sinFurigana(e.piezas[i]));
  return { ok: exacto || ordenLibre(e.piezas, orden), exacto };
}

// primera vez: los ejercicios de siempre (con opciones y piezas barajadas); al repetir, otro orden y parte de las frases, nuevas
export function armar(lec, variar) {
  const base = (lec.ejercicios || []).map((e) => ({ ...e }));
  if (!variar) return base;
  const gen = barajar(lec.generadas || []).map((e) => ({ ...e }));
  const cambio = Math.min(gen.length, Math.max(2, Math.round(base.length * 0.4)));
  return barajar([...barajar(base).slice(0, base.length - cambio), ...gen.slice(0, cambio)]);
}
