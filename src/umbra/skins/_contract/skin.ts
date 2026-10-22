// UMBRA 契约 v1.3 · §2 SkinPack/Manifest、§4.1 slots、§4.2 tokens 的类型。
import type { Ease, Ms, Recipe, SkinId, TalkTemplate } from './recipe';

export interface ManifestAsset {
  id: string;
  file: string;
  w: number;
  h: number;
  atlas?: string;
  firstPack: boolean;
  source: 'official' | 'generated';
  note?: string;
  /** 图集帧：name → [x,y,w,h] */
  frames?: Record<string, [number, number, number, number]>;
  /** 懒加载分组：head:<id> / char:<id> / back:<id> / show:<a>-<b> */
  group?: string;
}

export interface Manifest {
  assets: ManifestAsset[];
  filters: ('ColorMatrix' | 'Displacement' | 'CRT' | 'Glitch')[];
  fonts: {
    family: string;
    file: string;
    chars: string;
    role: 'display' | 'number';
    pack: 'first' | 'deferred';
    unicodeRange?: string;
  }[];
}

export interface Tokens {
  color: {
    primary: string;
    secondary: string;
    ink: string;
    paper: string;
    accent: string;
    hp: string;
    sp: string;
    weak: string;
    crit: string;
    resist: string;
    shadow: string;
    overlay: string;
  };
  font: { display: string; body: string; number: string };
  stroke: { thin: number; bold: number };
  shape: { slant: number; radius: number; panelSkew: number };
  motion: { uiOpen: Ms; uiClose: Ms; press: number };
  ease: { enter: Ease; exit: Ease; pop: Ease };
  hud: {
    commandShape: 'arc' | 'list' | 'grid' | 'custom';
    commandLayout: 'fivePlusMore' | 'twoColumn' | 'original';
    partyStyle: 'card' | 'bar' | 'portrait';
  };
}

export type Rect = [number, number, number, number];

export interface CommandItem {
  id: string;
  label: string;
  sub?: string;
  key?: 'cross' | 'circle' | 'square' | 'triangle' | 'r1' | 'r2' | 'l1' | 'l2';
  x: number;
  y: number;
  rot: number;
  size: number;
  invert?: number[];
  hit: Rect;
  main?: boolean;
  when?: 'onemore' | 'showtime';
}

export interface CommandSet {
  hub: { x: number; y: number };
  items: CommandItem[];
}

export interface SlotMap {
  [slot: string]: unknown;
  'hud.command': { rect: Rect; sets: Record<string, CommandSet>; list: { rect: Rect; title: Rect; rowH: number; desc: Rect } };
  'hud.party': { rect: Rect; card: { w: number; h: number; gap: number; rot: number }; units: string[] };
  'hud.order': { rect: Rect };
  'hud.system': { rect: Rect; buttons: { id: string; label: string; hit: Rect }[] };
  'hud.topInfo': { rect: Rect };
  'hud.enemyOver': { dy: number };
  'scene.battle.bg': { asset: string; w: number; h: number; cx: number; cy: number };
}

export interface SkinRoster {
  heroPersona: string;
  companions: string[];
  companionPersonas: Record<string, string>;
  excludedPersonas: string[];
  /** 可组合 SHOWTIME/合体魔法的两人表（D-005，只写本作角色） */
  showtime: [string, string][];
}

export type EnemyLayout = { x: number; y: number; scale: number; layer: string };
export type EnemyLayoutMap = Record<1 | 2 | 3 | 4 | 5, EnemyLayout[]>;

export interface SkinPack {
  id: SkinId;
  manifest: Manifest;
  tokens: Tokens;
  slots: SlotMap;
  recipes: Recipe[];
  labels: Record<string, string>;
  templates?: { talk?: TalkTemplate };
  roster: SkinRoster;
  enemyLayouts: EnemyLayoutMap;
  compendiumArt: Record<string, string>;
}
