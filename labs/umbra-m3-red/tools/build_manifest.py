# 合成 skins/p5r-red/manifest.json（素材逐张 source + 图集帧 + 字体），并把皮肤静态文件复制到 public/skins/p5r-red/
import json, os, shutil, re
R = os.path.join(os.path.dirname(__file__), '..')
SK = os.path.join(R, 'src/umbra/skins/p5r-red')
assets = json.load(open(os.path.join(R, 'work/assets.json')))
fonts = json.load(open(os.path.join(R, 'work/fonts.json')))
DROP = {'ally.joker.back', 'cutin.joker', 'atlas.party', 'atlas.hud'}
out = []
for a in assets:
    if a['id'] in DROP: continue
    row = {k: a[k] for k in ['id', 'file', 'w', 'h', 'firstPack', 'source']}
    note = a.get('note', '')
    if a['id'] == 'atlas.party':
        m = re.search(r'(\{.*\})', note); row['frames'] = json.loads(m.group(1)); row['atlas'] = 'atlas.party'; note = note[:m.start()].rstrip('：')
    if a['id'] == 'atlas.hud':
        row['frames'] = {k: [i * 128, 0, 128, 128] for i, k in enumerate(['joker', 'agathion', 'caitsith', 'kelpie', 'navi'])}; row['atlas'] = 'atlas.hud'
    row['note'] = note
    out.append(row)
party = json.load(open(os.path.join(R, 'work/party-assets.json')))
for a in party:
    row = {k: a[k] for k in ['id', 'file', 'w', 'h', 'firstPack', 'source']}
    for k in ['group', 'frames', 'atlas']:
        if k in a: row[k] = a[k]
    row['note'] = a.get('note', '')
    out.append(row)
for d in DROP:
    try: os.remove(os.path.join(SK, 'assets', d + '.webp'))
    except FileNotFoundError: pass
man = {'assets': out, 'filters': ['ColorMatrix'], 'fonts': [{k: f[k] for k in ['family', 'file', 'chars', 'role', 'pack'] + (['unicodeRange'] if 'unicodeRange' in f else [])} for f in fonts]}
json.dump(man, open(os.path.join(SK, 'manifest.json'), 'w'), ensure_ascii=False, indent=1)
P = os.path.join(R, 'public/skins/p5r-red')
shutil.rmtree(P, ignore_errors=True); shutil.copytree(os.path.join(SK, 'assets'), os.path.join(P, 'assets')); shutil.copy(os.path.join(SK, 'ui.css'), P)
print('manifest assets', len(out), 'fonts', len(man['fonts']))
