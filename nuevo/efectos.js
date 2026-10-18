// efectos.js — Nyango · chispas, celebraciones y sonidos por tema.
// Canvas 2D + WebAudio. Sin librerías, sin imports, sin assets, sin red.
// Un único <canvas> superpuesto y un único bucle rAF que solo corre con cosas vivas.

/* ═════════════════════════ utilidades ═════════════════════════ */
const TEMAS = ['washi', 'noche', 'pop', 'sumi', 'heisei'];
const PI = Math.PI, PI2 = PI * 2;
const rnd = (a, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const pick = (v) => v[(Math.random() * v.length) | 0];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const tramo = (t, a, b) => clamp((t - a) / (b - a), 0, 1); // 0..1 entre a y b
const fade = (k, desde) => (k < desde ? 1 : 1 - (k - desde) / (1 - desde));
const nTema = (t) => (TEMAS.includes(t) ? t : 'washi');
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
const al = (v) => Math.max(0, v).toFixed(3); // alfa segura para rgba()

const E = {
  outQuad: (u) => 1 - (1 - u) * (1 - u),
  outCubic: (u) => 1 - (1 - u) ** 3,
  inQuad: (u) => u * u,
  inCubic: (u) => u * u * u,
  inOutSine: (u) => -(Math.cos(PI * u) - 1) / 2,
  outBack: (u) => 1 + 2.70158 * (u - 1) ** 3 + 1.70158 * (u - 1) ** 2,
  inBack: (u) => 2.70158 * u * u * u - 1.70158 * u * u,
  outElastic: (u) => (u <= 0 ? 0 : u >= 1 ? 1 : 2 ** (-10 * u) * Math.sin((u * 10 - 0.75) * (PI2 / 3)) + 1),
};
// oscilación amortiguada: 1 en v=0, se asienta en 0 (squash & stretch al aterrizar)
const muelle = (v, k, w) => (v <= 0 ? 0 : Math.exp(-k * v) * Math.cos(w * v));

// ruido de valor 1D determinista (trazos de pincel)
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const vnoise = (x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), u); };

const reducido = () => {
  try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch { return false; }
};

// fuentes (las carga la página host; siempre con alternativa)
const F_ZEN = (px) => `900 ${px}px "Zen Maru Gothic", "Hiragino Maru Gothic ProN", "Yu Gothic", sans-serif`;
const F_FRE = (px) => `700 ${px}px "Fredoka", "Baloo 2", "Arial Rounded MT Bold", sans-serif`;
const F_DOT = (px) => `${px}px "DotGothic16", "MS Gothic", monospace`;
const F_YUJI = (px) => `400 ${px}px "Yuji Syuku", "Zen Maru Gothic", serif`;

/* ═════════════════════════ lienzo ═════════════════════════ */
let cont = null, lienzo = null, ctx = null, ro = null;
let W = 300, H = 300, dpr = 1;
let fuentesOk = false;

const escala = () => clamp(Math.sqrt(W * H) / 800, 0.65, 1.6);

export function montar(contenedor) {
  if (!contenedor || typeof document === 'undefined') return;
  if (lienzo && cont === contenedor && lienzo.parentNode === contenedor) return; // idempotente
  desmontar();
  cont = contenedor;
  try {
    if (getComputedStyle(cont).position === 'static') cont.style.position = 'relative';
  } catch { /* nada */ }
  lienzo = document.createElement('canvas');
  lienzo.setAttribute('aria-hidden', 'true');
  lienzo.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:60;';
  cont.appendChild(lienzo);
  ctx = lienzo.getContext('2d');
  if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(ajustar); ro.observe(cont); }
  else window.addEventListener('resize', ajustar);
  ajustar();
  precargarFuentes();
}

function desmontar() {
  if (ro) ro.disconnect();
  window.removeEventListener('resize', ajustar);
  reiniciar();
  if (lienzo && lienzo.parentNode) lienzo.parentNode.removeChild(lienzo);
  cont = lienzo = ctx = ro = null;
}

function ajustar() {
  if (!lienzo || !cont) return;
  const w = cont.clientWidth || 300, h = cont.clientHeight || 300;
  const d = Math.min(2, window.devicePixelRatio || 1);
  if (w !== W || h !== H || d !== dpr || lienzo.width !== Math.round(w * d)) {
    W = w; H = h; dpr = d;
    lienzo.width = Math.round(W * dpr);
    lienzo.height = Math.round(H * dpr);
    cache.clear();
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function precargarFuentes() {
  try {
    if (!document.fonts || fuentesOk) return;
    fuentesOk = true;
    document.fonts.addEventListener('loadingdone', () => cache.clear()); // los sellos se regeneran con la tipografía real
    const txt = '済合格よくできました花丸秀セーブ';
    for (const f of ['900 40px "Zen Maru Gothic"', '700 40px "Fredoka"', '40px "DotGothic16"', '40px "Yuji Syuku"']) {
      document.fonts.load(f, txt).catch(() => {});
    }
  } catch { /* nada */ }
}

/* ═════════════════════════ caché de sellos ═════════════════════════ */
const cache = new Map();
const PAD = 14;

// Pinta una vez en un lienzo auxiliar (origen en el centro) y luego solo se estampa.
function enCache(clave, w, h, dibujar) {
  const q = Math.min(3, dpr * 1.5), kk = `${clave}|${q}`;
  let o = cache.get(kk);
  if (o) return o;
  if (cache.size > 40) cache.clear();
  const cv = document.createElement('canvas');
  cv.width = Math.ceil((w + PAD * 2) * q);
  cv.height = Math.ceil((h + PAD * 2) * q);
  const g = cv.getContext('2d');
  g.scale(q, q);
  g.translate(cv.width / q / 2, cv.height / q / 2);
  dibujar(g, q);
  o = { cv, w: cv.width / q, h: cv.height / q, bw: w, bh: h };
  cache.set(kk, o);
  return o;
}

// x,y = centro del cuerpo; base = true → squash anclado al suelo (borde inferior)
function pegar(c, o, x, y, sx = 1, sy = 1, rot = 0, base = false) {
  c.save();
  c.translate(x, base ? y + o.bh / 2 : y);
  c.rotate(rot);
  c.scale(sx, sy);
  c.drawImage(o.cv, -o.w / 2, base ? -(o.h / 2 + o.bh / 2) : -o.h / 2, o.w, o.h);
  c.restore();
}

function rr(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// tinta desgastada: motas que borran
function erosion(g, w, h, n, rmax, circ) {
  g.save();
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = '#000';
  for (let i = 0; i < n; i++) {
    let x, y;
    if (circ) {
      const a = rnd(PI2), d = i % 2 ? Math.sqrt(Math.random()) : 0.8 + Math.random() * 0.2;
      x = Math.cos(a) * d * w / 2; y = Math.sin(a) * d * h / 2;
    } else { x = rnd(-w / 2, w / 2); y = rnd(-h / 2, h / 2); }
    g.globalAlpha = rnd(0.5, 1);
    g.beginPath(); g.arc(x, y, rnd(0.35, 1) * rmax, 0, PI2); g.fill();
  }
  g.restore();
}

// respaldo de papel + sombra, detrás de la tinta (legible sobre cualquier fondo).
// destination-over apila hacia abajo: primero el papel y luego, debajo, la sombra.
function parche(g, forma, w, h, q, color) {
  const forma_ = () => {
    if (forma === 'rect') rr(g, -w / 2, -h / 2, w, h, h * 0.07);
    else { g.beginPath(); g.arc(0, 0, Math.min(w, h) / 2, 0, PI2); }
  };
  g.save();
  g.globalCompositeOperation = 'destination-over';
  g.fillStyle = color; forma_(); g.fill();
  g.shadowColor = 'rgba(70,30,10,.38)'; g.shadowBlur = 9 * q; g.shadowOffsetY = 3 * q;
  forma_(); g.fill();
  g.restore();
}

/* ═════════════════════════ partículas ═════════════════════════ */
const MAX = 600;
const K = { PAPEL: 0, PETALO: 1, ANILLO: 2, CHISPA: 3, BRILLO: 4, ESTRELLA: 5, CIRCULO: 6, MONEDA: 7, GOTA: 8, DESTELLO: 9, CORAZON: 10, POLVO: 11, FOGONAZO: 12 };
const INK = '#1a1033';
const vivos = [], libres = [];

function crearP() {
  return {
    kind: 0, x: 0, y: 0, vx: 0, vy: 0, g: 0, k: 0, kx: 0, rot: 0, vr: 0, s: 1, s2: 1, t: 0, vida: 1, col: '#fff', col2: '#fff', cut: 2, out: INK,
    add: false, a: 0, b: 0, ph: 0, sw: 0, swf: 0, piso: 1e9, reb: 0, em: 0, fin: 0, nt: 0, ta: 0, ti: 0.02, hn: 0, lw: 2, fd: 0.6, h: new Float32Array(12),
  };
}

// o: sobreescribe campos. g=gravedad, k=arrastre (kx = arrastre extra solo horizontal), cut=fracción de vida donde col→col2, fd=desde dónde se desvanece,
// nt=puntos de estela (ti = segundos entre puntos), em=gotas/s, fin=chispita al morir, piso/reb=suelo con rebote, sw/swf=vaivén lateral
function nueva(kind, x, y, vx, vy, vida, o) {
  if (!ctx || vivos.length >= MAX) return null;
  const p = libres.pop() || crearP();
  p.kind = kind; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.vida = vida; p.t = 0;
  p.g = 0; p.k = 0; p.kx = 0; p.rot = 0; p.vr = 0; p.s = 4; p.s2 = 4; p.col = '#fff'; p.col2 = '#fff'; p.cut = 2; p.out = INK;
  p.add = false; p.a = 0; p.b = 0; p.sw = 0; p.swf = 0; p.piso = 1e9; p.reb = 0; p.em = 0; p.fin = 0; p.nt = 0; p.ta = 0; p.ti = 0.02; p.hn = 0;
  p.lw = 2; p.fd = 0.6; p.ph = Math.random() * PI2;
  if (o) Object.assign(p, o);
  vivos.push(p);
  arrancar();
  return p;
}

function quitar(i) {
  const p = vivos[i], x = p.x, y = p.y, fin = p.fin;
  vivos[i] = vivos[vivos.length - 1];
  vivos.pop();
  libres.push(p);
  if (fin && Math.random() < 0.45) { // crepitar al apagarse
    nueva(K.BRILLO, x + rnd(-4, 4), y + rnd(-4, 4), rnd(-15, 15), rnd(-5, 25), rnd(0.35, 0.75),
      { add: true, g: 30, k: 1, s: 2.2, col: pick(['#fff3c4', '#ffb347', '#ffffff']), fd: 0.5 });
  }
}

function avanzarParticulas(dt) {
  for (let i = vivos.length - 1; i >= 0; i--) {
    const p = vivos[i];
    p.t += dt;
    if (p.t >= p.vida) { quitar(i); continue; }
    if (p.nt) { // historial para la estela
      p.ta += dt;
      if (p.ta >= p.ti) {
        p.ta = 0;
        const h = p.h;
        for (let j = p.nt * 2 - 1; j > 1; j--) h[j] = h[j - 2];
        h[0] = p.x; h[1] = p.y;
        if (p.hn < p.nt) p.hn++;
      }
    }
    const f = Math.exp(-p.k * dt);
    p.vx *= p.kx ? f * Math.exp(-p.kx * dt) : f;
    p.vy = p.vy * f + p.g * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.sw) p.x += Math.sin(p.t * p.swf + p.ph) * p.sw * dt;
    p.rot += p.vr * dt;
    if (p.y > p.piso && p.vy > 0) { p.y = p.piso; p.vy *= -p.reb; p.vx *= 0.82; p.vr *= 0.8; }
    if (p.em && Math.random() < p.em * dt) { // gotea (sauce dorado)
      nueva(K.CHISPA, p.x, p.y, rnd(-8, 8), rnd(0, 20), rnd(0.35, 0.6),
        { add: true, g: 90, k: 0.8, s: rnd(0.8, 1.2), col: '#ffb347', col2: '#ff8a3d', cut: 0.5, fd: 0.3 });
    }
  }
}

function pintarParticulas() {
  ctx.save();
  for (let pasada = 0; pasada < 2; pasada++) {
    const add = pasada === 1;
    ctx.globalCompositeOperation = add ? 'lighter' : 'source-over';
    for (let i = 0; i < vivos.length; i++) {
      const p = vivos[i];
      if (p.add === add) DIB[p.kind](ctx, p, p.t / p.vida);
    }
  }
  ctx.restore();
}

/* ── formas reutilizables ── */
function estrellaPath(c, R, r, n = 5) {
  c.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = -PI / 2 + i * PI / n, d = i % 2 ? r : R;
    c.lineTo(Math.cos(a) * d, Math.sin(a) * d);
  }
  c.closePath();
}
function destelloPath(c, r) { // ✦ de cuatro puntas, lados cóncavos
  const k = r * 0.14;
  c.beginPath();
  c.moveTo(0, -r); c.quadraticCurveTo(k, -k, r, 0); c.quadraticCurveTo(k, k, 0, r);
  c.quadraticCurveTo(-k, k, -r, 0); c.quadraticCurveTo(-k, -k, 0, -r);
  c.closePath();
}
function corazonPath(c) { // corazón de radio ~1
  c.beginPath();
  c.moveTo(0, 0.9);
  c.bezierCurveTo(-1.4, 0.05, -0.95, -1.45, 0, -0.35);
  c.bezierCurveTo(0.95, -1.45, 1.4, 0.05, 0, 0.9);
  c.closePath();
}
function petaloPath(c) { // pétalo de sakura con muesca
  c.beginPath();
  c.moveTo(0, 1);
  c.bezierCurveTo(0.9, 0.5, 1.1, -0.7, 0.28, -1);
  c.lineTo(0, -0.78); c.lineTo(-0.28, -1);
  c.bezierCurveTo(-1.1, -0.7, -0.9, 0.5, 0, 1);
  c.closePath();
}
const BX = new Float32Array(9), BY = new Float32Array(9);
function blobPath(c, r, f1, f2) { // gota irregular suave
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = i / n * PI2, rr_ = r * (1 + 0.24 * Math.sin(3 * a + f1) + 0.14 * Math.sin(5 * a + f2));
    BX[i] = Math.cos(a) * rr_; BY[i] = Math.sin(a) * rr_;
  }
  c.beginPath();
  c.moveTo((BX[n - 1] + BX[0]) / 2, (BY[n - 1] + BY[0]) / 2);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    c.quadraticCurveTo(BX[i], BY[i], (BX[i] + BX[j]) / 2, (BY[i] + BY[j]) / 2);
  }
  c.closePath();
}
// entra con rebote y sale encogiéndose (pop)
const envPop = (k) => (k < 0.14 ? E.outBack(k / 0.14) : k > 0.78 ? Math.max(0, 1 - E.inBack(tramo(k, 0.78, 1))) : 1);

