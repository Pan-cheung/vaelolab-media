import subprocess, json
R1='/home/claude/vaelolab-media/social/2026-11/raw/raw-ilovepdf.mp4'
R2='/home/claude/vaelolab-media/social/2026-11/raw/raw-ilovepdf2.mp4'
VO='/home/claude/vaelolab-media/social/2026-11/vo-ilovepdf-merge.mp3'
SEL='x=60:y=654:w=960:h=264'; MRG='x=282:y=1692:w=780:h=168'; DLB='x=36:y=432:w=1008:h=264'
LIM='x=228:y=866:w=480:h=184'; PRC='x=150:y=1680:w=520:h=200'
# (out_start, out_end, src, src_start, speed, boxes[(spec, t0, t1) in segment time])
segs=[(0,3.0,1,15.9,1,[]),
(3.0,8.4,1,10.4,1,[]),
(8.4,12.5,1,0.0,1.64/4.1,[(SEL,0,4.1)]),
(12.5,15.4,1,1.3,1,[(SEL,0,1.1)]),
(15.4,18.6,1,4.2,1,[]),
(18.6,20.3,0,10.3,1,[(MRG,0,1.7)]),
(20.3,23.6,0,16.9,1,[(DLB,1.2,3.3)]),
(23.6,25.9,0,20.2,1,[(DLB,0,2.3)]),
(25.9,28.0,1,25.0,1,[]),
(28.0,30.4,1,30.6,1,[]),
(30.4,34.4,1,33.3,1,[(LIM,0,4.0)]),
(34.4,37.0,1,37.3,1,[(PRC,0,2.6)]),
(37.0,38.2,0,33.0,1,[(PRC,0,1.2)]),
(38.2,41.0,1,7.4,1,[]),
(41.0,44.0,0,19.4,1,[(DLB,0,3.0)])]
src=[R1,R2]
lst=[]
for i,(a,b,s_,ss,sp,bx) in enumerate(segs):
    d=b-a; srcdur=d*sp
    f=f"setpts=(PTS-STARTPTS)/{sp:.4f},fps=30"
    for spec,t0,t1 in bx: f+=f",drawbox={spec}:color=0xEBD269@1:t=10:enable='between(t,{t0},{t1})'"
    f+=",setsar=1"
    o=f"seg{i:02d}.mp4"
    subprocess.run(['ffmpeg','-v','error','-y','-ss',f'{ss}','-t',f'{srcdur+0.2:.3f}','-i',src[s_],'-vf',f,'-t',f'{d:.3f}','-an','-c:v','libx264','-preset','veryfast','-crf','14','-r','30',o],check=True)
    lst.append(o)
open('segs.txt','w').write(''.join(f"file '{o}'\n" for o in lst))
subprocess.run(['ffmpeg','-v','error','-y','-f','concat','-i','segs.txt','-c','copy','body.mp4'],check=True)
dur=44.0+2.333
fc=f"[0:v]ass=reel.ass:fontsdir=/home/claude/w/fonts,setsar=1[m];[1:v]setsar=1,fps=30[o];[m][o]concat=n=2:v=1:a=0,fps=30,format=yuv420p[v];[2:a]apad=whole_dur={dur:.3f}[au]"
subprocess.run(['ffmpeg','-v','error','-y','-i','body.mp4','-i','outro.mp4','-i',VO,'-filter_complex',fc,'-map','[v]','-map','[au]','-t',f'{dur:.3f}','-c:v','libx264','-preset','veryfast','-crf','19','-r','30','-c:a','aac','-b:a','160k','-ar','44100','-movflags','+faststart','reel-ilovepdf-merge.mp4'],check=True)
