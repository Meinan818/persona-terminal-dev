#!/usr/bin/env python3
"""UMBRA 四皮皮肤包组装（skins v1，对接 feat/umbra-app-m2 的 skins/contract.ts + scripts/skin-check.mjs）。

输入：各皮分支上已有的素材/tokens/labels/slots/recipes（用 git archive 取，不切分支）。
输出：src/umbra/skins/<id>/{index.ts, pack.json, ui.css, assets/, audio/*.json, TODO.md}

用法（仓库根目录）：
  python3 tools/umbra-skins/build_packs.py            # 默认从 origin/feat/umbra-skin-<id> 取
  python3 tools/umbra-skins/build_packs.py --ref p5r-red=<commit>

pack.json 是 skin:check 读取的单一数据源；index.ts 只 import pack.json 并 default 导出（无演出代码、无副作用）。
"""
from __future__ import annotations

import argparse
import gzip
import io
import json
import os
import re
import shutil
import subprocess
import tarfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'src' / 'umbra' / 'skins'

SOURCES = {
    'p5r-red': ('origin/feat/umbra-skin-p5r-red', 'labs/umbra-m3-red/src/umbra/skins/p5r-red'),
    'p3-blue': ('origin/feat/umbra-skin-p3-blue', 'src/umbra/skins/p3-blue'),
    'p3r-pink': ('origin/feat/umbra-skin-p3r-pink', 'src/umbra/skins/p3r-pink'),
    'p4-yellow': ('origin/feat/umbra-skin-p4-yellow', 'src/umbra/skins/p4-yellow'),
}

# ---------------------------------------------------------------- 名单（原作，D-005）
# companions 第一段 = 原作初始三人（partyDefault），其后为完整同伴名单。
# companionPersonas = 初始面具；awakened = 觉醒/二阶段面具（仅记录，规则侧未用）。
ROSTERS = {
    'p5r-red': {
        'hero': 'joker', 'heroPersona': 'arsene', 'navigator': 'oracle',
        'partyDefault': ['skull', 'mona', 'panther'],
        'members': [
            # id, 显示名, 初始面具 id, 面具显示名, 觉醒面具 id
            ('joker', 'JOKER', 'arsene', 'Arsene', 'raoul'),
            ('skull', 'SKULL', 'captain-kidd', 'Captain Kidd', 'seiten-taisei'),
            ('mona', 'MONA', 'zorro', 'Zorro', 'mercurius'),
            ('panther', 'PANTHER', 'carmen', 'Carmen', 'hecate'),
            ('fox', 'FOX', 'goemon', 'Goemon', 'kamu-susano-o'),
            ('queen', 'QUEEN', 'johanna', 'Johanna', 'anat'),
            ('noir', 'NOIR', 'milady', 'Milady', 'astarte'),
            ('crow', 'CROW', 'robin-hood', 'Robin Hood', 'loki'),
            ('violet', 'VIOLET', 'cendrillon', 'Cendrillon', 'vanadis'),
            ('oracle', 'ORACLE', 'necronomicon', 'Necronomicon', 'prometheus'),
        ],
    },
    'p3-blue': {
        'hero': 'hero', 'heroPersona': 'orpheus', 'navigator': 'fuuka',
        'partyDefault': ['yukari', 'junpei', 'akihiko'],
        'members': [
            ('hero', '结城 理', 'orpheus', '俄耳甫斯', 'messiah'),
            ('yukari', '岳羽 由加莉', 'io', '伊奥', 'isis'),
            ('junpei', '伊织 顺平', 'hermes', '赫尔墨斯', 'trismegistus'),
            ('akihiko', '真田 明彦', 'polydeuces', '波吕丢刻斯', 'caesar'),
            ('mitsuru', '桐条 美鹤', 'penthesilea', '彭忒西勒亚', 'artemisia'),
            ('aigis', '埃癸斯', 'palladion', '帕拉狄昂', 'athena'),
            ('ken', '天田 乾', 'nemesis', '涅墨西斯', 'kala-nemi'),
            ('koromaru', '虎狼丸', 'cerberus', '刻耳柏洛斯', None),
            ('shinjiro', '荒垣 真次郎', 'castor', '卡斯托耳', None),
            ('fuuka', '山岸 风花', 'lucia', '卢基娅', 'juno'),
        ],
    },
    'p3r-pink': {
        'hero': 'hamuko', 'heroPersona': 'orpheus-f', 'navigator': 'fuuka',
        'partyDefault': ['yukari', 'junpei', 'akihiko'],
        'members': [
            ('hamuko', '哈姆子', 'orpheus-f', '俄耳甫斯', 'messiah'),
            ('yukari', '岳羽 由加莉', 'io', '伊奥', 'isis'),
            ('junpei', '伊织 顺平', 'hermes', '赫尔墨斯', 'trismegistus'),
            ('akihiko', '真田 明彦', 'polydeuces', '波吕丢刻斯', 'caesar'),
            ('mitsuru', '桐条 美鹤', 'penthesilea', '彭忒西勒亚', 'artemisia'),
            ('aigis', '埃癸斯', 'palladion', '帕拉狄昂', 'athena'),
            ('ken', '天田 乾', 'nemesis', '涅墨西斯', 'kala-nemi'),
            ('koromaru', '虎狼丸', 'cerberus', '刻耳柏洛斯', None),
            ('shinjiro', '荒垣 真次郎', 'castor', '卡斯托耳', None),
            ('fuuka', '山岸 风花', 'lucia', '卢基娅', 'juno'),
        ],
        'npcs': {'theodore': '提奥多亚'},
    },
    'p4-yellow': {
        'hero': 'hero', 'heroPersona': 'izanagi', 'navigator': 'rise',
        'partyDefault': ['yosuke', 'chie', 'yukiko'],
        'members': [
            ('hero', '鸣上 悠', 'izanagi', '伊邪那岐', 'izanagi-no-okami'),
            ('yosuke', '花村 阳介', 'jiraiya', '自来也', 'susano-o'),
            ('chie', '里中 千枝', 'tomoe', '巴御前', 'suzuka-gongen'),
            ('yukiko', '天城 雪子', 'konohana-sakuya', '木花开耶', 'amaterasu'),
            ('kanji', '巽 完二', 'take-mikazuchi', '建御雷', 'rokuten-maoh'),
            ('teddie', '克玛', 'kintoki-douji', '金时童子', 'kamui'),
            ('naoto', '白钟 直斗', 'sukuna-hikona', '少名毗古那', 'yamato-takeru'),
            ('rise', '久慈川 理世', 'himiko', '卑弥呼', 'kanzeon'),
        ],
    },
}

