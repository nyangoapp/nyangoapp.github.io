// ニャン語 Nyango · el juego (traducción de nucleo/juego.py): koban, bolsas de la suerte (福袋), colección (図鑑), misiones del
// día, omamori y jefes de región. Todo vive en el progreso bajo la clave «juego»; nada de aquí toca la memoria FSRS (p.mem).
import { inicioDia, diaDe, fecha, isoDe, ahora as ahoraTs, pyRound } from './fsrs.js';
import { tx, juego as textosJuego, idioma, plural, rellenar, valido } from './textos.js';
import { AZAR, conSemilla } from './azar.js';

export const PRECIOS = { bolsa: 100, omamori: 150 };
const BOLSAS_BIENVENIDA = 1, MONEDAS_JEFE = 100, MONEDAS_JEFE_REVANCHA = 30, MONEDAS_JEFE_DIA = 30, GOLPES_MIN_VICTORIA = 5;
const FALLOS_MAX_VICTORIA = 2, SEG_POR_RESPUESTA = 1.0, MONEDAS_SI_TIENES_TODO = 120, UNLOCK_JEFE = 0.8, PREGUNTAS_JEFE = [12, 16];
const SESION_MIN_RESPUESTAS = 10, PAUSA_COMBO = 20 * 60;
export const COMBO_DOBLE = 20;
const OMAMORI_CADA = 7, BOLSAS_NIVEL_PETICION = 3, NIVELES_POR_BOLSA = 3, KOBAN_POR_NIVEL = 25, XP_MAX = 10 ** 8;
const UNO_A_LA_VEZ = ['ropa', 'accesorio', 'aura'];
const RAREZAS_JEFE = ['epico', 'legendario'];
const ROMANOS = ['', ' II', ' III', ' IV', ' V', ' VI'];
const MISIONES = { repasar: [[20, 25], [30, 35], [40, 45]], aprender: [[5, 25], [10, 40]], combo: [[8, 25], [12, 35], [15, 45]],
  rango: [[3, 30], [5, 45]], gramatica: [[1, 40]] };

export class ErrorJuego extends Error {
  constructor(mensaje, codigo = 400, datos = {}) {
    const clave = mensaje.startsWith('error.') ? mensaje : null;
    super(clave ? tx(mensaje, datos) : mensaje);
    this.clave = clave; this.datos = datos; this.codigo = codigo;
  }
  cuerpo() { return { error: this.message, ...(this.clave ? { clave: this.clave, datos: this.datos } : {}) }; }
}

// ───────────── catálogo y nivel ─────────────
let CAT_BASE = null;
const CATS = {};
export async function cargarCatalogo() {
  if (!CAT_BASE) CAT_BASE = await (await fetch('/datos/juego/catalogo.json')).json();
}
export function catalogo(id = null) {
  const i = valido(id) || idioma();
  if (!CATS[i]) {
    const datos = JSON.parse(JSON.stringify(CAT_BASE)), t = textosJuego(i);
    for (const [k, r] of Object.entries(datos.rarezas || {})) r.nombre = (t.rarezas || {})[k] || r.nombre || k;
    for (const lista of ['objetos', 'jefes']) {
      for (const o of datos[lista] || []) { const x = (t[lista] || {})[o.id] || {}; o.nombre = x.nombre || o.nombre || o.id; o.desc = x.desc || o.desc || ''; }
    }
    datos.por_id = Object.fromEntries((datos.objetos || []).map((o) => [o.id, o]));
    CATS[i] = datos;
  }
  return CATS[i];
}

function textoMision(tipo, n) {
  const m = (textosJuego().misiones || {})[tipo] || {};
  let t = m.texto || '';
  if (t && typeof t === 'object') t = t[plural(n)] || t.other || '';
  return [rellenar(t, { n }), m.pista || ''];
}

export function tituloTxt(titulo) {
  if (!titulo || idioma() === 'es') return titulo;
  let base = titulo, suf = '';
  for (const r of [...ROMANOS.slice(1)].sort((a, b) => b.length - a.length)) if (titulo.endsWith(r)) { base = titulo.slice(0, -r.length); suf = r; break; }
  const es = textosJuego('es').titulos || {}, otro = textosJuego().titulos || {};
  const iid = Object.keys(es).find((k) => es[k] === base && k !== 'generico');
  return iid ? (otro[iid] || base) + suf : titulo;
}

