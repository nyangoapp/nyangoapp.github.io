// Encaje de palabras japonesas en su caja (casilla de caligrafía, carta de repaso, carta de batalla…)
// Tamaño automático según el número de caracteres y el sitio que hay: una línea si cabe a buen tamaño;
// si no, dos líneas equilibradas sin cortes raros (nunca empieza línea con ゃ, っ, ー… ni se parte el okurigana si hay otra opción).

const NO_EMPIEZA = /^[ぁぃぅぇぉっゃゅょゎゕゖァィゥェォッャュョヮヵヶーゝゞヽヾ々〜～・、。，．！？!?）」』】〕〉》…]/;
const NO_ACABA = /[（「『【〔〈《]$/;
const KANJI = /[一-鿿㐀-䶿々〆]/;
const KANA = /[぀-ヿ]/;
// finales con los que un corte suena natural: お願い|します, ありがとう|ございます, すみ|ません, 申し訳|ない
const FINALES = ['ございます', 'ください', 'します', 'ません', 'ました', 'ます', 'です', 'ない', 'たい', 'たら', 'さん', 'ちゃん', 'くん'];

let medidor = null;
function medir(texto, estilo) {
  if (!medidor) {
    medidor = document.createElement('span');
    medidor.setAttribute('aria-hidden', 'true');
    medidor.style.cssText = 'position:absolute;left:-9999px;top:-9999px;visibility:hidden;white-space:nowrap;font-size:100px;line-height:1;padding:0;border:0;';
    document.body.appendChild(medidor);
  }
  medidor.style.fontFamily = estilo.familia; medidor.style.fontWeight = estilo.peso; medidor.style.fontStyle = estilo.forma;
  medidor.style.letterSpacing = `${estilo.espacio}em`;
  medidor.textContent = texto;
  // offsetWidth no se ve afectado por transformaciones (la casilla entra girando)
  return medidor.getBoundingClientRect().width || medidor.offsetWidth;
}

function mejorCorte(letras, estilo) {
  const n = letras.length;
  let mejor = null;
  for (let k = 1; k < n; k++) {
    const a = letras.slice(0, k).join(''), b = letras.slice(k).join('');
    if (NO_EMPIEZA.test(b) || NO_ACABA.test(a)) continue;
    const wa = medir(a, estilo), wb = medir(b, estilo);
    let coste = Math.max(wa, wb);
    const antes = letras[k - 1], despues = letras[k];
    if (KANJI.test(antes) && KANA.test(despues) && !FINALES.some((f) => b.startsWith(f))) coste += 45; // okurigana pegado a su kanji
    if (KANJI.test(antes) && KANJI.test(despues)) coste += 30; // no partir un compuesto si hay otra opción
    if (KANA.test(antes) && KANJI.test(despues) && k > 1) coste -= 12; // entre palabras suele haber este cambio
    if (FINALES.some((f) => b === f || (b.startsWith(f) && b.length <= f.length + 1))) coste -= 110;
    if (k === 1 && /^[おご]$/.test(antes)) coste += 80; // el prefijo お/ご no se queda solo
    if (!mejor || coste < mejor.coste) mejor = { k, coste, anchos: [wa, wb], lineas: [a, b] };
  }
  return mejor;
}

// cada palabra encajada se recalcula si su caja cambia de tamaño o si termina de cargar la letra
const vivos = new Map(); // el → opciones (con su caja)
let ro = null;
function podar() {
  const usadas = new Set();
  for (const [el, o] of vivos) { if (el.isConnected) usadas.add(o.caja); else vivos.delete(el); }
  return usadas;
}
function vigilar(el, opc) {
  if (!ro) {
    ro = new ResizeObserver((ents) => {
      const cajas = new Set(ents.map((x) => x.target));
      requestAnimationFrame(() => { for (const [e, o] of vivos) if (e.isConnected && cajas.has(o.caja)) aplicar(e, o); });
      const usadas = podar();
      cajas.forEach((c) => { if (!usadas.has(c)) ro.unobserve(c); });
    });
    document.fonts?.addEventListener?.('loadingdone', () => { podar(); for (const [e, o] of vivos) aplicar(e, o); });
  }
  vivos.set(el, opc);
  ro.observe(opc.caja);
}

