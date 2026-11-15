import { THREE, C, scene, camera, renderer, floorAt, mats, rb, cyl, sph, tex, plane, cl, eio, back, lerp, amp } from './common.js';

floorAt(-1.6, 0.28);
// studio microphone
const mic = new THREE.Group(); scene.add(mic);
const grilleMat = new THREE.MeshStandardMaterial({ color: 0xd9dcd6, roughness: 0.35, metalness: 0.85, wireframe: false });
const head = new THREE.Mesh(new THREE.CapsuleGeometry(0.62, 0.9, 12, 40), grilleMat); head.position.y = 1.55; head.castShadow = true; mic.add(head);
// grille rings
for (let i = 0; i < 9; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.625, 0.018, 8, 60), mats.ink); r.rotation.x = Math.PI / 2; r.position.y = 1.15 + i * 0.1; mic.add(r); }
const band = cyl(0.66, 0.66, 0.22, mats.gold); band.position.y = 0.95; mic.add(band);
const body = cyl(0.5, 0.42, 1.1, mats.ink); body.position.y = 0.3; mic.add(body);
const yoke = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.07, 12, 60, Math.PI), mats.ink); yoke.rotation.z = Math.PI; yoke.position.y = 0.55; yoke.castShadow = true; mic.add(yoke);
const pole = cyl(0.08, 0.08, 1.6, mats.ink); pole.position.y = -0.6; mic.add(pole);
const base = cyl(0.9, 1.0, 0.16, mats.ink); base.position.y = -1.45; mic.add(base);
const ring = cyl(0.92, 0.92, 0.04, mats.gold); ring.position.y = -1.36; mic.add(ring);

// ring of sound bars around the mic, driven by the voiceover loudness
const bars = [], NB = 44;
for (let i = 0; i < NB; i++) {
  const b = rb(0.13, 1, 0.13, 0.05, i % 2 ? mats.gold : mats.cream);
  const a = i / NB * Math.PI * 2; b.userData.a = a; scene.add(b); bars.push(b);
}
// language bubbles orbiting
const langs = ['Hello', 'Bonjour', 'Hola', 'Ciao', 'Hallo', 'Olá', 'Привет', 'こんにちは', '안녕하세요', '你好', 'Merhaba', 'Hej'];
const bubbles = langs.map((w, i) => {
  const m = plane(1.05, 0.42, new THREE.MeshBasicMaterial({ transparent: true, map: tex(500, 200, (x, W, H) => {
    x.fillStyle = i % 3 === 0 ? '#f4d96c' : '#f2f3ef'; x.beginPath(); x.roundRect(8, 8, W - 16, H - 40, 60); x.fill();
    x.beginPath(); x.moveTo(90, H - 34); x.lineTo(70, H - 4); x.lineTo(140, H - 34); x.fill();
    x.fillStyle = '#133621'; x.font = '700 72px J, sans-serif'; x.textAlign = 'center'; x.fillText(w, W / 2, 112);
  }) }));
  scene.add(m); return m;
});
// browser window card (runs in your browser)
const win = new THREE.Group(); scene.add(win);
win.add(rb(2.6, 1.7, 0.08, 0.08, mats.cream));
const wtex = tex(780, 510, (x, w, h) => {
  x.fillStyle = '#f2f3ef'; x.fillRect(0, 0, w, h); x.fillStyle = '#d6d9d2'; x.fillRect(0, 0, w, 70);
  ['#e46b5d', '#f4d96c', '#5fbf73'].forEach((c, i) => { x.fillStyle = c; x.beginPath(); x.arc(40 + i * 40, 35, 13, 0, 7); x.fill(); });
  x.fillStyle = '#fff'; x.beginPath(); x.roundRect(170, 16, 560, 38, 19); x.fill();
  x.fillStyle = '#133621'; x.font = '800 58px J'; x.textAlign = 'center'; x.fillText('Runs in your browser', w / 2, 210);
  for (let i = 0; i < 26; i++) { const hh = 30 + 110 * Math.abs(Math.sin(i * 1.7)); x.fillStyle = i % 2 ? '#133621' : '#f4d96c'; x.fillRect(110 + i * 22, 380 - hh / 2, 14, hh); }
});
const wp = plane(2.5, 1.6, new THREE.MeshStandardMaterial({ map: wtex, roughness: 0.5 })); wp.position.z = 0.045; win.add(wp);

