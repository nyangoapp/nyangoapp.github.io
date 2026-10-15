// ニャン語 Nyango · unir el progreso de varios aparatos (el móvil y el ordenador). Sin red, sin cifrado y sin navegador: solo
// datos. Es el hermano en JS de nucleo/sincro.py (que se escribió para otro transporte, la carpeta de medios de Anki) y sigue
// sus mismas ideas sobre el modelo de progreso de web/js/motor/servidor.js.
//
// CÓMO FUNCIONA
//  · Cada aparato guarda un estado propio S (enlace.json, nunca dentro de progreso.json) con su id, la «foto» del último
//    progreso que vio y las marcas CRDT de lo que él ha cambiado: contadores PN, registros «el último gana» (t, aparato),
//    conjuntos con marcas de alta y baja, y lápidas de lo que se ha borrado a propósito.
//  · Cada aparato sube SOLO su documento (S + el contenido de su progreso) y baja los de los demás. Un documento lleva todo lo que
//    ese aparato sabe (incluido lo absorbido de otros), así que unir es un «join»: conmutativo, asociativo e idempotente.
//    El progreso que se ve es una proyección de esa unión: da lo mismo en qué orden se unan y repetirlo no cambia nada.
//
// REGLAS POR CAMPO (P = el progreso)
//  campo                              regla
//  ---------------------------------  ------------------------------------------------------------------------------------
//  mem[clave]                         gana la que tiene la marca más reciente (max de ultima/anadida); empate: más reps, luego
//                                     el texto canónico. Borrar a propósito (quitar fichas, deshacer prueba de nivel) deja una
//                                     lápida [t, aparato]: la tarjeta existe si su marca es posterior a la lápida.
//  aprendidos[id]                     la más antigua entre las vivas (t mínimo); lápida igual que mem (deshacer prueba de nivel).
//  registro[]                         unión sin duplicados por (t, id), menos las lápidas (corregir), ordenado por (t, id).
//                                     Lo anterior a 60 días no se conserva: pasa a dias_archivados.
//  dias_archivados{día: n}            máximo por día entre aparatos, y las entradas viejas del registro unido cuentan (máximo,
//                                     no suma: no se cuenta dos veces lo que otro ya archivó).
//  xp                                 contador PN por aparato (+ herencia, que cuenta una sola vez). Nunca baja de 0.
//  juego.monedas/bolsas/omamori/      contadores PN (pueden bajar: se gastan). Nunca negativos.
//   abiertas/desde_legendario
//  juego.inventario[id]               n: contador PN · t: mínimo · nuevo: último gana
//  juego.jefes[i]                     intentos y victorias: contadores PN · vencido: O · t: mínimo · (dia, koban_dia): el mayor
//  juego.colocados/titulos/protegidos conjuntos con marcas de alta y baja (gana la marca más reciente); orden por alta
//  juego.misiones                     por día: cobradas = unión, bolsa = O; se ve el último día
//  juego.sesiones / gramatica_log     unión por t (sesiones: las últimas 40; gramatica_log: los últimos 3 días)
//  juego.nivel_max/ultima_fin/        máximo
//   omamori_dia/curva
//  juego.creado, creado               mínimo
//  juego.titulo y claves nuevas       último gana
//  juego.combate                      solo local (la batalla que tienes abierta)
//  gramatica[slug], clases[id],       la última hecha manda (t, aciertos, total, nota); mejor = máximo; primera = mínimo;
//   lecturas[id]                      intentos / veces: contador PN
//  gramatica_vista[slug]              mínimo (la primera vez que la viste)
//  kana[ch]                           b y m: contadores PN · n y t: los de la marca más reciente · lápida al deshacer la prueba
//  ajustes.*                          último gana, campo a campo; SOLO LOCAL: idioma, sonido, autoplay, musica, vol_*
//  mochi.nombre, sitios… (y claves    último gana, campo a campo
//   nuevas)
//  mochi.quitado                      conjunto con marcas · mochi.equipo_visto: máximo · mochi.ensenadas: contador PN
//  mochi.ensenadas_dia/ensenadas_hoy  último gana, juntos
//  perfil.*                           último gana, campo a campo
//  herencia                           cobrada = O; su XP se cuenta una sola vez (la primera reclamación)
//  nyan_sabe                          conjunto (solo altas) con marcas; orden por alta
//  nyan_diario[]                      unión por t, las últimas 30
//  tiempo                             total y dias[día]: contadores PN · desde: mínimo · previo: máximo
//  version_datos                      máximo
//  historial_anki                     solo local
//  cualquier otro campo (de una       último gana, entero
//   versión nueva)
//
// Contadores PN: por aparato y ruta, una fila [base, subidas, bajadas, linaje]. total = suma, por linaje, del mayor base + las
// subidas − las bajadas de todos. «Linaje» = el creado del progreso cuando se enlazó: dos aparatos con el mismo linaje partían
// de la misma copia (cuenta el mayor, no la suma); con linajes distintos eran progresos independientes (se suman). Un aparato
// sin estudio alguno al enlazar entra con base 0: no aporta nada.
import { diaDe } from './fsrs.js';

export const VERSION_DOC = 1;
const DIAS_REGISTRO = 60, SESIONES_MAX = 40, DIARIO_MAX = 30, GRAMATICA_LOG = 3 * 86400, MISIONES_DIAS = 7, LAPIDA_REGISTRO = 90 * 86400;
const CONT_JUEGO = ['monedas', 'bolsas', 'omamori', 'abiertas', 'desde_legendario'];
const BAJABLES = new Set(['monedas', 'bolsas', 'omamori', 'desde_legendario']);   // los demás contadores solo suben
const MAX_JUEGO = ['nivel_max', 'ultima_fin', 'omamori_dia', 'curva'];
const CONJ_JUEGO = ['colocados', 'titulos', 'protegidos'];
const NOMBRES_CONJ = ['colocados', 'titulos', 'protegidos', 'nyan_sabe', 'quitado'];
const COLECCIONES = ['mem', 'aprendidos', 'registro', 'kana'];
export const AJUSTES_LOCALES = ['idioma', 'tema', 'sonido', 'autoplay', 'musica', 'vol_musica', 'vol_efectos', 'vol_voz'];
const MOCHI_APARTE = ['ensenadas', 'ensenadas_dia', 'ensenadas_hoy', 'quitado', 'equipo_visto'];
const TOP = new Set(['mem', 'aprendidos', 'registro', 'xp', 'gramatica', 'gramatica_vista', 'ajustes', 'mochi', 'herencia', 'creado', 'juego', 'dias_archivados',
  'historial_anki', 'perfil', 'clases', 'lecturas', 'tiempo', 'kana', 'nyan_sabe', 'nyan_diario', 'version_datos']);
