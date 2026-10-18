/**
 * 天鹅绒审判 2.0 · AI 契约与离线牌面
 *
 * 三幕主题：
 *   1. 面具 / 欲望：P5 式反叛、伪装、被写好的“应该”
 *   2. 雾 / 真相：P4 式小镇迷雾、另一个自己、没说出口的承认
 *   3. 时间 / 死亡：P3 式 Memento Mori、借来的明天、钟声
 *
 * 馆长口吻：命运、契约、牌、帷幕、名字。短句、留白、不解释机制。
 * 避免：现代心理学术语、AI 式共情、长段说理、直接照搬原作台词。
 *
 * AI 只产出“判词 / 幕名 / 三句回应”。数值结算在 judgment-rules.js，
 * 所以模型坏 JSON、超时、断网或没配置时，这场审判仍然能完整走完。
 */

import { STANCE_ORDER } from './judgment-rules.js';

const ATTRIBUTES = ['知识', '勇气', '灵巧', '体贴', '魅力'];
const TONES = ['gentle', 'sharp', 'cold'];

const clampText = (value, max = 120) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '';

function evidenceLine(input) {
  const found = Array.isArray(input?.evidence) ? input.evidence[0] : null;
  return found ? `牌面写着：${found.label}，${found.value}。` : '牌面写着：它看见了你，却没有替你解释。';
}

function roundTemplate(input) {
  const persona = input?.persona ?? {};
  const dominant = ATTRIBUTES.includes(persona.attribute) ? persona.attribute : '知识';
  const last = Array.isArray(input?.memory) ? input.memory.at(-1) : null;
  const round = Math.max(1, Math.min(3, Number(input?.round) || 1));

  if (round === 2 && last) {
    if (last.stance === 'accept') {
      return {
        accusation: {
          text: '雾里那个你，已经认了。你还要替它否认多久？',
          evidence: '牌面写着：你刚才把判词收下了。雾没有散，只是换了一个方向。',
          attribute: dominant,
          weakTo: dominant === '勇气' ? '知识' : '勇气',
          tone: 'cold',
        },
        intent: { label: '第二幕 · 雾', detail: '它要看看，雾里的你和我，哪一个更诚实。' },
        responses: [
          { stance: 'accept', line: '……是。雾里的那个我，比我诚实。', hint: '认领这张牌 · 动摇 +1 · 共鸣 +1 · 得到一个把柄' },
          { stance: 'refute', line: '雾不是你藏身的地方。别把它说成我的。', hint: '撕开判词 · 拆 1 层 · 12 SP' },
          { stance: 'exploit', line: '那就让雾散一次。我要看清是谁在说话。', hint: '夺走它的句子 · 消耗共鸣/把柄 · 拆判词并压住动摇' },
        ],
      };
    }
    if (last.stance === 'refute') {
      return {
        accusation: {
          text: '你反叛得很快。快得像雾里有人替你练过这句话。',
          evidence: '牌面写着：你刚才撕开了判词。雾里传来一声很轻的笑。',
          attribute: dominant,
          weakTo: dominant === '勇气' ? '知识' : '勇气',
          tone: 'sharp',
        },
        intent: { label: '第二幕 · 雾', detail: '它不急。雾会替它等你露馅。' },
        responses: [
          { stance: 'accept', line: '……是。我练过。因为我不想再被这句话问住。', hint: '认领这张牌 · 动摇 +1 · 共鸣 +1 · 得到一个把柄' },
          { stance: 'refute', line: '练过，不代表这句话是真的。', hint: '撕开判词 · 拆 1 层 · 12 SP' },
          { stance: 'exploit', line: '快，是你教我的。现在轮到我把雾撕开。', hint: '夺走它的句子 · 消耗共鸣/把柄 · 拆判词并压住动摇' },
        ],
      };
    }
    return {
      accusation: {
        text: '你夺走了我的句子。可雾里的你，还站在原地。',
        evidence: '牌面写着：你刚才把判词变成了自己的。雾开始向你靠拢。',
        attribute: dominant,
        weakTo: dominant === '勇气' ? '知识' : '勇气',
        tone: 'cold',
      },
      intent: { label: '第二幕 · 雾', detail: '它想看看，你夺走的东西会不会反过来握住你。' },
      responses: [
        { stance: 'accept', line: '……是。我拿走了句子，却还没回答它。', hint: '认领这张牌 · 动摇 +1 · 共鸣 +1 · 得到一个把柄' },
        { stance: 'refute', line: '句子是你的，解释权不是。', hint: '撕开判词 · 拆 1 层 · 12 SP' },
        { stance: 'exploit', line: '那就再夺一次。这次，我连雾一起拿走。', hint: '夺走它的句子 · 消耗共鸣/把柄 · 拆判词并压住动摇' },
      ],
    };
  }

  if (round === 3) {
    return {
      accusation: {
        text: '你总说「还来得及」。可你真正害怕的，是有一天再也来不及。',
        evidence: '牌面写着：钟声已经响过两次。这是最后一幕，馆长不会替你翻牌。',
        attribute: '勇气',
        weakTo: dominant,
        tone: 'gentle',
      },
      intent: { label: '终幕 · 时间', detail: '钟声落下之前，你还可以改口。' },
      responses: [
        { stance: 'accept', line: '……是。我把今天借给了明天，从没问过利息。', hint: '认领这张牌 · 动摇 +1 · 共鸣 +1 · 得到一个把柄' },
        { stance: 'refute', line: '来得及，不是运气。是我还没停下。', hint: '撕开判词 · 拆 1 层（命中弱点拆 2 层）· 12 SP' },
        { stance: 'exploit', line: '那就让钟声替我作证——这一次，我不赊账。', hint: '夺走它的句子 · 消耗共鸣/把柄 · 拆判词并压住动摇' },
      ],
    };
  }

  return {
    accusation: {
      text: '你把想要的东西藏进「应该」里，然后把钥匙交给了别人。',
      evidence: input?.evidence?.[0]
        ? `牌面写着：${input.evidence[0].label}，${input.evidence[0].value}。它把这句话当成了第一张牌。`
        : '牌面写着：你总在替别人留位置，却把自己的名字折起来。',
      attribute: '魅力',
      weakTo: dominant,
      tone: 'sharp',
    },
    intent: { label: '第一幕 · 面具', detail: '它要看看，你戴的是哪一张脸。' },
    responses: [
      { stance: 'accept', line: '……是。那张脸戴久了，连疼都像别人的。', hint: '认领这张牌 · 动摇 +1 · 共鸣 +1 · 得到一个把柄' },
      { stance: 'refute', line: '面具是我选的。选它的人，不是你。', hint: '撕开判词 · 拆 1 层（命中弱点拆 2 层）· 12 SP' },
      { stance: 'exploit', line: '既然你看得见，就把这张脸替我摘下来。', hint: '夺走它的句子 · 消耗共鸣/把柄 · 拆判词并压住动摇' },
    ],
  };
}

