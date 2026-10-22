#!/bin/sh
cd "$(dirname "$0")/.."
while ! grep -q CHECKDONE tools/out/final4b.log 2>/dev/null; do sleep 5; done
TMO=300 tools/run.sh p4shots 1920 1080 dpr=1 set=onemore,baton > tools/out/p4b-1920b.log 2>&1; echo "p4 1920 onemore,baton $?" >> tools/out/final4b.log
echo P4DDONE >> tools/out/final4b.log
