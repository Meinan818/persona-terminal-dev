/**
 * 羁绊升级演出 · 红频道（P5 红黑剪报）版 —— 计划 Wave 1。
 *
 * 为什么独立成文件、不在 p3 版里加条件分支：两版的视觉语言是**结构性**差异
 * （p3 是深蓝水下柔光，p5 是黑底剪报硬斜切），塞进同一套 JSX 会变成满屏 `isP5 ? … : …`；
 * 独立成文件则 p3 侧零风险、整块可回滚。分流由 ConfidantRankUpCutIn.tsx 的包装组件
 * 按 useUiChannel() 决定——**本文件不判频道**，它只在 p5 时被渲染。
 *
 * 编排照**用户已验收的**红版 demo（outputs/bond-rankup-demo-p5/index.html）逐段移植：
 *   ① 同心星定场 → ② 牌转向显形 → ③ 命运行 → ④ 旧级浮出 → ⑤ 盖印砸下（压掉旧级）
 *   → ⑥ 落印痕迹（红环 / 冲击波 / 火星）→ ⑦ 新级落定 → ⑧ 誓约 → ⑨ 受领 → ⑩ 停驻待确认
 * 盖印那一枚的形制照 src/components/p5r/kit.tsx 的语言做：两端斜切 + 四角错动、
 * 红硬影错开、半调网点 dot 1.6 / gap 9、印面中英并列。
 *
 * 与 p3 版共用的东西（缓动、占位同伴、随机抖动）在 confidantRankUpShared.ts——
 * 放那边是为了避开两版互相 import 的循环。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotion } from 'motion/react';
import { useAppStore } from '@/store';
import { TAROT_BY_ID } from '@/constants/tarot';
import { TarotCardSVG } from '@/components/astrology/TarotCardSVG';
import { P5R, starPts } from '@/components/p5r/kit';
import { p5RingLayers, P5ScatterStars, P5Hoops } from '@/components/cooperation/confidantP5Scenery';
import { INTIMACY_LABELS, formatBuffDisplay } from '@/utils/confidantLevels';
import { markLevelCelebrated } from '@/utils/confidantCelebration';
import { EXP, SLAM, OVER, rand, PREVIEW_CONFIDANT } from './confidantRankUpShared';
import '@/styles/confidant-rankup-p5.css';

export function ConfidantRankUpCutInP5() {
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

  // 同伴已被删/归档：跳过该条，不阻塞后面的
  useEffect(() => {
    if (notice && !confidant) dismissConfidantRankUp(notice.id);
  }, [notice, confidant, dismissConfidantRankUp]);

  /** 收场：出队 + 接星移（与 p3 版同一口径） */
  const finishRankUp = useCallback(() => {
    if (!notice) return;
    dismissConfidantRankUp(notice.id);
    setStarShiftInvite(notice.confidantId);
  }, [notice, dismissConfidantRankUp, setStarShiftInvite]);

  // Esc 逃生口：任何时刻能跳过。没有这条，确认键一出问题用户就被卡在满屏演出里。
  useEffect(() => {
    if (!notice) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finishRankUp();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [notice, finishRankUp]);

  const [phase, setPhase] = useState<'playing' | 'confirm'>('playing');
  const ringsRef = useRef<HTMLDivElement>(null);
  const ripplesRef = useRef<HTMLDivElement>(null);
  const collectRef = useRef<HTMLDivElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);
  const glintRef = useRef<HTMLDivElement>(null);
  const slabARef = useRef<HTMLDivElement>(null);
  const slabBRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const arcanaRef = useRef<HTMLDivElement>(null);
  const oldRef = useRef<HTMLSpanElement>(null);
  const newRef = useRef<HTMLSpanElement>(null);
  const stampRef = useRef<HTMLDivElement>(null);
  const shockRef = useRef<HTMLDivElement>(null);
  const waveRef = useRef<HTMLDivElement>(null);
  const sparksRef = useRef<HTMLDivElement>(null);
  const shardsRef = useRef<HTMLDivElement>(null);
  const starsRef = useRef<HTMLDivElement>(null);
  const burstRef = useRef<HTMLDivElement>(null);
  const vowRef = useRef<HTMLDivElement>(null);
  const unlockRef = useRef<HTMLDivElement>(null);

  // 落印甩出的小红点：起点沿印章轮廓铺一圈，再沿同方向甩出。
  // 换一条队列项就重建（位置随机，但同一条内稳定）。
  const noticeId = notice?.id;
  // 盖印炸出的剪报碎片（demo #shards：36 片）。形状走确定性随机，
  // 免得每次重播都换一套形状（碎片面积大，乱跳很明显）。
  // mulberry32 与 demo 同式；项目里 fateDraw.ts / lifeQuests.ts 也各有一份本地副本（既有惯例）。
  const shards = useMemo(() => {
    const mulberry32 = (a: number) => () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const clampN = (n: number) => Math.max(0, Math.min(100, n));
    return Array.from({ length: 36 }, (_, i) => {
      const r = mulberry32(1500 + i);
      const jag = 24;
      const p = () => (r() * 2 - 1) * jag;
      const cl = (v: number) => clampN(v).toFixed(2);
      return {
        w: `${(9 + r() * 28).toFixed(0)}px`,
        h: `${(7 + r() * 17).toFixed(0)}px`,
        r: `${(r() * 180).toFixed(0)}deg`,
        dx: `${(r() * 26 - 13).toFixed(1)}vw`,
        dy: `${(r() * 22 - 4).toFixed(1)}vh`,
        clip: `polygon(${cl(p())}% ${cl(p())}%,${cl(100 - p())}% ${cl(p())}%,${cl(100 - p())}% ${cl(100 - p())}%,${cl(p())}% ${cl(100 - p())}%)`,
      };
    });
  }, []);
  const sparks = useMemo(
    () =>
      Array.from({ length: 24 }, () => {
        const ang = Math.random() * Math.PI * 2;
        const ex = 60 + Math.random() * 152;
        const ey = 17 + Math.random() * 46;
        const x0 = Math.cos(ang) * ex;
        const y0 = Math.sin(ang) * ey;
        const fly = 26 + Math.random() * 58;
        return {
          x0, y0,
          x1: x0 + Math.cos(ang) * fly,
          y1: y0 + Math.sin(ang) * fly,
          size: 2 + Math.random() * 4,
          hot: Math.random() < 0.7,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [noticeId],
  );

  useEffect(() => {
    if (!notice || !confidant) return;
    // 播放开始即标记「这一级庆祝过了」；预览（?rankup）不写——那是真实等级的事
    if (!notice.preview) markLevelCelebrated(confidant.id, notice.newLevel);
    setPhase('playing');

    const A = (el: Element | null, kf: Keyframe[], opts: KeyframeAnimationOptions = {}) =>
      el ? el.animate(kf, { duration: 400, easing: EXP, fill: 'forwards', ...opts }) : null;

    const timers: number[] = [];
    const T = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));

    if (reduce) {
      // 减少动态：直接呈现终态、停在确认态（与 p3 版同一降级口径）
      [cardRef, arcanaRef, oldRef, vowRef, unlockRef].forEach(r => {
        if (r.current) r.current.style.opacity = '1';
      });
      if (ringsRef.current) ringsRef.current.style.opacity = '1';
      [slabARef, slabBRef].forEach(r => { if (r.current) r.current.style.opacity = '1'; });
      if (stampRef.current) stampRef.current.style.opacity = '1';
      T(0, () => setPhase('confirm'));
    } else {
      // ① 同心星定场 + 两条猩红斜带（只做动势，牌走中间的黑底）
      A(ringsRef.current, [{ opacity: 0, scale: 0.42, rotate: '-22deg' }, { opacity: 1, scale: 1, rotate: '-9deg' }], { duration: 850, delay: 60, easing: EXP });
      // 星涟漪三圈接力扩散（照 demo：每圈 delay = i*240ms）
      const rippleSvgs = ripplesRef.current?.querySelectorAll('svg') ?? [];
      rippleSvgs.forEach((sv, i) => {
        A(sv, [{ opacity: 0.9, scale: 0.32, rotate: '-14deg' }, { opacity: 0, scale: 1.5, rotate: '-2deg' }], { duration: 820, delay: i * 240, easing: EXP });
      });
      // 集中线自中心爆开（照 demo：duration 1500、delay 180、中途 offset .4 最亮）
      A(collectRef.current, [{ opacity: 0, scale: 0.1, rotate: '-18deg' }, { opacity: 1, scale: 1, rotate: '0deg', offset: 0.4 }, { opacity: 0, scale: 1, rotate: '0deg' }], { duration: 1500, delay: 180, easing: EXP });
      A(slabARef.current, [{ opacity: 0, scale: 1.5, rotate: '-8deg' }, { opacity: 1, scale: 1, rotate: '-3deg' }], { duration: 760, delay: 80, easing: EXP });
      A(slabBRef.current, [{ opacity: 0, translate: '-44px 0' }, { opacity: 1, translate: '0 0' }], { duration: 700, delay: 220, easing: EXP });

      // ② 牌「转向」显形（宿命显形的本体）+ 背后光晕呼吸 + 扫过的高光
      A(haloRef.current, [{ opacity: 0, scale: 0.4 }, { opacity: 0.85, scale: 1, offset: 0.55 }, { opacity: 0.5, scale: 1.12 }], { duration: 1500, delay: 340, easing: EXP });
      A(cardRef.current, [
        { opacity: 0, transform: 'rotateY(-78deg) rotateZ(-9deg) scale(1.34)' },
        { opacity: 1, transform: 'rotateY(0deg) rotateZ(0deg) scale(1)', offset: 0.62 },
        { opacity: 1, transform: 'rotateY(0deg) rotateZ(0deg) scale(1.03)', offset: 0.78 },
        { opacity: 1, transform: 'rotateY(0deg) rotateZ(0deg) scale(1)' },
      ], { duration: 1180, delay: 400, easing: EXP });
      // 牌面高光扫过（照 demo #glint：delay 1220、线性、从左到右）
      A(glintRef.current, [{ opacity: 0, translate: '-140% 0' }, { opacity: 1, translate: '-10% 0', offset: 0.5 }, { opacity: 0, translate: '140% 0' }], { duration: 880, delay: 1220, easing: 'linear' });

      // ③ 命运行（牌名 + 称谓）
      T(1560, () => { A(arcanaRef.current, [{ opacity: 0, translate: '0 18px' }, { opacity: 1, translate: '0 0' }], { duration: 520, easing: EXP }); });

      // ④ 旧级浮出
      T(2100, () => { A(oldRef.current, [{ opacity: 0, translate: '0 22px' }, { opacity: 0.95, translate: '0 0' }], { duration: 460, easing: EXP }); });

      // ⑤ 盖印砸下
      T(2880, () => {
        A(stampRef.current, [
          { opacity: 0, transform: 'translate(-50%,-210%) rotate(-19deg) scale(1.5)' },
          { opacity: 1, transform: 'translate(-50%,-50%) rotate(-4deg) scale(1)', offset: 0.58 },
          { opacity: 1, transform: 'translate(-50%,-46%) rotate(-2.4deg) scale(0.985)', offset: 0.72 },
          { opacity: 1, transform: 'translate(-50%,-52%) rotate(-3deg) scale(1)' },
        ], { duration: 560, easing: SLAM });
      });

      // ⑥ 落印痕迹：印章 keyframe 在 2880+560×0.58≈3205ms 触底，痕迹略晚于触底才像「砸」
      T(3000, () => {
        A(oldRef.current, [{ opacity: 0.95, scale: 1 }, { opacity: 0, scale: 1.28, filter: 'blur(5px)' }], { duration: 320, easing: 'ease-out' });
        // 剪报碎片自中心炸开（照 demo #shards）
        shardsRef.current?.querySelectorAll('i').forEach(g => {
          const dx = g.getAttribute('data-dx') ?? '0vw';
          const dy = g.getAttribute('data-dy') ?? '0vh';
          const rot = g.getAttribute('data-r') ?? '0deg';
          A(g, [
            { opacity: 0, scale: '0.35', translate: '0 0' },
            { opacity: 0.95, scale: '1', offset: 0.22 },
            { opacity: 0, scale: '0.7', translate: `${dx} ${dy}`, rotate: rot },
          ], { delay: Math.random() * 110, duration: 1250, easing: 'cubic-bezier(.2,.7,.3,1)' });
        });
        A(stampRef.current, [{ opacity: 1 }, { opacity: 1, offset: 0.62 }, { opacity: 0 }], { duration: 520, delay: 150, easing: 'ease-out' });
        // 散落五角星入场 + 轻闪两轮。
        // ⚠ demo 源码注释点名：这几行原先与碎片写在一起，v3 重写时只留了碎片、
        //   把星漏了 —— 于是星元素生成了却永远不亮（opacity 停在 CSS 的 0）。
        //   同类「元素建了、动画漏了」的缺陷在本轮已出现三次，故此处显式补上并留字。
        starsRef.current?.querySelectorAll('svg').forEach((s, i) => {
          A(s, [{ opacity: 0, scale: '0', rotate: '-90deg' }, { opacity: 1, scale: '1', rotate: '0deg' }], { delay: 60 + i * 70, duration: 420, easing: OVER });
          A(s, [{ opacity: 1 }, { opacity: 0.35 }, { opacity: 1 }], { delay: 700 + i * 70, duration: 1400, iterations: 2, easing: 'ease-in-out' });
        });
      });
      T(3220, () => {
        A(shockRef.current, [
          { opacity: 0.92, transform: 'translate(-50%,-50%) scale(0.68) rotate(-3deg)' },
          { opacity: 0, transform: 'translate(-50%,-50%) scale(2.1) rotate(-5.5deg)' },
        ], { duration: 620, easing: SLAM });
        A(waveRef.current, [
          { opacity: 0.72, transform: 'translate(-50%,-50%) scale(0.42)' },
          { opacity: 0, transform: 'translate(-50%,-50%) scale(2.5)' },
        ], { duration: 760, delay: 40, easing: 'cubic-bezier(.12,.9,.2,1)' });
        sparksRef.current?.querySelectorAll('i').forEach(s => {
          const x0 = s.getAttribute('data-x0') ?? '0';
          const y0 = s.getAttribute('data-y0') ?? '0';
          const x1 = s.getAttribute('data-x1') ?? '0';
          const y1 = s.getAttribute('data-y1') ?? '0';
          s.animate([
            { opacity: 0, translate: `${x0}px ${y0}px`, scale: '0.4' },
            { opacity: 1, translate: `${x0}px ${y0}px`, scale: '1', offset: 0.14 },
            { opacity: 0, translate: `${x1}px ${y1}px`, scale: '0.32' },
          ], { duration: 520 + Math.random() * 440, easing: 'cubic-bezier(.18,.72,.3,1)', delay: Math.random() * 80, fill: 'forwards' });
        });
      });

      // ⑦ 新级落定 + 落定星芒
      T(3300, () => {
        A(newRef.current, [
          { opacity: 0, scale: 2.6, filter: 'blur(12px)' },
          { opacity: 1, scale: 1.16, filter: 'blur(0px)', offset: 0.42 },
          { opacity: 1, scale: 0.94, offset: 0.62 },
          { opacity: 1, scale: 1.03, offset: 0.8 },
          { opacity: 1, scale: 1 },
        ], { duration: 640, easing: SLAM });
        A(burstRef.current, [{ opacity: 0, scale: 0.2 }, { opacity: 1, scale: 1, offset: 0.35 }, { opacity: 0, scale: 1.35 }], { duration: 760, easing: EXP });
      });

      // ⑧ 誓约
      T(4050, () => { A(vowRef.current, [{ opacity: 0, translate: '-7% 0' }, { opacity: 1, translate: '0 0' }], { duration: 620, easing: EXP }); });
      // ⑨ 受领
      T(4650, () => { A(unlockRef.current, [{ opacity: 0, translate: '0 16px' }, { opacity: 1, translate: '0 0' }], { duration: 520, easing: OVER }); });
      // ⑩ 停驻待确认（不自动划走）
      T(5250, () => setPhase('confirm'));
    }

    return () => {
      timers.forEach(clearTimeout);
      [ringsRef, collectRef, haloRef, glintRef, slabARef, slabBRef, cardRef, arcanaRef, oldRef, newRef, stampRef, shockRef, waveRef, burstRef, vowRef, unlockRef].forEach(r => {
        r.current?.getAnimations?.().forEach(a => a.cancel());
      });
      sparksRef.current?.querySelectorAll('i').forEach(s => s.getAnimations().forEach(a => a.cancel()));
    };
  }, [notice, confidant, reduce]);

  if (!notice || modalBlocker || !confidant || !card) return null;

  const unlocked = confidant.buffs.filter(b => b.unlockAtLevel > notice.oldLevel && b.unlockAtLevel <= notice.newLevel);
  const unlockedText = unlocked.length
    ? unlocked.map(b => formatBuffDisplay(b, confidant.arcanaId, settings.attributeNames).title).join('、')
    : '';

  // ⚠ 必须 portal 到 body：App.tsx 的 <div className="relative z-10"> 是层叠上下文，
  // 留在树里的浮层对外只等效 z=10，会被 body 级 portal（同伴详情 z-150、星移 z-180）盖住。
  return createPortal(
    <div
      className="rk5-root"
      role="dialog"
      aria-modal="true"
      aria-label={`羁绊升级！${confidant.name} 亲密度 RANK ${notice.newLevel}`}
      style={{
        ['--rk5-red' as string]: P5R.red,
        ['--rk5-red-deep' as string]: P5R.redDeep,
        ['--rk5-red-hot' as string]: P5R.redHot,
        ['--rk5-ink' as string]: P5R.ink,
        ['--rk5-paper' as string]: P5R.paper,
        ['--rk5-orange' as string]: P5R.orange,
        ['--rk5-grey' as string]: P5R.grey,
      }}
    >
      <div className="rk5-halftone" aria-hidden />
      <div className="rk5-rings" ref={ringsRef} aria-hidden>
        <svg viewBox="0 0 200 200">{p5RingLayers()}</svg>
      </div>
      {/* 星涟漪（三圈描边星接力扩散）/ 四角大圆环 / 集中线 —— demo 第一页的定场层，
          首版遗漏，用户报「动画完全不合格」（2026-10-16）。 */}
      <div className="rk5-ripples" ref={ripplesRef} aria-hidden>
        {[0, 1, 2].map(i => (
          <svg key={i} viewBox="0 0 200 200">
            <polygon points={starPts(100, 100, 90, -90 + i * 12, 0.42)} fill="none" stroke="#7d0009" strokeWidth={6} />
          </svg>
        ))}
      </div>
      <P5Hoops className="rk5-hoops" />
      <div className="rk5-collect" ref={collectRef} aria-hidden>
        {Array.from({ length: 28 }, (_, i) => (
          <i key={i} style={{ transform: `rotate(${(i * 360 / 28).toFixed(1)}deg)` }} />
        ))}
      </div>
      <div className="rk5-slab rk5-slab-a" ref={slabARef} aria-hidden />
      <div className="rk5-slab rk5-slab-b" ref={slabBRef} aria-hidden />
      {/* 散落星包一层 div 承接 ref —— P5ScatterStars 是函数组件，不转发 ref */}
      <div ref={starsRef} className="rk5-stars" aria-hidden>
        <P5ScatterStars />
      </div>
      <div className="rk5-vignette" aria-hidden />

      <div className="rk5-cast">
        <div className="rk5-cardst">
          {/* 牌背后的光晕（demo #halo）：牌转向显形时的红白光，呼吸一轮 */}
          <div className="rk5-halo" ref={haloRef} aria-hidden />
          <div className="rk5-card" ref={cardRef}>
            <TarotCardSVG card={card} orientation={confidant.orientation} staticCard showOrientationTag={false} />
            {/* 牌面扫过的高光条（demo #glint） */}
            <div className="rk5-glint" ref={glintRef} aria-hidden />
          </div>
        </div>

        <div className="rk5-arcana" ref={arcanaRef}>
          《{card.name}》· {INTIMACY_LABELS[notice.newLevel] ?? ''}
        </div>

        <div className="rk5-rankzone">
          <span className="rk5-rank rk5-rank-old" ref={oldRef}>RANK {notice.oldLevel}</span>
          <span className="rk5-rank rk5-rank-new" ref={newRef}>RANK {notice.newLevel}</span>
          {/* 盖印：红硬影层 + 黑面层（错开 7×6，层间露出即边框）+ 中英并列印面 */}
          <div className="rk5-stamp" ref={stampRef} aria-hidden>
            <i className="shadow" />
            <i className="plate" />
            <span className="tx">RANK UP</span>
            <em className="sub">羁绊提升</em>
          </div>
          <div className="rk5-shock" ref={shockRef} aria-hidden />
          <div className="rk5-wave" ref={waveRef} aria-hidden />
          <div className="rk5-sparks" ref={sparksRef} aria-hidden>
            {sparks.map((s, i) => (
              <i
                key={i}
                data-x0={s.x0.toFixed(1)}
                data-y0={s.y0.toFixed(1)}
                data-x1={s.x1.toFixed(1)}
                data-y1={s.y1.toFixed(1)}
                style={{ width: s.size, height: s.size, background: s.hot ? 'var(--rk5-red-hot)' : 'var(--rk5-red-deep)' }}
              />
            ))}
          </div>
          <div className="rk5-burst" ref={burstRef} aria-hidden>
            {Array.from({ length: 28 }, (_, i) => (
              <i key={i} style={{ transform: `rotate(${(i * 360 / 28).toFixed(1)}deg)`, ['--h' as string]: `${(64 + rand(96) + 48).toFixed(0)}px` }} />
            ))}
          </div>
        </div>

        {/* 盖印那一下炸出的剪报碎片（demo #shards：36 片，与 #sparks 分开——
            sparks 是沿轮廓甩出的 2–6px 火星，shards 是 9–37px 的纸片）。
            首版遗漏，2026-10-16 补。 */}
        <div className="rk5-shards" ref={shardsRef} aria-hidden>
          {shards.map((s, i) => (
            <i
              key={i}
              data-r={s.r}
              data-dx={s.dx}
              data-dy={s.dy}
              style={{
                width: s.w,
                height: s.h,
                background: i % 3 ? 'var(--rk5-red)' : 'var(--rk5-paper)',
                clipPath: s.clip,
              }}
            />
          ))}
        </div>

        <div className="rk5-vow" ref={vowRef}>
          汝即我，我即汝 —— <b>汝已缔结新的誓约</b>
        </div>

        <div className="rk5-unlock" ref={unlockRef}>
          <i>✦</i>
          <span>{unlockedText ? `解锁 ${unlockedText}` : '羁绊加深'} · 星移 +{notice.starShiftGained}</span>
        </div>
      </div>

      <div className={`rk5-confirm ${phase === 'confirm' ? 'on' : ''}`}>
        <span className="hint">羁绊等级提升</span>
        <button type="button" className="go" onClick={finishRankUp}>确 认</button>
      </div>
    </div>,
    document.body,
  );
}
