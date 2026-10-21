/**
 * 【2026-10-21 parity 修复】页面默认 = 原生 v3 pages_b.js settings 版式 1:1（CONFIG 页头 + 斜标签分类 cfg-cats + 黑斜行 cfg-items + 红开关）；
 *   点「go」行 = v3 的 P5.B.openSettings(section)：进入下方全量分区面板（v3 overlays/b.js 全量版，展开对应分区）；「数据」行 → 账号与数据（星形反撕）。
 *   直达 ?tab= / ?block= 直接进全量面板（保持清单路由）。全量面板顶部「◀ 设置」回到 v3 列表。
 * 设置 Settings（真实 src/pages/Settings.tsx：六个分区手风琴 —— 主题 / AI 服务 / AI 总结 / 体验个性化 / 助手 / 通知提醒，
 * 点区头展开 / 再点收起；页底「账号与数据」入口）。长相 = v3 overlays/b.js B.openSettings 全量版（.ob-sec 手风琴 + .ob-card 撕纸卡）
 * + pages_b.js 页头（CONFIG / 设置）。WeatherSettings 内嵌在主题分区、BgmSettings 在主题最下方折叠（同真实）。
 *
 * 路由：#/p/settings?tab=theme|ai|summary|personalize|navigator|notifications（展开该分区并滚到区头）
 *   &state=<分区演示态>（theme: normal|custom|muted|bg · ai: ok|none|tested|testerr|native|lowbal|tiers · summary: list|new|edit ·
 *                        navigator: normal|nokey|nonotif · notifications: on|off|denied|empty|web）
 *   &block=weather|bgm（滚到区块；&wx= 天气态 ok|missing|search|notfound|blocked|openmeteo；&bgm= list|empty|busy|full|error；&vol= ok|fb|none）
 * 页内弹层：选择模型抽屉 / 刷新等级称号 / AI 匹配名称 / 阈值确认 / 新建·编辑人格 / 删除人格 / 删除曲目 —— 都是完整组件（openOverlay）。
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PageProps } from '@/p5r-red/registry/types';
import { P5PageHeader, P5Back } from '@/p5r-red/kit/P5PageHeader';
import { P5Shp } from '@/p5r-red/kit/P5Shp';
import { P5StarIcon } from '@/p5r-red/kit/P5StarIcon';
import { DevStateBar } from '@/p5r-red/kit/DevStateBar';
import { navigate } from '@/p5r-red/shell/shellBus';
import { sfx } from '@/p5r-red/fx/sfx';
import { panelIn } from '@/p5r-red/fx/motion';
import { isLowMotion } from '@/p5r-red/lib/prefs';
import { ThemeSection, AISection, SummarySection, PersonalizeSection, NavigatorSection, NotificationsSection, THEME_STATES, AI_STATES, SUMMARY_STATES, NAV_STATES, NOTIF_STATES, WX_STATES, BGM_STATES } from '@/p5r-red/screens/overlays/SettingsBlocks';
import './Settings.p5r.css';

const SECTIONS: [string, string, string, string][] = [['theme', '主题', 'THEME', '🎨'], ['ai', 'AI 服务', 'AI SERVICE', '🔑'], ['summary', 'AI 总结', 'SUMMARY', '✦'], ['personalize', '体验个性化', 'PERSONALIZE', '⚙'], ['navigator', '助手', 'NAVIGATOR', '◆'], ['notifications', '通知提醒', 'NOTIFY', '🔔']];
/** v3 CFG 原值（pages_b.js） */
const CFG: Record<string, [string, 'sw' | 'go' | 'acct', boolean | string][]> = {
  '主题': [['夜间模式', 'sw', false], ['静音模式', 'sw', false], ['左侧栏布局', 'sw', true], ['主题色板 · 自定义颜色', 'go', '红 · P5R'], ['音效方案 · 塔罗卡面 · 音量', 'go', '复古'], ['背景动画 · 开屏动画', 'go', '2 / 2'], ['天气', 'go', '自动定位'], ['背景图片 · 导入音乐', 'go', '未设置']],
  'AI 服务': [['服务商 · Key · 模型', 'go', '未配置'], ['逐档测试', 'go', '测一遍']],
  'AI 总结': [['自动撰写上一期总结', 'sw', true], ['熟悉的人', 'go', '4 位'], ['总结风格', 'go', '默认']],
  '体验个性化': [['今日委托多一张 AI 写的', 'sw', true], ['逆流（实验性）', 'sw', false], ['记账 · 货币 · 发薪日', 'go', 'CNY ¥ · 10 日'], ['属性名称', 'go', '知识 · 胆量 · 灵巧 · 温柔 · 魅力'], ['等级需求 · 等级称号', 'go', '简单'], ['关键词规则', 'go', '内置 / 自定义']],
  '助手': [['助手人格 · 提醒', 'go', '1 位']],
  '通知提醒': [['通知与提醒', 'go', '已开启']],
  '数据': [['云同步 · 数据管理 · 备份导出', 'acct', '前往 ›']],
};
const CFG_SEC: Record<string, string> = { '主题': 'theme', 'AI 服务': 'ai', 'AI 总结': 'summary', '体验个性化': 'personalize', '助手': 'navigator', '通知提醒': 'notifications' };
let cfgCatMem = '主题';

