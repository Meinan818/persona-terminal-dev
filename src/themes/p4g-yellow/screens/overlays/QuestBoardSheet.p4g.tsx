/**
 * 委托板（真实 src/components/quests/QuestBoardSheet.tsx）：
 * 「今日委托」（三张题库 + 一张 AI 写的 / 每天三张 · 左右滑着挑）卡片轮播（drag x）‹ 上一张 / 下一张 › + 页点「第 N 张（已加入）」；
 * 「加入今日任务」/「✓ 已加入今日任务」/「✓ 已完成」；「换一批（今天剩 N 次）/ 今天换不了了，明天再来」；
 * 「本周委托」：本周 M/D – M/D · 周一刷新、累计领取 N 次、说明条 + ×「知道了」、三张卡（+N SP、进度、领取 / ✓ 已领取 / 换一张 / 上周替你领的 / 换来的）、
 * 换一张说明、底部说明 + 成就「受人之托」：领取 N / 10。?state=loading|locked
 */
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Button, P4Loading, P4Progress, P4Sheet, IconBack, IconChevron, IconClose, useToast } from '@yellow/kit';
import { useLowMotion } from '@yellow/lib/prefs';
import { cx } from '@yellow/lib/cx';
import { ATTR_NAMES, LIFE_QUESTS, QUESTS, QUEST_TITLES } from '@yellow/adapters/pkg2';
import { BlockHead } from '@yellow/screens/pkg2/common';

