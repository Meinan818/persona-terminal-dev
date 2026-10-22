#!/bin/sh
cd "$(dirname "$0")/.."
L=tools/out/final5b.log; rm -f $L
TMO=200 tools/run.sh p5shots 844 390 set=showtime > tools/out/p5shots-st-844.log 2>&1; echo "st844 $?" >> $L
TMO=250 tools/run.sh p5shots 1024 768 set=showtime > tools/out/p5shots-st-1024.log 2>&1; echo "st1024 $?" >> $L
TMO=900 tools/run.sh clips showtime,start > tools/out/clips5b.log 2>&1; echo "clips $?" >> $L
echo ALLDONE >> $L
