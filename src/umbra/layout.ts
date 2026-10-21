export const DESIGN_WIDTH = 1280;
export const DESIGN_HEIGHT = 720;

export type UmbraOrientation = 0 | 90 | 270;

export interface Viewport {
  width: number;
  height: number;
}

export interface SafeInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface DesignRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DesignPoint {
  x: number;
  y: number;
}

const rad = (orientation: UmbraOrientation): number => (orientation * Math.PI) / 180;

export function screenToDesign(
  point: DesignPoint,
  viewport: Viewport,
  orientation: UmbraOrientation = 0,
): DesignPoint {
  const angle = rad(orientation);
  const sx = point.x / Math.max(1, viewport.width);
  const sy = point.y / Math.max(1, viewport.height);
  const ux = sx * 2 - 1;
  const uy = sy * 2 - 1;
  const rx = ux * Math.cos(angle) - uy * Math.sin(angle);
  const ry = ux * Math.sin(angle) + uy * Math.cos(angle);
  return {
    x: Math.round(((rx + 1) / 2) * DESIGN_WIDTH),
    y: Math.round(((ry + 1) / 2) * DESIGN_HEIGHT),
  };
}

export function designToScreen(
  point: DesignPoint,
  viewport: Viewport,
  orientation: UmbraOrientation = 0,
): DesignPoint {
  const angle = -rad(orientation);
  const dx = point.x / DESIGN_WIDTH;
  const dy = point.y / DESIGN_HEIGHT;
  const ux = dx * 2 - 1;
  const uy = dy * 2 - 1;
  const rx = ux * Math.cos(angle) - uy * Math.sin(angle);
  const ry = ux * Math.sin(angle) + uy * Math.cos(angle);
  return {
    x: Math.round(((rx + 1) / 2) * viewport.width),
    y: Math.round(((ry + 1) / 2) * viewport.height),
  };
}

export function computeDesignSafeRect(
  viewport: Viewport,
  insets: SafeInsets,
  orientation: UmbraOrientation = 0,
): DesignRect {
  const topLeft = screenToDesign({ x: insets.left, y: insets.top }, viewport, orientation);
  const bottomRight = screenToDesign({
    x: viewport.width - insets.right,
    y: viewport.height - insets.bottom,
  }, viewport, orientation);
  const x = Math.min(topLeft.x, bottomRight.x);
  const y = Math.min(topLeft.y, bottomRight.y);
  const width = Math.abs(bottomRight.x - topLeft.x);
  const height = Math.abs(bottomRight.y - topLeft.y);
  return { x, y, width, height };
}
