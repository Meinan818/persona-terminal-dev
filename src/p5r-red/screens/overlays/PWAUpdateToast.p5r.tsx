/**
 * 新版本提示 PWAUpdateToast（真实 src/components/PWAUpdateToast.tsx：每次打开检测到新 SW 时底部出现；「立即更新」→ SKIP_WAITING 重载，
 * 「稍后」收起）。视觉迁移自 v3 overlays/a.js §6 openPWA（.oa-pwa 墨底撕纸 + 红影 + 红星）：spring 380/22 升起（y 30→0、rotate -4→-1），
 * 收起 y +16 淡出 220ms；立即更新 = 星形反撕后吐司「已更新到新版本（demo）」。
 */
import { useLayoutEffect, useRef, useState, useEffect } from 'react';
import type { OverlayProps } from '@/p5r-red/registry/types';
import { Portal } from '@/p5r-red/kit/Portal';
import { P5OaRough, P5OaStar } from '@/p5r-red/kit/P5Layer';
import { toast } from '@/p5r-red/kit/P5Toast';
import { spring } from '@/p5r-red/fx/spring';
import { starTear } from '@/p5r-red/fx/transitions';
import { lerp } from '@/p5r-red/lib/rng';
import { isLowMotion } from '@/p5r-red/lib/prefs';

export default function PWAUpdateToast({ open, onClose }: OverlayProps) {
  const el = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(open);
  useEffect(() => { if (open) setShown(true); }, [open]);
  useLayoutEffect(() => {
    const e = el.current; if (!shown || !e || isLowMotion()) return;
    return spring({ stiffness: 380, damping: 22, onUpdate: (p) => { e.style.transform = `translate(-50%, ${lerp(30, 0, p)}px) rotate(${lerp(-4, -1, p)}deg)`; e.style.opacity = String(Math.min(1, p * 2)); } });
  }, [shown]);
  const out = (then?: () => void) => {
    const e = el.current; if (!e) return;
    e.animate([{ opacity: 1, transform: 'translate(-50%,0)' }, { opacity: 0, transform: 'translate(-50%,16px)' }], { duration: 220, fill: 'both' }).onfinish = () => { setShown(false); onClose(); then?.(); };
  };
  if (!shown) return null;
  return (
    <Portal>
      <div className="oa-pwa" role="status" ref={el}>
        <P5OaRough seed={511} face="#111" frame="var(--p5r-paper)" sh="var(--red)" jag={5} d={[5, 6]} />
        <span className="oa-pwa-s"><P5OaStar size={20} fill="var(--red)" stroke="var(--p5r-paper)" sw={8} /></span>
        <span className="oa-pwa-t">有新版本可用</span>
        <button type="button" className="oa-pwa-go" onClick={() => out(() => starTear(() => toast('已更新到新版本（demo）')))}>立即更新</button>
        <button type="button" className="oa-pwa-later" aria-label="稍后再说" onClick={() => out()}>稍后</button>
      </div>
    </Portal>
  );
}
