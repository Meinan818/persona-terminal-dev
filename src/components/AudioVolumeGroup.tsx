/**
 * AudioVolumeGroup —— 设置 → 颜色与声音 → 三档音量（BGM / 音效 / 语音）。
 * 完全沿用 SoundVolumeRow 的滑块样式：拖动用草稿值，松手才落库。
 */
import { useState, type CSSProperties } from 'react';
import { useAppStore } from '@/store';
import { useShallow } from 'zustand/react/shallow';
import { playVolumePreview } from '@/utils/feedback';
import { previewBgmVolume } from '@/utils/bgm';

type TierKey = 'bgm' | 'se' | 'voice';

const TIERS: Array<{
  key: TierKey;
  label: string;
  emoji: string;
  defaultValue: number;
  field: 'bgmVolume' | 'soundVolume' | 'voiceVolume';
}> = [
  { key: 'bgm', label: 'BGM', emoji: '🎵', defaultValue: 60, field: 'bgmVolume' },
  { key: 'se', label: '音效', emoji: '🔊', defaultValue: 80, field: 'soundVolume' },
  { key: 'voice', label: '语音', emoji: '🎙️', defaultValue: 70, field: 'voiceVolume' },
];

export function AudioVolumeGroup({ p5 }: { p5: boolean }) {
  const { settings, updateSettings } = useAppStore(useShallow(s => ({ settings: s.settings, updateSettings: s.updateSettings })));
  const [draft, setDraft] = useState<Partial<Record<TierKey, number>>>({});

  const commit = (tier: (typeof TIERS)[number]) => {
    const value = draft[tier.key];
    setDraft(prev => ({ ...prev, [tier.key]: undefined }));
    if (value == null) return;
    const current = settings[tier.field] ?? tier.defaultValue;
    if (value === current) return;
    void updateSettings({ [tier.field]: value });
  };

  const preview = (tier: (typeof TIERS)[number], value: number) => {
    if (tier.key === 'bgm') previewBgmVolume(value);
    if (tier.key === 'se') playVolumePreview(value);
  };

  return (
    <div className="space-y-2">
      {TIERS.map(tier => {
        const value = draft[tier.key] ?? settings[tier.field] ?? tier.defaultValue;
        return (
          <div key={tier.key} className="bg-gray-50 dark:bg-gray-700 rounded-lg px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-800 dark:text-white">{tier.label}音量</div>
              <span className="text-xs font-semibold tabular-nums text-primary">{value}%</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-base select-none">{tier.emoji}</span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={value}
                aria-label={`${tier.label}音量`}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setDraft(prev => ({ ...prev, [tier.key]: next }));
                  preview(tier, next);
                }}
                onPointerUp={() => commit(tier)}
                onTouchEnd={() => commit(tier)}
                onKeyUp={(e) => { if (/^Arrow|^Home$|^End$|^Page/.test(e.key)) commit(tier); }}
                onBlur={() => { if (draft[tier.key] != null) commit(tier); }}
                className="flex-1 h-1.5 appearance-none rounded-full bg-gray-200 dark:bg-gray-600 accent-primary cursor-pointer"
                style={p5 ? ({ '--p5-range-fill': `${value}%` } as CSSProperties) : undefined}
              />
              <span className="text-base select-none">🔊</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
