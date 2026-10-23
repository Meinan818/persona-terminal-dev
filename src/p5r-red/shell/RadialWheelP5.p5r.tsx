/**
 * 长按轮盘 RadialWheelP5（七碑牌）—— 迁移自 overlays/a.js「10 · 长按轮盘」（DOM / 类名逐字一致，样式 legacy/css/a.css .oa-wheel*）。
 * 真实文件：src/components/RadialWheelP5.tsx · RadialQuickNav.tsx。
 *   hold=true（底栏助手键长按）：滑向碑牌高亮，松开跳转；滑回中心死区 / 向下 = 取消
 *   hold=false（点选模式，#/overlay/RadialWheelP5 预览）：移动指针高亮、点击选择
 *   低动效：改为 WheelD0Menu 纵向列表（.oa-wheel-list，真实 RadialQuickNav D0 分支）
 * 跳转走星形反撕（navigate(id, { via: 'tear' })）。
 * 外壳通过 shellBus.openWheel(origin, hold) 打开；也可直接 <RadialWheelP5 open origin hold onClose onNavigate/>。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Portal } from '@/p5r-red/kit/Portal';
import { isLowMotion } from '@/p5r-red/lib/prefs';
import { sfx } from '@/p5r-red/fx/sfx';
import { closeWheel, navigate, useShellState } from './shellBus';
import { WheelD0Menu } from './WheelD0Menu';

/** 七瓣定稿（真实 RadialQuickNav.tsx WHEEL_ITEMS）：塔罗 / 记录 / 任务 / 羁绊 / 记账 / 成就 / 设置；'todos'/'activities' 由 shellBus 归一到 actions?tab= */
export const WHEEL: [string, string, string][] = [['astrology', '塔罗', 'TAROT'], ['activities', '记录', 'RECORD'], ['todos', '任务', 'TASKS'], ['cooperation', '羁绊', 'BOND'], ['ledger', '记账', 'ACCOUNT'], ['achievements', '成就', 'ACHIEVE'], ['settings', '设置', 'SETTING']];
const STELE = ['polygon(11% 0%, 93% 3%, 100% 96%, 4% 100%)', 'polygon(3% 3%, 100% 0%, 94% 100%, 0% 93%)', 'polygon(7% 1%, 99% 5%, 93% 97%, 0% 100%)', 'polygon(1% 4%, 95% 0%, 100% 99%, 8% 95%)', 'polygon(13% 2%, 100% 1%, 95% 100%, 2% 96%)'];
const RCLIP = ['polygon(6% 8%, 96% 0%, 100% 90%, 0% 100%)', 'polygon(0% 4%, 100% 10%, 92% 100%, 4% 92%)', 'polygon(8% 0%, 100% 6%, 96% 94%, 0% 98%)'];
const jr = (s: number) => { const x = Math.sin(s * 91.7 + 47.3) * 43758.5453; return x - Math.floor(x); };
function starD(cx: number, cy: number, Rr: number) { const r = Rr * 0.42; let d = ''; for (let i = 0; i < 10; i++) { const rr = i % 2 === 0 ? Rr : r, a = (Math.PI / 5) * i - Math.PI / 2; d += `${i ? 'L' : 'M'}${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`; } return d + 'Z'; }
function ConcStar({ size, invert }: { size: number; invert: boolean }) {
  const c = size / 2, L5 = 5;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }} aria-hidden="true">
      <path d={starD(c, c, c)} fill="none" stroke="#f4f1e8" strokeWidth={Math.max(3, size * 0.07)} strokeLinejoin="miter" strokeMiterlimit={12} />
      {Array.from({ length: L5 }, (_, k) => { const R0 = c * (1 - k * (0.82 / L5)), w = invert ? k % 2 === 1 : k % 2 === 0; return <path key={k} d={starD(c, c, R0)} fill="none" stroke={w ? '#f4f1e8' : '#0d0d0d'} strokeWidth={Math.max(2, size * 0.045)} strokeLinejoin="miter" strokeMiterlimit={12} />; })}
      <path d={starD(c, c, Math.max(3, c * 0.18 * 0.9))} fill={invert ? '#0d0d0d' : '#f4f1e8'} />
    </svg>
  );
}
const FIELD = [[-150, -196, 120, -14, 0, 0.85], [-22, -252, 158, 9, 1, 0.9], [118, -204, 104, 22, 0, 0.8], [-176, -84, 66, 30, 1, 0.6], [168, -96, 72, -18, 0, 0.6], [62, -128, 46, 40, 0, 0.5], [-84, -136, 40, -32, 1, 0.5]];
const SHARDS = [[-158, 52, 15, 24], [-132, 62, 11, -40], [-108, 50, 18, 70], [-84, 64, 12, -15], [-62, 54, 16, 48], [-38, 60, 10, -70], [-20, 50, 14, 12]];

