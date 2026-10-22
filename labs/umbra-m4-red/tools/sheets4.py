# 第四阶段对比表：shots4/compare4-*.png（844×390 实拍 vs 原作参考帧；视频参考帧带水印，只作对照不进素材）+ shots4/contact4-<size>.png
from PIL import Image, ImageDraw, ImageFont
import os
R = os.path.join(os.path.dirname(__file__), '..'); S = R + '/shots4'
FNT = ImageFont.truetype(R + '/work/r5-latin-display.ttf', 26)
VR = '/workspace/work/vidref/'; REF = '/workspace/work/umbra-red/refs/'
def pair(a_path, b_path, name, la, lb):
    if not (os.path.exists(a_path) and os.path.exists(b_path)): print('skip', name); return
    a = Image.open(a_path).convert('RGB'); b = Image.open(b_path).convert('RGB')
    H = 520; a = a.resize((int(a.width * H / a.height), H), Image.LANCZOS); b = b.resize((int(b.width * H / b.height), H), Image.LANCZOS)
    c = Image.new('RGB', (a.width + b.width + 18, H + 50), (10, 10, 10)); c.paste(a, (0, 50)); c.paste(b, (a.width + 18, 50))
    d = ImageDraw.Draw(c); d.text((10, 10), la, font=FNT, fill=(255, 255, 255)); d.text((a.width + 28, 10), lb, font=FNT, fill=(255, 220, 80))
    c.save(f'{S}/compare4-{name}.png'); print('compare4', name)
T = '844x390'
pair(f'{S}/{T}-42-showtime-a-panels.png', VR + 'p5r-showtime/f0225.jpg', 'showtime-open', 'UMBRA SHOWTIME 1/4 comic panels', 'P5R SHOWTIME open (vidref f0225, watermark)')
pair(f'{S}/{T}-42-showtime-c-entrance.png', VR + 'p5r-showtime/f0407.jpg', 'showtime-entrance', 'UMBRA SHOWTIME 2/4 entrance', 'P5R SHOWTIME entrance (vidref f0407)')
pair(f'{S}/{T}-42-showtime-e-strike.png', VR + 'p5r-showtime/f0463.jpg', 'showtime-strike', 'UMBRA SHOWTIME 3/4 combined strike', 'P5R SHOWTIME strike (vidref f0463)')
pair(f'{S}/{T}-42-showtime-f-title.png', VR + 'p5r-showtime/f0127.jpg', 'showtime-title', 'UMBRA SHOWTIME 4/4 freeze + title', 'P5R SHOWTIME finish (vidref f0127)')
pair(f'{S}/{T}-44-onemore.png', REF + 'frames/gs50/t_09-32.jpg', 'onemore', 'UMBRA 1 MORE (mid-grey world)', 'P5R 1 MORE (V:gs50 @09:32)')
pair(f'{S}/{T}-45-baton.png', REF + 'battle/baton-gamerant.jpg', 'baton', 'UMBRA BATON PASS (gloves)', 'P5R BATON PASS (refs/battle/baton-gamerant.jpg)')
pair(f'{S}/{T}-43-enemy-a-name.png', REF + 'frames/gs50/t_01-14.jpg', 'enemyturn', 'UMBRA enemy turn (action name bar)', 'P5R battle (V:gs50 @01:14)')
pair(f'{S}/{T}-46-summon-queen-grab.png', REF + 'frames/takeover/t_01-20.jpg', 'summon-queen', 'UMBRA Queen summon (exact mask)', 'P5R summon (takeover @01:20)')
for size in ['667x375', '844x390', '1024x768', '1180x820', '1920x1080']:
    names = ['41-start-a-grab', '41-start-c-goo', '42-showtime-a-panels', '42-showtime-c-entrance', '42-showtime-e-strike', '42-showtime-f-title', '43-enemy-a-name', '44-onemore', '45-baton']
    fs = [f'{S}/{size}-{n}.png' for n in names]
    fs = [f for f in fs if os.path.exists(f)]
    if not fs: continue
    ims = [Image.open(f).convert('RGB') for f in fs]
    tw = 520; th = int(ims[0].height * tw / ims[0].width)
    sheet = Image.new('RGB', (tw * 3 + 24, th * ((len(ims) + 2) // 3) + 60), (229, 25, 28))
    for i, im in enumerate(ims):
        t = im.resize((tw, th), Image.LANCZOS); d = ImageDraw.Draw(t); lab = os.path.basename(fs[i])[len(size) + 1:-4]
        w = d.textlength(lab, font=FNT); d.rectangle([0, 0, w + 16, 32], fill=(10, 10, 10)); d.text((8, 2), lab, font=FNT, fill=(255, 255, 255))
        sheet.paste(t, (6 + (i % 3) * (tw + 6), 50 + (i // 3) * (th + 6)))
    ImageDraw.Draw(sheet).text((10, 8), f'UMBRA M3 p5r-red phase 4  {size}', font=FNT, fill=(255, 255, 255))
    sheet.save(f'{S}/contact4-{size}.png'); print('contact4', size)
