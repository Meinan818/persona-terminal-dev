/**
 * 同步换成卡面？（真实 ConfidantDetailModal 上传头像后的 ConfirmDialog）
 * 「同步卡面」= 羁绊墙整张牌面换成头像；「只当头像」= 仅档案里用（关闭 / 取消也按只当头像处理）。
 *   #/overlay/bond-sync-avatar-confirm
 */
import type { OverlayProps } from '@blue/registry/types';
import { P3Dialog, P3R, showToast, slantClip } from '@blue/kit';
import { Tarot } from '@blue/screens/pkg3/ui';

export function AvatarSyncConfirm({ open, onClose, name, arcanaId = 'lovers', onSync, onAvatarOnly }: { open: boolean; onClose: () => void; name: string; arcanaId?: string; onSync: () => void; onAvatarOnly: () => void }) {
  return (
    <P3Dialog open={open} onClose={() => { onAvatarOnly(); onClose(); }} title="同步换成卡面？" confirmText="同步卡面" cancelText="只当头像" onConfirm={() => { onSync(); onClose(); }}
      description={<>选「同步」会把羁绊墙上 <b style={{ color: P3R.ink }}>{name}</b> 的整张塔罗牌面换成刚上传的图；选「只当头像」则仅在档案里用它，牌面保持塔罗。之后可随时长按头像改回。</>}>
      <div className="flex items-center justify-center gap-4 py-1" aria-hidden>
        <Tarot arcanaId={arcanaId} width={54} />
        <span className="font-cond text-[26px]" style={{ color: P3R.blue }}>→</span>
        <span className="flex h-[90px] w-[54px] items-center justify-center font-cond text-[13px]" style={{ background: 'repeating-linear-gradient(-45deg, var(--p3r-cyan-pale) 0 8px, var(--p3r-cyan-faint) 8px 16px)', color: P3R.roseInk, clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}>IMG</span>
      </div>
      <p className="mt-1 text-center text-[11px]" style={{ color: P3R.grey }}><span className="inline-block px-1.5" style={{ background: P3R.cyanFaint, clipPath: slantClip(3) }}>图片仅保留在本地</span></p>
    </P3Dialog>
  );
}

export default function ConfidantDetailModalAvatarConfirm({ open, onClose }: OverlayProps) {
  return <AvatarSyncConfirm open={open} onClose={onClose} name="由加莉" onSync={() => showToast('卡面已同步')} onAvatarOnly={() => showToast('只当头像')} />;
}
