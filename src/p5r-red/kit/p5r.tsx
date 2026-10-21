/**
 * 真实仓库红频道 kit 对位（迁移自 /workspace/work/ptd/src/components/p5r/kit.tsx，几何与时序逐字沿用）。
 * 颜色：P5R 常量改指向 v3 已验收色板（--red / --p5r-paper / #111 …），日夜随 [data-p5r-mode] 切换。
 * 首页 DashboardP5 / 菜单 Menu 的 p5 分支、各 *P5.tsx 组件迁移时直接用这些件（名字与真实一致，接入时换回真实 import 即可）。
 *   roughQuad / roughSlant / roughBanner / roughOct / starPts / jitterStarPts  —— 形状
 *   P5Panel  纸卡面板（影/keyline/框/面 四层）       P5Star  实心星（ring/ring2 贴纸叠层）
 *   P5StarFab 星形 FAB 底   P5StarOutline 空心星   P5Burst 多尖爆炸星   P5Sparkle 四芒闪   P5Dots 网点补丁
 *   P5Collage 剪报瓷砖大标题（tiles）   P5CollageTitle 中文串自动瓷砖标题（表单/弹窗顶）   P5SubBar 黑条副标
 *   P5Wedge 楔形节标   P5Chip 小徽章片   P5Rough 不规则块底三层   P5Btn 大按钮   P5Slab 红斜块装饰
 */
import type { CSSProperties, ReactNode } from 'react';
import { motion } from 'motion/react';
import { useLowMotion } from '@/p5r-red/lib/prefs';

export const P5R = {
  red: 'var(--red)', redDeep: 'var(--red-deep)', redHot: 'var(--red)', ink: '#111111', panel: '#141414',
  paper: 'var(--p5r-paper)', paperDim: '#dcd4c4', grey: '#6b6862', greyLight: '#9b9791', orange: '#e06808', yellow: '#fbfe3c', white: '#FBF7EF',
} as const;
export const P5_FONT = 'var(--f-body)';
export const P5_TITLE_FONT = 'var(--f-title)';

const mulberry = (seed: number) => {
  let a = (Math.round(seed * 1000) ^ 0x9e3779b9) >>> 0 || 1;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
};
export const roughQuad = (seed: number, jag = 7): string => { const r = mulberry(seed); const j = () => (r() * jag).toFixed(1); return `polygon(${j()}px ${j()}px, calc(100% - ${j()}px) ${j()}px, calc(100% - ${j()}px) calc(100% - ${j()}px), ${j()}px calc(100% - ${j()}px))`; };
export const roughSlant = (seed: number, slant = 14, jag = 3): string => { const r = mulberry(seed + 0.77); const j = () => (r() * jag).toFixed(1); const s = () => (slant + r() * jag).toFixed(1); return `polygon(${s()}px ${j()}px, calc(100% - ${j()}px) ${j()}px, calc(100% - ${s()}px) calc(100% - ${j()}px), ${j()}px calc(100% - ${j()}px))`; };
export const roughBanner = (seed: number): string => { const r = mulberry(seed); const j = (amp: number) => (r() * amp).toFixed(1); return `polygon(${j(14)}px ${j(8)}px, 40% ${j(5)}px, calc(100% - ${j(16)}px) ${j(8)}px, calc(100% - ${j(6)}px) calc(50% + ${j(8)}px), calc(100% - ${j(18)}px) calc(100% - ${j(8)}px), 55% calc(100% - ${j(5)}px), ${j(16)}px calc(100% - ${j(9)}px), ${j(5)}px calc(50% - ${j(8)}px))`; };
export const roughOct = (seed: number, jag = 10): string => { const r = mulberry(seed + 0.5); const j = () => (r() * jag).toFixed(1); return `polygon(${j()}px ${j()}px, 50% ${(r() * jag * 0.6).toFixed(1)}px, calc(100% - ${j()}px) ${j()}px, calc(100% - ${(r() * jag * 0.6).toFixed(1)}px) 50%, calc(100% - ${j()}px) calc(100% - ${j()}px), 50% calc(100% - ${(r() * jag * 0.6).toFixed(1)}px), ${j()}px calc(100% - ${j()}px), ${(r() * jag * 0.6).toFixed(1)}px 50%)`; };

