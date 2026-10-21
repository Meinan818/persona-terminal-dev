import { useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore, toLocalDateKey } from '@/store';
import { useCloudStore } from '@/store/cloud';
import { useCloudSocialStore } from '@/store/cloudSocial';
import { loadSocial } from '@/services/social';
import { hasBeenPrayedByToday, hasPrayedToday } from '@/services/prayers';
import type {
  AttributeId,
  CloudProfile,
  Confidant,
  ConfidantEvent,
  CounselArchive,
  CoopShadow,
  Friendship,
  NotificationEntry,
} from '@/types';

export interface CooperationFriend {
  kind: 'friend';
  id: string;
  profile: CloudProfile;
  prayed: boolean;
  beenPrayedBy: boolean;
  face?: string;
}

export type Pk3NotifType =
  | 'friend_request' | 'friend_accepted' | 'prayer_received' | 'prayer_reciprocal' | 'coop_proposal' | 'coop_accepted'
  | 'coop_shadow_spawned' | 'coop_shadow_attacked' | 'coop_shadow_defeated' | 'pact_invite' | 'pact_nudge' | 'system';

export interface Pk3Notif {
  id: string;
  type: Pk3NotifType;
  from: string;
  body: string;
  read: boolean;
  ago: string;
  battle?: boolean;
  actions?: 'friend' | 'coop' | 'pact';
}

export const PK3_NOTIF_TITLE: Record<Pk3NotifType, string> = {
  friend_request: '好友申请',
  friend_accepted: '接受了你的申请',
  prayer_received: '为你祈愿',
  prayer_reciprocal: '愿望之光交汇',
  coop_proposal: 'COOP 关系提议',
  coop_accepted: '接受了 COOP 提议',
  coop_shadow_spawned: '羁绊之影降临',
  coop_shadow_attacked: '对羁绊之影出手了',
  coop_shadow_defeated: '共同封印了羁绊之影',
  pact_invite: '邀请你一起进步',
  pact_nudge: '催你了',
  system: '系统消息',
};

export const PK3_CONFIDANTS: Confidant[] = [];
export const PK3_FRIENDS: CooperationFriend[] = [];
export const PK3_MATERIALIZE_BLOCKERS: Array<{ otherName: string; arcanaId?: string; bondId?: string }> = [];
export const PK3_COUNSEL_ARCHIVES: CounselArchive[] = [];
export const PK3_NOTIFS: Pk3Notif[] = [];
export const PK3_TODAY = toLocalDateKey();
const emptyProfile = (id: string): CloudProfile => ({
  id,
  userId: id,
  nickname: '',
  totalLv: 0,
  attributeLevels: {},
  lastSyncedAt: new Date(0),
});
export const PK3_PROFILES = {
  fuuka: emptyProfile('fuuka'),
  junpei: emptyProfile('junpei'),
  rise: emptyProfile('rise'),
  yosuke: emptyProfile('yosuke'),
};
export const PK3_PACTS: unknown[] = [];
export const PK3_INTERACTION_AI = { interpretation: '', advice: '', delta: 0 };

const emptyShadow = {
  id: '',
  name: '',
  line: '',
  description: '',
  hpMax: 1,
  hpCurrent: 0,
  weakness: 'guts' as AttributeId,
  comboCount: 0,
  identifiedByMe: false,
  identifiedByPartner: false,
  resonance: { by: 'partner' as 'partner' | 'me', left: '' },
  attackUp: 0,
  vulnerability: 0,
  expiresLeft: '',
};
export const PK3_SHADOW = emptyShadow;
export const PK3_PERSONAS: Array<{
  id: string;
  name: string;
  attr: AttributeId;
  skills: Array<{ id: string; name: string; kind: string; power: number; sp: number; desc: string; turns?: number }>;
}> = [];
export const PK3_BATTLE_LOG: Array<{
  id: string;
  who: 'me' | 'partner';
  persona: string;
  skill: string;
  dmg?: number;
  weakness?: boolean;
  resonance?: boolean;
  crit?: boolean;
  buff?: 'attack_up' | 'vulnerability';
  ago: string;
}> = [];
export const PK3_STARSHIFT = { summary: '', description: '', interpretation: '', advice: '' };

