/**
 * 暗影交涉 · AI 契约与离线影子
 *
 * AI 只产出影子的人格、开场、条件、四句交涉台词和收服/奖励提案。
 * 成功率在 negotiation-rules.js；AI 不可用时用同结构的离线影子。
 */

import { NEGOTIATION_OPTIONS, OPTION_ORDER, PERSONALITIES } from './negotiation-rules.js';

const ATTRIBUTES = ['知识', '勇气', '灵巧', '体贴', '魅力'];
const PERSONALITY_BY_ATTRIBUTE = {
  知识: 'calm',
  勇气: 'wrathful',
  灵巧: 'cowardly',
  体贴: 'proud',
  魅力: 'greedy',
};

const clampText = (value, max = 120) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '';

const TEMPLATES = {
  proud: {
    opening: '哼。你把我打倒，不代表你有资格和我谈。',
    demand: '给我一个不还手的理由。',
    options: {
      threaten: '你还有下一次出手的机会吗？',
      flatter: '你刚才那一招很漂亮。我们没必要打到这个地步。',
      reason: '你守在这里，到底得到了什么？',
      bribe: '20 SP。买你一句实话。',
    },
  },
  cowardly: {
    opening: '等等、等等！别打脸！你想要什么，我都可以谈！',
    demand: '先保证不打我。',
    options: {
      threaten: '你还有下一次出手的机会吗？',
      flatter: '你其实很会躲。刚才那一下，我差点没碰到你。',
      reason: '你守在这里，只是为了挨打吗？',
      bribe: '20 SP。拿去买个安稳。',
    },
  },
  greedy: {
    opening: '你身上有 SP 的味道。先拿出来，再谈条件。',
    demand: '20 SP。少一个子儿都不行。',
    options: {
      threaten: '你确定要为了这点东西，再挨一次？',
      flatter: '你很有眼光。这层楼最值钱的东西，都被你看见了。',
      reason: '你攒这么多，最后带得走吗？',
      bribe: '20 SP。买你一句实话。',
    },
  },
  wrathful: {
    opening: '谈？我还没打够！你先把拳头放下。',
    demand: '让我再打一拳。',
    options: {
      threaten: '你还有下一次出手的机会吗？',
      flatter: '你刚才那一拳很重。我记住了。',
      reason: '你打到最后一层，能得到什么？',
      bribe: '20 SP。买你停手。',
    },
  },
  calm: {
    opening: '你终于愿意停手了。坐吧，影子也是要面子的。',
    demand: '告诉我，你为什么要爬到这一层。',
    options: {
      threaten: '你还有下一次出手的机会吗？',
      flatter: '你比其他影子冷静。这一点，我承认。',
      reason: '你守在这里，到底在等什么？',
      bribe: '20 SP。换你一句真话。',
    },
  },
};

const RECRUIT_BY_ATTRIBUTE = {
  知识: { name: '低语的假面', skillName: '回声分析', skillDesc: '看穿敌方的下一句判词，下一次攻击附带洞察。' },
  勇气: { name: '咆哮的假面', skillName: '逆鳞斩', skillDesc: '在失衡窗口打出一次高额反击。' },
  灵巧: { name: '错拍的假面', skillName: '断拍', skillDesc: '打乱敌方意图，让它失去一次行动。' },
  体贴: { name: '带刺的假面', skillName: '温柔荆棘', skillDesc: '回复少量 HP，并让敌人下一次攻击变轻。' },
  魅力: { name: '谄媚的假面', skillName: '甜言', skillDesc: '降低敌方戒心，下一次交涉更容易。' },
};

const REWARD = { sp: 30, item: '裂开的假面碎片' };

function attributeOf(input) {
  const attr = input?.enemy?.attribute;
  return ATTRIBUTES.includes(attr) ? attr : '魅力';
}

function personalityOf(input) {
  return PERSONALITY_BY_ATTRIBUTE[attributeOf(input)] ?? 'proud';
}

export function offlineNegotiation(input = {}) {
  const personality = personalityOf(input);
  const template = TEMPLATES[personality] ?? TEMPLATES.proud;
  const attribute = attributeOf(input);
  return {
    mode: 'offline',
    personality,
    opening: template.opening,
    demand: template.demand,
    options: Object.fromEntries(OPTION_ORDER.map(id => [id, template.options[id]])),
    recruit: { ...RECRUIT_BY_ATTRIBUTE[attribute], attribute },
    reward: { ...REWARD },
  };
}