export const starPts = (cx: number, cy: number, R: number, rot = -90, innerRatio = 0.42): string => {
  const pts: string[] = [];
  for (let i = 0; i < 5; i++) { const a = ((rot + i * 72) * Math.PI) / 180, b = ((rot + i * 72 + 36) * Math.PI) / 180; pts.push(`${(cx + R * Math.cos(a)).toFixed(1)},${(cy + R * Math.sin(a)).toFixed(1)}`); pts.push(`${(cx + R * innerRatio * Math.cos(b)).toFixed(1)},${(cy + R * innerRatio * Math.sin(b)).toFixed(1)}`); }
  return pts.join(' ');
};
export const jitterStarPts = (cx: number, cy: number, R: number, seed: number, jag = 0.08, rot = -90, innerRatio = 0.42): string => {
  const rnd = mulberry(seed); const pts: string[] = [];
  for (let i = 0; i < 5; i++) { const a = ((rot + i * 72) * Math.PI) / 180, b = ((rot + i * 72 + 36) * Math.PI) / 180; const ro = R * (1 + (rnd() - 0.5) * 2 * jag), ri = R * innerRatio * (1 + (rnd() - 0.5) * 2 * jag); pts.push(`${(cx + ro * Math.cos(a)).toFixed(1)},${(cy + ro * Math.sin(a)).toFixed(1)}`); pts.push(`${(cx + ri * Math.cos(b)).toFixed(1)},${(cy + ri * Math.sin(b)).toFixed(1)}`); }
  return pts.join(' ');
};

export interface P5PanelProps { seed?: number; jag?: number; frame?: number; keyline?: number; face?: string; frameColor?: string; keylineColor?: string; shadow?: { x: number; y: number; color?: string } | null; rot?: number; className?: string; bodyClassName?: string; style?: CSSProperties; bodyStyle?: CSSProperties; children?: ReactNode }
export const P5Panel = ({ seed = 1, jag = 6, frame = 3, keyline = 0, face = P5R.paper, frameColor = P5R.ink, keylineColor = P5R.paper, shadow = { x: 5, y: 6 }, rot = 0, className, bodyClassName, style, bodyStyle, children }: P5PanelProps) => (
  <div className={`relative ${className ?? ''}`} style={{ transform: rot ? `rotate(${rot}deg)` : undefined, ...style }}>
    {shadow && <div aria-hidden className="pointer-events-none absolute inset-0" style={{ transform: `translate(${shadow.x}px, ${shadow.y}px)`, background: shadow.color ?? P5R.ink, clipPath: roughQuad(seed + 0.13, jag + 2) }} />}
    {keyline > 0 && <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: keylineColor, clipPath: roughQuad(seed + 0.29, jag) }} />}
    <div aria-hidden className="pointer-events-none absolute" style={{ inset: keyline, background: frameColor, clipPath: roughQuad(seed + 0.41, jag) }} />
    <div aria-hidden className="pointer-events-none absolute" style={{ inset: keyline + frame, background: face, clipPath: roughQuad(seed + 0.57, Math.max(2, jag - 2)) }} />
    <div className={`relative ${bodyClassName ?? ''}`} style={bodyStyle}>{children}</div>
  </div>
);

