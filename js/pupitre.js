// El pupitre de Nyan: lo que pasa alrededor de la tarjeta mientras estudias (29-09). Nada de esto añade pasos ni espera:
// todo va encima de lo de siempre y se puede seguir escribiendo mientras se anima.
// · Nyan en el pupitre (el Mochi pequeño de la esquina): al acertar una palabra que él no sabía, la apunta en su libreta
//   (y la aprende de verdad: el servidor la guarda en nyan_sabe); al fallar, a veces se equivoca contigo.
// · Nyan se adelanta: de vez en cuando, en una tarjeta que ya dominas, suelta una respuesta mala antes que tú. Si la
//   aciertas, le has ganado.
// · La memoria a la vista: la tarjeta es de papel, madera, laca, bronce u oro según su rango, y se transforma al subir;
//   las que fallaste hace poco llegan rotas (cinta y grieta) y se arreglan al acertarlas.
// · Combo: a los 3, 5, 10, 15, 20 y 30 seguidas, taiko y Nyan baila.
// · Karaoke: la frase de ejemplo se ilumina al ritmo de su audio.
// · El diario de Nyan (絵日記) al terminar.
// · Trazar un kanji con el ratón (práctica libre: no cuenta para la repetición espaciada).
import { gsap } from 'gsap';
import { idioma, kbd, t } from './i18n.js';
import { esc } from './japones.js';
import * as son from './sonido.js';
import { flotar, quieto, chispas, api } from './app.js';
import { CARITA_NYAN } from './iconos.js';
import { capa } from './teclado.js';

