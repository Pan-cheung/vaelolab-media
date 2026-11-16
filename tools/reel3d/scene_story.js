// Story scene: one 3D scene per voiceover sentence, built from reusable scene types and real photos.
// window.CFG.scene.scenes = [{ at: <seconds>, type: '<type>', ...params }]; a scene lives until the next one starts.
// Types: hero, product, bubble, languages, map, calendar, battery, pricecards, warning, globe, shop, send, bignumber
import { THREE, C, scene, camera, renderer, floorAt, mats, rb, cyl, sph, tex, plane, cl, eio, back, lerp, amp } from './common.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import FONTJSON from './font_helvetiker_bold.js';
const FONT = new FontLoader().parse(FONTJSON);
function txt3d(text, size = 0.6, mat = mats.gold) {
  const geo = new TextGeometry(text, { font: FONT, size, depth: size * 0.28, curveSegments: 6, bevelEnabled: true, bevelThickness: size * 0.05, bevelSize: size * 0.03, bevelSegments: 3 });
  geo.computeBoundingBox(); geo.center();
  const m = new THREE.Mesh(geo, mat); m.castShadow = true; return m;
}

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
  const big = txt3d((p.tag || '').replace('US', ''), 0.42); big.position.set(0.25, -0.35, 1.0); g.add(big);
  return { g, update(t, L) { c.rotation.set(0, lerp(-0.5, 0.18, back((L + 0.15) / 0.6)) + Math.sin(t * 0.8) * 0.05, 0); tag.rotation.z = Math.sin(t * 2.4) * 0.18 * Math.exp(-L * 0.4) + Math.sin(t * 1.3) * 0.04; tag.scale.setScalar(Math.max(0.001, back((L + 0.2) / 0.4))); big.rotation.y = Math.sin(t * 1.5) * 0.5; big.position.y = -0.35 + Math.sin(t * 2) * 0.06; big.scale.setScalar(Math.max(0.001, back((L - 0.8) / 0.4))); } };
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
  const c = p.img ? card(p.img, 2.0, 1.12) : rb(1.2, 1.2, 0.2, 0.3, mats.green); c.position.set(-0.55, -0.15, -0.4); c.rotation.y = 0.25; g.add(c);
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
  const n = txt3d(p.big || '', 0.5); n.position.set(-0.35, -0.55, 1.1); g.add(n);
  return { g, update(t, L) { dots.rotation.y = t * 0.6; const i = Math.floor(L / 0.55); A.ls.forEach((l, j) => l.visible = j === i % words.length); B.ls.forEach((l, j) => l.visible = j === (i + 3) % words.length); A.s.scale.setScalar(back((L - 0.1) / 0.35)); B.s.scale.setScalar(back((L - 0.3) / 0.35)); n.scale.setScalar(Math.max(0.001, back((L - 0.5) / 0.4))); n.rotation.y = Math.sin(t * 1.4) * 0.6; A.s.position.y = 1.2 + Math.sin(t * 2) * 0.05; B.s.position.y = -0.2 + Math.sin(t * 2 + 1) * 0.05; } };
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
  const lb = txt3d(p.big || '', 0.5, mats.cream); lb.position.set(-0.5, 0.3, 0.8); g.add(lb);
  const box = rb(1.0, 0.6, 0.7, 0.12, mats.ink); box.position.set(1.0, -0.45, 0.2); g.add(box);
  const n = p.count || 7; const pips = [];
  for (let i = 0; i < n; i++) { const d = sph(0.09, mats.gold); g.add(d); pips.push(d); }
  const lc = label(p.small || '', { w: 1.1, h: 0.42, bg: '#f2f3ef', size: 95 }); lc.position.set(1.0, 0.25, 0.7); g.add(lc);
  return { g, update(t, L) { const k = eio(cl((L - 0.2) / 1.2)); const h = Math.max(0.01, 1.9 * k); fill.scale.y = h; fill.position.set(-0.5, -0.68 + h / 2, 0); lb.scale.setScalar(Math.max(0.001, back((L - 0.9) / 0.4))); lb.rotation.y = Math.sin(t * 1.6) * 0.5;
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
  const chips = (p.chips || []).map((c, i) => { const m = label(c.text, { w: 0.85, h: 0.38, size: 100, bg: i % 2 ? '#f2f3ef' : '#f4d96c' }); g.add(m); return { m, at: c.at, i }; });
  return { g, update(t, L) { s.rotation.y = lerp(Math.PI * 2, 0, eio(cl(L / 0.7))) + Math.sin(t * 2) * 0.08; s.scale.setScalar(back(L / 0.5)); chips.forEach(c => { const a = c.i / Math.max(1, chips.length) * Math.PI * 2 + t * 0.6; c.m.position.set(Math.cos(a) * 1.35, 0.4 + Math.sin(a) * 1.0, 0.8); face(c.m); c.m.scale.setScalar(Math.max(0.001, back((t - c.at) / 0.35))); }); } };
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
    pins.forEach((o, i) => { const k = back((L - 0.4 - i * 0.6) / 0.35); o.pin.scale.setScalar(Math.max(0.001, k)); const w = o.pin.getWorldPosition(new THREE.Vector3()); g.worldToLocal(w); o.lb.position.set(w.x * 1.1 + (i % 2 ? 0.4 : -0.4), w.y + 0.42 + (i % 2 ? -0.25 : 0.2), w.z + 0.5); face(o.lb); o.lb.scale.setScalar(Math.max(0.001, k)); });
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
  else { const s = label(p.text || 'Send', { w: 0.95, h: 0.5, size: 90 }); s.position.z = 0.06; ph.add(s); }
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
  const v = txt3d(p.big || '', 0.6, mats.green); v.position.set(0, 0.12, 0.25); s.add(v);
  const lb = label(p.label || '', { w: 2.2, h: 0.32, bg: null, fg: '#4d5a52', size: 80 }); lb.position.set(0, -0.42, 0.12); s.add(lb);
  const bits = []; for (let i = 0; i < 16; i++) { const b = rb(0.12, 0.12, 0.12, 0.03, mats.gold); g.add(b); bits.push(b); }
  return { g, update(t, L) { s.scale.setScalar(back(L / 0.45)); s.rotation.set(Math.sin(t) * 0.05, Math.sin(t * 0.7) * 0.15, 0); bits.forEach((b, i) => { const a = i / 16 * Math.PI * 2, k = eio(cl((L - 0.2) / 0.8)); b.position.set(Math.cos(a) * (0.5 + k * 1.3), 0.35 + Math.sin(a) * (0.3 + k * 0.9), 0.3); b.rotation.set(t + i, t * 1.3, 0); b.scale.setScalar(Math.max(0.001, 1 - k * 0.6)); }); } };
};


T.coins = p => {   // pedestals with coin stacks that grow when each label is spoken: items [{label, n, tag, at}]
  const g = new THREE.Group();
  const items = p.items || [], N = items.length, gap = 2.0 / Math.max(1, N - 1);
  const coinGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.08, 40);
  const st = items.map((it, i) => {
    const s = new THREE.Group(); s.position.set(-1.0 + i * gap, -0.5, (i === 0 || i === N - 1) ? -0.1 : 0.15); g.add(s);
    s.add(rb(0.78, 0.4, 0.78, 0.08, mats.cream));
    const lb = label(it.label, { w: 0.74, h: 0.26, bg: '#133621', fg: '#f2f3ef', size: 70, r: 20 }); lb.position.set(0, 0, 0.4); s.add(lb);
    const coins = []; for (let k = 0; k < it.n; k++) { const c = new THREE.Mesh(coinGeo, mats.gold); c.castShadow = true; s.add(c); coins.push(c); }
    const tag = label(it.tag, { w: 0.8, h: 0.4, size: 110, bg: '#f2f3ef' }); s.add(tag);
    return { s, coins, tag, at: it.at, n: it.n };
  });
  return { g, update(t, L) { st.forEach(o => { const k = cl((t - o.at) / 0.7) * o.n; o.coins.forEach((c, j) => { const a = cl(k - j); c.visible = a > 0.01; c.position.set(Math.sin(j * 2.3) * 0.02, 0.24 + j * 0.085 + (1 - back(a)) * 0.9, 0); c.rotation.y = j; }); o.tag.position.set(0, 0.45 + o.n * 0.085 * cl((t - o.at) / 0.7), 0.1); face(o.tag); o.tag.scale.setScalar(Math.max(0.001, back((t - o.at - 0.5) / 0.35))); }); } };
};
T.checkout = p => {   // checkout card: the right setting toggles on
  const g = new THREE.Group();
  const c = new THREE.Group(); c.position.set(0, 0.35, 0); g.add(c);
  c.add(rb(2.8, 1.9, 0.12, 0.12, mats.cream));
  const hd = label(p.title || 'Checkout', { w: 2.4, h: 0.4, bg: null, size: 110 }); hd.position.set(0, 0.6, 0.08); c.add(hd);
  const rows = (p.rows || []).map((r, i) => {
    const y = 0.05 - i * 0.55;
    const tx = label(r, { w: 1.7, h: 0.36, bg: null, fg: '#101a14', size: 80 }); tx.position.set(-0.4, y, 0.08); c.add(tx);
    const track = rb(0.62, 0.3, 0.06, 0.15, i === 0 ? mats.green : mats.key); track.position.set(0.95, y, 0.08); c.add(track);
    const knob = sph(0.14, mats.gold); knob.position.set(0.95, y, 0.16); c.add(knob);
    return { knob, track, y, on: i === 0 };
  });
  const cur = sph(0.07, mats.ink); g.add(cur);
  return { g, update(t, L) { const k = eio(cl((L - 0.6) / 0.4)); rows.forEach(r => { r.knob.position.x = 0.95 + (r.on ? lerp(-0.16, 0.16, k) : lerp(0.16, -0.16, k)); }); cur.position.set(lerp(1.6, 1.0, eio(cl(L / 0.6))), lerp(-0.6, 0.4, eio(cl(L / 0.6))), 0.4); c.rotation.set(-0.08, Math.sin(t * 0.8) * 0.12, 0); } };
};


