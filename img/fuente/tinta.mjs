// Estilo B de verdad (30-09, segunda vuelta): pintado, no pegatina. Misma API que kit.mjs.
//   · línea caligráfica: fina del lado de la luz (arriba-izquierda), gruesa del de la sombra, y se corta donde el
//     pincel se levanta; nada de silueta gorda uniforme;
//   · relleno de acuarela: borde que tiembla, el pigmento se acumula en el borde, manchas irregulares, el papel
//     asoma en las luces;
//   · sombra de aguada de tinta en el lado oscuro de cada pieza (no hay brillo de plástico);
//   · detrás, una mancha de aguada en vez de un círculo.
const TINTA = '#1d1510';
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
// pigmento: algo menos saturado y cálido (papel); oscuro: el mismo pigmento acumulado en el borde
const pig = (c) => (/^#[0-9a-f]{6}$/i.test(c) ? (([h, s, l]) => hex([h, s * 0.84, Math.min(0.96, l * 1.02 + 0.01)]))(hsl(c)) : c);
const sombraCel = (c) => (/^#[0-9a-f]{6}$/i.test(c) ? (([h, s, l]) => hex([(h + 0.985) % 1, Math.min(1, s * 0.95 + 0.04), l * 0.76]))(hsl(pig(c))) : c);
const acumulado = (c) => (/^#[0-9a-f]{6}$/i.test(c) ? (([h, s, l]) => hex([h, Math.min(1, s * 1.05), l * 0.62]))(hsl(c)) : c);

export function lienzo(id, tam = 256, { base = tam, grosor = 1 } = {}) {
  const esc = (base / 256) * grosor;
  const S = 8.5 * esc, IN = 3.8 * esc;
  const piezas = [], fondo = [], defs = [];
  let n = 0;
  const k = {
    id: (s) => `${id}-${s}`, esc, S, IN, tam, base, grupo: null, estilo: 'tinta', pigmento: pig,
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
      const c = color === '#2a211a' ? TINTA : color;
      piezas.push({ raw: `<path d="${d}" fill="none" stroke="${c}" stroke-width="${num(w * 0.85)}" stroke-linecap="round" stroke-linejoin="round" filter="url(#${id}-pincel)" ${extra}/>` });
      return k;
    },
    // la luz es papel sin pintar: un toque de pincel claro, corto
    brillo(cx, cy, rx, ry, rot = 0, op = 1) {
      if (rx < 3 * esc) return k;
      piezas.push({ raw: `<path d="M${num(cx - rx * 0.7)} ${num(cy + ry * 0.3)} Q${num(cx - rx * 0.1)} ${num(cy - ry * 0.6)} ${num(cx + rx * 0.7)} ${num(cy - ry * 0.2)}" transform="rotate(${num(rot)} ${num(cx)} ${num(cy)})" fill="none" stroke="#fbf3e2" stroke-width="${num(Math.max(1.6, ry * 0.7))}" stroke-linecap="round" opacity="${0.75 * op}" filter="url(#${id}-seco)"/>` });
      return k;
    },
    punto(cx, cy, r, op = 0.95) { piezas.push({ raw: `<circle ${atr({ cx, cy, r })} fill="#fffaf0" opacity="${op}"/>` }); return k; },
    sombra(cx, cy, rx, ry, op = 1) {
      fondo.push(`<ellipse ${atr({ cx, cy: cy + ry * 0.2, rx: rx * 1.1, ry: ry * 1.3 })} fill="${TINTA}" opacity="${0.2 * op}" filter="url(#${id}-aguada)"/>`);
      return k;
    },
    halo(cx, cy, r, color, op = 0.55) {
      const g = k.id('h' + fondo.length);
      defs.push(`<radialGradient id="${g}"><stop offset="0" stop-color="${pig(color)}" stop-opacity="${op * 0.7}"/><stop offset="1" stop-color="${pig(color)}" stop-opacity="0"/></radialGradient>`);
      fondo.push(`<circle ${atr({ cx, cy, r })} fill="url(#${g})"/>`);
      return k;
    },
    // mancha de aguada detrás del objeto (sustituye al círculo): borde irregular, más carga en un lado
    mancha(cx, cy, r, color = '#8fa9c9', op = 0.5) {
      const pts = [];
      for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, rr = r * (0.82 + 0.22 * Math.sin(i * 2.3 + 1) + 0.08 * Math.cos(i * 5.1)); pts.push([cx + Math.cos(a) * rr * 1.08, cy + Math.sin(a) * rr * 0.92]); }
      let d = `M${num(pts[0][0])} ${num(pts[0][1])}`;
      for (let i = 0; i < pts.length; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length]; d += ` Q${num(x1 + (x2 - x1) * 0.5 + (y2 - y1) * 0.18)} ${num(y1 + (y2 - y1) * 0.5 - (x2 - x1) * 0.18)} ${num(x2)} ${num(y2)}`; }
      const g = k.id('m' + fondo.length);
      defs.push(`<radialGradient id="${g}" cx=".62" cy=".64" r=".7"><stop offset="0" stop-color="${color}" stop-opacity="${op}"/><stop offset=".75" stop-color="${color}" stop-opacity="${op * 0.55}"/><stop offset="1" stop-color="${color}" stop-opacity="${op * 0.9}"/></radialGradient>`);
      fondo.push(`<path d="${d} Z" fill="url(#${g})" filter="url(#${id}-acuarela)"/>`);
      return k;
    },
    render() { return renderizar(k, id, tam, piezas, fondo, defs); },
  };
  return k;
}