const JUEGO = new Set(['inventario', 'misiones', 'sesiones', 'gramatica_log', 'jefes', 'combate', 'titulo', 'creado', ...CONT_JUEGO, ...MAX_JUEGO, ...CONJ_JUEGO]);
/** Campos que cada aparato conserva como están (no viajan) */
export const SOLO_LOCAL = ['historial_anki', 'juego.combate', ...AJUSTES_LOCALES.map((k) => 'ajustes.' + k)];

// ───────────── utilidades ─────────────
const esObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
const num = (v) => typeof v === 'number' && Number.isFinite(v);
const D = (v) => (esObj(v) ? v : {});
const L = (v) => (Array.isArray(v) ? v : []);
const copia = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
export function canon(v) {
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  if (esObj(v)) return '{' + Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
  return JSON.stringify(v) ?? 'null';
}
export const iguales = (a, b) => canon(a) === canon(b);
export const ruta = (...p) => JSON.stringify(p);
const R_XP = ruta('xp');
const cmpTxt = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
/** compara dos listas de claves (números o textos) */
function cmp(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i], y = b[i];
    if (x === y) continue;
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    if (typeof x === typeof y) return x < y ? -1 : 1;
    return typeof x === 'number' ? -1 : 1;
  }
  return 0;
}
/** El que gana según clave(); en empate decide el texto canónico: da igual en qué orden lleguen */
function elige(a, b, clave, menor = false) {
  let c = cmp(clave(a), clave(b));
  if (c === 0) c = cmpTxt(canon(a), canon(b));
  return menor ? (c <= 0 ? a : b) : (c >= 0 ? a : b);
}
const minimo = (a, b) => (a == null ? b : b == null ? a : Math.min(a, b));
const ordenV = (v) => (v == null ? [0, 0] : num(v) ? [1, v] : typeof v === 'string' ? [2, v] : [3, canon(v)]);
const maximoV = (a, b) => (cmp(ordenV(a), ordenV(b)) >= 0 ? a : b);
const mayorMarca = (a, b) => (a == null ? b : b == null ? a : cmp([a[0], a[1]], [b[0], b[1]]) >= 0 ? a : b);
const marca = (v) => (Array.isArray(v) && v.length === 2 && num(v[0]) && typeof v[1] === 'string' ? [v[0], v[1]] : null);
const suma = (xs) => xs.reduce((a, b) => a + b, 0);
function poner(raiz, partes, valor) {
  let o = raiz;
  for (const k of partes.slice(0, -1)) { if (!esObj(o[k])) o[k] = {}; o = o[k]; }
  o[partes[partes.length - 1]] = valor;
}

// ───────────── lo que se mira de un progreso ─────────────
/** Campos que se suman como contador por aparato: {ruta: valor} */
export function contadores(p) {
  const c = {}, j = D(p.juego), t = D(p.tiempo);
  if (num(p.xp)) c[R_XP] = p.xp;
  for (const k of CONT_JUEGO) if (num(j[k])) c[ruta('juego', k)] = j[k];
  for (const [x, e] of Object.entries(D(j.inventario))) if (num(D(e).n)) c[ruta('juego', 'inventario', x, 'n')] = e.n;
  for (const [i, e] of Object.entries(D(j.jefes))) for (const k of ['intentos', 'victorias']) if (num(D(e)[k])) c[ruta('juego', 'jefes', i, k)] = e[k];
  for (const [coleccion, campo] of [['gramatica', 'intentos'], ['clases', 'intentos'], ['lecturas', 'veces']]) {
    for (const [id, e] of Object.entries(D(p[coleccion]))) if (num(D(e)[campo])) c[ruta(coleccion, id, campo)] = e[campo];
  }
  for (const [ch, e] of Object.entries(D(p.kana))) for (const k of ['b', 'm']) if (num(D(e)[k])) c[ruta('kana', ch, k)] = e[k];
  if (num(D(p.mochi).ensenadas)) c[ruta('mochi', 'ensenadas')] = p.mochi.ensenadas;
  if (num(t.total)) c[ruta('tiempo', 'total')] = t.total;
  for (const [dia, s] of Object.entries(D(t.dias))) if (num(s)) c[ruta('tiempo', 'dias', dia)] = s;
  return c;
}

/** Campos «el último que escribe gana», uno a uno: {ruta: valor} */
export function simples(p) {
  const s = {}, j = D(p.juego);
  for (const [k, v] of Object.entries(D(p.ajustes))) if (!AJUSTES_LOCALES.includes(k)) s[ruta('ajustes', k)] = v;
  const m = D(p.mochi);
  for (const [k, v] of Object.entries(m)) if (!MOCHI_APARTE.includes(k)) s[ruta('mochi', k)] = v;
  if (typeof m.ensenadas_dia === 'string') s[ruta('mochi', '@hoy')] = [m.ensenadas_dia, num(m.ensenadas_hoy) ? m.ensenadas_hoy : 0];
  for (const [k, v] of Object.entries(D(p.perfil))) s[ruta('perfil', k)] = v;
  for (const [x, e] of Object.entries(D(j.inventario))) if (esObj(e) && 'nuevo' in e) s[ruta('juego', 'inventario', x, 'nuevo')] = !!e.nuevo;
  for (const [k, v] of Object.entries(p)) if (!TOP.has(k) && v !== undefined) s[ruta(k)] = v;
  for (const [k, v] of Object.entries(j)) if ((!JUEGO.has(k) || k === 'titulo') && v !== undefined) s[ruta('juego', k)] = v;
  return s;
}