const FRASES = {
  es: {
    apunta: ['¡Apuntado! {w}', '{w}… ¡a mi libreta!', 'Vale, {w}. Esta ya me la sé.', '{w}. Anotado con mi mejor letra.'],
    fallo: ['¡Uy! Yo iba a decir lo mismo.', 'Tranquilo, yo tampoco me acordaba.', '¡Ya somos dos!', 'Esa se nos resiste a los dos.'],
    adelanta: ['¡Yo sé, yo sé! ¿{mal}?', '¡Esta me la sé! Es {mal}.', 'Uy, fácil: {mal}. ¿A que sí?'],
    ganaste: '¡Le has ganado a Nyan!', gana: ['Hmm… vale, era eso.', '¡Qué rápido! Yo iba a decir eso. Casi.', 'Me has pillado.'],
    empate: ['¡Empate! Ninguno de los dos.', 'Bueno… tampoco era lo mío.'],
    combo: { 3: '¡Tres seguidas!', 5: '¡Cinco! ¡Esto va!', 10: '¡Diez! ¡Imparable!', 15: '¡Quince! ¡Estoy bailando!', 20: '¡Veinte! ¡Doble de XP!', 30: '¡TREINTA! ¡Leyenda!' },
    comboN: '¡{n} seguidas!', arreglada: '¡Arreglada!', libreta: 'Libreta de Nyan', sabe: 'palabras que sabe', grado: '¡Nya! ¡Ya me has enseñado {n} palabras!',
    leccion: { inicio: ['Palabras nuevas… Yo miro desde aquí.', '¡Apréndelas tú primero y luego me las enseñas!', 'Tú lees, yo hago como que entiendo.'],
      lamina: ['¿{w}? Nunca lo había oído.', '{w}… ¿eso se come?', 'Apunto la duda: {w}.', '{w}. Suena importante. Muy importante.'],
      fin: ['¡En el repaso me las enseñas!', 'Yo no me he enterado de nada. ¡Me lo explicas en el repaso!', '¡Qué lista de cosas! Luego me las enseñas, ¿vale?'] },
    diario: {
      tit: 'El diario de Nyan', hoy: 'Hoy',
      abre: ['Hoy mi profe ha acertado un {pct}%. Yo he mirado muy fuerte, que también ayuda.', 'Hoy hemos repasado {n} tarjetas. Bueno, las ha repasado mi profe. Yo animaba.',
        'Hoy hemos estudiado {n} tarjetas juntos. Yo desde el cojín, que se ve mejor.'],
      bien: ['He aprendido que {w} es «{s}». Creo que se puede comer.', '{w} significa «{s}». Me lo pienso tatuar. En la oreja.', 'Ya sé decir {w} («{s}»). Se lo diré al onigiri.'],
      mal: ['{w} nos costó a los dos. Mañana le ganamos.', '{w} («{s}») se nos escapó. Le he puesto una tirita.', 'Con {w} me he liado. Mi profe también. Somos un equipo.'],
      combo: ['¡Hicimos {n} seguidas! Bailé tanto que me mareé.', '{n} seguidas. He tenido que tumbarme de la emoción.'],
      libreta: ['He apuntado {n} palabras nuevas en mi libreta. Con buena letra casi todas.', 'Mi libreta tiene {n} palabras más. Pesa un montón.', '{n} palabras a la libreta. Una la tuve que tachar, pero no se lo digas a nadie.'],
      libreta1: ['Hoy he apuntado una palabra en mi libreta: {w}. La he repasado tres veces.'],
      cierra: ['Mañana más. O siesta. Ya veremos.', 'Buenas noches, profe.', 'Hoy he aprendido mucho. Sobre todo a mirar.'],
    },
    trazo: { tit: 'Traza el kanji', pista: 'Dibuja encima del kanji con el ratón (o con el dedo).', borrar: 'Borrar', comprobar: 'Comprobar', cerrar: 'Cerrar',
      orden: 'Números', ordenPista: 'Sigue los números: el 1 va primero.',
      nota: ['¡Casi! Repásalo otra vez.', '¡Bien! Se parece mucho.', '¡Perfecto! Ni un pincel lo haría mejor.'], nyan: ['Yo lo haría peor.', '¡Qué bonito!', '¡Lo voy a colgar en la sala!'],
      practica: 'Práctica libre: no cuenta para tus repasos.' },
  },
  en: {
    apunta: ['Noted! {w}', '{w}… into my notebook!', 'Okay, {w}. Got this one now.', '{w}. Written in my best handwriting.'],
    fallo: ['Oops! I was going to say the same.', "Don't worry, I didn't remember either.", 'That makes two of us!', 'That one beats both of us.'],
    adelanta: ['I know, I know! {mal}?', 'I know this one! It\'s {mal}.', 'Easy: {mal}. Right?'],
    ganaste: 'You beat Nyan!', gana: ['Hmm… okay, it was that.', 'So fast! I was about to say that. Almost.', 'You got me.'],
    empate: ["It's a tie! Neither of us.", 'Well… not my thing either.'],
    combo: { 3: 'Three in a row!', 5: 'Five! Here we go!', 10: 'Ten! Unstoppable!', 15: "Fifteen! I'm dancing!", 20: 'Twenty! Double XP!', 30: 'THIRTY! Legend!' },
    comboN: '{n} in a row!', arreglada: 'Fixed!', libreta: "Nyan's notebook", sabe: 'words he knows', grado: 'Nya! You\'ve taught me {n} words!',
    leccion: { inicio: ['New words… I\'ll watch from here.', 'Learn them first, then teach me!', 'You read, I pretend to understand.'],
      lamina: ['{w}? Never heard of it.', '{w}… can you eat it?', 'Noting my question: {w}.', '{w}. Sounds important. Very important.'],
      fin: ['Teach me these in the review!', 'I didn\'t get any of it. Explain it to me in the review!', 'So many things! Teach me later, okay?'] },
    diario: {
      tit: "Nyan's diary", hoy: 'Today',
      abre: ['Today my teacher got {pct}% right. I watched really hard, which also helps.', 'Today we reviewed {n} cards. Well, my teacher did. I cheered.',
        'Today we studied {n} cards together. Me from the cushion, the view is better.'],
      bien: ['I learned that {w} means "{s}". I think you can eat it.', '{w} means "{s}". I might get it tattooed. On my ear.', 'I can say {w} ("{s}") now. I\'ll tell the onigiri.'],
      mal: ['{w} was hard for both of us. Tomorrow we win.', '{w} ("{s}") got away. I put a band-aid on it.', 'I got mixed up with {w}. So did my teacher. We\'re a team.'],
      combo: ['We got {n} in a row! I danced so much I got dizzy.', '{n} in a row. I had to lie down from excitement.'],
      libreta: ['I wrote {n} new words in my notebook. Nice handwriting, mostly.', 'My notebook has {n} more words. It weighs a ton now.', '{n} words in the notebook. I had to cross one out, but don\'t tell anyone.'],
      libreta1: ['Today I wrote one word in my notebook: {w}. I went over it three times.'],
      cierra: ['More tomorrow. Or a nap. We\'ll see.', 'Good night, teacher.', 'I learned a lot today. Mostly how to watch.'],
    },
    trazo: { tit: 'Trace the kanji', pista: 'Draw over the kanji with the mouse (or your finger).', borrar: 'Clear', comprobar: 'Check', cerrar: 'Close',
      orden: 'Numbers', ordenPista: 'Follow the numbers: 1 goes first.',
      nota: ['Almost! Go over it again.', 'Nice! Very close.', 'Perfect! Not even a brush would do better.'], nyan: ["I'd do it worse.", 'So pretty!', "I'm hanging it in the room!"],
      practica: "Free practice: it doesn't count for your reviews." },
  },
};
const F = FRASES[idioma] || FRASES.es;
const azar = (l) => l[Math.floor(Math.random() * l.length)];
const rellenar = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
const jp = (x) => `<span class="jp" lang="ja">${esc(x)}</span>`;

