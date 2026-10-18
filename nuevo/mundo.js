// El cuarto de Nyan, vestido según el tema: luces, revelado, lo que se ve por la ventana redonda, los muebles, la ropa y el aire.
// No es un filtro encima: cada tema vuelve a iluminar la sala (la noche tiene luna por la ventana y la lámpara de papel encendida).
const { THREE } = window.Nyan3D.NUCLEO;

// luces de la sala por su papel (se reconocen por el color con el que las crea mascota.js)
const PAPEL = { 0xffd9a0: 'hemi', 0xffd48c: 'foco', 0xffe2bc: 'caja', 0xffcc78: 'bano', 0xffb870: 'contra', 0xbcd4ff: 'fuera', 0xffc27c: 'bajo' };
const LUZ = {
  washi: { exp: 0.75, hemi: [0xffd9a0, 0.55], foco: [0xffd48c, 2.5], caja: [0xffe2bc, 1.7], bano: [0xffcc78, 5.5], contra: [0xffb870, 1.5], fuera: [0xbcd4ff, 2.2], bajo: [0xffc27c, 1.9], lampara: 2.6 },
  noche: { exp: 0.92, hemi: [0x6f80c8, 0.24], foco: [0x9fb2ff, 0.45], caja: [0x9fb0e8, 0.42], bano: [0xffa055, 9], contra: [0x8aa2ff, 2.2], fuera: [0x7f9cff, 4.2], bajo: [0xffa050, 3.2], lampara: 5 },
  pop: { exp: 0.95, hemi: [0xffe3f5, 0.9], foco: [0xfff2e6, 2.7], caja: [0xffffff, 2.5], bano: [0xff6fcf, 7], contra: [0x3ad1ff, 3], fuera: [0xc6f0ff, 2.6], bajo: [0xffd23f, 2.4], lampara: 2.2 },
  sumi: { exp: 0.82, hemi: [0xf2efe8, 0.62], foco: [0xfff8ee, 2.4], caja: [0xffffff, 1.9], bano: [0xfff0dc, 4], contra: [0xffffff, 1.1], fuera: [0xe8eef5, 2.2], bajo: [0xf0e8dc, 1.1], lampara: 1.6 },
  heisei: { exp: 0.84, hemi: [0xc9d6ff, 0.5], foco: [0xe6ecff, 2.2], caja: [0xd8e4ff, 1.8], bano: [0xb57bff, 7], contra: [0x5fe0ff, 2.8], fuera: [0x9fd0ff, 3], bajo: [0xff6fd8, 2.2], lampara: 2.4 },
};
// el revelado (uniforms que añadimos al shader de la sala)
const GRADO = {
  washi: { uTinte: [1.03, 0.985, 0.77], uTinteK: 0.8, uAltas: [1.03, 0.99, 0.86], uAltasK: 0.62, uSat: 1, uRojo: 0, uVin: 0.5, uTecho: 0.62, uLevanta: [0.014, 0.009, 0.003], uGrano: 0.022, uContraste: 1 },
  noche: { uTinte: [0.84, 0.92, 1.16], uTinteK: 0.85, uAltas: [1.04, 0.97, 0.88], uAltasK: 0.3, uSat: 1.05, uRojo: 0, uVin: 0.42, uTecho: 0.55, uLevanta: [0.004, 0.006, 0.016], uGrano: 0.03, uContraste: 1.06 },
  pop: { uTinte: [1.02, 1.0, 1.0], uTinteK: 0.3, uAltas: [1, 1, 1], uAltasK: 0.15, uSat: 1.38, uRojo: 0, uVin: 0.8, uTecho: 0.86, uLevanta: [0.02, 0.014, 0.022], uGrano: 0.008, uContraste: 1.1 },
  sumi: { uTinte: [1.0, 0.985, 0.95], uTinteK: 0.6, uAltas: [1.0, 0.985, 0.95], uAltasK: 0.5, uSat: 0, uRojo: 1, uVin: 0.55, uTecho: 0.72, uLevanta: [0.035, 0.032, 0.027], uGrano: 0.045, uContraste: 1.2 },
  heisei: { uTinte: [0.82, 0.9, 1.25], uTinteK: 0.85, uAltas: [0.94, 0.98, 1.12], uAltasK: 0.55, uSat: 1.22, uRojo: 0, uVin: 0.62, uTecho: 0.72, uLevanta: [0.012, 0.01, 0.032], uGrano: 0.018, uContraste: 1.06 },
};
// muebles, ropa, accesorio y aire de cada mundo (todo sale del catálogo real de la sala)
const VESTIDO = {
  washi: { props: ['furin', 'uchiwa', 'mikan', 'bonsai', 'orizuru', 'cuaderno'], ropa: 'yukata', acc: 'mugiwara', aura: null, fondo: 0x4a3c22 },
  noche: { props: ['andon', 'chochin', 'kingyo', 'taiko', 'uchiwa', 'dango'], ropa: 'happi', acc: 'kitsune-men', aura: 'aura-hotaru', fondo: 0x0b1020 },
  pop: { props: ['consola', 'kendama', 'daruma', 'gato-suerte', 'ramen', 'dango'], ropa: 'sukajan', acc: 'gafas-sol', aura: 'aura-hoshi', fondo: 0xffd6ee },
  sumi: { props: ['kakejiku-ryu', 'fude', 'hanko', 'byobu', 'katanakake', 'bonsai'], ropa: null, acc: null, aura: 'aura-yuki', fondo: 0xeeeae2 },
  heisei: { props: ['tele-crt', 'radicasete', 'consola', 'tocadiscos', 'kotatsu', 'orizuru'], ropa: 'parka', acc: 'cascos', aura: 'aura-hoshi', fondo: 0x1a2060 },
};

