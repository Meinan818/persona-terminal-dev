# M3 第二阶段：队伍名单驱动的角色素材（官方 ATLUS/SEGA 图 = 私有自用；背影为 generate_image 伪官方）。
# 输出（src/umbra/skins/p5r-red/assets/）：
#   head.<id>.webp   320x160  [ink 160 | color 160]   —— 首包只装当前队伍 + oracle
#   char.<id>.webp   1280x1120 atlas: cutin 1280x320 / bust 400 / nomask 400 / mask 400 / body 300x400 —— 懒加载
#   back.<id>.webp   场上背影（高 640）—— 懒加载
#   persona.<id>.webp 人格面具（蓝焰描边 + 辉光烘焙）—— 懒加载
#   show.<pair>.webp SHOWTIME 定格画 1280x720 —— 懒加载
# 行信息写 work/party-assets.json（build_manifest 合并），来源逐张记录。
from PIL import Image, ImageOps, ImageFilter, ImageEnhance, ImageChops, ImageDraw
import numpy as np
from scipy import ndimage
import os, json
ROOT = os.path.join(os.path.dirname(__file__), '..')
F = os.path.join(ROOT, 'work', 'party-src', 'fandom') + '/'
G = os.path.join(ROOT, 'work', 'gen') + '/'
O = '/workspace/work/umbra-red/red/assets/official/'
D = os.path.join(ROOT, 'src', 'umbra', 'skins', 'p5r-red', 'assets')
SRC = json.load(open(F + 'sources.json'))
rows = []
# ONLY=chars,show,bg,finish 只重做部分（其余行沿用 work/party-assets.json）——整跑 >2 分钟
ONLY = set(filter(None, os.environ.get('ONLY', 'chars,show,bg,finish').split(',')))
if ONLY != {'chars', 'show', 'bg', 'finish'}: rows = json.load(open(os.path.join(ROOT, 'work', 'party-assets.json')))

def save(im, name, q=80, source='official', note='', group=None, frames=None, first=False):
    p = os.path.join(D, name + '.webp')
    im.save(p, 'WEBP', quality=q, method=6)
    r = dict(id=name, file='assets/' + name + '.webp', w=im.width, h=im.height, firstPack=first, source=source, note=note,
             kb=round(os.path.getsize(p) / 1024, 1))
    if group: r['group'] = group
    if frames: r['frames'] = frames; r['atlas'] = name
    rows[:] = [x for x in rows if x['id'] != name]; rows.append(r); print(name, im.size, r['kb'], 'KB')

def tight(im):
    bb = im.getbbox(); return im.crop(bb) if bb else im
def fit(im, box):
    im = im.copy(); im.thumbnail(box, Image.LANCZOS); return im
def src(k):
    s = SRC[k]; return f"{s['title']} — {s['page']}"
def key_white(im, thr=242):
    """白底抠图：从四角 flood fill 近白像素 → 透明"""
    im = im.convert('RGBA'); w, h = im.size
    m = Image.new('L', (w + 2, h + 2), 0)
    g = ImageOps.grayscale(im.convert('RGB')).point(lambda v: 255 if v >= thr else 0)
    gg = Image.new('L', (w + 2, h + 2), 255); gg.paste(g, (1, 1))
    ImageDraw.floodfill(gg, (0, 0), 128)
    bgm = gg.point(lambda v: 255 if v == 128 else 0).crop((1, 1, w + 1, h + 1)).filter(ImageFilter.MaxFilter(3))
    a = ImageChops.subtract(im.split()[-1], bgm)
    im.putalpha(a); return im


def despill(im):
    """generate_image 绿幕边缘去绿：G 通道压到 max(R,B)，半透明边缘再收 1px"""
    a = np.asarray(im.convert('RGBA')).astype(int)
    g = np.minimum(a[..., 1], np.maximum(a[..., 0], a[..., 2]) + 12); a[..., 1] = g
    out = Image.fromarray(a.astype('uint8'), 'RGBA')
    al = out.split()[-1].point(lambda v: 0 if v < 40 else v).filter(ImageFilter.MinFilter(3))
    out.putalpha(al); return out