/* ── dibujo por tipo ── */
const DIB = [];
DIB[K.PAPEL] = (c, p, k) => {
  const sx = Math.cos(p.ph + p.t * p.b), s = p.s * Math.min(1, k / 0.08);
  c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.scale(sx * s, s);
  c.globalAlpha = fade(k, p.fd);
  c.fillStyle = sx > 0 ? p.col : p.col2; // cara / reverso
  c.fillRect(-0.5, -0.55, 1, 1.1);
  c.restore();
};
DIB[K.PETALO] = (c, p, k) => {
  const sx = Math.cos(p.ph + p.t * p.b), s = p.s * Math.min(1, k / 0.1);
  c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.scale(sx * s, s);
  c.globalAlpha = fade(k, p.fd);
  c.fillStyle = sx > 0 ? p.col : p.col2;
  petaloPath(c); c.fill();
  c.restore();
};
DIB[K.ANILLO] = (c, p, k) => {
  const e = E.outCubic(k);
  c.globalAlpha = 1 - k * k;
  c.strokeStyle = p.col; c.lineWidth = Math.max(0.6, p.lw * (1 - e));
  c.beginPath(); c.arc(p.x, p.y, lerp(p.s, p.s2, e), 0, PI2); c.stroke();
  c.globalAlpha = 1;
};
DIB[K.POLVO] = (c, p, k) => {
  c.globalAlpha = 0.5 * (1 - k) * (1 - k);
  c.fillStyle = p.col;
  c.beginPath(); c.arc(p.x, p.y, lerp(p.s, p.s2, E.outCubic(k)), 0, PI2); c.fill();
  c.globalAlpha = 1;
};
DIB[K.CHISPA] = (c, p, k) => { // chispa aditiva con estela y titileo
  const a = fade(k, p.fd) * (0.75 + 0.25 * Math.sin(p.t * 38 + p.ph));
  const col = k > p.cut ? p.col2 : p.col;
  c.strokeStyle = col; c.fillStyle = col; c.lineCap = 'round';
  if (p.hn) {
    c.lineWidth = p.s;
    let px = p.x, py = p.y;
    for (let j = 0; j < p.hn; j++) {
      const nx = p.h[j * 2], ny = p.h[j * 2 + 1];
      c.globalAlpha = a * 0.85 * (1 - j / (p.hn + 1));
      c.beginPath(); c.moveTo(px, py); c.lineTo(nx, ny); c.stroke();
      px = nx; py = ny;
    }
  }
  c.globalAlpha = a;
  c.beginPath(); c.arc(p.x, p.y, p.s, 0, PI2); c.fill();
  c.globalAlpha = a * 0.28;
  c.beginPath(); c.arc(p.x, p.y, p.s * 3.2, 0, PI2); c.fill();
  c.globalAlpha = 1;
};
DIB[K.BRILLO] = (c, p, k) => { // purpurina que parpadea
  c.globalAlpha = (Math.sin(p.t * 70 + p.ph) > -0.2 ? 1 : 0.15) * fade(k, p.fd);
  c.fillStyle = p.col;
  c.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
  c.globalAlpha = 1;
};
DIB[K.FOGONAZO] = (c, p, k) => { // fogonazo radial (un sprite que se escala: un degradado por partícula y fotograma era carísimo)
  const r = lerp(p.s, p.s2, E.outCubic(k)), a = 1 - k;
  if (a <= 0.01 || r <= 0) return;
  const o = enCache('fogonazo', 128, 128, (g) => {
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 64);
    gr.addColorStop(0, 'rgba(255,243,196,.9)'); gr.addColorStop(0.35, 'rgba(255,179,71,.35)'); gr.addColorStop(1, 'rgba(255,138,61,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 64, 0, PI2); g.fill();
  });
  const f = r / 64;
  c.globalAlpha = a; c.drawImage(o.cv, p.x - o.w * f / 2, p.y - o.h * f / 2, o.w * f, o.h * f); c.globalAlpha = 1;
};
DIB[K.ESTRELLA] = (c, p, k) => { // pop: estrella gordita con contorno
  const s = envPop(k);
  if (s <= 0.01) return;
  c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.scale(s, s);
  c.lineJoin = 'round'; c.lineWidth = p.lw; c.strokeStyle = p.out; c.fillStyle = p.col;
  estrellaPath(c, p.s, p.s * 0.48); if (p.lw > 0) c.stroke(); c.fill();
  c.fillStyle = 'rgba(255,255,255,.65)';
  c.beginPath(); c.arc(-p.s * 0.2, -p.s * 0.28, p.s * 0.13, 0, PI2); c.fill();
  c.restore();
};
DIB[K.CIRCULO] = (c, p, k) => {
  const s = envPop(k);
  if (s <= 0.01) return;
  c.save(); c.translate(p.x, p.y); c.scale(s, s);
  c.lineWidth = p.lw; c.strokeStyle = p.out; c.fillStyle = p.col;
  c.beginPath(); c.arc(0, 0, p.s, 0, PI2); c.stroke(); c.fill();
  c.fillStyle = 'rgba(255,255,255,.7)';
  c.beginPath(); c.arc(-p.s * 0.32, -p.s * 0.34, p.s * 0.24, 0, PI2); c.fill();
  c.restore();
};
DIB[K.MONEDA] = (c, p, k) => { // el giro falso 3D es un cos en el ancho
  const sx = Math.max(0.1, Math.abs(Math.cos(p.ph + p.t * p.b))), r = p.s * envPop(k);
  if (r <= 0.5) return;
  c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.scale(sx, 1);
  c.lineWidth = 2.4; c.strokeStyle = INK; c.fillStyle = '#e8a400';
  c.beginPath(); c.arc(0, 0, r, 0, PI2); c.fill(); c.stroke();
  c.fillStyle = '#ffd23f';
  c.beginPath(); c.arc(0, 0, r * 0.72, 0, PI2); c.fill();
  c.fillStyle = '#e8a400'; c.fillRect(-r * 0.1, -r * 0.38, r * 0.2, r * 0.76);
  c.fillStyle = 'rgba(255,255,255,.8)';
  c.beginPath(); c.arc(-r * 0.34, -r * 0.36, r * 0.13, 0, PI2); c.fill();
  c.restore();
};
DIB[K.GOTA] = (c, p, k) => { // gota de tinta: se alarga con la velocidad y se aplasta al frenar
  const v = Math.hypot(p.vx, p.vy), st = 1 + 0.9 * Math.min(1, v / Math.max(1, p.a));
  c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.scale(st, 1 / Math.sqrt(st));
  c.globalAlpha = fade(k, p.fd);
  c.fillStyle = p.col;
  blobPath(c, p.s * Math.min(1, 0.4 + k * 8), p.ph, p.b); c.fill();
  c.restore();
};
DIB[K.DESTELLO] = (c, p, k) => { // ✦ titilante con halo
  const env = k < 0.18 ? E.outBack(k / 0.18) : 1 - E.inCubic(tramo(k, 0.55, 1));
  const r = p.s * Math.max(0, env) * (0.72 + 0.28 * Math.sin(p.t * 16 + p.ph));
  if (r < 0.5) return;
  c.save(); c.translate(p.x, p.y); c.rotate(p.rot);
  c.fillStyle = p.col;
  c.globalAlpha = 0.22; c.beginPath(); c.arc(0, 0, r * 0.95, 0, PI2); c.fill();
  c.globalAlpha = 1; destelloPath(c, r); c.fill();
  c.fillStyle = '#fff'; destelloPath(c, r * 0.5); c.fill();
  c.restore();
};
DIB[K.CORAZON] = (c, p, k) => {
  const s = p.s * Math.max(0, k < 0.15 ? E.outBack(k / 0.15) : 1 - E.inCubic(tramo(k, 0.6, 1))) * (1 + 0.12 * Math.sin(p.t * 14 + p.ph));
  if (s < 0.5) return;
  c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.scale(s, s);
  c.fillStyle = p.col; c.lineWidth = 0.16; c.strokeStyle = 'rgba(255,255,255,.9)';
  corazonPath(c); c.fill(); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.8)';
  c.beginPath(); c.arc(-0.45, -0.3, 0.15, 0, PI2); c.fill();
  c.restore();
};

// atajos de creación
const anillo = (x, y, r0, r1, col, lw, vida, add = false) => nueva(K.ANILLO, x, y, 0, 0, vida, { s: r0, s2: r1, col, lw, add });
const polvo = (x, y, vx, vy, r, col, vida = 0.5) => nueva(K.POLVO, x, y, vx, vy, vida, { s: r, s2: r * 2.3, col, k: 3, g: -25 });

