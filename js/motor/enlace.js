// ニャン語 Nyango · enlazar el móvil y el ordenador. Una vez enlazados (con un QR o un código), el progreso se une solo, cifrado de
// extremo a extremo: el servidor (un Worker de Cloudflare con D1, herramientas/sincro-servidor/) solo guarda bloques cifrados.
//  · enlace-cripto.js  código, derivación y cifrado (WebCrypto)
//  · enlace-union.js   cómo se unen dos progresos (sin red ni navegador)
//  · este archivo      el estado propio (enlace.json), el transporte, el bucle automático y las rutas /api/enlace/*
// Una vuelta de sincronización: lista → baja los documentos de los OTROS aparatos que cambiaron → descifra → une con lo propio
// → si el progreso cambia, lo guarda (con copia la primera vez que aparece un aparato nuevo) → sube el documento propio.
// Los errores nunca rompen la app: van a «ultimo.error».
import * as cripto from './enlace-cripto.js';
import * as U from './enlace-union.js';
import { SINCRO_URL } from './enlace-config.js';
import { idioma } from './textos.js';

export const claveRegistro = U.claveRegistro;
export const URL_ENLACE = 'https://nyangoapp.github.io/movil.html#enlazar=';
export const MAX_BLOB = 1900000;          // el Worker rechaza más de esto (límite de fila de D1)
const KEEPALIVE_MAX = 60000;              // los navegadores cortan las peticiones keepalive a ~64 kB
const ESPERA_GUARDADO = 15000, CADA = 5 * 60000, AL_VOLVER = 60000, TOPE_RED = 20000;

// ───────────── textos de los errores ─────────────
const TEXTOS = {
  sin_cripto: { es: 'Este navegador no permite el cifrado que hace falta para enlazar (solo funciona en una página segura, https).', en: 'This browser does not allow the encryption needed to link devices (it only works on a secure https page).' },
  sin_servidor: { es: 'La sincronización todavía no está disponible.', en: 'Syncing is not available yet.' },
  sin_red: { es: 'No he podido conectar. Comprueba la conexión e inténtalo de nuevo.', en: 'Could not connect. Check your connection and try again.' },
  codigo_invalido: { es: 'Ese código no tiene buena pinta. Son 26 letras y números; mira que no falte ninguno.', en: 'That code does not look right. It is 26 letters and numbers; check none is missing.' },
  codigo_desconocido: { es: 'No encuentro ningún aparato con ese código. Mira que esté bien copiado y que el otro aparato esté enlazado.', en: 'No device found with that code. Check it is copied correctly and that the other device is set up.' },
  ya_enlazado: { es: 'Este aparato ya está enlazado con otro código. Desvincúlalo primero.', en: 'This device is already linked with another code. Unlink it first.' },
  no_enlazado: { es: 'Este aparato no está enlazado.', en: 'This device is not linked.' },
  demasiados: { es: 'Ya hay 8 aparatos enlazados con ese código. Desvincula alguno primero.', en: 'There are already 8 devices linked with that code. Unlink one first.' },
  grande: { es: 'Tu progreso ocupa demasiado para sincronizarlo.', en: 'Your progress is too large to sync.' },
  servidor: { es: 'El servidor de sincronización no responde bien ahora mismo. Se reintentará.', en: 'The sync server is not responding well right now. It will retry.' },
  no_autorizado: { es: 'El servidor no acepta este código.', en: 'The server does not accept this code.' },
  ilegible: { es: 'No he podido leer lo que subió otro aparato; lo dejo sin tocar.', en: 'I could not read what another device uploaded; leaving it alone.' },
  fallo: { es: 'Algo ha fallado al sincronizar.', en: 'Something went wrong while syncing.' },
};
export class ErrorEnlace extends Error {
  constructor(clave, codigo = 400, fase = null) {
    super((TEXTOS[clave] || TEXTOS.fallo)[idioma() === 'en' ? 'en' : 'es']);
    this.clave = clave; this.codigo = codigo; this.fase = fase;
  }
  cuerpo() { return { error: this.message, clave: 'enlace.' + this.clave }; }
}

