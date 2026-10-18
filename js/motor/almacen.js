// Dónde vive tu progreso, SIEMPRE fuera de la app: una actualización cambia la app, nunca tus datos.
//  · App de escritorio (Tauri): archivos en la carpeta de datos del sistema (~/.local/share/app.nyango, %APPDATA%\app.nyango…):
//    progreso.json (escritura atómica: temporal + renombrar), copias/progreso-<día>.json y registro-antiguo.jsonl.
//  · Navegador / PWA: los mismos «archivos» dentro de IndexedDB (y se pide almacenamiento persistente).
// El formato de progreso.json es el mismo del Nyango de Python.
const TAURI = typeof window !== 'undefined' ? window.__TAURI__ : null;

// ── escritorio: plugin fs de Tauri, relativo a la carpeta de datos de la app ──
function almacenTauri() {
  const fs = TAURI.fs, base = { baseDir: fs.BaseDirectory.AppData };
  let lista = false;
  const preparar = async () => { if (!lista) { await fs.mkdir('copias', { ...base, recursive: true }).catch(() => {}); lista = true; } };
  return {
    donde: 'escritorio',
    async leer(nombre) { await preparar(); return (await fs.exists(nombre, base)) ? fs.readTextFile(nombre, base) : null; },
    async escribir(nombre, texto) {
      await preparar();
      await fs.writeTextFile(nombre + '.tmp', texto, base);
      await fs.rename(nombre + '.tmp', nombre, { oldPathBaseDir: base.baseDir, newPathBaseDir: base.baseDir });
    },
    async nombres(carpeta) { await preparar(); return (await fs.readDir(carpeta, base).catch(() => [])).map((e) => `${carpeta}/${e.name}`); },
    async borrar(nombre) { await fs.remove(nombre, base).catch(() => {}); },
  };
}

// ── navegador: IndexedDB («archivos» por nombre) ──
function almacenNavegador() {
  let db = null;
  const abrir = () => db || (db = new Promise((ok, mal) => {
    const r = indexedDB.open('nyango', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('archivos');
    r.onsuccess = () => ok(r.result); r.onerror = () => mal(r.error);
  }));
  const tx = async (modo, fn) => { const d = await abrir(); return new Promise((ok, mal) => {
    const t = d.transaction('archivos', modo), s = t.objectStore('archivos'), r = fn(s);
    t.oncomplete = () => ok(r?.result); t.onerror = () => mal(t.error);
  }); };
  try { navigator.storage?.persist?.(); } catch (e) { /* sin permiso: se queda como está */ }
  return {
    donde: 'navegador',
    async leer(nombre) { return (await tx('readonly', (s) => s.get(nombre))) ?? null; },
    async escribir(nombre, texto) { await tx('readwrite', (s) => s.put(texto, nombre)); },
    async nombres(carpeta) { return ((await tx('readonly', (s) => s.getAllKeys())) || []).filter((k) => String(k).startsWith(carpeta + '/')); },
    async borrar(nombre) { await tx('readwrite', (s) => s.delete(nombre)); },
  };
}

export const almacen = TAURI?.fs ? almacenTauri() : almacenNavegador();
