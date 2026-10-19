import type { BattleState } from '@/types';
import { db } from '@/db';
import {
  UMBRA_PROFILE_ID,
  planLegacyUmbraMigration,
  type UmbraProfile,
} from '@/umbra/state';

/**
 * 幂等地把旧 battleState 复制为 UMBRA 永久资料和原始归档。
 * 旧表只读，不删除、不改写，便于升级失败时回退。
 */
export async function ensureUmbraProfile(
  legacy: BattleState | null,
  now = new Date(),
): Promise<UmbraProfile | null> {
  const existing = await db.umbraProfiles.get(UMBRA_PROFILE_ID);
  if (existing) return existing;

  const plan = planLegacyUmbraMigration(legacy, now);
  if (!plan) return null;

  await db.transaction('rw', db.umbraProfiles, db.umbraLegacyArchives, async () => {
    const raced = await db.umbraProfiles.get(UMBRA_PROFILE_ID);
    if (raced) return;
    if (!(await db.umbraLegacyArchives.get(plan.archive.id))) {
      await db.umbraLegacyArchives.put(plan.archive);
    }
    await db.umbraProfiles.put(plan.profile);
  });

  return await db.umbraProfiles.get(UMBRA_PROFILE_ID) ?? plan.profile;
}
