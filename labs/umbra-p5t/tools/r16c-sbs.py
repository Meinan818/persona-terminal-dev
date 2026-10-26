#!/usr/bin/env python3
"""r16c 结算对比图：每行 左=我们 / 右=原版（同一时刻），框：绿=原版头部框，青=我们实测头部框；行首标注实测数值。
用法：r16c-sbs.py OUT.jpg A_p1.png A_p2.png B_p2.png heads_A.json heads_B.json iou.json"""
import cv2, numpy as np, sys, json
out, a1, a2, b2, ha, hb, iouf = sys.argv[1:8]
HA, HB, IOU = json.load(open(ha)), json.load(open(hb)), json.load(open(iouf))
REFH = {'A1': {'hero1': [365, 165, 160], 'other': [685, 230, 170], 'hero2': [1010, 122, 150]},
        'A2': {'hero1': [920, 167, 260], 'other': [255, 365, 210]}, 'B2': {'hero1': [842, 152, 285], 'other': [255, 365, 210]}}
R = {'A1': '/workspace/work/notes/r16b/ref/b1p1_970.0.png', 'A2': '/workspace/work/notes/r16b/ref/b1p2_974.25.png', 'B2': '/workspace/work/notes/r16b/ref/b3p2_1566.0.png'}
OURS = {'A1': (a1, HA['p1']), 'A2': (a2, HA['p2']), 'B2': (b2, HB['p2'])}
TITLE = {'A1': 'Scene A page1  @ResultIn+3.53s (orig 16:10.0)', 'A2': 'Scene A page2  @flip+1.95s (orig 16:14.25)', 'B2': 'Scene B page2  @flip+1.95s (orig 26:06.0)'}
NAME = {'hero1': 'front', 'other': 'Mona', 'hero2': 'third'}
def box(im, b, c, t=3):
    x, y, w = b[:3]; h = b[3] if len(b) > 3 else w
    cv2.rectangle(im, (int(x - w / 2), int(y - h / 2)), (int(x + w / 2), int(y + h / 2)), c, t)
rows = []
for k in ['A1', 'A2', 'B2']:
    f, H = OURS[k]; o = cv2.resize(cv2.imread(f), (1280, 720)); r = cv2.resize(cv2.imread(R[k]), (1280, 720))
    lines = [TITLE[k]]
    for role, rb in REFH[k].items():
        box(r, rb, (0, 255, 0)); box(o, rb, (0, 255, 0))
        c = H.get(role)
        if c: box(o, c, (255, 255, 0), 2); lines.append(f'{NAME[role]}: dx {abs(c[0]-rb[0])/12.8:.1f}%  dy {abs(c[1]-rb[1])/7.2:.1f}%  dw {abs(c[2]-rb[2])/12.8:.1f}%')
    i = IOU.get(k, {}); lines.append(f"red IoU full {i.get('full_iou', '?')}  band-region {i.get('band_iou', '?')}")
    bar = np.zeros((70 + 34 * (len(lines) - 1), 2560, 3), np.uint8)
    cv2.putText(bar, lines[0], (16, 46), cv2.FONT_HERSHEY_SIMPLEX, 1.3, (255, 255, 255), 3)
    for j, l in enumerate(lines[1:]): cv2.putText(bar, l, (16, 90 + 34 * j), cv2.FONT_HERSHEY_SIMPLEX, 0.95, (0, 255, 255), 2)
    cv2.putText(bar, 'LEFT = ours (rebuilt)   RIGHT = original   green = orig head box, cyan = ours measured', (1290, 46), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (200, 200, 200), 2)
    rows += [bar, np.hstack([o, r])]
img = np.vstack(rows); img = cv2.resize(img, (img.shape[1] // 2, img.shape[0] // 2), interpolation=cv2.INTER_AREA)
cv2.imwrite(out, img, [cv2.IMWRITE_JPEG_QUALITY, 90]); print('ok', out, img.shape)
