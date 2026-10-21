/**
 * 羁绊页 Cooperation（真实 src/pages/Cooperation.tsx 的 p5 分支；视觉 = v3 pages/pages_a.js coop + org.p5.js coopKit + c.css）。
 * 构图：BondTitle「羁绊 / 组织」逐字瓷砖切换头（点「组织」/ 横拖 40px → #/p/hideout）+ 已缔结 N / 22 + ✧ 同伴系统菜单（P0-12 / P1-16）
 *      → 关于同伴系统（就地展开）→ 筛选 全部 / 离线 / 在线 / 归档 + 专辑墙 ⇄ 列表（右上角，持久记忆）
 *      → 专辑墙（塔罗卡墙 + 背后同心星随翻牌转 60° + 右侧详情：加点 / 谏言 / 星移）或 列表（在线好友卡 + 同伴条目 + 快捷祈愿 + ConfidantNameFx）
 *      → 右下 FAB「余 N 张」（缔结新的羁绊 → ConfidantCreateModal，P0-13）。
 * 「加点」→ ConfidantInteractionModal →「就这样记下」→ RANK UP → 确 认 → 恭喜页 → ✧ 使用星移 → 星移（升级链真实触发）。
 * 实现：src/screens/pkg3/coop.ts（命令式逐字迁移，宿主 ImperativePage）。
 * 路由：?view=wall|list  ?filter=all|offline|online|archived  ?state=empty（尚未与任何同伴建立羁绊）  ?menu=1（菜单展开）  ?info=1（关于展开）
 */
import type { PageProps } from '@/p5r-red/registry/types';
import { DevStateBar } from '@/p5r-red/kit/DevStateBar';
import { ImperativePage } from '../pkg3/host';
import { coopPage, applyCoopParams } from '../pkg3/coop';
import '../pkg3/pkg3.css';

export default function Cooperation({ params, wide }: PageProps) {
  const key = params.toString();
  return (
    <>
      <ImperativePage key={key} def={coopPage} wide={wide} before={() => applyCoopParams(params)} />
      <DevStateBar page="cooperation" items={[
        { label: '专辑墙', q: 'view=wall' }, { label: '列表', q: 'view=list' }, { label: '离线', q: 'filter=offline' }, { label: '在线', q: 'filter=online&view=list' },
        { label: '归档（空）', q: 'filter=archived' }, { label: '空', q: 'state=empty' }, { label: '菜单展开', q: 'menu=1' }, { label: '关于展开', q: 'info=1' },
      ]} />
    </>
  );
}
