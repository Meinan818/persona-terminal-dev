# p3-blue skin asset build (re-runnable). Outputs into the skin worktree assets dir.
import json, math, os, io
from PIL import Image, ImageDraw, ImageFilter, ImageOps, ImageChops

P = '/workspace/projects/86a5b727-7f71-46d0-bb30-e183f98dd9ca'
G = f'{P}/work/p3b-gen'
DL = f'{P}/web/downloads/p3-blue'
OFF = f'{P}/work/umbra/build/umbra-demo/assets/p3/official'
PER = f'{P}/work/umbra/build/umbra-demo/assets/personas/p3r/full'
OUT = f'{P}/work/wt/p3-blue/src/umbra/skins/p3-blue/assets'
os.makedirs(OUT, exist_ok=True)
report = {}

def save_webp(img, name, q=80, maxkb=None, alpha=True):
    path = f'{OUT}/{name}'
    while True:
        buf = io.BytesIO()
        im = img if (alpha and img.mode == 'RGBA') else img.convert('RGB')
        im.save(buf, 'WEBP', quality=q, method=6)
        kb = buf.tell() / 1024
        if maxkb is None or kb <= maxkb or q <= 40:
            break
        q -= 4
    open(path, 'wb').write(buf.getvalue())
    report[name] = dict(w=img.width, h=img.height, kb=round(kb, 1), q=q)
    return path

def frame(x, y, w, h):
    return {"frame": {"x": x, "y": y, "w": w, "h": h}, "rotated": False, "trimmed": False,
            "spriteSourceSize": {"x": 0, "y": 0, "w": w, "h": h}, "sourceSize": {"w": w, "h": h}}

def grade_darkhour(img):
    """Dark Hour bake: desaturate, push to sickly green, deepen shadows (static bitmap, no filter)."""
    rgb = img.convert('RGB')
    g = ImageOps.grayscale(rgb)
    tinted = ImageOps.colorize(g, black=(4, 18, 10), mid=(46, 120, 70), white=(214, 255, 196))
    out = Image.blend(rgb, tinted, 0.78)
    return out

def blood_moon(img, cx, cy, r):
    """Paint a blood moon disc with soft halo (baked into bitmap)."""
    base = img.convert('RGBA')
    halo = Image.new('RGBA', base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(halo)
    for k in range(10, 0, -1):
        rr = r * (1 + k * 0.12)
        d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=(150, 20, 20, int(10 + (10 - k) * 3)))
    halo = halo.filter(ImageFilter.GaussianBlur(r * 0.25))
    base = Image.alpha_composite(base, halo)
    disc = Image.new('RGBA', base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(disc)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(196, 34, 30, 255))
    # crater mottling
    import random
    rnd = random.Random(7)
    for _ in range(18):
        a = rnd.random() * 6.28; dist = rnd.random() * r * 0.7; cr = r * (0.06 + rnd.random() * 0.12)
        x = cx + math.cos(a) * dist; y = cy + math.sin(a) * dist
        d.ellipse([x - cr, y - cr, x + cr, y + cr], fill=(150, 18, 20, 255))
    disc = disc.filter(ImageFilter.GaussianBlur(1.2))
    return Image.alpha_composite(base, disc).convert('RGB')

