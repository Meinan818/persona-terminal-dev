/**
 * pkg3 · 黄频道升级链电影层（真实 confidantP4Cinema + ConfidantRankUpCutInP4 + ConfidantCelebrateScreenP4 +
 * ConfidantStarShiftModalP4 的 demo 版）。
 *
 * 视觉 1:1 复刻 P4G 的 Social Link Rank Up：
 *   电视噪点切台（Relay：上下黑幕收成一条白线 → 雪花 + 巨字 + 胶片条 → 白闪冲击 → 开机）
 *   → 黄底圆角方块阵 + 两条交叉斜彩带推入
 *   → 塔罗牌（牌背）从远处旋转飞来、落定 → 白闪中翻到正面
 *   → 「RANK UP!!」白字黑描边巨字砸下 → S.Link 分段条逐格点亮、Rank 数字翻上去
 *   → 黑色下三分之一（本期节目《牌名》· 称谓）→ 五星 → 誓词条 → 新解锁 → 消息框式「继续收看」。
 * 真实文案全部保留（ON AIR / 本期特辑 · 亲密度升级 / CH.04 · MASKARIA / EP.xx 本期嘉宾 / COOPERATION · SPECIAL PROGRAM …）。
 * 只动 transform / opacity；低动效 = 直接给出终态。卡在三屏之间用 framer layoutId 做「监视器」接力。
 */
import { AnimatePresence, LayoutGroup, animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Confidant, ConfidantBuff } from '@/types';
import { Portal, useScrollLock } from '@yellow/kit';
import { P4Outline } from '@yellow/kit';
import { useLowMotion } from '@yellow/lib/prefs';
import { p4gAsset } from '@yellow/lib/asset';
import { useSlot } from '@yellow/lib/slots';
import { useStaticBg } from '@yellow/fx';
import { cx } from '@yellow/lib/cx';
import { INTIMACY_LABELS, TAROT_BY_ID } from './arcana';
import { Sparkle, TarotCard, useCardBack, useArcanaArt } from './ui';

const EXP = [0.16, 1, 0.3, 1] as const;

