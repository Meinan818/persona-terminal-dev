/**
 * 设置页各分区 / 区块（迁移自 v3 overlays/b.js：themeSec / aiHTML / weatherHTML / bgmHTML / notifHTML / volHTML / summarySec / personalizeSec / navHTML）。
 * 结构 = 真实 src/pages/Settings.tsx 六分区（WeatherSettings 内嵌在主题 · 显示里、BgmSettings 在主题最下方折叠、
 * SoundVolumeRow 在静音关时出现），长相 = v3 .ob-*。Settings.p5r.tsx 组装；各弹层（模型抽屉 / 称号确认 / 阈值确认 / 人格编辑…）从这里 openOverlay。
 * 每个区块收 state（演示状态，路由 ?state= / ?wx= / ?bgm= / ?vol= 切换）。
 */
import { useState, type ReactNode } from 'react';
import { selectAppTheme, useSelectedTheme } from '@/themes/themeSelection';
import { P5Tag } from '@/p5r-red/kit/P5Tag';
import { toast } from '@/p5r-red/kit/P5Toast';
import { P5Sil } from '@/p5r-red/fx/sil';
import { sfx } from '@/p5r-red/fx/sfx';
import { openOverlay } from '@/p5r-red/shell/shellBus';
import { setPrefs, usePrefs } from '@/p5r-red/lib/prefs';
import { RANKS, ATTR_ORDER, ATTR } from '@/p5r-red/mock/data';
import { ObCard, ObRow, ObSw, ObSeg, ObInp, ObTa, ObSel, ObRange, ObMsg, ObChip, ObSub, ObNote, ObHint, ObLink, ObBtn, ObFold, ObLi, BusyBtn, useMsgBox, ObConfirm, ObCrop } from './ObKit';

export const THEMES: [string, string, string][] = [['blue', '蓝', '#3B82F6'], ['yellow', '黄', '#F59E0B'], ['red', '红', '#D7000F'], ['pink', '粉', '#EC4899'], ['custom', '自定义', 'conic-gradient(#3B82F6,#F59E0B,#EF4444,#EC4899,#3B82F6)']];
export const ATTR_META: [string, string, string][] = [['knowledge', '📘', '知识'], ['guts', '🔥', '胆量'], ['dexterity', '🎯', '灵巧'], ['kindness', '🌿', '温柔'], ['charm', '✨', '魅力']];
export const THR = [0, 10, 25, 45, 70, 100, 140];

export function Swatches({ sel = 'red', sm }: { sel?: string; sm?: boolean }) {
  const [cur, setCur] = useState<string>(useSelectedTheme() ?? sel);
  const pick = async (v: string) => {
    setCur(v);
    try { await selectAppTheme(v); } catch { toast('主题切换失败，请重试'); return; }
    sfx('switch', 0.5);
  };
  return (
    <div className={`ob-swatches${sm ? ' sm' : ''}`}>
      {THEMES.map(([v, l, c], i) => (
        <button key={v} type="button" className="ob-swatch" aria-label={`切换主题：${l}`} aria-pressed={v === cur} style={{ ['--sw' as string]: c, ['--i' as string]: i }}
          onClick={() => void pick(v)}><span className="ob-swatch-c"><i>✓</i></span><b>{l}</b></button>
      ))}
    </div>
  );
}

/* ═════ 音量大小 SoundVolumeRow ═════ */
export function VolumeRow({ state = 'ok' }: { state?: string }) {
  const ch = state === 'none' ? '音效通道：还没播过音效' : state === 'fb' ? '音效通道：原生播放（本机音量不可调） · 降级 2 次（最近：AudioContext suspended）' : '音效通道：Web Audio 缓冲（音量可调）';
  return <ObRow label="音量大小" hint={`松手会响一声试听 · ${ch}`} cls="ob-vol"><ObRange v={70} aria="音量大小" preview="♪ 试听" /></ObRow>;
}

/* ═════ 天气 WeatherSettings ═════ */
export const WX_STATES: [string, string][] = [['ok', '已配好'], ['missing', '未填·还差'], ['search', '搜索结果'], ['notfound', '没找到'], ['blocked', '上次取数失败'], ['openmeteo', 'Open-Meteo']];
export function WeatherBlock({ state: init = 'ok' }: { state?: string }) {
  const [st, setSt] = useState(init);
  const [msg, setMsg] = useMsgBox(st === 'blocked' ? <ObMsg kind="err">上次取数没成功：401 Unauthorized<br />改好后点一次「测试取数」，首页才会重新取。</ObMsg> : null);
  const q = st !== 'openmeteo', missing = st === 'missing';
  return (
    <ObCard title="天气" en="WEATHER" seed={341} id="blk-weather">
      <p className="ob-p">配好之后，首页的<b>月相</b>点一下就能切成天气，切换会被记住。<b>Key 与城市只存本机</b>——不随云同步上传，但会进本地备份文件。</p>
      <ObSeg opts={[['qweather', '和风天气', '需 KEY · 国内节点 · 区县级'], ['openmeteo', 'Open-Meteo', '免 Key · 服务器在欧美']]} sel={q ? 'qweather' : 'openmeteo'} aria="天气服务商" cls="ob-seg-big" onChange={(v) => setSt(v === 'openmeteo' ? 'openmeteo' : 'ok')} />
      {q && (
        <>
          <ObFold title="三步拿到 API KEY 和 API Host" open={missing}>
            <ol className="ob-steps"><li>打开 <ObLink toastMsg="外链：console.qweather.com">和风天气控制台 ↗</ObLink>，注册登录后进「项目管理」→「创建项目」，名字随便填。</li><li>进入这个项目，点「添加凭据」，身份认证方式选 <b>API KEY</b>（不要选 JSON Web Token），保存后复制那一长串 KEY。</li><li>回到控制台左侧「设置」，复制 <b>API Host</b>（形如 abc123xyz.re.qweatherapi.com），填到下面。</li></ol>
            <ObNote>每月 5 万次以内免费，超出部分按量计费；本 App 每 10 分钟最多取一次，一般用不完。不要给这条凭据设「应用限制」，否则 App 的请求会被拒。</ObNote>
          </ObFold>
          <label className="ob-fld"><span>API KEY</span><ObInp ph="控制台 → 项目管理 → 凭据里的 API KEY" val={missing ? '' : '7c1e••••••••••a90'} aria="和风天气 API KEY" cls="ob-mono" /></label>
          <label className="ob-fld"><span>API Host <i className="ob-dim">必填</i></span><ObInp ph="如 abc123xyz.re.qweatherapi.com" val={missing ? '' : 'k3x9q2.re.qweatherapi.com'} aria="和风天气 API Host" cls="ob-mono" /></label>
          <p className="ob-hint">不想注册？<ObLink onClick={() => setSt('openmeteo')}>先用 Open-Meteo</ObLink>，免 Key，但服务器在欧美，国内偶尔连不上。</p>
        </>
      )}
      <ObSub>城市</ObSub>
      {!missing && <div className="ob-city"><b>杭州 · 西湖区</b><ObLink toastMsg="已清除城市">清除</ObLink></div>}
      <div className="ob-keyrow"><ObInp ph="搜城市 / 区县，如「杭州」「朝阳」" val={st === 'search' ? '朝阳' : ''} aria="搜索城市" type="search" /><ObBtn tone="ink" seed={331} disabled={missing && q} onClick={() => setSt('search')}>搜索</ObBtn></div>
      {missing && q && <ObNote>先填好 API KEY 和 API Host，才能用和风搜城市。</ObNote>}
      {st === 'search' && <div className="ob-results">{['朝阳区 · 北京', '朝阳市 · 辽宁', '朝阳区 · 长春'].map((c) => <ObLi key={c} onClick={() => toast(`已选择 ${c}`)}><b>{c}</b><em>›</em></ObLi>)}</div>}
      {st === 'notfound' && <ObMsg kind="err">没找到这个地名，换个写法试试（区县名通常比街道名好用）</ObMsg>}
      {missing && <p className="ob-warnc">还差：API KEY、API Host、城市</p>}
      <BusyBtn label={missing ? '填齐上面几项再测试' : '测试取数'} busy="…" seed={332} className="ob-wide" disabled={missing} msg="✓ 杭州 · 西湖区　多云 18°C　体感 17°C" fail="403：Invalid Host（检查 API Host 是否抄对）" to={setMsg} />
      <div className="ob-wmsg">{msg}</div>
      <p className="ob-attr">{q ? <>天气服务由 <ObLink toastMsg="外链：qweather.com">和风天气</ObLink> 驱动</> : <>天气数据来自 <ObLink toastMsg="外链：open-meteo.com">Open-Meteo</ObLink>（CC BY 4.0）</>}</p>
    </ObCard>
  );
}

