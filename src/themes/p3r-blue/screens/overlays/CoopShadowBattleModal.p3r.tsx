/**
 * 羁绊之影共斗（真实 CoopShadowBattleModal）—— 蓝白 P3R 战斗 UI：影时间舞台 + 影子剪影 + HP 斜条 + 指令面板（属性 LB/RB + 技能斜卡）+ 战斗日志。
 * 阶段：identify（识破进度 · BREAK THROUGH）/ battle（出手）/ attacked（今日已出手）/ closed（窗口闭合）/ done（已封印）/ nopersona
 *   #/overlay/bond-shadow-battle?phase=identify|battle|attacked|closed|done|nopersona&waiting=1
 *   #/overlay/bond-shadow-battle?fx=hit     攻击命中演出：斜斩白闪 → 影子受击震动 → 伤害数字砸下 → WEAK / CRITICAL 斜带 → HP 条扣减 → COMBO +1（约 2.4s）
 * 总攻击（COMBO ≥3 时出现 ALL-OUT READY）→ AllOut 演出；HP 归零 → onVictory → 共战结算。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { AttributeId } from '@real/types';
import type { OverlayProps } from '@blue/registry/types';
import { Portal, P3R, P3Progress, slantClip, tickClip, useEscape, useScrollLock } from '@blue/kit';
import { useBoldness } from '@blue/lib/prefs';
import { cx } from '@blue/lib/cx';
import { ATTR_NAMES } from '@blue/screens/pkg3/arcana';
import { Sparkle } from '@blue/screens/pkg3/ui';
import { useCooperationData } from '@blue/adapters/pkg3';
import { useCoopShadowBattle } from '@/themes/coopShadowData';
import type { CoopShadow, PersonaSkill } from '@real/types';
import { AllOut } from './AllOutOverlay.p3r';
import { VictoryScreen } from './CoopVictoryScreen.p3r';

type Phase = 'identify' | 'battle' | 'attacked' | 'closed' | 'done' | 'nopersona';
const KIND: Record<string, string> = { damage: '伤害', crit: '暴击', charge: '蓄力', buff: '强化', debuff: '弱化', heal: '治疗' };
const ATTR_GLYPH: Record<AttributeId, string> = { knowledge: '知', guts: '胆', dexterity: '巧', kindness: '柔', charm: '魅' };

/** 影子剪影（真实 ShadowBossSVG 的粉版程序画：深蓝墨身 + 蓝面具眼 + 青触须） */
export function ShadowFigure({ hidden, className }: { hidden?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 200 220" className={className} aria-hidden>
      <g opacity={hidden ? 0.35 : 1}>
        <path d="M100 18 C138 18 160 52 158 92 C176 104 188 132 176 160 C168 182 150 198 132 206 L120 186 L110 210 L98 188 L86 210 L76 186 L66 206 C44 196 26 180 22 156 C14 128 28 104 44 94 C40 54 62 18 100 18 Z" fill={hidden ? 'var(--p3r-ink)' : 'var(--p3r-mulberry)'} />
        {[[-1, 40], [1, 40]].map(([s, l], i) => <path key={i} d={`M${100 + s * 54} 120 q ${s * 30} 10 ${s * l} 48`} stroke="var(--p3r-cyan)" strokeWidth="6" fill="none" strokeLinecap="round" opacity={hidden ? 0 : 0.8} />)}
        {!hidden && <>
          <path d="M62 78 L138 78 L128 112 Q100 124 72 112 Z" fill="var(--p3r-cream)" />
          <path d="M74 88 L94 92 L90 102 L76 98 Z" fill="var(--p3r-blue)" />
          <path d="M126 88 L106 92 L110 102 L124 98 Z" fill="var(--p3r-blue)" />
          <path d="M100 112 L104 122 L96 122 Z" fill="var(--p3r-magenta)" />
        </>}
        {hidden && <text x="100" y="120" textAnchor="middle" fontSize="54" fontWeight="900" fill="var(--p3r-cream)" opacity=".7">?</text>}
      </g>
    </svg>
  );
}