const CURVA = 2;
export const xpPara = (L) => pyRound(150 * L ** 1.45);
export function nivel(xp) {
  let L = 1, x = Math.min(XP_MAX, Math.max(0, xp || 0)), need = xpPara(L);
  while (x >= need) { x -= need; L++; need = xpPara(L); }
  return L;
}

export function ficha(o, cat = null) {
  const x = {};
  for (const k of ['id', 'nombre', 'jp', 'rareza', 'tipo', 'desc']) x[k] = o[k] ?? null;
  if (cat) { const r = cat.rarezas[o.rareza] || {}; x.rareza_nombre = r.nombre || ''; x.color = r.color || ''; }
  x.img = `img/objetos/${o.id}.svg`;
  return x;
}

// ───────────── estado ─────────────
export function asegurar(p, ahora = null) {
  ahora = ahora || ahoraTs();
  let j = p.juego;
  if (!j || typeof j !== 'object' || Array.isArray(j)) j = p.juego = {};
  const defecto = {
    monedas: 0, bolsas: BOLSAS_BIENVENIDA, omamori: 0, inventario: {}, colocados: [], abiertas: 0, desde_legendario: 0,
    misiones: { dia: null, cobradas: [], bolsa: false }, sesiones: [], gramatica_log: [], jefes: {}, combate: null,
    titulos: [], titulo: null, protegidos: [], omamori_dia: null, nivel_max: nivel(p.xp || 0),
    ultima_fin: inicioDia(ahora), creado: ahora,
  };
  for (const [k, v] of Object.entries(defecto)) if (!(k in j)) j[k] = v;
  if (j.curva !== CURVA) { j.curva = CURVA; j.nivel_max = nivel(p.xp || 0); }
  return j;
}

export function subirNivel(p, xpAntes) {
  p.xp = Math.min(p.xp || 0, XP_MAX);
  let j = p.juego;
  if (!j || typeof j !== 'object' || !('nivel_max' in j) || j.curva !== CURVA) { j = asegurar(p); j.nivel_max = nivel(xpAntes); }
  j = asegurar(p);
  const antes = nivel(xpAntes), despues = nivel(p.xp || 0);
  const tope = Math.max(j.nivel_max || 1, antes);
  const nuevos = []; for (let n = tope + 1; n <= despues; n++) nuevos.push(n);
  const conBolsa = nuevos.filter((n) => n % NIVELES_POR_BOLSA === 0);
  const ganadas = Math.min(BOLSAS_NIVEL_PETICION, conBolsa.length);
  const koban = KOBAN_POR_NIVEL * (nuevos.length - ganadas);
  j.bolsas += ganadas; j.monedas += koban; j.nivel_max = Math.max(tope, despues);
  return { nivel_antes: antes, nivel: despues, bolsas_ganadas: ganadas, koban_ganados: koban,
    falta_nivel_bolsa: ((NIVELES_POR_BOLSA - (despues % NIVELES_POR_BOLSA)) % NIVELES_POR_BOLSA) };
}

export function sinPremioDeNivel(p) { const j = asegurar(p); j.nivel_max = Math.max(j.nivel_max || 1, nivel(p.xp || 0)); }

// ───────────── combos ─────────────
const respuestas = (registro, desde = 0) => registro.filter((r) => (r.t || 0) > desde && r.era !== 'leccion');
export function mejorRacha(resp) {
  let mejor = 0, n = 0, tPrev = null;
  for (const r of resp) {
    if (tPrev !== null && r.t - tPrev > PAUSA_COMBO) n = 0;
    n = (r.g || 0) >= 2 ? n + 1 : 0;
    mejor = Math.max(mejor, n); tPrev = r.t;
  }
  return mejor;
}
export function comboActual(registro) {
  let n = 0, tPrev = null;
  for (let i = registro.length - 1; i >= 0; i--) {
    const r = registro[i];
    if (r.era === 'leccion') continue;
    if (tPrev !== null && tPrev - (r.t || 0) > PAUSA_COMBO) break;
    if ((r.g || 0) < 2) break;
    n++; tPrev = r.t || 0;
  }
  return n;
}

