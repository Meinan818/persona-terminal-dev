#!/bin/sh
# M5 终验：重建 → 商店/天鹅绒 5 尺寸 → 真战斗流程 844/1280（验背包/装备/面具进战斗）→ 其余尺寸 fast 流程 → check.mjs → 对照图
cd "$(dirname "$0")/.."
tools/m5build.sh > tools/out/m5-build.log 2>&1 || { echo BUILD_FAIL; exit 1; }
echo built
for spec in "667 375 2" "844 390 1" "1024 768 1" "1280 720 1" "1920 1080 1"; do set -- $spec
  TMO=300 tools/run4.sh tools/shop.mjs $1 $2 dpr=$3 > tools/out/m5-shop$1.log 2>&1; echo "shop$1 $?"
done
for spec in "844 390 2" "1280 720 1"; do set -- $spec
  TMO=500 tools/run4.sh tools/flow.mjs $1 $2 dpr=$3 > tools/out/m5-real$1.log 2>&1; echo "real$1 $?"
done
for spec in "667 375 2" "1024 768 1" "1920 1080 1"; do set -- $spec
  TMO=500 tools/run4.sh tools/flow.mjs $1 $2 dpr=$3 fast=1 > tools/out/m5-fast$1.log 2>&1; echo "fast$1 $?"
done
TMO=300 tools/run4.sh tools/check.mjs > tools/out/m5-check.log 2>&1; echo "check $?"
python3 tools/compare_m5.py 844x390 1280x720 > tools/out/m5-cmp.log 2>&1; echo "cmp $?"
echo ALLDONE
