import { animate, motion, useMotionValue, useTransform, type MotionValue } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useBoldness } from '@/utils/boldness';
import { P3R, slantClip } from '@/components/p3r/kit';

const SCALE_MIN = 0.84;
const OPACITY_MIN = 0.4;
const GAP = 12;

const Slide = ({ x, index, width, anim, hidden, children }: {
  x: MotionValue<number>;
  index: number;
  width: number;
  anim: boolean;
  hidden?: boolean;
  children: ReactNode;
}) => {
  const distance = useTransform(x, (value) => (
    width ? Math.min(1, Math.abs(value + index * (width + GAP)) / (width + GAP)) : 0
  ));
  const scale = useTransform(distance, (value) => (anim ? 1 - (1 - SCALE_MIN) * value : 1));
  const opacity = useTransform(distance, (value) => (anim ? 1 - (1 - OPACITY_MIN) * value : 1));

  return (
    <div className="min-w-0 flex-none" aria-hidden={hidden || undefined} style={{ width: width || '100%' }}>
      <motion.div className="h-full" style={{ scale, opacity }}>{children}</motion.div>
    </div>
  );
};

/** Source-faithful P3R daily-ritual carousel from the blue demo package. */
export const P3StackCarousel = ({ children, page, autoPlayMs = 6000, onPageChange, className }: {
  children: ReactNode[];
  page?: number;
  autoPlayMs?: number;
  onPageChange?: (index: number) => void;
  className?: string;
}) => {
  const anim = useBoldness();
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const count = children.length;
  const [index, setIndex] = useState(Math.min(page ?? 0, count - 1));
  const x = useMotionValue(0);
  const paused = useRef(false);

  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const resizeObserver = new ResizeObserver(() => setWidth(element.clientWidth));
    resizeObserver.observe(element);
    setWidth(element.clientWidth);
    return () => resizeObserver.disconnect();
  }, []);

  const go = (next: number, instant = false) => {
    const target = Math.max(0, Math.min(count - 1, next));
    setIndex(target);
    onPageChange?.(target);
    if (instant || !anim) x.set(-target * (width + GAP));
    else animate(x, -target * (width + GAP), { type: 'spring', stiffness: 320, damping: 36 });
  };

  useEffect(() => { go(index, true); }, [width]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (page != null && page !== index) go(page); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!autoPlayMs || !anim || count < 2) return;
    const timer = window.setInterval(() => {
      if (!paused.current && !document.hidden) go(index + 1 >= count ? 0 : index + 1);
    }, autoPlayMs);
    return () => clearInterval(timer);
  }, [autoPlayMs, anim, count, index, width]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={className}>
      <div
        ref={box}
        data-qa-allow-clip
        className="overflow-hidden"
        onPointerDown={() => { paused.current = true; }}
        onPointerUp={() => { paused.current = false; }}
        onPointerCancel={() => { paused.current = false; }}
      >
        <motion.div
          className="flex items-stretch"
          style={{ x, gap: GAP, touchAction: 'pan-y' }}
          drag={count > 1 ? 'x' : false}
          dragMomentum={false}
          dragConstraints={{ left: -(count - 1) * (width + GAP) - 40, right: 40 }}
          dragElastic={0.12}
          onDragEnd={(_, info) => {
            const delta = info.offset.x + info.velocity.x * 0.2;
            go(delta < -width * 0.18 ? index + 1 : delta > width * 0.18 ? index - 1 : index);
          }}
        >
          {children.map((child, childIndex) => (
            <Slide key={childIndex} x={x} index={childIndex} width={width} anim={anim} hidden={childIndex !== index}>
              {child}
            </Slide>
          ))}
        </motion.div>
      </div>
      {count > 1 && (
        <div className="mt-2 flex items-center justify-center gap-1.5" role="tablist" aria-label="切换">
          {children.map((_, childIndex) => (
            <button key={childIndex} type="button" role="tab" aria-selected={childIndex === index} aria-label={`第 ${childIndex + 1} 张`} onClick={() => go(childIndex)} className="flex h-6 items-center px-0.5">
              <motion.span
                className="block h-[6px]"
                animate={{ width: childIndex === index ? 22 : 8 }}
                transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                style={{
                  background: childIndex === index ? P3R.blue : 'rgb(var(--p3r-cyan-rgb) / 0.45)',
                  clipPath: slantClip(3),
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