/** Listas que se tratan como conjuntos: {nombre: [elementos]} */
export function conjuntos(p) {
  const j = D(p.juego), s = {};
  const lista = (x) => [...new Set(L(x).filter((e) => typeof e === 'string'))];
  for (const k of CONJ_JUEGO) if (Array.isArray(j[k])) s[k] = lista(j[k]);
  if (Array.isArray(p.nyan_sabe)) s.nyan_sabe = lista(p.nyan_sabe);
  if (Array.isArray(D(p.mochi).quitado)) s.quitado = lista(p.mochi.quitado);
  return s;
}

const claveReg = (e) => `${e.t}|${e.id ?? ''}`;
const entradasRegistro = (p) => L(p.registro).filter((e) => esObj(e) && num(e.t));
const sellos = (p) => [...L(p.nyan_diario), ...L(D(p.juego).sesiones)].filter((e) => esObj(e) && num(e.t));

/** Último momento con estudio (o -1): la marca de los campos «último gana» de un progreso que ya existía antes de enlazar */
function actividad(p) {
  const ts = entradasRegistro(p).map((e) => e.t);
  for (const m of Object.values(D(p.mem))) if (esObj(m) && num(m.ultima)) ts.push(m.ultima);
  for (const a of Object.values(D(p.aprendidos))) if (esObj(a) && num(a.t)) ts.push(a.t);
  return ts.length ? Math.max(...ts) : -1;
}
/** Un progreso en el que no se ha estudiado nada (el de un móvil recién instalado) */
export function esVirgen(p) {
  const j = D(p.juego);
  return !Object.keys(D(p.mem)).length && !Object.keys(D(p.aprendidos)).length && !entradasRegistro(p).length && !(num(p.xp) && p.xp > 0)
    && !Object.keys(D(p.gramatica)).length && !Object.keys(D(p.clases)).length && !Object.keys(D(p.lecturas)).length && !Object.keys(D(p.kana)).length
    && !Object.keys(D(p.dias_archivados)).length && !L(p.nyan_sabe).length && !(num(j.monedas) && j.monedas > 0) && !(num(j.abiertas) && j.abiertas > 0)
    && !Object.keys(D(j.inventario)).length;
}

export function fotoDe(p) {
  return copia({ cont: contadores(p), lww: simples(p), conj: conjuntos(p), her: !!D(p.herencia).cobrada, n_mem: Object.keys(D(p.mem)).length });
}

// ───────────── contenido: se une por su valor ─────────────
const marcaMem = (m) => Math.max(num(m.ultima) ? m.ultima : 0, num(m.anadida) ? m.anadida : 0);
const claveMem = (m) => [marcaMem(m), num(m.reps) ? m.reps : 0];
const marcaT = (a) => (num(a.t) ? a.t : 0);
const sinCampos = (mapa, quitar) => Object.fromEntries(Object.entries(D(mapa)).filter(([, e]) => esObj(e)).map(([k, e]) => [k, Object.fromEntries(Object.entries(e).filter(([x]) => !quitar.includes(x)))]));
const mapaPor = (lista, f) => { const m = {}; for (const e of lista) { const k = f(e); m[k] = k in m ? elige(m[k], e, () => [0], true) : e; } return m; };

/** El contenido de un progreso, ya normalizado (campo a campo, sin fiarse de nada) */
export function normContenido(c) {
  c = D(c);
  const numOrNull = (v) => (num(v) ? v : null);
  const jefes = {};
  for (const [i, e] of Object.entries(D(c.jefes))) {
    if (!esObj(e)) continue;
    jefes[i] = { vencido: !!e.vencido, t: numOrNull(e.t), dia: typeof e.dia === 'string' ? e.dia : null, koban_dia: num(e.koban_dia) ? e.koban_dia : 0 };
  }
  const max = {};
  for (const [k, v] of Object.entries(D(c.max))) if (v === null || num(v) || typeof v === 'string') max[k] = v;
  const min = {};
  for (const [k, v] of Object.entries(D(c.min))) if (num(v)) min[k] = v;
  const porT = (m) => Object.fromEntries(Object.entries(D(m)).filter(([, e]) => esObj(e) && num(e.t)));
  return {
    mem: Object.fromEntries(Object.entries(D(c.mem)).filter(([, m]) => esObj(m))),
    aprendidos: Object.fromEntries(Object.entries(D(c.aprendidos)).filter(([, a]) => esObj(a))),
    registro: porT(c.registro),
    gramatica: sinCampos(c.gramatica, []), clases: sinCampos(c.clases, []), lecturas: sinCampos(c.lecturas, []), kana: sinCampos(c.kana, []),
    gramatica_vista: Object.fromEntries(Object.entries(D(c.gramatica_vista)).filter(([, t]) => num(t))),
    diario: porT(c.diario), sesiones: porT(c.sesiones),
    glog: Object.fromEntries(Object.entries(D(c.glog)).filter(([, t]) => num(t))),
    dias: Object.fromEntries(Object.entries(D(c.dias)).filter(([, n]) => num(n))),
    max, min, jefes,
    inventario: Object.fromEntries(Object.entries(D(c.inventario)).map(([x, t]) => [x, numOrNull(t)])),
  };
}

