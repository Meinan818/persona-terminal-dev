/**
 * 新建 / 编辑人格面板（真实 NavigatorSettings.tsx 的 gen 面板：名字 / 头像剪影或上传（→ 裁切）/ 称呼 / 语气关键词 / 陪伴·督促 / 自由描述 →
 * AI 生成人格设定（生成中… / 换一版 / 429 报错）→ 人格设定可改 + 喜好三栏 → 取消 / 保存）。视觉 = v3 b.js navHTML 的 .ob-gen。
 * 设置页里是内嵌面板；这里以底部抽屉形式单独预览。?variant=gen（默认新建）| edit | generating | generr
 */
import { useState } from 'react';
import type { OverlayProps } from '@/p5r-red/registry/types';
import { ObSheet } from './ObKit';
import { PersonaEditor } from './SettingsBlocks';
export default function NavigatorPersonaEditor({ open, onClose, params }: OverlayProps) {
  const [st, setSt] = useState(params?.get('variant') ?? 'gen');
  return (
    <ObSheet open={open} onClose={onClose} title={st === 'edit' ? '编辑人格' : '新建人格'} seed={711} states={[['gen', '新建'], ['edit', '编辑'], ['generating', '生成中'], ['generr', '生成报错']]} state={st} onState={setSt}>
      <PersonaEditor key={st} state={st} onClose={onClose} />
    </ObSheet>
  );
}
