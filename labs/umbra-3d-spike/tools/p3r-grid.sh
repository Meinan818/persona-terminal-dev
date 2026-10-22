#!/bin/bash
# p3r-grid.sh out.jpg cols img... → 每格 640 宽的网格
OUT=$1; C=$2; shift 2; n=$#; ins=""; f=""; i=0; lay=""
for x in "$@"; do ins="$ins -i $x"; f="$f[$i]scale=640:-2[v$i];"; r=$((i/C)); c=$((i%C)); lay="$lay|$((c*640))_$((r*360))"; i=$((i+1)); done
st=""; for j in $(seq 0 $((n-1))); do st="$st[v$j]"; done
ffmpeg -v error -y $ins -filter_complex "${f}${st}xstack=inputs=$n:layout=${lay:1}:fill=black" -frames:v 1 -update 1 -q:v 3 $OUT
