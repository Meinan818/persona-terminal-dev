#!/bin/sh
cd "$(dirname "$0")/.."
while ! grep -q ALLDONE tools/out/final4b.log 2>/dev/null; do sleep 5; done
cp tools/out/check.json tools/out/check.prev.json
TMO=420 tools/run.sh check > tools/out/check4b.log 2>&1; echo "check $?" >> tools/out/final4b.log
echo CHECKDONE >> tools/out/final4b.log
