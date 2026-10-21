/**
 * 关于抽屉（真实 src/pages/Menu.tsx · aboutOpen）：Logo、MASKARIA、JRPG Growth Tracker、版本 vX /「有新版本 vY · 去看看 ›」（外链），
 * 作者 Meinan818、GitHub @Meinan818（外链），寄语「100%用爱发电，用得习惯欢迎点个star」「I am thou, thou art I...」。?variant=update
 */
import type { OverlayProps } from '@yellow/registry/types';
import { P4Sheet, P4Outline, SlotImg } from '@yellow/kit';
import { p4gAsset } from '@yellow/lib/asset';

export const UPDATE_INFO = { current: '2.8.14', latest: '2.8.15' };

export function MenuAboutSheetView({ open, onClose, hasUpdate }: { open: boolean; onClose: () => void; hasUpdate?: boolean }) {
  return (
    <P4Sheet open={open} onClose={onClose} title="关于" en="ABOUT">
      <div className="flex min-w-0 flex-col gap-4 pt-1">
        <div className="relative flex flex-col items-center overflow-hidden rounded-sm border-3 border-p4g-black bg-p4g-yellow px-4 py-5 text-center text-p4g-black shadow-hard night:border-p4g-yellow">
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-3 p4g-candy-h" />
          <SlotImg slot="logo-small" fallback={p4gAsset('tv-mascot.webp')} alt="MASKARIA" className="mb-3 h-16 w-16 object-contain" />
          <P4Outline size="clamp(26px,8vw,34px)" stroke={5} italic>MASKARIA</P4Outline>
          <p className="mt-1 font-display text-meta font-bold tracking-[0.2em]">JRPG Growth Tracker</p>
          {hasUpdate ? (
            <a href="https://github.com/Meinan818/Persona-Terminal/releases" target="_blank" rel="noopener noreferrer" aria-label={`当前 v${UPDATE_INFO.current}，有新版本 v${UPDATE_INFO.latest}，去 B 站动态看看`}
              className="mt-2 inline-flex flex-col items-center gap-1 font-display text-meta font-bold">
              <span className="p4g-num">v{UPDATE_INFO.current}</span>
              <span className="inline-flex items-center gap-1 rounded-pill bg-p4g-black px-3 py-1 text-p4g-yellow"><span aria-hidden className="h-2 w-2 rounded-pill bg-p4g-red" />有新版本 v{UPDATE_INFO.latest} · 去看看 ›</span>
            </a>
          ) : <p className="mt-2 rounded-pill bg-p4g-black px-3 py-0.5 p4g-date-type text-2xs text-white">v{UPDATE_INFO.current}</p>}
        </div>
        <div className="overflow-hidden rounded-sm border-3 border-p4g-line">
          <div className="flex min-w-0 items-center justify-between gap-2 px-4 py-3" style={{ background: 'var(--p4g-surface-grad)' }}>
            <span className="font-display text-body font-bold text-p4g-ink-soft">作者</span>
            <span className="font-display text-body font-bold text-p4g-ink">Meinan818</span>
          </div>
          <div className="h-[2px]" style={{ background: 'var(--p4g-separator-a)' }} />
          <div className="flex min-w-0 items-center justify-between gap-2 px-4 py-3" style={{ background: 'var(--p4g-surface-grad)' }}>
            <span className="font-display text-body font-bold text-p4g-ink-soft">GitHub</span>
            <a href="https://github.com/Meinan818/Persona-Terminal" target="_blank" rel="noopener noreferrer" className="font-display text-body font-bold text-[color:var(--p4g-rank)] underline decoration-2 underline-offset-4">@Meinan818</a>
          </div>
        </div>
        <div className="relative rounded-sm border-3 border-p4g-black bg-[color:var(--p4g-msg)] px-4 py-3 text-center text-[color:var(--p4g-msg-ink)] shadow-plate night:border-p4g-yellow">
          <p className="text-body leading-relaxed">100%用爱发电，用得习惯欢迎点个star</p>
          <p className="mt-1 font-display text-meta font-bold italic text-p4g-yellow">I am thou, thou art I...</p>
        </div>
      </div>
    </P4Sheet>
  );
}

export default function MenuAboutSheet({ open, onClose, params }: OverlayProps) { return <MenuAboutSheetView open={open} onClose={onClose} hasUpdate={params?.get('variant') === 'update'} />; }
