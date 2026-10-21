/** 形状生成（原 core.js P5.shape，逐字迁移；同 seed 恒同形）。返回 CSS clip-path 字符串 / SVG points。 */
import { rng } from './rng';

const f = (n: number) => n.toFixed(2);

export interface TornOpts { steps?: number; jag?: number; slant?: number; top?: boolean; bottom?: boolean }

export const shape = {
  /** 撕边多边形（百分比）：上下边锯齿撕纸，左右轻抖 */
  torn(seed: number, { steps = 20, jag = 1.4, slant = 0.8, top = true, bottom = true }: TornOpts = {}): string {
    const r = rng(seed), p: string[] = [];
    if (top) for (let k = 0; k <= steps; k++) p.push(`${f(slant + (k / steps) * (100 - slant))}% ${f(r() * jag)}%`);
    else p.push(`${f(slant)}% 0%`, `100% ${f(r() * 0.5)}%`);
    p.push(`${f(100 - r() * 0.5)}% ${f(40 + r() * 10)}%`);
    if (bottom) for (let k = steps; k >= 0; k--) p.push(`${f((k / steps) * (100 - slant))}% ${f(100 - r() * jag)}%`);
    else p.push(`${f(100 - slant)}% 100%`, `0% ${f(100 - r() * 0.5)}%`);
    p.push(`${f(r() * 0.5)}% ${f(55 + r() * 8)}%`);
    return `polygon(${p.join(',')})`;
  },
  /** 四角各自错动的不规则四边形（px 抖动） */
  quad(seed: number, jag = 6): string {
    const r = rng(seed), j = () => f(r() * jag);
    return `polygon(${j()}px ${j()}px, calc(100% - ${j()}px) ${j()}px, calc(100% - ${j()}px) calc(100% - ${j()}px), ${j()}px calc(100% - ${j()}px))`;
  },
  /** 切角按钮：两斜角 + 缺口 */
  cut(seed: number, c = 10): string {
    const r = rng(seed), j = () => f(r() * 3);
    return `polygon(${c}px ${j()}px, calc(100% - ${j()}px) 0, 100% calc(100% - ${c}px), calc(100% - ${c + 6}px) 100%, ${j()}px calc(100% - ${j()}px), 0 ${c + 4}px)`;
  },
  /** 斜牌（标题牌） */
  plate: 'polygon(0 8%, 100% 0, 92% 100%, 3% 94%)',
  /** 五角星顶点（§0 starPts）→ SVG points 字符串 */
  starPts(cx: number, cy: number, R: number, rot = -90, inner = 0.42): string {
    const out: string[] = [];
    for (let i = 0; i < 10; i++) {
      const a = ((rot + i * 36) * Math.PI) / 180, rr = i % 2 ? R * inner : R;
      out.push(`${f(cx + Math.cos(a) * rr)},${f(cy + Math.sin(a) * rr)}`);
    }
    return out.join(' ');
  },
};
export type ShapeKind = 'torn' | 'quad' | 'cut' | 'plate';
