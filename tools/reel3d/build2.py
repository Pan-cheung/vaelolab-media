# Generic 3D Reel builder: three.js scene module + HTML overlay (hook, beat cards, word captions, send CTA, logo outro).
# Usage: python3 build2.py <config.json> [comma separated still times]
import json, os, re, shutil, subprocess, sys, struct
HERE = os.path.dirname(os.path.abspath(__file__))
SITE = '/home/claude/vaelolab'
W, H, FPS, OUTRO = 1080, 1920, 30, 2.4

cfg = json.load(open(sys.argv[1]))
ONLY = [float(x) for x in sys.argv[2].split(',')] if len(sys.argv) > 2 else None
TMP = '/tmp/reel-' + cfg['slug']
MP3, WORDS = cfg['mp3'], json.load(open(cfg['words']))
if cfg.get('text'):  # carry punctuation from the script onto the timed words
    toks = cfg['text'].split(); j = 0
    nt = lambda x: re.sub(r'[^a-z0-9]', '', x.lower())
    for w in WORDS:
        k = nt(w[2]); n = len(w[2].split()); jj = j
        while jj < len(toks) and nt(''.join(toks[jj:jj + n])) != k: jj += 1
        if jj < len(toks): w[2] = ' '.join(toks[jj:jj + n]); j = jj + n
vo = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', MP3], capture_output=True, text=True).stdout)
total = vo + OUTRO
norm = lambda w: re.sub(r'[^a-z0-9]', '', w.lower())


def at(phrase, after=0.0):
    """Start time of the first occurrence of phrase (word sequence) at or after time `after`."""
    p = [norm(x) for x in phrase.split()]
    ws = [norm(w[2]) for w in WORDS]
    for i in range(len(ws) - len(p) + 1):
        if WORDS[i][0] >= after - 1e-6 and ws[i:i + len(p)] == p:
            return WORDS[i][0]
    raise SystemExit('phrase not found: ' + phrase)


# resolve phrase references in the config into times
def resolve(o):
    if isinstance(o, dict):
        if set(o) == {'at'}:
            return at(o['at'])
        return {k: resolve(v) for k, v in o.items()}
    if isinstance(o, list):
        return [resolve(x) for x in o]
    if isinstance(o, str) and o.startswith('@'):
        return at(o[1:])
    return o


beats = resolve(cfg.get('beats', []))
for i, b in enumerate(beats):
    b.setdefault('t1', beats[i + 1]['t0'] if i + 1 < len(beats) else at(cfg['cta_at']))
cta_t = at(cfg['cta_at'])
scene_cfg = resolve(cfg.get('scene', {}))
scene_cfg.update({'cta': cta_t, 'vo': vo, 'total': total})

# loudness envelope per frame (drives pulses)
pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', MP3, '-ac', '1', '-ar', '12000', '-f', 's16le', '-'], capture_output=True).stdout
n = len(pcm) // 2; samples = struct.unpack('<%dh' % n, pcm); step = 12000 // FPS
amp = []
for i in range(0, n, step):
    seg = samples[i:i + step]
    amp.append(round((sum(x * x for x in seg) / max(1, len(seg))) ** .5 / 9000, 3))
scene_cfg['amp'] = amp

# caption groups: break on sentence punctuation or every 5 words
groups, cur = [], []
for w in WORDS:
    cur.append(w)
    if w[2][-1:] in '.?!,' or len(cur) >= 5:
        groups.append(cur); cur = []
if cur: groups.append(cur)
caps = [[g[0][0], g[-1][1], [[x[0], x[2]] for x in g]] for g in groups]


def logo_svg(cid):
    svg = open(os.path.join(SITE, 'logo-dark-animated.svg')).read()
    body = re.search(r'<defs>.*</g>', svg, re.S).group(0)
    body = body.replace('id="cap"', 'id="%s"' % cid).replace('url(#cap)', 'url(#%s)' % cid)
    body = body.replace('stroke="#1D1D1F"', 'stroke="currentColor"')
    body = re.sub(r'id="(v|a1|e1|e2|e3|l1|o|l2|a2|b)"', lambda m: 'data-k="%s"' % m.group(1), body)
    return '<svg class="logo" viewBox="0 0 802 112" xmlns="http://www.w3.org/2000/svg">%s</svg>' % body


font = 'file://' + SITE + '/fonts/jost-latin-wght-normal.woff2'
nm = 'file://' + HERE + '/node_modules/three/'
md = lambda s: re.sub(r'\*(.+?)\*', r'<b>\1</b>', s)
hook = md(cfg['hook'])
cta = md(cfg['cta'])
first_beat = beats[0]['t0'] if beats else cta_t

