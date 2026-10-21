#!/bin/sh
cd "$(dirname "$0")/.."
L=tools/out/final4b.log
TMO=200 tools/run.sh p4shots 1024 768 dpr=1 set=enemy,onemore,baton > tools/out/p4b-1024.log 2>&1; echo "p4 1024 rest $?" >> $L
for spec in "1180 820" "1920 1080"; do set -- $spec
 TMO=400 tools/run.sh p4shots $1 $2 dpr=1 set=showtime,start,enemy,onemore,baton > tools/out/p4b-$1.log 2>&1; echo "p4 $1x$2 $?" >> $L; done
TMO=900 tools/run.sh clips showtime,start > tools/out/clips4b.log 2>&1; echo "clips $?" >> $L
echo ALLDONE >> $L
