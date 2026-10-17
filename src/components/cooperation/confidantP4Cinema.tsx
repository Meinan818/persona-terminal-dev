/**
 * 黄频道（p4）跨屏电影层 —— P4 监视器 + 摄影棚背景 + CRT 切台。
 *
 * 逐段移植自用户已验收的黄色 demo（outputs/bond-rankup-demo-p4/index.html）：
 *   · `#world` / `#monitor` / `#sw` 三块常驻层
 *   · `monitorPoseTo` 的四姿态与 940ms 快落
 *   · `relayWorld` 的背景推拉 / 太阳弧旋转
 *   · `p4Relay` 的 CRT 收束 + 巨字 + 胶片条 + 400ms 冲击 + 1040ms 收场
 *
 * 为什么用 Shadow DOM：demo 是一整页独立 HTML，CSS 里 `#world`、`.stage`、
 * `.page2`、`.sf-*` 都是全局选择器；直接搬进 App 会和 P3/P5 的同名层打架。
 * 把整块电影层放进一个 shadow root，demo CSS 可以原样使用，App 的全局样式
 * 也不会漏进来。三屏组件通过 `createPortal` 进入同一个 shadow root，跨屏的
 * 监视器和背景因此能活在它们之上。
 *
 * 与 demo 的差别（有意为之）：
 *   demo 的「假主界面」不搬——真实 Cooperation 页面已经是入口。电影层只在
 *   升级链/恭喜页/星移页挂载时显示，链结束就隐藏，不会常驻压住真实界面。
 *   监视器的 app 待命位只在链开始时出现。
 *
 * ⚠ jsdom 没有 `Element.animate`：本层所有动画入口都先做能力探测；单测只
 *   关心分流与文本，不关心帧。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotion } from 'motion/react';
import { useUiChannel } from '@/ui/useUiChannel';
import { compactFx } from '@/components/cooperation/confidantRankUpShared';
import p4CinemaCss from '@/styles/confidant-p4-cinema.css?inline';

export type P4Pose = 'app' | 'stage' | 'page2' | 'page3';

export interface P4Origin {
  x: number;
  y: number;
}

interface PoseTarget {
  x: number;
  y: number;
  rot: number;
  scale: number;
  flip: boolean;
}

type PoseTransform = Omit<PoseTarget, 'flip'>;

interface WorldTarget {
  scale: number;
  x: number;
  y: number;
  rot: number;
}

export interface P4RelayOpts {
  dir?: 1 | -1;
  arc?: number;
  lift?: number;
  duration?: number;
}

type RelayHandler = (
  word: string,
  apply: () => void,
  target: P4Pose,
  opts?: P4RelayOpts,
) => Promise<boolean>;

interface PoseRequest {
  pose: P4Pose;
  instant: boolean;
}

const EASE2 = 'cubic-bezier(.65,0,.2,1)';
const OVER = 'cubic-bezier(.34,1.56,.64,1)';
const EXP = 'cubic-bezier(.16,1,.3,1)';

const FLOWER = 'M-0.9 -1.559C-2.9 -4.3 -4.8 -12 0 -12C4.8 -12 2.9 -4.3 0.9 -1.559C2.274 -4.661 7.992 -10.157 10.392 -6C12.792 -1.843 5.174 0.361 1.8 0C5.174 -0.361 12.792 1.843 10.392 6C7.992 10.157 2.274 4.661 0.9 1.559C2.9 4.3 4.8 12 0 12C-4.8 12 -2.9 4.3 -0.9 1.559C-2.274 4.661 -7.992 10.157 -10.392 6C-12.792 1.843 -5.174 -0.361 -1.8 0C-5.174 0.361 -12.792 -1.843 -10.392 -6C-7.992 -10.157 -2.274 -4.661 -0.9 -1.559Z';

const WORLD: Record<P4Pose, WorldTarget> = {
  app: { scale: 1, x: 0, y: 0, rot: 0 },
  stage: { scale: 1.045, x: -1.1, y: -1.2, rot: 0 },
  page2: { scale: 1.02, x: 1.5, y: -1, rot: 0 },
  page3: { scale: 1.06, x: -1.2, y: 1.1, rot: 0 },
};

let hostEl: HTMLDivElement | null = null;
let shadowRootEl: ShadowRoot | null = null;
let cinemaClaims = 0;
let cinemaHideTimer = 0;
let monitorArtUrl: string | null = null;
let currentPose: P4Pose = 'app';
let poseInstant = true;
let relayHandler: RelayHandler | null = null;
let poseNowHandler: ((pose: P4Pose) => void) | null = null;
let relayBusy = false;
let lastRelayOrigin: P4Origin = { x: 0, y: 0 };

const artSubs = new Set<(url: string | null) => void>();
const poseSubs = new Set<(req: PoseRequest) => void>();

/** 创建（或复用）电影层的 shadow host；只在浏览器里执行。 */
export function ensureP4CinemaRoot(): ShadowRoot | null {
  if (typeof document === 'undefined') return null;
  if (shadowRootEl && hostEl?.isConnected) return shadowRootEl;
  shadowRootEl = null;
  hostEl = null;

  const host = document.createElement('div');
  host.id = 'p4-cinema-host';
  host.style.cssText = 'position:fixed;inset:0;z-index:240;pointer-events:none;display:none;';
  const root = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.setAttribute('data-p4-cinema', '');
  style.textContent = p4CinemaCss;
  root.appendChild(style);
  document.body.appendChild(host);

  hostEl = host;
  shadowRootEl = root;
  return root;
}