function filtros(id, esc) {
  const d = 2.2 * esc;
  return ''
    // pincel: el trazo tiembla un poco (sin grano: la tinta es maciza)
    + `<filter id="${id}-pincel" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="${num(0.045 / esc)}" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${num(d)}" xChannelSelector="R" yChannelSelector="G"/></filter>`
    // pincel seco: con grano (luces y cerdas)
    + `<filter id="${id}-corte" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="${num(0.045 / esc)}" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${num(d)}" xChannelSelector="R" yChannelSelector="G" result="d"/><feTurbulence type="fractalNoise" baseFrequency="${num(0.07 / esc)}" numOctaves="1" seed="41" result="h"/><feColorMatrix in="h" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 9 -3.3" result="a"/><feComposite in="d" in2="a" operator="in"/></filter>`
    + `<filter id="${id}-seco" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="${num(0.06 / esc)} ${num(0.5 / esc)}" numOctaves="2" seed="11" result="g"/><feColorMatrix in="g" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -3 2.2" result="a"/><feComposite in="SourceGraphic" in2="a" operator="in"/></filter>`
    // acuarela: borde que tiembla, pigmento acumulado en el borde y manchas (el color no es uniforme)
    + `<filter id="${id}-acuarela" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB">`
    + `<feTurbulence type="fractalNoise" baseFrequency="${num(0.035 / esc)}" numOctaves="3" seed="3" result="n"/>`
    + `<feDisplacementMap in="SourceGraphic" in2="n" scale="${num(3 * esc)}" xChannelSelector="R" yChannelSelector="G" result="forma"/>`
    + `<feMorphology in="forma" operator="erode" radius="${num(1.6 * esc)}" result="dentro"/>`
    + `<feComposite in="forma" in2="dentro" operator="out" result="borde"/>`
    + `<feGaussianBlur in="borde" stdDeviation="${num(1.1 * esc)}" result="bordeSuave"/>`
    + `<feColorMatrix in="bordeSuave" type="matrix" values="0.62 0 0 0 0 0 0.6 0 0 0 0 0 0.6 0 0 0 0 0 0.85 0" result="bordeOsc"/>`
    + `<feTurbulence type="fractalNoise" baseFrequency="${num(0.022 / esc)}" numOctaves="2" seed="19" result="m"/>`
    + `<feColorMatrix in="m" type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 0.96 0 0 0 0.9 -0.3" result="manchas"/>`
    + `<feComposite in="manchas" in2="forma" operator="in" result="manchasDentro"/>`
    + `<feBlend in="forma" in2="manchasDentro" mode="screen" result="claro"/>`
    + `<feComposite in="claro" in2="forma" operator="in" result="lavado"/>`
    + `<feComposite in="bordeOsc" in2="forma" operator="in" result="bordeDentro"/>`
    + `<feTurbulence type="fractalNoise" baseFrequency="${num(0.03 / esc)}" numOctaves="2" seed="29" result="m2"/><feColorMatrix in="m2" type="matrix" values="0 0 0 0 0.1 0 0 0 0 0.05 0 0 0 0 0.03 0 0 0 1.1 -0.52" result="posos"/><feComposite in="posos" in2="forma" operator="in" result="pososDentro"/><feMerge><feMergeNode in="lavado"/><feMergeNode in="pososDentro"/><feMergeNode in="bordeDentro"/></feMerge></filter>`
    // aguada: mancha de tinta diluida
    + `<filter id="${id}-aguada" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${num(2.4 * esc)}" result="b"/><feTurbulence type="fractalNoise" baseFrequency="${num(0.05 / esc)}" numOctaves="2" seed="5" result="n"/><feDisplacementMap in="b" in2="n" scale="${num(9 * esc)}" xChannelSelector="R" yChannelSelector="G"/></filter>`
    // sombra de aguada dentro de cada pieza
    + `<filter id="${id}-somb" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${num(2.2 * esc)}"/></filter>`
    // papel: grano de washi sobre todo lo pintado
    + `<filter id="${id}-washi" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${num(0.8 / esc)}" numOctaves="2" seed="9" result="t"/><feComponentTransfer in="t" result="v"><feFuncR type="linear" slope=".3" intercept=".8"/><feFuncG type="linear" slope=".3" intercept=".79"/><feFuncB type="linear" slope=".3" intercept=".76"/></feComponentTransfer><feBlend in="SourceGraphic" in2="v" mode="multiply" result="m"/><feComposite in="m" in2="SourceGraphic" operator="in"/></filter>`;
}