// ───────────── racha y omamori ─────────────
export function rachaDe(dias, protegidos, hoyIso) {
  const d = fecha(hoyIso);
  if (!dias[isoDe(d)]) d.setDate(d.getDate() - 1);
  let n = 0;
  for (;;) {
    const k = isoDe(d);
    if (dias[k]) n++;
    else if (!protegidos.has(k)) break;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export function mantener(p, dias, ahora = null) {
  ahora = ahora || ahoraTs();
  const j = asegurar(p, ahora), hoy = diaDe(ahora), prot = new Set(j.protegidos);
  let usados = [], faltan = [];
  const d = fecha(hoy); d.setDate(d.getDate() - 1);
  let completo = true;
  while (faltan.length <= 30) {
    const k = isoDe(d);
    if (dias[k] || prot.has(k)) { completo = false; break; }
    faltan.push(k); d.setDate(d.getDate() - 1);
  }
  if (completo) faltan = [];          // nada estudiado en un mes: no hay racha que salvar
  if (faltan.length && faltan.length <= j.omamori) {
    j.omamori -= faltan.length;
    j.protegidos = [...j.protegidos, ...faltan].slice(-400);
    faltan.forEach((k) => prot.add(k)); usados = faltan;
  }
  const n = rachaDe(dias, prot, hoy);
  let ganado = false;
  if (dias[hoy] && n && n % OMAMORI_CADA === 0 && j.omamori_dia !== hoy) { j.omamori += 1; j.omamori_dia = hoy; ganado = true; }
  return { racha: n, omamori_usados: usados, omamori_ganado: ganado };
}

// ───────────── misiones del día ─────────────
function planDelDia(dia) {
  const rng = conSemilla(`kotodama·misiones·${dia}`);
  const primera = rng.choice(['repasar', 'aprender']);
  const otras = rng.sample(Object.keys(MISIONES).filter((t) => t !== primera), 2);
  return [primera, ...otras].map((tipo) => { const [meta, recompensa] = rng.choice(MISIONES[tipo]); return { id: tipo, tipo, meta, recompensa }; });
}
function misionesDeHoy(j, dia) {
  const m = j.misiones;
  if (m.dia !== dia) Object.assign(m, { dia, cobradas: [], bolsa: false });
  return m;
}
function actividadDeHoy(p, j, ahora) {
  const hoy = inicioDia(ahora), resp = respuestas(p.registro || [], hoy - 0.001);
  const ses = Math.max(0, ...j.sesiones.filter((s) => (s.t || 0) >= hoy).map((s) => s.mejor_racha || 0));
  return {
    repasar: resp.length,
    aprender: Object.values(p.aprendidos || {}).filter((x) => x && typeof x === 'object' && x.de === 'leccion' && (x.t || 0) >= hoy).length,
    combo: Math.max(mejorRacha(resp), ses),
    rango: resp.filter((r) => 'r' in r && r.r > (r.r0 ?? 99)).length,
    gramatica: j.gramatica_log.filter((t) => t >= hoy).length,
  };
}
export function misiones(p, ahora = null) {
  ahora = ahora || ahoraTs();
  const j = asegurar(p, ahora), dia = diaDe(ahora), m = misionesDeHoy(j, dia), act = actividadDeHoy(p, j, ahora);
  return planDelDia(dia).map((x) => {
    const prog = act[x.tipo] || 0, [texto, pista] = textoMision(x.tipo, x.meta);
    return { id: x.id, tipo: x.tipo, texto, pista, progreso: Math.min(prog, x.meta), meta: x.meta, hecha: prog >= x.meta,
      cobrada: m.cobradas.includes(x.id), recompensa: x.recompensa };
  });
}
export function cobrarMision(p, datos, ahora = null) {
  ahora = ahora || ahoraTs();
  const j = asegurar(p, ahora), m = misionesDeHoy(j, diaDe(ahora)), iid = String(datos.id || '');
  const lista = misiones(p, ahora), mi = lista.find((x) => x.id === iid);
  if (!mi) throw new ErrorJuego('error.mision_no_es_de_hoy', 404);
  if (mi.cobrada) throw new ErrorJuego('error.mision_cobrada');
  if (!mi.hecha) throw new ErrorJuego('error.mision_falta', 400, { progreso: mi.progreso, meta: mi.meta });
  j.monedas += mi.recompensa; m.cobradas.push(iid);
  let bolsa = false;
  if (lista.every((x) => m.cobradas.includes(x.id)) && !m.bolsa) { j.bolsas += 1; m.bolsa = bolsa = true; }
  return { monedas: j.monedas, monedas_ganadas: mi.recompensa, bolsa_ganada: bolsa, bolsas: j.bolsas, misiones: misiones(p, ahora) };
}

// ───────────── bolsas, colección y tienda ─────────────
function darObjeto(j, o, ahora) {
  j.inventario[o.id] = { n: 1, t: ahora, nuevo: true };
  if (o.tipo === 'habitacion' && !j.colocados.includes(o.id)) j.colocados.push(o.id);
}
export function abrirBolsa(p, cat, ahora = null, rng = AZAR) {
  ahora = ahora || ahoraTs();
  const j = asegurar(p, ahora);
  if (j.bolsas <= 0) throw new ErrorJuego('error.sin_bolsas');
  const rarezas = cat.rarezas, garantia = parseInt(cat.garantia_legendario ?? 30, 10);
  j.bolsas -= 1; j.abiertas += 1; j.desde_legendario += 1;
  const garantizada = j.desde_legendario >= garantia;
  const claves = Object.keys(rarezas);
  const rareza = garantizada ? 'legendario' : rng.choices(claves, claves.map((k) => rarezas[k].peso || 0));
  let cands = cat.objetos.filter((o) => o.rareza === rareza); if (!cands.length) cands = cat.objetos;
  const inv = j.inventario;
  const o = rng.choices(cands, cands.map((c) => (c.id in inv ? 1 : 2)));
  if (o.rareza === 'legendario') j.desde_legendario = 0;
  const nuevo = !(o.id in inv);
  let monedas = 0;
  if (nuevo) darObjeto(j, o, ahora);
  else { inv[o.id].n = (inv[o.id].n || 1) + 1; monedas = parseInt((rarezas[o.rareza] || {}).monedas_duplicado || 0, 10); j.monedas += monedas; }
  return { objeto: ficha(o, cat), nuevo, monedas_ganadas: monedas, bolsas_restantes: j.bolsas, monedas: j.monedas, veces: inv[o.id].n,
    colocado: j.colocados.includes(o.id), garantizado: garantizada, legendario_en: garantia - j.desde_legendario,
    coleccion: { tienes: Object.keys(inv).length, total: cat.objetos.length } };
}
function unoDeCada(j, cat) {
  const vistos = new Set(), limpios = [];
  for (const x of j.colocados) {
    const t = (cat.por_id[x] || {}).tipo;
    if (UNO_A_LA_VEZ.includes(t)) { if (vistos.has(t)) continue; vistos.add(t); }
    limpios.push(x);
  }
  j.colocados = limpios;
}
const puesto = (j, cat, tipo) => j.colocados.find((x) => (cat.por_id[x] || {}).tipo === tipo) ?? null;
export function colocar(p, cat, datos) {
  const j = asegurar(p); unoDeCada(j, cat);
  const iid = String(datos.id || '');
  if (!(iid in cat.por_id)) throw new ErrorJuego('error.objeto_no_existe', 404);
  if (!(iid in j.inventario)) throw new ErrorJuego('error.objeto_no_lo_tienes');
  const poner = ![false, 0, 'false', '0', null].includes(datos.colocado ?? true);
  const tipo = cat.por_id[iid].tipo;
  if (poner && !j.colocados.includes(iid)) {
    if (UNO_A_LA_VEZ.includes(tipo)) j.colocados = j.colocados.filter((x) => (cat.por_id[x] || {}).tipo !== tipo);
    j.colocados.push(iid);
  } else if (!poner && j.colocados.includes(iid)) j.colocados.splice(j.colocados.indexOf(iid), 1);
  return { ok: true, colocados: [...j.colocados], ropa: puesto(j, cat, 'ropa'), accesorio: puesto(j, cat, 'accesorio'), aura: puesto(j, cat, 'aura') };
}
export function visto(p, datos) {
  const j = asegurar(p), ids = datos.ids;
  for (const [iid, x] of Object.entries(j.inventario)) if (ids == null || ids.includes(iid)) x.nuevo = false;
  return { ok: true };
}
export function tienda(p, datos) {
  const j = asegurar(p), art = String(datos.articulo || '');
  if (!(art in PRECIOS)) throw new ErrorJuego('error.tienda_articulo');
  const precio = PRECIOS[art];
  if (j.monedas < precio) throw new ErrorJuego('error.faltan_koban', 400, { n: precio - j.monedas });
  j.monedas -= precio; j[art === 'bolsa' ? 'bolsas' : 'omamori'] += 1;
  return { ok: true, monedas: j.monedas, bolsas: j.bolsas, omamori: j.omamori };
}

// ───────────── fin de sesión ─────────────
const entero = (datos, k) => { const n = parseInt(datos[k] || 0, 10); return Number.isFinite(n) ? Math.max(0, n) : 0; };
function notaDe(aciertos, resp) {
  if (!resp) return null;
  const x = aciertos / resp, notas = textosJuego().notas || {};
  for (const [tope, kanji] of [[0.95, '秀'], [0.85, '優'], [0.7, '良'], [0, '可']]) if (x >= tope) return { kanji, texto: notas[kanji] || kanji, pct: Math.round(x * 1000) / 1000 };
  return null;
}
export function sesionFin(p, datos, ahora = null) {
  ahora = ahora || ahoraTs();
  const j = asegurar(p, ahora), desde = j.ultima_fin || 0, registro = p.registro || [], resp = respuestas(registro, desde);
  const real = { respuestas: resp.length, aciertos: resp.filter((r) => (r.g || 0) >= 2).length, mejor_racha: mejorRacha(resp),
    lecciones: new Set(registro.filter((r) => (r.t || 0) > desde && r.era === 'leccion').map((r) => Math.round(r.t * 1000))).size,
    gramatica: j.gramatica_log.filter((t) => t > desde).length };
  const s = {};
  for (const [k, v] of Object.entries(real)) s[k] = datos[k] != null ? Math.min(entero(datos, k), v) : v;
  s.aciertos = Math.min(s.aciertos, s.respuestas); s.mejor_racha = Math.min(s.mejor_racha, s.aciertos);
  const ganadas = s.respuestas >= SESION_MIN_RESPUESTAS || s.lecciones >= 1 || s.gramatica >= 1 ? 1 : 0;
  j.bolsas += ganadas;
  if (s.respuestas || s.lecciones || s.gramatica) j.sesiones = [...j.sesiones, { ...s, t: ahora, bolsa: !!ganadas }].slice(-40);
  j.ultima_fin = ahora;
  return { bolsas_ganadas: ganadas, bolsas: j.bolsas, misiones: misiones(p, ahora), monedas: j.monedas, xp_total: p.xp || 0,
    sesion: s, nota: notaDe(s.aciertos, s.respuestas), falta_para_bolsa: ganadas ? 0 : SESION_MIN_RESPUESTAS - s.respuestas };
}
export function anotarGramatica(p, ahora = null) {
  ahora = ahora || ahoraTs();
  const j = asegurar(p, ahora);
  j.gramatica_log = [...j.gramatica_log.filter((t) => t > ahora - 3 * 86400), ahora];
}

// ───────────── jefes de región ─────────────
const vocabRegion = (c, i) => c.vocab.slice(i * c.PALABRAS_POR_REGION, (i + 1) * c.PALABRAS_POR_REGION);
function jefeDe(cat, i) {
  const jefes = cat.jefes, base = jefes[i % jefes.length], vuelta = Math.floor(i / jefes.length);
  return { id: base.id, nombre: base.nombre, jp: base.jp, desc: base.desc, vida: pyRound(base.vida * (1 + 0.5 * vuelta)), nivel: vuelta + 1, img: `img/jefes/${base.id}.svg` };
}
function tituloDe(cat, i, id = 'es') {
  const j = jefeDe(cat, i), t = textosJuego(id);
  const base = (t.titulos || {})[j.id] || rellenar((t.titulos || {}).generico || '{nombre}', { nombre: ((t.jefes || {})[j.id] || {}).nombre || j.nombre });
  return base + ROMANOS[Math.min(ROMANOS.length - 1, j.nivel - 1)];
}
function region(c, i) {
  if (!Number.isInteger(i) || i < 0 || i >= c.REGIONES.length) throw new ErrorJuego('error.region_no_existe', 404);
  return vocabRegion(c, i);
}
export function estadoJefe(p, c, cat, i) {
  const j = asegurar(p), vocab = region(c, i), total = vocab.length;
  const hechas = vocab.filter((v) => v.id in (p.aprendidos || {})).length;
  const necesarias = total ? Math.max(1, Math.ceil(UNLOCK_JEFE * total)) : 0;
  const e = j.jefes[String(i)] || {};
  return { ...jefeDe(cat, i), region: i, region_nombre: c.nombre_region(i), region_jp: c.REGIONES[i],
    desbloqueado: !!total && hechas >= necesarias, vencido: !!e.vencido,
    progreso: necesarias ? Math.round(Math.min(1, hechas / necesarias) * 1000) / 1000 : 0,
    aprendidas: hechas, total, necesarias, intentos: e.intentos || 0, victorias: e.victorias || 0, titulo: tituloTxt(tituloDe(cat, i)) };
}
export const jefes = (p, c, cat) => c.REGIONES.map((_, i) => estadoJefe(p, c, cat, i));

export function combate(p, c, cat, i, publico, rango, ahora = null, rng = AZAR) {
  ahora = ahora || ahoraTs();
  const j = asegurar(p, ahora), est = estadoJefe(p, c, cat, i);
  if (!est.desbloqueado) throw new ErrorJuego('error.jefe_dormido', 403, { n: est.necesarias, region: est.region_nombre, aprendidas: est.aprendidas, total: est.total });
  const aprendidos = p.aprendidos || {}, ids = [];
  const meter = (iid) => { if (iid && iid in aprendidos && iid in c.items && !ids.includes(iid)) ids.push(iid); };
  for (const v of vocabRegion(c, i)) {
    if (!(v.id in aprendidos)) continue;
    meter(v.id);
    for (const k of v.kanji || []) { meter(k); for (const pt of (c.items[k] || {}).partes || []) meter(pt.id); }
  }
  for (const paso of c.paso.slice(i * c.PALABRAS_POR_REGION, (i + 1) * c.PALABRAS_POR_REGION)) for (const iid of [...paso.radicales, ...paso.kanji]) meter(iid);
  let cands = ids.flatMap((iid) => c.items[iid].habilidades.map((h) => [iid, h]));
  const listos = cands.filter(([iid]) => c.items[iid].listo);
  if (listos.length >= PREGUNTAS_JEFE[0]) cands = listos;
  const pesoTipo = { vocab: 3.0, kanji: 2.0, radical: 1.0 };
  const n = Math.min(cands.length, rng.randint(...PREGUNTAS_JEFE));
  const conClave = cands.map((x) => {
    const [iid, h] = x, r = rango(p.mem[`${iid}:${h}`]);
    const w = (pesoTipo[c.items[iid].tipo] || 1.0) * (1 + 0.5 * (4 - Math.min(4, Math.max(0, r))));
    return [x, rng.random() ** (1 / w)];
  });
  const elegidas = rng.shuffle(conClave.sort((a, b) => b[1] - a[1]).slice(0, n).map((x) => x[0]));
  const preguntas = elegidas.map(([iid, h]) => ({ clave: `${iid}:${h}`, habilidad: h, rango: rango(p.mem[`${iid}:${h}`]), item: publico(c.items[iid], p) }));
  j.combate = { region: i, t: ahora, n: preguntas.length };
  const jefe = {}; for (const k of ['id', 'nombre', 'jp', 'desc', 'vida', 'nivel', 'img', 'region', 'region_nombre', 'region_jp', 'vencido', 'titulo']) jefe[k] = est[k];
  return { jefe, preguntas };
}

export function resultadoJefe(p, c, cat, i, datos, ahora = null, rng = AZAR) {
  ahora = ahora || ahoraTs();
  const j = asegurar(p, ahora); region(c, i);
  const cb = j.combate;
  if (!cb || cb.region !== i || ahora - (cb.t || 0) > 6 * 3600) throw new ErrorJuego('error.sin_batalla');
  j.combate = null;
  const respondidas = Math.min(entero(datos, 'total'), 200), declarados = Math.min(entero(datos, 'aciertos'), respondidas);
  const creible = ahora - (cb.t || 0) >= respondidas * SEG_POR_RESPUESTA;
  const ganado = [true, 1, 'true', '1'].includes(datos.ganado) && creible && declarados >= GOLPES_MIN_VICTORIA && respondidas - declarados <= FALLOS_MAX_VICTORIA;
  const total = Math.min(respondidas, cb.n || 0), aciertos = creible ? Math.min(declarados, total) : 0;
  const e = j.jefes[String(i)] = j.jefes[String(i)] || { vencido: false, intentos: 0, victorias: 0 };
  e.intentos = (e.intentos || 0) + 1;
  const hoy = diaDe(ahora);
  if (e.dia !== hoy) { e.dia = hoy; e.koban_dia = 0; }
  let objeto = null, titulo = null, primera = false, monedas = 0, tope = false;
  if (ganado) {
    e.victorias = (e.victorias || 0) + 1;
    if (!e.vencido) {
      primera = true; e.vencido = true; e.t = ahora;
      const faltan = cat.objetos.filter((o) => RAREZAS_JEFE.includes(o.rareza) && !(o.id in j.inventario));
      monedas = MONEDAS_JEFE;
      if (faltan.length) { const o = rng.choice(faltan); darObjeto(j, o, ahora); objeto = ficha(o, cat); } else monedas += MONEDAS_SI_TIENES_TODO;
      titulo = tituloDe(cat, i);
      if (!j.titulos.includes(titulo)) j.titulos.push(titulo);
      j.titulo = titulo;
    } else monedas = MONEDAS_JEFE_REVANCHA;
  } else monedas = aciertos;
  if (!primera) {
    const quedan = Math.max(0, MONEDAS_JEFE_DIA - (e.koban_dia || 0));
    tope = monedas > quedan; monedas = Math.min(monedas, quedan); e.koban_dia = (e.koban_dia || 0) + monedas;
  }
  j.monedas += monedas;
  return { recompensa: { objeto, monedas, titulo: tituloTxt(titulo), tope_diario: tope }, ganado, primera, monedas: j.monedas, aciertos, total };
}

// ───────────── resumen para la API ─────────────
export function resumen(p, c, cat, ahora = null) {
  ahora = ahora || ahoraTs();
  const j = asegurar(p, ahora); unoDeCada(j, cat);
  const inv = j.inventario;
  return {
    monedas: j.monedas, bolsas: j.bolsas, omamori: j.omamori,
    inventario: Object.entries(inv).map(([iid, x]) => ({ id: iid, n: x.n || 1, colocado: j.colocados.includes(iid), nuevo: !!x.nuevo })),
    catalogo: { rarezas: cat.rarezas, objetos: cat.objetos, garantia_legendario: cat.garantia_legendario ?? 30 },
    misiones: misiones(p, ahora), jefes: jefes(p, c, cat), colocados: [...j.colocados], ropa: puesto(j, cat, 'ropa'),
    coleccion: { tienes: Object.keys(inv).filter((iid) => iid in cat.por_id).length, total: cat.objetos.length },
    titulo: tituloTxt(j.titulo), titulos: j.titulos.map(tituloTxt), precios: PRECIOS,
    legendario_en: parseInt(cat.garantia_legendario ?? 30, 10) - j.desde_legendario, abiertas: j.abiertas, nivel: nivel(p.xp || 0),
  };
}
export function paraInicio(p, ahora = null) {
  const j = asegurar(p, ahora), lista = misiones(p, ahora);
  return { monedas: j.monedas, bolsas: j.bolsas, omamori: j.omamori, titulo: tituloTxt(j.titulo), misiones: lista,
    misiones_hechas: lista.filter((x) => x.hecha).length, misiones_cobradas: lista.filter((x) => x.cobrada).length,
    misiones_total: lista.length, nivel: nivel(p.xp || 0) };
}
