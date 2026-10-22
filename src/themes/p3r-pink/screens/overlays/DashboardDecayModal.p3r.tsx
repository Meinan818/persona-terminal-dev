/**
 * DashboardDecayModal.p3r —— 逆流侵蚀通知（真实 DashboardP3 decayedAttrs → ModalPortal 弹窗）。
 *   幕 rgba 50% 淡入 → 卡 spring(260/18) scale .85 / y 16 → 1；斜切白卡（clip 16）：🌊（粉版：珊瑚单色波浪字形）+「逆流侵蚀」+
 *   「以下属性连续3日无增长，已各扣减 1 点」+ 属性行（樱粉斜条：名 / −1 珊瑚）+ 主按钮「知道了」。点遮罩 / 知道了 / ESC 关闭。
 * 演示：?attrs=kindness,guts（默认两项）；?attrs=charm 单项。
 */
import { AnimatePresence, motion } from 'framer-motion';
import type { AttributeId } from '@real/types';
import type { OverlayProps } from '@pink/registry/types';
import { Portal, P3Button, P3R, slantClip, useEscape } from '@pink/kit';
import { useBoldness } from '@pink/lib/prefs';
import { ATTR_NAMES, MOCK_DECAYED } from '@pink/mock/pkg1';
import { WaveGlyph } from '@pink/screens/pkg1/DashboardParts';

export const DecayModal = ({ attrs, onClose }: { attrs: AttributeId[]; onClose: () => void }) => {
  const anim = useBoldness();
  useEscape(attrs.length > 0, onClose);
  return (
    <Portal>
      <AnimatePresence>
        {attrs.length > 0 && (
          <motion.div key="decay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
            className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 'var(--p3r-z-sheet)' as unknown as number, background: 'var(--p3r-scrim)' }}>
            <motion.div role="dialog" aria-modal="true" aria-labelledby="decay-title" onClick={(e) => e.stopPropagation()}
              initial={anim ? { scale: 0.85, opacity: 0, y: 16 } : { opacity: 0 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={anim ? { scale: 0.9, opacity: 0 } : { opacity: 0 }}
              transition={anim ? { type: 'spring', damping: 18, stiffness: 260 } : { duration: 0.16 }}
              className="relative w-full max-w-sm p-6" style={{ background: P3R.panel, clipPath: slantClip(16), boxShadow: 'var(--p3r-shadow-lg)' }}>
              <span aria-hidden className="absolute left-0 top-0 h-[26px] w-[26px]" style={{ background: P3R.magenta, clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
              <div className="mb-4 text-center">
                <div className="mb-3 flex justify-center" aria-hidden><span className="scale-[1.7]"><WaveGlyph /></span></div>
                <h3 id="decay-title" className="font-heavy text-[20px]" style={{ color: P3R.ink }}>逆流侵蚀</h3>
                <p className="mt-1 text-sm font-semibold" style={{ color: P3R.inkSoft }}>以下属性连续3日无增长，已各扣减 1 点</p>
              </div>
              <div className="mb-5 space-y-2">
                {attrs.map((id, i) => (
                  <motion.div key={id} className="flex items-center justify-between px-4 py-2.5" style={{ clipPath: slantClip(8), background: P3R.cyanFaint }}
                    initial={anim ? { x: 24, opacity: 0 } : false} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.15 + i * 0.06, type: 'spring', stiffness: 400, damping: 30 }}>
                    <span className="text-sm font-black" style={{ color: P3R.ink }}>{ATTR_NAMES[id]}</span>
                    <span className="font-cond text-[17px]" style={{ color: 'var(--p3r-coral-ink)' }}>−1</span>
                  </motion.div>
                ))}
              </div>
              <P3Button block onClick={onClose}>知道了</P3Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
};

export default function DecayOverlay({ open, onClose, params }: OverlayProps) {
  const raw = params?.get('attrs');
  const attrs = (raw ? raw.split(',') : MOCK_DECAYED).filter((a): a is AttributeId => a in ATTR_NAMES);
  return <DecayModal attrs={open ? attrs : []} onClose={onClose} />;
}
