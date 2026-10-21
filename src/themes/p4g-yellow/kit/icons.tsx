/**
 * 图标集（24px viewBox，currentColor）。导航图标几何沿用真实 Navigation.tsx（双态 filled）。
 *   <IconHome filled /> <IconBolt /> <IconHeart /> <IconCoin /> <IconGrid /> <IconCat />
 *   通用：IconClose IconBack IconChevron IconPlus IconMinus IconCheck IconSearch IconMore IconTrash IconEdit IconStar IconRefresh
 */
import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { filled?: boolean; size?: number };
const base = (size = 24, rest: SVGProps<SVGSVGElement>) => ({ width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true, ...rest });

export const IconHome = ({ filled, size, ...r }: P) => (
  <svg {...base(size, r)} fill="none" stroke="currentColor" strokeWidth={filled ? 0 : 2}>
    {filled ? (<>
      <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" fill="currentColor" />
      <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625A1.875 1.875 0 013.75 19.875v-6.198a.75.75 0 01.091-.086L12 5.432z" fill="currentColor" />
    </>) : (
      <path d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" strokeLinecap="round" strokeLinejoin="round" />
    )}
  </svg>
);
export const IconBolt = ({ filled, size, ...r }: P) => (
  <svg {...base(size, r)} fill="none" stroke="currentColor" strokeWidth={filled ? 0 : 2}>
    {filled ? <path fillRule="evenodd" clipRule="evenodd" fill="currentColor" d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z" />
      : <path d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" strokeLinecap="round" strokeLinejoin="round" />}
  </svg>
);
export const IconHeart = ({ filled, size, ...r }: P) => (
  <svg {...base(size, r)} fill="none" stroke="currentColor" strokeWidth={filled ? 0 : 2}>
    {filled ? <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.003-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
      : <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />}
  </svg>
);
export const IconCoin = ({ filled, size, ...r }: P) => (
  <svg {...base(size, r)} fill="none" stroke="currentColor" strokeWidth={filled ? 2.6 : 2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="8.2" /><path d="M9 9.2l3 3.4 3-3.4M12 12.6v4M9.8 14.4h4.4" />
  </svg>
);
export const IconGrid = ({ filled, size, ...r }: P) => (
  <svg {...base(size, r)} fill="none" stroke="currentColor" strokeWidth={filled ? 0 : 2}>
    {filled ? <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M3 6a3 3 0 013-3h2.25a3 3 0 013 3v2.25a3 3 0 01-3 3H6a3 3 0 01-3-3V6zm9.75 0a3 3 0 013-3H18a3 3 0 013 3v2.25a3 3 0 01-3 3h-2.25a3 3 0 01-3-3V6zM3 15.75a3 3 0 013-3h2.25a3 3 0 013 3V18a3 3 0 01-3 3H6a3 3 0 01-3-3v-2.25zm9.75 0a3 3 0 013-3H18a3 3 0 013 3V18a3 3 0 01-3 3h-2.25a3 3 0 01-3-3v-2.25z" />
      : <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z" />}
  </svg>
);
/** 黑猫剪影（真实 CatSilhouetteIcon 同几何）——助手入口 */
export const IconCat = ({ size, ...r }: P) => (
  <svg {...base(size, r)} fill="currentColor"><path d="M6.6 2.3 L10 5.55 Q12 5.1 14 5.55 L17.4 2.3 L18.33 7.3 A8 8.5 0 1 1 5.67 7.3 Z" /></svg>
);
const S = (d: string, w = 2.4) => ({ size, ...r }: P) => (
  <svg {...base(size, r)} fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="square" strokeLinejoin="miter"><path d={d} /></svg>
);
export const IconClose = S('M5 5l14 14M19 5L5 19', 3);
export const IconBack = S('M15 4l-8 8 8 8', 3);
export const IconChevron = S('M9 5l7 7-7 7', 3);
export const IconChevronDown = S('M5 9l7 7 7-7', 3);
export const IconPlus = S('M12 4v16M4 12h16', 3);
export const IconMinus = S('M4 12h16', 3);
export const IconCheck = S('M4 12.5l5 5L20 6.5', 3.2);
export const IconSearch = S('M10.5 4a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM15.5 15.5L21 21', 2.6);
export const IconMore = ({ size, ...r }: P) => (
  <svg {...base(size, r)} fill="currentColor"><rect x="3" y="10" width="4" height="4" /><rect x="10" y="10" width="4" height="4" /><rect x="17" y="10" width="4" height="4" /></svg>
);
export const IconTrash = S('M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7', 2.2);
export const IconEdit = S('M4 20h4L19 9l-4-4L4 16v4zM13 7l4 4', 2.2);
export const IconRefresh = S('M20 11a8 8 0 10-2.3 5.7M20 4v7h-7', 2.6);
export const IconStar = ({ size, ...r }: P) => (
  <svg {...base(size, r)} fill="currentColor"><path d="M12 1.5l2.9 7 7.6.6-5.8 5 1.8 7.4L12 17.6l-6.5 3.9 1.8-7.4-5.8-5 7.6-.6z" /></svg>
);
/** 四角星闪（P4G Rank Up / 选中角标）*/
export const IconSparkle = ({ size, ...r }: P) => (
  <svg {...base(size, r)} fill="currentColor"><path d="M12 0 Q13.4 10.6 24 12 Q13.4 13.4 12 24 Q10.6 13.4 0 12 Q10.6 10.6 12 0Z" /></svg>
);