/**
 * 屏占住电影层：挂载时领、卸载时还。
 * 留 500ms 宽限给 StrictMode 二次挂载和「演出卸载 → 恭喜挂载」的换手。
 */
export function claimP4Cinema(): () => void {
  const root = ensureP4CinemaRoot();
  if (!root || !hostEl) return () => {};
  cinemaClaims += 1;
  if (cinemaHideTimer) {
    window.clearTimeout(cinemaHideTimer);
    cinemaHideTimer = 0;
  }
  hostEl.style.display = 'block';

  let released = false;
  return () => {
    if (released) return;
    released = true;
    cinemaClaims = Math.max(0, cinemaClaims - 1);
    if (cinemaClaims > 0 || !hostEl) return;
    window.clearTimeout(cinemaHideTimer);
    cinemaHideTimer = window.setTimeout(() => {
      if (cinemaClaims === 0 && hostEl) hostEl.style.display = 'none';
    }, 500);
  };
}

/** 设置监视器正面牌面（null = 只显示牌背）。 */
export function setP4MonitorArt(url: string | null): void {
  monitorArtUrl = url;
  artSubs.forEach(fn => fn(url));
}

/** 请求监视器切姿态；`instant` 用于直达/减少动态。 */
export function requestP4Pose(pose: P4Pose, opts?: { instant?: boolean }): void {
  currentPose = pose;
  poseInstant = !!opts?.instant;
  // 转场期间不把监视器拉回新姿态：p4Relay 已经在把它送往目标位，
  // 新屏挂载时的 requestP4Pose 若再触发一次 instant，会取消整段飞行。
  if (relayBusy) return;
  poseSubs.forEach(fn => fn({ pose, instant: poseInstant }));
}

/** 立即把监视器钉到某个姿态（跳过 React 状态排队），用于开场/直达复位。 */
export function snapP4MonitorTo(pose: P4Pose): void {
  currentPose = pose;
  poseInstant = true;
  poseNowHandler?.(pose);
}

/** 转场总控：没有电影层（单测/非 p4）时直接执行 apply。 */
export function runP4Relay(
  word: string,
  apply: () => void,
  target: P4Pose,
  opts?: P4RelayOpts,
): Promise<boolean> {
  if (relayHandler) return relayHandler(word, apply, target, opts);
  apply();
  return Promise.resolve(false);
}

/** 最近一次转场的落点圆心；新挂载的屏用它做圆形展开。 */
export function lastP4RelayOrigin(): P4Origin {
  if (lastRelayOrigin.x === 0 && lastRelayOrigin.y === 0) {
    return { x: window.innerWidth * 0.5, y: window.innerHeight * 0.5 };
  }
  return { ...lastRelayOrigin };
}

