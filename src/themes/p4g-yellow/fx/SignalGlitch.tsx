/**
 * 信号中断抖动：active 时内容横向抖动 + 叠两条错位横带 + 雪花一闪。
 *   <SignalGlitch active={err}><P4Card>...</P4Card></SignalGlitch>
 *   <SignalGlitch active loop>…</SignalGlitch>     持续抖动（报错态）
 * 只动 transform/opacity；低动效下不抖，只显示静态横带。
 */
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useLowMotion } from '@yellow/lib/prefs';
import { NoiseLayer } from './ChannelNoise';
import { cx } from '@yellow/lib/cx';

export interface SignalGlitchProps { active?: boolean; loop?: boolean; children: ReactNode; className?: string; noise?: boolean }

export function SignalGlitch({ active = true, loop = false, children, className, noise = true }: SignalGlitchProps) {
  const low = useLowMotion();
  const anim = active && !low ? { animation: `p4g-glitch ${loop ? '0.9s' : '0.36s'} steps(2) ${loop ? 'infinite' : '2'}` } : undefined;
  return (
    <div className={cx('relative overflow-hidden', className)}>
      <div style={anim}>{children}</div>
      {active && (
        <>
          <motion.div aria-hidden className="pointer-events-none absolute inset-x-0 top-[30%] h-[6%] bg-p4g-cyan/40" animate={low ? undefined : { x: ['-4%', '5%', '-2%', '0%'], opacity: [0.8, 0.3, 0.7, loop ? 0.5 : 0] }} transition={{ duration: loop ? 1.2 : 0.4, repeat: loop ? Infinity : 0 }} />
          <motion.div aria-hidden className="pointer-events-none absolute inset-x-0 top-[62%] h-[4%] bg-p4g-red/40" animate={low ? undefined : { x: ['5%', '-4%', '3%', '0%'], opacity: [0.7, 0.4, 0.8, loop ? 0.4 : 0] }} transition={{ duration: loop ? 1 : 0.4, repeat: loop ? Infinity : 0 }} />
          {noise && <NoiseLayer opacity={loop ? 0.12 : 0.18} animate={!low} className="mix-blend-screen" />}
        </>
      )}
    </div>
  );
}