/* ═════════════════════════ bucle y escenas ═════════════════════════ */
const escenas = []; // {t, dur, ev:[[t,fn]], paso(dt), fondo(c,e) bajo las partículas, pintar(c,e) sobre ellas, res, red, fijo}
let raf = 0, ultimo = 0;

function arrancar() { if (!raf && ctx) raf = requestAnimationFrame(tick); }

function reiniciar() {
  while (vivos.length) libres.push(vivos.pop());
  for (const e of escenas.splice(0)) { try { if (e.fin) e.fin(e); } catch { /* nada */ } e.res(); }
  if (lienzo) lienzo.style.opacity = '';
}

function avanzarEscenas(dt) {
  let hayRed = false;
  for (let i = escenas.length - 1; i >= 0; i--) {
    const e = escenas[i];
    e.t += dt;
    while (e.i < e.ev.length && e.ev[e.i][0] <= e.t) e.ev[e.i++][1](e);
    if (e.paso) e.paso(dt, e);
    if (e.red) { // movimiento reducido: solo fundido de la pieza central
      hayRed = true;
      lienzo.style.opacity = String(Math.min(tramo(e.t, 0, 0.25), 1 - tramo(e.t, e.dur - 0.35, e.dur)));
    }
    if (e.t >= e.dur) { escenas.splice(i, 1); if (e.fin) e.fin(e); if (e.red) lienzo.style.opacity = ''; e.res(); }
  }
  if (!hayRed && lienzo.style.opacity !== '') lienzo.style.opacity = '';
}

function tick(ahora) {
  raf = -1;   // «pintando»: lo que nazca durante este fotograma no programa otro bucle (antes se duplicaba y se pintaba N veces)
  if (!ctx) { raf = 0; return; }
  const dt = ultimo ? clamp((ahora - ultimo) / 1000, 0.001, 0.05) : 1 / 60;
  ultimo = ahora;
  try {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    avanzarEscenas(dt);
    avanzarParticulas(dt);
    for (let i = 0; i < escenas.length; i++) {
      const e = escenas[i];
      if (e.fondo) { ctx.save(); e.fondo(ctx, e); ctx.restore(); }
    }
    pintarParticulas();
    for (let i = 0; i < escenas.length; i++) {
      const e = escenas[i];
      if (e.pintar) { ctx.save(); e.pintar(ctx, e); ctx.restore(); }
    }
  } catch (err) {
    console.warn('[efectos]', err);
    reiniciar();
    ultimo = 0; raf = 0;
    return;
  }
  raf = 0;
  if (vivos.length || escenas.length) raf = requestAnimationFrame(tick);
  else { ultimo = 0; ctx.clearRect(0, 0, W, H); }
}

/* ═════════════════════════ 1 · WASHI ═════════════════════════ */
const WA = { crema: '#fffaf0', mand: '#e0520e', rojo: '#c8241a' };
const PAPELES = [['#f7b6c8', '#e58fa8'], ['#9fcfc6', '#78b3a8'], ['#f2b43a', '#d9962a'], ['#5b54c9', '#4540a6'], ['#e0520e', '#b8470f']];
const PETALOS = [['#f7b6c8', '#ea94ae'], ['#fbcfdb', '#f2a9bf']];
const T_WASHI = { dur: 3.0, sello: 1.3 }; // el «tok» de sonar('washi','celebrar') cae en sello

function chispaWashi(x, y, f) {
  const n = Math.round(7 + 5 * f), z = 0.9 + 0.12 * f;
  anillo(x, y, 6, 26 + 9 * f, WA.mand, 3.2, 0.5);
  for (let i = 0; i < n; i++) {
    const a = rnd(PI2), v = rnd(90, 230) * (1 + 0.1 * f), flor = Math.random() < 0.4, par = pick(flor ? PETALOS : PAPELES);
    nueva(flor ? K.PETALO : K.PAPEL, x, y, Math.cos(a) * v, Math.sin(a) * v - 90, rnd(0.62, 0.92), {
      g: 330, k: 2.2, rot: rnd(PI2), vr: rnd(-7, 7), s: (flor ? rnd(5.5, 8.5) : rnd(5.5, 9.5)) * z,
      col: par[0], col2: par[1], b: rnd(8, 15), sw: rnd(20, 50), swf: rnd(8, 12), fd: 0.65,
    });
  }
}

function confeti(x, y, vx, vy, vida, g) {
  const flor = Math.random() < 0.28, par = pick(flor ? PETALOS : PAPELES);
  nueva(flor ? K.PETALO : K.PAPEL, x, y, vx, vy, vida, {
    g, k: 1.6, rot: rnd(PI2), vr: rnd(-6, 6), s: flor ? rnd(6, 9) : rnd(6, 11),
    col: par[0], col2: par[1], b: rnd(7, 13), sw: rnd(25, 60), swf: rnd(3, 6), fd: 0.65,
  });
}

// sello rojo con tinta desgastada. forma: 'circ' | 'rect' | 'gran'
function sello(forma, texto, tam) {
  const w = forma === 'rect' ? tam * 0.7 : tam, h = tam;
  return enCache(`w|${forma}|${texto}|${Math.round(tam)}`, w, h, (g, q) => {
    g.fillStyle = g.strokeStyle = WA.rojo; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (forma === 'circ') {
      const r = tam / 2;
      g.lineWidth = tam * 0.075; g.beginPath(); g.arc(0, 0, r * 0.93, 0, PI2); g.stroke();
      g.lineWidth = tam * 0.022; g.beginPath(); g.arc(0, 0, r * 0.76, 0, PI2); g.stroke();
      g.font = F_ZEN(tam * 0.5); g.fillText(texto, 0, tam * 0.03);
      erosion(g, tam, tam, Math.round(tam * 1.6), tam * 0.02 + 0.8, true);
    } else if (forma === 'rect') {
      g.lineWidth = tam * 0.06; rr(g, -w / 2 + tam * 0.03, -h / 2 + tam * 0.03, w - tam * 0.06, h - tam * 0.06, tam * 0.06); g.stroke();
      g.lineWidth = tam * 0.018; rr(g, -w / 2 + tam * 0.1, -h / 2 + tam * 0.1, w - tam * 0.2, h - tam * 0.2, tam * 0.03); g.stroke();
      g.font = F_ZEN(w * 0.46);
      const [a, b] = [...texto];
      g.fillText(a, 0, -h * 0.215 + tam * 0.02); g.fillText(b, 0, h * 0.215 + tam * 0.02);
      erosion(g, w, h, Math.round(tam * 1.6), tam * 0.02 + 0.8, false);
    } else { // sello grande de profesora: texto en arco + flor
      const r = tam / 2;
      g.lineWidth = r * 0.07; g.beginPath(); g.arc(0, 0, r * 0.95, 0, PI2); g.stroke();
      g.lineWidth = r * 0.025; g.beginPath(); g.arc(0, 0, r * 0.84, 0, PI2); g.stroke();
      g.beginPath(); g.arc(0, 0, r * 0.47, 0, PI2); g.stroke();
      const cs = [...texto], span = 3.7, a0 = -PI / 2 - span / 2;
      g.font = F_ZEN(r * 0.27);
      cs.forEach((ch, i) => {
        g.save(); g.rotate(a0 + (i + 0.5) * span / cs.length + PI / 2);
        g.fillText(ch, 0, -r * 0.655); g.restore();
      });
      for (let i = -1; i <= 1; i++) {
        const a = PI / 2 + i * 0.3;
        g.beginPath(); g.arc(Math.cos(a) * r * 0.655, Math.sin(a) * r * 0.655, r * 0.035, 0, PI2); g.fill();
      }
      g.lineWidth = r * 0.032;
      for (let i = 0; i < 5; i++) {
        const a = -PI / 2 + i * PI2 / 5;
        g.beginPath(); g.arc(Math.cos(a) * r * 0.2, Math.sin(a) * r * 0.2, r * 0.135, 0, PI2); g.stroke();
      }
      g.beginPath(); g.arc(0, 0, r * 0.085, 0, PI2); g.fill();
      erosion(g, tam, tam, Math.round(tam * 3.2), r * 0.02 + 0.8, true);
    }
    parche(g, forma === 'rect' ? 'rect' : 'circ', w, h, q, 'rgba(255,250,240,.94)');
  });
}

function armarWashi(e, cx, cy) {
  const R = clamp(Math.min(W, H) * 0.27, 72, 180), D = R * 2, CAIDA = 0.3, TL = T_WASHI.sello, TB = TL - 0.3;
  e.dur = T_WASHI.dur;
  const grande = sello('gran', 'よくできました', D);
  const defs = [ // [dx, dy en radios, forma, texto, tamaño relativo, giro]
    [-1.75, -1.15, 'circ', '済', 0.36, -0.2], [1.7, -1.2, 'rect', '合格', 0.44, 0.18], [-1.95, 0.5, 'rect', '合格', 0.4, 0.12],
    [1.9, 0.55, 'circ', '済', 0.33, 0.25], [-1.0, 1.6, 'circ', '済', 0.4, 0.1], [1.05, 1.55, 'rect', '合格', 0.36, -0.25], [0.2, -1.85, 'circ', '済', 0.3, -0.12],
  ];
  const chicos = defs.map(([dx, dy, forma, txt, rel, rot], i) => {
    const tam = Math.max(34, D * rel), m = tam * 0.7;
    return { img: sello(forma, txt, tam), tam, rot, t0: 0.12 + i * 0.12, x: clamp(cx + dx * R, m, W - m), y: clamp(cy + dy * R, m, H - m) };
  });
  const lluvia = (n) => { for (let i = 0; i < n; i++) confeti(rnd(0, W), rnd(-30, -6), rnd(-40, 40), rnd(60, 200), rnd(1.5, 1.9), 420); };
  e.ev = [[0, () => lluvia(34)], [0.55, () => lluvia(22)], [1.0, () => lluvia(14)]];
  for (const s of chicos) {
    e.ev.push([s.t0 + CAIDA, () => { // polvillo al aterrizar
      for (let i = 0; i < 4; i++) {
        const d = i < 2 ? -1 : 1;
        polvo(s.x + d * s.tam * 0.4, s.y + s.tam * 0.5, d * rnd(30, 70), rnd(-20, 0), s.tam * 0.09, '#d8c2a0');
      }
    }]);
  }
  e.ev.push([TL, () => { // impacto del sello grande
    anillo(cx, cy, R * 0.85, R * 1.9, '#c9ad82', 7, 0.6);
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * PI2 + rnd(-0.2, 0.2);
      polvo(cx + Math.cos(a) * R * 0.9, cy + Math.sin(a) * R * 0.9, Math.cos(a) * rnd(80, 150), Math.sin(a) * rnd(80, 150) - 20, rnd(8, 15), '#d8c2a0', 0.6);
    }
    for (let i = 0; i < 30; i++) { const a = rnd(PI2), v = rnd(220, 560); confeti(cx, cy, Math.cos(a) * v, Math.sin(a) * v - 220, rnd(1.0, 1.4), 600); }
  }]);
  e.ev.sort((a, b) => a[0] - b[0]);

  e.pintar = (c) => {
    const t = e.fijo ?? e.t, sal = 1 - E.inCubic(tramo(t, 2.5, 3.0)), esc = 1 - 0.08 * (1 - sal);
    for (const s of chicos) {
      const u = t - s.t0;
      if (u < 0) continue;
      let y = s.y, sx = 1, sy = 1, a = 1;
      if (u < CAIDA) { const k = u / CAIDA; y -= (1 - E.inQuad(k)) * H * 0.5; sx = 0.9; sy = 1.12; a = Math.min(1, u / 0.08); }
      else { const m = muelle(u - CAIDA, 9, 24); sx = 1 + 0.26 * m; sy = 1 - 0.26 * m; }
      c.globalAlpha = a * sal;
      pegar(c, s.img, s.x, y, sx * esc, sy * esc, s.rot, true);
    }
    const u0 = t - TB; // sello grande: cae, aterriza con squash
    if (u0 > 0) {
      let sx, sy, a = 1, rot;
      if (t < TL) {
        const u = u0 / (TL - TB), sc = lerp(2.6, 1, E.inQuad(u));
        sx = sy = sc; a = Math.min(1, u * 3.5); rot = lerp(-0.45, -0.1, E.inQuad(u));
      } else {
        const v = t - TL, m = muelle(v, 8.5, 21), sc = 1 - 0.03 * muelle(v, 7, 15);
        sx = (1 + 0.14 * m) * sc; sy = (1 - 0.14 * m) * sc; rot = -0.1 + 0.03 * muelle(v, 6, 14);
      }
      c.globalAlpha = a * sal;
      pegar(c, grande, cx, cy, sx * esc, sy * esc, rot);
    }
  };
}

