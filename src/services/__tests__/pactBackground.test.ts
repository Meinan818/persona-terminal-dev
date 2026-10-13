/**
 * 后台提醒桥的配置：只服务自研会话，且只在已迁移的安卓原生上推凭据。
 * 原缺陷：桥只认 pb.authStore.token，自研登录时直接 return——自研账号永远配不上后台提醒。
 */
import { beforeEach, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  platform: 'android',
  native: true,
  configure: vi.fn(),
  velvetAuthed: true,
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => h.native, getPlatform: () => h.platform },
  registerPlugin: () => ({
    configure: h.configure,
    setEnabled: vi.fn(),
    clear: vi.fn(),
    checkNow: vi.fn(),
  }),
}));

vi.mock('../velvetApi', () => ({
  apiBaseUrl: 'https://maskaria.example.com',
  getToken: () => (h.velvetAuthed ? 'velvet-jwt' : null),
  getUserId: () => (h.velvetAuthed ? 'velvet-user' : null),
  isAuthenticated: () => h.velvetAuthed,
}));

import { configurePactRunner } from '../pactBackground';
import type { NotificationEntry } from '@/types';

const notifications: NotificationEntry[] = [{
  id: 'n1', userId: 'u', type: 'event_logged', payload: {},
  read: false, createdAt: new Date('2026-10-14T02:00:00.000Z'),
}];

beforeEach(() => {
  vi.clearAllMocks();
  h.platform = 'android';
  h.native = true;
  h.velvetAuthed = true;
  h.configure.mockResolvedValue(undefined);
});

it('自研会话（安卓）推自研契约，时间用 ISO 格式', async () => {
  await configurePactRunner(notifications, true);
  expect(h.configure).toHaveBeenCalledTimes(1);
  expect(h.configure.mock.calls[0][0]).toMatchObject({
    api: 'velvet',
    baseUrl: 'https://maskaria.example.com',
    token: 'velvet-jwt',
    userId: 'velvet-user',
    since: '2026-10-14T02:00:00.000Z',
    enabled: true,
  });
});

it('没登录时不配置后台任务', async () => {
  h.velvetAuthed = false;
  await configurePactRunner(notifications, true);
  expect(h.configure).not.toHaveBeenCalled();
});

it('iOS 上不推自研凭据（原生插件尚未迁移，推了也只会轮询错接口）', async () => {
  h.platform = 'ios';
  await configurePactRunner(notifications, true);
  expect(h.configure).not.toHaveBeenCalled();
});

it('不在原生壳里时什么都不做', async () => {
  h.native = false;
  await configurePactRunner(notifications, true);
  expect(h.configure).not.toHaveBeenCalled();
});
