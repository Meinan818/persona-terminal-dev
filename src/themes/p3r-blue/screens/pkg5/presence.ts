/**
 * 名片状态 / 目标 / 资料 的 demo 本地 store（真实：settings.profileStatus / profileGoal / user / theme）。
 * 菜单 MEMBER PASS 与用户资料抽屉共享；useSyncExternalStore，无持久化。改写自黄色版 pkg5/presence.ts。
 */
import { useSyncExternalStore } from 'react';
import { CALLING_CARDS, STATUS_PRESETS, USER } from '@blue/mock/pkg5';

export interface PresenceState {
  statusId: string | null;
  statusSetAt: number | null;
  goal: { cardId: string; alias?: string } | null;
  goalIssue: null | 'audit' | 'missing';
  name: string;
  avatar: string | null;
  theme: string;
}
let state: PresenceState = { statusId: 'create', statusSetAt: Date.now() - 2 * 3600_000, goal: { cardId: 'cc_1' }, goalIssue: null, name: USER.name, avatar: null, theme: 'blue' };
const ls = new Set<() => void>();
export const setPresence = (p: Partial<PresenceState>) => { state = { ...state, ...p }; ls.forEach((l) => l()); };
export const usePresence = () => useSyncExternalStore((f) => { ls.add(f); return () => { ls.delete(f); }; }, () => state, () => state);
export const presetOf = (id: string | null) => STATUS_PRESETS.find((p) => p.id === id) ?? null;
export const goalPct = (g: PresenceState['goal']) => (g ? CALLING_CARDS.find((c) => c.id === g.cardId)?.pct ?? null : null);
export const statusAgeText = (at: number | null) => { if (!at) return ''; const h = Math.floor((Date.now() - at) / 3600_000); return h < 1 ? '刚刚' : `${h} 小时前`; };
