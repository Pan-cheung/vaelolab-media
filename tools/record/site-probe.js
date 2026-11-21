// Visits candidate free tool sites without an account and checks which ones load in headless Chromium.
// Usage: node tools/record/site-probe.js <out-dir>. Writes raw.webm, marks.json, last.png, shot-*.png.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const out = process.argv[2] || 'rec-out';
fs.mkdirSync(out, { recursive: true });
const SITES = [
  ['excalidraw', 'https://excalidraw.com/'],
  ['hemingway', 'https://hemingwayapp.com/'],
  ['invoicegen', 'https://invoice-generator.com/'],
  ['ilovepdf', 'https://www.ilovepdf.com/merge_pdf'],
  ['pexels', 'https://www.pexels.com/search/bakery/'],
  ['unsplash', 'https://unsplash.com/s/photos/bakery'],
  ['qrmonkey', 'https://www.qrcode-monkey.com/'],
  ['tinypng', 'https://tinypng.com/'],
  ['googleforms', 'https://docs.google.com/forms/'],
  ['wixinvoice', 'https://www.wix.com/tools/invoice-generator'],
];
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 720, height: 1280 }, deviceScaleFactor: 1.5,
    recordVideo: { dir: out, size: { width: 1080, height: 1920 } }, locale: 'en-US',
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' });
  const page = await ctx.newPage();
  const t0 = Date.now(); const marks = {};
  for (const [k, u] of SITES) {
    let st = null;
    try { const r = await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 30000 }); st = r && r.status(); } catch (e) { st = String(e).slice(0, 80); }
    await page.waitForTimeout(6000);
    marks[k] = { t: +((Date.now() - t0) / 1000).toFixed(2), status: st, title: await page.title().catch(() => ''),
      text: (await page.evaluate(() => document.body.innerText).catch(() => '')).slice(0, 600) };
    await page.screenshot({ path: path.join(out, `shot-${k}.png`) }).catch(() => {});
  }
  fs.writeFileSync(path.join(out, 'marks.json'), JSON.stringify(marks, null, 1));
  await page.screenshot({ path: path.join(out, 'last.png') });
  await ctx.close();
  const vids = fs.readdirSync(out).filter(f => f.endsWith('.webm'));
  fs.renameSync(path.join(out, vids[0]), path.join(out, 'raw.webm'));
  await browser.close();
})();
