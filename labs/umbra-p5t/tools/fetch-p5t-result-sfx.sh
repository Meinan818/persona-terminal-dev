#!/usr/bin/env bash
# r16b：battle_result.acb 的结算 SE（umbra-assets p5t/1_audio/bgm_extra/battle_result__*.wav）→ public/p5t-sfx/<cue>.ogg + .m4a（私用不入库）
set -euo pipefail
cd "$(dirname "$0")/.."
SRC="${UMBRA_ASSETS:-$(cd ../../.. && pwd)/umbra-assets}/p5t/1_audio/bgm_extra"; DST=public/p5t-sfx; mkdir -p "$DST"
for f in "$SRC"/battle_result__*.wav; do n=$(basename "$f" .wav); n=${n#battle_result__}
  [ -f "$DST/$n.ogg" ] || ffmpeg -v error -y -i "$f" -c:a libopus -b:a 96k -vbr on "$DST/$n.ogg"
  [ -f "$DST/$n.m4a" ] || ffmpeg -v error -y -i "$f" -c:a aac -b:a 96k "$DST/$n.m4a"; done
ls "$DST" | grep -c se_btl
