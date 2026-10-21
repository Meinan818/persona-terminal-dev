/**
 * #/__kit —— P3R 粉白 kit 全组件展示（每个组件的常用态 + 可点演示），配合 KIT.md 用法说明。
 * 页面本身也是 kit 的验收样张：390 / 1440、日 / 夜四张截图都要过目。
 */
import React, { useEffect, useState, type ReactNode } from 'react';
import {
  P3R, P3Button, P3IconButton, P3SlantTabs, P3Segment, P3LRTabs, P3ConfigRow, P3ValueCycler, P3OnOff, P3Gauge, P3ConfigDesc,
  P3Field, P3Input, P3Textarea, P3Select, P3Stepper, P3Check, P3MenuList, SelectWedge, P3Dialog, P3Sheet, P3ActionSheet, useToast,
  P3Speech, P3SlantCard, P3ChamferCard, P3StackSlab, P3ListRow, P3Progress, P3Tag, P3Avatar, P3Empty, P3Loading, P3Error, P3PageHeader,
  P3Lightbox, TarotFace, SectionMark, BigSlantTitle, GhostWords, TitlePeriod, GuideBox, CondNum, ShatteredStar, IconPlus, IconMore, IconTrash, IconEdit, IconStar,
} from '@pink/kit';
import { CutInBand, CutInSweep, RippleIris, WaveSlice, PetalBurst, LogoReveal, useAIStream, AIThinking, AIText, P3Stagger, P3StaggerItem, type AIFail } from '@pink/fx';
import { openAssistant, openWheel } from '@pink/shell/shellBus';
import { toggleLowMotion, toggleMode, usePrefs } from '@pink/lib/prefs';
import { PinkStage, HomeHeroDecor } from '@pink/fx/PinkStage';
import { tarotAsset } from '@pink/lib/asset';

const Sec = ({ title, en, children }: { title: string; en: string; children: ReactNode }) => (
  <section className="mb-10">
    <SectionMark title={title} en={en} className="mb-4" />
    {children}
  </section>
);
const Row = ({ children, className = '' }: { children: ReactNode; className?: string }) => <div className={`flex flex-wrap items-center gap-3 ${className}`}>{children}</div>;
const Cap = ({ children }: { children: ReactNode }) => <div className="mb-1.5 mt-3 font-cond-up text-[11px]" style={{ color: P3R.grey }}>{children}</div>;

const SWATCH: [string, string][] = [
  ['--p3r-blue', '樱玫红'], ['--p3r-blue-deep', '覆盆子'], ['--p3r-ink', '莓紫墨'], ['--p3r-ink-soft', '次要字'], ['--p3r-grey', '弱化'],
  ['--p3r-cyan', '淡藕紫'], ['--p3r-cyan-pale', '樱粉面'], ['--p3r-magenta', '珊瑚橙'], ['--p3r-bg', '舞台底'], ['--p3r-panel', '面板'],
  ['--p3r-track', '轨道'], ['--p3r-gold', '金'], ['--p3r-amber', '琥珀'], ['--p3r-mint', '收入绿'],
];
const READING = '恋人正位落在今天的第一张。它说的不是浪漫，而是选择——你已经在两条路之间站了很久。\n今天适合把那件一直拖着的小事做完：不必完美，先让它发生。傍晚之后，留一点时间给真正想见的人。';

