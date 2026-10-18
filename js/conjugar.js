// Conjugación japonesa (活用): módulo puro, sin DOM, que también se importa desde node (herramientas/pruebas/conjugar.test.mjs).
// La clase de cada palabra (g-ku, ichi, adj-na…) la calcula herramientas/conjugar/clases.py y viaja en el paquete (c.conj).
//
//   conjugar(palabra, lectura, clase, forma, celda = null, lang = 'es')
//     → { kanji, kana, furigana, base, explica, pega, otras? } o null si la forma no se aplica a esa palabra.
//   FORMAS  catálogo de formas (verbo / adjetivo / tabla), CELDAS[tabla] celdas de la tabla escolar.
//
// Los textos van en español y en inglés (lang); lo demás es japonés.

const TRAD = (lang, es, en) => (lang === 'en' ? en : es);

export const GODAN = ['g-u', 'g-ku', 'g-gu', 'g-su', 'g-tsu', 'g-nu', 'g-bu', 'g-mu', 'g-ru'];
export const VERBOS = [...GODAN, 'iku', 'aru', 'ichi', 'kureru', 'kuru', 'suru', 'suru-n'];
export const ADJETIVOS = ['adj-i', 'adj-ii', 'adj-na'];
export const CLASES = [...VERBOS, ...ADJETIVOS];

// la fila de cada final godan: a (未然 ない), i (連用 ます), u (終止), e (仮定・命令), o (未然 う)
export const FILAS = {
  う: { a: 'わ', i: 'い', u: 'う', e: 'え', o: 'お' }, く: { a: 'か', i: 'き', u: 'く', e: 'け', o: 'こ' },
  ぐ: { a: 'が', i: 'ぎ', u: 'ぐ', e: 'げ', o: 'ご' }, す: { a: 'さ', i: 'し', u: 'す', e: 'せ', o: 'そ' },
  つ: { a: 'た', i: 'ち', u: 'つ', e: 'て', o: 'と' }, ぬ: { a: 'な', i: 'に', u: 'ぬ', e: 'ね', o: 'の' },
  ぶ: { a: 'ば', i: 'び', u: 'ぶ', e: 'べ', o: 'ぼ' }, む: { a: 'ま', i: 'み', u: 'む', e: 'め', o: 'も' },
  る: { a: 'ら', i: 'り', u: 'る', e: 'れ', o: 'ろ' },
};
const FINAL_DE = { 'g-u': 'う', 'g-ku': 'く', 'g-gu': 'ぐ', 'g-su': 'す', 'g-tsu': 'つ', 'g-nu': 'ぬ', 'g-bu': 'ぶ', 'g-mu': 'む', 'g-ru': 'る', iku: 'く', aru: 'る' };
// 音便: [lo que queda antes de て/た, て, た]
const ONBIN = { う: ['っ', 'て', 'た'], つ: ['っ', 'て', 'た'], る: ['っ', 'て', 'た'], く: ['い', 'て', 'た'], ぐ: ['い', 'で', 'だ'], す: ['し', 'て', 'た'],
  ぬ: ['ん', 'で', 'だ'], ぶ: ['ん', 'で', 'だ'], む: ['ん', 'で', 'だ'] };