// ── Nyan en el pupitre ──
const P = { mini: null, ultima: 0, adelanto: null };
export function prepararPupitre(mini) { P.mini = mini; mini.ponerPupitre?.(true); }
// para probar a mano: ?nyan en la URL deja window.pupitre (el Mini y apuntar)
if (/[?&]nyan\b/.test(location.search)) window.pupitre = { P, apuntar: (it, r) => apuntarEnLibreta(it, r || {}), alResponder, trazar: (ch) => trazarKanji(ch) };
// el mini habla poco: como mucho una nube cada 3,5 s (salvo lo importante)
function decir(html, { cara = null, ms = 2600, fuerza = false } = {}) {
  const m = P.mini; if (!m?.decir) return;
  const t = performance.now(); if (!fuerza && t - P.ultima < 3500) return;
  P.ultima = t; m.decir(html, { ms }); son.burbuja();
  if (cara) m.expresion(cara, Math.min(ms, 2200));
}
const palabraDe = (it) => (it.tipo === 'vocab' ? it.palabra : it.caracter || it.elemento || '');
const HITOS = [3, 5, 10, 15, 20, 30];
// el grado de Nyan: sube con las palabras de su libreta, las que le enseñas al acertarlas en un repaso o al corregirle
// (el nombre, en perfil.inv.grado.N; lo que él dice al subir, en perfil.inv.grado_dice.N)
export const GRADOS = [0, 10, 30, 75, 150, 300, 600, 1000];
export const gradoDe = (n) => GRADOS.reduce((g, umbral, i) => (n >= umbral ? i : g), 0);

