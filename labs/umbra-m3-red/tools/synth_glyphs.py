# 子集字体补字：R5 Title SC 分片里缺的字，用同字体的部件拼成合成字形（与原字同笔画粗细）。
# 目前：咔 = 「吐」左侧口字旁轮廓 + 「卡」整字横向压缩到右侧 0.40–0.98em；
#       潜 = 「消」左侧三点水轮廓 + 「替」整字横向压缩到右侧 0.33–0.98em（「潜入」按钮）。
# 由 subset_fonts.py 在 left（缺字集合）非空时调用；输出 assets/fonts/r5-cjk-synth.woff2，返回 fonts.json 行。
import os
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.recordingPen import RecordingPen

F = '/workspace/work/umbra-red/red/fonts/'
# 合成配方：目标字 → [(部件字, 只取 xMax≤阈值 的轮廓(None=全部), 变换 (sx, 0, 0, sy, dx, dy))]
RECIPES = {
    '咔': [('吐', 400, (1, 0, 0, 1, 0, 0)), ('卡', None, (0.63, 0, 0, 1.0, 374, 0))],
    '潜': [('消', 340, (1, 0, 0, 1, 0, 0)), ('替', None, (0.67, 0, 0, 1.0, 317, 0))],
}

def _find(ch):
    import glob
    for f in sorted(glob.glob(F + 'r5-title-sc-*.woff2')):
        t = TTFont(f); cm = t.getBestCmap()
        if ord(ch) in cm: return t, cm[ord(ch)]
    return None, None

def _contours(t, gname, xmax):
    rec = RecordingPen(); t.getGlyphSet()[gname].draw(rec)
    # 按 closePath 切轮廓，按 x 上限过滤
    out, cur = [], []
    for op, args in rec.value:
        cur.append((op, args))
        if op in ('closePath', 'endPath'):
            xs = [p[0] for _, a in cur for p in a]
            if xmax is None or (xs and max(xs) <= xmax): out.extend(cur)
            cur = []
    return out

def synth(missing, out_dir):
    todo = [ch for ch in missing if ch in RECIPES]
    if not todo: return None, set(missing)
    from fontTools.fontBuilder import FontBuilder
    glyphs = {'.notdef': TTGlyphPen(None).glyph()}; metrics = {'.notdef': (1000, 0)}; cmap = {}
    for ch in todo:
        pen = TTGlyphPen(None)
        for part, xmax, tr in RECIPES[ch]:
            t, g = _find(part)
            tp = TransformPen(pen, tr)
            for op, args in _contours(t, g, xmax): getattr(tp, op)(*args)
        name = 'uni%04X' % ord(ch); gl = pen.glyph(); gl.recalcBounds(None)
        glyphs[name] = gl; metrics[name] = (1000, gl.xMin); cmap[ord(ch)] = name
    fb = FontBuilder(1000, isTTF=True); fb.setupGlyphOrder(list(glyphs)); fb.setupCharacterMap(cmap)
    fb.setupGlyf(glyphs); fb.setupHorizontalMetrics(metrics); fb.setupHorizontalHeader(ascent=1160, descent=-288)
    fb.setupNameTable({'familyName': 'R5 CJK Synth', 'styleName': 'Regular'}); fb.setupOS2(sTypoAscender=1160, sTypoDescender=-288, usWinAscent=1160, usWinDescent=288)
    fb.setupPost(); fb.font.flavor = 'woff2'
    fn = os.path.join(out_dir, 'r5-cjk-synth.woff2'); fb.save(fn)
    chars = ''.join(todo)
    row = dict(family='R5 CJK', file='assets/fonts/r5-cjk-synth.woff2', chars=chars, role='display', pack='first',
               unicodeRange=','.join('U+%X' % ord(c) for c in chars), kb=round(os.path.getsize(fn) / 1024, 1),
               note='合成字形（同字体部件拼合）：' + chars)
    return row, set(missing) - set(todo)