const rTex = tex(200, 360, (x, W, H) => { x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.fillStyle = '#a7aeaa'; for (let i = 0; i < 10; i++) x.fillRect(24, 30 + i * 26, i % 3 === 2 ? 90 : 150, 9); x.fillStyle = '#133621'; x.fillRect(24, 310, 90, 14); });
const rMat = new THREE.MeshStandardMaterial({ map: rTex, side: THREE.DoubleSide, roughness: 0.85 });
T.shoebox = p => {   // cardboard shoebox with receipts bursting out of it
  const g = new THREE.Group();
  const card = new THREE.MeshStandardMaterial({ color: 0xb98b5a, roughness: 0.85 });
  const b = new THREE.Group(); b.position.set(0, -0.7, 0); b.rotation.y = 0.35; g.add(b);
  const W = 2.0, D = 1.2, H = 0.8;
  const bot = rb(W, 0.06, D, 0.02, card); bot.position.y = 0.03; b.add(bot);
  [[0, H / 2, D / 2, W, H, 0.06], [0, H / 2, -D / 2, W, H, 0.06], [W / 2, H / 2, 0, 0.06, H, D], [-W / 2, H / 2, 0, 0.06, H, D]].forEach(([x, y, z, w, h, d]) => { const m = rb(w, h, d, 0.02, card); m.position.set(x, y, z); b.add(m); });
  const lb = label(p.text || 'RECEIPTS', { w: 1.0, h: 0.3, bg: '#efe4c8', fg: '#5b4026', size: 80, r: 6 }); lb.position.set(0, H * 0.55, D / 2 + 0.04); b.add(lb);
  const rs = []; for (let i = 0; i < 18; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.64), rMat); m.castShadow = true; g.add(m); rs.push(m); }
  const rnd = (i, k) => { const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return v - Math.floor(v); };
  return { g, update(t, L) { rs.forEach((m, i) => { const ph = (L * 0.8 + rnd(i, 1)) % 1, a = rnd(i, 2) * 6.28, sp = 0.4 + rnd(i, 3) * 0.8; m.position.set(Math.cos(a) * sp * ph, -0.4 + 3.4 * ph - 3.2 * ph * ph, Math.sin(a) * sp * ph * 0.5 + 0.2); m.rotation.set(rnd(i, 4) * 6 + t * 2, rnd(i, 5) * 6 + t, rnd(i, 6) * 3); }); b.rotation.z = Math.sin(t * 9) * 0.02; } };
};
T.phonecam = p => {   // phone camera snaps a receipt (or a photo), flash on the snap
  const g = new THREE.Group();
  const rc = p.img ? card(p.img, 1.2, 1.2) : new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.6), rMat);
  rc.position.set(-0.75, 0.2, -0.3); rc.rotation.set(-0.15, 0.3, 0.05); g.add(rc);
  const ph = new THREE.Group(); ph.position.set(0.7, 0.35, 0.8); g.add(ph);
  ph.add(rb(1.05, 2.0, 0.1, 0.12, mats.ink));
  const scr = plane(0.95, 1.85, new THREE.MeshBasicMaterial({ color: 0x0f1f16, toneMapped: false })); scr.position.z = 0.055; ph.add(scr);
  const vf = label(p.text || 'SNAP', { w: 0.8, h: 0.3, size: 80 }); vf.position.set(0, -0.7, 0.06); ph.add(vf);
  const corner = []; [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sy]) => { const c = rb(0.18, 0.04, 0.02, 0.01, mats.gold); c.position.set(sx * 0.32, sy * 0.55 + 0.1, 0.06); ph.add(c); corner.push(c); });
  const flash = plane(1.0, 1.9, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, toneMapped: false })); flash.position.z = 0.07; ph.add(flash);
  return { g, update(t, L) { ph.rotation.set(0, lerp(-0.6, -0.25, eio(cl(L / 0.6))), 0.05); const snap = p.snapAt ? t - p.snapAt : L - 1.0; flash.material.opacity = snap > 0 && snap < 0.3 ? 1 - snap / 0.3 : 0; corner.forEach(c => c.scale.setScalar(1 + Math.max(0, Math.sin(L * 6)) * 0.2)); rc.position.y = 0.2 + Math.sin(t * 1.5) * 0.05; } };
};
T.checklist = p => {   // a card whose rows tick one by one: rows [{text, at}]
  const g = new THREE.Group();
  const c = new THREE.Group(); c.position.set(0, 0.35, 0); g.add(c);
  const rows = p.rows || [], H = 0.5 + rows.length * 0.42;
  c.add(rb(2.7, H, 0.12, 0.12, mats.cream));
  const hd = label(p.title || '', { w: 2.3, h: 0.36, bg: null, size: 100 }); hd.position.set(0, H / 2 - 0.3, 0.08); c.add(hd);
  const rs = rows.map((r, i) => { const y = H / 2 - 0.75 - i * 0.42; const tx = label(r.text, { w: 1.8, h: 0.32, bg: null, fg: '#101a14', size: 80 }); tx.position.set(-0.3, y, 0.08); c.add(tx);
    const box = rb(0.3, 0.3, 0.06, 0.06, mats.key); box.position.set(1.0, y, 0.08); c.add(box);
    const tick = label('✓', { w: 0.36, h: 0.36, bg: '#f4d96c', size: 110, r: 40 }); tick.position.set(1.0, y, 0.13); c.add(tick); return { tick, at: r.at }; });
  return { g, update(t, L) { rs.forEach(r => r.tick.scale.setScalar(Math.max(0.001, back((t - r.at) / 0.3)))); c.rotation.set(-0.06, Math.sin(t * 0.7) * 0.12, 0); } };
};
T.cafe = p => {   // little cafe room with an owner behind the counter
  const g = new THREE.Group(); const room = new THREE.Group(); room.rotation.y = -0.55; room.position.y = -0.8; room.scale.setScalar(0.62); g.add(room);
  const W = 4.4, D = 3.4, HW = 2.5;
  room.add(rb(W, 0.25, D, 0.06, new THREE.MeshStandardMaterial({ color: 0xd9c3a0, roughness: 0.7 })));
  const bk = rb(W, HW, 0.18, 0.04, mats.green); bk.position.set(0, HW / 2, -D / 2 + 0.09); room.add(bk);
  const lf = rb(0.18, HW, D, 0.04, mats.cream); lf.position.set(-W / 2 + 0.09, HW / 2, 0); room.add(lf);
  const tr = rb(W, 0.1, 0.22, 0.03, mats.gold); tr.position.set(0, HW, -D / 2 + 0.09); room.add(tr);
  const sign = label(p.sign || 'CAFE', { w: 1.6, h: 0.5, bg: '#101a14', fg: '#f4d96c', size: 110, r: 16 }); sign.position.set(-0.6, 1.8, -D / 2 + 0.22); room.add(sign);
  const ctr = rb(2.6, 0.95, 0.8, 0.06, mats.cream); ctr.position.set(-0.6, 0.55, -0.75); room.add(ctr);
  const top = rb(2.7, 0.08, 0.9, 0.03, mats.wood); top.position.set(-0.6, 1.05, -0.75); room.add(top);
  const esp = rb(0.6, 0.55, 0.45, 0.06, mats.ink); esp.position.set(-1.35, 1.36, -0.85); room.add(esp);
  const ow = new THREE.Group(); ow.position.set(-0.4, 0.1, -1.25); room.add(ow);
  const bd = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.75, 8, 24), mats.green); bd.position.y = 0.95; ow.add(bd);
  const hd = sph(0.24, mats.skin); hd.position.y = 1.72; ow.add(hd);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.255, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), mats.ink); hair.position.y = 1.74; ow.add(hair);
  [[0.6, 1.05], [1.55, 0.6]].forEach(([x, z]) => { const tb = new THREE.Group(); tb.position.set(x, 0.1, z); room.add(tb); const tp = cyl(0.42, 0.42, 0.06, mats.cream); tp.position.y = 0.72; tb.add(tp); const lg = cyl(0.05, 0.05, 0.7, mats.ink); lg.position.y = 0.37; tb.add(lg); [-0.6, 0.6].forEach(dx => { const ch = rb(0.34, 0.45, 0.34, 0.05, mats.wood); ch.position.set(dx, 0.25, 0); tb.add(ch); }); });
  const tag = label(p.tag || '', { w: 1.3, h: 0.45, size: 100 }); tag.position.set(0.9, 1.25, 0.9); g.add(tag);
  return { g, update(t, L) { ow.position.y = 0.1 + Math.abs(Math.sin(t * 3.2)) * 0.04; ow.rotation.y = Math.sin(t * 0.8) * 0.4; room.rotation.y = -0.55 + Math.sin(t * 0.35) * 0.15; tag.scale.setScalar(Math.max(0.001, p.tag ? back((L - 0.5) / 0.4) : 0)); } };
};

