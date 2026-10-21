/**
 * 外壳重转场（真实 HeavyTransition p3 分支 + App.tsx 圆形揭示），实现来自 P1 HeavyTransition.p3r.tsx：
 *   wave  → WaveSliceP3 五竖栅：0 合拢 → 300ms midpoint 切页 → 400ms 反向滑开 → 740ms 收场
 *   water → WaterRippleP3 两圈环：0ms 同帧切页 + 新页同原点 circle() 540ms 揭示 → 760ms 收场
 * 低动效：同步切页，不挂层。
 */
import { useEffect, useRef, useState } from 'react';
import { Portal } from '@pink/kit/Portal';
import { useBoldness } from '@pink/lib/prefs';
import { WaveSliceP3, WaterRippleP3 } from '@pink/screens/overlays/HeavyTransition.p3r';

export type ShellFx = null | { kind: 'water' | 'wave'; origin?: { x: number; y: number } | null; id: number };

export function ShellTransition({ fx, onCovered, onDone }: { fx: ShellFx; onCovered: () => void; onDone: () => void }) {
  const anim = useBoldness();
  const cb = useRef({ onCovered, onDone }); cb.current = { onCovered, onDone };
  const [phase, setPhase] = useState<'in' | 'out'>('in');
  useEffect(() => {
    if (!fx) return;
    if (!anim) { cb.current.onCovered(); cb.current.onDone(); return; }
    setPhase('in');
    const ids: number[] = [];
    const at = (ms: number, fn: () => void) => ids.push(window.setTimeout(fn, ms));
    if (fx.kind === 'wave') {
      at(300, () => cb.current.onCovered());
      at(400, () => setPhase('out'));
      at(740, () => cb.current.onDone());
    } else {
      cb.current.onCovered();
      at(760, () => cb.current.onDone());
    }
    return () => ids.forEach(clearTimeout);
  }, [fx?.id, anim]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!fx || !anim) return null;
  const origin = fx.origin ?? { x: window.innerWidth / 2, y: window.innerHeight - 34 };
  return <Portal>{fx.kind === 'wave' ? <WaveSliceP3 key={fx.id} phase={phase} /> : <WaterRippleP3 key={fx.id} origin={origin} />}</Portal>;
}
