// Records the real PageSpeed Insights page (pagespeed.web.dev) testing vaelolab.com. Runs on GitHub Actions (record.yml).
// Usage: node tools/record/pagespeed.js <out-dir>
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
    locale: 'en-US',
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
      document.querySelectorAll('button, input, a[role=tab], [role=tab], h1, h2').forEach(e => {
        const b = e.getBoundingClientRect();
        if (b.width && b.height) r.push([e.tagName, (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 40), Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)]);
      });
      return r.slice(0, 60);
    }).catch(e => String(e));
  };
  const scrollSlow = async (dy, steps = 30) => { for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, dy / steps); await page.waitForTimeout(40); } };

  await page.goto('https://pagespeed.web.dev/', { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1500);
  mark('home');
  await snap('home'); await dump('home');
  const input = page.locator('input[type=url], input[name=url], input[type=text]').first();
  const ib = await input.boundingBox().catch(() => null);
  if (ib) { await glide(ib.x + 60, ib.y + ib.height / 2, 30); }
  await page.mouse.down(); await page.mouse.up();
  await input.click().catch(() => {});
  mark('type');
  await input.type('https://vaelolab.com', { delay: 110 }).catch(() => {});
  await page.waitForTimeout(600);
  await snap('typed');
  const btn = page.getByRole('button', { name: /analy[sz]e/i }).first();
  const bb = await btn.boundingBox().catch(() => null);
  if (bb) await glide(bb.x + bb.width / 2, bb.y + bb.height / 2, 25);
  await page.waitForTimeout(400);
  mark('analyze');
  if (bb) { await page.mouse.down(); await page.mouse.up(); } else { await input.press('Enter').catch(() => {}); }
  // Wait for the real report.
  let ok = false;
  for (let i = 0; i < 150; i++) {
    await page.waitForTimeout(1000);
    const txt = await page.evaluate(() => document.body.innerText).catch(() => '');
    if (/Diagnose performance issues/i.test(txt) && /Performance/.test(txt) && !/Analyzing/i.test(txt.slice(0, 3000))) { ok = true; break; }
    if (i % 10 === 5) await glide(200 + (i % 3) * 120, 600 + (i % 2) * 200, 20);
  }
  marks.report_ok = ok;
  mark('report');
  await page.waitForTimeout(1500);
  await snap('report-top'); await dump('report');
  // Slow scroll through the mobile report.
  await glide(360, 800, 20);
  mark('scroll1');
  await scrollSlow(700, 40); await page.waitForTimeout(1200); await snap('s1');
  await scrollSlow(700, 40); await page.waitForTimeout(1200); await snap('s2');
  await scrollSlow(700, 40); await page.waitForTimeout(1200); await snap('s3');
  await scrollSlow(900, 50); await page.waitForTimeout(1200); await snap('s4');
  await scrollSlow(900, 50); await page.waitForTimeout(1200); await snap('s5');
  mark('scroll_end');
  // Back to top and switch to Desktop.
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await page.waitForTimeout(1500);
  const desk = page.getByRole('tab', { name: /desktop/i }).first();
  const db = await desk.boundingBox().catch(() => null);
  if (db) {
    await glide(db.x + db.width / 2, db.y + db.height / 2, 30);
    mark('desktop');
    await page.mouse.down(); await page.mouse.up();
    await page.waitForTimeout(2500);
    await snap('desktop');
    await glide(360, 800, 20);
    await scrollSlow(700, 40); await page.waitForTimeout(1200); await snap('d1');
    await scrollSlow(700, 40); await page.waitForTimeout(1200); await snap('d2');
  }
  mark('end');
  marks.text = (await page.evaluate(() => document.body.innerText).catch(() => '')).slice(0, 6000);
  fs.writeFileSync(path.join(out, 'marks.json'), JSON.stringify(marks, null, 1));
  await page.screenshot({ path: path.join(out, 'last.png') });
  await ctx.close();
  const vids = fs.readdirSync(out).filter(f => f.endsWith('.webm'));
  fs.renameSync(path.join(out, vids[0]), path.join(out, 'raw.webm'));
  await browser.close();
})();
