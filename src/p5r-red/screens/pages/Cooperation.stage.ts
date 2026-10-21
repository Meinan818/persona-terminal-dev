import { defaultStage } from '@/p5r-red/fx/bg';
/** 羁绊舞台（v3 pages_a.js coop stage 原值） */
export const cooperationStage = (wide: boolean) => defaultStage(wide, { seed: 11, sil: 'point', fx: wide ? 800 : 500, fy: 420 });
