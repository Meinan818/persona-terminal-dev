#!/bin/bash
# usage: shots2.sh tag [shots] ; SIZES="1280x720:high 844x390:mid"
cd /workspace/work/umbra-next/m5-3d
export PLAYWRIGHT_BROWSERS_PATH=/workspace/work/ms-playwright LD_LIBRARY_PATH=/workspace/work/pw-libs
TAG=$1; LIST=${2:-"idle:1.2 menu:0.6 attack:0.8"}; SIZES=${SIZES:-"1280x720:high"}
for sz in $SIZES; do WH=${sz%:*}; TI=${sz#*:}; W=${WH%x*}; H=${WH#*x}; D=1; [ $W -lt 1000 ] && D=2
 for s in $LIST; do n=${s%:*}; t=${s#*:}
  timeout 115 node tools/shot.cjs "http://127.0.0.1:5179/?shot=$n&t=$t&tier=$TI" shots/$TAG-$n-$W.png $W $H $D 2>&1 | grep -vE "^\[c\] (THREE|tier)" | head -5 &
 done; wait; done
