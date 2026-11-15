import { THREE, C, scene, camera, renderer, floorAt, mats, rb, tex, glow, plane, cl, eio, back, lerp } from './common.js';

floorAt(-0.02, 0.3);
const card = new THREE.MeshStandardMaterial({ color: 0xb98b5a, roughness: 0.85 });
const cardIn = new THREE.MeshStandardMaterial({ color: 0x9c7046, roughness: 0.9 });
// shoebox (open) on the left
const box = new THREE.Group(); box.position.set(-0.55, 0, 0.1); box.rotation.y = 0.3; scene.add(box);
const bw = 2.0, bd = 1.3, bh = 0.85, th = 0.06;
const bottom = rb(bw, th, bd, 0.02, card); bottom.position.y = th / 2; box.add(bottom);
[[0, bh / 2, bd / 2, bw, bh, th], [0, bh / 2, -bd / 2, bw, bh, th], [bw / 2, bh / 2, 0, th, bh, bd], [-bw / 2, bh / 2, 0, th, bh, bd]].forEach(([x, y, z, w, h, d]) => {
  const m = rb(w, h, d, 0.02, card); m.position.set(x, y, z); box.add(m);
});
const lid = rb(bw + 0.08, 0.12, bd + 0.08, 0.03, card); box.add(lid);
const label = plane(0.9, 0.3, new THREE.MeshStandardMaterial({ map: tex(360, 120, (x, w, h) => { x.fillStyle = '#efe4c8'; x.fillRect(0, 0, w, h); x.fillStyle = '#5b4026'; x.font = '700 64px J'; x.textAlign = 'center'; x.fillText('RECEIPTS', w / 2, 84); }), roughness: 0.9 }));
label.position.set(0, bh * 0.55, bd / 2 + 0.035); box.add(label);

// receipts
const rTex = tex(200, 360, (x, w, h) => { x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.fillStyle = '#a7aeaa';
  for (let i = 0; i < 10; i++) x.fillRect(24, 30 + i * 26, i % 3 === 2 ? 90 : 150, 9); x.fillStyle = '#133621'; x.fillRect(24, 310, 90, 14); });
const rMat = new THREE.MeshStandardMaterial({ map: rTex, side: THREE.DoubleSide, roughness: 0.85 });
function receiptGeo() { const g = new THREE.PlaneGeometry(0.42, 0.75, 1, 8); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setZ(i, 0.08 * Math.sin(y * 5)); } g.computeVertexNormals(); return g; }
const N = 22, rs = [];
const rnd = (i, k) => { const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return s - Math.floor(s); };
for (let i = 0; i < N; i++) { const m = new THREE.Mesh(receiptGeo(), rMat); m.castShadow = true; scene.add(m); rs.push(m); }

// phone
const phone = new THREE.Group(); scene.add(phone);
phone.add(rb(1.15, 2.2, 0.12, 0.12, mats.ink));
const scv = document.createElement('canvas'); scv.width = 460; scv.height = 880;
const sctx = scv.getContext('2d'); const sTex = new THREE.CanvasTexture(scv); sTex.colorSpace = THREE.SRGBColorSpace;
const screen = plane(1.03, 2.0, new THREE.MeshStandardMaterial({ map: sTex, emissive: 0xffffff, emissiveMap: sTex, emissiveIntensity: 0.85, roughness: 0.25 }));
screen.position.z = 0.065; phone.add(screen);
const flash = plane(1.03, 2.0, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })); flash.position.z = 0.07; phone.add(flash);

// tidy folder for tax time
const folder = new THREE.Group(); scene.add(folder);
folder.add(rb(1.5, 0.22, 1.1, 0.05, mats.green));
const ft = plane(1.3, 0.5, new THREE.MeshStandardMaterial({ map: tex(520, 200, (x, w, h) => { x.fillStyle = '#1d4a30'; x.fillRect(0, 0, w, h); x.fillStyle = '#f4d96c'; x.font = '800 110px J'; x.textAlign = 'center'; x.fillText('Sorted ✓', w / 2, 140); }), roughness: 0.5 }));
ft.rotation.x = -Math.PI / 2; ft.position.y = 0.115; folder.add(ft);

