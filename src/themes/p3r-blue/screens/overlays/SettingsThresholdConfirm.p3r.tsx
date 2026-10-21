/**
 * 等级阈值确认（真实 Settings.tsx 3 个 ConfirmDialog）。?variant=reset|remove|add
 *   reset：恢复默认等级阈值？ 恢复默认 / 取消
 *   remove：移除 Lv.N？ 确认移除 / 再想想（Lv.1–5 为系统保护等级）
 *   add：温馨提示 —— 该操作不可逆：前方是未曾有人达到过的领域！ 继续添加 / 取消
 */
import { useState } from 'react';
import type { OverlayProps } from '@blue/registry/types';
import { P6Dialog } from '@blue/screens/pkg6/dialog';
import { P3Button, useToast } from '@blue/kit';

export type ThresholdKind = 'reset' | 'remove' | 'add';
export function ThresholdDialog({ kind, open, onClose, onConfirm, difficulty = 'easy', level = 6, points = 300 }: { kind: ThresholdKind; open: boolean; onClose: () => void; onConfirm: () => void; difficulty?: 'easy' | 'hard'; level?: number; points?: number }) {
  if (kind === 'reset') return (
    <P6Dialog open={open} onClose={onClose} tone="warning" title="恢复默认等级阈值？" description={`将等级阈值恢复为${difficulty === 'hard' ? '困难' : '简单'}档的 5 级默认配置。`} confirmText="恢复默认" cancelText="取消" onConfirm={() => { onConfirm(); onClose(); }}>
      <p className="rounded-none border-2 border-dashed border-p3r-coral px-3 py-2 text-meta leading-relaxed">若你当前有 Lv.6 及以上自定义等级，它们会一并被清除。</p>
    </P6Dialog>
  );
  if (kind === 'remove') return (
    <P6Dialog open={open} onClose={onClose} tone="danger" title={`移除 Lv.${level}？`} confirmText="确认移除" cancelText="再想想" onConfirm={() => { onConfirm(); onClose(); }}>
      <p className="text-body leading-relaxed"><span className="mr-1 text-p3r-rose">&gt;</span>这是当前的最高等级，所需点数 <b className="font-cond tabular text-p3r-rose">{points}</b>。移除后，已达到此等级的属性会回落到上一级。</p>
      <p className="mt-2 text-meta opacity-75">（Lv.1–5 为系统保护等级，无法删除。）</p>
    </P6Dialog>
  );
  return <P6Dialog open={open} onClose={onClose} tone="warning" title="温馨提示" description="该操作不可逆：前方是未曾有人达到过的领域！" confirmText="继续添加" cancelText="取消" onConfirm={() => { onConfirm(); onClose(); }} />;
}

export default function SettingsThresholdConfirm({ open, onClose, params }: OverlayProps) {
  const toast = useToast();
  const [k, setK] = useState<ThresholdKind>((params?.get('variant') as ThresholdKind) || 'reset');
  return (
    <>
      <div className="fixed inset-x-0 bottom-28 z-[1] flex justify-center gap-2">
        {(['reset', 'remove', 'add'] as const).map((x) => <P3Button key={x} size="sm" tone={k === x ? 'ink' : 'soft'} onClick={() => setK(x)}>{x === 'reset' ? '↺ 默认' : x === 'remove' ? '移除最高' : '+ 添加一级'}</P3Button>)}
      </div>
      <ThresholdDialog kind={k} open={open} onClose={onClose} onConfirm={() => toast('已应用', { duration: 1000 })} />
    </>
  );
}
