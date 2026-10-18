# Clases interactivas de gramática (NyanDeck)

Hay una clase por cada clase de `contenido/mazo/gramatica.json`, con el mismo `desde`. El archivo es `<id>.json`, con
el `id` de gramatica.json (c01 … c46). **El `id` no cambia aunque se metan clases en medio** (así no se pierde el
progreso ni los audios); el número que ve quien aprende es el orden en gramatica.json. c35–c46 son las del tramo A
(29-09), que se metieron entre las de antes. El modelo es **`c01.json`**: hay que copiar su estructura, su tono y su
cantidad de contenido. `c04.json` (いる/ある) es especial: tiene una habitación hecha a mano (`"tipo": "sala"`).

Para comprobar una clase:

```bash
python3 herramientas/clases.py c07
```

Tiene que dar 0 errores y ningún aviso. Además rehace `indice.json`. Las voces las graba luego
`herramientas/voz_clase.py`, así que no hace falta grabarlas al escribir.

## Para quién es

Para alguien que **se pierde con la gramática**. Por eso:

- Nada de tecnicismos: «は marca de qué hablas», no «partícula temática».
- Una idea por viñeta.
- Ejemplos cortos, con palabras del mazo que ya se saben en ese punto (mira `contenido/mazo/lista.json` y
  `palabras.json`: las palabras con `n` menor que el `desde` de la clase, y algunas de justo después).
- Todo el japonés lleva furigana en cada kanji: `猫[ねこ]`. Los espacios separan trozos, como en los libros para niños.
- Cada texto para quien aprende va en `{"es": …, "en": …}`: español de España e inglés.

Nyan es un gato vago y tontorrón. Adora los onigiri y la siesta, y es el compañero de clase que va peor que tú.
Se equivoca, y de sus errores sale la regla.

## Japonés de verdad (29-09, con lo aprendido de Genki y Tobira)

- **A quién se habla.** Nyan habla **de tú** con su amigo **Tama** (un gato gris listillo, la figura `gato`) y en casa;
  **de usted** con el **sensei** (`profesor`) y con el **dependiente** (`persona`). Desde la clase 1 (だ) se nota: con
  Tama «これ、猫だ！», con el sensei «これは猫です». Antes de la clase 7 aún no hay verbos llanos: con verbos, です/ます.
- En el manga pueden hablar otros: viñeta `"habla": "tama" | "sensei" | "tendero"` (sin `habla`, habla Nyan). Cada
  uno tiene su color de bocadillo, su nombre encima y su voz; su figura tiene que estar en la escena (a la derecha,
  x 240–340: el bocadillo se va a la derecha y apunta a ella).
- **Lo hablado**, en cuanto su forma completa tiene clase: 〜てる (desde 〜ている), 〜とく (〜ておく), 〜なきゃ
  (〜なければ), って (と言う), の？ (〜んですか), 〜ちゃう (〜てしまう). Muletillas y partículas finales cuando
  pegan: あの, えーと, まあ, よ, ね, よね, かな.
- **Cada clase nombra a su «primo»**: la construcción que se le parece y ya se vio (ために ↔ ように, ても ↔ のに,
  たら ↔ なら…), y en una frase dice la diferencia (en una `nota` o en `chuleta.consejo`).
- **Registro en la chuleta**: cada fila puede llevar `"registro": "amigos" | "educado" | "escrito"`, y sale una
  etiqueta. Cuando el punto cambia con el registro, pon las dos filas: la de amigos y la educada.
- En la práctica, algún encargo puede pedir decirlo **a Tama** o **al sensei**: la solución cambia (だ/です, 行く/行きます).

## Las cuatro partes

### 1. `intro`: el manga

Son 4 viñetas. Nyan se topa con la gramática y la lía; la regla sale de lo que pasa.

- Cada viñeta tiene `escena`, `jp` (lo que dice Nyan), `tr`, y opcionalmente `cartela` (narración) o `nota` (chuleta
  breve).
- `voz` es un id único (`i1`…`i4`) y `cara` indica el tono de la voz.

### 2. `practica`: «la frase cobra vida»

Se hace con `"tipo": "montar"`. Hay de 4 a 5 encargos. En cada uno montas la frase con piezas y **la escena hace
exactamente lo que dices**.

- Si aciertas, se ejecuta `efecto_bien`.
- Si te equivocas, pasa algo gracioso que enseña el porqué. Eso son las reglas de `fallos`: son lo más importante de
  la clase, así que conviene poner 2 o 3 por encargo.
- Si ninguna regla de `fallos` encaja, Nyan señala la primera pieza que no cuadra.

Estructura:

- `piezas`: `[{id, jp, tipo}]`. `tipo` sirve solo para el color: palabra (blanco), particula (rosa), verbo (verde).
- Cada encargo es `{pide, escena, piezas: [ids de la ronda, 9 como mucho, con distractores], bien: [[ids en orden],
  …otras órdenes válidas del mismo largo], tr, bien_msg?, nyan?, pista?, efecto_bien, fallos: [{si, efecto, msg,
  cara?}]}`.
