/**
 * 逆流侵蚀通知（真实 DashboardP5.tsx decayedAttrs：进入首页执行衰减，有扣减时弹；portal 到 body）。
 * 纸面板 + 黑框：🌊「逆流侵蚀 / 以下属性连续3日无增长，已各扣减 1 点」+ 属性列表 −1 +「知道了」。
 * 入场 spring 260/18（scale .85→1, y 16→0, rotate -2→-1）。?attrs=guts,charm 自定列表。
 */
import { motion } from 'motion/react';
import type { OverlayProps } from '@/p5r-red/registry/types';
import { P5Layer } from '@/p5r-red/kit/P5Layer';
import { P5Panel } from '@/p5r-red/kit/p5r';
import { useLowMotion } from '@/p5r-red/lib/prefs';
import { ATTR, type AttrId } from '@/p5r-red/mock/data';
import '../pages/DashboardP5.p5r.css';

export default function DashboardDecayModal({ open, onClose, params }: OverlayProps) {
  const low = useLowMotion();
  const ids = ((params?.get('attrs') ?? 'guts,charm').split(',').filter((x) => x in ATTR)) as AttrId[];
  return (
    <P5Layer open={open} onClose={onClose} cls="hm-decay" z={880} style={{ display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(0,0,0,.7)' }}>
      <motion.div initial={low ? false : { scale: 0.85, opacity: 0, y: 16, rotate: -2 }} animate={{ scale: 1, opacity: 1, y: 0, rotate: -1 }} transition={{ type: 'spring', damping: 18, stiffness: 260 }} style={{ width: 'min(384px, 100%)' }} role="dialog" aria-modal="true" aria-label="逆流侵蚀">
        <P5Panel seed={97} jag={8} frame={3.5} keyline={2.5} shadow={{ x: 6, y: 7 }} bodyClassName="hm-decay-card">
          <div style={{ fontSize: 36, marginBottom: 10 }} aria-hidden="true">🌊</div>
          <h3>逆流侵蚀</h3>
          <p>以下属性连续3日无增长，已各扣减 1 点</p>
          {ids.map((id) => <div className="hm-decay-row" key={id}><span>{ATTR[id].name}</span><em>−1</em></div>)}
          <button type="button" className="hm-decay-ok" onClick={onClose}>知道了</button>
        </P5Panel>
      </motion.div>
    </P5Layer>
  );
}
