#!/usr/bin/env python3
"""r16：结算镜头按 Codex batch-08 CA9999/tracks（AnimatorController 引用的带 _ 后缀 clip，Blender 右手系 Y 上，(frame-1)/25 秒）重解。
结构（原始层级 camera_c01_top/camera1_group/{camera1, camera1_aim}）：
  camera1_group 只有 Y 旋转（轴心摇镜）；camera1 = 相机局部位置；camera1_aim = 看向点（r15 误当成「飞入物体」，实为相机注视目标 → 用 lookAt）。
FOV 不在 tracks 里 → 沿用 r15 从 typetree 解的 Camera.field of view（同一 clip、同一时间轴）。r15 的「脚本浮点（疑似 Dutch）」不再使用：有了注视点后不需要。
输出 src/view/data/result-cam.json：cols = camX camY camZ fov aimX aimY aimZ groupYawRad（右手系，30fps）。"""
import json, os, bisect
SRC = os.environ.get('CA9999T', os.environ.get('UMBRA_ASSETS', os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../../umbra-assets'))) + '/p5t/1_battle/batch-08/anims/CA9999/tracks')
old = json.load(open('src/view/data/result-cam.json'))
out = {'_': 'r16 cols = camX camY camZ fov aimX aimY aimZ groupYawRad（CA9999 tracks 右手系，相机看向 aim；30fps）'}
for key in ['ResultIn', 'ResultLoop', 'ResultCutchange', 'ResultCutEndLoop']:
    nm = [f for f in os.listdir(SRC) if f.endswith(key + '_.json')][0]
    d = json.load(open(os.path.join(SRC, nm)))
    T = {}
    for t in d['tracks']: T[(t['object'], t['property'], t['axis'])] = [(k['time'], k['value']) for k in t['keys']]
    def v(o, p, a, t):
        ks = T[(o, p, a)]; ts = [k[0] for k in ks]; i = bisect.bisect_right(ts, t) - 1
        if i < 0: return ks[0][1]
        if i >= len(ks) - 1: return ks[-1][1]
        (t0, v0), (t1, v1) = ks[i], ks[i + 1]; return v0 + (v1 - v0) * (t - t0) / max(1e-9, t1 - t0)
    dur = float(d['source_duration_s']); n = max(2, round(dur * 30) + 1)
    of = old[key]['frames']
    fr = []
    for f in range(n):
        t = min(dur, f / 30); fov = of[min(len(of) - 1, f)][3]
        fr.append([round(v('camera1', 'location', i, t), 4) for i in range(3)] + [fov] + [round(v('camera1_aim', 'location', i, t), 4) for i in range(3)] + [round(v('camera1_group', 'rotation_euler', 1, t), 4)])
    out[key] = {'dur': round(dur, 4), 'frames': fr}
    print(key, dur, fr[0], fr[-1])
json.dump(out, open('src/view/data/result-cam.json', 'w'), separators=(',', ':'))
