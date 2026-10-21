/**
 * P3R 蓝白 kit · 基础件 —— 第一参照：真实 src/components/p3r/kit.tsx（形制 / 动效 1:1），颜色只读 --p3r-* 变量。
 *   P3R 常量 · slantClip / chamferClip / sheetTopClip · GhostWords · TitleTri · SectionMark · TitlePeriod
 *   BigSlantTitle · SelectWedge · GuideBox · CondNum · P3Highlight · ShatteredStar · P3Tag · P3Avatar · P3Progress
 * 铁律（同真实 kit）：装饰 aria-hidden、命中区完整矩形、正文恒水平（斜的只有容器与装饰）、动效只动 transform/opacity/clip-path。
 */
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { TriCursor } from '@blue/fx/motifs/TriCursor';
import { motion } from 'framer-motion';
import { useBoldness } from '@blue/lib/prefs';
import { cx } from '@blue/lib/cx';

/** 调色板 = 真实 kit 的 P3R 常量（变量名不变，粉值由 tokens/p3r.css 给） */
export const P3R = {
  blue: 'var(--p3r-blue)',          // P3R 蓝
  blueDeep: 'var(--p3r-blue-deep)', // 深蓝
  ink: 'var(--p3r-ink)',            // 深蓝墨
  inkSoft: 'var(--p3r-ink-soft)',
  grey: 'var(--p3r-grey)',
  cyan: 'var(--p3r-cyan)',          // 亮青
  cyanPale: 'var(--p3r-cyan-pale)', // 淡浅青面
  cyanFaint: 'var(--p3r-cyan-faint)',
  magenta: 'var(--p3r-magenta)',    // 臂章红
  bg: 'var(--p3r-bg)',
  panel: 'var(--p3r-panel)',
  panelGlass: 'var(--p3r-panel-glass)',
  onBlue: 'var(--p3r-on-blue)',
  roseInk: 'var(--p3r-rose-ink)',
  lilacInk: 'var(--p3r-lilac-ink)',
  track: 'var(--p3r-track)',
  gold: 'var(--p3r-gold)',
  amber: 'var(--p3r-amber)',
  mulberry: 'var(--p3r-mulberry)',
  cream: 'var(--p3r-cream)',
} as const;

/** 平行四边形（左上→右下 = lead；右上→左下 = tail） */
export const slantClip = (cut = 7, dir: 'lead' | 'tail' = 'lead') =>
  dir === 'lead'
    ? `polygon(${cut}px 0, 100% 0, calc(100% - ${cut}px) 100%, 0 100%)`
    : `polygon(0 0, calc(100% - ${cut}px) 0, 100% 100%, ${cut}px 100%)`;
/** 剃刀切角（左上 a + 右下 b 两刀）——P3R 卡片 / 对话牌 */
export const chamferClip = (a = 14, b = 18) => `polygon(${a}px 0, 100% 0, 100% calc(100% - ${b}px), calc(100% - ${b}px) 100%, 0 100%, 0 ${a}px)`;
/** 底部弹层顶缘极缓单斜（真实 sheetTopClip） */
export const sheetTopClip = 'polygon(0 18px, 100% 0, 100% 100%, 0 100%)';
/** 小斜片（句点 / tick / 签名件）通用 clip */
export const tickClip = 'polygon(30% 0, 100% 0, 70% 100%, 0 100%)';

/** 背景幽灵大字（多行，整块 -12° 斜置；outline=描边空心） */
export const GhostWords = ({ words, className, style, outline = false, cond = true }: { words: ReactNode[]; className?: string; style?: CSSProperties; outline?: boolean; cond?: boolean }) => {
  const anim = useBoldness();
  return (
    <div aria-hidden className={cx('pointer-events-none absolute select-none uppercase leading-[0.84]', cond ? 'font-cond' : 'font-heavy', className)}
      style={{ color: outline ? 'transparent' : 'var(--p3r-ghost)', WebkitTextStroke: outline ? '1.5px var(--p3r-ghost)' : undefined, transform: 'rotate(-12deg)', ...style }}>
      <motion.div animate={anim ? { opacity: [1, 0.78, 1] } : undefined} transition={{ duration: 8.5, repeat: Infinity, ease: 'easeInOut' }}>
        {words.map((w, i) => <div key={i} className="whitespace-nowrap">{w}</div>)}
      </motion.div>
    </div>
  );
};