const V = ['verbo', 'adjetivo', 'tabla'];
const ENT = (es, en) => ({ es, en });
// ── catálogo de formas ──
export const FORMAS = [
  { id: 'masu', grupo: V[0], titulo: 'Cortés', jp: '〜ます', clases: VERBOS, explica: 'La forma educada de decir lo que haces o harás: del diccionario a 〜ます.' },
  { id: 'masen', grupo: V[0], titulo: 'Cortés negativa', jp: '〜ません', clases: VERBOS, explica: 'La negación educada: lo que no haces ni harás.' },
  { id: 'mashita', grupo: V[0], titulo: 'Cortés en pasado', jp: '〜ました', clases: VERBOS, explica: 'Lo que hiciste, dicho con educación.' },
  { id: 'masendeshita', grupo: V[0], titulo: 'Cortés negativa en pasado', jp: '〜ませんでした', clases: VERBOS, explica: 'Lo que no hiciste, dicho con educación.' },
  { id: 'nai', grupo: V[0], titulo: 'Negativa', jp: '〜ない', clases: VERBOS, explica: 'La negación en lenguaje de confianza.' },
  { id: 'ta', grupo: V[0], titulo: 'Pasado', jp: '〜た', clases: VERBOS, explica: 'El pasado en lenguaje de confianza.' },
  { id: 'nakatta', grupo: V[0], titulo: 'Negativa en pasado', jp: '〜なかった', clases: VERBOS, explica: 'Lo que no hiciste, en lenguaje de confianza.' },
  { id: 'te', grupo: V[0], titulo: 'Forma て', jp: '〜て', clases: VERBOS, explica: 'Une acciones, pide cosas (〜てください) y sirve de base a muchas estructuras.' },
  { id: 'teiru', grupo: V[0], titulo: 'En curso', jp: '〜ている', clases: VERBOS, explica: 'Lo que está pasando ahora o un estado que dura.' },
  { id: 'a-nai', grupo: V[1], titulo: 'Negativa', jp: '〜くない・〜じゃない', clases: ADJETIVOS, explica: 'No es así: 高くない, 静かじゃない.' },
  { id: 'a-ta', grupo: V[1], titulo: 'Pasado', jp: '〜かった・〜だった', clases: ADJETIVOS, explica: 'Era así: 高かった, 静かだった.' },
  { id: 'a-nakatta', grupo: V[1], titulo: 'Negativa en pasado', jp: '〜くなかった・〜じゃなかった', clases: ADJETIVOS, explica: 'No era así: 高くなかった, 静かじゃなかった.' },
  { id: 'a-te', grupo: V[1], titulo: 'Forma て', jp: '〜くて・〜で', clases: ADJETIVOS, explica: 'Une descripciones: 高くて大きい, 静かで便利.' },
  // sin palabras: pregunta los seis nombres de las bases (no tiene reserva de verbos ni celdas; lo especial vive en motor/conjugacion.js)
  { id: 't-nombres', grupo: V[2], titulo: 'Los nombres de la tabla', jp: '活用の名前', clases: [], nombres: true, explica: 'Aprende a leer los seis nombres de las bases y qué significan.' },
  { id: 't-godan', grupo: V[2], titulo: 'Verbos 五段', jp: '五段活用', clases: [...GODAN, 'iku'], explica: 'La fila か・き・く・く・け・け: la vocal del final cambia de fila.' },
  { id: 't-ichi', grupo: V[2], titulo: 'Verbos 一段', jp: '一段活用', clases: ['ichi', 'kureru'], explica: 'Se quita る y se pega la terminación.' },
  { id: 't-suru', grupo: V[2], titulo: 'する', jp: 'サ変活用', clases: ['suru', 'suru-n'], explica: 'し・し・する・する・すれ・しろ: un verbo irregular.' },
  { id: 't-kuru', grupo: V[2], titulo: '来る', jp: 'カ変活用', clases: ['kuru'], explica: 'こ・き・くる・くる・くれ・こい: el otro verbo irregular.' },
  { id: 't-adj-i', grupo: V[2], titulo: 'Adjetivos い', jp: 'い形容詞', clases: ['adj-i', 'adj-ii'], explica: 'Cambia la い final: く, かっ, い, けれ.' },
  { id: 't-adj-na', grupo: V[2], titulo: 'Adjetivos な', jp: 'な形容詞', clases: ['adj-na'], explica: 'Lleva だ, な, なら, で, じゃ según la forma.' },
];
const EN_FORMAS = {
  masu: ['Polite', 'The polite way to say what you do or will do: dictionary form to 〜ます.'],
  masen: ['Polite negative', 'The polite negation: what you do not do.'],
  mashita: ['Polite past', 'What you did, said politely.'],
  masendeshita: ['Polite negative past', 'What you did not do, said politely.'],
  nai: ['Negative', 'The negation in casual speech.'],
  ta: ['Past', 'The past in casual speech.'],
  nakatta: ['Negative past', 'What you did not do, in casual speech.'],
  te: ['て form', 'Links actions, makes requests (〜てください) and underlies many structures.'],
  teiru: ['Ongoing', 'What is happening now, or a lasting state.'],
  'a-nai': ['Negative', 'It is not so: 高くない, 静かじゃない.'],
  'a-ta': ['Past', 'It was so: 高かった, 静かだった.'],
  'a-nakatta': ['Negative past', 'It was not so: 高くなかった, 静かじゃなかった.'],
  'a-te': ['て form', 'Links descriptions: 高くて大きい, 静かで便利.'],
  't-nombres': ['The table’s names', 'Learn to read the six names of the bases and what they mean.'],
  't-godan': ['五段 verbs', 'The row か・き・く・く・け・け: the final vowel moves through the kana row.'],
  't-ichi': ['一段 verbs', 'Drop る and attach the ending.'],
  't-suru': ['する', 'し・し・する・する・すれ・しろ: an irregular verb.'],
  't-kuru': ['来る', 'こ・き・くる・くる・くれ・こい: the other irregular verb.'],
  't-adj-i': ['い adjectives', 'The final い changes: く, かっ, い, けれ.'],
  't-adj-na': ['な adjectives', 'Takes だ, な, なら, で, じゃ depending on the form.'],
};
/** Título y explicación de una forma en el idioma pedido */
export function textoForma(f, lang = 'es') {
  const x = typeof f === 'string' ? FORMAS.find((y) => y.id === f) : f;
  if (!x) return null;
  return lang === 'en' && EN_FORMAS[x.id] ? { titulo: EN_FORMAS[x.id][0], explica: EN_FORMAS[x.id][1] } : { titulo: x.titulo, explica: x.explica };
}
export const forma = (id) => FORMAS.find((x) => x.id === id) || null;
/** ¿Se aplica esta forma a esta clase? */
export const aplica = (id, clase) => !!forma(id)?.clases.includes(clase);
/** La tabla escolar de una clase (t-godan…) */
export const tablaDe = (clase) => FORMAS.find((x) => x.grupo === 'tabla' && x.clases.includes(clase))?.id || null;

// ── las celdas de cada tabla ──
const C = (id, base, pega) => ({ id, base, pega });
const CELDAS_V = (u) => [C('mizen-nai', '未然形', 'ない'), C('mizen-u', '未然形', u), C('renyo-masu', '連用形', 'ます'), C('renyo-te', '連用形', 'て'),
  C('shushi', '終止形', ''), C('rentai', '連体形', 'とき'), C('katei', '仮定形', 'ば'), C('meirei', '命令形', '')];
const TODAS = {
  't-godan': CELDAS_V('う'), 't-ichi': CELDAS_V('よう'), 't-suru': CELDAS_V('よう'), 't-kuru': CELDAS_V('よう'),
  't-adj-i': [C('renyo-nai', '連用形', 'ない'), C('renyo-ta', '連用形', 'た'), C('renyo-te', '連用形', 'て'), C('shushi', '終止形', ''), C('rentai', '連体形', 'とき'), C('katei', '仮定形', 'ば')],
  't-adj-na': [C('renyo-nai', '連用形', 'ない'), C('renyo-ta', '連用形', 'た'), C('renyo-te', '連用形', 'で'), C('shushi', '終止形', ''), C('rentai', '連体形', 'とき'), C('katei', '仮定形', 'なら')],
};
// 11-10: la tabla que se rellena es la del colegio, UNA fila por base y en su orden (未然・連用・終止・連体・仮定・命令: か・き・く・く・け・け).
// Las otras formas de una misma base (書こう con el 未然形, 書いて con el 連用形, 高かった/高くて) no son filas: salen como «también» al comprobar.
const UNA_POR_BASE = new Set(['mizen-nai', 'renyo-masu', 'renyo-nai', 'shushi', 'rentai', 'katei', 'meirei']);
export const CELDAS = Object.fromEntries(Object.entries(TODAS).map(([k, l]) => [k, l.filter((c) => UNA_POR_BASE.has(c.id))]));
export const TAMBIEN = { 'mizen-nai': ['mizen-u'], 'renyo-masu': ['renyo-te'], 'renyo-nai': ['renyo-ta', 'renyo-te'] };

