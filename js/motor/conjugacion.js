// Sección «Conjugar» (活用道場): rondas de práctica y tarjetas de repaso para cada forma de verbo, de adjetivo o de tabla.
// La conjugación en sí es web/js/conjugar.js; la clase de cada palabra (c.conj) viene del paquete (herramientas/conjugar/conj_clases.py).
// Cada forma es una tarjeta de repaso «c<forma>:uso» (como las de gramática «g…» y «f…»): la pregunta cambia en cada repaso, con una
// palabra distinta; las tablas preguntan UNA celda al azar.
import * as cj from '../conjugar.js';
import { AZAR } from './azar.js';
import { HAB, sinFurigana } from './gramatica.js';

const MINIMO = 6;        // palabras que debe haber para una ronda: si sabes menos, se completa con las más frecuentes
const PESO_SURU = 0.3;   // los sustantivos + する pesan menos que los verbos de verdad (si no, 勉強する saldría en todas partes)

/** Las palabras con las que se pregunta una forma: las que ya sabes y, si son pocas (< 6), las más frecuentes de esas clases */
export function reserva(c, p, F) {
  const clases = new Set(F.clases), todas = [];
  for (const [id, clase] of Object.entries(c.conj || {})) {
    const it = c.items[id];
    if (!it || !clases.has(clase)) continue;
    const prueba = F.grupo === 'tabla' ? cj.conjugar(it.palabra, it.lectura, clase, F.id, cj.CELDAS[F.id][0].id) : cj.conjugar(it.palabra, it.lectura, clase, F.id);
    if (prueba) todas.push({ id, it, clase });
  }
  const sabe = (x) => x.id in (p.aprendidos || {}), sabidas = todas.filter(sabe);
  if (sabidas.length >= MINIMO) return { lista: sabidas, aprendidas: sabidas.length };
  const resto = todas.filter((x) => !sabe(x)).sort((a, b) => (a.it.orden || 0) - (b.it.orden || 0));
  return { lista: [...sabidas, ...resto.slice(0, MINIMO - sabidas.length)], aprendidas: sabidas.length };
}

// barajar con pesos (Efraimidis–Spirakis): los de peso bajo tienden a quedar al final
const barajar = (lista, rng) => lista.map((x) => [Math.pow(rng.random(), 1 / (x.clase === 'suru-n' ? PESO_SURU : 1)), x]).sort((a, b) => b[0] - a[0]).map((y) => y[1]);
/** n palabras distintas de la reserva (los sustantivos con する, a lo sumo la cuarta parte si hay otras de sobra) */
export function elegir(lista, n, rng = AZAR) {
  const b = barajar(lista, rng), otras = b.filter((x) => x.clase !== 'suru-n'), suru = b.filter((x) => x.clase === 'suru-n');
  if (otras.length < n) return b.slice(0, n);   // pocas que no sean sustantivos con する (la tabla de する): sin tope
  const k = Math.min(Math.max(1, Math.floor(n / 4)), suru.length);
  return rng.shuffle([...otras.slice(0, n - k), ...suru.slice(0, k)]);
}

const significado = (it) => it.es || it.en || '';

// «Los nombres de la tabla» (t-nombres): no usa verbos, pregunta los seis nombres de las bases (BASES de conjugar.js)
const esNombres = (F) => !!F?.nombres;
const preguntaNombre = (base, lang, dom = false) => { const d = cj.datosNombre(base, lang); return { ...d, id: base, palabra: d.jp, es: d.significado, explica: cj.furiBases(d.explica, dom) }; };
/** ¿Dominas los nombres de las bases? Su tarjeta (ct-nombres:uso) ha llegado al rango RANGO_NOMBRES (2: estabilidad de 10 días o más) */
export const nombresDominados = (p, rango) => (rango(p.mem?.[`ct-nombres:${HAB}`]) ?? -1) >= cj.RANGO_NOMBRES;

// los textos con nombres de base (五段, 未然形…) salen con su lectura, salvo los nombres que ya dominas (dom)
function preguntaDe(x, F, lang, dom = false) {
  const fb = (t) => cj.furiBases(t, dom);
  const { it, clase } = x, d = cj.diccionario(it.palabra, it.lectura, clase);
  const base = { id: x.id, palabra: d.palabra, lectura: d.lectura, furigana: d.furigana, es: significado(it), clase, tipo: fb(cj.tipoDe(clase, lang)) };
  if (F.grupo === 'tabla') {
    const celdas = cj.celdasDe(it.palabra, it.lectura, clase, F.id, lang);
    if (!celdas) return null;
    return { ...base, respuesta: celdas.find((k) => k.id === 'shushi')?.respuesta || celdas[0].respuesta, explica: fb(cj.reglaTabla(clase, lang)),
      celdas: celdas.map((k) => ({ id: k.id, base: k.base, pega: k.pega, pega_real: k.pega_real, respuesta: k.respuesta, base_txt: k.base_txt, base_furigana: k.base_furigana, explica: fb(k.explica), otras: k.otras, tambien: k.tambien || [] })) };
  }
  const r = cj.conjugar(it.palabra, it.lectura, clase, F.id, null, lang);
  if (!r) return null;
  return { ...base, respuesta: { kanji: r.kanji, kana: r.kana, furigana: r.furigana }, explica: fb(r.explica), otras: r.otras || [] };
}

