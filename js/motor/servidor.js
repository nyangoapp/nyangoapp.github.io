// El «servidor» de Nyango dentro de la app (traducción de servidor.py): responde a las mismas rutas /api/… con el progreso en
// memoria y guardado en almacen.js. La interfaz no sabe que no hay Python: local.js le pasa aquí cada fetch('/api/…').
import * as fsrs from './fsrs.js';
import * as juego from './juego.js';
import * as gsrs from './gramatica.js';
import * as conjugacion from './conjugacion.js';
import { forma as formaConj } from '../conjugar.js';
import { tx, juego as textosJuego, poner as ponerIdioma, valido, IDIOMAS, idioma as idiomaActual } from './textos.js';
import { cargarContenido } from './contenido.js';
import { almacen } from './almacen.js';
import { AZAR } from './azar.js';
import * as enlace from './enlace.js';

const { ErrorJuego } = juego;
const ahora = fsrs.ahora;
const RANGOS_JP = ['見習い', '剣士', '侍', '師範', '伝説'];
const EQUIPO = [
  { id: 'bufanda', meta: ['aprendidos', 1] }, { id: 'hachimaki', meta: ['rango1', 25] }, { id: 'haori', meta: ['aprendidos', 100] },
  { id: 'bokken', meta: ['kanji1', 60] }, { id: 'kabuto', meta: ['vocab2', 150] }, { id: 'katana', meta: ['vocab2', 400] },
  { id: 'capa', meta: ['rango3', 300] }, { id: 'aura', meta: ['vocab2', 1000] },
];
const TIPOS_REPASO = ['radical', 'kanji', 'vocab', 'gramatica', 'conjugacion'], TIPO_DE = { r: 'radical', k: 'kanji', v: 'vocab', g: 'gramatica', f: 'gramatica', c: 'conjugacion' };
const HABILIDADES = ['sig', 'lec'], MODOS_REPASO = ['mixto', 'escribir', 'elegir', 'significado', 'lectura', 'escuchar'];
const MAX_LECCION = 40, COPIAS_MAX = 5, DIAS_REGISTRO = 60, NYAN_PREMIOS_DIA = 10;
export const VERSION_DATOS = 1;

const entero = (v, def = 0, min = null, max = null) => {
  let n = parseInt(v, 10); if (!Number.isFinite(n)) n = def;
  if (min !== null) n = Math.max(min, n);
  return max === null ? n : Math.min(max, n);
};
const hash = (o) => JSON.stringify(o);

export function rangos() {
  const nombres = textosJuego().rangos || [];
  return RANGOS_JP.map((jp, i) => ({ id: i, jp, es: nombres[i] ?? jp }));
}
function pieza(e) { const t = (textosJuego().equipo || {})[e.id] || {}; return { ...e, nombre: t.nombre || e.id, hito: t.hito || '' }; }
export function rango(m) {
  if (!m) return -1;
  const s = m.s || 0;
  if (['aprendiendo', 'reaprendiendo'].includes(m.estado) || s < 3) return 0;
  return s < 10 ? 1 : s < 30 ? 2 : s < 120 ? 3 : 4;
}

// ───────────── progreso ─────────────
let P = null;                 // el progreso, en memoria (una sola copia: nada se pisa)
let cola = Promise.resolve(); // las escrituras, en orden
export const ESTADO = { aviso: null };
export const idiomaGuardado = () => valido(P?.ajustes?.idioma) || null;

export function progresoNuevo() {
  return { mem: {}, aprendidos: {}, registro: [], xp: 0, gramatica: {}, ajustes: { lecciones_dia: 3, sonido: true, autoplay: true },
    mochi: { nombre: 'Nyan', equipo_visto: 0 }, herencia: { repasos: 0, items: 0, cobrada: false }, creado: ahora(), version_datos: VERSION_DATOS };
}
const esObjeto = (x) => x && typeof x === 'object' && !Array.isArray(x);
export function completar(p) {
  const base = progresoNuevo();
  const tipos = { mem: esObjeto, aprendidos: esObjeto, registro: Array.isArray, xp: (x) => typeof x === 'number', gramatica: esObjeto, ajustes: esObjeto,
    mochi: esObjeto, herencia: (x) => x === null || esObjeto(x), creado: (x) => typeof x === 'number' };
  for (const [k, ok] of Object.entries(tipos)) if (!(k in p) || !ok(p[k])) p[k] = base[k];
  p.xp = entero(p.xp);
  for (const k of ['ajustes', 'mochi']) for (const [sub, v] of Object.entries(base[k])) if (!(sub in p[k])) p[k][sub] = v;
  if (p.mochi.nombre === 'Mochi') p.mochi.nombre = 'Nyan';
  for (const [k, m] of Object.entries(p.mem)) if (!esObjeto(m)) delete p.mem[k];
  for (const [k, a] of Object.entries(p.aprendidos)) if (!esObjeto(a)) p.aprendidos[k] = { t: typeof a === 'number' ? a : 0 };
  p.registro = p.registro.filter((r) => esObjeto(r) && typeof r.t === 'number');
  p.version_datos = Math.max(p.version_datos || 0, VERSION_DATOS);
  return p;
}

export async function cargarProgreso() {
  let texto = null;
  try { texto = await almacen.leer('progreso.json'); } catch (e) { console.error('No he podido leer el progreso', e); }
  if (texto) {
    try { P = completar(JSON.parse(texto)); return P; } catch (e) {
      // dañado: NO se sobrescribe; se aparta y se vuelve a la copia más reciente que se pueda leer
      const danado = `copias/progreso.danado-${Date.now()}.json`;
      await almacen.escribir(danado, texto).catch(() => {});
      for (const nombre of (await almacen.nombres('copias')).filter((n) => /progreso-\d/.test(n)).sort().reverse()) {
        try { P = completar(JSON.parse(await almacen.leer(nombre))); ESTADO.aviso = { tipo: 'progreso_recuperado', texto: tx('aviso.progreso_recuperado', { copia: nombre }), t: ahora() }; await guardar(); return P; } catch (e2) { /* la siguiente */ }
      }
      ESTADO.aviso = { tipo: 'progreso_danado', texto: tx('aviso.progreso_danado', {}), t: ahora() };
    }
  }
  P = progresoNuevo();
  return P;
}

async function copiaDelDia(texto) {
  const nombre = `copias/progreso-${fsrs.diaDe(ahora())}.json`;
  const copias = (await almacen.nombres('copias')).filter((n) => /progreso-\d{4}-/.test(n)).sort();
  if (copias.includes(nombre) || texto == null) return;
  await almacen.escribir(nombre, texto);
  for (const vieja of [...copias, nombre].sort().slice(0, -COPIAS_MAX)) await almacen.borrar(vieja);
}

async function compactarRegistro(p) {
  const corte = ahora() - DIAS_REGISTRO * 86400, reg = p.registro;
  let n = reg.findIndex((r) => (r.t || 0) >= corte); if (n < 0) n = reg.length;
  if (!n) return;
  const viejos = reg.slice(0, n);
  const antes = (await almacen.leer('registro-antiguo.jsonl')) || '';
  await almacen.escribir('registro-antiguo.jsonl', antes + viejos.map((r) => JSON.stringify(r)).join('\n') + '\n');
  const dias = p.dias_archivados = p.dias_archivados || {};
  for (const r of viejos) { const d = fsrs.diaDe(r.t); dias[d] = (dias[d] || 0) + 1; }
  reg.splice(0, n);
}

/** Guarda el progreso de memoria (en cola: las escrituras nunca se cruzan) */
export function guardar() {
  enlace.alGuardar();   // si está enlazado con otro aparato: apunta lo que ha cambiado (enlace.js)
  cola = cola.then(async () => {
    try {
      await compactarRegistro(P);
      const anterior = await almacen.leer('progreso.json');
      await copiaDelDia(anterior);
      await almacen.escribir('progreso.json', JSON.stringify(P));
      if (CONTENIDO) await escribirResumen(CONTENIDO);
      await enlace.persistir();   // enlace.json después del progreso: nunca va por delante de lo guardado
    } catch (e) { console.error('No he podido guardar el progreso', e); ESTADO.aviso = { tipo: 'guardar', texto: tx('error.guardar_progreso', {}), t: ahora() }; }
  });
  return cola;
}
export const esperarGuardado = () => cola;

/** Tras cargar el progreso (local.js): el motor de sincronización entre aparatos (enlace.js) y su bucle automático */
export async function iniciarEnlace() {
  enlace.conectar({ P: () => P, guardar, almacen, defecto: progresoNuevo });
  try { await enlace.cargar(); enlace.arrancar(); } catch (e) { console.error('No he podido iniciar la sincronización', e); }
}

// ───────────── estadísticas, equipo, racha ─────────────
const KANJI_TOTAL = {};
function estadisticas(p, c) {
  const cuenta = { aprendidos: Object.keys(p.aprendidos).length, rango1: 0, rango3: 0, kanji1: 0, vocab2: 0 }, porRango = [0, 0, 0, 0, 0];
  for (const iid of Object.keys(p.aprendidos)) {
    const it = c.items[iid]; if (!it) continue;
    const r = Math.min(...it.habilidades.map((h) => rango(p.mem[`${iid}:${h}`])));
    if (!Number.isFinite(r) || r < 0) continue;
    porRango[r]++; if (r >= 1) cuenta.rango1++; if (r >= 3) cuenta.rango3++;
    if (it.tipo === 'kanji' && r >= 1) cuenta.kanji1++;
    if (it.tipo === 'vocab' && r >= 2) cuenta.vocab2++;
  }
  // cuántos kanji tiene el mazo (836 con Kaishi, 861 con NyanDeck, 1.262 con NyanDeck 2): la carta de kanji lo lee de aquí
  cuenta.kanji_total = KANJI_TOTAL[c.firma] ??= Object.values(c.items).filter((x) => x.tipo === 'kanji').length;
  return [cuenta, porRango];
}
function equipo(cuenta) {
  let nivel = 0, siguiente = null;
  EQUIPO.forEach((e, i) => {
    const [clave, meta] = e.meta;
    if ((cuenta[clave] || 0) >= meta && nivel === i) nivel++;
    else if (siguiente === null) { const x = pieza(e); siguiente = { id: e.id, nombre: x.nombre, hito: x.hito, tienes: Math.min(cuenta[clave] || 0, meta), meta }; }
  });
  return [nivel, siguiente];
}
function diasActivos(p) {
  const dias = { ...(p.historial_anki || {}) };
  for (const [d, n] of Object.entries(p.dias_archivados || {})) dias[d] = (dias[d] || 0) + n;
  for (const r of p.registro) { const d = fsrs.diaDe(r.t); dias[d] = (dias[d] || 0) + 1; }
  return dias;
}
function racha(p) {
  const dias = diasActivos(p), prot = new Set((p.juego || {}).protegidos || []);
  return [juego.rachaDe(dias, prot, fsrs.diaDe(ahora())), dias];
}
const AVISOS = { omamori_usados: [], omamori_ganado: false };
function juegoAlDia(p) {
  const antes = hash(p.juego);
  const av = juego.mantener(p, diasActivos(p));
  juego.misiones(p);
  AVISOS.omamori_usados = [...new Set([...AVISOS.omamori_usados, ...(av.omamori_usados || [])])].sort();
  AVISOS.omamori_ganado = AVISOS.omamori_ganado || !!av.omamori_ganado;
  return [av, hash(p.juego) !== antes];
}

