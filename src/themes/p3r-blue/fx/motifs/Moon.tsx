/**
 * B1 满月 / 月相 —— 蓝专属。
 *   <MoonPhase phase={4} />                     8 相位单色线描图标（0 新月 → 4 满月 → 7 残月）；满月自动加光晕
 *   <MoonPhase date={new Date()} />             按日期算月相（日历 / 日期栏 / 天空角标）
 *   <MoonPhase cycling stepMs={50} />           加载指示：8 相位 50ms 步进轮换（代替转圈）
 *   <FullMoon size={260} frame sky slot={…} />  开屏「深夜月光录」：满月 + 光晕 + 光柱 + 窗框；人物剪影走插槽 slot:splash-silhouette
 * 颜色：line 版走 --p3r-blue（夜间自动变影时间绿 = 绿月）；glow 版走 --bk-moon（日白 / 夜绿）。
 * 低动效：cycling 停在满月；光晕不呼吸。
 */
import { memo, useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useBoldness } from './_env';

/** 0..7 → 月龄比例 f∈[0,1) 的受光区路径（r=半径，中心 (r,r)）。sweep：SVG 1 = 顺时针。 */
export function moonLitPath(f: number, r: number): string {
  const cx = r, top = 0, bot = 2 * r;
  const k = Math.cos(2 * Math.PI * f);
  const rx = Math.max(0.001, Math.abs(k) * r);
  if (f < 0.5) {
    const back = f < 0.25 ? 0 : 1; // 蛾眉（终止线向右凸）/ 盈凸（向左凸）
    return `M${cx},${top} A${r},${r} 0 0 1 ${cx},${bot} A${rx},${r} 0 0 ${back} ${cx},${top} Z`;
  }
  const back = f > 0.75 ? 1 : 0;
  return `M${cx},${top} A${r},${r} 0 0 0 ${cx},${bot} A${rx},${r} 0 0 ${back} ${cx},${top} Z`;
}

/** 日期 → 月相序号 0..7（以 2000-01-06 18:14 UTC 新月为基准，朔望月 29.530588853 天；误差 ±1 天，够做 UI） */
export function moonPhaseOf(d: Date): number {
  const days = (d.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / 86400000;
  const age = ((days % 29.530588853) + 29.530588853) % 29.530588853;
  return Math.round((age / 29.530588853) * 8) % 8;
}
export const MOON_PHASE_NAMES = ['新月', '蛾眉月', '上弦月', '盈凸月', '满月', '亏凸月', '下弦月', '残月'] as const;

export interface MoonPhaseProps {
  phase?: number;
  date?: Date;
  size?: number;
  /** line：单色线描（白底图标）；glow：发光月面（深底 / 演出） */
  variant?: 'line' | 'glow';
  halo?: boolean;
  cycling?: boolean;
  stepMs?: number;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

export const MoonPhase = memo(({ phase, date, size = 24, variant = 'line', halo, cycling = false, stepMs = 50, className, style, title }: MoonPhaseProps) => {
  const anim = useBoldness();
  const base = phase ?? (date ? moonPhaseOf(date) : 4);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!cycling || !anim) return;
    const t = window.setInterval(() => setTick((n) => (n + 1) % 8), Math.max(16, stepMs));
    return () => clearInterval(t);
  }, [cycling, anim, stepMs]);
  const p = cycling ? (anim ? tick : 4) : ((base % 8) + 8) % 8;
  const r = 10;
  const lit = variant === 'line' ? 'var(--p3r-blue)' : 'var(--bk-moon)';
  const showHalo = halo ?? p === 4;
  return (
    <svg viewBox="-4 -4 28 28" width={size} height={size} className={className} style={{ overflow: 'visible', ...style }}
      role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {showHalo && (
        <circle className="bk-halo" cx={r} cy={r} r={r + 3.2} fill="none" stroke={variant === 'line' ? 'var(--p3r-cyan)' : 'var(--bk-moon)'} strokeWidth={1} strokeDasharray="1.4 2.2" />
      )}
      {variant === 'glow' && <circle cx={r} cy={r} r={r} style={{ fill: 'var(--bk-moon)', opacity: 0.14 }} />}
      {p !== 0 && <path d={moonLitPath(p / 8, r)} fill={lit} />}
      <circle cx={r} cy={r} r={r - 0.6} fill="none" stroke={variant === 'line' ? 'var(--p3r-ink)' : 'var(--bk-moon)'} strokeWidth={1.2} opacity={variant === 'line' ? 0.85 : 0.6} />
    </svg>
  );
});

/** 月相 8 联排（日历条 / 演示用） */
export const MoonPhaseStrip = ({ size = 18, active, className }: { size?: number; active?: number; className?: string }) => (
  <div className={className} style={{ display: 'flex', gap: size * 0.45, alignItems: 'center' }}>
    {Array.from({ length: 8 }).map((_, i) => (
      <MoonPhase key={i} phase={i} size={size} halo={false} style={{ opacity: active === undefined || active === i ? 1 : 0.4 }} />
    ))}
  </div>
);

