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
# P5T 正版试点（Codex 从本机 P5T 提取，umbra-assets/p5t/1_battle/pilot）：Joker 战斗 Q 版 + 原版 14 个动作；Map_02100 城堡场景
PILOT="${UMBRA_ASSETS:-/workspace/work/umbra-assets}/p5t/1_battle/pilot"
copyp() { if [ -f "$PILOT/$1" ]; then cp -f "$PILOT/$1" "$DST/$2"; echo "ok   $2  <- pilot/$1"; else echo "miss pilot/$1（跳过，回退旧模型/程序化）"; fi; }
copyp a_joker_qbattle/Joker_PC0001_151_battle.glb joker_pc0001_151.glb
copyp b_map_02100/Map_02100_full.glb map_02100.glb
# Joker 赛璐璐暗面贴图（GLB 里只嵌了 BaseMap）
mkdir -p "$DST/joker_pc0001_151"
for t in T_PC0001_C051_ShadeMap_High.png T_PC0001_H000_ShadeMap_High.png; do copyp "a_joker_qbattle/textures/$t" "joker_pc0001_151/$t"; done
