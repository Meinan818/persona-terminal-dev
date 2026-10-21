import { defaultStage } from '@/p5r-red/fx/bg';
/** 星象页舞台（v3 pages_a.js astro stage 原值） */
export const astrologyStage = (wide: boolean) => defaultStage(wide, { seed: 17, sil: null, fx: wide ? 800 : 500, fy: 460 });
