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
} from "/src/texturas.js";

// ---------------------------------------------------------------------------
// SISTEMA PLANETARIO
// Basado en los scripts de las semanas 6 y 7:
//   script_07 -> estrella, planetas y lunas con órbitas elípticas
//   script_12 -> luces, sombras y GUI (lil-gui)
//   script_15 -> materiales Phong con varios mapas de textura
//   script_16 -> cámara controlada con FlyControls (la "nave")
// ---------------------------------------------------------------------------

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

init();
animationLoop();

function init() {
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
  camera.position.set(0, 45, 80);

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
  // Se activan las sombras
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  // Controles: orbital para la vista general y de vuelo para la nave
  camcontrols = new OrbitControls(camera, renderer.domElement);
  camcontrols.enableDamping = true;
  flyControls = new FlyControls(camNave, renderer.domElement);
  flyControls.dragToLook = true; // se mira arrastrando el ratón
  flyControls.movementSpeed = 10; // unidades por segundo
  flyControls.rollSpeed = 1;

  // Objetos
  Fondo();
  Estrella(3.2);

  // Planeta (nombre, tipo de textura, radio, distancia, velocidad, f1, f2, semilla)
  // f1 y f2 deforman la órbita para hacerla elíptica
  Planeta("Verdalia", "grass", 2.2, 10, 0.3, 1.0, 0.93, 11);
  Planeta("Glacia", "ice", 1.7, 15.5, 0.22, 1.0, 0.9, 23);
  Planeta("Pirra", "lava", 1.9, 21, 0.17, 1.05, 0.88, 37);
  Planeta("Titanea", "gas", 3.4, 29, 0.11, 1.0, 0.95, 41);
  Planeta("Arenal", "desert", 2.0, 37, 0.08, 1.0, 0.92, 53);
  Planeta("Rosquilla", "donut", 2.6, 45, 0.06, 1.0, 0.95, 67);

  // Anillo para Titanea (Planetas[3])
  Anillo(Planetas[3], 4.6, 7.2);

  // Luna (planeta, radio, distancia, velocidad, color, inclinación)
  Luna(Planetas[0], 0.45, 3.7, 1.3, 0xc9c9d6, 0.35);
  Luna(Planetas[0], 0.25, 4.9, -0.9, 0xb59b82, -0.6);
  Luna(Planetas[1], 0.3, 2.9, 1.8, 0xdfe9f2, 0.2);
  Luna(Planetas[3], 0.5, 9.0, 0.9, 0xd7b894, 0.1);
  Luna(Planetas[3], 0.35, 10.4, -0.7, 0x9ea7b8, 0.5);
  Luna(Planetas[4], 0.28, 3.2, 1.1, 0xc7a98a, 0.4);

  // Luces
  Luces();
  CrearGUI();

  // Botones del HTML
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

// Estrella central: una esfera con textura que no recibe luz (Basic) + halo
function Estrella(radio) {
  const mapas = buildPlanetMaps("sun", 99);
  estrella = new THREE.Mesh(
    new THREE.SphereGeometry(radio, 48, 32),
    new THREE.MeshBasicMaterial({ map: mapas.map })
  );
  scene.add(estrella);

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

function Planeta(nombre, tipo, radio, dist, vel, f1, f2, semilla) {
  // 1. Material con mapas de textura
  const mapas = buildPlanetMaps(tipo, semilla);
  const material = new THREE.MeshPhongMaterial({
    map: mapas.map,
    bumpMap: mapas.bump,
    bumpScale: tipo === "gas" ? 0 : tipo === "lava" ? 2 : 1,
    specularMap: mapas.spec,
    specular: new THREE.Color(0x555555),
    shininess: tipo === "ice" ? 90 : tipo === "donut" ? 35 : 10,
  });
  if (mapas.emissive) {
    // la lava brilla por sí misma
    material.emissive = new THREE.Color(0xffffff);
    material.emissiveMap = mapas.emissive;
    material.emissiveIntensity = 1.4;
  }

  // 2. Geometría: esfera, salvo la rosquilla, que es un toro
  let geom;
  if (tipo === "donut") geom = new THREE.TorusGeometry(radio, radio * 0.4, 32, 96);
  else geom = new THREE.SphereGeometry(radio, 48, 32);

  const malla = new THREE.Mesh(geom, material);
  malla.castShadow = true; // proyecta sombras
  malla.receiveShadow = true; // y las recibe
  if (tipo === "donut") malla.rotation.x = Math.PI / 2; // tumbado, "plano"

  // 3. Grafo de escena: grupo -> giro -> malla
  const grupo = new THREE.Object3D();
  const giro = new THREE.Object3D();
  giro.add(malla);
  grupo.add(giro);
  scene.add(grupo);

  // 4. Datos del movimiento, guardados en userData
  grupo.userData.dist = dist;
  grupo.userData.speed = vel;
  grupo.userData.f1 = f1;
  grupo.userData.f2 = f2;
  grupo.userData.fase = THREE.MathUtils.randFloat(0, Math.PI * 2); // punto de partida
  grupo.userData.giro = giro;
  grupo.userData.vgiro = 0.2 + 0.4 * ((semilla % 7) / 7); // velocidad de rotación propia
  grupo.userData.radio = radio;
  Planetas.push(grupo);

  // 5. Trayectoria elíptica
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
}

// Luna con pivote: el pivote inclina el plano de la órbita
function Luna(planeta, radio, dist, vel, col, inclinacion) {
  const pivote = new THREE.Object3D();
  pivote.rotation.x = Math.PI / 2 + inclinacion; // PI/2 deja la órbita horizontal
  planeta.add(pivote);

  const mapas = buildPlanetMaps(rockPainter(col), Lunas.length + 100, {
    W: 256,
    H: 128,
  });
  const luna = new THREE.Mesh(
    new THREE.SphereGeometry(radio, 32, 24),
    new THREE.MeshPhongMaterial({
      map: mapas.map,
      bumpMap: mapas.bump,
      bumpScale: 1.5,
      shininess: 4,
    })
  );
  luna.castShadow = true;
  luna.receiveShadow = true;
  luna.userData.dist = dist;
  luna.userData.speed = vel;
  luna.userData.fase = THREE.MathUtils.randFloat(0, Math.PI * 2);

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
  const anillo = new THREE.Mesh(
    geom,
    new THREE.MeshLambertMaterial({
      map: buildRingTexture(),
      transparent: true,
      side: THREE.DoubleSide, // visible por ambas caras
      depthWrite: false,
    })
  );
  anillo.rotation.x = Math.PI / 2 + 0.3; // horizontal y algo inclinado
  anillo.receiveShadow = true; // el planeta proyecta su sombra sobre el anillo
  planeta.add(anillo);
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
// LUCES: ambiente + una luz puntual dentro de la estrella
function Luces() {
  ambiente = new THREE.AmbientLight(0x8899cc, 0.3);
  scene.add(ambiente);

  // PointLight(color, intensidad, distancia máxima, decaimiento)
  luz = new THREE.PointLight(0xfff1d0, 1.6, 0, 0);
  luz.castShadow = true;
  luz.shadow.mapSize.set(1024, 1024);
  luz.shadow.camera.near = 0.5;
  luz.shadow.camera.far = 150;
  luz.shadow.bias = -0.0006;
  luz.shadow.normalBias = 0.04;
  scene.add(luz);
}

// Panel de control con lil-gui
function CrearGUI() {
  const gui = new GUI({ title: "Controles" });
  const params = { orbitas: true, sombras: true };

  gui.add({ t: escalaTiempo }, "t", 0, 5, 0.05).name("Velocidad").onChange(function (v) {
    escalaTiempo = v;
  });
  gui.add(params, "orbitas").name("Órbitas").onChange(function (v) {
    orbitas.visible = v;
  });
  gui.add(params, "sombras").name("Sombras").onChange(function (v) {
    luz.castShadow = v;
  });
  gui.add(luz, "intensity", 0, 4, 0.1).name("Luz estrella");
  gui.add(ambiente, "intensity", 0, 1.5, 0.05).name("Luz ambiente");
}

// ---------------------------------------------------------------------------
// VISTAS
function CambiarVista(nave) {
  vistaNave = nave;
  camcontrols.enabled = !nave; // solo uno de los dos controles actúa
  info.innerHTML = nave
    ? "Vista de la nave · W/S/A/D/R/F mover · Q/E girar · arrastra el ratón para mirar"
    : "Vista general · ratón: orbitar, zoom y desplazar";
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
// BUCLE DE ANIMACIÓN
function animationLoop() {
  requestAnimationFrame(animationLoop);

  const dt = Math.min(reloj.getDelta(), 0.05); // segundos desde el fotograma anterior
  tiempo += dt * escalaTiempo;

  // Planetas: órbita elíptica en el plano xz
  for (const p of Planetas) {
    const a = p.userData.fase + tiempo * p.userData.speed;
    p.position.x = Math.cos(a) * p.userData.dist * p.userData.f1;
    p.position.z = Math.sin(a) * p.userData.dist * p.userData.f2;
    // rotación sobre su propio eje
    p.userData.giro.rotation.y += dt * escalaTiempo * p.userData.vgiro;
  }

  // Lunas: giran en el plano xy de su pivote
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
