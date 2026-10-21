/**
 * 宣告卡页 #/p/callingcard（用户更正 2026-10-21：保留 v3 设计 pages_a.js callingcard；真实无独立页，对应 CallingCardSection + CallingCardCard）。
 * 视觉原样迁移 v3：CALLING CARD 剪报页头 + 预告信墙（card_front_blank 卡面，PINNED·宣言 / RUN!·PASS! / 还剩 N 天 / 进度条，点卡 3D 翻面）
 *   + 每卡 取消钉选·钉到主页 / 编辑 / 归档 / 删除 + 「立下新的约定」+ 归档区（恢复 / 删除）。
 * 动作改接真实组件（P0-07）：新建 / 编辑 → CallingCardEditor 抽屉（新建保存后播 v3「发出预告」演出）；删除 → ConfirmDialog「删除「X」？」；
 *   归档 → 卡片落下 + CallingCardCutIn（宣告 · 已收）。
 * 直达：?state=empty（一张没有 → 宣告卡空态提示）  ?editor=new|edit  ?del=1  ?cutin=archived
 */
import { useEffect, useRef, useState } from 'react';
import type { PageProps } from '@/p5r-red/registry/types';
import { P5PageHeader } from '@/p5r-red/kit/P5PageHeader';
import { P5Button } from '@/p5r-red/kit/P5Button';
import { P5Ransom } from '@/p5r-red/kit/P5Ransom';
import { P5Plate } from '@/p5r-red/kit/P5Plate';
import { P5Shp } from '@/p5r-red/kit/P5Shp';
import { P5StarIcon } from '@/p5r-red/kit/P5StarIcon';
import { DevStateBar } from '@/p5r-red/kit/DevStateBar';
import { toast } from '@/p5r-red/kit/P5Toast';
import { kitImg } from '@/p5r-red/lib/asset';
import { lerp } from '@/p5r-red/lib/rng';
import { isLowMotion } from '@/p5r-red/lib/prefs';
import { spring } from '@/p5r-red/fx/spring';
import { slamTiles } from '@/p5r-red/fx/motion';
import { sfx } from '@/p5r-red/fx/sfx';
import { CALLING_CARDS, CALLING_ARCHIVED, ccDaysLeft, ccPct, type MockCC } from '@/p5r-red/mock/pkg5-data';
import { CallingCardEditor } from '@/p5r-red/screens/overlays/CallingCardEditor.p5r';
import { CallingCardDeleteConfirm } from '@/p5r-red/screens/overlays/CallingCardSectionDeleteConfirm.p5r';
import { CallingCardCutIn, type CCCutInCard } from '@/p5r-red/screens/overlays/CallingCardCutIn.p5r';
import { createRoot } from 'react-dom/client';
import '../pkg5.p5r.css';

/** v3 sendCard：预告信从右上旋转飞入 → 3D 翻到正面 → 剪报 TAKE YOUR HEART → 甩出（2.8s 后卸载） */
function sendCard(title: string) {
  sfx('fanfare', 0.6);
  const v = document.createElement('div'); v.className = 'send-cc'; document.body.appendChild(v);
  const root = createRoot(v);
  root.render(<div className="scc-card"><div className="scc-back"><img src={kitImg('card_emblem')} alt="" /></div><div className="scc-front"><img src={kitImg('card_front_blank')} alt="" /><div className="scc-t"><P5Ransom text="TAKE YOUR HEART" h={26} seed={8} /><b>{title}</b></div></div></div>);
  const done = () => { root.unmount(); v.remove(); };
  requestAnimationFrame(() => {
    const card = v.querySelector<HTMLElement>('.scc-card')!;
    v.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, fill: 'both' });
    if (isLowMotion()) { card.style.transform = 'rotate(-4deg) rotateY(180deg)'; setTimeout(() => v.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'both' }).onfinish = done, 900); return; }
    card.animate([{ transform: 'translate(70vw,-60vh) rotate(-60deg) rotateY(0) scale(.4)' }, { transform: 'translate(0,0) rotate(-6deg) rotateY(0) scale(1)', offset: 0.45 }, { transform: 'rotate(-4deg) rotateY(180deg) scale(1.05)', offset: 0.8 }, { transform: 'rotate(-4deg) rotateY(180deg) scale(1)' }], { duration: 1300, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' });
    setTimeout(() => slamTiles(v.querySelectorAll('.ransom img'), 0.03), 1000);
    setTimeout(() => { card.animate([{ transform: 'rotate(-4deg) rotateY(180deg)' }, { transform: 'translateX(-120vw) rotate(-30deg) rotateY(180deg)' }], { duration: 380, easing: 'cubic-bezier(.6,0,.8,.4)', fill: 'forwards' }); v.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, delay: 260, fill: 'forwards' }).onfinish = done; }, 2800);
  });
}

