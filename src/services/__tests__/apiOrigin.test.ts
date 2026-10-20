import { describe, expect, it } from 'vitest';
import { resolveApiUrl } from '../velvetApi';

describe('API 基址解析', () => {
  it('同源标记在运行时跟随当前页面 origin', () => {
    expect(resolveApiUrl('same-origin', 'https://staging.example.com')).toBe('https://staging.example.com');
    expect(resolveApiUrl('same-origin', 'http://150.158.174.9')).toBe('http://150.158.174.9');
  });

  it('明确地址继续使用配置值，空配置仍表示离线模式', () => {
    expect(resolveApiUrl('https://api.example.com/', 'http://ignored.example')).toBe('https://api.example.com');
    expect(resolveApiUrl(undefined, 'http://ignored.example')).toBe('');
  });
});
