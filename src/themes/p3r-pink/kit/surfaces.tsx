/**
 * P3R 粉白 kit · 面板与状态 ——
 *   P3PageHeader（页头：返回三角 + 玫红斜块 + 超大黑斜体 + 窄斜体英文 + 藕紫/珊瑚双片；360–390 自动 compact）
 *   P3SlantCard（斜切面板）· P3ChamferCard（切角卡：玫红角 + 双描边）· P3StackSlab（层叠错位斜板）
 *   P3Speech（剧情台词框：圆润不规则底 + 发光描边 + ▼）· P3ListRow（Check Status 队伍行）
 *   P3Empty / P3Loading / P3Error（空 / 加载 / 报错）· P3Lightbox · TarotFace（塔罗牌面：有图用图，无图程序卡面）
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Portal, useEscape, useScrollLock } from './Portal';
import { useBoldness } from '@pink/lib/prefs';
import { useViewportWidth } from '@pink/lib/layout';
import { cx } from '@pink/lib/cx';
import { tarotAsset } from '@pink/lib/asset';
import { P3R, GhostWords, chamferClip, slantClip, tickClip, P3Progress, CondNum } from './base';
import { P3Button } from './controls';

/* ───────────────────────── PageHeader ───────────────────────── */
export interface P3PageHeaderProps {
  title: ReactNode;
  en?: string;
  subtitle?: ReactNode;
  onBack?: () => void;
  /** 标题左侧大玫红斜块（account 页式） */
  lead?: boolean;
  /** 标题右下藕紫 + 珊瑚双片（成就 / 星象页式） */
  ticks?: boolean;
  /** 右侧动作槽（按钮 / 菜单） */
  actions?: ReactNode;
  /** 背景幽灵大字（默认取 en） */
  ghost?: string | false;
  /** compact：'auto'（默认，视口 ≤390 自动）| true | false */
  compact?: boolean | 'auto';
  className?: string;
}
export const P3PageHeader = ({ title, en, subtitle, onBack, lead = true, ticks = true, actions, ghost, compact = 'auto', className }: P3PageHeaderProps) => {
  const anim = useBoldness();
  const vw = useViewportWidth();
  const small = compact === 'auto' ? vw <= 390 : compact;
  const tick = (delay: number) => ({ initial: anim ? { scale: 0, x: -6, opacity: 0 } : (false as const), animate: { scale: 1, x: 0, opacity: 1 }, transition: { type: 'spring' as const, stiffness: 520, damping: 22, delay } });
  const g = ghost === false ? null : (ghost ?? en);
  return (
    <header className={cx('relative mb-5 min-w-0', className)}>
      {g && <GhostWords words={[g]} className="-right-4 -top-6 text-[clamp(64px,22vw,150px)]" style={{ transform: 'rotate(-12deg)' }} />}
      {onBack && (
        <button type="button" onClick={onBack} aria-label="返回" className="relative mb-1 flex h-10 w-10 items-center justify-start focus-visible:outline-none">
          <span aria-hidden className="block h-[15px] w-[13px]" style={{ background: P3R.ink, clipPath: 'polygon(100% 0, 100% 100%, 0 50%)' }} />
        </button>
      )}
      <div className="relative flex min-w-0 items-end gap-2.5">
        {lead && (
          <motion.span aria-hidden className={cx('shrink-0', small ? 'mb-1 h-[32px] w-[20px]' : 'mb-1.5 h-[40px] w-[25px]')} style={{ background: P3R.blue, clipPath: 'polygon(36% 0, 100% 0, 64% 100%, 0 100%)', originY: 0 }}
            initial={anim ? { y: -14, scaleY: 0.4, opacity: 0 } : false} animate={{ y: 0, scaleY: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 460, damping: 26 }} />
        )}
        <div className="min-w-0">
          {en && (
            <motion.div className="truncate font-cond text-[13px] uppercase leading-none tracking-wider" style={{ color: P3R.blue }}
              initial={anim ? { opacity: 0, x: 12 } : false} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.18, duration: 0.25 }}>{en}</motion.div>
          )}
          <motion.h1 className={cx('truncate pr-2 font-heavy leading-[1.02]', small ? 'text-[34px]' : 'text-[clamp(38px,5vw,46px)]')} style={{ color: P3R.ink }}
            initial={anim ? { clipPath: 'inset(-8% 102% -8% -3%)', x: -10 } : false} animate={{ clipPath: 'inset(-8% -8% -12% -3%)', x: 0 }}
            transition={{ duration: 0.42, ease: [0.22, 0.9, 0.3, 1], delay: 0.08 }}>{title}</motion.h1>
        </div>
        {ticks && (
          <span aria-hidden className={cx('flex shrink-0 items-start gap-1', small ? 'mb-2' : 'mb-2.5')}>
            <motion.span className="h-[13px] w-[17px]" style={{ background: P3R.cyan, clipPath: tickClip }} {...tick(0.3)} />
            <motion.span className="mt-[3px] h-[11px] w-[13px]" style={{ background: P3R.magenta, clipPath: tickClip }} {...tick(0.4)} />
          </span>
        )}
        {actions && <div className="mb-1.5 ml-auto flex shrink-0 items-center gap-1.5">{actions}</div>}
      </div>
      {subtitle && <div className="relative mt-2 inline-block max-w-full px-3 py-1 text-[13px] font-bold" style={{ background: P3R.panelGlass, color: P3R.inkSoft, clipPath: slantClip(7) }}><span className="p3r-clamp-2">{subtitle}</span></div>}
    </header>
  );
};

