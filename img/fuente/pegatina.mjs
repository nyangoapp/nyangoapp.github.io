// Estilo PEGATINA (30-09, referencias: hojas de pegatinas japonesas kawaii). Misma API que kit.mjs.
//   · la línea NO es negra: es el color de cada pieza, oscurecido (fina y redondeada);
//   · relleno con degradado suave (más claro arriba) y brillos blancos;
//   · alrededor de toda la figura, el borde blanco de la pegatina y una sombra suave debajo.
const num = (v) => (typeof v === 'number' ? +v.toFixed(1) : v);
const atr = (a) => Object.entries(a).filter(([, v]) => v !== undefined && v !== null && v !== false).map(([k, v]) => `${k}="${num(v)}"`).join(' ');

function hsl(hex) {
  let [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2; let h = 0, s = 0;
  if (max !== min) { const d = max - min; s = l > 0.5 ? d / (2 - max - min) : d / (max + min); h = (max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4) / 6; }
  return [h, s, l];
}
function hex([h, s, l]) {
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const c = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  const v = s ? [c(h + 1 / 3), c(h), c(h - 1 / 3)] : [l, l, l];
  return '#' + v.map((x) => Math.round(Math.max(0, Math.min(1, x)) * 255).toString(16).padStart(2, '0')).join('');
}
const esHex = (c) => /^#[0-9a-f]{6}$/i.test(c);
// la línea: el mismo color, más oscuro y algo más cálido
// (los blancos, cremas y grises llevan línea marrón suave, como en las pegatinas de referencia)
export const linea = (c) => (!esHex(c) ? '#6b4226' : (([h, s, l]) => (l > 0.86 || s < 0.18 ? (l > 0.86 ? '#b98f66' : hex([h, s, l * 0.55])) : hex([h, Math.min(1, s * 0.9 + 0.08), Math.max(0.16, l * 0.52)])))(hsl(c)));
const claro = (c) => (esHex(c) ? (([h, s, l]) => hex([h, s, Math.min(0.97, l + (1 - l) * 0.38)]))(hsl(c)) : c);
const MARRON = '#6b4226';

export function lienzo(id, tam = 256, { base = tam, grosor = 1 } = {}) {
  const esc = (base / 256) * grosor;
  const BORDE = 16 * esc, IN = 3.4 * esc;
  const piezas = [], fondo = [], defs = [];
  const grads = new Map();
  const grad = (c) => {
    if (!esHex(c)) return c;
    if (!grads.has(c)) { const g = `${id}-g${grads.size}`; grads.set(c, g); defs.push(`<linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${claro(c)}"/><stop offset=".55" stop-color="${c}"/><stop offset="1" stop-color="${c}"/></linearGradient>`); }
    return `url(#${grads.get(c)})`;
  };
  const k = {
    id: (s) => `${id}-${s}`, esc, S: BORDE, IN, tam, base, grupo: null, estilo: 'pegatina', linea,
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
    linea(d, w = IN, color = MARRON, extra = '') {
      const c = color === '#2a211a' || color === '#221817' || color === '#1d1510' ? MARRON : color;
      piezas.push({ raw: `<path d="${d}" fill="none" stroke="${c}" stroke-width="${num(w * 0.8)}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>` });
      return k;
    },
    brillo(cx, cy, rx, ry, rot = 0, op = 1) { piezas.push({ raw: `<ellipse ${atr({ cx, cy, rx, ry })} transform="rotate(${num(rot)} ${num(cx)} ${num(cy)})" fill="#fff" opacity="${0.7 * op}"/>` }); return k; },
    punto(cx, cy, r, op = 0.95) { piezas.push({ raw: `<circle ${atr({ cx, cy, r })} fill="#fff" opacity="${op}"/>` }); return k; },
    sombra() { return k; },
    halo(cx, cy, r, color, op = 0.55) {
      const g = k.id('h' + fondo.length);
      defs.push(`<radialGradient id="${g}"><stop offset="0" stop-color="${color}" stop-opacity="${op}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`);
      fondo.push(`<circle ${atr({ cx, cy, r })} fill="url(#${g})"/>`);
      return k;
    },
    // cara kawaii sobre un objeto (ojos de punto, mofletes y boquita)
    carita(cx, cy, s = 1, { boca = 'w', ojos = 'punto' } = {}) {
      const o = (x) => (ojos === 'feliz'
        ? `<path d="M${num(x - 6 * s)} ${num(cy + 2 * s)} Q${num(x)} ${num(cy - 6 * s)} ${num(x + 6 * s)} ${num(cy + 2 * s)}" fill="none" stroke="${MARRON}" stroke-width="${num(3.2 * s)}" stroke-linecap="round"/>`
        : `<ellipse cx="${num(x)}" cy="${num(cy)}" rx="${num(4.2 * s)}" ry="${num(5.4 * s)}" fill="${MARRON}"/><circle cx="${num(x - 1.4 * s)}" cy="${num(cy - 2 * s)}" r="${num(1.7 * s)}" fill="#fff"/>`);
      let t = o(cx - 15 * s) + o(cx + 15 * s);
      t += `<ellipse cx="${num(cx - 25 * s)}" cy="${num(cy + 9 * s)}" rx="${num(7 * s)}" ry="${num(4 * s)}" fill="#f6a5ae" opacity=".85"/><ellipse cx="${num(cx + 25 * s)}" cy="${num(cy + 9 * s)}" rx="${num(7 * s)}" ry="${num(4 * s)}" fill="#f6a5ae" opacity=".85"/>`;
      t += boca === 'o' ? `<ellipse cx="${num(cx)}" cy="${num(cy + 9 * s)}" rx="${num(3.6 * s)}" ry="${num(4.4 * s)}" fill="#c85a5a"/>`
        : `<path d="M${num(cx - 6 * s)} ${num(cy + 6 * s)} Q${num(cx - 3 * s)} ${num(cy + 11 * s)} ${num(cx)} ${num(cy + 7 * s)} Q${num(cx + 3 * s)} ${num(cy + 11 * s)} ${num(cx + 6 * s)} ${num(cy + 6 * s)}" fill="none" stroke="${MARRON}" stroke-width="${num(2.8 * s)}" stroke-linecap="round" stroke-linejoin="round"/>`;
      piezas.push({ raw: t });
      return k;
    },
    render() {
      const sil = [], cuerpo = [];
      const tr = (o) => (o.tr ? ` transform="${o.tr}"` : '');
      for (const p of piezas) {
        if (p.raw) { cuerpo.push(p.raw); continue; }
        const o = p.o || {};
        if (p.tubo) {
          if (o.sil !== false) sil.push(`<path d="${p.d}"${tr(o)} fill="none" stroke-width="${num(p.w + BORDE)}" stroke-linecap="round"/>`);
          if (o.borde !== false) cuerpo.push(`<path d="${p.d}"${tr(o)} fill="none" stroke="${linea(p.color)}" stroke-width="${num(p.w + IN * 2)}" stroke-linecap="round" stroke-linejoin="round"/>`);
          cuerpo.push(`<path d="${p.d}"${tr(o)} fill="none" stroke="${p.color}" stroke-width="${num(p.w)}" stroke-linecap="round" stroke-linejoin="round"/>`);
          continue;
        }
        const a = atr(p.a);
        if (o.sil !== false) sil.push(`<${p.tag} ${a}${tr(o)}/>`);
        const lin = o.color_linea || linea(p.fill);
        let s = p.fill === 'none' ? '' : `<${p.tag} ${a} fill="${o.vol === 'none' ? p.fill : grad(p.fill)}"/>`;
        if (o.borde !== false) s += `<${p.tag} ${a} fill="none" stroke="${lin}" stroke-width="${num((o.lw || IN) * 0.9)}" stroke-linejoin="round"/>`;
        const envolt = [o.tr ? `transform="${o.tr}"` : '', o.clip ? `clip-path="${o.clip}"` : '', o.op ? `opacity="${o.op}"` : ''].filter(Boolean).join(' ');
        cuerpo.push(envolt ? `<g ${envolt}>${s}</g>` : s);
      }
      const silTxt = sil.join('');
      const escala = base !== tam ? `<g transform="scale(${num(tam / base)})">` : '<g>';
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${tam} ${tam}" width="${tam}" height="${tam}"><defs>`
        + `<filter id="${id}-somb" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${num(4 * esc)}"/></filter>${defs.join('')}</defs>`
        + escala + fondo.join('')
        // sombra suave de la pegatina, el borde blanco y, encima, el dibujo
        + `<g transform="translate(0 ${num(5 * esc)})" fill="#6b4226" stroke="#6b4226" stroke-width="${num(BORDE)}" stroke-linejoin="round" opacity=".22" filter="url(#${id}-somb)">${silTxt}</g>`
        + `<g fill="#fff" stroke="#fff" stroke-width="${num(BORDE)}" stroke-linejoin="round" stroke-linecap="round">${silTxt}</g>`
        + cuerpo.join('') + '</g></svg>';
    },
  };
  return k;
}
