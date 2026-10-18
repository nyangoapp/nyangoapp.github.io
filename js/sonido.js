// Sonido: koto sintetizado (Karplus-Strong), campanas, taiko, sello y papel. Todo generado aquí, sin archivos.
// Las rachas suenan cada vez mejor: tramoDe(racha) da el tramo (3/5/10/15/20/30…) y acierto() y tramo() escalan con él.
// Y dos cosas más: la voz de Nyan (voz(): ruiditos, no palabras; grabados con VOICEVOX:ずんだもん si están en web/sonidos/nyan/,
// sintetizados si no) y la música de la portada (musica(), sintetizada).
let ctx = null, maestro = null, salida = null, sala = null, activo = true;
// tres volúmenes (ajustes): la música de la portada, los efectos y la voz de Nyan. `salida` es el de los efectos.
let busVoz = null, busMus = null, salaVoz = null, salaMus = null, IR = null;
const VOL = { musica: 1, efectos: 1, voz: 1 };
const cache = new Map();
const YO = [0, 2, 5, 7, 9]; // escala yo (pentatónica japonesa)

export function iniciar() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  // iPhone: sin esto, el interruptor de silencio apaga todo el AudioContext (y con él las palabras grabadas). «playback» es
  // lo de una app cuyo sonido es contenido, como un reproductor: suena aunque el teléfono esté en silencio
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* navegador sin audioSession */ }
  ctx = new AudioContext();
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3;
  maestro = ctx.createGain(); maestro.gain.value = 0.9; maestro.connect(comp).connect(ctx.destination);
  const bus = (v) => { const g = ctx.createGain(); g.gain.value = curva(v); g.connect(maestro); return g; };
  salida = bus(VOL.efectos); busVoz = bus(VOL.voz); busMus = bus(VOL.musica);
  const n = Math.floor(ctx.sampleRate * 2.2); IR = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = IR.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.6); }
  // una sala (reverberación) por volumen: así bajar los efectos no deja colgando la cola de la música o de la voz
  sala = crearSala(salida); salaVoz = crearSala(busVoz); salaMus = crearSala(busMus);
  ctx.onstatechange = mover; mover();
  cargarTomas();
}
function crearSala(destino) { const c = ctx.createConvolver(), g = ctx.createGain(); c.buffer = IR; g.gain.value = 0.22; c.connect(g).connect(destino); return c; }
const curva = (v) => Math.pow(Math.max(0, Math.min(1, v)), 2);   // el oído es logarítmico: la mitad del deslizador suena a la mitad
export const activar = (si) => { activo = si; };
// volúmenes de 0 a 1 (los deslizadores de los ajustes van de 0 a 100)
export function volumenes(v = {}) {
  for (const k of ['musica', 'efectos', 'voz']) if (typeof v[k] === 'number') VOL[k] = v[k];
  if (!ctx) return;
  for (const [k, g] of [['musica', busMus], ['efectos', salida], ['voz', busVoz]]) g.gain.setTargetAtTime(curva(VOL[k]), ctx.currentTime, 0.05);
}
const listo = () => ctx && activo;
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const azar = (a, b) => a + Math.random() * (b - a);
const lado = (p) => Math.max(-1, Math.min(1, p));

