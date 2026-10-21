/**
 * 名字特效 ConfidantNameFx · P4 分支独立入口（真实 src/components/cooperation/ConfidantNameFx.tsx）。
 * 真实挂在 ConfidantCard / ConfidantAlbumWall / Cooperation 好友行的名字上：
 *   waiting（今日 Ta 为你祈过、你还没回）→ 渐变流光；maxBond（羁绊 Lv.10）→ 强调橙 + 三颗上浮粒子；两态可叠加（流光优先）。
 * 这里把四种组合 × 三种底（奶油卡 = 浅底、选中行 = 日黑 / 夜黄、黑色 TV 面板 = 深底）摆在一起，验证「流光亮点背离底色」。
 * 同一个组件 `NameFx`（src/screens/pkg3/ui.tsx）也用在 #/p/cooperation 的同伴 / 好友列表与专辑墙。#/overlay/bond-namefx
 */
import type { OverlayProps } from '@yellow/registry/types';
import { P4Section, P4Sheet } from '@yellow/kit';
import { NameFx, Sparkle } from '@yellow/screens/pkg3/ui';
import { cx } from '@yellow/lib/cx';

const ROWS = [
  { name: '里中千枝', waiting: false, maxBond: false, note: '普通' },
  { name: '久慈川理世', waiting: true, maxBond: false, note: '待回祈 · 流光' },
  { name: '天城雪子', waiting: false, maxBond: true, note: '满级 · 橙 + 粒子' },
  { name: '白钟直斗', waiting: true, maxBond: true, note: '两态叠加 · 流光优先' },
];

function Rows({ tone }: { tone: 'card' | 'select' | 'tv' }) {
  return (
    <ul className={cx('grid grid-cols-1 overflow-hidden rounded-sm border-3', tone === 'tv' ? 'border-p4g-black bg-p4g-black text-p4g-yellow night:border-p4g-yellow' : 'border-p4g-black bg-p4g-surface text-p4g-ink night:border-p4g-line')}>
      {ROWS.map((r, i) => {
        const sel = tone === 'select' && i % 2 === 1;
        return (
          <li key={r.name} className={cx('flex min-w-0 items-center gap-2 px-3 py-2.5', i > 0 && (tone === 'tv' ? 'border-t border-white/15' : 'border-t-2 border-[color:var(--p4g-line-soft)]'), sel && 'bg-p4g-select text-[color:var(--p4g-select-ink)]')}>
            <Sparkle size={12} className={cx('shrink-0', r.waiting ? 'pk3-twinkle text-p4g-orange' : 'text-p4g-success')} />
            <NameFx waiting={r.waiting} maxBond={r.maxBond} className="min-w-0 flex-1 font-display text-lead font-bold">{r.name}</NameFx>
            <span className={cx('shrink-0 truncate text-cap', sel || tone === 'tv' ? 'opacity-80' : 'text-p4g-ink-soft')}>{r.note}</span>
          </li>
        );
      })}
    </ul>
  );
}

export default function ConfidantNameFxDemo({ open, onClose }: OverlayProps) {
  return (
    <P4Sheet open={open} onClose={onClose} title="名字特效" en="CONFIDANT NAME FX · P4" size="tall">
      <div className="flex min-w-0 flex-col gap-5 pt-1">
        <P4Section title="卡片上" en="ON LIGHT"><Rows tone="card" /></P4Section>
        <P4Section title="选中行" en="SELECTED"><Rows tone="select" /></P4Section>
        <P4Section title="黑色面板" en="ON DARK"><Rows tone="tv" /></P4Section>
        <p className="text-cap text-p4g-ink-soft">低动效 / 校直模式：流光与粒子都停，只留静态色（满级仍是橙字）。</p>
      </div>
    </P4Sheet>
  );
}
