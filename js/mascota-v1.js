// Mochi: la mascota 3D (Three.js). Un gatito de plastilina sobre una isla flotante que va ganando equipo.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const PIEL = 0xf6eee0, ROSA = 0xf2a2b0, TINTA = 0x241e1b;

function material(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.78, metalness: 0, ...extra });
}
function esfera(r, mat, seg = 40) { return new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75)), mat); }
function capsula(r, largo, mat) { return new THREE.Mesh(new THREE.CapsuleGeometry(r, largo, 12, 28), mat); }
function tubo(puntos, r, mat, seg = 40) {
  const curva = new THREE.CatmullRomCurve3(puntos.map((p) => new THREE.Vector3(...p)));
  return new THREE.Mesh(new THREE.TubeGeometry(curva, seg, r, 14, false), mat);
}
function sombrear(obj) { obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return obj; }

// Desplaza vértices con ruido suave para que nada parezca de ordenador
function abollar(geo, fuerza = 0.04, escala = 2.1) {
  const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = Math.sin(v.x * escala * 1.7 + v.z * 0.9) * Math.cos(v.y * escala * 1.3 - v.x) + Math.sin(v.z * escala * 2.3 + v.y * 1.1) * 0.5;
    v.addScaledVector(v.clone().normalize(), n * fuerza);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

function crearGato() {
  const gato = new THREE.Group();
  const piel = material(PIEL, { roughness: 0.85 });
  const rosa = material(ROSA, { roughness: 0.7 });
  const tinta = new THREE.MeshStandardMaterial({ color: TINTA, roughness: 0.25, metalness: 0.1 });
  const blanco = new THREE.MeshBasicMaterial({ color: 0xffffff });

  // cuerpo
  const cuerpo = capsula(0.52, 0.42, piel); cuerpo.position.y = 0.72; cuerpo.scale.set(1, 1, 0.9);
  gato.add(cuerpo);
  const barriga = esfera(0.4, material(0xfffaf1)); barriga.position.set(0, 0.62, 0.3); barriga.scale.set(0.9, 1, 0.45);
  gato.add(barriga);
  // patas
  const patas = [];
  for (const x of [-0.26, 0.26]) {
    const pata = esfera(0.2, piel); pata.position.set(x, 0.14, 0.14); pata.scale.set(1, 0.72, 1.25);
    gato.add(pata); patas.push(pata);
    const almohadilla = esfera(0.075, rosa, 20); almohadilla.position.set(x, 0.08, 0.37); almohadilla.scale.set(1, 0.7, 0.4);
    gato.add(almohadilla);
  }
  // brazos
  const brazos = [];
  for (const s of [-1, 1]) {
    const hombro = new THREE.Group(); hombro.position.set(0.44 * s, 0.98, 0.05);
    const brazo = capsula(0.14, 0.26, piel); brazo.position.set(0.06 * s, -0.2, 0.06); brazo.rotation.z = 0.28 * s;
    hombro.add(brazo); gato.add(hombro); brazos.push(hombro);
  }
  // cola
  const cola = new THREE.Group(); cola.position.set(0, 0.45, -0.42);
  const colaMalla = tubo([[0, 0, 0], [0.05, 0.25, -0.3], [0.35, 0.65, -0.42], [0.55, 0.95, -0.2], [0.5, 1.12, 0.02]], 0.1, piel);
  cola.add(colaMalla);
  const punta = esfera(0.1, piel, 20); punta.position.set(0.5, 1.12, 0.02); cola.add(punta);
  gato.add(cola);

  // cabeza
  const cabeza = new THREE.Group(); cabeza.position.y = 1.72;
  const craneo = new THREE.Mesh(abollar(new THREE.SphereGeometry(0.86, 64, 48), 0.012), piel);
  craneo.scale.set(1.12, 0.9, 0.98);
  cabeza.add(craneo);
  const orejas = [];
  for (const s of [-1, 1]) {
    const oreja = new THREE.Group(); oreja.position.set(0.55 * s, 0.5, 0.02); oreja.rotation.z = -0.5 * s; oreja.rotation.x = -0.12;
    const cono = new THREE.Mesh(abollar(new THREE.ConeGeometry(0.36, 0.62, 40, 4), 0.02, 3), piel); cono.position.y = 0.22; cono.scale.z = 0.62;
    const interior = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.42, 40, 1), rosa); interior.position.set(0, 0.17, 0.1); interior.scale.z = 0.35;
    oreja.add(cono, interior); cabeza.add(oreja); orejas.push(oreja);
  }
  // cara
  const ojos = [];
  for (const s of [-1, 1]) {
    const ojo = new THREE.Group(); ojo.position.set(0.34 * s, 0.02, 0.77);
    const globo = esfera(0.15, tinta, 32); globo.scale.set(0.82, 1.08, 0.45);
    const brillo = esfera(0.045, blanco, 16); brillo.position.set(0.045 * s, 0.06, 0.06);
    const brillo2 = esfera(0.02, blanco, 12); brillo2.position.set(-0.04 * s, -0.05, 0.06);
    ojo.add(globo, brillo, brillo2); cabeza.add(ojo); ojos.push(ojo);
    const moflete = esfera(0.13, material(0xf5a0a0, { transparent: true, opacity: 0.6 }), 24); moflete.position.set(0.56 * s, -0.2, 0.62); moflete.scale.set(1, 0.6, 0.3);
    cabeza.add(moflete);
  }
  const nariz = esfera(0.05, rosa, 16); nariz.position.set(0, -0.1, 0.87); nariz.scale.set(1.3, 0.8, 0.8); cabeza.add(nariz);
  const boca = new THREE.Group(); boca.position.set(0, -0.2, 0.86);
  for (const s of [-1, 1]) boca.add(tubo([[0, 0.05, 0], [0.04 * s, -0.02, 0.01], [0.1 * s, 0.01, -0.01]], 0.013, tinta, 12));
  cabeza.add(boca);
  for (const s of [-1, 1]) for (const k of [0, 1]) {
    const bigote = tubo([[0.62 * s, -0.08 - k * 0.08, 0.6], [0.9 * s, -0.04 - k * 0.12, 0.55], [1.12 * s, 0.02 - k * 0.18, 0.44]], 0.008, material(0xcfc4b3), 10);
    cabeza.add(bigote);
  }
  gato.add(cabeza);
  return { gato, cabeza, cuerpo, ojos, orejas, cola, brazos, patas, boca };
}

