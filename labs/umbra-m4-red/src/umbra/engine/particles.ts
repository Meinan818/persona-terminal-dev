// 池化粒子：单一图集纹理 + ParticleContainer；同屏总上限按画质档（§6：600/300/150），按 owner 回收。
import { Container, Graphics, ParticleContainer, Particle, Rectangle, Texture, Renderer } from 'pixi.js';

export const PFRAME: Record<string, number> = { disc: 0, shard: 1, streak: 2, star: 3, smoke: 4, ink: 5, spark: 6, square: 7 };
interface PD { vx: number; vy: number; life: number; max: number; spin: number; g: number; drag: number; s0: number; s1: number; owner: number; stretch: boolean }

export class Particles {
  pc = new ParticleContainer<Particle>({ dynamicProperties: { position: true, rotation: true, vertex: true, color: true, uvs: true } });
  frames: Texture[] = [];
  atlas!: Texture;
  private pool: Particle[] = [];
  private data = new Map<Particle, PD>();
  private dirty = false;
  cap = 600;
  peak = 0;
  constructor(renderer: Renderer, layer: Container, poolSize = 700) {
    const g = new Graphics();
    g.rect(0, 0, 256, 32).fill({ color: 0, alpha: 0 });
    g.circle(16, 16, 15).fill(0xffffff);                                                     // disc
    g.poly([48, 1, 54, 16, 48, 31, 42, 16]).fill(0xffffff);                                  // shard
    g.poly([64, 14, 96, 15, 96, 17, 64, 18]).fill(0xffffff);                                 // streak
    g.poly([112, 1, 116, 12, 127, 16, 116, 20, 112, 31, 108, 20, 97, 16, 108, 12]).fill(0xffffff); // star
    g.circle(144, 16, 15).fill({ color: 0xffffff, alpha: 0.55 }).circle(144, 16, 10).fill({ color: 0xffffff, alpha: 0.6 }); // smoke
    g.poly([162, 10, 170, 2, 178, 8, 190, 4, 186, 14, 191, 24, 178, 22, 172, 30, 166, 22, 160, 20]).fill(0xffffff); // ink splat
    g.poly([208, 15, 222, 13, 224, 16, 222, 19, 208, 17]).fill(0xffffff);                    // spark
    g.rect(236, 8, 16, 16).fill(0xffffff);                                                   // square
    this.atlas = renderer.generateTexture({ target: g, frame: new Rectangle(0, 0, 256, 32), resolution: 1, antialias: true });
    for (let i = 0; i < 8; i++) this.frames.push(new Texture({ source: this.atlas.source, frame: new Rectangle(i * 32, 0, 32, 32) }));
    for (let i = 0; i < poolSize; i++) {
      const p = new Particle({ texture: this.frames[0], anchorX: 0.5, anchorY: 0.5 });
      this.pool.push(p); this.data.set(p, { vx: 0, vy: 0, life: 0, max: 1, spin: 0, g: 0, drag: 1, s0: 1, s1: 0, owner: 0, stretch: false });
    }
    layer.addChild(this.pc);
  }
  get count() { return this.pc.particleChildren.length; }
  /** 返回实际发射数（受同屏总上限截断：按比例截掉本次发射，已有粒子不提前回收） */
  emit(n: number, x: number, y: number, o: { speed?: number; spread?: number; dir?: number; life?: number; size?: number; gravity?: number;
    frames?: string[]; colors?: number[]; drag?: number; grow?: boolean; owner?: number; jitter?: number } = {}) {
    n = Math.max(0, Math.min(Math.round(n), this.cap - this.count));
    const sp = o.speed ?? 900, spread = o.spread ?? Math.PI * 2, dir = o.dir ?? 0, life = o.life ?? 700, size = o.size ?? 1;
    const fr = (o.frames ?? ['disc', 'shard', 'shard', 'streak', 'star']).map((f) => PFRAME[f] ?? 0), cols = o.colors ?? [0xffffff];
    const jit = o.jitter ?? 0;
    for (let i = 0; i < n; i++) {
      const p = this.pool.pop(); if (!p) return i;
      const d = this.data.get(p)!;
      const a = dir + (Math.random() - 0.5) * spread, v = sp * (0.25 + Math.random() * 0.75);
      d.vx = Math.cos(a) * v; d.vy = Math.sin(a) * v; d.life = 0; d.max = life * (0.55 + Math.random() * 0.45);
      d.spin = (Math.random() - 0.5) * 16; d.g = o.gravity ?? 900; d.drag = o.drag ?? 0.9;
      d.s0 = size * (0.3 + Math.random() * 0.9); d.s1 = o.grow ? d.s0 * 1.8 : 0; d.owner = o.owner ?? 0;
      const f = fr[(Math.random() * fr.length) | 0];
      d.stretch = f === 2 || f === 6;
      p.texture = this.frames[f]; p.tint = cols[(Math.random() * cols.length) | 0];
      p.x = x + (Math.random() - 0.5) * jit; p.y = y + (Math.random() - 0.5) * jit;
      p.rotation = d.stretch ? a : Math.random() * 6.28; if (d.stretch) d.spin = 0;
      p.scaleX = p.scaleY = d.s0; p.alpha = 1;
      this.pc.particleChildren.push(p); this.dirty = true;
    }
    this.peak = Math.max(this.peak, this.count);
    return n;
  }
  update(dt: number) {
    const s = dt / 1000, arr = this.pc.particleChildren;
    for (let i = arr.length - 1; i >= 0; i--) {
      const p = arr[i], d = this.data.get(p)!;
      d.life += dt;
      if (d.life >= d.max) { arr[i] = arr[arr.length - 1]; arr.pop(); this.pool.push(p); this.dirty = true; continue; }
      const k = d.life / d.max, dr = Math.pow(d.drag, dt / 16.7);
      d.vx *= dr; d.vy = d.vy * dr + d.g * s;
      p.x += d.vx * s; p.y += d.vy * s; p.rotation += d.spin * s;
      const sc = d.s0 + (d.s1 - d.s0) * k;
      if (d.stretch) { p.scaleX = sc * 2.2; p.scaleY = sc * 0.8; } else { p.scaleX = sc; p.scaleY = sc; }
      p.alpha = k > 0.7 ? (1 - k) / 0.3 : 1;
    }
    if (this.dirty) { this.pc.update(); this.dirty = false; }
  }
  /** 按 owner 回收（演出被中止/跳过时）；owner 省略 = 全部 */
  kill(owner?: number) {
    const arr = this.pc.particleChildren;
    for (let i = arr.length - 1; i >= 0; i--) {
      const p = arr[i];
      if (owner === undefined || this.data.get(p)!.owner === owner) { arr[i] = arr[arr.length - 1]; arr.pop(); this.pool.push(p); this.dirty = true; }
    }
    if (this.dirty) { this.pc.update(); this.dirty = false; }
  }
}
