/**
 * SplashScreen.p3r —— 开屏「深夜月光录 · Memento Mori」（真实 src/components/SplashScreen.tsx#P3Splash）分镜 / 时序 1:1，蓝白夜色重配。
 * 三段（时间均 × s：开屏速率 快 .55 / 正常 1 / 慢 1.65；安全模式 reduced → s = min(s, .35) 几乎直跳）：
 *   ① 0–380ms   影时间：病绿横带世界 + 星子呼吸 + 罗马数字钟（分针停在 -42°）；镜头层 campunch 缓慢抬升
 *   ② 380ms    敲钟：分针 .16s 敲正 → 钟体 steps 硬隐、6 块楔形碎块飞散 + 12 枚飞屑 + 绿环闪 → VHS 色散 / 扫描线 / 追踪杂波 / 两跳泛白 →
 *              绿带逐条撕裂位移后齐灭，切进「深蓝夜」：月亮升起（.52s 起）+ 新月渐盈满月（月影盘滑离 .62s 起）+ 辉光（1.0s）+
 *              三枚 TitleTri 同形三角弹入 + 左右竖排空心 MASKARIA 缓漂 + 水面地平线 / 月光倒影柱 + 00:00 印 + 上飘光尘
 *   ③ 860ms    题字：MEMENTO MORI 上浮 → MASKARIA 白斜体 slam（底衬蓝三角）+ 双圈波纹外扩 + 题字碎屑向右加速飞散 + 水面涟漪
 *   3250ms 起收幕淡入（.45s），3700ms 幕落满 = onComplete。
 * 蓝白（P3R 正统，真实 P3Splash 即蓝主题开屏）+ 母题层：月亮套进窗框（B1）、MASKARIA 自水下浮起 + 水面倒影步进波动、PRESS ANY BUTTON 闪烁。
 * 与粉版差异：粉版计划改晨光开屏（P6），且无窗框 / 倒影 / 浮起。
 * 演示：?speed=fast|normal|slow；?state=reduced 安全模式轻开屏；?hold=1 不自动关（停在题字段）。低动效：直出题字终态 + 淡入淡出。
 */
import { useEffect, useState, type CSSProperties } from 'react';
import type { OverlayProps } from '@blue/registry/types';
import { useBoldness } from '@blue/lib/prefs';
import { StageChip } from '@blue/screens/pkg1/fxbits';

