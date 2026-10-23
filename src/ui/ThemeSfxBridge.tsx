import { useEffect } from 'react';
import { triggerNavFeedback } from '@/utils/feedback';

/** One delegated click layer so every theme's existing buttons get feedback without touching each screen. */
export function ThemeSfxBridge() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const control = target.closest<HTMLElement>('button,a,[role="button"]');
      if (!control) return;
      if (control.matches(':disabled,[aria-disabled="true"]')) return;
      if (control.closest('input[type="range"],textarea,[contenteditable="true"]')) return;
      triggerNavFeedback();
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  return null;
}
