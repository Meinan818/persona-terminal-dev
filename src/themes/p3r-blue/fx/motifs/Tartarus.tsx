/**
 * B5 塔尔塔罗斯（往上爬的塔）—— 蓝专属。
 *   <TartarusSilhouette style={{ width: 160, height: 300 }} />   塔身剪影：细长、分层、顶部尖；日 = 墨色淡剪影，夜 = 群青 + 影时间绿描边；顶部信标
 *   <TartarusCounter floor={12} />                               楼层计数「THEBEL · 12F」：窄斜体数字整格上推 + 楼层刻度进度
 *   <TartarusCounter running />                                  AI 长推理：楼层自动往上跳（每 700ms 一层）
 * 6 区名取自原作（Thebel / Arqa / Yabbashah / Tziah / Harabah / Adamah）；每区楼层数是 demo 自定的 App 分段，不是原作层数。
 */
import { memo, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useBoldness, slantClip } from './_env';

export const TARTARUS_BLOCKS = [
  { id: 'thebel', name: 'THEBEL', zh: '第一区', from: 1, to: 20 },
  { id: 'arqa', name: 'ARQA', zh: '第二区', from: 21, to: 40 },
  { id: 'yabbashah', name: 'YABBASHAH', zh: '第三区', from: 41, to: 60 },
  { id: 'tziah', name: 'TZIAH', zh: '第四区', from: 61, to: 80 },
  { id: 'harabah', name: 'HARABAH', zh: '第五区', from: 81, to: 100 },
  { id: 'adamah', name: 'ADAMAH', zh: '第六区', from: 101, to: 120 },
] as const;
export const tartarusBlockOf = (floor: number) => TARTARUS_BLOCKS.find((b) => floor >= b.from && floor <= b.to) ?? TARTARUS_BLOCKS[TARTARUS_BLOCKS.length - 1];

/** 塔身剪影（viewBox 100×200）。tone='auto' 用 --p3r-ink（日淡墨 / 夜冷白太亮，所以夜改群青填充 + 绿描边由 CSS 变量决定） */
export const TartarusSilhouette = memo(({ className, style, beacon = true, floors = 7 }: { className?: string; style?: CSSProperties; beacon?: boolean; floors?: number }) => {
  // 分层：自下而上逐层收窄、错位，层间留窗带
  const tiers = Array.from({ length: floors }, (_, i) => {
    const t = i / floors;
    const w = 64 - t * 46 + (i % 2 ? 4 : 0);
    const h = 26 - t * 10;
    return { w, h };
  });
  let y = 200;
  return (
    <svg viewBox="0 0 100 200" preserveAspectRatio="xMidYMax meet" className={className} style={style} aria-hidden>
      <g style={{ fill: 'color-mix(in srgb, var(--p3r-ink) 16%, var(--bk-abyss-1))' }} opacity={0.92}>
        {tiers.map((t, i) => {
          y -= t.h;
          const x = 50 - t.w / 2 + (i % 3 === 1 ? 2 : i % 3 === 2 ? -2 : 0);
          const el = (
            <g key={i}>
              <polygon points={`${x},${y + t.h} ${x + t.w},${y + t.h} ${x + t.w - 2},${y + 3} ${x + t.w / 2 + 3},${y} ${x + 2},${y + 2}`} />
              {/* 侧翼尖刺（剃刀三角） */}
              <polygon points={`${x},${y + t.h} ${x - 6 + (i % 2) * 2},${y + t.h * 0.4} ${x + 3},${y + t.h * 0.55}`} />
              <polygon points={`${x + t.w},${y + t.h} ${x + t.w + 5},${y + t.h * 0.35} ${x + t.w - 3},${y + t.h * 0.6}`} />
            </g>
          );
          return el;
        })}
        <polygon points={`46,${y + 1} 54,${y + 1} 50.5,${Math.max(4, y - 34)}`} />
      </g>
      {/* 窗带：每层一道细亮线（夜间 = 绿） */}
      <g style={{ stroke: 'var(--p3r-blue)' }} strokeWidth="0.9" opacity="0.7">
        {(() => { let yy = 200; return tiers.map((t, i) => { yy -= t.h; return <line key={i} x1={50 - t.w * 0.32} y1={yy + t.h * 0.55} x2={50 + t.w * 0.28} y2={yy + t.h * 0.55} strokeDasharray={i % 2 ? '2 3' : '5 2'} />; }); })()}
      </g>
      {beacon && <circle className="bk-beacon" cx="50.5" cy={Math.max(6, y - 32)} r="2.2" style={{ fill: 'var(--bk-red)' }} />}
    </svg>
  );
});

/** 竖向整格推移的数字（与 DateRoll 同一动法：旧值上滑出、新值自下滑入） */
export const RollNum = ({ value, style }: { value: ReactNode; style?: CSSProperties }) => {
  const anim = useBoldness();
  return (
    <span style={{ position: 'relative', display: 'inline-block', overflow: 'hidden', verticalAlign: 'bottom', ...style }}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={String(value)} style={{ display: 'inline-block' }}
          initial={anim ? { y: '100%' } : { opacity: 0 }} animate={{ y: '0%', opacity: 1 }} exit={anim ? { y: '-100%' } : { opacity: 0 }}
          transition={{ duration: anim ? 0.26 : 0.01, ease: [0.33, 0, 0.15, 1] }}>{value}</motion.span>
      </AnimatePresence>
    </span>
  );
};

export interface TartarusCounterProps {
  floor?: number;
  running?: boolean;
  /** running 时每层间隔 */
  stepMs?: number;
  label?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export const TartarusCounter = ({ floor = 1, running = false, stepMs = 700, label, className, style }: TartarusCounterProps) => {
  const anim = useBoldness();
  const [f, setF] = useState(floor);
  useEffect(() => { setF(floor); }, [floor]);
  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setF((n) => (n >= 120 ? 1 : n + 1)), anim ? stepMs : stepMs * 2);
    return () => clearInterval(t);
  }, [running, stepMs, anim]);
  const b = tartarusBlockOf(f);
  const within = (f - b.from) / (b.to - b.from);
  return (
    <div className={className} role={running ? 'status' : undefined} aria-live={running ? 'polite' : undefined} style={{ display: 'inline-flex', flexDirection: 'column', gap: 4, minWidth: 150, ...style }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontFamily: 'var(--p3r-font-cond)', fontStyle: 'italic', fontWeight: 800, color: 'var(--p3r-ink)' }}>
        <span style={{ padding: '1px 8px', background: 'var(--p3r-ink)', color: 'var(--p3r-on-ink)', fontSize: 12, letterSpacing: '0.18em', clipPath: slantClip(5) }}>{b.name}</span>
        <RollNum value={f} style={{ fontSize: 34, lineHeight: 1, color: 'var(--p3r-blue)' }} />
        <span style={{ fontSize: 18 }}>F</span>
      </div>
      {/* 楼层刻度：20 格，已爬过的翻蓝 */}
      <div aria-hidden style={{ display: 'flex', gap: 2, height: 8 }}>
        {Array.from({ length: 20 }).map((_, i) => (
          <span key={i} style={{ flex: 1, background: i / 19 <= within ? 'var(--p3r-blue)' : 'var(--p3r-track)', transform: 'skewX(-20deg)' }} />
        ))}
      </div>
      {label && <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--p3r-ink-soft)' }}>{label}</span>}
    </div>
  );
};
