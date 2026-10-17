import type { SeasonMark, SolarTermName } from '@/utils/calendar';
import type { TarotArtSet } from './tarotArt';

/** 岁时卡按名字归图；不依赖年份、日期或原画的罗马数字。 */
const TERM_ART: Record<SolarTermName, string> = {
  小寒: 'xiaohan', 大寒: 'dahan', 立春: 'lichun', 雨水: 'yushui', 惊蛰: 'jingzhe', 春分: 'chunfen',
  清明: 'qingming', 谷雨: 'guyu', 立夏: 'lixia', 小满: 'xiaoman', 芒种: 'mangzhong', 夏至: 'xiazhi',
  小暑: 'xiaoshu', 大暑: 'dashu', 立秋: 'liqiu', 处暑: 'chushu', 白露: 'bailu', 秋分: 'qiufen',
  寒露: 'hanlu', 霜降: 'shuangjiang', 立冬: 'lidong', 小雪: 'xiaoxue', 大雪: 'daxue', 冬至: 'dongzhi',
};

const FESTIVAL_ART: Record<string, string> = {
  元旦: 'yuandan', 情人节: 'qingrenjie', 妇女节: 'funvjie', 劳动节: 'laodongjie', 青年节: 'qingnianjie',
  儿童节: 'ertongjie', 教师节: 'jiaoshijie', 国庆节: 'guoqingjie', 万圣夜: 'wanshengye', 双十一: 'shuangshiyi',
  平安夜: 'pinganye', 圣诞节: 'shengdanjie', 跨年夜: 'kuanianye', 除夕: 'chuxi', 春节: 'chunjie',
  元宵: 'yuanxiao', 端午: 'duanwu', 七夕: 'qixi', 中秋: 'zhongqiu', 重阳: 'chongyang',
};

/** 四主题各 24 节气 + 20 节日，独立于塔罗牌目录；未知卡保留程序化兜底。 */
export function seasonArtUrl(mark: Pick<SeasonMark, 'kind' | 'name'>, set: TarotArtSet): string | null {
  const slug = mark.kind === 'term'
    ? TERM_ART[mark.name as SolarTermName]
    : FESTIVAL_ART[mark.name];
  if (!Object.prototype.hasOwnProperty.call(mark.kind === 'term' ? TERM_ART : FESTIVAL_ART, mark.name)) return null;
  return `${import.meta.env.BASE_URL}season/${set}/${mark.kind === 'festival' ? 'festival_' : ''}${slug}.webp`;
}
