import { beforeAll, describe, expect, it } from 'vitest';
import {
  buildBattlePersona,
  catalogPersonaChoices,
  createDefaultBattle,
  registerSyntheticPersona,
} from '@/umbra/engine/p5-combat-rules';
import {
  compendiumPersonaIds,
  compendiumSkillIds,
} from '@/umbra/engine/compendiumPreload';
import { ensureCompendium } from '@/umbra/engine/p5r-compendium';
import { generateEncounter } from '@/umbra/rules/encounter';

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

  it.each([1, 3, 5])('%i 只敌人能跑完整战斗流程', (count) => {
    const enemies = Array.from({ length: count }, (_, index) => spec(`e${index + 1}`));
    const battle: any = createBattle({ rng: steady, enemies });
    const phase = driveBattle(battle);
    expect(['victory', 'result']).toContain(phase);
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
