/**
 * 弹层基件（迁移自 overlays/a.js 的「基础件」，A 组全部弹层共用；B/C/D 组也可用）：
 *   <P5Layer cls="oa-cf" z={890} onClose={…}>      全屏层 .oa-layer（淡入 160 / 淡出 180；Esc 只关最上层）
 *   <P5OaRough seed jag face frame sh d inset/>      三层粗糙壳（影/框/面），放在 position:relative 元素里当底
 *   <P5OaStar size fill stroke sw rot/>            .oa-star 五角星（viewBox 100）
 *   <P5OaRingStar size/>                             多环巨星（黑/纸/红/纸/黑）
 *   <P5XGlyph s c/>                                硬角 ✕
 *   <P5CloseKey variant="tile|star" onClick/>      关闭键
 *   <P5OaCollage text size/>                         逐字瓷砖标题（纸红/纸黑/红白/黑白/灰黑 循环）
 *   collageSlam(els)                               瓷砖砸落
 * 样式都在 legacy/css/a.css（.oa-*），DOM 与原生一致。
 */
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Portal } from './Portal';
import { shape } from '@/p5r-red/lib/shape';
import { isLowMotion } from '@/p5r-red/lib/prefs';

/* ── Esc 栈：只关最上层 ── */
const stack: { close: () => void; escClose: () => boolean }[] = [];
if (typeof document !== 'undefined') document.addEventListener('keydown', (e) => { if (e.key !== 'Escape' || !stack.length) return; const top = stack[stack.length - 1]; if (top.escClose()) top.close(); });

export interface P5LayerProps { open: boolean; onClose: () => void; cls: string; z?: number; escClose?: boolean; fade?: boolean; children: ReactNode; onBackdrop?: () => void; ariaLabel?: string; className?: string; style?: CSSProperties }
export function P5Layer({ open, onClose, cls, z = 840, escClose = true, fade = true, children, onBackdrop, ariaLabel, style }: P5LayerProps) {
  const [mounted, setMounted] = useState(open);
  const ref = useRef<HTMLDivElement>(null);
  const esc = useRef(escClose); esc.current = escClose;
  const oc = useRef(onClose); oc.current = onClose;
  useEffect(() => { if (open) setMounted(true); }, [open]);
  useLayoutEffect(() => {
    if (!mounted || !open) return;
    if (fade && !isLowMotion()) ref.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, fill: 'backwards' });
    const api = { close: () => oc.current(), escClose: () => esc.current };
    stack.push(api);
    return () => { const i = stack.indexOf(api); if (i >= 0) stack.splice(i, 1); };
  }, [mounted, open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (open || !mounted) return;
    const el = ref.current;
    if (!el || isLowMotion()) { setMounted(false); return; }
    el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'both' }).onfinish = () => setMounted(false);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!mounted) return null;
  return (
    <Portal>
      <div ref={ref} className={`oa-layer ${cls}`} style={{ zIndex: z, ...style }} aria-label={ariaLabel} onClick={(e) => { if (e.target === e.currentTarget) (onBackdrop ?? onClose)(); }}>
        {children}
      </div>
    </Portal>
  );
}

export function P5OaRough({ seed, face = 'var(--red)', frame = '#111', sh = '#111', jag = 4, d = [3, 4], inset = 3 }: { seed: number; face?: string; frame?: string; sh?: string; jag?: number; d?: [number, number]; inset?: number }) {
  const q = shape.quad;
  return (
    <i className="oa-r" aria-hidden="true">
      <i style={{ background: sh, clipPath: q(seed + 11, jag), transform: `translate(${d[0]}px,${d[1]}px)` }} />
      <i style={{ background: frame, clipPath: q(seed, jag) }} />
      <i style={{ background: face, clipPath: q(seed + 5, jag), inset: `${inset}px` }} />
    </i>
  );
}

