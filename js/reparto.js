// El reparto de Nyango: los vecinos de Nyan, en 3D con las MISMAS piezas que él (mascota.js): tronco de tubo,
// patas de palito, brazos de Bézier, cola que se menea y la cara dibujada con rotulador. Sin ropa:
// a cada uno se le reconoce por la silueta de la cabeza, sus colores y un rasgo propio.
//   tama   · gata rosa atigrada, la amiga lista de las historias: rayas en la frente, pestañas, collar azul con cascabel
//   pon    · tanuki de la tienda, verde matcha: antifaz, mofletes de pelo en punta, patas oscuras, cola gorda con anillos, hoja
//   fukuro · lechuza, la maestra de la escuela: penachos, disco facial, pico, gafas redondas, pecho con escamas
//   kotaro · shiba del barrio: urajiro (hocico, mofletes y pecho blancos), cejitas, orejas en punta, cola enroscada
//   kage   · gato gris pizarra mate, el rival guay de Nyan: wolf cut sin flequillo, ojos de pupila afilada, oreja mordida
// Uso: new Mascota(lienzo, { isla: false, especie: especie('tama') }). Las cabezas se mallan al pedirlas (~0,3 s).
import { NUCLEO as K } from './mascota.js';

const { THREE, V3, cl, entre, smin, smax, conoRedondo, mallarDatos, llenarGeo, conPint, vinilo, cache, trazo, elipse, OJO, GR, TINTA } = K;
const C = (h) => new THREE.Color(h);

// ─────────────── formas (campos de distancia, mismas unidades que la cabeza de Nyan) ───────────────
function elip(x, y, z, c, r) {
  const X = (x - c[0]) / r[0], Y = (y - c[1]) / r[1], Z = (z - c[2]) / r[2];
  return (Math.sqrt(X * X + Y * Y + Z * Z) - 1) * Math.min(r[0], r[1], r[2]);
}
// el cráneo de la familia: campana (más ancha abajo) con coronilla plana; mismos parámetros que CAB en mascota.js
function craneo(P) {
  return (x, y, z) => {
    const w = P.a - P.k * y, X = Math.abs(x) / w, Y = Math.abs(y) / P.b, m = P.nB + (P.nA - P.nB) * entre(-0.3, 0.3, y / P.b), e = (P.n + m) / 2;
    const rxy = Math.pow(Math.pow(X, P.n) + Math.pow(Y, m), 1 / e), Z = Math.abs(z) / (z > 0 ? P.cF : P.cB);
    return (Math.pow(Math.pow(rxy, P.nZ) + Math.pow(Z, P.nZ), 1 / P.nZ) - 1) * 0.52;
  };
}
// oreja o penacho: cono redondeado, aplastado de delante a atrás (plano > 1)
const cono = (x, y, z, a, b, r1, r2, plano = 1) => conoRedondo(Math.sqrt(x * x + 0.003), y, z * plano, a[0], a[1], a[2] * plano, b[0], b[1], b[2] * plano, r1, r2) / Math.sqrt(plano);
// peso de la oreja para su tic (atributo aOreja: signo = lado)
const pesoDe = (y0, y1) => (x, y) => (Math.sign(x) || 1) * entre(y0, y1, y) * entre(0.08, 0.22, Math.abs(x));

const CAJA = [[-1.08, -0.68, -0.76], [1.08, 1.02, 0.82]];
function mallarCabeza(id, f, peso) {
  return cache('geo:cabeza-' + id, () => llenarGeo(new THREE.BufferGeometry(), mallarDatos(f, CAJA[0], CAJA[1], 0.0175, { aOreja: peso })));
}

