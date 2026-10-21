# M3 第二阶段：队伍名单驱动的角色素材（官方 ATLUS/SEGA 图 = 私有自用；背影为 generate_image 伪官方）。
# 输出（src/umbra/skins/p5r-red/assets/）：
#   head.<id>.webp   320x160  [ink 160 | color 160]   —— 首包只装当前队伍 + oracle
#   char.<id>.webp   1280x1120 atlas: cutin 1280x320 / bust 400 / nomask 400 / mask 400 / body 300x400 —— 懒加载
#   back.<id>.webp   场上背影（高 640）—— 懒加载
#   persona.<id>.webp 人格面具（蓝焰描边 + 辉光烘焙）—— 懒加载
#   show.<pair>.webp SHOWTIME 定格画 1280x720 —— 懒加载
# 行信息写 work/party-assets.json（build_manifest 合并），来源逐张记录。
from PIL import Image, ImageOps, ImageFilter, ImageEnhance, ImageChops, ImageDraw
import os, json
ROOT = os.path.join(os.path.dirname(__file__), '..')
F = os.path.join(ROOT, 'work', 'party-src', 'fandom') + '/'
G = os.path.join(ROOT, 'work', 'gen') + '/'
O = '/workspace/work/umbra-red/red/assets/official/'
D = os.path.join(ROOT, 'src', 'umbra', 'skins', 'p5r-red', 'assets')
SRC = json.load(open(F + 'sources.json'))
rows = []

def save(im, name, q=80, source='official', note='', group=None, frames=None, first=False):
    p = os.path.join(D, name + '.webp')
    im.save(p, 'WEBP', quality=q, method=6)
    r = dict(id=name, file='assets/' + name + '.webp', w=im.width, h=im.height, firstPack=first, source=source, note=note,
             kb=round(os.path.getsize(p) / 1024, 1))
    if group: r['group'] = group
    if frames: r['frames'] = frames; r['atlas'] = name
    rows.append(r); print(name, im.size, r['kb'], 'KB')

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
 'queen':  dict(bust='head.queen', nomask='nomask.queen', cut='cut.queen', body='body.queen', back=G + 'queen-back.png', persona='per.johanna', box=(0.16, 0.34, 0.68, 0.68), mode='dark'),
 'noir':   dict(bust='head.noir', nomask='nomask.noir', cut='cut.noir', body='body.noir', back=G + 'noir-back.png', persona='per.milady', box=(0.13, 0.50, 0.84, 0.69), mode='dark'),
 'crow':   dict(bust='head.crow', nomask=None, cut='cut.crow', body='body.crow', back=G + 'crow-back.png', persona='per.robin', box=(0.20, 0.0, 0.88, 0.72), mode='all'),
 'violet': dict(bust='head.violet', nomask='nomask.violet', cut='cut.violet', body='body.violet', back=G + 'violet-back.png', persona='per.cendrillon', box=(0.18, 0.38, 0.62, 0.64), mode='dark'),
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
for cid, d in CH.items():
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
    if d['box']:
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
    bk = tight(bk); save(fit(bk, (640, 640)), f'back.{cid}', q=80, source='generated',
                        note=('generate_image 背影（参考官方 Joker 立绘）' if cid == 'joker' else f"generate_image 伪官方背影（参考 {note_of(d['body'])}）；原作为 3D 模型、无 2D 背影图"), group=f'back:{cid}')
    # persona
    pk = d['persona']; pim = Image.open(fpath(pk)).convert('RGBA')
    if pk == 'per.cendrillon':
        pim = key_white(pim); w, h = pim.size; pim = pim.crop((0, 0, int(w * 0.5), h))
    pim = tight(pim); pim = fit(pim, (560, 560))
    save(glow(pim), f'persona.{cid}', q=78, group=f'char:{cid}', note='人格面具 ← ' + note_of(pk) + ('（P5R 官方概念设定图左半，白底抠图）' if pk == 'per.cendrillon' else '（P5S 官方渲染图，同一人格面具）' if pk in ('per.kidd', 'per.zorro', 'per.carmen', 'per.milady') else '') + '；蓝焰描边/辉光离线烘焙')

# showtime stills
for k, pair in [('show.morganaann', 'mona-panther'), ('show.ryujiyusuke', 'skull-fox'), ('show.jokerakechi', 'joker-crow'), ('show.jokerkasumi', 'joker-violet'),
                ('show.makotoharu', 'queen-noir'), ('show.morganaharu', 'mona-noir')]:
    im = Image.open(F + SRC[k]['file']).convert('RGB').resize((1280, 720), Image.LANCZOS)
    save(im, f'show.{pair}', q=76, group=f'show:{pair}', note='SHOWTIME 定格画 ← ' + src(k))
json.dump(rows, open(os.path.join(ROOT, 'work', 'party-assets.json'), 'w'), ensure_ascii=False, indent=1)
print('total KB', round(sum(r['kb'] for r in rows), 1))