function cuerda(m, dur = 1.8) {
  const clave = m + ':' + dur;
  if (cache.has(clave)) return cache.get(clave);
  const sr = ctx.sampleRate, largo = Math.floor(sr * dur), buf = ctx.createBuffer(1, largo, sr), d = buf.getChannelData(0);
  const periodo = Math.max(2, Math.round(sr / hz(m))), linea = new Float32Array(periodo);
  for (let i = 0; i < periodo; i++) linea[i] = (Math.random() * 2 - 1) * (0.6 + 0.4 * Math.sin((i / periodo) * Math.PI));
  let k = 0, ant = 0;
  const amort = 0.4985 + Math.min(0.0012, 12 / hz(m) * 0.02);
  for (let i = 0; i < largo; i++) {
    const v = linea[k];
    d[i] = v * (i < 40 ? i / 40 : 1);
    linea[k] = (v + ant) * amort; ant = v;
    k = (k + 1) % periodo;
  }
  cache.set(clave, buf);
  return buf;
}
export function koto(m, cuando = 0, vel = 1, pan = 0, destino = null) {
  if (!ctx || (!destino && !activo)) return;
  const t = ctx.currentTime + 0.005 + cuando, s = ctx.createBufferSource(); s.buffer = cuerda(m);
  const g = ctx.createGain(); g.gain.value = 0.55 * vel;
  const p = ctx.createStereoPanner(); p.pan.value = lado(pan);
  const brillo = ctx.createBiquadFilter(); brillo.type = 'peaking'; brillo.frequency.value = 2600; brillo.gain.value = 5;
  s.connect(brillo).connect(g).connect(p); p.connect(destino || salida); if (!destino) p.connect(sala); s.start(t);
}
function ruido(dur, tipo, freq, q, vol, cuando = 0, caida = 4) {
  const t = ctx.currentTime + 0.005 + cuando, n = Math.floor(ctx.sampleRate * dur), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, caida);
  const s = ctx.createBufferSource(); s.buffer = b;
  const f = ctx.createBiquadFilter(); f.type = tipo; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); g.gain.value = vol;
  s.connect(f).connect(g).connect(salida); s.start(t);
}
function golpe(f0, f1, dur, vol, cuando = 0) {
  const t = ctx.currentTime + 0.005 + cuando, o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.8);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(salida); g.connect(sala); o.start(t); o.stop(t + dur + 0.05);
}
// campana pequeña de templo (rin): parciales inarmónicos que se apagan antes cuanto más agudos
export function campana(m, cuando = 0, vel = 0.5, pan = 0, destino = null) {
  if (!ctx || (!destino && !activo)) return;
  const t = ctx.currentTime + 0.005 + cuando, f = hz(m);
  const p = ctx.createStereoPanner(); p.pan.value = lado(pan); p.connect(destino || salida); if (!destino) p.connect(sala);
  [[1, 1, 1.6], [2.01, 0.28, 0.9], [2.76, 0.42, 0.7], [5.4, 0.2, 0.32], [8.93, 0.09, 0.18]].forEach(([r, a, dur]) => {
    if (f * r > 16000) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = f * r * (1 + azar(-0.002, 0.002));
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16 * vel * a, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(p); o.start(t); o.stop(t + dur + 0.05);
  });
}
// chispa: destello agudo muy corto que sube de tono
function chispa(m, cuando = 0, vel = 0.3, pan = 0) {
  const t = ctx.currentTime + 0.005 + cuando, o = ctx.createOscillator(), g = ctx.createGain(), p = ctx.createStereoPanner();
  p.pan.value = lado(pan);
  o.type = 'sine'; o.frequency.setValueAtTime(hz(m), t); o.frequency.exponentialRampToValueAtTime(hz(m + 5), t + 0.07);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09 * vel, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  o.connect(g).connect(p); p.connect(salida); p.connect(sala); o.start(t); o.stop(t + 0.2);
}
// colchón tipo shō: triángulos desafinados que entran despacio (el «brillo» de las rachas largas)
function colchon(notas, cuando = 0, dur = 1.2, vel = 0.3, destino = null) {
  const t = ctx.currentTime + 0.005 + cuando, f = ctx.createBiquadFilter(), g = ctx.createGain();
  f.type = 'lowpass'; f.frequency.setValueAtTime(900, t); f.frequency.linearRampToValueAtTime(2600, t + dur * 0.5);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05 * vel, t + dur * 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  f.connect(g); g.connect(destino || salida); if (!destino) g.connect(sala);
  notas.forEach((m) => [-7, 7].forEach((cents) => {
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = hz(m); o.detune.value = cents;
    o.connect(f); o.start(t); o.stop(t + dur + 0.05);
  }));
}
// borde del taiko (ka) y golpe grave con fuerza (don)
function ka(cuando = 0, vol = 0.25) { ruido(0.05, 'bandpass', 1900, 2.2, vol, cuando, 6); golpe(820, 600, 0.05, vol * 0.4, cuando); }
function don(cuando = 0, vol = 0.9) { golpe(110, 48, 0.55, vol, cuando); ruido(0.12, 'lowpass', 400, 0.8, vol * 0.45, cuando); }

