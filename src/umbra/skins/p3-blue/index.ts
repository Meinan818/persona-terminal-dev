// p3-blue · SkinPack 组装与注册（仅组装，不含演出代码；全部静态 import）
import { UMBRA } from '../../engine';
import type { SkinPack, Manifest, Tokens, SlotMap, Recipe, TalkTemplate } from '../_contract';
import manifest from './manifest.json';
import tokens from './tokens.json';
import slots from './slots.json';
import labels from './labels.json';
import templates from './templates.json';
import r0 from './recipes/action.agi.json';
import r1 from './recipes/action.bash.json';
import r2 from './recipes/action.default.json';
import r3 from './recipes/allout.default.json';
import r4 from './recipes/battle.end.json';
import r5 from './recipes/env.darkHour.enter.json';
import r6 from './recipes/env.darkHour.leave.json';
import r7 from './recipes/highlight.hero.json';
import r8 from './recipes/highlight.hero.short.json';
import r9 from './recipes/holdup.json';
import r10 from './recipes/onemore.json';
import r11 from './recipes/summon.evoker.json';
import r12 from './recipes/transition.battleStart.json';
import r13 from './recipes/transition.encounterBattle.json';
import r14 from './recipes/unit.down.json';

const pack: SkinPack = {
  id: 'p3-blue',
  manifest: manifest as unknown as Manifest,
  tokens: tokens as unknown as Tokens,
  slots: slots as unknown as SlotMap,
  recipes: [r0, r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14] as unknown as Recipe[],
  labels: labels as Record<string, string>,
  templates: templates as unknown as { talk?: TalkTemplate },
};

UMBRA.registerSkin(pack.id, pack);
export default pack;