export function ShadowBattle({ isOpen, onClose, partnerName, shadow, onVictory }: { isOpen: boolean; onClose: () => void; partnerName: string; shadow: CoopShadow | null; onVictory?: () => void }) {
  const bold = useBoldness();
  const model = useCoopShadowBattle(shadow, isOpen, partnerName);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [firing, setFiring] = useState(false);
  const [hit, setHit] = useState<{ dmg: number; weak: boolean; crit: boolean; k: number } | null>(null);
  const timers = useRef<number[]>([]);
  useScrollLock(isOpen);
  useEscape(isOpen && !firing, onClose);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const phase: Phase = !model.shadow ? 'nopersona'
    : model.shadow.status === 'defeated' ? 'done'
      : model.shadow.status === 'retreated' ? 'closed'
        : !model.bothIdentified ? 'identify'
          : !model.persona ? 'nopersona'
            : !model.windowOpen ? 'closed'
              : model.alreadyAttacked && !model.allOutAvailable ? 'attacked'
                : 'battle';
  const hpPct = model.hpMax ? Math.round((model.hp / model.hpMax) * 100) : 0;
  const fire = async (skill: PersonaSkill) => {
    if (phase !== 'battle') return;
    const result = await model.attack(skill);
    if (!result) return;
    if (!result.isBuffCast) {
      setHit({ dmg: result.attack.damageFinal, weak: result.weaknessBonus, crit: result.critTriggered, k: Date.now() });
      timers.current.push(window.setTimeout(() => setHit(null), 2100));
    }
    if (result.defeatedNow) timers.current.push(window.setTimeout(() => onVictory?.(), 900));
  };
  const allOut = async () => {
    setFiring(true);
    const result = await model.allOut();
    timers.current.push(window.setTimeout(() => {
      setFiring(false);
      if (result?.defeatedNow) onVictory?.();
    }, 1900));
  };
  const onInk = 'var(--p3r-on-ink)';
  if (!isOpen) return null;
  if (!model.shadow) {
    return (
      <Portal>
        <div className="fixed inset-0 flex items-center justify-center p-5" style={{ zIndex: 'var(--p3r-z-sheet)' as unknown as number, background: 'var(--p3r-scrim)' }}>
          <div role="dialog" aria-modal="true" aria-label="羁绊之影共斗" className="w-full max-w-sm px-6 py-7 text-center" style={{ background: P3R.panel, clipPath: slantClip(14), boxShadow: 'var(--p3r-shadow)' }}>
            <div className="font-heavy text-[20px]" style={{ color: P3R.ink }}>还没有进行中的羁绊之影</div>
            <p className="mt-2 text-[13px] leading-relaxed" style={{ color: P3R.grey }}>等新月或满月之夜再回来看。羁绊之影会绑定在已建立的 COOP 关系上。</p>
            <button type="button" onClick={onClose} className="mt-5 h-10 w-full font-heavy text-[14px]" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(8) }}>返回</button>
          </div>
        </div>
      </Portal>
    );
  }

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <motion.div key="sb" className="fixed inset-0 flex items-stretch justify-center wide:items-center wide:p-6" style={{ zIndex: 'var(--p3r-z-sheet)' as unknown as number, background: 'var(--p3r-scrim)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div role="dialog" aria-modal="true" aria-label="羁绊之影共斗" className="relative flex h-full w-full min-w-0 max-w-[760px] flex-col overflow-hidden wide:h-[min(90vh,880px)]"
              style={{ background: 'var(--p3r-sheet-grad)', clipPath: undefined }}
              initial={bold ? { y: 40, opacity: 0 } : { opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 320, damping: 30 }}>
              {/* 页头 */}
              <div className="relative flex shrink-0 items-center gap-3 px-4 pb-3 pt-[calc(12px+env(safe-area-inset-top))]" style={{ background: P3R.ink }}>
                <span aria-hidden className="absolute bottom-0 left-0 h-[4px] w-full" style={{ background: P3R.blue }} />
                <div className="min-w-0 flex-1">
                  <div className="font-cond text-[12px] tracking-[0.2em]" style={{ color: 'var(--bk-bubble-a)' }}>COOP SHADOW · {model.expiresLeft}</div>
                  <div className="truncate font-heavy text-[20px]" style={{ color: onInk }}>与 @{partnerName} 共战</div>
                </div>
                <div className="shrink-0 text-right"><div className="font-cond text-[11px]" style={{ color: onInk, opacity: 0.6 }}>SP</div><div className="font-cond text-[24px] leading-none" style={{ color: 'var(--bk-bubble-b)' }}>{model.onlineSp}</div></div>
                <button type="button" onClick={onClose} aria-label="关闭" className="flex h-10 w-11 shrink-0 items-center justify-center font-black" style={{ clipPath: slantClip(8), background: P3R.blue, color: P3R.onBlue }}>✕</button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                {/* 影子舞台 */}
                <div className="relative flex flex-col items-center overflow-hidden px-4 pt-3">
                  <span aria-hidden className="pointer-events-none absolute -left-6 top-0 select-none font-cond text-[110px] leading-none" style={{ color: 'var(--p3r-ghost)', transform: 'rotate(-12deg)' }}>SHADOW</span>
                  <motion.div key={hit?.k ?? 'idle'} className={cx(!hit && 'pk3-bob')} animate={hit && bold ? { x: [0, -12, 10, -6, 4, 0], rotate: [0, -3, 2, 0] } : {}} transition={{ duration: 0.45, delay: 0.3 }}>
                    <ShadowFigure hidden={!model.bothIdentified} className="h-[min(30vh,220px)] w-auto max-w-full" />
                  </motion.div>
                  <AnimatePresence>
                    {hit && (
                      <motion.div key={hit.k} className="pointer-events-none absolute inset-0" initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.25 } }}>
                        {bold && <motion.span aria-hidden className="absolute left-[-20%] top-[30%] h-[18%] w-[140%]" style={{ background: 'linear-gradient(90deg, transparent, var(--p3r-cream), var(--p3r-blue), transparent)', rotate: -18 }} initial={{ x: '-70%', opacity: 0 }} animate={{ x: '70%', opacity: [0, 1, 0] }} transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }} />}
                        {bold && <motion.span aria-hidden className="absolute inset-0" style={{ background: 'var(--p3r-cream)' }} initial={{ opacity: 0 }} animate={{ opacity: [0, 0.6, 0] }} transition={{ duration: 0.3, delay: 0.3 }} />}
                        <motion.div className="absolute left-1/2 top-[22%] -translate-x-1/2 font-cond text-[64px] leading-none tabular-nums" style={{ color: 'var(--p3r-cream)', WebkitTextStroke: '2px var(--p3r-blue-deep)', textShadow: '4px 4px 0 var(--p3r-blue)' }}
                          initial={bold ? { y: -30, opacity: 0, scale: 2 } : false} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ delay: 0.5, type: 'spring', stiffness: 420, damping: 16 }}>{hit.dmg}</motion.div>
                        <div className="absolute inset-x-0 top-[52%] flex flex-col items-center gap-1.5">
                          {hit.weak && <motion.span className="px-5 py-0.5 font-cond text-[22px] tracking-[0.2em]" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(10) }} initial={bold ? { x: -160, opacity: 0 } : false} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.75, type: 'spring', stiffness: 380, damping: 24 }}>WEAK!</motion.span>}
                          {hit.crit && <motion.span className="px-5 py-0.5 font-cond text-[22px] tracking-[0.2em]" style={{ background: P3R.magenta, color: '#fff', clipPath: slantClip(10) }} initial={bold ? { x: 160, opacity: 0 } : false} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.95, type: 'spring', stiffness: 380, damping: 24 }}>CRITICAL!</motion.span>}
                          {hit.weak && <motion.span className="font-cond text-[14px] tracking-wider" style={{ color: P3R.roseInk }} initial={bold ? { opacity: 0, y: 6 } : false} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }}>COMBO +1</motion.span>}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {model.bothIdentified && model.line && <p className="-mt-2 max-w-full px-4 py-1 text-[13px] font-bold italic" style={{ background: 'var(--p3r-mulberry)', color: 'var(--p3r-cream)', clipPath: slantClip(8) }}>{model.line}</p>}
                  <div className="relative mt-2 w-full max-w-[520px]">
                    <div className="flex min-w-0 items-baseline justify-between gap-2">
                      <span className="min-w-0 truncate font-heavy text-[17px]" style={{ color: P3R.ink }}>{model.bothIdentified ? model.displayName : '？？？'}</span>
                      <span className="shrink-0 font-cond text-[14px] tabular-nums" style={{ color: P3R.roseInk }}>HP {model.hp}/{model.hpMax}</span>
                    </div>
                    <div className="relative mt-1 h-4 overflow-hidden" style={{ clipPath: slantClip(8), background: 'var(--p3r-track)' }}>
                      <div className="absolute inset-y-0 left-0 w-full origin-left transition-transform duration-500" style={{ background: hpPct < 30 ? P3R.magenta : P3R.blue, transform: `scaleX(${model.hpMax ? model.hp / model.hpMax : 0})` }} />
                    </div>
                    {model.bothIdentified && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-bold">
                        <span className="px-2 py-0.5" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(5) }}>弱点：{model.attributeNames?.[model.weakness] ?? ATTR_NAMES[model.weakness]}</span>
                        <span style={{ color: P3R.grey }}>×1.3 伤害 · 弱点命中 COMBO +1</span>
                        <span className="ml-auto px-2 py-0.5 font-cond text-[13px]" style={{ background: P3R.ink, color: onInk, clipPath: slantClip(5) }}>COMBO × {model.combo}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 px-4 py-3">
                  {phase === 'identify' || !model.bothIdentified ? (
                    <div className="relative px-5 py-4" style={{ background: P3R.ink, color: onInk, clipPath: slantClip(14) }}>
                      <p className="text-[13px] leading-relaxed opacity-85">{model.description || '一只躲在阴影里的羁绊之影。'}</p>
                      <div className="mt-3 font-cond text-[12px] tracking-[0.2em]" style={{ color: 'var(--bk-bubble-a)' }}>识破进度 · BREAK THROUGH</div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {([['你', model.myIdentified], [`@${partnerName}`, model.partnerIdentified]] as const).map(([l, d]) => (
                          <div key={l} className="flex min-w-0 items-center gap-2 px-3 py-1.5 text-[13px] font-black" style={{ clipPath: slantClip(7), background: d ? P3R.blue : 'rgba(255,255,255,0.1)', color: d ? P3R.onBlue : onInk }}><span>{d ? '✓' : '·'}</span><span className="truncate">{l}</span></div>
                        ))}
                      </div>
                      {!model.myIdentified ? (
                        <button type="button" onClick={() => void model.identify()} disabled={model.working} className="relative mt-3 h-12 w-full font-heavy text-[17px] tracking-[0.18em] disabled:opacity-50" style={{ clipPath: slantClip(12), background: P3R.magenta, color: '#fff' }}>识破 SHADOW</button>
                      ) : <p className="mt-3 text-[13px] font-bold" style={{ color: 'var(--bk-bubble-a)' }}>✓ 你已识破 · 等待 @{partnerName} 一起揭开真相</p>}
                      <p className="mt-2 text-[11px] opacity-70">两人都识破后，这只影的真身才会现形。</p>
                    </div>
                  ) : (
                    <>
                      {model.resonanceActive ? (
                        <div className="flex min-w-0 items-center gap-3 px-4 py-3" style={{ background: P3R.cyanPale, clipPath: slantClip(10) }}>
                          <Sparkle size={22} className="pk3-twinkle shrink-0" style={{ color: P3R.blue }} />
                          <div className="min-w-0"><div className="text-[14px] font-black" style={{ color: P3R.ink }}>@{partnerName} 留下了共鸣印记</div><div className="text-[12px]" style={{ color: P3R.inkSoft }}>接力出手 · 下一击伤害 ×1.5 · {model.resonanceLeft}</div></div>
                        </div>
                      ) : <div className="text-[13px]" style={{ color: P3R.grey }}>✦ 印记由你留下 · 等待 @{partnerName} 接力</div>}
                      <div className="flex flex-wrap gap-2 text-[11px] font-black">
                        <span title="双方伤害 ×1.2" className="px-2 py-0.5" style={{ background: P3R.cyan, color: 'var(--p3r-mulberry)', clipPath: slantClip(5) }}>攻击强化 · 剩 {model.attackUp} 回合</span>
                        <span title="Boss 受到的伤害 ×1.15" className="px-2 py-0.5" style={{ background: P3R.magenta, color: '#fff', clipPath: slantClip(5) }}>易伤 · 剩 {model.vulnerability} 回合</span>
                      </div>
                      {model.allOutAvailable && (
                        <button type="button" onClick={allOut} disabled={firing} className="relative w-full overflow-hidden py-3 disabled:opacity-50" style={{ clipPath: slantClip(14), background: P3R.blue, color: P3R.onBlue }}>
                          <span aria-hidden className="absolute bottom-0 right-6 h-[8px] w-[20px]" style={{ background: P3R.magenta, clipPath: tickClip }} />
                          <span className="block font-cond text-[12px] tracking-[0.3em] opacity-85">ALL-OUT READY</span>
                          <span className="block font-cond text-[30px] leading-none tracking-[0.06em]">ALL-OUT</span>
                          <span className="block text-[11px] font-bold opacity-85">(Lv{model.myTotalLevels} + Lv{model.partnerTotalLevels}) × COMBO {Math.min(model.combo, 10)} ≈ {model.allOutDmg} · 不占当日回合</span>
                        </button>
                      )}
                      {phase === 'battle' && (
                        <div className="px-4 py-3" style={{ background: P3R.panel, clipPath: slantClip(12), boxShadow: 'var(--p3r-shadow)' }}>
                          <div className="flex min-w-0 items-center gap-2 text-[13px]">
                            {model.persona ? <span className="min-w-0 truncate" style={{ color: P3R.inkSoft }}>装备中 · <b style={{ color: P3R.roseInk }}>{model.equippedName}</b></span> : <span style={{ color: P3R.grey }}>—</span>}
                            <span className="ml-auto shrink-0 px-2 py-0.5 text-[12px] font-black" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(5) }}>{model.attributeNames?.[model.selectedAttr] ?? ATTR_NAMES[model.selectedAttr]}</span>
                          </div>
                          <div className="no-scrollbar mt-2 flex gap-1 overflow-x-auto">
                            {model.attributeIds.map((a) => (
                              <button key={a} type="button" onClick={() => model.setSelectedAttr(a)} className="relative flex shrink-0 items-center gap-1 px-3 py-1.5 text-[13px] font-black" style={{ clipPath: slantClip(7), background: model.selectedAttr === a ? P3R.ink : P3R.cyanFaint, color: model.selectedAttr === a ? onInk : P3R.ink }}>
                                <span className="font-heavy text-[12px] opacity-70">{ATTR_GLYPH[a]}</span>{model.attributeNames?.[a] ?? ATTR_NAMES[a]}
                              </button>
                            ))}
                          </div>
                          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {model.availableSkills.length === 0 ? <p className="col-span-full py-4 text-center text-[13px]" style={{ color: P3R.grey }}>此属性尚无可用技能（需要提升等级）</p> : model.availableSkills.map((s) => {
                              const isDmg = s.power > 0; const ex = expanded === s.name;
                              return (
                                <div key={s.name} className="relative min-w-0 pt-1.5">
                                  <div className="overflow-hidden" style={{ clipPath: slantClip(10), background: P3R.cyanFaint }}>
                                    <button type="button" onClick={() => fire(s)} className="flex w-full min-w-0 flex-col gap-1 px-4 py-2 text-left">
                                      <span className="flex min-w-0 items-center gap-2"><b className="min-w-0 truncate font-heavy text-[15px]" style={{ color: P3R.ink }}>{s.name}</b><span className="ml-auto shrink-0 px-1.5 text-[10px] font-black" style={{ background: P3R.cyan, color: 'var(--p3r-mulberry)', clipPath: slantClip(3) }}>{KIND[s.type]}</span></span>
                                      <span className="flex items-center gap-3 text-[12px]" style={{ color: P3R.inkSoft }}>
                                        {isDmg ? <span>PWR <b className="font-cond text-[17px]" style={{ color: P3R.ink }}>{s.power}</b></span> : <span>持续 <b className="font-cond">{(s as { turns?: number }).turns ?? 2}</b> 回合</span>}
                                        <span className="ml-auto font-cond text-[14px]" style={{ color: P3R.lilacInk }}>SP {s.spCost}</span>
                                      </span>
                                    </button>
                                    <button type="button" onClick={() => setExpanded(ex ? null : s.name)} className="w-full px-4 py-1 text-left text-[11px] font-bold" style={{ color: P3R.grey, borderTop: '1px solid rgb(var(--p3r-cyan-rgb) / 0.3)' }}>{ex ? '收起' : '简介'}</button>
                                    {ex && <p className="px-4 pb-2 text-[12px]" style={{ color: P3R.inkSoft }}>{s.description}</p>}
                                  </div>
                                  {model.selectedAttr === model.weakness && isDmg && <span className="absolute right-2 top-0 px-1.5 text-[10px] font-black" style={{ background: P3R.magenta, color: '#fff', clipPath: slantClip(3) }}>弱点</span>}
                                  {model.resonanceActive && isDmg && <span className="absolute left-3 top-0 px-1.5 text-[10px] font-black" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(3) }}>共鸣</span>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {phase === 'attacked' && <StateBox>你今日已出手 · 明天 18:00 后再来{model.allOutAvailable && <div className="mt-0.5" style={{ color: P3R.roseInk }}>（总攻击仍可使用）</div>}</StateBox>}
                      {phase === 'closed' && <StateBox>月相攻击窗口已闭合（每日 18:00 – 次日 07:00）</StateBox>}
                      {phase === 'done' && <StateBox>羁绊之影已封印</StateBox>}
                      {phase === 'nopersona' && <StateBox>你还没有创建 Persona —— 先去「逆影战场」召唤一位面具</StateBox>}
                    </>
                  )}
                  {model.error && <div className="px-4 py-2 text-[12px] font-black" style={{ background: P3R.magenta, color: '#fff', clipPath: slantClip(8) }}>{model.error}</div>}
                  {/* 战斗日志 */}
                  <div className="overflow-hidden" style={{ background: P3R.panel, clipPath: slantClip(12), boxShadow: 'var(--p3r-shadow)' }}>
                    <div className="flex items-center gap-2 px-4 py-1.5" style={{ background: P3R.ink }}><span className="font-heavy text-[13px]" style={{ color: onInk }}>战斗日志</span><span className="font-cond text-[11px]" style={{ color: 'var(--bk-bubble-a)' }}>BATTLE LOG</span></div>
                    {model.logs.length === 0 ? <div className="px-4 py-4 text-center text-[12px]" style={{ color: P3R.grey }}>尚无交手记录 —— 谁先出手？</div> : model.logs.slice(0, 8).map((a, i) => {
                      const isMe = a.who === 'me'; const isBuff = !!a.buff;
                      return (
                        <div key={a.id} className="flex min-w-0 items-start gap-2 px-4 py-2" style={{ background: i % 2 ? 'var(--p3r-row-alt)' : undefined }}>
                          <span aria-hidden className="mt-1 h-[10px] w-[10px] shrink-0" style={{ background: isBuff ? P3R.cyan : isMe ? P3R.blue : P3R.magenta, clipPath: tickClip }} />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[12px] font-black" style={{ color: isMe ? P3R.roseInk : 'var(--p3r-coral-ink)' }}>{isMe ? '你' : `@${partnerName}`} · {a.persona} · {a.skill}</div>
                            <div className="flex items-center gap-1.5 text-[11px]" style={{ color: P3R.inkSoft }}>
                              {isBuff ? <span className="font-bold" style={{ color: P3R.lilacInk }}>{a.buff === 'attack_up' ? '施加攻击强化' : '施加易伤'}</span> : (<><span className="font-cond text-[13px]">-{a.dmg}</span>{a.weakness && <span style={{ color: P3R.roseInk }}>弱点</span>}{a.resonance && <span style={{ color: 'var(--p3r-coral-ink)' }}>共鸣 ×1.5</span>}{a.crit && <span className="font-cond">CRIT</span>}</>)}
                            </div>
                          </div>
                          <span className="shrink-0 text-[10px]" style={{ color: P3R.grey }}>{a.ago}</span>
                        </div>
                      );
                    })}
                  </div>
                  <P3Progress value={model.hp} max={model.hpMax} className="hidden" />
                </div>
              </div>
            </motion.div>
            <AllOut isFiring={firing} personaName={model.equippedName} partnerName={partnerName} damage={firing ? model.allOutDmg : null} />
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

function StateBox({ children }: { children: ReactNode }) {
  return <div className="px-4 py-4 text-center text-[13px] font-black" style={{ background: P3R.cyanFaint, color: P3R.inkSoft, clipPath: slantClip(10) }}>{children}</div>;
}

export default function CoopShadowBattleModal({ open, onClose, params }: OverlayProps) {
  const { activeShadows, coopBonds } = useCooperationData();
  const shadowId = params?.get('shadow');
  const shadow = (shadowId ? activeShadows.find((item) => item.id === shadowId) : null) ?? activeShadows[0] ?? null;
  const bond = shadow ? coopBonds.find((item) => item.id === shadow.bondId) : null;
  const partnerName = bond?.otherProfile?.nickname || bond?.otherProfile?.userId || (shadow ? '对方' : '');
  const [victory, setVictory] = useState(false);
  return (
    <>
      <ShadowBattle isOpen={open && !victory} onClose={onClose} partnerName={partnerName} shadow={shadow}
        onVictory={() => window.setTimeout(() => setVictory(true), 300)} />
      <VictoryScreen isOpen={victory} onClose={() => { setVictory(false); onClose(); }} partnerName={partnerName} shadowName={shadow?.nameOverride || '羁绊之影'} />
    </>
  );
}
