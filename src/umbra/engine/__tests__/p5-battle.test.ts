import { describe, expect, it } from 'vitest';
import {
  buildBattlePersona,
  catalogPersonaChoices,
  createDefaultBattle,
} from '@/umbra/engine/p5-combat-rules';

const steady = () => 0.5;
const createBattle = createDefaultBattle as any;

describe('UMBRA formal P5 battle engine', () => {
  it('P5R 图鉴与 Persona 战斗适配可用', () => {
    expect(catalogPersonaChoices()).toHaveLength(232);
    const arsene: any = buildBattlePersona('arsene');
    expect(arsene.id).toBe('arsene');
    expect(arsene.name).toBe('亚森');
    expect(arsene.skills.length).toBeGreaterThan(0);
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
