// Marca Nyango (ニャン語 · «el idioma de los gatos»): la cara de Mochi como pegatina de vinilo.
// node generar.mjs          → escribe los SVG de esta carpeta
// node generar.mjs --png    → además los pasa a PNG con Edge sin ventana (letras de Google Fonts incluidas)
// Colores: naranja de marca #f2661b, canto #b8470f, crema #fff7e8, tinta #231811. Letras: Mochiy Pop One y Fredoka.
import { writeFileSync, mkdtempSync, readFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { join, dirname, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { icono } from './icono-sol.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const C = { naranja: '#f2661b', naranjaLuz: '#ff8a45', canto: '#b8470f', crema: '#fff7e8', cremaCanto: '#d9c29a', tinta: '#231811', calico: '#f39a3a', oscuro: '#3d2a1d', rosa: '#f5b3a6', rubor: '#f59a9a', marron: '#5b3818', melocoton: '#fcd6a6', melocotonNar: '#f7c79a' };
const FUENTES = "@import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Mochiy+Pop+One&display=block');";

// ── geometría de la cara (caja de 256) ──
// Remodelado el 29-09 con el 3D: cabeza en campana ( ancha y redonda abajo, coronilla ancha y
// casi plana) y orejas grandes cuyo borde de fuera CONTINÚA el lado de la cabeza, con la punta hacia dentro.
// La marca es UNA: la oreja de su derecha, naranja entera. Fuera la mancha de calicó y la punta oscura.
const CABEZA = 'M46 94 C72 84 184 84 210 94 C230 102 238 146 236 176 C233 214 190 230 128 230 C66 230 23 214 20 176 C18 146 26 102 46 94 Z';
const OREJA_I = 'M24 150 C26 108 40 64 58 36 C62 29 70 28 75 33 C95 54 112 74 128 98 Z';
const OREJA_D = 'M232 150 C230 108 216 64 198 36 C194 29 186 28 181 33 C161 54 144 74 128 98 Z';
const DENTRO_I = 'M44 118 C47 94 55 70 64 56 C78 71 92 86 104 102 C86 106 62 111 44 118 Z';
const DENTRO_D = 'M212 118 C209 94 201 70 192 56 C178 71 164 86 152 102 C170 106 194 111 212 118 Z';
const silueta = (attrs) => `<g ${attrs}><path d="${OREJA_I}"/><path d="${OREJA_D}"/><path d="${CABEZA}"/></g>`;

// id: prefijo único (varias caras en un mismo documento no deben compartir ids)
function cara(id, { borde = true, detalle = true, trazo = 10 } = {}) {
  return `<g class="cara">
  <defs>
    <clipPath id="${id}-cab"><path d="${CABEZA}"/></clipPath>
    <clipPath id="${id}-od"><path d="${OREJA_D}"/></clipPath>
    <radialGradient id="${id}-vol" cx=".42" cy=".3" r=".8"><stop offset=".55" stop-color="#7a4a1c" stop-opacity="0"/><stop offset="1" stop-color="#7a4a1c" stop-opacity=".2"/></radialGradient>
  </defs>
  ${borde ? `${silueta(`transform="translate(0 7)" fill="${C.cremaCanto}" stroke="${C.cremaCanto}" stroke-width="34" stroke-linejoin="round"`)}
  ${silueta(`fill="${C.crema}" stroke="${C.crema}" stroke-width="34" stroke-linejoin="round"`)}` : ''}
  ${silueta(`fill="${C.tinta}" stroke="${C.tinta}" stroke-width="${trazo}" stroke-linejoin="round"`)}
  <path d="${OREJA_I}" fill="${C.calico}"/><path d="${DENTRO_I}" fill="${C.melocotonNar}"/>
  <path d="${OREJA_D}" fill="#fffaf2"/><path d="${DENTRO_D}" fill="${C.melocoton}"/>
  <path d="${CABEZA}" fill="#fffaf2"/>
  <g clip-path="url(#${id}-cab)"><path d="${CABEZA}" fill="url(#${id}-vol)"/></g>
  ${detalle ? '<path d="M58 110 C72 92 94 82 116 79" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="7" stroke-linecap="round"/>' : ''}
  <ellipse cx="92" cy="150" rx="12.5" ry="16.5" fill="${C.tinta}"/><ellipse cx="164" cy="150" rx="12.5" ry="16.5" fill="${C.tinta}"/>
  <circle cx="87.5" cy="143" r="5.5" fill="#fff"/><circle cx="159.5" cy="143" r="5.5" fill="#fff"/>
  ${detalle ? '<circle cx="96.5" cy="158" r="2.4" fill="#fff"/><circle cx="168.5" cy="158" r="2.4" fill="#fff"/>' : ''}
  <ellipse cx="60" cy="178" rx="18" ry="10.5" fill="${C.rubor}"/><ellipse cx="196" cy="178" rx="18" ry="10.5" fill="${C.rubor}"/>
  ${detalle ? `<g stroke="#fff" stroke-opacity=".85" stroke-width="3" stroke-linecap="round"><path d="M53 173 l-4 8 M61 173 l-4 8 M69 173 l-4 8 M189 173 l-4 8 M197 173 l-4 8 M205 173 l-4 8"/></g>` : ''}
  <path d="M113 171 Q120.5 183 128 172 Q135.5 183 143 171" fill="none" stroke="${C.tinta}" stroke-width="${detalle ? 5.5 : 8}" stroke-linecap="round" stroke-linejoin="round"/>
</g>`;
}

const svg = (w, h, cuerpo, { fuentes = false, titulo = 'Nyango' } = {}) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${titulo}">
<title>${titulo}</title>${fuentes ? `\n<style>${FUENTES}</style>` : ''}
${cuerpo}
</svg>
`;

// palabra de caja de juguete: sombra marrón + contorno crema + relleno naranja
function palabra(texto, x, y, t, { ancla = 'start', borde = 0.2, prof = 0.07, familia = 'Mochiy Pop One' } = {}) {
  const a = `x="${x}" y="${y}" font-family="'${familia}', 'Zen Maru Gothic', sans-serif" font-size="${t}" text-anchor="${ancla}" stroke-linejoin="round" paint-order="stroke fill"`;
  return `<text ${a} transform="translate(0 ${t * prof})" fill="${C.marron}" stroke="${C.marron}" stroke-width="${t * borde}">${texto}</text>
<text ${a} fill="${C.naranja}" stroke="${C.crema}" stroke-width="${t * borde}">${texto}</text>`;
}
// etiqueta ニャン語 como pegatina inclinada
const etiqueta = (x, y, t, giro = -6) => `<g transform="translate(${x} ${y}) rotate(${giro})">
  <rect x="${-t * 2.35}" y="${-t * 0.78 + t * 0.14}" width="${t * 4.7}" height="${t * 1.56}" rx="${t * 0.5}" fill="${C.canto}"/>
  <rect x="${-t * 2.35}" y="${-t * 0.78}" width="${t * 4.7}" height="${t * 1.56}" rx="${t * 0.5}" fill="${C.naranja}" stroke="${C.crema}" stroke-width="${t * 0.2}"/>
  <text x="0" y="${t * 0.36}" text-anchor="middle" font-family="'Mochiy Pop One', sans-serif" font-size="${t}" fill="${C.crema}">ニャン語</text>
</g>`;

// ── piezas ──
const archivos = {};
archivos['cara.svg'] = svg(256, 256, `<g transform="translate(0 -6)">${cara('c')}</g>`, { titulo: 'Mochi' });
archivos['icono.svg'] = icono('i');
archivos['icono-mini.svg'] = icono('m', { mini: true });
archivos['icono-cara.svg'] = icono('i');
archivos['logo-horizontal.svg'] = svg(880, 280, `<g transform="translate(6 10)">${cara('h')}</g>
${palabra('Nyango', 272, 196, 132)}
${etiqueta(760, 58, 30, 7)}`, { fuentes: true, titulo: 'Nyango · ニャン語' });
archivos['logo-apilado.svg'] = svg(620, 600, `<g transform="translate(310 150) scale(1.08) translate(-128 -140)">${cara('a')}</g>
${palabra('Nyango', 310, 430, 124, { ancla: 'middle' })}
${etiqueta(310, 492, 26, -3)}
<text x="310" y="572" text-anchor="middle" font-family="'Fredoka', sans-serif" font-weight="700" font-size="30" fill="${C.marron}">Habla en miau, habla japonés</text>`, { fuentes: true, titulo: 'Nyango · Habla en miau, habla japonés' });

for (const [n, t] of Object.entries(archivos)) writeFileSync(join(AQUI, n), t);
console.log('SVG:', Object.keys(archivos).join(', '));

// ── PNG con Edge (fondo transparente) ──
if (process.argv.includes('--png')) {
  const EDGE = process.platform === 'win32' ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' : (process.env.NAVEGADOR || '/usr/bin/chromium');
  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
  const puerto = 9300 + Math.floor(Math.random() * 150), perfil = mkdtempSync(join(tmpdir(), 'marca-'));
  const edge = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${puerto}`, `--user-data-dir=${perfil}`, '--window-size=1000,1000', 'about:blank'], { stdio: 'ignore' });
  let d; for (let i = 0; i < 80 && !d; i++) { try { d = (await (await fetch(`http://127.0.0.1:${puerto}/json`)).json()).find((t) => t.type === 'page'); } catch {} if (!d) await esperar(250); }
  const ws = new WebSocket(d.webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let n = 0; const p = new Map();
  ws.addEventListener('message', (m) => { const x = JSON.parse(m.data); if (x.id && p.has(x.id)) { p.get(x.id)(x); p.delete(x.id); } });
  const cdp = (method, params = {}) => new Promise((r) => { const id = ++n; p.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
  await cdp('Page.enable'); await cdp('Page.bringToFront');
  await cdp('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
  // [svg, png, ancho, alto]
  const trabajos = [
    ['icono.svg', 'icono-256.png', 256, 256], ['icono.svg', 'icono-512.png', 512, 512], ['icono.svg', 'icono-128.png', 128, 128],
    ['icono-mini.svg', 'icono-64.png', 64, 64], ['icono-mini.svg', 'icono-48.png', 48, 48], ['icono-mini.svg', 'icono-32.png', 32, 32], ['icono-mini.svg', 'icono-24.png', 24, 24], ['icono-mini.svg', 'icono-16.png', 16, 16],
    ['cara.svg', 'cara-256.png', 256, 256], ['logo-horizontal.svg', 'logo-horizontal.png', 1760, 560], ['logo-apilado.svg', 'logo-apilado.png', 1240, 1200],
  ];
  for (const [s, png, w, h] of trabajos) {
    const html = `<!doctype html><html><head><style>${FUENTES} html,body{margin:0;background:transparent;overflow:hidden} ::-webkit-scrollbar{display:none} svg{display:block}</style></head><body>${archivos[s].replace(/<\?xml[^>]*>/, '').replace(/width="\d+" height="\d+"/, `width="${w}" height="${h}"`)}</body></html>`;
    const tmp = join(perfil, basename(png) + '.html'); writeFileSync(tmp, html);
    await cdp('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
    await cdp('Page.navigate', { url: pathToFileURL(tmp).href }); await esperar(1600);
    await cdp('Runtime.evaluate', { expression: 'document.fonts.ready.then(() => 1)', awaitPromise: true });
    const r = await cdp('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: w, height: h, scale: 1 } });
    writeFileSync(join(AQUI, png), Buffer.from(r.result.data, 'base64'));
    console.log('PNG:', png);
  }
  edge.kill(); if (process.platform === 'win32') spawnSync('powershell', ['-NoProfile', '-Command', `Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -like '*${basename(perfil)}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`], { stdio: 'ignore' });
  process.exit(0);
}
