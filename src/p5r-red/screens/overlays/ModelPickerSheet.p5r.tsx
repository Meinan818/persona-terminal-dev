/**
 * ModelPickerSheet 选择模型抽屉（真实 src/components/ai/ModelPickerSheet.tsx；视觉 = v3 b.js openModelPicker）。
 * 入口：AI 服务 → 模型分档 → 任一档「选择模型 ›」；助手设置 → 对话模型。
 * ?variant=fast（默认）| deliberate | assistant | vision | audio；?state=list | empty（搜索无结果）| refresh（刷新结果）
 */
import { useState } from 'react';
import type { OverlayProps } from '@/p5r-red/registry/types';
import { P5Tag } from '@/p5r-red/kit/P5Tag';
import { toast } from '@/p5r-red/kit/P5Toast';
import { sfx } from '@/p5r-red/fx/sfx';
import { ObSheet, ObInp, ObChip, ObMsg, ObNote, ObBtn } from './ObKit';

const MODELS: [string, boolean, boolean, [string, number, string][] | null][] = [['DeepSeek', true, false, [['deepseek-flash', 1, ''], ['deepseek-pro', 0, ''], ['deepseek-reasoner', 0, '']]], ['千问', false, true, [['qwen-plus', 0, ''], ['qwen-max', 0, ''], ['qwen-vl-plus', 1, ''], ['deepseek-v4', 0, 'DeepSeek 系'], ['qwen3-asr-flash', 0, '听写']]], ['OpenAI', false, false, []], ['Kimi', false, false, null]];
const T: Record<string, string> = { fast: '⚡ 快速响应 · 选择模型', assistant: '◈ 助手专属模型', vision: '👁 视觉 · 选择模型', audio: '🎤 听觉 · 选择模型', deliberate: '🌙 深思熟虑 · 选择模型' };
const DEF: Record<string, string> = { fast: '默认（deepseek-flash）', deliberate: '跟随快速响应（deepseek-flash）', assistant: '跟随深思熟虑档（qwen-max）', vision: '不启用（拍照记账退回本地 OCR / 手输）', audio: '不启用（不显示语音话筒）' };
export default function ModelPickerSheet({ open, onClose, params }: OverlayProps) {
  const v = T[params?.get('variant') ?? ''] ? params!.get('variant')! : 'fast';
  const [st, setSt] = useState(params?.get('state') ?? 'list');
  const [pick, setPick] = useState('__def');
  const F = v === 'vision' ? '只看能看图' : v === 'audio' ? '只看能听写' : '只看对话';
  const intro = v === 'assistant' ? <>这里只改<b>助手</b>（对话 / 每日问候 / 人格生成）用的模型，不影响中长期占卜等其它走「深思熟虑」的功能。</>
    : v === 'vision' ? <>拍小票记账等<b>看图</b>任务用这档。服务商在模型列表里标明能看图的（如 DeepSeek）带 👁 徽标、按官方说法筛；没标的按名字猜——猜错了调用会报错，不影响别的功能；关掉筛选可以看全量、也能直接手填。</>
      : v === 'audio' ? <><b>语音转写</b>用这档（走 /audio/transcriptions 端点）。配好后助手输入栏会出现话筒，按住说话、松手转成文字填进输入框——发不发还是你决定。</>
        : <>按<b>平台</b>分区——模型跑在哪家、用哪把 Key 计费；条目右侧的徽标是模型<b>出身</b>：聚合平台（如千问）会托管别家的开源版，带「DeepSeek 系」徽标的是托管版，官方 API 请去 DeepSeek 分区选。</>;
  const choose = (k: string, label: string) => { setPick(k); sfx('nav', 0.3); toast('已选择：' + label); setTimeout(onClose, 220); };
  return (
    <ObSheet open={open} onClose={onClose} title={T[v]} seed={321} wide states={[['list', '列表'], ['empty', '搜索无结果'], ['refresh', '刷新结果']]} state={st} onState={setSt}>
      <p className="ob-p">{intro}</p>
      <div className="ob-tools"><ObInp key={st} ph="搜索模型名…" val={st === 'empty' ? 'gpt-9' : ''} aria="搜索模型" type="search" /><ObChip label={F} on /><ObBtn tone="ink" size="sm" seed={322} onClick={() => setSt('refresh')}>刷新</ObBtn></div>
      {st === 'refresh' && <ObMsg kind="ok">已更新：DeepSeek、千问<br />跳过：Kimi（还没填 Key）</ObMsg>}
      <button type="button" className="ob-mrow def" onClick={() => choose('__def', DEF[v])}><span>{DEF[v]}</span><i className={`ob-radio${pick === '__def' ? ' on' : ''}`} /></button>
      {MODELS.map(([pv, cur, agg, list]) => (
        <div key={pv} className="ob-msec">
          <div className="ob-msec-h"><b>{pv}</b>{cur ? <P5Tag>当前连接</P5Tag> : null}{agg ? <P5Tag tone="ink">聚合平台</P5Tag> : null}<small>{!list || !list.length ? '未拉取' : st === 'empty' ? `0 / ${list.length} 个` : `${list.length} 个`}</small></div>
          {!list || !list.length ? <p className="ob-hint">还没拉过这家的模型列表——点上方「刷新」（不支持 /models 的第三方网关会提示跳过，直接手填即可）。</p>
            : st === 'empty' ? <p className="ob-hint">没有匹配的条目（试试关掉「{F}」或换个关键词）。</p>
              : list.map(([m, vis, origin]) => <button key={m} type="button" className="ob-mrow" onClick={() => choose(pv + m, m)}><span className="ob-mono">{m}</span>{vis ? <P5Tag tone="line">👁 能看图</P5Tag> : null}{origin ? <P5Tag tone="paper">{origin}</P5Tag> : null}<i className={`ob-radio${pick === pv + m ? ' on' : ''}`} /></button>)}
        </div>
      ))}
      <ObNote>提示：「测试连接」成功时会自动拉一次当前家的列表。</ObNote>
    </ObSheet>
  );
}
