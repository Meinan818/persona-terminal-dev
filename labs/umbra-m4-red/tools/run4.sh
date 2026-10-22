#!/bin/sh
# usage: tools/run4.sh <script.mjs> args...   （m4 服务 8767 + 共享重活锁；TMO 默认 112s）
cd "$(dirname "$0")/.."
export PLAYWRIGHT_BROWSERS_PATH=/workspace/work/ms-playwright LD_LIBRARY_PATH=/workspace/work/pw-libs
python3 serve.py 8767 > /dev/null 2>&1 &
SV=$!
sleep 0.6
timeout ${TMO:-112} flock /tmp/p5r-heavy.lock node "$@"; rc=$?
kill $SV 2>/dev/null
exit $rc
