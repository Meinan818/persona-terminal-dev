import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotion } from 'motion/react';
import { useAppStore } from '@/store';
import { useUiChannel } from '@/ui/useUiChannel';
import { TAROT_BY_ID } from '@/constants/tarot';
import { TarotCardSVG } from '@/components/astrology/TarotCardSVG';
import { INTIMACY_LABELS, MAX_INTIMACY, formatBuffDisplay } from '@/utils/confidantLevels';
import { markLevelCelebrated } from '@/utils/confidantCelebration';
import { ConfidantStarShiftModal } from '@/components/cooperation/ConfidantStarShiftModal';
import { ConfidantCelebrateScreen } from '@/components/cooperation/ConfidantCelebrateScreen';
import { ConfidantRankUpCutInP5 } from '@/components/cooperation/ConfidantRankUpCutInP5';
import { ConfidantRankUpCutInP4 } from '@/components/cooperation/ConfidantRankUpCutInP4';
import { EXP, OVER, rand, compactFx, PREVIEW_CONFIDANT, rankUpVariantFor } from '@/components/cooperation/confidantRankUpShared';
import '@/styles/confidant-rankup.css';
import { useOverlayPresence } from '@/ui/overlayPause';

/**
 * DEV 预览直达 `?starshift=1`：**模块加载时读一次**。
 * 为什么不在组件里读 URL：预览 effect 会立刻把参数从地址栏摘掉，组件若比它晚挂载（或重挂载），
 * 再读就只剩「恭喜」了 —— 2026-10-16 用探针抓到 `?starshift=1` 永远停在恭喜页。
 */
const DEV_STARSHIFT_DIRECT = import.meta.env.DEV && typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).has('starshift');

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
/* 缓动常量、随机抖动与开发预览用的占位同伴已抽到 confidantRankUpShared.ts：
   红版（ConfidantRankUpCutInP5）要用同一套，而本文件的包装组件又要 import 红版，
   留在本文件里就会形成两版互相 import 的循环。 */

/**
 * 频道分流。红频道（p5）走红黑剪报版，黄频道（p4）走电视节目版；
 * 其余一律走下面这个蓝版实现。
 *
 * 蓝版内部原有「非 p3 就不出新演出」的判定（出队跳过 + 时间线 return + 渲染 return null）**原样保留**：
 * p5 时根本不会渲染到它，而 p4 / neutral 仍然走它，于是「本期不出新演出」的既有行为一字未改。
 */
export function ConfidantRankUpCutIn() {
  const channel = useUiChannel();
  const variant = rankUpVariantFor(channel);
  const notice = useAppStore(s => s.confidantRankUpQueue[0]);
  const modalBlocker = useAppStore(s => s.modalBlocker);
  useOverlayPresence(!!notice && !modalBlocker && channel !== 'neutral');
  // ⚠ 预览入队（?rankup）必须挂在**这一层**，不能留在 P3 组件里：
  //   wrapper 在 p5 频道下直接返回 P5 版、根本不渲染 P3 —— 若入队逻辑留在 P3，
  //   红频道下 ?rankup 会「点开什么都没发生」（2026-10-16 实测发现，
  //   表现为探针等 .rk5-root 永远等不到）。入队属于「队列」职责，与皮肤无关。
  useRankUpPreviewEnqueue();
  if (variant === 'p5') return <ConfidantRankUpCutInP5 />;
  if (variant === 'p4') return <ConfidantRankUpCutInP4 />;
  return <RankUpCutInP3 />;
}

