/**
 * 弹幕层（真实 src/components/danmaku/DanmakuLayer.tsx，命运抽签 / BIG DEAL 收官的环境层）：
 *   官方种子（纯装饰）+ 云端过审条目（aria「弹幕：…（长按可反馈）」）CSS 横向漂移；长按 1.5s → 该条定格 + 「⚑ 反馈并隐藏」→ 点 =「已反馈」并隐藏；点别处 / 4s 散去。
 * 变体：默认 = 漂移层 5s；?fx=press 长按反馈（自动走一遍：按住 1.5s → 胶囊）；?fx=send 写一句鼓励送出后「我的」弹幕从右侧飞入。
 * 演出舞台 = 抽签同款深莓夜水面（日夜同）。
 */
import { AnimatePresence, motion } from 'framer-motion';
import type { OverlayProps } from '@blue/registry/types';
import { Portal, useEscape, P3R, slantClip } from '@blue/kit';
import { useBoldness } from '@blue/lib/prefs';
import { DANMAKU } from '@blue/adapters/pkg2';
import { DanmakuLayer, DarkStage, type DanmakuItem } from '@blue/screens/pkg2/cutins';

export default function DanmakuLayerOverlay({ open, onClose, params }: OverlayProps) {
  const anim = useBoldness();
  const fx = params?.get('fx');
  useEscape(open, onClose);
  const items: DanmakuItem[] = DANMAKU.slice(0, 6).map((t, i) => ({ id: i % 2 ? `cloud-${i}` : '', text: t }));
  if (fx === 'send') items.splice(2, 0, { id: '', text: '我也熬过来了，你可以的', mine: true });
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <DarkStage z="z-celebration">
            <DanmakuLayer items={items} topBase={10} topStep={14} durBase={fx === 'send' ? 7 : 12} durStep={3} autoHold={fx === 'press' ? 0 : undefined} />
            <div className="pointer-events-none relative w-full max-w-sm text-center">
              <div className="font-cond text-[12px] tracking-[0.4em]" style={{ color: 'var(--bk-bubble-a)' }}>{fx === 'send' ? 'SENT' : fx === 'press' ? 'FEEDBACK' : 'DANMAKU'}</div>
              <div className="mt-2 font-heavy text-[22px]" style={{ color: 'var(--p3r-cream)' }}>{fx === 'send' ? '你的那一句飞出去了' : fx === 'press' ? '长按一条，可以反馈' : '同样在路上的人'}</div>
              <p className="mt-2 text-[12px] font-bold" style={{ color: 'rgba(236,247,255,0.55)' }}>{fx === 'send' ? '过审后，它会出现在同样卡住的人面前。' : fx === 'press' ? '按住 1.5 秒定格 → 「反馈并隐藏」' : '先审后发 · 匿名 · 长按云端弹幕可反馈'}</p>
              {fx === 'send' && anim && (
                <motion.div className="mx-auto mt-5 inline-block px-4 py-1.5 text-[13px] font-black" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(7) }}
                  initial={{ x: '60vw', opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 22, delay: 0.3 }}>我也熬过来了，你可以的</motion.div>
              )}
            </div>
            <button type="button" onClick={onClose} className="absolute bottom-[calc(24px+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 px-6 py-2 text-[13px] font-black" style={{ background: 'rgba(255,248,240,0.14)', color: 'var(--p3r-cream)', clipPath: slantClip(8) }}>关闭</button>
          </DarkStage>
        )}
      </AnimatePresence>
    </Portal>
  );
}
