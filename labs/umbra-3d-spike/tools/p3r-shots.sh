#!/bin/bash
# usage: p3r-shots.sh tag "t1 t2 ..." [WxH:tier]  → shots/p3r-<tag>-<t>.png（2 路并行，重活加锁）
cd /workspace/work/umbra-next/m5-3d
export PLAYWRIGHT_BROWSERS_PATH=/workspace/work/ms-playwright LD_LIBRARY_PATH=/workspace/work/pw-libs
TAG=$1; TS=${2:-"0.5 1.5 1.9 2.2 3.0 4.1 6.0"}; SZ=${3:-1280x720:high}; WH=${SZ%:*}; TI=${SZ#*:}; W=${WH%x*}; H=${WH#*x}; D=1; [ $W -lt 1000 ] && D=2
n=0; for t in $TS; do
  timeout 115 node tools/shot.cjs "http://127.0.0.1:5179/p3r-summon.html?t=$t&tier=$TI" shots/p3r-$TAG-$t.png $W $H $D 2>&1 | grep -vE "^\[c\] (THREE)" | head -6 &
  n=$((n+1)); [ $((n%2)) -eq 0 ] && wait
done; wait
