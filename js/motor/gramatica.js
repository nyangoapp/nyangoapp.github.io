// Tarjetas de gramática (traducción de nucleo/gramatica_srs.py): cada punto del catálogo es una tarjeta con la habilidad
// «uso»; nace al completar su lección y se repasa con FSRS. La pregunta cambia en cada repaso: un ejercicio de la lección,
// un hueco en un ejemplo o en una frase del mazo, o «¿qué significa?» con traducciones parecidas.
import { tx } from './textos.js';
import { AZAR } from './azar.js';

export const HAB = 'uso';
const TAGS = /<\/?b>/g;
const RUBY = /( ?)([^ 　>[\]]+?)\[([^\]]+)\]/g;
const FURI = / ?\[[^\]]*\]/g;
const KANJI = /[一-鿿㐀-䶿々]/;
const KATA = /[ァ-ヺー]/;
const HIRA = /[ぁ-ゖ]/;
const LIMITE = new Set([...' |、。！？!?「」『』…・（）()　']);
const FINAL = /^(よね|よ|ね|か|な|わ)?([。！？!?」』…]|$)/;
const FILA_U = new Set([...'うくすつぬふむゆるぐずづぶぷ']);
const MALA = /^\W*((frase|sentence)\s+)?(incorrect|wrong\b)/i;
const INVERTIDA = /incorrect|está mal|\bMAL\b|NO es (una frase )?correcta|NO es correcta/i;
const VACIAS = { es: new Set(['el', 'la', 'lo', 'un', 'de', 'a', 'y', 'e', 'es', 'que', 'en']),
  en: new Set(['the', 'a', 'an', 'of', 'to', 'and', 'is', 'are', 'it', 'in', 'that', 'i', 'you']) };
const HUECOS = {
  wa: [['は', ['へ', 'を'], 'part']], ga: [['が', ['へ', 'で'], 'part']], mo: [['も', ['を', 'へ'], 'part']], wo: [['を', ['へ', 'の'], 'part']],
  ni: [['に', ['を', 'が'], 'part']], he: [['へ', ['を', 'が'], 'part']], de: [['で', ['を', 'が'], 'part']], no: [['の', ['を', 'へ'], 'part']],
  'to-ya': [['と', ['を', 'の'], 'part']], ka: [['か', ['よ', 'ね'], 'fin']],
  da: [['だった', ['だ', 'じゃない', 'じゃなかった'], 'fin'], ['だ', ['じゃない', 'だった', 'じゃなかった'], 'fin'],
    ['でした', ['です', 'じゃないです', 'じゃなかったです'], 'fin'], ['です', ['じゃないです', 'でした', 'じゃなかったです'], 'fin']],
  'ja-nai': [['じゃなかった', ['だ', 'だった', 'じゃない'], 'fin'], ['ではなかった', ['だ', 'だった', 'ではない'], 'fin'],
    ['じゃないです', ['です', 'でした', 'じゃなかったです'], 'fin'], ['じゃありません', ['です', 'でした', 'じゃありませんでした'], 'fin'],
    ['ではありません', ['です', 'でした', 'ではありませんでした'], 'fin'],
    ['じゃない', ['だ', 'だった', 'じゃなかった'], 'fin'], ['ではない', ['だ', 'だった', 'ではなかった'], 'fin']],
  'desu-cortes': [['でした', ['です', 'じゃないです', 'じゃなかったです'], 'fin'], ['です', ['じゃないです', 'でした', 'じゃなかったです'], 'fin']],
  masu: [['ませんでした', ['ます', 'ません', 'ました'], 'fin'], ['ました', ['ます', 'ません', 'ませんでした'], 'fin'],
    ['ません', ['ます', 'ました', 'ませんでした'], 'fin'], ['ます', ['ません', 'ました', 'ませんでした'], 'fin']],
  'kara-node': [['から', ['けど', 'のに'], 'conj'], ['ので', ['けど', 'のに'], 'conj']],
  kedo: [['けど', ['から', 'ので'], 'conj']],
};
const COPULA = new Set(['だ', 'だった', 'じゃない', 'じゃなかった', 'ではない', 'ではなかった', 'です', 'でした', 'じゃないです', 'じゃありません', 'ではありません']);

export const sinFurigana = (s) => String(s || '').replace(TAGS, '').replace(FURI, '');

