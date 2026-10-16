import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotion } from 'motion/react';
import { useAppStore } from '@/store';
import { useUiChannel } from '@/ui/useUiChannel';
import { TAROT_BY_ID } from '@/constants/tarot';
import { TarotCardSVG } from '@/components/astrology/TarotCardSVG';
import { INTIMACY_LABELS, MAX_INTIMACY, formatBuffDisplay } from '@/utils/confidantLevels';
import { markLevelCelebrated } from '@/utils/confidantCelebration';
import { ConfidantStarShiftModal } from '@/components/cooperation/ConfidantStarShiftModal';
import '@/styles/confidant-rankup.css';

/**
 * 羁绊升级演出（P3R，p3 频道）——计划 Wave 2。
 *
 * 触发来自 store 的 confidantRankUpQueue（bumpConfidantIntimacy 在升级时压入）。
 * 这里只负责**播**：读队首一条 → 全屏演出 → 停在确认态等用户点；点完出队。
 *
 * 编排照已验收的蓝版 demo（outputs/bond-rankup-demo/index.html）逐段移植：
 * 牌坠入 → RANK UP! 砸下 → 碎裂片/星星 → 副题 → 数字跳变 → 奖励胶囊 → 确认态 → 碎裂退场。
 *
 * 配色**全部**走 --rk-* 变量（见 src/styles/confidant-rankup.css）：
 * 蓝 = 深蓝水下，粉 = 浅底；粉主题只覆盖一组变量，这里一行都不用改。
 */
const EXP = 'cubic-bezier(.16,1,.3,1)';
const OVER = 'cubic-bezier(.34,1.56,.64,1)';

const rand = (n: number) => (Math.random() - 0.5) * n;