export default function QuestBoardSheet({ open, onClose, params }: OverlayProps) {
  const low = useLowMotion();
  const toast = useToast();
  const st = params?.get('state');
  const [loading, setLoading] = useState(st === 'loading');
  const [idx, setIdx] = useState(0);
  const [status, setStatus] = useState<Record<string, 'new' | 'added' | 'done'>>({ lq3: 'done' });
  const [rerolls, setRerolls] = useState(2);
  const [batch, setBatch] = useState(0);
  const [quests, setQuests] = useState(QUESTS);
  const [swapUsed, setSwapUsed] = useState(false);
  const [notice, setNotice] = useState(true);
  const [flash, setFlash] = useState<Record<string, number>>({});
  useEffect(() => { if (open && st === 'loading') { setLoading(true); const t = setTimeout(() => setLoading(false), 1600); return () => clearTimeout(t); } }, [open, st]);
  const life = LIFE_QUESTS.map((q) => ({ ...q, title: batch ? `${q.title}（新）` : q.title }));
  const cur = life[idx];
  const curSt = status[cur.id] ?? 'new';
  const go = (d: number) => setIdx((i) => Math.max(0, Math.min(life.length - 1, i + d)));
  const claimedTotal = 7 + quests.filter((q) => q.claimedAt).length - 1;
  const allClaimed = quests.every((q) => q.claimedAt || q.autoClaimed);
  const locked = st === 'locked';
  return (
    <P4Sheet open={open} onClose={onClose} title="委托板" en="QUEST BOARD" size="tall">
      {/* 今日委托 */}
      <BlockHead title="今日委托" en="DAILY" />
      <div className="-mt-1 mb-2 text-cap font-bold text-p4g-ink-soft">{life.some((q) => q.ai) ? '三张题库 + 一张 AI 写的' : '每天三张 · 左右滑着挑'}</div>
      {loading ? <P4Loading label="正在按你的属性准备今日委托…" /> : (
        <>
          <div className="relative flex min-w-0 items-center gap-2">
            <button type="button" aria-label="上一张" disabled={idx === 0} onClick={() => go(-1)} className="flex h-10 w-8 shrink-0 items-center justify-center rounded-xs bg-p4g-black text-p4g-yellow disabled:opacity-30 night:bg-p4g-yellow night:text-p4g-black"><IconBack size={14} /></button>
            <div className="relative min-w-0 flex-1 overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={cur.id + batch} drag={low ? false : 'x'} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.4}
                  onDragEnd={(_: unknown, info: PanInfo) => { if (info.offset.x < -50) go(1); else if (info.offset.x > 50) go(-1); }}
                  initial={low ? { opacity: 0 } : { opacity: 0, x: 40, rotate: 2 }} animate={{ opacity: 1, x: 0, rotate: 0 }} exit={low ? { opacity: 0 } : { opacity: 0, x: -40 }} transition={{ duration: 0.18 }}
                  className="relative cursor-grab overflow-hidden rounded-sm border-3 border-p4g-black bg-p4g-yellow p-4 text-p4g-black shadow-hard active:cursor-grabbing">
                  <div aria-hidden className="absolute -right-8 -top-8 h-24 w-24 rotate-45 bg-p4g-black/10" />
                  <div className="flex items-center gap-2">
                    <span className="rounded-xs bg-p4g-black px-1.5 font-display text-2xs font-bold text-p4g-yellow">{ATTR_NAMES[cur.attr]}</span>
                    {cur.ai && <span className="rounded-xs bg-p4g-orange px-1.5 font-display text-2xs font-bold">✦ AI</span>}
                    <span className="ml-auto p4g-num text-meta">{String(idx + 1).padStart(2, '0')}/{String(life.length).padStart(2, '0')}</span>
                  </div>
                  <div className="mt-2 break-words font-display text-h3 font-bold leading-snug">{cur.title}</div>
                  <div className="mt-1 text-meta opacity-75">{cur.desc}</div>
                  <div className="mt-3">
                    {curSt === 'new' ? <P4Button block variant="black" onClick={() => { setStatus((s) => ({ ...s, [cur.id]: 'added' })); toast.success('已加入今日任务'); }}>加入今日任务</P4Button>
                      : <div className="py-2 text-center font-display text-body font-black">{curSt === 'done' ? '✓ 已完成' : '✓ 已加入今日任务'}</div>}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
            <button type="button" aria-label="下一张" disabled={idx === life.length - 1} onClick={() => go(1)} className="flex h-10 w-8 shrink-0 items-center justify-center rounded-xs bg-p4g-black text-p4g-yellow disabled:opacity-30 night:bg-p4g-yellow night:text-p4g-black"><IconChevron size={14} /></button>
          </div>
          <div className="mt-2 flex justify-center gap-1.5">
            {life.map((q, i) => { const s = status[q.id] ?? 'new'; return <button key={q.id} type="button" aria-label={`第 ${i + 1} 张${s !== 'new' ? '（已加入）' : ''}`} onClick={() => setIdx(i)} className={cx('h-2.5 border-2 border-p4g-line transition-all', i === idx ? 'w-6 bg-p4g-orange' : s !== 'new' ? 'w-2.5 bg-p4g-line' : 'w-2.5')} />; })}
          </div>
          <div className="mt-2 text-center">
            <button type="button" disabled={rerolls <= 0} onClick={() => { setRerolls((r) => r - 1); setBatch((b) => b + 1); setIdx(0); setStatus({}); }} className="font-display text-meta font-bold text-p4g-ink underline decoration-p4g-orange decoration-[3px] underline-offset-4 disabled:no-underline disabled:opacity-50">
              {rerolls <= 0 ? '今天换不了了，明天再来' : rerolls < 3 ? `换一批（今天剩 ${rerolls} 次）` : '换一批'}
            </button>
          </div>
        </>
      )}

      {/* 本周委托 */}
      <div className="mt-5"><BlockHead title="本周委托" en="WEEKLY" /></div>
      {locked ? (
        <div className="rounded-sm border-3 border-p4g-line bg-p4g-surface px-3 py-3 text-meta font-bold text-p4g-ink-soft">自己记满 7 天、10 条记录后解锁：每周一刷新三张，做完来领 SP。</div>
      ) : (
        <>
          <div className="flex items-baseline justify-between gap-2 text-meta font-bold text-p4g-ink-soft">
            <span className="min-w-0 truncate">本周 10/19 – 10/25 · 周一刷新</span>
            <span className="shrink-0 p4g-num text-cap">累计领取 {claimedTotal} 次</span>
          </div>
          <AnimatePresence>
            {notice && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-2 flex items-start gap-2 rounded-sm bg-p4g-msg px-3 py-2 text-meta font-bold text-[color:var(--p4g-msg-ink)]">
                <span className="min-w-0 flex-1">有几项属性名是你自己起的，题库对不上就先不出这几类；配好 AI 服务后会自动对好。</span>
                <button type="button" onClick={() => setNotice(false)} aria-label="知道了" className="shrink-0 text-p4g-yellow"><IconClose size={12} /></button>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="mt-3 grid grid-cols-1 gap-2.5">
            {quests.map((q) => {
              const meta = QUEST_TITLES[q.id] ?? { title: '记 3 条「温柔」', desc: '换来的一张', progress: 0 };
              const done = meta.progress >= q.target;
              const claimed = !!q.claimedAt || !!q.autoClaimed;
              return (
                <div key={q.id} className={cx('relative min-w-0 overflow-hidden rounded-sm border-3 border-p4g-black p-3 shadow-hard-sm night:border-p4g-yellow', claimed ? 'bg-p4g-surface-2' : 'bg-p4g-surface')}>
                  <div className="flex min-w-0 items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <span className="min-w-0 truncate font-display text-body font-bold text-p4g-ink">{meta.title}</span>
                        <span className="shrink-0 rounded-xs bg-p4g-cyan px-1.5 p4g-num text-cap text-p4g-black">+{q.rewardSp} SP</span>
                      </div>
                      <div className="text-cap text-p4g-ink-soft">{meta.desc}</div>
                      <div className="flex gap-2">
                        {q.autoClaimed && <span className="text-2xs font-bold text-p4g-ink-soft">上周替你领的</span>}
                        {q.swapped && <span className="text-2xs font-bold text-p4g-ink-soft">换来的</span>}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {claimed ? <span className="font-display text-meta font-black text-p4g-orange-deep night:text-p4g-orange">✓ 已领取</span>
                        : done ? <P4Button size="sm" onClick={() => { setQuests((l) => l.map((x) => (x.id === q.id ? { ...x, claimedAt: '2026-10-20' } : x))); setFlash((f) => ({ ...f, [q.id]: q.rewardSp })); }}>领取</P4Button>
                          : <span className="p4g-num text-meta text-p4g-ink">{meta.progress}/{q.target}</span>}
                      {!swapUsed && !done && !claimed && <button type="button" onClick={() => { setSwapUsed(true); setQuests((l) => l.map((x) => (x.id === q.id ? { ...x, id: `${x.id}-s`, swapped: true, templateId: 'important_2' } : x))); }} className="font-display text-cap font-bold text-p4g-ink-soft underline">换一张</button>}
                    </div>
                  </div>
                  <P4Progress className="mt-2" value={Math.min(meta.progress, q.target)} max={q.target} variant="segments" segments={Math.min(q.target, 10)} />
                  <AnimatePresence>{flash[q.id] && <motion.span initial={{ opacity: 0, y: 6, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} onAnimationComplete={() => setTimeout(() => setFlash((f) => { const n = { ...f }; delete n[q.id]; return n; }), 900)} className="absolute right-3 top-2 rounded-xs bg-p4g-orange px-2 p4g-num text-lead text-p4g-black">+{flash[q.id]} SP</motion.span>}</AnimatePresence>
                </div>
              );
            })}
            <div className="text-right text-cap font-bold text-p4g-ink-soft">{swapUsed ? '本周的「换一张」用过了，下周一再来' : '不想做的那张可以「换一张」，每周一次'}</div>
          </div>
          <div className="mt-4 text-center text-cap font-bold leading-relaxed text-p4g-ink-soft">
            {allClaimed ? '本周三张都收下了，岁时册里多了一枚「委托全清」。' : '做完的委托要自己来领；上周没领的，下周一会替你领。'}<br />
            成就「受人之托」：领取 {Math.min(claimedTotal, 10)} / 10
          </div>
        </>
      )}
    </P4Sheet>
  );
}