html = f'''<html><head><style>
@font-face{{font-family:J;src:url({font});font-weight:100 900}}
*{{box-sizing:border-box}}
body{{margin:0;width:{W}px;height:{H}px;overflow:hidden;position:relative;font-family:J;color:#f2f3ef;
background:radial-gradient(ellipse 85% 45% at 50% 55%,#2a5c3d 0%,#133621 55%,#0b2215 100%)}}
#gl{{position:absolute;inset:0;width:{W}px;height:{H}px}}
.logo{{display:block;width:100%;height:auto;overflow:visible}}.logo [data-k]{{stroke-dasharray:1 1}}
#bar{{position:absolute;left:0;top:0;height:10px;background:#f4d96c;width:0}}
.ov{{position:absolute;left:60px;right:60px;text-align:center}}
#hook{{top:230px;font-size:{cfg.get('hook_size', 120)}px;line-height:.98;font-weight:800;letter-spacing:-2.5px;text-shadow:0 6px 30px rgba(0,0,0,.4)}}
#hook b{{color:#f4d96c}}
#card{{top:230px;display:flex;flex-direction:column;align-items:center;gap:22px}}
#num{{width:96px;height:96px;border-radius:50%;background:#f4d96c;color:#101a14;font-weight:800;font-size:56px;display:flex;align-items:center;justify-content:center}}
#num:empty{{display:none}}
#q{{font-size:{cfg.get('q_size', 92)}px;font-weight:800;letter-spacing:-1.5px;line-height:1.0;text-shadow:0 6px 30px rgba(0,0,0,.35)}}
#a{{background:#f2f3ef;color:#133621;font-weight:800;font-size:60px;padding:14px 38px;border-radius:999px}}
#a:empty{{display:none}}
#cta{{top:230px;font-size:76px;font-weight:800;line-height:1.02;letter-spacing:-1.5px;text-shadow:0 6px 30px rgba(0,0,0,.4)}}#cta b{{color:#f4d96c}}
#capt{{position:absolute;left:60px;right:60px;top:1450px;text-align:center}}
#capt div{{display:inline-block;background:rgba(10,24,16,.74);border-radius:24px;padding:12px 28px;font-size:54px;font-weight:650;line-height:1.2}}
#capt span{{opacity:.32}}#capt span.on{{opacity:1}}
#outro{{position:absolute;inset:0;background:#133621;display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:0}}
#outro .lw{{width:760px;color:#f4d96c}}#outro p{{font-size:60px;font-weight:650;margin:70px 0 0;text-align:center;line-height:1.25}}#outro p b{{color:#f4d96c}}
{cfg.get('css', '')}
</style>
<script type="importmap">{{"imports":{{"three":"{nm}build/three.module.js","three/addons/":"{nm}examples/jsm/"}}}}</script>
</head><body>
<canvas id="gl" width="{W}" height="{H}"></canvas>
<div id="bar"></div>
{cfg.get('extra_html', '')}
<div class="ov" id="hook">{hook}</div>
<div class="ov" id="card"><div id="num"></div><div id="q"></div><div id="a"></div></div>
<div class="ov" id="cta">{cta}</div>
<div id="capt"></div>
<div id="outro"><div class="lw">{logo_svg('lg2')}</div><p>Follow <b>@vaelolab</b><br>Free guides to AI tools<br>for small business</p></div>
<script>
window.CFG={{scene:{json.dumps(scene_cfg)}}};
const CAPS={json.dumps(caps)},BEATS={json.dumps(beats)},VO={vo},TOTAL={total},CTA={cta_t},FIRST={first_beat};
const D={{v:0,a1:.08,e1:.16,e2:.21,e3:.26,l1:.32,o:.4,l2:.48,a2:.56,b:.64}};
const cl=x=>Math.max(0,Math.min(1,x)),ease=x=>x<.5?2*x*x:1-Math.pow(-2*x+2,2)/2;
const pop=x=>{{x=cl(x);const c1=1.7,c3=c1+1;return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2)}};
function logo(el,t){{el.querySelectorAll('[data-k]').forEach(p=>{{p.style.strokeDashoffset=1-ease(cl((t-D[p.dataset.k])/.7))}})}}
const $=id=>document.getElementById(id);
window.render=function(t){{
 window.render3d(t);
 if(window.renderExtra) window.renderExtra(t);
 $('bar').style.width=(100*t/TOTAL)+'%';
 const hk=$('hook'); hk.style.opacity=cl((FIRST-.05-t)/.2);
 hk.querySelectorAll('b').forEach(b=>{{b.style.display='inline-block';b.style.transform='scale('+(1+0.08*Math.sin(t*5)*cl(1-t/2.5))+')'}});
 let c=null; for(const x of BEATS) if(t>=x.t0-.05&&t<x.t1-.1) c=x;
 const cd=$('card');
 if(c){{cd.style.opacity=cl((t-c.t0+.05)/.15)*cl((c.t1-.1-t)/.15);
   $('num').textContent=c.n||''; $('num').style.transform='scale('+pop((t-c.t0)/.3)+')';
   $('q').innerHTML=c.q; $('q').style.transform='translateY('+(30*(1-ease(cl((t-c.t0)/.25))))+'px)';
   $('a').textContent=c.a||''; const ta=c.ta||c.t0; $('a').style.opacity=cl((t-ta)/.2); $('a').style.transform='scale('+(0.6+0.4*pop((t-ta)/.3))+')';
 }} else cd.style.opacity=0;
 $('cta').style.opacity=cl((t-CTA)/.25)*cl((VO+.1-t)/.2);
 $('cta').style.transform='scale('+(0.85+0.15*pop((t-CTA)/.35))+')';
 $('outro').style.opacity=cl((t-VO-.05)/.3); logo(document.querySelector('#outro .lw'),t-VO-.15);
 const cap=$('capt');let g=null;for(const q of CAPS) if(t>=q[0]-.05&&t<q[1]+.25) g=q;
 if(!g||t>=VO+.1){{cap.innerHTML='';return}}
 cap.innerHTML='<div>'+g[2].map(w=>'<span class="'+(t>=w[0]-.04?'on':'')+'">'+w[1]+'</span>').join(' ')+'</div>';
}};
</script>
<script type="module">
await document.fonts.load('700 64px J');
await import('{'file://' + HERE + '/' + cfg['scene_js']}');
</script>
</body></html>'''

