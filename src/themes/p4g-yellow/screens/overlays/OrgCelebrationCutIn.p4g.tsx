/**
 * 组织庆祝卡（真实 src/components/org/OrgCelebrationCutIn.tsx，App 顶层排队弹出）
 * 三种：据点升级（「组织」Lv.N + 「等级名」· 同调的面具伤害 ×N）/ 满月团战 · 暗影击退 / 目标·作战达成
 * 真实 p4 频道走 CelebrationCutIn 基座（橙色贴纸圆）：图标 ⬆ / ☾ / ✦ → 题板=名字 → 旗标=heading → 奖励大字 + 说明；autoClose 3.6s。
 * 路由：#/overlay/hideout-org-celebration?kind=level|raid|op（索引「演出总览」三种各有入口）
 */
import type { OverlayProps } from '@yellow/registry/types';
import { CelebrationCutInP4G } from './CelebrationCutIn.p4g';
import { ORG } from '@yellow/mock/pkg4-org';

export type OrgCeleb =
  | { kind: 'level'; orgName: string; level: number; levelName?: string; mult: number }
  | { kind: 'raid'; orgName: string; boss: string; hitters: number; sp?: number; finisher?: boolean }
  | { kind: 'op'; orgName: string; opKind: 'small' | 'big'; title: string; sp?: number; partners: string[] };

const KL = { small: '目标', big: '作战' };
export function celebCopy(h: OrgCeleb) {
  const heading = h.kind === 'level' ? '据点升级' : h.kind === 'raid' ? '满月团战 · 暗影击退' : `${KL[h.opKind]}达成`;
  const name = h.kind === 'level' ? `「${h.orgName}」Lv.${h.level}` : h.kind === 'raid' ? `「${h.boss}」` : h.title;
  const reward = h.kind === 'op'
    ? [h.sp ? `+${h.sp} SP` : '', h.partners.length ? `与 ${h.partners.join('、')} 亲密度 +2` : ''].filter(Boolean).join(' · ') || '大家都做完了'
    : h.kind === 'raid' ? [h.sp ? `+${h.sp} SP` : '', '岁时册 +1 枚印记', h.finisher ? '最后一击是你' : ''].filter(Boolean).join(' · ')
      : `${h.levelName ? `「${h.levelName}」 · ` : ''}同调的面具伤害 ×${h.mult.toFixed(1)}`;
  const sub = h.kind === 'op' ? `「${h.orgName}」的${KL[h.opKind]}` : h.kind === 'raid' ? `「${h.orgName}」${h.hitters} 个人一起击退的` : '会议、目标、作战和团战攒下的经验';
  return { heading, name, reward, sub, eyebrow: h.kind === 'level' ? 'RANK UP' : h.kind === 'raid' ? 'SHADOW DOWN' : 'MISSION CLEAR', icon: h.kind === 'level' ? '⬆' : h.kind === 'raid' ? '☾' : '✦' };
}

export function OrgCelebration({ head, onClose }: { head: OrgCeleb | null; onClose: () => void }) {
  const c = head ? celebCopy(head) : null;
  return (
    <CelebrationCutInP4G open={!!head} onClose={onClose} icon={c?.icon} title={c?.name ?? ''} subtitle={c?.heading} eyebrow={c?.eyebrow} autoCloseMs={3600}>
      {c && (
        <div className="flex max-w-[min(340px,86vw)] flex-col items-center text-center">
          <span className="inline-block max-w-full -rotate-2 bg-p4g-black px-3 py-1 font-display text-h3 font-bold text-p4g-yellow shadow-[3px_3px_0_var(--p4g-orange)]"><span className="p4g-clamp-2">{c.reward}</span></span>
          <span className="mt-2 inline-block max-w-full bg-p4g-cream px-2 py-0.5 font-display text-meta font-bold text-p4g-black">{c.sub}</span>
        </div>
      )}
    </CelebrationCutInP4G>
  );
}

export const DEMO_CELEB: Record<string, OrgCeleb> = {
  level: { kind: 'level', orgName: ORG.name, level: 4, levelName: '作战本部', mult: 1.3 },
  raid: { kind: 'raid', orgName: ORG.name, boss: '嘲笑之月', hitters: 4, sp: 35, finisher: true },
  op: { kind: 'op', orgName: ORG.name, opKind: 'big', title: '一起做完期末复习', sp: 6, partners: ['千枝', '雪子'] },
};

export default function OrgCelebrationCutIn({ open, onClose, params }: OverlayProps) {
  const k = params?.get('kind') ?? 'level';
  return <OrgCelebration head={open ? DEMO_CELEB[k] ?? DEMO_CELEB.level : null} onClose={onClose} />;
}
