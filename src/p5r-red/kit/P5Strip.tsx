/** 撕纸条素材（.strip）：tone red | black | cream_a | cream_b。绝对定位，位置用 style 传。 */
import type { CSSProperties } from 'react';
import { kitImg } from '@/p5r-red/lib/asset';
export function P5Strip({ tone = 'red', style, className = '' }: { tone?: 'red' | 'black' | 'cream_a' | 'cream_b'; style?: CSSProperties; className?: string }) {
  return <img className={`strip ${className}`.trim()} src={kitImg('torn_strip_' + tone)} alt="" aria-hidden="true" style={style} />;
}
