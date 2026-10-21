import { beforeAll, describe, expect, it } from 'vitest';
import { buildOnlinePersona, onlineAttributeForElement } from '@/umbra/onlinePersona';
import { createFreshUmbraProfile } from '@/umbra/state';
import {
  compendiumPersonaIds,
  compendiumSkillIds,
} from '@/umbra/engine/compendiumPreload';
import { ensureCompendium } from '@/umbra/engine/p5r-compendium';

const now = new Date('2026-10-20T14:00:00.000Z');

beforeAll(async () => {
  await ensureCompendium({
    personas: compendiumPersonaIds(),
    skills: compendiumSkillIds(),
  });
});

describe('UMBRA 联机 Persona 适配', () => {
  it('P5R 元素稳定映射到联机五维页签', () => {
    expect(onlineAttributeForElement('phys')).toBe('guts');
    expect(onlineAttributeForElement('electric')).toBe('dexterity');
    expect(onlineAttributeForElement('ice')).toBe('kindness');
    expect(onlineAttributeForElement('psy')).toBe('charm');
    expect(onlineAttributeForElement('nuclear')).toBe('knowledge');
    expect(onlineAttributeForElement('unknown')).toBe('knowledge');
  });

  it('当前 UMBRA Persona 能生成联机面板需要的技能分组', () => {
    const profile = createFreshUmbraProfile(now);
    const persona = buildOnlinePersona(profile);
    expect(persona?.id).toBe(profile.combat.activePersonaId);
    expect(persona?.createdViaAI).toBe(false);
    const skills = Object.values(persona?.skills ?? {}).flat();
    expect(skills.length).toBeGreaterThan(0);
    expect(skills.every(skill => skill.spCost >= 0)).toBe(true);
    expect(persona?.attributePersonas?.[persona.equippedMaskAttribute ?? 'knowledge'].name).toBe(persona?.name);
  });

  it('没有 UMBRA 资料时返回 null，由旧档兜底', () => {
    expect(buildOnlinePersona(null)).toBeNull();
  });
});
