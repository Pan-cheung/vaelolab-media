import { THREE, C, scene, camera, renderer, floorAt, mats, rb, cyl, tex, glow, plane, cl, eio, back, lerp } from './common.js';

floorAt(-0.25, 0.3);
const cities = [['Calgary', 'AB', 5], ['Toronto', 'ON', 13], ['Halifax', 'NS', 14], ['Moncton', 'NB', 15]];
const times = C.cities; // spoken times of each city
const xs = [-1.62, -0.54, 0.54, 1.62];
const coinGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.1, 48);
const stacks = [];

cities.forEach(([name, prov, n], i) => {
  const g = new THREE.Group(); g.position.set(xs[i], 0, i === 0 || i === 3 ? -0.15 : 0.1);
  const ped = rb(0.98, 0.5, 0.98, 0.1, mats.cream); g.add(ped);
  const lab = plane(0.92, 0.33, new THREE.MeshStandardMaterial({ map: tex(512, 176, (x, w, h) => {
    x.fillStyle = '#133621'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#f2f3ef'; x.font = '700 76px J'; x.textAlign = 'center'; x.fillText(name, w / 2, 92);
    x.fillStyle = '#f4d96c'; x.font = '600 44px J'; x.fillText(prov, w / 2, 152);
  }), roughness: 0.6 }));
  lab.position.set(0, 0, 0.5); g.add(lab);
  const coins = [];
  for (let k = 0; k < n; k++) { const c = new THREE.Mesh(coinGeo, mats.gold); c.castShadow = c.receiveShadow = true; g.add(c); coins.push(c); }
  // price tag floating above the stack
  const tag = plane(0.8, 0.42, new THREE.MeshBasicMaterial({ transparent: true, map: tex(380, 200, (x, w, h) => {
    x.fillStyle = '#f2f3ef'; x.beginPath(); x.roundRect(10, 10, w - 20, h - 20, 90); x.fill();
    x.fillStyle = '#133621'; x.font = '800 120px J'; x.textAlign = 'center'; x.fillText('$' + n, w / 2, 145);
  }) }));
  g.add(tag);
  scene.add(g); stacks.push({ g, coins, tag, n, t: times[i] });
});

// parcel with the $100 label
const parcel = new THREE.Group();
parcel.add(rb(0.9, 0.62, 0.7, 0.06, mats.card)); parcel.scale.setScalar(0.85);
const tape = rb(1.02, 0.12, 0.82, 0.03, M2(0xe6d3a8)); tape.position.y = 0.2; parcel.add(tape);
function M2(c) { return new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 }); }
const pl = plane(0.8, 0.42, new THREE.MeshStandardMaterial({ map: tex(400, 210, (x, w, h) => {
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h); x.fillStyle = '#133621'; x.font = '800 130px J'; x.textAlign = 'center'; x.fillText('$100', w / 2, 150);
}), roughness: 0.8 }));
pl.position.set(0, -0.05, 0.405); parcel.add(pl);
parcel.traverse(o => { if (o.isMesh) o.castShadow = true; });
scene.add(parcel);

