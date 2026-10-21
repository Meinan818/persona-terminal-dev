/**
 * 添加技能 / 编辑技能（真实 src/pages/Achievements.tsx SkillsTab 的 skill modal，P1-13）。红频道 = kit P5Sheet。
 * 字段照真实：技能名称 → 技能效果（自动生成：「知识积累额外提升 20%」）→〔新建或自定义才有〕需求属性 / 需求等级（2–N，Lv.− ＋）/ 额外加成倍数（1.0–3.0）
 *   → 报错条「技能开启等级不能为1级，请设置2级或以上」→ 添加 / 保存 · 取消 → 编辑自定义技能时「删除技能」→ 删除确认。
 * 编辑页额外显示「本属性已解锁技能的合计加成」（合计 ×N / 已达上限 ×3.0）。
 * 直达：?mode=edit（自定义）| edit-builtin（内置：只改名称）  ?state=err-level
 */
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@/p5r-red/registry/types';
import { P5Sheet } from '@/p5r-red/kit/P5Sheet';
import { P5Seg } from '@/p5r-red/kit/P5Seg';
import { P5Stepper } from '@/p5r-red/kit/P5Stepper';
import { P5Button } from '@/p5r-red/kit/P5Button';
import { toast } from '@/p5r-red/kit/P5Toast';
import { ATTR, ATTR_ORDER, type AttrId } from '@/p5r-red/mock/data';
import { SKILLS, SKILL_BONUS_MULT_CAP, skillEffect, type MockSkill } from '@/p5r-red/mock/pkg5-data';
import { AchievementsSkillDeleteConfirm } from './AchievementsSkillDeleteConfirm.p5r';
import '../pkg5.p5r.css';

const LEVELS = 10;
export interface SkillFormVal { name: string; requiredAttribute: AttrId; requiredLevel: number; bonusMultiplier: number }

export function SkillForm({ open, onClose, initial, errorInit, onSave, onDelete }: { open: boolean; onClose: () => void; initial?: MockSkill | null; errorInit?: string | null; onSave?: (v: SkillFormVal) => void; onDelete?: () => void }) {
  const [v, setV] = useState<SkillFormVal>({ name: '', requiredAttribute: 'knowledge', requiredLevel: 2, bonusMultiplier: 1.2 });
  const [multText, setMultText] = useState('1.2');
  const [err, setErr] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const custom = !initial || initial.id.startsWith('custom_');
  useEffect(() => {
    if (!open) return;
    const init = initial ? { name: initial.name, requiredAttribute: initial.requiredAttribute, requiredLevel: initial.requiredLevel, bonusMultiplier: initial.bonusMultiplier } : { name: '', requiredAttribute: 'knowledge' as AttrId, requiredLevel: 2, bonusMultiplier: 1.2 };
    if (errorInit === 'err-level') { init.requiredLevel = 1; init.name = init.name || '初心'; }
    setV(init); setMultText(String(init.bonusMultiplier)); setErr(errorInit === 'err-level' ? '技能开启等级不能为1级，请设置2级或以上' : null);
  }, [open, initial, errorInit]);
  const mult = Math.min(3, Math.max(1, v.bonusMultiplier || 1));
  const attrSkills = SKILLS.filter((s) => s.requiredAttribute === v.requiredAttribute && s.unlocked);
  const raw = attrSkills.reduce((m, s) => m * s.bonusMultiplier, 1), capped = raw > SKILL_BONUS_MULT_CAP;
  const submit = () => {
    if (!v.name.trim()) { setErr('请填写技能名称'); return; }
    if (v.requiredLevel < 2) { setErr('技能开启等级不能为1级，请设置2级或以上'); return; }
    onSave?.({ ...v, bonusMultiplier: mult }); onClose(); toast(initial ? '已保存' : '已添加技能');
  };
  return (
    <>
      <P5Sheet open={open} onClose={onClose} title={initial ? '编辑技能' : '添加技能'} seed={43} className="af">
        <label className="fld"><span>技能名称</span><input className="inp" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder="技能名称" /></label>
        <div className="fld"><span>技能效果（自动生成）</span><div className="af-auto">{skillEffect(v.requiredAttribute, mult, ATTR)}</div></div>
        {custom && (
          <>
            <div className="fld"><span>需求属性</span><P5Seg items={ATTR_ORDER.map((a) => ({ id: a, label: ATTR[a].name }))} value={v.requiredAttribute} onChange={(a) => setV({ ...v, requiredAttribute: a })} /></div>
            <div className="fld"><span>需求等级（2–{LEVELS}）</span><div><P5Stepper value={v.requiredLevel} min={errorInit === 'err-level' ? 1 : 2} max={LEVELS} onChange={(n) => setV({ ...v, requiredLevel: n })} label="需求等级" /><small className="af-lv">Lv.{v.requiredLevel}</small></div></div>
            <label className="fld"><span>额外加成倍数（1.0–3.0）</span><input className="inp" type="number" min={1} max={3} step={0.1} value={multText}
              onChange={(e) => { setMultText(e.target.value); const n = parseFloat(e.target.value); setV({ ...v, bonusMultiplier: Number.isFinite(n) ? Math.min(3, Math.max(1, n)) : 1 }); }} /></label>
          </>
        )}
        {initial && attrSkills.length > 0 && (
          <p className="af-total" title={capped ? `技能连乘已超过上限，按 ×${SKILL_BONUS_MULT_CAP.toFixed(1)} 生效` : '本属性已解锁技能的合计加成'}>
            本属性已解锁技能的合计加成：<b>{capped ? `已达上限 ×${SKILL_BONUS_MULT_CAP.toFixed(1)}` : `合计 ×${raw.toFixed(2).replace(/0$/, '')}`}</b>
          </p>
        )}
        {err && <div className="p5k-err" role="alert">{err}</div>}
        <div className="p5k-acts full">
          <P5Button tone="red" size="lg" seed={163} onClick={submit}>{initial ? '保存' : '添加'}</P5Button>
          <P5Button tone="ink" size="lg" seed={164} onClick={onClose}>取消</P5Button>
        </div>
        {initial && initial.id.startsWith('custom_') && <button type="button" className="af-del" onClick={() => setConfirm(true)}>删除技能</button>}
      </P5Sheet>
      <AchievementsSkillDeleteConfirm open={confirm} onClose={() => setConfirm(false)} onConfirm={() => { onDelete?.(); onClose(); }} />
    </>
  );
}

export default function SkillFormPreview({ open, onClose, params }: OverlayProps) {
  const mode = params?.get('mode');
  const init = mode === 'edit' ? SKILLS.find((s) => s.id === 'custom_k5')! : mode === 'edit-builtin' ? SKILLS[0] : null;
  return <SkillForm open={open} onClose={onClose} initial={init} errorInit={params?.get('state')} />;
}
