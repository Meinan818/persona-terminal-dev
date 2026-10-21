/**
 * 据点庆祝（真实 src/components/org/OrgCelebrationCutIn.tsx · App 顶层，cloudSocial.orgCelebrations 排队一次一张）。
 * p3 频道走 CelebrationCutIn 庆祝基座：theme = level/raid → violet、op → gold；icon ⬆ / ☾ / ✦（粉版换 SVG，避开彩色 emoji）；
 * title = 名字行、subtitle = heading，children = 奖励大字 + 来源小字；autoCloseMs 3600、particles 18。
 * 文案拼装逐字同真实：
 *   level：heading「据点升级」 name「「组织名」Lv.N」 reward「「等级名」 · 同调的面具伤害 ×1.4」 sub「会议、目标、作战和团战攒下的经验」
 *   raid ：heading「满月团战 · 暗影击退」 name「「Boss」」 reward「+SP · 岁时册 +1 枚印记 · 最后一击是你」 sub「「组织名」N 个人一起击退的」
 *   op   ：heading「目标达成 / 作战达成」 name=标题 reward「+SP · 与 X、Y 亲密度 +2」 sub「「组织名」的目标 / 作战」
 * 路由：?kind=level|raid|op&op=small|big|queue；queue 可 ?from=2 从第 2 张直达；?phase=hold 直达终态。
 * 队列：关掉一张（✕ / 点遮罩 / 自动）→ shift → 下一张重新入场；连播里每张 2.6s（演出总览 8s 内播完 3 张，单张仍 3.6s）。
 */
import { useState } from 'react';
import type { OverlayProps } from '@blue/registry/types';
import { CelebrationCardPink, type CelebTheme, type FxStart } from '@blue/screens/pkg5/fx';

type OrgCeleb =
  | { kind: 'op'; orgName: string; title: string; opKind: 'small' | 'big'; sp: number; partners: string[] }
  | { kind: 'level'; orgName: string; level: number; mult: number; levelName?: string }
  | { kind: 'raid'; orgName: string; boss: string; sp: number; finisher: boolean; hitters: number };

const OP_KIND_LABEL = { small: '目标', big: '作战' } as const;
const ORG = '月光馆夜谈会';

export const ORG_CELEB_SAMPLES: Record<string, OrgCeleb> = {
  level: { kind: 'level', orgName: ORG, level: 6, mult: 1.4, levelName: '不夜城' },
  raid: { kind: 'raid', orgName: ORG, boss: '刈取者 · 满月之影', sp: 30, finisher: true, hitters: 5 },
  small: { kind: 'op', orgName: ORG, title: '本周每人读完一章', opKind: 'small', sp: 10, partners: ['岳羽', '伊织'] },
  big: { kind: 'op', orgName: ORG, title: '十月共读《人间失格》', opKind: 'big', sp: 40, partners: ['岳羽', '伊织', '真田'] },
};

function compose(head: OrgCeleb) {
  const heading = head.kind === 'level' ? '据点升级' : head.kind === 'raid' ? '满月团战 · 暗影击退' : `${OP_KIND_LABEL[head.opKind]}达成`;
  const name = head.kind === 'level' ? `「${head.orgName}」Lv.${head.level}` : head.kind === 'raid' ? `「${head.boss}」` : head.title;
  const reward = head.kind === 'op'
    ? [head.sp ? `+${head.sp} SP` : '', head.partners.length ? `与 ${head.partners.join('、')} 亲密度 +2` : ''].filter(Boolean).join(' · ') || '大家都做完了'
    : head.kind === 'raid'
      ? [head.sp ? `+${head.sp} SP` : '', '岁时册 +1 枚印记', head.finisher ? '最后一击是你' : ''].filter(Boolean).join(' · ')
      : `${head.levelName ? `「${head.levelName}」 · ` : ''}同调的面具伤害 ×${head.mult.toFixed(1)}`;
  const sub = head.kind === 'op' ? `「${head.orgName}」的${OP_KIND_LABEL[head.opKind]}` : head.kind === 'raid' ? `「${head.orgName}」${head.hitters} 个人一起击退的` : '会议、目标、作战和团战攒下的经验';
  const theme: CelebTheme = head.kind === 'level' || head.kind === 'raid' ? 'violet' : 'gold';
  return { heading, name, reward, sub, theme };
}

