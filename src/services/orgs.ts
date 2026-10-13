/**
 * 组织（v2.7.0.6 第 7 轮 · PRD §12）的 PB 读写。
 *
 * 集合（需要在 PB Admin 手动建立，逐字段 / 索引 / 规则见 PRD S 节第 13 条）：
 *   orgs         name(≤12) / motto(≤30) / emblem / leader → users / invite_code(8 位) / tz
 *   org_members  org → orgs / user → users / slot(own|joined) / seat(1–7) / code / codename(≤8)
 *                / codename_kind / tarot_id / card(json) / goal / goal_week / result / result_week
 * 服务器只用规则 + 唯一索引，不写钩子：
 *   · (org, user) 唯一；(user, slot) 唯一 → 最多自建一个 + 加入一个；orgs.leader 唯一；
 *   · (org, seat) 唯一且 seat 只能 1–7 → 最多 7 人；
 *   · 非成员只能带着 ?code= 读到那一个组织；建成员行时规则拿请求里的码和组织当前的码比。
 * 多步写入：能回滚的回滚；回滚不了的（转让之后自己已经不是队长）由 orgSync 的位置校正兜底。
 * 第 8 轮（S 节第 14 条）加两张表：org_operations（作战）/ org_checkins（打卡 / 不参加 / 自己写的那一份），见文件末尾。
 * 组织 P2（S 节第 15 条）：orgs 加 custom（队长自定义等级名字 / 称号）；两张新表 org_raids（满月团战）/ org_raid_hits（出手），见文件末尾。
 */
import * as orgsApi from './orgsApi';
import { auditText } from '@/utils/textAudit';
import {
  ORG_CODENAME_MAX, ORG_GOAL_MAX, ORG_MOTTO_MAX, ORG_NAME_MAX, ORG_POST_TEXT_MAX,
  cleanSnapshotNames, deviceTimeZone, isEmblemId, isInviteCode, minutesId, normalizeInviteInput,
} from '@/utils/orgLogic';
import { ORG_OP_TASK_MAX, type OpDraft } from '@/utils/orgOps';
import { ORG_BUILTIN_TITLES, parseOrgCustom } from '@/utils/orgTitles';
import type {
  AttributeId, Org, OrgCheckin, OrgCodenameKind, OrgCustom, OrgMember, OrgMemberCard, OrgMinutesSnapshot, OrgOpCardSnapshot, OrgOperation, OrgPost,
  OrgPostSnapshot, OrgRaid, OrgRaidBoss, OrgRaidHit, OrgReaction, OrgReactionTag, OrgView,
} from '@/types';

// ── 映射 ─────────────────────────────────────────────────────────────────────

// ── 错误 ─────────────────────────────────────────────────────────────────────

type PbErr = { status?: number; response?: { message?: string; data?: Record<string, { code?: string; message?: string }> }; message?: string };

/** 字段级错误码（{ seat: 'validation_not_unique', … }）；没有就是空对象 */
export function fieldCodes(err: unknown): Record<string, string> {
  const data = (err as PbErr)?.response?.data;
  const out: Record<string, string> = {};
  if (data && typeof data === 'object') {
    for (const [k, v] of Object.entries(data)) if (v && typeof v.code === 'string') out[k] = v.code;
  }
  return out;
}
const statusOf = (err: unknown): number => (typeof (err as PbErr)?.status === 'number' ? (err as PbErr).status! : -1);
export class OrgError extends Error {}

/** 后台报错 → 一句人话；原始报错进控制台 */
export function describeOrgError(err: unknown, fallback: string): string {
  if (err instanceof OrgError) return err.message;
  const s = statusOf(err);
  console.warn('[velvet-org]', fallback, s, (err as PbErr)?.response?.message ?? (err as PbErr)?.message, fieldCodes(err));
  if (s === 0) return '网络没连上，稍后再试';
  if (s === 401 || s === 403) return '登录过期了，重新登录再试';
  if (s === 404) return '找不到这个组织了，可能已经解散';
  if (s === 429) return '操作有点快，过会儿再试';
  if (s >= 500) return '服务器开小差了，稍后再试';
  return fallback;
}

/** 屏蔽词：和名片同一套词库，提示语换成据点的说法 */
function assertClean(...texts: string[]): void {
  for (const t of texts) {
    const r = auditText(t);
    if (!r.ok) throw new OrgError(r.kind === 'contact' ? '稍微调整下措辞吧：据点里不能放链接、联系方式或引流内容' : '稍微调整下措辞吧：有个词放在据点里不太合适');
  }
}