def toon(im):
    """场上背影统一成 P5R 3D 卡通模型观感：外描边（黑 4px）+ 右侧（敌人方向）红色轮廓光 + 左侧背光压暗"""
    im = im.convert('RGBA'); w, h = im.size; pad = 6
    c = Image.new('RGBA', (w + pad * 2, h + pad * 2), (0, 0, 0, 0)); c.paste(im, (pad, pad), im)
    a = c.split()[-1]
    out = Image.new('RGBA', c.size, (8, 6, 8, 0)); out.putalpha(a.filter(ImageFilter.MaxFilter(7)))
    rgb = np.asarray(c).astype(float)
    xs = np.linspace(0, 1, c.width)[None, :, None]
    rgb[..., :3] *= (0.80 + 0.22 * xs)                        # 左暗右亮（主光来自敌方/右上）
    an = np.asarray(a).astype(float) / 255
    sh = np.zeros_like(an); sh[:, :-5] = an[:, 5:]           # 向右偏移的轮廓：本体右缘 = an - an(右移)
    rim = np.clip(an - sh, 0, 1)[..., None] * (an[..., None] > 0.5)
    rim = np.asarray(Image.fromarray((rim[..., 0] * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(1.2))).astype(float)[..., None] / 255
    rgb[..., :3] = rgb[..., :3] * (1 - rim * 0.85) + np.array([255, 40, 48]) * rim * 0.85
    body = Image.fromarray(np.clip(rgb, 0, 255).astype('uint8'), 'RGBA')
    out.alpha_composite(body); return out

def ink(im):
    a = im.split()[-1]
    g = ImageOps.grayscale(im.convert('RGB'))
    g = ImageEnhance.Contrast(g).enhance(1.9)
    g = g.point(lambda v: 0 if v < 72 else (255 if v > 150 else 150 if v > 110 else 0))
    out = Image.merge('RGBA', (g, g, g, a))
    big = a.filter(ImageFilter.MaxFilter(7))
    ol = Image.new('RGBA', im.size, (255, 255, 255, 0)); ol.putalpha(big)
    ol.alpha_composite(out); return ol

def square(im, n):
    im = fit(im, (n, n)); c = Image.new('RGBA', (n, n), (0, 0, 0, 0)); c.paste(im, ((n - im.width) // 2, n - im.height), im); return c

def glow(im, pad=36):
    """人格面具显形：蓝焰描边 + 蓝白辉光（离线烘焙，运行时不占滤镜名额）"""
    im = im.convert('RGBA'); w, h = im.size
    c = Image.new('RGBA', (w + pad * 2, h + pad * 2), (0, 0, 0, 0)); c.paste(im, (pad, pad), im)
    a = c.split()[-1]
    g1 = a.filter(ImageFilter.MaxFilter(15)).filter(ImageFilter.GaussianBlur(14)).point(lambda v: min(255, int(v * 1.25)))
    g2 = a.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.GaussianBlur(3))
    out = Image.new('RGBA', c.size, (40, 110, 255, 0)); out.putalpha(g1)
    rim = Image.new('RGBA', c.size, (170, 225, 255, 0)); rim.putalpha(g2)
    out.alpha_composite(rim)
    # 本体略偏冷（原作显形瞬间被蓝焰映照），保留原色
    body = c.copy(); rgb = body.convert('RGB'); blue = Image.new('RGB', c.size, (60, 120, 255))
    body2 = Image.blend(rgb, blue, 0.12).convert('RGBA'); body2.putalpha(a)
    out.alpha_composite(body2)
    return out

# ---------------------------------------------------------------- roster visuals
CH = {
 # id: masked bust, nomask, cutin, body(front, silhouettes), back, persona, mask box (fractions of bust), mask mode
 'joker':  dict(bust='head.joker', nomask=None, cut=O + 'slots/hero-cutin.webp', body=O + 'slots/hero.webp', back=G + 'joker-back.png', persona='per.arsene2', box=(0.18, 0.27, 0.74, 0.56), mode='bright'),
 'skull':  dict(bust='head.skull', nomask='nomask.skull', cut='cut.skull', body='body.skull', back=G + 'skull-back.png', persona='per.kidd', box=(0.36, 0.26, 0.94, 0.76)),
 'mona':   dict(bust='head.mona', nomask=None, cut='cut.mona', body='body.mona', back=G + 'mona-back.png', persona='per.zorro', box=None),
 'panther':dict(bust='head.panther', nomask='nomask.panther', cut='cut.panther', body='body.panther', back=G + 'panther-back.png', persona='per.carmen', box=(0.18, 0.0, 0.64, 0.44)),
 'fox':    dict(bust='head.fox', nomask='nomask.fox', cut='cut.fox', body='body.fox', back=G + 'fox-back.png', persona='per.goemon', box=(0.30, 0.0, 0.82, 0.68)),
 'queen':  dict(bust='head.queen', nomask='nomask.queen', cut='cut.queen', body='body.queen', back=G + 'queen-back.png', persona='per.johanna', box=(0.16, 0.34, 0.68, 0.68), mode='seg', sat=70, vmin=62, hull=True),
 'noir':   dict(bust='head.noir', nomask='nomask.noir', cut='cut.noir', body='body.noir', back=G + 'noir-back2.png', persona='per.milady', box=(0.13, 0.50, 0.84, 0.69), mode='seg', seg='dark'),
 'crow':   dict(bust='head.crow', nomask=None, cut='cut.crow', body='body.crow', back=G + 'crow-back2.png', persona='per.robin', box=(0.20, 0.0, 0.88, 0.72), mode='all'),
 'violet': dict(bust='head.violet', nomask='nomask.violet', cut='cut.violet', body='body.violet', back=G + 'violet-back.png', persona='per.cendrillon', box=(0.18, 0.38, 0.62, 0.64), mode='seg'),
 'oracle': dict(bust='head.oracle', nomask=None, cut='cut.oracle', body='body.oracle', back=None, persona=None, box=None),
}
def fpath(k):
    if k is None: return None
    if k.startswith('/'): return k
    return F + SRC[k]['file']
def note_of(k):
    if k is None: return '-'
    if k.startswith(O): return '官方素材包 F：' + os.path.basename(k)
    if k.startswith(G): return 'generate_image 伪官方：' + os.path.basename(k)
    return src(k)

def mona_band(im):
    # 原作 Mona 战斗 cut-in 为眼部横条；Fandom 只有对话 cut-in 大头 → 裁眼部区域做成同规格横条
    t = tight(im.convert('RGBA')); w, h = t.size
    band = t.crop((0, int(h * 0.12), w, int(h * 0.12 + w * 0.40)))
    c = Image.new('RGBA', (1280, 320), (0, 0, 0, 0)); b = band.resize((1280, int(1280 * band.height / band.width)), Image.LANCZOS)
    c.paste(b, (0, (320 - b.height) // 2), b); return c

all_src = {}
for cid, d in (CH.items() if 'chars' in ONLY else []):
    bust = Image.open(fpath(d['bust'])).convert('RGBA')
    # head atlas: ink + color
    hi = square(ink(bust), 160); hc = square(bust, 160)
    hat = Image.new('RGBA', (320, 160), (0, 0, 0, 0)); hat.paste(hi, (0, 0), hi); hat.paste(hc, (160, 0), hc)
    save(hat, f'head.{cid}', q=86, note='HUD 头像（黑白墨线 + 彩色）← ' + note_of(d['bust']), group=f'head:{cid}',
         frames={'ink': [0, 0, 160, 160], 'color': [160, 0, 160, 160]})
    if cid == 'oracle':
        cut = Image.open(fpath(d['cut'])).convert('RGBA').resize((1280, 512), Image.LANCZOS).crop((0, 96, 1280, 416))
        save(cut, 'cutin.oracle', q=78, note='导航 cut-in ← ' + note_of(d['cut']), group='char:oracle')
        continue
    atl = Image.new('RGBA', (1280, 1120), (0, 0, 0, 0)); fr = {}
    # cut-in band
    cp = fpath(d['cut'])
    if cid == 'mona': band = mona_band(Image.open(cp))
    else:
        ci = Image.open(cp).convert('RGBA')
        band = ci.resize((1280, int(1280 * ci.height / ci.width)), Image.LANCZOS)
        if band.height > 320: o = (band.height - 320) // 2; band = band.crop((0, o, 1280, o + 320))
    atl.paste(band, (0, 0), band); fr['cutin'] = [0, 0, 1280, 320]
    # bust / nomask / mask piece (same 400 canvas, aligned)
    B = square(bust, 400); atl.paste(B, (0, 320), B); fr['bust'] = [0, 320, 400, 400]
    if d['nomask']:
        nm = Image.open(fpath(d['nomask'])).convert('RGBA').resize(bust.size, Image.LANCZOS)
        N = square(nm, 400); atl.paste(N, (400, 320), N); fr['nomask'] = [400, 320, 400, 400]
    if d.get('mode') == 'seg':
        # 第四阶段：面具精确形状 —— 同姿势官方「戴面具 / 不戴面具」两张立绘逐像素差分 ∩ 面具材质（低饱和金属灰 / 黑），取最大连通块 + 闭运算 + 填洞
        Bn, Nn = np.asarray(B).astype(int), np.asarray(N).astype(int)
        df = np.abs(Bn[..., :3] - Nn[..., :3]).sum(-1)
        hsv = np.asarray(B.convert('RGB').convert('HSV')).astype(int)
        mat = (hsv[..., 2] < 70) if d.get('seg') == 'dark' else ((hsv[..., 1] < d.get('sat', 110)))
        mm = (df > 60) & mat & (Bn[..., 3] > 128)
        mm = ndimage.binary_opening(mm, iterations=1)
        lab, k = ndimage.label(mm)
        if k: sz = ndimage.sum(mm, lab, range(1, k + 1)); mm = lab == (1 + int(np.argmax(sz)))
        mm = ndimage.binary_closing(mm, iterations=2)
        filled = ndimage.binary_fill_holes(mm)
        eyes = filled & ~mm                                    # 被面具包住的区域 = 眼洞（扯下后应透空）
        shape = ndimage.binary_fill_holes(ndimage.binary_closing(filled, iterations=10)) & ~ndimage.binary_dilation(eyes, iterations=1)
        if d.get('hull'):                                      # Queen 面具是凸的金属片：用凸包补齐被刘海切碎的上缘
            from scipy.spatial import ConvexHull
            pts = np.argwhere(filled)[:, ::-1]; hv = pts[ConvexHull(pts).vertices]
            hm = Image.new('L', (filled.shape[1], filled.shape[0]), 0); ImageDraw.Draw(hm).polygon([tuple(map(int, v)) for v in hv], fill=255)
            shape = (np.asarray(hm) > 0) & ~ndimage.binary_dilation(eyes, iterations=1)
        notch = shape & ~filled                                # 刘海遮住的面具上缘：补成面具本色（完整面具被扯下）
        if d.get('hull') and eyes.any():                      # 眼洞以上叠着的深色刘海也刷成面具本色
            top = np.zeros_like(shape); top[: int(np.argwhere(eyes)[:, 0].min()), :] = True
            notch = notch | (shape & top & (hsv[..., 2] < 75))
        ys, xs = np.nonzero(shape); x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
        arr = Bn.copy().astype('uint8'); col = np.median(Bn[mm & ~ndimage.binary_erosion(mm, iterations=3) == False][:, :3], axis=0) if (mm).any() else np.array([60, 60, 60])
        col = np.median(Bn[ndimage.binary_erosion(mm, iterations=3)][:, :3], axis=0)
        arr[notch, :3] = col.astype('uint8'); arr[notch, 3] = 255
        Bf = Image.fromarray(arr, 'RGBA')
        m = Image.fromarray((shape[y0:y1, x0:x1] * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(0.8))
        reg = Bf.crop((x0, y0, x1, y1))
        piece = reg.copy(); piece.putalpha(m)
        ol = Image.new('RGBA', piece.size, (255, 255, 255, 0)); ol.putalpha(m.filter(ImageFilter.MaxFilter(5)))
        ol.alpha_composite(piece)
        atl.paste(ol, (800, 320), ol); fr['mask'] = [800, 320, ol.width, ol.height]; fr['maskAt'] = [x0, y0, ol.width, ol.height]
    elif d['box']:
        bw, bh = fit(bust, (400, 400)).size; ox, oy = (400 - bw) // 2, 400 - bh
        bx = d['box']; x0, y0, x1, y1 = int(ox + bx[0] * bw), int(oy + bx[1] * bh), int(ox + bx[2] * bw), int(oy + bx[3] * bh)
        reg = B.crop((x0, y0, x1, y1))
        if d['nomask'] and d.get('mode') != 'dark':
            df = ImageOps.grayscale(ImageChops.difference(reg.convert('RGB'), N.crop((x0, y0, x1, y1)).convert('RGB')))
            m = df.point(lambda v: 255 if v > 55 else 0).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(11)).filter(ImageFilter.MinFilter(3))
        elif d.get('mode') == 'dark':
            m = ImageOps.grayscale(reg.convert('RGB')).point(lambda v: 255 if v < 60 else 0).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(9))
        elif d.get('mode') == 'bright':
            m = ImageOps.grayscale(reg.convert('RGB')).point(lambda v: 255 if v > 175 else 0).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(1))
        else:
            m = Image.new('L', reg.size, 255)
        if d.get('mode') != 'dark': m = m.filter(ImageFilter.MaxFilter(21)).filter(ImageFilter.MinFilter(21))   # closing：填掉面具内部露脸的洞
        el = Image.new('L', reg.size, 0); ImageDraw.Draw(el).ellipse((0, 0, reg.width - 1, reg.height - 1), fill=255)
        if d.get('mode') != 'all': m = ImageChops.multiply(m, el)
        m = ImageChops.multiply(m.filter(ImageFilter.GaussianBlur(1)), reg.split()[-1])
        piece = reg.copy(); piece.putalpha(m)
        # 白色撕纸描边（原作面具扯下时的高光轮廓）
        ol = Image.new('RGBA', piece.size, (255, 255, 255, 0)); ol.putalpha(m.filter(ImageFilter.MaxFilter(5)))
        ol.alpha_composite(piece)
        atl.paste(ol, (800, 320), ol); fr['mask'] = [800, 320, ol.width, ol.height]; fr['maskAt'] = [x0, y0, ol.width, ol.height]
    # body (front full-body, for hold-up / all-out silhouettes)
    bd = Image.open(fpath(d['body'])).convert('RGBA'); bd = tight(bd)
    bd = fit(bd, (300, 400)); atl.paste(bd, (0, 720), bd); fr['body'] = [0, 720, bd.width, bd.height]
    save(atl, f'char.{cid}', q=80, group=f'char:{cid}', frames=fr,
         note=f"cutin ← {note_of(d['cut'])}{'（对话 cut-in 裁眼部横条）' if cid == 'mona' else ''}；bust/mask ← {note_of(d['bust'])}；nomask ← {note_of(d['nomask'])}；body ← {note_of(d['body'])}")
    # back view on field
    bk = Image.open(d['back']).convert('RGBA')
    if cid == 'fox': bk = key_white(bk)
    if 'back2' in d['back']: bk = despill(bk)
    bk = toon(tight(bk)); save(fit(bk, (640, 640)), f'back.{cid}', q=80, source='generated',
                        note=('generate_image 背影（参考官方 Joker 立绘）' if cid == 'joker' else f"generate_image 伪官方背影（参考 {note_of(d['body'])}）；原作为 3D 模型、无 2D 背影图") + '；第四阶段统一 3D 卡通描边 + 右侧红色轮廓光（离线烘焙）；待替换', group=f'back:{cid}')
    # persona
    pk = d['persona']; pim = Image.open(fpath(pk)).convert('RGBA')
    if pk == 'per.cendrillon':
        pim = key_white(pim); w, h = pim.size; pim = pim.crop((0, 0, int(w * 0.5), h))
    pim = tight(pim); pim = fit(pim, (560, 560))
    save(glow(pim), f'persona.{cid}', q=78, group=f'char:{cid}', note='人格面具 ← ' + note_of(pk) + ('（P5R 官方概念设定图左半，白底抠图）' if pk == 'per.cendrillon' else '（P5S 官方渲染图，同一人格面具）' if pk in ('per.kidd', 'per.zorro', 'per.carmen', 'per.milady') else '') + '；蓝焰描边/辉光离线烘焙')

# showtime stills
for k, pair in [] if 'show' not in ONLY else [('show.morganaann', 'mona-panther'), ('show.ryujiyusuke', 'skull-fox'), ('show.jokerakechi', 'joker-crow'), ('show.jokerkasumi', 'joker-violet'),
                ('show.makotoharu', 'queen-noir'), ('show.morganaharu', 'mona-noir')]:
    im = Image.open(F + SRC[k]['file']).convert('RGB').resize((1280, 720), Image.LANCZOS)
    save(im, f'show.{pair}', q=76, group=f'show:{pair}', note='SHOWTIME 定格画 ← ' + src(k))
# 第四阶段：Joker × Skull SHOWTIME 定格画 —— P5R 原作没有这一组，用两人官方立绘合成（红底放射线 + 黑斜带 + 网点 + 双层描边），标「伪官方·待替换」
def _mx(a, k):
    return Image.fromarray(ndimage.maximum_filter(np.asarray(a), size=k))
def outline(im, w1=8, w2=14):
    a = im.split()[-1]; c = Image.new('RGBA', im.size, (0, 0, 0, 0))
    class _A:
        pass
    k = Image.new('RGBA', im.size, (10, 10, 10, 0)); k.putalpha(_mx(a, w2 | 1)); c.alpha_composite(k)
    wt = Image.new('RGBA', im.size, (255, 255, 255, 0)); wt.putalpha(_mx(a, w1 | 1)); c.alpha_composite(wt)
    c.alpha_composite(im); return c
def padded(im, p=20):
    c = Image.new('RGBA', (im.width + 2 * p, im.height + 2 * p), (0, 0, 0, 0)); c.paste(im, (p, p), im); return c
cv = Image.new('RGBA', (1280, 720), (229, 25, 28, 255)); dr = ImageDraw.Draw(cv)
if 'show' not in ONLY: cv = None
import math
for i in range(36 if cv else 0):
    a0 = i / 36 * math.tau; a1 = a0 + math.tau / 72
    dr.polygon([(820, 300), (820 + 2000 * math.cos(a0), 300 + 2000 * math.sin(a0)), (820 + 2000 * math.cos(a1), 300 + 2000 * math.sin(a1))], fill=(176, 12, 18, 255))
for y in range(0, 720 if cv else 0, 18):
    for x in range(0, 1280, 18):
        r = max(0, 7 - (x + (720 - y)) / 160)
        if r > 0.6: dr.ellipse((x - r, y - r, x + r, y + r), fill=(10, 10, 10, 255))
if 'show' in ONLY:
    dr.polygon([(-40, 720), (520, -40), (760, -40), (200, 720)], fill=(255, 255, 255, 255))
    dr.polygon([(-10, 720), (540, -40), (735, -40), (180, 720)], fill=(10, 10, 10, 255))
    jk = tight(Image.open(O + 'slots/hero.webp').convert('RGBA')); jk = fit(jk, (700, 820))
    sk = tight(Image.open(F + SRC['body.skull']['file']).convert('RGBA')); sk = fit(sk, (640, 720)); sk = ImageOps.mirror(sk)
    sk = outline(padded(sk)).rotate(4, resample=Image.BICUBIC, expand=True); jk = outline(padded(jk)).rotate(-3, resample=Image.BICUBIC, expand=True)
    cv.alpha_composite(sk, (1280 - sk.width + 40, 720 - sk.height + 60))
    cv.alpha_composite(jk, (60, 720 - jk.height + 120))
    save(cv.convert('RGB'), 'show.joker-skull', q=78, group='show:joker-skull', source='generated',
         note='SHOWTIME 定格画（伪官方·待替换）：P5R 原作无 Joker×Skull 组合；官方立绘合成 ← 官方素材包 F：hero.webp + ' + src('body.skull'))
    # 第四阶段：SHOWTIME 人物入场用的高清全身（每组一张图集 a|b，高 640，白+黑双层描边烘焙），跟 show:<pair> 一起懒加载
    for pair in ['joker-skull', 'mona-panther', 'skull-fox', 'joker-crow', 'joker-violet', 'queen-noir', 'mona-noir']:
        ims = []
        for cid in pair.split('-'):
            src_im = Image.open(O + 'slots/hero.webp' if cid == 'joker' else fpath(CH[cid]['body'])).convert('RGBA')
            ims.append(outline(padded(fit(tight(src_im), (560, 600)), 16), 6, 12))
        W2 = ims[0].width + ims[1].width; H2 = max(i.height for i in ims)
        at = Image.new('RGBA', (W2, H2), (0, 0, 0, 0)); at.paste(ims[0], (0, 0), ims[0]); at.paste(ims[1], (ims[0].width, 0), ims[1])
        save(at, f'duo.{pair}', q=80, group=f'show:{pair}', frames={'a': [0, 0, ims[0].width, ims[0].height], 'b': [ims[0].width, 0, ims[1].width, ims[1].height]},
             note='SHOWTIME 人物入场全身（官方立绘，描边离线烘焙）← ' + ' + '.join('官方素材包 F：hero.webp' if c == 'joker' else note_of(CH[c]['body']) for c in pair.split('-')))
    json.dump(rows, open(os.path.join(ROOT, 'work', 'party-assets.json'), 'w'), ensure_ascii=False, indent=1)
    print('total KB', round(sum(r['kb'] for r in rows), 1))

# ---------------------------------------------------------------- 景深：背景压暗 + 轻微模糊 + 红色暗角（离线烘焙，运行时零滤镜）
if 'bg' in ONLY:
    bg = Image.open(G + 'bg-castle.png').convert('RGB')
    bg = bg.resize((2260, int(bg.height * 2260 / bg.width)), Image.LANCZOS)
    c = Image.new('RGB', (2260, 960), (10, 4, 6)); c.paste(bg, (0, 1))
    c = c.filter(ImageFilter.GaussianBlur(2.2))
    c = ImageEnhance.Brightness(c).enhance(0.66); c = ImageEnhance.Contrast(c).enhance(1.08)
    w, h = c.size; vig = Image.new('L', (w // 8, h // 8), 0); dv = ImageDraw.Draw(vig)
    for i in range(40):
        k = i / 40; dv.ellipse((int(w / 8 * (0.5 - 0.62 + 0.3 * k)), int(h / 8 * (0.5 - 0.75 + 0.35 * k)), int(w / 8 * (0.5 + 0.62 - 0.3 * k)), int(h / 8 * (0.5 + 0.75 - 0.35 * k))), fill=int(255 * k))
    vig = vig.resize((w, h), Image.BILINEAR).filter(ImageFilter.GaussianBlur(30))
    red = Image.new('RGB', (w, h), (70, 0, 6))
    c = Image.composite(c, red, vig)
    c.save(os.path.join(D, 'bg.battle.castle.webp'), 'WEBP', quality=58, method=6)
    print('bg.battle.castle (depth bake)', round(os.path.getsize(os.path.join(D, 'bg.battle.castle.webp')) / 1024, 1), 'KB')

# ---------------------------------------------------------------- 总攻收尾定格画（按发起者）：第四阶段换官方 Finishing Touch 高清 PNG（3000×1680，Fandom），不再用 GIF 末帧放大
P4 = os.path.join(ROOT, 'work', 'party-src', 'p4') + '/'
P4S = json.load(open(P4 + 'sources.json'))
OFF = '/workspace/work/umbra-red/red/assets/official/finish-hd/'; os.makedirs(OFF, exist_ok=True)
import shutil
FTMAP = {'joker': 'Joker', 'skull': 'Ryuji', 'mona': 'Morgana', 'panther': 'Ann', 'fox': 'Yusuke', 'queen': 'Makoto', 'noir': 'Haru', 'crow': 'Akechi', 'violet': 'Sumire'}
for cid, nm in (FTMAP.items() if 'finish' in ONLY else []):
    fn = f'{nm}_FinishingTouch.png'; s0 = P4S[fn]
    if not os.path.exists(OFF + fn): shutil.copy2(P4 + fn, OFF + fn)
    im = Image.open(P4 + fn).convert('RGB'); W0, H0 = im.size
    th = int(W0 * 9 / 16); im = im.crop((0, (H0 - th) // 2, W0, (H0 - th) // 2 + th)) if th <= H0 else im
    fr = im.resize((1280, 720), Image.LANCZOS)
    aid = 'allout.finish.default' if cid == 'joker' else f'finish.{cid}'
    q = 80
    p = os.path.join(D, aid + '.webp')
    while True:
        fr.save(p, 'WEBP', quality=q, method=6)
        if os.path.getsize(p) <= 195 * 1024 or q <= 60: break
        q -= 4
    row = dict(id=aid, file=f'assets/{aid}.webp', w=1280, h=720, firstPack=(cid == 'joker'), source='official',
               note=f"总攻定格画（官方 Finishing Touch 高清 {W0}×{H0} 缩到 1280×720，q{q}）← {s0['title']} — {s0['page']}；原图存 red/assets/official/finish-hd/", kb=round(os.path.getsize(p) / 1024, 1))
    if cid != 'joker': row['group'] = f'char:{cid}'
    rows.append(row); print(aid, row['kb'], 'KB q', q)
json.dump(rows, open(os.path.join(ROOT, 'work', 'party-assets.json'), 'w'), ensure_ascii=False, indent=1)
