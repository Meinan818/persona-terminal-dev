/**
 * 返回键 Toast（P1-19；真实 src/App.tsx showBackToast：Android 返回键 / 浏览器后退在首页时 →「再次点击回到现实」，2 秒内再按则退出；
 * fixed bottom-32 居中，y 24→0 / 0.22s 入，y 12 淡出）。v3 缺此件，按红主题做：墨底切角条 + 红错位硬影 + 红星，pointer-events none。
 *   预览 #/overlay/global-back-toast：弹出 2s 后收起；?variant=exit 演示 2 秒内第二次按下 → 「退出应用（demo）」。
 * 首页接线：DashboardP5 监听 Escape / 浏览器后退（hash 回到首页本身时）调 showBackToast()（demo 无原生返回键）。
 */
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { OverlayProps } from '@/p5r-red/registry/types';
import { Portal } from '@/p5r-red/kit/Portal';
import { P5OaStar } from '@/p5r-red/kit/P5Layer';
import { toast } from '@/p5r-red/kit/P5Toast';
import { useLowMotion } from '@/p5r-red/lib/prefs';
import './GlobalToasts.p5r.css';

export function BackToastP5({ show }: { show: boolean }) {
  const low = useLowMotion();
  return (
    <Portal>
      <AnimatePresence>
        {show && (
          <motion.div key="back" className="gt5-back" role="status" aria-live="polite"
            initial={{ opacity: 0, y: low ? 0 : 24, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: low ? 0 : 12, x: '-50%' }} transition={{ duration: 0.22 }}>
            <span className="gt5-back-in"><P5OaStar size={16} fill="var(--red)" stroke="var(--p5r-paper)" sw={8} rot={-12} />再次点击回到现实</span>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

/** 首页用：返回键第一次 → 弹 2s；2s 内再按 → onExit */
let lastBack = 0;
export function useBackToast(onExit: () => void = () => toast('退出应用（demo）')) {
  const [show, setShow] = useState(false);
  useEffect(() => { if (!show) return; const t = setTimeout(() => setShow(false), 2000); return () => clearTimeout(t); }, [show]);
  const press = () => { const now = Date.now(); if (now - lastBack < 2000) { lastBack = 0; setShow(false); onExit(); return; } lastBack = now; setShow(true); };
  return { show, press };
}

export default function GlobalToasts({ open, onClose, params }: OverlayProps) {
  const exit = params?.get('variant') === 'exit';
  const { show, press } = useBackToast();
  useEffect(() => {
    if (!open) return;
    lastBack = 0; press();
    const ts = [window.setTimeout(() => { if (exit) press(); }, 900), window.setTimeout(onClose, 2300)];
    return () => ts.forEach(clearTimeout);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  return <BackToastP5 show={show} />;
}