// ── furigana: «漢字[かな]» con la okurigana fuera; un espacio antes del kanji que sigue a un kana ──
const KANA = /[ぁ-ゖァ-ヺー・]/;
const hira = (s) => String(s).replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
export const sinFuri = (s) => String(s || '').replace(/\[[^\]]*\]/g, '').replace(/ /g, '');   // sin lecturas ni los espacios que separan

/** Parte la palabra escrita en trozos [{t, r}] (r = lectura del kanji; sin r = kana) alineándola con su lectura */
export function alinear(w, r) {
  w = String(w); r = String(r);
  if (!w) return [];
  const runs = w.match(/[ぁ-ゖァ-ヺー・]+|[^ぁ-ゖァ-ヺー・]+/g);
  const rec = (i, pos) => {
    if (i === runs.length) return pos === r.length ? [] : null;
    const run = runs[i];
    if (KANA.test(run[0])) {
      if (hira(r.slice(pos, pos + run.length)) !== hira(run)) return null;
      const resto = rec(i + 1, pos + run.length);
      return resto && [{ t: run }, ...resto];
    }
    for (let n = 1; pos + n <= r.length; n++) { const resto = rec(i + 1, pos + n); if (resto) return [{ t: run, r: r.slice(pos, pos + n) }, ...resto]; }
    return null;
  };
  return rec(0, 0) || (KANA.test(w[0]) && !/[^ぁ-ゖァ-ヺー・]/.test(w) ? [{ t: w }] : [{ t: w, r }]);
}
const textoDe = (segs) => segs.map((s) => s.t).join('');
const kanaDe = (segs) => segs.map((s) => s.r ?? s.t).join('');
function furiDe(segs) {
  let out = '', antesKana = false;
  for (const s of segs) {
    if (s.r !== undefined && s.r !== null) { out += `${antesKana ? ' ' : ''}${s.t}[${s.r}]`; antesKana = false; } else { out += s.t; antesKana = !!s.t; }
  }
  return out;
}
const juntar = (segs, suf) => {
  const s = suf ? [...segs, { t: suf }] : segs;
  return { kanji: textoDe(s), kana: kanaDe(s), furigana: furiDe(s) };
};

// ── las bases de cada clase: { segs, suf } (lo que queda de la palabra + lo que cambia) ──
const B = (segs, suf = '') => ({ segs, suf });
/** → { a, o, i, u, e, m, te: {segs, suf, te, ta}, nai? } o null si los datos no cuadran */
function basesVerbo(palabra, lectura, clase) {
  const fin = (s, c) => s.endsWith(c);
  const corta = (q) => alinear(palabra.slice(0, palabra.length - q), lectura.slice(0, lectura.length - q));
  if (clase === 'kuru') {
    const raiz = (r) => (palabra === '来る' ? [{ t: '来', r }] : []);
    const k = (r, suf = '') => B(raiz(r), palabra === '来る' ? suf : r + suf);
    if (palabra !== '来る' && palabra !== 'くる') return null;
    return { a: k('こ'), o: k('こ'), i: k('き'), u: k('く', 'る'), e: k('く', 'れ'), m: k('こ', 'い'), te: { ...k('き'), te: 'て', ta: 'た' } };
  }
  if (clase === 'suru' || clase === 'suru-n') {
    let pre = [];
    if (clase === 'suru-n') { if (!palabra || !lectura) return null; pre = alinear(palabra, lectura); } else if (palabra !== 'する') return null;
    return { a: B(pre, 'し'), o: B(pre, 'し'), i: B(pre, 'し'), u: B(pre, 'する'), e: B(pre, 'すれ'), m: B(pre, 'しろ'), te: { ...B(pre, 'し'), te: 'て', ta: 'た' } };
  }
  if (clase === 'ichi' || clase === 'kureru') {
    if (!fin(palabra, 'る') || !fin(lectura, 'る')) return null;
    const s = corta(1);
    return { a: B(s), o: B(s), i: B(s), u: B(s, 'る'), e: B(s, 'れ'), m: B(s, clase === 'kureru' ? '' : 'ろ'), te: { ...B(s), te: 'て', ta: 'た' } };
  }
  const c = FINAL_DE[clase];
  if (!c || !fin(palabra, c) || !fin(lectura, c)) return null;
  const f = FILAS[c], s = corta(1), on = clase === 'iku' ? ONBIN.つ : ONBIN[c];
  return { a: clase === 'aru' ? B([]) : B(s, f.a), o: B(s, f.o), i: B(s, f.i), u: B(s, f.u), e: B(s, f.e), m: B(s, f.e), te: { ...B(s, on[0]), te: on[1], ta: on[2] } };
}

function basesAdj(palabra, lectura, clase) {
  if (clase === 'adj-na') {
    if (!palabra) return null;
    const w = alinear(palabra, lectura);
    return { w, ku: B(w, 'じゃ'), ta: B(w, 'だっ'), te: B(w, 'で'), u: B(w, 'だ'), rentai: B(w, 'な'), katei: B(w, 'なら'), na: B(w) };
  }
  const ii = clase === 'adj-ii';
  if (ii ? !(/(いい|良い)$/.test(palabra) && /(いい|よい)$/.test(lectura)) : !(palabra.endsWith('い') && lectura.endsWith('い'))) return null;
  const w = alinear(palabra, lectura);
  let s;   // el tronco: 高 (de 高い) · よ (de いい) · 良 (de 良い)
  if (!ii) s = alinear(palabra.slice(0, -1), lectura.slice(0, -1));
  else if (palabra.endsWith('良い')) s = [...alinear(palabra.slice(0, -2), lectura.slice(0, -2)), { t: '良', r: 'よ' }];
  else s = [...alinear(palabra.slice(0, -2), lectura.slice(0, -2)), { t: 'よ' }];
  return { w, ku: B(s, 'く'), ta: B(s, 'かっ'), te: B(s, 'く'), u: B(w), rentai: B(w), katei: B(s, 'けれ'), stem: s, ii };
}