/** 标题底衬三角（真实 TitleTri：M2 32 L296 6 L70 74，入场左→右揭示）。父级需 isolation:isolate */
export const TitleTri = ({ delay = 0.35, fill, style, wobble = false }: { delay?: number; fill?: string; style?: CSSProperties; wobble?: boolean }) => {
  const anim = useBoldness();
  return (
    <motion.span aria-hidden className="pointer-events-none absolute" style={{ zIndex: -1, ...style }}
      initial={anim ? { clipPath: 'inset(-14% 102% -60% -5%)', opacity: 0.35 } : false}
      animate={{ clipPath: 'inset(-14% -5% -60% -5%)', opacity: 0.85 }}
      transition={{ duration: 0.55, delay, ease: [0.25, 0.1, 0.25, 1] }}>
      <motion.svg viewBox="0 0 300 60" preserveAspectRatio="none" className="h-full w-full overflow-visible"
        animate={anim && wobble ? { skewX: [0, -1.4, 0.8, -0.6, 0], scaleY: [1, 1.04, 0.97, 1.02, 1] } : undefined}
        transition={wobble ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: delay + 0.6 } : undefined}>
        <path d="M2 32 L296 6 L70 74 Z" fill={fill ?? P3R.blue} />
      </motion.svg>
    </motion.span>
  );
};
/** 真实首页标题底衬三角「顶点沸腾」（TitleTri wobble；原 P1 DashboardParts#TitleTriWobble 上收） */
export const TitleTriWobble = ({ style, delay = 0.35, play = true, fill }: { style?: CSSProperties; delay?: number; play?: boolean; fill?: string }) => {
  const anim = useBoldness();
  return <TitleTri style={style} delay={delay} fill={fill} wobble={play && anim} />;
};

export const SectionMark = ({ title, en, meta: metaProp, right, marker = 'slab', tri = false, tone = 'ink', className }: {
  title: ReactNode; en?: string; meta?: ReactNode; /** meta 的别名（右侧附加件） */ right?: ReactNode; marker?: 'slab' | 'tri'; tri?: boolean; tone?: 'ink' | 'rose'; className?: string;
}) => {
  const meta = metaProp ?? right;
  const anim = useBoldness();
  const mm = { initial: anim ? { scaleX: 0, opacity: 0 } : (false as const), animate: { scaleX: 1, opacity: 1 }, transition: { type: 'spring' as const, stiffness: 480, damping: 30 } };
  return (
    <div className={cx('flex min-w-0 items-end justify-between gap-3', className)}>
      <div className="relative flex min-w-0 items-center gap-2" style={{ isolation: 'isolate' }}>
        {marker === 'tri'
          ? <motion.span aria-hidden className="h-0 w-0 shrink-0 border-x-[8px] border-t-[13px] border-x-transparent" style={{ borderTopColor: P3R.blue, originX: 0 }} {...mm} />
          : <motion.span aria-hidden className="h-[19px] w-[13px] shrink-0" style={{ background: P3R.blue, clipPath: 'polygon(32% 0, 100% 0, 68% 100%, 0 100%)', originX: 0 }} {...mm} />}
        <motion.h3 className="min-w-0 truncate font-heavy text-h3 leading-none" style={{ color: tone === 'rose' ? P3R.blue : P3R.ink }}
          initial={anim ? { clipPath: 'inset(-10% 102% -10% -3%)', x: -6 } : false}
          animate={{ clipPath: 'inset(-10% -8% -20% -3%)', x: 0 }} transition={{ duration: 0.38, ease: [0.25, 0.1, 0.25, 1], delay: 0.06 }}>{title}</motion.h3>
        {en && <span className="shrink-0 font-cond text-cap uppercase leading-none" style={{ color: P3R.grey }}>{en}</span>}
        {tri && <TitleTri delay={0.28} fill="color-mix(in srgb, var(--p3r-blue) 36%, transparent)" style={{ left: 14, right: en ? 40 : -6, top: -2, bottom: -6, transform: 'rotate(6deg)' }} />}
      </div>
      {meta && <div className="shrink-0">{meta}</div>}
    </div>
  );
};

