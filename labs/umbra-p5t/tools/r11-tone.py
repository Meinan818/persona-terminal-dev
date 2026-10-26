# r11 色调统计：python3 tools/r11-tone.py img... → 每张图在场景区域（x620–1240, y150–600，避开左侧技能列表/右上目标面板/右下头像卡）的
# 亮度均值、对比 σ、饱和度、地毯红占比、红色均值、非红区（石板等）亮度与 RGB 均值。需要 numpy + Pillow（PYTHONPATH=/workspace/work/pyf）
import sys, json, numpy as np
from PIL import Image
def stat(f, box=(620, 150, 1240, 600)):
    a = np.array(Image.open(f).convert('RGB').resize((1280, 720))).astype(float)[box[1]:box[3], box[0]:box[2]].reshape(-1, 3)
    r, g, b = a.T
    L = 0.299 * r + 0.587 * g + 0.114 * b
    mx, mn = a.max(1), a.min(1); sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)
    red = (r > 70) & (r > 2.2 * g) & (r > 2.2 * b)
    o = {'lum': L.mean(), 'sigma': L.std(), 'sat': sat.mean(), 'redFrac': red.mean(),
         'redMean': a[red].mean(0).round().tolist() if red.any() else None,
         'otherLum': L[~red].mean(), 'otherRGB': a[~red].mean(0).round().tolist()}
    return {k: (round(v, 3) if isinstance(v, float) else v) for k, v in o.items()}
print(json.dumps({f.split('/')[-1]: stat(f) for f in sys.argv[1:]}, ensure_ascii=False, indent=0))
