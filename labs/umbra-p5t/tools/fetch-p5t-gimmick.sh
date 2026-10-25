#!/usr/bin/env bash
# r8：原版 P5T gimmick 掩体/炸弹桶/旗帜单位（Codex 515c714，umbra-assets p5t/1_battle/r7/cover_units/unit_*/unit_*.glb，私用不入库）
# → tools/build-orig-map.mjs（PREFAB_UNSCALE=1：去掉 FBX 多出来的 0.01 根缩放、删叠放的 LOD1/2）→ public/models/private/gimmick/（gitignore）
# 落点数据（StageSettingData.m_GimmickList，只是坐标/UnitId）由 tools/gen-gimmick-placements.py 生成到 src/view/gimmickData.ts（入库）。
set -euo pipefail
cd "$(dirname "$0")/.."
SRC="${UMBRA_ASSETS:-/workspace/work/umbra-assets}/p5t/1_battle/r7/cover_units"
DST="public/models/private/gimmick"
mkdir -p "$DST"
for d in "$SRC"/unit_*/; do
  u=$(basename "$d"); f="$d/$u.glb"; [ -f "$f" ] || { echo "miss $u"; continue; }
  if [ -f "$DST/$u.glb" ] && [ "$DST/$u.glb" -nt "$f" ] && [ "$DST/$u.glb" -nt tools/build-orig-map.mjs ]; then echo "keep $u"; continue; fi
  PREFAB_UNSCALE=1 node tools/build-orig-map.mjs "$f" "$DST/$u.glb" 512 2>/dev/null | grep '^{' || echo "FAIL $u"
done
ls -la "$DST"
