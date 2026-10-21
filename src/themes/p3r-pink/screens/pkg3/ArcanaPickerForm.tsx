/**
 * 手动挑塔罗表单（真实 ArcanaPickerForm）：22 张大阿卡纳格（已占用标「占」）+ 正 / 逆位 + 期望等级 + 能力加成属性 + 留言 + 不使用 AI 内容。
 * 粉白 P3R：选中牌玫红切角框 + 上浮；正逆位 = 斜切分段；属性 = 斜片。
 */
import type { AttributeId } from '@/types';
import { P3Check, P3Field, P3R, P3Textarea, slantClip } from '@pink/kit';
import { ATTR_IDS, ATTR_NAMES, MAJOR_ARCANA, TAROT_BY_ID } from './arcana';
import { LevelGrid, MiniLabel, Tarot } from './ui';

export interface ArcanaPickValue { arcanaId: string; orientation: 'upright' | 'reversed'; level: number; attr: AttributeId; message: string; skipAi: boolean }

export function ArcanaPickerForm({ value, onChange, taken = [], hint, messagePlaceholder }: { value: ArcanaPickValue; onChange: (v: ArcanaPickValue) => void; taken?: string[]; hint?: string; messagePlaceholder?: string }) {
  const set = (p: Partial<ArcanaPickValue>) => onChange({ ...value, ...p });
  const sel = TAROT_BY_ID[value.arcanaId];
  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="flex min-w-0 items-center gap-3 px-4 py-3" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(12) }}>
        <Tarot arcanaId={value.arcanaId} reversed={value.orientation === 'reversed'} width={60} />
        <div className="min-w-0 flex-1">
          <div className="font-cond text-[12px] tracking-[0.18em] opacity-85">{sel?.roman} · {sel?.nameEn}</div>
          <div className="truncate font-heavy text-[20px]">《{sel?.name}》{value.orientation === 'reversed' ? '逆位' : '正位'}</div>
          <div className="mt-2 flex w-fit gap-1">
            {(['upright', 'reversed'] as const).map((o) => <button key={o} type="button" aria-pressed={value.orientation === o} onClick={() => set({ orientation: o })} className="px-4 py-1 text-[13px] font-black" style={{ clipPath: slantClip(6), background: value.orientation === o ? 'var(--p3r-mulberry)' : 'rgba(255,255,255,0.22)', color: value.orientation === o ? 'var(--p3r-cream)' : 'inherit' }}>{o === 'upright' ? '正位' : '逆位'}</button>)}
          </div>
        </div>
      </div>
      <div>
        <MiniLabel>{hint ?? '从下方挑一张塔罗代表 Ta'}</MiniLabel>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(52px,1fr))] gap-x-1.5 gap-y-2">
          {MAJOR_ARCANA.map((c) => {
            const isTaken = taken.includes(c.id) && c.id !== value.arcanaId;
            const on = value.arcanaId === c.id;
            return (
              <button key={c.id} type="button" disabled={isTaken} onClick={() => set({ arcanaId: c.id, attr: c.attr })} aria-label={`${c.roman} ${c.name}${isTaken ? '（已占用）' : ''}`} aria-pressed={on}
                className="relative flex min-w-0 flex-col items-center gap-0.5 pt-1 transition-transform" style={{ opacity: isTaken ? 0.4 : 1, transform: on ? 'translateY(-3px)' : undefined }}>
                <Tarot arcanaId={c.id} width={44} glow={on} />
                <span className="w-full truncate text-center text-[10px] font-black leading-tight" style={{ color: on ? P3R.roseInk : P3R.inkSoft }}>{c.name}</span>
                {isTaken && <span className="absolute right-0 top-0 px-1 text-[9px] font-black" style={{ background: P3R.magenta, color: '#fff', clipPath: slantClip(2) }}>占</span>}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <MiniLabel>羁绊等级（期望值）</MiniLabel>
        <LevelGrid value={value.level} onChange={(v) => set({ level: v })} />
        <p className="mt-1.5 text-[11px]" style={{ color: P3R.grey }}>双方的期望值不同时，最终按 <b>取中</b>（下取整）生效。</p>
      </div>
      <div>
        <MiniLabel>能力加成属性</MiniLabel>
        <div className="flex flex-wrap gap-1.5">{ATTR_IDS.map((a) => <button key={a} type="button" aria-pressed={value.attr === a} onClick={() => set({ attr: a })} className="px-3 py-1 text-[13px] font-black" style={{ clipPath: slantClip(6), background: value.attr === a ? P3R.blue : P3R.cyanFaint, color: value.attr === a ? P3R.onBlue : P3R.ink }}>{ATTR_NAMES[a]}</button>)}</div>
        <p className="mt-1.5 text-[11px]" style={{ color: P3R.grey }}>Lv2 日常加点、Lv7 战斗固伤、Lv10 SP 道具都会指向这个属性。</p>
      </div>
      <P3Field label="留一句话（可选，≤ 200 字）" count={`${value.message.length} / 200`}><P3Textarea rows={3} maxLength={200} value={value.message} onChange={(e) => set({ message: e.target.value })} placeholder={messagePlaceholder ?? '想对 Ta 说的话……'} /></P3Field>
      <div className="px-4 py-3" style={{ background: P3R.cyanFaint, clipPath: slantClip(10) }}>
        <P3Check checked={value.skipAi} onChange={(v) => set({ skipAi: v })} label="不使用 AI 内容" />
        <p className="mt-1 pl-8 text-[12px]" style={{ color: P3R.grey }}>默认：契约建立后 AI 会根据塔罗 + 对方留言生成「解读 / 未来」。勾上则跳过 AI，用对方留言或牌意模板兜底。</p>
      </div>
    </div>
  );
}
