/**
 * 专辑墙翻牌水波 + 背景星（真实 WallSpinBackdrop · ConfidantAlbumWall p3 的 P3SwitchRipple）。
 * 演出：卡墙每 620ms 自动翻一张 → 牌组弹簧切位（stiffness 260 / damping 28）→ 铭牌处两圈同心环推开（0.9s，第二圈晚 0.11s）→ 铭牌上浮换名；
 * 背景蓝 / 青星点闪烁。手动也可横拖 / 点侧卡 / 跳卡条交互。低动效：横向 snap 列表直出（无水波）。
 *   #/overlay/bond-wall-spin
 */
import type { OverlayProps } from '@blue/registry/types';
import { P3R, Portal, slantClip } from '@blue/kit';
import { useBoldness } from '@blue/lib/prefs';
import { AlbumWall, type FriendItem } from '@blue/screens/pkg3/wall';
import { PK3_CONFIDANTS, PK3_FRIENDS } from '@blue/mock/pkg3';
import '@blue/screens/pkg3/pkg3.css';

const STARS = Array.from({ length: 18 }, (_, i) => ({ x: (i * 53) % 100, y: (i * 37) % 70 + 6, s: 8 + (i % 4) * 4, d: (i % 6) * 0.4, rose: i % 3 !== 0 }));

export default function WallSpinBackdrop({ open, onClose }: OverlayProps) {
  const bold = useBoldness();
  if (!open) return null;
  const friends: FriendItem[] = PK3_FRIENDS.map((f) => ({ kind: 'friend', ...f }));
  const noop = () => {};
  return (
    <Portal>
      <div className="fixed inset-0 overflow-hidden" style={{ zIndex: 'var(--p3r-z-sheet)' as unknown as number, background: 'var(--p3r-bg-grad, var(--p3r-bg))' }} role="dialog" aria-label="专辑墙翻牌演出">
        {bold && STARS.map((s, i) => <span key={i} aria-hidden className="pk3-twinkle absolute" style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, background: s.rose ? P3R.blue : P3R.cyan, clipPath: 'polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%)', animationDelay: `${s.d}s`, opacity: 0.55 }} />)}
        <span aria-hidden className="pointer-events-none absolute -left-4 bottom-10 select-none font-cond text-[120px] leading-none" style={{ color: 'var(--p3r-ghost)', transform: 'rotate(-12deg)' }}>ARCANA</span>
        <div className="relative mx-auto flex h-full max-w-[720px] flex-col justify-center px-4">
          <div className="mb-3 flex items-center gap-2"><span className="px-3 py-1 font-cond text-[13px] tracking-[0.2em]" style={{ background: P3R.ink, color: 'var(--p3r-on-ink)', clipPath: slantClip(6) }}>WALL SPIN</span><span className="text-[12px] font-bold" style={{ color: P3R.grey }}>自动翻牌演示 · 可手动拖动</span>
            <button type="button" onClick={onClose} aria-label="关闭" className="ml-auto flex h-9 w-10 items-center justify-center font-black" style={{ clipPath: slantClip(6), background: P3R.blue, color: P3R.onBlue }}>✕</button></div>
          <AlbumWall autoDemo confidants={PK3_CONFIDANTS.filter((c) => !c.archivedAt)} friends={friends} canCreate prayerFor={() => undefined}
            friendPrayer={(f) => ({ alreadyPrayed: f.prayed, waitingReciprocity: f.beenPrayedBy, pending: false, onPray: noop })} onOpenDetail={noop} onCreate={noop} onOpenFriend={noop} onPropose={noop} onCropFriend={noop} />
        </div>
      </div>
    </Portal>
  );
}
