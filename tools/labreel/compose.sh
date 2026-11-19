set -e
Z="crop=830:1476:125:CY,scale=1080:1920:flags=lanczos,setsar=1"
ffmpeg -v error -y -i raw-cloth.mp4 -ss 0.2 -i outro.mp4 -i vo.mp3 -filter_complex "
[0:v]split=5[s0][s1][s2][s3][s4];
[s0]trim=0:13.4,setpts=PTS-STARTPTS,setsar=1[a0];
[s1]trim=13.4:16.4,setpts=PTS-STARTPTS,${Z/CY/300}[a1];
[s2]trim=16.4:21.3,setpts=PTS-STARTPTS,setsar=1[a2];
[s3]trim=21.3:23.8,setpts=PTS-STARTPTS,${Z/CY/300}[a3];
[s4]trim=23.8,setpts=PTS-STARTPTS,setsar=1[a4];
[a0][a1][a2][a3][a4]concat=n=5:v=1:a=0,ass=cloth.ass:fontsdir=fonts[m];
[1:v]setsar=1[b];[m][b]concat=n=2:v=1:a=0,fps=30,format=yuv420p[v];[2:a]apad=whole_dur=28.9[au]" -map "[v]" -map "[au]" -c:v libx264 -preset veryfast -crf 19 -c:a aac -b:a 160k -ar 44100 -movflags +faststart reel-cloth-unveil-card.mp4
