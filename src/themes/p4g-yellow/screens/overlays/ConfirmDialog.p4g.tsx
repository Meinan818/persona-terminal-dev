/**
 * 确认框基座（真实 src/components/ConfirmDialog.tsx）。
 * 标题缺省「确认操作」、描述、「确认」「取消」、关闭；tone：default / danger / warning；actions（≤3）；busy；富内容槽。
 * 演示：?variant=default|danger|warning|actions|actions-row|busy|rich|buttons
 * actions（三选项态，真实 `actions?: ConfirmAction[]`，最多 3 个、多余裁掉，取代默认双按钮；铁律「取消恒在左 / 首、危险或主操作恒在右 / 末」）：
 *   文案取真实唯一用到三选项的实例 Activities.tsx「确认删除这条记录？」：取消 / 仅删除条目 / 删除并回档（tone=danger）。
 *   actions = P4G 消息框选项版（纵向，取消在首、危险在末、danger 默认光标落在末项）；actions-row = 真实 p4 分支的横排三按钮（PersonaButton default=奶油 / primary=橙 / danger=红，等宽 flex-1）。
 *   actions 模式下 onConfirm / onCancel 只兜底 backdrop / ESC / 返回三条关闭通道。
 */
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import { P6Dialog } from '@yellow/screens/pkg6/dialog';
import { CfgInput } from '@yellow/screens/pkg6/cfg';
import { P4Button, useToast } from '@yellow/kit';

const VARIANTS = ['default', 'danger', 'warning', 'actions', 'actions-row', 'busy', 'rich', 'buttons'] as const;
const RECORD = '在图书馆把《雾中小镇》读完了第 4 章，顺手做了笔记';
/** 真实 ConfirmAction：{ label, onClick, tone?: 'default'|'primary'|'danger' }；按真实顺序排列（取消在左） */
const ACTIONS = [{ id: 'cancel', label: '取消' }, { id: 'only', label: '仅删除条目' }, { id: 'rollback', label: '删除并回档', danger: true }];
type V = (typeof VARIANTS)[number];

export default function ConfirmDialog({ open, onClose, params }: OverlayProps) {
  const toast = useToast();
  const [v, setV] = useState<V>((params?.get('variant') as V) || 'default');
  const [busy, setBusy] = useState(false);
  const [txt, setTxt] = useState('');
  useEffect(() => { if (!open) setBusy(false); }, [open]);
  const done = (m: string) => { toast(m, { duration: 1200 }); onClose(); };
  const act = v === 'actions' || v === 'actions-row';
  return (
    <>
      <div className="fixed inset-x-0 bottom-28 z-[1] flex flex-wrap justify-center gap-2 px-4">
        {VARIANTS.map((x) => <P4Button key={x} size="sm" variant={x === v ? 'black' : 'secondary'} onClick={() => setV(x)}>{x}</P4Button>)}
      </div>
      <P6Dialog
        open={open} onClose={onClose}
        tone={v === 'danger' || act ? 'danger' : v === 'warning' ? 'warning' : 'default'}
        title={v === 'default' ? '确认操作' : v === 'danger' ? '删除这条记录？' : v === 'warning' ? '温馨提示' : act ? '确认删除这条记录？' : v === 'busy' ? '正在保存…' : v === 'rich' ? '给这个分组起个名字' : '退出登录？'}
        description={v === 'default' ? '确定要继续吗？' : v === 'danger' ? '删除后无法恢复。' : v === 'warning' ? '该操作不可逆：前方是未曾有人达到过的领域！' : act ? `「${RECORD}」\n「删除并回档」会同时收回这条记录获得的点数；「仅删除条目」只移除记录本身。` : v === 'busy' ? '提交中，遮罩与按钮都已锁定。' : v === 'rich' ? undefined : '本机数据仍会保留。'}
        closeButton
        busy={v === 'busy' || busy}
        layout={v === 'buttons' || v === 'actions-row' ? 'buttons' : 'choices'}
        // buttons 版式内部会把列表反转（默认项是「确认在前」），所以横排时先反一次，落到屏幕上仍是 取消｜仅删除条目｜删除并回档
        choices={v === 'actions' ? ACTIONS : v === 'actions-row' ? [...ACTIONS].reverse() : undefined}
        onChoice={(id) => (id === 'cancel' ? onClose() : done(id === 'rollback' ? '已删除并回档' : '已删除条目'))}
        confirmText={v === 'danger' ? '删除' : v === 'warning' ? '继续添加' : v === 'buttons' ? '退出' : '确认'}
        onConfirm={() => { setBusy(true); setTimeout(() => { setBusy(false); done('已确认'); }, 900); }}
      >
        {v === 'rich' && <CfgInput autoFocus placeholder="分组名" value={txt} onChange={(e) => setTxt(e.target.value)} className="bg-p4g-cream" />}
      </P6Dialog>
    </>
  );
}
