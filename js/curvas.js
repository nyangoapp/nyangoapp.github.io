// Las curvas de CSS (cubic-bezier) como función para GSAP: así las entradas conservan EXACTAMENTE el resorte que tenían con el.animate()
// (episodio.js · anima, clase.js · entradaApuntes). Con 'back.out(1.5)' el rebote se quedaba en un 8,6 % en vez del 9,8 %.
export function bezier(x1, y1, x2, y2) {
  const cx = (t) => 3 * (1 - t) ** 2 * t * x1 + 3 * (1 - t) * t * t * x2 + t ** 3;
  const cy = (t) => 3 * (1 - t) ** 2 * t * y1 + 3 * (1 - t) * t * t * y2 + t ** 3;
  return (p) => {
    if (p <= 0) return 0; if (p >= 1) return 1;
    let lo = 0, hi = 1, t = p;
    for (let i = 0; i < 24; i++) { t = (lo + hi) / 2; if (cx(t) < p) lo = t; else hi = t; }
    return cy(t);
  };
}
export const MUELLE = bezier(0.34, 1.56, 0.64, 1);   // el resorte de las entradas: rebasa un ~10 % y se asienta
export const SALIDA = bezier(0, 0, 0.58, 1);          // el «ease-out» de CSS
