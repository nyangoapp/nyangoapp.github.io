// La escena de las clases (foto, reparto en 3D y objetos dibujados) y lo que le pasa cuando montas una frase («la frase
// cobra vida»: le salen patas, se queda tiesa, salta encima de otra cosa…). La comparten la clase de escritorio (clase.js,
// episodio.js) y la del móvil (movil/clase.js): aquí no hay nada de la interfaz de ninguna de las dos.
import { gsap } from 'gsap';
import { esc } from './japones.js';
import { C, ARTE, MED, FONDOS, figura, vida, etiqueta, manpu, recorte, esReparto } from './clase-arte.js';

export const NS = 'http://www.w3.org/2000/svg';
const quieto = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);

// Nyan en 3D (web/img/reparto; clase-arte.js: recorte) con su cara, el brazo arriba y, si hace falta, su onigiri
export const nyan3d = (o = {}) => recorte('nyan', o.cara, o.brazo === 'arriba') + (o.onigiri ? `<g transform="translate(24 -38) scale(.55)">${figura('onigiri')}</g>` : '');
// arte: la insignia (を, に…) es parte del dibujo de la escena, con su tinta y su color propios, no de la interfaz
export const insignia = (txt, x, y, color) => `<g transform="translate(${x} ${y})"><circle r="19" fill="${color}" stroke="#221817" stroke-width="3"/>
  <text y="7" text-anchor="middle" style="font: 800 20px var(--f-jp)" fill="#221817">${txt}</text></g>`;

// la caja (viewBox) de una figura suelta, a su medida: un libro es bajito y un perro, alto
export function cajaFigura(id) {
  if (esReparto(id)) return '-46 -104 92 110';
  const m = MED[id] || { w: 60, h: 60 }, w = m.w + 18, h = m.h + 16;
  return `${(-w / 2).toFixed(1)} ${(-h + 6).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`;
}

// Escenas escritas como datos (las clases nuevas): {fondo, cosas: [{que, x, y, s, cara, brazo, onigiri, encima, dentro, vida,
// espejo, id}, {que: 'manpu', tipo, x, y}, {que: 'texto', texto, x, y}]}. 400 × 260, el suelo en y = 236 por defecto.
// arte: la trama de puntos del cómic
const TRAMA = `<defs><pattern id="cl-trama" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="2.2" fill="#f3e6cf"/><circle cx="13" cy="13" r="2.2" fill="#f3e6cf"/></pattern></defs>`;
const ESCALA_ESC = { nyan: 1.2, gato: 1.2, perro: 1.2, persona: 1.2, profesor: 1.2, sensei: 1.2, mesa: 1.3, cama: 1.4, caja: 1.3, casa: 1.15, escuela: 1.05,
  tren: 1.05, pizarra: 1, arbol: 1.4, ki: 1.4, sol: 1, luna: 1, nube: 1.1 };