export const P5Star = ({ size = 24, fill = P5R.red, ring, ring2, rot = 0, className, style }: { size?: number; fill?: string; ring?: string; ring2?: string; rot?: number; className?: string; style?: CSSProperties }) => (
  <svg viewBox="0 0 100 100" width={size} height={size} className={className} style={{ transform: rot ? `rotate(${rot}deg)` : undefined, ...style }} aria-hidden>
    {ring2 && <polygon points={starPts(50, 50, 50)} fill={ring2} />}
    {ring && <polygon points={starPts(50, 50, ring2 ? 41 : 50)} fill={ring} />}
    <polygon points={starPts(50, 50, ring2 ? 32 : ring ? 40 : 50)} fill={fill} />
  </svg>
);
export const P5StarFab = ({ face = P5R.red, seed = 4 }: { face?: string; seed?: number }) => (
  <span aria-hidden className="pointer-events-none absolute inset-0">
    <svg viewBox="0 0 100 100" className="h-full w-full" style={{ overflow: 'visible' }}>
      <polygon points={jitterStarPts(50, 54.4, 46, seed, 0.045, -90, 0.55)} fill={P5R.ink} transform="translate(4,4.5)" />
      <polygon points={jitterStarPts(50, 54.4, 46, seed, 0.045, -90, 0.55)} fill={P5R.paper} />
      <polygon points={starPts(50, 54.4, 40, -90, 0.55)} fill={face} />
    </svg>
  </span>
);
export const P5StarOutline = ({ size = 24, color = P5R.paper, width = 7, className, style, rot = 0 }: { size?: number; color?: string; width?: number; className?: string; style?: CSSProperties; rot?: number }) => (
  <svg viewBox="0 0 100 100" width={size} height={size} className={className} style={{ overflow: 'visible', transform: rot ? `rotate(${rot}deg)` : undefined, ...style }} aria-hidden>
    <polygon points={starPts(50, 50, 46)} fill="none" stroke={color} strokeWidth={width} strokeLinejoin="miter" />
  </svg>
);
export const P5Burst = ({ size = 60, points = 9, fill = P5R.red, ring, seed = 3, className, style }: { size?: number; points?: number; fill?: string; ring?: string; seed?: number; className?: string; style?: CSSProperties }) => {
  const r = mulberry(seed);
  const pts: string[] = [];
  for (let i = 0; i < points; i++) { const a = ((-90 + (i * 360) / points) * Math.PI) / 180, b = ((-90 + (i * 360) / points + 180 / points) * Math.PI) / 180; const ro = 50 * (0.72 + r() * 0.28), ri = 50 * (0.3 + r() * 0.14); pts.push(`${(50 + ro * Math.cos(a)).toFixed(1)},${(50 + ro * Math.sin(a)).toFixed(1)}`); pts.push(`${(50 + ri * Math.cos(b)).toFixed(1)},${(50 + ri * Math.sin(b)).toFixed(1)}`); }
  const outer = pts.join(' ');
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} style={style} aria-hidden>
      {ring && <polygon points={outer} fill="none" stroke={ring} strokeWidth={7} strokeLinejoin="miter" />}
      <polygon points={outer} fill={fill} transform={ring ? 'translate(50 50) scale(0.86) translate(-50 -50)' : undefined} />
    </svg>
  );
};
export const P5Sparkle = ({ size = 14, color = P5R.red, className, style }: { size?: number; color?: string; className?: string; style?: CSSProperties }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} style={style} aria-hidden><path d="M12 0 L14.6 9.4 L24 12 L14.6 14.6 L12 24 L9.4 14.6 L0 12 L9.4 9.4 Z" fill={color} /></svg>
);
export const P5Dots = ({ className, style, dot = 1.6, gap = 9, color = '#6e6a62' }: { className?: string; style?: CSSProperties; dot?: number; gap?: number; color?: string }) => (
  <div aria-hidden className={`pointer-events-none ${className ?? ''}`} style={{ backgroundImage: `radial-gradient(circle, ${color} ${dot}px, transparent ${dot + 0.4}px)`, backgroundSize: `${gap}px ${gap}px`, ...style }} />
);

