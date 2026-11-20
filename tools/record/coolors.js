// Records the real Coolors palette generator (coolors.co/generate) without an account. Runs on GitHub Actions (record.yml).
// Usage: node tools/record/coolors.js <out-dir>
// Writes <out-dir>/raw.webm, marks.json (phase start times in seconds), last.png and shot-*.png for review.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const out = process.argv[2] || 'rec-out';
fs.mkdirSync(out, { recursive: true });
const photo = path.join(__dirname, 'assets', process.env.PHOTO || 'shop-owner.jpg');

const CURSOR = `
(() => {
  const add = () => {
    if (document.getElementById('rec-dot')) return;
    const d = document.createElement('div');
    d.id = 'rec-dot';
    d.style.cssText = 'position:fixed;z-index:2147483647;width:30px;height:30px;margin:-15px 0 0 -15px;border-radius:50%;background:rgba(244,217,108,.92);box-shadow:0 0 0 5px rgba(19,54,33,.5);pointer-events:none;left:360px;top:700px;transition:transform .12s;';
    document.documentElement.appendChild(d);
    addEventListener('pointermove', e => { d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px'; }, true);
    addEventListener('mousemove', e => { d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px'; }, true);
    addEventListener('pointerdown', () => { d.style.transform = 'scale(.75)'; }, true);
    addEventListener('pointerup', () => { d.style.transform = 'scale(1)'; }, true);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
})();`;

(async () => {
  const browser = await chromium.launch();
  const W = 720, H = 1280;
  const ctx = await browser.newContext({
    viewport: { width: W, height: H }, deviceScaleFactor: 1.5,
    recordVideo: { dir: out, size: { width: 1080, height: 1920 } },
    locale: 'en-US', acceptDownloads: true,
  });
  await ctx.addInitScript(CURSOR);
  const page = await ctx.newPage();
  const t0 = Date.now();
  const marks = {};
  const mark = k => { marks[k] = +((Date.now() - t0) / 1000).toFixed(3); console.log(k, marks[k]); };
  let shot = 0;
  const snap = async k => { await page.screenshot({ path: path.join(out, `shot-${++shot}-${k}.png`) }).catch(() => {}); };
  const glide = async (x, y, steps = 25) => { await page.mouse.move(x, y, { steps }); };
  const dump = async k => {
    marks['dom_' + k] = await page.evaluate(() => {
      const r = [];
      document.querySelectorAll('button, a, input, [role=button], [title]').forEach(e => {
        const b = e.getBoundingClientRect();
        if (b.width && b.height && b.y < innerHeight && b.y > -5) r.push([e.tagName, (e.getAttribute('title') || e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 30), Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)]);
      });
      return r.slice(0, 80);
    }).catch(e => String(e));
  };
  const clickText = async re => { const l = page.getByText(re).first(); const b = await l.boundingBox({ timeout: 1500 }).catch(() => null); if (!b) return false; await glide(b.x + b.width / 2, b.y + b.height / 2, 20); await page.waitForTimeout(250); await page.mouse.down(); await page.mouse.up(); return true; };

  await page.goto('https://coolors.co/generate', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(4000);
  mark('home');
  await snap('home'); await dump('home');
  // Close cookie banner or tutorial overlay if present.
  for (const re of [/^(Accept|Accept all|I agree|Got it|OK)$/i, /^(Skip|Close|No thanks|Maybe later)$/i]) { if (await clickText(re)) { await page.waitForTimeout(900); } }
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(800);
  await snap('clean'); await dump('clean');
  mark('space');
  // Generate palettes with the spacebar, moving the pointer between presses.
  for (let i = 0; i < 9; i++) {
    await glide(200 + (i % 3) * 160, 300 + (i % 4) * 220, 18);
    await page.keyboard.press('Space');
    await page.waitForTimeout(1100);
    if (i === 3) await snap('space4');
  }
  mark('space_done');
  await snap('palette'); await dump('palette');
  // Hover each colour row to reveal its tools.
  mark('hover');
  for (let i = 0; i < 5; i++) { await glide(W * 0.5, 160 + i * 220, 22); await page.waitForTimeout(700); if (i === 1) { await snap('hover'); await dump('hover'); } }
  // Try the lock tool on row 2 if it shows a title containing lock.
  const lock = page.locator('[title*="lock" i], [aria-label*="lock" i]').nth(1);
  const lb = await lock.boundingBox().catch(() => null);
  if (lb) { await glide(lb.x + lb.width / 2, lb.y + lb.height / 2, 20); mark('lock'); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(800); await snap('locked'); }
  for (let i = 0; i < 3; i++) { await page.keyboard.press('Space'); await page.waitForTimeout(1200); }
  mark('after_lock'); await snap('after-lock');
  // Export.
  if (await clickText(/^Export$/)) {
    mark('export'); await page.waitForTimeout(1500); await snap('export-menu'); await dump('export');
    if (await clickText(/^Image$/)) { mark('image'); await page.waitForTimeout(2500); await snap('image'); await dump('image'); }
  }
  await page.waitForTimeout(2000);
  mark('end');
  marks.text = (await page.evaluate(() => document.body.innerText).catch(() => '')).slice(0, 4000);
  fs.writeFileSync(path.join(out, 'marks.json'), JSON.stringify(marks, null, 1));
  await page.screenshot({ path: path.join(out, 'last.png') });
  await ctx.close();
  const vids = fs.readdirSync(out).filter(f => f.endsWith('.webm'));
  fs.renameSync(path.join(out, vids[0]), path.join(out, 'raw.webm'));
  await browser.close();
})();