/** Tras responder. ok, r (lo que devuelve /api/responder), it, racha (aciertos seguidos ya contando este). */
export function alResponder({ ok, r, it, racha }) {
  const m = P.mini, aprende = ok && r?.nyan_aprende;
  const adel = P.adelanto; P.adelanto = null;
  if (adel?.dicho) {
    // Nyan se había adelantado con una respuesta mala
    if (ok) {
      const c = document.querySelector('.carta-rep')?.getBoundingClientRect();
      if (c) flotar(F.ganaste, c.left + c.width / 2, c.top + 10, 'var(--linea)');
      decir(esc(azar(F.gana)), { cara: Math.random() < 0.5 ? 'verguenza' : 'bobo', fuerza: true });
    } else decir(esc(azar(F.empate)), { cara: 'bobo', fuerza: true });
    if (aprende) apuntarEnLibreta(it, r, { ya: true });
    return;
  }
  // combo: taiko y Nyan baila (lo que aprendió lo apunta de golpe, que está bailando)
  if (ok && (HITOS.includes(racha) || (racha > 30 && racha % 10 === 0))) {
    son.taiko(); son.taiko(0.18);
    if (aprende) apuntarEnLibreta(it, r, { ya: true });
    if (m && !quieto()) { m.idle = { tipo: 'bailar', t: 0, dir: 1 }; m.lanzarManpu?.('nota', [0.8, 0.6, 0.3], { vida: 1.4 }); }
    decir(esc(F.combo[racha] || rellenar(F.comboN, { n: racha })), { cara: 'risa', ms: 2200, fuerza: true });
    return;
  }
  // sube de grado: sello, fanfarria y lo celebra (la palabra la apunta igual, de golpe)
  if (aprende && r.nyan_sabe != null && gradoDe(r.nyan_sabe) > gradoDe(r.nyan_sabe - 1)) {
    apuntarEnLibreta(it, r, { ya: true });
    const g = gradoDe(r.nyan_sabe);
    son.subida?.(Math.min(4, g)); m?.celebrar?.();
    // Nyan lo cuenta él: cuántas le has enseñado (todas las de su libreta, no solo esta) y qué sabe hacer ahora
    decir(`<b class="nd-grado">${'一二三四五六七八'[g]}</b> <b>${esc(rellenar(F.grado, { n: r.nyan_sabe }))}</b><br>${esc(t(`perfil.inv.grado_dice.${g}`))}`, { ms: 5600, fuerza: true });
    const c = document.querySelector('.libreta-nyan'); if (c && !quieto()) { chispas(c, { n: 18 }); gsap.fromTo(c, { scale: 1.12 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)' }); }
    return;
  }
  // lo que él no sabía, lo apunta en su libreta (se ve escribirlo en el pupitre y en la libreta de encima)
  if (aprende) { apuntarEnLibreta(it, r); if (Math.random() < 0.3) decir(rellenar(azar(F.apunta), { w: jp(palabraDe(it)) })); }
  else if (!ok && Math.random() < 0.35) decir(esc(azar(F.fallo)), { cara: Math.random() < 0.5 ? 'panico' : 'bobo' });
}

// ── la libreta de Nyan ──
// Encima del Mochi pequeño: lo que ha apuntado en esta sesión y cuántas palabras sabe ya. Se escribe al mismo ritmo que
// la libreta del pupitre 3D (0,75 s y luego una letra cada 0,32 s) con el ruidito del pincel, y se pliega sola.
const L = { el: null, plegar: 0, actual: null, apuntadas: [] };
const TACHABLES = 'あいうかさたなねのめ';
function libreta() {
  if (L.el?.isConnected) return L.el;
  const el = (L.el = document.createElement('aside'));
  el.className = 'libreta-nyan plegada'; el.setAttribute('aria-label', F.libreta);
  el.innerHTML = `<div class="ln-cab">${CARITA_NYAN}<b>${esc(F.libreta)}</b><em class="ln-n" title="${esc(F.sabe)}"></em></div><ol class="ln-lista"></ol><span class="ln-voz" aria-live="polite"></span>`;
  const marco = document.querySelector('#marco'), shoji = document.querySelector('#shoji');
  if (marco && shoji?.parentNode === marco) marco.insertBefore(el, shoji); else document.body.appendChild(el);
  el.addEventListener('pointerenter', () => desplegar());
  el.addEventListener('pointerleave', () => plegarLuego(3500));
  return el;
}
function desplegar() { clearTimeout(L.plegar); L.el?.classList.remove('plegada'); }
function plegarLuego(ms = 5000) { clearTimeout(L.plegar); L.plegar = setTimeout(() => L.el?.classList.add('plegada'), ms); }
const ponerSabe = (n) => { const e = L.el?.querySelector('.ln-n'); if (e && n != null) e.textContent = Number(n).toLocaleString(idioma === 'en' ? 'en' : 'es'); };
/** La libreta aparece (plegada) con el Mochi pequeño y se va con él. sabe: cuántas palabras sabe ya. */
export function verLibreta(si, sabe = null) {
  if (!si) { clearTimeout(L.plegar); for (const t of L.actual?.timers || []) clearTimeout(t); L.actual = null; L.el?.remove(); L.el = null; L.apuntadas = []; return; }
  const el = libreta(); ponerSabe(sabe);
  if (!quieto() && !el.dataset.vista) { el.dataset.vista = '1'; gsap.fromTo(el, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'back.out(2)', clearProps: 'transform,opacity' }); }
}
// la anterior, si aún se estaba escribiendo, se termina de golpe
function cerrarActual() {
  const a = L.actual; if (!a) return;
  for (const t of a.timers) clearTimeout(t);
  if (a.jp.isConnected) a.jp.textContent = a.w;
  L.actual = null;
}
function apuntarEnLibreta(it, r, { ya = false } = {}) {
  const w = palabraDe(it); if (!w) return;
  cerrarActual(); L.apuntadas.push(w);
  const m = P.mini, tacha = !ya && Math.random() < 0.22 ? TACHABLES[Math.floor(Math.random() * TACHABLES.length)] : null;
  const escribe = !ya && !quieto() && !!m?.apuntar?.(w, { tacha });
  if (!escribe) m?.apuntar?.(w, { ya: true });
  const el = libreta(); desplegar(); ponerSabe(r?.nyan_sabe);
  // para los lectores de pantalla, la palabra entera de una vez (no letra a letra)
  const voz = el.querySelector('.ln-voz'); if (voz) voz.textContent = `${F.libreta}: ${w}, ${sig(it)}`;
  const lista = el.querySelector('.ln-lista'), li = document.createElement('li');
  li.innerHTML = `<span class="ln-jp" lang="ja"></span><small>${esc(sig(it))}</small>`;
  lista.appendChild(li);
  while (lista.children.length > 4) lista.firstElementChild.remove();
  if (!quieto()) gsap.fromTo(li, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: 0.3, ease: 'power2.out', clearProps: 'height,opacity' });
  const jpEl = li.firstElementChild;
  if (!escribe) { jpEl.textContent = w; son.pincel(); plegarLuego(); return; }
  const cola = (tacha ? [{ l: tacha, tacha: true }] : []).concat([...w].slice(0, 10).map((l) => ({ l })));
  const a = (L.actual = { jp: jpEl, w, timers: [] });
  cola.forEach((e, i) => a.timers.push(setTimeout(() => {
    if (!jpEl.isConnected) return;
    const s = document.createElement(e.tacha ? 's' : 'span'); s.className = 'ln-l'; s.textContent = e.l; jpEl.appendChild(s); son.pincel();
    if (e.tacha) a.timers.push(setTimeout(() => s.classList.add('fuera'), 240), setTimeout(() => s.remove(), 520));
    if (i === cola.length - 1) { L.actual = null; li.classList.add('hecha'); }
  }, 750 + i * 320)));
  plegarLuego(750 + cola.length * 320 + 5000);
}