/* ═════ 导入音乐 BgmSettings ═════ */
export const BGM_STATES: [string, string][] = [['list', '有曲目'], ['empty', '空'], ['busy', '导入中'], ['full', '已满'], ['error', '导入失败']];
const TRACKS: [string, string, number][] = [['Wake Up, Get Up.mp3', '8.2 MB', 1], ['Rainy Library.m4a', '5.6 MB', 0], ['Battle Rag.mp3', '11.4 MB', 0]];
export function BgmBlock({ state = 'list', open = false }: { state?: string; open?: boolean }) {
  const [tracks, setTracks] = useState(state === 'empty' ? [] : TRACKS);
  const [del, setDel] = useState<string | null>(null);
  const tsel = (v: string, follow?: string) => <ObSel opts={[['', follow || '不放'], ...TRACKS.map((t) => [t[0], t[0]] as [string, string])]} val={v} aria="曲目" />;
  return (
    <ObCard seed={362} id="blk-bgm">
      <ObFold title="导入音乐" meta={tracks.length ? `${tracks.length} 首 · 播放中` : '本机 BGM'} open={open}>
        <p className="ob-hint">把自己的音乐导进来当背景音：只在本机播放，不上云、不进备份，最多 8 首、单首 20 MB。请只导入你有权使用的音频；录屏或分享时注意版权。</p>
        <BusyBtn label={state === 'busy' ? '导入中…' : state === 'full' ? '已满 8 首' : '导入音乐'} busy="导入中…" tone="ink" seed={361} disabled={state === 'full' || state === 'busy'} msg="已导入 1 首" revert={1200} />
        {state === 'error' && <ObMsg kind="err">导入失败：文件超过 20 MB</ObMsg>}
        <ObRow label="播放"><ObSw on label="播放背景音乐" /></ObRow>
        {tracks.length > 0 && <ul className="ob-tracks">{tracks.map(([n, s, p]) => <li key={n}><b>{p ? '♪ ' : ''}{n}</b><small>{s}{p ? ' · 播放中' : ''}</small><ObLink onClick={() => setDel(n)}>删除</ObLink></li>)}</ul>}
        <ObRow label="音乐音量" hint="与音效音量各自独立；「静音模式」开着时音乐也静音。"><ObRange v={60} aria="音乐音量" /></ObRow>
        <ObSub>在哪里放哪首</ObSub>
        <div className="ob-assign"><span>战斗</span>{tsel('Battle Rag.mp3', '跟随主页曲目')}<span>Boss 战</span>{tsel('', '跟随战斗曲目')}<span>爬塔</span>{tsel('', '跟随主页曲目')}</div>
        <p className="ob-hint">各主题的主页默认曲目</p>
        <div className="ob-assign">{['蓝', '黄', '红', '粉', '自定义'].map((t) => <FragSel key={t} label={`${t}主题`}>{tsel(t === '红' ? 'Wake Up, Get Up.mp3' : '')}</FragSel>)}</div>
        <p className="ob-now">{tracks.length ? '正在播放：Wake Up, Get Up.mp3' : '现在没有在放（当前场景没选曲，或 App 在后台）'} <ObLink toastMsg="重新播放">没响？点一下重放</ObLink></p>
      </ObFold>
      <BgmDeleteConfirm name={del} onClose={() => setDel(null)} onConfirm={() => { setTracks((t) => t.filter((x) => x[0] !== del)); toast('已删除'); }} />
    </ObCard>
  );
}
const FragSel = ({ label, children }: { label: string; children: ReactNode }) => <><span>{label}</span>{children}</>;
/** 删除曲目确认（真实 BgmSettings 用 window.confirm；红频道统一走二段确认） */
export function BgmDeleteConfirm({ name, onClose, onConfirm }: { name: string | null; onClose: () => void; onConfirm: () => void }) {
  return <ObConfirm open={!!name} onClose={onClose} title={`删除「${name ?? ''}」？`} danger confirm="删除" onConfirm={onConfirm} />;
}