// texto visible con fronteras («|» = espacio antes de un kanji con lectura) y, por carácter, su posición en el original
// (null si es parte de la base de un kanji con lectura: eso nunca se vacía)
function mapa(s) {
  const vis = [], src = [];
  let pos = 0;
  for (const m of s.matchAll(RUBY)) {
    for (let i = pos; i < m.index; i++) { vis.push(s[i]); src.push(i); }
    if (m[1]) { vis.push('|'); src.push(null); }
    for (const ch of m[2]) { vis.push(ch); src.push(null); }
    pos = m.index + m[0].length;
  }
  for (let i = pos; i < s.length; i++) { vis.push(s[i]); src.push(i); }
  return [vis.join(''), src];
}

function vale(vis, i, marca, clase) {
  const antes = i > 0 ? vis[i - 1] : '', fin = i + marca.length, despues = fin < vis.length ? vis[fin] : '';
  if (!antes || LIMITE.has(antes)) return false;
  if (clase === 'part') {
    if (despues && !LIMITE.has(despues) && !KATA.test(despues) && !KANJI.test(despues)) return false;
    if (['', '。', '！', '？', '!', '?'].includes(despues)) return false;
    if (HIRA.test(antes) && (i - 1 === 0 || LIMITE.has(vis[i - 2])) && marca.length === 1 && 'でとじ'.includes(antes)) return false;
    if (marca === 'で' && 'んい'.includes(antes)) return false;
    if (marca === 'と' && (FILA_U.has(antes) || 'いだた」'.includes(antes))) return false;
    if (marca === 'が' && despues === '、') return false;
    if (marca === 'も' && (['いつ', 'とて', 'どう', 'でも'].includes(vis.slice(Math.max(0, i - 2), i)) || antes === 'で')) return false;
    if (marca === 'の' && 'こそあど'.includes(antes) && (i - 1 === 0 || LIMITE.has(vis[i - 2]))) return false;
    if (marca === 'は' && (vis.includes('こんにちは') || vis.includes('こんばんは'))) return false;
    return true;
  }
  if (clase === 'fin') {
    if (!FINAL.test(vis.slice(fin))) return false;
    if (COPULA.has(marca) && ('んいたうくすつぬむるぐぶて'.includes(antes) || FILA_U.has(antes))) return false;
    if (marca === 'か' && ['何', '誰'].includes(vis.slice(Math.max(0, i - 1), i)) && fin === vis.length) return false;
    return true;
  }
  if (clase === 'conj') return 'いだすたるうくぬむぶつぐなん'.includes(antes) && ['、', '。', '', '|'].includes(despues);
  return false;
}

export function hueco(jp, punto, rng = AZAR) {
  const s = String(jp || '').replace(TAGS, '');
  const [vis, src] = mapa(s);
  const cands = [], ocupado = new Set();
  for (const [marca, rivales, clase] of HUECOS[punto] || []) {
    let i = vis.indexOf(marca);
    while (i >= 0) {
      const trozo = src.slice(i, i + marca.length);
      const seguido = !trozo.includes(null) && trozo.every((x, k) => x === trozo[0] + k);
      if (seguido && !trozo.some((x) => ocupado.has(x)) && vale(vis, i, marca, clase)) {
        cands.push([trozo[0], marca, rivales]); trozo.forEach((x) => ocupado.add(x));
      }
      i = vis.indexOf(marca, i + 1);
    }
  }
  if (!cands.length) return null;
  const [ini, marca, rivales] = rng.choice(cands);
  return [s.slice(0, ini) + '＿' + s.slice(ini + marca.length), marca, rivales];
}

const invertida = (e) => e.busca === 'incorrecta' || INVERTIDA.test(e.pregunta || '');
const citar = (t, idioma = 'es') => (idioma === 'en' ? '“' + String(t).replaceAll('“', '‘').replaceAll('”', '’') + '”' : `«${t}»`);
function descitar(preg) {
  if (preg.length > 1 && preg[0] === '«' && preg.at(-1) === '»') return preg.slice(1, -1);
  if (preg.length > 1 && preg[0] === '“' && preg.at(-1) === '”' && ![...preg.slice(1, -1)].some((c) => '“”'.includes(c))) return preg.slice(1, -1);
  return '';
}
function barajar(opciones, correcta, rng) {
  const orden = rng.shuffle(opciones.map((_, i) => i));
  return [orden.map((k) => opciones[k]), orden.indexOf(correcta)];
}
function palabras(t, idioma = 'es') {
  const s = String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const fin = idioma !== 'en' ? /(?<=[a-z]{2})(os|as|es|o|a|s)$/ : /(?<=[a-z]{3})(es|s)$/;
  const vacias = VACIAS[idioma] || VACIAS.es;
  return new Set((s.match(/[a-z]+/g) || []).map((w) => w.replace(fin, '')).filter((w) => !vacias.has(w)));
}
const trozos = (jp) => [...sinFurigana(jp)].filter((ch) => !LIMITE.has(ch) && !'。、，,.!！?？＿'.includes(ch)).sort().join('');
const interseccion = (a, b) => [...a].filter((x) => b.has(x)).length;

