import { describe, expect, it } from 'vitest';
import {
  computeDesignSafeRect,
  designToScreen,
  screenToDesign,
} from '@/umbra/layout';

describe('UMBRA layout', () => {
  it('默认方向下中心点保持不变', () => {
    const viewport = { width: 844, height: 390 };
    expect(screenToDesign({ x: 422, y: 195 }, viewport, 0)).toEqual({ x: 640, y: 360 });
    expect(designToScreen({ x: 640, y: 360 }, viewport, 0)).toEqual({ x: 422, y: 195 });
  });

  it('虚拟横屏 ±90° 的触摸坐标可逆', () => {
    const viewport = { width: 390, height: 844 };
    for (const orientation of [90, 270] as const) {
      const point = screenToDesign({ x: 100, y: 200 }, viewport, orientation);
      const back = designToScreen(point, viewport, orientation);
      expect(back.x).toBe(100);
      expect(back.y).toBe(200);
    }
  });

  it('安全区按屏幕 inset 折成设计矩形', () => {
    const viewport = { width: 844, height: 390 };
    const rect = computeDesignSafeRect(viewport, {
      top: 0,
      right: 44,
      bottom: 0,
      left: 0,
    }, 0);
    expect(rect.width).toBeLessThan(1280);
    expect(rect.x).toBe(0);
  });
});
