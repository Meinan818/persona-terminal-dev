/**
 * 红色据点（hideout）的真实数据派生层。
 *
 * 计划01接通组织、名册、动态、进行中作战的读取与空态；计划08补齐多组织、
 * 纪要、结束作战历史、成员称号/点数与团战投影。写操作仍由 orgSync/orgOpsSync 负责，
 * 这里不做本地乐观写入。
 * 真实来源是 cloudSocial 的 orgs（OrgView：org / members / posts / reactions / ops / checkins）。
 *
 * 这里只做数据映射，不碰任何渲染：页面继续用原来的 MEM / ORG / POSTS / OPS 结构，
 * 以上读取范围内没有真实数据就是空数组 / 空值，不回填演示内容。
 */
import { useCloudSocialStore } from '@/store/cloudSocial';
import { useCloudStore } from '@/store/cloud';
import { TAROT_BY_ID } from '@/constants/tarot';
import type { OrgMember, OrgMinutesSnapshot, OrgPost, OrgView } from '@/types';
import { endedOrgOps, orgRaidCardData } from '@/themes/orgData';
import { opsForBoard, orgLevelOfView } from '@/utils/orgOps';
import { orgWeekKey, zonedDay } from '@/utils/orgLogic';

/** 红色成员结构（与 hideout.ts 里的 MEM 同形）。 */
export interface RedMember {
  id: string;
  seat: number;
  name: string;
  /** [中文名, 英文名, 罗马数字] */
  card: [string, string, string];
  me: boolean;
  leader: boolean;
  lv: number;
  status: string | null;
  streak: number;
  /** 本周出勤位图（bit0 = 周一） */
  week: number;
  titles: string[];
  goal: string | null;
  result: string | null;
  masks: string[];
  joined: string;
  /** 五维等级 */
  stats: number[];
  /** 五维累计点数 */
  points: number[];
  absent?: boolean;
}

export interface RedOrg {
  name: string;
  motto: string;
  code: string;
  emblem: string;
  level: number;
  lvName: string;
  xp: number;
  floor: number;
  next: number | null;
  mult: number;
  tz: string;
}

export interface RedPost {
  id: string;
  kind: 'moment' | 'op' | 'raid';
  by: string;
  byName: string;
  who: string[][];
  won: string;
  day: number;
  ago: string;
  text: string;
  chips: string[];
  tags: Record<string, string[]>;
  mine: string | null;
}

export interface RedOp {
  id: string;
  big: boolean;
  title: string;
  due: number;
  by: string;
  attr: string;
  done: number;
  counted: number;
  rows: string[][];
}

export interface RedHistory {
  id: string;
  status: 'achieved' | 'failed' | 'cancelled';
  title: string;
  done: number;
  counted: number;
  day: string;
}

export interface RedMinutes extends OrgMinutesSnapshot {
  /** 纪要发布时冻结的代号映射；展示层用这个，不拿当前名册猜。 */
  names: Record<string, string>;
}

export interface RedRaid {
  boss: string;
  left: number;
  hpMax: number;
  hitters: Array<{ userId: string; name: string; nights: number; allout: boolean }>;
}

export interface RedOrgChoice {
  id: string;
  name: string;
  emblem: string;
  slot: 'own' | 'joined';
  members: number;
}

export interface RedHideout {
  org: RedOrg | null;
  members: RedMember[];
  posts: RedPost[];
  ops: RedOp[];
  history: RedHistory[];
  minutes: RedMinutes | null;
  raid: RedRaid | null;
  orgs: RedOrgChoice[];
  /** 是否存在真实组织（成员为空也可以安全渲染）。 */
  hasData: boolean;
  /** 是否已登录云端（false 时页面显示「登录之后才能用组织」） */
  signedIn: boolean;
  /** 社交组织还没拉完。 */
  loading: boolean;
  /** 最近一次组织同步失败原因；没拿到组织时不把失败当空组织。 */
  error: string | null;
  boardLoaded: boolean;
  opsFailed: boolean;
  raidsFailed: boolean;
}

const ATTR_ORDER = ['knowledge', 'guts', 'dexterity', 'kindness', 'charm'] as const;

const pad2 = (n: number) => String(n).padStart(2, '0');

