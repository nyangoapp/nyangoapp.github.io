// Cifrado de la sincronización entre aparatos (solo WebCrypto, sin librerías). El protocolo está fijado:
//  · secreto: 16 bytes al azar, que se enseña como un código en base32 de Crockford (26 letras, sin relleno), agrupado
//    XXXX-XXXX-XXXX-XXXX-XXXX-XXXXXX; al teclearlo vale en minúsculas, sin guiones y con O→0, I/L→1.
//  · derivación (HKDF-SHA256, sal «nyango-sincro-v1», material = el secreto): «buzon» → 16 bytes → hex (32);
//    «token» → 32 bytes → hex (64); «cifrar» → clave AES-GCM de 256 bits.
//  · blob: 0x01 (formato) + 0x01|0x00 (gzip sí/no) + 12 bytes de IV + AES-GCM del JSON UTF-8 (comprimido con gzip si se puede).
// crypto.subtle no existe fuera de los contextos seguros (p. ej. http:// por la red local): ahí no se puede enlazar.
const ALFABETO = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const SAL = new TextEncoder().encode('nyango-sincro-v1');
export const FORMATO = 1;
export const MAX_DESCOMPRIMIDO = 64 * 1024 * 1024;   // tope contra bombas de descompresión

export const disponible = () => typeof globalThis.crypto !== 'undefined' && !!globalThis.crypto.subtle && typeof globalThis.crypto.getRandomValues === 'function';

const hex = (u8) => [...u8].map((b) => b.toString(16).padStart(2, '0')).join('');
export const aleatorio = (n) => globalThis.crypto.getRandomValues(new Uint8Array(n));
export const idAparato = () => hex(aleatorio(4));

// ── código de 26 letras ──
export function codificar(bytes16) {
  let bits = 0, acum = 0, s = '';
  for (const b of bytes16) {
    acum = (acum << 8) | b; bits += 8;
    while (bits >= 5) { s += ALFABETO[(acum >> (bits - 5)) & 31]; bits -= 5; }
    acum &= (1 << bits) - 1;
  }
  if (bits) s += ALFABETO[(acum << (5 - bits)) & 31];
  return s;   // 26 letras
}
export const agrupar = (c) => [c.slice(0, 4), c.slice(4, 8), c.slice(8, 12), c.slice(12, 16), c.slice(16, 20), c.slice(20)].join('-');
/** Lo que teclea la gente → las 26 letras limpias, o null si no es un código */
export function limpiarCodigo(texto) {
  let s = String(texto ?? '').toUpperCase().replace(/[\s-]+/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  return /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{26}$/.test(s) ? s : null;
}
/** Extrae el código de un texto que puede ser el código o el enlace del QR */
export function codigoDeTexto(texto) {
  const t = String(texto ?? ''), m = t.match(/enlazar=([^&\s]+)/i);
  return limpiarCodigo(m ? decodeURIComponent(m[1]) : t);
}
/** 26 letras → 16 bytes, o null si sobran bits (un código que no salió de aquí) */
export function decodificar(codigo) {
  const c = limpiarCodigo(codigo);
  if (!c) return null;
  let bits = 0, acum = 0;
  const out = [];
  for (const ch of c) {
    acum = (acum << 5) | ALFABETO.indexOf(ch); bits += 5;
    if (bits >= 8) { out.push((acum >> (bits - 8)) & 255); bits -= 8; acum &= (1 << bits) - 1; }
  }
  return acum === 0 && out.length === 16 ? new Uint8Array(out) : null;   // los 2 bits que sobran van a cero
}
export const nuevoSecreto = () => codificar(aleatorio(16));

// ── derivación ──
async function material(secreto) { return globalThis.crypto.subtle.importKey('raw', secreto, 'HKDF', false, ['deriveBits', 'deriveKey']); }
const hkdf = (info) => ({ name: 'HKDF', hash: 'SHA-256', salt: SAL, info: new TextEncoder().encode(info) });
/** codigo (26 letras) → { buzon (32 hex), token (64 hex), clave (CryptoKey AES-GCM) } */
export async function derivar(codigo) {
  const bytes = decodificar(codigo);
  if (!bytes) throw new Error('codigo');
  const subtle = globalThis.crypto.subtle, m = await material(bytes);
  const buzon = hex(new Uint8Array(await subtle.deriveBits(hkdf('buzon'), m, 128)));
  const token = hex(new Uint8Array(await subtle.deriveBits(hkdf('token'), m, 256)));
  const clave = await subtle.deriveKey(hkdf('cifrar'), m, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  return { buzon, token, clave };
}

// ── gzip ──
const gzipHay = () => typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined' && typeof Response !== 'undefined';
async function comprimir(u8) {
  const flujo = new Blob([u8]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(flujo).arrayBuffer());
}
async function descomprimir(u8) {
  const lector = new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
  const trozos = [];
  let total = 0;
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    total += value.length;
    if (total > MAX_DESCOMPRIMIDO) { lector.cancel().catch(() => {}); throw new Error('grande'); }
    trozos.push(value);
  }
  const out = new Uint8Array(total);
  let o = 0;
  for (const t of trozos) { out.set(t, o); o += t.length; }
  return out;
}

// ── blob ──
/** objeto JSON → Uint8Array cifrado (formato, gzip, IV, texto cifrado) */
export async function sellar(objeto, clave) {
  let datos = new TextEncoder().encode(JSON.stringify(objeto)), gz = 0;
  if (gzipHay()) { try { datos = await comprimir(datos); gz = 1; } catch (e) { gz = 0; datos = new TextEncoder().encode(JSON.stringify(objeto)); } }
  const iv = aleatorio(12);
  const cif = new Uint8Array(await globalThis.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, clave, datos));
  const out = new Uint8Array(14 + cif.length);
  out[0] = FORMATO; out[1] = gz; out.set(iv, 2); out.set(cif, 14);
  return out;
}
/** Uint8Array → objeto; lanza si el formato es raro o si el cifrado no cuadra (otro código, o alguien lo ha tocado) */
export async function abrir(blob, clave) {
  if (!(blob instanceof Uint8Array) || blob.length < 14 + 16) throw new Error('formato');
  if (blob[0] !== FORMATO || (blob[1] !== 0 && blob[1] !== 1)) throw new Error('formato');
  let datos;
  try { datos = new Uint8Array(await globalThis.crypto.subtle.decrypt({ name: 'AES-GCM', iv: blob.slice(2, 14) }, clave, blob.slice(14))); } catch (e) { throw new Error('cifrado'); }
  if (blob[1] === 1) {
    if (!gzipHay()) throw new Error('gzip');
    datos = await descomprimir(datos);
  }
  try { return JSON.parse(new TextDecoder().decode(datos)); } catch (e) { throw new Error('json'); }
}
export async function huella(texto) {
  return hex(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto))));
}
