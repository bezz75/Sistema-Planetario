import * as THREE from "three";

// ---------------------------------------------------------------------------
// Texturas procedurales: ninguna imagen externa, todo se pinta por código.
// Cada "pintor" recibe (u, v) en [0,1] (longitud, latitud) y rellena un objeto
// con el color, la altura (para bumpMap) y el brillo (specularMap). Así salen
// tres mapas a partir de un solo cálculo, y todos encajan entre sí.
// ---------------------------------------------------------------------------

// ---------- utilidades de color ----------
const C =(hex) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const mix = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
// Gradiente por paradas: ramp([[0, colorA], [1, colorB]], t)
function ramp(stops, t) {
  t = clamp(t);
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const t0 = stops[i - 1][0];
      const t1 = stops[i][0];
      return mix(stops[i - 1][1], stops[i][1], (t - t0) / (t1 - t0 || 1));
    }
  }
  return stops[stops.length - 1][1];
}
function setRGB(p, c) {
  p.r = c[0];
  p.g = c[1];
  p.b = c[2];
}

// ---------- ruido ----------
function mulberry32(seed) {
  let a = seed | 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Ruido de valores, periódico en x: así la textura no tiene costura en el
// meridiano donde se unen u=0 y u=1.
function createNoise(seed) {
  const rng = mulberry32(seed);
  const tbl = new Float32Array(256 * 256);
  for (let i = 0; i < tbl.length; i++) tbl[i] = rng();

  function noise(x, y, period) {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = x - x0;
    const fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const xa = ((x0 % period) + period) % period;
    const xb = (xa + 1) % period;
    const ya = ((y0 % 256) + 256) % 256;
    const yb = (ya + 1) % 256;
    const a = tbl[ya * 256 + xa];
    const b = tbl[ya * 256 + xb];
    const c = tbl[yb * 256 + xa];
    const d = tbl[yb * 256 + xb];
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  }

  return {
    // fx celdas a lo ancho, fy a lo alto (fx debe ser entero)
    noise: (u, v, fx, fy) => noise(u * fx, v * fy, fx),
    // Ruido fractal: suma de octavas, cada una el doble de frecuente
    fbm(u, v, base = 4, oct = 5) {
      let amp = 0.5;
      let sum = 0;
      let norm = 0;
      let f = base;
      for (let o = 0; o < oct; o++) {
        sum += amp * noise(u * f, v * f * 0.5, f);
        norm += amp;
        amp *= 0.5;
        f *= 2;
      }
      return sum / norm;
    },
    // Aleatorio determinista por celda entera (para cráteres, confeti...)
    hash(i, j) {
      let h = (Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263)) | 0;
      h = Math.imul(h ^ (h >>> 13), 1274126177);
      return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    },
  };
}

// ---------- pintores ----------
const PAINTERS = {
  // Gigante gaseoso: bandas distorsionadas y una tormenta
  gas(u, v, N, p) {
    const warp = N.fbm(u, v, 3, 4) - 0.5;
    const s = 0.5 + 0.5 * Math.sin((v * 7 + warp * 1.6) * Math.PI * 2);
    const streak = N.noise(u, v, 6, 40);
    const t = 0.65 * s + 0.35 * streak;
    let c = ramp(
      [[0, C(0xa3563a)], [0.35, C(0xd9985f)], [0.65, C(0xf1d9a8)], [1, C(0xfff3d6)]],
      t
    );
    const dx = (u - 0.3) / 0.09;
    const dy = (v - 0.62) / 0.05;
    const d = Math.hypot(dx, dy);
    if (d < 1) c = mix(c, C(0xc0392b), clamp((1 - d) * 1.6));
    setRGB(p, c);
    p.h = 0.5;
    p.s = 0.1;
  },

  // Estrella: plasma naranja con granulado
  sun(u, v, N, p) {
    const h = N.fbm(u, v, 6, 5);
    setRGB(p, ramp([[0, C(0xff8f00)], [0.6, C(0xffc107)], [1, C(0xfff59d)]], h));
    p.h = h;
  },
};

