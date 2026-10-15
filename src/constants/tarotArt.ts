import type { UIChannel } from '@/ui/channel';
import type { ThemeType } from '@/types';

/**
 * 塔罗牌面美术 —— 四套各 22 张大阿卡纳（用户提供的 PNG 原稿经压缩后存
 * public/tarot/{p3,p4,p5,pink}/<cardId>.webp，560×896）。
 * 粉那套是 2026-10-16 用户提供的新私人素材（约 1.6 MB / 22 张），只给粉主题用。
 *
 * 归位口径：按牌名（slug）而不是编号——P5 那套走 Thoth 序（VIII=Justice / XI=Strength），
 * 与 P3/P4 的 Rider-Waite 序正好对调，按编号会整套错位。牌面上印的罗马数字因此可能
 * 与 app 内 card.roman 不一致，这是原稿的编号体系差异，未做改动。
 * （粉那套经抽查走 Rider-Waite 序：justice 印 XI，与 P3/P4 同体系。）
 *
 * 小阿卡纳没有配图，返回 null → TarotCardSVG 退回原来的程序化卡面。
 * WebP 不在 PWA 预缓存的 globPatterns 里（见 vite.config.ts），首次访问后由 runtimeCaching 收编，
 * 不会把安装包撑大；加载失败时组件同样退回程序化卡面。
 */
const MAJOR_WITH_ART = new Set([
  'fool', 'magician', 'high_priestess', 'empress', 'emperor', 'hierophant',
  'lovers', 'chariot', 'strength', 'hermit', 'wheel_of_fortune', 'justice',
  'hanged_man', 'death', 'temperance', 'devil', 'tower', 'star',
  'moon', 'sun', 'judgement', 'world',
]);

export type TarotArtSet = 'p3' | 'p4' | 'p5' | 'pink';

/**
 * 自定义主题可挑的套。粉那套是粉主题的专属卡面，不对外开选项——
 * 自定义主题仍在蓝/黄/红三套里挑（对应 Settings 页的三色按钮）。
 */
export type CustomTarotSet = 'p3' | 'p4' | 'p5';

/**
 * 频道 + 主题 → 卡面套。
 *
 * 蓝/黄/红三个频道的卡面是频道视觉的一部分，钉死不可选；只有 neutral（自定义主题）
 * 本来就没有自己的一套牌——原先它无条件借 p3 那套水下卡，现在改由用户挑
 * （settings.customTarotSet，缺省仍是 p3，老档案观感不变）。
 *
 * 粉主题必须认 **theme 而不是 channel**：粉在频道层是 P3 的换色皮
 * （ui/channel.ts 把 blue/pink 都映射成 'p3'），只看 channel 会把粉主题
 * 和蓝主题判成同一套、换出蓝那套水下卡。同类坑见 utils/iconSync.ts。
 */
export const tarotSetOf = (
  channel: UIChannel,
  custom?: CustomTarotSet,
  theme?: ThemeType | null,
): TarotArtSet =>
  theme === 'pink' ? 'pink'
    : channel === 'p4' ? 'p4'
      : channel === 'p5' ? 'p5'
        : channel === 'p3' ? 'p3'
          : (custom ?? 'p3');

export const tarotArtUrl = (cardId: string, set: TarotArtSet): string | null =>
  MAJOR_WITH_ART.has(cardId) ? `${import.meta.env.BASE_URL}tarot/${set}/${cardId}.webp` : null;
