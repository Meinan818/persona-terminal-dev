/**
 * Dev 胶囊（外壳底部常驻、可折叠；折叠态仍露「索引」）：日/夜、低动效、侧栏布局、跳到索引 / Kit。状态存 localStorage。URL 带 ?__dev=0 时（截图脚本）默认隐藏，只留左缘把手。
 */
import { useState } from 'react';
import { usePrefs, setPrefs, toggleMode, toggleLowMotion } from '@blue/lib/prefs';
import { applyLayout } from '@blue/lib/layout';
import { cx } from '@blue/lib/cx';
import { slantClip } from '@blue/kit/base';

export function DevCapsule() {
  const p = usePrefs();
  const [open, setOpen] = useState(false);
  const z = { zIndex: 'var(--p3r-z-dev)' as unknown as number };
  if (p.devHidden) {
    return <button type="button" aria-label="显示 Dev 胶囊" onClick={() => setPrefs({ devHidden: false })} className="fixed left-0 top-1/2 h-10 w-1.5 -translate-y-1/2 hover:w-3" style={{ ...z, background: 'rgb(var(--p3r-blue-rgb) / 0.35)' }} />;
  }
  const Btn = ({ on, label, onClick }: { on?: boolean; label: string; onClick: () => void }) => (
    <button type="button" onClick={onClick} className={cx('h-7 whitespace-nowrap px-2.5 text-[11px] font-black')} style={{ clipPath: slantClip(5), background: on ? 'var(--p3r-blue)' : 'rgba(255,255,255,0.12)', color: '#fff' }}>{label}</button>
  );
  return (
    <div className="fixed left-2 flex items-center gap-1 p-1 wide:left-auto wide:right-3" style={{ ...z, background: 'var(--p3r-mulberry)', clipPath: slantClip(8), bottom: 'calc(var(--p3r-nav-h) + 22px + env(safe-area-inset-bottom))' }}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="h-7 px-3 font-cond text-[12px]" style={{ background: 'var(--p3r-blue)', color: '#fff', clipPath: slantClip(5) }}>{open ? 'DEV ◂' : 'DEV ▸'}</button>
      {/* 折叠态也常驻「索引」：dist 双击打开后首屏一键进 #/__index（上一版用户找不到索引） */}
      {!open && <Btn label="索引" onClick={() => { window.location.hash = '#/__index'; }} />}
      {open && (
        <div className="flex max-w-[78vw] flex-wrap items-center gap-1">
          <Btn on={p.mode === 'night'} label={p.mode === 'night' ? '夜' : '日'} onClick={toggleMode} />
          <Btn on={p.motion === 'low'} label="低动效" onClick={toggleLowMotion} />
          <Btn on={p.sidebar} label="侧栏" onClick={() => { setPrefs({ sidebar: !p.sidebar }); applyLayout(); }} />
          <Btn label="索引" onClick={() => { window.location.hash = '#/__index'; }} />
          <Btn label="Kit" onClick={() => { window.location.hash = '#/__kit'; }} />
          <Btn label="隐藏" onClick={() => { setOpen(false); setPrefs({ devHidden: true }); }} />
        </div>
      )}
    </div>
  );
}
