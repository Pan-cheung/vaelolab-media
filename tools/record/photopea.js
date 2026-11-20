// Explores the real Photopea editor (photopea.com) without an account. Runs on GitHub Actions (record.yml).
// Usage: node tools/record/photopea.js <out-dir>
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
  const glide = async (x, y, steps = 25) => { await page.mouse.move(x, y, { steps }); };
  const clickText = async (re, opts = {}) => { const l = page.getByText(re, opts).first(); const b = await l.boundingBox({ timeout: 4000 }).catch(() => null); if (!b) { marks['miss_' + String(re)] = 1; return false; } await glide(b.x + b.width / 2, b.y + b.height / 2, 22); await page.waitForTimeout(250); await page.mouse.down(); await page.mouse.up(); return true; };
  await page.goto('https://www.photopea.com/', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(5000);
  mark('home'); await snap('home');
  await glide(360, 700, 20);
  mark('start'); await clickText(/Start using Photopea/);
  await page.waitForTimeout(9000);
  mark('editor'); await snap('editor'); await dump('editor');
  // Drag the photo from the computer onto the "Drop any files here" box (real drop event on the page).
  await glide(530, 470, 30); await page.waitForTimeout(500);
  const b64 = fs.readFileSync(path.join(__dirname, 'assets', 'cafe-counter.jpg')).toString('base64');
  mark('drop');
  await glide(520, 450, 30);
  marks.drop = await page.evaluate(async ({ b64, x, y }) => {
    const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    const file = new File([u], 'cafe-counter.jpg', { type: 'image/jpeg' });
    const dt = new DataTransfer(); dt.items.add(file);
    const el = document.elementFromPoint(x, y) || document.body;
    for (const t of ['dragenter', 'dragover', 'drop']) el.dispatchEvent(new DragEvent(t, { bubbles: true, cancelable: true, dataTransfer: dt, clientX: x, clientY: y }));
    return el.tagName + '.' + (el.className || '');
  }, { b64, x: 350, y: 450 }).catch(e => 'err ' + String(e).slice(0, 200));
  await page.waitForTimeout(5000);
  mark('opened'); await snap('opened'); await dump('opened');
  // Text tool: press T, set a big size, click on the photo, type, confirm.
  await glide(360, 640, 20); await page.keyboard.press('t'); await page.waitForTimeout(800);
  mark('text');
  marks.top_inputs = await page.evaluate(() => [...document.querySelectorAll('input')].map(e => { const b = e.getBoundingClientRect(); return [e.type, e.value, Math.round(b.x), Math.round(b.y), Math.round(b.width)]; }).filter(a => a[3] < 70 && a[4] > 0)).catch(e => String(e));
  const sizeBox = Array.isArray(marks.top_inputs) ? marks.top_inputs.find(a => /px/.test(a[1]) || /^\d+(\.\d+)?$/.test(a[1])) : null;
  if (sizeBox) {
    await glide(sizeBox[2] + sizeBox[4] / 2, sizeBox[3] + 11, 20); await page.mouse.click(sizeBox[2] + sizeBox[4] / 2, sizeBox[3] + 11, { clickCount: 3 });
    await page.keyboard.press('Control+A'); await page.keyboard.type('150 px', { delay: 60 }); await page.keyboard.press('Enter'); await page.waitForTimeout(600);
  }
  await glide(70, 560, 25); await page.mouse.click(70, 560); await page.waitForTimeout(900);
  await page.keyboard.type('OPEN SUNDAY', { delay: 140 });
  await page.waitForTimeout(900); await snap('typed'); await dump('typed');
  const conf = page.locator('[title="Confirm"], button:has-text("Confirm")').first();
  const cb = await conf.boundingBox().catch(() => null);
  if (cb) { await glide(cb.x + cb.width / 2, cb.y + cb.height / 2, 25); await page.mouse.down(); await page.mouse.up(); } else { await page.keyboard.press('Escape'); }
  mark('confirmed'); await page.waitForTimeout(1200); await snap('committed');
  await glide(230, 650, 30); await glide(380, 700, 30); await page.waitForTimeout(600);
  // Export as JPG.
  mark('file'); await clickText(/^File$/); await page.waitForTimeout(1200); await snap('file-menu'); await dump('file-menu');
  mark('exportas'); { const l = page.getByText(/^Export as$/).first(); const b = await l.boundingBox({ timeout: 4000 }).catch(() => null); if (b) { await glide(b.x + b.width / 2, b.y + b.height / 2, 22); await page.waitForTimeout(900); await glide(b.x + b.width + 120, b.y + b.height / 2, 15); } } await page.waitForTimeout(1200); await snap('export-menu'); await dump('export-menu');
  mark('jpg'); await clickText(/^JPG/); await page.waitForTimeout(2500); await snap('jpg-dialog'); await dump('jpg-dialog');
  // Drag the quality slider down and watch the file size change.
  const rng = page.locator('input[type=range]').last();
  const rb = await rng.boundingBox().catch(() => null);
  marks.range = rb;
  if (rb) {
    const y = rb.y + rb.height / 2;
    await glide(rb.x + rb.width * 0.7, y, 25); mark('quality');
    await page.mouse.down(); await glide(rb.x + rb.width * 0.35, y, 45); await page.waitForTimeout(400); await glide(rb.x + rb.width * 0.5, y, 30); await page.mouse.up();
    await page.waitForTimeout(1500); await snap('quality'); await dump('quality');
  }
  const dlp = page.waitForEvent('download', { timeout: 8000 }).catch(() => null);
  mark('save'); await clickText(/^Save$/);
  const dl = await dlp; marks.download = dl ? dl.suggestedFilename() : null;
  if (dl) { const fp = path.join(out, 'export.jpg'); await dl.saveAs(fp).catch(() => {}); try { marks.export_bytes = fs.statSync(fp).size; fs.copyFileSync(fp, path.join(out, 'shot-99-export.png')); } catch (e) {} }
  await page.waitForTimeout(2500); await snap('saved');
  mark('end');
  marks.text = (await page.evaluate(() => document.body.innerText).catch(() => '')).slice(0, 3000);
  fs.writeFileSync(path.join(out, 'marks.json'), JSON.stringify(marks, null, 1));
  await page.screenshot({ path: path.join(out, 'last.png') });
  await ctx.close();
  const vids = fs.readdirSync(out).filter(f => f.endsWith('.webm'));
  fs.renameSync(path.join(out, vids[0]), path.join(out, 'raw.webm'));
  await browser.close();
})();
