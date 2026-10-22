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
_pids = {a['id'] for a in party}; out = [r for r in out if r['id'] not in _pids]   # 第四阶段：同 id 以队伍素材（高清来源）为准
for a in party:
    row = {k: a[k] for k in ['id', 'file', 'w', 'h', 'firstPack', 'source']}
    for k in ['group', 'frames', 'atlas']:
        if k in a: row[k] = a[k]
    row['note'] = a.get('note', '')
    out.append(row)
m4 = json.load(open(os.path.join(R, 'work/assets-m4.json'))) if os.path.exists(os.path.join(R, 'work/assets-m4.json')) else []
out = [r for r in out if r['id'] not in {a['id'] for a in m4}] + m4   # M4 流程素材
m5 = json.load(open(os.path.join(R, 'work/assets-m5.json'))) if os.path.exists(os.path.join(R, 'work/assets-m5.json')) else []
out = [r for r in out if r['id'] not in {a['id'] for a in m5}] + m5   # M5 商店/天鹅绒素材（comp/ 图鉴图不进 manifest，运行时按需加载，来源见 compendium.json）
for d in DROP:
    try: os.remove(os.path.join(SK, 'assets', d + '.webp'))
    except FileNotFoundError: pass
man = {'assets': out, 'filters': ['ColorMatrix'], 'fonts': [{k: f[k] for k in ['family', 'file', 'chars', 'role', 'pack'] + (['unicodeRange'] if 'unicodeRange' in f else [])} for f in fonts]}
json.dump(man, open(os.path.join(SK, 'manifest.json'), 'w'), ensure_ascii=False, indent=1)
P = os.path.join(R, 'public/skins/p5r-red')
shutil.rmtree(P, ignore_errors=True); shutil.copytree(os.path.join(SK, 'assets'), os.path.join(P, 'assets')); shutil.copy(os.path.join(SK, 'ui.css'), P)
print('manifest assets', len(out), 'fonts', len(man['fonts']))

# 第四阶段：音频占位（AUDIO-MAP-v1 §6）—— json 清单复制到 public/skins/p5r-red/audio/，扫 bgm/se/voice 实际放入的文件写 present.json（运行时只请求已登记文件 → 缺文件静默、无 404）
A = os.path.join(SK, 'audio'); PA = os.path.join(P, 'audio')
os.makedirs(PA, exist_ok=True)
for n in ['sfx.json', 'playlist.json', 'voice.json']: shutil.copy(os.path.join(A, n), PA)
present = []
for sub in ['bgm', 'se', 'voice']:
    d0 = os.path.join(R, 'audio-local', sub)            # 本地私有音频（不进仓库、不进公开构建）
    if os.path.isdir(d0):
        for dp, _, fs in os.walk(d0):
            for f in fs:
                if f.endswith(('.opus', '.m4a', '.ogg', '.mp3', '.wav')):
                    rel = os.path.relpath(os.path.join(dp, f), os.path.join(R, 'audio-local'))
                    os.makedirs(os.path.dirname(os.path.join(PA, rel)), exist_ok=True); shutil.copy(os.path.join(dp, f), os.path.join(PA, rel)); present.append(rel.replace(os.sep, '/'))
json.dump({'files': sorted(present)}, open(os.path.join(PA, 'present.json'), 'w'))
print('audio present', len(present))
