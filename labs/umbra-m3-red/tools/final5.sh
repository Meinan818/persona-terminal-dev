#!/bin/sh
# 第五阶段终拍：5 尺寸 × 第五阶段关键帧（待机环绕/召唤推拉/HOLD UP 环绕/开战/SHOWTIME 镜头）→ clips
cd "$(dirname "$0")/.."
L=tools/out/final5.log; rm -f $L
for spec in "844 390" "667 375" "1024 768" "1180 820" "1280 720" "1920 1080"; do
  set -- $spec
  TMO=500 tools/run.sh p5shots $1 $2 set=idle,holdup,start,showtime > tools/out/p5shots-$1x$2.log 2>&1; echo "p5 $1x$2 $?" >> $L
done
for w in queen violet mona; do TMO=250 tools/run.sh p5shots 844 390 set=summon who=$w > tools/out/p5shots-summon-$w.log 2>&1; echo "summon $w $?" >> $L; done
TMO=250 tools/run.sh p5shots 1280 720 set=summon who=queen > tools/out/p5shots-summon-1280.log 2>&1; echo "summon1280 $?" >> $L
TMO=900 tools/run.sh clips summon,attack,showtime,start > tools/out/clips5.log 2>&1; echo "clips $?" >> $L
echo ALLDONE >> $L
