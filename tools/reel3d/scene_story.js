// Story scene: one 3D scene per voiceover sentence, built from reusable scene types and real photos.
// window.CFG.scene.scenes = [{ at: <seconds>, type: '<type>', ...params }]; a scene lives until the next one starts.
// Types: hero, product, bubble, languages, map, calendar, battery, pricecards, warning, globe, shop, send, bignumber
import { THREE, C, scene, camera, renderer, floorAt, mats, rb, cyl, sph, tex, plane, cl, eio, back, lerp, amp } from './common.js';

floorAt(-1.25, 0.25);
const LIST = C.scenes;
let pending = 0;
const loader = new THREE.TextureLoader();
function photo(path, w, h) {
  const mat = new THREE.MeshBasicMaterial({ color: 0x1d4a30, toneMapped: false });
  pending++;
  loader.load('file://' + path, t => {
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    const a = t.image.width / t.image.height, s = w / h;
    if (a > s) { t.repeat.set(s / a, 1); t.offset.set((1 - s / a) / 2, 0); } else { t.repeat.set(1, a / s); t.offset.set(0, (1 - a / s) / 2); }
    mat.map = t; mat.color.set(0xffffff); mat.needsUpdate = true; if (--pending === 0) window.ready3d = true;
  }, undefined, () => { if (--pending === 0) window.ready3d = true; });
  return mat;
}
function card(path, w, h, frame = mats.cream) {
  const g = new THREE.Group();
  g.add(rb(w + 0.12, h + 0.12, 0.08, 0.06, frame));
  const p = plane(w, h, photo(path, w, h)); p.position.z = 0.045; g.add(p);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
function label(text, opt = {}) {
  const { w = 1.2, h = 0.42, bg = '#f4d96c', fg = '#133621', size = 120, r = 70 } = opt;
  const m = plane(w, h, new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, map: tex(Math.round(w * 300), Math.round(h * 300), (x, W, H) => {
    if (bg) { x.fillStyle = bg; x.beginPath(); x.roundRect(4, 4, W - 8, H - 8, r); x.fill(); }
    x.fillStyle = fg; let fs = size; x.font = '800 ' + fs + 'px J'; while (fs > 20 && x.measureText(text).width > W * 0.86) { fs -= 4; x.font = '800 ' + fs + 'px J'; } x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, W / 2, H / 2 + 6);
  }) }));
  return m;
}
const face = m => m.quaternion.copy(camera.quaternion);