function textoEjercicio(e) {
  if (e.tipo === 'elegir') { const ops = e.opciones || [], k = parseInt(e.correcta || 0, 10); return sinFurigana((e.jp || '').replace('＿', ops[k] ?? '')); }
  if (e.tipo === 'conjugar') return (e.respuestas || []).map(sinFurigana).join(' ');
  return (e.piezas || []).map(sinFurigana).join('');
}
export function puntosDe(lec) {
  const pts = (lec.puntos || []).filter(Boolean);
  if (pts.length) return pts;
  return (lec.orden || 0) > 3 ? [lec.slug] : [];
}

export class Banco {
  constructor(c) {
    this.firma = c.firma; this.idioma = c.idioma || 'es';
    this.lecciones = Object.fromEntries(c.lecciones_gramatica.map((g) => [g.slug, g]));
    this.puntos = {};
    for (const g of c.lecciones_gramatica) {
      for (const pt of puntosDe(g)) {
        if (!this.puntos[pt]) this.puntos[pt] = { ...(c.catalogo[pt] || { id: pt, jp: '', es: g.titulo || '', leccion: g.slug }), lecciones: [] };
        const info = this.puntos[pt];
        info.lecciones.push(g.slug);
        if (!info.leccion || !(info.leccion in this.lecciones)) info.leccion = g.slug;
      }
    }
    this.marcas = {};
    for (const [pt, info] of Object.entries(this.puntos)) {
      this.marcas[pt] = (info.jp || '').split(/[・/]/).filter((m) => m.replace(/[〜～ ]/g, '')).map((m) => m.replaceAll('〜', '').replaceAll('～', ''));
    }
    this.ejercicios = {}; this.ejemplos = {}; this.kaishi = {};
    const ejemplosDe = (g) => (g.secciones || []).flatMap((s) => (s.bloques || []).filter((b) => b.tipo === 'ejemplos').flatMap((b) => b.items || []))
      .filter((x) => x.jp && x.es && !MALA.test(x.es));
    for (const [pt, info] of Object.entries(this.puntos)) {
      let ejs = [], exs = [];
      for (const slug of info.lecciones) {
        const g = this.lecciones[slug], varios = puntosDe(g).length > 1, casa = slug === info.leccion;
        const propios = (g.ejercicios || []).filter((e) => !varios || this.toca(pt, textoEjercicio(e)));
        ejs = ejs.concat((propios.length ? propios : (casa ? g.ejercicios || [] : [])).map((e) => [slug, e]));
        const todos = ejemplosDe(g).map((x) => [slug, x]);
        const suyos = todos.filter((x) => !varios || this.toca(pt, sinFurigana(x[1].jp)));
        exs = exs.concat(suyos.length ? suyos : (casa ? todos : []));
      }
      this.ejercicios[pt] = ejs; this.ejemplos[pt] = exs;
    }
    for (const v of c.vocab) {
      if (!v.frase_furigana && !v.frase) continue;
      for (const g of v.gramatica || []) {
        if (g.id in this.puntos) (this.kaishi[g.id] = this.kaishi[g.id] || []).push({ vocab: v.id, jp: (v.frase_furigana || v.frase).replace(TAGS, ''),
          es: v.frase_es || v.frase_en || '', nota: g.nota || '', palabra: v.palabra });
      }
    }
    this.ejemplosLeccion = Object.fromEntries(Object.entries(this.lecciones).map(([slug, g]) => [slug, ejemplosDe(g)]));
    // 11-10: las tarjetas de la guía (contenido/gramatica/fichas): «slug/id» → la ficha y su lección
    this.fichas = {};
    for (const g of c.lecciones_gramatica) for (const f of g.fichas || []) this.fichas[`${g.slug}/${f.id}`] = { f, slug: g.slug };
  }

  // una de las preguntas de la ficha, al azar (y que se pueda hacer en el repaso)
  preguntaFicha(fid, rng) {
    const x = this.fichas[fid];
    if (!x) return null;
    const qs = rng.shuffle([...x.f.preguntas]);
    for (const e of qs) { const q = this.deEjercicio(e, rng); if (q) return { ...q, origen: 'ficha' }; }
    return null;
  }

