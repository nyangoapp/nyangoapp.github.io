// La bienvenida de Nyan (02-10).
// Pasos, sobre la sala (Nyan en 3D habla desde ella con su bocadillo): saludo → nombre → para qué → cuánto tiempo → nivel →
// prueba de nivel (kana y palabras por tramos de frecuencia, adaptativa) → tu plan (recomendaciones según lo anterior) → tour
// por la portada señalando cada cosa. Lo sabido entra con /api/nivel (repasos repartidos en meses); el perfil, en /api/perfil.
// Se puede repetir desde Ajustes (y el tour solo).
import { gsap } from 'gsap';
import { $, $$, api, estado, quieto, mil } from './app.js';
import * as son from './sonido.js';
import { esc } from './japones.js';
import { kbd, capa, escribiendo } from './teclado.js';
import { t, idioma } from './i18n.js';

const MOTIVOS = [['anime', 'アニメ'], ['viajar', '旅行'], ['juegos', 'ゲーム'], ['amigos', '友達'], ['jlpt', '試験'], ['trabajo', '仕事'], ['cultura', '文化']];
const MINUTOS = [5, 10, 20, 30];
const NIVELES = ['cero', 'kana', 'basico', 'medio', 'alto'];
const TRAMO_INICIAL = { kana: 0, basico: 1, medio: 3, alto: 4 };
const azar = (l) => l[Math.floor(Math.random() * l.length)];
const mezclar = (l) => l.map((x) => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
const negrita = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
const lista = (clave) => t(clave).split('|');

let m = null; // la Mascota de la portada
function habla(html, { cara = null, voz = null, ms = 5200 } = {}) {
  if (!m?.decir) return;
  m.decir(html, { ms }); son.burbuja();
  if (cara) m.expresion?.(cara, Math.min(ms, 2600));
  if (voz) m.hablar?.(voz);
}

// ───────────────────────── la bienvenida ─────────────────────────
export async function bienvenida(d, mascota) {
  m = mascota || estado.mochi;
  estilos();
  const st = { nombre: '', motivos: new Set(), minutos: 10, nivel: null, hira: false, kata: false, hasta: 0, region: null, paso: 0 };
  // con progreso (se repite la bienvenida desde los ajustes) la prueba es solo para verla: no cambia lo que ya sabes
  const yaTiene = (d?.cuenta?.aprendidos || 0) > 0;
  const capaEl = document.createElement('div');
  capaEl.className = 'modal-capa bv-capa'; capaEl.setAttribute('role', 'dialog'); capaEl.setAttribute('aria-modal', 'true'); capaEl.setAttribute('aria-labelledby', 'bv-tit');
  capaEl.innerHTML = `<section class="bv-ficha"><div class="bv-puntos">${'<i></i>'.repeat(6)}</div><div class="bv-cuerpo"></div></section>`;
  document.body.appendChild(capaEl);
  document.body.classList.add('en-bienvenida');
  const ficha = $('.bv-ficha', capaEl), cuerpo = $('.bv-cuerpo', capaEl);
  if (!quieto()) gsap.fromTo(ficha, { y: 60, opacity: 0, rotate: 2 }, { y: 0, opacity: 1, rotate: 0, duration: 0.8, ease: 'back.out(1.6)' });
  let alTeclear = null;
  const soltar = capa(capaEl, (e) => alTeclear?.(e) || false);
  let terminado;
  const fin = new Promise((r) => { terminado = r; });

  const pintar = (n, html, enlazar, tecla = null) => {
    st.paso = n;
    $$('.bv-puntos i', capaEl).forEach((p, i) => p.classList.toggle('si', i <= Math.min(n, 5)));
    cuerpo.innerHTML = html; alTeclear = tecla;
    enlazar?.();
    encajar();
    if (!quieto()) gsap.fromTo([...cuerpo.children], { x: 36, opacity: 0 }, { x: 0, opacity: 1, duration: 0.45, stagger: 0.05, ease: 'back.out(1.6)' });
    requestAnimationFrame(() => ($('[data-foco]', cuerpo) || $('button, input', cuerpo))?.focus({ preventScroll: true }));
  };
  // la ficha nunca se desplaza: si lo de dentro no cabe, se reduce lo justo
  const encajar = () => {
    cuerpo.style.zoom = '';
    const sobra = ficha.scrollHeight - ficha.clientHeight;
    if (sobra > 0) cuerpo.style.zoom = String(Math.max(0.7, (cuerpo.offsetHeight - sobra - 6) / cuerpo.offsetHeight));
  };
  const alCambiar = () => encajar();
  addEventListener('resize', alCambiar);
  const opcionTecla = (e, sel, max) => { const n = Number(e.key); if (n >= 1 && n <= max && !escribiendo(e)) { $$(sel, cuerpo)[n - 1]?.click(); return true; } return false; };
  const intro = (e, fn) => { if (e.key === 'Enter' && !(e.target.closest?.('button') && e.target !== document.body)) { fn(); return true; } return false; };

  // 1 · el saludo
  const saludo = () => {
    pintar(0, `<div class="bv-ante">${t('bv.saludo.ante')}</div><h2 id="bv-tit">${t('bv.saludo.tit')}</h2><p>${t('bv.saludo.p')}</p>
      <div class="bv-botones"><button class="boton-tinta" data-foco id="bv-si">${t('bv.saludo.si')} ${kbd('Intro')}</button></div>`,
    () => { $('#bv-si', cuerpo).onclick = nombre; }, (e) => intro(e, nombre));
    setTimeout(() => { m?.saludar?.(); habla(t('bv.nyan.hola'), { cara: 'feliz', voz: 'nyaa', ms: 6000 }); }, 500);
  };
  // 2 · cómo te llamo
  const nombre = () => {
    son.toque();
    pintar(1, `<div class="bv-ante">${t('bv.paso', { n: 1, total: 5 })}</div><h2 id="bv-tit">${t('bv.nombre.tit')}</h2><p>${t('bv.nombre.p')}</p>
      <input class="bv-input" id="bv-nombre" maxlength="30" autocomplete="off" spellcheck="false" placeholder="${t('bv.nombre.ph')}" value="${esc(st.nombre)}" data-foco>
      <div class="bv-botones"><button class="boton-claro" id="bv-sin">${t('bv.nombre.sin')}</button><button class="boton-tinta" id="bv-ok">${t('bv.seguir')} ${kbd('Intro')}</button></div>`,
    () => { $('#bv-ok', cuerpo).onclick = () => seguir(false); $('#bv-sin', cuerpo).onclick = () => seguir(true); },
    // las teclas llegan aquí antes que al campo (la capa las recoge al vuelo): Intro sigue, con nombre o sin él
    (e) => { if (e.key !== 'Enter' || (e.target.closest?.('button') && e.target.id !== 'bv-ok')) return false; seguir(!$('#bv-nombre', cuerpo).value.trim()); return true; });
    const seguir = (sin = false) => {
      st.nombre = sin ? '' : $('#bv-nombre', cuerpo).value.trim().slice(0, 30);
      habla(st.nombre ? t('bv.nyan.nombre', { nombre: esc(st.nombre) }) : t('bv.nyan.sin_nombre'), { cara: 'feliz', voz: 'ya' });
      motivos();
    };
    habla(t('bv.nyan.como'), { cara: 'pensando', voz: 'hm' });
  };
  // 3 · para qué
  const motivos = () => {
    pintar(2, `<div class="bv-ante">${t('bv.paso', { n: 2, total: 5 })}</div><h2 id="bv-tit">${t('bv.motivo.tit')}</h2><p>${t('bv.motivo.p')}</p>
      <div class="bv-chips">${MOTIVOS.map(([id, jp], i) => `<button class="bv-chip ${st.motivos.has(id) ? 'si' : ''}" data-m="${id}" aria-pressed="${st.motivos.has(id)}"><b lang="ja">${jp}</b>${t(`bv.motivo.${id}`)}<kbd>${i + 1}</kbd></button>`).join('')}</div>
      <div class="bv-botones"><button class="boton-tinta" id="bv-ok" data-foco>${t('bv.seguir')} ${kbd('Intro')}</button></div>`,
    () => {
      $$('.bv-chip', cuerpo).forEach((b) => (b.onclick = () => {
        const id = b.dataset.m, si = !st.motivos.has(id);
        if (si) st.motivos.add(id); else st.motivos.delete(id);
        b.classList.toggle('si', si); b.setAttribute('aria-pressed', si); son.toque();
        if (si) { habla(t(`bv.nyan.motivo.${id}`), { cara: azar(['estrella', 'feliz', 'risa']), voz: azar(['ya', 'yaha', 'fun']), ms: 3600 }); if (!quieto()) gsap.fromTo(b, { scale: 0.9 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' }); }
      }));
      $('#bv-ok', cuerpo).onclick = tiempo;
    }, (e) => opcionTecla(e, '.bv-chip', MOTIVOS.length) || intro(e, tiempo));
  };
  // 4 · cuánto tiempo
  const tiempo = () => {
    son.toque();
    pintar(3, `<div class="bv-ante">${t('bv.paso', { n: 3, total: 5 })}</div><h2 id="bv-tit">${t('bv.tiempo.tit')}</h2><p>${t('bv.tiempo.p')}</p>
      <div class="bv-opciones">${MINUTOS.map((n, i) => `<button class="bv-op ${st.minutos === n ? 'si' : ''}" data-min="${n}"><b>${n === 30 ? '30+' : n}<small>min</small></b><span>${t(`bv.tiempo.${n}`)}</span><kbd>${i + 1}</kbd></button>`).join('')}</div>`,
    () => $$('.bv-op', cuerpo).forEach((b) => (b.onclick = () => {
      st.minutos = +b.dataset.min; son.toque();
      $$('.bv-op', cuerpo).forEach((x) => x.classList.toggle('si', x === b));
      habla(t(`bv.nyan.tiempo.${st.minutos}`), { cara: st.minutos >= 30 ? 'sorpresa' : 'feliz', voz: st.minutos >= 30 ? 'eh' : 'ya', ms: 3400 });
      setTimeout(nivel, 650);
    })), (e) => opcionTecla(e, '.bv-op', MINUTOS.length));
    habla(t('bv.nyan.tiempo'), { cara: 'normal', voz: 'pi' });
  };
  // 5 · cuánto sabes
  const nivel = () => {
    pintar(4, `<div class="bv-ante">${t('bv.paso', { n: 4, total: 5 })}</div><h2 id="bv-tit">${t('bv.nivel.tit')}</h2>
      <div class="bv-opciones columna">${NIVELES.map((n, i) => `<button class="bv-op ancho ${st.nivel === n ? 'si' : ''}" data-nivel="${n}"><span><b>${t(`bv.nivel.${n}`)}</b><small>${t(`bv.nivel.${n}_d`)}</small></span><kbd>${i + 1}</kbd></button>`).join('')}</div>`,
    () => $$('.bv-op', cuerpo).forEach((b) => (b.onclick = () => {
      st.nivel = b.dataset.nivel; son.toque();
      $$('.bv-op', cuerpo).forEach((x) => x.classList.toggle('si', x === b));
      setTimeout(() => (st.nivel === 'cero' ? plan() : antesDePrueba()), 450);
    })), (e) => opcionTecla(e, '.bv-op', NIVELES.length));
    habla(t('bv.nyan.nivel'), { cara: 'pensando', voz: 'hm' });
  };
  // 6 · la prueba
  const antesDePrueba = () => {
    pintar(5, `<div class="bv-ante">${t('bv.paso', { n: 5, total: 5 })}</div><h2 id="bv-tit">${t('bv.prueba.tit')}</h2><p>${t('bv.prueba.p')}</p>
      <div class="bv-botones"><button class="boton-claro" id="bv-saltar">${t('bv.prueba.saltar')}</button><button class="boton-tinta" id="bv-ok" data-foco>${t('bv.prueba.empezar')} ${kbd('Intro')}</button></div>`,
    () => {
      $('#bv-ok', cuerpo).onclick = prueba;
      $('#bv-saltar', cuerpo).onclick = () => { // sin prueba: lo que dice que sabe, con prudencia (la mitad del tramo inicial)
        st.hira = st.nivel !== 'cero'; st.kata = ['basico', 'medio', 'alto'].includes(st.nivel);
        st.hasta = { kana: 0, basico: 150, medio: 400, alto: 800 }[st.nivel] || 0; plan();
      };
    }, (e) => intro(e, prueba));
    habla(t('bv.nyan.prueba'), { cara: 'decidido', voz: 'ura' });
  };
  const prueba = async () => {
    son.abrir();
    let tramos = [];
    try { tramos = await api(`/api/nivel/prueba?lang=${idioma}`); } catch {}
    const K = await fetch('/kana/kana.json').then((r) => r.json()).catch(() => null);
    const basicos = (esc_) => (K ? K.tablas[esc_][0].filas.flat().filter(Boolean) : []);
    let n = 0;
    // una pregunta: {grande, opciones (la buena primero), audio?} → true / false
    const preguntar = (q) => new Promise((resolver) => {
      n++;
      const ops = mezclar(q.opciones.map((texto, i) => ({ texto, ok: i === 0 })));
      pintar(5, `<div class="bv-ante">${t('bv.prueba.n', { n })}</div><div class="bv-pregunta">${q.titulo}</div>
        <div class="bv-grande ${q.kana ? 'kana' : ''}" lang="ja">${esc(q.grande)}</div>
        <div class="bv-respuestas">${ops.map((o, i) => `<button class="bv-resp" data-i="${i}">${kbd(i + 1)}<span>${esc(o.texto)}</span></button>`).join('')}</div>
        <button class="bv-nose" id="bv-nose">？ ${t('bv.prueba.no_se')} ${kbd('0')}</button>`,
      () => {
        const elegir = (i) => {
          const ok = i >= 0 && ops[i].ok;
          $$('.bv-resp', cuerpo).forEach((b, j) => { b.disabled = true; if (ops[j].ok) b.classList.add('bien'); else if (j === i) b.classList.add('mal'); });
          if (ok) { son.acierto(1); m?.expresion?.(azar(['feliz', 'estrella', 'risa']), 1200); if (Math.random() < 0.45) habla(azar(lista('bv.nyan.bien')), { voz: 'ya', ms: 1800 }); }
          else { son.fallo(); m?.expresion?.(azar(['pensando', 'sorpresa']), 1200); if (Math.random() < 0.45) habla(azar(lista('bv.nyan.mal')), { voz: 'hm', ms: 1800 }); }
          setTimeout(() => resolver(ok), ok ? 650 : 1100);
        };
        $$('.bv-resp', cuerpo).forEach((b) => (b.onclick = () => elegir(+b.dataset.i)));
        $('#bv-nose', cuerpo).onclick = () => elegir(-1);
      }, (e) => { const k = Number(e.key); if (e.key === '0') { $('#bv-nose', cuerpo)?.click(); return true; } return opcionTecla(e, '.bv-resp', ops.length) || (k >= 1 && k <= 4); });
    });
    // los kana: tres de hiragana y tres de katakana (¿cómo se lee?)
    const rondaKana = async (esc_) => {
      const lista_ = mezclar(basicos(esc_)).slice(0, 3);
      let bien = 0;
      for (const k of lista_) {
        const r = K.kana[k].r, otras = mezclar(basicos(esc_).filter((x) => K.kana[x].r !== r)).slice(0, 3).map((x) => K.kana[x].r);
        if (await preguntar({ titulo: t('bv.prueba.kana'), grande: k, kana: true, opciones: [r, ...otras] })) bien++;
      }
      return bien >= 2;
    };
    if (K) { st.hira = await rondaKana('hiragana'); st.kata = await rondaKana('katakana'); }
    // las palabras: cinco de un tramo; con cuatro bien, al siguiente; si no, hacia abajo (si aún no has pasado ninguno).
    // Prudente (03-10: con tres preguntas y dos aciertos, la suerte colocaba a gente muy por encima de lo que sabe): el
    // tramo se da entero solo con las cinco; con cuatro, hasta su mitad
    let pasado = -1, perfecto = false;
    if (st.hira && tramos.length) {
      let b = Math.min(TRAMO_INICIAL[st.nivel] ?? 0, tramos.length - 1), bajando = false;
      for (let vueltas = 0; vueltas < 7; vueltas++) {
        const qs = mezclar(tramos[b].preguntas).slice(0, 5);
        let bien = 0;
        for (const q of qs) if (await preguntar({ titulo: t('bv.prueba.palabra'), grande: q.palabra, opciones: [q.es, ...q.malas] })) bien++;
        if (bien >= Math.max(1, qs.length - 1)) { if (b >= pasado) { pasado = b; perfecto = bien === qs.length; } if (bajando || b + 1 >= tramos.length) break; b++; }
        else { if (pasado >= 0 || b === 0) break; b--; bajando = true; }
      }
    }
    st.hasta = pasado < 0 ? 0 : perfecto ? tramos[pasado].hasta : Math.floor((tramos[pasado].desde + tramos[pasado].hasta) / 2);
    plan();
  };
  // 7 · tu plan
  const plan = async () => {
    son.fanfarria?.();
    // aplicar: lo sabido entra como aprendido; el perfil se guarda; la bienvenida vieja ya no sale
    const K = await fetch('/kana/kana.json').then((r) => r.json()).catch(() => null);
    const kanaSabidos = !K ? [] : [...(st.hira ? K.tablas.hiragana : []), ...(st.kata ? K.tablas.katakana : [])].flatMap((g) => g.filas.flat()).filter(Boolean);
    let colocado = null;
    try { if (!yaTiene && (st.hasta || kanaSabidos.length)) colocado = await api('/api/nivel', { hasta: st.hasta, kana: kanaSabidos }); } catch {}
    try { await api('/api/perfil', { nombre: st.nombre, motivos: [...st.motivos], minutos: st.minutos, ...(yaTiene ? {} : { nivel: st.nivel || 'cero', hasta: st.hasta }), hecho: true }); } catch {}
    try { await api('/api/herencia', {}); } catch {}
    let d2 = null; try { d2 = await api('/api/inicio'); estado.inicio = d2; } catch {}
    const recs = [];
    if (!st.hira) recs.push(['kana', t('bv.rec.kana')]);
    else if (!st.kata) recs.push(['kana', t('bv.rec.katakana')]);
    recs.push(['repaso', t(`bv.rec.rutina.${st.minutos}`)]);
    const g = d2?.gramatica;
    recs.push(['gramatica', st.hasta >= 400 ? t('bv.rec.clase_salta') : g && st.hira ? t('bv.rec.clase', { clase: esc(g.titulo.replace(/\[[^\]]*\]/g, '')) }) : t('bv.rec.clase_primera')]);
    for (const id of [...st.motivos].slice(0, 2)) recs.push([id, t(`bv.rec.motivo.${id}`)]);
    recs.push(['racha', t('bv.rec.repaso')]);
    recs.splice(4); // cuatro como mucho: lo que más le sirve, sin agobiar
    const reg = colocado?.region || d2?.region;
    const todo = st.hasta && st.hasta >= (d2?.total_palabras || 3000);
    const tit = yaTiene ? t('bv.plan.tit_ya') : !st.hira ? t('bv.plan.tit_cero') : st.hasta ? t('bv.plan.tit_n', { n: mil(st.hasta) }) : t('bv.plan.tit_kana');
    const p = yaTiene ? t('bv.plan.p_ya') : !st.hira ? t('bv.plan.p_cero') : todo ? t('bv.plan.p_todo') : st.hasta ? t('bv.plan.p_n', { region: reg ? `${reg.i + 1} · ${esc(reg.nombre)}` : '', n: mil(st.hasta + 1) }) : t('bv.plan.p_kana');
    const ICO = { kana: 'あ', repaso: '稽', gramatica: '文', racha: '続', anime: 'アニメ', viajar: '旅', juegos: '遊', amigos: '友', jlpt: '試', trabajo: '仕', cultura: '文化' };
    pintar(6, `<div class="bv-ante">${st.nombre ? t('bv.plan.ante', { nombre: esc(st.nombre) }) : t('bv.plan.ante_tuyo')}</div><h2 id="bv-tit">${tit}</h2><p>${p}</p>
      ${yaTiene ? `<p class="bv-nota-ya">${t('bv.plan.ya_tienes')}</p>` : ''}
      <ul class="bv-recs">${recs.map(([id, txt]) => `<li><i lang="ja">${ICO[id] || '・'}</i><span>${negrita(txt)}</span></li>`).join('')}</ul>
      <div class="bv-botones"><button class="boton-claro" id="bv-ya">${t('bv.plan.ya')} ${kbd('Esc')}</button><button class="boton-tinta" id="bv-tour" data-foco>${t('bv.plan.tour')} ${kbd('Intro')}</button></div>`,
    () => {
      $('#bv-ya', cuerpo).onclick = () => cerrar(false);
      $('#bv-tour', cuerpo).onclick = () => cerrar(true);
      if (!quieto()) gsap.fromTo($$('.bv-recs li', cuerpo), { x: 30, opacity: 0 }, { x: 0, opacity: 1, duration: 0.45, stagger: 0.09, delay: 0.25, ease: 'back.out(1.8)' });
    }, (e) => (e.key === 'Escape' ? (cerrar(false), true) : intro(e, () => cerrar(true))));
    m?.celebrar?.();
    habla(t('bv.nyan.plan', { nombre: esc(st.nombre || t('bv.profe')) }), { cara: 'estrella', voz: 'yaha', ms: 6000 });
  };
  const cerrar = (conTour) => {
    soltar(); removeEventListener('resize', alCambiar);
    document.body.classList.remove('en-bienvenida');
    const fuera = () => { capaEl.remove(); dispatchEvent(new Event('nyango:progreso')); terminado(); if (conTour) setTimeout(() => tour(m), 500); };
    if (quieto()) fuera(); else gsap.to(ficha, { y: 40, opacity: 0, duration: 0.3, ease: 'power2.in', onComplete: fuera });
  };
  saludo();
  return fin;
}

// ───────────────────────── el tour por la portada ─────────────────────────
const PASOS = [
  { sel: '.m-item.a-repaso', id: 'repaso' }, { sel: '.m-item.a-leccion', id: 'leccion' }, { sel: '.m-item.a-gramatica', id: 'gramatica' },
  { sel: '.m-item.a-kanji', id: 'kanji' }, { sel: '.m-item.a-camino', id: 'camino' }, { sel: '.m-item.a-historias', id: 'historias' },
  { sel: '.m-item.a-mochi', id: 'mochi' }, { sel: '.m-item.a-kana', id: 'kana' }, { sel: '#foco-carta', id: 'carta' },
  { sel: '#hud-juego', id: 'misiones' }, { sel: '#nav a[href="#estadisticas"]', id: 'estadisticas' }, { sel: '#btn-ajustes', id: 'ajustes' },
];
export function tour(mascota) {
  m = mascota || estado.mochi;
  estilos();
  const pasos = PASOS.filter((p) => { const el = $(p.sel); return el && el.getClientRects().length; });
  if (!pasos.length) return;
  const capaEl = document.createElement('div');
  capaEl.className = 'tour-capa'; capaEl.setAttribute('role', 'dialog'); capaEl.setAttribute('aria-modal', 'true'); capaEl.setAttribute('aria-label', t('tour.aria'));
  capaEl.innerHTML = `<i class="tour-agujero"></i><div class="tour-nota" aria-live="polite"><img class="tour-nyan" alt="" draggable="false">
    <div class="tour-txt"><b class="tour-tit"></b><p></p></div><div class="tour-pie"><span class="tour-n"></span>
    <button class="boton-claro peq" id="tour-saltar">${t('tour.saltar')} ${kbd('Esc')}</button><button class="boton-tinta peq" id="tour-sig">${t('tour.siguiente')} ${kbd('Intro')}</button></div></div>`;
  document.body.appendChild(capaEl);
  const agujero = $('.tour-agujero', capaEl), nota = $('.tour-nota', capaEl);
  let i = -1;
  const cerrar = () => {
    soltar(); api('/api/perfil', { tour: true }).catch(() => {});
    gsap.to(capaEl, { opacity: 0, duration: 0.3, onComplete: () => capaEl.remove() });
    m?.celebrar?.();
  };
  const ir = (n) => {
    if (n >= pasos.length) return cerrar();
    i = n;
    const p = pasos[i], el = $(p.sel);
    if (el.classList.contains('m-item')) el.click(); // la ficha del muelle se elige: así la carta enseña lo que es
    const caras = ['feliz', 'normal', 'pensando', 'sorpresa'];
    setTimeout(() => {
      const r = el.getBoundingClientRect(), pad = 8;
      const caja = { left: r.left - pad, top: r.top - pad, width: r.width + 2 * pad, height: r.height + 2 * pad };
      gsap.to(agujero, { ...caja, borderRadius: Math.min(28, caja.height / 2), duration: quieto() ? 0 : 0.45, ease: 'power3.inOut' });
      $('.tour-tit', nota).textContent = t(`tour.${p.id}.tit`);
      $('.tour-txt p', nota).innerHTML = negrita(t(`tour.${p.id}`));
      $('.tour-n', nota).textContent = t('tour.paso', { n: i + 1, total: pasos.length });
      $('#tour-sig', nota).firstChild.textContent = (i === pasos.length - 1 ? t('tour.fin') : t('tour.siguiente')) + ' ';
      const abajo = r.top > innerHeight / 2, alto = r.height > innerHeight * 0.42;
      $('.tour-nyan', nota).src = `/img/reparto/nyan-${caras[i % caras.length]}${abajo ? '' : '-arriba'}.webp`;
      // la nota, arriba o abajo de lo señalado, sin salirse
      const w = Math.min(420, innerWidth - 24), h = nota.offsetHeight || 170;
      let x = Math.max(12, Math.min(innerWidth - w - 12, r.left + r.width / 2 - w / 2));
      let y = abajo ? Math.max(12, r.top - pad - h - 16) : Math.min(innerHeight - h - 12, r.bottom + pad + 16);
      if (alto) { // lo señalado ocupa media pantalla: la nota, a su lado
        x = r.left - pad - w - 16 >= 12 ? r.left - pad - w - 16 : Math.min(innerWidth - w - 12, r.right + pad + 16);
        y = Math.max(12, Math.min(innerHeight - h - 12, r.top + r.height / 2 - h / 2));
      }
      gsap.to(nota, { left: x, top: y, width: w, duration: quieto() ? 0 : 0.45, ease: 'power3.inOut' });
      if (!quieto()) gsap.fromTo($('.tour-txt', nota), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.35, delay: 0.15 });
      son.burbuja();
    }, el.classList.contains('m-item') ? 260 : 0);
  };
  const soltar = capa(capaEl, (e) => {
    if (e.key === 'Escape') { cerrar(); return true; }
    if (e.key === 'Enter' || e.key === 'ArrowRight' || e.key === ' ') { ir(i + 1); return true; }
    if (e.key === 'ArrowLeft' && i > 0) { ir(i - 1); return true; }
    return true; // nada más llega a la portada mientras dura
  }, { foco: $('#tour-sig', capaEl) });
  $('#tour-sig', capaEl).onclick = () => ir(i + 1);
  $('#tour-saltar', capaEl).onclick = cerrar;
  agujero.onclick = () => ir(i + 1);
  gsap.fromTo(capaEl, { opacity: 0 }, { opacity: 1, duration: 0.35 });
  ir(0);
  habla(t('tour.nyan'), { cara: 'feliz', voz: 'ya' });
}

let puestos = false;
function estilos() {
  if (puestos) return; puestos = true;
  const s = document.createElement('style');
  s.textContent = `
/* la bienvenida: la ficha a la derecha de Nyan (donde va la carta de la portada); la sala se sigue viendo */
.bv-capa { background: linear-gradient(90deg, transparent 30%, color-mix(in srgb, var(--velo) 70%, transparent)); backdrop-filter: none; place-items: center end; padding: 40px 5vw 0; }
body.en-bienvenida :is(#muelle, #foco, #hud-juego, .barra .pildora, .barra .estado, .libreta-nyan) { opacity: 0 !important; pointer-events: none !important; transition: opacity .4s; }
.bv-ficha { position: relative; width: min(500px, 44vw); max-height: calc(100vh - 60px); overflow: hidden; display: grid; gap: 0; padding: 28px; border-radius: var(--radio);
  background: var(--sup); border: var(--borde); color: var(--tinta); box-shadow: var(--sombra-flotante); }
.bv-puntos { position: absolute; top: 20px; right: 24px; display: flex; gap: 6px; }
.bv-puntos i { width: 8px; height: 8px; border-radius: 50%; background: var(--linea-2); transition: background .25s var(--suave), width .25s var(--suave); }
.bv-puntos i.si { background: var(--acento); } .bv-puntos i.si:last-of-type, .bv-puntos i.si:has(+ i:not(.si)) { width: 20px; border-radius: 4px; }
.bv-cuerpo { display: grid; gap: 16px; }
.bv-ante { font: 700 12px/1.2 var(--f-texto); letter-spacing: .14em; text-transform: uppercase; color: var(--tinta-2); }
.bv-cuerpo h2 { margin: 0; font: var(--peso-titulo) clamp(26px, 4vh, 36px)/1.15 var(--f-titulo); color: var(--tinta); text-wrap: balance; }
.bv-cuerpo p { margin: 0; font: 500 16px/1.55 var(--f-texto); color: var(--tinta-2); text-wrap: pretty; }
.bv-botones { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; margin-top: 4px; }
.bv-botones .boton-claro, .bv-botones .boton-tinta { height: 52px; padding-inline: 18px; }
.bv-ficha .boton-claro, .tour-nota .boton-claro { background: var(--sup-2); }
.bv-input { height: 56px; padding: 0 20px; border: var(--borde); border-radius: var(--radio-peq); background: var(--sup-2); box-shadow: inset 0 0 0 2px var(--linea); font: 600 20px var(--f-texto); color: var(--tinta); outline: none; transition: box-shadow .15s var(--suave), background .15s; }
.bv-input::placeholder { color: var(--tinta-2); opacity: .7; }
.bv-input:hover { box-shadow: inset 0 0 0 2px var(--linea-2); }
.bv-input:focus { background: var(--sup); box-shadow: inset 0 0 0 2px var(--acento); }
.bv-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.bv-chip { position: relative; display: inline-flex; align-items: center; gap: 8px; height: 44px; padding: 0 16px 0 12px; border: var(--borde); border-radius: var(--radio-btn); background: var(--sup-2); cursor: pointer;
  box-shadow: var(--sombra-peq); font: 700 14.5px var(--f-texto); color: var(--tinta); transition: translate .15s var(--suave), background .15s, box-shadow .15s, border-color .15s; }
.bv-chip b { font: var(--peso-titulo) 13px var(--f-jp); color: var(--tinta-2); } .bv-chip kbd { display: none; }
.bv-chip:hover { translate: 0 -2px; border-color: var(--linea-2); }
.bv-chip:active { translate: 0 1px; }
.bv-chip.si { background: var(--acento-suave); box-shadow: inset 0 0 0 2px var(--acento); border-color: transparent; } .bv-chip.si b { color: var(--acento-tinta); }
.bv-opciones { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.bv-opciones.columna { grid-template-columns: 1fr; gap: 8px; }
.bv-op { position: relative; display: grid; justify-items: center; gap: 4px; padding: 16px 8px 12px; border: var(--borde); border-radius: var(--radio-peq); background: var(--sup-2); cursor: pointer; color: var(--tinta);
  box-shadow: var(--sombra-peq); transition: translate .15s var(--suave), background .15s, box-shadow .15s, border-color .15s; text-align: center; }
.bv-op b { font: var(--peso-titulo) 30px/1 var(--f-titulo); font-variant-numeric: tabular-nums; } .bv-op b small { font: 700 12px var(--f-texto); margin-left: 2px; color: var(--tinta-2); }
.bv-op > span { font: 700 13px var(--f-texto); color: var(--tinta-2); }
.bv-op kbd { position: absolute; top: 6px; right: 6px; transform: scale(.8); }
.bv-op:hover { translate: 0 -2px; border-color: var(--linea-2); }
.bv-op:active { translate: 0 1px; }
.bv-op.si { background: var(--acento-suave); box-shadow: inset 0 0 0 2px var(--acento); border-color: transparent; }
.bv-op.si > span, .bv-op.si b small { color: var(--acento-tinta); }
.bv-op.ancho { display: flex; justify-content: space-between; align-items: center; text-align: left; padding: 12px 16px; }
.bv-op.ancho span { display: grid; gap: 2px; } .bv-op.ancho b { font: 700 16px var(--f-texto); } .bv-op.ancho small { font: 600 12.5px var(--f-texto); color: var(--tinta-2); }
.bv-op.ancho kbd { position: static; transform: none; }
.bv-pregunta { font: 700 14px var(--f-texto); letter-spacing: .12em; text-transform: uppercase; color: var(--acento-tinta); }
.bv-grande { justify-self: center; padding: 4px 0; font: 500 clamp(40px, 8vh, 64px)/1.2 var(--f-jp); color: var(--tinta); text-align: center; }
.bv-grande.kana { font-size: clamp(64px, 12vh, 96px); }
.bv-respuestas { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.bv-resp { display: flex; align-items: center; gap: 12px; min-height: 56px; padding: 8px 12px; border: var(--borde); border-radius: var(--radio-peq); background: var(--sup-2); color: var(--tinta); cursor: pointer; text-align: left;
  box-shadow: var(--sombra-peq); font: 600 15px/1.25 var(--f-texto); transition: translate .15s var(--suave), background .15s, box-shadow .15s, border-color .15s; }
.bv-resp:not(:disabled):hover { translate: 0 -2px; border-color: var(--linea-2); }
.bv-resp:not(:disabled):active { translate: 0 1px; }
.bv-resp.bien { background: var(--bien-suave); box-shadow: inset 0 0 0 2px var(--bien); border-color: transparent; } .bv-resp.mal { background: var(--mal-suave); box-shadow: inset 0 0 0 2px var(--mal); border-color: transparent; }
.bv-nose { justify-self: center; height: 44px; padding: 0 16px; border: 0; border-radius: var(--radio-btn); background: transparent; color: var(--tinta-2); font: 700 14px var(--f-texto); cursor: pointer; transition: background .15s, color .15s; }
.bv-nose:hover { background: var(--sup-2); color: var(--tinta); }
.bv-ficha :is(.bv-chip, .bv-op, .bv-resp, .bv-nose):focus-visible { outline: 2px solid var(--acento); outline-offset: 2px; }
.bv-recs { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.bv-nota-ya { margin: 0 0 12px; padding: 8px 12px; border-radius: var(--radio-peq); background: var(--acento-suave); font: 600 13px/1.4 var(--f-texto); color: var(--acento-tinta); }
.bv-recs li { display: grid; grid-template-columns: 44px 1fr; gap: 12px; align-items: center; padding: 8px 12px; border-radius: var(--radio-peq); background: var(--sup-2); border: var(--borde); }
.bv-recs i { display: grid; place-items: center; width: 44px; height: 44px; border-radius: var(--radio-peq); background: var(--acento-suave); font: var(--peso-titulo) 15px var(--f-titulo); font-style: normal; color: var(--acento-tinta); white-space: nowrap; overflow: hidden; }
.bv-recs span { font: 500 14px/1.45 var(--f-texto); color: var(--tinta-2); } .bv-recs b { color: var(--tinta); }
@media (max-width: 760px), (max-aspect-ratio: 4/5) {
  .bv-capa { place-items: end center; padding: 0 10px 10px; background: linear-gradient(transparent 30%, color-mix(in srgb, var(--velo) 70%, transparent)); }
  .bv-ficha { width: 100%; max-height: 66vh; padding: 20px 20px 20px; }
  .bv-opciones { grid-template-columns: 1fr 1fr; }
  .bv-respuestas { grid-template-columns: 1fr; }
  .bv-op kbd, .bv-resp kbd, .bv-botones kbd, .bv-nose kbd { display: none; }
}
@media (max-height: 700px) { .bv-ficha { padding: 20px 24px; } .bv-cuerpo { gap: 12px; } .bv-recs li { padding: 6px 10px; } .bv-cuerpo p { font-size: 14.5px; } }
/* el tour: la portada a oscuras salvo lo que se explica; la nota de Nyan al lado */
.tour-capa { position: fixed; inset: 0; z-index: 80; }
.tour-agujero { position: fixed; left: 50%; top: 50%; width: 0; height: 0; border-radius: var(--radio); box-shadow: 0 0 0 200vmax var(--velo), 0 0 0 200vmax color-mix(in srgb, var(--velo) 50%, transparent), inset 0 0 0 3px var(--acento-2); cursor: pointer; }
.tour-nota { position: fixed; left: 50%; top: 50%; width: 400px; display: grid; grid-template-columns: 96px 1fr; gap: 8px 12px; align-items: center; padding: 16px 20px 16px 12px; border-radius: var(--radio);
  background: var(--sup); border: var(--borde); box-shadow: var(--sombra-flotante); color: var(--tinta); }
.tour-nyan { width: 104px; height: 104px; margin: -16px 0 -12px -8px; object-fit: contain; }
.tour-txt { display: grid; gap: 4px; } .tour-tit { font: var(--peso-titulo) 19px var(--f-titulo); color: var(--acento-tinta); text-wrap: balance; }
.tour-txt p { margin: 0; font: 500 14.5px/1.5 var(--f-texto); color: var(--tinta-2); } .tour-txt b { color: var(--tinta); }
.tour-pie { grid-column: 1 / -1; display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
.tour-n { margin-right: auto; padding-left: 12px; font: 700 12px var(--f-texto); color: var(--tinta-2); letter-spacing: .1em; font-variant-numeric: tabular-nums; }
.tour-pie .peq { height: 42px; padding: 0 16px; font-size: 14px; }
@media (max-width: 520px) { .tour-nota { grid-template-columns: 70px 1fr; } .tour-nyan { width: 76px; height: 76px; } .tour-pie kbd { display: none; } }
@media (prefers-reduced-motion: reduce) { .bv-puntos i, .bv-chip, .bv-op, .bv-resp, .bv-input, .bv-nose { transition: none; } .bv-chip:hover, .bv-op:hover, .bv-resp:not(:disabled):hover { translate: none; } }`;
  document.head.appendChild(s);
}
