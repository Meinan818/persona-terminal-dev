#!/usr/bin/env python3
"""r15：原版结算镜头 A_CA9999_BTL0070–0073（Timeline typetree，umbra-assets batch-08/anims/CA9999/json）→ src/view/data/result-cam.json。
解出的轨道（tools/ca9999_decode.py 解 streamed/constant clip）：
  path 2811360559 = 相机：局部位置 xyz + Camera.field of view + 一条脚本浮点（推断为 Dutch 滚转角，静止值 6.5°）
  path 464429447  = 相机的父节点（轴心）：只有 Y 轴旋转（In 43.4°→0；Cutchange 0→71.1°）
  path 397750199  = 另一个物体（飞入/飞出，推断为背景特效），不用
相机自身旋转没有轨道（场景里的静态值未导出）→ 推断为水平看向轴心 -Z。按 30fps 采样。"""
import json, os, sys, math
sys.path.insert(0, os.path.dirname(__file__))
import ca9999_decode as D
SRC = os.environ.get('CA9999', '/workspace/work/umbra-assets/p5t/1_battle/batch-08/anims/CA9999/json')
CAM, PIV = 2811360559, 464429447
out = {}
for nm in ['A_CA9999_BTL0070_BASE_ResultIn', 'A_CA9999_BTL0071_BASE_ResultLoop', 'A_CA9999_BTL0072_BASE_ResultCutchange', 'A_CA9999_BTL0073_BASE_ResultCutEndLoop']:
    d = json.load(open(os.path.join(SRC, nm + '.json'))); mc = d['m_MuscleClip']; c = mc['m_Clip']['data']
    # 复用解码：按曲线索引拿关键帧
    labels = []
    for b in d['m_ClipBindingConstant']['genericBindings']:
        k = D.curves_of(b)
        nmb = {1: 'pos', 2: 'rot', 3: 'scl', 4: 'eul'}.get(b['attribute'], 'f') if b['typeID'] == 4 else ('fov' if b['typeID'] == 20 else 'dutch')
        for i in range(k): labels.append((b['path'], nmb, i))
    sd = c['m_StreamedClip']['data']; sc = c['m_StreamedClip']['curveCount']; dc = c['m_DenseClip']['m_CurveCount']; const = c['m_ConstantClip']['data']
    per = {}; i = 0
    while i < len(sd):
        t = D.f32(sd[i]); nk = sd[i + 1]; i += 2
        for _ in range(nk):
            idx = sd[i]; co = [D.f32(x) for x in sd[i + 1:i + 5]]; i += 5
            if -1e30 < t < 1e30: per.setdefault(idx, []).append((t, co))
    stop = mc['m_StopTime']; n = max(2, round(stop * 30) + 1)
    def val(lab, t):
        ci = labels.index(lab)
        if ci < sc:
            ks = per.get(ci) or [(0, [0, 0, 0, 0])]
            prev = ks[0]
            for kk in ks:
                if kk[0] <= t + 1e-6: prev = kk
            dt = max(0, t - prev[0]); a, b, cc, dd = prev[1]
            return ((a * dt + b) * dt + cc) * dt + dd
        return const[ci - sc - dc]
    fr = []
    for f in range(n):
        t = min(stop, f / 30)
        qy, qw = val((PIV, 'rot', 1), t), val((PIV, 'rot', 3), t)
        fr.append([round(val((CAM, 'pos', 0), t), 4), round(val((CAM, 'pos', 1), t), 4), round(val((CAM, 'pos', 2), t), 4),
                   round(val((CAM, 'fov', 0), t), 3), round(val((CAM, 'dutch', 0), t), 3), round(math.degrees(2 * math.atan2(qy, qw)), 3)])
    out[nm.split('_BASE_')[1]] = {'dur': round(stop, 4), 'frames': fr}
json.dump({'_': 'cols = camX camY camZ fov dutch pivotYawDeg (Unity 局部坐标，30fps)', **out}, open('src/view/data/result-cam.json', 'w'), separators=(',', ':'))
print({k: (v['dur'], len(v['frames']), v['frames'][0], v['frames'][-1]) for k, v in out.items()})
