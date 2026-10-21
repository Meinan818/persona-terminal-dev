/**
 * 组织据点页 Hideout（真实 src/pages/Hideout.tsx p5 分支 + components/org/*；视觉 = v3 最新 pages/org.p5.js + org.p5.css）。
 * 入口 = 羁绊页标题「羁绊 / 组织」切换头点「组织」（或横拖 40px）。页头同一个 BondTitle（点「羁绊」回 #/p/cooperation）+ 刷新 / 据点设置。
 * 构图 ①本机提示 ②两个组织切换条 ③TitleBlock + OrgLevelLine ④未选代表牌 ⑤HideoutMap（分区页签 / 座位 / 团战首领 / ⤢ 全屏）
 *      ⑥满月团战横条 ⑦黑斜条节标（名册标题可点：格子 ⇄ 专辑墙）⑧名册 / 公告板 / 作战 / 会议 ⑨邀请码 ⑩还可以加入一个组织；底部 DEMO 状态条。
 * 实现：src/screens/pkg3/hideout.ts（命令式逐字迁移，宿主 ImperativePage）；弹层走 pkg3/od.ts（d.js 据点段）。
 * 路由：?state=normal|two|notice|nocard|error|loading|empty|signed-out|member  ?tab=roster|board|ops|meeting  ?view=wall  ?raid=0
 */
import type { PageProps } from '@/p5r-red/registry/types';
import { ImperativePage } from '../pkg3/host';
import { orgPage, applyParams } from '../pkg3/hideout';
import '../pkg3/pkg3.css';

export default function Hideout({ params, wide }: PageProps) {
  const key = params.toString();
  return <ImperativePage key={key} def={orgPage} wide={wide} before={() => applyParams(params)} />;
}
