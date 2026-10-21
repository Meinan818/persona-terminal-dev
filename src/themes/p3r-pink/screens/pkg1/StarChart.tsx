/**
 * StarChartP3（粉）—— 人格指数「花瓣星象仪」：五瓣按五角星角位排布（瓣长 = 等级），同心等级花环内浅外深，背景错位淡瓣 + 中心奶油圆与四角星闪
 *   （按用户口径：粉版首页人格图为花瓣花形，不是实心大星；几何取真实 FlowerChart#petalPath，P3R 斜切平面 / 标签 / 交互沿用真实 StarChartP3）：
 *   角长 = 等级（0.24R 起步，满级顶到外轮廓）· 同心等级星环（内浅外深，CSS color-mix 插值，夜间变量自动跟随）·
 *   角端延长细线 · 斜切平面 skewX(-13°) scaleY(1.16)，标签反变换回正 · 五个角是完整 button。
 * 粉版新增入场演出（home-starchart-anim，fxMs 3.0s）：进入视口 → 星环由外到内逐档铺开（.04s/档）→ 数据星从最小星「长角」到当前等级
 *   （.9s，ease-out）→ 臂线伸出 → 标签逐个弹入 → 点角高亮巡游一圈（每角 .28s 玫红斜片扫过）；低动效直出终态。
 */
import { animate, motion, useMotionValue, useTransform, type MotionValue } from 'framer-motion';
import { useEffect, useRef, useState, type MouseEvent as RMouseEvent } from 'react';
import type { AttributeId } from '@/types';
import { useBoldness } from '@pink/lib/prefs';

const CX = 180, CY = 178, R = 150;
const rad = (d: number) => (d * Math.PI) / 180;
const armAngle = (i: number) => -90 + i * 72;
const SKEW = -13, SCALEY = 1.16;
const pt = (ang: number, r: number): [number, number] => [CX + r * Math.cos(rad(ang)), CY + r * Math.sin(rad(ang))];
const MIN_R = R * 0.24;
export const starPathAt = (radii: number[]) => {
  const r = (i: number) => (Number.isFinite(radii[i]) ? radii[i] : MIN_R);
  let d = '';
  for (let i = 0; i < 5; i++) {
    const [ox, oy] = pt(armAngle(i), r(i));
    const innerR = ((r(i) + r((i + 1) % 5)) / 2) * 0.4;
    const [ix, iy] = pt(armAngle(i) + 36, innerR);
    d += `${i === 0 ? 'M' : 'L'}${ox.toFixed(1)},${oy.toFixed(1)} L${ix.toFixed(1)},${iy.toFixed(1)} `;
  }
  return `${d}Z`;
};
/** 花瓣：从瓣根 r0 沿 -Y 伸到瓣尖 r1 的圆润瓣形（真实 FlowerChart#petalPath 同式，宽度随长度收放），再按角度旋转到各角 */
const PETAL_R0 = 16;
export const petalPath = (r1: number) => {
  const r0 = PETAL_R0, len = Math.max(8, r1 - r0), w = Math.min(50, 14 + len * 0.3);
  return `M 0 ${-r0} C ${w} ${-r0 - 10}, ${w + 8} ${-(r0 + len * 0.62)}, 0 ${-r1} C ${-w - 8} ${-(r0 + len * 0.62)}, ${-w} ${-r0 - 10}, 0 ${-r0} Z`;
};
const petalT = (i: number) => `translate(${CX} ${CY}) rotate(${armAngle(i) + 90})`;
const levelRadius = (level: number, max: number) => R * (0.24 + 0.76 * Math.max(0, Math.min(1, level / Math.max(1, max))));

export interface StarItem { id: AttributeId; name: string; level: number; maxLevel: number; stars?: number; title: string }

const DataPetal = ({ grow, it, i }: { grow: MotionValue<number>; it: StarItem; i: number }) => {
  const d = useTransform(grow, (g) => petalPath(MIN_R + (levelRadius(it.level, it.maxLevel) - MIN_R) * g));
  return (
    <g transform={petalT(i)}>
      <motion.path d={d} fill="var(--p3r-blue-deep)" opacity={0.9} />
      <motion.path d={d} fill="none" stroke="var(--p3r-blue)" strokeWidth={2} />
    </g>
  );
};
/** 数据花：五瓣瓣长 = 等级（升级即「长瓣」） */
const DataStar = ({ grow, items }: { grow: MotionValue<number>; items: StarItem[] }) => (
  <>{items.slice(0, 5).map((it, i) => <DataPetal key={it.id} grow={grow} it={it} i={i} />)}</>
);

