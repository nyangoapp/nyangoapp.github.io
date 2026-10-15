# Las historias de Nyan (lecturas graduadas)

Cada cierto tiempo, cuando quien aprende ya tiene vocabulario y gramática de sobra, Nyan le trae una historia corta
para leer (y oír), y luego le pregunta de qué iba y qué le ha parecido. Es inmersión: japonés seguido, con sentido,
que se entiende entero con lo que ya se sabe.

Un archivo por historia: `lNN.json` (l01 …). Se comprueban con:

```bash
python3 herramientas/lecturas.py l03
```

Tiene que dar 0 errores y ningún aviso. Además rehace `indice.json`. Las voces las graba `herramientas/voz_lectura.py`.

## Lo que se puede usar

- `desde`: la palabra del mazo en la que se desbloquea (ver `contenido/mazo/lista.json`). La historia solo puede usar
  palabras con n ≤ desde (y ニャン, タマ, cifras) y gramática de clases con `desde` ≤ el suyo
  (`contenido/mazo/gramatica.json`). El comprobador lo mira frase a frase, también en las preguntas y respuestas.
- Todo el japonés con furigana en cada kanji: `猫[ねこ]`. Espacios entre trozos, como en las clases.
- Frases propias, nada copiado de libros ni webs.

## Cómo es una buena historia

- Una historia de verdad, con principio, lío y final, que se lea con ganas: pequeños sucesos de la vida de Nyan (un
  gato vago y tontorrón que adora los onigiri y la siesta), su amigo Tama (un gato gris listillo), el sensei, la
  tienda, el parque, la estación… Con humor, y alguna vez con un poco de ternura.
- Japonés como se habla: el narrador cuenta en forma llana (〜た, 〜ている) o en です/ます en las primeras; Nyan y Tama
  hablan de tú entre ellos; con el sensei o el dependiente, de usted. Diálogos cortos y naturales.
- Largo según el nivel: 6–10 frases en las primeras (hasta la palabra 400), 10–16 en las del medio, 14–24 al final.
- Frases cortas y claras; la dificultad sube de historia en historia. Repetir palabras recientes del mazo ayuda.

## Formato

```json
{
  "id": "l03", "desde": 300,
  "titulo": {"jp": "ニャンと 雨[あめ]", "es": "Nyan y la lluvia", "en": "Nyan and the rain"},
  "resumen": {"es": "Una frase que invita a leerla.", "en": "…"},
  "portada": {"fondo": "calle", "cosas": [{"que": "nyan", "x": 110, "cara": "triste"}, {"que": "paraguas", "x": 280}]},
  "texto": [
    {"voz": "t1", "quien": "narrador", "jp": "朝[あさ]、 雨[あめ]が 降[ふ]って いた。", "es": "Por la mañana llovía.", "en": "…"},
    {"voz": "t2", "quien": "nyan", "jp": "えー、 また 雨[あめ]？", "es": "¿Otra vez lluvia?", "en": "…"}
  ],
  "preguntas": [
    {"jp": "朝[あさ]、 天気[てんき]は どうでしたか。", "es": "¿Qué tiempo hacía por la mañana?", "en": "…",
     "opciones": [{"jp": "雨[あめ]", "es": "Lluvia", "en": "Rain"}, {"jp": "晴[は]れ", "es": "Sol", "en": "Sunny"}],
     "bien": 0, "porque": {"es": "La primera frase lo dice: 雨が降っていた.", "en": "…"}},
    {"tipo": "opinion", "jp": "ニャンは どう すれば よかったと 思[おも]う？", "es": "¿Qué crees que debería haber hecho Nyan?", "en": "…",
     "opciones": [{"jp": "…", "es": "…", "en": "…", "nyan": {"jp": "Lo que responde Nyan", "es": "…", "en": "…"}}]}
  ]
}
```

- `texto[].quien`: `narrador`, `nyan`, `tama`, `sensei` o `tendero` (elige la voz y el color). `voz`: id único (t1, t2…).
- `portada`: una escena como las de las clases (`{fondo, cosas}`; figuras y fondos de `web/clases/LEEME.md`).
- `preguntas`: de 2 a 5 de comprensión (`bien` = índice de la opción buena; `porque` = dónde está la respuesta en la
  historia) y exactamente una de opinión (`"tipo": "opinion"`): no hay respuesta mala; cada opción trae lo que le
  contesta Nyan (`nyan`), con su gracia. Preguntas y opciones van en japonés (se puede ver la traducción).
- Las opciones malas tienen que ser creíbles (salen en la historia, pero no responden a eso), no absurdas.
