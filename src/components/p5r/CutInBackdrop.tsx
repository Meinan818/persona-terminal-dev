import { useLayoutEffect, useRef, type CSSProperties } from 'react';
import { starPts } from './kit';

type BackdropKind = 'bands' | 'ripple' | 'lines' | 'rings';
const BANDS = ['#150001', '#3f0004', '#0f0001', '#4c0005', '#0b0000', '#340003', '#070000', '#280002', '#050000'];
const RADII = [6, 9, 13.5, 20.3, 30.4, 45.6, 68.4];

function starPath(ctx: CanvasRenderingContext2D, radius: number): void {
  const points = starPts(50, 50, radius).split(' ').map(point => point.split(',').map(Number));
  ctx.beginPath();
  points.forEach(([x, y], i) => { if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
  ctx.closePath();
}

/**
 * 庆祝装饰的固定纹理：CSS 尺寸 / 动画不变，像素缓冲不随手机 DPR 与 scale 放大。
 * 210vmax 的渐变蒙版与多张放大 SVG 曾挤掉卡框/标题的绘制瓦片；
 * 与导航的 RippleRing 同口径，只把大面积装饰画一次，文字和卡面仍保留原 DOM。
 */
export function CutInBackdrop({ kind, size, className, style }: {
  kind: BackdropKind;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const pixels = kind === 'bands' || kind === 'lines' ? 1024 : 768;
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, pixels, pixels);
    ctx.save();
    if (kind === 'lines') {
      const center = pixels / 2;
      const radius = Math.hypot(center, center);
      ctx.fillStyle = '#050505';
      for (let angle = 0; angle < 360; angle += 9) {
        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.arc(center, center, radius, (angle - 90) * Math.PI / 180, (angle - 90 + 2.2) * Math.PI / 180);
        ctx.closePath();
        ctx.fill();
      }
      const mask = ctx.createRadialGradient(center, center, 0, center, center, radius);
      mask.addColorStop(0, 'rgba(0,0,0,0)');
      mask.addColorStop(0.16, 'rgba(0,0,0,0)');
      mask.addColorStop(0.44, '#000');
      mask.addColorStop(1, '#000');
      ctx.globalCompositeOperation = 'destination-in';
      ctx.fillStyle = mask;
      ctx.fillRect(0, 0, pixels, pixels);
    } else if (kind === 'rings') {
      ctx.scale(pixels / 200, pixels / 200);
      ctx.strokeStyle = '#e8464e';
      for (const radius of RADII) {
        ctx.beginPath();
        ctx.arc(100, 100, radius, 0, Math.PI * 2);
        ctx.lineWidth = radius * 0.15;
        ctx.stroke();
      }
    } else {
      ctx.scale(pixels / 100, pixels / 100);
      if (kind === 'bands') {
        BANDS.forEach((color, i) => {
          starPath(ctx, 49 * (1 - i * 0.085));
          ctx.fillStyle = color;
          ctx.fill();
        });
      } else {
        starPath(ctx, 46);
        ctx.strokeStyle = '#7d0007';
        ctx.lineWidth = 2.4;
        ctx.lineJoin = 'miter';
        ctx.stroke();
      }
    }
    ctx.restore();
  }, [kind, pixels]);
  return <canvas ref={ref} width={pixels} height={pixels} aria-hidden className={className} style={{ width: size, height: size, ...style }} />;
}
