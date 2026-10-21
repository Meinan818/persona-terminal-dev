/**
 * 跳台噪点闪帧（换台时的雪花一闪）。
 *   <ChannelNoise active={on} onCovered={() => doNavigate()} onDone={() => setOn(false)} />
 *   duration 默认 300ms：0~40% 雪花渐强（onCovered 在全遮时刻触发）→ 彩条/横带一闪 → 淡出。
 * 也可当常驻纹理：<NoiseLayer opacity={0.2} />（静态雪花，动画抖动用 transform steps）。
 * 素材 /assets/p4g/tv-static.webp；缺失时用 SVG feTurbulence 数据 URI 兜底（同样是静态位图，不跑滤镜动画）。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { p4gAsset } from '@yellow/lib/asset';
import { useImageOk } from '@yellow/lib/slots';
import { useLowMotion } from '@yellow/lib/prefs';
import { cx } from '@yellow/lib/cx';

const NOISE_FALLBACK =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.1' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .5 0 0 0 0 .5 0 0 0 0 .5 0 0 0 1.6 -.3'/%3E%3C/filter%3E%3Crect width='200' height='200' fill='%23777'/%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E\")";

/** 雪花背景样式（图片优先，缺失用 SVG 噪点）*/
export function useStaticBg(): CSSProperties {
  const url = p4gAsset('tv-static.webp');
  const ok = useImageOk(url);
  return { backgroundImage: ok === false ? NOISE_FALLBACK : `url(${url})`, backgroundSize: '256px 256px', backgroundRepeat: 'repeat', backgroundColor: '#6b6b6b' };
}

export interface NoiseLayerProps { opacity?: number; animate?: boolean; className?: string; style?: CSSProperties }
/** 雪花层（填满父容器，父需 relative + overflow-hidden）。animate 时 translate 抖动（steps，GPU 合成）。 */
export function NoiseLayer({ opacity = 1, animate = true, className, style }: NoiseLayerProps) {
  const low = useLowMotion();
  const bg = useStaticBg();
  return (
    <div aria-hidden className={cx('pointer-events-none absolute inset-0 overflow-hidden', className)} style={{ opacity, ...style }}>
      <div className="absolute -inset-[20%]" style={{ ...bg, animation: animate && !low ? 'p4g-static-shift 0.32s steps(4) infinite' : undefined }} />
    </div>
  );
}

export interface ChannelNoiseProps { active: boolean; duration?: number; onCovered?: () => void; onDone?: () => void; bars?: boolean }
export function ChannelNoise({ active, duration = 320, onCovered, onDone, bars = true }: ChannelNoiseProps) {
  const low = useLowMotion();
  const cb = useRef({ onCovered, onDone });
  cb.current = { onCovered, onDone };
  useEffect(() => {
    if (!active) return;
    const d = low ? 120 : duration;
    const t1 = window.setTimeout(() => cb.current.onCovered?.(), d * 0.4);
    const t2 = window.setTimeout(() => cb.current.onDone?.(), d);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [active, duration, low]);
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="noise"
          className="pointer-events-none fixed inset-0 overflow-hidden bg-black"
          style={{ zIndex: 'var(--p4g-z-transition)' as unknown as number }}
          initial={{ opacity: 0 }}
          animate={{ opacity: low ? 1 : [0, 1, 1, 0.85] }}
          exit={{ opacity: 0, transition: { duration: low ? 0.08 : 0.12 } }}
          transition={{ duration: (low ? 120 : duration) / 1000, times: [0, 0.3, 0.7, 1] }}
        >
          <NoiseLayer animate={!low} />
          {bars && !low && (
            <motion.div
              className="absolute inset-x-0 top-[38%] h-[16%]"
              style={{ background: 'linear-gradient(90deg,#fff 0 14%,#ffe100 14% 28%,#33c2ee 28% 42%,#3cb04a 42% 57%,#c03cc0 57% 71%,#e2231a 71% 85%,#1b3fa8 85% 100%)' }}
              initial={{ opacity: 0, scaleY: 0.2 }}
              animate={{ opacity: [0, 0.9, 0], scaleY: [0.2, 1, 0.4] }}
              transition={{ duration: duration / 1000, times: [0.3, 0.45, 0.6] }}
            />
          )}
          {/* 水平滚动亮带（CRT 竖向同步失调）*/}
          {!low && (
            <motion.div className="absolute inset-x-0 h-24 bg-white/25" initial={{ y: '-20vh' }} animate={{ y: '110vh' }} transition={{ duration: duration / 1000, ease: 'linear' }} />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
