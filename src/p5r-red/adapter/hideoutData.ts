/**
 * 红色据点（hideout）的真实数据派生层。
 *
 * 计划01接通组织、名册、动态、进行中作战的读取与空态；
 * 历史、纪要、团战与写操作仍留给计划08，不在这里补演示数据。
 * 真实来源是 cloudSocial 的 orgs（OrgView：org / members / posts / reactions / ops / checkins）。
 *
 * 这里只做数据映射，不碰任何渲染：页面继续用原来的 MEM / ORG / POSTS / OPS 结构，
 * 以上读取范围内没有真实数据就是空数组 / 空值，不回填演示内容。
 */
import { useCloudSocialStore } from '@/store/cloudSocial';
import { useCloudStore } from '@/store/cloud';
import { TAROT_BY_ID } from '@/constants/tarot';
import type { OrgMember, OrgPost, OrgView } from '@/types';
import { opsForBoard, orgLevelOfView } from '@/utils/orgOps';

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

export interface RedHideout {
  org: RedOrg | null;
  members: RedMember[];
  posts: RedPost[];
  ops: RedOp[];
  /** 是否存在真实组织（成员为空也可以安全渲染）。 */
  hasData: boolean;
  /** 是否已登录云端（false 时页面显示「登录之后才能用组织」） */
  signedIn: boolean;
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

function memberOf(view: OrgView, m: OrgMember): RedMember {
  const card = m.card ?? ({} as OrgMember['card']);
  const stats = ATTR_ORDER.map((id) => {
    const a = (card.attrs ?? []).find((x) => x.id === id);
    return a ? a.level : 0;
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
    titles: [],
    goal: m.goal ?? null,
    result: m.result ?? null,
    masks,
    joined: joinedOf(m.createdAt),
    stats,
    absent,
  };
}

/** 从 OrgView 派生红色据点需要的全部真实数据。 */
export function getRedHideoutData(): RedHideout {
  const orgs = useCloudSocialStore.getState().orgs ?? [];
  const signedIn = !!useCloudStore.getState().cloudUser;
  const view = orgs[0] as OrgView | undefined;
  if (!signedIn || !view || !view.org) {
    return { org: null, members: [], posts: [], ops: [], hasData: false, signedIn };
  }
  const members = (view.members ?? []).map((m) => memberOf(view, m));
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
    hasData: true,
    signedIn,
  };
}
