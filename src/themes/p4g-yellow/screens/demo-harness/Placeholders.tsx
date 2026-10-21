/** 占位：未登记页面 / 弹窗显示"待实现"卡；首页未登记时显示外壳演示用 Dashboard 占位。 */
import { P4Card, P4PageHeader, P4Section, P4DataBlock, P4ListRow, P4List, P4Button, P4Stripe } from '@yellow/kit';
import { navigate, openAssistant, openWheel } from '@yellow/shell/shellBus';
import { CollageStagger, CollageItem } from '@yellow/fx';

export function TodoCard({ id, kind = '页面' }: { id: string; kind?: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center py-10">
      <P4Card tone="msg" cut="br" tape="left" padding="lg" className="w-full max-w-md">
        <div className="font-display text-2xs font-bold uppercase tracking-[0.24em] text-p4g-yellow">NOW PREPARING</div>
        <div className="mt-1 font-display text-h2 font-bold">待实现</div>
        <div className="mt-2 text-body opacity-90"><span className="text-p4g-yellow">&gt; </span>{kind} <code className="rounded-xs bg-black/40 px-1.5 py-0.5 text-p4g-yellow">{id}</code> 还没有登记到注册表（src/registry/{kind === '页面' ? 'pages' : 'overlays'}.pkgN.ts）。</div>
        <div className="mt-4 flex gap-2">
          <P4Button size="sm" onClick={() => navigate('dashboard')}>回首页</P4Button>
          <P4Button size="sm" variant="secondary" onClick={() => { window.location.hash = '#/__index'; }}>索引</P4Button>
        </div>
      </P4Card>
    </div>
  );
}

/** 首页占位（Dashboard 由工作包登记后自动替换）。展示外壳 + kit 组合效果。 */
export function DashboardPlaceholder() {
  return (
    <>
      <P4PageHeader title="首页" en="DASHBOARD · 占位" weather="rain" subtitle="今天也要在雾里找到真相。" />
      <CollageStagger className="grid min-w-0 grid-cols-1 gap-4 wide-lg:grid-cols-2">
        <CollageItem>
          <P4Section title="今日节目单" en="TODAY'S PROGRAM">
            <P4List>
              <P4ListRow eyebrow="Rank 8" tag="Chariot" title="晨跑 3 公里" progress={8} />
              <P4ListRow eyebrow="Rank 6" tag="Moon" title="读完《雾中小镇》第 4 章" progress={6} selected separator="orange" />
              <P4ListRow eyebrow="Max" tag="Hiero." title="给家里打电话" progress={10} separator="orange" />
            </P4List>
          </P4Section>
        </CollageItem>
        <CollageItem tilt={-0.6}>
          <P4Section title="五维人格" en="SOCIAL STATS">
            <div className="grid grid-cols-2 gap-3">
              <P4DataBlock label="勇气 COURAGE" value="4" unit="Lv" delta="+1" />
              <P4DataBlock label="知识 KNOWLEDGE" value="5" unit="Lv" tone="yellow" />
              <P4DataBlock label="连续天数" value="12" unit="天" tone="black" />
              <P4DataBlock label="本月支出" value="¥3,280" tone="surface" delta="-8%" deltaTone="down" />
            </div>
          </P4Section>
        </CollageItem>
        <CollageItem className="wide-lg:col-span-2">
          <P4Card tone="black" cut="both" padding="md">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-body font-bold text-p4g-yellow">外壳事件</span>
              <P4Button size="sm" onClick={() => openAssistant()}>openAssistant()</P4Button>
              <P4Button size="sm" variant="secondary" onClick={() => openWheel()}>openWheel()</P4Button>
              <P4Button size="sm" variant="secondary" onClick={() => navigate('ledger')}>navigate('ledger')</P4Button>
              <P4Button size="sm" variant="secondary" onClick={() => navigate('settings', undefined, { transition: 'noise' })}>跳台 → 设置</P4Button>
            </div>
          </P4Card>
        </CollageItem>
      </CollageStagger>
      <P4Stripe className="mt-6" variant="hazard" />
    </>
  );
}