  toca(pt, texto) { return (this.marcas[pt] || []).some((m) => m && texto.includes(m)); }

  deHueco(pt, jp, es, explica, origen, rng) {
    const h = hueco(jp, pt, rng);
    if (!h) return null;
    const [conHueco, marca, rivales] = h, n = rivales.length >= 3 ? 3 : 2;
    const [opciones, correcta] = barajar([marca, ...rng.sample(rivales, n)], 0, rng);
    const info = this.puntos[pt].es || '';
    const quitar = new RegExp('^\\**' + marca.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\**\\s*[:：]\\s*');
    return { tipo: 'elegir', enunciado: tx('gram.completa', {}, this.idioma), jp: conHueco, opciones, correcta, es,
      explica: tx('gram.va', { marca }, this.idioma) + (explica || (info.slice(0, 1).toLowerCase() + info.slice(1) + '.')).replace(quitar, ''),
      solucion: jp.replace(TAGS, ''), origen };
  }

  deSignificado(slug, x, rng) {
    const corto = (y) => sinFurigana(y.jp).length <= 30 && ![...'«»“”'].some((c) => y.es.includes(c)) && y.es.length <= 80;
    if (!corto(x)) return null;
    const pal = (t) => palabras(t, this.idioma);
    const base = pal(x.es), jp = new Set(sinFurigana(x.jp)), tr = trozos(x.jp);
    const otros = [], vistas = [base];
    for (const y of this.ejemplosLeccion[slug] || []) {
      const p = pal(y.es);
      const parecida = vistas.some((v) => { const u = new Set([...p, ...v]); return (p.size === v.size && interseccion(p, v) === p.size) || (u.size && interseccion(p, v) / u.size >= 0.6); });
      if (!corto(y) || trozos(y.jp) === tr || parecida) continue;
      otros.push(y); vistas.push(p);
    }
    if (otros.length < 2) return null;
    const clave = new Map(otros.map((y) => [y, [-interseccion(base, pal(y.es)) - 0.2 * interseccion(jp, new Set(sinFurigana(y.jp))), rng.random()]]));
    otros.sort((a, b) => clave.get(a)[0] - clave.get(b)[0] || clave.get(a)[1] - clave.get(b)[1]);
    const [opciones, correcta] = barajar([x.es, ...otros.slice(0, 2).map((y) => y.es)], 0, rng);
    return { tipo: 'elegir', enunciado: tx('gram.significa', {}, this.idioma), jp: x.jp, opciones, correcta, es: '',
      explica: x.nota || tx('gram.igual', { jp: sinFurigana(x.jp), es: x.es }, this.idioma), solucion: x.jp, origen: 'significado' };
  }

  deEjercicio(e, rng) {
    if (e.tipo === 'elegir' && !invertida(e) && (e.opciones || []).length) {
      const preg = String(e.pregunta || ''), es = descitar(preg), k = parseInt(e.correcta || 0, 10);
      const [opciones, correcta] = barajar([...e.opciones], k, rng);
      const jp = e.jp || '', sol = jp.includes('＿') ? jp.replace('＿', e.opciones[k]) : '';
      return { tipo: 'elegir', enunciado: es && jp.includes('＿') ? tx('gram.completa', {}, this.idioma) : (preg || tx('gram.elige', {}, this.idioma)),
        jp, opciones, correcta, es, explica: e.explica || '', solucion: sol, origen: 'leccion' };
    }
    if (e.tipo === 'conjugar' && (e.respuestas || []).length) {
      return { tipo: 'completar', enunciado: tx('gram.transforma', { forma: e.forma || '' }, this.idioma), jp: e.base || '', opciones: [...e.respuestas],
        correcta: 0, es: '', explica: e.explica || '', solucion: e.respuestas[0], origen: 'leccion' };
    }
    return null;
  }

  pregunta(pt, aprendidos = {}, rng = AZAR) {
    const fuentes = [];
    if ((this.ejercicios[pt] || []).length) fuentes.push(['leccion', 5]);
    if (pt in HUECOS && (this.kaishi[pt] || []).length) fuentes.push(['kaishi', 3]);
    if (pt in HUECOS && (this.ejemplos[pt] || []).length) fuentes.push(['ejemplo', 2]);
    if ((this.ejemplos[pt] || []).length) fuentes.push(['significado', 2]);
    for (let i = 0; i < 12 && fuentes.length; i++) {
      const tipo = rng.choices(fuentes.map((f) => f[0]), fuentes.map((f) => f[1]));
      let q = null;
      if (tipo === 'leccion') q = this.deEjercicio(rng.choice(this.ejercicios[pt])[1], rng);
      else if (tipo === 'kaishi') {
        const lista = this.kaishi[pt], sabidas = lista.filter((k) => k.vocab in aprendidos);
        const k = rng.choice(sabidas.length && rng.random() < 0.8 ? sabidas : lista);
        q = this.deHueco(pt, k.jp, k.es, k.nota, 'kaishi', rng);
      } else if (tipo === 'ejemplo') { const [, x] = rng.choice(this.ejemplos[pt]); q = this.deHueco(pt, x.jp, x.es, x.nota || '', 'ejemplo', rng); }
      else { const [slug, x] = rng.choice(this.ejemplos[pt]); q = this.deSignificado(slug, x, rng); }
      if (q) return q;
    }
    return null;
  }

  generadas(slug, aprendidos = {}, n = 8, rng = AZAR) {
    const g = this.lecciones[slug];
    if (!g) return [];
    const salida = [], vistas = new Set();
    const meter = (q) => {
      if (!q || vistas.has(q.jp)) return;
      vistas.add(q.jp);
      const x = { tipo: 'elegir', pregunta: q.es ? citar(q.es, this.idioma) : q.enunciado, jp: q.jp, opciones: q.opciones, correcta: q.correcta,
        explica: q.explica, generada: true, origen: q.origen };
      if (q.es) x.enunciado = q.enunciado;
      salida.push(x);
    };
    const pts = puntosDe(g).filter((pt) => pt in HUECOS);
    for (let intentos = 0; salida.length < n && intentos < n * 6; intentos++) {
      const r = rng.random();
      if (pts.length && r < 0.45) {
        const pt = rng.choice(pts), lista = this.kaishi[pt] || [];
        if (lista.length) {
          const sabidas = lista.filter((k) => k.vocab in aprendidos), k = rng.choice(sabidas.length && rng.random() < 0.7 ? sabidas : lista);
          meter(this.deHueco(pt, k.jp, k.es, k.nota, 'kaishi', rng)); continue;
        }
      }
      if (pts.length && r < 0.7) {
        const pt = rng.choice(pts), exs = (this.ejemplos[pt] || []).filter((x) => x[0] === slug);
        if (exs.length) { const [, x] = rng.choice(exs); meter(this.deHueco(pt, x.jp, x.es, x.nota || '', 'ejemplo', rng)); continue; }
      }
      const exs = this.ejemplosLeccion[slug] || [];
      if (exs.length) meter(this.deSignificado(slug, rng.choice(exs), rng));
    }
    return salida;
  }
}

const BANCOS = {};
export function banco(c) {
  const b = BANCOS[c.idioma];
  if (b && b.firma === c.firma) return b;
  return (BANCOS[c.idioma] = new Banco(c));
}

// la tarjeta de una ficha de la guía (id «f<slug>/<id>»): se pinta como las de gramática
export function tarjetaFicha(c, fid, p, rango, rng = AZAR) {
  const b = banco(c), x = b.fichas[fid];
  if (!x) return null;
  const q = b.preguntaFicha(fid, rng);
  if (!q) return null;
  const lec = b.lecciones[x.slug] || {}, m = p.mem[`f${fid}:${HAB}`];
  return { id: `f${fid}`, tipo: 'gramatica', ficha: true, titulo: x.f.titulo || '', jp: x.f.jp || '', leccion: x.slug, leccion_titulo: lec.titulo || '',
    capitulo: lec.capitulo || '', habilidades: [HAB], rangos: { [HAB]: rango(m) }, aprendido: m !== undefined, listo: true, pregunta: q };
}

export function tarjeta(c, pt, p, rango, rng = AZAR) {
  const b = banco(c), info = b.puntos[pt];
  if (!info) return null;
  const q = b.pregunta(pt, p.aprendidos || {}, rng);
  if (!q) return null;
  const lec = b.lecciones[info.leccion] || {}, m = p.mem[`g${pt}:${HAB}`];
  return { id: `g${pt}`, tipo: 'gramatica', punto: pt, titulo: info.es || '', jp: info.jp || '', leccion: info.leccion, leccion_titulo: lec.titulo || '',
    capitulo: lec.capitulo || '', habilidades: [HAB], rangos: { [HAB]: rango(m) }, aprendido: m !== undefined, listo: true, pregunta: q };
}
