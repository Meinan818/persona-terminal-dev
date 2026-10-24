/** 设置 · 导入音乐（真实 components/BgmSettings.tsx）：常态折叠，主题分区最下方 */
import { useEffect, useRef, useState } from 'react';
import { CfgBtn, CfgSelect, CfgSlider, CfgToggle } from '../cfg';
import { updateSettings, useSettings } from '../settingsStore';
import { BGM_THEME_LABEL } from '@blue/mock/pkg6';
import { BgmDeleteDialog } from '@blue/screens/overlays/BgmSettingsDeleteConfirm.p3r';
import { useToast } from '@blue/kit';
import { cx } from '@blue/lib/cx';
import type { BgmTrack } from '@real/types';
import { BGM_MAX_TRACKS, getBgmState, importBgmTrack, listBgmTracks, previewBgmVolume, refreshBgm, removeBgmTrack, subscribeBgm, unlockBgm } from '@/utils/bgm';

const fmtSize = (b: number) => `${(b / 1_048_576).toFixed(1)} MB`;

export function BgmBlock({ defaultOpen }: { defaultOpen?: boolean }) {
  const s = useSettings();
  const toast = useToast();
  const [open, setOpen] = useState(!!defaultOpen);
  const [tracks, setTracks] = useState<BgmTrack[]>([]);
  const [del, setDel] = useState<BgmTrack | null>(null);
  const [busy, setBusy] = useState(false);
  const [vol, setVol] = useState<number | null>(null);
  const [, bump] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const enabled = s.bgmEnabled;
  const bgmState = getBgmState();
  const playing = bgmState.playing ? bgmState.trackId : null;
  const nameOf = (id: string) => tracks.find((t) => t.id === id)?.name;
  const opts = (allowFollow: boolean, followLabel?: string) => [{ value: '', label: allowFollow ? (followLabel ?? '跟随主页曲目') : '不放' }, ...tracks.map((t) => ({ value: t.id, label: t.name }))];
  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <label className="flex min-w-0 items-center gap-3"><span className="w-[5.5em] shrink-0 font-heavy text-meta font-bold">{label}</span><span className="min-w-0 flex-1">{children}</span></label>
  );
  useEffect(() => { void listBgmTracks().then(setTracks); }, []);
  useEffect(() => subscribeBgm(() => bump((n) => n + 1)), []);
  const onFiles = async (files: File[]) => {
    if (!files.length) return;
    setBusy(true);
    try {
      unlockBgm();
      for (const file of files) await importBgmTrack(file);
      setTracks(await listBgmTracks());
    } catch (e) {
      toast(e instanceof Error ? e.message : '导入失败', { duration: 2200 });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <section className="min-w-0 overflow-hidden rounded-none border-2 border-p3r-lilac/50 bg-p3r-ink text-p3r-on-ink">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full min-w-0 items-center gap-3 px-3 py-2.5 text-left">
        <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-p3r-rose text-h3 text-p3r-on-rose">♪</span>
        <span className="min-w-0 flex-1">
          <span className="block font-heavy text-lead font-bold text-p3r-rose">导入音乐</span>
          <span className="block truncate text-meta text-p3r-on-ink/80">{tracks.length ? `${tracks.length} 首 · ${enabled ? (playing ? '播放中' : '已开启') : '已关闭'}` : '本机 BGM'}</span>
        </span>
        <span aria-hidden className="font-heavy text-body text-p3r-rose">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="space-y-3 border-t-2 border-dashed border-p3r-panel/25 bg-p3r-blush-faint p-3 text-p3r-ink">
          <p className="text-meta leading-relaxed text-p3r-ink-soft">把自己的音乐导进来当背景音：只在本机播放，不上云、不进备份，最多 {BGM_MAX_TRACKS} 首、单首 20 MB。<br /><b className="text-p3r-lilac-ink">请只导入你有权使用的音频；录屏或分享时注意版权。</b></p>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <input ref={fileRef} type="file" accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.flac" multiple className="sr-only" aria-label="选择音频文件" onChange={(e) => void onFiles(Array.from(e.target.files ?? []))} />
            <CfgBtn tone="primary" disabled={busy || tracks.length >= BGM_MAX_TRACKS} onClick={() => { unlockBgm(); fileRef.current?.click(); }}>{busy ? '导入中…' : tracks.length >= BGM_MAX_TRACKS ? `已满 ${BGM_MAX_TRACKS} 首` : '导入音乐'}</CfgBtn>
            <span className="ml-auto flex items-center gap-2"><span className="font-heavy text-meta font-bold">播放</span><CfgToggle ariaLabel="播放背景音乐" checked={enabled} onChange={(v) => { unlockBgm(); updateSettings({ bgmEnabled: v }); }} /></span>
          </div>
          {tracks.length > 0 && (
            <ul className="grid grid-cols-1 gap-1">
              {tracks.map((t, i) => {
                const isPlaying = enabled && playing === t.id;
                return (
                  <li key={t.id} className={cx('flex min-w-0 items-center gap-2 rounded-none px-2 py-1.5', isPlaying ? 'bg-p3r-ink text-[color:var(--p3r-on-ink)]' : 'bg-p3r-panel')}>
                    <span className="font-cond tabular w-6 shrink-0 text-center text-body">{String(i + 1).padStart(2, '0')}</span>
                    <div className="min-w-0 flex-1">
                      <span className="block truncate font-heavy text-body font-bold">{t.name}</span>
                      <span className="block text-2xs opacity-75">{fmtSize(t.size)}{isPlaying ? ' · 播放中' : ''}</span>
                    </div>
                    <button type="button" onClick={() => setDel(t)} aria-label={`删除 ${t.name}`} className="shrink-0 rounded-none border-2 border-current px-2 py-0.5 font-heavy text-2xs font-bold">删除</button>
                  </li>
                );
              })}
            </ul>
          )}
          <div>
            <div className="mb-1 font-heavy text-meta font-bold">音乐音量</div>
            <CfgSlider ariaLabel="音乐音量" min={0} max={100} step={5} value={vol ?? s.bgmVolume} suffix="%" onChange={(v) => { setVol(v); previewBgmVolume(v); }} onCommit={() => { if (vol != null) { updateSettings({ bgmVolume: vol }); setVol(null); } }} />
            <p className="mt-1 text-2xs text-p3r-grey">与音效音量各自独立；「静音模式」开着时音乐也静音。</p>
          </div>
          <div className="space-y-2 rounded-none border-2 border-dashed border-p3r-lilac/30 p-2.5">
            <div className="font-heavy text-body font-bold">在哪里放哪首</div>
            <Row label="战斗"><CfgSelect className="w-full" aria-label="战斗曲目" value={s.bgmBattle} onChange={(e) => updateSettings({ bgmBattle: e.target.value })} options={opts(true)} /></Row>
            <Row label="Boss 战"><CfgSelect className="w-full" aria-label="Boss 战曲目" value={s.bgmBoss} onChange={(e) => updateSettings({ bgmBoss: e.target.value })} options={opts(true, '跟随战斗曲目')} /></Row>
            <Row label="爬塔"><CfgSelect className="w-full" aria-label="爬塔曲目" value={s.bgmTower} onChange={(e) => updateSettings({ bgmTower: e.target.value })} options={opts(true)} /></Row>
            <div className="pt-1 font-heavy text-meta font-bold text-p3r-ink-soft">各主题的主页默认曲目</div>
            {BGM_THEME_LABEL.map(([th, label]) => (
              <Row key={th} label={`${label}主题`}><CfgSelect className="w-full" aria-label={`${label}主题曲目`} value={s.bgmHome[th] ?? ''} onChange={(e) => updateSettings({ bgmHome: { ...s.bgmHome, [th]: e.target.value } })} options={opts(false)} /></Row>
            ))}
          </div>
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-none bg-p3r-ink px-3 py-2 text-p3r-on-ink">
            <span className="min-w-0 truncate text-meta">{enabled && playing ? `正在播放：${nameOf(playing) ?? ''}` : enabled ? '现在没有在放（当前场景没选曲，或 App 在后台）' : '已关闭'}</span>
            <button type="button" onClick={() => { unlockBgm(); void refreshBgm(); toast('重新播放', { duration: 900 }); }} className="shrink-0 font-heavy text-meta font-bold text-p3r-rose underline">没响？点一下重放</button>
          </div>
        </div>
      )}
      <BgmDeleteDialog open={!!del} name={del?.name ?? ''} onClose={() => setDel(null)} onConfirm={() => { if (del) void removeBgmTrack(del.id).then(async () => { setTracks(await listBgmTracks()); setDel(null); }); }} />
    </section>
  );
}
