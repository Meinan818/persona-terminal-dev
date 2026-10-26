#!/usr/bin/env python3
"""r16c：结算红带逐页重描 v2 → src/view/data/result-bands.json（1280×720 帧像素；在 labs/umbra-p5t 下运行）。
第 1 页：result_1610（= b1 场 16:10.0）；第 2 页：两场同一时刻帧 b1p2_974.25（16:14.25）∪ result_2606（26:06.0）的红色掩膜取并集——
两场角色不同、红带相同（掩膜 IoU 0.77，差异全在角色上），并集能把被角色挡住的红带补出来。
掩膜 R>170,G<70,B<80 → 闭 9px / 开 5px → 只取外轮廓并填实（被 UI 面板/角色挡住的洞按连续红带处理）→ 去掉不碰画面边且 <8000px² 的小块（角色身上的红）→ approxPolyDP ε=1.5px。
仍属「按帧重建」：ResultLineManager 的线条参数不在 bundle 里。"""
import cv2, numpy as np, json
F = '/workspace/work/notes/p5t-ref-video/frames/'; R16 = '/workspace/work/notes/r16b/ref/'
SRC = {1: [F + 'result_1610.png'], 2: [R16 + 'b1p2_974.25.png', F + 'result_2606.png']}
def redmask(f):
    im = cv2.resize(cv2.imread(f), (1280, 720)); b, g, r = [im[..., i].astype(int) for i in range(3)]
    return ((r > 170) & (g < 70) & (b < 80)).astype(np.uint8)
out = {}
for pg, fs in SRC.items():
    m = np.zeros((720, 1280), np.uint8)
    for f in fs: m |= redmask(f)
    mc = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    mc = cv2.morphologyEx(mc, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    cs, _ = cv2.findContours(mc, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    polys = []
    for c in cs:
        a = cv2.contourArea(c)
        if a < 400: continue
        x, y, w, h = cv2.boundingRect(c)
        if x > 2 and y > 2 and x + w < 1278 and y + h < 718 and a < 8000: continue
        polys.append(cv2.approxPolyDP(c, 1.5, True).reshape(-1, 2).tolist())
    out[str(pg)] = polys; print(pg, 'polys', len(polys), 'pts', sum(len(p) for p in polys))
json.dump(out, open('src/view/data/result-bands.json', 'w'), separators=(',', ':'))
