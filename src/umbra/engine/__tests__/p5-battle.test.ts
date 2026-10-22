import { beforeAll, describe, expect, it } from 'vitest';
import {
  buildBattlePersona,
  catalogPersonaChoices,
  catalogPersonaChoicesForSkin,
  createDefaultBattle,
  registerSyntheticPersona,
} from '@/umbra/engine/p5-combat-rules';
import {
  ensureCompendium,
  fusionResult,
  fusionResultForSkin,
} from '@/umbra/engine/p5r-compendium';
import {
  compendiumPersonaIds,
  compendiumSkillIds,
} from '@/umbra/engine/compendiumPreload';
import { generateEncounter } from '@/umbra/rules/encounter';
import { registerSkin, unloadSkin } from '@/umbra/skins/registry';
import { makeTestSkinPack } from '@/umbra/skins/testFixtures';

const steady = () => 0.5;
const createBattle = createDefaultBattle as any;

const spec = (id: string): any => ({
  id,
  name: `测试阴影 ${id}`,
  maxHp: 1,
  attack: 1,
  defense: 0,
  element: 'phys',
  weakness: 'fire',
  resist: 'curse',
  personality: 'proud',
  recruitPersonaId: 'agathion',
  reward: { sp: 1, item: '阴影碎片' },
});

const skinPack = () => makeTestSkinPack('p5r-red', {
  roster: {
    heroPersona: 'arsene',
    companions: ['ryuji'],
    companionPersonas: { ryuji: 'pixie' },
    excludedPersonas: ['izanagi'],
    showtime: [],
  },
  compendiumArt: { arsene: 'red-arsene.png' },
});

const driveBattle = (battle: any): string => {
  let guard = 0;
  while (!['victory', 'defeat', 'result'].includes(battle.phase) && guard < 200) {
    guard += 1;
    if (battle.phase === 'holdUp') battle.holdUp({ type: 'continue' });
    else if (battle.phase === 'negotiation') battle.chooseResult('reward');
    else if (battle.phase === 'result') break;
    else battle.act({ type: 'basic', targetId: battle.aliveEnemies?.[0]?.id });
  }
  return battle.phase;
};

const reachHoldUp = (battle: any): void => {
  for (const enemy of battle.enemies) {
    enemy.hp = Math.max(1, enemy.hp);
    enemy.down = true;
  }
  battle.afterAction(battle.actor);
};

beforeAll(async () => {
  await ensureCompendium({
    personas: compendiumPersonaIds(),
    skills: compendiumSkillIds(),
  });
});

