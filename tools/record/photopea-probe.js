// Explores the real Photopea editor (photopea.com) without an account. Runs on GitHub Actions (record.yml).
// Usage: node tools/record/photopea-probe.js <out-dir>
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
  const dump = async k => {
    marks['dom_' + k] = await page.evaluate(() => {
      const r = [];
      document.querySelectorAll('button, a, input, [role=button], [title], .bbtn, span, div').forEach(e => {
        const b = e.getBoundingClientRect();
        const t = (e.getAttribute('title') || e.getAttribute('aria-label') || (e.children.length === 0 ? e.textContent : '') || '').trim().slice(0, 30);
        if (t && b.width && b.height && b.width < 400 && b.y < innerHeight && b.y > -5) r.push([e.tagName, e.type || '', t, Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)]);
      });
      return r.slice(0, 150);
    }).catch(e => String(e));
  };
  await page.goto('https://www.photopea.com/', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(8000);
  mark('home'); await snap('home'); await dump('home');
  marks.inputs = await page.evaluate(() => [...document.querySelectorAll('input[type=file]')].length).catch(() => -1);
  const fi = page.locator('input[type=file]').first();
  if (marks.inputs > 0) {
    await fi.setInputFiles(path.join(__dirname, 'assets', 'shop-owner.jpg')).catch(e => marks.fi_err = String(e));
  } else {
    const [fc] = await Promise.all([page.waitForEvent('filechooser', { timeout: 8000 }).catch(() => null), page.getByText(/Open From Computer/i).first().click({ timeout: 5000 }).catch(e => marks.open_err = String(e))]);
    if (fc) await fc.setFiles(path.join(__dirname, 'assets', 'shop-owner.jpg'));
  }
  await page.waitForTimeout(5000);
  mark('opened'); await snap('opened'); await dump('opened');
  // Open top menus one by one for a look.
  for (const m of ['Image', 'File']) {
    await page.getByText(m, { exact: true }).first().click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(1200); await snap('menu-' + m); await dump('menu-' + m);
    await page.keyboard.press('Escape').catch(() => {}); await page.mouse.click(5, 1270).catch(() => {}); await page.waitForTimeout(600);
  }
  mark('end');
  marks.text = (await page.evaluate(() => document.body.innerText).catch(() => '')).slice(0, 3000);
  fs.writeFileSync(path.join(out, 'marks.json'), JSON.stringify(marks, null, 1));
  await page.screenshot({ path: path.join(out, 'last.png') });
  await ctx.close();
  const vids = fs.readdirSync(out).filter(f => f.endsWith('.webm'));
  fs.renameSync(path.join(out, vids[0]), path.join(out, 'raw.webm'));
  await browser.close();
})();
