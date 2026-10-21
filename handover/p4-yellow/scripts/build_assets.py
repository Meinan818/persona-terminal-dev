#!/usr/bin/env python3
"""p4-yellow 皮肤素材构建（可重跑）。输出到 worktree src/umbra/skins/p4-yellow/assets/。
来源：OFF = umbra-demo/assets/p4/official（Megami Tensei Wiki 官方渲染，见其 ASSETS.md），
GEN = work/p4y/gen（generate_image 生成），程序绘制部分在本脚本内。"""
import json, math, os, io, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageChops

P = '/workspace/projects/86a5b727-7f71-46d0-bb30-e183f98dd9ca'
OFF = P + '/work/umbra/build/umbra-demo/assets/p4/official/'
GEN = P + '/work/p4y/gen/'
OUT = P + '/work/wt/p4-yellow/src/umbra/skins/p4-yellow/assets/'
os.makedirs(OUT, exist_ok=True)
YEL = (255, 226, 0)
INK = (17, 17, 17)
REPORT = {}


def save_webp(im, name, q=80, alpha_q=90, limit=None):
    for qq in range(q, 40, -4):
        b = io.BytesIO()
        im.save(b, 'WEBP', quality=qq, alpha_quality=alpha_q, method=6)
        if limit is None or b.tell() <= limit * 1024:
            break
    open(OUT + name, 'wb').write(b.getvalue())
    REPORT[name] = dict(w=im.width, h=im.height, kb=round(b.tell() / 1024, 1), q=qq)
    return im


def halftone(w, h, step=10, rmax=3.2, angle=0.4, color=INK, grad=None):
    """网点层（RGBA）。grad: 函数(x,y)->0..1 控制点大小。"""
    s = 2
    im = Image.new('L', (w * s, h * s), 0)
    d = ImageDraw.Draw(im)
    ca, sa = math.cos(angle), math.sin(angle)
    R = int(math.hypot(w, h))
    for gy in range(-R, R, step):
        for gx in range(-R, R, step):
            x = gx * ca - gy * sa + w / 2
            y = gx * sa + gy * ca + h / 2
            if -step < x < w + step and -step < y < h + step:
                k = grad(x / w, y / h) if grad else 1
                r = rmax * k
                if r > 0.3:
                    d.ellipse([(x - r) * s, (y - r) * s, (x + r) * s, (y + r) * s], fill=255)
    im = im.resize((w, h), Image.LANCZOS)
    out = Image.new('RGBA', (w, h), color + (0,))
    out.putalpha(im)
    return out


# ---------------- 1. 背景 ----------------
def bg(src, name, crop=None, limit=200):
    im = Image.open(GEN + src).convert('RGB')
    if crop:
        im = im.crop(crop)
    r = 2240 / im.width
    im = im.resize((2240, round(im.height * r)), Image.LANCZOS)
    save_webp(im, name, 78, limit=limit)


bg('gen-bg-battle-wide.png', 'bg-battle.webp')
bg('gen-bg-map-wide.png', 'bg-map.webp')
bg('gen-bg-hub-wide.png', 'bg-hub.webp', crop=(28, 30, 1584 - 28, 672 - 30))

# ---------------- 2. 立绘图集 ----------------
PORTS = {  # 源文件, 头层矩形 [x0,x1,yCut]（640 高局部像素）
    'hero': ('hero-portrait.png', (80, 230, 138)),
    'yosuke': ('party-1.png', (170, 350, 146)),
    'chie': ('party-2.png', (95, 262, 136)),
    'yukiko': ('party-3.png', (98, 268, 132)),
}
OVER = 10
layers = []  # (frameName, img, offset(x,y), sourceSize)
port_meta = {}
for k, (f, (x0, x1, yc)) in PORTS.items():
    im = Image.open(OFF + f).convert('RGBA')
    im = im.crop(im.getbbox())
    r = 640 / im.height
    im = im.resize((round(im.width * r), 640), Image.LANCZOS)
    head = im.crop((x0, 0, x1, yc + OVER))
    body = im.copy()
    a = body.getchannel('A')
    ImageDraw.Draw(a).rectangle([x0, 0, x1 - 1, yc - 1], fill=0)
    body.putalpha(a)
    for nm, L, off in (('body', body, (0, 0)), ('head', head, (x0, 0))):
        bb = L.getbbox()
        Lc = L.crop(bb)
        layers.append((f'unit.{k}.{nm}', Lc, (off[0] + bb[0], off[1] + bb[1]), im.size))
    port_meta[k] = dict(size=im.size)
    # 单人体积估算（两层分别编码）
    kb = 0
    for nm in ('body', 'head'):
        L = [l for l in layers if l[0] == f'unit.{k}.{nm}'][0][1]
        b = io.BytesIO(); L.save(b, 'WEBP', quality=80, alpha_quality=90, method=6); kb += b.tell()
    port_meta[k]['kb_est'] = round(kb / 1024, 1)


