/**
 * 成员牌翻面（真实 src/pages/Hideout.tsx FlipCardView + org/MemberCard.tsx 背面）—— 居中卡 scale .92 + 斜向位移弹入（springSoft）
 * 点牌翻面 / 左右拖动翻面；正面代表牌，背面五维 / 面具 / 称号；下方「同调」；关闭。
 * 路由：#/overlay/hideout-member-flip?m=2（成员序号）&side=back&tab=stats|masks|titles
 */
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { OrgMember, OrgView } from '@/types';
import type { OverlayProps } from '@blue/registry/types';
import { Portal, useEscape, useScrollLock, P3Button, P3R, slantClip } from '@blue/kit';
import { useLowMotion } from '@blue/lib/prefs';
import { buildView, MEMBERS } from '@blue/adapters/pkg4-org';
import { MemberCardBack, MemberCardFront } from '@blue/screens/pkg4/org/MapWall';
import { displayCodename } from '@blue/screens/pkg4/org/common';

export function MemberFlipView({ view, member, open, onClose, onSync, initialBack, initialTab }: { view: OrgView; member: OrgMember | null; open: boolean; onClose: () => void; onSync?: (m: OrgMember) => void; initialBack?: boolean; initialTab?: 'stats' | 'masks' | 'titles' }) {
  const low = useLowMotion();
  useScrollLock(open);
  useEscape(open, onClose);
  const [back, setBack] = useState(!!initialBack);
  useEffect(() => { if (open) setBack(!!initialBack); }, [open, member?.id, initialBack]);
  const vw = typeof window === 'undefined' ? 390 : window.innerWidth;
  const vh = typeof window === 'undefined' ? 844 : window.innerHeight;
  const w = Math.max(180, Math.min(300, vw - 72, Math.floor((vh - 190) / 1.6)));
  const canSync = !!member && member.userId !== view.me.userId && (member.card.personas?.length ?? 0) > 0;
  const onDragEnd = (_: unknown, i: PanInfo) => { if (Math.abs(i.offset.x) > 50) setBack((b) => !b); };
  return (
    <Portal>
      <AnimatePresence>
        {open && member && (
          <motion.div key="flip" role="dialog" aria-modal="true" aria-label={`${displayCodename(member)} 的成员牌`} className="fixed inset-0 flex flex-col items-center justify-center gap-4 p-4" style={{ zIndex: 'var(--p3r-z-sheet)' as unknown as number }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0" style={{ background: 'var(--p3r-scrim)' }} onClick={onClose} />
            <motion.div className="relative flex flex-col items-center gap-3" initial={low ? { opacity: 0 } : { opacity: 0, scale: 0.92, x: -18, y: 14 }} animate={{ opacity: 1, scale: 1, x: 0, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={low ? { duration: 0.12 } : { type: 'spring', stiffness: 300, damping: 26 }}>
              <div className="flex items-center justify-between gap-3" style={{ width: w }}>
                <span className="min-w-0 truncate px-3 py-1 font-heavy text-[17px]" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(6) }}>{displayCodename(member)} 的成员牌</span>
                <button type="button" aria-label="关闭" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center text-[18px] font-black" style={{ background: P3R.ink, color: 'var(--p3r-on-ink)', clipPath: slantClip(6) }}>✕</button>
              </div>
              <motion.div drag={low ? false : 'x'} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.2} onDragEnd={onDragEnd} style={{ perspective: 1200, width: w, height: Math.round(w * 1.6) }} className="relative cursor-pointer touch-pan-y" onClick={() => setBack((b) => !b)} role="button" aria-label={back ? '翻回正面' : '翻到背面'}>
                {low ? (back ? <MemberCardBack view={view} member={member} width={w} initialTab={initialTab} /> : <MemberCardFront view={view} member={member} width={w} />) : (
                  <motion.div className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }} initial={false} animate={{ rotateY: back ? 180 : 0 }} transition={{ duration: 0.5, ease: [0.2, 0.9, 0.1, 1] }}>
                    <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden' }}><MemberCardFront view={view} member={member} width={w} /></div>
                    <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}><MemberCardBack view={view} member={member} width={w} initialTab={initialTab} /></div>
                  </motion.div>
                )}
              </motion.div>
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 text-[12px] font-black" style={{ background: 'var(--p3r-panel-glass)', color: P3R.ink, clipPath: slantClip(5) }}>点牌翻面 · 左右拖动</span>
                {canSync && onSync && <P3Button size="sm" onClick={() => onSync(member)}>同调</P3Button>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

export default function MemberCardFlip({ open, onClose, params }: OverlayProps) {
  const i = Math.max(0, Math.min(MEMBERS.length - 1, Number(params?.get('m') ?? 1)));
  const tab = (['stats', 'masks', 'titles'].includes(params?.get('tab') ?? '') ? params!.get('tab') : 'stats') as 'stats';
  return <MemberFlipView view={buildView()} member={MEMBERS[i]} open={open} onClose={onClose} initialBack={params?.get('side') === 'back'} initialTab={tab} onSync={() => onClose()} />;
}
