/**
 * AI 匹配成就 / 技能名称 · 覆写选择（真实 Settings.tsx presetName modal）。
 * 「确认覆写：X」「i / 5 · 已选 N 项」、维度切换、Achievements / Skills 勾选列表（当前 / 建议）、「这一维没有可覆写的建议。」、取消 / 应用 N 项。
 */
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import { P6Sheet } from '@yellow/screens/pkg6/sheet';
import { ATTRS, NAME_MATCH } from '@yellow/mock/pkg6';
import { attrLabel, useSettings } from '@yellow/screens/pkg6/settingsStore';
import { P4Button, useToast } from '@yellow/kit';
import { cx } from '@yellow/lib/cx';
import { ACHIEVEMENTS, SKILLS } from '@/constants';
import { applyPresetNameMatches } from '@/utils/presetNameApply';
import type { PresetNameMatchResult } from '@/utils/presetNameMatcher';

export function NameMatchModal({ open, suggestions, onClose, onApplied }: {
  open: boolean;
  suggestions: PresetNameMatchResult | null;
  onClose: () => void;
  onApplied?: (count: number) => void;
}) {
  const s = useSettings();
  const [idx, setIdx] = useState(0);
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const meta = ATTRS[idx];
  const achs = ACHIEVEMENTS.filter((a) => a.condition.type === 'attribute_level' && a.condition.attribute === meta.id && suggestions?.achievements[a.id]);
  const skills = SKILLS.filter((a) => a.requiredAttribute === meta.id && suggestions?.skills[a.id]);
  const count = Object.values(sel).filter(Boolean).length;
  useEffect(() => {
    if (!suggestions) return;
    setSel(Object.fromEntries([
      ...Object.keys(suggestions.achievements),
      ...Object.keys(suggestions.skills),
    ].map((id) => [id, true])));
  }, [suggestions]);
  const apply = async () => {
    if (!suggestions || busy) return;
    const achievements: Record<string, string> = {};
    const skills: Record<string, string> = {};
    for (const [id, name] of Object.entries(suggestions.achievements)) if (sel[id]) achievements[id] = name;
    for (const [id, name] of Object.entries(suggestions.skills)) if (sel[id]) skills[id] = name;
    if (!Object.keys(achievements).length && !Object.keys(skills).length) return;
    setBusy(true);
    try {
      const applied = await applyPresetNameMatches({ achievements, skills });
      onApplied?.(applied);
      onClose();
    } finally {
      setBusy(false);
    }
  };
  const Item = ({ id, cur, suggest, desc }: { id: string; cur: string; suggest: string; desc: string }) => {
    const on = !!sel[id];
    return (
      <button type="button" onClick={() => setSel({ ...sel, [id]: !on })} aria-pressed={on}
        className={cx('flex w-full min-w-0 items-start gap-2.5 rounded-[4px] border-2 p-2.5 text-left', on ? 'border-p4g-black bg-p4g-yellow-pale text-p4g-black night:border-p4g-yellow night:bg-p4g-surface night:text-p4g-ink' : 'border-dashed border-p4g-line/40')}>
        <span className={cx('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[3px] border-2 text-meta font-bold', on ? 'border-p4g-black bg-p4g-black text-p4g-yellow night:border-p4g-yellow night:bg-p4g-yellow night:text-p4g-black' : 'border-p4g-line/50 text-transparent')}>✓</span>
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-body">
            <span className="shrink-0 rounded-[2px] bg-p4g-line/15 px-1 text-2xs">当前</span><span className="truncate line-through opacity-70">{cur}</span>
            <span aria-hidden>→</span>
            <span className="shrink-0 rounded-[2px] bg-p4g-orange px-1 text-2xs text-p4g-black">建议</span><b className="truncate">{suggest}</b>
          </span>
          <span className="mt-0.5 block truncate text-meta opacity-75">{desc}</span>
        </span>
      </button>
    );
  };
  return (
    <P6Sheet open={open && !!suggestions} onClose={onClose} position="center" busy={busy} title={`确认覆写：${attrLabel(s, meta.id)}`} en={`${idx + 1} / ${ATTRS.length} · 已选 ${count} 项`}
      footer={<div className="flex gap-3"><P4Button variant="secondary" block disabled={busy} onClick={onClose}>取消</P4Button><P4Button block disabled={busy || !count} onClick={() => void apply()}>{busy ? '应用中' : `应用 ${count} 项`}</P4Button></div>}>
      <div className="space-y-3 pt-1">
        <div className="flex min-w-0 items-center gap-2">
          <button type="button" aria-label="上一个属性" onClick={() => setIdx((i) => (i + 4) % 5)} className="p4g-press h-10 w-10 shrink-0 rounded-pill border-3 border-p4g-black bg-p4g-yellow font-display text-h2 font-bold text-p4g-black night:border-p4g-yellow">‹</button>
          <div className="flex min-w-0 flex-1 justify-center gap-1.5">
            {ATTRS.map((a, i) => <button key={a.id} type="button" onClick={() => setIdx(i)} aria-label={`切换到${attrLabel(s, a.id)}`} className={cx('rounded-[3px] px-1.5 py-1 text-h3', i === idx ? 'bg-p4g-black night:bg-p4g-yellow' : 'opacity-50')}>{a.icon}</button>)}
          </div>
          <button type="button" aria-label="下一个属性" onClick={() => setIdx((i) => (i + 1) % 5)} className="p4g-press h-10 w-10 shrink-0 rounded-pill border-3 border-p4g-black bg-p4g-yellow font-display text-h2 font-bold text-p4g-black night:border-p4g-yellow">›</button>
        </div>
        {achs.length === 0 && skills.length === 0 && <p className="rounded-[4px] border-2 border-dashed border-p4g-line/40 px-3 py-6 text-center text-body text-p4g-ink-soft">这一维没有可覆写的建议。</p>}
        {achs.length > 0 && <div className="space-y-1.5"><div className="font-display text-meta font-bold uppercase tracking-[0.22em] text-p4g-ink-soft">Achievements</div>{achs.map((a) => <Item key={a.id} id={a.id} cur={a.title} suggest={suggestions!.achievements[a.id]} desc={a.description} />)}</div>}
        {skills.length > 0 && <div className="space-y-1.5"><div className="font-display text-meta font-bold uppercase tracking-[0.22em] text-p4g-ink-soft">Skills</div>{skills.map((a) => <Item key={a.id} id={a.id} cur={a.name} suggest={suggestions!.skills[a.id]} desc={`Lv.${a.requiredLevel} · ${a.description}`} />)}</div>}
      </div>
    </P6Sheet>
  );
}

export default function SettingsNameMatchModal({ open, onClose }: OverlayProps) {
  const toast = useToast();
  const suggestions = {
    achievements: Object.fromEntries(NAME_MATCH.achievements.map((item) => [item.id, item.suggest])),
    skills: Object.fromEntries(NAME_MATCH.skills.map((item) => [item.id, item.suggest])),
  };
  return <NameMatchModal open={open} suggestions={suggestions} onClose={onClose} onApplied={() => toast.success('已覆写所选成就/技能名称，可还原到覆写前版本')} />;
}
