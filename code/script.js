import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { FlyControls } from "three/examples/jsm/controls/FlyControls";
import GUI from "lil-gui";
// texturas.js fabrica las texturas por código (se usa como "caja negra")
import {
  buildPlanetMaps,
  rockPainter,
  buildRingTexture,
  buildGlowTexture,
  buildLabelTexture,
} from "./texturas.js";
import { crearPanelInfo } from "./info.js";

// ---------------------------------------------------------------------------
// SISTEMA SOLAR
// Basado en los scripts de las semanas 6 y 7:
//   script_07 -> estrella, planetas y lunas con órbitas elípticas
//   script_12 -> luces, sombras y GUI (lil-gui)
//   script_15 -> materiales Phong con varios mapas de textura
//   script_16 -> cámara controlada con FlyControls (la "nave")
//
// ---------------------------------------------------------------------------

const TEXTURAS_EXTERNAS = {
  Sol: { map: "https://raw.githubusercontent.com/bezz75/Sistema-Planetario/main/textures/Sun/2k_sun.jpg" },
  Mercurio: { map: "https://raw.githubusercontent.com/bezz75/Sistema-Planetario/main/textures/Mercury/2k_mercury.jpg" },
  Venus: {
    map: "https://raw.githubusercontent.com/bezz75/Sistema-Planetario/main/textures/Venus/2k_vernus_surface.jpg",
    nubes: { map: "https://raw.githubusercontent.com/bezz75/Sistema-Planetario/main/textures/Venus/2k_venus_atmosphere.jpg" },
  },
  Tierra: {
    map: "https://raw.githubusercontent.com/bezz75/Sistema-Planetario/main/textures/Earth/2k_earth_daymap.jpg",
    bump: "https://raw.githubusercontent.com/bezz75/Sistema-Planetario/main/textures/Earth/2k_earth_normal_map.tif",
    spec: "https://raw.githubusercontent.com/bezz75/Sistema-Planetario/main/textures/Earth/2k_earth_specular_map.tif",
    nubes: { map: "https://raw.githubusercontent.com/bezz75/Sistema-Planetario/main/textures/Earth/2k_earth_clouds.jpg" },
  },
  Marte: { map: "https://raw.githubusercontent.com/bezz75/Sistema-Planetario/main/textures/Mars/2k_mars.jpg" },
  Jupiter: { map: "https://raw.githubusercontent.com/bezz75/Sistema-Planetario/main/textures/Jupiter/2k_jupiter.jpg" },
  Saturno: { map: "https://raw.githubusercontent.com/bezz75/Sistema-Planetario/main/textures/Saturn/2k_saturn.jpg", anillo: { map: "https://raw.githubusercontent.com/bezz75/Sistema-Planetario/main/textures/Saturn/2k_saturn_ring_alpha.png" } },
  Urano: { map: "https://raw.githubusercontent.com/bezz75/Sistema-Planetario/main/textures/Uranus/2k_uranus.jpg" },
  Neptuno: { map: "https://raw.githubusercontent.com/bezz75/Sistema-Planetario/main/textures/Neptune/2k_neptune.jpg" },
  Luna: { map: "https://raw.githubusercontent.com/bezz75/Sistema-Planetario/main/textures/Moon/2k_moon.jpg" },
};

let scene, renderer;
let camera, camNave; // las dos vistas
let camcontrols, flyControls; // control orbital (vista general) y de vuelo (nave)
let info;
let estrella, luz, ambiente;
let Planetas = [],
  Lunas = [];
let orbitas; // grupo con todas las líneas de órbita
let reloj = new THREE.Clock();
let tiempo = 0; // tiempo de simulación
let escalaTiempo = 1; // 0 = pausa, 2 = el doble de rápido
let vistaNave = false; // false: vista general, true: vista desde la nave
let minivista = true;
let mostrarNubes = true; // interruptor de la GUI para las capas de nubes
let panelInfo; // panel con la información del astro seleccionado
let seleccionables = []; // mallas sobre las que se puede hacer clic
const raycaster = new THREE.Raycaster();
const puntero = new THREE.Vector2();
let clicInicio = null;

