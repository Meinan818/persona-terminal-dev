import type { SkinRoster } from '../skins/contract';

export interface RosterParty {
  heroPersonaIds: string[];
  allyPersonaIds: string[];
}

/**
 * 从皮肤 roster 推导初始队伍，不在规则层写死任何角色 id。
 * 主角初始面具与同伴专属面具都由皮肤包提供。
 */
export function partyFromRoster(roster: SkinRoster): RosterParty {
  const heroPersonaIds = roster.heroPersona?.trim()
    ? [roster.heroPersona.trim()]
    : [];
  const party = roster.partyDefault?.length
    ? roster.partyDefault
    : roster.companions.slice(0, 3);
  const allyPersonaIds = party
    .map(companionId => roster.companionPersonas[companionId])
    .filter((personaId): personaId is string => Boolean(personaId?.trim()))
    .map(personaId => personaId.trim());
  return {
    heroPersonaIds,
    allyPersonaIds: [...new Set(allyPersonaIds)],
  };
}