export function contenido(p) {
  const j = D(p.juego), t = D(p.tiempo), m = D(p.mochi);
  const max = {}, min = {};
  for (const k of MAX_JUEGO) if (k in j) max['juego.' + k] = j[k];
  if (num(p.version_datos)) max.version_datos = p.version_datos;
  if (num(m.equipo_visto)) max['mochi.equipo_visto'] = m.equipo_visto;
  if (num(t.previo)) max['tiempo.previo'] = t.previo;
  if (num(p.creado)) min.creado = p.creado;
  if (num(j.creado)) min['juego.creado'] = j.creado;
  if (typeof t.desde === 'string') max['tiempo.desde_txt'] = t.desde;   // (se une con el mínimo, no con el máximo: ver unirC)
  const diario = L(p.nyan_diario).filter((e) => esObj(e) && num(e.t)), ses = L(j.sesiones).filter((e) => esObj(e) && num(e.t));
  return normContenido({
    mem: p.mem, aprendidos: p.aprendidos, registro: mapaPor(entradasRegistro(p), claveReg),
    gramatica: sinCampos(p.gramatica, ['intentos']), clases: sinCampos(p.clases, ['intentos']), lecturas: sinCampos(p.lecturas, ['veces']),
    kana: sinCampos(p.kana, ['b', 'm']), gramatica_vista: p.gramatica_vista,
    diario: mapaPor(diario, (e) => String(e.t)), sesiones: mapaPor(ses, (e) => String(e.t)),
    glog: Object.fromEntries(L(j.gramatica_log).filter(num).map((x) => [String(x), x])), dias: p.dias_archivados,
    max, min,
    jefes: Object.fromEntries(Object.entries(D(j.jefes)).map(([i, e]) => [i, D(e)])),
    inventario: Object.fromEntries(Object.entries(D(j.inventario)).filter(([, e]) => esObj(e)).map(([x, e]) => [x, e.t])),
  });
}

function unirRegistro(x, y, menores = ['primera'], mayores = ['mejor']) {
  const sin = (e) => Object.fromEntries(Object.entries(e).filter(([k]) => ![...menores, ...mayores].includes(k)));
  const r = { ...elige(x, y, (e) => [marcaT(e), canon(sin(e))]) };
  for (const [lista, f] of [[mayores, Math.max], [menores, Math.min]]) {
    for (const k of lista) { const vals = [x, y].map((e) => e[k]).filter(num); if (vals.length) r[k] = f(...vals); }
  }
  return r;
}
function porClave(a, b, f) {
  const r = { ...a };
  for (const [k, v] of Object.entries(b)) r[k] = k in r ? f(r[k], v, k) : v;
  return r;
}
/** Unión de dos contenidos (un semirretículo: da igual el orden y repetirla) */
export function unirC(a, b) {
  const jefes = {};
  for (const k of new Set([...Object.keys(a.jefes), ...Object.keys(b.jefes)])) {
    const x = a.jefes[k], y = b.jefes[k];
    if (!x || !y) { jefes[k] = { ...(x || y) }; continue; }
    const mejor = cmp([y.dia || '', y.koban_dia], [x.dia || '', x.koban_dia]) > 0 ? y : x;
    jefes[k] = { vencido: x.vencido || y.vencido, t: minimo(x.t, y.t), dia: mejor.dia, koban_dia: mejor.koban_dia };
  }
  const canonMenor = (x, y) => elige(x, y, () => [0], true);
  return {
    mem: porClave(a.mem, b.mem, (x, y) => elige(x, y, claveMem)),
    aprendidos: porClave(a.aprendidos, b.aprendidos, (x, y) => elige(x, y, (e) => [marcaT(e) || Infinity], true)),
    registro: porClave(a.registro, b.registro, canonMenor),
    gramatica: porClave(a.gramatica, b.gramatica, (x, y) => unirRegistro(x, y)),
    clases: porClave(a.clases, b.clases, (x, y) => unirRegistro(x, y)),
    lecturas: porClave(a.lecturas, b.lecturas, (x, y) => unirRegistro(x, y)),
    kana: porClave(a.kana, b.kana, (x, y) => elige(x, y, (e) => [marcaT(e)])),
    gramatica_vista: porClave(a.gramatica_vista, b.gramatica_vista, (x, y) => Math.min(x, y)),
    diario: porClave(a.diario, b.diario, canonMenor), sesiones: porClave(a.sesiones, b.sesiones, canonMenor),
    glog: { ...a.glog, ...b.glog },
    dias: porClave(a.dias, b.dias, (x, y) => Math.max(x, y)),
    max: porClave(a.max, b.max, (x, y, k) => (k === 'tiempo.desde_txt' ? (x < y ? x : y) : maximoV(x, y))), min: porClave(a.min, b.min, (x, y) => Math.min(x, y)),
    jefes, inventario: porClave(a.inventario, b.inventario, minimo),
  };
}
const contenidoVacio = () => normContenido({});

// ───────────── lápidas ─────────────
const estampa = {
  mem: marcaMem, aprendidos: marcaT, registro: (e) => e.t, kana: marcaT,
};
/** El contenido sin lo que tiene lápida más nueva que su marca */
function sinBorrados(c, bor) {
  const r = { ...c };
  for (const col of COLECCIONES) {
    const lapidas = D(bor[col]);
    if (!Object.keys(lapidas).length) continue;
    const origen = col === 'registro' ? c.registro : c[col];
    r[col] = Object.fromEntries(Object.entries(origen).filter(([k, e]) => !(k in lapidas) || estampa[col](e) > lapidas[k][0]));
  }
  return r;
}

// ───────────── contadores ─────────────
/** Total de un contador: por linaje, el mayor base; más las subidas menos las bajadas de todos. null si nadie lo cuenta */
export function total(S, r) {
  const fila = S.pn[r];
  if (!fila) return null;
  const bases = {};
  let resto = 0;
  for (const x of Object.values(fila)) {
    bases[x[3]] = Math.max(bases[x[3]] ?? -Infinity, x[0]);
    resto += x[1] - x[2];
  }
  return suma(Object.values(bases)) + resto;
}

// ───────────── el estado propio ─────────────
export function estadoNuevo(disp, nombre) {
  return { formato: 1, disp, nombre: nombre || null, linaje: null, pn: {}, lww: {}, conj: {}, bor: {}, mis: {}, her: null,
    foto: null, conocidos: {}, vistos: {}, rescate: false };
}
const marcarConj = (fila, e, lado, m) => { const x = (fila[e] ??= [null, null]); x[lado] = mayorMarca(x[lado], m); };
/** Instante para una marca nueva: nunca anterior a lo que ya conozco de ese campo (así lo último que hago siempre gana aquí) */
const despues = (ahora, previo) => (previo == null ? ahora : Math.max(ahora, previo + 0.001));
const elegirHer = (a, b) => (a == null ? b : b == null ? a : elige(a, b, (x) => [x.t, x.id], true));

