/** 设置 · AI 服务（真实 components/settings/AIServiceSettings.tsx）：连接卡 / 提供商 / Key / 地址 / 模型分档 / 诊断 */
import { useState } from 'react';
import { CfgBtn, CfgInput, CfgList, CfgMsg, CfgRow, CfgSeg, CfgSubhead, CfgToggle } from '../cfg';
import { updateSettings, useSettings } from '../settingsStore';
import { CUSTOM_PRESETS, PROVIDERS, type ProviderId } from '@yellow/mock/pkg6';
import { ModelPicker, type ModelPickerMode } from '@yellow/screens/overlays/ModelPickerSheet.p4g';
import { cx } from '@yellow/lib/cx';
import { useAppStore } from '@/store';
import { buildAIDiagnostics } from '@/utils/aiDiagnostics';

type TestStatus = 'idle' | 'testing' | 'ok' | 'error';
const pv = (id: ProviderId) => PROVIDERS.find((p) => p.id === id)!;

export function AISection() {
  const s = useSettings();
  const [expanded, setExpanded] = useState(!s.keys[s.provider]);
  const [keyDraft, setKeyDraft] = useState(s.keys[s.provider] ?? '');
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
  const configured = !!s.keys[provider];
  const savedCount = Object.values(s.keys).filter(Boolean).length;
  const customMissing = isCustom ? [!s.baseUrl.trim() && '地址', !s.summaryModel.trim() && '模型'].filter(Boolean) as string[] : [];

  const switchPv = (id: ProviderId) => { updateSettings({ provider: id }); setKeyDraft(s.keys[id] ?? ''); setTest('idle'); setTestMsg(''); setSaved(false); };
  const save = () => {
    updateSettings({ keys: { ...s.keys, [provider]: keyDraft }, verified: { ...s.verified, [provider]: false } });
    setTest('idle');
    setTestMsg('');
    setSaved(true);
  };
  const runTest = () => {
    if (!keyDraft.trim()) { setTest('error'); setTestMsg('请先填写 API 密钥'); return; }
    if (isCustom && !s.baseUrl.trim()) { setTest('error'); setTestMsg('先填 API 地址（或点上面的预设）'); return; }
    setTest('error');
    setTestMsg('真实连接测试尚未启用。当前不会把未验证的 Key 标记为“连接正常”。');
  };
  const tierTest = () => {
    setTierTesting(false);
    setTierResults([
      { label: '快速响应', model: s.summaryModel || pv(provider).defaultModel, text: '未执行 · 真实连接测试待启用' },
      { label: '深思熟虑', model: s.navigatorModel || '', text: s.navigatorModel ? '未执行 · 真实连接测试待启用' : '跟随快速响应' },
      { label: '助手', model: s.assistantModel, text: s.assistantModel ? '未执行 · 真实连接测试待启用' : '跟随深思熟虑' },
      { label: '视觉', model: s.visionModel, text: s.visionModel ? '未执行 · 真实连接测试待启用' : '未启用' },
      { label: '听觉', model: s.audioModel, text: s.audioModel ? '要按住话筒说一句才测得了：在助手输入栏试' : '未启用' },
    ]);
  };
  const ModelBtn = ({ mode, value, fallback }: { mode: ModelPickerMode; value: string; fallback: string }) => (
    <button type="button" onClick={() => setPicker(mode)} className="flex w-full min-w-0 items-center gap-2 rounded-[3px] border-2 border-p4g-black bg-p4g-white px-3 py-2 text-left text-p4g-black night:border-p4g-yellow night:bg-p4g-black night:text-p4g-ink">
      <span className="min-w-0 flex-1 truncate font-num text-body font-bold">{value || fallback}</span>
      <span className="shrink-0 font-display text-meta font-bold text-p4g-tag">选择模型 ›</span>
    </button>
  );
  const fastFallback = pv(provider).defaultModel || '未填';

  return (
    <div className="space-y-2">
      {/* ── 连接 ── */}
      <CfgSubhead en="CONNECTION">连接</CfgSubhead>
      <button type="button" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}
        className="group flex w-full min-w-0 items-center gap-3 rounded-[4px] bg-p4g-black px-3 py-3 text-left text-p4g-white shadow-hard night:border-2 night:border-p4g-yellow">
        <span aria-hidden className={cx('h-3 w-3 shrink-0 rounded-pill', configured ? (s.verified[provider] ? 'bg-p4g-green' : 'bg-p4g-orange') : 'bg-p4g-red')} />
        <span className="min-w-0 flex-1">
          {customMissing.length ? <span className="block truncate font-display text-body font-bold">{pv(provider).label} · 还差{customMissing.join('和')}——展开填写</span>
            : configured ? <span className="block truncate font-display text-body font-bold">{pv(provider).label} · {s.verified[provider] ? '连接正常' : '待测试'}</span>
              : <span className="block truncate font-display text-body font-bold">未配置 —— 展开填写 API Key</span>}
          {configured && <span className="block text-2xs text-p4g-white/70">共 {savedCount} 家</span>}
        </span>
        <span aria-hidden className="text-p4g-yellow">{expanded ? '▲' : '▼'}</span>
      </button>
      {configured && provider === 'deepseek' && (
        <div className="flex min-w-0 items-center gap-2 rounded-[4px] border-2 border-p4g-orange bg-[rgb(var(--p4g-orange-rgb)/0.15)] px-3 py-2 text-meta font-bold">
          <span className="min-w-0 flex-1">当前不读取服务商余额；请到服务商后台确认额度和计费状态。</span>
          <a href="https://platform.deepseek.com/top_up" target="_blank" rel="noopener noreferrer" className="shrink-0 text-p4g-tag underline">打开后台 ↗</a>
        </div>
      )}
      {expanded && (
        <div className="space-y-2">
          {!configured && (
            <div className="rounded-[4px] border-3 border-p4g-black bg-p4g-yellow p-3 text-p4g-black shadow-hard-sm night:border-p4g-yellow">
              <p className="font-display text-lead font-bold">还没有 API Key？</p>
              <p className="mt-1 text-meta leading-relaxed">去 DeepSeek 注册一个，复制 Key 回来粘进下面的输入框就能用。国内可直连，按量计费，日常用量一个月通常也就几块钱。</p>
              <a href="https://platform.deepseek.com" target="_blank" rel="noopener noreferrer" className="mt-2 inline-block rounded-[3px] bg-p4g-black px-3 py-1.5 font-display text-meta font-bold text-p4g-yellow">打开 platform.deepseek.com</a>
            </div>
          )}
          <CfgList>
            <CfgRow label="提供商" hint="各家 Key 独立保存，点一下即切换">
              <div role="radiogroup" aria-label="提供商" className="grid w-full grid-cols-2 gap-1.5 sm:grid-cols-3">
                {PROVIDERS.map((p) => {
                  const on = provider === p.id;
                  const has = !!s.keys[p.id];
                  return (
                    <button key={p.id} type="button" role="radio" aria-checked={on} onClick={() => switchPv(p.id)}
                      className={cx('p4g-press relative min-w-0 rounded-[3px] border-2 px-2 py-1.5 text-left', on ? 'border-p4g-black bg-p4g-yellow text-p4g-black shadow-hard-sm night:border-p4g-yellow' : 'border-current border-dashed')}>
                      <span className="flex min-w-0 items-center gap-1 font-display text-body font-bold">{has && <span aria-hidden className={cx('h-2 w-2 shrink-0 rounded-pill', s.verified[p.id] ? 'bg-p4g-green' : 'bg-p4g-orange')} />}<span className="truncate">{p.id === 'custom' ? '＋ 自定义' : p.label}</span></span>
                      <span className="block truncate text-2xs opacity-75">{p.id === 'custom' ? '中转站 · 硅基流动 · 智谱 · OpenRouter · Anthropic…' : p.id === 'kimi' ? <><span aria-label="可能已下线">⚠ </span>kimi-k2</> : p.defaultModel}</span>
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
                  {pv(provider).keyUrl && <a href={pv(provider).keyUrl} target="_blank" rel="noopener noreferrer" className="self-center font-display text-meta font-bold underline">去申请 ↗</a>}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <CfgBtn tone={saved ? 'default' : 'primary'} onClick={save}>{saved ? '✓ 已保存' : '保存'}</CfgBtn>
                  <CfgBtn onClick={runTest} disabled={test === 'testing'}>{test === 'testing' ? '测试中…' : test === 'ok' ? '✓ 连接正常' : test === 'error' ? '× 连接失败' : '测试连接'}</CfgBtn>
                </div>
                {testMsg && <div className="mt-2"><CfgMsg ok={test === 'ok'}>{testMsg}</CfgMsg></div>}
              </>} />
            <CfgRow label={isCustom ? 'API 地址（必填）' : '自定义 API 地址（可选）'} hint={isCustom && s.customProtocol === 'anthropic' ? '填它给的 Anthropic 地址（如 https://api.anthropic.com、https://api.deepseek.com/anthropic），带不带 /v1 都行。' : '用中转站就填它给的接口地址，一般以 /v1 结尾；多贴的 /chat/completions 会自动去掉，少了 /v1 测试连接时会自动补上。'}
              below={<>
                <CfgInput aria-label="自定义 API 地址" placeholder="https://…/v1" value={s.baseUrl} onChange={(e) => updateSettings({ baseUrl: e.target.value })} />
                {s.baseUrl.includes('relay') && <p className="mt-2 rounded-[3px] bg-[rgb(var(--p4g-cyan-rgb)/0.18)] px-2 py-1.5 text-meta">这个地址不放行跨域，App 里走原生通道：能用，但没有流式，回复会整段出现。对方放行后再点一次「测试连接」即可改回。</p>}
              </>} />
          </CfgList>
        </div>
      )}

      {/* ── 模型分档 ── */}
      <div className="pt-1">
        <button type="button" onClick={() => setTiersOpen((v) => !v)} aria-expanded={tiersOpen} className="flex w-full min-w-0 items-center gap-2 text-left">
          <CfgSubhead en="MODEL TIERS" className="min-w-0 flex-1">模型分档</CfgSubhead>
          <span aria-hidden className="shrink-0 font-display text-[color:var(--p4g-orange-deep)] night:text-p4g-orange">{tiersOpen ? '▲' : '▼'}</span>
        </button>
        {!tiersOpen && <p className="text-meta font-bold text-[color:var(--p4g-on-stage)]">⚡ {s.summaryModel || `默认（${fastFallback}）`} · 🌙 {s.navigatorModel || '跟随'} · 👁 {s.visionModel || '未启用'} · 🎤 {s.audioModel || '未启用'}</p>}
      </div>
      {tiersOpen && (configured ? (
        <div className="space-y-2">
          <div className="flex min-w-0 flex-wrap gap-2">
            <CfgBtn tone="primary" onClick={tierTest} disabled={tierTesting}>{tierTesting ? '逐档测试中…' : '逐档测一遍'}</CfgBtn>
            <CfgBtn onClick={() => { setFetching(false); setFetchMsg('模型列表刷新尚未启用；当前不会伪造模型数量。'); }} disabled={fetching}>{fetching ? '拉取中…' : '刷新全部模型列表'}</CfgBtn>
          </div>
          {fetchMsg && <CfgMsg ok={false}>{fetchMsg}</CfgMsg>}
          {tierResults.length > 0 && (
            <ul className="grid grid-cols-1 gap-1 rounded-[4px] bg-p4g-black p-2 text-p4g-white night:border-2 night:border-p4g-yellow">
              {tierResults.map((r) => <li key={r.label} className="flex min-w-0 gap-2 text-meta"><b className="w-[4.5em] shrink-0 text-p4g-yellow">{r.label}</b><span className="min-w-0 truncate">{r.model && <span className="font-num opacity-75">{r.model} · </span>}{r.text}</span></li>)}
            </ul>
          )}
          <CfgList>
            <CfgRow label="⚡ 快速响应" hint={<>记账解析、每日塔罗、活动打分、成长总结等批量任务走这档——要快、便宜够用。跑在当前连接（{pv(provider).label}）上。</>}
              below={<div className="space-y-2">
                <ModelBtn mode="fast" value={s.summaryModel} fallback={isCustom ? '还没选（必填）' : `默认（${fastFallback}）`} />
                <CfgInput aria-label="快速响应模型名（手填）" placeholder={isCustom ? '模型名（必填）：测通后从「选择模型」里挑，或直接手填' : `留空 = 默认（${fastFallback}）`} value={s.summaryModel} onChange={(e) => updateSettings({ summaryModel: e.target.value })} />
                <div className="flex min-w-0 items-center gap-3 rounded-[3px] bg-[rgb(var(--p4g-black-rgb)/0.06)] px-2 py-1.5 night:bg-[rgb(var(--p4g-yellow-rgb)/0.08)]"><span className="min-w-0 flex-1"><b className="block text-meta">每日塔罗改走深思熟虑</b><span className="block text-2xs opacity-75">每天一次，多等几秒换更贴的解读；深思熟虑没配时自动退回快速响应。</span></span><CfgToggle ariaLabel="每日塔罗改走深思熟虑" checked={s.tarotDeliberate} onChange={(v) => updateSettings({ tarotDeliberate: v })} /></div>
                <div className="flex min-w-0 items-center gap-3 rounded-[3px] bg-[rgb(var(--p4g-black-rgb)/0.06)] px-2 py-1.5 night:bg-[rgb(var(--p4g-yellow-rgb)/0.08)]"><span className="min-w-0 flex-1"><b className="block text-meta">成长总结改走深思熟虑</b><span className="block text-2xs opacity-75">周报月报一期一封，多等一两分钟换更贴的信；它在后台写，关掉页面也不会断。</span></span><CfgToggle ariaLabel="成长总结改走深思熟虑" checked={s.summaryDeliberate} onChange={(v) => updateSettings({ summaryDeliberate: v })} /></div>
              </div>} />
            <CfgRow label="🌙 深思熟虑" hint="助手对话、中长期占卜，以及逆影战场的生成（召唤 Persona、区层 / 伪神 / 满月心魔显形）走这档——值得等的深答案，可跨服务商选更强的模型（用那家已存的 Key 直连）。留空跟随快速响应。"
              below={<div className="space-y-2">
                <ModelBtn mode="deliberate" value={s.navigatorModel} fallback={`跟随快速响应（${s.summaryModel || fastFallback}）`} />
                <CfgInput aria-label="深思熟虑模型名（手填）" placeholder={`留空 = 跟随快速响应（${s.summaryModel || fastFallback}）`} value={s.navigatorModel} onChange={(e) => updateSettings({ navigatorModel: e.target.value })} />
                <p className="text-2xs opacity-75">实际调用：{s.navigatorModel ? `DeepSeek · ${s.navigatorModel}` : `跟随快速响应（${pv(provider).label} · ${s.summaryModel || fastFallback}）`}</p>
              </div>} />
            <CfgRow label="👁 视觉" hint="拍小票记账等看图任务走这档。没配也能用——记账会退到本机离线识字（需原生 App），再不行就手输。图片只发给你自己配的服务商。"
              below={<div className="space-y-2"><ModelBtn mode="vision" value={s.visionModel} fallback="未启用" />
                <CfgInput aria-label="视觉模型名（手填）" placeholder="留空 = 不启用（如 deepseek-flash / qwen-vl-plus / gpt-6-luna）" value={s.visionModel} onChange={(e) => updateSettings({ visionModel: e.target.value })} /></div>} />
            <CfgRow label="🎤 听觉" hint="配好后助手输入栏出现话筒：按住说话、松手转成文字填进输入框（发不发你决定）。走 /audio/transcriptions 端点，模型名如 whisper-1 / SenseVoiceSmall / qwen3-asr-flash。不配也没关系——输入法自带的语音键一直都能用。"
              below={<div className="space-y-2"><ModelBtn mode="audio" value={s.audioModel} fallback="未启用" />
                <CfgInput aria-label="听觉模型名（手填）" placeholder="留空 = 不启用（如 whisper-1 / qwen3-asr-flash）" value={s.audioModel} onChange={(e) => updateSettings({ audioModel: e.target.value })} /></div>} />
          </CfgList>
        </div>
      ) : <p className="rounded-[4px] bg-p4g-surface px-3 py-2 text-meta font-bold text-p4g-ink">先在上方「连接」卡里配好 API Key，再来选模型。</p>)}

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
