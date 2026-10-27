#!/usr/bin/env bash
# r13：原版 P5T 战斗 BGM（umbra-assets p5t/1_audio/bgm/*.wav，PCM16 48k，私用不入库）
# → public/p5t-bgm/bgm_0NN.ogg（Opus 96k，Android/Chrome/Firefox）+ .m4a（AAC 112k，iOS 回退）（gitignore）。
# 只压缩、截到 loop_end（index.csv 原值），不改音量；循环点在 src/view/bgmData.ts。只转 bgmData.ts 用到的曲目。
set -euo pipefail
cd "$(dirname "$0")/.."
SRC="${UMBRA_ASSETS:-$(cd ../../.. && pwd)/umbra-assets}/p5t/1_audio/bgm"
DST="public/p5t-bgm"
mkdir -p "$DST"
for cue in $(grep -o "bgm_0[0-9][0-9]: {" src/view/bgmData.ts | cut -d: -f1 | sort -u); do
  row=$(grep ",$cue," "$SRC/index.csv" || true)
  if [ -n "$row" ]; then f="$SRC/$(echo "$row" | cut -d, -f1)"; le=$(echo "$row" | cut -d, -f7)
  else # r15：d 系列在 bgm_d_index.csv（bank,cue_name,"N samples (…)",…,wav）
    row=$(grep ",$cue," "$SRC/bgm_d_index.csv"); f="$SRC/$(echo "$row" | cut -d, -f5)"; le=$(echo "$row" | cut -d, -f4 | grep -o '^[0-9]*'); fi
  [ -f "$DST/$cue.ogg" ] && [ "$DST/$cue.ogg" -nt "$f" ] || ffmpeg -v error -y -i "$f" -af "atrim=end_sample=$le" -c:a libopus -b:a 96k -vbr on "$DST/$cue.ogg"
  [ -f "$DST/$cue.m4a" ] && [ "$DST/$cue.m4a" -nt "$f" ] || ffmpeg -v error -y -i "$f" -af "atrim=end_sample=$le" -c:a aac -b:a 112k "$DST/$cue.m4a"
done
ls -la "$DST"
