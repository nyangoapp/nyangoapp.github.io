# Idiomas de Nyango (español e inglés)

La interfaz sale de `es.json` (la fuente) y `en.json`. El contenido (vocabulario, kanji, elementos, gramática, juego) lo manda el servidor ya en el idioma de la app. Este archivo es la guía para pasar un módulo a `t()`.

## Cómo funciona

- `web/js/i18n.js` se carga antes que nada: con top-level await lee el idioma y el diccionario. Todo módulo que lo importa espera, así que las constantes de módulo (`GRUPOS`, `MODOS`, `CREDITOS`…) ya nacen traducidas.
- Idioma: `?lang=en` en la URL (solo para pruebas, no se guarda) → el guardado en los ajustes (`p.ajustes.idioma`, vía `GET /api/idioma`) → la primera vez, el del navegador (y se guarda). Un progreso de antes de que hubiera idiomas (con XP o repasos) cuenta como español.
- Cambiar de idioma = `cambiarIdioma('en')`: lo guarda y recarga la página. Hay selector en Ajustes y en la pantalla de arranque.
- Cada petición a `/api/` lleva la cabecera `X-Nyango-Idioma` (`CABECERA` de `i18n.js`). `api()` de `app.js` ya la pone; si haces un `fetch` a mano, añádela.
- `<html lang>` se pone al cargar. El HTML de `index.html` está en español y se traduce con `data-i18n`, `data-i18n-title`, `data-i18n-aria-label` y `data-i18n-content`.
- Si a `en.json` le falta una clave, sale la española y avisa con `console.warn`. Si no existe en ninguno, sale la propia clave (y otro aviso).

## Qué exporta `i18n.js`

```js
import { t, tn, num, idioma, tecla, kbd, hay, CABECERA, cambiarIdioma } from './i18n.js';
t('perfil.nivel', { nivel: 7, dentro: '931', need: '2520' });    // «Nivel 7 · 931/2520 XP»
tn('app.palabras', 5);                                            // «5 palabras» · «5 words» ({n} sale con num())
num(1500);                                                        // «1500» en español (como siempre), «1,500» en inglés
idioma;                                                           // 'es' | 'en'
tecla('Intro');                                                   // «Intro» · «Enter»
```

- `kbd('Intro')` (de `i18n.js` o de `teclado.js`, es la misma) ya traduce la etiqueta. **Las teclas no cambian con el idioma** (I, R, L, G, K, C, M, A, B, S/L, N, V, F…): en inglés solo cambia su nombre y la descripción en la hoja «?».
- `mil()` de `app.js` es `num()`.

## Reglas para las claves

- Claves planas por módulo: `estudio.leccion.fin`, `jefe.batalla.huir`… Prefijos ya usados: `comun.`, `rangos.`, `idioma.`, `css.`, `index.`, `app.`, `teclado.`, `ajustes.`, `acerca.`, `arranque.`, `perfil.`, `japones.`, `srv.` (servidor) y `tecla.` (solo en `en.json`).
- **Una clave por frase entera**, con `{marcadores}`. Nunca pegues trozos («Rumbo a » + región): en inglés cambia el orden.
- Los valores de los marcadores van tal cual. Si el texto acaba en `innerHTML` y el valor viene del usuario o del servidor, pásalo escapado: `t('app.camino.h1', { region: esc(nombre) })`.
- HTML dentro de un valor solo si hace falta (`<b>`, un enlace como `{enlace}`), con las mismas etiquetas en los dos idiomas. Las teclas, como marcador: `t('ajustes.modo.nota', { m: kbd('M') })`.
- Plurales: `{"one": "{n} palabra", "other": "{n} palabras"}` y `tn(clave, n)`. Nada de pegar una «s».
- Tiempos: `tn('app.cuando.dias', n)` («en 3 días» · «in 3 days») o `Intl.RelativeTimeFormat(idioma)`.
- Comillas en inglés: “ ” (y ‘ ’ dentro). En español, « ».
- Textos en CSS (`content:`): van como variable desde `i18n.js` (ejemplo: `--i18n-ojo` para `.bl-ojo::before`).

## Lo que manda el servidor

- **Contenido**: los campos se llaman igual en los dos idiomas y llegan en el de la app: `es` (significado), `frase_es`, `alt`, `matiz`, `mnemo`, `gramatica[].nota/titulo`, `clave`, `nombre`, `forma`, `mnemo_lectura`, `nota`. En inglés, `es` y `frase_es` son el `en` y `frase_en` de tu Kaishi: no pintes `it.en` al lado de `it.es` (saldría repetido). Lo que no existe en inglés llega vacío: no lo pintes.
- **Gramática**: en inglés solo existen las lecciones de `contenido/gramatica/en/`; las que faltan no aparecen (ni sus tarjetas en el repaso).
- **Juego**: regiones, rangos, equipo, títulos, misiones, notas y el catálogo (nombre y descripción de objetos y jefes) salen de `contenido/juego/textos.<idioma>.json`, por id.
- **Errores**: `{error, clave, datos}`. `error` ya viene traducido (lo que enseña `api()` en `e.message`); si prefieres traducir en el cliente: `t('srv.' + clave, datos)`.
- **Repaso**: `siguiente` («10 min», «3 days») ya viene traducido; `siguiente_seg` trae los segundos por si quieres formatearlo tú. Los enunciados de las tarjetas de gramática («Completa el hueco» · «Fill in the blank») también llegan traducidos.
- **Corrección**: `compararSignificado()` de `japones.js` usa las reglas del idioma de la app (en inglés: a/an/the, «to», «to be/get/become», posesivos, contracciones, ortografía británica o americana, plural simple y, como en español, nunca vale el significado de otra tarjeta como errata).

## Pendiente (ronda 2)

`estudio.js`, `gramatica.js`, `recompensas.js` y `jefe.js` siguen con los textos en español dentro del código. Al pasarlos:

1. Importa `t`/`tn` de `./i18n.js` y cambia cada cadena por su clave (prefijos `estudio.`, `gramatica.`, `recompensas.`, `jefe.`).
2. Añade las claves a `es.json` (el texto de ahora, igual) y a `en.json`.
3. Plurales hechos a mano → `tn()`. Frases partidas con `<b>` → una clave con marcadores.
4. Ojo con: la pista «en español» y el placeholder «significado…» de `estudio.js`; «Casi: «…»»; `p.en` pintado junto al significado; `toast(err.message)` ya sale traducido.
5. `node web/i18n/revisar.mjs` (mismas claves, marcadores y etiquetas en los dos idiomas; toda clave usada existe) y prueba con `?lang=en`: ningún aviso `i18n:` en la consola.
