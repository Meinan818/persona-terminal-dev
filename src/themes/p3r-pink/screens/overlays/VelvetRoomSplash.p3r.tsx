/**
 * VelvetRoomSplash.p3r —— 开屏「MASKARIA 默认 · 天鹅绒房间」（真实 src/components/splash/VelvetRoomSplash.tsx）分镜 / 时序 1:1，粉白夜色重配。
 *   ⓪ preroll 250ms：黑底横向擦出白色长条 → 转藕紫 → 纵向撑开交棒
 *   ①–④ travel 2600ms×s：两壁白门板朝内 rotateY 迎面掠过（10 扇，等距排队）· 镜头 dolly 推进 + 旋转（-8° → 3.5°）·
 *        中央门从极远处（Z -4200）推到贴脸 · 门扇 52% 起转开门 · 门缝白光与门扇逐帧对齐张大 · 中段四角星闪烁
 *   ⑤ flood 520ms×s：白光充满画面（.3s）
 *   ⑥ title 1800ms×s：白光退去 → 上下两条空心 MASKARIA 反向划过 · 三圈水波 · 尘埃上飘 · 标题逐字上浮 + 从疏到密收拢 · 副标衬线 MASKARIA 字距收拢
 *   → onComplete（总长 ≈ 5.2s）。全屏点击 = 跳到 ⑥（skip）。
 * 粉版：真实的靛蓝门板 / 蓝白光 → 莓紫门扇 / 樱粉白光 / 藕紫描边。演示：?speed=fast|normal|slow；?stage=title 直达标题段；?hold=1 不自动关。
 * 低动效（真实只认 prefers-reduced-motion）：直接 ⑥ 静态标题，1.2s×s 后完成。
 */
import { motion } from 'framer-motion';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { OverlayProps } from '@pink/registry/types';
import { useBoldness } from '@pink/lib/prefs';
import { StageChip } from '@pink/screens/pkg1/fxbits';

const TRAVEL = 2.6;
const DOORS = Array.from({ length: 10 }, (_, i) => ({ side: (i % 2 === 0 ? 'left' : 'right') as 'left' | 'right', delay: Math.floor(i / 2) * (TRAVEL / 5) + (i % 2) * (TRAVEL / 10) }));
const STAR_CLIP = 'polygon(50% 0%, 58% 42%, 100% 50%, 58% 58%, 50% 100%, 42% 58%, 0% 50%, 42% 42%)';
const STARS = Array.from({ length: 12 }, (_, i) => ({ left: [12, 78, 26, 88, 8, 66, 40, 92, 20, 72, 34, 58][i], top: [18, 26, 72, 62, 46, 12, 84, 38, 58, 90, 8, 78][i], size: 14 + (i % 3) * 9, delay: (i * 0.17) % 1.4 }));
const DUST = Array.from({ length: 16 }, (_, i) => ({ left: ((i * 29) % 100) - 50, top: ((i * 17) % 64) - 12, dur: 1.6 + (i % 4) * 0.35, delay: 0.15 + i * 0.06 }));
const SPEED: Record<string, number> = { fast: 0.55, normal: 1, slow: 1.65 };
type Phase = 'preroll' | 'travel' | 'flood' | 'title';