// ---------------------------------------------------------------------------
// PINTORES PROPIOS (se pasan a buildPlanetMaps igual que rockPainter)
// Cada uno recibe (u, v, N, p): u = longitud, v = latitud (0 = polo norte),
// N = ruido (N.fbm, N.noise, N.hash) y p = objeto donde se escribe el color
// (r, g, b), la altura (h, para el bump) y el brillo (s, para el especular).
const mezcla = (a, b, t) =>
  a.map((x, i) => x + (b[i] - x) * Math.min(1, Math.max(0, t)));

// Tierra: océanos, continentes verdes y marrones, desiertos y casquetes polares
function tierraPainter(u, v, N, p) {
  const h = N.fbm(u, v, 4, 5);
  const lat = Math.abs(v - 0.5) * 2; // 0 en el ecuador, 1 en los polos
  let c, hh, s;
  if (lat > 0.88 + (N.fbm(u, v, 8, 3) - 0.5) * 0.12) {
    c = [240, 245, 250]; // hielo polar
    hh = 0.6;
    s = 0.5;
  } else if (h > 0.52) {
    const t = (h - 0.52) / 0.48;
    c = t < 0.5
      ? mezcla([55, 125, 55], [115, 140, 70], t * 2)
      : mezcla([115, 140, 70], [140, 110, 80], (t - 0.5) * 2);
    if (lat < 0.35 && N.fbm(u + 0.5, v, 5, 3) > 0.55) c = mezcla(c, [214, 184, 124], 0.7); // desiertos
    hh = 0.3 + t * 0.7;
    s = 0.05;
  } else {
    c = mezcla([6, 26, 84], [28, 96, 168], h / 0.52); // océano: más claro cerca de la costa
    hh = 0.2;
    s = 0.9;
  }
  p.r = c[0];
  p.g = c[1];
  p.b = c[2];
  p.h = hh;
  p.s = s;
}

// Planeta de bandas (Venus, Saturno, Urano, Neptuno): devuelve un pintor
// cA y cB = colores extremos, bandas = nº de bandas, torbellino = deformación
function bandasPainter(cA, cB, bandas, torbellino) {
  return function (u, v, N, p) {
    const w = N.fbm(u, v, 3, 4) - 0.5;
    const s = 0.5 + 0.5 * Math.sin((v * bandas + w * torbellino) * Math.PI * 2);
    const t = 0.7 * s + 0.3 * N.noise(u, v, 6, 40);
    const c = mezcla(cA, cB, t);
    p.r = c[0];
    p.g = c[1];
    p.b = c[2];
    p.h = 0.5;
    p.s = 0.1;
  };
}

