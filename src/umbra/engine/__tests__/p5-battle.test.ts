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

const steady = () => 0.5;
const createBattle = createDefaultBattle as any;

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
    expect(snapshot.enemies).toHaveLength(2);
    expect(snapshot.actor).toBe('你');
    expect(snapshot.persona).toBe('亚森');
    expect(snapshot.phase).toBe('party');
  });

  it('电击弱点触发倒地、发现弱点和 1 MORE', () => {
    const battle: any = createBattle({ rng: steady, activePersonaId: 'pixie' });
    expect(battle.act({ type: 'skill', id: 'Zio', targetId: 'a' }).ok).toBe(true);
    const enemy = battle.enemies.find((item: any) => item.id === 'a');
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
