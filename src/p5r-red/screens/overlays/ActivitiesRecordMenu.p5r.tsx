/**
 * 记录长按菜单（真实 src/pages/Activities.tsx ActionSheet，P1-02）：标题 = 描述截 24 字；
 * 分享到据点（云登录且在组织里才有 → ShareToOrgSheet，pkg4）/ 图片（→ ActivityImagesSheet，pkg4）/ 删除（→ 确认删除这条记录？）。
 * ?state=noorg → 不在组织（无「分享到据点」）
 */
import { useRef, useState } from 'react';
import type { OverlayProps } from '@/p5r-red/registry/types';
import { P5ActionSheet, type SheetAction } from '@/p5r-red/kit/P5ActionSheet';
import { openOverlay } from '@/p5r-red/shell/shellBus';
import { ActivitiesDeleteConfirm } from './ActivitiesDeleteConfirm.p5r';

export const truncateText = (t: string, max: number) => (t.length > max ? `${t.slice(0, max)}…` : t);

export function ActivitiesRecordMenu({ open, onClose, desc, inOrg = true, onDelete }: { open: boolean; onClose: () => void; desc: string; inOrg?: boolean; onDelete: () => void }) {
  const actions: SheetAction[] = [
    ...(inOrg ? [{ label: '分享到据点', onClick: () => openOverlay('actions-share-to-org') }] : []),
    { label: '图片', onClick: () => openOverlay('actions-images-sheet', { title: `图片 · ${truncateText(desc, 16)}` }) },
    { label: '删除', tone: 'danger' as const, onClick: onDelete },
  ];
  return <P5ActionSheet open={open} onClose={onClose} title={truncateText(desc, 24)} actions={actions} />;
}

export default function ActivitiesRecordMenuPreview({ open, onClose, params }: OverlayProps) {
  const [del, setDel] = useState(false);
  const delRef = useRef(false);
  const [menuOpen, setMenuOpen] = useState(true);
  const desc = '图书馆自习三小时，把线代第四章刷完';
  return (
    <>
      <ActivitiesRecordMenu open={open && menuOpen} onClose={() => { setMenuOpen(false); setTimeout(() => { if (!delRef.current) onClose(); }, 0); }} desc={desc} inOrg={params?.get('state') !== 'noorg'} onDelete={() => { delRef.current = true; setDel(true); }} />
      <ActivitiesDeleteConfirm open={del} onClose={() => { setDel(false); onClose(); }} desc={desc} />
    </>
  );
}
