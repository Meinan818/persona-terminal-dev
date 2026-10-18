const ATTRIBUTES = ['知识', '勇气', '灵巧', '体贴', '魅力'];

function clampText(value, max = 180) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function normalizeCandidate(candidate, roster, fallbackIndex) {
  const index = Number.isInteger(candidate?.index) && candidate.index >= 0 && candidate.index < roster.length
    ? candidate.index : fallbackIndex;
  const base = roster[index] ?? roster[0];
  return {
    index,
    name: clampText(candidate?.name, 24) || base.name,
    description: clampText(candidate?.description, 120) || base.passive,
    memory: clampText(candidate?.memory, 120) || `你在${base.attr}里留下了一道回应。`,
    skills: Array.isArray(candidate?.skills)
      ? candidate.skills.slice(0, 2).map((skill, i) => ({
        name: clampText(skill?.name, 24) || base.skills[i][0],
        seed: clampText(skill?.seed, 80) || base.skills[i][2],
      }))
      : base.skills.slice(0, 2).map(skill => ({ name: skill[0], seed: skill[2] })),
  };
}

function normalizeResult(result, input) {
  const roster = Array.isArray(input.roster) && input.roster.length ? input.roster : [];
  if (!roster.length || !result || !Array.isArray(result.candidates)) return null;
  const candidates = result.candidates.slice(0, 3).map((candidate, i) => normalizeCandidate(candidate, roster, i));
  if (!candidates.length) return null;
  const selected = Math.max(0, Math.min(candidates.length - 1, Number(result.selected) || 0));
  return {
    mode: 'ai',
    selected,
    candidates,
    diagnosis: clampText(result.diagnosis, 160) || '你的回答之间，形成了一条仍在变化的力量线索。',
    memory: clampText(result.memory, 160) || candidates[selected].memory,
  };
}

function offlineAwakening(input) {
  const scores = Array.isArray(input.scores) ? input.scores : [1, 0, 0, 0, 0];
  const roster = input.roster ?? [];
  const ranked = roster.map((_, index) => ({ index, score: Number(scores[index]) || 0 }))
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const candidates = ranked.slice(0, 3).map(({ index }) => normalizeCandidate({}, roster, index));
  const lead = candidates[0] ?? normalizeCandidate({}, roster, 0);
  return {
    mode: 'offline',
    selected: 0,
    candidates,
    diagnosis: `离线回应：${lead.name} 与你当前最突出的${lead.index < ATTRIBUTES.length ? ATTRIBUTES[lead.index] : '力量'}倾向相合。`,
    memory: `你没有交出答案的解释权，只让${lead.name}先记住这一刻。`,
  };
}

/**
 * 觉醒 AI bridge。正式应用可注入 window.MASKARIA_AI.awakenPersona(input, hooks)，
 * 原型自身不读取密钥，也不伪造网络请求；没有 bridge 时明确落到离线回应。
 */
export async function requestAwakening(input, { signal, onReasoning } = {}) {
  const bridge = globalThis.MASKARIA_AI?.awakenPersona;
  if (typeof bridge !== 'function') return offlineAwakening(input);
  try {
    const result = await bridge(input, { signal, onReasoning });
    return normalizeResult(result, input) ?? offlineAwakening(input);
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    return offlineAwakening(input);
  }
}

/**
 * 让静态预览有一个可见、可验收的 AI 路径。它是确定性 bridge 演示，不调用真实模型；
 * 正式应用注入自己的 MASKARIA_AI 后，入口会自动沿用真实 provider。
 */
export function installPreviewAwakeningBridge() {
  if (typeof globalThis.MASKARIA_AI?.awakenPersona === 'function') return false;
  globalThis.MASKARIA_AI = {
    awakenPersona: async (input, { signal, onReasoning } = {}) => {
      const wait = ms => new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, ms);
        if (signal) signal.addEventListener('abort', () => { clearTimeout(timer); const error = new Error('aborted'); error.name = 'AbortError'; reject(error); }, { once: true });
      });
      onReasoning?.('正在听见你的回答……'); await wait(180);
      onReasoning?.('正在寻找回答里的矛盾与回声……'); await wait(220);
      const scores = input.scores ?? [1, 0, 0, 0, 0];
      const ranked = (input.roster ?? []).map((_, index) => ({ index, score: Number(scores[index]) || 0 })).sort((a, b) => b.score - a.score || a.index - b.index).slice(0, 3);
      const candidates = ranked.map(({ index }, order) => {
        const base = input.roster[index];
        return { index, name: `${base.name}·回应${order ? 'Ⅱ' : ''}`, description: `${base.passive}，并回应你这次写下的「${String(input.traits || '').slice(0, 18)}」。`, memory: `你在${base.attr}里留下了可被再次追问的回声。`, skills: base.skills.slice(0, 2).map((skill, i) => ({ name: `${skill[0]}·${i ? '留痕' : '改写'}`, seed: i ? '把这次选择留到下一回合' : '把敌人的判断变成可回应的窗口' })) };
      });
      return { selected: 0, diagnosis: '这不是替你决定答案，而是把答案变成下一步可以行动的回应。', memory: candidates[0]?.memory ?? '这次回应会留在之后的战斗里。', candidates };
    },
  };
  return true;
}

export { offlineAwakening };
