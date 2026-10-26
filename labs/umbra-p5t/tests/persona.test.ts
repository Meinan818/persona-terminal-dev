// r16：队员 → 原版 Persona 映射（batch-10 README：personas.csv/units.csv persona-id + CA9999 PCxxxxSpecialACut 交叉核对）
import { describe, expect, it } from 'vitest';
import { PERSONA_OF, personaKeyOf } from '../src/view/skillFxOrig';

describe('persona mapping (batch-10)', () => {
  it('maps the party to their original personas', () => {
    expect(PERSONA_OF).toMatchObject({ joker: 'arsene', skull: 'kidd', mona: 'zorro', panther: 'carmen', fox: 'goemon', queen: 'johanna', erina: 'ernesto' });
  });
  it('resolves numbered unit ids and unknown ids', () => {
    expect(personaKeyOf('skull')).toBe('kidd');
    expect(personaKeyOf('mona2')).toBe('zorro');
    expect(personaKeyOf('e1')).toBeUndefined();
  });
});
