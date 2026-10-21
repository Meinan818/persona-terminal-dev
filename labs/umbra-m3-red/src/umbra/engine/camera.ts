// 伪 3D 镜头（第五阶段）：world 各图层按景深做视差。
// - 待机：镜头绕敌群缓慢环绕（P5R 待机镜头），敌人层不动（命中区/名牌不偏），背景反向、前景同向，队员按环绕方向微倾（透视）
// - 演出：camera 原语给推/拉/摇/滚（绝对量，按景深加权），结束后 180ms 指数回落到待机
import type { Container } from 'pixi.js';
import type { Stage } from './stage';

export interface CamKey { at: number; x?: number; y?: number; zoom?: number; rot?: number; ease?: string }
const DEPTH: Record<string, number> = { bg: 0.35, enemy: 0.75, ally: 1.15, fx: 0.75 };
const E = 0.75;

export class Camera {
  /** 演出镜头（绝对，按景深加权）：x/y 设计像素（正 = 镜头右/下移 → 画面左/上移），zoom 增量，rot 弧度 */
  ov = { x: 0, y: 0, zoom: 0, rot: 0 };
  focus = { x: 640, y: 400 };
  active = 0;
  /** 待机环绕幅度（0 关；极简/低档可降） */
  idleK = 1;
  idleX = 0;
  private idleOff = 0;   // 演出时把待机环绕压掉，结束后恢复
  constructor(private st: Stage) {}

  snap() { this.ov = { x: 0, y: 0, zoom: 0, rot: 0 }; this.focus = { x: 640, y: 400 }; }

  update(t: number, dt: number) {
    const st = this.st;
    if (!this.active) {
      const f = 1 - Math.exp(-dt / 180);
      this.ov.x -= this.ov.x * f; this.ov.y -= this.ov.y * f; this.ov.zoom -= this.ov.zoom * f; this.ov.rot -= this.ov.rot * f;
      this.focus.x += (640 - this.focus.x) * f; this.focus.y += (400 - this.focus.y) * f;
      this.idleOff = Math.max(0, this.idleOff - dt / 600);
    } else this.idleOff = Math.min(1, this.idleOff + dt / 200);
    const k = this.idleK * (1 - this.idleOff);
    // 两个不可公约周期叠加，避免看出循环
    const ix = (Math.sin(t / 4100) * 34 + Math.sin(t / 1900 + 1.3) * 6) * k;
    const iy = Math.sin(t / 5300 + 0.7) * 7 * k;
    const iz = (0.018 + Math.sin(t / 4700 + 2.1) * 0.014) * k;
    const ir = Math.sin(t / 6100) * 0.004 * k;
    this.idleX = ix;
    const o = this.ov, fx = this.focus.x, fy = this.focus.y;
    for (const n of ['bg', 'enemy', 'ally', 'fx'] as const) {
      const L = st.layers[n] as Container, d = DEPTH[n], r = d - E;   // r：相对敌群（环绕中心）的景深
      const z = 1 + o.zoom * d + iz * r * 1.4;
      L.pivot.set(fx, fy);
      L.position.set(fx - o.x * d - ix * r, fy - o.y * d - iy * r);
      L.scale.set(z);
      L.rotation = o.rot * d + ir * r;
    }
    // 伤害数字层跟敌人层（加上 world 的震屏位移）
    const w = st.world, D = st.layers.dmg, z = 1 + o.zoom * E;
    D.pivot.set(fx, fy); D.position.set(fx - o.x * E + w.x, fy - o.y * E + w.y); D.scale.set(z); D.rotation = o.rot * E;
  }
}
