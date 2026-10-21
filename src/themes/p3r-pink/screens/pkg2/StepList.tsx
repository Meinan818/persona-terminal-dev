/** 子步 / 子任务列表（大事面板 · 愿望面板共用）：P3R 斜行 + 编号 + 斜方勾 + 删除；完成态划线淡出。 */
import { motion } from 'framer-motion';
import type { TodoStep } from '@/types';
import { P3R, slantClip, IconCheck, IconTrash } from '@pink/kit';
import { useBoldness } from '@pink/lib/prefs';

export function StepList({ steps, onToggle, onDelete, locked, delLabel = '删除子步' }: { steps: TodoStep[]; onToggle: (i: number) => void; onDelete?: (i: number) => void; locked?: boolean; delLabel?: string }) {
  const anim = useBoldness();
  return (
    <ol className="space-y-1">
      {steps.map((s, i) => (
        <motion.li key={s.id} className="flex min-w-0 items-center gap-2.5 px-4 py-1.5" style={{ background: s.done ? 'var(--p3r-row-alt)' : 'var(--p3r-row)', clipPath: slantClip(8) }}
          initial={anim ? { opacity: 0, x: -14 } : false} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 8) * 0.03 }}>
          <span className="w-6 shrink-0 font-cond text-[14px]" style={{ color: P3R.roseInk }}>{String(i + 1).padStart(2, '0')}</span>
          <button type="button" disabled={locked} aria-label={s.done ? '撤销这一步' : '完成这一步'} onClick={() => onToggle(i)} className="flex h-7 w-8 shrink-0 items-center justify-center disabled:opacity-60"
            style={{ clipPath: slantClip(5), background: s.done ? P3R.blue : 'transparent', boxShadow: s.done ? undefined : 'inset 0 0 0 2px rgb(var(--p3r-cyan-rgb) / 0.8)', color: s.done ? P3R.onBlue : 'transparent' }}>
            <IconCheck size={13} />
          </button>
          <span className={`min-w-0 flex-1 truncate text-[14px] font-bold ${s.done ? 'line-through opacity-50' : ''}`} style={{ color: P3R.ink }}>{s.title}</span>
          {s.source === 'ai' && <span className="shrink-0 font-cond text-[11px]" style={{ color: P3R.lilacInk }}>AI</span>}
          {onDelete && !locked && <button type="button" aria-label={delLabel} onClick={() => onDelete(i)} className="flex h-8 w-8 shrink-0 items-center justify-center" style={{ color: P3R.grey }}><IconTrash size={14} /></button>}
        </motion.li>
      ))}
    </ol>
  );
}
