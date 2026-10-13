/**
 * orgsApi —— 组织模块的自研后端数据源（社交迁移 W3 第五波 第一步）。
 *
 * 契约：后端 /api/social/orgs*（OrgController）。屏蔽词 / 长度校验 / 卡片计算留在前端
 * 纯逻辑（分流前已做），后端只负责落库 + 唯一索引兜底 + 队长身份校验。
 *
 * 错误语义（与 PB 不同，勿照抄）：
 *  · 越权（非成员 / 非队长）→ HTTP 404 + body.message（与「不存在」不可区分）
 *  · 业务拒绝（名额已用 / 满员 / 名字空）→ HTTP 400 + body.message
 *  前端把 body.message 当作人话直接抛（后端文案已逐字对齐前端）。
 */
import { velvetRequest } from './velvetApi';
import type { OpDraft } from '@/utils/orgOps';
import { parseRaidBoss, RAID_ATTRS } from '@/utils/orgRaid';
import type {
  Org, OrgCustom, OrgMember, OrgMemberCard, OrgCodenameKind,
  OrgPost, OrgReaction, OrgReactionTag, OrgPostSnapshot, OrgMinutesSnapshot, OrgOpCardSnapshot,
  OrgOperation, OrgCheckin, OrgRaid, OrgRaidHit, OrgRaidBoss, AttributeId,
} from '@/types';

/** 后端成员视图 → 前端 OrgMember */
interface RawMember {
  id: string;
  orgId: string;
  userId: string;
  slot: string;
  seat: number;
  codename: string;
  codenameKind: string;
  tarotId?: string | null;
  avatarUrl?: string | null;
  card?: Record<string, unknown> | null;
  goal?: string | null;
  goalWeek?: string | null;
  result?: string | null;
  resultWeek?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface RawOrg {
  id: string;
  name: string;
  motto: string;
  emblem: string;
  leaderId: string;
  inviteCode: string;
  tz: string;
  custom?: OrgCustom | null;
  createdAt: string;
  updatedAt: string;
}

const CODENAME_KINDS: readonly OrgCodenameKind[] = ['custom', 'nickname', 'tarot'];
const RESULTS = ['done', 'partial', 'missed'] as const;

function mapOrg(r: RawOrg): Org {
  return {
    id: r.id,
    name: r.name || '',
    motto: r.motto || '',
    emblem: r.emblem || 'star',
    leaderId: r.leaderId || '',
    inviteCode: r.inviteCode || '',
    tz: r.tz || 'UTC',
    custom: r.custom ?? undefined,
    createdAt: new Date(r.createdAt),
    updatedAt: new Date(r.updatedAt),
  };
}

function mapMember(r: RawMember): OrgMember {
  return {
    id: r.id,
    orgId: r.orgId || '',
    userId: r.userId || '',
    slot: r.slot === 'own' ? 'own' : 'joined',
    seat: typeof r.seat === 'number' ? r.seat : Number(r.seat) || 0,
    codename: r.codename || '',
    codenameKind: CODENAME_KINDS.includes(r.codenameKind as OrgCodenameKind) ? (r.codenameKind as OrgCodenameKind) : 'nickname',
    tarotId: r.tarotId || undefined,
    avatarUrl: r.avatarUrl || undefined,
    card: (r.card as OrgMemberCard | null | undefined) ?? { streak: 0, persona: null, at: new Date().toISOString() },
    goal: r.goal || undefined,
    goalWeek: r.goalWeek || undefined,
    result: (RESULTS as readonly string[]).includes(String(r.result)) ? (r.result as OrgMember['result']) : undefined,
    resultWeek: r.resultWeek || undefined,
    createdAt: new Date(r.createdAt),
    updatedAt: new Date(r.updatedAt),
  };
}

/** 后端错误 → 前端语义：把 body.message 当人话抛（后端文案已逐字对齐前端）。
 *  用属性形状判断而非 instanceof——避免 ESM 模块图下 VelvetApiError 出现多份引用时漏判。 */
function translate(err: unknown, fallback: string): Error {
  // 后端返回了带 body 的错误（VelvetApiError 形状）：优先用 body.message 当人话
  if (err && typeof err === 'object' && 'status' in err && 'body' in err) {
    const msg = (err.body as { message?: string } | null)?.message;
    if (typeof msg === 'string' && msg) return new Error(msg);
    // 后端没给可读文案（body 空 / 无 message）→ 用调用方兜底，不透传技术黑话
    return new Error(fallback);
  }
  return err instanceof Error ? err : new Error(fallback);
}

async function guard<T>(fn: () => Promise<T>, fallback: string): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    throw translate(err, fallback);
  }
}