const SPEED: Record<string, number> = { fast: 0.55, normal: 1, slow: 1.65 };
const STARS = Array.from({ length: 9 }, (_, i) => ({ id: i, left: `${((i * 41 + 13) % 92) + 3}%`, top: `${((i * 29 + 7) % 52) + 4}%`, size: 1.5 + (i % 3), delay: (i % 5) * 0.6, dur: 2.2 + (i % 4) * 0.7 }));
const GREEN = [
  { id: 0, top: '0%', h: '12.5%', c1: '#031008', c2: '#051a0e', jit: 'a', jd: 0.16 },
  { id: 1, top: '12%', h: '14.5%', c1: '#051a0e', c2: '#082415', jit: 'b', jd: 0.14 },
  { id: 2, top: '26%', h: '16.5%', c1: '#082415', c2: '#0c311d', jit: 'c', jd: 0.19 },
  { id: 3, top: '42%', h: '13.5%', c1: '#0c311d', c2: '#103c25', jit: 'a', jd: 0.22 },
  { id: 4, top: '55%', h: '15.5%', c1: '#103c25', c2: '#134129', jit: 'b', jd: 0.17 },
  { id: 5, top: '70%', h: '16.5%', c1: '#134129', c2: '#0e321f', jit: 'c', jd: 0.15 },
  { id: 6, top: '86%', h: '14.5%', c1: '#0e321f', c2: '#0a2416', jit: 'a', jd: 0.2 },
];
const SHARDS = Array.from({ length: 12 }, (_, i) => {
  const ang = ((i / 12) * 360 + ((i * 53) % 34) - 17) * (Math.PI / 180);
  const dist = 130 + ((i * 47) % 110);
  return { id: i, w: 5 + ((i * 13) % 14), h: 12 + ((i * 17) % 26), dx: Math.round(Math.cos(ang) * dist), dy: Math.round(Math.sin(ang) * dist), rot: ((i * 67) % 240) - 120, delay: (i % 6) * 0.022, green: i % 3 !== 2 };
});
const PIECES = [
  { id: 0, clip: 'polygon(50% 50%, 0% 0%, 34% 6%, 55% 0%)', dx: -52, dy: -74, r: -26, d: 0 },
  { id: 1, clip: 'polygon(50% 50%, 55% 0%, 78% 9%, 100% 0%, 100% 42%)', dx: 78, dy: -58, r: 22, d: 0.03 },
  { id: 2, clip: 'polygon(50% 50%, 100% 42%, 100% 100%, 68% 100%)', dx: 92, dy: 60, r: 30, d: 0.015 },
  { id: 3, clip: 'polygon(50% 50%, 68% 100%, 44% 92%, 22% 100%)', dx: 8, dy: 96, r: -14, d: 0.045 },
  { id: 4, clip: 'polygon(50% 50%, 22% 100%, 0% 100%, 0% 58%)', dx: -84, dy: 68, r: -32, d: 0.02 },
  { id: 5, clip: 'polygon(50% 50%, 0% 58%, 0% 0%)', dx: -96, dy: -18, r: 18, d: 0.06 },
];
const TRIS = [
  { id: 0, left: '5%', top: '8%', w: 120, fill: '#4a79e6', rot: -8, delay: 0.42, op: 0.8 },
  { id: 1, left: '70%', top: '58%', w: 88, fill: '#a6edff', rot: 14, delay: 0.52, op: 0.55 },
  { id: 2, left: '14%', top: '66%', w: 74, fill: '#1e305a', rot: 24, delay: 0.62, op: 0.85 },
];
const TRI = 'M2 32 L296 6 L70 74 Z';
const DEBRIS = [
  { id: 0, left: '-4%', top: '10%', w: 21, r0: -18, dx: -18, dy: -20, r1: -96, delay: 0.16, ax: 54, fill: '#a6edff' },
  { id: 1, left: '30%', top: '-30%', w: 24, r0: -6, dx: 10, dy: -30, r1: -74, delay: 0.22, ax: 66, fill: '#c4d6ff' },
  { id: 2, left: '62%', top: '-18%', w: 17, r0: 24, dx: 16, dy: -22, r1: 118, delay: 0.25, ax: 78, fill: '#a6edff' },
  { id: 3, left: '96%', top: '6%', w: 27, r0: 8, dx: 20, dy: -8, r1: 92, delay: 0.2, ax: 88, fill: '#4a79e6' },
  { id: 4, left: '88%', top: '74%', w: 18, r0: -26, dx: 14, dy: 26, r1: -110, delay: 0.28, ax: 72, fill: '#c4d6ff' },
  { id: 5, left: '46%', top: '96%', w: 21, r0: 16, dx: 6, dy: 36, r1: 82, delay: 0.24, ax: 60, fill: '#4a79e6' },
];
const NUMERALS: { t: string; style: CSSProperties }[] = [
  { t: 'XII', style: { top: '6%', left: '50%', transform: 'translateX(-50%)' } },
  { t: 'III', style: { top: '50%', right: '7%', transform: 'translateY(-50%)' } },
  { t: 'VI', style: { bottom: '6%', left: '50%', transform: 'translateX(-50%)' } },
  { t: 'IX', style: { top: '50%', left: '7%', transform: 'translateY(-50%)' } },
];
const TICKS = Array.from({ length: 12 }, (_, i) => ({ id: i, deg: i * 30, long: i % 3 === 0 }));
const MOTES = Array.from({ length: 10 }, (_, i) => ({ id: i, left: `${((i * 37 + 11) % 88) + 6}%`, bottom: `${18 + ((i * 23) % 30)}%`, size: 2 + (i % 2), mx: ((i * 29) % 26) - 13, dur: 0.9 + (i % 4) * 0.16, delay: 0.72 + (i % 5) * 0.14, rose: i % 3 === 0, o: 0.4 + ((i * 17) % 30) / 100 }));

