/**
 * Dev 胶囊（可隐藏的小悬浮控件）：日/夜、低动效、扫描线、侧栏布局、跳到索引 / Kit。状态存 localStorage。
 * 隐藏后在屏幕左缘留一个 10px 小把手，点一下恢复。URL 带 ?dev=0 时（截图脚本）默认隐藏。
 */
import { useState } from 'react';
import { usePrefs, setPrefs, toggleMode, toggleLowMotion, toggleScanlines } from '@yellow/lib/prefs';
import { applyLayout } from '@yellow/lib/layout';
import { cx } from '@yellow/lib/cx';

export function DevCapsule() {
  const p = usePrefs();
  const [open, setOpen] = useState(false);
  if (p.devHidden) {
    return (
      <button type="button" aria-label="显示 Dev 胶囊" onClick={() => setPrefs({ devHidden: false })}
        className="fixed left-0 top-1/2 h-10 w-1.5 -translate-y-1/2 rounded-r-sm bg-p4g-black/30 hover:w-3 hover:bg-p4g-black/70" style={{ zIndex: 'var(--p4g-z-dev)' as unknown as number }} />
    );
  }
  const Btn = ({ on, label, onClick }: { on?: boolean; label: string; onClick: () => void }) => (
    <button type="button" onClick={onClick} className={cx('h-7 whitespace-nowrap rounded-xs px-2 font-display text-[11px] font-bold', on ? 'bg-p4g-yellow text-p4g-black' : 'bg-white/10 text-white')}>{label}</button>
  );
  return (
    <div className="fixed left-2 flex items-center gap-1 rounded-sm border-2 border-p4g-yellow bg-p4g-black/92 p-1 shadow-[3px_3px_0_#000] wide:left-auto wide:right-3"
      style={{ zIndex: 'var(--p4g-z-dev)' as unknown as number, bottom: 'calc(var(--p4g-nav-h) + 22px + env(safe-area-inset-bottom))' }}>
      <button type="button" onClick={() => setOpen(!open)} className="h-7 rounded-xs bg-p4g-yellow px-2 font-display text-[11px] font-bold italic text-p4g-black" aria-expanded={open}>DEV</button>
      {open && (
        <div className="flex max-w-[78vw] flex-wrap items-center gap-1">
          <Btn on={p.mode === 'night'} label={p.mode === 'night' ? '夜' : '日'} onClick={toggleMode} />
          <Btn on={p.motion === 'low'} label="低动效" onClick={toggleLowMotion} />
          <Btn on={p.scanlines} label="扫描线" onClick={toggleScanlines} />
          <Btn on={p.sidebar} label="侧栏" onClick={() => { setPrefs({ sidebar: !p.sidebar }); applyLayout(); }} />
          <Btn label="索引" onClick={() => { window.location.hash = '#/__index'; }} />
          <Btn label="Kit" onClick={() => { window.location.hash = '#/__kit'; }} />
          <Btn label="隐藏" onClick={() => { setOpen(false); setPrefs({ devHidden: true }); }} />
        </div>
      )}
    </div>
  );
}
