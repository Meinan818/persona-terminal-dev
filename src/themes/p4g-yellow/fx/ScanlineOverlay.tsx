/**
 * CRT 扫描线（全局一层，CSS repeating-gradient，零 JS 动画、零重绘）。
 * 开关：<html data-p4g-scanlines="on|off">（Dev 胶囊控制）。AppShell / Harness 根部各挂一次即可。
 *   <ScanlineOverlay />            全屏 fixed
 *   <ScanlineOverlay local />      只覆盖父容器（absolute），比如电视画面内
 */
import { cx } from '@yellow/lib/cx';

export function ScanlineOverlay({ local = false, className }: { local?: boolean; className?: string }) {
  return (
    <div
      aria-hidden
      className={cx('p4g-scanlines', local && '!absolute !z-[1]', className)}
    />
  );
}
