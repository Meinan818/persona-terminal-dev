#!/usr/bin/env bash
# r7：原版 P5T 逐关场景（Codex 导出，umbra-assets/p5t/1_battle/batch-03/maps/Mxx/scene_map_*.glb，私用不入库）
# → tools/build-orig-map.mjs 压成手机版 → public/models/private/maps/Mxx.glb（gitignore）。
# 需要 GLTF_TOOLS 目录里装好 @gltf-transform/cli（默认 /workspace/work/gltf-tools）。缺文件时游戏回退 Kenney 布景。
set -euo pipefail
cd "$(dirname "$0")/.."
UA="${UMBRA_ASSETS:-/workspace/work/umbra-assets}/p5t/1_battle"
SRC="$UA/batch-03/maps"
DST="public/models/private/maps"
mkdir -p "$DST"
# L01=M01 L02=M02 L03=M03(与 M02 同一几何，共用 M02.glb) L04=M04 L05=M05 L06=M09 L07=M08 L08=M17 L09=M07（r8）；M06/M10 备用
for M in M01 M02 M04 M05 M06 M07 M08 M09 M10 M17; do
  f=$(ls "$SRC/$M"/scene_map_*.glb 2>/dev/null | head -1 || true)
  if [ -z "$f" ]; then echo "miss $M（跳过，该关回退 Kenney）"; continue; fi
  # r9：原版 lightmap（EXR → WebP，见 tools/conv-lightmap.py）；缺 python OpenEXR 时跳过 → 运行时回退环境光近似
  exr="$SRC/$M/lighting/Lightmap-0_comp_light.exr"
  if [ -f "$exr" ] && { [ ! -f "$DST/${M}_lm.webp" ] || [ "$exr" -nt "$DST/${M}_lm.webp" ]; }; then python3 tools/conv-lightmap.py "$exr" "$DST/${M}_lm.webp" "${LM_TEX:-1024}" || echo "lightmap FAIL $M"; fi
  if [ -f "$DST/$M.glb" ] && [ "$DST/$M.glb" -nt "$f" ] && [ "$DST/$M.glb" -nt tools/build-orig-map.mjs ] && [ "$DST/$M.glb" -nt tools/orig-lightmap-uv.mjs ]; then echo "keep $M.glb"; continue; fi
  # r9：原版 lightmap UV + 原版材质贴图槽（umbra-assets r7/lighting、r7/material_params）
  LM_DIR="$UA/r7/lighting/missions/$M" MAT_JSON="$UA/r7/material_params/missions/$M/materials.json" TEX_DIR="$SRC/$M/textures" \
    node tools/build-orig-map.mjs "$f" "$DST/$M.glb" "${MAP_TEX:-1024}" 2>/dev/null | grep '^{' || { echo "FAIL $M"; continue; }
done
ls -la "$DST"
