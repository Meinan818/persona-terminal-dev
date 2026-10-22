#!/bin/sh
cd "$(dirname "$0")/.."
TMO=300 tools/run4.sh tools/check.mjs > tools/out/m4b-check2.log 2>&1; echo "check2 $?"
TMO=700 tools/run4.sh tools/flow.mjs 1920 1080 dpr=1 fast=1 > tools/out/m4b-fast1920.log 2>&1; echo "fast1920b $?"
echo ALLDONE
