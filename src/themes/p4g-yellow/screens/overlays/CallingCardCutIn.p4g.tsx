/**
 * 宣告卡结算屏（真实 src/components/callingCard/CallingCardCutIn.tsx）。?variant=cleared|expired|archived
 * 「✦ CALLING CARD ✦」逐字入场 → 黑卡飞入（拼贴分层）→ 理由章 CLEARED / EXPIRED →
 * 「宣告 · 达成 / 时之至 / 已收」+ 台词 + 「留下记录」（正在落墨… / ✓ 已留下记录）+「收下卡片」。
 * 外观：P4G Rank Up 黄底 + 斜彩带 + 速度线，黑卡 = 午夜频道电视卡。
 * 时序对齐真实：眉标逐字 .25+i×.025 → 卡片 .45 飞入 → 印章 1.05s SLAM → 按钮 1.4s。
 */
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { CallingCard } from '@/types';
import type { OverlayProps } from '@yellow/registry/types';
import { Portal, P4Outline, P4Stripe, useScrollLock } from '@yellow/kit';
import { NoiseLayer } from '@yellow/fx';
import { useLowMotion } from '@yellow/lib/prefs';
import { p4gAsset } from '@yellow/lib/asset';
import { P4Button } from '@yellow/kit';

export type Reason = 'auto_todos' | 'auto_date' | 'manual';
const LETTERS = ['✦', ' ', 'C', 'A', 'L', 'L', 'I', 'N', 'G', ' ', 'C', 'A', 'R', 'D', ' ', '✦'];

