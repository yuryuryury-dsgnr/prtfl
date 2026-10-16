// Loft 7: a two-level loft that builds itself as you scroll, then becomes a dollhouse to play with.
// The same scroll as the other two concepts (bkit.js: stages, captions, the rail, settling): the plan
// on its plinth, the walls rising, the furniture dropping in, the top floor lifting off, a flight
// through three rooms, a day of sun scrolled through, and at the end the model is handed over:
// turn it, open a room, move the furniture, change the finishes.
// The shell is built here from the plan; the furniture is real photoscanned models (Poly Haven, CC0)
// loaded as glTF, the way a client's own model would be; three.js draws it.
// The walls between the camera and the rooms sink to a low cut, drawn dark like a section; the sun
// follows the hour through the windows and casts the window grids' shadows.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const touch = window.Perf ? Perf.touch : matchMedia('(hover: none) and (pointer: coarse)').matches;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement;
const canvas = document.getElementById('gl');

let renderer = null;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (e) { console.error(e); }
if (!renderer) { root.classList.add('no-gl'); throw new Error('no WebGL'); }
renderer.setPixelRatio(window.Perf ? Perf.dpr : Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.localClippingEnabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x06070a);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(36, innerWidth / innerHeight, 0.1, 200);
// the controls are only handed over at the end; until then the scroll drives the camera
const controls = new OrbitControls(camera, canvas);
controls.enabled = false; controls.enableZoom = false; controls.enablePan = false;
controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.minPolarAngle = 0.12; controls.maxPolarAngle = 1.42;
// ——— the plan, in metres: x runs east, z south (towards the viewer at the start), y up ———
const W = 10, D = 7, H = 6, UP = 3.0, SLAB = 0.25, T = 0.2;
const CUT = 0.42; // how low a wall sinks when the camera is outside it
const portrait = () => innerWidth < 760 && innerHeight > innerWidth;

// ——— geometry ———
// a box whose texture coordinates are in metres, so a texture keeps its scale on every face
function boxGeo(x0, y0, z0, x1, y1, z1) {
  const pos = [], nrm = [], uv = [], idx = [];
  function face(p, n, f) {
    const b = pos.length / 3;
    p.forEach(q => { pos.push(q[0], q[1], q[2]); nrm.push(n[0], n[1], n[2]); const u = f(q); uv.push(u[0], u[1]); });
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  face([[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], [1, 0, 0], q => [-q[2], q[1]]);
  face([[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], [-1, 0, 0], q => [q[2], q[1]]);
  face([[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], [0, 1, 0], q => [q[0], -q[2]]);
  face([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], [0, -1, 0], q => [q[0], q[2]]);
  face([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, 1], q => [q[0], q[1]]);
  face([[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], [0, 0, -1], q => [-q[0], q[1]]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}
function box(parent, mat, x0, y0, z0, x1, y1, z1, shadow = true) {
  const m = new THREE.Mesh(boxGeo(x0, y0, z0, x1, y1, z1), mat);
  m.castShadow = shadow; m.receiveShadow = true;
  parent.add(m);
  return m;
}

// ——— materials ———
const tl = new THREE.TextureLoader();
const manager = new THREE.LoadingManager();
tl.manager = manager;
const texCache = {};
function tex(name, srgb, scale) {
  const key = name + scale;
  if (texCache[key]) return texCache[key];
  const t = tl.load('tex/' + name);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / scale, 1 / scale);
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return (texCache[key] = t);
}
const FLOORS = {
  oak: { n: 'laminate_floor_02', s: 2.4, rough: 0.85, tint: 0xffffff },
  herringbone: { n: 'herringbone_parquet', s: 1.7, rough: 0.8, tint: 0xffffff },
  concrete: { n: 'concrete_wall_008', s: 3.4, rough: 0.55, tint: 0xd6d2cb }
};
const FINISH = {
  plaster: { n: 'plastered_wall', s: 3.0, rough: 1, tint: 0xf4f1ec, r: true },
  concrete: { n: 'concrete_slab_wall', s: 2.4, rough: 1, tint: 0xffffff, r: true },
  clay: { n: 'beige_wall_001', s: 3.0, rough: 0.95, tint: 0xd8a586, r: false }
};
function dress(mat, f) {
  mat.map = tex(f.n + '_Diffuse.jpg', true, f.s);
  mat.normalMap = tex(f.n + '_nor_gl.jpg', false, f.s);
  mat.roughnessMap = f.r === false ? null : tex(f.n + '_Rough.jpg', false, f.s);
  mat.roughness = f.rough; mat.color.set(f.tint);
  mat.normalScale.set(0.7, 0.7);
  mat.needsUpdate = true;
}
// a wall's cut shows dark, like a section through it
function sectionCut(mat) {
  mat.side = THREE.DoubleSide;
  mat.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', '#include <opaque_fragment>\nif (!gl_FrontFacing) gl_FragColor = vec4(vec3(0.028, 0.028, 0.032), 1.0);');
  };
  return mat;
}
const floorMat = new THREE.MeshStandardMaterial();
dress(floorMat, FLOORS.oak);
const plaster = new THREE.MeshStandardMaterial({ color: 0xf2efe9, roughness: 0.95 });
const steel = new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.42, metalness: 0.65 });
const oak = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });
oak.map = tex('laminate_floor_02_Diffuse.jpg', true, 1.2);
const lacquer = new THREE.MeshStandardMaterial({ color: 0xeceae5, roughness: 0.35 });
const stone = new THREE.MeshStandardMaterial({ color: 0xe9e6e0, roughness: 0.45 });
stone.map = tex('concrete_wall_008_Diffuse.jpg', true, 1.6);
const black = new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: 0.3 });
const linen = new THREE.MeshStandardMaterial({ color: 0xf0eee8, roughness: 0.95 });
const duvet = new THREE.MeshStandardMaterial({ color: 0xb9a68b, roughness: 0.95 });
const walnut = new THREE.MeshStandardMaterial({ color: 0x4a3426, roughness: 0.6 });
const rugMat = new THREE.MeshStandardMaterial({ color: 0x8f6a52, roughness: 1 });
const rug2 = new THREE.MeshStandardMaterial({ color: 0x6f7a74, roughness: 1 });
const white = new THREE.MeshStandardMaterial({ color: 0xf5f5f3, roughness: 0.25 });
const plinth = new THREE.MeshStandardMaterial({ color: 0x15161b, roughness: 0.9 });
const shade = new THREE.MeshStandardMaterial({ color: 0xf3e6cf, roughness: 0.8, emissive: 0xffb866, emissiveIntensity: 0 });
const glassBase = new THREE.MeshStandardMaterial({ color: 0xa9c2d6, roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.16, depthWrite: false });

