/**
 * 入场动效工具（原 core.js P5.panelIn / P5.slamTiles，参数逐字沿用）。只动 transform / opacity；
 * 低动效（useLowMotion / prefers-reduced-motion）直接 return，只保留终态。
 * 在 useEffect 里对 ref 下的元素调用；返回清理函数。
 *
 *   useEffect(() => slamTiles(root.current!.querySelectorAll('.hm-tile'), 0.06), []);
 */
import { spring } from './spring';
import { lerp } from '@/p5r-red/lib/rng';
import { isLowMotion } from '@/p5r-red/lib/prefs';

type Els = ArrayLike<Element> | Iterable<Element>;
const arr = (els: Els) => Array.from(els as ArrayLike<Element>) as HTMLElement[];

/** 交错入场（p5Motion.panelIn：x -24, rotate -2, scale .98 → 0；.26s；stagger .03） */
export function panelIn(els: Els, { stagger = 0.03, delay = 0, from = 'left' as 'left' | 'right' | 'up' } = {}): () => void {
  if (isLowMotion()) return () => {};
  const dx = from === 'left' ? -24 : from === 'right' ? 48 : 0, dy = from === 'up' ? 26 : 0;
  const anims = arr(els).map((el, i) => el.animate([
    { opacity: 0, transform: `translate(${dx}px,${dy}px) rotate(${from === 'right' ? 3 : -2}deg) scale(.98)` },
    { opacity: 1, transform: 'none' }], { duration: 260, delay: (delay + i * stagger) * 1000, easing: 'cubic-bezier(.2,.9,.2,1)', fill: 'backwards' }));
  return () => anims.forEach((a) => a.cancel());
}

/** 拼贴瓷砖砸落（§5：scale 1.7→1, rotate (-12+(i%3)*8)→0, spring 520/26, 间隔 gap） */
export function slamTiles(els: Els, gap = 0.06): () => void {
  if (isLowMotion()) return () => {};
  const stops = arr(els).map((el, i) => {
    const base = el.style.transform || ''; el.style.opacity = '0';
    return spring({ stiffness: 520, damping: 26, delay: i * gap,
      onUpdate: (p) => { el.style.opacity = String(Math.min(1, p * 1.6)); el.style.transform = `${base} scale(${lerp(1.7, 1, p)}) rotate(${lerp(-12 + (i % 3) * 8, 0, p)}deg)`; },
      onDone: () => { el.style.transform = base; } });
  });
  return () => stops.forEach((s) => s());
}

/** 分段弹入（首页 §5：opacity + translate 26→0，spring 260/26） */
export function segIn(els: Els, delay: number, { stiffness = 260, damping = 26, dy = 26 } = {}): () => void {
  if (isLowMotion()) return () => {};
  const stops = arr(els).map((el) => { el.style.opacity = '0';
    return spring({ stiffness, damping, delay, onUpdate: (p) => { el.style.opacity = String(Math.min(1, p * 1.4)); el.style.translate = `0 ${lerp(dy, 0, p)}px`; } }); });
  return () => stops.forEach((s) => s());
}