export interface FullMoonProps {
  size?: number;
  /** 窗框剪影（P3 标题画面：窗前满月） */
  frame?: boolean;
  /** 自带夜空底（群青；开屏 / 演出用）。不开则透明，叠在任意舞台上 */
  sky?: boolean;
  /** 光柱 */
  rays?: boolean;
  /** 官方素材插槽 slot:splash-silhouette（窗前人物剪影）；demo 留空 */
  slot?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** 满月场景：满月 + 两圈光晕 + 斜光柱 + 窗框（十字棂 + 窗帘缝），月面焦散斑 */
export const FullMoon = memo(({ size = 260, frame = true, sky = false, rays = true, slot, className, style }: FullMoonProps) => {
  const anim = useBoldness();
  const id = useId().replace(/:/g, '');
  return (
    <div className={className} style={{ position: 'relative', width: size, height: size * 1.15, overflow: 'hidden', background: sky ? 'linear-gradient(180deg, var(--bk-abyss-3) 0%, var(--bk-abyss-2) 55%, var(--bk-abyss-1) 100%)' : undefined, ...style }} aria-hidden>
      <svg viewBox="0 0 200 230" width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" style={{ stopColor: 'var(--bk-moon)', stopOpacity: 0.5 }} />
            <stop offset="60%" style={{ stopColor: 'var(--bk-moon)', stopOpacity: 0.12 }} />
            <stop offset="100%" style={{ stopColor: 'var(--bk-moon)', stopOpacity: 0 }} />
          </radialGradient>
          <linearGradient id={`${id}-ray`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: 'var(--bk-moon)', stopOpacity: 0.32 }} />
            <stop offset="100%" style={{ stopColor: 'var(--bk-moon)', stopOpacity: 0 }} />
          </linearGradient>
          <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: 'var(--bk-abyss-2)' }} />
            <stop offset="100%" style={{ stopColor: 'var(--bk-sea-3)' }} />
          </linearGradient>
        </defs>
        {/* 浅底（日间首页白纸面）上白月会融进底色：垫一枚深蓝「夜窗」圆 + 蓝描边，月轮加深色细描边（修 2026-10-21 日间白月太淡） */}
        {!sky && (
          <g>
            <circle cx="100" cy="92" r="80" fill={`url(#${id}-sky)`} />
            <circle cx="100" cy="92" r="84" fill="none" style={{ stroke: 'var(--p3r-blue)' }} strokeWidth="2.5" />
            <circle cx="100" cy="92" r="89" fill="none" style={{ stroke: 'var(--p3r-cyan)' }} strokeWidth="1" strokeDasharray="10 6" />
          </g>
        )}
        <circle cx="100" cy="92" r="92" fill={`url(#${id}-glow)`} className="bk-halo" />
        <circle cx="100" cy="92" r="66" fill="none" style={{ stroke: 'var(--bk-moon)' }} strokeOpacity={0.35} strokeWidth="0.8" strokeDasharray="2 5" />
        <circle cx="100" cy="92" r="54" style={{ fill: 'var(--bk-moon)', stroke: 'var(--bk-abyss-1)' }} strokeWidth={sky ? 0 : 1.5} />
        {/* 月面斑：几块极淡的焦散形，月不是纯平面 */}
        <g style={{ fill: 'var(--p3r-cyan-pale)' }} opacity={0.55}>
          <path d="M76 70 C84 62 98 66 96 78 C94 88 80 88 76 80 Z" />
          <path d="M112 104 C122 98 134 106 128 116 C122 124 108 120 112 104 Z" />
          <path d="M88 116 C92 112 100 114 98 120 C96 124 90 123 88 116 Z" />
        </g>
        {rays && (
          <g opacity={0.9}>
            <polygon points="86,120 114,120 150,230 60,230" fill={`url(#${id}-ray)`} />
            <polygon points="96,130 104,130 118,230 84,230" fill={`url(#${id}-ray)`} />
          </g>
        )}
        {frame && (
          <g style={{ fill: 'var(--bk-abyss-3)' }}>
            {/* 窗框：外框 + 十字棂；底部窗台 */}
            <path d="M0 0 H200 V230 H0 Z M18 14 V196 H182 V14 Z" fillRule="evenodd" />
            <rect x="97" y="14" width="6" height="182" />
            <rect x="18" y="98" width="164" height="5" />
            <rect x="0" y="196" width="200" height="34" />
            {/* 窗帘缝：两侧斜垂的布边（剃刀直线，不画褶皱） */}
            <polygon points="18,14 40,14 30,196 18,196" opacity={0.85} />
            <polygon points="182,14 164,14 172,196 182,196" opacity={0.85} />
          </g>
        )}
      </svg>
      {slot && <div data-slot="splash-silhouette" style={{ position: 'absolute', left: '50%', bottom: '15%', transform: 'translateX(-50%)' }}>{slot}</div>}
      {anim && rays && (
        <motion.div style={{ position: 'absolute', left: '30%', top: '60%', width: '40%', height: 2, background: 'var(--bk-moon)', opacity: 0 }}
          animate={{ opacity: [0, 0.6, 0], scaleX: [0.4, 1, 0.4] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} />
      )}
    </div>
  );
});
