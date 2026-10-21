#!/usr/bin/env python3
"""粉 p3r-pink 皮肤素材构建（scratch，不进仓库）。
输入：$P/work/pkgen/pk_*.png（generate_image）、/workspace/pkcache-umbra/skin-pink/src/*.png（P3RE 官方 Portrait）
输出：$WT/src/umbra/skins/p3r-pink/assets/ + build/skin-pink/assets.json（供 manifest 生成）
"""
import json, math, os, io, random, subprocess
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance, ImageOps

P = '/workspace/projects/86a5b727-7f71-46d0-bb30-e183f98dd9ca'
G = P + '/work/pkgen/'
S = '/workspace/pkcache-umbra/skin-pink/src/'
WT = P + '/work/wt/p3r-pink'
OUT = WT + '/src/umbra/skins/p3r-pink/assets/'
os.makedirs(OUT, exist_ok=True); os.makedirs(OUT + 'fonts', exist_ok=True)
REC = []  # manifest records

def save_webp(im, name, q=80, lossless=False):
    path = OUT + name
    kw = dict(quality=q, method=6)
    if lossless: kw = dict(lossless=True, quality=100, method=6)
    im.save(path, 'WEBP', **kw)
    return os.path.getsize(path)

def rec(id, file, w, h, firstPack, source, note=None, atlas=None):
    r = dict(id=id, file=file, w=w, h=h, firstPack=firstPack, source=source)
    if atlas: r['atlas'] = atlas
    if note: r['note'] = note
    REC.append(r)

def fit_h(im, h):
    im = im.crop(im.getbbox())
    return im.resize((round(im.width * h / im.height), h), Image.LANCZOS)

def defringe(im):
    """去绿幕残边：半透明且偏绿的像素压掉绿色。"""
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a and g > max(r, b) + 10:
                g2 = max(r, b)
                px[x, y] = (r, g2, b, a if a > 200 else int(a * 0.7))
    return im

def webp_size(im, q=80):
    b = io.BytesIO(); im.save(b, 'WEBP', quality=q, method=6); return len(b.getvalue())

# ---------------------------------------------------------------- 立绘
H = 640
busts = []
# hamuko bust: crop 头顶~胸，和官方 Portrait 构图对齐（头高≈0.56H）
hb = Image.open(G + 'pk_bust_a.png').convert('RGBA').crop((0, 36, 768, 1020))
hb = defringe(hb.resize((round(768 * H / 984), H), Image.LANCZOS))
busts.append(('hamuko', hb, 405, 'generated'))
for k, split in (('yukari', 395), ('junpei', 405), ('akihiko', 395)):
    im = Image.open(S + k + '.png').convert('RGBA')
    busts.append((k, fit_h(im, H), split, 'official'))
full = defringe(fit_h(Image.open(G + 'pk_full_a.png').convert('RGBA'), H))
evoke = defringe(fit_h(Image.open(G + 'pk_evoke_b.png').convert('RGBA'), H))

face_box = {'hamuko': (90, 130, 380, 420), 'yukari': (70, 140, 360, 430), 'junpei': (200, 170, 480, 450), 'akihiko': (90, 120, 370, 400)}
persons = {}
def build_atlas(aid, items, W, Hh, src, q=84):
    """items: list of (frameName, image, x, y, oy)；单一 source 的图集（每个文件只一个 source）。"""
    at = Image.new('RGBA', (W, Hh), (0, 0, 0, 0)); fr = {}
    for n, im, x, y, oy in items:
        assert x + im.width <= W and y + im.height <= Hh, (n, x, y, im.size)
        at.alpha_composite(im, (x, y)); fr[n] = dict(x=x, y=y, w=im.width, h=im.height, oy=oy)
    save_webp(at, aid + '.webp', q=q)
    json.dump({'frames': {n: {'frame': {'x': f['x'], 'y': f['y'], 'w': f['w'], 'h': f['h']},
                              'spriteSourceSize': {'x': 0, 'y': f['oy'], 'w': f['w'], 'h': f['h']}} for n, f in fr.items()},
               'meta': {'image': aid + '.webp', 'size': {'w': W, 'h': Hh}, 'scale': 1}}, open(OUT + aid + '.json', 'w'), separators=(',', ':'))
    rec(aid, f'assets/{aid}.webp', W, Hh, True, src, note=f'图集容器；帧坐标 assets/{aid}.json（Pixi spritesheet 格式）')
    for n, f in fr.items():
        rec(n, f'assets/{aid}.webp', f['w'], f['h'], True, src, atlas=aid)

