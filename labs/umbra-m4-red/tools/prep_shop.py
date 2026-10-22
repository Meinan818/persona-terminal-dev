# M5 商店/天鹅绒：数据 + 素材准备（只读源，产物进 src/game/data 与 skins/p5r-red/assets）
#  - src/game/data/compendium.json：P5R 232 面具（阿尔卡纳/等级/技能表/继承类型/五维）+ 阿尔卡纳合成表 + 特殊/DLC 排除名单 + 技能属性
#    源：aqiu384/megaten-fusion-tool（src/app/p5/data/roy-*.json，work/fusiondata/ 下载副本）；技能属性：red/data/skills-zh.json（UMBRA 已有表）
#    图鉴图/中文名：red/assets/official/manifest.json（已有 P5R 官方图鉴表，232 条，一一对应）
#  - skins/p5r-red/assets/comp/<slug>.webp（160 缩略）与 comp/<slug>.l.webp（720 详图）：official/persona/*（只读复制）
#  - 店主两色剪影（P5R 商店店主是黑底白描线剪影）：shop.iwai / shop.takemi / shop.vendor（由 official/slots npc-* 处理）
import json, os, re, unicodedata, shutil
from PIL import Image, ImageFilter, ImageOps, ImageChops
R = os.path.join(os.path.dirname(__file__), '..')
FD = os.path.join(R, 'work/fusiondata/')
OFF = '/workspace/work/umbra-red/red/assets/official/'
SK = os.path.join(R, 'src/umbra/skins/p5r-red/')
def norm(s): return re.sub(r'[^a-z0-9]', '', unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower())

demons = json.load(open(FD + 'roy-demon-data.json'))
chart = json.load(open(FD + 'roy-fusion-chart.json'))
special = json.load(open(FD + 'roy-special-recipes.json'))
inh = json.load(open(FD + 'inheritance-types.json'))
man = json.load(open(OFF + 'manifest.json'))['persona']
bySlug = {norm(p['en']): p for p in man}
SZ = json.load(open('/workspace/work/umbra-red/red/data/skills-zh.json'))
EL = {e['id']: e.get('el') or e.get('kind') for e in SZ['e']}
ELMAP = {'phys': 'phys', 'gun': 'gun', 'fire': 'fire', 'ice': 'ice', 'electric': 'elec', 'wind': 'wind', 'psy': 'psy', 'nuclear': 'nuke', 'bless': 'bless', 'curse': 'curse',
         'almighty': 'almighty', 'healing': 'heal', 'support': 'support', 'ailment': 'ailment', 'passive': 'passive', 'trait': 'passive'}
def skel(name):
    if name.startswith('Drain '): return 'passive'
    if name == 'Gattling Blows': return 'phys'
    return ELMAP.get(EL.get(name) or '', 'passive')
ARC = {'Fool': 'fool', 'Magician': 'magician', 'Priestess': 'priestess', 'Empress': 'empress', 'Emperor': 'emperor', 'Hierophant': 'hierophant', 'Lovers': 'lovers',
       'Chariot': 'chariot', 'Justice': 'justice', 'Hermit': 'hermit', 'Fortune': 'fortune', 'Strength': 'strength', 'Hanged': 'hanged', 'Death': 'death',
       'Temperance': 'temperance', 'Devil': 'devil', 'Tower': 'tower', 'Star': 'star', 'Moon': 'moon', 'Sun': 'sun', 'Judgement': 'judgement',
       'Faith': 'faith', 'Councillor': 'councillor', 'World': 'world'}
DLC = {'Izanagi', 'Magatsu-Izanagi', 'Orpheus', 'Thanatos', 'Messiah', 'Kaguya', 'Ariadne', 'Asterius', 'Athena', 'Tsukiyomi', 'Raoul', 'Satanael', 'Orpheus F', 'Thanatos Picaro'}
races = chart['races']; tab = {}
for i, row in enumerate(chart['table']):
    for j, res in enumerate(row):
        if res and res != '-': tab[ARC[races[i]] + '|' + ARC[races[j]]] = ARC[res]; tab[ARC[races[j]] + '|' + ARC[races[i]]] = ARC[res]
P = []; skills = {}; missing = []
os.makedirs(SK + 'assets/comp', exist_ok=True)
for name, d in demons.items():
    m = bySlug.get(norm(name))
    if not m: missing.append(name); continue
    slug = m['slug']
    sk = sorted(d['skills'].items(), key=lambda kv: kv[1])
    for s, _ in sk: skills[s] = skel(s)
    ex = 'special' if name in special else 'dlc' if (name in DLC or 'Picaro' in name) else ''
    P.append({'id': slug, 'en': name, 'arc': ARC[d['race']], 'lv': d['lvl'], 'inh': d['inherits'], 'sk': [[s, 0 if l < 1 else int(l)] for s, l in sk],
              'st': d['stats'], 'res': d['resists'], 'ex': ex, 'src': m.get('source', '')})
    for suf, k in (('160', ''), ('720', '.l')):
        src = OFF + f'persona/{slug}-{suf}.webp'
        if os.path.exists(src): shutil.copy(src, SK + f'assets/comp/{slug}{k}.webp')
assert not missing, missing
order = ['fool', 'magician', 'priestess', 'empress', 'emperor', 'hierophant', 'lovers', 'chariot', 'justice', 'hermit', 'fortune', 'strength', 'hanged', 'death',
         'temperance', 'devil', 'tower', 'star', 'moon', 'sun', 'judgement', 'faith', 'councillor', 'world']
