/**
 * 刷新等级称号 · 建议选择（真实 Settings.tsx levelTitleModalOpen）。
 * 「确认刷新：X」「i / 5 · 已选 N 个属性」、上一个/下一个属性、圆点切换、「刷新这个属性」勾选、表格 等级/当前/建议、取消 / 应用 N 个（应用中）、关闭。
 */
import { useState } from 'react';
import type { AttributeId } from '@real/types';
import type { OverlayProps } from '@pink/registry/types';
import { P6Sheet } from '@pink/screens/pkg6/sheet';
import { ATTRS, DEFAULT_LEVEL_TITLES, SUGGESTED_LEVEL_TITLES } from '@pink/mock/pkg6';
import { attrLabel, updateSettings, useSettings } from '@pink/screens/pkg6/settingsStore';
import { P3Button, useToast } from '@pink/kit';
import { cx } from '@pink/lib/cx';

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
      className="p6-press flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-p3r-lilac/50 bg-p3r-rose font-heavy text-h2 font-bold text-p3r-on-rose">{dir < 0 ? '‹' : '›'}</button>
  );
  return (
    <P6Sheet open={open} onClose={onClose} position="center" busy={busy} title={`确认刷新：${attrLabel(s, meta.id)}`} en={`${idx + 1} / ${ATTRS.length} · 已选 ${count} 个属性`}
      footer={<div className="flex gap-3"><P3Button tone="soft" block disabled={busy} onClick={onClose}>取消</P3Button><P3Button block busy={busy} disabled={busy || count === 0} onClick={apply}>{busy ? '应用中' : `应用 ${count} 个`}</P3Button></div>}>
      <div className="space-y-3 pt-1">
        <div className="flex min-w-0 items-center gap-3">
          <Arrow dir={-1} />
          <div className="min-w-0 flex-1 text-center">
            <div aria-hidden className="text-h1">{meta.icon}</div>
            <div className="truncate font-heavy text-lead font-bold">{attrLabel(s, meta.id)}</div>
            <div className="truncate font-cond text-2xs font-bold uppercase tracking-[0.2em] text-p3r-ink-soft">{meta.id}</div>
          </div>
          <Arrow dir={1} />
        </div>
        <div className="flex justify-center gap-1.5">
          {ATTRS.map((a, i) => <button key={a.id} type="button" onClick={() => setIdx(i)} aria-label={`切换到${attrLabel(s, a.id)}`} className={cx('h-2 rounded-full transition-all', i === idx ? 'w-6 bg-p3r-coral' : 'w-2 bg-p3r-lilac/30')} />)}
        </div>
        <label className="flex cursor-pointer items-center gap-2 rounded-none bg-p3r-panel px-3 py-2">
          <input type="checkbox" className="h-5 w-5 accent-[color:var(--p3r-magenta)]" checked={!!sel[meta.id]} onChange={(e) => setSel({ ...sel, [meta.id]: e.target.checked })} />
          <span className="font-heavy text-body font-bold">刷新这个属性</span>
        </label>
        <div className={cx('overflow-hidden rounded-none border-2 border-p3r-lilac/50', !sel[meta.id] && 'opacity-50')}>
          <div className="grid grid-cols-[3.2em_minmax(0,1fr)_minmax(0,1fr)] bg-p3r-ink px-3 py-1.5 font-heavy text-meta font-bold text-p3r-rose"><span>等级</span><span>当前</span><span>建议</span></div>
          {sug.map((t, i) => (
            <div key={i} className={cx('grid grid-cols-[3.2em_minmax(0,1fr)_minmax(0,1fr)] items-center px-3 py-1.5 text-body', i % 2 ? 'bg-p3r-panel' : 'bg-p3r-blush-faint')}>
              <span className="font-cond tabular">Lv.{i + 1}</span><span className="truncate">{cur[i]}</span><span className="truncate font-bold text-p3r-lilac-ink">{t}</span>
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
