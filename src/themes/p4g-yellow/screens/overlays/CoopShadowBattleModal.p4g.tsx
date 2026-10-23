/**
 * 羁绊之影共斗（真实 CoopShadowBattleModal）——P4G 战斗 UI 版式：电视里的雾舞台 + 影子立绘 + 黄色 HP 条 + 黑底指令面板。
 * 阶段：identify（识破进度 · BREAK THROUGH）/ battle（属性 Tab + 技能卡 + 总攻击）/ attacked（今日已出手）/ closed（窗口闭合）/ done（已封印）/ nopersona
 * #/overlay/bond-shadow-battle?phase=identify|battle|attacked|closed|done|nopersona&waiting=1
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';
import type { AttributeId } from '@real/types';
import type { OverlayProps } from '@yellow/registry/types';
import { Portal, P4Outline, useEscape, useScrollLock } from '@yellow/kit';
import { TVPowerOn, SignalGlitch } from '@yellow/fx';
import { p4gAsset } from '@yellow/lib/asset';
import { cx } from '@yellow/lib/cx';
import { ATTR_NAMES } from '@yellow/screens/pkg3/arcana';
import { PK3_SHADOW_IMG, Sparkle } from '@yellow/screens/pkg3/ui';
import { useCooperationData } from '@yellow/adapters/pkg3';
import { useCoopShadowBattle } from '@/themes/coopShadowData';
import type { CoopShadow, PersonaSkill } from '@real/types';
import { AllOut } from './AllOutOverlay.p4g';

type Phase = 'identify' | 'battle' | 'attacked' | 'closed' | 'done' | 'nopersona';
const ATTR_ICON: Record<AttributeId, string> = { knowledge: '📘', guts: '🔥', dexterity: '🎯', kindness: '🌿', charm: '✨' };
const KIND: Record<string, string> = { damage: '伤害', crit: '暴击', charge: '蓄力', buff: '强化', debuff: '弱化', heal: '治疗', attack_boost: '攻击强化' };

export function ShadowBattle({ isOpen, onClose, partnerName, shadow, onVictory }: { isOpen: boolean; onClose: () => void; partnerName: string; shadow: CoopShadow | null; onVictory?: () => void }) {
  const model = useCoopShadowBattle(shadow, isOpen, partnerName);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [firing, setFiring] = useState(false);
  const [dmgPop, setDmgPop] = useState<number | null>(null);
  useScrollLock(isOpen);
  useEscape(isOpen && !firing, onClose);
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
      setDmgPop(result.attack.damageFinal);
      window.setTimeout(() => setDmgPop(null), 900);
    }
    if (result.defeatedNow) window.setTimeout(() => onVictory?.(), 900);
  };
  const allOut = async () => {
    setFiring(true);
    const result = await model.allOut();
    window.setTimeout(() => {
      setFiring(false);
      if (result?.defeatedNow) onVictory?.();
    }, 1900);
  };
  if (!isOpen) return null;
  if (!model.shadow) {
    return (
      <Portal>
        <div className="fixed inset-0 flex items-center justify-center bg-p4g-black/70 p-5" style={{ zIndex: 'var(--p4g-z-sheet)' as unknown as number }}>
          <div role="dialog" aria-modal="true" aria-label="羁绊之影共斗" className="w-full max-w-sm rounded-sm border-3 border-p4g-yellow bg-p4g-black px-6 py-7 text-center text-white shadow-[6px_6px_0_var(--p4g-orange)]">
            <div className="font-display text-h3 font-bold text-p4g-yellow">还没有进行中的羁绊之影</div>
            <p className="mt-2 text-meta leading-relaxed text-white/75">等新月或满月之夜再回来看。羁绊之影会绑定在已建立的 COOP 关系上。</p>
            <button type="button" onClick={onClose} className="p4g-press mt-5 w-full rounded-sm border-3 border-p4g-black bg-p4g-yellow py-2.5 font-display font-bold text-p4g-black">返回</button>
          </div>
        </div>
      </Portal>
    );
  }

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
                  <div className="font-display text-2xs font-bold tracking-[0.24em] text-p4g-orange">COOP SHADOW · {model.expiresLeft}</div>
                  <div className="truncate font-display text-h3 font-bold text-white">与 @{partnerName} 共战</div>
                </div>
                <div className="shrink-0 text-right"><div className="font-display text-2xs font-bold text-white/60">SP</div><div className="p4g-num text-h3 text-p4g-sp">{model.onlineSp}</div></div>
                <button type="button" onClick={onClose} aria-label="关闭" className="p4g-press flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border-3 border-p4g-yellow bg-p4g-yellow font-bold text-p4g-black">✕</button>
              </div>
              <div aria-hidden className="h-[6px] shrink-0 p4g-candy" />

              <div className="min-h-0 flex-1 overflow-y-auto">
                {/* 影子舞台 */}
                <div className="relative flex flex-col items-center px-4 pt-3">
                  <SignalGlitch active={!model.bothIdentified} loop={!model.bothIdentified} noise={false}>
                    <img src={PK3_SHADOW_IMG} alt="" className={cx('pk3-bob h-[min(34vh,260px)] w-auto max-w-full object-contain', !model.bothIdentified && 'opacity-40 brightness-0')} />
                  </SignalGlitch>
                  <AnimatePresence>{dmgPop && <motion.div key={dmgPop} className="absolute top-1/3 p4g-num text-mega text-white" style={{ WebkitTextStroke: '3px var(--p4g-black)' }} initial={{ y: 20, opacity: 0, scale: 1.6 }} animate={{ y: -20, opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>{dmgPop}</motion.div>}</AnimatePresence>
                  {model.bothIdentified && model.line && <p className="-mt-2 rounded-[2px] bg-[color:var(--p4g-msg)] px-3 py-1 text-meta italic text-[color:var(--p4g-msg-ink)]">{model.line}</p>}
                  <div className="mt-2 w-full max-w-[520px]">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="min-w-0 truncate font-display text-lead font-bold text-white">{model.bothIdentified ? model.displayName : '？？？'}</span>
                      <span className="shrink-0 p4g-num text-meta text-p4g-yellow">HP {model.hp}/{model.hpMax}</span>
                    </div>
                    <div className="mt-1 h-4 overflow-hidden rounded-[2px] border-2 border-p4g-black bg-p4g-black"><div className="h-full origin-left bg-p4g-hp transition-transform duration-slow" style={{ transform: `scaleX(${model.hpMax ? model.hp / model.hpMax : 0})` }} /></div>
                    {model.bothIdentified && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-cap">
                        <span className="rounded-[2px] bg-p4g-orange px-2 py-0.5 font-bold text-p4g-black">{ATTR_ICON[model.weakness]} 弱点：{model.attributeNames?.[model.weakness] ?? ATTR_NAMES[model.weakness]}</span>
                        <span className="text-white/60">×1.3 伤害 · 弱点命中 COMBO +1</span>
                        <span className="ml-auto rounded-[2px] bg-p4g-black px-2 py-0.5 p4g-num text-p4g-yellow">COMBO × {model.combo}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 px-4 py-3">
                  {phase === 'identify' || !model.bothIdentified ? (
                    <div className="rounded-sm border-3 border-p4g-yellow bg-p4g-black p-4 text-white">
                      <p className="text-meta text-white/80">{model.description || '一只躲在阴影里的羁绊之影。'}</p>
                      <div className="mt-3 font-display text-cap font-bold tracking-[0.2em] text-p4g-yellow">识破进度 · BREAK THROUGH</div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {[['你', model.myIdentified], [`@${partnerName}`, model.partnerIdentified]].map(([l, d]) => (
                          <div key={String(l)} className={cx('flex min-w-0 items-center gap-2 rounded-full border-2 px-3 py-1.5 text-meta font-bold', d ? 'border-p4g-yellow bg-p4g-yellow text-p4g-black' : 'border-white/30 text-white/70')}><span>{d ? '✓' : '·'}</span><span className="truncate">{String(l)}</span></div>
                        ))}
                      </div>
                      {!model.myIdentified ? (
                        <button type="button" onClick={() => void model.identify()} disabled={model.working} className="p4g-press relative mt-3 w-full overflow-hidden rounded-sm border-3 border-p4g-black bg-p4g-red py-3 font-display text-lead font-bold tracking-[0.2em] text-white shadow-[4px_4px_0_var(--p4g-yellow)] disabled:opacity-50"><span className="relative">🌑 识破 SHADOW</span></button>
                      ) : <p className="mt-3 text-meta font-bold text-p4g-yellow">✓ 你已识破 · 等待 @{partnerName} 一起揭开真相</p>}
                      <p className="mt-2 text-2xs text-white/60">两人都识破后，这只影的真身才会现形。</p>
                    </div>
                  ) : (
                    <>
                      {/* 共鸣印记 / 共享 buff */}
                      {model.resonanceActive ? (
                        <div className="flex min-w-0 items-center gap-3 rounded-sm border-3 border-p4g-black bg-p4g-orange p-3 text-p4g-black">
                          <Sparkle size={22} className="pk3-twinkle shrink-0" />
                          <div className="min-w-0"><div className="font-bold">@{partnerName} 留下了共鸣印记</div><div className="text-cap">接力出手 · 下一击伤害 ×1.5 · {model.resonanceLeft}</div></div>
                        </div>
                      ) : <div className="flex items-center gap-2 text-meta text-white/70"><span className="text-base opacity-40">✦</span><span>印记由你留下 · 等待 @{partnerName} 接力</span></div>}
                      <div className="flex flex-wrap gap-2 text-cap font-bold">
                        <span title="双方伤害 ×1.2" className="rounded-[2px] bg-p4g-success px-2 py-0.5 text-p4g-success-ink">🛡 攻击强化 · 剩 {model.attackUp} 回合</span>
                        <span title="Boss 受到的伤害 ×1.15" className="rounded-[2px] bg-p4g-purple px-2 py-0.5 text-white">💢 易伤 · 剩 {model.vulnerability} 回合</span>
                      </div>

                      {model.allOutAvailable && (
                        <button type="button" onClick={allOut} disabled={firing} className="p4g-press relative w-full overflow-hidden rounded-sm border-3 border-p4g-black bg-p4g-red py-3 text-white shadow-[5px_5px_0_var(--p4g-yellow)] disabled:opacity-50">
                          <span className="block font-display text-cap font-bold tracking-[0.3em] text-p4g-yellow">ALL-OUT READY</span>
                          <P4Outline size={30} stroke={6} italic fill="var(--p4g-white)" strokeColor="var(--p4g-black)">ALL-OUT</P4Outline>
                          <span className="block text-2xs text-white/85">(Lv{model.myTotalLevels} + Lv{model.partnerTotalLevels}) × COMBO {Math.min(model.combo, 10)} ≈ {model.allOutDmg} · 不占当日回合</span>
                        </button>
                      )}

                      {phase === 'battle' && (
                        <div className="rounded-sm border-3 border-p4g-yellow bg-p4g-black p-3 text-white">
                          <div className="flex min-w-0 items-center gap-2 text-meta">
                            {model.persona ? <span className="min-w-0 truncate"><span className="opacity-60">装备中 ·</span> <span className="font-bold text-p4g-yellow">{model.equippedName}</span></span> : <span className="opacity-60">—</span>}
                            <span className="ml-auto shrink-0 rounded-[2px] bg-p4g-yellow px-2 py-0.5 font-bold text-p4g-black">{ATTR_ICON[model.selectedAttr]} {model.attributeNames?.[model.selectedAttr] ?? ATTR_NAMES[model.selectedAttr]}</span>
                          </div>
                          <div className="pk3-noscroll mt-2 flex gap-1 overflow-x-auto">
                            {model.attributeIds.map((a) => <button key={a} type="button" onClick={() => model.setSelectedAttr(a)} className={cx('shrink-0 rounded-full px-3 py-1.5 font-display text-meta font-bold', model.selectedAttr === a ? 'bg-p4g-orange text-p4g-black' : 'text-white/80 hover:bg-white/10')}>{ATTR_ICON[a]} {model.attributeNames?.[a] ?? ATTR_NAMES[a]}</button>)}
                          </div>
                          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {model.availableSkills.length === 0 ? <p className="col-span-full py-4 text-center text-meta text-white/60">此属性尚无可用技能（需要提升等级）</p> : model.availableSkills.map((s) => {
                              const isDmg = s.power > 0; const ex = expanded === s.name;
                              return (
                                <div key={s.name} className="relative min-w-0 overflow-visible">
                                  <div className="overflow-hidden rounded-sm border-2 border-white/25 bg-white/5">
                                    <button type="button" onClick={() => fire(s)} className="flex w-full min-w-0 flex-col gap-1 px-3 py-2 text-left hover:bg-p4g-yellow hover:text-p4g-black">
                                      <span className="flex min-w-0 items-center gap-2"><b className="min-w-0 truncate font-display text-body">{s.name}</b><span className="ml-auto shrink-0 rounded-[2px] bg-p4g-orange px-1.5 text-2xs font-bold text-p4g-black">{KIND[s.type]}</span></span>
                                      <span className="flex items-center gap-3 text-cap">
                                        {isDmg ? <span><span className="opacity-60">PWR</span> <b className="p4g-num text-lead">{s.power}</b></span> : <span><span>持续</span> <b className="p4g-num">{(s as { turns?: number }).turns ?? 2}</b> <span>回合</span></span>}
                                        <span className="ml-auto p4g-num text-p4g-sp">SP {s.spCost}</span>
                                      </span>
                                    </button>
                                    <button type="button" onClick={() => setExpanded(ex ? null : s.name)} className="w-full border-t border-white/10 px-3 py-1 text-left text-2xs text-white/60"><span>{ex ? '收起' : '简介'}</span></button>
                                    {ex && <p className="px-3 pb-2 text-cap text-white/80">{s.description || '（未填写描述）'}</p>}
                                  </div>
                                  {model.selectedAttr === model.weakness && isDmg && <span className="absolute -right-1 -top-2 rounded-[2px] bg-p4g-red px-1 text-[9px] font-bold text-white">弱点</span>}
                                  {model.resonanceActive && isDmg && <span className="absolute -left-1 -top-2 rounded-[2px] bg-p4g-yellow px-1 text-[9px] font-bold text-p4g-black">共鸣</span>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {phase === 'attacked' && <StateBox>你今日已出手 · 明天 18:00 后再来{model.allOutAvailable && <div className="mt-0.5 text-p4g-orange">（总攻击仍可使用）</div>}</StateBox>}
                      {phase === 'closed' && <StateBox>月相攻击窗口已闭合（每日 18:00 – 次日 07:00）</StateBox>}
                      {phase === 'done' && <StateBox>羁绊之影已封印</StateBox>}
                      {phase === 'nopersona' && <StateBox>你还没有创建 Persona —— 先去「逆影战场」召唤一位面具</StateBox>}
                    </>
                  )}

                  {model.error && <div className="rounded-sm border-2 border-p4g-red bg-p4g-red/20 px-3 py-2 text-cap font-bold text-white">{model.error}</div>}

                  {/* 战斗日志 */}
                  <div className="overflow-hidden rounded-sm border-3 border-white/20 bg-p4g-black/70 text-white">
                    <div className="border-b border-white/10 px-3 py-1.5 font-display text-cap font-bold tracking-[0.2em] text-p4g-yellow">战斗日志</div>
                    {model.logs.length === 0 ? <div className="px-3 py-4 text-center text-cap text-white/60">尚无交手记录 —— 谁先出手？</div> : model.logs.slice(0, 8).map((a) => {
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
            <AllOut isFiring={firing} personaName={model.equippedName} partnerName={partnerName} damage={firing ? model.allOutDmg : null} />
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
  const { activeShadows, coopBonds } = useCooperationData();
  const shadowId = params?.get('shadow');
  const shadow = (shadowId ? activeShadows.find((item) => item.id === shadowId) : null) ?? activeShadows[0] ?? null;
  const bond = shadow ? coopBonds.find((item) => item.id === shadow.bondId) : null;
  const partnerName = bond?.otherProfile?.nickname || bond?.otherProfile?.userId || (shadow ? '对方' : '');
  return <ShadowBattle isOpen={open} onClose={onClose} partnerName={partnerName} shadow={shadow} onVictory={() => { window.setTimeout(() => { window.location.hash = `#/overlay/bond-victory?shadow=${encodeURIComponent(shadow?.id ?? '')}`; }, 400); }} />;
}
