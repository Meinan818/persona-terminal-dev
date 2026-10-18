/**
 * 审判回廊 2.0 · 纯规则
 *
 * 这一层只回答一个问题：玩家选了“承认 / 反驳 / 利用”之后，局面怎么变。
 * AI 可以生成证词与回应台词，但不能越过这里直接改 HP / SP / 执念 / 动摇。
 */

export const MAX_ROUNDS = 3;
export const MAX_VERDICT = 3;
export const MAX_DOUBT = 3;
export const MAX_RESONANCE = 3;

export const STANCE_ORDER = ['accept', 'refute', 'exploit'];

export const STANCE_META = {
  accept: {
    id: 'accept',
    label: '认领',
    en: 'ACCEPT',
    tone: 'cyan',
    verb: '把这句话认作自己的',
  },
  refute: {
    id: 'refute',
    label: '反叛',
    en: 'REBEL',
    tone: 'red',
    verb: '拒绝它替你命名',
  },
  exploit: {
    id: 'exploit',
    label: '夺取',
    en: 'TAKE',
    tone: 'yellow',
    verb: '从它手里拿走解释权',
  },
};

export const DEFAULT_PERSONA = {
  name: '观测者',
  attribute: '知识',
  attributes: {
    知识: 4,
    勇气: 3,
    灵巧: 2,
    体贴: 5,
    魅力: 3,
  },
  memory: '你把自己的名字写得很小，小到连影子都要替你签。',
};

export const DEFAULT_EVIDENCE = [
  { label: '最近 3 天', value: '「温柔」记录 4 次' },
  { label: '最近 7 天', value: '「为自己」记录 0 次' },
  { label: '战斗习惯', value: '你先观察，再出手' },
];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function createTrial(overrides = {}) {
  return {
    round: 1,
    hp: 345,
    maxHp: 390,
    sp: 217,
    maxSp: 260,
    verdict: MAX_VERDICT,
    maxVerdict: MAX_VERDICT,
    doubt: 0,
    maxDoubt: MAX_DOUBT,
    resonance: 0,
    maxResonance: MAX_RESONANCE,
    leverage: 0,
    memory: [],
    status: 'judging',
    last: null,
    persona: { ...DEFAULT_PERSONA },
    evidence: DEFAULT_EVIDENCE.map(item => ({ ...item })),
    ...overrides,
  };
}

export function stanceAvailability(trial) {
  const exploitReady = trial.resonance >= 1 || trial.leverage >= 1;
  const canRefute = trial.sp >= 12 && trial.hp > 0;
  const canExploit = exploitReady && trial.sp >= 8 && trial.hp > 0;
  return {
    accept: {
      enabled: true,
      reason: '',
      warning: trial.doubt + 1 >= trial.maxDoubt ? '再认领一次，动摇会把你按进牌堆。' : '',
    },
    refute: {
      enabled: canRefute,
      reason: canRefute ? '' : trial.sp < 12 ? 'SP 不足 12' : '体力已经见底',
      warning: trial.leverage > 0 ? '它袖口里还留着你的认领；这一句反叛会被它反用。' : '',
    },
    exploit: {
      enabled: canExploit,
      reason: canExploit ? '' : !exploitReady ? '需要 1 点共鸣，或先从它手里夺来一个把柄' : trial.sp < 8 ? 'SP 不足 8' : '体力已经见底',
      warning: '',
    },
  };
}

function appendMemory(trial, accusation, stance, line, echo) {
  return [
    ...trial.memory,
    {
      round: trial.round,
      stance,
      text: accusation?.text ?? '',
      line: line ?? '',
      echo,
    },
  ];
}

function resolveStatus(trial) {
  if (trial.hp <= 0) return 'lost';
  if (trial.doubt >= trial.maxDoubt) return 'lost';
  if (trial.verdict <= 0) return 'won';
  if (trial.round >= MAX_ROUNDS) return 'unresolved';
  return 'judging';
}

/**
 * 应用一次回应。
 * accusation: { text, weakTo, attribute }
 * responseLine: AI 给出的回应台词（只做叙事，不参与数值）
 */
