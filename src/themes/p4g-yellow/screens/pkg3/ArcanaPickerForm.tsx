/**
 * 手动挑塔罗表单（真实 ArcanaPickerForm）：22 张大阿卡纳格（已占用标「占」）+ 正/逆位 + 期望等级 + 能力加成属性 + 留言 + 不使用 AI 内容。
 */
import type { AttributeId } from '@/types';
import { P4Textarea } from '@yellow/kit';
import { cx } from '@yellow/lib/cx';
import { ATTR_IDS, ATTR_NAMES, MAJOR_ARCANA, TAROT_BY_ID } from './arcana';
import { LevelGrid, MiniLabel, TarotCard } from './ui';

export interface ArcanaPickValue { arcanaId: string; orientation: 'upright' | 'reversed'; level: number; attr: AttributeId; message: string; skipAi: boolean }

export function ArcanaPickerForm({ value, onChange, taken = [], hint, messagePlaceholder }: { value: ArcanaPickValue; onChange: (v: ArcanaPickValue) => void; taken?: string[]; hint?: string; messagePlaceholder?: string }) {
  const set = (p: Partial<ArcanaPickValue>) => onChange({ ...value, ...p });
  const selectedCard = TAROT_BY_ID[value.arcanaId];
  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="flex min-w-0 items-center gap-3 rounded-sm border-3 border-p4g-black bg-p4g-yellow p-3 text-p4g-black">
        <TarotCard arcanaId={value.arcanaId} orientation={value.orientation} width={64} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-h3 font-bold">《{selectedCard?.name}》{value.orientation === 'reversed' ? '逆位' : '正位'}</div>
          <div className="mt-2 grid w-fit grid-cols-2 overflow-hidden rounded-full border-3 border-p4g-black">
            {(['upright', 'reversed'] as const).map((o) => <button key={o} type="button" onClick={() => set({ orientation: o })} className={cx('px-4 py-1 font-display text-meta font-bold', value.orientation === o ? 'bg-p4g-black text-p4g-yellow' : 'bg-p4g-cream text-p4g-black')}>{o === 'upright' ? '正位' : '逆位'}</button>)}
          </div>
        </div>
      </div>
      <div>
        <MiniLabel>{hint ?? '从下方挑一张塔罗代表 Ta'}</MiniLabel>
        <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
          {MAJOR_ARCANA.map((c) => {
            const isTaken = taken.includes(c.id) && c.id !== value.arcanaId;
            const on = value.arcanaId === c.id;
            return (
              <button key={c.id} type="button" disabled={isTaken} onClick={() => set({ arcanaId: c.id, attr: c.attr })} aria-label={c.name}
                className={cx('relative min-w-0 rounded-[4px] p-[2px] transition-transform', on ? 'z-[1] scale-[1.08] bg-p4g-orange' : 'bg-transparent', isTaken && 'opacity-45')}>
                <TarotCard arcanaId={c.id} width="100%" labels={false} />
                <span className="absolute inset-x-[2px] bottom-[2px] truncate rounded-b-[3px] bg-p4g-black/85 text-center text-[9px] font-bold leading-[14px] text-white">{c.roman} {c.name}</span>
                {isTaken && <span className="absolute right-0.5 top-0.5 rounded-[2px] bg-p4g-red px-1 text-[9px] font-bold text-white">占</span>}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <MiniLabel>羁绊等级（期望值）</MiniLabel>
        <LevelGrid value={value.level} onChange={(v) => set({ level: v })} />
        <p className="mt-1.5 text-2xs text-p4g-ink-soft">双方的期望值不同时，最终按 <span className="font-bold">取中</span>（下取整）生效。</p>
      </div>
      <div>
        <MiniLabel>能力加成属性</MiniLabel>
        <div className="flex flex-wrap gap-1.5">{ATTR_IDS.map((a) => <button key={a} type="button" onClick={() => set({ attr: a })} className={cx('rounded-full border-2 px-3 py-1 font-display text-meta font-bold', value.attr === a ? 'border-p4g-black bg-p4g-orange text-p4g-black' : 'border-p4g-line bg-p4g-surface-2')}>{ATTR_NAMES[a]}</button>)}</div>
        <p className="mt-1.5 text-2xs text-p4g-ink-soft">Lv2 日常加点、Lv7 战斗固伤、Lv10 SP 道具都会指向这个属性。</p>
      </div>
      <P4Textarea label="留一句话（可选，≤ 200 字）" rows={3} maxLength={200} showCount value={value.message} onChange={(e) => set({ message: e.target.value })} placeholder={messagePlaceholder ?? '想对 Ta 说的话……'} />
      <label className="flex cursor-pointer items-start gap-3 rounded-sm border-3 border-p4g-line bg-p4g-surface p-3">
        <input type="checkbox" checked={value.skipAi} onChange={(e) => set({ skipAi: e.target.checked })} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--p4g-orange)]" />
        <span className="min-w-0"><span className="block font-display text-body font-bold">不使用 AI 内容</span><span className="block text-cap text-p4g-ink-soft">默认：契约建立后 AI 会根据塔罗 + 对方留言生成「解读 / 未来」。勾上则跳过 AI，用对方留言或牌意模板兜底。</span></span>
      </label>
    </div>
  );
}
