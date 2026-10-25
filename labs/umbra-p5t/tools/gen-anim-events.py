# 生成 src/view/p5tAnimEvents.ts：从 umbra-assets 原版 AnimationEvent 表取命中帧（见该文件头注释）
import csv, json, collections, os
SRC = os.environ.get('UMBRA_ASSETS', '/workspace/work/umbra-assets') + '/p5t/1_battle/animation_events/events.csv'
T = {'Joker': 'joker', 'Skull': 'skull', 'Mona': 'mona', 'Panther': 'panther', 'Fox': 'fox', 'Queen': 'queen', 'Erina': 'erina', 'PantherBrainwashed': 'panther_bw', 'FoxBrainwashed': 'fox_bw', 'Em0001': 'em0001_110', 'Em0001_016': 'em0001_016', 'Em0002_010': 'em0002_010', 'Em0003_010': 'em0003_010', 'Marie': 'marie'}
ev = collections.defaultdict(dict)
for r in csv.DictReader(open(SRC)):
    k = T.get(r['target'])
    if not k: continue
    c = r['clip'].split('BASE_')[-1]; t = round(float(r['time']), 4); ip = r['int_parameter']
    if c.startswith('GunFire'): ev[k].setdefault('GunFire', t)
    elif c.startswith('Attack') and ip == '2': ev[k]['Attack'] = t
    elif c.startswith('SkillActStart'): ev[k]['SkillActStart'] = max(ev[k].get('SkillActStart', 0), t)
    elif c.startswith('ChainFishingStart'): ev[k].setdefault('ChainFishingStart', t)
ev['em0001_610'] = ev['em0001_110']
hdr = open('src/view/p5tAnimEvents.ts').read().split('export const')[0]
open('src/view/p5tAnimEvents.ts', 'w').write(hdr + 'export const HIT_EVENTS: Record<string, Partial<Record<ClipKey, number>>> = ' + json.dumps(ev, indent=1) + ';\n')
