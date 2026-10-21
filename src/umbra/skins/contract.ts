export type UmbraSkinId = 'p5r-red' | 'p4-yellow' | 'p3-blue' | 'p3r-pink';

export type UmbraPrimitive =
  | 'tween' | 'show' | 'hide' | 'sfx' | 'vibrate' | 'title'
  | 'dim' | 'radialBurst' | 'hitStop' | 'shake' | 'flashSprite'
  | 'flashScreen' | 'squashHit' | 'particles' | 'afterimage'
  | 'slashLine' | 'damageNumber' | 'tag' | 'shockwave' | 'rgbSplit'
  | 'cutin' | 'speedLines' | 'banner' | 'silhouetteDash'
  | 'freezeFrame' | 'finishCard' | 'totalDamage' | 'slashPanels'
  | 'maskWipe' | 'blockPush' | 'tvStatic' | 'glassShatter'
  | 'cardFlip' | 'cardShatter' | 'dateFlip' | 'bakedSwap'
  | 'portraitDown' | 'skinFilter';

export interface UmbraTrack {
  at: number;
  dur?: number;
  prim: UmbraPrimitive;
  layer?: string;
  ease?: string;
  args?: Record<string, unknown>;
}

export interface UmbraRecipe {
  id: string;
  event: string;
  duration: number;
  match?: Record<string, unknown>;
  tracks: UmbraTrack[];
  assets?: string[];
}

export interface UmbraManifestAsset {
  id: string;
  file: string;
  w: number;
  h: number;
  source: 'official' | 'generated';
}

export interface EnemyLayout {
  x: number;
  y: number;
  scale: number;
  layer: string;
}

export type EnemyLayoutMap = Record<1 | 2 | 3 | 4 | 5, EnemyLayout[]>;

export interface UmbraSkinPack {
  id: UmbraSkinId;
  manifest: {
    assets: UmbraManifestAsset[];
    filters?: string[];
    fonts?: Record<string, unknown>[];
  };
  tokens: Record<string, string>;
  recipes: UmbraRecipe[];
  labels: Record<string, string>;
  enemyLayouts: EnemyLayoutMap;
}