export const VelvetSplashPink = ({ s, onComplete, start = 'preroll', hold }: { s: number; onComplete: () => void; start?: Phase; hold?: boolean }) => {
  const anim = useBoldness();
  const [phase, setPhase] = useState<Phase>(anim ? start : 'title');
  const done = useRef(onComplete); done.current = onComplete;
  const skip = () => setPhase('title');
  useEffect(() => { if (phase !== 'preroll') return; const t = setTimeout(() => setPhase('travel'), 250); return () => clearTimeout(t); }, [phase]);
  useEffect(() => { if (phase !== 'travel') return; const t = setTimeout(() => setPhase('flood'), TRAVEL * 1000 * s); return () => clearTimeout(t); }, [phase, s]);
  useEffect(() => { if (phase !== 'flood') return; const t = setTimeout(() => setPhase('title'), 520 * s); return () => clearTimeout(t); }, [phase, s]);
  useEffect(() => { if (phase !== 'title' || hold) return; const t = setTimeout(() => done.current(), (anim ? 1800 : 1200) * s); return () => clearTimeout(t); }, [phase, s, anim, hold]);
  const T = TRAVEL * s;
  return (
    <div onClick={skip} className="fixed inset-0 flex items-center justify-center overflow-hidden" style={{ zIndex: 'var(--p3r-z-system)' as unknown as number, background: '#0e040c', contain: 'strict' }} role="img" aria-label="MASKARIA 开屏（点击跳过）">
      <style>{`
        @keyframes vlv-sidedoor-l { 0% { transform: translateZ(-3400px) rotateY(56deg); opacity: 1; } 96% { opacity: 1; } 100% { transform: translateZ(870px) rotateY(56deg); opacity: 0; } }
        @keyframes vlv-sidedoor-r { 0% { transform: translateZ(-3400px) rotateY(-56deg); opacity: 1; } 96% { opacity: 1; } 100% { transform: translateZ(870px) rotateY(-56deg); opacity: 0; } }
        @keyframes vlv-dolly { 0% { transform: translateZ(0) rotate(-8deg); } 100% { transform: translateZ(900px) rotate(3.5deg); } }
        @keyframes vlv-door { 0% { transform: translateZ(-4200px); } 100% { transform: translateZ(180px); } }
        @keyframes vlv-leaf-l { 0%, 52% { transform: rotateY(0deg); } 100% { transform: rotateY(-104deg); } }
        @keyframes vlv-leaf-r { 0%, 52% { transform: rotateY(0deg); } 100% { transform: rotateY(104deg); } }
        @keyframes vlv-slit { 0% { transform: scaleX(0.03); opacity: 0.5; } 52% { transform: scaleX(0.06); opacity: 0.65; } 60% { transform: scaleX(0.34); opacity: 0.82; } 70% { transform: scaleX(0.62); opacity: 0.9; } 82% { transform: scaleX(0.86); opacity: 0.96; } 100% { transform: scaleX(1); opacity: 1; } }
        @keyframes vlv-drift { 0% { transform: translate3d(0,0,0); } 50% { transform: translate3d(-1.5%, 1.2%, 0); } 100% { transform: translate3d(0,0,0); } }
        @keyframes vlv-twinkle { 0%, 100% { transform: scale(0.2) rotate(0deg); opacity: 0; } 40% { transform: scale(1) rotate(10deg); opacity: 1; } 72% { transform: scale(0.78) rotate(16deg); opacity: 0.45; } }
        @keyframes vlv-rays { 0%, 100% { transform: scale(0.4) rotate(0deg); opacity: 0; } 40% { transform: scale(1.5) rotate(-8deg); opacity: 0.6; } 72% { transform: scale(2.1) rotate(-14deg); opacity: 0; } }
        @keyframes vlv-preroll { 0% { transform: scaleX(0) scaleY(1); background: #ffffff; opacity: 1; } 38% { transform: scaleX(1) scaleY(1); background: #ffffff; opacity: 1; } 62% { transform: scaleX(1) scaleY(1.6); background: #d9b8ff; opacity: 1; } 100% { transform: scaleX(1) scaleY(9); background: #7a3a8f; opacity: 0; } }
        @keyframes vlv-marquee-l { from { transform: translateX(-34%); } to { transform: translateX(6%); } }
        @keyframes vlv-marquee-r { from { transform: translateX(6%); } to { transform: translateX(-34%); } }
        .vlv-sidedoor { position: absolute; background: linear-gradient(180deg, #ffffff 0%, #fff2f7 62%, #f3d9e8 100%); box-shadow: 0 0 26px rgba(255,200,226,0.5); }
        .vlv-marquee { white-space: nowrap; font-size: clamp(4.2rem, 20vw, 12rem); font-weight: 900; font-style: italic; color: transparent; -webkit-text-stroke: 1px rgba(255,180,212,0.5); letter-spacing: -0.02em; line-height: 1; }
      `}</style>
      {anim && <div aria-hidden className="pointer-events-none absolute inset-[-6%]" style={{
        background: 'radial-gradient(1.4px 1.4px at 12% 22%, rgba(255,214,232,0.8), transparent 60%), radial-gradient(1.6px 1.6px at 68% 14%, rgba(255,226,240,0.7), transparent 60%), radial-gradient(1.2px 1.2px at 32% 76%, rgba(233,200,255,0.7), transparent 60%), radial-gradient(1.8px 1.8px at 84% 62%, rgba(255,214,232,0.65), transparent 60%), radial-gradient(1.3px 1.3px at 52% 46%, rgba(233,200,255,0.6), transparent 60%), radial-gradient(1.5px 1.5px at 8% 58%, rgba(255,214,232,0.6), transparent 60%), radial-gradient(1.2px 1.2px at 92% 32%, rgba(233,200,255,0.6), transparent 60%), radial-gradient(1.4px 1.4px at 44% 88%, rgba(255,214,232,0.55), transparent 60%)',
        animation: `vlv-drift ${14 * s}s ease-in-out infinite` }} />}
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 48%, transparent 32%, rgba(10,3,8,0.72) 78%)' }} />
      {phase === 'preroll' && <div aria-hidden className="pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2" style={{ height: 16, transformOrigin: 'center', boxShadow: '0 0 34px 6px rgba(255,226,240,0.65)', animation: 'vlv-preroll 250ms cubic-bezier(0.55,0,0.25,1) forwards' }} />}
      {phase === 'travel' && (
        <div className="absolute inset-0" style={{ perspective: 900, perspectiveOrigin: '50% 48%' }}>
          <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d', animation: `vlv-dolly ${T}s cubic-bezier(0.55,0,0.85,0.35) forwards` }}>
            {DOORS.map((d, i) => (
              <span key={i} aria-hidden className="vlv-sidedoor" style={{ [d.side]: '-13%', top: 'calc(50% - 70px)', width: 66, height: 140, transformOrigin: d.side === 'left' ? 'right center' : 'left center', animation: `vlv-sidedoor-${d.side === 'left' ? 'l' : 'r'} ${TRAVEL * 0.95 * s}s linear ${d.delay * s}s infinite` } as CSSProperties} />
            ))}
            {STARS.map((st, i) => (
              <span key={`st${i}`} aria-hidden className="absolute" style={{ left: `${st.left}%`, top: `${st.top}%`, width: st.size, height: st.size, transform: 'translateZ(-260px)' }}>
                <span className="absolute inset-0" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.85) 0%, rgba(255,200,226,0.35) 34%, transparent 70%)', animation: `vlv-rays ${1.7 * s}s ease-out ${T * 0.5 + st.delay * s}s infinite` }} />
                <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #ffffff 0%, #ffe0ee 100%)', clipPath: STAR_CLIP, animation: `vlv-twinkle ${1.5 * s}s ease-in-out ${T * 0.5 + st.delay * s}s infinite` }} />
              </span>
            ))}
            <div className="absolute left-1/2 top-1/2" style={{ width: 280, height: 420, marginLeft: -140, marginTop: -210, transformStyle: 'preserve-3d', animation: `vlv-door ${T}s cubic-bezier(0.42,0,0.8,0.45) forwards` }}>
              <span aria-hidden className="absolute" style={{ inset: -7, border: '2px solid rgba(255,160,200,0.55)', boxShadow: '0 0 26px rgba(230,74,132,0.45), inset 0 0 18px rgba(230,74,132,0.25)' }} />
              <span aria-hidden className="absolute inset-y-0 left-0 w-full" style={{ background: '#ffffff', boxShadow: '0 0 40px 12px rgba(255,214,232,0.5)', animation: `vlv-slit ${T}s linear forwards` }} />
              {(['l', 'r'] as const).map((side) => (
                <span key={side} aria-hidden className="absolute inset-y-0 w-1/2" style={{ [side === 'l' ? 'left' : 'right']: 0, transformOrigin: side === 'l' ? 'left center' : 'right center', background: 'linear-gradient(160deg, #5a1e47 0%, #33102a 55%, #1a0715 100%)', borderTop: '2px solid rgba(255,170,206,0.35)', borderBottom: '2px solid rgba(255,170,206,0.2)', [side === 'l' ? 'borderLeft' : 'borderRight']: '2px solid rgba(255,170,206,0.3)', animation: `vlv-leaf-${side} ${T}s cubic-bezier(0.3,0,0.15,1) forwards` } as CSSProperties} />
              ))}
            </div>
          </div>
        </div>
      )}
      <motion.div aria-hidden className="pointer-events-none absolute inset-0" initial={false} animate={{ opacity: phase === 'flood' ? 1 : 0 }} transition={{ duration: (phase === 'flood' ? 0.3 : 0.55) * s, ease: 'easeOut' }}
        style={{ background: 'radial-gradient(circle at 50% 48%, #ffffff 0%, #fff0f6 40%, #f6cfe1 100%)' }} />
      {phase === 'title' && anim && (
        <>
          <div className="pointer-events-none absolute left-0 right-0 top-[7%] select-none overflow-hidden"><div className="vlv-marquee" style={{ animation: `vlv-marquee-l ${3.4 * s}s linear forwards` }}>MASKARIA</div></div>
          <div className="pointer-events-none absolute bottom-[7%] left-0 right-0 select-none overflow-hidden"><div className="vlv-marquee" style={{ animation: `vlv-marquee-r ${3.4 * s}s linear forwards` }}>MASKARIA</div></div>
        </>
      )}
      {phase === 'title' && (
        <div className="relative flex flex-col items-center">
          {anim && [0, 1, 2].map((i) => (
            <motion.span key={`r${i}`} aria-hidden className="absolute rounded-full border" style={{ width: 120, height: 120, borderColor: 'rgba(255,170,206,0.5)' }} initial={{ scale: 0.3, opacity: 0.85 }} animate={{ scale: 5.4, opacity: 0 }} transition={{ duration: 2.1 * s, delay: i * 0.36 * s, ease: 'easeOut' }} />
          ))}
          {anim && DUST.map((d, i) => (
            <motion.span key={`p${i}`} aria-hidden className="absolute h-1 w-1 rounded-full" style={{ left: `${d.left}%`, top: `${d.top}%`, background: '#ffd0e4' }} initial={{ y: 26, opacity: 0, scale: 0.4 }} animate={{ y: -76, opacity: [0, 0.9, 0], scale: [0.4, 1, 0.5] }} transition={{ duration: d.dur * s, delay: d.delay * s, ease: 'easeOut' }} />
          ))}
          <motion.h1 initial={{ opacity: 0, scale: anim ? 1.16 : 1 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.0 * s, ease: [0.2, 0, 0.1, 1] }}
            className="relative flex font-heavy text-[clamp(2.1rem,11vw,4rem)] leading-none text-white" aria-label="MASKARIA">
            {'MASKARIA'.split('').map((ch, i) => (
              <motion.span key={i} aria-hidden initial={{ opacity: 0, y: anim ? 26 : 0 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.62 * s, delay: (0.1 + i * 0.085) * s, ease: [0.16, 1, 0.3, 1] }} style={{ display: 'inline-block' }}>{ch}</motion.span>
            ))}
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: anim ? 10 : 0, letterSpacing: anim ? '0.9em' : '0.42em' }} animate={{ opacity: 1, y: 0, letterSpacing: '0.42em' }} transition={{ duration: 0.9 * s, delay: 0.62 * s, ease: [0.16, 1, 0.3, 1] }}
            className="relative mt-3 text-[clamp(0.7rem,3.4vw,0.95rem)] italic" style={{ color: '#ffb3d1', fontFamily: 'Georgia, "Times New Roman", serif' }}>MASKARIA</motion.p>
        </div>
      )}
    </div>
  );
};

export default function VelvetOverlay({ open, onClose, params }: OverlayProps) {
  const s = SPEED[params?.get('speed') ?? 'normal'] ?? 1;
  const start = params?.get('stage') === 'title' ? 'title' : params?.get('stage') === 'travel' ? 'travel' : 'preroll';
  if (!open) return null;
  return (
    <>
      <VelvetSplashPink s={s} onComplete={onClose} start={start} hold={params?.get('hold') === '1'} />
      <StageChip text="TAP TO SKIP" />
    </>
  );
}
