/* 工作包 4 · 星象假数据（类型来自真实仓库）。日期以「今天」为锚动态生成。 */
import type { DailyDivination, FateGlimpse, LongReading } from '@/types';

const pad = (n: number) => String(n).padStart(2, '0');
export const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const shiftKey = (days: number) => { const d = new Date(); d.setDate(d.getDate() + days); return dayKey(d); };
export const TODAY = dayKey(new Date());
export const WEEKDAY_CN = ['日', '一', '二', '三', '四', '五', '六'];

export const DAILY_TODAY: DailyDivination = {
  id: 'dd-today', date: TODAY, drawnFrom: ['star', 'tower', 'chariot'], pickedIndex: 0, cardId: 'star', orientation: 'upright',
  effect: { attribute: 'charm', multiplier: 1.8 },
  narration: '**星星**落在你最近反复回看的那件事上——你以为它停滞了，其实它只是在雾里慢慢成形。\n\n今天适合把一句迟迟没说出口的感谢说出来；对方等的不是完美的措辞，而是你肯开口。傍晚之前，别急着给自己下结论。',
  advice: '把一件小事做到收尾，比开三个新坑更让你安心。',
  fortune: 'good', source: 'ai', createdAt: new Date(),
};

/** 七日连星：过去 6 天 + 今天（index 6）。drawn=null 表示那天没抽 */
const CARDS7: Array<[string, 'upright' | 'reversed', DailyDivination['fortune'], DailyDivination['effect']['attribute']] | null> = [
  ['magician', 'upright', 'great', 'knowledge'],
  ['moon', 'reversed', 'small', 'kindness'],
  ['strength', 'upright', 'good', 'guts'],
  ['hermit', 'upright', 'small', 'knowledge'],
  ['sun', 'upright', 'great', 'charm'],
  ['wheel_of_fortune', 'reversed', 'bad', 'dexterity'],
  ['star', 'upright', 'good', 'charm'],
];
export const WINDOW_DAYS = CARDS7.map((c, i) => {
  const date = shiftKey(i - 6);
  if (i === 6) return { date, drawn: DAILY_TODAY };
  if (!c) return { date, drawn: null };
  const d: DailyDivination = {
    id: `dd-${i}`, date, drawnFrom: [c[0]], pickedIndex: 0, cardId: c[0], orientation: c[1], fortune: c[2], source: i === 3 ? 'offline' : 'ai',
    effect: { attribute: c[3], multiplier: c[1] === 'upright' ? 1.8 : 1.6 },
    narration: '那天的牌提醒你：别把节奏交给别人定。你在一件小事上坚持了自己的做法，后来证明是对的。\n\n傍晚的雨让计划改了道，但改道之后的风景，反而更合你意。',
    advice: '先做最难的那件，剩下的会顺。', createdAt: new Date(),
  };
  return { date, drawn: d };
});
/** 「七日连星」缺一天的版本（未集齐）：把第 2 天挖空 */
export const WINDOW_DAYS_PARTIAL = WINDOW_DAYS.map((d, i) => (i === 1 ? { ...d, drawn: null } : d));

export const LAST_GLIMPSE: FateGlimpse = {
  id: 'fg-1',
  days: WINDOW_DAYS.filter((d) => d.drawn).map((d) => ({ date: d.date, cardId: d.drawn!.cardId, orientation: d.drawn!.orientation, fortune: d.drawn!.fortune, attribute: d.drawn!.effect.attribute })),
  verdict: '雾散之前，先点亮自己',
  summary: '这七天你从「魔术师」的跃跃欲试出发，在「月亮」逆位里犹豫过一次，又被「力量」拉回原地站稳。「隐者」那天你把自己关起来想清楚了一件事，于是「太阳」照进来——那是这一周最亮的一天。',
  outlook: '接下来三天，「命运之轮」逆位留下的小颠簸还会再晃一下：计划可能被打断一次。别慌，「星星」已经替你守着方向——被打断的那件事，第三天会自己回来找你。',
  advice: '把明天最想逃的那件事排在上午。\n给一个很久没联系的人发一句「最近好吗」。\n睡前写下今天做成的一件小事，哪怕只有一行。',
  source: 'ai', buffStart: TODAY, buffEnd: shiftKey(2), createdAt: new Date(),
};

