/**
 * 满月团战（真实 src/components/org/RaidSheet.tsx：RaidSheet + RaidBanner），粉白 p3 皮
 * 首领舞台（HP、弱点、暗影击退）· 三个晚上 · 今日的锋芒（SP、面具轮播、招式释放、预估伤害）· 总攻击 · 出手名单 · 怎么打
 * 路由：#/overlay/hideout-raid?state=open|struck|day|defeated|after|nobattle|loading|failed
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { OrgView } from '@real/types';
import type { OverlayProps } from '@pink/registry/types';
import { P3Sheet, P3Button, P3IconButton, P3Tag, P3Loading, P3R, slantClip, useToast } from '@pink/kit';
import { useLowMotion } from '@pink/lib/prefs';
import { ATTR_NAMES, ATTR_COLOR } from '@pink/mock/pkg4-tarot';
import { buildView, RAID, RAID_MASKS, RAID_WEAK_MULT, RAID_FULL_MOON_MULT, RAID_XP_PER_HITTER } from '@pink/mock/pkg4-org';
import { displayCodename } from '@pink/screens/pkg4/org/common';

export type RaidDemo = 'open' | 'struck' | 'day' | 'defeated' | 'after' | 'nobattle' | 'loading' | 'failed';
const NIGHT_NAME = ['前一晚', '满月夜', '后一晚'] as const;
const md = (k: string) => `${Number(k.slice(5, 7))}月${Number(k.slice(8, 10))}日`;
const TYPE_LABEL: Record<string, string> = { damage: '伤害', crit: '暴击', buff: '增益', debuff: '削弱', charge: '蓄力', heal: '回复', attack_boost: '增伤' };

function BossSilhouette({ hit }: { hit: boolean }) {
  return (
    <svg viewBox="0 0 200 150" className="h-full w-full" aria-hidden>
      <defs><radialGradient id="pk4-moonG" cx="50%" cy="40%" r="60%"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#ffc4da" /></radialGradient></defs>
      <circle cx="150" cy="38" r="26" fill="url(#pk4-moonG)" />
      <path d="M100 18 L112 40 L138 30 L126 56 L150 70 L124 80 L132 112 L108 98 L100 132 L92 98 L68 112 L76 80 L50 70 L74 56 L62 30 L88 40Z" fill="#1b0a17" stroke="#ff6fa3" strokeWidth="3" />
      <ellipse cx="88" cy="66" rx="7" ry="5" fill={hit ? '#fff' : '#ff9cc4'} /><ellipse cx="112" cy="66" rx="7" ry="5" fill={hit ? '#fff' : '#ff9cc4'} />
      <path d="M84 84 Q100 96 116 84" stroke="#ff9cc4" strokeWidth="3" fill="none" />
    </svg>
  );
}

export function RaidPanel({ view, open, onClose, demo = 'open', onFlash }: { view: OrgView; open: boolean; onClose: () => void; demo?: RaidDemo; onFlash: (s: string) => void }) {
  const low = useLowMotion();
  const [left, setLeft] = useState(RAID.left);
  const [mask, setMask] = useState(0);
  const [struck, setStruck] = useState<{ skill: string; damage: number } | null>(demo === 'struck' ? { skill: '雷光斩', damage: 24 } : null);
  const [hit, setHit] = useState<null | { kind: 'strike' | 'allout'; weak: boolean; damage: number; defeated: boolean }>(null);
  const [rules, setRules] = useState(false);
  const [busy, setBusy] = useState(false);
  const [allOutUsed, setAllOutUsed] = useState(false);
  useEffect(() => { if (open) { setLeft(demo === 'defeated' ? 0 : RAID.left); setStruck(demo === 'struck' ? { skill: '雷光斩', damage: 24 } : null); setAllOutUsed(false); } }, [open, demo]);
  useEffect(() => { if (!hit) return; const t = window.setTimeout(() => setHit(null), low ? 600 : 1400); return () => clearTimeout(t); }, [hit, low]);
  const defeated = left <= 0;
  const night = demo !== 'day' && demo !== 'after';
  const battle = demo !== 'nobattle';
  const sp = battle ? RAID.sp : 0;
  const m = RAID_MASKS[mask];
  const weak = RAID.boss.weak;
  const canStrike = night && !struck && !defeated;
  const allOutNeed = struck ? 0 : RAID.allOutNeed;
  const canAllOut = !!struck && !allOutUsed && !defeated && allOutNeed === 0;
  const allOutPreview = 64;
  const reward = 25 + 5 * ((RAID.boss.lv ?? 1) - 1);
  const dmg = (p: number, plus: number) => { const w = m.attr === weak; return { isWeak: w, damage: Math.round((p + plus) * (w ? RAID_WEAK_MULT : 1) * RAID_FULL_MOON_MULT) }; };
  const strike = (s: typeof m.skills[number]) => {
    setBusy(true);
    window.setTimeout(() => {
      const d = dmg(s.power, s.plus); const nl = Math.max(0, left - d.damage);
      setLeft(nl); setStruck({ skill: s.skill, damage: d.damage }); setHit({ kind: 'strike', weak: d.isWeak, damage: d.damage, defeated: nl <= 0 }); setBusy(false);
      onFlash(`${s.skill} · ${d.damage}${d.isWeak ? '（打中弱点）' : ''}`);
    }, 500);
  };
  const allOut = () => { const nl = Math.max(0, left - allOutPreview); setLeft(nl); setAllOutUsed(true); setHit({ kind: 'allout', weak: false, damage: allOutPreview, defeated: nl <= 0 }); };
  const status = demo === 'after' ? '这次团战已经结束' : defeated ? `${md(RAID.nights[1])} 满月` : night ? `${NIGHT_NAME[RAID.nightIndex]} · ${struck ? '今晚已出手' : '现在能出手'}` : '白天 · 18:00 开打';
  const byUser = new Map(view.members.map((x) => [x.userId, x]));
  const row = { background: 'var(--p3r-row)', clipPath: slantClip(10), boxShadow: 'inset 0 0 0 1px var(--p3r-track)' };

  return (
    <P3Sheet open={open} onClose={onClose} busy={busy} title="满月团战" en="FULL MOON RAID" size="tall">
      {demo === 'loading' || demo === 'failed' ? (
        <div className="py-6 text-center">
          {demo === 'loading' && <P3Loading text="月亮正在升起……" />}
          <p className="mt-3 text-[14px] font-bold" style={{ color: P3R.inkSoft }}>{demo === 'failed' ? '团战暂时拉不到（可能是网络，或者服务器还没准备好）。稍后刷新再看看。' : '刷新一下就能看到首领。'}</p>
        </div>
      ) : (
        <div className="space-y-4 pt-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="min-w-0 truncate text-[12.5px] font-black" style={{ color: P3R.ink }}>{status}</span>
            <div className="ml-auto flex shrink-0 gap-1" role="list" aria-label="三个晚上">
              {RAID.nights.map((n, i) => {
                const done = RAID.myNights[i] || (i === RAID.nightIndex && !!struck); const here = night && i === RAID.nightIndex;
                return (
                  <span key={n} role="listitem" aria-label={`${NIGHT_NAME[i]} ${md(n)}${i === 1 ? '（满月，伤害 ×1.2）' : ''}${done ? '，我出过手' : ''}${here ? '，就是今晚' : ''}`}
                    className="flex min-w-[46px] flex-col items-center px-1.5 py-0.5" style={{ clipPath: slantClip(5), background: here ? P3R.blue : 'var(--p3r-row)', color: here ? P3R.onBlue : P3R.ink }}>
                    <span className="text-[9px] font-black leading-tight">{i === 1 ? '☾ ' : ''}{NIGHT_NAME[i]}</span>
                    <span className="font-cond text-[11px] leading-tight">{done ? '✓' : `${Number(n.slice(5, 7))}/${Number(n.slice(8, 10))}`}</span>
                  </span>
                );
              })}
            </div>
          </div>

          <div className="relative overflow-hidden" style={{ background: 'linear-gradient(170deg, #2a0d22, #1b0a17)', color: '#ffeef5', clipPath: slantClip(16) }}>
            <div aria-hidden className="absolute -left-10 top-6 h-10 w-[140%] -rotate-[12deg]" style={{ background: 'rgba(255,111,163,0.12)' }} />
            <div className="relative mx-auto h-[150px] max-w-[260px]">
              <motion.div className="h-full w-full" animate={hit && !low ? { x: [0, -8, 7, -4, 0] } : { x: 0 }} transition={{ duration: 0.35 }} style={{ opacity: defeated ? 0.25 : 1 }}><BossSilhouette hit={!!hit} /></motion.div>
              <AnimatePresence>
                {hit && (
                  <motion.div key="hit" className="absolute inset-0 flex flex-col items-center justify-center" initial={{ opacity: 0, scale: low ? 1 : 1.4 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                    <span className="px-3 py-1 font-heavy text-[24px]" style={{ background: '#ff6fa3', color: '#2a0d22', clipPath: slantClip(8), transform: 'rotate(-6deg)' }}>{hit.kind === 'allout' ? '总攻击！' : hit.weak ? '打中弱点！' : '出手！'}</span>
                    <span className="mt-2 font-cond text-[44px] leading-none text-white">-{hit.damage}</span>
                    <span className="mt-1 text-[12px] font-black" style={{ color: '#ff9cc4' }}>{hit.defeated ? '最后一击！暗影击退' : `满月 ×${RAID_FULL_MOON_MULT}`}</span>
                  </motion.div>
                )}
              </AnimatePresence>
              {defeated && !hit && <div className="absolute inset-0 flex items-center justify-center"><span className="px-4 py-1.5 font-heavy text-[24px]" style={{ background: '#ff6fa3', color: '#2a0d22', clipPath: slantClip(8), transform: 'rotate(-6deg)' }}>暗影击退</span></div>}
            </div>
            <div className="relative px-5 pb-4">
              <div className="flex min-w-0 items-center gap-2">
                <span className="min-w-0 truncate font-heavy text-[18px]">「{RAID.boss.name}」</span>
                <span className="shrink-0 font-cond text-[12px] opacity-70">Lv.{RAID.boss.lv}</span>
                <span className="shrink-0 px-1.5 py-[2px] text-[10px] font-black" style={{ background: ATTR_COLOR[weak], color: 'var(--p3r-mulberry)', clipPath: slantClip(3) }}>弱点 · {ATTR_NAMES[weak]}</span>
                <span className="ml-auto shrink-0 font-cond text-[16px]" style={{ color: '#ff9cc4' }}>{defeated ? '暗影击退' : `${left} / ${RAID.hpMax}`}</span>
              </div>
              <div className="mt-1.5 h-[8px] overflow-hidden" style={{ background: 'rgba(255,255,255,0.15)', clipPath: slantClip(3) }} role="progressbar" aria-label="首领还剩的血" aria-valuemin={0} aria-valuemax={RAID.hpMax} aria-valuenow={left}>
                <div className="h-full origin-left" style={{ background: '#ff8d6b', transform: `scaleX(${left / RAID.hpMax})`, transition: low ? undefined : 'transform 600ms cubic-bezier(.2,.8,.2,1)' }} />
              </div>
            </div>
          </div>

          {!defeated && demo !== 'after' && (
            <section className="space-y-2.5" aria-label="今日的锋芒">
              <div className="flex items-center gap-2">
                <h3 className="font-heavy text-[17px]" style={{ color: P3R.ink }}>今日的锋芒</h3>
                <span className="shrink-0 px-2 py-[3px] font-cond text-[13px]" style={{ background: P3R.ink, color: 'var(--p3r-on-ink)', clipPath: slantClip(4) }} aria-label={`现在有 ${sp} SP`}>SP {battle ? sp : '—'}</span>
              </div>
              {canStrike ? (
                <>
                  <div className="flex items-center gap-2">
                    <P3IconButton label="上一张面具" tone="ink" onClick={() => setMask((v) => (v + RAID_MASKS.length - 1) % RAID_MASKS.length)}>‹</P3IconButton>
                    <div className="flex min-w-0 flex-1 items-center gap-2 px-4 py-2" style={{ background: ATTR_COLOR[m.attr], color: 'var(--p3r-mulberry)', clipPath: slantClip(10) }}>
                      <span className="min-w-0 truncate font-heavy text-[16px]">{m.name}</span>
                      <span className="shrink-0 text-[11px] font-black">{ATTR_NAMES[m.attr]}</span>
                      {m.attr === weak && <span className="ml-auto shrink-0 px-1.5 py-[2px] text-[10px] font-black" style={{ background: 'var(--p3r-mulberry)', color: '#fff', clipPath: slantClip(3) }}>打弱点 ×{RAID_WEAK_MULT}</span>}
                    </div>
                    <P3IconButton label="下一张面具" tone="ink" onClick={() => setMask((v) => (v + 1) % RAID_MASKS.length)}>›</P3IconButton>
                  </div>
                  <div className="space-y-1.5" role="list" aria-label={`${m.name} 的招`}>
                    {(battle ? m.skills : m.skills.slice(0, 1)).map((s) => {
                      const d = dmg(s.power, s.plus); const short = s.sp > sp;
                      return (
                        <div key={s.skill} role="listitem" className="flex min-w-0 items-center gap-2 px-4 py-2" style={row} aria-label={`${s.skill}：预估 ${d.damage}${s.sp ? `，${s.sp} SP` : '，不花 SP'}${short ? '，SP 不够' : ''}`}>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[14px] font-black" style={{ color: P3R.ink }}>{s.skill}</div>
                            <div className="truncate text-[10.5px] font-bold" style={{ color: P3R.grey }}>{s.type === 'basic' ? '普攻' : TYPE_LABEL[s.type]} · 威力 {s.power}{s.plus ? ` +${s.plus}` : ''}</div>
                            <div className="truncate text-[11px] font-bold" style={{ color: P3R.ink }}>{s.power + s.plus}{d.isWeak ? ` × 弱点 ${RAID_WEAK_MULT}` : ''} × 满月 {RAID_FULL_MOON_MULT} = <span className="font-cond text-[14px]" style={{ color: P3R.blue }}>{d.damage}</span>{short && <span className="ml-1" style={{ color: 'var(--p3r-coral-ink)' }}>SP 不够（现在 {sp}）</span>}</div>
                          </div>
                          <P3Button size="sm" disabled={short} busy={busy} busyText="出手中…" onClick={() => strike(s)}>{s.type === 'basic' ? '普攻' : `释放${s.sp ? ` · ${s.sp} SP` : ''}`}</P3Button>
                        </div>
                      );
                    })}
                  </div>
                  {!battle && <p className="text-[12px] font-bold" style={{ color: P3R.grey }}>逆影战场还没开始，没有 SP：这次先用普攻。</p>}
                </>
              ) : (
                <p className="px-4 py-2 text-[12.5px] font-bold leading-relaxed" style={{ ...row, color: P3R.ink }}>{struck ? <>今日的锋芒已经出过了：{struck.skill} · {struck.damage}。明晚 18:00 再来。</> : '白天不能出手，18:00 开打。'}</p>
              )}
              <div>
                <P3Button block tone="ink" disabled={!canAllOut} onClick={allOut}>总攻击 · {allOutPreview}</P3Button>
                <div className="mt-1 text-center text-[11px] font-bold" style={{ color: P3R.grey }}>{allOutUsed ? '这次满月你已经用过了' : !struck ? '先出一次手才能发动' : allOutNeed > 0 ? `全队再出手 ${allOutNeed} 次解锁` : '已解锁：每人每次满月一次，不花 SP'}</div>
              </div>
            </section>
          )}
          {defeated && (
            <div className="px-5 py-3 text-[12.5px] font-bold leading-relaxed" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(12) }}>
              暗影击退！出过手的人各 +{reward} SP，岁时册多一枚印记，据点每人 +{RAID_XP_PER_HITTER} 经验。
              <span className="mt-1 block text-[11px] opacity-80">最后一击：{displayCodename(view.me)}（就是你）</span>
            </div>
          )}
          {demo === 'after' && !defeated && <p className="px-4 py-2 text-[12.5px] font-bold" style={{ ...row, color: P3R.ink }}>这次还差 {Math.round((left / RAID.hpMax) * 100)}%。下次满月再来。</p>}

          <div>
            <div className="font-cond text-[11px] uppercase tracking-[0.18em]" style={{ color: P3R.grey }}>出过手的人 · {RAID.hitters.length}</div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {RAID.hitters.map((h) => { const mm = byUser.get(h.userId); return <P3Tag key={h.userId} tone="soft">{mm ? displayCodename(mm) : '已离开的成员'} · 出手 {h.nights} 晚{h.allout ? ' · 总攻击' : ''}</P3Tag>; })}
            </div>
          </div>
          <div>
            <button type="button" onClick={() => setRules((v) => !v)} aria-expanded={rules} className="text-[13px] font-black" style={{ color: P3R.ink }}>怎么打 {rules ? '▴' : '▾'}</button>
            {rules && (
              <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-[12.5px] leading-relaxed" style={{ color: P3R.inkSoft }}>
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
    </P3Sheet>
  );
}

/** 地图下方的团战横条 */
export function RaidBanner({ onOpen, struck }: { onOpen: () => void; struck?: boolean }) {
  const head = `满月团战 · ${NIGHT_NAME[RAID.nightIndex]}`;
  const line = `「${RAID.boss.name}」还剩 ${Math.round((RAID.left / RAID.hpMax) * 100)}%${struck ? ' · 今晚已出手' : ' · 今晚还没出手'}`;
  return (
    <button type="button" onClick={onOpen} aria-label={`${head}：${line}。点了打开团战面板`} className="flex w-full min-w-0 items-center gap-3 px-5 py-2.5 text-left active:scale-[0.99]" style={{ background: 'linear-gradient(110deg, #2a0d22, #3a1030)', color: '#ffeef5', clipPath: slantClip(12) }}>
      <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center text-[18px]" style={{ background: '#ff6fa3', color: '#2a0d22', clipPath: slantClip(6) }}>☾</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-black" style={{ color: '#ff9cc4' }}>{head}</span>
        <span className="block truncate text-[11px] font-bold" style={{ color: 'rgba(255,238,245,0.8)' }}>{line}</span>
      </span>
      <span className="shrink-0 px-2.5 py-1 text-[12px] font-black" style={{ background: '#ff6fa3', color: '#2a0d22', clipPath: slantClip(5) }}>{struck ? '查看' : '出手'} ›</span>
    </button>
  );
}

export default function RaidSheet({ open, onClose, params }: OverlayProps) {
  const toast = useToast();
  const st = params?.get('state') as RaidDemo;
  const demo = (['open', 'struck', 'day', 'defeated', 'after', 'nobattle', 'loading', 'failed'] as RaidDemo[]).includes(st) ? st : 'open';
  return <RaidPanel view={buildView()} open={open} onClose={onClose} demo={demo} onFlash={(s) => toast(s)} />;
}
