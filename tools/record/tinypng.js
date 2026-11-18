// Records real public TinyPNG pages for a Reel. Runs on GitHub Actions (record.yml).
// Usage: node tools/record/tinypng.js <out-dir>
// Writes <out-dir>/raw.webm and <out-dir>/marks.json (phase start times in seconds).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const out = process.argv[2] || 'rec-out';
fs.mkdirSync(out, { recursive: true });
const assets = path.join(__dirname, 'assets');
const files = ['market-stall.jpg', 'ceramics-studio.jpg', 'shop-owner.jpg', 'cafe-counter.jpg'].map(f => path.join(assets, f));

const CURSOR = `
(() => {
  const add = () => {
    if (document.getElementById('rec-dot')) return;
    const d = document.createElement('div');
    d.id = 'rec-dot';
    d.style.cssText = 'position:fixed;z-index:2147483647;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;background:rgba(244,217,108,.9);box-shadow:0 0 0 4px rgba(19,54,33,.45);pointer-events:none;left:270px;top:620px;transition:transform .12s;';
    document.documentElement.appendChild(d);
    addEventListener('mousemove', e => { d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px'; }, true);
    addEventListener('mousedown', () => { d.style.transform = 'scale(.75)'; }, true);
    addEventListener('mouseup', () => { d.style.transform = 'scale(1)'; }, true);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
})();`;

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 540, height: 960 }, deviceScaleFactor: 2,
    recordVideo: { dir: out, size: { width: 1080, height: 1920 } },
    locale: 'en-US',
  });
  await ctx.addInitScript(CURSOR);
  const page = await ctx.newPage();
  const t0 = Date.now();
  const marks = {};
  const mark = k => { marks[k] = (Date.now() - t0) / 1000; console.log(k, marks[k]); };
  let mx = 270, my = 620;
  const glide = async (x, y, steps = 25) => { await page.mouse.move(x, y, { steps }); mx = x; my = y; };
  const smooth = async (dy, ms = 1500) => {
    const n = Math.max(10, Math.round(ms / 40));
    for (let i = 0; i < n; i++) { await page.mouse.wheel(0, dy / n); await page.waitForTimeout(40); }
  };
  const dismiss = async () => {
    for (const label of ['Accept all', 'Accept', 'Got it', 'I agree', 'Allow all', 'OK']) {
      const b = page.getByRole('button', { name: label, exact: true });
      if (await b.count().catch(() => 0)) { await b.first().click({ timeout: 2000 }).catch(() => {}); }
    }
  };

  // Phase home: open the compressor page, look at the drop zone.
  await page.goto('https://tinypng.com/', { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await dismiss();
  await page.waitForTimeout(800);
  mark('home');
  await glide(200, 420); await smooth(260, 1800); await glide(330, 520); await smooth(-260, 1500);
  await page.waitForTimeout(600);

  // Phase upload: real upload of four shop photos through the page's own file input.
  mark('upload');
  const input = page.locator('input[type=file]').first();
  await glide(270, 500, 20);
  await page.mouse.down(); await page.mouse.up();
  await input.setInputFiles(files);
  // Follow the results list as it fills in.
  for (let i = 0; i < 14; i++) { await page.waitForTimeout(500); if (i === 4) await smooth(220, 1200); }
  mark('results');
  // Look over the results and the download buttons.
  await smooth(200, 1500);
  await glide(380, 600); await page.waitForTimeout(700);
  const dl = page.getByText(/download all/i).first();
  if (await dl.count().catch(() => 0)) {
    await dl.scrollIntoViewIfNeeded().catch(() => {});
    const bb = await dl.boundingBox().catch(() => null);
    if (bb) { await glide(bb.x + bb.width / 2, bb.y + bb.height / 2, 30); }
  }
  mark('download');
  await page.waitForTimeout(2500);
  await smooth(-300, 1500);
  await page.waitForTimeout(1500);

  // Phase claim: the JPG page with its before and after example.
  await page.goto('https://tinypng.com/compress/jpg', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await dismiss();
  await page.waitForTimeout(1500);
  mark('jpg');
  const ba = page.getByText(/smaller/i).first();
  await smooth(500, 2500);
  await ba.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(800);
  await glide(300, 500); await smooth(250, 2500); await page.waitForTimeout(1500);

  // Phase pricing: the official web pricing table.
  await page.goto('https://tinypng.com/pricing/web', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await dismiss();
  await page.waitForTimeout(1500);
  mark('pricing');
  await smooth(400, 3000);
  const free = page.getByText(/Web Free/i).first();
  await free.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(600);
  await glide(200, 480); await smooth(350, 3500); await glide(260, 640); await smooth(350, 3500);
  await page.waitForTimeout(2000);
  mark('end');

  fs.writeFileSync(path.join(out, 'marks.json'), JSON.stringify(marks, null, 1));
  await page.screenshot({ path: path.join(out, 'last.png') });
  await ctx.close();
  const vids = fs.readdirSync(out).filter(f => f.endsWith('.webm'));
  fs.renameSync(path.join(out, vids[0]), path.join(out, 'raw.webm'));
  await browser.close();
})();
