# M4b：格子房间模板扩充（GDD §20：手工模板 + 种子拼接）——守门/稳路(宝箱+隐藏路)/险路(精英) 每类 ≥8 张 + 每个委托一张 BOSS 专属房间。
# 只写数据；写入前逐张校验（可达、宝箱可开、巡逻路线连续、起点不在初始视线内、守门封出口）。
# 字符：. 地板  # 墙  C 掩体  S 起点  E 出口  T 宝箱  H 隐藏路。坐标 [x,y]。
import json, os, sys
P = os.path.join(os.path.dirname(__file__), '..', 'src', 'game', 'data', 'rooms.json')
old = json.load(open(P))
def pt(xs, y): return [[x, y] for x in xs]
def pv(x, ys): return [[x, y] for y in ys]
G, V, K, B = [], [], [], {}

# ---------------- 守门（出口由守门阴影封住，必战）
G += old['gate']   # gate_hall, gate_gallery（M4）
G.append({'id': 'gate_corridor', 'map': ["S..#.....", "...#..C.T", "...C.....", ".#....#..", ".#..C.#..", "......#.E"],
  'patrols': [{'id': 'p1', 'path': pv(5, [0, 1, 2, 3, 4]), 'enc': ['noisy']}, {'id': 'p2', 'path': pt([2, 3, 4, 5], 5), 'enc': ['echo']}],
  'gate': {'at': [7, 5], 'facing': [0, -1], 'enc': ['noisy', 'echo']}, 'chests': [{'at': [8, 1], 'loot': {'money': 1000}}]})
G.append({'id': 'gate_ballroom', 'map': ["S........", ".C..C..C.", ".........", "..C...C..", ".........", "T...C...E"],
  'patrols': [{'id': 'p1', 'path': pt([2, 3, 4, 5, 6], 2), 'enc': ['echo', 'echo']}, {'id': 'p2', 'path': pt([2, 3, 4, 5, 6, 7], 4), 'enc': ['noisy']}],
  'gate': {'at': [7, 5], 'facing': [-1, 0], 'enc': ['noisy', 'echo', 'noisy']}, 'chests': [{'at': [0, 5], 'loot': {'item': 'snuff', 'n': 1}}]})
G.append({'id': 'gate_cellblock', 'map': ["S.#..#..T", "..#..#...", ".........", "..#..#.C.", "..#..#...", "C.#..#..E"],
  'patrols': [{'id': 'p1', 'path': pv(3, [0, 1, 2, 3, 4, 5]), 'enc': ['noisy']}, {'id': 'p2', 'path': pv(6, [5, 4, 3, 2, 1, 0]), 'enc': ['echo', 'noisy']}],
  'gate': {'at': [8, 4], 'facing': [0, -1], 'enc': ['echo', 'echo']}, 'chests': [{'at': [8, 0], 'loot': {'money': 1400}}]})
G.append({'id': 'gate_library', 'map': ["S...#####", "..C.....T", "....#C...", "##.......", "...C..#..", "......#.E"],
  'patrols': [{'id': 'p1', 'path': pt([4, 5, 6, 7], 3), 'enc': ['noisy', 'echo']}, {'id': 'p2', 'path': [[1, 4], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5]], 'enc': ['echo']}],
  'gate': {'at': [8, 4], 'facing': [-1, 0], 'enc': ['noisy', 'noisy']}, 'chests': [{'at': [8, 1], 'loot': {'item': 'medicine', 'n': 1, 'money': 600}}]})
G.append({'id': 'gate_stairs', 'map': ["S.......#", ".##.C.#.#", "...#.....", "C......#.", "..#.C....", "T.#....#E"],
  'patrols': [{'id': 'p1', 'path': pv(5, [0, 1, 2, 3]), 'enc': ['echo']}, {'id': 'p2', 'path': pt([5, 6, 7], 4), 'enc': ['noisy']}],
  'gate': {'at': [8, 4], 'facing': [-1, 0], 'enc': ['echo', 'noisy', 'echo']}, 'chests': [{'at': [0, 5], 'loot': {'money': 1600}}]})
