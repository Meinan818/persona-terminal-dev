#!/usr/bin/env python3
"""r16c 武器手部总览图：行 = 队员（含缺素材的 Noir/Crow/Kasumi），列 = 待机/射击/技能/结算/近战。
每格角度 = 武器握持方向（包围盒中心−挂点，手骨局部坐标）与参照握持（枪=射击 GunLoop、近战=Attack）的夹角；射击格另标枪管与正前方夹角。
游戏里该状态不显示该武器的格子标「游戏不显示」（探针强制显示，仅供参考，不计入 ≤20° 判定）。
用法：r16c-weapon-grid.py WPN_DIR OUT.jpg"""
import json, math, sys, os
from PIL import Image, ImageDraw, ImageFont
D, OUT = sys.argv[1:3]
M = json.load(open(f'{D}/metrics.json'))
# 标注用中文字体：CJK_FONT 覆盖；旧沙箱 /workspace/work/fonts-src/NotoSansSC.ttf；都没有就用仓库 public/fonts 里的思源系 woff2（Pillow/FreeType 可直接读）
F = next((p for p in [os.environ.get('CJK_FONT', ''), '/workspace/work/fonts-src/NotoSansSC.ttf',
                      os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../public/fonts/velvet-sans-sc.woff2')] if p and os.path.exists(p)), None)
f1, f2, f3 = ImageFont.truetype(F, 22), ImageFont.truetype(F, 17), ImageFont.truetype(F, 28)
ROWS = ['joker', 'skull', 'mona', 'panther', 'fox', 'queen', 'erina', 'noir', 'crow', 'kasumi']
NAME = dict(joker='Joker', skull='Skull', mona='Mona（已修正）', panther='Panther', fox='Fox', queen='Queen（已修正）', erina='Erina（已修正）', noir='Noir', crow='Crow', kasumi='Kasumi')
COLS = [('idle', '待机 Idle', 'gun'), ('shoot', '射击 GunLoop', 'gun'), ('skill', '技能 SkillActLoop', 'gun'), ('result', '结算 ResultFrontInLoop', 'gun'), ('attack', '近战 Attack', 'melee')]
def shown(k, st):  # 与 src/view/p5tChar.ts 的 show() 一致
    return st in ('shoot', 'attack') or (k == 'skull' and st == 'result')
ang = lambda a, b: math.degrees(math.acos(max(-1, min(1, sum(x * y for x, y in zip(a, b))))))
CW, CH, LW, TH = 320, 210, 170, 50
img = Image.new('RGB', (LW + CW * 5, TH + 60 + CH * len(ROWS)), (18, 18, 22)); d = ImageDraw.Draw(img)
d.text((10, 8), 'r16c 武器手部（探针 tools/r16c-weapon-shot.mjs，各 clip 0.35–0.4s）  角度=握持方向与参照（枪:射击 / 近战:Attack）夹角；射击另标 枪管↔正前方', font=f2, fill=(230, 230, 230))
d.text((10, 30), '判定：游戏中显示的格子 ≤20° 且 挂点-手骨 ≤10cm = 握正；灰格=游戏中该状态不显示该武器（强制显示，仅参考）', font=f2, fill=(180, 180, 180))
for j, (_, t, _) in enumerate(COLS): d.text((LW + j * CW + 8, TH + 20), t, font=f1, fill=(255, 255, 255))
bad = []
for i, k in enumerate(ROWS):
    y = TH + 60 + i * CH; d.text((8, y + 80), NAME[k], font=f1, fill=(255, 255, 255))
    v = M.get(k)
    if not v:
        d.rectangle([LW, y + 4, LW + CW * 5 - 4, y + CH - 4], fill=(50, 20, 20)); d.text((LW + 30, y + 80), '缺素材：正版武器 GLB 未导出（无法挂载）', font=f3, fill=(255, 120, 120)); continue
    for j, (st, _, kind) in enumerate(COLS):
        x = LW + j * CW; m = v.get(f'{st}_{kind}'); ref = v['shoot_gun' if kind == 'gun' else 'attack_melee']
        p = f'{D}/{k}_{st}_{kind}.png'
        if os.path.exists(p): img.paste(Image.open(p).convert('RGB').resize((CW - 6, CH - 6)), (x + 3, y + 3))
        if not m or 'gripDir' not in m: continue
        g = ang(m['gripDir'], ref['gripDir']); dist = m['locHandDist_cm']
        on = shown(k, st); ok = g <= 20 and dist <= 10 and (st != 'shoot' or m['aimDeg'] <= 20)
        lab = f"{'握正' if ok else '错位'} {g:.1f}°" + (f" 枪管{m['aimDeg']:.0f}°" if st == 'shoot' else '') + f" {dist:.0f}cm"
        if not on: lab = '游戏不显示 ' + lab
        col = (120, 120, 120) if not on else ((40, 200, 70) if ok else (230, 40, 40))
        if on and not ok: bad.append(f'{k}/{st} {g:.1f}°')
        d.rectangle([x + 3, y + CH - 32, x + CW - 3, y + CH - 3], fill=col); d.text((x + 8, y + CH - 30), lab, font=f2, fill=(255, 255, 255))
        if not on: d.rectangle([x + 3, y + 3, x + CW - 3, y + CH - 3], outline=(120, 120, 120), width=2)
img = img.resize((img.width * 3 // 4, img.height * 3 // 4), Image.LANCZOS); img.save(OUT, quality=88); print('ok', OUT, 'bad(shown):', bad)
