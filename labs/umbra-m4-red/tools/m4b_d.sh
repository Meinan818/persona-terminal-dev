#!/bin/sh
cd "$(dirname "$0")/.."
flock /tmp/p5r-heavy.lock npm run build > tools/out/m4b-build.log 2>&1 || { echo BUILD_FAIL; exit 1; }
echo built
TMO=420 tools/run4.sh tools/flow.mjs 844 390 dpr=2 fast=1 wipe=boss > tools/out/m4b-wipe844.log 2>&1; echo "wipe844 $?"
TMO=420 tools/run4.sh tools/flow.mjs 1280 720 dpr=1 fast=1 wipe=boss > tools/out/m4b-wipe1280.log 2>&1; echo "wipe1280 $?"
TMO=420 tools/run4.sh tools/flow.mjs 844 390 dpr=2 > tools/out/m4b-real844.log 2>&1; echo "real844 $?"
TMO=300 tools/run4.sh tools/check.mjs > tools/out/m4b-check.log 2>&1; echo "check $?"
TMO=110 tools/run4.sh tools/prof_hub.mjs '' > tools/out/m4b-prof.log 2>&1; echo "prof $?"
echo ALLDONE