/* ═════════════════════════ 2 · NOCHE ═════════════════════════ */
const NO = { oro: '#ffb347', lampara: '#ff8a3d', blanco: '#fff3c4', magenta: '#f05a8a', cian: '#5fd4e8' };
// lanzamientos: l = salida, rise = subida; el sonido usa esta misma tabla
const SHELLS = [
  { l: 0.00, rise: 0.55, fx: 0.30, fy: 0.36, tipo: 'peonia', c1: NO.oro, c2: NO.lampara },
  { l: 0.28, rise: 0.62, fx: 0.72, fy: 0.30, tipo: 'crisantemo', c1: NO.magenta, c2: NO.blanco },
  { l: 0.58, rise: 0.60, fx: 0.50, fy: 0.44, tipo: 'corazon', c1: NO.magenta, c2: NO.blanco },
  { l: 0.86, rise: 0.55, fx: 0.18, fy: 0.26, tipo: 'anillo', c1: NO.cian, c2: NO.blanco },
  { l: 1.00, rise: 0.72, fx: 0.50, fy: 0.20, tipo: 'sauce', c1: NO.oro, c2: NO.lampara },
];
const T_NOCHE = { dur: 3.1 };

function chispaNoche(x, y, f) {
  const n = 12 + 7 * f;
  nueva(K.FOGONAZO, x, y, 0, 0, 0.24, { s: 4, s2: 22 + 6 * f, add: true });
  for (let i = 0; i < n; i++) {
    const a = rnd(PI2), v = rnd(70, 300) * (0.9 + 0.1 * f);
    nueva(K.CHISPA, x, y, Math.cos(a) * v, Math.sin(a) * v - 40, rnd(0.55, 0.9), {
      add: true, g: 280, k: 2.6, s: rnd(0.9, 1.8) * (0.9 + 0.08 * f), col: pick([NO.oro, NO.blanco, NO.oro, NO.lampara]), col2: NO.lampara, cut: 0.55, nt: 3, fd: 0.4,
    });
  }
}

function explotar(r, V) {
  const { s, ex: x, ey: y } = r;
  const ch = (vx, vy, vida, o) => nueva(K.CHISPA, x, y, vx, vy, vida, { add: true, g: 110, k: 2.3, s: rnd(1.3, 2.2), col: s.c1, col2: s.c2, cut: 0.6, fd: 0.55, fin: 1, nt: 3, ti: 0.025, ...o });
  nueva(K.FOGONAZO, x, y, 0, 0, 0.32, { s: V * 0.08, s2: V * 0.42, add: true });
  if (s.tipo === 'peonia') {
    for (let i = 0; i < 84; i++) {
      const a = rnd(PI2), v = V * (0.35 + 0.65 * Math.sqrt(Math.random()));
      ch(Math.cos(a) * v, Math.sin(a) * v, rnd(0.95, 1.25), { col: i % 3 ? s.c1 : s.c2 });
    }
  } else if (s.tipo === 'crisantemo') {
    for (let i = 0; i < 64; i++) {
      const a = i / 64 * PI2 + rnd(-0.04, 0.04), v = V * rnd(0.82, 1);
      ch(Math.cos(a) * v, Math.sin(a) * v, rnd(1.2, 1.5), { col: i % 2 ? s.c1 : s.c2, nt: 5, ti: 0.03, g: 70, k: 2.0, s: 1.8 });
    }
    for (let i = 0; i < 14; i++) { const a = rnd(PI2), v = V * rnd(0.2, 0.5); ch(Math.cos(a) * v, Math.sin(a) * v, rnd(0.8, 1.1), { col: s.c2 }); }
  } else if (s.tipo === 'corazon') {
    const m = V * 0.055;
    for (let i = 0; i < 54; i++) {
      const t = i / 54 * PI2 + rnd(-0.03, 0.03), hx = 16 * Math.sin(t) ** 3;
      const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      ch(hx * m, (hy - 1.5) * m, rnd(1.1, 1.4), { g: 60, nt: 2, s: rnd(1.6, 2.4) });
      if (i % 2) ch(hx * m * 0.55, (hy - 1.5) * m * 0.55, rnd(0.9, 1.2), { g: 60, col: s.c2 });
    }
  } else if (s.tipo === 'anillo') {
    const tilt = rnd(-0.5, 0.5), ct = Math.cos(tilt), st = Math.sin(tilt);
    const aro = (n, v, col) => {
      for (let i = 0; i < n; i++) {
        const a = i / n * PI2, px = Math.cos(a) * v, py = Math.sin(a) * v * 0.42;
        ch(px * ct - py * st, px * st + py * ct, rnd(1.0, 1.3), { col, g: 40, nt: 2 });
      }
    };
    aro(40, V * 0.95, s.c1); aro(26, V * 0.55, s.c2);
    for (let i = 0; i < 8; i++) { const a = rnd(PI2), v = V * rnd(0.1, 0.3); ch(Math.cos(a) * v, Math.sin(a) * v, rnd(0.7, 1.0), { col: s.c2 }); }
  } else { // sauce dorado (kamuro): cae pesado y gotea
    for (let i = 0; i < 80; i++) {
      const a = rnd(PI2), v = V * 0.9 * (0.2 + 0.8 * Math.random() ** 0.7);
      ch(Math.cos(a) * v, Math.sin(a) * v, rnd(1.1, 1.4), { g: 150, k: 1.6, nt: 5, ti: 0.05, cut: 0.5, s: 1.7, em: i % 2 ? 5 : 0, fin: 0 });
    }
  }
}

function armarNoche(e, cx, cy) {
  const V = 400 * escala();
  e.dur = T_NOCHE.dur;
  const cohetes = SHELLS.map((s) => ({
    s, vivo: false, x: 0, y: 0, px: 0, py: 0, acc: 0,
    ex: clamp(cx + (s.fx - 0.5) * W * 0.9, W * 0.12, W * 0.88), ey: clamp(cy + (s.fy - 0.5) * H * 0.9, H * 0.1, H * 0.75),
  }));
  for (const r of cohetes) {
    r.x0 = clamp(r.ex + rnd(-0.06, 0.06) * W, 8, W - 8);
    e.ev.push([r.s.l, () => { r.vivo = true; r.px = r.x = r.x0; r.py = r.y = H + 12; }]);
    e.ev.push([r.s.l + r.s.rise, () => { r.vivo = false; explotar(r, V); }]);
  }
  e.ev.sort((a, b) => a[0] - b[0]);
  e.paso = (dt) => {
    for (const r of cohetes) {
      if (!r.vivo) continue;
      const u = tramo(e.t, r.s.l, r.s.l + r.s.rise);
      r.px = r.x; r.py = r.y;
      r.x = lerp(r.x0, r.ex, u) + Math.sin(u * 14) * 3 * (1 - u);
      r.y = lerp(H + 12, r.ey, E.outQuad(u));
      r.acc += dt * 190; // chispas/s repartidas a lo largo del tramo recorrido: estela continua
      while (r.acc >= 1) {
        r.acc -= 1;
        const f = Math.random();
        nueva(K.CHISPA, lerp(r.px, r.x, f) + rnd(-1.2, 1.2), lerp(r.py, r.y, f), rnd(-14, 14), rnd(10, 50), rnd(0.3, 0.55),
          { add: true, g: 50, k: 1.5, s: rnd(0.7, 1.2), col: NO.oro, col2: NO.lampara, cut: 0.5, fd: 0.3, nt: 2 });
      }
    }
  };
  e.pintar = (c) => {
    c.globalCompositeOperation = 'lighter';
    if (e.red) { fuegoQuieto(c, cx, cy, Math.min(W, H) * 0.24); return; }
    for (const r of cohetes) {
      if (!r.vivo) continue;
      c.fillStyle = NO.blanco;
      c.globalAlpha = 0.25; c.beginPath(); c.arc(r.x, r.y, 7, 0, PI2); c.fill();
      c.globalAlpha = 1; c.beginPath(); c.arc(r.x, r.y, 2.2, 0, PI2); c.fill();
    }
  };
}

function fuegoQuieto(c, x, y, R) { // pieza central sin partículas (movimiento reducido)
  const cols = [NO.oro, NO.magenta, NO.cian, NO.blanco];
  c.lineCap = 'round';
  const g = c.createRadialGradient(x, y, 0, x, y, R * 1.1);
  g.addColorStop(0, 'rgba(255,179,71,.55)'); g.addColorStop(1, 'rgba(255,138,61,0)');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, R * 1.1, 0, PI2); c.fill();
  for (let i = 0; i < 36; i++) {
    const a = i / 36 * PI2, r1 = R * 0.3, r2 = R * (i % 2 ? 0.8 : 1);
    c.strokeStyle = c.fillStyle = cols[i % 4];
    c.lineWidth = 3;
    c.beginPath(); c.moveTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); c.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2); c.stroke();
    c.beginPath(); c.arc(x + Math.cos(a) * (r2 + 7), y + Math.sin(a) * (r2 + 7), 2.6, 0, PI2); c.fill();
  }
}

/* ═════════════════════════ 3 · POP ═════════════════════════ */
const POP = ['#ff4fa3', '#ffd23f', '#3ad1ff', '#7c3aed', '#2ee59d'];
const TONOS_POP = [ // [claro, base, oscuro] por letra
  ['#ff9fd0', '#ff4fa3', '#d12580'], ['#fff09a', '#ffd23f', '#f0a800'], ['#9be8ff', '#3ad1ff', '#1596cc'],
  ['#b99bff', '#7c3aed', '#5420b0'], ['#8ff5c8', '#2ee59d', '#12b87a'],
];
const T_POP = { dur: 3.0 };

function chispaPop(x, y, f) {
  const n = 6 + 3 * f;
  for (let i = 0; i < n; i++) {
    const a = -PI / 2 + rnd(-1.0, 1.0), v = rnd(300, 520) * (1 + 0.05 * f), estrella = Math.random() < 0.55;
    nueva(estrella ? K.ESTRELLA : K.CIRCULO, x, y, Math.cos(a) * v, Math.sin(a) * v, rnd(0.78, 0.9), {
      g: 1700, k: 0.3, kx: 1.6, piso: y + 40, reb: 0.5, rot: rnd(PI2), vr: rnd(-8, 8), s: rnd(7, 12) * (0.9 + 0.12 * f),
      col: pick(POP), out: INK, lw: 2.6,
    });
  }
}

function rayos(c, x, y, R, rot, alfa) { // sunburst pop-art
  const n = 14;
  c.save(); c.translate(x, y); c.rotate(rot);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, R);
  g.addColorStop(0, `rgba(255,210,63,${al(0.45 * alfa)})`); g.addColorStop(1, 'rgba(255,210,63,0)');
  c.fillStyle = g; c.beginPath();
  for (let i = 0; i < n; i++) {
    const a0 = i / n * PI2, a1 = a0 + PI2 / n * 0.5;
    c.moveTo(0, 0); c.lineTo(Math.cos(a0) * R, Math.sin(a0) * R); c.lineTo(Math.cos(a1) * R, Math.sin(a1) * R); c.closePath();
  }
  c.fill(); c.restore();
}

