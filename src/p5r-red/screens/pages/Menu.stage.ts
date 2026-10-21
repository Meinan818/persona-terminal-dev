import { defaultStage } from '@/p5r-red/fx/bg';
/** 菜单舞台（v3 pages_b.js menu stage 原值） */
export const menuStage = (wide: boolean) => defaultStage(wide, { seed: 21, sil: null, fx: wide ? 700 : 300, fy: wide ? 420 : 520 });
