/**
 * Dev 胶囊（FIXLIST 六：常驻；日/夜、低动效、侧栏布局、惊喜层开关、音效、索引、Kit、隐藏；状态存 localStorage；?__dev=0 默认隐藏）。
 * 外观沿用原生 #demo-ctl「⚙ DEMO」右上小钮。隐藏后左缘留 10px 把手，点一下恢复。
 */
import { useState } from 'react';
import { usePrefs, setPrefs, toggleMode, toggleLowMotion } from '@/p5r-red/lib/prefs';
import { surprise } from '@/p5r-red/fx/surprise';

export function DevCapsule() {
  const p = usePrefs();
  const [open, setOpen] = useState(false);
  const devAllowed = import.meta.env.DEV || new URLSearchParams(window.location.search).get('__dev') === '1';
  if (!devAllowed) return null;
  if (p.devHidden) {
    return <button type="button" aria-label="显示 DEMO 开关" onClick={() => setPrefs({ devHidden: false })}
      style={{ position: 'fixed', left: 0, top: '50%', width: 10, height: 44, marginTop: -22, zIndex: 650, background: 'rgba(17,17,17,.35)', boxShadow: 'inset -2px 0 0 #D7000F' }} />;
  }
  const B = ({ k, label, on }: { k: string; label: string; on?: () => void }) => <button type="button" data-k={k} onClick={on}>{label}</button>;
  return (
    <div id="demo-ctl" className={open ? 'open' : ''}>
      <B k="gear" label="⚙ DEMO" on={() => setOpen(!open)} />
      <B k="mode" label={p.mode === 'night' ? '夜间' : '日间'} on={toggleMode} />
      <B k="motion" label={p.motion === 'low' ? '低动效 ✓' : '低动效'} on={toggleLowMotion} />
      <B k="side" label={p.sidebar ? '侧栏 ✓' : '侧栏'} on={() => setPrefs({ sidebar: !p.sidebar })} />
      <B k="fx" label={`惊喜 ${p.fx ? 'ON' : 'OFF'}`} on={() => setPrefs({ fx: !p.fx })} />
      <B k="snd" label={`音效 ${p.sound ? 'ON' : 'OFF'}`} on={() => setPrefs({ sound: !p.sound })} />
      <B k="sp" label="放一个惊喜" on={() => surprise()} />
      <B k="ix" label="索引" on={() => { window.location.hash = '#/__index'; }} />
      <B k="kit" label="Kit" on={() => { window.location.hash = '#/__kit'; }} />
      <B k="hide" label="隐藏" on={() => { setOpen(false); setPrefs({ devHidden: true }); }} />
    </div>
  );
}