const canAnimate = (el: Element | null | undefined): el is Element =>
  !!el && typeof el.animate === 'function';

const prefersReduce = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const resetAnim = (el: Element | null | undefined): void => {
  el?.getAnimations().forEach(a => a.cancel());
};

const A = (el: Element | null, kf: Keyframe[], opts: KeyframeAnimationOptions = {}) =>
  el && canAnimate(el)
    ? el.animate(kf, { duration: 400, easing: EXP, fill: 'forwards', ...opts })
    : null;

/** 圆形展开新层（圆心 = 监视器落点）。 */
export function revealInP4(el: Element | null, origin: P4Origin): void {
  if (!el || !canAnimate(el) || prefersReduce()) return;
  const a = el.animate(
    [
      { clipPath: `circle(0px at ${origin.x}px ${origin.y}px)` },
      { clipPath: `circle(170vmax at ${origin.x}px ${origin.y}px)` },
    ],
    { duration: 620, easing: EASE2, fill: 'forwards' },
  );
  a.finished
    .then(() => {
      (el as HTMLElement).style.clipPath = 'none';
      a.cancel();
    })
    .catch(() => {});
}

/** 内容斜插错峰入场（照 demo popIn：delay 80 + k*70、460ms / OVER）。 */
export function popInP4(els: Iterable<Element>, dir: 1 | -1 = 1): void {
  if (prefersReduce()) return;
  Array.from(els).forEach((el, k) => {
    if (!canAnimate(el)) return;
    el.animate(
      [
        { opacity: 0, transform: `translateX(${dir * 44}px) skewX(-7deg)` },
        { opacity: 1, transform: 'none' },
      ],
      { delay: 80 + k * 70, duration: 460, easing: OVER, fill: 'backwards' },
    );
  });
}

/** 内容列缩小回弹（照 demo showPage2/page3 的 scale 1.08→1）。 */
export function scaleInP4(el: Element | null, from = 1.08, duration = 720): void {
  if (!el || !canAnimate(el)) return;
  el.animate([{ transform: `scale(${from})` }, { transform: 'scale(1)' }], {
    duration,
    easing: EASE2,
  });
}

