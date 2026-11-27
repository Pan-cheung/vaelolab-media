// Records ilovepdf.com Merge PDF at a phone sized viewport without an account (record.yml).
// Phone layout 360x640 CSS px at DPR 3; frames come from a CDP screencast so the clip is a sharp 1080x1920.
// The assembled screencast is written to raw.webm (mp4 content; ffmpeg probes it) so record.yml handles it as usual.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const out = process.argv[2] || 'rec-out';
fs.mkdirSync(path.join(out, 'frames'), { recursive: true });
const CURSOR = `
(() => {
  const add = () => {
    if (document.getElementById('rec-dot')) return;
    const d = document.createElement('div');
    d.id = 'rec-dot';
    d.style.cssText = 'position:fixed;z-index:2147483647;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;background:rgba(244,217,108,.95);box-shadow:0 0 0 3px rgba(19,54,33,.55);pointer-events:none;left:300px;top:560px;transition:transform .12s;';
    document.documentElement.appendChild(d);
    addEventListener('mousemove', e => { d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px'; }, true);
    addEventListener('mousedown', () => { d.style.transform = 'scale(.7)'; }, true);
    addEventListener('mouseup', () => { d.style.transform = 'scale(1)'; }, true);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
})();`;
const FILES = ['1-quote.pdf', '2-price-list.pdf', '3-terms.pdf'].map(f => path.resolve('tools/record/assets/pdf', f));

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, isMobile: true, hasTouch: false,
    recordVideo: { dir: path.join(out, 'pw'), size: { width: 360, height: 640 } }, locale: 'en-US', acceptDownloads: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36' });
  await ctx.addInitScript(CURSOR);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  const frames = []; let fi = 0;
  cdp.on('Page.screencastFrame', async ev => {
    const f = path.join(out, 'frames', `f${String(++fi).padStart(5, '0')}.jpg`);
    fs.writeFileSync(f, Buffer.from(ev.data, 'base64')); frames.push([f, ev.metadata.timestamp]);
    cdp.send('Page.screencastFrameAck', { sessionId: ev.sessionId }).catch(() => {});
  });
  const t0 = Date.now(); const marks = {};
  const mark = k => { marks[k] = +((Date.now() - t0) / 1000).toFixed(3); console.log(k, marks[k]); };
  let shot = 0;
  const snap = async k => { await page.screenshot({ path: path.join(out, `shot-${++shot}-${k}.png`) }).catch(() => {}); };
  let cx = 300, cy = 560;
  const glideTo = async (loc, steps = 20) => { const b = await loc.boundingBox().catch(() => null); if (!b) return null;
    const x = b.x + b.width / 2, y = b.y + b.height / 2; await page.mouse.move(x, y, { steps }); cx = x; cy = y; return b; };
  const tap = async (loc, k) => { try { await loc.scrollIntoViewIfNeeded({ timeout: 4000 }); await page.waitForTimeout(400); const b = await glideTo(loc); marks[k + '_box'] = b; await page.waitForTimeout(350); await loc.click({ timeout: 5000 }); mark(k); return true; } catch (e) { marks[k + '_err'] = String(e).slice(0, 200); return false; } };
  const sweep = async (loc, k) => { try { await loc.scrollIntoViewIfNeeded({ timeout: 4000 }); const b = await loc.boundingBox(); if (b) { marks[k + '_box'] = b; await page.mouse.move(b.x + 6, b.y + b.height / 2, { steps: 10 }); await page.mouse.move(b.x + b.width - 6, b.y + b.height / 2, { steps: 40 }); } mark(k); } catch (e) { marks[k + '_err'] = String(e).slice(0, 200); } };

  await page.goto('https://www.ilovepdf.com/merge_pdf', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(e => { marks.goto_err = String(e).slice(0, 200); });
  await page.waitForTimeout(5000);
  for (const t of ['Accept all', 'Accept', 'I agree', 'Agree', 'Got it', 'OK']) { await page.getByRole('button', { name: t, exact: true }).first().click({ timeout: 1000 }).catch(() => {}); }
  await page.waitForTimeout(1200); await snap('home');
  marks.home_text = (await page.evaluate(() => document.body.innerText).catch(() => '')).slice(0, 3000);
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 88, maxWidth: 1080, maxHeight: 1920, everyNthFrame: 1 });
  mark('start');
  await page.mouse.move(280, 520); await page.waitForTimeout(1200);
  const sel = page.locator('#pickfiles, a:has-text("Select PDF files"), button:has-text("Select PDF files")').first();
  const sb = await glideTo(sel, 24); marks.select_box = sb; await page.waitForTimeout(700);
  await page.mouse.down(); await page.waitForTimeout(90); await page.mouse.up();
  try { await page.locator('input[type=file]').first().setInputFiles(FILES); mark('files_set'); } catch (e) { marks.files_err = String(e).slice(0, 200); }
  await page.waitForTimeout(5500); await snap('uploaded'); mark('uploaded');
  // show the three files: slow scroll over the file list if it is taller than the screen
  try { const cards = page.locator('.file'); marks.cards = await cards.count(); if (marks.cards) { await glideTo(cards.nth(0), 16); await page.waitForTimeout(900); await glideTo(cards.nth(Math.min(2, marks.cards - 1)), 24); } } catch (e) { marks.cards_err = String(e).slice(0, 200); }
  await page.waitForTimeout(1500); await snap('files');
  marks.files_text = (await page.evaluate(() => document.body.innerText).catch(() => '')).slice(0, 3000);
  const merge = page.locator('#processTask, button:has-text("Merge PDF")').first();
  if (!(await merge.isVisible().catch(() => false))) {
    // mobile layout can hide the options panel behind a toggle
    await tap(page.locator('.option__toggle, #sidebarToggle, button:has-text("Options"), .tool__sidebar__toggle').first(), 'panel');
    await page.waitForTimeout(1200);
  }
  await tap(merge, 'merge');
  await page.waitForTimeout(7000); await snap('merged');
  marks.done_text = (await page.evaluate(() => document.body.innerText).catch(() => '')).slice(0, 3000);
  try { const dl = page.locator('#pickfiles, a:has-text("Download merged PDF"), a.downloader__btn').first(); await dl.scrollIntoViewIfNeeded({ timeout: 4000 });
    await glideTo(dl, 20); await page.waitForTimeout(500);
    const [d] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }).catch(() => null), dl.click({ timeout: 5000 })]);
    mark('download'); if (d) { marks.dl_name = d.suggestedFilename(); const p = path.join(out, 'merged.pdf'); await d.saveAs(p).catch(() => {}); try { marks.dl_bytes = fs.statSync(p).size; } catch (e) {} } } catch (e) { marks.dl_err = String(e).slice(0, 200); }
  await page.waitForTimeout(3500); await snap('after-download');
  // pricing page: the free plan limits for Merge PDF
  await page.goto('https://www.ilovepdf.com/pricing', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(e => { marks.pricing_err = String(e).slice(0, 200); });
  await page.waitForTimeout(4000); mark('pricing'); await snap('pricing');
  await sweep(page.getByText('Limited document processing', { exact: false }).first(), 'limited');
  await page.waitForTimeout(2500); await snap('limited');
  await sweep(page.getByText('Merge PDF', { exact: true }).last(), 'merge_row');
  await page.waitForTimeout(3000); await snap('merge-row');
  marks.pricing_text = (await page.evaluate(() => document.body.innerText).catch(() => '')).slice(0, 12000);
  await cdp.send('Page.stopScreencast').catch(() => {});
  mark('end');
  await page.screenshot({ path: path.join(out, 'last.png') });
  await ctx.close();
  // assemble the screencast frames by their real timestamps
  marks.frames = frames.length;
  let list = '';
  for (let i = 0; i < frames.length; i++) { const dur = i + 1 < frames.length ? Math.max(0.001, frames[i + 1][1] - frames[i][1]) : 1.0; list += `file '${path.resolve(frames[i][0])}'\nduration ${dur.toFixed(4)}\n`; }
  if (frames.length) list += `file '${path.resolve(frames[frames.length - 1][0])}'\n`;
  fs.writeFileSync(path.join(out, 'list.txt'), list);
  fs.writeFileSync(path.join(out, 'marks.json'), JSON.stringify(marks, null, 1));
  try { execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(out, 'list.txt'), '-vf', 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x808080,fps=30', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '14', '-pix_fmt', 'yuv420p', '-f', 'mp4', path.join(out, 'raw.webm')]); }
  catch (e) { const v = fs.readdirSync(path.join(out, 'pw')).filter(f => f.endsWith('.webm')); fs.renameSync(path.join(out, 'pw', v[0]), path.join(out, 'raw.webm')); }
  await browser.close();
})();