export function KitShowcase() {
  const p = usePrefs();
  const toast = useToast();
  const [tab, setTab] = useState('a');
  const [lr, setLr] = useState('stats');
  const [seg, setSeg] = useState('day');
  const [cfgSel, setCfgSel] = useState(0);
  const [diff, setDiff] = useState<'easy' | 'normal' | 'hard'>('normal');
  const [on, setOn] = useState(true);
  const [vol, setVol] = useState(6);
  const [step, setStep] = useState(3);
  const [chk, setChk] = useState(true);
  const [dlg, setDlg] = useState<null | 'default' | 'danger' | 'warning' | 'system' | 'three' | 'busy'>(null);
  const [sheet, setSheet] = useState<null | 'bottom' | 'center' | 'screen' | 'busy'>(null);
  const [as, setAs] = useState(false);
  const [lb, setLb] = useState(false);
  const [cutin, setCutin] = useState<null | 'check' | 'star'>(null);
  const [sweep, setSweep] = useState(false);
  const [ripple, setRipple] = useState<{ x: number; y: number } | null>(null);
  const [wave, setWave] = useState(false);
  const [burst, setBurst] = useState(false);
  const [logoKey, setLogoKey] = useState(0);
  const [fail, setFail] = useState<AIFail>('none');
  const [aiKey, setAiKey] = useState(0);

  return (
    <div className="relative min-h-screen" style={{ overflowX: 'clip' }}>
      <PinkStage variant="page" />
      <div className="relative z-10 mx-auto max-w-[980px] px-4 pb-28 pt-[calc(16px+env(safe-area-inset-top))] wide:px-8">
        <P3PageHeader title="KIT" en="P3R PINK COMPONENTS" subtitle="粉白 P3R 组件库样张 · 用法见 KIT.md" onBack={() => { window.location.hash = '#/__index'; }}
          actions={<><P3Button size="sm" tone="soft" onClick={toggleMode}>{p.mode === 'day' ? '日' : '夜'}</P3Button><P3Button size="sm" tone={p.motion === 'low' ? 'primary' : 'soft'} onClick={toggleLowMotion}>低动效</P3Button></>} />

        <Sec title="色板" en="TOKENS">
          <div className="grid grid-cols-4 gap-2 wide:grid-cols-7">
            {SWATCH.map(([v, n]) => (
              <div key={v} className="min-w-0">
                <div className="h-11" style={{ background: `var(${v})`, clipPath: 'polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)' }} />
                <div className="mt-1 truncate text-[11px] font-black" style={{ color: P3R.ink }}>{n}</div>
                <div className="truncate font-cond-up text-[9px]" style={{ color: P3R.grey }}>{v.replace('--p3r-', '')}</div>
              </div>
            ))}
          </div>
          <Cap>字体 / 字号</Cap>
          <div className="space-y-1">
            <div className="font-heavy text-h1" style={{ color: P3R.ink }}>中文粗斜标题<TitlePeriod className="ml-1" /></div>
            <div className="font-cond text-[34px] leading-none" style={{ color: P3R.blue }}>SOCIAL STATS 0123456789</div>
            <div className="text-lead font-black" style={{ color: P3R.ink }}>Lead 16 · 正文加粗用于列表标题</div>
            <div className="text-body" style={{ color: P3R.inkSoft }}>Body 14 · 正文段落，行距 20。夜色里的樱花没有声音。</div>
            <div className="text-meta" style={{ color: P3R.grey }}>Meta 12 · 辅助信息 / 时间戳</div>
          </div>
          <Cap>标题件</Cap>
          <div className="relative overflow-hidden p-4" style={{ background: P3R.panelGlass, clipPath: 'polygon(14px 0,100% 0,calc(100% - 14px) 100%,0 100%)' }}>
            <GhostWords words={['WEEKDAY', 'MOON']} className="right-0 top-0 text-[60px]" />
            <BigSlantTitle title="今日任务" count={7} />
            <SectionMark className="mt-4" title="节标题 SectionMark" en="SECTION" tri meta={<CondNum value={42} label="PTS" />} />
            <SectionMark className="mt-3" marker="tri" tone="rose" title="三角标记 · 玫红" />
            <GuideBox className="mt-4" text="使用技能 / 指令" keys={[{ k: 'A', label: '确认' }, { k: 'B', label: '关闭' }]} />
          </div>
        </Sec>

        <Sec title="按钮" en="BUTTON">
          <Row>
            <P3Button corner>主要 primary</P3Button>
            <P3Button tone="soft">次要 soft</P3Button>
            <P3Button tone="ink">墨 ink</P3Button>
            <P3Button tone="outline">描边 outline</P3Button>
            <P3Button tone="danger">危险 danger</P3Button>
            <P3Button tone="warning">警告 warning</P3Button>
            <P3Button tone="ghost">幽灵 ghost</P3Button>
          </Row>
          <Row className="mt-3">
            <P3Button size="sm" leading={<IconPlus size={14} />}>小号</P3Button>
            <P3Button size="lg" trailing={<span>›</span>}>大号</P3Button>
            <P3Button busy busyText="保存中…">保存</P3Button>
            <P3Button disabled>禁用</P3Button>
            <P3IconButton label="更多"><IconMore size={18} /></P3IconButton>
            <P3IconButton label="编辑" tone="rose"><IconEdit size={18} /></P3IconButton>
            <P3IconButton label="删除" tone="ink"><IconTrash size={18} /></P3IconButton>
          </Row>
          <div className="mt-3 max-w-sm"><P3Button block size="lg" corner>整宽主按钮 block</P3Button></div>
        </Sec>

        <Sec title="页签" en="TABS · LB / RB">
          <P3SlantTabs items={[{ id: 'a', label: '全部' }, { id: 'b', label: '进行中', badge: 3 }, { id: 'c', label: '已完成' }, { id: 'd', label: '已归档' }, { id: 'e', label: '很长的一个分类名' }]} value={tab} onChange={setTab} />
          <Cap>LB / RB 切页（≤4 平铺）</Cap>
          <P3LRTabs items={[{ id: 'stats', label: '属性' }, { id: 'skill', label: '技能', badge: 1 }, { id: 'codex', label: '图鉴' }]} value={lr} onChange={setLr} />
          <Cap>LB / RB（&gt;4 只显示当前页名）</Cap>
          <P3LRTabs items={['主题', 'AI 服务', 'AI 总结', '个性化', '助手', '通知'].map((x) => ({ id: x, label: x }))} value={lr.length > 4 ? lr : '主题'} onChange={setLr} />
          <Cap>分段</Cap>
          <div className="max-w-sm"><P3Segment items={[{ id: 'day', label: '日' }, { id: 'week', label: '周' }, { id: 'month', label: '月' }]} value={seg} onChange={setSeg} /></div>
        </Sec>

        <Sec title="CONFIG 行" en="CONFIG">
          <div className="flex max-w-xl flex-col gap-1.5">
            <P3ConfigRow label="难度" hint="影响每日任务的属性点倍率" selected={cfgSel === 0} onFocus={() => setCfgSel(0)}>
              <P3ValueCycler value={diff} onChange={setDiff} options={[{ value: 'easy', label: '轻松' }, { value: 'normal', label: '普通' }, { value: 'hard', label: '严苛' }]} />
            </P3ConfigRow>
            <P3ConfigRow label="开屏动画" selected={cfgSel === 1} onFocus={() => setCfgSel(1)}><P3OnOff value={on} onChange={setOn} ariaLabel="开屏动画" /></P3ConfigRow>
            <P3ConfigRow label="音量" selected={cfgSel === 2} onFocus={() => setCfgSel(2)}><P3Gauge value={vol} onChange={setVol} ariaLabel="音量" width={120} /></P3ConfigRow>
            <P3ConfigRow label="重置所有数据" danger selected={cfgSel === 3} onFocus={() => setCfgSel(3)}><span className="font-cond text-[18px]">›</span></P3ConfigRow>
            <P3ConfigDesc>{['调整任务结算的倍率；随时可改，不影响已结算的记录。', '冷启动时播放所选开屏动画。', '0 为静音；声音只在交互时出现。', '清空本机全部数据，需二次确认。'][cfgSel]}</P3ConfigDesc>
          </div>
        </Sec>

        <Sec title="光标楔 / 暂停菜单" en="SELECT WEDGE">
          <div className="grid gap-6 wide:grid-cols-2">
            <P3MenuList items={[{ id: 'skill', label: '技能', en: 'SKILL' }, { id: 'item', label: '道具', en: 'ITEM' }, { id: 'persona', label: '人格面具', en: 'PERSONA' }, { id: 'social', label: '社群', en: 'SOCIAL LINK' }, { id: 'sys', label: '系统', en: 'SYSTEM', disabled: true }]} onSelect={(id) => toast(`选择了 ${id}`)} />
            <div className="relative h-16 w-64"><SelectWedge className="inset-0" /><span className="relative flex h-full items-center pl-6 font-heavy text-[24px]" style={{ color: 'var(--p3r-mulberry)' }}>单独的光标楔</span></div>
          </div>
        </Sec>

        <Sec title="系统确认框" en="DIALOG">
          <Row>
            <P3Button tone="soft" onClick={() => setDlg('default')}>默认</P3Button>
            <P3Button tone="soft" onClick={() => setDlg('danger')}>危险</P3Button>
            <P3Button tone="soft" onClick={() => setDlg('warning')}>警告 warning</P3Button>
            <P3Button tone="soft" onClick={() => setDlg('three')}>三选项</P3Button>
            <P3Button tone="soft" onClick={() => setDlg('system')}>系统框形态</P3Button>
            <P3Button tone="soft" onClick={() => setDlg('busy')}>忙碌 busy</P3Button>
          </Row>
          <P3Dialog open={dlg === 'default'} onClose={() => setDlg(null)} title="保存这条记录？" description="保存后会计入今日属性点。" onConfirm={() => { setDlg(null); toast.success('已保存'); }} />
          <P3Dialog open={dlg === 'danger'} tone="danger" onClose={() => setDlg(null)} title="确认删除这条记录？" description={'删除后无法恢复。\n关联的图片也会一并移除。'} confirmText="删除" onConfirm={() => { setDlg(null); toast.error('已删除'); }} />
          <P3Dialog open={dlg === 'warning'} tone="warning" onClose={() => setDlg(null)} title="温馨提示" description="添加更高等级后，现有称号会顺延。" confirmText="继续添加" onConfirm={() => setDlg(null)} />
          <P3Dialog open={dlg === 'three'} onClose={() => setDlg(null)} title="导入备份" description="本机已有数据，要怎么处理？"
            actions={[{ label: '合并', tone: 'primary', onClick: () => setDlg(null) }, { label: '覆盖本机', tone: 'danger', onClick: () => setDlg(null) }, { label: '取消', onClick: () => setDlg(null) }]} />
          <P3Dialog open={dlg === 'system'} variant="system" onClose={() => setDlg(null)} title="要离开了吗？" description="这次谈话会保留在归档库里。"
            actions={[{ label: '留下来', onClick: () => setDlg(null) }, { label: '归档并离开', tone: 'primary', onClick: () => setDlg(null) }, { label: '直接离开', tone: 'danger', onClick: () => setDlg(null) }]} />
          <P3Dialog open={dlg === 'busy'} tone="danger" busy busyText="正在删除…" onClose={() => setDlg(null)} title="永久删除云端账号？" description="（busy 中：遮罩 / ESC / 取消全部锁定，3 秒后自动关闭）" confirmText="删除" />
          {dlg === 'busy' && <AutoClose ms={3000} onDone={() => setDlg(null)} />}
        </Sec>

        <Sec title="抽屉 / 菜单 / 提示" en="SHEET · ACTION SHEET · TOAST">
          <Row>
            <P3Button tone="soft" onClick={() => setSheet('bottom')}>底部抽屉（下滑关）</P3Button>
            <P3Button tone="soft" onClick={() => setSheet('center')}>居中卡</P3Button>
            <P3Button tone="soft" onClick={() => setSheet('screen')}>全屏子页</P3Button>
            <P3Button tone="soft" onClick={() => setSheet('busy')}>抽屉 busy</P3Button>
            <P3Button tone="soft" onClick={() => setAs(true)}>ActionSheet</P3Button>
            <P3Button tone="soft" onClick={() => toast('信息提示')}>Toast</P3Button>
            <P3Button tone="soft" onClick={() => toast.success('记账完成')}>Toast 成功</P3Button>
            <P3Button tone="soft" onClick={() => toast.error('网络异常，稍后再试')}>Toast 报错</P3Button>
            <P3Button tone="soft" onClick={() => setLb(true)}>灯箱</P3Button>
          </Row>
          <P3Sheet open={sheet === 'bottom' || sheet === 'busy'} busy={sheet === 'busy'} onClose={() => setSheet(null)} title="记录一件事" en="RECORD"
            footer={<P3Button block corner busy={sheet === 'busy'} busyText="提交中…" onClick={() => setSheet(null)}>保存</P3Button>}>
            <div className="space-y-4">
              <P3Field label="做了什么" required count="0/40"><P3Input placeholder="例如：读完一章书" /></P3Field>
              <P3Field label="属性"><P3Select defaultValue="k"><option value="k">知识</option><option value="c">勇气</option><option value="e">灵巧</option></P3Select></P3Field>
              <P3Field label="备注" hint="可选"><P3Textarea placeholder="写点什么…" /></P3Field>
              <P3Field label="时长"><P3Stepper value={step} onChange={setStep} unit="h" /></P3Field>
              <P3Check checked={chk} onChange={setChk} label="分享到据点" />
            </div>
          </P3Sheet>
          <P3Sheet open={sheet === 'center'} position="center" onClose={() => setSheet(null)} title="设定本周目标" en="WEEKLY">
            <p className="text-[14px]" style={{ color: P3R.inkSoft }}>居中卡：斜切四边、scale .95 + 斜向位移弹入。</p>
            <P3Button className="mt-4" block onClick={() => setSheet(null)}>确定</P3Button>
          </P3Sheet>
          <P3Sheet open={sheet === 'screen'} size="screen" onClose={() => setSheet(null)} title="账号管理" en="ACCOUNT">
            <div className="space-y-2">{['修改昵称', '更换头像', '绑定邮箱', '退出登录'].map((x, i) => <P3ListRow key={x} title={x} trailing="chevron" selected={i === 0} onClick={() => toast(x)} />)}</div>
          </P3Sheet>
          <P3ActionSheet open={as} onClose={() => setAs(false)} title="这条任务" description="长按菜单"
            actions={[{ id: 'edit', label: '编辑', icon: <IconEdit size={16} /> }, { id: 'top', label: '置顶', icon: <IconStar size={14} />, desc: '显示在今日任务最上方' }, { id: 'del', label: '删除', tone: 'danger', icon: <IconTrash size={16} /> }]}
            onSelect={(id) => toast(`选择 ${id}`)} />
          <P3Lightbox open={lb} onClose={() => setLb(false)} images={[tarotAsset('cups_3.webp'), tarotAsset('wands_1.webp'), tarotAsset('swords_7.webp')]} captions={['圣杯三', '权杖一', '宝剑七']} />
        </Sec>

        <Sec title="台词框 / 面板" en="SPEECH · CARDS">
          <div className="grid gap-5 wide:grid-cols-2">
            <P3Speech speaker="NAVIGATOR">今天的星象很温柔。要不要先从一件小事开始？</P3Speech>
            <P3Speech speaker="同伴 · 恋人" side="right" more={false}>我会在你身边。</P3Speech>
            <P3SlantCard><div className="font-heavy text-[18px]">斜切面板 panel</div><p className="mt-1 text-[13px]" style={{ color: P3R.inkSoft }}>tone: panel / glass / blush / ink / rose</p></P3SlantCard>
            <P3SlantCard tone="ink"><div className="font-heavy text-[18px]">墨色面板 ink</div><p className="mt-1 text-[13px] opacity-75">强调块 / 选中态</p></P3SlantCard>
            <P3ChamferCard><div className="pl-6 font-heavy text-[18px]">切角卡 ChamferCard</div><p className="mt-1 pl-6 text-[13px]" style={{ color: P3R.inkSoft }}>玫红角 + 双层错位</p></P3ChamferCard>
            <P3StackSlab layers={3}><div className="font-heavy text-[18px]">层叠斜板 StackSlab</div><p className="mt-1 text-[13px]" style={{ color: P3R.inkSoft }}>后层 8px 错位，可三层</p></P3StackSlab>
          </div>
          <Cap>Check Status 队伍行</Cap>
          <div className="grid gap-1.5 wide:grid-cols-2">
            <P3ListRow eyebrow="MAGICIAN · RANK 4" title="早起 · 晨读二十分钟" meta="连续 6 天" value={6} valueLabel="DAY" progress={0.6} trailing="chevron" onClick={() => {}} />
            <P3ListRow eyebrow="LOVERS · RANK 7" title="和朋友吃晚饭" meta="本周一次" value={7} valueLabel="RANK" selected accent="var(--p3r-cyan)" />
          </div>
        </Sec>

        <Sec title="进度 / 标签 / 头像" en="PROGRESS · TAG · AVATAR">
          <div className="max-w-md space-y-3">
            <P3Progress value={0.64} />
            <P3Progress value={7} max={10} variant="segments" />
            <Row><P3Progress variant="ring" value={0.4} label="40%" /><P3Progress variant="ring" value={0.85} size={72} color="var(--p3r-cyan)" label="85" /></Row>
          </div>
          <Row className="mt-4">
            <P3Tag tone="rose">玫红</P3Tag><P3Tag>樱粉</P3Tag><P3Tag tone="ink">墨</P3Tag><P3Tag tone="lilac">藕紫</P3Tag><P3Tag tone="coral">临期 3 天</P3Tag><P3Tag tone="gold">稀有</P3Tag><P3Tag tone="outline">描边</P3Tag><P3Tag tone="soft" onRemove={() => {}}>可移除</P3Tag>
          </Row>
          <Row className="mt-4"><P3Avatar name="雪" /><P3Avatar name="葵" tone="lilac" ring /><P3Avatar name="月" tone="ink" size={56} /><P3Avatar src={tarotAsset('cups_14.webp')} name="卡" size={56} ring /></Row>
        </Sec>

        <Sec title="空 / 加载 / 报错" en="STATES">
          <div className="grid gap-4 wide:grid-cols-3">
            <P3Empty sub="新建一条任务，今天就从这里开始" action={<P3Button size="sm" leading={<IconPlus size={14} />}>新建</P3Button>} />
            <div style={{ background: P3R.panelGlass }}><P3Loading /></div>
            <P3Error text="解读服务暂时无法连接，请检查网络。" onRetry={() => toast('重试')} />
          </div>
          <Cap>骨架行</Cap>
          <P3Loading block rows={2} className="max-w-md" />
        </Sec>

        <Sec title="页头" en="PAGE HEADER">
          <div className="relative overflow-hidden p-4" style={{ background: P3R.panelGlass }}>
            <P3PageHeader title="账号与数据" en="ACCOUNT" onBack={() => {}} subtitle="360–390 视口自动 compact（标题 34px）" />
            <P3PageHeader title="很长很长的页面标题会截断" en="COMPACT" compact ticks={false} ghost={false} actions={<P3IconButton label="更多"><IconMore size={18} /></P3IconButton>} />
          </div>
        </Sec>

        <Sec title="塔罗牌面" en="TAROT">
          <Row>
            <TarotFace src={tarotAsset('cups_3.webp')} name="圣杯三" width={96} />
            <TarotFace name="恋人" roman="VI" en="THE LOVERS" width={96} glow />
            <TarotFace name="月亮" roman="XVIII" en="THE MOON" width={96} reversed />
            <TarotFace back width={96} />
            <ShatteredStar className="w-[110px]" />
          </Row>
        </Sec>

        <Sec title="演出 FX" en="FX">
          <Row>
            <P3Button onClick={() => setCutin('check')}>Cut-in 斜带（今日完成）</P3Button>
            <P3Button tone="soft" onClick={() => setCutin('star')}>Cut-in（碎裂星）</P3Button>
            <P3Button tone="soft" onClick={() => setSweep(true)}>-12° 斜带横扫</P3Button>
            <P3Button tone="soft" onClick={(e: React.MouseEvent<HTMLButtonElement>) => { const r = (e.target as HTMLElement).getBoundingClientRect(); setRipple({ x: r.left + r.width / 2, y: r.top + r.height / 2 }); }}>水波 → 玫红光圈</P3Button>
            <P3Button tone="soft" onClick={() => setWave(true)}>三斜板切幕</P3Button>
            <P3Button tone="soft" onClick={() => setBurst(true)}>樱瓣迸散</P3Button>
          </Row>
          <CutInBand open={!!cutin} onClose={() => setCutin(null)} eyebrow="TODAY CLEAR" title={cutin === 'star' ? '技能解锁！' : '今日完成！'} sub="+12 PTS · 知识" ghost="CLEAR" visual={cutin ?? 'check'} autoCloseMs={3200} />
          <CutInSweep active={sweep} text="RANK UP" sub="恋人 · 7" onDone={() => setSweep(false)} />
          <RippleIris active={!!ripple} origin={ripple} onDone={() => setRipple(null)} />
          <WaveSlice active={wave} onDone={() => setWave(false)} />
          <PetalBurst active={burst} onDone={() => setBurst(false)} />
          <Cap>Logo 逐字揭示</Cap>
          <div className="relative overflow-hidden p-5" style={{ background: P3R.panelGlass }}>
            <LogoReveal replayKey={logoKey} sub="面具庭园" size="clamp(40px, 11vw, 84px)" touch />
            <div className="mt-4 flex justify-end"><P3Button size="sm" tone="soft" onClick={() => setLogoKey((k) => k + 1)}>重播</P3Button></div>
          </div>
          <Cap>模拟 AI 引擎（思考 2.4s → 逐字；出错 / 截断 / 续写 / 跳过；低动效直接全文）</Cap>
          <Row className="mb-2">
            {(['none', 'error', 'midError', 'truncate', 'offline', 'nokey'] as AIFail[]).map((f) => (
              <P3Button key={String(f)} size="sm" tone={fail === f ? 'primary' : 'soft'} onClick={() => { setFail(f); setAiKey((k) => k + 1); }}>{String(f)}</P3Button>
            ))}
          </Row>
          <AIDemo key={`ai-${aiKey}`} fail={fail} />
          <Cap>分层入场 Stagger</Cap>
          <P3Stagger key={`st-${logoKey}`} className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => <P3StaggerItem key={i}><div className="h-12" style={{ background: P3R.cyanPale, clipPath: 'polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)' }} /></P3StaggerItem>)}
          </P3Stagger>
        </Sec>

        <Sec title="外壳" en="SHELL">
          <Row>
            <P3Button tone="soft" onClick={(e: React.MouseEvent<HTMLButtonElement>) => { const r = (e.target as HTMLElement).getBoundingClientRect(); openWheel({ x: window.innerWidth / 2, y: Math.min(window.innerHeight - 40, r.bottom + 260) }, false); }}>打开轮盘（点选模式）</P3Button>
            <P3Button tone="soft" onClick={() => openAssistant()}>打开助手（占位）</P3Button>
            <P3Button tone="soft" onClick={() => { window.location.hash = '#/p/dashboard'; }}>看外壳（首页）</P3Button>
          </Row>
          <div className="relative mt-4 h-[260px] overflow-hidden" style={{ background: P3R.panelGlass }}><HomeHeroDecor /></div>
        </Sec>
      </div>
    </div>
  );
}

