/**
 * 羁绊名字演出 ConfidantNameFx · p3 分支独立入口（真实 src/components/cooperation/ConfidantNameFx.tsx；交互改写自黄色版，视觉蓝白 P3R）。
 * 真实挂在 ConfidantCard / ConfidantAlbumWall / Cooperation 好友行的名字上：
 *   waiting（今日 Ta 为你祈过、你还没回）→ 渐变流光；maxBond（羁绊 Lv.10）→ 青墨字 + 三颗上浮菱形粒子；两态可叠加（流光优先）。
 * 四种组合 × 三种底（白斜卡 = 浅底、蓝选中行、墨色面板 = 夜间翻浅）摆在一起，验证「流光亮点背离底色」。
 * 同一个组件 `NameFx`（src/screens/pkg3/ui.tsx）也用在 #/p/cooperation 的同伴 / 好友列表与专辑墙。
 * 演出时序（fxMs 3200）：0 三块面板斜切错位入场（stagger 90ms）→ 700ms 流光点亮（待回祈行）→ 1500ms 满级粒子 + 青字 → 2400ms 底部说明台词框停留。
 * 直达：?phase=enter|flow|max|hold；低动效直出 hold 终态（动画停、只留静态色）。#/overlay/bond-namefx
 */
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { OverlayProps } from '@blue/registry/types';
import { P3Sheet, P3R, slantClip, SelectWedge } from '@blue/kit';
import { useLowMotion } from '@blue/lib/prefs';
import { cx } from '@blue/lib/cx';
import { MiniLabel, NameFx, Sparkle } from '@blue/screens/pkg3/ui';

const ROWS = [
  { name: '岳羽由加莉', waiting: false, maxBond: false, note: '普通' },
  { name: '山岸风花', waiting: true, maxBond: false, note: '待回祈 · 流光' },
  { name: '桐条美鹤', waiting: false, maxBond: true, note: '满级 · 青 + 粒子' },
  { name: '埃癸斯', waiting: true, maxBond: true, note: '两态叠加 · 流光优先' },
];
const PHASES = ['enter', 'flow', 'max', 'hold'] as const;
type Phase = (typeof PHASES)[number];
const AT: Record<Phase, number> = { enter: 0, flow: 700, max: 1500, hold: 2400 };

function Rows({ tone, stage }: { tone: 'card' | 'select' | 'ink'; stage: number }) {
  const bg = tone === 'ink' ? P3R.ink : P3R.panel;
  return (
    <ul className="grid min-w-0 grid-cols-1 gap-1 py-2 pl-4 pr-3" style={{ clipPath: slantClip(12), background: bg, boxShadow: tone === 'ink' ? undefined : 'var(--p3r-shadow)' }}>
      {ROWS.map((r, i) => {
        const sel = tone === 'select' && i % 2 === 1;
        const fg = tone === 'ink' ? 'var(--p3r-on-ink)' : sel ? P3R.onBlue : P3R.ink;
        return (
          <li key={r.name} className="relative flex min-h-[40px] min-w-0 items-center gap-2 py-1.5 pl-4 pr-3">
            {sel && <span aria-hidden className="absolute inset-0" style={{ background: P3R.blue, clipPath: slantClip(9) }} />}
            {sel && <SelectWedge className="-left-2 top-1/2 h-[22px] w-[26px] -translate-y-1/2" />}
            <Sparkle size={12} className={cx('relative shrink-0', r.waiting && stage >= 1 && 'pk3-twinkle')} style={{ color: r.waiting ? (sel ? P3R.onBlue : P3R.magenta) : tone === 'ink' ? P3R.cyan : P3R.blue }} />
            <span className="relative min-w-0 flex-1" style={{ color: fg }}>
              <NameFx waiting={r.waiting && stage >= 1} maxBond={r.maxBond && stage >= 2} className="max-w-full font-heavy text-[17px] leading-tight">{r.name}</NameFx>
            </span>
            <span className="relative shrink-0 truncate text-[11px] font-bold" style={{ color: fg, opacity: 0.78 }}>{r.note}</span>
          </li>
        );
      })}
    </ul>
  );
}

export default function ConfidantNameFxDemo({ open, onClose, params }: OverlayProps) {
  const low = useLowMotion();
  const start = (params?.get('phase') as Phase) || 'enter';
  const startIdx = Math.max(0, PHASES.indexOf(start));
  const [stage, setStage] = useState(low ? 3 : startIdx);
  useEffect(() => {
    if (!open) return;
    if (low) { setStage(3); return; }
    setStage(startIdx);
    const base = AT[PHASES[startIdx]];
    const ts = PHASES.slice(startIdx + 1).map((p, k) => window.setTimeout(() => setStage(startIdx + k + 1), AT[p] - base));
    return () => ts.forEach((t) => window.clearTimeout(t));
  }, [open, low, startIdx]);
  const enter = (i: number) => (low || startIdx > 0
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.16 } }
    : { initial: { opacity: 0, x: -36, clipPath: 'inset(0 100% 0 0)' }, animate: { opacity: 1, x: 0, clipPath: 'inset(0 0% 0 0)' }, transition: { duration: 0.34, delay: 0.09 * i, ease: [0.2, 0.8, 0.2, 1] as [number, number, number, number] } });
  const phaseLabel = ['ENTER', 'FLOW', 'MAX BOND', 'HOLD'][stage];
  return (
    <P3Sheet open={open} onClose={onClose} title="名字特效" en="CONFIDANT NAME FX" size="tall"
      headerExtra={<span className="shrink-0 px-2 py-0.5 font-cond text-[11px] tracking-wider" style={{ clipPath: slantClip(4), background: P3R.ink, color: 'var(--p3r-on-ink)' }}>{phaseLabel}</span>}>
      <div className="flex min-w-0 flex-col gap-3 pt-1">
        {(['card', 'select', 'ink'] as const).map((tone, i) => (
          <motion.section key={tone} className="min-w-0" {...enter(i)}>
            <MiniLabel en={tone === 'card' ? 'ON LIGHT' : tone === 'select' ? 'SELECTED' : 'ON INK'}>{tone === 'card' ? '白斜卡上' : tone === 'select' ? '蓝选中行' : '墨色面板'}</MiniLabel>
            <Rows tone={tone} stage={stage} />
          </motion.section>
        ))}
        <motion.p className="px-4 py-2.5 text-[12px] font-bold leading-relaxed" style={{ clipPath: slantClip(9), background: 'var(--p3r-row-alt)', color: P3R.inkSoft }}
          initial={false} animate={{ opacity: stage >= 3 ? 1 : 0, x: stage >= 3 || low ? 0 : 18 }} transition={{ duration: low ? 0.12 : 0.26 }}>
          流光亮点往背离底色的方向走：浅底在蓝与原字色之间流，深底扫到冰白高光。低动效 / 校直模式：流光与粒子都停，只留静态色（满级仍是青字）。
        </motion.p>
      </div>
    </P3Sheet>
  );
}
