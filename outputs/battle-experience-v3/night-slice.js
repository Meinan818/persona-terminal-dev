/**
 * 单层 AI 切片 · 纯规则
 *
 * 一条白昼记录 → 一晚 3–5 个房间 → 绕行 / 硬刚 / 自由输入交涉 → 回到白昼。
 * AI 只写文本、人格与危险档位；HP/SP、成功率、奖励和随机数都由这里决定。
 */

import { ITEM_DEFS } from './economy-rules.js';
import { PERSONALITIES } from './negotiation-rules.js';

export const SLICE_LIMITS = Object.freeze({
  record: 120,
  minRooms: 3,
  maxRooms: 5,
  time: 6,
  bribeCost: 20,
});

export const ROOM_KINDS = ['guard', 'shadow', 'event', 'exit'];
export const DANGER_TIERS = ['low', 'mid', 'high'];
export const TONES = ['threaten', 'flatter', 'reason', 'bribe'];
export const SLICE_ITEM_IDS = [
  'painkiller',
  'sportsDrink',
  'energyDrink',
  'echoShard',
  'wanderShard',
  'psyShard',
  'enhanceStone',
];

const PERSONALITY_IDS = Object.keys(PERSONALITIES);
const TONE_LABELS = {
  threaten: '威胁',
  flatter: '讨好',
  reason: '讲理',
  bribe: '给 SP',
};

const THEMES = {
  work: {
    theme: '加班的楼层',
    mood: '紧绷',
    guardTitle: '亮着的工位',
    guardLine: '整层楼只有一盏灯亮着。屏幕上的光标还在闪，像在等你补上一句解释。',
    shadowName: '没做完的表格',
    shadowOpening: '你白天没关掉我。现在，轮到我把你留在这里。',
    demand: '说清楚，你为什么要走。',
    eventLine: '打印机在没有人的房间里吐出最后一页，上面只有你的名字。',
    exitLine: '走廊尽头有一扇门，门缝里透进早上的白光。',
    memory: '你把那件没做完的事带进夜里，看见它真正占了多少位置。',
    items: ['sportsDrink', 'echoShard'],
  },
  study: {
    theme: '未交的答卷',
    mood: '发闷',
    guardTitle: '翻页的声音',
    guardLine: '书页自己翻过去，停在你最不想看的那一段。',
    shadowName: '背不下来的名字',
    shadowOpening: '你把我留到最后一刻。现在，我也把你留到最后。',
    demand: '告诉我，你真正怕的是什么。',
    eventLine: '黑板上浮出一行字，写完就擦掉了。',
    exitLine: '教室后门开着，外面是还没有亮透的操场。',
    memory: '你带着那页没背完的内容走了一夜，发现它没有那么重。',
    items: ['energyDrink', 'psyShard'],
  },
  relation: {
    theme: '没回的消息',
    mood: '发酸',
    guardTitle: '亮起的屏幕',
    guardLine: '对话框停在“对方正在输入”，一直没有下文。',
    shadowName: '没发出去的那句',
    shadowOpening: '你删掉了我三次。可我还在这里。',
    demand: '你想让我变成什么语气？',
    eventLine: '墙后传来一声很轻的提示音，像有人把话又咽了回去。',
    exitLine: '门后是清晨的街口，手机安静地躺在口袋里。',
    memory: '你没有替那句话说谎。它还在，但不再替你发声。',
    items: ['painkiller', 'wanderShard'],
  },
  self: {
    theme: '拖延的房间',
    mood: '疲惫',
    guardTitle: '没有关掉的屏幕',
    guardLine: '你明明想睡，手却还在往下滑。时间从指缝里漏过去。',
    shadowName: '再刷五分钟',
    shadowOpening: '别急。再看一条，我们就睡。你每次都这么说。',
    demand: '给我一个现在停下来的理由。',
    eventLine: '窗帘缝里透进一点灰蓝，像天快亮了。',
    exitLine: '床就在门后。你只要走过去。',
    memory: '你承认了自己不是不想睡，只是不想结束这一天。',
    items: ['energyDrink', 'enhanceStone'],
  },
  money: {
    theme: '账单的走廊',
    mood: '发紧',
    guardTitle: '贴在门上的数字',
    guardLine: '每一项都不大，加起来却像一堵墙。',
    shadowName: '月底的影子',
    shadowOpening: '你算过我很多次。每次都算到一半就停。',
    demand: '你打算先处理哪一笔？',
    eventLine: '自动贩卖机亮着，投币口里卡着一枚旧硬币。',
    exitLine: '走廊尽头是 ATM 的蓝光，天亮之前不会有新的账单。',
    memory: '你把数字看清了一遍，它没有变小，但不再是一团雾。',
    items: ['painkiller', 'echoShard'],
  },
  default: {
    theme: '未命名的楼层',
    mood: '安静',
    guardTitle: '挡在楼梯口的影子',
    guardLine: '它没有脸，却像是从你今天那句话里长出来的。',
    shadowName: '白天的回声',
    shadowOpening: '你把我带进来了。那就别假装没看见。',
    demand: '你想怎么处理这件事？',
    eventLine: '墙后传来一阵很轻的响动，像有人在整理今天剩下的东西。',
    exitLine: '楼梯尽头有一扇门，门后是还没开始的白昼。',
    memory: '你没有把它解决掉，但你知道了它为什么在这里。',
    items: ['sportsDrink', 'echoShard'],
  },
  blank: {
    theme: '空白的一天',
    mood: '安静',
    guardTitle: '没有声音的走廊',
    guardLine: '今天没有留下什么。走廊还是亮着，像在等一句没写下来的话。',
    shadowName: '沉默的回声',
    shadowOpening: '你今天没写我。我还是来了。',
    demand: '那就说说，今天为什么什么都没留下？',
    eventLine: '墙后没有声音。你停下来听了听，只听见自己的呼吸。',
    exitLine: '门开着。外面是明天，还没有被写下。',
    memory: '今天没有记录，但你还是走完了一层。空白也是一种回答。',
    items: ['painkiller', 'echoShard'],
  },
};

