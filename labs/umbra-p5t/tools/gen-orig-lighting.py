#!/usr/bin/env python3
"""UMBRA r9：原版逐关光照数据 → src/view/origLighting.ts（只有数值，进 git）。

来源（umbra-assets，Codex r7 item 5，原始 typetree，自己核对过字段）：
  p5t/1_battle/r7/lighting/missions/Mxx/lights.json        Light：m_Type 1=Directional（0 Spot/2 Point/3 Area），
                                                         m_Lightmapping 1=Mixed（4 Realtime / 2 Baked）
  p5t/1_battle/r7/lighting/missions/Mxx/scene_lighting.json RenderSettings（环境光 Trilight / 雾）
  p5t/1_battle/batch-03/maps/Mxx/scene_map_*.glb             父节点旋转（GLB 节点树）
只取每图唯一的 Directional（Mixed：实时直射 + 烘焙间接）。Point/Area（M07/M08/M17）是烘焙灯，已在 lightmap 里，不加实时灯。

坐标：Unity 前向 f = q·(0,0,1)（世界旋转 = 父链 × 本地）。GLB = X 取反；引擎 = GLB 绕 Y 转 180° → 引擎方向 (fx, fy, -fz)。
颜色：Unity Color 是 gamma 值，线性工作流下按 sRGB → 线性换算（Unity 自己也这么做）。
用法: python3 tools/gen-orig-lighting.py
"""
import json, struct, glob, os, sys

A = os.environ.get('UMBRA_ASSETS', os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../../umbra-assets'))) + '/p5t/1_battle'
OUT = os.path.join(os.path.dirname(__file__), '..', 'src', 'view', 'origLighting.ts')
MISSIONS = ['M01', 'M02', 'M03', 'M04', 'M05', 'M06', 'M07', 'M08', 'M09', 'M10', 'M17']
DEFAULT_SKY = (0.212, 0.227, 0.259)  # Unity 新建场景默认环境光（附加的 hit 场景里那份），跳过


def s2l(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def lin(col):
    return [round(s2l(col[k]), 4) for k in 'rgb']


def qmul(a, b):
    ax, ay, az, aw = a; bx, by, bz, bw = b
    return (aw * bx + ax * bw + ay * bz - az * by, aw * by - ax * bz + ay * bw + az * bx,
            aw * bz + ax * by - ay * bx + az * bw, aw * bw - ax * bx - ay * by - az * bz)


def qrot(q, v):
    x, y, z, w = q
    p = (v[0], v[1], v[2], 0.0)
    r = qmul(qmul(q, p), (-x, -y, -z, w))
    return r[:3]


def glb_nodes(path):
    with open(path, 'rb') as f:
        f.read(12)
        ln, _ = struct.unpack('<II', f.read(8))
        js = json.loads(f.read(ln))
    nodes = js['nodes']
    parent = {}
    for i, n in enumerate(nodes):
        for c in n.get('children', []):
            parent[c] = i
    paths = {}
    for i, n in enumerate(nodes):
        a = []; j = i
        while j is not None:
            a.append(nodes[j].get('name', '')); j = parent.get(j)
        paths['/'.join(reversed(a))] = n
    return paths


res = {}
for m in MISSIONS:
    d = f'{A}/r7/lighting/missions/{m}'
    if not os.path.exists(d + '/lights.json'):
        print('miss', m); continue
    L = json.load(open(d + '/lights.json'))
    dirs = [l for l in L if l['raw']['m_Type'] == 1 and l['raw']['m_Enabled']]
    assert len(dirs) == 1, (m, len(dirs))
    l = dirs[0]; r = l['raw']
    q = tuple(l['transform']['local_rotation_xyzw'][k] for k in 'xyzw')
    # 父链旋转：GLB 节点（X 镜像下 Unity 四元数 (x,y,z,w) ↔ glTF (x,-y,-z,w)）
    glbs = glob.glob(f'{A}/batch-03/maps/{m}/scene_map_*.glb')
    parents = l['path'].split('/')[:-1]
    pq = (0, 0, 0, 1); note = 'root'
    if glbs and parents:
        P = glb_nodes(glbs[0])
        for i in range(1, len(parents) + 1):
            n = P.get('/'.join(parents[:i]))
            if n is None:
                note = 'parent-missing'; break
            gx, gy, gz, gw = n.get('rotation', [0, 0, 0, 1])
            pq = qmul(pq, (gx, -gy, -gz, gw))
        else:
            note = 'parents:' + '/'.join(parents)
    f = qrot(qmul(pq, q), (0, 0, 1))
    eng = [round(f[0], 4), round(f[1], 4), round(-f[2], 4)]
    others = sorted({(x['raw']['m_Type'], x['raw']['m_Lightmapping'], x['raw']['m_BakingOutput']['lightmapBakeMode']['lightmapBakeType']) for x in L if x is not l})
    rs = [o['data'] for o in json.load(open(d + '/scene_lighting.json')) if o['type'] == 'RenderSettings']
    real = [x for x in rs if tuple(round(x['m_AmbientSkyColor'][k], 3) for k in 'rgb') != DEFAULT_SKY] or rs
    R = real[0]
    res[m] = {
        'sunDir': eng, 'sunColor': lin(r['m_Color']), 'sunIntensity': round(r['m_Intensity'], 4),
        'shadowStrength': r['m_Shadows']['m_Strength'],
        'ambientMode': R['m_AmbientMode'], 'ambientIntensity': R['m_AmbientIntensity'],
        'ambSky': lin(R['m_AmbientSkyColor']), 'ambEquator': lin(R['m_AmbientEquatorColor']), 'ambGround': lin(R['m_AmbientGroundColor']),
        'fog': {'on': bool(R['m_Fog']), 'mode': R['m_FogMode'], 'color': lin(R['m_FogColor']), 'start': R['m_LinearFogStart'], 'end': R['m_LinearFogEnd']},
        '_src': f'{l["path"]} q={tuple(round(v, 4) for v in q)} {note}; m_Lightmapping={r["m_Lightmapping"]} bakeOut={r["m_BakingOutput"]["lightmapBakeMode"]["lightmapBakeType"]}; other lights (type,lightmapping,bakeOut)={others}',
    }
    print(m, eng, res[m]['sunIntensity'], res[m]['_src'])

with open(OUT, 'w') as o:
    o.write('// 自动生成：tools/gen-orig-lighting.py（原版 P5T 逐关 Directional Light + RenderSettings，数值照原始 typetree）。勿手改。\n')
    o.write('// sunDir = 光线行进方向（引擎世界坐标）；颜色已从 Unity gamma 值换成线性。\n')
    o.write('export interface OrigLighting { sunDir: [number, number, number]; sunColor: [number, number, number]; sunIntensity: number; shadowStrength: number;\n')
    o.write('  ambientMode: number; ambientIntensity: number; ambSky: [number, number, number]; ambEquator: [number, number, number]; ambGround: [number, number, number];\n')
    o.write('  fog: { on: boolean; mode: number; color: [number, number, number]; start: number; end: number }; _src: string }\n')
    o.write('export const ORIG_LIGHTING: Record<string, OrigLighting> = ' + json.dumps(res, ensure_ascii=False, indent=1) + ';\n')
print('wrote', OUT)
