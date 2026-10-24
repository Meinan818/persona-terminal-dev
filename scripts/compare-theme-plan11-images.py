"""Compare two same-size plan 11 screenshots without changing either image."""

from __future__ import annotations

import json
import sys

from PIL import Image, ImageChops, ImageStat


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: compare-theme-plan11-images.py ORIGINAL INTEGRATED", file=sys.stderr)
        return 2

    original = Image.open(sys.argv[1]).convert("RGBA")
    integrated = Image.open(sys.argv[2]).convert("RGBA")
    if original.size != integrated.size:
        print(json.dumps({
            "sameSize": False,
            "originalSize": original.size,
            "integratedSize": integrated.size,
        }, ensure_ascii=False))
        return 0

    difference = ImageChops.difference(original, integrated)
    stat = ImageStat.Stat(difference)
    bbox = difference.getbbox()
    changed = sum(1 for point in difference.getdata() if max(point) > 3)
    pixels = original.width * original.height
    print(json.dumps({
        "sameSize": True,
        "width": original.width,
        "height": original.height,
        "changedPixels": changed,
        "changedRatio": changed / pixels if pixels else 0,
        "meanAbsoluteDiff": sum(stat.mean) / len(stat.mean),
        "differenceBBox": bbox,
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
