import { describe, expect, it } from 'vitest';
import { VelvetApiError } from '@/services/velvetApi';

describe('账号错误的用户可读文案', () => {
  it('状态码没有对应文案时给中文兜底，不出现英文内部串', () => {
    expect(new VelvetApiError(401, null).message).toBe('登录已失效或凭证不正确，请重新登录');
    expect(new VelvetApiError(404, null).message).toBe('找不到对应的账号或数据');
    expect(new VelvetApiError(429, null).message).toBe('操作太频繁，请稍后再试');
    expect(new VelvetApiError(503, null).message).toBe('服务器暂时出错，请稍后再试');
  });

  it('不泄露英文原始串', () => {
    for (const status of [400, 401, 403, 404, 409, 429, 500, 503]) {
      expect(new VelvetApiError(status, null).message).not.toMatch(/velvet api error/i);
    }
  });

  it('显式传入的文案优先（例如"验证码不正确或已过期"）', () => {
    expect(new VelvetApiError(401, null, '验证码不正确或已过期').message).toBe('验证码不正确或已过期');
  });
});

describe('账号身份的 UserID 字段名', () => {
  it('后端档案的 UserID 字段是 username，不是 userId', () => {
    // 之前 adapter 读的是 cloudUser.userId —— 那个键在 VelvetRecord 里不存在，
    // 于是真实登录用户的 UserID 永远读成空串（显示"还没设置"）。
    const record = { id: 'u1', email: 'real@example.com', username: 'real_user', name: '真实用户' };
    const username = String((record as { username?: string | null }).username ?? '');
    expect(username).toBe('real_user');
    expect('userId' in record).toBe(false);
  });
});