def pack(items, W, pad=2):
    """简单货架打包，返回 {name:(x,y)} 和高度。"""
    items = sorted(items, key=lambda t: -t[1].height)
    x = y = sh = 0
    pos = {}
    for nm, img, *_ in items:
        if x + img.width + pad > W:
            x = 0; y += sh + pad; sh = 0
        pos[nm] = (x, y); x += img.width + pad; sh = max(sh, img.height)
    return pos, y + sh


def write_atlas(items, W, fname, q=80, limit=None):
    pos, H = pack(items, W)
    H = 1 << (H - 1).bit_length() if H > 1 else 1
    assert W <= 2048 and H <= 2048, (W, H)
    at = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    frames = {}
    for nm, img, off, ss in items:
        x, y = pos[nm]
        at.paste(img, (x, y))
        frames[nm] = {'frame': {'x': x, 'y': y, 'w': img.width, 'h': img.height}, 'rotated': False,
                      'trimmed': off != (0, 0) or img.size != ss,
                      'spriteSourceSize': {'x': off[0], 'y': off[1], 'w': img.width, 'h': img.height},
                      'sourceSize': {'w': ss[0], 'h': ss[1]}}
    save_webp(at, fname + '.webp', q, limit=limit)
    json.dump({'frames': frames, 'meta': {'image': fname + '.webp', 'size': {'w': W, 'h': H}, 'scale': '1',
               'format': 'RGBA8888'}}, open(OUT + fname + '.json', 'w'), ensure_ascii=False, separators=(',', ':'))
    return frames, (W, H)


port_frames, port_size = write_atlas(layers, 2048, 'atlas-portraits', 80, limit=240)

# ---------------- 3. cut-in 带（1280×320） ----------------
cut = Image.new('RGBA', (1280, 320), YEL + (255,))
d = ImageDraw.Draw(cut)
random.seed(4)
for i in range(46):  # 黑色速度条（横向）
    y = random.randint(0, 320); h = random.choice([2, 3, 5, 8])
    x0 = random.randint(-200, 700)
    d.polygon([(x0, y), (1280, y - h), (1280, y + h), (x0, y)], fill=INK + (255,))
cut.alpha_composite(halftone(1280, 320, 9, 3.0, 0.6, (230, 120, 0), lambda u, v: max(0, 1 - u * 1.4)))
eyes = Image.open(OFF + 'hero-cutin.png').convert('RGBA')
eyes = eyes.resize((1280, 320), Image.LANCZOS)
cut.alpha_composite(eyes, (120, 0))
d = ImageDraw.Draw(cut)
d.rectangle([0, 0, 1279, 7], fill=INK + (255,)); d.rectangle([0, 312, 1279, 319], fill=INK + (255,))
save_webp(cut.convert('RGB'), 'cutin-hero.webp', 80, limit=120)


# ---------------- 4. 总攻定格画：黄底黑线漫画多格（1280×720） ----------------
def fit(img, box_w, box_h, mode='cover', anchor=(0.5, 0.0)):
    img = img.crop(img.getbbox())
    r = (max if mode == 'cover' else min)(box_w / img.width, box_h / img.height)
    img = img.resize((max(1, round(img.width * r)), max(1, round(img.height * r))), Image.LANCZOS)
    x = round((box_w - img.width) * anchor[0]); y = round((box_h - img.height) * anchor[1])
    c = Image.new('RGBA', (box_w, box_h), (0, 0, 0, 0)); c.alpha_composite(img, (x, y)) if x >= 0 and y >= 0 else c.paste(img, (x, y), img)
    return c


def panel_bg(w, h, base, ink, burst_center=None, seed=0):
    p = Image.new('RGBA', (w, h), base + (255,))
    d = ImageDraw.Draw(p)
    rnd = random.Random(seed)
    cx, cy = burst_center or (w * 0.5, h * 0.5)
    for i in range(70):  # 集中线
        a = rnd.uniform(0, 2 * math.pi); wd = rnd.uniform(0.006, 0.02)
        R = max(w, h) * 1.5; r0 = rnd.uniform(0.28, 0.45) * min(w, h)
        d.polygon([(cx + r0 * math.cos(a), cy + r0 * math.sin(a)),
                   (cx + R * math.cos(a - wd), cy + R * math.sin(a - wd)),
                   (cx + R * math.cos(a + wd), cy + R * math.sin(a + wd))], fill=ink + (255,))
    p.alpha_composite(halftone(w, h, 13, 3.6, 0.785, ink, lambda u, v: max(0, min(1, (math.hypot(u - .5, v - .5) - .28) * 3.2))))
    return p


