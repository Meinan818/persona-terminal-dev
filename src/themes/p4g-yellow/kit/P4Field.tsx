/**
 * 表单原语：P4Input / P4Textarea / P4Select（+ P4Field 标签包装）。
 * 外观：奶油底（夜：深棕）+ 3px 黑描边（夜：黄）+ 小圆角；聚焦 = 黄色硬投影 + 外框加深。
 *   <P4Input label="名称" placeholder="输入名称" value={v} onChange={e=>setV(e.target.value)} hint="最多 20 字" />
 *   <P4Input label="金额" prefix="¥" inputMode="decimal" error="请输入数字" />
 *   <P4Textarea label="备注" rows={4} maxLength={200} showCount />
 *   <P4Select label="分类" options={[{value:'a',label:'餐饮'}]} value={c} onChange={e=>setC(e.target.value)} />
 */
import { forwardRef, useId, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from 'react';
import { cx } from '@yellow/lib/cx';
import { IconChevronDown } from './icons';

export function P4Field({ label, hint, error, htmlFor, children, className, required, counter }: { label?: ReactNode; hint?: ReactNode; error?: ReactNode; htmlFor?: string; children: ReactNode; className?: string; required?: boolean; counter?: ReactNode }) {
  return (
    <div className={cx('flex min-w-0 flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="flex items-center gap-1.5 font-display text-meta font-bold text-p4g-ink">
          <span aria-hidden className="inline-block h-3 w-1.5 -skew-x-12 bg-p4g-orange" />
          <span className="min-w-0 truncate">{label}</span>
          {required && <span className="text-p4g-danger">*</span>}
          {counter && <span className="ml-auto shrink-0 p4g-num-upright text-2xs text-p4g-muted">{counter}</span>}
        </label>
      )}
      {children}
      {error ? <span className="text-meta font-bold text-p4g-danger">{error}</span> : hint ? <span className="text-meta text-p4g-ink-soft">{hint}</span> : null}
    </div>
  );
}

const fieldCls = (err?: boolean) => cx(
  'w-full min-w-0 rounded-sm border-3 bg-p4g-surface-2 text-body text-p4g-ink outline-none transition-[box-shadow,transform] duration-fast',
  'placeholder:text-p4g-muted focus:shadow-[4px_4px_0_var(--p4g-yellow)] night:focus:shadow-[4px_4px_0_var(--p4g-orange)]',
  err ? 'border-p4g-danger' : 'border-p4g-line',
  'disabled:opacity-50',
);

export interface P4InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> { label?: ReactNode; hint?: ReactNode; error?: ReactNode; prefix?: ReactNode; suffix?: ReactNode; wrapClassName?: string }
export const P4Input = forwardRef<HTMLInputElement, P4InputProps>(function P4Input({ label, hint, error, prefix, suffix, className, wrapClassName, id, required, ...rest }, ref) {
  const auto = useId();
  const iid = id ?? auto;
  return (
    <P4Field label={label} hint={hint} error={error} htmlFor={iid} className={wrapClassName} required={required}>
      <div className="relative flex min-w-0 items-center">
        {prefix && <span className="pointer-events-none absolute left-3 font-display font-bold text-p4g-ink-soft">{prefix}</span>}
        <input ref={ref} id={iid} required={required} aria-invalid={!!error} className={cx(fieldCls(!!error), 'h-11 px-3', prefix ? 'pl-8' : '', suffix ? 'pr-10' : '', className)} {...rest} />
        {suffix && <span className="absolute right-2 flex items-center text-p4g-ink-soft">{suffix}</span>}
      </div>
    </P4Field>
  );
});

export interface P4TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> { label?: ReactNode; hint?: ReactNode; error?: ReactNode; showCount?: boolean; wrapClassName?: string }
export const P4Textarea = forwardRef<HTMLTextAreaElement, P4TextareaProps>(function P4Textarea({ label, hint, error, showCount, className, wrapClassName, id, maxLength, value, required, ...rest }, ref) {
  const auto = useId();
  const iid = id ?? auto;
  const len = typeof value === 'string' ? value.length : 0;
  return (
    <P4Field label={label} hint={hint} error={error} htmlFor={iid} className={wrapClassName} required={required} counter={showCount ? `${len}${maxLength ? ` / ${maxLength}` : ''}` : undefined}>
      <textarea ref={ref} id={iid} value={value} maxLength={maxLength} required={required} aria-invalid={!!error} className={cx(fieldCls(!!error), 'min-h-[96px] resize-y px-3 py-2.5 leading-relaxed', className)} {...rest} />
    </P4Field>
  );
});

export interface P4SelectProps extends SelectHTMLAttributes<HTMLSelectElement> { label?: ReactNode; hint?: ReactNode; error?: ReactNode; options: { value: string; label: string; disabled?: boolean }[]; placeholder?: string; wrapClassName?: string }
export const P4Select = forwardRef<HTMLSelectElement, P4SelectProps>(function P4Select({ label, hint, error, options, placeholder, className, wrapClassName, id, required, ...rest }, ref) {
  const auto = useId();
  const iid = id ?? auto;
  return (
    <P4Field label={label} hint={hint} error={error} htmlFor={iid} className={wrapClassName} required={required}>
      <div className="relative min-w-0">
        <select ref={ref} id={iid} required={required} className={cx(fieldCls(!!error), 'h-11 appearance-none truncate pl-3 pr-10 font-bold', className)} {...rest}>
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map((o) => <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>)}
        </select>
        <span aria-hidden className="pointer-events-none absolute inset-y-[3px] right-[3px] flex w-8 items-center justify-center rounded-r-[1px] bg-p4g-black text-p4g-yellow"><IconChevronDown size={14} /></span>
      </div>
    </P4Field>
  );
});