// ---------------------------------------------------------------------------
function init() {
  // Texto de título
  info = document.createElement("div");
  info.style.position = "absolute";
  info.style.top = "30px";
  info.style.width = "100%";
  info.style.textAlign = "center";
  info.style.color = "#fff";
  info.style.fontWeight = "bold";
  info.style.backgroundColor = "transparent";
  info.style.zIndex = "1";
  info.style.fontFamily = "Monospace";
  document.body.appendChild(info);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x02030a);

  // Vista 1: cámara general, mirando el sistema desde arriba
  camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );
  camera.position.set(0, 70, 115);

  // Vista 2: cámara de la nave, que vuela libremente
  camNave = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );
  camNave.position.set(0, 6, 22);
  camNave.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  // Se activan las sombras (script_12)
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  // Controles: orbital para la vista general (script_03) y de vuelo para la nave (script_16)
  camcontrols = new OrbitControls(camera, renderer.domElement);
  camcontrols.enableDamping = true;
  flyControls = new FlyControls(camNave, renderer.domElement);
  flyControls.dragToLook = true; // se mira arrastrando el ratón
  flyControls.movementSpeed = 10; // unidades por segundo
  flyControls.rollSpeed = 1;

  // Objetos
  Fondo();
  Estrella(3.2);

  // Planeta(nombre, tipo de textura, radio, distancia, velocidad, f1, f2, semilla, opciones)
  // f1 y f2 deforman la órbita para hacerla elíptica (como en script_06)
  // opciones: { bump: escala del relieve, brillo: shininess }
  Planeta("Mercurio", rockPainter(0x9a948c), 0.8, 8, 0.6, 1.0, 0.85, 11, { bump: 1.5, brillo: 4 });
  Planeta("Venus", bandasPainter([200, 160, 90], [240, 215, 150], 4, 2), 1.4, 11.5, 0.45, 1.0, 0.98, 23, { bump: 0 });
  const tierra = Planeta("Tierra", tierraPainter, 1.5, 15.5, 0.35, 1.0, 0.97, 37, { bump: 1, brillo: 40 });
  const marte = Planeta("Marte", rockPainter(0xc1582f), 1.1, 20, 0.28, 1.0, 0.92, 41, { bump: 1.5, brillo: 6 });
  const jupiter = Planeta("Jupiter", "gas", 3.8, 29, 0.15, 1.0, 0.96, 53, { bump: 0 });
  const saturno = Planeta("Saturno", bandasPainter([196, 168, 120], [236, 216, 170], 6, 1.2), 3.2, 39, 0.11, 1.0, 0.95, 67, { bump: 0 });
  const urano = Planeta("Urano", bandasPainter([150, 215, 225], [185, 235, 240], 3, 0.3), 2.2, 48, 0.08, 1.0, 0.97, 71, { bump: 0 });
  const neptuno = Planeta("Neptuno", bandasPainter([30, 60, 160], [70, 110, 220], 5, 0.8), 2.1, 56, 0.06, 1.0, 0.98, 83, { bump: 0 });

  Anillo(saturno, 4.4, 7.4);

  Luna(tierra, "Luna", 0.4, 2.8, 1.5, 0xb5b5b5, 0.2);
  Luna(marte, "Fobos", 0.18, 1.9, 2.2, 0x8a7a6a, 0.1);
  Luna(marte, "Deimos", 0.14, 2.6, 1.5, 0x9a8a7a, -0.2);
  Luna(jupiter, "Io", 0.4, 5.2, 1.4, 0xe3c75a, 0.05);
  Luna(jupiter, "Europa", 0.35, 6.3, 1.0, 0xd9cdb8, -0.08);
  Luna(jupiter, "Ganimedes", 0.5, 7.6, 0.7, 0x9c8f82, 0.1);
  Luna(jupiter, "Calisto", 0.45, 9.0, 0.5, 0x5e5650, -0.12);
  Luna(saturno, "Encelado", 0.22, 8.4, 0.9, 0xf2f6fa, 0.15);
  Luna(saturno, "Titan", 0.5, 9.8, 0.5, 0xd9a24a, -0.1);
  Luna(urano, "Titania", 0.3, 3.8, 0.8, 0xa9a4a0, 0.3);
  Luna(urano, "Oberon", 0.28, 4.8, -0.6, 0x948a84, -0.3);
  Luna(neptuno, "Triton", 0.35, 3.8, -0.8, 0xe0cfc4, 0.5);

  // Luces (script_12)
  Luces();
  CrearGUI();

  // Información didáctica: clic sobre un astro (Raycaster, como en la guía S6)
  panelInfo = crearPanelInfo();
  seleccionables = [estrella]
    .concat(Planetas.map(function (p) { return p.userData.malla; }))
    .concat(Lunas); // las lunas también se incluyen para que tapen lo que hay detrás
  renderer.domElement.addEventListener("pointerdown", function (e) {
    clicInicio = { x: e.clientX, y: e.clientY };
  });
  renderer.domElement.addEventListener("pointerup", function (e) {
    // si el ratón se ha movido, era un arrastre (orbitar/mirar), no un clic
    if (clicInicio && Math.hypot(e.clientX - clicInicio.x, e.clientY - clicInicio.y) < 5)
      Seleccionar(e);
    clicInicio = null;
  });

  // Botones del HTML (como el botón de la rejilla en script_04)
  document.getElementById("vista").addEventListener("click", function () {
    CambiarVista(!vistaNave);
  });
  document.getElementById("minivista").addEventListener("click", function () {
    minivista = !minivista;
    ActualizarMarco();
  });
  window.addEventListener("keydown", function (e) {
    if (e.code === "KeyV") CambiarVista(!vistaNave);
  });
  window.addEventListener("resize", function () {
    renderer.setSize(window.innerWidth, window.innerHeight);
    ActualizarMarco();
  });

  CambiarVista(false);
}

