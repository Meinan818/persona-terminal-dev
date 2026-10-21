/**
 * 刷新等级称号 · 建议选择（真实 Settings.tsx levelTitleModal：AI 刷新生成建议 → 逐属性轮播，勾「刷新这个属性」→ 当前 / 建议对照表 → 应用 N 个）。
 * 视觉 = v3 b.js openLevelTitleConfirm。?state=ok（有建议）| busy（应用中）。
 * 演出 fx-level-title（?variant=fx）：弹窗开 → 轮播一格 → 自动合上（约 2.2s，对位黄色 FX-AUDIT「只有弹窗开合」）。
 */
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@/p5r-red/registry/types';
import { toast } from '@/p5r-red/kit/P5Toast';
import { RANKS, ATTR_ORDER } from '@/p5r-red/mock/data';
import { ObSheet, ObBtn } from './ObKit';
import { ATTR_META } from './SettingsBlocks';

const SUG: Record<string, string[]> = {
  knowledge: ['初窥门径', '小有所成', '博览群书', '学贯中西', '通今博古', '万卷在胸'], guts: ['初生牛犊', '敢作敢当', '胆识过人', '临危不惧', '一往无前', '狮心不灭'],
  dexterity: ['笨手笨脚', '渐入佳境', '得心应手', '游刃有余', '巧夺天工', '出神入化'], kindness: ['心存善意', '体贴入微', '温润如玉', '悲天悯人', '春风化雨', '大爱无疆'],
  charm: ['平平无奇', '小有魅力', '引人注目', '光彩照人', '万众瞩目', '倾国倾城'],
};
export default function SettingsLevelTitleModal({ open, onClose, params }: OverlayProps) {
  const fx = params?.get('variant') === 'fx';
  const [st, setSt] = useState(params?.get('state') ?? 'ok');
  const [ai, setAi] = useState(0);
  const [sel, setSel] = useState([true, true, true, false, false]);
  useEffect(() => {
    if (!fx || !open) return;
    const a = setTimeout(() => setAi(1), 900), b = setTimeout(onClose, 1900);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [fx, open]); // eslint-disable-line react-hooks/exhaustive-deps
  const id = ATTR_ORDER[ai], [, ic, l] = ATTR_META[ai];
  const n = sel.filter(Boolean).length;
  const busy = st === 'busy';
  return (
    <ObSheet open={open} onClose={onClose} title={`确认刷新：${l}`} seed={541} wide states={fx ? undefined : [['ok', '有建议'], ['busy', '应用中']]} state={st} onState={setSt}>
      <p className="ob-count">{ai + 1} / 5 · 已选 {n} 个属性</p>
      <div className="ob-car"><button type="button" className="ob-car-b" aria-label="上一个属性" onClick={() => setAi((ai + 4) % 5)}>◀</button><b className="ob-car-t">{ic} {l}</b><button type="button" className="ob-car-b" aria-label="下一个属性" onClick={() => setAi((ai + 1) % 5)}>▶</button></div>
      <label className="ob-check"><input type="checkbox" checked={sel[ai]} onChange={() => setSel(sel.map((x, j) => (j === ai ? !x : x)))} /><i /><span>刷新这个属性</span></label>
      <table className="ob-tbl"><thead><tr><th>等级</th><th>当前</th><th>建议</th></tr></thead>
        <tbody>{RANKS[id].map((c, i) => <tr key={i}><td>Lv.{i + 1}</td><td>{c}</td><td><b>{SUG[id][i]}</b></td></tr>)}</tbody></table>
      <div className="ob-acts"><ObBtn tone="paper" seed={542} onClick={onClose}>取消</ObBtn><ObBtn seed={543} size="lg" disabled={busy || !n} onClick={() => { toast(`已刷新 ${n} 个属性的等级称号`); onClose(); }}>{busy ? '应用中' : `应用 ${n} 个`}</ObBtn></div>
    </ObSheet>
  );
}
