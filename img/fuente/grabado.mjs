// (30-09) Motor de GRABADO de las portadas de las historias (estilo B): ukiyo-e con tinta a pincel.
// Estilo B · «sumi-e moderno» (a lo Ōkami): las MISMAS piezas que kit.mjs, entintadas a pincel.
//   · contorno de tinta con el borde roto (desplazamiento) y grano de pincel seco;
//   · color plano de grabado con bokashi (degradado de tinta abajo) en vez del brillo de vinilo;
//   · grano de papel washi dentro de cada color; sin brillos de plástico (solo los puntos de los ojos);
//   · la sombra del suelo es una aguada de tinta.
// Misma API que lienzo() de kit.mjs: las ilustraciones se dibujan una vez y salen en los dos estilos.
const TINTA = '#1d1510';
const num = (v) => (typeof v === 'number' ? +v.toFixed(1) : v);
const atr = (a) => Object.entries(a).filter(([, v]) => v !== undefined && v !== null && v !== false).map(([k, v]) => `${k}="${num(v)}"`).join(' ');

// color de grabado: un poco menos saturado y más cálido que el vinilo
function pigmento(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  let [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min; s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6;
  }
  s *= 0.86;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const c = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  let [R, G, B] = s ? [c(h + 1 / 3), c(h), c(h - 1 / 3)] : [l, l, l];
  R = Math.min(1, R * 1.0 + 0.02); B = B * 0.94; // un punto de papel amarillento
  return '#' + [R, G, B].map((x) => Math.round(Math.max(0, Math.min(1, x)) * 255).toString(16).padStart(2, '0')).join('');
}