const clip = (s: string, n: number): string => [...s.trim()].slice(0, n).join('');

/** 昵称当代号：截到 8 个字；过不了屏蔽词就不用（调用方换成默认代号），不因为昵称拦住建立 / 加入 */
export const safeNickname = (nickname: string): string => {
  const c = clip(nickname, ORG_CODENAME_MAX);
  return c && auditText(c).ok ? c : '';
};

// ── 读 ───────────────────────────────────────────────────────────────────────

export interface Membership { member: OrgMember; org: Org }

/** 我的成员行 + 所属组织。失败返回 null（和「一个都没有」区分开，调用方别据此清空本地） */
export async function listMyMemberships(): Promise<Membership[] | null> {
  try {
    const rows = await orgsApi.listMine();
    return rows.map(r => ({ member: r.member, org: r.org }));
  } catch (err) {
    console.warn('[velvet-org] listMyMemberships failed', err);
    return null;
  }
}

export async function listOrgMembers(orgId: string): Promise<OrgMember[]> {
  return orgsApi.members(orgId);
}

export async function fetchOrg(orgId: string): Promise<Org> {
  return orgsApi.fetch(orgId);
}

/** 凭邀请码看一眼（加入前的预览）：码不对 / 已经换了新码 → null */
export async function previewOrg(rawCode: string): Promise<Org | null> {
  const code = normalizeInviteInput(rawCode);
  if (!isInviteCode(code)) throw new OrgError('邀请码是 8 位字母和数字');
  try {
    return await orgsApi.preview(code);
  } catch (err) {
    throw new OrgError(describeOrgError(err, '暂时查不到这个邀请码，稍后再试'));
  }
}

// ── 建立 / 加入 ───────────────────────────────────────────────────────────────

export interface OrgDraft { name: string; motto: string; emblem: string }

function checkDraft(d: OrgDraft): OrgDraft {
  const name = clip(d.name, ORG_NAME_MAX);
  const motto = clip(d.motto, ORG_MOTTO_MAX);
  if (!name) throw new OrgError('给组织起个名字');
  if (!isEmblemId(d.emblem)) throw new OrgError('选一枚徽记');
  assertClean(name, motto);
  return { name, motto, emblem: d.emblem };
}

/** 建立组织：先建组织（队长 = 我），再建我的成员行（1 号座位、「自建」）；第二步失败就删掉组织 */
export async function createOrg(draft: OrgDraft, nickname: string, mine: OrgView[]): Promise<Membership> {
  const d = checkDraft(draft);
  if (mine.some(v => v.me.slot === 'own')) throw new OrgError('你已经建过一个组织了（每人最多建一个）');
  // 建组织 + 建成员行（1 号座位）收敛到服务端一次请求
  const res = await orgsApi.create({
    name: d.name, motto: d.motto, emblem: d.emblem, tz: deviceTimeZone(), codename: safeNickname(nickname) || '队长',
  });
  return { org: res.org, member: res.member };
}

/** 凭码加入：从 1 号座位往后试，撞了换下一个；7 个都满就进不去 */
export async function joinOrg(rawCode: string, nickname: string, mine: OrgView[]): Promise<Membership> {
  const code = normalizeInviteInput(rawCode);
  if (mine.some(v => v.me.slot === 'joined')) throw new OrgError('你已经加入了一个组织（每人最多加入一个）');
  // 座位分配与撞座位重试都在服务端
  const res = await orgsApi.join(code, safeNickname(nickname) || '新成员');
  return { org: res.org, member: res.member };
}

// ── 改 ───────────────────────────────────────────────────────────────────────

/** 队长改组织资料 */
export async function updateOrgProfile(orgId: string, draft: OrgDraft): Promise<Org> {
  const d = checkDraft(draft);
  return orgsApi.updateProfile(orgId, d);
}

/**
 * 队长改自定义（组织 P2：等级名字 / 内置称号改名 / 自定义称号）。名字先过屏蔽词（不过就拦下、告诉队长），
 * 再按读的时候同一套规则整理一遍（截长度、夹范围、去掉和默认一样的）；全空就清掉。
 */
export async function updateOrgCustom(orgId: string, custom: OrgCustom): Promise<Org> {
  const names = [
    ...(custom.levelNames ?? []),
    ...ORG_BUILTIN_TITLES.map(t => custom.titleNames?.[t.id] ?? ''),
    ...(custom.titles ?? []).map(t => t.name),
  ].map(n => n.trim()).filter(Boolean);
  assertClean(...names);
  try {
    return await orgsApi.updateCustom(orgId, parseOrgCustom(custom) ?? null);
  } catch (err) {
    throw new OrgError(describeOrgError(err, '没存上，稍后再试'));
  }
}

