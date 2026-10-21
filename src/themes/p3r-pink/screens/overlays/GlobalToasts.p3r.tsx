/** 返回键 Toast「再次点击回到现实」（真实 App.tsx showBackToast：Android 返回键在首页按一次，2 秒内再按退出；自动消失） */
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@pink/registry/types';
import { P6Strip } from '@pink/screens/pkg6/strip';

export default function GlobalToasts({ open, onClose }: OverlayProps) {
  const [show, setShow] = useState(open);
  useEffect(() => { setShow(open); if (!open) return; const t = setTimeout(() => { setShow(false); onClose(); }, 2000); return () => clearTimeout(t); }, [open]); // eslint-disable-line
  return <P6Strip show={show} position="bottom-high" tag="TV">再次点击回到现实</P6Strip>;
}