// ─── equipo: cada pieza se desbloquea con el progreso ───
function crearEquipo(g) {
  const piezas = {};
  const rojo = material(0xd8412a, { roughness: 0.6 });
  const anyil = material(0x2c3a66, { roughness: 0.7 });
  const oro = material(0xe8b54a, { roughness: 0.3, metalness: 0.75 });
  const hierro = material(0x8e2a22, { roughness: 0.28, metalness: 0.15 });
  const negroLaca = material(0x22191a, { roughness: 0.3, metalness: 0.2 });
  const madera = material(0xa0703f, { roughness: 0.8 });

  // 1 · bufanda
  const bufanda = new THREE.Group();
  const anillo = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.09, 16, 48), rojo); anillo.rotation.x = Math.PI / 2; anillo.position.y = 1.08;
  const caida = capsula(0.07, 0.3, rojo); caida.position.set(0.22, 0.86, 0.36); caida.rotation.z = 0.35;
  bufanda.add(anillo, caida); piezas.bufanda = bufanda;

  // 2 · hachimaki (cinta de la frente)
  const hachimaki = new THREE.Group();
  const cinta = new THREE.Mesh(new THREE.TorusGeometry(1, 0.052, 14, 72), material(0xfaf6ee)); cinta.rotation.x = Math.PI / 2 + 0.2; cinta.position.set(0, 0.3, 0.01); cinta.scale.set(0.905, 0.8, 1);
  const sol = new THREE.Mesh(new THREE.CircleGeometry(0.11, 32), rojo); sol.position.set(0, 0.2, 0.845); sol.rotation.x = -0.35;
  const lazo1 = capsula(0.05, 0.36, material(0xfaf6ee)); lazo1.position.set(0.12, 0.36, -0.82); lazo1.rotation.set(0.6, 0, 0.9);
  const lazo2 = lazo1.clone(); lazo2.position.x = -0.12; lazo2.rotation.z = -0.9;
  hachimaki.add(cinta, sol, lazo1, lazo2); piezas.hachimaki = hachimaki;

  // 3 · haori (chaqueta)
  const haori = new THREE.Group();
  const tela = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.66, 0.66, 40, 1, true, 0.42, Math.PI * 2 - 0.84), anyil);
  tela.position.y = 0.72; tela.material.side = THREE.DoubleSide;
  const ribete = new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.03, 8, 60, Math.PI * 1.64), material(0xf1e6cf)); ribete.rotation.set(Math.PI / 2, 0, -Math.PI / 2 + 0.42 + Math.PI * 0.18); ribete.position.y = 0.39;
  const mon = new THREE.Mesh(new THREE.CircleGeometry(0.1, 32), material(0xf1e6cf)); mon.position.set(-0.47, 0.86, 0.26); mon.rotation.y = -1.05;
  haori.add(tela, ribete, mon); piezas.haori = haori;

  // 4 · bokken (espada de madera, a la espalda)
  const bokken = new THREE.Group();
  const hoja = capsula(0.05, 1.3, madera); hoja.scale.z = 0.5;
  const tsuba = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 24), material(0x3b2a1e)); tsuba.position.y = -0.5;
  bokken.add(hoja, tsuba); bokken.position.set(0.2, 1.0, -0.5); bokken.rotation.z = 0.7; piezas.bokken = bokken;

  // 5 · kabuto (casco) con media luna dorada
  const kabuto = new THREE.Group();
  const cupula = new THREE.Mesh(new THREE.SphereGeometry(0.94, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.5), hierro); cupula.scale.set(1.12, 0.78, 1.02); cupula.position.y = 0.2;
  const ala = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.26, 0.12, 48, 1, true), negroLaca); ala.position.set(0, 0.16, -0.08); ala.material.side = THREE.DoubleSide;
  const luna = new THREE.Shape(); luna.absarc(0, 0, 0.46, Math.PI * 1.02, Math.PI * 1.98, false); luna.absarc(0, 0.16, 0.4, Math.PI * 1.9, Math.PI * 1.1, true);
  const maedate = new THREE.Mesh(new THREE.ExtrudeGeometry(luna, { depth: 0.04, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 3 }), oro);
  maedate.position.set(0, 0.86, 0.7); maedate.rotation.x = -0.35; maedate.scale.set(1.25, 1.1, 1);
  const remate = new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.035, 10, 64), oro); remate.rotation.x = Math.PI / 2; remate.position.y = 0.2; remate.scale.set(1.1, 1, 1);
  kabuto.add(remate);
  kabuto.add(cupula, ala, maedate); piezas.kabuto = kabuto;

  // 6 · katana dorada en la mano
  const katana = new THREE.Group();
  const filo = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.25, 0.012), material(0xe9eef3, { metalness: 0.65, roughness: 0.18 })); filo.position.y = 0.72;
  const empu = capsula(0.045, 0.3, material(0x2a2140)); empu.position.y = -0.05;
  const guarda = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.025, 10, 24), oro); guarda.rotation.x = Math.PI / 2; guarda.position.y = 0.12;
  katana.add(filo, empu, guarda); katana.position.set(0.66, 0.66, 0.34); katana.rotation.set(0.3, 0, -0.5); piezas.katana = katana;

  // 7 · capa
  const capaGeo = new THREE.PlaneGeometry(1.25, 1.35, 16, 16);
  const capa = new THREE.Mesh(capaGeo, material(0x7a2436, { side: THREE.DoubleSide, roughness: 0.65 }));
  capa.position.set(0, 0.62, -0.5); capa.rotation.x = 0.12; capa.userData.base = capaGeo.attributes.position.array.slice(); piezas.capa = capa;

  // 8 · aura de kotodama (kanji que orbitan)
  const aura = new THREE.Group(); piezas.aura = aura;

  for (const [nombre, pieza] of Object.entries(piezas)) {
    sombrear(pieza); pieza.visible = false;
    if (['hachimaki', 'kabuto'].includes(nombre)) g.cabeza.add(pieza); else g.gato.add(pieza);
  }
  return piezas;
}