/* ───────────────────────── 面板 ───────────────────────── */
/** 斜切面板（白 / 樱粉 / 墨 / 玫红），P3R 斜卡 / 分组壳 */
export const P3SlantCard = ({ children, tone = 'panel', cut = 14, className, style, padding = 'md', onClick }: { children: ReactNode; tone?: 'panel' | 'glass' | 'blush' | 'ink' | 'rose'; cut?: number; className?: string; style?: CSSProperties; padding?: 'none' | 'sm' | 'md' | 'lg'; onClick?: () => void }) => {
  const bg = { panel: P3R.panel, glass: P3R.panelGlass, blush: P3R.cyanPale, ink: P3R.ink, rose: P3R.blue }[tone];
  const ink = tone === 'ink' ? 'var(--p3r-on-ink)' : tone === 'rose' ? P3R.onBlue : P3R.ink;
  const pad = { none: '', sm: 'px-4 py-3', md: 'px-5 py-4', lg: 'px-6 py-5' }[padding];
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick} className={cx('relative block w-full min-w-0 text-left', pad, onClick && 'active:scale-[0.99]', className)}
      style={{ background: bg, color: ink, clipPath: slantClip(cut), boxShadow: tone === 'panel' ? 'var(--p3r-shadow)' : undefined, ...style }}>
      {children}
    </Tag>
  );
};

