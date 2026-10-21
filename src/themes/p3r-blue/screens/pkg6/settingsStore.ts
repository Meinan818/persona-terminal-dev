/**
 * P6 私有：设置页的本地假 store（模拟真实 useAppStore.settings + updateSettings）。
 * 设置页各分组、助手面板、模型抽屉共享同一份，刷新页面复原。
 */
import { useSyncExternalStore } from 'react';
import type { AttributeId, KeywordRule, NotifSlot, SummaryPromptPreset, ThemeType } from '@/types';
import { ATTRS, DEFAULT_LEVEL_TITLES, KEYWORD_RULES, LEVEL_PRESETS, NOTIF_SLOTS, PERSONAS, SUMMARY_PRESETS, type ProviderId } from '@blue/adapters/pkg6';

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
  theme: 'blue', customThemeColor: '#1b57ff', customSoundScheme: 'blue', customTarotSet: 'p3',
  soundMuted: false, soundVolume: 80, backgroundAnimation: ['particles'], splashStyle: 'p3', splashSpeed: 'normal',
  backgroundImage: undefined, backgroundOpacity: 0.3, backgroundOrientation: 'landscape',
  weatherProvider: 'qweather', weatherKey: '', weatherHost: '', weatherCity: undefined,
  bgmEnabled: true, bgmVolume: 60, bgmBattle: 't2', bgmBoss: '', bgmTower: '', bgmHome: { blue: 't1' },
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
let hydrating = false;

/** 把 mock 设置字段映射回真实 Settings 并落库（主题单独走 setTheme） */
function pushToRealStore(p: Partial<MockSettings>) {
  if (hydrating) return;
  void import('@/store').then(({ useAppStore }) => {
    const st = useAppStore.getState();
    const patch: Record<string, unknown> = {};
    const set = (k: string, v: unknown) => { if (v !== undefined) patch[k] = v; };
    if (p.theme !== undefined) void st.setTheme(p.theme);
    set('soundMuted', p.soundMuted); set('soundVolume', p.soundVolume);
    set('bgmEnabled', p.bgmEnabled); set('bgmVolume', p.bgmVolume);
    set('bgmBattleTrackId', p.bgmBattle); set('bgmBossTrackId', p.bgmBoss); set('bgmTowerTrackId', p.bgmTower);
    if (p.bgmHome !== undefined) set('bgmHomeTrackIds', p.bgmHome);
    set('weatherProvider', p.weatherProvider); set('weatherApiKey', p.weatherKey); set('weatherApiHost', p.weatherHost);
    if (p.weatherCity !== undefined) {
      const cur = st.settings.weatherCity;
      if (p.weatherCity && cur && cur.name === p.weatherCity.name) set('weatherCity', cur);
      else if (p.weatherCity === undefined) set('weatherCity', undefined);
    }
    if (p.provider !== undefined) {
      const map: Record<string, string> = { openai: 'openai', deepseek: 'deepseek', kimi: 'kimi', qwen: 'qwen', gemini: 'gemini', minimax: 'minimax', custom: 'custom' };
      set('summaryApiProvider', map[p.provider] ?? p.provider);
    }
    if (p.keys !== undefined) { const pv = p.provider ?? state.provider; set('summaryApiKey', p.keys[pv]); }
    set('customProviderName', p.customName); set('customProviderProtocol', p.customProtocol); set('customProviderPreset', p.customPreset);
    set('summaryApiBaseUrl', p.baseUrl);
    set('summaryModel', p.summaryModel); set('navigatorModel', p.navigatorModel);
    set('visionModel', p.visionModel); set('audioModel', p.audioModel); set('assistantModel', p.assistantModel);
    set('tarotDailyDeliberate', p.tarotDeliberate); set('summaryDeliberate', p.summaryDeliberate);
    set('summaryAutoWrite', p.autoSummary); set('countercurrentEnabled', p.countercurrentEnabled);
    set('ledgerEnabled', p.ledgerEnabled); set('currency', p.currency);
    set('spendEvalEnabled', p.spendEvalEnabled); set('ledgerPayCycleEnabled', p.ledgerPayCycleEnabled);
    set('ledgerResetDay', p.ledgerResetDay);
    if (p.attributeNames !== undefined) set('attributeNames', p.attributeNames);
    if (p.levelThresholds !== undefined) set('levelThresholds', p.levelThresholds);
    set('levelDifficulty', p.difficulty);
    if (p.levelTitles !== undefined) set('attributeLevelTitles', p.levelTitles);
    if (p.keywordRules !== undefined) set('keywordRules', p.keywordRules);
    set('lifeQuestAiCard', p.lifeQuestAiCard); set('battleEnabled', p.battleEnabled);
    set('notificationsEnabled', p.notificationsEnabled);
    if (p.notifSlots !== undefined) set('notificationSlots', p.notifSlots);
    set('notifAIVoice', p.notifAiCopy); set('navigatorPushEnabled', p.notifProactive);
    set('wishAgentProposals', p.wishProposal);
    set('customThemeColor', p.customThemeColor); set('customSoundScheme', p.customSoundScheme); set('customTarotSet', p.customTarotSet);
    if (p.backgroundAnimation !== undefined) set('backgroundAnimation', p.backgroundAnimation);
    set('backgroundImage', p.backgroundImage); set('backgroundOpacity', p.backgroundOpacity); set('backgroundOrientation', p.backgroundOrientation);
    if (Object.keys(patch).length) void st.updateSettings(patch as never);
  }).catch(() => { /* 真实 store 未就绪时静默 */ });
}

export const updateSettings = (p: Partial<MockSettings>) => { state = { ...state, ...p }; ls.forEach((l) => l()); pushToRealStore(p); };
const sub = (f: () => void) => { ls.add(f); return () => { ls.delete(f); }; };
export const getSettings = () => state;



/** 真实数据覆盖：页面加载时把真实 useAppStore.settings 原地合入 mock store */
export function hydrateFromRealStore() {
  try {
    void import('@/store').then(({ useAppStore }) => {
      const s = useAppStore.getState().settings;
      if (!s) return;
      hydrating = true;
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
      hydrating = false;
    });
  } catch { /* 静默 */ }
}

export const useSettings = () => useSyncExternalStore(sub, getSettings, getSettings);
export const attrLabel = (s: MockSettings, id: AttributeId) => s.attributeNames[id] || ATTRS.find((a) => a.id === id)!.defaultLabel;
export const activePreset = (s: MockSettings) => s.personas.find((p) => p.id === s.activePersona) ?? s.personas[0];
