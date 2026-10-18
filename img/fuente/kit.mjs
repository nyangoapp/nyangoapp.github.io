// Kit de ilustración de Nyango: figuras de vinilo / pegatina en SVG.
// Cada figura se compone de «piezas». El render hace dos pasadas:
//   1) silueta: todas las piezas en tinta con un trazo grueso (el contorno exterior de pegatina);
//   2) cuerpo: cada pieza con su color, un velo de volumen (luz arriba-izquierda, sombra abajo-derecha)
//      y una línea interior más fina. Encima van detalles y brillos especulares suaves.
// Así todas las ilustraciones comparten grosor de línea, luz y acabado.

export const TINTA = '#2a211a';
export const PALETA = {
  ocre: '#8e7747', ocreOsc: '#6a5733', ocreLuz: '#b09a63',
  tatami: '#c2b27a', tatamiOsc: '#a8965e',
  madera: '#6f4c30', maderaLuz: '#94693f', maderaClara: '#c89a5e', bambu: '#dcbb78',
  crema: '#f7efdf', arroz: '#fbf7ee', papel: '#f4ead6',
  naranja: '#f2661b', naranjaLuz: '#ff8a45', mikan: '#f59a23',
  rojo: '#d8412a', rojoOsc: '#a8301f', granate: '#8e2a22',
  rubor: '#f2a3a3', rosa: '#f4a9b8', rosaLuz: '#fbd3dd',
  te: '#7c8f3c', teLuz: '#a6bf5e', hoja: '#6f8a34',
  anil: '#2f4a7a', anilLuz: '#4f6fa6', cielo: '#cfe7ee', agua: '#7cc4d6',
  oro: '#f2b43a', oroOsc: '#d08f22', oroLuz: '#ffd77a',
  laca: '#2e2420', piedra: '#d9d2c2', piedraOsc: '#a9a291', gris: '#8d8a86',
};

const num = (v) => (typeof v === 'number' ? +v.toFixed(1) : v);
const atr = (a) => Object.entries(a).filter(([, v]) => v !== undefined && v !== null && v !== false).map(([k, v]) => `${k}="${num(v)}"`).join(' ');

// tam: tamaño del viewBox. base: espacio en el que se dibuja (se escala a tam). grosor: multiplicador de línea.
export function lienzo(id, tam = 256, { base = tam, grosor = 1 } = {}) {
  const esc = (base / 256) * grosor;
  const S = 12 * esc; // trazo de la silueta (la mitad asoma por fuera)
  const IN = 6 * esc; // línea interior
  const piezas = [];
  const fondo = [];
  const defs = [];
  const usados = new Set();
  const k = {
    id: (s) => `${id}-${s}`, esc, S, IN, tam, base, grupo: null,
    def(s) { defs.push(s); return k; },
    clip(nombre, forma) { defs.push(`<clipPath id="${k.id(nombre)}">${forma}</clipPath>`); return `url(#${k.id(nombre)})`; },
    fondo(s) { fondo.push(s); return k; },
    pieza(tag, a, fill, o = {}) { piezas.push({ tag, a, fill, o }); return k; },
    p: (d, f, o) => k.pieza('path', { d }, f, o),
    e: (cx, cy, rx, ry, f, o) => k.pieza('ellipse', { cx, cy, rx, ry }, f, o),
    c: (cx, cy, r, f, o) => k.pieza('circle', { cx, cy, r }, f, o),
    r: (x, y, w, h, rx, f, o) => k.pieza('rect', { x, y, width: w, height: h, rx }, f, o),
    // trazo grueso con contorno (cuerdas, palillos, vapor…)
    tubo(d, color, w, o = {}) { piezas.push({ tubo: true, d, color, w, o }); return k; },
    raw(s) { piezas.push({ raw: s }); return k; },
    linea(d, w = IN, color = TINTA, extra = '') {
      piezas.push({ raw: `<path d="${d}" fill="none" stroke="${color}" stroke-width="${num(w)}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>` });
      return k;
    },
    // brillo especular suave
    brillo(cx, cy, rx, ry, rot = 0, op = 1) {
      usados.add('b');
      piezas.push({ raw: `<ellipse ${atr({ cx, cy, rx, ry })} transform="rotate(${num(rot)} ${num(cx)} ${num(cy)})" fill="url(#${k.id('_b')})" opacity="${op}"/>` });
      return k;
    },
    // punto de brillo nítido (ojos, cristal)
    punto(cx, cy, r, op = 0.95) { piezas.push({ raw: `<circle ${atr({ cx, cy, r })} fill="#fff" opacity="${op}"/>` }); return k; },
    sombra(cx, cy, rx, ry, op = 1) {
      usados.add('s');
      fondo.push(`<ellipse ${atr({ cx, cy, rx, ry })} fill="url(#${k.id('_s')})" opacity="${op}"/>`);
      return k;
    },
    halo(cx, cy, r, color, op = 0.55) {
      const g = k.id('h' + fondo.length);
      defs.push(`<radialGradient id="${g}"><stop offset="0" stop-color="${color}" stop-opacity="${op}"/><stop offset=".5" stop-color="${color}" stop-opacity="${op * 0.45}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`);
      fondo.push(`<circle ${atr({ cx, cy, r })} fill="url(#${g})"/>`);
      return k;
    },
    render() { return renderizar(k, id, tam, piezas, fondo, defs, usados); },
  };
  return k;
}

