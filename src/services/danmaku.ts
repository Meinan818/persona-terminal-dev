/**
 * 治疗终端 · 在线弹幕（F3.5，先审后发）。
 *
 * 设计：
 *   - 展示：终端漂浮其他用户的鼓励语（官方精选种子池 + 云端已过审弹幕）。
 *   - 投稿：完成终端任务攒到「鼓励机会」(settings.terminalDanmakuTokens) 才能发；
 *     新投稿 status='pending'，经 PB Admin 人工过审 → 'approved' 才公开。
 *   - 匿名：**不存作者**最简单也最彻底——danmaku 集合不含任何指向用户的字段，天然匿名。
 *     （不要把 createdBy 设 Hidden 又在规则里引用它：PB 已知 bug #6201，规则引用 Hidden 字段会失效报 400。
 *      若日后要做按作者防滥用，应由 pb_hook 服务端写 createdBy，且规则不引用它。）
 *   - 离线兜底：无云 / 集合未建 / 出错 → 返回空，由 DanmakuField 退回种子池。
 *
 * 数据面走自研后端 /api/danmaku*（列表 / 投稿 / 举报 / 过审自查见 danmakuApi）；
 * PocketBase 时代的集合 schema 与访问规则已随退役删除，审核由服务端按内容自动完成。
 */

import { getUserId } from './velvetApi';
import { watchDanmaku } from './danmakuWatch';
import * as danmakuApi from './danmakuApi';
import type { ThemeType } from '@/types';

export type DanmakuTheme = 'blue' | 'yellow' | 'red';

/** 弹幕内容上限（短句，飘得动、读得完） */
export const DANMAKU_MAX_LEN = 20;
/** 同屏最大密度：再多就糊成一片，读不成句子 */
export const DANMAKU_MAX_ON_SCREEN = 50;
/** 投稿冷却：三天一条。与「有几次机会」是两个独立闸门 */
export const DANMAKU_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * 客户端轻量预过滤——真正的审核在服务端（后端按内容自动过审），这里只挡掉最明显的脏内容、
 * 减少审核队列噪声。故意保持极简、不试图穷举。
 */
const BANNED = ['http://', 'https://', 'www.', '加微信', '加群', '免费领'];

export const validateDanmaku = (text: string): { ok: boolean; reason?: string } => {
  const t = text.trim();
  if (!t) return { ok: false, reason: '写点什么吧' };
  if ([...t].length > DANMAKU_MAX_LEN) return { ok: false, reason: `最多 ${DANMAKU_MAX_LEN} 字` };
  const lower = t.toLowerCase();
  if (BANNED.some(w => lower.includes(w.toLowerCase()))) return { ok: false, reason: '含有不允许的内容（链接 / 引流等）' };
  return { ok: true };
};

/** 主题 → 弹幕频道标签（蓝·粉=blue / 黄=yellow / 红·自定义=red，与频道分桶一致；
 *  粉自 FS2 起是 P3 的换色皮，弹幕跟着走蓝桶） */
export const danmakuThemeOf = (theme?: ThemeType): DanmakuTheme =>
  theme === 'blue' || theme === 'pink' ? 'blue' : theme === 'yellow' ? 'yellow' : 'red';

/** 云端弹幕条目：id 用于举报/本地屏蔽；官方种子池条目 id 为空串（非 UGC，不可举报） */
export type DanmakuItem = { id: string; text: string };

/**
 * 本地屏蔽名单（App Store UGC 合规的「blocking」半边）：用户举报过的弹幕 id 记在本机，
 * 拉取时过滤——举报即刻从自己屏幕上消失，不必等服务端下架。
 */
const BLOCK_KEY = 'velvet-danmaku-blocked-v1';
const readBlocked = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(BLOCK_KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
};
export const blockDanmakuLocally = (id: string): void => {
  if (!id) return;
  try {
    const cur = readBlocked();
    if (!cur.includes(id)) localStorage.setItem(BLOCK_KEY, JSON.stringify([...cur, id].slice(-500)));
  } catch {
    /* 隐私模式等写入失败：本次会话内由调用方 state 过滤兜底 */
  }
};

/**
 * 拉取已过审弹幕（带 id，供举报/屏蔽）。无云 / 集合未建 / 权限未配 / 出错 → 返回空
 * （由 UI 退回种子池）；本地已屏蔽的条目在此处过滤。
 */
export const listApprovedDanmaku = async (limit = DANMAKU_MAX_ON_SCREEN): Promise<DanmakuItem[]> => {
  const blocked = readBlocked();
  try {
    return (await danmakuApi.listApproved(limit)).filter(it => !blocked.includes(it.id));
  } catch (err) {
    console.warn('[velvet-danmaku] listApproved failed', err);
    return [];
  }
};

/**
 * 投稿失败 → 给用户看的一句中文。失败不扣机会，所以都带一句「机会还在」。
 * 后端已把校验失败翻成中文（放在 body.message），优先透传；否则按 HTTP 状态给通用话术。
 */
const describeVelvetSubmitError = (err: unknown): string => {
  const e = err as { status?: number; body?: { message?: string } | null; message?: string };
  const status = typeof e?.status === 'number' ? e.status : -1;
  const serverMsg = e?.body && typeof e.body.message === 'string' ? e.body.message : '';
  console.warn('[velvet-danmaku] submit (backend) failed', status, serverMsg || e?.message);
  if (serverMsg) return serverMsg;             // 后端校验原因（如「最多 20 字」）原样给用户
  if (status === 0) return '网络没连上，机会还在，稍后再发';
  if (status === 401) return '登录过期了，重新登录再发；机会还在';
  if (status >= 500) return '服务器开小差了，机会还在，稍后再试';
  return '服务器暂时不收投稿，机会还在，稍后再试';
};

/**
 * 投稿一条弹幕。需登录。**不存作者**（匿名：不写 createdBy），status='pending' 由 Create 规则
 * 强制（先审后发）。失败抛出一句中文说明（原始报错进控制台），由调用方提示、且不消费 token。
 */
export const submitDanmaku = async (text: string, theme: DanmakuTheme): Promise<void> => {
  if (!getUserId()) throw new Error('用户信息缺失');
  const v = validateDanmaku(text);
  if (!v.ok) throw new Error(v.reason ?? '内容不合法');
  try {
    const rec = await danmakuApi.submit(text.trim(), theme);
    // 记下自己这条的 id，供开 App 时自查是否过审（id 即凭据，匿名不破）
    watchDanmaku(rec.id, text.trim());
  } catch (err) {
    throw new Error(describeVelvetSubmitError(err));
  }
};

/** 举报一条弹幕（兜底已通过内容；失败静默）。UI 入口见 DanmakuLayer（点击弹幕 → 确认）。 */
export const reportDanmaku = async (danmakuId: string, reason = ''): Promise<void> => {
  try {
    await danmakuApi.report(danmakuId, reason);
  } catch (err) {
    console.warn('[velvet-danmaku] report failed', err);
  }
};

/**
 * 举报并本地屏蔽（App Store UGC 合规：report + block 一步到位）。
 * 屏蔽先行（即刻从本机消失，不依赖网络），举报尽力而为（失败静默，服务端有唯一索引防刷）。
 */
export const reportAndBlockDanmaku = async (danmakuId: string, reason = ''): Promise<void> => {
  blockDanmakuLocally(danmakuId);
  await reportDanmaku(danmakuId, reason);
};
