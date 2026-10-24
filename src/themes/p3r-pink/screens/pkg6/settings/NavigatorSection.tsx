/** 设置 · 助手（真实 components/navigator/NavigatorSettings.tsx） */
import { useEffect, useState } from 'react';
import type { NavigatorPreset } from '@real/types';
import { useAppStore } from '@/store';
import { useNavigatorStore } from '@/store/navigator';
import { BUILTIN_NAVIGATOR_PRESETS, mergedNavigatorPresets } from '@/constants/navigatorPresets';
import { getAIConfig } from '@/utils/aiClient';
import { CfgBtn, CfgList, CfgRow, CfgSubhead, CfgToggle } from '../cfg';
import { updateSettings, useSettings } from '../settingsStore';
import { PersonaEditor, Glyph } from '@pink/screens/overlays/NavigatorPersonaEditor.p3r';
import { PersonaDeleteDialog } from '@pink/screens/overlays/NavigatorSettingsPersonaDeleteConfirm.p3r';
import { Notebook } from '@pink/screens/overlays/NavigatorNotebook.p3r';
import { ModelPicker } from '@pink/screens/overlays/ModelPickerSheet.p3r';
import { useToast } from '@pink/kit';
import { cx } from '@pink/lib/cx';
import { finalizeStaleSessions } from '@/utils/navigatorMemory';