function velo(id, tipo) {
  const osc = '#3b2508';
  if (tipo === 'h') return `<linearGradient id="${id}-_h" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="${osc}" stop-opacity=".22"/><stop offset=".2" stop-color="#fff" stop-opacity=".30"/><stop offset=".42" stop-color="#fff" stop-opacity="0"/><stop offset=".72" stop-color="${osc}" stop-opacity="0"/><stop offset="1" stop-color="${osc}" stop-opacity=".34"/></linearGradient>`;
  if (tipo === 'v') return `<linearGradient id="${id}-_v" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".32"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/><stop offset=".68" stop-color="${osc}" stop-opacity="0"/><stop offset="1" stop-color="${osc}" stop-opacity=".30"/></linearGradient>`;
  if (tipo === 'b') return `<radialGradient id="${id}-_b"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".55" stop-color="#fff" stop-opacity=".62"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`;
  if (tipo === 's') return `<radialGradient id="${id}-_s"><stop offset="0" stop-color="${TINTA}" stop-opacity=".34"/><stop offset=".6" stop-color="${TINTA}" stop-opacity=".16"/><stop offset="1" stop-color="${TINTA}" stop-opacity="0"/></radialGradient>`;
  // radial por defecto: luz arriba-izquierda, sombra abajo-derecha
  return `<radialGradient id="${id}-_r" cx=".38" cy=".3" r=".86" fx=".32" fy=".22"><stop offset="0" stop-color="#fff" stop-opacity=".34"/><stop offset=".36" stop-color="#fff" stop-opacity="0"/><stop offset=".66" stop-color="${osc}" stop-opacity="0"/><stop offset="1" stop-color="${osc}" stop-opacity=".34"/></radialGradient>`;
}

function renderizar(k, id, tam, piezas, fondo, defs, usados) {
  const { S, IN } = k;
  const tr = (o) => (o.tr ? ` transform="${o.tr}"` : '');
  const sil = [];
  const cuerpo = [];
  for (const p of piezas) {
    if (p.raw) { cuerpo.push(p.raw); continue; }
    const o = p.o || {};
    if (p.tubo) {
      const cap = o.cap || 'round';
      if (o.sil !== false) sil.push(`<path d="${p.d}"${tr(o)} fill="none" stroke-width="${num(p.w + IN + S)}" stroke-linecap="${cap}"/>`);
      if (o.borde !== false) cuerpo.push(`<path d="${p.d}"${tr(o)} fill="none" stroke="${TINTA}" stroke-width="${num(p.w + IN * 2)}" stroke-linecap="${cap}" stroke-linejoin="round"/>`);
      cuerpo.push(`<path d="${p.d}"${tr(o)} fill="none" stroke="${p.color}" stroke-width="${num(p.w)}" stroke-linecap="${cap}" stroke-linejoin="round"${o.op ? ` opacity="${o.op}"` : ''}/>`);
      continue;
    }
    const a = atr(p.a);
    if (o.sil !== false) sil.push(`<${p.tag} ${a}${tr(o)}${o.op || o.hueco ? ' fill="none"' : ''}/>`);
    const vol = o.vol === undefined ? 'r' : o.vol;
    let s = `<${p.tag} ${a} fill="${p.fill}"/>`;
    if (vol && vol !== 'none') { usados.add(vol); s += `<${p.tag} ${a} fill="url(#${id}-_${vol})"/>`; }
    if (o.borde !== false) s += `<${p.tag} ${a} fill="none" stroke="${TINTA}" stroke-width="${num(o.lw || IN)}" stroke-linejoin="round"/>`;
    const envolt = [o.tr ? `transform="${o.tr}"` : '', o.clip ? `clip-path="${o.clip}"` : '', o.op ? `opacity="${o.op}"` : ''].filter(Boolean).join(' ');
    cuerpo.push(envolt ? `<g ${envolt}>${s}</g>` : s);
  }
  const d = [...usados].map((t) => velo(id, t)).concat(defs).join('');
  const g0 = k.grupo ? `<g transform="${k.grupo}">` : '<g>';
  const escala = k.base !== tam ? `<g transform="scale(${num(tam / k.base)})">` : '<g>';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${tam} ${tam}" width="${tam}" height="${tam}">`
    + `<defs>${d}</defs>`
    + escala
    + fondo.join('')
    + g0
    + `<g fill="${TINTA}" stroke="${TINTA}" stroke-width="${num(S)}" stroke-linejoin="round" stroke-linecap="round">${sil.join('')}</g>`
    + cuerpo.join('')
    + '</g></g></svg>';
}

