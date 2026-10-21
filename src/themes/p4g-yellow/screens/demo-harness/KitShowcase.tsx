/** #/__kit —— kit 全组件展示（截图自查 / 页面代理参考）。 */
import { useState } from 'react';
import {
  P4Outline, P4Card, P4Button, P4ListRow, P4List, P4Tabs, P4SegmentTabs, P4Chip, P4Badge, P4Input, P4Textarea, P4Select,
  P4Switch, P4Slider, P4Stepper, P4Progress, P4Avatar, P4Sheet, P4Dialog, P4ActionSheet, useToast, P4EmptyState, P4Loading,
  P4ErrorState, P4DataBlock, P4PageHeader, P4DateWeather, P4Stripe, P4Section, P4KeyHint, P4CandyMenu, P4Lightbox, P4ChoiceList,
  WeatherIcon, IconClose, IconPlus, IconStar, IconTrash, IconEdit, IconHeart,
} from '@yellow/kit';
import { CollageStagger, CollageItem, CutInFrame, FogRain, SignalGlitch, TVPowerOff, ChannelNoise, YellowWipe, ScanlineOverlay } from '@yellow/fx';
import { p4gAsset } from '@yellow/lib/asset';
import { toggleMode, toggleLowMotion, usePrefs } from '@yellow/lib/prefs';
import { DevCapsule } from '@yellow/shell/DevCapsule';
import type { P4Weather } from '@yellow/kit';

const WEATHERS: P4Weather[] = ['sunny', 'cloudy', 'rain', 'fog', 'snow', 'thunder', 'night'];

