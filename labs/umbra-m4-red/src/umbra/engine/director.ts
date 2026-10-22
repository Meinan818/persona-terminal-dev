// Director 简版（§3 / §3.1）：主线阻塞 + 1 条重叠层、时长上限 ÷ 倍速（墙钟）、强制推进、清场、跳过（finishCard 闪现 ≤150ms）、
// 文字轨在横幅/cut-in 期间从重叠层丢弃、输入缓冲上限 2（保留最新）。规则结果由调用方先提交再调 play()（§3.1-1）。
import type { EventName, Recipe, Track } from '../skins/_contract';
import type { Engine } from './core';
import { Timeline, Clip, report } from './timeline';
import { CAPS, capKey, expand, select, PER_CELL, PER_CELL_MAX } from './recipes';
import { PRIMS, RunCtx } from './prims';
import { DEFAULT_RECIPES } from './defaults';

let OWNER = 1;
export interface Run {
  owner: number; ev: EventName; recipe: Recipe; tl: Timeline; rc: RunCtx; capMs: number; wall: number; lane: 'main' | 'overlap';
  resolve: (r: RunResult) => void; forced: boolean; skipped: boolean; flash?: number;
}
export interface RunResult { ev: EventName; recipe: string; duration: number; wallMs: number; capMs: number; forced: boolean; skipped: boolean; speed: number; level: string }

const deepFreeze = <T>(o: T): T => { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); for (const v of Object.values(o as any)) deepFreeze(v); } return o; };

export class Director {
  main: Run | null = null;
  overlap: Run | null = null;
  speed: 1 | 2 | 3 = 1;
  forceMinimal = false;
  seen = new Map<string, number>();
  log: RunResult[] = [];
  buffer: { key: string; run: () => void }[] = [];
  doneKeys = new Set<string>();
  onMainChange: ((busy: boolean, ev?: EventName) => void)[] = [];
  constructor(private eng: Engine) {}

  get busy() { return !!this.main; }
  level(): 'full' | 'standard' | 'minimal' { return this.forceMinimal || this.speed >= 2 ? 'minimal' : 'full'; }