def poly_mask(size, pts):
    m = Image.new('L', size, 0); ImageDraw.Draw(m).polygon(pts, fill=255); return m


fin = Image.new('RGBA', (1280, 720), INK + (255,))
full = {k: Image.open(OFF + f).convert('RGBA') for k, (f, _) in PORTS.items()}
action = Image.open(OFF + 'allout-hero.png').convert('RGBA')
# 格子多边形（黑色粗分格线 = 留出的缝）
panels = [
    ('hero', [(14, 14), (700, 14), (590, 706), (14, 706)], YEL, INK),
    ('yosuke', [(716, 14), (1266, 14), (1266, 236), (680, 236)], (255, 255, 255), INK),
    ('chie', [(678, 252), (1266, 252), (1266, 472), (642, 472)], YEL, INK),
    ('yukiko', [(640, 488), (1266, 488), (1266, 706), (606, 706)], (255, 255, 255), INK),
]
for k, pts, base, ink in panels:
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    bx, by, bw, bh = min(xs), min(ys), max(xs) - min(xs), max(ys) - min(ys)
    pb = panel_bg(bw, bh, base, ink, (bw * 0.55, bh * 0.45), seed=len(k))
    if k == 'hero':
        fig = fit(action, bw, bh, 'contain', (0.45, 0.5))
        fig = fit(action.crop(action.getbbox()), int(bw * 1.05), int(bh * 1.0), 'contain', (0.5, 0.5))
        pb.alpha_composite(fig.crop((0, 0, bw, bh)) if fig.size != (bw, bh) else fig)
    else:
        x0, x1, yc = PORTS[k][1]
        src = full[k]; src = src.crop(src.getbbox()); r = src.height / 640
        cx = (x0 + x1) / 2 * r; hw = (x1 - x0) * 1.25 * r
        bust = src.crop((int(max(0, cx - hw)), 0, int(min(src.width, cx + hw)), int(yc * 1.7 * r)))  # 头+肩
        fig = fit(bust, bw, bh, 'contain', (0.62, 0.0))
        pb.alpha_composite(fig)
    m = poly_mask((bw, bh), [(x - bx, y - by) for x, y in pts])
    fin.paste(pb, (bx, by), m)
# 外框白描边（漫画格线）
d = ImageDraw.Draw(fin)
for k, pts, *_ in panels:
    d.line(pts + [pts[0]], fill=(255, 255, 255, 255), width=4)
save_webp(fin.convert('RGB'), 'allout-finish.webp', 80, limit=200)

# ---------------- 5. 必杀定格画（延迟包）：伊邪那岐 + 主角 ----------------
hl = panel_bg(1280, 720, YEL, INK, (760, 330), seed=9)
iza = Image.open(OFF + 'persona-main.png').convert('RGBA')
hl.alpha_composite(fit(iza, 1280, 760, 'contain', (0.78, 0.0)).crop((0, 0, 1280, 720)))
hl.alpha_composite(fit(action, 700, 720, 'contain', (0.2, 1.0)), (40, 0))
d = ImageDraw.Draw(hl)
d.polygon([(0, 0), (1280, 0), (1280, 30), (0, 70)], fill=INK + (255,))
d.polygon([(0, 690), (1280, 650), (1280, 720), (0, 720)], fill=INK + (255,))
save_webp(hl.convert('RGB'), 'highlight-hero.webp', 80, limit=200)

# ---------------- 6. 敌人（延迟包） ----------------
en = Image.open(OFF + 'enemy-1.png').convert('RGBA'); en = en.crop(en.getbbox()); en.thumbnail((560, 560), Image.LANCZOS)
save_webp(en, 'enemy-calm-pesce.webp', 80, limit=60)

# ---------------- 7. HUD/FX 图集（程序绘制） ----------------
hud = []


def add(nm, img):
    hud.append((nm, img, (0, 0), img.size))


rng = np.random.default_rng(7)
for i in range(2):  # 电视雪花 256²
    n = rng.integers(0, 256, (256, 256), dtype=np.uint8)
    n[::3, :] = (n[::3, :] * 0.55).astype(np.uint8)  # 扫描线
    tint = np.stack([n, n, (n * 0.85).astype(np.uint8), np.full_like(n, 255)], -1)
    add(f'fx.tvstatic.{i}', Image.fromarray(tint, 'RGBA'))