export const escalon = (i, raiz = 62) => raiz + YO[((i % 5) + 5) % 5] + 12 * Math.floor(i / 5);

// tramos de racha: 0 (1–2), 1 (3+), 2 (5+), 3 (10+), 4 (15+), 5 (20+), 6 (30+)
export const TRAMOS = [3, 5, 10, 15, 20, 30];
export const tramoDe = (racha) => TRAMOS.filter((t) => racha >= t).length;
// hitos: los tramos y, desde 30, cada 10
export const esHito = (racha) => TRAMOS.includes(racha) || (racha > 30 && racha % 10 === 0);

let ultimaVoz = -1;
// cada acierto: una nota de koto que sube por la escala; con la racha se suman voces (acorde rasgueado, campana,
// grave, chispas, colchón) y se alternan voicings para que no suene siempre igual
export function acierto(racha = 1) {
  if (!listo()) return;
  const t = tramoDe(racha);
  const k = (Math.max(0, racha - 1) % 8) + Math.min(t, 4);
  const raiz = 62, m = Math.min(93, escalon(k, raiz)), pan = ((racha % 5) - 2) / (t >= 4 ? 5 : 9);
  koto(m, 0, 0.9, pan);
  if (t === 0) return;
  let voz; do { voz = Math.floor(Math.random() * 3); } while (voz === ultimaVoz && t >= 2); ultimaVoz = voz;
  const abajo = [[-2, -4], [-3, -5], [-2, -5]][voz].map((d) => escalon(k + d, raiz));
  const rasgueo = voz === 1 ? 0.04 : 0.028;
  abajo.slice(0, t >= 2 ? 2 : 1).forEach((n, i) => koto(n, (i + 1) * rasgueo, t >= 2 ? 0.55 : 0.45, -pan * 0.8));
  if (t >= 2) campana(m + 12, 0.02, 0.18 + 0.04 * t, pan * -0.6);
  if (t >= 3) { koto(m - 12, 0.01, 0.35, 0); golpe(96, 52, 0.28, 0.16 + 0.03 * (t - 3)); }
  if (t >= 4) { const n = 2 + (racha % 2) + (t >= 6 ? 1 : 0); for (let i = 0; i < n; i++) chispa(escalon(k + 7 + Math.floor(azar(0, 5)), raiz), 0.06 + i * azar(0.045, 0.075), 0.6, azar(-0.8, 0.8)); }
  if (t >= 5) colchon([m - 12, escalon(k - 2, raiz) - 12, m], 0, 1.1, 0.5 + 0.15 * (t - 5));
  if (t >= 6) { campana(m + 19, 0.12, 0.22, azar(-0.5, 0.5)); if (racha % 3 === 0) ka(0, 0.18); }
}