// ── lo que se ve por la ventana (lienzos de 1024 px; el círculo de la ventana usa el centro) ──
const azar = (s) => () => ((s = (s * 16807) % 2147483647) / 2147483647);
function cielo(c, stops) { const g = c.createLinearGradient(0, 0, 0, 1024); stops.forEach(([o, col]) => g.addColorStop(o, col)); c.fillStyle = g; c.fillRect(0, 0, 1024, 1024); }
function monte(c, x, y, w, h, col) { c.fillStyle = col; c.beginPath(); c.moveTo(x - w, 1024); c.bezierCurveTo(x - w * 0.55, y + h * 0.35, x - w * 0.18, y, x, y); c.bezierCurveTo(x + w * 0.18, y, x + w * 0.55, y + h * 0.35, x + w, 1024); c.fill(); }
const VENTANA = {
  noche(c, t) {
    cielo(c, [[0, '#101a52'], [0.5, '#2a3394'], [0.78, '#5a4bb0'], [1, '#2a2160']]);
    const r = azar(7);
    for (let i = 0; i < 130; i++) { const x = r() * 1024, y = r() * 640, s = r() * 2.2 + 0.4, tw = 0.55 + 0.45 * Math.sin(t * (1 + r() * 2) + i); c.globalAlpha = tw; c.fillStyle = '#fff'; c.fillRect(x, y, s, s); }
    c.globalAlpha = 1;
    // luna con su halo
    const lx = 690, ly = 300, g = c.createRadialGradient(lx, ly, 20, lx, ly, 220); g.addColorStop(0, 'rgba(255,240,200,.55)'); g.addColorStop(1, 'rgba(255,240,200,0)');
    c.fillStyle = g; c.fillRect(0, 0, 1024, 1024); c.fillStyle = '#fff4d6'; c.beginPath(); c.arc(lx, ly, 62, 0, 7); c.fill();
    c.fillStyle = 'rgba(190,180,150,.35)'; [[-18, -10, 14], [16, 18, 10], [8, -26, 7]].forEach(([dx, dy, rr]) => { c.beginPath(); c.arc(lx + dx, ly + dy, rr, 0, 7); c.fill(); });
    // fuegos artificiales: cada 2,4 s uno nuevo, de un color
    const cols = ['#ffb347', '#ff5fa8', '#7ff3ff', '#c6ff3d', '#fff3c4'];
    for (let k = 0; k < 3; k++) {
      const n = Math.floor(t / 2.4) - k, ed = t - n * 2.4; if (ed > 2.2 || n < 0) continue;
      const rr = azar(n * 31 + 5), x = 220 + rr() * 560, y = 160 + rr() * 260, col = cols[n % cols.length], R = 150 * (1 - Math.pow(1 - Math.min(ed / 1.1, 1), 3));
      c.globalAlpha = Math.max(0, 1 - ed / 2.2); c.fillStyle = col;
      for (let i = 0; i < 44; i++) { const a = (i / 44) * Math.PI * 2, rx = x + Math.cos(a) * R, ry = y + Math.sin(a) * R + ed * ed * 22; c.beginPath(); c.arc(rx, ry, 4.2, 0, 7); c.fill(); c.globalAlpha *= 0.999; }
      c.globalAlpha = 1;
    }
    monte(c, 470, 560, 520, 470, '#0d1230');
    monte(c, 120, 760, 420, 260, '#090c22'); monte(c, 920, 740, 400, 280, '#0a0d26');
    // farolillos del festival a lo lejos
    for (let i = 0; i < 14; i++) { const x = 150 + i * 56, y = 820 + Math.sin(i * 0.9) * 10; const gg = c.createRadialGradient(x, y, 0, x, y, 26); gg.addColorStop(0, 'rgba(255,170,70,.95)'); gg.addColorStop(1, 'rgba(255,120,40,0)'); c.fillStyle = gg; c.fillRect(x - 26, y - 26, 52, 52); }
  },
  pop(c, t) {
    cielo(c, [[0, '#7fd8ff'], [0.5, '#ffb3e1'], [1, '#ffe27a']]);
    // arcoíris
    const arco = ['#ff4fa3', '#ff9a3c', '#ffd23f', '#2ee59d', '#3ad1ff', '#7c3aed'];
    c.lineWidth = 34; arco.forEach((col, i) => { c.strokeStyle = col; c.globalAlpha = 0.85; c.beginPath(); c.arc(512, 1000, 560 - i * 34, Math.PI, 0); c.stroke(); });
    c.globalAlpha = 1;
    // sol que gira
    c.save(); c.translate(780, 250); c.rotate(t * 0.4); c.fillStyle = '#ffd23f';
    for (let i = 0; i < 12; i++) { c.rotate(Math.PI / 6); c.beginPath(); c.moveTo(0, -90); c.lineTo(18, -140); c.lineTo(-18, -140); c.fill(); }
    c.restore(); c.fillStyle = '#ffe766'; c.strokeStyle = '#1a1033'; c.lineWidth = 8; c.beginPath(); c.arc(780, 250, 82, 0, 7); c.fill(); c.stroke();
    c.fillStyle = '#1a1033'; c.beginPath(); c.arc(755, 240, 8, 0, 7); c.arc(805, 240, 8, 0, 7); c.fill(); c.lineWidth = 6; c.beginPath(); c.arc(780, 262, 22, 0.2, Math.PI - 0.2); c.stroke();
    // nubes gorditas que pasan
    const nube = (x, y, k) => { c.fillStyle = '#fff'; c.strokeStyle = '#1a1033'; c.lineWidth = 7; c.beginPath(); [[0, 0, 60], [55, -25, 70], [120, 0, 58], [60, 20, 60]].forEach(([dx, dy, rr]) => c.arc(x + dx * k, y + dy * k, rr * k, 0, 7)); c.stroke(); c.fill(); };
    nube(((t * 30) % 1400) - 260, 430, 1); nube(((t * 18 + 700) % 1400) - 260, 600, 0.75); nube(((t * 24 + 300) % 1400) - 260, 200, 0.6);
    // colinas de juguete
    c.fillStyle = '#2ee59d'; c.strokeStyle = '#1a1033'; c.lineWidth = 8; c.beginPath(); c.ellipse(260, 1020, 420, 190, 0, 0, 7); c.fill(); c.stroke();
    c.fillStyle = '#3ad1ff'; c.beginPath(); c.ellipse(820, 1040, 400, 200, 0, 0, 7); c.fill(); c.stroke();
  },
  sumi(c) {
    cielo(c, [[0, '#f3efe6'], [1, '#e7e1d4']]);
    c.fillStyle = '#c8241a'; c.beginPath(); c.arc(700, 300, 92, 0, 7); c.fill();
    // montes en aguada: oscuros arriba, se deshacen en la niebla
    const lavado = (x, y, w, h, a) => {
      const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, `rgba(27,26,25,${a})`); g.addColorStop(0.55, `rgba(27,26,25,${a * 0.35})`); g.addColorStop(1, 'rgba(27,26,25,0)');
      monte(c, x, y, w, h, g);
    };
    lavado(360, 330, 360, 700, 0.85); lavado(640, 430, 330, 600, 0.55); lavado(160, 560, 300, 480, 0.4); lavado(900, 600, 300, 420, 0.35);
    c.fillStyle = 'rgba(243,239,230,.7)'; c.fillRect(0, 700, 1024, 60); c.fillRect(0, 820, 1024, 90);
    // pájaros de un trazo
    c.strokeStyle = '#1b1a19'; c.lineWidth = 5; c.lineCap = 'round';
    [[300, 200], [340, 230], [270, 240]].forEach(([x, y]) => { c.beginPath(); c.moveTo(x - 18, y); c.quadraticCurveTo(x - 6, y - 10, x, y); c.quadraticCurveTo(x + 6, y - 10, x + 18, y); c.stroke(); });
  },
  heisei(c, t) {
    cielo(c, [[0, '#0b1650'], [0.45, '#2b3fd8'], [0.75, '#7a4be0'], [1, '#ff6fd8']]);
    // las ondas de la consola, que respiran
    for (let k = 0; k < 6; k++) {
      c.beginPath(); c.lineWidth = 2 + k * 1.2; c.strokeStyle = `rgba(255,255,255,${0.12 + k * 0.04})`;
      for (let x = 0; x <= 1024; x += 8) { const y = 560 + Math.sin(x * 0.006 + t * (0.6 + k * 0.13) + k) * (50 + k * 12) + Math.sin(x * 0.013 - t * 0.7) * 18 + k * 14; x ? c.lineTo(x, y) : c.moveTo(x, y); }
      c.stroke();
    }
    const r = azar(11);
    for (let i = 0; i < 40; i++) { const x = r() * 1024, y = r() * 1024, s = (Math.sin(t * 2 + i) + 1) * 5 + 2; c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.moveTo(x, y - s * 2); c.lineTo(x + s * 0.4, y); c.lineTo(x, y + s * 2); c.lineTo(x - s * 0.4, y); c.fill(); c.beginPath(); c.moveTo(x - s * 2, y); c.lineTo(x, y + s * 0.4); c.lineTo(x + s * 2, y); c.lineTo(x, y - s * 0.4); c.fill(); }
  },
};
const ANIMADA = { noche: true, pop: true, heisei: true };