/** 切角卡（蓝版「白切角卡 + 蓝角 + 青双描边」→ 奶油白 + 玫红角 + 藕紫错位影 + 玫红描边） */
export const P3ChamferCard = ({ children, className, style, accent = true, double = true, padding = 'md' }: { children: ReactNode; className?: string; style?: CSSProperties; accent?: boolean; double?: boolean; padding?: 'none' | 'sm' | 'md' | 'lg' }) => {
  const pad = { none: '', sm: 'px-4 py-3', md: 'px-5 py-4', lg: 'px-6 py-5' }[padding];
  return (
    <div className={cx('relative min-w-0', className)} style={style}>
      {/* 错位影层不越出自身盒子（避免 390 视口横向溢出）：前层右下让出 5px，影层贴右下 */}
      {double && <div aria-hidden className="absolute bottom-0 left-[5px] right-0 top-[5px]" style={{ clipPath: chamferClip(18, 22), background: 'var(--p3r-slab-back)' }} />}
      <div className="relative" style={{ clipPath: chamferClip(18, 22), background: P3R.blue, padding: 2, marginRight: double ? 5 : 0, marginBottom: double ? 5 : 0 }}>
        <div className={cx('relative min-w-0', pad)} style={{ clipPath: chamferClip(17, 21), background: P3R.panel, color: P3R.ink }}>
          {accent && <span aria-hidden className="absolute left-0 top-0 h-[30px] w-[30px]" style={{ background: P3R.blue, clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />}
          {children}
        </div>
      </div>
    </div>
  );
};

/** 层叠错位斜板（后层 8px 错位 + 可选第三层）：P3R 据点地图 / 作战板 / 结算板 */
export const P3StackSlab = ({ children, layers = 2, back = 'lilac', className, padding = 'md', cut = 18 }: { children: ReactNode; layers?: 2 | 3; back?: 'lilac' | 'rose' | 'ink'; className?: string; padding?: 'none' | 'sm' | 'md' | 'lg'; cut?: number }) => {
  const pad = { none: '', sm: 'px-4 py-3', md: 'px-5 py-4', lg: 'px-6 py-5' }[padding];
  const c1 = back === 'rose' ? P3R.blue : back === 'ink' ? P3R.ink : 'var(--p3r-slab-back)';
  return (
    <div className={cx('relative min-w-0', className)}>
      {/* 错位层全部收在自身盒子内（前层右下让出 8 / 16px），不制造横向溢出 */}
      {layers === 3 && <div aria-hidden className="absolute bottom-0 left-[16px] right-0 top-[14px]" style={{ background: P3R.cyanPale, clipPath: slantClip(cut) }} />}
      <div aria-hidden className="absolute" style={{ left: 8, top: 7, right: layers === 3 ? 8 : 0, bottom: layers === 3 ? 7 : 0, background: c1, clipPath: slantClip(cut) }} />
      <div className={cx('relative min-w-0', pad)} style={{ background: P3R.panel, color: P3R.ink, clipPath: slantClip(cut), marginRight: layers === 3 ? 16 : 8, marginBottom: layers === 3 ? 14 : 7 }}>{children}</div>
    </div>
  );
};

/** 剧情台词框（P3R 台词框 / 领航员通讯）：说话人斜签 + 圆润不规则底 + 发光描边 + 闪烁 ▼ */
export const P3Speech = ({ speaker, children, more = true, side = 'left', className, onClick }: { speaker?: ReactNode; children: ReactNode; more?: boolean; side?: 'left' | 'right'; className?: string; onClick?: () => void }) => (
  <div className={cx('relative min-w-0 pt-3', className)} onClick={onClick}>
    {speaker && (
      <span className={cx('absolute top-0 z-10 px-3 py-1 font-heavy text-[13px]', side === 'left' ? 'left-5' : 'right-5')} style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(6) }}>{speaker}</span>
    )}
    <div className="relative">
      <span aria-hidden className="pk-dialog-shape absolute -inset-[3px]" style={{ background: 'color-mix(in srgb, var(--p3r-blue) 55%, transparent)', boxShadow: '0 0 0 2px color-mix(in srgb, var(--p3r-blue) 22%, transparent), 0 10px 26px color-mix(in srgb, var(--p3r-blue) 22%, transparent)' }} />
      <div className="pk-dialog-shape relative px-7 py-5 text-[15px] font-bold leading-relaxed" style={{ background: P3R.panel, color: P3R.ink }}>
        {children}
        {more && <span aria-hidden className="pk-chev absolute bottom-2 right-8 h-0 w-0 border-x-[6px] border-t-[8px] border-x-transparent" style={{ borderTopColor: P3R.blue }} />}
      </div>
    </div>
  </div>
);

