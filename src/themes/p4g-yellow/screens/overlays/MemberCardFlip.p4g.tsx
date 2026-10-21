/**
 * 成员牌翻面（真实 src/components/codex/FlipCardView.tsx + org/MemberCard.tsx 背面）
 * 点牌翻面 / 左右拖动翻面；正面代表牌，背面五维 / 面具 / 称号；下方「同调」；关闭。
 * 路由：#/overlay/hideout-member-flip?m=2（成员序号）&side=back
 */
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { OrgMember, OrgView } from '@/types';
import type { OverlayProps } from '@yellow/registry/types';
import { Portal, useEscape, useScrollLock, P4Button, IconClose, P4Outline } from '@yellow/kit';
import { TVFlash, tvPowerVariants } from '@yellow/fx';
import { useLowMotion } from '@yellow/lib/prefs';
import { buildView, MEMBERS } from '@yellow/adapters/pkg4-org';
import { MemberCardBack, MemberCardFront } from '@yellow/screens/pkg4/org/MemberCard';
import { displayCodename } from '@yellow/screens/pkg4/org/common';

export function MemberFlipView({ view, member, open, onClose, onSync, initialBack }: { view: OrgView; member: OrgMember | null; open: boolean; onClose: () => void; onSync?: (m: OrgMember) => void; initialBack?: boolean }) {
  const low = useLowMotion();
  useScrollLock(open);
  useEscape(open, onClose);
  const [back, setBack] = useState(!!initialBack);
  useEffect(() => { if (open) setBack(!!initialBack); }, [open, member?.id, initialBack]);
  const vw = typeof window === 'undefined' ? 390 : window.innerWidth;
  const vh = typeof window === 'undefined' ? 844 : window.innerHeight;
  const w = Math.max(200, Math.min(300, vw - 72, Math.floor((vh - 190) / 1.6)));
  const canSync = !!member && member.userId !== view.me.userId && (member.card.personas?.length ?? 0) > 0;
  const onDragEnd = (_: unknown, i: PanInfo) => { if (Math.abs(i.offset.x) > 50) setBack((b) => !b); };
  return (
    <Portal>
      <AnimatePresence>
        {open && member && (
          <motion.div key="flip" role="dialog" aria-modal="true" aria-label={`${displayCodename(member)} 的成员牌`} className="fixed inset-0 flex flex-col items-center justify-center gap-4 p-4" style={{ zIndex: 'var(--p4g-z-sheet)' as unknown as number }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-[color:var(--p4g-scrim)]" onClick={onClose} />
            <motion.div className="relative flex flex-col items-center gap-3" variants={tvPowerVariants(low)} initial="off" animate="on" exit="off">
              <div className="flex w-full items-center justify-between gap-3" style={{ width: w }}>
                <P4Outline size="clamp(18px,5vw,22px)" stroke={4} className="min-w-0 truncate">{displayCodename(member)} 的成员牌</P4Outline>
                <button type="button" aria-label="关闭" onClick={onClose} className="p4g-press flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border-3 border-p4g-black bg-p4g-yellow text-p4g-black shadow-hard-sm"><IconClose size={16} /></button>
              </div>
              <motion.div drag={low ? false : 'x'} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.2} onDragEnd={onDragEnd} style={{ perspective: 1200, width: w, height: Math.round(w * 1.6) }} className="relative cursor-pointer touch-pan-y" onClick={() => setBack((b) => !b)} role="button" aria-label={back ? '翻回正面' : '翻到背面'}>
                {low ? (back ? <MemberCardBack view={view} member={member} width={w} /> : <MemberCardFront view={view} member={member} width={w} />) : (
                  <motion.div className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }} animate={{ rotateY: back ? 180 : 0 }} transition={{ duration: 0.5, ease: [0.2, 0.9, 0.1, 1] }}>
                    <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden' }}><MemberCardFront view={view} member={member} width={w} /></div>
                    <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}><MemberCardBack view={view} member={member} width={w} /></div>
                  </motion.div>
                )}
              </motion.div>
              <div className="flex items-center gap-3">
                <span className="font-display text-meta font-bold text-white" style={{ textShadow: '1px 1px 0 #000' }}>点牌翻面 · 左右拖动</span>
                {canSync && onSync && <P4Button size="sm" variant="black" onClick={() => onSync(member)}>同调</P4Button>}
              </div>
              <TVFlash low={low} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

export default function MemberCardFlip({ open, onClose, params }: OverlayProps) {
  const i = Math.max(0, Math.min(MEMBERS.length - 1, Number(params?.get('m') ?? 1)));
  return <MemberFlipView view={buildView()} member={MEMBERS[i]} open={open} onClose={onClose} initialBack={params?.get('side') === 'back'} onSync={() => onClose()} />;
}
