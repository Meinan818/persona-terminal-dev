/**
 * 名片状态 / 目标 / 资料 store。
 * 名字与头像读写真实 user（Dexie + 云端 push）；状态/目标仍是本地 demo 口径。
 */
import { useSyncExternalStore } from 'react';
import { CALLING_CARDS, STATUS_PRESETS, USER } from '@yellow/adapters/pkg5';
import { useAppStore } from '@/store';

export interface PresenceState {
  statusId: string | null;
  statusSetAt: number | null;
  goal: { cardId: string; alias?: string } | null;
  goalIssue: null | 'audit' | 'missing';
  name: string;
  avatar: string | null;
  theme: string;
}
const realUser = useAppStore.getState().user;
let state: PresenceState = {
  statusId: 'create',
  statusSetAt: Date.now() - 2 * 3600_000,
  goal: { cardId: 'cc_1' },
  goalIssue: null,
  name: realUser?.name ?? USER.name,
  avatar: realUser?.avatarDataUrl ?? null,
  theme: realUser?.theme ?? 'yellow',
};
const ls = new Set<() => void>();
export const setPresence = (p: Partial<PresenceState>) => {
  state = { ...state, ...p };
  ls.forEach((l) => l());
  const store = useAppStore.getState();
  if (!store.user) return;
  if (typeof p.name === 'string' && p.name.trim() && p.name.trim() !== store.user.name) {
    void store.updateUser({ name: p.name });
  }
  if ('avatar' in p && (p.avatar ?? undefined) !== store.user.avatarDataUrl) {
    void store.updateUser({ avatarDataUrl: p.avatar ?? undefined });
  }
};
useAppStore.subscribe((s, prev) => {
  if (s.user === prev.user) return;
  const name = s.user?.name ?? '';
  const avatar = s.user?.avatarDataUrl ?? null;
  const theme = s.user?.theme ?? state.theme;
  if (name === state.name && avatar === state.avatar && theme === state.theme) return;
  state = { ...state, name, avatar, theme };
  ls.forEach((l) => l());
});
export const usePresence = () => useSyncExternalStore((f) => { ls.add(f); return () => { ls.delete(f); }; }, () => state, () => state);
export const presetOf = (id: string | null) => STATUS_PRESETS.find((p) => p.id === id) ?? null;
export const goalPct = (g: PresenceState['goal']) => (g ? CALLING_CARDS.find((c) => c.id === g.cardId)?.pct ?? null : null);
export const statusAgeText = (at: number | null) => { if (!at) return ''; const h = Math.floor((Date.now() - at) / 3600_000); return h < 1 ? '刚刚' : `${h} 小时前`; };
