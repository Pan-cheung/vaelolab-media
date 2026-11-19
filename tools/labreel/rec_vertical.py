# Vertical 1080x1920 Lab demo recorder: hook on green stage + live demo, no outro.
import os, re, sys, time, json, shutil, subprocess
from playwright.sync_api import sync_playwright
REPO="/home/claude/w/vaelolab"
src=open(f"{REPO}/_build/record_lab_demo.py").read()
ns={}
head=src.split("if SLUG == 'cat-ear-card':")[0]
sys_argv=sys.argv; sys.argv=["x","none","/dev/null"]; exec(head,ns); sys.argv=sys_argv
ISOLATE=ns["ISOLATE"].replace("(1080*0.86/460)","(1080*"+os.environ.get("ZOOM","0.64")+"/460)")
W,H=1080,1920; BASE="http://localhost:8765"
slug,hook,out=sys.argv[1],sys.argv[2],sys.argv[3]
def hook_html(h):
    parts=re.split(r"\*(.+?)\*",h); o=[]
    for i,p in enumerate(parts): o.append(f'<span style="color:#EBD269">{p}</span>' if i%2 else p)
    return "".join(o)
ADD_HOOK="""(html)=>{const f=new FontFace('JostR','url(/fonts/jost-latin-wght-normal.woff2)',{weight:'100 900'});
return f.load().then(ff=>{document.fonts.add(ff);const wrap=document.getElementById('rec-wrap');
wrap.style.flexDirection='column';wrap.style.justifyContent='flex-start';wrap.style.paddingTop='340px';
const h=document.createElement('div');h.id='rec-hook';h.innerHTML=html;
h.style.cssText='font-family:JostR,sans-serif;font-weight:700;font-size:82px;line-height:1.06;color:#F2F3EF;text-align:center;max-width:940px;margin:0 auto 60px;text-wrap:balance;';
wrap.insertBefore(h,wrap.firstChild);return true;});}"""
def center(page,sel,nth=0):
    b=page.locator(sel).nth(nth).bounding_box(); return b['x']+b['width']/2,b['y']+b['height']/2,b
def glide(page,x0,y0,x1,y1,steps=30,pause=0.012):
    for i in range(1,steps+1):
        t=i/steps; page.mouse.move(x0+(x1-x0)*t,y0+(y1-y0)*t); time.sleep(pause)
marks={}
def mark(k,t0): marks[k]=round(time.time()-t0,3)
def run_cloth(page,t0):
    T=time.time()
    def at(t):
        d=t-(time.time()-T)
        if d>0: time.sleep(d)
    _,_,b=center(page,'.cu-cover')
    x=b['x']+b['width']*0.4; y=b['y']+b['height']*0.85; hh=b['height']
    page.mouse.move(x,y); page.mouse.down(); mark('grab',t0)
    glide(page,x,y,x+10,y-hh*0.22,16,0.02); at(1.6); page.mouse.up()
    at(3.0); page.mouse.move(x,y); page.mouse.down(); glide(page,x,y,x+15,y-hh*0.25,30,0.03)
    at(5.9); page.mouse.up(); mark('drop',t0)
    at(8.7); page.mouse.move(x,y); page.mouse.down(); mark('pull',t0)
    glide(page,x,y,x+30,y-hh*0.6,30,0.025); page.mouse.up(); mark('reveal',t0)
    px,py,_=center(page,'.cu-price'); tx,ty,_=center(page,'.cu-title')
    at(11.9); glide(page,x+30,y-hh*0.6,tx,ty,20,0.03); at(13.6); glide(page,tx,ty,px,py,20,0.03)
    ax,ay,_=center(page,'.cu-again'); at(15.4); glide(page,px,py,ax,ay,20,0.02)
    at(16.4); page.mouse.down(); time.sleep(0.06); page.mouse.up(); mark('again',t0)
    _,_,b2=center(page,'.cu-cover'); cx2,cy2=b2['x']+b2['width']*0.5,b2['y']+b2['height']*0.6
    glide(page,ax,ay,cx2,cy2,16,0.02)
    at(17.3); page.mouse.down(); time.sleep(0.06); page.mouse.up(); mark('tap',t0)
    at(20.0); bx,by,_=center(page,'.cu-cta'); glide(page,cx2,cy2,bx,by,20,0.025)
    at(21.0); page.mouse.down(); time.sleep(0.08); page.mouse.up(); mark('cta',t0)
    at(23.8); glide(page,bx,by,bx+120,by+180,25,0.03)
    at(26.4)