/** 塔罗 id → 红色名册用的 [中文名, 英文名, 罗马数字] */
function tarotCard(id: string | undefined): [string, string, string] {
  const t = id ? TAROT_BY_ID[id] : undefined;
  return [t?.name ?? '', (t?.nameEn ?? '').toUpperCase(), t?.roman ?? ''];
}

/** 日期 → 「2026.09.13」式 */
function joinedOf(d: Date | string | undefined): string {
  if (!d) return '';
  const x = new Date(d);
  if (Number.isNaN(+x)) return '';
  return `${x.getFullYear()}.${pad2(x.getMonth() + 1)}.${pad2(x.getDate())}`;
}

/** 相对天数（0 = 今天） */
function daysAgo(d: Date | string | undefined): number {
  if (!d) return 0;
  const x = new Date(d);
  if (Number.isNaN(+x)) return 0;
  const a = new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const b = new Date();
  const t = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((t - a) / 864e5);
}

/** 「刚刚 / N 小时前 / N 天前」 */
function agoText(d: Date | string | undefined): string {
  if (!d) return '';
  const x = new Date(d);
  if (Number.isNaN(+x)) return '';
  const mins = Math.round((Date.now() - x.getTime()) / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.round(hours / 24);
  return days <= 1 ? '昨天' : `${days} 天前`;
}

function memberOf(view: OrgView, m: OrgMember, titles: Map<string, string[]>): RedMember {
  const card = m.card ?? ({} as OrgMember['card']);
  const week = orgWeekKey(new Date(), view.org.tz);
  const stats = ATTR_ORDER.map((id) => {
    const a = (card.attrs ?? []).find((x) => x.id === id);
    return a ? a.level : 0;
  });
  const points = ATTR_ORDER.map((id) => {
    const a = (card.attrs ?? []).find((x) => x.id === id);
    return a?.points ?? 0;
  });
  const masks = (card.personas ?? (card.persona ? [card.persona] : [])).map((p) => p.name).filter(Boolean);
  const weekBits = card.week?.days ?? 0;
  // 本周一个格都没出勤 → 标「本周缺席」
  const absent = weekBits === 0 && (card.week != null);
  return {
    id: m.userId,
    seat: m.seat ?? 0,
    name: m.codename ?? '未命名成员',
    card: tarotCard(m.tarotId),
    me: m.userId === view.me?.userId,
    leader: m.userId === view.org.leaderId,
    lv: card.lv ?? 0,
    status: null,
    streak: card.streak ?? 0,
    week: weekBits,
    titles: titles.get(m.userId) ?? [],
    goal: m.goalWeek === week ? m.goal ?? null : null,
    result: m.resultWeek === week ? m.result ?? null : null,
    masks,
    joined: joinedOf(m.createdAt),
    stats,
    points,
    absent,
  };
}

function latestMinutesOf(view: OrgView): OrgMinutesSnapshot | null {
  return [...(view.posts ?? [])]
    .filter((p): p is OrgPost & { minutes: OrgMinutesSnapshot } => p.kind === 'minutes' && !!p.minutes)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]?.minutes ?? null;
}

