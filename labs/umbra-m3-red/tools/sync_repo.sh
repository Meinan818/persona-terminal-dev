#!/bin/sh
# 把 m3 样板同步到仓库 worktree（feat/umbra-skin-p5r-red）的 labs/umbra-m3-red/；截图转 jpg；不带 node_modules/dist/png/work
set -e
SRC=/workspace/work/umbra-next/m3
DST=/workspace/work/repo-rw/wt-p5r-red/labs/umbra-m3-red
python3 - <<'PY'
import os, shutil
S='/workspace/work/umbra-next/m3'; D='/workspace/work/repo-rw/wt-p5r-red/labs/umbra-m3-red'
EX={'node_modules','dist','work','shots','shots2','shots4','shots5','audio-local'}
keep={'README.md','shots'}
for n in os.listdir(D):
    if n in keep: continue
    p=os.path.join(D,n); shutil.rmtree(p) if os.path.isdir(p) and not os.path.islink(p) else os.remove(p)
def ign(dirp, names):
    return [n for n in names if (dirp == S and n in EX) or n.endswith('.png') or n == 'serve.log' or n == 'node_modules']
for n in os.listdir(S):
    if n in EX: continue
    s=os.path.join(S,n); d=os.path.join(D,n)
    if os.path.islink(s): continue
    shutil.copytree(s,d,ignore=ign) if os.path.isdir(s) else shutil.copy2(s,d)
PY
mkdir -p "$DST/shots"
rm -f "$DST/shots/"*.jpg
python3 - <<'PY'
from PIL import Image
import glob, os
D='/workspace/work/repo-rw/wt-p5r-red/labs/umbra-m3-red/shots'
for d in ['/workspace/work/umbra-next/m3/shots', '/workspace/work/umbra-next/m3/shots2', '/workspace/work/umbra-next/m3/shots4', '/workspace/work/umbra-next/m3/shots5']:
    for f in sorted(glob.glob(d + '/*.png')):
        n = os.path.basename(f)[:-4]
        if d.endswith('shots2'): n = 'p2-' + n
        if d.endswith('shots4'): n = 'p4-' + n
        if d.endswith('shots5'): n = 'p5-' + n
        im = Image.open(f).convert('RGB')
        if im.width > 1600: im.thumbnail((1600, 1600))
        im.save(os.path.join(D, n + '.jpg'), quality=80)
PY
mkdir -p "$DST/shots/clips"; rm -f "$DST/shots/clips/"*.gif; cp -f $SRC/shots/clips/*.mp4 "$DST/shots/clips/" 2>/dev/null || true   # 仓库只放 mp4（gif 共 9 MB 留在本地）
du -sh "$DST"
