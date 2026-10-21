/**
 * AchievementUnlockModal.p3r —— 成就解锁（真实 src/components/AchievementUnlockModal.tsx#AchievementUnlockP3，p3-modal-07 稿）1:1 粉白重配。
 * 时序（真实值）：樱粉幕 → 三圈水波自中心推开（r 24 → 300+k·110，1.2s，delay .04+k·.13）→ UNLOCK 巨幽灵字裁切揭示 .06 →
 *   白菱形面板 spring(230/19) scale .55 + rotate -5→0 → 纸鹤徽记 [0,1.25,1] .15 → 碎三角迸开 .42+ →
 *   玫红斜带 scaleX 拉出 .24 → 「成就解锁！」逐字弹入 .3+i·.055 → 珊瑚角 .52 戳入后低频眨动 → 成就名行 .6 浮入 → 副文 →
 *   4500ms 自动关闭（真实 useAutoClose(4500)）。点遮罩 / ✕ / ESC 关闭。
 * ?queue=2 → 解锁连播：成就 → 技能 排队依次播放（真实 App.tsx 通知门控：level → achievement → skill），见 UnlockCutIn.p3r。
 */
import { AnimatePresence, motion } from 'framer-motion';
import type { OverlayProps } from '@pink/registry/types';
import { Portal, useEscape } from '@pink/kit';
import { useBoldness } from '@pink/lib/prefs';
import { MOCK_ACH_UNLOCK } from '@pink/adapters/pkg1';
import { useAutoClose, CrestP3, TriBurst, LILAC_MID, LILAC_PALE, cyanA, TRI_CLIP, type BurstPiece } from '@pink/screens/pkg1/fxbits';
import UnlockChain from './UnlockCutIn.p3r';

const CREST_BURST: BurstPiece[] = [
  { dx: -62, dy: -30, rot: -40, s: 11, c: 'var(--p3r-cyan)' },
  { dx: 66, dy: -22, rot: 60, s: 9, c: 'var(--p3r-blue)' },
  { dx: -44, dy: 44, rot: -80, s: 8, c: LILAC_PALE },
  { dx: 72, dy: 36, rot: 45, s: 10, c: 'var(--p3r-magenta)' },
  { dx: 8, dy: -62, rot: 20, s: 8, c: LILAC_MID },
  { dx: -78, dy: 8, rot: -25, s: 9, c: 'var(--p3r-blue)' },
];

