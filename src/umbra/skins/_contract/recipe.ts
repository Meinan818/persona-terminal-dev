// UMBRA 演出接入契约 v1.3 · §2 Recipe schema（与 CONTRACT-v1.3.md 对应）
// 皮肤只写 JSON；本文件只有类型，没有运行时代码。

export type SkinId = 'p5r-red' | 'p4-yellow' | 'p3-blue' | 'p3r-pink';
export type Ms = number;
export type Ease = 'linear' | 'outCubic' | 'inCubic' | 'outQuart' | 'inOutCubic' | 'outBack' | 'outElastic';
/** 从下到上 */
export type Layer = 'bg' | 'enemy' | 'ally' | 'fx' | 'dmg' | 'hud' | 'cutin' | 'allout' | 'trans';
/** '$actor' | '$target' | '$targets' | '$party' | '$screen' | '$env' | '$prev' | '$env.<key>' | '#节点名' */
export type Ref = `$${string}` | `#${string}`;
export type Tok<T> = T | `@${string}`;
export type Vec = { x: number | Ref; y: number | Ref; dx?: number; dy?: number };

export type EventName =
  // v1.2
  | 'scene:enter' | 'scene:leave' | 'battle:start' | 'turn:start' | 'action' | 'unit:down' | 'onemore'
  | 'highlight' | 'holdup' | 'allout' | 'talk:start' | 'talk:result' | 'battle:end'
  | 'map:move' | 'map:encounter' | 'ui:open' | 'ui:close' | 'env:change'
  // v1.3 §3a 第一批
  | 'baton' | 'persona:switch' | 'shield:break' | 'levelup' | 'card:pick' | 'buff:grant' | 'boss:phase' | 'fusion:result'
  // v1.3 §3b 第二批
  | 'shop:enter' | 'shop:exit' | 'party:switch' | 'bond:assist' | 'ailment:apply' | 'ailment:cure' | 'escape'
  | 'velvet:alarm' | 'fusion:accident' | 'callingcard:send' | 'explore:scan' | 'achievement:unlock'
  | 'persona:levelup' | 'bond:rankup' | 'bgm:cue'
  // v1.3 §3c / §3d
  | 'holdup:result' | 'explore:move' | 'explore:cover' | 'explore:spotted' | 'explore:interact'
  // v1.3 §3e 音频与零散
  | 'ui:cursor' | 'ui:confirm' | 'ui:cancel' | 'ui:page' | 'ui:error' | 'item:get' | 'money:get' | 'shop:buy'
  | 'skill:learn' | 'unit:spawn' | 'unit:flee' | 'unit:revive' | 'unit:lowhp' | 'intent:show' | 'navi:scan'
  | 'explore:sneak' | 'alert:change' | 'explore:exit' | 'boss:intro' | 'run:fail' | 'run:retreat';

export type PrimitiveName =
  | 'tween' | 'show' | 'hide' | 'sfx' | 'vibrate' | 'title' | 'dim' | 'radialBurst'
  | 'hitStop' | 'shake' | 'flashSprite' | 'flashScreen' | 'squashHit' | 'particles' | 'afterimage' | 'slashLine'
  | 'damageNumber' | 'tag' | 'shockwave' | 'rgbSplit'
  | 'cutin' | 'speedLines' | 'banner' | 'silhouetteDash' | 'freezeFrame' | 'finishCard' | 'totalDamage'
  | 'slashPanels' | 'maskWipe' | 'blockPush' | 'tvStatic' | 'glassShatter' | 'cardFlip' | 'cardShatter' | 'dateFlip' | 'bakedSwap'
  | 'portraitDown' | 'skinFilter'
  // v1.3 17 个新原语
  | 'summon' | 'personaShow' | 'nameplate' | 'pose' | 'batonPass' | 'showtimeLogo'
  | 'eyeStrip' | 'onomatopoeia' | 'checkerFloor' | 'ringSplash'
  | 'comicPanels' | 'duoEntrance' | 'duoStrike' | 'duoTitle' | 'maskRip' | 'camera' | 'holdupRing';

