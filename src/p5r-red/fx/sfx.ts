/** 音效（MOTION_SPEC §13 红主题映射；原 P5.sfx(k, vol)）。DevCapsule「音效」或 ?__snd=0 关闭。 */
import { sfxUrl } from '@/p5r-red/lib/asset';
import { soundEnabled } from '@/p5r-red/lib/prefs';

export const SFX_MAP = { nav: 'dd', success: 'ok', level: 'themec-level', switch: 'themec-switch', tarot: 'tarots', fanfare: 'battle-fanfare' } as const;
export type SfxKey = keyof typeof SFX_MAP;

export function sfx(k: SfxKey, vol = 0.5): void {
  if (!soundEnabled()) return;
  try { const a = new Audio(sfxUrl(SFX_MAP[k])); a.volume = vol; a.play().catch(() => {}); } catch { /* ignore */ }
}
