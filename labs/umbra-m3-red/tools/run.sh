#!/bin/sh
# usage: tools/run.sh shots <W> <H> [k=v...]   （共享重活锁，≤112s）
cd "$(dirname "$0")/.."
export PLAYWRIGHT_BROWSERS_PATH=/workspace/work/ms-playwright LD_LIBRARY_PATH=/workspace/work/pw-libs
pgrep -f "serve.py 8766" >/dev/null || (nohup python3 serve.py 8766 > tools/out/serve.log 2>&1 &) ; sleep 0.5
mode=$1; shift
exec timeout ${TMO:-112} flock /tmp/p5r-heavy.lock node tools/$mode.mjs "$@"