// the four facades each sink on their own, so each has its own copies, cut by its own plane
const SIDES = {
  back: { out: (c) => c.z < -0.3 },
  front: { out: (c) => c.z > D + 0.3 },
  left: { out: (c) => c.x < -0.3 },
  right: { out: (c) => c.x > W + 0.3 }
};
const wallMats = [];
for (const k in SIDES) {
  const s = SIDES[k];
  s.h = 0; s.plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  s.wall = sectionCut(new THREE.MeshStandardMaterial({ clippingPlanes: [s.plane] }));
  s.frame = sectionCut(steel.clone()); s.frame.clippingPlanes = [s.plane];
  s.glass = glassBase.clone(); s.glass.clippingPlanes = [s.plane];
  s.group = new THREE.Group();
  wallMats.push(s.wall);
}
const inner = { h: 0, plane: new THREE.Plane(new THREE.Vector3(0, -1, 0), 0) };
inner.wall = sectionCut(new THREE.MeshStandardMaterial({ clippingPlanes: [inner.plane] }));
wallMats.push(inner.wall);
function setWalls(key) { wallMats.forEach(m => dress(m, FINISH[key])); }
setWalls('plaster');
function setFloor(key) { dress(floorMat, FLOORS[key]); }

// ——— the shell ———
const house = new THREE.Group(); scene.add(house);
const lower = new THREE.Group(), upper = new THREE.Group();
house.add(lower, upper);
for (const k in SIDES) house.add(SIDES[k].group);

// a wall along x (at z) or along z (at x), from a0 to a1, with openings [from, to, bottom, top]
function wall(grp, mat, axis, c, a0, a1, yb, yt, t, open) {
  const cuts = [a0, a1];
  open.forEach(o => cuts.push(o[0], o[1]));
  cuts.sort((p, q) => p - q);
  for (let i = 0; i < cuts.length - 1; i++) {
    const s0 = cuts[i], s1 = cuts[i + 1];
    if (s1 - s0 < 1e-3) continue;
    const m = (s0 + s1) / 2, o = open.find(q => m > q[0] && m < q[1]);
    const spans = o ? [[yb, o[2]], [o[3], yt]] : [[yb, yt]];
    spans.forEach(([y0, y1]) => {
      if (y1 - y0 < 1e-3) return;
      if (axis === 'x') box(grp, mat, s0, y0, c - t / 2, s1, y1, c + t / 2);
      else box(grp, mat, c - t / 2, y0, s0, c + t / 2, y1, s1);
    });
  }
}
// steel windows: a frame and a grid of bars, and the glass
function window_(side, axis, c, o, cols, rows) {
  const g = side.group, f = side.frame, F = 0.055, B = 0.03, d = 0.05;
  const bar = (s0, s1, y0, y1, dd) => axis === 'x' ? box(g, f, s0, y0, c - dd, s1, y1, c + dd) : box(g, f, c - dd, y0, s0, c + dd, y1, s1);
  bar(o[0], o[0] + F, o[2], o[3], d); bar(o[1] - F, o[1], o[2], o[3], d);
  bar(o[0], o[1], o[2], o[2] + F, d); bar(o[0], o[1], o[3] - F, o[3], d);
  for (let i = 1; i < cols; i++) { const s = o[0] + (o[1] - o[0]) * i / cols; bar(s - B / 2, s + B / 2, o[2], o[3], d * 0.7); }
  for (let j = 1; j < rows; j++) { const y = o[2] + (o[3] - o[2]) * j / rows; bar(o[0], o[1], y - B / 2, y + B / 2, d * 0.7); }
  const gl = axis === 'x' ? box(g, side.glass, o[0], o[2], c - 0.006, o[1], o[3], c + 0.006, false) : box(g, side.glass, c - 0.006, o[2], o[0], c + 0.006, o[3], o[1], false);
  gl.receiveShadow = false; gl.renderOrder = 2;
}
// the facades and their windows
const OPEN = {
  back: [[1.0, 4.6, 1.15, 2.35, 3, 2], [1.0, 4.6, 3.6, 5.4, 3, 2], [8.3, 9.3, 1.5, 2.3, 2, 1]],
  front: [[0.8, 5.4, 0.85, 5.55, 5, 6], [6.8, 9.4, 0.85, 2.4, 3, 2], [6.8, 9.4, 3.5, 5.6, 3, 2]],
  left: [[3.2, 6.5, 0.45, 5.55, 4, 6]],
  right: [[3.4, 6.2, 0.95, 2.4, 3, 2]]
};
wall(SIDES.back.group, SIDES.back.wall, 'x', T / 2, 0, W, 0, H, T, OPEN.back);
wall(SIDES.front.group, SIDES.front.wall, 'x', D - T / 2, 0, W, 0, H, T, OPEN.front);
wall(SIDES.left.group, SIDES.left.wall, 'z', T / 2, T, D - T, 0, H, T, OPEN.left);
wall(SIDES.right.group, SIDES.right.wall, 'z', W - T / 2, T, D - T, 0, H, T, OPEN.right);
OPEN.back.forEach(o => window_(SIDES.back, 'x', T / 2, o, o[4], o[5]));
OPEN.front.forEach(o => window_(SIDES.front, 'x', D - T / 2, o, o[4], o[5]));
OPEN.left.forEach(o => window_(SIDES.left, 'z', T / 2, o, o[4], o[5]));
OPEN.right.forEach(o => window_(SIDES.right, 'z', W - T / 2, o, o[4], o[5]));

