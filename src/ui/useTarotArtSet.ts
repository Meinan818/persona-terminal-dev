/**
 * useTarotArtSet —— 当前该用哪一套塔罗卡面（'p3' 蓝 / 'p4' 黄 / 'p5' 红 / 'pink' 粉）。
 *
 * 频道决定一切，除了两处例外：
 *   · neutral（自定义主题）没有自己的一套牌，读 settings.customTarotSet；
 *   · pink 在频道层就是 p3（ui/channel.ts），必须再读 user.theme 才分得开——
 *     只看频道会让粉主题继续显示蓝那套水下卡（同类坑见 utils/iconSync.ts）。
 * 口径收在这一个 hook 里，是因为「卡面」不止一处在画——大阿卡纳走实拍图，
 * 小阿卡纳走程序化卡面（P4Face/P5Face），两条路必须同时跟着选择走，
 * 否则同一副牌里 22 张红、56 张蓝。
 */
import { useAppStore } from '@/store';
import { useUiChannel } from './useUiChannel';
import { tarotSetOf, type TarotArtSet } from '@/constants/tarotArt';

export const useTarotArtSet = (): TarotArtSet => {
  const channel = useUiChannel();
  const theme = useAppStore(s => s.user?.theme);
  const custom = useAppStore(s => s.settings.customTarotSet);
  return tarotSetOf(channel, custom, theme);
};