// ── 读 ────────────────────────────────────────────────

/** 我加入的全部组织（{org, member} 列表）。 */
export async function listMine(): Promise<Array<{ org: Org; member: OrgMember }>> {
  const res = await velvetRequest<{ items: Array<{ org: RawOrg; member: RawMember }> }>('/api/social/orgs');
  return (res.items ?? []).map(it => ({ org: mapOrg(it.org), member: mapMember(it.member) }));
}

/** 某组织全体成员（按座位）。 */
export async function members(orgId: string): Promise<OrgMember[]> {
  const res = await velvetRequest<{ items: RawMember[] }>(`/api/social/orgs/${orgId}/members`);
  return (res.items ?? []).map(mapMember);
}

/** 单个组织。 */
export async function fetch(orgId: string): Promise<Org> {
  return mapOrg(await velvetRequest<RawOrg>(`/api/social/orgs/${orgId}`));
}

/** 凭邀请码预览；码不对返回 null。 */
export async function preview(code: string): Promise<Org | null> {
  const raw = await velvetRequest<RawOrg | null>(`/api/social/orgs/preview?code=${encodeURIComponent(code)}`);
  return raw ? mapOrg(raw) : null;
}

// ── 建立 / 加入 ───────────────────────────────────────

export interface CreateApiInput { name: string; motto: string; emblem: string; tz: string; codename: string }

/** 建组织（队长 = 我，坐 1 号座位）。 */
export async function create(input: CreateApiInput): Promise<{ org: Org; member: OrgMember }> {
  const res = await guard(
    () => velvetRequest<{ org: RawOrg; member: RawMember }>('/api/social/orgs', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
    '组织没建成，稍后再试',
  );
  return { org: mapOrg(res.org), member: mapMember(res.member) };
}

/** 凭码加入（座位由后端从 1 号往后分配）。 */
export async function join(code: string, codename: string): Promise<{ org: Org; member: OrgMember }> {
  const res = await guard(
    () => velvetRequest<{ org: RawOrg; member: RawMember }>('/api/social/orgs/join', {
      method: 'POST',
      body: JSON.stringify({ code, codename }),
    }),
    '没能加入，稍后再试',
  );
  return { org: mapOrg(res.org), member: mapMember(res.member) };
}

// ── 改 ───────────────────────────────────────────────

export async function updateProfile(orgId: string, draft: { name: string; motto: string; emblem: string }): Promise<Org> {
  return guard(
    async () => mapOrg(await velvetRequest<RawOrg>(`/api/social/orgs/${orgId}`, {
      method: 'PUT',
      body: JSON.stringify(draft),
    })),
    '没改成，稍后再试',
  );
}

/** 改自定义；custom=null 表示清空。 */
export async function updateCustom(orgId: string, custom: OrgCustom | null): Promise<Org> {
  return guard(
    async () => mapOrg(await velvetRequest<RawOrg>(`/api/social/orgs/${orgId}/custom`, {
      method: 'PUT',
      body: JSON.stringify({ custom }),
    })),
    '没存上，稍后再试',
  );
}

/** 换邀请码。 */
export async function rotate(orgId: string): Promise<Org> {
  return guard(
    async () => mapOrg(await velvetRequest<RawOrg>(`/api/social/orgs/${orgId}/rotate`, {
      method: 'POST',
      body: JSON.stringify({}),
    })),
    '没换成，稍后再试',
  );
}

export interface MemberApiPatch {
  codename?: string;
  codenameKind?: OrgCodenameKind;
  tarotId?: string;
  card?: OrgMemberCard;
  goal?: string;
  goalWeek?: string;
  result?: 'done' | 'partial' | 'missed';
  resultWeek?: string;
}

/** 改自己那一行（按 memberId 定位，后端校验归属）。 */
export async function updateMember(memberId: string, patch: MemberApiPatch): Promise<OrgMember> {
  return guard(
    async () => mapMember(await velvetRequest<RawMember>(`/api/social/orgs/members/${memberId}`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    })),
    '没存上，稍后再试',
  );
}

/** 位置校正：只改 slot。 */
export async function setSlot(memberId: string, slot: 'own' | 'joined'): Promise<OrgMember> {
  return guard(
    async () => mapMember(await velvetRequest<RawMember>(`/api/social/orgs/members/${memberId}/slot`, {
      method: 'PUT',
      body: JSON.stringify({ slot }),
    })),
    '没存上，稍后再试',
  );
}

