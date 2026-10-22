// 探索规则层（D-003 P5T 式 Q 版格子关卡）：零 DOM、零画布。只算结果，演出层读结果播 explore:* 事件。
// 回合制潜入：玩家走一步（整条路径逐格结算），巡逻阴影走一步；视线锥 3 格，被墙/掩体挡；贴掩体时只在 1 格内被看见。
// 必战（GDD §19）：出口由守门阴影（或精英）封住，必须战斗才开门；潜行只决定先手/被偷袭。
export type Cell = [number, number];
export interface PatrolDef { id: string; path: Cell[]; enc: string[] }
export interface Room {
  id: string; kind: string; map: string[];
  patrols?: PatrolDef[]; gate?: { at: Cell; facing: Cell; enc: string[] }; elite?: { at: Cell; facing: Cell; enc: string[] }; boss?: { at: Cell; facing: Cell; enc: string[] };
  chests?: { at: Cell; loot: { money?: number; item?: string; n?: number; card?: string } }[];
  hidden?: { at: Cell; stat: string; need: number }[];
}
export interface Foe { id: string; kind: 'patrol' | 'gate' | 'elite' | 'boss'; at: Cell; facing: Cell; enc: string[]; path?: Cell[]; pi: number; dir: 1 | -1; alive: boolean;
  /** M4b 追击：看见玩家后追；连续 LOSE_STEPS 步看不见 → 放弃，回巡逻路线 */
  chase?: boolean; lost?: number; returning?: boolean }
/** 追击放弃步数 */
export const LOSE_STEPS = 3;
/** 每步快照：[id, 位置, 朝向, 追击中 1/0]（演出层逐格回放巡逻/追击走位） */
export type FoeSnap = [string, Cell, Cell, number][];
export type Encounter = { foe: Foe; mode: 'preemptive' | 'normal' | 'ambushed' };
export type StepEvent =
  | { kind: 'move'; path: Cell[]; foes: FoeSnap[] }
  | { kind: 'lost'; foeId: string }
  | { kind: 'cover'; cell: Cell }
  | { kind: 'spotted'; foeId: string }
  | { kind: 'encounter'; enc: Encounter }
  | { kind: 'interact'; what: 'chest' | 'hidden'; at: Cell; ok?: boolean; loot?: any }
  | { kind: 'exit' };

