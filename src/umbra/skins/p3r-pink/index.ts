// p3r-pink · SkinPack 组装与注册（§0.1 / §7.3）：只组装 + registerSkin；无演出代码、无动态 import、全部静态 JSON import。
import { UMBRA } from '../../engine';
import type { SkinPack, Manifest, Tokens, SlotMap, Recipe, TalkTemplate } from '../_contract';
import manifest from './manifest.json';
import tokens from './tokens.json';
import slots from './slots.json';
import labels from './labels.json';
import templates from './templates.json';
import r0 from './recipes/action.agilao.json';
import r1 from './recipes/action.cadenza.json';
import r2 from './recipes/action.default.json';
import r3 from './recipes/action.persona.default.json';
import r4 from './recipes/allout.default.json';
import r5 from './recipes/battle.end.json';
import r6 from './recipes/env.darkHour.enter.json';
import r7 from './recipes/env.darkHour.leave.json';
import r8 from './recipes/highlight.hamuko.json';
import r9 from './recipes/highlight.hamuko.short.json';
import r10 from './recipes/holdup.json';
import r11 from './recipes/onemore.json';
import r12 from './recipes/talk.start.json';
import r13 from './recipes/transition.battleStart.json';
import r14 from './recipes/transition.encounterBattle.json';
import r15 from './recipes/unit.down.json';

const pack: SkinPack = {
  id: 'p3r-pink',
  manifest: manifest as unknown as Manifest,
  tokens: tokens as unknown as Tokens,
  slots: slots as unknown as SlotMap,
  recipes: [r0, r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15] as unknown as Recipe[],
  labels: labels as Record<string, string>,
  templates: templates as unknown as { talk?: TalkTemplate },
};

UMBRA.registerSkin(pack.id, pack);
export default pack;
