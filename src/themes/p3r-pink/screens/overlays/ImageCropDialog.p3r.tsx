/**
 * 图片裁切（真实 src/components/ImageCropDialog.tsx）：拖动平移 / 双指或滚轮缩放 / 滑块缩放，
 * 「缩小」「放大」「重置」「自动居中」「取消」「完成裁切」（处理中…）；错误：超过 12MB / 不是图片 / 解析失败。
 * 标题：调整头像 / 调整我的头像 / 裁切 X 的卡面 / 调整人格头像…   ?title=…&aspect=0.75&state=error|loading
 * 外观：P3R 取景器 —— 墨底 + 玫红四角取景框 + 三分线 + REC 角标，斜向弹入。
 */
import { useEffect, useRef, useState } from 'react';
import type { OverlayProps } from '@pink/registry/types';
import { P6Sheet } from '@pink/screens/pkg6/sheet';
import { CfgSlider } from '@pink/screens/pkg6/cfg';
import { P3Button, useToast } from '@pink/kit';
import { sampleImg } from '@pink/screens/pkg6/compat';

export interface CropDialogProps { open: boolean; onClose: () => void; src?: string; file?: File; title?: string; aspect?: number; onDone: (dataUrl: string) => void; forceState?: 'error' | 'loading' }

export function CropDialog({ open, onClose, src, file, title = '调整头像', aspect = 1, onDone, forceState }: CropDialogProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [z, setZ] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const frame = useRef<HTMLDivElement>(null);
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; z: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    setImg(null); setErr(null); setZ(1); setPos({ x: 0, y: 0 });
    if (forceState === 'error') { setErr('图片超过 12MB'); return; }
    if (forceState === 'loading') return;
    if (file && file.size > 12 * 1024 * 1024) { setErr('图片超过 12MB'); return; }
    if (file && !file.type.startsWith('image/')) { setErr('请选择图片文件'); return; }
    const url = file ? URL.createObjectURL(file) : src;
    if (!url) return;
    const p = new Image();
    p.onload = () => setImg(p);
    p.onerror = () => setErr('图片解析失败');
    p.src = url;
  }, [open, src, file, forceState]);

  const box = () => frame.current?.getBoundingClientRect() ?? { width: 300, height: 300 };
  const baseScale = () => { if (!img) return 1; const b = box(); return Math.max(b.width / img.width, b.height / img.height); };
  const clampZ = (v: number) => Math.min(4, Math.max(1, v));
  const onDown = (e: React.PointerEvent) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pts.current.size === 2) { const [a, b] = [...pts.current.values()]; pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), z }; } };
  const onMove = (e: React.PointerEvent) => {
    const prev = pts.current.get(e.pointerId); if (!prev) return;
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.current.size === 2 && pinch.current) { const [a, b] = [...pts.current.values()]; setZ(clampZ(pinch.current.z * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.d))); return; }
    setPos((p) => ({ x: p.x + e.clientX - prev.x, y: p.y + e.clientY - prev.y }));
  };
  const onUp = (e: React.PointerEvent) => { pts.current.delete(e.pointerId); if (pts.current.size < 2) pinch.current = null; };
  const finish = () => {
    if (!img) return; setBusy(true);
    setTimeout(() => {
      const b = box(); const out = 512; const c = document.createElement('canvas'); c.width = out; c.height = Math.round(out / aspect);
      const ctx = c.getContext('2d'); if (!ctx) { setErr('Canvas 不可用'); setBusy(false); return; }
      const s = baseScale() * z; const k = out / b.width;
      ctx.translate(c.width / 2 + pos.x * k, c.height / 2 + pos.y * k); ctx.scale(s * k, s * k); ctx.drawImage(img, -img.width / 2, -img.height / 2);
      let url = ''; try { url = c.toDataURL('image/webp', 0.9); } catch { url = img.src; }
      setBusy(false); onDone(url);
    }, 450);
  };
  const ratioText = aspect === 1 ? '1:1' : aspect < 1 ? `1:${(1 / aspect).toFixed(1)}` : `${aspect.toFixed(1)}:1`;

  return (
    <P6Sheet open={open} onClose={onClose} position="center" busy={busy} title={title} en={`CROP · ${ratioText}`} z="confirm"
      footer={
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2"><P3Button tone="soft" size="sm" disabled={!img || busy} onClick={() => { setZ(1); setPos({ x: 0, y: 0 }); }}>重置</P3Button><P3Button tone="soft" size="sm" disabled={!img || busy} onClick={() => setPos({ x: 0, y: 0 })}>自动居中</P3Button></div>
          <div className="flex gap-3"><P3Button tone="soft" block disabled={busy} onClick={onClose} aria-label="取消">取消</P3Button><P3Button block disabled={!img || busy} onClick={finish}>{busy ? '处理中…' : '完成裁切'}</P3Button></div>
        </div>
      }>
      <div className="space-y-3 pt-1">
        <div ref={frame} className="relative mx-auto w-full max-w-[340px] touch-none select-none overflow-hidden rounded-none border-2 border-p3r-lilac/50 bg-p3r-ink"
          style={{ aspectRatio: String(aspect) }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
          onWheel={(e) => setZ((v) => clampZ(v - e.deltaY * 0.0015))}>
          {img ? (
            <img src={img.src} alt="" draggable={false} className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
              style={{ width: img.width, height: img.height, transform: `translate(-50%,-50%) translate(${pos.x}px,${pos.y}px) scale(${baseScale() * z})`, transformOrigin: 'center' }} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center p-4 text-center font-heavy text-body font-bold text-p3r-rose" style={{ backgroundImage: `url(${sampleImg('tv-static.webp')})`, backgroundSize: '160px' }}>
              <span className="rounded-none bg-p3r-ink/80 px-3 py-1.5">{err ? err : '加载中…'}</span>
            </div>
          )}
          {/* 三分线 + 四角取景框 + REC */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute inset-y-0 left-1/3 w-px bg-p3r-panel/35" /><div className="absolute inset-y-0 left-2/3 w-px bg-p3r-panel/35" />
            <div className="absolute inset-x-0 top-1/3 h-px bg-p3r-panel/35" /><div className="absolute inset-x-0 top-2/3 h-px bg-p3r-panel/35" />
            {['left-2 top-2 border-l-4 border-t-4', 'right-2 top-2 border-r-4 border-t-4', 'left-2 bottom-2 border-l-4 border-b-4', 'right-2 bottom-2 border-r-4 border-b-4'].map((c) => <span key={c} className={`absolute h-6 w-6 border-p3r-rose${c}`} />)}
            <span className="absolute left-4 top-3 flex items-center gap-1 font-heavy text-2xs font-bold text-p3r-on-ink"><span className="h-2 w-2 rounded-full bg-p3r-coral" />REC</span>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <button type="button" disabled={!img} onClick={() => setZ((v) => clampZ(v - 0.2))} className="shrink-0 rounded-none border-2 border-p3r-lilac px-2 py-1 font-heavy text-meta font-bold disabled:opacity-40"><span>缩小</span></button>
          <CfgSlider ariaLabel="缩放" min={1} max={4} step={0.01} value={Math.round(z * 100) / 100} onChange={setZ} suffix="×" />
          <button type="button" disabled={!img} onClick={() => setZ((v) => clampZ(v + 0.2))} className="shrink-0 rounded-none border-2 border-p3r-lilac px-2 py-1 font-heavy text-meta font-bold disabled:opacity-40"><span>放大</span></button>
        </div>
      </div>
    </P6Sheet>
  );
}

export default function ImageCropDialog({ open, onClose, params }: OverlayProps) {
  const toast = useToast();
  const [result, setResult] = useState<string | null>(null);
  const aspect = Number(params?.get('aspect') ?? 1) || 1;
  return (
    <>
      {result && !open && <img src={result} alt="裁切结果" className="fixed left-1/2 top-24 z-[1] w-40 -translate-x-1/2 border-2 border-p3r-lilac/50" style={{ aspectRatio: String(aspect) }} />}
      <CropDialog open={open} onClose={onClose} src={sampleImg('town-day.webp')} title={params?.get('title') ?? '调整头像'} aspect={aspect} forceState={(params?.get('state') as 'error' | 'loading' | null) ?? undefined}
        onDone={(u) => { setResult(u); toast.success('裁切完成'); onClose(); }} />
    </>
  );
}