- `si` puede tener `{contiene: [ids]}`, `{falta: [ids]}`, `{en: [posición, id]}` o `{orden: [ids]}`. Gana la primera
  regla que se cumpla.
- **Respuestas no previstas.** El validador prueba a cambiar cada palabra de la solución por las de relleno del mismo
  tipo y avisa si sale una frase que no está en `bien` ni tiene fallo (así salió 猫は人です en la clase 1, cuando se
  pedía これ). Si es buen japonés y cumple el encargo, va a `bien`; si no, un fallo que explique por qué. El `pide`
  tiene que dejar claro qué se espera (qué palabra usar, a quién se habla). Los trozos de verbo (寝, 食べ) son
  `"tipo": "verbo"`, no palabra.
- Las conjugaciones se hacen con piezas partidas: `食[た]べ` + `ます` / `ました` / `ません`.

### 3. `juego`: las cestas

Tiene `{intro, nyan, cestas: [2 o 3 × {id, jp, sub}], cartas: [8 a 10 × {id, jp, es, en, cesta, dibujo?, truco?}]}`.

- La carta es una frase con UN hueco `＿` (se completa con el `jp` de la cesta) o una palabra con dibujo.
- Las cestas contrastan lo que se confunde: は/が, に/で, たら/ば, いる/ある…
- `truco` explica la trampa.

### 4. `outro` y `chuleta`

El `outro` son 3 viñetas que resumen la regla con humor.

La `chuleta` tiene `{patron, patron_tr, columnas?: [{jp, texto, dibujos: [1 o 2 figuras]}], filas?: [{jp, es, en}],
consejo?}`.

## Escenas: `{fondo, cosas}`

La escena mide 400 × 260 y el suelo está en y = 236 (es el valor por defecto de `y`).

- **Posiciones:** Nyan suele ir a la izquierda (x 90–130), porque el bocadillo va arriba a la izquierda y apunta
  hacia él. Lo demás va a la derecha (x 240–340). Los signos (manpu) van a y 100–120.
- **`fondo`:** cuarto, calle, escuela, parque, cocina, tienda o noche.
- **Cosas:**
  - `{que: figura, x, y?, s?, id?, espejo?, encima?: figura, dentro?: figura (solo la caja), vida?: true}`
  - `{que: 'nyan', x, cara?, brazo?: 'arriba', onigiri?: true}`
  - `{que: 'manpu', tipo, x, y}`
  - `{que: 'texto', texto, x, y}` (onomatopeyas)
  - `{que: 'insignia', texto: 'に', x, y, color: 'pRosa' | 'menta' | 'cielo' | 'mante'}`
- **Figuras** (`web/js/clase-arte.js`): nyan, gato (Tama), perro, persona, profesor/sensei, libro, manzana, onigiri, caja,
  mesa, cama, taza, plato, cuenco, regalo, casa, escuela, reloj, silla, bolsa, telefono, tren, bici, sol, nube, luna,
  pizarra, lapiz, carta, zapato, vaso, pan, sushi, arbol/ki, flor/hana, pez/sakana, pajaro/tori, coche/kuruma,
  tele/terebi, dinero/okane, paraguas/kasa, bicho/mushi.
- **Caras de Nyan:** normal, feliz, sorpresa, sueno, pensando, triste, enfado.
- **Manpu:** excl, pregunta, z, sudor, brillo, corazon, prisa.

## Efectos

Cada efecto apunta a una cosa por su `id` o, si no tiene, por su `que`.

| efecto | parámetros | qué hace |
|---|---|---|
| brilla | objeto | bota y chispas: el de acertar |
| salta | objeto | da un salto |
| vida | objeto | le salen ojos y patas |
| peluche | objeto | se queda tieso y gris |
| gigante, mini | objeto, cuanto? | crece o encoge |
| disfraz | objeto, como: figura | se convierte en otra cosa |
| come | objeto, texto? | desaparece y Nyan dice もぐもぐ |
| desaparece | objeto | desaparece |
| huye | objeto, hacia: 'izq' o 'der' | le salen patas y se va corriendo |
| duerme | objeto | le salen «zzz» |
| manpu | objeto, manpu | le pone un signo encima |
| encima | objeto, sobre | pone una cosa encima de otra |
| mueve | objeto, x, y? | la lleva a otro sitio |
| aparece | que, x, y?, s?, id? | aparece una cosa nueva |
| tacha | objeto | le pone una X roja encima (para negar) |
| nyan | cara, brazo?, onigiri?, manpu? | cambia la cara de Nyan |
| texto | texto, objeto o x/y | pone una onomatopeya |
| gira | objeto | da una vuelta |
| tiembla | objeto | tiembla |

Un efecto puede ir solo o en una lista: se ejecutan en orden.
