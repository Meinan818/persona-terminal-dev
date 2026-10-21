/**
 * PinkStage —— 粉专属舞台层（替代真实 P3RPage 的「P3R.bg + p3-water-wide.png + veil」水面底；蓝主题不挂）。
 *   variant='page'：樱色黄昏底图 + 纱 + 右上斜贯色带一角 + 少量樱瓣 / 玻璃光点
 *   variant='home'：同上，另由首页自行挂 <HomeHeroDecor/>（线框地球自转 + 斜贯色带 + 透视网格）
 *   ghost：左缘竖排描边巨字（暂停菜单 / 子页）
 * 性能：静态层 + transform/opacity 关键帧；无 backdrop-filter / 大面积 blur；低动效时樱瓣隐藏、地球静止（index.css 收口）。
 * 外壳已挂（AppShell），页面不要重复挂；自建全屏宿主（开屏 / 全屏演出）时再挂一次。
 */
import { memo, type CSSProperties } from 'react';
import { Petals } from './Petals';

const Glint = ({ style }: { style: CSSProperties }) => (
  <svg viewBox="0 0 20 20" className="pk-glint absolute h-4 w-4" style={style} aria-hidden>
    <path d="M10 0 L11.4 8.6 L20 10 L11.4 11.4 L10 20 L8.6 11.4 L0 10 L8.6 8.6 Z" fill="var(--pk-glint)" />
  </svg>
);

/** 原创线框地球：经纬线 + 抽象大陆轮廓，经线 scaleX 余弦 = 自转 */
export const WireGlobe = memo(({ className, style }: { className?: string; style?: CSSProperties }) => {
  const R = 150;
  const land = (
    <g fill="none" stroke="var(--pk-globe-land)" strokeWidth="1.2" strokeLinejoin="round">
      <path d="M40 92 C70 70 112 74 128 98 C140 120 116 138 120 160 C124 184 96 196 78 182 C60 166 70 140 52 128 C36 118 26 104 40 92 Z" />
      <path d="M170 60 C196 48 236 56 250 76 C262 96 240 104 246 122 C252 140 226 150 210 140 C194 130 196 112 178 104 C160 96 152 72 170 60 Z" />
      <path d="M196 176 C222 168 246 182 240 206 C234 228 210 236 196 222 C184 210 178 184 196 176 Z" />
      <path d="M92 222 C108 214 132 220 130 236 C128 250 104 254 94 244 C86 236 84 228 92 222 Z" />
    </g>
  );
  return (
    <svg viewBox="-160 -160 320 320" className={className} style={style} aria-hidden>
      <defs><clipPath id="pk-globe-clip"><circle r={R - 1} /></clipPath></defs>
      <circle r={R} fill="none" stroke="var(--pk-globe)" strokeWidth="1.6" />
      <circle r={R + 7} fill="none" stroke="var(--pk-globe)" strokeWidth="0.6" strokeDasharray="2 6" />
      {[-110, -60, 0, 60, 110].map((y) => <ellipse key={y} cx={0} cy={y} rx={Math.sqrt(R * R - y * y)} ry={Math.max(4, 16 - Math.abs(y) / 10)} fill="none" stroke="var(--pk-globe)" strokeWidth="0.9" />)}
      {Array.from({ length: 6 }).map((_, i) => <ellipse key={i} className="pk-meridian" rx={R} ry={R} fill="none" stroke="var(--pk-globe)" strokeWidth="0.9" style={{ animationDelay: `${-2 * i}s` }} />)}
      <g clipPath="url(#pk-globe-clip)">
        <g className="pk-land" style={{ transformBox: 'fill-box' }}>
          <rect x={-R} y={-R} width={R * 4} height={1} fill="none" />
          <g transform={`translate(${-R} ${-R})`}>{land}</g>
          <g transform={`translate(${R} ${-R})`}>{land}</g>
        </g>
      </g>
      <line x1={-R - 14} y1={0} x2={R + 14} y2={0} stroke="var(--pk-globe)" strokeWidth="0.6" />
    </svg>
  );
});

const PerspectiveGrid = () => (
  <div className="absolute" style={{ right: '-30%', top: '4%', width: '90%', height: 360, transform: 'perspective(520px) rotateY(-38deg) rotateX(10deg)', transformOrigin: 'right center' }}>
    <svg viewBox="0 0 300 300" preserveAspectRatio="none" className="h-full w-full" aria-hidden>
      {Array.from({ length: 9 }).map((_, i) => <line key={`v${i}`} x1={i * 37.5} y1={0} x2={i * 37.5} y2={300} stroke="var(--pk-grid)" strokeWidth="1.2" />)}
      {Array.from({ length: 9 }).map((_, i) => <line key={`h${i}`} x1={0} y1={i * 37.5} x2={300} y2={i * 37.5} stroke="var(--pk-grid)" strokeWidth="1.2" />)}
    </svg>
  </div>
);

/** 首页英雄区装置（随页面滚动、限定在内容列内）：透视网格 + 线框地球 + 斜贯色带。挂在首页顶部（父级 relative）。 */
export const HomeHeroDecor = memo(() => (
  <div aria-hidden className="pointer-events-none absolute -left-4 -right-4 top-0 h-[420px] overflow-hidden wide:-left-8 wide:-right-8">
    <PerspectiveGrid />
    <WireGlobe className="absolute" style={{ left: -28, top: 18, width: 330, height: 330 }} />
    <div className="absolute" style={{ left: '18%', top: -34, width: '115%', height: 92, background: 'var(--pk-band)', transform: 'rotate(-27deg)', boxShadow: '0 -2px 0 var(--pk-band-edge)' }} />
    <div className="absolute" style={{ left: '22%', top: 78, width: '115%', height: 3, background: 'var(--pk-band)', opacity: 0.55, transform: 'rotate(-27deg)' }} />
  </div>
));

export const PinkStage = memo(({ variant = 'page', ghost, petals = 6 }: { variant?: 'home' | 'page' | 'plain'; ghost?: string; petals?: number }) => (
  <div className="pk-stage" aria-hidden data-pk-stage={variant}>
    <div className="pk-stage-img" />
    <div className="pk-stage-veil" />
    {variant === 'page' && (
      <>
        <div className="absolute" style={{ right: -120, top: -40, width: 340, height: 70, background: 'var(--pk-band)', transform: 'rotate(-27deg)', opacity: 0.9 }} />
        <div className="absolute" style={{ right: -60, top: 46, width: 260, height: 2, background: 'var(--p3r-blue)', transform: 'rotate(-27deg)', opacity: 0.45 }} />
      </>
    )}
    {ghost && (
      <div className="font-cond absolute uppercase leading-[0.8]" style={{ left: -6, bottom: 70, fontSize: 132, color: 'transparent', WebkitTextStroke: '1.5px var(--p3r-ghost)', transform: 'rotate(-90deg)', transformOrigin: 'left bottom', whiteSpace: 'nowrap' }}>{ghost}</div>
    )}
    <Glint style={{ left: '82%', top: '22%' }} />
    <Glint style={{ left: '12%', top: '58%', animationDelay: '-2s' }} />
    <Glint style={{ left: '70%', top: '74%', animationDelay: '-4s', width: 10, height: 10 }} />
    {petals > 0 && <Petals count={petals} />}
  </div>
));
