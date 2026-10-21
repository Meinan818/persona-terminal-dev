/**
 * SlotImg —— 官方素材插槽图片：official/<slot> 存在则用，否则用 fallback（生成素材）。
 *   <SlotImg slot="logo" fallback={p4gAsset('tv-mascot.webp')} alt="MASKARIA" className="h-10" />
 *   <SlotImg slot="char-chie" fallback={p4gAsset('tv-mascot.webp')} />
 * fallback 也缺失时渲染 fallbackNode（若提供）。
 */
import type { ImgHTMLAttributes, ReactNode } from 'react';
import { useSlot, useImageOk } from '@yellow/lib/slots';

export interface SlotImgProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> { slot: string; fallback: string; fallbackNode?: ReactNode }
export function SlotImg({ slot, fallback, fallbackNode, alt = '', ...rest }: SlotImgProps) {
  const src = useSlot(slot, fallback);
  const ok = useImageOk(src);
  if (ok === false && fallbackNode) return <>{fallbackNode}</>;
  return <img src={src} alt={alt} draggable={false} {...rest} />;
}
