#!/usr/bin/env bash
# 把 P5T 正版战斗 HUD 贴图（Codex 从本机 P5T 提取，umbra-assets/p5t/1_battle/pilot/c_battle_hud + d_one_more_allout）
# 拷到 public/p5t-hud/（已 gitignore，正版贴图不入游戏 git），并写 manifest.json（短名 → 原始像素尺寸）。
# 游戏启动时读 manifest：有 → body.p5hud 用原版贴图；没有 / 缺某张 → 对应元素保持原来的 CSS 版。
# 源目录可用 UMBRA_ASSETS 覆盖。超过 2048px 宽的整屏帧（1 MORE 红色斜切 6 帧）按 1/2 缩小存（保持比例；CSS 按原尺寸摆放）。
set -euo pipefail
cd "$(dirname "$0")/.."
PILOT="${UMBRA_ASSETS:-/workspace/work/umbra-assets}/p5t/1_battle/pilot"
DST="public/p5t-hud"
rm -rf "$DST"; mkdir -p "$DST"
# 短名=目录:Sprite 原名（文件名形如 <bundle>__<原名>__<pathid>.png，取第一个匹配）
LIST='
turn_win=c_battle_hud/sprites:bom05_window_turn_01
turn_shadow=c_battle_hud/sprites:bom05_shadow_turn_01
enemy_win=c_battle_hud/sprites:bom05_window_enemy_01
enemy_shadow=c_battle_hud/sprites:bom05_shadow_enemy_01
enemy_win2=c_battle_hud/sprites:bom05_window_enemy_02
enemy_shadow2=c_battle_hud/sprites:bom05_shadow_enemy_02
flame_win2=c_battle_hud/sprites:bom05_window_flame_02
word_turn=c_battle_hud/sprites:bot02_cursor_on_turn_dialog
word_nokori=c_battle_hud/sprites:bot02_cursor_on_nokori_dialog
mission_win=c_battle_hud/sprites:bot_window_battle_mission_ui
icon_soldier=c_battle_hud/sprites:enemy_soldier
icon_boss=c_battle_hud/sprites:enemy_boss
gage_window=c_battle_hud/sprites:panel_gage_window
gage_slash=c_battle_hud/sprites:panel_gage_slash
gage_hp=c_battle_hud/sprites:panel_gage_HP
gage_sp=c_battle_hud/sprites:panel_gage_SP
turn_num_bg=c_battle_hud/sprites:bot02_cursor_on_white_02_ui
word_hp=c_battle_hud/sprites:bop01_panel_word_hp_dialog
word_sp=c_battle_hud/sprites:bop01_panel_word_sp_dialog
word_action=c_battle_hud/sprites:bop01_panel_word_action_dialog
word_1more=c_battle_hud/sprites:1more_icon
volt_base=c_battle_hud/sprites:bop01_p_gage_base_dialog
volt_empty=c_battle_hud/sprites:bop01_p_gage_b_yellow_ui
volt_fill=c_battle_hud/sprites:bop01_p_gage_y_star_ui
volt_glow=c_battle_hud/sprites:bop01_p_gage_max_blur_ui
volt_light=c_battle_hud/sprites:bop01_p_gage_light_ui
om_text=c_battle_hud/sprites:bot01_one_more_text_dialog
om_effect=c_battle_hud/sprites:bot01_one_more_text_effect
om_anime_1=c_battle_hud/sprites:bot01_one_more_anime_01
om_anime_2=c_battle_hud/sprites:bot01_one_more_anime_02
om_anime_3=c_battle_hud/sprites:bot01_one_more_anime_03
om_anime_4=c_battle_hud/sprites:bot01_one_more_anime_04
om_anime_5=c_battle_hud/sprites:bot01_one_more_anime_05
om_anime_6=c_battle_hud/sprites:bot01_one_more_anime_06
tri_go=c_battle_hud/sprites:bom04_tri_bang_le
tri_btn=c_battle_hud/sprites:bom02_tri_bang_le_dialog
down_d=c_battle_hud/sprites:bot01_down_d_dialog
down_o=c_battle_hud/sprites:bot01_down_o_dialog
down_w=c_battle_hud/sprites:bot01_down_w_dialog
down_n=c_battle_hud/sprites:bot01_down_n_dialog
down_d_sh=c_battle_hud/sprites:bot01_down_d_shadow_ui
down_o_sh=c_battle_hud/sprites:bot01_down_o_shadow_ui
down_w_sh=c_battle_hud/sprites:bot01_down_w_shadow_ui
down_n_sh=c_battle_hud/sprites:bot01_down_n_shadow_ui
block_b=c_battle_hud/sprites:bot01_block_b_dialog
block_l=c_battle_hud/sprites:bot01_block_l_dialog
block_o=c_battle_hud/sprites:bot01_block_o_dialog
block_c=c_battle_hud/sprites:bot01_block_c_dialog
block_k=c_battle_hud/sprites:bot01_block_k_dialog
target_kill=c_battle_hud/sprites:target_kill_red
allout_ba=d_one_more_allout/textures:allout_ba_zh-CN_01
allout_zu=d_one_more_allout/textures:allout_zu_zh-CN_01
obi_line=d_one_more_allout/textures:obi_line
'
for i in 0 1 2 3 4 5 6 7 8 9; do LIST="$LIST
num_$i=c_battle_hud/sprites:bot01_menu_battle_info_0${i}_ui"; done
for c in hero ryuji ann mona yusuke makoto haru akechi kasumi eru toshiro; do
  LIST="$LIST
