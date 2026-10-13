import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { authWithPassword, clearAuth, getAuthToken } from '../velvetApi';
import { changePasswordWithOld } from '../auth';

beforeEach(async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ token: 'synthetic-old', record: { id: 'test', email: 'test@example.invalid' } })));
  await authWithPassword('test', 'synthetic');
});
afterEach(() => { clearAuth(); vi.unstubAllGlobals(); });

it('自研账号改密走应用接口并保存新的登录会话', async () => {
  const spy = vi.fn().mockResolvedValue(Response.json({ token: 'synthetic-new', record: { id: 'test', email: 'test@example.invalid' } })); vi.stubGlobal('fetch', spy);
  await changePasswordWithOld('synthetic-old-password', 'synthetic-new-password', 'synthetic-new-password');
  expect(spy.mock.calls[0][0]).toContain('/api/velvet/change-password');
  expect(JSON.parse(spy.mock.calls[0][1].body)).toEqual({ oldPassword: 'synthetic-old-password', password: 'synthetic-new-password', passwordConfirm: 'synthetic-new-password' });
  expect(getAuthToken()).toBe('synthetic-new');
});
it('确认密码不同或长度不足时不发送请求', async () => {
  const spy = vi.fn(); vi.stubGlobal('fetch', spy);
  await expect(changePasswordWithOld('old', '123', '123')).rejects.toThrow('至少');
  await expect(changePasswordWithOld('old', 'synthetic-valid', 'different')).rejects.toThrow('不一致');
  expect(spy).not.toHaveBeenCalled();
});