/**
 * Encaja el texto de `el` dentro de `caja` (por defecto, su padre).
 * margen: fracción de la caja que queda libre a cada lado · max: tamaño máximo en px (o función del nº de caracteres)
 * umbral: una línea mientras el tamaño sea al menos esta fracción del alto útil · alto: interlineado
 * marcar: función línea → html (para envolver cada kanji en algo que se pueda pulsar)
 */
export function encajar(el, opc = {}) {
  if (!el) return;
  const caja = opc.caja || el.parentElement;
  const texto = el.dataset.texto ?? el.textContent.trim();
  el.dataset.texto = texto;
  el.classList.add('encajada');
  const o = { ...opc, caja };
  vigilar(el, o);
  aplicar(el, o);
  document.fonts?.ready?.then(() => el.isConnected && aplicar(el, o));
}

const escapar = (l) => l.replace(/[&<>"]/g, (x) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[x]));
// marcar(linea) → html de cada línea (p. ej. para que los kanji se puedan pulsar); por defecto, el texto tal cual
function aplicar(el, { caja, margen = 0.06, max = 200, min = 14, umbral = 0.2, alto = 1.12, marcar = escapar }) {
  const texto = el.dataset.texto || '';
  const letras = [...texto];
  const n = letras.length;
  const cs = getComputedStyle(caja);
  const W = (caja.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)) * (1 - 2 * margen);
  const H = (caja.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)) * (1 - 2 * margen);
  if (!(W > 0 && H > 0) || !n) return;
  const ce = getComputedStyle(el);
  const tam = parseFloat(ce.fontSize) || 100;
  const ls = ce.letterSpacing === 'normal' ? 0 : parseFloat(ce.letterSpacing) / tam;
  const estilo = { familia: ce.fontFamily, peso: ce.fontWeight, forma: ce.fontStyle, espacio: el.dataset.espacio != null ? +el.dataset.espacio : (Number.isFinite(ls) ? ls : 0) };
  el.dataset.espacio = estilo.espacio;
  const tope = typeof max === 'function' ? max(n) : max;
  const w1 = medir(texto, estilo) / 100;
  const f1 = Math.min(tope, W / w1, H / alto);
  let lineas = [texto], f = f1;
  if (n >= 5 && f1 < H * umbral) {
    const c = mejorCorte(letras, estilo);
    if (c) {
      const f2 = Math.min(tope, W / (Math.max(...c.anchos) / 100), H / (2 * alto));
      if (f2 > f1 * 1.15) { lineas = c.lineas; f = f2; }
    }
  }
  f = Math.max(min, Math.floor(f * 10) / 10);
  el.style.fontSize = `${f}px`;
  el.style.lineHeight = String(alto);
  el.style.whiteSpace = 'nowrap';
  const html = lineas.map((l) => `<span class="linea">${marcar(l)}</span>`).join('');
  if (el.innerHTML !== html) el.innerHTML = html;
  el.dataset.lineas = lineas.length;
}

// Para pruebas: qué haría con un texto en una caja de ancho × alto (sin tocar el DOM visible)
export function simular(texto, { ancho, alto: altoCaja, familia = '"Klee One", serif', peso = 600, espacio = 0, ...opc }) {
  const estilo = { familia, peso, forma: 'normal', espacio };
  const letras = [...texto], n = letras.length, { margen = 0.06, max = 200, umbral = 0.2, alto = 1.12 } = opc;
  const W = ancho * (1 - 2 * margen), H = altoCaja * (1 - 2 * margen), tope = typeof max === 'function' ? max(n) : max;
  const f1 = Math.min(tope, W / (medir(texto, estilo) / 100), H / alto);
  if (n >= 5 && f1 < H * umbral) {
    const c = mejorCorte(letras, estilo);
    if (c) { const f2 = Math.min(tope, W / (Math.max(...c.anchos) / 100), H / (2 * alto)); if (f2 > f1 * 1.15) return { lineas: c.lineas, f: f2 }; }
  }
  return { lineas: [texto], f: f1 };
}
