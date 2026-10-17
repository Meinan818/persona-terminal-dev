/**
 * 羁绊链红频道（P5 红黑剪报）三件共用的**布景层** —— 同心星 + 散落描边星 + 网点 + 暗角。
 *
 * 为什么抽出来：演出的红版（Wave 1）先照已验收 demo 移植了这套布景；恭喜整页（Wave 2）
 * 与星移弹窗（Wave 3）需要**同一套**底景才对得上 demo 的整体观感。三处各抄一份必然漂移
 * （Wave 2 首版就漏了同心星层，用户报「背景也丢了」）。抽到这里，一处改动三件同步。
 *
 * 形制照用户已验收的红版 demo（outputs/bond-rankup-demo-p5/index.html）：
 *   · 同心星：一圈圈由外向内、每层缩小 0.912、每层转 1.6°，黑红交替填色的星带
 *   · 散落星：五颗空心描边五角星散布四角（位置 / 尺寸 / 旋转 / 描边色照 demo）
 *
 * 装饰件一律 aria-hidden；红频道不挂 .dark（见 ui/channel.ts 的 syncDarkClass 铁律），
 * 所以这里不写 dark 变体。
 */
import type { CSSProperties } from 'react';
import { P5R, starPts } from '@/components/p5r/kit';

/** 同心星每层的填色带（黑红交替，照 demo） */
export const P5_STAR_BANDS = [
  '#150001', '#3f0004', '#0f0001', '#4c0005', '#0b0000',
  '#340003', '#070000', '#280002', '#050000',
];

/** 四角散落的描边五角星：[左偏移(px), 上偏移, 尺寸(px), 旋转(deg), 描边色]（照 demo） */
export const P5_SCATTER_STARS: { x: number; y: string; size: number; rot: number; color: string }[] = [
  { x: -14, y: '12%', size: 96, rot: -16, color: '#6b6862' },
  { x: -10, y: '16%', size: 70, rot: 14, color: P5R.red },
  { x: 6, y: '10%', size: 58, rot: -8, color: P5R.paper },
  { x: 10, y: '26%', size: 80, rot: 20, color: P5R.orange },
  { x: -16, y: '30%', size: 64, rot: -22, color: P5R.paper },
];

/** 同心星的层多边形（由外向内每层缩小 0.912、转 1.6°）。
 *  演出那件要给整层挂入场动画（ref 在它自己的 div 上），所以这里导出**层生成函数**
 *  而非只有组件 —— 两处几何定义唯一，渲染时机各自决定。 */
export const p5RingLayers = (maxLayers?: number) => {
  const layers = [];
  let R = 100;
  let i = 0;
  while (R > 0.6 && (!maxLayers || layers.length < maxLayers)) {
    layers.push(
      <polygon
        key={i}
        points={starPts(100, 100, R, -90 + i * 1.6, 0.42)}
        fill={P5_STAR_BANDS[i % P5_STAR_BANDS.length]}
      />,
    );
    R *= 0.912;
    i++;
  }
  return layers;
};

/** 同心星层：一层 svg，内部按层缩小 / 旋转叠多边形 */
export const P5Rings = ({ className }: { className?: string }) => (
  <div className={className} aria-hidden>
    <svg viewBox="0 0 200 200">{p5RingLayers()}</svg>
  </div>
);

/** 散落描边星层 */
export const P5ScatterStars = ({ className }: { className?: string }) => (
  <div className={className} aria-hidden>
    {P5_SCATTER_STARS.map((s, i) => (
      <svg key={i} viewBox="0 0 200 200" style={{ left: s.x, top: s.y, width: s.size, height: s.size } as CSSProperties}>
        <polygon points={starPts(100, 100, 88, s.rot, 0.42)} fill="none" stroke={s.color} strokeWidth={9} />
      </svg>
    ))}
  </div>
);

/** 星涟漪层（照 demo #ripples）：三圈描边星接力向外扩散，每圈转 12°。
 *  各圈的入场动画由使用方按 index 挂（demo 里 delay = i*240ms）。 */
export const P5Ripples = ({ className }: { className?: string }) => (
  <div className={className} aria-hidden>
    {[0, 1, 2].map(i => (
      <svg key={i} viewBox="0 0 200 200">
        <polygon points={starPts(100, 100, 90, -90 + i * 12, 0.42)} fill="none" stroke="#7d0009" strokeWidth={6} />
      </svg>
    ))}
  </div>
);

/** 四角大圆环（照 demo #hoops）：四枚不同尺寸/线宽/颜色的圆环，两左两右错落。 */
const HOOPS: Array<{ style: CSSProperties }> = [
  { style: { left: -78, top: '8%', width: 200, height: 200, border: '14px solid #45000a' } },
  { style: { left: -28, top: 'calc(8% + 52px)', width: 108, height: 108, border: '11px solid #2f2d2a' } },
  { style: { right: -64, bottom: '11%', width: 172, height: 172, border: '13px solid #2f2d2a' } },
  { style: { right: -18, bottom: 'calc(11% + 46px)', width: 84, height: 84, border: '9px solid #45000a' } },
];
export const P5Hoops = ({ className }: { className?: string }) => (
  <div className={className} aria-hidden>
    {HOOPS.map((h, i) => <i key={i} style={{ position: 'absolute', borderRadius: '50%', ...h.style }} />)}
  </div>
);

/** 集中线层（照 demo #collect）：28 道暗红放射条自中心爆开。 */
export const P5Collect = ({ className }: { className?: string }) => (
  <div className={className} aria-hidden>
    {Array.from({ length: 28 }, (_, i) => (
      <i key={i} style={{ transform: `rotate(${(i * 360 / 28).toFixed(1)}deg)` }} />
    ))}
  </div>
);
