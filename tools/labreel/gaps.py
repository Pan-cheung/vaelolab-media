import subprocess,numpy as np,sys
R=sys.argv[1]
raw=subprocess.run(['ffmpeg','-v','error','-i',R,'-vf','fps=10,scale=108:192,format=gray','-f','rawvideo','-'],capture_output=True).stdout
F=np.frombuffer(raw,np.uint8).reshape(-1,192,108).astype(float)
d=[np.abs(F[i]-F[i-1]).mean() for i in range(1,len(F))]
ev=[0]+[i/10 for i,x in enumerate(d,1) if x>0.3]+[len(F)/10]
print(R,'dur',len(F)/10,'gaps>1.5s',[(a,b,round(b-a,1)) for a,b in zip(ev,ev[1:]) if b-a>1.5])
print('first 3s diffs',[round(x,2) for x in d[:30:5]])
y=[f.mean() for f in F]; print('min/max luma',round(min(y)),round(max(y)))
