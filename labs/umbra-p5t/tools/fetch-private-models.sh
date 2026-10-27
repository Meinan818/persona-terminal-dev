#!/usr/bin/env bash
# 把私用角色模型（P5T 社区提取，仅限授权者本地私用，不入 git）拷到 public/models/private/。
# 源目录可用 UMBRA_ASSETS 覆盖；缺文件时游戏自动退回占位胶囊。
set -euo pipefail
cd "$(dirname "$0")/.."
SRC="${UMBRA_ASSETS:-/workspace/work/umbra-assets}/p5t/2_more/community/glb"
DST="public/models/private"
mkdir -p "$DST"
copy() { # 源文件名 目标文件名
  if [ -f "$SRC/$1" ]; then cp -f "$SRC/$1" "$DST/$2"; echo "ok   $2  <- $1"; else echo "miss $1（跳过，游戏用占位）"; fi
}
copy p5t_pc_joker_thief_PC0001_151_modhair.glb joker_thief.glb
copy p5t_switch_joker.glb joker_school.glb
# P5T 正版试点（Codex 从本机 P5T 提取，umbra-assets/p5t/1_battle/pilot）：Joker 战斗 Q 版 + 原版 14 个动作（Map_02100 评估后暂不接入，见 notes）
PILOT="${UMBRA_ASSETS:-/workspace/work/umbra-assets}/p5t/1_battle/pilot"
copyp() { if [ -f "$PILOT/$1" ]; then cp -f "$PILOT/$1" "$DST/$2"; echo "ok   $2  <- pilot/$1"; else echo "miss pilot/$1（跳过，回退旧模型/程序化）"; fi; }
copyp a_joker_qbattle/Joker_PC0001_151_battle.glb joker_pc0001_151.glb
# Joker 赛璐璐暗面贴图（GLB 里只嵌了 BaseMap）
mkdir -p "$DST/joker_pc0001_151"
for t in T_PC0001_C051_ShadeMap_High.png T_PC0001_H000_ShadeMap_High.png; do copyp "a_joker_qbattle/textures/$t" "joker_pc0001_151/$t"; done

# 正版战斗 HUD 贴图（同样不入库）
bash tools/fetch-p5t-hud.sh

