/**
 * 添加自定义成就 / 编辑成就（真实 src/pages/Achievements.tsx：showAddForm / editingAchievement + AchievementFormFields，P1-12）。
 * 红频道 = kit P5Sheet 纸面抽屉（v3 pages_b.js 的「添加自定义成就」sheet 版式）。字段照真实：
 *   成就标题 / 成就描述 / 图标 (emoji) → 〔自定义才有〕条件（总点数 / 连续天数 / 属性等级 / 关键字匹配 / 完成任务次数）+ 条件值
 *   （属性等级 = Lv.− ＋ 步进器，上限 = 等级数；其余数字框）+ 静态提示「成就条件值必须大于0」
 *   → 属性等级：选择属性；关键字匹配：关键字（用逗号分隔，例如：阅读,学习,看书）
 *   → 报错条：请填写完整的成就信息 / 成就条件值必须大于0 → 「添加 / 保存」「取消」→ 编辑自定义成就时「删除成就」→ 删除确认。
 * 直达：?mode=edit（自定义）| edit-builtin（内置：只改标题/描述/图标）  ?cond=total_points|consecutive_days|attribute_level|keyword_match|todo_completions  ?state=err-empty|err-value
 */
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@/p5r-red/registry/types';
import { P5Sheet } from '@/p5r-red/kit/P5Sheet';
import { P5Seg } from '@/p5r-red/kit/P5Seg';
import { P5Stepper } from '@/p5r-red/kit/P5Stepper';
import { P5Button } from '@/p5r-red/kit/P5Button';
import { toast } from '@/p5r-red/kit/P5Toast';
import { ATTR, ATTR_ORDER, D, type AttrId } from '@/p5r-red/mock/data';
import { COND_LABEL, type CondType, type MockAch } from '@/p5r-red/mock/pkg5-data';
import { AchievementsDeleteConfirm } from './AchievementsDeleteConfirm.p5r';
import '../pkg5.p5r.css';

export interface AchForm { title: string; description: string; icon: string; condition: { type: CondType; value: number; attribute?: AttrId; keywords?: string[] } }
export const emptyAchForm: AchForm = { title: '', description: '', icon: '', condition: { type: 'total_points', value: 100 } };
const MAX_LEVEL = D.maxLevel + 5; // 等级阈值数（演示：10 级）

