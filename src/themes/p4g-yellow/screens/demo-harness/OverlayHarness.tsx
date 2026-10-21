/**
 * OverlayHarness：#/overlay/:id → 自动打开该弹窗。
 * 控制条是贴底的小胶囊（默认折叠，只占左下角 ~36px，不遮挡全屏弹窗的页头 / 底部按钮）：
 *   点开后显示「重新打开」「日/夜」「低动效」「索引」。截图模式（?__dev=0）只留左缘 6px 把手。
 * 背景：登记项 backdrop='page:<pageId>' 时在该页面上弹出，否则黄舞台 + 雾。
 * ?open=0 进入时不自动打开。
 */
import { Suspense, useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { cx } from '@yellow/lib/cx';
import { OVERLAYS } from '@yellow/registry/overlays';
import { lazyOf } from '@yellow/shell/lazyRegistry';
import { P4Button } from '@yellow/kit';
import { setPrefs, toggleLowMotion, toggleMode, usePrefs } from '@yellow/lib/prefs';
import { ScanlineOverlay, FogRain } from '@yellow/fx';
import { PageHost } from './PageHost';
import { TodoCard } from './Placeholders';

export function OverlayHarness() {
  const { id = '' } = useParams();
  const loc = useLocation();
  const q = new URLSearchParams(loc.search);
  const p = usePrefs();
  const [open, setOpen] = useState(q.get('open') !== '0');
  const [gen, setGen] = useState(0);
  useEffect(() => { setOpen(q.get('open') !== '0'); }, [id]); // eslint-disable-line
  const entry = OVERLAYS[id];
  const C = entry ? lazyOf(`overlay:${id}`, entry.load) : null;
  const bd = entry?.backdrop?.startsWith('page:') ? entry.backdrop.slice(5) : null;
  const reopen = () => { setOpen(false); setTimeout(() => { setGen((g) => g + 1); setOpen(true); }, 60); };
  return (
    <div className="p4g-stage relative min-h-screen overflow-hidden">
      <ScanlineOverlay />
      {bd ? <div className="pointer-events-none px-4 pt-4 opacity-100"><PageHost forceId={bd} /></div> : <FogRain fog intensity={0.8} />}
      <HarnessCapsule title={entry?.title ?? '未登记'} id={id} onReopen={reopen} />
      {!entry ? <div className="px-4 pt-4"><TodoCard id={id} kind="弹窗" /></div> : C && (
        <Suspense fallback={null}><C key={gen} open={open} onClose={() => setOpen(false)} params={q} /></Suspense>
      )}
      {!open && entry && (
        <div className="fixed inset-x-0 bottom-16 flex justify-center"><P4Button size="lg" variant="black" onClick={reopen}>再次打开</P4Button></div>
      )}
    </div>
  );
}

/** 贴底折叠胶囊：不压住弹窗头部；展开时向上弹出一行按钮。 */
function HarnessCapsule({ title, id, onReopen }: { title: string; id: string; onReopen: () => void }) {
  const p = usePrefs();
  const [open, setOpen] = useState(false);
  const z = { zIndex: 'var(--p4g-z-dev)' as unknown as number };
  if (p.devHidden) {
    return (
      <button type="button" aria-label="显示弹窗控制条" onClick={() => setPrefs({ devHidden: false })}
        className="fixed bottom-24 left-0 h-10 w-1.5 rounded-r-sm bg-p4g-black/30 hover:w-3 hover:bg-p4g-black/70" style={z} />
    );
  }
  return (
    <div className="pointer-events-none fixed bottom-[calc(10px+env(safe-area-inset-bottom))] left-2 flex max-w-[calc(100vw-16px)] flex-col items-start gap-1.5" style={z}>
      {open && (
        <div className="pointer-events-auto flex max-w-full flex-wrap items-center gap-1 rounded-sm border-2 border-p4g-yellow bg-p4g-black p-1.5 shadow-[3px_3px_0_#000]">
          <span className="min-w-0 max-w-[60vw] truncate px-1 font-display text-[11px] font-bold text-white">{title} <span className="text-p4g-yellow">#{id}</span></span>
          <CapBtn label="重新打开" on onClick={onReopen} />
          <CapBtn label={p.mode === 'day' ? '日→夜' : '夜→日'} onClick={toggleMode} />
          <CapBtn label={p.motion === 'low' ? '低动效✓' : '低动效'} onClick={toggleLowMotion} />
          <CapBtn label="索引" onClick={() => { window.location.hash = '#/__index'; }} />
          <CapBtn label="隐藏" onClick={() => { setOpen(false); setPrefs({ devHidden: true }); }} />
        </div>
      )}
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}
        className="pointer-events-auto flex h-8 items-center gap-1 rounded-full border-2 border-p4g-yellow bg-p4g-black px-3 font-display text-[11px] font-bold italic text-p4g-yellow shadow-[3px_3px_0_#000]">
        <span aria-hidden>{open ? '▾' : '▴'}</span>OVERLAY
      </button>
    </div>
  );
}
const CapBtn = ({ label, onClick, on }: { label: string; onClick: () => void; on?: boolean }) => (
  <button type="button" onClick={onClick} className={cx('h-7 whitespace-nowrap rounded-xs px-2 font-display text-[11px] font-bold', on ? 'bg-p4g-yellow text-p4g-black' : 'bg-white/10 text-white')}>{label}</button>
);