const KEYWORDS = {
  work: ['工作', '加班', '报告', '老板', '同事', '会议', '开会', '项目', '方案', '汇报', '客户', '上班', '工位', '邮件'],
  study: ['考试', '复习', '论文', '作业', '课', '老师', '学校', '背', '作业', '答辩'],
  relation: ['他', '她', '朋友', '家人', '妈', '爸', '喜欢', '吵架', '消息', '回', '关系', '分手'],
  self: ['累', '睡', '熬夜', '拖延', '手机', '健身', '早起', '懒', '刷', '游戏'],
  money: ['钱', '花', '买', '账单', '工资', '房租', '贵', '预算', '还'],
};

function hashString(value) {
  let hash = 2166136261;
  const text = String(value ?? '');
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const cleanText = (value, max) => (
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : ''
);

export function cleanRecord(value) {
  return cleanText(value, SLICE_LIMITS.record);
}

export function recordSnippet(value, max = 18) {
  const record = cleanRecord(value);
  if (!record) return '今天';
  return record.length > max ? `${record.slice(0, max)}…` : record;
}

export function themeKeyFor(record) {
  const text = cleanRecord(record);
  let best = 'default';
  let bestScore = 0;
  for (const [key, words] of Object.entries(KEYWORDS)) {
    const score = words.reduce((sum, word) => sum + (text.includes(word) ? 1 : 0), 0);
    if (score > bestScore) {
      best = key;
      bestScore = score;
    }
  }
  return best;
}

function itemLabel(id) {
  return ITEM_DEFS[id]?.name ?? '回声碎片';
}

function rewardFor(danger, itemId, seed) {
  const random = seededRandom(seed);
  const base = { low: 90, mid: 150, high: 230 }[danger] ?? 150;
  return {
    money: base + Math.round(random() * 50),
    itemId,
    label: itemLabel(itemId),
  };
}

const TOWER_THEMES = [
  {
    theme: '月台', mood: '发凉',
    guardTitle: '检票口守卫', guardLine: '灯管一闪一闪，广播没有报站。末班车早就过去了。',
    shadowName: '候车的影子', shadowOpening: '你错过的那班车，不会因为你站着就回来。', demand: '说一个你还留在这里的理由。',
    eventLine: '广播里传来一段听不清的报站，随后又安静了。',
    exitLine: '末班车门开了。外面是白昼。', memory: '你在月台停了一会儿，没有错过最后一班车。',
    items: ['sportsDrink', 'echoShard'],
  },
  {
    theme: '档案室', mood: '发闷',
    guardTitle: '档案室看守', guardLine: '抽屉全被拉开，名字被撕掉，只剩下编号。',
    shadowName: '被撕掉的名字', shadowOpening: '你来找谁？这里只剩下编号。', demand: '给我一个值得被记住的名字。',
    eventLine: '纸页自己翻过去，停在一页空白上。',
    exitLine: '档案后门通向楼梯，楼梯通向白昼。', memory: '你没有把名字交出去，但它也没有再问你。',
    items: ['psyShard', 'energyDrink'],
  },
  {
    theme: '温室', mood: '潮湿',
    guardTitle: '园丁的影子', guardLine: '枯叶下面还有呼吸。藤蔓慢慢收紧。',
    shadowName: '花丛里的眼睛', shadowOpening: '你踩到了我。别装作没看见。', demand: '你打算怎么赔？',
    eventLine: '滴水声停了。有什么东西从叶子里抬头。',
    exitLine: '温室后门开着，外面是冷的白昼。', memory: '你从温室里带出了一点土，鞋底一直没干净。',
    items: ['painkiller', 'windShard'],
  },
  {
    theme: '剧场', mood: '发亮',
    guardTitle: '舞台看守', guardLine: '幕布后面有人替你鼓掌，座位却是空的。',
    shadowName: '候场的影子', shadowOpening: '轮到你了。台下没有人，但戏得演完。', demand: '你准备演给谁看？',
    eventLine: '空座席传来一声很轻的笑。',
    exitLine: '侧幕出口亮着，白昼在幕布后面。', memory: '你演完了一段没有观众的戏，反而轻松了一点。',
    items: ['sportsDrink', 'wanderShard'],
  },
  {
    theme: '镜厅', mood: '发冷',
    guardTitle: '镜面守卫', guardLine: '每一面镜子里的你都慢半拍。',
    shadowName: '镜中的你', shadowOpening: '你走得比我快。可你知道要去哪吗？', demand: '告诉我，哪个才是你。',
    eventLine: '镜子里的耳语比你的呼吸慢一拍。',
    exitLine: '镜厅尽头有一扇门，门后没有倒影。', memory: '你没有回答镜子，但它先把路让开了。',
    items: ['psyShard', 'echoShard'],
  },
  {
    theme: '钟楼', mood: '发紧',
    guardTitle: '钟摆守卫', guardLine: '钟摆停在你进来的那一刻。齿轮还在咬。',
    shadowName: '报时的影子', shadowOpening: '你迟到了。或者，是时间先走了。', demand: '你打算拿什么换回这一分钟？',
    eventLine: '钟声余响从墙里传出来，又退回去。',
    exitLine: '钟楼顶门开着，风里有一点白昼的味道。', memory: '你没有把时间要回来，但你不再盯着钟看。',
    items: ['energyDrink', 'enhanceStone'],
  },
];

function buildFloorSpec(base, { seed, source = '', origin = 'record', memory }) {
  const random = seededRandom(seed);
  const snippet = recordSnippet(source);
  const personality = PERSONALITY_IDS[Math.floor(random() * PERSONALITY_IDS.length)] ?? 'calm';
  const itemA = base.items[Math.floor(random() * base.items.length)] ?? 'echoShard';
  const itemB = base.items[(base.items.indexOf(itemA) + 1) % base.items.length] ?? 'echoShard';
  const roomCount = 3 + Math.floor(random() * 3);
  const lead = source ? `「${snippet}」还挂在你身上。` : '';

  const rooms = [
    {
      id: 'r1',
      kind: 'guard',
      title: base.guardTitle,
      line: `${lead}${base.guardLine}`,
      danger: 'mid',
      reward: rewardFor('mid', itemA, seed + 11),
    },
    {
      id: 'r2',
      kind: 'shadow',
      title: base.shadowName,
      line: '它没有先动手。它只是站在那里，等你先开口。',
      danger: 'mid',
      shadow: {
        name: base.shadowName,
        personality,
        opening: base.shadowOpening,
        demand: base.demand,
      },
      reward: rewardFor('mid', itemB, seed + 23),
    },
    {
      id: 'r3',
      kind: 'event',
      title: '墙后的声音',
      line: base.eventLine,
      danger: 'low',
      reward: rewardFor('low', itemA, seed + 37),
    },
    {
      id: 'r4',
      kind: 'guard',
      title: '第二道门',
      line: '门把手是冷的。握住它时，你听见自己白天的语气从门后传来。',
      danger: 'high',
      reward: rewardFor('high', itemB, seed + 41),
    },
    {
      id: 'r5',
      kind: 'exit',
      title: '白昼的门',
      line: base.exitLine,
      danger: 'low',
    },
  ].slice(0, roomCount);

  // 无论抽到几间房，最后一间必须是出口，并保证有守卫与影子。
  const last = rooms[rooms.length - 1];
  if (last) {
    last.kind = 'exit';
    last.title = '白昼的门';
    last.line = base.exitLine;
    last.danger = 'low';
    delete last.shadow;
    delete last.reward;
  }
  if (!rooms.some(room => room.kind === 'guard')) {
    rooms.splice(Math.max(0, rooms.length - 1), 0, {
      id: 'r1b',
      kind: 'guard',
      title: base.guardTitle,
      line: base.guardLine,
      danger: 'mid',
      reward: rewardFor('mid', itemA, seed + 53),
    });
  }
  if (!rooms.some(room => room.kind === 'shadow')) {
    rooms.splice(Math.max(0, rooms.length - 1), 0, {
      id: 'r2b',
      kind: 'shadow',
      title: base.shadowName,
      line: '它没有先动手。它只是站在那里，等你先开口。',
      danger: 'mid',
      shadow: {
        name: base.shadowName,
        personality,
        opening: base.shadowOpening,
        demand: base.demand,
      },
      reward: rewardFor('mid', itemB, seed + 61),
    });
  }

  return {
    mode: 'offline',
    origin,
    title: base.theme,
    source,
    theme: base.theme,
    mood: base.mood,
    memory,
    exitLine: base.exitLine,
    rooms: rooms.slice(0, SLICE_LIMITS.maxRooms).map((room, index) => ({
      ...room,
      id: room.id || `r${index + 1}`,
    })),
  };
}

/**
 * 记录模式：一层从白天的某件事里长出来。
 * 同一个「记录 + 日期」得到同一晚，便于复现和测试。
 */
export function offlineFloorSpec(record, options = {}) {
  const source = cleanRecord(record);
  const blank = !source;
  const key = blank ? 'blank' : themeKeyFor(source);
  const base = THEMES[key] ?? THEMES.default;
  const seed = hashString(`${source}|${options.seed ?? options.date ?? ''}`);
  return buildFloorSpec(base, {
    seed,
    source,
    origin: 'record',
    memory: blank ? base.memory : `${base.memory}「${recordSnippet(source)}」`,
  });
}

/**
 * 塔自己的夜层：默认入口。不读取白天的记录，怪物与房间都用塔的命名。
 */
export function towerFloorSpec(options = {}) {
  const seed = hashString(`tower|${options.seed ?? options.date ?? ''}`);
  const random = seededRandom(seed);
  const base = TOWER_THEMES[Math.floor(random() * TOWER_THEMES.length)] ?? TOWER_THEMES[0];
  return buildFloorSpec(base, {
    seed,
    source: '',
    origin: 'tower',
    memory: base.memory,
  });
}

function normalizeReward(raw, fallback) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const itemId = SLICE_ITEM_IDS.includes(source.itemId) ? source.itemId : fallback?.itemId;
  const money = clamp(Math.round(Number(source.money)), 0, 400);
  return {
    money: Number.isFinite(money) && source.money !== undefined ? money : (fallback?.money ?? 120),
    itemId: itemId ?? 'echoShard',
    label: itemLabel(itemId ?? 'echoShard'),
  };
}

