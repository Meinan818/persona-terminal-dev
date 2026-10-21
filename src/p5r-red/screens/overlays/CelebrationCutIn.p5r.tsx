/**
 * 庆祝基座 CelebrationCutIn（真实 src/components/CelebrationCutIn.tsx p5 分支）：红舞台 + 墨撕纸卡（星徽 icon / 跨栏拼贴标题 / subtitle / children）
 * + 彩纸粒子；自动关（3s）+ 点幕 + ✕ 三通道。其它庆祝（BigDeal / 愿望 / 据点 …，归 pkg3/4/5）复用 celebrationCutIn()。
 */
import type { OverlayProps } from '@/p5r-red/registry/types';
import { celebrationCutIn, useCutIn } from './cutins.p5r';

export default function CelebrationCutIn({ open, onClose }: OverlayProps) {
  useCutIn(open, (done) => celebrationCutIn({ onClose: done }), onClose);
  return null;
}
