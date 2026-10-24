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
