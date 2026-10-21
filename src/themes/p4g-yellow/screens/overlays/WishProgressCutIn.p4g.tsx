/**
 * 愿望进度 Cut-in（真实 src/components/wish/WishProgressCutIn.tsx，App 顶层；p4 频道 = CelebrationCutIn 橙色贴纸圆，内容层墨色）：
 * ✧ 主徽 → 题板「愿望名」→ 旗标「离这个愿望」→ 距离环 + 「+N% / 持平」+ 理由 +「已完成相关任务 N 次 · 本地估算」；autoClose 2.6s（同真实）。
 * delta=0 照实说「持平 / 这次没往前，但路还在脚下。」——?variant=flat；?variant=local 看「本地估算」。
 * 距离环：旧进度弧静态 → 新增弧段淡入（蓝）+ 指针从旧角度转到新角度（只动 transform / opacity；低动效直接终态）。
 */
import { motion } from 'framer-motion';
import type { OverlayProps } from '@yellow/registry/types';
import { useLowMotion } from '@yellow/lib/prefs';
import { CelebrationCutInP4G } from './CelebrationCutIn.p4g';

export interface WishProgressPayload { title: string; pct: number; delta: number; times: number; source?: 'ai' | 'local'; reason?: string }

function WishRingAnim({ pct, delta, size = 64 }: { pct: number; delta: number; size?: number }) {
  const low = useLowMotion();
  const r = 26, C = 2 * Math.PI * r;
  const old = Math.max(0, Math.min(100, pct - Math.max(0, delta)));
  const now = Math.max(0, Math.min(100, pct));
  // 只动 transform / opacity：旧进度弧静态画好，新增那一段弧淡入，指针从旧角度转到新角度
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className="shrink-0" aria-hidden>
      <circle cx="32" cy="32" r={r} fill="var(--p4g-cream)" stroke="rgba(19,19,19,0.2)" strokeWidth="6" />
      <circle cx="32" cy="32" r={r} fill="none" stroke="var(--p4g-black)" strokeWidth="6" strokeDasharray={`${(C * old) / 100} ${C}`} transform="rotate(-90 32 32)" />
      {now > old && (
        <motion.circle cx="32" cy="32" r={r} fill="none" stroke="var(--p4g-blue)" strokeWidth="6" strokeDasharray={`0 ${(C * old) / 100} ${(C * (now - old)) / 100} ${C}`} transform="rotate(-90 32 32)"
          initial={{ opacity: low ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ duration: low ? 0 : 0.3, delay: low ? 0 : 0.8 }} />
      )}
      <motion.g initial={{ rotate: low ? now * 3.6 : old * 3.6 }} animate={{ rotate: now * 3.6 }} transition={{ duration: low ? 0 : 0.6, delay: low ? 0 : 0.7, ease: [0.2, 0.9, 0.1, 1] }}>
        <circle cx="32" cy="32" r="32" fill="transparent" />
        <circle cx="32" cy="6" r="4" fill="var(--p4g-yellow)" stroke="var(--p4g-black)" strokeWidth="2" />
      </motion.g>
      <text x="32" y="37" textAnchor="middle" className="p4g-num" fontSize="15" fill="var(--p4g-black)">{now}%</text>
    </svg>
  );
}

export function WishProgressView({ payload, onClose }: { payload: WishProgressPayload | null; onClose: () => void }) {
  const low = useLowMotion();
  const p = payload;
  const dl = !p ? '' : p.delta > 0 ? `+${p.delta}%` : p.delta < 0 ? `${p.delta}%` : '持平';
  const reason = p?.reason ?? ((p?.delta ?? 0) > 0 ? '这一下是真的往前了。' : '这次没往前，但路还在脚下。');
  return (
    <CelebrationCutInP4G open={!!p} onClose={onClose} icon="✧" title={p?.title ?? ''} subtitle="离这个愿望" eyebrow="WISH" autoCloseMs={2600}>
      {p && (
        <div className="flex w-[min(300px,76vw)] min-w-0 items-center gap-3 rounded-sm border-3 border-p4g-black bg-p4g-orange px-3 py-2 text-p4g-black shadow-hard">
          <WishRingAnim pct={p.pct} delta={p.delta} />
          <div className="min-w-0 flex-1 text-left">
            <motion.div className="p4g-num text-h2 leading-none" initial={low ? false : { scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 16, delay: low ? 0 : 0.9 }} style={{ transformOrigin: 'left center' }}>{dl}</motion.div>
            <p className="mt-1 text-meta font-bold" style={{ color: 'rgba(19,19,19,0.72)' }}>{reason}</p>
            <p className="mt-0.5 text-cap font-bold" style={{ color: 'rgba(19,19,19,0.55)' }}>已完成相关任务 {p.times} 次{p.source === 'local' && ' · 本地估算'}</p>
          </div>
        </div>
      )}
    </CelebrationCutInP4G>
  );
}

export default function WishProgressCutIn({ open, onClose, params, payload }: OverlayProps & { payload?: WishProgressPayload }) {
  const v = params?.get('variant');
  const flat = v === 'flat';
  const p = payload ?? { title: '一年读完 24 本书', pct: flat ? 58 : 61, delta: flat ? 0 : 3, times: 18, source: (v === 'local' ? 'local' : 'ai') as 'ai' | 'local' };
  return <WishProgressView payload={open ? p : null} onClose={onClose} />;
}
