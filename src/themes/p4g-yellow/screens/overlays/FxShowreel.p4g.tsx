/**
 * 演出总览 · 一键连播（#/overlay/fx-showreel）—— 对应红色 P5R demo 的 CutIns-gallery。
 * 依次挂载 src/fxCatalog.ts 里带 play 的演出：演出自己 onClose（自动收场 / 点击）→ 停 360ms → 下一段；
 * 不自动收场的（宣告卡 / 大功告成 / 恭喜页…）到 max 毫秒强制切走。顶部 HUD：i/N · 标题 · 上一段 / 下一段 / 停止。
 * ?from=<fx id> 从某一段开始；?only=<fx id> 只播一段。低动效档同样可播（各演出自己降级）。
 */
import { Suspense, useEffect, useMemo, useState } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import { OVERLAYS } from '@yellow/registry/overlays';
import { lazyOf } from '@yellow/shell/lazyRegistry';
import { FX_PLAYLIST } from '@yellow/fxCatalog';

export default function FxShowreel({ open, onClose, params }: OverlayProps) {
  const only = params?.get('only');
  const list = useMemo(() => (only ? FX_PLAYLIST.filter((x) => x.id === only) : FX_PLAYLIST), [only]);
  const from = Math.max(0, list.findIndex((x) => x.id === params?.get('from')));
  const [i, setI] = useState(from);
  const [on, setOn] = useState(true);
  const [run, setRun] = useState(0);
  useEffect(() => { if (open) { setI(from); setOn(true); setRun((r) => r + 1); } }, [open]); // eslint-disable-line
  const step = list[i];
  const go = (n: number) => {
    setOn(false);
    window.setTimeout(() => {
      if (n >= list.length || n < 0) { onClose(); return; }
      setI(n); setOn(true); setRun((r) => r + 1);
    }, 360);
  };
  useEffect(() => {
    if (!open || !step || !on) return;
    const t = window.setTimeout(() => go(i + 1), step.max);
    return () => clearTimeout(t);
  }, [open, i, on, run]); // eslint-disable-line
  if (!open || !step) return null;
  const entry = OVERLAYS[step.key];
  const C = entry ? lazyOf(`overlay:${step.key}`, entry.load) : null;
  const q = new URLSearchParams(step.q ?? '');
  return (
    <>
      {C && <Suspense fallback={null}><C key={`${step.id}-${run}`} open={on} onClose={() => { if (on) go(i + 1); }} params={q} /></Suspense>}
      <div className="pointer-events-none fixed inset-x-0 top-0 flex justify-center px-2 pt-[calc(6px+env(safe-area-inset-top))]" style={{ zIndex: 'var(--p4g-z-dev)' as unknown as number }}>
        <div className="pointer-events-auto flex max-w-full min-w-0 items-center gap-1 rounded-sm border-2 border-p4g-yellow bg-p4g-black px-2 py-1 shadow-[3px_3px_0_var(--p4g-orange)]">
          <span className="shrink-0 font-display text-[11px] font-bold italic text-p4g-yellow">FX {i + 1}/{list.length}</span>
          <span className="min-w-0 max-w-[46vw] truncate px-1 font-display text-[11px] font-bold text-white">{step.title}</span>
          <button type="button" className="h-7 shrink-0 rounded-xs bg-white/10 px-2 font-display text-[11px] font-bold text-white" onClick={() => go(i - 1)} aria-label="上一段">◀</button>
          <button type="button" className="h-7 shrink-0 rounded-xs bg-p4g-yellow px-2 font-display text-[11px] font-bold text-p4g-black" onClick={() => go(i + 1)} aria-label="下一段">▶</button>
          <button type="button" className="h-7 shrink-0 rounded-xs bg-white/10 px-2 font-display text-[11px] font-bold text-white" onClick={onClose} aria-label="停止">■</button>
        </div>
      </div>
    </>
  );
}
