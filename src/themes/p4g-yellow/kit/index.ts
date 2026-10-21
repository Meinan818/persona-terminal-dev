/**
 * P4G Yellow kit —— 统一出口。页面代理只从这里取：
 *   import { P4Card, P4Button, P4PageHeader, useToast } from '@yellow/kit';
 * 每个组件文件头都有用法 JSDoc；速查见 demo/p4g-yellow/KIT.md。
 */
import './kit.css';

export { P4Outline } from './P4Outline';
export type { P4OutlineProps } from './P4Outline';
export { P4Card } from './P4Card';
export type { P4CardProps, P4CardTone } from './P4Card';
export { P4Button } from './P4Button';
export type { P4ButtonProps, P4ButtonVariant } from './P4Button';
export { P4ListRow, P4List } from './P4ListRow';
export type { P4ListRowProps } from './P4ListRow';
export { P4Tabs } from './P4Tabs';
export type { P4TabItem, P4TabsProps } from './P4Tabs';
export { P4SegmentTabs } from './P4SegmentTabs';
export { P4Chip } from './P4Chip';
export { P4Badge } from './P4Badge';
export { P4Field, P4Input, P4Textarea, P4Select } from './P4Field';
export { P4Switch } from './P4Switch';
export { P4Slider } from './P4Slider';
export { P4Stepper } from './P4Stepper';
export { P4Progress } from './P4Progress';
export { P4Avatar } from './P4Avatar';
export { P4Sheet } from './P4Sheet';
export { P4Dialog } from './P4Dialog';
export { P4ActionSheet } from './P4ActionSheet';
export { P4ChoiceList } from './P4ChoiceList';
export type { P4Choice } from './P4ChoiceList';
export { P4ToastProvider, useToast, showToast } from './P4Toast';
export type { ToastFn, ToastKind } from './P4Toast';
export { P4EmptyState, P4Loading, P4ErrorState } from './P4States';
export { P4DataBlock, P4Stripe, P4Section, P4KeyHint } from './P4Blocks';
export { P4PageHeader } from './P4PageHeader';
export { P4DateWeather } from './P4DateWeather';
export { WeatherIcon, WEATHER_LABEL, PERIODS, periodOf, WEEK_EN, WEEK_ZH } from './weather';
export type { P4Weather } from './weather';
export { P4CandyMenu } from './P4CandyMenu';
export type { P4CandyItem } from './P4CandyMenu';
export { P4Lightbox } from './P4Lightbox';
export type { P4LightboxImage } from './P4Lightbox';
export { SlotImg } from './SlotImg';
export { Portal, useScrollLock, useEscape } from './Portal';
export * from './icons';