function leaksSource(name, record) {
  const text = cleanRecord(record);
  if (!text || !name) return false;
  if (text.length < 4) return name.includes(text);
  for (let index = 0; index + 4 <= text.length; index += 1) {
    if (name.includes(text.slice(index, index + 4))) return true;
  }
  return false;
}

function normalizeShadow(raw, fallback, record) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const requestedName = cleanText(source.name, 24);
  return {
    name: requestedName && !leaksSource(requestedName, record)
      ? requestedName
      : (fallback?.name || '白天的回声'),
    personality: PERSONALITY_IDS.includes(source.personality)
      ? source.personality
      : (fallback?.personality ?? 'calm'),
    opening: cleanText(source.opening, 80) || fallback?.opening || '你终于停下来了。',
    demand: cleanText(source.demand, 50) || fallback?.demand || '你想怎么处理这件事？',
  };
}

/**
 * 严格收口模型输出：种类、数量、危险档位、奖励都在白名单内。
 * 缺什么补什么，坏 JSON 不会把夜层带崩。
 */
export function normalizeFloorSpec(raw, input = {}) {
  const fallback = input.mode === 'tower'
    ? towerFloorSpec(input)
    : offlineFloorSpec(input.record, input);
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.rooms)) {
    return { ...fallback, mode: raw?.mode === 'preview' ? 'preview' : 'offline' };
  }
  const sourceRooms = raw.rooms.filter(room => room && typeof room === 'object').slice(0, SLICE_LIMITS.maxRooms);
  if (sourceRooms.length < SLICE_LIMITS.minRooms) return { ...fallback, mode: 'offline' };

  const rooms = sourceRooms.map((room, index) => {
    const kind = ROOM_KINDS.includes(room.kind) ? room.kind : 'event';
    const base = fallback.rooms[index] ?? fallback.rooms[fallback.rooms.length - 1];
    const danger = DANGER_TIERS.includes(room.danger) ? room.danger : (base?.danger ?? 'mid');
    const normalized = {
      id: cleanText(room.id, 24) || `r${index + 1}`,
      kind,
      title: cleanText(room.title, 28) || base?.title || `第 ${index + 1} 间房`,
      line: cleanText(room.line, 110) || base?.line || '',
      danger,
    };
    if (kind === 'shadow') normalized.shadow = normalizeShadow(room.shadow, base?.shadow, input.record);
    if (kind !== 'exit') normalized.reward = normalizeReward(room.reward, base?.reward);
    return normalized;
  });

  const exitRoom = rooms[rooms.length - 1];
  if (exitRoom) {
    exitRoom.kind = 'exit';
    exitRoom.title = cleanText(raw.exitTitle, 28) || exitRoom.title || '白昼的门';
    exitRoom.line = cleanText(raw.exitLine, 110) || exitRoom.line || fallback.exitLine;
    delete exitRoom.reward;
    delete exitRoom.shadow;
  }
  if (!rooms.some(room => room.kind === 'guard')) {
    rooms.splice(Math.max(0, rooms.length - 1), 0, {
      ...fallback.rooms.find(room => room.kind === 'guard'),
      id: `guard-${rooms.length + 1}`,
    });
  }
  if (!rooms.some(room => room.kind === 'shadow')) {
    rooms.splice(Math.max(0, rooms.length - 1), 0, {
      ...fallback.rooms.find(room => room.kind === 'shadow'),
      id: `shadow-${rooms.length + 1}`,
    });
  }

  return {
    mode: raw.mode === 'preview' ? 'preview' : 'ai',
    origin: input.mode === 'tower' ? 'tower' : 'record',
    title: cleanText(raw.title, 32) || fallback.title,
    source: cleanText(raw.source, 60) || fallback.source,
    theme: cleanText(raw.theme, 20) || fallback.theme,
    mood: cleanText(raw.mood, 12) || fallback.mood,
    memory: cleanText(raw.memory, 90) || fallback.memory,
    exitLine: cleanText(raw.exitLine, 110) || fallback.exitLine,
    rooms: rooms.slice(0, SLICE_LIMITS.maxRooms),
  };
}

