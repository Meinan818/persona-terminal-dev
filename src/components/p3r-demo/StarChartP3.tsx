/**
 * StarChartP3（蓝白 = 真实 StarChartP3 原形）—— 人格指数「同心五角星 + 实心数据星」：
 *   角长 = 等级（0.24R 起步，满级顶到外轮廓）· 同心等级星环（内浅外深，CSS color-mix 插值，夜间变量自动跟随）·
 *   实心数据星（深蓝填充 + 蓝描边）· 角端延长细线 · 斜切平面 skewX(-13°) scaleY(1.16)，标签反变换回正 · 五个角是完整 button。
 *   与粉版差异：粉版是花瓣星象仪（圆润瓣形 + 背景淡瓣 + 中心奶油圆）；蓝版回到真实 p3 的剃刀尖角星形。
 * 入场演出（home-starchart-anim，fxMs 3.0s）：进入视口 → 星环由外到内逐档铺开（.04s/档）→ 数据星从最小星「长角」到当前等级
 *   （.9s，ease-out）→ 臂线伸出 → 标签逐个弹入 → 点角高亮巡游一圈（每角 .28s 蓝斜片扫过）；低动效直出终态。
 */
import { animate, motion, useMotionValue, useTransform, type MotionValue } from 'motion/react';
import { useEffect, useRef, useState, type MouseEvent as RMouseEvent } from 'react';
import type { AttributeId } from '@/types';
import { useBoldness } from '@/utils/boldness';

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
const levelRadius = (level: number, max: number) => R * (0.24 + 0.76 * Math.max(0, Math.min(1, level / Math.max(1, max))));

export interface StarItem { id: AttributeId; name: string; level: number; maxLevel: number; stars?: number; title: string }

/** 数据星：五角长 = 等级（升级即「长角」），实心深蓝 + 蓝描边（真实 StarChartP3 dataPath） */
const DataStar = ({ grow, items }: { grow: MotionValue<number>; items: StarItem[] }) => {
  const d = useTransform(grow, (g) => starPathAt(items.slice(0, 5).map((it) => MIN_R + (levelRadius(it.level, it.maxLevel) - MIN_R) * g)));
  return (
    <>
      <motion.path d={d} fill="var(--p3r-blue-deep)" opacity={0.88} />
      <motion.path d={d} fill="none" stroke="var(--p3r-blue)" strokeWidth={2.2} strokeLinejoin="miter" />
    </>
  );
};

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
                <path d={starPathAt([r, r, r, r, r])} fill={ringColor(lvl)} />
              </motion.g>
            );
          })}
          {items.slice(0, 5).map((it, i) => {
            const [x1, y1] = pt(armAngle(i), R * 0.99);
            const [x2, y2] = pt(armAngle(i), R + 12);
            return <motion.line key={it.id} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgb(var(--p3r-cyan-rgb) / 0.55)" strokeWidth={1.5}
              initial={play ? { pathLength: 0 } : false} animate={{ pathLength: stage >= 2 ? 1 : 0 }} transition={{ duration: 0.25, delay: i * 0.05 }} />;
          })}
          <DataStar grow={grow} items={items} />
          <polygon points={`${CX - 7},${CY + 5} ${CX + 9},${CY - 2} ${CX - 3},${CY - 7}`} fill="var(--p3r-magenta)" />
          {/* 点角高亮：蓝小三角落在当前角端 */}
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
