import { defaultStage } from '@/p5r-red/fx/bg';
/** 首页舞台（原 v3 home.js stage）：宽屏 point 剪影贴侧栏；竖屏无剪影。 */
export const dashboardStage = (wide: boolean) => defaultStage(wide, wide
  ? { seed: 5, sil: 'point', silPos: 'left:calc(var(--side-w) - 10px);bottom:0;height:38vh', fx: 980, fy: 300 }
  : { seed: 5, sil: null, fx: 720, fy: 260 });
