#!/bin/sh
# M5 重建：商店数据/recipe/文案 → 字体子集 → manifest → tsc → vite（重活锁）
cd "$(dirname "$0")/.."
set -e
python3 tools/gen_shop_data.py >/dev/null && python3 tools/gen_shop_recipes.py >/dev/null && python3 tools/gen_recipes.py >/dev/null && python3 tools/labels_m5.py >/dev/null
PYTHONPATH=/workspace/work/pyf-brotli python3 tools/subset_fonts.py >/dev/null && python3 tools/build_manifest.py
npx tsc --noEmit
flock /tmp/p5r-heavy.lock npx vite build > work/vite.log 2>&1 && tail -1 work/vite.log