party_$c=c_battle_hud/sprites:party_$c
dying_$c=c_battle_hud/sprites:dying_$c"
done
if ! [ -d "$PILOT" ]; then echo "miss $PILOT（跳过：HUD 保持 CSS 版）"; echo '{}' > "$DST/manifest.json"; exit 0; fi
python3 - "$PILOT" "$DST" "$LIST" <<'PY'
import sys, os, glob, json, shutil
pilot, dst, lst = sys.argv[1], sys.argv[2], sys.argv[3]
try:
    from PIL import Image
except Exception:
    Image = None
man, miss = {}, []
for line in lst.split('\n'):
    line = line.strip()
    if not line: continue
    short, spec = line.split('=', 1); d, name = spec.split(':', 1)
    hits = sorted(glob.glob(os.path.join(pilot, d, f'*__{name}__*.png')))
    if not hits: miss.append(name); continue
    src, out = hits[0], os.path.join(dst, short + '.png')
    if Image:
        im = Image.open(src); w, h = im.size
        if w > 2048: im.resize((w // 2, h // 2), Image.LANCZOS).save(out, optimize=True)
        else: shutil.copyfile(src, out)
    else:
        shutil.copyfile(src, out); w = h = 0
    man[short] = {'w': w, 'h': h, 'src': os.path.relpath(src, pilot)}
json.dump(man, open(os.path.join(dst, 'manifest.json'), 'w'), ensure_ascii=False, indent=0)
print(f'ok   {len(man)} 张 HUD 贴图 -> {dst}/' + (f'；缺 {len(miss)}：' + ', '.join(miss) if miss else ''))
PY

# r7：原版 TMP SDF 字体（umbra-assets p5t/1_ui/font_sdf_v2）：图集 + 字形表 + 材质（描边/膨胀参数），游戏里按 TMP 着色器公式自绘（src/ui/sdfFont.ts）
FONTS="${UMBRA_ASSETS:-/workspace/work/umbra-assets}/p5t/1_ui/font_sdf_v2"
for F in FOT_YURUKASTD_UB_SDF_BattleNumber2 FOT_YURUKASTD_UB_SDF NikkyouSans-mLKax_SDF; do
  if [ -f "$FONTS/$F/atlas.png" ]; then mkdir -p "$DST/font/$F"; cp -f "$FONTS/$F"/{atlas.png,glyphs.json,materials.json,summary.json} "$DST/font/$F/"; echo "ok   font/$F"; else echo "miss font/$F"; fi
done

# r12：原版指令/结算/技能列表立绘等（umbra-assets p5t/1_ui/image）
"$(dirname "$0")/fetch-p5t-ui.sh"
