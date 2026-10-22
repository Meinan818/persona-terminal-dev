#!/bin/sh
cd "$(dirname "$0")/.."
flock /tmp/p5r-heavy.lock npm run build > tools/out/m4b-build.log 2>&1 || { echo BUILD_FAIL; exit 1; }
echo built
for spec in "844 390 2" "1280 720 1"; do set -- $spec
  TMO=420 tools/run4.sh tools/flow.mjs $1 $2 dpr=$3 > tools/out/m4b-real$1.log 2>&1; echo "real$1 $?"
  TMO=420 tools/run4.sh tools/flow.mjs $1 $2 dpr=$3 fast=1 wipe=boss > tools/out/m4b-wipe$1.log 2>&1; echo "wipe$1 $?"
done
TMO=300 tools/run4.sh tools/flow.mjs 844 390 dpr=1 fast=1 retreat=1 > tools/out/m4b-retreat844.log 2>&1; echo "retreat844 $?"
for spec in "667 375 2" "1024 768 1" "1180 820 1" "1920 1080 1"; do set -- $spec
  TMO=300 tools/run4.sh tools/flow.mjs $1 $2 dpr=$3 fast=1 > tools/out/m4b-fast$1.log 2>&1; echo "fast$1 $?"
done
echo ALLDONE