function anotarMisiones(S, p) {
  const m = D(D(p.juego).misiones);
  if (typeof m.dia !== 'string') return;
  const x = (S.mis[m.dia] ??= { c: [], b: false });
  x.c = [...new Set([...x.c, ...L(m.cobradas).filter((c) => typeof c === 'string')])].sort();
  x.b = !!(x.b || m.bolsa);
  for (const viejo of Object.keys(S.mis).sort().slice(0, -MISIONES_DIAS)) delete S.mis[viejo];
}

/** Primera vez que este aparato se enlaza: lo que ya había es el punto de partida */
export function base(S, p, ahora, ctx = {}) {
  const virgen = esVirgen(p), t0 = virgen ? -1 : actividad(p);
  S.linaje = num(p.creado) ? String(p.creado) : 'x' + S.disp;
  for (const [r, v] of Object.entries(contadores(p))) { const fila = (S.pn[r] ??= {}); fila[S.disp] ??= [virgen ? 0 : v, 0, 0, S.linaje]; }
  const defecto = ctx.defecto ? simples(ctx.defecto) : {};
  for (const [r, v] of Object.entries(simples(p))) {
    const t = virgen || (r in defecto && iguales(defecto[r], v)) ? -1 : t0;   // lo que está como viene de fábrica pierde contra cualquier cambio de otro
    const viejo = S.lww[r];
    S.lww[r] = viejo ? elige(viejo, [copia(v), t, S.disp], (x) => [x[1], x[2]]) : [copia(v), t, S.disp];
  }
  for (const [nombre, elems] of Object.entries(conjuntos(p))) {
    const fila = (S.conj[nombre] ??= {});
    elems.forEach((e, i) => marcarConj(fila, e, 0, [t0 + i / 1000, S.disp]));   // un milisegundo entre uno y otro: se conserva el orden
  }
  anotarMisiones(S, p);
  const h = D(p.herencia);
  if (h.cobrada) S.her = elegirHer(S.her, { t: 0, id: S.disp, xp: 0, repasos: h.repasos ?? null, items: h.items ?? null });   // su XP ya va dentro del inicial
  S.foto = fotoDe(p);
}

/** Apunta lo que ha cambiado este aparato desde la foto: contadores, marcas «último gana» y altas/bajas de conjuntos.
 *  → true si algo cambió. Barato: se llama con cada guardado. */
export function anotar(S, p, ahora, ctx = {}) {
  const f = S.foto;
  if (!f) { base(S, p, ahora, ctx); return true; }
  const cont = contadores(p), fc = D(f.cont), fl = D(f.lww), fco = D(f.conj);
  if ((fc[R_XP] ?? 0) - (cont[R_XP] ?? 0) > 1 || (f.n_mem > 0 && !Object.keys(D(p.mem)).length)) {
    // el juego solo baja 1 XP (corregir): esto es una copia vieja o un progreso vacío. No es gasto ni borrado: la foto pasa a esta
    // vista sin apuntar nada, y la próxima unión (con lo que haya en el servidor) lo devuelve
    S.foto = fotoDe(p); S.rescate = true;
    return true;
  }
  let cambio = false, xpH = 0;
  const h = D(p.herencia);
  if (h.cobrada && !f.her) {   // la herencia se cobra una sola vez en total: su XP va aparte
    const formula = Math.trunc(num(h.repasos) ? h.repasos : 0) + 15 * Math.trunc(num(h.items) ? h.items : 0);
    xpH = Math.max(0, Math.min(formula, (cont[R_XP] ?? 0) - (fc[R_XP] ?? 0)));
    S.her = elegirHer(S.her, { t: ahora, id: S.disp, xp: xpH, repasos: h.repasos ?? null, items: h.items ?? null });
    cambio = true;
  }
  for (const [r, v] of Object.entries(cont)) {
    let dif = v - (fc[r] ?? 0) - (r === R_XP ? xpH : 0);
    const k = JSON.parse(r);
    const baja = BAJABLES.has(k[1]) && k[0] === 'juego' && k.length === 2;
    if (dif < 0 && !baja && !(r === R_XP && dif >= -1)) dif = 0;   // un contador que solo sube y baja de golpe no es un gasto
    if (!dif) continue;
    const x = ((S.pn[r] ??= {})[S.disp] ??= [0, 0, 0, S.linaje]);
    x[dif > 0 ? 1 : 2] += Math.abs(dif);
    cambio = true;
  }
  for (const [r, v] of Object.entries(simples(p))) {
    if (r in fl && iguales(fl[r], v)) continue;
    const viejo = S.lww[r];
    S.lww[r] = [copia(v), despues(ahora, viejo?.[1]), S.disp];
    cambio = true;
  }
  for (const [nombre, elems] of Object.entries(conjuntos(p))) {
    const antes = new Set(fco[nombre] ?? []), ya = new Set(elems);
    const altas = elems.filter((e) => !antes.has(e)), bajas = [...antes].filter((e) => !ya.has(e));
    const fila = (S.conj[nombre] ??= {});
    if (!altas.length && !bajas.length) continue;
    let tope = -Infinity;
    for (const x of Object.values(fila)) for (const m of x) if (m && m[0] > tope) tope = m[0];
    const t = despues(ahora, Number.isFinite(tope) ? tope : null);
    for (const e of altas) marcarConj(fila, e, 0, [t, S.disp]);
    for (const e of bajas) marcarConj(fila, e, 1, [t, S.disp]);
    cambio = true;
  }
  anotarMisiones(S, p);
  const nueva = fotoDe(p);
  for (const k of ['cont', 'lww', 'conj']) nueva[k] = { ...f[k], ...nueva[k] };   // lo que desaparece de la vista no se da por gastado
  if (!iguales(nueva, f)) { S.foto = nueva; cambio = true; }
  return cambio;
}

