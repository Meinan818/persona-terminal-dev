#!/usr/bin/env bash
# r12：原版战斗 UI 贴图（Codex 900fb58：umbra-assets/p5t/1_ui/image/{battle/operation,result,analyse,skillcommand,turnTransition, common/ui}）
# 按 sprites.csv 找到每个 Sprite 的切图 → public/p5t-hud/<短名>.png（追加进 fetch-p5t-hud.sh 写的 manifest.json；正版贴图不入游戏 git）。
# 必须在 fetch-p5t-hud.sh 之后跑（fetch-p5t-hud.sh 末尾会自动调用本脚本）。2160p 切图宽 > 2048 的按 1/2 缩。
set -euo pipefail
cd "$(dirname "$0")/.."
IMG="${UMBRA_ASSETS:-/workspace/work/umbra-assets}/p5t/1_ui/image"
DST="public/p5t-hud"
[ -d "$IMG" ] || { echo "miss $IMG（跳过：指令/结算/立绘保持占位）"; exit 0; }
mkdir -p "$DST"; [ -f "$DST/manifest.json" ] || echo '{}' > "$DST/manifest.json"
python3 - "$IMG" "$DST" <<'PY'
import sys, os, csv, json
from PIL import Image
img, dst = sys.argv[1:3]
rows = list(csv.DictReader(open(os.path.join(img, 'sprites.csv'), encoding='utf-8-sig')))
def find(name, atlas=None):
    for r in rows:
        if r['sprite_name'] == name and (atlas is None or atlas in r['path']):
            p = r['path']; return os.path.join(img, os.path.dirname(p), os.path.basename(p)[:-4] + '__' + name + '.sprite.png')
    return None
MAP = {
  # 指令菜单（prefab_ui2d_battle_command/base_command：gun/persona/sword/arts 的 bg）
  'cmd_gun': 'bom01_gun_ui', 'cmd_persona': 'bom01_persona_ui', 'cmd_sword': 'bom01_sword_ui', 'cmd_arts': 'bom01_arts_ui',
  # 选目标准星（锯齿：predict_1719_5/2501_2；原版着色未导出，游戏里乘红）
  'thorns_fill': 'bom04_icon_thorns_01', 'thorns_line': 'bom04_icon_thorns_02',
  # 结算（prefab_ui2d_result_win：每块 = 红底 + 黑底两层，尺寸与 prefab 两个 *_base 节点 ×2 吻合）
  **{f'rs_black_{k}': f'brc_base_black_{k}' for k in ['money', 'exp', 'personaexp', 'item_small', 'item_big', 'turn', 'award']},
  **{f'rs_red_{k}': f'brc_base_red_{k}' for k in ['money', 'exp', 'personaexp', 'item_small', 'item_big', 'turn', 'award']},
  'rs_check': 'brc_award_check', 'rs_check_box': 'brc_award_check_box', 'rs_award_not': 'brc_award_not', 'rs_money_icon': 'brc_money_icon',
  'rs_lv_base': 'brc_kaitou_lv_gage_base', 'rs_lv_white': 'brc_kaitou_lv_gage_white', 'rs_hyphen': 'brc_hyphen_icon', 'rs_wound_a': 'brc_stage_clear_wound_a',
  # 技能列表（prefab_ui2d_skill_select：damage_window 234×64 / damage_icon 68×60 / hp_gauge 126×25 / sp_gauge 124×33 = 下列 2160p 切图的一半）
  'skl_damage_window': 'baw_damage_frame', 'skl_damage_icon': 'baw_analyze_damage_icon', 'skl_hp_gauge': 'bop01_panel_gage_hp_ui', 'skl_sp_gauge': 'bop01_panel_gage_sp_ui',
  # 技能属性签图标 icon_<BattleMenuIconType>：按 skills 表 label 对上 analyse/battle_situation_*（2 燃烧 3 冻结 4 疾风 5 绝望 6 触电 7 核热 8 念动 9 晕眩 10 遗忘；12/13 无 label，按用途推断 回复/辅助）
  'icon_2': 'battle_situation_burst', 'icon_3': 'battle_situation_frozen', 'icon_4': 'battle_situation_gale', 'icon_5': 'battle_situation_despair', 'icon_6': 'battle_situation_shock',
  'icon_7': 'battle_situation_nuclear', 'icon_8': 'battle_situation_telekinesis', 'icon_9': 'battle_situation_dizzy', 'icon_10': 'battle_situation_oblivion',
  'icon_12': 'battle_situation_recovery', 'icon_13': 'battle_situation_support',
}
# 技能列表左侧立绘：skillcommand/2160p/charadata_000XX051 normal（ID：01 Joker 02 Skull 03 Mona 04 Panther 05 Fox 06 Queen 07 Noir 09 Crow 10 Violet 11 Erina 21 Toshiro，按切图目视核对）
CH = {'hero': 1, 'ryuji': 2, 'mona': 3, 'ann': 4, 'yusuke': 5, 'makoto': 6, 'haru': 7, 'akechi': 9, 'kasumi': 10, 'eru': 11, 'toshiro': 21}
skc = os.path.join(img, 'battle', 'skillcommand', '2160p')
man = json.load(open(os.path.join(dst, 'manifest.json')))
ok, miss = 0, []
def put(short, src, rel):
    global ok
    im = Image.open(src); w, h = im.size
    out = os.path.join(dst, short + '.png')
    if w > 2048: im = im.resize((w // 2, h // 2), Image.LANCZOS)
    im.save(out, optimize=True); man[short] = {'w': w, 'h': h, 'src': rel}; ok += 1
for short, name in MAP.items():
    p = find(name)
    if not p or not os.path.exists(p): miss.append(name); continue
    put(short, p, os.path.relpath(p, img))
for pk, i in CH.items():
    cands = [f for f in os.listdir(skc) if f.startswith(f'charadata_{i:05d}') and f.endswith('__normal.sprite.png')]
    if not cands: miss.append(f'charadata_{i:05d}*normal'); continue
    put(f'chara_{pk}', os.path.join(skc, sorted(cands)[0]), 'battle/skillcommand/2160p/' + sorted(cands)[0])
json.dump(man, open(os.path.join(dst, 'manifest.json'), 'w'), ensure_ascii=False, indent=0)
print(f'ok   {ok} 张原版 UI 贴图 -> {dst}/' + (f'；缺 {len(miss)}：' + ', '.join(miss) if miss else ''))
PY
