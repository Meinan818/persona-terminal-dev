/**
 * CelebrationCutIn.p4g —— 庆祝贴纸基座（真实 CelebrationCutIn 的 P4 外观：橙色大圆贴纸 + 奶油描边圆 +
 * 黑斜章标题 + 花/星贴饰 + 粒子；关闭 aria「关闭」；底部 scaleX 倒计时条）。
 * 被 技能解锁 / 周目标领奖 / 记账完成 / 组织庆祝 等复用。?variant=ledger|weekly|org|plain 看几种复用形态。
 */
import type { OverlayProps } from '@yellow/registry/types';
import type { ReactNode } from 'react';
import { CelebrationStage, BadgeStar } from '@yellow/screens/pkg1/CelebrationStage';

export interface CelebrationCutInP4GProps extends OverlayProps {
  icon?: ReactNode; title: string; subtitle?: string; children?: ReactNode; autoCloseMs?: number; showClose?: boolean; tone?: 'orange' | 'yellow' | 'black'; eyebrow?: string;
}
export function CelebrationCutInP4G({ open, onClose, icon, title, subtitle, children, autoCloseMs = 3500, showClose = true, tone = 'orange', eyebrow }: CelebrationCutInP4GProps) {
  return (
    <CelebrationStage open={open} onClose={onClose} ariaLabel={title} eyebrow={eyebrow} autoCloseMs={autoCloseMs} showClose={showClose} badgeTone={tone}
      badge={<BadgeStar><span className="font-sans text-[clamp(40px,12vw,60px)] font-bold leading-none text-p4g-black" style={{ fontFamily: "system-ui, 'Segoe UI Symbol', 'Noto Sans Symbols 2', sans-serif" }}>{icon ?? '✦'}</span></BadgeStar>}
      plate={title} ribbon={subtitle} extra={children} />
  );
}

const VARIANTS: Record<string, Omit<CelebrationCutInP4GProps, 'open' | 'onClose'>> = {
  ledger: { icon: '💰', title: '记账完成', subtitle: '午饭 · 拉面 ¥28', autoCloseMs: 2600, tone: 'yellow', eyebrow: 'SAVED' },
  weekly: { icon: '✨', title: '奖励已领取！', autoCloseMs: 2600, eyebrow: 'WEEKLY', children: <p className="rounded-xs bg-p4g-black px-3 py-1 text-center font-display text-body font-bold text-p4g-cream">知识 <span className="p4g-num text-h2 text-p4g-yellow">+5</span></p> },
  org: { icon: '⬆', title: '调查队', subtitle: '组织升到 Lv.3', autoCloseMs: 3600, tone: 'black', eyebrow: 'ORG LEVEL UP' },
  plain: { title: '庆祝', subtitle: '基座：奶油描边圆 + 黑斜章标题 + 星贴饰 + 粒子', autoCloseMs: 0 },
};

export default function CelebrationCutIn({ open, onClose, params }: OverlayProps) {
  const v = VARIANTS[params?.get('variant') ?? 'ledger'] ?? VARIANTS.ledger;
  return <CelebrationCutInP4G open={open} onClose={onClose} {...v} />;
}