function drawScreen(t) {
  const w = 460, h = 880, x = sctx;
  x.fillStyle = '#0f1f16'; x.fillRect(0, 0, w, h);
  const kRead = cl((t - C.read) / 0.4);
  if (C.keep && t >= C.keep) {
    x.fillStyle = '#f4d96c'; x.font = '800 54px J'; x.fillText('Saved', 40, 90);
    const k = back((t - C.keep) / 0.4);
    x.save(); x.translate(w / 2, 330); x.scale(k, k);
    x.fillStyle = 'rgba(242,243,239,0.12)'; x.beginPath(); x.arc(0, 0, 150, 0, 7); x.fill();
    x.fillStyle = '#f2f3ef'; x.font = '800 150px J'; x.textAlign = 'center'; x.fillText('6', 0, 40);
    x.font = '700 44px J'; x.fillText('years', 0, 100); x.restore();
    x.textAlign = 'left'; x.fillStyle = '#f2f3ef'; x.font = '600 40px J';
    x.fillText('Clear image', 60, 600); x.fillText('Full receipt', 60, 670); x.fillText('Easy to find', 60, 740);
    x.fillStyle = '#f4d96c'; [600, 670, 740].forEach(y => { x.beginPath(); x.arc(w - 80, y - 14, 18, 0, 7); x.fill(); });
  } else if (C.cat && t >= C.cat) {
    x.fillStyle = '#f4d96c'; x.font = '800 54px J'; x.fillText('Category', 40, 90);
    ['Supplies', 'Fuel', 'Meals', 'Rent'].forEach((c, i) => {
      const y = 170 + i * 150, on = i === 0 || (i === 1 && t > C.cat + 1.2);
      const k = cl((t - C.cat - i * 0.15) / 0.25);
      x.globalAlpha = k;
      x.fillStyle = on ? '#f4d96c' : 'rgba(242,243,239,0.12)'; x.beginPath(); x.roundRect(30, y, w - 60, 120, 60); x.fill();
      x.fillStyle = on ? '#133621' : '#f2f3ef'; x.font = '700 52px J'; x.fillText(c, 70, y + 78);
      if (on) { x.font = '800 52px J'; x.fillText('✓', w - 110, y + 80); }
      x.globalAlpha = 1;
    });
  } else if (kRead <= 0) {
    // viewfinder
    x.strokeStyle = '#f4d96c'; x.lineWidth = 10; const m = 70;
    [[m, m, 1, 1], [w - m, m, -1, 1], [m, h - 250, 1, -1], [w - m, h - 250, -1, -1]].forEach(([a, b, sx, sy]) => { x.beginPath(); x.moveTo(a, b + 60 * sy); x.lineTo(a, b); x.lineTo(a + 60 * sx, b); x.stroke(); });
    x.fillStyle = '#f2f3ef'; x.beginPath(); x.arc(w / 2, h - 110, 52, 0, 7); x.fill();
    x.fillStyle = '#0f1f16'; x.beginPath(); x.arc(w / 2, h - 110, 42, 0, 7); x.fill();
    x.fillStyle = '#f2f3ef'; x.beginPath(); x.arc(w / 2, h - 110, 36, 0, 7); x.fill();
  } else {
    x.fillStyle = '#f4d96c'; x.font = '800 54px J'; x.fillText('Receipt', 40, 90);
    ['Store', 'Date', 'Total', 'Tax'].forEach((f, i) => {
      const k = cl((t - C.read - 0.15 - i * 0.28) / 0.25);
      const y = 170 + i * 150;
      x.fillStyle = 'rgba(242,243,239,0.12)'; x.beginPath(); x.roundRect(30, y, w - 60, 120, 22); x.fill();
      x.fillStyle = '#f2f3ef'; x.font = '700 50px J'; x.fillText(f, 60, y + 76);
      if (k > 0) { x.fillStyle = '#f4d96c'; x.beginPath(); x.arc(w - 90, y + 60, 34 * back(k), 0, 7); x.fill();
        x.strokeStyle = '#133621'; x.lineWidth = 9; x.beginPath(); x.moveTo(w - 106, y + 60); x.lineTo(w - 94, y + 73); x.lineTo(w - 72, y + 47); if (k > 0.6) x.stroke(); }
    });
  }
  sTex.needsUpdate = true;
}