// ---------- backdrop: tinted radial glow plane + drifting bokeh ----------
const glowTex = tex(512, 512, (x, W, H) => { const g = x.createRadialGradient(W / 2, H * 0.45, 10, W / 2, H / 2, W * 0.62); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#2a2a2a'); x.fillStyle = g; x.fillRect(0, 0, W, H); });
const bgMat = new THREE.MeshBasicMaterial({ map: glowTex, toneMapped: false, color: 0x2a5c3d });
const bg = plane(60, 60, bgMat); bg.position.z = -18; scene.add(bg);
const PALETTE = [0x2a5c3d, 0x1b4a55, 0x23503a, 0x22395a, 0x1e5a48, 0x2c3a52];
const dotTex = tex(64, 64, (x, W, H) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,240,190,1)'); g.addColorStop(1, 'rgba(255,240,190,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H); });
const bokeh = [];
for (let i = 0; i < 70; i++) {
  const r = n => { const v = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return v - Math.floor(v); };
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: i % 3 ? 0xf4d96c : 0xf2f3ef, transparent: true, opacity: 0.2 + r(1) * 0.45, depthWrite: false, blending: THREE.AdditiveBlending }));
  sp.userData = { x: (r(2) - 0.5) * 10, y: (r(3) - 0.5) * 9 + 0.5, z: -10 + r(4) * 12, s: 0.05 + r(5) * 0.35, v: 0.3 + r(6) * 0.9 };
  scene.add(sp); bokeh.push(sp);
}

