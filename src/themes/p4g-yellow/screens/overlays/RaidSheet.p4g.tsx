/**
 * 满月团战（真实 src/components/org/RaidSheet.tsx：RaidSheet + RaidBanner）
 * 首领舞台（HP、弱点、暗影击退）· 三个晚上 · 今日的锋芒（SP、面具轮播、招式释放、预估伤害）· 总攻击 · 出手名单 · 怎么打
 * 路由：#/overlay/hideout-raid?state=open|struck|day|defeated|after|nobattle|loading|failed
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { OrgView } from '@real/types';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Sheet, P4Button, P4Chip, P4Loading, useToast } from '@yellow/kit';
import { cx } from '@yellow/lib/cx';
import { useLowMotion } from '@yellow/lib/prefs';
import { ATTR_NAMES, ATTR_COLOR } from '@yellow/mock/pkg4-tarot';
import { buildView, useOrgView } from '@yellow/adapters/pkg4-org';
import { displayCodename } from '@yellow/screens/pkg4/org/common';
import { buildRaidPanelData } from '@/themes/orgData';
import { useAppStore } from '@/store';
import { RAID_BASIC_POWER, RAID_FULL_MOON_MULT, RAID_WEAK_MULT, RAID_XP_PER_HITTER } from '@/utils/orgRaid';
import { allOutFromUi, strikeFromUi } from '@/services/orgRaidSync';
import { readOnlineSp } from '@/services/onlineResources';

export type RaidDemo = 'open' | 'struck' | 'day' | 'defeated' | 'after' | 'nobattle' | 'loading' | 'failed';
const NIGHT_NAME = ['前一晚', '满月夜', '后一晚'] as const;
const md = (k: string) => `${Number(k.slice(5, 7))}月${Number(k.slice(8, 10))}日`;
const TYPE_LABEL: Record<string, string> = { damage: '伤害', crit: '暴击', buff: '增益', debuff: '削弱', charge: '蓄力', heal: '回复', attack_boost: '增伤' };

function BossSilhouette({ hit }: { hit: boolean }) {
  return (
    <svg viewBox="0 0 200 150" className="h-full w-full" aria-hidden>
      <defs><radialGradient id="moonG" cx="50%" cy="40%" r="60%"><stop offset="0" stopColor="#fff6b0" /><stop offset="1" stopColor="#FFE500" /></radialGradient></defs>
      <circle cx="150" cy="38" r="26" fill="url(#moonG)" />
      <path d="M100 18 L112 40 L138 30 L126 56 L150 70 L124 80 L132 112 L108 98 L100 132 L92 98 L68 112 L76 80 L50 70 L74 56 L62 30 L88 40Z" fill="#111" stroke="#FF5A1F" strokeWidth="3" />
      <ellipse cx="88" cy="66" rx="7" ry="5" fill={hit ? '#fff' : '#FFE500'} /><ellipse cx="112" cy="66" rx="7" ry="5" fill={hit ? '#fff' : '#FFE500'} />
      <path d="M84 84 Q100 96 116 84" stroke="#FFE500" strokeWidth="3" fill="none" />
    </svg>
  );
}

export function RaidPanel({ view, open, onClose, demo = 'open', onFlash }: { view: OrgView; open: boolean; onClose: () => void; demo?: RaidDemo; onFlash: (s: string) => void }) {
  const low = useLowMotion();
  const persona = useAppStore((state) => state.persona);
  const panel = buildRaidPanelData(view);
  const attrs = ['knowledge', 'guts', 'dexterity', 'kindness', 'charm'] as const;
  const RAID_MASKS = attrs.map((attr) => ({
    attr,
    name: persona?.attributePersonas?.[attr]?.name ?? ATTR_NAMES[attr],
    skills: [
      { skill: '普攻', type: 'basic', power: RAID_BASIC_POWER, plus: 0, sp: 0 },
      ...(persona?.skills?.[attr] ?? []).slice(0, 4).map((skill) => ({ skill: skill.name, type: skill.type, power: skill.power, plus: 0, sp: skill.spCost })),
    ],
  }));
  const RAID = panel ? {
    boss: panel.raid.boss,
    hpMax: panel.raid.hpMax,
    left: panel.state.left,
    nights: panel.nights,
    myNights: panel.myNights,
    nightIndex: panel.current.nightIndex,
    hitters: panel.hitters,
    allOutNeed: panel.options.allOutNeed,
    sp: readOnlineSp(),
  } : null;
  const [left, setLeft] = useState(panel?.state.left ?? 0);
  const [mask, setMask] = useState(0);
  const [struck, setStruck] = useState<{ skill: string; damage: number } | null>(panel?.struckTonight ?? null);
  const [hit, setHit] = useState<null | { kind: 'strike' | 'allout'; weak: boolean; damage: number; defeated: boolean }>(null);
  const [rules, setRules] = useState(false);
  const [busy, setBusy] = useState(false);
  const [allOutUsed, setAllOutUsed] = useState(panel?.options.allOutUsed ?? false);
  useEffect(() => { if (open && panel) { setLeft(panel.state.left); setStruck(panel.struckTonight); setAllOutUsed(panel.options.allOutUsed); } }, [open, demo, panel?.state.left, panel?.struckTonight, panel?.options.allOutUsed]);
  useEffect(() => { if (!hit) return; const t = setTimeout(() => setHit(null), low ? 600 : 1400); return () => clearTimeout(t); }, [hit, low]);
  if (!panel || !RAID) return (
    <P4Sheet open={open} onClose={onClose} title="满月团战" en="FULL MOON RAID" size="tall">
      <div className="py-8 text-center text-body font-bold text-p4g-ink-soft">当前没有真实团战。等下一次满月开团后再来。</div>
    </P4Sheet>
  );
  const defeated = panel.state.defeated || left <= 0;
  const night = panel.current.night !== null;
  const battle = panel.current.phase === 'open';
  const sp = battle ? RAID.sp : 0;
  const m = RAID_MASKS[mask];
  const weak = RAID.boss.weak;
  const canStrike = panel.options.canStrike && !defeated;
  const allOutNeed = panel.options.allOutNeed;
  const canAllOut = panel.options.canAllOut && !allOutUsed && !defeated;
  const allOutPreview = panel.allOutPreview;
  const reward = panel.reward;
  const dmg = (p: number, plus: number) => { const w = m.attr === weak; return { isWeak: w, damage: Math.round((p + plus) * (w ? RAID_WEAK_MULT : 1) * RAID_FULL_MOON_MULT) }; };
  const strike = (s: typeof m.skills[number]) => {
    setBusy(true);
    void strikeFromUi(view.org.id, { attr: m.attr, power: s.power, plus: s.plus, skill: s.skill, spCost: s.sp }).then((result) => {
      setLeft((value) => Math.max(0, value - result.damage));
      setStruck({ skill: s.skill, damage: result.damage });
      setHit({ kind: 'strike', weak: result.isWeak, damage: result.damage, defeated: result.defeated });
      onFlash(`${s.skill} · ${result.damage}${result.isWeak ? '（打中弱点）' : ''}`);
    }).catch((error) => onFlash(error instanceof Error ? error.message : '出手失败，请重试')).finally(() => setBusy(false));
  };
  const allOut = () => {
    setBusy(true);
    void allOutFromUi(view.org.id).then((result) => {
      setLeft((value) => Math.max(0, value - result.damage));
      setAllOutUsed(true);
      setHit({ kind: 'allout', weak: false, damage: result.damage, defeated: result.defeated });
    }).catch((error) => onFlash(error instanceof Error ? error.message : '总攻击失败，请重试')).finally(() => setBusy(false));
  };
  const status = panel.current.phase === 'after' || defeated ? '这次团战已经结束' : night ? `${NIGHT_NAME[Math.max(0, RAID.nightIndex)] ?? '今晚'} · ${struck ? '今晚已出手' : '现在能出手'}` : '白天 · 18:00 开打';
  const byUser = new Map(view.members.map((x) => [x.userId, x]));

  return (
    <P4Sheet open={open} onClose={() => !busy && onClose()} title="满月团战" en="FULL MOON RAID" size="tall">
      {demo === 'loading' || demo === 'failed' ? (
        <div className="py-8 text-center">
          {demo === 'loading' && <P4Loading label="月亮正在升起" />}
          <p className="mt-3 text-body font-bold text-p4g-ink-soft">{demo === 'failed' ? '团战暂时拉不到（可能是网络，或者服务器还没准备好）。稍后刷新再看看。' : '月亮正在升起……刷新一下就能看到首领。'}</p>
        </div>
      ) : (
        <div className="space-y-4 pt-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 truncate font-display text-meta font-bold text-p4g-ink">{status}</span>
            <div className="ml-auto flex shrink-0 gap-1" role="list" aria-label="三个晚上">
              {RAID.nights.map((n, i) => {
                const done = RAID.myNights[i] || (i === RAID.nightIndex && !!struck); const here = night && i === RAID.nightIndex;
                return (
                  <span key={n} role="listitem" aria-label={`${NIGHT_NAME[i]} ${md(n)}${i === 1 ? '（满月，伤害 ×1.2）' : ''}${done ? '，我出过手' : ''}${here ? '，就是今晚' : ''}`}
                    className={cx('flex min-w-[44px] flex-col items-center rounded-xs border-thin px-1 py-0.5', here ? 'border-p4g-black bg-p4g-black text-p4g-yellow night:border-p4g-yellow' : 'border-p4g-line bg-p4g-surface text-p4g-ink')}>
                    <span className="font-display text-[9px] font-bold leading-tight">{i === 1 ? '☾ ' : ''}{NIGHT_NAME[i]}</span>
                    <span className="p4g-num-upright text-2xs leading-tight">{done ? '✓' : `${Number(n.slice(5, 7))}/${Number(n.slice(8, 10))}`}</span>
                  </span>
                );
              })}
            </div>
          </div>

          {/* 首领舞台 */}
          <div className="relative overflow-hidden rounded-sm border-3 border-p4g-black bg-[#0e0c08] text-white shadow-hard night:border-p4g-yellow">
            <div aria-hidden className="absolute inset-0 opacity-[0.14]" style={{ background: 'repeating-linear-gradient(0deg, rgba(255,255,255,.6) 0 1px, transparent 1px 3px)' }} />
            <div className="relative mx-auto h-[150px] max-w-[260px]">
              <motion.div className="h-full w-full" animate={hit && !low ? { x: [0, -8, 7, -4, 0] } : { x: 0 }} transition={{ duration: 0.35 }} style={{ opacity: defeated ? 0.25 : 1 }}><BossSilhouette hit={!!hit} /></motion.div>
              <AnimatePresence>
                {hit && (
                  <motion.div key="hit" className="absolute inset-0 flex flex-col items-center justify-center" initial={{ opacity: 0, scale: low ? 1 : 1.4 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                    <span className="-rotate-6 bg-p4g-yellow px-3 py-1 font-display text-h2 font-bold italic text-p4g-black shadow-[4px_4px_0_var(--p4g-orange)]">{hit.kind === 'allout' ? '总攻击！' : hit.weak ? '打中弱点！' : '出手！'}</span>
                    <span className="mt-2 p4g-num text-h1 text-white" style={{ textShadow: '3px 3px 0 #000' }}>-{hit.damage}</span>
                    <span className="mt-1 font-display text-meta font-bold text-p4g-yellow">{hit.defeated ? '最后一击！暗影击退' : `满月 ×${RAID_FULL_MOON_MULT}`}</span>
                  </motion.div>
                )}
              </AnimatePresence>
              {defeated && !hit && <div className="absolute inset-0 flex items-center justify-center"><span className="-rotate-6 border-3 border-p4g-yellow bg-p4g-black px-4 py-1.5 font-display text-h2 font-bold italic text-p4g-yellow">暗影击退</span></div>}
            </div>
            <div className="relative px-3 pb-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="min-w-0 truncate font-display text-h3 font-bold">「{RAID.boss.name}」</span>
                <span className="shrink-0 font-display text-2xs font-bold text-white/70">Lv.{RAID.boss.lv}</span>
                <span className="shrink-0 rounded-xs px-1.5 py-[2px] font-display text-2xs font-bold text-white" style={{ background: ATTR_COLOR[weak] }}>弱点 · {ATTR_NAMES[weak]}</span>
                <span className="ml-auto shrink-0 p4g-num text-body text-p4g-yellow">{defeated ? '暗影击退' : `${left} / ${RAID.hpMax}`}</span>
              </div>
              <div className="mt-1.5 h-[8px] overflow-hidden rounded-pill border border-black bg-white/15" role="progressbar" aria-label="首领还剩的血" aria-valuemin={0} aria-valuemax={RAID.hpMax} aria-valuenow={left}>
                <div className="h-full origin-left bg-p4g-red transition-transform duration-slow" style={{ transform: `scaleX(${left / RAID.hpMax})` }} />
              </div>
            </div>
          </div>

          {/* 今日的锋芒 */}
          {!defeated && demo !== 'after' && (
            <section className="space-y-2.5" aria-label="今日的锋芒">
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lead font-bold text-p4g-ink">今日的锋芒</h3>
                <span className="shrink-0 rounded-xs bg-p4g-black px-2 py-[3px] p4g-num-upright text-meta text-p4g-sp" aria-label={`现在有 ${sp} SP`}>SP {battle ? sp : '—'}</span>
              </div>
              {canStrike ? (
                <>
                  <div className="flex items-center gap-2">
                    <P4Button variant="icon" aria-label="上一张面具" onClick={() => setMask((v) => (v + RAID_MASKS.length - 1) % RAID_MASKS.length)}>‹</P4Button>
                    <div className="flex min-w-0 flex-1 items-center gap-2 rounded-sm border-3 border-p4g-black px-3 py-2 text-white" style={{ background: ATTR_COLOR[m.attr] }}>
                      <span className="min-w-0 truncate font-display text-lead font-bold" style={{ textShadow: '2px 2px 0 #000' }}>{m.name}</span>
                      <span className="shrink-0 font-display text-2xs font-bold">{ATTR_NAMES[m.attr]}</span>
                      {m.attr === weak && <span className="ml-auto shrink-0 rounded-xs bg-p4g-black px-1.5 py-[2px] font-display text-2xs font-bold text-p4g-yellow">打弱点 ×{RAID_WEAK_MULT}</span>}
                    </div>
                    <P4Button variant="icon" aria-label="下一张面具" onClick={() => setMask((v) => (v + 1) % RAID_MASKS.length)}>›</P4Button>
                  </div>
                  <div className="space-y-1.5" role="list" aria-label={`${m.name} 的招`}>
                    {(battle ? m.skills : m.skills.slice(0, 1)).map((s) => {
                      const d = dmg(s.power, s.plus); const short = s.sp > sp;
                      return (
                        <div key={s.skill} role="listitem" className="flex min-w-0 items-center gap-2 rounded-sm border-3 border-p4g-line px-2.5 py-2" style={{ background: 'var(--p4g-surface-grad)' }} aria-label={`${s.skill}：预估 ${d.damage}${s.sp ? `，${s.sp} SP` : '，不花 SP'}${short ? '，SP 不够' : ''}`}>
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-display text-body font-bold text-p4g-ink">{s.skill}</div>
                            <div className="truncate text-2xs font-bold text-p4g-ink-soft">{s.type === 'basic' ? '普攻' : TYPE_LABEL[s.type]} · 威力 {s.power}{s.plus ? ` +${s.plus}` : ''}</div>
                            <div className="truncate text-2xs font-bold text-p4g-ink">{s.power + s.plus}{d.isWeak ? ` × 弱点 ${RAID_WEAK_MULT}` : ''} × 满月 {RAID_FULL_MOON_MULT} = <span className="p4g-num text-meta text-p4g-tag night:text-p4g-yellow">{d.damage}</span>{short && <span className="ml-1 text-p4g-danger">SP 不够（现在 {sp}）</span>}</div>
                          </div>
                          <P4Button size="sm" variant="black" disabled={busy || short} onClick={() => strike(s)}>{busy ? '出手中…' : `释放${s.sp ? ` · ${s.sp} SP` : ''}`}</P4Button>
                        </div>
                      );
                    })}
                  </div>
                  {!battle && <p className="text-meta font-bold text-p4g-ink-soft">逆影战场还没开始，没有 SP：这次先用普攻。</p>}
                </>
              ) : (
                <p className="rounded-sm border-thin border-dashed border-p4g-line px-3 py-2 text-meta font-bold leading-relaxed text-p4g-ink">
                  {struck ? <>今日的锋芒已经出过了：{struck.skill} · {struck.damage}。明晚 18:00 再来。</> : '白天不能出手，18:00 开打。'}
                </p>
              )}
              <div>
                <P4Button block variant="secondary" disabled={!canAllOut} onClick={allOut}>总攻击 · {allOutPreview}</P4Button>
                <div className="mt-1 text-center text-2xs font-bold text-p4g-ink-soft">{allOutUsed ? '这次满月你已经用过了' : !struck ? '先出一次手才能发动' : allOutNeed > 0 ? `全队再出手 ${allOutNeed} 次解锁` : '已解锁：每人每次满月一次，不花 SP'}</div>
              </div>
            </section>
          )}
          {defeated && (
            <div className="rounded-sm border-3 border-p4g-black bg-p4g-yellow p-3 text-meta font-bold leading-relaxed text-p4g-black shadow-hard">
              暗影击退！出过手的人各 +{reward} SP，岁时册多一枚印记，据点每人 +{RAID_XP_PER_HITTER} 经验。
              <span className="mt-1 block text-2xs opacity-75">最后一击：{displayCodename(view.me)}（就是你）</span>
            </div>
          )}
          {demo === 'after' && !defeated && <p className="rounded-sm border-thin border-dashed border-p4g-line px-3 py-2 text-meta font-bold text-p4g-ink">这次还差 {Math.round((left / RAID.hpMax) * 100)}%。下次满月再来。</p>}

          <div>
            <div className="font-display text-2xs font-bold uppercase tracking-[0.18em] text-p4g-ink-soft">出过手的人 · {RAID.hitters.length}</div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {RAID.hitters.map((h) => { const mm = byUser.get(h.userId); const name = mm ? displayCodename(mm) : '已离开的成员'; return <P4Chip key={h.userId} size="sm" tone="outline">{name} · 出手 {h.nights} 晚{h.allout ? ' · 总攻击' : ''}</P4Chip>; })}
            </div>
          </div>
          <div>
            <button type="button" onClick={() => setRules((v) => !v)} aria-expanded={rules} className="font-display text-meta font-bold text-p4g-ink">怎么打 {rules ? '▴' : '▾'}</button>
            {rules && (
              <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-meta leading-relaxed text-p4g-ink-soft">
                <li>满月那天的前一晚、当晚、后一晚，每晚 18:00 到第二天 07:00 能出手（按据点的时区）。</li>
                <li>每人每晚出手一次：五张面具左右切，挑一招释放，按那一招的 SP 扣（普攻不花）。伤害 = 威力 + 同伴增伤；打首领的弱点 ×{RAID_WEAK_MULT}，满月当晚 ×{RAID_FULL_MOON_MULT}。</li>
                <li>全队出手满 6 次后能发动总攻击：每人每次满月一次、不花 SP，伤害随全队等级和出手次数涨（现在是 {allOutPreview}）。</li>
                <li>首领的等级就是开团时的据点等级，血量按名册和它定（每高一级 +5%），三晚里据点升级也不变；之后进来的人也能出手。只显示谁出过手，不排名次。</li>
                <li>暗影击退：出过手的人各 +{reward} SP（首领 Lv.1 是 25，每高一级 +5）、岁时册一枚印记，据点每人 +{RAID_XP_PER_HITTER} 经验；这周出过手的人拿「月下同行」。</li>
              </ol>
            )}
          </div>
        </div>
      )}
    </P4Sheet>
  );
}

