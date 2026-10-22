/**
 * LevelUpModal.p3r —— 属性升级（真实 src/components/LevelUpModal.tsx#LevelUpP3，p3-modal-05 稿）1:1 蓝白重配。
 * 时序（真实值）：深蓝幕淡入 → 紧凑大卡 spring(240/20) scale .6→1 → 巨等级数字从深处 zoom（delay .1）→ LEVEL 幽灵字 .14 →
 *   底部三角群 .16 / .24 戳入 → 白斜面板「恭喜升级！」砸入 .2 → 蓝斜带属性名 slam .32 + 白闪 .46 → Lv 行 / 副文 →
 *   碎裂星徽呼吸循环 → 3600ms 自动关闭（真实 useAutoClose(3600)）。点遮罩 / ✕ / ESC 关闭。
 * 蓝白母题：开场玻璃碎片自四周聚合成等级数字（B4）。
 * 变体：?variant=mastery&stars=N（精通提升！★N-1 → ★N，MASTERY 幽灵字，「满级之后，你还在往前走。」）
 *       ?variant=max（升到 Lv.10 封顶那一次：Lv.9 → Lv.10 + MAX 封顶签——粉版补充标识，真实同文案）
 *       ?attr=…&level=N 自定。低动效：直出终态 + 淡入淡出。
 */
import { AnimatePresence, motion } from 'framer-motion';
import type { OverlayProps } from '@blue/registry/types';
import { Portal, useEscape, ShatteredStar } from '@blue/kit';
import { useBoldness } from '@blue/lib/prefs';
import { MOCK_LEVELUP, MAX_LEVEL } from '@blue/mock/pkg1';
import { useAutoClose, cyanA } from '@blue/screens/pkg1/fxbits';

const SHARDS = Array.from({ length: 10 }, (_, i) => {
  const a = (i / 10) * Math.PI * 2 + 0.3;
  const d = 150 + (i % 3) * 40;
  return { x: Math.cos(a) * d, y: Math.sin(a) * d * 0.7, r: (i % 2 ? 1 : -1) * (60 + i * 17), w: 18 + (i % 4) * 8, h: 22 + (i % 3) * 10, clip: i % 2 ? 'polygon(50% 0, 100% 80%, 0 100%)' : 'polygon(0 0, 100% 30%, 60% 100%)' };
});

export interface LevelUpProps { isOpen: boolean; onClose: () => void; attributeName: string; newLevel: number; masteryStars?: number; capped?: boolean }

