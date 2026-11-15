import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const W = 1080, H = 1920;
const C = window.CFG.scene;
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gl'), antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const pm = new THREE.PMREMGenerator(renderer);
scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 100);

const key = new THREE.DirectionalLight(0xfff4dc, 2.2); key.position.set(4, 9, 6); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 8; key.shadow.bias = -0.0004;
Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 30 });
scene.add(key);
const rim = new THREE.DirectionalLight(0xf4d96c, 2.0); rim.position.set(-6, 4, -6); scene.add(rim);
scene.add(new THREE.AmbientLight(0xffffff, 0.25));

const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.32 }));
floor.rotation.x = -Math.PI / 2; floor.position.y = -2.45; floor.receiveShadow = true; scene.add(floor);

// materials
const M = (c, r = 0.45, m = 0.05) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
const cream = M(0xf2f3ef, 0.38), ink = M(0x101a14, 0.5), green = M(0x1d4a30, 0.42), gold = M(0xf4d96c, 0.28, 0.65);
const paper = M(0xffffff, 0.7), keyMat = M(0x23302a, 0.45), glass = M(0x0b1510, 0.15, 0.2);

function rb(w, h, d, r, mat) { const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, r), mat); m.castShadow = m.receiveShadow = true; return m; }
function cyl(rt, rb_, h, mat, seg = 40) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb_, h, seg), mat); m.castShadow = m.receiveShadow = true; return m; }

function screenTex(draw) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 320;
  const g = cv.getContext('2d'); draw(g, 512, 320);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const emissive = (tex) => new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.9, roughness: 0.3 });

// parts: each has a group, home pos (register frame), exploded offset, own rotation
const parts = {};
function part(name, group, home, off, spin = [0, 0, 0]) {
  group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(group); parts[name] = { g: group, home: new THREE.Vector3(...home), off: new THREE.Vector3(...off), spin };
}

// base body (stays)
{
  const g = new THREE.Group();
  g.add(rb(3.2, 0.9, 2.4, 0.16, cream));
  const stripe = rb(3.22, 0.12, 2.42, 0.05, green); stripe.position.y = -0.3; g.add(stripe);
  part('base', g, [0, -0.85, 0], [0, 0, 0]);
}
// cash drawer -> weekly sales report
{
  const g = new THREE.Group();
  const box = rb(2.9, 0.55, 2.1, 0.1, cream); g.add(box);
  const front = rb(2.92, 0.5, 0.12, 0.05, green); front.position.set(0, 0, 1.03); g.add(front);
  const handle = rb(0.9, 0.08, 0.1, 0.04, gold); handle.position.set(0, 0.05, 1.12); g.add(handle);
  // bar chart rising out of the drawer
  const bars = new THREE.Group(); bars.name = 'bars';
  [0.35, 0.55, 0.8, 1.1].forEach((h, i) => { const b = rb(0.36, 1, 0.36, 0.06, gold); b.userData.h = h; b.position.set(-0.75 + i * 0.5, 0, 0.1); bars.add(b); });
  g.add(bars); g.userData.bars = bars;
  part('report', g, [0, -1.58, 0.05], [0, -0.55, 1.7]);
}
// keypad -> sales tax calculator
{
  const g = new THREE.Group();
  const deck = rb(1.7, 0.2, 1.3, 0.08, ink); g.add(deck);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    const k = rb(0.3, 0.14, 0.24, 0.05, (c === 3 ? gold : (r === 3 && c === 0 ? green : keyMat)));
    k.position.set(-0.6 + c * 0.4, 0.15, -0.42 + r * 0.29); g.add(k);
  }
  g.rotation.x = 0.32;
  part('tax', g, [-0.55, -0.2, 0.45], [-1.05, 0.25, 1.6], [0.32, 0, 0]);
}
// receipt printer + paper -> receipts
{
  const g = new THREE.Group();
  g.add(rb(1.0, 0.55, 0.9, 0.1, cream));
  const slot = rb(0.7, 0.06, 0.1, 0.02, ink); slot.position.set(0, 0.28, 0.12); g.add(slot);
  const roll = cyl(0.22, 0.22, 0.66, paper); roll.rotation.z = Math.PI / 2; roll.position.set(0, 0.22, -0.2); g.add(roll);
  const tex = screenTex((x, w, h) => { x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.fillStyle = '#9aa39e';
    for (let i = 0; i < 9; i++) x.fillRect(60, 24 + i * 32, i % 3 === 2 ? 220 : 380, 10); x.fillStyle = '#133621'; x.fillRect(60, 290, 160, 16); });
  tex.rotation = Math.PI / 2; tex.center.set(0.5, 0.5);
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 1.1, 1, 12), new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.8 }));
  const pos = strip.geometry.attributes.position; for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) + 0.55; pos.setZ(i, 0.18 * y * y); } strip.geometry.computeVertexNormals();
  strip.position.set(0, 0.85, 0.16); strip.castShadow = true; g.add(strip);
  part('receipts', g, [1.0, 0.05, -0.35], [0.6, 1.35, 0.3]);
}
// customer display -> customer emails
{
  const g = new THREE.Group();
  const pole = cyl(0.06, 0.06, 0.8, ink); pole.position.y = 0.1; g.add(pole);
  const head = rb(1.15, 0.78, 0.14, 0.07, ink); head.position.y = 0.85; g.add(head);
  const tex = screenTex((x, w, h) => {
    x.fillStyle = '#133621'; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#f4d96c'; x.lineWidth = 16; x.lineJoin = 'round';
    x.strokeRect(126, 70, 260, 180); x.beginPath(); x.moveTo(126, 70); x.lineTo(256, 170); x.lineTo(386, 70); x.stroke();
    x.fillStyle = '#f2f3ef'; x.beginPath(); x.arc(400, 74, 34, 0, 7); x.fill();
  });
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.64), emissive(tex)); scr.position.set(0, 0.85, 0.075); g.add(scr);
  part('emails', g, [-1.05, 0.2, -0.75], [-0.35, 1.2, -0.1]);
}
// menu sign -> menu sign
{
  const g = new THREE.Group();
  const board = rb(1.9, 1.0, 0.12, 0.06, green); g.add(board);
  const frame = rb(1.98, 1.08, 0.08, 0.05, gold); frame.position.z = -0.03; g.add(frame);
  const tex = screenTex((x, w, h) => {
    x.fillStyle = '#1d4a30'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#f4d96c'; x.font = '700 64px J'; x.textAlign = 'center'; x.fillText('MENU', w / 2, 82);
    x.fillStyle = '#f2f3ef'; for (let i = 0; i < 4; i++) { x.fillRect(70, 124 + i * 46, 250 - (i % 2) * 70, 14); x.fillRect(380, 124 + i * 46, 60, 14); }
  });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.92), emissive(tex)); face.position.z = 0.065; g.add(face);
  part('menu', g, [0.15, 0.9, -1.0], [0.05, 1.55, -0.2]);
}

