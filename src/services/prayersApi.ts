/**
 * prayersApi —— 祈愿的自研后端数据源（社交迁移 W3 第一波）。
 *
 * 契约：后端 /api/social/prayers*（PrayerController），函数签名与 prayers.ts 的 PB 实现镜像，
 * 返回结构映射为前端 Prayer 类型（types/index.ts）。prayers.ts 按登录态自动分流到这里。
 */
import { velvetRequest } from './velvetApi';
import type { CloudProfile, Prayer } from '@/types';

/** 后端返回的祈愿行（PrayerService.toView 形状） */
interface RawPrayer {
  id: string;
  fromId: string;
  toId: string;
  day: string;
  createdAt: string;
  fromProfile?: Record<string, unknown> | null;
  toProfile?: Record<string, unknown> | null;
}

function mapProfile(raw: Record<string, unknown> | null | undefined): CloudProfile | undefined {
  if (!raw) return undefined;
  return {
    id: (raw.id as string) ?? '',
    userId: (raw.username as string | undefined) || undefined,
    nickname: (raw.nickname as string | undefined) || undefined,
    avatarUrl: raw.avatarUrl as string | undefined,
    totalLv: typeof raw.total_lv === 'number' ? raw.total_lv : undefined,
    levelDifficulty: raw.level_difficulty === 'hard' || raw.level_difficulty === 'easy'
      ? (raw.level_difficulty as 'hard' | 'easy')
      : undefined,
    attributeNames: raw.attribute_names as Record<string, string> | undefined,
    attributeLevels: raw.attribute_levels as Record<string, number> | undefined,
    attributeLevelTitles: raw.attribute_level_titles as Record<string, string[]> | undefined,
    attributePoints: raw.attribute_points as Record<string, number> | undefined,
    totalPoints: typeof raw.total_points === 'number' ? raw.total_points : undefined,
    unlockedCount: typeof raw.unlocked_count === 'number' ? raw.unlocked_count : undefined,
    status: raw.status as CloudProfile['status'],
    goal: raw.goal as CloudProfile['goal'],
    lastSyncedAt: new Date(),
  } as CloudProfile;
}

function mapPrayer(raw: RawPrayer): Prayer {
  return {
    id: raw.id,
    fromId: raw.fromId,
    toId: raw.toId,
    day: raw.day,
    createdAt: new Date(raw.createdAt || Date.now()),
    fromProfile: mapProfile(raw.fromProfile),
    toProfile: mapProfile(raw.toProfile),
  };
}

/** 拉今日与「我」相关的祈愿（双向）。day 由 prayers.ts 按本地 04:00 日界算好传入。 */
export async function listTodayPrayers(day: string): Promise<Prayer[]> {
  const res = await velvetRequest<{ items: RawPrayer[] }>(
    `/api/social/prayers/today?day=${encodeURIComponent(day)}`,
  );
  return res.items.map(mapPrayer);
}

/**
 * 发送祈愿。重复（同日同对）→ 后端 409 抛错；对自己 → 400。
 *
 * reciprocal 语义与 PB 版一致：本次发送后是否构成「双向互祈」——即对方今天是否
 * 已给我发过（由调用方传 existingTodayPrayers，登录者 id 从本次返回的 fromId 取）。
 */
export async function sendPrayer(
  targetUserId: string,
  existingTodayPrayers: Prayer[],
  day: string,
): Promise<{ prayer: Prayer; reciprocal: boolean }> {
  const raw = await velvetRequest<RawPrayer>('/api/social/prayers', {
    method: 'POST',
    body: JSON.stringify({ to: targetUserId, day }),
  });
  const prayer = mapPrayer(raw);
  // 对方今天是否已为我祈愿 → 构成双向互祈
  const reciprocal = existingTodayPrayers.some(
    p => p.fromId === targetUserId && p.toId === prayer.fromId,
  );
  return { prayer, reciprocal };
}