describe('UMBRA formal P5 battle engine', () => {
  it('P5R 图鉴与 Persona 战斗适配可用', () => {
    expect(catalogPersonaChoices()).toHaveLength(232);
    const arsene: any = buildBattlePersona('arsene');
    expect(arsene.id).toBe('arsene');
    expect(arsene.name).toBe('亚森');
    expect(arsene.skills.length).toBeGreaterThan(0);
  });

  it('联机同调可注册不进入图鉴的临时战斗 Persona', () => {
    expect(registerSyntheticPersona({
      id: '__online_test__',
      name: '旅人之面',
      level: 12,
      element: 'almighty',
      elementLabel: '同调',
      maxHp: 96,
      maxSp: 56,
      attack: 32,
      defense: 17,
      resistances: {},
      skills: [{
        id: 'online-test-skill',
        name: '星尘',
        element: 'almighty',
        sourceElement: 'almighty',
        sp: 12,
        power: 28,
        target: 'enemy',
      }],
    })).toBe(true);
    const persona: any = buildBattlePersona('__online_test__');
    expect(persona.name).toBe('旅人之面');
    expect(persona.skills[0].name).toBe('星尘');
    expect(catalogPersonaChoices().some((item: any) => item.id === '__online_test__')).toBe(false);
  });

  it('默认战斗生成四人队伍和两名敌人', () => {
    const battle: any = createBattle({ rng: steady });
    const snapshot = battle.snapshot();
    expect(snapshot.party).toHaveLength(4);
    expect(snapshot.enemies.length).toBeGreaterThanOrEqual(1);
    expect(snapshot.enemies.length).toBeLessThanOrEqual(4);
    expect(snapshot.actor).toBe('你');
    expect(snapshot.persona).toBe('亚森');
    expect(snapshot.phase).toBe('party');
  });

  it('从 skin.roster 推导初始队伍，不写死默认角色 id', () => {
    registerSkin('p5r-red', skinPack());
    const battle: any = createBattle({ rng: steady, roster: skinPack().roster });
    const snapshot = battle.snapshot();
    expect(snapshot.party).toHaveLength(2);
    expect(snapshot.persona).toBe('亚森');
    expect(snapshot.actor).toBe('你');
    unloadSkin('p5r-red');
  });

  it('同伴专属面具从数据表解析，不再被过滤', () => {
    const io: any = buildBattlePersona('io');
    expect(io).not.toBeNull();
    expect(io.name).toBe('Io');

    const battle: any = createBattle({
      rng: steady,
      roster: {
        heroPersona: 'orpheus',
        companions: ['yukari'],
        companionPersonas: { yukari: 'io' },
        excludedPersonas: [],
        showtime: [],
        partyDefault: ['yukari'],
      },
    });
    const snapshot = battle.snapshot();
    expect(snapshot.party).toHaveLength(2);
    expect(snapshot.party[1].name).toBe('Io');
  });

  it('图鉴选择按皮肤 roster 过滤 excludedPersonas', () => {
    registerSkin('p5r-red', skinPack());
    const ids = catalogPersonaChoicesForSkin('p5r-red').map((item: any) => item.id);
    expect(ids).toContain('arsene');
    expect(ids).not.toContain('izanagi');
    unloadSkin('p5r-red');
  });

  it('合成结果按皮肤 roster 过滤 excludedPersonas', () => {
    const choices = catalogPersonaChoices();
    const source = choices[0];
    let result: any = null;
    let other: any = null;
    for (const candidate of choices) {
      const fused: any = fusionResult(source.id, candidate.id);
      if (fused) {
        result = fused;
        other = candidate;
        break;
      }
    }
    expect(result).not.toBeNull();
    registerSkin('p3-blue', makeTestSkinPack('p3-blue', {
      roster: {
        heroPersona: 'orpheus',
        companions: [],
        companionPersonas: {},
        excludedPersonas: [result.id],
        showtime: [],
      },
    }));
    expect(fusionResultForSkin(source.id, other.id, 'p3-blue')).toBeNull();
    unloadSkin('p3-blue');
  });

  it.each([1, 3, 5])('%i 只敌人能跑完整战斗流程', (count) => {
    const enemies = Array.from({ length: count }, (_, index) => spec(`e${index + 1}`));
    const battle: any = createBattle({ rng: steady, enemies });
    const phase = driveBattle(battle);
    expect(['victory', 'result']).toContain(phase);
  });

  it.each([1, 3, 5])('%i 只敌人 HOLD UP 后放过走完整事件序列', (count) => {
    const enemies = Array.from({ length: count }, (_, index) => spec(`e${index + 1}`));
    const battle: any = createBattle({ rng: steady, enemies });
    reachHoldUp(battle);
    expect(battle.phase).toBe('holdUp');
    const holdup = battle.events.find((event: any) => event.name === 'holdup');
    expect(holdup.payload.enemyIds).toHaveLength(count);

    battle.holdUp({ type: 'release' });
    const names = battle.events.map((event: any) => event.name);
    expect(names).toContain('holdup:result');
    expect(names).toContain('unit:flee');
    expect(names).toContain('battle:end');
    expect(battle.phase).toBe('victory');
  });

  it('HOLD UP 三选一：allout 与 talk 分别发对应事件', () => {
    const alloutBattle: any = createBattle({ rng: steady, enemies: [spec('e1')] });
    reachHoldUp(alloutBattle);
    alloutBattle.holdUp({ type: 'allout' });
    const alloutNames = alloutBattle.events.map((event: any) => event.name);
    expect(alloutNames).toContain('holdup:result');
    expect(alloutNames).toContain('allout');

    const talkBattle: any = createBattle({ rng: steady, enemies: [spec('e1')] });
    reachHoldUp(talkBattle);
    const enemyId = talkBattle.aliveEnemies[0].id;
    talkBattle.holdUp({ type: 'talk', enemyId, option: 'reason' });
    const talkNames = talkBattle.events.map((event: any) => event.name);
    expect(talkNames).toContain('holdup:result');
    expect(talkNames).toContain('talk:start');
  });

  it('同一 holdup 连点放过只结算一次', () => {
    const battle: any = createBattle({ rng: steady, enemies: [spec('e1')] });
    reachHoldUp(battle);
    expect(battle.holdUp({ type: 'release' }).ok).toBe(true);
    expect(battle.holdUp({ type: 'release' }).ok).toBe(false);
    expect(battle.holdUp({ type: 'release' }).ok).toBe(false);
    expect(battle.events.filter((event: any) => event.name === 'holdup:result')).toHaveLength(1);
    expect(battle.events.filter((event: any) => event.name === 'battle:end')).toHaveLength(1);
  });

  it('电击弱点触发倒地、发现弱点和 1 MORE', () => {
    const battle: any = createBattle({
      rng: steady,
      activePersonaId: 'pixie',
      enemies: [{ ...spec('e1'), weakness: 'electric', maxHp: 100 }],
    });
    const enemy = battle.aliveEnemies[0];
    expect(battle.act({ type: 'skill', id: 'Zio', targetId: enemy.id }).ok).toBe(true);
    expect(enemy.down).toBe(true);
    expect(enemy.knownAffinities.electric).toBe('weak');
    expect(battle.extraId).toBe('hero');
    expect(battle.log.join('\n')).toContain('1 MORE');
  });

  it('玩家行动结束后交棒给下一名角色', () => {
    const battle: any = createBattle({ rng: steady });
    expect(battle.act({ type: 'guard' }).ok).toBe(true);
    expect(battle.actor).toBeTruthy();
    expect(battle.actor.id).not.toBe('hero');
    expect(battle.log.join('\n')).toContain(`轮到 ${battle.actor.name}`);
  });
});
