/**
 * 品牌标题揭示 BrandTitleReveal（真实 src/components/BrandTitleReveal.tsx；红主题版，迁移自 v3 overlays/a.js §12 openBrand）：
 * 眉标「欢迎来到」落位 → MASKARIA 8 字带斜界微旋逐字升起（间隔 55ms）→ 签名侧滑 → 分隔线自左拉出（scaleX）。重播 / 关闭演示。
 */
import { useLayoutEffect, useRef, useState } from 'react';
import type { OverlayProps } from '@/p5r-red/registry/types';
import { P5Layer } from '@/p5r-red/kit/P5Layer';
import { P5Shp } from '@/p5r-red/kit/P5Shp';
import { P5Button } from '@/p5r-red/kit/P5Button';
import { P5BgSVG } from '@/p5r-red/fx/bg';
import { useWide } from '@/p5r-red/lib/layout';
import { isLowMotion } from '@/p5r-red/lib/prefs';

export default function BrandTitleReveal({ open, onClose }: OverlayProps) {
  const wide = useWide();
  const root = useRef<HTMLDivElement>(null);
  const [gen, setGen] = useState(0);
  useLayoutEffect(() => {
    const r = root.current; if (!open || !r || isLowMotion()) return;
    const eb = r.querySelector('.oa-brand-eb')!, cs = r.querySelectorAll('.oa-bc'), sig = r.querySelector('.oa-brand-sig')!, dv = r.querySelector('.oa-brand-div')!;
    eb.animate([{ transform: 'translateY(-8px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 300, fill: 'backwards' });
    cs.forEach((c, i) => c.animate([{ transform: 'translateY(110%) rotate(12deg) scale(.8)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 520, delay: 160 + i * 55, easing: 'cubic-bezier(.2,1.3,.4,1)', fill: 'backwards' }));
    sig.animate([{ transform: 'translateX(30px)', opacity: 0 }, { transform: 'none', opacity: 0.9 }], { duration: 420, delay: 700, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
    dv.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 500, delay: 820, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
  }, [open, gen]);
  return (
    <P5Layer open={open} onClose={onClose} cls="oa-brand" z={880} onBackdrop={() => {}}>
      <div className="oa-stage"><P5BgSVG seed={27} wide={wide} /></div>
      <div className="oa-brand-c" ref={root}>
        <P5Shp className="oa-brand-card" kind="torn" seed={171} tone="paper">
          <div className="oa-brand"><span className="oa-brand-eb">欢迎来到</span><div className="oa-brand-tw"><h1 aria-label="MASKARIA">{[...'MASKARIA'].map((c, i) => <span key={i} className="oa-bc" style={{ ['--i' as string]: i }}>{c}</span>)}</h1><span className="oa-brand-sig">MASKARIA</span></div><i className="oa-brand-div" /></div>
        </P5Shp>
        <div className="oa-row"><P5Button seed={97} onClick={() => setGen((g) => g + 1)}>重播</P5Button><P5Button tone="ink" seed={98} onClick={onClose}>关闭演示</P5Button></div>
        <p className="oa-note">首页品牌标题（中性/自定义主题 Dashboard 首屏头）红主题版：眉标落位 → 8 字带斜界微旋逐字升起 → 签名侧滑 → 分隔线自左拉出；流光 20fps 步进。</p>
      </div>
    </P5Layer>
  );
}
