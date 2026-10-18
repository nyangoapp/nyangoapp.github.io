// La bienvenida de Nyan en el móvil (la misma que en el escritorio, hecha para el pulgar): arriba Nyan con su bocadillo
// y, abajo, una hoja con cada paso: saludo, cómo te llamo, para qué, cuánto tiempo, cuánto sabes, una prueba cortita y
// tu plan. La prueba es prudente (5 preguntas por tramo, se pasa con 4; con 4 de 5, solo hasta la mitad del tramo) y,
// si la cuenta ya tiene progreso (se repite desde los ajustes), no cambia nada de lo que sabes.
import { gsap } from 'gsap';
import { t, idioma } from '../i18n.js';
import * as son from '../sonido.js';
import { esc, negrita } from '../japones.js';
import { $, $$, api, vibrar, quieto, encajar } from './comun.js';

const MOTIVOS = [['anime', 'アニメ'], ['viajar', '旅行'], ['juegos', 'ゲーム'], ['amigos', '友達'], ['jlpt', '試験'], ['trabajo', '仕事'], ['cultura', '文化']];
const MINUTOS = [5, 10, 20, 30];
const NIVELES = ['cero', 'kana', 'basico', 'medio', 'alto'];
const TRAMO_INICIAL = { kana: 0, basico: 1, medio: 3, alto: 4 };
const CARA = { feliz: 'feliz', estrella: 'feliz-arriba', risa: 'feliz', pensando: 'pensando', sorpresa: 'sorpresa', decidido: 'normal-arriba', normal: 'normal', triste: 'triste' };
const ICO = { kana: 'あ', repaso: '稽', gramatica: '文', racha: '続', anime: 'アニメ', viajar: '旅', juegos: '遊', amigos: '友', jlpt: '試', trabajo: '仕', cultura: '文化' };
const mezclar = (l) => l.map((x) => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
const azar = (l) => l[Math.floor(Math.random() * l.length)];
const lista = (k) => String(t(k)).split('|');
const mil = (n) => n.toLocaleString(idioma === 'en' ? 'en' : 'es');

export async function entrar(v, resto, app) {
  const d = await app.inicio(true).catch(() => ({}));
  let yaTiene = (d?.cuenta?.aprendidos || 0) > 0;
  const st = { nombre: d?.perfil?.nombre || '', motivos: new Set(d?.perfil?.motivos || []), minutos: d?.perfil?.minutos || 10, nivel: null, hira: false, kata: false, hasta: 0 };
  v.innerHTML = `<div class="mv-bv"><div class="mv-bv-arriba"><img class="mv-bv-nyan" src="/img/reparto/nyan-feliz.webp" alt=""><div class="mv-boc mv-bv-boc" hidden></div></div>
    <div class="mv-hoja mv-bv-hoja"><div class="mv-bv-cab"><span class="mv-etq mv-bv-paso"></span><div class="mv-bv-puntos">${'<i></i>'.repeat(6)}</div></div><div class="mv-bv-cuerpo"></div></div></div>`;
  const nyan = $('.mv-bv-nyan', v), boc = $('.mv-bv-boc', v), cuerpo = $('.mv-bv-cuerpo', v), hoja = $('.mv-bv-hoja', v);
  let callar = 0;
  const habla = (txt, { cara = 'feliz', voz = null, ms = 4200 } = {}) => {
    nyan.src = `/img/reparto/nyan-${CARA[cara] || 'normal'}.webp`;
    if (!quieto()) gsap.fromTo(nyan, { y: 0, scaleY: 1 }, { y: -12, scaleY: 1.03, duration: 0.16, yoyo: true, repeat: 1, ease: 'power2.out', transformOrigin: '50% 100%' });
    if (txt) {
      boc.hidden = false; boc.innerHTML = txt;
      if (!quieto()) gsap.fromTo(boc, { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(2.2)', transformOrigin: '20% 100%' });
      clearTimeout(callar); if (ms) callar = setTimeout(() => { boc.hidden = true; }, ms);
    }
    if (voz) son.voz?.(voz);
  };
  const pintar = (n, html, enlazar) => {
    $('.mv-bv-paso', v).textContent = n >= 1 && n <= 5 ? t('bv.paso', { n, total: 5 }) : '';
    $$('.mv-bv-puntos i', v).forEach((p, i) => p.classList.toggle('si', i <= n));
    cuerpo.innerHTML = html; cuerpo.style.fontSize = '';
    enlazar?.();
    encajar(cuerpo, 0.72);
    if (!quieto()) gsap.fromTo([...cuerpo.children], { x: 30, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, stagger: 0.04, ease: 'back.out(1.6)' });
  };
  const toque = () => { son.toque?.(); vibrar(8); };

  // 0 · el saludo
  const saludo = () => {
    pintar(0, `<small class="mv-bv-ante">${t('bv.saludo.ante')}</small><h2 class="mv-bv-tit">${t('bv.saludo.tit')}</h2><p>${t('bv.saludo.p')}</p>
      <button class="mv-btn" data-ok>${t('bv.saludo.si')}</button>`, () => { $('[data-ok]', cuerpo).onclick = () => { toque(); nombre(); }; });
    setTimeout(() => habla(t('bv.nyan.hola'), { cara: 'estrella', voz: 'nyaa', ms: 6000 }), 400);
  };
  // 1 · cómo te llamo
  const nombre = () => {
    pintar(1, `<h2 class="mv-bv-tit">${t('bv.nombre.tit')}</h2><p>${t('bv.nombre.p')}</p>
      <input class="mv-bv-input" maxlength="30" autocomplete="off" spellcheck="false" placeholder="${t('bv.nombre.ph')}" value="${esc(st.nombre)}" enterkeyhint="next">
      <div class="mv-bv-fila"><button class="mv-btn-claro" data-sin>${t('bv.nombre.sin')}</button><button class="mv-btn" data-ok>${t('bv.seguir')}</button></div>`, () => {
      const inp = $('input', cuerpo);
      const seguir = (sin) => {
        toque(); st.nombre = sin ? '' : inp.value.trim().slice(0, 30); inp.blur();
        habla(st.nombre ? t('bv.nyan.nombre', { nombre: esc(st.nombre) }) : t('bv.nyan.sin_nombre'), { cara: 'feliz', voz: 'ya' });
        motivos();
      };
      $('[data-ok]', cuerpo).onclick = () => seguir(!inp.value.trim());
      $('[data-sin]', cuerpo).onclick = () => seguir(true);
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); seguir(!inp.value.trim()); } });
    });
    habla(t('bv.nyan.como'), { cara: 'pensando', voz: 'hm' });
  };
  // 2 · para qué
  const motivos = () => {
    pintar(2, `<h2 class="mv-bv-tit">${t('bv.motivo.tit')}</h2><p>${t('bv.motivo.p')}</p>
      <div class="mv-bv-chips">${MOTIVOS.map(([id, jp]) => `<button class="mv-bv-chip" data-m="${id}" aria-pressed="${st.motivos.has(id)}"><b lang="ja">${jp}</b>${t(`bv.motivo.${id}`)}</button>`).join('')}</div>
      <button class="mv-btn" data-ok>${t('bv.seguir')}</button>`, () => {
      $$('.mv-bv-chip', cuerpo).forEach((b) => { b.onclick = () => {
        const id = b.dataset.m, si = !st.motivos.has(id);
        if (si) st.motivos.add(id); else st.motivos.delete(id);
        b.setAttribute('aria-pressed', si); toque();
        if (si) { habla(t(`bv.nyan.motivo.${id}`), { cara: azar(['estrella', 'feliz', 'risa']), voz: azar(['ya', 'yaha', 'fun']), ms: 3600 }); if (!quieto()) gsap.fromTo(b, { scale: 0.9 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' }); }
      }; });
      $('[data-ok]', cuerpo).onclick = () => { toque(); tiempo(); };
    });
  };
  // 3 · cuánto tiempo
  const tiempo = () => {
    pintar(3, `<h2 class="mv-bv-tit">${t('bv.tiempo.tit')}</h2><p>${t('bv.tiempo.p')}</p>
      <div class="mv-bv-tiempos">${MINUTOS.map((n) => `<button class="mv-bv-op" data-min="${n}" aria-pressed="${st.minutos === n}"><b>${n === 30 ? '30+' : n}<small> min</small></b><span>${t(`bv.tiempo.${n}`)}</span></button>`).join('')}</div>`, () => {
      $$('.mv-bv-op', cuerpo).forEach((b) => { b.onclick = () => {
        st.minutos = +b.dataset.min; toque();
        $$('.mv-bv-op', cuerpo).forEach((x) => x.setAttribute('aria-pressed', x === b));
        habla(t(`bv.nyan.tiempo.${st.minutos}`), { cara: st.minutos >= 30 ? 'sorpresa' : 'feliz', voz: st.minutos >= 30 ? 'eh' : 'ya', ms: 3400 });
        setTimeout(nivel, 650);
      }; });
    });
    habla(t('bv.nyan.tiempo'), { cara: 'normal', voz: 'pi' });
  };
  // 4 · cuánto sabes
  const nivel = () => {
    pintar(4, `<h2 class="mv-bv-tit">${t('bv.nivel.tit')}</h2>
      <div class="mv-bv-niveles">${NIVELES.map((n) => `<button class="mv-bv-op ancho" data-nivel="${n}" aria-pressed="${st.nivel === n}"><b>${t(`bv.nivel.${n}`)}</b><span>${t(`bv.nivel.${n}_d`)}</span></button>`).join('')}</div>`, () => {
      $$('[data-nivel]', cuerpo).forEach((b) => { b.onclick = () => {
        st.nivel = b.dataset.nivel; toque();
        $$('[data-nivel]', cuerpo).forEach((x) => x.setAttribute('aria-pressed', x === b));
        setTimeout(() => ofertaEnlace(() => (st.nivel === 'cero' ? plan() : antesDePrueba())), 450);
      }; });
    });
    habla(t('bv.nyan.nivel'), { cara: 'pensando', voz: 'hm' });
  };
  // 4½ · ¿ya usas Nyango en el ordenador? (solo si se puede vincular y esta cuenta aún no tiene nada): una tarjeta suave, sin insistir.
  // Si se vincula y el ordenador ya tenía su perfil hecho, la bienvenida sobra: directo a la portada.
  const ofertaEnlace = async (siguiente) => {
    let en = null;
    try { en = await api('/api/enlace'); } catch { /* sin enlace */ }
    if (!en?.disponible || en.enlazado || yaTiene) return siguiente();
    const { abrir } = await import('./enlazar.js');   // también pone sus estilos
    pintar(4, `<h2 class="mv-bv-tit">${t('mv.enl.bv_tit')}</h2>
      <div class="mv-en-tarjeta"><i lang="ja" aria-hidden="true">携帯</i><p><strong>${t('mv.enl.bv_card')}</strong><small>${t('mv.enl.bv_desc')}</small></p></div>
      <button class="mv-btn" data-vincular>${t('mv.enl.bv_si')}</button>
      <button class="mv-btn-claro" data-no>${t('mv.enl.bv_no')}</button>`, () => {
      $('[data-no]', cuerpo).onclick = () => { toque(); siguiente(); };
      $('[data-vincular]', cuerpo).onclick = async () => {
        toque();
        abrir(app, { alCerrar: async ({ unido }) => {
          if (!unido) return;
          const d2 = await app.inicio(true).catch(() => null);
          if (d2?.perfil?.hecho) { location.hash = 'inicio'; return; }
          // el ordenador ya traía su progreso: no hay nivel que preguntar ni prueba que hacer, directo al plan
          if ((d2?.cuenta?.aprendidos || 0) > 0) { yaTiene = true; st.hira = st.kata = true; plan(); } else siguiente();
        } });
      };
    });
    habla(t('mv.enl.bv_nyan'), { cara: 'pensando', voz: 'hm', ms: 5000 });
  };
  // 5 · la prueba
  const antesDePrueba = () => {
    pintar(5, `<h2 class="mv-bv-tit">${t('bv.prueba.tit')}</h2><p>${t('bv.prueba.p')}</p>
      <div class="mv-bv-fila"><button class="mv-btn-claro" data-saltar>${t('bv.prueba.saltar')}</button><button class="mv-btn" data-ok>${t('bv.prueba.empezar')}</button></div>`, () => {
      $('[data-ok]', cuerpo).onclick = () => { toque(); prueba(); };
      $('[data-saltar]', cuerpo).onclick = () => { // sin prueba: lo que dice que sabe, con prudencia
        toque(); st.hira = st.nivel !== 'cero'; st.kata = ['basico', 'medio', 'alto'].includes(st.nivel);
        st.hasta = { kana: 0, basico: 150, medio: 400, alto: 800 }[st.nivel] || 0; plan();
      };
    });
    habla(t('bv.nyan.prueba'), { cara: 'decidido', voz: 'ura' });
  };
  const prueba = async () => {
    son.abrir?.();
    let tramos = [];
    try { tramos = await api(`/api/nivel/prueba?lang=${idioma}`); } catch { /* sin palabras: solo los kana */ }
    const K = await fetch('/kana/kana.json').then((r) => r.json()).catch(() => null);
    const basicos = (e) => (K ? K.tablas[e][0].filas.flat().filter(Boolean) : []);
    let n = 0;
    const preguntar = (q) => new Promise((resolver) => {
      n++;
      const ops = mezclar(q.opciones.map((texto, i) => ({ texto, ok: i === 0 })));
      pintar(5, `<small class="mv-bv-ante">${t('bv.prueba.n', { n })} · ${q.titulo}</small><div class="mv-bv-grande${q.kana ? ' kana' : ''}" lang="ja">${esc(q.grande)}</div>
        <div class="mv-bv-resps">${ops.map((o, i) => `<button class="mv-btn-claro mv-bv-resp" data-i="${i}">${esc(o.texto)}</button>`).join('')}</div>
        <button class="mv-bv-nose" data-nose>？ ${t('bv.prueba.no_se')}</button>`, () => {
        const elegir = (i) => {
          const ok = i >= 0 && ops[i].ok;
          $$('.mv-bv-resp', cuerpo).forEach((b, j) => { b.disabled = true; if (ops[j].ok) b.classList.add('bien'); else if (j === i) b.classList.add('mal'); });
          $('[data-nose]', cuerpo).disabled = true;
          if (ok) { son.acierto(1); vibrar(10); if (Math.random() < 0.45) habla(azar(lista('bv.nyan.bien')), { cara: azar(['feliz', 'estrella', 'risa']), voz: 'ya', ms: 1800 }); else habla('', { cara: 'feliz' }); }
          else { son.fallo(); vibrar([14, 40, 14]); if (Math.random() < 0.45) habla(azar(lista('bv.nyan.mal')), { cara: azar(['pensando', 'sorpresa']), voz: 'hm', ms: 1800 }); else habla('', { cara: 'pensando' }); }
          setTimeout(() => resolver(ok), ok ? 650 : 1100);
        };
        $$('.mv-bv-resp', cuerpo).forEach((b) => { b.onclick = () => elegir(+b.dataset.i); });
        $('[data-nose]', cuerpo).onclick = () => elegir(-1);
      });
    });
    const rondaKana = async (e) => {
      let bien = 0;
      for (const k of mezclar(basicos(e)).slice(0, 3)) {
        const r = K.kana[k].r, otras = mezclar(basicos(e).filter((x) => K.kana[x].r !== r)).slice(0, 3).map((x) => K.kana[x].r);
        if (await preguntar({ titulo: t('bv.prueba.kana'), grande: k, kana: true, opciones: [r, ...otras] })) bien++;
      }
      return bien >= 2;
    };
    if (K) { st.hira = await rondaKana('hiragana'); st.kata = await rondaKana('katakana'); }
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
  // 6 · tu plan
  const plan = async () => {
    son.fanfarria?.();
    const K = await fetch('/kana/kana.json').then((r) => r.json()).catch(() => null);
    const kanaSabidos = !K ? [] : [...(st.hira ? K.tablas.hiragana : []), ...(st.kata ? K.tablas.katakana : [])].flatMap((g) => g.filas.flat()).filter(Boolean);
    let colocado = null;
    try { if (!yaTiene && (st.hasta || kanaSabidos.length)) colocado = await api('/api/nivel', { hasta: st.hasta, kana: kanaSabidos }); } catch { /* sin colocar */ }
    try { await api('/api/perfil', { nombre: st.nombre, motivos: [...st.motivos], minutos: st.minutos, ...(yaTiene ? {} : { nivel: st.nivel || 'cero', hasta: st.hasta }), hecho: true }); } catch { /* sin guardar */ }
    const d2 = await app.inicio(true).catch(() => null);
    const recs = [];
    if (!st.hira) recs.push(['kana', t('bv.rec.kana')]);
    else if (!st.kata) recs.push(['kana', t('bv.rec.katakana')]);
    recs.push(['repaso', t(`bv.rec.rutina.${st.minutos}`)]);
    const g = d2?.gramatica;
    recs.push(['gramatica', st.hasta >= 400 ? t('bv.rec.clase_salta') : g && st.hira ? t('bv.rec.clase', { clase: esc(g.titulo.replace(/\[[^\]]*\]/g, '')) }) : t('bv.rec.clase_primera')]);
    for (const id of [...st.motivos].slice(0, 2)) recs.push([id, t(`bv.rec.motivo.${id}`)]);
    recs.push(['racha', t('bv.rec.repaso')]);
    recs.splice(4);
    const reg = colocado?.region || d2?.region;
    const todo = st.hasta && st.hasta >= (d2?.total_palabras || 3000);
    const tit = yaTiene ? t('bv.plan.tit_ya') : !st.hira ? t('bv.plan.tit_cero') : st.hasta ? t('bv.plan.tit_n', { n: mil(st.hasta) }) : t('bv.plan.tit_kana');
    const p = yaTiene ? t('bv.plan.p_ya') : !st.hira ? t('bv.plan.p_cero') : todo ? t('bv.plan.p_todo') : st.hasta ? t('bv.plan.p_n', { region: reg ? `${reg.i + 1} · ${esc(reg.nombre)}` : '', n: mil(st.hasta + 1) }) : t('bv.plan.p_kana');
    pintar(6, `<small class="mv-bv-ante">${st.nombre ? t('bv.plan.ante', { nombre: esc(st.nombre) }) : t('bv.plan.ante_tuyo')}</small><h2 class="mv-bv-tit">${tit}</h2><p>${p}</p>
      ${yaTiene ? `<p class="mv-bv-nota">${t('bv.plan.ya_tienes')}</p>` : ''}
      <ul class="mv-bv-recs">${recs.map(([id, txt]) => `<li><i lang="ja">${ICO[id] || '・'}</i><span>${negrita(txt)}</span></li>`).join('')}</ul>
      <button class="mv-btn" data-ok>${t('mv.bv.vamos')}</button>`, () => {
      $('[data-ok]', cuerpo).onclick = () => { toque(); location.hash = !st.hira && !yaTiene ? 'kana' : 'inicio'; };
      if (!quieto()) gsap.fromTo($$('.mv-bv-recs li', cuerpo), { x: 24, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, stagger: 0.08, delay: 0.2, ease: 'back.out(1.8)' });
    });
    habla(t('bv.nyan.plan', { nombre: esc(st.nombre || t('bv.profe')) }), { cara: 'estrella', voz: 'yaha', ms: 6000 });
  };
  if (!quieto()) gsap.fromTo(hoja, { y: 80 }, { y: 0, duration: 0.55, ease: 'back.out(1.3)' });
  saludo();
}
