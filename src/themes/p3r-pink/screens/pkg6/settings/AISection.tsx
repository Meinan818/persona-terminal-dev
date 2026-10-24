/** 设置 · AI 服务（真实 components/settings/AIServiceSettings.tsx）：连接卡 / 提供商 / Key / 地址 / 模型分档 / 诊断 */
import { useState } from 'react';
import { CfgBtn, CfgInput, CfgList, CfgMsg, CfgRow, CfgSeg, CfgSubhead, CfgToggle } from '../cfg';
import { updateSettings, useSettings } from '../settingsStore';
import { CUSTOM_PRESETS, PROVIDERS, type ProviderId } from '@pink/mock/pkg6';
import { ModelPicker, type ModelPickerMode } from '@pink/screens/overlays/ModelPickerSheet.p3r';
import { cx } from '@pink/lib/cx';
import { useAppStore } from '@/store';
import { buildAIDiagnostics } from '@/utils/aiDiagnostics';
import { cleanApiKey, fetchAvailableModels, testAIConnection, type ApiProvider } from '@/utils/aiProviders';
import { hostOfUrl } from '@/utils/aiTransport';
import type { Settings } from '@/types';

type TestStatus = 'idle' | 'testing' | 'ok' | 'error';
const pv = (id: ProviderId) => PROVIDERS.find((p) => p.id === id)!;
const keyOf = (settings: Settings, id: ProviderId): string => {
  const provider = id as ApiProvider;
  const active = settings.summaryApiProvider === provider ? settings.summaryApiKey?.trim() : '';
  return active || settings.aiProfiles?.[provider]?.key?.trim() || '';
};
const verifiedOf = (settings: Settings, id: ProviderId): boolean =>
  !!settings.aiProfiles?.[id as ApiProvider]?.verifiedAt;

