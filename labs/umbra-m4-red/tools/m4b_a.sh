#!/bin/sh
cd "$(dirname "$0")/.."
flock /tmp/p5r-heavy.lock npm run build > tools/out/m4b-build.log 2>&1 || { echo BUILD_FAIL; exit 1; }
TMO=400 tools/run4.sh tools/flow.mjs 844 390 dpr=1 > tools/out/m4b-real844.log 2>&1; echo "real844 $?"
TMO=300 tools/run4.sh tools/flow.mjs 844 390 dpr=1 fast=1 wipe=boss > tools/out/m4b-wipe844.log 2>&1; echo "wipe844 $?"
echo ALLDONE
