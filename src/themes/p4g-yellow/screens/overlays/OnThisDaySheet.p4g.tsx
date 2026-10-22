/**
 * OnThisDaySheet.p4g —— 真实 components/dashboard/OnThisDaySheet：标题「一年前的今天」；
 * 当天记录列表；「那天记了 N 条」「那时连续 N 天」「抽到 X · 正位/逆位」；「从第一条记录起已经过了 N 天。」；
 * 按钮「去记录页看这一天 →」（→ 行动·记录）。点遮罩 / ✕ / 下滑把手 关闭。
 */
import { useRef } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Sheet, P4Button, P4Chip } from '@yellow/kit';
import { navigate } from '@yellow/shell/shellBus';
import { ATTR_NAMES, MOCK_ON_THIS_DAY } from '@yellow/mock/pkg1';

export function OnThisDaySheetP4G({ open, onClose }: OverlayProps) {
  const v = MOCK_ON_THIS_DAY;
  const drag = useRef<number | null>(null);
  const d = new Date(); d.setFullYear(d.getFullYear() - 1);
  return (
    <P4Sheet open={open} onClose={onClose} title="一年前的今天" en={`ON THIS DAY · ${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`}
      footer={<P4Button block variant="black" onClick={() => { onClose(); navigate('actions', 'activities'); }}>去记录页看这一天 →</P4Button>}>
      {/* 下滑把手：按住下拉 >70px 关闭 */}
      <div role="button" aria-label="下滑关闭" tabIndex={-1}
        className="mx-auto -mt-1 mb-2 flex h-6 w-24 cursor-grab items-center justify-center" style={{ touchAction: 'none' }}
        onPointerDown={(e) => { drag.current = e.clientY; (e.currentTarget as Element).setPointerCapture(e.pointerId); }}
        onPointerUp={(e) => { if (drag.current !== null && e.clientY - drag.current > 70) onClose(); drag.current = null; }}>
        <span className="h-1.5 w-12 rounded-pill bg-p4g-ink/40" />
      </div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        <P4Chip tone="black">那天记了 {v.total} 条</P4Chip>
        {v.streakThen > 0 && <P4Chip tone="yellow">那时连续 {v.streakThen} 天</P4Chip>}
        <P4Chip tone="tag">抽到 {v.tarot.name} · {v.tarot.orientation === 'reversed' ? '逆位' : '正位'}</P4Chip>
      </div>
      <div className="grid grid-cols-1 overflow-hidden rounded-sm border-3 border-p4g-line shadow-hard">
        {v.items.map((a, i) => (
          <div key={a.id} className="relative flex min-w-0 items-start gap-3 px-3 py-2.5 text-p4g-ink" style={{ background: 'var(--p4g-surface-grad)' }}>
            <span className="shrink-0 rounded-xs bg-p4g-black px-1.5 py-0.5 p4g-num text-meta text-p4g-yellow">{a.time}</span>
            <span className="min-w-0 flex-1">
              <span className="p4g-clamp-2 font-display text-body font-bold">{a.text}</span>
              <span className="mt-0.5 block font-display text-cap font-bold text-[color:var(--p4g-rank)]">{ATTR_NAMES[a.attr]} +{a.pts}</span>
            </span>
            <span aria-hidden className="absolute inset-x-0 bottom-0 h-[2px]" style={{ background: i % 2 ? 'var(--p4g-separator-b)' : 'var(--p4g-separator-a)' }} />
          </div>
        ))}
      </div>
      <p className="mt-3 px-1 text-meta text-p4g-ink-soft">从第一条记录起已经过了 {v.daysSince} 天。</p>
    </P4Sheet>
  );
}

export default function OnThisDaySheet(p: OverlayProps) { return <OnThisDaySheetP4G {...p} />; }