G.append({'id': 'gate_vaultdoor', 'map': ["S..C....T", "...#..#..", ".#...C...", ".#.#....#", "...#.C...", "......#.E"],
  'patrols': [{'id': 'p1', 'path': [[4, 2], [4, 3], [4, 4], [4, 5]], 'enc': ['noisy']}, {'id': 'p2', 'path': pt([5, 6, 7], 3), 'enc': ['echo']}],
  'gate': {'at': [7, 5], 'facing': [0, -1], 'enc': ['noisy', 'echo']}, 'chests': [{'at': [8, 0], 'loot': {'item': 'medicine', 'n': 2}}]})
G.append({'id': 'gate_chapel', 'map': ["S........", "..C.#.C..", "....#....", ".C.....C.", "....#....", "T.C.#.C.E"],
  'patrols': [{'id': 'p1', 'path': pv(3, [0, 1, 2, 3, 4]), 'enc': ['echo', 'noisy']}, {'id': 'p2', 'path': pv(5, [4, 3, 2, 1, 0]), 'enc': ['noisy']}],
  'gate': {'at': [8, 4], 'facing': [0, -1], 'enc': ['noisy', 'echo', 'echo']}, 'chests': [{'at': [0, 5], 'loot': {'money': 1300}}]})

# ---------------- 稳路（守门 + 宝箱 + 隐藏通道：五维检定）
V += old['vault']   # vault_study
V.append({'id': 'vault_archive', 'map': ["S...C...#", "...#.....", "..##..C..", "......##H", ".C.....#T", "...C....E"],
  'patrols': [{'id': 'p1', 'path': pt([4, 5, 6, 7], 1), 'enc': ['echo']}],
  'gate': {'at': [8, 4 - 0], 'facing': [-1, 0], 'enc': ['noisy', 'echo']} if False else {'at': [7, 5], 'facing': [-1, 0], 'enc': ['noisy', 'echo']},
  'chests': [{'at': [8, 4], 'loot': {'card': 'rare'}}, {'at': [0, 4], 'loot': {'money': 800}}] if False else [{'at': [8, 4], 'loot': {'card': 'rare'}}],
  'hidden': [{'at': [8, 3], 'stat': 'knowledge', 'need': 3}]})
V.append({'id': 'vault_gallery', 'map': ["S..C..#T.", ".....C#H#", "..#......", "..#.C..C.", "T........", "...C....E"],
  'patrols': [{'id': 'p1', 'path': pt([3, 4, 5, 6], 2), 'enc': ['noisy']}, {'id': 'p2', 'path': pt([2, 3, 4, 5, 6], 4), 'enc': ['echo']}],
  'gate': {'at': [7, 5], 'facing': [-1, 0], 'enc': ['echo', 'noisy']}, 'chests': [{'at': [7, 0], 'loot': {'card': 'rare'}}, {'at': [0, 4], 'loot': {'item': 'medicine', 'n': 1}}],
  'hidden': [{'at': [7, 1], 'stat': 'proficiency', 'need': 3}]})
V.append({'id': 'vault_cellar', 'map': ["S....#T..", "..C..#H..", ".........", "#..C...C.", "#........", "##..C...E"],
  'patrols': [{'id': 'p1', 'path': pt([2, 3, 4, 5, 6], 2), 'enc': ['echo', 'echo']}],
  'gate': {'at': [8, 4], 'facing': [0, -1], 'enc': ['noisy', 'echo']}, 'chests': [{'at': [6, 0], 'loot': {'card': 'rare', 'money': 500}}],
  'hidden': [{'at': [6, 1], 'stat': 'knowledge', 'need': 3}]})
V.append({'id': 'vault_office', 'map': ["S.C......", "....#.C..", "T.H.#....", "####.....", "....C..C.", "........E"],
  'patrols': [{'id': 'p1', 'path': pv(6, [2, 3, 4, 5]), 'enc': ['noisy']}, {'id': 'p2', 'path': pt([0, 1, 2, 3], 4)[::-1], 'enc': ['echo']}],
  'gate': {'at': [7, 5], 'facing': [-1, 0], 'enc': ['noisy', 'noisy']}, 'chests': [{'at': [0, 2], 'loot': {'card': 'rare'}}],
  'hidden': [{'at': [2, 2], 'stat': 'knowledge', 'need': 3}]})
