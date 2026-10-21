/** 设置 · AI 总结（真实 Settings.tsx section=summary）：路标 / 沟通风格 / 熟悉的人 / 内置·自定义风格 / 自动撰写 */
import { useState } from 'react';
import type { SummaryPromptPreset } from '@/types';
import { CfgBtn, CfgInput, CfgList, CfgRow, CfgSubhead, CfgTextarea, CfgToggle } from '../cfg';
import { updateSettings, useSettings } from '../settingsStore';
import { SUMMARY_PERSONAS } from '@blue/adapters/pkg6';
import { cx } from '@blue/lib/cx';

export function SummarySection({ onJumpAI }: { onJumpAI: () => void }) {
  const s = useSettings();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SummaryPromptPreset | null>(null);
  const presets = s.summaryPresets;
  const save = (p: SummaryPromptPreset) => { updateSettings({ summaryPresets: presets.map((x) => (x.id === p.id ? p : x)) }); setEditingId(null); setDraft(null); };
  const add = () => { const n: SummaryPromptPreset = { id: `c${Date.now()}`, name: '自定义风格', systemPrompt: '' }; updateSettings({ summaryPresets: [...presets, n] }); setDraft(n); setEditingId(n.id); };
  const del = (id: string) => { updateSettings({ summaryPresets: presets.filter((p) => p.id !== id), summaryPresetId: s.summaryPresetId === id ? 'warm' : s.summaryPresetId }); };

  return (
    <div className="space-y-2">
      <button type="button" onClick={onJumpAI} className="flex w-full min-w-0 items-center gap-2 rounded-none border-2 border-dashed border-p3r-lilac/50 bg-p3r-panel px-3 py-2.5 text-left text-p3r-ink">
        <span aria-hidden>◇</span><span className="min-w-0 flex-1 truncate font-heavy text-body font-bold">API Key 和模型已移到「AI 服务」</span><span className="shrink-0 font-heavy text-meta font-bold text-p3r-lilac-ink">前往 ›</span>
      </button>
      <CfgSubhead en="VOICE">沟通风格</CfgSubhead>
      <CfgList>
        <CfgRow label="熟悉的人" hint="总结信的署名与口吻">
          <div role="radiogroup" aria-label="熟悉的人" className="grid w-full grid-cols-2 gap-1.5 sm:max-w-[440px]">
            {SUMMARY_PERSONAS.map((p) => {
              const on = s.summaryPersona === p.id;
              return (
                <button key={p.id} type="button" role="radio" aria-checked={on} onClick={() => updateSettings({ summaryPersona: p.id })}
                  className={cx('p6-press flex min-w-0 items-center gap-2 rounded-none border-2 px-2 py-1.5 text-left', on ? 'border-p3r-lilac/50 bg-p3r-rose text-p3r-on-rose' : 'border-dashed border-current')}>
                  <span aria-hidden className="text-h3">{p.icon}</span>
                  <span className="min-w-0"><span className="block truncate font-heavy text-body font-bold">{p.name}</span><span className="block truncate text-2xs opacity-80">{p.desc}</span></span>
                </button>
              );
            })}
          </div>
        </CfgRow>
        <CfgRow label="内置 / 自定义" hint="点一条即选用"
          below={
            <div className="space-y-1.5">
              {presets.map((p) => {
                const on = s.summaryPresetId === p.id;
                if (editingId === p.id && draft) return (
                  <div key={p.id} className="space-y-2 rounded-none border-2 border-p3r-coral bg-p3r-blush-faint p-2.5 text-p3r-ink">
                    <CfgInput placeholder="风格名称" aria-label="风格名称" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                    <CfgTextarea rows={4} placeholder="输入 system prompt…" aria-label="system prompt" value={draft.systemPrompt} onChange={(e) => setDraft({ ...draft, systemPrompt: e.target.value })} />
                    <div className="flex justify-end gap-2"><CfgBtn onClick={() => { setEditingId(null); setDraft(null); }}>取消</CfgBtn><CfgBtn tone="primary" onClick={() => save(draft)}>保存</CfgBtn></div>
                  </div>
                );
                return (
                  <div key={p.id} className={cx('flex min-w-0 items-start gap-2 rounded-none border-2 px-2.5 py-2', on ? 'border-p3r-lilac/50 bg-p3r-ink text-p3r-rose' : 'border-transparent bg-[rgb(var(--p3r-panel-rgb)/0.6)] text-p3r-ink')}>
                    <button type="button" onClick={() => updateSettings({ summaryPresetId: p.id })} className="min-w-0 flex-1 text-left">
                      <span className="flex min-w-0 items-center gap-1.5 font-heavy text-body font-bold">{on && <span aria-hidden>▶</span>}<span className="truncate">{p.name}</span>{p.isBuiltin && <span className="shrink-0 rounded-[2px] bg-p3r-coral px-1 text-2xs text-p3r-ink">内置</span>}</span>
                      {p.systemPrompt ? <span className="mt-0.5 block p3r-clamp-2 text-meta opacity-80">{p.systemPrompt}</span> : <span className="mt-0.5 block text-meta italic opacity-70">暂无 prompt，点击编辑</span>}
                    </button>
                    <div className="flex shrink-0 gap-1">
                      <button type="button" onClick={() => { setDraft(p); setEditingId(p.id); }} className="rounded-none border-2 border-current px-1.5 py-0.5 font-heavy text-2xs font-bold">编辑</button>
                      {!p.isBuiltin && <button type="button" onClick={() => del(p.id)} className="rounded-none border-2 border-current px-1.5 py-0.5 font-heavy text-2xs font-bold">删除</button>}
                    </div>
                  </div>
                );
              })}
              <CfgBtn tone="primary" onClick={add} className="w-full">+ 新增</CfgBtn>
            </div>
          } />
        <CfgRow inline label="自动撰写上一期总结" hint="新的一周、一个月第一次打开时，上一期还没写就在后台写好，写完提醒你一次「可以查看了」。用当前选的风格。">
          <CfgToggle ariaLabel="自动撰写上一期总结" checked={s.autoSummary} onChange={(v) => updateSettings({ autoSummary: v })} />
        </CfgRow>
      </CfgList>
    </div>
  );
}
