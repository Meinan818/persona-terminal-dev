/**
 * AI 逐字 · 成长总结（fxCatalog red-ai-summary；真实 src/components/SummaryModal.tsx 的 result 视图：preparing「正在整理简报…」
 * → streaming「✨ AI 正在书写…」每 40ms 落 3 字 + 红光标 → done 草稿 + 追问区）。视觉迁移自 v3 overlays/a.js §8 openSummary（result）。
 * 完整 SummaryModal（生成页 / 归档 / 详情 / 追问 / 重新生成确认）归 pkg4（actions-summary-*）；这里只做演出直达。
 *   ?stage=preparing|streaming|done|truncated|error   直达某一阶段（默认从 preparing 自动播到 done）
 */
import { useEffect, useRef, useState } from 'react';
import type { OverlayProps } from '@/p5r-red/registry/types';
import { P5Layer, P5OaRough, P5OaStar, P5XGlyph } from '@/p5r-red/kit/P5Layer';
import { P5Plate } from '@/p5r-red/kit/P5Plate';
import { P5Button } from '@/p5r-red/kit/P5Button';
import { toast } from '@/p5r-red/kit/P5Toast';
import { isLowMotion } from '@/p5r-red/lib/prefs';

const LETTER = '客人，这一周你把「知识」推高了 9 点——图书馆那三个小时是最扎实的一块砖。\n\n「胆量」只动了 2 点。晨跑断了两天，但你在社团面试里站了出来，这比跑步更难。\n\n下周的建议：把吉他练习从 30 分钟拆成两个 15 分钟；给「魅力」留一格，哪怕只是主动和一个人打招呼。\n\n——我在天鹅绒房间等你的下一页。';
type St = 'preparing' | 'streaming' | 'done' | 'truncated' | 'error';
const range = () => { const d = new Date(), s = new Date(+d - ((d.getDay() + 6) % 7) * 864e5), e = new Date(+s + 6 * 864e5), f = (x: Date) => `${x.getMonth() + 1}/${x.getDate()}`; return `${s.getFullYear()}年 ${f(s)} ~ ${f(e)}`; };

export default function AISummaryStream({ open, onClose, params }: OverlayProps) {
  const st0 = (params?.get('stage') as St) || 'preparing';
  const [st, setSt] = useState<St>(st0);
  const [k, setK] = useState(st0 === 'done' ? LETTER.length : st0 === 'truncated' || st0 === 'error' ? 88 : st0 === 'streaming' ? 40 : 0);
  const iv = useRef(0);
  useEffect(() => {
    if (!open) return;
    const ts: number[] = [];
    const stream = () => {
      setSt('streaming');
      if (isLowMotion()) { setK(LETTER.length); setSt('done'); return; }
      iv.current = window.setInterval(() => setK((x) => { const n = x + 3; if (n >= LETTER.length) { clearInterval(iv.current); setSt('done'); return LETTER.length; } return n; }), 40);
    };
    if (st0 === 'preparing') ts.push(window.setTimeout(stream, 900));
    if (st0 === 'streaming') stream();
    return () => { ts.forEach(clearTimeout); clearInterval(iv.current); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const title = st === 'preparing' ? '正在整理简报…' : st === 'streaming' ? '✨ AI 正在书写…' : st === 'error' ? '生成失败' : `${range()} · 草稿`;
  const text = LETTER.slice(0, k);
  return (
    <P5Layer open={open} onClose={onClose} cls="oa-sum" z={870}>
      <div className="oa-sum-card" role="dialog" aria-modal="true" aria-label="成长总结">
        <P5OaRough seed={601} face="var(--p5r-paper)" frame="#111" jag={7} d={[6, 7]} />
        <div className="oa-sum-hd">
          <div className="oa-sum-tt"><P5Plate fs={19}>{title}</P5Plate>{st !== 'done' && <p>关掉也没关系，它会在后台写完，回来就能看。</p>}</div>
          <div className="oa-sum-hb"><button type="button" className="oa-chip" onClick={() => toast('归档（完整 SummaryModal 见 pkg4）')}>归档</button><button type="button" className="oa-sum-x" aria-label="关闭" onClick={onClose}><P5XGlyph s={14} c="var(--p5r-paper)" /></button></div>
        </div>
        <div className="oa-sum-body">
          {st === 'preparing' ? (
            <div className="oa-prep"><div className="oa-spin sm"><P5OaStar size={46} fill="var(--red)" stroke="#111" sw={6} /></div><p>正在整理这一期的简报…</p></div>
          ) : (
            <>
              <div className="oa-sum-stats">{([['总加点', '+21'], ['记录数', 14], ['风格', '蓝蝶']] as const).map(([a, b]) => <div key={a}><small>{a}</small><b>{b}</b></div>)}</div>
              <div className="oa-sum-meta"><button type="button" className="oa-chip">✦ 重温开场</button>{st === 'streaming' && <span className="oa-live">正在读你的记录 <i className="oa-dots"><i>.</i><i>.</i><i>.</i></i></span>}</div>
              <article className="oa-letter">{text.split('\n').map((ln, i, a) => <span key={i}>{ln}{i < a.length - 1 && <br />}</span>)}{st === 'streaming' && <i className="oa-caret" />}</article>
              {st === 'error' && <div className="oa-err" role="alert">网络请求失败：无法连接到 API 服务。</div>}
              {st === 'truncated' && <div className="oa-warn"><p>这封信写到一半断了（输出被截断或连接中途断开）。可以让它从断处接着写。</p></div>}
              {st === 'done' && <div className="oa-fu"><p className="oa-fu-h">还有疑问？可以追问</p><button type="button" className="oa-fu-sug">回答对方的问题：下周你最想先动哪一项？</button></div>}
            </>
          )}
        </div>
        <div className="oa-sum-ft">
          {st === 'streaming' || st === 'preparing'
            ? <><P5Button tone="paper" seed={78} onClick={() => { clearInterval(iv.current); setSt('done'); }}>停止</P5Button><P5Button seed={79} disabled className="oa-dis">生成中…</P5Button></>
            : st === 'truncated' ? <P5Button tone="ink" seed={77} onClick={() => setSt('done')}>接着写</P5Button>
            : st === 'error' ? <><P5Button tone="paper" seed={75} onClick={onClose}>取消</P5Button><P5Button seed={76} onClick={() => { setK(0); setSt('streaming'); iv.current = window.setInterval(() => setK((x) => { const n = x + 3; if (n >= LETTER.length) { clearInterval(iv.current); setSt('done'); return LETTER.length; } return n; }), 40); }}>重试</P5Button></>
            : <><P5Button tone="paper" seed={78} onClick={() => toast('重新生成（确认框见 pkg4）')}>重新生成</P5Button><P5Button seed={79} onClick={() => { toast('已归档'); onClose(); }}>归档保存</P5Button></>}
        </div>
      </div>
    </P5Layer>
  );
}