const starPts = (R0: number, inner?: number) => shape.starPts(50, 52, R0, -90, inner);
export function P5OaStar({ size, fill = 'var(--red)', stroke = '', sw = 0, rot = 0, className = '', style }: { size: number; fill?: string; stroke?: string; sw?: number; rot?: number; className?: string; style?: CSSProperties }) {
  return (
    <svg className={`oa-star ${className}`.trim()} width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" style={{ transform: `rotate(${rot}deg)`, ...style }}>
      <polygon points={starPts(48)} fill={fill} {...(stroke ? { stroke, strokeWidth: sw, strokeLinejoin: 'miter' as const } : {})} />
    </svg>
  );
}
export function P5OaRingStar({ size, className = '' }: { size: number; className?: string }) {
  return <svg className={className || undefined} width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">{([[49, '#111'], [42, 'var(--p5r-paper)'], [34, 'var(--red)'], [24, 'var(--p5r-paper)'], [15, '#111']] as const).map(([r, c]) => <polygon key={r} points={starPts(r)} fill={c} />)}</svg>;
}
export function P5XGlyph({ s = 17, c = '#111' }: { s?: number; c?: string }) {
  return <svg viewBox="0 0 24 24" width={s} height={s} aria-hidden="true"><path d="M4.6 1.8 L12 9.2 L19.4 1.8 L22.2 4.6 L14.8 12 L22.2 19.4 L19.4 22.2 L12 14.8 L4.6 22.2 L1.8 19.4 L9.2 12 L1.8 4.6 Z" fill={c} /></svg>;
}
export function P5CloseKey({ variant = 'tile', className = '', onClick }: { variant?: 'tile' | 'star'; className?: string; onClick?: () => void }) {
  if (variant === 'star') return (
    <button type="button" className={`oa-xk star ${className}`.trim()} aria-label="关闭" onClick={onClick}>
      <svg viewBox="0 0 100 100" aria-hidden="true"><polygon points={starPts(49)} fill="var(--p5r-paper)" /><polygon points={starPts(43)} fill="#111" /></svg><span><P5XGlyph s={18} c="var(--p5r-paper)" /></span>
    </button>
  );
  return (
    <button type="button" className={`oa-xk tile ${className}`.trim()} aria-label="关闭" onClick={onClick}>
      <P5OaRough seed={471} face="var(--p5r-paper)" frame="var(--p5r-paper)" jag={4} /><span className="oa-xk-in"><P5XGlyph s={17} /></span>
    </button>
  );
}

const CYC = [['var(--p5r-paper)', 'var(--red)'], ['var(--p5r-paper)', '#111'], ['var(--red)', '#fbf7ef'], ['#111', '#fbf7ef'], ['#9b9791', '#111']];
const TROT = [-3.5, 2.4, -2, 3, -2.8, 1.8, -3.2, 2.6], TDY = [0, 6, 2, 7, 3, 5, 1, 6];
export function P5OaCollage({ text, size = 40, className = '' }: { text: string; size?: number; className?: string }) {
  let k = 0;
  return (
    <span className={`oa-collage ${className}`.trim()} role="img" aria-label={text} style={{ ['--s' as string]: `${size}px` }}>
      {[...text].map((ch, i) => {
        if (/[\s·、，。：；（）()「」【】…—-]/.test(ch)) return <i key={i} className="oa-cp">{ch === ' ' ? '\u00a0' : ch}</i>;
        const [bg, fg] = CYC[k % 5], r = TROT[k % 8], dy = TDY[k % 8]; k++;
        return <b key={i} className="oa-ct" data-r={r} style={{ background: bg, color: fg, transform: `rotate(${r}deg)`, marginTop: dy }}>{ch}</b>;
      })}
    </span>
  );
}
/** 瓷砖砸落（scale 1.5→1、rotate ×3→1，间隔 45ms）——给 .oa-ct 用 */
export function collageSlam(els: ArrayLike<Element>, gap = 45, delay = 0): void {
  if (isLowMotion()) return;
  Array.from(els).forEach((el, i) => { const r = +((el as HTMLElement).dataset.r || 0); el.animate([{ transform: `rotate(${r * 3}deg) scale(1.5)`, opacity: 0 }, { transform: `rotate(${r}deg) scale(1)`, opacity: 1 }], { duration: 360, delay: delay + i * gap, easing: 'cubic-bezier(.2,1.5,.4,1)', fill: 'backwards' }); });
}
