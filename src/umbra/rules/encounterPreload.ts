import { ensureCompendium } from '../engine/p5r-compendium';
import { encounterPersonaIds, type EncounterEnemySpec } from './encounter';

export async function preloadEncounter(specs: EncounterEnemySpec[]): Promise<void> {
  const personaIds = encounterPersonaIds(specs);
  if (!personaIds.length) return;
  await ensureCompendium({ personas: personaIds });
}
