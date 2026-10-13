/**
 * 好友关系 API —— 转发到自研后端（/api/social/friends*）。
 *
 * 约定（与服务端一致）：
 *   - user_a / user_b 按 id 字典序归一化（较小者 = user_a），每个对只有一条记录
 *   - status 在 pending / linked / rejected / severed / expired 之间迁移
 *   - 「拒绝后 3 天」「解除后 7 天」两段冷却与 21 天过期都由服务端判定并给出中文原因；
 *     这里的 expireOutdatedPending 只是客户端兜底：把已经过期、服务端还没扫到的 pending 标掉
 *
 * PocketBase 退役后这里不再有第二条数据路径——只做「函数名 + 类型」这层适配，
 * 让调用方（social.ts / 各弹层）的 import 保持不变。
 */
import type { CloudProfile, Friendship } from '@/types';
import * as friendsApi from './friendsApi';

export interface SendFriendRequestInput {
  /** 对方的用户 id（先经 searchUserByUserId 或好友列表拿到） */
  targetUserId: string;
  message?: string;
}

/** 按 UserID 精确查找用户。返回 null = 没找到。刻意不支持模糊搜索（减少被扫号的风险） */
export const searchUserByUserId = (userId: string): Promise<CloudProfile | null> =>
  friendsApi.searchUserByUserId(userId);

/** 拉取当前登录用户的全部好友关系（含 pending / linked / rejected / severed 等） */
export const listFriendships = (): Promise<Friendship[]> => friendsApi.listFriendships();

/** 发起好友申请。重复申请、冷却未过、已是好友等一律由服务端拒绝并给出中文原因 */
export const sendFriendRequest = (input: SendFriendRequestInput): Promise<Friendship> =>
  friendsApi.sendFriendRequest(input);

/** 接受好友申请（服务端给发起人发通知） */
export const acceptFriendRequest = (friendshipId: string): Promise<Friendship> =>
  friendsApi.acceptFriendRequest(friendshipId);

/** 拒绝好友申请（服务端记 3 天冷却） */
export const rejectFriendRequest = (friendshipId: string): Promise<Friendship> =>
  friendsApi.rejectFriendRequest(friendshipId);

/** 解除已建立的好友关系（服务端记 7 天冷却） */
export const severFriendship = (friendshipId: string): Promise<Friendship> =>
  friendsApi.severFriendship(friendshipId);

/** 把超过 21 天的 pending 关系标成 expired；返回改了几条 */
export const expireOutdatedPending = (friendships: Friendship[]): Promise<number> =>
  friendsApi.expireOutdatedPending(friendships);