// ---------------------------------------------------------------------------
// OBJETOS

// Carga una imagen; si falla (404, CORS...) devuelve null y avisa por consola
const cargadorTex = new THREE.TextureLoader();
function cargarTextura(ruta) {
  if (!ruta) return Promise.resolve(null);
  return cargadorTex.loadAsync(ruta).catch(function () {
    console.warn("No se pudo cargar la imagen: " + ruta);
    return null;
  });
}

// Sustituye las texturas procedurales de un material por imágenes externas
// (si hay una entrada en TEXTURAS_EXTERNAS). Usa TextureLoader como en script_13,
// pero con loadAsync para esperar a que lleguen todas las imágenes del cuerpo.
async function AplicarExternas(material, nombre) {
  const t = TEXTURAS_EXTERNAS[nombre];
  if (!t || !t.map) return;

  const [map, bump, spec, emis] = await Promise.all([
    cargarTextura(t.map),
    cargarTextura(t.bump),
    cargarTextura(t.spec),
    cargarTextura(t.emis),
  ]);
  if (!map) return; // sin imagen de color se mantiene la textura procedural

  map.colorSpace = THREE.SRGBColorSpace;
  material.map = map;
  // Los mapas procedurales ya no encajan con la nueva imagen: se sustituyen
  if ("bumpMap" in material) {
    material.bumpMap = bump;
    // si el planeta tenía el relieve a 0 (gaseosos) y ahora hay imagen, se activa
    if (bump) material.bumpScale = Math.max(material.bumpScale, 1);
    material.specularMap = spec;
    if (emis) {
      emis.colorSpace = THREE.SRGBColorSpace;
      material.emissive = new THREE.Color(0xffffff);
      material.emissiveMap = emis;
    }
  }
  material.needsUpdate = true;
}

// Capa de nubes: una esfera un 2 % mayor que el planeta, transparente, con su
// propia textura y su bump. Solo se crea si la imagen de nubes llega bien; si
// no, el planeta se queda sin nubes.
async function AplicarNubes(grupo, radio, nombre) {
  const t = TEXTURAS_EXTERNAS[nombre];
  if (!t || !t.nubes || !t.nubes.map) return;

  const [map, bump] = await Promise.all([
    cargarTextura(t.nubes.map),
    cargarTextura(t.nubes.bump),
  ]);
  if (!map) return;

  const material = new THREE.MeshPhongMaterial({
    transparent: true,
    depthWrite: false, // para que no tape al planeta ni a otras nubes
    shininess: 5,
    specular: new THREE.Color(0x000000),
  });
  if (t.nubes.modo === "alfa") {
    // PNG con canal alfa: se usa como textura de color normal
    map.colorSpace = THREE.SRGBColorSpace;
    material.map = map;
  } else {
    // JPG en escala de grises: el brillo marca la opacidad (blanco = nube)
    material.alphaMap = map;
  }
  if (bump) {
    material.bumpMap = bump;
    material.bumpScale = t.nubes.bumpScale || 1.5;
  }

  const nubes = new THREE.Mesh(new THREE.SphereGeometry(radio * 1.02, 48, 32), material);
  nubes.visible = mostrarNubes;
  grupo.add(nubes);
  grupo.userData.nubes = nubes;
}

// Si hay imagen propia para el anillo, sustituye a la generada por código
async function AplicarAnillo(material, nombre) {
  const t = TEXTURAS_EXTERNAS[nombre];
  if (!t || !t.anillo || !t.anillo.map) return;
  const map = await cargarTextura(t.anillo.map);
  if (!map) return;
  map.colorSpace = THREE.SRGBColorSpace;
  material.map = map;
  material.needsUpdate = true;
}

// Estrella central: una esfera con textura que no recibe luz (Basic) + halo
function Estrella(radio) {
  const mapas = buildPlanetMaps("sun", 99);
  const materialEstrella = new THREE.MeshBasicMaterial({ map: mapas.map });
  estrella = new THREE.Mesh(
    new THREE.SphereGeometry(radio, 48, 32),
    materialEstrella
  );
  estrella.userData.nombre = "Sol";
  scene.add(estrella);
  AplicarExternas(materialEstrella, "Sol");

  // Halo: dos sprites con un degradado, mezclados de forma aditiva
  const halo = buildGlowTexture();
  [16, 34].forEach(function (tam, i) {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: halo,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        opacity: i ? 0.35 : 0.9,
      })
    );
    sprite.scale.setScalar(tam);
    scene.add(sprite);
  });
}