function Letter({ c, i, wide, onAct }: { c: MockCC; i: number; wide: boolean; onAct: (a: 'pin' | 'edit' | 'arc' | 'del', el: HTMLElement) => void }) {
  const [flip, setFlip] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const left = ccDaysLeft(c.targetDate);
  return (
    <article className="cc-letter" ref={ref} style={{ ['--r' as string]: `${i % 2 ? 3 : -3}deg` }}>
      <div className={`ccl-flip${flip ? ' flipped' : ''}`} role="button" tabIndex={0} aria-label={`${c.title}（点按翻面）`} onClick={() => setFlip((f) => !f)} onKeyDown={(e) => { if (e.key === 'Enter') setFlip((f) => !f); }}>
        <div className="ccl-front"><img src={kitImg('card_front_blank')} alt="" />
          <div className="ccl-txt">
            <span className="ccl-k">{c.pinned ? 'PINNED · 宣言' : 'CALLING CARD'}</span>
            <P5Ransom text={c.mode === 'both' ? 'RUN!' : 'PASS!'} h={wide ? 42 : 30} seed={30 + i} />
            <b className="ccl-t">{c.title}</b>{c.subtitle && <i className="ccl-s">{c.subtitle}</i>}
            {c.mode === 'todos'
              ? <span className="ccl-n"><small>已完成</small><b>{c.todosDone}</b><small>/ {c.todosTotal} 项</small></span>
              : <span className="ccl-n"><small>还剩</small><b>{left}</b><small>天 · {c.targetDate.slice(5).replace('-', '.')}</small></span>}
            {c.mode === 'both' && <span className="ccl-todo">已完成 {c.todosDone}/{c.todosTotal} 项</span>}
            <span className="ccl-bar"><i style={{ width: `${ccPct(c)}%` }} /></span>
          </div>
        </div>
        <div className="ccl-back"><img src={kitImg('card_emblem')} alt="" /></div>
      </div>
      <div className="ccl-acts">
        <P5Button tone="paper" size="sm" seed={70 + i} onClick={() => onAct('pin', ref.current!)}>{c.pinned ? '取消钉选' : '钉到主页'}</P5Button>
        <P5Button tone="ink" size="sm" seed={72 + i} onClick={() => onAct('edit', ref.current!)}>编辑</P5Button>
        <P5Button tone="ink" size="sm" seed={74 + i} onClick={() => onAct('arc', ref.current!)}>归档</P5Button>
        <P5Button tone="red" size="sm" seed={76 + i} onClick={() => onAct('del', ref.current!)}>删除</P5Button>
      </div>
    </article>
  );
}

