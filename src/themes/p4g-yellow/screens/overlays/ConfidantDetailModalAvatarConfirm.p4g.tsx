/**
 * 同步换成卡面？（真实 ConfidantDetailModal 上传头像后的 ConfirmDialog）
 * 「同步卡面」= 羁绊墙整张牌面换成头像；「只当头像」= 仅档案里用。
 */
import type { OverlayProps } from '@yellow/registry/types';
import { P4Dialog, showToast } from '@yellow/kit';
import { TarotCard } from '@yellow/screens/pkg3/ui';

export function AvatarSyncConfirm({ open, onClose, name, onSync, onAvatarOnly }: { open: boolean; onClose: () => void; name: string; onSync: () => void; onAvatarOnly: () => void }) {
  return (
    <P4Dialog open={open} onClose={() => { onAvatarOnly(); onClose(); }} title="同步换成卡面？" speaker={name} confirmText="同步卡面" cancelText="只当头像" onConfirm={onSync}
      message="选「同步」会把羁绛墙上这位同伴的整张塔罗牌面换成刚上传的图；选「只当头像」则仅在档案里用它，牌面保持塔罗。之后可随时长按头像改回。">
      <div className="flex items-center justify-center gap-3" aria-hidden>
        <TarotCard arcanaId="chariot" width={54} />
        <span className="font-display text-h3 font-bold text-p4g-yellow">→</span>
        <div className="flex w-[54px] items-center justify-center rounded-[6px] border-[3px] border-p4g-yellow bg-p4g-black text-p4g-yellow" style={{ aspectRatio: '1/1.6' }}>IMG</div>
      </div>
    </P4Dialog>
  );
}

export default function ConfidantDetailModalAvatarConfirm({ open, onClose }: OverlayProps) {
  return <AvatarSyncConfirm open={open} onClose={onClose} name="千枝" onSync={() => showToast('卡面已同步')} onAvatarOnly={() => showToast('只当头像')} />;
}