/** v3 设置页列表视图 */
function CfgList({ onGo }: { onGo: (sec: string) => void }) {
  const [cat, setCat] = useState(cfgCatMem);
  const [sw, setSw] = useState<Record<string, boolean>>({});
  const root = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  useLayoutEffect(() => {
    const r = root.current; if (!r || isLowMotion()) return;
    const a: Animation[] = [];
    if (first.current) { r.querySelectorAll('.cfg-cat').forEach((c, i) => a.push(c.animate([{ opacity: 0, transform: 'translateX(-60px) rotate(-8deg)' }, { opacity: 1, transform: 'rotate(-4deg)' }], { duration: 300, delay: i * 50, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' }))); }
    r.querySelectorAll('.cfg-row').forEach((x, i) => a.push(x.animate([{ opacity: 0, transform: 'translateX(70px) skewX(-12deg)' }, { opacity: 1, transform: 'none' }], { duration: first.current ? 280 : 260, delay: (first.current ? 200 : 0) + i * (first.current ? 45 : 40), easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'backwards' })));
    first.current = false;
    return () => a.forEach((x) => x.cancel());
  }, [cat]);
  return (
    <div className="cfg-grid" ref={root}>
      <nav className="cfg-cats">{Object.keys(CFG).map((k, i) => <button key={k} type="button" className={`cfg-cat${k === cat ? ' on' : ''}`} style={{ ['--i' as string]: i }} onClick={() => { cfgCatMem = k; setCat(k); sfx('nav', 0.4); }}><span>{k}</span></button>)}</nav>
      <section className="cfg-items">{CFG[cat].map(([n, ty, v], i) => {
        const key = `${cat}/${n}`, on = sw[key] ?? (v as boolean);
        return (
          <div key={key} className="cfg-row" data-k={ty !== 'sw' ? ty : undefined} style={{ ['--i' as string]: i }} role={ty !== 'sw' ? 'button' : undefined} tabIndex={ty !== 'sw' ? 0 : undefined}
            onClick={(e) => { if (ty === 'acct') navigate('account', { via: 'tear', origin: { x: e.clientX, y: e.clientY } }); else if (ty === 'go') onGo(CFG_SEC[cat]); }}>
            <i className="req-bg" /><b>{n}</b>
            {ty === 'sw' ? <i className={`sw${on ? ' on' : ''}`} role="switch" aria-checked={on} aria-label={n} onClick={() => setSw((s) => ({ ...s, [key]: !on }))} /> : <span className="cfg-v">{v as string} ›</span>}
          </div>
        );
      })}</section>
    </div>
  );
}

const STATES: Record<string, [string, string][]> = { theme: THEME_STATES, ai: AI_STATES, summary: SUMMARY_STATES, navigator: NAV_STATES, notifications: NOTIF_STATES };

export default function Settings({ params }: PageProps) {
  const tab = params.get('tab');
  const st = params.get('state') ?? undefined;
  const block = params.get('block');
  const [open, setOpen] = useState<string | null>(tab && SECTIONS.some((s) => s[0] === tab) ? tab : block ? 'theme' : null);
  const [full, setFull] = useState(!!(tab || block));
  const root = useRef<HTMLDivElement>(null);

  // 进入：区头从左甩入（v3 cfg-cat 入场）+ 指定分区 / 区块滚到视口
  useLayoutEffect(() => {
    const r = root.current; if (!r) return;
    if (!isLowMotion()) r.querySelectorAll<HTMLElement>('.ob-sec-h').forEach((c, i) => c.animate([{ opacity: 0, transform: 'translateX(-60px) rotate(-8deg)' }, { opacity: 1 }], { duration: 300, delay: i * 50, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' }));
    const target = block ? r.querySelector(`#blk-${block}`) : tab ? r.querySelector(`[data-sec="${tab}"]`) : null;
    if (target) setTimeout(() => target.scrollIntoView({ block: 'start' }), 60);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id: string) => {
    const next = open === id ? null : id; setOpen(next); sfx('nav', 0.35);
    requestAnimationFrame(() => {
      const r = root.current; if (!r || !next) return;
      const b = r.querySelector('.ob-sec.open .ob-sec-b'); if (b) panelIn(b.children, { from: 'right', stagger: 0.05 });
      r.querySelector(`[data-sec="${id}"]`)?.scrollIntoView({ block: 'start', behavior: isLowMotion() ? 'auto' : 'smooth' });
    });
  };
  useEffect(() => { if (tab && tab !== open) setOpen(tab); if (tab) setFull(true); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const body = (id: string) => {
    switch (id) {
      case 'theme': return <ThemeSection key={`${st}${params.get('wx')}${params.get('bgm')}`} state={tab === 'theme' ? st : undefined} wx={params.get('wx') ?? 'ok'} bgm={params.get('bgm') ?? 'list'} vol={params.get('vol') ?? 'ok'} bgmOpen={block === 'bgm'} />;
      case 'ai': return <AISection key={st} state={tab === 'ai' ? st : undefined} />;
      case 'summary': return <SummarySection key={st} state={tab === 'summary' ? st : undefined} onGoAI={() => toggle('ai')} />;
      case 'personalize': return <PersonalizeSection />;
      case 'navigator': return <NavigatorSection key={st} state={tab === 'navigator' ? st : undefined} />;
      default: return <NotificationsSection key={st} state={tab === 'notifications' ? st : undefined} />;
    }
  };

  // Dev 状态条：当前分区的演示态（主题分区另含天气 / 音乐 / 音量）
  const cur = open ?? 'theme';
  const curName = SECTIONS.find((s) => s[0] === cur)![1];
  const dev = [{ label: 'v3 列表', q: '' }, ...SECTIONS.map(([id, l]) => ({ label: l, q: `tab=${id}` })),
    ...(STATES[cur] ?? []).map(([k, l]) => ({ label: `${curName}·${l}`, q: `tab=${cur}&state=${k}` })),
    ...(cur === 'theme' ? [...WX_STATES.map(([k, l]) => ({ label: `天气·${l}`, q: `tab=theme&block=weather&wx=${k}` })), ...BGM_STATES.map(([k, l]) => ({ label: `音乐·${l}`, q: `tab=theme&block=bgm&bgm=${k}` })), { label: '音量·降级', q: 'tab=theme&vol=fb' }, { label: '音量·未播过', q: 'tab=theme&vol=none' }] : [])];

  return (
    <div className="st5" ref={root}>
      <P5PageHeader ransom="CONFIG" cn="设置" sub="系统 · 外观 · 数据" seed={81} right={<P5Back to="menu" />} />
      {!full ? <CfgList onGo={(sec) => { sfx('nav', 0.4); setOpen(sec); setFull(true); requestAnimationFrame(() => root.current?.querySelector(`[data-sec="${sec}"]`)?.scrollIntoView({ block: 'start' })); }} /> : (
      <div className="ob-pn-body st5-body">
        <button type="button" className="st5-tolist" onClick={() => { sfx('nav', 0.35); setFull(false); window.scrollTo(0, 0); }}>◀ 设置</button>
        {SECTIONS.map(([id, l, en, ic], i) => (
          <div key={id} className={`ob-sec${open === id ? ' open' : ''}`} style={{ ['--i' as string]: i }}>
            <button type="button" className="ob-sec-h" data-sec={id} aria-expanded={open === id} onClick={() => toggle(id)}><span className="ob-sec-ic" aria-hidden="true">{ic}</span><b>{l}</b><small>{en}</small><i className="ob-caret">{open === id ? '▲' : '▼'}</i></button>
            {open === id && <div className="ob-sec-b">{body(id)}</div>}
          </div>
        ))}
        <button type="button" className="ob-acct" onClick={() => { sfx('nav', 0.4); navigate('account', { via: 'tear' }); }}>
          <P5Shp as="span" kind="cut" seed={571} tone="paper" className="ob-acct-in"><span className="ob-acct-ic" aria-hidden="true"><P5StarIcon fill="var(--red)" stroke="var(--ink)" sw={1.5} /></span><span><b>账号与数据</b><small>云同步 · 数据管理 · 备份导出</small></span><em>›</em></P5Shp>
        </button>
      </div>)}
      <DevStateBar page="settings" items={dev} />
    </div>
  );
}