/** 标题句点：青片 + 臂章红小片错位（真实 TitlePeriod；原青 + 洋红） */
export const TitlePeriod = ({ className, style }: { className?: string; style?: CSSProperties }) => {
  const anim = useBoldness();
  return (
    <span aria-hidden className={cx('relative inline-block h-[14px] w-[30px] shrink-0', className)} style={style}>
      <motion.span className="absolute left-0 top-0 h-full w-[20px]" style={{ background: P3R.cyan, clipPath: tickClip }}
        initial={anim ? { scale: 0, x: -6, opacity: 0 } : false} animate={{ scale: 1, x: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 520, damping: 24, delay: 0.12 }} />
      <motion.span className="absolute left-[16px] top-[4px] h-[10px] w-[14px]" initial={anim ? { scale: 0, x: -4, opacity: 0 } : false} animate={{ scale: 1, x: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 520, damping: 20, delay: 0.24 }}>
        <span className="p3-dot-blink absolute inset-0" style={{ background: P3R.magenta, clipPath: tickClip }} />
      </motion.span>
    </span>
  );
};

/** 超大黑斜体节题（今日任务 / 已归档）+ 右侧窄斜体计数 */
export const BigSlantTitle = ({ title, count, className, suffix }: { title: ReactNode; count?: ReactNode; className?: string; suffix?: ReactNode }) => (
  <div className={cx('flex min-w-0 items-end justify-between gap-3', className)}>
    <h2 className="flex min-w-0 items-center font-heavy text-[clamp(26px,8vw,34px)] leading-none" style={{ color: P3R.ink }}>
      <span className="min-w-0 truncate pr-1">{title}</span>{suffix}
    </h2>
    {count !== undefined && (
      <div className="flex shrink-0 items-center gap-1.5 pb-0.5">
        <span className="font-cond text-[22px] leading-none tabular" style={{ color: P3R.blue }}>{count}</span>
        <span aria-hidden className="h-3 w-3" style={{ background: P3R.cyan, clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} />
      </div>
    )}
  </div>
);

/**
 * 光标楔（P3R 暂停菜单光标）：锯齿长楔 + 冷白错位分身 + 臂章红小刀口，steps 轻抖（transform-only，低动效静止）。
 * 用法：父级 relative；<SelectWedge className="-left-3 -right-6 inset-y-0" />，字压在其上用 --p3r-mulberry。
 */
export const SelectWedge = ({ className, style }: { className?: string; style?: CSSProperties }) => (
  // 蓝白：原作暂停菜单的红白双三角光标（B8）。小控件（固定宽度类 w-[..]）只显示双三角。
  <TriCursor className={cx('pointer-events-none absolute', className)} style={style} compact={/\bw-\[/.test(className ?? '')} />
);

/** 右下操作指引（P3R「Use a Skill / Command —— Ⓐ Confirm Ⓑ Close」） */
export const GuideBox = ({ text, sub = 'GUIDE', keys, className }: { text: ReactNode; sub?: string; keys?: { k: string; label: string }[]; className?: string }) => (
  <div className={cx('pointer-events-none flex min-w-0 flex-col items-end', className)}>
    <div className="max-w-full truncate font-heavy text-[15px] leading-tight" style={{ color: P3R.ink }}>{text}</div>
    <div className="mt-0.5 flex w-full items-center gap-2">
      <span className="font-cond-up text-[9px] uppercase" style={{ color: P3R.grey }}>{sub}</span>
      <span className="h-px flex-1" style={{ background: P3R.ink, opacity: 0.6 }} />
    </div>
    {keys && (
      <div className="mt-1 flex flex-wrap justify-end gap-3">
        {keys.map((k) => (
          <span key={k.k} className="flex items-center gap-1 text-[12px] font-black italic" style={{ color: P3R.ink }}>
            <span className="flex h-[16px] w-[16px] items-center justify-center rounded-full text-[9px] not-italic" style={{ border: `1.5px solid ${P3R.ink}` }}>{k.k}</span>{k.label}
          </span>
        ))}
      </div>
    )}
  </div>
);

/** P3R 数字：窄斜体大数 + 小标签（Lv 49 / HP 383 / RANK 7） */
export const CondNum = ({ value, label, size = 26, color, className }: { value: ReactNode; label?: string; size?: number | string; color?: string; className?: string }) => (
  <span className={cx('inline-flex items-baseline gap-0.5', className)}>
    {label && <span className="font-cond text-[11px] uppercase" style={{ color: P3R.grey }}>{label}</span>}
    <span className="font-cond leading-none tabular" style={{ fontSize: size, color: color ?? P3R.blue }}>{value}</span>
  </span>
);

/** P3「活高亮」：单枚运动三角（rAF 朝随机目标插值）；低动效 / live=false 静止 */
const TRI_BOX = [[11, 18, 2, 7], [1, 7, 43, 48], [91, 98, 19, 30]];
const triTarget = () => TRI_BOX.flatMap((v) => [v[0] + Math.random() * (v[1] - v[0]), v[2] + Math.random() * (v[3] - v[2])]);
export const P3Highlight = ({ className, color = 'rgba(255,255,255,0.26)', live = true }: { className?: string; color?: string; live?: boolean }) => {
  const bold = useBoldness();
  const ref = useRef<SVGPolygonElement>(null);
  useEffect(() => {
    if (!bold || !live) return;
    const cur = triTarget(); let tgt = triTarget(); let last = 0; let raf = 0;
    const loop = (t: number) => {
      if (t - last > 130) { tgt = triTarget(); last = t; }
      for (let i = 0; i < 6; i++) cur[i] += (tgt[i] - cur[i]) * 0.18;
      ref.current?.setAttribute('points', `${cur[0]},${cur[1]} ${cur[2]},${cur[3]} ${cur[4]},${cur[5]}`);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [bold, live]);
  return (
    <svg viewBox="0 0 100 50" preserveAspectRatio="none" className={className} aria-hidden>
      <polygon ref={ref} fill={color} points="14,4 4,46 95,24" />
    </svg>
  );
};

/** 碎裂星徽（升级 cut-in / 庆祝）：冷白描边青星 + 蓝 / 深蓝 / 臂章红三角碎片（原蓝青碎片） */
const SHARDS: Array<{ pts: string; fill: string; op?: number }> = [
  { pts: '112,4 150,64 94,54', fill: 'var(--p3r-blue)' },
  { pts: '158,34 196,88 142,76', fill: 'var(--p3r-cyan)' },
  { pts: '26,80 68,60 54,108', fill: 'var(--p3r-blue-deep)' },
  { pts: '182,124 216,152 172,168', fill: 'var(--p3r-magenta)' },
  { pts: '58,172 96,204 44,202', fill: 'var(--p3r-cyan)' },
  { pts: '150,180 180,214 130,206', fill: 'var(--p3r-blue-deep)' },
  { pts: '14,138 42,124 38,158', fill: 'var(--p3r-cyan-pale)' },
  { pts: '196,60 212,92 184,84', fill: 'var(--p3r-blue)', op: 0.75 },
];
export const ShatteredStar = ({ className = 'mx-auto w-[190px]' }: { className?: string }) => {
  const anim = useBoldness();
  const cx0 = 110, cy0 = 120, R = 56, inner = R * 0.42;
  let d = '';
  for (let i = 0; i < 5; i++) {
    const a1 = ((-90 + i * 72) * Math.PI) / 180, a2 = ((-90 + i * 72 + 36) * Math.PI) / 180;
    d += `${i === 0 ? 'M' : 'L'}${(cx0 + R * Math.cos(a1)).toFixed(1)},${(cy0 + R * Math.sin(a1)).toFixed(1)} L${(cx0 + inner * Math.cos(a2)).toFixed(1)},${(cy0 + inner * Math.sin(a2)).toFixed(1)} `;
  }
  return (
    <svg viewBox="0 0 220 230" className={className} aria-hidden>
      {SHARDS.map((s, i) => {
        const ns = s.pts.split(/[\s,]+/).map(Number);
        const px = (ns[0] + ns[2] + ns[4]) / 3, py = (ns[1] + ns[3] + ns[5]) / 3;
        return (
          <motion.g key={s.pts} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            initial={anim ? { x: (cx0 - px) * 0.6, y: (cy0 - py) * 0.6, scale: 0.4, opacity: 0 } : false}
            animate={{ x: 0, y: 0, scale: 1, opacity: s.op ?? 1 }} transition={{ type: 'spring', stiffness: 300, damping: 19, delay: 0.1 + i * 0.05 }}>
            <g className={anim ? 'p3-shard-float' : undefined} style={anim ? { animationDuration: `${3 + (i % 4) * 0.55}s`, animationDelay: `${i * 0.37}s`, transformBox: 'fill-box', transformOrigin: 'center' } : undefined}>
              <polygon points={s.pts} fill={s.fill} />
            </g>
          </motion.g>
        );
      })}
      <motion.path d={`${d}Z`} fill="var(--p3r-cyan)" stroke="var(--p3r-cream)" strokeWidth="8" strokeLinejoin="miter" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        initial={anim ? { scale: 0.4, opacity: 0 } : false} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 320, damping: 20 }} />
    </svg>
  );
};

/** 标签：rose（蓝实底）/ soft（冰白底）/ ink（墨底）/ lilac / coral / outline；slant=斜切（默认） */
export type TagTone = 'rose' | 'soft' | 'ink' | 'lilac' | 'coral' | 'gold' | 'outline';
export const P3Tag = ({ children, tone = 'soft', slant = true, className, onRemove }: { children: ReactNode; tone?: TagTone; slant?: boolean; className?: string; onRemove?: () => void }) => {
  const skin: Record<TagTone, CSSProperties> = {
    rose: { background: P3R.blue, color: P3R.onBlue },
    soft: { background: 'var(--p3r-chip)', color: P3R.ink },
    ink: { background: P3R.ink, color: 'var(--p3r-on-ink)' },
    lilac: { background: P3R.cyan, color: 'var(--p3r-mulberry)' },
    coral: { background: P3R.magenta, color: '#fff' },
    gold: { background: P3R.gold, color: 'var(--p3r-mulberry)' },
    outline: { background: 'transparent', color: P3R.roseInk, boxShadow: 'inset 0 0 0 1.5px var(--p3r-blue)' },
  };
  return (
    <span className={cx('inline-flex max-w-full shrink-0 items-center gap-1 whitespace-nowrap px-2.5 py-[3px] text-[11px] font-black leading-[14px]', className)}
      style={{ ...(slant ? { clipPath: slantClip(5) } : {}), ...skin[tone] }}>
      <span className="min-w-0 truncate">{children}</span>
      {onRemove && <button type="button" aria-label="移除" onClick={onRemove} className="-mr-1 px-0.5 opacity-70 hover:opacity-100">×</button>}
    </span>
  );
};

/** 头像：切角方框（P3R 队伍头像）；src 缺省显示首字；ring=蓝描边 */
export const P3Avatar = ({ src, name = '', size = 44, ring = false, className, tone = 'rose' }: { src?: string; name?: string; size?: number; ring?: boolean; className?: string; tone?: 'rose' | 'lilac' | 'ink' }) => {
  const bg = tone === 'lilac' ? P3R.cyan : tone === 'ink' ? P3R.ink : P3R.blue;
  const clip = chamferClip(Math.round(size * 0.22), Math.round(size * 0.22));
  return (
    <span className={cx('relative inline-block shrink-0', className)} style={{ width: size, height: size }}>
      {ring && <span aria-hidden className="absolute -inset-[3px]" style={{ background: P3R.blue, clipPath: clip }} />}
      <span className="absolute inset-0 flex items-center justify-center overflow-hidden font-heavy" style={{ clipPath: clip, background: src ? P3R.panel : bg, color: tone === 'lilac' ? 'var(--p3r-mulberry)' : 'var(--p3r-on-blue)', fontSize: size * 0.42 }}>
        {src ? <img src={src} alt={name} className="h-full w-full object-cover" /> : <span className="not-italic">{name.slice(0, 1) || '?'}</span>}
      </span>
    </span>
  );
};

/**
 * 进度：bar（P3R HP/SP 下划线条，scaleX 动画）/ segments（Rank 分段）/ ring（圆环）
 *   <P3Progress value={0.6} />  <P3Progress variant="segments" value={7} max={10} />  <P3Progress variant="ring" value={0.4} size={56} label="40%" />
 */
export const P3Progress = ({ value, max = 1, variant = 'bar', color, className, size = 56, label, thick = 4 }: {
  value: number; max?: number; variant?: 'bar' | 'segments' | 'ring'; color?: string; className?: string; size?: number; label?: ReactNode; thick?: number;
}) => {
  const anim = useBoldness();
  const r = Math.max(0, Math.min(1, value / max));
  const c = color ?? P3R.blue;
  if (variant === 'segments') {
    return (
      <span className={cx('flex min-w-0 gap-[3px]', className)} role="progressbar" aria-valuenow={value} aria-valuemax={max}>
        {Array.from({ length: max }).map((_, i) => (
          <motion.span key={i} className="h-[7px] min-w-0 flex-1" style={{ background: i < value ? c : 'var(--p3r-track)', clipPath: slantClip(3), originX: 0 }}
            initial={anim ? { scaleX: 0 } : false} animate={{ scaleX: 1 }} transition={{ delay: 0.02 * i, duration: 0.2 }} />
        ))}
      </span>
    );
  }
  if (variant === 'ring') {
    const R = (size - 8) / 2, L = 2 * Math.PI * R;
    return (
      <span className={cx('relative inline-flex shrink-0 items-center justify-center', className)} style={{ width: size, height: size }} role="progressbar" aria-valuenow={Math.round(r * 100)}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="var(--p3r-track)" strokeWidth={5} />
          <motion.circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke={c} strokeWidth={5} strokeDasharray={L}
            initial={anim ? { strokeDashoffset: L } : false} animate={{ strokeDashoffset: L * (1 - r) }} transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }} />
        </svg>
        {label !== undefined && <span className="absolute font-cond text-[13px]" style={{ color: P3R.ink }}>{label}</span>}
      </span>
    );
  }
  return (
    <span className={cx('relative block overflow-hidden', className)} style={{ height: thick, background: 'var(--p3r-track)' }} role="progressbar" aria-valuenow={Math.round(r * 100)}>
      <motion.span className="absolute inset-y-0 left-0 w-full origin-left" style={{ background: c }}
        initial={anim ? { scaleX: 0 } : false} animate={{ scaleX: r }} transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }} />
    </span>
  );
};
