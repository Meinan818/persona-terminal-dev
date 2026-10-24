// 镜头手势：单指拖 = 平移；双指捏合 = 缩放（松手吸附档位）；双指扭转 ≥ 40° = 旋转 90°；滚轮 = 缩放档位；Q/E = 旋转。
// 移动 ≤ 8px 的单指抬起 = 点击（交给 onTap），超过就是拖动，不触发点击。
import type { CameraRig } from './cameraRig';

export const TAP_SLOP = 8;

export function attachCameraInput(el: HTMLElement, rig: CameraRig, onTap: (ev: PointerEvent) => void, canControl: () => boolean = () => true, overview: () => void = () => rig.toggleOverview()) {
  const pts = new Map<number, { x: number; y: number; sx: number; sy: number }>();
  let dragging = false;
  let multi = false; // 本次手势出现过双指 → 抬起时不算点击
  let pinch: { d: number; a: number; twist: number } | null = null;
  const ndcOf = (x: number, y: number) => { const r = el.getBoundingClientRect(); return { x: ((x - r.left) / r.width) * 2 - 1, y: -((y - r.top) / r.height) * 2 + 1 }; };
  const two = () => { const [a, b] = [...pts.values()]; return { d: Math.hypot(b.x - a.x, b.y - a.y), a: Math.atan2(b.y - a.y, b.x - a.x), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; };

  el.addEventListener('pointerdown', (e) => {
    el.setPointerCapture?.(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY });
    if (pts.size === 1) { dragging = false; multi = false; }
    if (pts.size === 2) { multi = true; const t = two(); pinch = { d: t.d, a: t.a, twist: 0 }; }
  });
  el.addEventListener('pointermove', (e) => {
    const p = pts.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (!canControl()) return;
    if (pts.size === 1) {
      if (!dragging && Math.hypot(p.x - p.sx, p.y - p.sy) > TAP_SLOP) dragging = true;
      if (dragging) rig.panPixels(dx, dy, el.clientWidth, el.clientHeight);
    } else if (pts.size === 2 && pinch) {
      const t = two();
      if (t.d > 10 && pinch.d > 10) rig.zoomBy(t.d / pinch.d, ndcOf(t.mx, t.my), true);
      let da = t.a - pinch.a;
      if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI;
      pinch.twist += da;
      if (Math.abs(pinch.twist) > (40 * Math.PI) / 180) { rig.rotate(pinch.twist > 0 ? 1 : -1); pinch.twist = 0; }
      // 双指一起平移
      rig.panPixels(dx / 2, dy / 2, el.clientWidth, el.clientHeight);
      pinch.d = t.d; pinch.a = t.a;
    }
  });
  const end = (e: PointerEvent) => {
    const p = pts.get(e.pointerId);
    if (!p) return;
    pts.delete(e.pointerId);
    if (pinch && pts.size < 2) { pinch = null; rig.snapZoom(); }
    if (pts.size === 0) {
      const moved = Math.hypot(e.clientX - p.sx, e.clientY - p.sy);
      if (!multi && !dragging && moved <= TAP_SLOP && e.type === 'pointerup') onTap(e);
      dragging = false;
    }
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (!canControl()) return;
    rig.zoomStep(e.deltaY < 0 ? 1 : -1, ndcOf(e.clientX, e.clientY));
  }, { passive: false });
  window.addEventListener('keydown', (e) => {
    if (!canControl() || (e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'SELECT') return;
    if (e.key === 'q' || e.key === 'Q') rig.rotate(-1);
    else if (e.key === 'e' || e.key === 'E') rig.rotate(1);
    else if (e.key === '+' || e.key === '=') rig.zoomStep(1);
    else if (e.key === '-') rig.zoomStep(-1);
    else if (e.key === 'm' || e.key === 'M') overview();
  });
}
