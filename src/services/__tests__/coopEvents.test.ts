import { beforeEach, expect, it, vi } from 'vitest';
import type { ConfidantEvent } from '@/types';
const h = vi.hoisted(() => ({ events: [] as ConfidantEvent[], me: 'a', generation: 0, request: vi.fn(), update: vi.fn(), collection: vi.fn() }));
vi.mock('@/db', () => ({ db: { confidantEvents: { toArray: async () => h.events, update: h.update } } }));
vi.mock('../pocketbase', () => ({ getUserId: () => h.me, pb: { authStore: { isValid: false }, collection: h.collection } }));
vi.mock('../velvetApi', () => ({ isAuthenticated: () => true, getAuthGeneration: () => h.generation, velvetRequest: h.request }));
import { flushCoopEvents } from '../coopEvents';
const event = (): ConfidantEvent => ({ id: 'event', confidantId: 'local', date: '2026-10-13', type: 'conversation', delta: 2, createdAt: new Date(), broadcast: { accountId: 'a', recipientId: 'b' } });
beforeEach(() => {
  vi.clearAllMocks(); h.me = 'a'; h.generation = 0; h.events = [event()];
  h.request.mockResolvedValue({});
  h.update.mockImplementation(async (id, patch) => Object.assign(h.events.find(event => event.id === id)!, patch));
});
it('自研会话发送到Java接口并落盘确认，不调用PB', async () => {
  expect(await flushCoopEvents()).toBe(1);
  expect(h.request.mock.calls[0][0]).toBe('/api/social/coop/events');
  expect(JSON.parse(h.request.mock.calls[0][1].body)).toMatchObject({ eventId: 'event', recipientId: 'b', delta: 2 });
  expect(h.events[0].broadcast?.deliveredAt).toBeTruthy(); expect(h.collection).not.toHaveBeenCalled();
  expect(await flushCoopEvents()).toBe(0); expect(h.request).toHaveBeenCalledTimes(1);
});
it('离线失败保留待发送记录，重试仍用相同事件标识', async () => {
  h.request.mockRejectedValueOnce(new Error('synthetic offline'));
  expect(await flushCoopEvents()).toBe(0); expect(h.update).not.toHaveBeenCalled();
  expect(await flushCoopEvents()).toBe(1);
  expect(h.request.mock.calls.map(call => JSON.parse(call[1].body).eventId)).toEqual(['event', 'event']);
});
it('并发刷新共用同一轮，不重复发送', async () => {
  await Promise.all([flushCoopEvents(), flushCoopEvents()]); expect(h.request).toHaveBeenCalledTimes(1);
});
it('换号后的旧响应不确认记录，也不发送下一条旧账号记录', async () => {
  h.events.push({ ...event(), id: 'second' });
  h.request.mockImplementation(async () => { h.me = 'c'; h.generation++; return {}; });
  expect(await flushCoopEvents()).toBe(0); expect(h.request).toHaveBeenCalledTimes(1); expect(h.update).not.toHaveBeenCalled();
  expect(await flushCoopEvents()).toBe(0);
});
