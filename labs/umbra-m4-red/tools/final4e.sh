#!/bin/sh
cd "$(dirname "$0")/.."
for w in queen violet mona; do TMO=200 tools/run.sh p4shots 844 390 dpr=2 set=summon who=$w > tools/out/p4shots-summon-$w.log 2>&1; echo "summon $w $?" >> tools/out/final4b.log; done
echo SUMDONE >> tools/out/final4b.log