/* ═════ 主题分区 ═════ */
export const THEME_STATES: [string, string][] = [['normal', '红主题'], ['custom', '自定义主题'], ['muted', '静音'], ['bg', '已设背景图']];
export function ThemeSection({ state = 'normal', wx = 'ok', bgm = 'list', vol = 'ok', bgmOpen }: { state?: string; wx?: string; bgm?: string; vol?: string; bgmOpen?: boolean }) {
  const prefs = usePrefs();
  const custom = state === 'custom';
  const [muted, setMuted] = useState(state === 'muted');
  return (
    <>
      <ObCard title="颜色与声音" en="COLOR · SOUND" seed={501}>
        <p className="ob-p">选择你喜欢的主题颜色</p>
        <Swatches sm sel={custom ? 'custom' : 'red'} />
        {custom && (
          <>
            <ObSub>自定义颜色</ObSub><div className="ob-keyrow"><input type="color" className="ob-color" defaultValue="#1c1c1c" aria-label="色盘" /><ObInp ph="#1c1c1c" val="#1c1c1c" aria="HEX 色值" cls="ob-mono" /></div><p className="ob-hint">输入 HEX 色值或使用色盘选取</p>
            <ObSub>音效方案</ObSub><ObSeg opts={[['blue', '清亮', 'P3 风格'], ['yellow', '复古', 'P4 风格'], ['red', '霓虹', 'P5 风格']]} sel="red" aria="音效方案" />
            <ObSub>塔罗卡面</ObSub><ObSeg opts={[['p3', '蓝'], ['p4', '黄'], ['p5', '红']]} sel="p5" aria="塔罗卡面" /><p className="ob-hint">换的是星象页抽到的牌长什么样。小组件上的牌面不跟随，始终是蓝那套。</p>
          </>
        )}
        <ObRow label="静音模式" hint="开启后所有音效静音"><ObSw on={muted} label="静音模式" onToggle={setMuted} /></ObRow>
        {!muted && <VolumeRow state={vol} />}
        <ObRow label="夜间模式" hint="降低屏幕亮度，保护眼睛"><ObSw on={prefs.mode === 'night'} on2={prefs.mode === 'night'} label="夜间模式" onToggle={(v) => setPrefs({ mode: v ? 'night' : 'day' })} /></ObRow>
      </ObCard>
      <ObCard title="显示" en="DISPLAY" seed={502}>
        <ObRow label="左侧栏布局" hint="宽屏时导航在左边一列；只影响这台设备"><ObSw on={prefs.sidebar} on2={prefs.sidebar} label="左侧栏布局" onToggle={(v) => setPrefs({ sidebar: v })} /></ObRow>
        <ObSub>背景动画</ObSub><p className="ob-hint">最多同时开启两个，跟随主题色</p>
        <ObSeg opts={[['aurora', '极光', '柔和色块漂移'], ['particles', '粒子', '浮尘缓慢上升'], ['wave', '渐变波', '流动色彩背景'], ['pulse', '脉冲', '网格线呼吸']]} sel={['particles']} multi max={2} aria="背景动画" cls="ob-seg-big" />
        <ObSub>开屏动画</ObSub><p className="ob-hint">启动时的过场风格与速率</p>
        <ObSeg opts={[['velvet', 'MASKARIA', 'MASKARIA'], ['p5', '红黑剪报风', 'Phantom Thief'], ['p3', '深夜月光录', 'Memento Mori'], ['p4', '黄色警戒线', 'Midnight Channel']]} sel="p5" aria="开屏动画" cls="ob-seg-big" />
        <label className="ob-inl"><span>速率</span><ObSeg opts={[['fast', '快'], ['normal', '正常'], ['slow', '慢']]} sel="normal" aria="开屏速率" /></label>
      </ObCard>
      <WeatherBlock key={wx} state={wx} />
      <ObCard title="背景图片" en="WALLPAPER" seed={504}>
        {state === 'bg' ? (
          <>
            <div className="ob-bgprev" aria-label="背景预览"><P5Sil name="leap" style={{ height: '100%', width: 'auto' }} /></div>
            <ObRow label="透明度"><ObRange v={40} aria="背景透明度" /></ObRow>
            <div className="ob-acts left"><ObSel opts={[['landscape', '横屏模式'], ['portrait', '竖屏模式']]} val="portrait" aria="背景图方向" /><ObBtn size="sm" seed={503} toastMsg="背景图已移除">移除</ObBtn></div>
          </>
        ) : <button type="button" className="ob-drop" onClick={() => toast('选择图片（demo）')}><b>＋ 上传背景图片</b><small>只存本机，不进备份</small></button>}
      </ObCard>
      <BgmBlock key={bgm} state={bgm} open={bgmOpen} />
    </>
  );
}

