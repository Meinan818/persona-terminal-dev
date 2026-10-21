/** 小标签（原 P5.ui.tag）：切角，tone '' 红 | ink | paper | line。 */
import type { ReactNode } from 'react';
export function P5Tag({ children, tone = '', className = '' }: { children: ReactNode; tone?: '' | 'ink' | 'paper' | 'line'; className?: string }) {
  return <span className={`tag ${tone} ${className}`.replace(/\s+/g, ' ').trim()}>{children}</span>;
}