// ---------- scene types: each returns { g, update(t, local, kin) } ----------
const T = {};
T.hero = p => {   // portrait photo flips in, price tag swings below
  const g = new THREE.Group();
  const c = card(p.img, 1.55, 1.95); c.position.set(-0.55, 0.55, 0); g.add(c);
  const tag = new THREE.Group(); tag.position.set(0.72, 1.1, 0.4); g.add(tag);
  const str = cyl(0.01, 0.01, 0.5, mats.ink); str.position.y = -0.25; tag.add(str);
  const t1 = label(p.tag || '', { w: 1.25, h: 0.6, size: 150 }); t1.position.y = -0.8; tag.add(t1);
  return { g, update(t, L) { c.rotation.set(0, lerp(-0.5, 0.18, back((L + 0.15) / 0.6)) + Math.sin(t * 0.8) * 0.05, 0); tag.rotation.z = Math.sin(t * 2.4) * 0.18 * Math.exp(-L * 0.4) + Math.sin(t * 1.3) * 0.04; tag.scale.setScalar(Math.max(0.001, back((L + 0.2) / 0.4))); } };
};
T.product = p => {   // product photo standing on a turntable with a sweeping gold ring
  const g = new THREE.Group();
  const plate = cyl(1.5, 1.6, 0.16, mats.ink); plate.position.y = -0.9; g.add(plate);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.03, 8, 80), mats.gold); rim.rotation.x = Math.PI / 2; rim.position.y = -0.8; g.add(rim);
  const c = card(p.img, 2.6, 1.46); c.position.y = 0.05; g.add(c);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.025, 8, 80), mats.gold); g.add(ring);
  return { g, update(t, L) { c.rotation.y = Math.sin(t * 0.9) * 0.35; plate.rotation.y = t * 0.5; const k = (L * 0.6) % 1; ring.scale.setScalar(0.6 + k * 1.4); ring.position.y = -0.8 + k * 0.05; ring.rotation.x = Math.PI / 2; ring.material.opacity = 1; } };
};
T.bubble = p => {   // speech bubble with the wake word, sound rings, product photo behind
  const g = new THREE.Group();
  const c = card(p.img, 2.0, 1.12); c.position.set(-0.55, -0.15, -0.4); c.rotation.y = 0.25; g.add(c);
  const b = new THREE.Group(); b.position.set(0.55, 0.95, 0.6); g.add(b);
  b.add(rb(1.9, 0.75, 0.22, 0.2, mats.cream));
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.35, 16), mats.cream); tail.position.set(-0.55, -0.45, 0); tail.rotation.z = 0.5; b.add(tail);
  const tx = label(p.text || '', { w: 1.75, h: 0.6, bg: null, size: 110 }); tx.position.z = 0.12; b.add(tx);
  const rings = [0, 1, 2].map(i => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.02, 8, 60), mats.gold); r.position.set(-0.55, -0.15, 0.3); g.add(r); return r; });
  return { g, update(t, L) { b.scale.setScalar(back((L - 0.15) / 0.4)); b.rotation.z = Math.sin(t * 2) * 0.04; rings.forEach((r, i) => { const k = ((L + i * 0.4) % 1.2) / 1.2; r.scale.setScalar(0.5 + k * 3); r.visible = L > 0.3; }); c.rotation.y = 0.25 + Math.sin(t) * 0.05; } };
};
T.languages = p => {   // two bubbles swapping greetings around a dotted globe, big count label
  const g = new THREE.Group();
  const words = p.words || ['Hello', 'Bonjour', 'Hola', 'Ciao', 'Hallo', 'Olá', 'Merhaba', 'Hej'];
  const dots = new THREE.Points(new THREE.SphereGeometry(0.85, 36, 24), new THREE.PointsMaterial({ color: 0xf4d96c, size: 0.035 }));
  dots.position.set(0, 0.35, 0); g.add(dots);
  const core = sph(0.8, mats.deep); core.position.copy(dots.position); g.add(core);
  const mk = (x, y) => { const s = new THREE.Group(); s.position.set(x, y, 0.8); g.add(s); s.add(rb(1.35, 0.55, 0.16, 0.18, mats.cream)); const ls = words.map(w => { const l = label(w, { w: 1.25, h: 0.5, bg: null, size: 95 }); l.position.z = 0.09; s.add(l); return l; }); return { s, ls }; };
  const A = mk(-0.7, 1.2), B = mk(0.7, -0.3);
  const n = label(p.big || '', { w: 1.1, h: 0.5, size: 140 }); n.position.set(-0.75, -0.45, 1.0); g.add(n);
  return { g, update(t, L) { dots.rotation.y = t * 0.6; const i = Math.floor(L / 0.55); A.ls.forEach((l, j) => l.visible = j === i % words.length); B.ls.forEach((l, j) => l.visible = j === (i + 3) % words.length); A.s.scale.setScalar(back((L - 0.1) / 0.35)); B.s.scale.setScalar(back((L - 0.3) / 0.35)); n.scale.setScalar(back((L - 0.5) / 0.4)); A.s.position.y = 1.2 + Math.sin(t * 2) * 0.05; B.s.position.y = -0.2 + Math.sin(t * 2 + 1) * 0.05; } };
};
T.map = p => {   // tilted street map, route draws itself, pin drops
  const g = new THREE.Group();
  const m = plane(3.2, 2.3, new THREE.MeshStandardMaterial({ roughness: 0.8, map: tex(640, 460, (x, W, H) => {
    x.fillStyle = '#1d4a30'; x.fillRect(0, 0, W, H); x.fillStyle = '#2f6a46';
    for (let i = 0; i < 9; i++) for (let j = 0; j < 6; j++) x.fillRect(12 + i * 70, 12 + j * 74, 58, 62);
    x.fillStyle = '#7fb069'; x.beginPath(); x.ellipse(470, 120, 80, 50, 0.3, 0, 7); x.fill();
  }) }));
  m.rotation.x = -1.05; m.position.y = -0.35; m.receiveShadow = true; g.add(m);
  const path = [[-1.3, 0.9], [-0.6, 0.9], [-0.6, 0.15], [0.45, 0.15], [0.45, -0.6], [1.2, -0.6]];
  const dots = [];
  for (let s = 0; s < path.length - 1; s++) for (let k = 0; k < 8; k++) {
    const a = path[s], b = path[s + 1], u = k / 8; const d = rb(0.16, 0.08, 0.16, 0.03, mats.gold);
    d.position.set(lerp(a[0], b[0], u), -0.35 + 0.05, 0); d.userData = { x: lerp(a[0], b[0], u), z: lerp(a[1], b[1], u) }; g.add(d); dots.push(d);
  }
  const pin = new THREE.Group(); g.add(pin);
  const head = sph(0.3, mats.gold); head.position.y = 0.65; pin.add(head);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.6, 24), mats.gold); cone.rotation.x = Math.PI; cone.position.y = 0.3; pin.add(cone);
  const toLocal = (x, z) => { const v = new THREE.Vector3(x, 0, z); v.applyAxisAngle(new THREE.Vector3(1, 0, 0), -1.05 + Math.PI / 2); return v; };
  return { g, update(t, L) {
    dots.forEach((d, i) => { const mp = m.localToWorld(new THREE.Vector3(d.userData.x, d.userData.z, 0.04)); g.worldToLocal(mp); d.position.copy(mp); d.visible = L > 0.2 + i * 0.03; });
    const end = m.localToWorld(new THREE.Vector3(1.2, -0.6, 0)); g.worldToLocal(end);
    const k = back((L - 0.2 - dots.length * 0.03) / 0.4); pin.position.set(end.x, end.y + (1 - cl(k)) * 1.2, end.z); pin.visible = k > 0; pin.rotation.y = t * 2;
  } };
};
T.calendar = p => {   // a poster card flies into a calendar block, the day lights up
  const g = new THREE.Group();
  const cal = new THREE.Group(); cal.position.set(0.55, 0.25, 0); g.add(cal);
  cal.add(rb(1.8, 1.9, 0.2, 0.12, mats.cream));
  const top = rb(1.82, 0.42, 0.24, 0.1, mats.green); top.position.y = 0.76; cal.add(top);
  const mon = label(p.month || 'EVENT', { w: 1.4, h: 0.36, bg: null, fg: '#f4d96c', size: 95 }); mon.position.set(0, 0.76, 0.14); cal.add(mon);
  const day = label(p.day || '✓', { w: 1.4, h: 1.0, bg: null, size: 300 }); day.position.set(0, -0.15, 0.12); cal.add(day);
  const glow = rb(1.5, 1.2, 0.04, 0.1, mats.gold); glow.position.set(0, -0.15, 0.08); cal.add(glow);
  const poster = p.img ? card(p.img, 1.0, 1.35) : rb(1.0, 1.35, 0.05, 0.04, mats.gold); g.add(poster);
  return { g, update(t, L) { const k = eio(cl((L - 0.3) / 0.9)); poster.position.set(lerp(-1.1, 0.55, k), lerp(0.35, 0.3, k) + Math.sin(Math.PI * k) * 0.5, lerp(0.6, 0.15, k)); poster.rotation.set(0, lerp(0.4, 0, k), lerp(-0.2, 0, k)); poster.scale.setScalar(lerp(1, 0.2, k)); poster.visible = k < 0.98; glow.visible = k > 0.95; glow.scale.setScalar(k > 0.95 ? back((L - 1.2) / 0.3) : 0.001); cal.rotation.y = -0.25 + Math.sin(t * 0.8) * 0.06; } };
};
T.battery = p => {   // glass battery filling up, labelled, small charges popping from a case
  const g = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 2.0, 40, 1, true), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, roughness: 0.1, side: THREE.DoubleSide }));
  shell.position.set(-0.5, 0.3, 0); g.add(shell);
  const capT = cyl(0.25, 0.25, 0.14, mats.cream); capT.position.set(-0.5, 1.37, 0); g.add(capT);
  const base = cyl(0.57, 0.57, 0.08, mats.cream); base.position.set(-0.5, -0.72, 0); g.add(base);
  const fill = cyl(0.5, 0.5, 1, mats.gold); g.add(fill);
  const lb = label(p.big || '', { w: 1.1, h: 0.55, size: 150 }); lb.position.set(-0.5, 0.3, 0.7); g.add(lb);
  const box = rb(1.0, 0.6, 0.7, 0.12, mats.ink); box.position.set(1.0, -0.45, 0.2); g.add(box);
  const n = p.count || 7; const pips = [];
  for (let i = 0; i < n; i++) { const d = sph(0.09, mats.gold); g.add(d); pips.push(d); }
  const lc = label(p.small || '', { w: 1.1, h: 0.42, bg: '#f2f3ef', size: 95 }); lc.position.set(1.0, 0.25, 0.7); g.add(lc);
  return { g, update(t, L) { const k = eio(cl((L - 0.2) / 1.2)); const h = Math.max(0.01, 1.9 * k); fill.scale.y = h; fill.position.set(-0.5, -0.68 + h / 2, 0); lb.scale.setScalar(back((L - 0.9) / 0.4));
    pips.forEach((d, i) => { const kk = back((L - 1.0 - i * 0.18) / 0.3); const a = i / n * Math.PI * 1.2 + 0.4; d.position.set(1.0 + Math.cos(a) * 0.75, 0.0 + Math.sin(a) * 0.55 + 0.25, 0.3); d.scale.setScalar(Math.max(0.001, kk)); });
    lc.scale.setScalar(back((L - 1.0 - n * 0.18) / 0.35)); box.rotation.y = Math.sin(t) * 0.15; } };
};
T.pricecards = p => {   // two photo cards with swinging price tags and a date badge
  const g = new THREE.Group();
  const items = (p.items || []).map((it, i) => {
    const s = new THREE.Group(); s.position.set(i ? 0.82 : -0.82, 0.45, 0); g.add(s);
    const c = card(it.img, 1.35, 1.7); s.add(c);
    const tg = label(it.tag, { w: 1.15, h: 0.5, size: 130 }); tg.position.set(0, -1.05, 0.25); s.add(tg);
    return { s, c, tg, i };
  });
  const badge = label(p.badge || '', { w: 1.6, h: 0.5, bg: '#f2f3ef', size: 110 }); badge.position.set(0, 1.55, 0.6); g.add(badge);
  return { g, update(t, L) { items.forEach(o => { o.s.rotation.y = (o.i ? -0.18 : 0.18) + Math.sin(t * 0.9 + o.i) * 0.05; o.s.scale.setScalar(back((L - o.i * 0.25) / 0.45)); o.tg.rotation.z = Math.sin(t * 2.2 + o.i) * 0.08; o.tg.scale.setScalar(back((L - 0.4 - o.i * 0.6) / 0.35)); }); badge.scale.setScalar(back((t - (p.badgeAt || 1e9)) / 0.4)); } };
};
T.warning = p => {   // spinning gold warning sign
  const g = new THREE.Group();
  const sh = new THREE.Shape(); sh.moveTo(0, 1.0); sh.lineTo(1.05, -0.8); sh.lineTo(-1.05, -0.8); sh.lineTo(0, 1.0);
  const tri = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.18, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.05, bevelSegments: 3 }), mats.gold); tri.castShadow = true;
  const s = new THREE.Group(); s.position.set(0, 0.4, 0); g.add(s); s.add(tri);
  const ex = label('!', { w: 0.7, h: 1.1, bg: null, size: 280 }); ex.position.set(0, -0.05, 0.26); s.add(ex);
  return { g, update(t, L) { s.rotation.y = lerp(Math.PI * 2, 0, eio(cl(L / 0.7))) + Math.sin(t * 2) * 0.08; s.scale.setScalar(back(L / 0.5)); } };
};
T.globe = p => {   // dotted globe turning, pins rising at given lat/lon with labels
  const g = new THREE.Group();
  const gl = new THREE.Group(); gl.position.set(0, 0.35, 0); g.add(gl);
  gl.add(sph(1.05, mats.deep));
  gl.add(new THREE.Points(new THREE.SphereGeometry(1.08, 48, 32), new THREE.PointsMaterial({ color: 0x7fb069, size: 0.03 })));
  const pins = (p.pins || []).map(pt => {
    const la = pt.lat * Math.PI / 180, lo = pt.lon * Math.PI / 180;
    const v = new THREE.Vector3(Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo));
    const pin = new THREE.Group(); pin.position.copy(v.clone().multiplyScalar(1.08)); pin.lookAt(v.clone().multiplyScalar(3)); gl.add(pin);
    const stem = cyl(0.025, 0.025, 0.4, mats.gold); stem.rotation.x = Math.PI / 2; stem.position.z = 0.2; pin.add(stem);
    const hd = sph(0.1, mats.gold); hd.position.z = 0.42; pin.add(hd);
    const lb = label(pt.text, { w: 1.3, h: 0.42, size: 95 }); g.add(lb);
    return { pin, lb, v, lon: pt.lon };
  });
  const lon0 = p.pins && p.pins.length ? -p.pins[0].lon : 0;
  return { g, update(t, L) {
    const spin = lerp(lon0 * Math.PI / 180 + 0.6, (p.pins.length > 1 ? -(p.pins[0].lon + p.pins[1].lon) / 2 : lon0) * Math.PI / 180, eio(cl(L / 2.4)));
    gl.rotation.set(0.35, spin, 0);
    pins.forEach((o, i) => { const k = back((L - 0.4 - i * 0.6) / 0.35); o.pin.scale.setScalar(Math.max(0.001, k)); const w = o.pin.getWorldPosition(new THREE.Vector3()); g.worldToLocal(w); o.lb.position.set(w.x * 1.1, w.y + 0.42, w.z + 0.5); face(o.lb); o.lb.scale.setScalar(Math.max(0.001, k)); });
  } };
};
T.shop = p => {   // little shopfront, camera on a pole, a sign swinging
  const g = new THREE.Group();
  const b = new THREE.Group(); b.position.set(-0.45, -0.2, 0); g.add(b);
  b.add(rb(2.0, 1.5, 1.0, 0.06, mats.cream));
  for (let i = 0; i < 6; i++) { const a = rb(0.34, 0.2, 0.5, 0.03, i % 2 ? mats.cream : mats.green); a.position.set(-0.85 + i * 0.34, 0.85, 0.65); a.rotation.x = 0.4; b.add(a); }
  const door = rb(0.5, 0.85, 0.06, 0.03, mats.green); door.position.set(0.45, -0.32, 0.51); b.add(door);
  const win = rb(0.7, 0.55, 0.06, 0.03, mats.glass); win.position.set(-0.45, -0.05, 0.51); b.add(win);
  const sign = rb(1.2, 0.3, 0.05, 0.03, mats.ink); sign.position.set(0, 1.2, 0.45); b.add(sign);
  const st = label(p.sign || 'SHOP', { w: 1.1, h: 0.28, bg: null, fg: '#f4d96c', size: 80 }); st.position.set(0, 1.2, 0.48); b.add(st);
  const cam = new THREE.Group(); cam.position.set(0.95, 1.15, 0.6); g.add(cam);
  cam.add(rb(0.55, 0.36, 0.36, 0.06, mats.ink)); const lens = cyl(0.13, 0.13, 0.18, mats.gold); lens.rotation.x = Math.PI / 2; lens.position.z = 0.25; cam.add(lens);
  const light = sph(0.05, new THREE.MeshBasicMaterial({ color: 0xff4d4d })); light.position.set(0.18, 0.12, 0.19); cam.add(light);
  const hang = new THREE.Group(); hang.position.set(0.95, 0.75, 0.7); g.add(hang);
  const q = label(p.question || 'Recording?', { w: 1.35, h: 0.45, bg: '#f2f3ef', size: 90 }); q.position.y = -0.45; hang.add(q);
  return { g, update(t, L) { b.scale.setScalar(back(L / 0.5)); cam.rotation.y = Math.sin(t * 1.4) * 0.5; light.visible = Math.sin(t * 6) > 0; hang.rotation.z = Math.sin(t * 2.5) * 0.12; hang.scale.setScalar(back((L - 0.6) / 0.4)); } };
};
T.send = p => {   // paper plane loops around a phone showing a photo
  const g = new THREE.Group();
  const ph = new THREE.Group(); ph.position.set(0, 0.3, 0); g.add(ph);
  ph.add(rb(1.15, 2.1, 0.1, 0.12, mats.ink));
  if (p.img) { const s = plane(1.03, 1.95, photo(p.img, 1.03, 1.95)); s.position.z = 0.055; ph.add(s); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.5, -0.32, 0, -0.3, 0, 0.03, -0.15, 0, 0, 0.5, 0, 0.03, -0.15, 0.32, 0, -0.3, 0, 0, 0.5, 0, -0.12, -0.25, 0, 0.03, -0.15], 3));
  geo.computeVertexNormals();
  const plane3 = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xf2f3ef, side: THREE.DoubleSide, roughness: 0.5 })); plane3.castShadow = true; g.add(plane3);
  const trail = []; for (let i = 0; i < 14; i++) { const d = sph(0.035, mats.gold); g.add(d); trail.push(d); }
  const pos = u => new THREE.Vector3(Math.cos(u) * 1.15, 0.4 + Math.sin(u * 2) * 0.45, Math.sin(u) * 0.9 + 0.5);
  return { g, update(t, L) { const u = L * 1.6; const a = pos(u), b2 = pos(u + 0.05); plane3.position.copy(a); plane3.lookAt(b2); plane3.scale.setScalar(1.3 * back(L / 0.4)); trail.forEach((d, i) => d.position.copy(pos(u - 0.12 * (i + 1)))); ph.rotation.y = Math.sin(t * 0.8) * 0.2; ph.scale.setScalar(back(L / 0.5)); } };
};
T.bignumber = p => {   // big value on a slab with gold cubes bursting out
  const g = new THREE.Group();
  const s = new THREE.Group(); s.position.set(0, 0.35, 0); g.add(s);
  s.add(rb(2.6, 1.3, 0.2, 0.12, mats.cream));
  const v = label(p.big || '', { w: 2.4, h: 0.85, bg: null, size: 230 }); v.position.set(0, 0.12, 0.12); s.add(v);
  const lb = label(p.label || '', { w: 2.2, h: 0.32, bg: null, fg: '#4d5a52', size: 80 }); lb.position.set(0, -0.42, 0.12); s.add(lb);
  const bits = []; for (let i = 0; i < 16; i++) { const b = rb(0.12, 0.12, 0.12, 0.03, mats.gold); g.add(b); bits.push(b); }
  return { g, update(t, L) { s.scale.setScalar(back(L / 0.45)); s.rotation.set(Math.sin(t) * 0.05, Math.sin(t * 0.7) * 0.15, 0); bits.forEach((b, i) => { const a = i / 16 * Math.PI * 2, k = eio(cl((L - 0.2) / 0.8)); b.position.set(Math.cos(a) * (0.5 + k * 1.3), 0.35 + Math.sin(a) * (0.3 + k * 0.9), 0.3); b.rotation.set(t + i, t * 1.3, 0); b.scale.setScalar(Math.max(0.001, 1 - k * 0.6)); }); } };
};

