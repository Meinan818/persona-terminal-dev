#!/usr/bin/env bash
# r16b：原版结算标题/印章（umbra-assets p5t/1_ui/result/titles/sprites，简中 2160p battle_result_clear_dialog 图集）
#   → public/p5t-hud/rst_<名>.png（追加 manifest.json；正版贴图不入游戏 git）。key_titles.csv：sprite 名为原版，界面用途按字样推断。
set -euo pipefail
cd "$(dirname "$0")/.."
SRC="${UMBRA_ASSETS:-/workspace/work/umbra-assets}/p5t/1_ui/result/titles/sprites"
DST=public/p5t-hud; mkdir -p "$DST"; [ -f "$DST/manifest.json" ] || echo '{}' > "$DST/manifest.json"
[ -d "$SRC" ] || { echo "miss $SRC"; exit 0; }
python3 - "$SRC" "$DST" <<'PY'
import sys, os, json
from PIL import Image
src, dst = sys.argv[1:3]
M = {'rst_money': 'brc_base_font_money', 'rst_exp': 'brc_base_font_exp', 'rst_personaexp': 'brc_base_red_personaexp', 'rst_item': 'brc_base_font_item',
     'rst_award': 'brc_base_font_award', 'rst_turn': 'brc_base_font_turn', 'rst_get': 'brc_get_font', 'rst_clear': 'brc_clear_font', 'rst_next': 'brc_next_page_icon',
     'rst_none': 'brc_item_none', 'rst_turn_icon': 'brc_turn_icon', 'rst_thieves': 'brc_phantom_thieves'}
man = json.load(open(os.path.join(dst, 'manifest.json')))
for short, n in M.items():
    f = os.path.join(src, f'battle_result_clear_dialog__{n}.sprite.png'); im = Image.open(f); w, h = im.size
    im.save(os.path.join(dst, short + '.png'), optimize=True); man[short] = {'w': w, 'h': h, 'src': 'result/titles/sprites/' + os.path.basename(f)}
json.dump(man, open(os.path.join(dst, 'manifest.json'), 'w'), ensure_ascii=False, indent=0)
print('ok', len(M))
PY
