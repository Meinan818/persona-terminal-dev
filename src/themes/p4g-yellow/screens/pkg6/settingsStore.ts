/**
 * P6 私有：设置页的 store。
 * demo 版是纯本地假 store；接入后这里桥到真实 useAppStore.settings + setTheme。
 * 安全边界：API Key / 验证状态只在本机设置页读写，不回显到日志；和风 Key 仍是演示态。
 */
import { useMemo, useSyncExternalStore } from 'react';
import { useAppStore } from '@/store';
import type { AttributeId, KeywordRule, NotifSlot, Settings, SummaryPromptPreset, ThemeType } from '@real/types';
import { ATTRS, DEFAULT_LEVEL_TITLES, KEYWORD_RULES, LEVEL_PRESETS, NOTIF_SLOTS, PERSONAS, SUMMARY_PRESETS, type ProviderId } from '@yellow/mock/pkg6';

export interface MockSettings {
  theme: ThemeType; customThemeColor: string; customSoundScheme: ThemeType; customTarotSet: 'p3' | 'p4' | 'p5';
  soundMuted: boolean; soundVolume: number; backgroundAnimation: string[]; splashStyle: string; splashSpeed: 'fast' | 'normal' | 'slow';
  backgroundImage?: string; backgroundOpacity: number; backgroundOrientation: 'landscape' | 'portrait';
  weatherProvider: 'qweather' | 'openmeteo'; weatherKey: string; weatherHost: string; weatherCity?: { name: string; adm: string };
  bgmEnabled: boolean; bgmVolume: number; bgmBattle: string; bgmBoss: string; bgmTower: string; bgmHome: Record<string, string>;
  provider: ProviderId; keys: Partial<Record<ProviderId, string>>; verified: Partial<Record<ProviderId, boolean>>; customName: string; customProtocol: 'openai' | 'anthropic'; customPreset: string; baseUrl: string;
  summaryModel: string; navigatorModel: string; visionModel: string; audioModel: string; assistantModel: string;
  tarotDeliberate: boolean; summaryDeliberate: boolean;
  summaryPersona: string; summaryPresets: SummaryPromptPreset[]; summaryPresetId: string; autoSummary: boolean;
  countercurrentEnabled: boolean; ledgerEnabled: boolean; currency: string; spendEvalEnabled: boolean; ledgerPayCycleEnabled: boolean; ledgerResetDay: number;
  attributeNames: Record<AttributeId, string>; levelThresholds: number[]; difficulty: 'easy' | 'hard'; levelTitles: Record<AttributeId, string[]>;
  lifeQuestAiCard: boolean; keywordRules: KeywordRule[]; battleEnabled: boolean; hasPresetNameBackup: boolean;
  realisticTyping: boolean; wishProposal: boolean; proactive: boolean; activePersona: string; personas: typeof PERSONAS;
  notificationsEnabled: boolean; notifPermission: boolean; notifAiCopy: boolean; notifProactive: boolean; notifSlots: NotifSlot[];
}

const names = Object.fromEntries(ATTRS.map((a) => [a.id, ''])) as Record<AttributeId, string>;
const DEFAULTS: MockSettings = {
  theme: 'yellow', customThemeColor: '#1c1c1c', customSoundScheme: 'yellow', customTarotSet: 'p4',
  soundMuted: false, soundVolume: 80, backgroundAnimation: ['particles'], splashStyle: 'p4', splashSpeed: 'normal',
  backgroundImage: undefined, backgroundOpacity: 0.3, backgroundOrientation: 'landscape',
  weatherProvider: 'qweather', weatherKey: '', weatherHost: '', weatherCity: undefined,
  bgmEnabled: true, bgmVolume: 60, bgmBattle: 't2', bgmBoss: '', bgmTower: '', bgmHome: { yellow: 't1' },
  provider: 'deepseek', keys: {}, verified: {}, customName: '', customProtocol: 'openai', customPreset: 'relay', baseUrl: '',
  summaryModel: '', navigatorModel: 'deepseek-reasoner-v4', visionModel: 'deepseek-flash', audioModel: 'qwen3-asr-flash', assistantModel: '',
  tarotDeliberate: false, summaryDeliberate: true,
  summaryPersona: 'margaret', summaryPresets: SUMMARY_PRESETS, summaryPresetId: 'warm', autoSummary: true,
  countercurrentEnabled: false, ledgerEnabled: true, currency: 'CNY', spendEvalEnabled: true, ledgerPayCycleEnabled: false, ledgerResetDay: 10,
  attributeNames: { ...names, guts: '勇气' }, levelThresholds: [...LEVEL_PRESETS.easy, 300], difficulty: 'easy', levelTitles: JSON.parse(JSON.stringify(DEFAULT_LEVEL_TITLES)),
  lifeQuestAiCard: false, keywordRules: KEYWORD_RULES, battleEnabled: false, hasPresetNameBackup: true,
  realisticTyping: true, wishProposal: true, proactive: false, activePersona: 'builtin-cat', personas: PERSONAS,
  notificationsEnabled: true, notifPermission: false, notifAiCopy: true, notifProactive: false, notifSlots: NOTIF_SLOTS,
};

