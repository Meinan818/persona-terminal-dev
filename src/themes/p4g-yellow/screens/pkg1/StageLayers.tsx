/**
 * 舞台装饰 & 背景层（对应真实 App.tsx 的 P4StageDecor + BackgroundAnimation + 背景图片层）。
 *   · StageDecor：黄舞台装饰——巨型橙弧环 / 大花（四角星）剪影 / 散落四角星（固定层、静态，不随切页跳）
 *   · BackgroundAnim：背景动画四种「极光 / 粒子 / 渐变波 / 脉冲」，最多同时两个（真实 settings.backgroundAnimations 上限 2）
 *   · BackgroundImage：背景图片（透明度、横/竖屏模式 cover|contain）
 * 只动 transform / opacity；低动效时动画静止。全部 pointer-events:none、fixed inset-0、置于内容之下。
 */
import { useLowMotion } from '@yellow/lib/prefs';
import { p4gAsset } from '@yellow/lib/asset';
import { Sparkle4 } from './bits';

export type BgAnimKind = 'aurora' | 'particles' | 'wave' | 'pulse';
export const BG_ANIM_LABEL: Record<BgAnimKind, string> = { aurora: '极光', particles: '粒子', wave: '渐变波', pulse: '脉冲' };

export function StageDecor({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none fixed inset-0 overflow-hidden ${className}`} style={{ zIndex: 0 }}>
      {/* 巨型橙弧环（右下出血）*/}
      <div className="absolute -bottom-[38vmin] -right-[30vmin] h-[90vmin] w-[90vmin] rounded-pill border-[5vmin] border-p4g-orange opacity-[0.22] night:opacity-[0.28]" />
      <div className="absolute -bottom-[30vmin] -right-[22vmin] h-[74vmin] w-[74vmin] rounded-pill border-[1.2vmin] border-dashed border-p4g-black opacity-[0.12] night:border-p4g-yellow" />
      {/* 大花剪影：四角星叠瓣（左上）*/}
      <svg className="absolute -left-[16vmin] top-[22vh] h-[56vmin] w-[56vmin] opacity-[0.10] night:opacity-[0.12]" viewBox="0 0 100 100">
        {[0, 45].map((r) => <path key={r} transform={`rotate(${r} 50 50)`} d="M50 0 C55 38 62 45 100 50 C62 55 55 62 50 100 C45 62 38 55 0 50 C38 45 45 38 50 0Z" fill="var(--p4g-on-stage)" />)}
      </svg>
      <Sparkle4 size={26} color="var(--p4g-white)" className="absolute left-[8%] top-[12%] opacity-70" />
      <Sparkle4 size={18} color="var(--p4g-orange)" className="absolute right-[12%] top-[44%] opacity-80" />
      <Sparkle4 size={14} color="var(--p4g-white)" className="absolute bottom-[22%] left-[46%] opacity-60" />
    </div>
  );
}

export function BackgroundAnim({ kinds }: { kinds: BgAnimKind[] }) {
  const low = useLowMotion();
  const on = kinds.slice(0, 2);
  const a = (css: string) => (low ? undefined : css);
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 0 }}>
      <style>{`
        @keyframes p1-aurora { 0%,100% { transform: translate3d(-8%,0,0) rotate(-8deg) scaleY(1); } 50% { transform: translate3d(8%,4%,0) rotate(-4deg) scaleY(1.2); } }
        @keyframes p1-float { from { transform: translate3d(0,0,0); opacity: 0; } 15% { opacity: .9; } to { transform: translate3d(0,-110vh,0); opacity: 0; } }
        @keyframes p1-wave { from { transform: translate3d(0,0,0); } to { transform: translate3d(-50%,0,0); } }
        @keyframes p1-pulse { 0% { transform: scale(.2); opacity: .55; } 100% { transform: scale(2.4); opacity: 0; } }
      `}</style>
      {on.includes('aurora') && (
        <div className="absolute inset-x-[-20%] top-[-10%] h-[60vh]">
          {['var(--p4g-orange)', 'var(--p4g-yellow-hi)', 'var(--p4g-cyan)'].map((c, i) => (
            <div key={i} className="absolute inset-x-0 h-[18vh] opacity-30" style={{ top: `${i * 14}vh`, background: `linear-gradient(90deg, transparent, ${c}, transparent)`, animation: a(`p1-aurora ${9 + i * 3}s ease-in-out ${i}s infinite`) }} />
          ))}
        </div>
      )}
      {on.includes('particles') && Array.from({ length: 16 }, (_, i) => (
        <span key={i} className="absolute bottom-[-20px]" style={{ left: `${(i * 61) % 100}%`, animation: a(`p1-float ${8 + (i % 5) * 2}s linear ${-i * 0.9}s infinite`) }}>
          <Sparkle4 size={8 + (i % 4) * 4} color={i % 3 ? 'var(--p4g-white)' : 'var(--p4g-orange)'} />
        </span>
      ))}
      {on.includes('wave') && (
        <div className="absolute inset-x-0 bottom-0 h-[34vh] overflow-hidden opacity-40">
          {[0, 1].map((k) => (
            <svg key={k} className="absolute bottom-0 h-full w-[200%]" style={{ bottom: k * 18, animation: a(`p1-wave ${14 + k * 6}s linear infinite`), opacity: k ? 0.6 : 1 }} viewBox="0 0 1600 200" preserveAspectRatio="none">
              <path d="M0 120 Q200 60 400 120 T800 120 T1200 120 T1600 120 V200 H0Z" fill={k ? 'var(--p4g-orange)' : 'var(--p4g-yellow-hi)'} />
            </svg>
          ))}
        </div>
      )}
      {on.includes('pulse') && [0, 1, 2].map((i) => (
        <span key={i} className="absolute left-1/2 top-[40%] -ml-[30vmin] -mt-[30vmin] h-[60vmin] w-[60vmin] rounded-pill border-[6px] border-p4g-orange" style={{ animation: a(`p1-pulse 4.5s ease-out ${i * 1.5}s infinite`), opacity: low ? 0.15 : undefined }} />
      ))}
    </div>
  );
}

export function BackgroundImage({ opacity = 0.35, fit = 'cover', src }: { opacity?: number; fit?: 'cover' | 'contain'; src?: string }) {
  const night = typeof document !== 'undefined' && document.documentElement.getAttribute('data-p4g-mode') === 'night';
  const url = src ?? p4gAsset(night ? 'town-night-wide.webp' : 'town-day-wide.webp');
  const portrait = src ?? p4gAsset(night ? 'town-night.webp' : 'town-day.webp');
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0" style={{ zIndex: 0, opacity }}>
      <picture>
        <source media="(orientation: portrait)" srcSet={portrait} />
        <img src={url} alt="" className="h-full w-full" style={{ objectFit: fit, objectPosition: 'center bottom' }} />
      </picture>
    </div>
  );
}
