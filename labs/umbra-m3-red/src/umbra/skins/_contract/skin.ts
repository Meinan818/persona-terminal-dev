// UMBRA 契约 v1.2 · §2 SkinPack/Manifest、§4.1 slots、§4.2 tokens 的类型。
import type { Ease, Ms, Recipe, SkinId, TalkTemplate } from './recipe';

export interface ManifestAsset {
  id: string; file: string; w: number; h: number; atlas?: string; firstPack: boolean;
  source: 'official' | 'generated'; note?: string;
  /** 图集帧：name → [x,y,w,h]（M3 提案字段，图集素材才有） */
  frames?: Record<string, [number, number, number, number]>;
}
export interface Manifest {
  assets: ManifestAsset[];
  filters: ('ColorMatrix' | 'Displacement' | 'CRT' | 'Glitch')[];
  fonts: { family: string; file: string; chars: string; role: 'display' | 'number'; pack: 'first' | 'deferred'; unicodeRange?: string }[];
}

export interface Tokens {
  color: { primary: string; secondary: string; ink: string; paper: string; accent: string;
    hp: string; sp: string; weak: string; crit: string; resist: string; shadow: string; overlay: string };
  font: { display: string; body: string; number: string };
  stroke: { thin: number; bold: number };
  shape: { slant: number; radius: number; panelSkew: number };
  motion: { uiOpen: Ms; uiClose: Ms; press: number };
  ease: { enter: Ease; exit: Ease; pop: Ease };
  hud: { commandShape: 'arc' | 'list' | 'grid' | 'custom'; commandLayout: 'fivePlusMore' | 'twoColumn' | 'original'; partyStyle: 'card' | 'bar' | 'portrait' };
}

export type Rect = [number, number, number, number];   // x, y, w, h（设计像素，1280×720 安全框）

/** 指令区里的一个按钮。坐标全部是设计像素；hit 是命中矩形（次 ≥86、主 ≥96，必须落在 hud.command 内）。 */
export interface CommandItem {
  id: string;                 // 引擎动作 id：attack/persona/gun/guard/item/order/baton/allout/talk/release/back/next
  label: string;              // labels key（大字，拉丁）
  sub?: string;               // labels key（小字，中文说明）
  key?: 'cross' | 'circle' | 'square' | 'triangle' | 'r1' | 'r2' | 'l1' | 'l2';
  x: number; y: number; rot: number; size: number;
  invert?: number[];          // 反色字母下标（剪报字）
  hit: Rect;
  main?: boolean;
  when?: 'onemore';           // 只在 1 MORE 后出现（原作 BATON PASS）
}
export interface CommandSet { hub: { x: number; y: number }; items: CommandItem[] }

export interface SlotMap {
  [slot: string]: unknown;
  'hud.command': { rect: Rect; sets: Record<string, CommandSet>; list: { rect: Rect; title: Rect; rowH: number; desc: Rect } };
  'hud.party': { rect: Rect; card: { w: number; h: number; gap: number; rot: number } ; units: string[] };
  'hud.order': { rect: Rect };
  'hud.system': { rect: Rect; buttons: { id: string; label: string; hit: Rect }[] };
  'hud.topInfo': { rect: Rect };
  'hud.enemyOver': { dy: number };
  'scene.battle.bg': { asset: string; w: number; h: number; cx: number; cy: number };
}

export interface SkinPack {
  id: SkinId;
  manifest: Manifest;
  tokens: Tokens;
  slots: SlotMap;
  recipes: Recipe[];
  labels: Record<string, string>;
  templates?: { talk?: TalkTemplate };
}