// the base it stands on, and the lower floor
const base = new THREE.Group(); house.add(base);
box(base, plinth, -0.35, -0.55, -0.35, W + 0.35, -0.12, D + 0.35);
box(base, floorMat, 0, -0.12, 0, W, 0, D);

// the gallery and the bedroom floor, plaster underneath
const UB = UP - SLAB;
box(upper, plaster, T, UB, T, W - T, UP - 0.02, 2.9);
box(upper, plaster, 6.15, UB, 2.9, W - T, UP - 0.02, D - T);
box(upper, floorMat, T, UP - 0.02, T, W - T, UP, 2.9);
box(upper, floorMat, 6.15, UP - 0.02, 2.9, W - T, UP, D - T);
// glass rails along the gallery and the bedroom's edge
function rail(axis, c, a0, a1) {
  const y0 = UP, y1 = UP + 1.0;
  if (axis === 'x') { box(upper, glassBase, a0, y0, c - 0.006, a1, y1, c + 0.006, false).renderOrder = 2; box(upper, steel, a0, y1, c - 0.025, a1, y1 + 0.04, c + 0.025); }
  else { box(upper, glassBase, c - 0.006, y0, a0, c + 0.006, y1, a1, false).renderOrder = 2; box(upper, steel, c - 0.025, y1, a0, c + 0.025, y1 + 0.04, a1); }
}
rail('x', 2.9, T, 5.2);
rail('z', 6.17, 2.9, D - T);
// the stair: floating oak treads on a steel stringer, from the living room up to the gallery
const stair = new THREE.Group(); lower.add(stair);
const N = 17, z0 = 6.62, run = (z0 - 2.9) / N, rise = UP / N;
for (let i = 0; i < N; i++) box(stair, oak, 5.2, (i + 1) * rise - 0.05, z0 - (i + 1) * run, 6.08, (i + 1) * rise, z0 - i * run);
const len = Math.hypot(z0 - 2.9, UP), ang = Math.atan2(UP, z0 - 2.9);
const stringer = new THREE.Mesh(boxGeo(-0.015, -0.16, -len / 2, 0.015, 0.02, len / 2), steel);
stringer.position.set(6.1, UP / 2, (z0 + 2.9) / 2); stringer.rotation.x = ang; stringer.castShadow = true; stair.add(stringer);
const handrail = new THREE.Mesh(boxGeo(-0.015, -0.015, -len / 2, 0.015, 0.015, len / 2), steel);
handrail.position.set(5.19, UP / 2 + 0.95, (z0 + 2.9) / 2); handrail.rotation.x = ang; handrail.castShadow = true; stair.add(handrail);
for (let i = 2; i < N; i += 4) box(stair, steel, 5.18, (i + 1) * rise, z0 - (i + 0.5) * run - 0.012, 5.2, (i + 1) * rise + 0.95, z0 - (i + 0.5) * run + 0.012);
// inside walls: the bath below, the dressing room above
wall(lower, inner.wall, 'z', 7.5, T, 2.8, 0, UB, 0.12, []);
wall(lower, inner.wall, 'x', 2.8, 7.44, W - T, 0, UB, 0.12, [[7.75, 8.5, 0, 2.1]]);
wall(upper, inner.wall, 'z', 7.5, T, 2.9, UP, UP + 2.5, 0.12, [[1.7, 2.6, UP, UP + 2.1]]);

// the kitchen, under the gallery
box(lower, lacquer, 0.4, 0, 0.2, 5.0, 0.86, 0.84);
box(lower, stone, 0.38, 0.86, 0.2, 5.0, 0.92, 0.88);
box(lower, black, 1.6, 0.92, 0.33, 2.3, 0.93, 0.75);
box(lower, steel, 3.2, 0.92, 0.35, 3.9, 0.925, 0.75);
box(lower, oak, 5.0, 0, 0.2, 6.4, 2.3, 0.84);
box(lower, oak, 1.55, 0, 1.85, 4.0, 0.86, 2.6);
box(lower, stone, 1.5, 0.86, 1.8, 4.05, 0.92, 2.65);
// the bath
box(lower, white, 8.0, 0, T + 0.05, W - T - 0.05, 0.56, 1.0);
box(lower, oak, W - T - 0.55, 0, 1.45, W - T - 0.02, 0.84, 2.45);
box(lower, white, W - T - 0.5, 0.84, 1.55, W - T - 0.06, 0.88, 2.35);
// the bed, its headboard to the east wall
box(upper, walnut, 7.55, UP, 3.95, W - T - 0.06, UP + 0.32, 5.85);
box(upper, linen, 7.6, UP + 0.32, 4.0, W - T - 0.1, UP + 0.52, 5.8);
box(upper, duvet, 7.58, UP + 0.52, 3.98, 9.0, UP + 0.57, 5.82);
box(upper, linen, 9.15, UP + 0.52, 4.15, W - T - 0.15, UP + 0.66, 4.85);
box(upper, linen, 9.15, UP + 0.52, 4.95, W - T - 0.15, UP + 0.66, 5.65);
box(upper, walnut, W - T - 0.08, UP, 3.9, W - T - 0.01, UP + 1.15, 5.9);
// a wardrobe in the dressing room, a desk on the gallery
box(upper, oak, W - T - 0.6, UP, 0.35, W - T - 0.02, UP + 2.2, 2.7);
box(upper, oak, 2.0, UP + 0.72, 0.35, 3.7, UP + 0.76, 1.05);
[[2.05, 0.4], [3.6, 0.4], [2.05, 0.95], [3.6, 0.95]].forEach(p => box(upper, steel, p[0], UP, p[1], p[0] + 0.04, UP + 0.72, p[1] + 0.04));
// rugs
box(lower, rugMat, 1.6, 0, 3.6, 4.4, 0.012, 6.2, false);
box(upper, rug2, 6.6, UP, 3.7, 9.0, UP + 0.012, 6.1, false);
// a floor lamp by the lounge chair, lamps by the bed, one on the desk
function lamp(grp, x, y, z, h, r) {
  box(grp, steel, x - 0.12, y, z - 0.12, x + 0.12, y + 0.02, z + 0.12);
  box(grp, steel, x - 0.012, y, z - 0.012, x + 0.012, y + h, z + 0.012);
  const s = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.8, r, r * 1.1, 24, 1, true), shade);
  s.material.side = THREE.DoubleSide; s.position.set(x, y + h, z); s.castShadow = true; grp.add(s);
}
lamp(lower, 0.75, 0, 3.55, 1.45, 0.22);
lamp(upper, 9.35, UP + 0.55, 3.62, 0.3, 0.12);
lamp(upper, 9.35, UP + 0.55, 6.18, 0.3, 0.12);
lamp(upper, 3.45, UP + 0.76, 0.55, 0.32, 0.1);