shutil.rmtree(TMP, ignore_errors=True); os.makedirs(TMP + '/f')
open(TMP + '/p.html', 'w').write(html)
from playwright.sync_api import sync_playwright
times = ONLY if ONLY else [i / FPS for i in range(int(total * FPS))]
with sync_playwright() as p:
    br = p.chromium.launch(args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files'])
    pg = br.new_page(viewport={'width': W, 'height': H})
    pg.on('console', lambda m: print('console:', m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: print('pageerror:', e))
    pg.goto('file://' + TMP + '/p.html')
    pg.wait_for_function('window.ready3d===true', timeout=90000)
    for i, t in enumerate(times):
        pg.evaluate('t=>render(t)', t)
        pg.screenshot(path='%s/f/%05d.jpg' % (TMP, i), type='jpeg', quality=92)
    br.close()
if ONLY:
    from PIL import Image
    ims = [Image.open('%s/f/%05d.jpg' % (TMP, i)).resize((300, 533)) for i in range(len(times))]
    sheet = Image.new('RGB', (300 * len(ims), 533))
    for i, im in enumerate(ims): sheet.paste(im, (i * 300, 0))
    sheet.save('/tmp/sheet-%s.jpg' % cfg['slug']); print('/tmp/sheet-%s.jpg' % cfg['slug']); sys.exit()

# sound effects: whoosh on each beat and the CTA, chime on answers, thud at start
def sfx(kind):
    return {'whoosh': "anoisesrc=d=0.5:c=pink:a=0.45,bandpass=f=900:w=1400,afade=t=in:d=0.22,afade=t=out:st=0.22:d=0.28",
            'thud': "sine=f=70:d=0.35,volume=1.6,afade=t=out:st=0.05:d=0.3",
            'chime': "sine=f=1320:d=0.35,volume=0.22,afade=t=out:st=0.02:d=0.33"}[kind]
events = [(k, resolve(x) if isinstance(x, str) else x) for k, x in cfg.get('sfx', [])]
events += [('whoosh', b['t0'] - 0.12) for b in beats] + [('chime', b['ta']) for b in beats if b.get('ta')] + [('whoosh', cta_t - 0.1)]
inputs, fl = [], []
for i, (k, t0) in enumerate(events):
    inputs += ['-f', 'lavfi', '-i', sfx(k)]
    fl.append('[%d:a]aformat=sample_rates=24000:channel_layouts=mono,adelay=%d[s%d]' % (i + 2, max(0, int(t0 * 1000)), i))
mix = ';'.join(fl) + ';[1:a]aformat=sample_rates=24000:channel_layouts=mono[v];[v]' + ''.join('[s%d]' % i for i in range(len(events))) + \
      'amix=inputs=%d:duration=first:normalize=0,apad,alimiter=limit=0.95[a]' % (len(events) + 1)
out = cfg['out']
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', TMP + '/f/%05d.jpg', '-i', MP3] + inputs +
               ['-filter_complex', mix, '-map', '0:v', '-map', '[a]', '-t', '%.2f' % total,
                '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '19', '-pix_fmt', 'yuv420p', '-r', str(FPS),
                '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-movflags', '+faststart', out], check=True)
print(out, '%.1fs' % total)