// ── explicaciones ──
const PEGA_FORMA = { masu: 'ます', masen: 'ません', mashita: 'ました', masendeshita: 'ませんでした', nai: 'ない', nakatta: 'なかった' };
function grupoOnbin(c, clase, lang, ta) {
  const t = ta ? 'た' : 'て', d = ta ? 'だ' : 'で';
  if (clase === 'iku') return TRAD(lang, `Excepción: く → っ${t} (no い${t})`, `Exception: く → っ${t} (not い${t})`);
  const m = { う: [`う・つ・る → っ${t}`], つ: [`う・つ・る → っ${t}`], る: [`う・つ・る → っ${t}`], く: [`く → い${t}`], ぐ: [`ぐ → い${d}`], す: [`す → し${t}`],
    ぬ: [`む・ぶ・ぬ → ん${d}`], ぶ: [`む・ぶ・ぬ → ん${d}`], む: [`む・ぶ・ぬ → ん${d}`] }[c];
  return m[0];
}
function explicaVerbo(f, clase, ctx, lang) {
  const { ex, res, c } = ctx, e = (es, en) => TRAD(lang, es, en);
  const fila = c && FILAS[c];
  if (f === 'te' || f === 'ta' || f === 'teiru') {
    const ta = f === 'ta', suf = ta ? 'た' : 'て';
    let regla;
    if (GODAN.includes(clase) || clase === 'iku') regla = (clase === 'iku' ? '' : e('五段: ', 'Godan: ')) + grupoOnbin(c, clase, lang, ta);
    else if (clase === 'ichi' || clase === 'kureru') regla = e(`一段: se quita る + ${suf}`, `Ichidan: drop る + ${suf}`);
    else if (clase === 'suru') regla = `する → し${suf}`;
    else if (clase === 'suru-n') regla = e(`Sustantivo + する → し${suf}`, `Noun + する → し${suf}`);
    else if (clase === 'kuru') regla = e(`来る → き${suf} (la lectura pasa a き)`, `来る → き${suf} (the reading becomes き)`);
    else if (clase === 'aru') regla = e(`る → っ${suf}`, `る → っ${suf}`);
    if (f === 'teiru') regla = e(`Forma て + いる (${regla.replace(/^五段: |^Godan: /, '')})`, `て form + いる (${regla.replace(/^五段: |^Godan: /, '')})`);
    return `${regla}: ${ex} → ${res}`;
  }
  const suf = PEGA_FORMA[f], neg = f === 'nai' || f === 'nakatta';
  let regla;
  if (neg && clase === 'aru') return e(`Excepción: ある no hace *あらない; la negación es ${f === 'nai' ? 'ない' : 'なかった'}: ${ex} → ${res}`, `Exception: ある does not make *あらない; the negative is ${f === 'nai' ? 'ない' : 'なかった'}: ${ex} → ${res}`);
  if (GODAN.includes(clase) || clase === 'iku' || clase === 'aru') {
    const fila_ = neg ? 'a' : 'i';
    regla = e(`五段: ${c} → ${fila[fila_]} + ${suf}`, `Godan: ${c} → ${fila[fila_]} + ${suf}`);
    if (neg && c === 'う') regla += e(' (con う es わ, no あ)', ' (う takes わ, not あ)');
  } else if (clase === 'ichi' || clase === 'kureru') regla = e(`一段: se quita る + ${suf}`, `Ichidan: drop る + ${suf}`);
  else if (clase === 'suru') regla = `する → し + ${suf}`;
  else if (clase === 'suru-n') regla = e(`Sustantivo + する → し + ${suf}`, `Noun + する → し + ${suf}`);
  else if (clase === 'kuru') regla = neg ? e(`来る → こ + ${suf} (la lectura pasa a こ)`, `来る → こ + ${suf} (the reading becomes こ)`) : e(`来る → き + ${suf} (la lectura pasa a き)`, `来る → き + ${suf} (the reading becomes き)`);
  return `${regla}: ${ex} → ${res}`;
}

