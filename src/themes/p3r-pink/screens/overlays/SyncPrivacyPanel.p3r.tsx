/**
 * 云同步 · 数据类目选择（真实 src/components/auth/SyncPrivacyPanel.tsx）。
 * 折叠头「云同步 · 数据类目选择 / 当前开启 N / M 组」→ 九组 CONFIG 行 ON·OFF（核心档案 必须同步 …）→ 说明 → 危险区「删除云端数据」
 * → 确认框「确认删除云端数据？ / 此操作不可撤销」+ 4 条说明 + 取消 / 确认删除（删除中…）→ 结果「已删除云端 N 条记录。本地数据未动。」
 * 默认导出 = 删除确认（account-delete-cloud-data）；SyncPrivacySection 给账号页用（account-sync-privacy）。
 */
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { OverlayProps } from '@pink/registry/types';
import { P3Dialog, P3Button, P3OnOff, P3R, slantClip, IconChevronDown, IconTrash, useToast } from '@pink/kit';
import { useBoldness } from '@pink/lib/prefs';

export const SYNC_GROUPS = [
  { id: 'core', label: '核心档案', hint: '账号 / 五维属性 / 设置 —— 始终同步，保证账号在不同设备能正常加载', protected: true, def: true },
  { id: 'apiKey', label: 'AI 模型 API', hint: 'API Key（AI 摘要 / 谏言 / Persona / 同伴解读 都用这把钥匙）。默认不上传——钥匙留在本机最安全，代价是换设备要重填一次。', def: false },
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
    <P3Dialog open={open} onClose={onClose} tone="danger" variant="system" title="确认删除云端数据？" busy={busy} busyText="删除中…" confirmText="确认删除" cancelText="取消"
      onConfirm={() => { setBusy(true); window.setTimeout(() => { setBusy(false); onClose(); onDone?.('已删除云端 1,284 条记录。本地数据未动。'); }, 900); }}>
      <p className="text-[13px] font-black" style={{ color: 'var(--p3r-coral-ink)' }}>此操作不可撤销</p>
      <ul className="mt-2 flex flex-col gap-1.5 text-[12px] leading-relaxed" style={{ color: P3R.ink }}>
        {['仅清空你本账号在云端的所有 user_data 记录', '本地数据不会被动到；浏览器里照常使用', '若再次触发"立即同步到云端"，本地数据会重新上传', '账号本身保留，需要彻底注销请用「永久删除云端账号」'].map((li) => (
          <li key={li} className="flex gap-2"><span className="shrink-0" style={{ color: P3R.blue }}>▸</span><span className="min-w-0">{li}</span></li>
        ))}
      </ul>
    </P3Dialog>
  );
}

export function SyncPrivacySection({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const anim = useBoldness();
  const toast = useToast();
  const [open, setOpen] = useState(defaultOpen);
  const [on, setOn] = useState<Record<string, boolean>>(() => Object.fromEntries(SYNC_GROUPS.map((g) => [g.id, g.def])));
  const [confirm, setConfirm] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const enabled = SYNC_GROUPS.filter((g) => on[g.id]).length;
  return (
    <div className="min-w-0" style={{ clipPath: slantClip(14), background: P3R.panelGlass }}>
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="flex w-full min-w-0 items-center justify-between gap-2 py-3 pl-6 pr-6 text-left">
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-black" style={{ color: P3R.ink }}>云同步 · 数据类目选择</span>
          <span className="block text-[11px] font-bold" style={{ color: P3R.grey }}>当前开启 <b className="font-cond text-[13px]" style={{ color: P3R.blue }}>{enabled}</b> / {SYNC_GROUPS.length} 组</span>
        </span>
        <span className="shrink-0 transition-transform duration-200" style={{ color: P3R.blue, transform: open ? 'rotate(180deg)' : undefined }}><IconChevronDown size={18} /></span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={anim ? { opacity: 0, y: -8 } : { opacity: 0 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}>
            <div className="flex flex-col gap-1.5 px-4 pb-4">
              {SYNC_GROUPS.map((g) => (
                <div key={g.id} className="relative flex min-w-0 items-center gap-3 py-2 pl-5 pr-3" style={{ clipPath: slantClip(10), background: g.protected ? P3R.cyanPale : 'var(--p3r-row)' }}>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <span className="text-[14px] font-black" style={{ color: P3R.ink }}>{g.label}</span>
                      {g.protected && <span className="px-1.5 text-[10px] font-black" style={{ background: P3R.ink, color: 'var(--p3r-on-ink)', clipPath: slantClip(3) }}>必须同步</span>}
                    </div>
                    <p className="mt-0.5 text-[11px] leading-relaxed" style={{ color: P3R.grey }}>{g.hint}</p>
                  </div>
                  <P3OnOff value={on[g.id]} disabled={g.protected} onChange={(v) => setOn((o) => ({ ...o, [g.id]: v }))} ariaLabel={`切换 ${g.label}`} />
                </div>
              ))}
              <p className="px-1 text-[11px] leading-relaxed" style={{ color: P3R.grey }}>关闭某组后，这些表将仅保留在本地；推送 / 拉取都会跳过它们，登录其他设备时不会看到这些数据。</p>
              <div className="mt-1 px-4 py-3" style={{ clipPath: slantClip(10), background: 'rgb(var(--p3r-magenta-rgb) / 0.1)' }}>
                <div className="mb-2 text-[12px] font-black tracking-widest" style={{ color: 'var(--p3r-coral-ink)' }}>危险区</div>
                <P3Button tone="danger" block leading={<IconTrash size={16} />} onClick={() => setConfirm(true)}>删除云端数据</P3Button>
                <p className="mt-2 text-[11px]" style={{ color: P3R.grey }}>仅删除云端存档，本地数据完整保留。下次同步前云端都会是空的。</p>
                {result && <p className="mt-2 px-3 py-1 text-[12px] font-black" style={{ background: 'var(--p3r-mint)', color: 'var(--p3r-mulberry)', clipPath: slantClip(5) }}>{result}</p>}
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
