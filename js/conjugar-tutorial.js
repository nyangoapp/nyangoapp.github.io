// El tutorial de «Conjugar» (11-10): cómo funciona la tabla 活用 del colegio, para quien no la ha visto nunca.
// Solo datos (lo pintan conjugar-vista.js en el escritorio y movil/conjugar.js en el móvil). Cada página:
//   { id, titulo, texto (con **negritas** y furigana 漢字[かな]), ejemplo?: {...} }
// Tipos de ejemplo:
//   fila:   la fila del silabario que recorre la última letra, con las casillas que se iluminan en orden
//   tabla:  las 6 bases de un verbo, una por casilla (base · lo que se pega · la forma entera)
//   tipos:  verbos de cada tipo, con su pista
//   lista:  pares «antes → después»

const paginas = {
  es: [
    {
      id: 'idea', titulo: 'Un verbo japonés tiene dos partes',
      texto: 'Una parte **no cambia nunca** y la otra es **la última letra**, que cambia según lo que quieras decir. Después se le pega una terminación: ない (no), ます (educado), ば (si)…\n\nEn 書[か]く («escribir»), 書[か] no se mueve y く es la letra que cambia.',
      ejemplo: { tipo: 'lista', items: [['書[か]く', 'escribir'], ['書[か]かない', 'no escribir'], ['書[か]きます', 'escribo (educado)'], ['書[か]けば', 'si escribo']] },
    },
    {
      id: 'fila', titulo: 'La última letra recorre su fila',
      texto: 'く es de la fila か・き・く・け・こ del silabario. Para conjugar, la última letra salta a otra casilla de **su misma fila**: 書[か]**か**ない, 書[か]**き**ます, 書[か]**け**ば…\n\nNo hay que inventar nada: siempre es la misma fila.',
      ejemplo: { tipo: 'fila', verbo: '書[か]く', fila: ['か', 'き', 'く', 'け', 'こ'], orden: ['か', 'き', 'く', 'く', 'け', 'け'] },
    },
    {
      id: 'tabla', titulo: 'Las 6 bases: か・き・く・く・け・け',
      texto: 'En el colegio japonés se aprende una tabla con **6 casillas, siempre en el mismo orden**. Cada casilla es una «base», y cada base tiene sus terminaciones:\n\n**未然形[みぜんけい]** (aún no) → ない · **連用形[れんようけい]** (se une) → ます · **終止形[しゅうしけい]** (fin de frase) · **連体形[れんたいけい]** (antes de un sustantivo) → とき · **仮定形[かていけい]** (condición) → ば · **命令形[めいれいけい]** (orden).\n\nPara 書[か]く sale か・き・く・く・け・け. Recitarlo en voz alta es el truco.',
      ejemplo: { tipo: 'tabla', verbo: '書[か]く', filas: [['未然形', 'ない', '書[か]かない'], ['連用形', 'ます', '書[か]きます'], ['終止形', '', '書[か]く'], ['連体形', 'とき', '書[か]くとき'], ['仮定形', 'ば', '書[か]けば'], ['命令形', '', '書[か]け']] },
    },
    {
      id: 'otro', titulo: 'Con otro verbo, la misma canción',
      texto: '飲[の]む («beber») acaba en む, de la fila ま・み・む・め・も. La tabla es igual, solo cambia la fila: **ま・み・む・む・め・め**.\n\nSi te sabes la canción か・き・く・く・け・け, te sabes la de todos los verbos de este tipo.',
      ejemplo: { tipo: 'tabla', verbo: '飲[の]む', filas: [['未然形', 'ない', '飲[の]まない'], ['連用形', 'ます', '飲[の]みます'], ['終止形', '', '飲[の]む'], ['連体形', 'とき', '飲[の]むとき'], ['仮定形', 'ば', '飲[の]めば'], ['命令形', '', '飲[の]め']] },
    },
    {
      id: 'tipos', titulo: 'Tres tipos de verbo',
      texto: '**五段** (godan): la mayoría. La última letra recorre su fila, como 書[か]く y 飲[の]む.\n\n**一段** (ichidan): acaban en いる o える y **solo se quita る**: 食[た]べる → 食[た]べない, 食[た]べます, 食[た]べれば, 食[た]べろ.\n\n**Irregulares**: solo dos, する y 来[く]る. Se aprenden de memoria.',
      ejemplo: { tipo: 'tipos', items: [['五段', '書[か]く・飲[の]む・話[はな]す・帰[かえ]る', 'cambia la última letra'], ['一段', '食[た]べる・見[み]る・起[お]きる', 'se quita る'], ['irregular', 'する・来[く]る', 'de memoria']] },
    },
    {
      id: 'saber', titulo: '¿Cómo sé de qué tipo es?',
      texto: 'Si **no acaba en る**, es 五段 seguro (書[か]く, 飲[の]む, 話[はな]す).\n\nSi acaba en **る** y antes hay una a, u u o (分[わ]かる, 作[つく]る, 取[と]る), también es 五段.\n\nSi acaba en **いる / える**, casi siempre es 一段… pero hay trampas: 帰[かえ]る, 入[はい]る, 走[はし]る y 知[し]る son 五段. Cuando falles, Nyango te dirá de qué tipo era.',
      ejemplo: { tipo: 'lista', items: [['書[か]く', '五段: no acaba en る'], ['分[わ]かる', '五段: «a» antes de る'], ['食[た]べる', '一段: える'], ['帰[かえ]る', '五段: ¡trampa!']] },
    },
    {
      id: 'te', titulo: 'La forma て tiene su propia regla',
      texto: 'Con て y た, los 五段 cambian un poco el sonido para que se pronuncie mejor (se llama 音便[おんびん]). Son pocas reglas:\n\n**う・つ・る → って** · **む・ぶ・ぬ → んで** · **く → いて** · **ぐ → いで** · **す → して**\n\nY una excepción famosa: 行[い]く → 行[い]って.',
      ejemplo: { tipo: 'lista', items: [['買[か]う → 買[か]って', 'う → って'], ['飲[の]む → 飲[の]んで', 'む → んで'], ['書[か]く → 書[か]いて', 'く → いて'], ['話[はな]す → 話[はな]して', 'す → して']] },
    },
    {
      id: 'practicar', titulo: 'Cómo practicar aquí',
      texto: '**Verbos**: te doy un verbo y una forma (ない, ます, て…) y la escribes.\n\n**Tabla 活用[かつよう]**: rellenas las 6 casillas de un verbo, en orden.\n\n**Adjetivos**: lo mismo con 高[たか]い, 静[しず]か…\n\nEscribe en rōmaji si quieres: se convierte solo. Cada forma que practiques entra en tu repaso diario, con un verbo distinto cada vez.',
    },
  ],
  en: [
    {
      id: 'idea', titulo: 'A Japanese verb has two parts',
      texto: 'One part **never changes**, and the other is **the last letter**, which changes depending on what you want to say. Then an ending gets attached: ない (not), ます (polite), ば (if)…\n\nIn 書[か]く («to write»), 書[か] stays put and く is the letter that changes.',
      ejemplo: { tipo: 'lista', items: [['書[か]く', 'to write'], ['書[か]かない', 'not to write'], ['書[か]きます', 'I write (polite)'], ['書[か]けば', 'if I write']] },
    },
    {
      id: 'fila', titulo: 'The last letter moves along its row',
      texto: 'く belongs to the か・き・く・け・こ row of the kana chart. To conjugate, the last letter jumps to another square of **the same row**: 書[か]**か**ない, 書[か]**き**ます, 書[か]**け**ば…\n\nNothing to invent: it is always the same row.',
      ejemplo: { tipo: 'fila', verbo: '書[か]く', fila: ['か', 'き', 'く', 'け', 'こ'], orden: ['か', 'き', 'く', 'く', 'け', 'け'] },
    },
    {
      id: 'tabla', titulo: 'The 6 bases: か・き・く・く・け・け',
      texto: 'Japanese schoolchildren learn a table with **6 squares, always in the same order**. Each square is a «base», and each base takes its own endings:\n\n**未然形[みぜんけい]** (not yet) → ない · **連用形[れんようけい]** (joins) → ます · **終止形[しゅうしけい]** (end of sentence) · **連体形[れんたいけい]** (before a noun) → とき · **仮定形[かていけい]** (condition) → ば · **命令形[めいれいけい]** (command).\n\nFor 書[か]く you get か・き・く・く・け・け. Saying it out loud is the trick.',
      ejemplo: { tipo: 'tabla', verbo: '書[か]く', filas: [['未然形', 'ない', '書[か]かない'], ['連用形', 'ます', '書[か]きます'], ['終止形', '', '書[か]く'], ['連体形', 'とき', '書[か]くとき'], ['仮定形', 'ば', '書[か]けば'], ['命令形', '', '書[か]け']] },
    },
    {
      id: 'otro', titulo: 'Another verb, same song',
      texto: '飲[の]む («to drink») ends in む, from the ま・み・む・め・も row. The table is the same, only the row changes: **ま・み・む・む・め・め**.\n\nKnow the か・き・く・く・け・け song and you know it for every verb of this type.',
      ejemplo: { tipo: 'tabla', verbo: '飲[の]む', filas: [['未然形', 'ない', '飲[の]まない'], ['連用形', 'ます', '飲[の]みます'], ['終止形', '', '飲[の]む'], ['連体形', 'とき', '飲[の]むとき'], ['仮定形', 'ば', '飲[の]めば'], ['命令形', '', '飲[の]め']] },
    },
    {
      id: 'tipos', titulo: 'Three kinds of verb',
      texto: '**五段** (godan): most verbs. The last letter moves along its row, like 書[か]く and 飲[の]む.\n\n**一段** (ichidan): end in いる or える and **you just drop る**: 食[た]べる → 食[た]べない, 食[た]べます, 食[た]べれば, 食[た]べろ.\n\n**Irregular**: only two, する and 来[く]る. Learn them by heart.',
      ejemplo: { tipo: 'tipos', items: [['五段', '書[か]く・飲[の]む・話[はな]す・帰[かえ]る', 'the last letter changes'], ['一段', '食[た]べる・見[み]る・起[お]きる', 'drop る'], ['irregular', 'する・来[く]る', 'by heart']] },
    },
    {
      id: 'saber', titulo: 'How do I know which kind it is?',
      texto: 'If it **doesn’t end in る**, it’s 五段 for sure (書[か]く, 飲[の]む, 話[はな]す).\n\nIf it ends in **る** with an a, u or o before it (分[わ]かる, 作[つく]る, 取[と]る), it’s 五段 too.\n\nIf it ends in **いる / える**, it’s almost always 一段… with a few traps: 帰[かえ]る, 入[はい]る, 走[はし]る and 知[し]る are 五段. When you miss one, Nyango tells you which kind it was.',
      ejemplo: { tipo: 'lista', items: [['書[か]く', '五段: no る ending'], ['分[わ]かる', '五段: «a» before る'], ['食[た]べる', '一段: える'], ['帰[かえ]る', '五段: a trap!']] },
    },
    {
      id: 'te', titulo: 'The て form has its own rule',
      texto: 'With て and た, 五段 verbs tweak their sound so it’s easier to say (it’s called 音便[おんびん]). Just a few rules:\n\n**う・つ・る → って** · **む・ぶ・ぬ → んで** · **く → いて** · **ぐ → いで** · **す → して**\n\nPlus one famous exception: 行[い]く → 行[い]って.',
      ejemplo: { tipo: 'lista', items: [['買[か]う → 買[か]って', 'う → って'], ['飲[の]む → 飲[の]んで', 'む → んで'], ['書[か]く → 書[か]いて', 'く → いて'], ['話[はな]す → 話[はな]して', 'す → して']] },
    },
    {
      id: 'practicar', titulo: 'How to practise here',
      texto: '**Verbs**: I give you a verb and a form (ない, ます, て…) and you type it.\n\n**活用[かつよう] table**: fill in a verb’s 6 squares, in order.\n\n**Adjectives**: the same with 高[たか]い, 静[しず]か…\n\nType in rōmaji if you like: it turns into kana by itself. Every form you practise joins your daily reviews, with a different verb each time.',
    },
  ],
};

export const paginasTutorial = (lang = 'es') => paginas[lang] || paginas.es;
const CLAVE = 'nyango-conjugar-tutorial-visto';
export function tutorialVisto() { try { return !!localStorage.getItem(CLAVE); } catch { return true; } }
export function marcarTutorialVisto() { try { localStorage.setItem(CLAVE, String(Date.now())); } catch { /* sin almacenamiento */ } }
