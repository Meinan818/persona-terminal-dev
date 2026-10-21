/**
 * 外壳演出单播（fxCatalog 的 fx-wedge / fx-water / fx-circle-reveal / red-cutin-todo / red-surprise，及 inventory 的
 * shell-transition-wedge / shell-transition-water）。真实：src/components/transition/HeavyTransition.tsx（WedgeCutAct → 红版星形反撕，
 * WaterRippleAct）+ App.tsx PageShell 圆形揭示；Cut-in 舞台 §4；SurpriseFx。
 *   ?variant=wedge | water | circle | cutin-todo | surprise[&kind=card|sil|mask|tear|slash]
 * 打开即播，播完（≈ fxCatalog ms）自动 onClose。circle：在一块「新页」纸卡上演示从指尖揭示（transform/opacity，P0-14）。
 */
import { useEffect, useRef } from 'react';
import type { OverlayProps } from '@/p5r-red/registry/types';
import { Portal } from '@/p5r-red/kit/Portal';
import { starTear, waterNav, cutInTodoDone } from '@/p5r-red/fx/transitions';
import { surprise, type SurpriseKind } from '@/p5r-red/fx/surprise';

const MS: Record<string, number> = { wedge: 1300, water: 1300, circle: 1400, 'cutin-todo': 3200, surprise: 2600 };

export default function FxTransitions({ open, onClose, params }: OverlayProps) {
  const v = params?.get('variant') ?? 'wedge';
  const page = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const c = { x: innerWidth / 2, y: innerHeight - 46 };
    if (v === 'wedge') starTear(() => {});
    else if (v === 'water') waterNav(c, () => null);
    else if (v === 'circle') waterNav(c, () => page.current);
    else if (v === 'cutin-todo') cutInTodoDone('晨跑 5 公里', '胆量 +2');
    else if (v === 'surprise') surprise((params?.get('kind') as SurpriseKind) || undefined);
    const t = setTimeout(onClose, MS[v] ?? 1500);
    return () => clearTimeout(t);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!open || v !== 'circle') return null;
  return (
    <Portal>
      <div ref={page} aria-hidden="true" style={{ position: 'fixed', inset: '12% 8% 18%', zIndex: 700, background: 'var(--p5r-paper)', boxShadow: '8px 9px 0 #111', outline: '4px solid #111', display: 'grid', placeItems: 'center', font: '900 22px/1.4 var(--f-title)', color: '#111' }}>新页面 · 圆形揭示</div>
    </Portal>
  );
}