# 推屏方块 128²（黄块黑边 + 电视格子高光）
b = Image.new('RGBA', (128, 128), YEL + (255,)); d = ImageDraw.Draw(b)
d.rectangle([0, 0, 127, 127], outline=INK + (255,), width=6); d.rectangle([14, 14, 40, 22], fill=(255, 250, 200, 255))
add('fx.block', b)
b2 = Image.new('RGBA', (128, 128), INK + (255,)); ImageDraw.Draw(b2).rectangle([0, 0, 127, 127], outline=YEL + (255,), width=4)
add('fx.block.ink', b2)


def star(r=30, col=YEL, out=INK):
    s = Image.new('RGBA', (r * 2 + 8, r * 2 + 8)); d = ImageDraw.Draw(s); c = r + 4
    pts = [(c + (r if i % 2 == 0 else r * 0.45) * math.cos(-math.pi / 2 + i * math.pi / 5),
            c + (r if i % 2 == 0 else r * 0.45) * math.sin(-math.pi / 2 + i * math.pi / 5)) for i in range(10)]
    d.polygon(pts, fill=col + (255,), outline=out + (255,)); d.line(pts + [pts[0]], fill=out + (255,), width=4)
    return s


add('fx.star', star())
add('fx.star.white', star(22, (255, 255, 255)))
# 卡通尘团（总攻）
dust = Image.new('RGBA', (160, 120)); d = ImageDraw.Draw(dust)
for (x, y, r) in [(50, 70, 38), (90, 55, 44), (125, 75, 30), (70, 40, 30), (40, 90, 26), (110, 95, 28)]:
    d.ellipse([x - r - 4, y - r - 4, x + r + 4, y + r + 4], fill=INK + (255,))
for (x, y, r) in [(50, 70, 38), (90, 55, 44), (125, 75, 30), (70, 40, 30), (40, 90, 26), (110, 95, 28)]:
    d.ellipse([x - r, y - r, x + r, y + r], fill=(250, 245, 230, 255))
add('fx.dust', dust)
# 斜条 streak
st = Image.new('RGBA', (128, 12)); ImageDraw.Draw(st).polygon([(0, 6), (128, 0), (128, 12)], fill=(255, 255, 255, 255)); add('fx.streak', st)
sp = Image.new('RGBA', (32, 32)); ImageDraw.Draw(sp).polygon([(16, 0), (20, 12), (32, 16), (20, 20), (16, 32), (12, 20), (0, 16), (12, 12)], fill=(255, 255, 255, 255)); add('fx.spark', sp)
sq = Image.new('RGBA', (20, 20), YEL + (255,)); ImageDraw.Draw(sq).rectangle([0, 0, 19, 19], outline=INK + (255,), width=3); add('fx.square', sq)
# 雏菊（P4R 菜单）
def daisy(col):
    s = Image.new('RGBA', (64, 64)); d = ImageDraw.Draw(s)
    for i in range(6):
        a = i * math.pi / 3; x = 32 + 17 * math.cos(a); y = 32 + 17 * math.sin(a)
        d.ellipse([x - 11, y - 11, x + 11, y + 11], fill=col + (255,), outline=INK + (255,), width=3)
    d.ellipse([22, 22, 42, 42], fill=YEL + (255,) if col != YEL else (255, 140, 0, 255), outline=INK + (255,), width=3)
    return s
add('fx.daisy.white', daisy((255, 255, 255))); add('fx.daisy.yellow', daisy(YEL))
# 指令方块底板（P4 电视方块）：主 112×112，次 96×96（实际命中区由 slots 定义）
for nm, sz in (('hud.cmd.main', 112), ('hud.cmd.sub', 96)):
    t = Image.new('RGBA', (sz, sz)); d = ImageDraw.Draw(t)
    d.rounded_rectangle([3, 3, sz - 4, sz - 4], 10, fill=INK + (255,)); d.rounded_rectangle([9, 9, sz - 10, sz - 10], 6, fill=YEL + (255,))
    d.rectangle([9, sz - 26, sz - 10, sz - 10], fill=(235, 200, 0, 255))
    add(nm, t)
    t2 = t.copy(); d2 = ImageDraw.Draw(t2); d2.rounded_rectangle([9, 9, sz - 10, sz - 10], 6, fill=(255, 255, 255, 255)); add(nm + '.on', t2)