// ───────────── claves, lecciones, tarjetas ─────────────
const PUNTOS = {};
function claveValida(c, clave) {
  if (typeof clave !== 'string') return false;
  const k = clave.lastIndexOf(':'); if (k < 0) return false;
  const iid = clave.slice(0, k), h = clave.slice(k + 1);
  if (iid.startsWith('g')) {
    let cache = PUNTOS[c.idioma];
    if (!cache || cache.firma !== c.firma) cache = PUNTOS[c.idioma] = { firma: c.firma, puntos: new Set(c.lecciones_gramatica.flatMap(gsrs.puntosDe)) };
    return h === gsrs.HAB && cache.puntos.has(iid.slice(1));
  }
  if (iid.startsWith('f')) return h === gsrs.HAB && iid.slice(1) in gsrs.banco(c).fichas;   // tarjetas de la guía (11-10)
  if (iid.startsWith('c')) return h === gsrs.HAB && !!formaConj(iid.slice(1));   // tarjetas de «Conjugar» (11-10): c<forma>
  const it = c.items[iid];
  return !!it && (it.habilidades || []).includes(h);
}
const pendientes = (p, hasta, c = null) => Object.entries(p.mem).filter(([k, m]) => (m.vence || 0) <= hasta && (!c || claveValida(c, k)));

// ───────────── kana (02-10): lo que llevas de cada hiragana y katakana ─────────────
// p.kana[k] = { b: aciertos, m: fallos, n: dominio 0–5 (sube uno con cada acierto y baja dos con un fallo), t }
const ES_KANA = /^[ぁ-ゖァ-ヺー]{1,2}$/;
function resumenKana(p) {
  const k = esObjeto(p.kana) ? p.kana : {}, cuenta = (re) => Object.entries(k).filter(([x, v]) => re.test(x) && x.length === 1 && v.n >= 3).length;
  return { hiragana: cuenta(/[ぁ-ゖ]/), katakana: cuenta(/[ァ-ヺ]/), vistos: Object.keys(k).length };
}
function kanaResponder(d) {
  const p = P, t = ahora(), kana = esObjeto(p.kana) ? p.kana : (p.kana = {}), xpAntes = p.xp;
  let bien = 0;
  for (const r of (Array.isArray(d.respuestas) ? d.respuestas : []).slice(0, 80)) {
    const k = String(r?.k || ''); if (!ES_KANA.test(k)) continue;
    const x = esObjeto(kana[k]) ? kana[k] : (kana[k] = { b: 0, m: 0, n: 0, t: 0 });
    if (r.ok) { x.b++; x.n = Math.min(5, x.n + 1); bien++; } else { x.m++; x.n = Math.max(0, x.n - 2); }
    x.t = t;
  }
  const xp = Math.min(60, bien * 2);
  p.xp += xp;
  const niv = juego.subirNivel(p, xpAntes);
  guardar();
  return { kana, xp, xp_total: p.xp, ...niv };
}
// palabras de ejemplo para un kana: las más comunes que lo llevan, mejor sin kanji y cortas (si no hay, con su lectura)
function ejemplosKana(c, k, idi) {
  if (!ES_KANA.test(k)) return [];
  const vocab = c.vocab.filter((it) => (it.palabra || '').includes(k) || (it.lectura || '').includes(k));
  const sinKanji = vocab.filter((it) => !(it.kanji || []).length && it.palabra.includes(k) && it.palabra.length <= 6);
  const lista = [...sinKanji, ...vocab.filter((it) => !sinKanji.includes(it))].slice(0, 3);
  return lista.map((it) => ({ palabra: it.palabra, lectura: it.lectura, furigana: it.furigana || '', es: idi === 'en' ? it.en || it.es : it.es || it.en, audio: it.audio || null }));
}
// las preguntas de la prueba de nivel: por tramos del mazo (que va por frecuencia), seis palabras de cada uno, cada una con
// tres significados falsos del mismo tramo (solo el primer sentido, sin paréntesis: que se lea de un vistazo)
const TRAMOS_NIVEL = [[1, 150], [151, 400], [401, 800], [801, 1300], [1301, 1900], [1901, 2500], [2501, 3000]];
function pruebaNivel(c, idi) {
  const corto = (s) => String(s || '').split(/[;；]/)[0].replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  const sig = (it) => corto(idi === 'en' ? it.en || it.es : it.es || it.en);
  const azar = (l, n) => l.map((x) => [Math.random(), x]).sort((a, b) => a[0] - b[0]).slice(0, n).map((x) => x[1]);
  return TRAMOS_NIVEL.map(([desde, hasta]) => {
    const tramo = c.vocab.filter((it) => it.orden >= desde && it.orden <= hasta && sig(it));
    return { desde, hasta: Math.min(hasta, c.vocab.length), preguntas: azar(tramo, 8).map((it) => {
      const vistas = new Set([sig(it)]), malas = [];
      for (const o of azar(tramo, 30)) { const s = sig(o); if (!vistas.has(s)) { vistas.add(s); malas.push(s); } if (malas.length === 3) break; }
      return { palabra: it.palabra, lectura: it.lectura, es: sig(it), malas, audio: it.audio || null };
    }) };
  });
}
// el perfil que se rellena en la bienvenida de Nyan: cómo te llama, para qué estudias, cuánto tiempo, tu nivel
function perfilGuardar(d) {
  const p = P, x = esObjeto(p.perfil) ? { ...p.perfil } : {};
  if (typeof d.nombre === 'string') x.nombre = d.nombre.trim().slice(0, 30);
  if (Array.isArray(d.motivos)) x.motivos = d.motivos.filter((m) => typeof m === 'string').map((m) => m.slice(0, 20)).slice(0, 8);
  if (d.minutos != null) x.minutos = entero(d.minutos, 10, 5, 120);
  if (typeof d.nivel === 'string') x.nivel = d.nivel.slice(0, 20);
  if (d.hasta != null) x.hasta = entero(d.hasta, 0, 0, 3000);
  if (d.hecho) x.hecho = ahora();
  if (d.tour) x.tour = ahora();
  p.perfil = x;
  guardar();
  return x;
}
// la prueba de nivel: lo que ya sabes entra como aprendido, con su primer repaso repartido en los próximos meses (unas
// quince palabras al día, entre 20 y 200 días; lo más fácil, más tarde), para comprobarlo poco a poco sin un atracón de
// repasos. Sin XP: no lo has ganado aquí
function colocarNivel(c, d) {
  const p = P, t = ahora(), hasta = entero(d.hasta, 0, 0, c.vocab.length), pasos = c.paso.filter((x) => x.n <= hasta);
  const dias = Math.min(200, Math.max(20, pasos.length / 15));
  let n = 0;
  pasos.forEach((paso, i) => {
    const espera = Math.round((3 + (dias - 3) * (1 - i / Math.max(1, pasos.length))) * 86400) + Math.floor(Math.random() * 43200);
    for (const iid of [...paso.radicales, ...paso.kanji, paso.vocab]) {
      const it = c.items[iid]; if (!it || iid in p.aprendidos) continue;
      for (const h of it.habilidades) { const clave = `${iid}:${h}`; if (!(clave in p.mem)) p.mem[clave] = memoriaNueva(4, t, espera); }
      p.aprendidos[iid] = { t, de: 'nivel' };
      n++;
    }
  });
  const kana = esObjeto(p.kana) ? p.kana : (p.kana = {});
  for (const k of (Array.isArray(d.kana) ? d.kana : []).slice(0, 300)) if (ES_KANA.test(k) && !esObjeto(kana[k])) kana[k] = { b: 0, m: 0, n: 3, t };
  guardar();
  return { colocados: n, palabra_actual: hasta, region: c.region(Math.min(c.vocab.length, hasta + 1)) };
}

// deshacer la prueba de nivel: fuera todo lo que dio por sabido (palabras, kanji y elementos marcados «de nivel», sus
// tarjetas y los kana que puso a la vez). Lo aprendido de verdad en lecciones y clases no se toca
function deshacerNivel() {
  const p = P, quitar = Object.keys(p.aprendidos).filter((k) => esObjeto(p.aprendidos[k]) && p.aprendidos[k].de === 'nivel');
  if (!quitar.length) return { quitados: 0 };
  const cuando = Math.min(...quitar.map((k) => p.aprendidos[k].t || 0)), fuera = new Set(quitar);
  for (const k of quitar) { delete p.aprendidos[k]; enlace.borrado('aprendidos', k); }
  let tarjetas = 0;
  for (const clave of Object.keys(p.mem)) if (fuera.has(clave.slice(0, clave.lastIndexOf(':')))) { delete p.mem[clave]; enlace.borrado('mem', clave); tarjetas++; }
  if (esObjeto(p.kana)) for (const [k, v] of Object.entries(p.kana)) if (esObjeto(v) && Math.abs((v.t || 0) - cuando) < 5 && !v.b && !v.m) { delete p.kana[k]; enlace.borrado('kana', k); }
  if (esObjeto(p.perfil)) p.perfil.hasta = 0;
  guardar();
  return { quitados: quitar.length, tarjetas };
}

