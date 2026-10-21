/**
 * 羁绊升级演出 · 电视节目版（真实 ConfidantRankUpCutInP4，App 顶层常驻，经 ConfidantRankUpCutIn 分流）。
 * 1:1 复刻 P4G Social Link Rank Up：电视噪点切台 → 塔罗翻牌 + 白闪 → RANK UP!! → 分段条点亮。
 * 「继续收看」接力到恭喜页（ConfidantCelebrateScreenP4），再可进星移剪辑。Esc / SKIP 跳过。
 * #/overlay/bond-rankup-cutin-p4?id=c-chie&from=7&to=8&star=1
 */
import type { OverlayProps } from '@yellow/registry/types';
import { P4CinemaChain } from '@yellow/screens/pkg3/cinema';
import { ATTR_NAMES } from '@yellow/screens/pkg3/arcana';
import { PK3_CONFIDANTS } from '@yellow/adapters/pkg3';

export const demoNotice = (params?: URLSearchParams) => {
  const c = PK3_CONFIDANTS.find((x) => x.id === params?.get('id')) ?? PK3_CONFIDANTS[0];
  const to = Number(params?.get('to') ?? c.intimacy) || c.intimacy;
  const from = Number(params?.get('from') ?? to - 1);
  return { c: { ...c, intimacy: to }, notice: { oldLevel: Math.max(0, from), newLevel: to, starShiftGained: params?.get('star') !== '0' } };
};

export default function ConfidantRankUpCutInP4({ open, onClose, params }: OverlayProps) {
  const { c, notice } = demoNotice(params);
  return <P4CinemaChain open={open} onClose={onClose} confidant={c} notice={notice} start="stage" charges={(c.starShiftCharges ?? 0) + (notice.starShiftGained ? 1 : 0)} attrName={c.skillAttribute ? ATTR_NAMES[c.skillAttribute] : undefined} />;
}
