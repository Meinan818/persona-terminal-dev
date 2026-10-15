import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateReleaseUrl, verifyReleaseAssets } from './verify-release.mjs';

test('正式地址拒绝手机自身、非HTTP及携带凭据的地址', () => {
  for (const url of ['http://localhost:8080', 'http://127.0.0.1:8080', 'http://[::1]:8080',
    'http://0.0.0.0', 'ftp://example.com', 'https://user:pass@example.com', 'https://example.com?key=x']) {
    assert.throws(() => validateReleaseUrl(url));
  }
  assert.equal(validateReleaseUrl('https://example.com/'), 'https://example.com');
});

test('拒绝与2.8.3故障相同的localhost产物，即使其他脚本含正式地址', () => {
  assert.throws(() => verifyReleaseAssets(['const API="http://localhost:8080";',
    'const unrelated="http://192.144.227.216";'], 'http://192.144.227.216'), /本机后端/);
});

test('缺失正式地址时失败，通过只允许确实包含目标地址的产物', () => {
  assert.throws(() => verifyReleaseAssets(['const API="https://other.example";'], 'https://api.example'), /未包含/);
  assert.doesNotThrow(() => verifyReleaseAssets(['const API="https://api.example";'], 'https://api.example'));
});