def run_stubborn(page,t0):
    T=time.time()
    def at(t):
        d=t-(time.time()-T)
        if d>0: time.sleep(d)
    tr=page.locator('.ss-track').bounding_box(); y=tr['y']+tr['height']/2
    def X(f): return tr['x']+tr['width']*f
    x,_,_=center(page,'.ss-thumb')
    def th(): return center(page,'.ss-thumb')[0]
    page.mouse.move(x,y); page.mouse.down(); mark('grab',t0)
    glide(page,x,y,X(0.62),y,16,0.02); glide(page,X(0.62),y,X(1.05),y,20,0.04)
    at(3.5); page.mouse.up()
    at(4.0); x=th(); page.mouse.move(x,y); page.mouse.down(); glide(page,x,y,X(1.1),y,40,0.05)
    at(7.6); page.mouse.up(); mark('spring',t0)
    at(10.4); x=th(); page.mouse.move(x,y); page.mouse.down(); glide(page,x,y,X(0.25),y,20,0.03); page.mouse.up()
    at(13.2); x=th(); page.mouse.move(x,y); page.mouse.down(); glide(page,x,y,X(1.08),y,30,0.04)
    at(15.6); page.mouse.up()
    at(16.6); x=th(); page.mouse.move(x,y); page.mouse.down(); glide(page,x,y,X(0.45),y,20,0.03); page.mouse.up()
    glide(page,X(0.45),y,X(0.45)+80,y+200,20,0.03)
    at(20.3)
def run_eject(page,t0):
    T=time.time()
    def at(t):
        d=t-(time.time()-T)
        if d>0: time.sleep(d)
    ix,iy,_=center(page,'.ej-input'); cx,cy,_=center(page,'.ej-clear')
    page.mouse.move(ix-120,iy+160); glide(page,ix-120,iy+160,cx,cy,20,0.02)
    at(0.9); page.mouse.down(); time.sleep(0.06); page.mouse.up(); mark('eject',t0)
    at(1.7); page.keyboard.type('noodle',delay=120)
    at(3.4); page.mouse.move(cx,cy)
    at(4.2); page.mouse.down(); time.sleep(0.06); page.mouse.up()
    at(5.8); page.keyboard.type('soup',delay=120)
    at(7.6); page.mouse.down(); time.sleep(0.06); page.mouse.up()
    at(10.4); page.keyboard.type('dumplings',delay=160)
    at(13.8); page.keyboard.press('Escape'); mark('esc',t0)
    at(15.4); page.keyboard.type('salad',delay=140)
    at(17.6); page.mouse.down(); time.sleep(0.06); page.mouse.up()
    at(18.9); page.keyboard.type('rice',delay=150)
    glide(page,cx,cy,cx-200,cy+300,20,0.03)
    at(21.95)
RUN={'cloth-unveil-card':run_cloth,'stubborn-slider':run_stubborn,'eject-clear-input':run_eject}
tmp=f"/tmp/vrec/{slug}"; shutil.rmtree(tmp,ignore_errors=True)
with sync_playwright() as p:
    br=p.chromium.launch(args=["--no-sandbox"])
    ctx=br.new_context(viewport={'width':W,'height':H},record_video_dir=tmp,record_video_size={'width':W,'height':H},color_scheme='light')
    page=ctx.new_page(); t0=time.time()
    errs=[]; page.on('pageerror',lambda e: errs.append(str(e)))
    page.goto(f"{BASE}/lab/{slug}.html",wait_until='networkidle')
    page.evaluate(ISOLATE); page.evaluate(ADD_HOOK,hook_html(hook))
    if slug=='eject-clear-input':
        page.evaluate("()=>{const i=document.querySelector('.ej-input');}")
    time.sleep(1.0); mark('start',t0)
    RUN[slug](page,t0); mark('end',t0)
    vid=page.video.path(); ctx.close(); br.close()
print('errors',errs)
s=marks['start']-0.05
subprocess.run(['ffmpeg','-v','error','-y','-ss',str(s),'-to',str(marks['end']),'-i',vid,'-an','-r','30','-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt','yuv420p',out],check=True)
rel={k:round(v-s,2) for k,v in marks.items()}
json.dump(rel,open(out+'.marks.json','w')); print(rel)