// la regla de cada celda de la tabla
function explicaCelda(id, clase, ctx, lang) {
  const { ex, res, c } = ctx, e = (es, en) => TRAD(lang, es, en);
  const fila = c && FILAS[c], godan = GODAN.includes(clase) || clase === 'iku' || clase === 'aru';
  const dic = e('Forma de diccionario', 'Dictionary form');
  if (godan) {
    const T = {
      'mizen-nai': e(`五段: 未然形 es la fila あ (${fila.a}) + ない${c === 'う' ? ' (con う es わ, no あ)' : ''}`, `Godan: 未然形 is the あ row (${fila.a}) + ない${c === 'う' ? ' (う takes わ, not あ)' : ''}`),
      'mizen-u': e(`五段: 未然形 en la fila お (${fila.o}) + う`, `Godan: 未然形 in the お row (${fila.o}) + う`),
      'renyo-masu': e(`五段: 連用形 es la fila い (${fila.i}) + ます`, `Godan: 連用形 is the い row (${fila.i}) + ます`),
      'renyo-te': e(`連用形 con 音便: ${grupoOnbin(c, clase, lang, false)}`, `連用形 with 音便: ${grupoOnbin(c, clase, lang, false)}`),
      shushi: dic,
      rentai: e('連体形 = forma de diccionario, antes de un sustantivo (〜とき, 〜人…)', '連体形 = dictionary form, before a noun (〜とき, 〜人…)'),
      katei: e(`五段: 仮定形 es la fila え (${fila.e}) + ば`, `Godan: 仮定形 is the え row (${fila.e}) + ば`),
      meirei: e(`五段: 命令形 es la fila え (${fila.e})`, `Godan: 命令形 is the え row (${fila.e})`),
    };
    return `${T[id]}: ${ex} → ${res}`;
  }
  if (clase === 'ichi' || clase === 'kureru') {
    const T = {
      'mizen-nai': e('一段: 未然形 = la raíz (sin る) + ない', 'Ichidan: 未然形 = the stem (without る) + ない'), 'mizen-u': e('一段: 未然形 = la raíz + よう', 'Ichidan: 未然形 = the stem + よう'),
      'renyo-masu': e('一段: 連用形 = la raíz + ます', 'Ichidan: 連用形 = the stem + ます'), 'renyo-te': e('一段: 連用形 = la raíz + て (sin 音便)', 'Ichidan: 連用形 = the stem + て (no 音便)'),
      shushi: dic, rentai: e('連体形 = forma de diccionario, antes de un sustantivo', '連体形 = dictionary form, before a noun'),
      katei: e('一段: 仮定形 = la raíz + れ + ば', 'Ichidan: 仮定形 = the stem + れ + ば'),
      meirei: clase === 'kureru' ? e('Excepción: くれる hace くれ (no *くれろ)', 'Exception: くれる gives くれ (not *くれろ)') : e('一段: 命令形 = la raíz + ろ', 'Ichidan: 命令形 = the stem + ろ'),
    };
    return `${T[id]}: ${ex} → ${res}`;
  }
  if (clase === 'suru' || clase === 'suru-n') {
    const T = { 'mizen-nai': 'し + ない', 'mizen-u': 'し + よう', 'renyo-masu': 'し + ます', 'renyo-te': 'し + て', shushi: dic, rentai: e('する + sustantivo', 'する + noun'), katei: 'すれ + ば', meirei: 'しろ' };
    return `${clase === 'suru-n' ? e('Sustantivo + する: ', 'Noun + する: ') : e('Irregular: ', 'Irregular: ')}${T[id]}: ${ex} → ${res}`;
  }
  if (clase === 'kuru') {
    const T = { 'mizen-nai': 'こ + ない', 'mizen-u': 'こ + よう', 'renyo-masu': 'き + ます', 'renyo-te': 'き + て', shushi: dic, rentai: e('くる + sustantivo', 'くる + noun'), katei: 'くれ + ば', meirei: 'こい' };
    return `${e('Irregular: la lectura de 来 cambia. ', 'Irregular: the reading of 来 changes. ')}${T[id]}: ${ex} → ${res}`;
  }
  return '';
}

function explicaAdj(id, clase, ctx, lang) {
  const { ex, res } = ctx, e = (es, en) => TRAD(lang, es, en);
  const T = {
    'adj-i': { nai: e('〜い → 〜く + ない', '〜い → 〜く + ない'), ta: e('〜い → 〜かった', '〜い → 〜かった'), nakatta: e('〜い → 〜く + なかった', '〜い → 〜く + なかった'), te: e('〜い → 〜くて', '〜い → 〜くて'),
      shushi: e('Forma de diccionario', 'Dictionary form'), rentai: e('連体形 = forma de diccionario, antes de un sustantivo', '連体形 = dictionary form, before a noun'), katei: e('〜い → 〜けれ + ば', '〜い → 〜けれ + ば') },
    'adj-ii': { nai: e('いい es よい: いい → よく + ない', 'いい is よい: いい → よく + ない'), ta: e('いい es よい: いい → よかった', 'いい is よい: いい → よかった'), nakatta: e('いい es よい: いい → よく + なかった', 'いい is よい: いい → よく + なかった'),
      te: e('いい es よい: いい → よくて', 'いい is よい: いい → よくて'), shushi: e('Forma de diccionario', 'Dictionary form'), rentai: e('連体形 = forma de diccionario, antes de un sustantivo', '連体形 = dictionary form, before a noun'),
      katei: e('いい es よい: いい → よけれ + ば', 'いい is よい: いい → よけれ + ば') },
    'adj-na': { nai: e('な形容詞: + じゃない (más formal: ではない)', 'な-adjective: + じゃない (more formal: ではない)'), ta: e('な形容詞: + だった', 'な-adjective: + だった'),
      nakatta: e('な形容詞: + じゃなかった (más formal: ではなかった)', 'な-adjective: + じゃなかった (more formal: ではなかった)'), te: e('な形容詞: + で', 'な-adjective: + で'),
      shushi: e('な形容詞: + だ al final de la frase', 'な-adjective: + だ at the end of a sentence'), rentai: e('な形容詞: + な antes de un sustantivo', 'な-adjective: + な before a noun'),
      katei: e('な形容詞: + なら', 'な-adjective: + なら') },
  }[clase];
  return `${T[id]}: ${ex} → ${res}`;
}

// ── la función pública ──
const CLAVE_ADJ = { 'a-nai': 'nai', 'a-ta': 'ta', 'a-nakatta': 'nakatta', 'a-te': 'te' };
const CELDA_ADJ = { 'renyo-nai': 'nai', 'renyo-ta': 'ta', 'renyo-te': 'te', shushi: 'shushi', rentai: 'rentai', katei: 'katei' };
const SIN_TEIRU = new Set(['いる', '居る', 'ある', '有る', '在る']);
const dic = (segs) => furiDe(segs);

/**
 * La forma conjugada de una palabra. Para una tabla (forma = 't-…') hay que pasar la celda («renyo-te»…).
 * → { kanji, kana, furigana, base, base_furigana, pega, explica, otras? } o null si no se aplica.
 *   base: «書か + ない» (solo en las celdas de tabla); pega: lo que se pega de verdad («で» en 飲んで…); otras: otras respuestas válidas.
 */
export function conjugar(palabra, lectura, clase, forma_, celda = null, lang = 'es') {
  palabra = String(palabra || ''); lectura = String(lectura || '');
  const F = forma(forma_);
  if (!F || !F.clases.includes(clase) || !palabra || !lectura) return null;
  return F.grupo === 'adjetivo' ? adjetivo(palabra, lectura, clase, forma_, null, lang) : F.grupo === 'tabla'
    ? (ADJETIVOS.includes(clase) ? adjetivo(palabra, lectura, clase, forma_, celda, lang) : verbo(palabra, lectura, clase, forma_, celda, lang)) : verbo(palabra, lectura, clase, forma_, null, lang);
}

