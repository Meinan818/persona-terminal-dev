import { useAppStore } from '@/store';
import { STATUS_PRESETS, liveStatus } from '@/constants/profileStatus';
import { buildGoalSnapshot, goalPercent } from '@/utils/profilePresence';

export interface PresenceState {
  statusId: string | null;
  statusSetAt: number | null;
  goal: { cardId: string; alias?: string } | null;
  goalIssue: null | 'audit' | 'missing';
  name: string;
  avatar: string | null;
  theme: string;
}

export function usePresence(): PresenceState {
  const user = useAppStore((state) => state.user);
  const settings = useAppStore((state) => state.settings);
  const callingCards = useAppStore((state) => state.callingCards);
  const status = liveStatus(settings.profileStatus);
  const profileGoal = settings.profileGoal;
  const cardMissing = !!profileGoal && !callingCards.some((card) => card.id === profileGoal.cardId);
  return {
    statusId: status?.id ?? null,
    statusSetAt: settings.profileStatus ? new Date(settings.profileStatus.at).getTime() : null,
    goal: profileGoal ? { cardId: profileGoal.cardId, alias: profileGoal.alias } : null,
    goalIssue: cardMissing ? 'missing' : null,
    name: user?.name ?? '',
    avatar: user?.avatarDataUrl ?? null,
    theme: user?.theme ?? 'yellow',
  };
}

export function setPresence(patch: Partial<PresenceState>) {
  const store = useAppStore.getState();
  if (patch.name !== undefined || patch.avatar !== undefined) {
    void store.updateUser({
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.avatar !== undefined ? { avatarDataUrl: patch.avatar ?? undefined } : {}),
    });
  }
  if (patch.statusId !== undefined) {
    void store.updateSettings({
      profileStatus: patch.statusId ? { id: patch.statusId, at: new Date().toISOString() } : undefined,
    });
  }
  if (patch.goal !== undefined) {
    void store.updateSettings({
      profileGoal: patch.goal
        ? { kind: 'card', cardId: patch.goal.cardId, ...(patch.goal.alias ? { alias: patch.goal.alias } : {}) }
        : undefined,
    });
  }
}

export const presetOf = (id: string | null) => STATUS_PRESETS.find((preset) => preset.id === id) ?? null;

export function goalPct(goal: PresenceState['goal']) {
  if (!goal) return null;
  const snapshot = buildGoalSnapshot(useAppStore.getState());
  return snapshot ? goalPercent(snapshot) : null;
}

export const statusAgeText = (at: number | null) => {
  if (!at) return '';
  const hours = Math.floor((Date.now() - at) / 3_600_000);
  if (hours < 1) return '刚刚';
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
};
