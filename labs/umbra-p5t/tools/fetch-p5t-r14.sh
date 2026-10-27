#!/usr/bin/env bash
# r14：局内表现全部换原版（umbra-assets p5t/1_battle/field_fx + pilot/c_battle_hud + d_one_more_allout）→ public/p5t-fieldfx/ 与 public/p5t-hud/（gitignore，正版不入库）
set -euo pipefail
cd "$(dirname "$0")/.."
A="${UMBRA_ASSETS:-$(cd ../../.. && pwd)/umbra-assets}/p5t"
mkdir -p public/p5t-fieldfx public/p5t-hud
python3 - "$A" <<'PY'
import sys, json, glob, shutil
from PIL import Image
A = sys.argv[1]; F = f'{A}/1_battle/field_fx'; D = 'public/p5t-fieldfx'
def tex(sub, name): return glob.glob(f'{F}/{sub}/textures/*__{name}.png.png')[0]
# 整张贴图
for out, sub, name in [('stand', 'panel', 'cursor_new01_white'), ('cursor_red', 'panel', 'cursor_new02'), ('out_circle', 'panel', 'out_circle'),
                       ('trail_blue', 'shotline', 'Trail_Blue'), ('trail_red', 'shotline', 'Trail_Red'), ('trail_red_ol', 'shotline', 'Trail_Red_Outline'),
                       ('redline', 'shotline', 'SearchEnemy_RedLine'), ('hit_wall', 'shotline', 'shotline_hit_wall')]:
    Image.open(tex(sub, name)).convert('RGBA').save(f'{D}/{out}.png'); print(out)
# battle_panel 图集切片（sprites.csv rect，Unity y 自下而上）
rows = [l.split(',') for l in open(f'{F}/sprites.csv').read().splitlines()[1:]]
import csv
for atlas, pre in [('battle_panel.png', 'panel'), ('battle_panel_heal.png', 'panelh')]:
    im = Image.open(tex('panel', atlas[:-4])).convert('RGBA'); H = im.height
    for r in csv.reader(open(f'{F}/sprites.csv')):
        if len(r) < 5 or not r[2].endswith('/' + atlas): continue
        x, y, w, h = [float(v) for v in r[4].split(',')]
        im.crop((int(x), int(H - y - h), int(x + w), int(H - y))).save(f'{D}/{pre}_{r[3].split("_")[-1]}.png')
shutil.copy(f'{F}/meshes/guard_mesh.glb', f'{D}/guard_mesh.glb')
# HUD sprite（头顶心形 HP、CHANCE!!、GUARD 字牌、锁定框）→ p5t-hud + manifest
P = f'{A}/1_battle/pilot'; H = 'public/p5t-hud'
man = json.load(open(f'{H}/manifest.json'))
for out, name in [('chance', 'attack_CHANCE'), ('guard_word', 'attack_GUARD'), ('heart_ol', 'target_gage_black'), ('heart_red', 'target_gage_red'), ('heart_white', 'target_gage_white'), ('target_red', 'target_target_red'), ('target_wh', 'target_target'),
                  ('thorns1', 'bom04_icon_thorns_01'), ('thorns2', 'bom04_icon_thorns_02')]:
    f = sorted(glob.glob(f'{P}/*/sprites/*__{name}__*.png'))[0]
    im = Image.open(f).convert('RGBA'); im.save(f'{H}/{out}.png'); man[out] = {'w': im.width, 'h': im.height, 'src': f.split('/pilot/')[1]}; print(out, im.size)
json.dump(man, open(f'{H}/manifest.json', 'w'), ensure_ascii=False, indent=0)
PY
ls public/p5t-fieldfx
