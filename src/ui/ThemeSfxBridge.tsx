import { useEffect } from 'react';
import { useAppStore } from '@/store';

const SFX_URL = {
  nav: '/dd.mp3',
  success: '/ok.mp3',
  level: '/themec-level.mp3',
  switch: '/themec-switch.mp3',
} as const;

type SfxKind = keyof typeof SFX_URL;

export function playThemeSfx(kind: SfxKind, volume = 1) {
  try {
    const audio = new Audio(SFX_URL[kind]);
    audio.volume = Math.max(0, Math.min(1, volume));
    void audio.play().catch(() => {});
  } catch {
    // Audio can be unavailable during boot or in restricted WebViews.
  }
}

/** One delegated click layer so every theme's existing buttons get feedback without touching each screen. */
export function ThemeSfxBridge() {
  const muted = useAppStore((state) => state.settings.soundMuted);
  const volume = useAppStore((state) => state.settings.soundVolume);

  useEffect(() => {
    if (muted) return;
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const control = target.closest<HTMLElement>('button,a,[role="button"]');
      if (!control) return;
      if (control.matches(':disabled,[aria-disabled="true"]')) return;
      if (control.closest('input[type="range"],textarea,[contenteditable="true"]')) return;
      playThemeSfx('nav', Math.max(0, Math.min(1, (volume ?? 80) / 100)) * 0.42);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [muted, volume]);

  return null;
}
