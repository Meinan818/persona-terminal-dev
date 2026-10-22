# Build p5r-red skin assets for M3 (official ATLUS/SEGA art = private use only; generated = generate_image).
# Output: src/umbra/skins/p5r-red/assets/*.webp  + prints manifest rows (json) to work/assets.json
from PIL import Image, ImageOps, ImageFilter, ImageEnhance, ImageChops
import os, json
O = '/workspace/work/umbra-red/red/assets/official/'
G = os.path.join(os.path.dirname(__file__), '..', 'work', 'gen')
D = os.path.join(os.path.dirname(__file__), '..', 'src', 'umbra', 'skins', 'p5r-red', 'assets')
os.makedirs(D, exist_ok=True)
rows = []

def save(im, name, q=80, source='official', note='', first=True, atlas=None):
    p = os.path.join(D, name + '.webp')
    im.save(p, 'WEBP', quality=q, method=6)
    rows.append(dict(id=name, file='assets/' + name + '.webp', w=im.width, h=im.height, firstPack=first,
                     source=source, note=note, kb=round(os.path.getsize(p) / 1024, 1), **({'atlas': atlas} if atlas else {})))
    print(name, im.size, rows[-1]['kb'], 'KB')

def tight(im):
    bb = im.getbbox(); return im.crop(bb) if bb else im

def fit(im, box):
    im = im.copy(); im.thumbnail(box, Image.LANCZOS); return im

# 1 battle background: generated panorama -> 2260x960 (bleed for 4:3 and 21:9)
bg = Image.open(os.path.join(G, 'bg-castle.png')).convert('RGB')
bg = bg.resize((2260, int(bg.height * 2260 / bg.width)), Image.LANCZOS)  # 2260x958
c = Image.new('RGB', (2260, 960), (10, 4, 6)); c.paste(bg, (0, 1))
c = ImageEnhance.Brightness(c).enhance(0.92)
save(c, 'bg.battle.castle', q=58, source='generated', note='generate_image：P5R 风格宫殿大厅全景，2260 宽出血')

# 2 Joker back view (generated, ref = official hero.webp), height 640
jb = tight(Image.open(os.path.join(G, 'joker-back.png')).convert('RGBA'))
save(fit(jb, (640, 640)), 'ally.joker.back', q=82, source='generated', note='generate_image 背影（参考官方 Joker 立绘）；原作无背影素材')

# 3 enemies (official compendium cut-outs from pack F)
save(fit(tight(Image.open(O + 'slots/enemy-noisy-mask.webp').convert('RGBA')), (560, 560)), 'enemy.noisy', q=80,
     note='P5R Incubus 图鉴抠图（包 F）；本作名「聒噪假面」')
save(fit(tight(Image.open(O + 'slots/enemy-wandering-echo.webp').convert('RGBA')), (480, 480)), 'enemy.echo', q=80,
     note='P5R Mokoi 图鉴抠图（包 F）；本作名「游荡回声」')

# 4 cut-in band + all-out finish card (official)
save(Image.open(O + 'slots/hero-cutin.webp').convert('RGBA').resize((1280, 320), Image.LANCZOS), 'cutin.joker', q=80,
     note='Fandom Joker FinishingTouch 面部横条')
save(Image.open(O + 'slots/allout-finish.webp').convert('RGB').resize((1280, 720), Image.LANCZOS), 'allout.finish.default', q=80,
     note='Fandom Joker FinishingTouch（THE SHOW\'S OVER）')

# 5 party portraits atlas (silhouettes for all-out / hold-up): joker(front) + 3 personas, each fit 300x300
ports = [('joker', O + 'slots/hero.webp'), ('agathion', O + 'persona-cut/agathion.webp'),
         ('caitsith', O + 'persona-cut/cait-sith.webp'), ('kelpie', O + 'persona-cut/kelpie.webp')]
atl = Image.new('RGBA', (1024, 320), (0, 0, 0, 0)); frames = {}
for i, (k, f) in enumerate(ports):
    im = fit(tight(Image.open(f).convert('RGBA')), (250, 310))
    x = i * 256 + (256 - im.width) // 2; atl.paste(im, (x, 0), im)
    frames[k] = [x, 0, im.width, im.height]
save(atl, 'atlas.party', q=80, note='官方立绘/图鉴抠图拼图集：' + json.dumps(frames), atlas='atlas.party')

# 6 HUD heads atlas: P5R-style black/white ink heads (derived from official art) + navigator head
def ink(im):
    a = im.split()[-1]
    g = ImageOps.grayscale(im.convert('RGB'))
    g = ImageEnhance.Contrast(g).enhance(1.8)
    g = g.point(lambda v: 0 if v < 70 else (150 if v < 165 else 255))
    out = Image.merge('RGBA', (g, g, g, a))
    # white outline
    big = a.filter(ImageFilter.MaxFilter(7))
    ol = Image.new('RGBA', im.size, (255, 255, 255, 0)); ol.putalpha(big)
    ol.alpha_composite(out); return ol
heads = [('joker', O + 'slots/hero.webp', (800, 668, 975, 880)),
         ('agathion', O + 'persona-cut/agathion.webp', None),
         ('caitsith', O + 'persona-cut/cait-sith.webp', None),
         ('kelpie', O + 'persona-cut/kelpie.webp', None),
         ('navi', O + 'slots/navi.webp', None)]
hat = Image.new('RGBA', (5 * 128, 128), (0, 0, 0, 0)); hf = {}
for i, (k, f, box) in enumerate(heads):
    im = Image.open(f).convert('RGBA')
    if box is None:
        t = tight(im); w, h = t.size
        cb = {'agathion': (0.18, 0.0, 0.62, 0.30), 'caitsith': (0.18, 0.08, 0.72, 0.42),
              'kelpie': (0.0, 0.0, 0.42, 0.42), 'navi': (0.12, 0.02, 0.72, 0.42)}[k]
        im = t.crop((int(cb[0] * w), int(cb[1] * h), int(cb[2] * w), int(cb[3] * h)))
    else:
        im = im.crop(box)
    im = fit(im, (120, 120))
    if k != 'navi': im = ink(im)
    x = i * 128 + (128 - im.width) // 2; y = 128 - im.height
    hat.paste(im, (x, y), im); hf[k] = [i * 128, 0, 128, 128]
save(hat, 'atlas.hud', q=85, note='HUD 头像：官方立绘局部按 P5R 黑白墨线头像处理；navi 头像为包 F 伪官方（generated）', atlas='atlas.hud')

# 7 result screen art: official hero desaturated + darkened (P5R RESULT grey portrait)
r = fit(tight(Image.open(O + 'slots/hero.webp').convert('RGBA')), (720, 640))
g = ImageOps.grayscale(r.convert('RGB')); g = ImageEnhance.Contrast(g).enhance(1.1).point(lambda v: int(30 + v * 0.62))
r2 = Image.merge('RGBA', (g, g, g, r.split()[-1]))
save(r2, 'result.hero.grey', q=78, note='官方 Joker 立绘去色（原作 RESULT 灰度角色）')

json.dump(rows, open(os.path.join(os.path.dirname(__file__), '..', 'work', 'assets.json'), 'w'), ensure_ascii=False, indent=1)
print('total KB', round(sum(r['kb'] for r in rows), 1))