function verbo(palabra, lectura, clase, f, celda, lang) {
  const b = basesVerbo(palabra, lectura, clase);
  if (!b) return null;
  const c = FINAL_DE[clase];
  const ctx = { c, ex: dic(alinear(palabra, lectura)) };
  let base, suf, pega = '', id = celda;
  if (f.startsWith('t-')) {
    if (clase === 'aru' || !celda) return null;
    const cel = TODAS[f].find((x) => x.id === celda);
    if (!cel) return null;
    const u = GODAN.includes(clase) || clase === 'iku' ? 'う' : 'よう';
    switch (celda) {
      case 'mizen-nai': base = b.a; pega = 'ない'; break;
      case 'mizen-u': base = b.o; pega = u; break;
      case 'renyo-masu': base = b.i; pega = 'ます'; break;
      case 'renyo-te': base = b.te; pega = b.te.te; break;
      case 'shushi': base = b.u; break;
      case 'rentai': base = b.u; pega = 'とき'; break;
      case 'katei': base = b.e; pega = 'ば'; break;
      case 'meirei': base = b.m; break;
      default: return null;
    }
    suf = base.suf + pega;
    const r = juntar(base.segs, suf), baseSolo = juntar(base.segs, base.suf);
    // «書か + ない»: la base y lo que se le pega (la 終止形 y la 命令形 van enteras)
    const sepb = (x) => (pega ? `${x} + ${pega}` : x);
    const res = { ...r, base: sepb(baseSolo.kanji), base_furigana: sepb(baseSolo.furigana), pega, otras: [] };
    ctx.res = r.furigana;
    if (clase === 'kureru' && celda === 'meirei') { res.base = 'くれ'; res.base_furigana = 'くれ'; }
    res.explica = explicaCelda(id, clase, ctx, lang);
    return res;
  }
  // formas sueltas
  if (f === 'teiru' && SIN_TEIRU.has(palabra)) return null;
  if (f === 'nai' || f === 'nakatta') {
    if (clase === 'aru') { const r = juntar([], f === 'nai' ? 'ない' : 'なかった'); ctx.res = r.furigana; return { ...r, base: '', explica: explicaVerbo(f, clase, ctx, lang) }; }
    base = b.a; suf = base.suf + PEGA_FORMA[f];
  } else if (PEGA_FORMA[f]) { base = b.i; suf = base.suf + PEGA_FORMA[f]; }
  else if (f === 'ta') { base = b.te; suf = base.suf + base.ta; }
  else if (f === 'te') { base = b.te; suf = base.suf + base.te; }
  else if (f === 'teiru') { base = b.te; suf = base.suf + base.te + 'いる'; }
  else return null;
  const r = juntar(base.segs, suf);
  ctx.res = r.furigana;
  return { ...r, base: '', explica: explicaVerbo(f, clase, ctx, lang) };
}

function adjetivo(palabra, lectura, clase, f, celda, lang) {
  const b = basesAdj(palabra, lectura, clase);
  if (!b) return null;
  const na = clase === 'adj-na', ctx = { ex: dic(alinear(palabra, lectura)) };
  let k = CLAVE_ADJ[f], base, pega = '', otras = [];
  if (f.startsWith('t-')) {
    if (!celda || !CELDA_ADJ[celda] || !TODAS[f].some((x) => x.id === celda)) return null;
    k = CELDA_ADJ[celda];
  }
  const tabla = f.startsWith('t-');
  switch (k) {
    case 'nai': base = b.ku; pega = 'ない'; break;
    case 'ta': base = b.ta; pega = 'た'; break;
    case 'nakatta': base = b.ku; pega = 'なかった'; break;
    case 'te': base = b.te; pega = na ? '' : 'て'; break;
    case 'shushi': base = b.u; break;
    case 'rentai': base = b.rentai; pega = 'とき'; break;
    case 'katei': base = b.katei; pega = na ? '' : 'ば'; break;
    default: return null;
  }
  if (!tabla && (k === 'shushi' || k === 'rentai' || k === 'katei')) return null;
  if (!tabla) pega = { nai: 'ない', ta: 'た', nakatta: 'なかった', te: na ? '' : 'て' }[k];
  const r = juntar(base.segs, base.suf + pega);
  if (na && (k === 'nai' || k === 'nakatta')) {
    const alt = juntar(base.segs, 'では' + pega);
    otras = [{ kanji: alt.kanji, kana: alt.kana, furigana: alt.furigana }];
  }
  ctx.res = r.furigana;
  const res = { ...r, base: '', explica: explicaAdj(k, clase, ctx, lang), otras };
  if (tabla) {
    // «高く + ない»: la base y lo que se le pega (en な/で/なら la pieza va dentro de la base)
    const pegaVista = na && k === 'te' ? 'で' : na && k === 'katei' ? 'なら' : na && k === 'shushi' ? 'だ' : pega;
    const baseVista = na && (k === 'te' || k === 'katei' || k === 'shushi') ? b.na : base;
    const solo = juntar(baseVista.segs, baseVista.suf), pg = pegaVista;
    res.base = pg ? `${solo.kanji} + ${pg}` : solo.kanji;
    res.base_furigana = pg ? `${solo.furigana} + ${pg}` : solo.furigana;
    res.pega = pg;
  } else { res.pega = pega; }
  return res;
}

/** Todas las celdas de una tabla para una palabra: [{id, base, pega, respuesta: {kanji,kana,furigana}, base_txt, base_furigana, explica}] */
export function celdasDe(palabra, lectura, clase, tabla, lang = 'es') {
  if (!aplica(tabla, clase) || !CELDAS[tabla]) return null;
  const salida = [];
  for (const cel of CELDAS[tabla]) {
    const r = conjugar(palabra, lectura, clase, tabla, cel.id, lang);
    if (!r) continue;
    const tambien = (TAMBIEN[cel.id] || []).map((id) => conjugar(palabra, lectura, clase, tabla, id, lang)).filter(Boolean)
      .map((x) => ({ kanji: x.kanji, kana: x.kana, furigana: x.furigana, base_txt: x.base, base_furigana: x.base_furigana, explica: x.explica }));
    salida.push({ id: cel.id, base: cel.base, pega: cel.pega, pega_real: r.pega ?? cel.pega, respuesta: { kanji: r.kanji, kana: r.kana, furigana: r.furigana }, base_txt: r.base,
      base_furigana: r.base_furigana, explica: r.explica, otras: r.otras || [], tambien });
  }
  return salida;
}