/** 开发预览：地址后加 ?rankup=1（或 ?rankup=<同伴id>）立刻排一段演出，与皮肤无关。 */
function useRankUpPreviewEnqueue() {
  const confidants = useAppStore(s => s.confidants);
  const enqueueConfidantRankUp = useAppStore(s => s.enqueueConfidantRankUp);
  const previewFiredRef = useRef(false);
  useEffect(() => {
    // 只在**每次页面加载**里放一次：confidants 每次刷新数据都会换成新数组，
    // 少了这道闸就会「数据一变又播一遍」（2026-10-16 用户报告：每次回车都触发一次）。
    if (!import.meta.env.DEV || previewFiredRef.current) return;
    const raw = new URLSearchParams(window.location.search).get('rankup');
    if (!raw) return;
    previewFiredRef.current = true;
    const target = confidants.find(c => c.id === raw) ?? confidants.find(c => !c.archivedAt);
    // 一个同伴都没有也放：用占位同伴，方便在全新档案 / 无头浏览器上核对演出本身
    // 预览的“升级”以**当前等级**为终点：这样随后挂载的恭喜页
    // （读 store 里的 confidant.intimacy）与演出页的 RANK 对齐；
    // 占位同伴因此从 4 → 5，而不是 5 → 6（后者会让恭喜页仍显示 5）。
    const previewNewLevel = target ? Math.max(1, target.intimacy) : PREVIEW_CONFIDANT.intimacy;
    const newLevel = Math.min(MAX_INTIMACY, previewNewLevel);
    enqueueConfidantRankUp({
      confidantId: target?.id ?? PREVIEW_CONFIDANT.id,
      oldLevel: Math.max(0, newLevel - 1),
      newLevel,
      starShiftGained: 1,
      preview: true,
    });
    // 摘掉参数：免得热更 / 重渲染又推一条
    const u = new URL(window.location.href);
    u.searchParams.delete('rankup');
    window.history.replaceState(null, '', u.toString());
  }, [confidants, enqueueConfidantRankUp]);
}