export function dangerCost(danger) {
  if (danger === 'high') return { hp: 16, sp: 8, alert: 16 };
  if (danger === 'low') return { hp: 5, sp: 2, alert: 6 };
  return { hp: 10, sp: 5, alert: 10 };
}

export function createSliceRun(spec, vitals = {}) {
  const maxHp = Number(vitals.maxHp) || 52;
  const maxSp = Number(vitals.maxSp) || 34;
  const hp = clamp(Math.round(Number(vitals.hp) || maxHp), 1, maxHp);
  const sp = clamp(Math.round(Number(vitals.sp) || maxSp), 0, maxSp);
  return {
    spec,
    index: 0,
    time: SLICE_LIMITS.time,
    alert: 0,
    hp,
    sp,
    maxHp,
    maxSp,
    loot: [],
    grants: [],
    money: 0,
    memories: [],
    log: [],
    defeated: 0,
    talked: 0,
    reason: null,
    finished: false,
  };
}

export function currentRoom(run) {
  if (!run || run.finished) return null;
  return run.spec.rooms[run.index] ?? null;
}

export function advanceRoom(run, note = '') {
  if (!run || run.finished) return false;
  if (note) run.log.push(note);
  run.index += 1;
  if (run.index >= run.spec.rooms.length) {
    run.index = run.spec.rooms.length - 1;
    run.finished = true;
    run.reason = run.reason || 'complete';
  }
  return true;
}

