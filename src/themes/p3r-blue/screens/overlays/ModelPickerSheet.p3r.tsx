/**
 * 选择模型抽屉（真实 src/components/ai/ModelPickerSheet.tsx）。mode=fast|deliberate|assistant|vision|audio（?mode=）
 * 按平台分区（当前连接 / 聚合平台角标、计数 N / M 个）、出身徽标、只看对话/能看图/能听写筛选、搜索、刷新、默认/跟随/不启用。
 */
import { useMemo, useState } from 'react';
import type { OverlayProps } from '@blue/registry/types';
import { P6Sheet } from '@blue/screens/pkg6/sheet';
import { CfgInput, CfgToggle, CfgBtn } from '@blue/screens/pkg6/cfg';
import { getSettings, updateSettings, useSettings, type MockSettings } from '@blue/screens/pkg6/settingsStore';
import { AGGREGATORS, MODEL_CATALOG, PROVIDERS, type ModelEntry } from '@blue/mock/pkg6';
import { cx } from '@blue/lib/cx';

export type ModelPickerMode = 'fast' | 'deliberate' | 'assistant' | 'vision' | 'audio';
const FIELD: Record<ModelPickerMode, keyof MockSettings> = { fast: 'summaryModel', deliberate: 'navigatorModel', assistant: 'assistantModel', vision: 'visionModel', audio: 'audioModel' };
const pvLabel = (id: string) => PROVIDERS.find((p) => p.id === id)?.label ?? id;