// ── formas auxiliares ──
const f = (v) => num(v);

// cápsula entre dos puntos (palos, mangos, brazos)
export function capsula(x1, y1, x2, y2, w) {
  const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1, r = w / 2;
  const nx = (-dy / l) * r, ny = (dx / l) * r;
  return `M${f(x1 + nx)} ${f(y1 + ny)} L${f(x2 + nx)} ${f(y2 + ny)} A${f(r)} ${f(r)} 0 0 0 ${f(x2 - nx)} ${f(y2 - ny)} L${f(x1 - nx)} ${f(y1 - ny)} A${f(r)} ${f(r)} 0 0 0 ${f(x1 + nx)} ${f(y1 + ny)} Z`;
}

// elipse festoneada (copas de árbol, nubes, flores de cerezo en racimo)
export function nube(cx, cy, rx, ry, n = 7, fase = 0, bulto = 0.62) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = fase + (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % n];
    const cuerda = Math.hypot(x2 - x1, y2 - y1);
    const r = cuerda * bulto;
    d += ` A${f(r)} ${f(r)} 0 0 1 ${f(x2)} ${f(y2)}`;
  }
  return d + ' Z';
}

// flor de cerezo de cinco pétalos con muesca
export function flor(cx, cy, r, rot = -90) {
  let d = '';
  for (let i = 0; i < 5; i++) {
    const a = ((rot + i * 72) * Math.PI) / 180;
    const ai = a - 0.62, ad = a + 0.62, am = a;
    const P = (ang, rr) => [cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr];
    const [bx, by] = P(ai, r * 0.28), [ex, ey] = P(ad, r * 0.28);
    const [lx, ly] = P(a - 0.34, r * 1.02), [rx2, ry2] = P(a + 0.34, r * 1.02);
    const [nx, ny] = P(am, r * 0.82);
    const [c1x, c1y] = P(a - 0.72, r * 0.86), [c2x, c2y] = P(a + 0.72, r * 0.86);
    d += `${i ? 'L' : 'M'}${f(bx)} ${f(by)} Q${f(c1x)} ${f(c1y)} ${f(lx)} ${f(ly)} L${f(nx)} ${f(ny)} L${f(rx2)} ${f(ry2)} Q${f(c2x)} ${f(c2y)} ${f(ex)} ${f(ey)} `;
  }
  return d + 'Z';
}

// destello de cuatro puntas
export function chispa(cx, cy, r, g = 0.2) {
  const q = r * g;
  return `M${f(cx)} ${f(cy - r)} Q${f(cx + q)} ${f(cy - q)} ${f(cx + r)} ${f(cy)} Q${f(cx + q)} ${f(cy + q)} ${f(cx)} ${f(cy + r)} Q${f(cx - q)} ${f(cy + q)} ${f(cx - r)} ${f(cy)} Q${f(cx - q)} ${f(cy - q)} ${f(cx)} ${f(cy - r)} Z`;
}

// estrella de n puntas redondeada
export function estrella(cx, cy, r1, r2, n = 5, rot = -90) {
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? r2 : r1, a = ((rot + (i * 180) / n) * Math.PI) / 180;
    d += `${i ? 'L' : 'M'}${f(cx + Math.cos(a) * r)} ${f(cy + Math.sin(a) * r)} `;
  }
  return d + 'Z';
}

// polígono a partir de puntos
export const poli = (pts) => 'M' + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L') + ' Z';

