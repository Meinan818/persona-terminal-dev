/**
 * 云同步 · 数据类目选择（真实 src/components/auth/SyncPrivacyPanel.tsx）。
 * 折叠头「云同步 · 数据类目选择 / 当前开启 N / M 组」→ 九组开关（核心档案 必须同步 …）→ 说明 → 危险区「🗑 删除云端数据」
 * → 确认弹窗「确认删除云端数据？ / 此操作不可撤销」+ 4 条说明 + 取消 / 确认删除（删除中…）→ 结果「已删除云端 N 条记录。本地数据未动。」
 * 本文件默认导出 = 删除确认弹窗（account-delete-cloud-data）；SyncPrivacySection 给账号页用。
 */
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Dialog, P4Switch, P4Button, IconChevronDown, useToast } from '@yellow/kit';
import { cx } from '@yellow/lib/cx';
import { useLowMotion } from '@yellow/lib/prefs';

export const SYNC_GROUPS = [
  { id: 'core', label: '核心档案', hint: '账号 / 五维属性 / 设置 —— 始终同步，保证账号在不同设备能正常加载', protected: true, def: true },
  { id: 'apiKey', label: 'AI 模型 API', hint: 'API Key（AI 摘要 / 谏言 / Persona / 同伴解读 都用这把钥匙）。默认不上传——钥匙留在本机最安全，代价是换设备要重填一次。打开则随同步上云，方便多设备共用同一把', def: false },
  { id: 'growth', label: '成长记录', hint: '每日活动 / 成就 / 技能 / 岁时印章', def: true },
  { id: 'astro', label: '星象 · 塔罗', hint: '每日塔罗 / 中长期占卜 / 窥探命运 / 旧版每日事件', def: true },
  { id: 'tasks', label: '任务与总结', hint: '待办 / 完成记录 / 周月总结 / 本周目标 / 倒计时 / 委托板', def: true },
  { id: 'battle', label: '逆影战场', hint: 'Persona / Shadow / 战斗状态 / 高塔区层', def: true },
  { id: 'confidants', label: '同伴', hint: '同伴档案 / 同伴事件历史 / 谏言归档摘要（聊天原文永不上云）', def: true },
  { id: 'wishes', label: '愿望清单', hint: '终极目标 / 子愿望 —— 默认只存本地；勾选后才随账号上云，换设备可恢复', def: false },
  { id: 'navigator', label: '助手 · 人格与记忆', hint: '自定义人格 / 它记住的关于你的事 —— 默认只存本地；勾选后换设备助手还认得你。聊天原文永不上云', def: false },
];

export function DeleteCloudDataDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone?: (msg: string) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <P4Dialog open={open} onClose={() => !busy && onClose()} danger speaker="危险区" title="确认删除云端数据？" actions="none">
      <p className="font-display text-meta font-bold text-[#ff8a7a]">此操作不可撤销</p>
      <ul className="mt-2 flex list-none flex-col gap-1.5 text-meta leading-relaxed">
        {[<>仅清空你本账号在云端的所有 <code className="rounded-xs bg-white/10 px-1 font-mono text-2xs">user_data</code> 记录</>, <>本地数据 <b>不会</b> 被动到；浏览器里照常使用</>, <>若再次触发"立即同步到云端"，本地数据会重新上传</>, <>其他设备登录后，会看到云端为空，并可选择拉取本地覆盖</>].map((li, i) => (
          <li key={i} className="flex gap-2"><span className="shrink-0 text-p4g-yellow">▸</span><span className="min-w-0">{li}</span></li>
        ))}
      </ul>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <P4Button variant="secondary" disabled={busy} onClick={onClose}>取消</P4Button>
        <P4Button variant="danger" disabled={busy} onClick={() => { setBusy(true); window.setTimeout(() => { setBusy(false); onClose(); onDone?.('已删除云端 1,284 条记录。本地数据未动。'); }, 900); }}>{busy ? '删除中…' : '确认删除'}</P4Button>
      </div>
    </P4Dialog>
  );
}

export function SyncPrivacySection({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const low = useLowMotion();
  const toast = useToast();
  const [open, setOpen] = useState(defaultOpen);
  const [on, setOn] = useState<Record<string, boolean>>(() => Object.fromEntries(SYNC_GROUPS.map((g) => [g.id, g.def])));
  const [confirm, setConfirm] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const enabled = SYNC_GROUPS.filter((g) => on[g.id]).length;
  return (
    <div className="min-w-0 overflow-hidden rounded-sm border-3 border-p4g-line bg-p4g-surface-2 shadow-hard-sm">
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="flex w-full min-w-0 items-center justify-between gap-2 px-4 py-3 text-left" style={{ background: 'var(--p4g-surface-grad)' }}>
        <span className="min-w-0">
          <span className="block truncate font-display text-body font-bold text-p4g-ink">云同步 · 数据类目选择</span>
          <span className="block text-2xs font-bold text-p4g-ink-soft">当前开启 <b className="p4g-num">{enabled}</b> / {SYNC_GROUPS.length} 组</span>
        </span>
        <IconChevronDown size={18} className={cx('shrink-0 text-p4g-ink transition-transform duration-fast', open && 'rotate-180')} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={low ? { opacity: 0 } : { opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }} className="border-t-3 border-p4g-line">
            <div className="flex flex-col gap-2 p-3">
              {SYNC_GROUPS.map((g) => (
                <div key={g.id} className={cx('flex min-w-0 items-start gap-3 rounded-sm border-thin p-2.5', g.protected ? 'border-p4g-black bg-p4g-yellow text-p4g-black' : 'border-p4g-line bg-p4g-surface text-p4g-ink')}>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <span className="font-display text-body font-bold">{g.label}</span>
                      {g.protected && <span className="rounded-xs bg-p4g-black px-1.5 py-[1px] font-display text-2xs font-bold text-p4g-yellow">必须同步</span>}
                    </div>
                    <p className={cx('mt-0.5 text-2xs leading-relaxed', g.protected ? 'opacity-80' : 'text-p4g-ink-soft')}>{g.hint}</p>
                  </div>
                  <P4Switch size="sm" checked={on[g.id]} disabled={g.protected} onChange={(v) => setOn((o) => ({ ...o, [g.id]: v }))} aria-label={`切换 ${g.label}`} />
                </div>
              ))}
              <p className="px-1 text-2xs leading-relaxed text-p4g-ink-soft">关闭某组后，这些表将仅保留在本地；推送 / 拉取都会跳过它们，登录其他设备时不会看到这些数据。</p>
              <div className="mt-1 rounded-sm border-3 border-p4g-danger p-3">
                <div className="mb-2 flex items-center gap-2"><span className="h-3 w-10 border-y-2 border-p4g-black p4g-hazard" /><span className="font-display text-meta font-bold text-p4g-danger">危险区</span></div>
                <P4Button variant="danger" block onClick={() => setConfirm(true)}>🗑 删除云端数据</P4Button>
                <p className="mt-2 text-2xs text-p4g-ink-soft">仅删除云端存档，本地数据完整保留。下次同步前云端都会是空的。</p>
                {result && <p className="mt-2 rounded-xs bg-p4g-green px-2 py-1 text-meta font-bold text-p4g-black">{result}</p>}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <DeleteCloudDataDialog open={confirm} onClose={() => setConfirm(false)} onDone={(m) => { setResult(m); toast.success('云端数据已删除'); }} />
    </div>
  );
}

export default function SyncPrivacyPanel({ open, onClose }: OverlayProps) {
  const toast = useToast();
  return <DeleteCloudDataDialog open={open} onClose={onClose} onDone={(m) => toast.success(m)} />;
}