/** «Forma て» para la pregunta de repaso (en el idioma pedido); en los adjetivos, «Adjetivo · Pasado» */
export function enunciado(f, clase = null, lang = 'es') {   // (clase no cambia el texto: solo por si más adelante hace falta)
  const F = forma(f);
  if (!F) return '';
  if (F.grupo === 'tabla') return `${baseRuby('活用')} · ${baseRuby(F.jp)}`;
  // los adjetivos no dicen el patrón (〜くない / 〜じゃない ya es la respuesta): solo el nombre de la forma
  if (F.grupo === 'adjetivo') return `${TRAD(lang, 'Adjetivo', 'Adjective')} · ${textoForma(F, lang).titulo}`;
  return TRAD(lang, `Forma ${F.jp.replace(/〜/g, '')}`, `Form ${F.jp.replace(/〜/g, '')}`);
}
/** El nombre de una celda de la tabla para la pregunta: «活用 · 仮定形 (〜ば)» */
export function enunciadoCelda(tabla, celdaId, pega = null, dominado = false) {
  const cel = (CELDAS[tabla] || []).find((x) => x.id === celdaId);
  if (!cel) return '';
  const p = pega ?? cel.pega;
  return `${baseRuby('活用')} · ${baseRuby(cel.base, dominado)}${p ? ` (〜${p})` : ''}`;
}

/** La forma de diccionario tal como se enseña: { palabra, lectura, furigana } (un sustantivo con する se muestra como verbo: 勉強する) */
export function diccionario(palabra, lectura, clase) {
  const suru = clase === 'suru-n';
  const p = suru ? palabra + 'する' : palabra, l = suru ? lectura + 'する' : lectura;
  return { palabra: p, lectura: l, furigana: furiDe(alinear(palabra, lectura)) + (suru ? 'する' : '') };
}

/** La regla de la tabla de una clase, en una línea («五段: ま・み・む・む・め・め»), para el pie de una ronda de tabla */
export function reglaTabla(clase, lang = 'es') {
  const e = (es, en) => TRAD(lang, es, en);
  if (GODAN.includes(clase) || clase === 'iku') {
    const f = FILAS[FINAL_DE[clase]];
    return e(`五段: ${f.a}・${f.i}・${f.u}・${f.u}・${f.e}・${f.e}. La vocal final recorre su fila (あ・い・う・う・え・え).`, `Godan: ${f.a}・${f.i}・${f.u}・${f.u}・${f.e}・${f.e}. The final vowel runs through its row (a・i・u・u・e・e).`);
  }
  if (clase === 'ichi' || clase === 'kureru') return e('一段: se quita る y se pega la terminación (ない・ます・て・る・れば・ろ).', 'Ichidan: drop る and attach the ending (ない・ます・て・る・れば・ろ).');
  if (clase === 'suru' || clase === 'suru-n') return e('サ変: し・し・する・する・すれ・しろ. Con un sustantivo: 勉強する.', 'Irregular: し・し・する・する・すれ・しろ. With a noun: 勉強する.');
  if (clase === 'kuru') return e('カ変: こ・き・くる・くる・くれ・こい. 来 cambia de lectura.', 'Irregular: こ・き・くる・くる・くれ・こい. 来 changes its reading.');
  if (clase === 'adj-i' || clase === 'adj-ii') return e('い形容詞: 〜く・〜かっ・〜い・〜い・〜けれ. いい es よい: よく・よかっ・よけれ.', 'い-adjective: 〜く・〜かっ・〜い・〜い・〜けれ. いい is よい: よく・よかっ・よけれ.');
  if (clase === 'adj-na') return e('な形容詞: 〜じゃ・〜だっ・〜で・〜だ・〜な・〜なら.', 'な-adjective: 〜じゃ・〜だっ・〜で・〜だ・〜な・〜なら.');
  return '';
}

// 11-10: qué tipo de verbo o adjetivo es (se enseña al resolver: «考える es 一段»)
const FINAL_GODAN = { 'g-u': 'う', 'g-ku': 'く', 'g-gu': 'ぐ', 'g-su': 'す', 'g-tsu': 'つ', 'g-nu': 'ぬ', 'g-bu': 'ぶ', 'g-mu': 'む', 'g-ru': 'る' };
export function tipoDe(clase, lang = 'es') {
  if (clase === 'g-ru') return TRAD(lang, 'Verbo 五段 (godan) en る: parece 一段, pero no lo es', 'Godan verb ending in る: looks ichidan, but isn’t');
  if (clase in FINAL_GODAN) return TRAD(lang, `Verbo 五段 (godan) en ${FINAL_GODAN[clase]}`, `Godan verb ending in ${FINAL_GODAN[clase]}`);
  if (clase === 'iku') return TRAD(lang, 'Verbo 五段 (godan) con excepción: 行って, 行った', 'Godan verb with an exception: 行って, 行った');
  if (clase === 'aru') return TRAD(lang, 'Verbo 五段 (godan) con excepción: su negativo es ない', 'Godan verb with an exception: its negative is ない');
  if (clase === 'ichi' || clase === 'kureru') return TRAD(lang, 'Verbo 一段 (ichidan)', 'Ichidan verb');
  if (clase === 'suru' || clase === 'suru-n') return TRAD(lang, 'Verbo irregular する (サ変)', 'Irregular verb する (サ変)');
  if (clase === 'kuru') return TRAD(lang, 'Verbo irregular 来る (カ変)', 'Irregular verb 来る (カ変)');
  if (clase === 'adj-ii') return TRAD(lang, 'Adjetivo い (いい se conjuga como よい)', 'い-adjective (いい conjugates as よい)');
  if (clase === 'adj-i') return TRAD(lang, 'Adjetivo い', 'い-adjective');
  if (clase === 'adj-na') return TRAD(lang, 'Adjetivo な', 'な-adjective');
  return '';
}