// hito de racha: cada tramo tiene su motivo y, desde 30, se turnan tres para que no canse
export function tramo(racha = 3) {
  if (!listo()) return;
  const t = tramoDe(racha), R = 62 + Math.min(t, 4);
  const arpegio = (desde, n, paso = 0.06, vel = 0.7) => { for (let i = 0; i < n; i++) koto(escalon(desde + i, R), i * paso, vel, (i - n / 2) / (n + 2)); };
  if (t <= 1) { arpegio(5, 3, 0.07, 0.65); campana(escalon(10, R), 0.22, 0.35); return; }
  if (t === 2) { arpegio(3, 5, 0.06, 0.7); campana(escalon(10, R), 0.3, 0.45, -0.3); campana(escalon(12, R), 0.42, 0.35, 0.3); return; }
  if (t === 3) { don(0, 0.8); arpegio(2, 6, 0.055, 0.72); [0, 2, 4].forEach((d, i) => campana(escalon(10 + d, R), 0.36 + i * 0.03, 0.4, (i - 1) / 2)); return; }
  if (t === 4) {
    don(0, 0.8); don(0.2, 0.7);
    for (let i = 0; i < 9; i++) koto(escalon(i + 2, R), 0.3 + i * 0.035, 0.6, (i - 4) / 6);
    campana(escalon(12, R), 0.66, 0.5);
    for (let i = 0; i < 5; i++) chispa(escalon(13 + i, R), 0.7 + i * 0.05, 0.7, azar(-0.7, 0.7));
    return;
  }
  if (t === 5) {
    don(0); don(0.24, 0.7); ka(0.36); ka(0.42); don(0.5, 1);
    [0, 2, 4, 5, 7].forEach((k, n) => koto(escalon(k + 3, R), 0.55 + n * 0.07, 0.8, (n - 2) / 4));
    colchon([escalon(5, R) - 12, escalon(7, R) - 12, escalon(9, R) - 12, escalon(10, R)], 0.5, 1.8, 1);
    [10, 12, 14].forEach((k, i) => campana(escalon(k, R), 0.95 + i * 0.06, 0.45, (i - 1) / 2));
    return;
  }
  const motivo = Math.floor(racha / 10) % 3;
  if (motivo === 0) { for (let i = 0; i < 6; i++) don(i * 0.09, 0.5 + i * 0.08); for (let i = 0; i < 12; i++) koto(escalon(i + 1, R), 0.55 + i * 0.03, 0.62, (i - 6) / 8); }
  else if (motivo === 1) { don(0); ka(0.18); don(0.3); ka(0.42); don(0.54, 1); [12, 10, 9, 7, 5].forEach((k, i) => campana(escalon(k, R), 0.6 + i * 0.09, 0.45, (i - 2) / 3)); }
  else { don(0, 1); for (let i = 0; i < 10; i++) chispa(escalon(10 + (i % 5), R), 0.1 + i * 0.05, 0.8, azar(-0.9, 0.9)); [0, 2, 4, 7].forEach((k, n) => koto(escalon(k + 5, R), 0.45 + n * 0.1, 0.8, (n - 1.5) / 3)); }
  colchon([escalon(5, R) - 12, escalon(7, R) - 12, escalon(10, R) - 12, escalon(12, R) - 12], 0.4, 2.2, 1.1);
  campana(escalon(15, R), 1.1, 0.5);
}
// la racha se rompe: dos notas que bajan con suavidad (sin castigar); solo si era una racha de verdad
export function rachaRota(antes = 0) {
  if (!listo() || antes < 5) return;
  koto(escalon(6, 62), 0.18, 0.3, 0.2); koto(escalon(4, 62), 0.32, 0.26, -0.2);
}

