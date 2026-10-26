import json,struct,glob,sys,os
def f32(u): return struct.unpack('<f',struct.pack('<I',u))[0]
def curves_of(b):
    n={1:3,2:4,3:3,4:3}
    if b['typeID']==4: return n[b['attribute']]
    return 1
def decode(path):
    d=json.load(open(path)); mc=d['m_MuscleClip']; c=mc['m_Clip']['data']
    labels=[]
    for b in d['m_ClipBindingConstant']['genericBindings']:
        k=curves_of(b); nm={1:'pos',2:'rot',3:'scl',4:'eul'}.get(b['attribute'],'f%d'%b['attribute']) if b['typeID']==4 else ('fov' if b['typeID']==20 else 'custom%d'%b['typeID'])
        for i in range(k): labels.append('%d.%s%d'%(b['path'],nm,i))
    sd=c['m_StreamedClip']['data']; sc=c['m_StreamedClip']['curveCount']
    # parse frames
    frames=[]; i=0
    while i<len(sd):
        t=f32(sd[i]); nk=sd[i+1]; i+=2; keys=[]
        for _ in range(nk):
            idx=sd[i]; co=[f32(x) for x in sd[i+1:i+5]]; i+=5; keys.append((idx,co))
        frames.append((t,keys))
    # build per-curve key lists (time, value=co[3])
    per={}
    for t,keys in frames:
        for idx,co in keys:
            per.setdefault(idx,[]).append((t,co))
    dense=c['m_DenseClip']; dc=dense['m_CurveCount']
    const=c['m_ConstantClip']['data']
    out={'name':d['m_Name'],'stop':mc['m_StopTime'],'curves':{}}
    def sample(keys,t):
        # unity hermite stored as cubic coeffs relative to key time: v = ((a*dt+b)*dt+c)*dt+d
        prev=None
        for kt,co in keys:
            if kt<=t: prev=(kt,co)
        if prev is None: prev=keys[0]
        kt,co=prev; dt=max(0,t-kt)
        a,b,cc,dd=co; return ((a*dt+b)*dt+cc)*dt+dd
    for ci in range(sc):
        ks=[k for k in per.get(ci,[]) if k[0]>-1e30 and k[0]<1e30]
        out['curves'][labels[ci]]=[(round(t,3),round(sample(ks,t),4)) for t in [x*mc['m_StopTime']/10 for x in range(11)]] if ks else None
    for j,v in enumerate(const):
        out['curves'][labels[sc+dc+j]]=round(v,4)
    return out
if __name__=='__main__':
    for p in sorted(glob.glob(sys.argv[1])):
        o=decode(p); print('==',o['name'],o['stop'])
        for k,v in o['curves'].items(): print('  ',k,v)
