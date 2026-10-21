/** #/__kit：全部 kit 组件 + fx 演示（每个区块标注组件名与原生 API）。 */
import { useState, type ReactNode } from 'react';
import { useWide } from '@/p5r-red/lib/layout';
import { toggleMode, usePrefs } from '@/p5r-red/lib/prefs';
import { P5Stage, defaultStage, P5BgSVG } from '@/p5r-red/fx/bg';
import { SIL_NAMES, P5Sil } from '@/p5r-red/fx/sil';
import { cutIn, cutInTodoDone, starTear, waterNav } from '@/p5r-red/fx/transitions';
import { surprise } from '@/p5r-red/fx/surprise';
import { PersonaRadar } from '@/p5r-red/fx/radar';
import { D } from '@/p5r-red/mock/data';
import { TypeOut } from '@/p5r-red/fx/TypeOut';
import {
  P5Shp, P5Card, P5Button, P5Plate, P5StarIcon, P5SolidStar, P5BurstImg, P5Tag, P5Ransom, P5Mask, P5Strip, P5Field, P5Input, P5Textarea, P5Seg, P5Row,
  P5PageHeader, P5Back, P5Sheet, P5ActionSheet, toast, P5Confirm, P5Empty, P5Loading, P5ErrorBlock, P5OaRough, P5OaStar, P5OaRingStar, P5XGlyph, P5CloseKey, P5OaCollage, useLongPress,
  P5Dialog, P5Switch, P5Stepper, P5StackCarousel,
  P5R, P5Collage, P5CollageTitle, P5SubBar, P5Panel, P5Star, P5Burst, P5Btn, P5Chip, P5Wedge, P5Sparkle, P5StarOutline, P5Dots,
} from '@/p5r-red/kit';

const Sec = ({ name, api, children }: { name: string; api: string; children: ReactNode }) => (
  <section style={{ margin: '0 0 26px' }}>
    <h2 style={{ display: 'inline-block', margin: '0 0 6px', padding: '5px 10px', font: '900 15px/1 var(--f-title)', color: '#111', background: 'var(--p5r-paper)', transform: 'rotate(-1.5deg)', boxShadow: '3px 3px 0 #111' }}>{name}</h2>
    <code style={{ display: 'block', margin: '0 0 10px', font: '700 11px/1.4 var(--f-sans)', color: '#F2E9DA', textShadow: '1px 1px 0 #111' }}>{api}</code>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>{children}</div>
  </section>
);

