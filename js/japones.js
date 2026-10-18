// Japonés: furigana, rōmaji → kana, comprobar respuestas y acento tonal
import { idioma, t } from './i18n.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// «漢字[かな]» → <ruby>; conserva <b>; **negrita** → <b>
// El espacio antes del kanji solo separa (como en Anki) si va entre japonés; en un texto en español se conserva.
// La base lleva al menos un kanji o una cifra y no cruza saltos de línea: «[sustantivo] + だ» es una plantilla, no furigana.
// la base del furigana (lo que va bajo la lectura) empieza tras un espacio o un signo de puntuación: «(食[た]べる)» o
// «「猫[ねこ]」» ponen la lectura solo sobre el kanji
export function ruby(s) {
  return esc(s).replace(/&lt;(\/?)b&gt;/g, '<$1b>').replace(/( ?)([^ 　>\[\]\n()（）「」『』«»《》、。，,！？!?・〜～：:&;“”]*?[0-9０-９一-鿿㐀-䶿々〆ヶ][^ 　>\[\]\n()（）「」『』«»《》、。，,！？!?・〜～：:&;“”]*?)\[([^\]]+)\]/g, (m, sp, base, lectura, pos, todo) => {
    const antes = todo[pos - 1] || '';
    const guarda = sp && antes && !/[　-ヿ一-鿿＀-￯>\]]/.test(antes);
    // «大[おお]きい<b>声[こえ]</b>» sin las negritas queda «きい声[こえ]»: el kana de delante que la lectura no lleva se
    // queda fuera del ruby (si no, こえ se pinta centrado sobre «きい声», 02-10)
    const pre = (base.match(/^[ぁ-ゖゝゞァ-ヺー]+(?=[0-9０-９一-鿿㐀-䶿々〆ヶ])/) || [''])[0];
    if (pre && !aHira(lectura).startsWith(aHira(pre))) base = base.slice(pre.length);
    else return `${guarda ? ' ' : ''}<ruby>${base}<rt>${lectura}</rt></ruby>`;
    return `${guarda ? ' ' : ''}${pre}<ruby>${base}<rt>${lectura}</rt></ruby>`;
  });
}
export const sinFurigana = (s) => String(s || '').replace(/ ?\[[^\]]*\]/g, '').replace(/<\/?b>/g, '');
export const negrita = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
// «Pasado: + だった» es una fórmula («la palabra + だった»): el «+» suelto se leía como una errata, así que se pinta
// una casilla vacía donde va la palabra («Pasado: ▢ + だった»).
export const textoRico = (s) => ruby(String(s || '').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')).replace(/(^|\n|<br>|[:：])\s*\+ /g, '$1 <i class="hueco-palabra" aria-label="palabra"></i> + ').replace(/\n/g, '<br>');

export const aHira = (s) => String(s || '').replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
const ROMA = {};
'a:あ i:い u:う e:え o:お ka:か ki:き ku:く ke:け ko:こ sa:さ shi:し si:し su:す se:せ so:そ ta:た chi:ち ti:ち tsu:つ tu:つ te:て to:と na:な ni:に nu:ぬ ne:ね no:の ha:は hi:ひ fu:ふ hu:ふ he:へ ho:ほ ma:ま mi:み mu:む me:め mo:も ya:や yu:ゆ yo:よ ra:ら ri:り ru:る re:れ ro:ろ wa:わ wo:を ga:が gi:ぎ gu:ぐ ge:げ go:ご za:ざ ji:じ zi:じ zu:ず ze:ぜ zo:ぞ da:だ di:ぢ du:づ de:で do:ど ba:ば bi:び bu:ぶ be:べ bo:ぼ pa:ぱ pi:ぴ pu:ぷ pe:ぺ po:ぽ kya:きゃ kyu:きゅ kyo:きょ sha:しゃ shu:しゅ sho:しょ sya:しゃ syu:しゅ syo:しょ she:しぇ cha:ちゃ chu:ちゅ cho:ちょ che:ちぇ tya:ちゃ tyu:ちゅ tyo:ちょ cya:ちゃ cyu:ちゅ cyo:ちょ nya:にゃ nyu:にゅ nyo:にょ hya:ひゃ hyu:ひゅ hyo:ひょ mya:みゃ myu:みゅ myo:みょ rya:りゃ ryu:りゅ ryo:りょ gya:ぎゃ gyu:ぎゅ gyo:ぎょ ja:じゃ ju:じゅ jo:じょ je:じぇ jya:じゃ jyu:じゅ jyo:じょ zya:じゃ zyu:じゅ zyo:じょ bya:びゃ byu:びゅ byo:びょ pya:ぴゃ pyu:ぴゅ pyo:ぴょ fa:ふぁ fi:ふぃ fe:ふぇ fo:ふぉ va:ゔぁ vi:ゔぃ vu:ゔ ve:ゔぇ vo:ゔぉ thi:てぃ dhi:でぃ xa:ぁ xi:ぃ xu:ぅ xe:ぇ xo:ぉ la:ぁ li:ぃ lu:ぅ le:ぇ lo:ぉ xtu:っ ltu:っ xya:ゃ xyu:ゅ xyo:ょ -:ー'
  .split(' ').forEach((p) => { const [r, k] = p.split(':'); ROMA[r] = k; });
export function aKana(txt, final = false) {
  const s = String(txt).toLowerCase(); let out = '', i = 0;
  while (i < s.length) {
    const c = s[i];
    if (!/[a-z\-']/.test(c)) { out += c; i++; continue; }
    if (c !== 'n' && c === s[i + 1] && /[bcdfghjkmpqrstvwxyz]/.test(c)) { out += 'っ'; i++; continue; }
    if (c === 'n') {
      const nx = s[i + 1];
      if (nx === 'n' || nx === "'") { out += 'ん'; i += 2; continue; }
      if (nx === undefined) { out += final ? 'ん' : 'n'; i++; continue; }
      if (!/[aiueoy]/.test(nx)) { out += 'ん'; i++; continue; }
    }
    let ok = false;
    for (const L of [3, 2, 1]) { const t = s.slice(i, i + L); if (ROMA[t]) { out += ROMA[t]; i += L; ok = true; break; } }
    if (!ok) { out += c; i++; }
  }
  return out;
}
const VOCAL = {};
Object.entries(ROMA).forEach(([r, k]) => { if (k.length === 1 && /[aiueo]$/.test(r)) VOCAL[k] = 'あいうえお'['aiueo'.indexOf(r.slice(-1))]; });
export function normLectura(s) {
  const h = aHira(s).replace(/[\s・。、〜~()（）\[\]「」.,!?！？\-.]/g, '');
  let out = '';
  for (const ch of h) out += ch === 'ー' ? (VOCAL[out.slice(-1)] || '') : ch;
  return out;
}
// para comparar respuestas escritas en rōmaji Hepburn: las partículas は, を y へ se escriben como suenan (wa, o, e)
export const comoSuena = (s) => normLectura(s).replace(/は/g, 'わ').replace(/を/g, 'お').replace(/へ/g, 'え');
// «なに・なん», «よん、し» → cada lectura por separado
export const partirLecturas = (s) => String(s || '').split(/[、,，/／・]/).map((x) => x.trim()).filter(Boolean);

// Significados: sin tildes («el» = «él»), sin paréntesis ni artículo inicial (solo si queda algo detrás; entero: con él).
// Errata = una letra de más, de menos o cambiada en una palabra de 6 letras o más (dos desde 12), nunca en la primera letra,
// nunca si solo cambia el género o el número (padre/madre, hermano/hermana, gato/gatos) ni si da el significado de otra tarjeta.
// El inglés del mazo (en) solo vale exacto. El español no se parte por comas ni por « o »: sus alternativas ya van en alt.
const ARTICULO = /^(el|la|los|las|un|una|unos|unas)\s+/, ARTICULO_EN = /^(to|the|a|an)\s+/;
const norm = (s, en = false, entero = false) => {
  const t = String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  return entero ? t : t.replace(en ? ARTICULO_EN : ARTICULO, '') || t;
};
function distancia(a, b) {
  const m = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) m[i][j] = Math.min(m[i][j], m[i - 2][j - 2] + 1); // dos letras cambiadas de sitio
  }
  return m[a.length][b.length];
}
export function variantes(lista, en = false, entero = false) {
  const out = new Set();
  for (const x of (lista || []).filter(Boolean)) {
    const s = String(x).replace(/\([^)]*\)|\[[^\]]*\]/g, ' ');
    for (const trozo of s.split(en ? /[,;/]| or / : /[;/]/)) { const n = norm(trozo, en, entero); if (n) out.add(n); }
  }
  return [...out];
}
// significados de todas las tarjetas (los pone opciones.js al cargar el pool): uno de otra tarjeta nunca es una errata
let CONOCIDOS = new Set();
export function ponerConocidos(lista) { CONOCIDOS = new Set(idioma === 'en' ? (lista || []).filter(Boolean).flatMap((x) => partirEn(x).flatMap((y) => [...formasEn(y)])) : variantes(lista, false, true)); }
const raiz = (w) => w.replace(/s$/, '').replace(/[oae]$/, '');
function errata(r, v) {
  const a = r.split(' '), b = v.split(' ');
  if (a.length !== b.length) return a.join('') === b.join(''); // solo un espacio de más o de menos
  let n = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i], y = b[i];
    if (x === y) continue;
    if (y.length < 6 || x[0] !== y[0] || raiz(x) === raiz(y) || distancia(x, y) > (y.length >= 12 ? 2 : 1)) return false;
    n++;
  }
  return n > 0;
}
/** respuesta escrita frente a las válidas en español y, aparte, las inglesas (solo exactas). En la app inglesa, todas con las reglas del inglés. */
export function compararSignificado(respuesta, validas, ingles = [], lengua = idioma) {
  if (lengua === 'en') return compararEn(respuesta, validas, ingles);
  const r = norm(respuesta), rEntero = norm(respuesta, false, true), rEn = norm(respuesta, true);
  if (!r) return { ok: false };
  const enteras = variantes(validas, false, true), es = variantes(validas), en = variantes(ingles, true);
  // quitarle el artículo a la válida no puede dar otra tarjeta: いつか («un día») no acepta «día», que es 日
  const exacta = enteras.find((v) => v === rEntero || v === r) || en.find((v) => v === rEn || v === r) || (CONOCIDOS.has(r) ? null : es.find((v) => v === r));
  if (exacta) return { ok: true, exacto: true, con: exacta };
  if (CONOCIDOS.has(r) || CONOCIDOS.has(rEntero)) return { ok: false, otra: true };
  const casi = es.find((v) => errata(r, v));
  return casi ? { ok: true, exacto: false, con: casi, d: distancia(r, casi) } : { ok: false };
}

