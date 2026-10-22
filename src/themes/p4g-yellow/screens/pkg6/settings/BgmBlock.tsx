/** 设置 · 导入音乐（真实 components/BgmSettings.tsx）：常态折叠，主题分区最下方 */
import { useRef, useState } from 'react';
import { CfgBtn, CfgSelect, CfgSlider, CfgToggle } from '../cfg';
import { updateSettings, useSettings } from '../settingsStore';
import { BGM_MAX_TRACKS, BGM_THEME_LABEL, BGM_TRACKS, type BgmTrack } from '@yellow/mock/pkg6';
import { BgmDeleteDialog } from '@yellow/screens/overlays/BgmSettingsDeleteConfirm.p4g';
import { useToast } from '@yellow/kit';
import { cx } from '@yellow/lib/cx';

const fmtSize = (b: number) => `${(b / 1_048_576).toFixed(1)} MB`;

export function BgmBlock({ defaultOpen }: { defaultOpen?: boolean }) {
  const s = useSettings();
  const toast = useToast();
  const [open, setOpen] = useState(!!defaultOpen);
  const [tracks, setTracks] = useState<BgmTrack[]>(BGM_TRACKS);
  const [del, setDel] = useState<BgmTrack | null>(null);
  const [busy, setBusy] = useState(false);
  const [vol, setVol] = useState<number | null>(null);
  const [playing, setPlaying] = useState<string | null>('t1');
  const fileRef = useRef<HTMLInputElement>(null);
  const enabled = s.bgmEnabled;
  const nameOf = (id: string) => tracks.find((t) => t.id === id)?.name;
  const opts = (allowFollow: boolean, followLabel?: string) => [{ value: '', label: allowFollow ? (followLabel ?? '跟随主页曲目') : '不放' }, ...tracks.map((t) => ({ value: t.id, label: t.name }))];
  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <label className="flex min-w-0 items-center gap-3"><span className="w-[5.5em] shrink-0 font-display text-meta font-bold">{label}</span><span className="min-w-0 flex-1">{children}</span></label>
  );

  return (
    <section className="min-w-0 overflow-hidden rounded-[4px] border-3 border-p4g-black bg-p4g-black text-p4g-white shadow-hard night:border-p4g-yellow">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full min-w-0 items-center gap-3 px-3 py-2.5 text-left">
        <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-p4g-yellow text-h3 text-p4g-black">♪</span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-lead font-bold text-p4g-yellow">导入音乐</span>
          <span className="block truncate text-meta text-p4g-white/80">{tracks.length ? `${tracks.length} 首 · ${enabled ? (playing ? '播放中' : '已开启') : '已关闭'}` : '本机 BGM'}</span>
        </span>
        <span aria-hidden className="font-display text-body text-p4g-yellow">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="space-y-3 border-t-2 border-dashed border-p4g-white/25 bg-p4g-surface-2 p-3 text-p4g-ink">
          <p className="text-meta leading-relaxed text-p4g-ink-soft">把自己的音乐导进来当背景音：只在本机播放，不上云、不进备份，最多 {BGM_MAX_TRACKS} 首、单首 20 MB。<br /><b className="text-p4g-tag">请只导入你有权使用的音频；录屏或分享时注意版权。</b></p>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <input ref={fileRef} type="file" accept="audio/*" multiple className="sr-only" aria-label="选择音频文件" onChange={(e) => {
              const fs = Array.from(e.target.files ?? []); if (!fs.length) return; setBusy(true);
              setTimeout(() => { setTracks((t) => [...t, ...fs.map((f, i) => ({ id: `u${Date.now()}${i}`, name: f.name.replace(/\.[^.]+$/, ''), size: f.size }))].slice(0, BGM_MAX_TRACKS)); setBusy(false); }, 500);
            }} />
            <CfgBtn tone="primary" disabled={busy || tracks.length >= BGM_MAX_TRACKS} onClick={() => fileRef.current?.click()}>{busy ? '导入中…' : tracks.length >= BGM_MAX_TRACKS ? `已满 ${BGM_MAX_TRACKS} 首` : '导入音乐'}</CfgBtn>
            <span className="ml-auto flex items-center gap-2"><span className="font-display text-meta font-bold">播放</span><CfgToggle ariaLabel="播放背景音乐" checked={enabled} onChange={(v) => updateSettings({ bgmEnabled: v })} /></span>
          </div>
          {tracks.length > 0 && (
            <ul className="grid grid-cols-1 gap-1">
              {tracks.map((t, i) => {
                const isPlaying = enabled && playing === t.id;
                return (
                  <li key={t.id} className={cx('flex min-w-0 items-center gap-2 rounded-[3px] px-2 py-1.5', isPlaying ? 'bg-p4g-select text-[color:var(--p4g-select-ink)]' : 'bg-p4g-surface')}>
                    <span className="p4g-num w-6 shrink-0 text-center text-body">{String(i + 1).padStart(2, '0')}</span>
                    <button type="button" onClick={() => setPlaying(t.id)} className="min-w-0 flex-1 text-left">
                      <span className="block truncate font-display text-body font-bold">{t.name}</span>
                      <span className="block text-2xs opacity-75">{fmtSize(t.size)}{isPlaying ? ' · 播放中' : ''}</span>
                    </button>
                    <button type="button" onClick={() => setDel(t)} aria-label={`删除 ${t.name}`} className="shrink-0 rounded-[3px] border-2 border-current px-2 py-0.5 font-display text-2xs font-bold">删除</button>
                  </li>
                );
              })}
            </ul>
          )}
          <div>
            <div className="mb-1 font-display text-meta font-bold">音乐音量</div>
            <CfgSlider ariaLabel="音乐音量" min={0} max={100} step={5} value={vol ?? s.bgmVolume} suffix="%" onChange={setVol} onCommit={() => { if (vol != null) { updateSettings({ bgmVolume: vol }); setVol(null); } }} />
            <p className="mt-1 text-2xs text-p4g-muted">与音效音量各自独立；「静音模式」开着时音乐也静音。</p>
          </div>
          <div className="space-y-2 rounded-[3px] border-2 border-dashed border-p4g-line/30 p-2.5">
            <div className="font-display text-body font-bold">在哪里放哪首</div>
            <Row label="战斗"><CfgSelect className="w-full" aria-label="战斗曲目" value={s.bgmBattle} onChange={(e) => updateSettings({ bgmBattle: e.target.value })} options={opts(true)} /></Row>
            <Row label="Boss 战"><CfgSelect className="w-full" aria-label="Boss 战曲目" value={s.bgmBoss} onChange={(e) => updateSettings({ bgmBoss: e.target.value })} options={opts(true, '跟随战斗曲目')} /></Row>
            <Row label="爬塔"><CfgSelect className="w-full" aria-label="爬塔曲目" value={s.bgmTower} onChange={(e) => updateSettings({ bgmTower: e.target.value })} options={opts(true)} /></Row>
            <div className="pt-1 font-display text-meta font-bold text-p4g-ink-soft">各主题的主页默认曲目</div>
            {BGM_THEME_LABEL.map(([th, label]) => (
              <Row key={th} label={`${label}主题`}><CfgSelect className="w-full" aria-label={`${label}主题曲目`} value={s.bgmHome[th] ?? ''} onChange={(e) => updateSettings({ bgmHome: { ...s.bgmHome, [th]: e.target.value } })} options={opts(false)} /></Row>
            ))}
          </div>
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-[3px] bg-p4g-black px-3 py-2 text-p4g-white">
            <span className="min-w-0 truncate text-meta">{enabled && playing ? `正在播放：${nameOf(playing) ?? ''}` : enabled ? '现在没有在放（当前场景没选曲，或 App 在后台）' : '已关闭'}</span>
            <button type="button" onClick={() => toast('重新播放', { duration: 900 })} className="shrink-0 font-display text-meta font-bold text-p4g-yellow underline">没响？点一下重放</button>
          </div>
        </div>
      )}
      <BgmDeleteDialog open={!!del} name={del?.name ?? ''} onClose={() => setDel(null)} onConfirm={() => { if (del) { setTracks((t) => t.filter((x) => x.id !== del.id)); if (playing === del.id) setPlaying(null); } }} />
    </section>
  );
}
