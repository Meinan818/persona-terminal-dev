#!/usr/bin/env python3
"""静态核对（2026-10-27）：src 里所有会被运行时加载的素材路径 → public/ 下是否存在。
python3 tools/audit-orig/static-paths.py [out.json]   输出每类 期望/缺失 清单。"""
import json, os, re, sys, glob
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
P = os.path.join(R, 'public')
src = {f: open(f, encoding='utf-8').read() for f in glob.glob(os.path.join(R, 'src/**/*.ts'), recursive=True)}
allsrc = '\n'.join(src.values())
def rd(rel): return open(os.path.join(R, rel), encoding='utf-8').read()
exp = {}  # 类别 -> [相对 public 路径]
def add(cat, p): exp.setdefault(cat, set()).add(p)
# 1 HUD 贴图（p5.has/url/img('名')，以及 party_/dying_/chara_/num_/icon_/om_anime_ 模板名）
for n in set(re.findall(r"p5\.(?:has|url|img)\('([A-Za-z0-9_]+)'", allsrc)): add('p5t-hud', f'p5t-hud/{n}.png')
for n in set(re.findall(r"p5\.(?:has|url|img)\(`([a-z_]+)\$\{", allsrc)):
    for f in glob.glob(os.path.join(P, 'p5t-hud', n + '*.png')): add('p5t-hud(模板,存在即列)', os.path.relpath(f, P))
    if not glob.glob(os.path.join(P, 'p5t-hud', n + '*.png')): add('p5t-hud', f'p5t-hud/{n}*.png')
add('p5t-hud', 'p5t-hud/manifest.json')
# 2 SDF 字体
for fnt in set(re.findall(r'data-sdf="([A-Za-z0-9_-]+)"', allsrc)) | set(re.findall(r"'(FOT_[A-Za-z0-9_]+|NikkyouSans[A-Za-z0-9_-]+)'", allsrc)):
    for f in ['atlas.png', 'glyphs.json', 'materials.json']: add('sdf-font', f'p5t-hud/font/{fnt}/{f}')
# 3 BGM
for c in set(re.findall(r'(bgm_[0-9a-z_]+): \{', rd('src/view/bgmData.ts'))):
    add('p5t-bgm', f'p5t-bgm/{c}.ogg'); add('p5t-bgm', f'p5t-bgm/{c}.m4a')
# 4 SFX（SfxName 联合类型）
sfx = rd('src/view/sfx.ts'); m = re.search(r'export type SfxName\s*=([^;]+);', sfx)
for n in re.findall(r"'([a-z0-9_]+)'", m.group(1)): add('p5t-sfx', f'p5t-sfx/{n}.ogg'); add('p5t-sfx', f'p5t-sfx/{n}.m4a')
for n in set(re.findall(r"'(se_btl_[a-z0-9_]+)'", allsrc)): add('p5t-sfx', f'p5t-sfx/{n}.ogg')
# 5 命中火花
h = rd('src/view/hitFx.ts')
for n in set(re.findall(r"otex\('([A-Za-z0-9_]+)'\)", h)) | set(re.findall(r"'([A-Za-z0-9_]+)'", re.search(r'preloadHitFx\(\) \{ for \(const n of \[([^\]]+)\]', h).group(1))):
    add('p5t-fx/hit', f'p5t-fx/hit/{n}.webp')
# 6 技能特效 + Persona
s = rd('src/view/skillFxOrig.ts')
for n in re.findall(r"'([A-Za-z0-9_]+)'", re.search(r'const NAMES = \[([^\]]+)\]', s).group(1)): add('p5t-fx/skill', f'p5t-fx/skill/{n}.webp')
for n in set(re.findall(r"\b([a-z]+_[A-Za-z0-9_]+)\b", ' '.join(re.findall(r'T\(\'([^\']+)\'\)', s)))): add('p5t-fx/skill', f'p5t-fx/skill/{n}.webp')
for k in re.findall(r":\s*'([a-z]+)'", re.search(r'PERSONA_OF[^=]*=\s*\{([^}]+)\}', s).group(1)): add('p5t-fx/persona', f'p5t-fx/persona/{k}.glb')
# 7 回合切换（turn-change.json 里 img.sp）
tc = json.load(open(os.path.join(R, 'src/ui/data/turn-change.json')))
def walk(o):
    if isinstance(o, dict):
        im = o.get('img')
        if isinstance(im, dict) and im.get('sp'): add('p5t-turn', f"p5t-turn/{im['sp']}.webp")
        for v in o.values(): walk(v)
    elif isinstance(o, list):
        for v in o: walk(v)
