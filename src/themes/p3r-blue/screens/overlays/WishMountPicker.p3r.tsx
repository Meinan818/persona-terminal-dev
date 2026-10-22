/**
 * 挂到愿望 WishMountPicker（真实 src/components/wish/WishMountPicker.tsx，PRD_V2.6 §1.3）——独立入口（交互改写自黄色版，视觉蓝白 P3R）。
 * 真实三处共用：记录活动抽屉（Activities.tsx）/ 添加待办（Todos 表单）/ 黑猫记录卡（NavigatorActionForm，compact 去掉说明行）。
 * 一行横滑斜切筹码：只列 status==='active' && !parentId 的愿望，标题 >12 字截断加「…」；选中态 = 墨底实心 + 「✓ 」（不靠 opacity），再点一次取消挂载；
 * 没有在途愿望时整行不渲染（return null）。同一个组件 = ActivityRecordSheet.p3r / TodoFormSheet.p3r 内嵌的那个。
 * ?state=selected 预选第一个愿望；#/overlay/actions-wish-mount
 */
import { useEffect, useState, type ReactNode } from 'react';
import type { OverlayProps } from '@blue/registry/types';
import { P3Sheet, P3R, slantClip, tickClip } from '@blue/kit';
import { WISHES } from '@blue/mock/pkg2';
import { MiniHead } from '@blue/screens/pkg2/common';
import { WishMountPicker } from './ActivityRecordSheet.p3r';

function Host({ children, label, tone = 'panel' }: { children: ReactNode; label: string; tone?: 'panel' | 'ink' }) {
  const ink = tone === 'ink';
  return (
    <div className="relative min-w-0 py-3 pl-5 pr-4" style={{ clipPath: slantClip(12), background: ink ? P3R.ink : 'var(--p3r-row)' }}>
      <div className="mb-2 flex min-w-0 items-center gap-1.5">
        <span aria-hidden className="h-[10px] w-[7px] shrink-0" style={{ background: ink ? P3R.cyan : P3R.blue, clipPath: tickClip }} />
        <span className="min-w-0 truncate text-[12px] font-black" style={{ color: ink ? 'var(--p3r-on-ink)' : P3R.grey }}>{label}</span>
      </div>
      {children}
    </div>
  );
}

export default function WishMountPickerDemo({ open, onClose, params }: OverlayProps) {
  const first = WISHES.find((w) => w.status === 'active' && !w.parentId)?.id;
  const init = params?.get('state') === 'selected' ? first : undefined;
  const [a, setA] = useState<string | undefined>(init);
  const [t, setT] = useState<string | undefined>(undefined);
  const [n, setN] = useState<string | undefined>(init);
  useEffect(() => { if (open) { setA(init); setT(undefined); setN(init); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const title = (id?: string) => WISHES.find((w) => w.id === id)?.title;
  const Readout = ({ id }: { id?: string }) => (
    <p className="mt-1 truncate text-[12px] font-bold" style={{ color: id ? P3R.roseInk : P3R.grey }}>{id ? `已挂：${title(id)}` : '未挂（可不选）'}</p>
  );
  return (
    <P3Sheet open={open} onClose={onClose} title="挂到愿望" en="WISH MOUNT" size="tall">
      <div className="flex min-w-0 flex-col gap-4 pt-1">
        <section className="min-w-0 space-y-2">
          <MiniHead title="记录一件事" en="ACTIVITY SHEET" />
          <Host label="描述 · 这很重要 · 分析关键词 ……">
            <WishMountPicker value={a} onChange={setA} />
            <Readout id={a} />
          </Host>
        </section>
        <section className="min-w-0 space-y-2">
          <MiniHead title="添加任务" en="TODO FORM" />
          <Host label="任务名 · 绑定属性 · 奖励点数 ……">
            <WishMountPicker value={t} onChange={setT} />
            <Readout id={t} />
          </Host>
        </section>
        <section className="min-w-0 space-y-2">
          <MiniHead title="黑猫记录卡" en="NAVIGATOR · COMPACT" />
          <Host label="记录活动 · ASSISTANT FORM" tone="ink">
            <div className="px-2 py-2" style={{ clipPath: slantClip(8), background: P3R.panel }}>
              <WishMountPicker compact value={n} onChange={setN} />
            </div>
            <p className="mt-1.5 truncate text-[12px] font-bold" style={{ color: 'var(--p3r-on-ink)', opacity: 0.85 }}>{n ? `已挂：${title(n)}` : '紧凑态：去掉说明行'}</p>
          </Host>
        </section>
        <section className="min-w-0 space-y-2">
          <MiniHead title="没有在途愿望" en="NO ACTIVE WISH" />
          <div className="px-4 py-3 text-[13px] font-bold leading-relaxed" style={{ clipPath: slantClip(10), background: 'var(--p3r-row-alt)', color: P3R.inkSoft, boxShadow: 'inset 0 0 0 1.5px rgb(var(--p3r-blue-rgb) / 0.35)' }}>
            整行不渲染（真实 <code className="font-mono text-[12px]">active.length === 0 → null</code>），表单直接从下一栏开始。
          </div>
        </section>
      </div>
    </P3Sheet>
  );
}