const reading = (over: Partial<LongReading> & Pick<LongReading, 'id' | 'question' | 'period' | 'picked'>): LongReading => ({
  drawnFrom: [], content: '', followUps: [], archived: false, createdAt: new Date(), expiresAt: shiftKey(14), ...over,
});

export const LONG_READINGS: LongReading[] = [
  reading({
    id: 'lr-1', question: '我最近对工作的方向感到迷茫，接下来该如何取舍？', period: 'midterm',
    picked: [{ cardId: 'hermit', orientation: 'upright' }, { cardId: 'tower', orientation: 'reversed' }, { cardId: 'chariot', orientation: 'upright' }],
    content: '### 现状 · 隐者\n你已经在独自想这件事很久了，提灯照见的不是答案，是你真正在意的那部分。\n\n### 阻碍 · 高塔（逆位）\n你害怕的「推倒重来」其实不会发生；真正拖住你的，是对一次小失误的反复回放。\n\n### 方向 · 战车\n两到四周内，选一条路然后**全速前进**。犹豫的成本已经高过选错的成本。',
    followUps: [{ id: 'fu-1', question: '如果选了更稳的那条，会后悔吗？', drawnFrom: ['temperance', 'devil', 'empress'], cardId: 'temperance', orientation: 'upright', content: '节制说：稳不是退。你会在稳里慢慢调出自己想要的比例——只要别把「稳」当成「不再想」。', createdAt: new Date() }],
    createdAt: new Date(Date.now() - 3 * 86400_000), expiresAt: shiftKey(11),
  }),
  reading({
    id: 'lr-2', question: '这半年的学习计划能坚持下来吗？', period: 'longterm',
    picked: [{ cardId: 'star', orientation: 'upright' }, { cardId: 'empress', orientation: 'upright' }, { cardId: 'hanged_man', orientation: 'reversed' }, { cardId: 'world', orientation: 'upright' }],
    content: '### 底色 · 星星\n这段时期的基调是「希望」：你并不缺动力，缺的是允许自己慢。\n\n### 根基 · 女皇\n你的根基是生活本身——吃好、睡好，计划才长得出来。\n\n### 进程 · 倒吊人（逆位）\n中途会有一段「明明在付出却看不到回报」的平台期，别在那时候换方向。\n\n### 结果 · 世界\n一个阶段的完整收束。',
    createdAt: new Date(Date.now() - 6 * 86400_000), expiresAt: shiftKey(8),
  }),
  reading({
    id: 'lr-3', question: '和室友之间的别扭，这几天会缓和吗？', period: 'recent', archived: true,
    picked: [{ cardId: 'lovers', orientation: 'reversed' }, { cardId: 'justice', orientation: 'upright' }, { cardId: 'sun', orientation: 'upright' }],
    content: '### 昨日 · 恋人（逆位）\n一次小小的选择没商量，就成了别扭的起点。\n\n### 今日 · 正义\n把事情摊开说，按事实而不是情绪。\n\n### 明日 · 太阳\n会缓和，而且比你想得快。',
    createdAt: new Date(Date.now() - 20 * 86400_000), expiresAt: shiftKey(-6),
  }),
];

/** 解读中 / 流式落笔的演示文本 */
export const STREAM_TEXT = '星星落在你最近反复回看的那件事上——你以为它停滞了，其实它只是在雾里慢慢成形。今天适合把一句迟迟没说出口的感谢说出来；对方等的不是完美的措辞，而是你肯开口。';
export const LONG_STREAM_TEXT = '### 现状 · 隐者\n你已经在独自想这件事很久了，提灯照见的不是答案，是你真正在意的那部分。\n\n### 阻碍 · 高塔（逆位）\n你害怕的「推倒重来」其实不会发生；真正拖住你的，是对一次小失误的反复回放。\n\n### 方向 · 战车\n两到四周内，选一条路然后全速前进。';
