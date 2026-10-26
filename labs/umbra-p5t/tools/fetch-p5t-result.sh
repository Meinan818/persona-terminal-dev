#!/usr/bin/env bash
# r16：原版结算背景序列帧（Codex result/layout textures/battle_result：ResultBackManager/Canvas/flash_01–22 入场闪光、smoke_01–22 翻页烟雾）
#   → public/p5t-hud/result_seq/{flash,smoke}_NN.webp（960×540，私用不入库）
set -euo pipefail
cd "$(dirname "$0")/.."
SRC="${UMBRA_ASSETS:-/workspace/work/umbra-assets}/p5t/1_ui/result/layout/textures/battle_result/ui/2160p"
DST=public/p5t-hud/result_seq; mkdir -p "$DST"
python3 - "$SRC" "$DST" <<'PY'
import sys, os
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
src, dst = sys.argv[1:3]
for i in range(1, 23):
    for kind, f in (('flash', f'battle_result_flash_ui__result_flash_{i:02d}_ui.sprite.png'),
                    ('smoke', f'battle_result_smoke_0{3 if i <= 14 else 4}_ui__result_smoke_{i:02d}_ui.sprite.png')):
        if os.path.exists(f'{dst}/{kind}_{i:02d}.webp'): continue
        im = Image.open(os.path.join(src, f)).convert('RGBA'); im = im.resize((960, 540), Image.LANCZOS)
        im.save(f'{dst}/{kind}_{i:02d}.webp', 'WEBP', quality=80, method=6)
print('ok', len(os.listdir(dst)))
PY
