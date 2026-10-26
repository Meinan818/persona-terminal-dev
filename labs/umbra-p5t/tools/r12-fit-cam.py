#!/usr/bin/env python3
"""r12：从原版帧 hud_idle_1212（战斗 1 开场待机，1280×720）反求原版常规战斗镜头。
已知 3D 点 = L01（原版 M01 StageSettingData）里的我方出生格 + 掩体格前沿（世界：x=格 x，z=格 y，地面 y=0，1 格=1m），
帧上像素为目测（脚底 / 掩体前沿底边中点），见 notes/P5T-R12-2026-10-26.md。最小二乘解 位置/方位/俯角/vFOV（滚转=0，主点=画面中心）。"""
import numpy as np
from scipy.optimize import least_squares
W,H=1280,720
pts=[ # (x, y, z_grid) -> (u,v)
 ((5,0,14),(632,585)),((4,0,14),(485,580)),((3,0,14),(345,590)),
 ((2,0,10.45),(352,395)),((4,0,10.45),(542,395)),((6,0,10.45),(737,395)),
 ((2.55,0,7.45),(450,315)),((5.45,0,7.45),(678,315)),
 ((1,0,5.45),(378,277)),((7,0,5.45),(770,278)),
 ((2,0,3.45),(465,252)),((6,0,3.45),(698,252)),
]
X=np.array([p[0] for p in pts],float); U=np.array([p[1] for p in pts],float)
def proj(p,X):
  cx,cy,cz,yaw,pitch,fov=p
  # 相机看向 -z 方向（朝小行号），yaw 绕 y，pitch 向下为正
  d=X-np.array([cx,cy,cz])
  cyw,syw=np.cos(yaw),np.sin(yaw); cp,sp=np.cos(pitch),np.sin(pitch)
  fwd=np.array([-syw*cp,-sp,-cyw*cp]); right=np.array([cyw,0,-syw]); up=np.cross(right,fwd)
  zc=d@fwd; xc=d@right; yc=d@up
  f=(H/2)/np.tan(np.radians(fov)/2)
  return np.stack([W/2+f*xc/zc, H/2-f*yc/zc],1)
def res(p): return (proj(p,X)-U).ravel()
best=None
for fov0 in (25,35,45,55):
  r=least_squares(res,[4.3,6,22,0,np.radians(30),fov0],bounds=([-5,1,14,-0.5,0.05,10],[14,30,60,0.5,1.4,90]))
  if best is None or r.cost<best.cost: best=r
p=best.x; e=np.abs(res(p)).reshape(-1,2)
cx,cy,cz,yaw,pitch,fov=p
print('pos',np.round(p[:3],2),'yaw°',round(np.degrees(yaw),2),'pitch°',round(np.degrees(pitch),2),'vFOV°',round(fov,2))
print('rms px',round(float(np.sqrt((e**2).mean())),2),'max',round(float(e.max()),1))
# 视线落地点与距离
fwd=np.array([-np.sin(yaw)*np.cos(pitch),-np.sin(pitch),-np.cos(yaw)*np.cos(pitch)])
t=cy/np.sin(pitch); look=np.array([cx,cy,cz])+fwd*t
print('look(ground)',np.round(look,2),'dist',round(float(t),2))
# 置信：fov 扫描
for fv in (20,30,40,50,60):
  r=least_squares(lambda q:res([*q,fv]),p[:5]); print(' fixed fov',fv,'rms',round(float(np.sqrt(np.mean(r.fun**2))),2),'pitch',round(np.degrees(r.x[4]),1),'h',round(r.x[1],2))
