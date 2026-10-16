/**
 * 红频道（p5）跨屏公共层 —— **P5R 转场四件套** + **主角牌 #hero**。
 *
 * 逐条移植自用户已验收的红版 demo（outputs/bond-rankup-demo-p5/index.html）：
 *   · `p5Sweep` 一段 → `runP5Sweep` + `revealInP5` / `revealOutP5` / `popInP5`
 *   · `heroPoseTo` 一段 → `requestP5HeroPose` + 层内的四姿态站位与翻面
 *
 * 为什么是模块级命令式 API：三件（羁绊升级演出 / 升级恭喜 / 星移四屏）是三个互不嵌套的
 * 组件，靠 store 串成一条链；转场与主角牌必须活在它们**之上**。用命令式调用与项目里既有的
 * `el.animate` 时间线风格一致（见 ConfidantRankUpCutInP5），也避免把三件硬塞进同一个父组件。
 *
 * 与 demo 的差别（有意为之，写在明处）：
 *   demo 有一屏「假主界面」，主角牌常驻在它的右缘待命；App 里没有这屏，真实界面不能被一张
 *   常驻浮牌压着 —— 所以待命位只在「升级链开始」到「链结束」之间出现，链一断就淡出。
 *
 * ⚠ 层序：演出 240 / 恭喜 230 / 星移 180 → 主角牌 250、转场 260（见 confidant-p5-fx.css）。
 * ⚠ clip-path 会连带裁掉 box-shadow 与 filter:drop-shadow（本仓实测）——本层没有这种写法。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotion } from 'motion/react';
import { useAppStore } from '@/store';
import { useUiChannel } from '@/ui/useUiChannel';
import { P5R } from '@/components/p5r/kit';
import { EXP, OVER } from '@/components/cooperation/confidantRankUpShared';
import '@/styles/confidant-p5-fx.css';

export type P5HeroPose = 'app' | 'show' | 'page2' | 'page3' | 'hidden';

export interface P5FxOrigin {
  x: number;
  y: number;
}

interface HeroRequest {
  pose: P5HeroPose;
  instant: boolean;
}

/** 转场缓动（照 demo 的 EASE2） */
const EASE2 = 'cubic-bezier(.65,0,.2,1)';

/* ── 模块级控制器 ──────────────────────────────────────────────────────────
   三件组件在自己的时间线上调用；层在 App 顶层把实现挂进来。
   请求与实现分开，是为了让三件不必知道层的存在（也就不会互相 import 成环）。 */
let heroArtUrl: string | null = null;
let currentHeroReq: HeroRequest = { pose: 'hidden', instant: true };
let sweepHandler: ((word: string, apply: () => void, origin: P5FxOrigin | null, dir: 1 | -1) => Promise<boolean>) | null = null;
let heroBeatHandler: (() => void) | null = null;
let lastSweepOrigin: P5FxOrigin = { x: 0, y: 0 };
const heroArtSubs = new Set<(url: string | null) => void>();
const heroPoseSubs = new Set<(req: HeroRequest) => void>();

/** 设置主角牌正面图（各屏挂载时调用；null = 只显示牌背） */
export function setP5HeroArt(url: string | null): void {
  heroArtUrl = url;
  heroArtSubs.forEach(fn => fn(url));
}

/** 请求主角牌切姿态。`instant` = 首帧直接落位，不做 900ms 缓动 */
export function requestP5HeroPose(pose: P5HeroPose, opts?: { instant?: boolean }): void {
  currentHeroReq = { pose, instant: !!opts?.instant };
  heroPoseSubs.forEach(fn => fn(currentHeroReq));
}

/** 演出进入时的「牌之光晕 + 落地顿挫 + 高光扫过」三连（照 demo rankUp 的 ② 段） */
export function p5HeroEnterBeat(): void {
  heroBeatHandler?.();
}

/**
 * 转场总控：红斜杠 + 白闪 → 巨字横掠 → 双圆环，180ms 后执行 apply()（新层 revealIn / 旧层 revealOut），
 * 期间 busy 锁防重入。返回 Promise<boolean>；reduce / 忙时返回 false 并（reduce 下）直接 apply。
 */
export function runP5Sweep(
  word: string,
  apply: () => void,
  origin?: P5FxOrigin | null,
  dir: 1 | -1 = 1,
): Promise<boolean> {
  // 记下这次转场的圆心：下一屏是**新挂载**出来的组件，它自己拿不到点击点，
  // 用 `lastP5SweepOrigin()` 就能从同一个圆心展开（照 demo 里 revealIn 的用法）。
  if (origin && (origin.x !== 0 || origin.y !== 0)) lastSweepOrigin = { x: origin.x, y: origin.y };
  if (!sweepHandler) {
    apply();
    return Promise.resolve(false);
  }
  return sweepHandler(word, apply, origin ?? null, dir);
}

