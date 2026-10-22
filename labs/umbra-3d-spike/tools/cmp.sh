#!/bin/bash
# cmp.sh tag width -> compare grid of ref|ours for 3 shots
cd /workspace/work/umbra-next/m5-3d/shots; T=$1; W=${2:-1280}
ffmpeg -v error -y -i ref-017.jpg -i $T-idle-$W.png -i ref-029.jpg -i $T-menu-$W.png -i ref-033.jpg -i $T-attack-$W.png -filter_complex "[0]scale=640:360[a];[1]scale=640:360[b];[2]scale=640:360[c];[3]scale=640:360[d];[4]scale=640:360[e];[5]scale=640:360[f];[a][b][c][d][e][f]xstack=inputs=6:layout=0_0|640_0|0_360|640_360|0_720|640_720" grid-$T.jpg