export function ModelPicker({ mode, open, onClose }: { mode: ModelPickerMode; open: boolean; onClose: () => void }) {
  const s = useSettings();
  const [query, setQuery] = useState('');
  const [chatOnly, setChatOnly] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState('');
  const [catalog, setCatalog] = useState<Record<string, ModelEntry[]>>(MODEL_CATALOG);
  const fast = mode === 'fast', vision = mode === 'vision', audio = mode === 'audio', assistant = mode === 'assistant';
  const filterLabel = vision ? '只看能看图' : audio ? '只看能听写' : '只看对话';
  const current = String(s[FIELD[mode]] ?? '');
  const active = s.provider;
  const platforms = fast ? [active] : Object.keys(s.keys).filter((k) => s.keys[k as keyof typeof s.keys]);
  const cap = (m: ModelEntry) => (vision ? !!m.vision : audio ? !!m.audio : !!m.chat);
  const delib = s.navigatorModel || '未配置';
  const defaultLabel = fast ? `默认（${PROVIDERS.find((p) => p.id === active)?.defaultModel}）` : assistant ? `跟随深思熟虑档（${delib}）` : vision ? '不启用（拍照记账退回本地 OCR / 手输）' : audio ? '不启用（不显示语音话筒）' : `跟随快速响应（${s.summaryModel || 'deepseek-flash'}）`;
  const title = fast ? '◢ 快速响应 · 选择模型' : assistant ? '◈ 助手专属模型' : vision ? '◉ 视觉 · 选择模型' : audio ? '◎ 听觉 · 选择模型' : '☾ 深思熟虑 · 选择模型';
  const pick = (m: string) => { updateSettings({ [FIELD[mode]]: m } as Partial<MockSettings>); onClose(); };
  const refresh = () => {
    setRefreshing(true); setRefreshMsg('');
    setTimeout(() => {
      setRefreshing(false);
      setCatalog((c) => ({ ...c, openai: [{ id: 'gpt-6-luna', chat: true, vision: true }, { id: 'whisper-1', audio: true }] }));
      setRefreshMsg('已更新：DeepSeek（3）、千问（7）\n跳过：OpenAI —— 没存 Key');
    }, 900);
  };
  const lists = useMemo(() => platforms.map((pv) => {
    const all = catalog[pv] ?? [];
    const q = query.trim().toLowerCase();
    const filtered = all.filter((m) => (!chatOnly || cap(m)) && (!q || m.id.toLowerCase().includes(q)));
    return { pv, all, filtered };
  }), [platforms.join(','), catalog, query, chatOnly]); // eslint-disable-line

  return (
    <P6Sheet open={open} onClose={onClose} title={title} en="MODEL SELECT" size="tall"
      footer={<p className="text-meta text-p3r-ink-soft">提示：「测试连接」成功时会自动拉一次当前家的列表。</p>}>
      <div className="space-y-3 pt-1">
        <p className="rounded-none border-l-4 border-p3r-coral bg-p3r-panel px-3 py-2 text-meta leading-relaxed text-p3r-ink-soft">
          {assistant ? <>这里只改<b className="text-p3r-ink">助手</b>（对话 / 每日问候 / 人格生成）用的模型，不影响中长期占卜等其它走「深思熟虑」的功能。</>
            : vision ? <>拍小票记账等<b className="text-p3r-ink">看图</b>任务用这档。服务商在模型列表里标明能看图的（如 DeepSeek）带 ◉ 徽标、按官方说法筛；没标的按名字猜——猜错了调用会报错，不影响别的功能；关掉筛选可以看全量、也能直接手填。</>
              : audio ? <><b className="text-p3r-ink">语音转写</b>用这档（走 /audio/transcriptions 端点）。配好后助手输入栏会出现话筒，按住说话、松手转成文字填进输入框——发不发还是你决定。</>
                : <>按<b className="text-p3r-ink">平台</b>分区——模型跑在哪家、用哪把 Key 计费；条目右侧的徽标是模型<b className="text-p3r-ink">出身</b>：聚合平台（如千问）会托管别家的开源版，带「DeepSeek 系」徽标的是托管版，官方 API 请去 DeepSeek 分区选。</>}
        </p>
        <div className="flex min-w-0 items-center gap-2">
          <CfgInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索模型名…" aria-label="搜索模型名" />
          <CfgBtn onClick={refresh} disabled={refreshing}>{refreshing ? '拉取中…' : '刷新'}</CfgBtn>
        </div>
        <div className="flex min-w-0 items-center justify-between gap-2 rounded-none bg-p3r-panel px-3 py-1.5">
          <span className="font-heavy text-body font-bold">{filterLabel}</span>
          <CfgToggle ariaLabel={filterLabel} checked={chatOnly} onChange={setChatOnly} />
        </div>
        {refreshMsg && <p className="whitespace-pre-line text-meta font-bold text-p3r-ink-soft">{refreshMsg}</p>}
        <button type="button" onClick={() => pick('')} className={cx('flex w-full min-w-0 items-center gap-2 rounded-none px-3 py-2.5 text-left', current === '' ? 'bg-p3r-ink text-[color:var(--p3r-on-ink)]' : 'bg-p3r-panel hover:bg-p3r-blush')}>
          <span aria-hidden className="w-4 shrink-0">{current === '' ? '▶' : ''}</span><span className="min-w-0 truncate font-heavy text-body font-bold">{defaultLabel}</span>
        </button>
        {lists.map(({ pv, all, filtered }) => (
          <section key={pv} className="min-w-0">
            <div className="mb-1 flex min-w-0 items-center gap-2">
              <span className="-skew-x-12 bg-p3r-ink px-2.5 py-0.5 font-heavy text-meta font-bold text-p3r-rose"><span className="inline-block skew-x-12">{pvLabel(pv)}</span></span>
              {pv === active && <span className="rounded-[2px] bg-p3r-mint px-1.5 text-2xs font-bold text-p3r-ink">当前连接</span>}
              {AGGREGATORS.has(pv) && <span className="rounded-[2px] bg-p3r-lilac-ink px-1.5 text-2xs font-bold text-p3r-on-ink">聚合平台</span>}
              <span className="ml-auto shrink-0 font-cond tabular text-meta">{all.length === 0 ? '未拉取' : chatOnly || query ? `${filtered.length} / ${all.length} 个` : `${all.length} 个`}</span>
            </div>
            {all.length === 0 ? <p className="rounded-none border-2 border-dashed border-p3r-lilac/30 px-3 py-2 text-meta text-p3r-ink-soft">还没拉过这家的模型列表——点上方「刷新」（不支持 /models 的第三方网关会提示跳过，直接手填即可）。</p>
              : filtered.length === 0 ? <p className="px-1 text-meta text-p3r-ink-soft">没有匹配的条目（试试关掉「{filterLabel}」或换个关键词）。</p>
                : (
                  <ul className="grid grid-cols-1 gap-[5px]">
                    {filtered.map((m) => {
                      const on = current === m.id;
                      return (
                        <li key={m.id}>
                          <button type="button" onClick={() => pick(m.id)} className={cx('group flex w-full min-w-0 items-center gap-2 rounded-none px-3 py-2 text-left transition-colors', on ? 'bg-p3r-ink text-[color:var(--p3r-on-ink)]' : 'bg-p3r-blush text-p3r-ink hover:bg-p3r-ink hover:text-[color:var(--p3r-on-ink)]')}>
                            <span aria-hidden className="w-4 shrink-0">{on ? '▶' : ''}</span>
                            <span className="min-w-0 flex-1 truncate font-num text-body font-bold">{m.id}</span>
                            {m.vision && <span title="服务商标明能看图" className="shrink-0 rounded-[2px] border border-current px-1 text-2xs">◉ 能看图</span>}
                            {m.family && <span className="shrink-0 rounded-[2px] bg-p3r-coral px-1 text-2xs font-bold text-p3r-ink">{m.family}</span>}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
          </section>
        ))}
      </div>
    </P6Sheet>
  );
}

export default function ModelPickerSheet({ open, onClose, params }: OverlayProps) {
  const mode = (params?.get('mode') as ModelPickerMode) || 'deliberate';
  void getSettings;
  return <ModelPicker mode={mode} open={open} onClose={onClose} />;
}
