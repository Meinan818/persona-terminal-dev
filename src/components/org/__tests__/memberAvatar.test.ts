/**
 * 成员头像地址补全（防「手机 APP 里组织成员头像图裂」回归）。
 *
 * 由来：后端 `OrgService.toMemberView` 直接回 `users.avatar`，即 `/api/avatar/{id}`
 * 这种**相对路径**。APP 里 WebView origin 是 `https://localhost`，相对路径会打到本地
 * 404 → 图裂；网页端同源解析所以正常 —— 这就是「电脑/手机浏览器好、APP 裂」。
 *
 * 修复（6661229）当时只补了 8 个直接渲染点，`useMemberFace` 这条公共线漏了：
 * BoardSection / OpsSection / RosterWall / MemberCard / OpCreateSheet /
 * ShareToOrgSheet 的牌面全走它。这里钉死「这条线也必须补全」。
 */
import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';

vi.mock('@/services/velvetApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/velvetApi')>();
  return { ...actual, apiBaseUrl: 'http://192.144.227.216' };
});
vi.mock('@/ui/useTarotArtSet', () => ({ useTarotArtSet: () => 'p3' }));
vi.mock('@/store/cloudSocial', () => ({
  useCloudSocialStore: (sel: (s: { orgAvatarFaces: string[] }) => unknown) => sel({ orgAvatarFaces: [] }),
}));

import { useMemberFace } from '../MemberCard';

const API = 'http://192.144.227.216';

interface ProbeMember {
  userId: string;
  avatarUrl?: string;
  tarotId?: string;
}

/** 把 useMemberFace 的产出 url 渲染出来，作为「牌面实际拿到的地址」 */
const Probe = ({ member }: { member: ProbeMember }) => {
  const face = useMemberFace(member);
  return createElement('span', null, face.url ?? '');
};

const render = (member: ProbeMember) => renderToString(createElement(Probe, { member }));

describe('成员头像地址（防「APP 里组织成员头像图裂」回归）', () => {
  it('后端相对路径会补全成后端绝对地址', () => {
    expect(render({ userId: '7', avatarUrl: '/api/avatar/7' })).toContain(`${API}/api/avatar/7`);
  });

  it('已是绝对地址的原样保留（不重复拼接）', () => {
    expect(render({ userId: '7', avatarUrl: 'https://cdn.example.com/a.png' })).toContain(
      'https://cdn.example.com/a.png',
    );
  });

  it('没有头像时回落到代表牌，不会产出坏地址', () => {
    expect(render({ userId: '7' })).not.toContain('avatar/7');
  });
});
