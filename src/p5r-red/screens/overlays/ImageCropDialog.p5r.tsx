/**
 * 图片裁切 ImageCropDialog（真实 src/components/ImageCropDialog.tsx：设置 / 账号 → 更换头像、同伴头像选图后）。
 * 迁移自 v3 overlays/a.js §9 openCrop：纸面粗糙壳 + 标题牌「调整头像」+ 取景框（拖动定位 · 三分线 · 红角标）+ 缩放滑块（1–4×，以中心缩放）
 * + 重置 / 取消 · 自动居中 · 完成裁切（处理中… 700ms →「头像已更新」）。
 *   ?aspect=1（默认 1:1）| 0.75 | 1.6   ?title=   ?state=loading（停在「加载中…」）| error（「图片解析失败」）
 */
import { useEffect, useRef, useState } from 'react';
import type { OverlayProps } from '@/p5r-red/registry/types';
import { P5Layer, P5OaRough, P5XGlyph } from '@/p5r-red/kit/P5Layer';
import { P5Plate } from '@/p5r-red/kit/P5Plate';
import { P5Button } from '@/p5r-red/kit/P5Button';
import { toast } from '@/p5r-red/kit/P5Toast';

const PAL = [['#D7000F', '#8E0010', '#F2E9DA'], ['#1d3557', '#e63946', '#f1faee'], ['#2b2d42', '#ef233c', '#edf2f4'], ['#3d0c11', '#d4a373', '#fefae0'], ['#003049', '#f77f00', '#fcbf49']];
/** 假图片（矢量风景 data URI，同 v3 fakeImg；不引用外部素材） */
export function fakeImg(i: number, w = 800, h = 600): string {
  const [a, b, c] = PAL[i % PAL.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/><circle cx="${w * (0.25 + (i % 3) * 0.2)}" cy="${h * 0.32}" r="${h * 0.13}" fill="${c}"/><polygon points="0,${h} ${w * 0.3},${h * 0.5} ${w * 0.55},${h * 0.78} ${w * 0.78},${h * 0.42} ${w},${h * 0.7} ${w},${h}" fill="#111" opacity=".82"/><polygon points="0,${h} ${w * 0.2},${h * 0.72} ${w * 0.5},${h} " fill="${b}"/><text x="24" y="${h - 24}" font-family="sans-serif" font-weight="900" font-size="${h * 0.06}" fill="${c}">IMG ${i + 1}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/** 阶段 3 统一：全站头像 / 图片裁切都用本组件（pkg2 设置·助手的 ObCrop 现委托到这里）。可选 onDone（完成裁切后回调）/ src（要裁的图）/ doneToast（null = 不弹默认吐司，由调用方自己提示） */
export default function ImageCropDialog({ open, onClose, params, onDone, src: srcIn, doneToast = '头像已更新' }: OverlayProps & { onDone?: () => void; src?: string; doneToast?: string | null }) {
  const aspect = Number(params?.get('aspect') ?? 1) || 1;
  const title = params?.get('title') ?? '调整头像';
  const st = params?.get('state');
  const VW = aspect >= 1 ? 280 : Math.round(280 * aspect), VH = aspect >= 1 ? Math.round(280 / aspect) : 280;
  const ratio = aspect === 1 ? '1:1' : aspect < 1 ? `1:${(1 / aspect).toFixed(1)}` : `${aspect.toFixed(1)}:1`;
  const src = srcIn ?? fakeImg(3, 900, 640);
  const img = useRef<HTMLImageElement>(null);
  const g = useRef({ iw: 900, ih: 640, base: 1, z: 1, x: 0, y: 0, drag: null as null | { sx: number; sy: number; x: number; y: number } });
  const [loaded, setLoaded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const apply = () => {
    const s = g.current, w = s.iw * s.base * s.z, h = s.ih * s.base * s.z;
    s.x = Math.min(0, Math.max(VW - w, s.x)); s.y = Math.min(0, Math.max(VH - h, s.y));
    if (img.current) { img.current.style.width = `${w}px`; img.current.style.transform = `translate(${s.x}px,${s.y}px)`; }
  };
  const center = () => { const s = g.current; s.x = (VW - s.iw * s.base * s.z) / 2; s.y = (VH - s.ih * s.base * s.z) / 2; apply(); };
  useEffect(() => { if (!open) { setLoaded(false); setBusy(false); setZoom(1); g.current.z = 1; } }, [open]);
  const onLoad = () => { const s = g.current, i = img.current!; s.iw = i.naturalWidth || 900; s.ih = i.naturalHeight || 640; s.base = Math.max(VW / s.iw, VH / s.ih); center(); if (st !== 'loading' && st !== 'error') setTimeout(() => setLoaded(true), 350); };
  const onZoom = (v: number) => { const s = g.current, cx = VW / 2 - s.x, cy = VH / 2 - s.y, k = v / s.z; s.z = v; s.x = VW / 2 - cx * k; s.y = VH / 2 - cy * k; setZoom(v); apply(); };
  const ok = () => { setBusy(true); setTimeout(() => { onClose(); onDone?.(); if (doneToast) toast(doneToast); }, 700); };
  return (
    <P5Layer open={open} onClose={() => { if (!busy) onClose(); }} cls="oa-crop" z={895}>
      <div className="oa-crop-card" role="dialog" aria-modal="true">
        <P5OaRough seed={801} face="var(--p5r-paper)" frame="#111" jag={6} d={[6, 7]} />
        <div className="oa-crop-hd"><div><P5Plate fs={19}>{title}</P5Plate><p>拖动定位 · 滑块缩放 · 输出为 {ratio} 画幅</p></div><button type="button" className="oa-sum-x" aria-label="取消" onClick={onClose}><P5XGlyph s={14} c="var(--p5r-paper)" /></button></div>
        <div className={`oa-crop-view${dragging ? ' drag' : ''}`} style={{ width: VW, height: VH }}
          onPointerDown={(e) => { const s = g.current; s.drag = { sx: e.clientX, sy: e.clientY, x: s.x, y: s.y }; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); setDragging(true); }}
          onPointerMove={(e) => { const s = g.current; if (!s.drag) return; s.x = s.drag.x + e.clientX - s.drag.sx; s.y = s.drag.y + e.clientY - s.drag.sy; apply(); }}
          onPointerUp={() => { g.current.drag = null; setDragging(false); }} onPointerCancel={() => { g.current.drag = null; setDragging(false); }}>
          <img ref={img} alt="" draggable={false} src={src} onLoad={onLoad} />
          <i className="oa-crop-grid" /><i className="oa-crop-c tl" /><i className="oa-crop-c tr" /><i className="oa-crop-c bl" /><i className="oa-crop-c br" />
          <span className="oa-crop-load" hidden={loaded}>加载中…</span>
        </div>
        <div className="oa-crop-zoom"><span>缩小</span><input type="range" min={1} max={4} step={0.01} value={zoom} aria-label="缩放" onChange={(e) => onZoom(+e.target.value)} /><span>放大</span><button type="button" className="oa-chip" onClick={() => { onZoom(1); center(); }}>重置</button></div>
        <p className="oa-err" role="alert" hidden={st !== 'error'}>图片解析失败</p>
        <div className="oa-crop-act">
          <P5Button tone="paper" seed={83} onClick={onClose} disabled={busy}>取消</P5Button>
          <P5Button tone="ink" seed={84} onClick={center} disabled={busy}>自动居中</P5Button>
          <P5Button seed={85} onClick={ok} disabled={busy || st === 'error'}>{busy ? '处理中…' : '完成裁切'}</P5Button>
        </div>
      </div>
    </P5Layer>
  );
}
