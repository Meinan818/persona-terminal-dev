#!/bin/sh
# 后台跑（脱离 shell 工具 120s 限制）：tools/bg.sh <name> <cmd...>；日志 tools/out/bg-<name>.log，结束写 .rc
cd "$(dirname "$0")/.."
N=$1; shift
rm -f tools/out/bg-$N.rc
setsid nohup sh -c "$* > tools/out/bg-$N.log 2>&1; echo \$? > tools/out/bg-$N.rc" > /dev/null 2>&1 &
echo started $N
