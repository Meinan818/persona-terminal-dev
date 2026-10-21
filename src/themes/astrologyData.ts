import { useMemo } from 'react';
import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore, toLocalDateKey } from '@/store';
import { useCloudSocialStore } from '@/store/cloudSocial';
import { useCloudStore } from '@/store/cloud';
import { loadSocial } from '@/services/social';
import type { DailyDivination, FateGlimpse, LongReading } from '@/types';

const pad = (n: number) => String(n).padStart(2, '0');
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const TODAY = dayKey(new Date());
export const WEEKDAY_CN = ['日', '一', '二', '三', '四', '五', '六'];

export const shiftKey = (days: number) => { const d = new Date(); d.setDate(d.getDate() + days); return dayKey(d); };

/** 解读中占位文本（演示阶段的流式文案）；真实 AI 流式任务接入后替换 */
export const STREAM_TEXT = '星星落在你最近反复回看的那件事上——你以为它停滞了，其实它只是在雾里慢慢成形。今天适合把一句迟迟没说出口的感谢说出来；对方等的不是完美的措辞，而是你肯开口。';
export const LONG_STREAM_TEXT = '### 现状 · 隐者\n你已经在独自想这件事很久了，提灯照见的不是答案，是你真正在意的那部分。\n\n### 阻碍 · 高塔（逆位）\n你害怕的「推倒重来」其实不会发生；真正拖住你的，是对一次小失误的反复回放。\n\n### 方向 · 战车\n两到四周内，选一条路然后全速前进。';

export function useAstrologyData() {
  const {
    dailyDivination, longReadings, fateGlimpses, settings,
    loadDailyDivination, loadLongReadings, sweepExpiredReadings,
    saveDailyDivination, saveLongReading, archiveLongReading, deleteLongReading,
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
    archiveLongReading: s.archiveLongReading,
    deleteLongReading: s.deleteLongReading,
  })));

  const activeCount = useMemo(() => longReadings.filter((r) => !r.archived && r.expiresAt >= TODAY).length, [longReadings]);
  const latestGlimpse = useMemo(() => fateGlimpses[0] ?? null, [fateGlimpses]);

  return {
    dailyDivination, longReadings, activeCount, latestGlimpse, settings,
    loadDailyDivination, loadLongReadings, sweepExpiredReadings,
    saveDailyDivination, saveLongReading, archiveLongReading, deleteLongReading,
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
  const { orgs, orgsLoaded, setOrgs } = useCloudSocialStore(useShallow((s) => ({ orgs: s.orgs, orgsLoaded: s.orgsLoaded, setOrgs: s.setOrgs })));
  useEffect(() => { void loadSocial(); }, []);
  return { orgs, orgsLoaded, setOrgs };
}

export function useCloudUser() {
  const { cloudUser, cloudEnabled, lastSyncAt, syncStatus } = useCloudStore(useShallow((s) => ({ cloudUser: s.cloudUser, cloudEnabled: s.cloudEnabled, lastSyncAt: s.lastSyncAt, syncStatus: s.syncStatus })));
  return { cloudUser, cloudEnabled, lastSyncAt, syncStatus, signedIn: !!cloudUser };
}

export type { DailyDivination, FateGlimpse, LongReading };