export function sello() { if (!listo()) return; golpe(170, 60, 0.22, 0.5); ruido(0.08, 'lowpass', 900, 0.7, 0.35); }
export function fallo() { if (!listo()) return; koto(57, 0, 0.7, -0.1); koto(53, 0.14, 0.6, 0.1); ruido(0.05, 'bandpass', 500, 1, 0.12); }
export function papel() { if (!listo()) return; ruido(0.32, 'bandpass', 2400, 0.6, 0.12, 0, 1.6); }
export function toque() { if (!listo()) return; ruido(0.02, 'bandpass', 3200, 1.5, 0.12); }
// ── sonidos de la portada: suaves y de madera, para que todo tenga su «toc» (el toque cozy) ──
// cambiar de actividad en el muelle: un toc de madera y una nota de koto que sube con la posición
export function cambio(i = 0) { if (!listo()) return; golpe(620, 380, 0.07, 0.34); ruido(0.03, 'bandpass', 1500, 2, 0.14); koto(escalon(5 + i, 62), 0.02, 0.62, (i - 2.5) / 6); }
// pasar el puntero por una ficha: apenas un roce
export function roce() { if (!listo()) return; ruido(0.018, 'bandpass', 2600, 2.5, 0.05); }
// la carta da media vuelta: papel que se gira
export function volteo() { if (!listo()) return; ruido(0.2, 'bandpass', 1900, 0.9, 0.09, 0, 2.2); }
// abrir lo elegido: dos notas que suben y una campanita
export function abrir() { if (!listo()) return; koto(escalon(7, 62), 0, 0.7, -0.1); koto(escalon(9, 62), 0.07, 0.7, 0.1); campana(escalon(12, 62), 0.12, 0.25); }
// sale un bocadillo de Nyan: un «pop» blandito
export function burbuja() { if (!listo()) return; golpe(520, 980, 0.07, 0.16); ruido(0.03, 'bandpass', 3000, 1.5, 0.05); }
// koban ganado: tintineo
// Nyan apunta una letra en su libreta: el pincel, dos pasadas cortas sobre el papel
export function pincel() { if (!listo()) return; const f = 2600 + Math.random() * 900; ruido(0.07, 'bandpass', f, 1.1, 0.07, 0, 3); ruido(0.05, 'bandpass', f * 1.25, 1.4, 0.05, 0.08, 3); }
export function moneda() { if (!listo()) return; campana(escalon(14, 62), 0, 0.28, 0.2); campana(escalon(16, 62), 0.08, 0.22, 0.3); }
export function taiko(cuando = 0) { if (!listo()) return; don(cuando, 0.9); }
export function subida(rango = 1) { if (!listo()) return; [0, 1, 2, 3, 4, 5].slice(0, 3 + rango).forEach((k, n) => koto(escalon(k + 5, 62), n * 0.07, 0.7, (n - 3) / 8)); }
export function fanfarria() {
  if (!listo()) return;
  taiko(0); taiko(0.28);
  [0, 2, 4, 5, 7, 9, 10].forEach((k, n) => koto(escalon(k, 62), 0.45 + n * 0.085, 0.8, (n - 3) / 6));
  koto(escalon(10, 62), 1.2, 0.9); koto(escalon(12, 62), 1.2, 0.7);
  campana(escalon(12, 62), 1.22, 0.4);
}
// cada bolsa de «Abrir todas»: más corto que la apertura normal; nivel = rareza (0 común … 3 legendario), i = posición
export function bolsaRapida(nivel = 0, i = 0) {
  if (!listo()) return;
  ruido(0.12, 'bandpass', 2600, 0.8, 0.08);
  const base = 5 + (i % 5);
  koto(escalon(base, 62), 0, 0.6, ((i % 5) - 2) / 4);
  if (nivel >= 1) koto(escalon(base + 2, 62), 0.05, 0.55);
  if (nivel >= 2) { campana(escalon(base + 5, 62), 0.08, 0.4); don(0, 0.4); }
  if (nivel >= 3) tramo(20);
}

