import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultBattle } from './p5-combat-rules.js';

const steady = () => 0.5;

function forceHoldUp(battle) {
  for (const enemy of battle.enemies) enemy.down = true;
  battle.phase = 'holdUp';
  battle.currentId = 'hero';
}

test('开局是三人小队对两个影子，主角先手', () => {
  const battle = createDefaultBattle({ rng: steady });
  const snap = battle.snapshot();
  assert.equal(snap.party.length, 3);
  assert.equal(snap.enemies.length, 2);
  assert.equal(snap.actor, '你');
  assert.equal(snap.phase, 'party');
});

test('打中弱点会倒地并给 1 MORE', () => {
  const battle = createDefaultBattle({ rng: steady });
  assert.equal(battle.act({ type: 'switchMask', id: 'guts' }).ok, true);
  assert.equal(battle.act({ type: 'skill', id: 'thrust' }).ok, true);
  const enemy = battle.enemies.find(e => e.id === 'a');
  assert.equal(enemy.down, true);
  assert.equal(battle.extraId, 'hero');
  assert.equal(battle.snapshot().actor, '你');
  assert.match(battle.log.join('\n'), /1 MORE/);
});

test('BATON PASS 把追加行动交给队友并提高伤害', () => {
  const battle = createDefaultBattle({ rng: steady });
  battle.act({ type: 'switchMask', id: 'guts' });
  battle.act({ type: 'skill', id: 'thrust' });
  assert.equal(battle.act({ type: 'batonPass', targetId: 'allyEcho' }).ok, true);
  assert.equal(battle.snapshot().actor, '回声');
  assert.equal(battle.batonChain, 1);
  assert.equal(battle.batonBoost, 0.25);
  assert.match(battle.log.join('\n'), /BATON PASS/);
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

test('技术伤害：先冻结，再用勇气打出 TECHNICAL', () => {
  const battle = createDefaultBattle({ rng: steady });
  battle.currentId = 'allyHealer';
  assert.equal(battle.act({ type: 'skill', id: 'frost', targetId: 'b' }).ok, true);
  const enemy = battle.enemies.find(e => e.id === 'b');
  assert.equal(enemy.status, 'freeze');
  battle.currentId = 'hero';
  battle.phase = 'party';
  battle.act({ type: 'switchMask', id: 'guts' });
  assert.equal(battle.act({ type: 'skill', id: 'thrust', targetId: 'b' }).ok, true);
  assert.match(battle.log.join('\n'), /TECHNICAL/);
  assert.equal(enemy.down, true);
});

test('交涉成功可以收服影子，失败会激怒它', () => {
  const win = createDefaultBattle({ rng: () => 0.01 });
  forceHoldUp(win);
  assert.equal(win.holdUp({ type: 'negotiate', enemyId: 'a', option: 'bribe' }).ok, true);
  assert.equal(win.phase, 'negotiation');
  assert.equal(win.chooseResult('recruit').ok, true);
  assert.equal(win.phase, 'result');
  assert.equal(win.result.type, 'recruited');
  assert.equal(win.result.name, '诡辩的假面');

  const lose = createDefaultBattle({ rng: () => 0.99 });
  forceHoldUp(lose);
  assert.equal(lose.holdUp({ type: 'negotiate', enemyId: 'a', option: 'bribe' }).ok, true);
  assert.equal(lose.enemies.find(e => e.id === 'a').enraged, true);
  assert.equal(lose.enemies.find(e => e.id === 'a').down, false);
});

test('枪有弹药限制，防御会减伤', () => {
  const battle = createDefaultBattle({ rng: steady });
  const hero = battle.party[0];
  assert.equal(battle.act({ type: 'gun' }).ok, true);
  assert.equal(hero.ammo, 2);
  const hpBefore = battle.party[1].hp;
  battle.currentId = 'allyHealer';
  battle.phase = 'party';
  assert.equal(battle.act({ type: 'guard' }).ok, true);
  assert.equal(battle.party[1].guarding, true);
  assert.ok(battle.party[1].hp >= hpBefore);
});