function armarPop(e, cx, cy) {
  const es = escala(), letras = [...'¡PERFECTO!'];
  e.dur = T_POP.dur;
  ctx.font = F_FRE(100);
  const ws0 = letras.map((ch) => ctx.measureText(ch).width), tot0 = ws0.reduce((a, b) => a + b, 0) + 3 * (letras.length - 1);
  const S = Math.min(clamp(Math.min(W * 0.15, H * 0.2), 34, 128), 100 * (W * 0.92) / tot0), sp = S * 0.03;
  const ws = ws0.map((w) => w * S / 100), tot = ws.reduce((a, b) => a + b, 0) + sp * (letras.length - 1);
  let acum = cx - tot / 2;
  const xs = ws.map((w) => { const x = acum + w / 2; acum += w + sp; return x; });
  const yBase = cy + S * 0.34, T0 = 0.15, DT = 0.07, CAIDA = 0.26;

  const canon = () => { // moneda / estrella desde abajo y las esquinas
    const g = 1500, v = Math.sqrt(2 * g * H * rnd(0.45, 0.85)), fuente = Math.random();
    let x0, vx;
    if (fuente < 0.5) { x0 = cx + rnd(-0.05, 0.05) * W; vx = rnd(-0.18, 0.18) * W; }
    else if (fuente < 0.75) { x0 = W * 0.04; vx = rnd(0.1, 0.3) * W; }
    else { x0 = W * 0.96; vx = -rnd(0.1, 0.3) * W; }
    const vida = Math.min(2 * v / g, e.dur - e.t - 0.1);
    if (Math.random() < 0.7) nueva(K.MONEDA, x0, H + 16, vx, -v, vida, { g, s: rnd(13, 20) * es, b: rnd(9, 15), rot: rnd(-0.3, 0.3), fd: 0.8 });
    else nueva(K.ESTRELLA, x0, H + 16, vx * 1.2, -v * 0.9, vida, { g, k: 0.1, s: rnd(10, 16) * es, col: pick(POP), out: INK, lw: 3, vr: rnd(-6, 6), fd: 0.8 });
  };
  e.acc = 0;
  e.paso = (dt) => {
    if (e.t < 0.05 || e.t > 0.9) return;
    e.acc += dt * 60;
    while (e.acc >= 1) { e.acc -= 1; canon(); }
  };
  e.ev = [];
  letras.forEach((ch, i) => { // confeti pequeño al aterrizar cada letra
    e.ev.push([T0 + i * DT + CAIDA, () => {
      for (let j = 0; j < 4; j++) {
        const a = -PI / 2 + rnd(-1.0, 1.0), v = rnd(180, 380);
        nueva(K.CIRCULO, xs[i], yBase - S * 0.3, Math.cos(a) * v, Math.sin(a) * v, 0.55,
          { g: 1200, k: 0.5, s: rnd(3.5, 6), col: TONOS_POP[(i + j) % 5][1], out: INK, lw: 2 });
      }
    }]);
  });
  e.ev.push([2.45, () => { // se va todo con un reventón de estrellas
    for (let i = 0; i < 22; i++) {
      const a = i / 22 * PI2 + rnd(-0.1, 0.1), v = rnd(300, 700);
      nueva(K.ESTRELLA, cx, cy, Math.cos(a) * v, Math.sin(a) * v, 0.5, { g: 700, k: 1, s: rnd(8, 14) * es, col: POP[i % 5], out: INK, lw: 2.6, vr: rnd(-8, 8), fd: 0.6 });
    }
  }]);
  e.pintar = (c) => {
    const t = e.fijo ?? e.t, salida = tramo(t, 2.45, 2.8);
    const ra = E.outBack(tramo(t, 0.05, 0.6)) * (1 - salida);
    if (ra > 0.01) rayos(c, cx, cy, Math.min(S * 5.2, Math.hypot(W, H) / 2) * ra, t * 0.35, 1 - salida);
    c.font = F_FRE(S); c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.lineJoin = 'round'; c.miterLimit = 2;
    letras.forEach((ch, i) => {
      const u = t - (T0 + i * DT);
      if (u < 0) return;
      let sx, sy, oy = 0, rot, a = 1;
      const lado = i % 2 ? 1 : -1;
      if (u < CAIDA) { const k = u / CAIDA; oy = -(yBase + S) * (1 - k * k); sx = 0.85; sy = 1.22; a = Math.min(1, u / 0.06); rot = lado * 0.25 * (1 - k); }
      else {
        const v = u - CAIDA, m = muelle(v, 6.5, 19);
        sx = 1 + 0.32 * m; sy = 1 - 0.38 * m; rot = lado * 0.12 * muelle(v, 5, 14);
        if (!e.red && v > 0.5) { // contoneo
          rot += Math.sin(t * 5 + i * 0.7) * 0.045; oy = Math.sin(t * 6 + i * 0.8) * S * 0.03;
          const pul = 1 + 0.03 * Math.sin(t * 7 + i); sx *= pul; sy *= pul;
        }
      }
      const ts = 2.45 + i * 0.025;
      if (t > ts) { const m = Math.max(0, 1 - E.inBack(tramo(t, ts, ts + 0.32))); sx *= m; sy *= m; }
      if (sx < 0.01) return;
      const tn = TONOS_POP[i % 5], lw = ws[i] + S * 0.5, lh = S * 1.3, base = S * 0.35;
      const o = enCache(`pop-letra-${ch}-${i % 5}-${Math.round(S)}`, lw, lh, (g) => {
        g.font = F_FRE(S); g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.lineJoin = 'round'; g.miterLimit = 2;
        g.translate(0, base); g.lineWidth = S * 0.2; g.strokeStyle = INK; g.fillStyle = INK;
        g.save(); g.translate(0, S * 0.07); g.strokeText(ch, 0, 0); g.fillText(ch, 0, 0); g.restore(); // extrusión
        g.strokeText(ch, 0, 0);
        const gr = g.createLinearGradient(0, -S * 0.75, 0, 0);
        gr.addColorStop(0, tn[0]); gr.addColorStop(0.55, tn[1]); gr.addColorStop(1, tn[2]);
        g.fillStyle = gr; g.fillText(ch, 0, 0);
      });
      c.save(); c.globalAlpha = a; c.translate(xs[i], yBase + oy); c.rotate(rot); c.scale(sx, sy);
      c.drawImage(o.cv, -o.w / 2, -base - o.h / 2, o.w, o.h);
      c.restore();
    });
  };
}

/* ═════════════════════════ 4 · SUMI ═════════════════════════ */
const T_SUMI = { dur: 3.0, sello: 1.85 };
const TINTAS = ['#1b1a19', '#34322f', '#55524e', '#7a7772'];

function chispaSumi(x, y, f) {
  const n = 8 + 4 * f;
  nueva(K.GOTA, x, y, 0, 0, rnd(0.75, 0.9), { s: rnd(8, 12) * (0.9 + 0.08 * f), col: TINTAS[1], b: rnd(PI2), a: 1, rot: rnd(PI2), fd: 0.45 });
  for (let i = 0; i < n; i++) {
    const a = rnd(PI2), v = rnd(100, 340) * (1 + 0.06 * f);
    nueva(K.GOTA, x, y, Math.cos(a) * v, Math.sin(a) * v, rnd(0.7, 0.95), {
      g: 100, k: 6, s: rnd(2.5, 6.5) * (1 + 0.08 * f), col: pick(TINTAS), a: v, b: rnd(PI2), rot: a, fd: 0.45,
    });
    if (i % 3 === 0) { // satélites
      for (let j = 0; j < 2; j++) {
        const v2 = v * rnd(1.15, 1.5), a2 = a + rnd(-0.25, 0.25);
        nueva(K.GOTA, x, y, Math.cos(a2) * v2, Math.sin(a2) * v2, rnd(0.65, 0.9), { g: 100, k: 5, s: rnd(1, 1.9), col: TINTAS[0], a: v2, b: rnd(PI2), rot: a2, fd: 0.45 });
      }
    }
  }
}

