/**
 * 刷新等级称号 · 建议选择（真实 Settings.tsx levelTitleModalOpen）。
 * 「确认刷新：X」「i / 5 · 已选 N 个属性」、上一个/下一个属性、圆点切换、「刷新这个属性」勾选、表格 等级/当前/建议、取消 / 应用 N 个（应用中）、关闭。
 */
import { useState } from 'react';
import type { AttributeId } from '@real/types';
import type { OverlayProps } from '@yellow/registry/types';
import { P6Sheet } from '@yellow/screens/pkg6/sheet';
import { ATTRS, DEFAULT_LEVEL_TITLES, SUGGESTED_LEVEL_TITLES } from '@yellow/mock/pkg6';
import { attrLabel, updateSettings, useSettings } from '@yellow/screens/pkg6/settingsStore';
import { P4Button, useToast } from '@yellow/kit';
import { cx } from '@yellow/lib/cx';

export function LevelTitleModal({ open, onClose, onApplied }: { open: boolean; onClose: () => void; onApplied?: (n: number) => void }) {
  const s = useSettings();
  const [idx, setIdx] = useState(0);
  const [sel, setSel] = useState<Record<AttributeId, boolean>>({ knowledge: true, guts: true, dexterity: true, kindness: false, charm: true });
  const [busy, setBusy] = useState(false);
  const meta = ATTRS[idx];
  const count = Object.values(sel).filter(Boolean).length;
  const cur = s.levelTitles[meta.id] ?? DEFAULT_LEVEL_TITLES[meta.id];
  const sug = SUGGESTED_LEVEL_TITLES[meta.id];
  const apply = () => {
    setBusy(true);
    setTimeout(() => {
      const next = { ...s.levelTitles };
      ATTRS.forEach((a) => { if (sel[a.id]) next[a.id] = next[a.id].map((t, i) => SUGGESTED_LEVEL_TITLES[a.id][i] ?? t); });
      updateSettings({ levelTitles: next }); setBusy(false); onApplied?.(count); onClose();
    }, 800);
  };
  const Arrow = ({ dir }: { dir: -1 | 1 }) => (
    <button type="button" aria-label={dir < 0 ? '上一个属性' : '下一个属性'} onClick={() => setIdx((i) => (i + dir + ATTRS.length) % ATTRS.length)}
      className="p4g-press flex h-10 w-10 shrink-0 items-center justify-center rounded-pill border-3 border-p4g-black bg-p4g-yellow font-display text-h2 font-bold text-p4g-black night:border-p4g-yellow">{dir < 0 ? '‹' : '›'}</button>
  );
  return (
    <P6Sheet open={open} onClose={onClose} position="center" busy={busy} title={`确认刷新：${attrLabel(s, meta.id)}`} en={`${idx + 1} / ${ATTRS.length} · 已选 ${count} 个属性`}
      footer={<div className="flex gap-3"><P4Button variant="secondary" block disabled={busy} onClick={onClose}>取消</P4Button><P4Button block busy={busy} disabled={busy || count === 0} onClick={apply}>{busy ? '应用中' : `应用 ${count} 个`}</P4Button></div>}>
      <div className="space-y-3 pt-1">
        <div className="flex min-w-0 items-center gap-3">
          <Arrow dir={-1} />
          <div className="min-w-0 flex-1 text-center">
            <div aria-hidden className="text-h1">{meta.icon}</div>
            <div className="truncate font-display text-lead font-bold">{attrLabel(s, meta.id)}</div>
            <div className="truncate font-display text-2xs font-bold uppercase tracking-[0.2em] text-p4g-ink-soft">{meta.id}</div>
          </div>
          <Arrow dir={1} />
        </div>
        <div className="flex justify-center gap-1.5">
          {ATTRS.map((a, i) => <button key={a.id} type="button" onClick={() => setIdx(i)} aria-label={`切换到${attrLabel(s, a.id)}`} className={cx('h-2 rounded-pill transition-all', i === idx ? 'w-6 bg-p4g-orange' : 'w-2 bg-p4g-line/30')} />)}
        </div>
        <label className="flex cursor-pointer items-center gap-2 rounded-[4px] bg-p4g-surface px-3 py-2">
          <input type="checkbox" className="h-5 w-5 accent-[color:var(--p4g-orange)]" checked={!!sel[meta.id]} onChange={(e) => setSel({ ...sel, [meta.id]: e.target.checked })} />
          <span className="font-display text-body font-bold">刷新这个属性</span>
        </label>
        <div className={cx('overflow-hidden rounded-[4px] border-2 border-p4g-black night:border-p4g-yellow', !sel[meta.id] && 'opacity-50')}>
          <div className="grid grid-cols-[3.2em_minmax(0,1fr)_minmax(0,1fr)] bg-p4g-black px-3 py-1.5 font-display text-meta font-bold text-p4g-yellow"><span>等级</span><span>当前</span><span>建议</span></div>
          {sug.map((t, i) => (
            <div key={i} className={cx('grid grid-cols-[3.2em_minmax(0,1fr)_minmax(0,1fr)] items-center px-3 py-1.5 text-body', i % 2 ? 'bg-p4g-surface' : 'bg-p4g-surface-2')}>
              <span className="p4g-num">Lv.{i + 1}</span><span className="truncate">{cur[i]}</span><span className="truncate font-bold text-p4g-tag">{t}</span>
            </div>
          ))}
        </div>
      </div>
    </P6Sheet>
  );
}

export default function SettingsLevelTitleModal({ open, onClose }: OverlayProps) {
  const toast = useToast();
  return <LevelTitleModal open={open} onClose={onClose} onApplied={(n) => toast.success(`已刷新 ${n} 个属性的等级称号`)} />;
}