/** 最近一次转场的圆心（点击点）；新挂载的屏用它做 revealIn。{0,0} = 还没转过场，调用方应退回屏幕中心 */
export function lastP5SweepOrigin(): P5FxOrigin {
  if (lastSweepOrigin.x === 0 && lastSweepOrigin.y === 0) {
    return { x: window.innerWidth * 0.5, y: window.innerHeight * 0.5 };
  }
  return { ...lastSweepOrigin };
}

/** 圆形展开新层（圆心 = 点击点）——在 apply() 里对新屏调用 */
export function revealInP5(el: Element | null, origin: P5FxOrigin): void {
  const node = el as HTMLElement | null;
  if (!node || !canAnimate(node) || prefersReduce()) return;
  const a = node.animate(
    [
      { clipPath: `circle(0px at ${origin.x}px ${origin.y}px)` },
      { clipPath: `circle(170vmax at ${origin.x}px ${origin.y}px)` },
    ],
    { duration: 760, easing: EASE2, fill: 'forwards' },
  );
  a.finished
    .then(() => {
      node.style.clipPath = 'none';
      a.cancel();
    })
    .catch(() => {});
}

/** 圆形收拢旧层（退场）——调用方负责在动画后把该层从界面上摘掉 */
export function revealOutP5(el: Element | null, origin: P5FxOrigin): void {
  const node = el as HTMLElement | null;
  if (!node || !canAnimate(node) || prefersReduce()) return;
  const a = node.animate(
    [
      { clipPath: `circle(170vmax at ${origin.x}px ${origin.y}px)` },
      { clipPath: `circle(0px at ${origin.x}px ${origin.y}px)` },
    ],
    { duration: 640, easing: EASE2, fill: 'forwards' },
  );
  a.finished
    .then(() => {
      node.style.clipPath = '';
      a.cancel();
    })
    .catch(() => {});
}

/** 内容斜插错峰入场（照 demo popIn：delay 380 + k*90、duration 540、OVER） */
export function popInP5(els: Iterable<Element>, dir: 1 | -1 = 1): void {
  if (prefersReduce()) return;
  Array.from(els).forEach((el, k) => {
    if (!el || !canAnimate(el)) return;
    el.animate(
      [
        { opacity: 0, transform: `translateX(${dir * 60}px) skewX(-10deg)` },
        { opacity: 1, transform: 'none' },
      ],
      { delay: 380 + k * 90, duration: 540, easing: OVER, fill: 'backwards' },
    );
  });
}

/** 内容列「缩小回弹」入场（照 demo 的 wrap scale 1.12→1，760ms / EASE2）；jsdom 下自动跳过 */
export function p5ScaleInP5(el: Element | null, from = 1.12, duration = 760): void {
  if (!el || !canAnimate(el)) return;
  el.animate([{ transform: `scale(${from})` }, { transform: 'scale(1)' }], { duration, easing: EASE2 });
}

