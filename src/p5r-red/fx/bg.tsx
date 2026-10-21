/**
 * 舞台背景（原 shared/bg.js + app.js P5.defaultStage，逐字迁移）。
 * 红色放射线 + 少量奶白光楔 + 真·渐变网点 + 极少墨色碎片，全部 SVG，颜色走 --p5r-*（日/夜）。
 *
 *   <P5BgSVG seed={5} fx={720} fy={260} wide={false} />         // = P5.bgSVG({...})
 *   <P5StageLayers wide={wide} stage={defaultStage(wide, {...})} /> // = P5.defaultStage(wide, o) 的产物
 * 页面在注册表里声明 stage: (wide) => defaultStage(wide, {...})，外壳 #stage-bg 负责渲染。
 */
import { memo, useMemo, type ReactNode } from 'react';
import { rng } from '@/p5r-red/lib/rng';
import { cssText } from '@/p5r-red/lib/css';
import { P5Sil, type SilName } from './sil';

const f = (n: number) => n.toFixed(1);

/** 半色调网点块：沿 dir 方向半径从 rMax 递减到 0 */
function dots(key: string, x0: number, y0: number, w: number, h: number, step: number, rMax: number, dir: string, fill: string, rot = 0): ReactNode {
  const c: ReactNode[] = [];
  for (let y = 0; y <= h; y += step) for (let x = (Math.round(y / step) % 2) * step / 2; x <= w; x += step) {
    const t = dir === 'x' ? x / w : dir === '-x' ? 1 - x / w : dir === 'y' ? y / h : dir === '-y' ? 1 - y / h : Math.min(1, Math.hypot(x / w - 0.5, y / h - 0.5) * 1.6);
    const r = rMax * (1 - t); if (r < 0.5) continue;
    c.push(<circle key={c.length} cx={f(x0 + x)} cy={f(y0 + y)} r={f(r)} />);
  }
  return <g key={key} fill={fill} transform={`rotate(${rot} ${x0 + w / 2} ${y0 + h / 2})`}>{c}</g>;
}

export interface BgOpts { seed?: number; fx?: number; fy?: number; wide?: boolean; rays?: number; cream?: number; dense?: number }

export const P5BgSVG = memo(function P5BgSVG({ seed = 5, fx = 640, fy = 380, wide = false, rays = 30, cream = 3, dense = 1 }: BgOpts) {
  const body = useMemo(() => {
    const r = rng(seed);
    const W = wide ? 1600 : 1000, H = 1000, R = 2400;
    const ray: string[] = [];
    for (let i = 0; i < rays; i++) {
      const a0 = (i / rays) * Math.PI * 2 + r() * 0.03, a1 = a0 + (Math.PI * 2 / rays) * (0.42 + r() * 0.22);
      if (i % 2) continue;
      ray.push(`${fx},${fy} ${f(fx + Math.cos(a0) * R)},${f(fy + Math.sin(a0) * R)} ${f(fx + Math.cos(a1) * R)},${f(fy + Math.sin(a1) * R)}`);
    }
    const p = (aa: number, d: number) => `${f(fx + Math.cos(aa) * d)},${f(fy + Math.sin(aa) * d)}`;
    const wedge: string[] = [];
    for (let i = 0; i < cream; i++) { const a = r() * Math.PI * 2, w = 0.035 + r() * 0.05, near = 120 + r() * 160; wedge.push(`${p(a, near)} ${p(a - w, R)} ${p(a + w, R)}`); }
    const ink: string[] = [];
    for (let i = 0; i < 2; i++) { const a = r() * Math.PI * 2, d0 = 380 + r() * 200; ink.push(`${p(a, d0)} ${p(a - 0.012, R)} ${p(a + 0.03, R)}`); }
    return { W, H, ray, wedge, ink };
  }, [seed, fx, fy, wide, rays, cream]);
  const { W, H, ray, wedge, ink } = body;
  return (
    <svg className="p5r-bg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width={W} height={H} fill="var(--p5r-bg-a)" />
      <g fill="var(--p5r-bg-b)">{ray.map((pts, i) => <polygon key={i} points={pts} />)}</g>
      <g fill="var(--p5r-bg-wedge)" opacity=".92">{wedge.map((pts, i) => <polygon key={i} points={pts} />)}</g>
      <g fill="var(--p5r-bg-ink)">{ink.map((pts, i) => <polygon key={i} points={pts} />)}</g>
      {dots('d1', -20, H - 330, 420 * dense, 360, 15, 6.4, '-x', 'var(--p5r-bg-dot)', -8)}
      {dots('d2', W - 360, -30, 400, 300, 15, 6, 'x', 'var(--p5r-bg-dot)', 12)}
      {dots('d3', W - 300, H - 240, 320, 260, 13, 5, 'r', 'var(--p5r-bg-dot2)')}
    </svg>
  );
});

/** 舞台描述（registry 的 stage(wide) 返回它）。'none' = 只有底色 + 颗粒。 */
export interface StageSpec { seed: number; fx: number; fy: number; sil: SilName | null; silPos: string; silOpacity: number; flip: boolean; wide: boolean; /** 舞台附加切图（原生 stage 字符串里追加的 <img style>，在剪影之后、颗粒之前） */ imgs?: { src: string; style: string }[] }
export interface StageOpts { seed?: number; fx?: number; fy?: number; sil?: SilName | null; silPos?: string; silOpacity?: number; flip?: boolean }

/** 原 P5.defaultStage(wide, o)：红放射线 + 奶白光楔 + 网点 + 一个暗红剪影。silPos 用原生 style 字符串，保持逐字一致。 */
export function defaultStage(wide: boolean, o: StageOpts = {}): StageSpec {
  return {
    wide,
    seed: o.seed || 5,
    fx: o.fx || (wide ? 1180 : 700),
    fy: o.fy || (wide ? 260 : 300),
    sil: o.sil === undefined ? 'leap' : o.sil,
    silPos: o.silPos || (wide ? 'right:3%;bottom:-2%;height:62vh' : 'right:-34px;bottom:calc(var(--nav-h) + 4px);height:34vh'),
    silOpacity: o.silOpacity || 0.9,
    flip: !!o.flip,
  };
}

/** #stage-bg 的内容（外壳 / OverlayHarness / 索引页共用） */
export function P5StageLayers({ stage }: { stage: StageSpec }) {
  return (
    <>
      <div className="stg-bg" style={{ inset: 0 }}><P5BgSVG seed={stage.seed} wide={stage.wide} fx={stage.fx} fy={stage.fy} /></div>
      {stage.sil && (
        <div className="stg-sil" style={{ ...cssText(stage.silPos), opacity: stage.silOpacity }}>
          <P5Sil name={stage.sil} style={{ height: '100%', width: 'auto', display: 'block' }} flip={stage.flip} />
        </div>
      )}
      {stage.imgs?.map((im, i) => <img key={i} src={im.src} alt="" draggable={false} style={cssText(im.style)} />)}
      <div className="grain" />
    </>
  );
}

/** 独立舞台（不在外壳里时用，如 #/overlay 预览、索引页）：固定铺满的 #stage-bg 等价层 */
export function P5Stage({ stage, id = 'stage-bg' }: { stage: StageSpec; id?: string }) {
  return <div id={id} aria-hidden="true"><P5StageLayers stage={stage} /></div>;
}