// ---------- build all scenes ----------
const built = LIST.map((s, i) => {
  const o = T[s.type](s); o.at = s.at; o.end = i + 1 < LIST.length ? LIST[i + 1].at : 1e9; o.g.visible = false; scene.add(o.g);
  o.g.traverse(m => { if (m.isMesh) { m.castShadow = true; } });
  return o;
});
if (pending === 0) window.ready3d = true;

// entry styles cycle so no two scenes in a row arrive the same way
const ENTRIES = ['right', 'drop', 'spin', 'zoom', 'flip'];
function place(o, i, t) {
  const L = t - o.at, kin = i === 0 ? 1 : eio(cl((L + 0.05) / 0.5)), bin = i === 0 ? 1 : back((L + 0.05) / 0.55), kout = eio(cl((t - o.end) / 0.3));
  const e = ENTRIES[i % ENTRIES.length];
  let x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0, sc = 1;
  if (e === 'right') { x = lerp(3, 0, kin); ry = lerp(-0.7, 0, kin); }
  if (e === 'drop') { y = lerp(4, 0, bin); rz = lerp(0.3, 0, kin); }
  if (e === 'spin') { ry = lerp(Math.PI * 1.5, 0, kin); sc = lerp(0.3, 1, bin); }
  if (e === 'zoom') { z = lerp(-9, 0, kin); sc = lerp(0.5, 1, kin); }
  if (e === 'flip') { rx = lerp(-Math.PI / 2, 0, bin); y = lerp(-1, 0, kin); }
  // exits alternate between flying off left and shooting up
  if (i % 2) { y += lerp(0, 4.5, kout); rz += lerp(0, -0.3, kout); } else { x += lerp(0, -3.5, kout); ry += lerp(0, 0.8, kout); }
  o.g.position.set(x, y, z); o.g.rotation.set(rx, ry, rz); o.g.scale.setScalar(Math.max(0.001, sc * (1 - 0.4 * kout)));
}
// one camera move per scene
const MOVES = ['push', 'orbit', 'crane', 'truck', 'dutch'];
function camFor(i, L, dur) {
  const u = cl(L / Math.max(1, dur)), m = MOVES[i % MOVES.length];
  const c = { az: 0, h: 1.4, d: 11.6, x: 0, roll: 0, ly: 0.42 };
  if (m === 'push') { c.d = lerp(12.6, 10.4, eio(u)); }
  if (m === 'orbit') { c.az = lerp(-0.35, 0.35, eio(u)); c.d = 11.6; }
  if (m === 'crane') { c.h = lerp(0.0, 2.6, eio(u)); c.ly = lerp(0.55, 0.35, u); }
  if (m === 'truck') { c.x = lerp(0.7, -0.7, eio(u)); c.az = lerp(0.1, -0.1, u); }
  if (m === 'dutch') { c.roll = lerp(0.12, -0.05, eio(u)); c.d = lerp(12.0, 10.8, u); }
  return c;
}
window.render3d = function (t) {
  let cur = 0;
  built.forEach((o, i) => { if (t >= o.at - 0.05) cur = i; });
  built.forEach((o, i) => {
    const L = t - o.at, on = L >= -0.05 && t < o.end + 0.3;
    o.g.visible = on; if (!on) return;
    place(o, i, t); o.update(t, Math.max(0, L));
  });
  // camera: this scene's move, blended from the previous scene's end over 0.45s, with a small kick on each cut
  const o = built[cur], L = t - o.at, dur = Math.min(o.end, C.cta + 3) - o.at;
  let c = camFor(cur, L, dur);
  if (cur > 0 && L < 0.45) { const p = built[cur - 1], pc = camFor(cur - 1, o.at - p.at, o.at - p.at), k = eio(cl(L / 0.45)); for (const key in c) c[key] = lerp(pc[key], c[key], k); }
  const kick = cur > 0 ? Math.exp(-L * 7) * Math.sin(L * 30) * 0.12 : 0;
  camera.position.set(c.x + Math.sin(c.az) * c.d, c.h + kick, Math.cos(c.az) * c.d - amp(t) * 0.12);
  camera.up.set(Math.sin(c.roll), Math.cos(c.roll), 0);
  camera.lookAt(c.x * 0.6, c.ly, 0);
  // backdrop tint per scene
  const col = new THREE.Color(PALETTE[cur % PALETTE.length]), prev = new THREE.Color(PALETTE[Math.max(0, cur - 1) % PALETTE.length]);
  bgMat.color.copy(prev.lerp(col, cl(L / 0.6)));
  bokeh.forEach((b, i) => { const u = b.userData; const z = ((u.z + 10 + t * u.v) % 13) - 10; b.position.set(u.x + Math.sin(t * 0.4 + i) * 0.3, u.y + Math.sin(t * 0.6 + i * 2) * 0.2, z); b.scale.setScalar(u.s); });
  renderer.render(scene, camera);
};
