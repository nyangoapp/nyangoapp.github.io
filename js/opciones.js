// Opción múltiple (modo «elegir»): 4 opciones del mismo tipo y parecidas a la buena, nunca dos respuestas válidas.
// Parecidas = comparten elemento o kanji, lecturas de longitud parecida, significados de la misma familia (verbos con verbos…).
import { compararSignificado, normLectura, aHira, partirLecturas, ponerConocidos } from './japones.js';
import { CABECERA } from './i18n.js';

let POOL = null, cargando = null;
export function cargarPool() {
  if (POOL) return Promise.resolve(POOL);
  if (!cargando) cargando = fetch('/api/opciones', { headers: CABECERA }).then((r) => r.json()).then((l) => {
    POOL = { lista: l, porId: new Map(l.map((x) => [x.id, x])) };
    ponerConocidos(l.flatMap((x) => [x.s, ...(x.alt || [])]));
    return POOL;
  }).catch((e) => { cargando = null; throw e; });
  return cargando;
}
export const poolListo = () => !!POOL;

// lo que el item acepta como respuesta: en español (también lo de su homógrafo: 高い es «caro» y «alto») y, aparte, el inglés del mazo
// escucha: lo que suena igual (橋/箸) también vale
const otras = (it, escucha) => [...(it.gemelos || []), ...(escucha ? it.homofonos || [] : [])];
export function validasSig(it, escucha = false) {
  if (it.tipo === 'radical') return [it.nombre, ...(it.alt || [])];
  if (it.tipo === 'kanji') return [it.clave, ...(it.alt || [])];
  return [it.es, ...(it.alt || []), ...otras(it, escucha).flatMap((g) => [g.es, ...(g.alt || [])])];
}
export const inglesSig = (it, escucha = false) => (it.tipo === 'kanji' ? [] : [it.en, ...otras(it, escucha).map((g) => g.en)]);
export function validasLec(it) {
  if (it.tipo === 'kanji') return [...(it.lecturas_validas || []), ...(it.lecturas || []).map((l) => l.lectura)];
  return [it.lectura, ...(it.gemelos || []).map((g) => g.lectura)].flatMap(partirLecturas);
}
// la respuesta que se enseña como opción buena (una sola lectura: si enseñara todas, se delataría)
export function respuestaCorta(it, hab) {
  if (hab === 'sig') return it.tipo === 'radical' ? it.nombre : it.tipo === 'kanji' ? it.clave : (it.es || it.en);
  if (it.tipo === 'kanji') return aHira((it.lecturas || [])[0]?.lectura || (it.lecturas_validas || [])[0] || '');
  return partirLecturas(it.lectura)[0] || '';
}

// familia de una palabra: verbo, adjetivo en -い, expresión hecha, número/contador o sustantivo
function familia(x) {
  const en = String(x.en || '').toLowerCase(), c = x.c || '';
  if (/^to [a-z]/.test(en)) return 'verbo';
  if (/(ます|ません|ください|ございます|しました|です)$/.test(c)) return 'expresion';
  if (/^[〇一二三四五六七八九十百千万]/.test(c) || /counter/.test(en)) return 'numero';
  if (/(^|[一-鿿])[ぁ-ゖ]*い$/.test(c) && !/^(はい|いい?え)$/.test(c)) return 'adjetivo';
  if (/^[ぁ-ゖー]+$/.test(c) && c.length <= 3) return 'corta';
  return 'sustantivo';
}
const moras = (s) => normLectura(s).replace(/[ゃゅょぁぃぅぇぉ]/g, '').length;
const azar = () => Math.random();

/**
 * Devuelve { opciones: [{texto, ok}], buena } o null si no hay bastantes opciones parecidas y seguras.
 * it: item completo (como en /api/repaso); hab: 'sig' | 'lec'; escucha: la pregunta es el audio (lo que suena igual también vale)
 */
export function armarOpciones(it, hab, n = 4, { escucha = false } = {}) {
  if (!POOL) return null;
  const yo = POOL.porId.get(it.id) || { id: it.id, t: it.tipo, c: it.palabra || it.caracter, k: it.kanji || (it.partes || []).map((p) => p.id), en: it.en, l: [] };
  const buena = respuestaCorta(it, hab);
  if (!buena) return null;
  const vSig = validasSig(it, escucha).filter(Boolean), vEn = inglesSig(it, escucha).filter(Boolean), vLec = validasLec(it).filter(Boolean).map((x) => normLectura(x));
  const suena = new Set(escucha ? vLec : []);
  const miFam = it.tipo === 'vocab' ? familia(yo) : '';
  const misK = new Set(yo.k || []);
  const candidatos = [];
  for (const x of POOL.lista) {
    if (x.t !== it.tipo || x.id === it.id) continue;
    if (it.tipo === 'vocab' && (x.c === yo.c || (x.l || []).flatMap(partirLecturas).some((l) => suena.has(normLectura(l))))) continue; // homógrafo u homófono
    const texto = hab === 'sig' ? x.s : aHira(partirLecturas(x.l?.[0])[0] || '');
    if (!texto) continue;
    let p = azar() * 1.6 + (x.a ? 1 : 0);
    const comparte = (x.k || []).some((k) => misK.has(k));
    if (comparte) p += 3;
    if (hab === 'sig') {
      if (it.tipo === 'vocab') p += familia(x) === miFam ? 3 : 0;
      const r = texto.length / Math.max(1, buena.length); if (r > 0.6 && r < 1.6) p += 1;
    } else {
      const d = Math.abs(moras(texto) - moras(buena));
      p += d === 0 ? 2.5 : d === 1 ? 1.5 : 0;
      if (normLectura(texto)[0] === normLectura(buena)[0]) p += 1;
      if (it.tipo === 'vocab' && familia(x) === miFam) p += 1;
    }
    candidatos.push({ x, texto, p });
  }
  candidatos.sort((a, b) => b.p - a.p);
  const elegidos = [];
  const choca = (texto, x) => {
    if (hab === 'sig') {
      if (compararSignificado(texto, vSig, vEn).ok) return true; // la opción valdría como respuesta
      if (compararSignificado(buena, [x.s, ...(x.alt || [])]).ok) return true; // la buena también sería suya
      return elegidos.some((e) => compararSignificado(texto, [e.texto]).ok || compararSignificado(e.texto, [texto]).ok);
    }
    const nt = normLectura(texto);
    if (!nt || vLec.includes(nt) || nt === normLectura(buena)) return true;
    return elegidos.some((e) => normLectura(e.texto) === nt);
  };
  for (const cnd of candidatos.slice(0, 60)) {
    if (elegidos.length >= n - 1) break;
    if (!choca(cnd.texto, cnd.x)) elegidos.push(cnd);
  }
  if (elegidos.length < n - 1) return null;
  const opciones = [{ texto: buena, ok: true }, ...elegidos.map((e) => ({ texto: e.texto, ok: false, id: e.x.id }))];
  for (let i = opciones.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [opciones[i], opciones[j]] = [opciones[j], opciones[i]]; }
  return { opciones, buena: opciones.findIndex((o) => o.ok) };
}

// Mixto: más «elegir» en Aprendiz, más «escribir» en los rangos altos
const P_ELEGIR = [0.6, 0.4, 0.22, 0.1, 0.05];
export function formatoMixto(rango) { return azar() < P_ELEGIR[Math.max(0, Math.min(4, rango ?? 0))] ? 'elegir' : 'escribir'; }