// ---------- build all scenes ----------
const built = LIST.map((s, i) => {
  const o = T[s.type](s); o.at = s.at; o.end = i + 1 < LIST.length ? LIST[i + 1].at : 1e9; o.g.visible = false; scene.add(o.g);
  o.g.traverse(m => { if (m.isMesh) { m.castShadow = true; } });
  return o;
});
if (pending === 0) window.ready3d = true;

window.render3d = function (t) {
  built.forEach((o, i) => {
    const L = t - o.at;
    const on = L >= -0.05 && t < o.end + 0.3;
    o.g.visible = on;
    if (!on) return;
    const kin = i === 0 ? 1 : eio(cl((L + 0.05) / 0.45)), kout = eio(cl((t - o.end) / 0.3));
    o.g.position.set(lerp(2.2, 0, kin) + lerp(0, -2.4, kout), 0, 0);
    o.g.rotation.y = lerp(-0.6, 0, kin) + lerp(0, 0.6, kout);
    o.g.scale.setScalar(Math.max(0.001, lerp(0.6, 1, kin) * (1 - 0.5 * kout)));
    o.update(t, Math.max(0, L), kin);
  });
  const a = amp(t);
  camera.position.set(Math.sin(t * 0.25) * 0.5, 1.4, 10.8 - a * 0.15);
  camera.lookAt(0, 0.42, 0);
  renderer.render(scene, camera);
};
