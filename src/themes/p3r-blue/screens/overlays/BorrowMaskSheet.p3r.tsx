/**
 * 同调 = 借面具（真实 src/components/org/BorrowMaskSheet.tsx）
 * 「X 展示的面具」+ 三枚标签（本周还能带进 N 场 / 据点 Lv.N · 威力 ×N / 只在本周有效）+ 说明；
 * 面具轮播（左右滑动 / 下方点点）：技能「威力 A → B」；借用 / 已装备；空提示（没有自己的面具 / Ta 没有展示面具）。
 * 路由：#/overlay/hideout-borrow-mask?m=2&state=nomine|empty|current
 */
import { motion, type PanInfo } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { OrgMember } from '@real/types';
import type { OverlayProps } from '@blue/registry/types';
import { P3Sheet, P3Button, P3Tag, P3R, slantClip, useToast } from '@blue/kit';
import { useLowMotion } from '@blue/lib/prefs';
import { ATTR_NAMES, ATTR_COLOR } from '@blue/mock/pkg4-tarot';
import { BORROW_BATTLES_PER_WEEK, LEVEL, MEMBERS } from '@blue/mock/pkg4-org';
import { displayCodename } from '@blue/screens/pkg4/org/common';

const TYPE_LABEL: Record<string, string> = { damage: '伤害', crit: '暴击', buff: '增伤', debuff: '易伤', charge: '蓄力', heal: '回复', attack_boost: '攻击增益' };
const isDamage = (t: string) => t === 'damage' || t === 'crit' || t === 'attack_boost';
const borrowed = (p: number) => Math.round(p * LEVEL.mult);
const effectText = (t: string, p: number) => (t === 'buff' ? '下次伤害 +50%' : t === 'debuff' ? '易伤：下次 +30%' : t === 'charge' ? '蓄力：下次伤害 ×2' : t === 'heal' ? `回复 ${Math.max(1, Math.round(borrowed(p) * 0.3))} HP` : '');

