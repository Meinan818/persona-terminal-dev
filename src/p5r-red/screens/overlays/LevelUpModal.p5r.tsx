/**
 * 属性升级 LevelUpModal → LevelUpP5（真实 src/components/LevelUpModal.tsx + p5r/cutins.tsx#LevelUpP5；p5-modal-05）。
 *   ?variant=level（默认：恭喜升级！知识 Lv.3→Lv.4）| mastery（精通提升！温柔 ★1→★2，masteryStars）  ?attr=&level=&stars=
 * 3.6s 自动关 / 点幕 / ✕；演出层播完即卸载。
 */
import type { OverlayProps } from '@/p5r-red/registry/types';
import { levelUpP5, useCutIn } from './cutins.p5r';

export default function LevelUpModal({ open, onClose, params }: OverlayProps) {
  const mastery = params?.get('variant') === 'mastery';
  useCutIn(open, (done) => levelUpP5({ attr: params?.get('attr') ?? (mastery ? '温柔' : '知识'), level: Number(params?.get('level') ?? (mastery ? 5 : 4)), stars: Number(params?.get('stars') ?? (mastery ? 2 : 0)), onClose: done }), onClose);
  return null;
}