const TS = C.ship, RULE = C.rule, DIFF = C.diff, CHECK = C.checkout, CTA_T = C.cta;
const diffTag = plane(1.7, 0.6, new THREE.MeshBasicMaterial({ transparent: true, map: tex(560, 200, (x, w, h) => {
  x.fillStyle = '#f4d96c'; x.beginPath(); x.roundRect(8, 8, w - 16, h - 16, 90); x.fill();
  x.fillStyle = '#133621'; x.font = '800 104px J'; x.textAlign = 'center'; x.fillText('+$10', w / 2, 136);
}) }));
scene.add(diffTag);
const shipLabel = plane(0.8, 0.42, new THREE.MeshStandardMaterial({ map: tex(400, 210, (x, w, h) => {
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h); x.fillStyle = '#133621'; x.font = '700 46px J'; x.textAlign = 'center';
  x.fillText('Tax by', w / 2, 70); x.font = '800 54px J'; x.fillText('ship to ✓', w / 2, 150);
}), roughness: 0.8 }));
shipLabel.position.set(0, -0.05, 0.41); parcel.add(shipLabel); shipLabel.visible = false;
const bracket = rb(xs[3] - xs[0], 0.06, 0.06, 0.02, mats.gold); scene.add(bracket);
window.render3d = function (t) {
  stacks.forEach((s, i) => {
    // 0..TS: hook preview (full); collapse at TS; regrow when the city is spoken
    let k;
    if (t < TS - 0.35) k = 1;
    else if (t < s.t) k = 1 - cl((t - (TS - 0.35)) / 0.35);
    else k = cl((t - s.t) / 0.75);
    const shown = k * s.n;
    s.coins.forEach((c, j) => {
      const a = cl(shown - j);           // 0..1 for this coin
      const drop = t < TS - 0.35 ? 0 : (1 - back(a)) * 1.2;
      c.visible = a > 0.01;
      c.position.set(Math.sin(j * 2.3) * 0.03, 0.3 + j * 0.105 + drop, Math.cos(j * 1.7) * 0.03);
      c.rotation.y = j * 0.5;
    });
    const top = 0.3 + s.n * 0.105 * k;
    const tk = t < TS - 0.35 ? 1 : (t < s.t ? 1 - cl((t - (TS - 0.35)) / 0.25) : back((t - s.t - 0.35) / 0.4));
    s.tag.position.set(0, top + 0.45, 0.1);
    s.tag.scale.setScalar(Math.max(0.001, tk));
    s.tag.quaternion.copy(camera.quaternion);
  });
  // parcel: hovers centre-top during the hook, then hops to each city as it is spoken, then rests
  const hover = new THREE.Vector3(0, 2.55, 1.3);
  let pos = hover.clone(), sc = 1;
  for (let i = 0; i < stacks.length; i++) {
    const t0 = stacks[i].t - 0.45, t1 = stacks[i].t + 0.1;
    if (t >= t0) {
      const k = eio(cl((t - t0) / (t1 - t0)));
      const target = new THREE.Vector3(xs[i], 2.75, 0.2);
      const from = i === 0 ? hover : new THREE.Vector3(xs[i - 1], 2.75, 0.2);
      pos = from.clone().lerp(target, k); pos.y += Math.sin(Math.PI * k) * 0.7;
    }
  }
  if (t >= RULE) { const k = eio(cl((t - RULE) / 0.6)); pos.lerp(hover, k); }
  const atCheck = t >= CHECK - 0.3;
  if (atCheck) pos = new THREE.Vector3(0, 0.95, 2.7);
  pl.visible = !atCheck; shipLabel.visible = atCheck;
  parcel.position.copy(pos);
  parcel.position.y += Math.sin(t * 2.2) * 0.06;
  parcel.rotation.set(0.15, -0.4 + Math.sin(t * 0.9) * 0.25, 0.05 * Math.sin(t * 1.7));
  let pk = back((t - TS + 0.25) / 0.4) * (1 - eio(cl((t - RULE) / 0.4)));
  if (atCheck) pk = back((t - CHECK + 0.3) / 0.45) * (1 - eio(cl((t - CTA_T + 0.2) / 0.4)));
  parcel.scale.setScalar(Math.max(0.001, 0.85 * pk));
  if (atCheck) parcel.rotation.set(0.1, -0.15 + Math.sin(t * 0.9) * 0.15, 0);
  // +$10 difference between the cheapest and dearest stack
  const kd = back((t - DIFF) / 0.45) * (1 - eio(cl((t - RULE + 0.1) / 0.4)));
  diffTag.position.set(0, 2.75, 0.3); diffTag.quaternion.copy(camera.quaternion); diffTag.scale.setScalar(Math.max(0.001, kd));
  bracket.position.set(0, 2.4, 0.1); bracket.scale.set(Math.max(0.001, eio(cl((t - DIFF) / 0.5)) * (1 - eio(cl((t - RULE + 0.1) / 0.4)))), 1, 1);
  // camera: slight orbit, small push after the rule
  const orbit = Math.sin(t * 0.35) * 0.9;
  const push = eio(cl((t - RULE) / 1.5));
  camera.position.set(orbit * 0.6, 3.6, 15 - 0.8 * push);
  camera.lookAt(0, 1.45, 0);
  renderer.render(scene, camera);
};
window.ready3d = true;