/* ═════ AI 服务 AIServiceSettings ═════ */
export const AI_STATES: [string, string][] = [['ok', '已配好（收起）'], ['none', '未配置·首次引导'], ['tested', '测试成功'], ['testerr', '测试失败'], ['native', '原生通道'], ['lowbal', '余额不足'], ['tiers', '模型分档展开']];
const PROV: [string, string, string, number][] = [['openai', 'OpenAI', 'gpt-6-luna', 0], ['deepseek', 'DeepSeek', 'deepseek-flash', 2], ['kimi', 'Kimi', 'kimi-k3', 0], ['qwen', '千问', 'qwen-plus', 1], ['gemini', 'Gemini', 'gemini-3.5-flash-lite', 0], ['minimax', 'MiniMax', 'MiniMax-M3', 0], ['custom', '＋ 自定义', '', 0]];
const CUSTOM_PRESETS: [string, string, string][] = [['siliconflow', '硅基流动', '国内可直连，开源模型多（DeepSeek / Qwen / GLM…）'], ['ark', '火山方舟', '豆包等；模型名填方舟里的模型 ID 或接入点 ID'], ['zhipu', '智谱', 'GLM 系列'], ['openrouter', 'OpenRouter', '一个 Key 用各家模型（国内网络可能不稳）'], ['anthropic', 'Anthropic', '官方 Claude（Anthropic 协议）'], ['relay', '中转站', '填中转站给的地址（一般以 /v1 结尾）；它若只给 Anthropic 格式的地址，协议选 Anthropic']];
export function AISection({ state = 'ok' }: { state?: string }) {
  const [prov, setProv] = useState('deepseek');
  const [preset, setPreset] = useState('relay');
  const [testMsg, setTestMsg] = useMsgBox(state === 'tested' ? <ObMsg kind="ok">连接成功 · deepseek-flash · 412 ms · 模型列表已更新（9 个）</ObMsg> : state === 'testerr' ? <ObMsg kind="err">密钥里混进了 2 个看不见的空格 / 全角字符，已自动清理——测完记得点保存。{'\n'}401 Unauthorized</ObMsg> : null);
  const [tierRes, setTierRes] = useMsgBox();
  const P = PROV.find((p) => p[0] === prov)!, custom = prov === 'custom', none = state === 'none';
  const statusLine = none ? <span className="ob-warnc">未配置 —— 展开填写 API Key</span> : custom ? <span className="ob-warnc">自定义 · 还差地址和模型——展开填写</span> : <><span className={`ob-dot${P[3] === 2 ? ' on' : ''}`} /><b>{P[1]} · {P[3] === 2 ? '连接正常' : '待测试'}</b><small>共 2 家</small></>;
  const tier = (icon: string, name: string, desc: string, val: string, ph: string, variant: string, extra?: ReactNode) => (
    <div className="ob-tier"><p className="ob-tier-h"><i>{icon}</i>{name}</p><p className="ob-hint">{desc}</p>
      <button type="button" className="ob-pick" onClick={() => openOverlay('settings-model-picker', { variant })}><span>{val}</span><b>选择模型 ›</b></button><ObInp ph={ph} aria={`${name} 模型名`} cls="ob-mono" />{extra}</div>
  );
  return (
    <>
      {state === 'lowbal' && <div className="ob-msg warn">DeepSeek 账户余额只剩 ¥1.32，用完后 AI 功能会停下 <ObLink toastMsg="外链：充值页">去充值 ↗</ObLink></div>}
      <ObCard seed={311} cls="ob-conn">
        <ObFold title="连接" meta={statusLine} open={state !== 'ok' && state !== 'lowbal'}>
          {none && <div className="ob-onb"><b>还没有 API Key？</b><p>去 DeepSeek 注册一个，复制 Key 回来粘进下面的输入框就能用。国内可直连，按量计费，日常用量一个月通常也就几块钱。</p><ObBtn tone="ink" size="sm" seed={301} toastMsg="外链：platform.deepseek.com">打开 platform.deepseek.com ↗</ObBtn></div>}
          <ObSub>提供商</ObSub><p className="ob-hint">各家 Key 独立保存，点一下即切换</p>
          <div className="ob-provs">{PROV.map(([id, l, m, s]) => (
            <button key={id} type="button" className="ob-prov" aria-pressed={id === prov} onClick={() => { setProv(id); sfx('switch', 0.3); }}>
              {s && !none ? <i className="ob-prov-ck" aria-label="已存 Key">✓</i> : null}{s === 2 && !none ? <i className="ob-dot on" aria-label="测过且成功" /> : null}
              <b>{l}</b><small>{id === 'custom' ? '中转站 · 硅基流动 · 智谱 · OpenRouter · Anthropic…' : (id === 'qwen' ? '⚠ ' : '') + m}</small></button>
          ))}</div>
          {custom && (
            <div className="ob-custom"><ObSub>接哪一家</ObSub>
              <div className="ob-chips">{CUSTOM_PRESETS.map(([id, n]) => <ObChip key={id} label={n} on={id === preset} noflip onClick={() => setPreset(id)} />)}</div>
              <p className="ob-hint">{CUSTOM_PRESETS.find((c) => c[0] === preset)![2]}</p>
              <label className="ob-inl"><span>名字</span><ObInp ph="起个名字，如「我的中转站」" aria="自定义服务商名字" /></label>
              <label className="ob-inl"><span>协议</span><ObSeg opts={[['openai', 'OpenAI 兼容'], ['anthropic', 'Anthropic']]} sel="openai" aria="请求协议" /></label>
              <p className="ob-hint">绝大多数中转站和平台都是 OpenAI 兼容（/chat/completions）。</p></div>
          )}
          <div className="ob-keyhd"><ObSub>{custom ? '自定义' : P[1]} 的 API 密钥</ObSub><ObLink toastMsg="外链：服务商控制台">去申请 ↗</ObLink></div>
          <div className="ob-keyrow"><ObInp ph="sk-…" val={none ? '' : 'sk-••••••••••••••••3f9a'} type="password" aria="API 密钥" cls="ob-mono" /><BusyBtn label={none ? '保存' : '✓ 已保存'} busy="保存中…" done="✓ 已保存" tone="ink" seed={302} /></div>
          <BusyBtn label={state === 'tested' ? '✓ 连接正常' : state === 'testerr' ? '× 连接失败' : '测试连接'} busy="测试中…" done="✓ 连接正常" seed={303} className="ob-wide" msg="连接成功 · deepseek-flash · 412 ms · 模型列表已更新（9 个）" fail="401 Unauthorized：Key 不对或已失效" failLabel="× 连接失败" to={setTestMsg} />
          <div className="ob-ai-test">{testMsg}</div>
          <ObNote>Key 保存在这台设备上，也会跟着本地备份走；默认不上云，在「账号与数据」的「云同步 · 数据类目选择」里打开「AI 模型 API」才会随同步上传。测试连接成功后这家会亮绿灯（换 Key 需重新测试）。</ObNote>
          <ObSub>{custom ? 'API 地址（必填）' : '自定义 API 地址（可选）'}</ObSub><p className="ob-hint">用中转站就填它给的接口地址，一般以 /v1 结尾；多贴的 /chat/completions 会自动去掉，少了 /v1 测试连接时会自动补上。</p>
          <ObInp ph="https://…/v1" aria="自定义 API 地址" cls="ob-mono" />
          {state === 'native' && <ObMsg kind="warn">这个地址不放行跨域，App 里走原生通道：能用，但没有流式，回复会整段出现。对方放行后再点一次「测试连接」即可改回。</ObMsg>}
        </ObFold>
      </ObCard>
      <ObCard seed={312}>
        {none ? <ObFold title="模型分档" meta="⚡ — · 🌙 — · 👁 — · 🎤 —"><p className="ob-warnc">先在上方「连接」卡里配好 API Key，再来选模型。</p></ObFold> : (
          <ObFold title="模型分档" meta="⚡ deepseek-flash · 🌙 qwen-max · 👁 deepseek-flash · 🎤 未启用" open={state === 'tiers'}>
            <div className="ob-tier-sum">{[['⚡', 'deepseek-flash'], ['🌙', 'qwen-max'], ['👁', 'deepseek-flash'], ['🎤', '未启用']].map(([i, m]) => <span key={i}><i>{i}</i>{m}</span>)}</div>
            <div className="ob-acts left">
              <ObBtn tone="ink" size="sm" seed={304} onClick={() => { setTierRes(<ObMsg kind="info">逐档测试中…</ObMsg>); setTimeout(() => setTierRes(<ul className="ob-tres">{[['快速响应', 'deepseek-flash', '✓ 通了 · 388 ms'], ['深思熟虑', 'qwen-max', '✓ 通了 · 1204 ms · 走原生通道'], ['助手', '', '跟随深思熟虑'], ['视觉', 'deepseek-flash', '✓ 通了 · 512 ms'], ['听觉', '', '未启用']].map(([a, m, t]) => <li key={a}><b>{a}</b><span className="ob-mono">{m || '—'}</span><em className={t.startsWith('✓') ? 'ok' : ''}>{t}</em></li>)}</ul>), 1100); }}>逐档测一遍</ObBtn>
              <BusyBtn label="刷新全部模型列表" busy="拉取中…" tone="paper" size="sm" seed={305} to={setTierRes} msg={<>已更新：DeepSeek 9 个、千问 42 个<br />跳过：Kimi（还没填 Key）<br />⚠ 这些档在用的模型已不在官方最新列表里，可能下线了，建议换一个：深思熟虑 qwen-max-0919</>} />
            </div>
            <div className="ob-tier-res">{tierRes}</div>
            {tier('⚡', '快速响应', '记账解析、每日塔罗、活动打分、成长总结等批量任务走这档——要快、便宜够用。跑在当前连接（DeepSeek）上。', 'deepseek-flash', '留空 = 默认（deepseek-flash）', 'fast',
              <><ObRow label="每日塔罗改走深思熟虑" hint="每天一次，多等几秒换更贴的解读；深思熟虑没配时自动退回快速响应。"><ObSw label="每日塔罗改走深思熟虑" /></ObRow><ObRow label="成长总结改走深思熟虑" hint="周报月报一期一封，多等一两分钟换更贴的信；它在后台写，关掉页面也不会断。"><ObSw on label="成长总结改走深思熟虑" /></ObRow></>)}
            {tier('🌙', '深思熟虑', '助手对话、中长期占卜，以及逆影战场的生成（召唤 Persona、区层 / 伪神 / 满月心魔显形）走这档——值得等的深答案，可跨服务商选更强的模型（用那家已存的 Key 直连）。留空跟随快速响应。', '千问 · qwen-max', '留空 = 跟随快速响应（deepseek-flash）', 'deliberate', <p className="ob-eff">实际调用：千问 · qwen-max</p>)}
            {tier('👁', '视觉', '拍小票记账等看图任务走这档。没配也能用——记账会退到本机离线识字（需原生 App），再不行就手输。图片只发给你自己配的服务商。', 'DeepSeek · deepseek-flash', '留空 = 不启用（如 deepseek-flash / qwen-vl-plus / gpt-6-luna）', 'vision')}
            {tier('🎤', '听觉', '配好后助手输入栏出现话筒：按住说话、松手转成文字填进输入框（发不发你决定）。走 /audio/transcriptions 端点，模型名如 whisper-1 / SenseVoiceSmall / qwen3-asr-flash。不配也没关系——输入法自带的语音键一直都能用。', '未启用', '留空 = 不启用（如 whisper-1 / qwen3-asr-flash）', 'audio')}
          </ObFold>
        )}
      </ObCard>
      <ObCard seed={313}><CopyRow /></ObCard>
    </>
  );
}
function CopyRow() {
  const [c, setC] = useState(false);
  return <ObRow label="复制 AI 诊断信息" hint="最近 40 次请求的成败、耗时和服务商，不含聊天内容和 Key。遇到连不上时复制给我们。"><ObBtn tone="ink" size="sm" seed={306} onClick={() => { setC(true); setTimeout(() => setC(false), 1500); }}>{c ? '已复制' : '复制'}</ObBtn></ObRow>;
}