/** demo 字段 → 真实 Settings 字段。Key / 天气 Key / BGM 曲目 id / 人格 mock 不在此表，只留本地。 */
const TO_REAL: Record<string, keyof Settings> = {
  customThemeColor: 'customThemeColor', customSoundScheme: 'customSoundScheme', customTarotSet: 'customTarotSet',
  backgroundImage: 'backgroundImage', backgroundOpacity: 'backgroundOpacity', backgroundOrientation: 'backgroundOrientation',
  backgroundAnimation: 'backgroundAnimation', splashStyle: 'splashStyle',
  soundMuted: 'soundMuted', soundVolume: 'soundVolume',
  attributeNames: 'attributeNames', levelThresholds: 'levelThresholds', levelTitles: 'attributeLevelTitles',
  difficulty: 'levelDifficulty', keywordRules: 'keywordRules', lifeQuestAiCard: 'lifeQuestAiCard', battleEnabled: 'battleEnabled',
  countercurrentEnabled: 'countercurrentEnabled', ledgerEnabled: 'ledgerEnabled', currency: 'currency',
  spendEvalEnabled: 'spendEvalEnabled', ledgerPayCycleEnabled: 'ledgerPayCycleEnabled', ledgerResetDay: 'ledgerResetDay',
  summaryModel: 'summaryModel', navigatorModel: 'navigatorModel', assistantModel: 'assistantModel',
  visionModel: 'visionModel', audioModel: 'audioModel',
  tarotDeliberate: 'tarotDailyDeliberate', summaryDeliberate: 'summaryDeliberate',
  summaryPresets: 'summaryPromptPresets', summaryPresetId: 'summaryActivePresetId', autoSummary: 'summaryAutoWrite',
  provider: 'summaryApiProvider', customName: 'customProviderName', customProtocol: 'customProviderProtocol',
  customPreset: 'customProviderPreset', baseUrl: 'summaryApiBaseUrl',
  realisticTyping: 'navigatorImmersive', wishProposal: 'wishAgentProposals', proactive: 'navigatorPushEnabled',
  activePersona: 'navigatorPresetId',
  notificationsEnabled: 'notificationsEnabled', notifAiCopy: 'notifAIVoice', notifProactive: 'navigatorPushEnabled',
  notifSlots: 'notificationSlots',
};

let local: Partial<MockSettings> = {};
const listeners = new Set<() => void>();
const sub = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
const getLocal = () => local;
const useLocal = () => useSyncExternalStore(sub, getLocal, getLocal);

