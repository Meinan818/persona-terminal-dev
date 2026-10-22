/**
 * P6 私有：设置页的本地假 store（模拟真实 useAppStore.settings + updateSettings）。
 * 设置页各分组、助手面板、模型抽屉共享同一份，刷新页面复原。
 */
import { useSyncExternalStore } from 'react';
import type { AttributeId, KeywordRule, NotifSlot, SummaryPromptPreset, ThemeType } from '@real/types';
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
export const useSettings = () => useSyncExternalStore(sub, getSettings, getSettings);
export const attrLabel = (s: MockSettings, id: AttributeId) => s.attributeNames[id] || ATTRS.find((a) => a.id === id)!.defaultLabel;
export const activePreset = (s: MockSettings) => s.personas.find((p) => p.id === s.activePersona) ?? s.personas[0];