// ── caras kawaii ──
export function ojos(k, pares, r, o = {}) {
  for (const [x, y] of pares) {
    k.raw(`<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r * (o.ancho || 0.8))}" ry="${f(r)}" fill="${TINTA}"/>`);
    k.punto(x - r * 0.28, y - r * 0.38, r * 0.34);
  }
}
export function mofletes(k, pares, rx, ry, color = '#f2a3a3', op = 0.9) {
  for (const [x, y] of pares) k.raw(`<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" fill="${color}" opacity="${op}"/>`);
}
export function bocaW(k, x, y, s, w) {
  k.linea(`M${f(x - s)} ${f(y - s * 0.35)} Q${f(x - s * 0.5)} ${f(y + s * 0.5)} ${f(x)} ${f(y - s * 0.1)} Q${f(x + s * 0.5)} ${f(y + s * 0.5)} ${f(x + s)} ${f(y - s * 0.35)}`, w || k.IN * 0.8);
}
export function ojosFelices(k, pares, s, w) {
  for (const [x, y] of pares) k.linea(`M${f(x - s)} ${f(y + s * 0.3)} Q${f(x)} ${f(y - s * 0.9)} ${f(x + s)} ${f(y + s * 0.3)}`, w || k.IN);
}

// curva suave (Catmull-Rom → Bézier) que pasa por los puntos; devuelve el trazado y muestras con tangente
export function curva(pts) {
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  const segs = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
    segs.push([p1, c1, c2, p2]);
  }
  const muestras = (n) => {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * segs.length, si = Math.min(segs.length - 1, Math.floor(t)), u = t - si, mt = 1 - u;
      const [a, b, c, e] = segs[si];
      const P = (j) => mt ** 3 * a[j] + 3 * mt * mt * u * b[j] + 3 * mt * u * u * c[j] + u ** 3 * e[j];
      const D = (j) => 3 * mt * mt * (b[j] - a[j]) + 6 * mt * u * (c[j] - b[j]) + 3 * u * u * (e[j] - c[j]);
      const dx = D(0), dy = D(1), l = Math.hypot(dx, dy) || 1;
      out.push({ x: P(0), y: P(1), tx: dx / l, ty: dy / l, t: i / n });
    }
    return out;
  };
  return { d, muestras };
}

// ojo con párpado recto (mirada fiera): elipse cortada por una línea inclinada
export function ojoFiero(k, cx, cy, rx, ry, { iris = '#f2b43a', pupila = TINTA, mira = [0, 0], rendija = false, ang = 0, corte = 0.3, pestana = 0 } = {}) {
  const m = Math.tan((ang * Math.PI) / 180), y0 = cy - ry + corte * 2 * ry;
  const pts = [];
  for (let i = 0; i <= 96; i++) {
    const t = -Math.PI / 2 + (i / 96) * Math.PI * 2, x = cx + Math.cos(t) * rx, y = cy + Math.sin(t) * ry;
    if (y >= y0 + m * (x - cx)) pts.push([x, y]);
  }
  const d = 'M' + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L') + ' Z';
  const nombre = 'o' + Math.round(cx * 7 + cy * 13);
  const cl = k.clip(nombre, `<path d="${d}"/>`);
  k.p(d, '#fffdf6', { sil: false, vol: 'none', lw: k.IN * 0.8 });
  const ix = cx + mira[0], iy = cy + mira[1] + ry * 0.12;
  let s = `<g clip-path="${cl}"><circle cx="${f(ix)}" cy="${f(iy)}" r="${f(ry * 0.74)}" fill="${iris}"/>`;
  s += `<circle cx="${f(ix)}" cy="${f(iy)}" r="${f(ry * 0.74)}" fill="none" stroke="${TINTA}" stroke-width="${f(k.IN * 0.4)}" opacity=".5"/>`;
  s += rendija ? `<ellipse cx="${f(ix)}" cy="${f(iy)}" rx="${f(ry * 0.16)}" ry="${f(ry * 0.6)}" fill="${pupila}"/>` : `<circle cx="${f(ix)}" cy="${f(iy)}" r="${f(ry * 0.38)}" fill="${pupila}"/>`;
  s += `<circle cx="${f(ix - ry * 0.26)}" cy="${f(iy - ry * 0.28)}" r="${f(ry * 0.19)}" fill="#fff"/></g>`;
  k.raw(s);
  const [a, b] = [pts[0], pts[pts.length - 1]];
  if (a && b && corte > 0) {
    const ext = rx * 0.12;
    k.linea(`M${f(b[0] - ext)} ${f(b[1] - m * ext)} L${f(a[0] + ext)} ${f(a[1] + m * ext)}`, k.IN * 1.5);
    if (pestana) { const [px, py] = pestana > 0 ? a : b; k.linea(`M${f(px)} ${f(py)} l${f(pestana * rx * 0.35)} ${f(-ry * 0.35)}`, k.IN * 1.1); }
  }
  k.p(d, 'none', { sil: false, vol: 'none', lw: k.IN * 0.8 });
}

