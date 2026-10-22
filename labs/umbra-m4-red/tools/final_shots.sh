#!/bin/sh
cd "$(dirname "$0")/.."
for spec in "667 375 2" "844 390 2" "1024 768 1" "1180 820 1" "1920 1080 1"; do
  set -- $spec
  TMO=420 tools/run.sh shots $1 $2 dpr=$3 > tools/out/final-$1x$2.log 2>&1
  echo "$1x$2 done $?" >> tools/out/final.log
done
echo ALLDONE >> tools/out/final.log
