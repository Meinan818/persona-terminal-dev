/**
 * 菜单 Menu —— 恢复原生 v3 设计（pages_b.js「菜单 v2 · concept_menu_v3」1:1 移植；用户已验收）。
 * 【用户决定 2026-10-21】覆盖 FIXLIST P0-02 的「P5 双列磁贴墙」：不要磁贴墙，菜单回到 v3。
 *
 * P5R 对照：暂停菜单（Pause Menu）。右侧竖排巨字条目（奶白字 + 墨黑粗描边，逐条错落倾斜），
 * 选中项 = 白色星爆底 + 墨字 + 青红错位（P5R 选中光标）；左上用户资料卡（头像星爆框 / LV 星章 / 总点数·入学·连续 / EDIT 角标）；
 * 左侧大剪影跃起（暗红 + 奶白描边）；背景红放射线 + 网点（menuStage）。DOM / 类名与原生相同，样式在 legacy/css/pages.css（.mn2*）。
 * 条目顺序（v3）：占卜 / 统计（连续 N 天）/ 成就·技能 / 心相记账 / 逆影战场（影时间状态）/ 宣告卡 / 设置 / 主题（当前·红）/ 关于（新版本红点）。
 * 跳转：条目 → 星形反撕（navigate via tear，140ms 后）；主题 / 关于 / 资料卡 → openOverlay(menu-theme-sheet / menu-about-sheet / menu-profile-sheet)。
 * 入场（v3 enter）：条目砸入 SLAM（scale 1.4 / -20° → 过冲 → 落定，间隔 38ms）+ 资料卡落下 + 剪影滑入；低动效跳过。
 * 演示参数：?ledger=0 隐藏记账；?battle=0 隐藏战场；?shadow=1 强制影时间；?update=0 隐藏关于红点（v3 默认显示，?update=1 显示）；?pending=3 成就待解锁标签。
 */
import { useEffect, useRef, useState } from 'react';
import type { PageProps } from '@/p5r-red/registry/types';
import { DevStateBar } from '@/p5r-red/kit/DevStateBar';
import { P5StarIcon } from '@/p5r-red/kit/P5StarIcon';
import { P5Sil } from '@/p5r-red/fx/sil';
import { shape } from '@/p5r-red/lib/shape';
import { rng } from '@/p5r-red/lib/rng';
import { isLowMotion } from '@/p5r-red/lib/prefs';
import { navigate, openOverlay } from '@/p5r-red/shell/shellBus';
import { sfx } from '@/p5r-red/fx/sfx';
import { ATTR_ORDER, D, shadowNow } from '@/p5r-red/mock/data';
import { useAppStore } from '@/store';

/** v3 burstPts（P5.rng 同算法 → 同 seed 同形） */
const burstPts = (n = 9, seed = 3) => {
  const r = rng(seed), pts: string[] = [];
  for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? 26 + r() * 8 : 46 + r() * 6; pts.push(`${(50 + Math.cos(a) * rr * 1.25).toFixed(1)},${(50 + Math.sin(a) * rr).toFixed(1)}`); }
  return pts.join(' ');
};
const ROT = [-4, 2, -2, 3, -3, 1.5, -2.5, 2.5, -1.5];
const AV_BURST_A = burstPts(11, 5), AV_BURST_B = burstPts(11, 9);
const LV_STAR = shape.starPts(12, 12.8, 11.5, -90, 0.58);

type Item = { key: string; cn: React.ReactNode; aria: string; to?: string; act?: 'theme' | 'about'; cap?: string; dot?: boolean };
/** 选中项跨挂载保留（同原生模块级 menuSel） */
let menuSel = 0;

