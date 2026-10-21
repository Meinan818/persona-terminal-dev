/**
 * 演出一键连播 #/overlay/fx-showreel（FIXLIST 四-c）：按 src/fxCatalog.ts 顺序逐段播放，HUD ◀ ▶ ■。
 *   ?from=<fx id> 从某项开始   ?only=id1,id2 只播这些   ?group=红色独有   ?todo=0 跳过未移植项
 * 每段时长 = fxCatalog.ms（登记项可用 OverlayEntry.ms 覆盖）；低动效档每段 ≤900ms。
 * 未登记（待移植）的项显示占位卡 1.2s（不按原时长，免得连播大半时间在看占位）。段落之间重挂载（key），演出层播完即卸载。
 */
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FX_CATALOG } from '@/p5r-red/fxCatalog';
import { OVERLAYS } from '@/p5r-red/registry/overlays';
import { PAGES } from '@/p5r-red/registry/pages';
import { lazyOf } from '@/p5r-red/shell/lazyRegistry';
import { useLowMotion, usePrefs } from '@/p5r-red/lib/prefs';
import { useWide } from '@/p5r-red/lib/layout';
import { P5Stage, P5StageLayers, defaultStage } from '@/p5r-red/fx/bg';
import { PageHost } from './PageHost';

export function FxShowreel() {
  const q = new URLSearchParams(useLocation().search);
  const low = useLowMotion();
  const wide = useWide();
  const p = usePrefs();
  const list = useMemo(() => {
    let l = FX_CATALOG.filter((f) => f.id !== 'fx-p5r-gallery');
    const only = q.get('only'); if (only) { const s = only.split(','); l = l.filter((f) => s.includes(f.id)); }
    const g = q.get('group'); if (g) l = l.filter((f) => f.group === g);
    if (q.get('todo') === '0') l = l.filter((f) => OVERLAYS[f.id]);
    const from = q.get('from'); if (from) { const i = l.findIndex((f) => f.id === from); if (i > 0) l = l.slice(i); }
    return l;
  }, [q.toString()]); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const [play, setPlay] = useState(true);
  const [gen, setGen] = useState(0);
  const f = list[i];
  const e = f ? OVERLAYS[f.id] : undefined;
  const dur = !e ? 1200 : Math.min(low ? 900 : Infinity, e.ms ?? f.ms);
  useEffect(() => {
    if (!play || !f) return;
    const t = setTimeout(() => { if (i < list.length - 1) { setI(i + 1); setGen((g) => g + 1); } else setPlay(false); }, dur);
    return () => clearTimeout(t);
  }, [i, play, gen, dur, f, list.length]);
  const go = (d: number) => { setI((x) => Math.max(0, Math.min(list.length - 1, x + d))); setGen((g) => g + 1); };
  const C = e ? lazyOf(`overlay:${f.id}`, e.load) : null;
  const bd = e?.backdrop?.startsWith('page:') ? e.backdrop.slice(5) : null;
  const btn = { padding: '8px 12px', font: '900 13px/1 var(--f-title)', color: '#F2E9DA', background: '#2a2826' } as const;
  return (
    <>
      {bd ? <><div id="stage-bg" aria-hidden="true"><P5StageLayers stage={PAGES[bd]?.stage?.(wide) ?? defaultStage(wide)} /></div><main id="view" style={{ pointerEvents: 'none' }}><div className={`page${PAGES[bd]?.flush ? ' flush' : ''}`}><PageHost pageId={bd} /></div></main></>
        : <P5Stage stage={defaultStage(wide, { sil: null, seed: 3 })} />}
      {f && C && <Suspense fallback={null}><C key={`${f.id}:${gen}`} open onClose={() => {}} params={new URLSearchParams({ ...e!.params, ...Object.fromEntries(q) })} /></Suspense>}
      {f && !C && (
        <div key={`${f.id}:${gen}`} style={{ position: 'fixed', left: '50%', top: '42%', transform: 'translate(-50%,-50%) rotate(-1.5deg)', zIndex: 700, width: 'min(420px, 88vw)', padding: '22px 20px', background: 'var(--p5r-paper)', color: '#111', boxShadow: '7px 8px 0 #111', outline: '4px solid #111', font: '800 13px/1.6 var(--f-sans)' }}>
          <b style={{ display: 'block', font: '900 18px/1.3 var(--f-title)', color: '#D7000F' }}>待移植 · {f.title}</b>
          <span>{f.id} · pkg{f.pkg} · 约 {(f.ms / 1000).toFixed(1)}s</span><br /><span>{f.realPath}</span>
        </div>
      )}
      {!p.devHidden && (
        <div style={{ position: 'fixed', left: '50%', bottom: 14, transform: 'translateX(-50%)', zIndex: 9500, display: 'flex', alignItems: 'center', gap: 6, padding: 6, background: '#111', boxShadow: '4px 4px 0 #D7000F', maxWidth: '96vw' }}>
          <button style={btn} onClick={() => go(-1)} aria-label="上一段">◀</button>
          <button style={btn} onClick={() => setPlay(!play)} aria-label={play ? '停止' : '播放'}>{play ? '■' : '▶'}</button>
          <button style={btn} onClick={() => go(1)} aria-label="下一段">▶</button>
          <span style={{ font: '900 12px/1.3 var(--f-title)', color: '#F2E9DA', padding: '0 6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '58vw' }}>
            {i + 1}/{list.length} · {f?.title ?? '—'} {f && <span style={{ color: e ? '#9be37b' : '#ff7a82' }}>{e ? '' : '（待移植）'}</span>}
          </span>
          <a href="#/__index" style={{ ...btn, background: '#D7000F' }}>索引</a>
        </div>
      )}
    </>
  );
}
