import json
import sys
from pathlib import Path

from PIL import Image, ImageStat


def analyze(path: Path) -> dict:
    image = Image.open(path).convert("L")
    pixels = list(image.getdata())
    total = len(pixels)
    mean = sum(pixels) / total
    white_ratio = sum(1 for value in pixels if value >= 245) / total
    dark_ratio = sum(1 for value in pixels if value <= 12) / total
    return {
        "name": path.name,
        "mean": round(mean, 2),
        "whiteRatio": round(white_ratio, 4),
        "darkRatio": round(dark_ratio, 4),
    }


def main() -> None:
    root = Path(sys.argv[1])
    theme = sys.argv[2]
    frames = [analyze(path) for path in sorted(root.glob(f"{theme}-*.jpg"))]
    means = [frame["mean"] for frame in frames]
    print(json.dumps({
        "frames": frames,
        "meanRange": [round(min(means), 2), round(max(means), 2)] if means else [0, 0],
        "maxWhiteRatio": max((frame["whiteRatio"] for frame in frames), default=0),
        "maxDarkRatio": max((frame["darkRatio"] for frame in frames), default=0),
    }))


if __name__ == "__main__":
    main()
