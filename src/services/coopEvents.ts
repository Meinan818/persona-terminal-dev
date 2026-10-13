import { db } from '@/db';
import { pb, getUserId } from './pocketbase';
import { velvetRequest, isAuthenticated, getAuthGeneration } from './velvetApi';
import type { ConfidantEvent } from '@/types';

let running: Promise<number> | null = null;

/** 待发送记录随本地互动事务保存；离线失败留待下一次社交同步。 */
export function flushCoopEvents(): Promise<number> {
  if (running) return running;
  const run = flush();
  running = run;
  void run.finally(() => { if (running === run) running = null; }).catch(() => undefined);
  return run;
}

async function flush(): Promise<number> {
  const accountId = getUserId();
  const backend = isAuthenticated();
  const generation = getAuthGeneration();
  const pbSession = pb?.authStore.token;
  if (!accountId || (!backend && !pb?.authStore.isValid)) return 0;
  const current = () => getUserId() === accountId && getAuthGeneration() === generation
    && (backend ? isAuthenticated() : pb?.authStore.token === pbSession);
  const events = (await db.confidantEvents.toArray()).filter(event =>
    event.broadcast?.accountId === accountId && !event.broadcast.deliveredAt);
  let sent = 0;
  for (const event of events) {
    if (!current()) break;
    const pending = event.broadcast!;
    try {
      await send(event, backend, accountId, pending.recipientId, current);
      if (!current()) break;
      await db.confidantEvents.update(event.id, { broadcast: { ...pending, deliveredAt: new Date().toISOString() } });
      sent++;
    } catch (error) {
      // 不输出互动原文或完整错误响应；失败记录继续留在持久层。
      console.warn('[coop] 互动通知未发送，后续社交同步重试', error instanceof Error ? error.name : 'request failed');
    }
  }
  return sent;
}

async function send(event: ConfidantEvent, backend: boolean, me: string, recipientId: string, current: () => boolean): Promise<void> {
  if (backend) {
    await velvetRequest('/api/social/coop/events', { method: 'POST', body: JSON.stringify({
      recipientId, eventId: event.id, date: event.date, delta: event.delta ?? 0,
      narrative: event.narrative, advice: event.advice, userInput: event.userInput,
    }) });
    return;
  }
  if (!pb) throw new Error('未登录');
  // PB 兼容路径重试前按事件标识查已有通知，保持原数据源用途。
  const existing = await pb.collection('notifications').getList(1, 1, {
    filter: pb.filter('from = {:me} && user = {:recipient} && payload.event_id = {:event}', { me, recipient: recipientId, event: event.id }), requestKey: null,
  });
  if (existing.items.length) return;
  if (!current()) throw new Error('登录状态已变化');
  await pb.collection('notifications').create({ user: recipientId, from: me, type: 'event_logged', read: false, payload: {
    kind: 'coop_event', event_id: event.id, date: event.date, event_type: 'conversation', delta: event.delta,
    narrative: event.narrative, advice: event.advice, user_input: event.userInput,
  } });
}
