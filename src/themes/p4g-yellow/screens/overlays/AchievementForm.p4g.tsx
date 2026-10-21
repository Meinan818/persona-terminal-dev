/**
 * 添加自定义成就 / 编辑成就（真实 src/pages/Achievements.tsx · add/edit modal + AchievementFormFields）。
 * 成就标题 / 成就描述 / 图标 (emoji) / 条件类型（总点数·连续天数·属性等级·关键字匹配·完成任务次数）/ 条件值（校验「成就条件值必须大于0」）
 * / 选择属性（属性等级时）/ 关键字（用逗号分隔，例如：阅读,学习,看书）/ 添加 · 保存 · 取消 / 删除成就（自定义可删）。?variant=edit（兼容 ?mode=edit）
 */
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import type { Achievement, AttributeId } from '@/types';
import { P4Dialog, P4Input, P4Select, P4Button, useToast } from '@yellow/kit';
import { ATTR_IDS, ATTR_NAMES, ACHIEVEMENTS } from '@yellow/adapters/pkg5';

type CType = 'total_points' | 'consecutive_days' | 'attribute_level' | 'keyword_match' | 'todo_completions';
export interface AchForm { title: string; description: string; icon: string; type: CType; value: number; attribute: AttributeId; keywords: string }
const blank: AchForm = { title: '', description: '', icon: '', type: 'total_points', value: 10, attribute: 'knowledge', keywords: '' };
const fromAch = (a: Achievement): AchForm => ({ title: a.title, description: a.description, icon: a.icon, type: (['total_points', 'consecutive_days', 'attribute_level', 'keyword_match', 'todo_completions'].includes(a.condition.type) ? a.condition.type : 'total_points') as CType, value: a.condition.value, attribute: a.condition.attribute ?? 'knowledge', keywords: (a.condition.keywords ?? []).join(',') });

export function AchievementFormView({ open, onClose, editing, onSave, onDelete }: { open: boolean; onClose: () => void; editing?: Achievement | null; onSave?: (f: AchForm) => void; onDelete?: () => void }) {
  const toast = useToast();
  const [f, setF] = useState<AchForm>(blank);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (open) { setF(editing ? fromAch(editing) : blank); setErr(null); } }, [open, editing]);
  const set = (p: Partial<AchForm>) => setF((x) => ({ ...x, ...p }));
  const submit = () => {
    if (!f.title || !f.description || !f.icon) { setErr('请填写完整的成就信息'); return; }
    if (f.value <= 0) { setErr('成就条件值必须大于0'); return; }
    onClose(); onSave ? onSave(f) : toast.success(editing ? '成就已保存' : '成就已添加');
  };
  const custom = !!editing && editing.id.startsWith('custom_');
  return (
    <P4Dialog open={open} onClose={onClose} title={editing ? '编辑成就' : '添加自定义成就'} speaker={editing ? 'EDIT' : 'NEW'} actions="none" role="dialog">
      <div className="flex min-w-0 flex-col gap-3 rounded-sm bg-p4g-surface-2 p-3 text-p4g-ink">
        <P4Input value={f.title} onChange={(e) => set({ title: e.target.value })} placeholder="成就标题" aria-label="成就标题" />
        <P4Input value={f.description} onChange={(e) => set({ description: e.target.value })} placeholder="成就描述" aria-label="成就描述" />
        <P4Input value={f.icon} onChange={(e) => set({ icon: e.target.value })} placeholder="图标 (emoji)" aria-label="图标 (emoji)" maxLength={4} />
        <div className="grid min-w-0 grid-cols-2 gap-2">
          <P4Select aria-label="条件类型" value={f.type} onChange={(e) => set({ type: e.target.value as CType })} options={[{ value: 'total_points', label: '总点数' }, { value: 'consecutive_days', label: '连续天数' }, { value: 'attribute_level', label: '属性等级' }, { value: 'keyword_match', label: '关键字匹配' }, { value: 'todo_completions', label: '完成任务次数' }]} />
          <P4Input type="number" aria-label="条件值" value={String(f.value)} onChange={(e) => set({ value: Number(e.target.value) })} placeholder="条件值" error={f.value <= 0 ? '成就条件值必须大于0' : undefined} />
        </div>
        {f.type === 'attribute_level' && <P4Select label="选择属性" value={f.attribute} onChange={(e) => set({ attribute: e.target.value as AttributeId })} options={ATTR_IDS.map((id) => ({ value: id, label: ATTR_NAMES[id] }))} />}
        {f.type === 'keyword_match' && <P4Input label="关键字（用逗号分隔）" value={f.keywords} onChange={(e) => set({ keywords: e.target.value })} placeholder="例如：阅读,学习,看书" />}
        {err && <p className="text-meta font-bold text-p4g-danger">{err}</p>}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <P4Button onClick={submit}>{editing ? '保存' : '添加'}</P4Button>
        <P4Button variant="secondary" onClick={onClose}>取消</P4Button>
      </div>
      {custom && <P4Button variant="danger" block className="mt-2" onClick={() => { onClose(); onDelete?.(); }}>删除成就</P4Button>}
    </P4Dialog>
  );
}

export default function AchievementForm({ open, onClose, params }: OverlayProps) {
  const edit = (params?.get('variant') ?? params?.get('mode')) === 'edit';
  return <AchievementFormView open={open} onClose={onClose} editing={edit ? ACHIEVEMENTS.find((a) => a.id === 'custom_read') : null} />;
}
