/**
 * 委托板（真实 src/components/quests/QuestBoardSheet.tsx）：
 * 「今日委托」（三张题库 + 一张 AI 写的 / 每天三张 · 左右滑着挑）卡片轮播（drag x）‹ 上一张 / 下一张 › + 页点「第 N 张（已加入）」；
 * 「加入今日任务」/「✓ 已加入今日任务」/「✓ 已完成」；「换一批（今天剩 N 次）/ 今天换不了了，明天再来」；
 * 「本周委托」：本周 M/D – M/D · 周一刷新、累计领取 N 次、说明条 +「知道了」、三张卡（+N SP、进度、领取 / ✓ 已领取 / 换一张 / 上周替你领的 / 换来的）、
 * 底部说明 + 成就「受人之托」：领取 N / 10。加载「正在按你的属性准备今日委托…」。
 * 直达：?state=loading（1.6s 加载）| locked（本周委托未解锁）。
 */
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@blue/registry/types';
import { P3Button, P3Empty, P3Loading, P3Progress, P3Sheet, P3Tag, useToast, P3R, slantClip, IconBack, IconChevron, IconClose } from '@blue/kit';
import { useBoldness } from '@blue/lib/prefs';
import { useActionsData, actionsOps } from '@blue/adapters/pkg2';
import { MiniHead } from '@blue/screens/pkg2/common';
import { useQuestBoard, useLifeQuests } from '@/components/quests/QuestBoardSheet';
import { questHint, questTitle } from '@/utils/questBoard';

