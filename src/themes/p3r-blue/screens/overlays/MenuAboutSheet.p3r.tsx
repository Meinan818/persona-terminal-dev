/**
 * 关于抽屉（真实 src/pages/Menu.tsx · aboutOpen，p3 与默认形态共用）：Logo、「MASKARIA」「JRPG Growth Tracker」、版本 vX /
 * 「有新版本 vY · 去看看 ›」（外链，版本号变强调色）；「作者 Meinan818」「GitHub」（外链）；寄语「100%用爱发电，用得习惯欢迎点个star」。
 * 路由：?variant=update（有新版本）
 */
import type { OverlayProps } from '@blue/registry/types';
import { P3Sheet, P3R, slantClip, tickClip, GhostWords } from '@blue/kit';
import { PeriodMark } from '@blue/fx';

export const UPDATE_INFO = { current: '2.8.14', latest: '2.8.15' };

const LogoMark = () => (
  <svg viewBox="0 0 64 64" className="h-16 w-16" aria-hidden>
    <polygon points="8,18 56,8 50,46 14,56" fill="var(--p3r-cream)" />
    <path d="M18 26 Q32 18 46 26 Q44 40 32 44 Q20 40 18 26Z" fill="var(--p3r-blue)" />
    <ellipse cx="26" cy="30" rx="4" ry="2.6" fill="var(--p3r-cream)" /><ellipse cx="38" cy="30" rx="4" ry="2.6" fill="var(--p3r-cream)" />
    <polygon points="46,48 58,44 54,56" fill="var(--p3r-magenta)" />
  </svg>
);

export function MenuAboutSheetView({ open, onClose, hasUpdate }: { open: boolean; onClose: () => void; hasUpdate?: boolean }) {
  return (
    <P3Sheet open={open} onClose={onClose} title="关于" en="ABOUT">
      <div className="flex min-w-0 flex-col gap-4 pt-1">
        <div className="relative flex flex-col items-center overflow-hidden px-4 py-6 text-center" style={{ background: P3R.ink, clipPath: slantClip(18) }}>
          <GhostWords words={['MASKARIA']} className="-left-4 top-1 text-[64px]" />
          <LogoMark />
          <div className="relative mt-2 flex items-end gap-1"><span className="font-cond text-[clamp(30px,9vw,40px)] leading-none" style={{ color: 'var(--p3r-on-ink)' }}>MASKARIA</span><PeriodMark size={0.42} /></div>
          <p className="relative mt-1 font-cond-up text-[12px] tracking-[0.25em]" style={{ color: 'var(--bk-bubble-a)' }}>JRPG Growth Tracker</p>
          {hasUpdate ? (
            <a href="https://github.com/Meinan818/Persona-Terminal/releases" target="_blank" rel="noopener noreferrer" aria-label={`当前 v${UPDATE_INFO.current}，有新版本 v${UPDATE_INFO.latest}，去 B 站动态看看`} className="relative mt-3 inline-flex flex-col items-center gap-1.5">
              <span className="font-cond text-[16px]" style={{ color: P3R.blue }}>v{UPDATE_INFO.current}</span>
              <span className="inline-flex items-center gap-1.5 px-4 py-1 text-[13px] font-black" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(7) }}><span aria-hidden className="h-2 w-2 rounded-full" style={{ background: P3R.magenta, boxShadow: '0 0 0 2px rgba(255,255,255,0.6)' }} />有新版本 v{UPDATE_INFO.latest} · 去看看 ›</span>
            </a>
          ) : <p className="relative mt-3 px-3 py-0.5 font-cond text-[13px]" style={{ background: 'rgba(255,255,255,0.12)', color: 'var(--p3r-on-ink)', clipPath: slantClip(5) }}>v{UPDATE_INFO.current}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex min-w-0 items-center justify-between gap-2 py-3 pl-5 pr-4" style={{ clipPath: slantClip(10), background: 'var(--p3r-row)' }}>
            <span className="text-[14px] font-black" style={{ color: P3R.grey }}>作者</span>
            <span className="text-[15px] font-black" style={{ color: P3R.ink }}>Meinan818</span>
          </div>
          <div className="flex min-w-0 items-center justify-between gap-2 py-3 pl-5 pr-4" style={{ clipPath: slantClip(10), background: 'var(--p3r-row-alt)' }}>
            <span className="text-[14px] font-black" style={{ color: P3R.grey }}>GitHub</span>
            <a href="https://github.com/Meinan818/Persona-Terminal" target="_blank" rel="noopener noreferrer" className="text-[15px] font-black underline decoration-2 underline-offset-4" style={{ color: P3R.roseInk }}>Meinan818/Persona-Terminal ›</a>
          </div>
        </div>
        <div className="relative px-5 py-3 text-center" style={{ background: P3R.cyanPale, clipPath: slantClip(12) }}>
          <span aria-hidden className="absolute bottom-1 right-4 h-[7px] w-[16px]" style={{ background: P3R.magenta, clipPath: tickClip }} />
          <p className="text-[14px] font-bold leading-relaxed" style={{ color: P3R.ink }}>100%用爱发电，用得习惯欢迎点个star</p>
        </div>
      </div>
    </P3Sheet>
  );
}

export default function MenuAboutSheet({ open, onClose, params }: OverlayProps) { return <MenuAboutSheetView open={open} onClose={onClose} hasUpdate={params?.get('variant') === 'update'} />; }