/** Borrado a propósito de una clave (coleccion: mem, aprendidos, registro o kana) */
export function borrado(S, coleccion, clave, ahora) {
  if (!COLECCIONES.includes(coleccion)) return;
  const fila = ((S.bor[coleccion] ??= {}));
  fila[clave] = mayorMarca(fila[clave], [ahora, S.disp]);
}
export const claveRegistro = claveReg;

// ───────────── documentos ─────────────
/** El documento que sube este aparato: todo lo que sabe */
export function armarDoc(S, p, ahora) {
  return { v: VERSION_DOC, disp: S.disp, nombre: S.nombre, t: ahora, pn: S.pn, lww: S.lww, conj: S.conj, bor: S.bor, mis: S.mis, her: S.her, contenido: contenido(p) };
}
/** Lo que se compara para saber si hace falta subir otra vez (sin la hora) */
export const huellaDoc = (doc) => canon({ ...doc, t: 0 });

const filaValida = (x) => Array.isArray(x) && x.length === 4 && num(x[0]) && num(x[1]) && num(x[2]) && typeof x[3] === 'string';
/** Un documento de fuera, comprobado campo a campo: uno raro no rompe la unión */
export function limpiarDoc(x) {
  if (!esObj(x) || !/^[0-9a-f]{8}$/.test(String(x.disp)) || !(x.v >= 1)) return null;
  const pn = {};
  for (const [r, fila] of Object.entries(D(x.pn))) {
    const buenas = {};
    for (const [d, v] of Object.entries(D(fila))) if (/^[0-9a-f]{8}$/.test(d) && filaValida(v)) buenas[d] = [...v];
    if (Object.keys(buenas).length) pn[r] = buenas;
  }
  const lww = {};
  for (const [r, v] of Object.entries(D(x.lww))) if (Array.isArray(v) && v.length === 3 && v[0] !== undefined && num(v[1]) && typeof v[2] === 'string') lww[r] = [v[0], v[1], v[2]];
  const conj = {};
  for (const [n, fila] of Object.entries(D(x.conj))) {
    if (!NOMBRES_CONJ.includes(n)) continue;
    conj[n] = Object.fromEntries(Object.entries(D(fila)).filter(([, v]) => Array.isArray(v) && v.length === 2).map(([e, v]) => [e, [marca(v[0]), marca(v[1])]]));
  }
  const bor = {};
  for (const col of COLECCIONES) bor[col] = Object.fromEntries(Object.entries(D(D(x.bor)[col])).map(([k, v]) => [k, marca(v)]).filter(([, v]) => v));
  const mis = {};
  for (const [dia, m] of Object.entries(D(x.mis))) if (esObj(m)) mis[dia] = { c: L(m.c).filter((c) => typeof c === 'string'), b: !!m.b };
  const h = x.her;
  const her = esObj(h) && num(h.t) && typeof h.id === 'string' && num(h.xp) ? { t: h.t, id: h.id, xp: h.xp, repasos: h.repasos ?? null, items: h.items ?? null } : null;
  return { disp: x.disp, nombre: typeof x.nombre === 'string' ? x.nombre.slice(0, 40) : null, t: num(x.t) ? x.t : null, pn, lww, conj, bor, mis, her, contenido: normContenido(x.contenido) };
}

/** Mete en S todo lo que sabe un documento ajeno (unión de marcas; nunca baja nada) */
function absorber(S, r) {
  for (const [rt, fila] of Object.entries(r.pn)) {
    const mia = (S.pn[rt] ??= {});
    for (const [d, x] of Object.entries(fila)) mia[d] = d in mia ? [Math.max(mia[d][0], x[0]), Math.max(mia[d][1], x[1]), Math.max(mia[d][2], x[2]), mia[d][3]] : [...x];
  }
  for (const [rt, x] of Object.entries(r.lww)) S.lww[rt] = rt in S.lww ? elige(S.lww[rt], x, (y) => [y[1], y[2]]) : x;
  for (const [n, fila] of Object.entries(r.conj)) {
    const mia = (S.conj[n] ??= {});
    for (const [e, [alta, baja]] of Object.entries(fila)) { marcarConj(mia, e, 0, alta); marcarConj(mia, e, 1, baja); }
  }
  for (const col of COLECCIONES) {
    const mia = (S.bor[col] ??= {});
    for (const [k, m] of Object.entries(r.bor[col])) mia[k] = mayorMarca(mia[k], m);
  }
  for (const [dia, m] of Object.entries(r.mis)) {
    const x = (S.mis[dia] ??= { c: [], b: false });
    x.c = [...new Set([...x.c, ...m.c])].sort(); x.b = !!(x.b || m.b);
  }
  for (const viejo of Object.keys(S.mis).sort().slice(0, -MISIONES_DIAS)) delete S.mis[viejo];
  if (r.her) S.her = elegirHer(S.her, r.her);
}

// ───────────── la vista fusionada ─────────────
const porT = (a, b) => a.t - b.t || cmpTxt(canon(a), canon(b));
function conjuntoVivo(fila, nombre) {
  const vivos = Object.entries(fila).filter(([, [a, b]]) => a != null && (b == null || cmp([a[0], a[1]], [b[0], b[1]]) > 0));
  if (nombre === 'protegidos') return vivos.map(([e]) => e).sort();
  return vivos.sort(([e, [a]], [f, [c]]) => cmp([a[0], a[1], e], [c[0], c[1], f])).map(([e]) => e);
}