export function retireRun(run, reason = 'timeout') {
  if (!run) return false;
  run.finished = true;
  run.reason = reason;
  return true;
}

export function sneakRoom(run) {
  const room = currentRoom(run);
  if (!room) return { ok: false, reason: '现在没有可以绕开的东西。' };
  if (room.kind === 'exit') return { ok: false, reason: '出口不需要绕。' };
  if (run.time < 1) return { ok: false, reason: '夜色已经用完了，只能退回白昼。' };
  const cost = dangerCost(room.danger);
  run.time -= 1;
  run.alert = clamp(run.alert + Math.round(cost.alert * 0.8), 0, 100);
  run.log.push(`绕开「${room.title}」 · 夜色 -1 · 警戒 +${Math.round(cost.alert * 0.8)}`);
  advanceRoom(run, '');
  if (run.time <= 0 && !run.finished) retireRun(run, 'timeout');
  return { ok: true, room, alert: run.alert, time: run.time };
}

export function observeRoom(run) {
  const room = currentRoom(run);
  if (!room || room.kind !== 'event') return { ok: false, reason: '这里没有值得停下听的东西。' };
  if (run.time < 1) return { ok: false, reason: '夜色已经用完了，只能退回白昼。' };
  run.time -= 1;
  run.alert = clamp(run.alert + 4, 0, 100);
  const cost = dangerCost(room.danger);
  run.sp = clamp(run.sp - Math.max(1, Math.round(cost.sp * 0.4)), 0, run.maxSp);
  run.memories.push(`你听见了「${room.title}」后面的动静。`);
  run.log.push(`停下听了听「${room.title}」 · 夜色 -1 · 警戒 +4 · SP -${Math.max(1, Math.round(cost.sp * 0.4))}`);
  advanceRoom(run, '');
  if (run.time <= 0 && !run.finished) retireRun(run, 'timeout');
  return { ok: true, room, text: room.line, time: run.time };
}

