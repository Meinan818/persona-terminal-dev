#!/usr/bin/env bash
# r14：原版技能特效贴图 + 召唤 Persona（Codex batch-05 skills_arsene，私用不入库）
#   skills.csv UseEffect：Zio=[10300,30100]、Garu=[10300,30200]、Eiha=[10300,30000]（10300 = 共通召唤/命中层：Fire_5x2 蓝焰 + flash_tex00/01）
#   → public/p5t-fx/skill/*.webp（gitignore，最大 512）；Arsene_Ps1001_000.glb → public/p5t-fx/persona/arsene.glb
set -euo pipefail
cd "$(dirname "$0")/.."
SRC="${UMBRA_ASSETS:-/workspace/work/umbra-assets}/p5t/1_battle/batch-05/skills_arsene"
DST="public/p5t-fx/skill"; mkdir -p "$DST" public/p5t-fx/persona
python3 - "$SRC/vfx" "$DST" <<'PY'
import sys, glob, os
from PIL import Image
src, dst = sys.argv[1:3]
for f in sorted(glob.glob(f'{src}/*/textures/*.png')):
    grp = f.split('/')[-3]; n = os.path.basename(f).split('__')[1]
    o = f'{dst}/{grp}_{n}.webp'
    im = Image.open(f).convert('RGBA')
    if max(im.size) > 512: im.thumbnail((512, 512))
    im.save(o, 'WEBP', quality=90, method=6, exact=True)
    print('ok', o, im.size)
PY
cp -f "$SRC/Arsene/Arsene_Ps1001_000.glb" public/p5t-fx/persona/arsene.glb && echo ok arsene.glb
