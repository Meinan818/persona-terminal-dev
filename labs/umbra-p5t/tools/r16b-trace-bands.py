#!/usr/bin/env python3
"""r16b：从原版结算帧 result_1610/2606 描红带多边形 → src/view/data/result-bands.json（在仓库根运行）"""
import cv2, numpy as np, json
REF={1:'/workspace/work/notes/p5t-ref-video/frames/result_1610.png',2:'/workspace/work/notes/p5t-ref-video/frames/result_2606.png'}
def redmask(img):
    b,g,r=[img[...,i].astype(int) for i in range(3)]
    return ((r>170)&(g<70)&(b<80)).astype(np.uint8)
out={}
for pg,f in REF.items():
    im=cv2.imread(f); im=cv2.resize(im,(1280,720)); m=redmask(im)
    
    mc=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((15,15),np.uint8))
    mc=cv2.morphologyEx(mc,cv2.MORPH_OPEN,np.ones((9,9),np.uint8))
    # fill holes
    cs,h=cv2.findContours(mc,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_SIMPLE)
    polys=[]; fill=np.zeros_like(mc)
    for i,c in enumerate(cs):
        if h[0][i][3]!=-1: continue
        if cv2.contourArea(c)<400: continue
        x,y,w,h_=cv2.boundingRect(c)
        if x>2 and y>2 and x+w<1278 and y+h_<718 and cv2.contourArea(c)<8000: continue  # 不碰画面边的小红块（<8000px²）= 角色身上的红（手套/围巾）或面板红边，不是斜带
        a=cv2.approxPolyDP(c,5.0,True)
        polys.append(a.reshape(-1,2).tolist()); cv2.fillPoly(fill,[a],1)
    inter=(fill&m).sum(); uni=(fill|m).sum()
    print(pg,'polys',len(polys),'pts',sum(len(p) for p in polys),'IoU band-vs-refmask',round(inter/uni,3), 'ref red frac',round(m.mean(),3))
    cv2.imwrite(f'/tmp/r16b/fill{pg}.png',fill*255)
    out[pg]=polys
json.dump(out,open('src/view/data/result-bands.json','w'),separators=(',',':'))
