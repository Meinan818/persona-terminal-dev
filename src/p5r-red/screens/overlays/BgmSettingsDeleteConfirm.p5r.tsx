/** 删除曲目确认（真实 src/components/BgmSettings.tsx 的 window.confirm；红频道统一二段确认）。?name= 曲目名 */
import type { OverlayProps } from '@/p5r-red/registry/types';
import { toast } from '@/p5r-red/kit/P5Toast';
import { BgmDeleteConfirm } from './SettingsBlocks';
export default function BgmSettingsDeleteConfirm({ open, onClose, params }: OverlayProps) {
  return <BgmDeleteConfirm name={open ? (params?.get('name') ?? 'Rainy Library.m4a') : null} onClose={onClose} onConfirm={() => toast('已删除')} />;
}