/** Medio punto (herramientas/mazo/casi.py): «mover» en 動く, que es «moverse». La entrada que casi vale, o null. Solo en español. */
export function medioPunto(respuesta, casi) {
  if (!casi?.length || idioma === 'en') return null;
  const r = norm(respuesta, false, true), r2 = norm(respuesta);
  return casi.find((x) => (x.r || []).some((y) => y === r || y === r2)) || null;
}

// ── significados en inglés ──
// Da igual: a/an/the en cualquier sitio, «to» delante del verbo, «to be/get/become» delante de un adjetivo (surprised = to be surprised),
// posesivos y objetos genéricos (my/your/one's, someone/something), contracciones (don't = do not) y la ortografía británica o americana
// (colour = color, centre = center, organise = organize, travelled = traveled). Plural = singular (books = book) salvo que sea
// el significado de otra tarjeta (news ≠ new). Errata: una letra desde 5 (dos desde 10), nunca en la primera ni si da otra tarjeta.
const BRIT = [
  [/^(col|flav|fav|hon|hum|lab|neighb|behavi|harb|rum|vap|od|arm|sav|glam|parl|vig|rig|splend|endeav|clam|ferv)our/, '$1or'],
  [/^(cent|theat|met|lit|fib|somb|lust|spect|calib|kilomet|centimet|millimet)re(s|d)?$/, '$1er$2'],
  [/^(.{3,})is(e|ed|es|ing|ation|ations|er|ers)$/, '$1iz$2'], [/^(.{2,})ys(e|ed|es|ing)$/, '$1yz$2'],
  [/^(travel|cancel|label|model|fuel|quarrel|marvel|level|signal|dial|total|equal|jewel|channel|tunnel|funnel|panel|counsel|shovel|pedal|rival|duel)l(ed|ing|er|ers)$/, '$1$2'],
];
const PALABRA_BRIT = { grey: 'gray', mum: 'mom', mummy: 'mommy', aeroplane: 'airplane', aluminium: 'aluminum', tyre: 'tire', tyres: 'tires', pyjamas: 'pajamas',
  plough: 'plow', defence: 'defense', offence: 'offense', licence: 'license', practise: 'practice', cheque: 'check', programme: 'program', catalogue: 'catalog',
  dialogue: 'dialog', cosy: 'cozy', moustache: 'mustache', doughnut: 'donut', storey: 'story', kerb: 'curb', sceptical: 'skeptical', mould: 'mold',
  jewellery: 'jewelry', marvellous: 'marvelous', axe: 'ax', whisky: 'whiskey', manoeuvre: 'maneuver', ageing: 'aging', judgement: 'judgment', enrol: 'enroll',
  fulfil: 'fulfill', skilful: 'skillful', woollen: 'woolen', towards: 'toward', afterwards: 'afterward', learnt: 'learned', spelt: 'spelled', dreamt: 'dreamed',
  burnt: 'burned', smelt: 'smelled', spilt: 'spilled', cannot: 'can not' };