// Roca con cráteres para las lunas, a partir de un color base
export function rockPainter(hex) {
  const base = C(hex);
  return function (u, v, N, p) {
    const h = N.fbm(u, v, 5, 5);
    let c = mix(mix(base, [0, 0, 0], 0.35), base, h);
    let hh = h * 0.6;
    const cu = Math.floor(u * 20);
    const cv = Math.floor(v * 10);
    const hs = N.hash(cu, cv);
    if (hs > 0.55) {
      const cx = 0.25 + 0.5 * N.hash(cu + 11, cv);
      const cy = 0.25 + 0.5 * N.hash(cu, cv + 17);
      const d = Math.hypot(u * 20 - cu - cx, v * 10 - cv - cy) / (0.15 + 0.15 * hs);
      if (d < 1) {
        hh = 0.15 + 0.15 * d; // fondo hundido
        c = mix(c, [0, 0, 0], 0.25 * (1 - d));
      } else if (d < 1.25) {
        hh += 0.3 * ((1.25 - d) / 0.25); // borde elevado
      }
    }
    setRGB(p, c);
    p.h = hh;
    p.s = 0.08;
  };
}

// ---------- generación de los mapas ----------
// Devuelve { map, bump, spec } como THREE.CanvasTexture
export function buildPlanetMaps(kind, seed, opts) {
  const o = opts || {};
  const W = o.W || 512;
  const H = o.H || 256;
  const painter = typeof kind === "function" ? kind : PAINTERS[kind];
  const N = createNoise(seed);

  const layers = [0, 1, 2].map(() => {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    return { canvas, ctx, img: ctx.createImageData(W, H) };
  });
  const [mapL, bumpL, specL] = layers;

  const p = { r: 0, g: 0, b: 0, h: 0.5, s: 0.15 };

  for (let y = 0; y < H; y++) {
    const v = (y + 0.5) / H;
    for (let x = 0; x < W; x++) {
      const u = (x + 0.5) / W;
      p.h = 0.5;
      p.s = 0.15;
      painter(u, v, N, p);

      const i = (y * W + x) * 4;
      mapL.img.data.set([p.r, p.g, p.b, 255], i);
      const hv = clamp(p.h) * 255;
      bumpL.img.data.set([hv, hv, hv, 255], i);
      const sv = clamp(p.s) * 255;
      specL.img.data.set([sv, sv, sv, 255], i);
    }
  }
  layers.forEach((l) => l.ctx.putImageData(l.img, 0, 0));

  const make = (layer, srgb) => {
    const t = new THREE.CanvasTexture(layer.canvas);
    t.wrapS = THREE.RepeatWrapping;
    t.anisotropy = 4;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };

  return {
    map: make(mapL, true),
    bump: make(bumpL, false),
    spec: make(specL, false),
  };
}

// Textura (con alfa) para los anillos: bandas y una división tipo Cassini.
// Se estira a lo largo del radio, de dentro hacia fuera.
export function buildRingTexture() {
  const W = 512;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = 2;
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(W, 2);
  const N = createNoise(5);
  for (let x = 0; x < W; x++) {
    const t = x / (W - 1);
    let a = 0.35 + 0.65 * N.noise(t, 0, 40, 1);
    a *= 0.5 + 0.5 * Math.sin(t * 90);
    a = clamp(a * 1.6, 0.15, 1);
    if (t > 0.58 && t < 0.64) a = 0.04; // división
    a *= clamp(t * 12) * clamp((1 - t) * 8); // bordes suaves
    const c = mix(C(0xcdb48c), C(0xf3e6c8), N.noise(t, 0, 25, 1));
    for (let y = 0; y < 2; y++) {
      img.data.set([c[0], c[1], c[2], a * 255], (y * W + x) * 4);
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Brillo suave (gradiente radial) para el halo de la estrella
export function buildGlowTexture() {
  const S = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, "rgba(255,240,200,1)");
  g.addColorStop(0.25, "rgba(255,200,90,0.55)");
  g.addColorStop(1, "rgba(255,150,40,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Cartel con el nombre del planeta
export function buildLabelTexture(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.font = "bold 72px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.9)";
  ctx.shadowBlur = 12;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, 256, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
