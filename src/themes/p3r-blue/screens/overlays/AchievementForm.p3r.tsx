/**
 * 添加自定义成就 / 编辑成就（真实 src/pages/Achievements.tsx · add/edit modal + AchievementFormFields）→ P3R 抽屉。
 * 成就标题 / 成就描述 / 图标 (emoji) / 条件类型（总点数·连续天数·属性等级·关键字匹配·完成任务次数）/ 条件值（校验「成就条件值必须大于0」）
 * / 选择属性（属性等级时）/ 关键字（用逗号分隔，例如：阅读,学习,看书）/ 添加 · 保存 · 取消 / 删除成就（自定义可删）。?variant=edit | invalid
 */
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@blue/registry/types';
import type { Achievement, AttributeId } from '@real/types';
import { P3Sheet, P3Input, P3Select, P3Button, P3Field, P3R, useToast } from '@blue/kit';
import { ATTR_IDS } from '@blue/mock/pkg5';
import { useAppStore } from '@/store';

type CType = 'total_points' | 'consecutive_days' | 'attribute_level' | 'keyword_match' | 'todo_completions';
export interface AchForm { title: string; description: string; icon: string; type: CType; value: number; attribute: AttributeId; keywords: string }
const TYPES: { value: CType; label: string }[] = [{ value: 'total_points', label: '总点数' }, { value: 'consecutive_days', label: '连续天数' }, { value: 'attribute_level', label: '属性等级' }, { value: 'keyword_match', label: '关键字匹配' }, { value: 'todo_completions', label: '完成任务次数' }];
const blank: AchForm = { title: '', description: '', icon: '', type: 'total_points', value: 10, attribute: 'knowledge', keywords: '' };
const fromAch = (a: Achievement): AchForm => ({ title: a.title, description: a.description, icon: a.icon, type: (TYPES.some((t) => t.value === a.condition.type) ? a.condition.type : 'total_points') as CType, value: a.condition.value, attribute: (a.condition.attribute ?? 'knowledge') as AttributeId, keywords: (a.condition.keywords ?? []).join(',') });

export function AchievementFormView({ open, onClose, editing, onSave, onDelete, initial }: { open: boolean; onClose: () => void; editing?: Achievement | null; onSave?: (f: AchForm) => void; onDelete?: () => void; initial?: Partial<AchForm> }) {
  const toast = useToast();
  // 属性名取真实设置（用户可改），不是 mock 的固定「知识 / 胆量…」。
  const attrNames = useAppStore((s) => s.settings.attributeNames) as Record<AttributeId, string>;
  const [f, setF] = useState<AchForm>(blank);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (open) { setF({ ...(editing ? fromAch(editing) : blank), ...initial }); setErr(null); } }, [open, editing]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (p: Partial<AchForm>) => setF((x) => ({ ...x, ...p }));
  const submit = () => {
    if (!f.title || !f.description || !f.icon) { setErr('请填写完整的成就信息'); return; }
    if (f.value <= 0) { setErr('成就条件值必须大于0'); return; }
    onClose(); if (onSave) onSave(f); else toast.success(editing ? '成就已保存' : '成就已添加');
  };
  const custom = !!editing && editing.id.startsWith('custom_');
  return (
    <P3Sheet open={open} onClose={onClose} title={editing ? '编辑成就' : '添加自定义成就'} en={editing ? 'EDIT' : 'NEW'}
      footer={<div className="flex flex-col gap-2"><div className="grid grid-cols-2 gap-2"><P3Button tone="soft" onClick={onClose}>取消</P3Button><P3Button corner onClick={submit}>{editing ? '保存' : '添加'}</P3Button></div>{custom && <P3Button tone="danger" block onClick={() => { onClose(); onDelete?.(); }}>删除成就</P3Button>}</div>}>
      <div className="flex min-w-0 flex-col gap-3 pt-1">
        <P3Field label="成就标题"><P3Input value={f.title} onChange={(e) => set({ title: e.target.value })} placeholder="成就标题" aria-label="成就标题" /></P3Field>
        <P3Field label="成就描述"><P3Input value={f.description} onChange={(e) => set({ description: e.target.value })} placeholder="成就描述" aria-label="成就描述" /></P3Field>
        <P3Field label="图标 (emoji)" hint="蓝主题里建议用单色符号，如 ✦ ★ ☾ ♪"><P3Input value={f.icon} onChange={(e) => set({ icon: e.target.value })} placeholder="图标 (emoji)" aria-label="图标 (emoji)" maxLength={4} /></P3Field>
        <div className="grid min-w-0 grid-cols-2 gap-2">
          <P3Field label="条件类型"><P3Select aria-label="条件类型" value={f.type} onChange={(e) => set({ type: e.target.value as CType })}>{TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</P3Select></P3Field>
          <P3Field label="条件值" error={f.value <= 0 ? '成就条件值必须大于0' : undefined}><P3Input type="number" aria-label="条件值" value={String(f.value)} invalid={f.value <= 0} onChange={(e) => set({ value: Number(e.target.value) })} placeholder="条件值" /></P3Field>
        </div>
        {f.type === 'attribute_level' && <P3Field label="选择属性"><P3Select aria-label="选择属性" value={f.attribute} onChange={(e) => set({ attribute: e.target.value as AttributeId })}>{ATTR_IDS.map((id) => <option key={id} value={id}>{attrNames?.[id] ?? id}</option>)}</P3Select></P3Field>}
        {f.type === 'keyword_match' && <P3Field label="关键字（用逗号分隔）"><P3Input value={f.keywords} onChange={(e) => set({ keywords: e.target.value })} placeholder="例如：阅读,学习,看书" /></P3Field>}
        {err && <p className="text-[12px] font-black" style={{ color: 'var(--p3r-coral-ink)' }}>{err}</p>}
      </div>
    </P3Sheet>
  );
}

export default function AchievementForm({ open, onClose, params }: OverlayProps) {
  const v = params?.get('variant') ?? params?.get('mode');
  // 编辑态取真实自定义成就（原来固定取 mock 的 custom_read）。
  const custom = useAppStore((s) => s.achievements);
  const attrNames = useAppStore((s) => s.settings.attributeNames);
  return (
    <AchievementFormView
      open={open}
      onClose={onClose}
      editing={v === 'edit' ? custom.find((a) => a.id.startsWith('custom_')) ?? null : null}
      initial={v === 'invalid' ? { title: '夜读者', description: '连续读书', icon: '☾', value: 0 } : undefined}
    />
  );
}