export function AISection() {
  const s = useSettings();
  const realSettings = useAppStore((state) => state.settings);
  const updateRealSettings = useAppStore((state) => state.updateSettings);
  const [expanded, setExpanded] = useState(() => !keyOf(realSettings, s.provider));
  const [keyDraft, setKeyDraft] = useState(keyOf(realSettings, s.provider));
  const [saved, setSaved] = useState(false);
  const [test, setTest] = useState<TestStatus>('idle');
  const [testMsg, setTestMsg] = useState('');
  const [tiersOpen, setTiersOpen] = useState(true);
  const [tierTesting, setTierTesting] = useState(false);
  const [tierResults, setTierResults] = useState<{ label: string; model: string; text: string }[]>([]);
  const [fetching, setFetching] = useState(false);
  const [fetchMsg, setFetchMsg] = useState('');
  const [picker, setPickerRaw] = useState<ModelPickerMode | null>(null);
  const [pickerMode, setPickerMode] = useState<ModelPickerMode>('fast');
  const setPicker = (m: ModelPickerMode | null) => { if (m) setPickerMode(m); setPickerRaw(m); };
  const [diag, setDiag] = useState<'' | 'ok' | 'fail'>('');
  const provider = s.provider;
  const isCustom = provider === 'custom';
  const configured = !!keyOf(realSettings, provider);
  const savedCount = PROVIDERS.filter((p) => !!keyOf(realSettings, p.id)).length;
  const customMissing = isCustom ? [!s.baseUrl.trim() && '地址', !s.summaryModel.trim() && '模型'].filter(Boolean) as string[] : [];

  const switchPv = (id: ProviderId) => {
    const currentKey = cleanApiKey(keyDraft).key || keyOf(realSettings, provider);
    const profiles = { ...(realSettings.aiProfiles ?? {}) };
    profiles[provider as ApiProvider] = {
      ...(profiles[provider as ApiProvider] ?? {}),
      key: currentKey || undefined,
      baseUrl: s.baseUrl,
      model: s.summaryModel,
      navModel: s.navigatorModel,
      navProvider: realSettings.navigatorProvider,
    };
    const next = profiles[id as ApiProvider] ?? {};
    void updateRealSettings({
      aiProfiles: profiles,
      summaryApiProvider: id as ApiProvider,
      summaryApiKey: next.key ?? '',
      summaryApiBaseUrl: next.baseUrl ?? '',
      summaryModel: next.model ?? '',
      navigatorModel: next.navModel ?? '',
      navigatorProvider: next.navModel ? next.navProvider : undefined,
    });
    setKeyDraft(next.key ?? '');
    setTest('idle');
    setTestMsg('');
    setSaved(false);
  };
  const save = () => {
    const key = cleanApiKey(keyDraft).key;
    setKeyDraft(key);
    void updateRealSettings({
      summaryApiKey: key,
      aiProfiles: {
        ...(realSettings.aiProfiles ?? {}),
        [provider as ApiProvider]: {
          ...(realSettings.aiProfiles?.[provider as ApiProvider] ?? {}),
          key: key || undefined,
          baseUrl: s.baseUrl,
          model: s.summaryModel,
          verifiedAt: undefined,
        },
      },
    });
    setTest('idle');
    setTestMsg('');
    setSaved(true);
  };
  const runTest = async () => {
    const key = cleanApiKey(keyDraft).key || keyOf(realSettings, provider);
    if (!key) { setTest('error'); setTestMsg('请先填写 API 密钥'); return; }
    if (isCustom && !s.baseUrl.trim()) { setTest('error'); setTestMsg('先填 API 地址（或点上面的预设）'); return; }
    setTest('testing');
    setTestMsg('');
    const result = await testAIConnection({
      provider: provider as ApiProvider,
      apiKey: key,
      baseUrl: s.baseUrl,
      model: isCustom ? s.summaryModel : s.summaryModel || pv(provider).defaultModel,
      nativeHosts: realSettings.aiNativeHosts,
      ...(isCustom ? { protocol: s.customProtocol } : {}),
    });
    if (!result.ok) {
      setTest('error');
      setTestMsg(result.error);
      return;
    }
    const hosts = [...(realSettings.aiNativeHosts ?? [])];
    if (result.nativeHost && !hosts.includes(result.nativeHost)) hosts.push(result.nativeHost);
    const models = await fetchAvailableModels({
      provider: provider as ApiProvider,
      apiKey: key,
      baseUrl: result.baseUrlUsed,
      nativeHosts: hosts,
      ...(isCustom ? { protocol: s.customProtocol } : {}),
    });
    await updateRealSettings({
      ...(result.corrected ? { summaryApiBaseUrl: result.baseUrlUsed } : {}),
      ...(hosts.length !== (realSettings.aiNativeHosts ?? []).length ? { aiNativeHosts: hosts } : {}),
      summaryApiKey: key,
      aiProfiles: {
        ...(realSettings.aiProfiles ?? {}),
        [provider as ApiProvider]: {
          ...(realSettings.aiProfiles?.[provider as ApiProvider] ?? {}),
          key,
          baseUrl: result.baseUrlUsed,
          model: s.summaryModel,
          verifiedAt: Date.now(),
          ...(models.ok ? { models: models.models, modelCaps: models.caps } : {}),
        },
      },
    });
    setKeyDraft(key);
    setSaved(true);
    setTest('ok');
    setTestMsg(`连接成功 · ${result.model} · ${result.latencyMs} ms${models.ok ? ` · 已取得 ${models.models.length} 个模型` : ''}${result.nativeHost ? ` · 原生通道 ${hostOfUrl(result.baseUrlUsed)}` : ''}`);
  };
  const tierTest = async () => {
    if (tierTesting) return;
    setTierTesting(true);
    const out: { label: string; model: string; text: string }[] = [];
    const testOne = async (label: string, id: ProviderId, model: string) => {
      const key = keyOf(realSettings, id);
      if (!key) { out.push({ label, model, text: '那家还没保存 Key' }); setTierResults([...out]); return; }
      const baseUrl = id === realSettings.summaryApiProvider ? s.baseUrl : realSettings.aiProfiles?.[id as ApiProvider]?.baseUrl;
      const result = await testAIConnection({
        provider: id as ApiProvider,
        apiKey: key,
        baseUrl,
        model: model || pv(id).defaultModel,
        nativeHosts: realSettings.aiNativeHosts,
        ...(id === 'custom' ? { protocol: s.customProtocol } : {}),
      });
      out.push({ label, model, text: result.ok ? `✓ 通了 · ${result.latencyMs} ms${result.transport === 'native' ? ' · 原生通道' : ''}` : `× ${result.error}` });
      setTierResults([...out]);
    };
    await testOne('快速响应', provider, s.summaryModel || pv(provider).defaultModel);
    if (s.navigatorModel) await testOne('深思熟虑', (realSettings.navigatorProvider ?? provider) as ProviderId, s.navigatorModel);
    else { out.push({ label: '深思熟虑', model: '', text: '跟随快速响应' }); setTierResults([...out]); }
    if (s.assistantModel) await testOne('助手', provider, s.assistantModel);
    else { out.push({ label: '助手', model: '', text: '跟随深思熟虑' }); setTierResults([...out]); }
    if (s.visionModel || realSettings.visionModel) await testOne('视觉', (realSettings.visionProvider ?? provider) as ProviderId, s.visionModel || realSettings.visionModel || '');
    else { out.push({ label: '视觉', model: '', text: '未启用' }); setTierResults([...out]); }
    out.push({ label: '听觉', model: s.audioModel, text: s.audioModel ? '要按住话筒说一句才测得了：在助手输入栏试' : '未启用' });
    setTierResults([...out]);
    setTierTesting(false);
  };
  const ModelBtn = ({ mode, value, fallback }: { mode: ModelPickerMode; value: string; fallback: string }) => (
    <button type="button" onClick={() => setPicker(mode)} className="flex w-full min-w-0 items-center gap-2 rounded-none border-2 border-p3r-lilac/50 bg-p3r-panel px-3 py-2 text-left text-p3r-ink">
      <span className="min-w-0 flex-1 truncate font-num text-body font-bold">{value || fallback}</span>
      <span className="shrink-0 font-heavy text-meta font-bold text-p3r-lilac-ink">选择模型 ›</span>
    </button>
  );
  const fastFallback = pv(provider).defaultModel || '未填';

  return (
    <div className="space-y-2">
      {/* ── 连接 ── */}
      <CfgSubhead en="CONNECTION">连接</CfgSubhead>
      <button type="button" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}
        className="group flex w-full min-w-0 items-center gap-3 rounded-none bg-p3r-ink px-3 py-3 text-left text-p3r-on-ink night:border-2">
        <span aria-hidden className={cx('h-3 w-3 shrink-0 rounded-full', configured ? (verifiedOf(realSettings, provider) ? 'bg-p3r-mint' : 'bg-p3r-coral') : 'bg-p3r-coral')} />
        <span className="min-w-0 flex-1">
          {customMissing.length ? <span className="block truncate font-heavy text-body font-bold">{pv(provider).label} · 还差{customMissing.join('和')}——展开填写</span>
            : configured ? <span className="block truncate font-heavy text-body font-bold">{pv(provider).label} · {verifiedOf(realSettings, provider) ? '连接正常' : '待测试'}</span>
              : <span className="block truncate font-heavy text-body font-bold">未配置 —— 展开填写 API Key</span>}
          {configured && <span className="block text-2xs text-p3r-on-ink/70">共 {savedCount} 家</span>}
        </span>
        <span aria-hidden className="text-p3r-rose">{expanded ? '▲' : '▼'}</span>
      </button>
      {configured && provider === 'deepseek' && (
        <div className="flex min-w-0 items-center gap-2 rounded-none border-2 border-p3r-coral bg-[rgb(var(--p3r-magenta-rgb)/0.15)] px-3 py-2 text-meta font-bold">
          <span className="min-w-0 flex-1">当前不读取服务商余额；请到服务商后台确认额度和计费状态。</span>
          <a href="https://platform.deepseek.com/top_up" target="_blank" rel="noopener noreferrer" className="shrink-0 text-p3r-lilac-ink underline">打开后台 ↗</a>
        </div>
      )}
      {expanded && (
        <div className="space-y-2">
          {!configured && (
            <div className="rounded-none border-2 border-p3r-lilac/50 bg-p3r-rose p-3 text-p3r-on-rose">
              <p className="font-heavy text-lead font-bold">还没有 API Key？</p>
              <p className="mt-1 text-meta leading-relaxed">去 DeepSeek 注册一个，复制 Key 回来粘进下面的输入框就能用。国内可直连，按量计费，日常用量一个月通常也就几块钱。</p>
              <a href="https://platform.deepseek.com" target="_blank" rel="noopener noreferrer" className="mt-2 inline-block rounded-none bg-p3r-ink px-3 py-1.5 font-heavy text-meta font-bold text-p3r-rose">打开 platform.deepseek.com</a>
            </div>
          )}
          <CfgList>
            <CfgRow label="提供商" hint="各家 Key 独立保存，点一下即切换">
              <div role="radiogroup" aria-label="提供商" className="grid w-full grid-cols-2 gap-1.5 sm:grid-cols-3">
                {PROVIDERS.map((p) => {
                  const on = provider === p.id;
                  const has = !!keyOf(realSettings, p.id);
                  return (
                    <button key={p.id} type="button" role="radio" aria-checked={on} onClick={() => switchPv(p.id)}
                      className={cx('p6-press relative min-w-0 rounded-none border-2 px-2 py-1.5 text-left', on ? 'border-p3r-lilac/50 bg-p3r-rose text-p3r-on-rose' : 'border-current border-dashed')}>
                      <span className="flex min-w-0 items-center gap-1 font-heavy text-body font-bold">{has && <span aria-hidden className={cx('h-2 w-2 shrink-0 rounded-full', verifiedOf(realSettings, p.id) ? 'bg-p3r-mint' : 'bg-p3r-coral')} />}<span className="truncate">{p.id === 'custom' ? '＋ 自定义' : p.label}</span></span>
                      <span className="block truncate text-2xs opacity-75">{p.id === 'custom' ? '中转站 · 硅基流动 · 智谱 · OpenRouter · Anthropic…' : p.id === 'kimi' ? <><span aria-label="可能已下线">！ </span>kimi-k2</> : p.defaultModel}</span>
                    </button>
                  );
                })}
              </div>
            </CfgRow>
            {isCustom && (
              <>
                <CfgRow label="接哪一家">
                  <CfgSeg wrap size="sm" ariaLabel="接哪一家" value={s.customPreset} onChange={(v) => updateSettings({ customPreset: v, customProtocol: CUSTOM_PRESETS.find((c) => c.id === v)!.protocol })} options={CUSTOM_PRESETS.map((c) => ({ value: c.id, label: c.name, hint: c.hint }))} />
                </CfgRow>
                <CfgRow label="名字" htmlFor="p6-cname"><CfgInput id="p6-cname" aria-label="自定义服务商名字" value={s.customName} onChange={(e) => updateSettings({ customName: e.target.value })} placeholder={s.customPreset !== 'relay' ? CUSTOM_PRESETS.find((c) => c.id === s.customPreset)!.name : '起个名字，如「我的中转站」'} /></CfgRow>
                <CfgRow label="协议" hint={s.customProtocol === 'anthropic' ? 'Anthropic 协议走 /v1/messages（官方 Claude、只给 Anthropic 格式地址的中转站、DeepSeek 等的 /anthropic 口）；听觉档在这个协议上用不了。' : '绝大多数中转站和平台都是 OpenAI 兼容（/chat/completions）。'}>
                  <CfgSeg ariaLabel="请求协议" value={s.customProtocol} onChange={(v) => updateSettings({ customProtocol: v })} options={[{ value: 'openai', label: 'OpenAI 兼容' }, { value: 'anthropic', label: 'Anthropic' }]} />
                </CfgRow>
              </>
            )}
            <CfgRow label={`${pv(provider).label} 的 API 密钥`} hint="Key 保存在这台设备上，也会跟着本地备份走；默认不上云，在「账号与数据」的「云同步 · 数据类目选择」里打开「AI 模型 API」才会随同步上传。测试连接成功后这家会亮绿灯（换 Key 需重新测试）。"
              below={<>
                <div className="flex min-w-0 flex-wrap gap-2">
                  <CfgInput type="password" aria-label="API 密钥" placeholder="sk-…" value={keyDraft} onChange={(e) => { setKeyDraft(e.target.value); setSaved(false); }} className="min-w-[12rem] flex-1" />
                  {pv(provider).keyUrl && <a href={pv(provider).keyUrl} target="_blank" rel="noopener noreferrer" className="self-center font-heavy text-meta font-bold underline">去申请 ↗</a>}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <CfgBtn tone={saved ? 'default' : 'primary'} onClick={save}>{saved ? '✓ 已保存' : '保存'}</CfgBtn>
                  <CfgBtn onClick={() => void runTest()} disabled={test === 'testing'}>{test === 'testing' ? '测试中…' : test === 'ok' ? '✓ 连接正常' : test === 'error' ? '× 连接失败' : '测试连接'}</CfgBtn>
                </div>
                {testMsg && <div className="mt-2"><CfgMsg ok={test === 'ok'}>{testMsg}</CfgMsg></div>}
              </>} />
            <CfgRow label={isCustom ? 'API 地址（必填）' : '自定义 API 地址（可选）'} hint={isCustom && s.customProtocol === 'anthropic' ? '填它给的 Anthropic 地址（如 https://api.anthropic.com、https://api.deepseek.com/anthropic），带不带 /v1 都行。' : '用中转站就填它给的接口地址，一般以 /v1 结尾；多贴的 /chat/completions 会自动去掉，少了 /v1 测试连接时会自动补上。'}
              below={<>
                <CfgInput aria-label="自定义 API 地址" placeholder="https://…/v1" value={s.baseUrl} onChange={(e) => updateSettings({ baseUrl: e.target.value })} />
                {s.baseUrl.includes('relay') && <p className="mt-2 rounded-none bg-[rgb(var(--p3r-cyan-rgb)/0.18)] px-2 py-1.5 text-meta">这个地址不放行跨域，App 里走原生通道：能用，但没有流式，回复会整段出现。对方放行后再点一次「测试连接」即可改回。</p>}
              </>} />
          </CfgList>
        </div>
      )}

      {/* ── 模型分档 ── */}
      <div className="pt-1">
        <button type="button" onClick={() => setTiersOpen((v) => !v)} aria-expanded={tiersOpen} className="flex w-full min-w-0 items-center gap-2 text-left">
          <CfgSubhead en="MODEL TIERS" className="min-w-0 flex-1">模型分档</CfgSubhead>
          <span aria-hidden className="shrink-0 font-heavy text-[color:var(--p3r-coral-ink)]">{tiersOpen ? '▲' : '▼'}</span>
        </button>
        {!tiersOpen && <p className="text-meta font-bold text-[color:var(--p3r-on-stage)]">◢ {s.summaryModel || `默认（${fastFallback}）`} · ☾ {s.navigatorModel || '跟随'} · ◉ {s.visionModel || '未启用'} · ◎ {s.audioModel || '未启用'}</p>}
      </div>
      {tiersOpen && (configured ? (
        <div className="space-y-2">
          <div className="flex min-w-0 flex-wrap gap-2">
            <CfgBtn tone="primary" onClick={() => void tierTest()} disabled={tierTesting}>{tierTesting ? '逐档测试中…' : '逐档测一遍'}</CfgBtn>
            <CfgBtn onClick={() => {
              const key = cleanApiKey(keyDraft).key || keyOf(realSettings, provider);
              if (!key) { setFetchMsg('先保存当前服务商的 API Key'); return; }
              setFetching(true);
              setFetchMsg('');
              void fetchAvailableModels({ provider: provider as ApiProvider, apiKey: key, baseUrl: s.baseUrl, nativeHosts: realSettings.aiNativeHosts, ...(isCustom ? { protocol: s.customProtocol } : {}) }).then((result) => {
                if (!result.ok) { setFetchMsg(result.error); return; }
                setFetchMsg(`已取得 ${result.models.length} 个模型；可在上方各档选择。`);
                void updateRealSettings({ aiProfiles: { ...(realSettings.aiProfiles ?? {}), [provider as ApiProvider]: { ...(realSettings.aiProfiles?.[provider as ApiProvider] ?? {}), models: result.models, modelCaps: result.caps } } });
              }).finally(() => setFetching(false));
            }} disabled={fetching}>{fetching ? '拉取中…' : '刷新全部模型列表'}</CfgBtn>
          </div>
          {fetchMsg && <CfgMsg ok={false}>{fetchMsg}</CfgMsg>}
          {tierResults.length > 0 && (
            <ul className="grid grid-cols-1 gap-1 rounded-none bg-p3r-ink p-2 text-p3r-on-ink night:border-2">
              {tierResults.map((r) => <li key={r.label} className="flex min-w-0 gap-2 text-meta"><b className="w-[4.5em] shrink-0 text-p3r-rose">{r.label}</b><span className="min-w-0 truncate">{r.model && <span className="font-num opacity-75">{r.model} · </span>}{r.text}</span></li>)}
            </ul>
          )}
          <CfgList>
            <CfgRow label="◢ 快速响应" hint={<>记账解析、每日塔罗、活动打分、成长总结等批量任务走这档——要快、便宜够用。跑在当前连接（{pv(provider).label}）上。</>}
              below={<div className="space-y-2">
                <ModelBtn mode="fast" value={s.summaryModel} fallback={isCustom ? '还没选（必填）' : `默认（${fastFallback}）`} />
                <CfgInput aria-label="快速响应模型名（手填）" placeholder={isCustom ? '模型名（必填）：测通后从「选择模型」里挑，或直接手填' : `留空 = 默认（${fastFallback}）`} value={s.summaryModel} onChange={(e) => updateSettings({ summaryModel: e.target.value })} />
                <div className="flex min-w-0 items-center gap-3 rounded-none bg-[rgb(var(--p3r-ink-rgb)/0.06)] px-2 py-1.5"><span className="min-w-0 flex-1"><b className="block text-meta">每日塔罗改走深思熟虑</b><span className="block text-2xs opacity-75">每天一次，多等几秒换更贴的解读；深思熟虑没配时自动退回快速响应。</span></span><CfgToggle ariaLabel="每日塔罗改走深思熟虑" checked={s.tarotDeliberate} onChange={(v) => updateSettings({ tarotDeliberate: v })} /></div>
                <div className="flex min-w-0 items-center gap-3 rounded-none bg-[rgb(var(--p3r-ink-rgb)/0.06)] px-2 py-1.5"><span className="min-w-0 flex-1"><b className="block text-meta">成长总结改走深思熟虑</b><span className="block text-2xs opacity-75">周报月报一期一封，多等一两分钟换更贴的信；它在后台写，关掉页面也不会断。</span></span><CfgToggle ariaLabel="成长总结改走深思熟虑" checked={s.summaryDeliberate} onChange={(v) => updateSettings({ summaryDeliberate: v })} /></div>
              </div>} />
            <CfgRow label="☾ 深思熟虑" hint="助手对话、中长期占卜，以及逆影战场的生成（召唤 Persona、区层 / 伪神 / 满月心魔显形）走这档——值得等的深答案，可跨服务商选更强的模型（用那家已存的 Key 直连）。留空跟随快速响应。"
              below={<div className="space-y-2">
                <ModelBtn mode="deliberate" value={s.navigatorModel} fallback={`跟随快速响应（${s.summaryModel || fastFallback}）`} />
                <CfgInput aria-label="深思熟虑模型名（手填）" placeholder={`留空 = 跟随快速响应（${s.summaryModel || fastFallback}）`} value={s.navigatorModel} onChange={(e) => updateSettings({ navigatorModel: e.target.value })} />
                <p className="text-2xs opacity-75">实际调用：{s.navigatorModel ? `DeepSeek · ${s.navigatorModel}` : `跟随快速响应（${pv(provider).label} · ${s.summaryModel || fastFallback}）`}</p>
              </div>} />
            <CfgRow label="◉ 视觉" hint="拍小票记账等看图任务走这档。没配也能用——记账会退到本机离线识字（需原生 App），再不行就手输。图片只发给你自己配的服务商。"
              below={<div className="space-y-2"><ModelBtn mode="vision" value={s.visionModel} fallback="未启用" />
                <CfgInput aria-label="视觉模型名（手填）" placeholder="留空 = 不启用（如 deepseek-flash / qwen-vl-plus / gpt-6-luna）" value={s.visionModel} onChange={(e) => updateSettings({ visionModel: e.target.value })} /></div>} />
            <CfgRow label="◎ 听觉" hint="配好后助手输入栏出现话筒：按住说话、松手转成文字填进输入框（发不发你决定）。走 /audio/transcriptions 端点，模型名如 whisper-1 / SenseVoiceSmall / qwen3-asr-flash。不配也没关系——输入法自带的语音键一直都能用。"
              below={<div className="space-y-2"><ModelBtn mode="audio" value={s.audioModel} fallback="未启用" />
                <CfgInput aria-label="听觉模型名（手填）" placeholder="留空 = 不启用（如 whisper-1 / qwen3-asr-flash）" value={s.audioModel} onChange={(e) => updateSettings({ audioModel: e.target.value })} /></div>} />
          </CfgList>
        </div>
      ) : <p className="rounded-none bg-p3r-panel px-3 py-2 text-meta font-bold text-p3r-ink">先在上方「连接」卡里配好 API Key，再来选模型。</p>)}

      {/* ── 诊断 ── */}
      <CfgList className="pt-2">
        <CfgRow inline label="复制 AI 诊断信息" hint="最近 20 次请求的成败、耗时和服务商，不含聊天内容和 Key。遇到连不上时复制给我们。">
          <CfgBtn onClick={() => { void navigator.clipboard?.writeText(buildAIDiagnostics(useAppStore.getState().settings)).then(() => setDiag('ok'), () => setDiag('fail')); }}>{diag === 'ok' ? '已复制' : diag === 'fail' ? '复制失败' : '复制'}</CfgBtn>
        </CfgRow>
      </CfgList>
      <ModelPicker mode={pickerMode} open={!!picker} onClose={() => setPicker(null)} />
    </div>
  );
}