/** 队长换邀请码（旧码立即作废） */
export async function rotateInviteCode(orgId: string): Promise<Org> {
  try {
    return await orgsApi.rotate(orgId);
  } catch (err) {
    throw new OrgError(describeOrgError(err, '没换成，稍后再试'));
  }
}

export interface MemberPatch {
  codename?: string;
  codenameKind?: OrgCodenameKind;
  tarotId?: string;
  card?: OrgMemberCard;
  goal?: string;
  goalWeek?: string;
  result?: 'done' | 'partial' | 'missed';
  resultWeek?: string;
}

/** 改自己那一行（代号 / 代表牌 / 成员牌 / 会议目标）。自己写的代号过屏蔽词 */
export async function updateMyMember(memberId: string, patch: MemberPatch): Promise<OrgMember> {
  const body: Record<string, unknown> = {};
  if (patch.codename !== undefined) {
    const c = clip(patch.codename, ORG_CODENAME_MAX);
    if (!c) throw new OrgError('代号不能空着');
    assertClean(c);
    body.codename = c;
  }
  if (patch.codenameKind) body.codenameKind = patch.codenameKind;
  if (patch.tarotId !== undefined) body.tarotId = patch.tarotId;
  if (patch.card) body.card = patch.card;
  if (patch.goal !== undefined) body.goal = patch.goal;
  if (patch.goalWeek !== undefined) body.goalWeek = patch.goalWeek;
  if (patch.result !== undefined) body.result = patch.result;
  if (patch.resultWeek !== undefined) body.resultWeek = patch.resultWeek;
  try {
    return await orgsApi.updateMember(memberId, body);
  } catch (err) {
    throw new OrgError(describeOrgError(err, '没存上，稍后再试'));
  }
}

/** 位置字段校正：只改 slot 一个字段（规则要求 slot 与是不是队长一致） */
export async function setMySlot(memberId: string, slot: 'own' | 'joined'): Promise<OrgMember> {
  return orgsApi.setSlot(memberId, slot);
}

// ── 退出 / 请离 / 转让 / 解散 ─────────────────────────────────────────────────

export async function leaveOrg(view: OrgView): Promise<void> {
  if (view.me.slot === 'own') throw new OrgError('队长要先把队长转让出去，或者解散组织');
  try {
    await orgsApi.leave(view.org.id);
  } catch (err) {
    throw new OrgError(describeOrgError(err, '没能退出，稍后再试'));
  }
}

/** 队长请离一位成员；随后自动换码，旧码作废。换码失败不算请离失败（返回 false 让界面提示手动换） */
export async function kickMember(view: OrgView, memberId: string): Promise<{ rotated: Org | null }> {
  if (view.me.slot !== 'own') throw new OrgError('只有队长能请离成员');
  return orgsApi.kick(view.org.id, memberId);
}

/**
 * 转让队长。先改组织的队长（对方已经是别处的队长 → 唯一索引挡住，什么都没变）；
 * 成功之后我已经不是队长、改不回去了，所以能失败的检查都放在这一步之前：
 *   · alsoLeave：我已经加入了别的组织，转让后「加入」名额冲突，只能退出这里；
 *   · 否则把我这行改成「加入」。这一步没成也不要紧，下次对账会校正。
 * 对方那行由对方的客户端在下次对账时改成「自建」。
 */
export async function transferLeader(view: OrgView, toMemberId: string, alsoLeave: boolean): Promise<void> {
  if (view.me.slot !== 'own') throw new OrgError('只有队长能转让');
  try {
    await orgsApi.transfer(view.org.id, toMemberId, alsoLeave);
  } catch (err) {
    throw new OrgError(describeOrgError(err, '没转让成，稍后再试'));
  }
}

/** 队长解散：删组织，成员行级联删除 */
export async function dissolveOrg(view: OrgView): Promise<void> {
  if (view.me.slot !== 'own') throw new OrgError('只有队长能解散组织');
  try {
    await orgsApi.dissolve(view.org.id);
  } catch (err) {
    throw new OrgError(describeOrgError(err, '没能解散，稍后再试'));
  }
}

// ── 公告板（7b · PRD §12.16）──────────────────────────────────────────────────
//   org_posts      org / user / kind(moment|minutes) / text(≤20) / snapshot(json) / week_key
//   org_reactions  post / org / user / tag（六选一）；(post, user) 唯一
//   org_reports    post_id / org_id / target_user（纯文本 id）/ reporter / reason / text_copy；(post_id, reporter) 唯一

