/**
 * 逆影战场占位（currentPage==="battle"；FIXLIST 一-2：战场内部不在范围，只保留入口外观，点了跳占位）。
 * 迁移自 v3 shared/app.js battle 页（DOM / 类名一致，样式 legacy/css/pages.css .bt-ph / .bt-back）。
 */
import type { PageProps } from '@/p5r-red/registry/types';
import { P5Ransom } from '@/p5r-red/kit/P5Ransom';
import { goTo } from '@/p5r-red/shell/go';
import { pageHref } from '@/p5r-red/shell/shellBus';

export default function Battle(_: PageProps) {
  return (
    <div className="bt-ph">
      <P5Ransom text="SHOWTIME" h={44} seed={7} />
      <p>逆影战场 · 用户自制页面接入处</p>
      <a className="bt-back" href={pageHref('menu')} onClick={goTo('menu', 'tear')}>◀ 返回菜单</a>
    </div>
  );
}
