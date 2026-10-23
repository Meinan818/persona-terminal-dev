import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '@/store';
import { useCloudSocialStore } from '@/store/cloudSocial';
import {
  ALL_OUT_COMBO,
  allOutDamage,
  allOutAttack,
  attackCoopShadow,
  hpFromAttackLog,
  identifyShadow,
  listAttacksFor,
} from '@/services/coopShadows';
import { getUserId } from '@/services/velvetApi';
import { readOnlineSp, spendOnlineSp } from '@/services/onlineResources';
import { buildOnlinePersona } from '@/umbra/onlinePersona';
import { archetypeById } from '@/constants/coopShadowPool';
import { sumDamagePlus } from '@/utils/confidantLevels';
import { isDailyAttackWindow } from '@/utils/moonPhase';
import type { AttributeId, CoopAttack, CoopBond, CoopShadow, PersonaSkill } from '@/types';

export interface ShadowBattleLog {
  id: string;
  who: 'me' | 'partner';
  persona: string;
  skill: string;
  dmg: number;
  weakness?: boolean;
  resonance?: boolean;
  crit?: boolean;
  buff?: 'attack_up' | 'vulnerability';
  ago: string;
}

const ATTRIBUTE_IDS: AttributeId[] = ['knowledge', 'guts', 'dexterity', 'kindness', 'charm'];

