import subprocess, json
# (src_start, src_end, mode) mode: full | zp (zoom photo) | zd (zoom dialog) | zh (zoom headline) | ad (ad callout)
segs = [
 (33.6, 35.8, 'zp'), (35.8, 38.0, 'zp2'),          # A hook 0-4.4
 (2.4, 4.4, 'zh'), (4.4, 6.6, 'full'),             # B 4.4-8.6
 (8.1, 10.2, 'full'),                              # C 8.6-10.7
 (10.2, 12.9, 'zs'),                            # D 10.7-13.4
 (21.4, 23.0, 'full'), (24.8, 26.3, 'full'),       # E 13.4-16.5
 (29.3, 31.5, 'full'), (31.5, 33.7, 'zp'),         # F 16.5-20.9
 (36.9, 38.8, 'full'),                             # G 20.9-22.8
 (41.0, 43.3, 'full'), (45.1, 47.0, 'full'),       # H 22.8-27.0
 (51.5, 53.5, 'zd'), (53.5, 55.5, 'full'),         # I 27.0-31.0
 (63.5, 66.9, 'full'),                             # J 31.0-34.4
 (66.9, 69.3, 'ad'), (26.1, 29.9, 'ad'),           # K 34.4-40.6
 (69.3, 72.3, 'zp'), (38.2, 39.9, 'zp2'),          # L 40.6-45.3
]
crops = {
 'zp': 'crop=600:1067:0:440', 'zp2': 'crop=520:924:20:510',
 'zh': 'crop=720:1280:180:0', 'zs': 'crop=760:1351:0:0', 'zd': 'crop=600:1067:480:150',
}
BLUR = "[{i}raw]split[{i}a][{i}b];[{i}b]crop=490:92:0:1798,boxblur=18:2[{i}bl];[{i}a][{i}bl]overlay=0:1798[{i}c]"
fc = []
n = len(segs)
fc.append(f"[0:v]split={n}" + ''.join(f"[v{i}]" for i in range(n)))
total = 0
for i, (a, b, m) in enumerate(segs):
    total += b - a
    pre = f"[v{i}]trim={a}:{b},setpts=PTS-STARTPTS,setsar=1[{i}raw]"
    fc.append(pre)
    fc.append(BLUR.format(i=i))
    if m in crops:
        fc.append(f"[{i}c]{crops[m]},scale=1080:1920:flags=lanczos,setsar=1[s{i}]")
    elif m == 'ad':
        fc.append(f"[{i}c]split[{i}d][{i}e];[{i}e]crop=490:92:0:1798,scale=980:184,drawbox=x=0:y=0:w=980:h=184:color=0xEBD269:t=10[{i}z];[{i}d][{i}z]overlay=50:880,setsar=1[s{i}]")
    else:
        fc.append(f"[{i}c]setsar=1[s{i}]")
fc.append(''.join(f"[s{i}]" for i in range(n)) + f"concat=n={n}:v=1:a=0,ass=reel.ass:fontsdir=fonts[m]")
fc.append("[1:v]setsar=1,fps=30[o];[m][o]concat=n=2:v=1:a=0,fps=30,format=yuv420p[v]")
dur = total + 2.7667
fc.append(f"[2:a]apad=whole_dur={dur:.3f}[au]")
print('main', round(total, 3), 'total', round(dur, 3))
subprocess.run(['ffmpeg','-v','error','-y','-i','pp.mp4','-i','outro.mp4','-i','vo.mp3','-filter_complex',';'.join(fc),'-map','[v]','-map','[au]','-c:v','libx264','-preset','veryfast','-crf','19','-r','30','-c:a','aac','-b:a','160k','-ar','44100','-movflags','+faststart','reel-photopea-text.mp4'], check=True)
