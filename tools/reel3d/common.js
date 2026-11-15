import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export { THREE };
export const W = 1080, H = 1920;
export const C = window.CFG.scene;
export const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gl'), antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
export const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
export const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 100);

export const key = new THREE.DirectionalLight(0xfff4dc, 2.2); key.position.set(4, 9, 6); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 8; key.shadow.bias = -0.0004;
Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 });
scene.add(key);
export const rim = new THREE.DirectionalLight(0xf4d96c, 2.0); rim.position.set(-6, 4, -6); scene.add(rim);
export const amb = new THREE.AmbientLight(0xffffff, 0.25); scene.add(amb);

export function floorAt(y, op = 0.32) {
  const f = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: op }));
  f.rotation.x = -Math.PI / 2; f.position.y = y; f.receiveShadow = true; scene.add(f); return f;
}
export const M = (c, r = 0.45, m = 0.05) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
export const mats = {
  cream: M(0xf2f3ef, 0.38), ink: M(0x101a14, 0.5), green: M(0x1d4a30, 0.42), deep: M(0x133621, 0.45),
  gold: M(0xf4d96c, 0.28, 0.65), paper: M(0xffffff, 0.7), key: M(0x23302a, 0.45), wood: M(0xc89b6a, 0.6),
  card: M(0xb98b5a, 0.85), glass: M(0x0b1510, 0.15, 0.2), skin: M(0xe8b48f, 0.6),
};
export function rb(w, h, d, r, mat) { const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, r), mat); m.castShadow = m.receiveShadow = true; return m; }
export function cyl(rt, rb_, h, mat, seg = 40) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb_, h, seg), mat); m.castShadow = m.receiveShadow = true; return m; }
export function sph(r, mat) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20), mat); m.castShadow = m.receiveShadow = true; return m; }
export function tex(w, h, draw) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
export const glow = (t, k = 0.9) => new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: k, roughness: 0.3 });
export function plane(w, h, mat) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); return m; }

export const cl = x => Math.max(0, Math.min(1, x));
export const eio = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
export const back = x => { x = cl(x); const c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
export const lerp = (a, b, k) => a + (b - a) * k;
export const amp = t => { const a = C.amp; const i = Math.floor(t * 30); return a[Math.max(0, Math.min(a.length - 1, i))] || 0; };
// screen position (px) of a world point, for HTML labels
export function toScreen(v) { const p = v.clone().project(camera); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H]; }