export function KitShowcase() {
  const wide = useWide();
  const p = usePrefs();
  const [sheet, setSheet] = useState(false), [as, setAs] = useState(false), [cf, setCf] = useState(false), [cf3, setCf3] = useState(false);
  const [seg, setSeg] = useState<'a' | 'b' | 'c'>('a');
  const [dlg, setDlg] = useState(false), [sw, setSw] = useState(true), [stp, setStp] = useState(3);
  const lp = useLongPress(() => toast('长按 500ms 触发'));
  return (
    <>
      <P5Stage stage={defaultStage(wide, { sil: null, seed: 9 })} />
      <main id="view"><div className="page" data-page="__kit">
        <P5PageHeader ransom="KIT" cn="组件展示" sub="src/kit · src/fx —— 原生 P5.ui / P5.shape / fx 的 React 版" seed={11}
          right={<><button className="pg-ic" onClick={toggleMode} aria-label="日夜">{p.mode === 'day' ? '日' : '夜'}</button><a className="pg-back" href="#/__index"><P5StarIcon fill="var(--paper)" stroke="var(--ink)" sw={2} /><span>索引</span></a></>} />

        <Sec name="P5Shp / P5Card" api="<P5Shp kind='torn|quad|cut|plate' seed tone='paper|ink|red'> ← P5.ui.shp">
          {(['paper', 'ink', 'red'] as const).map((t, i) => <P5Shp key={t} kind={(['torn', 'quad', 'cut'] as const)[i]} seed={3 + i} tone={t} style={{ width: 150, height: 90, display: 'grid', placeItems: 'center', font: '900 14px/1 var(--f-title)', color: t === 'paper' ? '#111' : '#F2E9DA' }}>{t} · {(['torn', 'quad', 'cut'] as const)[i]}</P5Shp>)}
          <P5Card seed={21} style={{ width: 180, padding: '18px 16px', color: '#111', font: '900 13px/1.4 var(--f-title)' }}>P5Card（撕边纸卡）</P5Card>
        </Sec>
        <Sec name="真实 kit 对位：P5Collage / P5CollageTitle / P5SubBar" api="components/p5r/kit.tsx（颜色指向 v3 token）">
          <P5Collage size={44} tiles={[{ ch: '菜', bg: P5R.red, fg: P5R.ink, scale: 1.06, rot: -3.5, dy: 0 }, { ch: '单', bg: P5R.paper, fg: P5R.ink, rot: 2.5, dy: 9 }]} />
          <P5CollageTitle text="记录一件事" size={26} /><P5SubBar segs={[{ t: '面具', c: P5R.red }, { t: '庭园' }]} />
        </Sec>
        <Sec name="真实 kit 对位：P5Panel / P5Btn / P5Chip / P5Wedge / P5Star / P5Burst / P5Sparkle / P5StarOutline / P5Dots" api="P5Panel seed jag frame keyline · P5Btn tone · P5Star ring ring2">
          <P5Panel seed={81} jag={9} frame={4} bodyClassName="px-5 py-4" style={{ width: 200 }}><b style={{ font: '900 15px/1.4 var(--f-title)', color: '#111' }}>P5Panel 纸卡</b></P5Panel>
          <P5Btn>P5Btn 红</P5Btn><P5Btn tone="paper" seed={12}>纸面</P5Btn>
          <P5Chip>知识</P5Chip><P5Chip tone="ink">暂无</P5Chip><P5Chip tone="paper">SAT</P5Chip>
          <P5Wedge>今日任务</P5Wedge><P5Wedge tone="paper" starSide="left">人格星象</P5Wedge>
          <P5Star size={34} /><P5Star size={34} fill={P5R.red} ring="#111" ring2={P5R.paper} /><P5Burst size={56} ring={P5R.paper} /><P5Sparkle size={22} color={P5R.paper} /><P5StarOutline size={30} />
          <span style={{ position: 'relative', width: 90, height: 60, background: '#111' }}><P5Dots className="absolute inset-0" color="#8a8580" /></span>
        </Sec>
        <Sec name="P5Button" api="<P5Button tone='red|paper|ink' size='sm|lg' seed> ← P5.ui.btn">
          <P5Button>确认</P5Button><P5Button tone="paper" seed={9}>纸面</P5Button><P5Button tone="ink" seed={11}>墨面</P5Button><P5Button size="sm" seed={12}>小号</P5Button><P5Button size="lg" seed={13}>大号按钮</P5Button>
        </Sec>
        <Sec name="P5Plate / P5StarIcon / P5BurstImg / P5Tag" api="P5.ui.plate / star / burst（素材星爆）/ tag">
          <P5Plate>标题牌</P5Plate><P5Plate fs={16} rot={2}>小牌</P5Plate><P5StarIcon style={{ width: 30, height: 30 }} /><P5SolidStar fill="#111" style={{ width: 30, height: 30 }} />
          <P5BurstImg>NEW</P5BurstImg><P5BurstImg tone="cream" sz={64}>3</P5BurstImg><P5BurstImg tone="ink" sz={50}>!</P5BurstImg>
          <P5Tag>知识+2</P5Tag><P5Tag tone="ink">墨</P5Tag><P5Tag tone="paper">纸</P5Tag><P5Tag tone="line">描边</P5Tag>
        </Sec>
        <Sec name="P5Ransom" api="<P5Ransom text h seed> ← P5.ui.ransom（letters 素材）">
          <P5Ransom text="TAKE YOUR TIME" h={36} seed={3} /><P5Ransom text="SHOWTIME!" h={44} seed={7} />
        </Sec>
        <Sec name="P5OaCollage / P5OaRough / P5OaStar / P5OaRingStar / P5XGlyph / P5CloseKey" api="v3 overlays/a.js 基础件（.oa-*）">
          <P5OaCollage text="今日完成" size={28} />
          <span style={{ position: 'relative', display: 'inline-block', width: 120, height: 70, isolation: 'isolate' }}><P5OaRough seed={301} face="var(--p5r-paper)" jag={6} d={[6, 7]} /></span>
          <P5OaStar size={50} stroke="var(--p5r-paper)" sw={6} rot={12} /><P5OaRingStar size={60} /><P5XGlyph s={24} c="#F2E9DA" />
          <span style={{ position: 'relative', width: 62, height: 62 }}><P5CloseKey variant="star" onClick={() => toast('关闭')} /></span>
          <span style={{ position: 'relative', width: 48, height: 48 }}><P5CloseKey onClick={() => toast('关闭')} /></span>
        </Sec>
        <Sec name="P5Sil（四剪影）/ P5Mask / P5Strip" api="<P5Sil name='leap|point|crouch|cat'> ← P5.sil；<P5Mask/> ← P5.maskHTML">
          {SIL_NAMES.map((n) => <span key={n} style={{ height: 110, display: 'inline-flex', flexDirection: 'column', alignItems: 'center', font: '900 10px/1 var(--f-title)', color: '#F2E9DA' }}><P5Sil name={n} style={{ height: 96, width: 'auto' }} />{n}</span>)}
          <P5Mask w={110} /><P5Mask w={90} tone="white" />
          <span style={{ position: 'relative', width: 200, height: 34 }}><P5Strip style={{ left: 0, top: 0, width: 200, height: 34 }} /></span>
        </Sec>
        <Sec name="P5Field / P5Input / P5Seg / P5Row" api=".fld .inp .seg .row5">
          <P5Shp kind="torn" seed={41} style={{ width: 'min(100%, 340px)', padding: '20px 18px', color: '#111' }}>
            <P5Field label="宣言"><P5Input placeholder="写下你的预告" /></P5Field>
            <P5Field label="备注"><P5Textarea rows={2} placeholder="多行" /></P5Field>
            <P5Seg value={seg} onChange={setSeg} items={[{ id: 'a', label: '单次' }, { id: 'b', label: '计数' }, { id: 'c', label: 'BIG DEAL' }]} />
          </P5Shp>
          <div style={{ width: 'min(100%, 320px)', display: 'flex', flexDirection: 'column', gap: 6 }}><P5Row>普通行</P5Row><P5Row sel seed={4}>选中行（红白反转）</P5Row></div>
        </Sec>
        <Sec name="P5PageHeader / P5Back" api="P5.hdr(ransom, cn, sub, seed, right) / P5.back(to)">
          <div style={{ width: '100%' }}><P5PageHeader ransom="CONFIG" cn="设置" sub="系统 · 外观 · 数据" seed={81} right={<P5Back to="menu" />} /></div>
        </Sec>
        <Sec name="弹层：P5Sheet / P5ActionSheet / P5Confirm / toast / useLongPress" api="P5.sheet / P5.actionSheet / P5.oa.confirm / P5.toast / P5.longPress">
          <P5Button seed={21} onClick={() => setSheet(true)}>抽屉 Sheet</P5Button>
          <P5Button tone="ink" seed={22} onClick={() => setAs(true)}>长按菜单</P5Button>
          <P5Button tone="paper" seed={23} onClick={() => setCf(true)}>确认框（危险·忙碌）</P5Button>
          <P5Button tone="paper" seed={24} onClick={() => setCf3(true)}>确认框（三选项）</P5Button>
          <P5Button seed={25} onClick={() => toast('已保存')}>吐司</P5Button>
          <span {...lp.handlers} className={lp.pressing ? 'pressing' : ''} style={{ padding: '10px 14px', background: '#111', color: '#F2E9DA', font: '900 13px/1 var(--f-title)', touchAction: 'none' }}>按住我 500ms</span>
        </Sec>
        <Sec name="P5Dialog / P5Switch / P5Stepper / P5StackCarousel / TypeOut" api="居中弹窗基座 · .ob-sw 开关 · 步进器 · 横滑轮播 · 逐字">
          <P5Button tone="paper" seed={26} onClick={() => setDlg(true)}>居中弹窗 P5Dialog</P5Button>
          <P5Switch on={sw} onChange={setSw} label="示例开关" /><P5Stepper value={stp} onChange={setStp} min={1} max={9} unit="次" label="目标次数" />
          <div style={{ width: 'min(100%, 340px)' }}><P5StackCarousel id="kit-stack" autoPlayMs={3000}>{['第一张', '第二张', '第三张'].map((t) => <P5Panel key={t} seed={t.length + 3} bodyClassName="px-5 py-6"><b style={{ font: '900 16px/1 var(--f-title)', color: '#111' }}>{t}</b></P5Panel>)}</P5StackCarousel></div>
          <span style={{ maxWidth: 340, padding: '10px 12px', background: 'var(--p5r-paper)', color: '#111', font: '800 13px/1.6 var(--f-sans)' }}><TypeOut text="这一周你在「知识」上推进了三次，最难的那件事已经开了头。" /></span>
        </Sec>
        <Sec name="状态：P5Empty / P5Loading / P5ErrorBlock" api="overlays/a.js emptyHTML（EmptyState 基座）">
          <div style={{ width: 'min(100%, 380px)' }}><P5Empty text="还没有任务，添加一个开始吧" seed={1} /><P5Empty icon="📭" text="没有符合条件的记录" hint="试试调整或清除筛选条件" action="清除筛选" onAction={() => toast('已清除筛选')} seed={4} /><P5ErrorBlock detail="TypeError: demo" onRetry={() => toast('重试')} /></div>
          <P5Loading />
        </Sec>
        <Sec name="转场 / Cut-in / 惊喜" api="fx/transitions: waterNav · starTear · cutIn · cutInTodoDone；fx/surprise: surprise(kind)">
          <P5Button seed={31} onClick={(e) => waterNav({ x: e.clientX, y: e.clientY }, () => null)}>水波纹</P5Button>
          <P5Button tone="ink" seed={32} onClick={() => starTear(() => {})}>星形反撕</P5Button>
          <P5Button tone="paper" seed={33} onClick={() => cutInTodoDone('晨跑 5 公里', '胆量 +2')}>今日完成 Cut-in</P5Button>
          <P5Button seed={34} onClick={() => cutIn('<div class="cut-panel"><div class="cut-rings"></div><div class="cut-strip"><b>基座</b><span>cutIn(cardHTML)</span><em>+1</em></div></div>')}>Cut-in 基座</P5Button>
          {(['card', 'sil', 'mask', 'tear', 'slash'] as const).map((k, i) => <P5Button key={k} size="sm" tone="ink" seed={40 + i} onClick={() => surprise(k)}>惊喜 {k}</P5Button>)}
        </Sec>
        <Sec name="舞台 P5BgSVG / defaultStage + 人格星象 PersonaRadar" api="P5.bgSVG / P5.defaultStage / P5.radarHTML">
          <div style={{ width: 220, height: 140, position: 'relative', overflow: 'hidden', outline: '3px solid #111' }}><P5BgSVG seed={21} fx={300} fy={520} /></div>
          <div style={{ width: 220, height: 140, position: 'relative', overflow: 'hidden', outline: '3px solid #111' }}><P5BgSVG seed={31} /></div>
          <div className="h-radar" style={{ width: 'min(100%, 380px)' }}><PersonaRadar attrs={D.attrs} maxLevel={D.maxLevel} /></div>
        </Sec>
      </div></main>
      <P5Dialog open={dlg} onClose={() => setDlg(false)} title="温馨提示" icon="✦" description="P5Dialog = ConfirmDialog 的壳，可放任意内容与按钮行。" footer={<button className="oa-cf-b red" onClick={() => setDlg(false)}>知道了</button>} />
      <P5Sheet open={sheet} onClose={() => setSheet(false)} title="主题" seed={31}><p className="sh-p" style={{ margin: 0, font: '800 14px/1.6 var(--f-sans)' }}>红闸门擦过 + 纸面 spring 300/26。点遮罩或 ✕ 关闭。</p></P5Sheet>
      <P5ActionSheet open={as} title="晨跑 5 公里" onClose={() => setAs(false)} actions={[{ label: '编辑', onClick: () => toast('编辑') }, { label: '归档', onClick: () => toast('归档') }, { label: '删除', tone: 'danger', onClick: () => toast('删除') }]} />
      <P5Confirm open={cf} onClose={() => setCf(false)} title="删除这个任务？" description={'「晨跑 5 公里」会连同它的完成记录一起删除。\n此操作无法撤销。'} tone="danger" confirmText="删除" busyMs={900} onConfirm={() => toast('已删除')} />
      <P5Confirm open={cf3} onClose={() => setCf3(false)} title="发现本地已有数据" description="这份备份要怎么处理？" icon="📦" actions={[{ label: '合并', tone: 'primary', onClick: () => toast('已合并') }, { label: '覆盖', tone: 'danger', onClick: () => toast('已覆盖') }, { label: '取消', onClick: () => {} }]} />
    </>
  );
}
