// Records qrcode-monkey.com without an account (record.yml).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const out = process.argv[2] || 'rec-out';
fs.mkdirSync(out, { recursive: true });
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
  const ctx = await browser.newContext({ viewport: { width: 720, height: 1280 }, deviceScaleFactor: 1.5,
    recordVideo: { dir: out, size: { width: 1080, height: 1920 } }, locale: 'en-US', acceptDownloads: true,
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' });
  await ctx.addInitScript(CURSOR);
  const page = await ctx.newPage();
  const t0 = Date.now(); const marks = {};
  const mark = k => { marks[k] = +((Date.now() - t0) / 1000).toFixed(3); console.log(k, marks[k]); };
  let shot = 0;
  const snap = async k => { await page.screenshot({ path: path.join(out, `shot-${++shot}-${k}.png`) }).catch(() => {}); };
  const glideTo = async (loc) => { const b = await loc.boundingBox().catch(() => null); if (!b) return false;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 18 }); return true; };
  const typeIn = async (loc, text, k) => { try { await loc.scrollIntoViewIfNeeded({ timeout: 4000 }); await glideTo(loc); await loc.click({ timeout: 4000 }); await page.keyboard.type(text, { delay: 70 }); mark(k); } catch (e) { marks[k + '_err'] = String(e).slice(0, 160); } };
  const finish = async () => {
    mark('end'); marks.text = (await page.evaluate(() => document.body.innerText).catch(() => '')).slice(0, 2500);
    fs.writeFileSync(path.join(out, 'marks.json'), JSON.stringify(marks, null, 1));
    await page.screenshot({ path: path.join(out, 'last.png') });
    await ctx.close(); const vids = fs.readdirSync(out).filter(f => f.endsWith('.webm'));
    fs.renameSync(path.join(out, vids[0]), path.join(out, 'raw.webm')); await browser.close(); };

  await page.goto('https://www.qrcode-monkey.com/', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(6000); mark('home'); await snap('home');
  for (const t of ['Accept', 'Accept all', 'I agree', 'Got it']) { await page.getByRole('button', { name: t }).first().click({ timeout: 1200 }).catch(() => {}); }
  await page.waitForTimeout(800); await snap('clean');
  mark('start');
  const url = page.locator('input[placeholder*="http" i], input#qrcodeUrl, input[name*="url" i]').first();
  try { await url.scrollIntoViewIfNeeded({ timeout: 4000 }); await glideTo(url); await url.click({ timeout: 4000 }); await url.click({ clickCount: 3 }); await page.keyboard.type('https://vaelolab.com', { delay: 120 }); mark('url'); } catch (e) { marks.url_err = String(e).slice(0, 160); }
  await page.waitForTimeout(1200); await snap('url');
  try { const sc = page.getByText('SET COLORS', { exact: false }).first(); await glideTo(sc); await page.waitForTimeout(300); await sc.click({ timeout: 4000 }); mark('colors'); await page.waitForTimeout(1500); await snap('colors-open');
    const h = await page.evaluateHandle(() => [...document.querySelectorAll('input')].find(i => i.value === '#000000' && i.getBoundingClientRect().width > 0));
    const el = h.asElement(); const bb = await el.boundingBox(); await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2, { steps: 22 });
    await el.click({ clickCount: 3 }); await page.keyboard.type('#133621', { delay: 140 }); await page.keyboard.press('Enter'); mark('color_set'); } catch (e) { marks.color_err = String(e).slice(0, 160); }
  await page.waitForTimeout(1500); await snap('colored');
  try { const lg = page.getByText('ADD LOGO IMAGE', { exact: false }).first(); await lg.scrollIntoViewIfNeeded({ timeout: 4000 }); await glideTo(lg); await page.waitForTimeout(300); await lg.click({ timeout: 4000 }); mark('logo_open'); await page.waitForTimeout(1500); await snap('logo-open');
    const up = page.getByRole('button', { name: /Upload Image/i }).first(); await glideTo(up); await page.waitForTimeout(500);
    const fi = page.locator('input[type=file]').first();
    await fi.setInputFiles('tools/record/assets/vaelolab-mark.png'); mark('logo_set'); } catch (e) { marks.logo_err = String(e).slice(0, 160); }
  await page.waitForTimeout(2500); await snap('logo-set');
  try { const sl = page.locator('.slider-horizontal, .rz-pointer, [role=slider], input[type=range]').first(); const sb = await sl.boundingBox();
    marks.slider_box = sb; if (sb) { await sl.scrollIntoViewIfNeeded({ timeout: 4000 }); const b2 = await sl.boundingBox(); await page.mouse.move(b2.x + b2.width / 2, b2.y + b2.height / 2, { steps: 18 }); await page.mouse.down(); await page.mouse.move(b2.x + b2.width / 2 + 260, b2.y + b2.height / 2, { steps: 30 }); await page.mouse.up(); mark('quality'); } } catch (e) { marks.quality_err = String(e).slice(0, 160); }
  await page.waitForTimeout(1200); await snap('quality');
  try { const cr = page.getByText('Create QR Code', { exact: false }).first(); await cr.scrollIntoViewIfNeeded({ timeout: 4000 }); await glideTo(cr); await page.waitForTimeout(400); await cr.click({ timeout: 4000 }); mark('create'); } catch (e) { marks.create_err = String(e).slice(0, 160); }
  await page.waitForTimeout(4000); await snap('created');
  try { const dl = page.getByText('Download PNG', { exact: false }).first(); await dl.scrollIntoViewIfNeeded({ timeout: 4000 }); await glideTo(dl); await page.waitForTimeout(600);
    const [d] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }).catch(() => null), dl.click({ timeout: 4000 })]);
    mark('download'); if (d) marks.dl_name = d.suggestedFilename(); } catch (e) { marks.dl_err = String(e).slice(0, 160); }
  await page.waitForTimeout(2500); await snap('after-download');
  for (const t of ['Close', 'No thanks', 'Skip']) { await page.getByRole('button', { name: t }).first().click({ timeout: 800 }).catch(() => {}); }
  try { const fr = page.getByText('The created static QR code is 100% free', { exact: false }).first(); await fr.scrollIntoViewIfNeeded({ timeout: 4000 });
    const b = await fr.boundingBox(); if (b) { await page.mouse.move(b.x + 20, b.y + b.height / 2, { steps: 10 }); await page.mouse.move(b.x + b.width - 20, b.y + b.height / 2, { steps: 40 }); } mark('free_note'); } catch (e) { marks.free_err = String(e).slice(0, 160); }
  await page.waitForTimeout(2500); await snap('free-note');
  try { const ch = page.getByText('you can’t change the content once', { exact: false }).first(); await ch.scrollIntoViewIfNeeded({ timeout: 4000 });
    const b = await ch.boundingBox(); if (b) { await page.mouse.move(b.x + 20, b.y + b.height / 2, { steps: 10 }); await page.mouse.move(b.x + b.width - 20, b.y + b.height / 2, { steps: 40 }); } mark('no_edit_note'); } catch (e) { marks.noedit_err = String(e).slice(0, 160); }
  await page.waitForTimeout(3000); await snap('no-edit-note');
  marks.fulltext = (await page.evaluate(() => document.body.innerText).catch(() => '')).slice(0, 12000);
  await finish();
})();
