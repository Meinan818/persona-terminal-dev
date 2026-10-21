import { defaultStage } from '@/p5r-red/fx/bg';
/** 宣告卡页舞台（v3 pages_a.js callingcard stage：seed 7 + crouch 剪影；卡徽 card_emblem 由页面内 .ccp-emblem 绘制） */
export const callingCardStage = (wide: boolean) => defaultStage(wide, { seed: 7, sil: 'crouch' });
