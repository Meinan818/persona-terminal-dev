/** 未登记占位：页面 / 弹窗 / 演出都显示「待实现」卡（列出清单里的真实文件、入口、对照画面、所属包）。 */
import { INVENTORY, PKG_NAMES } from '@blue/inventory';
import { P3R, P3PageHeader, P3StackSlab, P3Tag, P3Button, GhostWords } from '@blue/kit';
import { BlueHeroDecor } from '@blue/fx/motifs';

const findItems = (key: string) => INVENTORY.filter((i) => i.route.includes(`/${key}?`) || i.route.endsWith(`/${key}`) || i.id === key);

export function TodoCard({ id, kind = '页面' }: { id: string; kind?: string }) {
  const hits = findItems(id);
  const first = hits[0];
  return (
    <div className="relative mx-auto max-w-xl py-6">
      <P3StackSlab layers={3} padding="lg">
        <div className="flex items-center gap-2"><P3Tag tone="coral">TODO</P3Tag><span className="font-cond text-[12px]" style={{ color: P3R.grey }}>{kind} · #{id}</span></div>
        <h2 className="mt-2 font-heavy text-[24px] leading-tight" style={{ color: P3R.ink }}>{first?.title ?? '未登记'}</h2>
        {first ? (
          <dl className="mt-3 space-y-1.5 text-[13px]" style={{ color: P3R.inkSoft }}>
            <div><dt className="inline font-black" style={{ color: P3R.ink }}>真实文件 </dt><dd className="inline break-all">{first.realPath}</dd></div>
            {first.entry && <div><dt className="inline font-black" style={{ color: P3R.ink }}>真实入口 </dt><dd className="inline">{first.entry}</dd></div>}
            <div><dt className="inline font-black" style={{ color: P3R.ink }}>对照 P3R </dt><dd className="inline">{first.p3r}</dd></div>
            <div><dt className="inline font-black" style={{ color: P3R.ink }}>demo 文件 </dt><dd className="inline break-all">{first.demoFile}</dd></div>
            <div><dt className="inline font-black" style={{ color: P3R.ink }}>工作包 </dt><dd className="inline">{PKG_NAMES[first.pkg - 1]}</dd></div>
            {hits.length > 1 && <div className="pt-1 text-[12px]" style={{ color: P3R.grey }}>同一登记 key 还承载 {hits.length - 1} 个阶段 / 变体：{hits.slice(1, 6).map((h) => h.title).join('、')}{hits.length > 6 ? '…' : ''}</div>}
          </dl>
        ) : <p className="mt-2 text-[13px]" style={{ color: P3R.grey }}>清单里没有这个 key——检查路由拼写。</p>}
        <P3Button className="mt-5" size="sm" tone="ink" onClick={() => { window.location.hash = '#/__index'; }}>回索引</P3Button>
      </P3StackSlab>
    </div>
  );
}

export function DashboardPlaceholder() {
  return (
    <div className="relative min-h-[70vh]">
      <BlueHeroDecor />
      <div className="relative pt-[220px]">
        <GhostWords words={['MASKARIA']} className="left-0 top-[150px] text-[72px]" />
        <P3PageHeader title="首页" en="DASHBOARD · TODO" ghost={false} subtitle="DashboardP3 待实现（工作包 P1）。底部胶囊「索引」可进入全部界面清单。" />
        <P3Button tone="primary" corner onClick={() => { window.location.hash = '#/__index'; }}>打开索引</P3Button>
      </div>
    </div>
  );
}
