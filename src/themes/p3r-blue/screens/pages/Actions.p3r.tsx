/**
 * 行动页（真实 src/pages/Actions.tsx 的 p3 分支）—— 记录 / 任务 合并宿主（Check Status 面板）。
 *   · 背景幽灵词「ACTION」；切换头 tablist aria「行动子页切换」：选中项 = 蓝斜块 slantClip(12) + 右下臂章红小角（layoutId 滑动），未选 = 墨色 22px 粗字；
 *   · 点击切换；切换头横滑（drag x，超过 ±40：左滑 → 任务，右滑 → 记录）；外壳底导在行动页再点「行动」→ 记录 ⇄ 任务。
 *   · 子视图左右推 ±24px，0.18s（记录在左、任务在右）；低动效只淡入淡出。
 * 路由：#/p/actions?tab=activities|todos（默认记录：真实 store actionsSubTab 默认值）。
 */
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { useEffect, useRef } from 'react';
import type { PageProps } from '@blue/registry/types';
import { navigate } from '@blue/shell/shellBus';
import { useBoldness } from '@blue/lib/prefs';
import { GhostWords, P3R, slantClip, tickClip } from '@blue/kit';
import { ActivitiesView } from './Activities.p3r';
import { TodosView } from './Todos.p3r';

type Sub = 'activities' | 'todos';
const TABS: { key: Sub; label: string; en: string }[] = [
  { key: 'activities', label: '记录', en: 'LOG' },
  { key: 'todos', label: '任务', en: 'QUEST' },
];

export default function Actions({ tab, params }: PageProps) {
  const anim = useBoldness();
  const sub: Sub = tab === 'todos' ? 'todos' : 'activities';
  const prev = useRef<Sub>(sub);
  const dir = useRef(1);
  useEffect(() => { if (prev.current !== sub) { dir.current = sub === 'todos' ? 1 : -1; prev.current = sub; } }, [sub]);
  const switchTab = (k: Sub) => { if (k !== sub) { dir.current = k === 'todos' ? 1 : -1; navigate('actions', k, { transition: 'none', replace: true }); } };
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -40) switchTab('todos');
    else if (info.offset.x > 40) switchTab('activities');
  };
  const d = dir.current;

  return (
    <div className="relative min-w-0">
      <GhostWords words={['ACTION']} className="-left-3 -top-2" style={{ fontSize: 'min(22vw, 7rem)' }} />
      <header className="relative mb-4 pt-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="font-cond text-[12px] tracking-[0.3em]" style={{ color: P3R.roseInk }}>CHECK STATUS</span>
          <span aria-hidden className="h-px min-w-[12px] flex-1" style={{ background: P3R.ink, opacity: 0.25 }} />
          <span className="font-cond text-[12px]" style={{ color: P3R.grey }}>{TABS.find((t) => t.key === sub)?.en}</span>
        </div>
        <motion.div role="tablist" aria-label="行动子页切换" drag={anim ? 'x' : false} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.15} onDragEnd={onDragEnd}
          className="relative mt-2 inline-flex cursor-grab select-none items-center gap-1 active:cursor-grabbing">
          {TABS.map((t) => {
            const on = sub === t.key;
            return (
              <button key={t.key} type="button" role="tab" id={`actions-tab-${t.key}`} aria-selected={on} aria-controls={`actions-panel-${t.key}`} onClick={() => switchTab(t.key)}
                className="relative flex h-[46px] items-center px-6">
                {on && (
                  <motion.span layoutId="bk-actions-tab" aria-hidden className="absolute inset-0" transition={anim ? { type: 'spring', stiffness: 460, damping: 34 } : { duration: 0 }}>
                    <span className="absolute inset-0" style={{ background: P3R.blue, clipPath: slantClip(12) }} />
                    <span className="absolute bottom-0 right-2 h-[9px] w-[18px]" style={{ background: P3R.magenta, clipPath: tickClip }} />
                  </motion.span>
                )}
                <span className="relative font-heavy leading-none" style={{ fontSize: on ? 26 : 22, color: on ? P3R.onBlue : P3R.ink, transition: anim ? 'font-size 160ms' : undefined }}>{t.label}</span>
              </button>
            );
          })}
        </motion.div>
      </header>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={sub} id={`actions-panel-${sub}`} role="tabpanel" aria-labelledby={`actions-tab-${sub}`} className="relative min-w-0"
          initial={anim ? { opacity: 0, x: 24 * d } : { opacity: 0 }} animate={{ opacity: 1, x: 0 }} exit={anim ? { opacity: 0, x: -24 * d } : { opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.2, 0, 0.1, 1] }}>
          {sub === 'activities' ? <ActivitiesView params={params} /> : <TodosView params={params} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
