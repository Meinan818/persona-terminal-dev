#!/usr/bin/env bash
# r8：原版 P5T 战斗音效（Codex 4a25a24，umbra-assets p5t/1_battle/r7/battle_sfx/wav/*/*.wav，PCM16 48k，私用不入库）
# → public/p5t-sfx/<名>.ogg（Opus 64k/96k，Android/Chrome/Firefox）+ <名>.m4a（AAC 96k，iOS Safari 回退）（gitignore）。
# 只压缩，不剪辑、不改音量。缺文件时游戏静音。
set -euo pipefail
cd "$(dirname "$0")/.."
SRC="${UMBRA_ASSETS:-/workspace/work/umbra-assets}/p5t/1_battle/r7/battle_sfx/wav"
DST="public/p5t-sfx"
mkdir -p "$DST"
for f in "$SRC"/*/*.wav; do
  n=$(basename "$f" .wav)
  ch=$(ffprobe -v error -select_streams a:0 -show_entries stream=channels -of csv=p=0 "$f")
  br=$([ "$ch" = 1 ] && echo 64k || echo 96k)
  [ -f "$DST/$n.ogg" ] && [ "$DST/$n.ogg" -nt "$f" ] || ffmpeg -v error -y -i "$f" -c:a libopus -b:a $br -vbr on "$DST/$n.ogg"
  [ -f "$DST/$n.m4a" ] && [ "$DST/$n.m4a" -nt "$f" ] || ffmpeg -v error -y -i "$f" -c:a aac -b:a 96k "$DST/$n.m4a"
done
du -ch "$DST"/*.ogg | tail -1; du -ch "$DST"/*.m4a | tail -1; ls "$DST" | wc -l
