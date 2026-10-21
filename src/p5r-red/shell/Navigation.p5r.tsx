/**
 * 导航（原 shared/app.js buildChrome，DOM / 类名逐字一致；样式在 shell/shell.css）：
 *   <BottomNav/>  #bnav：矢量底栏 5 键（首页 / 行动 / 助手六角键 / 羁绊 / 菜单）；手机竖屏显示
 *   <Sidebar/>    #side：P5R 暂停菜单式侧栏（首页 / 行动 / 助手 / 羁绊 / 记账 / 菜单），选中项红青活高亮；
 *                 700–1023 横屏窄侧栏、≥1024 横屏宽侧栏（CSS 媒体查询切换，同原生）
 * 点击 → 水波纹切页（原点 = 指尖）；中间助手键：短按 openAssistant()，长按 500ms → 轮盘（hold 手势模式）。
 * 对应真实仓库 src/components/Navigation.tsx 的 red 分支。
 */
import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react';
import { shape } from '@/p5r-red/lib/shape';
import { isLowMotion } from '@/p5r-red/lib/prefs';
import { P5Ransom } from '@/p5r-red/kit/P5Ransom';
import { sfx } from '@/p5r-red/fx/sfx';
import { navigate, openAssistant, openWheel, pageHref, useShellState } from './shellBus';
import { PAGES } from '@/p5r-red/registry/pages';

const BN = [
  { id: 'dashboard', label: '首页' }, { id: 'actions', label: '行动' }, { id: 'chat', label: '助手', hex: true }, { id: 'cooperation', label: '羁绊' }, { id: 'menu', label: '菜单' },
] as const;
const RT = [-2, 1.5, 0, -1.5, 2];
/* 页面 id 与真实 currentPage 一致（Navigation.tsx 底导：dashboard / actions / [助手] / cooperation / menu；侧栏多 ledger） */
const SIDE = [
  { id: 'dashboard', label: '首页', en: 'HOME' }, { id: 'actions', label: '行动', en: 'ACTION' }, { id: 'chat', label: '助手', en: 'NAVI' },
  { id: 'cooperation', label: '羁绊', en: 'CONFIDANT' }, { id: 'ledger', label: '记账', en: 'LEDGER' }, { id: 'menu', label: '菜单', en: 'MENU' },
];

const IC: Record<string, ReactNode> = {
  dashboard: <><polygon points={shape.starPts(12, 12.8, 10.5)} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" /><polygon points={shape.starPts(12, 12.8, 4.6)} fill="currentColor" /></>,
  actions: <path d="M13.5 2 4.5 13.5h6.5L9.5 22l9.5-12h-6.5z" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinejoin="round" />,
  cooperation: <path d="M12 20.5 4.2 12.6A4.8 4.8 0 0 1 12 6.4a4.8 4.8 0 0 1 7.8 6.2z" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />,
  menu: <g fill="none" stroke="currentColor" strokeWidth="2.3"><circle cx="7.5" cy="7.5" r="3.3" /><circle cx="16.5" cy="7.5" r="3.3" /><circle cx="7.5" cy="16.5" r="3.3" /><circle cx="16.5" cy="16.5" r="3.3" /></g>,
};
const MaskIco = () => (
  <svg viewBox="0 0 64 40" aria-hidden="true"><path d="M3 6 Q18 -1 32 9 Q46 -1 61 6 Q60 26 47 33 Q38 37 32 27 Q26 37 17 33 Q4 26 3 6Z" fill="#F2E9DA" stroke="#111" strokeWidth="3" strokeLinejoin="round" /><path d="M11 15 Q18 10 27 16 Q19 22 11 15Z M53 15 Q46 10 37 16 Q45 22 53 15Z" fill="#111" /></svg>
);

/** 当前页对应的导航键（registry 的 nav 字段；未登记页 = 页面 id） */
export function useNavKey(): string {
  const { currentPage } = useShellState();
  return PAGES[currentPage]?.nav ?? currentPage;
}

const go = (id: string, e: MouseEvent) => {
  e.preventDefault();
  sfx('nav', 0.48);
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
  navigate(id, { via: 'water', origin: { x: e.clientX || r.left + r.width / 2, y: e.clientY || r.top + r.height / 2 } });
};