export function lienzo(id, tam = 256, { base = tam, grosor = 1, rugosidad = 1 } = {}) {
  const esc = (base / 256) * grosor;
  const S = 11 * esc, IN = 5 * esc;
  const piezas = [], fondo = [], defs = [];
  const k = {
    id: (s) => `${id}-${s}`, esc, S, IN, tam, base, grupo: null, estilo: 'sumi', pigmento,
    def(s) { defs.push(s); return k; },
    clip(nombre, forma) { defs.push(`<clipPath id="${k.id(nombre)}">${forma}</clipPath>`); return `url(#${k.id(nombre)})`; },
    fondo(s) { fondo.push(s); return k; },
    pieza(tag, a, fill, o = {}) { piezas.push({ tag, a, fill, o }); return k; },
    p: (d, f, o) => k.pieza('path', { d }, f, o),
    e: (cx, cy, rx, ry, f, o) => k.pieza('ellipse', { cx, cy, rx, ry }, f, o),
    c: (cx, cy, r, f, o) => k.pieza('circle', { cx, cy, r }, f, o),
    r: (x, y, w, h, rx, f, o) => k.pieza('rect', { x, y, width: w, height: h, rx }, f, o),
    tubo(d, color, w, o = {}) { piezas.push({ tubo: true, d, color, w, o }); return k; },
    raw(s) { piezas.push({ raw: s }); return k; },
    linea(d, w = IN, color = TINTA, extra = '') {
      piezas.push({ raw: `<path d="${d}" fill="none" stroke="${color === '#2a211a' ? TINTA : color}" stroke-width="${num(w)}" stroke-linecap="round" stroke-linejoin="round" filter="url(#${id}-pincel)" ${extra}/>` });
      return k;
    },
    // en tinta no hay brillo de plástico: un trazo de pincel blanco, corto y fino
    brillo(cx, cy, rx, ry, rot = 0, op = 1) {
      if (rx < 3 * esc) return k;
      piezas.push({ raw: `<path d="M${num(cx - rx * 0.6)} ${num(cy + ry * 0.2)} Q${num(cx)} ${num(cy - ry * 0.5)} ${num(cx + rx * 0.6)} ${num(cy - ry * 0.1)}" transform="rotate(${num(rot)} ${num(cx)} ${num(cy)})" fill="none" stroke="#fffaf0" stroke-width="${num(Math.max(1.5, ry * 0.45))}" stroke-linecap="round" opacity="${0.55 * op}" filter="url(#${id}-seco)"/>` });
      return k;
    },
    punto(cx, cy, r, op = 0.95) { piezas.push({ raw: `<circle ${atr({ cx, cy, r })} fill="#fff" opacity="${op}"/>` }); return k; },
    sombra(cx, cy, rx, ry, op = 1) {
      fondo.push(`<ellipse ${atr({ cx, cy, rx: rx * 1.05, ry: ry * 1.1 })} fill="${TINTA}" opacity="${0.16 * op}" filter="url(#${id}-aguada)"/>`);
      return k;
    },
    halo(cx, cy, r, color, op = 0.55) {
      const g = k.id('h' + fondo.length);
      defs.push(`<radialGradient id="${g}"><stop offset="0" stop-color="${pigmento(color)}" stop-opacity="${op * 0.8}"/><stop offset="1" stop-color="${pigmento(color)}" stop-opacity="0"/></radialGradient>`);
      fondo.push(`<circle ${atr({ cx, cy, r })} fill="url(#${g})"/>`);
      return k;
    },
    // ensō: el círculo de pincel de un trazo, detrás del objeto
    enso(cx, cy, r, color = TINTA, w = 14) {
      const a0 = -1.9, a1 = a0 + Math.PI * 1.86, n = 40, pts = [];
      for (let i = 0; i <= n; i++) { const t = i / n, a = a0 + (a1 - a0) * t, rr = r * (1 + 0.03 * Math.sin(t * 9)); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, w * (0.35 + 0.75 * Math.sin(Math.PI * Math.min(1, t * 1.15)))]); }
      let d = '';
      const izq = [], der = [];
      for (let i = 0; i < pts.length; i++) {
        const [x, y, ww] = pts[i], [x2, y2] = pts[Math.min(pts.length - 1, i + 1)], [x0, y0] = pts[Math.max(0, i - 1)];
        const tx = x2 - x0, ty = y2 - y0, l = Math.hypot(tx, ty) || 1, nx = -ty / l, ny = tx / l;
        izq.push([x + nx * ww / 2, y + ny * ww / 2]); der.push([x - nx * ww / 2, y - ny * ww / 2]);
      }
      d = 'M' + izq.map(([x, y]) => `${num(x)} ${num(y)}`).join(' L') + ' L' + der.reverse().map(([x, y]) => `${num(x)} ${num(y)}`).join(' L') + ' Z';
      fondo.push(`<path d="${d}" fill="${color}" filter="url(#${id}-pincel2)"/>`);
      // la cola: cerdas sueltas del pincel seco
      let cerdas = '';
      for (let j = 0; j < 5; j++) {
        const off = (j - 2) * w * 0.16, t0 = 0.8 + j * 0.02, t1 = 1.0 + 0.012 * j;
        const P = (t) => { const a = a0 + (a1 - a0) * t, rr = r + off; return `${num(cx + Math.cos(a) * rr)} ${num(cy + Math.sin(a) * rr)}`; };
        cerdas += `<path d="M${P(t0)} Q${P((t0 + t1) / 2)} ${P(t1)}" fill="none" stroke="${color}" stroke-width="${num(w * 0.1)}" stroke-linecap="round" opacity=".85"/>`;
      }
      fondo.push(`<g filter="url(#${id}-pincel2)">${cerdas}</g>`);
      return k;
    },
    render() { return renderizar(k, id, tam, piezas, fondo, defs, rugosidad); },
  };
  return k;
}

function filtros(id, esc, rug) {
  const d = 2.4 * esc * rug;
  return `<filter id="${id}-pincel" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="${num(0.05 / esc)}" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${num(d)}" xChannelSelector="R" yChannelSelector="G"/></filter>`
    + `<filter id="${id}-pincel2" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="${num(0.03 / esc)}" numOctaves="2" seed="21" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${num(d * 1.5)}" xChannelSelector="G" yChannelSelector="R"/></filter>`
    + `<filter id="${id}-seco" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="${num(0.04 / esc)} ${num(0.4 / esc)}" numOctaves="2" seed="11" result="g"/><feColorMatrix in="g" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -3 2.3" result="a"/><feDisplacementMap in="SourceGraphic" in2="g" scale="${num(d * 1.4)}" xChannelSelector="R" yChannelSelector="G" result="d"/><feComposite in="d" in2="a" operator="in"/></filter>`
    + `<filter id="${id}-aguada" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${num(3 * esc)}"/><feTurbulence type="fractalNoise" baseFrequency="${num(0.06 / esc)}" numOctaves="2" seed="5"/><feDisplacementMap in="SourceGraphic" scale="${num(8 * esc)}" xChannelSelector="R" yChannelSelector="G"/></filter>`
    + `<filter id="${id}-washi" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${num(0.9 / esc)}" numOctaves="2" seed="9" result="t"/><feColorMatrix in="t" type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.9 0" result="w"/><feComponentTransfer in="t" result="v"><feFuncR type="linear" slope=".26" intercept=".83"/><feFuncG type="linear" slope=".26" intercept=".82"/><feFuncB type="linear" slope=".26" intercept=".79"/></feComponentTransfer><feBlend in="SourceGraphic" in2="v" mode="multiply" result="m"/><feComposite in="m" in2="SourceGraphic" operator="in"/></filter>`
    + `<linearGradient id="${id}-_boka" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff8e8" stop-opacity=".22"/><stop offset=".45" stop-color="#fff8e8" stop-opacity="0"/><stop offset=".72" stop-color="${TINTA}" stop-opacity="0"/><stop offset="1" stop-color="${TINTA}" stop-opacity=".3"/></linearGradient>`;
}