export function ConfidantRankUpCutIn() {
  const channel = useUiChannel();
  const queue = useAppStore(s => s.confidantRankUpQueue);
  const confidants = useAppStore(s => s.confidants);
  const settings = useAppStore(s => s.settings);
  const dismissConfidantRankUp = useAppStore(s => s.dismissConfidantRankUp);
  const setStarShiftInvite = useAppStore(s => s.setStarShiftInvite);
  const enqueueConfidantRankUp = useAppStore(s => s.enqueueConfidantRankUp);
  const reduce = useReducedMotion();

  const notice = queue[0] ?? null;
  const confidant = notice ? confidants.find(c => c.id === notice.confidantId) ?? null : null;
  const card = confidant ? TAROT_BY_ID[confidant.arcanaId] : undefined;

  // 非 p3 频道本期不出新演出：出队跳过、**不标记已庆祝**，
  // 于是用户打开档案时仍会看到老的恭喜弹窗（兜底，不会什么都看不到）。
  useEffect(() => {
    if (notice && channel !== 'p3') dismissConfidantRankUp(notice.id);
  }, [notice, channel, dismissConfidantRankUp]);

  // 同伴已被删/归档：跳过该条，不阻塞后面的
  useEffect(() => {
    if (notice && !confidant) dismissConfidantRankUp(notice.id);
  }, [notice, confidant, dismissConfidantRankUp]);

  // ── 只在开发时的预览入口 ───────────────────────────────────────────────
  // 地址后加 ?rankup=1（或 ?rankup=<同伴id>）就立刻排一段演出，不用真升一级。
  // 走的是**真实的那条队列**，所以你看到的和真升级时完全同一套路径。
  // 生产构建里 import.meta.env.DEV 恒为 false，这一段会被整段摇掉。
  const previewFiredRef = useRef(false);
  useEffect(() => {
    // 只在**每次页面加载**里放一次：confidants 每次刷新数据都会换成新数组，
    // 少了这道闸就会「数据一变又播一遍」（2026-10-16 用户报告：每次回车都触发一次）。
    if (!import.meta.env.DEV || previewFiredRef.current) return;
    const raw = new URLSearchParams(window.location.search).get('rankup');
    if (!raw) return;
    previewFiredRef.current = true;
    const target = confidants.find(c => c.id === raw) ?? confidants.find(c => !c.archivedAt);
    if (!target) return;
    const newLevel = Math.min(MAX_INTIMACY, Math.max(1, target.intimacy + 1));
    enqueueConfidantRankUp({
      confidantId: target.id,
      oldLevel: Math.max(0, newLevel - 1),
      newLevel,
      starShiftGained: 1,
      preview: true,
    });
    // 摘掉参数：免得热更 / 重渲染又推一条
    const url = new URL(window.location.href);
    url.searchParams.delete('rankup');
    window.history.replaceState(null, '', url.toString());
  }, [confidants, enqueueConfidantRankUp]);

  const [phase, setPhase] = useState<'playing' | 'confirm'>('playing');
  const flashRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const subRef = useRef<HTMLDivElement>(null);
  const lvRef = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const capRef = useRef<HTMLDivElement>(null);
  const starsRef = useRef<HTMLDivElement>(null);
  const glassRef = useRef<HTMLDivElement>(null);

  // 碎片 / 星星：每次换一条重建（数量与位置随机，但同一条内稳定）
  const noticeId = notice?.id;
  const spawn = useMemo(
    () => ({
      stars: Array.from({ length: 9 }, (_, k) => ({
        k,
        left: 32 + Math.random() * 56,
        top: 12 + Math.random() * 52,
        size: 14 + Math.random() * 18,
      })),
      glass: Array.from({ length: 48 }, () => ({
        left: 14 + Math.random() * 70,
        top: 14 + Math.random() * 56,
        w: 10 + Math.random() * 36,
        h: 8 + Math.random() * 24,
        rot: Math.random() * 180,
      })),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [noticeId],
  );

  // 气泡：一次即可
  const bubbles = useMemo(
    () =>
      Array.from({ length: 16 }, () => {
        const size = 6 + Math.random() * 16;
        return { x: Math.random() * 100, size, dur: 5 + Math.random() * 7, dx: (Math.random() - 0.5) * 8, delay: -Math.random() * 10 };
      }),
    [],
  );

  // ── 时间线（照 demo 逐段移植）──
  useEffect(() => {
    if (!notice || channel !== 'p3' || !confidant) return;
    // 播放开始即标记「这一级庆祝过了」——打开档案时就不会被补弹第二次。
    // （补弹扫描保留作兜底：万一演出没播成，档案里仍能看到祝贺。）
    // 预览（?rankup）不写「已庆祝」标记——那是真实等级的事，不能被预览污染
    if (!notice.preview) markLevelCelebrated(confidant.id, notice.newLevel);
    setPhase('playing');

    const A = (el: Element | null, kf: Keyframe[], opts: KeyframeAnimationOptions = {}) =>
      el ? el.animate(kf, { duration: 400, easing: EXP, fill: 'forwards', ...opts }) : null;

    const timers: number[] = [];
    const T = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));

    const lv = lvRef.current;
    if (lv) {
      lv.textContent = String(notice.oldLevel);
      lv.className = '';
    }

    if (reduce) {
      // 减少动态：直接呈现终态，停在确认态
      [cardRef, titleRef, subRef, pillRef, capRef].forEach(r => {
        if (r.current) r.current.style.opacity = '1';
      });
      if (lv) {
        lv.textContent = String(notice.newLevel);
        lv.className = 'hl';
      }
      setPhase('confirm');
      return;
    }

    // ① 白闪 + 牌从左上坠入
    A(flashRef.current, [{ opacity: 0.55 }, { opacity: 0 }], { duration: 450, easing: 'linear' });
    A(cardRef.current, [{ opacity: 1, translate: '-20vw -60vh', rotate: '-40deg' }, { opacity: 1, translate: '0 0', rotate: '-8deg' }], { duration: 700, easing: OVER });
    A(capRef.current, [{ opacity: 0 }, { opacity: 1 }], { delay: 350, duration: 400 });

    // ② 巨字砸下 + 碎片飞散 + 星星弹入
    T(700, () => {
      A(titleRef.current, [{ opacity: 0, translate: '16vw 0', scale: '1.7' }, { opacity: 1, translate: '0 0', scale: '1' }], { duration: 380, easing: OVER });
      Array.from(glassRef.current?.children ?? []).slice(0, 14).forEach((g, k) => {
        A(g, [{ opacity: 0, scale: '.3', translate: '0 0' }, { opacity: 0.85, scale: '1', offset: 0.25 }, { opacity: 0, translate: `${rand(6).toFixed(1)}vw 5vh` }], { delay: 60 + k * 20, duration: 1500, easing: 'ease-out' });
      });
      Array.from(starsRef.current?.children ?? []).forEach((st, k) => {
        A(st, [{ opacity: 0, scale: '0', rotate: '-90deg' }, { opacity: 1, scale: '1', rotate: '0deg' }], { delay: 120 + k * 60, duration: 420, easing: OVER });
        A(st, [{ opacity: 1 }, { opacity: 0.3 }, { opacity: 1 }], { delay: 700 + k * 60, duration: 1400, iterations: 2, easing: 'ease-in-out' });
      });
    });

    // ③ 副题滑入
    T(1300, () => A(subRef.current, [{ opacity: 0, translate: '-4vw 0' }, { opacity: 1, translate: '0 0' }], { duration: 420 }));

    // ④ 数字旧级 → 新级 弹跳 + 高亮
    T(1900, () => {
      if (!lv) return;
      lv.textContent = String(notice.newLevel);
      lv.className = 'hl';
      A(lv, [{ scale: '2' }, { scale: '1' }], { duration: 320, easing: OVER });
    });

    // ⑤ 奖励胶囊滑入
    T(2300, () => A(pillRef.current, [{ opacity: 0, translate: '10vw 0' }, { opacity: 1, translate: '0 0' }], { duration: 420 }));

    // ⑥ 牌轻微摇摆
    T(2400, () => A(cardRef.current, [{ rotate: '-8deg' }, { rotate: '-6deg' }], { duration: 600, direction: 'alternate', iterations: 2, easing: 'ease-in-out' }));

    // ⑦ 停在确认态（不自动划走）
    T(4200, () => setPhase('confirm'));

    return () => {
      timers.forEach(clearTimeout);
      [cardRef, titleRef, subRef, pillRef, capRef, starsRef, glassRef, flashRef].forEach(r => {
        r.current?.getAnimations?.().forEach(a => a.cancel());
      });
    };
  }, [notice, channel, confidant, reduce]);

  if (!notice || channel !== 'p3' || !confidant || !card) return null;

  const unlocked = confidant.buffs.filter(b => b.unlockAtLevel > notice.oldLevel && b.unlockAtLevel <= notice.newLevel);
  const unlockedText = unlocked.length
    ? unlocked.map(b => formatBuffDisplay(b, confidant.arcanaId, settings.attributeNames).title).join('、')
    : '';

  // ⚠ 必须 portal 到 body：App.tsx 的 <div className="relative z-10"> 是层叠上下文，
  // 留在树里的浮层对外只等效 z=10，会被任何 body 级 portal（同伴详情弹窗 z-150、
  // 星移弹窗 z-180）盖住——2026-10-16 实测就是「演出播了但用户只看到老弹窗」。
  return createPortal(
    <div className="rk-root" role="dialog" aria-modal="true" aria-label={`羁绊升级！${confidant.name} 亲密度 RANK ${notice.newLevel}`}>
      <div className="rk-sea">
        <i />
        <i />
        <b style={{ left: '18vw' }} />
        <b style={{ left: '46vw', width: '9vw' }} />
        {bubbles.map((b, k) => (
          <span
            key={k}
            className="rk-bub"
            style={{ left: `${b.x}%`, ['--rk-s' as string]: `${b.size}px`, ['--rk-d' as string]: `${b.dur}s`, ['--rk-dx' as string]: `${b.dx}vw`, animationDelay: `${b.delay}s` }}
          />
        ))}
      </div>

      <div className="rk-flash" ref={flashRef} />

      <div className="rk-cast">
        <div className="rk-card" ref={cardRef}>
          <TarotCardSVG card={card} orientation={confidant.orientation} staticCard showOrientationTag={false} />
        </div>

        <div className="rk-title" ref={titleRef}>RANK UP!</div>

        <div className="rk-sub" ref={subRef}>
          亲密度 RANK<b ref={lvRef as never} className={phase === 'confirm' ? 'hl' : ''}>{notice.newLevel}</b>· 《{card.name}》
        </div>

        <div className="rk-pill" ref={pillRef}>
          <span className="ic">✦</span>
          <i />
          <span className="ic r">+{notice.starShiftGained}</span>
          <span>
            {unlockedText ? `解锁 ${unlockedText}` : '羁绊加深'}
            <small>亲密度提升带来的奖励 · {INTIMACY_LABELS[notice.newLevel] ?? ''}</small>
          </span>
        </div>

        <div className="rk-cap" ref={capRef}>22 位同伴，和好友一起进步。</div>

        <div ref={starsRef} aria-hidden>
          {spawn.stars.map(s => (
            <i key={s.k} className="rk-star" style={{ left: `${s.left}vw`, top: `${s.top}vh`, fontSize: s.size }}>{s.k % 2 ? '✦' : '☆'}</i>
          ))}
        </div>
        <div ref={glassRef} aria-hidden>
          {spawn.glass.map((g, k) => (
            <i key={k} className="rk-glass" style={{ left: `${g.left}%`, top: `${g.top}%`, ['--rk-w' as string]: `${g.w}px`, ['--rk-h' as string]: `${g.h}px`, rotate: `${g.rot}deg` }} />
          ))}
        </div>

        <div className={`rk-confirm ${phase === 'confirm' ? 'on' : ''}`}>
          <span className="hint">羁绊等级提升</span>
          <button
            type="button"
            className="go"
            onClick={() => {
              dismissConfidantRankUp(notice.id);
              // 用户定案 A：点确认后接着弹星移弹窗（把「事后补弹」提前到升级当下）
              setStarShiftInvite(notice.confidantId);
            }}
          >
            确 认
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * 升级演出点「确认」后接着打开的星移弹窗（用户定案 A：把「事后补弹」提前到升级当下）。
 *
 * 挂在 App 顶层——升级可能发生在任意页面，不像原来只挂在同伴详情弹窗里。
 * 「要不要用星移」这套界面直接复用既有的 ConfidantStarShiftModal（celebrate 阶段）。
 */
export function ConfidantStarShiftInvite() {
  const invite = useAppStore(s => s.starShiftInvite);
  const confidants = useAppStore(s => s.confidants);
  const setStarShiftInvite = useAppStore(s => s.setStarShiftInvite);
  const confidant = invite ? confidants.find(c => c.id === invite) ?? null : null;

  // 同伴已被删/归档：清掉邀请，别把弹窗卡在半开状态
  useEffect(() => {
    if (invite && !confidant) setStarShiftInvite(null);
  }, [invite, confidant, setStarShiftInvite]);

  if (!invite || !confidant) return null;
  return (
    <ConfidantStarShiftModal
      isOpen
      confidant={confidant}
      initialMode="celebrate"
      onClose={() => setStarShiftInvite(null)}
    />
  );
}
