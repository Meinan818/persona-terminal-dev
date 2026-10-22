#!/bin/sh
# M4b 终验续跑（bg-fin 中断于 wipe844）：dist 不重建
cd "$(dirname "$0")/.."
TMO=420 tools/run4.sh tools/flow.mjs 844 390 dpr=2 fast=1 wipe=boss > tools/out/m4b-wipe844.log 2>&1; echo "wipe844 $?"
TMO=420 tools/run4.sh tools/flow.mjs 1280 720 dpr=1 > tools/out/m4b-real1280.log 2>&1; echo "real1280 $?"
TMO=420 tools/run4.sh tools/flow.mjs 1280 720 dpr=1 fast=1 wipe=boss > tools/out/m4b-wipe1280.log 2>&1; echo "wipe1280 $?"
TMO=300 tools/run4.sh tools/flow.mjs 844 390 dpr=2 fast=1 retreat=1 > tools/out/m4b-retreat844.log 2>&1; echo "retreat844 $?"
for spec in "667 375 2" "1024 768 1" "1180 820 1" "1920 1080 1"; do set -- $spec
  TMO=300 tools/run4.sh tools/flow.mjs $1 $2 dpr=$3 fast=1 > tools/out/m4b-fast$1.log 2>&1; echo "fast$1 $?"
done
TMO=300 tools/run4.sh tools/check.mjs > tools/out/m4b-check.log 2>&1; echo "check $?"
TMO=600 tools/run4.sh tools/enemies.mjs 1280 720 > tools/out/m4b-enemies.log 2>&1; echo "enemies $?"
echo ALLDONE