// cola: tubo por una curva con su perfil de grosor; mismos atributos que la de Nyan (aS y pint) para menearse igual
function geoColaDe(id, pts, radio) {
  return cache('geo:cola-' + id, () => {
    const curva = new THREE.CatmullRomCurve3(pts.map((p) => V3(...p)));
    const tubo = new THREE.TubeGeometry(curva, 90, 1, 20, false);
    const p = tubo.attributes.position, uv = tubo.attributes.uv, c = V3(), v = V3();
    for (let i = 0; i < p.count; i++) { const s = uv.getX(i); curva.getPointAt(s, c); v.fromBufferAttribute(p, i).sub(c).multiplyScalar(radio(s)); p.setXYZ(i, c.x + v.x, c.y + v.y, c.z + v.z); }
    const fin = curva.getPointAt(1), ini = curva.getPointAt(0);
    const punta = new THREE.SphereGeometry(radio(1), 20, 14); punta.translate(fin.x, fin.y, fin.z);
    const base = new THREE.SphereGeometry(radio(0), 20, 14); base.translate(ini.x, ini.y, ini.z);
    const nT = p.count, nP = punta.attributes.position.count;
    const g = K.mergeGeometries ? K.mergeGeometries([tubo, punta, base]) : unir([tubo, punta, base]);
    g.computeVertexNormals();
    const s = new Float32Array(g.attributes.position.count);
    for (let i = 0; i < s.length; i++) s[i] = i < nT ? uv.getX(i) : i < nT + nP ? 1 : 0;
    g.setAttribute('aS', new THREE.BufferAttribute(s, 1));
    return conPint(g, (vv, i) => V3(s[i], 0, 0));
  });
}
// unión sencilla de geometrías indexadas (posición, normal, uv)
function unir(geos) {
  const pos = [], nor = [], uv = [], idx = []; let base = 0;
  for (const g of geos) {
    const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
    for (let i = 0; i < P.count; i++) { pos.push(P.getX(i), P.getY(i), P.getZ(i)); nor.push(N.getX(i), N.getY(i), N.getZ(i)); uv.push(U ? U.getX(i) : 0, U ? U.getY(i) : 0); }
    for (const k of g.index.array) idx.push(base + k);
    base += P.count;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

// ─────────────── pintura (GLSL): p = posición en la pieza, np = normal; col = color ───────────────
const GLSL = /* glsl */`
  float elip2(vec2 q, vec2 c, vec2 r){ return length((q - c) / r) - 1.0; }
  float seg2(vec2 q, vec2 a, vec2 b){ vec2 pa = q - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
  float grano(vec3 q){ return fract(sin(dot(floor(q * 90.0), vec3(12.9898, 78.233, 37.719))) * 43758.5453); }`;
// el pelo: un pelín de variación para que el vinilo no sea plástico liso (muy poco: sigue siendo una figura)
const PELO = 'col *= 0.975 + 0.05 * grano(p);';

// ─────────────── dibujos extra en la cara ───────────────
const pestanas = (c, nombre, s) => {
  if (nombre !== 'normal' || s.abre < 0.45) return;
  for (const l of [-1, 1]) {
    const X = l * OJO.x + s.mx, Y = OJO.y + s.my;
    trazo(c, [[X + l * 0.075, Y + 0.085], [X + l * 0.14, Y + 0.13]], GR * 0.7);
    trazo(c, [[X + l * 0.09, Y + 0.035], [X + l * 0.16, Y + 0.055]], GR * 0.7);
  }
};
// los ojos del tanuki van dentro del antifaz: un brillo de más para que se lean
const brilloExtra = (c, nombre, s) => {
  if (nombre !== 'normal' || s.abre < 0.45) return;
  for (const l of [-1, 1]) elipse(c, l * OJO.x + s.mx + 0.035, OJO.y + s.my - 0.07, 0.022, 0.022, 'rgba(255,255,255,0.9)');
};

// ─────────────── las especies ───────────────
const ESPECIES = {
  tama() {
    const P = { a: 0.72, k: 0.2, b: 0.5, cF: 0.56, cB: 0.58, n: 2.5, nA: 3.0, nB: 2.6, nZ: 2.3 }, cr = craneo(P);
    const f = (x, y, z) => {
      const ax = Math.abs(x);
      let d = smin(cr(x, y, z), cono(x, y, z, [0.37, 0.26, -0.06], [0.5, 0.92, -0.13], 0.25, 0.05, 1.7), 0.07);
      d = smin(d, cono(x, y, z, [0.64, -0.25, 0.04], [0.86, -0.37, 0.06], 0.1, 0.016), 0.05);   // mechones de los mofletes
      d = smin(d, cono(x, y, z, [0.66, -0.12, 0.02], [0.84, -0.17, 0.02], 0.07, 0.014), 0.04);
      return d;
    };
    // rosa pastel: el trío de gatos protagonistas se distingue de un vistazo: Nyan blanco y naranja,
    // Kage negro y rojo, Tama rosa. Las rayas, en un rosa más hondo.
    const GRIS = 0xf0b9c6, RAYA = 0xcf7f96, BLANCO = 0xfdf4f1;
    return {
      id: 'tama',
      cabeza: {
        f, geo: mallarCabeza('tama', f, pesoDe(0.45, 0.62)), pivote: [0.37, 0.3, -0.06], color: GRIS,
        u: { uRaya: C(RAYA), uBlanco: C(BLANCO), uRosa: C(0xf2899e) },
        pintPars: GLSL,
        pintura: `${PELO}
          float fr = smoothstep(-0.05, 0.25, np.z);
          // rayas de la frente (la «M» del atigrado) y de los lados
          float r = 9.0;
          r = min(r, seg2(p.xy, vec2(0.0, 0.47), vec2(0.0, 0.2)) - mix(0.028, 0.045, smoothstep(0.2, 0.47, p.y)));
          r = min(r, seg2(vec2(abs(p.x), p.y), vec2(0.15, 0.46), vec2(0.11, 0.24)) - mix(0.022, 0.04, smoothstep(0.24, 0.46, p.y)));
          float lados = min(seg2(vec2(abs(p.x), p.y), vec2(0.6, 0.04), vec2(0.82, 0.1)), seg2(vec2(abs(p.x), p.y), vec2(0.62, -0.1), vec2(0.84, -0.1))) - 0.03;
          col = mix(col, uRaya, aa(r) * fr * step(0.0, p.z));
          col = mix(col, uRaya, aa(lados) * step(0.52, abs(p.x)));
          // la nuca, con rayas onduladas
          col = mix(col, uRaya, aa(abs(sin(p.z * 17.0 + sin(p.x * 5.0) * 1.4)) - 0.28) * smoothstep(0.0, -0.2, p.z) * step(-0.25, p.y));
          // hocico y barbilla blancos
          col = mix(col, uBlanco, aa(elip2(p.xy, vec2(0.0, -0.3), vec2(0.34, 0.21))) * fr);
          // dentro de las orejas
          col = mix(col, uRosa, aa(triSDF(vec2(abs(p.x), p.y), vec2(0.24, 0.5), vec2(0.52, 0.47), vec2(0.47, 0.82)) + 0.02) * smoothstep(0.1, 0.4, np.z) * step(0.44, p.y));`,
      },
      cuerpo: { color: GRIS, mat: { u: { uRaya: C(RAYA), uBlanco: C(BLANCO) }, pintPars: GLSL,
        pintura: `${PELO}
          col = mix(col, uBlanco, aa(elip2(p.xy, vec2(0.0, 0.64), vec2(0.15, 0.3))) * smoothstep(0.02, 0.12, p.z));
          col = mix(col, uRaya, aa(abs(sin(p.y * 26.0 + sin(p.x * 7.0) * 1.2)) - 0.3) * smoothstep(-0.08, -0.22, p.z));` } },
      brazo: { color: GRIS, u: { uRaya: C(RAYA), uGuante: C(BLANCO) },
        pintura: 'if (p.z > 0.5 && p.z < 1.5) col = uGuante; else if (p.z < 0.5) col = mix(col, uRaya, aa(abs(fract(p.x * 3.0) - 0.5) - 0.09) * step(0.25, p.x) * step(p.x, 0.8));' },
      pata: { color: GRIS, almohadilla: 0xf2a7b0, u: { uCalcetin: C(BLANCO) }, pintura: 'col = mix(col, uCalcetin, aa(p.y + 0.55));' },
      cola: {
        color: GRIS, base: [0.0, 0.34, -0.33], u: { uRaya: C(RAYA) },
        geo: geoColaDe('tama', [[0.0, 0.34, -0.33], [0.2, 0.26, -0.58], [0.38, 0.4, -0.72], [0.46, 0.7, -0.66], [0.38, 0.96, -0.52]], (s) => 0.074 * (1 - 0.3 * s)),
        pintura: 'float s = p.x; col = mix(col, uRaya, max(aa(abs(fract(s * 5.5) - 0.5) - 0.16) * step(0.12, s), aa(0.86 - s)));',
      },
      cara: pestanas,
      extras(g) {
        // collar azul (el anil de la app) con cascabel dorado
        const collar = new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.032, 14, 48), vinilo(0x3d6fc2, { rug: 0.35, cc: 0.6 }));
        collar.rotation.x = Math.PI / 2 - 0.12; collar.position.set(0, 0.9, -0.07); g.cuerpo.add(collar);
        const cascabel = new THREE.Mesh(new THREE.SphereGeometry(0.062, 24, 16), new THREE.MeshPhysicalMaterial({ color: 0xf2c14e, metalness: 1, roughness: 0.25, clearcoat: 0.5 }));
        cascabel.position.set(0, 0.83, 0.15); g.cuerpo.add(cascabel);
        const raja = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.012, 0.02), vinilo(0x3a2a14)); raja.position.set(0, 0.815, 0.205); g.cuerpo.add(raja);
      },
    };
  },

  pon() {
    const P = { a: 0.8, k: 0.1, b: 0.5, cF: 0.6, cB: 0.6, n: 2.2, nA: 2.5, nB: 2.3, nZ: 2.2 }, cr = craneo(P);
    const f = (x, y, z) => {
      const ax = Math.abs(x);
      let d = cr(x, y, z);
      d = smin(d, elip(ax, y, z, [0.47, 0.5, -0.1], [0.17, 0.15, 0.085]), 0.05);                   // orejas redondas
      d = smin(d, cono(x, y, z, [0.7, -0.24, 0.05], [1.0, -0.4, 0.08], 0.13, 0.02), 0.05);         // mofletes de pelo en punta
      d = smin(d, cono(x, y, z, [0.72, -0.1, 0.0], [0.98, -0.16, 0.0], 0.1, 0.018), 0.05);
      d = smin(d, elip(x, y, z, [0.0, -0.25, 0.48], [0.21, 0.14, 0.14]), 0.08);                    // hocico
      return d;
    };
    // verde matcha (con el pardo se confundía con Fukuro; cada uno, su color): antifaz y patas oliva;
    // la hoja, la verde de siempre (la probé roja y no)
    const PARDO = 0xa9b97a, OSCURO = 0x4a4430, CREMA = 0xf4efd4, ANTIFAZ = 0x57512f, HOJA = 0x6aa84f, NERVIO = 0x4f8a3a;
    return {
      id: 'pon',
      cabeza: {
        f, geo: mallarCabeza('pon', f, pesoDe(0.38, 0.58)), pivote: [0.46, 0.42, -0.1], color: PARDO,
        u: { uOscuro: C(OSCURO), uAntifaz: C(ANTIFAZ), uCrema: C(CREMA) },
        pintPars: GLSL,
        pintura: `${PELO}
          float fr = smoothstep(-0.2, 0.15, np.z); vec2 q = vec2(abs(p.x), p.y);
          // raya oscura por la frente
          col = mix(col, mix(col, uOscuro, 0.45), aa(abs(p.x) - 0.06 - 0.03 * smoothstep(0.1, 0.5, p.y)) * step(0.16, p.y) * step(0.0, p.z));
          // las orejas, oscuras por fuera
          col = mix(col, uOscuro, smoothstep(0.43, 0.5, p.y) * step(0.3, q.x));
          // el antifaz: alrededor del ojo y bajando hacia el moflete
          float m = min(elip2(q, vec2(0.37, -0.05), vec2(0.21, 0.165)), elip2(q, vec2(0.52, -0.2), vec2(0.22, 0.12)));
          col = mix(col, uAntifaz, aa(m * 0.2 + 0.01 * sin(p.y * 40.0)) * fr);
          // cejas claras, hocico y barbilla crema, puntas de los mofletes
          col = mix(col, uCrema, aa(elip2(q, vec2(0.3, 0.19), vec2(0.13, 0.065))) * fr);
          col = mix(col, uCrema, aa(elip2(p.xy, vec2(0.0, -0.3), vec2(0.25, 0.2))) * step(0.2, p.z));
          col = mix(col, uCrema, smoothstep(0.84, 0.96, q.x));`,
      },
      cuerpo: { color: PARDO, escala: [1.2, 1.0, 1.2], mat: { u: { uOscuro: C(OSCURO), uCrema: C(CREMA) }, pintPars: GLSL,
        pintura: `${PELO}
          col = mix(col, uCrema, aa(elip2(p.xy, vec2(0.0, 0.56), vec2(0.17, 0.25))) * smoothstep(0.02, 0.14, p.z));
          col = mix(col, uOscuro, smoothstep(0.76, 0.82, p.y));` } },
      brazo: { color: OSCURO },
      pata: { color: OSCURO, almohadilla: 0x8a8062 },
      cola: {
        color: PARDO, base: [0.0, 0.34, -0.36], u: { uOscuro: C(OSCURO) },
        geo: geoColaDe('pon', [[0.0, 0.34, -0.36], [0.2, 0.2, -0.62], [0.44, 0.24, -0.8], [0.6, 0.42, -0.82], [0.64, 0.62, -0.72]], (s) => 0.09 + 0.11 * Math.pow(Math.sin(Math.PI * Math.min(1, s * 1.1)), 0.7)),
        pintura: 'float s = p.x; col = mix(col, uOscuro, max(aa(abs(s - 0.45) - 0.06), max(aa(abs(s - 0.7) - 0.06), aa(0.88 - s))));',
      },
      cara: brilloExtra,
      extras(g) {
        // la nariz y la hoja en la cabeza (la de transformarse, en los cuentos)
        const nariz = new THREE.Mesh(new THREE.SphereGeometry(0.058, 20, 14), vinilo(0x2b1d17, { rug: 0.25, cc: 0.8 }));
        nariz.scale.set(1.2, 0.85, 1); nariz.position.set(0, -0.2, 0.61); g.cabeza.add(nariz);
        const s = new THREE.Shape(); s.moveTo(0, 0); s.bezierCurveTo(0.14, 0.08, 0.13, 0.3, 0, 0.42); s.bezierCurveTo(-0.13, 0.3, -0.14, 0.08, 0, 0);
        const hoja = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2, curveSegments: 24 }),
          vinilo(HOJA, { rug: 0.4, cc: 0.5, u: { uNervio: C(NERVIO) }, pintPars: GLSL, pintura: 'col = mix(col, uNervio, aa(abs(p.x) - 0.008) * step(0.03, p.y));' }));
        hoja.scale.setScalar(1.6); hoja.rotation.set(-0.75, 0.25, -0.35); hoja.position.set(0.1, 0.46, -0.06); g.cabeza.add(hoja);
        const rabito = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.012, 0.09, 8), vinilo(NERVIO)); rabito.position.set(0, -0.04, 0.006); hoja.add(rabito);
      },
    };
  },

  fukuro() {
    const P = { a: 0.8, k: 0.06, b: 0.52, cF: 0.56, cB: 0.6, n: 2.8, nA: 3.2, nB: 2.4, nZ: 2.3 }, cr = craneo(P);
    const f = (x, y, z) => smin(cr(x, y, z), cono(x, y, z, [0.5, 0.34, -0.02], [0.82, 0.7, -0.08], 0.13, 0.02, 2.2), 0.06);   // penachos de plumas, hacia fuera
    const PARDO = 0xa68566, DISCO = 0xefe2c6, BORDE = 0x6b5040;
    return {
      id: 'fukuro',
      cabeza: {
        f, geo: mallarCabeza('fukuro', f, pesoDe(0.46, 0.62)), pivote: [0.5, 0.38, -0.04], color: PARDO,
        u: { uDisco: C(DISCO), uBorde: C(BORDE), uMota: C(0xd9c6a4) },
        pintPars: GLSL,
        pintura: `${PELO}
          float fr = smoothstep(-0.1, 0.25, np.z); vec2 q = vec2(abs(p.x), p.y);
          // el disco facial: dos círculos alrededor de los ojos, con su borde oscuro
          float d = min(elip2(q, vec2(0.31, -0.06), vec2(0.34, 0.36)), elip2(p.xy, vec2(0.0, -0.3), vec2(0.3, 0.18)));
          col = mix(col, uBorde, aa(d * 0.3 - 0.025) * fr);
          col = mix(col, uDisco, aa(d * 0.3) * fr);
          // motas claras en la coronilla y la nuca
          vec2 m = fract(vec2(p.x * 7.0, p.z * 7.0 + p.y * 3.0)) - 0.5;
          col = mix(col, uMota, aa(length(m) - 0.13) * step(0.1, p.y) * (1.0 - fr));`,
      },
      cuerpo: { color: PARDO, escala: [1.14, 1.0, 1.12], mat: { u: { uDisco: C(DISCO), uBorde: C(BORDE) }, pintPars: GLSL,
        pintura: `${PELO}
          float pecho = aa(elip2(p.xy, vec2(0.0, 0.58), vec2(0.2, 0.34))) * smoothstep(0.0, 0.12, p.z);
          float v = abs(fract(p.y * 8.0 + abs(p.x) * 5.0) - 0.5);
          col = mix(col, mix(uDisco, uBorde, aa(v - 0.07) * 0.85), pecho);` } },
      brazo: { color: PARDO, u: { uPluma: C(0xd9c6a4), uPunta: C(0x7a5c44) },
        pintura: 'if (p.z < 0.5) col = mix(col, uPluma, aa(abs(fract(p.x * 4.0 + 0.2) - 0.5) - 0.1) * step(0.3, p.x)); else if (p.z < 1.5) col = uPunta;' },
      pata: { color: 0xd8c29a, almohadilla: 0xc8932c, u: { uGarra: C(0xe0b040) }, pintura: 'col = mix(col, uGarra, aa(p.y + 0.6));' },
      cola: {
        color: PARDO, base: [0.0, 0.3, -0.33], u: { uPluma: C(0xd9c6a4) },
        geo: geoColaDe('fukuro', [[0.0, 0.3, -0.33], [0.0, 0.2, -0.46], [0.0, 0.1, -0.56]], (s) => 0.075 + 0.03 * s),
        pintura: 'float s = p.x; col = mix(col, uPluma, aa(abs(fract(s * 3.0) - 0.5) - 0.12));',
      },
      extras(g) {
        // el pico tapa la boca dibujada (al abrirla, asoma debajo como si abriera el pico)
        // 30-09 · el pico sale HACIA DELANTE y un poco hacia abajo, entre los ojos (antes caía casi vertical y parecía una nariz caída)
        const pico = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.17, 24), vinilo(0xe4a73c, { rug: 0.3, cc: 0.7 }));
        pico.rotation.x = Math.PI / 2 + 0.45; pico.position.set(0, -0.11, 0.66); g.cabeza.add(pico);
        // gafas redondas de maestra
        const montura = vinilo(0x3b2a20, { rug: 0.3, cc: 0.9 });
        for (const l of [-1, 1]) {
          const aro = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.02, 12, 48), montura);
          aro.position.set(l * 0.34, -0.03, 0.6); aro.rotation.y = l * 0.28; g.cabeza.add(aro);
          const patilla = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.42, 8), montura);
          patilla.rotation.x = Math.PI / 2; patilla.position.set(l * 0.62, 0.0, 0.33); patilla.rotation.z = l * 0.12; g.cabeza.add(patilla);
        }
        const puente = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.016, 8, 20, Math.PI), montura); puente.position.set(0, 0.0, 0.66); g.cabeza.add(puente);
      },
    };
  },

  kotaro() {
    const P = { a: 0.74, k: 0.22, b: 0.5, cF: 0.56, cB: 0.58, n: 2.6, nA: 3.2, nB: 2.6, nZ: 2.3 }, cr = craneo(P);
    const f = (x, y, z) => {
      const ax = Math.abs(x);
      let d = smin(cr(x, y, z), cono(x, y, z, [0.38, 0.28, 0.02], [0.5, 0.9, 0.07], 0.24, 0.04, 2.2), 0.06);   // orejas en punta
      d = smin(d, elip(x, y, z, [0.0, -0.24, 0.5], [0.25, 0.17, 0.2]), 0.1);                              // hocico
      d = smin(d, elip(ax, y, z, [0.72, -0.3, 0.06], [0.14, 0.11, 0.14]), 0.06);                        // mofletes
      return d;
    };
    const ROJO = 0xd4843f, URAJIRO = 0xfbf2e3;
    return {
      id: 'kotaro',
      cabeza: {
        f, geo: mallarCabeza('kotaro', f, pesoDe(0.45, 0.62)), pivote: [0.38, 0.3, 0.02], color: ROJO,
        u: { uBlanco: C(URAJIRO), uDentro: C(0xf7e3cf) },
        pintPars: GLSL,
        pintura: `${PELO}
          float fr = smoothstep(-0.25, 0.1, np.z); vec2 q = vec2(abs(p.x), p.y);
          // urajiro: hocico, mofletes y barbilla
          float u = min(elip2(p.xy, vec2(0.0, -0.28), vec2(0.3, 0.2)), elip2(q, vec2(0.5, -0.33), vec2(0.32, 0.17)));
          u = min(u, (p.y + 0.44) * 4.0);
          col = mix(col, uBlanco, aa(u * 0.25) * fr);
          // cejitas (maro-mayu)
          col = mix(col, uBlanco, aa(elip2(q, vec2(0.3, 0.19), vec2(0.075, 0.05))) * step(0.0, p.z));
          // dentro de las orejas
          col = mix(col, uDentro, aa(triSDF(q, vec2(0.25, 0.5), vec2(0.52, 0.47), vec2(0.49, 0.84)) + 0.02) * smoothstep(0.05, 0.35, np.z) * step(0.44, p.y));`,
      },
      cuerpo: { color: ROJO, mat: { u: { uBlanco: C(URAJIRO) }, pintPars: GLSL,
        pintura: `${PELO} col = mix(col, uBlanco, aa(elip2(p.xy, vec2(0.0, 0.6), vec2(0.16, 0.36))) * smoothstep(0.0, 0.12, p.z));` } },
      brazo: { color: ROJO, u: { uGuante: C(URAJIRO) }, pintura: 'if (p.z > 0.5 && p.z < 1.5) col = uGuante;' },
      pata: { color: ROJO, almohadilla: 0x5a3a2a, u: { uCalcetin: C(URAJIRO) }, pintura: 'col = mix(col, uCalcetin, aa(p.y + 0.5));' },
      cola: {
        color: ROJO, base: [0.0, 0.4, -0.34], u: { uBlanco: C(URAJIRO) },
        geo: geoColaDe('kotaro', [[0.0, 0.4, -0.34], [0.02, 0.62, -0.56], [0.06, 0.88, -0.58], [0.1, 0.98, -0.42], [0.1, 0.86, -0.3]], (s) => 0.1 * (1 - 0.25 * s)),
        pintura: 'float s = p.x; col = mix(col, uBlanco, aa(0.82 - s));',
      },
      extras(g) {
        const nariz = new THREE.Mesh(new THREE.SphereGeometry(0.06, 20, 14), vinilo(0x2b1d17, { rug: 0.2, cc: 0.9 }));
        nariz.scale.set(1.25, 0.85, 1); nariz.position.set(0, -0.15, 0.69); g.cabeza.add(nariz);
      },
    };
  },

  // Kage (影, «sombra»): el contrario de Nyan, su rival guay. NO es negro saturado: gris
  // pizarra cálido y mate, para que no chille al lado de los demás (el negro con rojos chillaba demasiado).
  // Pelo de wolf cut (puntas desfiladas en la coronilla, nuca larga en punta, patillas afiladas) SIN flequillo delante;
  // orejas por dentro crema, ojos claros con la pupila afilada, una oreja mordida y un solo acento: rojo apagado en las
  // muñecas y la punta de la cola. Misma figura que Nyan.
  kage() {
    const P = { a: 0.74, k: 0.24, b: 0.5, cF: 0.56, cB: 0.58, n: 2.7, nA: 3.4, nB: 2.8, nZ: 2.3 }, cr = craneo(P);
    const PELO_K = [   // [base, punta, radio base, radio punta]
      [[0.0, 0.44, 0.04], [0.06, 0.74, -0.22], 0.14, 0.02],        // coronilla, hacia arriba y atrás
      [[-0.16, 0.44, -0.1], [-0.24, 0.66, -0.44], 0.12, 0.018],
      [[0.16, 0.44, -0.1], [0.27, 0.64, -0.46], 0.12, 0.018],
      [[0.0, 0.1, -0.48], [0.03, -0.36, -0.7], 0.16, 0.03],        // la nuca larga del wolf cut
      [[-0.28, 0.08, -0.44], [-0.44, -0.3, -0.6], 0.12, 0.02],
      [[0.28, 0.08, -0.44], [0.46, -0.3, -0.58], 0.12, 0.02],
    ];
    const f = (x, y, z) => {
      let d = smin(cr(x, y, z), cono(x, y, z, [0.38, 0.26, -0.06], [0.57, 1.02, -0.16], 0.25, 0.02, 1.9), 0.06);
      d = smax(d, -(Math.hypot(x - 0.62, y - 0.86, z + 0.15) - 0.1), 0.02);        // la oreja mordida (solo la de la derecha)
      for (const [a, b, r1, r2] of PELO_K) d = smin(d, conoRedondo(x, y, z, ...a, ...b, r1, r2), 0.04);
      d = smin(d, cono(x, y, z, [0.64, -0.24, 0.02], [0.92, -0.38, 0.04], 0.1, 0.014), 0.04);   // patillas en punta
      d = smin(d, cono(x, y, z, [0.66, -0.08, -0.02], [0.9, -0.1, -0.06], 0.08, 0.012), 0.04);
      return d;
    };
    const PIZARRA = 0x7a7472, ACENTO = 0xa14a42, CREMA_O = 0xeed8bd, PECHO = 0xd8d1c8;
    const MATE = { rug: 0.66, cc: 0.12, ccr: 0.5 };
    return {
      id: 'kage', mate: MATE,
      cabeza: {
        f, geo: mallarCabeza('kage', f, pesoDe(0.45, 0.62)), pivote: [0.38, 0.3, -0.06], color: PIZARRA, mat: MATE,
        u: { uCrema: C(CREMA_O), uTintaCara: C(0xe8e3dc) },
        pintPars: GLSL,
        pintura: `${PELO}
          vec2 q = vec2(abs(p.x), p.y);
          col = mix(col, uCrema, aa(triSDF(q, vec2(0.25, 0.5), vec2(0.53, 0.47), vec2(0.5, 0.86)) + 0.02) * smoothstep(0.1, 0.4, np.z) * step(0.44, p.y));`,
      },
      cuerpo: { color: PIZARRA, mat: { ...MATE, u: { uPecho: C(PECHO) }, pintPars: GLSL,
        // la pechera en punta (tres mechones), gris claro: nada de blanco que chille
        pintura: `${PELO}
          float pe = min(elip2(p.xy, vec2(0.0, 0.76), vec2(0.13, 0.13)), min(triSDF(p.xy, vec2(-0.13, 0.8), vec2(0.13, 0.8), vec2(0.0, 0.56)), min(triSDF(p.xy, vec2(-0.13, 0.8), vec2(-0.02, 0.72), vec2(-0.1, 0.6)), triSDF(p.xy, vec2(0.13, 0.8), vec2(0.02, 0.72), vec2(0.1, 0.6)))));
          col = mix(col, uPecho, aa(pe) * smoothstep(0.02, 0.12, p.z));` } },
      brazo: { color: PIZARRA, u: { uAcento: C(ACENTO) }, pintura: 'if (p.z < 0.5) col = mix(col, uAcento, aa(abs(p.x - 0.86) - 0.04));' },
      pata: { color: PIZARRA, almohadilla: 0x3e393a },
      cola: {
        color: PIZARRA, base: [0.0, 0.34, -0.33], u: { uAcento: C(ACENTO) },
        geo: geoColaDe('kage', [[0.0, 0.34, -0.33], [0.22, 0.3, -0.55], [0.3, 0.52, -0.66], [0.5, 0.62, -0.6], [0.52, 0.9, -0.5]], (s) => 0.07 * (1 - 0.45 * s)),
        pintura: 'float s = p.x; col = mix(col, uAcento, aa(0.86 - s));',
      },
      // ojos claros (la tinta sale clara sobre el gris) con la pupila afilada en vertical: mirada seria, sin rojo
      cara: (c, nombre, s) => {
        if (!['normal', 'presumido', 'decidido', 'aburrido', 'sorpresa'].includes(nombre) || s.abre < 0.45) return;
        const k = nombre === 'normal' || nombre === 'sorpresa' ? 1 : 0.7;
        for (const l of [-1, 1]) {
          const X = l * OJO.x + s.mx * k, Y = OJO.y + s.my * k - (k < 1 ? 0.012 : 0);
          elipse(c, X, Y, 0.017, 0.07, '#2c3f78');
          elipse(c, X - 0.024, Y + 0.04, 0.014, 0.018, '#ffffff');
        }
      },
    };
  },
};

export const REPARTO = Object.keys(ESPECIES);
const hechas = {};
export function especie(id) { return (hechas[id] ||= ESPECIES[id]()); }