const relativeAgo = (date: Date): string => {
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000));
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours} 小时前` : `${Math.floor(hours / 24)} 天前`;
};

const toLog = (attack: CoopAttack, myId: string | null, nameOf: (id: string) => string): ShadowBattleLog => ({
  id: attack.id,
  who: attack.attackerId === myId ? 'me' : 'partner',
  persona: attack.personaName,
  skill: attack.skillName,
  dmg: attack.damageFinal,
  weakness: attack.weaknessBonus,
  resonance: attack.resonanceBonus,
  crit: attack.skillKind === 'crit' && attack.damageFinal > attack.damageRaw,
  buff: attack.skillKind === 'buff' ? 'attack_up' : attack.skillKind === 'debuff' ? 'vulnerability' : undefined,
  ago: relativeAgo(attack.createdAt),
});

export function useCoopShadowBattle(shadowProp: CoopShadow | null, enabled: boolean, partnerFallback = '') {
  const persona = useAppStore((state) => buildOnlinePersona(state.umbraProfile) ?? state.persona);
  const usingUmbraPersona = useAppStore((state) => Boolean(state.umbraProfile));
  const onlineReady = useAppStore((state) => Boolean(state.umbraProfile || state.battleState));
  const onlineSp = useAppStore((state) => state.umbraProfile?.economy.sp ?? state.battleState?.sp ?? 0);
  const attributes = useAppStore((state) => state.attributes);
  const confidants = useAppStore((state) => state.confidants);
  const attributeNames = useAppStore((state) => state.settings.attributeNames);
  const coopBonds = useCloudSocialStore((state) => state.coopBonds);
  const shadows = useCloudSocialStore((state) => state.coopShadows);
  const upsertCoopShadow = useCloudSocialStore((state) => state.upsertCoopShadow);

  const shadow = shadowProp ? shadows.find((item) => item.id === shadowProp.id) ?? shadowProp : null;
  const bond = shadow ? coopBonds.find((item) => item.id === shadow.bondId) ?? null : null;
  const myId = getUserId();
  const iAmA = !!shadow && shadow.userAId === myId;
  const myIdentified = !!shadow && (iAmA ? shadow.identifiedByA : shadow.identifiedByB);
  const partnerIdentified = !!shadow && (iAmA ? shadow.identifiedByB : shadow.identifiedByA);
  const bothIdentified = myIdentified && partnerIdentified;
  const archetype = shadow ? archetypeById(shadow.shadowId) : undefined;
  const displayName = shadow?.nameOverride || archetype?.names?.[0] || '羁绊之影';
  const description = archetype?.description ?? '';
  const line = archetype?.line ?? '';
  const partnerName = bond?.otherProfile?.nickname || bond?.otherProfile?.userId || partnerFallback || '对方';
  const defaultAttr = persona?.equippedMaskAttribute ?? 'knowledge';
  const [selectedAttr, setSelectedAttr] = useState<AttributeId>(defaultAttr);
  const [attackLog, setAttackLog] = useState<CoopAttack[]>([]);
  const [logLoading, setLogLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setSelectedAttr(defaultAttr), [defaultAttr]);
  useEffect(() => {
    if (!enabled || !shadow) {
      setAttackLog([]);
      return;
    }
    let alive = true;
    setLogLoading(true);
    void listAttacksFor(shadow.id)
      .then((list) => {
        if (!alive) return;
        setAttackLog(list);
        const hp = hpFromAttackLog(shadow.hpMax, list);
        if (shadow.status === 'active' && hp !== shadow.hpCurrent) upsertCoopShadow({ ...shadow, hpCurrent: hp });
      })
      .finally(() => {
        if (alive) setLogLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [enabled, shadow?.id, shadow?.hpMax]);

  const currentAttrLevel = attributes.find((item) => item.id === selectedAttr)?.level ?? 1;
  const availableSkills = useMemo(() => {
    if (!persona) return [];
    return (persona.skills?.[selectedAttr] ?? []).filter((skill) => (
      skill.type !== 'heal'
      && (usingUmbraPersona || skill.level <= currentAttrLevel)
    ));
  }, [persona, selectedAttr, currentAttrLevel, usingUmbraPersona]);

  const damagePlusMap = useMemo(() => sumDamagePlus(confidants), [confidants]);
  const equippedName = persona?.attributePersonas?.[selectedAttr]?.name?.trim() || persona?.name || '未命名';
  const myTotalLevels = attributes.reduce((sum, item) => sum + (item.level ?? 1), 0);
  const partnerTotalLevels = bond?.otherProfile?.totalLv || myTotalLevels;
  const combo = shadow?.comboCount ?? 0;
  const myAllOutUsed = !!shadow && (iAmA ? shadow.allOutByA : shadow.allOutByB);
  const allOutAvailable = !!shadow && shadow.status === 'active' && combo >= ALL_OUT_COMBO && !myAllOutUsed;
  const windowOpen = isDailyAttackWindow(new Date());
  const today = (() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  })();
  const alreadyAttacked = attackLog.some((attack) => attack.attackerId === myId && attack.day === today);
  const attackUp = shadow?.sharedBuffs?.attack_up?.remainingTurns ?? 0;
  const vulnerability = shadow?.sharedBuffs?.vulnerability?.remainingTurns ?? 0;
  const resonanceActive = !!(shadow?.resonanceUntil && shadow.resonanceUntil.getTime() > Date.now() && shadow.resonanceBy && shadow.resonanceBy !== myId);
  const resonanceMine = !!(shadow?.resonanceUntil && shadow.resonanceUntil.getTime() > Date.now() && shadow.resonanceBy === myId);
  const resonanceLeft = shadow?.resonanceUntil
    ? `${Math.max(0, Math.ceil((shadow.resonanceUntil.getTime() - Date.now()) / 3_600_000))} 小时`
    : '';
  const expiresLeft = shadow
    ? `${Math.max(0, Math.ceil((shadow.expiresAt.getTime() - Date.now()) / 86_400_000))} 天`
    : '';
  const hp = shadow?.status === 'active' ? hpFromAttackLog(shadow.hpMax, attackLog) : shadow?.hpCurrent ?? 0;

  const identify = async () => {
    if (!shadow || working || myIdentified) return;
    setWorking(true);
    setError(null);
    try {
      const updated = await identifyShadow(shadow);
      upsertCoopShadow(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : '识破失败');
    } finally {
      setWorking(false);
    }
  };

  const attack = async (skill: PersonaSkill) => {
    if (!shadow || !persona || working) return null;
    if (alreadyAttacked) {
      setError('今天你已经对这只羁绊之影出过手了，明天再来');
      return null;
    }
    if (!windowOpen) {
      setError('月相攻击窗口已关闭（每日 18:00 – 次日 07:00 可战斗）');
      return null;
    }
    if (!onlineReady) {
      setError('请先在 UMBRA 初始化你的战斗状态');
      return null;
    }
    if (readOnlineSp() < skill.spCost) {
      setError(`SP 不足（需 ${skill.spCost}）`);
      return null;
    }
    setWorking(true);
    setError(null);
    try {
      const result = await attackCoopShadow({
        shadow,
        personaId: persona.id,
        personaName: equippedName,
        skillKind: skill.type,
        skillName: skill.name,
        skillAttribute: selectedAttr,
        damageRaw: skill.power + (damagePlusMap[selectedAttr] ?? 0),
        history: useCloudSocialStore.getState().coopShadows,
      });
      if (!await spendOnlineSp(skill.spCost)) throw new Error(`SP 不足（需 ${skill.spCost}）`);
      upsertCoopShadow(result.updatedShadow);
      setAttackLog((logs) => [result.attack, ...logs]);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : '攻击失败');
      return null;
    } finally {
      setWorking(false);
    }
  };

  const allOut = async () => {
    if (!shadow || !persona || working || !allOutAvailable) return null;
    setWorking(true);
    setError(null);
    try {
      const result = await allOutAttack({
        shadow,
        personaId: persona.id,
        personaName: equippedName,
        myTotalLevels,
        partnerTotalLevels,
        history: useCloudSocialStore.getState().coopShadows,
      });
      upsertCoopShadow(result.updatedShadow);
      setAttackLog((logs) => [result.attack, ...logs]);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : '总攻击失败');
      return null;
    } finally {
      setWorking(false);
    }
  };

  return {
    shadow,
    bond: bond as CoopBond | null,
    partnerName,
    displayName,
    description,
    line,
    expiresLeft,
    hp,
    hpMax: shadow?.hpMax ?? 0,
    weakness: shadow?.weaknessAttribute ?? 'guts' as AttributeId,
    myIdentified,
    partnerIdentified,
    bothIdentified,
    combo,
    myAllOutUsed,
    allOutAvailable,
    allOutCombo: ALL_OUT_COMBO,
    allOutDmg: allOutDamage(myTotalLevels, partnerTotalLevels, combo),
    windowOpen,
    alreadyAttacked,
    persona,
    onlineReady,
    onlineSp,
    equippedName,
    selectedAttr,
    setSelectedAttr,
    availableSkills,
    damagePlusMap,
    myTotalLevels,
    partnerTotalLevels,
    attackUp,
    vulnerability,
    resonanceActive,
    resonanceMine,
    resonanceLeft,
    working,
    error,
    setError,
    logLoading,
    logs: attackLog.map((attack) => toLog(attack, myId, () => partnerName)),
    attributeIds: ATTRIBUTE_IDS,
    attributeNames,
    identify,
    attack,
    allOut,
  };
}
