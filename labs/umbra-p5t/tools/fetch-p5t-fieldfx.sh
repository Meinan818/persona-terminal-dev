#!/usr/bin/env bash
# r13：原版场内表现贴图（umbra-assets p5t/1_battle/field_fx，Codex 5e007e5 导出）→ public/p5t-fieldfx/（gitignore，正版不入库）
set -euo pipefail
cd "$(dirname "$0")/.."
SRC="${UMBRA_ASSETS:-/workspace/work/umbra-assets}/p5t/1_battle/field_fx"
DST="public/p5t-fieldfx"; mkdir -p "$DST"
python3 - "$SRC" "$DST" <<'PY'
import sys
from PIL import Image
src, dst = sys.argv[1:3]
for n in ['red', 'yellow']:
    im = Image.open(f'{src}/cover_cursor/textures/battle__resident_resources_common__cover_cursor__Texture__menu_guard_icon_{n}.tga.png').convert('RGBA')
    im.resize((256, 256), Image.LANCZOS).save(f'{dst}/guard_icon_{n}.webp', 'WEBP', quality=90)
    print('guard', n)
PY
ls -la "$DST"
# r17：GUARD 目标脚下黄黑斜纹 = 原版 area_target/eff_011600 DangerZone（4 宫格图集，左上 = 黄框斜纹；o_guard 55.9s 核对；用途对应为推断）
DZ="$SRC/area_target/textures/effect__battle_versatile__eff_011600__Textures__DangerZone.png.png"
[ -f "$DZ" ] && cp -f "$DZ" "$DST/dangerzone.png" && echo "ok   dangerzone.png" || echo "miss DangerZone"