// Igual que en script_07, pero con textura, nubes y sombras
// "tipo" puede ser el nombre de un pintor de texturas.js o una función pintora
function Planeta(nombre, tipo, radio, dist, vel, f1, f2, semilla, opciones) {
  const o = opciones || {};

  // 1. Material con mapas de textura (como script_15)
  const mapas = buildPlanetMaps(tipo, semilla);
  const material = new THREE.MeshPhongMaterial({
    map: mapas.map,
    bumpMap: mapas.bump,
    bumpScale: o.bump !== undefined ? o.bump : 1,
    specularMap: mapas.spec,
    specular: new THREE.Color(0x555555),
    shininess: o.brillo !== undefined ? o.brillo : 10,
  });
  // Si hay imágenes propias para este planeta, sustituyen a las procedurales
  AplicarExternas(material, nombre);

  // 2. Geometría: esfera
  const malla = new THREE.Mesh(new THREE.SphereGeometry(radio, 48, 32), material);
  malla.userData.nombre = nombre; // para saber qué astro se ha pulsado
  malla.castShadow = true; // proyecta sombras
  malla.receiveShadow = true; // y las recibe

  // 3. Grafo de escena: grupo -> giro -> malla
  const grupo = new THREE.Object3D();
  const giro = new THREE.Object3D();
  giro.add(malla);
  grupo.add(giro);
  scene.add(grupo);

  // 4. Datos del movimiento, guardados en userData (como en script_06)
  grupo.userData.nombre = nombre;
  grupo.userData.malla = malla;
  grupo.userData.dist = dist;
  grupo.userData.speed = vel;
  grupo.userData.f1 = f1;
  grupo.userData.f2 = f2;
  grupo.userData.fase = THREE.MathUtils.randFloat(0, Math.PI * 2);
  grupo.userData.giro = giro;
  grupo.userData.vgiro = 0.2 + 0.4 * ((semilla % 7) / 7);
  Planetas.push(grupo);

  // Nubes (si hay imágenes para ellas)
  AplicarNubes(grupo, radio, nombre);

  // 5. Trayectoria elíptica (igual que en script_07)
  const curve = new THREE.EllipseCurve(0, 0, dist * f1, dist * f2);
  const puntos = curve.getPoints(160);
  const geome = new THREE.BufferGeometry().setFromPoints(puntos);
  const mate = new THREE.LineBasicMaterial({
    color: 0x6a7aa8,
    transparent: true,
    opacity: 0.45,
  });
  const orbita = new THREE.LineLoop(geome, mate);
  orbita.rotation.x = Math.PI / 2; // la elipse nace en el plano xy; así queda en el xz
  orbitas.add(orbita);

  // 6. Etiqueta con el nombre
  const etiqueta = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: buildLabelTexture(nombre),
      transparent: true,
      depthTest: false,
    })
  );
  etiqueta.scale.set(10, 2.5, 1);
  etiqueta.position.y = radio + 1.8;
  etiqueta.renderOrder = 10;
  grupo.add(etiqueta);

  return grupo;
}

// Luna con pivote, como en script_07: el pivote inclina el plano de la órbita
// "color" es el color base de la roca (se usa rockPainter)
function Luna(planeta, nombre, radio, dist, vel, color, inclinacion) {
  const pivote = new THREE.Object3D();
  pivote.rotation.x = Math.PI / 2 + inclinacion; // PI/2 deja la órbita horizontal
  planeta.add(pivote);

  const mapas = buildPlanetMaps(rockPainter(color), Lunas.length + 100, {
    W: 256,
    H: 128,
  });
  const material = new THREE.MeshPhongMaterial({
    map: mapas.map,
    bumpMap: mapas.bump,
    bumpScale: 1.5,
    shininess: 4,
  });
  const luna = new THREE.Mesh(new THREE.SphereGeometry(radio, 32, 24), material);
  luna.castShadow = true;
  luna.receiveShadow = true;
  luna.userData.nombre = nombre;
  luna.userData.dist = dist;
  luna.userData.speed = vel;
  luna.userData.fase = THREE.MathUtils.randFloat(0, Math.PI * 2);

  AplicarExternas(material, nombre);

  Lunas.push(luna);
  pivote.add(luna);
}