function renderizar(k, id, tam, piezas, fondo, defs, rug) {
  const { S, IN, esc } = k;
  const tr = (o) => (o.tr ? ` transform="${o.tr}"` : '');
  const sil = [], cuerpo = [];
  for (const p of piezas) {
    if (p.raw) { cuerpo.push(p.raw.replaceAll('#2a211a', TINTA)); continue; }
    const o = p.o || {};
    if (p.tubo) {
      const cap = o.cap || 'round';
      if (o.sil !== false) sil.push(`<path d="${p.d}"${tr(o)} fill="none" stroke-width="${num(p.w + IN + S)}" stroke-linecap="${cap}"/>`);
      if (o.borde !== false) cuerpo.push(`<path d="${p.d}"${tr(o)} fill="none" stroke="${TINTA}" stroke-width="${num(p.w + IN * 2)}" stroke-linecap="${cap}" stroke-linejoin="round" filter="url(#${id}-pincel)"/>`);
      cuerpo.push(`<path d="${p.d}"${tr(o)} fill="none" stroke="${pigmento(p.color)}" stroke-width="${num(p.w)}" stroke-linecap="${cap}" stroke-linejoin="round"${o.op ? ` opacity="${o.op}"` : ''}/>`);
      continue;
    }
    const a = atr(p.a);
    if (o.sil !== false) sil.push(`<${p.tag} ${a}${tr(o)}${o.op || o.hueco ? ' fill="none"' : ''}/>`);
    const fill = p.fill === 'none' ? 'none' : pigmento(p.fill);
    let s = `<${p.tag} ${a} fill="${fill}"/>`;
    const vol = o.vol === undefined ? 'r' : o.vol;
    if (fill !== 'none' && vol && vol !== 'none') s += `<${p.tag} ${a} fill="url(#${id}-_boka)"/>`;
    if (o.borde !== false) s += `<${p.tag} ${a} fill="none" stroke="${TINTA}" stroke-width="${num((o.lw || IN) * 0.9)}" stroke-linejoin="round" filter="url(#${id}-pincel)"/>`;
    const envolt = [o.tr ? `transform="${o.tr}"` : '', o.clip ? `clip-path="${o.clip}"` : '', o.op ? `opacity="${o.op}"` : ''].filter(Boolean).join(' ');
    cuerpo.push(envolt ? `<g ${envolt}>${s}</g>` : s);
  }
  const d = filtros(id, esc, rug) + defs.join('');
  const escala = k.base !== tam ? `<g transform="scale(${num(tam / k.base)})">` : '<g>';
  const g0 = k.grupo ? `<g transform="${k.grupo}">` : '<g>';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${tam} ${tam}" width="${tam}" height="${tam}">`
    + `<defs>${d}</defs>` + escala + fondo.join('') + g0
    + `<g fill="${TINTA}" stroke="${TINTA}" stroke-width="${num(S)}" stroke-linejoin="round" stroke-linecap="round" filter="url(#${id}-pincel)">${sil.join('')}</g>`
    + `<g fill="${TINTA}" stroke="${TINTA}" stroke-width="${num(S * 1.12)}" stroke-linejoin="round" stroke-linecap="round" filter="url(#${id}-pincel2)" transform="translate(${num(0.5 * esc)} ${num(0.8 * esc)})">${sil.join('')}</g>`
    + `<g filter="url(#${id}-washi)">${cuerpo.join('')}</g>`
    + '</g></g></svg>';
}