const D4: Cell[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
export const eq = (a: Cell, b: Cell) => a[0] === b[0] && a[1] === b[1];

export class Explore {
  W: number; H: number; grid: string[][];
  pos: Cell = [0, 0]; exit: Cell = [0, 0];
  foes: Foe[] = [];
  chests: { at: Cell; loot: any; open: boolean }[] = [];
  hidden: { at: Cell; stat: string; need: number; open: boolean }[] = [];
  gateOpen = false; steps = 0;
  trail: Cell[] = [];
  constructor(public room: Room, mirror = false) {
    const m = mirror ? room.map.map((r) => r.split('').reverse().join('')) : room.map.slice();
    const mx = (c: Cell): Cell => mirror ? [m[0].length - 1 - c[0], c[1]] : [c[0], c[1]];
    const mf = (c: Cell): Cell => mirror ? [-c[0], c[1]] : [c[0], c[1]];
    this.H = m.length; this.W = m[0].length; this.grid = m.map((r) => r.split(''));
    for (let y = 0; y < this.H; y++) for (let x = 0; x < this.W; x++) {
      const ch = this.grid[y][x];
      if (ch === 'S') { this.pos = [x, y]; this.grid[y][x] = '.'; }
      if (ch === 'E') this.exit = [x, y];
    }
    for (const p of room.patrols ?? []) { const path = p.path.map(mx); const f = path[1] ? [Math.sign(path[1][0] - path[0][0]), Math.sign(path[1][1] - path[0][1])] as Cell : [1, 0] as Cell; this.foes.push({ id: p.id, kind: 'patrol', at: path[0], facing: f, enc: p.enc, path, pi: 0, dir: 1, alive: true }); }
    const g = room.boss ?? room.gate ?? room.elite; const gk = room.boss ? 'boss' : room.gate ? 'gate' : 'elite';
    if (g) this.foes.push({ id: gk, kind: gk, at: mx(g.at), facing: mf(g.facing), enc: g.enc, pi: 0, dir: 1, alive: true });
    for (const c of room.chests ?? []) this.chests.push({ at: mx(c.at), loot: c.loot, open: false });
    for (const h of room.hidden ?? []) this.hidden.push({ at: mx(h.at), stat: h.stat, need: h.need, open: false });
    this.trail = [this.pos, this.pos, this.pos];
  }
  tile(c: Cell) { return c[0] < 0 || c[1] < 0 || c[0] >= this.W || c[1] >= this.H ? '#' : this.grid[c[1]][c[0]]; }
  foeAt(c: Cell) { return this.foes.find((f) => f.alive && eq(f.at, c)); }
  chestAt(c: Cell) { return this.chests.find((k) => !k.open && eq(k.at, c)); }
  hiddenAt(c: Cell) { return this.hidden.find((h) => !h.open && eq(h.at, c)); }
  walkable(c: Cell) { const t = this.tile(c); return (t === '.' || t === 'E') && !this.foeAt(c) && !this.chestAt(c) && (t !== 'E' || this.gateOpen); }
  inCover(c = this.pos) { return D4.some((d) => this.tile([c[0] + d[0], c[1] + d[1]]) === 'C'); }
  blocksSight(c: Cell) { const t = this.tile(c); return t === '#' || t === 'C' || t === 'H' || !!this.chestAt(c); }
  /** 视线锥：正前方 1..3 格，2/3 格处左右各扩 1 格；视线被墙/掩体挡（逐格检查直线） */
  cone(f: Foe): Cell[] {
    if (f.kind === 'boss') return [];
    const out: Cell[] = []; const [fx, fy] = f.facing; const px = -fy, py = fx;
    for (let d = 1; d <= 3; d++) for (const s of d === 1 ? [0] : [-1, 0, 1]) {
      const c: Cell = [f.at[0] + fx * d + px * s, f.at[1] + fy * d + py * s];
      if (this.tile(c) === '#' || this.tile(c) === 'C') continue;
      // 直线遮挡：沿前进方向回溯
      let ok = true; for (let k = 1; k < d; k++) { const m: Cell = [f.at[0] + fx * k + (s && k >= d - 1 ? px * s : 0), f.at[1] + fy * k + (s && k >= d - 1 ? py * s : 0)]; if (this.blocksSight(m)) { ok = false; break; } }
      if (ok) out.push(c);
    }
    return out;
  }
  sees(f: Foe, c: Cell) {
    if (!f.alive) return false;
    const cone = this.cone(f); if (!cone.some((k) => eq(k, c))) return false;
    if (this.inCover(c)) return Math.abs(c[0] - f.at[0]) + Math.abs(c[1] - f.at[1]) <= 1;   // 贴掩体：只在 1 格内被发现
    return true;
  }
  /** BFS 寻路到目标格（目标可为敌人/宝箱/隐藏路 → 走到相邻格） */
  pathTo(goal: Cell): Cell[] | null {
    const target = this.walkable(goal) || eq(goal, this.exit) && this.gateOpen;
    const key = (c: Cell) => c[0] + ',' + c[1];
    const prev = new Map<string, Cell | null>([[key(this.pos), null]]); const q: Cell[] = [this.pos];
    let end: Cell | null = null;
    const isEnd = (c: Cell) => target ? eq(c, goal) : D4.some((d) => eq([c[0] + d[0], c[1] + d[1]], goal));
    if (isEnd(this.pos)) return [];
    while (q.length) {
      const c = q.shift()!;
      for (const d of D4) {
        const n: Cell = [c[0] + d[0], c[1] + d[1]];
        if (prev.has(key(n)) || !this.walkable(n)) continue;
        prev.set(key(n), c); if (isEnd(n)) { end = n; q.length = 0; break; } q.push(n);
      }
    }
    if (!end) return null;
    const path: Cell[] = []; for (let c: Cell | null = end; c && !eq(c, this.pos); c = prev.get(key(c)) ?? null) path.unshift(c);
    return path;
  }
  /** 阴影可走：地板、无其他阴影、无宝箱（出口格不进） */
  private foeWalk(c: Cell, self: Foe) { const t = this.tile(c); return t === '.' && !this.chestAt(c) && !this.foes.some((o) => o !== self && o.alive && eq(o.at, c)); }
  /** 阴影 BFS 一步：朝 goal（goal 可被玩家占着） */
  private stepToward(f: Foe, goal: Cell): Cell | null {
    const key = (c: Cell) => c[0] + ',' + c[1]; const prev = new Map<string, Cell | null>([[key(f.at), null]]); const q: Cell[] = [f.at]; let end: Cell | null = null;
    while (q.length && !end) { const c = q.shift()!; for (const d of D4) { const n: Cell = [c[0] + d[0], c[1] + d[1]]; if (prev.has(key(n))) continue; if (eq(n, goal)) { prev.set(key(n), c); end = n; break; } if (!this.foeWalk(n, f)) continue; prev.set(key(n), c); q.push(n); } }
    if (!end) return null; let c: Cell = end; for (;;) { const p = prev.get(key(c))!; if (!p || eq(p, f.at)) return c; c = p; }
  }
  private moveFoe(f: Foe, nx: Cell) { f.facing = [Math.sign(nx[0] - f.at[0]), Math.sign(nx[1] - f.at[1])]; f.at = nx; }
  lostIds: string[] = [];
  /** 阴影走一步。返回扑上玩家的阴影（追击中走到相邻 / 巡逻撞上） */
  private stepFoes(): Foe | null {
    for (const f of this.foes) {
      if (!f.alive || f.kind !== 'patrol' || !f.path || f.path.length < 1) continue;
      if (f.chase) {
        const nx = this.stepToward(f, this.pos);
        if (nx && eq(nx, this.pos)) { f.facing = [Math.sign(nx[0] - f.at[0]), Math.sign(nx[1] - f.at[1])]; return f; }
        if (nx) this.moveFoe(f, nx);
        const dist = Math.abs(f.at[0] - this.pos[0]) + Math.abs(f.at[1] - this.pos[1]);
        if (dist <= 1) { f.facing = [Math.sign(this.pos[0] - f.at[0]), Math.sign(this.pos[1] - f.at[1])]; return f; }
        if (this.sees(f, this.pos)) f.lost = 0; else if ((f.lost = (f.lost ?? 0) + 1) >= LOSE_STEPS) { f.chase = false; f.returning = true; this.lostIds.push(f.id); }
        continue;
      }
      if (f.returning) {
        // 回到最近的巡逻点
        let best = 0, bd = 1e9; f.path.forEach((c, i) => { const d = Math.abs(c[0] - f.at[0]) + Math.abs(c[1] - f.at[1]); if (d < bd) { bd = d; best = i; } });
        if (bd === 0) { f.returning = false; f.pi = best; }
        else { const nx = this.stepToward(f, f.path[best]); if (nx && !eq(nx, this.pos)) this.moveFoe(f, nx); else if (!nx) { f.returning = false; f.pi = best; } continue; }
      }
      if (f.path.length < 2) continue;
      let ni = f.pi + f.dir; if (ni < 0 || ni >= f.path.length) { f.dir = (f.dir * -1) as 1 | -1; ni = f.pi + f.dir; }
      const nx = f.path[ni];
      if (eq(nx, this.pos)) { f.facing = [nx[0] - f.at[0], nx[1] - f.at[1]]; return f; }   // 撞上玩家
      if (this.foeAt(nx)) continue;
      f.facing = [nx[0] - f.at[0], nx[1] - f.at[1]]; f.at = nx; f.pi = ni;
    }
    return null;
  }
  snap(): FoeSnap { return this.foes.filter((f) => f.alive).map((f) => [f.id, [f.at[0], f.at[1]] as Cell, [f.facing[0], f.facing[1]] as Cell, f.chase ? 1 : 0]); }
  get chasing() { return this.foes.filter((f) => f.alive && f.chase); }
  /** 点一个格：走过去（逐格结算巡逻/追击/视线），可能以发现/遭遇/交互/出口结束。
   *  M4b：巡逻视线扫到 = 被发现（警戒 +、停步、该阴影开始追击）；追到相邻 = 被偷袭（敌先手）；甩开 LOSE_STEPS 步 = 放弃回巡逻。 */
  tap(goal: Cell): StepEvent[] {
    const ev: StepEvent[] = []; this.lostIds = [];
    const foe = this.foeAt(goal), chest = this.chestAt(goal), hid = this.hiddenAt(goal);
    const path = this.pathTo(goal); if (!path) return ev;
    const walked: Cell[] = []; const snaps: FoeSnap[] = [];
    const lostEv = () => this.lostIds.splice(0).map((id) => ({ kind: 'lost', foeId: id }) as StepEvent);
    for (const c of path) {
      this.trail = [this.pos, ...this.trail].slice(0, 3);
      this.pos = c; walked.push(c); this.steps++;
      const wasChasing = new Set(this.chasing.map((f) => f.id));
      const bump = this.stepFoes(); snaps.push(this.snap());
      if (bump) {
        ev.push({ kind: 'move', path: walked.slice(), foes: snaps.slice() }, ...lostEv());
        if (!wasChasing.has(bump.id)) ev.push({ kind: 'spotted', foeId: bump.id });
        bump.chase = false; ev.push({ kind: 'encounter', enc: { foe: bump, mode: 'ambushed' } }); return ev;
      }
      const spot = this.foes.find((f) => f.alive && f.kind === 'patrol' && !f.chase && this.sees(f, this.pos));
      if (spot) {
        spot.chase = true; spot.lost = 0; spot.returning = false; snaps[snaps.length - 1] = this.snap();
        ev.push({ kind: 'move', path: walked.slice(), foes: snaps.slice() }, ...lostEv(), { kind: 'spotted', foeId: spot.id });
        const d = Math.abs(spot.at[0] - this.pos[0]) + Math.abs(spot.at[1] - this.pos[1]);
        if (d <= 1) { spot.chase = false; ev.push({ kind: 'encounter', enc: { foe: spot, mode: 'ambushed' } }); }
        return ev;   // 停步：玩家决定甩开还是迎战
      }
    }
    if (walked.length) ev.push({ kind: 'move', path: walked, foes: snaps });
    ev.push(...lostEv());
    if (walked.length && this.inCover()) ev.push({ kind: 'cover', cell: this.pos });
    const adj = (c: Cell) => Math.abs(c[0] - this.pos[0]) + Math.abs(c[1] - this.pos[1]) === 1;
    if (foe && foe.alive && adj(foe.at)) {
      // 从背后/侧面（不在其视线内）接近 = 先手；正面或对方正在追击 = 普通
      const seen = this.sees(foe, this.pos) && (foe.kind !== 'patrol' || !this.inCover());
      const mode = foe.chase || seen ? 'normal' : 'preemptive'; foe.chase = false;
      ev.push({ kind: 'encounter', enc: { foe, mode } });
    } else if (chest) { chest.open = true; ev.push({ kind: 'interact', what: 'chest', at: chest.at, loot: chest.loot }); }
    else if (hid) ev.push({ kind: 'interact', what: 'hidden', at: hid.at });
    else if (eq(this.pos, this.exit) && this.gateOpen) ev.push({ kind: 'exit' });
    return ev;
  }
  openHidden(at: Cell) { const h = this.hiddenAt(at); if (!h) return false; h.open = true; this.grid[at[1]][at[0]] = '.'; return true; }
  defeat(foeId: string) { const f = this.foes.find((x) => x.id === foeId); if (f) f.alive = false; if (f && f.kind !== 'patrol') this.gateOpen = true; return this.gateOpen; }
  /** 当前所有可交互目标（第三只眼高亮用） */
  interactables(): Cell[] { return [...this.chests.filter((c) => !c.open).map((c) => c.at), ...this.hidden.filter((h) => !h.open).map((h) => h.at), this.exit]; }
}
