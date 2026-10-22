// 时间轴：一次演出 = 若干 Clip（begin → tick(p) → end）。时钟由 Director 推进（倍速、停帧都在外面算）。
import type { Ease as EaseName } from '../skins/_contract';

export type EaseFn = (t: number) => number;
export const ease: Record<EaseName, EaseFn> = {
  linear: (t) => t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inCubic: (t) => t * t * t,
  outQuart: (t) => 1 - Math.pow(1 - t, 4),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: (t) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outElastic: (t) => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
};

export interface Clip {
  t0: number; dur: number;
  begin?(): void;
  tick?(p: number, dt: number): void;   // p 已经过 ease
  end?(): void;                         // 正常结束、跳过、强制推进都会调用（只调一次）
  ease?: EaseFn;
  tag?: string;                         // 'text' 类在重叠层被横幅压住时会被丢弃（§3.1-3）
  started?: boolean; done?: boolean;
}

export class Timeline {
  t = 0;
  clips: Clip[] = [];
  ended = false;
  constructor(public name: string, public length: number) {}
  add(c: Clip) { this.clips.push(c); return c; }
  at(t0: number, fn: () => void, tag?: string) { return this.add({ t0, dur: 0, begin: fn, tag }); }
  tw(t0: number, dur: number, fn: (p: number) => void, e: EaseFn = ease.linear, tag?: string) {
    return this.add({ t0, dur, tick: (p) => fn(p), ease: e, tag });
  }
  update(dt: number) {
    if (this.ended) return;
    this.t += dt;
    for (const c of this.clips) {
      if (c.done || this.t < c.t0) continue;
      if (!c.started) { c.started = true; try { c.begin?.(); } catch (e) { report(e, this.name); c.done = true; continue; } }
      const raw = c.dur > 0 ? Math.min(1, (this.t - c.t0) / c.dur) : 1;
      try { c.tick?.((c.ease ?? ease.linear)(raw), dt); } catch (e) { report(e, this.name); }
      if (raw >= 1) { c.done = true; try { c.end?.(); } catch (e) { report(e, this.name); } }
    }
    if (this.t >= this.length) this.finish();
  }
  /** 立刻收尾：未开始的跳过，已开始的调用 end（清场） */
  finish() {
    if (this.ended) return;
    this.ended = true;
    for (const c of this.clips) {
      if (c.started && !c.done) { c.done = true; try { c.end?.(); } catch (e) { report(e, this.name); } }
    }
  }
}

let errHook: (e: unknown, where: string) => void = (e, w) => console.warn('[umbra]', w, e);
export function setErrorHook(f: typeof errHook) { errHook = f; }
export function report(e: unknown, where: string) { errHook(e, where); }
