/**
 * 外壳重转场（蓝白 · 心之海圆形遮罩；遮满 → 切页 → 揭开）：
 *   water / wave → DoubleCircleIris 双圆（cover 330ms → 680ms）
 * 保留两种 transition 名只为兼容既有调用；不再挂 Shatter 或波形圆重层。
 * 低动效：同步切页，不挂层（真实 HeavyTransition 低动效档同口径）。
 */
import { useEffect, useRef, useState } from 'react';
import { Portal } from '@blue/kit/Portal';
import { useBoldness } from '@blue/lib/prefs';
import { DoubleCircleIris } from '@blue/fx/motifs';

export type ShellFx = null | { kind: 'water' | 'wave'; dir?: 'fwd' | 'back'; origin?: { x: number; y: number } | null; id: number };

export function ShellTransition({ fx, onCovered, onDone }: { fx: ShellFx; onCovered: () => void; onDone: () => void }) {
  const anim = useBoldness();
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
      <DoubleCircleIris key={fx.id} {...props} />
    </Portal>
  );
}
