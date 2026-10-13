import { db } from '@/db';
import { velvetRequest, isAuthenticated, getAuthGeneration, getUserId } from './velvetApi';
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
  const generation = getAuthGeneration();
  if (!accountId || !isAuthenticated()) return 0;
  const current = () => getUserId() === accountId && getAuthGeneration() === generation && isAuthenticated();
  const events = (await db.confidantEvents.toArray()).filter(event =>
    event.broadcast?.accountId === accountId && !event.broadcast.deliveredAt);
  let sent = 0;
  for (const event of events) {
    if (!current()) break;
    const pending = event.broadcast!;
    try {
      await send(event, pending.recipientId);
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

/** 事件标识由服务端派生（发送者 + eventId），重发同一事件不会产生第二条 */
async function send(event: ConfidantEvent, recipientId: string): Promise<void> {
  await velvetRequest('/api/social/coop/events', { method: 'POST', body: JSON.stringify({
    recipientId, eventId: event.id, date: event.date, delta: event.delta ?? 0,
    narrative: event.narrative, advice: event.advice, userInput: event.userInput,
  }) });
}