out = {'_source': 'aqiu384/megaten-fusion-tool src/app/p5/data roy-demon-data/roy-fusion-chart/roy-special-recipes/inheritance-types (P5R); 图鉴图 red/assets/official/persona（ATLUS/SEGA，私有自用）',
       'arcana': order, 'chart': tab, 'inherit': {'elems': inh['elems'], 'types': inh['inherits'], 'ratios': inh['ratios']},
       'special': {k: v for k, v in special.items()}, 'skills': skills, 'personas': sorted(P, key=lambda p: (order.index(p['arc']), p['lv']))}
json.dump(out, open(os.path.join(R, 'src/game/data/compendium.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print('personas', len(P), 'skills', len(skills), 'chart', len(tab))

# ---- 店主剪影：P5R 商店里店主是「纯黑剪影 + 白色描线/高光」（岩井、武见同一画法）。这里把立绘转成两色：暗部→黑、亮部线条→白，外缘白描边。
def p5_silhouette(src, out, tone=(0, 0, 0), line=(255, 255, 255), h=720, thr=185):
    im = Image.open(src).convert('RGBA'); a = im.getchannel('A')
    bb = a.point(lambda v: 255 if v > 24 else 0).getbbox(); im = im.crop(bb); a = im.getchannel('A')
    k = h / im.height; im = im.resize((round(im.width * k), h), Image.LANCZOS); a = im.getchannel('A')
    g = ImageOps.grayscale(im.convert('RGB')).filter(ImageFilter.GaussianBlur(0.8))
    edges = g.filter(ImageFilter.FIND_EDGES).point(lambda v: 255 if v > 30 else 0)
    hi = g.point(lambda v: 255 if v > thr else 0)
    # 亮部=白、暗部=黑；描线在白区画黑、在黑区画白（P5R 店主剪影的双向线稿）
    lines = ImageChops.logical_xor(hi.convert('1'), edges.convert('1')).convert('L')
    lines = ImageChops.multiply(lines, a.point(lambda v: 255 if v > 128 else 0))
    W, H = im.size; pad = 14
    base = Image.new('RGBA', (W + pad * 2, H + pad * 2), (0, 0, 0, 0))
    am = Image.new('L', base.size, 0); am.paste(a.point(lambda v: 255 if v > 100 else 0), (pad, pad))
    rim = am.filter(ImageFilter.MaxFilter(13))
    base.paste(Image.new('RGBA', base.size, line + (255,)), (0, 0), rim)
    base.paste(Image.new('RGBA', base.size, tone + (255,)), (0, 0), am)
    lm = Image.new('L', base.size, 0); lm.paste(lines, (pad, pad))
    base.paste(Image.new('RGBA', base.size, line + (255,)), (0, 0), lm)
    base.save(out, 'WEBP', quality=86, method=6); return base.size
A = SK + 'assets/'
rows = []
for sid, src, note in [('shop.iwai', OFF + 'slots/npc-military.webp', 'Untouchable 店主剪影（npc-military 伪官方立绘 → P5R 店主两色剪影处理）'),
                       ('shop.takemi', OFF + 'slots/npc-doctor.webp', '武见内科店主剪影（npc-doctor 伪官方立绘 → 两色剪影）'),
                       ('shop.vendor', OFF + 'slots/npc-vendor.webp', '道具店店主剪影（npc-vendor → 两色剪影）')]:
    w, h = p5_silhouette(src, A + sid + '.webp')
    rows.append({'id': sid, 'file': 'assets/' + sid + '.webp', 'w': w, 'h': h, 'firstPack': False, 'source': 'pseudo-official', 'group': 'shop', 'note': note})
for sid, src, box, note in [('npc.igor', OFF + 'extra/igor.webp', (900, 651), '伊戈尔（official/extra/igor）'),
                            ('npc.twins', OFF + 'slots/velvet-twins.webp', (520, 640), '天鹅绒双子（official/slots/velvet-twins）')]:
    im = Image.open(src).convert('RGBA'); im.thumbnail(box, Image.LANCZOS); im.save(A + sid + '.webp', 'WEBP', quality=84, method=6)
    rows.append({'id': sid, 'file': 'assets/' + sid + '.webp', 'w': im.width, 'h': im.height, 'firstPack': False, 'source': 'official', 'group': 'velvet', 'note': note})
G = os.path.join(R, 'work/m5src/')
if os.path.exists(G + 'velvet_bg.png'):
    im = Image.open(G + 'velvet_bg.png').convert('RGB'); k = max(1600 / im.width, 900 / im.height); im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    l, t = (im.width - 1600) // 2, (im.height - 900) // 2; im = im.crop((l, t, l + 1600, t + 900)); im.save(A + 'bg.velvet.webp', 'WEBP', quality=78, method=6)
    rows.append({'id': 'bg.velvet', 'file': 'assets/bg.velvet.webp', 'w': 1600, 'h': 900, 'firstPack': False, 'source': 'generated', 'group': 'velvet', 'note': '天鹅绒监狱（P5R 画风，generate_image，待替换官方）'})
if os.path.exists(G + 'guillotine.png'):
    im = Image.open(G + 'guillotine.png').convert('RGBA'); im = im.crop(im.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()); im.thumbnail((700, 900), Image.LANCZOS); im.save(A + 'fx.guillotine.webp', 'WEBP', quality=84, method=6)
    rows.append({'id': 'fx.guillotine', 'file': 'assets/fx.guillotine.webp', 'w': im.width, 'h': im.height, 'firstPack': False, 'source': 'generated', 'group': 'velvet', 'note': '断头台（合成演出占位素材，generate_image）'})
json.dump(rows, open(os.path.join(R, 'work/assets-m5.json'), 'w'), ensure_ascii=False, indent=1)
print('assets', [(r['id'], r['w'], r['h']) for r in rows])
