/**
 * 行动页 Actions（真实 src/pages/Actions.tsx channel==="p5" 分支；P0-09 记录 / 任务 合页）。
 * 路由：#/p/actions?tab=todos|activities（缺省 todos；v3 旧链接 #/todos #/activities 自动归一）。
 * 壳负责：P5 切换头（激活词大纸瓷砖 + 红斜杠 + 未激活小瓷砖灰字，v3 .act-tabs 外观）+「行动」红章眉标；
 *         切换头横滑（左滑 → 任务，右滑 → 记录，阈值 40px）；子视图区 180ms 横移淡入（记录在左、任务在右）。
 * 子视图：任务 = ./Todos.p5r（pkg4）；记录 = ./Activities.p5r（pkg5 写内容；文件不存在时显示「待移植」）。
 *   子视图组件收 ActionsSubViewProps = PageProps + { tabs: ReactNode }，自己决定把切换头放在页头哪里（任务页放在日历挂件下方，同 v3）。
 * 入场：切换头瓷砖砸落（slamTiles .05）；低动效直接终态。
 */
import { lazy, Suspense, useEffect, useLayoutEffect, useRef, type ComponentType, type ReactNode } from 'react';
import type { PageProps } from '@/p5r-red/registry/types';
import { navigate } from '@/p5r-red/shell/shellBus';
import { sfx } from '@/p5r-red/fx/sfx';
import { slamTiles } from '@/p5r-red/fx/motion';
import { isLowMotion } from '@/p5r-red/lib/prefs';
import { TodoCard } from '@/p5r-red/screens/demo-harness/Placeholders';
import { P5Mask } from '@/p5r-red/kit/P5Mask';
import TodosView from './Todos.p5r';
import '@/p5r-red/screens/pkg4/pkg4.css';

export type ActionsSubTab = 'todos' | 'activities';
export interface ActionsSubViewProps extends PageProps { tabs: ReactNode }

/** 记录子视图：pkg5 的 Activities.p5r.tsx 存在才加载（import.meta.glob 文件缺失时为空，不报错） */
const actMods = import.meta.glob('./Activities.p5r.tsx');
const ActivitiesLazy: ComponentType<ActionsSubViewProps> | null = actMods['./Activities.p5r.tsx']
  ? lazy(actMods['./Activities.p5r.tsx'] as () => Promise<{ default: ComponentType<ActionsSubViewProps> }>)
  : null;

const TABS: Array<{ key: ActionsSubTab; label: string }> = [{ key: 'activities', label: '记录' }, { key: 'todos', label: '任务' }];

function ActionsTabs({ active }: { active: ActionsSubTab }) {
  const ref = useRef<HTMLDivElement>(null);
  const x0 = useRef<number | null>(null);
  useEffect(() => { if (ref.current) return slamTiles(ref.current.querySelectorAll('.tt span'), 0.05); }, []);
  const go = (tab: ActionsSubTab) => { if (tab === active) return; sfx('nav', 0.48); navigate('actions', { tab, via: 'none', replace: true }); };
  return (
    <div className="act-tabs-wrap" ref={ref}
      onPointerDown={(e) => { x0.current = e.clientX; }}
      onPointerUp={(e) => { if (x0.current == null) return; const dx = e.clientX - x0.current; x0.current = null; if (dx < -40) go('todos'); else if (dx > 40) go('activities'); }}>
      <span className="act-stamp" aria-hidden="true">行动</span>
      <div className="act-tabs" role="tablist" aria-label="行动子页切换">
        {TABS.map((t, i) => (
          <span key={t.key} style={{ display: 'contents' }}>
            {i > 0 && <span className="tt-sl" aria-hidden="true">/</span>}
            <button type="button" role="tab" id={`actions-tab-${t.key}`} aria-selected={active === t.key} aria-controls={`actions-panel-${t.key}`} className={`tt ${active === t.key ? 'on' : ''}`} onClick={() => go(t.key)}>
              {[...t.label].map((c, k) => <span key={k}>{c}</span>)}
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Actions(props: PageProps) {
  const tab: ActionsSubTab = props.tab === 'activities' ? 'activities' : 'todos';
  const panel = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  useLayoutEffect(() => {
    if (first.current) { first.current = false; return; }
    const el = panel.current; if (!el || isLowMotion()) return;
    const dx = tab === 'activities' ? -24 : 24;
    el.animate([{ opacity: 0, transform: `translateX(${dx}px)` }, { opacity: 1, transform: 'none' }], { duration: 180, easing: 'ease-out' });
  }, [tab]);
  const tabs = <ActionsTabs active={tab} />;
  return (
    <div className="act-shell">
      <div ref={panel} className="act-panel" role="tabpanel" id={`actions-panel-${tab}`} aria-labelledby={`actions-tab-${tab}`}>
        {tab === 'todos' ? <TodosView key="todos" {...props} tabs={tabs} /> : ActivitiesLazy ? (
          <Suspense fallback={null}><ActivitiesLazy key="acts" {...props} tabs={tabs} /></Suspense>
        ) : (
          <div className="acts5">
            <header className="t-hd act-hd">{tabs}<P5Mask w={props.wide ? 110 : 60} /></header>
            <TodoCard id="actions-page" kind="记录子视图（pkg5 · Activities.p5r.tsx）" />
          </div>
        )}
      </div>
    </div>
  );
}
