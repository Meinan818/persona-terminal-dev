# M4 流程素材：据点/殿堂背景、Q 版小人（generated）、BOSS/精英/店主（official·pseudo-official 只读缩放）→ skins/p5r-red/assets + work/assets-m4.json
import json, os
from PIL import Image
R = os.path.join(os.path.dirname(__file__), '..')
G = os.path.join(R, 'work/m4src/'); O = '/workspace/work/umbra-red/red/assets/official/slots/'
A = os.path.join(R, 'src/umbra/skins/p5r-red/assets/'); out = []
def tight(im):
    bb = im.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox(); return im.crop(bb)
def fit(im, box):
    im = im.copy(); im.thumbnail(box, Image.LANCZOS); return im
def save(im, id, group, source, note, q=82):
    p = A + id + '.webp'; im.save(p, 'WEBP', quality=q, method=6)
    out.append({'id': id, 'file': 'assets/' + id + '.webp', 'w': im.width, 'h': im.height, 'firstPack': False, 'source': source, 'group': group, 'note': note})
def cover(im, W, H):
    k = max(W / im.width, H / im.height); im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    l, t = (im.width - W) // 2, (im.height - H) // 2; return im.crop((l, t, l + W, t + H))
save(cover(Image.open(G + 'm4_bg_hideout.png').convert('RGB'), 2260, 960), 'bg.hideout', 'flow', 'generated', 'M4 据点阁楼（P5R 背景画风，generate_image，待替换官方）', 78)
save(cover(Image.open(G + 'm4_bg_palace.png').convert('RGB'), 2260, 960), 'bg.explore.palace', 'flow', 'generated', 'M4 殿堂潜入背景（generate_image）', 76)
for n in ['joker', 'guard', 'elite']:
    save(fit(tight(Image.open(G + f'm4_chibi_{n}.png').convert('RGBA')), (300, 300)), 'chibi.' + n, 'flow', 'generated', 'M4 Q 版小人（P5T 风格伪官方，generate_image）')
team = Image.open(G + 'm4_chibi_team.png').convert('RGBA'); a = team.getchannel('A')
cols = [any(a.getpixel((x, y)) > 24 for y in range(0, team.height, 3)) for x in range(team.width)]
segs, s = [], None
for x, c in enumerate(cols + [False]):
    if c and s is None: s = x
    if not c and s is not None:
        if x - s > 40: segs.append((s, x))
        s = None
for name, (l, r) in zip(['skull', 'mona', 'panther'], segs):
    save(fit(tight(team.crop((l, 0, r, team.height))), (300, 300)), 'chibi.' + name, 'flow', 'generated', 'M4 Q 版同伴（P5T 风格伪官方）')
save(fit(tight(Image.open(O + 'boss-echo-phase1.webp').convert('RGBA')), (640, 640)), 'enemy.boss1', 'enemy:boss', 'official', 'BOSS 一阶段（red/assets/official/slots/boss-echo-phase1）')
save(fit(tight(Image.open(O + 'boss-echo-phase2.webp').convert('RGBA')), (720, 640)), 'enemy.boss2', 'enemy:boss', 'official', 'BOSS 二阶段（boss-echo-phase2）')
save(fit(tight(Image.open(O + 'enemy-gatekeeper.webp').convert('RGBA')), (560, 560)), 'enemy.elite', 'enemy:elite', 'official', '精英（P5R Berith，enemy-gatekeeper）')
for n in ['doctor', 'military']:
    save(fit(tight(Image.open(O + f'npc-{n}.webp').convert('RGBA')), (420, 640)), 'npc.' + n, 'flow', 'pseudo-official', '店主占位（包 F 伪官方）')
save(fit(tight(Image.open(O + 'velvet-twins.webp').convert('RGBA')), (520, 640)), 'npc.velvet', 'flow', 'official', '天鹅绒双子（合成入口占位）')
K = '/workspace/work/umbra-red/red/assets/kit/'
save(Image.open(K + 'card_emblem.webp').convert('RGBA'), 'callingcard', 'flow', 'generated', 'M4b 预告信卡面（red/assets/kit/card_emblem，生成素材，待替换官方）', 86)
json.dump(out, open(os.path.join(R, 'work/assets-m4.json'), 'w'), ensure_ascii=False, indent=1)
print(len(out), [(o['id'], o['w'], o['h']) for o in out])
