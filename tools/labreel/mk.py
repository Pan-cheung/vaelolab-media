import sys,json,subprocess
name,raw,vo,dur,zooms=sys.argv[1],sys.argv[2],sys.argv[3],float(sys.argv[4]),json.loads(sys.argv[5])
caps=json.loads(open(f'{name}.caps.json').read()); END=caps[-1][1]
def ts(t): return f"0:{int(t//60):02d}:{t%60:05.2f}"
hdr=open('cloth.ass').read().split('[Events]')[0]+"[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"
ev=[]
for i,(t,e,x) in enumerate(caps):
    e2=caps[i+1][0] if i+1<len(caps) else e
    ev.append(f"Dialogue: 0,{ts(t)},{ts(e2)},Cap,,0,0,0,,{x}")
open(f'{name}.ass','w').write(hdr+"\n".join(ev)+"\n")
# segments: zooms = [[start,end,cy],...]
segs=[];cur=0.0
for a,b,cy in zooms:
    segs.append((cur,a,None)); segs.append((a,b,cy)); cur=b
segs.append((cur,None,None))
n=len(segs); fc=f"[0:v]split={n}"+"".join(f"[s{i}]" for i in range(n))+";"
for i,(a,b,cy) in enumerate(segs):
    tr=f"trim={a}:{b}" if b else f"trim={a}"
    z=f",crop=830:1476:125:{cy},scale=1080:1920:flags=lanczos" if cy is not None else ""
    fc+=f"[s{i}]{tr},setpts=PTS-STARTPTS{z},setsar=1[a{i}];"
fc+="".join(f"[a{i}]" for i in range(n))+f"concat=n={n}:v=1:a=0,ass={name}.ass:fontsdir=fonts[m];[1:v]setsar=1[b];[m][b]concat=n=2:v=1:a=0,fps=30,format=yuv420p[v];[2:a]apad=whole_dur={dur+2.45}[au]"
subprocess.run(['ffmpeg','-v','error','-y','-i',raw,'-ss','0.2','-i','outro.mp4','-i',vo,'-filter_complex',fc,'-map','[v]','-map','[au]','-c:v','libx264','-preset','veryfast','-crf','19','-c:a','aac','-b:a','160k','-ar','44100','-movflags','+faststart',f'reel-{name}.mp4'],check=True)
print('ok')
