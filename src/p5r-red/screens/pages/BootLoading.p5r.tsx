/**
 * 启动类状态页 #/p/boot?state=（视觉迁移自 v3 overlays/a.js §2 openBoot + §11 openError；文案按真实源码）：
 *   loading  真实 src/App.tsx#BootLoading「正在读取本地数据…」
 *   stuck    BootLoading 看门狗：20 秒未读完 →「已经等了 20 秒还没读完——这不正常。」+ 重新加载 / 复制诊断信息（已复制，发给开发者 / 复制失败）
 *   error    App.tsx error 分支「出错了」+ 错误信息 + 重新加载
 *   crash    main.tsx#ErrorBoundary「应用出错了」+ message + 查看错误详情（stack）+ 重新加载
 *   chunk    main.tsx 分包拉取失败兜底「页面加载失败 / 网络不稳或版本已更新，刷新即可重试。」+ 刷新
 * ?wait=1（仅 loading）：按真实时序演示——20s 后自动转 stuck。页面 chromeless（无底栏 / 侧栏）。
 * 顶部 oa-demo-sw 是 v3 的演示切换条（?__dev=0 时隐藏），接入时去掉。
 */
import { useEffect, useRef, useState } from 'react';
import type { PageProps } from '@/p5r-red/registry/types';
import { P5Shp } from '@/p5r-red/kit/P5Shp';
import { P5Button } from '@/p5r-red/kit/P5Button';
import { P5Ransom } from '@/p5r-red/kit/P5Ransom';
import { P5OaStar } from '@/p5r-red/kit/P5Layer';
import { toast } from '@/p5r-red/kit/P5Toast';
import { P5BgSVG } from '@/p5r-red/fx/bg';
import { P5Sil } from '@/p5r-red/fx/sil';
import { usePrefs, isLowMotion } from '@/p5r-red/lib/prefs';
import { navigate } from '@/p5r-red/shell/shellBus';
import { slam } from '@/p5r-red/screens/overlays/cutins.p5r';

const VARS: [string, string][] = [['loading', '读取中'], ['stuck', '20s 卡住'], ['error', '初始化失败'], ['crash', '应用出错'], ['chunk', '分包失败']];

export default function BootLoading({ params, wide }: PageProps) {
  const st0 = params.get('state') ?? 'loading';
  const [st, setSt] = useState(st0);
  const [copied, setCopied] = useState<null | boolean>(null);
  const dev = !usePrefs().devHidden;
  const card = useRef<HTMLDivElement>(null);
  useEffect(() => { setSt(st0); setCopied(null); }, [st0]);
  useEffect(() => {
    if (st !== 'loading' || params.get('wait') !== '1') return;
    const t = setTimeout(() => setSt('stuck'), 20000);
    return () => clearTimeout(t);
  }, [st, params]);
  useEffect(() => {
    const c = card.current; if (!c || isLowMotion()) return;
    c.animate([{ transform: 'translateY(30px) rotate(-4deg) scale(.94)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.2,1.2,.4,1)' });
    slam(c.querySelectorAll('.ransom img'), 50);
  }, [st]);
  const copy = async () => {
    try { await navigator.clipboard.writeText(JSON.stringify({ ua: navigator.userAgent, at: new Date().toISOString(), tables: { activities: 86, todos: 5 } }, null, 1)); setCopied(true); }
    catch { setCopied(false); }
  };
  const reload = () => { toast('重新加载（demo）'); navigate('dashboard', { via: 'tear' }); };
  const sw = dev && (
    <div className="oa-demo-sw" role="group" aria-label="演示状态">
      {VARS.map(([k, l]) => <button key={k} type="button" aria-pressed={st === k} onClick={() => navigate('boot', { via: 'none', params: { state: k } })}>{l}</button>)}
      <button type="button" onClick={() => navigate('dashboard', { via: 'none' })}>关闭演示</button>
    </div>
  );
  const isLoad = st === 'loading' || st === 'stuck';
  return (
    <div className={`oa-layer ${isLoad ? 'oa-boot' : 'oa-errp'}`} style={{ zIndex: 30 }}>
      <div className="oa-stage"><P5BgSVG seed={isLoad ? 23 : 13} wide={wide} /></div>
      {isLoad ? (
        <>
          <div className="oa-boot-sil"><P5Sil name="crouch" style={{ height: '100%', width: 'auto' }} /></div>
          <div className="oa-boot-c">
            <div className="oa-spin" aria-hidden="true"><P5OaStar size={74} fill="var(--p5r-paper)" stroke="#111" sw={6} /><i><P5OaStar size={34} fill="var(--red)" /></i></div>
            <P5Shp className="oa-boot-card" kind="torn" seed={88} tone="ink">
              <p className="oa-boot-t" role="status">正在读取本地数据<span className="oa-dots"><i>.</i><i>.</i><i>.</i></span></p>
              <div className="oa-boot-stuck" data-testid="boot-stuck" hidden={st !== 'stuck'}>
                <p>已经等了 20 秒还没读完——这不正常。</p>
                <div className="oa-row">
                  <P5Button seed={3} onClick={reload}>重新加载</P5Button>
                  <P5Button tone="paper" seed={5} onClick={() => void copy()}>{copied === true ? '已复制，发给开发者' : copied === false ? '复制失败' : '复制诊断信息'}</P5Button>
                </div>
              </div>
            </P5Shp>
            {sw}
          </div>
        </>
      ) : (
        <>
          <div className="oa-errp-sil"><P5Sil name="crouch" style={{ height: '100%', width: 'auto' }} /></div>
          <div className="oa-errp-c">
            {sw}
            <div ref={card}>
              <P5Shp className="oa-errp-card" kind="torn" seed={151} tone="paper">
                <div className="oa-errp-hd"><P5Ransom text={st === 'chunk' ? 'RETRY' : 'ERROR'} h={46} seed={6} /></div>
                <h2>{st === 'crash' ? '应用出错了' : st === 'error' ? '出错了' : '页面加载失败'}</h2>
                <p className="oa-errp-msg">{st === 'chunk' ? '网络不稳或版本已更新，刷新即可重试。' : st === 'crash' ? "Cannot read properties of undefined (reading 'level')" : 'IndexedDB 打开失败：QuotaExceededError'}</p>
                {st === 'crash' && <details className="oa-errp-det"><summary>查看错误详情</summary><pre>{"TypeError: Cannot read properties of undefined (reading 'level')\n    at StatRow (Statistics.tsx:212)\n    at renderWithHooks (react-dom.js:1)"}</pre></details>}
                <div className="oa-row"><P5Button seed={91} size="lg" onClick={reload}>{st === 'chunk' ? '刷新' : '重新加载'}</P5Button></div>
              </P5Shp>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
