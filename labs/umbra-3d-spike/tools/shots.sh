#!/bin/bash
# usage: shots.sh tag  -> shots/<tag>-<shot>-<w>.png
cd /workspace/work/umbra-next/m5-3d
export PLAYWRIGHT_BROWSERS_PATH=/workspace/work/ms-playwright LD_LIBRARY_PATH=/workspace/work/pw-libs
TAG=$1; shift; SIZES=${SIZES:-"1280x720"}
for sz in $SIZES; do W=${sz%x*}; H=${sz#*x}; D=1; [ $W -lt 1000 ] && D=2
 for s in idle:1.2 menu:0.6 attack:0.8; do n=${s%:*}; t=${s#*:}
  timeout 115 node tools/shot.cjs "http://127.0.0.1:5179/?shot=$n&t=$t" shots/$TAG-$n-$W.png $W $H $D 2>&1 | grep -E "err|Error" | head -3 &
 done; wait; done
