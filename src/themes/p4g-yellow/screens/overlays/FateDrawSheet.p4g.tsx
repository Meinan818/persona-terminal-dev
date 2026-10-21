/**
 * 命运抽签抽屉（真实 src/components/fate/FateDrawSheet.tsx）：
 * 闸门：「不知道做什么好？」「命运会替你选择」+ 三/四源开关（今日待办 / 愿望 / 旧事 / 委托）+ 卡背扇 +「N 张候选在池中」/「命运的力量正在苏醒…请多记录几条再来」+「抽一张」「今天先不抽」
 * 洗牌（1s，不可打断）→ 揭示：翻面卡（今日待办 / 愿望纸片 / 旧日回响 / 今日委托 + 说明）「完成它会有额外奖励」+「去完成」「再想想」「以后别抽这件」+「关闭会重新抽取其他的可能性」。
 * 背景：午夜频道雪花 + 弹幕层（长按反馈）。?state=empty 空池；?step=reveal 直接揭示。今日委托 →「去完成」打开委托板。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Button, P4Outline, Portal, useEscape, useScrollLock, useToast } from '@yellow/kit';
import { NoiseLayer, TVFlash } from '@yellow/fx';
import { useLowMotion } from '@yellow/lib/prefs';
import { cx } from '@yellow/lib/cx';
import type { FateCandidate } from '@/types';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '@/store';
import { DANMAKU } from '@yellow/adapters/pkg2';
import { DanmakuStrip } from '@yellow/screens/pkg2/Danmaku';

type Kind = 'todo' | 'wish' | 'history' | 'quest';
const SOURCE_LABEL: Record<Kind, string> = { todo: '今日待办', wish: '愿望', history: '旧事', quest: '委托' };
const KIND_COPY: Record<Kind, { tag: string; hint: string }> = {
  todo: { tag: '今日待办', hint: '可能性的辉光折射出了新的方向' },
  wish: { tag: '愿望纸片', hint: '接住就转正成今天的任务，纸片功成身退' },
  history: { tag: '旧日回响', hint: '你做过的事，再做一次不需要勇气' },
  quest: { tag: '今日委托', hint: '委托板今天给的新鲜事，接住就进今日任务' },
};
const CardBack = ({ style, className }: { style?: React.CSSProperties; className?: string }) => (
  <div className={cx('absolute left-1/2 top-0 h-[150px] w-[100px] rounded-sm border-3 border-p4g-black bg-p4g-yellow shadow-hard', className)} style={style}>
    <div className="absolute inset-1.5 border-2 border-p4g-black" style={{ background: 'repeating-linear-gradient(45deg, rgba(0,0,0,.85) 0 6px, transparent 6px 12px)' }} />
    <div className="absolute inset-0 flex items-center justify-center"><span className="rounded-full border-3 border-p4g-black bg-p4g-yellow px-2 font-display text-h3 font-black text-p4g-black">?</span></div>
  </div>
);

export default function FateDrawSheet({ open, onClose, params, onGo }: OverlayProps & { onGo?: (kind: Kind, title: string) => void }) {
  const { getFateDrawPool, drawFate, acceptFateDraw, muteFateHistory } = useAppStore(useShallow((s) => ({
    getFateDrawPool: s.getFateDrawPool,
    drawFate: s.drawFate,
    acceptFateDraw: s.acceptFateDraw,
    muteFateHistory: s.muteFateHistory,
  })));
  const low = useLowMotion();
  const toast = useToast();
  const empty = params?.get('state') === 'empty';
  const [sources, setSources] = useState<Record<Kind, boolean>>({ todo: true, wish: true, history: true, quest: true });
  const [banned, setBanned] = useState<string[]>([]);
  const [phase, setPhase] = useState<'gate' | 'spin' | 'reveal'>('gate');
  const [picked, setPicked] = useState<FateCandidate | null>(null);
  const [busy, setBusy] = useState(false);
  const pool = useMemo(() => (empty ? [] : getFateDrawPool().filter((c) => sources[c.kind] && !banned.includes(c.key))), [sources, banned, empty, getFateDrawPool, phase]);
  useEffect(() => {
    if (!open) return;
    if (params?.get('step') === 'reveal' && !empty) {
      const first = getFateDrawPool()[0] ?? null;
      setPicked(first);
      setPhase(first ? 'reveal' : 'gate');
    } else {
      setPhase('gate');
      setPicked(null);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useScrollLock(open);
  const close = () => { if (phase === 'spin') return; onClose(); };
  useEscape(open, close);
  const draw = async () => {
    if (!pool.length || busy) return;
    setBusy(true);
    try {
      const p = await drawFate(pool);
      if (!p) return;
      setPicked(p);
      if (low) { setPhase('reveal'); return; }
      setPhase('spin');
      window.setTimeout(() => { setPhase('reveal'); setBusy(false); }, 1050);
    } finally {
      if (low) setBusy(false);
    }
  };
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div key="fate" className="fixed inset-0 flex items-end justify-center wide:items-center wide:p-6" style={{ zIndex: 'var(--p4g-z-sheet)' as unknown as number }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-[color:var(--p4g-scrim)]" onClick={close} />
            <motion.div role="dialog" aria-modal="true" aria-label="命运抽签"
              className="relative flex max-h-[92vh] w-full max-w-[560px] min-w-0 flex-col overflow-hidden border-3 border-b-0 border-p4g-yellow bg-p4g-black text-white wide:border-b-3"
              initial={low ? { opacity: 0 } : { scaleY: 0.01, opacity: 0 }} animate={low ? { opacity: 1 } : { scaleY: [0.01, 0.01, 1], opacity: [0, 1, 1] }} exit={low ? { opacity: 0 } : { scaleY: 0.01, opacity: 0 }} transition={{ duration: 0.36, times: [0, 0.35, 1] }}>
              <NoiseLayer opacity={0.12} />
              <div aria-hidden className="relative h-3 shrink-0 p4g-candy-h" />
              <div className="relative min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-5" style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
                <AnimatePresence mode="wait">
                  {phase === 'gate' && (
                    <motion.div key="gate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center text-center">
                      <P4Outline as="h2" size="clamp(26px,7.5vw,36px)" stroke={6} fill="var(--p4g-yellow)" strokeColor="#000" italic>不知道做什么好？</P4Outline>
                      <p className="mt-1 font-display text-lead font-bold text-white/85">命运会替你选择</p>
                      <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                        {(Object.keys(SOURCE_LABEL) as Kind[]).map((k) => (
                          <button key={k} type="button" onClick={() => setSources((s) => ({ ...s, [k]: !s[k] }))} aria-pressed={sources[k]}
                            className={cx('rounded-xs border-thin px-2.5 py-1 font-display text-meta font-bold', sources[k] ? 'border-p4g-yellow bg-p4g-yellow text-p4g-black' : 'border-white/40 text-white/60')}>{SOURCE_LABEL[k]}</button>
                        ))}
                      </div>
                      <div className="relative mt-6 h-[170px] w-full">
                        {pool.slice(0, 7).map((c, i, arr) => { const off = i - (arr.length - 1) / 2; return <CardBack key={c.key} style={{ transform: `translateX(calc(-50% + ${off * 30}px)) rotate(${off * 7}deg)`, transformOrigin: '50% 130%' }} />; })}
                        {pool.length === 0 && <p className="pt-10 text-body text-white/55">命运的力量正在苏醒…请多记录几条再来</p>}
                      </div>
                      <div className="mt-1 h-4 text-cap text-white/50">{pool.length > 0 ? `${pool.length} 张候选在池中` : ''}</div>
                      <P4Button size="lg" className="mt-3 min-w-[200px]" disabled={pool.length === 0} onClick={draw}>抽一张</P4Button>
                      <button type="button" onClick={close} className="mt-3 font-display text-body font-bold text-white/70 underline decoration-p4g-orange decoration-[3px] underline-offset-4">今天先不抽</button>
                    </motion.div>
                  )}
                  {phase === 'spin' && (
                    <motion.div key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative h-[260px]">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <motion.div key={i} className="absolute left-1/2 top-12" animate={{ rotate: [i * 4 - 8, -(i * 3) + 6, i * 5 - 10, 0], x: [0, i % 2 ? 14 : -14, i % 2 ? -10 : 10, 0], y: [0, -6, 4, 0] }} transition={{ duration: 1.05, ease: 'easeInOut' }}>
                          <CardBack />
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                  {phase === 'reveal' && picked && (
                    <motion.div key="reveal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center text-center">
                      <motion.div initial={low ? false : { rotateY: 90, scale: 0.9 }} animate={{ rotateY: 0, scale: 1 }} transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }} style={{ transformPerspective: 700 }}
                        className="relative w-full max-w-[300px] border-[4px] border-p4g-black bg-p4g-cream px-5 pb-5 pt-4 text-p4g-black shadow-[8px_8px_0_var(--p4g-orange)]">
                        <span className="inline-block rounded-xs bg-p4g-black px-2 py-0.5 font-display text-meta font-bold text-p4g-yellow">{KIND_COPY[picked.kind].tag}</span>
                        <div className="mt-3 break-words font-display text-h2 font-black leading-snug">{picked.title}</div>
                        <p className="mt-2 text-meta text-p4g-black/70">{picked.kind === 'history' && picked.historyDays && picked.lastDaysAgo !== undefined ? `这两个月做过 ${picked.historyDays} 次，上次是 ${picked.lastDaysAgo} 天前，再做一次不需要勇气` : KIND_COPY[picked.kind].hint}</p>
                        <TVFlash low={low} />
                      </motion.div>
                      <p className="mt-4 font-display text-body font-bold text-p4g-yellow">完成它会有额外奖励</p>
                      <div className="mt-3 flex w-full max-w-[320px] gap-3">
                        <P4Button block size="lg" disabled={busy} onClick={async () => {
                          if (busy) return;
                          setBusy(true);
                          try {
                            await acceptFateDraw(picked);
                            onClose();
                            onGo?.(picked.kind, picked.title);
                            toast.success('已加入今日任务 · ✦ 签');
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : '接住失败，请重试');
                          } finally {
                            setBusy(false);
                          }
                        }}>去完成</P4Button>
                        <P4Button block size="lg" variant="secondary" onClick={close}>再想想</P4Button>
                      </div>
                      <button type="button" onClick={async () => {
                        if (picked.kind === 'history') await muteFateHistory(picked);
                        else setBanned((b) => [...b, picked.key]);
                        toast('以后不会再抽到这件');
                        setPhase('gate');
                      }} className="mt-3 font-display text-meta font-bold text-white/60 underline underline-offset-4">以后别抽这件</button>
                      <p className="mt-3 text-cap text-white/45">关闭会重新抽取其他的可能性</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <DanmakuStrip items={DANMAKU.slice(0, 5).map((t, i) => ({ id: `f${i}`, text: t }))} tone="dark" topBase={4} topStep={8} durBase={14} durStep={5} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