function siguienteLeccion(p, c, palabras = 5, region = null) {
  const bloque = [], piezas = [];
  for (const paso of c.paso) {
    if (region !== null && c.region_de(paso.n) !== region) continue;
    let falta = [...paso.radicales, ...paso.kanji].filter((i) => !(i in p.aprendidos) && !piezas.includes(i));
    const vFalta = !(paso.vocab in p.aprendidos);
    if (region !== null && vFalta) {
      const antes = [];
      for (const k of c.items[paso.vocab].kanji || []) {
        if (!(k in c.items) || k in p.aprendidos || piezas.includes(k) || falta.includes(k) || antes.includes(k)) continue;
        for (const pt of c.items[k].partes || []) if (pt.id && pt.id in c.items && !(pt.id in p.aprendidos) && !piezas.includes(pt.id) && !falta.includes(pt.id) && !antes.includes(pt.id)) antes.push(pt.id);
        antes.push(k);
      }
      falta = [...antes, ...falta];
    }
    if (!falta.length && !vFalta) continue;
    piezas.push(...falta);
    bloque.push({ n: paso.n, piezas: falta, vocab: paso.vocab, nueva: vFalta });
    if (bloque.filter((b) => b.nueva).length >= palabras || piezas.length >= 12) break;
  }
  return bloque;
}
const tipoDeClave = (clave) => TIPO_DE[clave[0]] || '';
function memoriaNueva(nota, t, espera) { const [m] = fsrs.responderEstado({ estado: 'nueva' }, nota, t); m.vence = t + espera; return m; }
function crearTarjetasGramatica(p, lec, t, nota = 3, espera = 600) {
  let n = 0;
  for (const pt of gsrs.puntosDe(lec)) { const clave = `g${pt}:${gsrs.HAB}`; if (!(clave in p.mem)) { p.mem[clave] = memoriaNueva(nota, t, espera); n++; } }
  return n;
}
// 01-10: terminar una CLASE también crea las tarjetas de repaso de sus puntos de gramática (c.clases, del paquete).
// Las preguntas salen del banco (gsrs.banco: ejercicios y ejemplos de la guía, frases del mazo), así que solo nacen las
// de los puntos que tienen con qué preguntar.
function crearTarjetasClase(p, c, id, t, nota = 3, espera = 600) {
  const b = gsrs.banco(c);
  let n = 0;
  for (const pt of (c.clases || {})[id] || []) {
    const clave = `g${pt}:${gsrs.HAB}`;
    if (pt in b.puntos && !(clave in p.mem)) { p.mem[clave] = memoriaNueva(nota, t, espera); n++; }
  }
  return n;
}
function asegurarTarjetas(p, c) {
  const t = ahora(), lecciones = Object.fromEntries(c.lecciones_gramatica.map((g) => [g.slug, g]));
  let n = 0;
  for (const slug of Object.keys(p.gramatica || {})) if (slug in lecciones) n += crearTarjetasGramatica(p, lecciones[slug], t, 3, 0);
  for (const id of Object.keys(p.clases || {})) n += crearTarjetasClase(p, c, id, t, 3, 0);   // las clases que ya tenías hechas
  return n > 0;
}
function regionValida(c, i) {
  const n = parseInt(i, 10);
  if (!Number.isInteger(n) || String(n) !== String(i).trim() || n < 0 || n >= c.REGIONES.length) throw new ErrorJuego('error.region_no_existe', 404);
  return n;
}
function clavesDeRegion(c, i) {
  const ids = new Set(), puntos = {};
  for (const v of c.vocab.slice(i * c.PALABRAS_POR_REGION, (i + 1) * c.PALABRAS_POR_REGION)) {
    ids.add(v.id);
    for (const k of v.kanji || []) { ids.add(k); for (const pt of (c.items[k] || {}).partes || []) if (pt.id) ids.add(pt.id); }
    for (const g of v.gramatica || []) if (g.id) puntos[g.id] = (puntos[g.id] || 0) + 1;
  }
  for (const pt of Object.keys(puntos)) ids.add(`g${pt}`);
  return [ids, puntos];
}
function publico(c, it, p) {
  const x = { ...it };
  x.rangos = Object.fromEntries(it.habilidades.map((h) => [h, rango(p.mem[`${it.id}:${h}`])]));
  x.aprendido = it.id in p.aprendidos;
  if (it.tipo === 'kanji') x.partes = it.partes.map((pt) => { const ci = c.items[pt.id || '']; return ci ? { ...pt, nombre: ci.nombre, mnemo: ci.mnemo } : { ...pt }; });
  if (it.tipo === 'vocab') x.kanji_info = it.kanji.filter((k) => k in c.items).map((k) => ({ id: k, caracter: c.items[k].caracter, clave: c.items[k].clave, aprendido: k in p.aprendidos }));
  return x;
}

// las clases interactivas (web/clases/indice.json, lo hace herramientas/clases.py): la portada sugiere la que toca
let INDICE_CLASES = null;
async function indiceClases() {
  if (!INDICE_CLASES) INDICE_CLASES = await fetch('clases/indice.json').then((r) => (r.ok ? r.json() : [])).catch(() => []);
  return INDICE_CLASES;
}

// ───────────── tiempo de estudio y la pantalla «Tu japonés» (30-09) ─────────────
// El tiempo lo mide la app (estadisticas.js): segundos con la ventana a la vista, en una pantalla de estudio y con
// actividad en el último minuto. Se guarda el total y los últimos 60 días. Antes de existir el contador solo se sabe lo
// que se tardó en responder las tarjetas (registro): eso cuenta como punto de partida, y se dice que es aproximado.
function sumarTiempo(datos) {
  const s = entero(datos.s, 0, 0, 600);
  if (!s) return { ok: true };
  const p = P, dia = fsrs.diaDe(ahora());
  const ti = p.tiempo = esObjeto(p.tiempo) ? p.tiempo : { total: 0, dias: {}, desde: dia };
  if (!ti.total && !ti.previo) ti.previo = Math.round(p.registro.reduce((a, r) => a + Math.min(r.ms || 0, 60000), 0) / 1000);
  ti.total += s; ti.dias[dia] = (ti.dias[dia] || 0) + s;
  const dias = Object.keys(ti.dias).sort();
  for (const d of dias.slice(0, Math.max(0, dias.length - 60))) delete ti.dias[d];
  guardar();
  return { ok: true, total: ti.total };
}
async function estadisticasVista(c) {
  const p = P, t = ahora(), ti = esObjeto(p.tiempo) ? p.tiempo : { total: 0, dias: {} };
  const previo = ti.previo ?? (ti.total ? 0 : Math.round(p.registro.reduce((a, r) => a + Math.min(r.ms || 0, 60000), 0) / 1000));
  const dias = [];
  for (let i = 6; i >= 0; i--) {
    const dia = fsrs.diaDe(fsrs.sumarDias(t, -i)), regs = p.registro.filter((r) => fsrs.diaDe(r.t) === dia);
    dias.push({ dia, s: ti.dias?.[dia] || 0, respuestas: regs.length, aciertos: regs.filter((r) => (r.g || 0) >= 2).length });
  }
  const semana = dias.reduce((a, d) => a + d.s, 0), resp = dias.reduce((a, d) => a + d.respuestas, 0), bien = dias.reduce((a, d) => a + d.aciertos, 0);
  const tipos = { vocab: 0, kanji: 0, radical: 0 }, totales = { vocab: c.vocab.length, kanji: 0, radical: 0 };
  for (const it of Object.values(c.items)) if (it.tipo === 'kanji' || it.tipo === 'radical') totales[it.tipo]++;
  for (const iid of Object.keys(p.aprendidos)) { const it = c.items[iid]; if (it && it.tipo in tipos) tipos[it.tipo]++; }
  const notas = Object.values(p.clases || {}).map((x) => x.mejor).filter((x) => typeof x === 'number');
  return { tiempo_total: ti.total + previo, tiempo_aprox: previo > 0, tiempo_semana: semana, dias, aciertos_semana: resp ? Math.round((100 * bien) / resp) : null,
    aprendidas: tipos, totales, clases_media: notas.length ? Math.round(notas.reduce((a, b) => a + b, 0) / notas.length) : null };
}

// ───────────── resumen para fuera (el widget, la isla y el Hub de NyanOS) ─────────────
// resumen.json, al lado de progreso.json: los MISMOS números que enseña la app (repasos válidos del mazo de ahora, nivel,
// racha, koban, bolsas, misiones…), para que el escritorio no los calcule a su manera (30-09: la isla decía 41 y la app 39).
// «vencen» son las tarjetas que vencerán en la próxima semana: con la app cerrada, el contador sube solo con la hora.
let CONTENIDO = null;
const nivelDetalle = (xp) => {   // la misma cuenta que nivelDe de web/js/app.js
  const pide = (n) => Math.round(150 * n ** 1.45);
  let L = 1, need = pide(1), x = Math.max(0, xp || 0);
  while (x >= need) { x -= need; L++; need = pide(L); }
  return { L, dentro: x, need };
};
async function escribirResumen(c) {
  try {
    const p = P, t = ahora(), hoy = fsrs.inicioDia(t);
    const vencen = pendientes(p, t + 7 * 86400, c).map(([, m]) => m.vence || 0).sort((a, b) => a - b);
    const [r] = racha(p), j = juego.paraInicio(p), niv = nivelDetalle(p.xp);
    const semana = [0, 0, 0, 0, 0, 0, 0];
    for (const x of p.registro) {
      if (x.era === 'leccion') continue;
      const atras = x.t >= hoy ? 0 : Math.floor((hoy - x.t) / 86400) + 1;
      if (atras < 7) semana[6 - atras]++;
    }
    const lec = siguienteLeccion(p, c), hechasC = p.clases || {}, clases = (await indiceClases()).filter((x) => x.hay);
    const leidasL = p.lecturas || {}, lec1 = (await indiceLecturas()).find((x) => x.desde < (lec.length ? lec[0].n : c.vocab.length + 1) && !(x.id in leidasL));
    const resumen = {
      v: 1, t, nombre: (p.mochi && p.mochi.nombre) || 'Nyan', repasos: vencen.filter((v) => v <= t).length, vencen: vencen.filter((v) => v > t),
      nivel: niv.L, xp: p.xp || 0, xp_nivel: niv.dentro, xp_siguiente: niv.need, racha: r,
      koban: j.monedas, bolsas: j.bolsas, misiones: j.misiones_cobradas, misiones_total: j.misiones_total,
      repasos_hoy: semana[6], semana, aprendidas_hoy: Object.values(p.aprendidos).filter((x) => esObjeto(x) && (x.t || 0) >= hoy && x.de !== 'anki' && x.de !== 'nivel').length,
      palabra: lec.length ? lec[0].n : c.vocab.length, palabras_total: c.vocab.length,
      leccion: lec.map((b) => c.items[b.vocab].palabra), clases: clases.filter((x) => x.id in hechasC).length, clases_total: clases.length,
      lectura: lec1 ? (lec1.titulo?.jp || '') : null,
    };
    await almacen.escribir('resumen.json', JSON.stringify(resumen));
  } catch (e) { console.warn('resumen', e); }
}

