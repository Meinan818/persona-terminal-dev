// UMBRA 演出接入契约 v1.2 · §2 Recipe schema（M3 定稿候选，与 CONTRACT-v1.2.md 逐字段对应）
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
  | 'scene:enter' | 'scene:leave' | 'battle:start' | 'turn:start'
  | 'action' | 'unit:down' | 'onemore' | 'highlight' | 'holdup'
  | 'baton' | 'levelup'   // v1.3 提案（FX-MAP 🆕）：接力交接、升级卡
  | 'allout' | 'talk:start' | 'talk:result' | 'battle:end'
  | 'map:move' | 'map:encounter' | 'ui:open' | 'ui:close'
  | 'env:change'
  // v1.3 §3a/§3b/§3d/§3e（M4 流程用到的子集）：探索、预告信、BOSS、心之卡、失败/撤退/逃跑
  | 'explore:move' | 'explore:sneak' | 'explore:cover' | 'explore:spotted' | 'explore:interact' | 'explore:exit' | 'explore:scan'
  | 'callingcard:send' | 'boss:intro' | 'boss:phase' | 'card:pick' | 'run:fail' | 'run:retreat' | 'escape' | 'unit:revive'
  // M5：据点商店进/离店（§3b）与天鹅绒合成（§3a）
  | 'shop:enter' | 'shop:exit' | 'fusion:result';

export type PrimitiveName =
  | 'tween' | 'show' | 'hide' | 'sfx' | 'vibrate' | 'title' | 'dim' | 'radialBurst'
  | 'hitStop' | 'shake' | 'flashSprite' | 'flashScreen' | 'squashHit' | 'particles' | 'afterimage' | 'slashLine'
  | 'damageNumber' | 'tag' | 'shockwave' | 'rgbSplit'
  | 'cutin' | 'speedLines' | 'banner' | 'silhouetteDash' | 'freezeFrame' | 'finishCard' | 'totalDamage'
  | 'slashPanels' | 'maskWipe' | 'blockPush' | 'tvStatic' | 'glassShatter' | 'cardFlip' | 'cardShatter' | 'dateFlip' | 'bakedSwap'
  | 'portraitDown' | 'skinFilter'
  // M3 第二阶段新增（v1.3 提案）：人格面具召唤、场上显形、技能名牌、2D 骨骼姿态；P3/P4 原语
  | 'summon' | 'personaShow' | 'nameplate' | 'pose' | 'batonPass' | 'showtimeLogo'
  | 'eyeStrip' | 'onomatopoeia' | 'checkerFloor' | 'ringSplash'
  // M3 第四阶段（v1.3 提案）：SHOWTIME 四段、开战扯面具
  | 'comicPanels' | 'duoEntrance' | 'duoStrike' | 'duoTitle' | 'maskRip'
  // M3 第五阶段（v1.3 提案）：伪 3D 镜头、HOLD UP 包围
  | 'camera' | 'holdupRing'
  // M4b（v1.4 提案）：格子层原语（探索 Q 版棋盘；宿主注册 BoardAdapter，引擎原语只读它）+ 通用素材精灵
  | 'gridWalk' | 'gridMark' | 'gridSquash' | 'gridProp' | 'gridShake' | 'gridScan' | 'sprite';

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
    skillId?: string; element?: string; actorId?: string; partySize?: number; kind?: 'phys' | 'magic' | 'heal' | 'buff' | 'chest' | 'device' | 'talk' | string;
    summon?: 'full' | 'quick';  // M3 第二阶段提案：同场首次召唤完整版 / 之后快速版（宿主按「该角色本场是否已召唤」传入）
    side?: 'ally' | 'enemy';
    /** v1.3 §3f：explore:interact 的 kind（chest/device/talk）等；bond:assist 也用 kind */
    choice?: string; result?: string; ok?: boolean;   // v1.2-M3 提案：区分我方/敌方 action（§3 两档上限）。见 M3-RED-REPORT「契约提案」
    env?: Partial<Pick<Env, 'weather' | 'moonPhase' | 'darkHour' | 'weekday'>>;
  };
  duration: Ms;
  hitMarks?: Ms[];
  merges?: ['battle:start'];
  create?: { name: string; asset: string; layer: Layer; anchor?: [number, number] }[];
  tracks: Track[];
  assets: string[];
}

type DeepReadonly<T> = { readonly [K in keyof T]: DeepReadonly<T[K]> };
export interface HitResult {
  targetId: string; dmg: number; weak: boolean; crit: boolean; miss: boolean;
  resist: 'none' | 'resist' | 'null' | 'repel' | 'drain'; element: string; down: boolean; shieldBroken?: boolean;
}
export type ActionPayload = DeepReadonly<{ actorId: string; skillId: string; targetIds: string[]; hits: HitResult[]; side?: 'ally' | 'enemy' }>;
export type AllOutPayload = DeepReadonly<{ partyIds: string[]; finisherId: string; total: number; hits: HitResult[] }>;
export type DownPayload = DeepReadonly<{ unitIds: string[]; side: 'ally' | 'enemy' }>;
export type EnvChangePayload = DeepReadonly<{ prev: Env; next: Env; changed: (keyof Env)[] }>;
export type BattleEndPayload = DeepReadonly<{ win: boolean; rank: string; exp: number; money: number; drops: { id: string; name: string; n: number }[] }>;

export interface Env {
  date: string;
  weekday: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
  weather: 'clear' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'fog' | 'unknown';   // v1.2 新增 storm
  moonPhase: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  darkHour: boolean;
}

export interface ShowCtx {
  signal: AbortSignal; speed: 1 | 2 | 3; level: 'full' | 'standard' | 'minimal'; tier: 'high' | 'mid' | 'low';
  env: DeepReadonly<Env>;
}

export interface TalkTemplate {
  html: string;
  params?: { styleId?: string; maxLineChars?: number; typingCps?: number };
}
