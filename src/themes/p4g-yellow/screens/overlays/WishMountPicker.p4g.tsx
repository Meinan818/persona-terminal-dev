/**
 * 挂到愿望 WishMountPicker（真实 src/components/wish/WishMountPicker.tsx，PRD_V2.6 §1.3）——独立入口。
 * 真实三处共用：记录活动抽屉（Activities.tsx）/ 添加待办（Todos 表单）/ 黑猫记录卡（NavigatorActionForm，compact 去掉说明行）。
 * 一行横滑筹码：只列 status==='active' && !parentId 的愿望，标题 >12 字截断加「…」；选中态实心 + 「✓ 」（不靠 opacity），再点一次取消挂载；
 * 没有在途愿望时整行不渲染（return null）。P4G 外观：未选 = 描边签，选中 = 黑底白字（夜：黄底黑字），与 ActivityRecordSheet / TodoFormSheet 内嵌的是同一个组件。
 * ?state=selected 预选第一个愿望；#/overlay/actions-wish-mount
 */
import { useEffect, useState, type ReactNode } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Section, P4Sheet } from '@yellow/kit';
import { WISHES } from '@yellow/mock/pkg2';
import { WishMountPicker } from './ActivityRecordSheet.p4g';

export default function WishMountPickerDemo({ open, onClose, params }: OverlayProps) {
  const first = WISHES.find((w) => w.status === 'active' && !w.parentId)?.id;
  const init = params?.get('state') === 'selected' ? first : undefined;
  const [a, setA] = useState<string | undefined>(init);
  const [t, setT] = useState<string | undefined>(undefined);
  const [n, setN] = useState<string | undefined>(init);
  useEffect(() => { if (open) { setA(init); setT(undefined); setN(init); } }, [open]); // eslint-disable-line
  const title = (id?: string) => WISHES.find((w) => w.id === id)?.title;
  const Host = ({ children, label }: { children: ReactNode; label: string }) => (
    <div className="min-w-0 rounded-sm border-3 border-p4g-black bg-p4g-surface p-3 shadow-hard-sm night:border-p4g-line">
      <div className="mb-2 truncate font-display text-cap font-bold tracking-[0.14em] text-p4g-ink-soft">{label}</div>
      {children}
    </div>
  );
  const Readout = ({ id }: { id?: string }) => (
    <p className="mt-1 truncate text-cap text-p4g-muted">{id ? `已挂：${title(id)}` : '未挂（可不选）'}</p>
  );
  return (
    <P4Sheet open={open} onClose={onClose} title="挂到愿望" en="WISH MOUNT PICKER" size="tall">
      <div className="flex min-w-0 flex-col gap-5 pt-1">
        <P4Section title="记录一件事" en="ACTIVITY SHEET">
          <Host label="描述 · ⭐ 这很重要 · 分析关键词 ……">
            <WishMountPicker value={a} onChange={setA} />
            <Readout id={a} />
          </Host>
        </P4Section>
        <P4Section title="添加任务" en="TODO FORM">
          <Host label="任务名 · 绑定属性 · 奖励点数 ……">
            <WishMountPicker value={t} onChange={setT} />
            <Readout id={t} />
          </Host>
        </P4Section>
        <P4Section title="黑猫记录卡" en="NAVIGATOR · COMPACT">
          <div className="min-w-0 rounded-[10px] border-3 border-p4g-black bg-[color:var(--p4g-msg)] p-3 text-[color:var(--p4g-msg-ink)] night:border-p4g-yellow">
            <div className="mb-2 font-display text-cap font-bold tracking-[0.14em] text-p4g-yellow">📝 记录活动 · ASSISTANT FORM</div>
            <div className="rounded-[4px] bg-p4g-surface-2 p-2 text-p4g-ink">
              <WishMountPicker compact value={n} onChange={setN} />
            </div>
            <p className="mt-1 truncate text-cap opacity-80">{n ? `已挂：${title(n)}` : '紧凑态：去掉说明行'}</p>
          </div>
        </P4Section>
        <P4Section title="没有在途愿望" en="NO ACTIVE WISH">
          <div className="rounded-sm border-thin border-dashed border-p4g-line px-3 py-3 text-meta text-p4g-ink-soft">
            整行不渲染（真实 <code className="font-mono">active.length === 0 → null</code>），表单直接从下一栏开始。
          </div>
        </P4Section>
      </div>
    </P4Sheet>
  );
}