def layer_items(k, im, split, x):
    head = im.crop((0, 0, im.width, split)); body = im.crop((0, split, im.width, H))
    persons[k] = dict(w=im.width, h=H, kb=round(webp_size(im) / 1024, 1))
    return [(f'ally.{k}.head', head, x, 0, 0), (f'ally.{k}.body', body, x, split + 4, split)]

def avatar(k, im):
    return im.crop(face_box[k]).resize((128, 128), Image.LANCZOS)

# 生成：哈姆子（半身两层 + 全身 + 举枪 + 头像）
k, im, split, _ = busts[0]
items = layer_items(k, im, split, 0)
items += [('ally.hamuko.full', full, 502, 0, 0), ('ally.hamuko.evoke', evoke, 703, 0, 0), ('hud.avatar.hamuko', avatar(k, im), 963, 0, 0)]
persons['hamuko.full'] = dict(w=full.width, h=H, kb=round(webp_size(full) / 1024, 1))
persons['hamuko.evoke'] = dict(w=evoke.width, h=H, kb=round(webp_size(evoke) / 1024, 1))
build_atlas('atlas.hamuko', items, 1092, 648, 'generated')
# 官方：岳羽 / 顺平 / 真田（半身两层 + 头像）
items = []; x = 0
for i, (k, im, split, _) in enumerate(busts[1:]):
    items += layer_items(k, im, split, x); items.append((f'hud.avatar.{k}', avatar(k, im), i * 130, 648, 0)); x += im.width + 2
build_atlas('atlas.portraits', items, 1520, 776, 'official')

# ---------------------------------------------------------------- HUD / FX 图集（程序绘制 + 头像裁切）
HW = 1024
HW = 1024
hud = Image.new('RGBA', (HW, 840), (0, 0, 0, 0)); hframes = {}
def put(name, im, x, y, src):
    hud.alpha_composite(im, (x, y)); hframes[name] = dict(x=x, y=y, w=im.width, h=im.height, src=src)
# 头像 128²：取各 bust 头部
face_box = {'hamuko': (90, 130, 380, 420), 'yukari': (70, 140, 360, 430), 'junpei': (200, 170, 480, 450), 'akihiko': (90, 120, 370, 400)}

def petal_shape(size, notch=True):
    """樱花瓣单色剪影（白色，供 tint）。"""
    s = size * 4
    im = Image.new('L', (s, s), 0); d = ImageDraw.Draw(im)
    pts = []
    for t in range(0, 361, 2):
        a = math.radians(t)
        # 心形瓣：底尖、顶部缺口
        r = 0.46 * s * (1 - 0.35 * abs(math.cos(a / 2)) ** 6) * (0.55 + 0.45 * math.sin(a / 2))
        pts.append((s / 2 + r * math.sin(a) * 0.82, s * 0.94 - (r * (1 - math.cos(a)) * 0.95)))
    d.polygon(pts, fill=255)
    if notch:
        d.polygon([(s * 0.5, s * 0.20), (s * 0.43, s * 0.0), (s * 0.57, s * 0.0)], fill=0)
    im = im.resize((size, size), Image.LANCZOS)
    out = Image.new('RGBA', (size, size), (255, 255, 255, 0)); out.putalpha(im); return out

