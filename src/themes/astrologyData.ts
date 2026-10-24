import { useMemo } from 'react';
import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore, toLocalDateKey } from '@/store';
import { db } from '@/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCloudSocialStore } from '@/store/cloudSocial';
import { useCloudStore } from '@/store/cloud';
import { loadSocial } from '@/services/social';
import { useTarotCollection, useSeasonCollection, type TarotEntry } from '@/components/codex/codexData';
import { calcMaxStreak, daysSinceFirstRecord, streakDates } from '@/utils/streak';
import type { Achievement } from '@/types';
import type { DailyDivination, FateGlimpse, LongReading } from '@/types';

const pad = (n: number) => String(n).padStart(2, '0');
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const TODAY = dayKey(new Date());
export const WEEKDAY_CN = ['日', '一', '二', '三', '四', '五', '六'];

export const shiftKey = (days: number) => { const d = new Date(); d.setDate(d.getDate() + days); return dayKey(d); };

/** 解读中占位文本（演示阶段的流式文案）；真实 AI 流式任务接入后替换 */
export const STREAM_TEXT = '星星落在你最近反复回看的那件事上——你以为它停滞了，其实它只是在雾里慢慢成形。今天适合把一句迟迟没说出口的感谢说出来；对方等的不是完美的措辞，而是你肯开口。';
export const LONG_STREAM_TEXT = '### 现状 · 隐者\n你已经在独自想这件事很久了，提灯照见的不是答案，是你真正在意的那部分。\n\n### 阻碍 · 高塔（逆位）\n你害怕的「推倒重来」其实不会发生；真正拖住你的，是对一次小失误的反复回放。\n\n### 方向 · 战车\n两到四周内，选一条路然后全速前进。';

export function useAstrologyData(autoLoad = true) {
  const {
    dailyDivination, longReadings, fateGlimpses, settings,
    loadDailyDivination, loadLongReadings, sweepExpiredReadings,
    saveDailyDivination, saveLongReading, appendLongReadingFollowUp, archiveLongReading, deleteLongReading,
  } = useAppStore(useShallow((s) => ({
    dailyDivination: s.dailyDivination,
    longReadings: s.longReadings,
    fateGlimpses: s.fateGlimpses,
    settings: s.settings,
    loadDailyDivination: s.loadDailyDivination,
    loadLongReadings: s.loadLongReadings,
    sweepExpiredReadings: s.sweepExpiredReadings,
    saveDailyDivination: s.saveDailyDivination,
    saveLongReading: s.saveLongReading,
    appendLongReadingFollowUp: s.appendLongReadingFollowUp,
    archiveLongReading: s.archiveLongReading,
    deleteLongReading: s.deleteLongReading,
  })));
  useEffect(() => {
    if (!autoLoad) return;
    void loadDailyDivination();
    void loadLongReadings().then(() => sweepExpiredReadings());
  }, [autoLoad, loadDailyDivination, loadLongReadings, sweepExpiredReadings]);

  const activeCount = useMemo(() => longReadings.filter((r) => !r.archived && r.expiresAt >= TODAY).length, [longReadings]);
  const latestGlimpse = useMemo(() => fateGlimpses[0] ?? null, [fateGlimpses]);

  return {
    dailyDivination, longReadings, activeCount, latestGlimpse, settings,
    loadDailyDivination, loadLongReadings, sweepExpiredReadings,
    saveDailyDivination, saveLongReading, appendLongReadingFollowUp, archiveLongReading, deleteLongReading,
  };
}

export function useDailyReadiness() {
  const { dailyDivination, settings } = useAppStore(useShallow((s) => ({ dailyDivination: s.dailyDivination, settings: s.settings })));
  const today = toLocalDateKey();
  const drawn = !!dailyDivination && dailyDivination.date === today;
  return { drawn, result: drawn ? dailyDivination! : null };
}

export function useFateWindow() {
  const getFateWindow = useAppStore((s) => s.getFateWindow);
  const [data, setData] = useState<{
    days: Array<{ date: string; drawn: DailyDivination | null }>;
    complete: boolean;
    eligible: boolean;
    lastGlimpse: FateGlimpse | null;
  }>({ days: [], complete: false, eligible: false, lastGlimpse: null });
  useEffect(() => { void getFateWindow().then(setData); }, [getFateWindow]);
  return data;
}

