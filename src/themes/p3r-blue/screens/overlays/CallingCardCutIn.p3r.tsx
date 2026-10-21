/**
 * 宣告卡结算屏（真实 src/components/callingCard/CallingCardCutIn.tsx · CUTIN_SKIN.p3「蓝 · 水下斜切」）：
 *   深靛底 + 青色径向冲击波 + 慢呼吸光晕 + 步进焦散（caustics，原作的水是跳帧的）+ 上浮气泡；
 *   硬斜切白卡身（clip 平行四边形，0 圆角）+ 直角蓝印章 SLAM（-7°）+ 斜切按钮 —— 与粉版圆角玫瑰卡 / 胶囊印章形状对立。
 * 六段分镜时序 1:1 真实：
 *   ① 0.00–0.25 冲击波 + 焦散自上滑入　② 0.25+i×0.025 ✦ CALLING CARD ✦ 逐字　③ 0.45 大字 shutter 揭幕（clip-path）
 *   ④ 0.75 卡身弹入 · 0.85 图标 · 0.90 标题 · 0.95 斜向 sweep 高光 · 1.05 副标　⑤ 1.05 印章 SLAM（scale 3→1）→ shockwave + 碎屑 + 相机抖动
 *   ⑥ 1.40 按钮「留下记录 / 收下卡片」· 1.60「─ Velvet」落款 → 停留在确认态；点空白 / 收下卡片退场（淡出 0.3s）
 * 变体：?reason=auto_todos（宣告 · 达成 / CLEARED）| auto_date（宣告 · 时之至 / EXPIRED）| manual（宣告 · 已收 / CLEARED · 收存于档案）
 * 低动效：直出终态（各段无位移，仅淡入）。
 */
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { OverlayProps } from '@blue/registry/types';
import { Portal, useEscape, useScrollLock } from '@blue/kit';
import { useLowMotion } from '@blue/lib/prefs';
import { Caustics, BubbleShape } from '@blue/fx/motifs';

type Reason = 'auto_todos' | 'auto_date' | 'manual';
const LETTERS = ['✦', ' ', 'C', 'A', 'L', 'L', 'I', 'N', 'G', ' ', 'C', 'A', 'R', 'D', ' ', '✦'];
const CARDS: Record<Reason, { icon: string; title: string; subtitle: string; days: string }> = {
  auto_todos: { icon: '★', title: '期末周通关', subtitle: '五门考试，一门不落', days: '关联任务 6 / 6 · 提前 3 天' },
  auto_date: { icon: '☾', title: '夏日祭', subtitle: '和大家一起去看烟花', days: '目标日 2026-10-21 · 已到来' },
  manual: { icon: '◆', title: '学会游泳', subtitle: '先收进档案，夏天再来', days: '手动收存 · 进度 3 / 5' },
};
/* 真实 CUTIN_SKIN.p3 token（src 原值；洋红贴角改臂章红） */
const S = {
  bg: 'linear-gradient(150deg, #061437 0%, #0a2358 52%, #02060f 100%)',
  flash: 'rgba(53,209,232,0.55)', flashSoft: 'rgba(27,87,255,0.28)',
  eyebrowInk: 'rgba(207,234,246,0.75)', headInk: '#ffffff', headShadow: '0 4px 26px rgba(53,209,232,0.6)', hintInk: 'rgba(207,234,246,0.72)',
  panelBg: 'rgba(255,255,255,0.95)', panelClip: 'polygon(20px 0, 100% 0, calc(100% - 20px) 100%, 0 100%)', panelShadow: '0 22px 50px rgba(3,20,58,0.6)',
  titleInk: '#0a3bd6', subInk: '#3d4a66', iconInk: '#35d1e8',
  particle: '#7fe3f4', btnBg: '#1b57ff', btnDoneBg: 'rgba(27,87,255,0.35)', ghostBg: 'rgba(255,255,255,0.1)', ghostInk: 'rgba(226,242,250,0.85)', signInk: 'rgba(207,234,246,0.6)',
};
const STAMP_BG: Record<Reason, string> = { auto_todos: '#1b57ff', auto_date: '#e8283c', manual: '#0b7d96' };
const BTN_CLIP = 'polygon(12px 0, 100% 0, calc(100% - 12px) 100%, 0 100%)';

