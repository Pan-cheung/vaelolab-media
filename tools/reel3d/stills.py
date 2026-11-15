import json,re,sys,subprocess
cfg=json.load(open('cfg-%s.json'%sys.argv[1])); W=json.load(open(cfg['words']))
norm=lambda w: re.sub(r'[^a-z0-9]','',w.lower())
def at(p):
    p=[norm(x) for x in p.split()]; ws=[norm(w[2]) for w in W]
    for i in range(len(ws)-len(p)+1):
        if ws[i:i+len(p)]==p: return W[i][0]
    raise SystemExit('missing '+' '.join(p))
ts=[0.0]+[round(at(b['ta'][1:] if 'ta' in b else b['t0'][1:])+0.6,2) for b in cfg['beats']]+[round(at('Send this')+0.8,2)]
print(ts)
subprocess.run(['python3','build2.py','cfg-%s.json'%sys.argv[1],','.join(map(str,ts))])