/** 最近 30 天、最多 100 条动态（新的在前）+ 这些动态上的标签 */
export async function listOrgBoard(orgId: string): Promise<{ posts: OrgPost[]; reactions: OrgReaction[] }> {
  try {
    return await orgsApi.board(orgId);
  } catch (err) {
    console.warn('[velvet-org] listOrgBoard failed', err);
    return { posts: [], reactions: [] };
  }
}

/** 分享一条动态（一句话过屏蔽词；快照不含记录原文） */
export async function createMoment(orgId: string, text: string, snapshot: OrgPostSnapshot): Promise<OrgPost> {
  const t = clip(text, ORG_POST_TEXT_MAX);
  if (!t) throw new OrgError('写一句话再分享');
  assertClean(t);
  try {
    return await orgsApi.createMoment(orgId, t, cleanSnapshotNames(snapshot));
  } catch (err) {
    throw new OrgError(describeOrgError(err, '没分享出去，稍后再试'));
  }
}

/**
 * 贴 / 换 / 撤标签：再点自己贴的那个 = 撤；点别的 = 换。
 * 两台设备同时贴会撞 (post, user) 唯一索引——撞了就读出已有那条，改成这次选的。
 */
export async function setReaction(orgId: string, postId: string, tag: OrgReactionTag, _existing: OrgReaction | undefined): Promise<OrgReaction | null> {
  // 撤/换/贴收敛到服务端；唯一键冲突由后端读回处理
  try {
    return await orgsApi.setReaction(orgId, postId, tag);
  } catch (err) {
    throw new OrgError(describeOrgError(err, '没贴上，稍后再试'));
  }
}

/** 删动态（自己的，或队长删任何一条）；标签跟着级联删 */
export async function deletePost(postId: string): Promise<void> {
  try {
    await orgsApi.deletePost(postId);
  } catch (err) {
    throw new OrgError(describeOrgError(err, '没删掉，稍后再试'));
  }
}

export type OrgReportReason = 'harass' | 'inappropriate' | 'ads' | 'other';

/** 举报一条动态：带原话副本（动态被删了你在后台也看得到原话）；同一条举报过就算了 */
export async function reportPost(post: OrgPost, reason: OrgReportReason): Promise<void> {
  try {
    await orgsApi.report({ postId: post.id, orgId: post.orgId, targetUserId: post.userId, reason, textCopy: [...post.text].slice(0, 60).join('') });
  } catch (err) {
    throw new OrgError(describeOrgError(err, '举报没发出去，稍后再试'));
  }
}

/** 发纪要：确定 id，两台设备同时发只会留一份——撞了（id 已存在）返回 null，调用方重新拉一次 */
export async function createMinutes(orgId: string, minutes: OrgMinutesSnapshot): Promise<OrgPost | null> {
  return orgsApi.createMinutes(orgId, minutesId(orgId, minutes.week), minutes.week, minutes);
}

/** 周日会议：自评（这周立过目标才有）+ 下周目标，只写自己那一行 */
export async function saveMeeting(memberId: string, input: { week: string; result?: 'done' | 'partial' | 'missed'; goal: string; nextWeek: string }): Promise<OrgMember> {
  const goal = clip(input.goal, ORG_GOAL_MAX);
  if (!goal) throw new OrgError('写一句下周目标');
  assertClean(goal);
  const patch: MemberPatch = { goal, goalWeek: input.nextWeek };
  if (input.result) { patch.result = input.result; patch.resultWeek = input.week; }
  return updateMyMember(memberId, patch);
}

/** 删掉某人在这个组织的动态和标签（退出时删自己的；请离时队长顺手删对方的）；尽力而为，失败只记日志 */
export async function deleteUserContent(orgId: string, userId: string): Promise<void> {
  try {
    await orgsApi.purgeUser(orgId, userId);
  } catch (err) {
    console.warn('[velvet-org] deleteUserContent failed', orgId, userId, err);
  }
}

// ── 作战（第 8 轮 · PRD §13 / S 节第 14 条）─────────────────────────────────────────
//   org_operations  org / initiator / kind(small|big) / attr / title(≤20) / deadline / participants(多选 ≤7) / assignments(json) / status(active|cancelled)
//   org_checkins    operation / org / user / kind(done|out|plan) / day / text(≤20)；(operation, user, kind) 唯一
// 达成 / 未达成都是现算的；达成卡是 org_posts 里 kind = operation 的一条（确定 id）。