/** card / reason：宿主（行动·倒计时、宣告卡总览页）传入时用真实卡面；缺省用 demo 卡 */
export default function CallingCardCutIn({ open, onClose, params, card, reason: reasonProp }: OverlayProps & { card?: Pick<CallingCard, 'title' | 'subtitle' | 'icon'> | null; reason?: Reason }) {
  const low = useLowMotion();
  useScrollLock(open);
  const v = params?.get('variant');
  const reason: Reason = reasonProp ?? (v === 'expired' ? 'auto_date' : v === 'archived' ? 'manual' : 'auto_todos');
  const [ledger, setLedger] = useState<'idle' | 'writing' | 'done'>('idle');
  useEffect(() => { if (open) setLedger('idle'); }, [open]);
  const head = reason === 'auto_date' ? '宣告 · 时之至' : reason === 'auto_todos' ? '宣告 · 达成' : '宣告 · 已收';
  const hint = reason === 'auto_date' ? '约定的那一日已经到来。' : reason === 'auto_todos' ? '所有任务已被你跨过。' : '收存于档案。';
  const stamp = reason === 'auto_date' ? 'EXPIRED' : 'CLEARED';
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div key="cc" role="dialog" aria-modal="true" aria-label={`宣告卡 · ${head.split(' · ')[1]}`} className="fixed inset-0 flex items-center justify-center overflow-hidden p-4"
            style={{ zIndex: 'var(--p4g-z-cutin)' as unknown as number }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.25 } }}>
            <div className="absolute inset-0 bg-p4g-yellow-hi" />
            <div aria-hidden className="absolute inset-0 bg-cover bg-center opacity-60 mix-blend-multiply" style={{ backgroundImage: `url(${p4gAsset('cutin-speedlines.webp')})` }} />
            <motion.div aria-hidden className="absolute -left-10 -right-10 top-[18%]" style={{ rotate: -6 }} initial={low ? false : { x: '-100%' }} animate={{ x: 0 }} transition={{ duration: 0.35, ease: [0.2, 0.9, 0.1, 1] }}><P4Stripe variant="ribbon" height={34} /></motion.div>
            <motion.div aria-hidden className="absolute -left-10 -right-10 bottom-[16%]" style={{ rotate: 3 }} initial={low ? false : { x: '100%' }} animate={{ x: 0 }} transition={{ duration: 0.35, delay: 0.08, ease: [0.2, 0.9, 0.1, 1] }}><P4Stripe variant="hazard" height={18} /></motion.div>

            <div className="relative flex w-full max-w-[420px] min-w-0 flex-col items-center">
              <div className="mb-3 flex font-display text-h3 font-bold italic tracking-[0.12em] text-p4g-black" aria-hidden>
                {LETTERS.map((c, i) => (
                  <motion.span key={i} initial={low ? false : { opacity: 0, y: -18, rotate: -20 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ delay: 0.25 + i * 0.025, duration: 0.22 }} className="inline-block whitespace-pre">{c}</motion.span>
                ))}
              </div>
              {/* 拼贴底板 */}
              <div className="relative w-full">
                <motion.div aria-hidden className="absolute inset-0 bg-p4g-orange" style={{ rotate: 3 }} initial={low ? false : { opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.25, duration: 0.2 }} />
                <motion.div aria-hidden className="absolute inset-0 bg-p4g-white" style={{ rotate: -2 }} initial={low ? false : { opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, duration: 0.2 }} />
                <motion.div className="relative overflow-hidden border-[4px] border-p4g-black bg-p4g-black px-5 pb-5 pt-6 text-p4g-white"
                  initial={low ? { opacity: 0 } : { opacity: 0, x: 260, rotate: 18, scale: 0.8 }} animate={{ opacity: 1, x: 0, rotate: -1.5, scale: 1 }} transition={{ delay: 0.45, duration: 0.5, ease: [0.2, 0.9, 0.1, 1] }}>
                  <NoiseLayer opacity={0.1} />
                  <div aria-hidden className="absolute inset-x-0 top-0 h-2 p4g-candy" />
                  <div className="relative flex min-w-0 items-start gap-3">
                    <span aria-hidden className="flex h-14 w-14 shrink-0 items-center justify-center border-[3px] border-p4g-yellow text-h1 text-p4g-yellow">{card?.icon ?? '◆'}</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-display text-2xs font-bold tracking-[0.3em] text-p4g-yellow">MIDNIGHT CHANNEL</div>
                      <h2 className="p4g-clamp-2 font-display text-h2 font-bold leading-tight">{card ? card.title : '期末考试全科及格'}</h2>
                      {(card ? card.subtitle : '在雾散之前，把每一科都拿下。') && <p className="mt-1 p4g-clamp-2 text-meta text-p4g-white/80">「{card ? card.subtitle : '在雾散之前，把每一科都拿下。'}」</p>}
                    </div>
                  </div>
                  <div className="relative mt-4 flex min-w-0 items-end justify-between gap-3">
                    <div className="min-w-0">
                      <P4Outline size="clamp(22px,6vw,28px)" stroke={4} fill="var(--p4g-yellow)" strokeColor="var(--p4g-black)">{head}</P4Outline>
                      <p className="mt-1 text-body text-p4g-white/90"><span className="text-p4g-yellow">&gt; </span>{hint}</p>
                    </div>
                    <motion.span className="shrink-0 rounded-[3px] border-[3px] border-p4g-red px-2 py-0.5 font-display text-h3 font-bold tracking-wider text-p4g-red"
                      initial={low ? false : { opacity: 0, scale: 2.4, rotate: -30 }} animate={{ opacity: 1, scale: 1, rotate: -12 }} transition={{ delay: 1.05, duration: 0.22 }}>{stamp}</motion.span>
                  </div>
                </motion.div>
              </div>
              <motion.div className="mt-6 grid w-full grid-cols-1 gap-2" initial={low ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.4, duration: 0.3 }}>
                <P4Button block variant="secondary" disabled={ledger !== 'idle'} onClick={() => { setLedger('writing'); setTimeout(() => setLedger('done'), 900); }}>{ledger === 'done' ? '✓ 已留下记录' : ledger === 'writing' ? '正在落墨…' : '留下记录'}</P4Button>
                <P4Button block variant="black" size="lg" onClick={onClose}>收下卡片</P4Button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