/** 中间助手键：短按开助手；长按 500ms 开轮盘（hold 手势：滑向碑牌松开跳转） */
function HexKey() {
  const t = useRef(0), fired = useRef(false), ref = useRef<HTMLAnchorElement>(null);
  return (
    <a ref={ref} className="bn2-hex" data-go="chat" href="#/p/dashboard" aria-label="助手（长按：快捷轮盘）"
      onPointerDown={() => { fired.current = false; const r = ref.current!.getBoundingClientRect(); t.current = window.setTimeout(() => { fired.current = true; openWheel({ x: r.left + r.width / 2, y: r.top + r.height * 0.45 }, true); }, 500); }}
      onPointerUp={() => clearTimeout(t.current)} onPointerCancel={() => clearTimeout(t.current)}
      onClickCapture={(e) => { if (fired.current) { e.preventDefault(); e.stopPropagation(); fired.current = false; } }}
      onClick={(e) => { e.preventDefault(); sfx('nav'); openAssistant(); }}
      onContextMenu={(e) => e.preventDefault()}>
      <svg className="bn2-hexbg" viewBox="0 0 100 90" aria-hidden="true"><polygon points="24,2 78,0 100,44 80,90 22,88 0,46" fill="#111" /><polygon points="27,8 74,6 93,44 76,83 25,82 7,46" fill="var(--red)" /></svg>
      <MaskIco /><span>助手</span>
    </a>
  );
}

export function BottomNav() {
  const cur = useNavKey();
  return (
    <nav id="bnav" aria-label="底部导航">
      <div className="bn2">
        {BN.map((b, i) => 'hex' in b ? <HexKey key={b.id} /> : (
          <a key={b.id} className={`bn2-b${cur === b.id ? ' on' : ''}`} data-go={b.id} href={pageHref(b.id)} aria-label={b.label} style={{ ['--rt' as string]: `${RT[i]}deg` }}
            onClick={(e) => { if (cur === b.id) { e.preventDefault(); return; } go(b.id, e); }}>
            <svg viewBox="0 0 24 24" aria-hidden="true">{IC[b.id]}</svg><span>{b.label}</span>
          </a>
        ))}
      </div>
    </nav>
  );
}

const Hl = () => (
  <span className="hl"><svg viewBox="0 0 100 40" preserveAspectRatio="none"><polygon className="hr" points="2,6 98,0 94,38 0,34" fill="#ff0022" /><polygon className="hc" points="4,4 99,3 92,36 3,39" fill="#1cfeff" style={{ mixBlendMode: 'screen', opacity: 0 }} /><polygon points="3,5 97,2 93,36 2,35" fill="#F2E9DA" /></svg></span>
);

export function Sidebar() {
  const cur = useNavKey();
  const ref = useRef<HTMLElement>(null);
  // 选中项红青活高亮（kit P5Highlight：每 ~130ms 换目标）
  useEffect(() => {
    const t = window.setInterval(() => {
      if (isLowMotion() || !ref.current) return;
      ref.current.querySelectorAll('.si.on .hl, .si:hover .hl').forEach((h) => {
        const r = (a: number, b: number) => (a + Math.random() * (b - a)).toFixed(1);
        h.querySelector('.hr')!.setAttribute('points', `${r(0, 6)},${r(0, 10)} ${r(94, 100)},${r(0, 8)} ${r(90, 98)},${r(32, 40)} ${r(0, 5)},${r(30, 38)}`);
        const c = h.querySelector<SVGPolygonElement>('.hc')!; c.style.opacity = '.85'; c.setAttribute('points', `${r(2, 8)},${r(0, 8)} ${r(95, 100)},${r(0, 6)} ${r(88, 96)},${r(34, 40)} ${r(0, 6)},${r(34, 40)}`);
      });
    }, 130);
    return () => clearInterval(t);
  }, []);
  return (
    <nav id="side" aria-label="侧栏导航" ref={ref}>
      <div className="side-bg" /><div className="side-edge" />
      <div className="logo"><P5Ransom text="MASKARIA" h={30} seed={3} /><br /><span className="sub">面具庭园 ☆</span></div>
      <ul>
        {SIDE.map((s) => (
          <li key={s.id}>
            <a className={`si${cur === s.id ? ' on' : ''}`} data-go={s.id} href={s.id === 'chat' ? '#/p/dashboard' : pageHref(s.id)}
              onClick={(e) => { if (s.id === 'chat') { e.preventDefault(); sfx('nav'); openAssistant(); return; } if (cur === s.id) { e.preventDefault(); return; } go(s.id, e); }}>
              <Hl /><span>{s.label}</span><small>{s.en}</small>
            </a>
          </li>
        ))}
      </ul>
      <div className="foot">TAKE YOUR TIME<br />P5R DEMO · 2026</div>
    </nav>
  );
}