// cortes del pincel: tramos largos con huecos pequeños, distintos en cada pieza
const cortes = (i, esc) => { const a = 40 + ((i * 37) % 50), b = 26 + ((i * 53) % 40); return `${num(a * esc)} ${num(2.2 * esc)} ${num(b * esc)} ${num(1.4 * esc)}`; };

function renderizar(k, id, tam, piezas, fondo, defs) {
  const { S, IN, esc } = k;
  const tr = (o) => (o.tr ? ` transform="${o.tr}"` : '');
  const silFina = [], cuerpo = [];
  let i = 0;
  for (const p of piezas) {
    if (p.raw) { cuerpo.push(p.raw.replaceAll('#2a211a', TINTA)); continue; }
    const o = p.o || {};
    i++;
    if (p.tubo) {
      const cap = o.cap || 'round';
      if (o.sil !== false) silFina.push(`<path d="${p.d}"${tr(o)} fill="none" stroke-width="${num(p.w + S)}" stroke-linecap="${cap}"/>`);
      cuerpo.push(`<path d="${p.d}"${tr(o)} fill="none" stroke="${pig(p.color)}" stroke-width="${num(p.w)}" stroke-linecap="${cap}" stroke-linejoin="round" filter="url(#${id}-acuarela)"${o.op ? ` opacity="${o.op}"` : ''}/>`);
      if (o.borde !== false) cuerpo.push(`<path d="${p.d}"${tr(o)} fill="none" stroke="${TINTA}" stroke-width="${num(IN * 0.5)}" stroke-dasharray="${cortes(i, esc)}" stroke-linecap="round" filter="url(#${id}-pincel)" opacity=".75"/>`);
      continue;
    }
    const a = atr(p.a);
    if (o.sil !== false) silFina.push(`<${p.tag} ${a}${tr(o)}${o.op || o.hueco ? ' fill="none"' : ''}/>`);
    const fill = p.fill === 'none' ? null : pig(p.fill);
    let s = '';
    if (fill) {
      const cid = `${id}-c${i}`;
      defs.push(`<clipPath id="${cid}"><${p.tag} ${a}/></clipPath>`);
      s += `<${p.tag} ${a} fill="${fill}" filter="url(#${id}-acuarela)"/>`;
      const vol = o.vol === undefined ? 'r' : o.vol;
      if (vol && vol !== 'none') {
        // aguada en el lado de la sombra (abajo-derecha): el contorno de la propia pieza, corrido y difuminado
        const dx = 5 * esc, dy = 6.5 * esc;
        s += `<g clip-path="url(#${cid})"><rect x="-999" y="-999" width="3000" height="3000" fill="${sombraCel(p.fill)}"/><${p.tag} ${a} fill="${fill}" transform="translate(${num(-dx)} ${num(-dy)})"/></g>`;
        // y una luz de papel en el borde de arriba-izquierda
        s += `<g clip-path="url(#${cid})"><${p.tag} ${a} fill="none" stroke="#fff8e8" stroke-width="${num(3 * esc)}" opacity=".45" transform="translate(${num(2.2 * esc)} ${num(2.6 * esc)})" filter="url(#${id}-seco)"/></g>`;
      }
    }
    if (o.borde !== false) s += `<${p.tag} ${a} fill="none" stroke="${TINTA}" stroke-width="${num((o.lw || IN) * 0.55)}" stroke-dasharray="${cortes(i, esc)}" stroke-linejoin="round" stroke-linecap="round" filter="url(#${id}-pincel)"/>`;
    const envolt = [o.tr ? `transform="${o.tr}"` : '', o.clip ? `clip-path="${o.clip}"` : '', o.op ? `opacity="${o.op}"` : ''].filter(Boolean).join(' ');
    cuerpo.push(envolt ? `<g ${envolt}>${s}</g>` : s);
  }
  const escala = k.base !== tam ? `<g transform="scale(${num(tam / k.base)})">` : '<g>';
  const g0 = k.grupo ? `<g transform="${k.grupo}">` : '<g>';
  // línea caligráfica: la silueta fina, y una copia corrida hacia la sombra que la engorda solo de ese lado
  const sil = silFina.join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${tam} ${tam}" width="${tam}" height="${tam}">`
    + `<defs>${filtros(id, esc)}${defs.join('')}</defs>` + escala + fondo.join('') + g0
    + `<g filter="url(#${id}-pincel)"><g fill="${TINTA}" stroke="${TINTA}" stroke-width="${num(S * 0.55)}" stroke-linejoin="round" stroke-linecap="round">${sil}</g>`
    + `<g fill="${TINTA}" stroke="${TINTA}" stroke-width="${num(S * 0.55)}" stroke-linejoin="round" stroke-linecap="round" transform="translate(${num(S * 0.32)} ${num(S * 0.42)})">${sil}</g></g>`
    + `<g filter="url(#${id}-washi)">${cuerpo.join('')}</g>`
    + '</g></g></svg>';
}
