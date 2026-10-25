#!/usr/bin/env bash
# r7：原版 P5T 逐关场景（Codex 导出，umbra-assets/p5t/1_battle/batch-03/maps/Mxx/scene_map_*.glb，私用不入库）
# → tools/build-orig-map.mjs 压成手机版 → public/models/private/maps/Mxx.glb（gitignore）。
# 需要 GLTF_TOOLS 目录里装好 @gltf-transform/cli（默认 /workspace/work/gltf-tools）。缺文件时游戏回退 Kenney 布景。
set -euo pipefail
cd "$(dirname "$0")/.."
SRC="${UMBRA_ASSETS:-/workspace/work/umbra-assets}/p5t/1_battle/batch-03/maps"
DST="public/models/private/maps"
mkdir -p "$DST"
# L01=M01 L02=M02 L03=M03(与 M02 同一几何，共用 M02.glb) L04=M04 L05=M05 L06=M09 L08=M17；M06/M07/M08/M10 备用
for M in M01 M02 M04 M05 M06 M07 M08 M09 M10 M17; do
  f=$(ls "$SRC/$M"/scene_map_*.glb 2>/dev/null | head -1 || true)
  if [ -z "$f" ]; then echo "miss $M（跳过，该关回退 Kenney）"; continue; fi
  if [ -f "$DST/$M.glb" ] && [ "$DST/$M.glb" -nt "$f" ] && [ "$DST/$M.glb" -nt tools/build-orig-map.mjs ]; then echo "keep $M.glb"; continue; fi
  node tools/build-orig-map.mjs "$f" "$DST/$M.glb" "${MAP_TEX:-1024}" 2>/dev/null | grep '^{' || { echo "FAIL $M"; continue; }
done
ls -la "$DST"