export function normalizeNegotiation(raw, input = {}) {
  const fallback = offlineNegotiation(input);
  if (!raw || typeof raw !== 'object') return fallback;
  const personality = PERSONALITIES[raw.personality] ? raw.personality : fallback.personality;
  const sourceOptions = raw.options && typeof raw.options === 'object' ? raw.options : {};
  const options = Object.fromEntries(OPTION_ORDER.map(id => [
    id,
    clampText(sourceOptions[id], 60) || fallback.options[id],
  ]));
  const sourceRecruit = raw.recruit && typeof raw.recruit === 'object' ? raw.recruit : {};
  const sourceReward = raw.reward && typeof raw.reward === 'object' ? raw.reward : {};
  return {
    mode: raw.mode === 'preview' ? 'preview' : raw.mode === 'offline' ? 'offline' : 'ai',
    personality,
    opening: clampText(raw.opening, 90) || fallback.opening,
    demand: clampText(raw.demand, 60) || fallback.demand,
    options,
    recruit: {
      name: clampText(sourceRecruit.name, 24) || fallback.recruit.name,
      skillName: clampText(sourceRecruit.skillName, 24) || fallback.recruit.skillName,
      skillDesc: clampText(sourceRecruit.skillDesc, 80) || fallback.recruit.skillDesc,
      attribute: ATTRIBUTES.includes(sourceRecruit.attribute) ? sourceRecruit.attribute : fallback.recruit.attribute,
    },
    reward: {
      sp: Math.max(10, Math.min(60, Number(sourceReward.sp) || fallback.reward.sp)),
      item: clampText(sourceReward.item, 30) || fallback.reward.item,
    },
  };
}

const wait = (ms, signal) => new Promise((resolve, reject) => {
  if (signal?.aborted) {
    const error = new Error('aborted');
    error.name = 'AbortError';
    reject(error);
    return;
  }
  const timer = setTimeout(resolve, ms);
  signal?.addEventListener('abort', () => {
    clearTimeout(timer);
    const error = new Error('aborted');
    error.name = 'AbortError';
    reject(error);
  }, { once: true });
});

async function withTimeout(run, timeoutMs, signal) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort, { once: true });
  try {
    return await run(controller.signal);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

/**
 * 正式 App 可注入 window.MASKARIA_NEGOTIATION_AI.negotiate(input, hooks)，
 * 或复用 window.MASKARIA_AI.negotiateShadow。
 */
export async function requestNegotiation(input, { signal, onStatus } = {}) {
  const bridge = globalThis.MASKARIA_NEGOTIATION_AI?.negotiate
    ?? globalThis.MASKARIA_AI?.negotiateShadow;
  if (typeof bridge !== 'function') {
    onStatus?.('没有连接 AI，影子按旧模板开口。');
    return offlineNegotiation(input);
  }
  try {
    const result = await withTimeout(
      async timeoutSignal => bridge(input, { signal: timeoutSignal, onStatus }),
      6500,
      signal,
    );
    return normalizeNegotiation(result, input);
  } catch (error) {
    if (error?.name === 'AbortError' && signal?.aborted) throw error;
    onStatus?.('AI 没有回应，影子按旧模板开口。');
    return offlineNegotiation(input);
  }
}

/**
 * 演示用确定性 bridge：影子会“打量你”，但不调用真实模型。
 */
export function installPreviewNegotiationBridge() {
  if (typeof globalThis.MASKARIA_NEGOTIATION_AI?.negotiate === 'function'
    || typeof globalThis.MASKARIA_AI?.negotiateShadow === 'function') return false;

  globalThis.MASKARIA_NEGOTIATION_AI = {
    negotiate: async (input, { signal, onStatus } = {}) => {
      onStatus?.('影子正在打量你……');
      await wait(220, signal);
      onStatus?.('它在估量你值几个钱……');
      await wait(260, signal);
      onStatus?.('它开口了。');
      await wait(180, signal);
      const base = offlineNegotiation(input);
      const personaName = clampText(input?.persona?.name, 16) || '观测者';
      return {
        ...base,
        mode: 'preview',
        opening: `${base.opening}「${personaName}」……我记住你的味道了。`,
      };
    },
  };
  return true;
}
