#!/bin/sh
# 10-22 HOLD UP 构图修复回归：check + enemies(844/667/1280 × 1..5) + 6 尺寸 holdup 关键帧（覆盖 shots5）
cd "$(dirname "$0")/.."
L=tools/out/final6.log; rm -f $L
cp -f tools/out/check.json tools/out/check.prev6.json 2>/dev/null
TMO=300 tools/run.sh check > tools/out/check6.log 2>&1; echo "check $?" >> $L
for spec in "844 390" "667 375" "1280 720"; do set -- $spec
  TMO=600 tools/run.sh enemies $1 $2 n=1,3,5 shots=1 > tools/out/enemies6-$1x$2.log 2>&1; echo "enemies $1x$2 $?" >> $L; done
for spec in "844 390" "667 375" "1024 768" "1180 820" "1280 720" "1920 1080"; do set -- $spec
  TMO=300 tools/run.sh p5shots $1 $2 set=holdup > tools/out/p5shots6-$1x$2.log 2>&1; echo "holdup $1x$2 $?" >> $L; done
echo ALLDONE >> $L
