/**
 * P3R 斜切蓝白条带 + 大号倾斜标题 —— 蓝白的形状语言：剃刀直边（无圆角、无燕尾、无扇贝）。
 *   <SlashBands variant="hero|corner|strip" angle={-27} />   平行斜带：蓝主带 + 白带 + 青细线 + 墨色刀口，偶发光片横扫
 *   <TiltTitle text="MIDNIGHT" sub="深夜月光录" tilt={-8} />  超粗窄斜体大标题：整块倾斜、蓝色硬投影错位、左→右裁切入场
 * 父级 relative + overflow-hidden（SlashBands 绝对定位铺满父级）。低动效：TiltTitle 直出、光片不扫。
 */
import { memo, type CSSProperties, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useBoldness, slantClip } from './_env';

export interface SlashBandsProps {
  variant?: 'hero' | 'corner' | 'strip';
  angle?: number;
  className?: string;
  style?: CSSProperties;
  /** 光片横扫（7s 一次） */
  glint?: boolean;
}

export const SlashBands = memo(({ variant = 'hero', angle = -27, className, style, glint = true }: SlashBandsProps) => {
  const band = (top: number | string, h: number, bg: string, extra?: CSSProperties) => (
    <div style={{ position: 'absolute', left: '-30%', width: '160%', top, height: h, background: bg, transform: `rotate(${angle}deg)`, transformOrigin: 'center', ...extra }} />
  );
  return (
    <div aria-hidden className={className} style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', ...style }}>
      {variant === 'hero' && (
        <>
          {band('2%', 104, 'linear-gradient(100deg, var(--p3r-blue) 0%, var(--p3r-blue-deep) 60%, var(--bk-sea-3) 100%)', { boxShadow: '0 -3px 0 var(--p3r-cream)' })}
          {band('calc(2% + 112px)', 26, 'var(--p3r-cream)', { boxShadow: '0 2px 0 var(--p3r-cyan)' })}
          {band('calc(2% + 150px)', 3, 'var(--p3r-cyan)')}
          {band('calc(2% + 162px)', 10, 'var(--p3r-ink)', { opacity: 0.9, clipPath: 'polygon(0 0, 44% 0, 46% 100%, 0 100%)' })}
          {band('calc(2% + 180px)', 2, 'var(--p3r-blue)', { opacity: 0.5 })}
        </>
      )}
      {variant === 'corner' && (
        <>
          <div style={{ position: 'absolute', right: -120, top: -40, width: 360, height: 72, background: 'linear-gradient(100deg, var(--p3r-blue), var(--p3r-blue-deep))', transform: `rotate(${angle}deg)` }} />
          <div style={{ position: 'absolute', right: -90, top: 40, width: 300, height: 14, background: 'var(--p3r-cream)', boxShadow: '0 0 0 1px var(--p3r-cyan-pale)', transform: `rotate(${angle}deg)` }} />
          <div style={{ position: 'absolute', right: -60, top: 64, width: 260, height: 2, background: 'var(--p3r-cyan)', transform: `rotate(${angle}deg)` }} />
        </>
      )}
      {variant === 'strip' && (
        <>
          {band('38%', 54, 'var(--p3r-blue)')}
          {band('calc(38% + 58px)', 8, 'var(--p3r-cream)', { boxShadow: '0 0 0 1px var(--p3r-cyan-pale)' })}
          {/* 红细线上下各夹 1px 墨边：避免红线与群青底抗锯齿混出紫边（截图色彩审计） */}
          {band('calc(38% + 69px)', 4, 'linear-gradient(180deg, #05070f 0 25%, var(--bk-red) 25% 75%, #05070f 75% 100%)')}
        </>
      )}
      {glint && (
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '28%', transform: `rotate(${angle}deg)` }}>
          <div className="bk-glint-sweep" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, var(--p3r-cream), transparent)', opacity: 0.45 }} />
        </div>
      )}
    </div>
  );
});

export interface TiltTitleProps {
  text: ReactNode;
  sub?: ReactNode;
  /** 字号（CSS 长度） */
  size?: string;
  tilt?: number;
  /** 投影色（默认 --p3r-blue；夜间自动绿） */
  shadow?: string;
  /** 主字色（默认 --p3r-ink） */
  color?: string;
  outline?: boolean;
  replayKey?: string | number;
  className?: string;
  style?: CSSProperties;
}

export const TiltTitle = ({ text, sub, size = 'clamp(48px, 15vw, 120px)', tilt = -8, shadow = 'var(--p3r-blue)', color = 'var(--p3r-ink)', outline = false, replayKey, className, style }: TiltTitleProps) => {
  const anim = useBoldness();
  const font: CSSProperties = { fontFamily: 'var(--p3r-font-cond)', fontStyle: 'italic', fontWeight: 800, fontSize: size, lineHeight: 0.86, letterSpacing: '-0.01em', whiteSpace: 'nowrap', textTransform: 'uppercase' };
  return (
    <div key={replayKey} className={className} style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', transform: `rotate(${tilt}deg)`, transformOrigin: 'left bottom', ...style }}>
      <div style={{ position: 'relative' }}>
        {/* 硬投影：同字错位 6px，先于主字 60ms 揭开 */}
        <motion.span aria-hidden style={{ ...font, position: 'absolute', left: '0.06em', top: '0.06em', color: shadow }}
          initial={anim ? { clipPath: 'inset(-20% 102% -20% -4%)' } : false} animate={{ clipPath: 'inset(-20% -6% -20% -4%)' }} transition={{ duration: 0.36, ease: [0.22, 0.9, 0.3, 1] }}>{text}</motion.span>
        <motion.span style={{ ...font, position: 'relative', display: 'block', color: outline ? 'transparent' : color, WebkitTextStroke: outline ? `2px ${color}` : undefined }}
          initial={anim ? { clipPath: 'inset(-20% 102% -20% -4%)' } : false} animate={{ clipPath: 'inset(-20% -6% -20% -4%)' }} transition={{ duration: 0.36, delay: 0.06, ease: [0.22, 0.9, 0.3, 1] }}>{text}</motion.span>
      </div>
      {/* 下划刀口：蓝长条 + 红短刀（P3R 句点） */}
      <motion.div aria-hidden style={{ display: 'flex', gap: 6, marginTop: 6, originX: 0 }} initial={anim ? { scaleX: 0 } : false} animate={{ scaleX: 1 }} transition={{ duration: 0.3, delay: 0.3 }}>
        <span style={{ display: 'block', width: '60%', minWidth: 80, height: 8, background: shadow, clipPath: slantClip(6) }} />
        <span style={{ display: 'block', width: 22, height: 8, background: 'var(--bk-red)', clipPath: slantClip(6) }} />
      </motion.div>
      {sub && (
        <motion.span style={{ marginTop: 8, padding: '3px 12px', background: 'var(--p3r-ink)', color: 'var(--p3r-on-ink)', fontFamily: 'var(--p3r-font-heavy)', fontWeight: 900, fontSize: 'clamp(13px, 3.6vw, 18px)', letterSpacing: '0.3em', clipPath: slantClip(8) }}
          initial={anim ? { opacity: 0, x: -12 } : false} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.38, duration: 0.2 }}>{sub}</motion.span>
      )}
    </div>
  );
};
