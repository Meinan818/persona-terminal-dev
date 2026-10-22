# M5 对照图：左 = P5R 原作截图（refs，等比 cover 到同尺寸），右 = 本作同一画面截图（shots-m5/<W>x<H>-*.png）
# python3 tools/compare_m5.py 844x390 1280x720 → shots-m5/cmp/<size>-<key>.png
import os, sys
from PIL import Image, ImageDraw
R = os.path.join(os.path.dirname(__file__), '..'); REF = '/workspace/work/umbra-red/refs/'
PAIRS = [('shop-home', 'guidb/gui-26458.jpg', '22-shop-home'), ('shop-buy', 'guidb/gui-26462.jpg', '23-shop-acc'),
         ('shop-qty', 'guidb/gui-26468.jpg', '33-takemi-qty'), ('shop-takemi', 'guidb/gui-26468.jpg', '32-takemi'), ('shop-sell', 'guidb/gui-26464.jpg', '29-shop-sell'),
         ('shop-item', 'guidb/gui-26470.jpg', '36-drug-list'), ('shop-equip', 'guidb/gui-26460.jpg', '26-shop-equip'),
         ('velvet-home', 'guidb/gui-26477.jpg', '41-velvet-home'), ('velvet-method', 'guidb/gui-26478.jpg', '42-velvet-method'),
         ('fusion-list', 'guidb/gui-26480.jpg', '44-fusion-list2'), ('fusion-preview', 'guidb/gui-26479.jpg', '45-fusion-preview'),
         ('fusion-show', 'velvet/guillotine.jpg', '47-fusion-guillotine')]
def cover(im, W, H):
    k = max(W / im.width, H / im.height); im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    l, t = (im.width - W) // 2, (im.height - H) // 2; return im.crop((l, t, l + W, t + H))
os.makedirs(R + '/shots-m5/cmp', exist_ok=True)
for size in sys.argv[1:]:
    W, H = map(int, size.split('x'))
    for key, ref, ours in PAIRS:
        p = f'{R}/shots-m5/{size}-{ours}.png'
        if not os.path.exists(p): print('missing', p); continue
        a = cover(Image.open(REF + ref).convert('RGB'), W, H); b = Image.open(p).convert('RGB').resize((W, H))
        out = Image.new('RGB', (W * 2 + 8, H + 28), (255, 255, 255)); out.paste(a, (0, 28)); out.paste(b, (W + 8, 28))
        d = ImageDraw.Draw(out); d.text((6, 6), f'P5R original: {ref}', fill=(0, 0, 0)); d.text((W + 14, 6), f'UMBRA p5r-red: {ours} ({size})', fill=(0, 0, 0))
        out.save(f'{R}/shots-m5/cmp/{size}-{key}.png')
    print('ok', size)