/** 地图下方的团战横条 */
export function RaidBanner({ onOpen, struck, data }: { onOpen: () => void; struck?: boolean; data?: { boss: string; left: number; hpMax: number } }) {
  const boss = data?.boss ?? '满月团战';
  const left = data?.left ?? 0;
  const hpMax = data?.hpMax ?? 1;
  const head = '满月团战';
  const line = `「${boss}」还剩 ${Math.round((left / hpMax) * 100)}%${struck ? ' · 今晚已出手' : ' · 今晚还没出手'}`;
  return (
    <button type="button" onClick={onOpen} aria-label={`${head}：${line}。点了打开团战面板`} className="p4g-press flex w-full min-w-0 items-center gap-3 rounded-sm border-3 border-p4g-black bg-[#151208] px-3 py-2.5 text-left text-white shadow-[4px_4px_0_var(--p4g-orange)] night:border-p4g-yellow">
      <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-p4g-yellow font-display text-h3 text-p4g-black">☾</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-body font-bold text-p4g-yellow">{head}</span>
        <span className="block truncate text-2xs font-bold text-white/80">{line}</span>
      </span>
      <span className="shrink-0 rounded-xs bg-p4g-yellow px-2 py-1 font-display text-meta font-bold text-p4g-black">{struck ? '查看' : '出手'} ›</span>
    </button>
  );
}

export default function RaidSheet({ open, onClose, params }: OverlayProps) {
  const toast = useToast();
  const { orgs } = useOrgView();
  return <RaidPanel view={orgs[0] ?? buildView()} open={open} onClose={onClose} demo={(params?.get('state') as RaidDemo) ?? 'open'} onFlash={(s) => toast(s)} />;
}