// las historias de Nyan (web/lecturas/indice.json, lo hace herramientas/lecturas.py): se abren cuando ya sabes todas sus
// palabras (su «desde» queda por detrás de la palabra por la que vas)
let INDICE_LECTURAS = null;
async function indiceLecturas() {
  if (!INDICE_LECTURAS) INDICE_LECTURAS = await fetch('lecturas/indice.json').then((r) => (r.ok ? r.json() : [])).catch(() => []);
  return INDICE_LECTURAS;
}
const palabraActual = (c) => { const lec = siguienteLeccion(P, c); return lec.length ? lec[0].n : c.vocab.length + 1; };
async function lecturas(c) {
  const vas = palabraActual(c), leidas = P.lecturas || {}, idi = idiomaActual();
  return { vas, lista: (await indiceLecturas()).map((x) => ({ id: x.id, desde: x.desde, titulo: x.titulo, resumen: x.resumen?.[idi] || x.resumen?.es || '',
    frases: x.frases, portada: x.portada, abierta: x.desde < vas, leida: leidas[x.id] || null })) };
}
function lecturaHecha(id, datos) {
  if (!/^l\d{2,3}$/.test(id)) throw new ErrorJuego('error.leccion_no_existe', 404);
  const t = ahora(), p = P, reg = (p.lecturas = p.lecturas || {})[id], primera = !reg;
  const total = entero(datos.total, 0, 0, 10), aciertos = entero(datos.aciertos, 0, 0, total);
  const opinion = typeof datos.opinion === 'number' ? entero(datos.opinion, 0, 0, 9) : null;
  p.lecturas[id] = { t, aciertos, total, mejor: Math.max(aciertos, reg?.mejor || 0), veces: (reg?.veces || 0) + 1, primera: reg?.primera ?? t, opinion };
  const xp = (primera ? 60 : 10) + aciertos * 10, xpAntes = p.xp;
  p.xp += xp;
  const niv = juego.subirNivel(p, xpAntes);
  guardar();
  return { xp, xp_total: p.xp, primera, aciertos, total, ...niv };
}

// ───────────── rutas ─────────────
async function inicio(c) {
  const p = P;
  const [, cambio] = juegoAlDia(p);
  if (asegurarTarjetas(p, c) || cambio) guardar();
  const avisos = { ...AVISOS }; AVISOS.omamori_usados = []; AVISOS.omamori_ganado = false;
  const t = ahora(), [cuenta, porRango] = estadisticas(p, c);
  const cuentaRepaso = Object.fromEntries(TIPOS_REPASO.map((x) => [x, 0]));
  const ya = pendientes(p, t, c);
  for (const [k] of ya) { const ti = tipoDeClave(k); if (ti in cuentaRepaso) cuentaRepaso[ti]++; }
  const ajustes = { ...p.ajustes };
  if (!ajustes.filtro_repaso) ajustes.filtro_repaso = { tipos: [...TIPOS_REPASO], habilidades: [...HABILIDADES] };
  const [nivelEquipo, sigEq] = equipo(cuenta), [r, dias] = racha(p), lec = siguienteLeccion(p, c);
  const nActual = lec.length ? lec[0].n : c.vocab.length;
  // Gramática = las clases de Nyan: la primera sin hacer que ya toca (su «desde» llega en las próximas palabras) o, si no, la siguiente
  const clases = (await indiceClases()).filter((x) => x.hay), hechasC = p.clases || {}, idi = idiomaActual();
  const pendiente = clases.find((x) => !(x.id in hechasC) && x.desde <= nActual + 5) || clases.find((x) => !(x.id in hechasC));
  const gram = pendiente ? { slug: pendiente.id, titulo: pendiente.titulo?.[idi] || pendiente.titulo?.es, capitulo: tx('clase.num', { n: pendiente.clase }),
    resumen: pendiente.resumen?.[idi] || pendiente.resumen?.es || '' } : null;
  // una historia nueva que ya se puede leer (la primera sin leer que ya está abierta)
  const leidasL = p.lecturas || {}, lec1 = (await indiceLecturas()).find((x) => x.desde < nActual && !(x.id in leidasL));
  const lectura = lec1 ? { id: lec1.id, titulo: lec1.titulo, resumen: lec1.resumen?.[idi] || lec1.resumen?.es || '', frases: lec1.frases } : null;
  const hoy = fsrs.inicioDia(t);
  const futuros = Object.entries(p.mem).filter(([k, m]) => (m.vence || 0) > t && claveValida(c, k)).map(([, m]) => m.vence || 0);
  return {
    xp: p.xp, mochi: p.mochi, herencia: p.herencia || null, perfil: p.perfil || null,
    de_nivel: Object.values(p.aprendidos).filter((x) => esObjeto(x) && x.de === 'nivel').length, kana: resumenKana(p), nyan_palabras: palabrasParaNyan(p, c), nyan_sabe: (p.nyan_sabe || []).length,
    nyan_diario: (p.nyan_diario || []).slice(-6), repasos_ahora: ya.length, repasos_hoy: pendientes(p, fsrs.sumarDias(t, 1), c).length,
    proximo_repaso: futuros.length ? Math.min(...futuros) : null,
    leccion: { palabras: lec.map((b) => c.items[b.vocab].palabra), piezas: lec.reduce((a, b) => a + b.piezas.length, 0), nuevas: lec.filter((b) => b.nueva).length },
    hechas_hoy: Object.values(p.aprendidos).filter((x) => esObjeto(x) && (x.t || 0) >= hoy && x.de !== 'anki' && x.de !== 'nivel').length,
    gramatica: gram && { slug: gram.slug, titulo: gram.titulo, capitulo: gram.capitulo, resumen: gram.resumen || '' },
    gramatica_total: clases.length, gramatica_hechas: clases.filter((x) => x.id in hechasC).length,
    lectura, lecturas_total: (await indiceLecturas()).length, lecturas_leidas: Object.keys(leidasL).length,
    region: c.region(nActual), palabra_actual: nActual, total_palabras: c.vocab.length, cuenta, por_rango: porRango, rangos: rangos(),
    equipo: nivelEquipo, equipo_siguiente: sigEq, equipo_lista: EQUIPO.map((e) => { const x = pieza(e); return { id: x.id, nombre: x.nombre, hito: x.hito }; }),
    racha: r, dias, ajustes, cuenta_repaso: cuentaRepaso, ...juego.paraInicio(p), omamori_dias: p.juego.protegidos.slice(-60),
    omamori_usados: avisos.omamori_usados, omamori_ganado: avisos.omamori_ganado, aviso_progreso: ESTADO.aviso,
  };
}

function leccion(c, region = null) {
  const bloque = siguienteLeccion(P, c, 5, region), orden = [], vistos = new Set();
  for (const b of bloque) for (const i of [...b.piezas, b.vocab]) if (!vistos.has(i)) { vistos.add(i); orden.push(i); }
  return { items: orden.map((i) => publico(c, c.items[i], P)), region: bloque.length ? c.region(bloque[0].n) : null,
    ya_sabidas: bloque.filter((b) => !b.nueva).map((b) => b.vocab) };
}
// antes de palabras que ya necesitan una clase de gramática que no has hecho, la lección te la propone
async function claseAntes(c, d) {
  const nums = d.items.filter((it) => it.tipo === 'vocab' && !d.ya_sabidas.includes(it.id)).map((it) => c.items[it.id]?.orden || 0);
  if (!nums.length) return null;
  const hasta = Math.max(...nums), hechas = P.clases || {}, idi = idiomaActual();
  const x = (await indiceClases()).find((k) => k.hay && !(k.id in hechas) && k.desde <= hasta);
  return x ? { id: x.id, clase: x.clase, titulo: x.titulo?.[idi] || x.titulo?.es } : null;
}
function idsDeLeccion(p, c, pedidos) {
  let mejor = new Set();
  for (const region of [null, ...c.REGIONES.map((_, i) => i)]) {
    const ids = new Set(siguienteLeccion(p, c, 5, region).flatMap((b) => [...b.piezas, b.vocab]));
    if ([...pedidos].every((x) => ids.has(x))) return ids;
    if ([...ids].filter((x) => pedidos.has(x)).length > [...mejor].filter((x) => pedidos.has(x)).length) mejor = ids;
  }
  return mejor;
}
function aprender(c, datos) {
  const t = ahora(), p = P;
  let xp = 0;
  const pedidos = (Array.isArray(datos.items) ? datos.items : []).filter(esObjeto).slice(0, MAX_LECCION);
  const xpAntes = p.xp, validos = idsDeLeccion(p, c, new Set(pedidos.map((x) => String(x.id))));
  for (const x of pedidos) {
    const iid = String(x.id), fallos = entero(x.fallos, 0, 0, 99), it = c.items[iid];
    if (!it || iid in p.aprendidos || !validos.has(iid)) continue;
    for (const h of it.habilidades) {
      const clave = `${iid}:${h}`;
      if (!(clave in p.mem)) { const [nuevo] = fsrs.responderEstado({ estado: 'nueva' }, fallos ? 2 : 3, t); nuevo.vence = t + (fallos ? 240 : 600); p.mem[clave] = nuevo; }
    }
    p.aprendidos[iid] = { t, de: 'leccion' };
    p.registro.push({ t, id: iid, g: 0, era: 'leccion', ms: 0 });
    xp += 15;
  }
  p.xp += xp;
  const niv = juego.subirNivel(p, xpAntes);
  guardar();
  return { xp, xp_total: p.xp, ...niv };
}