/* ═════ AI 总结分区 ═════ */
export const SUMMARY_STATES: [string, string][] = [['list', '列表'], ['new', '新增风格'], ['edit', '编辑风格']];
const FAMILIAR: [string, string, string, string][] = [['elizabeth', '🦋', '蓝蝶', '好奇探索，郑重记录'], ['theodore', '🌿', '青侍', '恭谨诚挚，深情服侍'], ['margaret', '📖', '典藏', '典雅沉思，潜能鉴证'], ['caroline-justine', '⚔️', '双子审官', '急峻与冷静，双声问讯']];
export function SummarySection({ state: init = 'list', onGoAI }: { state?: string; onGoAI?: () => void }) {
  const [st, setSt] = useState(init);
  const [fam, setFam] = useState('elizabeth');
  return (
    <>
      <ObLi cls="ob-sign" onClick={onGoAI}><b>API Key 和模型已移到「AI 服务」</b><em>前往 ›</em></ObLi>
      <ObCard title="沟通风格" en="STYLE" seed={533}>
        <ObSub>熟悉的人</ObSub>
        <div className="ob-fam">{FAMILIAR.map(([id, ic, n, t]) => <button key={id} type="button" className="ob-famc" aria-pressed={id === fam} onClick={() => setFam(id)}><span>{ic}</span><b>{n}</b><small>{t}</small></button>)}</div>
        <div className="ob-keyhd"><ObSub>内置 / 自定义</ObSub><ObLink onClick={() => setSt('new')}>+ 新增</ObLink></div>
        {(st === 'new' || st === 'edit') && (
          <div className="ob-form" key={st}><ObInp ph="风格名称" val={st === 'edit' ? '温柔学姐' : ''} aria="风格名称" /><ObTa ph="输入 system prompt…" val={st === 'edit' ? '以温柔学姐的口吻，先肯定再建议……' : ''} rows={4} aria="system prompt" />
            <div className="ob-acts two"><ObBtn seed={531} toastMsg="已保存风格" onClick={() => setSt('list')}>保存</ObBtn><ObBtn tone="paper" seed={532} onClick={() => setSt('list')}>取消</ObBtn></div></div>
        )}
        <div className="ob-presets">{([['馆长', '以德高望重、深邃睿智的口吻，作为房间的主人……', 1, 1], ['助手', '用助手当前人格的口吻写……', 1, 0], ['自定义', '', 1, 0], ['温柔学姐', '以温柔学姐的口吻，先肯定再建议……', 0, 0]] as [string, string, number, number][]).map(([n, p, b, on]) => (
          <div key={n} className={`ob-preset${on ? ' on' : ''}`}><div><b>{n} {b ? <P5Tag tone="paper">内置</P5Tag> : null}</b>{p ? <small>{p}</small> : <small className="ob-dim">暂无 prompt，点击编辑</small>}</div><ObLink onClick={() => setSt('edit')}>编辑</ObLink>{b ? null : <ObLink danger toastMsg="已删除风格">删除</ObLink>}</div>
        ))}</div>
      </ObCard>
      <ObCard seed={534}><ObRow label="自动撰写上一期总结" hint="新的一周、一个月第一次打开时，上一期还没写就在后台写好，写完提醒你一次「可以查看了」。用当前选的风格。"><ObSw on label="自动撰写上一期总结" /></ObRow></ObCard>
    </>
  );
}