// ═══════════════ la voz de Mochi ═══════════════
// No habla: hace ruiditos («ワァ…», «ウラ!», «ヤハ!», «フゥン»). Síntesis de formantes:
// una sierra (las cuerdas vocales) pasa por tres filtros de banda (la boca) con las formantes de las vocales
// japonesas subidas, para que suene a bicho pequeño; la h y los suspiros llevan aire (ruido) por los mismos
// filtros. Cada ruidito es una lista de sílabas [consonante, vocal, semitonos, segundos, deslizamiento final].
const FORMANTES = { a: [1150, 1900, 3500], i: [430, 3300, 4200], u: [480, 1900, 3100], e: [700, 3000, 3700], o: [700, 1200, 3300], n: [380, 1500, 3200] };
const RUIDITOS = {
  ya: [['y', 'a', 0, 0.12, 3]],                                   // ヤッ (contento, un saltito)
  yaha: [['y', 'a', 0, 0.1, 1], ['h', 'a', 5, 0.16, -3]],         // ヤハ! (alegría grande)
  ura: [['', 'u', -2, 0.08, 0], ['r', 'a', 5, 0.18, -4]],         // ウラ! (se levanta, se lanza)
  fun: [['h', 'u', 0, 0.1, 0], ['', 'n', -1, 0.24, -4]],          // フゥン (chulito)
  wa: [['w', 'a', 3, 0.55, -7]],                                  // ワァ… (pena, susto)
  hafu: [['h', 'a', 0, 0.26, -4], ['h', 'u', -5, 0.2, -3]],       // はふ… (suspiro de vago al sentarse)
  fua: [['h', 'u', -3, 0.12, 2], ['', 'a', 3, 0.6, -9]],          // ふぁ〜 (bostezo)
  pi: [['', 'i', 9, 0.07, 4]],                                    // ぴっ
  nya: [['n', 'i', 0, 0.05, 0], ['y', 'a', 1, 0.2, 6]],           // にゃ？ (lo intenta y le sale mal)
  nyaa: [['n', 'i', 2, 0.05, 0], ['y', 'a', 4, 0.3, -3]],         // にゃー！
  mm: [['', 'n', 0, 0.13, 1], ['', 'a', 3, 0.12, -2], ['', 'n', 1, 0.1, -2]], // んまっ (merendando)
  eh: [['', 'e', 5, 0.14, 6]],                                    // えっ？！
  hm: [['', 'n', 0, 0.36, 4]],                                    // ん〜？
};
const CARACTER = { wa: { vib: 3, velVib: 5 }, hafu: { aire: 0.7, vol: 0.7 }, fua: { vib: 1.2, aire: 0.25 }, ura: { vol: 1.2 }, pi: { vol: 0.8 }, hm: { vib: 0.3 } };
export const RUIDOS_MOCHI = Object.keys(RUIDITOS);
let _ruido = null;
function bufRuido() {
  if (_ruido) return _ruido;
  const n = ctx.sampleRate, b = ctx.createBuffer(1, n, n), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return (_ruido = b);
}
// La voz grabada (herramientas/voz_nyan.py): la misma de las frases del mazo, para que se asocie con Nyan. Una toma al
// azar, con el tono un pelín distinto cada vez; mientras se carga o si falta, el ruidito sintetizado.
const TOMAS = new Map();   // nombre → [AudioBuffer]
let tomasPedidas = false;
async function cargarTomas() {
  if (tomasPedidas || !ctx) return;
  tomasPedidas = true;
  try {
    const ind = await (await fetch('sonidos/nyan/indice.json')).json();
    for (const [nombre, archivos] of Object.entries(ind)) {
      const bufs = [];
      for (const a of archivos) {
        try { bufs.push(await ctx.decodeAudioData(await (await fetch('sonidos/nyan/' + a)).arrayBuffer())); } catch (e) { /* esa toma no */ }
      }
      if (bufs.length) TOMAS.set(nombre, bufs);
    }
  } catch (e) { /* sin voz grabada: se queda la sintetizada */ }
}
function tomaGrabada(nombre) {
  const bufs = TOMAS.get(nombre);
  if (!bufs) return false;
  const s = ctx.createBufferSource(); s.buffer = bufs[Math.floor(Math.random() * bufs.length)];
  s.playbackRate.value = azar(0.97, 1.04);
  const g = ctx.createGain(); g.gain.value = 0.9;
  const pan = ctx.createStereoPanner(); pan.pan.value = azar(-0.15, 0.15);
  const eco = ctx.createGain(); eco.gain.value = 0.25;
  s.connect(g).connect(pan); pan.connect(busVoz); pan.connect(eco).connect(salaVoz);
  s.start(ctx.currentTime + 0.01);
  return true;
}
export function voz(nombre) {
  const sil = RUIDITOS[nombre];
  if (!ctx || !sil || VOL.voz <= 0) return;   // la voz va por su volumen, no por el interruptor de efectos
  cargarTomas();
  if (tomaGrabada(nombre)) return;
  const C = CARACTER[nombre] || {}, t0 = ctx.currentTime + 0.01, base = 74 + azar(-1.5, 1.5), ritmo = azar(0.9, 1.1), aire = C.aire || 0;
  const o = ctx.createOscillator(); o.type = 'sawtooth';
  const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = C.velVib || azar(5.5, 7); lg.gain.value = 25 * (C.vib ?? 0.6); lfo.connect(lg).connect(o.detune);
  const soplo = ctx.createBufferSource(); soplo.buffer = bufRuido(); soplo.loop = true;
  const gv = ctx.createGain(), gs = ctx.createGain(); gv.gain.value = 1; gs.gain.value = 0;   // voz y aire
  o.connect(gv); soplo.connect(gs);
  const env = ctx.createGain(); env.gain.value = 0.0001;
  const pan = ctx.createStereoPanner(); pan.pan.value = azar(-0.15, 0.15);
  const eco = ctx.createGain(); eco.gain.value = 0.3;
  env.connect(pan); pan.connect(busVoz); pan.connect(eco).connect(salaVoz);
  const filtros = [0, 1, 2].map((k) => {
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = [4, 8, 10][k];
    const g = ctx.createGain(); g.gain.value = [1.6, 0.8, 0.3][k];
    gv.connect(f); gs.connect(f); f.connect(g).connect(env); return f;
  });
  // un poco de fundamental directa, para que tenga cuerpo y no sea solo un silbido
  const cuerpo = ctx.createBiquadFilter(); cuerpo.type = 'lowpass'; cuerpo.frequency.value = 900;
  const gc = ctx.createGain(); gc.gain.value = 0.3; gv.connect(cuerpo).connect(gc).connect(env);
  const vol = 0.38 * (C.vol || 1);
  let t = t0;
  sil.forEach(([con, voc, st, dur, desl], i) => {
    const d = dur * ritmo, F = FORMANTES[voc], desde = con === 'y' ? FORMANTES.i : con === 'w' ? FORMANTES.u : con === 'n' ? FORMANTES.n : F;
    filtros.forEach((f, k) => { f.frequency.setValueAtTime(desde[k], t); f.frequency.linearRampToValueAtTime(F[k], t + Math.min(0.06, d * 0.5)); });
    if (!i) o.frequency.setValueAtTime(hz(base + st) * 0.94, t);
    o.frequency.linearRampToValueAtTime(hz(base + st), t + 0.03); o.frequency.linearRampToValueAtTime(hz(base + st + desl), t + d);
    // ataque rápido; entre sílabas, un bache corto (la «r» es un toquecito)
    const bache = con === 'r' ? 0.15 : i ? 0.45 : 0.0001;
    env.gain.setValueAtTime(Math.max(0.0001, vol * bache), t); env.gain.linearRampToValueAtTime(vol, t + (con === 'h' ? 0.05 : 0.018));
    // la h sopla antes de la vocal; los suspiros llevan aire siempre
    gs.gain.setValueAtTime(con === 'h' ? 0.9 : aire, t); gs.gain.linearRampToValueAtTime(aire, t + 0.06);
    gv.gain.setValueAtTime(con === 'h' ? 0.2 : 1 - aire * 0.6, t); gv.gain.linearRampToValueAtTime(1 - aire * 0.6, t + 0.06);
    t += d;
  });
  env.gain.setValueAtTime(vol, t - 0.02); env.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
  for (const n of [o, lfo, soplo]) { n.start(t0); n.stop(t + 0.12); }
}