function repaso(c, { limite = 60, tipos = null, habilidades = null, region = null, practica = false, recordar = true } = {}) {
  const p = P;
  let cambio = asegurarTarjetas(p, c);
  if ((tipos !== null || habilidades !== null) && !practica && region === null && recordar) {
    const filtro = { tipos: tipos || [...TIPOS_REPASO], habilidades: habilidades || [...HABILIDADES] };
    if (hash(p.ajustes.filtro_repaso) !== hash(filtro)) { p.ajustes.filtro_repaso = filtro; cambio = true; }
  }
  if (cambio) guardar();
  const t = ahora(), permitidas = region !== null ? clavesDeRegion(c, region)[0] : null;
  const vale = (clave) => {
    if (!claveValida(c, clave)) return false;
    const k = clave.lastIndexOf(':'), iid = clave.slice(0, k), h = clave.slice(k + 1);
    if (tipos !== null && !tipos.includes(tipoDeClave(clave))) return false;
    if (habilidades !== null && h !== gsrs.HAB && !habilidades.includes(h)) return false;
    return permitidas === null || permitidas.has(iid);
  };
  let cand;
  if (practica) {
    cand = Object.entries(p.mem).filter(([k, m]) => vale(k) && !(m.estado === 'nueva' && (m.vence || 0) > t)).map((km) => [km, Math.max(0, rango(km[1])) + AZAR.random() * 1.6]).sort((a, b) => a[1] - b[1]).map((x) => x[0]);
  } else cand = pendientes(p, t).filter(([k]) => vale(k)).sort((a, b) => (a[1].vence || 0) - (b[1].vence || 0));
  const salida = [];
  for (const [clave, m] of cand) {
    if (salida.length >= limite) break;
    const k = clave.lastIndexOf(':'), iid = clave.slice(0, k), h = clave.slice(k + 1);
    let it;
    if (iid.startsWith('g')) it = gsrs.tarjeta(c, iid.slice(1), p, rango);
    else if (iid.startsWith('f')) it = gsrs.tarjetaFicha(c, iid.slice(1), p, rango);
    else if (iid.startsWith('c')) it = conjugacion.tarjetaConj(c, iid.slice(1), p, rango, idiomaActual());
    else { it = c.items[iid]; it = it && publico(c, it, p); }
    if (!it) continue;
    const x = { clave, habilidad: h, rango: rango(m), item: it };
    if (m.estado === 'reaprendiendo') x.rota = true;
    if (practica) x.practica = true;
    salida.push(x);
  }
  return AZAR.shuffle(salida);
}

const ULTIMO = {};
function responder(c, datos, xpBase = null) {
  if (datos.practica) return responderPractica(c, datos);
  const clave = datos.clave;
  if (!claveValida(c, clave)) throw new ErrorJuego('error.tarjeta_no_existe', 404);
  const t = ahora(), p = P;
  const ok = !!datos.correcto, ms = entero(datos.ms, 0, 0, 3600000), pista = !!datos.pista, eligiendo = String(datos.modo || 'escribir') === 'elegir';
  const medio = ok && !!datos.medio;   // medio punto («mover» en 動く): cuenta como «difícil», no como fallo
  const g = !ok ? 1 : pista || medio ? 2 : ms && ms < 3500 && !eligiendo ? 4 : 3;
  const xpAntes = xpBase === null ? p.xp : xpBase;
  const antes = p.mem[clave] || { estado: 'nueva' };
  const [cuentaAntes] = estadisticas(p, c), [eqAntes, sigAntes] = equipo(cuentaAntes), rAntes = rango(antes);
  if ((0 <= t - (antes.ultima || 0) && t - (antes.ultima || 0) < 2) || (antes.vence || 0) > t + 90) {
    const n = juego.nivel(p.xp);
    return { nota: g, rango_antes: rAntes, rango: rAntes, sube: false, baja: false, xp: 0, xp_total: p.xp, otra_vez: null,
      siguiente: fsrs.textoIntervalo(Math.max(60, (antes.vence || 0) - t)), siguiente_seg: Math.round(Math.max(60, (antes.vence || 0) - t)),
      equipo: eqAntes, equipo_nuevo: null, equipo_siguiente: sigAntes, combo: juego.comboActual(p.registro), multiplicador: 1, repetida: true,
      nivel_antes: n, nivel: n, bolsas_ganadas: 0 };
  }
  const [nuevo, otra] = fsrs.responderEstado(antes, g, t);
  // prudencia: como mucho un rango por repaso
  const tope = rAntes >= 0 ? [3, 10, 30, 120, 99999][Math.min(4, Math.max(0, rAntes + 1))] * 0.97 : null;
  if (otra === null && tope && (nuevo.s || 0) > tope) { nuevo.s = tope; nuevo.ivl = fsrs.intervalo(tope); nuevo.vence = fsrs.sumarDias(t, nuevo.ivl); }
  p.mem[clave] = nuevo;
  const rNuevo = rango(nuevo);
  let xp = (g >= 3 ? 10 : g === 2 ? 6 : 1) + (rNuevo > rAntes ? ({ 1: 20, 2: 40, 3: 80, 4: 200 }[rNuevo] || 0) : 0);
  p.registro.push({ t, id: clave, g, ms, era: antes.estado || 'nueva', s: Math.round((nuevo.s || 0) * 100) / 100, r0: rAntes, r: rNuevo, ...(eligiendo ? { m: 'elegir' } : {}), ...(medio ? { medio: 1 } : {}) });
  let combo = juego.comboActual(p.registro);
  if (datos.combo != null) combo = Math.min(combo, entero(datos.combo, combo, 0));
  const doble = ok && combo >= juego.COMBO_DOBLE;
  if (doble) xp *= 2;
  p.xp += xp;
  const niv = juego.subirNivel(p, xpAntes), [cuenta] = estadisticas(p, c), [eq, sig] = equipo(cuenta);
  const aprende = ok && nyanAprende(p, c, clave);
  guardar();
  ULTIMO[clave] = antes;
  return { nota: g, rango_antes: rAntes, rango: rNuevo, sube: rNuevo > rAntes, baja: rNuevo < rAntes, xp, xp_total: p.xp, otra_vez: otra,
    siguiente: fsrs.textoIntervalo(otra !== null ? otra : nuevo.vence - t), siguiente_seg: Math.round(otra !== null ? otra : nuevo.vence - t),
    equipo: eq, equipo_nuevo: eq > eqAntes ? pieza(EQUIPO[eq - 1]) : null, equipo_siguiente: sig, combo, multiplicador: doble ? 2 : 1,
    nyan_aprende: aprende, nyan_sabe: (p.nyan_sabe || []).length, ...niv };
}
function responderPractica(c, datos, xpBase = null) {
  const clave = datos.clave;
  if (!claveValida(c, clave)) throw new ErrorJuego('error.tarjeta_no_existe', 404);
  const t = ahora(), p = P, ok = !!datos.correcto, ms = entero(datos.ms, 0, 0, 3600000);
  const g = !ok ? 1 : datos.pista || datos.medio ? 2 : 3, xpAntes = xpBase === null ? p.xp : xpBase, r = rango(p.mem[clave]);
  const ult = p.registro.at(-1) || {};
  const repetida = ult.id === clave && ult.era === 'practica' && 0 <= t - (ult.t || 0) && t - (ult.t || 0) < 1;
  if (!repetida) p.registro.push({ t, id: clave, g, ms, era: 'practica', r0: r, r });
  let combo = juego.comboActual(p.registro);
  if (datos.combo != null) combo = Math.min(combo, entero(datos.combo, combo, 0));
  const doble = ok && combo >= juego.COMBO_DOBLE;
  const xp = repetida ? 0 : (g >= 3 ? 3 : g === 2 ? 2 : 0) * (doble ? 2 : 1);
  p.xp += xp;
  const niv = juego.subirNivel(p, xpAntes), [cuenta] = estadisticas(p, c), [eq, sig] = equipo(cuenta);
  const aprende = ok && nyanAprende(p, c, clave);
  guardar();
  return { nota: g, rango_antes: r, rango: r, sube: false, baja: false, xp, xp_total: p.xp, otra_vez: null, siguiente: tx('practica_sin_cambios'),
    siguiente_seg: null, equipo: eq, equipo_nuevo: null, equipo_siguiente: sig, combo, multiplicador: doble ? 2 : 1, practica: true,
    nyan_aprende: aprende, nyan_sabe: (p.nyan_sabe || []).length, ...niv };
}
function corregir(c, datos) {
  const clave = datos.clave, practica = !!datos.practica, p = P, ult = p.registro.at(-1) || {};
  if (typeof clave !== 'string' || ult.id !== clave || (ult.g || 0) !== 1 || (ult.era === 'practica') !== practica || ult.era === 'leccion' || (!practica && !(clave in ULTIMO))) return { ok: false };
  const xpBase = p.xp;
  if (!practica) { p.mem[clave] = ULTIMO[clave]; delete ULTIMO[clave]; p.xp -= Math.min(p.xp, 1); }
  p.registro.pop();
  enlace.borrado('registro', enlace.claveRegistro(ult));   // para que no vuelva desde el otro aparato
  const r = practica ? responderPractica(c, { clave, correcto: true, ms: 5000 }, xpBase) : responder(c, { clave, correcto: true, ms: 5000 }, xpBase);
  return { ...r, ok: true };
}