export default function QuestBoardSheet({ open, onClose, params }: OverlayProps) {
  const low = !useBoldness();
  const toast = useToast();
  const { ATTR_NAMES, QUEST_NOTICE } = useActionsData();
  const board = useQuestBoard();
  const lifeState = useLifeQuests(open);
  const st = params?.get('state');
  const [loading, setLoading] = useState(st === 'loading');
  const [idx, setIdx] = useState(0);
  const [notice, setNotice] = useState(true);
  const [flash, setFlash] = useState<Record<string, number>>({});
  useEffect(() => { if (open && st === 'loading') { setLoading(true); const t = window.setTimeout(() => setLoading(false), 1600); return () => clearTimeout(t); } }, [open, st]);
  useEffect(() => { if (open) void actionsOps.refreshQuests(); }, [open]);
  const life = lifeState.items.map((q) => ({ id: q.presetId, title: q.title, desc: q.hint, attr: q.attribute, ai: q.ai, source: q }));
  const cur = life[idx];
  const curSt = cur ? lifeState.statusOf(cur.source) : 'new';
  const go = (d: number) => setIdx((i) => Math.max(0, Math.min(life.length - 1, i + d)));
  const quests = board.items.map((item) => item.quest);
  const questTitles = Object.fromEntries(board.items.map((item) => [item.quest.id, {
    title: questTitle(item.quest, board.attributeNames),
    desc: questHint(item.quest),
    progress: item.progress,
  }]));
  const claimedTotal = board.claimedTotal;
  const allClaimed = board.items.length > 0 && board.items.every((item) => item.claimed);
  const locked = st === 'locked' || !board.unlocked;
  return (
    <P3Sheet open={open} onClose={onClose} title="委托板" en="QUEST BOARD" size="tall">
      {/* 今日委托 */}
      <MiniHead title="今日委托" en="DAILY" />
      <div className="mb-2 mt-1 text-[12px] font-bold" style={{ color: P3R.grey }}>{life.some((q) => q.ai) ? '三张题库 + 一张 AI 写的' : '每天三张 · 左右滑着挑'}</div>
      {loading || lifeState.waiting ? <P3Loading block rows={2} text="正在按你的属性准备今日委托…" /> : !cur ? <P3Empty ghost="QUEST" text="今天的委托还没准备好" sub="稍后再打开看看" /> : (
        <>
          <div className="relative flex min-w-0 items-center gap-2">
            <button type="button" aria-label="上一张" disabled={idx === 0} onClick={() => go(-1)} className="flex h-12 w-8 shrink-0 items-center justify-center disabled:opacity-30" style={{ background: P3R.ink, color: 'var(--p3r-on-ink)', clipPath: slantClip(6) }}><IconBack size={14} /></button>
            <div className="relative min-w-0 flex-1 overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={cur.id + lifeState.rerollsLeft} drag={low ? false : 'x'} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.4}
                  onDragEnd={(_: unknown, info: PanInfo) => { if (info.offset.x < -50) go(1); else if (info.offset.x > 50) go(-1); }}
                  initial={low ? { opacity: 0 } : { opacity: 0, x: 40, rotate: 2 }} animate={{ opacity: 1, x: 0, rotate: 0 }} exit={low ? { opacity: 0 } : { opacity: 0, x: -40 }} transition={{ duration: 0.18 }}
                  className="relative cursor-grab overflow-hidden p-4 pl-5 active:cursor-grabbing" style={{ background: 'var(--p3r-sheet-grad)', clipPath: slantClip(14), boxShadow: 'inset 0 0 0 2px rgb(var(--p3r-blue-rgb) / 0.35)' }}>
                  <span aria-hidden className="absolute left-0 top-0 h-full w-[5px]" style={{ background: P3R.blue }} /><span aria-hidden className="pointer-events-none absolute -right-2 -top-3 font-cond text-[64px] leading-none" style={{ color: 'var(--p3r-ghost)' }}>QUEST</span>
                  <div className="flex items-center gap-2">
                    <P3Tag tone="ink">{ATTR_NAMES[cur.attr]}</P3Tag>
                    {cur.ai && <P3Tag tone="lilac">✦ AI</P3Tag>}
                    <span className="ml-auto font-cond text-[14px]" style={{ color: P3R.roseInk }}>{String(idx + 1).padStart(2, '0')}/{String(life.length).padStart(2, '0')}</span>
                  </div>
                  <div className="relative mt-2 break-words font-heavy text-[19px] leading-snug" style={{ color: P3R.ink }}>{cur.title}</div>
                  <div className="mt-1 text-[12px]" style={{ color: P3R.inkSoft }}>{cur.desc}</div>
                  <div className="mt-3">
                    {curSt === 'new' ? <P3Button block corner onClick={() => { void lifeState.add(cur.source); toast.success('已加入今日任务'); }}>加入今日任务</P3Button>
                      : <div className="py-2 text-center text-[15px] font-black" style={{ color: P3R.roseInk }}>{curSt === 'done' ? '✓ 已完成' : '✓ 已加入今日任务'}</div>}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
            <button type="button" aria-label="下一张" disabled={idx === life.length - 1} onClick={() => go(1)} className="flex h-12 w-8 shrink-0 items-center justify-center disabled:opacity-30" style={{ background: P3R.ink, color: 'var(--p3r-on-ink)', clipPath: slantClip(6) }}><IconChevron size={14} /></button>
          </div>
          <div className="mt-2 flex justify-center gap-1.5">
            {life.map((q, i) => { const s = lifeState.statusOf(q.source); return <button key={q.id} type="button" aria-label={`第 ${i + 1} 张${s !== 'new' ? '（已加入）' : ''}`} onClick={() => setIdx(i)} className="h-[7px] transition-all" style={{ width: i === idx ? 24 : 10, background: i === idx ? P3R.blue : s !== 'new' ? P3R.cyan : 'var(--p3r-track)', clipPath: slantClip(3) }} />; })}
          </div>
          <div className="mt-2 text-center">
            <button type="button" disabled={lifeState.rerollsLeft <= 0} onClick={() => { lifeState.reroll(); setIdx(0); }} className="text-[13px] font-black underline decoration-2 underline-offset-4 disabled:no-underline disabled:opacity-50" style={{ color: P3R.roseInk }}>
              {lifeState.rerollsLeft <= 0 ? '今天换不了了，明天再来' : lifeState.rerollsLeft < 3 ? `换一批（今天剩 ${lifeState.rerollsLeft} 次）` : '换一批'}
            </button>
          </div>
        </>
      )}

      {/* 本周委托 */}
      <MiniHead className="mt-6" title="本周委托" en="WEEKLY" />
      {locked ? (
        <div className="mt-2 px-4 py-3 text-[13px] font-bold" style={{ background: P3R.cyanFaint, color: P3R.inkSoft, clipPath: slantClip(10) }}>自己记满 7 天、10 条记录后解锁：每周一刷新三张，做完来领 SP。</div>
      ) : (
        <>
          <div className="mt-2 flex items-baseline justify-between gap-2 text-[12px] font-bold" style={{ color: P3R.grey }}>
            <span className="min-w-0 truncate">本周 {board.range.days[0].slice(5).replace('-', '/')} – {board.range.days[6].slice(5).replace('-', '/')} · 周一刷新</span>
            <span className="shrink-0 font-cond text-[13px]">累计领取 {claimedTotal} 次</span>
          </div>
          <AnimatePresence>
            {notice && QUEST_NOTICE && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-2 flex items-start gap-2 px-4 py-2 text-[12px] font-bold" style={{ background: P3R.ink, color: 'var(--p3r-on-ink)', clipPath: slantClip(8) }}>
                <span className="min-w-0 flex-1">{QUEST_NOTICE}</span>
                <button type="button" onClick={() => { setNotice(false); actionsOps.clearQuestNotice(); }} aria-label="知道了" className="shrink-0 font-black" style={{ color: P3R.blue }}>知道了 <IconClose size={10} className="inline" /></button>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="mt-3 grid grid-cols-1 gap-2.5">
            {quests.map((q) => {
              const meta = questTitles[q.id] ?? { title: '委托', desc: '', progress: 0 };
              const done = meta.progress >= q.target;
              const claimed = !!q.claimedAt || !!q.autoClaimed;
              return (
                <div key={q.id} className="relative min-w-0 overflow-hidden px-4 py-3" style={{ background: claimed ? 'var(--p3r-row-alt)' : P3R.panel, clipPath: slantClip(12) }}>
                  <div className="flex min-w-0 items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <span className="min-w-0 truncate text-[15px] font-black" style={{ color: P3R.ink }}>{meta.title}</span>
                        <P3Tag tone="lilac">+{q.rewardSp} SP</P3Tag>
                      </div>
                      <div className="text-[12px]" style={{ color: P3R.grey }}>{meta.desc}</div>
                      <div className="flex gap-2">
                        {q.autoClaimed && <span className="text-[11px] font-bold" style={{ color: P3R.lilacInk }}>上周替你领的</span>}
                        {q.swapped && <span className="text-[11px] font-bold" style={{ color: P3R.lilacInk }}>换来的</span>}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {claimed ? <span className="text-[13px] font-black" style={{ color: P3R.roseInk }}>✓ 已领取</span>
                        : done ? <P3Button size="sm" corner onClick={() => { void actionsOps.claimQuest(q.id).then((res) => { if (res.ok) setFlash((f) => ({ ...f, [q.id]: res.sp })); }); }}>领取</P3Button>
                          : <span className="font-cond text-[15px]" style={{ color: P3R.ink }}>{meta.progress}/{q.target}</span>}
                      {!board.items.some((item) => item.quest.swapped) && !done && !claimed && <button type="button" onClick={() => { void actionsOps.swapQuest(q.id); }} className="text-[11px] font-black underline" style={{ color: P3R.grey }}>换一张</button>}
                    </div>
                  </div>
                  <P3Progress className="mt-2" value={Math.min(meta.progress, q.target)} max={q.target} variant="segments" />
                  <AnimatePresence>{flash[q.id] && <motion.span initial={{ opacity: 0, y: 6, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} onAnimationComplete={() => window.setTimeout(() => setFlash((f) => { const n = { ...f }; delete n[q.id]; return n; }), 900)} className="absolute right-3 top-2 px-2 font-cond text-[17px]" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(5) }}>+{flash[q.id]} SP</motion.span>}</AnimatePresence>
                </div>
              );
            })}
            <div className="text-right text-[11px] font-bold" style={{ color: P3R.grey }}>{board.items.some((item) => item.quest.swapped) ? '本周的「换一张」用过了，下周一再来' : '不想做的那张可以「换一张」，每周一次'}</div>
          </div>
          <div className="mt-4 text-center text-[11px] font-bold leading-relaxed" style={{ color: P3R.grey }}>
            {allClaimed ? '本周三张都收下了，岁时册里多了一枚「委托全清」。' : '做完的委托要自己来领；上周没领的，下周一会替你领。'}<br />
            成就「受人之托」：领取 {Math.min(claimedTotal, 10)} / 10
          </div>
        </>
      )}
    </P3Sheet>
  );
}
