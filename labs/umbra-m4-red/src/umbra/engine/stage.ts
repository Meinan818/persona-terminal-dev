// 舞台：Pixi 应用、图层、1280×720 设计坐标 + 出血、虚拟横屏 ±90°、逻辑安全矩形、DOM 叠加层同步变换。
import { Application, Container, Point, Rectangle } from 'pixi.js';
import type { Layer } from '../skins/_contract';

export const DW = 1280, DH = 720;

export interface Vis { l: number; t: number; r: number; b: number }

export class Stage {
  app!: Application;
  root = new Container();      // 虚拟横屏旋转
  view = new Container();      // 设计坐标缩放/偏移
  world = new Container();     // 震屏 + 全屏滤镜（bg/enemy/ally/fx）
  layers = {} as Record<Layer, Container>;
  vis: Vis = { l: 0, t: 0, r: DW, b: DH };
  scale = 1; rot = 0;
  /** 逻辑安全矩形（设计坐标）。App 侧由 env(safe-area-inset-*) + ResizeObserver 提供；这里从 CSS 探针读。 */
  safe: Vis = { l: 0, t: 0, r: DW, b: DH };
  dom!: HTMLDivElement;        // 1280×720 的 DOM 叠加层，CSS transform 与画布同步（交涉模板、结果 DOM）
  private probe!: HTMLDivElement;
  onLayout: (() => void)[] = [];

  async init(host: HTMLElement, res: number) {
    this.app = new Application();
    await this.app.init({ preference: 'webgl', resizeTo: window, antialias: false, background: '#000000',
      resolution: res, autoDensity: true, powerPreference: 'high-performance' });
    host.appendChild(this.app.canvas);
    this.app.stage.addChild(this.root);
    this.root.addChild(this.view);
    const names: Layer[] = ['bg', 'enemy', 'ally', 'fx', 'dmg', 'hud', 'cutin', 'allout', 'trans'];
    for (const n of names) { const c = new Container(); c.label = 'layer.' + n; this.layers[n] = c; }
    this.world.addChild(this.layers.bg, this.layers.enemy, this.layers.ally, this.layers.fx);
    this.view.addChild(this.world, this.layers.dmg, this.layers.hud, this.layers.cutin, this.layers.allout, this.layers.trans);
    // DOM overlay in design space
    this.dom = document.createElement('div');
    this.dom.id = 'umbra-dom';
    Object.assign(this.dom.style, { position: 'fixed', left: '0', top: '0', width: DW + 'px', height: DH + 'px', transformOrigin: '0 0', pointerEvents: 'none', zIndex: '5' });
    document.body.appendChild(this.dom);
    this.probe = document.createElement('div');
    Object.assign(this.probe.style, { position: 'fixed', inset: '0', visibility: 'hidden', pointerEvents: 'none',
      paddingTop: 'env(safe-area-inset-top)', paddingRight: 'env(safe-area-inset-right)', paddingBottom: 'env(safe-area-inset-bottom)', paddingLeft: 'env(safe-area-inset-left)' });
    document.body.appendChild(this.probe);
    this.app.renderer.on('resize', () => this.layout());
    new ResizeObserver(() => this.layout()).observe(this.probe);
    this.layout();
  }

  layout() {
    const W = this.app.screen.width, H = this.app.screen.height;
    const portrait = H > W;
    // ±90°：按设备方向选择（screen.orientation.angle 为 90 时逆时针），默认顺时针
    const ang = (screen.orientation && (screen.orientation as any).angle) || 0;
    this.rot = portrait ? (ang === 270 || ang === -90 ? -1 : 1) : 0;
    const LW = portrait ? H : W, LH = portrait ? W : H;
    if (this.rot === 1) { this.root.rotation = Math.PI / 2; this.root.position.set(W, 0); }
    else if (this.rot === -1) { this.root.rotation = -Math.PI / 2; this.root.position.set(0, H); }
    else { this.root.rotation = 0; this.root.position.set(0, 0); }
    const s = Math.min(LW / DW, LH / DH);          // 16:9 安全框完整可见，多出的方向出血
    this.scale = s;
    this.view.scale.set(s);
    this.view.position.set((LW - DW * s) / 2, (LH - DH * s) / 2);
    this.vis = { l: -this.view.x / s, t: -this.view.y / s, r: (LW - this.view.x) / s, b: (LH - this.view.y) / s };
    // logical safe rect: CSS insets (screen px) → design px, intersected with the 16:9 frame
    const cs = getComputedStyle(this.probe);
    const ins = { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 };
    const L = portrait ? { l: ins.t, r: ins.b, t: ins.r, b: ins.l } : ins;
    const sl = Math.max(0, (L.l - this.view.x) / s), sr = Math.min(DW, (LW - L.r - this.view.x) / s);
    const st = Math.max(0, (L.t - this.view.y) / s), sb = Math.min(DH, (LH - L.b - this.view.y) / s);
    this.safe = { l: sl, t: st, r: sr, b: sb };
    this.world.filterArea = new Rectangle(this.vis.l - 40, this.vis.t - 40, this.vis.r - this.vis.l + 80, this.vis.b - this.vis.t + 80);
    // DOM overlay: same matrix as root·view
    const m = this.view.worldTransform;
    this.view.updateLocalTransform(); this.root.updateLocalTransform();
    const g = this.view.toGlobal(new Point(0, 0)), gx = this.view.toGlobal(new Point(1, 0)), gy = this.view.toGlobal(new Point(0, 1));
    void m;
    this.dom.style.transform = `matrix(${gx.x - g.x},${gx.y - g.y},${gy.x - g.x},${gy.y - g.y},${g.x},${g.y})`;
    this.dom.style.setProperty('--umbra-safe-x', this.safe.l + 'px');
    this.dom.style.setProperty('--umbra-safe-y', this.safe.t + 'px');
    this.dom.style.setProperty('--umbra-safe-w', (this.safe.r - this.safe.l) + 'px');
    this.dom.style.setProperty('--umbra-safe-h', (this.safe.b - this.safe.t) + 'px');
    for (const f of this.onLayout) f();
  }

  /** 屏幕 CSS 像素 → 设计坐标（与 Pixi 事件系统经 root/view 的变换一致） */
  screenToDesign(x: number, y: number) {
    const p = this.view.toLocal(new Point(x, y));
    return { x: p.x, y: p.y };
  }
  designToScreen(x: number, y: number) {
    const g = this.view.toGlobal(new Point(x, y));
    return { x: g.x, y: g.y };
  }
}
