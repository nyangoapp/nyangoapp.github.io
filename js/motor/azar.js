// Azar al estilo de random de Python (choice, choices con pesos, sample, shuffle, randint) y un generador con semilla para lo
// que tiene que salir igual cada vez (las misiones de un día).
export class Azar {
  constructor(random = Math.random) { this.random = random; }
  randint(a, b) { return a + Math.floor(this.random() * (b - a + 1)); }
  choice(xs) { return xs[Math.floor(this.random() * xs.length)]; }
  choices(xs, pesos) {
    const total = pesos.reduce((a, b) => a + b, 0);
    let x = this.random() * total;
    for (let i = 0; i < xs.length; i++) { x -= pesos[i]; if (x < 0) return xs[i]; }
    return xs[xs.length - 1];
  }
  shuffle(xs) {
    for (let i = xs.length - 1; i > 0; i--) { const j = Math.floor(this.random() * (i + 1)); [xs[i], xs[j]] = [xs[j], xs[i]]; }
    return xs;
  }
  sample(xs, k) { return this.shuffle([...xs]).slice(0, k); }
}

// xmur3 + mulberry32: una semilla de texto → siempre la misma secuencia
export function conSemilla(texto) {
  let h = 1779033703 ^ texto.length;
  for (let i = 0; i < texto.length; i++) { h = Math.imul(h ^ texto.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
  let a = (h ^= h >>> 16) >>> 0;
  return new Azar(() => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  });
}

export const AZAR = new Azar();