// ───────────── gramática ─────────────
const pct = (a, t) => (t ? Math.round(100 * a / t) : 0);
function estadoGramatica(p, g, t = null) {
  t = t || ahora();
  const slug = g.slug, reg = p.gramatica[slug], vista = (p.gramatica_vista || {})[slug] || (reg || {}).t || null;
  const ej = { mejor: null, ultima: null, intentos: 0, fecha: null, total: (g.ejercicios || []).length };
  if (reg) { const ultima = pct(reg.aciertos || 0, reg.total || 0); Object.assign(ej, { mejor: Math.max(reg.mejor ?? ultima, ultima), ultima, intentos: reg.intentos || 1, fecha: reg.t }); }
  const mems = reg ? gsrs.puntosDe(g).map((pt) => `g${pt}:${gsrs.HAB}`).filter((k) => k in p.mem).map((k) => p.mem[k]) : [];
  const r = mems.length ? Math.min(...mems.map(rango)) : -1;
  const tarjetas = { total: mems.length, pendientes: mems.filter((m) => (m.vence || 0) <= t).length, rango: r, rango_es: r >= 0 ? rangos()[r].es : null, rango_jp: r >= 0 ? RANGOS_JP[r] : null };
  return { vista, ejercicios: ej, tarjetas, estado: mems.length ? 'repaso' : reg ? 'hecha' : vista ? 'leida' : 'nueva' };
}
function gramaticaIndice(c) {
  if (asegurarTarjetas(P, c)) guardar();
  const t = ahora();
  return c.lecciones_gramatica.map((g) => ({ slug: g.slug, titulo: g.titulo, capitulo: g.capitulo || '', orden: g.orden || 0, resumen: g.resumen || '',
    puntos: g.puntos || [], hecha: P.gramatica[g.slug] ?? null, n_ejercicios: (g.ejercicios || []).length, ...estadoGramatica(P, g, t),
    fichas: (g.fichas || []).length, fichas_mias: (g.fichas || []).filter((f) => `f${g.slug}/${f.id}:${gsrs.HAB}` in P.mem).length }));
}
function gramaticaLeccion(c, slug) {
  const g = c.lecciones_gramatica.find((x) => x.slug === slug);
  if (!g) throw new ErrorJuego('error.leccion_no_existe', 404);
  return { ...g, hecha: P.gramatica[slug] ?? null, en_tus_palabras: c.ejemplos_de_gramatica(g.puntos || [], P.aprendidos),
    progreso: estadoGramatica(P, g), generadas: gsrs.banco(c).generadas(slug, P.aprendidos, 8), fichas_mias: fichasMias(P, g) };
}
// 11-10: tarjetas de la guía. Las que añades entran en tu repaso poco a poco (FICHAS_DIA cada día, las primeras ya),
// para que añadir una lección entera no te llene el repaso de golpe. Quitarlas borra lo que llevabas de ellas.
const FICHAS_DIA = 8;
function fichasMias(p, g) {
  const t = ahora(), salida = {};
  for (const f of g.fichas || []) {
    const m = p.mem[`f${g.slug}/${f.id}:${gsrs.HAB}`];
    if (m) salida[f.id] = { rango: rango(m), espera: m.estado === 'nueva' && (m.vence || 0) > t ? m.vence : null };
  }
  return salida;
}
function gramaticaFichas(c, slug, datos) {
  const g = c.lecciones_gramatica.find((x) => x.slug === slug);
  if (!g) throw new ErrorJuego('error.leccion_no_existe', 404);
  const p = P, t = ahora(), propias = new Set((g.fichas || []).map((f) => f.id));
  const ids = (Array.isArray(datos.ids) ? datos.ids : []).map(String).filter((x) => propias.has(x));
  let n = 0;
  if (datos.quitar) {
    for (const id of ids) { const k = `f${slug}/${id}:${gsrs.HAB}`; if (k in p.mem) { delete p.mem[k]; delete ULTIMO[k]; enlace.borrado('mem', k); n++; } }
  } else {
    let cola = Object.entries(p.mem).filter(([k, m]) => k[0] === 'f' && m.estado === 'nueva').length;   // añadidas que aún no has visto
    for (const id of ids) {
      const k = `f${slug}/${id}:${gsrs.HAB}`;
      if (k in p.mem) continue;
      const dia = Math.floor(cola++ / FICHAS_DIA);
      p.mem[k] = { estado: 'nueva', vence: dia ? fsrs.sumarDias(t, dia) : t, anadida: t };
      n++;
    }
  }
  if (n) guardar();
  return { ok: true, cambiadas: n, fichas_mias: fichasMias(p, g), por_dia: FICHAS_DIA };
}
function gramaticaVista(c, slug) {
  if (!c.lecciones_gramatica.some((g) => g.slug === slug)) throw new ErrorJuego('error.leccion_no_existe', 404);
  const vistas = P.gramatica_vista = P.gramatica_vista || {}, nueva = !(slug in vistas);
  if (nueva) { vistas[slug] = ahora(); guardar(); }
  return { ok: true, primera: nueva, vista: vistas[slug] };
}
function gramaticaHecha(c, slug, datos) {
  const g = c.lecciones_gramatica.find((x) => x.slug === slug);
  if (!g) throw new ErrorJuego('error.leccion_no_existe', 404);
  const t = ahora(), p = P, reg = p.gramatica[slug] || {}, primera = !Object.keys(reg).length;
  const total = entero(datos.total, 0, 0, (g.ejercicios || []).length || 10), aciertos = entero(datos.aciertos, 0, 0, total), nota = pct(aciertos, total);
  const antes = primera ? null : Math.max(reg.mejor ?? pct(reg.aciertos || 0, reg.total || 0), 0);
  p.gramatica[slug] = { t, aciertos, total, mejor: Math.max(nota, antes || 0), intentos: (primera ? 0 : reg.intentos || 1) + 1, primera: reg.primera ?? reg.t ?? t };
  (p.gramatica_vista = p.gramatica_vista || {})[slug] ??= t;
  const nuevas = crearTarjetasGramatica(p, g, t, nota >= 70 ? 3 : 2);
  const xp = (primera ? 100 : 20) + aciertos * 5, xpAntes = p.xp;
  p.xp += xp;
  const niv = juego.subirNivel(p, xpAntes);
  juego.anotarGramatica(p);
  guardar();
  return { xp, xp_total: p.xp, nota, mejor: p.gramatica[slug].mejor, record: antes !== null && nota > antes, primera, tarjetas_nuevas: nuevas, progreso: estadoGramatica(p, g), ...niv };
}

// ───────────── conjugar (11-10) ─────────────
// GET /api/conjugar → las formas y cómo las llevas · GET /api/conjugar/<forma>?n= → una ronda · POST /api/conjugar/<forma> {aciertos, total} → la forma entra en el repaso
function conjugarRonda(c, id, n) {
  const x = conjugacion.rondaDe(c, P, id, n, idiomaActual(), rango);
  if (!x) throw new ErrorJuego('error.tarjeta_no_existe', 404);
  return x;
}
function conjugarHecha(c, id, datos) {
  if (!formaConj(id)) throw new ErrorJuego('error.tarjeta_no_existe', 404);
  const t = ahora(), p = P, clave = `c${id}:${gsrs.HAB}`;
  const total = entero(datos.total, 0, 0, 60), aciertos = entero(datos.aciertos, 0, 0, total), nota = pct(aciertos, total);
  const nueva = !(clave in p.mem);
  if (nueva) p.mem[clave] = memoriaNueva(nota >= 70 ? 3 : 2, t, 600);
  const xp = aciertos * 2 + (nueva ? 10 : 0), xpAntes = p.xp;
  p.xp += xp;
  const niv = juego.subirNivel(p, xpAntes);
  juego.anotarGramatica(p);
  guardar();
  return { xp, xp_total: p.xp, en_repaso: true, nueva, nota, ...niv };
}

// Clases nuevas (web/clases/<id>.json: manga, «la frase cobra vida», minijuego). Solo existen en el motor JS.
function claseHecha(c, id, datos) {
  if (!/^[a-z0-9-]{1,40}$/.test(id)) throw new ErrorJuego('error.leccion_no_existe', 404);
  const t = ahora(), p = P, clases = p.clases = p.clases || {}, reg = clases[id], primera = !reg;
  const total = entero(datos.total, 0, 0, 60), aciertos = entero(datos.aciertos, 0, 0, total), nota = pct(aciertos, total);
  clases[id] = { t, aciertos, total, nota, mejor: Math.max(nota, reg?.mejor || 0), intentos: (reg?.intentos || 0) + 1, primera: reg?.primera ?? t };
  const xp = (primera ? 100 : 20) + aciertos * 5, xpAntes = p.xp;
  p.xp += xp;
  const niv = juego.subirNivel(p, xpAntes);
  juego.anotarGramatica(p);
  const tarjetas = crearTarjetasClase(p, c, id, t, nota >= 70 ? 3 : 2);
  guardar();
  return { xp, xp_total: p.xp, nota, mejor: clases[id].mejor, record: !primera && nota > (reg.mejor || 0), primera, tarjetas, ...niv };
}