// ── 退出 / 请离 / 转让 / 解散 ─────────────────────────

export async function leave(orgId: string): Promise<void> {
  await guard(
    () => velvetRequest<{ ok: boolean }>(`/api/social/orgs/${orgId}/leave`, { method: 'POST', body: JSON.stringify({}) }),
    '没能退出，稍后再试',
  );
}

/** 请离；返回 rotated（换码后的组织，失败为 null）。 */
export async function kick(orgId: string, memberId: string): Promise<{ rotated: Org | null }> {
  const res = await guard(
    () => velvetRequest<{ rotated: RawOrg | null }>(`/api/social/orgs/${orgId}/kick/${memberId}`, { method: 'POST', body: JSON.stringify({}) }),
    '没能请离，稍后再试',
  );
  return { rotated: res.rotated ? mapOrg(res.rotated) : null };
}

export async function transfer(orgId: string, toMemberId: string, alsoLeave: boolean): Promise<void> {
  await guard(
    () => velvetRequest<{ ok: boolean }>(`/api/social/orgs/${orgId}/transfer`, {
      method: 'POST',
      body: JSON.stringify({ toMemberId, alsoLeave }),
    }),
    '没转让成，稍后再试',
  );
}

export async function dissolve(orgId: string): Promise<void> {
  await guard(
    () => velvetRequest<{ ok: boolean }>(`/api/social/orgs/${orgId}`, { method: 'DELETE' }),
    '没能解散，稍后再试',
  );
}

// ── 公告板（W3 第五波 第二步）────────────────────────────

interface RawPost {
  id: string;
  orgId: string;
  userId: string;
  kind: string;
  text: string;
  snapshot?: unknown;
  weekKey?: string | null;
  createdAt: string;
}

interface RawReaction {
  id: string;
  postId: string;
  orgId: string;
  userId: string;
  tag: string;
  createdAt: string;
  updatedAt: string;
}

function mapPostRow(r: RawPost): OrgPost {
  const kind = r.kind === 'minutes' ? 'minutes' : r.kind === 'operation' ? 'operation' : 'moment';
  return {
    id: r.id,
    orgId: r.orgId || '',
    userId: r.userId || '',
    kind,
    text: r.text || '',
    snapshot: kind === 'moment' ? (r.snapshot as OrgPost['snapshot']) ?? null : null,
    minutes: kind === 'minutes' ? (r.snapshot as OrgPost['minutes']) ?? null : null,
    ...(kind === 'operation' ? { opCard: (r.snapshot as OrgPost['opCard']) ?? null } : {}),
    weekKey: r.weekKey || undefined,
    createdAt: new Date(r.createdAt),
  };
}

function mapReactionRow(r: RawReaction): OrgReaction {
  return {
    id: r.id,
    postId: r.postId || '',
    orgId: r.orgId || '',
    userId: r.userId || '',
    tag: (r.tag as OrgReaction['tag']) || 'strong',
    createdAt: new Date(r.createdAt),
    updatedAt: new Date(r.updatedAt || r.createdAt),
  };
}

/** 最近 30 天最多 100 条动态 + 标签。 */
export async function board(orgId: string): Promise<{ posts: OrgPost[]; reactions: OrgReaction[] }> {
  const res = await velvetRequest<{ posts: RawPost[]; reactions: RawReaction[] }>(`/api/social/orgs/${orgId}/board`);
  return {
    posts: (res.posts ?? []).map(mapPostRow),
    reactions: (res.reactions ?? []).map(mapReactionRow),
  };
}

/** 全部纪要 + 达成卡（不限 30 天）。 */
export async function ledger(orgId: string): Promise<OrgPost[]> {
  const res = await velvetRequest<{ items: RawPost[] }>(`/api/social/orgs/${orgId}/ledger`);
  return (res.items ?? []).map(mapPostRow);
}

/** 发动态。 */
export async function createMoment(orgId: string, text: string, snapshot: OrgPostSnapshot): Promise<OrgPost> {
  return guard(
    async () => mapPostRow(await velvetRequest<RawPost>(`/api/social/orgs/${orgId}/moments`, {
      method: 'POST',
      body: JSON.stringify({ text, snapshot }),
    })),
    '没分享出去，稍后再试',
  );
}