/** Check Status 队伍行：斜切行 + 左色楔 + 标题 / 眉签 + 右侧窄斜体数值 + 下划线条；selected 时墨色斜行 */
export const P3ListRow = ({ title, eyebrow, meta, value, valueLabel, progress, leading, trailing, selected, onClick, accent, className }: {
  title: ReactNode; eyebrow?: ReactNode; meta?: ReactNode; value?: ReactNode; valueLabel?: string; progress?: number; leading?: ReactNode; trailing?: ReactNode | 'chevron'; selected?: boolean; onClick?: () => void; accent?: string; className?: string;
}) => {
  const Tag = onClick ? 'button' : 'div';
  const ink = selected ? 'var(--p3r-on-ink)' : P3R.ink;
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick} className={cx('relative flex w-full min-w-0 items-center gap-3 py-2.5 pl-5 pr-4 text-left', onClick && 'active:scale-[0.99]', className)}>
      <span aria-hidden className="absolute inset-0" style={{ background: selected ? P3R.ink : 'var(--p3r-row)', clipPath: slantClip(10) }} />
      <span aria-hidden className="absolute bottom-0 left-0 top-0 w-[9px]" style={{ background: accent ?? P3R.blue, clipPath: 'polygon(0 0, 100% 0, 30% 100%, 0 100%)' }} />
      {leading && <span className="relative shrink-0">{leading}</span>}
      <span className="relative min-w-0 flex-1">
        {eyebrow && <span className="block truncate font-cond text-[11px] uppercase" style={{ color: selected ? P3R.blue : P3R.grey }}>{eyebrow}</span>}
        <span className="block truncate text-[15px] font-black" style={{ color: ink }}>{title}</span>
        {meta && <span className="block truncate text-[12px]" style={{ color: selected ? 'color-mix(in srgb, var(--p3r-on-ink) 70%, transparent)' : P3R.grey }}>{meta}</span>}
        {progress !== undefined && <P3Progress value={progress} className="mt-1.5 max-w-[220px]" thick={3} />}
      </span>
      {value !== undefined && <CondNum value={value} label={valueLabel} size={24} className="relative shrink-0" color={selected ? 'var(--p3r-on-ink)' : undefined} />}
      {trailing && <span className="relative shrink-0" style={{ color: selected ? P3R.blue : P3R.grey }}>{trailing === 'chevron' ? <span aria-hidden className="block h-[12px] w-[10px]" style={{ background: 'currentColor', clipPath: 'polygon(0 0, 100% 50%, 0 100%)' }} /> : trailing}</span>}
    </Tag>
  );
};

/* ───────────────────────── 状态 ───────────────────────── */
/** 空态板：樱粉大平行四边形 + 居中提示（真实 P3EmptySlab「暂无可追踪的信号」） */
export const P3Empty = ({ text = '暂无可追踪的信号', sub, action, className, ghost = 'EMPTY' }: { text?: ReactNode; sub?: ReactNode; action?: ReactNode; className?: string; ghost?: string | false }) => (
  <div className={cx('relative flex min-h-[168px] flex-col items-center justify-center gap-2 overflow-hidden px-6 py-6 text-center', className)} style={{ clipPath: slantClip(26), background: 'rgb(var(--p3r-wash) / 0.72)' }}>
    {ghost && <GhostWords words={[ghost]} className="left-2 top-2 text-[64px]" />}
    <span className="relative text-[16px] font-black" style={{ color: P3R.ink }}>{text}</span>
    {sub && <span className="relative max-w-[30ch] text-[13px]" style={{ color: P3R.grey }}>{sub}</span>}
    {action && <div className="relative mt-2">{action}</div>}
  </div>
);