let lienzoV = null, texV = null, mapaOrig = null, colorOrig = null, temaV = 'washi', rafV = 0, ultimo = 0;
function ventanaDe(m) { return m.prim?.ventana?.children?.[0] || null; }
function pintarVentana(t) {
  if (!lienzoV) return;
  const c = lienzoV.getContext('2d'); VENTANA[temaV]?.(c, t); texV.needsUpdate = true;
}
let mascotaV = null;
function bucleVentana(ms) {
  if (!mascotaV || mascotaV.muerta || mascotaV.pausada) { rafV = 0; return; }   // fuera del cuarto no se pinta (vestir() la vuelve a encender)
  rafV = requestAnimationFrame(bucleVentana);
  if (ms - ultimo < 50) return; ultimo = ms; // 20 fps bastan para lo de fuera
  pintarVentana(ms / 1000);
}

let base = null;
function guardarBase(m) {
  base = { m, luces: [], lampara: null };
  m.escena.traverse((o) => {
    if (o.isLight) { const papel = PAPEL[o.color.getHex()] || (o === m.foco ? 'foco' : o === m.bano ? 'bano' : o === m.contra ? 'contra' : null); if (papel) base.luces.push([o, papel]); }
    if (o.isMesh && o.material?.emissive && o.material.emissive.getHex() === 0xffa448) base.lampara = o.material;
  });
}