const centerOf = (el: Element | null): P4Origin => {
  if (!el) return { x: window.innerWidth * 0.5, y: window.innerHeight * 0.5 };
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

const monTf = (p: PoseTransform): string =>
  `translate3d(${p.x}px,${p.y}px,0) rotate(${p.rot}deg) scale(${p.scale})`;

const worldTf = (p: WorldTarget): string =>
  `translate3d(${p.x}%,${p.y}%,0) scale(${p.scale}) rotate(${p.rot}deg)`;

/**
 * 电影层本体。
 *
 * 只在 p4 频道渲染；`#world` / `#sw` / `#monitor` 三块直接挂进 shadow root，
 * 三屏组件也用同一个 root 做 portal，层序沿用 demo 的 z-index。
 */
export function ConfidantP4FxLayer() {
  const channel = useUiChannel();
  const reduce = !!useReducedMotion();

  // 只有黄频道才建 shadow root。其它主题在加载时不必解析这份 600+ 行的
  // 电影层 CSS；黄频道切换时同步建好，仍保证舞台组件同一次提交就能拿到 root
  // （否则开场转场会被直接 apply，牌会留在 0,0）。
  const root = useMemo(() => channel === 'p4' ? ensureP4CinemaRoot() : null, [channel]);
  const [art, setArt] = useState<string | null>(monitorArtUrl);
  const [req, setReq] = useState<PoseRequest & { n: number }>({
    pose: currentPose,
    instant: poseInstant,
    n: 0,
  });

  const worldRef = useRef<HTMLDivElement>(null);
  const arcsRef = useRef<HTMLDivElement>(null);
  const swRef = useRef<HTMLDivElement>(null);
  const linesRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const filmRef = useRef<HTMLDivElement>(null);
  const staticRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLElement>(null);
  const shockRef = useRef<HTMLDivElement>(null);
  const monitorRef = useRef<HTMLDivElement>(null);
  const mon3dRef = useRef<HTMLDivElement>(null);
  const noiseRef = useRef<HTMLSpanElement>(null);

  const monitorStateRef = useRef<PoseTarget | null>(null);
  const worldStateRef = useRef<WorldTarget | null>(null);
  const poseSeqRef = useRef(0);
  const bgSpinRef = useRef(0);
  const busyRef = useRef(false);
  const relayTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const fn = (url: string | null) => setArt(url);
    artSubs.add(fn);
    return () => {
      artSubs.delete(fn);
    };
  }, []);

  useEffect(() => {
    const fn = (next: PoseRequest) => setReq({ ...next, n: Date.now() });
    poseSubs.add(fn);
    return () => {
      poseSubs.delete(fn);
    };
  }, []);

  const poseTargets = useCallback((name: P4Pose): PoseTarget => {
    const monitor = monitorRef.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cw = monitor?.offsetWidth || 220;
    const ch = monitor?.offsetHeight || 352;
    const mob = vw <= 860;
    let p: PoseTarget;

    if (name === 'app') {
      p = mob
        ? { x: Math.round(vw - cw * 0.26), y: Math.round(vh * 0.64 - ch * 0.5), rot: -14, scale: 0.78, flip: true }
        : { x: Math.round(vw - cw * 0.46), y: Math.round(vh * 0.58 - ch * 0.5), rot: -12, scale: 0.86, flip: true };
    } else if (name === 'stage') {
      const slot = shadowRootEl?.querySelector('[data-p4-card-slot="stage"]') as HTMLElement | null;
      const r = slot?.getBoundingClientRect();
      p = r
        ? { x: Math.round(r.left), y: Math.round(r.top), rot: -2.5, scale: 1, flip: false }
        : { x: Math.round(vw * 0.5 - cw * 0.5), y: Math.round(vh * 0.28), rot: -2.5, scale: 1, flip: false };
    } else if (name === 'page2') {
      const sheetW = Math.min(980, vw - 28);
      const sheetLeft = (vw - sheetW) / 2;
      p = mob
        ? { x: Math.round(vw - cw * 0.56 - 16), y: Math.round(vh - ch * 0.56 - 14), rot: 6, scale: 0.56, flip: false }
        : { x: Math.round(Math.max(-cw * 0.62, sheetLeft - cw * 0.8)), y: Math.round(vh * 0.15), rot: 6, scale: 0.84, flip: false };
    } else if (mob) {
      p = { x: 16, y: Math.round(vh - ch * 0.8 - 16), rot: 8, scale: 0.8, flip: true };
    } else if (vw < 1200) {
      p = { x: Math.round(vw - cw * 0.5), y: Math.round(vh * 0.5 - ch * 0.5), rot: -9, scale: 0.8, flip: true };
    } else {
      p = { x: Math.round(vw - cw - 24), y: Math.round(vh * 0.48 - ch * 0.5), rot: -8, scale: 0.82, flip: true };
    }

    // demo 的 monitorTargets：把 scale 造成的视觉偏移补回左上角
    p.x = Math.round(p.x + cw * (p.scale - 1) / 2);
    p.y = Math.round(p.y + ch * (p.scale - 1) / 2);
    return p;
  }, []);

  const monitorPoseTo = useCallback(
    (name: P4Pose, opts: {
      instant?: boolean;
      target?: PoseTarget;
      duration?: number;
      dir?: 1 | -1;
      arc?: number;
      lift?: number;
      punch?: number;
    } = {}) => {
      const monitor = monitorRef.current;
      const mon3d = mon3dRef.current;
      if (!monitor || !mon3d) return;

      const to = opts.target ?? poseTargets(name);
      const from = monitorStateRef.current ?? to;
      const my = ++poseSeqRef.current;

      if (opts.instant || reduce) {
        resetAnim(monitor);
        resetAnim(mon3d);
        monitor.style.transform = monTf(to);
        mon3d.style.transform = `rotateY(${to.flip ? 180 : 0}deg)`;
        monitorStateRef.current = to;
        return;
      }

      const dur = opts.duration ?? 900;
      const dir = opts.dir ?? (to.x >= from.x ? 1 : -1);
      const arc = (opts.arc ?? 86) * dir;
      const lift = opts.lift ?? 120;
      const mid = {
        x: (from.x + to.x) / 2 + arc,
        y: Math.min(from.y, to.y) - lift,
        rot: from.rot + (to.rot - from.rot) * 0.6 + dir * 12,
        scale: Math.max(from.scale, to.scale) * (opts.punch ?? 1.18),
      };
      const over = {
        x: to.x + dir * 12,
        y: to.y + 16,
        rot: to.rot + dir * 1.4,
        scale: to.scale * 1.05,
      };
      const shake = {
        x: to.x - dir * 3,
        y: to.y - 3,
        rot: to.rot - dir * 0.5,
        scale: to.scale * 0.995,
      };

      resetAnim(monitor);
      resetAnim(mon3d);
      const a = A(monitor, [
        { transform: monTf(from), offset: 0 },
        { transform: monTf({ x: from.x - arc * 0.22, y: from.y + 7, rot: from.rot - dir * 5, scale: from.scale * 1.02 }), offset: 0.13 },
        { transform: monTf(mid), offset: 0.56 },
        { transform: monTf(over), offset: 0.82 },
        { transform: monTf(shake), offset: 0.9 },
        { transform: monTf(to), offset: 1 },
      ], { duration: dur, easing: 'cubic-bezier(.2,.9,.16,1)' });

      const f0 = from.flip ? 180 : 0;
      const f1 = to.flip ? 180 : 0;
      const flipKf: Keyframe[] = f0 === f1
        ? [{ transform: `rotateY(${f0}deg)` }, { transform: `rotateY(${f1}deg)` }]
        : f0 === 180
          ? [{ transform: 'rotateY(180deg)' }, { transform: 'rotateY(196deg)', offset: 0.2 }, { transform: 'rotateY(-9deg)', offset: 0.78 }, { transform: 'rotateY(0deg)' }]
          : [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(-8deg)', offset: 0.2 }, { transform: 'rotateY(188deg)', offset: 0.8 }, { transform: 'rotateY(180deg)' }];
      const b = A(mon3d, flipKf, { duration: dur * 0.94, easing: 'cubic-bezier(.3,.9,.2,1)' });

      if (noiseRef.current) {
        A(noiseRef.current, [
          { opacity: 0 },
          { opacity: 0.55, offset: 0.16 },
          { opacity: 0.18, offset: 0.5 },
          { opacity: 0.62, offset: 0.8 },
          { opacity: 0 },
        ], { duration: dur, easing: 'linear' });
      }

      Promise.all([a?.finished, b?.finished]).then(() => {
        if (my !== poseSeqRef.current) return;
        monitor.style.transform = monTf(to);
        a?.cancel();
        mon3d.style.transform = `rotateY(${f1}deg)`;
        b?.cancel();
        monitorStateRef.current = to;
      }).catch(() => {});
    },
    [poseTargets, reduce],
  );

  const relayWorld = useCallback(
    (name: P4Pose, dir: 1 | -1, fromMon: PoseTarget, toMon: PoseTarget) => {
      const world = worldRef.current;
      if (!world) return;
      const compact = compactFx();
      const to = WORLD[name] ?? WORLD.app;
      const from = worldStateRef.current ?? to;
      const flight = {
        // 手机端收小推拉幅度：整屏背景的缩放仍是每帧栅格化，1.28 的放大在高分屏上很贵。
        scale: compact ? 1.12 : 1.28,
        x: from.x - dir * 9,
        y: from.y + (toMon.y < fromMon.y ? -4 : 4),
        rot: -dir * 2.6,
      };
      const over = { scale: to.scale * 1.018, x: to.x + dir * 0.8, y: to.y, rot: dir * 0.35 };
      const shake = { scale: to.scale, x: to.x - dir * 0.35, y: to.y + 0.4, rot: -dir * 0.12 };

      resetAnim(world);
      const a = A(world, [
        { transform: worldTf(from), offset: 0 },
        { transform: worldTf({ scale: from.scale * 1.02, x: from.x + dir * 1.5, y: from.y, rot: dir * 0.35 }), offset: 0.14 },
        { transform: worldTf(flight), offset: 0.56 },
        { transform: worldTf(over), offset: 0.82 },
        { transform: worldTf(shake), offset: 0.9 },
        { transform: worldTf(to), offset: 1 },
      ], { duration: 980, easing: 'cubic-bezier(.18,.86,.2,1)' });
      a?.finished.then(() => {
        world.style.transform = worldTf(to);
        a.cancel();
        worldStateRef.current = to;
      }).catch(() => {});

      const sun = world.querySelector('.sunrays');
      if (sun && !compact) {
        const prev = bgSpinRef.current;
        bgSpinRef.current += dir * 72;
        resetAnim(sun);
        const b = A(sun, [
          { transform: `rotate(${prev}deg)` },
          { transform: `rotate(${bgSpinRef.current}deg)` },
        ], { duration: 980, easing: 'cubic-bezier(.2,.8,.2,1)' });
        b?.finished.then(() => {
          (sun as HTMLElement).style.transform = `rotate(${bgSpinRef.current}deg)`;
          b.cancel();
        }).catch(() => {});
      }

      const arcs = arcsRef.current;
      if (arcs && !compact) {
        resetAnim(arcs);
        A(arcs, [
          { transform: 'scale(1) rotate(0deg)' },
          { transform: `scale(1.18) rotate(${dir * 12}deg)`, offset: 0.5 },
          { transform: 'scale(1) rotate(0deg)' },
        ], { duration: 980, easing: 'ease-out' });
      }
    },
    [],
  );

  const visiblePage = useCallback((): Element | null => {
    const r = shadowRootEl;
    if (!r) return null;
    const p3 = r.querySelector('.page3.on');
    if (p3) return p3;
    const p2 = r.querySelector('.page2.on');
    if (p2) return p2;
    const stage = r.querySelector('.stage') as HTMLElement | null;
    if (stage && stage.style.display !== 'none' && getComputedStyle(stage).visibility !== 'hidden') return stage;
    return null;
  }, []);

  const crtOut = useCallback((el: Element | null, c: P4Origin | null) => {
    if (!el || !canAnimate(el) || reduce) return;
    const p = c ?? centerOf(el);
    if (compactFx()) {
      // 手机端不用 clip-path + brightness/saturate：这两项都会让旧页每帧重新栅格化。
      A(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: 'cubic-bezier(.65,0,.2,1)' });
      return;
    }
    A(el, [
      { clipPath: `circle(150% at ${p.x}px ${p.y}px)`, filter: 'brightness(1) saturate(1)' },
      { clipPath: `circle(0px at ${p.x}px ${p.y}px)`, filter: 'brightness(1.6) saturate(1.25)' },
    ], { duration: 320, easing: 'cubic-bezier(.82,0,.18,1)' });
  }, [reduce]);

  const resetTransition = useCallback(() => {
    const r = shadowRootEl;
    if (!r) return;
    r.querySelectorAll('.sw-static,.sw-film,.sw-chbig,.sw-flash,.sw-lines,.sw-word,.sw-shock,.mon-noise')
      .forEach(resetAnim);
  }, []);

  const p4Relay = useCallback((
    word: string,
    apply: () => void,
    target: P4Pose,
    opts: P4RelayOpts = {},
  ): Promise<boolean> => {
    if (busyRef.current) {
      apply();
      return Promise.resolve(false);
    }
    if (reduce) {
      relayBusy = false;
      apply();
      monitorPoseTo(target, { instant: true });
      return Promise.resolve(true);
    }

    const sw = swRef.current;
    const monitor = monitorRef.current;
    if (!sw || !monitor) {
      relayBusy = false;
      apply();
      return Promise.resolve(false);
    }

    busyRef.current = true;
    relayBusy = true;
    const old = visiblePage();
    const fromMon = monitorStateRef.current ?? poseTargets('app');
    const toMon = poseTargets(target);
    const dir = opts.dir ?? (toMon.x >= fromMon.x ? 1 : -1);
    const c0 = centerOf(monitor);
    const c1 = {
      x: toMon.x + (monitor.offsetWidth || 220) / 2,
      y: toMon.y + (monitor.offsetHeight || 352) / 2,
    };
    lastRelayOrigin = { x: c1.x, y: c1.y };

    sw.style.display = 'block';
    sw.classList.add('on');
    resetTransition();
    if (wordRef.current) wordRef.current.textContent = word || 'ON AIR';
    if (linesRef.current && !compactFx()) {
      linesRef.current.style.setProperty('--cx', `${Math.round(c0.x)}px`);
      linesRef.current.style.setProperty('--cy', `${Math.round(c0.y)}px`);
    }

    crtOut(old, c0);
    relayWorld(target, dir, fromMon, toMon);
    monitorPoseTo(target, {
      target: toMon,
      duration: opts.duration ?? 940,
      dir,
      arc: opts.arc ?? 110,
      lift: opts.lift ?? 130,
      punch: 1.2,
    });

    if (linesRef.current) {
      A(linesRef.current, [
        { opacity: 0, transform: 'scale(.55) rotate(0deg)' },
        { opacity: 0.7, transform: `scale(1.04) rotate(${dir * 14}deg)`, offset: 0.42 },
        { opacity: 0.34, transform: `scale(1.34) rotate(${dir * 28}deg)`, offset: 0.8 },
        { opacity: 0, transform: `scale(1.52) rotate(${dir * 40}deg)` },
      ], { duration: 1000, easing: 'ease-out' });
    }
    if (wordRef.current) {
      A(wordRef.current, [
        { opacity: 0, transform: `translate(-125%,-50%) rotate(${-dir * 11}deg) scale(.86)` },
        { opacity: 1, transform: `translate(-50%,-50%) rotate(${-dir * 5}deg) scale(1)`, offset: 0.38 },
        { opacity: 1, transform: `translate(-50%,-50%) rotate(${-dir * 4}deg) scale(1.025)`, offset: 0.72 },
        { opacity: 0, transform: `translate(${dir * 38}%,-50%) rotate(${-dir * 2}deg) scale(1.06)` },
      ], { duration: 1080, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
    if (filmRef.current) {
      A(filmRef.current, [
        { opacity: 0, transform: 'translateY(80px)' },
        { opacity: 1, transform: 'translateY(0)', offset: 0.3 },
        { opacity: 1, transform: 'translateY(0)', offset: 0.72 },
        { opacity: 0, transform: 'translateY(80px)' },
      ], { duration: 1000, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
    if (staticRef.current) {
      A(staticRef.current, [
        { opacity: 0 },
        { opacity: 0.18, offset: 0.25 },
        { opacity: 0.08, offset: 0.7 },
        { opacity: 0 },
      ], { duration: 1000, easing: 'linear' });
    }

    return new Promise<boolean>(res => {
      window.setTimeout(() => {
        apply();
        if (flashRef.current) {
          A(flashRef.current, [
            { opacity: 0 },
            { opacity: 0.5, offset: 0.16 },
            { opacity: 0 },
          ], { duration: 300, easing: 'ease-out' });
        }
        if (shockRef.current) {
          shockRef.current.style.left = `${Math.round(c1.x)}px`;
          shockRef.current.style.top = `${Math.round(c1.y)}px`;
          A(shockRef.current, [
            { opacity: 0, transform: 'translate(-50%,-50%) scale(.12)' },
            { opacity: 0.9, transform: 'translate(-50%,-50%) scale(1)', offset: 0.3 },
            { opacity: 0, transform: 'translate(-50%,-50%) scale(1.9)' },
          ], { duration: 560, delay: 180, easing: 'cubic-bezier(.2,.8,.2,1)' });
        }
      }, 400);

      if (relayTimerRef.current) window.clearTimeout(relayTimerRef.current);
      relayTimerRef.current = window.setTimeout(() => {
        sw.classList.remove('on');
        sw.style.display = 'none';
        busyRef.current = false;
        relayBusy = false;
        res(true);
      }, 1040);
    });
  }, [crtOut, monitorPoseTo, poseTargets, reduce, relayWorld, resetTransition, visiblePage]);

  useEffect(() => {
    if (relayBusy) return;
    monitorPoseTo(req.pose, { instant: req.instant });
  }, [req, monitorPoseTo]);

  useEffect(() => {
    const world = worldRef.current;
    if (!world) return;
    world.style.transform = worldTf(WORLD.app);
    worldStateRef.current = WORLD.app;
  }, [root]);

  useEffect(() => {
    relayHandler = p4Relay;
    poseNowHandler = (pose: P4Pose) => monitorPoseTo(pose, { instant: true });
    return () => {
      if (relayHandler === p4Relay) relayHandler = null;
      poseNowHandler = null;
      relayBusy = false;
      busyRef.current = false;
      if (relayTimerRef.current) {
        window.clearTimeout(relayTimerRef.current);
        relayTimerRef.current = null;
      }
    };
  }, [p4Relay]);

  if (channel !== 'p4' || !root) return null;

  return createPortal(
    <>
      <div id="world" ref={worldRef} aria-hidden="true">
        <div className="sunrays" />
        <div className="arcs" ref={arcsRef}>
          <svg viewBox="0 0 200 200">
            {([
              [78, 6, 'rgba(249,161,27,.95)'],
              [63, 4, 'rgba(255,246,208,.9)'],
              [49, 3, 'rgba(249,161,27,.55)'],
              [35, 2, 'rgba(19,19,19,.18)'],
            ] as Array<[number, number, string]>).map(([r, w, color]) => (
              <circle
                key={String(r)}
                cx="100"
                cy="100"
                r={r}
                fill="none"
                stroke={color}
                strokeWidth={w}
              />
            ))}
          </svg>
        </div>
        <div className="stage-sky">
          <i className="cloud c1" /><i className="cloud c2" /><i className="cloud c3" />
          <svg className="sky-flower" viewBox="-12 -12 24 24"><path d={FLOWER} /></svg>
        </div>
        <div className="halftone" />
        <div className="scanlines" />
        <svg className="bloom f1" viewBox="-12 -12 24 24"><path d={FLOWER} /></svg>
        <svg className="bloom f2" viewBox="-12 -12 24 24"><path d={FLOWER} /></svg>
      </div>

      <div id="sw" ref={swRef} aria-hidden="true">
        <div className="sw-static" ref={staticRef} />
        <div className="sw-lines" ref={linesRef} />
        <div className="sw-word" ref={wordRef}>ON AIR</div>
        <div className="sw-film" ref={filmRef} />
        <div className="sw-shock" ref={shockRef} />
        <div className="sw-chbig"><span>CH</span><b>05</b></div>
        <i className="sw-flash" ref={flashRef} />
      </div>

      <div id="monitor" ref={monitorRef} aria-hidden="true">
        <div className="mon-bob">
          <div className="mon-3d" ref={mon3dRef}>
            <div className="mon-front">
              <span className="mon-tally" />
              <div className="mon-screen">
                <img src={art ?? '/tarot/p4/sun.webp'} alt="" />
                <span className="mon-glare" />
                <span className="mon-scan" />
                <span className="mon-noise" ref={noiseRef} />
              </div>
              <div className="mon-bezel"><span>MASKARIA · CH.04</span><b>REC</b><i /></div>
            </div>
            <div className="mon-back">
              <span className="mon-tag">STANDBY</span>
              <svg className="mon-star" viewBox="-12 -12 24 24"><path d={FLOWER} /></svg>
              <span className="mon-dial" />
              <span className="mon-num">EP.05</span>
            </div>
          </div>
        </div>
      </div>
    </>,
    root,
  );
}
