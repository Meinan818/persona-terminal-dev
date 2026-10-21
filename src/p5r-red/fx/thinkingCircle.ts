/**
 * 思索环 ThinkingCircle —— 字符串版（给 pkg3 / pkg4 的 v3 命令式屏用）。
 * 与 React 版 ThinkingCircleP5（src/screens/overlays/ThinkingCircle.p5r.tsx，pkg1）输出同一份 DOM（.od-think，样式在 legacy/css/d.css），
 * 视觉 / 低动效行为完全一致；改结构时两处一起改。真实：src/components/astrology/ThinkingCircle.tsx。
 */
import { shape } from '@/p5r-red/lib/shape';

export const thinkingCircleHTML = (label = '推演中', sub = ''): string =>
  `<div class="od-think" role="status" aria-live="polite"><span class="od-think-c" aria-hidden="true"><svg viewBox="0 0 100 100"><polygon points="${shape.starPts(50, 52, 46)}" fill="none" stroke="var(--red)" stroke-width="3"/><polygon points="${shape.starPts(50, 52, 30, -54)}" fill="var(--ink)"/></svg><i></i><i></i><i></i></span><b>${label}<span class="od-dots"><i>.</i><i>.</i><i>.</i></span></b>${sub ? `<small>${sub}</small>` : ''}</div>`;
