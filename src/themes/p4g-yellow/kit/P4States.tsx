/**
 * 状态三件套：
 *   <P4EmptyState title="节目单还空着" hint="点右下角 + 开播第一期" action={<P4Button>新建</P4Button>} />
 *       老电视 NO SIGNAL 插画（/assets/p4g/empty-nosignal.webp，缺失时 CSS 彩条兜底）
 *   <P4Loading />                      雪花噪点小电视 + "信号接收中" + 跳动点
 *   <P4Loading fullscreen label="正在同步" />
 *   <P4ErrorState title="信号中断" message="网络连接失败" onRetry={…} />
 *       SMPTE 彩条（color-bars.webp）+ 抖动 + 重试按钮
 */
import type { ReactNode } from 'react';
import { cx } from '@yellow/lib/cx';
import { p4gAsset } from '@yellow/lib/asset';
import { useImageOk } from '@yellow/lib/slots';
import { useLowMotion } from '@yellow/lib/prefs';
import { NoiseLayer } from '@yellow/fx/ChannelNoise';
import { SignalGlitch } from '@yellow/fx/SignalGlitch';
import { P4Button } from './P4Button';
import { IconRefresh } from './icons';

const BARS = 'linear-gradient(90deg,#c0c0c0 0 14.3%,#ffe500 14.3% 28.6%,#33c2ee 28.6% 42.9%,#3cb04a 42.9% 57.1%,#c03cc0 57.1% 71.4%,#e2231a 71.4% 85.7%,#1b3fa8 85.7% 100%)';

export interface P4EmptyStateProps { title: ReactNode; hint?: ReactNode; action?: ReactNode; className?: string; compact?: boolean }
export function P4EmptyState({ title, hint, action, className, compact }: P4EmptyStateProps) {
  const url = p4gAsset('empty-nosignal.webp');
  const ok = useImageOk(url);
  return (
    <div className={cx('flex min-w-0 flex-col items-center px-4 text-center', compact ? 'py-6' : 'py-10', className)}>
      {ok === false ? (
        <div className="relative mb-4 flex h-28 w-40 items-center justify-center overflow-hidden rounded-lg border-[5px] border-p4g-black" style={{ background: BARS }}>
          <span className="rounded-xs bg-p4g-black px-2 py-1 font-display text-meta font-bold text-white">NO SIGNAL</span>
        </div>
      ) : (
        <img src={url} alt="" className={cx('mb-3 h-auto', compact ? 'w-32' : 'w-[min(52vw,200px)]')} draggable={false} />
      )}
      <div className="max-w-full font-display text-h3 font-bold text-[color:var(--p4g-on-stage)] p4g-clamp-2">{title}</div>
      {hint && <div className="mt-1 max-w-[30ch] text-body text-[color:var(--p4g-on-stage)] opacity-80 p4g-clamp-3">{hint}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export interface P4LoadingProps { label?: string; fullscreen?: boolean; className?: string; size?: 'sm' | 'md' }
export function P4Loading({ label = '信号接收中', fullscreen, className, size = 'md' }: P4LoadingProps) {
  const low = useLowMotion();
  const box = (
    <div className={cx('flex min-w-0 flex-col items-center gap-3', className)} role="status" aria-live="polite">
      <div className={cx('relative overflow-hidden rounded-lg border-[5px] border-p4g-black bg-[#555] shadow-hard night:border-p4g-yellow', size === 'sm' ? 'h-14 w-20' : 'h-24 w-32')}>
        <NoiseLayer animate={!low} />
        <div aria-hidden className="absolute inset-0 shadow-[inset_0_0_18px_rgba(0,0,0,.65)]" />
      </div>
      <div className="flex items-center gap-1 font-display text-body font-bold text-[color:var(--p4g-on-stage)]">
        <span>{label}</span>
        {[0, 1, 2].map((i) => <span key={i} className="inline-block h-1.5 w-1.5 bg-current" style={{ animation: low ? undefined : `p4g-blink 0.9s steps(1) ${i * 0.2}s infinite` }} />)}
      </div>
      <span className="sr-only">加载中</span>
    </div>
  );
  if (!fullscreen) return box;
  return <div className="p4g-stage fixed inset-0 flex items-center justify-center" style={{ zIndex: 'var(--p4g-z-system)' as unknown as number }}>{box}</div>;
}

export interface P4ErrorStateProps { title?: ReactNode; message?: ReactNode; onRetry?: () => void; retryText?: string; className?: string }
export function P4ErrorState({ title = '信号中断', message, onRetry, retryText = '重新接收', className }: P4ErrorStateProps) {
  const url = p4gAsset('color-bars.webp');
  const ok = useImageOk(url);
  return (
    <div className={cx('flex min-w-0 flex-col items-center px-4 py-8 text-center', className)} role="alert">
      <SignalGlitch active loop className="mb-4 w-[min(72vw,280px)] rounded-lg border-[5px] border-p4g-black shadow-hard night:border-p4g-yellow">
        <div className="relative aspect-[16/9] w-full" style={ok === false ? { background: BARS } : { backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
          <span className="absolute inset-x-0 bottom-3 mx-auto w-max rounded-xs bg-p4g-black px-2 py-1 font-display text-meta font-bold tracking-[0.2em] text-white">PLEASE STAND BY</span>
        </div>
      </SignalGlitch>
      <div className="font-display text-h3 font-bold text-[color:var(--p4g-on-stage)]">{title}</div>
      {message && <div className="mt-1 max-w-[32ch] text-body text-[color:var(--p4g-on-stage)] opacity-80 p4g-clamp-3">{message}</div>}
      {onRetry && <P4Button className="mt-4" variant="black" leading={<IconRefresh size={16} />} onClick={onRetry}>{retryText}</P4Button>}
    </div>
  );
}
