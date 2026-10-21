/**
 * 长按（原 P5.longPress：500ms，10px 位移容差；同 app useLongPress）。
 *   const lp = useLongPress(() => openMenu());
 *   <div {...lp.handlers} className={lp.pressing ? 'pressing' : ''}>…</div>
 * 长按触发后会吞掉随后的 click。
 */
import { useCallback, useRef, useState, type PointerEvent, type MouseEvent } from 'react';
export function useLongPress(fn: (e: PointerEvent) => void, ms = 500) {
  const t = useRef(0), x0 = useRef(0), y0 = useRef(0), fired = useRef(false);
  const [pressing, setPressing] = useState(false);
  const cancel = useCallback(() => { clearTimeout(t.current); setPressing(false); }, []);
  const handlers = {
    onPointerDown: (e: PointerEvent) => { fired.current = false; x0.current = e.clientX; y0.current = e.clientY; setPressing(true); e.persist?.(); t.current = window.setTimeout(() => { fired.current = true; setPressing(false); fn(e); }, ms); },
    onPointerMove: (e: PointerEvent) => { if (Math.hypot(e.clientX - x0.current, e.clientY - y0.current) > 10) cancel(); },
    onPointerUp: cancel, onPointerLeave: cancel, onPointerCancel: cancel,
    onClickCapture: (e: MouseEvent) => { if (fired.current) { e.stopPropagation(); e.preventDefault(); fired.current = false; } },
  };
  return { handlers, pressing };
}