const ClockFace = ({ size, minute }: { size: string; minute: CSSProperties }) => (
  <div className="absolute inset-0" style={{ opacity: 0.94 }}>
    <div className="absolute inset-0 rounded-full" style={{ border: '2px solid rgba(110,240,170,0.55)' }} />
    <div className="absolute rounded-full" style={{ inset: '7%', border: '1px solid rgba(110,240,170,0.18)' }} />
    {TICKS.map((t) => (
      <div key={t.id} className="absolute left-1/2 top-1/2" style={{ width: 2, height: t.long ? '8%' : '4.5%', marginLeft: -1, background: t.long ? 'rgba(125,255,176,0.7)' : 'rgba(125,255,176,0.32)', transform: `rotate(${t.deg}deg) translateY(calc(${size} / -2 + 6px))`, transformOrigin: '50% 0' }} />
    ))}
    {NUMERALS.map((n) => (
      <div key={n.t} className="absolute select-none" style={{ ...n.style, fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 700, fontSize: n.t === 'XII' ? 'clamp(0.9rem, 3.4vw, 1.25rem)' : 'clamp(0.7rem, 2.6vw, 1rem)', letterSpacing: '0.08em', color: n.t === 'XII' ? 'rgba(168,255,204,0.85)' : 'rgba(125,255,176,0.5)', textShadow: '0 0 12px rgba(125,255,176,0.35)' }}>{n.t}</div>
    ))}
    <div className="absolute bottom-1/2 left-1/2" style={{ width: 3, height: '28%', marginLeft: -1.5, background: 'rgba(168,255,204,0.8)', transformOrigin: '50% 100%', transform: 'rotate(2deg)', borderRadius: 2 }} />
    <div className="absolute bottom-1/2 left-1/2" style={{ width: 2, height: '40%', marginLeft: -1, background: 'rgba(214,255,232,0.9)', transformOrigin: '50% 100%', borderRadius: 2, ...minute }} />
    <div className="absolute left-1/2 top-1/2 -ml-1 -mt-1 h-2 w-2 rounded-full" style={{ background: '#7dffb0' }} />
  </div>
);

