import { describe, expect, it, vi } from 'vitest';
import {
  buildNightFloorMessages,
  createNightFloorBridge,
  parseNightFloorPlan,
} from '@/utils/nightFloorAI';
import type { Settings } from '@/types';

const settings = {} as Settings;

const validPlan = {
  title: '没说出口的那句话',
  theme: '会议室',
  mood: '发闷',
  memory: '你把它说完了。',
  exitLine: '门外是还没有开始的白昼。',
  rooms: [
    {
      kind: 'guard',
      title: '亮着的投影',
      line: '投影还亮着，像有人刚离开。',
      danger: 'mid',
      money: 999,
    },
    {
      kind: 'shadow',
      title: '没说完的话',
      line: '它没有先动手。',
      danger: 'high',
      shadow: {
        name: '没说完的话',
        personality: 'proud',
        opening: '你终于开口了。',
        demand: '把话说完。',
      },
      itemId: 'forbidden',
    },
    {
      kind: 'exit',
      title: '白昼的门',
      line: '门外是白昼。',
      danger: 'low',
      hp: 1,
    },
  ],
};

describe('AI LAB night floor adapter', () => {
  const payloadOf = (messages: ReturnType<typeof buildNightFloorMessages>) => (
    JSON.parse((messages[1].content as string).split('\n').slice(-1)[0] ?? '{}')
  );

  it('只把受限记录与公开队伍资料交给模型', () => {
    const messages = buildNightFloorMessages({
      mode: 'record',
      record: `  今天没敢在会上说自己的想法  ${'很长'.repeat(80)}`,
      date: '2026-10-21',
      roster: [
        { id: 'hero', name: '主角', arcana: '愚者', level: 12, hp: 1, secret: 'hidden' },
      ],
    });
    const payload = payloadOf(messages);
    expect(payload.mode).toBe('record');
    expect(payload.record).toHaveLength(120);
    expect(payload.roster).toEqual([
      { id: 'hero', name: '主角', arcana: '愚者', level: 12 },
    ]);
    expect(JSON.stringify(messages)).not.toContain('secret');
    expect(JSON.stringify(messages)).not.toContain('"hp":1');
  });

  it('塔模式不把白天记录发给模型', () => {
    const messages = buildNightFloorMessages({
      mode: 'tower',
      record: '今天没敢在会上说自己的想法',
    });
    expect(payloadOf(messages).record).toBe('');
  });

  it('模型夜层只保留规则白名单字段，奖励和隐藏数值由引擎生成', () => {
    const plan = parseNightFloorPlan(JSON.stringify(validPlan), { mode: 'record' });
    expect(plan.mode).toBe('ai');
    expect(plan.rooms).toHaveLength(3);
    expect(plan.rooms[0]).not.toHaveProperty('money');
    expect(plan.rooms[1]).not.toHaveProperty('itemId');
    expect(plan.rooms[2]).not.toHaveProperty('hp');
    expect(plan.rooms[1].shadow).toEqual(validPlan.rooms[1].shadow);
  });

  it('缺出口或房间数量不对时拒绝模型夜层', () => {
    expect(() => parseNightFloorPlan(JSON.stringify({
      rooms: validPlan.rooms.slice(0, 2),
    }), { mode: 'record' })).toThrow('模型夜层格式不完整');

    expect(() => parseNightFloorPlan(JSON.stringify({
      rooms: validPlan.rooms.map((room, index) => (
        index === 2 ? { ...room, kind: 'event' } : room
      )),
    }), { mode: 'record' })).toThrow('模型夜层格式不完整');
  });

  it('通过现有 AI 通道生成受限夜层', async () => {
    const complete = vi.fn(async () => JSON.stringify(validPlan));
    const status = vi.fn();
    const bridge = createNightFloorBridge(() => settings, {
      resolveConfig: () => ({
        apiKey: 'test-key',
        baseUrl: 'https://example.test',
        model: 'test-model',
      }),
      complete,
    });
    expect(bridge).not.toBeNull();
    const result = await bridge!.planNightFloor({
      mode: 'record',
      record: '今天没敢在会上说自己的想法',
      roster: [{ id: 'hero', name: '主角', arcana: '愚者', level: 12 }],
    }, { onStatus: status });
    expect(result.title).toBe('没说出口的那句话');
    expect(status).toHaveBeenCalled();
    expect(complete).toHaveBeenCalledOnce();
    expect(complete).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'test-model' }),
      expect.any(Array),
      expect.objectContaining({
        temperature: 0.55,
        maxTokens: 1_200,
        timeoutMs: 7_000,
        jsonMode: true,
        instant: true,
      }),
    );
  });

  it('没有 AI 配置时不创建桥', () => {
    const bridge = createNightFloorBridge(() => settings, {
      resolveConfig: () => null,
      complete: vi.fn(),
    });
    expect(bridge).toBeNull();
  });
});