// ───────────── regiones, fichas, ajustes ─────────────
function preparacion(c, iStr) {
  const i = regionValida(c, iStr), cat = juego.catalogo(), p = P, est = juego.estadoJefe(p, c, cat, i);
  const vocab = c.vocab.slice(i * c.PALABRAS_POR_REGION, (i + 1) * c.PALABRAS_POR_REGION), faltanV = vocab.filter((v) => !(v.id in p.aprendidos));
  const [ids, puntos] = clavesDeRegion(c, i), b = gsrs.banco(c), lecciones = {};
  for (const [pt, veces] of Object.entries(puntos)) {
    const info = b.puntos[pt]; if (!info) continue;
    const g = b.lecciones[info.leccion]; if (!g || (g.orden || 0) <= 3) continue;
    const x = lecciones[g.slug] = lecciones[g.slug] || { slug: g.slug, titulo: g.titulo, capitulo: g.capitulo || '', orden: g.orden || 0, hecha: g.slug in p.gramatica, veces: 0, puntos: [] };
    x.veces += veces; x.puntos.push({ id: pt, jp: info.jp || '', es: info.es || '' });
  }
  const gram = Object.values(lecciones).sort((a, b2) => a.orden - b2.orden);
  const practicables = Object.keys(p.mem).filter((k) => ids.has(k.slice(0, k.lastIndexOf(':')))).length;
  const sig = siguienteLeccion(p, c, 5, i);
  return { region: i, nombre: c.nombre_region(i), jp: c.REGIONES[i], palabras_total: est.total, aprendidas: est.aprendidas, necesarias: est.necesarias,
    faltan: Math.max(0, est.necesarias - est.aprendidas), faltan_todas: faltanV.length, desbloqueado: est.desbloqueado, vencido: est.vencido,
    siguientes: faltanV.slice(0, 8).map((v) => v.palabra),
    siguientes_detalle: faltanV.slice(0, 8).map((v) => ({ id: v.id, palabra: v.palabra, lectura: v.lectura || '', es: v.es || v.en || '' })),
    leccion: { palabras: sig.map((x) => c.items[x.vocab].palabra), piezas: sig.reduce((a, x) => a + x.piezas.length, 0), nuevas: sig.filter((x) => x.nueva).length },
    gramatica: gram, gramatica_pendientes: gram.filter((x) => !x.hecha).length, practica_disponible: practicables > 0, practica_tarjetas: practicables };
}
// en el camino, la gramática de cada región son las clases de Nyan: las pendientes hasta el final de la región y las que caen dentro
async function conClases(c, prep) {
  const hechas = P.clases || {}, idi = idiomaActual(), ini = prep.region * c.PALABRAS_POR_REGION, fin = ini + c.PALABRAS_POR_REGION;
  const cls = (await indiceClases()).filter((x) => x.hay && x.desde <= fin && (!(x.id in hechas) || x.desde > ini));
  if (!cls.length) return prep;
  const gram = cls.sort((a, b) => (a.id in hechas) - (b.id in hechas) || a.desde - b.desde).map((x) => ({ slug: x.id, titulo: x.titulo?.[idi] || x.titulo?.es,
    capitulo: tx('clase.num', { n: x.clase }), orden: x.clase, hecha: x.id in hechas, veces: 0, puntos: [] }));
  return { ...prep, gramatica: gram, gramatica_pendientes: gram.filter((x) => !x.hecha).length };
}
function cobrarHerencia() {
  const p = P, h = p.herencia || {};
  if (h.cobrada) return { xp: 0, xp_total: p.xp };
  const xp = entero(h.repasos, 0) + 15 * entero(h.items, 0);
  p.xp += xp; juego.sinPremioDeNivel(p); h.cobrada = true; p.herencia = h; guardar();
  return { xp, xp_total: p.xp };
}
function item(c, iid) {
  const p = P;
  if (iid.startsWith('g')) { const x = gsrs.tarjeta(c, iid.slice(1), p, rango); if (!x) throw new ErrorJuego('error.ficha_no_existe', 404); return x; }
  if (iid.startsWith('f')) { const x = gsrs.tarjetaFicha(c, iid.slice(1), p, rango); if (!x) throw new ErrorJuego('error.ficha_no_existe', 404); return x; }
  if (iid.startsWith('c')) { const x = conjugacion.tarjetaConj(c, iid.slice(1), P, rango, idiomaActual()); if (!x) throw new ErrorJuego('error.ficha_no_existe', 404); return x; }
  const it = c.items[iid];
  if (!it) throw new ErrorJuego('error.ficha_no_existe', 404);
  const x = publico(c, it, p);
  if (it.tipo === 'kanji') x.vocab_con = c.vocab.filter((v) => v.kanji.includes(it.id)).slice(0, 30).map((v) => ({ id: v.id, palabra: v.palabra, lectura: v.lectura, es: v.es || v.en, aprendido: v.id in p.aprendidos }));
  if (it.tipo === 'radical') x.kanji_con = (it.ejemplos || []).filter((k) => `k${k}` in c.items).map((k) => ({ id: `k${k}`, caracter: k, clave: c.items[`k${k}`].clave || '', aprendido: `k${k}` in p.aprendidos }));
  return x;
}
function ajustes(datos) {
  const p = P;
  if ('lecciones_dia' in datos) p.ajustes.lecciones_dia = entero(datos.lecciones_dia, 3, 1, 20);
  for (const k of ['sonido', 'autoplay', 'musica']) if (k in datos) p.ajustes[k] = !!datos[k];
  if (MODOS_REPASO.includes(datos.modo_repaso)) p.ajustes.modo_repaso = datos.modo_repaso;
  const f = datos.filtro_repaso;
  if (esObjeto(f)) {
    const lista = (x) => (Array.isArray(x) ? x : []);
    const tipos = lista(f.tipos).filter((t) => TIPOS_REPASO.includes(t)), habs = lista(f.habilidades).filter((h) => HABILIDADES.includes(h));
    p.ajustes.filtro_repaso = { tipos: tipos.length ? tipos : [...TIPOS_REPASO], habilidades: habs.length ? habs : [...HABILIDADES], v: 2 };
  }
  if (valido(datos.idioma)) p.ajustes.idioma = datos.idioma;
  if (['washi', 'noche', 'pop', 'sumi', 'auto'].includes(datos.tema)) p.ajustes.tema = datos.tema;   // el tema de la interfaz (tema.js); no viaja entre aparatos
  if ('nombre' in datos) p.mochi.nombre = String(datos.nombre).trim().slice(0, 16) || 'Nyan';
  if ('equipo_visto' in datos) p.mochi.equipo_visto = entero(datos.equipo_visto, p.mochi.equipo_visto || 0, 0, EQUIPO.length);
  if (Array.isArray(datos.equipo_quitado)) { const ids = new Set(EQUIPO.map((e) => e.id)); p.mochi.quitado = [...new Set(datos.equipo_quitado.map(String))].filter((x) => ids.has(x)); }
  if (esObjeto(datos.sitios)) p.mochi.sitios = Object.fromEntries(Object.entries(datos.sitios).slice(0, 40).filter(([, v]) => typeof v === 'string').map(([k, v]) => [String(k).slice(0, 24), v.slice(0, 12)]));
  for (const k of ['vol_musica', 'vol_efectos', 'vol_voz']) if (k in datos) p.ajustes[k] = entero(datos[k], 100, 0, 100);
  guardar();
  return { ok: true, ajustes: p.ajustes, mochi: p.mochi };
}

// ───────────── enséñale a Nyan ─────────────
function nyanAprende(p, c, clave) {
  const iid = String(clave || '').slice(0, String(clave || '').lastIndexOf(':'));
  if (!iid || iid.startsWith('g') || !(iid in c.items)) return false;
  const sabe = p.nyan_sabe = p.nyan_sabe || [];
  if (sabe.includes(iid)) return false;
  sabe.push(iid); return true;
}
function palabrasParaNyan(p, c, n = 8) {
  const ids = Object.keys(p.aprendidos).filter((i) => { const it = c.items[i]; return it && it.tipo === 'vocab' && it.es && it.palabra; });
  const sabe = new Set(p.nyan_sabe || []);
  return AZAR.sample(ids, Math.min(n, ids.length)).map((i) => ({ id: i, palabra: c.items[i].palabra, lectura: c.items[i].lectura || '', es: c.items[i].es, sabe: sabe.has(i) }));
}
function diarioNyan(datos) {
  const lineas = (datos.lineas || []).slice(0, 6).map((x) => String(x).slice(0, 240));
  if (!lineas.length) throw new ErrorJuego('error.objeto_no_existe', 400);
  const d = P.nyan_diario = P.nyan_diario || [];
  d.push({ t: ahora(), lineas }); if (d.length > 30) d.splice(0, d.length - 30);
  guardar(); return { ok: true };
}
function ensenarNyan(c, datos) {
  const p = P, iid = String(datos.id || ''), it = c.items[iid];
  if (!it || it.tipo !== 'vocab' || !(iid in p.aprendidos)) throw new ErrorJuego('error.objeto_no_existe', 404);
  const m = p.mochi, j = juego.asegurar(p), hoy = fsrs.inicioDia(ahora());
  m.ensenadas = entero(m.ensenadas, 0, 0) + 1;
  const sabe = p.nyan_sabe = p.nyan_sabe || []; if (!sabe.includes(iid)) sabe.push(iid);
  if (m.ensenadas_dia !== hoy) { m.ensenadas_dia = hoy; m.ensenadas_hoy = 0; }
  const premio = (m.ensenadas_hoy || 0) < NYAN_PREMIOS_DIA ? 1 : 0;
  m.ensenadas_hoy = (m.ensenadas_hoy || 0) + 1; j.monedas += premio;
  guardar();
  return { ok: true, sabe: sabe.length, premio, monedas: j.monedas, palabras: palabrasParaNyan(p, c) };
}
function poolOpciones(c) {
  const p = P;
  return Object.values(c.items).map((it) => {
    const x = { id: it.id, t: it.tipo, a: it.id in p.aprendidos ? 1 : 0 };
    if (it.tipo === 'vocab') Object.assign(x, { c: it.palabra, s: it.es || it.en || '', alt: [...(it.alt || []).slice(0, 4), ...(it.es && it.en && it.en !== it.es ? [it.en] : [])],
      l: String(it.lectura || '').replaceAll('，', '、').replaceAll(',', '、').replaceAll('/', '、').split('、').map((y) => y.trim()).filter(Boolean), k: it.kanji || [], en: it.en || '' });
    else if (it.tipo === 'kanji') { const usadas = (it.lecturas || []).map((l) => l.lectura).filter(Boolean); Object.assign(x, { c: it.caracter, s: it.clave || '', alt: (it.alt || []).slice(0, 4), l: [...new Set([...usadas, ...(it.lecturas_validas || [])])], k: (it.partes || []).map((pt) => pt.id).filter(Boolean) }); }
    else Object.assign(x, { c: it.caracter || it.elemento || '', s: it.nombre || '', alt: (it.alt || []).slice(0, 4), l: [], k: [] });
    return x;
  });
}
function libretaNyan(c, n = 160) {
  const sabe = P.nyan_sabe || [], salida = [];
  for (const iid of [...sabe].reverse()) {
    const it = c.items[iid]; if (!it) continue;
    const jp = it.tipo === 'vocab' ? it.palabra : (it.caracter || it.elemento || ''), sig = it.es || it.en || it.clave || it.nombre || '';
    salida.push({ id: iid, tipo: it.tipo, jp, lectura: it.tipo === 'vocab' ? it.lectura || '' : '', es: sig });
    if (salida.length >= n) break;
  }
  return { sabe: sabe.length, palabras: salida };
}
function mapaKanji(c) {
  return Object.values(c.items).filter((x) => x.tipo === 'kanji').sort((a, b) => a.orden - b.orden).map((it) => ({
    id: it.id, k: it.caracter, clave: it.clave, r: it.id in P.aprendidos ? Math.min(...it.habilidades.map((h) => rango(P.mem[`${it.id}:${h}`]))) : -1 }));
}
function camino(c) {
  return c.REGIONES.map((jp, i) => {
    const vocab = c.vocab.slice(i * c.PALABRAS_POR_REGION, (i + 1) * c.PALABRAS_POR_REGION);
    return { i, nombre: c.nombre_region(i), jp, total: vocab.length, hechas: vocab.filter((v) => v.id in P.aprendidos).length,
      fuertes: vocab.filter((v) => Math.min(...v.habilidades.map((h) => rango(P.mem[`${v.id}:${h}`]))) >= 2).length, muestra: vocab.slice(0, 6).map((v) => v.palabra) };
  });
}

// ───────────── juego ─────────────
function conJuego(c, fn, escribe = true) {
  const cat = juego.catalogo(), [, cambio] = juegoAlDia(P), r = fn(P, c, cat);
  if (escribe || cambio) guardar();
  return r;
}
const regionDeRuta = (texto) => { const n = parseInt(texto, 10); if (!Number.isInteger(n)) throw new ErrorJuego('error.region_no_existe', 404); return n; };