function prefersReduce(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * jsdom（单测环境）没有 `Element.animate` —— 本层所有动画入口都先过这道能力探测：
 * 跑不到动画就安静跳过（组件测试只关心结构与分流，不关心动画帧）。
 */
const canAnimate = (el: Element | null | undefined): boolean =>
  !!el && typeof (el as HTMLElement).animate === 'function';

const A = (el: Element | null, kf: Keyframe[], opts: KeyframeAnimationOptions = {}) =>
  el && canAnimate(el) ? el.animate(kf, { duration: 400, easing: EXP, fill: 'forwards', ...opts }) : null;

/* ── 固定层本体 ────────────────────────────────────────────────────────── */
export function ConfidantP5FxLayer() {
  const channel = useUiChannel();
  const queue = useAppStore(s => s.confidantRankUpQueue);
  const invite = useAppStore(s => s.starShiftInvite);
  const reduce = useReducedMotion();

  const [art, setArt] = useState<string | null>(heroArtUrl);
  const [req, setReq] = useState<{ pose: P5HeroPose; instant: boolean; n: number }>({
    pose: currentHeroReq.pose,
    instant: currentHeroReq.instant,
    n: 0,
  });

  const heroRef = useRef<HTMLDivElement>(null);
  const hero3dRef = useRef<HTMLDivElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const glintRef = useRef<HTMLSpanElement>(null);
  const slashRef = useRef<HTMLElement>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  const flashRef = useRef<HTMLElement>(null);
  const ringsRef = useRef<HTMLSpanElement>(null);
  const ringRefs = useRef<(HTMLElement | null)[]>([]);
  const busyRef = useRef(false);
  const poseSeqRef = useRef(0);
  const lastPoseRef = useRef<P5HeroPose>('hidden');

  /* ── 主角牌：四姿态站位（照 demo poseTargets）── */
  const poseTargets = useCallback((name: P5HeroPose) => {
    const hero = heroRef.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cw = hero?.offsetWidth || 220;
    const ch = hero?.offsetHeight || 355;
    const mob = vw <= 640;

    if (name === 'app') {
      // 手机端待命位只从右缘露一条边；桌面端露约 62%
      if (mob) return { x: Math.round(vw - 30), y: Math.round(vh * 0.7 - ch * 0.5), rot: -13, flip: true };
      return { x: Math.round(vw - cw + Math.round(cw * 0.38)), y: Math.round(vh * 0.56 - ch * 0.5), rot: -13, flip: true };
    }
    if (name === 'show') {
      // 舞台占位块（等尺寸）——演出位与它对齐后，还要向左上出血一小段（照 demo）
      const slot = document.querySelector('[data-p5-card-slot="stage"]');
      const r = slot?.getBoundingClientRect();
      return {
        x: r ? Math.round(r.left - vw * 0.07) : Math.round(vw * 0.5 - cw * 0.5 - vw * 0.07),
        y: r ? Math.round(r.top - vh * 0.06 + 14) : Math.round(vh * 0.34 - ch * 0.5),
        rot: -11,
        flip: false,
      };
    }
    if (name === 'page2') {
      const anchor = document.querySelector('[data-p5-hero-anchor="page2"]');
      const ml = anchor ? anchor.getBoundingClientRect().left : vw * 0.1;
      const x = ml - cw > 26 ? Math.round((ml - cw) / 2) : 14 - cw;
      return { x, y: Math.round(vh * 0.3 - ch * 0.5), rot: 7, flip: false };
    }
    const anchor = document.querySelector('[data-p5-hero-anchor="page3"]');
    const mr = anchor ? vw - anchor.getBoundingClientRect().right : vw * 0.1;
    const x = mr - cw > 26 ? Math.round(vw - mr / 2 - cw / 2) : Math.round(vw - 14);
    return { x, y: Math.round(vh * 0.6 - ch * 0.5), rot: -9, flip: true };
  }, []);

  const heroPoseTo = useCallback(
    (name: P5HeroPose, instant?: boolean) => {
      const hero = heroRef.current;
      const h3 = hero3dRef.current;
      if (!hero || !h3) return;

      if (name === 'hidden') {
        lastPoseRef.current = 'hidden';
        if (reduce) {
          hero.style.opacity = '0';
          return;
        }
        if (!canAnimate(hero)) {
          hero.style.opacity = '0';
          return;
        }
        const fade = hero.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 360, easing: 'linear', fill: 'forwards' });
        fade.finished.catch(() => {});
        return;
      }

      if (hero.style.opacity === '0') hero.style.opacity = '1';
      const t = poseTargets(name);
      const tf = `translate(${t.x}px,${t.y}px) rotate(${t.rot}deg)`;
      const ff = `rotateY(${t.flip ? 180 : 0}deg)`;
      const fromHidden = lastPoseRef.current === 'hidden';
      lastPoseRef.current = name;
      const my = ++poseSeqRef.current;

      if (instant || reduce) {
        hero.style.transform = tf;
        h3.style.transform = ff;
        return;
      }

      // 开局：从天上旋转坠入待命位（照 demo 的 intro 登场）
      if (name === 'app' && fromHidden) {
        hero.style.transform = tf;
        h3.style.transform = ff;
        if (!canAnimate(hero)) return;
        hero.animate(
          [
            { transform: `translate(${t.x}px,${t.y - window.innerHeight}px) rotate(320deg)` },
            { transform: tf },
          ],
          { duration: 1600, easing: 'cubic-bezier(.2,.9,.25,1.1)' },
        );
        return;
      }

      if (!canAnimate(hero) || !canAnimate(h3)) {
        hero.style.transform = tf;
        h3.style.transform = ff;
        return;
      }
      const a = hero.animate([{ transform: hero.style.transform || tf }, { transform: tf }], {
        duration: 900,
        easing: 'cubic-bezier(.34,1.3,.5,1)',
        fill: 'forwards',
      });
      a.finished
        .then(() => {
          if (my !== poseSeqRef.current) return;
          hero.style.transform = tf;
          a.cancel();
        })
        .catch(() => {});
      const b = h3.animate([{ transform: h3.style.transform || ff }, { transform: ff }], {
        duration: 780,
        easing: 'cubic-bezier(.34,1.2,.5,1)',
        fill: 'forwards',
      });
      b.finished
        .then(() => {
          if (my !== poseSeqRef.current) return;
          h3.style.transform = ff;
          b.cancel();
        })
        .catch(() => {});
    },
    [poseTargets, reduce],
  );

  /* ── 转场四件套 ── */
  const sweep = useCallback(
    (word: string, apply: () => void, origin: P5FxOrigin | null, dir: 1 | -1): Promise<boolean> => {
      // 正在转场时又来一次请求（例如连点）：不叠一层转场，但**动作照做** ——
      // 早期版本这里直接 return，会把「关窗」这类动作吞掉（用户点了没反应）。
      if (busyRef.current) {
        apply();
        return Promise.resolve(false);
      }
      if (reduce) {
        apply();
        return Promise.resolve(true);
      }
      busyRef.current = true;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // 圆心：优先真实点击点；程序化点击（clientX/Y 均为 0）退回屏幕中心
      const o = origin && (origin.x !== 0 || origin.y !== 0) ? origin : { x: vw * 0.5, y: vh * 0.5 };

      A(slashRef.current, [{ transform: 'translateX(-160px)' }, { transform: `translateX(${vw + 160}px)` }], {
        duration: 560,
        easing: 'cubic-bezier(.7,0,.2,1)',
      });
      A(flashRef.current, [{ opacity: 0 }, { opacity: 0.5, offset: 0.3 }, { opacity: 0 }], { duration: 320 });

      const wEl = wordRef.current;
      if (wEl) {
        wEl.textContent = word || 'COOPERATION';
        // 出口距离按「字自己的宽度」算：长词用固定 vw 会留下一截尾巴（demo 修过的 BUG）
        const tw = wEl.offsetWidth || vw;
        A(wEl, [{ transform: `translateX(${vw + 20}px)` }, { transform: `translateX(-${tw + 60}px)` }], {
          duration: 1050,
          easing: 'cubic-bezier(.45,0,.2,1)',
        });
      }

      const rg = ringsRef.current;
      if (rg) {
        rg.style.left = `${o.x}px`;
        rg.style.top = `${o.y}px`;
        const n = (Math.max(vw, vh) / 40) * 2.4;
        const delay = dir > 0 ? 280 : 380;
        ringRefs.current.forEach((ri, k) => {
          A(ri, [{ opacity: 0.9, transform: 'scale(0)' }, { opacity: 0, transform: `scale(${k ? n * 0.85 : n})` }], {
            delay: delay + k * 110,
            duration: 760,
            easing: EASE2,
          });
        });
      }

      return new Promise<boolean>(res => {
        window.setTimeout(apply, 180);
        window.setTimeout(() => {
          busyRef.current = false;
          res(true);
        }, 180 + 820);
      });
    },
    [reduce],
  );

  /* ── 演出 ② 段的动作（光晕 / 落地顿挫 / 高光扫过）—— 牌已经搬到本层，动作跟着搬 ── */
  const heroBeat = useCallback(() => {
    if (reduce) {
      if (haloRef.current) haloRef.current.style.opacity = '0.6';
      return;
    }
    A(haloRef.current, [{ opacity: 0, scale: 0.4 }, { opacity: 0.85, scale: 1, offset: 0.55 }, { opacity: 0.5, scale: 1.12 }], {
      duration: 1500,
      delay: 240,
    });
    A(cardRef.current, [{ scale: '1.05' }, { scale: '1' }], { duration: 320, delay: 420, easing: OVER });
    A(glintRef.current, [{ opacity: 0, translate: '-140% 0' }, { opacity: 1, translate: '-10% 0', offset: 0.5 }, { opacity: 0, translate: '140% 0' }], {
      duration: 880,
      delay: 1220,
      easing: 'linear',
    });
  }, [reduce]);

  // 实现挂上模块（**在 render 期赋值**：子组件在自己的 useEffect 里就会调用，
  // 而子组件的 effect 早于父组件的 effect，只有 render 期赋值才赶得上）。
  sweepHandler = sweep;
  heroBeatHandler = heroBeat;

  // 订阅：牌面图 + 姿态请求
  useEffect(() => {
    const onArt = (url: string | null) => setArt(url);
    const onPose = (r: HeroRequest) => setReq(prev => ({ pose: r.pose, instant: r.instant, n: prev.n + 1 }));
    heroArtSubs.add(onArt);
    heroPoseSubs.add(onPose);
    onArt(heroArtUrl);
    if (currentHeroReq.pose !== 'hidden') onPose(currentHeroReq);
    return () => {
      heroArtSubs.delete(onArt);
      heroPoseSubs.delete(onPose);
      sweepHandler = null;
      heroBeatHandler = null;
    };
  }, []);

  // 姿态落地：等 DOM 上屏后再量（新层第一次出现时元素还不存在）
  useEffect(() => {
    if (req.pose === 'hidden' && req.n === 0) return;
    const id = requestAnimationFrame(() => heroPoseTo(req.pose, req.instant));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req.n]);

  // 链断了（队列空 + 没有星移邀请）就把主角牌收走：App 的真实界面不该被一张常驻浮牌压着。
  // 800ms 宽限：确认那一刻是「先出队、再发邀请」，两条状态在同一批里更新，宽限还能兜住手滑。
  const idle = queue.length === 0 && !invite;
  useEffect(() => {
    if (!idle) return;
    const t = window.setTimeout(() => {
      const st = useAppStore.getState();
      if (st.confidantRankUpQueue.length > 0 || st.starShiftInvite) return;
      requestP5HeroPose('hidden');
    }, 800);
    return () => window.clearTimeout(t);
  }, [idle]);

  if (channel !== 'p5') return null;
  const visible = req.pose !== 'hidden';

  return createPortal(
    <div
      style={{
        ['--p5fx-red' as string]: P5R.red,
        ['--p5fx-red-deep' as string]: P5R.redDeep,
        ['--p5fx-red-hot' as string]: P5R.redHot,
        ['--p5fx-ink' as string]: P5R.ink,
        ['--p5fx-paper' as string]: P5R.paper,
      }}
    >
      {/* 主角牌：跨界面存活的那一张 */}
      <div
        ref={heroRef}
        className="p5fx-hero"
        style={{ display: visible ? 'block' : 'none' }}
        aria-hidden
      >
        <div className="halo" ref={haloRef} />
        <div className="bobwrap">
          <div className="hero3d" ref={hero3dRef}>
            <div className="card3d" ref={cardRef}>
              {art ? <img src={art} alt="" /> : null}
              <span className="glint" ref={glintRef} />
            </div>
            <div className="cardback">
              <svg viewBox="0 0 100 156" aria-hidden="true">
                <rect width="100" height="156" fill={P5R.red} />
                <rect x="4" y="4" width="92" height="148" fill="none" stroke={P5R.paper} strokeWidth="2.5" />
                <rect x="8.5" y="8.5" width="83" height="139" fill="none" stroke="#000" strokeWidth="1.4" opacity=".55" />
                <path d="M50 38 L58.5 78 L50 118 L41.5 78 Z" fill={P5R.paper} />
                <path d="M10 78 L50 69.5 L90 78 L50 86.5 Z" fill={P5R.paper} />
                <circle cx="50" cy="78" r="6.4" fill={P5R.red} stroke="#000" strokeWidth="2" />
                <g fill={P5R.paper} opacity=".85">
                  <circle cx="15" cy="17" r="1.4" /><circle cx="21" cy="23" r="1.4" /><circle cx="27" cy="29" r="1.4" />
                  <circle cx="85" cy="17" r="1.4" /><circle cx="79" cy="23" r="1.4" /><circle cx="73" cy="29" r="1.4" />
                  <circle cx="15" cy="139" r="1.4" /><circle cx="21" cy="133" r="1.4" /><circle cx="27" cy="127" r="1.4" />
                  <circle cx="85" cy="139" r="1.4" /><circle cx="79" cy="133" r="1.4" /><circle cx="73" cy="127" r="1.4" />
                </g>
                <text x="50" y="146.5" textAnchor="middle" fontSize="7.6" fontWeight="900" fill={P5R.paper} letterSpacing="2.2">MASKARIA</text>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* 转场四件套：红斜杠 / 巨字横扫 / 白闪 / 点击点双圆环 */}
      <div className="p5fx-sw" aria-hidden>
        <i className="sw-slash" ref={slashRef as never} />
        <span className="sw-word" ref={wordRef}>COOPERATION</span>
        <span className="sw-rings" ref={ringsRef}>
          {[0, 1].map(k => (
            <i key={k} ref={el => { ringRefs.current[k] = el; }} />
          ))}
        </span>
        <i className="sw-flash" ref={flashRef as never} />
      </div>
    </div>,
    document.body,
  );
}
