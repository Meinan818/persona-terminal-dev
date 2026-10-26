#!/usr/bin/env python3
"""UMBRA r9：原版 Lightmap-0_comp_light.exr（Codex 导出，2048² half）→ 手机版 WebP（私用不入库）。
EXR 里是原版贴图的原始值（0..1，最大值正好 1.0 → 原版是 LDR 编码的 dLDR lightmap，不是 HDR）。
游戏里解码：线性光照 = 原始值 × 4.59（Unity 线性色彩空间下 dLDR 的 unity_Lightmap_HDR.x = 2^2.2；推断，已标明）。
存储（r13：游戏内 ×1，BC6H 线性）：sRGB 曲线编码原始值（暗部精度更高）→ three 按 SRGBColorSpace 采样即回到原始值；≤1024，WebP q92。
用法: conv-lightmap.py in.exr out.webp [max=1024]"""
import sys, numpy as np, OpenEXR
from PIL import Image
src, dst = sys.argv[1:3]; mx = int(sys.argv[3]) if len(sys.argv) > 3 else 1024
a = OpenEXR.File(src).channels()['RGBA'].pixels.astype(np.float32)[..., :3]
a = np.clip(a, 0, 1)
s = np.where(a <= 0.0031308, a * 12.92, 1.055 * np.power(a, 1 / 2.4) - 0.055)
im = Image.fromarray((s * 255 + 0.5).astype(np.uint8), 'RGB')
if max(im.size) > mx: im = im.resize((mx, mx), Image.LANCZOS)
im.save(dst, 'WEBP', quality=92, method=6)
import os; print('lightmap', dst, im.size, os.path.getsize(dst))
