/**
 * 全局弹层宿主：页面里调 shellBus.openOverlay(id, params) → 在这里按注册表懒加载并打开。
 * 未登记 → 吐司「待移植」（标出所属 pkg），不报错。关闭后保留 700ms 让退场动画播完再卸载。
 */
import { Suspense, useEffect, useState } from 'react';
import { OVERLAYS } from '@/p5r-red/registry/overlays';
import { invById } from '@/p5r-red/inventory';
import { fxById } from '@/p5r-red/fxCatalog';
import { pkgOf } from '@/p5r-red/inventorySplit';
import { lazyOf } from './lazyRegistry';
import { closeOverlay, useShellState, type OverlayReq } from './shellBus';
import { toast } from '@/p5r-red/kit/P5Toast';

export function OverlayHost() {
  const { overlay } = useShellState();
  const [shown, setShown] = useState<OverlayReq | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!overlay) { setOpen(false); const t = setTimeout(() => setShown(null), 700); return () => clearTimeout(t); }
    if (!OVERLAYS[overlay.id]) { const it = invById(overlay.id), fx = fxById(overlay.id); toast(`「${it?.title ?? fx?.title ?? overlay.id}」待移植（pkg${pkgOf(overlay.id) ?? fx?.pkg ?? '?'}）`); closeOverlay(); return; }
    setShown(overlay); setOpen(true);
  }, [overlay]);
  if (!shown) return null;
  const e = OVERLAYS[shown.id]; if (!e) return null;
  const C = lazyOf(`overlay:${shown.id}`, e.load);
  return <Suspense fallback={null}><C key={shown.gen} open={open} onClose={closeOverlay} params={new URLSearchParams({ ...e.params, ...shown.params })} /></Suspense>;
}
