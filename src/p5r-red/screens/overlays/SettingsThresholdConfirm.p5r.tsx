/**
 * 等级阈值确认（真实 Settings.tsx 3 个 ConfirmDialog）：?variant=reset 恢复默认等级阈值？| remove 移除最高等级（danger）| add 温馨提示 · 添加等级。
 * 视觉 = v3 b.js openResetThr / openRmLv / openAddLv。
 */
import type { OverlayProps } from '@/p5r-red/registry/types';
import { toast } from '@/p5r-red/kit/P5Toast';
import { ObConfirm } from './ObKit';
import { THR } from './SettingsBlocks';
export default function SettingsThresholdConfirm({ open, onClose, params }: OverlayProps) {
  const v = params?.get('variant') ?? 'reset';
  if (v === 'remove') return <ObConfirm open={open} onClose={onClose} title={`移除 Lv.${THR.length}？`} danger confirm="确认移除" cancel="再想想" desc={<>这是当前的最高等级，所需点数 <b className="ob-red">{THR[THR.length - 1]}</b>。移除后，已达到此等级的属性会回落到上一级。</>} warn="（Lv.1–5 为系统保护等级，无法删除。）" onConfirm={() => toast('已移除最高等级')} />;
  if (v === 'add') return <ObConfirm open={open} onClose={onClose} title="温馨提示" desc="该操作不可逆：前方是未曾有人达到过的领域！" confirm="继续添加" onConfirm={() => toast(`已添加 Lv.${THR.length + 1}`)} />;
  return <ObConfirm open={open} onClose={onClose} title="恢复默认等级阈值？" desc="将等级阈值恢复为简单档的 5 级默认配置。" confirm="恢复默认" extra={<div className="ob-thrq">{[0, 10, 25, 45, 70].map((n, i) => <span key={i}><small>Lv.{i + 1}</small><b>{n}</b></span>)}</div>} warn="若你当前有 Lv.6 及以上自定义等级，它们会一并被清除。" onConfirm={() => toast('已恢复默认阈值')} />;
}
