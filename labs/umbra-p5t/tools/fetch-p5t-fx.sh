#!/usr/bin/env bash
# r8：原版 P5T 物理命中特效贴图（Codex 3a56e5a，umbra-assets p5t/1_battle/r7/hit_effects/*/textures/*.png，私用不入库）
# → public/p5t-fx/hit/*.webp（gitignore；手机端：WebP 带 alpha，最大 512）。缺文件时游戏回退自制火花。
set -euo pipefail
cd "$(dirname "$0")/.."
SRC="${UMBRA_ASSETS:-$(cd ../../.. && pwd)/umbra-assets}/p5t/1_battle/r7/hit_effects"
DST="public/p5t-fx/hit"
mkdir -p "$DST"
python3 - "$SRC" "$DST" <<'PY'
import sys, glob, os
from PIL import Image
src, dst = sys.argv[1:3]
for f in sorted(glob.glob(f'{src}/*/textures/*.png')):
    n = os.path.splitext(os.path.basename(f))[0]
    o = f'{dst}/{n}.webp'
    if os.path.exists(o) and os.path.getmtime(o) > os.path.getmtime(f): print('keep', n); continue
    im = Image.open(f).convert('RGBA')
    if max(im.size) > 512: im.thumbnail((512, 512))
    im.save(o, 'WEBP', quality=90, method=6)
    print('ok', n, im.size, os.path.getsize(o))
PY