function AutoClose({ ms, onDone }: { ms: number; onDone: () => void }) {
  useEffect(() => { const t = window.setTimeout(onDone, ms); return () => clearTimeout(t); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function AIDemo({ fail }: { fail: AIFail }) {
  const ai = useAIStream({ text: READING, fail });
  return (
    <div className="min-h-[180px] p-4" style={{ background: P3R.panel, clipPath: 'polygon(12px 0,100% 0,calc(100% - 12px) 100%,0 100%)' }}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <P3Tag tone="ink">{ai.phase}</P3Tag>
        {ai.phase === 'idle' && <P3Button size="sm" onClick={ai.start}>开始解读</P3Button>}
        {(ai.phase === 'thinking' || ai.phase === 'streaming') && <><P3Button size="sm" tone="soft" onClick={ai.skip}>跳过</P3Button><P3Button size="sm" tone="soft" onClick={ai.abort}>中断</P3Button></>}
        {(ai.phase === 'truncated' || ai.phase === 'aborted') && <P3Button size="sm" onClick={ai.resume}>{ai.phase === 'truncated' ? '接着写' : '恢复'}</P3Button>}
        {ai.phase === 'error' && <P3Button size="sm" onClick={ai.retry}>重试</P3Button>}
        {ai.phase !== 'idle' && <P3Button size="sm" tone="ghost" onClick={ai.reset}>重置</P3Button>}
      </div>
      {ai.phase === 'thinking' && <AIThinking label="解读者正在思索" sub="约 2.4 秒" />}
      {ai.phase === 'nokey' && <P3Error title="尚未配置 AI 服务" text="去 设置 → AI 服务 填入密钥后再来。" />}
      {ai.phase === 'error' && <div className="mb-2 text-[13px] font-bold" style={{ color: 'var(--p3r-coral-ink)' }}>{ai.error?.message}</div>}
      {ai.phase === 'truncated' && <div className="mb-2 text-[13px] font-bold" style={{ color: P3R.lilacInk }}>{ai.error?.message}</div>}
      {ai.phase !== 'thinking' && ai.phase !== 'nokey' && <AIText ai={ai} />}
    </div>
  );
}
