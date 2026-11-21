// Records invoice-generator.com without an account (record.yml).
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

  await page.goto('https://invoice-generator.com/', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(5000); mark('home'); await snap('home');
  marks.fields = await page.evaluate(() => [...document.querySelectorAll('input,textarea,select,button')].map(e => [e.tagName, e.placeholder || e.name || e.textContent.trim().slice(0, 30), Math.round(e.getBoundingClientRect().y)]).slice(0, 80)).catch(e => String(e));
  await typeIn(page.locator('textarea[placeholder*="from" i], textarea[placeholder*="Who is this from" i]').first(), 'Maple Street Bakery\n12 Maple St, Toronto', 'from');
  await typeIn(page.locator('textarea[placeholder*="to?" i], textarea[placeholder*="Who is this to" i]').first(), 'Northside Cafe', 'to');
  await snap('names');
  await typeIn(page.locator('textarea[placeholder*="Description" i], input[placeholder*="Description" i]').first(), 'Croissants, wholesale (dozen)', 'item');
  const qty = page.locator('xpath=//textarea[contains(@placeholder,"Description")]/following::input[1]');
  try { await glideTo(qty); await qty.click({ timeout: 3000, clickCount: 3 }); await page.keyboard.type('6', { delay: 120 }); mark('qty'); } catch (e) { marks.qty_err = String(e).slice(0, 120); }
  const rate = page.locator('xpath=//textarea[contains(@placeholder,"Description")]/following::input[2]');
  try { await glideTo(rate); await rate.click({ timeout: 3000, clickCount: 3 }); await page.keyboard.type('24', { delay: 140 }); mark('rate'); } catch (e) { marks.rate_err = String(e).slice(0, 120); }
  await page.mouse.move(360, 900, { steps: 10 }); await page.waitForTimeout(1500); await snap('item');
  try { const st = page.getByRole('button', { name: 'Invoice Settings' }).first(); await st.scrollIntoViewIfNeeded({ timeout: 4000 }); await glideTo(st); await st.click({ timeout: 3000 }); await page.waitForTimeout(1200); mark('settings'); await snap('settings');
    marks.selects = await page.evaluate(() => [...document.querySelectorAll('select')].map(s => [s.name, s.id, s.options.length, Math.round(s.getBoundingClientRect().y)]));
    const cur = page.locator('select:has(option[value="CAD"]), select:has(option:text-is("CAD"))').first();
    await cur.scrollIntoViewIfNeeded({ timeout: 3000 }); await glideTo(cur); await page.waitForTimeout(500);
    await cur.selectOption('CAD').catch(async () => { await cur.selectOption({ label: 'CAD' }); }); mark('currency'); } catch (e) { marks.cur_err = String(e).slice(0, 200); }
  await page.waitForTimeout(1500); await snap('currency');
  try { const tot = page.getByText('Balance Due').first(); await tot.scrollIntoViewIfNeeded({ timeout: 3000 }); await page.waitForTimeout(400); await glideTo(tot); mark('total'); } catch (e) { marks.tot_err = String(e).slice(0, 120); }
  await page.waitForTimeout(2200); await snap('total');
  try { const dl = page.getByRole('button', { name: 'Download' }).first(); await dl.scrollIntoViewIfNeeded({ timeout: 4000 }); await glideTo(dl); await page.waitForTimeout(700);
    const [d] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }).catch(() => null), dl.click({ timeout: 4000 })]);
    mark('download'); if (d) { marks.dl_name = d.suggestedFilename(); await d.saveAs(path.join(out, 'shot-invoice.pdf')).catch(() => {}); } } catch (e) { marks.dl_err = String(e).slice(0, 160); }
  await page.waitForTimeout(4000); await snap('after-download');
  await finish();
})();