// ——— light ———
const sun = new THREE.DirectionalLight(0xffffff, 3);
sun.castShadow = true;
sun.shadow.mapSize.set(touch ? 1024 : 2048, touch ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 60 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.025;
sun.target.position.set(W / 2, 1.5, D / 2);
scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight(0xdde7ff, 0x2a2320, 0.3);
scene.add(hemi);
// the lamps at night
const NIGHT = [[2.75, 2.2, 2.2, 8], [8.1, 2.2, 4.9, 7], [0.75, 1.55, 3.55, 6], [9.1, UP + 0.95, 4.9, 6], [3.3, UP + 1.2, 0.7, 4], [8.6, UP + 2.2, 1.5, 3]];
const lamps = NIGHT.map((l, i) => {
  const p = new THREE.PointLight(0xffb36b, 0, 7, 2);
  p.position.set(l[0], l[1], l[2]); p.userData.max = l[3];
  (i >= 3 ? upper : lower).add(p);
  return p;
});
const SUNV = new THREE.Vector3();
let hour = 16.5;
function sunAt(h) {
  const az = (h - 13) / 8 * 2.23, el = 1.1 * Math.sin(Math.PI * (h - 5) / 16);
  SUNV.set(-Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
  return el;
}
const sm = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
const glowMats = new Set([shade]);
function setTime(h) {
  hour = h;
  const el = sunAt(h), day = sm(el / 0.35), up = sm(el / 0.05);
  sun.position.copy(sun.target.position).addScaledVector(SUNV, 25);
  sun.intensity = (1.4 + 2.4 * sm(el / 0.6)) * up;
  sun.color.setRGB(1, 0.55 + 0.4 * sm(el / 0.6), 0.3 + 0.6 * sm(el / 0.6));
  sun.visible = up > 0.001;
  scene.environmentIntensity = 0.1 + 0.45 * day;
  hemi.intensity = 0.04 + 0.32 * day;
  hemi.color.setRGB(0.75 + 0.2 * day, 0.78 + 0.15 * day, 1);
  const on = Math.max(sm((h - 19) / 1.4), 1 - sm((h - 5.6) / 0.8));
  lamps.forEach(l => { l.intensity = l.userData.max * on; });
  glowMats.forEach(m => { m.emissiveIntensity = on * 2.2; });
  renderer.toneMappingExposure = 1.0 + 0.55 * (1 - day);
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60 / 5) * 5;
  out.value = String(hh + (mm === 60 ? 1 : 0)).padStart(2, '0') + ':' + String(mm % 60).padStart(2, '0');
  renderer.shadowMap.needsUpdate = true;
}

// ——— the furniture: Poly Haven models, placed by their bottom, facing where they're turned ———
const loader = new GLTFLoader(manager);
const items = [], pickable = [];
const PIECES = [
  // file, name, level, x, z, turn (0 faces south), extra: { scale, hang (top height), y }
  ['sofa_02', 'Chesterfield sofa', 0, 3.0, 4.05, 0],
  ['modern_coffee_table_01', 'Coffee table', 0, 3.0, 5.15, Math.PI / 2],
  ['mid_century_lounge_chair', 'Lounge chair', 0, 1.05, 4.9, Math.PI / 2],
  ['Ottoman_01', 'Leather ottoman', 0, 4.85, 5.35, 0],
  ['modern_wooden_cabinet', 'Media console', 0, 3.0, 6.5, Math.PI],
  ['potted_plant_04', 'Aloe', 0, 0.6, 3.45, 0, { scale: 3.2 }],
  ['ceramic_vase_01', 'Vase', 0, 1.9, 6.5, 0, { y: 'top' }],
  ['round_wooden_table_01', 'Round table', 0, 8.1, 4.9, 0],
  ['dining_chair_02', 'Dining chair', 0, 8.1, 4.05, 0],
  ['dining_chair_02', 'Dining chair', 0, 8.1, 5.75, Math.PI],
  ['dining_chair_02', 'Dining chair', 0, 7.25, 4.9, Math.PI / 2],
  ['dining_chair_02', 'Dining chair', 0, 8.95, 4.9, -Math.PI / 2],
  ['hanging_picture_frame_02', 'Print', 0, 9.0, 2.87, 0, { y: 1.55 }],
  ['modern_ceiling_lamp_01', 'Glass pendant', 0, 2.2, 2.22, 0, { hang: UB }],
  ['modern_ceiling_lamp_01', 'Glass pendant', 0, 3.35, 2.22, 0, { hang: UB }],
  ['modern_ceiling_lamp_01', 'Glass pendant', 0, 8.1, 4.9, 0, { hang: UB }],
  ['steel_frame_shelves_03', 'Steel shelving', 1, 0.62, 1.55, Math.PI / 2],
  ['dining_chair_02', 'Desk chair', 1, 2.85, 1.45, Math.PI],
  ['mid_century_lounge_chair', 'Reading chair', 1, 5.5, 1.35, -2.3],
  ['potted_plant_04', 'Aloe', 1, 2.3, 0.6, 0, { y: UP + 0.76 }],
  ['drawer_cabinet', 'Chest of drawers', 1, 8.3, 0.5, 0],
  ['side_table_01', 'Bedside table', 1, 9.35, 3.62, -Math.PI / 2],
  ['side_table_01', 'Bedside table', 1, 9.35, 6.18, -Math.PI / 2],
  ['Ottoman_01', 'Ottoman', 1, 7.1, 4.9, Math.PI / 2],
  ['hanging_picture_frame_02', 'Print', 1, W - T - 0.02, 4.9, -Math.PI / 2, { y: UP + 1.75 }]
];
const files = [...new Set(PIECES.map(p => p[0]))];
const models = {};
const BOX = new THREE.Box3(), V = new THREE.Vector3();
function place(p) {
  const [file, name, lvl, x, z, rot, ex = {}] = p;
  const obj = models[file].clone(true);
  const g = new THREE.Group(); g.add(obj);
  if (ex.scale) obj.scale.setScalar(ex.scale);
  obj.rotation.y = rot;
  obj.updateMatrixWorld(true);
  BOX.setFromObject(obj);
  const c = BOX.getCenter(V);
  obj.position.x -= c.x; obj.position.z -= c.z;
  const floorY = lvl ? UP : 0;
  let y = floorY - BOX.min.y;
  if (ex.hang != null) y = ex.hang - BOX.max.y;
  else if (ex.y === 'top') y = 0.86 - BOX.min.y; // on the media console
  else if (typeof ex.y === 'number') y = ex.y - (BOX.min.y + BOX.max.y) / 2;
  obj.position.y = y;
  g.position.set(x, 0, z);
  obj.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; m.userData.item = g; pickable.push(m); } });
  (lvl ? upper : lower).add(g);
  g.userData = { name, lvl, file, drop: 0, bounce: -1, home: g.position.clone(), fixed: ex.hang != null || typeof ex.y === 'number' || ex.y === 'top' };
  items.push(g);
}
// ——— the rooms, for play ———
const ROOMS = [
  { name: 'Living room', area: '22.6', level: 'both', lvl: 0, at: [2.6, 1.2, 4.6], cam: [5.4, 4.2, 12.5], tgt: [2.8, 1.3, 4.6],
    text: 'Double height and 5.5 m of steel windows to the west: the evening sun comes right across the floor.' },
  { name: 'Kitchen', area: '19.4', level: 'lower', lvl: 0, at: [2.8, 1.1, 1.4], cam: [3.4, 8.2, 8.2], tgt: [3.0, 0.4, 1.6],
    text: 'Under the gallery: a long counter under the window and an island in stone.' },
  { name: 'Dining', area: '14.0', level: 'both', lvl: 0, at: [8.1, 1.3, 4.9], cam: [12.6, 3.3, 10.4], tgt: [8.0, 1.0, 4.7],
    text: 'A round table for four by the east window, so breakfast gets the morning sun.' },
  { name: 'Bath', area: '5.5', level: 'lower', lvl: 0, at: [8.7, 1.1, 1.5], cam: [9.0, 7.6, 6.2], tgt: [8.8, 0.3, 1.5],
    text: 'A full bath on the lower level, with its own window.' },
  { name: 'Gallery', area: '13.0', level: 'upper', lvl: 1, at: [3.0, 4.1, 1.5], cam: [3.6, 8.6, 9.4], tgt: [3.0, 3.4, 1.5],
    text: 'A study over the kitchen that looks down into the living room.' },
  { name: 'Dressing room', area: '6.0', level: 'upper', lvl: 1, at: [8.6, 4.1, 1.5], cam: [9.4, 9.2, 7.0], tgt: [8.6, 3.2, 1.4],
    text: 'Walk-in, between the gallery and the bedroom.' },
  { name: 'Bedroom', area: '14.0', level: 'upper', lvl: 1, at: [8.0, 4.0, 4.9], cam: [12.4, 7.0, 10.6], tgt: [8.2, 3.6, 4.8],
    text: 'Over the dining room, open to the double height behind a glass rail.' }
];
const pinsEl = document.getElementById('pins');
ROOMS.forEach((r, i) => {
  const b = document.createElement('button');
  b.className = 'pin'; b.type = 'button';
  b.innerHTML = '<i></i>' + r.name + ' <b>' + r.area + ' m²</b>';
  b.addEventListener('click', () => goRoom(i));
  pinsEl.appendChild(b);
  r.el = b; r.v = new THREE.Vector3(...r.at);
});
const card = document.getElementById('card');
let room = -1, level = 'both', playing = false;
function goRoom(i) {
  if (!playing) return;
  const r = ROOMS[i];
  room = i;
  setLevel(r.level, true);
  // a phone sees less across, so it stands further back
  const k = portrait() ? 1.75 : 1;
  fly(r.cam.map((c, j) => r.tgt[j] + (c - r.tgt[j]) * k), r.tgt);
  document.getElementById('cardName').textContent = r.name;
  document.getElementById('cardArea').textContent = r.area;
  document.getElementById('cardText').textContent = r.text;
  card.classList.add('on');
  ROOMS.forEach((q, j) => q.el.classList.toggle('on', j === i));
}
function closeRoom() { room = -1; card.classList.remove('on'); ROOMS.forEach(q => q.el.classList.remove('on')); }
function home() {
  closeRoom(); setLevel('both', true);
  const p = poseOf(ST[2], 2), e = eyeOf(p);
  fly([e.x, e.y, e.z], [p.t.x, p.t.y, p.t.z]);
}
document.getElementById('cardBack').addEventListener('click', home);
document.getElementById('reset').addEventListener('click', home);
function setLevel(l, quiet) {
  level = l;
  document.querySelectorAll('[data-level]').forEach(b => b.classList.toggle('on', b.dataset.level === l));
  if (!quiet && l === 'upper') fly([W / 2 + 6, UP + 7.5, D / 2 + 9.5].map((c, j) => [W / 2, UP + 0.8, D / 2][j] + (c - [W / 2, UP + 0.8, D / 2][j]) * (portrait() ? 1.7 : 1)), [W / 2, UP + 0.8, D / 2]);
  if (!quiet && l === 'lower') fly([W / 2 + 6, 9.5, D / 2 + 8.5].map((c, j) => [W / 2, 0.8, D / 2][j] + (c - [W / 2, 0.8, D / 2][j]) * (portrait() ? 1.7 : 1)), [W / 2, 0.8, D / 2]);
}
document.querySelectorAll('[data-level]').forEach(b => b.addEventListener('click', () => { closeRoom(); setLevel(b.dataset.level); }));
let flight = null;
function fly(pos, tgt, dur = 1.2) {
  flight = { t: 0, dur: reduce ? 0.01 : dur, p0: camera.position.clone(), t0: controls.target.clone(), p1: new THREE.Vector3(...pos), t1: new THREE.Vector3(...tgt) };
}
const out = document.getElementById('timeOut'), time = document.getElementById('time');
time.addEventListener('input', () => { userH = +time.value; });
document.querySelectorAll('[data-floor]').forEach(b => b.addEventListener('click', () => {
  setFloor(b.dataset.floor);
  document.querySelectorAll('[data-floor]').forEach(q => q.classList.toggle('on', q === b));
}));
document.querySelectorAll('[data-walls]').forEach(b => b.addEventListener('click', () => {
  setWalls(b.dataset.walls);
  document.querySelectorAll('[data-walls]').forEach(q => q.classList.toggle('on', q === b));
}));

