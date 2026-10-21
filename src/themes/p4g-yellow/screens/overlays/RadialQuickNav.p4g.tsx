/**
 * RadialQuickNav.p4g —— 长按轮盘（真实 RadialQuickNav + RadialWheelP4）。
 *   · 常规：直接复用外壳的 RadialWheelP4（七瓣：塔罗 / 记录 / 任务 / 羁绊 / 记账 / 成就 / 设置；
 *     「滑向目标」/选中项名、「松开前往 · 滑回中心取消」；48px 死区；遮罩点击关闭；aria「快捷跳转轮盘」）。
 *     打开即点选模式；底部 ◈ 按钮按住 500ms = 手势模式（按住拖动选择、松手跳转、滑回中心取消）。
 *   · D0 / 低动效（?state=reduced 或低动效开关）：普通垂直菜单（图标 + 名称，点选跳转，仅透明度）。
 *     —— WheelD0Menu 已提升进外壳（src/shell/WheelD0Menu.tsx），外壳低动效时长按 ◈ 同样弹出它。
 */
import { useEffect, useRef } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import { IconCat } from '@yellow/kit';
import { WheelD0Menu } from '@yellow/shell/WheelD0Menu';
export { WheelD0Menu };
import { RadialWheelP4 } from '@yellow/shell/RadialWheelP4.p4g';
import { closeWheel, openWheel, useShellState } from '@yellow/shell/shellBus';
import { useLowMotion } from '@yellow/lib/prefs';

export default function RadialQuickNav({ open, onClose, params }: OverlayProps) {
  const low = useLowMotion();
  const d0 = params?.get('state') === 'reduced' || low;
  const { wheel } = useShellState();
  const timer = useRef<number | null>(null);
  const origin = () => ({ x: window.innerWidth / 2, y: window.innerHeight - 52 });
  useEffect(() => { if (open && !d0) openWheel(origin(), false); if (!open) closeWheel(); }, [open, d0]); // eslint-disable-line
  const wasOpen = useRef(false);
  useEffect(() => { if (wasOpen.current && !wheel.open && !d0) onClose(); wasOpen.current = wheel.open; }, [wheel.open]); // eslint-disable-line

  return (
    <>
      {!d0 && <RadialWheelP4 />}
      {d0 && <WheelD0Menu open={open} origin={origin()} onClose={onClose} />}
      {/* ◈ 按钮：按住 500ms 进入手势模式 */}
      {!open && (
        <div className="fixed inset-x-0 bottom-28 z-20 flex flex-col items-center gap-2">
          <button type="button" aria-label="助手（长按打开快捷跳转）" className="flex h-[66px] w-[66px] items-center justify-center rounded-pill border-[3px] border-p4g-black bg-p4g-yellow text-p4g-black shadow-[0_0_0_3px_var(--p4g-yellow),0_0_0_6px_#111]" style={{ touchAction: 'none' }}
            onPointerDown={(e) => { const r = e.currentTarget.getBoundingClientRect(); const o = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; timer.current = window.setTimeout(() => { timer.current = null; openWheel(o, true); }, 500); }}
            onPointerUp={() => { if (timer.current) clearTimeout(timer.current); }} onPointerLeave={() => { if (timer.current) clearTimeout(timer.current); }}
            onContextMenu={(e) => e.preventDefault()}>
            <IconCat size={32} />
          </button>
          <span className="p4g-outline-sm font-display text-meta font-bold">按住 ◈ 500ms：手势轮盘</span>
        </div>
      )}
    </>
  );
}
