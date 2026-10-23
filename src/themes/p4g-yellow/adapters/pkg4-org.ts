/**
 * 数据适配层：pkg4-org
 * 初始状态 = 原样转发 demo 假数据（外观与 demo 完全一致，用来先验收版式）。
 * 接真实数据时：在下面「真实数据覆盖区」写同名导出覆盖掉 mock 的同名导出（ES 规则：本文件显式导出优先于 export *）。
 * 规则：只在这里接 store / utils，不改 screens/ 里的 JSX、className、style、动画。
 */
export * from '../mock/pkg4-org';

// ───── 真实数据覆盖区（按 INTEGRATE-THEMES.md 第 6 步填写）─────
export { useOrgView } from '@/themes/astrologyData';

import { useCloudSocialStore } from '@/store/cloudSocial';
import type { OrgView } from '@/types';

const emptyView = (): OrgView => {
  const template = mockBuildView();
  return {
    ...template,
    org: { ...template.org, id: '', name: '', motto: '', emblem: 'star', leaderId: '', inviteCode: '' },
    members: [],
    me: { ...template.me, id: '', orgId: '', userId: '', codename: '', slot: 'joined', seat: 0 },
    posts: [],
    reactions: [],
    ops: [],
    checkins: [],
    ledger: [],
    raids: [],
    raidHits: [],
  };
};

/** 真实数据覆盖：有云端组织时取第一个；没有组织时返回空视图，不回填演示数据。 */
export function buildView(): OrgView {
  const first = useCloudSocialStore.getState().orgs[0];
  if (first) return first;
  return emptyView();
}

import * as mock from '../mock/pkg4-org';
const mockBuildView = mock.buildView;