put('fx.petal.a', petal_shape(48), 0, 140, 'generated')
put('fx.petal.b', petal_shape(48).rotate(35, resample=Image.BICUBIC, expand=False), 52, 140, 'generated')
put('fx.petal.c', petal_shape(32).transform((32, 32), Image.AFFINE, (1.4, 0, -6, 0, 1, 0), resample=Image.BICUBIC), 104, 140, 'generated')
# streak / sparkle / shard / ribbon bit
st = Image.new('L', (256, 16), 0); d = ImageDraw.Draw(st)
for i in range(256): d.line([(i, 8 - 6 * (i / 256)), (i, 8 + 6 * (i / 256))], fill=int(255 * (i / 256) ** 1.5))
st_rgba = Image.new('RGBA', st.size, (255, 255, 255, 0)); st_rgba.putalpha(st)
put('fx.streak', st_rgba, 140, 140, 'generated')
sp = Image.new('L', (48, 48), 0); d = ImageDraw.Draw(sp)
d.polygon([(24, 0), (28, 20), (48, 24), (28, 28), (24, 48), (20, 28), (0, 24), (20, 20)], fill=255)
sp_rgba = Image.new('RGBA', sp.size, (255, 255, 255, 0)); sp_rgba.putalpha(sp)
put('fx.sparkle', sp_rgba, 400, 140, 'generated')
sh = Image.new('L', (40, 56), 0); ImageDraw.Draw(sh).polygon([(4, 0), (40, 18), (22, 56), (0, 30)], fill=230)
sh_rgba = Image.new('RGBA', sh.size, (255, 255, 255, 0)); sh_rgba.putalpha(sh)
put('fx.shard', sh_rgba, 452, 140, 'generated')
# 指令区光标：粉白三角 + 缎带尾（P3R 菜单三角光标的粉色变体）
cur = Image.new('RGBA', (120, 96), (0, 0, 0, 0)); d = ImageDraw.Draw(cur)
d.polygon([(0, 8), (84, 48), (0, 88)], fill=(255, 255, 255, 255))
d.polygon([(14, 30), (56, 48), (14, 66)], fill=(230, 74, 132, 255))
d.polygon([(84, 48), (120, 34), (112, 48), (120, 62)], fill=(255, 179, 107, 255))
put('hud.cursor', cur, 500, 140, 'generated')
# 指令底条（斜切粉白条，可九宫拉伸）
bar = Image.new('RGBA', (360, 96), (0, 0, 0, 0)); d = ImageDraw.Draw(bar)
d.polygon([(22, 0), (360, 0), (338, 96), (0, 96)], fill=(255, 255, 255, 235))
d.polygon([(22, 0), (40, 0), (18, 96), (0, 96)], fill=(230, 74, 132, 255))
put('hud.cmdBar', bar, 630, 140, 'generated')
# 大樱瓣遮罩（maskWipe 用单色剪影，引擎放大）
put('mask.petal', petal_shape(512), 0, 300, 'generated')
# 花环 / 缎带结标记（结算、holdup 角标）
bow = Image.new('RGBA', (200, 120), (0, 0, 0, 0)); d = ImageDraw.Draw(bow)
d.polygon([(100, 60), (10, 10), (0, 60), (10, 110)], fill=(255, 255, 255, 255))
d.polygon([(100, 60), (190, 10), (200, 60), (190, 110)], fill=(255, 255, 255, 255))
d.ellipse([(84, 44), (116, 76)], fill=(255, 255, 255, 255))
put('hud.bow', bow, 520, 300, 'generated')
# 敌头顶弱点 / 护盾菱形
dia = Image.new('RGBA', (64, 64), (0, 0, 0, 0)); ImageDraw.Draw(dia).polygon([(32, 0), (64, 32), (32, 64), (0, 32)], fill=(255, 255, 255, 255))
put('hud.diamond', dia, 730, 300, 'generated')
hs = save_webp(hud, 'atlas.hud.webp', lossless=True)
if hs > 90 * 1024: hs = save_webp(hud, 'atlas.hud.webp', q=90)
json.dump({'frames': {n: {'frame': {'x': f['x'], 'y': f['y'], 'w': f['w'], 'h': f['h']}} for n, f in hframes.items()},
           'meta': {'image': 'atlas.hud.webp', 'size': {'w': HW, 'h': 840}, 'scale': 1}},
          open(OUT + 'atlas.hud.json', 'w'), separators=(',', ':'))
rec('atlas.hud', 'assets/atlas.hud.webp', HW, 840, True, 'generated',
    note='图集容器；全部为程序绘制的粒子/光标/遮罩（非 AI、非官方，按 generated 记）；帧坐标 assets/atlas.hud.json')
for n, f in hframes.items():
    rec(n, 'assets/atlas.hud.webp', f['w'], f['h'], True, 'generated', atlas='atlas.hud')