# ---------------------------------------------------------------- 图鉴排除（基于 App 共享 P5R 图鉴的 232 个 id）
FAM = {
    'izanagi': ['izanagi', 'izanagi-picaro', 'magatsu-izanagi', 'magatsu-izanagi-picaro',
                'izanagi-no-okami', 'izanagi-no-okami-picaro'],
    'kaguya': ['kaguya', 'kaguya-picaro'],
    'orpheus': ['orpheus', 'orpheus-picaro'],
    'orpheus-f': ['orpheus-f', 'orpheus-f-picaro'],
    'messiah': ['messiah', 'messiah-picaro'],
    'athena': ['athena', 'athena-picaro'],
    'pq2': ['ariadne', 'ariadne-picaro', 'asterius', 'asterius-picaro'],
    'p5only': ['arsene', 'raoul', 'satanael',
               # P5 宝魔（P3/P4 原作没有）
               'regent', 'queens-necklace', 'stone-of-scone', 'koh-i-noor', 'orlov',
               'emperors-amulet', 'hope-diamond', 'crystal-skull', 'orichalcum'],
}
PICARO_ALL = ['izanagi-picaro', 'magatsu-izanagi-picaro', 'izanagi-no-okami-picaro', 'kaguya-picaro',
              'orpheus-picaro', 'orpheus-f-picaro', 'messiah-picaro', 'thanatos-picaro', 'athena-picaro',
              'ariadne-picaro', 'asterius-picaro', 'tsukiyomi-picaro']