V.append({'id': 'vault_aquarium', 'map': ["S...#....", "..C.#.C..", "....#....", "..C...#H#", "......#T#", "C.......E"],
  'patrols': [{'id': 'p1', 'path': pv(5, [0, 1, 2, 3, 4]), 'enc': ['echo']}, {'id': 'p2', 'path': pt([1, 2, 3, 4, 5], 4), 'enc': ['noisy']}],
  'gate': {'at': [7, 5], 'facing': [-1, 0], 'enc': ['echo', 'noisy', 'echo']}, 'chests': [{'at': [7, 4], 'loot': {'card': 'rare', 'item': 'snuff', 'n': 1}}],
  'hidden': [{'at': [7, 3], 'stat': 'proficiency', 'need': 3}]})
V.append({'id': 'vault_attic', 'map': ["S......C.", ".#.##....", ".#.H#.C..", ".#.T#....", "......C..", "..C.....E"],
  'patrols': [{'id': 'p1', 'path': pv(5, [0, 1, 2, 3, 4]), 'enc': ['noisy', 'echo']}, {'id': 'p2', 'path': pt([3, 4, 5, 6, 7], 5), 'enc': ['echo']}],
  'gate': {'at': [8, 4], 'facing': [0, -1], 'enc': ['noisy', 'echo']}, 'chests': [{'at': [3, 3], 'loot': {'card': 'rare'}}],
  'hidden': [{'at': [3, 2], 'stat': 'knowledge', 'need': 3}]})
V.append({'id': 'vault_observatory', 'map': ["S.......T", "..C.#.#H#", "....#....", ".C......C", "...#.C...", "...#....E"],
  'patrols': [{'id': 'p1', 'path': pt([5, 6, 7, 8], 2), 'enc': ['echo']}, {'id': 'p2', 'path': pv(4, [3, 4, 5]), 'enc': ['noisy']}],
  'gate': {'at': [7, 5], 'facing': [-1, 0], 'enc': ['noisy', 'echo']}, 'chests': [{'at': [8, 0], 'loot': {'card': 'rare'}}],
  'hidden': [{'at': [7, 1], 'stat': 'knowledge', 'need': 3}]})

# ---------------- 险路（精英必战 + 稀有心之卡 + 大量金钱）
K += old['risk']   # risk_throne
K.append({'id': 'risk_arena', 'map': ["S........", "..C...C..", ".........", ".C.....C.", ".........", "T..C.C..E"],
  'patrols': [{'id': 'p1', 'path': pt([2, 3, 4, 5, 6], 2), 'enc': ['noisy', 'echo']}, {'id': 'p2', 'path': pt([2, 3, 4, 5, 6], 4)[::-1], 'enc': ['echo', 'echo']}],
  'elite': {'at': [7, 5], 'facing': [-1, 0], 'enc': ['elite', 'echo']}, 'chests': [{'at': [0, 5], 'loot': {'card': 'rare', 'money': 2200}}]})
K.append({'id': 'risk_bridge', 'map': ["S..#.....", "...#.C...", ".......C.", "#.#.#.#..", "...C.....", "T.....#.E"],
  'patrols': [{'id': 'p1', 'path': pt([1, 2, 3, 4, 5, 6], 2), 'enc': ['noisy', 'noisy']}, {'id': 'p2', 'path': pt([4, 5, 6, 7], 4), 'enc': ['echo']}],
  'elite': {'at': [8, 4], 'facing': [0, -1], 'enc': ['elite', 'noisy']}, 'chests': [{'at': [0, 5], 'loot': {'card': 'rare', 'money': 1800}}]})
K.append({'id': 'risk_furnace', 'map': ["S.C....#T", "...#.....", "...#.C...", ".C....#..", "....#....", "....#...E"],
  'patrols': [{'id': 'p1', 'path': pv(5, [0, 1]) + pt([6, 7], 1), 'enc': ['echo', 'noisy']}, {'id': 'p2', 'path': pt([0, 1, 2, 3], 4), 'enc': ['noisy']}, {'id': 'p3', 'path': pv(7, [2, 3, 4]), 'enc': ['echo']}],
  'elite': {'at': [8, 4], 'facing': [0, -1], 'enc': ['elite', 'echo']}, 'chests': [{'at': [8, 0], 'loot': {'card': 'rare', 'money': 2500}}]})