export function AchievementForm({ open, onClose, initial, isCustom = true, errorInit, presetCond, onSave, onDelete }: { open: boolean; onClose: () => void; initial?: MockAch | null; isCustom?: boolean; errorInit?: string | null; presetCond?: CondType | null; onSave?: (f: AchForm) => void; onDelete?: () => void }) {
  const [f, setF] = useState<AchForm>(emptyAchForm);
  const [err, setErr] = useState<string | null>(null);
  const [kwText, setKwText] = useState('');
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    if (!open) return;
    const init = initial ? { title: initial.title, description: initial.description, icon: initial.icon, condition: { ...initial.condition } } : { ...emptyAchForm, condition: { ...emptyAchForm.condition } };
    if (!initial && presetCond) init.condition = { type: presetCond, value: presetCond === 'attribute_level' ? 3 : 10, attribute: 'knowledge', keywords: [] };
    if (errorInit === 'err-empty') init.title = '';
    if (errorInit === 'err-value') init.condition.value = 0;
    setF(init); setKwText(init.condition.keywords?.join(', ') ?? '');
    setErr(errorInit === 'err-empty' ? '请填写完整的成就信息' : errorInit === 'err-value' ? '成就条件值必须大于0' : null);
  }, [open, initial, errorInit, presetCond]);
  const setType = (type: CondType) => setF((p) => ({ ...p, condition: type === 'attribute_level' ? { ...p.condition, type, attribute: p.condition.attribute || 'knowledge', value: Math.min(Math.max(1, p.condition.value), MAX_LEVEL) } : type === 'keyword_match' ? { ...p.condition, type, keywords: p.condition.keywords || [] } : { ...p.condition, type } }));
  const submit = () => {
    if (!f.title || !f.description || !f.icon) { setErr('请填写完整的成就信息'); return; }
    if (isCustom && f.condition.value <= 0) { setErr('成就条件值必须大于0'); return; }
    onSave?.(f); onClose(); toast(initial ? '已保存' : '已添加自定义成就');
  };
  const c = f.condition;
  return (
    <>
      <P5Sheet open={open} onClose={onClose} title={initial ? '编辑成就' : '添加自定义成就'} seed={41} className="af">
        <input className="inp" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="成就标题" aria-label="成就标题" />
        <textarea className="inp af-ta" rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="成就描述" aria-label="成就描述" />
        <input className="inp" value={f.icon} onChange={(e) => setF({ ...f, icon: e.target.value })} placeholder="图标 (emoji)" aria-label="图标 (emoji)" />
        {isCustom && (
          <>
            <div className="fld"><span>条件</span><P5Seg items={(Object.keys(COND_LABEL) as CondType[]).map((k) => ({ id: k, label: COND_LABEL[k] }))} value={c.type} onChange={setType} /></div>
            <div className="fld"><span>条件值</span>
              {c.type === 'attribute_level'
                ? <div><P5Stepper value={c.value} min={1} max={MAX_LEVEL} onChange={(v) => setF({ ...f, condition: { ...c, value: v } })} unit="级" label="属性等级" /><small className="af-lv">Lv.{c.value}</small></div>
                : <input className="inp" type="number" min={1} value={c.value} onChange={(e) => setF({ ...f, condition: { ...c, value: parseInt(e.target.value) || 1 } })} placeholder="条件值" aria-label="条件值" />}
              <p className="p5k-hint af-red">成就条件值必须大于0</p>
            </div>
            {c.type === 'attribute_level' && <div className="fld"><span>选择属性</span><P5Seg items={ATTR_ORDER.map((a) => ({ id: a, label: ATTR[a].name }))} value={c.attribute ?? 'knowledge'} onChange={(a) => setF({ ...f, condition: { ...c, attribute: a } })} /></div>}
            {c.type === 'keyword_match' && <label className="fld"><span>关键字（用逗号分隔）</span><input className="inp" value={kwText} onChange={(e) => { setKwText(e.target.value); setF({ ...f, condition: { ...c, keywords: e.target.value.split(/[,，]/).map((k) => k.trim()).filter(Boolean) } }); }} placeholder="例如：阅读,学习,看书" /></label>}
          </>
        )}
        {err && <div className="p5k-err" role="alert">{err}</div>}
        <div className="p5k-acts full">
          <P5Button tone="red" size="lg" seed={162} onClick={submit}>{initial ? '保存' : '添加'}</P5Button>
          <P5Button tone="ink" size="lg" seed={161} onClick={onClose}>取消</P5Button>
        </div>
        {initial && isCustom && <button type="button" className="af-del" onClick={() => setConfirm(true)}>删除成就</button>}
      </P5Sheet>
      <AchievementsDeleteConfirm open={confirm} onClose={() => setConfirm(false)} onConfirm={() => { onDelete?.(); onClose(); }} />
    </>
  );
}

export default function AchievementFormPreview({ open, onClose, params }: OverlayProps) {
  const mode = params?.get('mode');
  const base: MockAch = { id: 'custom_book', icon: '📚', letter: 'R', title: '书虫', description: '和书有关的记录 10 次', condition: { type: 'keyword_match', value: 10, keywords: ['阅读', '看书'] }, progress: 4, unlocked: false };
  const init = mode === 'edit' ? base : mode === 'edit-builtin' ? { ...base, id: 'a_k3', title: '知识的门槛', description: '知识达到 Lv.3', icon: '📖' } : null;
  return <AchievementForm open={open} onClose={onClose} initial={init} isCustom={mode !== 'edit-builtin'} errorInit={params?.get('state')} presetCond={params?.get('cond') as CondType | null} />;
}
