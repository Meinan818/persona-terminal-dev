/**
 * #/overlay/:id?step=&state=&variant= → 单独预览某个弹层（自动打开；登记的 params 与 URL 查询合并，URL 优先）。#/overlay/fx-showreel → 演出连播。背景：登记 backdrop='page:<id>' 时在该页上弹出（页面不可交互），否则默认舞台。
 * 左下 ▴OVERLAY 小胶囊：重新打开 / 日夜 / 低动效 / 索引（?__dev=0 时隐藏）。?open=0 进入时不自动打开。
 */
import { Suspense, useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { OVERLAYS } from '@/p5r-red/registry/overlays';
import { PAGES } from '@/p5r-red/registry/pages';
import { lazyOf } from '@/p5r-red/shell/lazyRegistry';
import { setPrefs, toggleLowMotion, toggleMode, usePrefs } from '@/p5r-red/lib/prefs';
import { useWide } from '@/p5r-red/lib/layout';
import { P5Stage, P5StageLayers, defaultStage } from '@/p5r-red/fx/bg';
import { P5Button } from '@/p5r-red/kit/P5Button';
import { BottomNav, Sidebar } from '@/p5r-red/shell/Navigation.p5r';
import { __setCurrent } from '@/p5r-red/shell/shellBus';
import { OverlayHost } from '@/p5r-red/shell/OverlayHost';
import { PageHost } from './PageHost';
import { TodoCard } from './Placeholders';
import { FxShowreel } from './FxShowreel';

export function OverlayHarness() {
  const { id: raw = '' } = useParams();
  const id = decodeURIComponent(raw);
  if (id === 'fx-showreel') return <FxShowreel />;
  return <OverlayPreview id={id} />;
}

function OverlayPreview({ id }: { id: string }) {
  const loc = useLocation();
  const q = new URLSearchParams(loc.search);
  const wide = useWide();
  const [open, setOpen] = useState(q.get('open') !== '0');
  const [gen, setGen] = useState(0);
  useEffect(() => { setOpen(q.get('open') !== '0'); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  const entry = OVERLAYS[id];
  const C = entry ? lazyOf(`overlay:${id}`, entry.load) : null;
  const bd = entry?.backdrop?.startsWith('page:') ? entry.backdrop.slice(5) : null;
  const bdEntry = bd ? PAGES[bd] : undefined;
  useEffect(() => { if (bd) __setCurrent(bd); }, [bd]);
  const reopen = () => { setOpen(false); setTimeout(() => { setGen((g) => g + 1); setOpen(true); }, 60); };
  return (
    <>
      {bd ? (
        <>
          <div id="stage-bg" aria-hidden="true"><P5StageLayers stage={bdEntry?.stage ? bdEntry.stage(wide) : defaultStage(wide)} /></div>
          <Sidebar />
          <main id="view" style={{ pointerEvents: 'none' }}><div className={`page${bdEntry?.flush ? ' flush' : ''}`} data-page={bd}><PageHost pageId={bd} /></div></main>
          <BottomNav />
        </>
      ) : <P5Stage stage={defaultStage(wide, { sil: null, seed: 3 })} />}
      {!entry ? <main id="view"><div className="page"><TodoCard id={id} kind="弹层" /></div></main> : C && (
        <Suspense fallback={null}><C key={gen} open={open} onClose={() => setOpen(false)} params={new URLSearchParams({ ...entry.params, ...Object.fromEntries(q) })} /></Suspense>
      )}
      {!open && entry && (
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 110, display: 'flex', justifyContent: 'center', zIndex: 640 }}><P5Button size="lg" tone="ink" onClick={reopen}>再次打开</P5Button></div>
      )}
      <OverlayHost />
      <HarnessCapsule title={entry?.title ?? '未登记'} id={id} onReopen={reopen} />
    </>
  );
}

function HarnessCapsule({ title, id, onReopen }: { title: string; id: string; onReopen: () => void }) {
  const p = usePrefs();
  const [open, setOpen] = useState(false);
  if (p.devHidden) return null;
  const btn = { padding: '6px 9px', font: '900 10px/1 var(--f-title)', color: 'var(--paper)', background: 'rgba(17,17,17,.85)', boxShadow: 'inset 0 0 0 1.5px var(--paper)' } as const;
  return (
    <div style={{ position: 'fixed', left: 8, bottom: 10, zIndex: 9500, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, maxWidth: 'calc(100vw - 16px)' }}>
      {open && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: 6, background: '#111', boxShadow: '3px 3px 0 #D7000F' }}>
          <span style={{ font: '900 11px/1.4 var(--f-title)', color: '#F2E9DA', maxWidth: '60vw', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title} <span style={{ color: '#ff4a52' }}>#{id}</span></span>
          <button style={btn} onClick={onReopen}>重新打开</button>
          <button style={btn} onClick={toggleMode}>{p.mode === 'day' ? '日→夜' : '夜→日'}</button>
          <button style={btn} onClick={toggleLowMotion}>{p.motion === 'low' ? '低动效✓' : '低动效'}</button>
          <button style={btn} onClick={() => { window.location.hash = '#/__index'; }}>索引</button>
          <button style={btn} onClick={() => { setOpen(false); setPrefs({ devHidden: true }); }}>隐藏</button>
        </div>
      )}
      <button onClick={() => setOpen(!open)} aria-expanded={open} style={{ ...btn, padding: '8px 12px', background: '#111', color: '#F2E9DA', boxShadow: '3px 3px 0 #D7000F' }}>{open ? '▾' : '▴'} OVERLAY</button>
    </div>
  );
}