# ---------------------------------------------------------------- 缎带遮罩（maskWipe 剪影，1280×720 单色）
s = 2
rb = Image.new('L', (1280 * s, 720 * s), 0); d = ImageDraw.Draw(rb)
def band(y0, amp, thick, phase):
    top, bot = [], []
    for i in range(0, 1281 * s, 8):
        t = i / (1280 * s)
        yc = (y0 + amp * math.sin(t * math.pi * 1.6 + phase) - 260 * t) * s
        th = thick * s * (0.6 + 0.4 * math.sin(t * math.pi))
        top.append((i, yc - th / 2)); bot.append((i, yc + th / 2))
    d.polygon(top + bot[::-1], fill=255)
band(560, 70, 230, 0.0); band(380, 90, 150, 1.2); band(780, 60, 170, 2.1)
rb = rb.resize((1280, 720), Image.LANCZOS)
rbm = Image.new('RGBA', (1280, 720), (255, 255, 255, 0)); rbm.putalpha(rb)
sz_rb = save_webp(rbm, 'mask.ribbon.webp', q=70)
rec('mask.ribbon', 'assets/mask.ribbon.webp', 1280, 720, True, 'generated', note='程序绘制单色缎带剪影（maskWipe），非 AI、非官方，按 generated 记')

# ---------------------------------------------------------------- 全屏图
def cover(im, W, Hh):
    sc = max(W / im.width, Hh / im.height)
    im = im.resize((math.ceil(im.width * sc), math.ceil(im.height * sc)), Image.LANCZOS)
    l = (im.width - W) // 2; t = (im.height - Hh) // 2
    return im.crop((l, t, l + W, t + Hh))
ci = Image.open(G + 'pk_cutin_a.png').convert('RGB')
ci = cover(ci, 1280, 320)
sz_ci = save_webp(ci, 'cutin.hamuko.webp', q=86)
rec('cutin.hamuko', 'assets/cutin.hamuko.webp', 1280, 320, True, 'generated', note='女主 cut-in 带（与立绘/总攻定格同一人物设定）')
fin = cover(Image.open(G + 'pk_finish_a.png').convert('RGB'), 1280, 720)
sz_fin = save_webp(fin, 'allout.finish.default.webp', q=86)
rec('allout.finish.default', 'assets/allout.finish.default.webp', 1280, 720, True, 'generated', note='总攻定格画：粉白高光版式，右侧女主')

def unblue(im):
    """Theurgy 原图背景有蓝色，色相 180–260° 的像素转到玫红（≈335°）。"""
    hsv = im.convert('HSV'); h, s_, v = hsv.split()
    hp = h.load(); sp_ = s_.load()
    for yy in range(im.height):
        for xx in range(im.width):
            hh = hp[xx, yy]
            if 120 <= hh <= 190 and sp_[xx, yy] > 40:
                hp[xx, yy] = 236; sp_[xx, yy] = int(sp_[xx, yy] * 0.75)
    return Image.merge('HSV', (h, s_, v)).convert('RGB')
th = cover(unblue(Image.open(G + 'pk_theurgy_a.png').convert('RGB')), 1280, 720)
sz_th = save_webp(th, 'highlight.hamuko.webp', q=78)
rec('highlight.hamuko', 'assets/highlight.hamuko.webp', 1280, 720, False, 'generated', note='Theurgy 必杀定格画（延迟包）；背景蓝色已转玫红')

# ---------------------------------------------------------------- 背景（≥2240 宽：中段原图 + 两侧镜像出血）
def widen(im, W=2240, Hh=720):
    im = im.resize((round(im.width * Hh / im.height), Hh), Image.LANCZOS)
    pad = (W - im.width + 1) // 2
    out = Image.new('RGB', (W, Hh))
    out.paste(im, (pad, 0))
    left = ImageOps.mirror(im.crop((0, 0, pad, Hh))); right = ImageOps.mirror(im.crop((im.width - pad, 0, im.width, Hh)))
    out.paste(left, (0, 0)); out.paste(right, (pad + im.width, 0))
    return out