export const StarChartP3 = ({ items, onSelect, showLabels = true, intro = false, replayKey }: {
  items: StarItem[]; onSelect: (id: AttributeId, e: RMouseEvent) => void; showLabels?: boolean; intro?: boolean; replayKey?: number;
}) => {
  const anim = useBoldness();
  const play = intro && anim;
  const ref = useRef<HTMLDivElement>(null);
  const grow = useMotionValue(play ? 0 : 1);
  const [stage, setStage] = useState(play ? 0 : 3); // 0 未入视口 · 1 星环 / 长角 · 2 标签 · 3 高亮巡游
  const [hl, setHl] = useState(-1);
  const ringCount = Math.min(10, Math.max(1, items[0]?.maxLevel ?? 5));

  useEffect(() => {
    if (!play) { grow.set(1); setStage(3); return; }
    grow.set(0); setStage(0); setHl(-1);
    const el = ref.current;
    let started = false;
    const ids: number[] = [];
    const go = () => {
      if (started) return; started = true;
      setStage(1);
      const ctl = animate(grow, 1, { duration: 0.9, delay: 0.42, ease: [0.2, 0.8, 0.25, 1] });
      ids.push(window.setTimeout(() => setStage(2), 1100));
      for (let i = 0; i < 5; i++) ids.push(window.setTimeout(() => setHl(i), 1750 + i * 280));
      ids.push(window.setTimeout(() => { setHl(-1); setStage(3); }, 1750 + 5 * 280 + 120));
      return ctl;
    };
    let io: IntersectionObserver | null = null;
    if (el && typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { go(); io?.disconnect(); } }, { threshold: 0.35 });
      io.observe(el);
    } else go();
    return () => { io?.disconnect(); ids.forEach(clearTimeout); };
  }, [play, replayKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const labelAt = (i: number) => {
    const [x, y] = pt(armAngle(i), R * 1.04);
    const dx = x - CX, dy = y - CY;
    return { left: (x / 360) * 100, top: (y / 356) * 100, tx: dx < -30 ? -86 : dx > 30 ? -14 : -50, ty: dy < -30 ? -74 : dy > 30 ? -26 : -50 };
  };
  const ringColor = (lvl: number) => `color-mix(in srgb, var(--p3r-star-ring-deep) ${Math.round((lvl / ringCount) * 100)}%, var(--p3r-star-ring-pale))`;

  return (
    <div ref={ref} className="relative mx-auto w-full max-w-[288px]" style={{ paddingTop: 31, paddingBottom: 32 }}>
      <div className="relative" style={{ transform: `skewX(${SKEW}deg) scaleY(${SCALEY})` }}>
        <svg viewBox="0 0 360 356" className="w-full overflow-visible" aria-hidden>
          {Array.from({ length: ringCount }).map((_, k) => {
            const lvl = ringCount - k;
            const r = levelRadius(lvl, ringCount);
            return (
              <motion.g key={lvl} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                initial={play ? { opacity: 0, scale: 0.86 } : false} animate={stage >= 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.86 }}
                transition={{ duration: 0.32, delay: play ? k * 0.04 : 0, ease: 'easeOut' }}>
                {[0, 1, 2, 3, 4].map((i) => <path key={i} transform={petalT(i)} d={petalPath(r)} fill={ringColor(lvl)} />)}
              </motion.g>
            );
          })}
          {items.slice(0, 5).map((it, i) => {
            const [x1, y1] = pt(armAngle(i), R * 0.99);
            const [x2, y2] = pt(armAngle(i), R + 12);
            return <motion.line key={it.id} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgb(var(--p3r-cyan-rgb) / 0.55)" strokeWidth={1.5}
              initial={play ? { pathLength: 0 } : false} animate={{ pathLength: stage >= 2 ? 1 : 0 }} transition={{ duration: 0.25, delay: i * 0.05 }} />;
          })}
          {/* 背景花剪影：错开 36° 的五枚淡瓣（真实 FlowerChart 奶油花剪影，粉版藕紫淡片） */}
          {[0, 1, 2, 3, 4].map((i) => <path key={`bg${i}`} transform={`translate(${CX} ${CY}) rotate(${armAngle(i) + 126})`} d={petalPath(R * 0.62)} fill="rgb(var(--p3r-cyan-rgb) / 0.14)" />)}
          <DataStar grow={grow} items={items} />
          <circle cx={CX} cy={CY} r={PETAL_R0 + 6} fill="var(--p3r-panel)" />
          <path transform={`translate(${CX - 10} ${CY - 10}) scale(0.84)`} d="M12 1 Q13.3 10.7 23 12 Q13.3 13.3 12 23 Q10.7 13.3 1 12 Q10.7 10.7 12 1Z" fill="var(--p3r-blue)" />
          {/* 点角高亮：玫红小三角落在当前角端 */}
          {hl >= 0 && (() => {
            const it = items[hl];
            const [x, y] = pt(armAngle(hl), levelRadius(it.level, it.maxLevel));
            return <motion.circle key={`hl${hl}`} cx={x} cy={y} fill="none" stroke="var(--p3r-blue)" strokeWidth={3} initial={{ r: 4, opacity: 1 }} animate={{ r: 26, opacity: 0 }} transition={{ duration: 0.5, ease: 'easeOut' }} />;
          })()}
        </svg>
        {showLabels && items.slice(0, 5).map((it, i) => {
          const p = labelAt(i);
          const lit = hl === i;
          return (
            <motion.button key={it.id} type="button" onClick={(e) => onSelect(it.id, e)}
              className="absolute flex flex-col items-center whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--p3r-blue)]"
              style={{ left: `${p.left}%`, top: `${p.top}%`, transform: `translate(${p.tx}%, ${p.ty}%) skewX(${-SKEW}deg) scaleY(${1 / SCALEY})` }}
              initial={play ? { opacity: 0 } : false} animate={{ opacity: stage >= 2 ? 1 : 0 }} transition={{ duration: 0.22, delay: play ? i * 0.07 : 0 }}
              aria-label={`${it.name} 等级 ${it.level}，${it.title}`}>
              {lit && <motion.span aria-hidden className="absolute -inset-x-2 inset-y-0" style={{ background: 'rgb(var(--p3r-blue-rgb) / 0.16)', clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)' }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.18 }} />}
              <span className="relative flex items-baseline gap-1.5">
                <span className="text-[15px] font-black leading-none" style={{ color: 'var(--p3r-ink)' }}>{it.name}</span>
                <span className="font-cond text-[27px] leading-none" style={{ color: 'var(--p3r-blue)' }}>{it.level}{it.stars ? <span className="ml-px text-[11px] font-black not-italic">★{it.stars}</span> : null}</span>
              </span>
              {it.title && <span className="relative mt-0.5 block text-[11px] font-semibold leading-none" style={{ color: 'var(--p3r-ink-soft)' }}>{it.title}</span>}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
