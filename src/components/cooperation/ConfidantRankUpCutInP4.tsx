/**
 * 羁绊升级演出 · 黄频道（P4 电视特别节目）版。
 *
 * 版式照用户已验收的黄色 demo（outputs/bond-rankup-demo-p4/index.html）第一页：
 * 摄影棚黄舞台 + 蓝天角 + 太阳盘 + 黑底奶油字题板 + 黑下三分之一 + 五星排
 * + 奶油旗标 + 新解锁条。卡牌本体不在这棵树里——由公共层的 P4 监视器承担，
 * 从右侧待命位一路划过屏幕、落到本页的等尺寸卡位。
 *
 * 编排照 demo `rankUp()`：命运条 → 太阳盘 → 题板 → 下三分之一 → 五星 →
 * 旗标 → 新解锁 → 停驻待确认。转场、背景推拉和监视器由 confidantP4Cinema 统一管。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotion } from 'motion/react';
import { useAppStore } from '@/store';
import { TAROT_BY_ID } from '@/constants/tarot';
import { tarotArtUrl } from '@/constants/tarotArt';
import { INTIMACY_LABELS, formatBuffDisplay } from '@/utils/confidantLevels';
import { markLevelCelebrated } from '@/utils/confidantCelebration';
import { PREVIEW_CONFIDANT } from '@/components/cooperation/confidantRankUpShared';
import {
  claimP4Cinema,
  ensureP4CinemaRoot,
  lastP4RelayOrigin,
  revealInP4,
  runP4Relay,
  scaleInP4,
  setP4MonitorArt,
  snapP4MonitorTo,
} from '@/components/cooperation/confidantP4Cinema';

const SPARK = 'M12 0C13.1 6.8 17.2 10.9 24 12C17.2 13.1 13.1 17.2 12 24C10.9 17.2 6.8 13.1 0 12C6.8 10.9 10.9 6.8 12 0Z';
const EXP = 'cubic-bezier(.16,1,.3,1)';
const OVER = 'cubic-bezier(.34,1.56,.64,1)';

const STAR_SPOTS: ReadonlyArray<readonly [number, number, number, number, string]> = [
  [4, 13, 46, -16, 'rgba(249,161,27,.9)'],
  [9, 72, 28, 12, 'rgba(255,246,208,.9)'],
  [87, 16, 34, 24, 'rgba(19,19,19,.28)'],
  [92, 68, 50, -10, 'rgba(249,161,27,.8)'],
  [79, 43, 20, 8, 'rgba(255,246,208,.8)'],
];

export function ConfidantRankUpCutInP4() {
  const queue = useAppStore(s => s.confidantRankUpQueue);
  const confidants = useAppStore(s => s.confidants);
  const settings = useAppStore(s => s.settings);
  const dismissConfidantRankUp = useAppStore(s => s.dismissConfidantRankUp);
  const setStarShiftInvite = useAppStore(s => s.setStarShiftInvite);
  const modalBlocker = useAppStore(s => s.modalBlocker);
  const reduce = useReducedMotion();

  const notice = queue[0] ?? null;
  const realConfidant = notice ? confidants.find(c => c.id === notice.confidantId) ?? null : null;
  const confidant = realConfidant ?? (notice?.preview ? PREVIEW_CONFIDANT : null);
  const card = confidant ? TAROT_BY_ID[confidant.arcanaId] : undefined;
  const artUrl = confidant ? tarotArtUrl(confidant.arcanaId, 'p4') : null;
  const root = ensureP4CinemaRoot();

  const [stageOn, setStageOn] = useState(false);
  const [phase, setPhase] = useState<'playing' | 'confirm'>('playing');

  const stageRef = useRef<HTMLDivElement>(null);
  const castRef = useRef<HTMLDivElement>(null);
  const arcanaRef = useRef<HTMLDivElement>(null);
  const sunBadgeRef = useRef<HTMLDivElement>(null);
  const showTitleRef = useRef<HTMLDivElement>(null);
  const lowerThirdRef = useRef<HTMLDivElement>(null);
  const vowRef = useRef<HTMLDivElement>(null);
  const unlockRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLDivElement>(null);
  const rankStarsRef = useRef<HTMLDivElement>(null);
  const starsRef = useRef<HTMLDivElement>(null);
  const stopTimelineRef = useRef<(() => void) | null>(null);
  const leavingRef = useRef(false);

  const finishRankUp = useCallback(() => {
    if (!notice) return;
    dismissConfidantRankUp(notice.id);
    setStarShiftInvite(notice.confidantId);
  }, [dismissConfidantRankUp, notice, setStarShiftInvite]);

  const continueToPage2 = useCallback(() => {
    if (!notice || leavingRef.current) return;
    leavingRef.current = true;
    void runP4Relay('INTIMACY UP', () => {
      dismissConfidantRankUp(notice.id);
      setStarShiftInvite(notice.confidantId);
    }, 'page2', { arc: 100, lift: 120 });
  }, [dismissConfidantRankUp, notice, setStarShiftInvite]);

  // 同伴被删/归档：跳过该条，不阻塞后面的
  useEffect(() => {
    if (notice && !confidant) dismissConfidantRankUp(notice.id);
  }, [confidant, dismissConfidantRankUp, notice]);

  // 入场：监视器从 app 待命位落到本页卡位；舞台先以 visibility:hidden 挂载，
  // 这样卡位有真实尺寸可量，apply 后再显形。
  useEffect(() => {
    if (!notice || modalBlocker || !confidant || !card || !artUrl || !root) {
      setStageOn(false);
      return;
    }
    if (!notice.preview) markLevelCelebrated(confidant.id, notice.newLevel);
    setPhase('playing');
    setStageOn(false);
    setP4MonitorArt(artUrl);
    snapP4MonitorTo('app');

    let cancelled = false;
    const release = claimP4Cinema();
    void runP4Relay('ON AIR', () => {
      if (!cancelled) setStageOn(true);
    }, 'stage', { arc: 110, lift: 150 });

    return () => {
      cancelled = true;
      release();
    };
  }, [artUrl, card, confidant, modalBlocker, notice, root]);

  // 舞台显形后开演；220ms 与 demo 的 setTimeout(rankUp,220) 一致。
  useEffect(() => {
    if (!stageOn || !notice || !confidant) return;
    revealInP4(stageRef.current, lastP4RelayOrigin());
    scaleInP4(castRef.current, 1.045, 780);
    const timer = window.setTimeout(() => {
      stopTimelineRef.current = playTimeline();
    }, 220);
    return () => {
      window.clearTimeout(timer);
      stopTimelineRef.current?.();
      stopTimelineRef.current = null;
    };
  }, [confidant, notice, stageOn]);

  const playTimeline = useCallback((): (() => void) => {
    if (!notice || !confidant) return () => {};
    const timers: number[] = [];
    const T = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
    const animate = (el: Element | null, kf: Keyframe[], opts: KeyframeAnimationOptions = {}) => {
      if (!el || typeof el.animate !== 'function' || reduce) return null;
      return el.animate(kf, { duration: 400, easing: EXP, fill: 'forwards', ...opts });
    };

    const cancelAll = () => {
      timers.forEach(window.clearTimeout);
      [arcanaRef, sunBadgeRef, showTitleRef, lowerThirdRef, vowRef, unlockRef, confirmRef].forEach(r => {
        r.current?.getAnimations().forEach(a => a.cancel());
      });
      rankStarsRef.current?.querySelectorAll('svg').forEach(s => s.getAnimations().forEach(a => a.cancel()));
      starsRef.current?.querySelectorAll('svg').forEach(s => s.getAnimations().forEach(a => a.cancel()));
    };
    cancelAll();

    if (reduce) {
      [arcanaRef, sunBadgeRef, showTitleRef, lowerThirdRef, vowRef, unlockRef].forEach(r => {
        if (r.current) r.current.style.opacity = '1';
      });
      rankStarsRef.current?.querySelectorAll('svg').forEach(s => ((s as SVGElement).style.opacity = '1'));
      starsRef.current?.querySelectorAll('svg').forEach(s => ((s as SVGElement).style.opacity = '1'));
      setPhase('confirm');
      return cancelAll;
    }

    animate(arcanaRef.current, [
      { opacity: 0, transform: 'translateY(12px) rotate(-2deg)' },
      { opacity: 1, transform: 'none' },
    ], { duration: 420, delay: 480, easing: EXP });

    animate(sunBadgeRef.current, [
      { opacity: 0, transform: 'scale(.45) rotate(-24deg)' },
      { opacity: 1, transform: 'scale(1.05) rotate(2deg)', offset: 0.72 },
      { opacity: 1, transform: 'scale(1) rotate(0)' },
    ], { duration: 720, delay: 420, easing: OVER });

    animate(showTitleRef.current, [
      { opacity: 0, transform: 'translateY(34px) scale(1.18) rotate(-6deg)', clipPath: 'inset(0 0 100% 0)' },
      { opacity: 1, transform: 'rotate(-2deg) skewX(-3deg)', clipPath: 'inset(0 0 0 0)' },
    ], { duration: 620, delay: 700, easing: 'cubic-bezier(.2,.8,.2,1)' });

    animate(lowerThirdRef.current, [
      { opacity: 0, transform: 'translateX(-32px)', clipPath: 'inset(0 100% 0 0)' },
      { opacity: 1, transform: 'none', clipPath: 'inset(0 0 0 0)' },
    ], { duration: 560, delay: 1120, easing: 'cubic-bezier(.72,0,.2,1)' });

    rankStarsRef.current?.querySelectorAll('svg').forEach((s, i) => {
      animate(s, [
        { opacity: 0, transform: 'translateY(-14px) scale(1.8) rotate(-18deg)' },
        { opacity: 1, transform: 'none' },
      ], { duration: 300, delay: 1460 + i * 80, easing: OVER });
    });

    animate(vowRef.current, [
      { opacity: 0, transform: 'translateX(-6%)', clipPath: 'inset(0 100% 0 0)' },
      { opacity: 1, transform: 'none', clipPath: 'inset(0 0 0 0)' },
    ], { duration: 560, delay: 1940, easing: EXP });

    animate(unlockRef.current, [
      { opacity: 0, transform: 'translateY(14px)' },
      { opacity: 1, transform: 'none' },
    ], { duration: 420, delay: 2380, easing: EXP });

    starsRef.current?.querySelectorAll('svg').forEach((s, i) => {
      animate(s, [
        { opacity: 0, transform: 'scale(0) rotate(-50deg)' },
        { opacity: 1, transform: 'scale(1) rotate(0)' },
      ], { duration: 420, delay: 900 + i * 70, easing: OVER });
    });

    T(2920, () => {
      setPhase('confirm');
      animate(confirmRef.current, [
        { opacity: 0, transform: 'translateY(12px)' },
        { opacity: 1, transform: 'none' },
      ], { duration: 420, easing: OVER });
    });

    return cancelAll;
  }, [confidant, notice, reduce]);

  // Esc 逃生口：任何时刻能跳过，和 p3/p5 同口径
  useEffect(() => {
    if (!notice) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finishRankUp();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finishRankUp, notice]);

  if (!notice || modalBlocker || !confidant || !card || !artUrl || !root) return null;

  const unlocked = confidant.buffs.filter(
    b => b.unlockAtLevel > notice.oldLevel && b.unlockAtLevel <= notice.newLevel,
  );
  const unlockedNames = unlocked.map(
    b => formatBuffDisplay(b, confidant.arcanaId, settings.attributeNames).title,
  );
  const unlockText = [
    unlockedNames.length ? `新解锁「${unlockedNames.join('、')}」` : '',
    notice.starShiftGained ? '星移 +1' : '',
  ].filter(Boolean).join(' · ') || '本期节目 · 收录完成';
  const levelText = String(notice.newLevel).padStart(2, '0');
  const arcanaNo = card.roman ?? String(card.number);

  return createPortal(
    <div
      ref={stageRef}
      className="stage"
      role="dialog"
      aria-modal="true"
      aria-label={`亲密度升级！${confidant.name} 达到亲密度 RANK ${notice.newLevel}`}
      style={{
        display: 'block',
        visibility: stageOn ? 'visible' : 'hidden',
        pointerEvents: stageOn ? 'auto' : 'none',
      }}
    >
      <i className="tvbar top" aria-hidden="true" />
      <i className="tvbar bottom" aria-hidden="true" />

      <div className="stage-tag"><i />ON AIR<span>本期特辑 · 亲密度升级</span></div>
      <div className="stage-ch">CH.04 · MASKARIA</div>

      <div className="cast" ref={castRef}>
        <div className="cast-left">
          <div className="cardst slot" data-p4-card-slot="stage" aria-hidden="true" />
          <div className="card-cap"><span>EP.{levelText}</span><b>本期嘉宾</b></div>
        </div>

        <div className="cast-right">
          <div className="arcana" ref={arcanaRef}>
            <span className="num">{arcanaNo}</span><span className="line" />
            <span className="name">{card.nameEn.toUpperCase()}</span><span className="cn">{card.name}</span>
          </div>

          <div className="sunbadge" ref={sunBadgeRef} aria-hidden="true">
            <svg className="badge-star" viewBox="0 0 24 24"><path d={SPARK} /></svg>
          </div>

          <div className="show-title" ref={showTitleRef}>
            <span className="show-kicker">COOPERATION · SPECIAL PROGRAM</span>
            <h1>亲密度<span>升级</span></h1>
          </div>

          <div className="lower-third" ref={lowerThirdRef}>
            <i className="lt-dot" aria-hidden="true" />
            <span className="lt-kicker">本期节目</span>
            <strong>《{card.name}》· {INTIMACY_LABELS[notice.newLevel] ?? ''}</strong>
            <span className="lt-small">亲密度到达 RANK {notice.newLevel}</span>
            <b className="rank-badge" aria-label={`等级 ${notice.newLevel}`}>{notice.newLevel}</b>
          </div>

          <div className="rankstars" ref={rankStarsRef} aria-hidden="true">
            {Array.from({ length: 5 }, (_, i) => (
              <svg key={i} viewBox="0 0 24 24" style={{ rotate: `${i % 2 ? -5 : 4}deg` }}>
                <path d={SPARK} fill="var(--cream)" transform="translate(12 12) scale(1.34) translate(-12 -12)" />
                <path d={SPARK} fill={i % 2 ? 'var(--orange)' : '#ffb628'} />
              </svg>
            ))}
          </div>

          <div className="vow" ref={vowRef}>
            <span className="bg" aria-hidden="true" />
            <p>节目还没结束 —— <b>你们的故事又多了一集</b></p>
          </div>

          <div className="unlock" ref={unlockRef}>
            <i>✦</i><span>{unlockText}</span>
          </div>

          <div className={`confirm${phase === 'confirm' ? ' on' : ''}`} ref={confirmRef}>
            <span className="hint">本期节目 · 收录完成</span>
            <button className="go" type="button" onClick={continueToPage2}><span>继续收看</span></button>
          </div>
        </div>
      </div>

      <div className="stars" ref={starsRef} aria-hidden="true">
        {STAR_SPOTS.map(([left, top, size, rot, color], i) => (
          <svg
            key={i}
            viewBox="0 0 24 24"
            style={{ left: `${left}%`, top: `${top}%`, width: size, height: size, transform: `rotate(${rot}deg)` }}
          >
            <path d={SPARK} fill={color} />
          </svg>
        ))}
      </div>
    </div>,
    root,
  );
}
