/**
 * 外壳重转场（蓝白 · 心之海 / 召唤碎裂母题；真实 HeavyTransition p3 分支的时序约定：遮满 → 切页 → 揭开）：
 *   water + 前进 → BlotIris 波形圆（cover 430ms 切页 → 820ms 收场）—— 原作子菜单「前进」遮罩
 *   water + 返回 → DoubleCircleIris 双圆（cover 330ms → 680ms）    —— 原作「返回」遮罩
 *   wave（侧栏 / 轮盘 / 页内）→ Shatter 玻璃碎裂（cover 220ms → 980ms；夜间 = 影时间变体：绿闪 + 定格 1 帧）
 * 低动效：同步切页，不挂层（真实 HeavyTransition 低动效档同口径）。
 */
import { useEffect, useRef, useState } from 'react';
import { Portal } from '@blue/kit/Portal';
import { useBoldness, usePrefs } from '@blue/lib/prefs';
import { BlotIris, DoubleCircleIris, Shatter } from '@blue/fx/motifs';

export type ShellFx = null | { kind: 'water' | 'wave'; dir?: 'fwd' | 'back'; origin?: { x: number; y: number } | null; id: number };

export function ShellTransition({ fx, onCovered, onDone }: { fx: ShellFx; onCovered: () => void; onDone: () => void }) {
  const anim = useBoldness();
  const night = usePrefs().mode === 'night';
  const cb = useRef({ onCovered, onDone }); cb.current = { onCovered, onDone };
  const [active, setActive] = useState(false);
  useEffect(() => {
    if (!fx) { setActive(false); return; }
    if (!anim) { cb.current.onCovered(); cb.current.onDone(); return; }
    setActive(true);
  }, [fx?.id, anim]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!fx || !anim) return null;
  const origin = fx.origin ?? { x: window.innerWidth / 2, y: window.innerHeight - 34 };
  const props = { active, origin, onCovered: () => cb.current.onCovered(), onDone: () => cb.current.onDone() };
  return (
    <Portal>
      {fx.kind === 'wave'
        ? <Shatter key={fx.id} {...props} variant={night ? 'darkhour' : 'day'} word="" />
        : fx.dir === 'back' ? <DoubleCircleIris key={fx.id} {...props} /> : <BlotIris key={fx.id} {...props} />}
    </Portal>
  );
}
