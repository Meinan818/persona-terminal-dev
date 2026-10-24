import { db } from '@/db';
import { useAppStore } from '@/store';
import type { PresetNameMatchResult } from '@/utils/presetNameMatcher';

export async function applyPresetNameMatches(selected: PresetNameMatchResult): Promise<number> {
  const store = useAppStore.getState();
  const settings = store.settings;
  const currentAchievements = await db.achievements.toArray();
  const currentSkills = await db.skills.toArray();
  const backup = {
    achievements: { ...(settings.aiPresetNameBackup?.achievements ?? {}) },
    skills: { ...(settings.aiPresetNameBackup?.skills ?? {}) },
  };

  for (const item of currentAchievements) {
    if (selected.achievements[item.id] && backup.achievements[item.id] === undefined) {
      backup.achievements[item.id] = item.title;
    }
  }
  for (const item of currentSkills) {
    if (selected.skills[item.id] && backup.skills[item.id] === undefined) {
      backup.skills[item.id] = item.name;
    }
  }

  await db.achievements.bulkPut(currentAchievements.map(item => (
    selected.achievements[item.id] ? { ...item, title: selected.achievements[item.id] } : item
  )));
  await db.skills.bulkPut(currentSkills.map(item => (
    selected.skills[item.id] ? { ...item, name: selected.skills[item.id] } : item
  )));
  await store.updateSettings({ aiMatchedPresetNames: true, aiPresetNameBackup: backup });
  await store.loadData();
  return Object.keys(selected.achievements).length + Object.keys(selected.skills).length;
}

export async function restorePresetNames(): Promise<number> {
  const store = useAppStore.getState();
  const backup = store.settings.aiPresetNameBackup;
  const hasBackup = !!backup && (
    Object.keys(backup.achievements ?? {}).length > 0
    || Object.keys(backup.skills ?? {}).length > 0
  );
  if (!backup || !hasBackup) throw new Error('没有可还原的 AI 覆写记录');

  const currentAchievements = await db.achievements.toArray();
  const currentSkills = await db.skills.toArray();
  await db.achievements.bulkPut(currentAchievements.map(item => (
    backup.achievements[item.id] !== undefined ? { ...item, title: backup.achievements[item.id] } : item
  )));
  await db.skills.bulkPut(currentSkills.map(item => (
    backup.skills[item.id] !== undefined ? { ...item, name: backup.skills[item.id] } : item
  )));
  const restored = currentAchievements.filter(item => backup.achievements[item.id] !== undefined).length
    + currentSkills.filter(item => backup.skills[item.id] !== undefined).length;
  await store.updateSettings({ aiMatchedPresetNames: false, aiPresetNameBackup: undefined });
  await store.loadData();
  return restored;
}
