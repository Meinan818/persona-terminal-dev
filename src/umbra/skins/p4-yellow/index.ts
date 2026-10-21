// p4-yellow 皮肤包：只组装 SkinPack 并注册（§0.1 / §7.3）。无演出代码、无动态 import。
import { UMBRA } from '../../engine';
import type { SkinPack } from '../_contract';
import manifest from './manifest.json';
import tokens from './tokens.json';
import slots from './slots.json';
import labels from './labels.json';
import templates from './templates.json';
import r_action_brave_blade from './recipes/action.brave-blade.json';
import r_action_default from './recipes/action.default.json';
import r_action_ziodyne from './recipes/action.ziodyne.json';
import r_allout_default from './recipes/allout.default.json';
import r_battle_end from './recipes/battle.end.json';
import r_env_date_flip from './recipes/env.date.flip.json';
import r_highlight_hero from './recipes/highlight.hero.json';
import r_highlight_hero_short from './recipes/highlight.hero.short.json';
import r_holdup from './recipes/holdup.json';
import r_onemore from './recipes/onemore.json';
import r_scene_enter_world from './recipes/scene.enter.world.json';
import r_scene_leave_world from './recipes/scene.leave.world.json';
import r_talk_start from './recipes/talk.start.json';
import r_transition_battleStart from './recipes/transition.battleStart.json';
import r_transition_encounterBattle from './recipes/transition.encounterBattle.json';
import r_unit_down from './recipes/unit.down.json';

const pack = {
  id: 'p4-yellow',
  manifest,
  tokens,
  slots,
  recipes: [
    r_action_brave_blade,
    r_action_default,
    r_action_ziodyne,
    r_allout_default,
    r_battle_end,
    r_env_date_flip,
    r_highlight_hero,
    r_highlight_hero_short,
    r_holdup,
    r_onemore,
    r_scene_enter_world,
    r_scene_leave_world,
    r_talk_start,
    r_transition_battleStart,
    r_transition_encounterBattle,
    r_unit_down,
  ],
  labels,
  templates,
} as unknown as SkinPack;

UMBRA.registerSkin(pack.id, pack);

export default pack;
