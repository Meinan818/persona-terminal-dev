/** 表单件（纸面上）：.fld 斜签标题 + .inp 输入框 / 文本域（原 components.css）。 */
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';
export function P5Field({ label, children, className = '' }: { label: ReactNode; children: ReactNode; className?: string }) {
  return <label className={`fld ${className}`.trim()}><span>{label}</span>{children}</label>;
}
export function P5Input({ className = '', ...p }: InputHTMLAttributes<HTMLInputElement>) { return <input className={`inp ${className}`.trim()} {...p} />; }
export function P5Textarea({ className = '', ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea className={`inp ${className}`.trim()} {...p} />; }
