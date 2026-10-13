/**
 * danmaku.ts / danmakuWatch.ts 回归测试（PocketBase 退役后）：
 *
 * 弹幕的读/写/举报/过审自查一律走 danmakuApi（/api/danmaku*）；
 * 身份取自 velvetApi（以前取自 pocketbase 的兜底函数）。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => {
  const api = {
    listApproved: vi.fn(),
    submit: vi.fn(),
    isApproved: vi.fn(),
    report: vi.fn(),
  };
  return { api };
});

vi.mock('../velvetApi', () => ({ getUserId: () => 'user-me' }));
vi.mock('../danmakuApi', () => h.api);

/** 每个用例开始前放好 velvet.jwt（进入自研态） */
function setBackend(on: boolean) {
  if (on) localStorage.setItem('velvet.jwt', 'jwt-token');
  else localStorage.removeItem('velvet.jwt');
}

beforeEach(() => {
  setBackend(true);
  Object.values(h.api).forEach(f => f.mockReset());
  localStorage.removeItem('velvet:danmaku-watch');
  localStorage.removeItem('velvet-danmaku-blocked-v1');
});

import { listApprovedDanmaku, submitDanmaku, reportDanmaku, blockDanmakuLocally } from '../danmaku';
import { checkApprovedDanmaku, watchDanmaku, pendingDanmakuCount } from '../danmakuWatch';

describe('danmaku.ts 分流：自研登录态 → 走 danmakuApi', () => {
  it('listApprovedDanmaku 走 danmakuApi，不碰 PocketBase', async () => {
    h.api.listApproved.mockResolvedValue([{ id: 'd1', text: '加油' }, { id: 'd2', text: '一起' }]);
    const got = await listApprovedDanmaku(10);
    expect(h.api.listApproved).toHaveBeenCalledWith(10);
    expect(got).toHaveLength(2);
    expect(got[0].text).toBe('加油');
  });

  it('listApprovedDanmaku 过滤掉本地已屏蔽的', async () => {
    blockDanmakuLocally('d1');
    h.api.listApproved.mockResolvedValue([{ id: 'd1', text: '屏蔽我' }, { id: 'd2', text: '留下' }]);
    const got = await listApprovedDanmaku();
    expect(got.map(i => i.id)).toEqual(['d2']);
  });

  it('listApprovedDanmaku 后端失败降级为空（UI 退回种子池）', async () => {
    h.api.listApproved.mockRejectedValue(new Error('网络错误'));
    expect(await listApprovedDanmaku()).toEqual([]);
  });

  it('submitDanmaku 走 danmakuApi（并登记待查）', async () => {
    h.api.submit.mockResolvedValue({ id: 'new-1', text: '今天也加油' });
    await submitDanmaku('今天也加油', 'blue');
    expect(h.api.submit).toHaveBeenCalledWith('今天也加油', 'blue');
    expect(pendingDanmakuCount()).toBe(1);   // watchDanmaku 被调用
  });

  it('submitDanmaku 校验失败提前抛（不触后端）', async () => {
    await expect(submitDanmaku('', 'blue')).rejects.toThrow('写点什么吧');
    await expect(submitDanmaku('看 http://x.com', 'blue')).rejects.toThrow('含有不允许的内容');
    expect(h.api.submit).not.toHaveBeenCalled();
  });

  it('submitDanmaku 后端校验失败透传中文（body.message）', async () => {
    h.api.submit.mockRejectedValue(Object.assign(new Error('velvet 400'), { status: 400, body: { message: '最多 20 字' } }));
    await expect(submitDanmaku('这句其实合法', 'blue')).rejects.toThrow('最多 20 字');
  });

  it('reportDanmaku 走 danmakuApi（失败静默）', async () => {
    h.api.report.mockResolvedValue(undefined);
    await reportDanmaku('d1', '不喜欢');
    expect(h.api.report).toHaveBeenCalledWith('d1', '不喜欢');

    h.api.report.mockRejectedValue(new Error('网络错误'));
    await expect(reportDanmaku('d1', 'x')).resolves.toBeUndefined();  // 不抛
  });
});

describe('danmakuWatch.ts 过审自查分流：自研登录态 → 走 danmakuApi', () => {
  it('checkApprovedDanmaku 用 isApproved 判定，200 → 过审、404 → 保留', async () => {
    watchDanmaku('app-1', '已过审的');
    watchDanmaku('pend-1', '还没过审的');
    h.api.isApproved.mockImplementation(async (id: string) => id === 'app-1');

    const approved = await checkApprovedDanmaku();
    expect(approved.map(a => a.id)).toEqual(['app-1']);
    // 未过审的仍留在待查里，下次再探
    expect(pendingDanmakuCount()).toBe(1);
  });

  it('checkApprovedDanmaku 断网抛错时保留条目（不误丢）', async () => {
    watchDanmaku('x-1', '探不到的');
    h.api.isApproved.mockRejectedValue(new Error('网络错误'));
    const approved = await checkApprovedDanmaku();
    expect(approved).toEqual([]);
    // 保留：下次再探（不当成被拒丢掉）
    expect(pendingDanmakuCount()).toBe(1);
  });

  it('过期清理在无待查时也照跑（不依赖 pb）', async () => {
    // 直接写一条 20 天前的（超过 14 天 EXPIRE_MS）
    localStorage.setItem('velvet:danmaku-watch', JSON.stringify([{ id: 'old-1', at: Date.now() - 20 * 24 * 3600 * 1000, text: '陈年' }]));
    const approved = await checkApprovedDanmaku();
    expect(approved).toEqual([]);
    expect(pendingDanmakuCount()).toBe(0);   // 陈年条目被扫掉
    expect(h.api.isApproved).not.toHaveBeenCalled();
  });
});
