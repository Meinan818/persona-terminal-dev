/**
 * P3R 蓝白母题层统一出口（结城理 / P3R 正统）。fork 后位于 src/fx/motifs/，由 src/fx/index.ts 再导出。
 * 对位粉版组件见 ../MAPPING.md。样式：import './motifs.css'（或并入 index.css）。
 */
export { MoonPhase, MoonPhaseStrip, FullMoon, moonPhaseOf, moonLitPath, MOON_PHASE_NAMES, type MoonPhaseProps, type FullMoonProps } from './Moon';
export { DarkHourFreeze, DarkHourGlow, StoppedClock, type DarkHourGlowProps } from './DarkHour';
export { Caustics, Bubbles, BubbleBurst, BubbleShape, BlotIris, DoubleCircleIris, type CausticsProps } from './Water';
export { Shatter, ShardCheck, ShardFrame, shardsFor } from './Shatter';
export { EvokerCutIn, type EvokerCutInProps } from './Evoker';
export { TartarusSilhouette, TartarusCounter, RollNum, TARTARUS_BLOCKS, tartarusBlockOf, type TartarusCounterProps } from './Tartarus';
export { Headphones, EqBars, NowPlaying, EqThinking } from './Music';
export { DateRoll } from './DateRoll';
export { TriCursor, TriMenu, type TriCursorProps } from './TriCursor';
export { SlashBands, TiltTitle, type SlashBandsProps, type TiltTitleProps } from './Bands';
export { BlueStage, BlueHeroDecor, type BlueStageProps } from './BlueStage';
export { useBoldness, stepEase } from './_env';