/* ═════ 体验个性化分区 ═════ */
export function PersonalizeSection() {
  const [ri, setRi] = useState(0);
  const [kw, setKw] = useState([['读书', '课程', '论文'], ['跑步', '演讲'], ['吉他', '做饭', '编程'], ['陪伴', '志愿'], []]);
  const [ledger, setLedger] = useState(true);
  return (
    <>
      <ObCard title="属性" en="ATTRIBUTES" seed={511}>
        <ObRow label="逆流" hint="连续3日某属性无增长，次日起每天该属性自动 −1，并在首页提前一天预警。" tag="实验性"><ObSw label="逆流" /></ObRow>
        <ObRow label="记账" hint="低摩擦记账：总余额 / 预算 / 结转 + 四轴觉察。数据始终只存本地、不上云。" tag="新"><ObSw on={ledger} label="记账" onToggle={setLedger} /></ObRow>
        {ledger && (
          <div className="ob-nest">
            <ObRow label="货币"><ObSel opts={[['CNY', '¥ 人民币'], ['USD', '$ 美元'], ['EUR', '€ 欧元'], ['JPY', '¥ 日元'], ['GBP', '£ 英镑'], ['HKD', 'HK$ 港币'], ['KRW', '₩ 韩元']]} val="CNY" aria="货币" /></ObRow>
            <ObRow label="消费评估" hint="记账时可评「值 / 不值」，值得 +1 SP，比例进月报"><ObSw on label="消费评估" /></ObRow>
            <ObRow label="发薪日周期" hint="预算 / 今日可花 / 规划窗按发薪日切分周期；关则按自然月。"><ObSw on label="发薪日周期" /></ObRow>
            <ObRow label="发薪日"><ObSel opts={Array.from({ length: 28 }, (_, i) => [String(i + 1), `每月 ${i + 1} 号`] as [string, string])} val="10" aria="发薪日" /></ObRow>
          </div>
        )}
      </ObCard>
      <ObCard title="属性名称" en="NAMES" seed={514}>
        <p className="ob-count">5 维</p><ObHint>给五个维度取个贴合你的名字，命名会立刻在整个房间里生效。</ObHint>
        <div className="ob-attrnames">{ATTR_META.map(([id, ic, l], i) => <label key={id} className="ob-an" style={{ ['--i' as string]: i }}><span className="ob-an-ic" aria-hidden="true">{ic}</span><span className="ob-an-m"><small>默认「{l}」</small><ObInp ph={l} val={ATTR[id as keyof typeof ATTR].name} aria={`${l}的名称`} /></span></label>)}</div>
        <div className="ob-acts left"><ObBtn tone="ink" size="sm" seed={512} onClick={() => openOverlay('settings-name-match-modal')}>AI 匹配成就 / 技能名称</ObBtn><ObBtn tone="paper" size="sm" seed={513} toastMsg="已还原到 AI 覆写前的成就/技能名称">还原</ObBtn></div>
        <ObNote>当前有 AI 覆写记录，可还原到覆写前版本。</ObNote>
      </ObCard>
      <ObCard title="等级需求" en="LEVELS" seed={517}>
        <p className="ob-count">{THR.length} / 10 级</p><ObHint>达到对应等级所需的累计点数（数值可随时调整；建议保持单调递增）。</ObHint>
        <ObSeg opts={[['easy', '简单', 'LV5 需 70 点'], ['hard', '困难', 'LV5 需 120 点']]} sel="easy" aria="难度档" cls="ob-seg-big" />
        <ObNote>困难档的等级标签会换成一套专属配色——菜单、同伴塔罗、以及别人看到的你，都认得出来。</ObNote>
        <div className="ob-thr">{THR.map((v, i) => (
          <div key={i} className="ob-thr-r"><b>Lv.{i + 1}</b><span className="ob-unit"><ObInp ph="需求点数" val={v} type="number" aria={`Lv.${i + 1} 需求点数`} /><i>点</i></span>
            {i === THR.length - 1 ? <button type="button" className="ob-x" aria-label="移除最高等级" title="移除最高等级" onClick={() => openOverlay('settings-threshold-confirm', { variant: 'remove' })}>✕</button> : <span className="ob-x ghost" title={i < 5 ? 'Lv.1–5 不可删除' : '只能删除最高等级'}>{i < 5 ? '🔒' : ''}</span>}</div>
        ))}</div>
        <div className="ob-acts left"><ObBtn tone="ink" size="sm" seed={515} onClick={() => openOverlay('settings-threshold-confirm', { variant: 'add' })}>+ 添加一级</ObBtn><ObBtn tone="paper" size="sm" seed={516} title="恢复默认阈值" onClick={() => openOverlay('settings-threshold-confirm', { variant: 'reset' })}>↺ 默认</ObBtn></div>
      </ObCard>
      <ObCard title="等级称号" en="TITLES" seed={520}>
        <ObHint>每个属性的 Lv 会显示一个四字称号；点击 AI 刷新会先生成建议，再选择要应用的属性。</ObHint>
        <div className="ob-acts left"><LevelTitleRefreshBtn /><ObBtn tone="paper" size="sm" seed={519} toastMsg="已填入默认等级称号">默认</ObBtn></div>
        <div className="ob-car"><button type="button" className="ob-car-b" aria-label="上一个属性" onClick={() => setRi((ri + 4) % 5)}>◀</button><b className="ob-car-t">{ATTR_META[ri][1]} {ATTR_META[ri][2]}</b><button type="button" className="ob-car-b" aria-label="下一个属性" onClick={() => setRi((ri + 1) % 5)}>▶</button></div>
        <div className="ob-dots">{ATTR_META.map((a, i) => <button key={a[0]} type="button" aria-label={`切换到${a[2]}`} aria-pressed={i === ri} onClick={() => setRi(i)} />)}</div>
        <div className="ob-titles" key={ri}>{RANKS[ATTR_ORDER[ri]].map((t, i) => <label key={i} className="ob-thr-r"><b>Lv.{i + 1}</b><ObInp ph="四字称号" val={t} aria={`Lv.${i + 1} 称号`} /></label>)}</div>
      </ObCard>
      <ObCard seed={521}><ObRow label="今日委托多一张 AI 写的" hint="委托板的今日委托在三张题库卡之外，每天再多一张按你最近的记录写的。会把最近 7 天的记录标题发给你配的 AI 服务；没配 AI 时不出现。"><ObSw label="今日委托多一张 AI 写的" /></ObRow></ObCard>
      <ObCard seed={522}>
        <ObFold title="关键词规则" meta="命中即加分">
          <p className="ob-hint">记录中出现某属性的关键词时，自动为该属性 +1 点。回车或点 <b>+</b> 添加，点击标签可移除。</p>
          <div className="ob-rules">{ATTR_META.map(([id, ic, l], i) => (
            <div key={id} className="ob-rule"><div className="ob-rule-h"><span>{ic}</span><b>{l}</b><small>命中后 <em>+1</em> 点</small><small>{kw[i].length} 词</small></div>
              <div className="ob-kws">{kw[i].length ? kw[i].map((k) => <button key={k} type="button" className="ob-kw" title="点击移除" onClick={() => setKw(kw.map((a, j) => (j === i ? a.filter((x) => x !== k) : a)))}>{k} ✕</button>) : <span className="ob-hint">暂无关键词，下方输入回车添加</span>}</div>
              <KwAdd onAdd={(v) => setKw(kw.map((a, j) => (j === i && !a.includes(v) ? [...a, v] : a)))} /></div>
          ))}</div>
        </ObFold>
      </ObCard>
      <ObCard seed={524}><ObRow label="逆影战场" hint="召唤 Persona，识破并击败内心的暗影。" tag="已关闭"><ObBtn size="sm" seed={523} toastMsg="逆影战场已开启">开启</ObBtn></ObRow></ObCard>
    </>
  );
}
function KwAdd({ onAdd }: { onAdd: (v: string) => void }) {
  const [v, setV] = useState('');
  const add = () => { if (v.trim()) { onAdd(v.trim()); setV(''); } };
  return <div className="ob-keyrow"><input className="ob-inp" placeholder="输入关键词后回车 / 点 +" aria-label="添加关键词" value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} /><button type="button" className="ob-plus" aria-label="添加关键词" onClick={add}>+</button></div>;
}
/** 「AI 刷新」：刷新中… → 打开称号建议弹窗（真实 handleRefreshLevelTitles） */
function LevelTitleRefreshBtn() {
  const [b, setB] = useState(false);
  return <ObBtn tone="ink" size="sm" seed={518} disabled={b} onClick={() => { setB(true); setTimeout(() => { setB(false); openOverlay('settings-level-title-modal'); }, 900); }}>{b ? '刷新中…' : 'AI 刷新'}</ObBtn>;
}