export interface CollageTile { ch: string; bg?: string; fg?: string; scale?: number; rot?: number; dy?: number }
const TILE_DEFAULTS = [{ bg: P5R.red, fg: P5R.ink }, { bg: P5R.paper, fg: P5R.ink }, { bg: P5R.paper, fg: P5R.grey }, { bg: P5R.ink, fg: P5R.greyLight }];
const TILE_ROT = [-3.5, 2.5, -2, 3.2, -2.6, 2], TILE_DY = [0, 7, 2, 9, 4, 8];
/** 勒索信剪报标题：每字一块瓷砖。入场：spring 520/26 依次砸落（间隔 .06）；低动效静态。 */
export const P5Collage = ({ tiles, size = 52, gap = 5, className, delay = 0 }: { tiles: CollageTile[]; size?: number; gap?: number; className?: string; delay?: number }) => {
  const low = useLowMotion();
  return (
    <div className={`flex items-start ${className ?? ''}`} style={{ gap }}>
      {tiles.map((t, i) => {
        const d = TILE_DEFAULTS[i % TILE_DEFAULTS.length], s = size * (t.scale ?? 1), rot = t.rot ?? TILE_ROT[i % TILE_ROT.length];
        return (
          <motion.span key={`${t.ch}-${i}`} className="inline-flex shrink-0 select-none items-center justify-center font-black"
            initial={low ? false : { scale: 1.7, opacity: 0, rotate: rot * 3 }} animate={{ scale: 1, opacity: 1, rotate: rot }}
            transition={{ type: 'spring', stiffness: 520, damping: 26, delay: delay + i * 0.06 }}
            style={{ width: s * 1.24, height: s * 1.24, marginTop: t.dy ?? TILE_DY[i % TILE_DY.length], fontSize: s, lineHeight: 1, fontFamily: P5_TITLE_FONT, background: t.bg ?? d.bg, color: t.fg ?? d.fg, border: `3px solid ${P5R.ink}`, boxShadow: `0 0 0 3px ${P5R.paper}, 6px 7px 0 #000000` }}>
            {t.ch}
          </motion.span>
        );
      })}
    </div>
  );
};
const TITLE_CYCLE = [{ bg: P5R.paper, fg: P5R.red }, { bg: P5R.paper, fg: P5R.ink }, { bg: P5R.red, fg: P5R.white }, { bg: P5R.ink, fg: P5R.white }, { bg: P5R.greyLight, fg: P5R.ink }];
const TITLE_ROT = [-3.5, 2.4, -2, 3, -2.8, 1.8, -3.2, 2.6], TITLE_DY = [0, 6, 2, 7, 3, 5, 1, 6];
/** 中文串 → 剪报瓷砖标题（纸红/纸黑/红白/黑白/灰黑 循环 + 尾红星），表单/弹窗顶统一制式 */
export const P5CollageTitle = ({ text, size = 30, star = true, className }: { text: string; size?: number; star?: boolean; className?: string }) => {
  const low = useLowMotion();
  const chars = Array.from(text.trim()); let k = 0;
  return (
    <span className={`flex flex-wrap items-start gap-[3px] ${className ?? ''}`} aria-hidden>
      {chars.map((ch, i) => {
        if (/[\s·、，。：；（）()「」【】…—-]/.test(ch)) return <span key={i} className="inline-block font-black" style={{ fontSize: size * 0.9, lineHeight: 1.2, marginTop: 6, color: P5R.ink, fontFamily: P5_TITLE_FONT }}>{ch === ' ' ? '\u00a0' : ch}</span>;
        const c = TITLE_CYCLE[k % 5], rot = TITLE_ROT[k % 8], dy = TITLE_DY[k % 8]; k++;
        return (
          <motion.span key={i} className="inline-flex shrink-0 select-none items-center justify-center font-black"
            initial={low ? false : { scale: 1.5, opacity: 0, rotate: rot * 3 }} animate={{ scale: 1, opacity: 1, rotate: rot }} transition={{ type: 'spring', stiffness: 520, damping: 26, delay: i * 0.045 }}
            style={{ width: size * 1.2, height: size * 1.2, marginTop: dy, fontSize: size, lineHeight: 1, fontFamily: P5_TITLE_FONT, background: c.bg, color: c.fg, border: `2.5px solid ${P5R.ink}`, boxShadow: `0 0 0 2.5px ${P5R.paper}, 4px 5px 0 ${P5R.ink}` }}>{ch}</motion.span>
        );
      })}
      {star && (
        <motion.span className="ml-1 shrink-0" style={{ marginTop: size * 0.18 }} initial={low ? false : { scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: -10 }} transition={{ type: 'spring', stiffness: 480, damping: 20, delay: chars.length * 0.045 }}>
          <P5Star size={size * 0.62} fill={P5R.red} ring2={P5R.paper} />
        </motion.span>
      )}
    </span>
  );
};
export const P5SubBar = ({ segs, star = true, rot = -1.6, className }: { segs: Array<{ t: string; c?: string }>; star?: boolean; rot?: number; className?: string }) => (
  <div className={`inline-flex select-none items-center gap-2 px-3.5 py-1 ${className ?? ''}`} style={{ background: P5R.ink, transform: `rotate(${rot}deg)`, boxShadow: `0 0 0 2.5px ${P5R.paper}, 5px 5px 0 #000000` }}>
    {segs.map((s, i) => <span key={i} className="text-[17px] font-black leading-none tracking-[0.14em]" style={{ color: s.c ?? P5R.white, fontFamily: P5_TITLE_FONT }}>{s.t}</span>)}
    {star && <svg viewBox="0 0 100 100" width={15} height={15} aria-hidden><polygon points={starPts(50, 50, 46)} fill="none" stroke={P5R.white} strokeWidth={10} strokeLinejoin="miter" /></svg>}
  </div>
);
export const P5Wedge = ({ children, star = true, starSide = 'right', tone = 'ink', rot = -1.2, keyline = true, className, style }: { children: ReactNode; star?: boolean; starSide?: 'left' | 'right'; tone?: 'ink' | 'paper' | 'red'; rot?: number; keyline?: boolean; className?: string; style?: CSSProperties }) => {
  const bg = tone === 'ink' ? P5R.ink : tone === 'red' ? P5R.red : P5R.paper, fg = tone === 'paper' ? P5R.ink : P5R.white;
  const wedge = 'polygon(0 0, 100% 0, calc(100% - 16px) 100%, 0 100%)';
  const starEl = star ? <P5Star size={15} fill={fg} className="shrink-0" /> : null;
  return (
    <div className={`relative inline-block ${className ?? ''}`} style={{ transform: `rotate(${rot}deg)`, ...style }}>
      {keyline && <span aria-hidden className="absolute -inset-[2.5px]" style={{ background: tone === 'paper' ? P5R.ink : P5R.paper, clipPath: wedge }} />}
      <span className="relative flex items-center gap-2 py-1.5 pl-4 pr-8" style={{ background: bg, clipPath: wedge }}>
        {starSide === 'left' && starEl}<span className="text-[19px] font-black leading-none tracking-wide" style={{ color: fg, fontFamily: P5_TITLE_FONT }}>{children}</span>{starSide === 'right' && starEl}
      </span>
    </div>
  );
};
export const P5Chip = ({ children, tone = 'red', rot = 0, className, style, onClick, ariaLabel }: { children: ReactNode; tone?: 'red' | 'ink' | 'paper'; rot?: number; className?: string; style?: CSSProperties; onClick?: () => void; ariaLabel?: string }) => {
  const skin: Record<string, CSSProperties> = { red: { background: P5R.red, color: P5R.white, boxShadow: `2px 2.5px 0 ${P5R.ink}` }, ink: { background: P5R.ink, color: P5R.white, boxShadow: `2px 2.5px 0 ${P5R.grey}` }, paper: { background: P5R.paper, color: P5R.ink, boxShadow: `2px 2.5px 0 ${P5R.ink}` } };
  const cls = `inline-flex select-none items-center gap-1 px-2.5 py-1 text-[13px] font-black leading-none ${className ?? ''}`;
  const st: CSSProperties = { clipPath: 'polygon(3px 0, 100% 1px, calc(100% - 3px) 100%, 0 calc(100% - 2px))', transform: rot ? `rotate(${rot}deg)` : undefined, fontFamily: P5_TITLE_FONT, ...skin[tone], ...style };
  return onClick ? <motion.button type="button" whileTap={{ scale: 0.94 }} onClick={onClick} aria-label={ariaLabel} className={`${cls} cursor-pointer`} style={st}>{children}</motion.button> : <span className={cls} style={st}>{children}</span>;
};
export const P5Rough = ({ seed, jag = 6, frame = 3, face = P5R.paper, frameColor = P5R.ink, shadow = { x: 3, y: 4 }, shadowColor, className }: { seed: number; jag?: number; frame?: number; face?: string; frameColor?: string; shadow?: { x: number; y: number } | null; shadowColor?: string; className?: string }) => (
  <span aria-hidden className={`pointer-events-none absolute inset-0 ${className ?? ''}`}>
    {shadow && <span className="absolute inset-0" style={{ transform: `translate(${shadow.x}px, ${shadow.y}px)`, background: shadowColor ?? P5R.ink, clipPath: roughQuad(seed + 0.13, jag + 1.5) }} />}
    <span className="absolute inset-0" style={{ background: frameColor, clipPath: roughQuad(seed + 0.29, jag) }} />
    <span className="absolute" style={{ inset: frame, background: face, clipPath: roughQuad(seed + 0.47, Math.max(2, jag - 2)) }} />
  </span>
);
export const P5Btn = ({ children, tone = 'red', seed = 9, onClick, disabled = false, className, bodyClassName, ariaLabel, rot = 0 }: { children: ReactNode; tone?: 'red' | 'paper' | 'ink'; seed?: number; onClick?: () => void; disabled?: boolean; className?: string; bodyClassName?: string; ariaLabel?: string; rot?: number }) => {
  const face = tone === 'red' ? P5R.red : tone === 'ink' ? P5R.ink : P5R.paper, fg = tone === 'paper' ? P5R.ink : P5R.white;
  return (
    <motion.button type="button" whileTap={disabled ? undefined : { x: 3, y: 4 }} onClick={onClick} disabled={disabled} aria-label={ariaLabel} className={`relative cursor-pointer select-none disabled:cursor-not-allowed disabled:opacity-40 ${className ?? ''}`} style={{ rotate: rot }}>
      <span aria-hidden className="pointer-events-none absolute inset-0" style={{ transform: 'translate(4px, 5px)', background: P5R.ink, clipPath: roughQuad(seed + 0.13, 7) }} />
      <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: P5R.paper, clipPath: roughQuad(seed + 0.29, 6) }} />
      <span aria-hidden className="pointer-events-none absolute inset-[2.5px]" style={{ background: P5R.ink, clipPath: roughQuad(seed + 0.41, 5) }} />
      <span aria-hidden className="pointer-events-none absolute inset-[5.5px]" style={{ background: face, clipPath: roughQuad(seed + 0.57, 4) }} />
      <span className={`relative flex items-center justify-center gap-2 px-6 py-3 text-[17px] font-black tracking-wider ${bodyClassName ?? ''}`} style={{ color: fg, fontFamily: P5_TITLE_FONT }}>{children}</span>
    </motion.button>
  );
};
export const P5Slab = ({ color = P5R.red, seed = 5, className, style, rot = 0 }: { color?: string; seed?: number; className?: string; style?: CSSProperties; rot?: number }) => (
  <div aria-hidden className={`pointer-events-none absolute ${className ?? ''}`} style={{ background: color, clipPath: roughOct(seed, 14), transform: rot ? `rotate(${rot}deg)` : undefined, ...style }} />
);
