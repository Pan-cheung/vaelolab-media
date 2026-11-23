import subprocess
C={'F':None,'I':'crop=960:1707:60:300','N':'crop=960:1707:60:900','S':'crop=960:1707:60:500','T':'crop=864:1536:216:0','A':'crop=720:1280:0:0','H':'crop=720:1280:0:300','C':'crop=720:1280:0:300'}
segs=[(0,2.70,21.2,'I'),(2.70,5.95,31.6,'T'),(5.95,8.37,4.0,'F'),(8.37,10.0,7.6,'F'),(10.0,11.87,11.3,'I'),(11.87,14.63,16.0,'I'),
(14.63,17.90,21.0,'F'),(17.90,20.06,26.4,'N'),(20.06,22.0,29.3,'F'),(22.0,23.98,31.3,'S'),(23.98,27.63,33.4,'T'),(27.63,30.07,37.6,'F'),
(30.07,32.89,56.0,'H'),(32.89,34.80,41.0,'A'),(34.80,36.79,43.0,'F'),(36.79,39.20,45.0,'A'),(39.20,41.69,47.5,'F'),(41.69,44.51,50.0,'C'),(44.51,48.20,17.5,'F')]
n=len(segs);fc=[f"[0:v]split={n}"+''.join(f"[v{i}]" for i in range(n))]
for i,(a,b,s,m) in enumerate(segs):
    f=f"[v{i}]trim={s}:{s+b-a},setpts=PTS-STARTPTS"
    f+=(","+C[m]+",scale=1080:1920:flags=lanczos" if C[m] else "")+f",setsar=1[s{i}]"
    fc.append(f)
fc.append(''.join(f"[s{i}]" for i in range(n))+f"concat=n={n}:v=1:a=0,ass=reel.ass:fontsdir=fonts[m]")
fc.append("[1:v]setsar=1,fps=30[o];[m][o]concat=n=2:v=1:a=0,fps=30,format=yuv420p[v]")
dur=48.20+2.70
fc.append(f"[2:a]adelay=50|50,apad=whole_dur={dur:.3f}[au]")
subprocess.run(['ffmpeg','-v','error','-y','-i','inv.mp4','-i','outro.mp4','-i','/home/claude/vaelolab-media/social/2026-11/vo-invoicegen.mp3','-filter_complex',';'.join(fc),'-map','[v]','-map','[au]','-t',f'{dur:.3f}','-c:v','libx264','-preset','veryfast','-crf','19','-r','30','-c:a','aac','-b:a','160k','-ar','44100','-movflags','+faststart','reel-invoice-generator.mp4'],check=True)
