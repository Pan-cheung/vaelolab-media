import { THREE, C, scene, camera, renderer, key, rim, amb, floorAt, mats, rb, cyl, sph, tex, glow, plane, cl, eio, back, lerp } from './common.js';

floorAt(-0.15, 0.3);
const room = new THREE.Group(); room.rotation.y = -0.6; scene.add(room);
const W = 4.4, D = 3.4, HW = 2.5;
const floor = rb(W, 0.25, D, 0.06, new THREE.MeshStandardMaterial({ color: 0xd9c3a0, roughness: 0.7 })); floor.position.y = -0.02; room.add(floor);
const back_ = rb(W, HW, 0.18, 0.04, mats.green); back_.position.set(0, HW / 2, -D / 2 + 0.09); room.add(back_);
const left = rb(0.18, HW, D, 0.04, mats.cream); left.position.set(-W / 2 + 0.09, HW / 2, 0); room.add(left);
const trim = rb(W, 0.1, 0.22, 0.03, mats.gold); trim.position.set(0, HW, -D / 2 + 0.09); room.add(trim);

// window with day/night sky
const skyCv = document.createElement('canvas'); skyCv.width = 300; skyCv.height = 220; const sk = skyCv.getContext('2d');
const skyT = new THREE.CanvasTexture(skyCv); skyT.colorSpace = THREE.SRGBColorSpace;
const win = plane(1.2, 0.9, new THREE.MeshStandardMaterial({ map: skyT, emissive: 0xffffff, emissiveMap: skyT, emissiveIntensity: 0.8 }));
win.position.set(1.15, 1.45, -D / 2 + 0.19); room.add(win);
const wf = rb(1.32, 1.02, 0.06, 0.03, mats.cream); wf.position.set(1.15, 1.45, -D / 2 + 0.16); room.add(wf);
function drawSky(night) {
  const g = sk.createLinearGradient(0, 0, 0, 220);
  g.addColorStop(0, night > 0.5 ? '#0d1b2e' : '#8fd0f0'); g.addColorStop(1, night > 0.5 ? '#1c3550' : '#d9f1ff');
  sk.fillStyle = g; sk.fillRect(0, 0, 300, 220);
  if (night > 0.5) { sk.fillStyle = '#f4d96c'; sk.beginPath(); sk.arc(210, 70, 34, 0, 7); sk.fill(); sk.fillStyle = '#0d1b2e'; sk.beginPath(); sk.arc(225, 60, 30, 0, 7); sk.fill();
    sk.fillStyle = '#fff'; [[50, 40], [90, 120], [140, 50], [260, 160], [30, 170]].forEach(([x, y]) => sk.fillRect(x, y, 4, 4)); }
  else { sk.fillStyle = '#ffffff'; sk.beginPath(); sk.arc(80, 80, 26, 0, 7); sk.arc(110, 72, 32, 0, 7); sk.arc(140, 84, 24, 0, 7); sk.fill(); }
  skyT.needsUpdate = true;
}
// menu board on the back wall
const menuT = tex(400, 300, (x, w, h) => { x.fillStyle = '#101a14'; x.fillRect(0, 0, w, h); x.fillStyle = '#f4d96c'; x.font = '800 60px J'; x.textAlign = 'center'; x.fillText('MENU', w / 2, 70);
  x.fillStyle = '#f2f3ef'; for (let i = 0; i < 4; i++) { x.fillRect(50, 110 + i * 44, 200 - (i % 2) * 60, 12); x.fillRect(300, 110 + i * 44, 50, 12); } });
const menuMat = new THREE.MeshStandardMaterial({ map: menuT, emissive: 0xffffff, emissiveMap: menuT, emissiveIntensity: 0.15 });
const menu = plane(1.2, 0.9, menuMat); menu.position.set(-0.75, 1.65, -D / 2 + 0.19); room.add(menu);
const mf = rb(1.3, 1.0, 0.05, 0.03, mats.gold); mf.position.set(-0.75, 1.65, -D / 2 + 0.16); room.add(mf);