// Anillo plano alrededor de un planeta
function Anillo(planeta, interior, exterior) {
  const geom = new THREE.RingGeometry(interior, exterior, 96, 1);
  // La textura de anillo va "a lo largo del radio": se recalculan las UV
  // (coordenadas de textura) según la distancia de cada vértice al centro.
  const pos = geom.attributes.position;
  const uv = geom.attributes.uv;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    uv.setXY(i, (v.length() - interior) / (exterior - interior), 0.5);
  }
  const material = new THREE.MeshLambertMaterial({
    map: buildRingTexture(),
    transparent: true,
    side: THREE.DoubleSide, // visible por ambas caras (como en script_13)
    depthWrite: false,
  });
  const anillo = new THREE.Mesh(geom, material);
  anillo.rotation.x = Math.PI / 2 + 0.3; // horizontal y algo inclinado
  anillo.receiveShadow = true; // el planeta proyecta su sombra sobre el anillo
  planeta.add(anillo);
  AplicarAnillo(material, planeta.userData.nombre);
}

// Estrellas de fondo: muchos puntos repartidos en una esfera enorme
function Fondo() {
  orbitas = new THREE.Group();
  scene.add(orbitas);

  const n = 2500;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = THREE.MathUtils.randFloat(500, 900);
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(THREE.MathUtils.randFloatSpread(2));
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = r * Math.cos(ph);
    pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  scene.add(
    new THREE.Points(
      geom,
      new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false })
    )
  );
}

// ---------------------------------------------------------------------------
// LUCES (como script_12): ambiente + una luz puntual dentro de la estrella
function Luces() {
  ambiente = new THREE.AmbientLight(0x8899cc, 0.3);
  scene.add(ambiente);

  // PointLight(color, intensidad, distancia máxima, decaimiento)
  luz = new THREE.PointLight(0xfff1d0, 1.6, 0, 0);
  luz.castShadow = true;
  luz.shadow.mapSize.set(1024, 1024);
  luz.shadow.camera.near = 0.5;
  luz.shadow.camera.far = 180; // Neptuno está a ~56 unidades
  luz.shadow.bias = -0.0006;
  luz.shadow.normalBias = 0.04;
  scene.add(luz);
}

// Panel de control con lil-gui (como script_12)
function CrearGUI() {
  const gui = new GUI({ title: "Controles" });
  const params = { orbitas: true, sombras: true, nubes: true };

  gui.add({ t: escalaTiempo }, "t", 0, 5, 0.05).name("Velocidad").onChange(function (v) {
    escalaTiempo = v;
  });
  gui.add(params, "orbitas").name("Órbitas").onChange(function (v) {
    orbitas.visible = v;
  });
  gui.add(params, "sombras").name("Sombras").onChange(function (v) {
    luz.castShadow = v;
  });
  gui.add(params, "nubes").name("Nubes").onChange(function (v) {
    mostrarNubes = v;
    for (const p of Planetas) if (p.userData.nubes) p.userData.nubes.visible = v;
  });
  gui.add(luz, "intensity", 0, 4, 0.1).name("Luz estrella");
  gui.add(ambiente, "intensity", 0, 1.5, 0.05).name("Luz ambiente");
}

// ---------------------------------------------------------------------------
// VISTAS
function CambiarVista(nave) {
  vistaNave = nave;
  camcontrols.enabled = !nave;
  info.innerHTML = nave
    ? "Vista de la nave · W/S/A/D/R/F mover · Q/E girar · arrastra el ratón para mirar · clic en un astro: información"
    : "Vista general · ratón: orbitar, zoom y desplazar · clic en un astro: información";
  document.getElementById("vista").textContent = nave
    ? "Ir a la vista general (V)"
    : "Ir a la nave (V)";
  ActualizarMarco();
}