  /** 播一个事件。payload 会被 structuredClone + 深冻结后交给 recipe（§0.11）。 */
  play(ev: EventName, payload: unknown, q: { skillId?: string; side?: string; actorId?: string; kind?: string; choice?: string; result?: string } = {}): Promise<RunResult> {
    const eng = this.eng;
    const recipes = [...eng.skin.recipes, ...DEFAULT_RECIPES];
    const recipe = select(recipes, ev, q) ?? select(DEFAULT_RECIPES, ev, {});
    const frozen = deepFreeze(structuredClone(payload ?? {}));
    const lane: 'main' | 'overlap' = ev === 'unit:down' ? 'overlap' : 'main';
    const level = this.level();
    const cap0 = CAPS[capKey(ev, q.side)] ?? [1000, 400];
    // 按格计的事件：上限 = 格数 × 单格上限（封顶 2.0s），recipe 写一格，时间轴按格数伸缩
    const cells = PER_CELL.has(ev) ? Math.max(1, ((payload as any)?.path?.length as number) || 1) : 1;
    const cap: [number, number] = cells > 1 ? [Math.min(PER_CELL_MAX, cap0[0] * cells), Math.min(PER_CELL_MAX, cap0[1] * cells)] : cap0;
    const capMs = (level === 'minimal' ? cap[1] : cap[0]) / this.speed;
    return new Promise<RunResult>((resolve) => {
      if (!recipe) { resolve({ ev, recipe: '-', duration: 0, wallMs: 0, capMs, forced: false, skipped: false, speed: this.speed, level }); return; }
      if (lane === 'overlap' && this.overlap) this.finishRun(this.overlap, false, true);   // 新 unit:down 让旧的直接清场
      if (lane === 'main' && this.main) this.finishRun(this.main, false, true);
      const owner = OWNER++;
      const rc: RunCtx = { eng, owner, ev, payload: frozen, level, temps: new Set(), hitIdx: 0, touched: new Set(),
        dropText: () => lane === 'overlap' && !!this.main && this.mainHasBannerOrCutin() };
      // minimal: compress to minimal cap
      let tracks = expand(recipe);
      let scale = 1;
      if (cells > 1) scale = Math.min(cells, (PER_CELL_MAX - 100) / Math.max(1, recipe.duration));
      if (level === 'minimal') {
        tracks = tracks.filter((t) => t.minimal !== 'skip').map((t) => (typeof t.minimal === 'object' ? { ...t, ...t.minimal, args: { ...t.args, ...(t.minimal.args ?? {}) } } as Track : t));
        // 压到极简上限内：扣掉停帧（极简每次 30ms）和一帧余量，保证墙钟不触发强制推进
        const hs = tracks.filter((t) => t.prim === 'hitStop').length * 30;
        const target = Math.max(cap[1] * 0.5, cap[1] - hs - 40 * this.speed);   // M4b：短上限 ×3 倍速时不压到 0
        if (recipe.duration * scale > target) scale = target / recipe.duration;
      }
      const length = recipe.duration * scale;
      const tl = new Timeline(recipe.id, length);
      for (const t of tracks) {
        const prim = PRIMS[t.prim];
        if (!prim) { eng.errors.push(`prim ${t.prim} not implemented → treated as played (${recipe.id})`); continue; }
        try {
          const st = { ...t, at: t.at * scale, dur: t.dur !== undefined ? t.dur * scale : undefined };
          const c = prim(st, rc);
          if (!c) continue;
          for (const clip of (Array.isArray(c) ? c : [c]) as Clip[]) {
            if (lane === 'overlap' && clip.tag === 'text') {   // §3.1-3：开始时若主线横幅/cut-in 在播，丢弃文字轨
              const b = clip.begin, k = clip.tick; let drop = false;
              clip.begin = () => { drop = rc.dropText(); if (drop) eng.errors.push(`dropText ${recipe.id}`); else b?.(); };
              clip.tick = (p, dt) => { if (!drop) k?.(p, dt); };
            }
            tl.add(clip);
          }
        } catch (e) { report(e, recipe.id + ':' + t.prim); }
      }
      const run: Run = { owner, ev, recipe, tl, rc, capMs, wall: 0, lane, resolve, forced: false, skipped: false };
      this.seen.set(recipe.id, (this.seen.get(recipe.id) ?? 0) + 1);
      if (lane === 'main') { this.main = run; this.onMainChange.forEach((f) => f(true, ev)); } else this.overlap = run;
    });
  }
  mainHasBannerOrCutin() {
    const m = this.main; if (!m) return false;
    return m.tl.clips.some((c) => c.started && !c.done && (c as any).__kind === 'banner') || m.recipe.tracks.some((t) => (t.prim === 'banner' || t.prim === 'cutin') && m.tl.t >= t.at && m.tl.t <= t.at + (t.dur ?? 0));
  }
  /** 每帧：rdt 真实毫秒；返回给世界的 dt（停帧/定格时为 0） */
  update(rdt: number) {
    const fx = this.eng.fx;
    // 演出时钟 = 真实时间 × 倍速；停帧在演出时钟里扣（所以停帧也按倍速缩短）
    let gdt = rdt * this.speed;
    if (fx.hitstop > 0) { const used = Math.min(fx.hitstop, gdt); fx.hitstop -= used; gdt -= used; }
    for (const run of [this.main, this.overlap]) {
      if (!run) continue;
      run.wall += rdt;
      if (run.flash !== undefined) { run.flash -= rdt; if (run.flash <= 0) this.finishRun(run, false, true); continue; }
      run.tl.update(gdt);
      if (run.tl.ended) this.finishRun(run, false, false);
      else if (run.wall >= run.capMs) { this.eng.errors.push(`forced: ${run.recipe.id} wall ${Math.round(run.wall)} ≥ cap ${Math.round(run.capMs)}`); this.finishRun(run, true, false); }
    }
    fx.update(gdt, rdt);
    return fx.frozen > 0 ? 0 : gdt;
  }
  /** 点击跳过：跳到清场；allout/highlight 含 finishCard 时先闪现 ≤150ms */
  skip() {
    const m = this.main; if (!m || m.flash !== undefined) return;
    m.skipped = true;
    if ((m.ev === 'allout' || m.ev === 'highlight') && m.recipe.tracks.some((t) => t.prim === 'finishCard')) {
      const fcT = m.recipe.tracks.find((t) => t.prim === 'finishCard')!;
      // 推进到定格画已滑入的时刻，再停留 150ms
      const target = fcT.at + 200;
      if (m.tl.t < target) m.tl.update(target - m.tl.t);
      m.flash = 120;
      return;
    }
    this.finishRun(m, false, true);
  }
  private finishRun(run: Run, forced: boolean, skipped: boolean) {
    const eng = this.eng;
    run.tl.finish();
    // 清场：临时节点、粒子（按 owner）、滤镜、单位回位
    run.rc.temps.forEach((c) => { c.visible = false; if (!eng.fix.has(c.label) && ![...eng.fix.values()].includes(c)) c.destroy({ children: true }); });
    run.rc.temps.clear();
    eng.ps.kill(run.owner);
    eng.fx.clear(run.owner, run.lane === 'main');
    for (const u of run.rc.touched) { u.root.position.set(u.home.x, u.home.y); u.root.scale.set(1); u.root.alpha = 1; u.hit.scale.set(1); u.hit.x = 0; u.mesh.filters = null as any; }
    if (run.lane === 'main' && skipped) eng.cam.snap();
    if (run.lane === 'main') { eng.st.layers.allout.alpha = 1; eng.st.layers.cutin.alpha = 1; }
    run.forced = forced; run.skipped = run.skipped || skipped;
    const res: RunResult = { ev: run.ev, recipe: run.recipe.id, duration: run.recipe.duration, wallMs: Math.round(run.wall), capMs: Math.round(run.capMs), forced, skipped: run.skipped, speed: this.speed, level: run.rc.level };
    this.log.push(res); if (this.log.length > 300) this.log.shift();
    if (run.lane === 'main') { this.main = null; this.onMainChange.forEach((f) => f(false, run.ev)); } else this.overlap = null;
    run.resolve(res);
    if (run.lane === 'main') this.drain();
  }
  // ---------------------------------------------------------------- input buffer (§3.1-4)
  /** 演出中输入进缓冲（上限 2，满时丢最旧），同一 action key 不执行两次 */
  input(key: string, run: () => void, valid: () => boolean = () => true) {
    const wrapped = () => { if (this.doneKeys.has(key) || !valid()) return; this.doneKeys.add(key); run(); };
    if (!this.main) { wrapped(); return true; }
    this.buffer = this.buffer.filter((b) => b.key !== key);
    this.buffer.push({ key, run: wrapped });
    while (this.buffer.length > 2) this.buffer.shift();
    return false;
  }
  private drain() { const b = this.buffer.shift(); if (b) queueMicrotask(() => { if (!this.main) { b.run(); if (!this.main) this.drain(); } else this.buffer.unshift(b); }); }
  /** 清空一切（切皮肤 / 重开） */
  reset() { if (this.main) this.finishRun(this.main, false, true); if (this.overlap) this.finishRun(this.overlap, false, true); this.buffer = []; this.eng.fx.clear(); this.eng.ps.kill(); }
}