// 11-10: los nombres de la tabla también se aprenden: lectura, qué significan y de dónde sale cada kanji.
// Se enseñan con furigana en todas partes (baseRuby) y tienen su propia práctica («Los nombres de la tabla», t-nombres).
export const BASES = {
  '未然形': { lectura: 'みぜんけい', es: 'aún no', en: 'not yet', pega: 'ない・う / よう',
    kanji: { es: '未 «aún no» + 然 «así» + 形 «forma»: la forma de lo que todavía no ha pasado', en: '未 «not yet» + 然 «so» + 形 «form»: the form of what hasn’t happened yet' } },
  '連用形': { lectura: 'れんようけい', es: 'se une', en: 'joins on', pega: 'ます・て・た',
    kanji: { es: '連 «unir» + 用 «uso» (verbo) + 形 «forma»: la forma que se une a otra palabra', en: '連 «join» + 用 «use» (verb) + 形 «form»: the form that joins onto another word' } },
  '終止形': { lectura: 'しゅうしけい', es: 'final', en: 'final', pega: '。',
    kanji: { es: '終 «terminar» + 止 «parar» + 形 «forma»: la forma con la que se acaba la frase', en: '終 «end» + 止 «stop» + 形 «form»: the form that ends the sentence' } },
  '連体形': { lectura: 'れんたいけい', es: 'ante un sustantivo', en: 'before a noun', pega: 'とき・人…',
    kanji: { es: '連 «unir» + 体 «cuerpo» (sustantivo) + 形 «forma»: la forma que va pegada a un sustantivo', en: '連 «join» + 体 «body» (noun) + 形 «form»: the form that goes before a noun' } },
  '仮定形': { lectura: 'かていけい', es: 'suposición', en: 'supposition', pega: 'ば',
    kanji: { es: '仮 «provisional» + 定 «fijar» + 形 «forma»: la forma de «si…»', en: '仮 «provisional» + 定 «set» + 形 «form»: the «if…» form' } },
  '命令形': { lectura: 'めいれいけい', es: 'orden', en: 'command', pega: '!',
    kanji: { es: '命令 «orden, mandato» + 形 «forma»: la forma de mandar', en: '命令 «order, command» + 形 «form»: the form for giving orders' } },
};
// otras palabras de la sección, con su lectura (para poner furigana a títulos y pestañas)
export const PALABRAS = { '活用': 'かつよう', '動詞': 'どうし', '形容詞': 'けいようし', '五段': 'ごだん', '一段': 'いちだん', 'サ変': 'さへん', 'カ変': 'かへん',
  '音便': 'おんびん', '五段活用': 'ごだんかつよう', '一段活用': 'いちだんかつよう', 'サ変活用': 'さへんかつよう', 'カ変活用': 'かへんかつよう', 'い形容詞': 'いけいようし', 'な形容詞': 'なけいようし', '来る': 'くる', '名前': 'なまえ' };
export const NOMBRES = Object.keys(BASES);
/** Rango (de rango() del motor) desde el que los nombres de la tabla se dan por sabidos: 2 = estabilidad de 10 días o más */
export const RANGO_NOMBRES = 2;
/**
 * «未然形» → «未然形[みぜんけい]» (para ruby() de japones.js). El resto de las palabras de la sección (五段, 活用…) también, aunque vayan
 * dentro de una frase («Tabla 活用», «Verbos 五段»). Con dominado = true los seis nombres de las bases salen sin lectura (ya se saben);
 * el resto de palabras la conservan.
 */
export function baseRuby(texto, dominado = false) {
  texto = String(texto ?? '');
  const b = BASES[texto];
  if (b) return dominado ? texto : `${texto}[${b.lectura}]`;
  const l = PALABRAS[texto];
  if (l) {
    // con kana delante o detrás (い形容詞, サ変活用) la lectura va solo sobre los kanji
    const m = texto.match(/^([ぁ-ゖァ-ヺ]*)(.*?)([ぁ-ゖァ-ヺ]*)$/);
    const pre = m[1], medio = m[2], post = m[3];
    const lm = l.slice(pre.length ? [...pre].length : 0, post.length ? -[...post].length : undefined);
    return `${pre}${pre ? ' ' : ''}${medio}[${lm}]${post}`;
  }
  return furiBases(texto, dominado);
}
// las palabras que llevan lectura dentro de una frase (la más larga primero; «来る» solo suelta: dentro de una frase no se sabe su lectura)
const EN_FRASE = [...Object.keys(BASES), ...Object.keys(PALABRAS).filter((k) => k !== '来る')].sort((a, b) => b.length - a.length);
const RE_FRASE = new RegExp(`(${EN_FRASE.join('|')})(?!\\[)`, 'g');
/** Pone lectura a cada nombre de base y palabra conocida dentro de un texto («五段: 未然形 es…»); lo que ya trae «[» se deja como está */
export function furiBases(texto, dominado = false) {
  return String(texto ?? '').replace(RE_FRASE, (k) => baseRuby(k, dominado));
}

/**
 * Una pregunta de «Los nombres de la tabla»: el nombre en kanji, su lectura, qué significa y de dónde sale cada kanji.
 * → { id, jp, lectura, furigana, significado, kanji, pega, explica }
 */
export function datosNombre(base, lang = 'es') {
  const b = BASES[base];
  if (!b) return null;
  const significado = b[lang === 'en' ? 'en' : 'es'], kanji = b.kanji[lang === 'en' ? 'en' : 'es'];
  return { id: base, jp: base, lectura: b.lectura, furigana: `${base}[${b.lectura}]`, significado, kanji, pega: b.pega,
    explica: `«${significado}» · ${base}: ${kanji}. ${TRAD(lang, 'Se le pega', 'Attaches')}: ${b.pega}` };
}
