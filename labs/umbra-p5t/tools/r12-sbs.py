#!/usr/bin/env python3
# side-by-side: python3 sbs.py ours.png orig.png out.png "label ours" "label orig"
import sys
from PIL import Image, ImageDraw, ImageFont
a, b, out, la, lb = sys.argv[1:6]
A = Image.open(a).convert('RGB').resize((1280, 720))
B = Image.open(b).convert('RGB').resize((1280, 720))
H = 44
im = Image.new('RGB', (2560 + 12, 720 + H), (20, 20, 20))
im.paste(A, (0, H)); im.paste(B, (1280 + 12, H))
d = ImageDraw.Draw(im)
try:
    f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 26)
except Exception:
    f = ImageFont.load_default()
d.rectangle([0, 0, 1280, H - 1], fill=(200, 0, 18)); d.text((14, 8), la, font=f, fill=(255, 255, 255))
d.rectangle([1292, 0, 2572, H - 1], fill=(60, 60, 60)); d.text((1306, 8), lb, font=f, fill=(255, 255, 255))
im.save(out)
print(out, im.size)