export function cosaSVG(c, conId) {
  if (c.que === 'manpu') return manpu(c.tipo, c.x ?? 200, c.y ?? 110, c.s ?? 1);
  if (c.que === 'texto') return `<text class="cl-onomato" x="${c.x ?? 200}" y="${c.y ?? 90}" text-anchor="middle" transform="rotate(${c.giro ?? -8} ${c.x ?? 200} ${c.y ?? 90})">${esc(c.texto)}</text>`;
  if (c.que === 'insignia') return insignia(esc(c.texto), c.x ?? 200, c.y ?? 100, c.color ? (C[c.color] || c.color) : C.pRosa);
  // el reparto en 3D ya guarda su tamaño entre ellos (los dibujos de antes se agrandaban a mano, s: 1.8): solo se respeta si se aleja
  const s = esReparto(c.que) ? Math.min(c.s ?? 1.2, 1.2) : c.s ?? ESCALA_ESC[c.que] ?? 1.3, x = c.x ?? 200, y = c.y ?? 236, m = MED[c.que] || { w: 60, h: 60 };
  let fig;
  if (esReparto(c.que)) fig = recorte(c.que, c.cara, c.brazo === 'arriba', c.mira) + (c.onigiri ? `<g transform="translate(24 -38) scale(.55)">${figura('onigiri')}</g>` : '');
  else if (c.que === 'caja' && c.dentro) fig = `${ARTE.cajaFondo()}<g transform="translate(0 ${MED.caja.dentro}) scale(.9)">${figura(c.dentro)}</g>${ARTE.cajaFrente()}`;
  else fig = figura(c.que);
  if (c.encima) fig += `<g transform="translate(${m.dx || 0} ${m.sup ?? -m.h}) scale(${c.encima_s ?? 0.85})">${esReparto(c.encima) ? recorte(c.encima, c.cara_encima) : figura(c.encima)}</g>`;
  if (c.vida) fig += vida(m);
  const id = conId ? ` data-id="${esc(c.id || c.que)}" data-que="${c.que}" data-x="${x}" data-y="${y}" data-s="${s}"` : '';
  // 30-09 · los objetos, con su sombra de contacto en el suelo (sin ella parecían pegados encima de la foto)
  const sombra = esReparto(c.que) ? '' : `<ellipse cx="0" cy="-1" rx="${(m.w * 0.5).toFixed(1)}" ry="${Math.max(3, m.w * 0.1).toFixed(1)}" fill="url(#cl-sombra)"/>`;
  return `<g class="cosa${c.que === 'nyan' ? ' cl-ny-cosa' : ''}"${id} transform="translate(${x} ${y}) scale(${c.espejo ? -s : s} ${s})">${sombra}<g class="mueve">${c.que === 'nyan' ? `<g class="cl-ny">${fig}</g>` : fig}</g></g>`;
}
export function componer(e, conId = false) {
  const cosas = mirarse(e.cosas || []);
  return `${TRAMA}${(FONDOS[e.fondo] || FONDOS.cuarto)()}${cosas.map((c) => cosaSVG(c, conId)).join('')}`;
}
// 30-09 · con dos o más del reparto en escena, cada uno se vuelve hacia el más cercano de los otros. Uno solo, casi de frente. La escena puede mandar con «mira»: 'd', 'i' o 'frente'.
function mirarse(cosas) {
  const reparto = cosas.filter((c) => esReparto(c.que));
  if (reparto.length < 2) return cosas;
  return cosas.map((c) => {
    if (!esReparto(c.que)) return c;
    if (c.mira) return c.mira === 'frente' ? { ...c, mira: '' } : c;
    const x = c.x ?? 200, otro = reparto.filter((o) => o !== c).sort((a, b) => Math.abs((a.x ?? 200) - x) - Math.abs((b.x ?? 200) - x))[0];
    return { ...c, mira: (otro.x ?? 200) >= x ? 'd' : 'i' };
  });
}

// ¿la frase montada cumple esta condición? {contiene, falta, en: [posición, pieza], orden}
export const cumple = (si = {}, seq) => (!si.contiene || si.contiene.every((x) => seq.includes(x)))
  && (!si.falta || si.falta.every((x) => !seq.includes(x)))
  && (!si.en || seq[si.en[0]] === si.en[1])
  && (!si.orden || (si.orden.length === seq.length && si.orden.every((x, k) => x === seq[k])));