/** 贴/换/撤标签。撤 → null。 */
export async function setReaction(orgId: string, postId: string, tag: OrgReactionTag): Promise<OrgReaction | null> {
  const raw = await guard(
    () => velvetRequest<RawReaction | null>(`/api/social/orgs/${orgId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ postId, tag }),
    }),
    '没贴上，稍后再试',
  );
  return raw ? mapReactionRow(raw) : null;
}

/** 删动态（自己的，或队长删任何一条）。 */
export async function deletePost(postId: string): Promise<void> {
  await guard(
    () => velvetRequest<{ ok: boolean }>(`/api/social/posts/${postId}`, { method: 'DELETE' }),
    '没删掉，稍后再试',
  );
}

/** 举报一条动态。 */
export async function report(input: { postId: string; orgId: string; targetUserId: string; reason: string; textCopy: string }): Promise<void> {
  await guard(
    () => velvetRequest<{ ok: boolean }>('/api/social/orgs/reports', { method: 'POST', body: JSON.stringify(input) }),
    '举报没发出去，稍后再试',
  );
}

/** 发会议纪要（id 由前端确定）；撞了返回 null。 */
export async function createMinutes(orgId: string, id: string, weekKey: string, snapshot: OrgMinutesSnapshot): Promise<OrgPost | null> {
  const raw = await velvetRequest<RawPost | null>(`/api/social/orgs/${orgId}/minutes`, {
    method: 'POST',
    body: JSON.stringify({ id, weekKey, snapshot }),
  });
  return raw ? mapPostRow(raw) : null;
}

/** 发作战达成卡（id 由前端确定）；撞了返回 null。 */
export async function createOpCard(orgId: string, id: string, weekKey: string, snapshot: OrgOpCardSnapshot): Promise<OrgPost | null> {
  const raw = await velvetRequest<RawPost | null>(`/api/social/orgs/${orgId}/opcards`, {
    method: 'POST',
    body: JSON.stringify({ id, weekKey, snapshot }),
  });
  return raw ? mapPostRow(raw) : null;
}

/** 删掉某人在这个组织的动态和标签。 */
export async function purgeUser(orgId: string, userId: string): Promise<void> {
  await velvetRequest<{ ok: boolean }>(`/api/social/orgs/${orgId}/purge/${userId}`, { method: 'POST', body: JSON.stringify({}) });
}

// ── 作战（W3 第五波 第三步）────────────────────────────

interface RawOperation {
  id: string;
  orgId: string;
  initiatorId: string;
  kind: string;
  attr: string;
  title: string;
  deadline: string;
  participants: string[];
  assignments: Record<string, string>;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface RawCheckin {
  id: string;
  operationId: string;
  orgId: string;
  userId: string;
  kind: string;
  day: string;
  text: string;
  createdAt: string;
}

function mapOpRow(r: RawOperation): OrgOperation {
  return {
    id: r.id,
    orgId: r.orgId || '',
    initiatorId: r.initiatorId || '',
    kind: r.kind === 'big' ? 'big' : 'small',
    attr: r.attr as OrgOperation['attr'],
    title: r.title || '',
    deadline: r.deadline || '',
    participants: r.participants ?? [],
    assignments: r.assignments ?? {},
    status: r.status === 'cancelled' ? 'cancelled' : 'active',
    createdAt: new Date(r.createdAt),
    updatedAt: new Date(r.updatedAt || r.createdAt),
  };
}

function mapCheckinRow(r: RawCheckin): OrgCheckin {
  return {
    id: r.id,
    operationId: r.operationId || '',
    orgId: r.orgId || '',
    userId: r.userId || '',
    kind: r.kind === 'out' ? 'out' : r.kind === 'plan' ? 'plan' : 'done',
    day: r.day || '',
    text: r.text || '',
    createdAt: new Date(r.createdAt),
  };
}

/** 最近 62 天建的作战 + 它们的打卡。 */
export async function listOps(orgId: string): Promise<{ ops: OrgOperation[]; checkins: OrgCheckin[] }> {
  const res = await velvetRequest<{ ops: RawOperation[]; checkins: RawCheckin[] }>(`/api/social/orgs/${orgId}/ops`);
  return {
    ops: (res.ops ?? []).map(mapOpRow),
    checkins: (res.checkins ?? []).map(mapCheckinRow),
  };
}

/** 发起作战（big 只有队长能发）。 */
export async function createOp(orgId: string, d: OpDraft): Promise<OrgOperation> {
  return guard(
    async () => mapOpRow(await velvetRequest<RawOperation>(`/api/social/orgs/${orgId}/ops`, {
      method: 'POST',
      body: JSON.stringify({
        kind: d.kind, attr: d.attr, title: d.title, deadline: d.deadline,
        participants: d.participants, assignments: d.kind === 'big' ? d.assignments : {},
      }),
    })),
    '没发出去，稍后再试',
  );
}

/** 取消作战（发起人或队长）。 */
export async function cancelOp(opId: string): Promise<OrgOperation> {
  return guard(
    async () => mapOpRow(await velvetRequest<RawOperation>(`/api/social/ops/${opId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({}),
    })),
    '没取消成，稍后再试',
  );
}