/** 图标（原 ⬆ / ☾ / ✦ 文字形；粉版 SVG 单色白） */
const Icon = ({ kind }: { kind: OrgCeleb['kind'] }) => (
  <span className="flex h-[64px] w-[64px] items-center justify-center" aria-hidden>
    {kind === 'level' ? (
      <svg viewBox="0 0 48 48" className="h-full w-full" fill="#fff"><path d="M24 4 L42 24 H31 V44 H17 V24 H6 Z" /><path d="M24 4 L42 24 H36 L24 11 L12 24 H6 Z" fill="rgba(255,255,255,0.55)" transform="translate(0 -3)" /></svg>
    ) : kind === 'raid' ? (
      <svg viewBox="0 0 48 48" className="h-full w-full"><path d="M30 6 A18 18 0 1 0 42 34 A14 14 0 1 1 30 6 Z" fill="#fff" /><circle cx="36" cy="12" r="2" fill="rgba(255,255,255,0.7)" /></svg>
    ) : (
      <svg viewBox="0 0 48 48" className="h-full w-full" fill="#fff"><path d="M24 2 Q26.6 21.4 46 24 Q26.6 26.6 24 46 Q21.4 26.6 2 24 Q21.4 21.4 24 2Z" /></svg>
    )}
  </span>
);

export function OrgCelebrationView({ open, onClose, head, autoCloseMs = 3600, startAt = 'enter', exitKey, counter }: { open: boolean; onClose: () => void; head: OrgCeleb; autoCloseMs?: number; startAt?: FxStart; exitKey?: string | number; counter?: string }) {
  const c = compose(head);
  return (
    <CelebrationCardPink open={open} onClose={onClose} theme={c.theme} icon={<Icon kind={head.kind} />} title={c.name} subtitle={c.heading} autoCloseMs={autoCloseMs} particles={18} startAt={startAt} exitKey={exitKey}>
      <div className="mt-1 w-full text-center">
        <div className="text-[clamp(16px,5vw,20px)] font-black leading-tight text-white">{c.reward}</div>
        <div className="mt-1 text-[11px] font-bold" style={{ color: 'rgba(255,255,255,0.82)' }}>{c.sub}</div>
        {counter && <div className="mt-3 font-cond text-[12px] tracking-[0.25em]" style={{ color: 'rgba(255,255,255,0.75)' }}>{counter}</div>}
      </div>
    </CelebrationCardPink>
  );
}

export default function OrgCelebrationCutIn({ open, onClose, params }: OverlayProps) {
  const kind = params?.get('kind') ?? 'level';
  const startAt: FxStart = params?.get('phase') === 'hold' ? 'hold' : 'enter';
  const queue: OrgCeleb[] = kind === 'queue'
    ? [ORG_CELEB_SAMPLES.small, ORG_CELEB_SAMPLES.big, ORG_CELEB_SAMPLES.level]
    : [kind === 'raid' ? ORG_CELEB_SAMPLES.raid : kind === 'op' ? ORG_CELEB_SAMPLES[params?.get('op') === 'big' ? 'big' : 'small'] : ORG_CELEB_SAMPLES.level];
  const [i, setI] = useState(() => Math.min(queue.length - 1, Math.max(0, Number(params?.get('from') ?? 1) - 1)));
  const head = queue[i];
  // shiftOrgCelebration：一张关掉 → 下一张（有遮罩开着时等它关，demo 里无其它弹层）
  const shift = () => { if (i < queue.length - 1) setI(i + 1); else onClose(); };
  return (
    <OrgCelebrationView open={open} onClose={shift} head={head} exitKey={i} startAt={i === 0 ? startAt : 'enter'}
      autoCloseMs={queue.length > 1 ? 2600 : 3600} counter={queue.length > 1 ? `${i + 1} / ${queue.length}` : undefined} />
  );
}
