/** P3R 蓝白 FX 统一出口：import { CutInBand, RippleIris, … } from '@blue/fx'。用法见 KIT.md §FX 与 #/__kit。 */
export * from './motifs';
export { CutInBand, type CutInBandProps } from './CutInBand';
export { RippleIris, WaveSlice, CutInSweep, PageEnter, PeriodMark } from './Transitions';
export { LogoReveal } from './LogoReveal';
export { useAIStream, AIThinking, AIText, type AIPhase, type AIFail, type AIState, type AIOptions } from './aiEngine';
export { P3Stagger, P3StaggerItem } from './Stagger';