// ═══════════════════════════════ Relay：电视切台 ═══════════════════════════════
export function Relay({ active, word = 'ON AIR', ch = '05', onCovered, onDone }: { active: boolean; word?: string; ch?: string; onCovered?: () => void; onDone?: () => void }) {
  const low = useLowMotion();
  const staticBg = useStaticBg();
  const cb = useRef({ onCovered, onDone });
  cb.current = { onCovered, onDone };
  useEffect(() => {
    if (!active) return;
    const t1 = window.setTimeout(() => cb.current.onCovered?.(), low ? 60 : 420);
    const t2 = window.setTimeout(() => cb.current.onDone?.(), low ? 160 : 1040);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [active, low]);
  return (
    <AnimatePresence>
      {active && (
        <motion.div key="relay" className="pointer-events-auto fixed inset-0 overflow-hidden" style={{ zIndex: 'var(--p4g-z-transition)' as unknown as number }}
          initial={{ opacity: low ? 0 : 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: low ? 0.1 : 0.22 } }}>
          {low ? <div className="absolute inset-0 bg-p4g-black" /> : (
            <>
              {/* 上下黑幕合拢 */}
              <motion.div className="absolute inset-x-0 top-0 h-1/2 origin-top bg-p4g-black" initial={{ scaleY: 0 }} animate={{ scaleY: [0, 1, 1] }} transition={{ duration: 0.42, times: [0, 0.75, 1], ease: EXP }} />
              <motion.div className="absolute inset-x-0 bottom-0 h-1/2 origin-bottom bg-p4g-black" initial={{ scaleY: 0 }} animate={{ scaleY: [0, 1, 1] }} transition={{ duration: 0.42, times: [0, 0.75, 1], ease: EXP }} />
              {/* 收束白线 */}
              <motion.div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 bg-white" initial={{ scaleX: 1, opacity: 0 }} animate={{ opacity: [0, 1, 1, 0], scaleX: [1, 1, 0.02, 0.02] }} transition={{ duration: 0.5, times: [0, 0.6, 0.85, 1] }} />
              {/* 雪花 + 巨字 */}
              <motion.div className="absolute inset-0 bg-p4g-black" initial={{ opacity: 0 }} animate={{ opacity: [0, 0, 1, 1, 0] }} transition={{ duration: 1.04, times: [0, 0.38, 0.42, 0.88, 1] }}>
                <div className="pk3-static opacity-60" style={staticBg} />
                <div className="absolute inset-x-0 top-[18%] h-10 bg-white/10" />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <motion.div initial={{ scale: 1.6, opacity: 0 }} animate={{ scale: [1.6, 1, 1], opacity: [0, 1, 1] }} transition={{ duration: 0.5, delay: 0.42, ease: EXP }}>
                    <P4Outline size="clamp(44px, 14vw, 120px)" stroke={8} italic fill="var(--p4g-yellow)" strokeColor="var(--p4g-black)" drop={6}>{word}</P4Outline>
                  </motion.div>
                  {/* 胶片条 */}
                  <motion.div className="flex h-7 w-[140%] gap-2 bg-white/90 px-2 py-1" initial={{ x: '-30%' }} animate={{ x: '10%' }} transition={{ duration: 0.6, delay: 0.42, ease: 'linear' }}>
                    {Array.from({ length: 30 }, (_, i) => <span key={i} className="h-full w-6 shrink-0 rounded-[2px] bg-p4g-black" />)}
                  </motion.div>
                </div>
                <div className="absolute right-5 top-5 flex items-baseline gap-1 font-display font-bold text-p4g-yellow">
                  <span className="text-h3">CH</span><b className="p4g-num text-[clamp(40px,10vw,72px)] leading-none">{ch}</b>
                </div>
              </motion.div>
              {/* 冲击白闪 */}
              <motion.div className="absolute inset-0 bg-white" initial={{ opacity: 0 }} animate={{ opacity: [0, 0, 0.95, 0] }} transition={{ duration: 1.04, times: [0, 0.82, 0.86, 1] }} />
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ═══════════════════════════════ Rank Up 舞台背景 ═══════════════════════════════
export function RankUpBackdrop({ run = true, children, className }: { run?: boolean; children?: ReactNode; className?: string }) {
  const official = useSlot('rankup-bg', '');
  return (
    <div className={cx('pk3-rank-stage absolute inset-0 overflow-hidden', className)}>
      {official ? <img src={official} alt="" className="absolute inset-0 h-full w-full object-cover" /> : (
        <>
          <div className="pk3-drift pk3-rank-stage opacity-80" />
          <div className={cx('pk3-ribbon a', run && 'run')} />
          <div className={cx('pk3-ribbon b', run && 'run')} />
        </>
      )}
      {children}
    </div>
  );
}

// ═══════════════════════════════ 监视器（跨屏的卡） ═══════════════════════════════
function Monitor({ arcanaId, orientation, width, tag = 'REC', className }: { arcanaId: string; orientation: 'upright' | 'reversed'; width: number | string; tag?: string; className?: string }) {
  return (
    <motion.div layoutId="pk3-monitor" className={cx('relative rounded-[10px] border-[4px] border-p4g-black bg-p4g-black p-[6px] shadow-[6px_6px_0_var(--p4g-orange)]', className)} transition={{ duration: 0.6, ease: EXP }}>
      <TarotCard arcanaId={arcanaId} orientation={orientation} width={width} />
      <div className="mt-1 flex items-center justify-between gap-2 px-1 font-display text-2xs font-bold text-p4g-yellow">
        <span className="truncate">MASKARIA · CH.04</span>
        <b className="flex items-center gap-1 text-p4g-red"><i className="h-2 w-2 rounded-full bg-p4g-red" />{tag}</b>
      </div>
    </motion.div>
  );
}

export interface RankUpNotice { oldLevel: number; newLevel: number; starShiftGained: boolean }

const SPOTS: [number, number, number][] = [[4, 13, 46], [9, 72, 28], [87, 16, 34], [92, 68, 50], [79, 43, 20]];

// ═══════════════════════════════ 第一屏：RANK UP 舞台 ═══════════════════════════════
export function RankUpStage({ confidant, notice, buffs, attrName, onContinue, onSkip }: { confidant: Confidant; notice: RankUpNotice; buffs: ConfidantBuff[]; attrName?: string; onContinue: () => void; onSkip: () => void }) {
  const low = useLowMotion();
  const card = TAROT_BY_ID[confidant.arcanaId];
  const back = useCardBack();
  const art = useArcanaArt(confidant.arcanaId);
  const [phase, setPhase] = useState(low ? 9 : 0);
  const [flash, setFlash] = useState(false);
  // 翻牌角度：用 motion value 驱动，正/背面按 cos 切换可见（不依赖 backface-visibility，软件渲染也稳）
  const rotY = useMotionValue(low ? 0 : 180);
  const frontOp = useTransform(rotY, (r) => (Math.cos((r * Math.PI) / 180) >= 0 ? 1 : 0));
  const backOp = useTransform(frontOp, (v) => 1 - v);
  useEffect(() => {
    if (low) { rotY.set(0); return; }
    const c = animate(rotY, [180, 900, 900, 1080], { duration: 1.5, times: [0, 0.55, 0.78, 1], ease: EXP });
    return () => c.stop();
  }, [low, rotY]);
  useEffect(() => {
    if (low) { setPhase(9); return; }
    const ts = [
      [120, 1], [1250, 2], [1500, 3], [1900, 4], [2350, 5], [2700, 6], [3050, 9],
    ].map(([ms, p]) => window.setTimeout(() => { setPhase(p); if (p === 2) { setFlash(true); window.setTimeout(() => setFlash(false), 380); } }, ms));
    return () => ts.forEach(clearTimeout);
  }, [low]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onSkip(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onSkip]);

  const unlocked = buffs.filter((b) => b.unlockAtLevel > notice.oldLevel && b.unlockAtLevel <= notice.newLevel).map((b) => b.title);
  const unlockText = [unlocked.length ? `新解锁「${unlocked.join('、')}」` : '', notice.starShiftGained ? '星移 +1' : ''].filter(Boolean).join(' · ') || '本期节目 · 收录完成';
  const levelText = String(notice.newLevel).padStart(2, '0');
  const show = (p: number) => phase >= p;
  const rev = confidant.orientation === 'reversed';

  return (
    <div role="dialog" aria-modal="true" aria-label={`亲密度升级！${confidant.name} 达到亲密度 RANK ${notice.newLevel}`} className="fixed inset-0 overflow-hidden" style={{ zIndex: 'var(--p4g-z-cutin)' as unknown as number }}>
      <RankUpBackdrop run={!low} />
      {/* 电视上下黑边 + 角标 */}
      <i aria-hidden className="absolute inset-x-0 top-0 h-[6px] bg-p4g-black" />
      <i aria-hidden className="absolute inset-x-0 bottom-0 h-[6px] bg-p4g-black" />
      <div className="absolute left-3 top-4 z-10 flex min-w-0 max-w-[70%] items-center gap-2 rounded-[2px] bg-p4g-black px-2 py-1 font-display text-cap font-bold text-white">
        <i className="h-2 w-2 shrink-0 rounded-full bg-p4g-red" /><span className="shrink-0 text-p4g-yellow">ON AIR</span><span className="truncate">本期特辑 · 亲密度升级</span>
      </div>
      <div className="absolute right-3 top-4 z-10 font-display text-cap font-bold tracking-[0.18em] text-p4g-black">CH.04 · MASKARIA</div>
      {SPOTS.map(([l, t, s], i) => (
        <motion.span key={i} aria-hidden className="absolute" style={{ left: `${l}%`, top: `${t}%` }} initial={{ scale: 0, opacity: 0 }} animate={show(1) ? { scale: 1, opacity: 1, rotate: i % 2 ? -12 : 14 } : {}} transition={{ duration: 0.42, delay: 0.5 + i * 0.07 }}>
          <Sparkle size={s} className={i % 2 ? 'text-white' : 'text-p4g-orange'} />
        </motion.span>
      ))}

      <div className="relative z-[5] mx-auto flex h-full w-full max-w-[1100px] flex-col items-center justify-center gap-4 px-5 py-14 landscape:flex-row landscape:gap-10 landscape:py-6 [@media(max-height:520px)]:pb-[76px] [@media(max-height:520px)]:pt-10">
        {/* 卡位 */}
        <div className="flex shrink-0 flex-col items-center">
          <div className="pk3-3d" style={{ width: 'clamp(104px, 34vmin, 260px)' }}>
            <motion.div
              className="relative w-full"
              style={{ aspectRatio: '1 / 1.6', transformStyle: 'preserve-3d', rotateY: rotY }}
              initial={low ? false : { scale: 0.12, y: -80, opacity: 0, rotateZ: -24 }}
              animate={low ? {} : { scale: [0.12, 1.08, 1, 1], y: [-80, 6, 0, 0], opacity: [0, 1, 1, 1], rotateZ: [-24, 4, -2.5, -2.5] }}
              transition={{ duration: 1.5, times: [0, 0.55, 0.78, 1], ease: EXP }}
            >
              <motion.div className="pk3-face absolute inset-0 overflow-hidden rounded-[6%/4%]" style={{ opacity: frontOp }}>
                <TarotCard arcanaId={confidant.arcanaId} orientation={confidant.orientation} width="100%" />
                {art && <span className="pk3-glint" aria-hidden />}
              </motion.div>
              <motion.div className="pk3-face absolute inset-0 overflow-hidden rounded-[6%/4%] border-[3px] border-p4g-black" style={{ rotateY: 180, opacity: backOp }}>
                <img src={back} alt="" className="h-full w-full object-cover" />
              </motion.div>
            </motion.div>
          </div>
          <motion.div className="mt-3 flex items-center gap-2 rounded-[2px] bg-p4g-black px-2.5 py-1 font-display text-cap font-bold" initial={{ opacity: 0, y: 8 }} animate={show(2) ? { opacity: 1, y: 0 } : {}}>
            <span className="p4g-num text-p4g-orange">EP.{levelText}</span><b className="text-white">本期嘉宾</b>
          </motion.div>
        </div>

        {/* 文字区 */}
        <div className="flex w-full min-w-0 max-w-[560px] flex-col items-center gap-2.5 text-center landscape:items-start landscape:text-left">
          <motion.div className="flex min-w-0 max-w-full items-baseline gap-2 rounded-[2px] bg-p4g-yellow-hi/90 px-2 font-display font-bold text-p4g-black" initial={{ opacity: 0, y: 12 }} animate={show(2) ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.42 }}>
            <span className="p4g-num text-h2">{card?.roman}</span><span className="h-[3px] w-6 self-center bg-p4g-black" />
            <span className="truncate text-lead uppercase tracking-[0.16em]">{card?.nameEn}</span><span className="shrink-0 text-lead">{card?.name}{rev ? ' · 逆位' : ''}</span>
          </motion.div>

          <motion.div className="relative" initial={{ opacity: 0, scale: 2.2, rotate: -8 }} animate={show(3) ? { opacity: 1, scale: 1, rotate: -3 } : {}} transition={{ duration: 0.36, ease: [0.15, 0.95, 0.1, 1] }}>
            <span className="[@media(max-height:520px)]:hidden inline-block rounded-[2px] bg-p4g-black px-2 font-display text-cap font-bold tracking-[0.2em] text-p4g-yellow">COOPERATION · SPECIAL PROGRAM</span>
            <P4Outline size="clamp(40px, min(13vw, 15vh), 104px)" stroke={9} italic fill="var(--p4g-white)" strokeColor="var(--p4g-black)" drop={5}>RANK UP!!</P4Outline>
            <h1 className="[@media(max-height:520px)]:hidden mt-1 font-display text-h2 font-bold text-p4g-black">亲密度<span className="ml-1 inline-block -skew-x-6 bg-p4g-black px-1.5 text-p4g-yellow">升级</span></h1>
          </motion.div>

          {/* Rank 分段条（S.Link 式） */}
          <motion.div className="flex w-full max-w-[420px] items-center gap-3" initial={{ opacity: 0, x: -24 }} animate={show(4) ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.36, ease: EXP }}>
            <div className="shrink-0 font-display font-bold italic leading-none text-[color:var(--p4g-rank)]" style={{ color: 'var(--p4g-orange-deep)' }}>
              <span className="text-lead">Rank</span>
              <span className="relative ml-1 inline-block h-[40px] w-[1.4em] overflow-hidden align-bottom text-[34px] leading-[40px]">
                <motion.span className="p4g-num absolute inset-0 text-center" initial={{ y: 0, opacity: 1 }} animate={show(4) ? { y: -40, opacity: 0 } : {}} transition={{ duration: 0.3, delay: 0.25 }}>{notice.oldLevel}</motion.span>
                <motion.span className="p4g-num absolute inset-0 text-center" initial={{ y: 40, opacity: 0 }} animate={show(4) ? { y: 0, opacity: 1 } : {}} transition={{ duration: 0.36, delay: 0.3, ease: EXP }}>{notice.newLevel}</motion.span>
              </span>
            </div>
            <div className="flex h-[16px] min-w-0 flex-1 items-center gap-[3px] rounded-[2px] bg-p4g-orange px-[4px]">
              {Array.from({ length: 10 }, (_, i) => {
                const on = i < notice.newLevel;
                const fresh = i >= notice.oldLevel && i < notice.newLevel;
                return <motion.span key={i} className="h-[7px] flex-1 origin-left rounded-[1px] bg-white" initial={{ scaleX: i < notice.oldLevel ? 1 : 0, opacity: on ? 1 : 0.25 }}
                  animate={show(4) ? { scaleX: on ? 1 : 1, opacity: on ? (fresh ? [1, 0.3, 1, 0.3, 1] : 1) : 0.25 } : {}} transition={{ duration: fresh ? 0.9 : 0.2, delay: fresh ? 0.35 : 0 }} />;
              })}
            </div>
          </motion.div>

          {/* 下三分之一 */}
          <motion.div className="relative flex w-full max-w-[520px] min-w-0 items-center gap-3 overflow-hidden rounded-[2px] bg-p4g-black py-2 pl-3 pr-14 text-left text-white" initial={{ opacity: 0, x: -32 }} animate={show(5) ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.4, ease: EXP }}>
            <i className="h-3 w-3 shrink-0 rounded-full bg-p4g-red" />
            <div className="min-w-0 flex-1">
              <span className="block font-display text-2xs font-bold tracking-[0.2em] text-p4g-yellow">本期节目</span>
              <strong className="block truncate font-display text-lead font-bold">《{card?.name}》· {INTIMACY_LABELS[notice.newLevel] ?? ''}</strong>
              <span className="block truncate text-cap text-white/80">亲密度到达 RANK {notice.newLevel}</span>
            </div>
            <b aria-label={`等级 ${notice.newLevel}`} className="absolute right-0 top-0 flex h-full w-12 items-center justify-center bg-p4g-yellow p4g-num text-h2 text-p4g-black">{notice.newLevel}</b>
          </motion.div>

          <div className="flex gap-1.5 [@media(max-height:520px)]:hidden" aria-hidden>
            {Array.from({ length: 5 }, (_, i) => (
              <motion.span key={i} initial={{ opacity: 0, scale: 1.8, y: -14, rotate: -18 }} animate={show(5) ? { opacity: 1, scale: 1, y: 0, rotate: i % 2 ? -5 : 4 } : {}} transition={{ duration: 0.3, delay: 0.3 + i * 0.08 }}>
                <Sparkle size={22} className={i % 2 ? 'text-p4g-orange' : 'text-white'} style={{ filter: 'drop-shadow(1px 1px 0 var(--p4g-black))' }} />
              </motion.span>
            ))}
          </div>

          <motion.p className="[@media(max-height:520px)]:hidden max-w-full rounded-[2px] border-2 border-p4g-black bg-p4g-cream px-3 py-1.5 text-body font-bold text-p4g-black" initial={{ opacity: 0, x: '-6%' }} animate={show(6) ? { opacity: 1, x: 0 } : {}}>
            节目还没结束 —— <b className="text-[color:var(--p4g-orange-deep)]">你们的故事又多了一集</b>
          </motion.p>
          <motion.div className="flex max-w-full items-center gap-2 font-display text-meta font-bold text-p4g-black" initial={{ opacity: 0, y: 14 }} animate={show(6) ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.2 }}>
            <i className="not-italic text-p4g-orange">✦</i><span className="min-w-0 break-words">{unlockText}{attrName && unlocked.length ? `（${attrName}）` : ''}</span>
          </motion.div>
        </div>
      </div>

      {/* 消息框式确认（P4G：暗棕消息框 + ▼） */}
      <AnimatePresence>
        {show(9) && (
          <motion.div key="cf" className="absolute inset-x-0 bottom-3 z-10 mx-auto flex w-[min(92vw,560px)] items-center gap-3 rounded-sm border-3 border-p4g-black bg-[color:var(--p4g-msg)] px-4 py-3 text-[color:var(--p4g-msg-ink)] shadow-plate" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <span className="min-w-0 flex-1 truncate font-display text-meta font-bold">本期节目 · 收录完成</span>
            <button type="button" onClick={onContinue} autoFocus className="p4g-press flex shrink-0 items-center gap-2 rounded-full border-3 border-p4g-black bg-p4g-orange px-4 py-2 font-display text-body font-bold text-p4g-black">
              <span>继续收看</span><span aria-hidden className="h-0 w-0 border-x-[5px] border-t-[7px] border-x-transparent border-t-p4g-black" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      {!show(9) && <button type="button" onClick={onSkip} className="absolute bottom-4 right-4 z-10 rounded-[2px] bg-p4g-black/80 px-2 py-1 font-display text-2xs font-bold text-white">SKIP · Esc</button>}

      {/* 白闪（翻牌瞬间） */}
      <AnimatePresence>{flash && <motion.div key="fl" className="pointer-events-none absolute inset-0 z-20 bg-white" initial={{ opacity: 0.95 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.38 }} />}</AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════ 第二屏：亲密度升级恭喜页 ═══════════════════════════════
export function CelebratePage({ confidant, level, buffs, charges, onLater, onShift, onAccept }: { confidant: Confidant; level: number; buffs: ConfidantBuff[]; charges: number; onLater: () => void; onShift: () => void; onAccept: () => void }) {
  const card = TAROT_BY_ID[confidant.arcanaId];
  const levelText = String(level).padStart(2, '0');
  const unlocked = buffs.filter((b) => b.unlockAtLevel === level);
  return (
    <div role="dialog" aria-modal="true" aria-label={`亲密度升级！${confidant.name} 达到亲密度 RANK ${level}`} className="fixed inset-0 overflow-y-auto" style={{ zIndex: 'var(--p4g-z-cutin)' as unknown as number }}>
      <RankUpBackdrop run={false} className="fixed" />
      <div className="relative mx-auto flex min-h-full w-full max-w-[980px] items-center px-3 py-6">
        <CollageSheet>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-[auto_minmax(0,1fr)]">
            <div className="hidden justify-center md:flex"><Monitor arcanaId={confidant.arcanaId} orientation={confidant.orientation} width={170} /></div>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2 rounded-[2px] bg-p4g-black px-3 py-1.5 font-display text-meta font-bold text-white">
                <i className="h-2.5 w-2.5 shrink-0 rounded-full bg-p4g-red" /><b className="shrink-0 text-p4g-yellow">本期节目</b><span className="min-w-0 flex-1 truncate">《{card?.name ?? '塔罗'}》· {INTIMACY_LABELS[level] ?? ''}</span><em className="shrink-0 not-italic text-p4g-orange">ON AIR</em>
              </div>
              <div className="mt-3 flex min-w-0 items-end gap-4">
                <div className="min-w-0 flex-1">
                  <P4Outline as="h2" size="clamp(32px, 9vw, 56px)" stroke={7} italic fill="var(--p4g-yellow)" strokeColor="var(--p4g-black)" drop={4}>亲密度升级</P4Outline>
                  <div className="mt-1 font-display text-body font-bold text-p4g-black">关系阶段 · {INTIMACY_LABELS[level] ?? ''}</div>
                  <div className="text-meta font-bold text-p4g-black/70">亲密度到达 RANK {level} · 本期节目通关</div>
                </div>
                <div className="shrink-0 rounded-sm border-3 border-p4g-black bg-p4g-black px-3 py-1 text-center shadow-[4px_4px_0_var(--p4g-orange)]">
                  <small className="block font-display text-2xs font-bold text-p4g-yellow">本期等级</small>
                  <b className="p4g-num block text-[clamp(40px,11vw,64px)] leading-none text-white">{levelText}</b>
                </div>
              </div>
              <div className="mt-3 flex md:hidden"><Monitor arcanaId={confidant.arcanaId} orientation={confidant.orientation} width={92} className="mx-auto" /></div>
              {unlocked.length > 0 && (
                <div className="mt-4 rounded-sm border-3 border-p4g-black bg-p4g-cream p-3 text-p4g-black">
                  <span className="font-display text-cap font-bold tracking-[0.14em]">NEW UNLOCK / 新解锁的能力</span>
                  {unlocked.map((b) => (
                    <div key={b.id} className="mt-2 flex min-w-0 items-start gap-2">
                      <span className="shrink-0 rounded-[2px] bg-p4g-orange px-1.5 font-display text-2xs font-bold leading-5">Lv.{b.unlockAtLevel}</span>
                      <div className="min-w-0"><b className="block font-display text-body">{b.title}</b><p className="text-meta text-p4g-black/75">{b.description}</p></div>
                    </div>
                  ))}
                </div>
              )}
              {charges > 0 && (
                <div className="mt-3 rounded-sm border-3 border-p4g-black bg-p4g-black p-3 text-white">
                  <span className="font-display text-cap font-bold tracking-[0.14em] text-p4g-yellow">STAR SHIFT / 获得一次星移机会（余 {charges}）</span>
                  <p className="mt-1 text-meta leading-relaxed text-white/85">星移可以以当前的相处状态，为这段关系重新撰写描述、解读与未来；若关系发生质变（上一阶段 vs 现在），很值得用一次。</p>
                </div>
              )}
              <div className="mt-4 flex flex-wrap justify-end gap-3">
                {charges > 0 ? (
                  <>
                    <button type="button" className="p4g-press rounded-full border-3 border-p4g-black bg-p4g-cream px-5 py-2.5 font-display text-body font-bold text-p4g-black shadow-hard-sm" onClick={onLater}>稍后再说</button>
                    <button type="button" className="p4g-press rounded-full border-3 border-p4g-black bg-p4g-orange px-5 py-2.5 font-display text-body font-bold text-p4g-black shadow-hard" onClick={onShift}><span>✦ 使用星移</span></button>
                  </>
                ) : (
                  <button type="button" className="p4g-press rounded-full border-3 border-p4g-black bg-p4g-orange px-6 py-2.5 font-display text-body font-bold text-p4g-black shadow-hard" onClick={onAccept}><span>欣然接受</span></button>
                )}
              </div>
            </div>
          </div>
        </CollageSheet>
      </div>
    </div>
  );
}

function CollageSheet({ children }: { children: ReactNode }) {
  const low = useLowMotion();
  return (
    <motion.div className="relative w-full min-w-0" initial={low ? { opacity: 0 } : { opacity: 0, y: 30, rotate: -1.5 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ duration: 0.42, ease: EXP }}>
      <div aria-hidden className="absolute inset-0 translate-x-[10px] translate-y-[10px] rounded-sm bg-p4g-orange" />
      <div className="relative overflow-hidden rounded-sm border-3 border-p4g-black bg-p4g-yellow p-4 sm:p-6">
        <div aria-hidden className="absolute inset-x-0 top-0 h-3 p4g-candy-h" />
        <div className="pt-2">{children}</div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════ 第三屏：星移剪辑 ═══════════════════════════════
export type ShiftStage = 'input' | 'loading' | 'preview' | 'done' | 'error';
export function StarShiftPage({ confidant, charges, initialStage = 'input', onClose, onApplied }: { confidant: Confidant; charges: number; initialStage?: ShiftStage; onClose: () => void; onApplied?: () => void }) {
  const card = TAROT_BY_ID[confidant.arcanaId];
  const [stage, setStage] = useState<ShiftStage>(initialStage);
  const [note, setNote] = useState('');
  const recentActs = ['10/19 · 一起去河堤跑步，她说下周想去参加市里的比赛', '10/12 · 下雨天她把伞塞给我，自己淋着跑回家', '10/03 · 在逆影战场里用了「Ta 的慰藉」'];
  const result = {
    orientation: confidant.orientation === 'upright' ? 'reversed' as const : 'upright' as const,
    description: '从后桌的玩伴变成了会互相交底的人。比赛前夜她第一次说「其实我也会怕」。',
    interpretation: '战车逆位：冲劲没有消失，只是她终于肯把方向盘分你一半——这是信任，不是软弱。',
    advice: '比赛那天别只喊加油，赛后陪她把紧张说完。',
    change: '她开始愿意示弱了。你们的关系从「并肩」走向「托付」。',
  };
  useEffect(() => {
    if (stage !== 'loading') return;
    const t = window.setTimeout(() => setStage('preview'), 1600);
    return () => clearTimeout(t);
  }, [stage]);
  const sub = stage === 'input' ? `《${card?.name ?? '塔罗'}》· 星移剪辑 · 余 ${charges}` : stage === 'loading' ? `《${card?.name ?? '塔罗'}》· 星象正在重写这段关系` : stage === 'preview' ? `《${card?.name ?? '塔罗'}》· 预览新的落墨` : `《${card?.name ?? '塔罗'}》· 本回放送完毕`;
  return (
    <div role="dialog" aria-modal="true" aria-label="星移剪辑" className="fixed inset-0 overflow-y-auto" style={{ zIndex: 'var(--p4g-z-cutin)' as unknown as number }}>
      <RankUpBackdrop run={false} className="fixed" />
      <div className="relative mx-auto flex min-h-full w-full max-w-[880px] items-center px-3 py-6">
        <CollageSheet>
          <button className="p4g-press absolute right-3 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-sm border-3 border-p4g-black bg-p4g-cream font-bold text-p4g-black" type="button" data-sf-close aria-label="关闭" onClick={onClose}>✕</button>
          <div className="flex min-w-0 items-center gap-3 pr-12">
            <Monitor arcanaId={confidant.arcanaId} orientation={stage === 'done' ? result.orientation : confidant.orientation} width={56} tag={stage === 'loading' ? 'TUNE' : 'REC'} />
            <div className="min-w-0">
              <P4Outline size="clamp(26px, 7vw, 40px)" stroke={6} italic fill="var(--p4g-white)" strokeColor="var(--p4g-black)">STAR SHIFT</P4Outline>
              <span className="block truncate font-display text-meta font-bold text-p4g-black">{sub}</span>
            </div>
          </div>
          <div className="mt-4 text-p4g-black">
            {stage === 'input' && (
              <>
                <label className="mb-1 block font-display text-meta font-bold" htmlFor="p4-sf-note">你觉得你们的关系发生了什么变化？（可不填）</label>
                <textarea id="p4-sf-note" value={note} onChange={(e) => setNote(e.target.value)} rows={4} maxLength={300}
                  placeholder="例如：最近几次见面 Ta 愿意和我谈更深入的事情了 / 吵了一架之后我们之间多了一份小心翼翼……"
                  className="w-full resize-none rounded-sm border-3 border-p4g-black bg-p4g-cream px-3 py-2 text-body text-p4g-black placeholder:text-p4g-black/45 focus:outline-none" />
                <div className="mt-3 rounded-sm border-2 border-dashed border-p4g-black/50 bg-white/40 p-3">
                  <span className="font-display text-cap font-bold">最近 {recentActs.length} 条与 Ta 相关的素材（会一起纳入这次剪辑）</span>
                  <ul className="mt-1 space-y-1 text-meta">{recentActs.map((a) => <li key={a} className="p4g-clamp-1">▸ {a}</li>)}</ul>
                </div>
                <div className="mt-4 flex justify-end">
                  <button type="button" onClick={() => setStage('loading')} className="p4g-press rounded-full border-3 border-p4g-black bg-p4g-orange px-5 py-2.5 font-display text-body font-bold shadow-hard"><span>✦ 重剪本期（消耗 1 次）</span></button>
                </div>
              </>
            )}
            {stage === 'loading' && (
              <div className="py-6 text-center">
                <div className="relative mx-auto mb-3 h-24 w-40 overflow-hidden rounded-[10px] border-[4px] border-p4g-black bg-p4g-black"><StaticFill /><span className="pk3-scanline absolute inset-x-0 h-6 bg-white/20" /></div>
                <p className="font-display text-lead font-bold">正在调频……</p>
                <p className="text-meta">星移会把最近的相处重新读一遍，再写下一版可能。</p>
              </div>
            )}
            {stage === 'preview' && (
              <>
                <div className="rounded-sm border-3 border-p4g-black bg-p4g-black p-3 text-white"><span className="font-display text-cap font-bold text-p4g-yellow">✦ 这次的变化</span><p className="mt-1 text-body">{result.change}</p></div>
                {([['关系描述', confidant.description, result.description], ['解读', confidant.aiInterpretation, result.interpretation], ['未来', confidant.aiAdvice, result.advice]] as const).map(([t, o, n]) => (
                  <div key={t} className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="min-w-0 rounded-sm border-2 border-p4g-black/40 bg-white/40 p-2.5"><span className="font-display text-cap font-bold">{t} · 旧</span><div className="sf-old mt-1 text-meta text-p4g-black/60 line-through decoration-p4g-black/30">{o || '（无）'}</div></div>
                    <div className="min-w-0 rounded-sm border-3 border-p4g-black bg-p4g-cream p-2.5"><span className="font-display text-cap font-bold text-[color:var(--p4g-orange-deep)]">{t} · 新</span><div className="mt-1 text-meta">{n}</div></div>
                  </div>
                ))}
                {result.orientation !== confidant.orientation && (
                  <div className="mt-3 rounded-sm border-3 border-p4g-black bg-p4g-orange p-2.5 text-meta"><span className="font-display font-bold">牌面将调整</span>：从 <b>{confidant.orientation === 'upright' ? '正位' : '逆位'}</b> 改为 <b>{result.orientation === 'upright' ? '正位' : '逆位'}</b></div>
                )}
                <div className="mt-4 flex flex-wrap justify-end gap-3">
                  <button className="p4g-press rounded-full border-3 border-p4g-black bg-p4g-cream px-5 py-2.5 font-display text-body font-bold" type="button" onClick={() => setStage('input')}>再想想</button>
                  <button className="p4g-press rounded-full border-3 border-p4g-black bg-p4g-orange px-5 py-2.5 font-display text-body font-bold shadow-hard" type="button" onClick={() => { setStage('done'); onApplied?.(); }}><span>收录本剪</span></button>
                </div>
                <div className="mt-2 text-center text-cap">· 本次为离线星移 ·</div>
              </>
            )}
            {stage === 'done' && (
              <div className="py-6 text-center">
                <Sparkle size={44} className="pk3-twinkle mx-auto text-p4g-orange" />
                <h2 className="mt-2 font-display text-h2 font-bold">本期已收录</h2>
                <p className="text-meta">新的关系描述、解读与未来已经收进档案</p>
              </div>
            )}
            {stage === 'error' && (
              <div className="py-6 text-center">
                <p className="font-display text-body font-bold text-p4g-danger">星移没能完成，请稍后再试</p>
                <button className="p4g-press mt-3 rounded-full border-3 border-p4g-black bg-p4g-cream px-5 py-2 font-display text-body font-bold" type="button" onClick={() => setStage('input')}>返回重试</button>
              </div>
            )}
          </div>
        </CollageSheet>
      </div>
    </div>
  );
}

function StaticFill() { const s = useStaticBg(); return <div className="pk3-static opacity-80" style={s} />; }

// ═══════════════════════════════ 链编排（ConfidantP4FxLayer） ═══════════════════════════════
export type ChainPage = 'stage' | 'page2' | 'page3';
export function P4CinemaChain({ open, confidant, notice, start = 'stage', charges, attrName, onClose, shiftStage }: { open: boolean; confidant: Confidant; notice: RankUpNotice; start?: ChainPage; charges: number; attrName?: string; onClose: () => void; shiftStage?: ShiftStage }) {
  const [page, setPage] = useState<ChainPage | null>(null);
  const [relay, setRelay] = useState<{ word: string; next: ChainPage | null } | null>(null);
  useScrollLock(open);
  useEffect(() => {
    if (open) { setPage(null); setRelay({ word: start === 'stage' ? 'ON AIR' : start === 'page2' ? 'INTIMACY UP' : 'STAR SHIFT', next: start }); }
    else { setPage(null); setRelay(null); }
  }, [open, start]);
  const go = useCallback((word: string, next: ChainPage | null) => setRelay({ word, next }), []);
  if (!open) return null;
  return (
    <Portal>
      <LayoutGroup id="pk3-cinema">
        {page === 'stage' && <RankUpStage confidant={confidant} notice={notice} buffs={confidant.buffs} attrName={attrName} onContinue={() => go('INTIMACY UP', 'page2')} onSkip={() => go('INTIMACY UP', 'page2')} />}
        {page === 'page2' && <CelebratePage confidant={confidant} level={notice.newLevel} buffs={confidant.buffs} charges={charges} onLater={() => go('SEE YOU', null)} onAccept={() => go('SEE YOU', null)} onShift={() => go('STAR SHIFT', 'page3')} />}
        {page === 'page3' && <StarShiftPage confidant={confidant} charges={charges} initialStage={shiftStage} onClose={() => go('SEE YOU', null)} />}
      </LayoutGroup>
      <Relay active={!!relay} word={relay?.word} ch={relay?.next === 'page3' ? '07' : relay?.next === 'page2' ? '06' : '05'}
        onCovered={() => { if (relay) { if (relay.next) setPage(relay.next); else setPage(null); } }}
        onDone={() => { const r = relay; setRelay(null); if (r && !r.next) onClose(); }} />
    </Portal>
  );
}

export const STATIC_URL = p4gAsset('tv-static.webp');
