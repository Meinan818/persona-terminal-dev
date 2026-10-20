import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveStagingTarget } from './staging-coop-smoke.mjs';

const confirmation = { MASKARIA_STAGING_CONFIRM: 'isolated-staging' };

test('接受带受信任公网域名的 HTTPS staging 根地址', () => {
  assert.deepEqual(
    resolveStagingTarget({
      ...confirmation,
      MASKARIA_STAGING_URL: 'https://staging.maskaria.example/',
    }),
    {
      origin: 'https://staging.maskaria.example',
      hostname: 'staging.maskaria.example',
      port: 443,
    },
  );
});

test('拒绝未确认隔离环境的地址', () => {
  assert.throws(
    () => resolveStagingTarget({ MASKARIA_STAGING_URL: 'https://staging.maskaria.example' }),
    /MASKARIA_STAGING_CONFIRM/,
  );
});

test('拒绝 HTTP、带凭据、查询参数和路径的地址', () => {
  for (const value of [
    'http://staging.maskaria.example',
    'https://user:pass@staging.maskaria.example',
    'https://staging.maskaria.example?debug=1',
    'https://staging.maskaria.example/app',
  ]) {
    assert.throws(() => resolveStagingTarget({ ...confirmation, MASKARIA_STAGING_URL: value }));
  }
});

test('拒绝本机、LAN、私有 IP 与 .local 地址', () => {
  for (const value of [
    'https://localhost',
    'https://phone.local',
    'https://127.0.0.1',
    'https://10.18.1.2',
    'https://172.20.1.2',
    'https://192.168.1.2',
    'https://[::1]',
    'https://[fd00::1]',
  ]) {
    assert.throws(() => resolveStagingTarget({ ...confirmation, MASKARIA_STAGING_URL: value }));
  }
});
