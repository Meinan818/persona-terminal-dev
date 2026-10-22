/**
 * 行动页（真实 src/pages/Actions.tsx 的 P4 分支）—— 记录 / 任务 合并宿主。
 *   · 切换头：衬线双词「记录 / 任务」，激活词放大 + 背后橙色太阳圆；ACTION PROGRAM 眉标；右上天空圆窗（这里换成 P4G 日期天气 HUD）。
 *   · 点击切换；切换头横滑（drag x，左滑 → 任务，右滑 → 记录）；底导/侧栏已在行动时再点「行动」→ 记录 ⇄ 任务（外壳 selectItem 实现）。
 *   · 子视图左右推（记录在左、任务在右）+ 跳台噪点 1 帧。
 * 路由：#/p/actions?tab=activities|todos（默认记录：真实 store actionsSubTab 默认值）。旧 id todos / activities 由外壳归一。
 */
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { Fragment, useEffect, useRef, useState } from 'react';
import type { PageProps } from '@yellow/registry/types';
import { navigate } from '@yellow/shell/shellBus';
import { useLowMotion } from '@yellow/lib/prefs';
import { ChannelNoise } from '@yellow/fx';
import { P4DateWeather } from '@yellow/kit';
import { useActionsData } from '@yellow/adapters/pkg2';
import { ActivitiesView } from './Activities.p4g';
import { TodosView } from './Todos.p4g';

type Sub = 'activities' | 'todos';
const TABS: { key: Sub; label: string; en: string }[] = [
  { key: 'activities', label: '记录', en: 'LOG' },
  { key: 'todos', label: '任务', en: 'QUEST' },
];

export default function Actions({ tab, params }: PageProps) {
  const { TODAY } = useActionsData();
  const low = useLowMotion();
  const sub: Sub = tab === 'todos' ? 'todos' : 'activities';
  const prev = useRef<Sub>(sub);
  const [noise, setNoise] = useState(false);
  useEffect(() => {
    if (prev.current !== sub) { prev.current = sub; if (!low) setNoise(true); }
  }, [sub, low]);

  const switchTab = (k: Sub) => { if (k !== sub) navigate('actions', k, { transition: 'none', replace: true }); };
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -40) switchTab('todos');
    else if (info.offset.x > 40) switchTab('activities');
  };
  const dir = sub === 'activities' ? -1 : 1;

  return (
    <div className="relative min-w-0">
      {/* ── 切换头 ── */}
      <header className="relative -mx-4 mb-3 px-4 wide:-mx-8 wide:px-8">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-4 h-[18px] p4g-candy-h wide:-top-8" />
        {/* 第一行：眉标 + 日期天气 HUD（P4G 右上角日历） */}
        <div className="relative flex min-w-0 items-start gap-3 pt-4">
          <div className="flex min-w-0 flex-1 items-center gap-2 pt-1">
            <span className="shrink-0 rounded-xs bg-p4g-black px-1.5 py-[2px] font-display text-2xs font-bold italic tracking-[0.22em] text-p4g-yellow night:bg-p4g-yellow night:text-p4g-black">ACTION&nbsp;&nbsp;PROGRAM</span>
            <span className="hidden min-w-0 truncate font-display text-cap font-bold italic tracking-[0.18em] text-[color:var(--p4g-on-stage)] opacity-80 min-[400px]:inline">{TABS.find((t) => t.key === sub)?.en}</span>
            <span aria-hidden className="h-[3px] min-w-[8px] flex-1 bg-[color:var(--p4g-on-stage)] opacity-60" />
          </div>
          <P4DateWeather date={TODAY} weather="rain" variant="hud" className="shrink-0" />
        </div>
        {/* 第二行：衬线双词切换头 */}
        <div className="relative mt-2 pl-4">
          <motion.div
            role="tablist"
            aria-label="行动子页切换"
            drag={low ? false : 'x'}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragEnd={onDragEnd}
            className="relative inline-flex cursor-grab select-none items-end gap-2 active:cursor-grabbing"
          >
            {TABS.map((t, i) => {
              const active = sub === t.key;
              return (
                <Fragment key={t.key}>
                  {i > 0 && <span aria-hidden className="pb-1 font-display text-[34px] font-black italic leading-none text-p4g-orange [-webkit-text-stroke:2px_var(--p4g-black)] night:[-webkit-text-stroke:2px_var(--p4g-yellow)]">/</span>}
                  <button type="button" role="tab" id={`actions-tab-${t.key}`} aria-selected={active} aria-controls={`actions-panel-${t.key}`} onClick={() => switchTab(t.key)} className="relative">
                    {active && (
                      <motion.span aria-hidden layoutId="p4g-actions-sun" transition={low ? { duration: 0 } : { type: 'tween', duration: 0.22, ease: [0.2, 0.9, 0.1, 1] }}
                        className="absolute -left-4 -top-5 h-[78px] w-[78px] rounded-full border-3 border-p4g-black night:border-p4g-yellow"
                        style={{ background: 'radial-gradient(circle at 42% 36%, var(--p4g-yellow-hi) 0 38%, var(--p4g-orange) 40% 100%)' }} />
                    )}
                    <span className="relative block" style={{ transform: `scale(${active ? 1 : 0.58})`, transformOrigin: 'left bottom', transition: low ? undefined : 'transform 200ms cubic-bezier(.2,.9,.1,1)', marginRight: active ? 0 : -46 }}>
                      <span className="block font-display font-black leading-none"
                        style={{ fontSize: 54, color: active ? 'var(--p4g-title-fill)' : 'var(--p4g-on-stage)', WebkitTextStroke: active ? '7px var(--p4g-title-stroke)' : undefined, paintOrder: 'stroke fill' }}>
                        {t.label}
                      </span>
                    </span>
                  </button>
                </Fragment>
              );
            })}
          </motion.div>
        </div>
      </header>

      {/* ── 子视图区：左右推 ── */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={sub}
          role="tabpanel"
          id={`actions-panel-${sub}`}
          aria-labelledby={`actions-tab-${sub}`}
          initial={low ? { opacity: 0 } : { opacity: 0, x: dir * 28 }}
          animate={{ opacity: 1, x: 0 }}
          exit={low ? { opacity: 0 } : { opacity: 0, x: dir * 28 }}
          transition={{ duration: 0.18, ease: [0.2, 0.9, 0.1, 1] }}
          className="min-w-0"
        >
          {sub === 'todos' ? <TodosView params={params} /> : <ActivitiesView params={params} />}
        </motion.div>
      </AnimatePresence>
      <ChannelNoise active={noise} onDone={() => setNoise(false)} duration={160} />
    </div>
  );
}
