/**
 * BIG DEAL 大功告成（真实 src/components/bigdeal/BigDealClearCutIn.tsx，App 顶层，p3 = 水面舞台）：
 *   眉标「BIG DEAL CLEAR」y -18 → 0（.3s）→ 斜章「大功告成」砸入 scale 1.9→1 / rotate -8→0（spring 420/22，delay .08）
 *   → 大事名 .24 → 战利品行 .36（共 N 步 / SP +N / 属性 +1）→「✦ 写一句话，送给同样在路上的人」.48（→ 写一句鼓励）→「记录这一刻」.6；
 *   背景弹幕层（种子 + 云端过审，云端条目长按 1.5s 可反馈）。粉版舞台：深莓夜 + 樱点水纹（日夜同，明暗免疫）。
 * ?tokens=0 无投稿权（隐藏写一句）。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import type { OverlayProps } from '@blue/registry/types';
import { Portal, useEscape, P3R, slantClip } from '@blue/kit';
import { BubbleBurst } from '@blue/fx';
import { useBoldness } from '@blue/lib/prefs';
import { DANMAKU } from '@blue/adapters/pkg2';
import { DanmakuLayer, DarkStage } from '@blue/screens/pkg2/cutins';
import DanmakuCompose from './DanmakuCompose.p3r';

export interface BigDealClearData { title: string; sp: number; attrs: string[]; stepsCount: number }
export default function BigDealClearCutIn({ open, onClose, params, data }: OverlayProps & { data?: BigDealClearData }) {
  const bold = useBoldness();
  const d = data ?? { title: '期中考试', sp: 15, attrs: ['知识', '胆量'], stepsCount: 5 };
  const tokens = Number(params?.get('tokens') ?? 2);
  const [compose, setCompose] = useState(false);
  useEscape(open && !compose, onClose);
  const items = [{ id: '', text: DANMAKU[0] }, { id: 'u1', text: DANMAKU[4] }, { id: '', text: DANMAKU[7] }];
  const chip = 'px-3 py-1 text-[12px] font-black';
  return (
    <>
      <Portal>
        <AnimatePresence>
          {open && (
            <DarkStage z="z-celebration">
              <DanmakuLayer items={items} topBase={12} topStep={30} durBase={13} durStep={4} />
              <div className="relative w-full max-w-sm text-center">
                <motion.div className="font-cond text-[12px] tracking-[0.4em]" style={{ color: 'var(--bk-bubble-a)' }} initial={bold ? { opacity: 0, y: -18 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>BIG DEAL CLEAR</motion.div>
                <motion.div className="mt-3" initial={bold ? { scale: 1.9, opacity: 0, rotate: -8 } : false} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 22, delay: bold ? 0.08 : 0 }}>
                  <span className="inline-block px-6 py-2 font-heavy text-[24px]" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(10) }}>大功告成</span>
                </motion.div>
                <motion.h2 className="mt-4 break-words font-heavy text-[22px] leading-snug" style={{ color: 'var(--p3r-cream)' }} initial={bold ? { opacity: 0, y: 12 } : false} animate={{ opacity: 1, y: 0 }} transition={{ delay: bold ? 0.24 : 0 }}>{d.title}</motion.h2>
                <motion.div className="mt-4 flex flex-wrap items-center justify-center gap-2" initial={bold ? { opacity: 0, y: 12 } : false} animate={{ opacity: 1, y: 0 }} transition={{ delay: bold ? 0.36 : 0 }}>
                  <span className={chip} style={{ background: 'var(--p3r-cream)', color: 'var(--p3r-mulberry)', clipPath: slantClip(6) }}>共 {d.stepsCount} 步</span>
                  {d.sp > 0 && <span className={chip} style={{ background: 'var(--p3r-cream)', color: 'var(--p3r-mulberry)', clipPath: slantClip(6) }}>SP +{d.sp}</span>}
                  {d.attrs.map((a) => <span key={a} className={chip} style={{ background: 'var(--p3r-cream)', color: 'var(--p3r-mulberry)', clipPath: slantClip(6) }}>{a} +1</span>)}
                </motion.div>
                {tokens > 0 && (
                  <motion.button type="button" onClick={() => setCompose(true)} className="mx-auto mt-6 block w-full px-4 py-3 text-left" style={{ background: 'var(--p3r-cream)', clipPath: 'polygon(0 4%, 100% 0, 98.5% 100%, 1% 100%)' }}
                    initial={bold ? { opacity: 0, y: 12 } : false} animate={{ opacity: 1, y: 0 }} transition={{ delay: bold ? 0.48 : 0 }}>
                    <span className="block text-[14px] font-black" style={{ color: 'var(--p3r-mulberry)' }}>✦ 写一句话，送给同样在路上的人</span>
                    <span className="mt-0.5 block text-[11px] font-bold" style={{ color: 'rgba(21,32,59,0.6)' }}>你攒了 {tokens} 次投稿机会 · 先审后发 · 匿名</span>
                  </motion.button>
                )}
                <motion.div className="mt-6 space-y-3" initial={bold ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={{ delay: bold ? 0.6 : 0 }}>
                  <button type="button" onClick={onClose} className="w-full py-3 text-[16px] font-black" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(10) }}>记录这一刻</button>
                  <p className="text-[11px] font-bold" style={{ color: 'rgba(236,247,255,0.45)' }}>长按飘过的鼓励可以反馈</p>
                </motion.div>
              </div>
              {bold && <BubbleBurst active />}
            </DarkStage>
          )}
        </AnimatePresence>
      </Portal>
      <DanmakuCompose open={compose} onClose={() => setCompose(false)} tokens={tokens} />
    </>
  );
}