export default function CallingCardPage({ wide, params }: PageProps) {
  const st = params.get('state');
  const root = useRef<HTMLDivElement>(null);
  const [cards, setCards] = useState<MockCC[]>(() => (st === 'empty' ? [] : CALLING_CARDS.slice(0, 2).map((c) => ({ ...c }))));  // parity：v3 宣告卡页 = D.callingCards 两张
  const [arch, setArch] = useState<MockCC[]>(() => (st === 'empty' ? [] : CALLING_ARCHIVED.map((c) => ({ ...c, archiveReason: 'auto_todos' as const }))));  // parity：v3 归档行「四级考试 · 已达成」
  const [editor, setEditor] = useState<{ open: boolean; card: MockCC | null }>({ open: params.has('editor'), card: params.get('editor') === 'edit' ? CALLING_CARDS[0] : null });
  const [del, setDel] = useState<MockCC | null>(params.get('del') ? CALLING_CARDS[0] : null);
  const [cut, setCut] = useState<CCCutInCard | null>(params.get('cutin') ? { id: 'cc1', title: CALLING_CARDS[0].title, subtitle: CALLING_CARDS[0].subtitle, icon: CALLING_CARDS[0].icon, texture: 'lines', archiveReason: 'manual' } : null);
  const [hint, setHint] = useState(true);

  useEffect(() => {
    const r = root.current; if (!r || isLowMotion()) return;
    const stops: (() => void)[] = [];
    r.querySelectorAll<HTMLElement>('.cc-letter').forEach((c, i) => {
      const f = c.querySelector<HTMLElement>('.ccl-flip')!; f.style.transform = 'translateX(120vw) rotate(40deg) rotateY(180deg)';
      stops.push(spring({ stiffness: 200, damping: 20, delay: 0.1 + i * 0.14, onUpdate: (p) => { f.style.transform = `translateX(${lerp(120, 0, p)}vw) rotate(${lerp(40, 0, p)}deg) rotateY(${lerp(180, 0, Math.min(1, p * 1.1))}deg)`; }, onDone: () => { f.style.transform = ''; } }));
      stops.push(slamTiles(c.querySelectorAll('.ransom img'), 0.05));
    });
    return () => stops.forEach((s) => s());
  }, []);

  const act = (c: MockCC) => (a: 'pin' | 'edit' | 'arc' | 'del', el: HTMLElement) => {
    if (a === 'pin') { setCards((p) => p.map((x) => ({ ...x, pinned: x.id === c.id ? !c.pinned : false }))); toast(c.pinned ? '已取消钉选' : '已钉到主页'); }
    if (a === 'edit') setEditor({ open: true, card: c });
    if (a === 'del') setDel(c);
    if (a === 'arc') {
      const fin = () => { setCards((p) => p.filter((x) => x.id !== c.id)); setArch((p) => [{ ...c, archived: true, archiveReason: 'manual', pinned: false }, ...p]); setCut({ id: c.id, title: c.title, subtitle: c.subtitle, icon: c.icon, texture: c.texture, archiveReason: 'manual' }); };
      if (isLowMotion()) fin(); else el.animate([{ transform: 'none' }, { transform: 'translateY(40px) rotate(12deg) scale(.8)', opacity: 0 }], { duration: 320, fill: 'both' }).onfinish = fin;
    }
  };

  return (
    <div className="cc5 ccp" ref={root}>
      <img className="ccp-emblem" src={kitImg('card_emblem')} alt="" aria-hidden="true" />
      <P5PageHeader ransom="CALLING CARD" cn="倒计时 · 宣告卡" sub="为重要的事写一张「宣告卡」，倒计时随时在此映入眼帘" seed={21}
        right={<P5Button tone="red" seed={61} onClick={() => setEditor({ open: true, card: null })}>+ 新建</P5Button>} />
      {cards.length === 0 && arch.length === 0 && hint && (
        <div className="od-cce-hint ccp-hint">
          <P5Shp kind="torn" seed={721} className="od-cch">
            <span className="od-cch-ic" aria-hidden="true"><P5StarIcon /></span>
            <p>为重要的事写一张「宣告卡」，倒计时随时在此映入眼帘</p>
            <div className="p5k-acts" style={{ justifyContent: 'center' }}>
              <P5Button tone="ink" size="sm" seed={722} onClick={() => { try { localStorage.setItem('velvet_cc_hint_dismissed', '1'); } catch { /* */ } setHint(false); }}>不再提示</P5Button>
              <P5Button tone="red" seed={723} onClick={() => setEditor({ open: true, card: null })}>+ 新建</P5Button>
            </div>
          </P5Shp>
        </div>
      )}
      <div className="cc-wall">
        {cards.map((c, i) => <Letter key={c.id} c={c} i={i} wide={wide} onAct={act(c)} />)}
        <button type="button" className="cc-new" onClick={() => setEditor({ open: true, card: null })}><img src={kitImg('card_emblem')} alt="" /><b>立下新的约定</b></button>
      </div>
      {arch.length > 0 && (
        <section className="cc-arch">
          <P5Plate fs={15} rot={-1}>归档 · {arch.length}</P5Plate>
          {arch.map((c, i) => (
            <div key={c.id} className="cc-arow"><b>{c.title} · {c.archiveReason === 'auto_todos' ? '已达成' : c.archiveReason === 'auto_date' ? '已至期' : '已收存'}</b>
              <span>
                <P5Button tone="paper" size="sm" seed={81 + i} onClick={() => { setArch((p) => p.filter((x) => x.id !== c.id)); setCards((p) => [...p, { ...c, archived: false, archiveReason: undefined }]); toast('已恢复'); }}>恢复</P5Button>
                <P5Button tone="red" size="sm" seed={82 + i} onClick={() => setDel(c)}>删除</P5Button>
              </span>
            </div>
          ))}
        </section>
      )}
      <DevStateBar page="callingcard" items={[
        { label: '默认', q: '' }, { label: '空（一张没有）', q: 'state=empty' }, { label: '新建抽屉', q: 'editor=new' }, { label: '编辑抽屉', q: 'editor=edit' },
        { label: '删除确认', q: 'del=1' }, { label: '归档 · 已收', q: 'cutin=archived' },
      ]} />
      <CallingCardEditor open={editor.open} initial={editor.card} onClose={() => setEditor((e) => ({ ...e, open: false }))}
        onSaved={(patch, isNew) => {
          if (isNew) { setCards((p) => [...(patch.pinned ? p.map((x) => ({ ...x, pinned: false })) : p), { id: `cc${Date.now()}`, icon: '✦', texture: 'lines', mode: 'deadline', startDate: '', targetDate: '', title: '', ...patch } as MockCC]); setTimeout(() => sendCard(patch.title || '新的宣言'), 260); }
          else setCards((p) => p.map((x) => (x.id === editor.card?.id ? { ...x, ...patch } : patch.pinned ? { ...x, pinned: false } : x)));
        }} />
      <CallingCardDeleteConfirm open={!!del} title={del?.title ?? ''} onClose={() => setDel(null)} onConfirm={() => { const id = del?.id; setCards((p) => p.filter((x) => x.id !== id)); setArch((p) => p.filter((x) => x.id !== id)); }} />
      <CallingCardCutIn card={cut} onClose={() => setCut(null)} />
    </div>
  );
}