/** Una ronda: n preguntas con palabras distintas */
export function ronda(c, p, F, n, lang, rng = AZAR, dom = false) {
  if (esNombres(F)) return rng.shuffle([...cj.NOMBRES]).slice(0, n || cj.NOMBRES.length).map((b) => preguntaNombre(b, lang));
  const { lista } = reserva(c, p, F), salida = [];
  for (const x of elegir(lista, Math.min(n, lista.length), rng)) { const q = preguntaDe(x, F, lang, dom); if (q) salida.push(q); }
  return salida;
}

/** La tarjeta de repaso de una forma: una palabra al azar de la reserva y, en las tablas, una celda al azar */
export function tarjetaConj(c, formaId, p, rango, lang, rng = AZAR) {
  const F = cj.forma(formaId);
  if (!F) return null;
  const dominados = nombresDominados(p, rango);
  if (esNombres(F)) {
    // una tarjeta con un nombre al azar: el kanji sin lectura y se escribe cómo se lee
    const q = preguntaNombre(rng.choice(cj.NOMBRES), lang, dominados), m = p.mem[`c${formaId}:${HAB}`], t = cj.textoForma(F, lang);
    return { id: `c${formaId}`, tipo: 'gramatica', conj: true, nombres_dominados: dominados, titulo: t.titulo, jp: F.jp, leccion: null, leccion_titulo: '', capitulo: '', habilidades: [HAB],
      rangos: { [HAB]: rango(m) }, aprendido: m !== undefined, listo: true,
      pregunta: { tipo: 'completar', enunciado: lang === 'en' ? 'How is it read?' : '¿Cómo se lee?', jp: q.jp, es: '', opciones: [q.lectura], correcta: 0, solucion: q.lectura, explica: q.explica, origen: 'conjugar' } };
  }
  const { lista } = reserva(c, p, F);
  for (const x of barajar(lista, rng).slice(0, 12)) {
    const q = preguntaDe(x, F, lang, dominados);
    if (!q) continue;
    let enunciado, respuesta = q.respuesta, explica = q.explica, otras = q.otras || [];
    if (F.grupo === 'tabla') {
      // el 終止形 es la forma de diccionario, la que ya se enseña: en el repaso sería regalar la respuesta
      const k = rng.choice(q.celdas.filter((x) => sinFurigana(x.respuesta.furigana) !== sinFurigana(q.furigana)));
      enunciado = cj.enunciadoCelda(F.id, k.id, null, dominados); respuesta = k.respuesta; explica = k.explica; otras = k.otras || [];
    } else enunciado = cj.enunciado(F.id, x.clase, lang);
    const m = p.mem[`c${formaId}:${HAB}`], t = cj.textoForma(F, lang);
    return { id: `c${formaId}`, tipo: 'gramatica', conj: true, titulo: t.titulo, jp: F.jp, leccion: null, leccion_titulo: '', capitulo: '', habilidades: [HAB],
      rangos: { [HAB]: rango(m) }, aprendido: m !== undefined, listo: true,
      pregunta: { tipo: 'completar', enunciado, jp: q.furigana, es: q.es, opciones: [respuesta.furigana, ...otras.map((o) => o.furigana)], correcta: 0,
        solucion: respuesta.furigana, explica: q.tipo ? `${q.tipo}. ${explica}` : explica, origen: 'conjugar' } };
  }
  return null;
}

/** GET /api/conjugar: las formas y cómo las llevas */
export function indice(c, p, rango, lang, t) {
  const formas = cj.FORMAS.map((F) => {
    const m = p.mem[`c${F.id}:${HAB}`], tx = cj.textoForma(F, lang);
    return { id: F.id, grupo: F.grupo, titulo: tx.titulo, jp: F.jp, explica: tx.explica, en_repaso: m !== undefined, rango: rango(m), vence: m ? m.vence || null : null,
      pendiente: m !== undefined && (m.vence || 0) <= t };
  });
  const de = (clases) => Object.entries(c.conj || {}).filter(([id, k]) => clases.includes(k) && c.items[id]);
  const v = de(cj.VERBOS), a = de(cj.ADJETIVOS), ya = (xs) => xs.filter(([id]) => id in (p.aprendidos || {})).length;
  return { formas, verbos: ya(v), adjetivos: ya(a), verbos_total: v.length, adjetivos_total: a.length, nombres_dominados: nombresDominados(p, rango) };
}

/** GET /api/conjugar/<forma>?n= */
export function rondaDe(c, p, formaId, n, lang, rango = null) {
  const F = cj.forma(formaId);
  if (!F) return null;
  const t = cj.textoForma(F, lang);
  const dom = rango ? nombresDominados(p, rango) : false;
  const forma = { id: F.id, grupo: F.grupo, titulo: t.titulo, jp: F.jp, explica: t.explica, nombres_dominados: dom, ...(F.nombres ? { nombres: true } : F.grupo === 'tabla' ? { celdas: cj.CELDAS[F.id] } : {}) };
  return { forma, preguntas: ronda(c, p, F, n || (F.nombres ? cj.NOMBRES.length : F.grupo === 'tabla' ? 3 : 8), lang, AZAR, dom) };
}
