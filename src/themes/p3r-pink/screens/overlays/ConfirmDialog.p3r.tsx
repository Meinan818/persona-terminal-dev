/**
 * 确认框基座（真实 src/components/ConfirmDialog.tsx）。
 * 标题缺省「确认操作」、描述、「确认」「取消」、关闭；tone：default / danger / warning；actions（≤3）；busy；富内容槽。
 * 演示：?variant=default|danger|warning|actions|actions-delete|actions-row|busy|rich|buttons
 * actions-delete / actions-row（三选项删除，真实 `actions?: ConfirmAction[]` ≤3、多余裁掉，取代默认双按钮；铁律「取消恒在左 / 首、危险恒在右 / 末」）：
 *   文案取真实唯一用到三选项的实例 Activities.tsx「确认删除这条记录？」：取消 / 仅删除条目 / 删除并回档（tone=danger）。
 *   actions-delete = P3R SYSTEM 框选项条（纵向，取消在首、危险在末，danger 默认光标落在末项，↑↓ Enter）；
 *   actions-row = 真实 p3 分支横排三斜钮（default=樱粉面 / danger=珊瑚，等宽 flex-1）。actions 模式下遮罩 / ESC / ✕ 三条关闭通道 = 取消。
 */
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@pink/registry/types';
import { P6Dialog } from '@pink/screens/pkg6/dialog';
import { CfgInput } from '@pink/screens/pkg6/cfg';
import { P3Button, useToast } from '@pink/kit';

const VARIANTS = ['default', 'danger', 'warning', 'actions', 'actions-delete', 'actions-row', 'busy', 'rich', 'buttons'] as const;
const RECORD = '在图书馆把《雾中小镇》读完了第 4 章，顺手做了笔记';
/** 真实 ConfirmAction：{ label, onClick, tone?: 'default'|'primary'|'danger' }；按真实顺序（取消在左 / 首） */
const DEL_ACTIONS = [
  { id: 'cancel', label: '取消' },
  { id: 'only', label: '仅删除条目', hint: '只移除记录本身，点数保留' },
  { id: 'rollback', label: '删除并回档', danger: true, hint: '同时收回这条记录获得的点数' },
];
type V = (typeof VARIANTS)[number];

export default function ConfirmDialog({ open, onClose, params }: OverlayProps) {
  const toast = useToast();
  const [v, setV] = useState<V>((params?.get('variant') as V) || 'default');
  const [busy, setBusy] = useState(false);
  const [txt, setTxt] = useState('');
  useEffect(() => { if (!open) setBusy(false); }, [open]);
  const done = (m: string) => { toast(m, { duration: 1200 }); onClose(); };
  const del = v === 'actions-delete' || v === 'actions-row';
  return (
    <>
      <div className="fixed inset-x-0 bottom-28 z-[1] flex flex-wrap justify-center gap-2 px-4">
        {VARIANTS.map((x) => <P3Button key={x} size="sm" tone={x === v ? 'ink' : 'soft'} onClick={() => setV(x)}>{x}</P3Button>)}
      </div>
      <P6Dialog
        open={open} onClose={onClose}
        tone={v === 'danger' || del ? 'danger' : v === 'warning' ? 'warning' : 'default'}
        title={v === 'default' ? '确认操作' : v === 'danger' ? '删除这条记录？' : v === 'warning' ? '温馨提示' : v === 'actions' ? '这张卡片要怎么处理？' : del ? '确认删除这条记录？' : v === 'busy' ? '正在保存…' : v === 'rich' ? '给这个分组起个名字' : '退出登录？'}
        description={v === 'default' ? '确定要继续吗？' : v === 'danger' ? '删除后无法恢复。' : v === 'warning' ? '该操作不可逆：前方是未曾有人达到过的领域！' : v === 'actions' ? '可以收进档案，也可以直接丢掉。' : del ? `「${RECORD}」\n「删除并回档」会同时收回这条记录获得的点数；「仅删除条目」只移除记录本身。` : v === 'busy' ? '提交中，遮罩与按钮都已锁定。' : v === 'rich' ? undefined : '本机数据仍会保留。'}
        closeButton
        busy={v === 'busy' || busy}
        layout={v === 'buttons' || v === 'actions-row' ? 'buttons' : 'choices'}
        choices={v === 'actions' ? [{ id: 'archive', label: '收进档案', primary: true }, { id: 'discard', label: '丢掉', danger: true }, { id: 'cancel', label: '取消' }] : v === 'actions-delete' ? DEL_ACTIONS : v === 'actions-row' ? [...DEL_ACTIONS].reverse().map((c) => ({ id: c.id, label: c.label, danger: c.danger })) : undefined}
        onChoice={(id) => (id === 'cancel' ? onClose() : done(id === 'archive' ? '已收进档案' : id === 'only' ? '已删除条目' : id === 'rollback' ? '已删除并回档 · 点数已收回' : '已丢掉'))}
        confirmText={v === 'danger' ? '删除' : v === 'warning' ? '继续添加' : v === 'buttons' ? '退出' : '确认'}
        onConfirm={() => { setBusy(true); setTimeout(() => { setBusy(false); done('已确认'); }, 900); }}
      >
        {v === 'rich' && <CfgInput autoFocus placeholder="分组名" value={txt} onChange={(e) => setTxt(e.target.value)} className="bg-p3r-blush-faint" />}
      </P6Dialog>
    </>
  );
}
