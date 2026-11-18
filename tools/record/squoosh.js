// Records the real Squoosh web app (squoosh.app) compressing a shop photo. Runs on GitHub Actions (record.yml).
// Usage: node tools/record/squoosh.js <out-dir>
// Writes <out-dir>/raw.webm, marks.json (phase start times in seconds), last.png and shot-*.png for review.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const out = process.argv[2] || 'rec-out';
fs.mkdirSync(out, { recursive: true });
const photo = path.join(__dirname, 'assets', 'shop-owner.jpg');

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
      document.querySelectorAll('button, input, select, a[download], a[title], [role=slider], label').forEach(e => {
        const b = e.getBoundingClientRect();
        if (b.width && b.height) r.push([e.tagName, e.type || '', (e.getAttribute('title') || e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 40), Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)]);
      });
      return r;
    }).catch(e => String(e));
  };

  await page.goto('https://squoosh.app/', { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1200);
  mark('home');
  await snap('home'); await dump('home');
  await glide(250, 500); await glide(470, 700); await page.waitForTimeout(800);

  // Real upload through the app's own file input.
  mark('upload');
  await page.locator('input[type=file]').first().setInputFiles(photo);
  await page.waitForTimeout(3500);
  mark('editor');
  await snap('editor'); await dump('editor');

  // Sweep the before and after divider across the photo.
  const midY = Math.round(H * 0.38);
  await glide(W / 2, midY, 15);
  await page.mouse.down();
  await glide(W * 0.18, midY, 40); await glide(W * 0.85, midY, 60); await glide(W * 0.5, midY, 40);
  await page.mouse.up();
  mark('compare_done');
  await page.waitForTimeout(500);
  await snap('compare');

  // Pick WebP in the right hand compress panel if a format select exists.
  const selects = page.locator('select');
  const n = await selects.count().catch(() => 0);
  marks.selects = n;
  if (n) {
    const sel = selects.nth(n - 1);
    const bb = await sel.boundingBox().catch(() => null);
    if (bb) await glide(bb.x + bb.width / 2, bb.y + bb.height / 2, 30);
    await page.waitForTimeout(500);
    mark('format');
    const opts = await sel.locator('option').allTextContents().catch(() => []);
    marks.options = opts;
    const webp = opts.find(o => /webp/i.test(o));
    if (webp) await sel.selectOption({ label: webp }).catch(() => {});
    await page.waitForTimeout(3000);
    await snap('format'); await dump('format');
  }

  // Drag the quality slider in the last options panel.
  const ranges = page.locator('input[type=range]');
  const rc = await ranges.count().catch(() => 0);
  marks.ranges = rc;
  if (rc) {
    const q = ranges.nth(rc - 1);
    await q.scrollIntoViewIfNeeded().catch(() => {});
    const bb = await q.boundingBox().catch(() => null);
    if (bb) {
      const y = bb.y + bb.height / 2;
      const val = await q.evaluate(e => [e.min, e.max, e.value]).catch(() => [0, 100, 75]);
      const x0 = bb.x + bb.width * ((+val[2] - +val[0]) / (+val[1] - +val[0]));
      await glide(x0, y, 25);
      mark('quality');
      await page.mouse.down();
      await glide(bb.x + bb.width * 0.45, y, 40);
      await page.mouse.up();
      await page.waitForTimeout(3000);
      await snap('quality'); await dump('quality');
    }
  }

  // Point at the download link and click it.
  const dl = page.locator('a[download], a[title*="ownload" i], button[title*="ownload" i]').last();
  if (await dl.count().catch(() => 0)) {
    const bb = await dl.boundingBox().catch(() => null);
    if (bb) {
      await glide(bb.x + bb.width / 2, bb.y + bb.height / 2, 35);
      mark('download');
      await page.waitForTimeout(700);
      await page.mouse.down(); await page.mouse.up();
      await page.waitForTimeout(2500);
      await snap('download');
    }
  }

  // One more slow divider sweep so the edit has spare motion footage.
  await glide(W / 2, midY, 30);
  mark('sweep2');
  await page.mouse.down();
  await glide(W * 0.25, midY, 50); await glide(W * 0.75, midY, 60);
  await page.mouse.up();
  await page.waitForTimeout(1500);
  mark('end');

  fs.writeFileSync(path.join(out, 'marks.json'), JSON.stringify(marks, null, 1));
  await page.screenshot({ path: path.join(out, 'last.png') });
  await ctx.close();
  const vids = fs.readdirSync(out).filter(f => f.endsWith('.webm'));
  fs.renameSync(path.join(out, vids[0]), path.join(out, 'raw.webm'));
  await browser.close();
})();