/* ═════ 助手设置 NavigatorSettings ═════ */
export const NAV_STATES: [string, string][] = [['normal', '常态'], ['nokey', '未配 Key'], ['nonotif', '提醒未开']];
export const PERSONAS: [string, string, string, number, number, number][] = [['cat', '摩尔加纳', '自称「不是猫」的引路者，嘴上嫌麻烦，手上从不掉链子', 1, 1, 0], ['toaster', '高卷杏', '开朗直率的同伴，什么事都想陪你一起', 1, 0, 1], ['bear', '坂本龙司', '冲动热血的行动派，最擅长给你打气', 1, 0, 0], ['star', '白手套', '优雅的管家，礼貌、精确、偶尔毒舌', 0, 0, 0]];
export const GLYPH: Record<string, string> = { cat: '猫', toaster: '吐', bear: '熊', butterfly: '蝶', star: '★' };
export function NavigatorSection({ state = 'normal' }: { state?: string }) {
  const nokey = state === 'nokey';
  const [arch, setArch] = useMsgBox();
  const [del, setDel] = useState<string | null>(null);
  return (
    <>
      <ObCard seed={701} en="NAVIGATOR">
        <ObRow label="拟真增强" hint="回复像真人打字：流式生成 + 按句子切成碎气泡逐条冒出（1.2s 一条）；括号里的颜文字、括注不拆开。低性能模式下自动停用。"><ObSw on label="拟真增强" /></ObRow>
        <ObRow label="主动提议更新愿望进度" hint={<>你在对话里提到某个愿望有推进时，它会问一句「要不要更新进度」。只在<b>明确指向单个愿望且确有推进</b>时才问，同一个愿望 6 小时内至多一次；落库永远要你点确认。关掉后它照旧知道你的愿望，只是不再主动问。</>}><ObSw on label="主动提议更新愿望进度" /></ObRow>
        <ObRow label="主动找你" hint={<>每天最多一条推送：约好的事过后问你一句结果、认识满一个月这样的日子、好几天没见时说一次想念。夜里不发；锁屏上只写「摩尔加纳有话想跟你说」。{state === 'nonotif' ? <b> 要先在「提醒」里打开每日提醒。</b> : null}</>}><ObSw on={state !== 'nonotif'} label="主动找你" /></ObRow>
      </ObCard>
      <ObCard title="人格" en="PERSONA" seed={707}>
        <ObHint>切换人格会开启（或恢复）它今天的对话。能力不变，变的只是性格和嘴。</ObHint>
        <div className="ob-personas">{PERSONAS.map(([av, n, p, builtin, cur, modified]) => (
          <div key={av} className={`ob-persona${cur ? ' on' : ''}`}><span className="ob-glyph" aria-hidden="true">{GLYPH[av]}</span>
            <div className="ob-persona-m"><b>{n} {builtin ? <P5Tag tone="paper">内置</P5Tag> : null}{cur ? <P5Tag>当前</P5Tag> : null}</b><small>{p}…</small></div>
            <div className="ob-persona-a">{cur ? null : <ObBtn tone="ink" size="sm" seed={702} toastMsg={`已切换到 ${n}`}>切换</ObBtn>}
              <ObLink aria={`编辑 ${n}`} onClick={() => openOverlay('settings-persona-editor', { variant: 'edit', name: n })}>编辑</ObLink>
              {builtin ? (modified ? <ObLink aria={`恢复 ${n} 默认`} toastMsg={`已恢复 ${n} 默认`}>恢复默认</ObLink> : null) : <ObLink danger aria={`删除 ${n}`} onClick={() => setDel(n)}>删除</ObLink>}</div></div>
        ))}</div>
        {nokey ? <ObNote>配置 AI 密钥后可创建自定义人格。</ObNote> : <ObBtn seed={703} className="ob-wide" onClick={() => openOverlay('settings-persona-editor')}>＋ 新建人格（AI 生成）</ObBtn>}
      </ObCard>
      <ObCard seed={710} en="MEMORY">
        <ObRow label="📓 记事本" hint="它记住的关于你的事：长期画像 + 零散记忆，可改可删，只存本机。"><ObBtn tone="ink" size="sm" seed={708} onClick={() => openOverlay('assistant-notebook')}>打开</ObBtn></ObRow>
        <ObRow label="整理旧对话" hint="把之前没归档的聊天收进记忆（平时它会自己做）。"><BusyBtn label="整理" busy="整理中…" tone="paper" size="sm" seed={709} to={setArch} msg="已归档，最近摘要：聊了期中复习计划和周末去美术馆的事，约好周六早上…" fail="没有待归档的会话" /></ObRow>
        <div className="ob-archmsg">{arch}</div>
        <ObFold title="对话模型" meta={nokey ? '—' : '跟随深思熟虑档'}>
          {nokey ? <ObNote>先在「设置 → AI 智能功能」里配置 API Key，这里才能选模型。</ObNote> : (
            <><p className="ob-hint">只给<b>助手</b>（对话 / 每日问候 / 人格生成）单独指定模型，可跨服务商（用那家已存的 Key 直连）。留空 = 跟随「深思熟虑」档；这里的选择<b>不会</b>影响中长期占卜等其它走深思熟虑的功能。</p>
              <button type="button" className="ob-pick" onClick={() => openOverlay('settings-model-picker', { variant: 'assistant' })}><span>跟随深思熟虑档（qwen-max）</span><b>选择模型 ›</b></button><ObLink toastMsg="已恢复跟随深思熟虑档">恢复跟随深思熟虑档</ObLink></>
          )}
        </ObFold>
      </ObCard>
      <PersonaDeleteConfirm name={del} onClose={() => setDel(null)} />
    </>
  );
}
export function PersonaDeleteConfirm({ name, onClose }: { name: string | null; onClose: () => void }) {
  return <ObConfirm open={!!name} onClose={onClose} title={`删除人格「${name ?? ''}」？`} desc="它的历史会话仍会保留。" danger confirm="删除" onConfirm={() => toast('已删除人格')} />;
}

