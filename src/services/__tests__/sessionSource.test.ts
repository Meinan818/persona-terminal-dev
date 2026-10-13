/**
 * 路由判据只有这一份：存储里有 jwt 就算走自研后端。
 * 特别钉住「用户资料缺失/损坏也要算」——这是它比会话判据更抗损坏的地方。
 */
import { beforeEach, expect, it } from 'vitest';
import { hasBackendSession } from '../sessionSource';

beforeEach(() => {
  localStorage.clear();
});

it('没有令牌时不算自研会话', () => {
  expect(hasBackendSession()).toBe(false);
});

it('有令牌就算，即便用户资料缺失或损坏', () => {
  localStorage.setItem('velvet.jwt', 'tok-1');
  expect(hasBackendSession()).toBe(true);

  localStorage.setItem('velvet.record', '{损坏的 JSON');
  expect(hasBackendSession()).toBe(true);

  localStorage.removeItem('velvet.record');
  expect(hasBackendSession()).toBe(true);
});

it('清掉令牌后立刻不算（登出即改道 PocketBase）', () => {
  localStorage.setItem('velvet.jwt', 'tok-1');
  expect(hasBackendSession()).toBe(true);
  localStorage.removeItem('velvet.jwt');
  expect(hasBackendSession()).toBe(false);
});
