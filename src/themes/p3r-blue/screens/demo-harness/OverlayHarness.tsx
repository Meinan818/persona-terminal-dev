/**
 * OverlayHarness：#/overlay/:id → 自动打开该弹窗 / 演出（查询参数原样传给 params，阶段直达）。
 * 控制条 = 左下折叠胶囊「▴OVERLAY」：重新打开 / 日夜 / 低动效 / 索引 / 隐藏。截图模式（?__dev=0）只留左缘把手。
 * 背景：登记项 backdrop='page:<pageId>' 时在该页面上弹出；fullscreen 不画背景；否则粉舞台。?open=0 进入时不自动打开。
 * 同一 key 换参数（阶段切换 / 演出连播）会整体重挂载，保证从该阶段开播。
 */
import { Suspense, useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { OVERLAYS } from '@blue/registry/overlays';
import { lazyOf } from '@blue/shell/lazyRegistry';
import { P3Button, slantClip, P3R } from '@blue/kit';
import { setPrefs, toggleLowMotion, toggleMode, usePrefs } from '@blue/lib/prefs';
import { BlueStage } from '@blue/fx/motifs';
import { PageHost } from './PageHost';
import { TodoCard } from './Placeholders';

export function OverlayHarness() {
  const { id = '' } = useParams();
  const loc = useLocation();
  return <OverlayHarnessInner key={id + loc.search.replace(/[?&]__\w+=[^&]*/g, '')} id={id} search={loc.search} />;
}

function OverlayHarnessInner({ id, search }: { id: string; search: string }) {
  const q = new URLSearchParams(search);
  const [open, setOpen] = useState(q.get('open') !== '0');
  const [gen, setGen] = useState(0);
  const entry = OVERLAYS[id];
  const C = entry ? lazyOf(`overlay:${id}`, entry.load) : null;
  const bd = entry?.backdrop?.startsWith('page:') ? entry.backdrop.slice(5) : null;
  const reopen = () => { setOpen(false); window.setTimeout(() => { setGen((g) => g + 1); setOpen(true); }, 60); };
  useEffect(() => { document.title = `${entry?.title ?? id} · 蓝白 P3R demo`; }, [entry, id]);
  return (
    <div className="relative min-h-screen overflow-hidden">
      {!entry?.fullscreen && <BlueStage variant="page" />}
      {bd && <div className="pointer-events-none relative z-10 px-4 pt-4 wide:px-8"><div className="mx-auto max-w-page"><PageHost forceId={bd} /></div></div>}
      <HarnessCapsule title={entry?.title ?? '未登记'} id={id} onReopen={reopen} />
      {!entry ? <div className="relative z-10 px-4 pt-4"><TodoCard id={id} kind="弹窗 / 演出" /></div> : C && (
        <Suspense fallback={null}><C key={gen} open={open} onClose={() => setOpen(false)} params={q} /></Suspense>
      )}
      {!open && entry && (
        <div className="fixed inset-x-0 bottom-16 z-10 flex justify-center"><P3Button size="lg" tone="ink" corner onClick={reopen}>再次打开</P3Button></div>
      )}
    </div>
  );
}

function HarnessCapsule({ title, id, onReopen }: { title: string; id: string; onReopen: () => void }) {
  const p = usePrefs();
  const [open, setOpen] = useState(false);
  const z = { zIndex: 'var(--p3r-z-dev)' as unknown as number };
  if (p.devHidden) {
    return <button type="button" aria-label="显示弹窗控制条" onClick={() => setPrefs({ devHidden: false })} className="fixed bottom-24 left-0 h-10 w-1.5 hover:w-3" style={{ ...z, background: 'rgb(var(--p3r-blue-rgb) / 0.35)' }} />;
  }
  const Cap = ({ label, onClick, on }: { label: string; onClick: () => void; on?: boolean }) => (
    <button type="button" onClick={onClick} className="h-7 whitespace-nowrap px-2.5 text-[11px] font-black" style={{ clipPath: slantClip(5), background: on ? P3R.blue : 'rgba(255,255,255,0.12)', color: '#fff' }}>{label}</button>
  );
  return (
    <div className="pointer-events-none fixed bottom-[calc(10px+env(safe-area-inset-bottom))] left-2 flex max-w-[calc(100vw-16px)] flex-col items-start gap-1.5" style={z}>
      {open && (
        <div className="pointer-events-auto flex max-w-full flex-wrap items-center gap-1 p-1.5" style={{ background: 'var(--p3r-mulberry)', clipPath: slantClip(8) }}>
          <span className="min-w-0 max-w-[60vw] truncate px-2 text-[11px] font-black text-white">{title} <span style={{ color: 'var(--bk-bubble-a)' }}>#{id}</span></span>
          <Cap label="重新打开" on onClick={onReopen} />
          <Cap label={p.mode === 'day' ? '日→夜' : '夜→日'} onClick={toggleMode} />
          <Cap label={p.motion === 'low' ? '低动效✓' : '低动效'} onClick={toggleLowMotion} />
          <Cap label="索引" onClick={() => { window.location.hash = '#/__index'; }} />
          <Cap label="隐藏" onClick={() => { setOpen(false); setPrefs({ devHidden: true }); }} />
        </div>
      )}
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="pointer-events-auto flex h-8 items-center gap-1 px-4 font-cond text-[12px]" style={{ background: 'var(--p3r-mulberry)', color: 'var(--bk-bubble-b)', clipPath: slantClip(7) }}>
        <span aria-hidden>{open ? '▾' : '▴'}</span>OVERLAY
      </button>
    </div>
  );
}
