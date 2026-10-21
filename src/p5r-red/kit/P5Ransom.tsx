/**
 * 剪报字母标题（原 P5.ui.ransom）：letters 素材 L_*.webp，逐字旋转 / 跳位（seed 确定），同字母第二次换 _alt。
 *   <P5Ransom text="SHOWTIME" h={44} seed={7} />
 * 注：首页 MASKARIA 用的是矢量字砖（.hm-tile），不是这个。
 */
import { useMemo } from 'react';
import { kitImg } from '@/p5r-red/lib/asset';
import { ransomTiles } from './html';
export function P5Ransom({ text, h = 40, seed = 1, className = '' }: { text: string; h?: number; seed?: number; className?: string }) {
  const tiles = useMemo(() => ransomTiles(text, h, seed), [text, h, seed]);
  return (
    <span className={`ransom ${className}`.trim()} role="img" aria-label={text} style={{ ['--h' as string]: `${h}px` }}>
      {tiles.map((t) => t.key
        ? <img key={t.i} data-l={t.i} src={kitImg('L_' + t.key)} alt="" style={{ height: `${t.height}px`, marginLeft: `${t.ml}px`, transform: t.transform }} />
        : <span key={t.i} style={{ width: `${h * 0.3}px` }} />)}
    </span>
  );
}