/** Un aparato: su estado, su bucle y sus rutas. La app usa la instancia de abajo; las pruebas crean varias. */
export function crearEnlace() {
  // ───────────── estado ─────────────
  let ctx = null;                  // { P, guardar, almacen, ahora, defecto, fetch?, url?, emitir? }
  let S = null;                    // el estado propio (ver estadoNuevo en enlace-union.js, más lo de aquí)
  let sucio = false, escritura = Promise.resolve();
  let enCurso = null, inicial = null, temporizador = null, escuchando = false, claveCache = null, ultimaVuelta = 0, subiendoAlOcultar = false;

  const reloj = () => (ctx?.ahora ? ctx.ahora() : Date.now() / 1000);
  const nombreDefecto = () => {
    const es = idioma() !== 'en';
    if (typeof window !== 'undefined' && window.__TAURI__) return es ? 'Ordenador' : 'Computer';
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
    return /Android|iPhone|iPad|iPod|Mobile/i.test(ua) ? (es ? 'Móvil' : 'Phone') : (es ? 'Navegador' : 'Browser');
  };
  function nuevoEstado(nombre = null) {
    const disp = cripto.disponible() ? cripto.idAparato() : [...Array(8)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
    return { ...U.estadoNuevo(disp, nombre), codigo: null, buzon: null, enlazado: false, ultimo: { t: null, ok: null, error: null, clave: null }, subida: null, lista: [] };
  }
  function completarEstado(x) {
    const base = nuevoEstado(typeof x.nombre === 'string' ? x.nombre : null);
    for (const [k, v] of Object.entries(base)) if (k !== 'disp' && (x[k] === undefined || typeof x[k] !== typeof v || Array.isArray(x[k]) !== Array.isArray(v)) && v !== null) x[k] = v;
    for (const k of ['codigo', 'buzon', 'foto', 'subida', 'her', 'linaje']) if (x[k] === undefined) x[k] = null;
    return x;
  }
  const emitir = (nombre, detalle) => {
    try {
      if (ctx?.emitir) ctx.emitir(nombre, detalle);
      else if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') window.dispatchEvent(new CustomEvent(nombre, { detail: detalle }));
    } catch (e) { /* la interfaz no debe romper la sincronización */ }
  };

  function conectar(c) { ctx = c; }
  /** Lee enlace.json (o crea el estado de este aparato). Antes de usar nada más. */
  async function cargar() {
    if (S) return S;
    let x = null;
    try {
      const texto = await ctx.almacen.leer('enlace.json');
      if (texto) {
        try { x = JSON.parse(texto); } catch (e) { await ctx.almacen.escribir(`enlace.danado-${Date.now()}.json`, texto).catch(() => {}); }
      }
    } catch (e) { console.error('No he podido leer enlace.json', e); }
    S = x && typeof x === 'object' && /^[0-9a-f]{8}$/.test(String(x.disp)) ? completarEstado(x) : nuevoEstado();
    if (!x) sucio = false;
    return S;
  }
  const estado = () => S;
  const enlazado = () => !!(S && S.enlazado && S.codigo);

  /** Escribe enlace.json si cambió (en cola con los demás guardados). */
  function persistir() {
    if (!S || !sucio) return escritura;
    sucio = false;
    const texto = JSON.stringify(S);
    escritura = escritura.then(() => ctx.almacen.escribir('enlace.json', texto)).catch((e) => { sucio = true; console.error('No he podido guardar enlace.json', e); });
    return escritura;
  }

  // ───────────── ganchos del motor ─────────────
  /** Con cada guardar() del progreso: apunta lo que cambió y programa la sincronización (15 s después del último). */
  function alGuardar() {
    if (!enlazado() || !ctx) return;
    try { if (U.anotar(S, ctx.P(), reloj(), { defecto: ctx.defecto?.() })) sucio = true; } catch (e) { console.error('enlace: anotar', e); }
    programar();
  }
  /** Borrado a propósito (quitar fichas, deshacer la prueba de nivel, corregir): deja una lápida para que no vuelva de otro aparato. */
  function borrado(coleccion, clave) {
    if (!enlazado() || !ctx) return;
    U.borrado(S, coleccion, clave, reloj());
    sucio = true;
  }
  function programar() {
    if (ctx.sinTemporizador) return;
    if (temporizador) clearTimeout(temporizador);
    temporizador = setTimeout(() => { temporizador = null; sincronizar().catch(() => {}); }, ctx.espera ?? ESPERA_GUARDADO);
    temporizador?.unref?.();
  }

  // ───────────── red ─────────────
  const urlServidor = () => {
    if (ctx?.url) return ctx.url;
    try { const u = typeof localStorage !== 'undefined' && localStorage.getItem('nyango-sincro-url'); if (u) return u; } catch (e) { /* sin almacenamiento */ }
    return SINCRO_URL;
  };
  function motivoNoDisponible() {
    if (!cripto.disponible()) return 'sin_cripto';
    if (/TODO/.test(urlServidor())) return 'sin_servidor';
    return null;
  }
  async function llamar(metodo, ruta, { token, cuerpo, keepalive = false, tope = TOPE_RED, fase = null } = {}) {
    const f = ctx.fetch || globalThis.fetch;
    const control = typeof AbortController !== 'undefined' && !keepalive ? new AbortController() : null;
    const reloj = control ? setTimeout(() => control.abort(), tope) : null;
    let r;
    try {
      r = await f(urlServidor().replace(/\/+$/, '') + ruta, {
        method: metodo, signal: control?.signal, keepalive: keepalive || undefined,
        headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(cuerpo ? { 'Content-Type': 'application/octet-stream' } : {}) }, body: cuerpo,
      });
    } catch (e) { throw new ErrorEnlace("sin_red", 502, fase); } finally { if (reloj) clearTimeout(reloj); }
    if (r.ok) return r;
    if (r.status === 401 || r.status === 403) throw new ErrorEnlace('no_autorizado', 401, fase);
    if (r.status === 409) throw new ErrorEnlace('demasiados', 409, fase);
    if (r.status === 413) throw new ErrorEnlace('grande', 413, fase);
    if (r.status === 404) throw new ErrorEnlace('fallo', 404, fase);
    throw new ErrorEnlace('servidor', 502, fase);
  }
  async function claves() {
    if (!claveCache || claveCache.codigo !== S.codigo) claveCache = { codigo: S.codigo, ...(await cripto.derivar(S.codigo)) };
    return claveCache;
  }
  const listar = async (k) => {
    const j = await (await llamar('GET', `/v1/b/${k.buzon}`, { token: k.token })).json();
    return (Array.isArray(j.aparatos) ? j.aparatos : []).filter((a) => a && /^[0-9a-f]{8}$/.test(a.disp) && typeof a.t === 'number');
  };
  async function subirDoc(k, { keepalive = false } = {}) {
    const ahora = reloj(), doc = U.armarDoc(S, ctx.P(), ahora), huella = U.huellaDoc(doc);
    const blob = await cripto.sellar(doc, k.clave);
    if (blob.length > MAX_BLOB) throw new ErrorEnlace('grande', 413, 'subida');
    const usarKeep = keepalive && blob.length <= KEEPALIVE_MAX;
    const r = await llamar('PUT', `/v1/b/${k.buzon}/${S.disp}`, { token: k.token, cuerpo: blob, keepalive: usarKeep, tope: 40000, fase: 'subida' });
    let t = null;
    try { t = (await r.json()).t; } catch (e) { /* sin hora */ }
    S.subida = { huella, t: typeof t === 'number' ? t / 1000 : ahora };
    sucio = true;
    return blob.length;
  }

  // ───────────── una vuelta ─────────────
  async function copiaAntes(texto) {
    const nombre = `copias/progreso.antes-de-unir-${Date.now()}.json`;
    try {
      await ctx.almacen.escribir(nombre, texto);
      const viejas = (await ctx.almacen.nombres('copias')).filter((n) => /progreso\.antes-de-unir-/.test(n)).sort();
      for (const v of viejas.slice(0, -3)) await ctx.almacen.borrar(v);
    } catch (e) { console.error('No he podido guardar la copia antes de unir', e); }
  }
  function aviso(n) { return n ? TEXTOS.ilegible[idioma() === 'en' ? 'en' : 'es'] : null; }

  async function vuelta() {
    const k = await claves();
    U.anotar(S, ctx.P(), reloj(), { defecto: ctx.defecto?.() });   // por si hay algo sin apuntar; puede pedir «rescate» (ver anotar)
    const lista = await listar(k);
    const propio = lista.find((a) => a.disp === S.disp);
    const bajar = lista.filter((a) => (a.disp === S.disp ? S.rescate : (S.vistos[a.disp] ?? -1) < a.t));
    const docs = [], vistos = {};
    let omitidos = 0;
    for (const a of bajar) {
      try {
        const r = await llamar('GET', `/v1/b/${k.buzon}/${a.disp}`, { token: k.token, tope: 40000 });
        const doc = await cripto.abrir(new Uint8Array(await r.arrayBuffer()), k.clave);
        if (!doc || doc.disp !== a.disp) throw new Error('disp');   // el bloque de otro aparato metido en este hueco
        docs.push(doc); vistos[a.disp] = a.t;
      } catch (e) {
        if (e instanceof ErrorEnlace && e.clave !== 'fallo') throw e;   // la red o el servidor: se reintenta entera
        omitidos++;   // ilegible (otro código, tocado, formato raro) o ya borrado: se deja
      }
    }
    // desde aquí hasta aplicar el resultado NO hay esperas: nada puede cambiar el progreso a medias
    const p = ctx.P(), ahora = reloj();
    const r = U.fusionar(S, p, docs, ahora, { defecto: ctx.defecto?.() });
    const cam = U.cambiosEntre(p, r.vista);
    const antes = r.nuevos.length && cam.total > 0 && !U.esVirgen(p) ? JSON.stringify(p) : null;
    S = r.S;
    Object.assign(S.vistos, vistos);
    S.lista = lista.map((a) => ({ disp: a.disp, t: a.t / 1000 }));
    sucio = true;
    if (cam.total > 0) U.aplicarEnSitio(p, r.vista);
    if (antes) await copiaAntes(antes);
    if (cam.total > 0) { ctx.guardar(); emitir('nyango:sincronizado', { cambios: cam.total, detalle: cam.detalle }); }
    // subir lo propio si cambió (o si el servidor no lo tiene)
    const doc = U.armarDoc(S, p, reloj());
    if (!propio || !S.subida || S.subida.huella !== U.huellaDoc(doc)) await subirDoc(k);
    if (!lista.some((a) => a.disp === S.disp)) S.lista.push({ disp: S.disp, t: S.subida?.t ?? reloj() });
    return { cambios: cam.total, detalle: cam.detalle, omitidos };
  }

  function marcarUltimo(ok, e, extra = {}) {
    S.ultimo = { t: reloj(), ok, error: ok ? (extra.omitidos ? aviso(extra.omitidos) : null) : (e?.message || String(e)), clave: ok ? (extra.omitidos ? 'enlace.ilegible' : null) : (e?.clave ? 'enlace.' + e.clave : 'enlace.fallo') };
    sucio = true;
  }
  /** Sincroniza ahora. Nunca dos a la vez (si ya hay una en marcha, devuelve esa). Nunca lanza. */
  function sincronizar() {
    if (!enlazado() || !ctx) return Promise.resolve({ ok: false, cambios: 0, ultimo: S?.ultimo || null });
    if (enCurso) return enCurso;
    emitir('nyango:enlace', estadoPublico(true));
    enCurso = (async () => {
      try {
        const x = await vuelta();
        marcarUltimo(true, null, x);
        return { ok: true, cambios: x.cambios, detalle: x.detalle, ultimo: S.ultimo };
      } catch (e) {
        if (!(e instanceof ErrorEnlace)) console.error('enlace', e);
        marcarUltimo(false, e);
        return { ok: false, cambios: 0, ultimo: S.ultimo };
      } finally {
        ultimaVuelta = Date.now();
        enCurso = null;
        persistir();
        emitir('nyango:enlace', estadoPublico(false));
      }
    })();
    return enCurso;
  }

  /** Al ocultarse la página: sube lo propio (sin bajar nada) para que el otro aparato lo tenga cuanto antes. */
  async function subirAlOcultar() {
    if (!enlazado() || !ctx || enCurso || subiendoAlOcultar) return;
    subiendoAlOcultar = true;
    try {
      U.anotar(S, ctx.P(), reloj(), { defecto: ctx.defecto?.() });
      const doc = U.armarDoc(S, ctx.P(), reloj());
      if (S.subida && S.subida.huella === U.huellaDoc(doc)) return;
      await subirDoc(await claves(), { keepalive: true });
    } catch (e) { if (!(e instanceof ErrorEnlace)) console.error('enlace (al ocultar)', e); } finally { subiendoAlOcultar = false; persistir(); }
  }

  /** Arranca el bucle automático (solo si está enlazado). Se puede llamar más de una vez. */
  function arrancar() {
    if (!enlazado() || !ctx) return Promise.resolve();
    if (!escuchando && typeof document !== 'undefined') {
      escuchando = true;
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') subirAlOcultar();
        else if (enlazado() && Date.now() - ultimaVuelta > AL_VOLVER) sincronizar();
      });
      const t = setInterval(() => { if (enlazado() && document.visibilityState !== 'hidden') sincronizar(); }, CADA);
      t?.unref?.();
    }
    if (!inicial) inicial = sincronizar();
    return inicial;
  }
  /** El primer repaso de pantalla espera (con tope) a la primera sincronización: así la portada ya cuenta lo que hiciste en el otro aparato. */
  function esperarInicial(ms = 2500) {
    if (!inicial || !enCurso) return Promise.resolve();
    return Promise.race([inicial, new Promise((ok) => { const t = setTimeout(ok, ms); t?.unref?.(); })]);
  }

  // ───────────── rutas /api/enlace ─────────────
  function estadoPublico(sincronizando = !!enCurso) {
    const u = S?.ultimo || {};
    const lista = S?.lista?.length ? S.lista : [];
    const aparatos = lista.map((a) => ({ disp: a.disp, nombre: a.disp === S.disp ? S.nombre || nombreDefecto() : S.conocidos?.[a.disp]?.nombre || a.disp, t: a.t, yo: a.disp === S.disp }));
    if (S && !aparatos.some((a) => a.yo)) aparatos.unshift({ disp: S.disp, nombre: S.nombre || nombreDefecto(), t: S.subida?.t ?? null, yo: true });
    const motivo = motivoNoDisponible();
    return { disponible: !motivo, motivo, enlazado: enlazado(), disp: S?.disp ?? null, nombre: S?.nombre || nombreDefecto(),
      aparatos: enlazado() ? aparatos : [], ultimo: { t: u.t ?? null, ok: u.ok ?? null, error: u.error ?? null, clave: u.clave ?? null }, sincronizando };
  }
  const limpiarNombre = (n) => String(n ?? '').replace(/\s+/g, ' ').trim().slice(0, 24);
  function requisitos() {
    const m = motivoNoDisponible();
    if (m) throw new ErrorEnlace(m);
  }
  /** Entra en el estado de «enlazado» con este código (deja el estado anterior si el buzón es el mismo) → copia para deshacer */
  function enlazarCon(codigo, k, nombre) {
    const previo = JSON.stringify(S);
    if (S.buzon && S.buzon !== k.buzon) S = nuevoEstado(S.nombre);   // otra cuenta: empieza de cero
    if (nombre) S.nombre = nombre;
    S.codigo = codigo; S.buzon = k.buzon; S.enlazado = true; S.vistos = {}; S.subida = null; S.rescate = false;
    claveCache = { codigo, ...k };
    return () => { S = JSON.parse(previo); claveCache = null; };
  }
  async function crear(d) {
    requisitos();
    const nombre = limpiarNombre(d.nombre);
    if (enlazado()) {
      if (nombre && nombre !== S.nombre) { S.nombre = nombre; sucio = true; programar(); }
      return { codigo: cripto.agrupar(S.codigo), url: URL_ENLACE + cripto.agrupar(S.codigo) };
    }
    const codigo = cripto.nuevoSecreto(), k = await cripto.derivar(codigo);
    const deshacer = enlazarCon(codigo, k, nombre || S.nombre || nombreDefecto());
    try {
      U.anotar(S, ctx.P(), reloj(), { defecto: ctx.defecto?.() });   // la primera vez: lo que hay es el punto de partida
      await subirDoc(k);
    } catch (e) { deshacer(); throw e; }
    S.lista = [{ disp: S.disp, t: S.subida.t }];
    S.ultimo = { t: reloj(), ok: true, error: null, clave: null };
    sucio = true; await persistir();
    arrancar();
    emitir('nyango:enlace', estadoPublico(false));
    return { codigo: cripto.agrupar(codigo), url: URL_ENLACE + cripto.agrupar(codigo) };
  }
  async function unir(d) {
    requisitos();
    const codigo = cripto.codigoDeTexto(d.codigo);
    if (!codigo) throw new ErrorEnlace('codigo_invalido', 400);
    const nombre = limpiarNombre(d.nombre);
    if (enlazado()) {
      if (S.codigo !== codigo) throw new ErrorEnlace('ya_enlazado', 409);
      if (nombre) { S.nombre = nombre; sucio = true; }
      const x = await sincronizar();
      return { ok: x.ok, aparatos: estadoPublico().aparatos, cambios: x.cambios };
    }
    const k = await cripto.derivar(codigo);
    const lista = await listar(k).catch((e) => { throw e; });
    if (!lista.length) throw new ErrorEnlace('codigo_desconocido', 404);
    const deshacer = enlazarCon(codigo, k, nombre || S.nombre || nombreDefecto());
    try {
      U.anotar(S, ctx.P(), reloj(), { defecto: ctx.defecto?.() });
      await subirDoc(k);              // primero el hueco (si ya son 8, aquí falla y no se ha cambiado nada)
      const x = await vuelta();       // luego bajar, unir y subir lo unido
      marcarUltimo(true, null, x);
      sucio = true; await persistir();
      arrancar();
      emitir('nyango:enlace', estadoPublico(false));
      return { ok: true, aparatos: estadoPublico().aparatos, cambios: x.cambios };
    } catch (e) {
      if (e instanceof ErrorEnlace && e.fase === 'subida' && S.subida && S.subida.huella) {
        // ya se unió y solo falló la última subida: sigue enlazado y se reintenta solo
        marcarUltimo(false, e); await persistir(); arrancar();
      } else {
        // no cambió nada: se borra el hueco que acabamos de ocupar, si llegó a ocuparse
        const hueco = S.subida ? llamar('DELETE', `/v1/b/${k.buzon}/${S.disp}`, { token: k.token }).catch(() => {}) : null;
        deshacer(); if (hueco) await hueco;
      }
      throw e;
    }
  }
  async function quitar() {
    if (!enlazado()) return { ok: true, servidor: true };
    let servidor = true;
    try { const k = await claves(); await llamar('DELETE', `/v1/b/${k.buzon}/${S.disp}`, { token: k.token }); } catch (e) { servidor = false; }
    if (temporizador) { clearTimeout(temporizador); temporizador = null; }
    // se olvida el código pero no lo que se sabe: si vuelve a esta cuenta, sigue donde lo dejó (y no cuenta dos veces lo suyo)
    S.enlazado = false; S.codigo = null; S.vistos = {}; S.subida = null; S.lista = []; S.rescate = false; claveCache = null; inicial = null;
    sucio = true; await persistir();
    emitir('nyango:enlace', estadoPublico(false));
    return { ok: true, servidor };
  }
  function ponerNombre(d) {
    const nombre = limpiarNombre(d.nombre);
    if (!nombre) throw new ErrorEnlace('fallo', 400);
    S.nombre = nombre; sucio = true;
    if (enlazado()) programar();
    persistir();
    return { ok: true };
  }

  /** → [código HTTP, cuerpo] o null si la ruta no es de aquí */
  async function atender(metodo, rutaApi, datos) {
    if (!rutaApi.startsWith('/api/enlace')) return null;
    const sub = rutaApi.slice('/api/enlace'.length).replace(/\/+$/, '');
    try {
      if (!ctx) return [503, { error: TEXTOS.fallo[idioma() === 'en' ? 'en' : 'es'], clave: 'enlace.fallo' }];
      await cargar();
      if (metodo === 'GET' && sub === '') return [200, estadoPublico()];
      if (metodo !== 'POST') return [404, { error: 'no existe' }];
      const d = datos && typeof datos === 'object' ? datos : {};
      if (sub === '/crear') return [200, await crear(d)];
      if (sub === '/unir') return [200, await unir(d)];
      if (sub === '/ahora') {
        if (!enlazado()) throw new ErrorEnlace('no_enlazado', 400);
        const x = await sincronizar();
        return [200, { ok: x.ok, cambios: x.cambios, ultimo: S.ultimo }];
      }
      if (sub === '/quitar') return [200, await quitar()];
      if (sub === '/nombre') return [200, ponerNombre(d)];
      return [404, { error: 'no existe' }];
    } catch (e) {
      if (e instanceof ErrorEnlace) return [e.codigo, e.cuerpo()];
      console.error(e);
      return [500, { error: TEXTOS.fallo[idioma() === 'en' ? 'en' : 'es'], clave: 'enlace.fallo', detalle: `${e.name}: ${e.message}` }];
    }
  }


  return { conectar, cargar, estado, enlazado, persistir, alGuardar, borrado, urlServidor, motivoNoDisponible, sincronizar, subirAlOcultar, arrancar, esperarInicial, estadoPublico, atender };
}

// la instancia de la app
const principal = crearEnlace();
export const { conectar, cargar, estado, enlazado, persistir, alGuardar, borrado, urlServidor, motivoNoDisponible, sincronizar, subirAlOcultar, arrancar, esperarInicial, estadoPublico, atender } = principal;