/** En las lecciones Nyan no aprende (eso es en el repaso, cuando se lo enseñas): mira, pregunta y garabatea sus dudas. */
export function nyanLeccion(momento, it = null) {
  const L = F.leccion, m = P.mini; if (!m) return;
  if (momento === 'inicio') decir(esc(azar(L.inicio)), { cara: 'feliz', ms: 3000, fuerza: true });
  else if (momento === 'fin') decir(esc(azar(L.fin)), { cara: 'doya', ms: 3400, fuerza: true });
  else if (it && palabraDe(it)) {
    decir(rellenar(azar(L.lamina), { w: jp(palabraDe(it)) }), { cara: Math.random() < 0.5 ? 'pensando' : 'bobo', ms: 2800 });
    if (m.pupitre && !quieto() && Math.random() < 0.5) setTimeout(() => { if (!m.idle && !m.gesto) m.idle = { tipo: 'garabato', t: 0, dir: 1 }; }, 2400);
  }
}

/** Nyan se adelanta: de vez en cuando, en tarjetas de significado que ya dominas. malas: significados equivocados posibles. */
export function quizaAdelantarse({ it, hab, rango, escucha, malas = [] }) {
  P.adelanto = null;
  if (!P.mini || escucha || hab !== 'sig' || rango < 2 || !malas.length || !['vocab', 'kanji'].includes(it.tipo) || Math.random() > 1 / 7) return;
  const a = (P.adelanto = { dicho: false });
  setTimeout(() => {
    if (P.adelanto !== a) return; // ya respondiste
    a.dicho = true;
    decir(rellenar(azar(F.adelanta), { mal: `<b class="nd-mal">«${esc(azar(malas))}»</b>` }), { cara: 'doya', ms: 3200, fuerza: true });
  }, 900);
}
/** al responder antes de que hable, se cancela */
export function yaRespondido() { if (P.adelanto && !P.adelanto.dicho) P.adelanto = null; }

// ── la memoria a la vista ──
export const materialDe = (r) => (r != null && r >= 0 ? ` mat-${Math.min(4, r)}` : '');
export const htmlRota = () => '<i class="rota-cinta a" aria-hidden="true"></i><i class="rota-cinta b" aria-hidden="true"></i><svg class="rota-grieta" viewBox="0 0 100 60" aria-hidden="true"><path d="M0 8 18 20 12 30 30 38 26 50 44 60"/></svg>';
// sube de rango: destello y la tarjeta cambia de material a mitad del giro
export function subirMaterial(el, r) {
  if (!el) return;
  const poner = () => { el.className = el.className.replace(/\bmat-\d\b/, '').trim() + materialDe(r); };
  if (quieto()) { poner(); return; }
  setTimeout(() => { poner(); chispas(el, { n: 22, colores: ['var(--aviso)', 'var(--sup)', 'var(--acento)', 'var(--t-gram)'] }); gsap.fromTo(el, { '--destello': 1 }, { '--destello': 0, duration: 0.9, ease: 'power2.out' }); }, 420);
}
// una rota acertada: la cinta sale volando y la grieta se borra
export function arreglar(el) {
  if (!el?.classList.contains('rota')) return;
  const c = el.getBoundingClientRect();
  flotar(F.arreglada, c.left + c.width - 90, c.top + 20, 'var(--linea)');
  son.papel();
  if (quieto()) { el.classList.remove('rota'); return; }
  const cintas = el.querySelectorAll('.rota-cinta'), grieta = el.querySelector('.rota-grieta');
  gsap.to(cintas, { y: -60, x: (i) => (i ? 50 : -40), rotate: (i) => (i ? 40 : -50), opacity: 0, duration: 0.6, stagger: 0.08, ease: 'power2.in' });
  if (grieta) gsap.to(grieta, { opacity: 0, scale: 0.7, duration: 0.5, delay: 0.2, onComplete: () => el.classList.remove('rota') });
}