export function battleReward(run, room) {
  if (!room?.reward) return { money: 0, itemId: null, label: '' };
  const multiplier = 1 + Math.min(0.3, run.alert / 400);
  return {
    money: Math.round(room.reward.money * multiplier),
    itemId: room.reward.itemId,
    label: room.reward.label,
  };
}

export function applyBattleWin(run, room) {
  if (!run || !room) return null;
  const reward = battleReward(run, room);
  run.defeated += 1;
  run.hp = clamp(Math.round(run.hp), 1, run.maxHp);
  run.loot.push(reward.label);
  run.grants.push({ id: reward.itemId, label: reward.label });
  run.money += reward.money;
  run.memories.push(`你正面击破了「${room.title}」。`);
  run.log.push(`硬刚「${room.title}」 · 击破 · ¥${reward.money} · ${reward.label}`);
  advanceRoom(run, '');
  return reward;
}

export function applyBattleLoss(run, room) {
  if (!run || !room) return null;
  run.hp = 1;
  run.alert = 100;
  retireRun(run, 'defeat');
  run.log.push(`在「${room.title}」前倒下 · 被带回白昼`);
  return { reason: 'defeat' };
}

export function talkChance({ personality, tone, quality, lowHp = false, sp = 0 }) {
  if (tone === 'bribe' && sp < SLICE_LIMITS.bribeCost) return 0;
  const mod = PERSONALITIES[personality]?.mods?.[tone] ?? 0;
  const qualityBonus = (clamp(Number(quality) || 0, 0, 100) - 50) * 0.5;
  const chance = 50 + mod + qualityBonus + (lowHp ? 5 : 0);
  return Math.round(clamp(chance, 5, 95));
}

