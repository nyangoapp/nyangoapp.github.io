// FSRS-5: memoria de cada habilidad (estabilidad s en días, dificultad d de 1 a 10). Traducción exacta de nucleo/fsrs.py:
// mismos parámetros y el mismo redondeo que Python (round() redondea los .5 al par), para que los intervalos salgan iguales.
// El tiempo va en segundos (como time.time()): el progreso guardado es el mismo en las dos versiones.
import { tx } from './textos.js';

export const HORA_CORTE = 4;
const W = [0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192,
  1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621];
const DECAY = -0.5, FACTOR = 19 / 81, RETENCION = 0.9;

export const ahora = () => Date.now() / 1000;
// round() de Python: los .5 van al par (2.5 → 2, 3.5 → 4)
export function pyRound(x) {
  const r = Math.round(x);
  return Math.abs(x % 1) === 0.5 && r % 2 !== 0 ? r - 1 : r;
}

export const retrievability = (t, s) => (1 + FACTOR * t / Math.max(s, 0.01)) ** DECAY;
export const intervalo = (s) => Math.max(1, Math.min(36500, pyRound(s / FACTOR * (RETENCION ** (1 / DECAY) - 1))));
const d0 = (g) => Math.min(10, Math.max(1, W[4] - Math.exp(W[5] * (g - 1)) + 1));
const s0 = (g) => Math.max(0.1, W[g - 1]);
function nuevaD(d, g) {
  const dp = d + (-W[6] * (g - 3)) * (10 - d) / 9;
  return Math.min(10, Math.max(1, W[7] * d0(4) + (1 - W[7]) * dp));
}
function sExito(d, s, r, g) {
  const duro = g === 2 ? W[15] : 1, facil = g === 4 ? W[16] : 1;
  return s * (Math.exp(W[8]) * (11 - d) * s ** (-W[9]) * (Math.exp(W[10] * (1 - r)) - 1) * duro * facil + 1);
}
const sFallo = (d, s, r) => Math.min(s, W[11] * d ** (-W[12]) * ((s + 1) ** W[13] - 1) * Math.exp(W[14] * (1 - r)));
const sCorto = (s, g) => s * Math.exp(W[17] * (g - 3 + W[18]));

// el día de estudio empieza a las 4 de la mañana (hora local)
export function inicioDia(ts = ahora()) {
  const t = new Date(ts * 1000);
  const base = new Date(t.getFullYear(), t.getMonth(), t.getDate(), HORA_CORTE, 0, 0, 0);
  if (t < base) base.setDate(base.getDate() - 1);
  return base.getTime() / 1000;
}
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const diaDe = (ts) => iso(new Date((inicioDia(ts) + 3600) * 1000));
// inicio del día de estudio que cae «dias» días de calendario después (con el cambio de hora un día no dura 86400 s)
export function sumarDias(ts, dias) {
  const d = new Date((inicioDia(ts) + 3600) * 1000);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + dias, HORA_CORTE, 0, 0, 0).getTime() / 1000;
}
// «2026-09-29» → Date a mediodía (para restar días sin líos de horario)
export const fecha = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); };
export const isoDe = iso;

/** → [estado nuevo, segundos hasta volver a verla en la sesión o null] */
export function responderEstado(p0, g, ahoraTs) {
  const p = { ...p0 };
  const est = p.estado || 'nueva';
  p.reps = (p.reps || 0) + 1;
  let otraVez = null;
  if (est === 'nueva') {
    p.d = d0(g); p.s = s0(g);
    if (g === 1) { p.estado = 'aprendiendo'; otraVez = 60; }
    else if (g === 2) { p.estado = 'aprendiendo'; otraVez = 360; }
    else if (g === 3) { p.estado = 'aprendiendo'; otraVez = 600; }
    else p.estado = 'repaso';
  } else if (est === 'aprendiendo' || est === 'reaprendiendo') {
    p.s = Math.max(0.1, sCorto(p.s ?? 1.0, g));
    p.d = nuevaD(p.d ?? 5.0, g);
    if (g === 1) otraVez = 60;
    else if (g === 2) otraVez = 360;
    else p.estado = 'repaso';
  } else {
    const t = Math.max(0, (ahoraTs - (p.ultima ?? ahoraTs)) / 86400);
    const r = retrievability(t, p.s ?? 1.0);
    const dAnt = p.d ?? 5.0, sAnt = p.s ?? 1.0;
    p.d = nuevaD(dAnt, g);
    if (g === 1) {
      p.s = Math.max(0.1, sFallo(dAnt, sAnt, r));
      p.lapsos = (p.lapsos || 0) + 1;
      p.estado = 'reaprendiendo'; otraVez = 60;
    } else p.s = sExito(dAnt, sAnt, r, g);
  }
  p.ultima = ahoraTs;
  if (otraVez !== null) p.vence = ahoraTs + otraVez;
  else {
    let dias = intervalo(p.s);
    if (g === 2 && est === 'repaso') dias = Math.max(1, Math.min(dias, intervalo(p.s)));
    p.vence = sumarDias(ahoraTs, dias);
    p.ivl = dias;
  }
  return [p, otraVez];
}

/** «10 min», «3 días»… en el idioma de la petición (claves srv.intervalo.* de web/i18n) */
export function textoIntervalo(seg) {
  if (seg < 3600) return tx('intervalo.min', { n: Math.max(1, pyRound(seg / 60)) });
  const dias = seg / 86400;
  if (dias < 1.5) return dias >= 0.5 ? tx('intervalo.dias', { n: 1 }) : tx('intervalo.horas', { n: pyRound(seg / 3600) });
  if (dias < 30) return tx('intervalo.dias', { n: pyRound(dias) });
  if (dias < 365) return tx('intervalo.meses', { n: Math.max(1, pyRound(dias / 30)) });
  return tx('intervalo.anos', { n: (dias / 365).toFixed(1) });
}
