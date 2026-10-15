/**
 * 资源地址解析单测。
 *
 * 重点防回归：后端给的相对头像路径（`/api/avatar/{id}`）在手机 APP 里会解析到
 * `https://localhost`（Capacitor WebView 的 origin）而 404，表现为「电脑端正常、
 * 手机端头像图裂」。这里钉死「相对路径必须拼上后端根地址」。
 */
import { describe, it, expect } from 'vitest';
import { resolveAssetUrl, isAbsoluteAssetUrl } from '../assetUrl';
import { apiBaseUrl } from '@/services/velvetApi';

describe('资源地址解析（防「手机端头像图裂」回归）', () => {
  it('后端给的相对路径会拼上后端根地址', () => {
    expect(resolveAssetUrl('/api/avatar/7')).toBe(`${apiBaseUrl}/api/avatar/7`);
  });

  it('已是绝对地址的原样返回（不重复拼接）', () => {
    expect(resolveAssetUrl('http://192.144.227.216/api/avatar/7')).toBe('http://192.144.227.216/api/avatar/7');
    expect(resolveAssetUrl('https://cdn.example.com/a.png')).toBe('https://cdn.example.com/a.png');
    expect(resolveAssetUrl('//cdn.example.com/a.png')).toBe('//cdn.example.com/a.png');
  });

  it('本地图片（data:/blob:）不受影响', () => {
    expect(resolveAssetUrl('data:image/png;base64,AAA')).toBe('data:image/png;base64,AAA');
    expect(resolveAssetUrl('blob:http://x/y')).toBe('blob:http://x/y');
  });

  it('空值返回 undefined（保持「无头像」分支不被破坏）', () => {
    expect(resolveAssetUrl(undefined)).toBeUndefined();
    expect(resolveAssetUrl(null)).toBeUndefined();
    expect(resolveAssetUrl('')).toBeUndefined();
    expect(resolveAssetUrl('   ')).toBeUndefined();
  });

  it('不以斜杠开头的相对片段也会补斜杠', () => {
    expect(resolveAssetUrl('api/avatar/7')).toBe(`${apiBaseUrl}/api/avatar/7`);
  });

  it('isAbsoluteAssetUrl 判定正确', () => {
    expect(isAbsoluteAssetUrl('http://a/b')).toBe(true);
    expect(isAbsoluteAssetUrl('data:image/png;base64,AA')).toBe(true);
    expect(isAbsoluteAssetUrl('blob:x')).toBe(true);
    expect(isAbsoluteAssetUrl('/api/avatar/1')).toBe(false);
    expect(isAbsoluteAssetUrl('api/avatar/1')).toBe(false);
  });
});
