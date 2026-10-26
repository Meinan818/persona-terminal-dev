#!/usr/bin/env python3
"""r15：batch-08 全量战斗动作 GLB → 只含动作的瘦 GLB（public/models/private/p5t/<key>_anims.glb）。
batch-08 的 PC0001–PC0006/PC0011 带完整模型+约 80 个 BTL clip（13–15MB/个），骨骼与 batch-02/03 模型同名同绑定姿势
（138–172 个动画目标节点全部存在、绑定平移差 0，见 notes/P5T-R15）。这里只保留 BASE clip 的 sampler 数据和节点树，
去掉网格/蒙皮/贴图和 ADDB 叠加姿势（网页不做叠加层），运行时 p5tChar.ts 把这些 clip 合进现有模型的 mixer。
用法：python3 tools/build-anim-glb.py <src.glb> <dst.glb>"""
import json, re, struct, sys

def read(p):
    b = open(p, 'rb').read()
    n = struct.unpack('<I', b[12:16])[0]
    j = json.loads(b[20:20 + n])
    off = 20 + n
    bl = struct.unpack('<I', b[off:off + 4])[0]
    return j, b[off + 8: off + 8 + bl]

# 网页用到的 BASE clip（其余如 Personal2/3、AllOut 变体、Special 剪辑、Walk 不打包，省流量）
KEEP = re.compile(r'^(Idle|Run|Skill\w*|Gun\w*|Hide[LR]|Jump\w*|Attack|Damage|Down\w*|Dead|Ready\w*|Personal1?|Result\w*|Revenge\w*|ChainFishing\w*|Bomb\w*|idle|run)$')

def main(src, dst):
    j, bin_ = read(src)
    anims = [a for a in j.get('animations', []) if '_ADDB_' not in a.get('name', '')]
    out = bytearray(); views = []; accs = []; amap = {}
    def acc(i):
        if i in amap: return amap[i]
        a = dict(j['accessors'][i]); bv = j['bufferViews'][a['bufferView']]
        start = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
        comp = {5126: 4, 5123: 2, 5125: 4, 5121: 1, 5122: 2, 5120: 1}[a['componentType']]
        ncomp = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}[a['type']]
        stride = bv.get('byteStride', comp * ncomp)
        size = comp * ncomp
        if stride == size: data = bin_[start:start + size * a['count']]
        else: data = b''.join(bin_[start + k * stride: start + k * stride + size] for k in range(a['count']))
        while len(out) % 4: out.append(0)
        views.append({'buffer': 0, 'byteOffset': len(out), 'byteLength': len(data)})
        out.extend(data)
        a['bufferView'] = len(views) - 1; a.pop('byteOffset', None); a.pop('sparse', None)
        accs.append(a); amap[i] = len(accs) - 1
        return amap[i]
    import array
    def raw(i):
        a = j['accessors'][i]; bv = j['bufferViews'][a['bufferView']]
        n = {'SCALAR': 1, 'VEC3': 3, 'VEC4': 4}[a['type']]
        st = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
        arr = array.array('f'); arr.frombytes(bin_[st: st + 4 * n * a['count']]); return arr, n
    def const_acc(vals, typ):
        # 常量轨道（整段不动的骨骼）压成 1 个关键帧：数值原样，只去掉重复帧
        data = array.array('f', vals).tobytes()
        while len(out) % 4: out.append(0)
        views.append({'buffer': 0, 'byteOffset': len(out), 'byteLength': len(data)}); out.extend(data)
        accs.append({'bufferView': len(views) - 1, 'componentType': 5126, 'count': 1, 'type': typ,
                     'min': list(vals) if typ == 'SCALAR' else None, 'max': list(vals) if typ == 'SCALAR' else None})
        if typ != 'SCALAR': accs[-1].pop('min'); accs[-1].pop('max')
        return len(accs) - 1
    na = []; saved = 0
    for an in anims:
        if not KEEP.match(an['name'].split('_BASE_')[-1]): continue
        smp = []
        for s in an['samplers']:
            o, n = raw(s['output']); a = j['accessors'][s['output']]
            if a['componentType'] == 5126 and s.get('interpolation', 'LINEAR') != 'CUBICSPLINE' and a['count'] > 1 and \
               all(abs(o[k] - o[k % n]) < 1e-6 for k in range(len(o))):
                t0 = raw(s['input'])[0][0]
                smp.append({'input': const_acc([t0], 'SCALAR'), 'output': const_acc(list(o[:n]), a['type']), 'interpolation': 'STEP'}); saved += 1
            else:
                smp.append({'input': acc(s['input']), 'output': acc(s['output']), 'interpolation': s.get('interpolation', 'LINEAR')})
        na.append({'name': an['name'], 'samplers': smp, 'channels': an['channels']})
    nodes = []
    for n in j['nodes']:
        m = {k: v for k, v in n.items() if k in ('name', 'children', 'translation', 'rotation', 'scale', 'matrix')}
        nodes.append(m)
    g = {'asset': {'version': '2.0', 'generator': 'umbra build-anim-glb (from batch-08)'}, 'scene': j.get('scene', 0),
         'scenes': j.get('scenes', [{'nodes': [0]}]), 'nodes': nodes, 'animations': na, 'accessors': accs, 'bufferViews': views,
         'buffers': [{'byteLength': len(out)}]}
    while len(out) % 4: out.append(0)
    js = json.dumps(g, separators=(',', ':')).encode()
    while len(js) % 4: js += b' '
    total = 12 + 8 + len(js) + 8 + len(out)
    with open(dst, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, total))
        f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js)
        f.write(struct.pack('<II', len(out), 0x004E4942)); f.write(out)
    print(f'ok {dst}: {len(na)} clips, {total/1e6:.2f} MB')

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
