/** 倒计时卡纹理（斜纹 / 网格 / 点阵 / 纯色）→ CSS 背景，颜色统一走主题色（P4G：黄底黑纹） */
import type { CallingCardTone } from '@real/types';
export const toneBg = (t: CallingCardTone | string, ink = 'rgba(17,17,17,.16)'): string => {
  switch (t) {
    case 'lines': return `repeating-linear-gradient(-45deg, ${ink} 0 6px, transparent 6px 14px)`;
    case 'grid': return `linear-gradient(${ink} 2px, transparent 2px) 0 0/14px 14px, linear-gradient(90deg, ${ink} 2px, transparent 2px) 0 0/14px 14px`;
    case 'dots': return `radial-gradient(${ink} 2px, transparent 2.5px) 0 0/10px 10px`;
    default: return 'none';
  }
};