const BROWSER = C.browser, LANG = C.langs, CLIP = C.clip, LIC = C.license, DEV = C.devices, WEB = C.web;
// laptop and phone for "runs on a laptop or a phone"
const laptop = new THREE.Group(); scene.add(laptop);
const lbase = rb(1.9, 0.08, 1.25, 0.04, mats.cream); laptop.add(lbase);
const lscr = new THREE.Group(); lscr.position.set(0, 0.04, -0.6); laptop.add(lscr);
const lpanel = rb(1.9, 1.2, 0.06, 0.04, mats.ink); lpanel.position.y = 0.6; lscr.add(lpanel);
const lwave = plane(1.7, 1.0, new THREE.MeshStandardMaterial({ map: tex(680, 400, (x, w, h) => { x.fillStyle = '#133621'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 30; i++) { const hh = 30 + 220 * Math.abs(Math.sin(i * 1.3)); x.fillStyle = i % 2 ? '#f4d96c' : '#f2f3ef'; x.fillRect(40 + i * 20, 200 - hh / 2, 12, hh); } }), emissive: 0xffffff, emissiveIntensity: 0.5, roughness: 0.4 }));
lwave.material.emissiveMap = lwave.material.map; lwave.position.set(0, 0.6, 0.035); lscr.add(lwave);
lscr.rotation.x = -0.25;
const phoneD = new THREE.Group(); scene.add(phoneD);
phoneD.add(rb(0.55, 1.05, 0.06, 0.07, mats.ink));
const pw = plane(0.49, 0.97, new THREE.MeshStandardMaterial({ map: tex(240, 470, (x, w, h) => { x.fillStyle = '#133621'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 9; i++) { const hh = 30 + 150 * Math.abs(Math.sin(i * 1.9)); x.fillStyle = '#f4d96c'; x.fillRect(25 + i * 22, 235 - hh / 2, 12, hh); } }), emissive: 0xffffff, emissiveIntensity: 0.5 }));
pw.material.emissiveMap = pw.material.map; pw.position.z = 0.035; phoneD.add(pw);
window.render3d = function (t) {
  const a = amp(t);
  mic.rotation.y = -0.5 + Math.sin(t * 0.6) * 0.5;
  mic.position.y = Math.sin(t * 1.4) * 0.05;
  const intro = back(t / 0.5);
  bars.forEach((b, i) => {
    const ang = b.userData.a + t * 0.35;
    const rr = 1.9;
    const hgt = 0.15 + intro * (0.25 + a * 1.4 * (0.55 + 0.45 * Math.sin(i * 1.9 + t * 9)));
    b.scale.y = hgt; b.position.set(Math.cos(ang) * rr, 1.35, Math.sin(ang) * rr * 0.75);
  });
  // language bubbles burst out when "languages" is spoken
  bubbles.forEach((m, i) => {
    const k = back((t - LANG - i * 0.05) / 0.45);
    const out = cl((t - CLIP + 0.1) / 0.4);
    const ang = i / bubbles.length * Math.PI * 2 + t * 0.4;
    m.position.set(Math.cos(ang) * 1.75 * k, 1.6 + Math.sin(ang * 3 + i) * 1.25 * k, Math.sin(ang) * 1.6 * k);
    m.scale.setScalar(Math.max(0.001, k * (1 - out)));
    m.quaternion.copy(camera.quaternion);
    m.visible = t > LANG && out < 1;
  });
  // browser window slides in at the start (hook) and again for the license line
  const kb = t < BROWSER + 2.2 ? back(t / 0.6) * (1 - cl((t - BROWSER - 1.8) / 0.4)) : 0;
  win.position.set(1.15, 3.25, 1.2); win.rotation.set(-0.05, -0.25, 0);
  const kdv = back((t - DEV) / 0.45) * (1 - eio(cl((t - LIC + 0.2) / 0.4)));
  laptop.position.set(-1.6, 0.35, 1.5); laptop.rotation.set(0.15, 0.45, 0); laptop.scale.setScalar(Math.max(0.001, kdv * 0.75));
  phoneD.position.set(1.65, 1.0, 1.5); phoneD.rotation.set(0, -0.4, 0.08); phoneD.scale.setScalar(Math.max(0.001, kdv));
  const kw = back((t - WEB) / 0.45) * (1 - eio(cl((t - LIC + 0.2) / 0.4)));
  win.visible = kw > 0.01; win.position.set(0.0, 0.6, 2.6); win.rotation.set(-0.05, 0, 0); win.scale.setScalar(Math.max(0.001, kw * 0.6));
  // camera
  const push = eio(cl((t - CLIP) / 1.0));
  camera.position.set(Math.sin(t * 0.3) * 1.2, 3.4, 15.5 - push * 1.5);
  camera.lookAt(0, 1.4, 0);
  renderer.render(scene, camera);
};
window.ready3d = true;