function armarSumi(e, cx, cy) {
  const Ro = clamp(Math.min(W, H) * 0.22, 44, 175), Wm = clamp(Ro * 0.17, 7, 28);
  const lado = Math.ceil((Ro * 1.62 + Wm) * 2), ox = cx - lado / 2, oy = cy - lado / 2, m = lado / 2;
  e.dur = T_SUMI.dur;
  const L = document.createElement('canvas');
  L.width = L.height = Math.ceil(lado * dpr);
  const g = L.getContext('2d');
  g.scale(dpr, dpr);
  g.lineCap = 'round'; g.strokeStyle = g.fillStyle = WA.rojo;

  // ── trayectoria: espiral hacia dentro (~1.3 vueltas) y luego el contorno de pétalos
  const n1 = Math.ceil(Ro * 2.6), n2 = Math.ceil(Ro * 5.2), n = n1 + n2, seed = rnd(100);
  const PX = new Float32Array(n), PY = new Float32Array(n), PW = new Float32Array(n), PD = new Float32Array(n);
  const a0 = -PI / 2 - 0.5 + rnd(-0.12, 0.12);
  for (let i = 0; i < n1; i++) {
    const s = i / (n1 - 1), ang = a0 - s * 1.3 * PI2;
    const r = (Ro * 0.34 + Ro * 0.66 * (1 - s ** 1.9)) * (1 + 0.07 * (vnoise(s * 6 + seed) - 0.5));
    PX[i] = m + Math.cos(ang) * r; PY[i] = m + Math.sin(ang) * r;
    PW[i] = Wm * (0.6 + 0.4 * (1 - s) ** 0.8) * (0.88 + 0.24 * vnoise(s * 13 + seed)) * (1 + 0.4 * Math.exp(-s * 28));
    PD[i] = 0.5 * tramo(s, 0.72, 1);
  }
  for (let j = 0; j < n2; j++) {
    const i = n1 + j, s = j / (n2 - 1), phi = s * PI2 * 1.03, lob = Math.abs(Math.sin(3 * phi)) ** 0.75; // 6 pétalos
    const r = Ro * (1.02 + 0.56 * lob) * (1 + 0.05 * (vnoise(s * 9 + seed + 40) - 0.5)), ang = a0 - phi;
    PX[i] = m + Math.cos(ang) * r; PY[i] = m + Math.sin(ang) * r;
    PW[i] = Wm * (0.95 - 0.5 * tramo(s, 0.55, 1)) * (0.88 + 0.24 * vnoise(s * 15 + seed + 20)) * (0.8 + 0.2 * Math.sqrt(lob));
    PD[i] = 0.06 + 0.66 * tramo(s, 0.5, 1) ** 1.4;
  }

  // ── un segmento de pincel: núcleo húmedo + cerdas que se «secan» según PD
  const segmento = (i) => {
    const w = PW[i], dry = PD[i];
    if (i === 0 || i === n1) { // al apoyar el pincel: gota de tinta
      g.globalAlpha = 0.95; g.beginPath(); g.arc(PX[i], PY[i], w * 0.7, 0, PI2); g.fill();
      return;
    }
    const x0 = PX[i - 1], y0 = PY[i - 1], x1 = PX[i], y1 = PY[i];
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
    if (dry < 0.5) {
      g.globalAlpha = 0.95 * (1 - dry); g.lineWidth = w * (0.85 - dry * 0.5);
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    }
    const B = 9;
    g.lineWidth = Math.max(0.6, w / B * 1.8);
    for (let b = 0; b < B; b++) {
      if (vnoise(b * 7.31 + i * 0.045 + seed) < dry * 1.05) continue; // cerda seca → hueco
      const off = (b / (B - 1) - 0.5) * w;
      g.globalAlpha = 0.5 + 0.45 * hash(b * 3.7 + i * 0.5);
      g.beginPath(); g.moveTo(x0 + nx * off, y0 + ny * off); g.lineTo(x1 + nx * off, y1 + ny * off); g.stroke();
    }
  };
  let hecho = 0;
  const hasta = (k) => { k = Math.min(k, n); while (hecho < k) segmento(hecho++); };
  const ease = (u) => 0.5 * E.inOutSine(u) + 0.5 * u;
  e.completar = () => hasta(n);
  e.paso = () => hasta(Math.floor(ease(tramo(e.t, 0, 0.62)) * n1) + Math.floor(ease(tramo(e.t, 0.7, 1.65)) * n2));

  // ── sello 「秀」 abajo a la derecha
  const ss = Math.max(34, Ro * 0.7), sxp = clamp(cx + Ro * 1.28, ss, W - ss), syp = clamp(cy + Ro * 1.2, ss, H - ss);
  const sel = enCache(`s|${Math.round(ss)}`, ss, ss, (q, qq) => {
    q.fillStyle = WA.rojo; rr(q, -ss / 2, -ss / 2, ss, ss, ss * 0.07); q.fill();
    q.strokeStyle = '#f6f5f2'; q.lineWidth = ss * 0.035; rr(q, -ss * 0.42, -ss * 0.42, ss * 0.84, ss * 0.84, ss * 0.03); q.stroke();
    q.fillStyle = '#f6f5f2'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.font = F_YUJI(ss * 0.62); q.fillText('秀', 0, ss * 0.03);
    erosion(q, ss, ss, Math.round(ss * 1.6), ss * 0.02 + 0.7, false);
    parche(q, 'rect', ss, ss, qq, 'rgba(246,245,242,.94)');
  });
  const gota = (x, y, dir, vmin, vmax, vida) => {
    const a = dir + rnd(-0.5, 0.5), v = rnd(vmin, vmax);
    nueva(K.GOTA, x, y, Math.cos(a) * v, Math.sin(a) * v, vida, { g: 80, k: 7, s: rnd(1.5, 5), col: pick([WA.rojo, WA.rojo, WA.rojo, WA.rojo, TINTAS[0]]), a: v, b: rnd(PI2), rot: a, fd: 0.88 });
  };
  e.ev = [
    [0.05, () => { for (let i = 0; i < 4; i++) gota(ox + PX[0], oy + PY[0], a0 - PI / 2, 120, 300, e.dur - 0.15); }],
    [1.62, () => { for (let i = 0; i < 8; i++) gota(ox + PX[n - 1], oy + PY[n - 1], a0 - 1.03 * PI2 + PI / 2, 140, 380, e.dur - 1.7); }],
    [T_SUMI.sello, () => {
      for (let i = 0; i < 5; i++) polvo(sxp + rnd(-0.4, 0.4) * ss, syp + ss * 0.45, rnd(-50, 50), rnd(-25, 0), ss * 0.14, '#8d8a85', 0.55);
      for (let i = 0; i < 6; i++) gota(sxp, syp, rnd(PI2), 100, 260, e.dur - T_SUMI.sello - 0.1);
    }],
  ];
  e.pintar = (c) => {
    const t = e.fijo ?? e.t, sal = 1 - E.inCubic(tramo(t, 2.55, 3.0));
    c.globalAlpha = sal;
    c.drawImage(L, ox, oy, lado, lado);
    const u = t - (T_SUMI.sello - 0.16);
    if (u > 0) {
      let sx, sy, a = 1;
      if (u < 0.16) { const k = u / 0.16; sx = sy = lerp(1.9, 1, E.inQuad(k)); a = Math.min(1, k * 4); }
      else { const mm = muelle(u - 0.16, 9, 24); sx = 1 + 0.22 * mm; sy = 1 - 0.22 * mm; }
      c.globalAlpha = a * sal;
      pegar(c, sel, sxp, syp, sx, sy, 0.1, true);
    }
  };
  e.fin = () => { L.width = L.height = 1; };
}

/* ═════════════════════════ 5 · HEISEI ═════════════════════════ */
const HE = { navy: '#0b1030', azul: '#3b7bff', cian: '#7ff3ff', rosa: '#ff5fd2', lima: '#c6ff3d' };
const BRILLOS = [HE.cian, HE.rosa, HE.lima, '#ffffff', HE.azul, '#ff9be6'];
const T_HEISEI = { dur: 2.9 };

function chispaHeisei(x, y, f) {
  const n = 8 + 4 * f;
  for (let i = 0; i < n; i++) {
    const a = rnd(PI2), v = rnd(40, 160) * (1 + 0.08 * f), cora = i % 4 === 0;
    if (cora) nueva(K.CORAZON, x, y, Math.cos(a) * v, Math.sin(a) * v - 30, rnd(0.7, 0.9), { g: -25, k: 1.8, s: rnd(4.5, 7.5), col: pick([HE.rosa, '#ff9be6']), rot: rnd(-0.4, 0.4), fd: 0.6 });
    else nueva(K.DESTELLO, x, y, Math.cos(a) * v, Math.sin(a) * v - 30, rnd(0.65, 0.9), { g: -25, k: 1.8, s: rnd(6, 13) * (1 + 0.1 * f), col: pick(BRILLOS), vr: rnd(-1.5, 1.5), fd: 0.6 });
  }
}

function tarjetaPath(c, w, h) { // memory card: esquina superior derecha cortada
  const r = w * 0.1, k = w * 0.28;
  c.beginPath();
  c.moveTo(-w / 2 + r, -h / 2); c.lineTo(w / 2 - k, -h / 2); c.lineTo(w / 2, -h / 2 + k); c.lineTo(w / 2, h / 2 - r);
  c.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); c.lineTo(-w / 2 + r, h / 2);
  c.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); c.lineTo(-w / 2, -h / 2 + r);
  c.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2); c.closePath();
}

function lente(c, u) { // barrido diagonal de lens flare, con fantasmas
  if (u <= 0 || u >= 1) return;
  const a = Math.sin(PI * u), px = lerp(-0.25 * W, 1.25 * W, E.inOutSine(u)), py = H * 0.4, bw = Math.max(W, H) * 0.07, big = Math.hypot(W, H);
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.translate(px, py); c.rotate(0.5);
  const g = c.createLinearGradient(-bw, 0, bw, 0);
  g.addColorStop(0, 'rgba(127,243,255,0)'); g.addColorStop(0.5, `rgba(255,255,255,${al(0.5 * a)})`); g.addColorStop(1, 'rgba(255,95,210,0)');
  c.fillStyle = g; c.fillRect(-bw, -big, bw * 2, big * 2);
  c.rotate(-0.5);
  const h = c.createLinearGradient(-bw * 6, 0, bw * 6, 0); // vena horizontal anamórfica
  h.addColorStop(0, 'rgba(127,243,255,0)'); h.addColorStop(0.5, `rgba(255,255,255,${al(0.75 * a)})`); h.addColorStop(1, 'rgba(127,243,255,0)');
  c.fillStyle = h; c.fillRect(-bw * 6, -1.5, bw * 12, 3);
  c.restore();
  c.save();
  c.globalCompositeOperation = 'lighter';
  const gc = [HE.cian, HE.rosa, HE.lima, HE.azul];
  for (let i = 0; i < 4; i++) { // fantasmas a lo largo del eje que cruza el centro
    const m = [0.45, 0.8, 1.35, 1.8][i], gx = W / 2 + (W / 2 - px) * m * 0.55, gy = H / 2 + (H / 2 - py) * m * 0.55, r = (10 + i * 9) * (0.5 + Math.max(W, H) / 1200);
    c.globalAlpha = 0.07 * a; c.fillStyle = gc[i]; c.beginPath(); c.arc(gx, gy, r, 0, PI2); c.fill();
    c.globalAlpha = 0.5 * a; c.strokeStyle = gc[i]; c.lineWidth = 1.5; c.beginPath(); c.arc(gx, gy, r, 0, PI2); c.stroke();
  }
  c.restore();
}