export function offlineJudgment(input = {}) {
  const template = roundTemplate(input);
  return {
    mode: 'offline',
    accusation: { ...template.accusation },
    intent: { ...template.intent },
    responses: template.responses.map(item => ({ ...item })),
  };
}

export function normalizeJudgment(raw, input = {}) {
  const fallback = offlineJudgment(input);
  if (!raw || typeof raw !== 'object') return fallback;

  const sourceAccusation = raw.accusation && typeof raw.accusation === 'object' ? raw.accusation : {};
  const accusation = {
    text: clampText(sourceAccusation.text, 90) || fallback.accusation.text,
    evidence: clampText(sourceAccusation.evidence ?? evidenceLine(input), 120) || fallback.accusation.evidence,
    attribute: ATTRIBUTES.includes(sourceAccusation.attribute) ? sourceAccusation.attribute : fallback.accusation.attribute,
    weakTo: ATTRIBUTES.includes(sourceAccusation.weakTo) ? sourceAccusation.weakTo : fallback.accusation.weakTo,
    tone: TONES.includes(sourceAccusation.tone) ? sourceAccusation.tone : fallback.accusation.tone,
  };

  const sourceIntent = raw.intent && typeof raw.intent === 'object' ? raw.intent : {};
  const intent = {
    label: clampText(sourceIntent.label, 20) || fallback.intent.label,
    detail: clampText(sourceIntent.detail, 80) || fallback.intent.detail,
  };

  const list = Array.isArray(raw.responses) ? raw.responses : [];
  const responses = STANCE_ORDER.map(stance => {
    const match = list.find(item => item && item.stance === stance);
    const base = fallback.responses.find(item => item.stance === stance);
    return {
      stance,
      line: clampText(match?.line, 60) || base.line,
      hint: clampText(match?.hint, 48) || base.hint,
    };
  });

  return {
    mode: raw.mode === 'preview' ? 'preview' : raw.mode === 'offline' ? 'offline' : 'ai',
    accusation,
    intent,
    responses,
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
 * 正式 App 可以注入 window.MASKARIA_JUDGMENT_AI.judgeTurn(input, {signal,onStatus})，
 * 或复用 window.MASKARIA_AI.judgeBattle。原型自身不读取密钥、不伪造网络请求。
 */
export async function requestJudgment(input, { signal, onStatus } = {}) {
  const bridge = globalThis.MASKARIA_JUDGMENT_AI?.judgeTurn
    ?? globalThis.MASKARIA_AI?.judgeBattle;
  if (typeof bridge !== 'function') {
    onStatus?.('没有连接 AI，正在使用离线证词。');
    return offlineJudgment(input);
  }
  try {
    const result = await withTimeout(
      async timeoutSignal => bridge(input, { signal: timeoutSignal, onStatus }),
      6500,
      signal,
    );
    return normalizeJudgment(result, input);
  } catch (error) {
    if (error?.name === 'AbortError' && signal?.aborted) throw error;
    onStatus?.('AI 没有回应，已切到离线证词。');
    return offlineJudgment(input);
  }
}

/**
 * 演示用确定性 bridge：让页面看得见“馆长正在洗牌”，但不调用真实模型。
 * 正式注入真实 bridge 后，本函数会自动让位。
 */
export function installPreviewJudgmentBridge() {
  if (typeof globalThis.MASKARIA_JUDGMENT_AI?.judgeTurn === 'function'
    || typeof globalThis.MASKARIA_AI?.judgeBattle === 'function') return false;

  globalThis.MASKARIA_JUDGMENT_AI = {
    judgeTurn: async (input, { signal, onStatus } = {}) => {
      onStatus?.('馆长正在洗牌……');
      await wait(220, signal);
      onStatus?.('他翻到了一张你不想看的牌……');
      await wait(260, signal);
      onStatus?.('帷幕拉开。轮到你开口了。');
      await wait(180, signal);
      const base = offlineJudgment(input);
      const personaName = clampText(input?.persona?.name, 16) || '观测者';
      return {
        ...base,
        mode: 'preview',
        accusation: {
          ...base.accusation,
          evidence: `这局牌面为「${personaName}」而开。${base.accusation.evidence.replace(/^牌面写着：/, '')}`,
        },
      };
    },
  };
  return true;
}
