/**
 * P4Button —— 按下位移（translate 3px + 阴影收缩），硬阴影无 blur。
 *   <P4Button>确认</P4Button>                         primary：黄底黑字黑描边
 *   <P4Button variant="secondary">取消</P4Button>      奶油底黑字
 *   <P4Button variant="danger">删除</P4Button>         红底白字
 *   <P4Button variant="ghost">稍后</P4Button>          透明、下划线式
 *   <P4Button variant="black">开播</P4Button>          黑底黄字（P4G 选中行配色）
 *   <P4Button variant="icon" aria-label="关闭"><IconClose/></P4Button>
 *   props：size sm|md|lg、block（占满宽）、leading/trailing 图标、busy、disabled
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '@yellow/lib/cx';

export type P4ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'black' | 'icon';
export interface P4ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: P4ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  block?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  busy?: boolean;
}

const V: Record<P4ButtonVariant, string> = {
  primary: 'bg-p4g-yellow text-p4g-black border-p4g-black shadow-hard',
  secondary: 'bg-p4g-surface-2 text-p4g-ink border-p4g-line shadow-hard',
  danger: 'bg-p4g-danger text-[color:var(--p4g-danger-ink)] border-p4g-black shadow-hard',
  black: 'bg-p4g-black text-p4g-yellow border-p4g-black shadow-hard night:border-p4g-yellow',
  ghost: 'bg-transparent text-current border-transparent underline decoration-[3px] underline-offset-4 decoration-p4g-orange',
  icon: 'bg-p4g-surface-2 text-p4g-ink border-p4g-line shadow-hard-sm',
};
const SZ = { sm: 'h-8 px-3 text-meta gap-1.5', md: 'h-11 px-4 text-body gap-2', lg: 'h-14 px-6 text-lead gap-2.5' };
const ISZ = { sm: 'h-8 w-8', md: 'h-11 w-11', lg: 'h-14 w-14' };

export function P4Button({ variant = 'primary', size = 'md', block, leading, trailing, busy, className, children, disabled, type = 'button', ...rest }: P4ButtonProps) {
  const icon = variant === 'icon';
  return (
    <button
      type={type}
      disabled={disabled || busy}
      className={cx(
        'p4g-press relative inline-flex min-w-0 select-none items-center justify-center rounded-sm border-3 font-display font-bold leading-none',
        V[variant], icon ? ISZ[size] : SZ[size], block && 'w-full',
        (disabled || busy) && 'cursor-not-allowed opacity-50 saturate-50',
        className,
      )}
      {...rest}
    >
      {leading && <span className="flex shrink-0 items-center">{leading}</span>}
      {!icon ? <span className="min-w-0 truncate">{busy ? '处理中…' : children}</span> : children}
      {trailing && <span className="flex shrink-0 items-center">{trailing}</span>}
    </button>
  );
}
