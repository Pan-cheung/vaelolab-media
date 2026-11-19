import time,shutil,subprocess
from playwright.sync_api import sync_playwright
shutil.rmtree('/tmp/vout',ignore_errors=True)
with sync_playwright() as p:
    br=p.chromium.launch(); ctx=br.new_context(viewport={'width':1080,'height':1920},record_video_dir='/tmp/vout',record_video_size={'width':1080,'height':1920})
    pg=ctx.new_page(); t0=time.time()
    pg.set_content('<html><body style="margin:0;height:100vh;background:#f2f3ef;display:flex;align-items:center;justify-content:center"><img id=lg style="width:720px"></body></html>')
    pg.evaluate("()=>new Promise(r=>{const i=document.getElementById('lg');i.onload=r;i.src='http://localhost:8765/logo-dark-animated.svg?'+Date.now();})")
    s=time.time()-t0; time.sleep(2.8); e=time.time()-t0
    v=pg.video.path(); ctx.close(); br.close()
subprocess.run(['ffmpeg','-v','error','-y','-ss',str(max(s-0.03,0)),'-to',str(e),'-i',v,'-an','-r','30','-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt','yuv420p','outro.mp4'],check=True)
