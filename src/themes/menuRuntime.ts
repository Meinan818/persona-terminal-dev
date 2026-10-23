import { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '@/store';
import { isInShadowTime } from '@/constants';
import { useAppUpdate } from '@/utils/appUpdate';

export function useMenuRuntime() {
  const { settings, achievements, skills, attributes } = useAppStore(useShallow((s) => ({
    settings: s.settings,
    achievements: s.achievements,
    skills: s.skills,
    attributes: s.attributes,
  })));
  const { hasUpdate } = useAppUpdate();
  const [inShadowTime, setInShadowTime] = useState(false);

  useEffect(() => {
    const check = () => setInShadowTime(isInShadowTime(
      settings.battleShadowTimeDays ?? [5, 6, 0],
      settings.battleShadowTimeStart ?? 20,
      settings.battleShadowTimeEnd ?? 7,
    ));
    check();
    const timer = window.setInterval(check, 60_000);
    return () => window.clearInterval(timer);
  }, [settings.battleShadowTimeDays, settings.battleShadowTimeStart, settings.battleShadowTimeEnd]);

  const PENDING_UNLOCKS = useMemo(() => {
    const pendingSkills = skills.filter((skill) => {
      if (skill.id.startsWith('blessing_')) return false;
      const attr = attributes.find((item) => item.id === skill.requiredAttribute);
      return !!attr && attr.level >= skill.requiredLevel && !skill.unlocked;
    }).length;
    const pendingAchievements = achievements.filter((achievement) => {
      if (achievement.unlocked) return false;
      const condition = achievement.condition;
      if (condition.type === 'attribute_level') {
        const attr = attributes.find((item) => item.id === condition.attribute);
        return !!attr && attr.level >= condition.value;
      }
      if (condition.type === 'total_points') {
        return attributes.reduce((sum, item) => sum + (item.points ?? 0), 0) >= condition.value;
      }
      if (condition.type === 'all_attributes_max') {
        return attributes.filter((item) => item.level >= condition.value).length >= attributes.length;
      }
      return false;
    }).length;
    return pendingSkills + pendingAchievements;
  }, [achievements, attributes, skills]);

  return {
    BATTLE_VISIBLE: settings.battleEnabled !== false,
    LEDGER_VISIBLE: settings.ledgerEnabled !== false,
    IN_SHADOW_TIME: inShadowTime,
    HAS_UPDATE: hasUpdate,
    PENDING_UNLOCKS,
  };
}

export const menuRuntimeOps = {
  setBattleEnabled: (enabled: boolean) => useAppStore.getState().updateSettings({ battleEnabled: enabled }),
  setLedgerEnabled: (enabled: boolean) => useAppStore.getState().updateSettings({ ledgerEnabled: enabled }),
};