/** 最近 62 天建的作战（进行中的最长 30 天，加 30 天的历史）+ 它们的打卡 */
export async function listOrgOps(orgId: string): Promise<{ ops: OrgOperation[]; checkins: OrgCheckin[] }> {
  return orgsApi.listOps(orgId);
}

/** 据点经验的来源：这个组织全部的纪要和作战达成卡（不限 30 天；每周几条，很小） */
export async function listOrgLedger(orgId: string): Promise<OrgPost[]> {
  return orgsApi.ledger(orgId);
}

/** 发起作战（草稿已经 normalizeOpDraft + checkOpDraft 过；这里再过一道屏蔽词） */
export async function createOperation(orgId: string, d: OpDraft): Promise<OrgOperation> {
  assertClean(d.title, ...Object.values(d.assignments));
  try {
    return await orgsApi.createOp(orgId, d);
  } catch (err) {
    throw new OrgError(describeOrgError(err, '没发出去，稍后再试'));
  }
}

/** 取消作战（发起人或队长） */
export async function cancelOperation(opId: string): Promise<OrgOperation> {
  try {
    return await orgsApi.cancelOp(opId);
  } catch (err) {
    throw new OrgError(describeOrgError(err, '没取消成，稍后再试'));
  }
}

/**
 * 写一条自己的打卡 / 不参加 / 那一份。撞了唯一索引（另一台设备刚写过）→ 读出已有那条返回；
 * 作战已经取消、我不在名单里 → 规则拒，返回 null（调用方按「不用再写了」处理）。
 */
export async function createCheckin(op: Pick<OrgOperation, 'id' | 'orgId'>, kind: OrgCheckin['kind'], extra: { day?: string; text?: string } = {}): Promise<OrgCheckin | null> {
  const text = kind === 'plan' ? [...(extra.text ?? '').trim()].slice(0, ORG_OP_TASK_MAX).join('') : '';
  if (kind === 'plan') {
    if (!text) throw new OrgError('写一句你负责的那一份');
    assertClean(text);
  }
  return orgsApi.createCheckin(op.id, kind, extra.day ?? '', text);
}

/** 删自己的一条（撤销完成 / 改写那一份）；已经没了也算成功 */
export async function deleteCheckin(id: string): Promise<void> {
  return orgsApi.deleteCheckin(id);
}

/** 发作战达成卡：确定 id，两台设备同时发只会留一份——撞了返回 null（调用方重新拉一次） */
export async function createOpCard(orgId: string, cardId: string, card: OrgOpCardSnapshot): Promise<OrgPost | null> {
  return orgsApi.createOpCard(orgId, cardId, card.week ?? '', card);
}

// ── 组织 P2：满月团战（S 节第 15 条）──────────────────────────────────────────────

/** 这个组织全部的团战和出手（一个月一场、每场最多二十几条，很小）；表还没建会抛 404，调用方按「暂时拉不到」处理 */
export async function listOrgRaids(orgId: string): Promise<{ raids: OrgRaid[]; hits: OrgRaidHit[] }> {
  return orgsApi.listRaids(orgId);
}

/** 开团：确定 id；同一次满月别人刚开过（撞了 id 或 (org, slot) 唯一索引）→ 读出那一条 */
export async function createRaid(orgId: string, id: string, slot: number, boss: OrgRaidBoss, hpMax: number): Promise<OrgRaid> {
  try {
    return await orgsApi.createRaid(orgId, id, slot, boss, hpMax);
  } catch (err) {
    throw new OrgError(describeOrgError(err, '团战没开起来，稍后再试'));
  }
}

/**
 * 出手 / 总攻击。撞了唯一索引（这一晚已经打过了 / 总攻击用过了，多半是另一台设备）→ 读出已有那条，dup = true。
 */
export async function createRaidHit(raid: Pick<OrgRaid, 'id' | 'orgId'>, hit: { kind: 'strike' | 'allout'; night: string; attr?: AttributeId; skill: string; damage: number; weak: boolean }): Promise<{ hit: OrgRaidHit; dup: boolean }> {
  const night = hit.kind === 'allout' ? 'allout' : hit.night;
  const skill = [...hit.skill].slice(0, 20).join('');
  const damage = Math.max(0, Math.round(hit.damage));
  try {
    return await orgsApi.createRaidHit(raid.id, night, hit.kind, hit.attr, skill, damage, hit.weak);
  } catch (err) {
    throw new OrgError(describeOrgError(err, '没打出去，稍后再试'));
  }
}
