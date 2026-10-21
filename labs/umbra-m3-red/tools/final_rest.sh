#!/bin/sh
# 补拍：final_shots2.sh 中失败/中断的尺寸
cd "$(dirname "$0")/.."
TMO=420 tools/run.sh shots 1024 768 dpr=1 > tools/out/final-1024x768.log 2>&1; echo "1024x768 done $?" >> tools/out/final.log
TMO=420 tools/run.sh shots 1920 1080 dpr=1 > tools/out/final-1920x1080.log 2>&1; echo "1920x1080 done $?" >> tools/out/final.log
TMO=420 tools/run.sh shots2 1920 1080 dpr=1 out=shots2 set=main > tools/out/final-s2-1920.log 2>&1; echo "s2 1920 $?" >> tools/out/final.log
echo ALLDONE >> tools/out/final.log