// ── karaoke de la frase de ejemplo ──
function partir(el) {
  for (const n of [...el.childNodes]) {
    if (n.nodeType === 3) {
      const frag = document.createDocumentFragment();
      for (const ch of n.textContent) { if (/\s/.test(ch)) { frag.append(ch); continue; } const s = document.createElement('span'); s.className = 'k'; s.textContent = ch; frag.append(s); }
      n.replaceWith(frag);
    } else if (n.nodeType === 1) { if (n.tagName === 'RUBY') n.classList.add('k'); else if (n.tagName !== 'RT') partir(n); }
  }
}
export function karaoke(el, aud) {
  if (!el || !aud) return;
  if (!el.dataset.k) { partir(el); el.dataset.k = '1'; }
  const us = [...el.querySelectorAll('.k')]; if (!us.length) return;
  el.classList.add('karaoke'); us.forEach((u) => u.classList.remove('on'));
  const arrancar = () => {
    const d = (Number.isFinite(aud.duration) && aud.duration > 0 ? aud.duration : 2.5) * 0.88;
    us.forEach((u, i) => setTimeout(() => u.classList.add('on'), 120 + (i / us.length) * d * 1000));
    setTimeout(() => el.classList.remove('karaoke'), 400 + d * 1000);
  };
  if (aud.readyState >= 1) arrancar(); else aud.addEventListener('loadedmetadata', arrancar, { once: true });
}