function merge(real: Settings | undefined, theme: ThemeType | undefined, l: Partial<MockSettings>): MockSettings {
  const r = real;
  return {
    ...DEFAULTS,
    theme: theme ?? DEFAULTS.theme,
    customThemeColor: r?.customThemeColor ?? DEFAULTS.customThemeColor,
    customSoundScheme: r?.customSoundScheme ?? DEFAULTS.customSoundScheme,
    customTarotSet: r?.customTarotSet ?? DEFAULTS.customTarotSet,
    backgroundImage: r?.backgroundImage ?? DEFAULTS.backgroundImage,
    backgroundOpacity: r?.backgroundOpacity ?? DEFAULTS.backgroundOpacity,
    backgroundOrientation: r?.backgroundOrientation ?? DEFAULTS.backgroundOrientation,
    backgroundAnimation: r?.backgroundAnimation ?? DEFAULTS.backgroundAnimation,
    splashStyle: r?.splashStyle ?? DEFAULTS.splashStyle,
    soundMuted: r?.soundMuted ?? DEFAULTS.soundMuted,
    soundVolume: r?.soundVolume ?? DEFAULTS.soundVolume,
    attributeNames: (r?.attributeNames as Record<AttributeId, string>) ?? DEFAULTS.attributeNames,
    levelThresholds: r?.levelThresholds ?? DEFAULTS.levelThresholds,
    levelTitles: (r?.attributeLevelTitles as Record<AttributeId, string[]>) ?? DEFAULTS.levelTitles,
    difficulty: r?.levelDifficulty ?? DEFAULTS.difficulty,
    keywordRules: r?.keywordRules ?? DEFAULTS.keywordRules,
    lifeQuestAiCard: r?.lifeQuestAiCard ?? DEFAULTS.lifeQuestAiCard,
    battleEnabled: r?.battleEnabled ?? DEFAULTS.battleEnabled,
    countercurrentEnabled: r?.countercurrentEnabled ?? DEFAULTS.countercurrentEnabled,
    ledgerEnabled: r?.ledgerEnabled ?? DEFAULTS.ledgerEnabled,
    currency: r?.currency ?? DEFAULTS.currency,
    spendEvalEnabled: r?.spendEvalEnabled ?? DEFAULTS.spendEvalEnabled,
    ledgerPayCycleEnabled: r?.ledgerPayCycleEnabled ?? DEFAULTS.ledgerPayCycleEnabled,
    ledgerResetDay: r?.ledgerResetDay ?? DEFAULTS.ledgerResetDay,
    summaryModel: r?.summaryModel ?? DEFAULTS.summaryModel,
    navigatorModel: r?.navigatorModel ?? DEFAULTS.navigatorModel,
    assistantModel: r?.assistantModel ?? DEFAULTS.assistantModel,
    visionModel: r?.visionModel ?? DEFAULTS.visionModel,
    audioModel: r?.audioModel ?? DEFAULTS.audioModel,
    tarotDeliberate: r?.tarotDailyDeliberate ?? DEFAULTS.tarotDeliberate,
    summaryDeliberate: r?.summaryDeliberate ?? DEFAULTS.summaryDeliberate,
    summaryPresets: r?.summaryPromptPresets ?? DEFAULTS.summaryPresets,
    summaryPresetId: r?.summaryActivePresetId ?? DEFAULTS.summaryPresetId,
    autoSummary: r?.summaryAutoWrite ?? DEFAULTS.autoSummary,
    provider: (r?.summaryApiProvider as ProviderId) ?? DEFAULTS.provider,
    customName: r?.customProviderName ?? DEFAULTS.customName,
    customProtocol: r?.customProviderProtocol ?? DEFAULTS.customProtocol,
    customPreset: r?.customProviderPreset ?? DEFAULTS.customPreset,
    baseUrl: r?.summaryApiBaseUrl ?? DEFAULTS.baseUrl,
    realisticTyping: r?.navigatorImmersive ?? DEFAULTS.realisticTyping,
    wishProposal: r?.wishAgentProposals ?? DEFAULTS.wishProposal,
    proactive: r?.navigatorPushEnabled ?? DEFAULTS.proactive,
    activePersona: r?.navigatorPresetId ?? DEFAULTS.activePersona,
    notificationsEnabled: r?.notificationsEnabled ?? DEFAULTS.notificationsEnabled,
    notifAiCopy: r?.notifAIVoice ?? DEFAULTS.notifAiCopy,
    notifSlots: r?.notificationSlots ?? DEFAULTS.notifSlots,
    hasPresetNameBackup: !!r?.aiPresetNameBackup,
    ...l,
  };
}

export const getSettings = () => {
  const st = useAppStore.getState();
  return merge(st.settings, st.user?.theme, local);
};

export const useSettings = () => {
  const real = useAppStore((s) => s.settings);
  const theme = useAppStore((s) => s.user?.theme);
  const l = useLocal();
  return useMemo(() => merge(real, theme, l), [real, theme, l]);
};

export const updateSettings = (p: Partial<MockSettings>) => {
  const realPatch: Partial<Settings> = {};
  const localPatch: Partial<MockSettings> = {};
  for (const [k, v] of Object.entries(p)) {
    if (k === 'theme') continue;
    const rk = TO_REAL[k];
    if (rk) (realPatch as Record<string, unknown>)[rk] = v;
    else localPatch[k as keyof MockSettings] = v as never;
  }
  if (Object.keys(localPatch).length) {
    local = { ...local, ...localPatch };
    listeners.forEach((fn) => fn());
  }
  if (p.theme) void useAppStore.getState().setTheme(p.theme);
  if (Object.keys(realPatch).length) void useAppStore.getState().updateSettings(realPatch);
};

export const attrLabel = (s: MockSettings, id: AttributeId) => s.attributeNames[id] || ATTRS.find((a) => a.id === id)!.defaultLabel;
export const activePreset = (s: MockSettings) => s.personas.find((p) => p.id === s.activePersona) ?? s.personas[0];