// gold dust for the burst
const dustGeo = new THREE.BufferGeometry(); const N = 140; const dp = new Float32Array(N * 3), dv = [];
for (let i = 0; i < N; i++) { const a = Math.random() * 6.28, e = Math.random() * 2 - 0.6, s = 1.2 + Math.random() * 3.2; dv.push([Math.cos(a) * s, e * s * 0.8, Math.sin(a) * s]); }
dustGeo.setAttribute('position', new THREE.BufferAttribute(dp, 3));
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xf4d96c, size: 0.07, transparent: true, opacity: 0 }));
scene.add(dust);

// timing
const cl = x => Math.max(0, Math.min(1, x));
const eio = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const back = x => { const c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const FOCUS = C.focus; // [[name, start, end], ...]
const BURST = C.burst, ASSEMBLE = C.assemble;

function explode(t) {
  // frame 0 starts mid air, pieces snap together by ASSEMBLE, then burst at BURST
  if (t < ASSEMBLE) return 0.62 * (1 - back(cl(t / ASSEMBLE)) ) + 0.0;
  if (t < BURST) return 0;
  return back(cl((t - BURST) / 0.55));
}
const focusPos = new THREE.Vector3(0, 0.05, 5.0);
const tmp = new THREE.Vector3();

window.render3d = function (t) {
  const theta = -0.22 + 0.26 * Math.sin(t * 0.42);
  const e = explode(t);
  const qT = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), theta);
  for (const [name, p] of Object.entries(parts)) {
    let f = 0;
    for (const [n, a, b] of FOCUS) if (n === name) f = Math.max(f, eio(cl((t - a) / 0.45)) * (1 - eio(cl((t - b + 0.35) / 0.45))));
    tmp.copy(p.off).multiplyScalar(e).add(p.home).applyQuaternion(qT);
    tmp.lerp(focusPos, f);
    p.g.position.copy(tmp);
    const bob = name === 'base' ? 0 : Math.sin(t * 1.6 + p.home.x * 3) * 0.04 * e;
    p.g.position.y += bob;
    const own = new THREE.Quaternion().setFromEuler(new THREE.Euler(...p.spin));
    const face = new THREE.Quaternion().setFromEuler(new THREE.Euler(p.spin[0] * 0.6 + 0.12, -0.35 + 0.12 * Math.sin(t * 1.3), 0));
    p.g.quaternion.copy(qT).multiply(own).slerp(face, f);
    p.g.scale.setScalar(1 + 0.3 * f);
    if (name === 'report') {
      p.g.userData.bars.children.forEach((b, i) => { const k = back(cl((f - 0.25 - i * 0.12) / 0.4)); const h = Math.max(0.001, b.userData.h * k * (f > 0.01 ? 1 : 0)); b.scale.y = h; b.position.y = 0.2 + h / 2; b.visible = h > 0.01; });
    }
  }
  // dust
  const dk = cl((t - BURST) / 1.4);
  dust.material.opacity = (t > BURST ? 1 : 0) * (1 - dk);
  for (let i = 0; i < N; i++) { const s = eio(dk) * 1.3; dp[i * 3] = dv[i][0] * s; dp[i * 3 + 1] = -0.2 + dv[i][1] * s - dk * dk * 0.6; dp[i * 3 + 2] = dv[i][2] * s; }
  dustGeo.attributes.position.needsUpdate = true;
  // camera: slow push in during the hook, gentle drift after
  const push = eio(cl(t / BURST));
  const zoomOut = eio(cl((t - C.finale) / 1.2));
  camera.position.set(0.6 * Math.sin(t * 0.25), 2.8 + 0.3 * zoomOut, 24.5 - 1.0 * push + 1.0 * zoomOut);
  camera.lookAt(0, 0.95, 0);
  renderer.render(scene, camera);
};
window.ready3d = true;
