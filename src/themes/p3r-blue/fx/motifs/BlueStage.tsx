/**
 * BlueStage —— 蓝专属舞台层（= 真实 P3RPage 的「P3R.bg + p3-water-wide.png(opacity .3) + veil」水面底 + 母题层）。
 *   variant='page'：冷白水面 + 步进焦散 + 右上斜切蓝白条带一角 + 少量上浮气泡
 *   variant='home'：同上（不画角带），由首页自行挂 <BlueHeroDecor/>（满月 + 塔剪影 + 斜带）
 *   variant='plain'：只有底 + 焦散（开屏 / 全屏演出宿主）
 *   ghost：左缘竖排描边巨字（MIDNIGHT / ACTION…）
 *   img：水面素材 url（fork 时传 import 进来的 p3-water-wide.png；不传则只有冷白底 + 焦散）
 * 夜间（.dark）自动：底 = 影时间深蓝，焦散 / 气泡 = 影时间绿（全走变量），水面图走 --p3nav-water-filter 压暗；可选 darkhour 叠绿光晕水洼。
 * 性能：静态层 + transform/opacity 步进动画；无 backdrop-filter / 大面积 blur。低动效：焦散定格、气泡隐藏。
 * 外壳挂一次（AppShell），页面不要重复挂；fixed=false 时改为 absolute 铺满父级（预览 / 卡片内）。
 */
import { memo, type CSSProperties } from 'react';
import { Caustics, Bubbles } from './Water';
import { SlashBands } from './Bands';
import { FullMoon } from './Moon';
import { TartarusSilhouette } from './Tartarus';
import { DarkHourGlow } from './DarkHour';
import waterWide from '@blue/assets/blue/p3-water-wide.png';

export interface BlueStageProps {
  variant?: 'home' | 'page' | 'plain';
  ghost?: string;
  bubbles?: number;
  caustics?: boolean;
  img?: string;
  darkhour?: boolean;
  fixed?: boolean;
  style?: CSSProperties;
}

export const BlueStage = memo(({ variant = 'page', ghost, bubbles = 6, caustics = true, img = waterWide, darkhour = false, fixed = true, style }: BlueStageProps) => (
  <div aria-hidden data-bk-stage={variant}
    style={{ position: fixed ? 'fixed' : 'absolute', inset: 0, zIndex: 0, background: 'var(--p3r-bg)', overflow: 'hidden', pointerEvents: 'none', ...style }}>
    {img && <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${img})`, backgroundSize: 'cover', backgroundPosition: 'center top', opacity: 'var(--bk-stage-img-opacity)' as unknown as number, filter: 'var(--p3nav-water-filter)' }} />}
    {/* 上浅下深：水面往下沉 */}
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 0%, rgb(var(--p3r-wash) / 0.55) 70%, rgb(var(--p3r-wash) / 0.85) 100%)' }} />
    {caustics && <Caustics opacity={0.42} fps={3} scale={1.2} style={{ maskImage: 'linear-gradient(180deg, var(--p3r-cream) 0%, transparent 75%)', WebkitMaskImage: 'linear-gradient(180deg, var(--p3r-cream) 0%, transparent 75%)' }} />}
    <div style={{ position: 'absolute', inset: 0, background: 'var(--p3r-veil-grad)', opacity: 0.6 }} />
    {variant === 'page' && <SlashBands variant="corner" glint={false} />}
    {darkhour && <DarkHourGlow pools={3} moon={false} grain />}
    {ghost && (
      <div style={{ position: 'absolute', left: -6, bottom: 70, fontFamily: 'var(--p3r-font-cond)', fontStyle: 'italic', fontWeight: 800, fontSize: 132, lineHeight: 0.8, textTransform: 'uppercase', color: 'transparent', WebkitTextStroke: '1.5px var(--p3r-ghost)', transform: 'rotate(-90deg)', transformOrigin: 'left bottom', whiteSpace: 'nowrap' }}>{ghost}</div>
    )}
    {bubbles > 0 && <Bubbles count={bubbles} />}
  </div>
));

/**
 * 首页英雄区装置（随页面滚动，限定在内容列内；父级 relative）：
 * 斜切蓝白条带 + 塔尔塔罗斯剪影（右）+ 满月（左上，无窗框）+ 焦散。对位：首页原来的「网格 + 地球 + 斜带」装置。
 */
export const BlueHeroDecor = memo(({ height = 420, style }: { height?: number; style?: CSSProperties }) => (
  <div aria-hidden style={{ position: 'absolute', left: -16, right: -16, top: 0, height, overflow: 'hidden', pointerEvents: 'none', ...style }}>
    <FullMoon size={168} frame={false} rays={false} style={{ position: 'absolute', right: -34, top: 44, opacity: 0.95 }} />
    <TartarusSilhouette style={{ position: 'absolute', right: 4, bottom: 0, width: 110, height: height * 0.62, opacity: 0.5 }} />
    <SlashBands variant="hero" style={{ top: '34%' }} />
  </div>
));
