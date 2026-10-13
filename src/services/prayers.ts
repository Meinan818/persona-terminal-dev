/**
 * 祈愿 / Prayer —— 在线好友之间互送 SP 的轻量动作，数据面走自研后端 /api/social/prayers。
 *
 * 设计：
 *   - 每个「祈愿日」以本地 04:00 为日界，同一 (from, to, day) 只能存在一条
 *   - 对方收到祈愿 → +3 SP（在对方设备上结算；battleState 不存在时保留通知下次再算）
 *   - 双向互祈 → 对方额外收到一条反射通知，前端 UI 强调之
 *   - 通知由服务端在写入祈愿时一并产生（PocketBase 时代是客户端手写 notifications）
 */

import * as velvetApi from './velvetApi';
import * as prayersApi from './prayersApi';
import type { Prayer } from '@/types';

/** 祈愿日界：本地 04:00 */
const DAY_RESET_HOUR = 4;

/**
 * 按 DAY_RESET_HOUR 返回「当前祈愿日」的 YYYY-MM-DD。
 * 凌晨 0:00–3:59 属于「前一自然日」的祈愿日。
 */
export const getPrayerDayKey = (now: Date = new Date()): string => {
  const anchor = new Date(now);
  if (anchor.getHours() < DAY_RESET_HOUR) {
    anchor.setDate(anchor.getDate() - 1);
  }
  const y = anchor.getFullYear();
  const m = String(anchor.getMonth() + 1).padStart(2, '0');
  const d = String(anchor.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/** 下一次 04:00 的时间戳（毫秒），用于前端倒计时显示 */
export const getNextResetTime = (now: Date = new Date()): Date => {
  const next = new Date(now);
  next.setHours(DAY_RESET_HOUR, 0, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next;
};

/**
 * 拉取今日（以本地 04:00 为日界）所有「与我相关」的祈愿记录，含 from = me 与 to = me 两个方向。
 * 读失败一律返回空数组：祈愿拉不到不该阻塞社交页其它数据。
 */
export const listTodayPrayers = async (): Promise<Prayer[]> => {
  const day = getPrayerDayKey();
  try {
    return await prayersApi.listTodayPrayers(day);
  } catch (err) {
    console.warn('[velvet-prayers] listTodayPrayers failed', err);
    return [];
  }
};

/** 今天我是否已为对方祈愿 */
export const hasPrayedToday = (targetUserId: string, todayPrayers: Prayer[]): boolean => {
  const me = velvetApi.getUserId();
  if (!me) return false;
  return todayPrayers.some(p => p.fromId === me && p.toId === targetUserId);
};

/** 今天对方是否已为我祈愿 */
export const hasBeenPrayedByToday = (sourceUserId: string, todayPrayers: Prayer[]): boolean => {
  const me = velvetApi.getUserId();
  if (!me) return false;
  return todayPrayers.some(p => p.fromId === sourceUserId && p.toId === me);
};

export interface SendPrayerResult {
  prayer: Prayer;
  /** 对方今天是否也给我发过祈愿（此次发送后构成双向互祈） */
  reciprocal: boolean;
}

/**
 * 向对方发送祈愿。
 *
 * 失败情况：对方为自己 / 今日已发过（本地先挡，服务端也会挡）。成功返回记录与是否构成互祈。
 */
export const sendPrayer = async (
  targetUserId: string,
  existingTodayPrayers: Prayer[] = [],
): Promise<SendPrayerResult> => {
  if (!targetUserId || targetUserId === velvetApi.getUserId()) throw new Error('不能对自己祈愿');
  if (hasPrayedToday(targetUserId, existingTodayPrayers)) {
    throw new Error('今天已经为 Ta 祈愿过了');
  }
  const day = getPrayerDayKey();
  return await prayersApi.sendPrayer(targetUserId, existingTodayPrayers, day);
};
