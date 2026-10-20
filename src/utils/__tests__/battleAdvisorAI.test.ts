import { describe, expect, it, vi } from 'vitest';
import {
  buildBattleAdvisorMessages,
  createBattleAdvisorBridge,
  parseBattleAdvice,
  sanitizeBattleAdvisorInput,
} from '@/utils/battleAdvisorAI';
import type { Settings } from '@/types';
import type { AIConfig, AIMessage, ChatOptions } from '@/utils/aiClient';

const snapshot = {
  round: 2,
  actor: {
    id: 'hero',
    name: '主角',
    hp: 38,
    maxHp: 52,
    sp: 18,
    maxSp: 34,
    persona: '皮克希',
  },
  party: [
    {
      id: 'hero',
      name: '主角',
      hp: 38,
      maxHp: 52,
      sp: 18,
      maxSp: 34,
      persona: '皮克希',
    },
    {
      id: 'ally:cat',
      name: '猫妖精',
      hp: 12,
      maxHp: 40,
      sp: 8,
      maxSp: 20,
      persona: '猫妖精',
    },
  ],
  enemies: [
    {
      id: 'primary',
      name: '镜面守卫',
      hp: 42,
      maxHp: 80,
      attack: 999,
      weakness: 'secret-electric',
      knownAffinities: [{ element: 'electric', label: '电击', affinity: 'weak', short: '弱' }],
      status: '',
      enraged: false,
      intent: { label: '重击', elementLabel: '物理', power: 20 },
    },
  ],
  actions: [
    {
      actionKey: 'skill:agi',
      type: 'skill',
      label: '吉欧',
      detail: '电击 · 敌方',
      cost: 4,
      disabled: false,
      element: 'electric',
      targetSide: 'enemy',
    },
    {
      actionKey: 'skill:dia',
      type: 'skill',
      label: '迪亚',
      detail: '治疗 · 我方',
      cost: 3,
      disabled: false,
      element: 'healing',
      targetSide: 'ally',
    },
  ],
};

describe('battleAdvisorAI', () => {
  it('只保留公开战场资料，不带隐藏弱点或多余敌人数值', () => {
    const safe = sanitizeBattleAdvisorInput(snapshot);
    const text = JSON.stringify(safe);
    expect(safe.enemies[0].knownAffinities).toEqual([
      { element: 'electric', affinity: 'weak' },
    ]);
    expect(text).not.toContain('secret-electric');
    expect(text).not.toContain('999');
    expect(safe.targets).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'primary', side: 'enemy' }),
      expect.objectContaining({ id: 'ally:cat', side: 'party' }),
    ]));
  });

  it('提示词要求严格 JSON，并携带合法行动与已发现耐性', () => {
    const messages = buildBattleAdvisorMessages(snapshot);
    expect(messages[0].content).toContain('只输出严格 JSON');
    expect(messages[1].content).toContain('skill:agi');
    expect(messages[1].content).not.toContain('secret-electric');
  });

  it('接受合法建议并拒绝发明行动或目标', () => {
    expect(parseBattleAdvice(JSON.stringify({
      actionKey: 'skill:agi',
      targetId: 'primary',
      reason: '目标已暴露电击弱点。',
      confidence: 86,
    }), snapshot)).toEqual({
      mode: 'ai',
      actionKey: 'skill:agi',
      targetId: 'primary',
      reason: '目标已暴露电击弱点。',
      confidence: 86,
    });
    expect(() => parseBattleAdvice(JSON.stringify({
      actionKey: 'skill:megidolaon',
      targetId: 'primary',
      reason: '乱编技能',
      confidence: 99,
    }), snapshot)).toThrow('不存在的战斗行动');
    expect(() => parseBattleAdvice(JSON.stringify({
      actionKey: 'skill:agi',
      targetId: 'missing',
      reason: '乱编目标',
      confidence: 99,
    }), snapshot)).toThrow('不存在的战斗目标');
  });

  it('通过统一 chatComplete 发起请求并返回 AI 建议', async () => {
    const complete = vi.fn(async (
      _cfg: AIConfig,
      _messages: AIMessage[],
      _opts?: ChatOptions,
    ) => JSON.stringify({
      actionKey: 'skill:agi',
      targetId: 'primary',
      reason: '电击是已经确认的弱点。',
      confidence: 84,
    }));
    const bridge = createBattleAdvisorBridge(
      {} as Settings,
      {
        resolveConfig: () => ({
          apiKey: 'test-key',
          baseUrl: 'https://api.example.test/v1',
          model: 'test-model',
        }),
        complete,
      },
    );
    const status = vi.fn();
    await expect(bridge?.adviseBattle(snapshot, { onStatus: status })).resolves.toMatchObject({
      mode: 'ai',
      actionKey: 'skill:agi',
      targetId: 'primary',
      confidence: 84,
    });
    expect(complete).toHaveBeenCalledOnce();
    expect(complete.mock.calls[0][2]).toMatchObject({
      jsonMode: true,
      instant: true,
      timeoutMs: 7_000,
    });
    expect(status).toHaveBeenCalledWith('导航员正在读取战场。');
  });
});