// ═══════════════ música de la portada ═══════════════
// Generativa, sin archivos: un koto que pasea por la escala yo con frases de dos compases que respiran al final,
// sobre un colchón de shō que cambia cada dos compases, un bajo en cada compás y, de vez en cuando, el furin.
// Lenta (72 ppm) y bajita: acompaña sin cansar. Suena solo en la portada, con la ventana a la vista y el ajuste
// «Música» encendido; entra y sale con fundido.
let mus = null, quiereMusica = false, musicaSi = true;
export function musica(si) { quiereMusica = !!si; mover(); }          // la portada la pide al entrar y la suelta al salir
export function permitirMusica(si) { musicaSi = !!si; mover(); }      // el ajuste
export const musicaSonando = () => !!mus;
function mover() {
  const sonar = quiereMusica && musicaSi && ctx && ctx.state === 'running' && !document.hidden;
  if (sonar && !mus) arrancarMusica();
  else if (!sonar && mus) pararMusica();
}
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', mover);
const NEGRA = 60 / 72, CORCHEA = NEGRA / 2;
const ACORDES = [[50, 57], [43, 50], [52, 59], [45, 52]];   // re–la, sol–re, mi–si, la–mi: todo dentro de la escala yo de re
function arrancarMusica() {
  const g = ctx.createGain(), eco = ctx.createGain();
  g.gain.setValueAtTime(0.0001, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.42, ctx.currentTime + 3);
  eco.gain.value = 0.5; g.connect(busMus); g.connect(eco).connect(salaMus);
  mus = { g, t: ctx.currentTime + 0.3, paso: 0, nota: 6, reloj: setInterval(programar, 200) };
  programar();
}
function programar() {
  if (!mus) return;
  while (mus.t < ctx.currentTime + 0.8) {
    const p = mus.paso, compas = p >> 3, en = p % 8, cuando = Math.max(0, mus.t - ctx.currentTime), acorde = ACORDES[(compas >> 1) % 4];
    if (p % 16 === 0) colchon(acorde.map((m) => m + 12), cuando, NEGRA * 8.6, 0.9, mus.g);
    if (en === 0) koto(acorde[0], cuando, 0.42, -0.2, mus.g);
    if (en === 4 && Math.random() < 0.5) koto(acorde[1], cuando, 0.26, 0.2, mus.g);
    // melodía: paseo por la escala con silencios; las dos últimas corcheas de cada frase, callada
    if (p % 16 < 14 && Math.random() < (en % 2 ? 0.3 : 0.68)) {
      mus.nota = Math.max(3, Math.min(12, mus.nota + [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)]));
      koto(escalon(mus.nota, 62), cuando, azar(0.2, 0.34), azar(-0.45, 0.45), mus.g);
    }
    if (p % 64 === 44 && Math.random() < 0.7) campana(escalon(15 + Math.floor(Math.random() * 3), 62), cuando, 0.1, 0.55, mus.g); // el furin
    mus.paso++; mus.t += CORCHEA * (en % 2 ? 0.93 : 1.07);   // un pelín de swing
  }
}
function pararMusica() {
  const m = mus; mus = null; clearInterval(m.reloj);
  m.g.gain.cancelScheduledValues(ctx.currentTime); m.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.45);
  setTimeout(() => m.g.disconnect(), 4000);
}