// counter with espresso machine
const counter = rb(2.6, 0.95, 0.8, 0.06, mats.cream); counter.position.set(-0.6, 0.55, -0.75); room.add(counter);
const ctop = rb(2.7, 0.08, 0.9, 0.03, mats.wood); ctop.position.set(-0.6, 1.05, -0.75); room.add(ctop);
const esp = rb(0.6, 0.55, 0.45, 0.06, mats.ink); esp.position.set(-1.35, 1.36, -0.85); room.add(esp);
const espG = rb(0.5, 0.08, 0.38, 0.03, mats.gold); espG.position.set(-1.35, 1.67, -0.85); room.add(espG);
const cup = cyl(0.07, 0.06, 0.12, mats.paper); cup.position.set(-1.35, 1.16, -0.6); room.add(cup);
const reg = rb(0.4, 0.25, 0.3, 0.04, mats.ink); reg.position.set(0.25, 1.22, -0.8); room.add(reg);

// owner behind the counter
const owner = new THREE.Group(); owner.position.set(-0.4, 0.1, -1.25); room.add(owner);
const bodyO = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.75, 8, 24), mats.green); bodyO.position.y = 0.95; bodyO.castShadow = true; owner.add(bodyO);
const apron = rb(0.4, 0.45, 0.06, 0.03, mats.gold); apron.position.set(0, 0.9, 0.24); owner.add(apron);
const headO = sph(0.24, mats.skin); headO.position.y = 1.72; owner.add(headO);
const hair = new THREE.Mesh(new THREE.SphereGeometry(0.255, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), mats.ink); hair.position.y = 1.74; hair.rotation.x = -0.2; owner.add(hair);

// tables and chairs
const tables = [];
[[0.6, 0.65], [1.55, 0.2]].forEach(([x, z], i) => {
  const t = new THREE.Group(); t.position.set(x, 0.1, z + 0.4); room.add(t);
  const top = cyl(0.42, 0.42, 0.06, mats.cream); top.position.y = 0.72; t.add(top);
  const leg = cyl(0.05, 0.05, 0.7, mats.ink); leg.position.y = 0.37; t.add(leg);
  const ft = cyl(0.25, 0.25, 0.04, mats.ink); ft.position.y = 0.03; t.add(ft);
  [-0.6, 0.6].forEach(dx => { const ch = rb(0.34, 0.45, 0.34, 0.05, mats.wood); ch.position.set(dx, 0.25, 0); t.add(ch);
    const bk = rb(0.34, 0.45, 0.06, 0.03, mats.wood); bk.position.set(dx, 0.65, dx > 0 ? 0.0 : 0.0); bk.position.z = -0.14; t.add(bk); });
  const tag = plane(0.7, 0.32, new THREE.MeshBasicMaterial({ transparent: true, map: tex(350, 160, (x, w, h) => {
    x.fillStyle = '#f4d96c'; x.beginPath(); x.roundRect(6, 6, w - 12, h - 12, 40); x.fill(); x.fillStyle = '#133621'; x.font = '800 62px J'; x.textAlign = 'center'; x.fillText('Booked', w / 2, 102); }) }));
  scene.add(tag); tables.push({ t, tag });
});

