#!/usr/bin/env bash
# r12：原版回合切换（YOUR TURN / ENEMY TURN）贴图——umbra-assets/p5t/1_ui/turn_transition/sprites（Codex 从本机 P5T 导出，正版不入游戏 git）
# 拷到 public/p5t-turn/<Sprite 名>.webp（已 gitignore）。缺目录时游戏回退旧 CSS 横幅。
set -euo pipefail
cd "$(dirname "$0")/.."
SRC="${UMBRA_ASSETS:-/workspace/work/umbra-assets}/p5t/1_ui/turn_transition/sprites"
DST="public/p5t-turn"
rm -rf "$DST"; mkdir -p "$DST"
python3 - "$SRC" "$DST" <<'PY'
import sys, os, re
from PIL import Image
src, dst = sys.argv[1:3]
want = ['YOUR_TURN_1','YOUR_TURN_2','YOUR_TURN_3','YOUR_TURN_4','YOUR_TURN_YOUR_TURN','YOUR_TURN_black_line','YOUR_TURN_joker','YOUR_TURN_shape','YOUR_TURN_yogoshi',
        'ENEMY_TURN_1','ENEMY_TURN_2','ENEMY_TURN_3','ENEMY_TURN_4','ENEMY_TURN_ENEMY','ENEMY_TURN_card','ENEMY_TURN_kuroobi','ENEMY_TURN_yogoshi','bg_sheet']
files = os.listdir(src)
for w in want:
    f = next((f for f in files if re.match(r'^[0-9a-f]+__' + re.escape(w) + r'__-?\d+\.png$', f)), None)
    if not f: print('缺', w); continue
    im = Image.open(os.path.join(src, f)); im.save(os.path.join(dst, w + '.webp'), 'WEBP', quality=88, method=6)
    print(w, im.size)
PY
du -sh "$DST"