export function applyStance(trial, stance, accusation, responseLine = '') {
  if (!STANCE_META[stance]) return { ok: false, reason: '未知的回应。' };
  const gate = stanceAvailability(trial)[stance];
  if (!gate?.enabled) return { ok: false, reason: gate?.reason || '现在还不能这样回应。' };

  const weak = Boolean(accusation?.weakTo && accusation.weakTo === trial.persona.attribute);
  let hp = trial.hp;
  let sp = trial.sp;
  let verdict = trial.verdict;
  let doubt = trial.doubt;
  let resonance = trial.resonance;
  let leverage = trial.leverage;
  let title = '';
  let detail = '';
  let echo = '';
  let damage = 0;

  if (stance === 'accept') {
    doubt = clamp(doubt + 1, 0, trial.maxDoubt);
    resonance = clamp(resonance + 1, 0, trial.maxResonance);
    sp = clamp(sp + 12, 0, trial.maxSp);
    leverage = clamp(leverage + 1, 0, 2);
    title = '认领';
    detail = '动摇 +1 · 共鸣 +1 · SP +12 · 它把这句话折进下一张牌';
    echo = '它把这句话折好，放进了下一张牌。';
  } else if (stance === 'refute') {
    damage = weak ? 2 : 1;
    verdict = Math.max(0, verdict - damage);
    sp = Math.max(0, sp - 12);
    hp = Math.max(0, hp - (weak ? 12 : 18));
    if (leverage > 0) {
      doubt = clamp(doubt + 1, 0, trial.maxDoubt);
      leverage -= 1;
      detail = `判词 -${damage} · SP -12 · HP -${weak ? 12 : 18} · 它用你认领过的话反将一军（动摇 +1）`;
      echo = '它把你的反叛收进袖口，下一句会更近。';
    } else {
      detail = `判词 -${damage} · SP -12 · HP -${weak ? 12 : 18}`;
      echo = weak ? '你撕开了判词，裂缝里露出另一行字。' : '它把你的反叛收进袖口，下一句会更近。';
    }
    title = weak ? '反叛命中裂缝' : '反叛';
  } else {
    const useLeverage = leverage > 0;
    damage = useLeverage ? 2 : 1;
    verdict = Math.max(0, verdict - damage);
    doubt = clamp(doubt - 1, 0, trial.maxDoubt);
    resonance = useLeverage ? resonance : Math.max(0, resonance - 1);
    leverage = useLeverage ? leverage - 1 : leverage;
    sp = Math.max(0, sp - 8);
    hp = Math.max(0, hp - 6);
    title = useLeverage ? '夺走它的把柄' : '夺取判词';
    detail = useLeverage
      ? `判词 -${damage} · 消耗把柄 · 动摇 -1 · SP -8 · HP -6`
      : `判词 -${damage} · 消耗共鸣 · 动摇 -1 · SP -8 · HP -6`;
    echo = useLeverage ? '你从它袖口抽走一张牌，牌面还是热的。' : '你从判词里拿走了解释权。';
  }

  const next = {
    ...trial,
    hp,
    sp,
    verdict,
    doubt,
    resonance,
    leverage,
    memory: appendMemory(trial, accusation, stance, responseLine, echo),
    last: {
      round: trial.round,
      stance,
      title,
      detail,
      weak,
      damage,
    },
  };
  next.status = resolveStatus(next);
  return { ok: true, trial: next, result: next.last };
}

/** 只有还没结束时才能进入下一句证词；回合数在真正请求下一句时推进。 */
export function advanceRound(trial) {
  if (trial.status !== 'judging' || trial.round >= MAX_ROUNDS) return trial;
  return { ...trial, round: trial.round + 1, last: null };
}

export function trialEnding(trial) {
  if (trial.status === 'won') {
    return {
      id: 'won',
      kicker: 'FATE RELEASED',
      title: '命运没有替你签名。',
      copy: '你从它手里拿回了自己的名字。它没有消失——它成了你下一次开口时，先想起的那句话。',
      growth: `「${trial.persona.name}」记住：判词可以被改写，命运不是终审。`,
    };
  }
  if (trial.status === 'lost') {
    return {
      id: 'lost',
      kicker: 'FATE SIGNED',
      title: '它替你写完了那句话。',
      copy: '你没有输给它。你只是把笔递了过去。下一次，它会先念出这句，再问你一遍。',
      growth: `「${trial.persona.name}」记住：未反驳的判词，会成为下一场的开场白。`,
    };
  }
  return {
    id: 'unresolved',
    kicker: 'FATE UNFINISHED',
    title: '钟声响起，你还没有回答。',
    copy: '审判没有结束。天鹅绒会替你留着这张牌，直到你愿意再看它一眼。',
    growth: `「${trial.persona.name}」保留一张未翻面的牌：下一次遇到同类判词，会多一个回答。`,
  };
}

export function visibleVerdict(trial) {
  return Array.from({ length: trial.maxVerdict }, (_, index) => index < trial.verdict);
}
