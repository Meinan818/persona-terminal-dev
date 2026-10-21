import { defaultStage } from '@/p5r-red/fx/bg';
/** 重置密码独立页舞台（无底栏；对位登录弹层 oa-stage seed 64） */
export const resetPasswordStage = (wide: boolean) => defaultStage(wide, { seed: 64, sil: 'point' });