def darkhour(im):
    """影时间预烘焙：压暗 + 绿黑阴影 + 保留少量玫红高光（P3 影时间绿调的粉皮版本）。"""
    g = ImageEnhance.Color(im).enhance(0.35)
    g = ImageEnhance.Brightness(g).enhance(0.62)
    r, gg, b = g.split()
    r = r.point(lambda v: int(v * 0.78)); gg = gg.point(lambda v: min(255, int(v * 1.08 + 10))); b = b.point(lambda v: int(v * 0.80 + 6))
    g = Image.merge('RGB', (r, gg, b))
    # 原图高光里的粉色以 30% 回混（月光玫红残留）
    mask = ImageOps.grayscale(im).point(lambda v: 0 if v < 170 else int((v - 170) * 1.2))
    g.paste(Image.blend(g, im, 0.5), (0, 0), mask)
    return g

for key, srcf, fp in (('battle', 'pk_bg_battle.png', True), ('hub', 'pk_bg_hub.png', False)):
    im = widen(Image.open(G + srcf).convert('RGB'))
    a = save_webp(im, f'bg.{key}.webp', q=82 if fp else 75)
    b = save_webp(darkhour(im), f'bg.{key}.darkhour.webp', q=78 if fp else 72)
    rec(f'bg.{key}', f'assets/bg.{key}.webp', 2240, 720, fp, 'generated', note='中段 1290 原图 + 两侧镜像出血，宽 2240')
    rec(f'bg.{key}.darkhour', f'assets/bg.{key}.darkhour.webp', 2240, 720, fp, 'generated', note=f'bg.{key} 的影时间预烘焙版（bakedSwap 用）')
tile = Image.open(G + 'pk_bg_map.png').convert('RGB').resize((512, 512), Image.LANCZOS)
save_webp(tile, 'bg.map.tile.webp', q=75)
save_webp(darkhour(tile), 'bg.map.tile.darkhour.webp', q=72)
rec('bg.map.tile', 'assets/bg.map.tile.webp', 512, 512, False, 'generated', note='可平铺地图底纹（满足出血：平铺）')
rec('bg.map.tile.darkhour', 'assets/bg.map.tile.darkhour.webp', 512, 512, False, 'generated', note='bg.map.tile 影时间预烘焙版')

# ---------------------------------------------------------------- 延迟：天鹅绒提奥（generated）、女主全身大图不另出（已在图集）
theo = defringe(fit_h(Image.open('/workspace/pkcache-umbra/p3r-art/gen/theo-p3r-gen.png').convert('RGBA'), H))
save_webp(theo, 'npc.theodore.webp', q=80)
rec('npc.theodore', 'assets/npc.theodore.webp', theo.width, H, False, 'generated', note='天鹅绒看守提奥多亚（P3R 画风生成，P3R 无官方图），延迟包')

# ---------------------------------------------------------------- 字体子集（Barlow Condensed，OFL）
LATIN = ''.join(chr(c) for c in range(0x20, 0x7f)) + '·×—–…★♥'
NUM = '0123456789,.+-%×x/: '
FS = WT + '/public/fonts/barlow/'
subprocess.run(['pyftsubset', FS + 'bc-i800.woff2', f'--text={LATIN}', '--flavor=woff2', '--layout-features=kern,liga',
                f'--output-file={OUT}fonts/display.woff2'], check=True)
subprocess.run(['pyftsubset', FS + 'bc-800.woff2', f'--text={NUM}', '--flavor=woff2', '--layout-features=kern,tnum',
                f'--output-file={OUT}fonts/number.woff2'], check=True)
subprocess.run(['cp', FS + 'OFL-Barlow.txt', OUT + 'fonts/OFL-Barlow.txt'], check=True)
fonts = [dict(family='PinkP3RDisplay', file='assets/fonts/display.woff2', chars=LATIN, role='display', pack='first'),
         dict(family='PinkP3RNumber', file='assets/fonts/number.woff2', chars=NUM, role='number', pack='first')]

json.dump(dict(assets=REC, fonts=fonts, persons=persons), open(P + '/work/umbra/build/skin-pink/assets.json', 'w'), ensure_ascii=False, indent=1)
print('persons', json.dumps(persons))
for f in sorted(os.listdir(OUT)):
    p = OUT + f
    if os.path.isfile(p): print(f'{f:36s} {os.path.getsize(p)/1024:8.1f} KB')
for f in sorted(os.listdir(OUT + 'fonts')): print('fonts/' + f, round(os.path.getsize(OUT + 'fonts/' + f) / 1024, 1))
