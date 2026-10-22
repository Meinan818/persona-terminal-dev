#!/bin/sh
# m4 → 仓库 worktree（feat/umbra-skin-p5r-red）labs/umbra-m4-red/；截图转 jpg；不带 node_modules/dist/work/png/音频
set -e
python3 - <<'PY'
import os, shutil, glob
from PIL import Image
S='/workspace/work/umbra-next/m4'; D='/workspace/work/repo-rw/wt-p5r-red/labs/umbra-m4-red'
os.makedirs(D, exist_ok=True)
EX={'node_modules','dist','work','audio-local','shots-m4'}
for n in os.listdir(D):
    if n in ('shots',): continue
    p=os.path.join(D,n); shutil.rmtree(p) if os.path.isdir(p) and not os.path.islink(p) else os.remove(p)
def ign(dirp, names): return [n for n in names if (dirp == S and n in EX) or n.endswith('.png') or n.endswith('.log') or n=='node_modules' or n=='__pycache__']
for n in os.listdir(S):
    if n in EX or n.startswith('shots'): continue
    s=os.path.join(S,n); d=os.path.join(D,n)
    if os.path.islink(s): continue
    shutil.copytree(s,d,ignore=ign) if os.path.isdir(s) else shutil.copy2(s,d)
os.makedirs(D+'/shots', exist_ok=True)
for f in glob.glob(D+'/shots/*.jpg'): os.remove(f)
for f in sorted(glob.glob(S+'/shots-m4/*.png')):
    im=Image.open(f).convert('RGB')
    if im.width>1600: im.thumbnail((1600,1600))
    im.save(D+'/shots/'+os.path.basename(f)[:-4]+'.jpg', quality=80)
PY
du -sh /workspace/work/repo-rw/wt-p5r-red/labs/umbra-m4-red