// floating phone with chat bubbles (DMs)
const phone = new THREE.Group(); scene.add(phone);
phone.add(rb(0.75, 1.4, 0.08, 0.09, mats.ink));
const pT = tex(300, 560, (x, w, h) => { x.fillStyle = '#f2f3ef'; x.fillRect(0, 0, w, h); x.fillStyle = '#133621'; x.fillRect(0, 0, w, 70);
  x.fillStyle = '#f4d96c'; x.font = '700 30px J'; x.fillText('12:04 AM', 20, 46);
  x.fillStyle = '#d7dbd4'; x.beginPath(); x.roundRect(20, 110, 200, 70, 30); x.fill(); x.fillStyle = '#101a14'; x.font = '600 26px J'; x.fillText('Open tomorrow?', 34, 154);
  x.fillStyle = '#133621'; x.beginPath(); x.roundRect(70, 210, 210, 110, 30); x.fill(); x.fillStyle = '#f2f3ef'; x.fillText('Yes! 7am to 4pm.', 86, 254); x.fillText('See you there ☕', 86, 294);
  x.fillStyle = '#d7dbd4'; x.beginPath(); x.roundRect(20, 350, 170, 70, 30); x.fill(); x.fillStyle = '#101a14'; x.fillText('Perfect 🙌', 34, 394); });
const ps = plane(0.68, 1.3, new THREE.MeshStandardMaterial({ map: pT, emissive: 0xffffff, emissiveMap: pT, emissiveIntensity: 0.8 })); ps.position.z = 0.045; phone.add(ps);
// camera for menu photos + flash
const camObj = new THREE.Group(); scene.add(camObj);
camObj.add(rb(0.7, 0.45, 0.3, 0.06, mats.ink)); const lens = cyl(0.16, 0.16, 0.2, mats.gold); lens.rotation.x = Math.PI / 2; lens.position.z = 0.2; camObj.add(lens);
const flash = new THREE.PointLight(0xffffff, 0, 8); scene.add(flash);
// review stars
const stars = [];
const starShape = new THREE.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.09 : 0.2, a = i / 10 * Math.PI * 2 - Math.PI / 2; i ? starShape.lineTo(Math.cos(a) * r, -Math.sin(a) * r) : starShape.moveTo(Math.cos(a) * r, -Math.sin(a) * r); }
const starGeo = new THREE.ExtrudeGeometry(starShape, { depth: 0.06, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 });
for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(starGeo, mats.gold); s.castShadow = true; scene.add(s); stars.push(s); }
const reply = plane(1.5, 0.42, new THREE.MeshBasicMaterial({ transparent: true, map: tex(600, 170, (x, w, h) => {
  x.fillStyle = '#f2f3ef'; x.beginPath(); x.roundRect(6, 6, w - 12, h - 40, 50); x.fill(); x.beginPath(); x.moveTo(80, h - 34); x.lineTo(60, h - 4); x.lineTo(130, h - 34); x.fill();
  x.fillStyle = '#133621'; x.font = '700 54px J'; x.textAlign = 'center'; x.fillText('Thanks for coming!', w / 2, 88); }) }));
scene.add(reply);