export function resolveTalk(run, room, judgement) {
  if (!run || !room?.shadow) return { ok: false, reason: '这里没有可以交涉的影子。' };
  const { personality } = room.shadow;
  const tone = TONES.includes(judgement?.tone) ? judgement.tone : 'reason';
  const quality = clamp(Math.round(Number(judgement?.quality) || 0), 0, 100);
  const reply = cleanText(judgement?.reply, 110);
  if (tone === 'bribe') {
    if (run.sp < SLICE_LIMITS.bribeCost) {
      return { ok: false, reason: `你拿不出 ${SLICE_LIMITS.bribeCost} SP。`, chance: 0 };
    }
    run.sp -= SLICE_LIMITS.bribeCost;
  }
  const chance = talkChance({
    personality,
    tone,
    quality,
    lowHp: run.hp <= run.maxHp * 0.3,
    sp: run.sp + (tone === 'bribe' ? SLICE_LIMITS.bribeCost : 0),
  });
  const roll = Math.random();
  const success = chance > 0 && roll * 100 < chance;
  const reward = room.reward ?? { money: 120, itemId: 'echoShard', label: itemLabel('echoShard') };
  run.talked += 1;
  if (success) {
    run.loot.push(reward.label);
    run.grants.push({ id: reward.itemId, label: reward.label });
    run.money += reward.money;
    run.memories.push(room.shadow.demand ? `它听完了你的回答，留下了「${room.shadow.name}」的回应。` : '影子让开了路。');
    run.log.push(`交涉「${room.title}」成功 · ${TONE_LABELS[tone]} · ${chance}% · ${reward.label}`);
    advanceRoom(run, '');
    return {
      ok: true,
      success: true,
      chance,
      roll,
      reward,
      tone,
      quality,
      reply: reply ? `${reply} 最后，它让开了。` : '它让开了。',
    };
  }
  const cost = dangerCost(room.danger);
  run.hp = clamp(run.hp - cost.hp, 1, run.maxHp);
  run.alert = clamp(run.alert + 18, 0, 100);
  run.memories.push(`「${room.shadow.name}」没有接受你的说法，但它记住了你开口的样子。`);
  run.log.push(`交涉「${room.title}」失败 · ${TONE_LABELS[tone]} · ${chance}% · HP -${cost.hp} · 警戒 +18`);
  advanceRoom(run, '');
  return {
    ok: true,
    success: false,
    chance,
    roll,
    hpCost: cost.hp,
    tone,
    quality,
    reply: reply ? `${reply} 但它最终没有让开。` : '但它最终没有让开。',
  };
}

