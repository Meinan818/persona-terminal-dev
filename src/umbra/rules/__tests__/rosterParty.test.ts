import { describe, expect, it } from 'vitest';
import { partyFromRoster } from '../rosterParty';

describe('UMBRA roster party', () => {
  it('从皮肤 roster 推导主角与同伴面具，不写死角色 id', () => {
    const party = partyFromRoster({
      heroPersona: 'arsene',
      companions: ['ryuji', 'ann', 'morgana'],
      companionPersonas: {
        ryuji: 'captain-kidd',
        ann: 'carmen',
        morgana: 'zorro',
      },
      excludedPersonas: [],
      showtime: [],
    });
    expect(party.heroPersonaIds).toEqual(['arsene']);
    expect(party.allyPersonaIds).toEqual(['captain-kidd', 'carmen', 'zorro']);
  });

  it('跳过 roster 中缺失的同伴面具并去重', () => {
    const party = partyFromRoster({
      heroPersona: 'izanagi',
      companions: ['yukari', 'junpei', 'yukari'],
      companionPersonas: { yukari: 'io' },
      excludedPersonas: [],
      showtime: [],
    });
    expect(party.heroPersonaIds).toEqual(['izanagi']);
    expect(party.allyPersonaIds).toEqual(['io']);
  });

  it('优先使用 roster.partyDefault 的初始三人', () => {
    const party = partyFromRoster({
      heroPersona: 'arsene',
      companions: ['ryuji', 'ann', 'morgana', 'yusuke'],
      companionPersonas: {
        ryuji: 'captain-kidd',
        ann: 'carmen',
        morgana: 'zorro',
        yusuke: 'goemon',
      },
      excludedPersonas: [],
      showtime: [],
      partyDefault: ['ryuji', 'ann', 'morgana'],
    });
    expect(party.allyPersonaIds).toEqual(['captain-kidd', 'carmen', 'zorro']);
  });
});
