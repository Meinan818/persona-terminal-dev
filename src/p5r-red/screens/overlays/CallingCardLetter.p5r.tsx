/**
 * 预告信卡面（v3 overlays/d.js ccLetter：纸面 + 纹理 + 角星 + 剪报 TAKE YOUR HEART + 标题 + 台词 + 署名；程序化，不用位图）。
 * 宣告卡编辑器预览、结算屏共用。texture 用真实 id（lines | grid | dots | plain）→ v3 类 tex-stripe | grid | dots | solid。
 */
import type { ReactNode } from 'react';
import { P5Ransom } from '@/p5r-red/kit/P5Ransom';
import { P5StarIcon } from '@/p5r-red/kit/P5StarIcon';
export type CCTexture = 'lines' | 'grid' | 'dots' | 'plain';
const TEX: Record<CCTexture, string> = { lines: 'stripe', grid: 'grid', dots: 'dots', plain: 'solid' };
export function CCLetter({ title, line, texture = 'lines', icon, children }: { title: string; line?: string; texture?: CCTexture; icon?: string; children?: ReactNode }) {
  return (
    <div className={`od-ccl tex-${TEX[texture]}`}>
      <span className="od-ccl-corner" aria-hidden="true">{icon && icon !== '★' ? <b className="cc-icon">{icon}</b> : <P5StarIcon fill="var(--ink)" stroke="var(--paper)" sw={1.6} />}</span>
      <P5Ransom text="TAKE YOUR HEART" h={22} seed={8} />
      <b className="od-ccl-t">{title}</b>
      <i className="od-ccl-s">{line || '命运在此倾覆'}</i>
      <span className="od-ccl-sign">— MASKARIA</span>
      {children}
    </div>
  );
}