def excluded_for(skin: str) -> list[str]:
    s: list[str] = []
    if skin == 'p5r-red':  # P5R：排除 P3/P4/PQ2 联动 DLC 面具
        for k in ('izanagi', 'kaguya', 'orpheus', 'orpheus-f', 'messiah', 'athena', 'pq2'):
            s += FAM[k]
        s += ['thanatos-picaro', 'tsukiyomi-picaro']
    elif skin == 'p3-blue':
        for k in ('p5only', 'izanagi', 'kaguya', 'orpheus-f', 'pq2'):
            s += FAM[k]
        s += PICARO_ALL
    elif skin == 'p3r-pink':
        for k in ('p5only', 'izanagi', 'kaguya', 'orpheus', 'pq2'):
            s += FAM[k]
        s += PICARO_ALL
    elif skin == 'p4-yellow':
        for k in ('p5only', 'orpheus', 'orpheus-f', 'messiah', 'athena', 'pq2'):
            s += FAM[k]
        s += PICARO_ALL
    hero = ROSTERS[skin]['heroPersona']
    return sorted({x for x in s if x != hero})


# ---------------------------------------------------------------- labels 兜底（契约 v1.2 §4.2 + v1.3 §8 必填）
COMMON_LABELS = {
    'label.baton': 'BATON PASS', 'label.battleStart': 'BATTLE START', 'label.finish': 'FINISH',
    'result.levelup': 'LEVEL UP!',
    'tag.WEAK': 'WEAK', 'tag.CRIT': 'CRITICAL', 'tag.RESIST': 'RESIST', 'tag.MISS': 'MISS',
    'tag.NULL': 'BLOCK', 'tag.REPEL': 'REPEL', 'tag.DOWN': 'DOWN',
    'label.totalDamage': 'TOTAL DAMAGE', 'label.more': '更多', 'label.onemore': '1 MORE',
}
SKIN_LABELS = {
    'p5r-red': {'label.darkHour': '影时间'},
    'p3-blue': {'label.baton': 'SHIFT', 'label.battleStart': 'ENCOUNTER', 'label.finish': 'FINISHING TOUCH',
                'label.massDestruction': 'MASS DESTRUCTION', 'result.levelup': 'LEVEL UP!'},
    'p3r-pink': {'label.baton': 'SHIFT', 'label.battleStart': 'ENCOUNTER', 'label.finish': 'FINISHING TOUCH',
                 'label.massDestruction': 'MASS DESTRUCTION'},
    'p4-yellow': {'label.baton': 'BATON', 'label.battleStart': 'BATTLE START', 'label.finish': 'FINISH!',
                  'tag.WEAK': 'WEAK!', 'tag.CRIT': 'CRITICAL!'},
}

# ---------------------------------------------------------------- 1–5 敌站位（红色样板 M3 实测 0 重叠的坐标；scale = h/340）
RED_LAYOUT_FALLBACK = {
    '1': [{'x': 330, 'y': 560, 'h': 340}],
    '2': [{'x': 215, 'y': 548, 'h': 330}, {'x': 445, 'y': 566, 'h': 280}],
    '3': [{'x': 150, 'y': 540, 'h': 290}, {'x': 345, 'y': 566, 'h': 270}, {'x': 535, 'y': 530, 'h': 250}],
}


def enemy_layouts(slots: dict | None) -> dict:
    src = (slots or {}).get('scene.battle.enemyLayouts') or RED_SLOTS_LAYOUTS or RED_LAYOUT_FALLBACK
    out = {}
    for n in ('1', '2', '3', '4', '5'):
        row = src.get(n) or []
        order = sorted(range(len(row)), key=lambda i: row[i]['y'])  # y 小 = 更靠后
        out[n] = []
        for i, p in enumerate(row):
            depth = order.index(i)
            out[n].append({'x': p['x'], 'y': p['y'], 'scale': round(p.get('h', 340) / 340, 3),
                           'layer': f'enemy.{depth}'})
    return out


RED_SLOTS_LAYOUTS: dict | None = None


# ---------------------------------------------------------------- 工具
def git(*args: str, binary: bool = False):
    r = subprocess.run(['git', '-C', str(ROOT), *args], capture_output=True, check=True)
    return r.stdout if binary else r.stdout.decode()


def extract(ref: str, path: str, dest: Path) -> Path:
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True)
    data = git('archive', ref, path, binary=True)
    with tarfile.open(fileobj=io.BytesIO(data)) as tf:
        tf.extractall(dest, filter='data') if hasattr(tarfile, 'data_filter') else tf.extractall(dest)
    return dest / path


