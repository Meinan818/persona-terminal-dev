import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_ALLY_PERSONAS,
  DEFAULT_HERO_MASKS,
  activeHeroPersonaId,
  applyBattleReward,
  applyBattleItem,
  battleReceipt,
  buildActionPayload,
  buildBattleView,
  createTowerBattle,
  promoteBossPhase,
  syncAppState,
} from './p5-battle-bridge.js';

const steady = () => 0.5;

function towerBattle(overrides = {}) {
  return createTowerBattle({
    rng: steady,
    floor: 4,
    encounter: {
      name: '聒噪的假面',
      level: 4,
      weakness: 'electric',
      maxHp: 68,
      attack: 16,
      defense: 7,
      recruitPersonaId: 'agathion',
    },
    ...overrides,
  });
}

test('塔层遭遇会生成目录 Persona 小队和真实弱点目标', () => {
  const battle = towerBattle();
  const view = buildBattleView(battle, 'primary');
  assert.equal(view.party.length, 4);
  assert.equal(view.actorName, '你');
  assert.equal(view.actorPersona, '亚森');
  assert.equal(view.selectedTarget.name, '聒噪的假面');
  assert.equal(battle.enemies[0].weakness, 'electric');
  assert.equal(battle.enemies[0].recruit.name, '阿珈席翁');
  assert.equal(DEFAULT_HERO_MASKS.includes('izanagi'), true);
  assert.equal(DEFAULT_ALLY_PERSONAS.includes('cait-sith'), true);
});

test('普通塔层生成双目标，切换目标不会改变行动者', () => {
  const battle = towerBattle({ floor: 5 });
  const first = buildBattleView(battle, 'primary');
  const second = buildBattleView(battle, 'echo');
  assert.equal(first.enemies.length, 2);
  assert.equal(second.selectedTarget.id, 'echo');
  assert.equal(second.actorId, first.actorId);
  assert.notEqual(second.selectedTarget.name, first.selectedTarget.name);
});

test('视图暴露真实技能并把选中的敌人写入行动参数', () => {
  const battle = towerBattle();
  const view = buildBattleView(battle, 'primary');
  const skill = view.actions.find(action => action.type === 'skill');
  assert.ok(skill);
  assert.deepEqual(buildActionPayload(skill, 'primary'), {
    type: 'skill',
    id: skill.id,
    targetId: 'primary',
  });
  assert.equal(view.actorIsPlayer, true);
  assert.equal(view.actions.some(action => action.type === 'gun'), true);
});

test('行动后视图跟随下一名队员，而旧 app 状态仍保存主角 HP/SP', () => {
  const battle = towerBattle();
  const hero = battle.party.find(member => member.isPlayer);
  const ally = battle.party.find(member => !member.isPlayer);
  hero.hp = 41;
  hero.sp = 23;
  ally.hp = 7;
  assert.equal(battle.act({ type: 'basic', targetId: 'primary' }).ok, true);
  const view = buildBattleView(battle, 'primary');
  const state = {};
  syncAppState(battle, state, 'primary');
  assert.equal(view.actorId, ally.id);
  assert.equal(state.hp, 41);
  assert.equal(state.sp, 23);
  assert.equal(state.currentActorId, ally.id);
  assert.equal(state.turn, battle.round);
});

test('HOLD UP 视图保留目标，并可从引擎回执读取收服结果', () => {
  const battle = towerBattle();
  for (const enemy of battle.enemies) enemy.down = true;
  battle.phase = 'holdUp';
  battle.currentId = battle.party.find(member => member.isPlayer).id;
  const view = buildBattleView(battle, 'primary');
  assert.equal(view.holdUp, true);
  assert.equal(battle.holdUp({ type: 'negotiate', enemyId: 'primary', option: 'bribe' }).ok, true);
  assert.equal(battle.phase, 'negotiation');
  battle.chooseResult('recruit');
  const receipt = battleReceipt(battle);
  assert.equal(receipt.won, true);
  assert.equal(receipt.recruited.id, 'agathion');
  assert.match(receipt.summary, /收服/);
});

test('奖励只写入角色 SP，并按上限截断', () => {
  const battle = towerBattle();
  const hero = battle.party.find(member => member.isPlayer);
  hero.sp = hero.maxSp - 3;
  const gained = applyBattleReward(battle, { sp: 30, item: '碎片' });
  assert.equal(gained, 3);
  assert.equal(hero.sp, hero.maxSp);
  const receipt = battleReceipt({
    ...battle,
    phase: 'result',
    result: { type: 'reward', sp: 12, item: '游荡的碎片' },
  });
  assert.equal(receipt.reward.item, '游荡的碎片');
  assert.match(receipt.summary, /游荡的碎片/);
});

test('Boss 第二形态恢复为可持续战斗的新形态', () => {
  const battle = towerBattle({ boss: true, floor: 10 });
  const enemy = battle.enemies[0];
  const oldMax = enemy.maxHp;
  enemy.hp = 0;
  battle.phase = 'victory';
  promoteBossPhase(battle);
  assert.equal(battle.phase, 'party');
  assert.equal(enemy.hp, enemy.maxHp);
  assert.ok(enemy.maxHp > oldMax);
  assert.equal(battle.actor.isPlayer, true);
  assert.equal(battle.currentPersona.name, '亚森');
});

test('面具索引会稳定映射到主战 Persona', () => {
  assert.equal(activeHeroPersonaId(DEFAULT_HERO_MASKS, 0), 'arsene');
  assert.equal(activeHeroPersonaId(DEFAULT_HERO_MASKS, 2), 'jack-o-lantern');
  assert.equal(activeHeroPersonaId(DEFAULT_HERO_MASKS, 5), 'izanagi');
});

test('再次进塔会沿用主角当前 HP/SP，而不是悄悄回满', () => {
  const battle = towerBattle({ heroHp: 17, heroSp: 9 });
  const hero = battle.party.find(member => member.isPlayer);
  assert.equal(hero.hp, 17);
  assert.equal(hero.sp, 9);
});

test('同伴 HP/SP 也能跨战斗沿用', () => {
  const first = towerBattle();
  const ally = first.party.find(member => member.id === 'ally:cait-sith');
  ally.hp = 11;
  ally.sp = 7;
  const state = {};
  syncAppState(first, state, 'primary');
  const next = towerBattle({ partyVitals: state.partyVitals });
  const nextAlly = next.party.find(member => member.id === 'ally:cait-sith');
  assert.equal(nextAlly.hp, 11);
  assert.equal(nextAlly.sp, 7);
});

test('战斗道具会回复目标、消耗行动并拒绝非战斗道具', () => {
  const battle = towerBattle();
  const hero = battle.party.find(member => member.isPlayer);
  hero.hp = 20;
  const result = applyBattleItem(battle, { kind: 'heal', name: '小瓶止痛药', hp: 40 });
  assert.equal(result.ok, true);
  assert.equal(result.amount, 32);
  assert.equal(hero.hp, hero.maxHp);
  assert.equal(battle.actor.id, 'ally:cait-sith');
  const rejected = applyBattleItem(battle, { kind: 'material', name: '火之碎片' });
  assert.equal(rejected.ok, false);
});