/** Construye el progreso fusionado a partir del local, el contenido unido C y el estado S */
export function vista(p, C, S, ahora) {
  const v = copia(p);
  const tiene = (k) => k in v;
  // contenido
  v.mem = C.mem; v.aprendidos = C.aprendidos;
  for (const k of ['gramatica', 'clases', 'lecturas']) if (Object.keys(C[k]).length || tiene(k)) v[k] = Object.fromEntries(Object.entries(C[k]).map(([id, e]) => [id, { ...e }]));
  if (Object.keys(C.kana).length || tiene('kana')) v.kana = Object.fromEntries(Object.entries(C.kana).map(([ch, e]) => [ch, { b: 0, m: 0, ...e }]));
  if (Object.keys(C.gramatica_vista).length || tiene('gramatica_vista')) v.gramatica_vista = { ...C.gramatica_vista };
  if (C.min.creado != null) v.creado = C.min.creado;
  if (C.max.version_datos != null) v.version_datos = C.max.version_datos;
  // «último gana»
  for (const [rt, [valor]] of Object.entries(S.lww)) {
    const partes = JSON.parse(rt);
    if (partes.length === 4 && partes[0] === 'juego' && partes[1] === 'inventario') continue;   // va con el inventario
    if (partes[0] === 'ajustes' && AJUSTES_LOCALES.includes(partes[1])) continue;
    if (partes.length === 2 && partes[0] === 'mochi' && partes[1] === '@hoy') {
      if (!esObj(v.mochi)) v.mochi = {};
      [v.mochi.ensenadas_dia, v.mochi.ensenadas_hoy] = copia(valor);
      continue;
    }
    poner(v, partes, copia(valor));
  }
  // conjuntos
  for (const [nombre, fila] of Object.entries(S.conj)) {
    const lista = conjuntoVivo(fila, nombre);
    if (nombre === 'nyan_sabe') v.nyan_sabe = lista;
    else if (nombre === 'quitado') { if (!esObj(v.mochi)) v.mochi = {}; v.mochi.quitado = lista; }
    else poner(v, ['juego', nombre], lista);
  }
  // registro y días archivados
  const corte = ahora - DIAS_REGISTRO * 86400, todas = Object.values(C.registro), viejos = {};
  for (const e of todas) if (e.t < corte) { const d = diaDe(e.t); viejos[d] = (viejos[d] || 0) + 1; }
  v.registro = todas.filter((e) => e.t >= corte).sort((a, b) => a.t - b.t || cmpTxt(String(a.id ?? ''), String(b.id ?? '')) || cmpTxt(canon(a), canon(b)));
  const dias = {};
  for (const d of new Set([...Object.keys(C.dias), ...Object.keys(viejos)])) dias[d] = Math.max(C.dias[d] || 0, viejos[d] || 0);
  if (Object.keys(dias).length || tiene('dias_archivados')) v.dias_archivados = Object.fromEntries(Object.entries(dias).sort(([a], [b]) => cmpTxt(a, b)));
  const diario = Object.values(C.diario).sort(porT).slice(-DIARIO_MAX);
  if (diario.length || tiene('nyan_diario')) v.nyan_diario = diario;
  // contadores
  const cont = Object.keys(S.pn).map((r) => [JSON.parse(r), Math.max(0, total(S, r))]);
  const filas = { jefes: {}, inventario: {}, tiempo: {} };
  let xp = null;
  for (const [k, n] of cont) {
    if (k.length === 1 && k[0] === 'xp') xp = n;
    else if (k[0] === 'juego' && k.length === 2) { if (!esObj(v.juego)) v.juego = {}; v.juego[k[1]] = n; }
    else if (k[0] === 'juego' && k[1] === 'jefes') (filas.jefes[k[2]] ??= {})[k[3]] = n;
    else if (k[0] === 'juego' && k[1] === 'inventario') filas.inventario[k[2]] = n;
    else if (['gramatica', 'clases', 'lecturas'].includes(k[0])) { if (esObj(v[k[0]][k[1]])) v[k[0]][k[1]][k[2]] = Math.max(1, n); }
    else if (k[0] === 'kana') { if (v.kana && esObj(v.kana[k[1]])) v.kana[k[1]][k[2]] = n; }
    else if (k[0] === 'mochi') { if (!esObj(v.mochi)) v.mochi = {}; v.mochi.ensenadas = n; }
    else if (k[0] === 'tiempo') (filas.tiempo[k[1]] ??= {})[k[2] ?? ''] = n;
  }
  if (xp !== null) v.xp = Math.max(0, xp + (S.her ? S.her.xp : 0));
  // tiempo de estudio
  if (Object.keys(filas.tiempo).length || C.max['tiempo.previo'] != null || C.max['tiempo.desde_txt'] != null) {
    const t = (v.tiempo = esObj(v.tiempo) ? v.tiempo : {});
    if ('total' in filas.tiempo) t.total = filas.tiempo.total[''];
    else if (!num(t.total)) t.total = 0;
    const ds = Object.entries(filas.tiempo.dias || {}).sort(([a], [b]) => cmpTxt(a, b)).slice(-60);
    t.dias = Object.fromEntries(ds);
    if (C.max['tiempo.previo'] != null) t.previo = C.max['tiempo.previo'];
    const desde = [t.desde, C.max['tiempo.desde_txt']].filter((x) => typeof x === 'string');
    if (desde.length) t.desde = desde.sort()[0];
  }
  if (C.max['mochi.equipo_visto'] != null) { if (!esObj(v.mochi)) v.mochi = {}; v.mochi.equipo_visto = Math.max(num(v.mochi.equipo_visto) ? v.mochi.equipo_visto : 0, C.max['mochi.equipo_visto']); }
  // herencia
  if (S.her) v.herencia = { ...D(v.herencia), repasos: S.her.repasos ?? D(v.herencia).repasos, items: S.her.items ?? D(v.herencia).items, cobrada: true };
  // el juego
  const hayJuego = esObj(v.juego) || cont.some(([k]) => k[0] === 'juego') || Object.keys(C.jefes).length || Object.keys(C.inventario).length || Object.keys(C.max).some((k) => k.startsWith('juego.'))
    || Object.keys(S.conj).some((n) => CONJ_JUEGO.includes(n)) || Object.keys(S.mis).length;
  if (!hayJuego) return copia(v);
  if (!esObj(v.juego)) v.juego = {};
  const j = v.juego, il = D(j.inventario), inv = {};
  for (const x of [...new Set([...Object.keys(C.inventario), ...Object.keys(filas.inventario)])].sort((a, b) => cmp([ordenV(C.inventario[a]), a].flat(), [ordenV(C.inventario[b]), b].flat()))) {
    const e = { ...D(il[x]) };
    if (x in filas.inventario) e.n = Math.max(1, filas.inventario[x]); else if (!('n' in e)) e.n = 1;
    if (C.inventario[x] != null) e.t = C.inventario[x];
    const nuevo = S.lww[ruta('juego', 'inventario', x, 'nuevo')];
    e.nuevo = nuevo ? !!nuevo[0] : !!e.nuevo;
    inv[x] = e;
  }
  j.inventario = inv;
  const jl = D(j.jefes), jefes = {};
  for (const i of [...new Set([...Object.keys(C.jefes), ...Object.keys(filas.jefes)])].sort((a, b) => a.length - b.length || cmpTxt(a, b))) {
    const e = { ...D(jl[i]) }, cj = C.jefes[i];
    if (cj) {
      e.vencido = cj.vencido;
      if (cj.t != null) e.t = cj.t;
      if (cj.dia != null) { e.dia = cj.dia; e.koban_dia = cj.koban_dia; }
    }
    Object.assign(e, filas.jefes[i] || {});
    if (!('vencido' in e)) e.vencido = false;
    jefes[i] = e;
  }
  j.jefes = jefes;
  if (Object.keys(S.mis).length) {
    const dia = Object.keys(S.mis).sort().at(-1), m = S.mis[dia];
    j.misiones = { ...D(j.misiones), dia, cobradas: [...m.c], bolsa: m.b };
  }
  j.sesiones = Object.values(C.sesiones).sort(porT).slice(-SESIONES_MAX);
  j.gramatica_log = Object.values(C.glog).filter((t) => t > ahora - GRAMATICA_LOG).sort((a, b) => a - b);
  for (const k of MAX_JUEGO) if (('juego.' + k) in C.max) j[k] = C.max['juego.' + k];
  if (C.min['juego.creado'] != null) j.creado = C.min['juego.creado'];
  return copia(v);
}