/** 从 OrgView 派生红色据点需要的全部真实数据。 */
export function getRedHideoutData(orgId?: string | null): RedHideout {
  const social = useCloudSocialStore.getState();
  const orgs = social.orgs ?? [];
  const signedIn = !!useCloudStore.getState().cloudUser;
  const view = (orgId ? orgs.find((x) => x.org.id === orgId) : undefined) ?? orgs.find((x) => x.org.id === social.hideoutOrgId) ?? orgs[0] as OrgView | undefined;
  const orgChoices: RedOrgChoice[] = orgs.map((x) => ({
    id: x.org.id,
    name: x.org.name,
    emblem: x.org.emblem,
    slot: x.me.slot,
    members: x.members.length,
  }));
  const loading = signedIn && !social.orgsLoaded && !social.lastError;
  const error = signedIn && social.lastError ? social.lastError : null;
  if (!signedIn || !view || !view.org) {
    return {
      org: null, members: [], posts: [], ops: [], history: [], minutes: null, raid: null,
      orgs: orgChoices, hasData: false, signedIn, loading, error,
      boardLoaded: false, opsFailed: false, raidsFailed: false,
    };
  }
  const latestMinutes = latestMinutesOf(view);
  const titleMap = new Map<string, string[]>();
  for (const row of latestMinutes?.titles ?? []) {
    titleMap.set(row.userId, [...(titleMap.get(row.userId) ?? []), row.title]);
  }
  const members = (view.members ?? []).map((m) => memberOf(view, m, titleMap));
  const myId = view.me?.userId ?? '';

  // 动态：只取真实动态（kind = moment），作战达成卡 / 纪要各走自己的区
  const posts: RedPost[] = (view.posts ?? []).filter(p => p.kind === 'moment' || (p.kind === 'operation' && p.opCard)).map((p: OrgPost) => {
    const snap = p.snapshot;
    const chips: string[] = [];
    for (const [k, v] of Object.entries(snap?.pts ?? {})) {
      const label = snap?.names?.[k as never] ?? k;
      chips.push(`${label} +${v}`);
    }
    if (snap?.kind === 'important') chips.push('重要');
    const author = members.find((m) => m.id === p.userId);
    const tags: Record<string, string[]> = {};
    const reactions = (view.reactions ?? []).filter(r => r.postId === p.id);
    for (const r of reactions) (tags[r.tag] ??= []).push(r.userId);
    return {
      id: p.id,
      kind: (p.kind === 'moment' ? 'moment' : 'op') as RedPost['kind'],
      by: author?.id ?? p.userId,
      byName: author?.name ?? snap?.by?.codename ?? '已离开',
      who: (p.opCard?.participants ?? []).map(m => [m.codename]),
      won: p.opCard ? `${p.opCard.day} 达成` : '',
      day: -daysAgo(p.opCard?.day ?? snap?.date ?? p.createdAt),
      ago: agoText(p.createdAt),
      text: p.kind === 'operation' ? p.opCard!.title : p.text,
      chips,
      tags,
      mine: reactions.find(r => r.userId === myId)?.tag ?? null,
    };
  });

  // 作战：真实 OrgOperation
  const ops: RedOp[] = opsForBoard(view).active.map((p) => {
    const o = p.op;
    return {
      id: o.id,
      big: o.kind === 'big',
      title: o.title ?? '',
      due: p.daysLeft,
      by: o.initiatorId,
      attr: o.attr ?? 'knowledge',
      done: p.done,
      counted: p.counted,
      rows: p.rows.map(r => [r.userId, r.task, r.source, r.state]),
    };
  });

  const today = zonedDay(new Date(), view.org.tz).key;
  const history: RedHistory[] = endedOrgOps(view, today)
    .filter((h): h is typeof h & { status: RedHistory['status'] } => h.status !== null)
    .map((h) => ({
      id: h.id,
      status: h.status,
      title: h.title,
      done: h.done,
      counted: h.counted,
      day: h.day,
    }));

  const minutes: RedMinutes | null = latestMinutes ? {
    ...latestMinutes,
    names: Object.fromEntries([
      ...latestMinutes.done,
      ...latestMinutes.goals,
      ...latestMinutes.titles,
      ...latestMinutes.absent,
    ].map((row) => [row.userId, row.codename])),
  } : null;

  const raidCard = orgRaidCardData(view);
  const raid: RedRaid | null = raidCard ? {
    boss: raidCard.boss,
    left: raidCard.left,
    hpMax: raidCard.hpMax,
    hitters: raidCard.hitters.map((h) => ({
      userId: h.userId,
      name: members.find((m) => m.id === h.userId)?.name ?? '已离开的成员',
      nights: h.nights,
      allout: h.allout,
    })),
  } : null;

  const level = orgLevelOfView(view);
  return {
    org: {
      name: view.org.name ?? '',
      motto: view.org.motto ?? '',
      code: view.org.inviteCode ?? '',
      emblem: view.org.emblem ?? 'star',
      ...level,
      lvName: view.org.custom?.levelNames?.[level.level - 1] ?? '',
      tz: view.org.tz ?? 'Asia/Shanghai',
    },
    members,
    posts,
    ops,
    history,
    minutes,
    raid,
    orgs: orgChoices,
    hasData: true,
    signedIn,
    loading,
    error,
    boardLoaded: view.posts !== undefined,
    opsFailed: !!view.opsFailed,
    raidsFailed: !!view.raidsFailed,
  };
}
