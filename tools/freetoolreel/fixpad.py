import sys,subprocess,numpy as np
src,dst=sys.argv[1],sys.argv[2]
W,H=1080,1920
r=subprocess.Popen(['ffmpeg','-v','error','-i',src,'-f','rawvideo','-pix_fmt','rgb24','-'],stdout=subprocess.PIPE)
w=subprocess.Popen(['ffmpeg','-v','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r','30','-i','-','-c:v','libx264','-preset','veryfast','-crf','16','-pix_fmt','yuv420p',dst],stdin=subprocess.PIPE)
from PIL import Image
n=0;fixed=0
while True:
    b=r.stdout.read(W*H*3)
    if len(b)<W*H*3: break
    a=np.frombuffer(b,np.uint8).reshape(H,W,3)
    c=a[1860:1900,1020:1060].astype(int)
    if abs(c.mean()-128)<3 and c.std()<3:
        im=Image.fromarray(a[:1280,:720]).resize((W,H),Image.LANCZOS); a=np.asarray(im); fixed+=1
    w.stdin.write(a.tobytes()); n+=1
w.stdin.close(); w.wait(); print(n,fixed)