// ——— the story: a pose per stage, the camera on a sphere round a target ———
// 0 the plan · 1 the walls · 2 furnished · 3 the lower level · 4 living · 5 kitchen · 6 bedroom ·
// 7 → 8 a day, scrolled like a page · 9 play
const LAST = 9, DAY = 7;
// az: round from the south (0) towards the east; pol: from straight down; r: how far; h: the hour.
// room: a close view, which a phone takes less far back than a view of the whole loft
const ST = [
  { t: [5, 0, 3.5], az: 0.35, pol: 0.26, r: 19.5, h: 16.5 },
  { t: [5, 1.8, 3.5], az: 0.9, pol: 0.98, r: 19.5, h: 16.5 },
  { t: [5, 1.9, 3.5], az: 0.63, pol: 1.12, r: 18.8, h: 16.5 },
  { t: [5, 0.5, 3.5], az: 0.45, pol: 0.82, r: 16.5, h: 16.5 },
  { t: [2.8, 1.2, 4.6], az: 0.32, pol: 1.22, r: 8.8, h: 16.5, room: 1 },
  { t: [3.0, 0.4, 1.6], az: 0.06, pol: 0.7, r: 10.2, h: 10, room: 1 },
  { t: [8.2, 3.6, 4.8], az: 0.63, pol: 1.12, r: 7.9, h: 13, room: 1 },
  { t: [5, 1.8, 3.5], az: 1.2, pol: 1.05, r: 19.5, h: 7 },
  { t: [5, 1.8, 3.5], az: -0.65, pol: 1.05, r: 19.5, h: 22 },
  null // play: wherever the reader leaves the camera
];
let userH = 18;
const user = { t: new THREE.Vector3(5, 1.9, 3.5), az: 0.63, pol: 1.12, r: 18.8, set: false };
const P0 = { t: new THREE.Vector3(), az: 0, pol: 0, r: 0 }, P1 = { t: new THREE.Vector3(), az: 0, pol: 0, r: 0 }, EYE = new THREE.Vector3(), TGT = new THREE.Vector3();
function poseOf(s, n, outp = { t: new THREE.Vector3(), az: 0, pol: 0, r: 0 }) {
  if (!s) { outp.t.copy(user.t); outp.az = user.az; outp.pol = user.pol; outp.r = user.r; return outp; }
  const k = portrait() ? (s.room ? 1.5 : 1.75) : 1;
  outp.t.set(s.t[0], s.t[1], s.t[2]); outp.az = s.az; outp.pol = s.pol; outp.r = s.r * k;
  return outp;
}
function eyeOf(p, v = new THREE.Vector3()) {
  return v.set(p.t.x + p.r * Math.sin(p.pol) * Math.sin(p.az), p.t.y + p.r * Math.cos(p.pol), p.t.z + p.r * Math.sin(p.pol) * Math.cos(p.az));
}
// the scroll track: screens per flight, and a hold where a stage is read; the day is scrolled like a page
const keys = [], stops = [];
(function () {
  const RUNS = [1.6, 1.5, 1.3, 1.2, 1.1, 1.3, 1.2, 3.0, 1.4], HOLD = 0.4;
  let pos = 0.15;
  keys.push([0, 0], [pos, 0]); stops.push(0);
  RUNS.forEach((r, i) => {
    pos += r; keys.push([pos, i + 1]); stops.push(pos);
    if (i + 1 < LAST && i + 1 !== DAY) { pos += HOLD; keys.push([pos, i + 1]); }
  });
  keys.forEach(k => { k[0] /= pos; });
  for (let i = 1; i < stops.length; i++) stops[i] /= pos;
  document.querySelector('.track').style.height = ((pos + 1) * 100) + 'vh';
})();