function RankUpCutInP3() {
  const channel = useUiChannel();
  const queue = useAppStore(s => s.confidantRankUpQueue);
  const confidants = useAppStore(s => s.confidants);
  const settings = useAppStore(s => s.settings);
  const dismissConfidantRankUp = useAppStore(s => s.dismissConfidantRankUp);
  const setStarShiftInvite = useAppStore(s => s.setStarShiftInvite);
  const reduce = useReducedMotion();
  // 有别的弹窗时自己让位排队（原来这层判断在 App 里，现在改常驻挂载、挪进来）
  const modalBlocker = useAppStore(s => s.modalBlocker);

  const notice = queue[0] ?? null;
  const realConfidant = notice
    ? confidants.find(c => c.id === notice.confidantId && !c.archivedAt) ?? null
    : null;
  // 预览可以在没有真实同伴时用占位同伴（见 PREVIEW_CONFIDANT）
  const confidant = realConfidant ?? (notice?.preview ? PREVIEW_CONFIDANT : null);
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
  // 预览入队（?rankup）已上提到 wrapper 层的 useRankUpPreviewEnqueue ——
  // 它必须与皮肤无关，否则红频道下 P3 不渲染、预览永久失效（见那处注释）。

  /** 收场：出队 + 接星移弹窗（用户定案 A：确认后接着弹星移） */
  const finishRankUp = useCallback(() => {
    if (!notice) return;
    dismissConfidantRankUp(notice.id);
    setStarShiftInvite(notice.confidantId);
  }, [notice, dismissConfidantRankUp, setStarShiftInvite]);

  // Esc 逃生口：项目里其它庆祝弹窗都保证「任何时刻能跳过」，演出也不例外——
  // 没有这条，一旦确认键出了问题用户就被卡在满屏演出里出不来（2026-10-16 踩过）。
  useEffect(() => {
    if (!notice) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finishRankUp();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [notice, finishRankUp]);

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
  // 手机端减少同屏装饰件：碎片/气泡/星星不是信息本体，但每个都要建 DOM 和动画；
  // 8x CPU 降速实测首帧会因此出现约 400ms 的长任务，动画随后成批弹出。
  const compact = compactFx();
  const spawn = useMemo(
    () => ({
      stars: Array.from({ length: compact ? 6 : 9 }, (_, k) => ({
        k,
        left: 32 + Math.random() * 56,
        top: 12 + Math.random() * 52,
        size: 14 + Math.random() * 18,
      })),
      glass: Array.from({ length: compact ? 24 : 48 }, () => ({
        left: 14 + Math.random() * 70,
        top: 14 + Math.random() * 56,
        w: 10 + Math.random() * 36,
        h: 8 + Math.random() * 24,
        rot: Math.random() * 180,
      })),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [noticeId, compact],
  );

  // 气泡：一次即可
  const bubbles = useMemo(
    () =>
      Array.from({ length: compact ? 8 : 16 }, () => {
        const size = 6 + Math.random() * 16;
        return { x: Math.random() * 100, size, dur: 5 + Math.random() * 7, dx: (Math.random() - 0.5) * 8, delay: -Math.random() * 10 };
      }),
    [compact],
  );

  // ── 时间线（照 demo 逐段移植）──
  useEffect(() => {
    // ⚠ 必须等 modalBlocker 清掉再开演：升级常发生在「今日互动」弹窗里，
    //   档案/互动窗还没收场时演出层被 return null 挡住；若时间线照跑，
    //   用户真正看到时已经走到淡出尾段（录屏：只剩淡淡一层，随后直接确认）。
    //   P5/P4 的时间线都有这道闸门，P3 此前漏了。
    if (!notice || modalBlocker || channel !== 'p3' || !confidant) return;
    let cancelled = false;
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
    const cardIn = A(cardRef.current, [{ opacity: 1, translate: '-20vw -60vh', rotate: '-40deg' }, { opacity: 1, translate: '0 0', rotate: '-8deg' }], { duration: 700, easing: OVER });
    const capIn = A(capRef.current, [{ opacity: 0 }, { opacity: 1 }], { delay: 350, duration: 400 });

    // ② 巨字砸下 + 碎片飞散 + 星星弹入
    // 主标题的入场在挂载时就带上 delay 交给动画时间线；不用 setTimeout 点火。
    // 手机主线程被长任务占住时，setTimeout 会积压到解除阻塞后一起触发，画面就成了
    // 「先卡住、再一下跳出一堆东西」。WAAPI 的 delay 由浏览器时间线推进，不会成批补放。
    const titleIn = A(titleRef.current, [{ opacity: 0, translate: '16vw 0', scale: '1.7' }, { opacity: 1, translate: '0 0', scale: '1' }], { delay: 700, duration: 380, easing: OVER });
    // 碎片/星星是装饰件：放在 700ms 一次点火即可。主标题/副题/胶囊已经交给动画时间线，
    // 即使这一批晚到，也不会再把信息本体一起补放。
    T(700, () => {
      Array.from(glassRef.current?.children ?? []).slice(0, 14).forEach((g, k) => {
        A(g, [{ opacity: 0, scale: '.3', translate: '0 0' }, { opacity: 0.85, scale: '1', offset: 0.25 }, { opacity: 0, translate: `${rand(6).toFixed(1)}vw 5vh` }], { delay: 60 + k * 20, duration: 1500, easing: 'ease-out' });
      });
      Array.from(starsRef.current?.children ?? []).forEach((st, k) => {
        A(st, [{ opacity: 0, scale: '0', rotate: '-90deg' }, { opacity: 1, scale: '1', rotate: '0deg' }], { delay: 120 + k * 60, duration: 420, easing: OVER });
        A(st, [{ opacity: 1 }, { opacity: 0.3 }, { opacity: 1 }], { delay: 700 + k * 60, duration: 1400, iterations: 2, easing: 'ease-in-out' });
      });
    });

    // ③ 副题滑入
    const subIn = A(subRef.current, [{ opacity: 0, translate: '-4vw 0' }, { opacity: 1, translate: '0 0' }], { delay: 1300, duration: 420 });

    // ④ 数字旧级 → 新级 弹跳 + 高亮
    T(1900, () => {
      if (!lv) return;
      lv.textContent = String(notice.newLevel);
      lv.className = 'hl';
      A(lv, [{ scale: '2' }, { scale: '1' }], { duration: 320, easing: OVER });
    });

    // ⑤ 奖励胶囊滑入
    const pillIn = A(pillRef.current, [{ opacity: 0, translate: '10vw 0' }, { opacity: 1, translate: '0 0' }], { delay: 2300, duration: 420 });

    // ⑥ 牌轻微摇摆
    const sway = A(cardRef.current, [{ rotate: '-8deg' }, { rotate: '-6deg' }], { delay: 2400, duration: 600, direction: 'alternate', iterations: 2, easing: 'ease-in-out' });

    // ⑦ 整体碎裂退场：牌一沉、各元素与星星淡出、碎片炸散。
    // ⚠ 这一段是 demo 编排里的 ⑦，我第一版整段漏抄了 → 演出元素不消失、
    // 确认键直接叠在它们上面（2026-10-16 用户：「按钮和这个在一个界面上了」）。
    const runExit = () => {
      if (cancelled) return;
      const exits: Animation[] = [];
      const push = (a: Animation | null) => { if (a) exits.push(a); };
      push(A(cardRef.current, [{ rotate: '-8deg', scale: '1' }, { rotate: '-3deg', scale: '1.06' }], { duration: 140 }));
      [cardRef, titleRef, subRef, pillRef, capRef].forEach(r =>
        push(A(r.current, [{ opacity: 1 }, { opacity: 0 }], { delay: 140, duration: 260, easing: 'linear' })),
      );
      Array.from(starsRef.current?.children ?? []).forEach(el =>
        push(A(el, [{ opacity: 1 }, { opacity: 0 }], { delay: 140, duration: 260, easing: 'linear' })),
      );
      Array.from(glassRef.current?.children ?? []).forEach(g => {
        const dx = `${(Math.random() * 30 - 15).toFixed(1)}vw`;
        const dy = `${(Math.random() * 26 - 6).toFixed(1)}vh`;
        const rot = `${(Math.random() * 360 - 180).toFixed(0)}deg`;
        push(A(g, [
          { opacity: 0, scale: '1', translate: '0 0', rotate: '0deg' },
          { opacity: 0.9, offset: 0.12 },
          { opacity: 0.75, offset: 0.6 },
          { opacity: 0, scale: '.7', translate: `${dx} ${dy}`, rotate: rot },
        ], { delay: 140 + Math.random() * 120, duration: (compact ? 1200 : 1700) + Math.random() * (compact ? 400 : 600), easing: 'cubic-bezier(.2,.7,.3,1)' }));
      });
      // ⑧ 等退场动画真的结束再露确认键；用固定 4200ms 会在碎片还在飞时就切页。
      Promise.allSettled(exits.map(a => a.finished)).then(() => {
        if (!cancelled) setPhase('confirm');
      });
    };

    // 退场不再用固定 3.6s：浏览器卡顿时，主内容动画会晚开始；固定计时器会在
    // 它们还没真正显示时就开始淡出（录屏里只剩淡淡一层，随后直接确认）。
    // 等主内容动画全部结束，再停 500ms 让画面落住，才进入碎屏退场。
    const mainEntries = [cardIn, capIn, titleIn, subIn, pillIn, sway]
      .filter((a): a is Animation => !!a);
    if (mainEntries.length > 0) {
      Promise.allSettled(mainEntries.map(a => a.finished)).then(() => {
        if (!cancelled) T(500, runExit);
      });
    } else {
      T(3600, runExit);
    }

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      [cardRef, titleRef, subRef, pillRef, capRef, starsRef, glassRef, flashRef].forEach(r => {
        r.current?.getAnimations?.().forEach(a => a.cancel());
      });
    };
  }, [notice, modalBlocker, channel, confidant, reduce]);

  if (!notice || modalBlocker || channel !== 'p3' || !confidant || !card) return null;

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
            onClick={finishRankUp}
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
 * 升级演出点「确认」后接的两段（用户定案 A：把「事后补弹」提前到升级当下）。
 *
 * 挂在 App 顶层——升级可能发生在任意页面，不像原来只挂在同伴详情弹窗里。
 *   第一段：整页「升级恭喜」（ConfidantCelebrateScreen，2026-10-16 接回 App）
 *   第二段：点「使用星移」才切到星移弹窗（ConfidantStarShiftModal，只管落墨流程）
 */
export function ConfidantStarShiftInvite() {
  const invite = useAppStore(s => s.starShiftInvite);
  const confidants = useAppStore(s => s.confidants);
  // 演出队列非空 = 还有没播的升级 → 这一层先不出场，避免「恭喜页抢在演出前面」
  // （队列里的升级播完、点确认才会再设 invite，所以正常链路不受影响）
  const queue = useAppStore(s => s.confidantRankUpQueue);
  const setStarShiftInvite = useAppStore(s => s.setStarShiftInvite);
  const confidant = invite
    // 预览（?celebrate）用的是占位同伴，不在 store 里，单独兜一下
    ? (invite === PREVIEW_CONFIDANT.id ? PREVIEW_CONFIDANT : confidants.find(c => c.id === invite && !c.archivedAt) ?? null)
    : null;

  // ── 只在开发时的预览入口 ───────────────────────────────────────────────
  // 地址后加 ?celebrate=1 直接把「恭喜整页」放出来，不用真升一级、也不走引导。
  // 与演出的 ?rankup 同一套做法（同一个占位同伴）；生产构建里 import.meta.env.DEV
  // 恒为 false，这一段会被整段摇掉。
  const previewFiredRef = useRef(false);
  useEffect(() => {
    if (!import.meta.env.DEV || previewFiredRef.current) return;
    const params = new URLSearchParams(window.location.search);
    // ?celebrate=1 → 恭喜整页；?starshift=1 → 直接进星移四屏（跳过恭喜页）
    const wantCelebrate = params.has('celebrate');
    const wantStarshift = params.has('starshift');
    if (!wantCelebrate && !wantStarshift) return;
    previewFiredRef.current = true;
    setStarShiftInvite(PREVIEW_CONFIDANT.id);
    const url = new URL(window.location.href);
    url.searchParams.delete('celebrate');
    url.searchParams.delete('starshift');
    window.history.replaceState(null, '', url.toString());
  }, [setStarShiftInvite]);

  // 每次换人（或重新邀请）都从「恭喜」这一屏开始；「稍后再说」直接关掉。
  // ?starshift=1 是例外：直接落到星移屏（一次性消费，见上）。
  const [phase, setPhase] = useState<'celebrate' | 'shift'>(DEV_STARSHIFT_DIRECT ? 'shift' : 'celebrate');
  const lastInviteRef = useRef<string | null>(null);
  useEffect(() => {
    // 同一个邀请不动（StrictMode 的第二次 effect 会命中这条）——只有「换了个人」才复位到恭喜页。
    // ⚠ 邀请是**挂载之后**才写进 store 的（升级链点确认 / DEV 预览），所以「首次邀请」是
    //   null → id 那一次跳变；`?starshift=1` 直达要在这条跳变上保持星移屏（2026-10-16 实测修）。
    if (lastInviteRef.current === invite) return;
    const prev = lastInviteRef.current;
    lastInviteRef.current = invite;
    if (!invite) return;
    if (prev === null && DEV_STARSHIFT_DIRECT) return; // ?starshift=1 直达：保持星移屏
    setPhase('celebrate');
  }, [invite]);

  // 同伴已被删/归档：清掉邀请，别把浮层卡在半开状态
  useEffect(() => {
    if (invite && !confidant) setStarShiftInvite(null);
  }, [invite, confidant, setStarShiftInvite]);

  if (!invite || !confidant || queue.length > 0) return null;

  if (phase === 'celebrate') {
    return (
      <ConfidantCelebrateScreen
        confidant={confidant}
        onClose={() => setStarShiftInvite(null)}
        onUseStarShift={() => setPhase('shift')}
      />
    );
  }

  return (
    <ConfidantStarShiftModal
      isOpen
      confidant={confidant}
      onClose={() => setStarShiftInvite(null)}
    />
  );
}
