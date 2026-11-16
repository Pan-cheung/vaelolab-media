// Generic 3D news scene: the story's official image on a floating slab, chips orbiting it,
// and a deck of big number cards that fly forward one by one. Works for any AI news topic.
// window.CFG.scene: { image: abs path, chips: [{at, text}], cards: [{at, big, label}], cta, amp, ... }
import { THREE, C, scene, camera, renderer, floorAt, mats, rb, cyl, tex, plane, cl, eio, back, lerp, amp } from './common.js';

floorAt(-1.9, 0.26);

// hero slab with the official image
const hero = new THREE.Group(); scene.add(hero);
const SW = 3.5, SH = 1.84;
hero.add(rb(SW + 0.16, SH + 0.16, 0.14, 0.08, mats.ink));
const rim = rb(SW + 0.26, SH + 0.26, 0.08, 0.1, mats.gold); rim.position.z = -0.05; hero.add(rim);
const imgMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
const img = plane(SW, SH, imgMat); img.position.z = 0.075; hero.add(img);
new THREE.TextureLoader().load('file://' + C.image, t => {
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  // cover crop to the slab aspect
  const a = t.image.width / t.image.height, s = SW / SH;
  if (a > s) { t.repeat.set(s / a, 1); t.offset.set((1 - s / a) / 2, 0); } else { t.repeat.set(1, a / s); t.offset.set(0, (1 - a / s) / 2); }
  imgMat.map = t; imgMat.needsUpdate = true; window.ready3d = true;
}, undefined, () => { imgMat.color.set(0x1d4a30); window.ready3d = true; });

// chips orbiting the slab
const chips = (C.chips || []).map((c, i) => {
  const w = 0.42 + 0.11 * c.text.length;
  const m = plane(w, 0.46, new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, map: tex(Math.round(w * 220), 101, (x, W, H) => {
    x.fillStyle = i % 2 ? '#f2f3ef' : '#f4d96c'; x.beginPath(); x.roundRect(4, 4, W - 8, H - 8, 46); x.fill();
    x.fillStyle = '#133621'; x.font = '800 54px J'; x.textAlign = 'center'; x.fillText(c.text, W / 2, 70);
  }) }));
  scene.add(m); return { m, at: c.at, i };
});

// number cards
const cards = (C.cards || []).map((c, i) => {
  const g = new THREE.Group(); scene.add(g);
  g.add(rb(2.3, 1.25, 0.1, 0.08, mats.cream));
  const face = plane(2.2, 1.15, new THREE.MeshBasicMaterial({ toneMapped: false, map: tex(880, 460, (x, W, H) => {
    x.fillStyle = '#f2f3ef'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#133621'; x.font = '800 ' + (c.big.length > 7 ? 120 : 170) + 'px J'; x.textAlign = 'center'; x.fillText(c.big, W / 2, 245);
    x.fillStyle = '#4d5a52'; x.font = '700 60px J'; x.fillText(c.label, W / 2, 360);
    x.fillStyle = '#f4d96c'; x.fillRect(W / 2 - 60, 400, 120, 12);
  }) }));
  face.position.z = 0.055; g.add(face);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return { g, at: c.at, i };
});

// floating gold cubes in the background
const bits = [];
for (let i = 0; i < 26; i++) {
  const b = rb(0.16, 0.16, 0.16, 0.04, i % 3 ? mats.gold : mats.cream);
  const r = Math.sin(i * 91.7) * 0.5 + 0.5, q = Math.sin(i * 12.3) * 0.5 + 0.5;
  b.userData = { x: (r - 0.5) * 7, y: -1.2 + q * 3.6, z: -3.5 - (i % 5) * 0.6, s: 0.3 + r };
  scene.add(b); bits.push(b);
}

const CTA = C.cta;
window.render3d = function (t) {
  const a = amp(t);
  // hero: frame 0 already turned and tilted (visible), swings flat by 0.9s, gentle sway after
  const settle = eio(cl(t / 0.9));
  const toCta = eio(cl((t - CTA) / 0.8));
  hero.position.set(0, 1.45 + Math.sin(t * 1.1) * 0.05 + toCta * 0.1, lerp(-0.8, 0, settle) - toCta * 0.3);
  hero.rotation.set(lerp(0.25, -0.05, settle) + Math.sin(t * 0.7) * 0.03, lerp(-0.6, 0, settle) + Math.sin(t * 0.45) * 0.14, lerp(0.12, 0, settle));
  hero.scale.setScalar(0.95 * (1 + a * 0.04));
  // chips: stickers pinned around the slab corners
  const spots = [[-1.22, 2.25, 0.9], [1.22, 2.2, 0.9], [1.25, 0.7, 0.9]];
  chips.forEach(c => {
    const k = back((t - c.at) / 0.4);
    const p = spots[c.i % spots.length];
    c.m.position.set(p[0], p[1] + Math.sin(t * 2 + c.i) * 0.05, p[2]);
    c.m.quaternion.copy(camera.quaternion);
    c.m.rotateZ((c.i % 2 ? -1 : 1) * 0.08);
    c.m.scale.setScalar(Math.max(0.001, 0.8 * k * (1 - toCta)));
  });
  // cards: only the newest sits in front below the slab; the previous one flies out to the left
  cards.forEach(c => {
    const next = cards[c.i + 1] ? cards[c.i + 1].at : CTA;
    const kin = back((t - c.at) / 0.5), kout = eio(cl((t - next) / 0.45));
    c.g.visible = t >= c.at - 0.05 && kout < 1;
    c.g.position.set(lerp(lerp(3.2, 0, cl((t - c.at) / 0.4)), -3.4, kout), -0.05 + Math.sin(t * 1.6) * 0.03, 2.2);
    c.g.rotation.set(-0.1, lerp(-0.12, 0.6, kout) + Math.sin(t * 0.9) * 0.05, lerp(0, 0.15, kout));
    c.g.scale.setScalar(Math.max(0.001, kin * (1 - 0.5 * kout)));
  });
  bits.forEach((b, i) => {
    const u = b.userData;
    b.position.set(u.x + Math.sin(t * 0.3 + i) * 0.2, u.y + Math.sin(t * u.s + i) * 0.25, u.z);
    b.rotation.set(t * u.s, t * 0.7 * u.s, 0);
  });
  camera.position.set(Math.sin(t * 0.22) * 0.7, 1.6, 15.5 + toCta * 1.0);
  camera.lookAt(0, 0.95, 0);
  renderer.render(scene, camera);
};