// ── el diario de Nyan (絵日記) ──
const sig = (it) => it?.es || it?.clave || it?.nombre || it?.en || '';
/** Las líneas de la página de hoy, en texto (se guardan) y en HTML (con las palabras destacadas). */
export function lineasDiario(st) {
  const D = F.diario, pct = st.hechas ? Math.round((100 * st.bien) / st.hechas) : 0, out = [];
  const bienes = (st.bienIt || []).filter((x) => palabraDe(x) && sig(x)), males = (st.malIt || []).filter((x) => palabraDe(x) && sig(x));
  out.push(rellenar(pct >= 90 ? D.abre[0] : azar(D.abre.slice(1)), { pct, n: st.hechas }));
  if (bienes.length) { const w = azar(bienes); out.push(rellenar(azar(D.bien), { w: palabraDe(w), s: sig(w) })); }
  if (males.length) { const w = azar(males); out.push(rellenar(azar(D.mal), { w: palabraDe(w), s: sig(w) })); }
  if (st.mejor >= 10) out.push(rellenar(azar(D.combo), { n: st.mejor }));
  // lo que apuntó en su libreta durante la sesión
  const ap = L.apuntadas;
  if (ap.length === 1) out.push(rellenar(azar(D.libreta1), { w: ap[0] })); else if (ap.length > 1) out.push(rellenar(azar(D.libreta), { n: ap.length }));
  out.push(azar(D.cierra));
  return out;
}
const destacar = (linea) => esc(linea).replace(/([぀-ヿ㐀-鿿々〆ー]+)/g, '<b lang="ja">$1</b>');
export function htmlDiario(lineas, fecha = new Date()) {
  const f = fecha.toLocaleDateString(idioma === 'en' ? 'en-GB' : 'es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  return `<div class="diario"><div class="diario-cab"><span class="diario-tit">${F.diario.tit}</span><span class="diario-fecha">${esc(f)}</span></div>
    <div class="diario-dibujo">${CARITA_NYAN}</div>
    <div class="diario-lineas">${lineas.map((l) => `<p>${destacar(l)}</p>`).join('')}</div></div>`;
}
// se escribe línea a línea, como a lápiz
export function animarDiario(cont) {
  const ps = [...cont.querySelectorAll('.diario-lineas p')];
  if (quieto()) return;
  gsap.fromTo(cont.querySelector('.diario'), { y: 30, rotate: 3, opacity: 0 }, { y: 0, rotate: -1.2, opacity: 1, duration: 0.7, ease: 'back.out(1.6)' });
  gsap.fromTo(cont.querySelector('.diario-dibujo'), { scale: 0, rotate: -30 }, { scale: 1, rotate: 8, duration: 0.6, delay: 0.5, ease: 'back.out(2.6)' });
  ps.forEach((p, i) => {
    gsap.fromTo(p, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.9, delay: 0.7 + i * 0.75, ease: 'none', onStart: () => son.papel() });
  });
}
export function guardarDiario(lineas) { api('/api/nyan/diario', { lineas }).catch(() => {}); }

// ── trazar un kanji (práctica libre) ──
// El orden de los trazos sale de la fuente KanjiStrokeOrders (Ulrich Apel, licencia estilo BSD), que trae el mazo Kaishi:
// se lee de los medios del Anki del usuario (/media, como el audio), nunca se redistribuye. Dibuja el kanji con el
// número de cada trazo junto a donde empieza. Si no está, el trazado va sin números, como antes.
const ORDEN = '"KanjiStrokeOrders"';
// el lienzo no entiende var(): la tinta y la letra de práctica se leen de los tokens del tema (--tinta, --f-kaisho) al abrir la hoja
const token = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const KAISHO = () => token('--f-kaisho') || '"Klee One", serif';
const tinta = (a = 1) => { const n = parseInt(token('--tinta').slice(1), 16) || 0; return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`; };
let ordenListo = null;
const hayOrden = (ch) => (ordenListo ??= document.fonts.load(`100px ${ORDEN}`, ch).then((l) => l.length > 0).catch(() => false));
/** true si está la fuente del orden de los trazos (la ficha del kanji la usa para enseñar los números) */
export const ordenDisponible = (ch) => hayOrden(ch);
// el kanji centrado por su tinta (no por la caja de la fuente: cada fuente la pone en un sitio) y a 250 px de lado
function pintarKanji(q, ch, familia, { color = 'black', grueso = 0 } = {}) {   // el color por defecto solo mide (la plantilla no se ve)
  q.textAlign = 'left'; q.textBaseline = 'alphabetic'; q.font = `400 100px ${familia}`;
  let m = q.measureText(ch); const lado = Math.max(1, m.actualBoundingBoxRight + m.actualBoundingBoxLeft, m.actualBoundingBoxAscent + m.actualBoundingBoxDescent);
  q.font = `400 ${Math.round((100 * 250) / lado)}px ${familia}`; m = q.measureText(ch);
  const x = 160 - (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2, y = 160 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
  q.fillStyle = q.strokeStyle = color;
  if (grueso) { q.lineWidth = grueso; q.lineJoin = 'round'; q.strokeText(ch, x, y); }
  q.fillText(ch, x, y);
}
export function trazarKanji(ch) {
  const T = F.trazo, capaEl = document.createElement('div');
  capaEl.className = 'tz-capa'; capaEl.setAttribute('role', 'dialog'); capaEl.setAttribute('aria-modal', 'true'); capaEl.setAttribute('aria-label', T.tit);
  capaEl.innerHTML = `<div class="tz-hoja"><div class="tz-cab"><b>${T.tit}</b><small>${T.pista}</small></div>
    <div class="tz-lienzo"><canvas class="tz-fondo" width="320" height="320" aria-hidden="true"></canvas><canvas class="tz-tinta" width="320" height="320"></canvas></div>
    <div class="tz-nota" aria-live="polite">${T.practica}</div>
    <div class="tz-acciones"><button class="boton-claro tz-orden" data-a="orden" aria-pressed="true" hidden>① ${T.orden} ${kbd('O')}</button><button class="boton-claro" data-a="borrar">${T.borrar}</button><button class="boton-tinta" data-a="comprobar">${T.comprobar} ${kbd('Intro')}</button><button class="volver" data-a="cerrar">${T.cerrar} ${kbd('Esc')}</button></div></div>`;
  document.body.appendChild(capaEl);
  const cv = capaEl.querySelector('.tz-tinta'), g = cv.getContext('2d'), nota = capaEl.querySelector('.tz-nota');
  const fondo = capaEl.querySelector('.tz-fondo').getContext('2d'), botonOrden = capaEl.querySelector('[data-a="orden"]');
  let conOrden = false;
  const guia = () => (conOrden ? ORDEN : KAISHO());
  const pintarGuia = () => { fondo.clearRect(0, 0, 320, 320); pintarKanji(fondo, ch, guia(), { color: tinta(conOrden ? 0.34 : 0.14) }); };
  document.fonts.load(`100px ${KAISHO()}`, ch).catch(() => {}).then(pintarGuia);
  // con la fuente del orden, los números salen desde el principio
  hayOrden(ch).then((si) => { if (!si || !capaEl.isConnected) return; botonOrden.hidden = false; ponerOrden(true); });
  const ponerOrden = (si) => {
    conOrden = si; botonOrden.setAttribute('aria-pressed', String(si)); pintarGuia();
    if (nota.dataset.pista !== '0') nota.textContent = si ? T.ordenPista : T.practica;
  };
  g.lineCap = g.lineJoin = 'round'; g.strokeStyle = tinta(); g.lineWidth = 16;
  let pinta = false, ult = null;
  const pos = (e) => { const r = cv.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * cv.width, ((e.clientY - r.top) / r.height) * cv.height]; };
  cv.addEventListener('pointerdown', (e) => { pinta = true; ult = pos(e); try { cv.setPointerCapture(e.pointerId); } catch { /* sin puntero activo */ } g.beginPath(); g.arc(ult[0], ult[1], 8, 0, Math.PI * 2); g.fillStyle = tinta(); g.fill(); });
  cv.addEventListener('pointermove', (e) => { if (!pinta) return; const p = pos(e); g.beginPath(); g.moveTo(...ult); g.lineTo(...p); g.stroke(); ult = p; });
  const soltar = () => { pinta = false; };
  cv.addEventListener('pointerup', soltar); cv.addEventListener('pointercancel', soltar);
  // la plantilla: el kanji pintado en otro lienzo del mismo tamaño, engordado para no pedir un calco perfecto
  const plantilla = () => {
    const c2 = document.createElement('canvas'); c2.width = c2.height = 320; const q = c2.getContext('2d');
    pintarKanji(q, ch, guia(), { grueso: 22 });
    return q.getImageData(0, 0, 320, 320).data;
  };
  const comprobar = () => {
    const m = plantilla(), d = g.getImageData(0, 0, 320, 320).data;
    let dentro = 0, fuera = 0, total = 0, tapado = 0;
    for (let i = 3; i < d.length; i += 16) { // uno de cada cuatro píxeles basta
      const tinta = d[i] > 40, guia = m[i] > 40;
      if (guia) { total++; if (tinta) tapado++; }
      if (tinta) { if (guia) dentro++; else fuera++; }
    }
    if (!dentro) { nota.textContent = T.pista; return; }
    nota.dataset.pista = '0';
    // lo que cuenta más es haberlo cubierto entero: con dos trazos bien puestos de nueve no hay «¡bien!»
    const precision = dentro / (dentro + fuera), cubre = tapado / Math.max(1, total), s = precision * 0.4 + cubre * 0.6;
    const estrellas = s > 0.75 ? 3 : s > 0.56 ? 2 : 1;
    nota.innerHTML = `<span class="tz-estrellas">${'★'.repeat(estrellas)}${'☆'.repeat(3 - estrellas)}</span> ${T.nota[estrellas - 1]} <em>${CARITA_NYAN} ${T.nyan[estrellas - 1]}</em>`;
    if (estrellas === 3) { son.fanfarria?.(); chispas(cv, { n: 24 }); } else son.sello();
    if (!quieto()) gsap.fromTo(nota, { scale: 0.8 }, { scale: 1, duration: 0.5, ease: 'back.out(2.6)' });
  };
  // una capa del teclado (teclado.js), como la ficha de debajo: si no, sus teclas se las llevaba la ficha
  const cerrar = () => { soltarCapa(); gsap.to(capaEl, { opacity: 0, duration: 0.2, onComplete: () => capaEl.remove() }); };
  const soltarCapa = capa(capaEl, (e) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (k === 'Escape') { cerrar(); return true; }
    // Intro comprueba, salvo con el foco en otro botón (ese hace lo suyo)
    if (k === 'Enter') { const b = document.activeElement?.closest?.('button'); if (b && b.dataset.a !== 'comprobar') return false; comprobar(); return true; }
    if (k === 'o' && !botonOrden.hidden) { ponerOrden(!conOrden); son.papel(); return true; }
    if (k === 'Backspace' || k === 'Delete') { capaEl.querySelector('[data-a="borrar"]').click(); return true; }
    return false;
  }, { foco: capaEl.querySelector('[data-a="comprobar"]') });
  capaEl.querySelector('[data-a="borrar"]').onclick = () => { g.clearRect(0, 0, 320, 320); delete nota.dataset.pista; nota.textContent = conOrden ? T.ordenPista : T.practica; son.papel(); };
  botonOrden.onclick = () => { ponerOrden(!conOrden); son.papel(); };
  capaEl.querySelector('[data-a="comprobar"]').onclick = comprobar;
  capaEl.querySelector('[data-a="cerrar"]').onclick = cerrar;
  capaEl.addEventListener('click', (e) => { if (e.target === capaEl) cerrar(); });
  if (!quieto()) gsap.fromTo(capaEl.querySelector('.tz-hoja'), { y: 32, scale: 0.94, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.36, ease: 'power3.out' });
  son.papel();
}
