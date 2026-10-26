#!/usr/bin/env python3
"""r16b：结算红色掩膜 IoU（我们的整帧 vs 原版 result_1610/2606，同一阈值 R>170,G<70,B<80，1280×720）。用法：r16b-iou.py ours_p1.png ours_p2.png"""
import cv2, numpy as np, sys
REF = ['/workspace/work/notes/p5t-ref-video/frames/result_1610.png', '/workspace/work/notes/p5t-ref-video/frames/result_2606.png']
def m(f):
    im = cv2.resize(cv2.imread(f), (1280, 720)); b, g, r = [im[..., i].astype(int) for i in range(3)]
    return (r > 170) & (g < 70) & (b < 80)
for i, f in enumerate(sys.argv[1:3]):
    a, b = m(f), m(REF[i]); print(f'page{i+1} IoU={(a & b).sum() / (a | b).sum():.3f} ours_red={a.mean():.3f} ref_red={b.mean():.3f}')
