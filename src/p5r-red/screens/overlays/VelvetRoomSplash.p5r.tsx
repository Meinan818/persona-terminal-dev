/**
 * 开屏 · 天鹅绒房间 VelvetRoomSplash（真实 src/components/splash/VelvetRoomSplash.tsx；红主题版：红绒走廊 + 两壁白门板 3D 推进
 * → 中央门开 → 奶白光充满 → MASKARIA 浮出）。实现与 P5 开屏同文件（SplashScreen.p5r.tsx#VelvetSplash）。
 *   ?state=reduced  安全模式：不放 3D 推进段，直接标题（s ≤ 0.35）   ?speed=fast|normal|slow
 */
import type { OverlayProps } from '@/p5r-red/registry/types';
import { VelvetSplash } from './SplashScreen.p5r';

const SPEED: Record<string, number> = { fast: 0.55, normal: 1, slow: 1.65 };
export default function VelvetRoomSplash({ open, onClose, params }: OverlayProps) {
  const reduced = params?.get('state') === 'reduced';
  const base = SPEED[params?.get('speed') ?? 'normal'] ?? 1;
  return <VelvetSplash open={open} onDone={onClose} s={reduced ? Math.min(base, 0.35) : base} reduced={reduced} />;
}
