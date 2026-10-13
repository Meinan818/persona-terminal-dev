/**
 * orgsApi 错误翻译测试（社交迁移 W3 第五波 第一步）：
 *
 * orgsApi 把后端的 VelvetApiError 翻成「人话文案」——400/404 的 body.message 直接抛出。
 * 这是分流层 mock 掉 orgsApi 后测不到的路径，需要独立覆盖。
 */
import { describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  request: vi.fn(),
}));

// 纯工厂 mock：velvetRequest 替换为 h.request（orgsApi 只用到它）
vi.mock('../velvetApi', () => ({ velvetRequest: h.request }));

import { create, join, updateProfile, listMine } from '../orgsApi';

/** 造一个 VelvetApiError 形状的错误（status + body） */
const apiErr = (status: number, body: unknown): Error => Object.assign(new Error(`velvet api error ${status}`), { status, body });

/** 手动捕获抛出的错误消息（比 rejects.toThrow 更稳：直接读 message） */
async function catchMessage(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn();
    return '<no throw>';
  } catch (e) {
    return (e as Error).message;
  }
}

describe('orgsApi 错误翻译：VelvetApiError.body.message → 人话', () => {
  it('400 的 message 原样抛（满员文案）', async () => {
    h.request.mockRejectedValue(apiErr(400, { message: '这个组织已经满 7 人了' }));
    expect(await catchMessage(() => join('ABCD2345', 'n'))).toBe('这个组织已经满 7 人了');
  });

  it('400 的 message 原样抛（名额文案）', async () => {
    h.request.mockRejectedValue(apiErr(400, { message: '你已经建过一个组织了（每人最多建一个）' }));
    expect(await catchMessage(() => create({ name: 'x', motto: '', emblem: 'star', tz: 'UTC', codename: 'n' })))
      .toBe('你已经建过一个组织了（每人最多建一个）');
  });

  it('404 的 message 原样抛（越权文案）', async () => {
    h.request.mockRejectedValue(apiErr(404, { message: '只有队长能改' }));
    expect(await catchMessage(() => updateProfile('org-1', { name: 'x', motto: '', emblem: 'star' })))
      .toBe('只有队长能改');
  });

  it('无 message 时退回调用方给的兜底文案', async () => {
    h.request.mockRejectedValue(apiErr(500, null));
    expect(await catchMessage(() => join('ABCD2345', 'n'))).toBe('没能加入，稍后再试');
  });

  it('成功响应正确映射（org + member）', async () => {
    h.request.mockResolvedValue({
      items: [{
        org: {
          id: 'org-1', name: '据点', motto: '稳', emblem: 'star', leaderId: 'u1',
          inviteCode: 'ABCD2345', tz: 'UTC', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
        },
        member: {
          id: 'm1', orgId: 'org-1', userId: 'u1', slot: 'own', seat: 1, codename: '队长',
          codenameKind: 'nickname', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
        },
      }],
    });
    const got = await listMine();
    expect(got[0].org.emblem).toBe('star');
    expect(got[0].member.slot).toBe('own');
    expect(got[0].member.card.streak).toBe(0);   // card 缺省补默认
  });
});
