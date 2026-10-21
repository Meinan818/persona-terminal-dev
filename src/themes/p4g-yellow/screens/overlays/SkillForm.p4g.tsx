/**
 * 添加 / 编辑技能（真实 src/pages/Achievements.tsx · skill modal）：技能名称 / 技能效果（自动生成）/ 需求属性 / 需求等级（2–N）± / 额外加成倍数（1.0–3.0）
 * / 添加 · 保存 · 取消 / 删除技能；校验「技能开启等级不能为1级，请设置2级或以上」。?variant=edit（兼容 ?mode=edit）
 */
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import type { AttributeId, Skill } from '@/types';
import { P4Dialog, P4Input, P4Select, P4Button, P4Stepper, P4Slider, P4Field, useToast } from '@yellow/kit';
import { ATTR_IDS, ATTR_NAMES, LEVEL_MAX, SKILLS } from '@yellow/adapters/pkg5';

export interface SkillFormValue { name: string; requiredAttribute: AttributeId; requiredLevel: number; bonusMultiplier: number }
export const effectText = (attr: AttributeId, m: number) => `${ATTR_NAMES[attr]}积累额外提升 ${Math.round((m - 1) * 100)}%`;

export function SkillFormView({ open, onClose, editing, onSave, onDelete }: { open: boolean; onClose: () => void; editing?: Skill | null; onSave?: (v: SkillFormValue) => void; onDelete?: () => void }) {
  const toast = useToast();
  const [v, setV] = useState<SkillFormValue>({ name: '', requiredAttribute: 'knowledge', requiredLevel: 2, bonusMultiplier: 1.2 });
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (open) { setV(editing ? { name: editing.name, requiredAttribute: editing.requiredAttribute, requiredLevel: editing.requiredLevel, bonusMultiplier: editing.bonusMultiplier ?? 1.2 } : { name: '', requiredAttribute: 'knowledge', requiredLevel: 2, bonusMultiplier: 1.2 }); setErr(null); } }, [open, editing]);
  const submit = () => {
    if (!v.name.trim()) { setErr('请填写技能名称'); return; }
    if (v.requiredLevel < 2) { setErr('技能开启等级不能为1级，请设置2级或以上'); return; }
    onClose(); onSave ? onSave(v) : toast.success(editing ? '技能已保存' : '技能已添加');
  };
  return (
    <P4Dialog open={open} onClose={onClose} title={editing ? '编辑技能' : '添加技能'} speaker="SKILL" actions="none" role="dialog">
      <div className="flex min-w-0 flex-col gap-3 rounded-sm bg-p4g-surface-2 p-3 text-p4g-ink">
        <P4Input label="技能名称" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder="技能名称" />
        <P4Field label="技能效果（自动生成）"><div className="rounded-sm border-3 border-dashed border-p4g-line px-3 py-2.5 font-display text-body font-bold text-[color:var(--p4g-rank)]">{effectText(v.requiredAttribute, v.bonusMultiplier)}</div></P4Field>
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          <P4Select label="需求属性" value={v.requiredAttribute} onChange={(e) => setV({ ...v, requiredAttribute: e.target.value as AttributeId })} options={ATTR_IDS.map((id) => ({ value: id, label: ATTR_NAMES[id] }))} />
          <P4Field label={`需求等级（2–${LEVEL_MAX}）`}><P4Stepper value={v.requiredLevel} min={1} max={LEVEL_MAX} onChange={(n) => setV({ ...v, requiredLevel: n })} label="需求等级" /></P4Field>
        </div>
        <P4Field label="额外加成倍数（1.0–3.0）" counter={`×${v.bonusMultiplier.toFixed(1)}`}><P4Slider value={v.bonusMultiplier} min={1} max={3} step={0.1} onChange={(n: number) => setV({ ...v, bonusMultiplier: Math.round(n * 10) / 10 })} /></P4Field>
        {err && <p className="text-meta font-bold text-p4g-danger">{err}</p>}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2"><P4Button onClick={submit}>{editing ? '保存' : '添加'}</P4Button><P4Button variant="secondary" onClick={onClose}>取消</P4Button></div>
      {editing && editing.id.startsWith('custom_') && <P4Button variant="danger" block className="mt-2" onClick={() => { onClose(); onDelete?.(); }}>删除技能</P4Button>}
    </P4Dialog>
  );
}

export default function SkillForm({ open, onClose, params }: OverlayProps) {
  return <SkillFormView open={open} onClose={onClose} editing={(params?.get('variant') ?? params?.get('mode')) === 'edit' ? SKILLS.find((s) => s.id === 'custom_sk_sketch') : null} />;
}