export default function Menu({ wide, params }: PageProps) {
  const root = useRef<HTMLDivElement>(null);
  const avatar = useAppStore((state) => state.user?.avatarDataUrl);
  const ledgerVisible = params.get('ledger') !== '0', battleVisible = params.get('battle') !== '0';
  const inShadowTime = params.get('shadow') === '1' || shadowNow();
  const hasUpdate = params.get('update') !== '0';
  const pending = Number(params.get('pending') ?? 0);
  // 与首页 / 统计 / 用户资料同源（用户决定 2026-10-21：名片数字读 mock，不再写死）：总点数 = 五维点数和，LV = 五维等级和，连续 = D.streak
  const total = ATTR_ORDER.reduce((a, k) => a + D.attrs[k].pts, 0);
  const lv = ATTR_ORDER.reduce((a, k) => a + D.attrs[k].level, 0);
  const streak = D.streak;
  const name = D.user.name;

  const items: Item[] = [
    { key: 'astro', cn: '占卜', aria: '占卜', to: 'astrology' },
    { key: 'stats', cn: '统计', aria: `统计：连续 ${streak} 天`, to: 'statistics', cap: `连续 ${streak} 天` },
    { key: 'achv', cn: <>成就<i className="mn2-mid">·</i>技能</>, aria: pending > 0 ? `成就·技能：${pending} 项待解锁` : '成就·技能', to: 'achievements', cap: pending > 0 ? `${pending} 项待解锁` : undefined },
    ...(ledgerVisible ? [{ key: 'ledger', cn: '心相记账', aria: '心相记账', to: 'ledger' } as Item] : []),
    ...(battleVisible ? [{ key: 'battle', cn: '逆影战场', aria: inShadowTime ? '逆影战场：影时间进行中' : '逆影战场：20:00 显形', to: 'battle', cap: inShadowTime ? '影时间 · 进行中' : '20:00 显形' } as Item] : []),
    { key: 'callingcard', cn: '宣告卡', aria: '宣告卡', to: 'callingcard' },
    { key: 'settings', cn: '设置', aria: '设置', to: 'settings' },
    { key: 'theme', cn: '主题', aria: '主题：当前 红', act: 'theme', cap: '当前 · 红' },
    { key: 'about', cn: '关于', aria: hasUpdate ? '关于：有新版本' : '关于', act: 'about', dot: hasUpdate },
  ];
  const [sel, setSel] = useState(() => Math.min(menuSel, items.length - 1));
  const pick = (i: number) => { menuSel = i; setSel(i); };

  useEffect(() => {
    const r = root.current; if (!r || isLowMotion()) return;
    const a: Animation[] = [];
    r.querySelectorAll('.mn2-list li').forEach((it, i) => a.push(it.animate([{ opacity: 0, transform: 'translateX(70%) rotate(-20deg) scale(1.4)' }, { opacity: 1, transform: 'translateX(-4%) rotate(2deg) scale(.98)', offset: 0.7 }, { opacity: 1, transform: 'none' }], { duration: 420, delay: 60 + i * 38, easing: 'cubic-bezier(.15,.95,.1,1)', fill: 'backwards' })));
    const p = r.querySelector('.mn2-prof'); if (p) a.push(p.animate([{ transform: 'translateY(-70px) rotate(6deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' }));
    const s = r.querySelector('.mn2-sil'); if (s) a.push(s.animate([{ transform: 'translate(-40px,40px) scale(.94)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 560, delay: 120, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' }));
    return () => a.forEach((x) => x.cancel());
  }, []);

  const press = (m: Item, i: number, b: HTMLButtonElement) => {
    sfx('nav', 0.48);
    pick(i);
    // 按下反馈（v3 .mn2-it.hit b → mn2-hit）：React 会改写 className，故用 WAAPI 直接打在字上
    b.querySelector('b')?.animate([{ transform: 'scale(1.25) rotate(-8deg)' }, { transform: 'scale(1.06) rotate(-4deg)' }], { duration: 300, easing: 'cubic-bezier(.16,1,.3,1)' });
    if (m.to) { const to = m.to; window.setTimeout(() => navigate(to, { via: 'tear' }), 140); }
    else if (m.act === 'theme') openOverlay('menu-theme-sheet');
    else openOverlay('menu-about-sheet');
  };

  return (
    <div ref={root} className={`mn2 ${wide ? 'wd' : ''}`}>
      <div className="mn2-sil" aria-hidden="true"><P5Sil name="leap" rw={7} style={{ height: '100%', width: 'auto' }} /></div>
      <button className="mn2-prof" type="button" aria-label={`用户资料：${name}，等级 ${lv}（点按编辑）`} onClick={() => { sfx('nav', 0.48); openOverlay('menu-profile-sheet'); }}>
        <svg className="mn2-prof-bg" viewBox="0 0 300 150" preserveAspectRatio="none" aria-hidden="true"><polygon points="6,10 296,0 288,146 0,138" fill="#111" /><polygon points="12,15 290,7 283,139 6,132" fill="var(--p5r-paper)" /></svg>
        <span className="mn2-av">
          <svg className="mn2-av-burst" viewBox="0 0 100 100" aria-hidden="true"><polygon points={AV_BURST_A} fill="#111" /><polygon points={AV_BURST_B} fill="var(--red)" transform="translate(50 50) scale(.86) translate(-50 -50)" /></svg>
          <span className="mn2-av-face">{avatar ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : <P5Sil name="point" fill="#111" rim="#F2E9DA" rw={10} style={{ height: '150%', width: 'auto', marginTop: '6%' }} />}</span>
          <i className="mn2-av-star"><P5StarIcon fill="#111" stroke="#F2E9DA" sw={1.4} /></i>
        </span>
        <span className="mn2-info"><b className="mn2-name">{name}</b>
          <span className="mn2-row"><i>总点数</i> {total} SP</span><span className="mn2-row"><i>入学</i> {D.user.joined}</span><span className="mn2-row"><i>连续</i> {streak} 天</span>
        </span>
        <span className="mn2-lv" aria-hidden="true"><svg viewBox="0 0 24 24"><polygon points={LV_STAR} fill="var(--red)" stroke="#111" strokeWidth={1.2} /></svg><small>LV</small><b>{lv}</b></span>
        <span className="mn2-edit">EDIT</span>
      </button>
      <ul className="mn2-list">{items.map((m, i) => {
        const pts = burstPts(9, 13 + i);
        return (
          <li key={m.key} style={{ '--i': i, '--rt': `${ROT[i]}deg` } as React.CSSProperties}>
            <button className={`mn2-it${i === sel ? ' sel' : ''}`} type="button" data-i={i} data-to={m.to} data-act={m.act} aria-label={m.aria}
              onPointerEnter={(e) => { if (e.pointerType === 'mouse') pick(i); }} onFocus={() => pick(i)} onClick={(e) => press(m, i, e.currentTarget)}>
              <svg className="mn2-burst" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polygon points={pts} fill="#111" transform="translate(3 4)" /><polygon points={pts} fill="#fff" /></svg>
              <b>{m.cn}</b>{m.cap && <small className="mn2-cap">{m.cap}</small>}{m.dot && <i className="mn2-dot" aria-label="有新版本" />}
            </button>
          </li>
        );
      })}</ul>
      <DevStateBar page="menu" items={[{ label: '默认', q: '' }, { label: '影时间', q: 'shadow=1' }, { label: '无新版本', q: 'update=0' }, { label: '成就待解锁 3', q: 'pending=3' }, { label: '隐藏记账', q: 'ledger=0' }, { label: '关闭战场', q: 'battle=0' }]} />
    </div>
  );
}