const SNAP = C.snap, READ = C.read, TAX = C.taxtime;
const phoneHome = new THREE.Vector3(1.3, 1.45, 1.0);
window.render3d = function (t) {
  // receipts: fountain out of the box before SNAP, then fly into the phone one by one
  const boxW = new THREE.Vector3(); box.getWorldPosition(boxW);
  rs.forEach((m, i) => {
    const ph = (t * 0.9 + rnd(i, 1)) % 1;            // fountain phase
    const ang = rnd(i, 2) * 6.28, sp = 0.4 + rnd(i, 3) * 0.7;
    const f = new THREE.Vector3(boxW.x + Math.cos(ang) * sp * ph, 0.6 + 4.2 * ph - 4.6 * ph * ph + 0.3, boxW.z + Math.sin(ang) * sp * ph * 0.6);
    const tFly = SNAP + 0.35 + i * 0.14;
    const k = eio(cl((t - tFly) / 0.55));
    const target = phone.position.clone();
    const p = f.clone().lerp(target, k); p.y += Math.sin(Math.PI * k) * 0.8;
    m.position.copy(p);
    m.rotation.set(rnd(i, 4) * 6 + t * (1 + rnd(i, 5)) * (1 - k), rnd(i, 6) * 6 + t * 0.7 * (1 - k), rnd(i, 7) * 3);
    m.scale.setScalar(1 - 0.9 * k);
    m.visible = k < 0.98;
  });
  // flash every time a receipt lands
  let fl = 0; for (let i = 0; i < N; i++) { const d = t - (SNAP + 0.35 + i * 0.14 + 0.55); if (d > 0 && d < 0.15) fl = Math.max(fl, 1 - d / 0.15); }
  if (t > SNAP && t < SNAP + 0.2) fl = Math.max(fl, 1 - (t - SNAP) / 0.2);
  flash.material.opacity = fl * 0.7;
  // phone flies in at SNAP, turns to camera for READ
  const pin = back((t - SNAP + 0.2) / 0.5);
  phone.position.set(lerp(4.2, phoneHome.x, pin), phoneHome.y + Math.sin(t * 1.8) * 0.05, phoneHome.z);
  const face = eio(cl((t - READ + 0.2) / 0.5));
  phone.position.x = lerp(phone.position.x, 0.75, face); phone.position.z = lerp(phoneHome.z, 2.4, face); phone.position.y += face * 0.15;
  phone.rotation.set(lerp(-0.1, 0, face), lerp(-0.45, -0.12, face), lerp(0.06, 0, face));
  phone.visible = t > SNAP - 0.3;
  drawScreen(t);
  // lid closes and folder slides in at tax time
  const kt = eio(cl((t - TAX) / 0.5));
  lid.position.set(0, lerp(2.3, bh + 0.06, kt), lerp(-0.2, 0, kt)); lid.rotation.x = lerp(-1.1, 0, kt); lid.visible = kt > 0.01;
  const kf = back((t - TAX - 0.25) / 0.5);
  folder.position.set(lerp(4.0, 0.35, kf), 0.12 + (1 - cl((t - TAX - 0.25) / 0.5)) * 0.6, 1.9); folder.rotation.y = -0.15;
  folder.visible = t > TAX;
  const tf = eio(cl((t - TAX) / 0.6));
  phone.position.x += tf * 0.2; phone.position.z -= tf * 1.6;
  const orbit = Math.sin(t * 0.4) * 0.8;
  camera.position.set(orbit * 0.7, 3.6, 12.5);
  camera.lookAt(0.1, 1.3, 0);
  renderer.render(scene, camera);
};
window.ready3d = true;
