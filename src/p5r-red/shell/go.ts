/**
 * 页内跳转链接的 onClick（原生全局 [data-go] 点击处理的 React 版）：
 *   <a href={pageHref('astrology')} onClick={goTo('astrology', 'tear')}>…</a>     <a onClick={goTo('actions', 'water', 'todos')}>
 * 行为：阻止默认 → 音效 nav(.48) → navigate(id, { via, tab, origin: 指尖 })。via 缺省 water。
 */
import type { MouseEvent } from 'react';
import { navigate, getShellState, type ShellVia } from './shellBus';
import { sfx } from '@/p5r-red/fx/sfx';

export const goTo = (id: string, via: ShellVia = 'water', tab?: string) => (e: MouseEvent) => {
  e.preventDefault();
  if (id === getShellState().currentPage && !tab) return;
  sfx('nav', 0.48);
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
  navigate(id, { via, tab, origin: { x: e.clientX || r.left + r.width / 2, y: e.clientY || r.top + r.height / 2 } });
};
