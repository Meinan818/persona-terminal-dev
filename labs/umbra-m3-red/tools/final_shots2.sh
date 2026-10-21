#!/bin/sh
# 第二阶段终拍：5 尺寸 × 7 状态（shots.mjs）+ 844/667 第二阶段全套（shots2.mjs）
cd "$(dirname "$0")/.."
rm -f tools/out/final.log
for spec in "667 375 2" "844 390 2" "1024 768 1" "1180 820 1" "1920 1080 1"; do
  set -- $spec
  TMO=420 tools/run.sh shots $1 $2 dpr=$3 > tools/out/final-$1x$2.log 2>&1
  echo "$1x$2 done $?" >> tools/out/final.log
done
TMO=420 tools/run.sh shots2 844 390 dpr=1 out=shots2 set=all > tools/out/final-s2-844.log 2>&1; echo "s2 844 $?" >> tools/out/final.log
TMO=420 tools/run.sh shots2 667 375 dpr=1 out=shots2 set=main > tools/out/final-s2-667.log 2>&1; echo "s2 667 $?" >> tools/out/final.log
TMO=420 tools/run.sh shots2 1920 1080 dpr=1 out=shots2 set=main > tools/out/final-s2-1920.log 2>&1; echo "s2 1920 $?" >> tools/out/final.log
echo ALLDONE >> tools/out/final.log
