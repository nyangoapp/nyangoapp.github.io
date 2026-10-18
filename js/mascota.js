// Mochi · la mascota de Nyango (ニャン語). Versión final (la anterior está en mascota-v1.js).
// Figura de vinilo japonesa ORIGINAL: gato calicó (mikeneko) aprendiz de samurái, sentado en su habitación.
// Fusión de las pruebas: render, habitación y encanto de C; silueta, orejas y pose de A; expresiones y movimiento de B.
// API: new Mascota(lienzo, { isla, equipo, compacta, ligera, giro }) · equipar(n, animar) · celebrar() · apenado() · saludar()
//      expresion(nombre, ms) · decorar(ids) · accesorio(id | null) · destruir()
//      listo (promesa: sala y shaders preparados) · pausar() · reanudar(); oculto, el bucle se para solo
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { voz as vozMochi } from './sonido.js';

// ─────────────────────────────── utilidades ───────────────────────────────
const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
const c01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const cl = (x, a, b) => (x < a ? a : x > b ? b : x);
const suave = (x) => { x = c01(x); return x * x * (3 - 2 * x); };
const entre = (a, b, x) => suave((x - a) / (b - a));
const elastico = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : Math.pow(2, -9 * x) * Math.sin((x * 9 - 0.75) * (TAU / 3)) + 1);
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const EJE_Y = V3(0, 1, 0);
const ESC = 1.32; // escala de la figura respecto a sus medidas de diseño

function azar(semilla) {
  let a = semilla >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function ruido2(semilla) {
  const r = azar(semilla), perm = new Uint8Array(512), val = new Float32Array(256);
  for (let i = 0; i < 256; i++) { perm[i] = i; val[i] = r(); }
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const k = perm[i]; perm[i] = perm[j]; perm[j] = k; }
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];
  const h = (x, y) => val[perm[(x & 255) + perm[y & 255]]];
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}
function fbm(n, x, y, oct = 4) { let s = 0, a = 0.5, f = 1, t = 0; for (let i = 0; i < oct; i++) { s += a * n(x * f, y * f); t += a; a *= 0.5; f *= 2.03; } return s / t; }

// Todo lo procedimental (mallas y texturas) se genera una vez por página y se comparte entre instancias.
const CACHE = new Map();
function cache(clave, fn) {
  let v = CACHE.get(clave);
  if (v === undefined) {
    v = fn();
    const marcar = (o) => { if (o && typeof o === 'object' && (o.isTexture || o.isBufferGeometry)) o.userData.compartida = true; };
    marcar(v); if (v && typeof v === 'object' && !v.isTexture && !v.isBufferGeometry) Object.values(v).forEach(marcar);
    CACHE.set(clave, v);
  }
  return v;
}
// Worker a partir de código del propio módulo (toString de sus funciones: no se duplica nada). null si no se puede.
function obrero(src) {
  try { const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' })), w = new Worker(url); w.addEventListener('message', () => URL.revokeObjectURL(url), { once: true }); return w; } catch { return null; }
}
function lienzo(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function texDe(c, { srgb = true, repetir = false } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repetir) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8; return t;
}
function dibujar(w, h, fn, op) { const c = lienzo(w, h); fn(c.getContext('2d'), w, h); return texDe(c, op); }
const texC = (clave, w, h, fn, op) => cache('tex:' + clave, () => dibujar(w, h, fn, op));
function sombrear(obj, recibe = true) { obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = recibe; } }); return obj; }
function conPint(geo, fn) {
  const p = geo.attributes.position, uv = geo.attributes.uv, a = new Float32Array(p.count * 3), v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const r = fn ? fn(v, i, uv) : v; a[i * 3] = r.x; a[i * 3 + 1] = r.y; a[i * 3 + 2] = r.z; }
  geo.setAttribute('pint', new THREE.BufferAttribute(a, 3));
  return geo;
}
function geoParam(fn, nu, nv, { cerrarU = false, uvFn } = {}) {
  const pos = [], uv = [], idx = [], cols = cerrarU ? nu : nu + 1;
  for (let i = 0; i < cols; i++) for (let j = 0; j <= nv; j++) {
    const u = i / nu, v = j / nv, p = fn(u, v);
    pos.push(p.x, p.y, p.z);
    if (uvFn) { const q = uvFn(u, v, p); uv.push(q[0], q[1]); } else uv.push(u, v);
  }
  const col = (i) => (cerrarU ? i % nu : i) * (nv + 1);
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const a = col(i) + j, b = col(i + 1) + j, c = a + 1, d = b + 1; idx.push(a, b, c, c, b, d); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function perfilBanda(y0, y1, d0, d1, rr, pasos = 5) {
  const pts = [], esq = [[d1 - rr, y0 + rr, -Math.PI / 2, 0], [d1 - rr, y1 - rr, 0, Math.PI / 2], [d0 + rr, y1 - rr, Math.PI / 2, Math.PI], [d0 + rr, y0 + rr, Math.PI, 1.5 * Math.PI]];
  for (const [cx, cy, a0, a1] of esq) for (let k = 0; k <= pasos; k++) { const a = a0 + (a1 - a0) * (k / pasos); pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]); }
  pts.push(pts[0].slice());
  return pts;
}
function geoAro(radio, perfil, nu = 120, op = {}) {
  const n = perfil.length - 1, ph0 = op.phi0 ?? -Math.PI, ph1 = op.phi1 ?? Math.PI;
  return geoParam((u, v) => { const [dr, y] = perfil[Math.round(v * n)], phi = ph0 + (ph1 - ph0) * u, r = radio(phi, y) + dr; return V3(Math.sin(phi) * r, y, Math.cos(phi) * r); }, nu, n, { cerrarU: op.cerrar ?? true, uvFn: op.uvFn });
}

// ─────────────────────────────── SDF y mallado (surface nets) ───────────────────────────────
function smin(a, b, k) { const h = cl(0.5 + 0.5 * (b - a) / k, 0, 1); return b + (a - b) * h - k * h * (1 - h); }
const smax = (a, b, k) => -smin(-a, -b, k);
function conoRedondo(px, py, pz, ax, ay, az, bx, by, bz, r1, r2) {
  const bax = bx - ax, bay = by - ay, baz = bz - az;
  const l2 = bax * bax + bay * bay + baz * baz, rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2;
  const pax = px - ax, pay = py - ay, paz = pz - az;
  const y = pax * bax + pay * bay + paz * baz, z = y - l2;
  const qx = pax * l2 - bax * y, qy = pay * l2 - bay * y, qz = paz * l2 - baz * y;
  const x2 = qx * qx + qy * qy + qz * qz, y2 = y * y * l2, z2 = z * z * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}
function tri2(px, py, ax, ay, bx, by, cx, cy) {
  const e0x = bx - ax, e0y = by - ay, e1x = cx - bx, e1y = cy - by, e2x = ax - cx, e2y = ay - cy;
  const v0x = px - ax, v0y = py - ay, v1x = px - bx, v1y = py - by, v2x = px - cx, v2y = py - cy;
  const h0 = cl((v0x * e0x + v0y * e0y) / (e0x * e0x + e0y * e0y), 0, 1);
  const h1 = cl((v1x * e1x + v1y * e1y) / (e1x * e1x + e1y * e1y), 0, 1);
  const h2 = cl((v2x * e2x + v2y * e2y) / (e2x * e2x + e2y * e2y), 0, 1);
  const q0x = v0x - e0x * h0, q0y = v0y - e0y * h0, q1x = v1x - e1x * h1, q1y = v1y - e1y * h1, q2x = v2x - e2x * h2, q2y = v2y - e2y * h2;
  const s = Math.sign(e0x * e2y - e0y * e2x);
  const d = Math.min(q0x * q0x + q0y * q0y, q1x * q1x + q1y * q1y, q2x * q2x + q2y * q2y);
  const sg = Math.min(s * (v0x * e0y - v0y * e0x), s * (v1x * e1y - v1y * e1x), s * (v2x * e2y - v2y * e2x));
  return -Math.sqrt(d) * Math.sign(sg);
}
function extruir(d2, dz, r) { const wx = d2 + r, wz = dz + r; return Math.min(Math.max(wx, wz), 0) + Math.sqrt(Math.max(wx, 0) ** 2 + Math.max(wz, 0) ** 2) - r; }

function mallarDatos(f, min, max, h, extras = {}) {
  const [x0, y0, z0] = min;
  const nx = Math.ceil((max[0] - x0) / h) + 1, ny = Math.ceil((max[1] - y0) / h) + 1, nz = Math.ceil((max[2] - z0) / h) + 1;
  const sxy = nx * ny, v = new Float32Array(sxy * nz);
  for (let k = 0, o = 0; k < nz; k++) { const z = z0 + k * h; for (let j = 0; j < ny; j++) { const y = y0 + j * h; for (let i = 0; i < nx; i++, o++) v[o] = f(x0 + i * h, y, z); } }
  const ind = new Int32Array(sxy * nz).fill(-1), pos = [];
  const OFF = [0, 1, nx, nx + 1, sxy, sxy + 1, sxy + nx, sxy + nx + 1];
  const CX = [0, 1, 0, 1, 0, 1, 0, 1], CY = [0, 0, 1, 1, 0, 0, 1, 1], CZ = [0, 0, 0, 0, 1, 1, 1, 1];
  const AR = [0, 1, 2, 3, 4, 5, 6, 7, 0, 2, 1, 3, 4, 6, 5, 7, 0, 4, 1, 5, 2, 6, 3, 7];
  const c = new Float32Array(8);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const o = i + j * nx + k * sxy; let m = 0;
    for (let q = 0; q < 8; q++) { c[q] = v[o + OFF[q]]; if (c[q] < 0) m |= 1 << q; }
    if (m === 0 || m === 255) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (let e = 0; e < 24; e += 2) {
      const a = AR[e], b = AR[e + 1];
      if ((c[a] < 0) === (c[b] < 0)) continue;
      const t = c[a] / (c[a] - c[b]);
      sx += CX[a] + (CX[b] - CX[a]) * t; sy += CY[a] + (CY[b] - CY[a]) * t; sz += CZ[a] + (CZ[b] - CZ[a]) * t; n++;
    }
    ind[o] = pos.length / 3;
    pos.push(x0 + (i + sx / n) * h, y0 + (j + sy / n) * h, z0 + (k + sz / n) * h);
  }
  const quads = [];
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const o = i + j * nx + k * sxy, a = v[o] < 0;
    if (a !== (v[o + 1] < 0)) quads.push(ind[o - nx - sxy], ind[o - sxy], ind[o], ind[o - nx]);
    if (a !== (v[o + nx] < 0)) quads.push(ind[o - 1 - sxy], ind[o - sxy], ind[o], ind[o - 1]);
    if (a !== (v[o + sxy] < 0)) quads.push(ind[o - 1 - nx], ind[o - nx], ind[o], ind[o - 1]);
  }
  const nv = pos.length / 3, P = new Float32Array(pos), N = new Float32Array(nv * 3), e = h * 0.06;
  for (let q = 0; q < nv; q++) {
    let x = P[q * 3], y = P[q * 3 + 1], z = P[q * 3 + 2], gx = 0, gy = 1, gz = 0;
    for (let it = 0; it < 2; it++) {
      const d = f(x, y, z);
      gx = (f(x + e, y, z) - f(x - e, y, z)) / (2 * e); gy = (f(x, y + e, z) - f(x, y - e, z)) / (2 * e); gz = (f(x, y, z + e) - f(x, y, z - e)) / (2 * e);
      if (it === 1) break;
      const g2 = gx * gx + gy * gy + gz * gz || 1, paso = cl(d / g2, -h, h);
      x -= paso * gx; y -= paso * gy; z -= paso * gz;
    }
    const gl = Math.sqrt(gx * gx + gy * gy + gz * gz) || 1;
    P[q * 3] = x; P[q * 3 + 1] = y; P[q * 3 + 2] = z; N[q * 3] = gx / gl; N[q * 3 + 1] = gy / gl; N[q * 3 + 2] = gz / gl;
  }
  const I = [];
  const tri = (a, b, cc) => {
    if (a < 0 || b < 0 || cc < 0) return;
    const ax = P[a * 3], ay = P[a * 3 + 1], az = P[a * 3 + 2];
    const ux = P[b * 3] - ax, uy = P[b * 3 + 1] - ay, uz = P[b * 3 + 2] - az, wx = P[cc * 3] - ax, wy = P[cc * 3 + 1] - ay, wz = P[cc * 3 + 2] - az;
    const cx = uy * wz - uz * wy, cy = uz * wx - ux * wz, cz = ux * wy - uy * wx;
    const s = cx * (N[a * 3] + N[b * 3] + N[cc * 3]) + cy * (N[a * 3 + 1] + N[b * 3 + 1] + N[cc * 3 + 1]) + cz * (N[a * 3 + 2] + N[b * 3 + 2] + N[cc * 3 + 2]);
    if (s >= 0) I.push(a, b, cc); else I.push(a, cc, b);
  };
  const d2 = (a, b) => (P[a * 3] - P[b * 3]) ** 2 + (P[a * 3 + 1] - P[b * 3 + 1]) ** 2 + (P[a * 3 + 2] - P[b * 3 + 2]) ** 2;
  for (let q = 0; q < quads.length; q += 4) {
    const a = quads[q], b = quads[q + 1], cc = quads[q + 2], d = quads[q + 3];
    if (d2(a, cc) < d2(b, d)) { tri(a, b, cc); tri(a, cc, d); } else { tri(a, b, d); tri(b, cc, d); }
  }
  const ex = {};
  for (const [nombre, fn] of Object.entries(extras)) { const A = (ex[nombre] = new Float32Array(nv)); for (let q = 0; q < nv; q++) A[q] = fn(P[q * 3], P[q * 3 + 1], P[q * 3 + 2]); }
  return { P, N, I: nv > 65535 ? new Uint32Array(I) : new Uint16Array(I), ex };
}
function llenarGeo(geo, d) {
  geo.setAttribute('position', new THREE.BufferAttribute(d.P, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(d.N, 3));
  for (const [nombre, A] of Object.entries(d.ex)) geo.setAttribute(nombre, new THREE.BufferAttribute(A, 1));
  geo.setIndex(new THREE.BufferAttribute(d.I, 1)); geo.computeBoundingSphere();
  return geo;
}

// ─────────────────────────────── formas de la figura ───────────────────────────────
// Cabeza (coordenadas locales, centro de la cabeza): superelipsoide con cara frontal plana (exponente 4),
// sección más ancha abajo (mandíbula de mochi) y nuca redonda.
// La cabeza (secciones, perfil y orejas):
// · de frente es una CAMPANA: lo más ancho abajo (los mofletes), barbilla redonda, y se estrecha hacia arriba.
// · de frente, OJO, es casi cuadrada y con la coronilla PLANA (la sección de arriba del cráneo es un
//   rectángulo): ahí se apoyan las orejas enteras. Redondeada en cúpula, las orejas salían de una pendiente
//   y parecían cuernos.
// · lo que NO tiene es la cara plana: de lado el perfil se curva hacia atrás al subir y las secciones son
//   casi elipses. Con la cara aplanada (lo que había) la cabeza se leía como una caja o una tele.
// `k` es la caída hacia arriba; `n`, `nA`, `nB` el redondeo de lados, coronilla y barbilla de frente; `nZ`
// el de la cara de lado (2 = redonda); `cF`/`cB` el fondo delante y detrás (~0.74 del ancho).
const CAB = { a: 0.76, k: 0.26, b: 0.5, cF: 0.56, cB: 0.58, n: 2.7, nA: 3.5, nB: 2.9, nZ: 2.3 };
// Las orejas son CONOS gruesos, no placas: tienen más fondo que ancho (~1.3×), la base ocupa media
// coronilla, la punta queda a media anchura, y van HACIA ATRÁS en la cabeza. Las placas de antes tenían la
// cara delantera por delante del centro y se les veía el canto.
// La base va abajo y afuera, TANGENTE al lado de la cabeza: así el borde de fuera de la oreja continúa el lado.
// Grandes y juntas: la base de cada una va casi del centro al borde, y entre las dos queda solo una hendidura.
// De lado, además, la oreja NO es un cono puesto encima (así se veía: un gorro de fiesta con hombros delante y
// detrás). La base de la oreja ocupa TODO el fondo de la cabeza y el perfil sube de un tirón hasta la
// punta. Por eso el cono es muy hondo (`fondo`) y lo recorta una cuña (`cuna`): tan honda como la cabeza abajo
// y cada vez más fina hasta la punta, que se va hacia atrás.
// (30-09) Y la oreja que se ve ya no es ese cono: la bola de su base asomaba en la sien («la oreja, donde empieza,
// sobresale»), y la unión suave con el cráneo hinchaba la cabeza justo encima de los ojos. Ahora es un «loft»: la
// sección del cráneo a la altura `yb` se va encogiendo y desplazando hasta la punta. Su base ES el contorno de la
// cabeza (nada asoma, ni en el lateral ni en las esquinas), el lateral sube recto del moflete a la punta,
// y el cono solo queda para recortar los huecos del kabuto. `junta`: hasta dónde van fundidas las dos mitades por
// el centro (separadas antes, abrían un surco en la nuca); `k`: la unión con el cráneo, mínima en la sien y suave en
// la coronilla, donde la frente entra en la oreja.
const OREJA = { base: [0.34, 0.3, -0.06], punta: [0.43, 1.07, -0.2], rb: 0.34, rp: 0.035, fondo: 2.6, pivote: [0.34, 0.32, -0.06],
  cuna: { y: 0.2, D: 0.44, Dp: 0.045, z: 0, suave: 0.08, k: 0.12 },
  loft: { yb: 0.14, c0: [0.37, -0.02], sTip: 0.05, zEsc: 0.95, rp: 0.022, capa: 0.08, junta: [0.38, 0.35, 0.55], k: [0.02, 0.2, 0.3, 0.6] } };
function fCraneo(x, y, z) {
  const w = CAB.a - CAB.k * y;
  // el redondeo de arriba (nA) y el de abajo (nB) se mezclan en una franja: cambiarlo de golpe en y = 0 hacía saltar
  // la superficie a la altura de los ojos, por delante y por detrás (una arista con su sombra en la sien)
  const X = Math.abs(x) / w, Y = Math.abs(y) / CAB.b, m = CAB.nB + (CAB.nA - CAB.nB) * entre(-0.3, 0.3, y / CAB.b), e = (CAB.n + m) / 2;
  const rxy = Math.pow(Math.pow(X, CAB.n) + Math.pow(Y, m), 1 / e);
  const Z = Math.abs(z) / (z > 0 ? CAB.cF : CAB.cB);
  return (Math.pow(Math.pow(rxy, CAB.nZ) + Math.pow(Z, CAB.nZ), 1 / CAB.nZ) - 1) * 0.52;
}
function fOrejaCono(x, y, z) {
  const O = OREJA, F = O.fondo, b = O.base, t = O.punta, C = O.cuna;
  // |x| suavizado: con el abs a secas, las dos orejas se juntaban en una arista que bajaba por la frente
  const cono = conoRedondo(Math.sqrt(x * x + 0.004), y, z / F, b[0], b[1], b[2] / F, t[0], t[1], t[2] / F, O.rb, O.rp);
  const u = (y - C.y) / C.suave, h = Math.min(1, C.suave * (u > 20 ? u : Math.log1p(Math.exp(u))) / (t[1] - C.y));
  return smax(cono, Math.abs(z - (C.z + (t[2] - C.z) * h)) - (C.D + (C.Dp - C.D) * h), C.k);
}
function fOreja(x, y, z) {
  const L = OREJA.loft, T = OREJA.punta, t = Math.min(1, Math.max(0, (y - L.yb) / (T[1] - L.yb))), s = 1 - (1 - L.sTip) * t;
  // |x| redondeado solo cerca del centro (fuera, el borde de la oreja no se mueve)
  const r = L.junta[0] + (0.05 - L.junta[0]) * entre(L.junta[1], L.junta[2], t), ax = Math.abs(x), X = ax < r ? (x * x) / (2 * r) + r / 2 : ax;
  const cx = L.c0[0] + (T[0] - L.c0[0]) * t, cz = L.c0[1] + (T[2] - L.c0[1]) * t, xs = L.c0[0] + (X - cx) / s, zs = L.c0[1] + (z - cz) / (s * L.zEsc);
  // (zEsc: un pelín menos honda que la cabeza, para que la frente y la nuca sigan redondas de lado)
  const d = Math.max(smax(Math.max(fCraneo(xs, L.yb, zs), -xs) * s, L.yb - y, L.capa), y - T[1]);
  return smin(d, Math.hypot(X - T[0], y - (T[1] - L.rp), z - T[2]) - L.rp, 0.02);   // punta redonda, del grueso de la oreja
}
const fCabeza = (x, y, z) => { const K = OREJA.loft.k; return smin(fCraneo(x, y, z), fOreja(x, y, z), K[0] + (K[1] - K[0]) * entre(K[2], K[3], y)); };
const pesoOreja = (x, y) => (Math.sign(x) || 1) * entre(0.36, 0.56, y) * entre(0.08, 0.22, Math.abs(x));

// Cuerpo (suelo en y = 0): tubo con las piernas-tubo hacia delante.
// Tronco de tubo, casi el doble de alto que de ancho.
const TORSO = { a: [0, 0.3, -0.1], b: [0, 0.93, -0.07], r1: 0.28, r2: 0.205 };
const PIERNA = { x: 0.19, y: 0.18, z: 0.22, r: 0.18, med: 0.31, bord: 0.08, abre: 0.1 };   // patas romas, más cortas
function fPierna(x, y, z, s) {
  const P = PIERNA, th = P.abre * s, c = Math.cos(th), sn = Math.sin(th);
  const lx = x - P.x * s, ly = y - P.y, lz = z - P.z;
  const rx = lx * c - lz * sn, rz = lx * sn + lz * c;
  return extruir(Math.sqrt(rx * rx + ly * ly) - P.r, Math.abs(rz) - P.med, P.bord);
}
// El tronco va SOLO. Antes llevaba las piernas fundidas en la misma malla, o sea que estaba sentado por
// construcción: no había forma de levantarlo. Ahora las patas son piezas aparte que giran en la cadera, y
// el culo es redondo (sentado, lo poco que asoma por debajo queda dentro del cojín).
function fCuerpo(x, y, z) {
  const T = TORSO;
  return conoRedondo(x, y, z, T.a[0], T.a[1], T.a[2], T.b[0], T.b[1], T.b[2], T.r1, T.r2);
}
// Una pata: tocón redondeado que cuelga de la cadera (en el origen) hacia −y. De pie apunta al suelo;
// sentado, la cadera gira 90° y apunta hacia delante con la almohadilla mirándote.
// La pata es un palito algo gordito (con 0.17 de radio salían dos tocones del doble de gordos).
// Un poco más fina arriba y un pelín más ancha en el pie: recta de arriba abajo, empezaba y acababa de golpe.
// Y con las RODILLAS un pelín flexionadas : la pata se comba hacia delante a
// media altura. Es lo que le da esa postura relajada y tontorrona; tiesa parecía un palo. Sentado, la comba
// queda hacia arriba: rodillas un poco levantadas.
const PATA_F = { r: 0.1, rTop: 0.082, L: 0.72, bord: 0.065, rodilla: 0.07 };
function fPata(x, y, z) {
  const P = PATA_F, k = Math.min(1, Math.max(0, -y / P.L)), r = P.rTop + (P.r - P.rTop) * k * k;
  const zc = z - P.rodilla * Math.sin(Math.PI * Math.pow(k, 0.85));
  return extruir(Math.hypot(x, zc) - r, Math.abs(y + P.L / 2) - P.L / 2, P.bord);
}
// dónde está la cadera (espacio del tronco) y cuánto sube el cuerpo al ponerse de pie
const CADERA = { x: 0.13, y: 0.18, z: -0.06, abre: 0.08 };
const ALZA = PATA_F.L - CADERA.y;
const PATA = [-1, 1].map((s) => { const th = PIERNA.abre * s, ax = [Math.sin(th), 0, Math.cos(th)];
  return { c: [PIERNA.x * s + ax[0] * PIERNA.med, PIERNA.y, PIERNA.z + ax[2] * PIERNA.med], a: ax }; });
function fOnigiri(x, y, z) {
  const k = Math.sqrt(3), r = 0.13;
  let px = Math.abs(x) - r, py = y + r / k + 0.02;
  if (px + k * py > 0) { const nx = (px - k * py) / 2, ny = (-k * px - py) / 2; px = nx; py = ny; }
  px -= cl(px, -2 * r, 0);
  const d2 = -Math.sqrt(px * px + py * py) * Math.sign(py) - 0.075;
  const hinchado = 0.018 * (1 - cl((x * x + y * y) / 0.06, 0, 1));
  const grano = 0.0035 * (Math.sin(x * 97 + z * 31) * Math.sin(y * 89 - x * 23) * Math.sin(z * 83 + y * 41));
  return extruir(d2, Math.abs(z) - 0.1 - hinchado, 0.07) + grano;
}
// Casco del kabuto: cáscara que sigue la cabeza por encima de la hachimaki, con huecos para las orejas.
function fCasco(x, y, z) {
  let s = Math.abs(fCraneo(x, y, z) - 0.075) - 0.03;
  s = smax(s, 0.372 - y, 0.018);
  return smax(s, -(fOrejaCono(x, y, z) - 0.055), 0.02);
}
// Mallado de las formas (surface nets, ~0,5 s de CPU): en un Worker que arranca al importar el módulo.
// Las geometrías existen ya (vacías) y se rellenan al llegar; preparar() espera a que estén y renderizar() las fuerza.
const FORMAS = {
  cabeza: ['fCabeza', [-0.96, -0.6, -0.7], [0.96, OREJA.punta[1] + OREJA.rp + 0.03, 0.66], 0.0175, { aOreja: 'pesoOreja' }],
  cuerpo: ['fCuerpo', [-0.4, -0.08, -0.5], [0.4, 1.22, 0.3], 0.0175],
  pata: ['fPata', [-0.21, -PATA_F.L - 0.04, -0.21], [0.21, 0.04, 0.21 + PATA_F.rodilla], 0.012],   // la caja sigue a L: si se queda corta, corta el pie (hueco y sin almohadilla)
  onigiri: ['fOnigiri', [-0.3, -0.3, -0.2], [0.3, 0.26, 0.2], 0.0085],
  casco: ['fCasco', [-0.96, 0.3, -0.76], [0.96, 0.68, 0.62], 0.016],
};
function datosForma(nombre) {
  const [f, min, max, h, ex = {}] = FORMAS[nombre], S = { fCabeza, fCuerpo, fPata, fOnigiri, fCasco, pesoOreja };
  return mallarDatos(S[f], min, max, h, Object.fromEntries(Object.entries(ex).map(([k, v]) => [k, S[v]])));
}
const FORMA_GEO = {}, forma = (nombre) => (FORMA_GEO[nombre] ||= new THREE.BufferGeometry());
let formasPromesa = null, formasYa = () => {};
function lanzarFormas() {
  if (formasPromesa) return formasPromesa;
  return (formasPromesa = new Promise((ok) => {
    const faltan = new Set(Object.keys(FORMAS));
    const llega = (nombre, d) => { if (!faltan.delete(nombre)) return; llenarGeo(forma(nombre), d); if (!faltan.size) { w?.terminate(); ok(); } };
    formasYa = () => { for (const n of [...faltan]) llega(n, datosForma(n)); }; // si hacen falta ya (capturas de prueba), aquí mismo
    const w = obrero(`const cl = ${cl}, c01 = ${c01}, suave = ${suave}, entre = ${entre}, smax = ${smax};\n${[smin, conoRedondo, tri2, extruir, fCraneo, fOrejaCono, fOreja, fPierna, fCuerpo, fPata, fOnigiri, fCasco, mallarDatos, datosForma].join('\n')}\n`
      + `const CAB = ${JSON.stringify(CAB)}, OREJA = ${JSON.stringify(OREJA)}, TORSO = ${JSON.stringify(TORSO)}, PIERNA = ${JSON.stringify(PIERNA)}, PATA_F = ${JSON.stringify(PATA_F)}, FORMAS = ${JSON.stringify(FORMAS)};\n`
      + `const fCabeza = ${fCabeza}, pesoOreja = ${pesoOreja};\n`
      + 'onmessage = (e) => { const d = datosForma(e.data); postMessage({ nombre: e.data, d }, [d.P.buffer, d.N.buffer, d.I.buffer, ...Object.values(d.ex).map((a) => a.buffer)]); };');
    if (!w) { formasYa(); return; }
    w.onmessage = (e) => llega(e.data.nombre, e.data.d);
    w.onerror = (e) => { e.preventDefault?.(); formasYa(); };
    for (const n of faltan) w.postMessage(n);
  }));
}
function geosFigura() { return cache('geo:figura', () => ({ cabeza: forma('cabeza'), cuerpo: forma('cuerpo'), pata: forma('pata'), onigiri: forma('onigiri') })); }
const geoCasco = () => cache('geo:casco', () => forma('casco'));
// sección horizontal real de la cabeza a la altura y (para que la hachimaki y la corona abracen la forma)
function seccion(f, y, n, fase = 0) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = fase + (i / n) * TAU, dx = Math.sin(a), dz = Math.cos(a);
    let lo = 0, hi = 1.4;
    for (let it = 0; it < 28; it++) { const m = (lo + hi) / 2; if (f(dx * m, y, dz * m) < 0) lo = m; else hi = m; }
    pts.push([dx * lo, dz * lo]);
  }
  return pts;
}
function radioCabeza(phi, y) { const sx = Math.sin(phi), sz = Math.cos(phi); let lo = 0, hi = 1.4; for (let i = 0; i < 26; i++) { const m = (lo + hi) / 2; if (fCabeza(sx * m, y, sz * m) < 0) lo = m; else hi = m; } return lo; }
function radioTronco(phi, y) {
  const zc = lerp(-0.1, -0.07, c01((y - 0.3) / 0.63)), sx = Math.sin(phi), sz = Math.cos(phi); let lo = 0, hi = 1.2;
  for (let i = 0; i < 26; i++) { const m = (lo + hi) / 2; if (fCuerpo(sx * m, y, zc + sz * m) > 0) hi = m; else lo = m; }
  return lo;
}

// ─────────────── material de vinilo: pintura procedimental + deformación en la GPU ───────────────
const COL = { piel: 0xf4eee5, naranja: 0xe58936, marron: 0x3a2a23, crema: 0xf6dcb4, rosa: 0xef9aa0, tinta: 0x1b1310 };
const GLSL_UTIL = /* glsl */`
float aa(float d){ float w = max(fwidth(d), 1e-4) * 0.9; return 1.0 - smoothstep(-w, w, d); }
float ondas(vec3 p){ return sin(p.x*9.3 + sin(p.y*6.1)*1.3)*0.45 + sin(p.y*12.7 + p.z*4.3)*0.3 + sin(p.z*15.1 - p.x*7.7)*0.25; }
float mancha(vec3 p, vec3 c, vec3 r, float w){ return length((p - c) / r) - 1.0 + ondas(p)*w; }
float triSDF(vec2 p, vec2 p0, vec2 p1, vec2 p2){
  vec2 e0 = p1 - p0, e1 = p2 - p1, e2 = p0 - p2; vec2 v0 = p - p0, v1 = p - p1, v2 = p - p2;
  vec2 q0 = v0 - e0 * clamp(dot(v0, e0) / dot(e0, e0), 0.0, 1.0);
  vec2 q1 = v1 - e1 * clamp(dot(v1, e1) / dot(e1, e1), 0.0, 1.0);
  vec2 q2 = v2 - e2 * clamp(dot(v2, e2) / dot(e2, e2), 0.0, 1.0);
  float s = sign(e0.x * e2.y - e0.y * e2.x);
  vec2 d = min(min(vec2(dot(q0, q0), s * (v0.x * e0.y - v0.y * e0.x)), vec2(dot(q1, q1), s * (v1.x * e1.y - v1.y * e1.x))), vec2(dot(q2, q2), s * (v2.x * e2.y - v2.y * e2.x)));
  return -sqrt(d.x) * sign(d.y);
}`;
function tipoGLSL(v) {
  if (typeof v === 'number') return 'float';
  if (v.isColor || v.isVector3) return 'vec3';
  if (v.isVector2) return 'vec2';
  if (v.isVector4) return 'vec4';
  if (v.isMatrix4) return 'mat4';
  if (v.isTexture) return 'sampler2D';
  return 'float';
}
const declarar = (U) => Object.entries(U).map(([k, x]) => `uniform ${tipoGLSL(x.value)} ${k};`).join('\n');
const fnDeform = (def) => `${def.pars}\nvoid deformar(inout vec3 p, inout vec3 n){\n${def.cuerpo}\n}`;

// def: { pars, cuerpo } → cuerpo de void deformar(inout vec3 p, inout vec3 n) en espacio de objeto
function vinilo(color, o = {}) {
  const { rug = 0.46, cc = 0.35, ccr = 0.3, pintura = '', pintPars = '', u = {}, def = null, pint = false, ...extra } = o;
  const m = new THREE.MeshPhysicalMaterial({ color, roughness: rug, metalness: 0, clearcoat: cc, clearcoatRoughness: ccr, ...extra });
  const U = {}; for (const [k, v] of Object.entries(u)) U[k] = { value: v };
  m.userData.u = U; m.userData.def = def;
  if (!pintura && !def) return m;
  const decl = declarar(U);
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, U);
    let vs = s.vertexShader.replace('#include <common>', `#include <common>\n${decl}\n${pint ? 'attribute vec3 pint;' : ''}\nvarying vec3 vPint; varying vec3 vNPint;\n${def ? fnDeform(def) : ''}`);
    if (def) vs = vs.replace('#include <beginnormal_vertex>', 'vec3 objectNormal; { vec3 _p = position; vec3 _n = normal; deformar(_p, _n); objectNormal = _n; }\n#ifdef USE_TANGENT\nvec3 objectTangent = vec3( tangent.xyz );\n#endif');
    vs = vs.replace('#include <begin_vertex>', `${def ? 'vec3 transformed; { vec3 _p = position; vec3 _n = normal; deformar(_p, _n); transformed = _p; }' : 'vec3 transformed = vec3( position );'}\nvPint = ${pint ? 'pint' : 'position'}; vNPint = normal;`);
    s.vertexShader = vs;
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>\n${decl}\nvarying vec3 vPint; varying vec3 vNPint;\n${GLSL_UTIL}\n${pintPars}`)
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', `vec4 diffuseColor = vec4( diffuse, opacity );\nfloat tinta = 0.0;\n{ vec3 p = vPint; vec3 np = vNPint; vec3 col = diffuseColor.rgb;\n${pintura}\ndiffuseColor.rgb = col; }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.22, tinta);');
  };
  const clave = 'vin|' + pintura + '|' + pintPars + '|' + (def ? def.cuerpo : '') + '|' + decl + (pint ? '|p' : '');
  m.customProgramCacheKey = () => clave;
  return m;
}
// material de profundidad (sombras) con la misma deformación
function matProfundidad(mat) {
  const U = mat.userData.u, def = mat.userData.def;
  const d = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  if (mat.side === THREE.DoubleSide) d.side = THREE.DoubleSide;
  d.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, U);
    s.vertexShader = s.vertexShader.replace('#include <common>', `#include <common>\n${declarar(U)}\n${fnDeform(def)}`)
      .replace('#include <begin_vertex>', 'vec3 transformed; { vec3 _p = position; vec3 _n = normal; deformar(_p, _n); transformed = _p; }');
  };
  const clave = 'prof|' + def.cuerpo + declarar(U);
  d.customProgramCacheKey = () => clave;
  return d;
}
function mallaDeformable(geo, mat) { const m = new THREE.Mesh(geo, mat); m.customDepthMaterial = matProfundidad(mat); m.frustumCulled = false; return m; }
const tela = (color, extra = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.82, sheen: 0.8, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xffffff).lerp(new THREE.Color(color), 0.4), ...extra });
const oro = () => new THREE.MeshPhysicalMaterial({ color: 0xf2c14e, metalness: 1, roughness: 0.26, clearcoat: 0.4, clearcoatRoughness: 0.2 });

// deformaciones
const DEF_OREJAS = { pars: 'attribute float aOreja;', cuerpo: `
  float wN = max(-aOreja, 0.0), wP = max(aOreja, 0.0); vec3 q = p;
  p = mix(p, (uON * vec4(q, 1.0)).xyz, wN); p = mix(p, (uOP * vec4(q, 1.0)).xyz, wP);
  n = normalize(mix(n, mat3(uON) * n, wN)); n = normalize(mix(n, mat3(uOP) * n, wP));` };
const DEF_COLA = { pars: `attribute float aS;
  mat3 rotY(float a){ float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
  mat3 rotZ(float a){ float c = cos(a), s = sin(a); return mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0); }`,
cuerpo: 'mat3 R = rotY(uA1 * pow(aS, 1.3)) * rotZ(uA2 * aS * aS); p = R * (p - uBase) + uBase; n = R * n;' };
// brazo: tubo sobre una Bézier cuadrática (hombro, codo, mano), con mano y hombro esféricos; se dobla en la GPU
const DEF_BRAZO = { pars: `attribute vec3 aTubo;
  vec3 bzB(float t){ float u = 1.0 - t; return u*u*uP0 + 2.0*u*t*uP1 + t*t*uP2; }
  vec3 dbzB(float t){ return 2.0*(1.0 - t)*(uP1 - uP0) + 2.0*t*(uP2 - uP1); }
  void marcoB(float t, out vec3 T, out vec3 S, out vec3 B){ T = normalize(dbzB(t) + vec3(0.0, 1e-5, 0.0)); B = normalize(uBn - dot(uBn, T) * T + vec3(1e-5, 0.0, 0.0)); S = cross(B, T); }
  float radioB(float s){ float r = uR * (1.0 - 0.1 * s);
    if (uManga > 0.0) { float m = 1.0 - smoothstep(uManga - 0.012, uManga + 0.004, s); r = mix(r, uR + 0.03 + uVuelo * s / uManga, m); }
    return r; }`,
cuerpo: `vec3 T, S, B; float parte = aTubo.z;
  if (parte < 0.5) { marcoB(aTubo.x, T, S, B); vec3 d = cos(aTubo.y) * S + sin(aTubo.y) * B; p = bzB(aTubo.x) + d * radioB(aTubo.x); n = d; }
  else if (parte < 1.5) { marcoB(1.0, T, S, B); mat3 M = mat3(S, B, T); vec3 e = vec3(1.0, 0.92, 1.1) * uRM; p = uP2 + M * (p * e); n = normalize(M * (n / e)); }
  else { marcoB(0.0, T, S, B); mat3 M = mat3(S, B, T); p = uP0 + M * (p * uRH); n = M * n; }` };
// tela que ondea (capa y cintas de la hachimaki): posición calculada desde aQ, normal por diferencias
const defTela = (fn) => ({ pars: `attribute vec2 aQ;\nvec3 telaP(vec2 q){ ${fn} }`,
  cuerpo: 'vec2 q = aQ; p = telaP(q); vec3 du = telaP(q + vec2(0.01, 0.0)) - p; vec3 dv = telaP(q + vec2(0.0, 0.01)) - p; n = normalize(cross(du, dv));' });
const DEF_CAPA = { pars: `attribute vec2 aQ;
  vec3 telaP(vec2 q){ float a = (0.5 - q.x) * uAng, v = q.y; float R = mix(uR0, uR1, pow(v, 0.85));
    R += pow(v, 1.4) * (0.032 * sin(uT * 2.3 + q.x * 7.0 + v * 3.0) + 0.014 * sin(uT * 3.7 - q.x * 11.0)) + v * v * uVel;
    R += 0.028 * pow(v, 1.2) * sin(q.x * 6.2831853 * 3.5 + 1.2);
    return vec3(sin(a) * R, mix(uY0, uY1, v), -cos(a) * R - 0.03); }`,
  cuerpo: 'vec2 q = aQ; p = telaP(q); vec3 du = telaP(q + vec2(0.01, 0.0)) - p; vec3 dv = telaP(q + vec2(0.0, 0.01)) - p; n = normalize(cross(dv, du));' };
const DEF_CINTA = defTela(`float f = q.y; float x = (q.x - 0.5) * uAncho + sin(uT * 5.0 + f * 5.0 + uFase) * 0.035 * f;
  float z = sin(uT * 3.4 + f * 4.0 + uFase) * 0.05 * f + f * f * uV;
  return vec3(x, -f * uL, z);`);

// ─────────────────────────────── la cara: rotulador grueso ───────────────────────────────
// la cara (textura dibujada) proyectada de frente sobre la cabeza: la usan Nyan y el reparto
const PINT_CARA = `
      { vec2 uvc = (p.xy - uCaraR.xy) / uCaraR.zw;
        if (p.z > 0.05 && uvc.x > 0.0 && uvc.x < 1.0 && uvc.y > 0.0 && uvc.y < 1.0) {
          vec4 f = texture2D(uCara, uvc); float a = f.a * smoothstep(0.08, 0.4, np.z);
          col = mix(col, f.rgb, a); tinta = a * (1.0 - smoothstep(0.02, 0.25, max(f.r, max(f.g, f.b)))); } }`;
// la misma, para cabezas oscuras (el reparto): la tinta de la cara se vuelve de un color claro (uTintaCara)
// (todo el gris de la cara, de la tinta al blanco de los brillos, se lleva a la escala clara: si solo se aclarase la tinta, el borde suavizado entre tinta y brillo quedaba como un aro oscuro; los colores —rubor, pupilas— se quedan como están)
const PINT_CARA_CLARA = PINT_CARA.replace('col = mix(col, f.rgb, a);', 'float fmx = max(f.r, max(f.g, f.b)), fmn = min(f.r, min(f.g, f.b)); vec3 fc = mix(f.rgb, mix(uTintaCara, vec3(1.0), smoothstep(0.0, 1.0, fmx)), 1.0 - smoothstep(0.04, 0.12, fmx - fmn)); col = mix(col, fc, a);');
const TINTA = '#1b1310';
const GR = 0.046;                                  // grosor del trazo (unidades de cabeza)
const OJO = { x: 0.355, y: -0.02 }, BOCA_Y = -0.245, MOF = { x: 0.575, y: -0.19 };
const CARA = { x0: -0.8, y0: -0.54, w: 1.6, h: 1.0 };

function trazo(c, pts, w = GR, col = TINTA) {
  c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.lineWidth = w; c.strokeStyle = col; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
}
function curva(c, fn, n, w = GR, col = TINTA) { const pts = []; for (let i = 0; i <= n; i++) pts.push(fn(i / n)); trazo(c, pts, w, col); }
function camino(c, fn, n) { c.beginPath(); for (let i = 0; i <= n; i++) { const [x, y] = fn(i / n); if (i) c.lineTo(x, y); else c.moveTo(x, y); } c.closePath(); }
function elipse(c, x, y, rx, ry, col, rot = 0) { c.beginPath(); c.ellipse(x, y, Math.max(rx, 1e-4), Math.max(ry, 1e-4), rot, 0, TAU); c.fillStyle = col; c.fill(); }
function perfil(c, w = GR * 0.75, col = TINTA) { c.lineWidth = w; c.strokeStyle = col; c.lineJoin = 'round'; c.stroke(); }
function mofletes(c, k = 1, col = '#f49a9a', n = 3) {
  for (const s of [-1, 1]) {
    const x = s * MOF.x, y = MOF.y;
    c.save(); c.beginPath(); c.ellipse(x, y, 0.15 * k, 0.088 * k, 0, 0, TAU); c.fillStyle = col; c.fill(); c.clip();
    for (let i = 0; i < n; i++) { const dx = (i - (n - 1) / 2) * 0.06; trazo(c, [[x + dx - 0.024, y - 0.045], [x + dx + 0.024, y + 0.045]], 0.021, 'rgba(255,246,240,0.85)'); }
    c.restore();
  }
}
function judia(c, x, y, k = 1, brillo = 1) {
  elipse(c, x, y, 0.088 * k, 0.128 * k, TINTA);
  elipse(c, x - 0.027 * k, y + 0.05 * k, 0.034 * k * brillo, 0.04 * k * brillo, '#ffffff');
  elipse(c, x + 0.03 * k, y - 0.058 * k, 0.014 * k * brillo, 0.014 * k * brillo, '#ffffff');
}
// abre < 0.2 → ojo cerrado (parpadeo o transición); si no, aplasta en vertical lo que dibuje fn
function ojo(c, x, y, abre, fn, ancho = 0.095) {
  if (abre < 0.2) { curva(c, (u) => [x - ancho + 2 * ancho * u, y - 0.005 - 0.032 * Math.sin(Math.PI * u)], 14, GR * 0.92); return; }
  c.save(); c.translate(x, y); c.scale(1, abre); c.translate(-x, -y); fn(); c.restore();
}
const arco = (c, x, y, w = 0.1, h = 0.105) => curva(c, (u) => [x - w + 2 * w * u, y - 0.04 + h * Math.sin(Math.PI * u)], 18, GR);
const valle = (c, x, y, w = 0.1, h = 0.055) => curva(c, (u) => [x - w + 2 * w * u, y + 0.02 - h * Math.sin(Math.PI * u)], 18, GR);
const omega = (c, y, w = 0.12) => curva(c, (u) => [-w + 2 * w * u, y - 0.064 * Math.abs(Math.sin(TAU * u))], 30, GR * 0.92);
function bocaAbierta(c, y, w, h, lengua = true) {
  const f = (u) => (u < 0.5 ? [-w + 4 * w * u, y + 0.014 * Math.sin(TAU * u)] : [w * Math.cos(Math.PI * (u - 0.5) * 2), y - h * Math.sin(Math.PI * (u - 0.5) * 2)]);
  camino(c, f, 44); c.fillStyle = '#5b1b1c'; c.fill();
  if (lengua) { c.save(); camino(c, f, 44); c.clip(); elipse(c, 0.02, y - h * 0.98, w * 0.62, h * 0.52, '#f2848c'); c.restore(); }
  camino(c, f, 44); perfil(c, GR * 0.8);
}
function gota(c, x, y, r, a = 1) {
  c.save(); c.globalAlpha = a; c.beginPath(); c.moveTo(x, y + r * 1.7);
  c.bezierCurveTo(x + r * 0.6, y + r * 0.6, x + r, y - r * 0.2, x, y - r); c.bezierCurveTo(x - r, y - r * 0.2, x - r * 0.6, y + r * 0.6, x, y + r * 1.7);
  c.fillStyle = '#9fd8ff'; c.fill(); c.lineWidth = 0.014; c.strokeStyle = '#2d5f8a'; c.stroke();
  elipse(c, x - r * 0.3, y - r * 0.1, r * 0.22, r * 0.34, 'rgba(255,255,255,0.9)', 0.3); c.restore();
}
function chispa(c, x, y, r, col = '#ffd84a') {
  c.beginPath(); c.moveTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y - r); c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y + r);
  c.fillStyle = col; c.fill(); perfil(c, 0.012);
}
function estrella5(c, x, y, r, giro, ri = 0.48) { c.beginPath(); for (let i = 0; i <= 10; i++) { const a = giro + Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * ri : r; const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; if (i) c.lineTo(px, py); else c.moveTo(px, py); } c.closePath(); }
function corazon(c, x, y, r) {
  c.beginPath(); c.moveTo(x, y - r);
  c.bezierCurveTo(x + r * 1.6, y + r * 0.3, x + r * 0.9, y + r * 1.45, x, y + r * 0.6);
  c.bezierCurveTo(x - r * 0.9, y + r * 1.45, x - r * 1.6, y + r * 0.3, x, y - r); c.closePath();
}
function espiral(c, x, y, r, rot) { const pts = []; for (let i = 0; i <= 80; i++) { const k = i / 80, a = k * 2.6 * TAU + rot, rr = r * k; pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 1.1]); } trazo(c, pts, GR * 0.62); }
function onda(c, x0, y, w, n, amp, lw = GR * 0.85) { const pts = []; const pasos = n * 8; for (let i = 0; i <= pasos; i++) { const u = i / pasos; pts.push([x0 + w * u, y + amp * Math.sin(u * n * Math.PI)]); } trazo(c, pts, lw); }
// ojo con párpado recto (pend > 0: el lado exterior más alto → decidido/enfado)
function ojoTapado(c, X, Y, s, pend, alto, k = 1, linea = true) {
  const lado = Math.sign(X) || 1, yl = (xx) => Y + alto + pend * (xx - X) * lado;
  ojo(c, X, Y, s.abre, () => {
    c.save(); c.beginPath(); c.moveTo(X - 0.2, yl(X - 0.2)); c.lineTo(X + 0.2, yl(X + 0.2)); c.lineTo(X + 0.2, Y - 0.3); c.lineTo(X - 0.2, Y - 0.3); c.closePath(); c.clip();
    judia(c, X + s.mx * 0.7, Y + s.my * 0.7, k); c.restore();
    if (linea) trazo(c, [[X - 0.115, yl(X - 0.115)], [X + 0.115, yl(X + 0.115)]], GR * 0.85);
  });
}
const L = -OJO.x, R = OJO.x;
// Las 23 caras. s = { abre, t, mx, my }. Cada una trae su lenguaje corporal en Mascota.poseCara.
const CARAS = {
  normal: { parpadea: true, dibujar(c, s) {
    mofletes(c);
    for (const x of [L, R]) { const X = x + s.mx, Y = OJO.y + s.my; ojo(c, X, Y, s.abre, () => judia(c, X, Y)); }
    omega(c, BOCA_Y + 0.035, 0.12);
  } },
  feliz: { dibujar(c) { mofletes(c, 1.1); arco(c, L, OJO.y + 0.005); arco(c, R, OJO.y + 0.005); bocaAbierta(c, BOCA_Y + 0.05, 0.16, 0.16); } },
  risa: { anima: true, dibujar(c, s) {
    mofletes(c, 1.16, '#f58f93'); const Y = OJO.y + 0.01;
    trazo(c, [[L - 0.1, Y + 0.09], [L + 0.085, Y], [L - 0.1, Y - 0.09]], GR * 1.05);
    trazo(c, [[R + 0.1, Y + 0.09], [R - 0.085, Y], [R + 0.1, Y - 0.09]], GR * 1.05);
    bocaAbierta(c, BOCA_Y + 0.065, 0.21, 0.2 + 0.035 * Math.sin(s.t * 17));
    const g = (s.t * 1.3) % 1, g2 = (g + 0.5) % 1;
    gota(c, L - 0.19, Y - 0.02 - g * 0.1, 0.034, 1 - g); gota(c, R + 0.19, Y - 0.02 - g2 * 0.1, 0.034, 1 - g2);
  } },
  estrella: { anima: true, dibujar(c, s) {
    mofletes(c, 1.1); const k = 1 + 0.09 * Math.sin(s.t * 9), gg = Math.sin(s.t * 5) * 0.18;
    for (const x of [L, R]) {
      const X = x + s.mx * 0.5, Y = OJO.y + 0.01;
      estrella5(c, X, Y, 0.155 * k, gg); c.fillStyle = '#ffcf2e'; c.fill(); perfil(c, GR * 0.62);
      estrella5(c, X, Y, 0.068 * k, gg); c.fillStyle = '#fff3b0'; c.fill(); elipse(c, X - 0.036, Y + 0.058, 0.022, 0.022, '#ffffff');
    }
    bocaAbierta(c, BOCA_Y + 0.045, 0.16, 0.16);
  } },
  sorpresa: { parpadea: true, dibujar(c, s) {
    mofletes(c, 0.9);
    for (const x of [L, R]) {
      const X = x, Y = OJO.y + 0.01;
      ojo(c, X, Y, s.abre, () => {
        c.beginPath(); c.ellipse(X, Y, 0.112, 0.124, 0, 0, TAU); c.fillStyle = '#ffffff'; c.fill(); perfil(c, GR * 0.8);
        elipse(c, X + s.mx * 1.2, Y + s.my, 0.044, 0.048, TINTA); elipse(c, X + s.mx * 1.2 + 0.015, Y + s.my + 0.017, 0.013, 0.013, '#ffffff');
      });
      curva(c, (u) => [X - 0.09 + 0.18 * u, Y + 0.215 + 0.04 * Math.sin(Math.PI * u)], 12, GR * 0.8);
    }
    c.beginPath(); c.ellipse(0, BOCA_Y - 0.01, 0.058, 0.078, 0, 0, TAU); c.fillStyle = '#5b1b1c'; c.fill(); perfil(c);
  } },
  triste: { parpadea: true, anima: true, dibujar(c, s) {
    mofletes(c, 0.9, '#f1a9ae'); const Y = OJO.y;
    trazo(c, [[L - 0.12, Y + 0.165], [L + 0.075, Y + 0.225]], GR * 0.85); trazo(c, [[R + 0.12, Y + 0.165], [R - 0.075, Y + 0.225]], GR * 0.85);
    for (const x of [L, R]) {
      const X = x + s.mx * 0.6, YY = Y + s.my * 0.6;
      ojo(c, X, YY, s.abre, () => {
        judia(c, X, YY, 1.06, 1.3);
        c.save(); c.beginPath(); c.ellipse(X, YY, 0.093, 0.136, 0, 0, TAU); c.clip(); elipse(c, X, YY - 0.135, 0.13, 0.072 + 0.01 * Math.sin(s.t * 6), 'rgba(140,205,255,0.95)'); c.restore();
      });
    }
    const g = (s.t * 0.7) % 1; gota(c, L + 0.07, Y - 0.17 - g * 0.22, 0.034, 1 - g * g);
    curva(c, (u) => [-0.11 + 0.22 * u, BOCA_Y - 0.035 + 0.055 * Math.sin(Math.PI * u) + 0.008 * Math.sin(s.t * 22 + u * 9)], 22, GR * 0.85);
  } },
  sueno: { anima: true, dibujar(c, s) {
    mofletes(c, 0.95);
    for (const x of [L, R]) valle(c, x, OJO.y - 0.01, 0.1, 0.05);
    const r = 0.038 + 0.013 * Math.sin(s.t * 2.4);
    c.beginPath(); c.ellipse(0.015, BOCA_Y + 0.01, r, r * 1.1, 0, 0, TAU); c.fillStyle = '#5b1b1c'; c.fill(); perfil(c, GR * 0.7);
  } },
  guino: { parpadea: true, anima: true, dibujar(c, s) {
    mofletes(c, 1.05);
    { const X = L + s.mx, Y = OJO.y + s.my; ojo(c, X, Y, s.abre, () => judia(c, X, Y)); }
    arco(c, R, OJO.y - 0.01);
    chispa(c, R + 0.21, OJO.y + 0.16, 0.058 * (1 + 0.15 * Math.sin(s.t * 6)));
    c.beginPath(); c.ellipse(0.045, BOCA_Y - 0.06, 0.052, 0.064, 0.15, 0, TAU); c.fillStyle = '#f2848c'; c.fill(); perfil(c, GR * 0.6);
    trazo(c, [[0.04, BOCA_Y - 0.03], [0.05, BOCA_Y - 0.095]], 0.013, '#b24a55');
    omega(c, BOCA_Y + 0.02, 0.13);
  } },
  decidido: { parpadea: true, anima: true, dibujar(c, s) {
    mofletes(c, 0.95); const Y = OJO.y, p = 0.01 * Math.sin(s.t * 7);
    trazo(c, [[L - 0.14, Y + 0.24 + p], [L + 0.095, Y + 0.145]], GR * 1.25); trazo(c, [[R + 0.14, Y + 0.24 + p], [R - 0.095, Y + 0.145]], GR * 1.25);
    for (const x of [L, R]) ojoTapado(c, x, Y - 0.015, s, 0.22, 0.03, 1.0, false);
    const w = 0.15, h = 0.08, y = BOCA_Y + 0.01;
    c.beginPath(); c.roundRect(-w, y - h, 2 * w, h * 1.35, 0.045); c.fillStyle = '#ffffff'; c.fill(); perfil(c);
    trazo(c, [[-w + 0.02, y - h * 0.32], [w - 0.02, y - h * 0.32]], 0.015);
    for (const x of [-0.05, 0.05]) trazo(c, [[x, y - h + 0.012], [x, y + h * 0.33 - 0.012]], 0.013);
  } },
  enfado: { anima: true, dibujar(c, s) {
    mofletes(c, 1.3, '#ec7070', 4); const Y = OJO.y;
    trazo(c, [[L - 0.13, Y + 0.25], [L + 0.1, Y + 0.12]], GR * 1.35); trazo(c, [[R + 0.13, Y + 0.25], [R - 0.1, Y + 0.12]], GR * 1.35);
    for (const x of [L, R]) ojoTapado(c, x, Y - 0.02, { ...s, abre: 1 }, 0.42, 0.0, 0.92);
    onda(c, -0.12, BOCA_Y - 0.01, 0.24, 4, 0.03 + 0.006 * Math.sin(s.t * 30));
  } },
  verguenza: { parpadea: true, anima: true, dibujar(c, s) {
    mofletes(c, 1.45, '#f07c82', 5); const Y = OJO.y;
    trazo(c, [[L - 0.11, Y + 0.17], [L + 0.07, Y + 0.215]], GR * 0.8); trazo(c, [[R + 0.11, Y + 0.17], [R - 0.07, Y + 0.215]], GR * 0.8);
    for (const x of [L, R]) { const X = x + 0.035, YY = Y - 0.03 + Math.sin(s.t * 8) * 0.004; ojo(c, X, YY, s.abre, () => judia(c, X, YY, 0.86)); }
    onda(c, -0.08, BOCA_Y, 0.16, 3, 0.018);
    gota(c, -0.64, 0.17 - ((s.t * 0.5) % 1) * 0.04, 0.04);
  } },
  mareo: { anima: true, dibujar(c, s) {
    mofletes(c, 0.9); const Y = OJO.y;
    trazo(c, [[L - 0.1, Y + 0.2], [L + 0.07, Y + 0.23]], GR * 0.8); trazo(c, [[R + 0.1, Y + 0.18], [R - 0.07, Y + 0.2]], GR * 0.8);
    espiral(c, L, Y, 0.11, s.t * 5); espiral(c, R, Y, 0.11, -s.t * 5);
    onda(c, -0.12, BOCA_Y, 0.24, 4, 0.03);
  } },
  amor: { anima: true, dibujar(c, s) {
    mofletes(c, 1.25); const k = 1 + 0.13 * Math.pow(Math.abs(Math.sin(s.t * 4.2)), 3);
    for (const x of [L, R]) { corazon(c, x, OJO.y - 0.005, 0.105 * k); c.fillStyle = '#e8445d'; c.fill(); perfil(c, GR * 0.62); elipse(c, x - 0.04 * k, OJO.y + 0.045 * k, 0.024 * k, 0.017 * k, '#ffffff', 0.5); }
    bocaAbierta(c, BOCA_Y + 0.04, 0.11, 0.11);
  } },
  presumido: { parpadea: true, dibujar(c, s) {
    mofletes(c, 0.95); const Y = OJO.y;
    trazo(c, [[L - 0.1, Y + 0.18], [L + 0.08, Y + 0.18]], GR * 0.95);
    curva(c, (u) => [R - 0.1 + 0.2 * u, Y + 0.225 + 0.045 * Math.sin(Math.PI * u)], 14, GR * 0.95);
    for (const x of [L, R]) ojoTapado(c, x, Y, { ...s, mx: 0.038, my: -0.01 }, 0.0, 0.035, 0.96);
    curva(c, (u) => [-0.1 + 0.24 * u, BOCA_Y + 0.02 - 0.05 * Math.sin(Math.PI * u * 0.75) + 0.07 * u * u], 18, GR * 0.9);
  } },
  llanto: { anima: true, dibujar(c, s) {
    const Y = OJO.y;
    for (const x of [L, R]) {
      c.beginPath(); c.moveTo(x - 0.06, Y - 0.02);
      c.bezierCurveTo(x - 0.075, Y - 0.2, x - 0.035, Y - 0.38, x - 0.07, Y - 0.56); c.lineTo(x + 0.07, Y - 0.56);
      c.bezierCurveTo(x + 0.035, Y - 0.38, x + 0.075, Y - 0.2, x + 0.06, Y - 0.02); c.closePath(); c.fillStyle = 'rgba(128,202,242,0.95)'; c.fill();
      for (let j = 0; j < 3; j++) { const f = (s.t * 1.3 + j / 3) % 1; elipse(c, x + 0.012, Y - 0.06 - f * 0.46, 0.014, 0.04, 'rgba(255,255,255,0.85)'); }
    }
    mofletes(c, 1.1);
    trazo(c, [[L - 0.12, Y + 0.16], [L + 0.075, Y + 0.23]], GR * 0.85); trazo(c, [[R + 0.12, Y + 0.16], [R - 0.075, Y + 0.23]], GR * 0.85);
    for (const x of [L, R]) curva(c, (u) => [x - 0.1 + 0.2 * u, Y - 0.025 + 0.06 * Math.sin(Math.PI * u)], 16, GR * 1.05);
    const w = 0.012 * Math.sin(s.t * 30), f = (u) => [lerp(-0.12, 0.12, u), BOCA_Y + 0.05 + (u - 0.5) * 2 * w];
    c.beginPath(); const a = f(0), b = f(1); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(0.16, BOCA_Y - 0.13); c.quadraticCurveTo(0, BOCA_Y - 0.18, -0.16, BOCA_Y - 0.13); c.closePath();
    c.fillStyle = '#5b1b1c'; c.fill(); c.save(); c.clip(); elipse(c, 0, BOCA_Y - 0.16, 0.1, 0.06, '#f2848c'); c.restore(); perfil(c, GR * 0.8);
  } },
  nom: { anima: true, dibujar(c, s) {
    mofletes(c, 1.2); arco(c, L, OJO.y + 0.005); arco(c, R, OJO.y + 0.005);
    if (Math.sin(s.t * 11) > 0) { c.beginPath(); c.ellipse(0, BOCA_Y - 0.01, 0.07, 0.056, 0, 0, TAU); c.fillStyle = '#5b1b1c'; c.fill(); perfil(c); }
    else omega(c, BOCA_Y + 0.03, 0.11);
    for (const [x, y] of [[-0.17, BOCA_Y - 0.07], [0.19, BOCA_Y - 0.04], [0.11, BOCA_Y - 0.12]]) { c.beginPath(); c.ellipse(x, y, 0.018, 0.012, 0.5, 0, TAU); c.fillStyle = '#ffffff'; c.fill(); perfil(c, 0.009); }
  } },
  pensando: { parpadea: true, anima: true, dibujar(c, s) {
    mofletes(c, 0.9); const Y = OJO.y;
    curva(c, (u) => [L - 0.1 + 0.2 * u, Y + 0.225 + 0.05 * Math.sin(Math.PI * u)], 14, GR * 0.9);
    trazo(c, [[R - 0.1, Y + 0.18], [R + 0.1, Y + 0.17]], GR * 0.9);
    for (const x of [L, R]) { const X = x - 0.03, YY = Y + 0.035; ojo(c, X, YY, s.abre, () => judia(c, X, YY, 0.95)); }
    curva(c, (u) => [0.02 + 0.12 * u, BOCA_Y + 0.01 + 0.025 * Math.sin(Math.PI * u) + 0.008 * Math.sin(s.t * 4)], 12, GR * 0.9);
  } },
  // ── las tontas: casi nunca está «mono», casi siempre está un poco bobo ──
  // chulito (ドヤ顔): su cara de siempre. Cejas rectas y gordas, ojos de punto con el párpado plano
  // (sin raya: cortados) y la ω ancha. Las cejas se le suben solas de vez en cuando.
  doya: { parpadea: true, anima: true, dibujar(c, s) {
    mofletes(c, 0.95); const Y = OJO.y, sube = 0.018 * Math.pow(Math.max(0, Math.sin(s.t * 2.6)), 6);
    trazo(c, [[L - 0.13, Y + 0.2 + sube], [L + 0.1, Y + 0.155 + sube]], GR * 1.35);
    trazo(c, [[R + 0.13, Y + 0.2 + sube], [R - 0.1, Y + 0.155 + sube]], GR * 1.35);
    for (const x of [L, R]) ojoTapado(c, x, Y - 0.03, { ...s, mx: 0.01, my: -0.02 }, -0.05, 0.035, 0.92, false);
    omega(c, BOCA_Y + 0.045, 0.16);
  } },
  // bobo: un ojo enorme y hueco con la pupila perdida y el otro un puntito, y la lengua fuera por un lado
  bobo: { parpadea: true, anima: true, dibujar(c, s) {
    mofletes(c, 1.05); const Y = OJO.y, w = Math.sin(s.t * 3) * 0.012;
    { const X = L - 0.01, YY = Y + 0.02; ojo(c, X, YY, s.abre, () => { c.beginPath(); c.ellipse(X, YY, 0.125, 0.14, 0, 0, TAU); c.fillStyle = '#ffffff'; c.fill(); perfil(c, GR * 0.8); elipse(c, X + 0.05 + w, YY + 0.06, 0.035, 0.038, TINTA); }); }
    { const X = R + 0.02, YY = Y - 0.03; ojo(c, X, YY, s.abre, () => elipse(c, X - 0.02, YY, 0.034, 0.04, TINTA)); }
    c.beginPath(); c.ellipse(0.075, BOCA_Y - 0.035 + w, 0.045, 0.062, -0.3, 0, TAU); c.fillStyle = '#f2848c'; c.fill(); perfil(c, GR * 0.6);
    trazo(c, [[0.07, BOCA_Y - 0.01 + w], [0.084, BOCA_Y - 0.07 + w]], 0.012, '#b24a55');
    curva(c, (u) => [-0.14 + 0.26 * u, BOCA_Y + 0.02 - 0.05 * Math.sin(Math.PI * u) + 0.03 * u], 18, GR * 0.9);
  } },
  // vago: párpados a media asta que caen por fuera, boca de raya y la babilla. Dice que está cansado.
  vago: { parpadea: true, anima: true, dibujar(c, s) {
    mofletes(c, 0.85); const Y = OJO.y;
    for (const x of [L, R]) ojoTapado(c, x, Y - 0.03, { ...s, mx: s.mx * 0.3, my: -0.03 }, -0.08, -0.005, 0.95, true);
    trazo(c, [[-0.075, BOCA_Y + 0.005], [0.075, BOCA_Y - 0.005]], GR * 0.85);
    const g = (s.t * 0.35) % 1; gota(c, 0.1, BOCA_Y - 0.045 - g * 0.05, 0.022 + g * 0.01, 1 - g * 0.6);
  } },
  // aburrido: «ー ー». Te mira sin expresión ninguna. De lo más tonto que hay.
  aburrido: { dibujar(c) {
    mofletes(c, 0.8);
    for (const x of [L, R]) trazo(c, [[x - 0.1, OJO.y], [x + 0.1, OJO.y]], GR * 1.2);
    trazo(c, [[-0.05, BOCA_Y + 0.01], [0.05, BOCA_Y + 0.01]], GR * 0.8);
  } },
  // pánico: ojos enormes y huecos con la pupila diminuta temblando, cejas
  // en onda, la boca en «ロ» y sudor
  panico: { anima: true, dibujar(c, s) {
    mofletes(c, 0.7, '#f3b5b5'); const Y = OJO.y + 0.03, tb = Math.sin(s.t * 40) * 0.008;
    for (const x of [L, R]) { c.beginPath(); c.ellipse(x + tb, Y, 0.13, 0.16, 0, 0, TAU); c.fillStyle = '#ffffff'; c.fill(); perfil(c, GR); elipse(c, x + tb * 2, Y - 0.01, 0.026, 0.03, TINTA); }
    onda(c, L - 0.12, Y + 0.25, 0.22, 2, 0.02); onda(c, R - 0.1, Y + 0.25, 0.22, 2, 0.02);
    const w = 0.12, h = 0.1, y = BOCA_Y - 0.03;
    c.beginPath(); c.roundRect(-w + tb, y - h, 2 * w, h * 1.3, 0.03); c.fillStyle = '#5b1b1c'; c.fill(); perfil(c, GR * 0.9);
    gota(c, R + 0.24, Y + 0.12 - ((s.t * 0.9) % 1) * 0.08, 0.04);
  } },
  // burla: ojos «> <» y la lengua fuera
  bleh: { anima: true, dibujar(c, s) {
    mofletes(c, 1.15); const Y = OJO.y + 0.01, lw = 0.012 * Math.sin(s.t * 14);
    trazo(c, [[L - 0.1, Y + 0.09], [L + 0.085, Y], [L - 0.1, Y - 0.09]], GR * 1.05);
    trazo(c, [[R + 0.1, Y + 0.09], [R - 0.085, Y], [R + 0.1, Y - 0.09]], GR * 1.05);
    c.beginPath(); c.ellipse(0.01 + lw, BOCA_Y - 0.06, 0.055, 0.075, 0, 0, TAU); c.fillStyle = '#f2848c'; c.fill(); perfil(c, GR * 0.6);
    trazo(c, [[0.01 + lw, BOCA_Y - 0.02], [0.01 + lw, BOCA_Y - 0.1]], 0.012, '#b24a55');
    omega(c, BOCA_Y + 0.02, 0.14);
  } },
};
export const EXPRESIONES = Object.keys(CARAS);

class Cara {
  constructor(ancho, fps) {
    this.c = lienzo(ancho, Math.round((ancho * CARA.h) / CARA.w)); this.x = this.c.getContext('2d');
    this.tex = texDe(this.c); this.tex.anisotropy = 8; this.firma = ''; this.fps = fps;
  }
  // Solo redibuja (y sube la textura) cuando cambia algo visible.
  pintar(nombre, s) {
    const def = CARAS[nombre] || CARAS.normal, frame = def.anima ? Math.floor(s.t * this.fps) : 0;
    const firma = `${nombre}|${s.abre.toFixed(2)}|${frame}|${Math.round(s.mx * 300)}|${Math.round(s.my * 300)}|${s.pop.toFixed(3)}`;
    if (firma === this.firma) return false;
    this.firma = firma;
    const { c: el, x: c } = this, W = el.width, H = el.height, k = W / CARA.w;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H);
    c.setTransform(k, 0, 0, -k, -CARA.x0 * k, (CARA.y0 + CARA.h) * k);
    c.lineCap = 'round'; c.lineJoin = 'round';
    if (s.pop !== 1) { c.translate(0, -0.06); c.scale(s.pop, s.pop); c.translate(0, 0.06); }
    def.dibujar(c, { abre: s.abre, t: frame / this.fps, mx: s.mx, my: s.my });
    if (this.extra) this.extra(c, nombre, { abre: s.abre, t: frame / this.fps, mx: s.mx, my: s.my });
    this.tex.needsUpdate = true;
    return true;
  }
}

// ─────────────────────────── «manpu»: símbolos de manga en vinilo 3D ───────────────────────────
const MANPU_COL = { corazon: 0xff5d84, nota: 0x2b2330, gota: 0x8fd6ff, excl: 0xff4b3a, brillo: 0xffc83a, z: 0x5864cf, vena: 0xe8332b, lineas: 0x5d63bd, burbuja: 0xc8ecff, pregunta: 0x2b2330 };
function extrudir(formas, prof = 0.14, bisel = 0.06) {
  const g = new THREE.ExtrudeGeometry(formas, { depth: prof, bevelEnabled: true, bevelThickness: bisel, bevelSize: bisel * 0.8, bevelSegments: 4, curveSegments: 22 });
  g.translate(0, 0, -prof / 2); g.computeVertexNormals(); return g;
}
function geoManpu(tipo) {
  return cache('manpu:' + tipo, () => {
    const S = () => new THREE.Shape();
    switch (tipo) {
      case 'corazon': { const s = S(); s.moveTo(0, -0.5); s.bezierCurveTo(-0.55, -0.05, -0.62, 0.42, -0.26, 0.47); s.bezierCurveTo(-0.08, 0.5, 0, 0.36, 0, 0.26); s.bezierCurveTo(0, 0.36, 0.08, 0.5, 0.26, 0.47); s.bezierCurveTo(0.62, 0.42, 0.55, -0.05, 0, -0.5); return extrudir(s); }
      case 'nota': {
        const cab = S(); cab.absellipse(-0.17, -0.34, 0.2, 0.145, 0, TAU, false, -0.35);
        const palo = S(); palo.moveTo(0.0, -0.34); palo.lineTo(0.08, -0.34); palo.lineTo(0.08, 0.5); palo.lineTo(0.0, 0.5); palo.closePath();
        const ban = S(); ban.moveTo(0.02, 0.5); ban.quadraticCurveTo(0.2, 0.38, 0.32, 0.18); ban.lineTo(0.28, 0.14); ban.quadraticCurveTo(0.18, 0.28, 0.06, 0.32); ban.closePath();
        return mergeGeometries([extrudir(cab, 0.1, 0.04), extrudir(palo, 0.1, 0.03), extrudir(ban, 0.1, 0.03)]);
      }
      case 'gota': { const s = S(); s.moveTo(0, 0.55); s.bezierCurveTo(0.12, 0.3, 0.38, 0.05, 0.36, -0.18); s.bezierCurveTo(0.34, -0.45, 0.14, -0.55, 0, -0.55); s.bezierCurveTo(-0.14, -0.55, -0.34, -0.45, -0.36, -0.18); s.bezierCurveTo(-0.38, 0.05, -0.12, 0.3, 0, 0.55); return extrudir(s, 0.16, 0.08); }
      case 'excl': { const b = S(); b.moveTo(-0.13, 0.55); b.lineTo(0.13, 0.55); b.lineTo(0.07, -0.16); b.lineTo(-0.07, -0.16); b.closePath(); const p = S(); p.absarc(0, -0.42, 0.11, 0, TAU, false); return mergeGeometries([extrudir(b), extrudir(p)]); }
      case 'brillo': { const s = S(); s.moveTo(0, 0.55); s.quadraticCurveTo(0.07, 0.07, 0.55, 0); s.quadraticCurveTo(0.07, -0.07, 0, -0.55); s.quadraticCurveTo(-0.07, -0.07, -0.55, 0); s.quadraticCurveTo(-0.07, 0.07, 0, 0.55); return extrudir(s, 0.12, 0.05); }
      case 'z': { const s = S(); [[-0.4, 0.45], [0.4, 0.45], [0.4, 0.3], [-0.12, -0.3], [0.4, -0.3], [0.4, -0.45], [-0.4, -0.45], [-0.4, -0.3], [0.12, 0.3], [-0.4, 0.3]].forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); s.closePath(); return extrudir(s, 0.12, 0.04); }
      case 'vena': {
        const piezas = [];
        for (const [sx, sy] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) {
          const cx = sx * 0.36, cy = sy * 0.36, ac = Math.atan2(-sy, -sx), s = S();
          for (let i = 0; i <= 12; i++) { const a = ac - 0.72 + (1.44 * i) / 12; const x = cx + Math.cos(a) * 0.32, y = cy + Math.sin(a) * 0.32; if (i) s.lineTo(x, y); else s.moveTo(x, y); }
          for (let i = 12; i >= 0; i--) { const a = ac - 0.72 + (1.44 * i) / 12; s.lineTo(cx + Math.cos(a) * 0.2, cy + Math.sin(a) * 0.2); }
          s.closePath(); piezas.push(extrudir(s, 0.1, 0.035));
        }
        return mergeGeometries(piezas);
      }
      case 'lineas': return mergeGeometries([[-0.33, 0.62], [-0.11, 0.9], [0.11, 0.74], [0.33, 0.5]].map(([x, l]) => { const g = new THREE.CapsuleGeometry(0.045, l, 6, 14); g.translate(x, 0.45 - l / 2, 0); return g; }));
      case 'pregunta': {
        const curvaQ = new THREE.CatmullRomCurve3([[-0.24, 0.26, 0], [-0.19, 0.47, 0], [0.04, 0.56, 0], [0.25, 0.44, 0], [0.24, 0.22, 0], [0.06, 0.08, 0], [0.0, -0.14, 0]].map((p) => V3(...p)));
        const tubo = new THREE.TubeGeometry(curvaQ, 48, 0.075, 14, false);
        const tapaA = new THREE.SphereGeometry(0.075, 14, 10); tapaA.translate(-0.24, 0.26, 0);
        const tapaB = new THREE.SphereGeometry(0.075, 14, 10); tapaB.translate(0, -0.14, 0);
        const punto = new THREE.SphereGeometry(0.1, 18, 12); punto.translate(0, -0.42, 0);
        [tubo, tapaA, tapaB, punto].forEach((g) => { g.deleteAttribute('uv'); });
        return mergeGeometries([tubo, tapaA, tapaB, punto]);
      }
      case 'burbuja': return new THREE.SphereGeometry(0.5, 32, 20);
      default: return new THREE.SphereGeometry(0.3, 16, 12);
    }
  });
}
// Qué símbolos acompañan a cada cara (posición en unidades de cabeza)
const MANPU_DE = {
  feliz: [['nota', [0.98, 0.72, 0.25], { vida: 1.6 }], ['corazon', [-1.0, 0.58, 0.3], { vida: 1.5, retraso: 0.2 }]],
  risa: [['brillo', [1.02, 0.55, 0.3], { vida: 0.9 }], ['brillo', [-1.02, 0.7, 0.3], { vida: 0.9, retraso: 0.12 }]],
  estrella: [['brillo', [1.02, 0.74, 0.3], { fijo: 1, escala: 0.3 }], ['brillo', [-1.06, 0.5, 0.3], { fijo: 1, escala: 0.22, fase: 1.3 }], ['brillo', [0.62, 1.12, 0.1], { fijo: 1, escala: 0.17, fase: 2.4 }]],
  sorpresa: [['excl', [0.92, 0.98, 0.15], { vida: 1.4, escala: 0.36 }], ['gota', [-0.98, 0.46, 0.35], { vida: 1.6, escala: 0.22 }]],
  triste: [['lineas', [-0.32, 0.66, 0.52], { fijo: 1, escala: 0.4, suave: 1 }], ['gota', [0.98, 0.42, 0.35], { fijo: 1, escala: 0.2 }]],
  sueno: [['z', [0.9, 0.86, 0.15], { fijo: 1, escala: 0.26, sube: 1 }], ['z', [0.9, 0.86, 0.15], { fijo: 1, escala: 0.18, sube: 1, fase: 0.5 }], ['burbuja', [0.12, -0.14, 0.6], { fijo: 1, escala: 0.15, burbuja: 1 }]],
  guino: [['corazon', [1.02, 0.7, 0.3], { vida: 1.6, escala: 0.26 }]],
  decidido: [['brillo', [1.0, 0.62, 0.3], { fijo: 1, escala: 0.2, fase: 0.6 }], ['brillo', [-1.02, 0.66, 0.3], { fijo: 1, escala: 0.16, fase: 2.1 }]],
  enfado: [['vena', [0.86, 0.82, 0.25], { fijo: 1, escala: 0.3, late: 1 }]],
  verguenza: [['gota', [-1.0, 0.5, 0.3], { fijo: 1, escala: 0.2 }]],
  mareo: [0, 1, 2].map((i) => ['brillo', [0, 0.95, 0], { fijo: 1, escala: 0.16, orbita: 1, fase: (i * TAU) / 3 }]),
  amor: [0, 1, 2].map((i) => ['corazon', [(i - 1) * 0.8, 0.7, 0.3], { fijo: 1, escala: 0.2, sube: 1, fase: i / 3 }]),
  presumido: [['brillo', [1.0, 0.36, 0.35], { vida: 1.3, escala: 0.22 }]],
  llanto: [['gota', [-1.0, 0.1, 0.3], { fijo: 1, escala: 0.18, salta: -1 }], ['gota', [1.0, 0.1, 0.3], { fijo: 1, escala: 0.18, salta: 1, fase: 0.5 }]],
  nom: [['nota', [0.98, 0.72, 0.25], { vida: 1.4, escala: 0.24 }]],
  pensando: [['pregunta', [0.92, 0.9, 0.2], { fijo: 1, escala: 0.34 }]],
};
function crearNube() {
  const g = new THREE.Group(), m = vinilo(0x9ba7ba, { rug: 0.5, cc: 0.3 });
  const bola = cache('geo:esfera24', () => new THREE.SphereGeometry(1, 24, 16));
  for (const [x, y, r] of [[0, 0, 0.17], [-0.17, -0.04, 0.12], [0.17, -0.035, 0.13], [0.07, 0.085, 0.13], [-0.08, 0.06, 0.11]]) { const s = new THREE.Mesh(bola, m); s.scale.setScalar(r); s.position.set(x, y, 0); g.add(s); }
  const mg = vinilo(0x7cc4ee, { rug: 0.18, cc: 1 });
  const gotas = [0, 1, 2, 3].map((i) => { const d = new THREE.Mesh(geoManpu('gota'), mg); d.scale.setScalar(0.07); d.userData = { f: i / 4, x: -0.15 + i * 0.1 }; g.add(d); return d; });
  g.position.set(0.1, 1.22, 0.1); g.scale.setScalar(1e-3); g.visible = false; sombrear(g);
  return { g, gotas, esc: 0, activa: false };
}

// ─────────────────────────────── el gato ───────────────────────────────
// Brazos de palo, cortos y rechonchos: con 0.8 de largo eran fideos.
const BRAZO = { L: 0.64, r: 0.088, mano: 0.108, hombro: [0.235, 0.84, -0.06] };
function geoBrazo() {
  return cache('geo:brazo', () => {
    const nS = 40, nT = 18, pos = [], nor = [], tub = [], idx = [], fila = nT + 1;
    for (let i = 0; i <= nS; i++) for (let j = 0; j <= nT; j++) { pos.push(0, 0, 0); nor.push(0, 1, 0); tub.push(i / nS, (j / nT) * TAU, 0); }
    for (let i = 0; i < nS; i++) for (let j = 0; j < nT; j++) { const a = i * fila + j, b = (i + 1) * fila + j, c = a + 1, d = b + 1; idx.push(a, c, b, c, d, b); }
    const esfera = (seg, parte) => {
      const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.7)), base = pos.length / 3, p = g.attributes.position, n = g.attributes.normal;
      for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); tub.push(parte === 1 ? 1 : 0, 0, parte); }
      for (const k of g.index.array) idx.push(base + k);
    };
    esfera(24, 1); esfera(18, 2);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geo.setAttribute('aTubo', new THREE.Float32BufferAttribute(tub, 3));
    geo.setAttribute('pint', new THREE.Float32BufferAttribute(tub, 3));
    geo.setIndex(idx);
    geo.boundingSphere = new THREE.Sphere(V3(0, 0.9, 0), 2);
    return geo;
  });
}
// Cola corta y gorda, un gancho: la larga y rayada era de gato de verdad, y aquí el cuerpo no cuenta nada.
const COLA_PTS = [[0.05, 0.1, -0.3], [0.3, 0.07, -0.4], [0.5, 0.14, -0.3], [0.6, 0.3, -0.16], [0.58, 0.44, -0.1]];
// la cola en la CPU (misma flexión que DEF_COLA) para que las patas la esquiven
const COLA_S = [0, 0.14, 0.28, 0.42, 0.56, 0.7, 0.84, 1], COLA_REP = (() => { const c = new THREE.CatmullRomCurve3(COLA_PTS.map((p) => V3(...p))); return COLA_S.map((s) => c.getPointAt(s)); })();
function colaCPU(a1, a2, out) {
  const b = COLA_REP[0];
  COLA_S.forEach((s, i) => {
    const p = COLA_REP[i], z = a2 * s * s, y = a1 * Math.pow(s, 1.3), cz = Math.cos(z), sz = Math.sin(z), cy = Math.cos(y), sy = Math.sin(y);
    const x0 = p.x - b.x, y0 = p.y - b.y, z0 = p.z - b.z, x1 = cz * x0 - sz * y0, y1 = sz * x0 + cz * y0;
    (out[i] ||= V3()).set(cy * x1 + sy * z0 + b.x, y1 + b.y, -sy * x1 + cy * z0 + b.z);
  });
  return out;
}
function geoCola() {
  return cache('geo:cola', () => {
    const curvaC = new THREE.CatmullRomCurve3(COLA_PTS.map((p) => V3(...p)));
    const tubo = new THREE.TubeGeometry(curvaC, 80, 0.078, 18, false);
    { const p = tubo.attributes.position, uv = tubo.attributes.uv, c = V3(), v = V3();
      for (let i = 0; i < p.count; i++) { const s = uv.getX(i); curvaC.getPointAt(s, c); v.fromBufferAttribute(p, i).sub(c).multiplyScalar(1 - 0.22 * s); p.setXYZ(i, c.x + v.x, c.y + v.y, c.z + v.z); } }
    const nT = tubo.attributes.position.count, fin = curvaC.getPointAt(1);
    const punta = new THREE.SphereGeometry(0.078 * 0.78, 20, 14); punta.translate(fin.x, fin.y, fin.z);
    const inicio = new THREE.SphereGeometry(0.078, 20, 14); const ini = curvaC.getPointAt(0); inicio.translate(ini.x, ini.y, ini.z);
    const g = mergeGeometries([tubo, punta, inicio]); g.computeVertexNormals();
    const s = new Float32Array(g.attributes.position.count);
    for (let i = 0; i < s.length; i++) s[i] = i < nT ? tubo.attributes.uv.getX(i) : i < nT + punta.attributes.position.count ? 1 : 0;
    g.setAttribute('aS', new THREE.BufferAttribute(s, 1));
    conPint(g, (v, i) => V3(s[i], 0, 0));
    return g;
  });
}
// E (opcional): otra especie del reparto (reparto.js) con su cabeza, colores y dibujos; sin E, Nyan tal cual
function crearGato(anchoCara, fps, E = null) {
  const G = geosFigura();
  const figura = new THREE.Group();                               // se coloca en el asiento; salta
  const cuerpo = new THREE.Group(); figura.add(cuerpo);           // se aplasta y estira desde el suelo
  const naranja = new THREE.Color(COL.naranja), marron = new THREE.Color(COL.marron);

  // tronco liso, sin manchas de calicó: el color va en UN bloque plano de borde limpio, y la marca
  // es la oreja naranja (en la cabeza)
  const matCuerpo = vinilo(E?.cuerpo?.color ?? COL.piel, E?.cuerpo?.mat || {});
  const tronco = new THREE.Mesh(G.cuerpo, matCuerpo); cuerpo.add(tronco);
  if (E?.cuerpo?.escala) tronco.scale.set(...E.cuerpo.escala);

  // Patas: tocones que giran en la cadera (sentado, de pie, andando, encogidas en el salto). Van colgadas de
  // la FIGURA y no del cuerpo, para que el aplastamiento del salto no las arrastre: los pies se quedan en el
  // suelo y es el cuerpo el que se aplasta encima. En la planta, las almohadillas (las puntas de otro color
  // son rasgo de familia del reparto).
  const matPata = vinilo(E?.pata?.color ?? COL.piel, { ...(E?.mate || {}), u: { uRosa: new THREE.Color(E?.pata?.almohadilla ?? COL.rosa), ...(E?.pata?.u || {}) },
    pintPars: `float almohadilla(vec3 p, vec3 np){
      float fr = smoothstep(0.55, 0.8, -normalize(np).y);
      vec2 uv = vec2(p.x, p.z) / 0.6;            // la planta es más pequeña que antes (pata de palito)
      float d = (length((uv - vec2(0.0, -0.03)) / vec2(0.058, 0.045)) - 1.0) * 0.045;
      d = min(d, length(uv - vec2(-0.058, 0.038)) - 0.025); d = min(d, length(uv - vec2(0.0, 0.062)) - 0.025); d = min(d, length(uv - vec2(0.058, 0.038)) - 0.025);
      return aa(d) * fr; }`,
    pintura: (E?.pata?.pintura || '') + 'col = mix(col, uRosa, almohadilla(p, np));' });
  const patas = [-1, 1].map((s) => {
    const cadera = new THREE.Group(); cadera.rotation.order = 'YXZ'; figura.add(cadera);
    cadera.add(new THREE.Mesh(G.pata, matPata));
    return { s, cadera };
  });

  // brazos (Bézier en la GPU); la manga del haori se pinta y se ensancha en el propio brazo
  const brazos = [-1, 1].map((lado) => {
    const mat = vinilo(E?.brazo?.color ?? COL.piel, { ...(E?.mate || {}),
      def: DEF_BRAZO, pint: true,
      u: { uP0: V3(BRAZO.hombro[0] * lado, BRAZO.hombro[1], BRAZO.hombro[2]), uP1: V3(), uP2: V3(), uBn: V3(0, 0, 1), uR: BRAZO.r, uRM: BRAZO.mano, uRH: 0.085, uManga: 0, uVuelo: 0.045, uPuno: 0.008, uConTex: 0, uTexM: texC('blanco', 4, 4, (c) => { c.fillStyle = '#fff'; c.fillRect(0, 0, 4, 4); }), uUM: new THREE.Vector2(0, 1), uColManga: new THREE.Color(0x3aa7b8), uBlanco: new THREE.Color(0xfbf7ee), uEri: new THREE.Color(0xfbf7ee), ...(E?.brazo?.u || {}) },
      pintura: (E?.brazo?.pintura || '') + `if (uManga > 0.0) {
        float esManga = p.z > 1.5 ? 1.0 : (p.z < 0.5 ? aa(p.x - uManga) : 0.0);
        float tri = abs(fract(p.y / 6.2831853 * 9.0) - 0.5) * 2.0;
        float dandara = aa((uManga - p.x) - (0.05 + 0.12 * tri));
        float puno = uPuno > 0.0 ? aa(abs(p.x - uManga + uPuno) - uPuno) : 0.0;
        vec3 tela = uConTex > 0.5 ? texture2D(uTexM, vec2(uUM.x + fract(p.y / 6.2831853) * uUM.y, 1.0 - 0.9 * p.x / uManga)).rgb : mix(uColManga, uBlanco, dandara);
        col = mix(col, mix(tela, uEri, puno), esManga); }`,
    });
    const malla = mallaDeformable(geoBrazo(), mat); cuerpo.add(malla);
    return new Brazo(lado, mat, malla);
  });
  const anclaR = new THREE.Group(), anclaL = new THREE.Group(); cuerpo.add(anclaR, anclaL);

  // onigiri en la pata derecha
  const matOnigiri = vinilo(0xfbf7ee, { rug: 0.62, cc: 0.12, u: { uNori: new THREE.Color(0x1c2620) },
    pintura: 'float m = aa(max(abs(p.x) - 0.095, p.y + 0.035)); col = mix(col, uNori * (0.85 + 0.3 * fract(sin(dot(floor(p * 60.0), vec3(12.9, 78.2, 37.7))) * 43758.5)), m); tinta = m * 0.35;' });
  const onigiri = new THREE.Mesh(G.onigiri, matOnigiri); onigiri.rotation.set(-0.12, 0.35, 0.1);
  const onigiriG = new THREE.Group(); onigiriG.add(onigiri); anclaR.add(onigiriG);

  // cola: bandas naranja y marrón, se menea en la GPU
  const matCola = vinilo(E?.cola?.color ?? COL.piel, { ...(E?.mate || {}), def: DEF_COLA, pint: true, u: { uBase: V3(...(E?.cola?.base || COLA_PTS[0])), uA1: 0, uA2: 0, uNar: naranja, uMar: marron, ...(E?.cola?.u || {}) },
    pintura: E?.cola?.pintura ?? 'float s = p.x; col = mix(col, uNar, aa(0.78 - s));' });   // blanca, con la punta naranja a juego con la oreja
  const cola = mallaDeformable(E?.cola?.geo || geoCola(), matCola); cuerpo.add(cola);

  // cuello → cabeza
  const cuello = new THREE.Group(); cuello.position.set(0, 0.93, -0.02); cuerpo.add(cuello);
  const cabezaSq = new THREE.Group(); cuello.add(cabezaSq);
  const cabeza = new THREE.Group(); cabeza.position.set(0, 0.49, 0.02); cabezaSq.add(cabeza);
  const cara = new Cara(anchoCara, fps);
  const O = OREJA, F = O.fondo, f3 = (v) => v.toFixed(4);
  const matCabeza = vinilo(COL.piel, {
    def: DEF_OREJAS,
    u: { uNar: naranja, uMar: marron, uCrema: new THREE.Color(0xfcd6a6), uCremaNar: new THREE.Color(0xf7c79a), uCara: cara.tex, uCaraR: new THREE.Vector4(CARA.x0, CARA.y0, CARA.w, CARA.h), uON: new THREE.Matrix4(), uOP: new THREE.Matrix4() },
    // el cono de la oreja (espejado): t a lo largo del eje, distancia a su superficie, desplazamiento lateral
    pintPars: `vec3 conoOreja(vec3 p){
      vec3 q = vec3(abs(p.x), p.y, p.z / ${f3(F)});
      vec3 a = vec3(${f3(O.base[0])}, ${f3(O.base[1])}, ${f3(O.base[2] / F)}), b = vec3(${f3(O.punta[0])}, ${f3(O.punta[1])}, ${f3(O.punta[2] / F)});
      vec3 ab = b - a; float t = clamp(dot(q - a, ab) / dot(ab, ab), 0.0, 1.0); vec3 c = a + ab * t;
      return vec3(t, length(q - c) - mix(${f3(O.rb)}, ${f3(O.rp)}, t), q.x - c.x); }
    float fueraCraneo(vec3 p){
      float w = ${f3(CAB.a)} - ${f3(CAB.k)} * p.y, mY = p.y > 0.0 ? ${f3(CAB.nA)} : ${f3(CAB.nB)};
      return pow(pow(abs(p.x) / w, ${f3(CAB.n)}) + pow(abs(p.y) / ${f3(CAB.b)}, mY), 2.0 / (${f3(CAB.n)} + mY)); }`,
    // LA MARCA: la oreja de su derecha, naranja ENTERA, cortada justo donde sale de la cabeza (el contorno del
    // cráneo), con el filo limpio. Antes el naranja bajaba en franja por el lado hasta el moflete.
    pintura: `
      { vec3 o = conoOreja(p); float fuera = aa(0.975 - fueraCraneo(p));
        // la oreja entera, también su raíz (el redondeo con la cabeza): cortando por el contorno se quedaba
        // naranja solo la punta, como un calcetín
        col = mix(col, uNar, aa(o.y - 0.075) * aa(0.9 - fueraCraneo(p)) * step(p.x, -0.02) * step(0.02, o.x));
        // el triángulo de dentro, en la cara delantera de la oreja (en la naranja, melocotón: en crema, de
        // frente la oreja parecía blanca con ribete)
        float r = mix(${f3(O.rb)}, ${f3(O.rp)}, o.x);
        float dentro = aa(abs(o.z) - 0.62 * r) * aa(o.y - 0.06) * step(0.16, o.x) * step(o.x, 0.88) * smoothstep(0.05, 0.3, np.z) * fuera;
        col = mix(col, p.x < 0.0 ? uCremaNar : uCrema, dentro); }
      { vec2 uvc = (p.xy - uCaraR.xy) / uCaraR.zw;
        if (p.z > 0.05 && uvc.x > 0.0 && uvc.x < 1.0 && uvc.y > 0.0 && uvc.y < 1.0) {
          vec4 f = texture2D(uCara, uvc); float a = f.a * smoothstep(0.08, 0.4, np.z);
          col = mix(col, f.rgb, a); tinta = a * (1.0 - smoothstep(0.02, 0.25, max(f.r, max(f.g, f.b)))); } }`,
  });
  const EC = E?.cabeza, matCab = EC ? vinilo(EC.color, { def: DEF_OREJAS, ...(EC.mat || {}),
    u: { ...(EC.u || {}), uCara: cara.tex, uCaraR: new THREE.Vector4(CARA.x0, CARA.y0, CARA.w, CARA.h), uON: new THREE.Matrix4(), uOP: new THREE.Matrix4() },
    pintPars: EC.pintPars || '', pintura: (EC.pintura || '') + (EC.u?.uTintaCara ? PINT_CARA_CLARA : PINT_CARA) + (EC.pinturaFinal || '') }) : matCabeza;
  const craneo = new THREE.Mesh(EC?.geo || G.cabeza, matCab); craneo.customDepthMaterial = matProfundidad(matCab); cabeza.add(craneo);
  const manpu = new THREE.Group(); cabeza.add(manpu);
  if (E?.cara) cara.extra = E.cara;
  const g = { figura, cuerpo, tronco, patas, brazos, anclaR, anclaL, onigiri: onigiriG, matOnigiri, cola, cuello, cabezaSq, cabeza, craneo, cara, matCabeza: matCab, manpu,
    especie: E?.id || 'nyan', fCabeza: EC?.f || null, pivote: EC?.pivote || null };
  E?.extras?.(g);
  sombrear(figura);
  return g;
}

// Brazo: la mano sigue a su objetivo con un muelle y el codo se calcula para conservar la longitud.
const _D = V3(), _b = V3(), _M = V3(), _t = V3(), _N = V3(), _A1 = V3(), _A2 = V3();
// Choques: lleva p (en el espacio del campo f) a distancia ≥ r de la superficie con pasos de Newton; n = normal de salida.
const _G = V3();
function empujar(f, p, r, n) {
  let emp = false;
  for (let i = 0; i < 4; i++) {
    const d = f(p.x, p.y, p.z) - r; if (!(d < 0)) break; // !(d < 0) y no d >= 0: así un NaN también sale
    const e = 0.004; _G.set(f(p.x + e, p.y, p.z) - f(p.x - e, p.y, p.z), f(p.x, p.y + e, p.z) - f(p.x, p.y - e, p.z), f(p.x, p.y, p.z + e) - f(p.x, p.y, p.z - e)).divideScalar(2 * e);
    const l2 = _G.lengthSq(); if (l2 < 1e-8) break;
    p.addScaledVector(_G, (-d / l2) * 1.05); emp = true; if (n) n.copy(_G).normalize();
  }
  return emp;
}
const sdToro = (x, y, z, cy, cz, R, r) => Math.hypot(Math.hypot(x, z - cz) - R, y - cy) - r;
// distancia del punto p al tramo a–b (Vector3)
function dSeg(p, a, b) {
  const bx = b.x - a.x, by = b.y - a.y, bz = b.z - a.z, px = p.x - a.x, py = p.y - a.y, pz = p.z - a.z;
  const bb = bx * bx + by * by + bz * bz, h = bb > 1e-12 ? cl((px * bx + py * by + pz * bz) / bb, 0, 1) : 0;
  return Math.hypot(px - bx * h, py - by * h, pz - bz * h);
}
function sdCapsula(x, y, z, a, b, r) {
  const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2], px = x - a[0], py = y - a[1], pz = z - a[2];
  const bb = bx * bx + by * by + bz * bz, h = bb > 1e-12 ? cl((px * bx + py * by + pz * bz) / bb, 0, 1) : 0;
  return Math.hypot(px - bx * h, py - by * h, pz - bz * h) - r;
}
function largoBezier(a, b, c) {
  let s = 0, px = a.x, py = a.y, pz = a.z;
  for (let i = 1; i <= 8; i++) { const t = i / 8, u = 1 - t, k0 = u * u, k1 = 2 * u * t, k2 = t * t; const x = k0 * a.x + k1 * b.x + k2 * c.x, y = k0 * a.y + k1 * b.y + k2 * c.y, z = k0 * a.z + k1 * b.z + k2 * c.z; s += Math.hypot(x - px, y - py, z - pz); px = x; py = y; pz = z; }
  return s;
}
const _bp = V3(), _eje = V3(), _cr = V3();
class Brazo {
  constructor(lado, mat, malla) {
    this.lado = lado; this.malla = malla; this.u = mat.userData.u; this.P0 = this.u.uP0.value;
    this.m = V3(); this.v = V3(); this.c = V3(); this.P1 = V3(); this.P2 = V3(); this.T = V3(); this.S = V3(); this.B = V3(); this.listo = false;
  }
  // lim(p, n): saca la mano de la cabeza y del cuerpo (y deja en n la normal de salida); se quita la velocidad que entra
  seguir(dt, objM, objC, k = 170, d = 15, lim = null) {
    if (!this.listo) { this.m.copy(objM); this.c.copy(objC).normalize(); this.listo = true; }
    const n = Math.max(1, Math.ceil(dt / (1 / 120))), h = dt / n;
    for (let i = 0; i < n; i++) {
      _t.subVectors(objM, this.m).multiplyScalar(k).addScaledVector(this.v, -d); this.v.addScaledVector(_t, h); this.m.addScaledVector(this.v, h);
      if (!lim) continue;
      for (let j = 0; j < 2; j++) {
        _t.subVectors(this.m, this.P0); const l = _t.length(), mx = BRAZO.L * 0.97;
        if (l > mx) { this.m.copy(this.P0).addScaledVector(_t, mx / l); const vr = this.v.dot(_t) / l; if (vr > 0) this.v.addScaledVector(_t, -vr / l); }
        if (!lim(this.m, _N)) break;
        const vn = this.v.dot(_N); if (vn < 0) this.v.addScaledVector(_N, -vn * 1.4);
      }
    }
    this.c.lerp(objC, 1 - Math.exp(-dt * 9)).normalize();
    this.resolver();
    // el propio tubo (antebrazo y codo) tampoco entra: se aparta la mano y el codo se dobla hacia fuera
    if (lim) for (let it = 0; it < 3; it++) {
      let mov = false;
      for (const s of [0.5, 0.68, 0.84]) {
        this.punto(s, _A1); _A2.copy(_A1);
        // el empujón a la mano, al 60 %: entero (1/s, el doble a media pata) se pasaba y rebotaba contra el muelle
        if (lim(_A2, _N, this.radio(s))) { _A2.sub(_A1); this.m.addScaledVector(_A2, 0.6 / s); this.c.addScaledVector(_A2.normalize(), 0.6).normalize(); mov = true; }
      }
      if (!mov) break;
      lim(this.m, _N); this.resolver();
    }
  }
  punto(s, out) { const w = 1 - s; return out.set(0, 0, 0).addScaledVector(this.P0, w * w).addScaledVector(this.P1, 2 * w * s).addScaledVector(this.P2, s * s); }
  // radio para los choques. El vuelo de la manga es tela: se cuenta como mucho 0,02. Con el del yukata entero (una manga
  // ancha y larga, 0,18 de radio a media pata) rozaba el cuerpo en cada fotograma, empujaba la mano y el muelle la
  // devolvía: el brazo temblaba sin parar.
  radio(s) { const U = this.u, mg = U.uManga.value; return s < mg ? U.uR.value + 0.03 + Math.min(U.uVuelo.value, 0.02) * s / mg : U.uR.value * (1 - 0.1 * s); }
  resolver() {
    const P0 = this.P0, Lb = BRAZO.L;
    _D.subVectors(this.m, P0); let d = _D.length();
    const max = Lb * 0.985; if (d > max) { _D.multiplyScalar(max / d); d = max; } if (d < 0.2) { _D.setLength(0.2); d = 0.2; }
    this.P2.copy(P0).add(_D);
    _b.copy(this.c).addScaledVector(_D, -this.c.dot(_D) / (d * d));
    if (_b.lengthSq() < 1e-6) _b.set(0, 0, 1).addScaledVector(_D, -_D.z / (d * d));
    const fuerza = Math.min(1, _b.length() / 0.3); _b.normalize();
    // El codo no puede dar la vuelta de golpe. Cuando la mano pasa cerca de la línea del hombro (el polo casi en
    // línea con el brazo), la dirección de doblez saltaba de un lado a otro de un fotograma al siguiente: el brazo
    // libre «temblaba ultra rápido». Ahora gira alrededor del brazo como mucho 0,16 rad por paso, y menos cuanto
    // más débil es la dirección que se le pide.
    if (this.bAnt) {
      _eje.copy(_D).divideScalar(d); _bp.copy(this.bAnt).addScaledVector(_eje, -this.bAnt.dot(_eje));
      if (_bp.lengthSq() > 1e-6) {
        _bp.normalize(); _cr.crossVectors(_bp, _b);
        const ang = Math.atan2(_cr.dot(_eje), _bp.dot(_b)), paso = Math.max(-0.16, Math.min(0.16, ang)) * fuerza;
        _cr.crossVectors(_eje, _bp); _b.copy(_bp).multiplyScalar(Math.cos(paso)).addScaledVector(_cr, Math.sin(paso)).normalize();
      }
    } else this.bAnt = V3();
    this.bAnt.copy(_b);
    _M.addVectors(P0, this.P2).multiplyScalar(0.5);
    let lo = 0, hi = Lb;
    for (let i = 0; i < 14; i++) { const hm = (lo + hi) / 2; this.P1.copy(_M).addScaledVector(_b, hm); if (largoBezier(P0, this.P1, this.P2) > Lb) hi = hm; else lo = hm; }
    this.P1.copy(_M).addScaledVector(_b, lo);
    const Bn = this.u.uBn.value.crossVectors(_D, _b).normalize();
    this.u.uP1.value.copy(this.P1); this.u.uP2.value.copy(this.P2);
    this.T.subVectors(this.P2, this.P1).normalize();
    this.B.copy(Bn).addScaledVector(this.T, -Bn.dot(this.T)).normalize(); this.S.crossVectors(this.B, this.T);
  }
}

// ───────────────────────── equipo del aprendiz de samurái ─────────────────────────
const texHaori = () => texC('haori', 1024, 512, (c, W, H) => {
  c.fillStyle = '#3aa7b8'; c.fillRect(0, 0, W, H);
  const n = ruido2(5);
  for (let i = 0; i < 2400; i++) { const x = (i * 97.13) % W, y = (i * 53.7) % H; c.fillStyle = `rgba(255,255,255,${0.02 + n(x * 0.05, y * 0.05) * 0.04})`; c.fillRect(x, y, 3, 1); }
  c.fillStyle = '#fbf7ee'; c.beginPath(); c.moveTo(0, H); const paso = W / 16;
  for (let i = 0; i <= 16; i++) { c.lineTo(i * paso, H - 70); c.lineTo(i * paso + paso / 2, H - 150); c.lineTo(i * paso + paso, H - 70); }
  c.lineTo(W, H); c.closePath(); c.fill(); c.fillRect(0, H - 70, W, 70);
  c.fillStyle = '#3aa7b8'; c.fillRect(0, H - 36, W, 10);
  c.fillStyle = '#1f2f4f'; c.fillRect(0, 0, 44, H); c.fillRect(W - 44, 0, 44, H);
  c.fillStyle = '#fbf7ee'; c.fillRect(40, 0, 6, H); c.fillRect(W - 46, 0, 6, H);
});
const texBanda = () => texC('banda', 2048, 128, (c, W, H) => {
  c.fillStyle = '#fbf8f1'; c.fillRect(0, 0, W, H);
  for (let i = 0; i < W; i += 6) { c.fillStyle = `rgba(0,0,0,${0.02 + (i % 12 ? 0 : 0.015)})`; c.fillRect(i, 0, 2, H); }
  const k = 0.62;
  c.beginPath(); c.ellipse(W / 2, H / 2, H * 0.36 * k, H * 0.36, 0, 0, TAU); c.fillStyle = '#d7322a'; c.fill();
  c.fillStyle = '#1b1310'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = `900 ${H * 0.72}px "Yu Mincho", "YuMincho", "Hiragino Mincho ProN", "Noto Serif JP", "MS Mincho", serif`;
  c.lineWidth = 7; c.strokeStyle = '#1b1310'; c.lineJoin = 'round';
  for (const [ch, dx] of [['必', -1], ['勝', 1]]) { c.save(); c.translate(W / 2 + dx * H * 0.8 * k * 1.25, H / 2 + 4); c.scale(k, 1); c.strokeText(ch, 0, 0); c.fillText(ch, 0, 0); c.restore(); }
});
const texTsuka = () => texC('tsuka', 128, 512, (c, W, H) => {
  c.fillStyle = '#f2ead8'; c.fillRect(0, 0, W, H); c.fillStyle = '#16121a';
  for (let y = -64; y < H + 64; y += 64) { c.beginPath(); c.moveTo(0, y); c.lineTo(W / 2, y + 32); c.lineTo(W, y); c.lineTo(W, y + 26); c.lineTo(W / 2, y + 58); c.lineTo(0, y + 26); c.closePath(); c.fill(); }
}, { repetir: true });
const extraHaori = (y) => 0.05 + 0.045 * Math.pow(c01((0.62 - y) / 0.2), 2);
const puntoTronco = (phi, y, extra) => { const r = radioTronco(phi, y) + extra, zc = lerp(-0.1, -0.07, c01((y - 0.3) / 0.63)); return V3(Math.sin(phi) * r, y, zc + Math.cos(phi) * r); };
// cinta que abraza la sección real de la cabeza (orejas incluidas)
function geoCintaCabeza(yb, yt, grosor, n = 144) {
  const ym = (yb + yt) / 2, an = [seccion(fCabeza, yb, n, -Math.PI), seccion(fCabeza, ym, n, -Math.PI), seccion(fCabeza, yt, n, -Math.PI)];
  const pf = [[0, -0.012, yb], [0, grosor * 0.8, yb + 0.006], [1, grosor, ym], [2, grosor * 0.8, yt - 0.006], [2, -0.012, yt]];
  const pos = [], idx = [], uv = [], K = pf.length;
  for (let i = 0; i <= n; i++) for (const [k, [r, off, y]] of pf.entries()) {
    const A = an[r], p = A[i % n], a = A[(i + n - 1) % n], b = A[(i + 1) % n];
    let tx = b[0] - a[0], tz = b[1] - a[1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
    pos.push(p[0] - tz * off, y, p[1] + tx * off); uv.push(i / n, k / (K - 1));
  }
  for (let i = 0; i < n; i++) for (let k = 0; k < K - 1; k++) { const a = i * K + k, b = (i + 1) * K + k, c = b + 1, d = a + 1; idx.push(a, b, c, a, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function geoTela(nu, nv) {
  return cache(`geo:tela${nu}x${nv}`, () => {
    const g = new THREE.PlaneGeometry(1, 1, nu, nv), uv = g.attributes.uv, q = new Float32Array(uv.count * 2);
    for (let i = 0; i < uv.count; i++) { q[i * 2] = uv.getX(i); q[i * 2 + 1] = 1 - uv.getY(i); }
    g.setAttribute('aQ', new THREE.BufferAttribute(q, 2)); conPint(g, (v, i) => V3(q[i * 2], q[i * 2 + 1], 0));
    g.boundingSphere = new THREE.Sphere(V3(), 3); return g;
  });
}
function geoLuna() {
  return cache('geo:luna', () => {
    const luna = new THREE.Shape(), R = 0.78, r = 0.64, cyI = 0.27, yi = (R * R - r * r + cyI * cyI) / (2 * cyI), xi = Math.sqrt(R * R - yi * yi);
    const g1 = Math.atan2(yi, xi), g2 = Math.atan2(yi - cyI, xi);
    luna.absarc(0, 0, R, Math.PI - g1, TAU + g1, false); luna.absarc(0, cyI, r, TAU + g2, Math.PI - g2, true);
    const g = new THREE.ExtrudeGeometry(luna, { depth: 0.035, bevelEnabled: true, bevelSize: 0.022, bevelThickness: 0.022, bevelSegments: 5, curveSegments: 64 });
    g.translate(0, 0.78, -0.0175); return g;
  });
}
function geoFilo() {
  return cache('geo:filo', () => {
    const s = new THREE.Shape(); s.moveTo(-0.028, 0); s.quadraticCurveTo(-0.016, 0.62, 0.05, 1.08); s.quadraticCurveTo(0.042, 1.14, 0.0, 1.17); s.quadraticCurveTo(0.025, 0.62, 0.028, 0); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.008, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 2, curveSegments: 24 }); g.translate(0, 0, -0.004); return g;
  });
}
function crearKatana() {
  const kat = new THREE.Group(), dorado = oro();
  const filo = new THREE.Mesh(geoFilo(), new THREE.MeshPhysicalMaterial({ color: 0xdfe6ee, metalness: 1, roughness: 0.14, clearcoat: 0.5 })); filo.position.y = 0.17; kat.add(filo);
  const habaki = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.034), dorado); habaki.position.y = 0.17; kat.add(habaki);
  const tsuba = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.024, 36), vinilo(0x1d1a1e, { rug: 0.3 })); tsuba.position.y = 0.135; kat.add(tsuba);
  const aro = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.011, 8, 36), dorado); aro.rotation.x = Math.PI / 2; aro.position.y = 0.135; kat.add(aro);
  const texT = texTsuka().clone(); texT.repeat.set(1, 3); texT.needsUpdate = true;
  const tsuka = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.034, 0.32, 18), new THREE.MeshStandardMaterial({ map: texT, roughness: 0.7 })); tsuka.position.y = -0.03; kat.add(tsuka);
  const kashira = new THREE.Mesh(new THREE.SphereGeometry(0.036, 16, 10), dorado); kashira.position.y = -0.19; kashira.scale.y = 0.6; kat.add(kashira);
  return sombrear(kat);
}

function crearEquipo(g) {
  const piezas = {};
  const nueva = (nombre, padre, pos = V3()) => { const gr = new THREE.Group(); gr.position.copy(pos); padre.add(gr); (piezas[nombre] ||= { grupos: [] }).grupos.push(gr); return gr; };
  // 1 · bufanda gorda de vinilo bermellón con canalé y rayas crema en las puntas
  const bu = nueva('bufanda', g.cuerpo, V3(0, 0.83, -0.06));
  const lana = vinilo(0xd9442e, { rug: 0.55, cc: 0.2, pintura: 'col *= 0.9 + 0.1 * smoothstep(-0.4, 0.9, sin(atan(p.x, p.z) * 44.0));' });
  const aroBu = cache('geo:bufanda', () => geoParam((u, v) => {
    // en los costados se ciñe y adelgaza: ahí nacen los brazos (hombro en x 0.235, justo donde iba el tubo) y la pata
    // salía por en medio de la bufanda, como fundida con ella. Ceñida, queda debajo de la raíz del brazo.
    const phi = u * TAU, th = Math.PI + v * TAU, lado = Math.sin(phi) ** 2, R = 0.258 - 0.07 * lado, rt = 0.084 * (1 - 0.4 * lado) * (1 + 0.05 * Math.sin(phi * 5));
    return V3(Math.sin(phi) * (R + rt * Math.cos(th)), rt * Math.sin(th) * 1.05 - 0.035 * Math.cos(phi) + 0.015 * lado, Math.cos(phi) * 0.95 * (R + rt * Math.cos(th)));
  }, 110, 24, { cerrarU: true }));
  bu.add(new THREE.Mesh(aroBu, lana));
  const nudo = new THREE.Mesh(cache('geo:esfera28', () => new THREE.SphereGeometry(1, 28, 18)), lana); nudo.scale.set(0.1, 0.085, 0.07); nudo.position.set(-0.14, -0.08, 0.24); bu.add(nudo);
  const matPunta = vinilo(0xd9442e, { rug: 0.55, cc: 0.2, pint: true, u: { uRaya: new THREE.Color(0xf6ead2) }, pintura: 'col = mix(col, uRaya, aa(abs(p.y - 0.075) - 0.028) + aa(abs(p.y - 0.15) - 0.016)); col *= 0.93 + 0.07 * smoothstep(-0.4, 0.9, sin(p.x * 120.0));' });
  const puntas = [];
  for (const [x, l, a, z] of [[-0.17, 0.36, 0.1, 0.25], [-0.08, 0.28, -0.16, 0.26]]) {
    const pg = cache('geo:puntaBu' + l, () => { const q = new RoundedBoxGeometry(0.12, l, 0.05, 3, 0.022); const p = q.attributes.position; for (let i = 0; i < p.count; i++) { const f = (p.getY(i) + l / 2) / l; p.setX(i, p.getX(i) * (0.85 + 0.3 * (1 - f))); } q.translate(0, -l / 2, 0); conPint(q, (v) => V3(v.x, v.y + l, v.z)); return q; });
    const pn = new THREE.Mesh(pg, matPunta); pn.position.set(x, -0.08, z); pn.rotation.set(0.2, 0, a); pn.userData.a = a; bu.add(pn); puntas.push(pn);
  }
  piezas.bufanda.puntas = puntas;

  // 2 · hachimaki con «必勝» y el sol rojo delante; nudo y cintas que ondean detrás
  const ha = nueva('hachimaki', g.cabeza);
  const banda = new THREE.Mesh(cache('geo:hachimaki', () => geoCintaCabeza(0.22, 0.34, 0.034)), new THREE.MeshPhysicalMaterial({ map: texBanda(), roughness: 0.8, sheen: 0.6, sheenRoughness: 0.5 }));
  ha.add(banda);
  const phiN = -2.55, rN = radioCabeza(phiN, 0.28) + 0.05, posN = V3(Math.sin(phiN) * rN, 0.28, Math.cos(phiN) * rN);
  const detras = new THREE.Group(); ha.add(detras);
  const nudoH = new THREE.Mesh(cache('geo:esfera20', () => new THREE.SphereGeometry(1, 20, 14)), tela(0xfbf8f1)); nudoH.position.copy(posN); nudoH.scale.set(0.07, 0.06, 0.05); nudoH.rotation.y = phiN; detras.add(nudoH);
  const cintas = [];
  for (const [a, l, fase] of [[0.5, 0.46, 0], [-0.25, 0.38, 1.7]]) {
    const mat = vinilo(0xfbf8f1, { rug: 0.8, cc: 0, side: THREE.DoubleSide, def: DEF_CINTA, u: { uT: 0, uV: 0, uL: l, uFase: fase, uAncho: 0.085 } });
    const cm = mallaDeformable(geoTela(1, 14), mat); const piv = new THREE.Group(); piv.position.copy(posN); piv.rotation.set(0, phiN, 0); const inc = new THREE.Group(); inc.rotation.set(-0.35, 0, a); inc.add(cm); piv.add(inc);
    detras.add(piv); cintas.push(mat.userData.u);
  }
  Object.assign(piezas.hachimaki, { cintas, detras });

  // 3 · haori celeste con dandara blanca, cuello índigo, himo y obi; las mangas se pintan en los brazos
  const hr = nueva('haori', g.cuerpo);
  const HY0 = 0.42, HY1 = 0.98, abre = (y) => lerp(0.62, 0.22, Math.pow(c01((y - HY0) / (HY1 - HY0)), 0.8));
  const extraH = extraHaori;
  const geoH = cache('geo:haori', () => geoParam((u, v) => { const y = lerp(HY0, HY1, v), ab = abre(y); return puntoTronco(ab + u * (TAU - 2 * ab), y, extraH(y)); }, 80, 22, { uvFn: (u, v) => [u, v * 0.8 + 0.05] }));
  hr.add(new THREE.Mesh(geoH, tela(0xffffff, { map: texHaori(), side: THREE.DoubleSide, roughness: 0.75 })));
  const geoEri = cache('geo:eri', () => {
    const pts = [];
    for (let i = 0; i <= 8; i++) { const y = lerp(HY0 + 0.01, HY1 - 0.02, i / 8); pts.push(puntoTronco(abre(y), y, extraH(y) + 0.004)); }
    for (let i = 1; i < 12; i++) { const y = HY1 - 0.02; pts.push(puntoTronco(lerp(abre(y), TAU - abre(y), i / 12), y, extraH(y) + 0.004)); }
    for (let i = 8; i >= 0; i--) { const y = lerp(HY0 + 0.01, HY1 - 0.02, i / 8); pts.push(puntoTronco(-abre(y), y, extraH(y) + 0.004)); }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 180, 0.032, 12, false);
  });
  hr.add(new THREE.Mesh(geoEri, vinilo(0x1f2c4c, { rug: 0.5, cc: 0.3 })));
  const pHimo = puntoTronco(0, 0.7, 0.07);
  for (const x of [-0.055, 0.055]) { const bola = new THREE.Mesh(cache('geo:esfera20', () => new THREE.SphereGeometry(1, 20, 14)), vinilo(0xfbf7ee)); bola.scale.setScalar(0.036); bola.position.set(x, pHimo.y, pHimo.z + 0.01); hr.add(bola); }
  const cordon = new THREE.Mesh(new THREE.CapsuleGeometry(0.013, 0.11, 4, 10), vinilo(0xfbf7ee)); cordon.rotation.z = Math.PI / 2; cordon.position.set(0, pHimo.y, pHimo.z + 0.005); hr.add(cordon);
  const obi = new THREE.Mesh(cache('geo:obi', () => geoAro((phi, y) => radioTronco(phi, y + 0.46) + 0.03, perfilBanda(-0.06, 0.06, -0.02, 0.025, 0.018), 96)),
    vinilo(0x26345e, { rug: 0.7, cc: 0.1, u: { uOro: new THREE.Color(0xe2b04a) }, pintura: 'col = mix(col, uOro, aa(abs(p.y) - 0.01));' }));
  obi.position.set(0, 0.46, -0.085); hr.add(obi);

  // 4 · bokken de madera metido en el obi, a su izquierda, como un samurái: la empuñadura asoma por delante
  // y la hoja sale por detrás. Antes iba «sobre el regazo» (estaba siempre sentado): de pie se quedaba flotando
  // delante de la barriga, y su barra de choque atrapaba las manos (el brazo libre temblaba).
  const bk = nueva('bokken', g.cuerpo, V3(...BOKKEN.pos)); bk.rotation.set(0, BOKKEN.giro, BOKKEN.alza, 'YXZ');
  const madera = vinilo(0xa8743f, { rug: 0.55, cc: 0.5, u: { uVeta: new THREE.Color(0x7a4d24) }, pintura: 'col = mix(col, uVeta, 0.35 * smoothstep(0.3, 1.0, sin(p.y * 70.0 + sin(p.x * 40.0) * 2.0)));' });
  const hojaB = new THREE.Mesh(cache('geo:hojaBokken', () => { const q = new THREE.CapsuleGeometry(0.036, 0.9, 8, 16); q.scale(1, 1, 0.72); return q; }), madera);
  hojaB.rotation.z = Math.PI / 2; hojaB.position.x = -0.12; bk.add(hojaB);
  const tsubaB = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.024, 28), vinilo(0x2a1d16, { rug: 0.4 })); tsubaB.rotation.z = Math.PI / 2; tsubaB.position.x = 0.36; bk.add(tsubaB);
  const tsukaB = new THREE.Mesh(new THREE.CapsuleGeometry(0.036, 0.2, 6, 14), vinilo(0x3a2418, { rug: 0.6 })); tsukaB.rotation.z = Math.PI / 2; tsukaB.position.x = 0.5; bk.add(tsukaB);

  // 5 · kabuto lacado: casco con huecos para las orejas, visera, media luna dorada y shikoro
  const kb = nueva('kabuto', g.cabeza);
  const laca = vinilo(0x1c1a24, { rug: 0.22, cc: 1, ccr: 0.08, u: { uOro: new THREE.Color(0xf2c14e) }, pintPars: `float fOr(vec3 p){
      float d2 = triSDF(vec2(abs(p.x), p.y), vec2(0.1, 0.3), vec2(0.68, 0.12), vec2(0.7, 0.87)) - 0.07;
      float t = clamp((p.y - 0.2) / 0.67, 0.0, 1.0), g = 0.44 + (0.09 - 0.44) * t, dz = abs(p.z - (0.2 - g * 0.5)) - g * 0.5;
      vec2 w = vec2(d2 + 0.04, dz + 0.04); return min(max(w.x, w.y), 0.0) + length(max(w, 0.0)) - 0.04; }`,
    pintura: `float an = atan(p.x, p.z); float q = abs(fract(an * 3.8197 + 0.5) - 0.5);
      col = mix(col, uOro, aa(q - 0.018) * step(0.425, p.y) * 0.9);
      col = mix(col, uOro, aa(0.398 - p.y));
      col = mix(col, uOro, aa(fOr(p) - 0.078));` });
  kb.add(new THREE.Mesh(geoCasco(), laca));
  const dorado = oro();
  const visera = new THREE.Mesh(cache('geo:visera', () => geoAro(radioCabeza, perfilBanda(0.362, 0.392, 0.06, 0.2, 0.012), 60, { phi0: -0.92, phi1: 0.92, cerrar: false })), laca); kb.add(visera);
  for (const s of [-1, 1]) {
    const phi = 0.98 * s, r = radioCabeza(phi, 0.36) + 0.12;
    const fk = new THREE.Group(); fk.position.set(Math.sin(phi) * r, 0.34, Math.cos(phi) * r); fk.rotation.set(0, phi + 0.9 * s, 0.15 * s);
    const hojaF = new THREE.Mesh(cache('geo:fuki', () => new RoundedBoxGeometry(0.2, 0.15, 0.03, 3, 0.012)), laca); fk.add(hojaF);
    const mon = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.012, 24), dorado); mon.rotation.x = Math.PI / 2; mon.position.z = 0.02; fk.add(mon);
    kb.add(fk);
  }
  const maedate = new THREE.Mesh(geoLuna(), dorado); maedate.scale.setScalar(0.48); maedate.position.set(0, 0.43, 0.5); maedate.rotation.x = -0.14; kb.add(maedate);
  const baseL = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.04, 32), dorado); baseL.rotation.x = Math.PI / 2 - 0.14; baseL.position.set(0, 0.44, 0.5); kb.add(baseL);
  const joya = new THREE.Mesh(cache('geo:esfera20', () => new THREE.SphereGeometry(1, 20, 14)), vinilo(0xc8231c, { rug: 0.2, cc: 1 })); joya.scale.set(0.034, 0.034, 0.02); joya.position.set(0, 0.444, 0.525); kb.add(joya);
  const tehen = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.015, 10, 28), dorado); tehen.rotation.x = Math.PI / 2; tehen.position.y = 0.588; kb.add(tehen);
  const shikoroMat = vinilo(0x1c1a24, { rug: 0.25, cc: 1, ccr: 0.1, side: THREE.DoubleSide, pint: true, u: { uOro: new THREE.Color(0xf2c14e), uRojo: new THREE.Color(0xd23a30) },
    pintura: 'col = mix(col, uRojo, aa(abs(fract(p.x * 30.0) - 0.5) - 0.12) * aa(abs(p.y - 0.45) - 0.28)); col = mix(col, uOro, aa(0.86 - p.y));' });
  for (let k = 0; k < 3; k++) {
    const yt = 0.37 - 0.1 * k, yb = yt - 0.15, dt = 0.12 + 0.06 * k, db = dt + 0.09;
    const lam = cache('geo:shikoro' + k, () => conPint(geoParam((u, v) => { const phi = lerp(Math.PI - 0.95, Math.PI + 0.95, u), y = lerp(yb, yt, v), r = radioCabeza(phi, 0.36) + lerp(db, dt, v); return V3(Math.sin(phi) * r, y, Math.cos(phi) * r); }, 60, 4), (v, i, uv) => V3(uv.getX(i), 1 - uv.getY(i), 0)));
    kb.add(new THREE.Mesh(lam, shikoroMat));
  }

  // 6 · katana en la pata IZQUIERDA (+x): la que no usan los gestos
  const kt = nueva('katana', g.anclaL); kt.add(crearKatana());

  // 7 · capa carmesí con forro y ribete dorado (se deforma en la GPU)
  const cpG = nueva('capa', g.cuerpo);
  const matCapa = vinilo(0x86121f, { rug: 0.62, cc: 0.2, side: THREE.DoubleSide, sheen: 0.35, sheenRoughness: 0.55, sheenColor: new THREE.Color(0xd06070), def: DEF_CAPA, pint: true,
    u: { uT: 0, uVel: 0, uAng: 2.0, uR0: 0.37, uR1: 0.68, uY0: 0.9, uY1: 0.2, uOro: new THREE.Color(0xe8b64c), uForro: new THREE.Color(0x4f0e18) },
    pintura: `if (!gl_FrontFacing) col = uForro; float bd = min(min(p.x, 1.0 - p.x), 1.0 - p.y); col = mix(col, uOro, aa(bd - 0.03));
      float dm = length((p.xy - vec2(0.5, 0.36)) * vec2(1.9, 1.0));
      col = mix(col, uOro, (aa(abs(dm - 0.075) - 0.01) + aa(dm - 0.03)) * (gl_FrontFacing ? 1.0 : 0.0));` });
  const capa = mallaDeformable(geoTela(28, 24), matCapa); cpG.add(capa); piezas.capa.u = matCapa.userData.u;

  // 8 · aura: halo, anillo con kanji, kanji que orbitan y motas que suben
  const au = nueva('aura', g.figura);
  const glow = texC('glow', 256, 256, (c) => { const gr = c.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(255,214,120,0.9)'); gr.addColorStop(0.4, 'rgba(255,170,60,0.35)'); gr.addColorStop(1, 'rgba(255,140,40,0)'); c.fillStyle = gr; c.fillRect(0, 0, 256, 256); });
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55 }));
  halo.scale.set(3.3, 3.3, 1); halo.position.set(0, 1.3, -0.7); au.add(halo);
  const anilloT = texC('anilloAura', 512, 512, (c) => {
    c.translate(256, 256);
    for (const [r, w, a] of [[230, 6, 0.9], [200, 3, 0.6], [160, 10, 0.35]]) { c.beginPath(); c.arc(0, 0, r, 0, TAU); c.lineWidth = w; c.strokeStyle = `rgba(255,205,110,${a})`; c.shadowColor = 'rgba(255,180,60,1)'; c.shadowBlur = 18; c.stroke(); }
    c.font = '28px "Yu Mincho", "MS Mincho", serif'; c.fillStyle = 'rgba(255,220,140,0.9)'; c.textAlign = 'center';
    const txt = '言霊心夢力友学光言霊心夢力友学光言霊心夢';
    for (let i = 0; i < txt.length; i++) { c.save(); c.rotate((i / txt.length) * TAU); c.fillText(txt[i], 0, -208); c.restore(); }
  });
  const anillo = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 2.7), new THREE.MeshBasicMaterial({ map: anilloT, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  anillo.rotation.x = -Math.PI / 2; anillo.position.set(0, 0.02, 0.15); au.add(anillo);
  const kanji = ['言', '霊', '心', '夢', '力', '学', '友', '光'].map((k, i) => {
    const t = texC('kanjiAura' + k, 256, 256, (c) => {
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '900 176px "Yu Mincho", "YuMincho", "Hiragino Mincho ProN", "Noto Serif JP", "MS Mincho", serif';
      c.shadowColor = 'rgba(255,190,70,1)'; c.shadowBlur = 26; c.lineWidth = 12; c.strokeStyle = '#7a3b0c'; c.strokeText(k, 128, 136);
      const gr = c.createLinearGradient(0, 40, 0, 220); gr.addColorStop(0, '#fff3c2'); gr.addColorStop(0.5, '#ffc94a'); gr.addColorStop(1, '#e08a1c'); c.fillStyle = gr; c.shadowBlur = 0; c.fillText(k, 128, 136);
    });
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, alphaTest: 0.25, toneMapped: false }));
    sp.scale.setScalar(0.24); sp.userData = { a: (i / 8) * TAU, y: 0.45 + (i % 3) * 0.6, r: 1.24 + (i % 2) * 0.22 }; au.add(sp); return sp;
  });
  const motasN = 60, motasDat = [], rr = azar(9);
  for (let i = 0; i < motasN; i++) { const a = rr() * TAU, r = 0.45 + rr() * 1.05; motasDat.push({ a, r, y: rr() * 2.4, v: 0.2 + rr() * 0.3 }); }
  const motasGeo = new THREE.BufferGeometry(); motasGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(motasN * 3), 3));
  const motas = new THREE.Points(motasGeo, new THREE.PointsMaterial({ map: glow, size: 0.11, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffd27a, toneMapped: false }));
  motas.frustumCulled = false; au.add(motas);
  Object.assign(piezas.aura, { halo, anillo, kanji, motas, motasDat });

  for (const [n, p] of Object.entries(piezas)) for (const gr of p.grupos) { if (n !== 'aura') sombrear(gr); gr.visible = false; }
  return piezas;
}

// ───────────────────────── accesorios (uno a la vez) ─────────────────────────
const ACCESORIOS = ['gafas-sol', 'boina', 'mugiwara', 'cascos', 'hanakanmuri', 'kitsune-men'];
const texPaja = () => texC('paja', 512, 512, (c, W, H) => {
  c.fillStyle = '#e2c27a'; c.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 8) { c.fillStyle = y % 16 ? 'rgba(150,110,40,0.25)' : 'rgba(255,240,190,0.35)'; c.fillRect(0, y, W, 3); }
  for (let x = 0; x < W; x += 12) { c.fillStyle = 'rgba(120,85,30,0.12)'; c.fillRect(x, 0, 2, H); }
}, { repetir: true });
function crearAccesorio(id) {
  const g = new THREE.Group();
  if (id === 'gafas-sol') {
    const lente = new THREE.MeshPhysicalMaterial({ color: 0x1d1612, transparent: true, opacity: 0.62, roughness: 0.05, clearcoat: 1, metalness: 0.2 });
    const montura = vinilo(0x241c1a, { rug: 0.3, cc: 0.8 });
    for (const s of [-1, 1]) {
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.015, 40), lente); l.rotation.x = Math.PI / 2; l.position.set(0.355 * s, -0.02, 0.535); g.add(l);
      const aro = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.02, 10, 44), montura); aro.position.set(0.355 * s, -0.02, 0.535); g.add(aro);
      const pts = [V3(0.5 * s, 0.0, 0.53), V3(0.66 * s, 0.02, 0.4), V3(0.74 * s, 0.03, 0.2), V3(0.72 * s, 0.03, 0.02)];
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.016, 8), montura));
    }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(V3(-0.21, 0.0, 0.54), V3(0, 0.06, 0.57), V3(0.21, 0.0, 0.54)), 12, 0.016, 8), montura));
  } else if (id === 'boina') {
    const pts = [[0.0001, 0.11], [0.2, 0.108], [0.3, 0.09], [0.345, 0.05], [0.33, 0.01], [0.27, -0.01], [0.24, 0.0], [0.23, -0.02], [0.0001, -0.02]].reverse().map(([x, y]) => new THREE.Vector2(x, y));   // de abajo arriba: si no, las caras miran hacia dentro y por fuera no se ven
    const b = new THREE.Mesh(new THREE.LatheGeometry(pts, 48), tela(0xb3313a)); g.add(b);
    const tallo = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.06, 12), tela(0xb3313a)); tallo.position.y = 0.13; g.add(tallo);
    // (30-09) una boinita en la coronilla, entre las orejas: con las orejas de ahora (el loft) arriba casi todo es
    // oreja, y la de antes, grande y echada atrás, quedaba atravesada por la oreja. Medida para que no toque nada.
    g.position.set(0, 0.58, -0.15); g.rotation.set(-0.3, 0, 0); g.scale.setScalar(0.5);
  } else if (id === 'mugiwara') {
    const paja = new THREE.MeshPhysicalMaterial({ map: texPaja(), roughness: 0.85, sheen: 0.5 }), rojo = vinilo(0xc8302a, { rug: 0.6, side: THREE.DoubleSide });
    const pts = [[0.0001, 0.2], [0.14, 0.195], [0.22, 0.17], [0.25, 0.1], [0.26, 0.02], [0.3, 0.0], [0.5, -0.02], [0.6, -0.05], [0.595, -0.07], [0.5, -0.045], [0.3, -0.025], [0.24, -0.02], [0.0001, -0.02]].reverse().map(([x, y]) => new THREE.Vector2(x, y));   // (ídem: al revés, la copa se veía hueca)
    const sombrero = new THREE.Group(); g.add(sombrero);
    sombrero.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 64), paja));
    const cinta = new THREE.Mesh(new THREE.CylinderGeometry(0.258, 0.262, 0.06, 48, 1, true), rojo); cinta.position.y = 0.04; sombrero.add(cinta);
    // (30-09) colgado a la espalda, con la copa apoyada en la nuca y el cordón por debajo de la barbilla: encima de la
    // cabeza no cabe (el ala es más ancha que el hueco entre las orejas) y donde iba antes flotaba detrás de la nuca.
    sombrero.position.set(0, 0.2, -0.62); sombrero.rotation.set(-1.3, 0, 0);
    // el cordón, en el espacio de la cabeza: de los lados de la copa hasta la barbilla, pegado a la cara
    const pegado = (x, y, z) => { const d = V3(x, y + 0.05, z).normalize(); let lo = 0, hi = 1.6; for (let k = 0; k < 26; k++) { const m = (lo + hi) / 2; if (fCabeza(d.x * m, d.y * m - 0.05, d.z * m) < 0) lo = m; else hi = m; } return d.multiplyScalar(lo + 0.022).add(V3(0, -0.05, 0)); };
    for (const s of [-1, 1]) {
      const q = [[0.24 * s, 0.1, -0.62], [0.55 * s, -0.08, -0.45], [0.74 * s, -0.25, -0.1], [0.6 * s, -0.42, 0.18], [0.3 * s, -0.5, 0.3], [0, -0.53, 0.33]].map(([x, y, z]) => pegado(x, y, z));
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(q), 40, 0.011, 6), rojo));
    }
  } else if (id === 'cascos') {
    const blanco = vinilo(0xf3efe8, { rug: 0.3, cc: 0.8 }), rosa = vinilo(0xf08aa0, { rug: 0.6, cc: 0.2 }), verde = vinilo(0x3aa7b8, { rug: 0.35, cc: 0.6 });
    const beta = 0.85, w = V3(0, Math.cos(beta), -Math.sin(beta)), pts = [];
    for (let i = 0; i <= 24; i++) {
      const th = -Math.PI / 2 + (i / 24) * Math.PI, d = V3(Math.sin(th), 0, 0).addScaledVector(w, Math.cos(th)).normalize();
      let lo = 0, hi = 1.5; for (let k = 0; k < 26; k++) { const m = (lo + hi) / 2; if (fCabeza(d.x * m, d.y * m - 0.05, d.z * m) < 0) lo = m; else hi = m; }
      pts.push(d.multiplyScalar(lo + 0.075).add(V3(0, -0.05, 0)));
    }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.032, 10), blanco));
    for (const s of [-1, 1]) {
      const cup = new THREE.Group(); cup.position.set(0.86 * s, -0.08, -0.06); cup.rotation.z = Math.PI / 2 * s;
      const cas = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.1, 36), blanco); cup.add(cas);
      const coj = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.04, 12, 32), rosa); coj.rotation.x = Math.PI / 2; coj.position.y = 0.06; cup.add(coj);
      const tapa = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 28), verde); tapa.position.y = -0.055; cup.add(tapa);
      g.add(cup);
    }
  } else if (id === 'hanakanmuri') {
    const sec = seccion(fCabeza, 0.41, 72, -Math.PI).map(([x, z]) => { const l = Math.hypot(x, z) || 1; return V3(x + (x / l) * 0.035, 0.41, z + (z / l) * 0.035); });
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sec, true), 144, 0.022, 8, true), vinilo(0x5f8f3a, { rug: 0.6 })));
    const petalo = cache('geo:flor', () => { const s = new THREE.Shape(); for (let i = 0; i <= 60; i++) { const a = (i / 60) * TAU, r = 0.07 * (0.62 + 0.38 * Math.pow(Math.abs(Math.cos(a * 2.5)), 0.6)) * (1 - 0.18 * Math.pow(Math.abs(Math.sin(a * 5)), 12)); const x = Math.cos(a + Math.PI / 2) * r, y = Math.sin(a + Math.PI / 2) * r; if (i) s.lineTo(x, y); else s.moveTo(x, y); } return extrudir(s, 0.012, 0.01); });
    const N = 14, flores = new THREE.InstancedMesh(petalo, vinilo(0xf7b8c8, { rug: 0.5, cc: 0.4 }), N), centros = new THREE.InstancedMesh(cache('geo:esfera12', () => new THREE.SphereGeometry(1, 12, 8)), vinilo(0xf2c14e, { rug: 0.4 }), N);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    for (let i = 0; i < N; i++) {
      const p = sec[Math.floor((i / N) * sec.length)], out = V3(p.x, 0, p.z).normalize();
      e.set(-0.5, Math.atan2(out.x, out.z), (i % 3) * 0.6); q.setFromEuler(e); m4.compose(p.clone().addScaledVector(out, 0.02).add(V3(0, 0.02, 0)), q, V3(1, 1, 1).multiplyScalar(i % 2 ? 1.15 : 0.9)); flores.setMatrixAt(i, m4); if (i % 2) flores.setColorAt(i, new THREE.Color(0xffffff)); else flores.setColorAt(i, new THREE.Color(0xffd6e2));
      m4.compose(p.clone().addScaledVector(out, 0.035).add(V3(0, 0.02, 0)), q, V3(0.02, 0.02, 0.012)); centros.setMatrixAt(i, m4);
    }
    g.add(flores, centros);
  } else if (id === 'kitsune-men') {
    const s = new THREE.Shape(); s.moveTo(0, -0.28); s.quadraticCurveTo(0.15, -0.14, 0.22, 0.06); s.lineTo(0.26, 0.3); s.lineTo(0.1, 0.17); s.quadraticCurveTo(0, 0.2, -0.1, 0.17); s.lineTo(-0.26, 0.3); s.lineTo(-0.22, 0.06); s.quadraticCurveTo(-0.15, -0.14, 0, -0.28);
    const geo = extrudir(s, 0.05, 0.035);
    const tex = texC('kitsune', 512, 512, (c, W, H) => {
      c.fillStyle = '#fbf7ef'; c.fillRect(0, 0, W, H); c.translate(W / 2, H / 2); c.scale(W / 0.56, -H / 0.56); c.translate(0, -0.01);
      c.lineCap = 'round'; c.lineJoin = 'round';
      c.fillStyle = '#d4322b'; for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * 0.2, 0.26); c.lineTo(sx * 0.12, 0.14); c.lineTo(sx * 0.2, 0.1); c.closePath(); c.fill(); }
      for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * 0.04, 0.03); c.quadraticCurveTo(sx * 0.12, 0.08, sx * 0.19, 0.12); c.quadraticCurveTo(sx * 0.13, 0.02, sx * 0.05, 0.0); c.closePath(); c.fill(); }
      c.strokeStyle = '#1b1310'; c.lineWidth = 0.018; for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * 0.05, 0.02); c.quadraticCurveTo(sx * 0.1, 0.05, sx * 0.15, 0.06); c.stroke(); }
      c.fillStyle = '#d4322b'; c.beginPath(); c.ellipse(0, 0.12, 0.018, 0.03, 0, 0, TAU); c.fill();
      c.fillStyle = '#e8b64c'; c.beginPath(); c.ellipse(0, 0.07, 0.012, 0.012, 0, 0, TAU); c.fill();
      c.fillStyle = '#1b1310'; c.beginPath(); c.ellipse(0, -0.22, 0.03, 0.02, 0, 0, TAU); c.fill();
      c.strokeStyle = '#d4322b'; c.lineWidth = 0.012; for (const sx of [-1, 1]) for (const dy of [0, 0.03]) { c.beginPath(); c.moveTo(sx * 0.07, -0.13 - dy); c.lineTo(sx * 0.17, -0.1 - dy * 1.4); c.stroke(); }
    });
    const mapa = tex.clone(); mapa.repeat.set(1 / 0.56, 1 / 0.56); mapa.offset.set(0.5, 0.5 - 0.01 / 0.56); mapa.needsUpdate = true;
    const mascara = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ map: mapa, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.2 }));
    const cordon = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.012, 8, 32, Math.PI), vinilo(0xd4322b, { rug: 0.6 })); cordon.position.z = -0.03; cordon.rotation.z = Math.PI;
    const soporte = new THREE.Group(); soporte.add(mascara, cordon);
    soporte.position.set(-0.73, 0.1, -0.33); soporte.lookAt(V3(-2.2, 0.35, -1.6)); soporte.rotateZ(0.25);
    g.add(soporte);
  }
  sombrear(g);
  return g;
}

// ───────────────────────── ropa (una prenda a la vez; sustituye al haori) ─────────────────────────
// Mismo lenguaje que el haori: tela alrededor del tronco con geoParam, textura pintada y vinilo; las mangas se pintan en los brazos.
const fuenteJP = (px, peso = 900) => `${peso} ${px}px "Yu Mincho", "YuMincho", "Hiragino Mincho ProN", "Noto Serif JP", "MS Mincho", serif`;
const zcTronco = (y) => lerp(-0.1, -0.07, c01((y - 0.3) / 0.63));
function hebras(c, W, H, a = 0.05, n = 4000, col = '255,255,255') { const r = azar(n); for (let i = 0; i < n; i++) { c.fillStyle = `rgba(${col},${a * (0.3 + r())})`; c.fillRect(r() * W, r() * H, 3, 1); } }
function sakura(c, x, y, k, col = '#f7b6c8') {
  c.save(); c.translate(x, y); c.fillStyle = col;
  for (let i = 0; i < 5; i++) { c.rotate(TAU / 5); c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(k * 0.55, -k * 0.2, k * 0.6, -k * 0.95, k * 0.08, -k); c.lineTo(0, -k * 0.86); c.lineTo(-k * 0.08, -k); c.bezierCurveTo(-k * 0.6, -k * 0.95, -k * 0.55, -k * 0.2, 0, 0); c.fill(); }
  c.fillStyle = '#f2c14e'; c.beginPath(); c.arc(0, 0, k * 0.18, 0, TAU); c.fill(); c.restore();
}
const letra = (c, txt, x, y, px, col, peso) => { c.fillStyle = col; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = fuenteJP(px, peso); c.fillText(txt, x, y); };
// texturas 1536×448 (≈ isótropas sobre el tronco); x = vuelta al cuerpo desde la costura, y = del cuello (arriba) al bajo
const texYukata = () => texC('yukata', 1536, 448, (c, W, H) => {
  c.fillStyle = '#a996d8'; c.fillRect(0, 0, W, H); hebras(c, W, H, 0.06);
  const r = azar(31);
  const flor = (x, y, k, col) => {
    c.save(); c.translate(x, y); c.rotate(r() * TAU); c.fillStyle = col; c.beginPath();
    for (let i = 0; i <= 60; i++) { const a = (i / 60) * TAU, rr = k * (0.8 + 0.2 * Math.cos(a * 5)); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.fill();
    c.strokeStyle = 'rgba(60,50,120,0.28)'; c.lineWidth = 2.5; for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU + 0.63; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * k * 0.78, Math.sin(a) * k * 0.78); c.stroke(); }
    c.fillStyle = '#2f3f7a'; c.beginPath(); c.arc(0, 0, k * 0.26, 0, TAU); c.fill(); c.fillStyle = '#fff3c4'; c.beginPath(); c.arc(0, 0, k * 0.09, 0, TAU); c.fill(); c.restore();
  };
  const hoja = (x, y, k) => { c.save(); c.translate(x, y); c.rotate(r() * TAU); c.fillStyle = '#6d9a5c'; c.beginPath(); c.moveTo(-k, 0); c.quadraticCurveTo(0, -k * 0.7, k, 0); c.quadraticCurveTo(0, k * 0.7, -k, 0); c.fill(); c.restore(); };
  for (let f = 0; f < 3; f++) for (let i = 0; i < 11; i++) {
    const x = (i + (f % 2) * 0.5) * (W / 11) + (r() - 0.5) * 50, y = H * (0.16 + f * 0.33) + (r() - 0.5) * 50;
    hoja(x + 34, y + 30, 30); hoja(x - 30, y + 36, 22); flor(x, y, 38 + r() * 14, (i + f) % 3 ? '#fbf7f2' : '#f4a9c0');
  }
});
const texHappi = () => texC('happi', 1536, 448, (c, W, H) => {
  c.fillStyle = '#d8412a'; c.fillRect(0, 0, W, H); hebras(c, W, H, 0.06);
  c.fillStyle = '#fbf7ee'; c.fillRect(0, H - 104, W, 104); c.strokeStyle = '#1f2c4c'; c.lineWidth = 5;
  for (const [y, dx] of [[H - 50, 0], [H - 12, 32]]) for (let x = -64; x < W + 64; x += 64) for (const rr of [28, 17, 6]) { c.beginPath(); c.arc(x + dx, y, rr, Math.PI, TAU); c.stroke(); }
  c.fillStyle = '#1f2c4c'; c.fillRect(0, H - 112, W, 10);
  c.fillRect(0, 0, 74, H); c.fillRect(W - 74, 0, 74, H);                                          // cuello delantero con 祭礼
  for (const x of [37, W - 37]) { letra(c, '祭', x, H * 0.2, 48, '#fbf7ee'); letra(c, '礼', x, H * 0.4, 48, '#fbf7ee'); }
  c.fillStyle = '#fbf7ee'; c.beginPath(); c.arc(W / 2, H * 0.4, 120, 0, TAU); c.fill();              // espalda: 祭 en su círculo
  c.lineWidth = 9; c.strokeStyle = '#1f2c4c'; c.beginPath(); c.arc(W / 2, H * 0.4, 104, 0, TAU); c.stroke();
  letra(c, '祭', W / 2, H * 0.4 + 8, 150, '#1f2c4c');
});
const texGakuran = () => texC('gakuran', 1536, 448, (c, W, H) => {
  c.fillStyle = '#1e2233'; c.fillRect(0, 0, W, H); hebras(c, W, H, 0.035, 6000);
  c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(0, 0, 5, H); c.fillRect(W - 5, 0, 5, H);              // cierre delantero
  c.fillStyle = 'rgba(255,255,255,0.07)'; for (const x of [0.13, 0.87]) c.fillRect(W * x - 70, H * 0.66, 140, 5);   // bolsillos
});
const texParka = () => texC('parka', 1536, 448, (c, W, H) => {
  c.fillStyle = '#86c6a8'; c.fillRect(0, 0, W, H); hebras(c, W, H, 0.08, 7000); hebras(c, W, H, 0.05, 3000, '40,90,70');
  const x0 = W / 2; c.fillStyle = '#76b898'; c.strokeStyle = '#5e9b7f'; c.lineWidth = 5;               // bolsillo canguro
  c.beginPath(); c.moveTo(x0 - 200, H * 0.97); c.lineTo(x0 - 150, H * 0.56); c.quadraticCurveTo(x0, H * 0.5, x0 + 150, H * 0.56); c.lineTo(x0 + 200, H * 0.97); c.closePath(); c.fill(); c.stroke();
  c.setLineDash([10, 8]); c.strokeStyle = '#e6f4ec'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(x0 - 184, H * 0.95); c.lineTo(x0 - 138, H * 0.59); c.quadraticCurveTo(x0, H * 0.54, x0 + 138, H * 0.59); c.lineTo(x0 + 184, H * 0.95); c.stroke(); c.setLineDash([]);
  const px = x0 + 150, py = H * 0.27; c.fillStyle = '#f6efe0';                                       // huella en el pecho izquierdo
  c.beginPath(); c.ellipse(px, py + 10, 30, 24, 0, 0, TAU); c.fill();
  for (const [dx, dy] of [[-30, -22], [-11, -38], [11, -38], [30, -22]]) { c.beginPath(); c.ellipse(px + dx, py + dy, 10, 12, 0, 0, TAU); c.fill(); }
});
const texDelantal = () => texC('delantal', 512, 512, (c, W, H) => {
  c.fillStyle = '#26345e'; c.fillRect(0, 0, W, H); hebras(c, W, H, 0.07, 2500);
  c.fillStyle = '#d8412a'; c.fillRect(0, H - 96, W, 13); c.fillRect(0, H - 72, W, 6);
  c.strokeStyle = '#efe6d2'; c.setLineDash([12, 9]); c.lineWidth = 4; c.strokeRect(16, 14, W - 32, H - 30); c.setLineDash([]);
  letra(c, '麺', W / 2, H * 0.42, 250, '#f7f1e3'); letra(c, 'ら ー め ん', W / 2, H * 0.72, 40, '#f7f1e3', 700);
});
const texSukajan = () => texC('sukajan', 1536, 448, (c, W, H) => {
  const gr = c.createLinearGradient(0, 0, W, 0); for (let i = 0; i <= 16; i++) gr.addColorStop(i / 16, i % 2 ? '#22775f' : '#175646');
  c.fillStyle = gr; c.fillRect(0, 0, W, H); hebras(c, W, H, 0.05, 3000);
  c.fillStyle = '#d9b04a'; c.fillRect(0, 0, 6, H); c.fillRect(W - 6, 0, 6, H);                       // cremallera
  sakura(c, W * 0.12, H * 0.28, 34); sakura(c, W * 0.155, H * 0.2, 20, '#fbe0e8');                    // pecho izquierdo
  const x0 = W / 2, y0 = H * 0.44;                                                                  // espalda: tigre bordado
  for (const [dx, dy, k] of [[-205, -95, 36], [215, -80, 30], [-190, 110, 28], [200, 115, 34], [-120, -150, 20], [130, -150, 22]]) sakura(c, x0 + dx, y0 + dy, k);
  c.fillStyle = '#f2922c'; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(x0 + s * 58, y0 - 70); c.lineTo(x0 + s * 108, y0 - 118); c.lineTo(x0 + s * 112, y0 - 52); c.fill(); }
  c.beginPath(); c.ellipse(x0, y0, 124, 104, 0, 0, TAU); c.fill();
  c.strokeStyle = '#1b1310'; c.lineWidth = 11; c.lineCap = 'round';
  for (const s of [-1, 1]) for (const [a, b, e] of [[40, -95, 14], [80, -80, 8], [112, -30, 16]]) { c.beginPath(); c.moveTo(x0 + s * a, y0 + b); c.quadraticCurveTo(x0 + s * (a - 12), y0 + b + 22, x0 + s * (a - e - 20), y0 + b + 30); c.stroke(); }
  c.beginPath(); c.moveTo(x0, y0 - 100); c.lineTo(x0, y0 - 70); c.stroke();
  c.fillStyle = '#f7ecd6'; c.beginPath(); c.ellipse(x0, y0 + 42, 70, 50, 0, 0, TAU); c.fill();
  for (const s of [-1, 1]) { c.fillStyle = '#f4d44a'; c.beginPath(); c.ellipse(x0 + s * 48, y0 - 18, 24, 17, s * 0.25, 0, TAU); c.fill(); c.fillStyle = '#1b1310'; c.beginPath(); c.ellipse(x0 + s * 48, y0 - 18, 6, 14, 0, 0, TAU); c.fill(); }
  c.fillStyle = '#e88a9a'; c.beginPath(); c.moveTo(x0 - 16, y0 + 20); c.lineTo(x0 + 16, y0 + 20); c.lineTo(x0, y0 + 36); c.fill();
  c.strokeStyle = '#1b1310'; c.lineWidth = 5; c.beginPath(); c.moveTo(x0, y0 + 36); c.quadraticCurveTo(x0 - 18, y0 + 58, x0 - 32, y0 + 48); c.moveTo(x0, y0 + 36); c.quadraticCurveTo(x0 + 18, y0 + 58, x0 + 32, y0 + 48); c.stroke();
  letra(c, 'ニャンゴ', x0, y0 + 158, 44, '#e8b64c', 700);
});
// cuerpo de la prenda: fase = ángulo de la costura (0 delante, π detrás); ab = abertura delantera
function geoPrenda(clave, y0, y1, ex, fase = Math.PI, ab = null) {
  return cache('geo:prenda:' + clave, () => geoParam((u, v) => { const y = lerp(y0, y1, v), a = ab ? ab(y) : 0; return puntoTronco(fase + a + u * (TAU - 2 * a), y, ex(y)); }, 96, 24));
}
// aro que abraza el tronco (obi, bajos acanalados, cuellos)
function banda(clave, y, alto, grosor, ex, mat) {
  const m = new THREE.Mesh(cache('geo:banda:' + clave, () => geoAro((phi, yy) => radioTronco(phi, yy + y) + ex, perfilBanda(-alto / 2, alto / 2, -0.015, grosor, Math.min(0.016, alto * 0.3)), 96)), mat);
  m.position.set(0, y, zcTronco(y)); return m;
}
const tuboPor = (pts, r, mat, n = 64) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n, r, 10, false), mat);
// Una cinta PLANA pegada al tronco a lo largo de unos puntos (cuellos, solapas): el ancho va tumbado sobre la superficie.
// Los cuellos hechos con tubo redondo, de lado, se leían como un palito suelto delante del pecho.
function cintaPor(pts, ancho, mat, n = 90, grosor = 0.012) {
  const curva = new THREE.CatmullRomCurve3(pts), pos = [], idx = [], P = V3(), T = V3(), N = V3(), W = V3();
  for (let i = 0; i <= n; i++) {
    const u = i / n; curva.getPointAt(u, P); curva.getTangentAt(u, T);
    N.set(P.x, 0, P.z - zcTronco(P.y)).normalize(); W.crossVectors(T, N).normalize();
    for (const [a, e] of [[-1, 0], [1, 0], [1, grosor], [-1, grosor]]) pos.push(P.x + W.x * a * ancho / 2 + N.x * e, P.y + W.y * a * ancho / 2 + N.y * e, P.z + W.z * a * ancho / 2 + N.z * e);
  }
  for (let i = 0; i < n; i++) for (let k = 0; k < 4; k++) { const a = i * 4 + k, b = i * 4 + ((k + 1) % 4), c = a + 4, d = b + 4; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  mat.side = THREE.DoubleSide;   // la cinta es una caja fina: se ve bien por los dos lados
  return new THREE.Mesh(g, mat);
}
const rib = (col, raya, n = 1) => vinilo(col, { rug: 0.6, cc: 0.15, u: { uRaya: new THREE.Color(raya) }, pintura: `col = mix(col, uRaya, aa(abs(fract(p.y * ${(9 * n).toFixed(1)} + 0.5) - 0.5) - 0.17)); col *= 0.9 + 0.1 * smoothstep(-0.4, 0.9, sin(atan(p.x, p.z) * 90.0));` });
const bolaG = () => cache('geo:esfera20', () => new THREE.SphereGeometry(1, 20, 14));
// extra: holgura sobre el tronco (también para los choques); capa: radio de arriba de la capa; oculta: piezas del equipo que no caben
const ROPA = {
  yukata: {
    extra: (y) => 0.045 + 0.035 * Math.pow(c01((0.62 - y) / 0.22), 2), capa: 0.4,
    manga: { largo: 0.58, vuelo: 0.075, puno: 0, tex: texYukata, um: [0, 0.3] },
    crear() {
      const g = new THREE.Group(), ex = this.extra, P = (phi, y, e = 0.016) => puntoTronco(phi, y, ex(y) + e);
      g.add(new THREE.Mesh(geoPrenda('yukata', 0.4, 0.97, ex), tela(0xffffff, { map: texYukata(), side: THREE.DoubleSide, roughness: 0.78 })));
      // cuello cruzado: el panel izquierdo por encima (baja del hombro izquierdo a la cadera derecha) y la nuca
      const eri = vinilo(0xf3ecf5, { rug: 0.7, cc: 0.1 }), tramo = (a0, a1, y0, y1, n = 10) => Array.from({ length: n + 1 }, (_, i) => P(lerp(a0, a1, i / n), lerp(y0, y1, Math.pow(i / n, 0.9))));
      g.add(cintaPor(tramo(0.5, TAU - 0.5, 0.94, 0.94, 14), 0.07, eri), cintaPor(tramo(0.5, -0.36, 0.94, 0.54), 0.075, eri), cintaPor(tramo(-0.5, 0.04, 0.94, 0.78, 6), 0.07, eri));
      const obi = vinilo(0xf2b43a, { rug: 0.55, cc: 0.2, u: { uL: new THREE.Color(0xd8412a) }, pintura: 'col = mix(col, uL, aa(abs(p.y) - 0.006));' });
      g.add(banda('obiY', 0.5, 0.13, 0.03, ex(0.5) + 0.012, obi));
      const b = P(Math.PI, 0.53, 0.05);                                                             // lazo del obi en la espalda
      for (const s of [-1, 1]) {
        const l = new THREE.Mesh(bolaG(), obi); l.position.set(b.x + s * 0.13, b.y + 0.02, b.z - 0.02); l.scale.set(0.14, 0.085, 0.05); l.rotation.z = s * 0.25; g.add(l);
        const cae = new THREE.Mesh(cache('geo:caidaObi', () => new RoundedBoxGeometry(0.1, 0.2, 0.03, 3, 0.012)), obi); cae.position.set(b.x + s * 0.05, b.y - 0.12, b.z - 0.015); cae.rotation.z = s * 0.18; g.add(cae);
      }
      const nudo = new THREE.Mesh(bolaG(), obi); nudo.position.set(b.x, b.y + 0.01, b.z - 0.04); nudo.scale.set(0.055, 0.065, 0.045); g.add(nudo);
      return g;
    },
  },
  happi: {
    extra: (y) => 0.05 + 0.04 * Math.pow(c01((0.62 - y) / 0.2), 2), capa: 0.4,
    manga: { largo: 0.46, vuelo: 0.055, puno: 0, tex: texHappi, um: [0.14, 0.2] },
    crear() {
      const g = new THREE.Group(), ex = this.extra, ab = () => 0.34, y0 = 0.44, y1 = 0.975;
      g.add(new THREE.Mesh(geoPrenda('happi', y0, y1, ex, 0, ab), tela(0xffffff, { map: texHappi(), side: THREE.DoubleSide, roughness: 0.75 })));
      const pts = [];
      for (let i = 0; i <= 8; i++) { const y = lerp(y0 + 0.01, y1 - 0.02, i / 8); pts.push(puntoTronco(0.34, y, ex(y) + 0.004)); }
      for (let i = 1; i < 12; i++) pts.push(puntoTronco(lerp(0.34, TAU - 0.34, i / 12), y1 - 0.02, ex(y1) + 0.004));
      for (let i = 8; i >= 0; i--) { const y = lerp(y0 + 0.01, y1 - 0.02, i / 8); pts.push(puntoTronco(-0.34, y, ex(y) + 0.004)); }
      g.add(cintaPor(pts, 0.07, vinilo(0x1f2c4c, { rug: 0.5, cc: 0.3 }), 180));
      const faja = vinilo(0xfbf7ee, { rug: 0.7, cc: 0.1, u: { uI: new THREE.Color(0x1f2c4c) }, pintura: 'col = mix(col, uI, 0.8 * aa(abs(fract(atan(p.x, p.z) * 7.0 + p.y * 40.0) - 0.5) - 0.2));' });
      g.add(banda('fajaH', 0.52, 0.045, 0.02, ex(0.52) + 0.012, faja));
      const nudo = new THREE.Mesh(bolaG(), faja); nudo.position.copy(puntoTronco(-0.55, 0.52, ex(0.52) + 0.05)); nudo.scale.set(0.05, 0.045, 0.04); g.add(nudo);
      return g;
    },
  },
  gakuran: {
    extra: () => 0.045, capa: 0.39,
    manga: { largo: 0.86, vuelo: 0.008, puno: 0.012, eri: 0xd9b04a, tex: texGakuran, um: [0.3, 0.15] },
    crear() {
      const g = new THREE.Group(), ex = this.extra;
      g.add(new THREE.Mesh(geoPrenda('gakuran', 0.42, 0.95, ex, 0), tela(0xffffff, { map: texGakuran(), side: THREE.DoubleSide, roughness: 0.6, sheen: 0.4 })));
      g.add(banda('cuelloG', 0.915, 0.075, 0.03, ex(0.92) + 0.004, vinilo(0x1a1d2b, { rug: 0.45, cc: 0.3 })));
      const dorado = oro(), boton = cache('geo:boton', () => { const q = new THREE.SphereGeometry(1, 16, 10); q.scale(1, 1, 0.45); return q; });
      for (let i = 0; i < 5; i++) { const y = lerp(0.5, 0.84, i / 4), b = new THREE.Mesh(boton, dorado); b.position.copy(puntoTronco(0, y, ex(y) + 0.008)); b.scale.setScalar(0.03); g.add(b); }
      for (const s of [-1, 1]) { const ins = new THREE.Mesh(cache('geo:insignia', () => { const q = new THREE.CylinderGeometry(0.028, 0.028, 0.01, 20); q.rotateX(Math.PI / 2); return q; }), dorado); ins.position.copy(puntoTronco(s * 0.55, 0.915, ex(0.92) + 0.036)); ins.rotation.y = s * 0.55; g.add(ins); }
      return g;
    },
  },
  parka: {
    extra: () => 0.065, oculta: ['bufanda', 'capa'],
    manga: { largo: 0.86, vuelo: 0.006, puno: 0.045, eri: 0x6fae91, tex: texParka, um: [0.02, 0.2] },
    crear() {
      const g = new THREE.Group(), ex = this.extra, menta = vinilo(0x86c6a8, { rug: 0.85, cc: 0.05 });
      g.add(new THREE.Mesh(geoPrenda('parka', 0.44, 0.97, ex), tela(0xffffff, { map: texParka(), side: THREE.DoubleSide, roughness: 0.9, sheen: 0.9 })));
      g.add(banda('ribP', 0.445, 0.07, 0.028, ex(0.45) + 0.006, rib(0x6fae91, 0x62a085, 3)));
      // capucha con orejitas, apoyada en la espalda
      const cap = new THREE.Group(), fondo = new THREE.Mesh(cache('geo:esfera28', () => new THREE.SphereGeometry(1, 28, 18)), menta); fondo.scale.set(0.3, 0.19, 0.14); cap.add(fondo);
      const borde = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.04, 10, 36), vinilo(0x6fae91, { rug: 0.85, cc: 0.05 })); borde.rotation.x = Math.PI / 2 - 0.5; borde.position.set(0, 0.1, 0.05); borde.scale.set(1.15, 1, 0.8); cap.add(borde);
      for (const s of [-1, 1]) { const o = new THREE.Mesh(cache('geo:orejaCap', () => new THREE.ConeGeometry(0.07, 0.13, 16)), menta); o.position.set(s * 0.19, 0.16, -0.02); o.rotation.set(-0.3, 0, -s * 0.35); cap.add(o); }
      cap.position.set(0, 0.8, puntoTronco(Math.PI, 0.8, ex(0.8)).z - 0.04); cap.rotation.x = 0.25; g.add(cap);
      const cordon = vinilo(0xf6efe0, { rug: 0.6 }), herrete = vinilo(0xd9b04a, { rug: 0.35, cc: 0.6 });
      for (const s of [-1, 1]) {
        const p = puntoTronco(s * 0.3, 0.9, ex(0.9) + 0.012), c = new THREE.Mesh(cache('geo:cordon', () => new THREE.CapsuleGeometry(0.011, 0.19, 4, 8)), cordon);
        c.position.set(p.x, p.y - 0.1, p.z + 0.01); c.rotation.z = s * 0.05; g.add(c);
        const h = new THREE.Mesh(cache('geo:herrete', () => new THREE.CylinderGeometry(0.014, 0.014, 0.04, 10)), herrete); h.position.set(p.x + s * 0.005, p.y - 0.215, p.z + 0.012); g.add(h);
      }
      return g;
    },
  },
  maekake: {
    extra: (y) => (y < 0.88 ? 0.07 : 0.035), capa: 0.38,
    manga: { largo: 0.3, vuelo: 0.014, puno: 0.012, eri: 0xe6ddcc, col: 0xf4efe6 },
    crear() {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(geoPrenda('camiseta', 0.42, 0.97, () => 0.032), tela(0xf4efe6, { side: THREE.DoubleSide, roughness: 0.85 })));
      const exD = (y) => 0.058 + 0.035 * Math.pow(c01((0.58 - y) / 0.2), 2), A = 0.95, Y0 = 0.38, Y1 = 0.86;
      g.add(new THREE.Mesh(cache('geo:delantal', () => geoParam((u, v) => { const y = lerp(Y0, Y1, v); return puntoTronco(lerp(-A, A, u), y, exD(y)); }, 40, 20)), tela(0xffffff, { map: texDelantal(), side: THREE.DoubleSide, roughness: 0.8 })));
      const cinta = vinilo(0xf3ecdc, { rug: 0.7, cc: 0.1 }), nuca = [];                           // cinta al cuello y a la cintura, con lazo detrás
      for (let i = 0; i <= 12; i++) nuca.push(puntoTronco(lerp(0.75, TAU - 0.75, i / 12), 0.955, 0.05));
      g.add(tuboPor([puntoTronco(A * 0.8, Y1, exD(Y1)), puntoTronco(0.72, 0.93, 0.06), ...nuca, puntoTronco(-0.72, 0.93, 0.06), puntoTronco(-A * 0.8, Y1, exD(Y1))], 0.016, cinta, 90));
      const cint = []; for (let i = 0; i <= 16; i++) cint.push(puntoTronco(lerp(A, TAU - A, i / 16), 0.6, exD(0.6) + 0.005));
      g.add(tuboPor(cint, 0.017, cinta, 90));
      const b = puntoTronco(Math.PI, 0.6, exD(0.6) + 0.03);
      for (const s of [-1, 1]) {
        const l = new THREE.Mesh(bolaG(), cinta); l.position.set(b.x + s * 0.06, b.y + 0.01, b.z); l.scale.set(0.06, 0.03, 0.02); l.rotation.z = s * 0.35; g.add(l);
        const cae = new THREE.Mesh(cache('geo:cintaCae', () => new THREE.CapsuleGeometry(0.014, 0.12, 4, 8)), cinta); cae.position.set(b.x + s * 0.035, b.y - 0.08, b.z); cae.rotation.z = s * 0.25; g.add(cae);
      }
      return g;
    },
  },
  sukajan: {
    extra: () => 0.068, capa: 0.42,
    manga: { largo: 0.86, vuelo: 0.022, puno: 0.042, eri: 0x1b1a22, tex: texSukajan, um: [0.3, 0.12] },
    crear() {
      const g = new THREE.Group(), ex = this.extra;
      g.add(new THREE.Mesh(geoPrenda('sukajan', 0.45, 0.95, ex, 0), new THREE.MeshPhysicalMaterial({ map: texSukajan(), side: THREE.DoubleSide, roughness: 0.3, sheen: 1, sheenRoughness: 0.28, sheenColor: new THREE.Color(0xbfeee0), clearcoat: 0.35, clearcoatRoughness: 0.35 })));
      g.add(banda('ribSc', 0.925, 0.06, 0.03, ex(0.92) + 0.002, rib(0x1b1a22, 0xf6ead2, 1.5)), banda('ribSb', 0.45, 0.075, 0.03, ex(0.45) + 0.006, rib(0x1b1a22, 0xf2661b, 1)));
      const tir = new THREE.Mesh(cache('geo:tirador', () => new RoundedBoxGeometry(0.026, 0.05, 0.012, 2, 0.005)), oro()); tir.position.copy(puntoTronco(0, 0.84, ex(0.84) + 0.01)); g.add(tir);
      return g;
    },
  },
};
export const PRENDAS = Object.keys(ROPA);

// ───────────────────────────── la habitación ─────────────────────────────
// Texturas píxel a píxel de la sala (~3 Mpx): se generan en un Worker para no bloquear el hilo principal.
// Cada PIX[tipo](W, H, op) devuelve la función del píxel; solo usa azar, ruido2, fbm y lerp (el Worker recibe su código).
const PIX = {
  yeso(W, H, { claro = [150, 126, 76], oscuro = [96, 80, 44] } = {}) {
    const n1 = ruido2(3), n2 = ruido2(4), n3 = ruido2(5), n4 = ruido2(6);
    return (x, y, o) => {
      const u = (x / W) * 12, v = (y / H) * 7.5, grande = fbm(n1, u * 0.32, v * 0.32, 4), w = fbm(n3, u * 0.55, v * 0.55, 3);
      const t = n2(u * 1.6 + w * 5.2, v * 3.4 + w * 4.1), surco = Math.pow(1 - Math.abs(t * 2 - 1), 9), grano = n4(x * 0.45, y * 0.45), manchas = fbm(n1, u * 1.3 + 17, v * 1.3, 4);
      const k = grande * 0.8 + manchas * 0.35 + surco * 0.1 * grande - 0.3 + (grano - 0.5) * 0.1;
      o[0] = lerp(oscuro[0], claro[0], k); o[1] = lerp(oscuro[1], claro[1], k); o[2] = lerp(oscuro[2], claro[2], k); o[3] = grande * 0.4 + surco * 0.4 + grano * 0.2;
    };
  },
  tatami(W, H, { claro = [196, 172, 98], oscuro = [92, 80, 38] } = {}) {
    const n = ruido2(12), n2 = ruido2(13);
    return (x, y, o) => {
      const fila = y / 7.1, f = Math.floor(fila), fr = fila - f, bulto = Math.sin(fr * Math.PI);
      const tono = n(f * 0.37, 3.1) * 0.55 + n2(x * 0.006, f * 0.3) * 0.45, trama = (Math.floor(x / 128 + (f % 2) * 0.5) % 2) ? 0.03 : 0;
      const hilo = Math.abs(((x + (f % 2) * 64) % 128) - 64) < 1.4 ? -0.18 : 0, k = 0.35 + bulto * 0.55 + (tono - 0.5) * 0.5 + trama + hilo;
      o[0] = lerp(oscuro[0], claro[0], k); o[1] = lerp(oscuro[1], claro[1], k); o[2] = lerp(oscuro[2], claro[2], k); o[3] = bulto * 0.8 + hilo;
    };
  },
  madera(W, H, { base = [168, 116, 66], oscuro = [104, 64, 32], tablas = 4, semilla = 21, frec = 90 } = {}) {
    const n = ruido2(semilla), n2 = ruido2(semilla + 1);
    return (x, y, o) => {
      const tabla = Math.floor((x / W) * tablas), fx = ((x / W) * tablas) % 1, w = fbm(n, x * 0.004 + tabla * 7, y * 0.0015, 3);
      const veta = Math.pow(0.5 + 0.5 * Math.sin((fx * 6 + w * 5 + tabla * 1.7) * frec * 0.1), 3), junta = fx < 0.012 || fx > 0.988 ? 1 : 0;
      const k = 0.25 + veta * 0.5 + (n2(tabla * 3.1, y * 0.004) - 0.5) * 0.35 + (w - 0.5) * 0.3, j = junta ? 0.3 : 1;
      o[0] = lerp(oscuro[0], base[0], k) * j; o[1] = lerp(oscuro[1], base[1], k) * j; o[2] = lerp(oscuro[2], base[2], k) * j; o[3] = junta ? 0 : 0.5 + veta * 0.3;
    };
  },
};
// color (RGBA) y altura (gris) de una textura PIX, en arrays transferibles
function pintarPix(tipo, W, H, op) {
  const fn = PIX[tipo](W, H, op), col = new Uint8ClampedArray(W * H * 4), alto = new Uint8ClampedArray(W * H * 4), o = [0, 0, 0, 0];
  for (let j = 0, k = 0; j < H; j++) for (let i = 0; i < W; i++, k += 4) {
    fn(i, j, o); col[k] = o[0]; col[k + 1] = o[1]; col[k + 2] = o[2]; col[k + 3] = 255;
    alto[k] = alto[k + 1] = alto[k + 2] = Math.max(0, Math.min(255, o[3] * 255)); alto[k + 3] = 255;
  }
  return { col, alto };
}
let obreroTex, nEncargo = 0;
const encargos = new Map();
function generarPix(tipo, W, H, op = {}) {
  if (obreroTex === undefined) {
    obreroTex = obrero(`const lerp = ${lerp};\n${azar}\n${ruido2}\n${fbm}\nconst PIX = {\n${Object.values(PIX).map(String).join(',\n')}\n};\n${pintarPix}\n`
      + 'onmessage = (e) => { const { id, tipo, W, H, op } = e.data; const r = pintarPix(tipo, W, H, op); postMessage({ id, col: r.col, alto: r.alto }, [r.col.buffer, r.alto.buffer]); };');
    if (obreroTex) {
      obreroTex.onmessage = (e) => { const f = encargos.get(e.data.id); encargos.delete(e.data.id); f?.ok(e.data); };
      obreroTex.onerror = (e) => { e.preventDefault?.(); const pend = [...encargos.values()]; encargos.clear(); obreroTex = null; pend.forEach((f) => f.ok(pintarPix(f.tipo, f.W, f.H, f.op))); };
    }
  }
  if (!obreroTex) return Promise.resolve(pintarPix(tipo, W, H, op));
  return new Promise((ok) => { const id = ++nEncargo; encargos.set(id, { ok, tipo, W, H, op }); obreroTex.postMessage({ id, tipo, W, H, op }); });
}
function texPix(clave, tipo, W, H, op, repetir = false) {
  return cache('tex:' + clave, () => generarPix(tipo, W, H, op).then(({ col, alto }) => {
    const aTex = (datos, srgb) => { const c = lienzo(W, H); c.getContext('2d').putImageData(new ImageData(datos, W, H), 0, 0); const t = texDe(c, { srgb, repetir }); t.userData.compartida = true; return t; };
    return { color: aTex(col, true), alto: aTex(alto, false) };
  }));
}
// Los colores de la sala, en un sitio. La portada va con una estética de habitación japonesa en pastel: yeso
// crema, tatami y madera claros, en pastel, en vez del ocre y el marrón oscuro de antes (que siguen aquí, en ANTES).
const SALA_ANTES = { yeso: { claro: [150, 126, 76], oscuro: [96, 80, 44] }, tatami: { claro: [196, 172, 98], oscuro: [92, 80, 38] },
  pilar: { base: [176, 128, 78], oscuro: [112, 72, 38] }, tarima: { base: [168, 116, 66], oscuro: [104, 64, 32] }, zocalo: 0x7a5232, heri: 0x2b2420, suelo: 0x5a4424 };
const SALA_PASTEL = { yeso: { claro: [247, 236, 214], oscuro: [214, 196, 166] }, tatami: { claro: [226, 216, 158], oscuro: [158, 150, 96] },
  pilar: { base: [220, 178, 130], oscuro: [170, 124, 80] }, tarima: { base: [226, 186, 138], oscuro: [176, 132, 88] }, zocalo: 0xc49a6c, heri: 0x6a7aa6, suelo: 0x8f7a5c };
// 30-09 · la luz cálida de la habitación: yeso ocre arena, tatami dorado,
// madera rojiza y heri marrón; con color de verdad (lo desaturado se lee sucio), ni el pastel lavado ni el ocre oscuro de antes
const SALA_TORO = { yeso: { claro: [224, 190, 128], oscuro: [178, 142, 86] }, tatami: { claro: [222, 198, 102], oscuro: [150, 128, 56] },
  pilar: { base: [136, 80, 38], oscuro: [82, 44, 18] }, tarima: { base: [152, 84, 42], oscuro: [98, 50, 24] }, zocalo: 0x5a3018, heri: 0x5a3a22, suelo: 0x8a6634 };
const SALA = SALA_TORO;
// las cuatro de la sala, en paralelo con el resto del arranque
const texturasSala = () => Promise.all([
  texPix('yeso', 'yeso', 1024, 640, SALA.yeso),
  texPix('tatami', 'tatami', 1024, 1024, SALA.tatami, true),
  texPix('madera:pilar', 'madera', 256, 1024, { tablas: 1, ...SALA.pilar, semilla: 41, frec: 60 }, true),
  texPix('madera:tarima', 'madera', 1024, 1024, { tablas: 4, ...SALA.tarima, semilla: 51 }, true),
]).then(([yeso, tatami, pilar, tarima]) => ({ yeso, tatami, pilar, tarima }));
// zabutón índigo con motivo shippō (círculos entrelazados)
const texZabuton = () => texC('zabuton', 1024, 1024, (c, W, H) => {
  c.fillStyle = '#26396a'; c.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 4) { c.fillStyle = `rgba(255,255,255,${y % 8 ? 0.025 : 0.05})`; c.fillRect(0, y, W, 1.5); }
  const s = 128, r = s / Math.SQRT2;
  c.lineWidth = 7; c.strokeStyle = 'rgba(232,206,140,0.85)';
  for (let a = -1; a <= 8; a++) for (let b = -1; b <= 8; b++) for (const [ox, oy] of [[0, 0], [0.5, 0.5]]) { c.beginPath(); c.arc((a + ox) * s, (b + oy) * s, r, 0, TAU); c.stroke(); }
  c.fillStyle = 'rgba(232,206,140,0.9)';
  for (let a = 0; a <= 8; a++) for (let b = 0; b <= 8; b++) { c.beginPath(); c.arc(a * s + s / 2, b * s, 7, 0, TAU); c.fill(); c.beginPath(); c.arc(a * s, b * s + s / 2, 7, 0, TAU); c.fill(); }
});
const texKakejiku = (clave, fn) => texC('kake:' + clave, 512, 1400, (c, W, H) => {
  c.fillStyle = '#6f6440'; c.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 24) for (let x = (y / 24) % 2 ? 12 : 0; x < W; x += 24) { c.fillStyle = 'rgba(230,200,120,0.12)'; c.beginPath(); c.arc(x, y, 5, 0, TAU); c.fill(); }
  c.fillStyle = '#e9dfc6'; c.fillRect(70, 220, W - 140, H - 460);
  c.fillStyle = 'rgba(120,90,40,0.08)'; for (let i = 0; i < 400; i++) c.fillRect(70 + ((i * 131) % (W - 140)), 220 + ((i * 197) % (H - 460)), 2, 2);
  fn(c, W, H);
});
const FUENTE_JP = '"Yu Mincho", "YuMincho", "Hiragino Mincho ProN", "Noto Serif JP", "MS Mincho", serif';
function blob(op) { return texC('blob' + op, 256, 256, (c) => { const g = c.createRadialGradient(128, 128, 0, 128, 128, 128); g.addColorStop(0, `rgba(0,0,0,${op})`); g.addColorStop(0.5, `rgba(0,0,0,${op * 0.45})`); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, 256, 256); }, { srgb: false }); }
function sombraPlana(w, d, op = 0.55) {
  const m = new THREE.Mesh(cache('geo:plano1', () => new THREE.PlaneGeometry(1, 1)), new THREE.MeshBasicMaterial({ map: blob(1), transparent: true, depthWrite: false, opacity: op, color: 0x000000 }));
  m.scale.set(w, d, 1); m.rotation.x = -Math.PI / 2; m.renderOrder = 1; return m;
}
const PARED_Z = -3.4;
function crearHabitacion(tex) {
  const sala = new THREE.Group(), prim = {};
  const yeso = tex.yeso;
  const pared = new THREE.Mesh(new THREE.PlaneGeometry(30, 16), new THREE.MeshStandardMaterial({ map: yeso.color, bumpMap: yeso.alto, bumpScale: 2.2, roughness: 0.95 }));
  pared.position.set(0, 7.8, PARED_Z); pared.receiveShadow = true; sala.add(pared);
  const zocalo = new THREE.Mesh(new THREE.BoxGeometry(30, 0.2, 0.09), new THREE.MeshStandardMaterial({ color: SALA.zocalo, roughness: 0.6 })); zocalo.position.set(0, 0.1, PARED_Z + 0.045); sala.add(zocalo);
  const tP = tex.pilar;
  const pilar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 16, 0.34), new THREE.MeshStandardMaterial({ map: tP.color, roughness: 0.62, bumpMap: tP.alto, bumpScale: 0.8 }));
  pilar.position.set(-4, 8, PARED_Z + 0.17); pilar.castShadow = true; sala.add(pilar); prim.pilar = pilar;
  // el nageshi: la viga de madera oscura que cruza la pared por encima
  const nageshi = new THREE.Mesh(new THREE.BoxGeometry(30, 0.4, 0.24), new THREE.MeshStandardMaterial({ map: tP.color, roughness: 0.6, bumpMap: tP.alto, bumpScale: 0.6 }));
  nageshi.position.set(0, 6.5, PARED_Z + 0.12); nageshi.castShadow = true; nageshi.receiveShadow = true; sala.add(nageshi);
  const kake = new THREE.Group();
  const papel = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 2.88), new THREE.MeshStandardMaterial({ roughness: 0.9, map: texKakejiku('nyango', (c, W) => {
    c.fillStyle = '#1b1310'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `900 170px ${FUENTE_JP}`;
    c.fillText('ニ', W / 2, 400); c.font = `900 118px ${FUENTE_JP}`; c.fillText('ャ', W / 2 + 22, 530); c.font = `900 170px ${FUENTE_JP}`; c.fillText('ン', W / 2, 660); c.fillText('語', W / 2, 850);
    c.fillStyle = '#c0392b'; c.fillRect(W / 2 + 40, 990, 56, 56); c.fillStyle = '#e9dfc6'; c.font = '700 34px serif'; c.fillText('猫', W / 2 + 68, 1020);
  }) }));
  kake.add(papel);
  const rodillo = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.25, 12), new THREE.MeshStandardMaterial({ color: 0x3a2618, roughness: 0.5 })); rodillo.rotation.z = Math.PI / 2; rodillo.position.set(0, -1.46, 0.03); kake.add(rodillo);
  for (const s of [-1, 1]) { const pomo = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), new THREE.MeshStandardMaterial({ color: 0xd9c08a, roughness: 0.35, metalness: 0.3 })); pomo.position.set(s * 0.64, -1.46, 0.03); kake.add(pomo); }
  kake.position.set(2.6, 3.4, PARED_Z + 0.03); sombrear(kake); sala.add(kake); prim.kake = kake;
  // 30-09 · la ventana redonda (丸窓) detrás de Mochi: por ella se ve Hokkaido de verdad (el monte Yōtei, la misma foto que la
  // pantalla de carga). La sala sigue en 3D porque lleva los objetos del jugador; el paisaje es foto, como en las escenas del
  // rediseño. La vista va sin luces ni tono (es «lo de fuera») y un aro oscuro da el grosor del muro. recolocar() la mueve.
  const ventana = new THREE.Group();
  const fotoV = cache('tex:ventana-yotei', () => { const t = new THREE.TextureLoader().load('/img/ventana/yotei.webp'); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; });
  ventana.add(new THREE.Mesh(new THREE.CircleGeometry(1.35, 72), new THREE.MeshBasicMaterial({ map: fotoV, color: new THREE.Color().setRGB(1.08, 1.12, 1.22), toneMapped: false })));
  const hueco = new THREE.Mesh(new THREE.RingGeometry(1.33, 1.5, 72), new THREE.MeshStandardMaterial({ color: 0x9c8866, roughness: 0.92 })); hueco.position.z = 0.004; ventana.add(hueco);
  const marco = new THREE.Mesh(new THREE.TorusGeometry(1.43, 0.08, 14, 120), new THREE.MeshStandardMaterial({ map: tP.color, color: 0xb9906a, roughness: 0.55 }));
  marco.position.z = 0.05; sombrear(marco); ventana.add(marco);
  ventana.position.set(0, 3.9, PARED_Z + 0.012); sala.add(ventana); prim.ventana = ventana;
  // la lámpara de papel de pie (a lo Akari), junto al pilar: la luz cálida con su fuente a la vista (lo cozy: varios puntos de
  // luz suaves, no un foco); lleva dentro su luz, que calienta ese rincón y el tatami. recolocar() la arrima al pilar.
  const lamp = new THREE.Group();
  const papelL = new THREE.Mesh(new THREE.SphereGeometry(0.42, 36, 24), new THREE.MeshStandardMaterial({ color: 0xffe2b4, emissive: 0xffa448, emissiveIntensity: 2.6, roughness: 0.95 }));
  papelL.scale.set(1, 1.28, 1); papelL.position.y = 1.62; lamp.add(papelL);
  const costilla = new THREE.MeshBasicMaterial({ color: 0xe0a768 });
  for (let k = -3; k <= 3; k++) { const aro = new THREE.Mesh(new THREE.TorusGeometry(0.425 * Math.sqrt(1 - (k / 4) ** 2), 0.007, 6, 48), costilla); aro.rotation.x = Math.PI / 2; aro.position.y = 1.62 + (k * 0.42 * 1.28) / 4; lamp.add(aro); }
  const hierroL = new THREE.MeshStandardMaterial({ color: 0x2e2019, roughness: 0.5, metalness: 0.3 });
  const vara = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.1, 8), hierroL); vara.position.y = 0.62; lamp.add(vara);
  for (let k = 0; k < 3; k++) { const a = (k / 3) * TAU, pata = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.42, 6), hierroL);
    pata.position.set(Math.cos(a) * 0.14, 0.17, Math.sin(a) * 0.14); pata.rotation.set(Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7); lamp.add(pata); }
  sombrear(vara, false);
  const luzL = new THREE.PointLight(0xffaa50, 9, 6.5, 1.6); luzL.position.y = 1.62; lamp.add(luzL);
  // el halo alrededor del papel (hace de «bloom»: se lee como luz, no como una bola blanca)
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texC('halo-lampara', 128, 128, (c) => { const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,190,110,0.55)'); g.addColorStop(0.35, 'rgba(255,160,70,0.22)'); g.addColorStop(1, 'rgba(255,140,50,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 128); }),
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  halo.scale.set(2.4, 2.6, 1); halo.position.y = 1.62; lamp.add(halo);
  const charco = sombraPlana(1.1, 1.1, 0.0); charco.material.color.set(0xffb45e); charco.material.opacity = 0.18; charco.material.blending = THREE.AdditiveBlending; charco.position.y = 0.006; lamp.add(charco);
  lamp.position.set(-3.2, 0, PARED_Z + 0.6); sala.add(lamp); prim.lampara = lamp;
  const tat = tex.tatami; tat.color.repeat.set(30 / 6.8, 1); tat.alto.repeat.set(30 / 6.8, 1);
  const tatami = new THREE.Mesh(new THREE.PlaneGeometry(30, 6.8), new THREE.MeshStandardMaterial({ map: tat.color, bumpMap: tat.alto, bumpScale: 1.4, roughness: 0.85 }));
  tatami.rotation.x = -Math.PI / 2; tatami.position.set(0, 0, PARED_Z + 3.4); tatami.receiveShadow = true; sala.add(tatami);
  const heri = new THREE.Mesh(new THREE.BoxGeometry(30, 0.03, 0.32), tela(SALA.heri, { roughness: 0.7 })); heri.position.set(0, 0.012, PARED_Z + 6.8 - 0.16); heri.receiveShadow = true; sala.add(heri);
  // 30-09 · delante, tatami también (todo el suelo de tatami dorado con su heri oscuro), no tarima rojiza
  const tfc = tat.color.clone(), tfa = tat.alto.clone(); for (const t of [tfc, tfa]) { t.repeat.set(30 / 6.8, 16 / 6.8); t.needsUpdate = true; }
  const tarima = new THREE.Mesh(new THREE.PlaneGeometry(30, 16), new THREE.MeshStandardMaterial({ map: tfc, bumpMap: tfa, bumpScale: 1.4, roughness: 0.85 }));
  const heriM = tela(SALA.heri, { roughness: 0.7 }), ZT = PARED_Z + 6.8;
  for (const x of [-8.4, 2.8, 14]) { const h = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.03, 5.6), heriM); h.position.set(x, 0.012, ZT + 2.8); h.receiveShadow = true; sala.add(h); }
  for (const x of [-2.8, 8.4, -14]) { const h = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.03, 5.6), heriM); h.position.set(x, 0.012, ZT + 8.4); h.receiveShadow = true; sala.add(h); }
  { const h = new THREE.Mesh(new THREE.BoxGeometry(30, 0.03, 0.32), heriM); h.position.set(0, 0.012, ZT + 5.6); h.receiveShadow = true; sala.add(h); }
  tarima.rotation.x = -Math.PI / 2; tarima.position.set(0, -0.02, PARED_Z + 6.8 + 8); tarima.receiveShadow = true; sala.add(tarima);
  // zabutón mullido, hundido donde se sienta Mochi, con borlas doradas
  const zg = cache('geo:zabuton', () => { const q = new RoundedBoxGeometry(2.5, 0.26, 2.4, 10, 0.12); q.translate(0, 0.13, 0); const p = q.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), arriba = c01((y - 0.04) / 0.26);
      const inflado = 0.2 * Math.pow(Math.max(0, (1 - (x / 1.25) ** 2) * (1 - (z / 1.2) ** 2)), 0.7), hundido = 0.09 * Math.exp(-((x * x) / 0.25 + ((z + 0.05) ** 2) / 0.3));
      p.setY(i, y + (inflado - hundido) * arriba); }
    q.computeVertexNormals(); return q; });
  const zabuton = new THREE.Mesh(zg, tela(0xffffff, { map: texZabuton(), roughness: 0.78, sheen: 1, sheenColor: new THREE.Color(0x8fa8d8), sheenRoughness: 0.45 }));
  sombrear(zabuton); sala.add(zabuton);
  const borla = tela(0xd4a336, { roughness: 0.7 });
  for (const [x, z] of [[-1.18, -1.13], [1.18, -1.13], [-1.18, 1.13], [1.18, 1.13]]) {
    const b = new THREE.Group(); b.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), borla));
    const fleco = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.24, 16, 1, true), borla); fleco.position.y = -0.1; b.add(fleco);
    b.position.set(x * 1.03, 0.16, z * 1.03); b.rotation.set(z > 0 ? 0.7 : -0.7, 0, x > 0 ? -0.5 : 0.5); sombrear(b); sala.add(b);
  }
  const sz = sombraPlana(3.3, 3.1, 0.55); sz.position.set(0, 0.004, 0.05); sala.add(sz);
  // motas de polvo en la luz cálida
  const nP = 46, datP = [], rp = azar(17);
  for (let i = 0; i < nP; i++) datP.push({ x: (rp() - 0.5) * 7, y: 0.4 + rp() * 4.2, z: -2.6 + rp() * 4.6, f: rp() * TAU, v: 0.04 + rp() * 0.08 });
  const gP = new THREE.BufferGeometry(); gP.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nP * 3), 3));
  const polvo = new THREE.Points(gP, new THREE.PointsMaterial({ map: texC('mota', 64, 64, (c) => { const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,236,200,1)'); g.addColorStop(1, 'rgba(255,220,170,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); }), size: 0.085, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
  polvo.frustumCulled = false; polvo.userData.datos = datP; sala.add(polvo); prim.polvo = polvo;
  for (const o of [pared, zocalo, pilar, tatami, heri, tarima, zabuton]) { o.matrixAutoUpdate = true; }
  return { sala, prim };
}

// ───────────────────── atrezo del catálogo (objetos de tipo «habitación») ─────────────────────
// Cada modelo: piezas sencillas con el mismo vinilo que Mochi. Origen en el suelo (o en el punto de cuelgue).
const gC = (clave, fn) => cache('geo:' + clave, fn);
const perfilV2 = (pts) => pts.map(([x, y]) => new THREE.Vector2(Math.max(x, 0.0001), y));
function torno(clave, pts, mat, seg = 48) { return new THREE.Mesh(gC('torno:' + clave, () => new THREE.LatheGeometry(perfilV2(pts), seg)), mat); }
function caja(w, h, d, r, mat) { return new THREE.Mesh(gC(`caja:${w}:${h}:${d}:${r}`, () => new RoundedBoxGeometry(w, h, d, 3, r)), mat); }
function cil(rt, rb, h, mat, seg = 32) { return new THREE.Mesh(gC(`cil:${rt}:${rb}:${h}:${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg)), mat); }
function esf(r, mat, seg = 24) { const m = new THREE.Mesh(gC('esf' + seg, () => new THREE.SphereGeometry(1, seg, Math.round(seg * 0.7))), mat); m.scale.setScalar(r); return m; }
function tuboPts(clave, pts, r, mat, seg = 32, cerrado = false) { return new THREE.Mesh(gC('tubo:' + clave, () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => V3(...p)), cerrado), seg, r, 10, cerrado)), mat); }
const pos = (o, x, y, z) => { o.position.set(x, y, z); return o; };
const texPlanar = (clave, w, h, fn) => texC('planar:' + clave, w, h, fn);
// vinilo con una ilustración proyectada de frente (daruma, maneki…)
const vinPlanar = (color, tex, rect, extra = {}) => vinilo(color, { ...extra, u: { uIlu: tex, uRect: new THREE.Vector4(...rect) },
  pintura: 'vec2 uvi = (p.xy - uRect.xy) / uRect.zw; if (p.z > 0.0 && uvi.x > 0.0 && uvi.x < 1.0 && uvi.y > 0.0 && uvi.y < 1.0) { vec4 f = texture2D(uIlu, uvi); float a = f.a * smoothstep(0.15, 0.45, np.z); col = mix(col, f.rgb, a); tinta = a * 0.5; }' });
const vapor = () => texC('vapor', 128, 128, (c) => { const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,0.7)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 128); });
function conVapor(g, x, y, z) {
  const sp = [0, 1, 2].map((i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: vapor(), transparent: true, depthWrite: false, opacity: 0 })); s.userData.f = i / 3; g.add(s); return s; });
  g.userData.anim = (t) => sp.forEach((s) => { const f = (t * 0.28 + s.userData.f) % 1; s.position.set(x + Math.sin(t * 0.8 + s.userData.f * 6) * 0.04, y + f * 0.6, z); s.scale.set(0.16 + f * 0.16, 0.3 + f * 0.2, 1); s.material.opacity = Math.sin(f * Math.PI) * 0.35; });
}
const barro = () => vinilo(0x9a4526, { rug: 0.42, cc: 0.6, ccr: 0.3 });
function kyusu(k) {
  const g = new THREE.Group(), m = barro();
  g.add(torno('kyusu', [[0, 0], [0.18, 0], [0.26, 0.06], [0.3, 0.16], [0.29, 0.26], [0.24, 0.33], [0.17, 0.36], [0, 0.36]], m));
  g.add(torno('kyusuTapa', [[0, 0.34], [0.175, 0.34], [0.17, 0.37], [0.12, 0.405], [0, 0.41]], m));
  g.add(pos(esf(0.04, m), 0, 0.43, 0));
  g.add(tuboPts('pico', [[0.22, 0.14, 0], [0.34, 0.2, 0], [0.42, 0.3, 0]], 0.035, m, 16));
  const asa = new THREE.Mesh(gC('asaKyusu', () => new THREE.CapsuleGeometry(0.042, 0.3, 6, 14)), m); asa.rotation.x = Math.PI / 2 - 0.25; asa.position.set(0, 0.22, 0.42); g.add(asa);
  g.rotation.y = 0.5; return g;
}
function yunomi(k) {
  const g = new THREE.Group();
  const esmalte = texC('esmalteYunomi', 64, 512, (c, W, H) => { const gr = c.createLinearGradient(0, H, 0, 0); gr.addColorStop(0, '#b89a78'); gr.addColorStop(0.2, '#b89a78'); gr.addColorStop(0.22, '#3d4f4c'); gr.addColorStop(0.6, '#5f7c6f'); gr.addColorStop(0.7, '#d9d0bd'); gr.addColorStop(1, '#efe8da'); c.fillStyle = gr; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 10; i++) { c.fillStyle = 'rgba(40,58,52,0.6)'; c.beginPath(); c.ellipse(i * 7, H * 0.78, 4, 30 + (i % 3) * 12, 0, 0, TAU); c.fill(); } });
  const cuerpoT = torno('yunomi', [[0, 0.02], [0.17, 0.02], [0.18, 0], [0.215, 0], [0.225, 0.05], [0.265, 0.2], [0.285, 0.46], [0.29, 0.52], [0.272, 0.53], [0.26, 0.47], [0.24, 0.2], [0.2, 0.08], [0, 0.07]].map(([x, y]) => [x * 1.05, y * 1.05]), new THREE.MeshPhysicalMaterial({ map: esmalte, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 }));
  g.add(cuerpoT);
  const te = new THREE.Mesh(gC('circ26', () => new THREE.CircleGeometry(0.26, 36)), new THREE.MeshPhysicalMaterial({ color: 0x8f9a3c, roughness: 0.08, clearcoat: 1 })); te.rotation.x = -Math.PI / 2; te.position.y = 0.46; g.add(te);
  conVapor(g, 0, 0.55, 0); return g;
}
const PROPS = {
  bandeja: { cat: 'suelo', r: 0.95, crear(k, ids) {
    const g = new THREE.Group();
    g.add(pos(caja(1.7, 0.06, 1.0, 0.025, vinilo(0x8e1d18, { rug: 0.28, cc: 1, ccr: 0.1 })), 0, 0.03, 0));
    const negro = vinilo(0x201312, { rug: 0.25, cc: 1, ccr: 0.1 });
    for (const [w, d, x, z] of [[1.72, 0.06, 0, 0.48], [1.72, 0.06, 0, -0.48], [0.06, 1.0, 0.83, 0], [0.06, 1.0, -0.83, 0]]) g.add(pos(caja(w, 0.1, d, 0.02, negro), x, 0.07, z));
    const kk = ids.includes('kyusu'), yy = ids.includes('yunomi');
    if (kk) g.add(pos(kyusu(k), yy ? 0.35 : 0, 0.06, -0.05));
    if (yy) { const y = yunomi(k); pos(y, kk ? -0.42 : 0, 0.06, 0.12); g.add(y); g.userData.anim = y.userData.anim; }
    return g;
  } },
  dango: { cat: 'suelo', r: 0.75, crear() {
    const g = new THREE.Group();
    g.add(pos(caja(1.25, 0.05, 0.6, 0.02, vinilo(0xf1ede4, { rug: 0.18, cc: 1 })), 0, 0.03, 0));
    const palillo = vinilo(0xd8b98a, { rug: 0.7, cc: 0 }), bolas = [0xf3a9b8, 0xf7f1e4, 0x9ec26a].map((c) => vinilo(c, { rug: 0.5, cc: 0.25, ccr: 0.4 }));
    for (const [z, giro] of [[-0.1, 0.08], [0.12, -0.1]]) {
      const br = new THREE.Group(); br.position.set(0, 0.2, z); br.rotation.y = giro;
      const p = cil(0.016, 0.016, 1.08, palillo, 8); p.rotation.z = Math.PI / 2; br.add(p);
      bolas.forEach((m, i) => br.add(pos(esf(0.13, m, 28), -0.26 + i * 0.25, 0, 0)));
      g.add(br);
    }
    return g;
  } },
  daruma: { cat: 'suelo', r: 0.55, crear() {
    const ilu = texPlanar('daruma', 512, 512, (c, W) => {
      c.translate(W / 2, W / 2); c.scale(W / 0.8, -W / 0.8); c.lineCap = 'round';
      c.fillStyle = '#fbf3e4'; c.beginPath(); c.ellipse(0, 0.12, 0.25, 0.2, 0, 0, TAU); c.fill(); c.lineWidth = 0.02; c.strokeStyle = '#e2b04a'; c.stroke();
      c.strokeStyle = '#1b1310'; c.lineWidth = 0.045; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 0.04, 0.24); c.quadraticCurveTo(s * 0.13, 0.3, s * 0.21, 0.22); c.stroke(); }
      c.lineWidth = 0.02; for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(s * (0.09 + i * 0.035), 0.02); c.quadraticCurveTo(s * (0.12 + i * 0.04), -0.05, s * (0.09 + i * 0.03), -0.06); c.stroke(); }
      for (const s of [-1, 1]) { c.beginPath(); c.arc(s * 0.1, 0.14, 0.055, 0, TAU); c.fillStyle = '#ffffff'; c.fill(); c.lineWidth = 0.014; c.strokeStyle = '#1b1310'; c.stroke(); }
      c.beginPath(); c.arc(-0.1, 0.14, 0.036, 0, TAU); c.fillStyle = '#1b1310'; c.fill();
      c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#e2b04a'; c.font = `900 96px ${FUENTE_JP}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('福', W / 2, W * 0.83);
    });
    const d = torno('daruma', [[0, 0], [0.3, 0.01], [0.44, 0.12], [0.5, 0.32], [0.47, 0.55], [0.36, 0.76], [0.2, 0.86], [0, 0.89]], vinPlanar(0xc8231c, ilu, [-0.4, 0.05, 0.8, 0.8], { rug: 0.25, cc: 1, ccr: 0.1 }), 56);
    const g = new THREE.Group(); g.add(d); g.rotation.y = 0.35; return g;
  } },
  furin: { cat: 'techo', r: 0.3, crear() {
    const g = new THREE.Group(), cuelga = new THREE.Group(); g.add(cuelga);
    cuelga.add(pos(cil(0.006, 0.006, 3.2, vinilo(0xe8e0d0, { cc: 0 }), 6), 0, 1.6, 0));
    const cristal = texC('furin', 256, 128, (c, W, H) => { c.fillStyle = 'rgba(210,240,250,0.35)'; c.fillRect(0, 0, W, H); for (let i = 0; i < 3; i++) { c.fillStyle = 'rgba(232,80,50,0.9)'; c.beginPath(); c.ellipse(40 + i * 85, 70, 18, 10, 0.3, 0, TAU); c.fill(); c.beginPath(); c.moveTo(56 + i * 85, 70); c.lineTo(72 + i * 85, 60); c.lineTo(72 + i * 85, 82); c.fill(); }
      c.strokeStyle = 'rgba(40,110,190,0.8)'; c.lineWidth = 5; c.beginPath(); for (let x = 0; x <= W; x += 8) c.lineTo(x, 108 + Math.sin(x * 0.1) * 5); c.stroke(); });
    const campana = torno('furin', [[0.03, 0], [0.06, -0.005], [0.14, -0.05], [0.2, -0.15], [0.22, -0.27], [0.215, -0.28]], new THREE.MeshPhysicalMaterial({ map: cristal, transparent: true, roughness: 0.05, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false }), 40);
    cuelga.add(campana);
    cuelga.add(pos(cil(0.012, 0.012, 0.12, vinilo(0xc8302a), 8), 0, -0.26, 0));
    const tira = new THREE.Group(); tira.position.y = -0.3; cuelga.add(tira);
    tira.add(pos(cil(0.004, 0.004, 0.2, vinilo(0xe8e0d0, { cc: 0 }), 5), 0, -0.1, 0));
    const tanzaku = new THREE.Mesh(gC('tanzaku', () => new THREE.PlaneGeometry(0.17, 0.56)), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.9, map: texC('tanzaku', 128, 420, (c, W, H) => { c.fillStyle = '#a9d6e8'; c.fillRect(0, 0, W, H); c.fillStyle = '#1b1310'; c.font = `700 84px ${FUENTE_JP}`; c.textAlign = 'center'; c.fillText('涼', W / 2, 150); c.fillStyle = '#c8302a'; c.fillRect(W / 2 - 14, 330, 28, 28); }) }));
    tanzaku.position.y = -0.48; tira.add(tanzaku);
    g.userData.anim = (t) => { cuelga.rotation.z = Math.sin(t * 1.3) * 0.06; tira.rotation.x = Math.sin(t * 1.9) * 0.2; tira.rotation.y = Math.sin(t * 0.8) * 0.5; };
    return g;
  } },
  chochin: { cat: 'techo', r: 0.45, luz: true, crear() {
    const g = new THREE.Group(), cuelga = new THREE.Group(); g.add(cuelga);
    cuelga.add(pos(cil(0.008, 0.008, 3.2, vinilo(0x2a2420, { cc: 0 }), 6), 0, 1.6, 0));
    const papelT = texC('chochin', 512, 256, (c, W, H) => { c.fillStyle = '#d23b2a'; c.fillRect(0, 0, W, H); for (let y = 0; y < H; y += 12) { c.fillStyle = 'rgba(80,10,10,0.25)'; c.fillRect(0, y, W, 2); }
      c.fillStyle = '#1b1310'; c.font = `900 150px ${FUENTE_JP}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.save(); c.translate(W * 0.25, H / 2); c.scale(0.7, 1); c.fillText('灯', 0, 0); c.restore(); c.save(); c.translate(W * 0.75, H / 2); c.scale(0.7, 1); c.fillText('灯', 0, 0); c.restore(); });
    const pts = []; for (let i = 0; i <= 24; i++) { const u = i / 24, y = -0.08 - u * 0.86; pts.push([0.36 * Math.pow(Math.sin(Math.PI * (0.1 + 0.8 * u)), 0.55) + (i % 2 ? 0.008 : 0), y]); }
    const papel = torno('chochin', pts, new THREE.MeshStandardMaterial({ map: papelT, emissiveMap: papelT, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.8, side: THREE.DoubleSide }), 40);
    cuelga.add(papel);
    const negro = vinilo(0x1b1512, { rug: 0.3, cc: 0.9 });
    cuelga.add(pos(cil(0.2, 0.22, 0.09, negro), 0, -0.07, 0), pos(cil(0.22, 0.2, 0.09, negro), 0, -0.96, 0));
    g.userData.luz = V3(0, -0.5, 0); g.userData.sinSombra = true;
    g.userData.anim = (t) => { cuelga.rotation.z = Math.sin(t * 0.9 + 1) * 0.035; };
    return g;
  } },
  cuaderno: { cat: 'cerca', r: 0.9, crear(k, ids) {
    const g = new THREE.Group();
    g.add(pos(caja(1.36, 0.03, 0.94, 0.012, vinilo(0x27335f, { rug: 0.6, cc: 0.2 })), 0, 0.015, 0));
    const hoja = texC('cuaderno', 512, 640, (c, W, H) => {
      c.fillStyle = '#f6f0e2'; c.fillRect(0, 0, W, H); const n = 5, cw = (W - 60) / n;
      c.strokeStyle = 'rgba(190,80,60,0.6)'; c.lineWidth = 3; for (let i = 0; i <= n; i++) { c.beginPath(); c.moveTo(30 + i * cw, 30); c.lineTo(30 + i * cw, H - 30); c.stroke(); }
      for (let j = 0; j * cw <= H - 60; j++) { c.beginPath(); c.moveTo(30, 30 + j * cw); c.lineTo(W - 30, 30 + j * cw); c.stroke(); }
      c.fillStyle = '#1b1310'; c.textAlign = 'center'; c.textBaseline = 'middle'; const r = azar(8);
      for (let j = 0; j < 6; j++) for (let i = 0; i < n; i++) { if (j * n + i > 17) break; c.save(); c.translate(30 + (i + 0.5) * cw + (r() - 0.5) * 8, 30 + (j + 0.5) * cw); c.rotate((r() - 0.5) * 0.25); c.font = `900 ${cw * (0.62 + r() * 0.12)}px ${FUENTE_JP}`; c.fillText(j === 0 && i === 0 ? '言' : '私', 0, 0); c.restore(); }
    });
    for (const s of [-1, 1]) { const p = pos(caja(0.64, 0.016, 0.88, 0.006, new THREE.MeshStandardMaterial({ map: hoja, roughness: 0.9 })), s * 0.33, 0.04, 0); p.rotation.z = -s * 0.07; g.add(p); }
    if (ids.includes('fude')) g.add(PROPS.fude.crear(k, ids, true));
    return g;
  } },
  fude: { cat: 'cerca', r: 0.6, crear(k, ids, sobre = false) {
    const g = new THREE.Group(), bambu = vinilo(0xc9a266, { rug: 0.45, cc: 0.5, u: { uNudo: new THREE.Color(0x8a6a3a) }, pintura: 'col = mix(col, uNudo, aa(abs(fract(p.y * 3.0) - 0.5) - 0.47));' });
    const mango = cil(0.028, 0.03, 0.92, bambu, 14); mango.rotation.z = Math.PI / 2; g.add(mango);
    const punta = new THREE.Mesh(gC('puntaFude', () => { const q = new THREE.LatheGeometry(perfilV2([[0.03, 0], [0.042, 0.04], [0.036, 0.1], [0.0, 0.18]]), 16); return q; }), vinilo(0x151212, { rug: 0.7, cc: 0 }));
    punta.rotation.z = Math.PI / 2; punta.position.x = 0.46; g.add(punta);
    if (sobre) { g.position.set(0.2, 0.09, 0.05); g.rotation.set(0, -0.55, 0.04); }
    else { g.position.y = 0.035; g.add(pos(caja(0.3, 0.05, 0.18, 0.02, vinilo(0x2a2622, { rug: 0.3, cc: 1 })), 0.56, -0.01, 0.18)); }
    return g;
  } },
  onigiri: { cat: 'suelo', r: 0.55, crear() {
    const g = new THREE.Group();
    g.add(torno('platoOni', [[0, 0], [0.3, 0], [0.4, 0.04], [0.42, 0.06], [0.38, 0.055], [0, 0.04]], vinilo(0x2d3f73, { rug: 0.2, cc: 1 })));
    const m = vinilo(0xfbf7ee, { rug: 0.62, cc: 0.12, u: { uNori: new THREE.Color(0x1c2620) }, pintura: 'float m = aa(max(abs(p.x) - 0.095, p.y + 0.035)); col = mix(col, uNori, m);' });
    for (const [x, r] of [[-0.13, 0.3], [0.15, -0.35]]) { const o = new THREE.Mesh(geosFigura().onigiri, m); o.scale.setScalar(1.25); o.position.set(x, 0.24, 0); o.rotation.set(-0.25, r, 0); g.add(o); }
    return g;
  } },
  mikan: { cat: 'suelo', r: 0.5, crear() {
    const g = new THREE.Group();
    g.add(torno('cesta', [[0, 0], [0.34, 0], [0.42, 0.08], [0.45, 0.14], [0.43, 0.15], [0.38, 0.09], [0, 0.07]], vinilo(0xb88a52, { rug: 0.6, cc: 0.2, pintura: 'col *= 0.85 + 0.15 * step(0.5, fract(atan(p.x, p.z) * 5.0 + p.y * 30.0));' })));
    const piel = vinilo(0xf08a1c, { rug: 0.5, cc: 0.4, pintura: 'col *= 0.93 + 0.07 * sin(p.x * 180.0) * sin(p.y * 170.0) * sin(p.z * 160.0);' }), hoja = vinilo(0x3f7a2e, { rug: 0.4, cc: 0.5 });
    for (const [x, y, z] of [[-0.14, 0.24, 0.04], [0.15, 0.24, -0.04], [0.0, 0.42, 0.0]]) { const m = pos(esf(0.19, piel, 28), x, y, z); m.scale.y *= 0.86; g.add(m); }
    const h = pos(esf(0.08, hoja), 0.05, 0.6, 0.03); h.scale.set(0.12, 0.02, 0.06); h.rotation.z = 0.4; g.add(h);
    return g;
  } },
  senbei: { cat: 'suelo', r: 0.5, crear() {
    const g = new THREE.Group();
    g.add(torno('platoSenbei', [[0, 0], [0.34, 0], [0.4, 0.04], [0.42, 0.05], [0.38, 0.05], [0, 0.035]], vinilo(0xe9e2d3, { rug: 0.3, cc: 1 })));
    const gall = vinilo(0xb8702e, { rug: 0.55, cc: 0.6, pintura: 'col *= 0.8 + 0.25 * fract(sin(dot(floor(p * 40.0), vec3(12.9, 78.2, 37.7))) * 43758.5);' }), nori = vinilo(0x1c2620, { rug: 0.5 });
    for (const [x, y, z, rx, rz] of [[-0.1, 0.08, 0.02, 0, 0.05], [0.1, 0.1, -0.02, 0.05, -0.08], [0.02, 0.15, 0.06, -0.12, 0.2]]) { const s = pos(cil(0.19, 0.19, 0.035, gall, 36), x, y, z); s.rotation.set(rx, 0, rz); g.add(s); }
    const n = pos(caja(0.16, 0.01, 0.16, 0.004, nori), 0.02, 0.172, 0.07); n.rotation.set(-0.12, 0.4, 0.2); g.add(n);
    return g;
  } },
  uchiwa: { cat: 'suelo', r: 0.5, crear() {
    const g = new THREE.Group(), pal = new THREE.Group(); g.add(pal);
    const cara = cil(0.36, 0.36, 0.014, new THREE.MeshStandardMaterial({ roughness: 0.8, map: texC('uchiwa', 256, 256, (c, W) => { c.fillStyle = '#f3ecde'; c.fillRect(0, 0, W, W); c.fillStyle = '#d23b2a'; c.beginPath(); c.arc(150, 110, 52, 0, TAU); c.fill(); c.strokeStyle = '#2f6fa8'; c.lineWidth = 12; for (let k = 0; k < 3; k++) { c.beginPath(); for (let x = 0; x <= W; x += 6) c.lineTo(x, 180 + k * 24 + Math.sin(x * 0.06 + k) * 8); c.stroke(); } }) }), 40);
    cara.rotation.x = Math.PI / 2; cara.position.y = 0.5; pal.add(cara);
    pal.add(pos(caja(0.05, 0.36, 0.02, 0.008, vinilo(0xc9a266, { rug: 0.5 })), 0, 0.16, 0));
    pal.rotation.set(-1.45, 0.3, 0); pal.position.y = 0.03; return g;
  } },
  ramen: { cat: 'suelo', r: 0.55, crear() {
    const g = new THREE.Group();
    g.add(torno('ramen', [[0, 0.02], [0.16, 0.02], [0.17, 0], [0.22, 0], [0.24, 0.05], [0.4, 0.26], [0.46, 0.4], [0.44, 0.41], [0.39, 0.3], [0.2, 0.1], [0, 0.09]], vinilo(0xb3261e, { rug: 0.25, cc: 1, u: { uB: new THREE.Color(0xf6efe0) }, pintura: 'col = mix(col, uB, aa(abs(p.y - 0.3) - 0.03) * step(0.3, length(p.xz)) + step(length(p.xz), 0.39) * step(0.12, p.y) * 0.0);' }), 48));
    const caldo = new THREE.Mesh(gC('circ40', () => new THREE.CircleGeometry(0.4, 40)), new THREE.MeshPhysicalMaterial({ roughness: 0.15, clearcoat: 1, map: texC('fideos', 256, 256, (c, W) => { c.fillStyle = '#c98a42'; c.fillRect(0, 0, W, W); c.strokeStyle = '#f2d27a'; c.lineWidth = 7; for (let i = 0; i < 26; i++) { c.beginPath(); for (let x = 0; x <= W; x += 8) c.lineTo(x, i * 11 + Math.sin(x * 0.08 + i) * 6); c.stroke(); } c.fillStyle = '#5a9a3a'; for (let i = 0; i < 30; i++) { c.beginPath(); c.arc((i * 71) % W, (i * 43) % W, 6, 0, TAU); c.fill(); } }) }));
    caldo.rotation.x = -Math.PI / 2; caldo.position.y = 0.36; g.add(caldo);
    const clara = vinilo(0xfbf7ee, { rug: 0.4, cc: 0.5 }), yema = vinilo(0xf2a51f, { rug: 0.3, cc: 0.8 });
    for (const [x, z, r] of [[-0.12, 0.08, 0.2], [0.02, 0.14, -0.4]]) { const h = new THREE.Group(); h.position.set(x, 0.37, z); h.rotation.set(-1.3, r, 0); const cl = esf(0.08, clara); cl.scale.z = 0.4 * 0.08 / 0.08; cl.scale.set(0.08, 0.1, 0.032); h.add(cl); const y = esf(0.045, yema); y.scale.set(0.045, 0.05, 0.02); y.position.z = 0.02; h.add(y); g.add(h); }
    const naruto = cil(0.075, 0.075, 0.02, new THREE.MeshStandardMaterial({ roughness: 0.6, map: texC('naruto', 128, 128, (c) => { c.fillStyle = '#fbf6ee'; c.fillRect(0, 0, 128, 128); c.strokeStyle = '#ec6f8e'; c.lineWidth = 9; c.beginPath(); for (let i = 0; i < 60; i++) { const a = i * 0.25, r = 4 + i * 0.85; c.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); } c.stroke(); }) }), 24);
    naruto.position.set(0.16, 0.375, -0.05); naruto.rotation.set(0.15, 0, 0.1); g.add(naruto);
    const nori = pos(caja(0.2, 0.26, 0.012, 0.004, vinilo(0x1c2620, { rug: 0.5 })), 0.02, 0.44, -0.3); nori.rotation.x = -0.25; g.add(nori);
    const palillo = vinilo(0xd8b98a, { rug: 0.6 });
    for (const dz of [-0.03, 0.04]) { const p = cil(0.012, 0.018, 1.05, palillo, 8); p.rotation.set(0, 0.4, Math.PI / 2 - 0.05); p.position.set(0.05, 0.47, dz); g.add(p); }
    return g;
  } },
  hanko: { cat: 'suelo', r: 0.35, crear() {
    const g = new THREE.Group(), rojo = vinilo(0xb3231c, { rug: 0.25, cc: 1 });
    const sello = new THREE.Group(); sello.add(pos(cil(0.07, 0.07, 0.34, rojo, 24), 0, 0.17, 0), pos(esf(0.07, rojo), 0, 0.34, 0)); sello.position.set(-0.12, 0, 0); g.add(sello);
    g.add(pos(cil(0.17, 0.17, 0.07, vinilo(0x2a1d1a, { rug: 0.3, cc: 1 }), 32), 0.14, 0.035, 0.04), pos(cil(0.14, 0.14, 0.01, vinilo(0xc8302a, { rug: 0.9, cc: 0 }), 32), 0.14, 0.074, 0.04));
    return g;
  } },
  geta: { cat: 'suelo', r: 0.55, crear() {
    const g = new THREE.Group(), madera = vinilo(0xc79a64, { rug: 0.5, cc: 0.4 }), rojo = vinilo(0xb3231c, { rug: 0.6 });
    for (const [x, r] of [[-0.2, 0.1], [0.22, -0.06]]) {
      const s = new THREE.Group(); s.position.set(x, 0, 0); s.rotation.y = r;
      s.add(pos(caja(0.3, 0.06, 0.66, 0.025, madera), 0, 0.15, 0));
      for (const z of [-0.18, 0.2]) s.add(pos(caja(0.28, 0.12, 0.06, 0.012, madera), 0, 0.06, z));
      s.add(tuboPts('hanao', [[-0.12, 0.19, -0.1], [-0.06, 0.26, 0.1], [0, 0.2, 0.22], [0.06, 0.26, 0.1], [0.12, 0.19, -0.1]], 0.02, rojo, 24));
      g.add(s);
    }
    return g;
  } },
  bonsai: { cat: 'alto', r: 0.6, crear(k, ids, sakura = false) {
    const g = new THREE.Group();
    g.add(pos(caja(0.9, 0.26, 0.55, 0.04, vinilo(sakura ? 0x2d3f73 : 0x5f6f6a, { rug: 0.3, cc: 0.8 })), 0, 0.13, 0), pos(caja(0.82, 0.02, 0.47, 0.01, vinilo(0x3a2a1c, { rug: 0.9, cc: 0 })), 0, 0.26, 0));
    const tronco = vinilo(0x6a4a30, { rug: 0.7, cc: 0.1, pintura: 'col *= 0.8 + 0.3 * fract(sin(dot(floor(p * vec3(30.0, 8.0, 30.0)), vec3(12.9, 78.2, 37.7))) * 43758.5);' });
    g.add(tuboPts('bonsai', [[0, 0.25, 0], [0.08, 0.5, 0], [-0.12, 0.75, 0.02], [0.05, 0.98, 0], [0.22, 1.08, 0]], 0.06, tronco, 24));
    const hoja = sakura ? vinilo(0xf5b5c8, { rug: 0.6, cc: 0.2, pintura: 'col = mix(col, vec3(1.0), 0.35 * step(0.7, fract(sin(dot(floor(p * 45.0), vec3(12.9, 78.2, 37.7))) * 43758.5)));' })
      : vinilo(0x3f6a2c, { rug: 0.7, cc: 0.1, pintura: 'col *= 0.75 + 0.4 * fract(sin(dot(floor(p * 38.0), vec3(12.9, 78.2, 37.7))) * 43758.5);' });
    for (const [x, y, z, s] of [[0.22, 1.12, 0, 0.3], [-0.22, 0.84, 0.05, 0.24], [0.12, 0.66, -0.05, 0.2], [-0.04, 1.2, 0.02, 0.2]]) { const f = pos(esf(1, hoja, 24), x, y, z); f.scale.set(s * 1.3, s * 0.55, s); g.add(f); }
    if (sakura) { const pet = vinilo(0xf7c2d2, { rug: 0.6 }); const r = azar(3); for (let i = 0; i < 9; i++) { const p = pos(esf(0.03, pet, 8), (r() - 0.5) * 1.4, 0.01, 0.3 + r() * 0.4); p.scale.set(0.035, 0.006, 0.025); g.add(p); } }
    return g;
  } },
  'sakura-bonsai': { cat: 'alto', r: 0.7, crear(k, ids) { return PROPS.bonsai.crear(k, ids, true); } },
  kendama: { cat: 'suelo', r: 0.45, crear() {
    const g = new THREE.Group(), mad = vinilo(0xd9b27a, { rug: 0.45, cc: 0.6 }), rojo = vinilo(0xc8231c, { rug: 0.2, cc: 1 });
    const ken = new THREE.Group(); ken.position.set(-0.05, 0.05, 0); ken.rotation.set(0, 0.5, Math.PI / 2);
    ken.add(pos(cil(0.035, 0.035, 0.5, mad, 16), 0, 0, 0), pos(new THREE.Mesh(gC('conoKen', () => new THREE.ConeGeometry(0.03, 0.12, 14)), mad), 0, 0.31, 0));
    const cruz = cil(0.05, 0.05, 0.3, mad, 18); cruz.rotation.z = Math.PI / 2; cruz.position.y = 0.16; ken.add(cruz);
    g.add(ken);
    const bola = pos(esf(0.11, rojo, 28), 0.3, 0.11, 0.15); g.add(bola);
    g.add(tuboPts('cordelKen', [[0.02, 0.06, 0.02], [0.12, 0.02, 0.2], [0.24, 0.02, 0.18], [0.3, 0.06, 0.1]], 0.006, vinilo(0xf3ecde, { cc: 0 }), 20));
    return g;
  } },
  orizuru: { cat: 'suelo', r: 0.4, crear() {
    const tri = (a, b, c) => { const q = new THREE.BufferGeometry(); q.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c], 3)); q.computeVertexNormals(); return q; };
    const geo = gC('orizuru', () => mergeGeometries([tri([-0.12, 0.1, 0], [0.12, 0.1, 0], [0, 0.2, 0.05]), tri([-0.12, 0.1, 0], [0, 0.2, -0.05], [0.12, 0.1, 0]), tri([0, 0.2, 0.02], [-0.05, 0.14, 0.4], [0.05, 0.14, 0.02]), tri([0, 0.2, -0.02], [0.05, 0.14, -0.02], [-0.05, 0.14, -0.4]), tri([-0.1, 0.1, 0], [-0.3, 0.32, 0], [-0.04, 0.12, 0]), tri([0.1, 0.1, 0], [0.04, 0.12, 0], [0.3, 0.3, 0]), tri([-0.3, 0.32, 0], [-0.36, 0.3, 0], [-0.3, 0.26, 0])]));
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xe0574c, roughness: 0.85, side: THREE.DoubleSide, flatShading: true }));
    const g = new THREE.Group(); m.scale.setScalar(1.3); g.add(m); g.rotation.y = 0.6; return g;
  } },
  andon: { cat: 'alto', r: 0.5, luz: true, crear() {
    const g = new THREE.Group(), mad = vinilo(0x3a2618, { rug: 0.4, cc: 0.7 });
    g.add(pos(caja(0.6, 0.08, 0.6, 0.02, mad), 0, 0.04, 0));
    for (const [x, z] of [[-0.26, -0.26], [0.26, -0.26], [-0.26, 0.26], [0.26, 0.26]]) g.add(pos(caja(0.05, 1.3, 0.05, 0.01, mad), x, 0.7, z));
    g.add(pos(caja(0.6, 0.05, 0.6, 0.015, mad), 0, 1.35, 0), pos(caja(0.6, 0.04, 0.6, 0.015, mad), 0, 0.42, 0));
    const papel = texC('andon', 256, 512, (c, W, H) => { c.fillStyle = '#f6ead0'; c.fillRect(0, 0, W, H); c.strokeStyle = 'rgba(70,45,25,0.7)'; c.lineWidth = 5; for (let x = 0; x <= W; x += W / 3) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); } for (let y = 0; y <= H; y += H / 5) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); } });
    g.add(pos(new THREE.Mesh(gC('cajaAndon', () => new THREE.BoxGeometry(0.5, 0.88, 0.5)), new THREE.MeshStandardMaterial({ map: papel, emissiveMap: papel, emissive: 0xffc27a, emissiveIntensity: 0.9, roughness: 0.9 })), 0, 0.88, 0));
    g.userData.luz = V3(0, 0.9, 0); return g;
  } },
  taiko: { cat: 'alto', r: 0.7, crear() {
    const g = new THREE.Group(), mad = vinilo(0x6a2a1a, { rug: 0.35, cc: 0.9 });
    const cuero = texC('taiko', 256, 256, (c, W) => { c.fillStyle = '#ead7b0'; c.fillRect(0, 0, W, W); c.translate(W / 2, W / 2); c.fillStyle = '#b3231c'; for (let i = 0; i < 3; i++) { c.save(); c.rotate((i * TAU) / 3); c.beginPath(); c.arc(0, -34, 30, 0, TAU); c.fill(); c.beginPath(); c.moveTo(-30, -34); c.quadraticCurveTo(-40, 30, 30, 50); c.quadraticCurveTo(10, 10, 30, -34); c.fill(); c.restore(); } });
    const tambor = new THREE.Group(); tambor.position.y = 0.72; tambor.rotation.set(0, 0.4, Math.PI / 2); g.add(tambor);
    tambor.add(torno('taiko', [[0.001, -0.3], [0.4, -0.3], [0.47, -0.15], [0.5, 0], [0.47, 0.15], [0.4, 0.3], [0.001, 0.3]], mad, 48));
    for (const s of [-1, 1]) { const piel = new THREE.Mesh(gC('circ41', () => new THREE.CircleGeometry(0.41, 40)), new THREE.MeshStandardMaterial({ map: cuero, roughness: 0.7 })); piel.rotation.x = s * -Math.PI / 2; piel.position.y = 0.301 * s; tambor.add(piel);
      for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; tambor.add(pos(esf(0.02, vinilo(0xd9b25a, { rug: 0.3 })), Math.cos(a) * 0.415, 0.27 * s, Math.sin(a) * 0.415)); } }
    const base = vinilo(0x2a1a12, { rug: 0.4, cc: 0.6 });
    for (const s of [-1, 1]) { const p = pos(caja(0.08, 0.7, 0.08, 0.02, base), 0.25 * s, 0.32, 0.12 * s); p.rotation.z = -0.3 * s; g.add(p); const q = pos(caja(0.08, 0.7, 0.08, 0.02, base), 0.25 * s, 0.32, -0.12 * s); q.rotation.z = -0.3 * s; g.add(q); }
    return g;
  } },
  kingyo: { cat: 'suelo', r: 0.5, crear() {
    const g = new THREE.Group();
    const vidrio = new THREE.MeshPhysicalMaterial({ color: 0xdff4ff, transparent: true, opacity: 0.25, roughness: 0.03, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false });
    const agua = new THREE.MeshPhysicalMaterial({ color: 0x7fc8e8, transparent: true, opacity: 0.35, roughness: 0.05, depthWrite: false });
    g.add(pos(esf(0.02, vinilo(0x6f6a60), 8), 0, 0.02, 0));
    for (let i = 0; i < 10; i++) { const a = i * 2.4; g.add(pos(esf(0.035 + (i % 3) * 0.01, vinilo([0x6f6a60, 0xa89f8c, 0x4f5a4a][i % 3], { rug: 0.6 }), 10), Math.cos(a) * 0.15 * (i % 2 + 0.5), 0.04, Math.sin(a) * 0.15)); }
    g.add(torno('pecera', [[0.001, 0.0], [0.18, 0.0], [0.34, 0.12], [0.4, 0.3], [0.36, 0.5], [0.26, 0.6], [0.3, 0.64]], vidrio, 48));
    g.add(torno('peceraAgua', [[0.001, 0.02], [0.17, 0.02], [0.32, 0.13], [0.37, 0.3], [0.34, 0.46], [0.001, 0.46]], agua, 48));
    const pez = vinilo(0xf26a1f, { rug: 0.3, cc: 0.8 }), peces = [0, 1].map((i) => { const p = new THREE.Group(); const c = esf(1, pez, 16); c.scale.set(0.08, 0.05, 0.04); p.add(c); const cola = new THREE.Mesh(gC('colaPez', () => { const q = new THREE.Shape(); q.moveTo(0, 0); q.lineTo(-0.1, 0.06); q.lineTo(-0.08, 0); q.lineTo(-0.1, -0.06); q.closePath(); return new THREE.ShapeGeometry(q); }), new THREE.MeshStandardMaterial({ color: 0xff8a3a, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })); cola.position.x = -0.06; p.add(cola); g.add(p); return p; });
    g.userData.anim = (t) => peces.forEach((p, i) => { const a = t * (0.6 + i * 0.25) + i * 3; p.position.set(Math.cos(a) * 0.18, 0.25 + i * 0.1 + Math.sin(t * 1.3 + i) * 0.03, Math.sin(a) * 0.14); p.rotation.y = -a - Math.PI / 2; p.children[1].rotation.y = Math.sin(t * 9 + i) * 0.5; });
    return g;
  } },
  'cuadro-fuji': { cat: 'pared', r: 0.8, crear() {
    const g = new THREE.Group();
    g.add(caja(1.5, 1.08, 0.06, 0.012, vinilo(0x1f1712, { rug: 0.3, cc: 0.9 })));
    const ilu = texC('fuji', 512, 360, (c, W, H) => {
      const cielo = c.createLinearGradient(0, 0, 0, H); cielo.addColorStop(0, '#f1dcc0'); cielo.addColorStop(1, '#f7ecd8'); c.fillStyle = cielo; c.fillRect(0, 0, W, H);
      c.fillStyle = '#d6452f'; c.beginPath(); c.arc(W * 0.78, H * 0.24, 30, 0, TAU); c.fill();
      c.fillStyle = '#3f5f8f'; c.beginPath(); c.moveTo(W * 0.18, H * 0.78); c.lineTo(W * 0.46, H * 0.3); c.lineTo(W * 0.56, H * 0.3); c.lineTo(W * 0.86, H * 0.78); c.fill();
      c.fillStyle = '#fbf6ee'; c.beginPath(); c.moveTo(W * 0.4, H * 0.4); c.lineTo(W * 0.46, H * 0.3); c.lineTo(W * 0.56, H * 0.3); c.lineTo(W * 0.62, H * 0.4); for (let i = 0; i <= 6; i++) c.lineTo(W * (0.62 - i * 0.037), H * (0.4 + (i % 2) * 0.05)); c.fill();
      c.fillStyle = '#244a7a'; c.beginPath(); c.moveTo(0, H); for (let x = 0; x <= W; x += 8) c.lineTo(x, H * 0.8 + Math.sin(x * 0.03) * 12); c.lineTo(W, H); c.fill();
      c.strokeStyle = '#f7f1e6'; c.lineWidth = 5; for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(40 + i * 110, H * 0.82, 22, Math.PI, TAU * 0.9); c.stroke(); }
      c.fillStyle = '#c0392b'; c.fillRect(W - 40, H - 44, 18, 18);
    });
    g.add(pos(new THREE.Mesh(gC('plano13', () => new THREE.PlaneGeometry(1.32, 0.9)), new THREE.MeshStandardMaterial({ map: ilu, roughness: 0.8 })), 0, 0, 0.035));
    return sombrear(g, false);
  } },
  'kakejiku-ryu': { cat: 'pared', r: 0.6, crear() {
    const g = new THREE.Group();
    const t = texKakejiku('ryu', (c, W) => {
      c.strokeStyle = '#1b1310'; c.lineCap = 'round'; c.lineJoin = 'round'; const pts = [];
      for (let i = 0; i <= 60; i++) { const u = i / 60; pts.push([W / 2 + Math.sin(u * 7.5) * 110 * (1 - u * 0.4), 300 + u * 820]); }
      c.lineWidth = 58; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
      c.strokeStyle = '#e9dfc6'; c.lineWidth = 4; for (let i = 2; i < 58; i += 2) { const [x, y] = pts[i]; c.beginPath(); c.arc(x, y, 18, 0.3, 2.8); c.stroke(); }
      c.fillStyle = '#1b1310'; c.beginPath(); c.ellipse(pts[0][0], 285, 50, 36, -0.3, 0, TAU); c.fill();
      c.strokeStyle = '#1b1310'; c.lineWidth = 6; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(pts[0][0] + s * 30, 270); c.quadraticCurveTo(pts[0][0] + s * 120, 230, pts[0][0] + s * 150, 300); c.stroke(); }
      c.fillStyle = '#c0392b'; c.beginPath(); c.arc(pts[0][0] + 15, 280, 8, 0, TAU); c.fill(); c.fillRect(W / 2 + 60, 1110, 40, 40);
    });
    g.add(new THREE.Mesh(gC('planoKake', () => new THREE.PlaneGeometry(1.0, 2.74)), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 })));
    const rod = pos(cil(0.034, 0.034, 1.18, vinilo(0x3a2618, { rug: 0.5 }), 12), 0, -1.39, 0.03); rod.rotation.z = Math.PI / 2; g.add(rod);
    return sombrear(g, false);
  } },
  'gato-suerte': { cat: 'suelo', r: 0.45, crear() {
    const g = new THREE.Group(), blanco = vinilo(0xfbf8f2, { rug: 0.2, cc: 1 });
    const ilu = texPlanar('maneki', 256, 256, (c, W) => { c.translate(W / 2, W / 2); c.scale(W / 0.5, -W / 0.5); c.strokeStyle = '#1b1310'; c.lineWidth = 0.02; c.lineCap = 'round'; for (const s of [-1, 1]) { c.beginPath(); c.arc(s * 0.08, 0.02, 0.04, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke(); } c.fillStyle = '#ef8a96'; c.beginPath(); c.arc(0, -0.04, 0.015, 0, TAU); c.fill(); c.fillStyle = 'rgba(240,120,130,0.6)'; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * 0.14, -0.05, 0.04, 0.025, 0, 0, TAU); c.fill(); } });
    const cuerpo = pos(esf(1, blanco, 28), 0, 0.3, 0); cuerpo.scale.set(0.3, 0.3, 0.26); g.add(cuerpo);
    const cab = pos(esf(1, vinPlanar(0xfbf8f2, ilu, [-0.25, 0.6, 0.5, 0.5], { rug: 0.2, cc: 1 }), 28), 0, 0.72, 0.02); cab.scale.set(0.27, 0.24, 0.24); g.add(cab);
    for (const s of [-1, 1]) { const o = pos(new THREE.Mesh(gC('conoMan', () => new THREE.ConeGeometry(0.09, 0.14, 16)), blanco), 0.15 * s, 0.93, 0); o.rotation.z = -0.3 * s; g.add(o); }
    const pata = pos(new THREE.Mesh(gC('pataMan', () => new THREE.CapsuleGeometry(0.07, 0.2, 6, 14)), blanco), 0.27, 0.62, 0.05); pata.rotation.z = 0.3; g.add(pata);
    g.add(pos(new THREE.Mesh(gC('collar', () => new THREE.TorusGeometry(0.2, 0.03, 10, 32)), vinilo(0xc8231c, { rug: 0.3 })), 0, 0.53, 0.02));
    g.children[g.children.length - 1].rotation.x = Math.PI / 2 - 0.2;
    g.add(pos(esf(0.05, oro(), 16), 0, 0.49, 0.22));
    const koban = pos(esf(1, oro(), 20), -0.1, 0.3, 0.25); koban.scale.set(0.1, 0.14, 0.025); g.add(koban);
    g.rotation.y = -0.3; return g;
  } },
  byobu: { cat: 'alto', r: 1.3, crear() {
    const g = new THREE.Group(), marco = vinilo(0x1f1310, { rug: 0.3, cc: 0.9 });
    const panel = texC('byobu', 512, 512, (c, W, H) => { const gr = c.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#e8c56a'); gr.addColorStop(1, '#c99a3e'); c.fillStyle = gr; c.fillRect(0, 0, W, H);
      c.strokeStyle = 'rgba(150,110,40,0.35)'; c.lineWidth = 2; for (let i = 0; i < W; i += 64) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, H); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(W, i); c.stroke(); }
      c.fillStyle = 'rgba(255,245,220,0.55)'; for (const [x, y] of [[120, 120], [360, 90], [260, 300]]) { c.beginPath(); c.ellipse(x, y, 110, 26, 0, 0, TAU); c.fill(); }
      c.fillStyle = '#fbf8f0'; c.strokeStyle = '#1b1310'; c.lineWidth = 3; for (const [x, y, s] of [[180, 220, 1], [340, 360, -1]]) { c.beginPath(); c.ellipse(x, y, 36, 14, 0.2 * s, 0, TAU); c.fill(); c.beginPath(); c.moveTo(x - 30, y); c.quadraticCurveTo(x - 60 * s, y - 60, x - 90 * s, y - 30); c.lineTo(x - 10, y - 5); c.fill(); c.stroke(); c.fillStyle = '#d23b2a'; c.beginPath(); c.arc(x + 42 * s, y - 16, 6, 0, TAU); c.fill(); c.fillStyle = '#fbf8f0'; } });
    const papel = new THREE.MeshStandardMaterial({ map: panel, roughness: 0.45, metalness: 0.35 });
    for (let i = 0; i < 4; i++) { const p = new THREE.Group(); const a = i % 2 ? -0.35 : 0.35; p.position.set(-1.05 + i * 0.68, 0, (i % 2) * 0.23); p.rotation.y = a; p.add(pos(new THREE.Mesh(gC('panelByobu', () => new THREE.BoxGeometry(0.72, 1.9, 0.03)), papel), 0, 1.0, 0), pos(caja(0.74, 0.05, 0.05, 0.01, marco), 0, 1.97, 0), pos(caja(0.74, 0.05, 0.05, 0.01, marco), 0, 0.05, 0)); g.add(p); }
    return g;
  } },
  kimono: { cat: 'alto', r: 1.0, crear() {
    const g = new THREE.Group(), laca = vinilo(0x1f1310, { rug: 0.3, cc: 0.9 });
    for (const s of [-1, 1]) g.add(pos(caja(0.08, 1.9, 0.08, 0.015, laca), s * 0.9, 0.95, 0), pos(caja(0.3, 0.06, 0.3, 0.015, laca), s * 0.9, 0.03, 0));
    g.add(pos(caja(2.1, 0.07, 0.07, 0.015, laca), 0, 1.86, 0));
    const tex = texC('seigaiha', 512, 512, (c, W) => { c.fillStyle = '#26396a'; c.fillRect(0, 0, W, W); const r = 40; for (let y = -1; y < 15; y++) for (let x = -1; x < 15; x++) { const cx = x * r * 2 + (y % 2 ? r : 0), cy = y * r; for (let k = 4; k > 0; k--) { c.beginPath(); c.arc(cx, cy, (k / 4) * r * 1.02, Math.PI, TAU); c.fillStyle = k % 2 ? '#26396a' : '#e9dfc6'; c.fill(); } } });
    const s = new THREE.Shape(); s.moveTo(-0.95, 0); s.lineTo(0.95, 0); s.lineTo(0.95, -0.55); s.lineTo(0.42, -0.55); s.lineTo(0.42, -1.6); s.lineTo(-0.42, -1.6); s.lineTo(-0.42, -0.55); s.lineTo(-0.95, -0.55); s.closePath();
    const bata = new THREE.Mesh(gC('kimono', () => { const q = new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2 }); const uv = q.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.5 + 0.5, uv.getY(i) * 0.5 + 0.9); return q; }), tela(0xffffff, { map: tex, roughness: 0.6 }));
    bata.position.y = 1.82; g.add(bata);
    g.add(pos(caja(0.9, 0.2, 0.08, 0.02, vinilo(0xc8302a, { rug: 0.6 })), 0, 1.02, 0.03));
    return g;
  } },
  'tele-crt': { cat: 'alto', r: 0.6, crear() {
    const g = new THREE.Group();
    g.add(pos(caja(1.0, 0.8, 0.78, 0.08, vinilo(0xd8cfbd, { rug: 0.4, cc: 0.6 })), 0, 0.4, 0));
    const pantalla = texC('crt', 256, 200, (c, W, H) => { const gr = c.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, W * 0.7); gr.addColorStop(0, '#7fd6e8'); gr.addColorStop(1, '#1e4f6a'); c.fillStyle = gr; c.fillRect(0, 0, W, H); c.fillStyle = '#fbf6ee'; c.beginPath(); c.arc(W / 2, H * 0.55, 34, 0, TAU); c.fill(); c.beginPath(); c.moveTo(W / 2 - 30, H * 0.4); c.lineTo(W / 2 - 22, H * 0.2); c.lineTo(W / 2 - 8, H * 0.38); c.fill(); c.beginPath(); c.moveTo(W / 2 + 30, H * 0.4); c.lineTo(W / 2 + 22, H * 0.2); c.lineTo(W / 2 + 8, H * 0.38); c.fill(); for (let y = 0; y < H; y += 3) { c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(0, y, W, 1); } });
    g.add(pos(new THREE.Mesh(gC('planoTV', () => new THREE.PlaneGeometry(0.66, 0.52)), new THREE.MeshStandardMaterial({ map: pantalla, emissiveMap: pantalla, emissive: 0xffffff, emissiveIntensity: 0.8, roughness: 0.2 })), -0.1, 0.42, 0.395));
    for (const y of [0.55, 0.35]) g.add(pos(cil(0.04, 0.04, 0.04, vinilo(0x3a3430), 16), 0.36, y, 0.4).rotateX(Math.PI / 2));
    for (const s of [-1, 1]) { const a = pos(cil(0.008, 0.008, 0.7, vinilo(0xc9c2b5, { rug: 0.2, metalness: 0.6 }), 6), s * 0.18, 1.05, -0.1); a.rotation.z = -0.5 * s; g.add(a); }
    g.rotation.y = -0.25; return g;
  } },
  radicasete: { cat: 'suelo', r: 0.6, crear() {
    const g = new THREE.Group();
    g.add(pos(caja(1.1, 0.55, 0.3, 0.05, vinilo(0xc8302a, { rug: 0.3, cc: 0.8 })), 0, 0.275, 0));
    const rejilla = vinilo(0x2a2622, { rug: 0.5, pintura: 'col *= 0.6 + 0.4 * step(0.5, fract(p.x * 90.0)) * step(0.5, fract(p.y * 90.0));' });
    for (const s of [-1, 1]) g.add(pos(cil(0.17, 0.17, 0.04, rejilla, 32), s * 0.33, 0.27, 0.15).rotateX(Math.PI / 2));
    g.add(pos(caja(0.3, 0.18, 0.04, 0.02, new THREE.MeshPhysicalMaterial({ color: 0x1a1a22, roughness: 0.05, clearcoat: 1 })), 0, 0.3, 0.15));
    g.add(tuboPts('asaRadio', [[-0.4, 0.55, 0], [-0.3, 0.7, 0], [0.3, 0.7, 0], [0.4, 0.55, 0]], 0.025, vinilo(0xd9d4cc, { rug: 0.2, metalness: 0.5 }), 20));
    g.rotation.y = 0.3; return g;
  } },
  'kitsune-estatua': { cat: 'alto', r: 0.6, crear() {
    const g = new THREE.Group(), piedra = vinilo(0xb5b0a6, { rug: 0.85, cc: 0, pintura: 'col *= 0.85 + 0.25 * fract(sin(dot(floor(p * 50.0), vec3(12.9, 78.2, 37.7))) * 43758.5);' });
    g.add(pos(caja(0.8, 0.3, 0.6, 0.03, piedra), 0, 0.15, 0));
    const cuerpo = pos(esf(1, piedra, 24), 0, 0.62, 0); cuerpo.scale.set(0.22, 0.34, 0.2); g.add(cuerpo);
    const cab = pos(esf(1, piedra, 24), 0, 1.02, 0.05); cab.scale.set(0.16, 0.15, 0.17); g.add(cab);
    const hocico = pos(new THREE.Mesh(gC('hocico', () => new THREE.ConeGeometry(0.08, 0.2, 16)), piedra), 0, 0.99, 0.24); hocico.rotation.x = Math.PI / 2; g.add(hocico);
    for (const s of [-1, 1]) { const o = pos(new THREE.Mesh(gC('orejaKit', () => new THREE.ConeGeometry(0.06, 0.2, 12)), piedra), 0.09 * s, 1.18, 0.02); o.rotation.z = -0.25 * s; g.add(o); }
    g.add(tuboPts('colaKit', [[0.1, 0.4, -0.15], [0.3, 0.55, -0.25], [0.32, 0.9, -0.2], [0.2, 1.1, -0.15]], 0.07, piedra, 24));
    const babero = new THREE.Mesh(gC('babero', () => { const q = new THREE.Shape(); q.moveTo(-0.17, 0); q.lineTo(0.17, 0); q.lineTo(0, -0.22); q.closePath(); return extrudir(q, 0.01, 0.01); }), tela(0xc8302a)); babero.position.set(0, 0.86, 0.17); babero.rotation.x = 0.25; g.add(babero);
    return g;
  } },
  katanakake: { cat: 'alto', r: 0.7, crear() {
    const g = new THREE.Group(), laca = vinilo(0x1f1310, { rug: 0.3, cc: 0.9 });
    g.add(pos(caja(1.2, 0.08, 0.36, 0.02, laca), 0, 0.04, 0));
    for (const s of [-1, 1]) { g.add(pos(caja(0.08, 0.7, 0.14, 0.02, laca), s * 0.42, 0.4, 0)); for (const y of [0.45, 0.68]) g.add(pos(caja(0.1, 0.05, 0.2, 0.015, laca), s * 0.42, y, 0.08)); }
    for (const y of [0.49, 0.72]) { const k = crearKatana(); k.rotation.z = -Math.PI / 2; k.position.set(-0.05, y, 0.1); k.scale.setScalar(0.95); g.add(k); }
    return g;
  } },
  kotatsu: { cat: 'suelo', r: 0.8, crear() {
    const g = new THREE.Group();
    const manta = texC('kotatsu', 256, 256, (c, W) => { c.fillStyle = '#b8452e'; c.fillRect(0, 0, W, W); c.fillStyle = 'rgba(246,220,180,0.55)'; for (let i = 16; i < W; i += 64) { c.fillRect(i, 0, 10, W); c.fillRect(0, i, W, 10); } c.fillStyle = 'rgba(60,20,10,0.25)'; for (let i = 44; i < W; i += 64) { c.fillRect(i, 0, 4, W); c.fillRect(0, i, W, 4); } });
    const futon = gC('futonKotatsu', () => { const q = new RoundedBoxGeometry(1.3, 0.36, 1.3, 6, 0.14); q.translate(0, 0.18, 0); const p = q.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); p.setY(i, y + 0.05 * Math.max(0, 1 - (x * x + z * z) / 0.9) * c01(y / 0.36)); }
      q.computeVertexNormals(); return q; });
    g.add(new THREE.Mesh(futon, tela(0xffffff, { map: manta, roughness: 0.85 })));
    g.add(pos(caja(1.08, 0.06, 1.08, 0.02, vinilo(0xa0703f, { rug: 0.35, cc: 0.8, ccr: 0.2 })), 0, 0.45, 0));
    g.add(pos(torno('cuencoKotatsu', [[0, 0], [0.12, 0], [0.18, 0.05], [0.2, 0.09], [0.18, 0.095], [0, 0.06]], vinilo(0x2d3f73, { rug: 0.2, cc: 1 }), 32), 0.18, 0.48, 0.1));
    const piel = vinilo(0xf08a1c, { rug: 0.5, cc: 0.4 });
    for (const [x, y, z] of [[0.12, 0.58, 0.07], [0.25, 0.58, 0.13], [0.18, 0.66, 0.1]]) { const m = pos(esf(0.075, piel, 20), x, y, z); m.scale.y *= 0.86; g.add(m); }
    g.rotation.y = 0.25; return g;
  } },
  'sushi-geta': { cat: 'suelo', r: 0.55, crear() {
    const g = new THREE.Group(), madera = vinilo(0xd2a56a, { rug: 0.5, cc: 0.4 });
    g.add(pos(caja(0.95, 0.05, 0.44, 0.015, madera), 0, 0.105, 0));
    for (const x of [-0.34, 0.34]) g.add(pos(caja(0.07, 0.08, 0.42, 0.012, madera), x, 0.04, 0));
    const arroz = vinilo(0xfbf7ee, { rug: 0.62, cc: 0.12, pintura: 'col *= 0.9 + 0.1 * fract(sin(dot(floor(p * 70.0), vec3(12.9, 78.2, 37.7))) * 43758.5);' });
    const salmon = vinilo(0xf07a4a, { rug: 0.3, cc: 0.9, pintura: 'col = mix(col, vec3(1.0, 0.86, 0.74), 0.55 * aa(abs(fract(p.x * 14.0 + p.z * 6.0) - 0.5) - 0.38));' });
    const atun = vinilo(0xc8283a, { rug: 0.3, cc: 0.9 }), tamago = vinilo(0xf5c542, { rug: 0.45, cc: 0.5 }), nori = vinilo(0x1c2620, { rug: 0.5 });
    [salmon, atun, tamago].forEach((m, i) => {
      const n = new THREE.Group(); n.position.set(-0.26 + i * 0.27, 0.13, 0.02); n.rotation.y = (i - 1) * 0.12;
      n.add(pos(caja(0.13, 0.08, 0.2, 0.035, arroz), 0, 0.04, 0), pos(caja(0.15, 0.035, 0.23, 0.015, m), 0, 0.095, 0));
      if (m === tamago) n.add(pos(caja(0.155, 0.13, 0.04, 0.01, nori), 0, 0.06, 0));
      g.add(n);
    });
    g.add(pos(esf(0.05, vinilo(0x8fbf3a, { rug: 0.6 }), 16), 0.4, 0.15, -0.12));
    const gari = vinilo(0xf4a7b4, { rug: 0.4, cc: 0.6 });
    for (let i = 0; i < 3; i++) { const e = pos(esf(1, gari, 14), 0.4 + i * 0.02, 0.14 + i * 0.015, 0.08 - i * 0.03); e.scale.set(0.06, 0.015, 0.045); e.rotation.z = 0.3 * i; g.add(e); }
    g.rotation.y = -0.35; return g;
  } },
  consola: { cat: 'cerca', r: 0.35, crear() {
    const g = new THREE.Group(), carcasa = vinilo(0x8fc7e0, { rug: 0.3, cc: 0.8 }), negro = vinilo(0x2b2330, { rug: 0.4, cc: 0.6 });
    g.add(pos(caja(0.52, 0.05, 0.34, 0.03, carcasa), 0, 0.025, 0));
    g.add(pos(caja(0.1, 0.02, 0.032, 0.006, negro), -0.15, 0.055, 0.03), pos(caja(0.032, 0.02, 0.1, 0.006, negro), -0.15, 0.055, 0.03));
    for (const [x, z, col] of [[0.13, 0.05, 0xe8483a], [0.19, 0.0, 0xf5c542]]) g.add(pos(cil(0.022, 0.022, 0.02, vinilo(col, { rug: 0.2, cc: 1 }), 16), x, 0.055, z));
    // tapa abierta, con la pantalla (un gato en píxeles) mirando hacia delante
    const pix = texC('consola', 64, 48, (c, W, H) => {
      c.fillStyle = '#a7d77a'; c.fillRect(0, 0, W, H); c.fillStyle = '#5f9a44'; c.fillRect(0, H - 8, W, 8);
      const px = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x * 4, y * 4, w * 4, h * 4); };
      px(5, 3, 2, 2, '#e58936'); px(9, 3, 2, 2, '#3a2a23'); px(5, 5, 6, 4, '#f4eee5'); px(6, 6, 1, 1, '#1b1310'); px(9, 6, 1, 1, '#1b1310'); px(7, 8, 2, 1, '#ef9aa0');
    });
    pix.magFilter = THREE.NearestFilter; pix.minFilter = THREE.NearestFilter; pix.generateMipmaps = false;
    const tapa = new THREE.Group(); tapa.position.set(0, 0.05, -0.17); tapa.rotation.x = -1.9; g.add(tapa);
    tapa.add(pos(caja(0.52, 0.04, 0.34, 0.03, carcasa), 0, 0.02, 0.17));
    const pantalla = new THREE.Mesh(gC('pantallaConsola', () => new THREE.PlaneGeometry(0.34, 0.24)), new THREE.MeshStandardMaterial({ map: pix, emissiveMap: pix, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.3 }));
    pantalla.rotation.x = Math.PI / 2; pantalla.position.set(0, -0.002, 0.17); tapa.add(pantalla);
    g.rotation.y = 0.5; return g;
  } },
  tocadiscos: { cat: 'alto', r: 0.6, crear() {
    const g = new THREE.Group(), laton = vinilo(0xd9c08a, { rug: 0.25, cc: 0.6, metalness: 0.5 });
    g.add(pos(caja(1.0, 0.5, 0.66, 0.03, vinilo(0x5a3a24, { rug: 0.4, cc: 0.7 })), 0, 0.25, 0));
    for (const x of [-0.24, 0.24]) g.add(pos(esf(0.025, laton, 12), x, 0.3, 0.335));
    g.add(pos(caja(0.86, 0.12, 0.6, 0.03, vinilo(0xc79a64, { rug: 0.35, cc: 0.9 })), 0, 0.56, 0));
    g.add(pos(cil(0.26, 0.26, 0.02, vinilo(0x9a9a9a, { rug: 0.3, metalness: 0.6 }), 40), -0.1, 0.63, 0));
    const disco = new THREE.Group(); disco.position.set(-0.1, 0.645, 0); g.add(disco);
    disco.add(cil(0.25, 0.25, 0.01, vinilo(0x151212, { rug: 0.25, cc: 1, pintura: 'col += 0.05 * step(0.5, fract(length(p.xz) * 60.0));' }), 48));
    disco.add(pos(cil(0.08, 0.08, 0.012, vinilo(0xc8302a, { rug: 0.5 }), 32), 0, 0.001, 0), pos(cil(0.008, 0.008, 0.04, laton, 8), 0, 0.02, 0));
    g.add(pos(cil(0.03, 0.035, 0.05, laton, 16), 0.28, 0.645, -0.18));
    g.add(tuboPts('brazoTocadiscos', [[0.28, 0.68, -0.18], [0.22, 0.685, -0.02], [0.08, 0.668, 0.09]], 0.008, laton, 12));
    g.add(pos(caja(0.03, 0.02, 0.05, 0.006, vinilo(0x201312, { rug: 0.3, cc: 0.8 })), 0.07, 0.662, 0.1));
    g.userData.anim = (t) => { disco.rotation.y = -t * 3.5; };
    g.rotation.y = -0.2; return g;
  } },
  zabuton: { cat: 'suelo', r: 0.6, crear() {
    const g = new THREE.Group();
    const t = texC('zabuton2', 256, 256, (c, W) => { c.fillStyle = '#b8452e'; c.fillRect(0, 0, W, W); for (let x = 0; x < W; x += 32) { c.fillStyle = 'rgba(80,20,10,0.35)'; c.fillRect(x, 0, 12, W); c.fillStyle = 'rgba(246,220,180,0.5)'; c.fillRect(x + 20, 0, 3, W); } });
    const geo = gC('zabutonChico', () => { const q = new RoundedBoxGeometry(1.0, 0.14, 0.96, 6, 0.06); q.translate(0, 0.07, 0); const p = q.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); p.setY(i, y + 0.07 * Math.pow(Math.max(0, (1 - (x / 0.5) ** 2) * (1 - (z / 0.48) ** 2)), 0.7) * c01((y - 0.02) / 0.14)); }
      q.computeVertexNormals(); return q; });
    g.add(new THREE.Mesh(geo, tela(0xffffff, { map: t, roughness: 0.8 })));
    const borla = tela(0xd4a336, { roughness: 0.7 });
    for (const [x, z] of [[-0.47, -0.45], [0.47, -0.45], [-0.47, 0.45], [0.47, 0.45]]) {
      const b = new THREE.Group(); b.add(esf(0.03, borla, 10)); b.add(pos(new THREE.Mesh(gC('flecoChico', () => new THREE.ConeGeometry(0.035, 0.1, 10, 1, true)), borla), 0, -0.045, 0));
      b.position.set(x, 0.08, z); b.rotation.set(z > 0 ? 0.7 : -0.7, 0, x > 0 ? -0.5 : 0.5); g.add(b);
    }
    g.rotation.y = 0.4; return g;
  } },
};
// orden por defecto (el diorama que se ve antes de decorar)
const DECO_DEFECTO = ['chochin', 'furin', 'daruma', 'kyusu', 'yunomi', 'dango', 'cuaderno', 'fude'];
// ─── auras de colección (29-09) ───
// Salen en los 福袋 y se ponen en el inventario, una a la vez y aparte del aura del equipo de samurái. Van colgadas de la
// figura (le siguen a todas partes) y son baratas: unas decenas de puntos, pétalos o estrellas que se mueven en la CPU.
// Medidas de diseño (la figura las escala).
const AURAS_C = ['aura-hotaru', 'aura-yuki', 'aura-sakura', 'aura-hoshi'];
// la luciérnaga: el punto de luz con un anillo oscuro (sobre la sala clara, un brillo aditivo no se veía) y su halo
const texLuciernaga = () => texC('luciernaga', 128, 128, (c) => { const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.28, 'rgba(255,255,255,1)'); g.addColorStop(0.36, 'rgba(70,86,10,0.95)'); g.addColorStop(0.44, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 128); });
// el copo, con un borde azulado para que se vea también contra la pared clara
const texCopo = () => texC('copoNieve', 64, 64, (c) => { const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,1)'); g.addColorStop(0.64, 'rgba(128,156,200,0.95)'); g.addColorStop(0.8, 'rgba(128,156,200,0.3)'); g.addColorStop(1, 'rgba(128,156,200,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); });
const texPetalo = () => texC('petaloSakura', 128, 128, (c) => {
  c.translate(64, 64); c.beginPath(); c.moveTo(0, 54); c.bezierCurveTo(-48, 18, -40, -42, -11, -52); c.lineTo(0, -38); c.lineTo(11, -52); c.bezierCurveTo(40, -42, 48, 18, 0, 54); c.closePath();
  const g = c.createLinearGradient(0, -52, 0, 54); g.addColorStop(0, '#fff0f3'); g.addColorStop(1, '#f39db4'); c.fillStyle = g; c.fill(); c.lineWidth = 6; c.strokeStyle = '#c9607e'; c.stroke();
});
// estrella blanca con línea de tinta: el color lo pone el material (pastel que va cambiando)
const texEstrella = () => texC('estrellaAura', 128, 128, (c) => {
  c.translate(64, 67); c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 23 : 52, a = -Math.PI / 2 + (i * Math.PI) / 5; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath();
  c.lineJoin = 'round'; c.lineWidth = 11; c.strokeStyle = '#2a211a'; c.stroke(); c.fillStyle = '#fff'; c.fill();
});
function crearAuraC(tipo) {
  const g = new THREE.Group(), r = azar(tipo.length * 13 + 5), A = { tipo, g, p: [] };
  if (tipo === 'aura-hotaru' || tipo === 'aura-yuki') {
    const hot = tipo === 'aura-hotaru', n = hot ? 14 : 46, geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    // opacos (recorte alfa) y escribiendo profundidad: la sala desenfoca según la profundidad, y un punto transparente
    // cogía la de la pared del fondo y se emborronaba hasta desaparecer
    A.malla = new THREE.Points(geo, new THREE.PointsMaterial({ map: hot ? texLuciernaga() : texCopo(), size: hot ? 1.25 : 0.6, vertexColors: true, alphaTest: 0.4, toneMapped: false }));
    A.malla.frustumCulled = false; g.add(A.malla);
    for (let i = 0; i < n; i++) A.p.push({ a: r() * TAU, rad: hot ? 0.9 + r() * 0.7 : 0.35 + r() * 1.4, y: hot ? 0.3 + r() * 2.3 : r() * 3.2, v: hot ? 0.4 + r() * 0.5 : 0.22 + r() * 0.2, f: r() * TAU });
  } else if (tipo === 'aura-sakura') {
    const n = 24, geo = new THREE.PlaneGeometry(0.24, 0.24);
    A.malla = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ map: texPetalo(), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, toneMapped: false }), n);
    A.malla.frustumCulled = false; g.add(A.malla);
    for (let i = 0; i < n; i++) A.p.push({ a: r() * TAU, rad: 0.5 + r() * 1.1, y: r() * 3.2, v: 0.16 + r() * 0.14, f: r() * TAU, giro: (r() < 0.5 ? -1 : 1) * (0.3 + r() * 0.4) });
  } else {
    for (let i = 0; i < 16; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texEstrella(), transparent: true, alphaTest: 0.2, toneMapped: false }));
      g.add(sp); A.p.push({ s: sp, a: (i / 16) * TAU + r() * 0.3, rad: 1.05 + (i % 3) * 0.22 + r() * 0.1, y: 0.35 + ((i * 7) % 16) / 16 * 2.2, f: r() * TAU, h: i / 16, dir: i % 2 ? 1 : -1 });
    }
  }
  return A;
}
const _col = new THREE.Color(), _m4c = new THREE.Matrix4(), _qc = new THREE.Quaternion(), _ec = new THREE.Euler(), _pc = V3(), _sc = V3(1, 1, 1);
function animarAuraC(A, t, dt, rk) {
  if (A.tipo === 'aura-hotaru' || A.tipo === 'aura-yuki') {
    const pa = A.malla.geometry.attributes.position, ca = A.malla.geometry.attributes.color, hot = A.tipo === 'aura-hotaru';
    A.p.forEach((q, i) => {
      if (hot) {
        // vagan despacio alrededor de él y se encienden y apagan cada una a su ritmo
        const a = q.a + t * 0.25 * q.v;
        pa.setXYZ(i, (Math.cos(a) * q.rad + Math.sin(t * 0.7 + q.f) * 0.25) * rk, q.y + Math.sin(t * 0.9 * q.v + q.f) * 0.3, (Math.sin(a) * q.rad * 0.8 + Math.cos(t * 0.6 + q.f) * 0.2) * rk);
        // encendida, amarillo verdoso; apagada, el cuerpito oliva
        const b = Math.pow(Math.max(0, Math.sin(t * 1.6 * q.v + q.f)), 2);
        ca.setXYZ(i, 0.42 + 0.5 * b, 0.5 + 0.5 * b, 0.14 + 0.24 * b);
      } else {
        // nieve: cae despacito haciendo eses; al llegar al suelo vuelve arriba en otro sitio
        q.y -= q.v * dt; if (q.y < 0) { q.y = 3.1 + Math.random() * 0.3; q.a = Math.random() * TAU; q.rad = 0.35 + Math.random() * 1.4; }
        const x = Math.cos(q.a) * q.rad + Math.sin(t * 0.8 + q.f) * 0.12, z = Math.sin(q.a) * q.rad * 0.8;
        pa.setXYZ(i, x * rk, q.y, z * rk);
        ca.setXYZ(i, 1, 1, 1);
      }
    });
    pa.needsUpdate = ca.needsUpdate = true;
  } else if (A.tipo === 'aura-sakura') {
    A.p.forEach((q, i) => {
      // los pétalos bajan girando alrededor de él y dando vueltas sobre sí mismos
      q.y -= q.v * dt; q.a += q.giro * dt; if (q.y < 0) { q.y = 3.2; q.rad = 0.5 + Math.random() * 1.1; }
      _pc.set((Math.cos(q.a) * q.rad + Math.sin(t * 1.1 + q.f) * 0.1) * rk, q.y, Math.sin(q.a) * q.rad * 0.8 * rk);
      _ec.set(Math.sin(t * 2.1 + q.f) * 1.3, t * 1.4 + q.f, Math.cos(t * 1.7 + q.f) * 0.9); _qc.setFromEuler(_ec);
      const s = Math.min(1, q.y * 4); _sc.set(s, s, s);
      A.malla.setMatrixAt(i, _m4c.compose(_pc, _qc, _sc));
    });
    A.malla.instanceMatrix.needsUpdate = true;
  } else {
    A.p.forEach((q) => {
      // estrellitas pastel que giran a su alrededor, parpadean y van cambiando de color
      const a = q.a + t * 0.5 * q.dir, s = Math.sin(a);
      q.s.position.set(Math.cos(a) * q.rad * rk, q.y - s * 0.35 + Math.sin(t * 1.2 + q.f) * 0.1, s * q.rad * 0.8 * rk + 0.1);
      q.s.scale.setScalar(0.17 + 0.09 * Math.pow(Math.max(0, Math.sin(t * 2.6 + q.f)), 2));
      q.s.material.color.copy(_col.setHSL((q.h + t * 0.05) % 1, 0.95, 0.72));
    });
  }
}
function soltarAuraC(A) { A.g.traverse((o) => { o.geometry?.dispose(); if (o.material) o.material.dispose(); }); }
// ─── el pupitre del estudio (29-09) ───
// Un fuzukue bajo de madera clara delante del Mochi pequeño, con su libreta abierta, el tintero y el pincel. La libreta
// es un lienzo de verdad: Nyan escribe en ella, letra a letra y en columnas de 原稿用紙, lo que aprende contigo (y
// garabatea cuando se aburre). Medidas en metros de la escena; z hacia donde mira Mochi. La hoja está al derecho
// para ÉL (la primera columna, junto a su pata derecha): con la del pincel cruzando el cuerpo se quedaba enganchado.
const ABAJO = V3(0, -1, 0);
const PUPI = { z: 0.82, alto: 0.76, ancho: 2.1, fondo: 0.84, libreta: [-0.28, 0, -0.2], LW: 0.8, LH: 0.46, cols: 8, filas: 5, fude: 0.2 };
// dónde cae (en píxeles del lienzo de 512×320) la celda de la columna c (0 = la de más a la derecha) y la fila f
const celdaHoja = (c, f) => [(c < 4 ? 512 : 256) - 36 - (c % 4) * 56, 44 + f * 50];
function pintarHojaVacia(x, W, H) {
  x.fillStyle = '#fbf6e9'; x.fillRect(0, 0, W, H);
  const pl = x.createLinearGradient(W / 2 - 18, 0, W / 2 + 18, 0); pl.addColorStop(0, 'rgba(120,90,60,0)'); pl.addColorStop(0.5, 'rgba(120,90,60,0.22)'); pl.addColorStop(1, 'rgba(120,90,60,0)');
  x.fillStyle = pl; x.fillRect(W / 2 - 18, 0, 36, H);
  x.strokeStyle = 'rgba(214,112,92,0.55)'; x.lineWidth = 2;
  for (let c = 0; c < PUPI.cols; c++) { const [cx] = celdaHoja(c, 0); x.strokeRect(cx - 24, 19, 48, 50 * PUPI.filas); for (let f = 1; f < PUPI.filas; f++) { x.beginPath(); x.moveTo(cx - 24, 19 + f * 50); x.lineTo(cx + 24, 19 + f * 50); x.stroke(); } }
}
function crearPupitre() {
  const g = new THREE.Group(), { alto: A, ancho: W, fondo: D } = PUPI;
  const madera = vinilo(0xdcae80, { rug: 0.5, cc: 0.35, u: { uVeta: new THREE.Color(0xc08d5e) }, pintura: 'col = mix(col, uVeta, 0.4 * smoothstep(0.55, 1.0, sin(p.x * 34.0 + sin(p.z * 7.0) * 2.5)));' });
  const oscura = vinilo(0x4a3328, { rug: 0.4, cc: 0.6 });
  g.add(pos(caja(W, 0.06, D, 0.022, madera), 0, A - 0.03, 0));
  for (const s of [-1, 1]) g.add(pos(caja(0.07, A - 0.08, D * 0.7, 0.02, madera), s * (W / 2 - 0.14), (A - 0.06) / 2, 0), pos(caja(0.1, 0.05, D * 0.9, 0.02, oscura), s * (W / 2 - 0.14), 0.025, 0));
  g.add(pos(caja(W - 0.3, 0.2, 0.04, 0.015, madera), 0, A - 0.15, D / 2 - 0.08));   // el faldón de delante
  // la libreta: tapas añil y la hoja doble, que es el lienzo en el que escribe
  const [lx, , lz] = PUPI.libreta, lib = new THREE.Group(); lib.position.set(lx, A, lz); g.add(lib);
  lib.add(pos(caja(PUPI.LW + 0.04, 0.02, PUPI.LH + 0.04, 0.008, vinilo(0x3a4a7a, { rug: 0.6, cc: 0.2 })), 0, 0.01, 0));
  const c = document.createElement('canvas'); c.width = 512; c.height = 320; const x = c.getContext('2d'); pintarHojaVacia(x, 512, 320);
  const tex = texDe(c); const hoja = new THREE.Mesh(new THREE.PlaneGeometry(PUPI.LW, PUPI.LH), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92 }));
  hoja.rotation.set(-Math.PI / 2, 0, Math.PI); hoja.position.y = 0.022; hoja.receiveShadow = true; lib.add(hoja);
  // el tintero (suzuri) y el pincel, que descansa en él cuando no escribe
  const suzuri = pos(caja(0.2, 0.035, 0.3, 0.014, vinilo(0x2b2624, { rug: 0.3, cc: 1 })), lx + PUPI.LW / 2 + 0.2, A + 0.018, lz - 0.02); g.add(suzuri);
  const fudeMesa = crearFude(); fudeMesa.position.set(lx + PUPI.LW / 2 + 0.2, A + 0.06, lz - 0.02); fudeMesa.rotation.set(Math.PI / 2 - 0.08, 0, 0.2); g.add(fudeMesa);
  sombrear(g); hoja.castShadow = false;
  return { g, lib, hoja: { c, x, tex, col: 0 }, fudeMesa };
}
// el pincel: el mango de bambú por encima de la mano y la punta negra hacia abajo (la punta en y = -PUPI.fude, en unidades de diseño)
function crearFude() {
  const g = new THREE.Group(), bambu = vinilo(0xd9b77a, { rug: 0.45, cc: 0.5 });
  g.add(pos(cil(0.022, 0.024, 0.36, bambu, 12), 0, 0.05, 0));
  const punta = new THREE.Mesh(gC('puntaFudeMano', () => new THREE.LatheGeometry(perfilV2([[0.0, -0.12], [0.03, -0.07], [0.026, -0.02], [0.024, 0]]), 12)), vinilo(0x151212, { rug: 0.7, cc: 0 }));
  punta.position.y = -0.13; g.add(punta);
  return g;
}
// rareza del catálogo (contenido/juego/catalogo.json): 3 legendario, 2 épico, 1 raro; lo que falta, común
const RAREZA = { 'sakura-bonsai': 3, 'kitsune-estatua': 3, 'kakejiku-ryu': 3, taiko: 3, kingyo: 2, 'tele-crt': 2, andon: 2, byobu: 2, katanakake: 2, tocadiscos: 2, 'cuadro-fuji': 2, kimono: 2,
  bonsai: 1, daruma: 1, 'gato-suerte': 1, kotatsu: 1, 'sushi-geta': 1, kyusu: 1, kendama: 1, orizuru: 1, radicasete: 1, consola: 1 };
// la izquierda del suelo (L1, L2, FL) queda bajo el panel de misiones de la portada: se llena la última;
// R2 va tras R3 porque tapa lo que haya en fondoD
const PREFIERE = { chochin: 'techoI', furin: 'techoD', daruma: 'R2', bandeja: 'R1', dango: 'FR', cuaderno: 'FL', fude: 'FL' };
const SLOTS = { techo: ['techoI', 'techoD'], pared: ['paredI', 'paredD'], alto: ['fondoD', 'fondoI', 'fondoD2', 'fondoI2'], suelo: ['R1', 'R3', 'R2', 'L2', 'L3', 'L1'], cerca: ['FR', 'FL'] };
// los huecos que le valen a un objeto según su sitio (lo del suelo y lo de «cerca» se pueden intercambiar)
const huecosDe = (cat) => [...(SLOTS[cat] || []), ...(cat === 'suelo' ? SLOTS.cerca : cat === 'cerca' ? SLOTS.suelo : [])];
export const MODELOS_HABITACION = [...Object.keys(PROPS).filter((k) => k !== 'bandeja'), 'kyusu', 'yunomi'];

// ───────────────────── posproceso: bokeh de foto de producto + revelado (un solo pase) ─────────────────────
// escalones de calidad (se baja sola si no llega): píxeles del lienzo, DPR máximo, MSAA, muestras del bokeh y sombra del foco.
// Sin MSAA ×4 el borde de Mochi se escalona: se sacrifica lo último.
const CALIDAD = [
  { px: 2.2e6, pr: 1.5, muestras: 4, taps: 48, sombra: 2048 },
  { px: 1.6e6, pr: 1.25, muestras: 4, taps: 40, sombra: 2048 },
  { px: 1.2e6, pr: 1.1, muestras: 4, taps: 32, sombra: 1536 },
  { px: 0.9e6, pr: 1, muestras: 2, taps: 24, sombra: 1024 },
];
// el escalón al que llegó este equipo: la próxima vez empieza ahí (y, pasado un día, prueba uno mejor por si fue algo pasajero)
const CLAVE_CALIDAD = 'nyango-calidad-3d';
function calidadInicial() {
  const base = (devicePixelRatio || 1) > 1.25 ? 1 : 0; // en pantallas HiDPI el escalón 1 no se distingue del 0
  try { const g = JSON.parse(localStorage.getItem(CLAVE_CALIDAD)); if (g?.n >= 0 && g.n < CALIDAD.length) return Math.max(base, Date.now() - g.t > 864e5 ? g.n - 1 : g.n); } catch {}
  return base;
}
const LADO_SOMBRA = { [THREE.FrontSide]: THREE.BackSide, [THREE.BackSide]: THREE.FrontSide, [THREE.DoubleSide]: THREE.DoubleSide };
const POST_V = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const POST_F = /* glsl */`
#include <packing>
uniform sampler2D tColor; uniform sampler2D tDepth; uniform vec2 res; uniform float cerca, lejos, foco, fuerza, margen, maxPx, maxN, tiempo;
varying vec2 vUv;
float prof(vec2 uv){ return -perspectiveDepthToViewZ(texture2D(tDepth, uv).x, cerca, lejos); }
float coc(float z){ float c = abs(1.0 - foco / z); c = max(0.0, c - margen); return min(c * fuerza * res.y, maxPx); }
void main(){
  float zc = prof(vUv), cc = coc(zc), R = cc;
  for (int i = 0; i < 8; i++) { float a = float(i) * 0.785398 + 0.39; vec2 uv = vUv + vec2(cos(a), sin(a)) * maxPx * 0.7 / res; float z = prof(uv); if (z < zc) R = max(R, coc(z) * 0.9); }
  vec3 col = texture2D(tColor, vUv).rgb;
  if (R > 0.6) {
    vec3 suma = col; float peso = 1.0; int N = int(clamp(R * R * 0.4, 10.0, maxN));
    for (int i = 0; i < 48; i++) {
      if (i >= N) break;
      float fi = float(i), r = sqrt((fi + 0.5) / float(N)) * R, a = fi * 2.39996323;
      vec2 uv = vUv + vec2(cos(a), sin(a)) * r / res;
      float z = prof(uv), c = coc(z), ce = z < zc ? c : min(c, cc * 2.0);
      float w = clamp(ce - r + 1.0, 0.0, 1.0);
      suma += texture2D(tColor, uv).rgb * w; peso += w;
    }
    col = suma / peso;
  }
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  vec2 q = vUv - 0.5; q.x *= res.x / res.y;
  gl_FragColor.rgb *= mix(0.5, 1.0, smoothstep(1.05, 0.22, length(q * vec2(0.9, 1.1))));
  gl_FragColor.rgb *= mix(0.62, 1.0, smoothstep(1.0, 0.55, vUv.y));   // el techo, en penumbra
  // tungsteno de tarde (medido en la referencia): ámbar en los tonos medios, las luces altas hacia crema (el papel blanco sale
  // beis, no naranja) y negros de verdad, apenas levantados hacia el marrón
  gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * vec3(1.03, 0.985, 0.77), 0.8);
  float luz = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
  gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(luz) * vec3(1.03, 0.99, 0.86), smoothstep(0.42, 0.9, luz) * 0.62);
  gl_FragColor.rgb = gl_FragColor.rgb * 0.985 + vec3(0.014, 0.009, 0.003);
  float g = fract(sin(dot(vUv * res + fract(tiempo) * 97.0, vec2(12.9898, 78.233))) * 43758.5453);
  gl_FragColor.rgb += (g - 0.5) * 0.022;
}`;
class Revelado {
  constructor() {
    const dt = new THREE.DepthTexture(4, 4); dt.type = THREE.UnsignedIntType;
    this.rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: CALIDAD[0].muestras, depthTexture: dt });
    this.mat = new THREE.ShaderMaterial({
      uniforms: { tColor: { value: this.rt.texture }, tDepth: { value: dt }, res: { value: new THREE.Vector2(4, 4) }, cerca: { value: 0.1 }, lejos: { value: 60 }, foco: { value: 11 }, fuerza: { value: 0.034 }, margen: { value: 0.025 }, maxPx: { value: 14 }, maxN: { value: CALIDAD[0].taps }, tiempo: { value: 0 } },
      vertexShader: POST_V, fragmentShader: POST_F, depthTest: false, depthWrite: false,
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat); this.quad.frustumCulled = false;
    this.escena = new THREE.Scene(); this.escena.add(this.quad); this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }
  tamano(w, h, q = CALIDAD[0]) {
    if (this.rt.samples !== q.muestras) { this.rt.dispose(); this.rt.samples = q.muestras; } // se vuelve a crear en el siguiente uso
    this.rt.setSize(w, h); const U = this.mat.uniforms;
    U.res.value.set(w, h); U.maxPx.value = Math.min(20, Math.max(6, h * 0.015)); U.maxN.value = q.taps;
  }
  dibujar(r, escena, camara, t) {
    const U = this.mat.uniforms; U.cerca.value = camara.near; U.lejos.value = camara.far; U.tiempo.value = t;
    r.setRenderTarget(this.rt); r.render(escena, camara); r.setRenderTarget(null); r.render(this.escena, this.cam);
  }
  dispose() { this.rt.depthTexture?.dispose(); this.rt.dispose(); this.mat.dispose(); this.quad.geometry.dispose(); }
}

// ─────────────────────────────── muelle ───────────────────────────────
class Muelle {
  constructor(x = 0, k = 220, d = 13) { this.x = x; this.v = 0; this.obj = x; this.k = k; this.d = d; }
  paso(h) { this.v += (this.k * (this.obj - this.x) - this.d * this.v) * h; this.x += this.v * h; return this.x; }
}

// poses base de los brazos (coordenadas del cuerpo). Pata derecha = −x (onigiri), izquierda = +x (katana)
const POSE = {
  mR: V3(-0.9, 1.06, 0.22), cR: V3(-0.3, -1, 0.15), mL: V3(0.34, 0.45, 0.3), cL: V3(0.8, -0.3, 0.35),
  kmL: V3(0.6, 0.6, 0.24), kcL: V3(0.8, -0.5, 0.3), kat: V3(0.55, 1, 0.08),
  // sentado: las dos manos en las rodillas (antes la derecha iba siempre en alto con el onigiri, y quedaba raro)
  smR: V3(-0.34, 0.45, 0.3), scR: V3(-0.8, -0.3, 0.35),
  // de pie: los bracitos cuelgan a los lados, un pelín por delante
  pmR: V3(-0.47, 0.37, 0.12), pcR: V3(-1, -0.1, -0.25), pmL: V3(0.47, 0.37, 0.12), pcL: V3(1, -0.1, -0.25),   // abiertos hacia abajo, no «en jarras»
  // de pie y SIN ropa: los brazos caen casi rectos pegados al cuerpo (con ropa se abren, o la tela se pegaría)
  dmR: V3(-0.42, 0.32, 0.03), dcR: V3(-0.25, 0, -1), dmL: V3(0.42, 0.32, 0.03), dcL: V3(0.25, 0, -1),
};
const JOROBA = { dePie: 0.12, sentado: 0.17 };   // radianes que se echa hacia delante el tronco
const ORDEN = ['bufanda', 'hachimaki', 'haori', 'bokken', 'kabuto', 'katana', 'capa', 'aura'];
// el bokken en la cintura (espacio del cuerpo): dónde va su centro, cuánto gira y cuánto sube la empuñadura
const BOKKEN = { pos: [0.33, 0.4, -0.2], giro: -Math.PI / 2 + 0.1, alza: 0.35 };
// cuánto caen (o se ponen tiesas) las orejas con cada cara: subido, que no se notaba
const ANIMO_OREJAS = { triste: 0.6, sueno: 0.36, llanto: 0.62, enfado: 0.6, verguenza: 0.3, sorpresa: -0.24, estrella: -0.16, decidido: -0.16, risa: -0.1, amor: -0.1, feliz: -0.06,
  vago: 0.42, aburrido: 0.2, bobo: 0.12, panico: -0.26, doya: -0.08, bleh: -0.06 };
let rectListo = false;
const R_MANO = 0.115, R_ONI = 0.19, ONI_SOBRE = V3(0, 0.16, 0.04), ONI_ARRIBA = ONI_SOBRE.clone().normalize(), _H = V3(), _O = V3(), _K = V3();
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _v = V3(), _v2 = V3(), _m4 = new THREE.Matrix4(), _m4b = new THREE.Matrix4(), _e = new THREE.Euler();

const movReducido = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
// cede el hilo entre tandas de trabajo (scheduler.yield donde exista: vuelve antes que un setTimeout)
const tarea = () => (globalThis.scheduler?.yield ? globalThis.scheduler.yield() : new Promise((ok) => setTimeout(ok, 0)));
const soltar = (g) => g.traverse((o) => { if (o.material) [o.material].flat().forEach((m) => m.dispose()); });
export class Mascota {
  constructor(lienzoEl, { isla = true, equipo = 0, compacta = false, ligera = false, conservar = false, giro = null, figura = true, voz = null, especie = null } = {}) {
    // voz: sus ruiditos (sonido.js). Por defecto solo en la portada: en el estudio ya suena lo suyo y los
    // gestos ociosos cada pocos segundos distraerían.
    this.conVoz = voz ?? !!isla; this.vozT = -9;
    this.lienzo = lienzoEl; this.isla = !!isla; this.compacta = !!compacta; this.conPost = this.isla && !this.compacta && !ligera;
    // ligera (teléfono): sin posproceso y con un tope de píxeles por punto, de sombra y de fotogramas. true = el normal del móvil
    this.ligera = ligera === true ? { pr: 1.5, sombra: 1024, aa: true, fps: 0 } : ligera || null; this.conservar = !!conservar;
    this.calidad = this.conPost ? calidadInicial() : this.ligera ? CALIDAD.length - 1 : 0; // las luces ya la usan (tamaño de sombra)
    // figura: false monta la escena entera (sala, luces, cámara, revelado) SIN el cuerpo de Mochi. Lo usa
    // la vista que trae otro cuerpo y se queda con todo lo demás igual.
    this.conFigura = !!figura;
    this.render = null; // el contexto WebGL (cientos de ms) se crea en preparar(), ya con la interfaz pintada
    if (!rectListo) { RectAreaLightUniformsLib.init(); rectListo = true; }

    const escena = (this.escena = new THREE.Scene());
    escena.environmentIntensity = this.isla ? 0.32 : 0.5;
    if (this.isla) escena.background = new THREE.Color(0x4a3c22);
    this.camara = new THREE.PerspectiveCamera(this.compacta ? 30 : 28, 1, 0.1, 60);
    this.mundo = new THREE.Group(); escena.add(this.mundo);
    this.asiento = 0; this.luces();
    // la sala se monta en preparar(), cuando el Worker entrega sus texturas. 0.276 es lo que mide el zabutón de
    // verdad (su tapa es plana: el «inflado» solo mueve los vértices del canto). Con 0.37 flotaba 9 cm encima.
    if (this.isla) this.asiento = 0.276;
    else {
      const suelo = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.ShadowMaterial({ opacity: 0.2 })); suelo.rotation.x = -Math.PI / 2; suelo.receiveShadow = true; this.mundo.add(suelo);
      const s = sombraPlana(2.4, 2.1, 0.4); s.position.set(0, 0.002, 0.1); this.mundo.add(s); this.sombraBlob = s;
    }

    // giro del cuerpo: negativo = mirando a su izquierda (a la izquierda de la pantalla). Quien lo coloque en una
    // esquina lo pasa a mano para que mire hacia dentro y no hacia el borde.
    this.giro = giro ?? (this.compacta ? 0.36 : this.isla ? 0.5 : 0.42);
    this.giroBase = this.giro;
    // la figura
    if (this.conFigura) {
      this.g = crearGato(this.compacta ? 512 : 1024, this.compacta ? 15 : 24, especie);
      this.g.figura.scale.setScalar(ESC); this.g.figura.position.set(0, this.asiento, -0.05); this.g.figura.rotation.y = this.giro;
      this.mundo.add(this.g.figura); this.g.cara.firma = '';
      this.piezas = crearEquipo(this.g);
      // platito con el onigiri para cuando la pata izquierda lleva la katana (no salta con Mochi)
      this.platito = new THREE.Group();
      this.platito.add(torno('platito', [[0, 0], [0.24, 0], [0.3, 0.035], [0.31, 0.05], [0.28, 0.045], [0, 0.03]], vinilo(0x2d3f73, { rug: 0.2, cc: 1 }), 40));
      this.onigiriPlato = new THREE.Mesh(geosFigura().onigiri, this.g.matOnigiri); this.onigiriPlato.position.set(0, 0.2, 0); this.onigiriPlato.rotation.set(-0.35, -0.3, 0); this.onigiriPlato.scale.setScalar(0.92);
      this.platito.add(this.onigiriPlato); this.platito.scale.setScalar(ESC); sombrear(this.platito); this.mundo.add(this.platito);
      { const p = (this.compacta ? V3(-0.82, 0, 0.42) : V3(-0.86, 0, 0.66)).applyAxisAngle(EJE_Y, this.giro).multiplyScalar(ESC); this.platito.position.set(p.x, this.asiento - 0.02, p.z - 0.05); }
      this.nube = crearNube(); this.g.cabeza.add(this.nube.g);
    } else {
      // lo mínimo para que sigan valiendo los manpu y el confeti, que son de la escena y no del cuerpo
      this.g = { manpu: new THREE.Group(), cara: null, brazos: [] };
      this.g.manpu.position.set(0, this.asiento, 0); this.mundo.add(this.g.manpu);
      this.piezas = null;
    }

    // confeti
    const conf = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.09, 0.15), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.5 }), 90);
    const paleta = [0xe8483a, 0xf5c542, 0xf7a1b5, 0x49b3c4, 0xfaf3e2, 0x7fc36a].map((c) => new THREE.Color(c));
    for (let i = 0; i < 90; i++) conf.setColorAt(i, paleta[i % paleta.length]);
    conf.count = 0; conf.frustumCulled = false; this.mundo.add(conf);
    this.confeti = { malla: conf, datos: [] };

    // estado
    this.reloj = 0; this.quieto = 0; this.proxIdle = 2.5 + Math.random() * 2; this.idle = null;
    // Andar y girarse. posX es dónde está (en el mundo); giroAct hacia dónde mira el CUERPO, que antes no se
    // movía nunca: solo giraba la cabeza, y por eso parecía que siempre miraba al mismo lado.
    this.posX = 0; this.posObj = 0; this.giroAct = this.giro; this.giroObj = null; this.andar = 0; this.fasePaso = 0; this.zancada = 0;
    this.giroFrente = this.isla ? 0.14 : this.giro;   // en su sala, de frente a ti; en las esquinas, hacia dentro
    this.merienda = false;
    this.caraBase = 'normal'; this.caraUsr = null; this.caraGes = null; this.caraIdl = null;
    this.cara = 'normal'; this.destino = 'normal'; this.trans = null; this.parp = 1.6; this.parpT = 0; this.doble = false; this.abre = 1;
    this.raton = new THREE.Vector2(); this.ratonT = -10; this.mira = new THREE.Vector2(); this.miraExtra = 0;
    this.S = { y: 0, v: 0, botes: 0 }; this.sigue = 0;
    // encuadre: cuánto se corre la imagen (fracción del ancho) para dejar sitio a la carta de la portada
    this.desvio = 0; this.desvioAct = 0; this.desvioPuesto = null;
    // inventario: giro a mano (arrastrando) y el sitio que has elegido para cada objeto de la sala
    this.giroManual = null; this.sitios = {}; this.movido = null;
    // pie: 0 sentado, 1 de pie. Con muelle, para que al levantarse rebote un poco y no suba como un ascensor.
    this.dePie = true;
    this.m = { pie: new Muelle(1, 150, 11), pitch: new Muelle(0, 150, 10), sq: new Muelle(0, 260, 12), bam: new Muelle(0, 160, 7), cabeceo: new Muelle(0, 140, 9), cabSq: new Muelle(1, 340, 11), pop: new Muelle(1, 380, 13), incl: new Muelle(0, 120, 11), or: [new Muelle(0, 240, 10), new Muelle(0, 240, 10)], fl: [new Muelle(0, 300, 12), new Muelle(0, 300, 12)] };
    this.P = { y: 0, sq: 1, incl: 0, cab: 0, yaw: 0, or: [0, 0], fl: [0, 0], colaAmp: 1, colaVel: 1, mR: V3(), cR: V3(), mL: V3(), cL: V3(), kat: V3(), anticipa: null };
    this.cabRot = V3(); this.kat = POSE.kat.clone().normalize(); this.fase1 = 0; this.fase2 = 0; this.colaExtra = 0;
    this.ticOreja = 2.5 + Math.random() * 3; this.tic = [0, 0];
    this.gesto = null; this.pops = []; this.manpus = []; this.matsManpu = {};
    this.props = []; this.accs = {}; this.acc = null; this.nivel = -1; this.ropas = {}; this.prenda = null; this.quitado = new Set();
    this.cabM = new THREE.Matrix4(); this.cabI = new THREE.Matrix4(); this.oniOff = ONI_SOBRE.clone(); this.limMano = (p, n, r) => { this.sinCola = r > 0; const e = this.limitar(p, r || R_MANO, n); this.sinCola = false; return e; }; this.colaAp = 0; this.colaV = []; this.colaP = COLA_S.map((s) => [0.02 + 0.1 * s, 0.34 + 0.5 * s, -0.24 - 0.2 * s]);
    this.stats = { cpu: 0, fotogramas: 0 }; this.pendientes = new Set(); this.enCurso = new Set();

    if (this.isla) { this.luzProps = [0, 1].map(() => { const l = new THREE.PointLight(0xffb45e, 0, 7, 1.6); this.escena.add(l); return l; }); this.decorar(null); }
    this.equipar(equipo, false);
    if (this.conPost) this.post = new Revelado();
    this.alMover = (e) => { this.raton.set((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1); this.ratonT = this.reloj; };
    addEventListener('pointermove', this.alMover);
    this.paso(1 / 60); this.ajustar();
    // visible o no sin medir el DOM en cada fotograma: oculto, el bucle se para y estos observadores lo despiertan
    this.enVista = true; this.vistaEl = null;
    this.obs = new ResizeObserver(() => { this.ajustar(); this.mirarVista(); this.despertar(); }); this.obs.observe(lienzoEl);
    this.io = new IntersectionObserver((es) => { this.enVista = es[es.length - 1].isIntersecting; this.mirarVista(); this.despertar(); }); this.io.observe(lienzoEl);
    this.mo = new MutationObserver(() => this.despertar()); this.mirarVista();
    this.bucle = this.bucle.bind(this); this.raf = 0;
    // sin bucle hasta tener la sala y los shaders compilados en paralelo: la interfaz responde mientras tanto
    this.listo = this.preparar();
  }

  crearRender() {
    if (this.render) return this.render;
    const r = (this.render = new THREE.WebGLRenderer({ canvas: this.lienzo, antialias: !this.conPost && this.ligera?.aa !== false, alpha: !this.isla, powerPreference: 'high-performance', preserveDrawingBuffer: this.conservar }));
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = this.isla ? 0.75 : 1.08;
    r.outputColorSpace = THREE.SRGBColorSpace;
    if (!this.isla) r.setClearColor(0x000000, 0);
    this.ajustar();
    return r;
  }
  // reflejos del vinilo: una habitación de estudio filtrada (PMREM)
  crearEntorno(amb = new RoomEnvironment(), pmrem = new THREE.PMREMGenerator(this.render)) {
    if (!this.envRT) { this.envRT = pmrem.fromScene(amb, 0.04); this.escena.environment = this.envRT.texture; }
    pmrem.dispose(); amb.dispose?.();
  }
  async preparar() {
    try {
      const tex = this.isla ? texturasSala() : null, formas = this.conFigura ? lanzarFormas() : Promise.resolve();
      await tarea(); if (this.muerta) return;
      const r = this.crearRender();
      await tarea(); if (this.muerta) return;
      // entorno: sus materiales se compilan antes en paralelo; los render targets se crean antes de compilar nada más
      const amb = new RoomEnvironment(), pmrem = new THREE.PMREMGenerator(r), rt = (this.rtSombra ||= new THREE.WebGLRenderTarget(1, 1));
      // lo que PMREM dibuja por su cuenta (el fondo del cubo y su desenfoque) también se compila antes; usa internos de three r170
      const aparte = new THREE.Group(), fondo = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial({ side: THREE.BackSide, depthWrite: false, depthTest: false }));
      aparte.add(fondo);
      try { pmrem._setSize(256); pmrem._allocateTargets().dispose(); aparte.add(new THREE.Mesh(pmrem._lodPlanes[0], pmrem._blurMaterial)); } catch {}
      r.setRenderTarget(rt); if (this.post) r.setRenderTarget(this.post.rt);
      const matsAmb = new Set([...r.compile(amb, this.camara), ...r.compile(aparte, this.camara)]); r.setRenderTarget(null);
      await this.esperarProgramas(matsAmb); await this.calentar(matsAmb); if (this.muerta) { pmrem.dispose(); return; }
      this.crearEntorno(amb, pmrem); fondo.geometry.dispose(); fondo.material.dispose();
      await tarea(); if (this.muerta) return;
      if (tex) {
        const t = await tex; if (this.muerta) return;
        const h = crearHabitacion(t); this.mundo.add(h.sala); this.prim = h.prim;
        await this.decorar(this.deco); while (this.decoEnCurso) await this.decoEnCurso;
        if (this.muerta) return; this.ajustar();
      }
      // manpu con material propio: se compilan ya para que el primero no congele
      const extra = new THREE.Group(), g1 = cache('geo:plano1', () => new THREE.PlaneGeometry(1, 1));
      for (const k of Object.keys(MANPU_COL)) extra.add(new THREE.Mesh(g1, this.matManpu(k)));
      this.mundo.add(extra); this.paso(1 / 60);
      await formas; if (this.muerta) return;
      const mats = await this.compilar(this.escena); this.mundo.remove(extra);
      await this.calentar(mats);
    } catch (e) { console.warn('Mochi: arranque sin precompilar', e); }
    if (this.muerta) return;
    this.listoYa = true; this.despertar();
  }
  // compila los programas de raiz (y los de sus sombras) con KHR_parallel_shader_compile, sin bloquear el hilo
  async compilar(raiz) {
    const r = this.render, antes = r.getRenderTarget(), raices = [raiz].flat(), prox = new THREE.Group(), sueltos = [], vistos = new Set(), mats = new Set();
    this.compilando = true;
    for (const x of raices) x.traverse((o) => {
      for (const m of [o.material].flat()) if (m) mats.add(m);
      if (!o.isMesh || !o.castShadow) return;
      const m = Array.isArray(o.material) ? o.material[0] : o.material; if (!m) return;
      let d = o.customDepthMaterial;
      if (!d) {
        const k = `${m.side}|${m.shadowSide}|${!!m.map}|${m.alphaTest > 0}|${!!m.alphaMap}|${!!m.displacementMap}|${o.isInstancedMesh}|${!!o.instanceColor}`; if (vistos.has(k)) return; vistos.add(k);
        d = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }); sueltos.push(d);
      }
      // lo mismo que pone WebGLShadowMap antes de dibujar la sombra
      d.side = m.shadowSide ?? LADO_SOMBRA[m.side]; d.map = m.map; d.alphaMap = m.alphaMap; d.alphaTest = m.alphaTest; d.displacementMap = m.displacementMap; d.displacementScale = m.displacementScale;
      // 30-09 · con las instancias (las flores del hanakanmuri, plantas…), la sombra lleva su variante instanciada (y con color
      // por instancia): con un Mesh normal se compilaba otra y la de verdad se compilaba al ponérselo, con la pantalla parada
      const px = o.isInstancedMesh ? new THREE.InstancedMesh(o.geometry, d, 1) : new THREE.Mesh(o.geometry, d);
      if (o.isInstancedMesh && o.instanceColor) px.instanceColor = o.instanceColor;
      prox.add(px); mats.add(d);
    });
    if (this.post && raiz === this.escena) mats.add(this.post.mat);
    try {
      // cada compile() solo encarga los programas; el objetivo de render decide el tone mapping y el espacio de color de la clave
      r.setRenderTarget(this.post ? this.post.rt : null);
      raices.forEach((x) => r.compile(x, this.camara, this.escena));
      r.setRenderTarget(this.post?.rt ?? (this.rtSombra ||= new THREE.WebGLRenderTarget(1, 1)));
      if (prox.children.length) r.compile(prox, this.camara, this.escena);
      r.setRenderTarget(null);
      if (this.post && raiz === this.escena) r.compile(this.post.escena, this.post.cam);
    } finally { r.setRenderTarget(antes); }
    const todo = this.esperarProgramas(mats); this.enCurso.add(todo);
    await todo.finally(() => this.enCurso.delete(todo));
    (this.calentados ||= []).push(...sueltos); // vivos: si se liberasen, el programa de la sombra se borraría con ellos
    return mats;
  }
  // Como renderer.compileAsync, pero sin consultar nada a la GPU hasta que ha recibido todo lo encargado (una valla):
  // cualquier consulta síncrona (como isReady) esperaría a que tradujese todos los shaders de la cola.
  async esperarProgramas(mats) {
    const r = this.render, gl = r.getContext(), pausa = () => new Promise((ok) => setTimeout(ok, 16)), fin = performance.now() + 20000;
    const valla = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0); gl.flush();
    while (!this.muerta && !gl.isContextLost() && gl.getSyncParameter(valla, gl.SYNC_STATUS) !== gl.SIGNALED && performance.now() < fin) await pausa();
    if (!gl.isContextLost()) gl.deleteSync(valla);
    const progs = new Set(); for (const m of mats) for (const p of r.properties.get(m).programs?.values() || []) progs.add(p);
    while (progs.size && !this.muerta && !gl.isContextLost() && performance.now() < fin) { for (const p of progs) if (p.isReady()) progs.delete(p); if (progs.size) await pausa(); }
  }
  // primer uso de sus programas (leer los uniforms son muchas llamadas síncronas a la GPU) y subida de sus texturas, en tareas cortas
  async calentar(mats) {
    const r = this.render, progs = new Set(), texs = new Set();
    for (const m of mats) {
      for (const p of r.properties.get(m).programs?.values() || []) progs.add(p);
      for (const v of Object.values(m)) if (v?.isTexture) texs.add(v);
      for (const u of Object.values(m.userData?.u || {})) if (u.value?.isTexture) texs.add(u.value);
    }
    const P = [...progs], T = [...texs].filter((t) => !t.isRenderTargetTexture && !t.isDepthTexture);
    for (const p of P) { await tarea(); if (this.muerta) return; p.getUniforms(); }
    for (let i = 0; i < T.length; i += 3) { await tarea(); if (this.muerta) return; T.slice(i, i + 3).forEach((t) => r.initTexture(t)); }
  }
  // objetos nuevos (atrezo, accesorio, ropa): invisibles hasta que sus programas estén listos
  // (antes de la compilación del arranque no hace falta: esa ya los incluye). Devuelve la espera, o null si no hace falta.
  // 30-09 · en la pantalla de carga: toda la ropa, los accesorios y los objetos de la sala se mallan y se compilan ya, ocultos.
  // Así, en el inventario, ponerse algo o colocar un objeto es al instante (antes se mallaba y compilaba al elegirlo y la
  // pantalla «se quedaba pensando»). Las geometrías quedan en caché y los programas en el renderer.
  precalentarArmario() {
    if (this.armario || this.muerta) return this.armario;
    return (this.armario = (async () => {
      await this.listo; if (this.muerta || !this.listoYa) return;
      const objs = [];
      for (const id of Object.keys(ROPA)) { if (this.ropas[id]) continue; await tarea(); if (this.muerta) return; const g = ROPA[id].crear(); sombrear(g); this.g.cuerpo.add(g); this.ropas[id] = g; objs.push(g); }
      for (const id of ACCESORIOS) { if (this.accs[id]) continue; await tarea(); if (this.muerta) return; const g = crearAccesorio(id); this.g.cabeza.add(g); this.accs[id] = g; objs.push(g); }
      const sala = new THREE.Group();
      if (this.isla) for (const id of [...MODELOS_HABITACION, 'bandeja']) { if (!PROPS[id]) continue; await tarea(); if (this.muerta) return; const g = PROPS[id].crear(null, [id]); sombrear(g); g.position.y = -60; sala.add(g); }
      if (sala.children.length) { this.mundo.add(sala); objs.push(sala); }
      const espera = this.estrenar(objs, () => { this.vestir(); this.aplicarAccesorio(); });
      if (espera) await espera; else { this.vestir(); this.aplicarAccesorio(); }
      this.mundo.remove(sala);
    })().catch((e) => console.warn('Mochi: armario sin precalentar', e)));
  }
  estrenar(objs, alListo) {
    if (!this.compilando) return null;
    objs.forEach((o) => { this.pendientes.add(o); o.visible = false; });
    return this.compilar(objs).then((mats) => this.calentar(mats)).catch(() => {})
      .then(() => { objs.forEach((o) => this.pendientes.delete(o)); if (!this.muerta) alListo(); });
  }
  mirarVista() {
    const v = this.lienzo.closest('.vista');
    if (v !== this.vistaEl) { this.mo.disconnect(); this.vistaEl = v; if (v) this.mo.observe(v, { attributes: true, attributeFilter: ['class'] }); }
  }
  visible() { return !this.pausada && this.enVista && !this.sinTamano && this.lienzo.isConnected && (!this.vistaEl || this.vistaEl.classList.contains('activa')); }
  pausar() { this.pausada = true; cancelAnimationFrame(this.raf); this.raf = 0; }
  reanudar() { this.pausada = false; this.despertar(); }
  despertar() {
    if (this.raf || !this.listoYa || this.muerta || !this.visible()) return;
    this.ult = undefined; if (this.rit) { this.rit.t0 = performance.now() + 1000; this.rit.d = []; } // al volver, tanda de medida nueva
    this.raf = requestAnimationFrame(this.bucle);
  }

  luces() {
    const e = this.escena;
    // 30-09 · luz «cozy»: nada de un foco plano de frente, sino capas de luz cálida (~2700 K)
    // a distintas alturas, charcos de luz con su caída (luz donde está Mochi; rincones y techo en penumbra), sombras blandas y
    // marrones, rebote cálido del tatami y, en contraste, la luz fría de la ventana redonda perfilándolo por detrás.
    e.add(new THREE.HemisphereLight(this.isla ? 0xffd9a0 : 0xfff0d8, SALA.suelo, this.isla ? 0.55 : 0.9));
    if (this.isla) {
      // la principal: blanda, desde arriba a la izquierda (como una lámpara de techo de papel fuera de cuadro)
      const foco = new THREE.SpotLight(0xffd48c, 2.5, 0, 0.7, 1.0, 0);
      foco.position.set(-3.2, 10.5, 8.5); foco.target.position.set(0.2, 1.2, -1.0);
      foco.castShadow = true; foco.shadow.mapSize.setScalar(this.tamSombra()); foco.shadow.bias = -0.0004; foco.shadow.normalBias = 0.02; foco.shadow.camera.near = 4; foco.shadow.camera.far = 30; foco.shadow.radius = 6;
      e.add(foco, foco.target); this.foco = foco;
      // de frente, solo un relleno suave (antes era la luz fuerte y aplanaba la sala)
      const caja = new THREE.RectAreaLight(0xffe2bc, 1.7, 6, 3.2); caja.position.set(1.8, 3.6, 8); caja.lookAt(0, 1.9, 0); e.add(caja);
      // un charco de luz rozando la pared por el kakejiku (la lámpara de pie de la izquierda lleva la suya: crearHabitacion)
      const bano = new THREE.PointLight(0xffcc78, 5.5, 4.6, 1.6); bano.position.set(2.7, 5.4, PARED_Z + 0.7); e.add(bano); this.bano = bano;
      // el perfil: cálido por la derecha y frío por detrás (la luz de fuera que entra por la ventana)
      const contra = new THREE.DirectionalLight(0xffb870, 1.5); contra.position.set(4.5, 5, -3); e.add(contra); this.contra = contra;
      const fuera = new THREE.RectAreaLight(0xbcd4ff, 2.2, 2.6, 2.6); fuera.position.set(0, 3.9, PARED_Z + 0.2); fuera.lookAt(0, 2.2, 2); e.add(fuera);
      // el rebote del tatami, cálido y bajo
      const bajo = new THREE.PointLight(0xffc27c, 1.9, 8, 1.5); bajo.position.set(-1.5, 0.6, 2.5); e.add(bajo);
    } else {
      const sol = new THREE.DirectionalLight(0xffe6c4, 2.6);
      sol.position.set(-3.5, 7, 6); sol.castShadow = true; sol.shadow.mapSize.set(1024, 1024);
      Object.assign(sol.shadow.camera, { left: -2.6, right: 2.6, top: 4.6, bottom: -0.6, near: 2, far: 18 }); sol.shadow.bias = -0.0005; sol.shadow.normalBias = 0.02;
      e.add(sol);
      const caja = new THREE.RectAreaLight(0xfff3e4, 3, 5, 3); caja.position.set(1.5, 3, 7); caja.lookAt(0, 1.7, 0); e.add(caja);
      const contra = new THREE.DirectionalLight(0xffd3a0, 1.8); contra.position.set(4, 4.5, -4); e.add(contra); this.contra = contra;
    }
  }

  tamSombra() { return this.ligera ? this.ligera.sombra : CALIDAD[this.calidad].sombra; }
  ajustar() {
    const w = this.lienzo.clientWidth, h = this.lienzo.clientHeight;
    if (!w || !h) { this.sinTamano = true; return; }
    this.sinTamano = false;
    let pr = Math.min(devicePixelRatio || 1, this.ligera ? this.ligera.pr : 2);
    const q = CALIDAD[this.calidad];
    if (this.conPost) pr = Math.min(pr, q.pr, Math.sqrt(q.px / (w * h))); // límite de DPR del posproceso
    if (this.render) { this.render.setPixelRatio(pr); this.render.setSize(w, h, false); }
    if (this.post) this.post.tamano(Math.max(1, Math.round(w * pr)), Math.max(1, Math.round(h * pr)), q);
    if (this.foco && this.foco.shadow.mapSize.x !== this.tamSombra()) { this.foco.shadow.mapSize.setScalar(this.tamSombra()); this.foco.shadow.map?.dispose(); this.foco.shadow.map = null; }
    const asp = w / h, cam = this.camara; cam.aspect = asp; this.tamW = w; this.tamH = h; this.desvioPuesto = null;
    const tv = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    if (this.isla) {
      // apaisado (portada): Mochi un poco más pequeño y alto, con sitio debajo para el titular y a los lados para las fichas
      // en vertical (móvil) la carta ocupa la mitad de abajo: se mira más abajo para que Mochi quede en la de arriba
      this.dist = Math.max(12.4, 7.6 / asp); this.alturaCam = asp < 0.8 ? 1.5 : 0.62; this.objetivo = V3(0, asp < 0.8 ? 0.7 : 1.5, 0);
    } else {
      // de pie mide lo que las patas más: se encuadra para esa altura, que es la de casi siempre
      const kab = this.lleva('kabuto') && !this.acc, alto = (this.compacta ? 3.85 : 4.0) + (kab ? 0.42 : 0) + ALZA * ESC * 0.8, ancho = this.compacta ? 3.1 : 3.6;
      this.dist = Math.max(alto / 2 / tv, ancho / 2 / (tv * asp)) + 0.6;
      this.objetivo = V3(0, alto / 2 - 0.12, 0); this.alturaCam = this.objetivo.y - 0.3 + (this.pupitre ? 1.1 : 0);   // con pupitre, algo más alta: que se vea la mesa
    }
    cam.updateProjectionMatrix();
    if (this.prim) this.recolocar(asp, tv);
  }

  // Reparte el atrezo según lo ancho (o alto) que sea el encuadre: nada de huecos negros en vertical.
  recolocar(asp = this.camara.aspect, tv = Math.tan(THREE.MathUtils.degToRad(this.camara.fov / 2))) {
    const W = (z) => (this.dist - z) * tv * asp, pitch = Math.atan((this.objetivo.y - this.alturaCam) / this.dist);
    const TOP = (z) => this.alturaCam + (this.dist - z) * Math.tan(Math.atan(tv) + pitch);
    const vertical = W(0) < 2.8, P = this.prim;
    P.pilar.position.x = -Math.min(W(PARED_Z) * 0.8, 7) + 2 * this.desvio * W(PARED_Z);
    if (vertical) P.kake.position.set(W(PARED_Z) * 0.5, Math.max(3.4, TOP(PARED_Z) - 2.4), PARED_Z + 0.03);
    else P.kake.position.set(Math.min(Math.max(2.35, W(PARED_Z) * 0.55), 5.5), 3.4, PARED_Z + 0.03);
    if (P.lampara) P.lampara.position.set(P.pilar.position.x + (vertical ? 0.75 : 1.05), 0, PARED_Z + 0.6);
    if (this.bano) this.bano.position.set(P.kake.position.x + 0.1, P.kake.position.y + 1.3, PARED_Z + 1.0);
    // la ventana: detrás de Mochi, enmarcándolo; en vertical, más pequeña y arriba a la izquierda, sin chocar con el kakejiku
    if (P.ventana) { if (vertical) { P.ventana.position.set(-W(PARED_Z) * 0.45, Math.max(4.2, TOP(PARED_Z) - 2.0), PARED_Z + 0.012); P.ventana.scale.setScalar(0.62); }
      else { P.ventana.position.set(0, 3.9, PARED_Z + 0.012); P.ventana.scale.setScalar(1); } }
    const S = {
      techoI: () => { const z = -0.9; return [-cl(W(z) * (vertical ? 0.5 : 0.56), 1.1, 4.6), TOP(z) - (vertical ? 1.7 : 1.25), z]; },
      techoD: () => { const z = -1.7; return [cl(W(z) * (vertical ? 0.55 : 0.86), 1.3, 5.6), TOP(z) - (vertical ? 2.4 : 1.15), z]; },
      paredI: () => [-cl(W(PARED_Z) * 0.42, 2.0, 4.2), vertical ? TOP(PARED_Z) - 2.2 : 3.7, PARED_Z + 0.05],
      paredD: () => [Math.max(cl(W(PARED_Z) * 0.8, 4.5, 6.8), P.kake.position.x + 1.7), 3.6, PARED_Z + 0.05], // a la derecha del kakejiku de Nyango, sin taparse
      fondoD: () => { const z = PARED_Z + 0.7; return [cl(W(z) * 0.7, vertical ? 1.2 : 3.4, 6.2), 0, z]; },
      fondoI: () => { const z = PARED_Z + 0.7; return [-cl(W(z) * 0.6, vertical ? 1.2 : 2.7, 5.5), 0, z]; },
      fondoD2: () => { const z = PARED_Z + 0.7; return [cl(W(z) * 0.93, 5.4, 8.5), 0, z]; },
      fondoI2: () => { const z = PARED_Z + 0.7; return [-cl(W(z) * 0.92, 5.4, 8.5), 0, z]; },
      L1: () => (vertical ? [-W(2.6) * 0.5, 0, 2.6] : [-cl(W(0.8) * 0.62, 2.05, 3.7), 0, 0.8]),
      R1: () => (vertical ? [W(2.2) * 0.52, 0, 2.2] : [cl(W(0.1) * 0.64, 2.2, 3.9), 0, 0.1]),
      L2: () => [-cl(W(-1.5) * 0.74, 2.7, 5.0), 0, -1.5],
      R2: () => [cl(W(-1.7) * 0.76, 2.9, 5.2), 0, -1.7],
      L3: () => [-cl(W(2.0) * 0.8, 3.6, 6.2), 0, 2.0],
      R3: () => [cl(W(1.8) * 0.82, 3.8, 6.4), 0, 1.8],
      FL: () => (vertical ? [-W(4.0) * 0.42, 0, 4.0] : [-W(3.3) * 0.6, 0, 3.3]),
      FR: () => (vertical ? [W(4.4) * 0.46, 0, 4.4] : [W(3.9) * 0.6, 0, 3.9]),
    };
    let luz = 0; this.luzProps.forEach((l) => { l.intensity = 0; });
    for (const p of this.props) {
      if (!p.slot || this.pendientes.has(p.g)) { p.g.visible = false; continue; }
      const [x, y, z] = S[p.slot](); p.g.position.set(x, y, z);
      p.g.visible = Math.abs(x) - p.def.r * 0.4 < W(z) * 1.02;
      if (p.g.visible && p.g.userData.luz && luz < 2) { const l = this.luzProps[luz++]; l.position.copy(p.g.userData.luz).add(p.g.position); l.intensity = p.id === 'andon' ? 4 : 6; }
    }
  }

  // ─── API ───
  // lleva una pieza del equipo si la ha ganado y no se la has quitado en el inventario
  lleva(n) { return ORDEN.indexOf(n) < this.nivel && !this.quitado.has(n); }
  // las piezas que quitas en el inventario (siguen ganadas; se vuelven a poner cuando quieras)
  quitarEquipo(ids = []) { this.quitado = new Set(ids.filter((n) => ORDEN.includes(n))); this.equipar(this.nivel, false); if (this.dist) this.ajustar(); }
  equipar(nivel, animar = true) {
    nivel = Math.max(0, Math.min(8, nivel | 0));
    const antes = this.nivel;
    ORDEN.forEach((n, i) => {
      const p = this.piezas[n], ahora = i < nivel && !this.quitado.has(n), estaba = p.grupos[0].visible;
      p.grupos.forEach((gr) => { gr.visible = ahora; gr.scale.setScalar(1); });
      if (animar && ahora && !estaba) p.grupos.forEach((gr, k) => { gr.scale.setScalar(0.001); this.pops.push({ gr, t: -0.1 * this.pops.length - k * 0.05 }); });
    });
    this.nivel = nivel;
    this.vestir();
    this.aplicarAccesorio();
    if (animar && nivel > antes && antes >= 0) {
      this.gesto = { tipo: 'equipo', t: 0 }; this.quieto = 0; this.idle = null;
      this.caraGes = { nombre: 'estrella', hasta: this.reloj + 1.5 };
      this.chispas(10); this.lanzarManpu('brillo', [0.95, 0.7, 0.35], { vida: 1.2 }); this.lanzarManpu('brillo', [-1.0, 0.5, 0.35], { vida: 1.1, retraso: 0.15 });
    }
    if (antes !== nivel && this.dist) this.ajustar();
  }
  // ── inventario ──
  // girarle arrastrando: se queda de cara a donde lo dejes (hasta soltarGiro)
  girarManual(delta) { this.giroManual = (this.giroManual ?? this.giroAct) + delta; this.posObj = this.posX; this.quieto = 0; }
  soltarGiro() { this.giroManual = null; }
  // qué objeto de la sala hay bajo un punto de la pantalla (null si ninguno)
  propEn(cx, cy) {
    if (!this.camara || !this.props.length) return null;
    const r = this.lienzo.getBoundingClientRect();
    this.rayo ||= new THREE.Raycaster(); this.rayo.setFromCamera(new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1), this.camara);
    const vis = this.props.filter((p) => p.g.visible && p.slot), malla = [];
    for (const p of vis) p.g.traverse((o) => { if (o.isMesh && !o.isInstancedMesh) malla.push(o); });
    const hit = this.rayo.intersectObjects(malla, false)[0]; if (!hit) return null;
    return vis.find((p) => { let o = hit.object; while (o) { if (o === p.g) return true; o = o.parent; } return false; })?.id ?? null;
  }
  // cambia un objeto de sitio: al siguiente hueco que le vale; si está ocupado, los dos se intercambian
  moverProp(id) {
    const p = this.props.find((x) => x.id === id && x.slot); if (!p) return null;
    const cands = huecosDe(p.def.cat); if (cands.length < 2) return null;
    const sig = cands[(cands.indexOf(p.slot) + 1) % cands.length], otro = this.props.find((x) => x.slot === sig);
    this.sitios = { ...this.sitios, [id]: sig }; if (otro) this.sitios[otro.id] = p.slot;
    this.movido = id; this.decorar(this.deco);
    return this.sitios;
  }
  ponerSitios(s) { this.sitios = s && typeof s === 'object' ? { ...s } : {}; }
  // corre el encuadre (fracción del ancho; positivo = Mochi hacia la izquierda). Entra con suavidad.
  encuadrar(d = 0) { this.desvio = d; if (this.prim) this.recolocar(); if (this.posObj > this.rangoPaseo()[1]) this.posObj = this.rangoPaseo()[1]; }
  // La portada le cuenta qué carta has abierto: se vuelve hacia ella (a la derecha), se acerca un poco y
  // reacciona a su manera. Es su forma de «presentarte» cada cosa.
  atender(reaccion = {}) {
    if (this.gesto || movReducido()) { if (reaccion.cara) this.caraIdl = { nombre: reaccion.cara, hasta: this.reloj + 1.4 }; return; }
    this.merienda = false; this.quieto = 0;
    this.idle = { tipo: 'atender', t: 0, dir: 1, ...reaccion };
    this.proxIdle = this.quieto + 3 + Math.random() * 2;
  }
  // ─── lo que dice: una nubecita sobre la cabeza ───
  // Es HTML y no 3D (texto nítido, japonés con furigana, botones), en el <body> y colocada cada fotograma donde
  // cae su cabeza en pantalla. Devuelve el elemento para que quien habla le ponga botones (enséñale a Nyan).
  decir(html, { ms = 4500, clase = '' } = {}) {
    if (!this.bocadillo) {
      const b = document.createElement('div'); b.className = 'nyan-dice'; b.setAttribute('role', 'status'); b.hidden = true;
      document.body.appendChild(b); this.bocadillo = b;
    }
    const b = this.bocadillo, nuevo = b.hidden;
    b.className = `nyan-dice ${clase}`; b.innerHTML = `<div class="nd-txt">${html}</div>`; b.hidden = false;
    b.classList.remove('sale'); void b.offsetWidth; b.classList.add(nuevo ? 'sale' : 'cambia');
    this.dichoHasta = ms ? this.reloj + ms / 1000 : Infinity;
    this.colocarBocadillo();
    return b;
  }
  hablando() { return !!this.bocadillo && !this.bocadillo.hidden; }
  callar(ya = false) {
    const b = this.bocadillo; if (!b || b.hidden) return;
    if (ya) { b.hidden = true; return; }
    b.classList.add('se-va'); clearTimeout(this.tCallar);
    this.tCallar = setTimeout(() => { if (b.classList.contains('se-va')) { b.hidden = true; b.classList.remove('se-va'); } }, 260);
  }
  colocarBocadillo() {
    const b = this.bocadillo; if (!b || b.hidden || !this.g.cabeza) return;
    if (this.reloj > this.dichoHasta && !b.matches(':hover')) { this.callar(); this.dichoHasta = Infinity; return; }
    // al costado de la cabeza, del lado que tenga sitio (a la izquierda si cabe: a la derecha suele estar la carta)
    const r = this.lienzo.getBoundingClientRect(), pant = (x, y, z) => { _O.set(x, y, z).applyMatrix4(this.g.cabeza.matrixWorld).project(this.camara); return [r.left + (_O.x + 1) / 2 * r.width, r.top + (1 - _O.y) / 2 * r.height]; };
    const [xi, yi] = pant(-0.7, 0.2, 0.25), [xd, yd] = pant(0.7, 0.2, 0.25), w = b.offsetWidth || 240, izq = xi - w - 18 > 12;
    // encima de la cabeza (la pantalla final del repaso lo pide: a los lados está el tablero)
    const arriba = typeof this.bocadilloArriba === 'function' ? this.bocadilloArriba() : this.bocadilloArriba;
    b.classList.toggle('arriba', !!arriba);
    if (arriba) {
      const [xa, ya] = pant(0, 1.15, 0.1);
      b.classList.remove('izq', 'der');
      b.style.left = `${Math.round(Math.max(w / 2 + 12, Math.min(innerWidth - w / 2 - 12, xa)))}px`; b.style.top = `${Math.round(Math.max(96, ya))}px`;
      return;
    }
    b.classList.toggle('izq', izq); b.classList.toggle('der', !izq);
    b.style.left = `${Math.round(izq ? xi - 14 : Math.min(innerWidth - w - 12, xd + 14))}px`; b.style.top = `${Math.round(Math.max(96, izq ? yi : yd))}px`;
  }
  /** Aura de colección (una de AURAS_C) o null. Aparte del aura del equipo de samurái. */
  auraColeccion(id) {
    const tipo = AURAS_C.includes(id) ? id : null;
    if (tipo === (this.auraC?.tipo ?? null) || !this.conFigura) return;
    if (this.auraC) { this.auraC.g.removeFromParent(); soltarAuraC(this.auraC); this.auraC = null; }
    if (tipo) { this.auraC = crearAuraC(tipo); this.g.figura.add(this.auraC.g); }
  }
  // ─── el pupitre (estudio) ───
  // Con él puesto se queda sentado a su mesa (se levanta para celebrar y vuelve), apunta en la libreta lo que aprendes
  // (apuntar), garabatea cuando se aburre y a veces se duerme encima. El ritmo (0,75 s y luego una letra cada 0,32 s)
  // es el mismo que usa la libreta de la interfaz (pupitre.js), para que las dos se escriban a la vez.
  ponerPupitre(si = true) {
    this.pupitre = !!si && this.conFigura;
    if (this.pupitre && !this.pupi) {
      this.pupi = crearPupitre(); this.pupi.fudeMesa.scale.setScalar(ESC); this.mundo.add(this.pupi.g);
      this.fudeMano = crearFude(); this.fudeMano.scale.setScalar(PUPI.fude / 0.25); this.fudeMano.visible = false; sombrear(this.fudeMano); this.g.cuerpo.add(this.fudeMano);
      document.fonts?.load?.('600 40px "Klee One"').catch(() => {});
    }
    if (this.pupi) {
      this.pupi.g.visible = this.pupitre;
      const z = PUPI.z; this.pupi.g.position.set(Math.sin(this.giroFrente) * z, 0, Math.cos(this.giroFrente) * z - 0.05); this.pupi.g.rotation.y = this.giroFrente;
    }
    if (this.pupitre) { this.posX = this.posObj = 0; this.giroObj = this.giroFrente; this.dePie = false; this.idle = null; this.proxIdle = this.quieto + 1.5; }
    this.ajustar();
  }
  // un punto de la libreta (u, v en 0..1 del lienzo; alto sobre la hoja) en el espacio del cuerpo, para las manos
  puntoLibreta(u, v, alto, out) {
    const [lx, , lz] = PUPI.libreta;   // la hoja va girada: su derecha a la derecha de Mochi (-x) y su arriba al fondo (+z)
    out.set(lx - (u - 0.5) * PUPI.LW, PUPI.alto + 0.03 + alto, lz + (0.5 - v) * PUPI.LH);
    this.pupi.g.localToWorld(out); return this.g.cuerpo.worldToLocal(out);
  }
  /** Apunta una palabra en la libreta. tacha: la letra equivocada que escribe primero (y tacha); ya: sin gesto, de golpe. */
  apuntar(palabra, { tacha = null, ya = false } = {}) {
    if (!this.pupitre || !this.pupi) return false;
    this.acabarApunte();
    const letras = [...String(palabra || '')].slice(0, 10);
    if (!letras.length) return false;
    const lista = letras.map((l) => ({ l }));
    if (tacha) lista.unshift({ l: tacha, tacha: true });   // torpe: se equivoca en la primera, la tacha y sigue
    if (ya) { const F = { lista, hechas: 0 }; while (F.hechas < lista.length) this.escribirLetra(F); return true; }
    this.gesto = null; this.dePie = false; this.merienda = false; this.quieto = 0;
    this.apunte = this.idle = { tipo: 'escribir', t: 0, dir: 1, lista, hechas: 0, palabra: letras.join('') };
    this.caraIdl = { nombre: 'sorpresa', hasta: this.reloj + 0.5 }; if (!movReducido()) this.m.sq.v += 1.8;
    return true;
  }
  // la siguiente celda libre (y pasa página si no queda sitio para n letras)
  celdaLibre(n = 1) {
    const H = this.pupi.hoja;
    if (H.col + Math.ceil(n / PUPI.filas) > PUPI.cols) { pintarHojaVacia(H.x, 512, 320); H.col = 0; H.tex.needsUpdate = true; }
    return H.col;
  }
  escribirLetra(F) {
    const H = this.pupi.hoja, x = H.x, e = F.lista[F.hechas];
    if (F.col == null) { F.col = this.celdaLibre(F.lista.length); F.fila = 0; }
    if (F.fila >= PUPI.filas) { F.col++; F.fila = 0; if (F.col >= PUPI.cols) { pintarHojaVacia(x, 512, 320); F.col = 0; } }
    const [cx, cy] = celdaHoja(F.col, F.fila);
    x.save(); x.translate(cx + (Math.random() - 0.5) * 5, cy + (Math.random() - 0.5) * 4); x.rotate((Math.random() - 0.5) * 0.22);
    x.fillStyle = '#261c18'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `600 ${36 + Math.random() * 6}px "Klee One", ${FUENTE_JP}`;
    x.fillText(e.l, 0, 1);
    if (e.tacha) { x.strokeStyle = '#261c18'; x.lineWidth = 3.4; x.beginPath(); for (let k = 0; k < 7; k++) x.lineTo(-18 + k * 6, k % 2 ? 14 : -14); x.stroke(); }
    x.restore(); H.tex.needsUpdate = true;
    F.fila++; F.hechas++; H.col = F.col + 1;
    if (e.tacha && F.tipo) this.caraIdl = { nombre: 'panico', hasta: this.reloj + 0.35 };
  }
  // si algo interrumpe la escritura, lo que faltaba se escribe de golpe (la libreta nunca se queda a medias)
  acabarApunte() {
    const F = this.apunte; if (!F) return;
    this.apunte = null;
    while (F.hechas < F.lista.length) this.escribirLetra(F);
  }
  // un garabato en la columna siguiente: un pez, un onigiri, un corazón, una espiral o へのへのもへじ
  garabato() {
    const H = this.pupi.hoja, x = H.x, col = this.celdaLibre(PUPI.filas * 2);
    const [c1] = celdaHoja(col, 0), [c2] = celdaHoja(col + 1, 0), cx = (c1 + c2) / 2, cy = 19 + 25 * PUPI.filas, T = '#261c18';
    x.save(); x.translate(cx, cy); x.rotate((Math.random() - 0.5) * 0.3); x.strokeStyle = T; x.fillStyle = T; x.lineWidth = 3.2; x.lineCap = x.lineJoin = 'round';
    const tipo = Math.floor(Math.random() * 5);
    if (tipo === 0) { x.beginPath(); x.ellipse(0, 0, 34, 20, 0, 0, TAU); x.moveTo(30, 0); x.lineTo(52, -16); x.lineTo(52, 16); x.closePath(); x.stroke(); x.beginPath(); x.arc(-16, -4, 3.5, 0, TAU); x.fill(); }
    else if (tipo === 1) { x.beginPath(); x.moveTo(0, -38); x.quadraticCurveTo(10, -38, 36, 20); x.quadraticCurveTo(40, 30, 28, 30); x.lineTo(-28, 30); x.quadraticCurveTo(-40, 30, -36, 20); x.quadraticCurveTo(-10, -38, 0, -38); x.stroke(); x.fillRect(-14, 10, 28, 20); }
    else if (tipo === 2) { x.beginPath(); x.moveTo(0, 30); x.bezierCurveTo(-46, 0, -26, -40, 0, -16); x.bezierCurveTo(26, -40, 46, 0, 0, 30); x.fillStyle = '#e0736a'; x.fill(); x.stroke(); }
    else if (tipo === 3) { x.beginPath(); for (let a = 0; a < 16; a += 0.2) x.lineTo(Math.cos(a) * a * 2.4, Math.sin(a) * a * 2.4); x.stroke(); }
    else {
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `600 22px "Klee One", ${FUENTE_JP}`;
      for (const [ch, px, py] of [['へ', -16, -30], ['へ', 16, -30], ['の', -16, -10], ['の', 16, -10], ['も', 0, 10], ['へ', 0, 30]]) x.fillText(ch, px, py);
      x.beginPath(); x.ellipse(0, 0, 40, 50, 0, 0.4, TAU - 0.4); x.stroke(); x.font = `600 26px "Klee One", ${FUENTE_JP}`; x.fillText('じ', 44, 0);
    }
    x.restore(); H.col = col + 2; H.tex.needsUpdate = true;
  }
  // la pata del pincel sobre (u, v) de la libreta, con la punta tocando la hoja; la otra sujeta la hoja
  plumear(F, P, k, u, v, katana) {
    F.punta = this.puntoLibreta(u, v, 0, F.punta || V3());
    P.mR.lerp(_v.copy(F.punta).add(_H.set(0.03, PUPI.fude * 0.95, 0)), k);
    if (!katana) P.mL.lerp(this.puntoLibreta(0.9, 0.35, 0.06, _v2), k);
    P.joroba += 0.03 * k; P.cab += 0.1 * k; this.miraExtra = 0;   // encorvarse más le metía la cabeza donde va la pata
  }
  // un ruidito, como mucho uno cada 0,7 s y solo si se le está viendo
  hablar(nombre) { if (!this.conVoz || this.reloj - this.vozT < 0.7 || !this.visible()) return; this.vozT = this.reloj; vozMochi(nombre); }
  celebrar() {
    // movimiento reducido: se alegra con la cara y unas chispas, sin saltar
    if (movReducido()) { this.caraGes = { nombre: 'risa', hasta: this.reloj + 0.9 }; this.quieto = 0; this.idle = null; this.chispas(0); return; }
    this.dePie = true; this.merienda = false;   // para celebrar, de pie y con las manos libres
    const S = this.S, enAire = S.y > 0.001 || S.v > 0;
    this.gesto = { tipo: 'salto', t: enAire ? 0.16 : 0, lanzado: enAire };
    if (enAire) { S.v = Math.max(S.v, this.v0() * 0.85); S.botes = 0; this.chispas(10); } // se relanza desde donde está: sin teletransportes
    else S.botes = 0;
    this.caraGes = { nombre: 'risa', hasta: this.reloj + 0.9 }; this.quieto = 0; this.idle = null; this.chispas(0); this.hablar('yaha');
  }
  // de pena se deja caer sentado (luego, él solo, se vuelve a levantar)
  apenado() { this.dePie = false; this.merienda = false; this.gesto = { tipo: 'pena', t: 0 }; this.caraGes = { nombre: 'triste', hasta: this.reloj + 2.3 }; this.quieto = 0; this.idle = null; this.nube.activa = true; this.nube.g.visible = true; this.hablar('wa'); }
  saludar() { this.dePie = true; this.gesto = { tipo: 'saludo', t: 0 }; this.caraGes = { nombre: 'feliz', hasta: this.reloj + 1.3 }; this.quieto = 0; this.idle = null; if (this.S.y <= 0.001 && !movReducido()) this.m.sq.v += 2.2; this.hablar('nyaa'); }
  // Una cara pedida con ms tiene prioridad sobre la de cualquier gesto; al caducar vuelve la del gesto o la base.
  expresion(nombre, ms) {
    if (!CARAS[nombre]) nombre = 'normal';
    if (ms) this.caraUsr = { nombre, hasta: this.reloj + ms / 1000 };
    else { this.caraBase = nombre; this.caraUsr = null; }
    this.quieto = 0; this.idle = null; this.caraIdl = null;
  }
  decorar(ids) {
    this.deco = ids == null ? null : [...ids];
    if (!this.isla || !this.prim) return Promise.resolve(); // la sala aún se está montando: preparar() decora al terminar
    const p = this.montarDeco(this.deco, (this.genDeco = (this.genDeco || 0) + 1))
      .catch((e) => console.warn('Mochi: no se pudo decorar la habitación', e)).finally(() => { if (this.decoEnCurso === p) this.decoEnCurso = null; });
    return (this.decoEnCurso = p);
  }
  // se construye en tandas cortas y fuera de la vista; lo anterior sigue puesto hasta que lo nuevo tenga sus shaders
  async montarDeco(ids, gen) {
    const lista = (ids == null ? DECO_DEFECTO : ids).filter((x) => typeof x === 'string'), set = new Set(lista), modelos = [];
    if (set.has('kyusu') || set.has('yunomi')) modelos.push('bandeja');
    if (set.has('cuaderno')) modelos.push('cuaderno'); else if (set.has('fude')) modelos.push('fude');
    for (const id of lista) if (PROPS[id] && !['kyusu', 'yunomi', 'cuaderno', 'fude', 'bandeja'].includes(id) && !modelos.includes(id)) modelos.push(id);
    const ocupados = new Set(), reservados = {};
    // primero, los que tienen un sitio elegido a mano (inventario: «Mover»); luego el resto, como siempre
    for (const id of modelos) { const q = this.sitios?.[id], def = PROPS[id]; if (q && def && huecosDe(def.cat).includes(q) && !ocupados.has(q)) { reservados[id] = q; ocupados.add(q); } }
    const asignar = (id, cat) => {
      if (reservados[id]) return reservados[id];
      const pref = PREFIERE[id]; if (pref && !ocupados.has(pref)) return pref;
      return huecosDe(cat).find((s) => !ocupados.has(s)) || null;
    };
    // si no cabe todo, primero lo más raro y, a igual rareza, lo último que ha llegado
    const llegada = (id) => (id === 'bandeja' ? Math.max(lista.indexOf('kyusu'), lista.indexOf('yunomi')) : id === 'cuaderno' ? Math.max(lista.indexOf('cuaderno'), lista.indexOf('fude')) : lista.indexOf(id));
    const rar = (id) => RAREZA[id === 'bandeja' && set.has('kyusu') ? 'kyusu' : id] || 0, orden = [...modelos].sort((a, b) => rar(b) - rar(a) || llegada(b) - llegada(a));
    const hechos = [];
    for (const [i, id] of orden.entries()) {
      if (i && i % 4 === 0) { await tarea(); if (gen !== this.genDeco || this.muerta) { hechos.forEach((p) => soltar(p.g)); return; } }
      const def = PROPS[id], g = def.crear(null, lista);
      if (def.cat !== 'pared') sombrear(g);
      if (g.userData.sinSombra) g.traverse((o) => { o.castShadow = false; });
      const slot = asignar(id, def.cat); if (slot) ocupados.add(slot);
      hechos.push({ id, def, g, slot });
    }
    const habia = this.decorado ? new Set(this.props.map((p) => p.id)) : null; this.decorado = true;
    this.retirar = [...this.props.map((p) => p.g), ...(this.retirar || [])];
    this.pops = this.pops.filter((p) => !p.prop); this.props = hechos; hechos.forEach((p) => this.mundo.add(p.g));
    const nuevos = hechos.filter((p) => habia && (!habia.has(p.id) || p.id === this.movido) && p.slot).map((p) => p.g); this.movido = null;
    const ya = () => {
      if (gen !== this.genDeco) return;
      (this.retirar || []).forEach((g) => { this.mundo.remove(g); soltar(g); }); this.retirar = null;
      nuevos.forEach((g, i) => { const s = g.scale.clone(); g.scale.copy(s).multiplyScalar(0.001); this.pops.push({ gr: g, s, prop: true, t: -0.25 - 0.14 * i }); });
      if (this.dist) this.recolocar();
    };
    const espera = this.estrenar(hechos.map((p) => p.g), ya);
    if (espera) { if (this.dist) this.recolocar(); await espera; } else ya();
  }
  // ropa: una prenda a la vez; sustituye al haori (y a lo que no le cabe) y tiñe las mangas
  ropa(id) { this.prenda = ROPA[id] ? id : null; this.vestir(); this.campos(); }
  vestir() {
    let R = this.prenda ? ROPA[this.prenda] : null; const Pz = this.piezas;
    if (R && !this.ropas[this.prenda]) { const g = R.crear(); sombrear(g); this.g.cuerpo.add(g); this.ropas[this.prenda] = g; this.estrenar([g], () => { this.vestir(); this.campos(); }); }
    if (R && this.pendientes.has(this.ropas[this.prenda])) R = null; // mientras compila, sigue vestido como estaba
    for (const [k, g] of Object.entries(this.ropas)) g.visible = !!R && k === this.prenda;
    // la bufanda se quita en cuanto lleva el haori o una prenda: debajo del cuello de la chaqueta y de la cabeza
    // quedaba en un bulto rojo que no se sabía qué era. Un accesorio y solo uno.
    if (R) for (const n of ['haori', 'bufanda', ...(R.oculta || [])]) Pz[n].grupos.forEach((gr) => { gr.visible = false; });
    else ['haori', 'bufanda', 'capa'].forEach((n) => { const v = this.lleva(n) && !(n === 'bufanda' && this.lleva('haori')); Pz[n].grupos.forEach((gr) => { gr.visible = v; }); });
    Pz.capa.u.uR0.value = R?.capa ?? 0.37;
    const M = R ? R.manga : this.lleva('haori') ? { largo: 0.5, vuelo: 0.045, puno: 0.008 } : null;
    this.g.brazos.forEach(({ u }) => {
      u.uManga.value = M ? M.largo : 0; u.uRH.value = M ? 0.112 : 0.085; u.uVuelo.value = M?.vuelo ?? 0.045; u.uPuno.value = M?.puno ?? 0.008;
      u.uConTex.value = M?.tex ? 1 : 0; if (M?.tex) { u.uTexM.value = M.tex(); u.uUM.value.set(...M.um); }
      u.uColManga.value.set(M?.col ?? 0x3aa7b8); u.uBlanco.value.set(M?.col ?? 0xfbf7ee); u.uEri.value.set(M?.eri ?? 0xfbf7ee);
    });
  }
  accesorio(id) { this.acc = ACCESORIOS.includes(id) ? id : null; this.aplicarAccesorio(); if (this.dist) this.ajustar(); }
  aplicarAccesorio() {
    if (this.acc && !this.accs[this.acc]) { const g = crearAccesorio(this.acc); this.g.cabeza.add(g); this.accs[this.acc] = g; this.estrenar([g], () => this.aplicarAccesorio()); }
    const puesto = this.acc && !this.pendientes.has(this.accs[this.acc]) ? this.acc : null; // hasta tener sus shaders no se lo pone
    for (const [k, g] of Object.entries(this.accs)) g.visible = k === puesto;
    const cubre = puesto && puesto !== 'gafas-sol';
    const kab = this.piezas.kabuto; if (kab) kab.grupos.forEach((gr) => { gr.visible = this.lleva('kabuto') && !cubre; });
    const h = this.piezas.hachimaki; if (h) h.detras.visible = !(this.lleva('kabuto') && !cubre) && !['mugiwara', 'cascos', 'kitsune-men'].includes(puesto);
    this.campos();
  }
  // campos de choque según lo que lleve puesto: la cabeza en su espacio local, el tronco en el del cuerpo
  campos() {
    const v = (k) => this.piezas[k].grupos[0].visible, acc = this.acc, kab = v('kabuto'), esf = [];
    const mh = v('hachimaki') ? 0.03 : 0, mf = acc === 'hanakanmuri' ? 0.045 : 0, mk = kab ? 0.09 : 0;
    if (kab) esf.push([0.72, 0.34, 0.45, 0.14], [-0.72, 0.34, 0.45, 0.14]);
    if (acc === 'gafas-sol') esf.push([0.36, -0.02, 0.54, 0.17], [-0.36, -0.02, 0.54, 0.17]);
    if (acc === 'cascos') esf.push([0.86, -0.08, -0.06, 0.22], [-0.86, -0.08, -0.06, 0.22]);
    if (acc === 'kitsune-men') esf.push([-0.76, 0.1, -0.36, 0.3]);
    const fC = this.g.fCabeza || fCabeza;
    this.fCab = (x, y, z) => { let d = fC(x, y, z) - 0.012 - mh * entre(0.12, 0.2, y) - mf * entre(0.28, 0.36, y) - mk * entre(0.28, 0.4, y); for (const [a, b, c, r] of esf) d = Math.min(d, Math.hypot(x - a, y - b, z - c) - r); return d; };
    const tela = this.prenda ? ROPA[this.prenda].extra : v('haori') ? extraHaori : null, bu = v('bufanda');
    this.fTro = (x, y, z) => {
      let d = fCuerpo(x, y, z) - (tela && y > 0.4 ? tela(y) : 0.012);
      if (bu) d = Math.min(d, sdToro(x, y, z, 0.83, -0.06, 0.258, 0.095), Math.hypot(x + 0.14, y - 0.75, z - 0.18) - 0.1, sdCapsula(x, y, z, [-0.13, 0.72, 0.2], [-0.13, 0.46, 0.15], 0.06));
      // el bokken NO empuja las manos: va justo donde cuelga la izquierda y, al empujarla fotograma a fotograma,
      // el brazo vibraba. Es un palito fino; que la pata lo roce no se nota.
      const C = this.colaP; if (!this.sinCola && (x > 0 || z < -0.2)) for (let i = 1; i < C.length; i++) d = Math.min(d, sdCapsula(x, y, z, C[i - 1], C[i], 0.08 - 0.017 * COLA_S[i]));
      return d;
    };
  }
  // saca la esfera (p, r) de la cabeza y del cuerpo; coordenadas del cuerpo; n = normal de salida
  limitar(p, r, n) {
    let emp = false; _H.copy(p).applyMatrix4(this.cabI);
    if (empujar(this.fCab, _H, r, n)) { p.copy(_H).applyMatrix4(this.cabM); n?.transformDirection(this.cabM); emp = true; }
    return empujar(this.fTro, p, r, n) || emp;
  }
  // objetivo de la mano: alcanzable y fuera de la cabeza y del cuerpo (proyecciones alternas)
  ajustarMano(obj, P0) {
    for (let i = 0; i < 4; i++) { _H.subVectors(obj, P0); const l = _H.length(), mx = BRAZO.L * 0.95; if (l > mx) obj.copy(P0).addScaledVector(_H, mx / l); if (!this.limitar(obj, R_MANO + 0.01)) break; }
  }
  // cuánto se mete la cola (con esa flexión) en el cuerpo o en el brazo izquierdo
  // (el brazo se mide contra los tramos de la cola, no solo contra sus puntos: entre punto y punto también se metía)
  colaChoca(a1, a2) {
    const C = colaCPU(a1, a2, this.colaV), bL = this.g.brazos[1]; let e = 0;
    this.sinCola = true;
    for (let i = 2; i < C.length; i++) { const c = C[i]; e = Math.max(e, 0.08 - 0.017 * COLA_S[i] + 0.03 - this.fTro(c.x, c.y, c.z)); }
    this.sinCola = false;
    if (bL.listo) for (const s of [0.3, 0.45, 0.6, 0.75, 0.9, 1]) {
      const p = bL.punto(s, _A1), rb = (s === 1 ? R_MANO : bL.radio(s)) + 0.03;
      for (let i = 1; i < C.length; i++) e = Math.max(e, rb + 0.08 - 0.017 * COLA_S[i] - dSeg(p, C[i - 1], C[i]));
    }
    return e;
  }
  // utilidad de prueba: cuánto se mete cada parte en la cabeza o en el cuerpo (≤ 0.012 es solo el margen)
  choques() {
    const g = this.g, R = {}, pen = (k, p, r) => {
      _H.copy(p).applyMatrix4(this.cabI);
      let dc = 9; const C = this.colaP; for (let i = 1; i < C.length; i++) dc = Math.min(dc, sdCapsula(p.x, p.y, p.z, C[i - 1], C[i], 0.08 - 0.017 * COLA_S[i]));
      this.sinCola = true; const dt = this.fTro(p.x, p.y, p.z); this.sinCola = false;
      for (const [z, v] of [['cabeza', r - this.fCab(_H.x, _H.y, _H.z)], ['cuerpo', r - dt], ['cola', r - dc]]) R[k + '·' + z] = Math.max(R[k + '·' + z] ?? 0, v);
    };
    g.brazos.forEach((b, i) => {
      const k = i ? 'L' : 'R'; pen('mano' + k, b.P2, R_MANO);
      for (const s of [0.5, 0.65, 0.8, 0.95]) pen('brazo' + k, b.punto(s, _O), b.radio(s));
    });
    if (g.onigiri.visible) pen('onigiri', g.anclaR.position, R_ONI);
    if (this.lleva('katana')) for (const s of [0.35, 0.7, 1.05, 1.32]) pen('katana', _O.copy(g.brazos[1].P2).addScaledVector(this.kat, s), 0.03);
    return R;
  }
  destruir() {
    if (this.muerta) return;
    this.muerta = true; cancelAnimationFrame(this.raf); this.raf = 0; this.bocadillo?.remove(); removeEventListener('pointermove', this.alMover); this.obs?.disconnect(); this.io?.disconnect(); this.mo?.disconnect();
    // con shaders aún compilándose, three sigue consultándolos: la GPU se libera cuando terminan
    if (this.enCurso.size) Promise.race([Promise.allSettled([...this.enCurso]), new Promise((ok) => setTimeout(ok, 20000))]).then(() => this.liberar());
    else this.liberar();
  }
  liberar() {
    const mats = new Set(this.calentados), geos = new Set(), texs = new Set();
    const recoger = (raiz) => raiz.traverse((o) => {
      if (o.geometry && !o.geometry.userData.compartida) geos.add(o.geometry);
      for (const m of [o.material, o.customDepthMaterial].flat()) if (m) mats.add(m);
    });
    recoger(this.escena); Object.values(this.accs).forEach(recoger);
    for (const m of mats) {
      for (const v of Object.values(m)) if (v && v.isTexture && !v.userData.compartida) texs.add(v);
      for (const x of Object.values(m.userData?.u || {})) if (x.value?.isTexture && !x.value.userData.compartida) texs.add(x.value);
      m.dispose();
    }
    geos.forEach((g) => g.dispose()); texs.forEach((t) => t.dispose());
    this.g.cara?.tex?.dispose(); this.envRT?.dispose(); this.post?.dispose(); this.rtSombra?.dispose();
    if (this.render) { this.render.renderLists?.dispose(); this.render.dispose(); this.render.forceContextLoss(); }
  }
  // utilidades de prueba: congelar el tiempo, avanzar a mano y dibujar al momento
  congelar(si = true) { this.congelado = !!si; }
  avanzar(seg) { let r = seg; while (r > 1e-6) { const d = Math.min(1 / 60, r); this.paso(d); r -= d; } }
  renderizar() { formasYa(); this.crearRender(); this.crearEntorno(); if (!this.sinTamano) this.dibujarFotograma(); }

  // ─── símbolos, chispas y confeti ───
  alCambiarCara(nombre) {
    this.manpus.forEach((m) => { if (m.fijo) m.fin = true; });
    for (const [tipo, p, o] of MANPU_DE[nombre] || []) this.lanzarManpu(tipo, p, o);
  }
  matManpu(tipo) {
    return (this.matsManpu[tipo] ||= tipo === 'burbuja'
      ? new THREE.MeshPhysicalMaterial({ color: MANPU_COL.burbuja, transparent: true, opacity: 0.5, roughness: 0.04, clearcoat: 1, depthWrite: false })
      : vinilo(MANPU_COL[tipo] ?? 0xffffff, { rug: 0.3, cc: 0.85, ccr: 0.12 }));
  }
  lanzarManpu(tipo, p, o = {}) {
    const m = new THREE.Mesh(geoManpu(tipo), this.matManpu(tipo)); m.scale.setScalar(0.001); m.position.set(...p); this.g.manpu.add(m);
    this.manpus.push({ m, t: -(o.retraso || 0), vida: o.vida ?? 1.4, escala: o.escala ?? 0.28, base: V3(...p), ...o });
  }
  chispas(extra = 0) {
    const d = this.confeti.datos, rr = Math.random, n = 36 + extra, alto = this.asiento + this.S.y + 2.8;
    for (let i = 0; i < n && d.length < 90; i++) {
      const a = rr() * TAU, sale = 1.4 + rr() * 2.2;
      d.push({ p: V3(Math.cos(a) * 0.95, alto + rr() * 0.45, Math.sin(a) * 0.55 - 0.35), v: V3(Math.cos(a) * sale, 2.6 + rr() * 2.8, Math.sin(a) * sale * 0.55), r: V3(rr() * 6, rr() * 6, rr() * 6), w: V3(rr() * 12 - 6, rr() * 12 - 6, rr() * 12 - 6), t: 0 });
    }
  }
  v0() { return this.compacta ? 3.6 : this.isla ? 5.2 : 4.4; }

  // ─── bucle ───
  bucle(ms) {
    this.raf = 0;
    if (this.muerta || !this.visible()) { this.callar(true); return; } // oculto: se para (ResizeObserver, IntersectionObserver y la clase de la vista lo despiertan)
    this.raf = requestAnimationFrame(this.bucle);
    if (this.ligera?.fps && this.ult != null && ms - this.ult < 1000 / this.ligera.fps - 4) return; // tope de fotogramas (batería)
    const int = this.ult == null ? 0 : ms - this.ult, dt = Math.min(0.05, int / 1000); this.ult = ms;
    const t0 = performance.now();
    if (!this.congelado) this.paso(dt);
    this.dibujarFotograma();
    const c = performance.now() - t0; this.stats.cpu = this.stats.fotogramas++ ? this.stats.cpu * 0.95 + c * 0.05 : c;
    if (this.stats.fotogramas === 1 && this.isla && !movReducido()) this.lienzo.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.2,.7,.2,1)' });
    if (this.post) this.ritmo(int, ms);
  }
  // calidad adaptativa: tandas de 3 s (sin contar tirones > 100 ms); con dos seguidas de p95 > 20 ms y media > 17 ms, baja un escalón
  ritmo(int, ms) {
    const R = (this.rit ||= { t0: ms + 2500, d: [], mal: 0 });
    if (ms < R.t0 || int <= 0 || int > 100) return;
    R.d.push(int);
    if (ms - R.t0 < 3000) return;
    const d = R.d.sort((a, b) => a - b), p95 = d[Math.floor(d.length * 0.95)], media = d.reduce((a, b) => a + b, 0) / d.length;
    R.d = []; R.t0 = ms; R.mal = p95 > 20 && media > 17 ? R.mal + 1 : 0;
    if (R.mal >= 2 && this.calidad < CALIDAD.length - 1) {
      this.calidad++; this.ajustar(); R.mal = 0; R.t0 = ms + 1200;
      try { localStorage.setItem(CLAVE_CALIDAD, JSON.stringify({ n: this.calidad, t: Date.now() })); } catch {}
    }
  }
  dibujarFotograma() {
    // la sombra del foco de la sala se redibuja un fotograma sí y otro no
    if (this.isla) { const sm = this.render.shadowMap; sm.autoUpdate = false; sm.needsUpdate = this.congelado || (this.stats.fotogramas & 1) === 0 || !this.foco.shadow.map; }
    if (this.post) this.post.dibujar(this.render, this.escena, this.camara, this.reloj);
    else this.render.render(this.escena, this.camara);
  }

  // ─── cara: prioridad usuario > gesto > idle > base, con transición (cierra ojos, squash, pop) ───
  resolverCara(t, dt) {
    const vivo = (c) => c && t < c.hasta;
    if (!vivo(this.caraUsr)) this.caraUsr = null;
    if (!vivo(this.caraGes)) this.caraGes = null;
    if (!vivo(this.caraIdl)) this.caraIdl = null;
    const objetivo = (this.caraUsr || this.caraGes || this.caraIdl)?.nombre || this.caraBase;
    if (objetivo !== this.destino) { this.destino = objetivo; this.trans = { t: 0, hecho: false }; this.m.cabSq.v -= objetivo === 'sorpresa' ? 4.8 : 3.0; this.m.sq.v += 0.9; }
    let abre = 1;
    if (this.trans) {
      const T = this.trans; T.t += dt; const k = T.t / 0.17;
      if (k < 0.45) abre = 1 - k / 0.45;
      else { if (!T.hecho) { T.hecho = true; this.cara = this.destino; this.m.pop.x = 0.66; this.m.pop.v = 0; this.alCambiarCara(this.cara); } abre = Math.min(1, (k - 0.45) / 0.55); }
      if (k >= 1) this.trans = null;
    }
    const def = CARAS[this.cara];
    this.parp -= dt;
    if (this.parp < 0) { this.parpT = 1e-3; this.parp = this.doble ? 0.12 : 2 + Math.random() * 3.4; this.doble = !this.doble && Math.random() < 0.22; }
    if (this.parpT > 0) { this.parpT += dt; const k = this.parpT / 0.15; if (def.parpadea) abre = Math.min(abre, k < 0.5 ? 1 - k * 2 : (k - 0.5) * 2); if (k >= 1) this.parpT = 0; }
    this.abre = Math.round(abre * 8) / 8;
  }

  // ─── lenguaje corporal de cada cara ───
  poseCara(P, t, katana) {
    const L = !katana; // la pata izquierda solo participa si no sostiene la katana
    switch (this.cara) {
      case 'feliz': P.y += Math.abs(Math.sin(t * 5)) * 0.02; P.incl += Math.sin(t * 2.5) * 0.05; P.mR.set(-0.84, 1.2, 0.3); if (L) { P.mL.set(0.56, 0.74, 0.3); P.cL.set(1, -0.6, -0.2); } P.colaVel = 1.5; break;
      case 'risa': P.incl += Math.sin(t * 17) * 0.06; P.y += Math.abs(Math.sin(t * 8.5)) * 0.03; P.mR.set(-0.24, 0.6, 0.44); P.cR.set(-1, -0.4, 0); if (L) { P.mL.set(0.24, 0.6, 0.44); P.cL.set(1, -0.4, 0); } P.cab -= 0.06; P.colaVel = 2.2; break;
      case 'estrella': P.y += Math.abs(Math.sin(t * 6)) * 0.025; P.mR.set(-0.34, 0.68, 0.44); P.cR.set(-1, -0.7, 0); if (L) { P.mL.set(0.34, 0.68, 0.44); P.cL.set(1, -0.7, 0); } P.or[0] -= 0.1; P.or[1] -= 0.1; P.cab -= 0.05; P.colaVel = 1.8; break;
      case 'sorpresa': P.mR.set(-0.72, 1.08, 0.32); P.cR.set(-1, -0.7, -0.2); if (L) { P.mL.set(0.72, 1.08, 0.32); P.cL.set(1, -0.7, -0.2); } P.cab -= 0.06; P.sq += 0.03; break;
      case 'triste': P.cab += 0.14; P.sq -= 0.04; P.mR.set(-0.16, 0.56, 0.38); P.cR.set(-1, -0.4, 0); if (L) { P.mL.set(0.16, 0.56, 0.38); P.cL.set(1, -0.4, 0); } P.mR.x += Math.sin(t * 7) * 0.01; P.colaAmp = 0.25; break;
      case 'sueno': P.incl += Math.sin(t * 0.9) * 0.13; P.cab += 0.13 + Math.sin(t * 0.9) * 0.05; P.mR.set(-0.38, 0.46, 0.34); P.cR.set(-1, 0, -0.3); P.sq += Math.sin(t * 1.1) * 0.02; P.colaAmp = 0.35; P.colaVel = 0.5; break;
      case 'guino': P.mR.set(-0.74, 1.36, 0.3); P.cR.set(-1, -0.7, 0.1); P.incl -= 0.1; break;
      case 'decidido': { const b = Math.max(0, Math.sin(t * 7)) * 0.05; P.mR.set(-0.32, 0.66 + b, 0.44); P.cR.set(-1, -0.8, -0.2); if (L) { P.mL.set(0.32, 0.66 + b, 0.44); P.cL.set(1, -0.8, -0.2); } P.cab += 0.05; P.sq += 0.02; break; }
      case 'enfado': P.incl += Math.sin(t * 38) * 0.016; P.fl[0] += 0.25; P.fl[1] += 0.25; P.mR.set(-0.52, 0.86 + Math.sin(t * 20) * 0.02, 0.24); P.cR.set(-1, -0.6, -0.2); if (L) { P.mL.set(0.52, 0.86 - Math.sin(t * 20) * 0.02, 0.24); P.cL.set(1, -0.6, -0.2); } P.colaVel = 3; P.colaAmp = 1.6; break;
      case 'verguenza': P.yaw -= 0.28; P.cab += 0.12; P.mR.set(-0.12, 0.6 + Math.sin(t * 8) * 0.015, 0.42); P.cR.set(-1, -0.5, 0); if (L) { P.mL.set(0.12, 0.6 - Math.sin(t * 8) * 0.015, 0.42); P.cL.set(1, -0.5, 0); } break;
      case 'mareo': P.incl += Math.sin(t * 3) * 0.12; P.cab += Math.cos(t * 3) * 0.07; P.yaw += Math.sin(t * 1.5) * 0.1; P.mR.set(-0.52, 0.58 + Math.sin(t * 3) * 0.05, 0.3); if (L) P.mL.set(0.5, 0.56 - Math.sin(t * 3) * 0.05, 0.3); break;
      case 'amor': P.incl += Math.sin(t * 2) * 0.09; P.mR.set(-0.15, 0.62, 0.44); P.cR.set(-1, -0.5, 0); if (L) { P.mL.set(0.15, 0.62, 0.44); P.cL.set(1, -0.5, 0); } P.y += Math.abs(Math.sin(t * 4.2)) * 0.022; break;
      case 'presumido': P.incl += 0.1; P.cab -= 0.07; P.mR.set(-0.5, 0.52, 0.07); P.cR.set(-1, 0.3, -0.35); if (L) { P.mL.set(0.5, 0.52, 0.07); P.cL.set(1, 0.3, -0.35); } break;
      case 'llanto': P.mR.set(-0.96 + Math.sin(t * 12) * 0.08, 1.2 + Math.cos(t * 12) * 0.07, 0.3); P.cR.set(-1, -0.5, 0); if (L) { P.mL.set(0.96 - Math.sin(t * 12) * 0.08, 1.2 - Math.cos(t * 12) * 0.07, 0.3); P.cL.set(1, -0.5, 0); } P.y += Math.abs(Math.sin(t * 10)) * 0.018; break;
      case 'nom': P.mR.set(-0.08, 0.97, 0.66); P.cR.set(-1, -0.6, 0.2); if (L) { P.mL.set(0.14, 0.84, 0.56); P.cL.set(1, -0.6, 0); } P.cab += Math.sin(t * 11) * 0.02; break;
      case 'pensando': P.incl += 0.13; P.yaw += 0.08; if (L) { P.mL.set(0.1, 0.95, 0.62); P.cL.set(1, -0.7, 0); } else { P.mR.set(-0.1, 0.95, 0.62); P.cR.set(-1, -0.7, 0); } break;
      // chulito: se echa para atrás (endereza la joroba) con las manos en la cintura
      case 'doya': P.joroba -= 0.16; P.cab -= 0.07; P.incl += 0.06; P.mR.set(-0.5, 0.52, 0.07); P.cR.set(-1, 0.3, -0.35); if (L) { P.mL.set(0.5, 0.52, 0.07); P.cL.set(1, 0.3, -0.35); } break;
      // bobo: la cabeza ladeada que se bambolea, los bracitos colgando sin fuerza y una oreja caída
      case 'bobo': P.incl += 0.17 + Math.sin(t * 1.7) * 0.06; P.cab += 0.05; P.joroba += 0.06; P.mR.set(-0.42, 0.26 + Math.sin(t * 3) * 0.04, 0.2); P.cR.set(-1, -0.2, 0.1); if (L) { P.mL.set(0.42, 0.26 - Math.sin(t * 3) * 0.04, 0.2); P.cL.set(1, -0.2, 0.1); } P.or[0] += 0.3; P.colaVel = 0.6; break;
      // vago: repantingado, todo cuelga; hasta la cola se mueve con desgana
      case 'vago': P.joroba += 0.15; P.cab += 0.1; P.sq -= 0.03; P.mR.set(-0.4, 0.3, 0.26); P.cR.set(-1, -0.3, 0.2); if (L) { P.mL.set(0.4, 0.3, 0.26); P.cL.set(1, -0.3, 0.2); } P.colaAmp = 0.3; P.colaVel = 0.4; break;
      case 'aburrido': P.cab += 0.03; P.colaAmp = 0.45; P.colaVel = 0.5; break;
      // pánico: las manitas a la cara y temblando entero
      // las patas a los lados de la cara, como El grito (delante de la boca no llegaban: se quedaban atascadas en la
      // barriga y el brazo parecía salir disparado hacia delante)
      case 'panico': P.incl += Math.sin(t * 40) * 0.03; P.sq -= 0.04; P.mR.set(-0.56, 1.06, 0.26); P.cR.set(-1, -0.8, -0.1); if (L) { P.mL.set(0.56, 1.06, 0.26); P.cL.set(1, -0.8, -0.1); } P.colaAmp = 2.4; P.colaVel = 3.2; break;
      case 'bleh': P.incl -= 0.12; P.cab -= 0.04; P.mR.set(-0.62, 1.2 + Math.sin(t * 10) * 0.05, 0.3); P.cR.set(-1, -0.7, 0.1); P.colaVel = 1.8; break;
      default: break;
    }
    const animo = ANIMO_OREJAS[this.cara] || 0; P.or[0] += animo; P.or[1] += animo;
  }

  // ─── gestos (sobre muelles) ───
  poseGesto(P, dt, katana) {
    const G = this.gesto, S = this.S; G.t += dt; const u = G.t;
    if (G.tipo === 'salto') {
      if (u < 0.16 && !G.lanzado) { P.anticipa = -0.18; P.mR.set(-0.44, 0.42, -0.08); if (!katana) P.mL.set(0.44, 0.42, -0.08); }
      else {
        if (!G.lanzado) { G.lanzado = true; S.v = this.v0(); this.m.sq.obj = 0; this.m.sq.v += 2.6; this.chispas(20); }
        const sube = S.y > 0.001 || S.v > 0, w = Math.sin(u * 16) * 0.06;
        if (sube) { P.mR.set(-0.56, 1.5 + w, 0.14); P.cR.set(-1, -0.3, 0); if (katana) { P.mL.set(0.74, 1.3, 0.14); P.cL.set(1, -0.5, -0.2); P.kat.set(0.95, 1, 0.05); } else { P.mL.set(0.56, 1.5 - w, 0.14); P.cL.set(1, -0.3, 0); } P.or[0] -= 0.2; P.or[1] -= 0.2; P.colaAmp = 2; P.colaVel = 2.4; }
        else { P.mR.set(-0.6, 1.0, 0.24); if (!katana) P.mL.set(0.6, 1.0, 0.24); }
        if (!G.estrella && S.botes >= 1) { G.estrella = true; this.caraGes = { nombre: 'estrella', hasta: this.reloj + 1.1 }; }
        if (S.botes >= 2 && S.y <= 0 && u > 0.5) G.fin = (G.fin || 0) + dt;
        if (G.fin > 0.3 || u > 3) this.gesto = null;
      }
    } else if (G.tipo === 'pena') {
      const env = entre(0, 0.25, u) * (1 - entre(2.0, 2.35, u));
      P.sq -= 0.08 * env; P.cab += 0.2 * env; P.or[0] += 0.4 * env; P.or[1] += 0.4 * env; P.colaAmp *= 1 - 0.8 * env;
      P.mR.lerp(_v.set(-0.3, 0.5, 0.32), env); if (!katana) P.mL.lerp(_v.set(0.3, 0.5, 0.32), env);
      P.incl += Math.sin(u * 9) * 0.04 * Math.max(0, 1 - u * 2);
      if (u > 2.05) this.nube.activa = false;
      if (u > 2.35) this.gesto = null;
    } else if (G.tipo === 'saludo') {
      const env = entre(0, 0.2, u) * (1 - entre(1.6, 1.9, u)), w = Math.sin(u * 15);
      if (u < 0.32) P.y += Math.sin((u / 0.32) * Math.PI) * 0.1;
      P.mR.lerp(_v.set(-0.9 + w * 0.08, 1.46 + Math.abs(w) * 0.03, 0.32), env); P.cR.lerp(_v2.set(-1, -0.9, 0), env);
      P.incl += 0.12 * env; P.fl[0] += (0.1 + w * 0.06) * env;
      if (u > 1.25 && !G.guino) { G.guino = true; this.caraGes = { nombre: 'guino', hasta: this.reloj + 0.75 }; }
      if (u > 1.9) this.gesto = null;
    } else if (G.tipo === 'equipo') {
      if (u < 0.12) P.anticipa = -0.12;
      else if (!G.lanzado) { G.lanzado = true; S.v = this.v0() * 0.78; this.m.sq.v += 2; }
      const env = entre(0, 0.15, u) * (1 - entre(0.9, 1.15, u));
      P.mR.lerp(_v.set(-0.58, 1.36, 0.16), env); if (katana) { P.mL.lerp(_v.set(0.74, 1.24, 0.14), env); P.kat.lerp(_v2.set(0.9, 1, 0.05), env); } else P.mL.lerp(_v.set(0.58, 1.36, 0.16), env);
      if (u > 1.2) this.gesto = null;
    }
  }
  // ─── lo que hace cuando no pasa nada ───
  // SIEMPRE está haciendo algo contigo. Antes esperaba 11 s quieto para hacer un gesto, y cada
  // reacción de la app dejaba el siguiente programado para mucho más tarde: podía pasarse medio minuto como
  // una figura de resina. Ahora elige algo cada pocos segundos, y la mitad de las veces es MOVERSE.
  // Y hay torpeza a propósito (tropezar, intentar decir una palabra y que le salga mal): es el amiguito que
  // quiere ayudarte y al final es más torpe que tú.
  // Y es un VAGO: se sienta a menudo «porque está cansado» (suspira, se deja caer, se repantinga,
  // bosteza) y le cuesta levantarse. Y pone caras tontas: chulito, bobo, «ー ー».
  empezarIdle(t) {
    const tabla = this.pupitre
      ? (this.dePie ? [['sentarse', 1]] : [['garabato', 1.2], ['dormirse', 0.8], ['bostezo', 0.9], ['vaguear', 1], ['mirar', 0.9], ['ladeo', 0.7], ['practicar', 0.8], ['bobo', 0.5], ['aburrido', 0.5]])
      : this.dePie
      ? [['pasear', 2.6], ['girarse', 1.6], ['saltito', 1], ['brinco', 0.7], ['estirar', 0.7], ['ladeo', 0.8], ['mirar', 0.7],
        ['sentarse', 1.7], ['tropiezo', 0.7], ['bailar', 0.7], ['practicar', 1.1], ['cola', 0.3], ['chulito', 0.9], ['bobo', 0.8], ['aburrido', 0.6]]
      : [['levantarse', 1.7], ['merienda', 1.1], ['estirar', 0.5], ['ladeo', 0.6], ['mirar', 0.6], ['bostezo', 1.1], ['practicar', 0.6],
        ['vaguear', 1.5], ['aburrido', 0.7], ['bobo', 0.4]];
    if (this.giroManual != null) for (let i = tabla.length - 1; i >= 0; i--) if (['pasear', 'girarse'].includes(tabla[i][0])) tabla.splice(i, 1);
    let r = Math.random() * tabla.reduce((a, [, w]) => a + w, 0), tipo = tabla[0][0];
    for (const [n, w] of tabla) { if ((r -= w) < 0) { tipo = n; break; } }
    const F = (this.idle = { tipo, t: 0, dir: Math.random() < 0.5 ? -1 : 1 });
    // en la portada, con más calma; en las demás vistas, como antes
    // en el pupitre, si se ha levantado (a celebrar) vuelve enseguida a sentarse
    this.proxIdle = this.quieto + (this.pupitre ? (this.dePie ? 0.8 : 4 + Math.random() * 4) : this.isla ? 5 + Math.random() * 5 : 2.2 + Math.random() * 3);
    const cara = (nombre, s) => { this.caraIdl = { nombre, hasta: this.reloj + s }; };
    if (tipo === 'pasear') {
      const [lo, hi] = this.rangoPaseo();
      let x = this.posX + F.dir * (0.35 + Math.random() * 0.5) * (hi - lo) * 0.6;
      if (x < lo || x > hi) x = this.posX - F.dir * (0.35 + Math.random() * 0.5) * (hi - lo) * 0.6;
      this.posObj = cl(x, lo, hi); if (Math.random() < 0.15) cara('feliz', 1.4);
    } else if (tipo === 'girarse') { this.giroObj = this.giroFrente + F.dir * (0.7 + Math.random() * 0.5); cara(Math.random() < 0.5 ? 'pensando' : 'sorpresa', 1.4); if (Math.random() < 0.5) this.hablar('hm'); }
    // «estoy cansado»: suspira, se le cae todo y se deja caer sentado (lo hace poseIdle)
    else if (tipo === 'sentarse') { this.giroObj = this.giroFrente; cara('vago', 1.1); this.hablar('hafu'); }
    // levantarse le cuesta: primero «ー ー», y luego se lanza de golpe
    else if (tipo === 'levantarse') { cara('aburrido', 0.8); }
    else if (tipo === 'brinco') { cara(Math.random() < 0.5 ? 'risa' : 'estrella', 1.3); }
    else if (tipo === 'saltito') { this.hablar('pi'); }
    else if (tipo === 'bailar') { cara('risa', 2.4); this.hablar('ya'); this.lanzarManpu('nota', [0.9, 0.55, 0.3], { vida: 1.6 }); this.lanzarManpu('nota', [-0.95, 0.4, 0.3], { vida: 1.5, retraso: 0.6 }); }
    else if (tipo === 'merienda') { this.merienda = true; cara('nom', 2.6); }
    else if (tipo === 'bostezo') { cara('sueno', 2); this.hablar('fua'); }
    else if (tipo === 'chulito') { cara('doya', 2.2); this.hablar('fun'); this.lanzarManpu('brillo', [0.85, 0.75, 0.3], { vida: 1, retraso: 0.3 }); }
    else if (tipo === 'bobo') { cara('bobo', 2.2); if (Math.random() < 0.6) this.hablar('eh'); }
    else if (tipo === 'aburrido') { cara('aburrido', 2.4); this.giroObj = this.giroFrente; }
    else if (tipo === 'vaguear') { cara('vago', 3.2); this.hablar('hafu'); this.lanzarManpu('z', [0.75, 0.75, 0.3], { vida: 1.6, retraso: 1 }); }
  }
  // en la portada la carta ocupa la derecha: con el encuadre corrido, pasea sobre todo hacia la izquierda
  rangoPaseo() { return this.isla ? (this.desvio > 0.02 ? [-0.95, 0.5] : [-0.35, 0.95]) : this.compacta ? [-0.25, 0.25] : [-0.4, 0.4]; }
  poseIdle(P, dt, katana) {
    const F = this.idle; F.t += dt; const u = F.t, fin = () => { this.idle = null; };
    const env = (a, b) => entre(0, a, u) * (1 - entre(b - a, b, u));
    switch (F.tipo) {
      case 'estirar': {
        const k = Math.sin(c01(u / 1.7) * Math.PI);
        P.mR.lerp(_v.set(-0.3, 1.62, 0.02), k); if (!katana) P.mL.lerp(_v.set(0.3, 1.62, 0.02), k); else P.kat.lerp(_v.set(0.8, 1, 0), k);
        P.sq += 0.1 * k; P.cab -= 0.16 * k; P.pitch -= 0.08 * k; P.or[0] -= 0.14 * k; P.or[1] -= 0.14 * k;
        if (!F.cara && u > 0.25) { F.cara = true; this.caraIdl = { nombre: 'feliz', hasta: this.reloj + 1.1 }; }
        if (u > 1.7) fin(); break;
      }
      case 'saltito': if (!F.ya) { F.ya = true; if (this.S.y <= 0.001) this.S.v = this.v0() * 0.5; } if (u > 0.9) fin(); break;
      case 'brinco': {
        if (u < 0.18) P.anticipa = -0.2;
        else if (!F.ya) { F.ya = true; if (this.S.y <= 0.001) this.S.v = this.v0() * 0.95; this.m.sq.v += 2.6; this.lanzarManpu('brillo', [0.95, 0.7, 0.35], { vida: 1.1 }); this.hablar('yaha'); }
        if (u > 0.18 && this.S.y > 0.001) { P.mR.set(-0.5, 1.55, 0.12); if (!katana) P.mL.set(0.5, 1.55, 0.12); P.or[0] -= 0.25; P.or[1] -= 0.25; P.colaAmp = 2.4; P.colaVel = 2.5; }
        if (u > 1.6) fin(); break;
      }
      case 'ladeo': P.incl += 0.28 * F.dir * Math.sin(c01(u / 1.6) * Math.PI); if (!F.cara) { F.cara = true; this.caraIdl = { nombre: 'pensando', hasta: this.reloj + 1.5 }; } if (u > 1.6) fin(); break;
      case 'mirar': { const k = Math.sin(c01(u / 2.2) * Math.PI); P.yaw += 0.55 * F.dir * k; this.miraExtra = 0.7 * F.dir * k; if (u > 2.2) { fin(); this.miraExtra = 0; } break; }
      case 'pasear': if (Math.abs(this.posObj - this.posX) < 0.02 || u > 4) { this.giroObj = this.giroFrente + (Math.random() - 0.5) * 0.4; fin(); } break;
      case 'girarse': { const k = env(0.3, 2.2); this.miraExtra = 0.5 * F.dir * k; if (u > 2.2) { this.miraExtra = 0; this.giroObj = this.giroFrente + (Math.random() - 0.5) * 0.3; fin(); } break; }
      case 'sentarse': {
        // se le caen los hombros y la cabeza… y ¡plof!, sentado
        const k = entre(0, 0.45, u);
        P.joroba += 0.14 * k; P.sq -= 0.05 * k; P.cab += 0.08 * k; P.mR.lerp(_v.set(-0.4, 0.3, 0.24), k); if (!katana) P.mL.lerp(_v2.set(0.4, 0.3, 0.24), k);
        if (u > 0.55 && !F.ya) { F.ya = true; this.dePie = false; }
        if (u > 0.95 && !F.ya2) { F.ya2 = true; this.m.sq.v -= 1.4; this.caraIdl = { nombre: Math.random() < 0.5 ? 'vago' : 'aburrido', hasta: this.reloj + 1.6 }; }
        if (u > 2.2) fin(); break;
      }
      case 'levantarse': {
        if (u > 0.75 && !F.ya) { F.ya = true; this.dePie = true; if (this.S.y <= 0.001) this.S.v = this.v0() * 0.36; this.caraIdl = { nombre: 'decidido', hasta: this.reloj + 0.9 }; this.hablar('ura'); }
        if (u > 1.8) fin(); break;
      }
      case 'vaguear': {
        // repantingado: la cabeza se le va de un lado a otro, como quien se duerme en el tren
        const k = env(0.4, 3.2);
        P.joroba += 0.1 * k; P.incl += Math.sin(u * 1.4) * 0.14 * k; P.cab += 0.08 * k; P.colaAmp = 0.3;
        if (u > 3.2) fin(); break;
      }
      case 'chulito': case 'aburrido': if (u > 2.3) fin(); break;
      case 'atender': {
        // se gira hacia la carta, da un pasito hacia ella y reacciona; luego vuelve a mirarte
        if (!F.ya) {
          F.ya = true; this.giroObj = this.giroFrente + 0.75;
          const [, hi] = this.rangoPaseo(); this.posObj = Math.min(hi, Math.max(this.posX, hi - 0.35));
          if (F.cara) this.caraIdl = { nombre: F.cara, hasta: this.reloj + 1.5 };
          if (F.voz && this.reloj - (this.vozAtender || -9) > 1.6) { this.vozAtender = this.reloj; this.hablar(F.voz); }
          if (F.salta && this.dePie && this.S.y <= 0.001) this.S.v = this.v0() * 0.42;
          if (F.manpu) this.lanzarManpu(F.manpu, [0.85, 0.72, 0.3], { vida: 1.1 });
        }
        // señala la carta con la pata libre
        const k = env(0.25, 1.5);
        if (!katana) { P.mL.lerp(_v.set(0.72, 1.12, 0.3), k); P.cL.lerp(_v2.set(1, -0.4, 0.2), k); }
        P.incl -= 0.08 * k; this.miraExtra = 0.55 * k;
        if (u > 1.6) { this.miraExtra = 0; this.giroObj = this.giroFrente; fin(); }
        break;
      }
      case 'bobo': { P.yaw += Math.sin(u * 2.3) * 0.12; if (u > 2.2) fin(); break; }
      case 'tropiezo': {
        // se le enreda una pata, se va hacia delante agitando los brazos y se recompone avergonzado
        if (!F.ya) { F.ya = true; this.caraIdl = { nombre: Math.random() < 0.5 ? 'sorpresa' : 'panico', hasta: this.reloj + 0.7 }; this.lanzarManpu('excl', [0.75, 0.75, 0.3], { vida: 0.9 }); this.hablar('wa'); }
        const k = u < 0.22 ? u / 0.22 : Math.max(0, 1 - (u - 0.22) / 0.55);
        P.pitch += 0.42 * k * (1 + Math.sin(u * 30) * 0.1 * k); this.zancadaExtra = -0.7 * k;
        const ag = Math.sin(u * 26) * k;
        P.mR.set(-0.72, 1.05 + ag * 0.15, -0.1); if (!katana) P.mL.set(0.72, 1.05 - ag * 0.15, -0.1);
        if (u > 0.75 && !F.ya2) { F.ya2 = true; this.caraIdl = { nombre: ['verguenza', 'bobo', 'bleh'][Math.floor(Math.random() * 3)], hasta: this.reloj + 1.2 }; this.lanzarManpu('gota', [0.7, 0.55, 0.25], { vida: 1.2 }); }
        if (u > 1.9) { this.zancadaExtra = 0; fin(); } break;
      }
      case 'bailar': {
        const k = env(0.2, 2.4), w = Math.sin(u * 9);
        P.incl += w * 0.2 * k; P.y += Math.abs(Math.sin(u * 9)) * 0.06 * k; this.zancadaExtra = w * 0.35 * k;
        P.mR.lerp(_v.set(-0.6, 1.2 + w * 0.25, 0.25), k); if (!katana) P.mL.lerp(_v2.set(0.6, 1.2 - w * 0.25, 0.25), k);
        if (u > 2.4) { this.zancadaExtra = 0; fin(); } break;
      }
      case 'practicar': {
        // EL ANHELO: intenta repetir lo que estudias… y le sale mal
        if (u < 1.1) { if (!F.a) { F.a = true; this.caraIdl = { nombre: 'pensando', hasta: this.reloj + 1.1 }; } }
        else if (u < 1.6) { if (!F.b) { F.b = true; this.caraIdl = { nombre: 'decidido', hasta: this.reloj + 0.5 }; this.m.sq.v += 1.6; } }
        else if (!F.c) { F.c = true; this.caraIdl = { nombre: ['sorpresa', 'verguenza', 'bobo', 'bleh'][Math.floor(Math.random() * 4)], hasta: this.reloj + 1.1 }; this.lanzarManpu('pregunta', [0.8, 0.7, 0.3], { vida: 1.3 }); this.hablar('nya'); }
        if (u > 1.6) { P.incl -= 0.14 * F.dir * env(0.2, 1.1); }
        if (u > 2.8) fin(); break;
      }
      case 'merienda': if (u > 0.9 && !F.ya) { F.ya = true; this.hablar('mm'); } if (u > 2.8) { this.merienda = false; this.caraIdl = { nombre: 'feliz', hasta: this.reloj + 1 }; this.lanzarManpu('corazon', [0.8, 0.6, 0.3], { vida: 1.1 }); fin(); } break;
      // bostezo con desperezo: los brazos abiertos a la altura de los hombros, por debajo del borde de la cabeza. A la
      // cara no llegan (la cabeza es más ancha de lo que alcanza el brazo): el objetivo de antes caía dentro de ella, y
      // bajo la barbilla la pata quedaba encajada entre cabeza y pecho; en los dos casos zumbaba
      case 'bostezo': { const k = env(0.3, 2); P.mR.lerp(_v.set(-0.7, 0.8, 0.2), k); if (!katana) P.mL.lerp(_v2.set(0.7, 0.8, 0.2), k); P.cab -= 0.12 * k; if (u > 2) fin(); break; }
      case 'escribir': {
        // encorvado sobre la libreta y con la lengua fuera: una letra cada 0,32 s, con el pincel en la celda que toca
        const n = F.lista.length, dur = 0.75 + n * 0.32 + 0.45, k = env(0.3, dur);
        if (u > 0.3 && !F.cara) { F.cara = true; this.caraIdl = { nombre: Math.random() < 0.75 ? 'bleh' : 'pensando', hasta: this.reloj + dur - 0.9 }; }
        while (F.hechas < n && u > 0.75 + F.hechas * 0.32) this.escribirLetra(F);
        const H = this.pupi.hoja, col = Math.min(F.col ?? H.col, PUPI.cols - 1), [cx, cy] = celdaHoja(col, Math.min(F.fila ?? 0, PUPI.filas - 1)), w = u * 14;
        this.plumear(F, P, k, cx / 512 + Math.sin(w) * 0.014, cy / 320 + Math.cos(w * 0.7) * 0.025, katana);
        if (u > dur) { this.acabarApunte(); this.caraIdl = { nombre: Math.random() < 0.5 ? 'doya' : 'feliz', hasta: this.reloj + 1.3 }; this.lanzarManpu('brillo', [0.8, 0.7, 0.3], { vida: 0.9 }); fin(); }
        break;
      }
      case 'garabato': {
        // en vez de estudiar, dibuja en la libreta (y se queda tan ancho)
        if (F.col == null) { F.col = this.celdaLibre(PUPI.filas * 2); this.caraIdl = { nombre: 'bleh', hasta: this.reloj + 2 }; }
        const k = env(0.3, 2.6), [c1] = celdaHoja(F.col, 0), [c2] = celdaHoja(F.col + 1, 0), a = u * 6;
        this.plumear(F, P, k, ((c1 + c2) / 2 + Math.cos(a) * 26) / 512, 0.5 + Math.sin(a * 1.3) * 0.18, katana);
        if (u > 1.2 && !F.ya) { F.ya = true; this.garabato(); }
        if (u > 2.6) { this.caraIdl = { nombre: 'doya', hasta: this.reloj + 1.5 }; this.lanzarManpu('brillo', [0.8, 0.7, 0.3], { vida: 0.9 }); fin(); }
        break;
      }
      case 'dormirse': {
        // se queda frito encima del pupitre, con la cabeza en las patas… y se despierta de un respingo
        const k = env(0.7, 4.4);
        if (!F.a) { F.a = true; this.caraIdl = { nombre: 'sueno', hasta: this.reloj + 3.5 }; }
        if (u > 1.2 && !F.z1) { F.z1 = true; this.lanzarManpu('z', [0.75, 0.6, 0.3], { vida: 1.5 }); }
        if (u > 2.4 && !F.z2) { F.z2 = true; this.lanzarManpu('z', [0.75, 0.6, 0.3], { vida: 1.5 }); }
        P.joroba += 0.26 * k; P.cab += 0.3 * k; P.incl += Math.sin(u * 0.8) * 0.05 * k; P.colaAmp = 0.3;
        P.mR.lerp(this.puntoLibreta(0.2, 0.05, 0.08, _v), k); if (!katana) P.mL.lerp(this.puntoLibreta(0.75, 0.05, 0.08, _v2), k);
        if (u > 3.6 && !F.b) { F.b = true; this.caraIdl = { nombre: 'sorpresa', hasta: this.reloj + 0.8 }; this.lanzarManpu('excl', [0.75, 0.75, 0.3], { vida: 0.8 }); this.m.sq.v += 2.4; this.hablar('eh'); }
        if (u > 4.4) { this.caraIdl = { nombre: 'verguenza', hasta: this.reloj + 1.2 }; fin(); }
        break;
      }
      default: P.colaAmp = 2.6; P.colaVel = 2.2; if (u > 1.3) fin();
    }
  }

  // Andar y girarse. Anda de tres cuartos hacia donde va, con el bamboleo de pingüino de los muñecos
  // rechonchos (balanceo lateral + saltito en cada paso), y al llegar se vuelve hacia ti.
  moverse(P, dt, t, ex) {
    const dx = this.posObj - this.posX;
    const anda = this.dePie && this.m.pie.x > 0.85 && Math.abs(dx) > 0.02 && !this.gesto && this.giroManual == null;
    if (anda) {
      this.posX += Math.sign(dx) * Math.min(Math.abs(dx) * 3, 0.95) * dt;
      this.fasePaso += dt * (8 + 7 * (this.correr || 0));
    }
    this.andar += ((anda ? 1 : 0) - this.andar) * ex(9);
    // correr (0..1; lo usan las escenas, p. ej. la intro): el mismo paso, más rápido, con más zancada, bote e inclinación
    // estiloCarrera: cada uno corre con su carácter (lo pone quien lo anima; sin él, el de Nyan): bote, balanceo,
    // inclinación, zancada y brazos multiplican lo de siempre; `atras` echa las manos hacia atrás (la carrera ninja de Kage)
    const a = this.andar, f = Math.sin(this.fasePaso), c = this.correr || 0, K = this.estiloCarrera || {};
    this.zancada = f * (0.6 + 0.35 * c * (K.zancada ?? 1)) * a;
    P.y += Math.abs(f) * (0.04 + 0.09 * c * (K.bote ?? 1)) * a; P.incl += f * 0.13 * (K.balanceo ?? 1) * a; P.pitch += (0.06 + 0.14 * c * (K.inclina ?? 1)) * a;
    P.y -= c * PATA_F.L * (1 - Math.cos(this.zancada));   // corriendo, la zancada grande levantaría los pies del suelo
    const br = 0.16 + 0.2 * c * (K.brazos ?? 1), at = c * (K.atras || 0);
    P.mR.z += f * br * a - at * 0.5; P.mL.z -= f * br * a + at * 0.5; P.mR.y += (0.06 + 0.08 * c * (K.alza ?? 1)) * a - at * 0.22; P.mL.y += (0.06 + 0.08 * c * (K.alza ?? 1)) * a - at * 0.22;
    const obj = this.giroManual ?? (anda ? this.giroFrente + Math.sign(dx) * 1.05 : (this.giroObj ?? this.giroFrente));
    this.giroAct += (obj - this.giroAct) * ex(this.giroManual != null ? 12 : anda ? 7 : 3.5);
  }

  // ─── un paso de simulación ───
  paso(dt) {
    const t = (this.reloj += dt), g = this.g, P = this.P, S = this.S, M = this.m, ex = (k) => 1 - Math.exp(-dt * k);
    const katana = this.lleva('katana');
    this.quieto += dt;
    // mirada: sigue al puntero; si está quieto, curiosea sola
    const reciente = t - this.ratonT < 3;
    const ox = (reciente ? this.raton.x : Math.sin(t * 0.37) * 0.45 + Math.sin(t * 0.83) * 0.18) + this.miraExtra;
    const oy = reciente ? this.raton.y : Math.sin(t * 0.29 + 1) * 0.22;
    this.mira.x += (ox - this.mira.x) * ex(4); this.mira.y += (oy - this.mira.y) * ex(4);

    // pose base + cara + gesto/idle
    const resp = Math.sin(t * 2.1);
    P.y = 0; P.sq = 1 + resp * 0.012; P.incl = 0; P.joroba = 0; P.cab = 0; P.yaw = 0; P.pitch = 0; P.or[0] = P.or[1] = 0.02; P.fl[0] = P.fl[1] = 0; P.colaAmp = 1; P.colaVel = 1; P.anticipa = null;
    const pc = c01(M.pie.x);                          // 0 sentado · 1 de pie
    const desnudo = !this.prenda && !this.piezas?.haori?.grupos[0].visible;
    P.mR.lerpVectors(POSE.smR, desnudo ? POSE.dmR : POSE.pmR, pc); P.mR.y += Math.sin(t * 2.1 - 0.6) * 0.012; P.cR.lerpVectors(POSE.scR, desnudo ? POSE.dcR : POSE.pcR, pc);
    if (katana) { P.mL.copy(POSE.kmL); P.cL.copy(POSE.kcL); } else { P.mL.lerpVectors(POSE.mL, desnudo ? POSE.dmL : POSE.pmL, pc); P.cL.lerpVectors(POSE.cL, desnudo ? POSE.dcL : POSE.pcL, pc); }
    P.kat.copy(POSE.kat);
    this.poseCara(P, t, katana);
    if (this.gesto) this.poseGesto(P, dt, katana);
    else if (this.idle) this.poseIdle(P, dt, katana);
    else {
      // si una reacción de la app ha puesto `quieto` a cero, el siguiente gesto no puede quedar a medio minuto
      if (this.proxIdle - this.quieto > 11) this.proxIdle = this.quieto + 3 + Math.random() * 3;
      if (this.quieto > this.proxIdle && !this.congelado && !movReducido()) this.empezarIdle(t);
    }
    // si algo corta la merienda a medias (una reacción, un cambio de cara), el onigiri vuelve a su plato
    if (this.merienda && this.idle?.tipo !== 'merienda') this.merienda = false;
    this.moverse(P, dt, t, ex);
    this.resolverCara(t, dt);

    // física del salto (posición y velocidad con subpasos) y squash & stretch
    const pasos = Math.max(1, Math.ceil(dt / (1 / 120))), h = dt / pasos;
    for (let k = 0; k < pasos; k++) {
      if (S.y > 0 || S.v > 0) {
        S.v -= 21 * h; S.y += S.v * h;
        if (S.y <= 0) {
          const golpe = -S.v; S.y = 0; S.v = 0; S.botes++;
          M.sq.v -= golpe * 0.9; M.bam.v += (Math.random() - 0.5) * 3; M.cabeceo.v += golpe * 0.5;
          if (this.gesto?.tipo === 'salto' && S.botes === 1) S.v = this.v0() * 0.5;
        } else M.sq.obj = Math.max(-0.05, Math.min(0.14, S.v * 0.025));
      } else M.sq.obj = P.anticipa ?? (P.sq - 1);
      M.pie.obj = this.dePie ? 1 : 0; M.pie.paso(h);
      M.sq.paso(h); M.bam.paso(h); M.cabeceo.paso(h); M.cabSq.paso(h); M.pop.paso(h);
      M.incl.obj = P.incl; M.incl.paso(h); M.pitch.obj = P.pitch; M.pitch.paso(h);
      for (let i = 0; i < 2; i++) { M.or[i].paso(h); M.fl[i].paso(h); }
    }
    const sq = M.sq.x;
    g.cuerpo.scale.set(1 - sq * 0.5, 1 + sq, 1 - sq * 0.5);
    { const sx = g.cuerpo.scale.x, sy = g.cuerpo.scale.y; g.cuello.scale.set(Math.pow(1 / sx, 0.6), Math.pow(1 / sy, 0.6), Math.pow(1 / sx, 0.6)); }
    // apoyado de verdad: sentado, el culo redondo se hunde un poco en el cojín; de pie, la planta a ras
    g.figura.position.y = this.asiento + S.y + P.y * ESC - (0.056 + (0.01 - 0.056) * c01(M.pie.x));
    // de pie o sentado: el cuerpo sube lo que miden las patas y las caderas giran de hacia delante a hacia
    // abajo. Con el pitch lineal, el pie se queda más o menos en el suelo durante todo el gesto.
    {
      const pie = M.pie.x, pcl = c01(pie), aire = c01(S.y * 3);
      g.cuerpo.position.y = ALZA * pie;
      for (const { s, cadera } of g.patas) {
        cadera.position.set(CADERA.x * s, CADERA.y + ALZA * pie, CADERA.z);
        const zanca = (this.zancada || 0) * s + (this.zancadaExtra || 0) * (s > 0 ? 1 : 0.35);   // al andar, una adelante y otra atrás
        // sentado, las patas no van en horizontal: bajan un poco hasta apoyar el talón (+0.08)
        cadera.rotation.set((-Math.PI / 2 + 0.08) * (1 - pcl) - 0.55 * aire * pcl + zanca, CADERA.abre * s * (1 - 0.6 * pcl), 0);
      }
    }
    const hs = M.cabSq.x; g.cabezaSq.scale.set(1 / Math.sqrt(hs), hs, 1 / Math.sqrt(hs));
    if (this.sombraBlob) { const k = 1 / (1 + S.y * 1.2); this.sombraBlob.scale.set(2.4 * k, 2.1 * k, 1); this.sombraBlob.material.opacity = 0.4 * k; this.sombraBlob.position.x = this.posX; }

    // cabeza
    this.cabRot.x += (P.cab + this.mira.y * 0.14 + Math.sin(t * 2.1 + 0.6) * 0.012 - this.cabRot.x) * ex(8);
    this.cabRot.y += (P.yaw + this.mira.x * 0.4 - this.cabRot.y) * ex(8);
    // el cuerpo entero se inclina (bamboleo al andar, tropezón hacia delante); la cabeza pone además lo suyo,
    // y gira hacia ti más que el cuerpo: aunque vaya de perfil, te sigue mirando
    // medio jorobadito: el tronco se echa hacia delante (sentado, más: está repantingado) y la
    // cabeza solo compensa la mitad, así que asoma hacia delante y un poco gacha
    const joroba = JOROBA.sentado + (JOROBA.dePie - JOROBA.sentado) * c01(M.pie.x) + P.joroba;
    g.cuerpo.rotation.set(M.pitch.x + joroba, 0, M.incl.x * 0.55);
    g.figura.rotation.y = this.giroAct; g.figura.position.x = this.posX;
    g.cuello.rotation.set(this.cabRot.x + M.cabeceo.x * 0.1 - joroba * 0.55, this.cabRot.y - this.giroAct * (this.giroManual != null ? 0.18 : 0.62), M.incl.x * 0.6 + M.bam.x * 0.2);
    g.cuello.updateMatrix(); g.cabezaSq.updateMatrix(); g.cabeza.updateMatrix();
    this.cabM.multiplyMatrices(g.cuello.matrix, g.cabezaSq.matrix).multiply(g.cabeza.matrix); this.cabI.copy(this.cabM).invert();

    // orejas (deformación en el vertex shader): ánimo, tic ocasional y límites con el kabuto puesto
    this.ticOreja -= dt;
    if (this.ticOreja < 0) { this.ticOreja = 2.5 + Math.random() * 4; this.tic[Math.random() < 0.5 ? 0 : 1] = 1; }
    const conCasco = this.piezas.kabuto.grupos[0].visible;
    for (let i = 0; i < 2; i++) {
      this.tic[i] = Math.max(0, this.tic[i] - dt * 4);
      const tic = Math.sin(this.tic[i] * Math.PI);
      M.or[i].obj = P.or[i] + Math.sin(this.tic[i] * TAU) * 0.05; M.fl[i].obj = P.fl[i] + tic * 0.35;
      let caida = M.or[i].x, flick = M.fl[i].x;
      if (conCasco) { caida = cl(caida, -0.04, 0.1); flick *= 0.3; }
      const PV = g.pivote || OREJA.pivote, s = i ? 1 : -1, px = PV[0] * s, U = g.matCabeza.userData.u, Mx = i ? U.uOP.value : U.uON.value;
      _e.set(-flick, 0, -caida * s); _m4b.makeRotationFromEuler(_e);
      Mx.makeTranslation(px, PV[1], PV[2]).multiply(_m4b).multiply(_m4.makeTranslation(-px, -PV[1], -PV[2]));
    }

    // brazos: muelles + Bézier de longitud constante; anclas de onigiri y katana
    const [bR, bL] = g.brazos;
    // ni las manos ni el onigiri ni la katana atraviesan la cabeza o el cuerpo: se corrigen objetivo y muelle
    this.ajustarMano(P.mR, bR.P0); this.ajustarMano(P.mL, bL.P0);
    bR.seguir(dt, P.mR, P.cR, 170, 15, this.limMano); bL.seguir(dt, P.mL, P.cL, 170, 15, this.limMano);

    // cola (en la GPU), ya con los brazos en su sitio de este fotograma
    this.fase1 += dt * 1.9 * P.colaVel; this.fase2 += dt * 2.6 * P.colaVel;
    const U = g.cola.material.userData.u;
    const a1 = Math.sin(this.fase1) * 0.2 * P.colaAmp, a2 = Math.sin(this.fase2 - 1) * 0.14 * Math.min(P.colaAmp, 1.4);
    // la cola se aparta (hacia atrás o adelante) si el brazo izquierdo o el cuerpo le estorban
    let ap = 0, menos = 9; for (const b of [0, 0.14, -0.12, 0.28, -0.24, 0.42, 0.56, -0.36, 0.7]) { const e = this.colaChoca(a1 + b, a2); if (e < menos - 0.004) { menos = e; ap = b; } if (e <= 0) break; }
    this.colaAp += (ap - this.colaAp) * ex(24);
    if (menos <= 0 && this.colaChoca(a1 + this.colaAp, a2) > 0.01) this.colaAp = ap; // suavizada se metería en el brazo: salta al hueco
    U.uA1.value = a1 + this.colaAp; U.uA2.value = a2;
    colaCPU(U.uA1.value, U.uA2.value, this.colaV).forEach((v, i) => { const c = this.colaP[i]; c[0] = v.x; c[1] = v.y; c[2] = v.z; });
    // El onigiri NO va siempre en la mano (quedaba rarísimo): espera en su platito y solo lo coge cuando
    // merienda. Los objetos salen según lo que esté haciendo.
    const onigiriEnMano = !!this.merienda || this.cara === 'nom';
    g.onigiri.visible = onigiriEnMano; this.onigiriPlato.visible = !onigiriEnMano; this.platito.visible = true;
    // el onigiri va encima de la pata; si ahí choca, rueda hacia fuera sin soltarse
    _O.copy(bR.P2).add(ONI_SOBRE);
    for (let i = 0; i < 3 && this.limitar(_O, R_ONI + 0.01); i++) _O.sub(bR.P2).setLength(ONI_SOBRE.length()).add(bR.P2);
    this.oniOff.lerp(_O.sub(bR.P2), ex(16));
    g.anclaR.position.copy(bR.P2).add(this.oniOff); if (onigiriEnMano) this.limitar(g.anclaR.position, R_ONI);
    g.anclaR.quaternion.identity().slerp(_q.setFromUnitVectors(ONI_ARRIBA, _O.copy(this.oniOff).normalize()), 0.6);
    // el pincel: en la pata mientras escribe (con la punta hacia la hoja); en el tintero el resto del tiempo
    if (this.fudeMano) {
      const I = this.idle, escribe = this.pupitre && !!I?.punta && (I.tipo === 'escribir' || I.tipo === 'garabato');
      this.fudeMano.visible = escribe; this.pupi.fudeMesa.visible = !escribe;
      // la punta, en la hoja; el mango, hacia la pata (si la pata se queda baja, el mango asoma por encima de ella)
      if (escribe) { if (_O.subVectors(I.punta, bR.P2).lengthSq() < 0.002) _O.set(0.2, -1, 0.3); _O.normalize(); this.fudeMano.quaternion.setFromUnitVectors(ABAJO, _O); this.fudeMano.position.copy(I.punta).addScaledVector(_O, -PUPI.fude); }
    }
    if (this.apunte && this.idle !== this.apunte) this.acabarApunte();
    if (katana) {
      this.kat.lerp(_v.copy(P.kat).normalize(), ex(8)).normalize();
      // la hoja se inclina hacia fuera si fuera a entrar en la cabeza o en el cuerpo
      for (let i = 0; i < 2; i++) for (const s of [0.4, 0.75, 1.05, 1.32]) { _O.copy(bL.P2).addScaledVector(this.kat, s); _K.copy(_O); if (this.limitar(_O, 0.035)) this.kat.addScaledVector(_O.sub(_K), 1 / s).normalize(); }
      const yK = this.kat, xK = _v2.set(0, 0, 1).cross(yK).multiplyScalar(-1);
      if (xK.lengthSq() < 1e-6) xK.set(1, 0, 0); xK.normalize(); const zK = _v.crossVectors(xK, yK).normalize();
      _m4.makeBasis(xK, yK, zK); g.anclaL.quaternion.setFromRotationMatrix(_m4); g.anclaL.position.copy(bL.P2);
    }

    // equipo
    this.animarEquipo(t, dt);
    this.pops = this.pops.filter((p) => { p.t += dt; const k = c01(p.t / 0.75), e = k >= 1 ? 1 : Math.max(0.001, elastico(k)); if (p.s) p.gr.scale.copy(p.s).multiplyScalar(e); else p.gr.scale.setScalar(e); return k < 1; });

    // nube de pena
    const nb = this.nube; nb.esc += ((nb.activa ? 1 : 0) - nb.esc) * ex(10);
    if (nb.esc < 0.01 && !nb.activa) nb.g.visible = false;
    else { nb.g.scale.setScalar(Math.max(1e-3, nb.esc * (1 + Math.sin(t * 7) * 0.04))); nb.g.position.x = 0.1 + Math.sin(t * 1.7) * 0.06; nb.gotas.forEach((d) => { const f = (t * 1.5 + d.userData.f) % 1; d.position.set(d.userData.x, -0.12 - f * 0.42, 0.02); d.scale.setScalar(0.07 * (1 - f * 0.6)); }); }

    // habitación viva
    if (this.prim) {
      const pp = this.prim.polvo, pa = pp.geometry.attributes.position;
      pp.userData.datos.forEach((d, i) => { d.y += d.v * dt * 0.5; if (d.y > 4.8) d.y = 0.4; pa.setXYZ(i, d.x + Math.sin(t * 0.3 + d.f) * 0.3, d.y + Math.sin(t * 0.7 + d.f) * 0.05, d.z + Math.cos(t * 0.25 + d.f) * 0.2); });
      pa.needsUpdate = true;
      for (const p of this.props) if (p.g.visible && p.g.userData.anim) p.g.userData.anim(t);
    }

    // cámara: paralaje suave y sigue el salto
    if (this.objetivo) {
      this.sigue += (S.y * (this.compacta ? 0.55 : 0.3) - this.sigue) * ex(6);
      const cx = this.raton.x * (this.isla ? 0.35 : 0.15) + this.posX * 0.3, cy = -this.raton.y * 0.15;   // la cámara le acompaña un poco al andar
      // de pie mide un 18 % más: la cámara sube y se aleja un poco, o la cabeza se mete en el logo
      const pcC = this.isla ? c01(M.pie.x) : 0, alzaC = ALZA * ESC * pcC * 0.62;
      this.camara.position.set(cx, this.alturaCam + cy + this.sigue + alzaC, this.dist + 2.1 * pcC);
      this.camara.lookAt(this.objetivo.x + this.posX * 0.45, this.objetivo.y + this.sigue + alzaC, this.objetivo.z);
      this.camara.updateMatrixWorld();
      // el encuadre se corre sin cambiar la perspectiva (setViewOffset): Mochi a un lado y la sala sigue entera
      this.desvioAct += (this.desvio - this.desvioAct) * ex(3.5);
      if (this.tamW && (this.desvioPuesto === null || Math.abs(this.desvioAct - this.desvioPuesto) > 1e-4)) {
        this.desvioPuesto = this.desvioAct;
        if (Math.abs(this.desvioAct) < 1e-4) this.camara.clearViewOffset();
        else this.camara.setViewOffset(this.tamW, this.tamH, this.desvioAct * this.tamW, 0, this.tamW, this.tamH);
      }
    }
    this.animarManpu(t, dt);
    this.animarConfeti(dt);
    if (this.bocadillo && !this.bocadillo.hidden) { this.g.cabeza.updateWorldMatrix(true, false); this.colocarBocadillo(); }

    // cara (solo se redibuja si cambia)
    const mx = cl(this.mira.x, -1, 1) * 0.035, my = -cl(this.mira.y, -1, 1) * 0.025;
    g.cara.pintar(this.cara, { abre: this.abre, t, mx: Math.round(mx * 160) / 160, my: Math.round(my * 160) / 160, pop: Math.round(M.pop.x * 200) / 200 });

    if (this.post) { g.craneo.getWorldPosition(_v); _v.z += 0.6; this.post.mat.uniforms.foco.value = this.camara.position.distanceTo(_v); }
  }

  animarEquipo(t, dt) {
    const Pz = this.piezas, S = this.S;
    if (this.auraC) animarAuraC(this.auraC, t, dt, this.compacta ? 0.84 : 1);
    if (Pz.bufanda.grupos[0].visible) Pz.bufanda.puntas.forEach((p, i) => { p.rotation.z = p.userData.a + Math.sin(t * 2.4 + i * 1.7) * 0.08 - S.v * 0.02; p.rotation.x = 0.22 + Math.max(0, -S.v) * 0.05 + Math.sin(t * 1.7 + i) * 0.04; });
    if (Pz.hachimaki.grupos[0].visible && Pz.hachimaki.detras.visible) Pz.hachimaki.cintas.forEach((u) => { u.uT.value = t; u.uV.value = Math.max(-0.1, Math.min(0.3, -S.v * 0.05 + 0.04)); });
    if (Pz.capa.grupos[0].visible) { Pz.capa.u.uT.value = t; Pz.capa.u.uVel.value = cl(-S.v * 0.012, -0.03, 0.05); }
    if (Pz.aura.grupos[0].visible) {
      const A = Pz.aura, rk = this.compacta ? 0.84 : 1;
      A.anillo.rotation.z = t * 0.25; A.anillo.material.opacity = 0.75 + Math.sin(t * 2) * 0.2; A.halo.material.opacity = 0.45 + Math.sin(t * 1.6) * 0.12;
      // órbita inclinada: por delante bajan (pecho y barriga) y por detrás suben; plana, los de arriba le cruzaban la cara
      A.kanji.forEach((k, i) => { const d = k.userData, a = d.a + t * 0.45, s = Math.sin(a); k.position.set(Math.cos(a) * d.r * rk, d.y - s * (d.y > 1 ? 0.6 : 0.2) + Math.sin(t * 1.3 + i) * 0.1, s * d.r * 0.8 * rk + 0.1); k.scale.setScalar(0.24 + 0.04 * Math.sin(t * 3 + i)); });
      const pa = A.motas.geometry.attributes.position;
      A.motasDat.forEach((m, i) => { m.y += m.v * dt; if (m.y > 2.7) m.y = 0; const a = m.a + t * 0.3; pa.setXYZ(i, Math.cos(a) * m.r * rk, m.y, Math.sin(a) * m.r * 0.8 * rk); });
      pa.needsUpdate = true;
      this.contra.intensity = (this.isla ? 1.9 : 1.8) + 0.6 + Math.sin(t * 2) * 0.3;
    } else if (this.contra) this.contra.intensity = this.isla ? 1.9 : 1.8;
  }

  animarManpu(t, dt) {
    if (!this.manpus.length) return;
    this.g.manpu.getWorldQuaternion(_q); _q.invert().multiply(this.camara.quaternion);
    this.manpus = this.manpus.filter((m) => {
      m.t += dt;
      if (m.t < 0) return true;
      let esc = m.escala * elastico(c01(m.t / 0.45)), sale = 0;
      if (!m.fijo && m.t > m.vida - 0.3) sale = c01((m.t - (m.vida - 0.3)) / 0.3);
      if (m.fin) { m.finT = (m.finT || 0) + dt; sale = Math.max(sale, c01(m.finT / 0.22)); }
      esc *= 1 - suave(sale);
      const p = m.m.position.copy(m.base), f = m.fase || 0;
      if (m.orbita) { const a = t * 2.6 + f; p.set(Math.cos(a) * 1.0, m.base.y + Math.sin(t * 2 + f) * 0.05, Math.sin(a) * 0.7); }
      else if (m.sube) { const c = (m.t * 0.55 + f) % 1; p.x += c * 0.25 * Math.sign(m.base.x || 1); p.y += c * 0.55; esc *= Math.sin(c * Math.PI) * 1.2; }
      else if (m.salta) { const c = (m.t * 1.4 + f) % 1; p.x += m.salta * c * 0.45; p.y += c * 0.35 - c * c * 0.9; esc *= Math.sin(c * Math.PI); }
      else if (m.burbuja) esc *= 0.7 + 0.5 * (0.5 + 0.5 * Math.sin(t * 2.4));
      else if (m.suave) p.y += Math.sin(t * 2) * 0.02;
      else p.y += Math.sin(t * 3 + f) * 0.035 + (m.fijo ? 0 : m.t * 0.12);
      if (m.late) esc *= 1 + 0.18 * Math.max(0, Math.sin(t * 9));
      if (m.fijo && !m.sube && !m.burbuja && !m.suave && !m.late && !m.salta) esc *= 0.88 + 0.16 * Math.sin(t * 6 + f);
      m.m.scale.setScalar(Math.max(0.001, esc));
      m.m.quaternion.copy(_q).multiply(_q2.setFromAxisAngle(_v.set(0, 0, 1), Math.sin(t * 2 + f) * 0.14 + (m.orbita ? t * 3 : 0)));
      const vivo = m.fin ? sale < 1 : m.fijo || m.t < m.vida;
      if (!vivo) this.g.manpu.remove(m.m);
      return vivo;
    });
  }

  animarConfeti(dt) {
    const C = this.confeti, d = C.datos;
    if (!d.length && !C.malla.count) return;
    for (const c of d) {
      c.t += dt; c.v.y -= 7.5 * dt; c.v.multiplyScalar(1 - 1.6 * dt); c.v.x += Math.sin(c.t * 7 + c.r.x) * 0.9 * dt;
      c.p.addScaledVector(c.v, dt);
      if (c.p.y < this.asiento + 0.03) { c.p.y = this.asiento + 0.03; c.v.set(0, 0, 0); c.w.multiplyScalar(0.8); }
      c.r.addScaledVector(c.w, dt);
    }
    C.datos = d.filter((c) => c.t < 3.2);
    C.datos.forEach((c, i) => { _e.set(c.r.x, c.r.y, c.r.z); _q2.setFromEuler(_e); const k = c.t > 2.6 ? 1 - (c.t - 2.6) / 0.6 : 1; _v.setScalar(Math.max(0.001, k)); _m4.compose(c.p, _q2, _v); C.malla.setMatrixAt(i, _m4); });
    C.malla.count = C.datos.length; C.malla.instanceMatrix.needsUpdate = true;
  }
}
// el mallado de la figura empieza en cuanto se importa el módulo, mientras la app pide sus datos
lanzarFormas();

// lo que necesita reparto.js para montar otras especies con las mismas piezas
export const NUCLEO = { THREE, V3, TAU, COL, PROPS, CAB, OREJA, CARA, OJO, BOCA_Y, MOF, TINTA, GR, cl, entre, smin, smax, conoRedondo, extruir, fCraneo, fCabeza, mallarDatos, llenarGeo, conPint, vinilo, cache, lienzo, texDe, trazo, curva, elipse, mofletes, judia, sombrear, lanzarFormas };