// on a wide screen the model sits right of centre, clear of the words on the left;
// on a phone it is lifted, clear of the words at the bottom
// (in play, a phone's model drops back down: the words above it are shorter, the controls take the bottom)
let viewW = innerWidth, viewH = innerHeight;
function frameView(W = viewW, H = viewH) {
  viewW = W; viewH = H;
  const sx = !portrait() && W > 900 ? 1.2 : 1, sy = portrait() ? (playing ? 1.12 : 1.3) : 1, oy = portrait() ? H * (playing ? 0.02 : 0.3) : 0;
  camera.fov = portrait() ? 52 : 36;
  camera.aspect = W * sx / (H * sy);
  if (sx > 1 || sy > 1) camera.setViewOffset(W * sx, H * sy, 0, oy, W, H); else camera.clearViewOffset();
  camera.updateProjectionMatrix();
}

// ——— picking furniture up, in play ———
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), HIT = new THREE.Vector3();
const tip = document.getElementById('tip'), tipB = tip.querySelector('b'), tipS = tip.querySelector('span');
let hover = null, drag = null, down = null;
function aim(e) { ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera); }
function pick(e) {
  aim(e);
  for (const h of ray.intersectObjects(pickable, false)) {
    const g = h.object.userData.item;
    if (!g.visible || (g.userData.lvl && level === 'lower')) continue;
    return g;
  }
  return null;
}
function showTip(g, e) {
  if (!g) { tip.classList.remove('on'); return; }
  tipB.textContent = g.userData.name;
  tipS.textContent = g.userData.fixed ? 'Poly Haven · tap it' : 'Poly Haven · drag to move it';
  tip.style.transform = 'translate(' + (e.clientX + 16) + 'px,' + (e.clientY + 14) + 'px)';
  tip.classList.add('on');
}
canvas.addEventListener('pointerdown', (e) => {
  if (!playing) return;
  down = { x: e.clientX, y: e.clientY, g: pick(e) };
  const g = down.g;
  if (g && !g.userData.fixed) {
    controls.enabled = false;
    plane.constant = -(g.userData.lvl ? UP : 0);
    ray.ray.intersectPlane(plane, HIT);
    drag = { g, dx: g.position.x - HIT.x, dz: g.position.z - HIT.z, moved: false };
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('grabbing');
  }
});
canvas.addEventListener('pointermove', (e) => {
  if (!playing) return;
  if (drag) {
    aim(e);
    if (ray.ray.intersectPlane(plane, HIT)) {
      const g = drag.g;
      g.position.x = Math.max(0.4, Math.min(W - 0.4, HIT.x + drag.dx));
      g.position.z = Math.max(0.4, Math.min(D - 0.4, HIT.z + drag.dz));
      // upstairs there is floor only over the kitchen strip and over the dining room, not over the double height
      if (g.userData.lvl && g.position.z > 2.75 && g.position.x < 6.5) { if (g.position.x > 5.2) g.position.x = 6.5; else g.position.z = 2.75; }
      drag.moved = true;
      renderer.shadowMap.needsUpdate = true;
    }
    showTip(drag.g, e);
    return;
  }
  if (e.pointerType !== 'mouse') return;
  const g = pick(e);
  if (g !== hover) { hover = g; canvas.classList.toggle('point', !!g); }
  showTip(g, e);
});
function up(e) {
  const d = down; down = null;
  if (drag) {
    const g = drag.g, moved = drag.moved && d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 4;
    drag = null; canvas.classList.remove('grabbing');
    if (!moved) g.userData.bounce = 0;
    if (e.pointerType !== 'mouse') setTimeout(() => tip.classList.remove('on'), 900);
    return;
  }
  if (d && d.g && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6) { d.g.userData.bounce = 0; showTip(d.g, e); if (e.pointerType !== 'mouse') setTimeout(() => tip.classList.remove('on'), 1200); }
}
canvas.addEventListener('pointerup', up);
canvas.addEventListener('pointercancel', up);
canvas.addEventListener('pointerleave', () => { if (!drag) { tip.classList.remove('on'); hover = null; } });

