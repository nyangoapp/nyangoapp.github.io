// Lo que dice Nyan en la portada, en nubecitas: frases de vago tontorrón y, de vez en cuando, una palabra que TÚ ya
// sabes y que él intenta decir… y le sale mal. Tú le corriges, él la aprende y te lo agradece (y te cae un koban).
// Esa es la motivación de Nyango: Nyan es un vago que quiere ayudarte con el japonés, pero sabe poco y se equivoca un
// montón, así que aprendes también para enseñarle a él, y le ves mejorar contigo. No toca la repetición espaciada.
import { idioma, t } from './i18n.js';
import { gradoDe } from './pupitre.js';
import { esc } from './japones.js';
import * as son from './sonido.js';

const FRASES = {
  es: {
    saludo: ['¡Hola! Me acabo de despertar. Bueno, llevo despierto un rato… tumbado.', '¿Estudiamos? Tú estudias y yo te miro con mucho interés.', '¡Has vuelto! Te he guardado el cojín caliente. Era para mí, pero bueno.'],
    saludoRepasos: ['Tienes {n} tarjetas para hoy. Yo te animo desde el cojín.', '{n} tarjetas… ¿tantas? Tú puedes. Yo te miro.'],
    saludoHecho: ['¡Todo repasado! Nos merecemos una siesta.', 'Hoy ya has cumplido. ¿Siesta? Siesta.'],
    racha: ['¡{n} días seguidos! Yo llevo {n} días sin levantarme del cojín.', '{n} días de racha. Estoy muy orgulloso. Y muy tumbado.'],
    ocioso: ['にゃ…', '¿Sabías que los kanji tienen rayitas? Muchas. Demasiadas.', 'Si me enseñas palabras, a lo mejor algún día te ayudo yo. A lo mejor.',
      'Estoy estudiando. Con los ojos cerrados, que se aprende más.', 'Hoy he aprendido… a estar tumbado. Mañana, japonés.', '¿Me traes un onigiri? Es para concentrarme.',
      'Tú eres el listo de los dos. Yo pongo la cara bonita.', 'Me he leído un libro entero. La portada. Varias veces.'],
    sabe: ['Ya sé {n} palabras. ¡Todas me las enseñaste tú!', 'Con {n} palabras ya casi hablo japonés. Casi.', 'Mi libreta dice que ya puedo esto: «{g}». Con mi letra y todo.',
      'Mi libreta ya tiene {n} palabras. Pesa más que yo.'],
    actividad: {
      repaso: ['¡A repasar! Yo repaso… mirarte.', 'Repasar es como la siesta: mejor un poquito cada día.'],
      leccion: ['¡Palabras nuevas! Luego me las enseñas, ¿eh?', 'Nuevas palabras… espero que alguna sea «onigiri».'],
      gramatica: ['La gramática me da sueño… más sueño.', '¿Partículas? Yo solo conozco la de «にゃ».'],
      kanji: ['¡Kanji! ¡Socorro! ¡Tantas rayitas!', 'Este kanji me mira raro.'],
      camino: ['¡Mira cuánto hemos andado! Bueno, tú. Yo iba en brazos.'],
      mochi: ['¡Mi ropa! ¿A que estoy guapísimo?', 'Aquí es donde me pongo elegante.'],
    },
    intenta: ['¡Esta me la sé! {palabra} es… ¿{mal}?', '{palabra}… ¡{mal}! ¿A que sí?', 'Mira, mira: {palabra} significa {mal}. Creo.'],
    acierta: ['{palabra} es {bien}. ¡Toma ya!', '¡{palabra}! {bien}. ¿Has visto? ¡Me lo enseñaste tú!'],
    corrige: '✎ Corrígele', pregunta: 'Vale… entonces, ¿{palabra} qué era?',
    aprende: ['¡Ahhh! {palabra} es {bien}. ¡Apuntada en mi libreta!', '¡Apuntado! {palabra}: {bien}. Eres el mejor profe.'],
    tampoco: ['¿Eh? Tampoco era eso… era {bien}. ¡Ya somos dos!', '¡Ups! Era {bien}. Lo aprendemos juntos, ¿vale?'],
    premio: '+1 koban',
  },
  en: {
    saludo: ['Hi! I just woke up. Well, I\'ve been awake a while… lying down.', 'Shall we study? You study, I watch very closely.', 'You\'re back! I kept the cushion warm. For me, but still.'],
    saludoRepasos: ['{n} cards for today. I\'ll cheer from the cushion.', '{n} cards… that many? You got this. I\'ll watch.'],
    saludoHecho: ['All reviewed! We deserve a nap.', 'Done for today. Nap? Nap.'],
    racha: ['{n} days in a row! I\'ve been on this cushion for {n} days too.', '{n}-day streak. I\'m very proud. And very horizontal.'],
    ocioso: ['にゃ…', 'Did you know kanji have little lines? Lots. Too many.', 'If you teach me words, maybe one day I\'ll help you. Maybe.',
      'I\'m studying. With my eyes closed, it works better.', 'Today I learned… how to lie down. Japanese tomorrow.', 'Can you bring me an onigiri? It helps me focus.',
      'You\'re the smart one. I bring the cute face.', 'I read a whole book. The cover. Several times.'],
    sabe: ['I know {n} words now. You taught me every one!', 'With {n} words I almost speak Japanese. Almost.', 'My notebook says I can do this now: «{g}». In my handwriting and everything.',
      'My notebook has {n} words now. It weighs more than me.'],
    actividad: {
      repaso: ['Review time! I\'ll review… you.', 'Reviewing is like napping: best a little every day.'],
      leccion: ['New words! Teach me later, okay?', 'New words… I hope one of them is "onigiri".'],
      gramatica: ['Grammar makes me sleepy… sleepier.', 'Particles? I only know "にゃ".'],
      kanji: ['Kanji! Help! So many lines!', 'This kanji is looking at me funny.'],
      camino: ['Look how far we\'ve come! Well, you. I was carried.'],
      mochi: ['My clothes! Don\'t I look amazing?', 'This is where I get fancy.'],
    },
    intenta: ['I know this one! {palabra} is… {mal}?', '{palabra}… {mal}! Right?', 'Look, look: {palabra} means {mal}. I think.'],
    acierta: ['{palabra} is {bien}. Nailed it!', '{palabra}! {bien}. See? You taught me that!'],
    corrige: '✎ Correct him', pregunta: 'Okay… so what was {palabra}?',
    aprende: ['Ohhh! {palabra} is {bien}. Writing it in my notebook!', 'Got it! {palabra}: {bien}. Best teacher ever.'],
    tampoco: ['Huh? Not that either… it was {bien}. That makes two of us!', 'Oops! It was {bien}. We\'ll learn it together, okay?'],
    premio: '+1 koban',
  },
};
const F = FRASES[idioma] || FRASES.es;
const azar = (l) => l[Math.floor(Math.random() * l.length)];
const barajar = (l) => l.map((x) => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
const rellenar = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
const palabra = (w) => `<span class="jp" lang="ja">${esc(w.palabra)}${w.lectura && w.lectura !== w.palabra ? `<small>${esc(w.lectura)}</small>` : ''}</span>`;

// m: la Mascota de la portada · d: /api/inicio · op: { api, flotar, koban(monedas) }
const st = { m: null, d: null, op: null, reloj: 0, tocado: 0, ensenando: false };
addEventListener('pointermove', () => { st.tocado = performance.now(); }, { passive: true });
addEventListener('keydown', () => { st.tocado = performance.now(); });

function decir(html, { cara = null, voz = null, ms = 4800 } = {}) {
  const m = st.m; if (!m?.decir) return null;
  const b = m.decir(html, { ms });
  son.burbuja();
  if (cara) m.expresion(cara, Math.min(ms, 2600));
  if (voz) m.hablar(voz);
  return b;
}

export function empezarCharla(m, d, op) {
  st.m = m; st.d = d; st.op = op; st.ensenando = false;
  clearTimeout(st.reloj);
  // el saludo, cuando ya ha dicho hola con la pata
  st.reloj = setTimeout(() => { if (!document.querySelector('.bv-capa, .tour-capa')) saludar(); programar(); }, 2600); // con la bienvenida abierta, habla ella
}
export function datosCharla(d) { st.d = d; }
export function pararCharla() { clearTimeout(st.reloj); st.m?.callar?.(true); st.ensenando = false; }

function programar() {
  clearTimeout(st.reloj);
  st.reloj = setTimeout(() => {
    // no interrumpe: ni mientras enseñas, ni mientras mueves el ratón por la portada, ni con la ventana escondida
    const ocupado = st.ensenando || document.hidden || !st.m?.visible?.() || performance.now() - st.tocado < 3500 || document.querySelector('.modal-capa, .tk-capa, .tour-capa');
    if (!ocupado && !st.m.hablando()) { if (Math.random() < 0.5) { if (!intentar()) ocioso(); } else ocioso(); }
    programar();
  }, 22000 + Math.random() * 16000);
}

function saludar() {
  const d = st.d; if (!d || !st.m?.visible?.()) return;
  let txt;
  if (d.racha >= 2 && Math.random() < 0.35) txt = rellenar(azar(F.racha), { n: d.racha });
  else if (d.repasos_ahora) txt = rellenar(azar(F.saludoRepasos), { n: d.repasos_ahora });
  else if (d.cuenta?.aprendidos) txt = Math.random() < 0.5 ? azar(F.saludoHecho) : azar(F.saludo);
  else txt = azar(F.saludo);
  decir(esc(txt), { ms: 5200 });
}
function ocioso() {
  const sabe = st.d?.nyan_sabe || 0;
  const txt = sabe >= 2 && Math.random() < 0.3 ? rellenar(azar(F.sabe), { n: sabe, g: t(`perfil.inv.grado.${gradoDe(sabe)}`) }) : azar(F.ocioso);
  decir(esc(txt), { cara: Math.random() < 0.5 ? 'vago' : null, voz: txt === 'にゃ…' ? 'nya' : null });
}
// al elegir algo en el muelle, a veces lo comenta (no siempre: se haría pesado)
export function charlaActividad(id) {
  if (st.ensenando || Math.random() > 0.35 || !F.actividad[id]) return;
  setTimeout(() => { if (!st.ensenando) decir(esc(azar(F.actividad[id])), { ms: 3800 }); }, 650);
}

// ── enséñale a Nyan ──
// Lo que le has enseñado (repasándolo o corrigiéndole) lo dice bien casi siempre, y presume; lo demás, casi siempre mal.
function intentar() {
  const P = st.d?.nyan_palabras || []; if (P.length < 3) return false;
  const w = azar(P);
  if (Math.random() < (w.sabe ? 0.85 : 0.15)) { decir(rellenar(azar(F.acierta), { palabra: palabra(w), bien: `«${esc(w.es)}»` }), { cara: 'doya', voz: 'fun' }); return true; }
  const malo = azar(P.filter((x) => x.es !== w.es)).es;
  st.ensenando = true;
  const b = decir(`${rellenar(azar(F.intenta), { palabra: palabra(w), mal: `<b class="nd-mal">«${esc(malo)}»</b>` })}<div class="nd-acciones"><button data-ensena>${F.corrige}</button></div>`, { cara: 'doya', voz: 'nya', ms: 12000 });
  if (!b) { st.ensenando = false; return false; }
  b.querySelector('[data-ensena]').onclick = () => { son.toque(); preguntar(w, malo); };
  // si no le haces caso, se le olvida (y sigue con lo suyo)
  setTimeout(() => { if (st.ensenando && !b.querySelector('.nd-op')) st.ensenando = false; }, 12500);
  return true;
}
function preguntar(w, malo) {
  const P = st.d.nyan_palabras || [], otra = azar(P.filter((x) => x.es !== w.es && x.es !== malo));
  const ops = barajar([w.es, malo, otra?.es].filter(Boolean));
  const b = decir(`${rellenar(F.pregunta, { palabra: palabra(w) })}<div class="nd-acciones">${ops.map((o) => `<button class="nd-op" data-op="${esc(o)}">${esc(o)}</button>`).join('')}</div>`, { cara: 'pensando', ms: 20000 });
  if (!b) { st.ensenando = false; return; }
  b.querySelectorAll('[data-op]').forEach((btn) => { btn.onclick = () => responder(w, btn, b); });
}
async function responder(w, btn, b) {
  const todos = [...b.querySelectorAll('[data-op]')]; todos.forEach((x) => { x.disabled = true; });
  const bien = btn.dataset.op === w.es;
  btn.classList.add(bien ? 'bien' : 'mal');
  const vars = { palabra: palabra(w), bien: `«${esc(w.es)}»` };
  if (!bien) {
    todos.find((x) => x.dataset.op === w.es)?.classList.add('bien');
    son.fallo();
    setTimeout(() => { decir(rellenar(azar(F.tampoco), vars), { cara: 'panico', voz: 'wa', ms: 4800 }); st.ensenando = false; }, 900);
    return;
  }
  son.acierto(1);
  let r = null;
  try { r = await st.op.api('/api/nyan/ensenar', { id: w.id }); } catch { /* sin servidor, al menos se alegra */ }
  if (r) {
    st.d.nyan_sabe = r.sabe; st.d.nyan_palabras = r.palabras;
    if (r.premio) { const rc = btn.getBoundingClientRect(); son.moneda(); st.op.flotar?.(F.premio, rc.left + rc.width / 2, rc.top, 'var(--oro-canto)'); st.op.koban?.(r.monedas); }
  }
  setTimeout(() => {
    decir(rellenar(azar(F.aprende), { ...vars, n: r?.sabe ?? (st.d.nyan_sabe || 1) }), { cara: 'estrella', voz: 'yaha', ms: 4600 });
    st.m?.lanzarManpu?.('corazon', [0.8, 0.7, 0.3], { vida: 1.3 });
    st.ensenando = false;
  }, 700);
}
// depuración: ?nyan deja a mano window.nyan.intentar() y .ocioso() para probar las nubes sin esperar
if (new URLSearchParams(location.search).has('nyan')) window.nyan = { intentar, ocioso, saludar };
