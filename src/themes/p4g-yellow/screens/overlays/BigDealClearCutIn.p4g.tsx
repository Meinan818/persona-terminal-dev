/**
 * BIG DEAL 收官结算（真实 src/components/bigdeal/BigDealClearCutIn.tsx，App 顶层）：
 * 「BIG DEAL CLEAR」眉标 → 斜章「大功告成」砸入 → 标题 → 战利品行（SP +N / 属性 +1 / 共 N 步）→ 弹幕层 →
 * 「✦ 写一句话，送给同样在路上的人」（你攒了 N 次投稿机会 · 先审后发 · 匿名 → 写一句鼓励）→「记录这一刻」。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Button, P4Outline, P4Stripe, Portal, useEscape, useScrollLock } from '@yellow/kit';
import { ScanlineOverlay } from '@yellow/fx';
import { useLowMotion } from '@yellow/lib/prefs';
import { p4gAsset } from '@yellow/lib/asset';
import { DANMAKU } from '@yellow/adapters/pkg2';
import { DanmakuStrip } from '@yellow/screens/pkg2/Danmaku';
import DanmakuCompose from './DanmakuCompose.p4g';

export default function BigDealClearCutIn({ open, onClose, data }: OverlayProps & { data?: { title: string; sp: number; attrs: string[]; stepsCount: number } }) {
  const low = useLowMotion();
  const d = data ?? { title: '期中考试', sp: 15, attrs: ['知识', '胆量'], stepsCount: 5 };
  const [compose, setCompose] = useState(false);
  const bold = !low;
  useScrollLock(open);
  useEscape(open, onClose);
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div key="bdc" role="dialog" aria-modal="true" aria-label={`大功告成：${d.title}`} className="fixed inset-0 flex items-center justify-center overflow-hidden p-5" style={{ zIndex: 'var(--p4g-z-celebration)' as unknown as number }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-p4g-black/85" />
            <div aria-hidden className="absolute inset-0 opacity-90" style={{ backgroundImage: `url(${p4gAsset('cutin-speedlines.webp')})`, backgroundSize: 'cover', backgroundPosition: '30% 50%' }} />
            <ScanlineOverlay />
            <DanmakuStrip items={DANMAKU.slice(0, 6).map((t, i) => ({ id: `c${i}`, text: t }))} topBase={6} topStep={7} />
            <div className="relative flex w-full max-w-[460px] min-w-0 flex-col items-center text-center">
              <motion.div initial={bold ? { opacity: 0, y: -18 } : false} animate={{ opacity: 1, y: 0 }} className="rounded-xs bg-p4g-black px-3 py-1 font-display text-meta font-bold italic tracking-[0.3em] text-p4g-yellow">BIG DEAL CLEAR</motion.div>
              <motion.div initial={bold ? { scale: 1.9, opacity: 0, rotate: -8 } : false} animate={{ scale: 1, opacity: 1, rotate: -6 }} transition={{ type: 'spring', stiffness: 420, damping: 22, delay: bold ? 0.08 : 0 }} className="relative mt-3">
                <div aria-hidden className="absolute inset-0 translate-x-2 translate-y-2 bg-p4g-orange" />
                <div className="relative border-[4px] border-p4g-black bg-p4g-yellow px-6 py-2"><P4Outline size="clamp(40px,12vw,64px)" stroke={7} italic>大功告成</P4Outline></div>
              </motion.div>
              <motion.h2 initial={bold ? { opacity: 0, y: 12 } : false} animate={{ opacity: 1, y: 0 }} transition={{ delay: bold ? 0.24 : 0 }} className="mt-4 max-w-full truncate rounded-sm bg-p4g-black px-4 py-1.5 font-display text-h2 font-bold text-white">{d.title}</motion.h2>
              <motion.div initial={bold ? { opacity: 0, y: 12 } : false} animate={{ opacity: 1, y: 0 }} transition={{ delay: bold ? 0.36 : 0 }} className="mt-3 flex flex-wrap justify-center gap-2">
                <span className="rounded-xs border-3 border-p4g-black bg-p4g-cyan px-2 p4g-num text-lead text-p4g-black">SP +{d.sp}</span>
                {d.attrs.map((a) => <span key={a} className="rounded-xs border-3 border-p4g-black bg-white px-2 font-display text-body font-bold text-p4g-black">{a} +1</span>)}
                <span className="rounded-xs border-3 border-p4g-black bg-p4g-orange px-2 font-display text-body font-bold text-p4g-black">共 {d.stepsCount} 步</span>
              </motion.div>
              <motion.button type="button" initial={bold ? { opacity: 0, y: 12 } : false} animate={{ opacity: 1, y: 0 }} transition={{ delay: bold ? 0.48 : 0 }} onClick={() => setCompose(true)}
                className="p4g-press mt-5 w-full min-w-0 rounded-sm border-3 border-p4g-black bg-p4g-cream px-4 py-3 text-left text-p4g-black shadow-hard">
                <span className="block font-display text-body font-bold">✦ 写一句话，送给同样在路上的人</span>
                <span className="mt-0.5 block text-cap font-bold opacity-60">你攒了 2 次投稿机会 · 先审后发 · 匿名</span>
              </motion.button>
              <motion.div initial={bold ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={{ delay: bold ? 0.6 : 0 }} className="mt-4 w-full">
                <P4Button block size="lg" onClick={onClose}>记录这一刻</P4Button>
              </motion.div>
              <P4Stripe variant="hazard" height={10} className="mt-5 w-full" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <DanmakuCompose open={compose} onClose={() => setCompose(false)} />
    </Portal>
  );
}
