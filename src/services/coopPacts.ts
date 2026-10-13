/**
 * 一起进步（v2.7.0.6）—— 两位好友之间的打卡约定。
 *
 * PB 集合 `coop_pacts` schema（需要在 PB Admin 手动建立）：
 *   from_user        relation → users    required   cascade-delete   发起人
 *   to_user          relation → users    required   cascade-delete   受邀人
 *   kind             text     required   (daily|once)
 *   mode             text     required   (same|different)
 *   title_from       text     required
 *   title_to         text
 *   days             number              (7|14|30；0 = 不设期限 / 一次性)
 *   deadline         text                (YYYY-MM-DD，一次性目标的截止日)
 *   start_day        text                (YYYY-MM-DD，接受当天)
 *   status           text     required   (pending|active|finished|cancelled|declined|expired)
 *   done_from        json                (发起人打卡的日子 ["YYYY-MM-DD", …])
 *   done_to          json
 *   nudge_from_day   text                (发起人最近一次催对方的日子)
 *   nudge_to_day     text
 *   message          text
 *   ended_by         relation → users
 *   created / updated  autodate
 *
 *   List/View rule:  @request.auth.id = from_user || @request.auth.id = to_user
 *   Create rule:     @request.auth.id = from_user
 *   Update rule:     @request.auth.id = from_user || @request.auth.id = to_user
 *   Delete rule:     锁定（= 仅超级管理员；不提供硬删除，结束走 status）
 *   ⚠️ PB 规则三态：锁定(null) = 仅超级管理员；解锁后留空("") = 所有人都能调，别这么设。
 *
 * 双方各只写自己那一栏（done_from / done_to、nudge_from_day / nudge_to_day），服务端按字段合并，
 * 两人同时打卡也不会互相覆盖。邀请 / 接受 / 婉拒 / 催促 / 结束的通知由服务端写
 * （notifications 表的 event_logged + payload.kind）。
 */

import * as velvetApi from './velvetApi';
import * as coopPactsApi from './coopPactsApi';
import { auditText } from '@/utils/textAudit';
import type { CoopPact, NotificationEntry, PactKind, PactMode } from '@/types';
import { isPactLive, PACT_DAYS_OPTIONS } from '@/utils/pactLogic';

/** 邀请多少天没回应算过期 */
export const PACT_INVITE_TTL_DAYS = 3;
/** 任务名长度上限 */
export const PACT_TITLE_MAX = 30;

export type PactNoticeKind = 'pact_invite' | 'pact_accepted' | 'pact_declined' | 'pact_nudge' | 'pact_ended';
const PACT_NOTICE_KINDS: readonly string[] = ['pact_invite', 'pact_accepted', 'pact_declined', 'pact_nudge', 'pact_ended'];

/** 这条站内通知是不是一起进步的消息；是则返回种类 */
export const pactNoticeKind = (n: NotificationEntry): PactNoticeKind | null => {
  const k = n.payload?.kind;
  return n.type === 'event_logged' && typeof k === 'string' && PACT_NOTICE_KINDS.includes(k) ? (k as PactNoticeKind) : null;
};

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * 与我相关、还有意义的约定：进行中 / 等回应的全部，结束了的留 45 天（历史与对账用）。
 * 失败返回 null（和「一条都没有」区分开，调用方别据此把本地待办归档）。
 */
export const listMyPacts = async (): Promise<CoopPact[] | null> => {
  try {
    return await coopPactsApi.listMyPacts();
  } catch (err) {
    console.warn('[velvet-pact] listMyPacts failed', err);
    return null;   // 失败返回 null（与「一条都没有」区分，调用方别据此归档本地待办）
  }
};

export interface CreatePactInput {
  toId: string;
  kind: PactKind;
  mode: PactMode;
  title: string;
  /** 每日打卡天数（7/14/30，0 = 不设期限） */
  days: number;
  /** 一次性目标截止日 YYYY-MM-DD */
  deadline?: string;
  message?: string;
  today: string;
}

/** 发起约定：写一条 pending 记录，给对方发邀请 */
export const createPact = async (input: CreatePactInput, existing: CoopPact[]): Promise<CoopPact> => {
  const me = velvetApi.getUserId() ?? '';
  if (!me) throw new Error('用户信息缺失');
  const to = input.toId.trim();
  if (!to || to === me) throw new Error('对方信息缺失');
  const title = input.title.trim().slice(0, PACT_TITLE_MAX);
  if (!title) throw new Error('写一下要一起做的事');
  for (const t of [title, input.message ?? '']) {
    const audit = auditText(t);
    if (!audit.ok) throw new Error(audit.reason);
  }
  if (existing.some(p => isPactLive(p) && (p.fromId === to || p.toId === to))) {
    throw new Error('你们已经有一个进行中的约定了');
  }
  const days = input.kind === 'daily' && (PACT_DAYS_OPTIONS as readonly number[]).includes(input.days) ? input.days : 0;
  if (input.kind === 'once' && (!input.deadline || !DAY_RE.test(input.deadline) || input.deadline < input.today)) {
    throw new Error('截止日要选今天或以后');
  }
  // 上面这些文案校验是前端先拦一遍；后端会再校验一次并写服务端通知。
  return await coopPactsApi.createPact({
    toId: to, kind: input.kind, mode: input.mode, title, days,
    deadline: input.kind === 'once' ? input.deadline : undefined,
    message: input.message?.trim().slice(0, 120) || undefined,
    today: input.today,
  });
};

/** 回应邀请：接受（不同目标时填自己的任务）/ 婉拒 */
export const respondPact = async (
  pactId: string,
  accept: boolean,
  opts: { today: string; titleTo?: string },
): Promise<CoopPact> => coopPactsApi.respondPact(pactId, accept, opts);

/** 打卡 / 撤回打卡：只改自己那一栏 */
export const setMyDone = async (pactId: string, day: string, done: boolean): Promise<CoopPact> => {
  return await coopPactsApi.setMyDone(pactId, day, done);
};

/** 催一下：记下今天催过，给对方发消息 */
export const nudgePact = async (pactId: string, today: string): Promise<CoopPact> => {
  return await coopPactsApi.nudgePact(pactId, today);
};

/** 结束约定（撤回邀请也走这里） */
export const endPact = async (pactId: string): Promise<CoopPact> => {
  return await coopPactsApi.endPact(pactId);
};

/** 到期收尾（达成 / 过期）：两边谁先发现谁写，重复写同一个值无害 */
export const closePact = async (pactId: string, status: 'finished' | 'expired'): Promise<CoopPact | null> => {
  try {
    return await coopPactsApi.closePact(pactId, status);
  } catch (err) {
    console.warn('[velvet-pact] closePact failed', pactId, err);
    return null;
  }
};