export const AchievementUnlockP3 = ({ isOpen, onClose, achievementTitle, lines = MOCK_ACH_UNLOCK.lines }: { isOpen: boolean; onClose: () => void; achievementTitle: string; lines?: [string, string] }) => {
  const anim = useBoldness();
  useAutoClose(isOpen, 4500, onClose);
  useEscape(isOpen, onClose);
  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <motion.div key="ach" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center overflow-hidden p-5" style={{ zIndex: 'var(--p3r-z-celebration)' as unknown as number, background: 'rgb(var(--p3r-cyan-pale-rgb) / 0.93)' }}
            onClick={onClose}>
            {anim && (
              <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full">
                {[0, 1, 2].map((k) => (
                  <motion.circle key={k} cx="50%" cy="50%" fill="none" stroke={k === 1 ? 'var(--p3r-blue)' : 'var(--p3r-cyan)'} strokeWidth={k === 1 ? 14 : 9}
                    initial={{ r: 24, opacity: 0 }} animate={{ r: 300 + k * 110, opacity: [0, 0.55, 0.3, 0] }}
                    transition={{ duration: 1.2, delay: 0.04 + k * 0.13, ease: [0.16, 0.7, 0.35, 1], opacity: { duration: 1.2, delay: 0.04 + k * 0.13, times: [0, 0.12, 0.6, 1] } }} />
                ))}
              </svg>
            )}
            <motion.div aria-hidden className="pointer-events-none absolute left-[-24px] top-[4%] select-none font-cond leading-none"
              style={{ fontSize: 'clamp(84px, 30vw, 7.5rem)', color: 'rgba(255,255,255,0.55)', rotate: -9 }}
              initial={anim ? { clipPath: 'inset(-12% 103% -12% -3%)', x: -34 } : false} animate={{ clipPath: 'inset(-12% -6% -12% -3%)', x: 0 }}
              transition={{ duration: 0.5, delay: 0.06, ease: [0.22, 0.9, 0.3, 1] }}>UNLOCK</motion.div>
            <span aria-hidden className="absolute right-0 top-0 h-[120px] w-[140px]" style={{ background: 'var(--p3r-blue)', clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }} />
            <motion.button type="button" whileTap={{ scale: 0.9 }} onClick={onClose} aria-label="关闭" className="absolute right-3 top-3 z-20 flex h-11 w-11 items-center justify-center text-2xl font-black" style={{ color: 'var(--p3r-on-blue)' }}>×</motion.button>

            <motion.div role="dialog" aria-modal="true" aria-label={`成就解锁！${achievementTitle}`}
              initial={anim ? { scale: 0.55, opacity: 0, rotate: -5 } : { opacity: 0 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} exit={anim ? { scale: 0.75, opacity: 0 } : { opacity: 0 }}
              transition={anim ? { type: 'spring', damping: 19, stiffness: 230 } : { duration: 0.16 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md overflow-hidden pb-10 pt-6 text-center"
              style={{ background: 'var(--p3r-panel)', clipPath: 'polygon(7% 9%, 96% 0, 100% 88%, 3% 100%)', boxShadow: '0 24px 60px rgba(42,13,34,0.28)' }}>
              <span aria-hidden className="absolute bottom-1 left-2 h-0 w-0 border-b-[26px] border-r-[38px] border-r-transparent" style={{ borderBottomColor: cyanA(0.8) }} />
              <div className="relative z-10 flex flex-col items-center px-6">
                <motion.div className="relative" initial={anim ? { scale: 0, rotate: -24 } : false} animate={anim ? { scale: [0, 1.25, 1], rotate: 0 } : undefined}
                  transition={{ duration: 0.7, delay: 0.15, type: 'spring', stiffness: 280 }}>
                  <CrestP3 />
                  {anim && <TriBurst pieces={CREST_BURST} delay={0.42} dur={0.6} step={0.03} />}
                </motion.div>
                <div className="relative mt-1 w-full">
                  <motion.span aria-hidden className="absolute left-[-15%] right-[-15%] top-1/2 h-[62px]" style={{ background: 'var(--p3r-blue)', y: '-50%', rotate: -7, originX: 0 }}
                    initial={anim ? { scaleX: 0, opacity: 0 } : false} animate={{ scaleX: 1, opacity: 1 }} transition={{ duration: 0.4, delay: 0.24, ease: [0.16, 1, 0.3, 1] }} />
                  <motion.span aria-hidden className="absolute right-[3%] top-[-16px] h-[16px] w-[26px]" initial={anim ? { scale: 0 } : false} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 20, delay: 0.52 }}>
                    <motion.span className="absolute inset-0" style={{ background: 'var(--p3r-magenta)', clipPath: TRI_CLIP }}
                      animate={anim ? { opacity: [1, 1, 0.3, 1] } : undefined} transition={{ duration: 4.4, times: [0, 0.88, 0.93, 1], repeat: Infinity, ease: 'linear', delay: 1.5 }} />
                  </motion.span>
                  <div className="relative whitespace-nowrap text-center font-heavy leading-none" style={{ fontSize: 'min(44px, 10.5vw)' }}>
                    {/* 底层奶油描边 + 上层填色（代替 paint-order，跨内核一致） */}
                    <span aria-hidden className="absolute inset-0" style={{ color: 'var(--p3r-cream)', WebkitTextStroke: '7px var(--p3r-cream)' }}>成就解锁！</span>
                    <span className="relative">
                      {'成就解锁！'.split('').map((ch, i) => (
                        <motion.span key={i} className="inline-block" style={{ color: '#b8336c' }}
                          initial={anim ? { y: 22, opacity: 0, scale: 0.5 } : false} animate={{ y: 0, opacity: 1, scale: 1 }}
                          transition={{ type: 'spring', stiffness: 480, damping: 24, delay: 0.3 + i * 0.055 }}>{ch}</motion.span>
                      ))}
                    </span>
                  </div>
                </div>
                <motion.div className="mt-7 flex max-w-full items-center justify-center gap-3" initial={anim ? { y: 16, opacity: 0 } : false} animate={{ y: 0, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 340, damping: 26, delay: 0.6 }}>
                  <span aria-hidden className="flex shrink-0 gap-1">
                    <span className="h-[12px] w-[10px]" style={{ background: cyanA(0.8), clipPath: 'polygon(38% 0, 100% 0, 62% 100%, 0 100%)' }} />
                    <span className="h-[12px] w-[10px]" style={{ background: cyanA(0.45), clipPath: 'polygon(38% 0, 100% 0, 62% 100%, 0 100%)' }} />
                  </span>
                  <span className="min-w-0 truncate font-heavy text-[clamp(22px,7vw,30px)] leading-[1.1]" style={{ color: 'var(--p3r-rose-ink)' }}>{achievementTitle}</span>
                  <span aria-hidden className="flex shrink-0 gap-1">
                    <span className="h-[12px] w-[10px]" style={{ background: cyanA(0.45), clipPath: 'polygon(38% 0, 100% 0, 62% 100%, 0 100%)' }} />
                    <span className="h-[12px] w-[10px]" style={{ background: cyanA(0.8), clipPath: 'polygon(38% 0, 100% 0, 62% 100%, 0 100%)' }} />
                  </span>
                </motion.div>
                <p className="mt-3 text-[14px] font-black" style={{ color: 'var(--p3r-ink)' }}>{lines.join('')}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
};

export default function AchievementUnlockOverlay(props: OverlayProps) {
  if (Number(props.params?.get('queue') ?? 0) > 1) return <UnlockChain {...props} />;
  return <AchievementUnlockP3 isOpen={props.open} onClose={props.onClose} achievementTitle={props.params?.get('title') ?? MOCK_ACH_UNLOCK.title} />;
}
