// app.css ya no bloquea el primer pintado (index.html: la pantalla de carga sale al instante con su estilo en línea).
// app.js importa esto lo PRIMERO: su espera de nivel superior retiene la app hasta tener la hoja, para que nada se mida sin estilo.
// y a temas.css (los tokens de color, letra y forma del tema), que va detrás en el mismo cargador
for (const hoja of ['css-app', 'css-temas'].map((id) => document.getElementById(id))) {
  if (hoja && !hoja.sheet) await new Promise((ok) => { hoja.addEventListener('load', ok, { once: true }); hoja.addEventListener('error', ok, { once: true }); setTimeout(ok, 10000); });
  if (hoja) hoja.media = 'all';
}
if (window.__t) window.__t.css = performance.now();
