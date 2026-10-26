#!/usr/bin/env python3
"""r10：技能列表显示用原版数据 → src/rules/data/p5t-skill-ui.json（按原版技能 ID）。
来源：umbra-assets/p5t/1_data/skills.csv（原版 skill_database）+ word_database_zh_cn.csv（原版中文文本）+ conditions.csv（状态名）。
  名字 = word[NameWordKey]；说明 = word[DescWordKey]；SP = Cost（CostType 0）；威力 = PersonaDamageMin（帧 skill_list_1717_2：吉欧 45、加尔 25、耶哈 35 与表一致）；
  属性签文字 = conditions[AddEffectTypeParam1].NameWordKey（帧：吉欧「触电」、加尔「疾风」、耶哈「绝望」与表一致）；图标类型 = BattleMenuIconType；Range/HitType/HitParam 原样。
只导出游戏里 data.ts 用到的技能（按 src/rules/data/p5t-skills.json 的英文名→ID）。缺文本的列入 _gaps。"""
import csv, json, os, re, sys
UA = sys.argv[1] if len(sys.argv) > 1 else '/workspace/work/umbra-assets'
D = f'{UA}/p5t/1_data'
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
word = {r['Id']: r['Word_raw'] for r in csv.DictReader(open(f'{D}/word_database_zh_cn.csv', encoding='utf-8-sig'))}
cond = {r['ID']: r for r in csv.DictReader(open(f'{D}/conditions.csv', encoding='utf-8-sig'))}
sk = {r['ID']: r for r in csv.DictReader(open(f'{D}/skills.csv', encoding='utf-8-sig'))}
pub = json.load(open(os.path.join(ROOT, 'src/rules/data/p5t-skills.json')))
byName = {s['name'].lower(): s for s in pub}
dataTs = open(os.path.join(ROOT, 'src/rules/data.ts'), encoding='utf-8').read()
names = sorted(set(re.findall(r"name: '([^']+)'", dataTs)) | set(re.findall(r"atk\('\w+', '([^']+)'", dataTs)))
out, gaps = {}, []
for n in names:
    p = byName.get(n.lower())
    if not p or not (40000 <= int(p['id']) < 90000): continue  # 只要主动技能/Unique（被动名会撞到武器等 ID）
    r = sk.get(str(p['id']))
    if not r: gaps.append(f'{n}: skills.csv 无 ID {p["id"]}'); continue
    w = lambda k: word.get(r[k]) if r[k] not in ('', '0') else None
    c = cond.get(r['AddEffectTypeParam1']) if r['AddEffectType1'] == '1' else None
    e = {'id': int(r['ID']), 'en': n, 'name': w('NameWordKey'), 'desc': w('DescWordKey'), 'sp': int(r['Cost']) if r['CostType'] == '0' else None, 'costType': int(r['CostType']),
         'power': int(r['PersonaDamageMin']), 'label': word.get(c['NameWordKey']) if c else None, 'icon': int(r['BattleMenuIconType']),
         'range': int(r['Range']), 'hitType': int(r['HitType']), 'hitParam': int(r['HitParam'])}
    for k in ('name', 'desc') + (('label',) if r['DamageType'] == '1' and int(r['PersonaDamageMin']) > 0 else ()):
        if not e[k]: gaps.append(f'{n}({r["ID"]}): 缺 {k}')
    out[n] = e
out['_gaps'] = gaps
out['_src'] = 'umbra-assets p5t/1_data skills.csv + word_database_zh_cn.csv + conditions.csv（tools/gen-skill-ui.py）'
json.dump(out, open(os.path.join(ROOT, 'src/rules/data/p5t-skill-ui.json'), 'w'), ensure_ascii=False, indent=0)
for k, v in out.items(): print(k, v)
