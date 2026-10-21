/**
 * 首页临期 Toast（真实 DashboardP5.tsx urgentToast：钉选宣告卡 ≤3 天，每卡每天最多一次，3.6s 自动消失；
 * 存 localStorage velvet_cc_urgent_<id>_<日期>）。demo 预览 #/overlay/home-urgent-toast 每次都弹。
 * 入 opacity 0→1 / y -16→0（.3s），出 y→-8 淡出。v3 红条语汇（.hm-urgent）。
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { OverlayProps } from '@/p5r-red/registry/types';
import { Portal } from '@/p5r-red/kit/Portal';
import { D } from '@/p5r-red/mock/data';
import '../pages/DashboardP5.p5r.css';

export default function DashboardToasts({ open, onClose, params }: OverlayProps) {
  const pinned = D.callingCards.find((c) => c.pinned);
  const left = Number(params?.get('left') ?? 3);
  const [show, setShow] = useState(open);
  useEffect(() => { setShow(open); if (!open) return; const t = setTimeout(() => { setShow(false); setTimeout(onClose, 300); }, 3600); return () => clearTimeout(t); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Portal>
      <AnimatePresence>
        {show && pinned && (
          <motion.div key="urgent" className="hm-urgent" role="status" initial={{ opacity: 0, y: -16, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -8, x: '-50%' }} transition={{ duration: 0.3 }}>
            <span aria-hidden="true">⏳</span><span>「{pinned.title}」还剩 {left} 天</span>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