function armarHeisei(e, cx, cy) {
  const es = escala(), pw = clamp(W * 0.82, 280, 560), ph = pw * 0.46, r = ph * 0.14;
  const x0 = -pw / 2, y0 = -ph / 2, sx0 = x0 + ph * 0.1, sy0 = y0 + ph * 0.1, sw = pw - ph * 0.2, sh = ph * 0.8, pad = sh * 0.1;
  const iw = sh * 0.42, ih = iw * 1.3, tx = sx0 + pad + iw + pad * 1.2, tw = sx0 + sw - pad - tx;
  e.dur = T_HEISEI.dur;
  e.acc = 0;

  const rafaga = (n, v0) => { // salen del centro y pasan por encima del panel
    for (let i = 0; i < n; i++) {
      const a = rnd(PI2), v = rnd(160, v0) * es, vx = Math.cos(a) * v, vy = Math.sin(a) * v * 0.8 - 40, vida = rnd(0.8, 1.3);
      if (i % 4 === 0) nueva(K.CORAZON, cx, cy, vx, vy, vida, { g: 80, k: 1.9, s: rnd(8, 14) * es, col: pick([HE.rosa, '#ff9be6', HE.cian]), rot: rnd(-0.4, 0.4), fd: 0.6 });
      else if (i % 4 === 1) nueva(K.ESTRELLA, cx, cy, vx, vy, vida, { g: 60, k: 1.9, s: rnd(6, 11) * es, col: pick([HE.rosa, HE.lima, HE.cian]), out: '#ffffff', lw: 1.5, vr: rnd(-4, 4), fd: 0.6 });
      else nueva(K.DESTELLO, cx, cy, vx, vy, vida, { g: -30, k: 1.9, s: rnd(11, 27) * es, col: pick(BRILLOS), vr: rnd(-2, 2), fd: 0.6 });
    }
  };
  e.ev = [[0.12, () => rafaga(46, 900)], [2.35, () => rafaga(28, 800)]];
  e.paso = (dt) => { // brillos titilando en el borde del panel
    if (e.t < 0.5 || e.t > 2.3) return;
    e.acc += dt * 18;
    while (e.acc >= 1) {
      e.acc -= 1;
      const horiz = Math.random() < pw / (pw + ph), sg = Math.random() < 0.5 ? -1 : 1; // un punto del borde
      const px = horiz ? rnd(-pw / 2, pw / 2) : sg * pw / 2, py = horiz ? sg * ph / 2 : rnd(-ph / 2, ph / 2);
      nueva(K.DESTELLO, cx + px, cy + py, rnd(-20, 20), rnd(-50, -10), rnd(0.6, 0.9), { g: 0, k: 1, s: rnd(8, 17) * es, col: pick(BRILLOS), vr: rnd(-1, 1), fd: 0.6 });
    }
  };

  e.fondo = (c) => {
    const t = e.fijo ?? e.t;
    let s = 1, rot = 0;
    if (t < 0.5) { const u = t / 0.5; s = E.outBack(u); rot = -0.12 * (1 - u); }
    else if (t > 2.35) s = 1 - E.inBack(tramo(t, 2.35, 2.85));
    else if (!e.red) s *= 1 + 0.025 * muelle(t - 0.5, 5, 20); // latido al asentarse
    if (s > 0.001) {
      c.save();
      c.translate(cx, cy); c.rotate(rot); c.scale(s, s);
      // el panel quieto, pintado una vez (sombra difusa, degradados, líneas y textos costaban decenas de ms por fotograma)
      const panel = enCache(`heisei-panel-${Math.round(pw)}`, pw + 70, ph + 80, (g, q) => {
      // cuerpo cromado (la sombra va en píxeles del lienzo: se escala con él)
      g.save();
      g.shadowColor = 'rgba(11,16,48,.45)'; g.shadowBlur = 26 * q; g.shadowOffsetY = 8 * q;
      rr(g, x0, y0, pw, ph, r); g.fillStyle = '#9aa8c8'; g.fill();
      g.restore();
      const gb = g.createLinearGradient(0, y0, 0, y0 + ph);
      gb.addColorStop(0, '#ffffff'); gb.addColorStop(0.35, '#c9d3e6'); gb.addColorStop(0.62, '#7d8aa8'); gb.addColorStop(1, '#e9eef8');
      rr(g, x0, y0, pw, ph, r); g.fillStyle = gb; g.fill();
      g.lineWidth = 3; g.strokeStyle = HE.navy; g.stroke();
      g.save(); // brillo de gel
      rr(g, x0, y0, pw, ph, r); g.clip();
      const gg = g.createLinearGradient(0, y0, 0, y0 + ph * 0.55);
      gg.addColorStop(0, 'rgba(255,255,255,.8)'); gg.addColorStop(1, 'rgba(255,255,255,.05)');
      g.fillStyle = gg; g.beginPath();
      g.moveTo(x0, y0 + ph * 0.55); g.quadraticCurveTo(0, y0 + ph * 0.36, x0 + pw, y0 + ph * 0.55); g.lineTo(x0 + pw, y0); g.lineTo(x0, y0); g.closePath(); g.fill();
      g.restore();
      rr(g, x0 + 3, y0 + 3, pw - 6, ph - 6, r - 2); g.lineWidth = 1.5; g.strokeStyle = 'rgba(255,255,255,.85)'; g.stroke();

      // pantalla
      const gs = g.createLinearGradient(0, sy0, 0, sy0 + sh);
      gs.addColorStop(0, '#1a2f80'); gs.addColorStop(1, HE.navy);
      rr(g, sx0, sy0, sw, sh, r * 0.6); g.fillStyle = gs; g.fill();
      g.save(); rr(g, sx0, sy0, sw, sh, r * 0.6); g.clip();
      g.fillStyle = 'rgba(127,243,255,.05)';
      for (let yy = sy0; yy < sy0 + sh; yy += 3) g.fillRect(sx0, yy, sw, 1); // líneas de barrido
      g.restore();
      rr(g, sx0, sy0, sw, sh, r * 0.6); g.lineWidth = 2; g.strokeStyle = HE.azul; g.stroke();

      // memory card con LED
      const icx = sx0 + pad + iw / 2, icy = sy0 + sh * 0.44;
      g.save(); g.translate(icx, icy);
      const gt = g.createLinearGradient(-iw / 2, 0, iw / 2, 0);
      gt.addColorStop(0, '#7fb0ff'); gt.addColorStop(0.5, HE.azul); gt.addColorStop(1, '#1f3fb0');
      tarjetaPath(g, iw, ih); g.fillStyle = gt; g.fill();
      g.lineWidth = 1.6; g.strokeStyle = '#d6e4ff'; g.stroke();
      g.fillStyle = '#f2b43a';
      for (let i = 0; i < 5; i++) g.fillRect(-iw * 0.34 + i * iw * 0.15, ih / 2 - ih * 0.2, iw * 0.1, ih * 0.14);
      const gl = g.createLinearGradient(0, -ih * 0.3, 0, ih * 0.04);
      gl.addColorStop(0, '#ffffff'); gl.addColorStop(1, '#bfeaff');
      rr(g, -iw * 0.32, -ih * 0.3, iw * 0.64, ih * 0.34, iw * 0.06); g.fillStyle = gl; g.fill();
      g.save(); g.translate(0, -ih * 0.13); g.scale(iw * 0.12, iw * 0.12); g.fillStyle = HE.rosa; corazonPath(g); g.fill(); g.restore();
      g.restore();

      // textos
      const txt = 'セーブしました', sub = '¡Guardado!';
      g.font = F_DOT(100);
      const fs = Math.min(sh * 0.25, 100 * tw / g.measureText(txt).width), ty = sy0 + sh * 0.27;
      g.font = F_DOT(fs); g.textAlign = 'left'; g.textBaseline = 'middle'; g.lineJoin = 'round';
      g.lineWidth = fs * 0.2; g.strokeStyle = HE.navy; g.strokeText(txt, tx, ty);
      g.globalAlpha = 0.85; g.fillStyle = HE.rosa; g.fillText(txt, tx + 1.3, ty + 0.7);
      g.fillStyle = HE.cian; g.fillText(txt, tx - 1.3, ty - 0.7);
      g.globalAlpha = 1; g.fillStyle = '#ffffff'; g.fillText(txt, tx, ty);
      g.font = F_DOT(fs * 0.62); g.lineWidth = fs * 0.14; g.strokeStyle = HE.navy; g.strokeText(sub, tx, sy0 + sh * 0.5);
      g.fillStyle = HE.cian; g.fillText(sub, tx, sy0 + sh * 0.5);
      });
      c.drawImage(panel.cv, -panel.w / 2, -panel.h / 2, panel.w, panel.h);
      // el LED de la tarjeta parpadea
      { const icx = sx0 + pad + iw / 2, icy = sy0 + sh * 0.44; c.save(); c.translate(icx, icy);
      const on = e.red || t >= 1.2 || Math.floor(t * 14) % 2 === 0, lx = -iw * 0.3, ly = -ih * 0.4, lr = iw * 0.055;
      if (on) { c.fillStyle = 'rgba(198,255,61,.3)'; c.beginPath(); c.arc(lx, ly, lr * 2.6, 0, PI2); c.fill(); }
      c.fillStyle = on ? HE.lima : '#2b4a10'; c.beginPath(); c.arc(lx, ly, lr, 0, PI2); c.fill();
      if (on) { c.fillStyle = '#fff'; c.beginPath(); c.arc(lx - lr * 0.3, ly - lr * 0.3, lr * 0.35, 0, PI2); c.fill(); }
      c.restore(); }

      // barra de progreso con barrido de brillo
      const by = sy0 + sh * 0.7, bh = sh * 0.14, p = e.red ? 1 : E.outCubic(tramo(t, 0.35, 1.15));
      rr(c, tx, by, tw, bh, bh / 2); c.fillStyle = '#060a22'; c.fill();
      c.lineWidth = 1.5; c.strokeStyle = 'rgba(255,255,255,.55)'; c.stroke();
      if (p > 0.01) {
        const fw = Math.max(bh - 4, (tw - 4) * p);
        c.save(); rr(c, tx + 2, by + 2, fw, bh - 4, (bh - 4) / 2); c.clip();
        const gp = c.createLinearGradient(tx, 0, tx + tw, 0);
        gp.addColorStop(0, HE.azul); gp.addColorStop(1, HE.cian);
        c.fillStyle = gp; c.fillRect(tx + 2, by + 2, fw, bh - 4);
        c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(tx + 2, by + 2, fw, (bh - 4) * 0.45);
        if (!e.red) {
          const bx = tx + (tw + bh * 2) * E.inOutSine(tramo(t, 0.4, 1.35)) - bh;
          c.save(); c.translate(bx, by + bh / 2); c.transform(1, 0, -0.5, 1, 0, 0);
          c.fillStyle = 'rgba(255,255,255,.75)'; c.fillRect(-bh * 0.4, -bh, bh * 0.8, bh * 2); c.restore();
        }
        c.restore();
      }
      c.restore();
    }
  };
  e.pintar = (c) => { if (!e.red) lente(c, tramo(e.fijo ?? e.t, 0.55, 1.5)); }; // el flare cruza por encima de todo
}

/* ═════════════════════════ API: chispa / celebrar ═════════════════════════ */
const CHISPAS = { washi: chispaWashi, noche: chispaNoche, pop: chispaPop, sumi: chispaSumi, heisei: chispaHeisei };
const ARMAR = { washi: armarWashi, noche: armarNoche, pop: armarPop, sumi: armarSumi, heisei: armarHeisei };
const FIJO = { washi: 2.2, noche: 0, pop: 2.0, sumi: 2.3, heisei: 1.7 }; // instante «terminado» para movimiento reducido

export function chispa(tema, x, y, fuerza = 1) {
  try {
    if (!ctx || reducido()) return;
    if (!raf) ajustar();
    const f = clamp(Number(fuerza) || 1, 1, 4);
    CHISPAS[nTema(tema)](Number.isFinite(x) ? x : W / 2, Number.isFinite(y) ? y : H / 2, f);
  } catch (err) { console.warn('[efectos] chispa', err); }
}

// pinta una vez, fuera de la vista, la escena de un tema y cada tipo de partícula: así los sprites y las fuentes ya
// están listos cuando toca celebrar (la primera vez ya no se atasca)
export function calentar(tema) {
  try {
    if (!ctx) return;
    if (!raf) ajustar();
    const t = nTema(tema), off = document.createElement('canvas'); off.width = 64; off.height = 64;
    const c = off.getContext('2d'), antes = vivos.length;
    const e = { t: 0, i: 0, dur: 3, ev: [], res: () => {}, paso: null, pintar: null, fin: null, red: false, fijo: undefined };
    ARMAR[t](e, W / 2, H / 2);
    for (const tt of [0.3, 0.8, 1.4, 2.1, 2.6]) { e.t = tt; try { e.fondo?.(c, e); e.pintar?.(c, e); } catch { /* sigue */ } }
    const p = crearP(); p.s = 10; p.s2 = 30; p.col = '#ffd23f'; p.col2 = '#ff4fa3'; p.t = 0.3; p.vida = 1; p.b = 10;
    for (let k = 0; k < DIB.length; k++) { try { DIB[k]?.(c, p, 0.3); } catch { /* sigue */ } }
    while (vivos.length > antes) libres.push(vivos.pop());   // lo que la escena haya soltado no se ve
  } catch (err) { console.warn('[efectos] calentar', err); }
}

export function celebrar(tema, pos = {}) {
  return new Promise((res) => {
    try {
      if (!ctx) { res(); return; }
      if (!raf) ajustar();
      const t = nTema(tema), { x, y } = pos || {};
      const cx = Number.isFinite(x) ? x : W / 2, cy = Number.isFinite(y) ? y : H / 2;
      const e = { t: 0, i: 0, dur: 3, ev: [], res, paso: null, pintar: null, fin: null, red: false, fijo: undefined };
      ARMAR[t](e, cx, cy);
      if (reducido()) { // solo la pieza central, con un fundido corto
        e.ev = []; e.paso = null; e.red = true; e.fijo = FIJO[t]; e.dur = 1.5;
        if (e.completar) e.completar();
      }
      escenas.push(e);
      arrancar();
    } catch (err) { console.warn('[efectos] celebrar', err); res(); }
  });
}

/* ═════════════════════════ sonido (WebAudio sintetizado) ═════════════════════════ */
let ac = null, bus = null, busMaestro = null, mst = null, ruidoBuf = null, mudo = false;

function audio() {
  if (mudo) return null;
  try {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
      const comp = ac.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 5;
      mst = ac.createGain(); mst.gain.value = 0.12; // volumen general bajo
      busMaestro = bus = ac.createGain();
      bus.connect(comp); comp.connect(mst); mst.connect(ac.destination);
      ruidoBuf = ac.createBuffer(1, ac.sampleRate | 0, ac.sampleRate);
      const d = ruidoBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    return ac;
  } catch { return null; }
}

export function silencio(si) {
  mudo = !!si;
  try { if (mst && ac) mst.gain.setTargetAtTime(mudo ? 0 : 0.12, ac.currentTime, 0.01); } catch { /* nada */ }
}

// oscilador con envolvente. o: f2/glide (deslizamiento), det, atk, rel (sostiene y suelta), lp
function tono(a, tipo, f, t, dur, vol, o = {}) {
  const osc = a.createOscillator(), g = a.createGain(), atk = o.atk ?? 0.004;
  osc.type = tipo;
  osc.frequency.setValueAtTime(f, t);
  if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + (o.glide || dur));
  if (o.det) osc.detune.value = o.det;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + atk);
  if (o.rel) g.gain.setValueAtTime(vol, t + Math.max(atk, dur - o.rel));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let nodo = osc;
  if (o.lp) { const fl = a.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = o.lp; osc.connect(fl); nodo = fl; }
  nodo.connect(g); g.connect(bus);
  osc.start(t); osc.stop(t + dur + 0.05);
}