export function useOrgView() {
  const { orgs, orgsLoaded, lastError, setOrgs } = useCloudSocialStore(useShallow((s) => ({ orgs: s.orgs, orgsLoaded: s.orgsLoaded, lastError: s.lastError, setOrgs: s.setOrgs })));
  const signedIn = useCloudStore((s) => !!s.cloudUser);
  useEffect(() => { void loadSocial(); }, []);
  return { orgs, orgsLoaded, lastError, setOrgs, signedIn };
}

export function useCloudUser() {
  const { cloudUser, cloudEnabled, lastSyncAt, syncStatus } = useCloudStore(useShallow((s) => ({ cloudUser: s.cloudUser, cloudEnabled: s.cloudEnabled, lastSyncAt: s.lastSyncAt, syncStatus: s.syncStatus })));
  return { cloudUser, cloudEnabled, lastSyncAt, syncStatus, signedIn: !!cloudUser };
}

export function useCodexCollections() {
  const tarot = useTarotCollection();
  const season = useSeasonCollection();
  return { tarot, season };
}

export function useRealCodex() {
  const { achievements, skills, todoCompletions, battleState, weeklyGoals, confidants } = useAppStore(useShallow((s) => ({
    achievements: s.achievements, skills: s.skills, todoCompletions: s.todoCompletions,
    battleState: s.battleState, weeklyGoals: s.weeklyGoals, confidants: s.confidants,
  })));
  return { achievements, skills, todoCompletions, battleState, weeklyGoals, confidants };
}

export function useAchievementProgressMap() {
  const { achievements, attributes, activities, todoCompletions, battleState, weeklyGoals, confidants } = useAppStore(useShallow((s) => ({
    achievements: s.achievements, attributes: s.attributes, activities: s.activities,
    todoCompletions: s.todoCompletions, battleState: s.battleState, weeklyGoals: s.weeklyGoals, confidants: s.confidants,
  })));
  const questsClaimed = useLiveQuery(() => db.quests.filter((q) => !!q.claimedAt).count(), []) ?? 0;
  return useMemo(() => {
    const out: Record<string, number> = {};
    const dates = streakDates(activities);
    for (const a of achievements) {
      const c = a.condition;
      let value = 0;
      switch (c.type) {
        case 'quests_claimed': value = questsClaimed; break;
        case 'consecutive_days': value = calcMaxStreak(dates); break;
        case 'days_since_first_record': value = daysSinceFirstRecord(dates); break;
        case 'total_points': value = attributes.reduce((sum, x) => sum + x.points, 0); break;
        case 'attribute_level': value = attributes.find((x) => x.id === c.attribute)?.level ?? 0; break;
        case 'keyword_match': value = c.currentProgress || 0; break;
        case 'all_attributes_max': value = attributes.filter((x) => x.level >= c.value).length; break;
        case 'todo_completions': value = todoCompletions.reduce((sum, x) => sum + x.count, 0); break;
        case 'shadow_defeats': value = battleState?.defeatedShadowLog?.length ?? 0; break;
        case 'battle_feat': value = c.feat && (battleState?.battleFeats ?? []).includes(c.feat) ? 1 : 0; break;
        case 'weekly_goal_completions': value = weeklyGoals.filter((g) => g.completed).length; break;
        case 'confidants_at_level': value = confidants.filter((x) => !x.archivedAt && x.intimacy >= (c.minLevel ?? 1)).length; break;
        default: value = 0;
      }
      out[a.id] = Math.min(value, c.value);
    }
    return out;
  }, [achievements, attributes, activities, todoCompletions, battleState, weeklyGoals, confidants, questsClaimed]);
}

export function useTarotCollectedMap() {
  const tarot = useTarotCollection();
  return useMemo(() => Object.fromEntries(
    [...tarot.entries.entries()].map(([id, e]) => [id, { upright: { ...e.upright }, reversed: { ...e.reversed } }]),
  ), [tarot.entries]);
}

export function useSeasonCollectedMap() {
  const season = useSeasonCollection();
  return useMemo(() => Object.fromEntries(season.stamps.map((s) => [s.date, s.collectedAt])), [season.stamps]);
}

/**
 * 真实岁时印记（月相 / 委托 / 满月团战）。
 * 主题包里原来用的是 mock 常量 SEASON_EXTRAS（固定 3 枚演示印记）。
 */
export function useSeasonExtras() {
  const season = useSeasonCollection();
  return useMemo(
    () => season.extras.map((s) => ({ id: s.id, kind: s.kind, name: s.name, date: s.date })),
    [season.extras],
  );
}

export type { TarotEntry };

export type { DailyDivination, FateGlimpse, LongReading };