function crearIsla() {
  const isla = new THREE.Group();
  const hierba = material(0x9bb05a, { roughness: 0.95 });
  const tierra = material(0x8a6a4c, { roughness: 1 });
  const piedra = material(0xb9ae98, { roughness: 0.9 });
  const cima = new THREE.Mesh(abollar(new THREE.CylinderGeometry(2.6, 2.5, 0.34, 64, 3), 0.05, 1.4), hierba); cima.position.y = -0.17;
  const roca = new THREE.Mesh(abollar(new THREE.ConeGeometry(2.45, 2.6, 48, 6), 0.16, 1.7), tierra); roca.rotation.x = Math.PI; roca.position.y = -1.6;
  isla.add(cima, roca);
  // piedras del camino
  for (const [x, z, s] of [[0.2, 1.5, 0.28], [-0.35, 1.9, 0.22], [0.55, 2.1, 0.18], [1.4, 0.9, 0.2]]) {
    const p = new THREE.Mesh(abollar(new THREE.SphereGeometry(s, 16, 12), 0.03), piedra); p.scale.y = 0.35; p.position.set(x, 0.02, z); isla.add(p);
  }
  // torii
  const torii = new THREE.Group(); const bermellon = material(0xd9432b, { roughness: 0.6 }); const negro = material(0x2a2522);
  for (const x of [-0.55, 0.55]) { const pilar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 1.5, 16), bermellon); pilar.position.set(x, 0.75, 0); torii.add(pilar); }
  const kasagi = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.11, 0.16), negro); kasagi.position.y = 1.55;
  const shimaki = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.09, 0.14), bermellon); shimaki.position.y = 1.44;
  const nuki = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.07, 0.1), bermellon); nuki.position.y = 1.18;
  torii.add(kasagi, shimaki, nuki); torii.position.set(-1.35, 0, -1.05); torii.rotation.y = 0.5; isla.add(torii);
  // cerezo
  const arbol = new THREE.Group();
  const tronco = tubo([[0, 0, 0], [0.05, 0.6, 0], [-0.1, 1.1, 0.05], [0.05, 1.5, 0]], 0.1, material(0x6e4a36), 20); arbol.add(tronco);
  const flor = material(0xf5b9c8, { roughness: 0.9 });
  for (const [x, y, z, r] of [[0, 1.75, 0, 0.62], [0.45, 1.55, 0.15, 0.45], [-0.45, 1.6, -0.1, 0.48], [0.1, 2.1, -0.15, 0.42], [-0.15, 1.5, 0.4, 0.38]]) {
    const copa = new THREE.Mesh(abollar(new THREE.IcosahedronGeometry(r, 6), 0.05, 3), flor); copa.position.set(x, y, z); arbol.add(copa);
  }
  arbol.position.set(1.55, 0, -0.9); arbol.scale.setScalar(0.95); isla.add(arbol);
  // farol de piedra
  const farol = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.3, 6), piedra); base.position.y = 0.15;
  const caja = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.24, 0.28), piedra); caja.position.y = 0.45;
  const luz = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.3), new THREE.MeshBasicMaterial({ color: 0xffd98a })); luz.position.y = 0.45;
  const techo = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.2, 6), piedra); techo.position.y = 0.66;
  farol.add(base, caja, luz, techo); farol.position.set(-1.6, 0, 0.8); isla.add(farol);
  // matas de hierba
  for (let i = 0; i < 26; i++) {
    const a = Math.random() * Math.PI * 2, r = 0.9 + Math.random() * 1.5;
    const mata = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22 + Math.random() * 0.15, 5), material(0x7f9a44)); mata.position.set(Math.cos(a) * r, 0.1, Math.sin(a) * r); isla.add(mata);
  }
  return sombrear(isla);
}

