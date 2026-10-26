#!/usr/bin/env python3
"""r16c：结算红带 IoU（整帧 + 红带区域）。
用法：r16c-iou.py ours.png ref.png [ours_key.png ours_noband.png] [--vis out.png]
  红色阈值同 r16b：R>170, G<70, B<80（1280×720）。
  整帧 IoU：两张整帧红色掩膜直接比。
  红带区域 IoU：在整帧上去掉三类「非红带」干扰后再比——
    ① UI：两帧里的黑底面板/黑描边（max(RGB)<40）及其白字，膨胀 6px；
    ② 角色：ours_key.png（__rsDbg='key'：背景清成纯绿、不画红带，只剩角色 + DOM UI）里非绿像素，膨胀 8px（同一位置原版角色也在此——头部框已对齐 ≤5%）；
    ③ 背景红地毯等场景红：ours_noband.png（__rsDbg='noband'：正常背景、不画红带）里的红色像素（且不在角色里）。原版帧同一位置是同一块地毯（同一机位），一并排除。
"""
import cv2, numpy as np, sys, json
args = [a for a in sys.argv[1:] if not a.startswith('--')]
vis = sys.argv[sys.argv.index('--vis') + 1] if '--vis' in sys.argv else None
if vis in args: args.remove(vis)
rd = lambda f: cv2.resize(cv2.imread(f), (1280, 720)).astype(int)
def red(im): b, g, r = im[..., 0], im[..., 1], im[..., 2]; return (r > 170) & (g < 70) & (b < 80)
o, R = rd(args[0]), rd(args[1]); mo, mr = red(o), red(R)
iou = lambda a, b, d: float((a & b & d).sum() / max(1, ((a | b) & d).sum()))
res = {'full_iou': round(iou(mo, mr, np.ones_like(mo)), 3), 'ours_red': round(float(mo.mean()), 3), 'ref_red': round(float(mr.mean()), 3)}
if len(args) >= 4:
    k, nb = rd(args[2]), rd(args[3])
    dil = lambda m, n: cv2.dilate(m.astype(np.uint8), np.ones((n, n), np.uint8)) > 0
    ui = dil((o.max(2) < 40) | (R.max(2) < 40), 6)
    green = (k[..., 1] > 200) & (k[..., 0] < 60) & (k[..., 2] < 60)
    cast = dil(~green, 8)
    carpet = red(nb) & ~cast
    D = ~(ui | cast | carpet)
    res.update({'band_iou': round(iou(mo, mr, D), 3), 'domain_frac': round(float(D.mean()), 3), 'excl_ui': round(float(ui.mean()), 3), 'excl_cast': round(float(cast.mean()), 3), 'excl_carpet': round(float(carpet.mean()), 3)})
    if vis:
        v = np.zeros((720, 1280, 3), np.uint8); v[..., 2] = (mo & D) * 255; v[..., 1] = (mr & D) * 255; v[~D] = (60, 60, 60)
        cv2.imwrite(vis, v)
print(json.dumps(res))