/** 打卡；已取消 / 不在名单 → null。 */
export async function createCheckin(opId: string, kind: string, day: string, text: string): Promise<OrgCheckin | null> {
  const raw = await velvetRequest<RawCheckin | null>(`/api/social/ops/${opId}/checkins`, {
    method: 'POST',
    body: JSON.stringify({ kind, day, text }),
  });
  return raw ? mapCheckinRow(raw) : null;
}

/** 删自己的一条打卡；已经没了也算成功。 */
export async function deleteCheckin(id: string): Promise<void> {
  await velvetRequest<{ ok: boolean }>(`/api/social/checkins/${id}`, { method: 'DELETE' });
}

// ── 满月团战（W3 第五波 第四步）────────────────────────

interface RawRaid {
  id: string;
  orgId: string;
  slot: number;
  boss: unknown;
  hpMax: number;
  createdAt: string;
}

interface RawRaidHit {
  id: string;
  raidId: string;
  orgId: string;
  userId: string;
  kind: string;
  night: string;
  attr?: string | null;
  skill: string;
  damage: number;
  weak: boolean;
  createdAt: string;
}

function mapRaidRow(r: RawRaid): OrgRaid {
  return {
    id: r.id,
    orgId: r.orgId || '',
    slot: typeof r.slot === 'number' ? r.slot : Number(r.slot) || 0,
    boss: parseRaidBoss(r.boss),
    hpMax: Math.max(1, typeof r.hpMax === 'number' ? r.hpMax : Number(r.hpMax) || 1),
    createdAt: new Date(r.createdAt),
  };
}

function mapRaidHitRow(r: RawRaidHit): OrgRaidHit {
  return {
    id: r.id,
    raidId: r.raidId || '',
    orgId: r.orgId || '',
    userId: r.userId || '',
    kind: r.kind === 'allout' ? 'allout' : 'strike',
    night: r.night || '',
    ...(r.attr && RAID_ATTRS.includes(r.attr as AttributeId) ? { attr: r.attr as AttributeId } : {}),
    skill: r.skill || '',
    damage: typeof r.damage === 'number' ? r.damage : Number(r.damage) || 0,
    weak: r.weak === true,
    createdAt: new Date(r.createdAt),
  };
}

/** 这个组织全部的团战和出手。 */
export async function listRaids(orgId: string): Promise<{ raids: OrgRaid[]; hits: OrgRaidHit[] }> {
  const res = await velvetRequest<{ raids: RawRaid[]; hits: RawRaidHit[] }>(`/api/social/orgs/${orgId}/raids`);
  return {
    raids: (res.raids ?? []).map(mapRaidRow),
    hits: (res.hits ?? []).map(mapRaidHitRow),
  };
}

/** 开团（确定 id）；撞 (org,slot) → 读回已有那场。 */
export async function createRaid(orgId: string, id: string, slot: number, boss: OrgRaidBoss, hpMax: number): Promise<OrgRaid> {
  return guard(
    async () => mapRaidRow(await velvetRequest<RawRaid>(`/api/social/orgs/${orgId}/raids`, {
      method: 'POST',
      body: JSON.stringify({ id, slot, boss, hpMax }),
    })),
    '团战没开起来，稍后再试',
  );
}

/** 出手 / 总攻击；撞唯一键 → dup=true。 */
export async function createRaidHit(
  raidId: string, night: string, kind: string, attr: AttributeId | undefined, skill: string, damage: number, weak: boolean,
): Promise<{ hit: OrgRaidHit; dup: boolean }> {
  return guard(
    async () => {
      const res = await velvetRequest<{ hit: RawRaidHit; dup: boolean }>(`/api/social/raids/${raidId}/hits`, {
        method: 'POST',
        body: JSON.stringify({ kind, night, attr, skill, damage, weak }),
      });
      return { hit: mapRaidHitRow(res.hit), dup: !!res.dup };
    },
    '没打出去，稍后再试',
  );
}