// ───────────── unir ─────────────
/** Une el progreso local con los documentos ya descifrados de los demás.
 *  → { S: estado nuevo, vista: progreso fusionado, nuevos: ids de aparatos que no se conocían }. No toca S0 ni p. */
export function fusionar(S0, p, remotos, ahora, ctx = {}) {
  const S = copia(S0);
  anotar(S, p, ahora, ctx);
  const rs = (remotos || []).map(limpiarDoc).filter((r) => r && (r.disp !== S.disp || S.rescate)).sort((a, b) => cmpTxt(a.disp, b.disp));
  const nuevos = [];
  for (const r of rs) {
    absorber(S, r);
    if (r.disp !== S.disp) {
      if (!(r.disp in S.conocidos)) nuevos.push(r.disp);
      const c = S.conocidos[r.disp];
      if (!c || (r.t ?? 0) >= (c.t ?? 0)) S.conocidos[r.disp] = { nombre: r.nombre, t: r.t };
    }
  }
  for (const [k, m] of Object.entries(S.bor.registro || {})) if (m[0] < ahora - LAPIDA_REGISTRO) delete S.bor.registro[k];
  let C = contenidoVacio();
  for (const c of [contenido(p), ...rs.map((r) => r.contenido)]) C = unirC(C, sinBorrados(c, S.bor));
  const v = vista(p, C, S, ahora);
  S.foto = fotoDe(v);
  S.rescate = S.rescate && !rs.some((r) => r.disp === S.disp);   // si no se pudo traer lo mío del servidor, se vuelve a intentar
  return { S, vista: v, nuevos };
}

// ───────────── aplicar y contar ─────────────
function igualesLocal(a, b) { return canon(a) === canon(b); }
/** Cambia el contenido de `destino` por el de `nuevo` SIN cambiar el objeto (otras partes del motor lo tienen en la mano) */
export function aplicarEnSitio(destino, nuevo) {
  for (const k of Object.keys(destino)) if (!(k in nuevo)) delete destino[k];
  for (const [k, val] of Object.entries(nuevo)) {
    const actual = destino[k];
    if (esObj(actual) && esObj(val)) {
      for (const x of Object.keys(actual)) if (!(x in val)) delete actual[x];
      for (const [x, y] of Object.entries(val)) if (!igualesLocal(actual[x], y)) actual[x] = y;
    } else if (Array.isArray(actual) && Array.isArray(val)) { if (!igualesLocal(actual, val)) actual.splice(0, actual.length, ...val); }
    else if (!igualesLocal(actual, val)) destino[k] = val;
  }
}
/** Cuánto ha cambiado un progreso al fusionarlo: { total, detalle } */
export function cambiosEntre(a, b) {
  const det = {};
  for (const col of ['mem', 'aprendidos']) {
    let n = 0;
    for (const k of new Set([...Object.keys(D(a[col])), ...Object.keys(D(b[col]))])) if (!iguales(D(a[col])[k], D(b[col])[k])) n++;
    if (n) det[col] = n;
  }
  const ra = new Set(L(a.registro).map(claveReg)), rb = new Set(L(b.registro).map(claveReg));
  let nr = 0;
  for (const k of rb) if (!ra.has(k)) nr++;
  for (const k of ra) if (!rb.has(k)) nr++;
  if (nr) det.registro = nr;
  if ((a.xp ?? 0) !== (b.xp ?? 0)) det.xp = (b.xp ?? 0) - (a.xp ?? 0);
  let otros = 0;
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (!['mem', 'aprendidos', 'registro', 'xp'].includes(k) && !iguales(a[k], b[k])) otros++;
  if (otros) det.otros = otros;
  const totalN = (det.mem || 0) + (det.aprendidos || 0) + (det.registro || 0) + (det.xp ? 1 : 0) + otros;
  return { total: totalN, detalle: det };
}
