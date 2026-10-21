import { defaultStage } from '@/p5r-red/fx/bg';
/** 据点舞台（v3 pages/org.p5.js org stage 原值） */
export const hideoutStage = (wide: boolean) => defaultStage(wide, { seed: 47, sil: 'crouch', fx: wide ? 1240 : 760, fy: wide ? 200 : 180, silPos: wide ? 'right:1%;bottom:-3%;height:46vh' : 'right:-40px;bottom:calc(var(--nav-h) + 6px);height:24vh', silOpacity: 0.85 });
