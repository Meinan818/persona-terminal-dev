/**
 * 添加 / 编辑技能（真实 src/pages/Achievements.tsx · skill modal）→ P3R 抽屉：技能名称 / 技能效果（自动生成）/ 需求属性 / 需求等级（2–N）±
 * / 额外加成倍数（1.0–3.0，斜切刻度条 + ±0.1）/ 添加 · 保存 · 取消 / 删除技能；校验「技能开启等级不能为1级，请设置2级或以上」。?variant=edit | invalid
 */
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@pink/registry/types';
import type { AttributeId, Skill } from '@real/types';
import { P3Sheet, P3Input, P3Select, P3Button, P3Stepper, P3Field, P3R, slantClip } from '@pink/kit';
import { useToast } from '@pink/kit';
import { ATTR_IDS, ATTR_NAMES, LEVEL_MAX, SKILLS } from '@pink/mock/pkg5';

export interface SkillFormValue { name: string; requiredAttribute: AttributeId; requiredLevel: number; bonusMultiplier: number }
export const effectText = (attr: AttributeId, m: number) => `${ATTR_NAMES[attr]}积累额外提升 ${Math.round((m - 1) * 100)}%`;

export function SkillFormView({ open, onClose, editing, onSave, onDelete, initial }: { open: boolean; onClose: () => void; editing?: Skill | null; onSave?: (v: SkillFormValue) => void; onDelete?: () => void; initial?: Partial<SkillFormValue> }) {
  const toast = useToast();
  const [v, setV] = useState<SkillFormValue>({ name: '', requiredAttribute: 'knowledge', requiredLevel: 2, bonusMultiplier: 1.2 });
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (open) { setV({ ...(editing ? { name: editing.name, requiredAttribute: editing.requiredAttribute, requiredLevel: editing.requiredLevel, bonusMultiplier: editing.bonusMultiplier ?? 1.2 } : { name: '', requiredAttribute: 'knowledge' as AttributeId, requiredLevel: 2, bonusMultiplier: 1.2 }), ...initial }); setErr(null); } }, [open, editing]); // eslint-disable-line react-hooks/exhaustive-deps
  const submit = () => {
    if (!v.name.trim()) { setErr('请填写技能名称'); return; }
    if (v.requiredLevel < 2) { setErr('技能开启等级不能为1级，请设置2级或以上'); return; }
    onClose(); if (onSave) onSave(v); else toast.success(editing ? '技能已保存' : '技能已添加');
  };
  const mult = (n: number) => setV((x) => ({ ...x, bonusMultiplier: Math.min(3, Math.max(1, Math.round(n * 10) / 10)) }));
  return (
    <P3Sheet open={open} onClose={onClose} title={editing ? '编辑技能' : '添加技能'} en="SKILL"
      footer={<div className="flex flex-col gap-2"><div className="grid grid-cols-2 gap-2"><P3Button tone="soft" onClick={onClose}>取消</P3Button><P3Button corner onClick={submit}>{editing ? '保存' : '添加'}</P3Button></div>{editing && editing.id.startsWith('custom_') && <P3Button tone="danger" block onClick={() => { onClose(); onDelete?.(); }}>删除技能</P3Button>}</div>}>
      <div className="flex min-w-0 flex-col gap-3 pt-1">
        <P3Field label="技能名称"><P3Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder="技能名称" /></P3Field>
        <P3Field label="技能效果（自动生成）"><div className="px-4 py-2.5 text-[14px] font-black" style={{ clipPath: slantClip(8), background: P3R.cyanPale, color: P3R.roseInk }}>{effectText(v.requiredAttribute, v.bonusMultiplier)}</div></P3Field>
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          <P3Field label="需求属性"><P3Select value={v.requiredAttribute} onChange={(e) => setV({ ...v, requiredAttribute: e.target.value as AttributeId })}>{ATTR_IDS.map((id) => <option key={id} value={id}>{ATTR_NAMES[id]}</option>)}</P3Select></P3Field>
          <P3Field label={`需求等级（2–${LEVEL_MAX}）`}><P3Stepper value={v.requiredLevel} min={1} max={LEVEL_MAX} unit="级" onChange={(n) => setV({ ...v, requiredLevel: n })} /></P3Field>
        </div>
        <P3Field label="额外加成倍数（1.0–3.0）" count={`×${v.bonusMultiplier.toFixed(1)}`}>
          <div className="flex items-center gap-2">
            <button type="button" aria-label="倍数减 0.1" disabled={v.bonusMultiplier <= 1} onClick={() => mult(v.bonusMultiplier - 0.1)} className="flex h-8 w-8 shrink-0 items-center justify-center text-[18px] font-black disabled:opacity-30" style={{ background: P3R.cyanPale, color: P3R.ink, clipPath: slantClip(5) }}>−</button>
            <div className="flex h-8 min-w-0 flex-1 items-end gap-[3px]" role="slider" aria-valuemin={1} aria-valuemax={3} aria-valuenow={v.bonusMultiplier} aria-label="额外加成倍数">
              {Array.from({ length: 20 }, (_, i) => { const val = 1.1 + i * 0.1; const on = val <= v.bonusMultiplier + 0.001; return <button key={`m-${i}`} type="button" aria-label={`×${val.toFixed(1)}`} onClick={() => mult(val)} className="min-w-0 flex-1" style={{ height: `${30 + i * 3.5}%`, background: on ? P3R.blue : 'var(--p3r-track)', clipPath: 'polygon(30% 0, 100% 0, 70% 100%, 0 100%)' }} />; })}
            </div>
            <button type="button" aria-label="倍数加 0.1" disabled={v.bonusMultiplier >= 3} onClick={() => mult(v.bonusMultiplier + 0.1)} className="flex h-8 w-8 shrink-0 items-center justify-center text-[18px] font-black disabled:opacity-30" style={{ background: P3R.cyanPale, color: P3R.ink, clipPath: slantClip(5) }}>＋</button>
          </div>
        </P3Field>
        {err && <p className="text-[12px] font-black" style={{ color: 'var(--p3r-coral-ink)' }}>{err}</p>}
      </div>
    </P3Sheet>
  );
}

export default function SkillForm({ open, onClose, params }: OverlayProps) {
  const v = params?.get('variant') ?? params?.get('mode');
  return <SkillFormView open={open} onClose={onClose} editing={v === 'edit' ? SKILLS.find((s) => s.id === 'custom_sk_sketch') ?? null : null} initial={v === 'invalid' ? { name: '速写之手', requiredLevel: 1 } : undefined} />;
}