// ───────────── enrutador ─────────────
const listaParam = (q, nombre, validos) => {
  const crudo = q.getAll(nombre).join(',');
  if (!crudo.trim()) return null;
  return [...new Set(crudo.split(',').map((y) => y.trim()))].filter((x) => validos.includes(x));
};

/** Responde a una petición de la app. → [código, cuerpo] */
export async function atender(metodo, url, datos, idiomaPeticion) {
  ponerIdioma(valido(idiomaPeticion) || idiomaGuardado() || 'es');
  const u = new URL(url, 'http://nyango.local'), ruta = decodeURIComponent(u.pathname), q = u.searchParams;
  try {
    if (ruta === '/api/arranque') return [200, { listo: true, razon: null, detalle: null, faltan: null, aviso: null, carpeta: null, local: true }];
    if (ruta === '/api/idioma') return [200, { idioma: idiomaGuardado(), idiomas: IDIOMAS }];
    if (ruta === '/api/latido' || ruta === '/api/adios') return [200, { ok: true }];
    if (ruta.startsWith('/api/enlace')) { const r = await enlace.atender(metodo, ruta, esObjeto(datos) ? datos : {}); if (r) return r; }
    const c = await cargarContenido(idiomaActual());
    if (!CONTENIDO) { CONTENIDO = c; escribirResumen(c); }   // al abrir la app, el escritorio se pone al día
    if (metodo === 'GET') {
      if (ruta === '/api/inicio') { await enlace.esperarInicial(); return [200, await inicio(c)]; }   // la portada ya cuenta lo del otro aparato
      if (ruta === '/api/leccion') {
        const reg = q.get('region'), d = leccion(c, reg ? regionValida(c, reg) : null);
        return [200, { ...d, clase_antes: await claseAntes(c, d) }];
      }
      if (ruta === '/api/repaso') {
        const reg = q.get('region');
        return [200, repaso(c, { limite: entero(q.get('n') ?? '60', 60, 1, 500), tipos: listaParam(q, 'tipos', TIPOS_REPASO),
          habilidades: listaParam(q, 'habilidades', [...HABILIDADES, gsrs.HAB]), region: reg ? regionValida(c, reg) : null,
          practica: ['1', 'true', 'si', 'sí'].includes(q.get('practica') || '0'), recordar: q.get('recordar') !== '0' })];
      }
      const partes = ruta.replace(/^\/|\/$/g, '').split('/');
      if (partes.length === 4 && partes[1] === 'region' && partes[3] === 'preparacion') return [200, await conClases(c, preparacion(c, partes[2]))];
      if (ruta === '/api/conjugar') return [200, conjugacion.indice(c, P, rango, idiomaActual(), ahora())];
      if (partes.length === 3 && partes[1] === 'conjugar') return [200, conjugarRonda(c, partes[2], q.get('n') ? entero(q.get('n'), 8, 1, 30) : 0)];
      if (ruta === '/api/gramatica') return [200, gramaticaIndice(c)];
      if (ruta.startsWith('/api/gramatica/')) return [200, gramaticaLeccion(c, ruta.split('/').at(-1))];
      if (ruta === '/api/kanji') return [200, mapaKanji(c)];
      if (ruta === '/api/camino') return [200, camino(c)];
      if (ruta === '/api/nyan/libreta') return [200, libretaNyan(c)];
      if (ruta === '/api/opciones') return [200, poolOpciones(c)];
      if (ruta.startsWith('/api/item/')) return [200, item(c, ruta.slice('/api/item/'.length))];
      if (ruta === '/api/juego') return [200, conJuego(c, (p, cc, cat) => juego.resumen(p, cc, cat), false)];
      if (partes.length === 3 && partes[1] === 'jefe') { const i = regionDeRuta(partes[2]); return [200, conJuego(c, (p, cc, cat) => juego.combate(p, cc, cat, i, (it, pp) => publico(cc, it, pp), rango))]; }
      if (ruta === '/api/progreso/exportar') { await esperarGuardado(); return [200, P]; }
      if (ruta === '/api/clases') return [200, P.clases || {}];
      if (ruta === '/api/lecturas') return [200, await lecturas(c)];
      if (ruta === '/api/estadisticas') return [200, await estadisticasVista(c)];
      if (ruta === '/api/kana') return [200, esObjeto(P.kana) ? P.kana : {}];
      if (ruta === '/api/kana/ejemplos') return [200, ejemplosKana(c, q.get('k') || '', q.get('lang') || idiomaPeticion)];
      if (ruta === '/api/perfil') return [200, P.perfil || null];
      if (ruta === '/api/nivel/prueba') return [200, pruebaNivel(c, q.get('lang') || idiomaPeticion)];
      return [404, new ErrorJuego('error.no_existe').cuerpo()];
    }
    const d = esObjeto(datos) ? datos : {};
    if (ruta === '/api/bolsa/abrir') return [200, conJuego(c, (p, cc, cat) => juego.abrirBolsa(p, cat))];
    if (ruta === '/api/misiones/cobrar') return [200, conJuego(c, (p) => juego.cobrarMision(p, d))];
    if (ruta === '/api/colocar') return [200, conJuego(c, (p, cc, cat) => juego.colocar(p, cat, d))];
    if (ruta === '/api/tienda') return [200, conJuego(c, (p) => juego.tienda(p, d))];
    if (ruta === '/api/sesion/fin') return [200, conJuego(c, (p) => juego.sesionFin(p, d))];
    if (ruta === '/api/coleccion/visto') return [200, conJuego(c, (p) => juego.visto(p, d))];
    const partes = ruta.replace(/^\/|\/$/g, '').split('/');
    if (partes.length === 4 && partes[1] === 'jefe' && partes[3] === 'resultado') { const i = regionDeRuta(partes[2]); return [200, conJuego(c, (p, cc, cat) => juego.resultadoJefe(p, cc, cat, i, d))]; }
    if (ruta === '/api/aprender') return [200, aprender(c, d)];
    if (ruta === '/api/responder') return [200, responder(c, d)];
    if (ruta === '/api/corregir') return [200, corregir(c, d)];
    if (partes.length === 3 && partes[1] === 'conjugar') return [200, conjugarHecha(c, partes[2], d)];
    if (ruta.startsWith('/api/gramatica/') && ruta.replace(/\/$/, '').endsWith('/vista')) return [200, gramaticaVista(c, ruta.replace(/\/$/, '').split('/').at(-2))];
    if (ruta.startsWith('/api/gramatica/') && ruta.replace(/\/$/, '').endsWith('/fichas')) return [200, gramaticaFichas(c, ruta.replace(/\/$/, '').split('/').at(-2), d)];
    if (ruta.startsWith('/api/gramatica/')) return [200, gramaticaHecha(c, ruta.split('/').at(-1), d)];
    if (partes.length === 3 && partes[1] === 'clase') return [200, claseHecha(c, partes[2], d)];
    if (partes.length === 3 && partes[1] === 'lectura') return [200, lecturaHecha(partes[2], d)];
    if (ruta === '/api/herencia') return [200, cobrarHerencia()];
    if (ruta === '/api/kana') return [200, kanaResponder(d)];
    if (ruta === '/api/perfil') return [200, perfilGuardar(d)];
    if (ruta === '/api/nivel/deshacer') return [200, deshacerNivel()];
    if (ruta === '/api/nivel') return [200, colocarNivel(c, d)];
    if (ruta === '/api/tiempo') return [200, sumarTiempo(d)];
    if (ruta === '/api/ajustes') return [200, ajustes(d)];
    if (ruta === '/api/nyan/ensenar') return [200, ensenarNyan(c, d)];
    if (ruta === '/api/nyan/diario') return [200, diarioNyan(d)];
    if (ruta === '/api/sincronizar') return [200, { nuevos: 0 }];
    if (ruta === '/api/progreso/importar') return [200, await importarProgreso(d)];
    return [404, new ErrorJuego('error.no_existe').cuerpo()];
  } catch (e) {
    if (e instanceof ErrorJuego) return [e.codigo, e.cuerpo()];
    console.error(e);
    return [500, { ...new ErrorJuego('error.fallo').cuerpo(), detalle: `${e.name}: ${e.message}` }];
  }
}

// ───────────── traer el progreso del Nyango de antes (Kaishi) o de una copia ─────────────
let MIGRACION = null;
async function tablaMigracion() {
  if (!MIGRACION) MIGRACION = await fetch('/datos/migracion.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
  return MIGRACION;
}
/** {texto: el progreso.json de antes}: sustituye el de ahora (que queda en copias/) por ese, con los ids de palabra pasados a NyanDeck */
async function importarProgreso(datos) {
  let viejo;
  try { viejo = JSON.parse(String(datos.texto || '')); } catch (e) { throw new ErrorJuego('error.json', 400); }
  if (!esObjeto(viejo) || !esObjeto(viejo.mem)) throw new ErrorJuego('error.json', 400);
  const mapa = await tablaMigracion();
  const nuevoId = (iid) => (/^v\d+$/.test(iid) && mapa[iid]) || iid;
  const nuevaClave = (clave) => { const k = String(clave).lastIndexOf(':'); return k < 0 ? nuevoId(String(clave)) : nuevoId(clave.slice(0, k)) + clave.slice(k); };
  let pasadas = 0;
  const p = completar(JSON.parse(JSON.stringify(viejo)));
  p.mem = Object.fromEntries(Object.entries(p.mem).map(([k, m]) => [nuevaClave(k), m]));
  p.aprendidos = Object.fromEntries(Object.entries(p.aprendidos).map(([k, a]) => { const n = nuevoId(k); if (n !== k) pasadas++; return [n, a]; }));
  p.registro = p.registro.map((r) => ({ ...r, id: r.id ? nuevaClave(r.id) : r.id }));
  p.nyan_sabe = (p.nyan_sabe || []).map(nuevoId);
  p.herencia = { ...(p.herencia || {}), cobrada: true };
  delete p.historial_anki;
  await esperarGuardado();
  const actual = await almacen.leer('progreso.json');
  if (actual) await almacen.escribir(`copias/progreso.antes-de-importar-${Date.now()}.json`, actual);
  P = p;
  await guardar();
  return { ok: true, palabras: pasadas, aprendidos: Object.keys(p.aprendidos).length, xp: p.xp };
}
