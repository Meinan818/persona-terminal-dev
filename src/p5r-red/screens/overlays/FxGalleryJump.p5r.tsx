/** 演出总览 · 一键连播（fxCatalog fx-p5r-gallery，对应 v3 CutIns-gallery）：打开即跳 #/overlay/fx-showreel（HUD ◀ ■ ▶，?from= / ?only= 透传）。 */
import { useEffect } from 'react';
import type { OverlayProps } from '@/p5r-red/registry/types';
export default function FxGalleryJump({ open, params }: OverlayProps) {
  useEffect(() => { if (!open) return; const q = new URLSearchParams(params); ['variant'].forEach((k) => q.delete(k)); const s = q.toString(); window.location.hash = `#/overlay/fx-showreel${s ? `?${s}` : ''}`; }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