def flatten(obj, prefix=''):
    out = {}
    for k, v in obj.items():
        key = f'{prefix}.{k}' if prefix else k
        if isinstance(v, dict):
            out.update(flatten(v, key))
        else:
            out[key] = v if isinstance(v, str) else json.dumps(v) if isinstance(v, (list, bool)) else str(v)
    return out


def slug(s: str) -> str:
    s = re.sub(r'（.*?）|\(.*?\)', '', s).strip().lower()
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return s[:48] or 'track'


def placeholder_webp(path: Path, text: str, color: str) -> None:
    from PIL import Image, ImageDraw
    path.parent.mkdir(parents=True, exist_ok=True)
    im = Image.new('RGBA', (160, 160), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.polygon([(12, 20), (150, 8), (146, 150), (8, 140)], fill=color)
    d.polygon([(30, 40), (130, 32), (126, 128), (26, 122)], fill=(0, 0, 0, 200))
    d.text((40, 70), text[:6].upper(), fill=(255, 255, 255, 255))
    d.text((40, 96), 'TODO', fill=(255, 255, 255, 160))
    im.save(path, 'WEBP', quality=70)


# ---------------------------------------------------------------- 音频
CUE_RE = re.compile(r'^\|\s*([BPY])(\d+)\s*\|\s*([a-z.*/ _]+?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*$')
AUDIO_PREFIX = {'p3-blue': 'B', 'p3r-pink': 'P', 'p4-yellow': 'Y'}
COND_MAP = {'encounter=normal': {}, 'encounter=ambush': {'encounter': 'ambush'},
            'encounter=ambushed': {'encounter': 'ambushed'}}


def parse_condition(text: str):
    t = text.strip()
    if t in ('—', '-', '', '默认'):
        return {}, True
    if '设置' in t or '默认关' in t or '彩蛋' in t or '可选' in t:
        return {'note': t}, False
    cond: dict = {}
    for m in re.finditer(r'([a-zA-Z]+)\s*=\s*([a-zA-Z0-9]+)', t):
        k, v = m.group(1), m.group(2)
        cond[k] = True if v == 'true' else v
    if not cond and t:
        cond = {'note': t}
    return cond, True


def build_playlist(skin: str, audio_map: str) -> dict:
    prefix = AUDIO_PREFIX[skin]
    entries = []
    for line in audio_map.splitlines():
        m = CUE_RE.match(line)
        if not m or m.group(1) != prefix:
            continue
        no, scene, cond_text, track_text, basis_text = m.group(2), m.group(3).strip(), m.group(4), m.group(5), m.group(6)
        if track_text.startswith('不切') or scene in ('settings',) or '*' in scene or '/' in scene:
            continue
        cond, enabled = parse_condition(cond_text)
        note = cond.pop('note', None)
        titles = [t.strip() for t in re.split(r'\s*[/+＋]\s*(?![^（(]*[）)])', track_text) if t.strip()]
        tracks = []
        for t in titles:
            if not re.search(r'[A-Za-z]', re.sub(r'（.*?）|\(.*?\)', '', t)):
                continue  # 日文原名（同一首的别名），不单列
            title = re.sub(r'（[^（）]*）\s*$', '', t).strip()
            if not title or title.startswith(('同 ', '同上')):
                title = re.sub(r'（.*$', '', t).strip()
            tracks.append({'file': f'bgm/{scene}__{slug(title)}.opus', 'title': title, 'source': track_text,
                           'loopStart': 0, 'loopEnd': 0, 'weight': 1})
        e = {'id': f'{skin.split("-")[1]}.{prefix}{no}', 'scene': scene, 'condition': cond, 'tracks': tracks,
             'loop': True, 'basis': 'original' if basis_text.startswith('原作') else 'borrowed' if basis_text.startswith('借用') else 'unverified',
             'enabledByDefault': enabled}
        if note:
            e['note'] = note
        entries.append(e)
    return {'skin': skin, 'version': 1,
            'defaults': {'crossfadeMs': 800, 'victoryCrossfadeMs': 300, 'noRepeat': True},
            'note': f'由 docs/umbra-design/AUDIO-MAP-v1.md §2（{prefix} 表）生成；loopStart/loopEnd 0/0 = 待标；音频文件未入库（缺文件静默）。TODO',
            'entries': entries}


VOICE_KEYS = ['skill', 'attack', 'hurt', 'down', 'onemore', 'baton.give', 'baton.take', 'holdup', 'allout',
              'finish', 'highlight', 'victory']


def build_voice(skin: str, units: list[str]) -> dict:
    return {'skin': skin, 'version': 1, 'note': 'AUDIO-MAP-v1 §4.1；voice/<unitId>/<key>_<nn>.opus；文件未入库（缺文件静默）。TODO',
            'voice': {u: {k: [f'voice/{u}/{k}_01.opus'] for k in VOICE_KEYS} for u in units}}


# ---------------------------------------------------------------- 主流程
def build(skin: str, ref: str, src_path: str, tmp: Path, audio_map: str, red_sfx: dict | None) -> dict:
    global RED_SLOTS_LAYOUTS
    src = extract(ref, src_path, tmp / skin)
    commit = git('rev-parse', '--short', ref).strip()
    dst = OUT / skin
    if dst.exists():
        shutil.rmtree(dst)
    dst.mkdir(parents=True)
    todo: list[str] = []

    def load(name, default=None):
        p = src / name
        return json.loads(p.read_text()) if p.exists() else default

    manifest = load('manifest.json')
    tokens_tree = load('tokens.json', {})
    slots = load('slots.json', {})
    labels = load('labels.json', {})
    templates = load('templates.json')
    if skin == 'p5r-red':
        RED_SLOTS_LAYOUTS = slots.get('scene.battle.enemyLayouts')

    # 素材
    shutil.copytree(src / 'assets', dst / 'assets')
    if (src / 'ui.css').exists():
        shutil.copy2(src / 'ui.css', dst / 'ui.css')

    # recipes（红色排除给黄蓝粉看的 demo.* 演示）
    recipes = []
    for f in sorted((src / 'recipes').glob('*.json')):
        r = json.loads(f.read_text())
        if str(r.get('id', '')).startswith('demo.'):
            continue
        recipes.append(r)

    # 名单
    R = ROSTERS[skin]
    member_ids = [m[0] for m in R['members']]
    companions_full = [m for m in member_ids if m not in (R['hero'], R['navigator'])]
    companions = R['partyDefault'] + [c for c in companions_full if c not in R['partyDefault']]
    persona_of = {m[0]: m[2] for m in R['members']}
    members = {}
    asset_ids = {a['id'] for a in manifest['assets']}
    color = tokens_tree.get('color', {}).get('primary', '#888888')
    for mid, name, pid, pname, awakened in R['members']:
        head = next((c for c in (f'head.{mid}', f'unit.{mid}.head', f'ally.{mid}.head') if c in asset_ids), None)
        body = next((c for c in (f'char.{mid}', f'unit.{mid}.body', f'ally.{mid}.body') if c in asset_ids), None)
        if not head:
            pid_asset = f'placeholder.head.{mid}'
            placeholder_webp(dst / 'assets' / 'placeholder' / f'head.{mid}.webp', mid, color)
            manifest['assets'].append({'id': pid_asset, 'file': f'assets/placeholder/head.{mid}.webp', 'w': 160, 'h': 160,
                                       'firstPack': False, 'source': 'generated', 'group': f'head:{mid}',
                                       'note': 'TODO 占位：程序绘制色块+id，待换本作官方头像'})
            head = pid_asset
            todo.append(f'头像缺失 → 占位 {pid_asset}（{name}）')
        if not body and mid != R['navigator']:
            todo.append(f'立绘/身体层缺失：{mid}（{name}）— 引擎用通用剪影兜底')
        members[mid] = {'name': name, 'persona': pid, 'personaName': pname, 'personaAwakened': awakened,
                        'portrait': head, 'body': body,
                        'role': 'hero' if mid == R['hero'] else 'navigator' if mid == R['navigator'] else 'companion'}
        labels.setdefault(f'unit.{mid}', name)
        labels.setdefault(f'persona.{mid}', pname)
    for nid, nname in R.get('npcs', {}).items():
        labels.setdefault(f'npc.{nid}', nname)

    roster = {
        'heroPersona': R['heroPersona'],
        'companions': companions,
        'companionPersonas': {c: persona_of[c] for c in companions},
        'excludedPersonas': excluded_for(skin),
        # —— 以下为皮肤扩展字段（App contract 未声明，读取时可选） ——
        'hero': R['hero'],
        'navigator': R['navigator'],
        'navigatorPersona': persona_of[R['navigator']],
        'partyDefault': R['partyDefault'],
        'members': members,
    }
    if skin == 'p5r-red':
        rj = load('roster.json', {})
        roster['showtime'] = rj.get('showtime', [])
        roster['field'] = rj.get('chars', {})
        roster['gaps'] = rj.get('gaps', {})
    else:
        roster['showtime'] = []
        todo.append('roster.showtime（双人合击表）未填：P3 系 / P4 无 SHOWTIME 素材，highlight duo 走引擎「A × B」兜底')

    # labels 兜底
    for k, v in {**COMMON_LABELS, **SKIN_LABELS.get(skin, {})}.items():
        labels.setdefault(k, v)
    for r in recipes:
        sid = (r.get('match') or {}).get('skillId')
        if sid and sid not in ('attack', 'guard', 'gun', 'item'):
            labels.setdefault(f'skill.{sid}.name', labels.get(f'skill.{str(sid).lower()}.name', str(sid).replace('-', ' ').title()))
    for req in ('label.requestBoard', 'label.heartCard', 'label.holdup', 'label.allout', 'label.highlight',
                'label.rank', 'label.world', 'label.dive', 'label.darkHour'):
        if req not in labels:
            todo.append(f'labels 缺 {req}')

    # compendiumArt：persona id → 皮肤内素材文件
    art = {}
    by_id = {a['id']: a for a in manifest['assets']}
    for mid, m in members.items():
        for cand in (f'persona.{mid}', f'persona.{m["persona"]}'):
            if cand in by_id:
                art[m['persona']] = by_id[cand]['file']
                break
    for a in manifest['assets']:
        if a['id'].startswith('persona.'):
            pid = a['id'][len('persona.'):]
            if pid not in member_ids:
                art.setdefault(pid, a['file'])
    missing_art = [m['persona'] for m in members.values() if m['persona'] not in art]
    if missing_art:
        todo.append('compendiumArt 缺本作面具图（App 用共享图兜底）：' + ', '.join(missing_art))
    todo.append('compendiumArt 仅覆盖队伍/已有面具；公共恶魔（Pixie 等）的本作图鉴图未做，App 用共享 P5R 图兜底')

    # 字体 bytes（skin:check 字体预算读 fonts[].bytes）
    for f in manifest.get('fonts', []):
        p = dst / f['file']
        f['bytes'] = p.stat().st_size if p.exists() else 0

    # 音频
    (dst / 'audio').mkdir(exist_ok=True)
    if skin == 'p5r-red':
        for n in ('playlist', 'sfx', 'voice'):
            shutil.copy2(src / 'audio' / f'{n}.json', dst / 'audio' / f'{n}.json')
        todo.append('音频文件（bgm/se/voice）未入库：三份 json 齐，present.json 由引擎构建生成；缺文件静默')
    else:
        (dst / 'audio' / 'playlist.json').write_text(json.dumps(build_playlist(skin, audio_map), ensure_ascii=False, indent=1))
        sfx = dict(red_sfx or {})
        sfx['skin'] = skin
        sfx['note'] = 'SE 四皮同表（AUDIO-MAP-v1 §3），结构沿用红色样板；文件未入库，缺文件静默。TODO'
        (dst / 'audio' / 'sfx.json').write_text(json.dumps(sfx, ensure_ascii=False, indent=1))
        (dst / 'audio' / 'voice.json').write_text(json.dumps(build_voice(skin, [m for m in member_ids if m != R['navigator']]), ensure_ascii=False, indent=1))
        todo.append('音频：playlist 由 AUDIO-MAP §2 自动生成（条件/循环点待人工校），sfx 沿用红色 se 表，voice 仅占位路径；音频文件未入库')
    if skin != 'p5r-red':
        todo.append('enemyLayouts[1..5] 借用红色样板实测坐标（换算 scale=h/340），待本皮实机截图微调')

    pack = {
        'id': skin,
        'contract': '1.3',
        'packVersion': 1,
        'origin': {'ref': ref, 'commit': commit, 'path': src_path},
        'manifest': manifest,
        'tokens': flatten(tokens_tree),
        'tokenTree': tokens_tree,
        'slots': slots,
        'templates': templates,
        'labels': dict(sorted(labels.items())),
        'recipes': recipes,
        'enemyLayouts': enemy_layouts(slots),
        'roster': roster,
        'compendiumArt': dict(sorted(art.items())),
        'audio': {'dir': 'audio', 'playlist': 'audio/playlist.json', 'sfx': 'audio/sfx.json',
                  'voice': 'audio/voice.json', 'present': 'audio/present.json（构建生成，未提交）'},
        'css': 'ui.css' if (dst / 'ui.css').exists() else None,
    }

    # 首包预算（契约 §5：≤1MB；图 ≤780KB、数据 ≤40KB、ui.css ≤24KB gzip、字体 ≤120KB）
    first_files = {a['file'] for a in manifest['assets'] if a.get('firstPack')}
    party_heads = {members[m]['portrait'] for m in [R['hero'], *R['partyDefault']]}
    first_files |= {by_id[h]['file'] for h in party_heads if h in by_id and by_id[h].get('group', '').startswith('head:')}
    img = sum((dst / f).stat().st_size for f in first_files if (dst / f).exists())
    fonts = sum(f['bytes'] for f in manifest.get('fonts', []) if f.get('pack', 'first') == 'first')
    css_gz = len(gzip.compress((dst / 'ui.css').read_bytes())) if (dst / 'ui.css').exists() else 0
    pack['budget'] = {'firstPackImageBytes': img, 'fontBytes': fonts, 'uiCssGzipBytes': css_gz}
    pack['todo'] = todo
    raw = json.dumps(pack, ensure_ascii=False, separators=(',', ':'))
    data_gz = len(gzip.compress(raw.encode()))
    pack['budget']['packJsonGzipBytes'] = data_gz
    pack['budget']['firstPackTotalBytes'] = img + fonts + css_gz + data_gz
    pack['budget']['limitBytes'] = 1024 * 1024
    if pack['budget']['firstPackTotalBytes'] > 1024 * 1024:
        todo.append('首包超 1MB！')
    if data_gz > 40 * 1024:
        todo.append(f'pack.json gzip {data_gz}B > 40KB 数据分项（recipes 多；总首包仍在 1MB 内）')

    (dst / 'pack.json').write_text(json.dumps(pack, ensure_ascii=False, indent=1) + '\n')
    (dst / 'index.ts').write_text(
        f"// {skin} 皮肤包入口（契约 v1.3 · skins v1）。只导出 pack.json：无演出代码、无动态 import、无副作用。\n"
        f"// 由 tools/umbra-skins/build_packs.py 从 {ref}@{commit} 组装；App 侧经 skins/loaders.ts 的 import.meta.glob 懒加载。\n"
        "import pack from './pack.json';\n\n"
        "export default pack;\n")
    lines = [f'# {skin} · 占位 / TODO（skins v1）', '', f'来源：`{ref}` @ `{commit}`（`{src_path}`）', '',
             f"首包估算：图 {img} B + 字体 {fonts} B + ui.css(gz) {css_gz} B + pack.json(gz) {data_gz} B = **{pack['budget']['firstPackTotalBytes']} B**（上限 1048576）", '']
    lines += [f'- [ ] {t}' for t in todo]
    (dst / 'TODO.md').write_text('\n'.join(lines) + '\n')
    return pack


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--ref', action='append', default=[], help='skin=gitref 覆盖来源')
    ap.add_argument('--tmp', default='/tmp/umbra-skins-build')
    args = ap.parse_args()
    refs = {k: v[0] for k, v in SOURCES.items()}
    for kv in args.ref:
        k, v = kv.split('=', 1)
        refs[k] = v
    tmp = Path(args.tmp)
    audio_map = git('show', 'HEAD:docs/umbra-design/AUDIO-MAP-v1.md')
    red = build('p5r-red', refs['p5r-red'], SOURCES['p5r-red'][1], tmp, audio_map, None)
    red_sfx = json.loads((OUT / 'p5r-red' / 'audio' / 'sfx.json').read_text())
    for skin in ('p3-blue', 'p3r-pink', 'p4-yellow'):
        build(skin, refs[skin], SOURCES[skin][1], tmp, audio_map, red_sfx)
    for skin in SOURCES:
        b = json.loads((OUT / skin / 'pack.json').read_text())['budget']
        print(skin, b)


if __name__ == '__main__':
    main()