/** 新建 / 编辑人格面板（NavigatorSettings gen 面板）：state = gen | edit | generating | generr */
export function PersonaEditor({ state = 'gen', onClose }: { state?: string; onClose: () => void }) {
  const g = state === 'edit';
  const [msg, setMsg] = useMsgBox(state === 'generr' ? <ObMsg kind="err">名字和人格设定都不能为空</ObMsg> : null);
  const [glyph, setGlyph] = useState('star');
  const [crop, setCrop] = useState(false);
  const [generated, setGenerated] = useState(g || state === 'generating');
  return (
    <div className="ob-gen">
      <div className="ob-gen-h"><b>{g ? '编辑人格' : '新建人格'}</b><button type="button" className="ob-x" aria-label="关闭" onClick={onClose}>✕</button></div>
      <ObInp ph="名字（如：白手套 / 老班长…）" val={g ? '白手套' : ''} aria="人格名字" />
      <ObSub>头像</ObSub>
      <div className="ob-glyphs">{Object.keys(GLYPH).map((k) => <button key={k} type="button" className="ob-glyph btn" aria-label={`剪影 ${k}`} aria-pressed={k === glyph} onClick={() => setGlyph(k)}>{GLYPH[k]}</button>)}<button type="button" className="ob-glyph up" onClick={() => setCrop(true)}>上传</button></div>
      <ObHint>上传头像只存本机，永不上云。</ObHint>
      <ObInp ph="它怎么称呼你？（可空，如：老板 / 小朋友）" val={g ? '少爷' : ''} aria="称呼" />
      <ObSub>语气关键词（多选）</ObSub>
      <div className="ob-chips">{['温柔', '毒舌', '元气', '冷淡', '正经', '幽默', '腹黑', '天然'].map((t, i) => <ObChip key={t} label={t} on={g ? i === 1 || i === 4 : i === 0} />)}</div>
      <ObSeg opts={[['accompany', '陪伴型'], ['push', '督促型']]} sel={g ? 'push' : 'accompany'} aria="教练风格" />
      <ObTa ph="自由描述（可空）：口头禅、背景设定、想避免的说话方式…" rows={2} aria="自由描述" />
      {state === 'generating' ? <ObBtn tone="ink" seed={704} className="ob-wide" disabled>生成中…</ObBtn>
        : <BusyBtn label={g || generated ? '换一版' : 'AI 生成人格设定'} busy="生成中…" done="换一版" tone="ink" seed={704} className="ob-wide" to={setMsg} msg="已生成人格设定，可在下面修改" fail="生成失败：429 Too Many Requests" onDone={(ok) => ok && setGenerated(true)} />}
      <div className="ob-genmsg">{msg}</div>
      {generated && (
        <>
          <ObSub>人格设定（保存前可随意修改）</ObSub><ObTa val="你是「白手套」——一位优雅的管家，礼貌、精确、偶尔毒舌……" rows={4} aria="人格设定" />
          <ObHint>喜好（它每天的小状态会用到；用「、」隔开，留空的话第一次用到时按人格设定自动写）</ObHint>
          <div className="ob-likes">{[['喜欢', '晒太阳、热可可'], ['讨厌', '下雨、闹钟'], ['小习惯', '下雨天话变少']].map(([l, ph]) => <label key={l} className="ob-inl"><span>{l}</span><ObInp ph={ph} aria={`${l}（用「、」隔开）`} /></label>)}</div>
        </>
      )}
      <div className="ob-acts"><ObBtn tone="paper" seed={705} onClick={onClose}>取消</ObBtn><ObBtn seed={706} toastMsg="已保存人格" onClick={onClose}>保存</ObBtn></div>
      <ObCrop open={crop} onClose={() => setCrop(false)} title="调整头像" />
    </div>
  );
}

/* ═════ 通知提醒 NotificationSettings ═════ */
export const NOTIF_STATES: [string, string][] = [['on', '已开启'], ['off', '总开关关'], ['denied', '权限未授予'], ['empty', '无时段'], ['web', '网页版降级']];
const NC: [string, string, string, string][] = [['tarot', '🔮', '今日塔罗', '今天还没抽塔罗时提醒'], ['todos', '✅', '今日待办', '仍有未完成的每日待办时提醒'], ['countercurrent', '🌊', '逆流预警', '有属性明日将逆流扣减时提醒'], ['summary', '✨', '成长总结', '新的周报 / 月报写好时提醒一次'], ['record', '📝', '提醒记录', '今天还没有任何记录时提醒'], ['together', '🤝', '一起进步', '约好的事今天还没完成时提醒；好友催你、发来邀请也会尽快告诉你'], ['quests', '📜', '委托板', '每周一委托刷新时提醒一次（委托板解锁后才会有）'], ['meeting', '🗓️', '据点会议', '周日提醒给这周打分、写下周目标（加入组织后才会有；默认不开）']];
interface Slot { id: number; t: string; l: string; c: string[] }
export function NotificationsSection({ state: init = 'on' }: { state?: string }) {
  const [on, setOn] = useState(init !== 'off');
  const web = init === 'web';
  const [slots, setSlots] = useState<Slot[]>(init === 'empty' ? [] : [{ id: 1, t: '08:00', l: '早安', c: ['tarot', 'todos'] }, { id: 2, t: '21:30', l: '睡前回顾', c: ['record', 'countercurrent', 'summary'] }]);
  return (
    <ObCard title="本地提醒" en="NOTIFY" seed={381}>
      {web && <ObMsg kind="warn">本地通知在 <b>Android / iOS 客户端</b> 送达（网页版没有这个能力）。你仍可在此预先配置时段与内容，装上客户端后即生效。</ObMsg>}
      <ObRow label="每日提醒" hint="在你选的时段提醒抽塔罗、未竟待办、逆流预警等。内容在端上生成，不经服务器。"><ObSw on={on} label="每日提醒总开关" onToggle={setOn} /></ObRow>
      {init === 'denied' && <div className="ob-msg err">通知权限未授予，提醒不会送达。 <ObBtn tone="paper" size="sm" seed={371} toastMsg="已打开系统通知设置">去授权</ObBtn></div>}
      {on && (
        <>
          <ObRow label="让助手来写提醒文案" hint={<>每天用<b>当前人格</b>的口吻生成一套推送文案（走助手档模型，一天一次）。没配 AI、离线或生成失败时自动退回内置文案，提醒本身不受影响。</>}><ObSw on label="让助手来写提醒文案" /></ObRow>
          <ObRow label="助手会主动找你" hint="每天最多一条：约好的事过后问你一句结果、认识满一个月这样的日子、好几天没见时说一次想念。夜里 22:30～08:30 不发；锁屏上只写「〈助手的名字〉有话想跟你说」，点开再说是什么事。"><ObSw on label="助手会主动找你" /></ObRow>
          <div className="ob-slots">
            {!slots.length && <p className="ob-hint ob-c">还没有提醒时段，点下方添加一个。</p>}
            {slots.map((s, i) => (
              <div key={s.id} className="ob-slot" style={{ ['--i' as string]: i }}>
                <div className="ob-slot-h"><ObSw on label={`启用「${s.l}」`} /><input className="ob-inp ob-time" type="time" defaultValue={s.t} aria-label={`「${s.l}」时间`} /><ObInp ph="名称" val={s.l} aria="时段名称" /><button type="button" className="ob-x" aria-label="删除时段" onClick={() => setSlots(slots.filter((x) => x.id !== s.id))}>✕</button></div>
                <div className="ob-chips">{NC.map(([id, ic, lb, hint]) => <ObChip key={id} label={`${ic} ${lb}`} on={s.c.includes(id)} title={hint} />)}</div>
              </div>
            ))}
          </div>
          <ObBtn tone="paper" seed={372} className="ob-wide" onClick={() => setSlots([...slots, { id: Date.now(), t: '12:00', l: '新的提醒', c: ['tarot'] }])}>＋ 添加提醒时段</ObBtn>
          {!web && <BusyBtn label="发送一条测试通知" busy="发送中…" done="✓ 已发送，请查看通知栏" revert={2200} tone="ink" seed={373} className="ob-wide" />}
        </>
      )}
    </ObCard>
  );
}