# ---- P5T 正版 batch-02（Codex 提取，umbra-assets/p5t/1_battle/batch-02）：Skull / Mona / Em0001 敌兵 / Marie / Joker 20 动作 + 正版枪刀 ----
# 每个角色：GLB → public/models/private/p5t/<key>.glb；GLB 内嵌 BaseMap 对应的 ShadeMap（GLB 不含）→ p5t/<key>/ + shade.json（BaseMap 名 → ShadeMap 文件）
B2="${UMBRA_ASSETS:-/workspace/work/umbra-assets}/p5t/1_battle/batch-02"
# batch-03（10-26）：Panther/Fox/Queen/Erina、被洗脑 Panther/Fox、Em0001_016 狙击、Em0002_010 Grenadier、Em0003_010 Drummer、
#   Marie 正式 000 贴图修正版、Skull/Mona/Panther/Fox 枪+近战武器（路径以 ../batch-03/ 开头）
python3 - "$B2" "$DST/p5t" <<'PY'
import json, os, re, shutil, struct, sys
src, dst = sys.argv[1], sys.argv[2]
os.makedirs(dst, exist_ok=True)
CH = {  # key: (GLB 相对路径, 贴图目录)
  'joker': ('JokerAddendum/Joker_PC0001_151_battle.glb', 'JokerAddendum/textures'),
  'skull': ('Skull/Skull_PC0002_151_battle.glb', 'Skull/textures'),
  'mona': ('Mona/Mona_PC0003_151_battle.glb', 'Mona/textures'),
  'em0001_110': ('Em0001/Em0001_110_battle.glb', 'Em0001/textures'),
  'em0001_610': ('Em0001/Em0001_610_battle.glb', 'Em0001/textures'),
  'marie': ('Marie/Marie_Em0501_010_battle.glb', 'Marie/textures'),
  'wp_gn01000': ('JokerAddendum/weapons/Joker_Gn01000.glb', None),
  'wp_wp01900': ('JokerAddendum/weapons/Joker_Wp01900.glb', None),
  # ---- batch-03 ----
  'marie': ('../batch-03/marie_corrected/Marie_Em0501_010_corrected_battle.glb', '../batch-03/marie_corrected/textures'),
  'panther': ('../batch-03/characters/Panther/Panther_PC0004_151_battle.glb', '../batch-03/characters/Panther/textures'),
  'fox': ('../batch-03/characters/Fox/Fox_PC0005_151_battle.glb', '../batch-03/characters/Fox/textures'),
  'queen': ('../batch-03/party/Queen/Queen_PC0006_151_battle.glb', '../batch-03/party/Queen/textures'),
  'erina': ('../batch-03/party/Erina/Erina_PC0011_000_battle.glb', '../batch-03/party/Erina/textures'),
  'panther_bw': ('../batch-03/enemies/PantherBrainwashed/PantherBrainwashed_PC0004_053_battle.glb', '../batch-03/enemies/PantherBrainwashed/textures'),
  'fox_bw': ('../batch-03/enemies/FoxBrainwashed/FoxBrainwashed_PC0005_053_battle.glb', '../batch-03/enemies/FoxBrainwashed/textures'),
  'em0001_016': ('../batch-03/enemies/Em0001_016/Em0001_016_battle.glb', '../batch-03/enemies/Em0001_016/textures'),
  'em0002_010': ('../batch-03/enemies/Em0002_010/Em0002_010_battle.glb', '../batch-03/enemies/Em0002_010/textures'),
  'em0003_010': ('../batch-03/enemies/Em0003_010/Em0003_010_battle.glb', '../batch-03/enemies/Em0003_010/textures'),
  'wp_gn02000': ('../batch-03/weapons/Skull/Gn02000.glb', None),
  'wp_wp02900': ('../batch-03/weapons/Skull/Wp02900.glb', None),
  'wp_gn03000': ('../batch-03/weapons/Mona/Gn03000.glb', None),
  'wp_wp03900': ('../batch-03/weapons/Mona/Wp03900.glb', None),
  # umbra-assets cc1f631 已按 units.csv 纠正文件夹：Panther=04、Fox=05
  'wp_gn04000': ('../batch-03/characters/Panther/weapons/Panther_Gn04000.glb', None),
  'wp_wp04900': ('../batch-03/characters/Panther/weapons/Panther_Wp04900.glb', None),
  'wp_gn05000': ('../batch-03/characters/Fox/weapons/Fox_Gn05000.glb', None),
  'wp_wp05900': ('../batch-03/characters/Fox/weapons/Fox_Wp05900.glb', None),
  # r16c：Queen / Erina 正版武器（batch-07/weapons；units.csv 6051 GunId 6000 / SwordId 20601→6901，11000 GunId 11000 / SwordId 21101→11900）
  'wp_gn06000': ('../batch-07/weapons/Queen/Gn06000.glb', None),
  'wp_wp06901': ('../batch-07/weapons/Queen/Wp06901.glb', None),
  'wp_gn11000': ('../batch-07/weapons/Erina/Gn11000.glb', None),
  'wp_wp11900': ('../batch-07/weapons/Erina/Wp11900.glb', None),
}
strip = lambda n: re.sub(r'__-?\d+(?=\.png$)', '', re.sub(r'^[0-9a-f]{12}__', '', n))
for key, (glb, tex) in CH.items():
    p = os.path.join(src, glb)
    if not os.path.isfile(p): print(f'miss batch-02/{glb}（跳过，回退旧模型/程序化）'); continue
    shutil.copyfile(p, os.path.join(dst, key + '.glb')); print(f'ok   p5t/{key}.glb')
    if not tex: continue
    b = open(p, 'rb').read(); n = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20 + n])
    files = {strip(f): f for f in sorted(os.listdir(os.path.join(src, tex)))}
    od = os.path.join(dst, key); os.makedirs(od, exist_ok=True); m = {}; rt = {}
    for im in j.get('images', []):
        name = im.get('name') or ''
        # Marie：batch-02 GLB 绑的是 unit_10501011 的灰度版贴图（*011*，过场/石化用），同包里有 unit_10501000_common 的彩色正版贴图（*000*）→ 换成彩色
        if key == 'marie' and '011_' in name:
            col = re.sub(r'011_Base[Mm]ap', '000_BaseMap', name)
            if col in files:
                shutil.copyfile(os.path.join(src, tex, files[col]), os.path.join(od, col)); rt[name] = col; name = col
        want = re.sub(r'Base[Mm]ap', 'ShadeMap', name)
        if want not in files and want.replace('_High', '') in files: want = want.replace('_High', '')
        if want == name or want not in files: continue
        shutil.copyfile(os.path.join(src, tex, files[want]), os.path.join(od, want)); m[im.get('name')] = want
    json.dump(m, open(os.path.join(od, 'shade.json'), 'w'), indent=1); print(f'     {key}: {len(m)} ShadeMap')
    json.dump(rt, open(os.path.join(od, 'retex.json'), 'w'), indent=1)
    if rt: print(f'     {key}: 换彩色 BaseMap {len(rt)} 张')
PY
# r15：batch-08 全量战斗动作（Joker/Skull/Mona 的现有 GLB 只有 20 个 clip；batch-08 各约 80 个，骨骼同名同绑定）→ 瘦动作 GLB
B8="${UMBRA_ASSETS:-/workspace/work/umbra-assets}/p5t/1_battle/batch-08/anims"
for p in PC0001_151:joker PC0002_151:skull PC0003_151:mona; do
  if [ -f "$B8/${p%%:*}.glb" ]; then python3 tools/build-anim-glb.py "$B8/${p%%:*}.glb" "$DST/p5t/${p##*:}_anims.glb"; else echo "miss batch-08/${p%%:*}.glb（跳过，只用 20 个 clip）"; fi
done
bash tools/fetch-private-maps.sh

# ---- r17：batch-11 原版 weapon_motion（Codex R5：武器骨骼 + 原版 GunStart/Loop/Fire/End 等 clip）→ p5t/wpm_<gun>.glb ----
WM="${UMBRA_ASSETS:-/workspace/work/umbra-assets}/p5t/1_battle/batch-11/weapon_motion"
for g in gn01000 gn02000 gn03000 gn04000 gn05000 gn06000 gn11000; do
  G=$(echo "$g" | sed 's/^gn/Gn/')
  if [ -f "$WM/$G.glb" ]; then cp -f "$WM/$G.glb" "$DST/p5t/wpm_$g.glb"; echo "ok   p5t/wpm_$g.glb  <- batch-11/weapon_motion/$G.glb"; else echo "miss batch-11/weapon_motion/$G.glb"; fi
done