export function BorrowMask({ member, open, onClose, hasOwn = true, current, onBorrowed }: { member: OrgMember | null; open: boolean; onClose: () => void; hasOwn?: boolean; current?: { name: string; owner: string } | null; onBorrowed: (msg: string) => void }) {
  const low = useLowMotion();
  const masks = member?.card.personas ?? [];
  const [i, setI] = useState(0);
  const [equipped, setEquipped] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setI(0); }, [open, member?.id]);
  const name = member ? displayCodename(member) : '';
  const go = (d: number) => setI((v) => Math.max(0, Math.min(masks.length - 1, v + d)));
  const onPanEnd = (_: unknown, info: PanInfo) => { if (info.offset.x < -40) go(1); else if (info.offset.x > 40) go(-1); };
  const borrow = (pn: string) => { setBusy(true); window.setTimeout(() => { setBusy(false); setEquipped(pn); onBorrowed(`同调成功：「${pn}」在逆影战场面具切换栏的最后一格`); }, 600); };
  return (
    <P3Sheet open={open && !!member} onClose={onClose} busy={busy} title="同调" en="SYNC · BORROW MASK">
      <div className="space-y-3 pt-1">
        <div className="font-heavy text-[17px]" style={{ color: P3R.ink }}>{name} 展示的面具</div>
        <div className="flex flex-wrap gap-1.5">
          <P3Tag tone="soft">本周还能带进 {BORROW_BATTLES_PER_WEEK - 1} 场</P3Tag>
          <P3Tag tone="ink">据点 Lv.{LEVEL.level} · 威力 ×{LEVEL.mult.toFixed(1)}</P3Tag>
          <P3Tag tone="outline">只在本周有效</P3Tag>
        </div>
        <p className="text-[12.5px] leading-relaxed" style={{ color: P3R.inkSoft }}>同调来的面具是逆影战场面具切换栏的第六格：每周能带进 {BORROW_BATTLES_PER_WEEK} 场战斗（一场里第一次戴着它出手才算一场，之后这一场随便用），伤害 = 威力 × 据点系数，万能属性（出招、挨打都不吃克制和弱点）；戴着它的时候，你自己面具的被动不生效。</p>
        {current && <p className="text-[12.5px] font-bold leading-relaxed" style={{ color: P3R.ink }}>你现在同调着「{current.name}」（{current.owner} 的）。借用这里的任何一张都会替换它。</p>}
        {!hasOwn && <p className="text-[12.5px] font-black leading-relaxed" style={{ color: 'var(--p3r-coral-ink)' }}>你还没有自己的人格面具：先去逆影战场唤醒一张，才能同调别人的。</p>}
        {masks.length === 0 ? <p className="text-[14px] font-bold" style={{ color: P3R.grey }}>Ta 没有展示面具。</p> : (
          <>
            <motion.div className="touch-pan-y overflow-hidden" aria-label={`${name} 展示的面具，左右滑动切换`} role="region" onPanEnd={onPanEnd}>
              <motion.div className="flex" animate={{ x: `${-i * 100}%` }} transition={{ duration: low ? 0 : 0.26, ease: [0.2, 0.9, 0.1, 1] }}>
                {masks.map((p, k) => {
                  const on = equipped === p.name;
                  return (
                    <div key={p.name} className="w-full shrink-0 px-0.5" aria-label={`第 ${k + 1} 张：${p.name}`}>
                      <div className="overflow-hidden" style={{ background: '#0d162a', color: '#eef8ff', clipPath: slantClip(14) }}>
                        <div className="flex items-center gap-2 px-5 py-2" style={{ background: ATTR_COLOR[p.attribute] }}>
                          <span className="min-w-0 truncate font-heavy text-[19px]" style={{ color: 'var(--p3r-mulberry)' }}>{p.name}</span>
                          <span className="ml-auto shrink-0 px-1.5 text-[10.5px] font-black" style={{ background: '#0d162a', color: '#eef8ff', clipPath: slantClip(3) }}>{ATTR_NAMES[p.attribute]} · Lv.{p.level}</span>
                        </div>
                        <ul className="space-y-1 px-5 py-2">
                          {p.skills.map((s) => (
                            <li key={s.name} className="flex min-w-0 items-center gap-2 text-[12.5px]">
                              <span className="min-w-0 truncate font-black">{s.name}</span>
                              <span className="shrink-0 px-1 text-[10px] font-bold" style={{ background: 'rgba(255,255,255,0.1)' }}>{TYPE_LABEL[s.type]}</span>
                              <span className="ml-auto shrink-0 font-bold" style={{ color: '#9cbaff' }}>{isDamage(s.type) ? <>威力 {s.power} → <span className="font-cond text-[15px]">{borrowed(s.power)}</span></> : effectText(s.type, s.power)}</span>
                            </li>
                          ))}
                          {p.skills.length === 0 && <li className="text-[12px] font-bold" style={{ color: 'rgba(238,248,255,0.6)' }}>这张面具还没有解锁的技能</li>}
                        </ul>
                        <div className="px-5 pb-4"><P3Button block tone={on ? 'soft' : 'primary'} disabled={on || !hasOwn} busy={busy && !on} onClick={() => borrow(p.name)}>{on ? '已装备' : '借用'}</P3Button></div>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            </motion.div>
            {masks.length > 1 && (
              <div className="flex justify-center gap-2">
                {masks.map((p, k) => <button key={p.name} type="button" aria-label={`看第 ${k + 1} 张：${p.name}`} onClick={() => setI(k)} className="h-3" style={{ width: k === i ? 28 : 12, clipPath: slantClip(3), background: k === i ? P3R.blue : 'var(--p3r-track)' }} />)}
              </div>
            )}
          </>
        )}
      </div>
    </P3Sheet>
  );
}

export default function BorrowMaskSheet({ open, onClose, params }: OverlayProps) {
  const toast = useToast();
  const st = params?.get('state');
  const m = st === 'empty' ? MEMBERS[3] : MEMBERS[Number(params?.get('m') ?? 2)] ?? MEMBERS[2];
  return <BorrowMask member={m} open={open} onClose={onClose} hasOwn={st !== 'nomine'} current={st === 'current' ? { name: '巴御前', owner: '千枝' } : null} onBorrowed={(s) => toast.success(s)} />;
}
