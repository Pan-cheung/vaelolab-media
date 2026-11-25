import subprocess
K=1.05
def s(t): return round(t/K,3)
# captions (orig VO times) -> scaled
caps=[(0.0,"Your logo, sitting right in the middle of a QR code that costs you nothing."),
(5.39,"This is QRCode Monkey, and we didn't make an account."),
(9.45,"Paste the page you want people to land on."),
(11.82,"Open Set Colors and type your brand green."),
(14.90,"The whole code turns green."),
(16.89,"Under Add Logo Image, upload your logo."),
(19.94,"PNG, JPG, GIF or SVG, up to two megabytes."),
(25.32,"Drag the quality slider toward High."),
(27.73,"The site says that gives you a PNG with print quality."),
(31.27,"Click Create QR Code, then Download PNG."),
(35.16,"Scan the preview with your own phone before you print."),
(38.20,"The site says these static codes are free for commercial use, never expire, and have no scan limit."),
(44.54,"The catch: you can't change where it points once it's printed."),
(48.25,"Scan counts and editable codes live in their paid PRO version,"),
(52.05,"and an ad for it pops up after you download."),
(54.76,"Send this to the café owner printing new table cards for December.")]
VOEND=s(58.10); MAIN=round(VOEND+0.3,3)
def ts(t): return f"0:{int(t//60):02d}:{t%60:05.2f}"
hdr=open('/home/claude/vaelolab-media/social/2026-11/edits/invoice-generator.ass').read().split('[Events]')[0].replace(',90,90,860,1',',90,90,1180,1')
ev=[]
for i,(t,x) in enumerate(caps):
    a=s(t); b=s(caps[i+1][0]) if i+1<len(caps) else MAIN
    ev.append(f"Dialogue: 0,{ts(a)},{ts(b)},Cap,,0,0,0,,{x}")
ev.append(f"Dialogue: 1,{ts(0)},{ts(s(5.39))},Hook,,0,0,0,,Your logo QR code\\N{{\\c&H0069D2EB&}}free")
ev.append(f"Dialogue: 1,{ts(s(44.54))},{ts(s(48.25))},Lab,,0,0,0,,Can't edit it after printing")
ev.append(f"Dialogue: 1,{ts(s(52.05))},{ts(s(54.76))},Lab,,0,0,0,,Ad for their paid PRO version")
open('reel.ass','w').write(hdr+"[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"+"\n".join(ev)+"\n")
C={'F':None,'Q2':'crop=720:1280:180:0','Q3':'crop=540:960:270:60','Q':'crop=864:1536:108:0','L':'crop=864:1536:0:250','L2':'crop=720:1280:0:250','L3':'crop=720:1280:0:640',
'U':'crop=720:1280:0:150','U2':'crop=540:960:0:200','C':'crop=720:1280:0:250','S':'crop=864:1536:108:250','P':'crop=540:960:270:560','T1':'crop=864:1536:108:0',
'B':'crop=720:1280:180:450','N':'crop=720:1280:0:600','N2':'crop=540:960:0:880','AD':'AD'}
# (final start, final end, src start, mode)
segs=[(0.00,2.15,30.25,'Q2'),(2.15,3.60,22.45,'L'),(3.60,s(5.39),32.45,'Q'),
(s(5.39),6.70,10.60,'F'),(6.70,s(9.45),11.20,'U'),(s(9.45),s(11.82),12.10,'U2'),
(s(11.82),12.60,15.30,'F'),(12.60,s(14.90),18.70,'C'),(s(14.90),s(16.89),31.15,'Q3'),
(s(16.89),s(19.94),21.40,'L'),(s(19.94),21.00,24.30,'L3'),(21.00,s(25.32),25.00,'L2'),
(s(25.32),s(27.73),26.90,'S'),(s(27.73),27.70,29.30,'P'),(27.70,s(31.27),32.50,'Q2'),
(s(31.27),31.20,30.10,'T1'),(31.20,s(35.16),34.10,'B'),(s(35.16),34.95,32.60,'Q2'),(34.95,s(38.20),33.60,'Q3'),
(s(38.20),38.20,32.70,'N'),(38.20,40.20,33.90,'N2'),(40.20,s(44.54),33.50,'T1'),
(s(44.54),43.80,13.00,'U'),(43.80,s(48.25),14.40,'U2'),
(s(48.25),47.40,33.00,'N2'),(47.40,s(52.05),34.35,'B'),(s(52.05),50.90,36.60,'AD'),(50.90,s(54.76),38.00,'AD'),
(s(54.76),54.20,32.50,'Q'),(54.20,MAIN,33.00,'T1')]
n=len(segs);fc=[f"[0:v]split={n}"+''.join(f"[v{i}]" for i in range(n))]
for i,(a,b,src,m) in enumerate(segs):
    f=f"[v{i}]trim={src}:{src+b-a:.3f},setpts=PTS-STARTPTS"
    if m=='AD':
        fc.append(f+f"[w{i}]"); fc.append(f"[w{i}]split[x{i}][y{i}]")
        fc.append(f"[y{i}]crop=1080:860:0:580,boxblur=28:3[z{i}]")
        fc.append(f"[x{i}][z{i}]overlay=0:580,setsar=1[s{i}]"); continue
    f+=(","+C[m]+",scale=1080:1920:flags=lanczos" if C[m] else "")+",setsar=1"+f"[s{i}]"
    fc.append(f)
fc.append(''.join(f"[s{i}]" for i in range(n))+f"concat=n={n}:v=1:a=0,ass=reel.ass:fontsdir=fonts[m]")
fc.append("[1:v]setsar=1,fps=30[o];[m][o]concat=n=2:v=1:a=0,fps=30,format=yuv420p[v]")
dur=MAIN+2.6
fc.append(f"[2:a]atempo={K},adelay=50|50,apad=whole_dur={dur:.3f}[au]")
subprocess.run(['ffmpeg','-v','error','-y','-i','qr.mp4','-i','outro.mp4','-i','vo.mp3','-filter_complex',';'.join(fc),'-map','[v]','-map','[au]','-t',f'{dur:.3f}','-c:v','libx264','-preset','veryfast','-crf','19','-r','30','-c:a','aac','-b:a','160k','-ar','44100','-movflags','+faststart','reel-qrmonkey-logo.mp4'],check=True)
print(MAIN,dur)
for a,b,_,_ in segs:
    print(round(a,2),round(b-a,2)) if (b-a<1.5 or b-a>4) else None
print(max(b-a for a,b,_,_ in segs))
