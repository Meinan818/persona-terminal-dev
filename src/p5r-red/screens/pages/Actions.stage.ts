import { defaultStage, type StageSpec } from '@/p5r-red/fx/bg';
import { kitImg } from '@/p5r-red/lib/asset';
/** 行动页舞台：v3 pages/todos.js stage = P5.defaultStage(wide) + 宽屏卡片拼贴 card_collage（left:28px;top:58%;width:170px;rotate(-9deg)）；
 *  记录子页（v3 activities 未写 stage）= 默认舞台。tab 缺省 = todos（同 Actions.p5r.tsx）。 */
export const actionsStage = (wide: boolean, q?: URLSearchParams): StageSpec => {
  const st = defaultStage(wide);
  if (wide && q?.get('tab') !== 'activities') st.imgs = [{ src: kitImg('card_collage'), style: 'left:28px;top:58%;width:170px;transform:rotate(-9deg)' }];
  return st;
};
