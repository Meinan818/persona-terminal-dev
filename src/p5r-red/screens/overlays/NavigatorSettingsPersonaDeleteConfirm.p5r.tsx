/** 删除人格确认（真实 NavigatorSettings.tsx ConfirmDialog danger）：「删除人格「X」？ / 它的历史会话仍会保留。」?name= */
import type { OverlayProps } from '@/p5r-red/registry/types';
import type { NavigatorPreset } from '@/types';
import { PersonaDeleteConfirm } from './SettingsBlocks';
export default function NavigatorSettingsPersonaDeleteConfirm({ open, onClose, params }: OverlayProps) {
  const name = params?.get('name') ?? '白手套';
  const preset: NavigatorPreset | null = open ? {
    id: params?.get('id') ?? 'demo-persona',
    name,
    personaPrompt: '',
    isBuiltin: false,
    createdAt: new Date(),
  } : null;
  return <PersonaDeleteConfirm preset={preset} onClose={onClose} />;
}