const ortografia = (w) => PALABRA_BRIT[w] ?? BRIT.reduce((x, [re, por]) => x.replace(re, por), w);
const SOBRAN_EN = new Set(['a', 'an', 'the', 'someone', 'somebody', 'something', 'sth', 'sb', 'my', 'your', 'his', 'her', 'their', 'our', 'its', 'oneself', 'yourself', 'myself']);
const VACIAS_EN = new Set(['etc', 'eg', 'e g', 'ie', 'i e', 'or', 'and', 'also']);
const singular = (w) => (w.length < 4 ? w : /[^aeiou]ies$/.test(w) ? w.slice(0, -3) + 'y' : /(ch|sh|x|z|ss)es$/.test(w) ? w.slice(0, -2) : /(ss|us|is)$/.test(w) ? w : /s$/.test(w) ? w.slice(0, -1) : w);
function palabrasEn(s) {
  const x = String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘`´]/g, "'").replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
    .replace(/\b(one|someone|somebody|something)'s\b/g, ' ').replace(/\b(it|that|what|there|here|he|she|where|who|how)'s\b/g, '$1 is')
    .replace(/\bcan't\b/g, 'cannot').replace(/\bwon't\b/g, 'will not').replace(/n't\b/g, ' not')
    .replace(/'re\b/g, ' are').replace(/'m\b/g, ' am').replace(/'ve\b/g, ' have').replace(/'ll\b/g, ' will').replace(/'d\b/g, ' would').replace(/'s\b/g, '')
    .replace(/[^a-z0-9 ]/g, ' ');
  const w = x.split(/\s+/).filter(Boolean).flatMap((p) => ortografia(p).split(' '));
  const sin = w.filter((p) => !SOBRAN_EN.has(p));
  return sin.length ? sin : w; // «her» a secas sigue siendo «her»
}
/** Formas equivalentes de un significado inglés: entero, sin «to» y sin «to be/get/become». La primera es la canónica. */
function formasEn(s) {
  const w = palabrasEn(s), out = new Set();
  const poner = (l) => { if (l.length) out.add(l.join(' ')); };
  poner(w);
  const r = w[0] === 'to' && w.length > 1 ? w.slice(1) : w;
  poner(r);
  if (['be', 'get', 'become', 'being', 'getting'].includes(r[0]) && r.length > 1) poner(r.slice(1));
  return out;
}
// los paréntesis fuera ANTES de partir: «I (polite, general)» es «I», no «general»
const partirEn = (x) => String(x || '').replace(/\([^)]*\)|\[[^\]]*\]/g, ' ').split(/[,;/]| or /).map((y) => y.trim()).filter((y) => y && !VACIAS_EN.has(palabrasEn(y).join(' ')));
function errataEn(r, v) {
  const a = r.split(' '), b = v.split(' ');
  if (a.length !== b.length) return a.join('') === b.join('');
  let n = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i], y = b[i];
    if (x === y) continue;
    if (y.length < 5 || x[0] !== y[0] || singular(x) === singular(y) || distancia(x, y) > (y.length >= 10 ? 2 : 1)) return false;
    n++;
  }
  return n > 0;
}
function compararEn(respuesta, validas, ingles = []) {
  // la lista entera tal como se muestra («she, her, girlfriend») vale si vale cada acepción
  const partes = partirEn(respuesta);
  if (partes.length > 1) {
    const rs = partes.map((p) => compararEn(p, validas, ingles));
    if (rs.every((x) => x.ok)) return { ok: true, exacto: rs.every((x) => x.exacto), con: rs.map((x) => x.con).join(', ') };
  }
  const r = formasEn(respuesta);
  if (!r.size) return { ok: false };
  const vistas = new Set(), v = [];
  for (const x of [...(validas || []), ...(ingles || [])].filter(Boolean)) {
    for (const trozo of partirEn(x)) {
      const f = formasEn(trozo), canon = [...f][0];
      if (canon && !vistas.has(canon)) { vistas.add(canon); v.push({ canon, f }); }
    }
  }
  const igual = v.find((x) => [...r].some((y) => x.f.has(y)));
  if (igual) return { ok: true, exacto: true, con: igual.canon };
  if ([...r].some((y) => CONOCIDOS.has(y))) return { ok: false, otra: true };
  const sing = (f) => [...f].map((y) => y.split(' ').map(singular).join(' '));
  const rs = new Set(sing(r));
  const plural = v.find((x) => sing(x.f).some((y) => rs.has(y)));
  if (plural) return { ok: true, exacto: true, con: plural.canon };
  let casi = null;
  for (const x of v) for (const f of x.f) for (const y of r) if (errataEn(y, f) && (!casi || distancia(y, f) < casi.d)) casi = { con: x.canon, d: distancia(y, f) };
  return casi ? { ok: true, exacto: false, ...casi } : { ok: false };
}

// Acento tonal a partir del HTML de Kaishi/Core
export function tonoMoras(htmlTono) {
  if (!htmlTono) return null;
  const d = document.createElement('div'); d.innerHTML = htmlTono;
  const estilo = (el) => (el.getAttribute && el.getAttribute('style')) || '';
  const esAlto = (el) => /overline/.test(estilo(el)) || [...el.children].some((h) => /border-top-style\s*:\s*solid/.test(estilo(h)));
  const caida = (el) => [...el.children].some((h) => /border-right-style\s*:\s*solid/.test(estilo(h)));
  const letras = [];
  (function andar(n, alto) {
    for (const h of n.childNodes) {
      if (h.nodeType === 3) { for (const c of h.textContent) letras.push({ c, alto }); }
      else if (h.nodeType === 1) { const a = esAlto(h), antes = letras.length; andar(h, alto || a); if (a && caida(h) && letras.length > antes) letras[letras.length - 1].caida = true; }
    }
  })(d, false);
  const corte = letras.findIndex((x) => /[,、・\s]/.test(x.c));
  const moras = [];
  // Kaishi marca con «°» la g nasal (カ° = が) y con «*» otras notas: no son moras
  for (const x of corte >= 0 ? letras.slice(0, corte) : letras) {
    const c = { 二: 'ニ', 匕: 'ヒ' }[x.c] || x.c, m = moras[moras.length - 1];
    if (/[*＊°゜˚]/.test(c)) {
      if (m && x.caida) m.caida = true;
      if (m && c !== '*' && c !== '＊' && /^[かきくけこカキクケコ]/.test(m.c)) { m.c = String.fromCharCode(m.c.charCodeAt(0) + 1) + m.c.slice(1); m.nasal = true; }
      continue;
    }
    if (/[ゃゅょぁぃぅぇぉャュョァィゥェォ]/.test(c) && m) { m.c += c; m.caida = m.caida || x.caida; }
    else moras.push({ ...x, c });
  }
  for (let i = 0; i < moras.length - 1; i++) if (moras[i].alto && !moras[i + 1].alto) moras[i].caida = true;
  return moras.length > 0 && moras.length < 14 && moras.some((m) => m.alto) ? moras : null;
}
export function svgTono(moras, hira = true) {
  const p = 30, arriba = 10, abajo = 34, n = moras.length, w = (n + 1) * p;
  const x = (i) => p / 2 + i * p, y = (m) => (m.alto ? arriba : abajo);
  const ult = moras[n - 1], yPart = ult.alto && !ult.caida ? arriba : abajo;
  const d = moras.map((m, i) => `${i ? 'L' : 'M'}${x(i)} ${y(m)}`).join(' ');
  return `<svg class="tono" viewBox="0 0 ${w} 66" width="${w}" height="66" aria-label="${esc(t('japones.acento'))}">
    <path d="${d}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M${x(n - 1)} ${y(ult)} L${x(n)} ${yPart}" fill="none" stroke="currentColor" stroke-opacity=".35" stroke-width="2" stroke-dasharray="3 4"/>
    ${moras.map((m, i) => `<circle cx="${x(i)}" cy="${y(m)}" r="5" fill="currentColor"/>`).join('')}
    <circle cx="${x(n)}" cy="${yPart}" r="4" fill="none" stroke="currentColor" stroke-opacity=".5" stroke-width="1.6"/>
    ${moras.map((m, i) => `<text x="${x(i)}" y="60" text-anchor="middle"${m.nasal ? ' class="nasal"' : ''}>${esc(hira ? aHira(m.c) : m.c)}</text>`).join('')}
  </svg>`;
}