# 日期/天气牌底（P4 右上日历框）
dp = Image.new('RGBA', (240, 66)); d = ImageDraw.Draw(dp)
d.polygon([(8, 0), (240, 0), (232, 66), (0, 66)], fill=INK + (255,)); d.polygon([(14, 6), (176, 6), (170, 60), (8, 60)], fill=YEL + (255,))
add('hud.datePlate', dp)
# 天气图标 56²
def wicon(kind):
    s = Image.new('RGBA', (56, 56)); d = ImageDraw.Draw(s); W = (255, 255, 255, 255); K = INK + (255,)
    def cloud(dy=0, col=W):
        for (x, y, r) in [(20, 30 + dy, 12), (32, 24 + dy, 14), (42, 32 + dy, 10)]:
            d.ellipse([x - r - 2, y - r - 2, x + r + 2, y + r + 2], fill=K)
        for (x, y, r) in [(20, 30 + dy, 12), (32, 24 + dy, 14), (42, 32 + dy, 10)]:
            d.ellipse([x - r, y - r, x + r, y + r], fill=col)
    if kind == 'clear':
        d.ellipse([12, 12, 44, 44], fill=(255, 150, 0, 255), outline=K, width=3)
    elif kind == 'cloudy': cloud()
    elif kind in ('rain', 'storm'):
        cloud(-6, (200, 200, 210, 255))
        for x in (18, 30, 42): d.line([(x, 40), (x - 4, 52)], fill=(40, 120, 255, 255), width=3)
        if kind == 'storm': d.polygon([(30, 30), (22, 44), (30, 44), (26, 56), (38, 40), (30, 40)], fill=YEL + (255,), outline=K)
    elif kind == 'snow':
        cloud(-6)
        for x in (18, 30, 42): d.ellipse([x - 3, 44, x + 3, 50], fill=W, outline=K)
    elif kind == 'fog':
        for y in (18, 28, 38): d.rounded_rectangle([8, y, 48, y + 6], 3, fill=(250, 235, 120, 255), outline=K, width=2)
    else:
        d.ellipse([10, 10, 46, 46], outline=K, width=4); d.text((24, 18), '?', fill=K)
    return s
for k in ('clear', 'cloudy', 'rain', 'storm', 'snow', 'fog', 'unknown'):
    add(f'hud.weather.{k}', wicon(k))
# 敌人弱点/护盾小件
wk = Image.new('RGBA', (40, 40)); ImageDraw.Draw(wk).polygon([(20, 0), (40, 20), (20, 40), (0, 20)], fill=YEL + (255,), outline=INK + (255,)); add('hud.enemy.weak', wk)
sh = Image.new('RGBA', (28, 32)); ImageDraw.Draw(sh).polygon([(14, 0), (28, 6), (24, 24), (14, 32), (4, 24), (0, 6)], fill=(255, 255, 255, 255), outline=INK + (255,)); add('hud.enemy.shield', sh)
# 雷击（Zio 系）
bolt = Image.new('RGBA', (120, 360)); ImageDraw.Draw(bolt).polygon([(70, 0), (20, 170), (60, 170), (10, 360), (110, 140), (66, 140), (100, 0)], fill=(255, 255, 230, 255), outline=YEL + (255,)); add('fx.bolt', bolt)
# 斩击弧
arc = Image.new('RGBA', (360, 360)); d = ImageDraw.Draw(arc)
d.arc([10, 10, 350, 350], 200, 340, fill=(255, 255, 255, 255), width=18); d.arc([10, 10, 350, 350], 210, 330, fill=YEL + (255,), width=6); add('fx.slashArc', arc)
# 遮罩剪影：电视机外形（maskWipe 用，单色）
tv = Image.new('RGBA', (256, 200)); d = ImageDraw.Draw(tv)
d.rounded_rectangle([0, 20, 256, 200], 22, fill=(255, 255, 255, 255)); d.line([(90, 0), (128, 24), (166, 0)], fill=(255, 255, 255, 255), width=8)
add('fx.tvMask', tv)

hud_frames, hud_size = write_atlas(hud, 1024, 'atlas-hud', 82, limit=140)

json.dump({'report': REPORT, 'portraits': port_meta, 'portFrames': list(port_frames), 'hudFrames': list(hud_frames),
           'portAtlas': port_size, 'hudAtlas': hud_size}, open(P + '/work/p4y/assets_report.json', 'w'), ensure_ascii=False, indent=1)
print(json.dumps(REPORT, indent=1)); print(port_meta); print(port_size, hud_size)