// ——— the renderer the scroll shell drives ———
const ease = (x) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const clockEl = document.getElementById('clock'), clockT = document.getElementById('clockT'), clockS = document.getElementById('clockS');
let lastScroll = -1e9, hintAt = -1, clockMin = -1, upperY = 7, shownHour = -1;
addEventListener('scroll', () => { lastScroll = performance.now(); }, { passive: true });
function css(el, k, v) { const c = el._s || (el._s = {}); if (c[k] !== v) { c[k] = v; el.style[k] = v; } }
function dayWords(h) {
  return h < 9 ? 'Morning: the sun in the east windows' : h < 13 ? 'Late morning, from the south' : h < 17 ? 'Afternoon: round to the west' :
    h < 20 ? 'Evening, through the big west windows' : h < 21 ? 'Sunset' : 'Night: the lamps are on';
}

const R = {
  init() { return true; },
  load(tick) {
    manager.onProgress = (u, done, total) => tick(done / total);
    return Promise.all(files.map(f => new Promise((res, rej) => loader.load('models/' + f + '/' + f + '.gltf', g => { models[f] = g.scene; res(); }, undefined, rej))))
      .then(() => {
        PIECES.forEach(place);
        // the glass globes glow at night
        items.forEach(g => { if (g.userData.file === 'modern_ceiling_lamp_01') g.traverse(m => { if (m.isMesh) { m.material = m.material.clone(); m.material.emissive = new THREE.Color(0xffc583); glowMats.add(m.material); } }); });
        // each piece drops in at its own moment of the second stage
        items.forEach((g, i) => { g.userData.at = 1.12 + i / items.length * 0.72; });
      });
  },
  build(env) {
    renderer.setPixelRatio(env.dpr);
    renderer.setSize(env.W, env.H, false);
    frameView(env.W, env.H);
    if (!user.set) { poseOf(ST[2], 2, P0); user.t.copy(P0.t); user.az = P0.az; user.pol = P0.pol; user.r = P0.r; }
  },
  setDpr(env) { renderer.setPixelRatio(env.dpr); renderer.setSize(env.W, env.H, false); },
  frame(env) {
    const stage = Math.min(LAST, Math.max(0, env.stage)), dt = env.dt / 1000, k = 1 - Math.exp(-dt * 7);
    const n = Math.min(LAST - 1, Math.floor(stage)), f0 = stage - n, f = n === DAY ? f0 : ease(f0);

    // play begins once the last stage is reached, and ends as soon as the page is scrolled back
    const play = stage > LAST - 0.02;
    if (play !== playing) {
      playing = play;
      root.classList.toggle('playing', play);
      canvas.classList.toggle('play', play);
      canvas.style.touchAction = play ? 'none' : 'pan-y';
      frameView();
      if (play) { poseOf(null, 9, P0); controls.target.copy(P0.t); eyeOf(P0, camera.position); time.value = userH; }
      else { closeRoom(); drag = null; flight = null; tip.classList.remove('on'); if (level !== 'both') setLevel('both', true); }
      controls.enabled = play;
    }
    if (playing) {
      if (flight) {
        flight.t += dt / flight.dur;
        const e = ease(Math.min(1, flight.t));
        camera.position.lerpVectors(flight.p0, flight.p1, e);
        controls.target.lerpVectors(flight.t0, flight.t1, e);
        if (flight.t >= 1) flight = null;
      }
      controls.enabled = !drag && !flight;
      controls.update();
      // where the reader leaves the camera is where the way back starts from
      const v = EYE.copy(camera.position).sub(controls.target);
      user.t.copy(controls.target); user.r = v.length(); user.pol = Math.acos(Math.max(-1, Math.min(1, v.y / user.r))); user.az = Math.atan2(v.x, v.z); user.set = true;
    } else {
      // between two stages: the target moves, the camera swings round it, the distance changes on a log scale
      poseOf(ST[n], n, P0); poseOf(ST[n + 1], n + 1, P1);
      let daz = P1.az - P0.az; if (daz > Math.PI) daz -= 2 * Math.PI; else if (daz < -Math.PI) daz += 2 * Math.PI;
      TGT.lerpVectors(P0.t, P1.t, f);
      P0.t.copy(TGT); P0.az += daz * f; P0.pol += (P1.pol - P0.pol) * f; P0.r = P0.r * Math.pow(P1.r / P0.r, f);
      eyeOf(P0, camera.position);
      camera.lookAt(TGT);
    }

    // the hour: each stage has its own; through the day it follows the scroll; in play the slider has it
    const hA = ST[n] ? ST[n].h : userH, hB = ST[n + 1] ? ST[n + 1].h : userH;
    const h = playing ? userH : hA + (hB - hA) * f;
    if (Math.abs(h - shownHour) > 0.004) { shownHour = h; setTime(h); }

    // the build: the walls rise out of the plan, the top floor comes down onto them, the furniture drops in
    const grow = reduce ? (stage > 0.5 ? 1 : 0.02) : Math.max(0.02, ease(clamp01((stage - 0.12) / 0.83)));
    const lift = playing ? (level === 'lower' ? 5.5 : 0) : 5.5 * ease(clamp01((stage - 2.5) / 0.5)) * (1 - ease(clamp01((stage - 5.35) / 0.6)));
    upperY += (lift - upperY) * (playing ? k : 1);
    const drop = 7 * (1 - ease(clamp01((stage - 0.45) / 0.55)));
    upper.position.y = upperY + drop;
    upper.visible = upper.position.y < 5.2;
    const full = H - (H - UB) * Math.min(1, upperY / 5.5);
    for (const s in SIDES) {
      const S = SIDES[s], target = S.out(camera.position) ? Math.min(CUT, full * grow) : full * grow;
      S.h += (target - S.h) * k; S.plane.constant = S.h + 0.001;
    }
    inner.plane.constant = H * grow;
    let moving = stage < 2.1 || Math.abs(lift - upperY) > 0.01 || (stage > 0.4 && stage < 1.05);
    for (const g of items) {
      const u = g.userData;
      if (!playing || u.bounce < 0) {
        const p = clamp01((stage - u.at) / 0.24);
        g.visible = p > 0;
        // a fall, and a small bounce as it lands
        g.position.y = p < 0.8 ? 2.4 * (1 - p / 0.8) * (1 - p / 0.8) : Math.sin((p - 0.8) / 0.2 * Math.PI) * 0.06;
      }
      if (playing && u.bounce >= 0) {
        u.bounce += dt;
        const b = u.bounce, w = Math.sin(b * 22) * Math.exp(-b * 6);
        g.scale.set(1 + w * 0.06, 1 - w * 0.09, 1 + w * 0.06);
        g.position.y = Math.max(0, Math.sin(Math.min(1, b / 0.3) * Math.PI) * 0.12);
        moving = true;
        if (b > 0.8) { u.bounce = -1; g.scale.set(1, 1, 1); g.position.y = 0; }
      }
    }
    if (moving) renderer.shadowMap.needsUpdate = true;

    renderer.render(scene, camera);

    // in play, the rooms' pins over their rooms
    const iw = env.W, ih = env.H;
    for (let i = 0; i < ROOMS.length; i++) {
      const r = ROOMS[i];
      let hide = !playing || (r.lvl && level === 'lower') || (!r.lvl && level === 'upper') || (room >= 0 && room !== i);
      if (!hide) { EYE.copy(r.v); EYE.y += r.lvl ? upper.position.y : 0; EYE.project(camera); hide = EYE.z > 1; }
      const o = hide ? '0' : '1';
      if (r.el._o !== o) { r.el._o = o; r.el.style.opacity = o; r.el.style.pointerEvents = hide ? 'none' : ''; }
      if (!hide) r.el.style.transform = 'translate(' + ((EYE.x * 0.5 + 0.5) * iw).toFixed(1) + 'px,' + ((-EYE.y * 0.5 + 0.5) * ih).toFixed(1) + 'px) translate(-50%,-50%)';
    }

    // the clock, through the day
    const co = clamp01((stage - 6.6) / 0.3) * (1 - clamp01((stage - 8.2) / 0.3));
    css(clockEl, 'opacity', co.toFixed(3)); css(clockEl, 'visibility', co > 0.01 ? 'visible' : 'hidden');
    if (co > 0.01) {
      const mins = Math.round(h * 6) * 10;
      if (mins !== clockMin) {
        clockMin = mins;
        clockT.textContent = String(Math.floor(mins / 60)).padStart(2, '0') + ':' + String(mins % 60).padStart(2, '0');
        clockS.textContent = dayWords(h);
      }
    }
    // the scroll hint, as on the other pages
    const hint = window.Hint;
    if (hint) {
      const at = stage < 0.05 ? 0 : stage > LAST - 0.02 ? 2 : 1;
      if (at !== hintAt) { hintAt = at; hint.say(at); hint.el.classList.toggle('is-back', at === 2); }
      const room2 = iw >= 1000 && ih >= 700 ? stage < 3.5 : stage < 0.05;
      css(hint.el, 'opacity', performance.now() - lastScroll > 900 && room2 && !playing ? '1' : '0');
    }
  },
  workAt() { return false; },
  coverAt() { return -1; },
  free(stage) { return stage > DAY - 0.02 && stage < DAY + 1.02; }
};

BKit({ cases: [], renderer: R, keys, stops, last: LAST });
// a handle for the test scripts
window.__loft = { camera, controls, goRoom, home, get ready() { return items.length > 0; }, get playing() { return playing; } };