export function KitShowcase() {
  const p = usePrefs();
  const toast = useToast();
  const [tab, setTab] = useState('todos');
  const [seg, setSeg] = useState('week');
  const [sw, setSw] = useState(true);
  const [sl, setSl] = useState(60);
  const [st, setSt] = useState(3);
  const [name, setName] = useState('');
  const [note, setNote] = useState('雾天里也要记得带伞。');
  const [cat, setCat] = useState('food');
  const [menu, setMenu] = useState('equip');
  const [sheet, setSheet] = useState(false);
  const [dlg, setDlg] = useState(false);
  const [as, setAs] = useState(false);
  const [lb, setLb] = useState(false);
  const [lbi, setLbi] = useState(0);
  const [cut, setCut] = useState(false);
  const [fx, setFx] = useState<null | 'wipe' | 'noise' | 'off'>(null);
  const [sel, setSel] = useState(1);
  const now = new Date(2026, 9, 20, 16, 30);

  return (
    <div className="p4g-stage relative min-h-screen pb-24">
      <ScanlineOverlay />
      <div className="mx-auto max-w-page px-4 pt-4 wide:px-8">
        <P4PageHeader title="组件库" en="P4G KIT" date={now} weather="rain" subtitle="Persona 4 Golden 1:1 · 日/夜 · 低动效" actions={
          <><P4Button size="sm" variant="black" onClick={toggleMode}>{p.mode === 'day' ? '夜' : '日'}</P4Button><P4Button size="sm" variant="secondary" onClick={toggleLowMotion}>{p.motion === 'low' ? '低✓' : '低动效'}</P4Button></>
        } />

        <CollageStagger className="grid min-w-0 grid-cols-1 gap-6 wide-lg:grid-cols-2">
          <CollageItem>
            <P4Section title="标题 / 日期天气" en="TYPE & HUD">
              <P4Card padding="md">
                <div className="flex flex-wrap items-end gap-4">
                  <P4Outline size={44}>S.Link</P4Outline>
                  <P4Outline size={40}>羁绊</P4Outline>
                  <P4Outline size={30} italic fill="var(--p4g-yellow)">Rank Up!!</P4Outline>
                </div>
                <div className="mt-4 flex flex-wrap items-start justify-between gap-6">
                  <P4DateWeather date={now} weather="sunny" variant="calendar" />
                  <div className="flex flex-col items-end gap-5 pt-2">
                    <P4DateWeather date={now} weather="rain" />
                    <P4DateWeather date={now} weather="fog" variant="compact" />
                  </div>
                </div>
                <div className="mt-8 flex flex-wrap gap-2">{WEATHERS.map((w) => <WeatherIcon key={w} kind={w} size={36} />)}</div>
              </P4Card>
            </P4Section>
          </CollageItem>

          <CollageItem>
            <P4Section title="S.Link 列表" en="LIST ROW">
              <P4List>
                {['Ryotaro Dojima|Hiero.|Max|10', '雪子|Priestess|Rank 9|9', '千枝 Satonaka|Chariot|Max|10', '奈奈子|Justice|Rank 6|6'].map((s, i) => {
                  const [t, g, e, v] = s.split('|');
                  return <P4ListRow key={t} title={t} tag={g} eyebrow={e} progress={Number(v)} selected={sel === i} onClick={() => setSel(i)} separator={i % 2 ? 'orange' : 'green'} />;
                })}
                <P4ListRow leading={<P4Avatar name="设" size={36} />} title="一个非常非常长的标题用来测试单行省略不会撑破整行布局" subtitle="副标题也可以很长很长，两行之后会被截断，绝不溢出到右边的开关区域外面去" trailing={<P4Switch size="sm" checked={sw} onChange={setSw} aria-label="开关" />} separator="none" />
              </P4List>
            </P4Section>
          </CollageItem>

          <CollageItem>
            <P4Section title="按钮" en="BUTTON">
              <P4Card tone="paper" padding="md">
                <div className="flex flex-wrap gap-3">
                  <P4Button>确认</P4Button>
                  <P4Button variant="secondary">取消</P4Button>
                  <P4Button variant="danger" leading={<IconTrash size={16} />}>删除</P4Button>
                  <P4Button variant="black">开播</P4Button>
                  <P4Button variant="ghost">稍后</P4Button>
                  <P4Button variant="icon" aria-label="添加"><IconPlus size={16} /></P4Button>
                  <P4Button size="sm">小号</P4Button>
                  <P4Button size="lg" trailing={<IconStar size={16} />}>大号按钮</P4Button>
                  <P4Button disabled>禁用</P4Button>
                  <P4Button block variant="black">收进节目单</P4Button>
                </div>
              </P4Card>
            </P4Section>
          </CollageItem>

          <CollageItem>
            <P4Section title="标签 / 分段 / 小件" en="TABS & CHIPS">
              <div className="flex flex-col gap-3">
                <P4Tabs value={tab} onChange={setTab} items={[{ id: 'todos', label: '任务', badge: 3 }, { id: 'activities', label: '记录' }, { id: 'org', label: '组织' }, { id: 'long', label: '很长的标签名字' }]} />
                <P4SegmentTabs value={seg} onChange={setSeg} items={[{ id: 'day', label: '日' }, { id: 'week', label: '周' }, { id: 'month', label: '月' }, { id: 'year', label: '年' }]} />
                <div className="flex flex-wrap items-center gap-2">
                  <P4Chip>Chariot</P4Chip><P4Chip tone="black">Fool</P4Chip><P4Chip tone="yellow" icon={<IconHeart size={12} />}>收藏</P4Chip>
                  <P4Chip tone="outline" selected onClick={() => {}}>运动</P4Chip><P4Chip tone="outline" onClick={() => {}} onRemove={() => {}}>阅读</P4Chip><P4Chip tone="danger">逾期</P4Chip>
                  <span className="relative"><P4Avatar name="千" size={40} ring="orange" /><P4Badge count={12} className="absolute -right-2 -top-2" /></span>
                  <P4Badge label="NEW!" /><P4Badge label="MAX" tone="black" /><P4Badge dot />
                </div>
              </div>
            </P4Section>
          </CollageItem>

          <CollageItem>
            <P4Section title="表单" en="FORM">
              <P4Card tone="paper" padding="md" cut="br">
                <div className="grid grid-cols-1 gap-3">
                  <P4Input label="名称" placeholder="输入任务名称" value={name} onChange={(e) => setName(e.target.value)} hint="最多 20 字" required />
                  <P4Input label="金额" prefix="¥" inputMode="decimal" defaultValue="abc" error="请输入数字" />
                  <P4Select label="分类" value={cat} onChange={(e) => setCat(e.target.value)} options={[{ value: 'food', label: '餐饮' }, { value: 'traffic', label: '交通' }, { value: 'fun', label: '娱乐' }]} />
                  <P4Textarea label="备注" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} showCount />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <P4Switch checked={sw} onChange={setSw} label="夜间提醒" />
                    <P4Stepper value={st} onChange={setSt} min={0} max={9} unit="次" label="次数" />
                  </div>
                  <P4Slider value={sl} onChange={setSl} label="音量" showValue suffix="%" />
                </div>
              </P4Card>
            </P4Section>
          </CollageItem>

          <CollageItem>
            <P4Section title="数据 / 进度" en="STATUS">
              <div className="grid grid-cols-2 gap-3">
                <P4DataBlock label="PLV" value="3" unit="Lv" delta="+1" />
                <P4DataBlock label="NEXT EXP" value="9" tone="yellow" />
                <P4DataBlock label="连续天数" value="128" unit="天" tone="black" size="lg" />
                <P4DataBlock label="本月支出" value="¥12,480" tone="surface" delta="-8%" deltaTone="down" />
              </div>
              <P4Card className="mt-3" padding="sm">
                <div className="grid grid-cols-1 gap-2">
                  <P4Progress variant="hp" value={65} max={94} label="HP" showValue />
                  <P4Progress variant="sp" value={29} max={57} label="SP" showValue />
                  <P4Progress variant="bar" value={42} max={100} showValue />
                  <P4Progress variant="segments" value={7} max={10} />
                </div>
              </P4Card>
            </P4Section>
          </CollageItem>

          <CollageItem>
            <P4Section title="卡片" en="COLLAGE CARD">
              <div className="grid grid-cols-2 gap-4">
                <P4Card tone="surface" tape="left">surface + 胶带</P4Card>
                <P4Card tone="black" cut="br" tilt={1.2}>黑卡 斜切</P4Card>
                <P4Card tone="yellow" cut="both" shadow="lg">黄卡 双切</P4Card>
                <P4Card tone="msg"><span className="text-p4g-yellow">&gt; </span>消息框式卡片</P4Card>
                <P4Card tone="orange" shadow="sm">橙卡</P4Card>
                <P4Card tone="paper" interactive as="button" onClick={() => toast('点到了卡片')}>可点卡片</P4Card>
              </div>
            </P4Section>
          </CollageItem>

          <CollageItem>
            <P4Section title="暂停菜单" en="CANDY MENU">
              <div className="grid grid-cols-[minmax(0,240px)_1fr] gap-3">
                <P4CandyMenu value={menu} onChange={setMenu} items={[
                  { id: 'skill', label: '技能', desc: '查看技能' }, { id: 'item', label: '道具', desc: '使用道具' }, { id: 'equip', label: '装备', desc: '更换/查看装备' },
                  { id: 'persona', label: '人格面具', desc: '查看人格面具' }, { id: 'status', label: '状态', desc: '查看队伍状态' }, { id: 'system', label: '系统', desc: '存档、设置' },
                ]} />
                <div className="flex min-w-0 flex-col gap-3">
                  <P4Card tone="msg" padding="sm"><P4ChoiceList items={[{ id: 'a', label: '加入队伍' }, { id: 'b', label: '移出队伍' }, { id: 'c', label: '取消' }]} onSelect={(id) => toast(`选择 ${id}`)} /></P4Card>
                  <div className="rounded-sm bg-p4g-black p-2"><P4KeyHint items={[{ key: '○', label: '确认' }, { key: '×', label: '返回' }]} /></div>
                </div>
              </div>
            </P4Section>
          </CollageItem>

          <CollageItem>
            <P4Section title="弹层" en="OVERLAYS">
              <P4Card padding="md">
                <div className="flex flex-wrap gap-2">
                  <P4Button size="sm" onClick={() => setSheet(true)}>底部抽屉</P4Button>
                  <P4Button size="sm" onClick={() => setDlg(true)}>确认框</P4Button>
                  <P4Button size="sm" onClick={() => setAs(true)}>ActionSheet</P4Button>
                  <P4Button size="sm" onClick={() => toast.success('收进节目单')}>Toast</P4Button>
                  <P4Button size="sm" onClick={() => toast.error('网络异常，信号中断')}>Toast 错误</P4Button>
                  <P4Button size="sm" onClick={() => { setLbi(0); setLb(true); }}>看大图</P4Button>
                  <P4Button size="sm" variant="black" onClick={() => setCut(true)}>Cut-in</P4Button>
                  <P4Button size="sm" variant="secondary" onClick={() => setFx('wipe')}>黄方块推屏</P4Button>
                  <P4Button size="sm" variant="secondary" onClick={() => setFx('noise')}>跳台噪点</P4Button>
                  <P4Button size="sm" variant="secondary" onClick={() => setFx('off')}>电视关机</P4Button>
                </div>
              </P4Card>
            </P4Section>
          </CollageItem>

          <CollageItem>
            <P4Section title="雾雨 / 信号" en="FX">
              <div className="grid grid-cols-2 gap-3">
                <div className="relative h-36 overflow-hidden rounded-sm border-3 border-p4g-black bg-[#2a2a3a] shadow-hard">
                  <FogRain fog rain />
                  <span className="absolute bottom-2 left-2 p4g-outline-sm font-display text-meta font-bold">FogRain</span>
                </div>
                <SignalGlitch active loop className="rounded-sm border-3 border-p4g-black shadow-hard">
                  <div className="flex h-36 items-center justify-center bg-p4g-yellow font-display text-h3 font-bold text-p4g-black">SignalGlitch</div>
                </SignalGlitch>
              </div>
            </P4Section>
          </CollageItem>

          <CollageItem>
            <P4Section title="状态" en="EMPTY · LOADING · ERROR">
              <div className="grid gap-3 sm:grid-cols-3">
                <P4Card padding="none"><P4EmptyState compact title="节目单还空着" hint="点 + 开播第一期" /></P4Card>
                <P4Card padding="none" className="flex items-center justify-center"><div className="py-8"><P4Loading /></div></P4Card>
                <P4Card padding="none"><P4ErrorState message="网络连接失败" onRetry={() => toast('重试中')} /></P4Card>
              </div>
            </P4Section>
          </CollageItem>

          <CollageItem>
            <P4Section title="分隔条" en="STRIPE">
              <div className="flex flex-col gap-3">
                <P4Stripe variant="hazard" />
                <P4Stripe variant="candy" height={14} />
                <P4Stripe variant="candy-h" height={22} />
                <P4Stripe variant="ribbon" height={20} />
              </div>
            </P4Section>
          </CollageItem>
        </CollageStagger>
      </div>

      <P4Sheet open={sheet} onClose={() => setSheet(false)} title="新建任务" en="NEW QUEST" footer={<P4Button block onClick={() => { setSheet(false); toast.success('收进节目单'); }}>保存</P4Button>}>
        <div className="grid grid-cols-1 gap-3 pt-1">
          <P4Input label="任务名称" placeholder="例如：晨跑 3 公里" />
          <P4Select label="属性" options={[{ value: 'c', label: '勇气' }, { value: 'k', label: '知识' }]} defaultValue="c" />
          <P4Textarea label="备注" rows={3} />
        </div>
      </P4Sheet>
      <P4Dialog open={dlg} onClose={() => setDlg(false)} title="撤下本期？" message="删除后无法恢复，确定要撤下这条记录吗？" confirmText="撤下" cancelText="再想想" danger onConfirm={() => toast('已撤下')} speaker="系统" />
      <P4ActionSheet open={as} onClose={() => setAs(false)} title="晨跑 3 公里" message="选择要进行的操作" actions={[{ id: 'edit', label: '编辑', icon: <IconEdit size={16} /> }, { id: 'pin', label: '置顶' }, { id: 'del', label: '删除', danger: true, icon: <IconTrash size={16} /> }]} onAction={(id) => toast(`操作：${id}`)} />
      <P4Lightbox open={lb} onClose={() => setLb(false)} index={lbi} onIndexChange={setLbi} images={[{ src: p4gAsset('town-day.webp'), caption: '雾中的商店街' }, { src: p4gAsset('town-night.webp'), caption: '雨夜' }, { src: p4gAsset('splash-midnight.webp'), caption: '午夜电视' }]} />
      <CutInFrame open={cut} onClose={() => setCut(false)} eyebrow="SOCIAL STAT UP" title="勇气 UP!!" subtitle="勇气 提升到「豪杰」Lv.4" autoCloseMs={2600} />
      <YellowWipe active={fx === 'wipe'} onDone={() => setFx(null)} />
      <ChannelNoise active={fx === 'noise'} onDone={() => setFx(null)} />
      <TVPowerOff active={fx === 'off'} onDone={() => setFx(null)} />
      <button type="button" aria-label="关闭" className="hidden"><IconClose /></button>
      <DevCapsule />
    </div>
  );
}