// ceja afilada de (x1,y1) fina a (x2,y2) gruesa
export function ceja(k, x1, y1, x2, y2, w, color = TINTA) {
  const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1, nx = (-dy / l) * w / 2, ny = (dx / l) * w / 2;
  k.raw(`<path d="M${f(x1)} ${f(y1)} Q${f((x1 + x2) / 2 + nx * 1.4)} ${f((y1 + y2) / 2 + ny * 1.4)} ${f(x2 + nx)} ${f(y2 + ny)} L${f(x2 - nx)} ${f(y2 - ny)} Z" fill="${color}" stroke="${color}" stroke-width="${f(k.IN * 0.6)}" stroke-linejoin="round"/>`);
}

// copo de nieve de seis brazos
export function copo(k, x, y, r, color = '#ffffff') {
  let d = '';
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI) / 3 + Math.PI / 2, cx = Math.cos(a) * r, cy = Math.sin(a) * r;
    d += `M${f(x - cx)} ${f(y - cy)} L${f(x + cx)} ${f(y + cy)} `;
  }
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 + Math.PI / 2, bx = x + Math.cos(a) * r * 0.55, by = y + Math.sin(a) * r * 0.55;
    for (const s of [-1, 1]) { const b = a + s * 0.8; d += `M${f(bx)} ${f(by)} L${f(bx + Math.cos(b) * r * 0.32)} ${f(by + Math.sin(b) * r * 0.32)} `; }
  }
  k.tubo(d, color, r * 0.16);
}

// llama (fuego fatuo, kitsunebi, hitodama)
export function llama(k, x, y, s, color = '#8fd3ff', centro = '#effaff', rot = 0) {
  const d = `M${f(x)} ${f(y - 28 * s)} Q${f(x + 6 * s)} ${f(y - 12 * s)} ${f(x + 14 * s)} ${f(y - 2 * s)} Q${f(x + 20 * s)} ${f(y + 16 * s)} ${f(x)} ${f(y + 18 * s)} Q${f(x - 20 * s)} ${f(y + 16 * s)} ${f(x - 14 * s)} ${f(y - 2 * s)} Q${f(x - 4 * s)} ${f(y - 8 * s)} ${f(x)} ${f(y - 28 * s)} Z`;
  const tr = rot ? `rotate(${rot} ${x} ${y})` : undefined;
  k.p(d, color, { vol: 'none', tr });
  k.e(x, y + 6 * s, 7 * s, 9 * s, centro, { sil: false, borde: false, vol: 'none', tr });
}

// palo que se ensancha (garrote kanabō, nariz, cuernos)
export function palo(x1, y1, w1, x2, y2, w2) {
  const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  const a = [x1 + nx * w1 / 2, y1 + ny * w1 / 2], b = [x2 + nx * w2 / 2, y2 + ny * w2 / 2], c = [x2 - nx * w2 / 2, y2 - ny * w2 / 2], e = [x1 - nx * w1 / 2, y1 - ny * w1 / 2];
  return `M${f(a[0])} ${f(a[1])} L${f(b[0])} ${f(b[1])} A${f(w2 / 2)} ${f(w2 / 2)} 0 0 0 ${f(c[0])} ${f(c[1])} L${f(e[0])} ${f(e[1])} A${f(w1 / 2)} ${f(w1 / 2)} 0 0 0 ${f(a[0])} ${f(a[1])} Z`;
}

// forma que sigue una curva y se afila (colas, cuerpos de serpiente o dragón)
export function afilada(pts, w0, w1, n = 48) {
  const m = curva(pts).muestras(n);
  const izq = [], der = [];
  for (const q of m) {
    const w = (w0 + (w1 - w0) * q.t) / 2, nx = -q.ty, ny = q.tx;
    izq.push([q.x + nx * w, q.y + ny * w]);
    der.push([q.x - nx * w, q.y - ny * w]);
  }
  const P2 = ([x, y]) => `${f(x)} ${f(y)}`;
  let d = `M${P2(izq[0])}`;
  for (const p of izq.slice(1)) d += ` L${P2(p)}`;
  d += ` A${f(Math.max(w1 / 2, 0.5))} ${f(Math.max(w1 / 2, 0.5))} 0 0 1 ${P2(der[der.length - 1])}`;
  for (const p of der.slice(0, -1).reverse()) d += ` L${P2(p)}`;
  d += ` A${f(w0 / 2)} ${f(w0 / 2)} 0 0 1 ${P2(izq[0])} Z`;
  return { d, muestras: m };
}
