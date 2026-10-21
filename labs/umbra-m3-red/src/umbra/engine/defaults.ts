// 引擎默认兜底演出（皮肤没实现的事件用它；红色样板的通用简版）。
import type { Recipe } from '../skins/_contract';
const t = (at: number, prim: any, args: any = {}, dur?: number) => ({ at, prim, args, ...(dur !== undefined ? { dur } : {}) });
export const DEFAULT_RECIPES: Recipe[] = [
  { id: 'default.action', event: 'action', duration: 700, hitMarks: [300], assets: [], tracks: [
    t(300, 'hitStop', { ms: 50 }), t(300, 'shake', { px: 10 }), t(300, 'flashSprite', { target: '$targets', ms: 40 }),
    t(300, 'squashHit', { target: '$targets', squash: 0.15, push: 14, recoverMs: 260 }), t(300, 'damageNumber', {}, 380), t(300, 'tag', { kind: 'auto' }, 380)] },
  { id: 'default.down', event: 'unit:down', duration: 400, assets: [], tracks: [t(0, 'portraitDown', {}, 380)] },
  { id: 'default.onemore', event: 'onemore', duration: 400, assets: [], tracks: [t(0, 'banner', { text: 'label.onemore' }, 400)] },
  { id: 'default.holdup', event: 'holdup', duration: 800, assets: [], tracks: [t(0, 'banner', { text: 'label.holdup', shape: 'holdup' }, 450)] },
  { id: 'default.allout', event: 'allout', duration: 1600, assets: [], tracks: [t(0, 'dim', { color: '#000', alpha: 0.6 }, 1600), t(200, 'damageNumber', { hit: 0, big: true }, 900)] },
  { id: 'default.start', event: 'battle:start', duration: 600, assets: [], tracks: [t(0, 'slashPanels', { colors: ['#000'] }, 600)] },
  { id: 'default.end', event: 'battle:end', duration: 500, assets: [], tracks: [t(0, 'flashScreen', { color: '#fff', alpha: 0.5 }, 150)] },
  { id: 'default.turn', event: 'turn:start', duration: 100, assets: [], tracks: [] },
  { id: 'default.talkStart', event: 'talk:start', duration: 300, assets: [], tracks: [] },
  { id: 'default.talkResult', event: 'talk:result', duration: 400, assets: [], tracks: [] },
] as Recipe[];
