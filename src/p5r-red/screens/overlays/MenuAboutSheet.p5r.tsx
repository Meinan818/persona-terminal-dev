/**
 * 菜单 ·「关于」Sheet（真实 src/pages/Menu.tsx aboutOpen：打开即 checkForUpdate；有新版本时版本号变强调色 + 红点「有新版本 vX · 去看看 ›」外链 B 站动态）。
 * 视觉迁移自 v3 overlays/b.js P5.openAbout：红面具 logo + MASKARIA 剪报 + JRPG Growth Tracker + 版本行 + 作者 / GitHub 信息行 + 寄语。
 *   ?state=checking（默认：1.2s 后自动转 update）| update（有新版本）| latest（已是最新）——真实无更新时只显示版本号，不额外写字
 * 顶部 DEMO 状态条为 v3 演示件（?__dev=0 隐藏），接入时去掉。
 */
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@/p5r-red/registry/types';
import { P5Sheet } from '@/p5r-red/kit/P5Sheet';
import { P5Ransom } from '@/p5r-red/kit/P5Ransom';
import { toast } from '@/p5r-red/kit/P5Toast';
import { usePrefs } from '@/p5r-red/lib/prefs';

type St = 'checking' | 'update' | 'latest';
const STATES: [St, string][] = [['checking', '检查更新中'], ['update', '有新版本'], ['latest', '已是最新']];

export default function MenuAboutSheet({ open, onClose, params }: OverlayProps) {
  const st0 = (params?.get('state') as St) || 'checking';
  const [st, setSt] = useState<St>(st0);
  const dev = !usePrefs().devHidden;
  useEffect(() => { if (!open) return; setSt(st0); if (st0 !== 'checking') return; const t = setTimeout(() => setSt((s) => (s === 'checking' ? 'update' : s)), 1200); return () => clearTimeout(t); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <P5Sheet open={open} onClose={onClose} title="关于" seed={461} className="ob-sheet">
      {dev && <div className="ob-demo" role="tablist" aria-label="演示状态"><span>DEMO 状态</span>{STATES.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={st === k} onClick={() => setSt(k)}>{l}</button>)}</div>}
      <div className="ob-sbody">
        <div className="ob-about">
          {/* 素材插槽：应用图标 slots/theme-icons/red.png（真实仓库 public/theme-icons/red.png 同名；默认 = 照原作图标构图的 SVG 重画渲染图，同名覆盖即换真图） */}
          <div className="ob-about-logo"><img src="slots/theme-icons/red.png" width={88} height={88} alt="MASKARIA" draggable={false} style={{ display: 'block', width: 88, height: 88, borderRadius: 16 }} /></div>
          <div className="ob-about-n"><P5Ransom text="MASKARIA" h={34} seed={9} /></div>
          <p className="ob-about-s">JRPG Growth Tracker</p>
          {st === 'update'
            ? <button type="button" className="ob-upd" aria-label="当前 v2.8.14，有新版本 v2.9.0，去 B 站动态看看" onClick={() => toast('外链：B 站动态（安卓包发布处）')}><span>v2.8.14</span><b><i />有新版本 v2.9.0 · 去看看 ›</b></button>
            : <p className="ob-ver" aria-busy={st === 'checking'}>v2.8.14</p>}
          <dl className="ob-about-t">
            <div><dt>作者</dt><dd>Meinan818</dd></div>
            <div><dt>GitHub</dt><dd><button type="button" className="ob-link" onClick={() => toast('外链：github.com/Meinan818/Persona-Terminal')}>@Meinan818</button></dd></div>
          </dl>
          <p className="ob-about-q">100%用爱发电，用得习惯欢迎点个star</p>
          <p className="ob-about-q en">I am thou, thou art I...</p>
        </div>
      </div>
    </P5Sheet>
  );
}