export const P3SplashPink = ({ s, onComplete, hold, low }: { s: number; onComplete: () => void; hold?: boolean; low?: boolean }) => {
  const [phase, setPhase] = useState(low ? 2 : 0);
  const [gone, setGone] = useState(false);
  useEffect(() => {
    if (low) { const t = window.setTimeout(() => { if (!hold) { setGone(true); window.setTimeout(onComplete, 260); } }, 1600); return () => clearTimeout(t); }
    const t1 = setTimeout(() => setPhase(1), 380 * s);
    const t2 = setTimeout(() => setPhase(2), 860 * s);
    const t3 = hold ? 0 : window.setTimeout(onComplete, 3700 * s);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [s, low, hold]); // eslint-disable-line react-hooks/exhaustive-deps
  const moon = 'min(52vw, 36vh)';
  const clock = 'min(46vw, 34vh)';
  return (
    <div className={`fixed inset-0 overflow-hidden ${low ? 'p3s-low' : ''}`} role="img" aria-label="MASKARIA 开屏 · 深夜月光录"
      style={{ zIndex: 'var(--p3r-z-system)' as unknown as number, background: '#060a12', contain: 'strict', opacity: gone ? 0 : 1, transition: 'opacity .25s' }}>
      <style>{`
        @keyframes p3s-fadein { from { opacity: 0; } to { opacity: 1; } }
        @keyframes p3s-fadeout { from { opacity: 1; } to { opacity: 0; } }
        @keyframes p3s-twinkle { 0%, 100% { opacity: 0.10; } 50% { opacity: 0.65; } }
        @keyframes p3s-strike { to { transform: rotate(0deg); } }
        @keyframes p3s-vanish { from { opacity: 1; } to { opacity: 0; } }
        @keyframes p3s-flashring { from { transform: scale(0.16); opacity: 0.8; } to { transform: scale(2.7); opacity: 0; } }
        @keyframes p3s-campunch { 0% { transform: scale(1) translateY(0); } 17% { transform: scale(1) translateY(0); } 64% { transform: scale(1.032) translateY(-4px); } 78% { transform: scale(0.985) translateY(3px); } 90% { transform: scale(1.002) translateY(0); } 100% { transform: scale(1) translateY(0); } }
        @keyframes p3s-clockpiece { from { transform: translate(0,0) rotate(0deg) scale(1); opacity: 1; } to { transform: translate(var(--cp-x), var(--cp-y)) rotate(var(--cp-r)) scale(0.82); opacity: 0; } }
        @keyframes p3s-shard { from { transform: translate(0,0) rotate(0deg) scale(1); opacity: 0.95; } to { transform: translate(var(--sh-x), var(--sh-y)) rotate(var(--sh-r)) scale(0.4); opacity: 0; } }
        @keyframes p3s-vhsjit-a { 0% { transform: translateX(0); } 22% { transform: translateX(-3.2%); } 40% { transform: translateX(2.4%); } 62% { transform: translateX(-1.2%); } 100% { transform: translateX(0); } }
        @keyframes p3s-vhsjit-b { 0% { transform: translateX(0); } 18% { transform: translateX(4.5%); } 34% { transform: translateX(-2.6%); } 55% { transform: translateX(5.5%); } 78% { transform: translateX(-1.6%); } 100% { transform: translateX(0); } }
        @keyframes p3s-vhsjit-c { 0% { transform: translateX(0); } 26% { transform: translateX(-5.5%); } 48% { transform: translateX(3.5%); } 70% { transform: translateX(-2%); } 100% { transform: translateX(0); } }
        @keyframes p3s-chromaghost { 0% { opacity: 0; } 15% { opacity: var(--go, 0.24); } 30% { opacity: 0.06; } 45% { opacity: var(--go, 0.24); } 65% { opacity: 0.1; } 100% { opacity: 0; } }
        @keyframes p3s-scanflick { 0% { opacity: 0; } 12% { opacity: 0.5; } 30% { opacity: 0.18; } 50% { opacity: 0.44; } 75% { opacity: 0.14; } 100% { opacity: 0; } }
        @keyframes p3s-track { 0% { transform: translateY(0); opacity: 0; } 8% { opacity: 0.5; } 92% { opacity: 0.38; } 100% { transform: translateY(1400%); opacity: 0; } }
        @keyframes p3s-vhsflash { 0% { opacity: 0; } 10% { opacity: 0.30; } 22% { opacity: 0; } 40% { opacity: 0.15; } 100% { opacity: 0; } }
        @keyframes p3s-moonrise { from { transform: translateY(6vh) scale(0.96); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
        @keyframes p3s-moonwax { from { transform: translate(-5%, 0); } to { transform: translate(-118%, -8%); } }
        @keyframes p3s-shimmer { 0%, 100% { opacity: 0.32; transform: scaleX(1); } 50% { opacity: 0.62; transform: scaleX(0.88); } }
        @keyframes p3s-ripple { from { transform: translate(-50%, -50%) scale(0.14); opacity: 0.6; } to { transform: translate(-50%, -50%) scale(1); opacity: 0; } }
        @keyframes p3s-titlering { from { transform: translate(-50%, -50%) scale(0.2); opacity: 0.55; } to { transform: translate(-50%, -50%) scale(1); opacity: 0; } }
        @keyframes p3s-tridebris { 0% { transform: translate(0,0) rotate(var(--td-r0, 0deg)) scale(1); opacity: 0; } 14% { opacity: 0.9; } 100% { transform: translate(var(--td-x), var(--td-y)) rotate(var(--td-r1, 80deg)) scale(0.4); opacity: 0; } }
        @keyframes p3s-tridebris-x { from { transform: translateX(0); } to { transform: translateX(var(--td-ax, 60px)); } }
        @keyframes p3s-tripop { from { transform: rotate(var(--tri-r)) scale(0); opacity: 0; } to { transform: rotate(var(--tri-r)) scale(1); opacity: var(--tri-o); } }
        @keyframes p3s-slam { from { transform: translateX(-34px) scaleX(0.94); opacity: 0; } to { transform: translateX(0) scaleX(1); opacity: 1; } }
        @keyframes p3s-float { 0% { transform: translateY(46px); clip-path: inset(100% -10% -40% -10%); opacity: 0.4; } 60% { transform: translateY(-4px); clip-path: inset(-20% -10% -40% -10%); opacity: 1; } 100% { transform: translateY(0); clip-path: inset(-20% -10% -40% -10%); opacity: 1; } }
        @keyframes p3s-reflect { 0% { transform: scaleY(-0.62) skewX(0deg); } 50% { transform: scaleY(-0.6) skewX(-4deg) translateX(3px); } 100% { transform: scaleY(-0.62) skewX(0deg); } }
        @keyframes p3s-press { 0% { opacity: 0; } 100% { opacity: 1; } }
        @keyframes p3s-frame { from { opacity: 0; transform: scale(1.08); } to { opacity: 1; transform: scale(1); } }
        @keyframes p3s-rise { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: var(--rise-o, 1); } }
        @keyframes p3s-vdrift { 0% { transform: translateY(3.5%); opacity: 0; } 22% { opacity: 0.5; } 100% { transform: translateY(-3.5%); opacity: 0.3; } }
        @keyframes p3s-vdrift-r { 0% { transform: translateY(-3.5%); opacity: 0; } 22% { opacity: 0.5; } 100% { transform: translateY(3.5%); opacity: 0.3; } }
        @keyframes p3s-mote { 0% { transform: translate(0, 14px); opacity: 0; } 30% { opacity: var(--mo, 0.6); } 100% { transform: translate(var(--mx, 0px), -78px); opacity: 0; } }
        .p3s-low *, .p3s-low *::before { animation-duration: 0.001s !important; animation-delay: 0s !important; animation-iteration-count: 1 !important; }
      `}</style>
      <div className="absolute inset-0" style={{ animation: `p3s-campunch ${0.9 * s}s ease-in-out both` }}>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(168deg, #060a12 0%, #0d162a 38%, #18274a 68%, #091022 100%)', animation: `p3s-fadein ${0.5 * s}s ease-out both` }} />
        {GREEN.map((st) => (
          <div key={st.id} className="pointer-events-none absolute" style={{ left: '-6%', width: '112%', top: st.top, height: st.h, background: `linear-gradient(180deg, ${st.c1}, ${st.c2})`,
            animation: phase >= 1 ? `p3s-vhsjit-${st.jit} ${0.4 * s}s steps(1, end) ${st.jd * s}s both, p3s-fadeout ${0.3 * s}s ease-in ${0.34 * s}s both` : `p3s-fadein ${0.5 * s}s ease-out both` }} />
        ))}
        {STARS.map((st) => (
          <div key={st.id} className="pointer-events-none absolute rounded-full" style={{ left: st.left, top: st.top, width: st.size, height: st.size, background: '#e6f5ff', animation: `p3s-twinkle ${st.dur * s}s ease-in-out ${st.delay * s}s infinite, p3s-fadein ${0.6 * s}s ease-out both` }} />
        ))}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative" style={{ width: clock, aspectRatio: '1', animation: phase >= 1 ? `p3s-vanish ${0.2 * s}s steps(1, end) both` : `p3s-fadein ${0.55 * s}s ease-out both` }}>
            <ClockFace size={clock} minute={{ transform: 'rotate(-42deg)', animation: phase >= 1 ? `p3s-strike ${0.16 * s}s cubic-bezier(0.6, 0, 0.2, 1) both` : undefined }} />
          </div>
        </div>
        {phase >= 1 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative" style={{ width: clock, aspectRatio: '1' }}>
              {PIECES.map((p) => (
                <div key={p.id} className="absolute inset-0" style={{ clipPath: p.clip, opacity: 0, '--cp-x': `${p.dx}px`, '--cp-y': `${p.dy}px`, '--cp-r': `${p.r}deg`, animation: `p3s-clockpiece ${0.55 * s}s cubic-bezier(0.2, 0.6, 0.35, 1) ${(0.2 + p.d) * s}s forwards` } as CSSProperties}>
                  <ClockFace size={clock} minute={{ transform: 'rotate(0deg)' }} />
                </div>
              ))}
            </div>
          </div>
        )}
        {phase >= 1 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            {SHARDS.map((sh) => (
              <div key={sh.id} className="absolute" style={{ width: sh.w, height: sh.h, opacity: 0, background: sh.green ? 'linear-gradient(160deg, rgba(168,255,204,0.9), rgba(60,180,110,0.25))' : 'linear-gradient(160deg, rgba(143,177,255,0.85), rgba(166,237,255,0.25))',
                clipPath: 'polygon(18% 0, 100% 10%, 78% 100%, 0 84%)', '--sh-x': `${sh.dx}px`, '--sh-y': `${sh.dy}px`, '--sh-r': `${sh.rot}deg`, animation: `p3s-shard ${0.6 * s}s cubic-bezier(0.2, 0.7, 0.35, 1) ${(0.18 + sh.delay) * s}s forwards` } as CSSProperties} />
            ))}
          </div>
        )}
        {phase >= 1 && (
          <div className="pointer-events-none absolute left-1/2 top-1/2" style={{ width: clock, aspectRatio: '1', marginLeft: `calc(${clock} / -2)`, marginTop: `calc(${clock} / -2)`, border: '2px solid rgba(125,255,176,0.6)', borderRadius: '50%', animation: `p3s-flashring ${0.65 * s}s cubic-bezier(0.16, 0.8, 0.3, 1) ${0.12 * s}s both` }} />
        )}
        {phase >= 1 && (
          <>
            <div className="pointer-events-none absolute" style={{ left: '-6%', width: '112%', top: '20%', height: '12%', background: 'rgba(70,125,255,0.5)', transform: 'translateX(-6px)', '--go': 0.2, animation: `p3s-chromaghost ${0.36 * s}s steps(1, end) ${0.16 * s}s both` } as CSSProperties} />
            <div className="pointer-events-none absolute" style={{ left: '-6%', width: '112%', top: '56%', height: '10%', background: 'rgba(166,237,255,0.5)', transform: 'translateX(6px)', '--go': 0.24, animation: `p3s-chromaghost ${0.36 * s}s steps(1, end) ${0.21 * s}s both` } as CSSProperties} />
            <div className="pointer-events-none absolute inset-0" style={{ background: 'repeating-linear-gradient(0deg, rgba(2,4,10,0.5) 0px, rgba(2,4,10,0.5) 2px, transparent 2px, transparent 5px)', animation: `p3s-scanflick ${0.4 * s}s steps(1, end) ${0.14 * s}s both` }} />
            <div className="pointer-events-none absolute" style={{ left: 0, right: 0, top: '-9%', height: '8%', background: 'linear-gradient(180deg, transparent, rgba(238,248,255,0.55) 45%, rgba(238,248,255,0.2) 70%, transparent)', animation: `p3s-track ${0.34 * s}s steps(8, end) ${0.18 * s}s both` }} />
            <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(120deg, #d9ffe9, #f0f9ff)', animation: `p3s-vhsflash ${0.3 * s}s steps(1, end) ${0.16 * s}s both` }} />
          </>
        )}
        {phase >= 1 && (
          <div className="pointer-events-none absolute left-1/2" style={{ top: '11%', width: moon, aspectRatio: '1', marginLeft: `calc(${moon} / -2)`, animation: `p3s-moonrise ${0.6 * s}s cubic-bezier(0.3, 0.8, 0.3, 1) ${0.52 * s}s both` }}>
            <div className="absolute inset-0 rounded-full" style={{ boxShadow: '0 0 56px 16px rgba(214,226,255,0.26), 0 0 150px 54px rgba(74,121,230,0.12)', animation: `p3s-fadein ${0.3 * s}s ease-out ${1.0 * s}s both` }} />
            <div className="absolute inset-0 overflow-hidden rounded-full" style={{ background: 'radial-gradient(circle at 37% 33%, #fffaf6 0%, #f6eef1 40%, #d9e4ec 70%, #aeb8cf 100%)' }}>
              <div className="absolute inset-0 rounded-full" style={{ opacity: 0.5, background: 'radial-gradient(circle at 64% 28%, rgba(150,164,196,0.5) 0%, transparent 9%), radial-gradient(circle at 30% 62%, rgba(150,164,196,0.42) 0%, transparent 12%), radial-gradient(circle at 58% 70%, rgba(150,164,196,0.34) 0%, transparent 7%)' }} />
              <div className="absolute rounded-full" style={{ inset: '-5%', background: 'radial-gradient(circle at 40% 35%, #0d162a 0%, #070d1a 70%)', animation: `p3s-moonwax ${0.65 * s}s cubic-bezier(0.6, 0, 0.9, 0.55) ${0.62 * s}s both` }} />
            </div>
          </div>
        )}
        {/* 蓝白 B1：窗前满月 —— 月亮套进一扇几何窗框（十字棂 + 两侧斜垂窗帘缝；人物剪影走插槽 slot:splash-silhouette，demo 不放） */}
        {phase >= 1 && (
          <div aria-hidden data-slot="splash-silhouette" className="pointer-events-none absolute left-1/2" style={{ top: 'calc(11% - min(9vw, 46px))', width: `calc(${moon} + min(18vw, 92px))`, aspectRatio: '0.86', marginLeft: `calc((${moon} + min(18vw, 92px)) / -2)`, animation: `p3s-frame ${0.5 * s}s ease-out ${0.9 * s}s both` }}>
            <svg viewBox="0 0 172 200" preserveAspectRatio="none" className="h-full w-full">
              <path d="M0 0 H172 V200 H0 Z M10 10 V178 H162 V10 Z" fillRule="evenodd" fill="#050b1c" />
              <rect x="83.5" y="10" width="5" height="168" fill="#050b1c" />
              <rect x="10" y="92" width="152" height="4" fill="#050b1c" />
              <polygon points="10,10 26,10 18,178 10,178" fill="#050b1c" opacity="0.85" />
              <polygon points="162,10 148,10 154,178 162,178" fill="#050b1c" opacity="0.85" />
              <rect x="10" y="10" width="152" height="168" fill="none" stroke="rgba(53,209,232,0.45)" strokeWidth="1" />
            </svg>
          </div>
        )}
        {phase >= 1 && TRIS.map((tr) => (
          <div key={tr.id} className="pointer-events-none absolute" style={{ left: tr.left, top: tr.top, width: tr.w, height: tr.w * 0.27, '--tri-r': `${tr.rot}deg`, '--tri-o': tr.op, animation: `p3s-tripop ${0.4 * s}s cubic-bezier(0.2, 1.1, 0.35, 1) ${tr.delay * s}s both` } as CSSProperties}>
            <svg viewBox="0 0 300 80" className="h-full w-full" style={{ overflow: 'visible' }}><path d={TRI} fill={tr.fill} /></svg>
          </div>
        ))}
        {phase >= 1 && (
          <>
            <div className="pointer-events-none absolute bottom-0 left-[2%] top-0 flex select-none items-center overflow-hidden">
              <div style={{ writingMode: 'vertical-rl', fontSize: 'clamp(3.2rem, 13vw, 6.5rem)', fontWeight: 900, fontStyle: 'italic', letterSpacing: '0.1em', whiteSpace: 'nowrap', color: 'transparent', WebkitTextStroke: '1px rgba(166,237,255,0.26)', animation: `p3s-vdrift ${1.6 * s}s linear ${0.4 * s}s both` }}>MASKARIA</div>
            </div>
            <div className="pointer-events-none absolute bottom-0 right-[2%] top-0 flex select-none items-center overflow-hidden">
              <div style={{ writingMode: 'vertical-rl', fontSize: 'clamp(3.2rem, 13vw, 6.5rem)', fontWeight: 900, fontStyle: 'italic', letterSpacing: '0.1em', whiteSpace: 'nowrap', color: 'transparent', WebkitTextStroke: '1px rgba(74,121,230,0.3)', animation: `p3s-vdrift-r ${1.6 * s}s linear ${0.55 * s}s both` }}>MASKARIA</div>
            </div>
          </>
        )}
        {phase >= 1 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0" style={{ height: '23%', animation: `p3s-fadein ${0.6 * s}s ease-out ${0.42 * s}s both` }}>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(6,10,18,0) 0%, #070d1a 34%, #0d162a 100%)' }} />
            <div className="absolute inset-x-0 top-0" style={{ height: 1, background: 'linear-gradient(90deg, transparent 8%, rgba(74,121,230,0.45) 50%, transparent 92%)' }} />
            <div className="absolute bottom-0 left-1/2 top-0" style={{ width: 'calc(min(12vw, 64px) + 8px)', marginLeft: 'calc((min(12vw, 64px) + 8px) / -2)', background: 'linear-gradient(180deg, rgba(255,250,246,0.30) 0%, rgba(74,121,230,0.10) 55%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, #000 32%, #000 68%, transparent 100%)', maskImage: 'linear-gradient(90deg, transparent 0%, #000 32%, #000 68%, transparent 100%)', animation: `p3s-shimmer ${2.6 * s}s ease-in-out infinite` }} />
          </div>
        )}
        {phase >= 1 && (
          <div className="pointer-events-none absolute select-none" style={{ left: '6%', bottom: '25%', fontSize: 'clamp(0.7rem, 2.6vw, 0.9rem)', fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.18em', color: 'rgba(143,177,255,0.7)', '--rise-o': 1, animation: `p3s-rise ${0.5 * s}s ease-out ${0.55 * s}s both` } as CSSProperties}>00:00</div>
        )}
        {phase >= 1 && MOTES.map((m) => (
          <span key={m.id} className="pointer-events-none absolute rounded-full" style={{ left: m.left, bottom: m.bottom, width: m.size, height: m.size, background: m.rose ? '#c4d6ff' : '#f0f9ff', opacity: 0, '--mx': `${m.mx}px`, '--mo': m.o, animation: `p3s-mote ${m.dur * s}s linear ${m.delay * s}s forwards` } as CSSProperties} />
        ))}
        {phase >= 2 && (
          <div className="pointer-events-none absolute left-1/2" style={{ top: '84%', width: 'min(52vw, 250px)', aspectRatio: '2.7', border: '2px solid rgba(74,121,230,0.45)', borderRadius: '50%', animation: `p3s-ripple ${1.1 * s}s ease-out ${0.15 * s}s both` }} />
        )}
        {phase >= 2 && (
          <div className="pointer-events-none absolute inset-x-0 flex select-none flex-col items-center" style={{ top: '47.5%' }}>
            <div style={{ fontSize: 'clamp(0.65rem, 2.6vw, 0.85rem)', fontWeight: 800, letterSpacing: '0.55em', paddingLeft: '0.55em', color: '#8fb1ff', textShadow: '0 1px 10px rgba(6,10,18,0.85), 0 0 18px rgba(74,121,230,0.45)', '--rise-o': 0.85, animation: `p3s-rise ${0.4 * s}s ease-out both` } as CSSProperties}>MEMENTO MORI</div>
            <div className="relative mt-3" style={{ animation: `p3s-slam ${0.3 * s}s cubic-bezier(0.2, 0.9, 0.3, 1) ${0.08 * s}s both` }}>
              {[0, 1].map((r) => (
                <span key={r} className="absolute left-1/2 top-1/2 rounded-full" style={{ width: 'min(64vw, 330px)', aspectRatio: '1', border: `${r === 0 ? 2 : 1.5}px solid rgba(74,121,230,${r === 0 ? 0.5 : 0.32})`, animation: `p3s-titlering ${(0.62 + r * 0.14) * s}s cubic-bezier(0.16, 0.8, 0.3, 1) ${(0.06 + r * 0.12) * s}s both` }} />
              ))}
              <svg viewBox="0 0 300 80" aria-hidden className="absolute" style={{ left: '-7%', top: '4%', width: '111%', height: '106%', transform: 'rotate(-2deg)', overflow: 'visible' }}><path d={TRI} fill="#4a79e6" /></svg>
              {DEBRIS.map((d) => (
                <div key={d.id} className="absolute" aria-hidden style={{ left: d.left, top: d.top, width: d.w, height: d.w * 0.27, '--td-ax': `${d.ax}px`, animation: `p3s-tridebris-x ${0.45 * s}s cubic-bezier(0.5, 0, 0.8, 0.35) ${d.delay * s}s forwards` } as CSSProperties}>
                  <div className="absolute inset-0" style={{ opacity: 0, '--td-r0': `${d.r0}deg`, '--td-r1': `${d.r1}deg`, '--td-x': `${d.dx}px`, '--td-y': `${d.dy}px`, animation: `p3s-tridebris ${0.45 * s}s cubic-bezier(0.2, 0.7, 0.35, 1) ${d.delay * s}s forwards` } as CSSProperties}>
                    <svg viewBox="0 0 300 80" className="h-full w-full" style={{ overflow: 'visible' }}><path d={TRI} fill={d.fill} /></svg>
                  </div>
                </div>
              ))}
              {/* 蓝白：Logo 自水下浮起（水线 clip 由下往上揭开）+ 下方水面倒影（步进波动）—— 粉版对位是逐字贴纸弹跳 */}
              <span className="relative block font-heavy" style={{ fontSize: 'clamp(2.65rem, 11.5vw, 4.3rem)', color: '#ffffff', letterSpacing: '0.05em', lineHeight: 1.15, textShadow: '2px 3px 0 rgba(13,22,42,0.55), 0 0 26px rgba(74,121,230,0.35)', animation: `p3s-float ${0.7 * s}s cubic-bezier(0.33, 0, 0.15, 1) both` }}>MASKARIA</span>
              <span aria-hidden className="absolute left-0 right-0 top-full block font-heavy" style={{ fontSize: 'clamp(2.65rem, 11.5vw, 4.3rem)', color: '#9fdcff', letterSpacing: '0.05em', lineHeight: 1.15, transform: 'scaleY(-0.62)', transformOrigin: 'top', opacity: 0.28, WebkitMaskImage: 'linear-gradient(0deg, transparent 10%, #000 100%)', maskImage: 'linear-gradient(0deg, transparent 10%, #000 100%)', animation: `p3s-reflect ${1.2 * s}s steps(4, end) ${0.5 * s}s infinite` }}>MASKARIA</span>
            </div>
            <div className="mt-14 font-cond text-[12px] tracking-[0.42em]" style={{ color: '#cfeaf6', animation: `p3s-press ${1.6 * s}s steps(2, end) ${0.9 * s}s infinite both` }}>PRESS ANY BUTTON</div>
          </div>
        )}
      </div>
      {!low && !hold && <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(180deg, #060a12, #03050b)', animation: `p3s-fadein ${0.45 * s}s ease-in ${3.25 * s}s both` }} />}
    </div>
  );
};

export default function SplashOverlay({ open, onClose, params }: OverlayProps) {
  const anim = useBoldness();
  const reduced = params?.get('state') === 'reduced';
  const base = SPEED[params?.get('speed') ?? 'normal'] ?? 1;
  const s = reduced ? Math.min(base, 0.35) : base;
  if (!open) return null;
  return (
    <>
      <P3SplashPink s={s} onComplete={onClose} hold={params?.get('hold') === '1'} low={!anim} />
      {reduced && <StageChip text="SAFE MODE · ×0.35" />}
    </>
  );
}
