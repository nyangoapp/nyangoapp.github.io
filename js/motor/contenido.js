// El contenido de estudio ya montado (herramientas/construir_app.py lo calcula con nucleo/contenido.py y lo deja en
// datos/contenido.<idioma>.json): fichas de palabras, kanji y piezas, recorrido de lecciones, catálogo y lecciones de gramática.
// Aquí solo se carga y se le añaden las funciones que usaba el servidor (regiones, ejemplos de gramática).
import { valido } from './textos.js';

const CACHE = {};

export async function cargarContenido(idioma) {
  const i = valido(idioma) || 'es';
  if (!CACHE[i]) CACHE[i] = fetch(`/datos/contenido.${i}.json`).then((r) => r.json()).then((d) => montar(d));
  return CACHE[i];
}

function montar(d) {
  const PPR = d.regiones.palabras_por_region, JP = d.regiones.jp, NOMBRES = d.regiones.nombres;
  const c = {
    idioma: d.idioma, firma: d.firma, items: d.items, paso: d.paso, catalogo: d.catalogo,
    lecciones_gramatica: d.lecciones, REGIONES: JP, PALABRAS_POR_REGION: PPR, clases: d.clases || {}, conj: d.conj || {},
    vocab: d.vocab.map((id) => d.items[id]).filter(Boolean),
  };
  c.region_de = (n) => Math.min(JP.length - 1, Math.floor((n - 1) / PPR));
  c.nombre_region = (i) => NOMBRES[i] || JP[i];
  c.region = (n) => { const i = c.region_de(n); return { i, nombre: c.nombre_region(i), jp: JP[i], desde: i * PPR + 1, hasta: (i + 1) * PPR }; };
  c.ejemplos_de_gramatica = (puntos, aprendidos, limite = 8) => {
    const salida = [];
    for (const v of c.vocab) {
      if (!v.frase) continue;
      const ids = (v.gramatica || []).map((g) => g.id);
      if (!puntos.some((p) => ids.includes(p))) continue;
      salida.push({ vocab: v.id, palabra: v.palabra, frase: v.frase_furigana || v.frase, frase_es: v.frase_es || v.frase_en,
        nota: (v.gramatica.find((g) => puntos.includes(g.id)) || {}).nota || '', conocida: v.id in aprendidos, audio: v.audio_frase || '' });
    }
    salida.sort((a, b) => Number(!a.conocida) - Number(!b.conocida));
    return salida.slice(0, limite);
  };
  return c;
}