// Los efectos sobre una sala (el <svg> de la escena, pintada con componer(e, true)): efecto(ef) hace uno y espera a que se
// vea; efectos(lista), uno detrás de otro. chispas(el) es el confeti de cada interfaz.
export function efectosEn(sala, { chispas = () => {} } = {}) {
  const obj = (id) => (id ? sala.querySelector(`.cosa[data-id="${CSS.escape(id)}"]`) : null) || sala.querySelector('.cosa:not(.cl-ny-cosa)') || sala.querySelector('.cosa');
  const datos = (g) => ({ x: +g.dataset.x, y: +g.dataset.y, s: +g.dataset.s, que: g.dataset.que });
  const mueve = (g) => $('.mueve', g);
  const espera = (ms) => new Promise((r) => setTimeout(r, quieto() ? 0 : ms));
  function encimaDe(g) { // punto (en la sala) donde se apoya algo sobre g
    const d = datos(g), m = MED[d.que] || { h: 60 };
    return { x: d.x + (m.dx || 0) * d.s, y: d.y + (m.sup ?? -m.h) * d.s };
  }
  function nuevaCosa(c) {
    const tmp = document.createElementNS(NS, 'g');
    tmp.innerHTML = cosaSVG(c, true);
    const g = tmp.firstElementChild; sala.appendChild(g);
    if (!quieto()) gsap.fromTo(mueve(g), { scale: 0, transformOrigin: '50% 100%' }, { scale: 1, duration: 0.45, ease: 'back.out(2.4)' });
    return g;
  }
  function manpuSobre(g, tipo) {
    const d = datos(g), m = MED[d.que] || { h: 60 }, tmp = document.createElementNS(NS, 'g');
    tmp.innerHTML = manpu(tipo, d.x + 18 * d.s, d.y - m.h * d.s - 12, 1.2);
    const el = tmp.firstElementChild; sala.appendChild(el);
    if (!quieto()) gsap.fromTo(el, { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.35, ease: 'back.out(3)' });
  }
  async function efecto(ef) {
    const g = obj(ef.objeto), m = g && mueve(g), d = g && datos(g), med = d && (MED[d.que] || { w: 60, h: 60 });
    switch (ef.tipo) {
      case 'brilla':
        if (m && !quieto()) gsap.to(m, { y: -12, duration: 0.16, yoyo: true, repeat: 3, ease: 'power2.out' });
        if (g) setTimeout(() => chispas(g, { n: 16 }), 100);
        return espera(650);
      case 'salta': if (m && !quieto()) gsap.to(m, { y: -26, duration: 0.2, yoyo: true, repeat: 1, ease: 'power2.out' }); return espera(450);
      case 'vida':
        if (!m) return;
        m.insertAdjacentHTML('beforeend', vida(med));
        if (!quieto()) {
          gsap.fromTo($('.vida', m), { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.35, ease: 'back.out(3)' });
          gsap.to(m, { y: -11, duration: 0.25, ease: 'back.out(3)' });
          gsap.to(m, { rotation: 9, transformOrigin: '50% 100%', yoyo: true, repeat: 7, duration: 0.16, ease: 'sine.inOut', delay: 0.3 });
          gsap.to(m, { keyframes: [{ x: -14, duration: 0.5 }, { x: 14, duration: 0.6 }, { x: 0, duration: 0.4 }], delay: 0.3 });
        }
        return espera(900);
      case 'peluche':
        if (!m) return;
        m.setAttribute('filter', 'url(#cl-gris)'); m.insertAdjacentHTML('beforeend', etiqueta(med));
        if (!quieto()) gsap.to(m, { rotation: 84, transformOrigin: '50% 100%', duration: 0.7, ease: 'bounce.out', delay: 0.25 });
        return espera(900);
      case 'gigante': case 'mini':
        if (m) gsap.to(m, { scale: ef.tipo === 'gigante' ? (ef.cuanto || 1.8) : (ef.cuanto || 0.5), transformOrigin: '50% 100%', duration: quieto() ? 0 : 0.7, ease: 'elastic.out(1, .5)' });
        return espera(700);
      case 'disfraz': case 'come': case 'desaparece':
        if (!m) return;
        if (!quieto()) await new Promise((ok) => { gsap.to(m, { scale: 0, transformOrigin: '50% 100%', duration: 0.25, ease: 'back.in(2)', onComplete: ok }); setTimeout(ok, 900); });   // con la ventana oculta GSAP se para: que la clase no se quede colgada
        if (ef.tipo === 'disfraz') { m.innerHTML = ef.como === 'nyan' ? nyan3d({ cara: ef.cara }) : figura(ef.como); if (!quieto()) gsap.to(m, { scale: 1, duration: 0.4, ease: 'back.out(2.4)' }); else gsap.set(m, { scale: 1 }); }
        else if (ef.tipo === 'come') { const ny = sala.querySelector('.cl-ny-cosa'); if (ny) { const dn = datos(ny); await efecto({ tipo: 'texto', texto: ef.texto || 'もぐもぐ', x: dn.x + 40, y: dn.y - 110 }); } }
        return espera(300);
      case 'huye':
        if (!m) return;
        m.insertAdjacentHTML('beforeend', vida(med));
        if (!quieto()) { gsap.to(m, { y: -11, duration: 0.2 }); gsap.to(m, { x: (ef.hacia === 'izq' ? -420 : 420) / d.s, duration: 1.3, delay: 0.3, ease: 'power2.in' }); gsap.to(m, { y: -20, duration: 0.12, yoyo: true, repeat: 10, delay: 0.3 }); }
        return espera(1200);
      case 'duerme': if (g) manpuSobre(g, 'z'); if (m && !quieto()) gsap.to(m, { rotation: -8, transformOrigin: '50% 100%', duration: 0.6, ease: 'sine.inOut' }); return espera(700);
      case 'manpu': if (g) manpuSobre(g, ef.manpu || 'excl'); return espera(450);
      case 'encima': case 'mueve': {
        if (!m) return;
        let tx, ty;
        if (ef.tipo === 'encima') { const b = obj(ef.sobre); if (!b) return; ({ x: tx, y: ty } = encimaDe(b)); sala.appendChild(g); } else { tx = ef.x ?? d.x; ty = ef.y ?? d.y; }
        const dx = (tx - d.x) / d.s, dy = (ty - d.y) / d.s;
        if (quieto()) gsap.set(m, { x: dx, y: dy });
        else await new Promise((ok) => { gsap.to(m, { x: dx, duration: 0.7, ease: 'power1.inOut' }); gsap.to(m, { keyframes: [{ y: Math.min(0, dy) - 40 / d.s, duration: 0.32, ease: 'power2.out' }, { y: dy, duration: 0.38, ease: 'bounce.out' }], onComplete: ok }); setTimeout(ok, 1300); });
        return espera(150);
      }
      case 'aparece': nuevaCosa({ ...ef, que: ef.que }); return espera(450);
      case 'tacha': {
        if (!g) return;
        const x = d.x, y = d.y - (med.h * d.s) / 2, r = Math.max(26, (Math.max(med.w, med.h) * d.s) / 2);
        const tmp = document.createElementNS(NS, 'g');
        tmp.innerHTML = `<g class="cl-tacha"><path d="M${x - r} ${y - r} L${x + r} ${y + r} M${x + r} ${y - r} L${x - r} ${y + r}" stroke="#e8574a" stroke-width="9" stroke-linecap="round" opacity=".9"/></g>`;
        const el = tmp.firstElementChild; sala.appendChild(el);
        if (!quieto()) gsap.fromTo(el, { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.35, ease: 'back.out(2.5)' });
        return espera(500);
      }
      case 'nyan': {
        const ny = obj('nyan'); if (!ny) return;
        $('.cl-ny', ny).innerHTML = nyan3d({ cara: ef.cara || 'sorpresa', brazo: ef.brazo, onigiri: ef.onigiri });
        if (ef.manpu) manpuSobre(ny, ef.manpu);
        if (!quieto()) gsap.fromTo($('.cl-ny', ny), { y: 0 }, { y: -10, duration: 0.15, yoyo: true, repeat: 1 });
        return espera(450);
      }
      case 'texto': {
        const tmp = document.createElementNS(NS, 'g');
        const x = ef.x ?? (d ? d.x : 200), y = ef.y ?? (d ? d.y - med.h * d.s - 14 : 80);
        tmp.innerHTML = `<text class="cl-onomato" x="${x}" y="${y}" text-anchor="middle">${esc(ef.texto || '')}</text>`;
        const el = tmp.firstElementChild; sala.appendChild(el);
        if (!quieto()) gsap.fromTo(el, { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.35, ease: 'back.out(3)' });
        return espera(500);
      }
      case 'gira': if (m && !quieto()) gsap.to(m, { rotation: '+=360', transformOrigin: '50% 60%', duration: 0.7, ease: 'power2.inOut' }); return espera(700);
      case 'tiembla': if (m && !quieto()) gsap.fromTo(m, { x: -4 }, { x: 4, repeat: 7, yoyo: true, duration: 0.05 }); return espera(450);
      default: return undefined;
    }
  }
  async function efectos(lista) { for (const ef of [].concat(lista || [])) await efecto(ef); }
  return { efecto, efectos };
}