/** 加载：三枚斜片依次起伏 + 文案（P3R「NOW LOADING」）；block=占位骨架行 */
export const P3Loading = ({ text = '正在接入信号…', block = false, rows = 3, className }: { text?: ReactNode; block?: boolean; rows?: number; className?: string }) => {
  if (block) {
    return (
      <div className={cx('flex min-w-0 flex-col gap-2', className)} aria-busy="true">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="relative h-12 overflow-hidden" style={{ background: 'var(--p3r-row)', clipPath: slantClip(10) }}>
            <span aria-hidden className="pk-shimmer absolute inset-y-0 w-1/2" style={{ background: 'linear-gradient(90deg, transparent, rgb(var(--p3r-wash) / 0.9), transparent)', animationDelay: `${i * 0.12}s` }} />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className={cx('flex flex-col items-center gap-3 py-8', className)} role="status" aria-live="polite">
      <span className="pk-think flex items-end gap-1.5" aria-hidden>
        {[P3R.blue, P3R.cyan, P3R.magenta].map((c, i) => <i key={i} className="block h-[16px] w-[12px]" style={{ background: c, clipPath: tickClip }} />)}
      </span>
      <span className="font-cond text-[12px] tracking-[0.3em]" style={{ color: P3R.blue }}>NOW LOADING</span>
      <span className="text-[13px] font-bold" style={{ color: P3R.inkSoft }}>{text}</span>
    </div>
  );
};

/** 报错：珊瑚斜条「SIGNAL LOST」+ 文案 + 重试 */
export const P3Error = ({ title = '信号中断', text, onRetry, retryText = '重试', className, extra }: { title?: ReactNode; text?: ReactNode; onRetry?: () => void; retryText?: ReactNode; className?: string; extra?: ReactNode }) => (
  <div className={cx('relative flex min-h-[168px] flex-col items-center justify-center gap-2 overflow-hidden px-6 py-6 text-center', className)} style={{ clipPath: slantClip(26), background: P3R.panel }}>
    <span aria-hidden className="absolute -left-6 top-4 h-6 w-[120%] -rotate-[8deg]" style={{ background: P3R.magenta, opacity: 0.85 }} />
    <span className="relative -mt-1 mb-2 font-cond text-[12px] tracking-[0.3em]" style={{ color: '#fff' }}>SIGNAL LOST</span>
    <span className="relative text-[17px] font-black" style={{ color: P3R.ink }}>{title}</span>
    {text && <span className="relative max-w-[34ch] text-[13px]" style={{ color: P3R.inkSoft }}>{text}</span>}
    <div className="relative mt-2 flex flex-wrap justify-center gap-2">
      {onRetry && <P3Button size="sm" onClick={onRetry}>{retryText}</P3Button>}
      {extra}
    </div>
  </div>
);

/* ───────────────────────── Lightbox ───────────────────────── */
export const P3Lightbox = ({ open, onClose, images, index = 0, captions }: { open: boolean; onClose: () => void; images: string[]; index?: number; captions?: ReactNode[] }) => {
  const anim = useBoldness();
  const [i, setI] = useState(index);
  useEffect(() => { if (open) setI(index); }, [open, index]);
  useEscape(open, onClose);
  useScrollLock(open);
  useEffect(() => {
    if (!open) return;
    const on = (e: KeyboardEvent) => { if (e.key === 'ArrowRight') setI((x) => (x + 1) % images.length); if (e.key === 'ArrowLeft') setI((x) => (x - 1 + images.length) % images.length); };
    window.addEventListener('keydown', on); return () => window.removeEventListener('keydown', on);
  }, [open, images.length]);
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 flex flex-col items-center justify-center" style={{ zIndex: 'var(--p3r-z-system)' as unknown as number, background: 'rgba(27, 10, 23, 0.92)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
            <div className="absolute left-4 top-[calc(14px+env(safe-area-inset-top))] font-cond text-[18px]" style={{ color: P3R.cream }}>{i + 1}<span style={{ color: 'var(--p3r-blue)' }}> / </span>{images.length}</div>
            <button type="button" aria-label="关闭" onClick={onClose} className="absolute right-4 top-[calc(10px+env(safe-area-inset-top))] flex h-10 w-10 items-center justify-center text-[20px] font-black" style={{ color: P3R.cream }}>✕</button>
            <motion.img key={i} src={images[i]} alt="" onClick={(e) => e.stopPropagation()} className="max-h-[78vh] max-w-[92vw] object-contain" style={{ clipPath: slantClip(12) }}
              initial={anim ? { opacity: 0, x: 30 } : { opacity: 0 }} animate={{ opacity: 1, x: 0 }} />
            {captions?.[i] && <div className="mt-3 max-w-[92vw] px-4 text-center text-[14px] font-bold" style={{ color: P3R.cream }}>{captions[i]}</div>}
            {images.length > 1 && (
              <div className="mt-4 flex gap-3" onClick={(e) => e.stopPropagation()}>
                <P3Button size="sm" tone="soft" onClick={() => setI((x) => (x - 1 + images.length) % images.length)}>‹ 上一张</P3Button>
                <P3Button size="sm" onClick={() => setI((x) => (x + 1) % images.length)}>下一张 ›</P3Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
};

/* ───────────────────────── 塔罗牌面 ───────────────────────── */
/**
 * 塔罗牌面（粉卡框）：真实 public/assets/tarot/pink/ 78 张全图——小阿卡纳传 src，
 * 大阿卡纳按罗马数自动取图（majorFileOf）；图片加载失败才回落程序卡面。back = 粉卡背。
 *   <TarotFace name="恋人" roman="VI" reversed />   <TarotFace src={tarotAsset('cups_3.webp')} name="圣杯三" />   <TarotFace back />
 */
/** 大阿卡纳 0–XXI → 真实 public/assets/tarot/pink/ 文件名（粉套 78 张全图，含 22 张大阿卡纳） */
const MAJOR_FILES = ['fool', 'magician', 'high_priestess', 'empress', 'emperor', 'hierophant', 'lovers', 'chariot', 'strength', 'hermit', 'wheel_of_fortune', 'justice', 'hanged_man', 'death', 'temperance', 'devil', 'tower', 'star', 'moon', 'sun', 'judgement', 'world'];
const ROMAN_LIST = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'];
const majorFileOf = (roman?: string): string | undefined => { const i = roman ? ROMAN_LIST.indexOf(roman) : -1; return i >= 0 ? `${MAJOR_FILES[i]}.webp` : undefined; };
/** fill：铺满父容器（宽高 100%；width 仍用于字号 / 星形比例） */
export const TarotFace = ({ src, name, roman, en, reversed, back, width = 120, className, glow, fill }: { src?: string; name?: ReactNode; roman?: string; en?: string; reversed?: boolean; back?: boolean; width?: number; className?: string; glow?: boolean; fill?: boolean }) => {
  const [broken, setBroken] = useState(false);
  const h = Math.round(width * 1.66);
  const mf = !src ? majorFileOf(roman) : undefined;
  if (mf) src = tarotAsset(mf);
  const star = (r: number) => Array.from({ length: 16 }).map((_, i) => { const a = (Math.PI / 8) * i - Math.PI / 2; const rr = i % 2 ? r * 0.42 : r; return `${50 + rr * Math.cos(a)},${50 + rr * Math.sin(a)}`; }).join(' ');
  return (
    <span className={cx('relative inline-block shrink-0', className)} style={fill ? { width: '100%', height: '100%' } : { width, height: h }}>
      {glow && <span aria-hidden className="absolute -inset-2" style={{ background: 'color-mix(in srgb, var(--p3r-blue) 30%, transparent)', clipPath: chamferClip(16, 16) }} />}
      <span className="absolute inset-0" style={{ background: P3R.blue, clipPath: chamferClip(12, 12) }} />
      <span className="absolute inset-[3px] overflow-hidden" style={{ clipPath: chamferClip(10, 10), background: back ? 'var(--pk-holo)' : P3R.panel }}>
        {back ? (
          <svg viewBox="0 0 100 100" className="absolute inset-0 m-auto h-[70%] w-[70%]" aria-hidden>
            <circle cx="50" cy="50" r="40" fill="none" stroke="var(--p3r-blue)" strokeWidth="1.5" />
            <circle cx="50" cy="50" r="30" fill="none" stroke="var(--p3r-cyan)" strokeWidth="1" strokeDasharray="2 3" />
            <polygon points={star(34)} fill="var(--p3r-blue)" opacity="0.85" />
            <polygon points={star(14)} fill="var(--p3r-cream)" />
          </svg>
        ) : src && !broken ? (
          <img src={src} alt={typeof name === 'string' ? name : ''} onError={() => setBroken(true)} className="h-full w-full object-cover" style={{ transform: reversed ? 'rotate(180deg)' : undefined }} />
        ) : (
          <span className="absolute inset-0 flex flex-col items-center justify-between py-[10%]" style={{ transform: reversed ? 'rotate(180deg)' : undefined }}>
            <span className="font-cond leading-none" style={{ fontSize: width * 0.2, color: P3R.blue }}>{roman ?? '✦'}</span>
            <svg viewBox="0 0 100 100" style={{ width: width * 0.62, height: width * 0.62 }} aria-hidden>
              <circle cx="50" cy="50" r="44" fill="rgb(var(--p3r-wash) / 0.9)" />
              <polygon points={star(38)} fill="var(--p3r-cyan)" opacity="0.8" />
              <polygon points={star(20)} fill="var(--p3r-blue)" />
            </svg>
            <span className="max-w-[90%] truncate px-1 font-heavy leading-tight" style={{ fontSize: Math.max(11, width * 0.13), color: P3R.ink }}>{name}</span>
            {en && <span className="font-cond uppercase leading-none" style={{ fontSize: Math.max(8, width * 0.075), color: P3R.grey }}>{en}</span>}
          </span>
        )}
      </span>
      {reversed && !back && <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 font-cond text-[10px]" style={{ background: P3R.magenta, color: '#fff', clipPath: slantClip(4) }}>REVERSED</span>}
    </span>
  );
};
