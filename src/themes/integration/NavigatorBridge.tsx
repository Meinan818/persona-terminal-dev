/**
 * 主题接入：把 demo 外壳的助手开关桥到真实 NavigatorWindow。
 * demo 的页面/外壳保持原样，只在 registry 里把助手组件指向这里。
 */
import { useEffect, useRef } from 'react';
import { NavigatorWindow } from '@/components/navigator/NavigatorWindow';
import { useNavigatorStore } from '@/store/navigator';

export default function NavigatorBridge({
  open = true,
  onClose = () => {},
}: {
  open?: boolean;
  onClose?: () => void;
}) {
  const storeOpen = useNavigatorStore((s) => s.isOpen);
  const wasOpen = useRef(false);

  useEffect(() => {
    const store = useNavigatorStore.getState();
    if (open && !storeOpen) store.open();
    if (!open && storeOpen) store.close();
  }, [open, storeOpen]);

  useEffect(() => {
    if (storeOpen) {
      wasOpen.current = true;
    } else if (wasOpen.current) {
      wasOpen.current = false;
      onClose();
    }
  }, [storeOpen, onClose]);

  return <NavigatorWindow />;
}
