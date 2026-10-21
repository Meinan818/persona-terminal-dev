/**
 * P5R 红主题 Kit —— 迁移自 shared/core.js（P5.ui / P5.shape / P5.sheet / P5.actionSheet / P5.toast / P5.longPress）
 * 与 shared/components.css（→ kit.css），外加 overlays/a.js 的弹层基件（P5Layer / P5Confirm / P5Empty …）。
 * 用法与原生 API 对照见 PORTING.md §4。#/__kit 展示全部组件。
 */
export { Portal } from './Portal';
export { P5Shp, P5Shp as Shp, P5Card, shpVars, type ShpKind, type ShpTone, type P5ShpProps } from './P5Shp';
export { P5Button, type P5ButtonProps } from './P5Button';
export { P5Plate } from './P5Plate';
export { P5StarIcon, P5SolidStar } from './P5StarIcon';
export { P5BurstImg } from './P5BurstImg';
export { P5Tag } from './P5Tag';
export { P5Ransom } from './P5Ransom';
export { P5Mask } from './P5Mask';
export { P5Strip } from './P5Strip';
export { P5Field, P5Input, P5Textarea } from './P5Field';
export { P5Seg, P5Tabs, type SegItem } from './P5Seg';
export { P5Row } from './P5Row';
export { P5PageHeader, P5Back } from './P5PageHeader';
export { P5Sheet, type P5SheetProps } from './P5Sheet';
export { P5ActionSheet, type SheetAction } from './P5ActionSheet';
export { toast, P5ToastOnMount } from './P5Toast';
export { useLongPress } from './useLongPress';
export { P5Layer, P5OaRough, P5OaStar, P5OaRingStar, P5XGlyph, P5CloseKey, P5OaCollage, collageSlam } from './P5Layer';
export { P5Dialog, type P5DialogProps } from './P5Dialog';
export { P5Switch } from './P5Switch';
export { P5StackCarousel } from './P5StackCarousel';
export { P5Stepper } from './P5Stepper';
export { DevStateBar } from './DevStateBar';
// 真实仓库 components/p5r/kit 对位件（P5Collage / P5Star / P5Panel / P5Burst …，名字与真实一致）
export * from './p5r';
export { P5Confirm, type ConfirmAction, type P5ConfirmProps } from './P5Confirm';
export { P5Empty, P5Loading, P5ErrorBlock } from './P5States';
export { ui, ransomTiles, clipFor } from './html';
// 常用 fx 也从这里转出，页面一处 import 即可
export { P5Sil, SIL_NAMES, type SilName } from '@/p5r-red/fx/sil';
export { shape } from '@/p5r-red/lib/shape';
export { rng, lerp } from '@/p5r-red/lib/rng';
export { kitImg } from '@/p5r-red/lib/asset';