export function pk3Events(confidantId: string): ConfidantEvent[] {
  return useAppStore.getState().confidantEvents
    .filter((event) => event.confidantId === confidantId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function friendOf(friendship: Friendship, prayers: ReturnType<typeof useCloudSocialStore.getState>['todayPrayers']): CooperationFriend | null {
  if (friendship.status !== 'linked' || !friendship.otherProfile) return null;
  const profile = friendship.otherProfile;
  return {
    kind: 'friend',
    id: profile.id,
    profile,
    prayed: hasPrayedToday(profile.id, prayers),
    beenPrayedBy: hasBeenPrayedByToday(profile.id, prayers),
  };
}

function relativeAgo(date: Date): string {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60_000));
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}

function notificationView(entry: NotificationEntry): Pk3Notif {
  const supported: Pk3NotifType[] = [
    'friend_request', 'friend_accepted', 'prayer_received', 'prayer_reciprocal', 'coop_proposal',
    'coop_accepted', 'coop_shadow_spawned', 'coop_shadow_attacked', 'coop_shadow_defeated', 'system',
  ];
  const type = supported.includes(entry.type as Pk3NotifType) ? entry.type as Pk3NotifType : 'system';
  const from = entry.fromProfile?.nickname || entry.fromProfile?.userId || '系统';
  const payload = entry.payload ?? {};
  const body = typeof payload.body === 'string'
    ? payload.body
    : type === 'system' ? '关系数据有更新。' : `${from} 发来一条关系动态。`;
  return {
    id: entry.id,
    type,
    from,
    body,
    read: entry.read,
    ago: relativeAgo(entry.createdAt),
    battle: type.startsWith('coop_shadow_'),
    actions: type === 'friend_request' ? 'friend' : type === 'coop_proposal' ? 'coop' : undefined,
  };
}

export function useCooperationData() {
  const {
    confidants, confidantEvents, counselArchives, settings,
    loadConfidants, loadCounsel, getCounselCooldown, hasActiveCounsel,
  } = useAppStore(useShallow((state) => ({
    confidants: state.confidants,
    confidantEvents: state.confidantEvents,
    counselArchives: state.counselArchives,
    settings: state.settings,
    loadConfidants: state.loadConfidants,
    loadCounsel: state.loadCounsel,
    getCounselCooldown: state.getCounselCooldown,
    hasActiveCounsel: state.hasActiveCounsel,
  })));
  const cloudUser = useCloudStore((state) => state.cloudUser);
  const {
    friendships, notifications, unreadCount, importantUnreadCount, todayPrayers,
    materializeBlockers, coopShadows,
  } = useCloudSocialStore(useShallow((state) => ({
    friendships: state.friendships,
    notifications: state.notifications,
    unreadCount: state.unreadCount,
    importantUnreadCount: state.importantUnreadCount,
    todayPrayers: state.todayPrayers,
    materializeBlockers: state.materializeBlockers,
    coopShadows: state.coopShadows,
  })));

  useEffect(() => {
    void loadConfidants();
    void loadCounsel();
  }, [loadConfidants, loadCounsel]);
  useEffect(() => {
    if (cloudUser) void loadSocial();
  }, [cloudUser?.id]);

  const friends = useMemo(
    () => friendships.map((friendship) => friendOf(friendship, todayPrayers)).filter((item): item is CooperationFriend => !!item),
    [friendships, todayPrayers],
  );
  const notificationItems = useMemo(() => notifications.map(notificationView), [notifications]);
  const activeShadows = useMemo(() => coopShadows.filter((shadow) => shadow.status === 'active'), [coopShadows]);
  const counselCooldown = getCounselCooldown();

  return {
    confidants,
    confidantEvents,
    counselArchives,
    settings,
    cloudUser,
    friends,
    notifications: notificationItems,
    unreadCount,
    importantUnreadCount,
    todayPrayers,
    materializeBlockers,
    coopShadows,
    activeShadows,
    counselState: hasActiveCounsel() ? 'active' as const : counselCooldown.locked ? 'cooldown' as const : 'available' as const,
    counselCooldownDate: counselCooldown.nextAvailableDate ?? '',
  };
}

export function shadowForConfidant(shadow: CoopShadow | undefined, cloudUserId?: string) {
  if (!shadow) return emptyShadow;
  return {
    ...emptyShadow,
    id: shadow.id,
    name: shadow.nameOverride || shadow.shadowId,
    hpMax: shadow.hpMax,
    hpCurrent: shadow.hpCurrent,
    weakness: shadow.weaknessAttribute,
    comboCount: shadow.comboCount,
    identifiedByMe: cloudUserId ? (shadow.userAId === cloudUserId ? shadow.identifiedByA : shadow.identifiedByB) : false,
    identifiedByPartner: cloudUserId ? (shadow.userAId === cloudUserId ? shadow.identifiedByB : shadow.identifiedByA) : false,
  };
}