const TONE_WORDS = {
  threaten: ['别动', '滚', '杀', '打', '揍', '砍', '威胁', '敢', '小心', '闭嘴', '再动'],
  flatter: ['厉害', '漂亮', '佩服', '很强', '聪明', '尊重', '欣赏', '不错', '了不起', '好看'],
  reason: ['因为', '为什么', '如果', '其实', '想想', '值得', '守', '等', '解释', '你', '理解'],
  bribe: ['sp', 'SP', '钱', '给', '买', '换', '报酬', '交易', '条件', '好处'],
};

export function offlineJudge(input = {}) {
  const text = cleanText(input.text, 160);
  const scores = Object.fromEntries(TONES.map(tone => [
    tone,
    (TONE_WORDS[tone] ?? []).reduce((sum, word) => sum + (text.includes(word) ? 1 : 0), 0),
  ]));
  const bestTone = TONES.reduce((best, tone) => (
    scores[tone] > (scores[best] ?? 0) ? tone : best
  ), 'reason');
  const demand = cleanText(input.room?.shadow?.demand, 50);
  const mentionsDemand = demand && [...demand].some(char => char.trim() && text.includes(char));
  const quality = clamp(
    32 + Math.min(34, Math.round(text.length * 0.9)) + (mentionsDemand ? 8 : 0) + (text.includes('？') ? 4 : 0),
    15,
    88,
  );
  const tone = scores[bestTone] > 0 ? bestTone : 'reason';
  return {
    mode: 'offline',
    tone,
    quality,
    reply: offlineReply(tone, input.room?.shadow?.personality ?? 'calm', quality),
  };
}

const REPLY_BANK = {
  threaten: {
    high: '它退了半步。不是怕你，是在重新估量你。',
    low: '它看着你，像在看一句撑不住的话。',
  },
  flatter: {
    high: '它没有笑，但肩膀松了一点。',
    low: '它听出你在给它台阶，也听出你有点急。',
  },
  reason: {
    high: '它沉默了一会儿。你说的那部分，它没有反驳。',
    low: '它摇了摇头。道理它都懂，只是不想现在懂。',
  },
  bribe: {
    high: '它盯着你手里的 SP，像在确认你有没有诚意。',
    low: '它看了一眼，又移开了视线。这点东西还不够。',
  },
};

export function offlineReply(tone, personality, quality) {
  const bank = REPLY_BANK[tone] ?? REPLY_BANK.reason;
  const line = quality >= 60 ? bank.high : bank.low;
  if (personality === 'wrathful' && tone === 'flatter') return '它把这句话当成了挑衅。拳头没有放下。';
  if (personality === 'cowardly' && tone === 'threaten') return '它明显缩了一下。你听见它咽了口唾沫。';
  if (personality === 'greedy' && tone === 'bribe') return '它开始认真地数你拿出来的 SP。';
  if (personality === 'proud' && tone === 'flatter') return '它抬起下巴，但没有打断你。';
  return line;
}

export function normalizeJudge(raw, input = {}) {
  const fallback = offlineJudge(input);
  if (!raw || typeof raw !== 'object') return fallback;
  const quality = Number(raw.quality);
  return {
    mode: raw.mode === 'preview' ? 'preview' : 'ai',
    tone: TONES.includes(raw.tone) ? raw.tone : fallback.tone,
    quality: Number.isFinite(quality) ? clamp(Math.round(quality), 0, 100) : fallback.quality,
    reply: cleanText(raw.reply, 110) || fallback.reply,
  };
}

export function sliceSummary(run) {
  if (!run) return null;
  return {
    title: run.spec.title,
    theme: run.spec.theme,
    mood: run.spec.mood,
    rooms: run.spec.rooms.length,
    cleared: Math.min(run.index + (run.finished ? 1 : 0), run.spec.rooms.length),
    defeated: run.defeated,
    talked: run.talked,
    loot: [...run.loot],
    grants: [...run.grants],
    money: run.money,
    memories: [...run.memories],
    alert: run.alert,
    hp: run.hp,
    sp: run.sp,
    reason: run.reason,
  };
}

export { TONE_LABELS };