walk(tc)
for n in set(re.findall(r"'((?:YOUR|ENEMY)_TURN_[A-Za-z_0-9]+|bg_sheet)'", allsrc)): add('p5t-turn', f'p5t-turn/{n}.webp')
# 8 场内贴图
for n in set(re.findall(r"ffx\('([a-z0-9_]+)'", allsrc)): add('p5t-fieldfx', f'p5t-fieldfx/{n}.png')
for n in set(re.findall(r"'p5t-fieldfx/([^']+)'", allsrc)): add('p5t-fieldfx', f'p5t-fieldfx/{n}')
# 9 结算序列帧
for i in range(1, 23):
    add('result_seq', f'p5t-hud/result_seq/flash_{i:02d}.webp'); add('result_seq', f'p5t-hud/result_seq/smoke_{i:02d}.webp')
# 10 角色/武器/动作
pc = rd('src/view/p5tChar.ts')
for f in set(re.findall(r"'((?:p5t/)?[A-Za-z0-9][A-Za-z0-9_]*\.glb)'", pc)): add('models/private', f'models/private/{f}')
for g, w in re.findall(r"wp\('(gn\d+)', '(wp\d+)'", pc):
    add('models/private', f'models/private/p5t/wp_{g}.glb'); add('models/private', f'models/private/p5t/wp_{w}.glb'); add('models/private(motion)', f'models/private/p5t/wpm_{g}.glb')
for k in set(re.findall(r"key: '([a-z0-9_]+)', files: \['p5t/", pc)):
    d = os.path.join(P, 'models/private/p5t', k)
    add('models/private(shade)', f'models/private/p5t/{k}/shade.json')
    if os.path.exists(os.path.join(d, 'shade.json')):
        for v in json.load(open(os.path.join(d, 'shade.json'))).values(): add('models/private(shade)', f'models/private/p5t/{k}/{v}')
for k in ['joker', 'skull', 'mona']: add('models/private(anims)', f'models/private/p5t/{k}_anims.glb')
for f in ['joker_pc0001_151/T_PC0001_C051_ShadeMap_High.png', 'joker_pc0001_151/T_PC0001_H000_ShadeMap_High.png', 'joker_school.glb', 'joker_thief.glb']: add('models/private', f'models/private/{f}')
# 11 gimmick（gimmickData 的 UnitId 全集）
gd = rd('src/view/gimmickData.ts')
units = json.loads(re.search(r'GIMMICK_UNITS[^=]*= (\{.*?\});', gd).group(1))
for u in set(re.findall(r'\[(2000\d{4}),', gd)):
    add('gimmick(按落点 UnitId→file)', f"models/private/gimmick/{units[u]['file']}" if u in units else f'models/private/gimmick/<UnitId {u} 无映射>')
for f in set(re.findall(r'"(unit_\d+\.glb)"', gd)) | set(re.findall(r"'(unit_\d+\.glb)'", rd('src/view/gimmick.ts'))): add('gimmick', f'models/private/gimmick/{f}')
# 12 原版地图
om = rd('src/view/origMap.ts')
for lv, mm, f in re.findall(r"(L\d\d): \{ m: '(M\d\d)', file: '(M\d\d\.glb)'", om):
    add('maps', f'models/private/maps/{f}'); add('maps', f'models/private/maps/{f[:-4]}_lm.webp')
levels = sorted(set(re.findall(r'\b(L\d\d)\b', rd('src/game/levels/index.ts'))))
wired = set(re.findall(r"(L\d\d): \{ m: '", om))
# 13 Kenney 布景（回退/自制，列出被 sceneKit 引用的件）
kits = set(re.findall(r"'((?:town|castle|survival|pirate|furniture)/[a-z0-9-]+)'", allsrc))
for k in kits: add('KENNEY(自制/回退布景)', f'models/{k}.glb')
out = {'levels': levels, 'levels_without_orig_map': sorted(set(levels) - wired), 'cats': {}}
for cat, ps in sorted(exp.items()):
    miss = sorted(p for p in ps if '*' not in p and not os.path.exists(os.path.join(P, p))) + sorted(p for p in ps if '*' in p)
    out['cats'][cat] = {'expected': len(ps), 'missing': miss}
    print(f'{cat:28s} 期望 {len(ps):4d}  缺 {len(miss)}' + (('  → ' + ', '.join(miss[:12]) + (' …' if len(miss) > 12 else '')) if miss else ''))
print('无原版地图的关卡：', out['levels_without_orig_map'])
if len(sys.argv) > 1: json.dump(out, open(sys.argv[1], 'w'), ensure_ascii=False, indent=1)