# ---------------- backgrounds (bleed: 2240 wide x 950 tall covers 21:9 and 4:3) ----------------
BW, BH = 2240, 950
bat = Image.open(f'{G}/bg-battle-src.png').convert('RGB').resize((BW, BH), Image.LANCZOS)
save_webp(bat, 'bg-battle.webp', q=78, maxkb=200)
batd = blood_moon(grade_darkhour(bat), BW // 2, 120, 70)
save_webp(batd, 'bg-battle-darkhour.webp', q=76, maxkb=200)

hub = Image.open(f'{G}/bg-hub-src.png').convert('RGB').resize((BW, BH), Image.LANCZOS)
save_webp(hub, 'bg-hub-night.webp', q=76, maxkb=200)
# moon in source at ~ (566/792, 70/336) of half-size preview -> (0.715, 0.21)
mx, my, mr = int(BW * 0.715), int(BH * 0.208), int(BH * 0.085)
hubd = grade_darkhour(hub)
hubd = blood_moon(hubd, mx, my, int(mr * 1.6))
save_webp(hubd, 'bg-hub-darkhour.webp', q=76, maxkb=200)

# map: seamless 512 tile from battle floor (mirror tiling -> seamless)
src = Image.open(f'{G}/bg-battle-src.png').convert('RGB')
floor = src.crop((520, 470, 722, 672)).resize((256, 256), Image.LANCZOS)  # floor patch below horizon
tile = Image.new('RGB', (512, 512))
tile.paste(floor, (0, 0)); tile.paste(ImageOps.mirror(floor), (256, 0))
tile.paste(ImageOps.flip(floor), (0, 256)); tile.paste(ImageOps.flip(ImageOps.mirror(floor)), (256, 256))
save_webp(tile, 'bg-map-tile.webp', q=78, maxkb=60)
save_webp(grade_darkhour(tile), 'bg-map-tile-darkhour.webp', q=78, maxkb=60)

# ---------------- full-screen cards ----------------
fin = Image.open(f'{G}/allout-finish-src.png').convert('RGB')
fin = ImageOps.fit(fin, (1280, 720), Image.LANCZOS)
save_webp(fin, 'allout-finish.webp', q=80, maxkb=200)
hl = Image.open(f'{G}/highlight-hero-src.png').convert('RGB')
hl = ImageOps.fit(hl, (1280, 720), Image.LANCZOS)
save_webp(hl, 'highlight-hero.webp', q=80, maxkb=200)

# cut-in band 1280x320 (official eye band)
cut = Image.open(f'{OFF}/hero-cutin.png').convert('RGBA').resize((1280, 320), Image.LANCZOS)
save_webp(cut, 'cutin-hero.webp', q=82, maxkb=120)

# summon persona (official P3R Orpheus), height <=640
orp = Image.open(f'{PER}/orpheus.webp').convert('RGBA')
orp = orp.crop(orp.getbbox())
orp = orp.resize((int(orp.width * 640 / orp.height), 640), Image.LANCZOS)
save_webp(orp, 'persona-orpheus.webp', q=80, maxkb=60)
aps = Image.open(f'{PER}/apsaras.webp').convert('RGBA')
aps = aps.crop(aps.getbbox())
aps = aps.resize((int(aps.width * 640 / aps.height), 640), Image.LANCZOS)
save_webp(aps, 'persona-apsaras.webp', q=80, maxkb=60)

# ---------------- portraits atlas (4 people, 2 layers each: head / body, cut at neck) ----------------
people = [
    ('hero', f'{G}/hero-bust-src.png', 0.47),  # crop of official P3_Protag_Reload.png
    ('yukari', f'{DL}/portrait-Yukari.png', 0.57),
    ('junpei', f'{DL}/portrait-Junpei.png', 0.55),
    ('akihiko', f'{DL}/portrait-Akihiko.png', 0.56),
]
H = 620
pieces = []
for pid, f, neck in people:
    im = Image.open(f).convert('RGBA')
    im = im.crop(im.getbbox())
    z = Image.new('RGBA', im.size, (0, 0, 0, 0)); z.paste(im, (0, 0), im.split()[3]); im = z
    w = int(im.width * H / im.height)
    if w > 500:  # keep 4 people inside a 2048 row
        w = 500
        im = ImageOps.fit(im, (int(500 * im.height / H), im.height), Image.LANCZOS, centering=(0.5, 0))
    im = im.resize((w, H), Image.LANCZOS)
    pieces.append((pid, im, int(H * neck)))
AW = sum(p[1].width for p in pieces) + 2 * (len(pieces) + 1)
atlas = Image.new('RGBA', (AW, H + 4), (0, 0, 0, 0))
frames = {}; x = 2; meta = {}
for pid, im, ny in pieces:
    atlas.paste(im, (x, 2))
    frames[f'unit.{pid}.head'] = frame(x, 2, im.width, ny)
    frames[f'unit.{pid}.body'] = frame(x, 2 + ny, im.width, H - ny)
    # hair sway zone: alpha extent of the top band, as polygon in local pixels
    a = im.split()[3]
    top = a.crop((0, 0, im.width, int(ny * 0.45))).getbbox() or (0, 0, im.width, 40)
    hx0, hy0, hx1, hy1 = top
    meta[pid] = dict(w=im.width, h=H, neck=ny, hair=[hx0, hy0, hx1, hy0, hx1, hy1, hx0, hy1])
    # side strands zone (lower hair at head sides)
    x += im.width + 2
# individual size check (<=60KB per person) by encoding each person separately
per_kb = {}
for pid, im, ny in pieces:
    b = io.BytesIO(); im.save(b, 'WEBP', quality=78, method=6); per_kb[pid] = round(b.tell() / 1024, 1)
save_webp(atlas, 'atlas-portraits.webp', q=78, maxkb=230)
json.dump({"frames": frames, "meta": {"image": "atlas-portraits.webp", "format": "RGBA8888",
           "size": {"w": atlas.width, "h": atlas.height}, "scale": "1"}},
          open(f'{OUT}/atlas-portraits.json', 'w'), separators=(',', ':'))

# ---------------- HUD / FX atlas (procedural vector parts + tarot card) ----------------
HA = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
hf = {}
def put(name, img, x, y):
    HA.paste(img, (x, y), img); hf[name] = frame(x, y, img.width, img.height)

S = 4  # supersample
def ss(w, h): return Image.new('RGBA', (w * S, h * S), (0, 0, 0, 0))
def down(im, w, h): return im.resize((w, h), Image.LANCZOS)

# tri cursor (P3R pause-menu red/white double triangle)
im = ss(120, 80); d = ImageDraw.Draw(im)
d.polygon([(0, 8 * S), (100 * S, 40 * S), (0, 72 * S)], fill=(255, 255, 255, 255))
d.polygon([(20 * S, 22 * S), (120 * S, 40 * S), (20 * S, 58 * S)], fill=(232, 40, 60, 255))
put('ui.cursor', down(im, 120, 80), 0, 0)
# moon phases 0..7 (96x96) — 0 new, 4 full
for k in range(8):
    im = ss(96, 96); d = ImageDraw.Draw(im); r = 44 * S; c = 48 * S
    d.ellipse([c - r, c - r, c + r, c + r], fill=(18, 40, 110, 255))
    lit = Image.new('L', im.size, 0); dl = ImageDraw.Draw(lit)
    dl.ellipse([c - r, c - r, c + r, c + r], fill=255)
    frac = k / 8.0  # 0..1 lunation
    # terminator offset: shadow disc shifted
    off = math.cos(frac * 2 * math.pi) * 2 * r
    sh = Image.new('L', im.size, 0); ds = ImageDraw.Draw(sh)
    sgn = 1 if frac < 0.5 else -1
    ds.ellipse([c - r + sgn * (-off if frac < 0.5 else off) * 0.5 - (0), c - r, c + r + sgn * (-off if frac < 0.5 else off) * 0.5, c + r], fill=255)
    if k == 0: litm = Image.new('L', im.size, 0)
    elif k == 4: litm = lit
    else:
        # simple approach: lit = disc minus shifted disc
        shift = int((1 - abs(4 - k) / 4) * 2 * r)  # 0 at new, 2r at full
        dx = (2 * r - shift) * (1 if k < 4 else -1)
        m2 = Image.new('L', im.size, 0); ImageDraw.Draw(m2).ellipse([c - r - dx, c - r, c + r - dx, c + r], fill=255)
        litm = ImageChops.subtract(lit, m2)
    face = Image.new('RGBA', im.size, (236, 246, 255, 255))
    im.paste(face, (0, 0), litm)
    d = ImageDraw.Draw(im); d.ellipse([c - r, c - r, c + r, c + r], outline=(53, 209, 232, 255), width=3 * S)
    put(f'ui.moon.{k}', down(im, 96, 96), 130 + (k % 4) * 100, (k // 4) * 100)
# notch (red knife-cut) + slab
im = ss(64, 24); d = ImageDraw.Draw(im); d.polygon([(0, 24 * S), (64 * S, 0), (64 * S, 24 * S)], fill=(232, 40, 60, 255))
put('ui.notch', down(im, 64, 24), 0, 90)
im = ss(256, 64); d = ImageDraw.Draw(im); d.polygon([(24 * S, 0), (256 * S, 0), (232 * S, 64 * S), (0, 64 * S)], fill=(255, 255, 255, 255))
put('ui.slab', down(im, 256, 64), 0, 200)
# command stripe (slanted list row highlight) 476x96
im = ss(476, 96); d = ImageDraw.Draw(im)
d.polygon([(40 * S, 6 * S), (476 * S, 0), (446 * S, 90 * S), (0, 96 * S)], fill=(27, 87, 255, 255))
d.polygon([(40 * S, 6 * S), (476 * S, 0), (470 * S, 14 * S), (36 * S, 18 * S)], fill=(53, 209, 232, 255))
put('ui.command.row', down(im, 476, 96), 0, 280)
# particle frames
im = ss(96, 10); d = ImageDraw.Draw(im); d.polygon([(0, 5 * S), (96 * S, 0), (96 * S, 10 * S)], fill=(255, 255, 255, 255))
put('fx.streak', down(im, 96, 10), 500, 280)
for i, pts in enumerate([[(4, 2), (60, 18), (20, 58)], [(10, 0), (56, 40), (0, 30)], [(30, 0), (64, 64), (0, 50)]]):
    im = ss(64, 64); d = ImageDraw.Draw(im)
    d.polygon([(px * S, py * S) for px, py in pts], fill=(220, 244, 255, 230), outline=(255, 255, 255, 255))
    put(f'fx.shard.{i}', down(im, 64, 64), 610 + i * 70, 280)
im = ss(32, 32); d = ImageDraw.Draw(im)
d.polygon([(16 * S, 0), (19 * S, 13 * S), (32 * S, 16 * S), (19 * S, 19 * S), (16 * S, 32 * S), (13 * S, 19 * S), (0, 16 * S), (13 * S, 13 * S)], fill=(255, 255, 255, 255))
put('fx.spark', down(im, 32, 32), 830, 280)
im = ss(16, 16); d = ImageDraw.Draw(im); d.ellipse([0, 0, 16 * S, 16 * S], fill=(255, 255, 255, 255))
put('fx.dot', down(im, 16, 16), 870, 280)
# maskWipe silhouette: crescent moon (single colour) 384x384
im = ss(384, 384); d = ImageDraw.Draw(im)
d.ellipse([12 * S, 12 * S, 372 * S, 372 * S], fill=(255, 255, 255, 255))
d.ellipse([110 * S, -10 * S, 420 * S, 330 * S], fill=(0, 0, 0, 0))
put('fx.wipe.crescent', down(im, 384, 384), 0, 390)
# maskWipe silhouette 2: P3R slanted shard blade 384x384 (diagonal glass blade)
im = ss(384, 384); d = ImageDraw.Draw(im)
d.polygon([(0, 300 * S), (300 * S, 0), (384 * S, 40 * S), (90 * S, 384 * S)], fill=(255, 255, 255, 255))
put('fx.wipe.blade', down(im, 384, 384), 390, 390)
# tarot card (Arcana card for cardShatter) from existing generated tarot back
tar = Image.open(f'{OFF}/tarot-back.png').convert('RGBA'); tar = tar.crop(tar.getbbox()).resize((200, 300), Image.LANCZOS)
put('fx.tarot', tar, 790, 390)
# evoker muzzle ring (summon trigger flash, small) 128x128
im = ss(128, 128); d = ImageDraw.Draw(im)
for k, a in [(60, 255), (46, 0)]:
    d.ellipse([(64 - k) * S, (64 - k) * S, (64 + k) * S, (64 + k) * S], fill=(207, 234, 246, a))
put('fx.evoker.ring', down(im, 128, 128), 0, 790)
# weak/down tag plates (white slab w/ red notch) 220x72
im = ss(220, 72); d = ImageDraw.Draw(im)
d.polygon([(18 * S, 0), (220 * S, 0), (202 * S, 72 * S), (0, 72 * S)], fill=(255, 255, 255, 255))
d.polygon([(170 * S, 72 * S), (220 * S, 40 * S), (210 * S, 72 * S)], fill=(232, 40, 60, 255))
put('ui.tag.plate', down(im, 220, 72), 140, 790)
# shield pip
im = ss(28, 28); d = ImageDraw.Draw(im); d.polygon([(14 * S, 0), (28 * S, 14 * S), (14 * S, 28 * S), (0, 14 * S)], fill=(53, 209, 232, 255), outline=(255, 255, 255, 255))
put('ui.shield.pip', down(im, 28, 28), 380, 790)
HA = HA.crop((0, 0, 1024, 1024))
save_webp(HA, 'atlas-hud.webp', q=86, maxkb=80)
json.dump({"frames": hf, "meta": {"image": "atlas-hud.webp", "format": "RGBA8888", "size": {"w": 1024, "h": 1024}, "scale": "1"}},
          open(f'{OUT}/atlas-hud.json', 'w'), separators=(',', ':'))

json.dump(dict(report=report, per_person_kb=per_kb, portraits=meta), open(f'{G}/asset-report.json', 'w'), indent=1)
print(json.dumps(report, indent=0)); print(per_kb); print(json.dumps(meta))