export const LevelUpP3 = ({ isOpen, onClose, attributeName, newLevel, masteryStars, capped }: LevelUpProps) => {
  const anim = useBoldness();
  const stars = masteryStars ?? 0;
  const isMastery = stars > 0;
  const isMax = !isMastery && (capped || newLevel >= MAX_LEVEL);
  useAutoClose(isOpen, 3600, onClose);
  useEscape(isOpen, onClose);
  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <motion.div key="lv" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center overflow-hidden p-5" style={{ zIndex: 'var(--p3r-z-celebration)' as unknown as number, background: 'rgba(10,15,27,0.65)' }}
            onClick={onClose}>
            <motion.div role="dialog" aria-modal="true" aria-label={isMastery ? `精通提升！${attributeName} ★${stars}` : `恭喜升级！${attributeName} Lv.${newLevel}`}
              initial={anim ? { scale: 0.6, opacity: 0, y: 26 } : { opacity: 0 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={anim ? { scale: 0.8, opacity: 0 } : { opacity: 0 }}
              transition={anim ? { type: 'spring', damping: 20, stiffness: 240 } : { duration: 0.16 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm overflow-hidden pb-9 pt-7"
              style={{ background: 'var(--p3r-sheet-grad)', clipPath: 'polygon(18px 0, 100% 0, calc(100% - 18px) 100%, 0 100%)' }}>
              <motion.div aria-hidden className="pointer-events-none absolute left-[-8px] top-[2%] select-none font-cond leading-none"
                style={{ fontSize: '4rem', color: 'var(--p3r-ghost)', rotate: -8 }}
                initial={anim ? { x: -36, opacity: 0 } : false} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.4, delay: 0.14, ease: [0.2, 0.8, 0.3, 1] }}>
                {isMastery ? 'MASTERY' : 'LEVEL'}
              </motion.div>
              {/* 蓝白 B4：玻璃碎片自四周聚合成巨等级数字（0–.5s），聚合瞬间白闪；粉版对位是数字从花心开出 */}
              {anim && SHARDS.map((sh, i) => (
                <motion.span key={`g${i}`} aria-hidden className="pointer-events-none absolute left-1/2 top-[18%] z-[1]" style={{ width: sh.w, height: sh.h, background: i % 3 ? 'var(--bk-shard)' : 'var(--p3r-blue)', border: '1px solid var(--bk-shard-edge)', clipPath: sh.clip }}
                  initial={{ x: sh.x, y: sh.y, rotate: sh.r, opacity: 0 }} animate={{ x: [sh.x, sh.x * 0.2, 0], y: [sh.y, sh.y * 0.2, 0], rotate: [sh.r, sh.r * 0.3, 0], opacity: [0, 1, 0] }}
                  transition={{ duration: 0.55, delay: 0.02 * (i % 4), times: [0, 0.7, 1], ease: [0.6, 0, 0.9, 0.6] }} />
              ))}
              <motion.div aria-hidden className="pointer-events-none absolute left-1/2 top-[1%] select-none font-cond leading-none tabular"
                style={{ fontSize: '10rem', color: 'rgb(var(--p3r-blue-rgb) / 0.13)', x: '-50%' }}
                initial={anim ? { scale: 1.8, opacity: 0 } : false} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.1 }}>
                {String(isMastery ? stars : newLevel).padStart(2, '0')}
              </motion.div>
              <span aria-hidden className="absolute right-0 top-0 h-[84px] w-[96px]" style={{ background: 'var(--p3r-blue)', clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }} />
              <motion.button type="button" whileTap={{ scale: 0.9 }} onClick={onClose} aria-label="关闭" className="absolute right-2 top-2 z-20 flex h-10 w-10 items-center justify-center text-2xl font-black" style={{ color: 'var(--p3r-on-blue)' }}>×</motion.button>
              <motion.span aria-hidden className="absolute bottom-0 left-0 h-[72px] w-[42%]" style={{ background: cyanA(0.75), clipPath: 'polygon(0 100%, 0 20%, 100% 100%)' }}
                initial={anim ? { y: 44, opacity: 0 } : false} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 24, delay: 0.16 }} />
              <motion.span aria-hidden className="absolute bottom-0 right-0 h-[96px] w-[54%]" style={{ background: 'var(--p3r-blue)', clipPath: 'polygon(100% 100%, 100% 0, 0 100%)' }}
                initial={anim ? { y: 56, opacity: 0 } : false} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 24, delay: 0.24 }} />

              <div className="relative z-10 flex w-full flex-col items-center">
                <motion.div animate={anim ? { rotate: [0, 3, -3, 0], scale: [1, 1.05, 1] } : undefined} transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 0.8 }}>
                  <ShatteredStar className="w-[136px]" />
                </motion.div>
                <div className="relative mt-1 w-[84%]">
                  <motion.div className="px-5 pb-2.5 pt-3 text-center"
                    style={{ background: 'var(--p3r-panel-glass)', clipPath: 'polygon(3% 14%, 100% 0, 97% 100%, 0 92%)' }}
                    initial={anim ? { y: -18, opacity: 0 } : false} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 26, delay: 0.2 }}>
                    <div className="font-heavy text-[22px] leading-none" style={{ color: 'var(--p3r-rose-ink)' }}>{isMastery ? '精通提升！' : '恭喜升级！'}</div>
                  </motion.div>
                  <motion.div className="relative -mt-1 px-5 py-3 text-center" style={{ background: 'var(--p3r-blue)', clipPath: 'polygon(0 10%, 100% 0, 100% 90%, 3% 100%)' }}
                    initial={anim ? { scale: 1.18, opacity: 0 } : false} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 24, delay: 0.32 }}>
                    <div className="truncate font-heavy text-[38px] leading-none" style={{ color: 'var(--p3r-on-blue)' }}>{attributeName}</div>
                    {anim && <motion.span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: '#fff' }} initial={{ opacity: 0 }} animate={{ opacity: [0, 0.85, 0] }} transition={{ duration: 0.3, delay: 0.46, times: [0, 0.35, 1] }} />}
                  </motion.div>
                </div>
                <motion.div className="mt-5 flex items-end justify-center gap-3" initial={anim ? { opacity: 0, y: 10 } : false} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.3 }}>
                  <span className="font-cond text-[20px] leading-none" style={{ color: 'var(--p3r-ink-soft)' }}>{isMastery ? `★${stars - 1}` : `Lv.${newLevel - 1}`}</span>
                  <span aria-hidden className="pb-0.5 text-[18px] font-black" style={{ color: 'var(--p3r-blue)' }}>→</span>
                  <span className="relative font-cond text-[36px] leading-none" style={{ color: 'var(--p3r-rose-ink)' }}>
                    {isMastery ? `★${stars}` : `Lv.${newLevel}`}
                    <span aria-hidden className="absolute -bottom-2 left-0 right-0 h-[3px]" style={{ background: 'var(--p3r-cyan)' }} />
                    <span aria-hidden className="absolute -bottom-2 right-[-12px] h-[3px] w-[9px]" style={{ background: 'var(--p3r-magenta)' }} />
                  </span>
                  {isMax && (
                    <motion.span className="mb-1 px-2 py-0.5 font-cond text-[13px] tracking-widest" style={{ background: 'var(--p3r-magenta)', color: '#fff', clipPath: 'polygon(5px 0, 100% 0, calc(100% - 5px) 100%, 0 100%)' }}
                      initial={anim ? { scale: 0, rotate: -20 } : false} animate={{ scale: 1, rotate: -6 }} transition={{ type: 'spring', stiffness: 500, damping: 16, delay: 0.62 }}>MAX</motion.span>
                  )}
                </motion.div>
                <p className="mt-5 px-4 text-center text-[14px] font-black" style={{ color: 'var(--p3r-rose-ink)' }}>
                  {isMastery ? '满级之后，你还在往前走。' : '继续加油，你越来越强了！'}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
};

export default function LevelUpOverlay({ open, onClose, params }: OverlayProps) {
  const v = params?.get('variant');
  const stars = v === 'mastery' ? Math.max(1, Number(params?.get('stars') ?? 2) || 2) : 0;
  const level = v === 'max' || v === 'mastery' ? MAX_LEVEL : Number(params?.get('level') ?? MOCK_LEVELUP.level) || MOCK_LEVELUP.level;
  const attr = params?.get('attr') ?? (v === 'mastery' ? '魅力' : v === 'max' ? '灵巧' : MOCK_LEVELUP.attr);
  return <LevelUpP3 isOpen={open} onClose={onClose} attributeName={attr} newLevel={level} masteryStars={stars} capped={v === 'max'} />;
}