export interface SfxStep {
  id: string;
  at: Ms;
  bus?: 'se' | 'voice';
  unit?: string;
  key?: string;
}

export interface Track {
  at: Ms;
  dur?: Ms;
  prim: PrimitiveName;
  layer?: Layer;
  ease?: Ease;
  args: Record<string, unknown>;
  repeatEvery?: Ms;
  times?: number;
  minimal?: 'keep' | 'skip' | Partial<Track>;
}

export interface Recipe {
  id: string;
  event: EventName;
  match?: {
    skillId?: string;
    element?: string;
    actorId?: string;
    partySize?: number;
    kind?: 'phys' | 'magic' | 'heal' | 'buff' | string;
    summon?: 'full' | 'quick';
    side?: 'ally' | 'enemy';
    env?: Partial<Pick<Env, 'weather' | 'moonPhase' | 'darkHour' | 'weekday'>>;
    hit?: 'weak' | 'crit' | 'resist' | 'drain' | 'repel' | 'miss';
    highlight?: 'solo' | 'duo';
    pairIds?: [string, string];
    choice?: 'allout' | 'talk' | 'release';
    status?: string;
    skinShopId?: string;
    result?: 'success' | 'fail';
  };
  duration: Ms;
  hitMarks?: Ms[];
  merges?: ['battle:start'];
  create?: { name: string; asset: string; layer: Layer; anchor?: [number, number] }[];
  tracks: Track[];
  assets: string[];
  sfx?: SfxStep[];
  bgm?: { cueId: string; crossfadeMs?: number };
}

type DeepReadonly<T> = { readonly [K in keyof T]: DeepReadonly<T[K]> };

export interface HitResult {
  targetId: string;
  dmg: number;
  weak: boolean;
  crit: boolean;
  miss: boolean;
  resist: 'none' | 'resist' | 'null' | 'repel' | 'drain';
  element: string;
  down: boolean;
  shieldBroken?: boolean;
}

export type ActionPayload = DeepReadonly<{
  actorId: string;
  skillId: string;
  targetIds: string[];
  hits: HitResult[];
  side?: 'ally' | 'enemy';
}>;

export type AllOutPayload = DeepReadonly<{
  partyIds: string[];
  finisherId: string;
  total: number;
  hits: HitResult[];
}>;

export type DownPayload = DeepReadonly<{ unitIds: string[]; side: 'ally' | 'enemy' }>;
export type EnvChangePayload = DeepReadonly<{ prev: Env; next: Env; changed: (keyof Env)[] }>;
export type BattleEndPayload = DeepReadonly<{
  win: boolean;
  rank: string;
  exp: number;
  money: number;
  drops: { id: string; name: string; n: number }[];
}>;

export type HoldupPayload = DeepReadonly<{ enemyIds: string[]; partyIds: string[] }>;
export type HoldupResultPayload = DeepReadonly<{
  choice: 'allout' | 'talk' | 'release';
  enemyIds: string[];
}>;
export type HighlightPayload = DeepReadonly<ActionPayload & {
  kind: 'solo' | 'duo';
  pairIds?: [string, string];
}>;
export type BatonPayload = DeepReadonly<{ fromId: string; toId: string; bonus: 1 | 2 | 3 }>;
export type LevelupPayload = DeepReadonly<{
  unitIds: string[];
  stats: { id: string; lv: number; delta: Record<string, number> }[];
}>;
export type BgmCuePayload = DeepReadonly<{
  cueId: string | null;
  crossfadeMs?: number;
  loop?: boolean;
  cond?: Record<string, string | boolean>;
}>;

export interface Env {
  date: string;
  weekday: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
  weather: 'clear' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'fog' | 'unknown';
  moonPhase: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  darkHour: boolean;
}

export interface ShowCtx {
  signal: AbortSignal;
  speed: 1 | 2 | 3;
  level: 'full' | 'standard' | 'minimal';
  tier: 'high' | 'mid' | 'low';
  env: DeepReadonly<Env>;
}

export interface TalkTemplate {
  html: string;
  params?: { styleId?: string; maxLineChars?: number; typingCps?: number };
}