export function vestir(m, tema) {
  if (!LUZ[tema]) tema = 'washi';
  mascotaV = m;
  if (!base || base.m !== m) { guardarBase(m); mapaOrig = null; colorOrig = null; }   // cada visita al cuarto trae una escena nueva
  const L = LUZ[tema];
  for (const [o, papel] of base.luces) { const [col, k] = L[papel]; o.color.setHex(col); o.intensity = k; }
  if (base.lampara) base.lampara.emissiveIntensity = L.lampara;
  if (m.render) m.render.toneMappingExposure = L.exp;
  const u = m.post?.mat?.uniforms;
  if (u) for (const [k, v] of Object.entries(GRADO[tema])) { if (!u[k]) continue; Array.isArray(v) ? u[k].value.set(...v) : (u[k].value = v); }
  const V = VESTIDO[tema];
  if (m.escena.background?.isColor) m.escena.background.setHex(V.fondo);
  m.quitarEquipo?.(['kabuto', 'katana', 'bokken', 'haori']);
  m.decorar?.(V.props); m.ropa?.(V.ropa); m.accesorio?.(V.acc); m.auraColeccion?.(V.aura);
  // la ventana
  const v = ventanaDe(m);
  if (v) {
    if (!mapaOrig) { mapaOrig = v.material.map; colorOrig = v.material.color.clone(); }
    cancelAnimationFrame(rafV); temaV = tema;
    if (VENTANA[tema]) {
      if (!lienzoV) { lienzoV = document.createElement('canvas'); lienzoV.width = lienzoV.height = 1024; texV = new THREE.CanvasTexture(lienzoV); texV.colorSpace = THREE.SRGBColorSpace; texV.anisotropy = 4; }
      pintarVentana(performance.now() / 1000);
      v.material.map = texV; v.material.color.setRGB(1, 1, 1);
      if (ANIMADA[tema] && !matchMedia('(prefers-reduced-motion: reduce)').matches) rafV = requestAnimationFrame(bucleVentana);
    } else { v.material.map = mapaOrig; v.material.color.copy(colorOrig); }
    v.material.needsUpdate = true;
  }
  m.despertar?.();
}
