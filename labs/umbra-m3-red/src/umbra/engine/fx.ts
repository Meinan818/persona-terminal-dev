// 打击感状态：停帧、震屏、世界定格、引擎全屏滤镜名额（Shockwave / RGBSplit，起点自动错开 ≥150ms）。
import { Graphics, Point, Rectangle } from 'pixi.js';
import { ShockwaveFilter, RGBSplitFilter } from 'pixi-filters';
import { Stage, DW, DH } from './stage';

export class Fx {
  hitstop = 0;
  shakeAmp = 0;
  frozen = 0;               // freezeFrame 计数（>0 时世界时钟暂停，渲染不停）
  shock: ShockwaveFilter; rgb: RGBSplitFilter;
  private active = new Set<any>();
  private gameT = 0;
  private lastStart = { shock: -1e9, rgb: -1e9 };
  private pending: { at: number; run: () => void; owner: number }[] = [];
  private shockLeft = 0; private rgbLeft = 0; private shockT = 0;
  flash: Graphics;
  log: string[] = [];
  constructor(private st: Stage, fres: number) {
    this.shock = new ShockwaveFilter({ center: { x: 0, y: 0 }, amplitude: 40, wavelength: 180, speed: 1400, brightness: 1.2, radius: 900, time: 0 });
    this.rgb = new RGBSplitFilter({ red: { x: -8, y: 0 }, green: { x: 0, y: 4 }, blue: { x: 8, y: 0 } });
    this.shock.resolution = fres; this.rgb.resolution = fres;
    this.flash = new Graphics().rect(-1400, -900, DW + 2800, DH + 1800).fill(0xffffff);
    this.flash.alpha = 0; this.flash.visible = false;
    st.view.addChild(this.flash);
  }
  setFres(f: number) { this.shock.resolution = f; this.rgb.resolution = f; }
  get filterCount() { return this.active.size; }
  hitStop(ms: number) { this.hitstop = Math.max(this.hitstop, ms); }
  shake(px: number) { this.shakeAmp = Math.max(this.shakeAmp, Math.min(24, px)); }
  private setF(f: any, on: boolean) {
    if (on) this.active.add(f); else this.active.delete(f);
    this.st.world.filters = this.active.size ? [...this.active] : (null as any);
  }
  /** §1.2：rgbSplit 与 shockwave 起点 <150ms 时，后来的推迟到前一个开始后 150ms */
  private stagger(kind: 'shock' | 'rgb', run: () => void, owner: number) {
    const other = kind === 'shock' ? this.lastStart.rgb : this.lastStart.shock;
    const at = Math.max(this.gameT, other + 150);
    if (at > this.gameT) { this.pending.push({ at, run, owner }); this.log.push(`${kind} delayed ${Math.round(at - this.gameT)}ms`); }
    else run();
    this.lastStart[kind] = at;
  }
  rgbSplit(offset: number, dur: number, owner = 0) {
    this.stagger('rgb', () => {
      const o = Math.min(10, offset) * this.st.scale;
      this.rgb.red = { x: -o, y: 0 }; this.rgb.green = { x: 0, y: o * 0.5 }; this.rgb.blue = { x: o, y: 0 };
      this.rgbLeft = Math.min(150, dur); this.setF(this.rgb, true);
    }, owner);
  }
  shockwave(cx: number, cy: number, amp: number, dur: number, owner = 0) {
    this.stagger('shock', () => {
      const w = this.st.world;
      const g = w.toGlobal(new Point(cx, cy));
      const fa = w.filterArea as Rectangle;
      const tl = w.toGlobal(new Point(fa.x, fa.y)), br = w.toGlobal(new Point(fa.right, fa.bottom));
      const s = this.st.scale;
      this.shock.centerX = g.x - Math.min(tl.x, br.x); this.shock.centerY = g.y - Math.min(tl.y, br.y);
      this.shock.amplitude = Math.min(60, amp) * s; this.shock.wavelength = 200 * s; this.shock.speed = 1500 * s; this.shock.radius = 1000 * s;
      this.shock.time = 0; this.shockT = 0; this.shockLeft = Math.min(520, dur); this.setF(this.shock, true);
    }, owner);
  }
  flashScreen(color: number, alpha: number, ms: number) {
    this.flash.clear().rect(-1400, -900, DW + 2800, DH + 1800).fill(color);
    this.flash.visible = true; this.flash.alpha = Math.min(0.9, alpha);
    this.flashLeft = Math.min(200, ms); this.flashMax = this.flashLeft; this.flashA = this.flash.alpha;
  }
  private flashLeft = 0; private flashMax = 1; private flashA = 0;
  /** gdt：游戏时钟（受停帧影响）；rdt：真实时间 */
  update(gdt: number, rdt: number) {
    this.gameT += gdt;
    for (let i = this.pending.length - 1; i >= 0; i--) if (this.pending[i].at <= this.gameT) { const p = this.pending.splice(i, 1)[0]; p.run(); }
    if (this.shockLeft > 0) { this.shockT += gdt; this.shock.time = this.shockT / 1000; this.shockLeft -= gdt; if (this.shockLeft <= 0) this.setF(this.shock, false); }
    if (this.rgbLeft > 0) { this.rgbLeft -= gdt; if (this.rgbLeft <= 0) this.setF(this.rgb, false); }
    if (this.flashLeft > 0) { this.flashLeft -= rdt; this.flash.alpha = this.flashA * Math.max(0, this.flashLeft / this.flashMax); if (this.flashLeft <= 0) this.flash.visible = false; }
    const w = this.st.world;
    if (this.shakeAmp > 0.3 && this.frozen === 0) {
      this.shakeAmp *= Math.pow(0.86, rdt / 16.7);
      w.position.set((Math.random() - 0.5) * 2 * this.shakeAmp, (Math.random() - 0.5) * 2 * this.shakeAmp);
    } else if (this.frozen === 0) { w.position.set(0, 0); this.shakeAmp = 0; }
    this.st.layers.dmg.position.copyFrom(w.position);
  }
  /** 清场：摘滤镜、解冻时钟、取消待播（owner 省略 = 全部） */
  clear(owner?: number, full = true) {
    this.pending = owner === undefined ? [] : this.pending.filter((p) => p.owner !== owner);
    if (full) {
      this.shockLeft = 0; this.rgbLeft = 0; this.setF(this.shock, false); this.setF(this.rgb, false);
      this.hitstop = 0; this.frozen = 0; this.flashLeft = 0; this.flash.visible = false;
    }
  }
}
