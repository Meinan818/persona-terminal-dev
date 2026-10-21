/**
 * P6 私有：设置页的本地假 store（模拟真实 useAppStore.settings + updateSettings）。
 * 设置页各分组、助手面板、模型抽屉共享同一份，刷新页面复原。
 */
import { useSyncExternalStore } from 'react';
import type { AttributeId, KeywordRule, NotifSlot, SummaryPromptPreset, ThemeType } from '@/types';
import { ATTRS, DEFAULT_LEVEL_TITLES, KEYWORD_RULES, LEVEL_PRESETS, NOTIF_SLOTS, PERSONAS, SUMMARY_PRESETS, type ProviderId } from '@yellow/adapters/pkg6';

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
let state: MockSettings = {
  theme: 'yellow', customThemeColor: '#1c1c1c', customSoundScheme: 'yellow', customTarotSet: 'p4',
  soundMuted: false, soundVolume: 80, backgroundAnimation: ['particles'], splashStyle: 'p4', splashSpeed: 'normal',
  backgroundImage: undefined, backgroundOpacity: 0.3, backgroundOrientation: 'landscape',
  weatherProvider: 'qweather', weatherKey: '', weatherHost: '', weatherCity: undefined,
  bgmEnabled: true, bgmVolume: 60, bgmBattle: 't2', bgmBoss: '', bgmTower: '', bgmHome: { yellow: 't1' },
  provider: 'deepseek', keys: { deepseek: 'sk-••••••••••••3f9a', qwen: 'sk-••••••••a01c' }, verified: { deepseek: true }, customName: '', customProtocol: 'openai', customPreset: 'relay', baseUrl: '',
  summaryModel: '', navigatorModel: 'deepseek-reasoner-v4', visionModel: 'deepseek-flash', audioModel: 'qwen3-asr-flash', assistantModel: '',
  tarotDeliberate: false, summaryDeliberate: true,
  summaryPersona: 'margaret', summaryPresets: SUMMARY_PRESETS, summaryPresetId: 'warm', autoSummary: true,
  countercurrentEnabled: false, ledgerEnabled: true, currency: 'CNY', spendEvalEnabled: true, ledgerPayCycleEnabled: false, ledgerResetDay: 10,
  attributeNames: { ...names, guts: '勇气' }, levelThresholds: [...LEVEL_PRESETS.easy, 300], difficulty: 'easy', levelTitles: JSON.parse(JSON.stringify(DEFAULT_LEVEL_TITLES)),
  lifeQuestAiCard: false, keywordRules: KEYWORD_RULES, battleEnabled: false, hasPresetNameBackup: true,
  realisticTyping: true, wishProposal: true, proactive: false, activePersona: 'builtin-cat', personas: PERSONAS,
  notificationsEnabled: true, notifPermission: false, notifAiCopy: true, notifProactive: false, notifSlots: NOTIF_SLOTS,
};

const ls = new Set<() => void>();
export const updateSettings = (p: Partial<MockSettings>) => { state = { ...state, ...p }; ls.forEach((l) => l()); };
const sub = (f: () => void) => { ls.add(f); return () => { ls.delete(f); }; };
export const getSettings = () => state;

/** 真实数据覆盖：页面加载时把真实 useAppStore.settings 原地合入 mock store */
export function hydrateFromRealStore() {
  try {
    void import('@/store').then(({ useAppStore }) => {
      const s = useAppStore.getState().settings;
      if (!s) return;
      updateSettings({
        soundMuted: s.soundMuted ?? state.soundMuted,
        soundVolume: s.soundVolume ?? state.soundVolume,
        bgmEnabled: s.bgmEnabled ?? state.bgmEnabled,
        bgmVolume: s.bgmVolume ?? state.bgmVolume,
        weatherProvider: s.weatherProvider ?? state.weatherProvider,
        weatherKey: s.weatherApiKey ?? state.weatherKey,
        weatherHost: s.weatherApiHost ?? state.weatherHost,
        weatherCity: s.weatherCity ? { name: s.weatherCity.name, adm: '' } : state.weatherCity,
        provider: (s.summaryApiProvider as ProviderId) ?? state.provider,
        keys: { ...state.keys, ...(s.summaryApiKey ? { [s.summaryApiProvider ?? 'deepseek']: s.summaryApiKey } : {}) },
        summaryModel: s.summaryModel ?? state.summaryModel,
        navigatorModel: s.navigatorModel ?? state.navigatorModel,
        visionModel: s.visionModel ?? state.visionModel,
        audioModel: s.audioModel ?? state.audioModel,
        assistantModel: s.assistantModel ?? state.assistantModel,
        tarotDeliberate: s.tarotDailyDeliberate ?? state.tarotDeliberate,
        summaryDeliberate: s.summaryDeliberate ?? state.summaryDeliberate,
        autoSummary: s.summaryAutoWrite ?? state.autoSummary,
        countercurrentEnabled: s.countercurrentEnabled ?? state.countercurrentEnabled,
        ledgerEnabled: s.ledgerEnabled ?? state.ledgerEnabled,
        currency: s.currency ?? state.currency,
        spendEvalEnabled: s.spendEvalEnabled ?? state.spendEvalEnabled,
        ledgerPayCycleEnabled: s.ledgerPayCycleEnabled ?? state.ledgerPayCycleEnabled,
        ledgerResetDay: s.ledgerResetDay ?? state.ledgerResetDay,
        attributeNames: { ...state.attributeNames, ...(s.attributeNames ?? {}) },
        levelThresholds: s.levelThresholds ?? state.levelThresholds,
        difficulty: s.levelDifficulty ?? state.difficulty,
        levelTitles: (s.attributeLevelTitles as unknown as MockSettings['levelTitles']) ?? state.levelTitles,
        keywordRules: s.keywordRules ?? state.keywordRules,
        notificationsEnabled: s.notificationsEnabled ?? state.notificationsEnabled,
        notifSlots: s.notificationSlots ?? state.notifSlots,
        customThemeColor: s.customThemeColor ?? state.customThemeColor,
        customSoundScheme: s.customSoundScheme ?? state.customSoundScheme,
        customTarotSet: s.customTarotSet ?? state.customTarotSet,
        backgroundAnimation: s.backgroundAnimation ?? state.backgroundAnimation,
        backgroundImage: s.backgroundImage ?? state.backgroundImage,
        backgroundOpacity: s.backgroundOpacity ?? state.backgroundOpacity,
        backgroundOrientation: s.backgroundOrientation ?? state.backgroundOrientation,
      });
    });
  } catch { /* 静默：真实 store 未就绪时保持 mock */ }
}
export const useSettings = () => useSyncExternalStore(sub, getSettings, getSettings);
export const attrLabel = (s: MockSettings, id: AttributeId) => s.attributeNames[id] || ATTRS.find((a) => a.id === id)!.defaultLabel;
export const activePreset = (s: MockSettings) => s.personas.find((p) => p.id === s.activePersona) ?? s.personas[0];