export default function CallingCardCutIn({ open, onClose, params }: OverlayProps) {
  const low = useLowMotion();
  useScrollLock(open);
  useEscape(open, onClose);
  const r = params?.get('reason') ?? params?.get('variant');
  const reason: Reason = r === 'auto_date' || r === 'expired' ? 'auto_date' : r === 'manual' || r === 'archived' ? 'manual' : 'auto_todos';
  const card = CARDS[reason];
  const [ledger, setLedger] = useState<'idle' | 'writing' | 'done'>('idle');
  const [landed, setLanded] = useState(false);
  useEffect(() => {
    if (!open) { setLanded(false); return; }
    setLedger('idle');
    const t = setTimeout(() => setLanded(true), low ? 0 : 1050);
    return () => clearTimeout(t);
  }, [open, low]);
  const head = reason === 'auto_date' ? '宣告 · 时之至' : reason === 'auto_todos' ? '宣告 · 达成' : '宣告 · 已收';
  const hint = reason === 'auto_date' ? '约定的那一日已经到来。' : reason === 'auto_todos' ? '所有任务已被你跨过。' : '收存于档案。';
  const stamp = reason === 'auto_date' ? 'EXPIRED' : 'CLEARED';
  const d = (s: number) => (low ? 0 : s);
  const particles = useMemo(() => Array.from({ length: 14 }).map((_, i) => ({ id: i, left: (i * 37 + 11) % 100, size: 1.5 + ((i * 7) % 5) * 0.6, dur: 5 + (i % 5), delay: (i % 7) * 0.3, op: 0.25 + (i % 4) * 0.1 })), []);
  const dust = useMemo(() => Array.from({ length: 8 }).map((_, i) => { const a = (i / 8) * Math.PI * 2 + 0.2; return { id: i, x: Math.cos(a) * (60 + (i % 3) * 18), y: Math.sin(a) * (60 + (i % 3) * 18), size: 2 + (i % 3), dur: 0.6 + (i % 3) * 0.1 }; }), []);

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div key={`cc-${reason}`} role="dialog" aria-modal="true" aria-label={`宣告卡 · ${head.split(' · ')[1]}`} onClick={onClose}
            className="fixed inset-0 flex items-center justify-center overflow-hidden p-6 [@media(max-height:500px)]:py-3" style={{ zIndex: 'var(--p3r-z-cutin)' as unknown as number }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            {/* ① 底 + 冲击波 + 慢呼吸 */}
            <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: S.bg }} />
            <motion.div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(circle at center, ${S.flash} 0%, transparent 55%)` }}
              initial={low ? { opacity: 0.5 } : { opacity: 0, scale: 0.4 }} animate={low ? { opacity: 0.5 } : { opacity: [0, 0.85, 0.4, 0.5], scale: [0.4, 1.4, 1, 1.05] }} transition={{ duration: 1.4, ease: 'easeOut' }} />
            {!low && <motion.div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(circle at center, ${S.flashSoft} 0%, transparent 55%)` }} animate={{ opacity: [0.3, 0.55, 0.3] }} transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }} />}
            {/* 底纹：步进焦散（真实 texture: 'caustics'），自上滑入 */}
            <motion.div aria-hidden className="pointer-events-none absolute inset-0" initial={low ? { opacity: 0.6 } : { opacity: 0, y: -30 }} animate={{ opacity: 0.6, y: 0 }} transition={{ duration: 0.8, delay: d(0.15), ease: 'easeOut' }}>
              <Caustics opacity={0.5} fps={3} scale={1.3} />
            </motion.div>
            {/* 浮升粒子 */}
            {!low && (
              <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                {particles.map((p) => (
                  <motion.span key={p.id} className="absolute" style={{ left: `${p.left}%`, bottom: -8, width: p.size * 4, height: p.size * 4, opacity: p.op + 0.2 }}
                    animate={{ y: [0, -900] }} transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: (t: number) => Math.floor(t * 24) / 24 }}><BubbleShape fill={S.particle} /></motion.span>
                ))}
              </div>
            )}

            {/* 内容（SLAM 后相机抖动） */}
            <motion.div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md text-center"
              initial={low ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.92 }}
              animate={landed && !low ? { opacity: 1, y: 0, scale: 1, x: [0, -3, 3, -2, 2, 0] } : { opacity: 1, y: 0, scale: 1 }}
              transition={{ opacity: { duration: 0.4, delay: d(0.1) }, y: { type: 'spring', damping: 18, delay: d(0.1) }, scale: { type: 'spring', damping: 18, delay: d(0.1) }, x: { duration: 0.35, ease: 'easeOut' } }}>
              {/* ② 眉标逐字 */}
              <div className="mb-2 flex justify-center font-cond text-[11px] [@media(max-height:500px)]:mb-1" style={{ color: S.eyebrowInk, letterSpacing: '6px' }} aria-label="CALLING CARD">
                {LETTERS.map((ch, i) => (
                  <motion.span key={`l${i}`} aria-hidden className="inline-block" style={{ minWidth: ch === ' ' ? '0.4em' : undefined }}
                    initial={low ? false : { opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: 0.25 + i * 0.025 }}>{ch === ' ' ? '\u00a0' : ch}</motion.span>
                ))}
              </div>
              {/* ③ 大字 shutter */}
              <motion.h1 className="mb-1 font-heavy text-[clamp(40px,12vw,56px)] leading-[1.05] [@media(max-height:500px)]:text-[34px]" style={{ color: S.headInk, textShadow: S.headShadow }}
                initial={low ? { opacity: 0 } : { opacity: 0, clipPath: 'inset(0 100% 0 0)' }} animate={{ opacity: 1, clipPath: 'inset(-10% -4% -10% -4%)' }} transition={{ duration: 0.55, delay: d(0.45), ease: [0.2, 0.8, 0.2, 1] }}>
                {head}
              </motion.h1>
              <motion.div className="mb-6 text-[14px] font-bold [@media(max-height:500px)]:mb-3 [@media(max-height:500px)]:text-[13px]" style={{ color: S.hintInk }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: d(0.65) }}>{hint}</motion.div>

              {/* ④ 卡身（硬斜切白卡，印章悬于其上） */}
              <motion.div className="relative mx-auto mb-6 max-w-[340px] [@media(max-height:500px)]:mb-3 [@media(max-height:500px)]:!py-3" style={{ padding: '20px 30px', isolation: 'isolate', filter: `drop-shadow(${S.panelShadow.replace(/^0 /, '0px ')})` }}
                initial={low ? { opacity: 0 } : { opacity: 0, scale: 0.85, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', damping: 16, delay: d(0.75) }}>
                <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: S.panelBg, clipPath: S.panelClip }} />
                <span aria-hidden className="pointer-events-none absolute left-0 top-0 h-[18px] w-[46px]" style={{ background: S.iconInk, clipPath: 'polygon(20px 0, 100% 0, 30px 100%, 0 100%)' }} />
                <span aria-hidden className="pointer-events-none absolute bottom-0 right-0 h-[14px] w-[40px]" style={{ background: '#e8283c', clipPath: 'polygon(10px 0, 100% 0, calc(100% - 20px) 100%, 0 100%)' }} />
                <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" style={{ clipPath: S.panelClip }}>
                  {!low && <motion.div className="absolute inset-0" style={{ background: `linear-gradient(115deg, transparent 30%, ${S.flash} 48%, rgba(255,255,255,0.55) 50%, ${S.flash} 52%, transparent 70%)` }}
                    initial={{ x: '-150%', opacity: 0 }} animate={{ x: '150%', opacity: [0, 0.7, 0] }} transition={{ duration: 0.9, delay: 0.95, ease: 'easeOut' }} />}
                </div>
                <motion.div className="relative mb-1 text-[26px]" style={{ color: S.iconInk }} initial={low ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.85 }}>{card.icon}</motion.div>
                <motion.div className="relative font-heavy text-[clamp(28px,8vw,36px)] leading-[1.1] [@media(max-height:500px)]:text-[26px]" style={{ color: S.titleInk }} initial={low ? false : { opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.9 }}>{card.title}</motion.div>
                <motion.div className="relative mt-2 text-[12px] font-bold italic" style={{ color: S.subInk }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: d(1.05) }}>「{card.subtitle}」</motion.div>
                <motion.div className="relative mt-2 font-cond text-[11px] tracking-wider" style={{ color: S.subInk }} initial={{ opacity: 0 }} animate={{ opacity: 0.85 }} transition={{ duration: 0.4, delay: d(1.15) }}>{card.days}</motion.div>
                {/* ⑤ 印章 SLAM */}
                <motion.div className="absolute -right-2 -top-3 px-3 py-1 font-cond text-[12px] tracking-[3px]" style={{ color: '#fff', border: `2px solid ${STAMP_BG[reason]}`, background: STAMP_BG[reason], boxShadow: '3px 3px 0 #0a1230' }}
                  initial={low ? { opacity: 0.96, rotate: -7 } : { opacity: 0, scale: 3, rotate: -28 }} animate={{ opacity: 0.96, scale: 1, rotate: -7 }} transition={{ type: 'spring', damping: 12, delay: d(1.05) }}>{stamp}</motion.div>
                {landed && !low && (
                  <>
                    <motion.div aria-hidden className="pointer-events-none absolute -right-2 -top-2 h-12 w-12" style={{ border: `2px solid ${STAMP_BG[reason]}`, transform: 'rotate(45deg)' }} initial={{ opacity: 0.7, scale: 0.4 }} animate={{ opacity: 0, scale: 4 }} transition={{ duration: 0.7, ease: 'easeOut' }} />
                    {dust.map((p) => <motion.span key={`d${p.id}`} aria-hidden className="pointer-events-none absolute right-0 top-0" style={{ width: p.size + 2, height: p.size + 4, background: S.particle, clipPath: 'polygon(50% 0, 100% 100%, 0 70%)' }} initial={{ opacity: 1, x: 0, y: 0 }} animate={{ opacity: 0, x: p.x, y: p.y, scale: 0.4 }} transition={{ duration: p.dur, ease: 'easeOut' }} />)}
                  </>
                )}
              </motion.div>

              {/* ⑥ 操作按钮 + 落款 */}
              <motion.div className="mx-auto flex max-w-[280px] flex-col gap-2" initial={low ? { opacity: 0 } : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: d(1.4) }}>
                <button type="button" disabled={ledger !== 'idle'} onClick={() => { setLedger('writing'); setTimeout(() => setLedger('done'), 900); }}
                  className="p6-press w-full py-3 text-[14px] font-black italic text-white" style={{ background: ledger === 'done' ? S.btnDoneBg : S.btnBg, opacity: ledger === 'done' ? 0.85 : 1, clipPath: BTN_CLIP }}>
                  {ledger === 'done' ? '✓ 已留下记录' : ledger === 'writing' ? '正在落墨…' : '留下记录'}
                </button>
                <button type="button" onClick={onClose} className="p6-press w-full py-2.5 text-[14px] font-bold" style={{ color: S.ghostInk, background: S.ghostBg, clipPath: BTN_CLIP }}>收下卡片</button>
              </motion.div>
              <motion.div className="mt-4 font-cond text-[15px] [@media(max-height:500px)]:mt-1" style={{ color: S.signInk }} initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} transition={{ duration: 0.5, delay: d(1.6) }}>─ Velvet</motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
