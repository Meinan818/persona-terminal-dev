# 拼图 contact-<size>.png（7 状态）与 compare-*.png（844×390 vs 原作参考帧）
from PIL import Image, ImageDraw, ImageFont
import os, glob
R = os.path.join(os.path.dirname(__file__), '..'); S = R + '/shots'
FNT = ImageFont.truetype(R + '/work/r5-latin-display.ttf', 26)
STATES = ['1-idle', '2-skilllist', '3-cutin', '4-onemore', '5-holdup', '6-allout', '7-result']
def cap(im, text):
    d = ImageDraw.Draw(im); w = d.textlength(text, font=FNT)
    d.rectangle([0, 0, w + 20, 36], fill=(10, 10, 10)); d.text((10, 3), text, font=FNT, fill=(255, 255, 255)); return im
for size in ['667x375', '844x390', '1024x768', '1180x820', '1920x1080']:
    fs = [f'{S}/{size}-{s}.png' for s in STATES]
    if not all(os.path.exists(f) for f in fs): print('missing', size); continue
    ims = [Image.open(f).convert('RGB') for f in fs]
    tw = 640; th = int(ims[0].height * tw / ims[0].width)
    sheet = Image.new('RGB', (tw * 4 + 30, th * 2 + 70), (229, 25, 28))
    for i, im in enumerate(ims):
        t = cap(im.resize((tw, th), Image.LANCZOS), STATES[i])
        sheet.paste(t, (6 + (i % 4) * (tw + 6), 50 + (i // 4) * (th + 6)))
    d = ImageDraw.Draw(sheet); d.text((10, 8), f'UMBRA M3 p5r-red  {size}', font=FNT, fill=(255, 255, 255))
    sheet.save(f'{S}/contact-{size}.png'); print('contact', size)
REF = '/workspace/work/umbra-red/refs/'
PAIRS = [('1-idle', 'battle/cmd-menu-xbox.jpg', 'idle', 'P5R command menu (refs/battle/cmd-menu-xbox.jpg)'),
         ('2-skilllist', 'frames/gs50/t_00-22.jpg', 'skilllist', 'P5R skill list (V:gs50 @00:22)'),
         ('6-allout', 'battle/allout-finish.jpg', 'allout', 'P5R all-out finish (refs/battle/allout-finish.jpg)'),
         ('3-cutin', 'guidb/gui-26513.jpg', 'cutin', 'P5R cut-in (G26513)'),
         ('4-onemore', 'frames/gs50/t_09-32.jpg', 'onemore', 'P5R 1 MORE (V:gs50 @09:32)'),
         ('5-holdup', 'frames/gs50/t_01-00.jpg', 'holdup', 'P5R HOLD UP (V:gs50 @01:00)'),
         ('7-result', 'guidb/gui-26519.jpg', 'result', 'P5R RESULT (G26519)'),
         ('@shots2/844x390-03-summon-f-full', 'frames/takeover/t_01-20.jpg', 'summon', 'P5R Persona summon (takeover @01:20)')]
for st, ref, name, label in PAIRS:
    a = Image.open(R + '/shots2/' + st.split('/', 1)[1] + '.png' if st.startswith('@') else f'{S}/844x390-{st}.png').convert('RGB'); b = Image.open(REF + ref).convert('RGB')
    H = 520; a = a.resize((int(a.width * H / a.height), H), Image.LANCZOS); b = b.resize((int(b.width * H / b.height), H), Image.LANCZOS)
    c = Image.new('RGB', (a.width + b.width + 18, H + 50), (10, 10, 10)); c.paste(a, (0, 50)); c.paste(b, (a.width + 18, 50))
    d = ImageDraw.Draw(c); d.text((10, 10), 'UMBRA M3 (844x390)', font=FNT, fill=(255, 255, 255)); d.text((a.width + 28, 10), label, font=FNT, fill=(255, 220, 80))
    c.save(f'{S}/compare-{name}.png'); print('compare', name)