/* 全局指针状态（点选模式判断「是否正按住」，同原生 ptrDown） */
let ptrDown = false;
if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', () => { ptrDown = true; }, true);
  document.addEventListener('pointerup', () => { ptrDown = false; }, true);
  document.addEventListener('pointercancel', () => { ptrDown = false; }, true);
}

export interface RadialWheelP5Props { open: boolean; origin: { x: number; y: number } | null; hold?: boolean; onClose: () => void; onNavigate?: (id: string) => void; /** 强制低动效 D0 列表（预览 ?state=reduced） */ reduced?: boolean }

export function RadialWheelP5({ open, origin, hold, onClose, onNavigate, reduced }: RadialWheelP5Props) {
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const R = reduced || isLowMotion();
  const g = useMemo(() => {
    const ox = origin?.x ?? innerWidth / 2, oy = origin?.y ?? innerHeight - 46;
    const K = Math.min(0.68, Math.max(0.5, innerWidth / 780));
    const radius = Math.min(104, innerWidth / 2 - 40), DEAD = 40, SEG = 180 / WHEEL.length;
    return { ox, oy, K, radius, DEAD, SEG };
  }, [origin, open]); // eslint-disable-line react-hooks/exhaustive-deps
  const holdMode = hold ?? ptrDown;
  const nav = onNavigate ?? ((id: string) => navigate(id, { via: 'tear' }));

  useEffect(() => { if (open) { setMounted(true); setActive(null); sfx('switch', 0.45); } }, [open]);
  useEffect(() => {
    if (!mounted || !open) return;
    const el = ref.current!;
    if (!R) el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, fill: 'backwards' });
    const { ox, oy, DEAD, SEG } = g;
    const pick = (cx: number, cy: number) => { const dx = cx - ox, dy = cy - oy; if (Math.hypot(dx, dy) < DEAD || dy > 0) return null; const a = Math.atan2(dy, dx) * 180 / Math.PI; return Math.max(0, Math.min(WHEEL.length - 1, Math.floor((a + 180) / SEG))); };
    let cur: number | null = null;
    const setA = (n: number | null) => { if (n === cur) return; cur = n; setActive(n); if (n !== null && navigator.vibrate) try { navigator.vibrate(8); } catch { /* */ } };
    const done = (idx: number | null) => { onClose(); if (idx !== null) nav(WHEEL[idx][0]); };
    const onMove = (e: PointerEvent) => setA(pick(e.clientX, e.clientY));
    const onUp = (e: PointerEvent) => { if (holdMode) done(pick(e.clientX, e.clientY)); };
    const onCancel = () => onClose();
    const onTap = (e: MouseEvent) => { if (holdMode) return; if (R) { const b = (e.target as Element).closest<HTMLElement>('[data-id]'); onClose(); if (b) nav(b.dataset.id!); return; } done(pick(e.clientX, e.clientY)); };
    addEventListener('pointermove', onMove); addEventListener('pointerup', onUp); addEventListener('pointercancel', onCancel);
    const tt = window.setTimeout(() => el.addEventListener('click', onTap), holdMode ? 0 : 60);
    return () => { clearTimeout(tt); removeEventListener('pointermove', onMove); removeEventListener('pointerup', onUp); removeEventListener('pointercancel', onCancel); el.removeEventListener('click', onTap); };
  }, [mounted, open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (open || !mounted) return;
    const el = ref.current; if (!el || R) { setMounted(false); return; }
    el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'both' }).onfinish = () => setMounted(false);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && open) onClose(); }; addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, [open, onClose]);

  if (!mounted) return null;
  const { ox, oy, K, radius, DEAD } = g;
  return (
    <Portal>
      <div ref={ref} className="oa-layer oa-wheel" style={{ zIndex: 860 }} aria-label="快捷跳转轮盘">
        {R ? (
          <WheelD0Menu items={WHEEL} left={ox} bottom={innerHeight - oy + 40} />
        ) : (
          <>
            <div className="oa-wheel-burst">{[0, 1, 2, 3, 4].map((i) => (
              <svg key={i} width="160" height="160" viewBox="0 0 160 160" style={{ left: ox - 80, top: oy - 80, ['--to' as string]: (5.2 + i * 1.1) * K, ['--d' as string]: `${i * 0.13}s` }}>
                <path d={starD(80, 80, 74)} fill="none" stroke={i % 2 ? 'var(--red)' : '#f4f1e8'} strokeWidth={i % 2 ? 4.5 : 3} strokeLinejoin="miter" strokeMiterlimit={12} />
              </svg>))}
            </div>
            <div className="oa-wheel-field">{FIELD.map(([dx, dy, s, r, inv, op], k) => (
              <div key={k} style={{ left: ox + dx * K - s * K / 2, top: oy + dy * K - s * K / 2, ['--r' as string]: `${r}deg`, ['--op' as string]: op, ['--d' as string]: `${0.14 + k * 0.022}s` }}><ConcStar size={s * K} invert={!!inv} /></div>))}
            </div>
            {WHEEL.map(([id, label, en], i) => {
              const armDeg = -180 + ((i + 0.5) * 180) / WHEEL.length, arm = armDeg * Math.PI / 180, Rr = radius * K;
              const x = ox + Rr * Math.cos(arm), y = oy + Rr * 0.8 * Math.sin(arm) + 8;
              const tilt = (armDeg + 90) * 0.55 + (jr(i * 3.1) - 0.5) * 5, H = (118 + 46 * Math.sin(Math.PI * (i + 0.5) / WHEEL.length) + (jr(i * 5.7) - 0.5) * 14) * K, W = Math.round((56 + (jr(i * 7.9) - 0.5) * 8) * K), clip = STELE[i % 5];
              return (
                <div key={id} className={`oa-st${active === i ? ' on' : ''}${active !== null && active !== i ? ' dim' : ''}`} role="menuitem" aria-label={label} data-i={i}
                  style={{ left: x, top: y, ['--w' as string]: `${W}px`, ['--h' as string]: `${H}px`, ['--tilt' as string]: `${tilt}deg`, ['--dx' as string]: `${ox - x}px`, ['--dy' as string]: `${oy - y}px`, ['--d' as string]: `${0.03 * i}s`, zIndex: 30 + i }}>
                  <div className="oa-st-in" style={{ width: W, height: H }}>
                    <i className="sd" style={{ clipPath: clip }} /><i className="rim" style={{ clipPath: clip }} /><i className="face" style={{ clipPath: clip }} />
                    <i className="hl"><svg viewBox="0 0 100 40" preserveAspectRatio="none"><polygon className="hr" points="2,6 98,0 94,38 0,34" fill="#ff0022" /><polygon className="hc" points="4,4 99,3 92,36 3,39" fill="#1cfeff" style={{ mixBlendMode: 'screen', opacity: 0.85 }} /><polygon points="3,5 97,2 93,36 2,35" fill="#F2E9DA" /></svg></i>
                    <div className="txt" style={{ clipPath: clip }}>
                      <div className="cn">{[...label].map((c, j) => jr(i * 13.7 + j * 31.9) < 0.36
                        ? <span key={j} className="rz" style={{ transform: `rotate(${((jr(i * 17.3 + j * 7.1) - 0.5) * 14).toFixed(1)}deg)`, clipPath: RCLIP[(i + j) % 3] }}>{c}</span>
                        : <span key={j}>{c}</span>)}</div>
                      <span className="en">{en}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="oa-wheel-shards">{SHARDS.map(([a, d, s, r], k) => { const t = a * Math.PI / 180; return <i key={k} style={{ left: ox + d * K * Math.cos(t) - s * K / 2, top: oy + d * K * 0.8 * Math.sin(t) - s * K / 2, width: s * K, height: s * K, ['--r' as string]: `${r}deg`, ['--d' as string]: `${0.1 + k * 0.03}s` }} />; })}</div>
            <div className="oa-wheel-hint" style={{ left: ox, top: Math.max(12, oy - radius - 228) }}>松开前往 · 滑回中心取消</div>
            <i className="oa-wheel-dead" style={{ left: ox - DEAD, top: oy - DEAD, width: DEAD * 2, height: DEAD * 2 }} />
          </>
        )}
      </div>
    </Portal>
  );
}

/** 外壳挂载点：读 shellBus.wheel */
export function ShellRadialWheel() {
  const { wheel } = useShellState();
  return <RadialWheelP5 open={wheel.open} origin={wheel.origin} hold={wheel.hold} onClose={closeWheel} />;
}
