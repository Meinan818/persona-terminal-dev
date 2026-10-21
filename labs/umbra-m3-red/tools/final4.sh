#!/bin/sh
# 第四阶段终拍：时长复测 → 5 尺寸 × 7 状态 + 第二阶段全套 → 第四阶段关键帧（5 尺寸）→ clips
cd "$(dirname "$0")/.."
L=tools/out/final4.log; rm -f $L
TMO=300 tools/run.sh p4timing > tools/out/p4timing.log 2>&1; echo "timing $?" >> $L
sh tools/final_shots2.sh; echo "final_shots2 $?" >> $L
for spec in "667 375 2" "844 390 2" "1024 768 1" "1180 820 1" "1920 1080 1"; do
  set -- $spec
  TMO=400 tools/run.sh p4shots $1 $2 dpr=$3 set=showtime,start,enemy,onemore,baton > tools/out/p4shots-$1x$2.log 2>&1; echo "p4 $1x$2 $?" >> $L
done
for w in queen violet mona; do TMO=200 tools/run.sh p4shots 844 390 dpr=2 set=summon who=$w > tools/out/p4shots-summon-$w.log 2>&1; echo "summon $w $?" >> $L; done
TMO=900 tools/run.sh clips summon,attack,allout,showtime,start > tools/out/clips4.log 2>&1; echo "clips $?" >> $L
echo ALLDONE >> $L