// Rectángulo de la mini-vista (esquina inferior derecha)
function RectMinivista() {
  const w = Math.floor(window.innerWidth * 0.25);
  const h = Math.floor(window.innerHeight * 0.25);
  return { x: window.innerWidth - w - 10, y: 10, w: w, h: h };
}

// Marco HTML alrededor de la mini-vista
function ActualizarMarco() {
  const r = RectMinivista();
  const marco = document.getElementById("marco");
  marco.style.display = minivista ? "block" : "none";
  marco.style.width = r.w + "px";
  marco.style.height = r.h + "px";
  marco.textContent = vistaNave ? "Vista general" : "Nave";
}

// ---------------------------------------------------------------------------
// SELECCIÓN CON EL RATÓN
// Lanza un rayo desde la cámara activa por el punto pulsado y muestra la
// información del primer astro que atraviesa (si hay datos para él).
function Seleccionar(e) {
  const W = window.innerWidth;
  const H = window.innerHeight;

  // un clic dentro de la mini-vista no se interpreta (es otra cámara)
  if (minivista) {
    const r = RectMinivista();
    if (e.clientX >= r.x && e.clientX <= r.x + r.w && e.clientY >= H - r.y - r.h && e.clientY <= H - r.y)
      return;
  }

  puntero.set((e.clientX / W) * 2 - 1, -(e.clientY / H) * 2 + 1);
  raycaster.setFromCamera(puntero, vistaNave ? camNave : camera);
  const impactos = raycaster.intersectObjects(seleccionables, false);

  if (impactos.length && panelInfo.mostrar(impactos[0].object.userData.nombre)) return;
  panelInfo.ocultar(); // clic en el vacío, o en un astro sin datos (una luna)
}

// ---------------------------------------------------------------------------
// BUCLE DE ANIMACIÓN
function animationLoop() {
  requestAnimationFrame(animationLoop);

  const dt = Math.min(reloj.getDelta(), 0.05); // segundos desde el fotograma anterior
  tiempo += dt * escalaTiempo;

  // Planetas: misma fórmula que en script_06 (órbita elíptica en el plano xz)
  for (const p of Planetas) {
    const a = p.userData.fase + tiempo * p.userData.speed;
    p.position.x = Math.cos(a) * p.userData.dist * p.userData.f1;
    p.position.z = Math.sin(a) * p.userData.dist * p.userData.f2;
    // rotación sobre su propio eje
    p.userData.giro.rotation.y += dt * escalaTiempo * p.userData.vgiro;
    // las nubes giran algo más deprisa que la superficie
    if (p.userData.nubes)
      p.userData.nubes.rotation.y += dt * escalaTiempo * p.userData.vgiro * 1.3;
  }

  // Lunas: giran en el plano xy de su pivote (como en script_07)
  for (const l of Lunas) {
    const a = l.userData.fase + tiempo * l.userData.speed;
    l.position.x = Math.cos(a) * l.userData.dist;
    l.position.y = Math.sin(a) * l.userData.dist;
  }

  estrella.rotation.y += dt * escalaTiempo * 0.05;

  // Solo se actualiza el control de la vista activa
  if (vistaNave) flyControls.update(dt);
  else camcontrols.update();

  Dibujar();
}

// Dibuja la vista principal y, si está activa, la mini-vista (S7: puerto de vista)
function Dibujar() {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const principal = vistaNave ? camNave : camera;
  const otra = vistaNave ? camera : camNave;

  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, W, H);
  principal.aspect = W / H; // se restablece la relación de aspecto
  principal.updateProjectionMatrix();
  renderer.render(scene, principal);

  if (minivista) {
    const r = RectMinivista();
    renderer.setViewport(r.x, r.y, r.w, r.h);
    renderer.setScissor(r.x, r.y, r.w, r.h);
    renderer.setScissorTest(true); // solo se dibuja dentro de esa zona
    otra.aspect = r.w / r.h;
    otra.updateProjectionMatrix();
    renderer.render(scene, otra);
    renderer.setScissorTest(false);
  }
}

// Se arranca al final, cuando todas las constantes (mezcla, cargadorTex...) ya existen
init();
animationLoop();