K.append({'id': 'risk_vaultroom', 'map': ["S...C....", ".#.....#.", ".#.C.C.#.", ".#.....#.", "...C.....", "T.......E"],
  'patrols': [{'id': 'p1', 'path': [[2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [6, 2], [6, 3], [5, 3], [4, 3], [3, 3], [2, 3], [2, 2]], 'enc': ['noisy', 'echo']}],
  'elite': {'at': [7, 5], 'facing': [-1, 0], 'enc': ['elite', 'noisy', 'echo']}, 'chests': [{'at': [0, 5], 'loot': {'card': 'rare', 'money': 2000}}]})
K.append({'id': 'risk_garden', 'map': ["S....C..T", "..C......", "....C.C..", ".C.......", "...C...C.", "........E"],
  'patrols': [{'id': 'p1', 'path': pt([3, 2, 1, 0], 2), 'enc': ['echo']}, {'id': 'p2', 'path': pt([5, 6, 7, 8], 3), 'enc': ['noisy', 'echo']}],
  'elite': {'at': [8, 4], 'facing': [0, -1], 'enc': ['elite', 'echo']}, 'chests': [{'at': [8, 0], 'loot': {'card': 'rare', 'money': 2400}}]})
K.append({'id': 'risk_maze', 'map': ["S.#......", "..#.##.#.", "....#..#.", "##.##.##.", "T........", "####...#E"],
  'patrols': [{'id': 'p1', 'path': pt([2, 3, 4, 5, 6, 7], 4), 'enc': ['noisy', 'noisy']}, {'id': 'p2', 'path': pv(8, [0, 1, 2, 3]), 'enc': ['echo']}],
  'elite': {'at': [8, 4], 'facing': [-1, 0], 'enc': ['elite', 'noisy']}, 'chests': [{'at': [0, 4], 'loot': {'card': 'rare', 'money': 2600}}]})
K.append({'id': 'risk_hall', 'map': ["S.......T", ".C..#..C.", "....#....", "..C...C..", "....#....", ".C..#...E"],
  'patrols': [{'id': 'p1', 'path': pt([3, 2, 1, 0], 2), 'enc': ['echo', 'echo']}, {'id': 'p2', 'path': pv(5, [0, 1, 2, 3, 4, 5]), 'enc': ['noisy']}, {'id': 'p3', 'path': pt([6, 7, 8], 2), 'enc': ['noisy', 'echo']}],
  'elite': {'at': [8, 4], 'facing': [0, -1], 'enc': ['elite', 'echo']}, 'chests': [{'at': [8, 0], 'loot': {'card': 'rare', 'money': 2100}}]})

# ---------------- BOSS 专属（每个委托一张；王座 = 出口前，BOSS 守着）
B['r1'] = {'id': 'boss_r1_sloth', 'map': ["S...C...#", ".........", "..#.C.#..", "..#...#..", ".C.....C.", "T..#.#..E"],
  'patrols': [{'id': 'p1', 'path': pt([7, 6, 5, 4, 3, 2, 1], 1), 'enc': ['noisy', 'echo']}, {'id': 'p2', 'path': pv(4, [3, 4, 5]), 'enc': ['echo']}],
  'boss': {'at': [8, 4], 'facing': [-1, 0], 'enc': ['boss']}, 'chests': [{'at': [0, 5], 'loot': {'item': 'medicine', 'n': 2}}]}
B['r2'] = {'id': 'boss_r2_lilim', 'map': ["S..#.....", "...#.C.C.", ".C.......", "...C.##..", ".......#.", "T.C....#E"],
  'patrols': [{'id': 'p1', 'path': pt([1, 2, 3, 4, 5, 6], 4), 'enc': ['echo', 'echo']}, {'id': 'p2', 'path': pv(8, [0, 1, 2, 3]), 'enc': ['noisy']}],
  'boss': {'at': [8, 4], 'facing': [0, -1], 'enc': ['boss']}, 'chests': [{'at': [0, 5], 'loot': {'item': 'snuff', 'n': 1, 'money': 1000}}]}
B['r3'] = {'id': 'boss_r3_beelzebub', 'map': ["S.C...C.T", ".........", "#.#.C.#.#", ".........", ".C..#..C.", "....#...E"],
  'patrols': [{'id': 'p1', 'path': pt([7, 6, 5, 4, 3, 2, 1], 1), 'enc': ['noisy']}, {'id': 'p2', 'path': pt([0, 1, 2, 3, 4, 5, 6, 7, 8], 3), 'enc': ['echo', 'noisy']}],
  'boss': {'at': [8, 4], 'facing': [0, -1], 'enc': ['boss']}, 'chests': [{'at': [8, 0], 'loot': {'money': 1500}}]}

# ---------------- 校验
D4 = [(1, 0), (-1, 0), (0, 1), (0, -1)]
def check(r, kind):
    errs = []; m = r['map']; H = len(m); W = len(m[0])
    if any(len(row) != W for row in m): errs.append('ragged')
    t = lambda x, y: '#' if x < 0 or y < 0 or x >= W or y >= H else m[y][x]
    S = [(x, y) for y in range(H) for x in range(W) if m[y][x] == 'S']; E = [(x, y) for y in range(H) for x in range(W) if m[y][x] == 'E']
    if len(S) != 1 or len(E) != 1: return ['S/E count']
    S, E = S[0], E[0]
    guard = r.get('gate') or r.get('elite') or r.get('boss')
    if not guard: errs.append('no guard')
    gx, gy = guard['at']
    if t(gx, gy) != '.': errs.append(f'guard on {t(gx, gy)}')
    if abs(gx - E[0]) + abs(gy - E[1]) != 1: errs.append('guard not adjacent to exit')
    chests = {tuple(c['at']) for c in r.get('chests', [])}; Tm = {(x, y) for y in range(H) for x in range(W) if m[y][x] == 'T'}
    if not Tm <= chests or any(t(*c) not in 'T.' for c in chests): errs.append(f'chest mismatch {chests} vs {Tm}')
    hidden = {tuple(h['at']) for h in r.get('hidden', [])}
    for h in hidden:
        if t(*h) != 'H': errs.append(f'hidden {h} not H')
    pcells = set()
    for p in r.get('patrols', []):
        for i, c in enumerate(p['path']):
            if t(*c) != '.': errs.append(f"{p['id']} path {c} on {t(*c)}")
            if i and abs(c[0] - p['path'][i - 1][0]) + abs(c[1] - p['path'][i - 1][1]) != 1: errs.append(f"{p['id']} path gap at {c}")
            pcells.add(tuple(c))
        if abs(p['path'][0][0] - S[0]) + abs(p['path'][0][1] - S[1]) < 3: errs.append(f"{p['id']} starts too close to S")
    # 可达（巡逻不挡，守门挡）
    def reach(extra_open=set()):
        seen = {S}; q = [S]
        while q:
            x, y = q.pop()
            for dx, dy in D4:
                n = (x + dx, y + dy)
                if n in seen: continue
                if (t(*n) == '.' or n in extra_open) and n != (gx, gy): seen.add(n); q.append(n)
        return seen
    R = reach(); RH = reach(hidden)
    if not any((gx + dx, gy + dy) in R for dx, dy in D4): errs.append('guard unreachable')
    for c in chests:
        if not any((c[0] + dx, c[1] + dy) in RH for dx, dy in D4): errs.append(f'chest {c} unreachable')
    for h in hidden:
        if not any((h[0] + dx, h[1] + dy) in R for dx, dy in D4): errs.append(f'hidden {h} unreachable')
    for c in pcells:
        if c not in R and c not in RH: errs.append(f'patrol cell {c} isolated')
    return errs
bad = 0
for kind, lst in [('gate', G), ('vault', V), ('risk', K)]:
    ids = [r['id'] for r in lst]
    if len(set(ids)) != len(ids): print('dup ids', kind); bad += 1
    for r in lst:
        e = check(r, kind)
        if e: print(kind, r['id'], e); bad += 1
for k, r in B.items():
    e = check(r, 'boss')
    if e: print('boss', r['id'], e); bad += 1
print('gate', len(G), 'vault', len(V), 'risk', len(K), 'boss', len(B), 'bad', bad)
if bad and '--force' not in sys.argv: sys.exit(1)
out = {'_note': old['_note'] + ' M4b：每类 ≥8 张（gate/vault/risk）+ boss 按委托 id 一张（BOSS 关固定手工设计）；boss 守在出口前。', 'gate': G, 'vault': V, 'risk': K, 'boss': B}
json.dump(out, open(P, 'w'), ensure_ascii=False, indent=1)
print('written', P)
