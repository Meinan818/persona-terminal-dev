import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogPersonaChoices, createDefaultBattle } from './p5-combat-rules.js';

const steady = () => 0.5;

function forceHoldUp(battle) {
  for (const enemy of battle.enemies) enemy.down = true;
  battle.phase = 'holdUp';
  battle.currentId = 'hero';
}

test('开局从 P5R 目录生成四人小队，不再硬编码旧面具', () => {
  const battle = createDefaultBattle({ rng: steady });
  const snap = battle.snapshot();
  assert.equal(snap.party.length, 4);
  assert.equal(snap.enemies.length, 2);
  assert.equal(snap.actor, '你');
  assert.equal(snap.persona, '亚森');
  assert.equal(snap.phase, 'party');
  assert.equal(catalogPersonaChoices().length, 232);
});

test('电击弱点触发倒地与 1 MORE', () => {
  const battle = createDefaultBattle({ rng: steady, activePersonaId: 'pixie' });
  assert.deepEqual(battle.snapshot().enemies[0].knownAffinities, {});
  assert.equal(battle.actor.name, '你');
  assert.equal(battle.currentPersona.name, '皮克希');
  assert.equal(battle.act({ type: 'skill', id: 'Zio', targetId: 'a' }).ok, true);
  const enemy = battle.enemies.find(e => e.id === 'a');
  assert.equal(enemy.down, true);
  assert.equal(enemy.knownAffinities.electric, 'weak');
  assert.equal(battle.extraId, 'hero');
  assert.match(battle.log.join('\n'), /1 MORE/);
});

test('BATON PASS 把追加行动交给队友并提高伤害', () => {
  const battle = createDefaultBattle({ rng: steady, activePersonaId: 'pixie' });
  battle.act({ type: 'skill', id: 'Zio', targetId: 'a' });
  assert.equal(battle.act({ type: 'batonPass', targetId: 'ally:silky' }).ok, true);
  assert.equal(battle.actor.name, '希路奇');
  assert.equal(battle.party[0].acted, true);
  assert.equal(battle.batonChain, 1);
  assert.equal(battle.batonBoost, 0.25);
  assert.match(battle.log.join('\n'), /BATON PASS/);
});

test('洞察会主动揭示目标的一项未发现耐性', () => {
  const battle = createDefaultBattle({ rng: steady });
  const before = battle.snapshot().enemies[0].knownAffinities;
  assert.deepEqual(before, {});
  const spBefore = battle.actor.sp;
  assert.equal(battle.act({ type: 'analyze', targetId: 'a' }).ok, true);
  assert.equal(battle.actor?.id, 'ally:silky');
  assert.equal(battle.party[0].sp, spBefore - 2);
  assert.equal(battle.enemies[0].knownAffinities.electric, 'weak');
});

test('所有人倒地后进入 HOLD UP，总攻击造成全体伤害', () => {
  const battle = createDefaultBattle({ rng: steady });
  forceHoldUp(battle);
  const before = battle.enemies.map(e => e.hp);
  assert.equal(battle.holdUp({ type: 'allOut' }).ok, true);
  const after = battle.enemies.map(e => e.hp);
  assert.ok(after[0] < before[0]);
  assert.ok(after[1] < before[1]);
  assert.equal(battle.phase, 'party');
});

test('睡眠后用枪击触发 TECHNICAL', () => {
  const battle = createDefaultBattle({ rng: steady, activePersonaId: 'pixie' });
  battle.currentId = 'ally:silky';
  battle.phase = 'party';
  assert.equal(battle.act({ type: 'skill', id: 'Dormina', targetId: 'b' }).ok, true);
  assert.equal(battle.enemies.find(e => e.id === 'b').status, 'sleep');
  battle.currentId = 'hero';
  battle.phase = 'party';
  assert.equal(battle.act({ type: 'gun', targetId: 'b' }).ok, true);
  assert.match(battle.log.join('\n'), /TECHNICAL/);
});

test('无效属性不会造成伤害、倒地或 1 MORE', () => {
  const battle = createDefaultBattle({
    rng: steady,
    activePersonaId: 'pixie',
    enemies: [{
      id: 'null-test',
      name: '无属性之影',
      maxHp: 50,
      attack: 10,
      null: ['electric'],
    }],
  });
  assert.equal(battle.act({ type: 'skill', id: 'Zio', targetId: 'null-test' }).ok, true);
  const enemy = battle.enemies[0];
  assert.equal(enemy.hp, 50);
  assert.equal(enemy.down, false);
  assert.equal(battle.extraId, null);
  assert.equal(enemy.knownAffinities.electric, 'null');
});

test('普通命中只结算伤害，不污染“已发现耐性”列表', () => {
  const battle = createDefaultBattle({ rng: steady });
  assert.equal(battle.act({ type: 'skill', id: 'Eiha', targetId: 'a' }).ok, true);
  assert.equal(battle.enemies[0].hp < battle.enemies[0].maxHp, true);
  assert.deepEqual(battle.enemies[0].knownAffinities, {});
});

test('交涉成功收服 P5R 目录里的真实 Persona', () => {
  const win = createDefaultBattle({ rng: () => 0.01 });
  forceHoldUp(win);
  assert.equal(win.holdUp({ type: 'negotiate', enemyId: 'a', option: 'bribe' }).ok, true);
  assert.equal(win.phase, 'negotiation');
  assert.equal(win.chooseResult('recruit').ok, true);
  assert.equal(win.phase, 'result');
  assert.equal(win.result.type, 'recruited');
  assert.equal(win.result.personaId, 'agathion');
  assert.equal(win.result.name, '阿珈席翁');

  const lose = createDefaultBattle({ rng: () => 0.99 });
  forceHoldUp(lose);
  assert.equal(lose.holdUp({ type: 'negotiate', enemyId: 'a', option: 'bribe' }).ok, true);
  assert.equal(lose.enemies.find(e => e.id === 'a').enraged, true);
  assert.equal(lose.enemies.find(e => e.id === 'a').down, false);
});

test('换面具消耗主角本回合行动，随后交给队友', () => {
  const battle = createDefaultBattle({ rng: steady });
  assert.equal(battle.act({ type: 'switchMask', id: 'pixie' }).ok, true);
  assert.equal(battle.party[0].activeMask, 'pixie');
  assert.equal(battle.party[0].acted, true);
  assert.equal(battle.actor.name, '希路奇');
});

test('枪有弹药限制，防御会进入防御状态', () => {
  const battle = createDefaultBattle({ rng: steady });
  const hero = battle.party[0];
  assert.equal(battle.act({ type: 'gun' }).ok, true);
  assert.equal(hero.ammo, 2);
  battle.currentId = 'ally:silky';
  battle.phase = 'party';
  assert.equal(battle.act({ type: 'guard' }).ok, true);
  assert.equal(battle.party[1].guarding, true);
});