const DM = C.dm, BOOK = C.book, PHOTO = C.photo, REV = C.review, NEXT = C.next, SUN = C.sunday;
const cal = plane(1.9, 1.25, new THREE.MeshBasicMaterial({ transparent: true, map: tex(760, 500, (x, w, h) => {
  x.fillStyle = '#f2f3ef'; x.beginPath(); x.roundRect(6, 6, w - 12, h - 12, 40); x.fill();
  x.fillStyle = '#133621'; x.font = '800 54px J'; x.fillText('This week', 40, 80);
  ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach((d, i) => {
    const cx = 70 + i * 103; x.fillStyle = '#133621'; x.font = '700 40px J'; x.textAlign = 'center'; x.fillText(d, cx, 160);
    x.fillStyle = i === 6 ? '#d7dbd4' : '#f4d96c'; x.beginPath(); x.roundRect(cx - 42, 190, 84, 84, 18); x.fill();
    x.fillStyle = '#133621'; if (i !== 6) { x.font = '800 44px J'; x.fillText('✓', cx, 248); }
    x.fillStyle = i % 2 ? '#d7dbd4' : '#f4d96c'; x.beginPath(); x.roundRect(cx - 42, 300, 84, 84, 18); x.fill();
    x.textAlign = 'left';
  });
  x.fillStyle = '#133621'; x.font = '600 38px J'; x.fillText('Posts queued', 40, 450);
}) }));
scene.add(cal);
const keyBase = key.intensity, ambBase = amb.intensity;
window.render3d = function (t) {
  // lights snap on in the first second (hook), night during the DM beat
  const on = back(t / 0.45);
  const night = cl((t - DM + 0.1) / 0.3) * (1 - cl((t - BOOK + 0.2) / 0.3));
  key.intensity = keyBase * (0.25 + 0.75 * on) * (1 - 0.65 * night); amb.intensity = ambBase * (1 - 0.5 * night);
  drawSky(night);
  owner.position.y = 0.1 + Math.abs(Math.sin(t * 3.2)) * 0.04; owner.rotation.y = Math.sin(t * 0.8) * 0.4;
  room.rotation.y = -0.6 + Math.sin(t * 0.3) * 0.18;
  room.updateMatrixWorld();
  // phone (DMs)
  const kp = back((t - DM) / 0.45) * (1 - eio(cl((t - BOOK + 0.15) / 0.3)));
  phone.position.set(1.15, 1.75 + Math.sin(t * 2) * 0.05, 2.0); phone.rotation.set(0, -0.25, 0.06); phone.scale.setScalar(Math.max(0.001, kp));
  // booked tags
  tables.forEach((o, i) => {
    const k = back((t - BOOK - 0.25 - i * 0.3) / 0.4) * (1 - cl((t - NEXT) / 0.3));
    const p = new THREE.Vector3(); o.t.getWorldPosition(p); o.tag.position.set(p.x, p.y + 1.1 + Math.sin(t * 2 + i) * 0.04, p.z);
    o.tag.quaternion.copy(camera.quaternion); o.tag.scale.setScalar(Math.max(0.001, k));
  });
  // camera + flash on the menu
  const kc = back((t - PHOTO) / 0.4) * (1 - eio(cl((t - REV + 0.15) / 0.3)));
  const mp = new THREE.Vector3(); menu.getWorldPosition(mp);
  camObj.position.set(mp.x + 0.6, mp.y + 0.1, mp.z + 2.4); camObj.lookAt(mp); camObj.scale.setScalar(Math.max(0.001, kc));
  let f = 0; [0.45, 0.85].forEach(d => { const x = t - PHOTO - d; if (x > 0 && x < 0.25) f = Math.max(f, 1 - x / 0.25); });
  flash.position.copy(camObj.position); flash.intensity = f * 40; menuMat.emissiveIntensity = 0.15 + f * 0.8;
  // stars + reply
  stars.forEach((s, i) => { const k = back((t - REV - 0.15 - i * 0.1) / 0.35) * (1 - cl((t - NEXT) / 0.3));
    s.position.set(-0.95 + i * 0.48, 2.15 + Math.sin(t * 3 + i) * 0.05, 1.9); s.rotation.set(0, Math.sin(t * 2 + i) * 0.4, 0); s.scale.setScalar(Math.max(0.001, k * (1 - cl((t - SUN + 0.1) / 0.3)))); });
  const kr = back((t - REV - 0.75) / 0.4) * (1 - cl((t - SUN + 0.1) / 0.3));
  reply.position.set(0.1, 1.5, 2.3); reply.quaternion.copy(camera.quaternion); reply.scale.setScalar(Math.max(0.001, kr));
  const kcal = back((t - SUN) / 0.45) * (1 - cl((t - NEXT) / 0.3));
  cal.position.set(0.2, 1.75, 2.4); cal.quaternion.copy(camera.quaternion); cal.scale.setScalar(Math.max(0.001, kcal));
  // camera
  const push = eio(cl(t / 1.2));
  camera.position.set(Math.sin(t * 0.25) * 0.8, 4.6, 19 - 1.3 * push);
  camera.lookAt(0, 1.55, 0);
  renderer.render(scene, camera);
};
window.ready3d = true;