// ruido filtrado. o: tipo, f0→f1, q, pico (fracción de dur donde llega al máximo)
function ruido(a, t, dur, vol, o = {}) {
  const src = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain();
  src.buffer = ruidoBuf; src.loop = true;
  fl.type = o.tipo || 'bandpass'; fl.Q.value = o.q ?? 1;
  fl.frequency.setValueAtTime(o.f0 || 1000, t);
  if (o.f1) fl.frequency.exponentialRampToValueAtTime(o.f1, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + Math.max(0.002, (o.pico ?? 0.05) * dur));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(fl); fl.connect(g); g.connect(bus);
  src.start(t, Math.random() * 0.8); src.stop(t + dur + 0.05);
}

// FM «de cristal»: portadora + moduladora cuyo índice cae rápido
function fm(a, midi, t, dur, vol, ratio = 3.5, idx = 2.2) {
  const f = mtof(midi), car = a.createOscillator(), mod = a.createOscillator(), mg = a.createGain(), g = a.createGain();
  car.frequency.value = f; mod.frequency.value = f * ratio;
  mg.gain.setValueAtTime(f * idx, t); mg.gain.exponentialRampToValueAtTime(f * 0.01, t + dur * 0.7);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  mod.connect(mg); mg.connect(car.frequency); car.connect(g); g.connect(bus);
  car.start(t); mod.start(t); car.stop(t + dur + 0.05); mod.stop(t + dur + 0.05);
}

const koto = (a, t, m, vol = 0.5, dur = 0.9) => { // pulsación de koto
  const f = mtof(m);
  tono(a, 'sine', f * 1.015, t, dur, vol, { f2: f, glide: 0.04 });
  tono(a, 'triangle', f * 2, t, dur * 0.45, vol * 0.35);
  ruido(a, t, 0.025, vol * 0.25, { f0: f * 3, q: 2 });
};
const tok = (a, t, vol = 0.7) => { // madera suave
  tono(a, 'triangle', 540, t, 0.1, vol, { f2: 330 });
  tono(a, 'sine', 130, t, 0.14, vol * 0.8, { f2: 70 });
  ruido(a, t, 0.03, vol * 0.5, { f0: 1300, q: 2.5 });
};
const campana = (a, t, m, vol = 0.4, dur = 0.7) => { // campanilla con parciales inarmónicos
  const f = mtof(m);
  tono(a, 'sine', f, t, dur, vol);
  tono(a, 'sine', f * 2.76, t, dur * 0.6, vol * 0.3);
  tono(a, 'sine', f * 5.4, t, dur * 0.25, vol * 0.12);
};
const chip = (a, t, m, d, vol = 0.16, tipo = 'square') => tono(a, tipo, mtof(m), t, d, vol, { atk: 0.002, rel: Math.min(0.03, d * 0.4), lp: 5000 });
const madera = (a, t, f = 1500, vol = 0.5, dur = 0.09) => { // golpe de madera (hyoshigi)
  tono(a, 'sine', f, t, dur, vol, { f2: f * 0.7 });
  tono(a, 'triangle', f * 2.4, t, dur * 0.5, vol * 0.4);
  ruido(a, t, 0.02, vol * 0.6, { f0: f * 1.8, q: 3 });
};

const SON = {
  washi: {
    clic: (a, t) => koto(a, t, 81, 0.5, 0.55),
    pop: (a, t) => { koto(a, t, 81, 0.3, 0.3); koto(a, t + 0.06, 86, 0.45, 0.6); },
    fallo: (a, t) => { tono(a, 'sine', 160, t, 0.22, 0.7, { f2: 62, glide: 0.18 }); ruido(a, t, 0.09, 0.35, { tipo: 'lowpass', f0: 420, q: 0.7 }); },
    tema: (a, t) => { ruido(a, t, 0.42, 0.5, { f0: 700, f1: 4200, q: 0.8, pico: 0.45 }); ruido(a, t + 0.04, 0.3, 0.2, { tipo: 'highpass', f0: 3000, q: 0.5, pico: 0.5 }); },
    celebrar: (a, t) => { // escala «in» D E F A Bb, y el tok cuando cae el sello
      [74, 76, 77, 81, 82, 86].forEach((m, i) => koto(a, t + i * 0.15, m, 0.42, 1.0));
      tok(a, t + T_WASHI.sello, 0.75);
      koto(a, t + T_WASHI.sello + 0.1, 86, 0.25, 0.9);
    },
  },
  noche: {
    clic: (a, t) => campana(a, t, 88, 0.35, 0.45),
    pop: (a, t) => { campana(a, t, 93, 0.3, 0.35); campana(a, t + 0.05, 100, 0.2, 0.3); },
    fallo: (a, t) => { tono(a, 'sine', 120, t, 0.45, 0.8, { f2: 50, glide: 0.25 }); ruido(a, t, 0.06, 0.35, { tipo: 'lowpass', f0: 250, q: 0.7 }); },
    tema: (a, t) => { // furin
      [84, 86, 88, 91, 93, 96].forEach((m) => campana(a, t + rnd(0, 0.55), m, 0.2, 1.3));
    },
    celebrar: (a, t) => { // silbido de subida + estallido + crepitar por cada bengala
      for (const s of SHELLS) {
        const tl = t + s.l, tb = tl + s.rise;
        tono(a, 'sine', 520, tl, s.rise, 0.09, { f2: 1900, glide: s.rise * 0.95, atk: 0.1 });
        ruido(a, tb, 0.55, 0.9, { tipo: 'lowpass', f0: 1400, f1: 90, q: 0.8, pico: 0.02 });
        tono(a, 'sine', 85, tb, 0.5, 0.8, { f2: 38, glide: 0.4 });
        const n = 8 + ((Math.random() * 6) | 0);
        for (let i = 0; i < n; i++) ruido(a, tb + rnd(0.45, 1.2), 0.012, 0.25, { tipo: 'highpass', f0: 3500, q: 0.7, pico: 0.1 });
      }
    },
  },
  pop: {
    clic: (a, t) => chip(a, t, 81, 0.06),
    pop: (a, t) => tono(a, 'square', 600, t, 0.11, 0.16, { f2: 1500, atk: 0.002, rel: 0.03, lp: 5000 }),
    fallo: (a, t) => { tono(a, 'square', 311, t, 0.42, 0.18, { f2: 77, atk: 0.002, lp: 900 }); tono(a, 'triangle', 156, t, 0.42, 0.22, { f2: 39 }); },
    tema: (a, t) => { chip(a, t, 83, 0.06); chip(a, t + 0.07, 88, 0.3); },
    celebrar: (a, t) => { // «level clear» en do mayor, ~1.55 s
      const s = 0.09;
      [[72, 0], [76, 1], [79, 2], [84, 3], [79, 5], [84, 6]].forEach(([m, i]) => chip(a, t + i * s, m, s * 0.9));
      tono(a, 'square', mtof(88), t + 7 * s, 0.4, 0.16, { atk: 0.002, rel: 0.1, lp: 5000 });
      [[84, 1.05], [88, 1.12], [91, 1.19]].forEach(([m, d]) => chip(a, t + d, m, 0.07));
      tono(a, 'square', mtof(96), t + 1.26, 0.32, 0.15, { atk: 0.002, rel: 0.15, lp: 6000 });
      [[48, 0, 0.36], [43, 0.45, 0.27], [48, 0.72, 0.3], [41, 1.05, 0.14], [43, 1.19, 0.1], [48, 1.26, 0.3]]
        .forEach(([m, d, du]) => tono(a, 'triangle', mtof(m), t + d, du, 0.28, { atk: 0.003, rel: 0.04 }));
    },
  },
  sumi: {
    clic: (a, t) => madera(a, t, 1500, 0.5, 0.09),
    pop: (a, t) => madera(a, t, 2100, 0.35, 0.06),
    fallo: (a, t) => { madera(a, t, 190, 0.8, 0.16); ruido(a, t, 0.08, 0.3, { tipo: 'lowpass', f0: 500, q: 0.7 }); },
    tema: (a, t) => { ruido(a, t, 0.75, 0.45, { f0: 500, f1: 2600, q: 0.7, pico: 0.45 }); ruido(a, t + 0.1, 0.55, 0.15, { tipo: 'highpass', f0: 2500, q: 0.5, pico: 0.5 }); },
    celebrar: (a, t) => { // dos pinceladas (espiral y pétalos) + «kon» del sello + campana grave
      ruido(a, t, 0.66, 0.5, { f0: 700, f1: 2400, q: 0.8, pico: 0.3 });
      ruido(a, t + 0.7, 0.95, 0.45, { f0: 600, f1: 1800, q: 0.8, pico: 0.35 });
      ruido(a, t + 1.1, 0.5, 0.18, { tipo: 'highpass', f0: 3000, q: 0.5, pico: 0.5 });
      const k = t + T_SUMI.sello;
      madera(a, k, 880, 0.8, 0.22);
      campana(a, k, 52, 0.28, 1.5);
    },
  },
  heisei: {
    clic: (a, t) => fm(a, 93, t, 0.3, 0.35),
    pop: (a, t) => fm(a, 98, t, 0.28, 0.3, 3.5, 1.6),
    fallo: (a, t) => { tono(a, 'sine', 520, t, 0.18, 0.4, { f2: 260 }); tono(a, 'sine', 440, t + 0.1, 0.2, 0.35, { f2: 300 }); },
    tema: (a, t) => {
      tono(a, 'sine', 400, t, 0.45, 0.25, { f2: 3200, atk: 0.05 });
      tono(a, 'sine', 800, t, 0.45, 0.15, { f2: 6400, atk: 0.05, det: 7 });
      fm(a, 100, t + 0.3, 0.4, 0.2);
    },
    celebrar: (a, t) => { // pad de arranque de consola → campanitas al guardar
      [50, 57, 62, 66, 69, 73].forEach((m, i) => {
        const f = mtof(m);
        [-6, 6].forEach((det) => tono(a, 'sine', f, t + i * 0.05, 2.7, 0.09, { atk: 0.7, rel: 1.4, det }));
      });
      ruido(a, t, 1.2, 0.18, { f0: 2000, f1: 7000, q: 1.2, pico: 0.7 });
      [86, 90, 93, 98].forEach((m, i) => fm(a, m, t + 1.0 + i * 0.085, 0.9, 0.3));
      fm(a, 105, t + 1.4, 1.1, 0.22);
    },
  },
};

// Compensación de nivel medida con render offline: igualan clics y fanfarrias (el volumen general sigue en 0.12)
const GAN = {
  washi: { clic: 2, pop: 1.1, fallo: 2, tema: 1.15, celebrar: 1.1 },
  noche: { clic: 2.7, pop: 2.2, fallo: 1.5, tema: 0.9, celebrar: 1 },
  pop: { clic: 4.5, pop: 3, fallo: 3.2, tema: 2.2, celebrar: 1.2 },
  sumi: { clic: 3, pop: 4, fallo: 1.8, tema: 1.4, celebrar: 1.15 },
  heisei: { clic: 3.8, pop: 4.2, fallo: 1.7, tema: 1.7, celebrar: 1 },
};

export function sonar(tema, que) {
  try {
    const a = audio();
    if (!a) return;
    const t = nTema(tema), f = SON[t][que];
    if (!f) return;
    const g = a.createGain(); // ganancia propia de esta llamada: todas las voces cuelgan de ella
    g.gain.value = GAN[t][que] ?? 1;
    g.connect(busMaestro);
    bus = g;
    try { f(a, a.currentTime + 0.02); } finally { bus = busMaestro; }
  } catch { /* el sonido nunca rompe la app */ }
}
