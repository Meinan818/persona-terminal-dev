# 字体子集：display 拉丁（R5 Latin Display）+ number（R5 Num）原样复制；中文从 R5 Title SC 分片里按实际用到的字抽子集。
# 扫描 skins/p5r-red/*.json、recipes、src/game、engine 里的中文字符。输出 skins/p5r-red/assets/fonts/ 与 work/fonts.json
import os, re, glob, json, shutil
from fontTools.ttLib import TTFont
from fontTools import subset
ROOT = os.path.join(os.path.dirname(__file__), '..')
SK = os.path.join(ROOT, 'src/umbra/skins/p5r-red')
OUT = os.path.join(SK, 'assets/fonts'); os.makedirs(OUT, exist_ok=True)
F = '/workspace/work/umbra-red/red/fonts/'
text = ''
for p in [q for q in glob.glob(SK + '/**/*.json', recursive=True) if not q.endswith('manifest.json')]:
    text += open(p, encoding='utf-8').read()
cjk = sorted(set(ch for ch in text if ord(ch) > 0x2e7f and ch not in '\ufeff'))
extra = '，。！？…「」（）：、·～—★✦→｜×＋％'
cjk = sorted(set(cjk) | set(extra))
print('cjk chars', len(cjk))
chunks = sorted(glob.glob(F + 'r5-title-sc-*.woff2'))
left = set(cjk); rows = []
for i, c in enumerate(chunks):
    cm = TTFont(c).getBestCmap()
    have = [ch for ch in sorted(left) if ord(ch) in cm]
    if not have: continue
    left -= set(have)
    name = f'r5-cjk-{i}.woff2'
    opt = subset.Options(); opt.flavor = 'woff2'; opt.layout_features = ['*']; opt.name_IDs = ['*']
    ft = TTFont(c); s = subset.Subsetter(opt); s.populate(text=''.join(have)); s.subset(ft)
    ft.flavor = 'woff2'; ft.save(os.path.join(OUT, name))
    ur = ','.join('U+%X' % ord(ch) for ch in have)
    rows.append(dict(family='R5 CJK', file='assets/fonts/' + name, chars=''.join(have), role='display', pack='first', unicodeRange=ur,
                     kb=round(os.path.getsize(os.path.join(OUT, name)) / 1024, 1)))
# M4b：标题字体分片缺字 → 从完整 Noto Sans SC（wght 900 实例 = R5 Title SC 同一字体）补子集（OFL 1.1，改名 R5 CJK）
FULL = '/workspace/work/fonts-src/NotoSansSC-Black.ttf'
if left and os.path.exists(FULL):
    cm = TTFont(FULL).getBestCmap(); have = [ch for ch in sorted(left) if ord(ch) in cm]
    if have:
        left -= set(have); name = 'r5-cjk-fill.woff2'
        opt = subset.Options(); opt.flavor = 'woff2'; opt.layout_features = ['*']; opt.name_IDs = ['*']
        ft = TTFont(FULL); s2 = subset.Subsetter(opt); s2.populate(text=''.join(have)); s2.subset(ft)
        for rec in ft['name'].names:
            try:
                v = rec.toUnicode()
                if 'Noto' in v or 'Source' in v: rec.string = v.replace('Noto Sans SC', 'R5 CJK').replace('NotoSansSC', 'R5CJK').replace('Source', 'R5')
            except Exception: pass
        ft.flavor = 'woff2'; ft.save(os.path.join(OUT, name))
        rows.append(dict(family='R5 CJK', file='assets/fonts/' + name, chars=''.join(have), role='display', pack='first', unicodeRange=','.join('U+%X' % ord(ch) for ch in have),
                         kb=round(os.path.getsize(os.path.join(OUT, name)) / 1024, 1), note='补字：Noto Sans SC wght900 实例（R5 Title SC 同源），fonts-src 下载自 google/fonts ofl/notosanssc'))
        print('fill', ''.join(have))
# 标题字体缺字 → 同字体部件合成（synth_glyphs.py），保持笔画风格一致
if left:
    import sys; sys.path.insert(0, os.path.dirname(__file__))
    from synth_glyphs import synth
    row, left = synth(sorted(left), OUT)
    if row: rows.append(row); print('synth', row['chars'], row['kb'], 'KB')
# body fallback chunks (chars not in title font)
if left:
    for i, c in enumerate(sorted(glob.glob(F + 'r5-body-sc-*.woff2'))):
        cm = TTFont(c).getBestCmap(); have = [ch for ch in sorted(left) if ord(ch) in cm]
        if not have: continue
        left -= set(have); name = f'r5-cjkb-{i}.woff2'
        opt = subset.Options(); opt.flavor = 'woff2'; ft = TTFont(c); s = subset.Subsetter(opt); s.populate(text=''.join(have)); s.subset(ft); ft.flavor = 'woff2'; ft.save(os.path.join(OUT, name))
        rows.append(dict(family='R5 CJK', file='assets/fonts/' + name, chars=''.join(have), role='display', pack='first',
                         unicodeRange=','.join('U+%X' % ord(ch) for ch in have), kb=round(os.path.getsize(os.path.join(OUT, name)) / 1024, 1)))
print('missing', ''.join(sorted(left)))
for f, fam, role in [('r5-latin-display.woff2', 'R5 Latin Display', 'display'), ('r5-num.woff2', 'R5 Num', 'number')]:
    shutil.copy(F + f, os.path.join(OUT, f))
    cm = TTFont(F + f).getBestCmap()
    rows.insert(0, dict(family=fam, file='assets/fonts/' + f, chars=''.join(chr(c) for c in sorted(cm) if c < 0x3000), role=role, pack='first',
                        kb=round(os.path.getsize(F + f) / 1024, 1)))
# M5：商店/天鹅绒列表正文拉丁字（商品名、面具名、技能名用 P5R 英文原名）→ R5 Body（R5 Body SC 0 片的 ASCII 子集，OFL）
_lat = ''.join(chr(c) for c in range(0x20, 0x7f)) + '¥×·—–’‘“”…▲▼'
_ft = TTFont(F + 'r5-body-sc-0.woff2'); _cm = _ft.getBestCmap(); _have = ''.join(ch for ch in _lat if ord(ch) in _cm)
_o = subset.Options(); _o.flavor = 'woff2'; _o.layout_features = ['*']; _s = subset.Subsetter(_o); _s.populate(text=_have); _s.subset(_ft); _ft.flavor = 'woff2'
_ft.save(os.path.join(OUT, 'r5-body-latin.woff2'))
rows.append(dict(family='R5 Body', file='assets/fonts/r5-body-latin.woff2', chars=_have, role='body', pack='first', kb=round(os.path.getsize(os.path.join(OUT, 'r5-body-latin.woff2')) / 1024, 1)))
json.dump(rows, open(os.path.join(ROOT, 'work/fonts.json'), 'w'), ensure_ascii=False, indent=1)
print('fonts KB', round(sum(r['kb'] for r in rows), 1), [(r['file'], r['kb']) for r in rows])
