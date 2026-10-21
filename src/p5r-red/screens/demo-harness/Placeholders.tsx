/** 未移植页面 / 弹层的占位卡（读 inventory / fxCatalog：标题、真实文件、demo 文件、所属工作包）。 */
import { invById } from '@/p5r-red/inventory';
import { fxById } from '@/p5r-red/fxCatalog';
import { pkgOf } from '@/p5r-red/inventorySplit';
import { P5Shp } from '@/p5r-red/kit/P5Shp';
import { P5Plate } from '@/p5r-red/kit/P5Plate';
import { P5Ransom } from '@/p5r-red/kit/P5Ransom';

const Dt = ({ children }: { children: string }) => <dt style={{ font: '900 11px/1.6 var(--f-title)', color: '#D7000F' }}>{children}</dt>;
export function TodoCard({ id, kind = '页面' }: { id: string; kind?: string }) {
  const it = invById(id) ?? invById(`${id}-page`);
  const fx = fxById(id);
  const title = it?.title ?? fx?.title ?? id;
  return (
    <div style={{ padding: '40px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
      <P5Ransom text="TODO" h={44} seed={5} />
      <P5Shp kind="torn" seed={13} tone="paper" style={{ width: 'min(520px, 100%)', padding: '26px 22px', color: '#111' }}>
        <P5Plate fs={18}>{kind}待移植 · {title}</P5Plate>
        <dl style={{ margin: '16px 0 0', font: '800 13px/1.7 var(--f-sans)' }}>
          <Dt>ID</Dt><dd style={{ margin: 0 }}><code>{id}</code></dd>
          {it && <>
            <Dt>工作包</Dt><dd style={{ margin: 0 }}>pkg{pkgOf(it.id) ?? '?'} · {it.group} · {it.kind}</dd>
            <Dt>真实文件</Dt><dd style={{ margin: 0 }}>{it.realPath}</dd>
            <Dt>demo 文件</Dt><dd style={{ margin: 0 }}>{it.demoFile}</dd>
          </>}
          {fx && <>
            <Dt>演出</Dt><dd style={{ margin: 0 }}>pkg{fx.pkg} · 约 {(fx.ms / 1000).toFixed(1)}s · v3：{fx.v3}</dd>
            <Dt>真实文件</Dt><dd style={{ margin: 0 }}>{fx.realPath}</dd>
          </>}
          {!it && !fx && <dd style={{ margin: 0 }}>不在 INVENTORY / fxCatalog 清单里</dd>}
          <Dt>v3 原生参考</Dt><dd style={{ margin: 0 }}>/workspace/work/p5r（INVENTORY.md 按真实文件名查对应 overlays/a–d.js / pages/*.js）</dd>
        </dl>
      </P5Shp>
    </div>
  );
}
