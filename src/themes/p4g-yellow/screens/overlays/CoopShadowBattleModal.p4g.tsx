/**
 * 羁绊之影共斗（真实 CoopShadowBattleModal）——P4G 战斗 UI 版式：电视里的雾舞台 + 影子立绘 + 黄色 HP 条 + 黑底指令面板。
 * 阶段：identify（识破进度 · BREAK THROUGH）/ battle（属性 Tab + 技能卡 + 总攻击）/ attacked（今日已出手）/ closed（窗口闭合）/ done（已封印）/ nopersona
 * #/overlay/bond-shadow-battle?phase=identify|battle|attacked|closed|done|nopersona&waiting=1
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';
import type { AttributeId } from '@/types';
import type { OverlayProps } from '@yellow/registry/types';
import { Portal, P4Outline, useEscape, useScrollLock } from '@yellow/kit';
import { TVPowerOn, SignalGlitch } from '@yellow/fx';
import { p4gAsset } from '@yellow/lib/asset';
import { cx } from '@yellow/lib/cx';
import { ATTR_IDS, ATTR_NAMES } from '@yellow/screens/pkg3/arcana';
import { PK3_BATTLE_LOG, PK3_PERSONAS, PK3_SHADOW, type Pk3BattleLog } from '@yellow/adapters/pkg3';
import { PK3_SHADOW_IMG, Sparkle } from '@yellow/screens/pkg3/ui';
import { AllOut } from './AllOutOverlay.p4g';

type Phase = 'identify' | 'battle' | 'attacked' | 'closed' | 'done' | 'nopersona';
const ATTR_ICON: Record<AttributeId, string> = { knowledge: '📘', guts: '🔥', dexterity: '🎯', kindness: '🌿', charm: '✨' };
const KIND: Record<string, string> = { damage: '伤害', crit: '暴击', charge: '蓄力', buff: '强化', debuff: '弱化', heal: '治疗', attack_boost: '攻击强化' };

export function ShadowBattle({ isOpen, onClose, partnerName, initialPhase = 'battle', partnerIdentified = true, onVictory }: { isOpen: boolean; onClose: () => void; partnerName: string; initialPhase?: Phase; partnerIdentified?: boolean; onVictory?: () => void }) {
  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [hp, setHp] = useState(PK3_SHADOW.hpCurrent);
  const [myId, setMyId] = useState(initialPhase !== 'identify');
  const [attr, setAttr] = useState<AttributeId>('guts');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [log, setLog] = useState<Pk3BattleLog[]>(PK3_BATTLE_LOG);
  const [allOutUsed, setAllOutUsed] = useState(false);
  const [firing, setFiring] = useState(false);
  const [dmgPop, setDmgPop] = useState<number | null>(null);
  const [combo, setCombo] = useState(PK3_SHADOW.comboCount);
  const [sp, setSp] = useState(42);
  useScrollLock(isOpen);
  useEscape(isOpen && !firing, onClose);
  useEffect(() => { if (isOpen) { setPhase(initialPhase); setMyId(initialPhase !== 'identify'); setHp(PK3_SHADOW.hpCurrent); setAllOutUsed(false); } }, [isOpen, initialPhase]);
  const persona = PK3_PERSONAS.find((p) => p.attr === attr) ?? null;
  const hpPct = Math.round((hp / PK3_SHADOW.hpMax) * 100);
  const identified = myId && partnerIdentified;
  const myLv = 46; const partnerLv = 38;
  const allOutDmg = Math.round((myLv + partnerLv) * Math.min(combo, 5));
  const fire = (s: (typeof PK3_PERSONAS)[number]['skills'][number]) => {
    if (phase !== 'battle') return;
    if (sp < s.sp) { setErr(`SP 不足（需 ${s.sp}）`); return; }
    setErr(null); setSp((v) => v - s.sp);
    const weak = attr === PK3_SHADOW.weakness;
    const dmg = s.power ? Math.round(s.power * (weak ? 1.3 : 1) * 1.5) : 0;
    if (dmg) { setHp((h) => Math.max(0, h - dmg)); setDmgPop(dmg); window.setTimeout(() => setDmgPop(null), 900); }
    if (weak) setCombo((c) => c + 1);
    setLog((l) => [{ id: `me${Date.now()}`, who: 'me', persona: persona?.name ?? '', skill: s.name, dmg, weakness: weak, resonance: PK3_SHADOW.resonance.by === 'partner', crit: s.kind === 'crit', ago: '刚刚', buff: s.kind === 'buff' ? 'attack_up' : s.kind === 'debuff' ? 'vulnerability' : undefined }, ...l]);
    setPhase('attacked');
  };
  const allOut = () => {
    setFiring(true);
    window.setTimeout(() => { setHp((h) => Math.max(0, h - allOutDmg)); setAllOutUsed(true); }, 900);
    window.setTimeout(() => { setFiring(false); if (hp - allOutDmg <= 0) { setPhase('done'); onVictory?.(); } }, 1900);
  };
  const allOutAvailable = identified && combo >= 3 && !allOutUsed && phase !== 'done' && phase !== 'closed';

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <motion.div key="sb" className="fixed inset-0 flex items-stretch justify-center bg-p4g-black wide:items-center wide:p-6" style={{ zIndex: 'var(--p4g-z-sheet)' as unknown as number }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <img src={p4gAsset('tv-world-fog.webp')} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
            <TVPowerOn className="relative flex h-full w-full max-w-[760px] min-w-0 flex-col overflow-hidden bg-p4g-black/60 wide:h-[min(90vh,880px)] wide:rounded-sm wide:border-3 wide:border-p4g-yellow wide:shadow-[8px_8px_0_var(--p4g-orange)]">
              {/* 页头 */}
              <div className="flex shrink-0 items-center gap-3 bg-p4g-black px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="font-display text-2xs font-bold tracking-[0.24em] text-p4g-orange">COOP SHADOW · {PK3_SHADOW.expiresLeft}</div>
                  <div className="truncate font-display text-h3 font-bold text-white">与 @{partnerName} 共战</div>
                </div>
                <div className="shrink-0 text-right"><div className="font-display text-2xs font-bold text-white/60">SP</div><div className="p4g-num text-h3 text-p4g-sp">{sp}</div></div>
                <button type="button" onClick={onClose} aria-label="关闭" className="p4g-press flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border-3 border-p4g-yellow bg-p4g-yellow font-bold text-p4g-black">✕</button>
              </div>
              <div aria-hidden className="h-[6px] shrink-0 p4g-candy" />

              <div className="min-h-0 flex-1 overflow-y-auto">
                {/* 影子舞台 */}
                <div className="relative flex flex-col items-center px-4 pt-3">
                  <SignalGlitch active={!identified} loop={!identified} noise={false}>
                    <img src={PK3_SHADOW_IMG} alt="" className={cx('pk3-bob h-[min(34vh,260px)] w-auto max-w-full object-contain', !identified && 'opacity-40 brightness-0')} />
                  </SignalGlitch>
                  <AnimatePresence>{dmgPop && <motion.div key={dmgPop} className="absolute top-1/3 p4g-num text-mega text-white" style={{ WebkitTextStroke: '3px var(--p4g-black)' }} initial={{ y: 20, opacity: 0, scale: 1.6 }} animate={{ y: -20, opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>{dmgPop}</motion.div>}</AnimatePresence>
                  {identified && <p className="-mt-2 rounded-[2px] bg-[color:var(--p4g-msg)] px-3 py-1 text-meta italic text-[color:var(--p4g-msg-ink)]">{PK3_SHADOW.line}</p>}
                  <div className="mt-2 w-full max-w-[520px]">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="min-w-0 truncate font-display text-lead font-bold text-white">{identified ? PK3_SHADOW.name : '？？？'}</span>
                      <span className="shrink-0 p4g-num text-meta text-p4g-yellow">HP {hp}/{PK3_SHADOW.hpMax}</span>
                    </div>
                    <div className="mt-1 h-4 overflow-hidden rounded-[2px] border-2 border-p4g-black bg-p4g-black"><div className="h-full origin-left bg-p4g-hp transition-transform duration-slow" style={{ transform: `scaleX(${hp / PK3_SHADOW.hpMax})` }} /></div>
                    {identified && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-cap">
                        <span className="rounded-[2px] bg-p4g-orange px-2 py-0.5 font-bold text-p4g-black">{ATTR_ICON[PK3_SHADOW.weakness]} 弱点：{ATTR_NAMES[PK3_SHADOW.weakness]}</span>
                        <span className="text-white/60">×1.3 伤害 · 弱点命中 COMBO +1</span>
                        <span className="ml-auto rounded-[2px] bg-p4g-black px-2 py-0.5 p4g-num text-p4g-yellow">COMBO × {combo}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 px-4 py-3">
                  {phase === 'identify' || !identified ? (
                    <div className="rounded-sm border-3 border-p4g-yellow bg-p4g-black p-4 text-white">
                      <p className="text-meta text-white/80">{PK3_SHADOW.description || '一只躲在阴影里的羁绊之影。'}</p>
                      <div className="mt-3 font-display text-cap font-bold tracking-[0.2em] text-p4g-yellow">识破进度 · BREAK THROUGH</div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {[['你', myId], [`@${partnerName}`, partnerIdentified]].map(([l, d]) => (
                          <div key={String(l)} className={cx('flex min-w-0 items-center gap-2 rounded-full border-2 px-3 py-1.5 text-meta font-bold', d ? 'border-p4g-yellow bg-p4g-yellow text-p4g-black' : 'border-white/30 text-white/70')}><span>{d ? '✓' : '·'}</span><span className="truncate">{String(l)}</span></div>
                        ))}
                      </div>
                      {!myId ? (
                        <button type="button" onClick={() => { setMyId(true); if (partnerIdentified) setPhase('battle'); }} className="p4g-press relative mt-3 w-full overflow-hidden rounded-sm border-3 border-p4g-black bg-p4g-red py-3 font-display text-lead font-bold tracking-[0.2em] text-white shadow-[4px_4px_0_var(--p4g-yellow)]"><span className="relative">🌑 识破 SHADOW</span></button>
                      ) : <p className="mt-3 text-meta font-bold text-p4g-yellow">✓ 你已识破 · 等待 @{partnerName} 一起揭开真相</p>}
                      <p className="mt-2 text-2xs text-white/60">两人都识破后，这只影的真身才会现形。</p>
                    </div>
                  ) : (
                    <>
                      {/* 共鸣印记 / 共享 buff */}
                      {PK3_SHADOW.resonance.by === 'partner' ? (
                        <div className="flex min-w-0 items-center gap-3 rounded-sm border-3 border-p4g-black bg-p4g-orange p-3 text-p4g-black">
                          <Sparkle size={22} className="pk3-twinkle shrink-0" />
                          <div className="min-w-0"><div className="font-bold">@{partnerName} 留下了共鸣印记</div><div className="text-cap">接力出手 · 下一击伤害 ×1.5 · {PK3_SHADOW.resonance.left}</div></div>
                        </div>
                      ) : <div className="flex items-center gap-2 text-meta text-white/70"><span className="text-base opacity-40">✦</span><span>印记由你留下 · 等待 @{partnerName} 接力</span></div>}
                      <div className="flex flex-wrap gap-2 text-cap font-bold">
                        <span title="双方伤害 ×1.2" className="rounded-[2px] bg-p4g-success px-2 py-0.5 text-p4g-success-ink">🛡 攻击强化 · 剩 {PK3_SHADOW.attackUp} 回合</span>
                        <span title="Boss 受到的伤害 ×1.15" className="rounded-[2px] bg-p4g-purple px-2 py-0.5 text-white">💢 易伤 · 剩 {PK3_SHADOW.vulnerability} 回合</span>
                      </div>

                      {allOutAvailable && (
                        <button type="button" onClick={allOut} disabled={firing} className="p4g-press relative w-full overflow-hidden rounded-sm border-3 border-p4g-black bg-p4g-red py-3 text-white shadow-[5px_5px_0_var(--p4g-yellow)] disabled:opacity-50">
                          <span className="block font-display text-cap font-bold tracking-[0.3em] text-p4g-yellow">ALL-OUT READY</span>
                          <P4Outline size={30} stroke={6} italic fill="var(--p4g-white)" strokeColor="var(--p4g-black)">ALL-OUT</P4Outline>
                          <span className="block text-2xs text-white/85">(Lv{myLv} + Lv{partnerLv}) × COMBO {Math.min(combo, 5)} ≈ {allOutDmg} · 不占当日回合</span>
                        </button>
                      )}

                      {phase === 'battle' && (
                        <div className="rounded-sm border-3 border-p4g-yellow bg-p4g-black p-3 text-white">
                          <div className="flex min-w-0 items-center gap-2 text-meta">
                            {persona ? <span className="min-w-0 truncate"><span className="opacity-60">装备中 ·</span> <span className="font-bold text-p4g-yellow">{persona.name}</span></span> : <span className="opacity-60">—</span>}
                            <span className="ml-auto shrink-0 rounded-[2px] bg-p4g-yellow px-2 py-0.5 font-bold text-p4g-black">{ATTR_ICON[attr]} {ATTR_NAMES[attr]}</span>
                          </div>
                          <div className="pk3-noscroll mt-2 flex gap-1 overflow-x-auto">
                            {ATTR_IDS.map((a) => <button key={a} type="button" onClick={() => setAttr(a)} className={cx('shrink-0 rounded-full px-3 py-1.5 font-display text-meta font-bold', attr === a ? 'bg-p4g-orange text-p4g-black' : 'text-white/80 hover:bg-white/10')}>{ATTR_ICON[a]} {ATTR_NAMES[a]}</button>)}
                          </div>
                          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {!persona ? <p className="col-span-full py-4 text-center text-meta text-white/60">此属性尚无可用技能（需要提升等级）</p> : persona.skills.map((s) => {
                              const isDmg = s.power > 0; const ex = expanded === s.id;
                              return (
                                <div key={s.id} className="relative min-w-0 overflow-visible">
                                  <div className="overflow-hidden rounded-sm border-2 border-white/25 bg-white/5">
                                    <button type="button" onClick={() => fire(s)} className="flex w-full min-w-0 flex-col gap-1 px-3 py-2 text-left hover:bg-p4g-yellow hover:text-p4g-black">
                                      <span className="flex min-w-0 items-center gap-2"><b className="min-w-0 truncate font-display text-body">{s.name}</b><span className="ml-auto shrink-0 rounded-[2px] bg-p4g-orange px-1.5 text-2xs font-bold text-p4g-black">{KIND[s.kind]}</span></span>
                                      <span className="flex items-center gap-3 text-cap">
                                        {isDmg ? <span><span className="opacity-60">PWR</span> <b className="p4g-num text-lead">{s.power}</b></span> : <span><span>持续</span> <b className="p4g-num">{(s as { turns?: number }).turns ?? 2}</b> <span>回合</span></span>}
                                        <span className="ml-auto p4g-num text-p4g-sp">SP {s.sp}</span>
                                      </span>
                                    </button>
                                    <button type="button" onClick={() => setExpanded(ex ? null : s.id)} className="w-full border-t border-white/10 px-3 py-1 text-left text-2xs text-white/60"><span>{ex ? '收起' : '简介'}</span></button>
                                    {ex && <p className="px-3 pb-2 text-cap text-white/80">{s.desc || '（未填写描述）'}</p>}
                                  </div>
                                  {attr === PK3_SHADOW.weakness && isDmg && <span className="absolute -right-1 -top-2 rounded-[2px] bg-p4g-red px-1 text-[9px] font-bold text-white">弱点</span>}
                                  {PK3_SHADOW.resonance.by === 'partner' && isDmg && <span className="absolute -left-1 -top-2 rounded-[2px] bg-p4g-yellow px-1 text-[9px] font-bold text-p4g-black">共鸣</span>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {phase === 'attacked' && <StateBox>你今日已出手 · 明天 18:00 后再来{allOutAvailable && <div className="mt-0.5 text-p4g-orange">（总攻击仍可使用）</div>}</StateBox>}
                      {phase === 'closed' && <StateBox>月相攻击窗口已闭合（每日 18:00 – 次日 07:00）</StateBox>}
                      {phase === 'done' && <StateBox>羁绊之影已封印</StateBox>}
                      {phase === 'nopersona' && <StateBox>你还没有创建 Persona —— 先去「逆影战场」召唤一位面具</StateBox>}
                    </>
                  )}

                  {err && <div className="rounded-sm border-2 border-p4g-red bg-p4g-red/20 px-3 py-2 text-cap font-bold text-white">{err}</div>}

                  {/* 战斗日志 */}
                  <div className="overflow-hidden rounded-sm border-3 border-white/20 bg-p4g-black/70 text-white">
                    <div className="border-b border-white/10 px-3 py-1.5 font-display text-cap font-bold tracking-[0.2em] text-p4g-yellow">战斗日志</div>
                    {log.length === 0 ? <div className="px-3 py-4 text-center text-cap text-white/60">尚无交手记录 —— 谁先出手？</div> : log.slice(0, 8).map((a) => {
                      const isMe = a.who === 'me'; const isBuff = !!a.buff;
                      return (
                        <div key={a.id} className="flex items-start gap-2 border-b border-white/5 px-3 py-2">
                          <span className="text-base">{isBuff ? (a.buff === 'attack_up' ? '🛡' : '💢') : isMe ? '🟣' : '🟡'}</span>
                          <div className="min-w-0 flex-1">
                            <div className={cx('truncate text-cap', isMe ? 'text-p4g-yellow' : 'text-p4g-orange')}>{isMe ? '你' : `@${partnerName}`} · {a.persona} · {a.skill}</div>
                            <div className="flex items-center gap-1.5 text-2xs text-white/70">
                              {isBuff ? <span className="font-bold text-p4g-sp">{a.buff === 'attack_up' ? '施加攻击强化' : '施加易伤'}</span> : (
                                <><span className="font-bold">-{a.dmg}</span>{a.weakness && <span className="text-p4g-yellow">弱点</span>}{a.resonance && <span className="text-p4g-orange">共鸣 ×1.5</span>}{a.crit && <span className="font-bold">CRIT</span>}</>
                              )}
                            </div>
                          </div>
                          <span className="shrink-0 text-2xs text-white/40">{a.ago}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </TVPowerOn>
            <AllOut isFiring={firing} personaName={persona?.name ?? 'Izanagi'} partnerName={partnerName} damage={firing ? allOutDmg : null} />
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

function StateBox({ children }: { children: ReactNode }) {
  return <div className="rounded-sm border-3 border-dashed border-white/30 px-3 py-4 text-center text-meta font-bold text-white/85">{children}</div>;
}

export default function CoopShadowBattleModal({ open, onClose, params }: OverlayProps) {
  const phase = (params?.get('phase') as Phase) || 'battle';
  return <ShadowBattle isOpen={open} onClose={onClose} partnerName="千枝" initialPhase={phase} partnerIdentified={params?.get('waiting') !== '1'} onVictory={() => { window.setTimeout(() => { window.location.hash = '#/overlay/bond-victory'; }, 400); }} />;
}