export function NavigatorSection() {
  const s = useSettings();
  const nav = useNavigatorStore();
  const realSettings = useAppStore((state) => state.settings);
  const toast = useToast();
  const [editor, setEditor] = useState<{ open: boolean; editing: NavigatorPreset | null }>({ open: false, editing: null });
  const [del, setDel] = useState<NavigatorPreset | null>(null);
  const [notebook, setNotebook] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [archiveDone, setArchiveDone] = useState('');
  const [modelOpen, setModelOpen] = useState(false);
  const [picker, setPicker] = useState(false);
  const personas = mergedNavigatorPresets(nav.presets);
  const builtinIds = new Set(BUILTIN_NAVIGATOR_PRESETS.map((item) => item.id));
  const active = nav.activePreset();
  const hasKey = !!getAIConfig(realSettings);
  const activeName = active.name;
  useEffect(() => { void nav.loadPresets(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const runArchive = async () => {
    setArchiving(true);
    setArchiveDone('');
    try {
      const last = await finalizeStaleSessions();
      setArchiveDone(last ? `已归档，最近摘要：${last.summary.slice(0, 40)}…` : '没有待归档的会话');
    } catch (e) {
      setArchiveDone(e instanceof Error ? e.message : '整理失败，请稍后重试');
    } finally {
      setArchiving(false);
    }
  };

  return (
    <div className="space-y-2">
      <CfgList>
        <CfgRow inline label="拟真增强" hint="回复像真人打字：流式生成 + 按句子切成碎气泡逐条冒出（1.2s 一条）；括号里的颜文字、括注不拆开。低性能模式下自动停用。">
          <CfgToggle ariaLabel="拟真增强" checked={s.realisticTyping} onChange={(v) => updateSettings({ realisticTyping: v })} />
        </CfgRow>
        <CfgRow inline label="主动提议更新愿望进度" hint={<>你在对话里提到某个愿望有推进时，它会问一句「要不要更新进度」。只在<b>明确指向单个愿望且确有推进</b>时才问，同一个愿望 6 小时内至多一次；落库永远要你点确认。关掉后它照旧知道你的愿望，只是不再主动问。</>}>
          <CfgToggle ariaLabel="主动提议更新愿望进度" checked={s.wishProposal} onChange={(v) => updateSettings({ wishProposal: v })} />
        </CfgRow>
        <CfgRow inline label="主动找你" hint={<>每天最多一条推送：约好的事过后问你一句结果、认识满一个月这样的日子、好几天没见时说一次想念。夜里不发；锁屏上只写「{activeName}有话想跟你说」。{!s.notificationsEnabled && <b> 要先在「提醒」里打开每日提醒。</b>}</>}>
          <CfgToggle ariaLabel="主动找你" checked={s.proactive} onChange={(v) => updateSettings({ proactive: v })} />
        </CfgRow>
      </CfgList>

      <CfgSubhead en="PERSONA">人格</CfgSubhead>
      <p className="text-meta font-bold text-[color:var(--p3r-on-stage)]">切换人格会开启（或恢复）它今天的对话。能力不变，变的只是性格和嘴。</p>
      <ul className="grid grid-cols-1 gap-[6px]">
        {personas.map((p) => {
          const on = active.id === p.id;
          return (
            <li key={p.id} className={cx('group flex min-w-0 flex-wrap items-center gap-3 rounded-none px-3 py-2.5 transition-colors', on ? 'bg-p3r-ink text-[color:var(--p3r-on-ink)]' : 'bg-[rgb(var(--p3r-cyan-pale-rgb)/0.92)] text-p3r-ink')}>
              <span className={cx('flex h-11 w-11 shrink-0 items-center justify-center rounded-none border-2', on ? 'border-p3r-rose bg-p3r-rose text-p3r-on-rose' : 'border-p3r-lilac/50 bg-p3r-panel text-p3r-ink')}><Glyph id={p.avatar} size={26} /></span>
              <div className="min-w-[8rem] flex-1">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate font-heavy text-lead font-bold">{p.name}</span>
                  {p.isBuiltin && <span className="shrink-0 rounded-[2px] bg-p3r-coral px-1 text-2xs font-bold text-p3r-ink">内置</span>}
                  {on && <span className="shrink-0 rounded-[2px] bg-p3r-rose px-1 text-2xs font-bold text-p3r-on-rose">当前</span>}
                </div>
                <p className="truncate text-meta opacity-75">{p.personaPrompt.replace(/^你是「[^」]*」—*/, '').slice(0, 40)}…</p>
              </div>
              <div className="ml-auto flex shrink-0 flex-wrap justify-end gap-1">
                {!on && <CfgBtn tone="primary" onClick={() => void nav.switchPreset(p.id).then(() => toast(`已切换到「${p.name}」`, { duration: 1200 }))}>切换</CfgBtn>}
                {!p.isBuiltin && <CfgBtn aria-label={`编辑 ${p.name}`} onClick={() => setEditor({ open: true, editing: p })}>编辑</CfgBtn>}
                {!p.isBuiltin && <CfgBtn tone="danger" aria-label={`删除 ${p.name}`} onClick={() => setDel(p)}>删除</CfgBtn>}
                {builtinIds.has(p.id) && nav.presets.some((item) => item.id === p.id) && <CfgBtn aria-label={`恢复 ${p.name} 默认`} onClick={() => void nav.deletePreset(p.id).then(() => toast('已恢复默认'))}>恢复默认</CfgBtn>}
              </div>
            </li>
          );
        })}
      </ul>
      {hasKey
        ? <button type="button" onClick={() => setEditor({ open: true, editing: null })} className="p6-press w-full rounded-none border-2 border-dashed border-p3r-lilac/50 bg-p3r-rose py-3 font-heavy text-lead font-bold text-p3r-on-rose">＋ 新建人格（AI 生成）</button>
        : <p className="rounded-none bg-p3r-panel px-3 py-2 text-meta text-p3r-ink">配置 AI 密钥后可创建自定义人格。</p>}

      <CfgList className="pt-3">
        <CfgRow inline label="✎ 记事本" hint="它记住的关于你的事：长期画像 + 零散记忆，可改可删，只存本机。"><CfgBtn tone="primary" onClick={() => setNotebook(true)}>打开</CfgBtn></CfgRow>
        <CfgRow inline label="整理旧对话" hint={archiveDone || '把之前没归档的聊天收进记忆（平时它会自己做）。'}>
          <CfgBtn disabled={archiving} onClick={() => void runArchive()}>{archiving ? '整理中…' : '整理'}</CfgBtn>
        </CfgRow>
      </CfgList>

      <div className="pt-2">
        <button type="button" onClick={() => setModelOpen((v) => !v)} aria-expanded={modelOpen} className="flex w-full min-w-0 items-center gap-2 rounded-none bg-p3r-ink px-3 py-2.5 text-left text-p3r-on-ink night:border-2">
          <span className="shrink-0 font-heavy text-body font-bold text-p3r-rose">对话模型</span>
          <span className="min-w-0 flex-1 truncate text-right font-num text-meta">{s.assistantModel || '跟随深思熟虑档'}</span>
          <span aria-hidden className="text-p3r-rose">{modelOpen ? '▲' : '▼'}</span>
        </button>
        {modelOpen && (
          <div className="mt-[6px] space-y-2 rounded-none bg-[rgb(var(--p3r-cyan-pale-rgb)/0.92)] p-3 text-p3r-ink">
            {hasKey ? (
              <>
                <p className="text-meta leading-relaxed">只给<b>助手</b>（对话 / 每日问候 / 人格生成）单独指定模型，可跨服务商（用那家已存的 Key 直连）。留空 = 跟随「深思熟虑」档；这里的选择<b>不会</b>影响中长期占卜等其它走深思熟虑的功能。</p>
                <button type="button" onClick={() => setPicker(true)} className="flex w-full min-w-0 items-center gap-2 rounded-none border-2 border-p3r-lilac/50 bg-p3r-panel px-3 py-2 text-left text-p3r-ink">
                  <span className="min-w-0 flex-1 truncate font-num text-body font-bold">{s.assistantModel || `跟随深思熟虑档（${s.navigatorModel || '未配置'}）`}</span><span className="shrink-0 font-heavy text-meta font-bold text-p3r-lilac-ink">选择模型 ›</span>
                </button>
                {s.assistantModel && <CfgBtn onClick={() => updateSettings({ assistantModel: '' })}>恢复跟随深思熟虑档</CfgBtn>}
              </>
            ) : <p className="text-meta">先在「设置 → AI 智能功能」里配置 API Key，这里才能选模型。</p>}
          </div>
        )}
      </div>

      <PersonaEditor open={editor.open} editing={editor.editing} onClose={() => setEditor((e) => ({ ...e, open: false }))} />
      <PersonaDeleteDialog open={!!del} label={del?.name ?? ''} onClose={() => setDel(null)} onConfirm={() => { if (del) void nav.deletePreset(del.id).then(() => setDel(null)); }} />
      <Notebook open={notebook} onClose={() => setNotebook(false)} />
      <ModelPicker mode="assistant" open={picker} onClose={() => setPicker(false)} />
    </div>
  );
}