function crearPetalos(n = 40) {
  const geo = new THREE.PlaneGeometry(0.09, 0.06);
  const mat = new THREE.MeshStandardMaterial({ color: 0xf8c3cf, side: THREE.DoubleSide, roughness: 0.9 });
  const malla = new THREE.InstancedMesh(geo, mat, n);
  const datos = Array.from({ length: n }, () => ({ x: (Math.random() - 0.5) * 7, y: Math.random() * 5 - 0.5, z: (Math.random() - 0.5) * 5, v: 0.15 + Math.random() * 0.25, g: Math.random() * 6, s: 0.6 + Math.random() * 0.8 }));
  return { malla, datos };
}

export class Mascota {
  constructor(lienzo, { isla = true, equipo = 0, compacta = false } = {}) {
    this.lienzo = lienzo;
    this.render = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.render.setPixelRatio(Math.min(2, devicePixelRatio || 1));
    this.render.shadowMap.enabled = true; this.render.shadowMap.type = THREE.PCFSoftShadowMap;
    this.render.toneMapping = THREE.ACESFilmicToneMapping; this.render.toneMappingExposure = 1.05;
    this.render.outputColorSpace = THREE.SRGBColorSpace;
    this.escena = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(this.render);
    this.escena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.escena.environmentIntensity = 0.35;
    this.camara = new THREE.PerspectiveCamera(compacta ? 30 : 32, 1, 0.1, 100);
    this.base = compacta ? new THREE.Vector3(0, 1.5, 7.2) : new THREE.Vector3(0, 3.1, 16.5);
    this.mira = compacta ? new THREE.Vector3(0, 1.2, 0) : new THREE.Vector3(0, 0.75, 0);
    this.camara.position.copy(this.base);

    this.escena.add(new THREE.HemisphereLight(0xfff4e0, 0x5f6d3a, 1.25));
    const sol = new THREE.DirectionalLight(0xffe2b8, 2.3);
    sol.position.set(4, 7, 5); sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048); sol.shadow.radius = 6; sol.shadow.bias = -0.0004;
    Object.assign(sol.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 20 });
    this.escena.add(sol);
    const contra = new THREE.DirectionalLight(0xbfe0ff, 1.1); contra.position.set(-5, 3, -4); this.escena.add(contra);

    this.mundo = new THREE.Group(); this.escena.add(this.mundo);
    if (isla) { this.isla = crearIsla(); this.mundo.add(this.isla); this.petalos = crearPetalos(); this.escena.add(this.petalos.malla); }
    else {
      const suelo = new THREE.Mesh(new THREE.CircleGeometry(2, 48), new THREE.ShadowMaterial({ opacity: 0.18 }));
      suelo.rotation.x = -Math.PI / 2; suelo.receiveShadow = true; this.mundo.add(suelo);
    }
    this.g = crearGato(); sombrear(this.g.gato); this.mundo.add(this.g.gato);
    this.g.gato.position.set(0.1, 0, 0.35);
    this.piezas = crearEquipo(this.g);
    this.equipar(equipo, false);

    this.raton = new THREE.Vector2(); this.t0 = performance.now(); this.parpadeo = 2; this.gesto = null;
    addEventListener('pointermove', (e) => { this.raton.set((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1); });
    this.ajustar(); new ResizeObserver(() => this.ajustar()).observe(lienzo);
    this.bucle = this.bucle.bind(this); requestAnimationFrame(this.bucle);
  }
  ajustar() {
    const w = this.lienzo.clientWidth, h = this.lienzo.clientHeight;
    if (!w || !h) return;
    this.render.setSize(w, h, false); this.camara.aspect = w / h; this.camara.updateProjectionMatrix();
  }
  // nivel de equipo: 0 nada … 8 aura
  equipar(nivel, animar = true) {
    const orden = ['bufanda', 'hachimaki', 'haori', 'bokken', 'kabuto', 'katana', 'capa', 'aura'];
    orden.forEach((n, i) => {
      const p = this.piezas[n], antes = p.visible; p.visible = i < nivel;
      if (animar && p.visible && !antes) { p.scale.setScalar(0.01); this.gesto = { tipo: 'equipo', t: 0, pieza: p }; }
    });
    this.nivelEquipo = nivel;
  }
  celebrar() { this.gesto = { tipo: 'salto', t: 0 }; }
  apenado() { this.gesto = { tipo: 'pena', t: 0 }; }
  saludar() { this.gesto = { tipo: 'saludo', t: 0 }; }
  destruir() { this.muerta = true; this.render.dispose(); }
  expresion(nombre, ms) { this.cara = nombre; if (ms) setTimeout(() => { this.cara = 'normal'; }, ms); }
  bucle(ms) {
    if (this.muerta) return;
    requestAnimationFrame(this.bucle);
    if (this.lienzo.getClientRects().length === 0 || this.lienzo.closest('.vista:not(.activa)')) { this.ult = ms; return; }
    const t = (ms - this.t0) / 1000, dt = Math.min(0.05, (ms - (this.ult || ms)) / 1000); this.ult = ms;
    const g = this.g;
    // respiración, cola, orejas
    g.cuerpo.scale.y = 1 + Math.sin(t * 2.2) * 0.025;
    g.cabeza.position.y = 1.72 + Math.sin(t * 2.2) * 0.02;
    g.cola.rotation.y = Math.sin(t * 1.6) * 0.35; g.cola.rotation.z = Math.sin(t * 1.1) * 0.12;
    g.orejas.forEach((o, i) => { o.rotation.x = -0.08 + (Math.sin(t * 7 + i) > 0.985 ? -0.25 : 0); });
    // parpadeo
    this.parpadeo -= dt;
    const cerrado = this.parpadeo < 0.12;
    g.ojos.forEach((o) => { o.scale.y = cerrado ? 0.12 : 1; });
    if (this.parpadeo < 0) this.parpadeo = 2 + Math.random() * 3;
    // la cabeza sigue al ratón
    const objY = this.raton.x * 0.45, objX = this.raton.y * 0.22;
    g.cabeza.rotation.y += (objY - g.cabeza.rotation.y) * 0.08;
    g.cabeza.rotation.x += (objX - g.cabeza.rotation.x) * 0.08;
    // gestos
    let salto = 0;
    if (this.gesto) {
      const G = this.gesto; G.t += dt;
      if (G.tipo === 'salto') { const u = G.t / 0.7; salto = Math.sin(Math.min(1, u) * Math.PI) * 0.55; g.brazos.forEach((b, i) => { b.rotation.z = (i ? -1 : 1) * -Math.sin(Math.min(1, u) * Math.PI) * 2.2; }); if (u >= 1) this.gesto = null; }
      else if (G.tipo === 'pena') { const u = G.t / 1.1; g.cabeza.rotation.x = 0.35 * Math.sin(Math.min(1, u) * Math.PI); g.orejas.forEach((o, i) => { o.rotation.z = (i ? -1 : 1) * (0.42 + 0.5 * Math.sin(Math.min(1, u) * Math.PI)); }); if (u >= 1) { this.gesto = null; g.orejas.forEach((o, i) => { o.rotation.z = (i ? -0.42 : 0.42); }); } }
      else if (G.tipo === 'saludo') { const u = G.t / 1.4; g.brazos[1].rotation.z = -2.4 * Math.sin(Math.min(1, u) * Math.PI) + Math.sin(G.t * 16) * 0.25 * Math.sin(Math.min(1, u) * Math.PI); if (u >= 1) { this.gesto = null; g.brazos[1].rotation.z = 0; } }
      else if (G.tipo === 'equipo') { const u = Math.min(1, G.t / 0.8); const e = 1 + 2.7 * Math.pow(u - 1, 3) + 1.7 * Math.pow(u - 1, 2); G.pieza.scale.setScalar(Math.max(0.01, e)); salto = Math.sin(u * Math.PI) * 0.3; if (u >= 1) { G.pieza.scale.setScalar(1); this.gesto = null; } }
    } else { g.brazos.forEach((b) => { b.rotation.z *= 0.85; }); }
    g.gato.position.y = salto;
    // capa ondeando
    const capa = this.piezas.capa;
    if (capa.visible) {
      const p = capa.geometry.attributes.position, b = capa.userData.base;
      for (let i = 0; i < p.count; i++) { const y = b[i * 3 + 1], x = b[i * 3]; const f = (0.675 - y) / 1.35; p.setZ(i, -Math.sin(t * 2.4 + x * 2 + y * 3) * 0.06 * f - f * f * 0.25); p.setX(i, x * (1 + f * 0.25)); }
      p.needsUpdate = true; capa.geometry.computeVertexNormals();
    }
    // pétalos
    if (this.petalos) {
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), pos = new THREE.Vector3();
      this.petalos.datos.forEach((d, i) => {
        d.y -= d.v * dt; d.x += Math.sin(t + d.g) * 0.2 * dt; if (d.y < -1) { d.y = 4.5; d.x = (Math.random() - 0.5) * 7; }
        e.set(t * d.s + d.g, t * 0.7 * d.s, d.g); q.setFromEuler(e); pos.set(d.x, d.y, d.z); s.setScalar(1);
        m.compose(pos, q, s); this.petalos.malla.setMatrixAt(i, m);
      });
      this.petalos.malla.instanceMatrix.needsUpdate = true;
    }
    // isla flotando y cámara con paralaje suave
    this.mundo.position.y = Math.sin(t * 0.8) * 0.08;
    this.mundo.rotation.y = Math.sin(t * 0.15) * 0.12 + this.raton.x * 0.12;
    this.camara.position.x = this.base.x + this.raton.x * 0.5;
    this.camara.position.y = this.base.y - this.raton.y * 0.3;
    this.camara.lookAt(this.mira);
    this.render.render(this.escena, this.camara);
  }
}