// ── una sola salida de audio para toda la app (30-09) ──
// Las voces de las clases y las historias y las palabras grabadas pasan también por este AudioContext, por el bus de la voz: con
// un <audio> por frase, WebKitGTK abría su propia tubería de GStreamer y el mezclador del sistema veía «nyango» dos o más veces.
// Pista imita lo que se usaba del <audio>: play(), pause(), paused, duration, readyState, onended/onpause y sus eventos.
const buffers = new Map();   // url → Promise<AudioBuffer>
export function cargarAudio(url) {
  iniciar();
  if (!buffers.has(url)) buffers.set(url, fetch(url).then((r) => { if (!r.ok) throw new Error(`${r.status} ${url}`); return r.arrayBuffer(); })
    .then((b) => ctx.decodeAudioData(b)).catch((e) => { buffers.delete(url); throw e; }));
  return buffers.get(url);
}
export class Pista extends EventTarget {
  constructor(url, bus = 'voz') { super(); this.url = url; this.bus = bus; this.readyState = 0; this.duration = NaN; this.paused = true; this.fuente = null; this.cortada = false; this.onended = null; this.onpause = null; }
  get currentTime() { return this.fuente ? ctx.currentTime - this.t0 : 0; }
  async play() {
    iniciar(); if (ctx.state === 'suspended') await ctx.resume().catch(() => {});
    const buf = await cargarAudio(this.url);
    if (this.cortada) return;
    this.duration = buf.duration; this.readyState = 4; this.dispatchEvent(new Event('loadedmetadata'));
    const s = ctx.createBufferSource(); s.buffer = buf; s.connect(this.bus === 'efectos' ? salida : busVoz);
    s.onended = () => { if (this.fuente !== s) return; this.fuente = null; this.paused = true; this.onended?.(); this.dispatchEvent(new Event('ended')); };
    this.fuente = s; this.t0 = ctx.currentTime; this.paused = false; s.start();
    this.dispatchEvent(new Event('play'));
  }
  pause() {
    this.cortada = true;
    if (!this.fuente) return;
    const s = this.fuente; this.fuente = null; this.paused = true; try { s.stop(); } catch { /* ya parada */ }
    this.onpause?.(); this.dispatchEvent(new Event('pause'));
  }
}
export const pista = (url, bus) => new Pista(url, bus);
