/**
 * AI 匹配成就 / 技能名称 · 覆写选择（真实 Settings.tsx presetNameModal：按属性轮播，勾选要覆写的条目 → 应用 N 项，可还原到覆写前版本）。
 * 视觉 = v3 b.js openPresetNameConfirm。?state=ok（有建议）| empty（这一维没建议）。
 */
import { useState } from 'react';
import type { OverlayProps } from '@/p5r-red/registry/types';
import { P5Tag } from '@/p5r-red/kit/P5Tag';
import { toast } from '@/p5r-red/kit/P5Toast';
import { ObSheet, ObNote, ObBtn } from './ObKit';
import { ATTR_META } from './SettingsBlocks';

const SUG: [string, string, string][] = [['成就', '初入学园', '知识的入场券'], ['成就', '百页之人', '书页的旅人'], ['技能', '速读', '一目十行'], ['技能', '笔记术', '思维的拓片']];
export default function SettingsNameMatchModal({ open, onClose, params }: OverlayProps) {
  const [st, setSt] = useState(params?.get('state') ?? 'ok');
  const [ai, setAi] = useState(0);
  const [sel, setSel] = useState([true, true, true, false]);
  const empty = st === 'empty' || ai === 4;
  const n = empty ? 0 : sel.filter(Boolean).length;
  return (
    <ObSheet open={open} onClose={onClose} title={`确认覆写：${ATTR_META[ai][2]}`} seed={551} wide states={[['ok', '有建议'], ['empty', '这一维没建议']]} state={st} onState={setSt}>
      <p className="ob-count">{ai + 1} / 5 · 已选 {n} 项</p>
      <div className="ob-car"><button type="button" className="ob-car-b" aria-label="上一个属性" onClick={() => setAi((ai + 4) % 5)}>◀</button><b className="ob-car-t">{ATTR_META[ai][1]} {ATTR_META[ai][2]}</b><button type="button" className="ob-car-b" aria-label="下一个属性" onClick={() => setAi((ai + 1) % 5)}>▶</button></div>
      {empty ? <ObNote>这一维没有可覆写的建议。</ObNote> : (
        <ul className="ob-ovr">{SUG.map(([k, a, b], i) => (
          <li key={a}><label className="ob-check"><input type="checkbox" checked={sel[i]} onChange={() => setSel(sel.map((x, j) => (j === i ? !x : x)))} /><i /><span><P5Tag tone="ink">{k}</P5Tag></span></label><div><small>当前</small><s>{a}</s></div><div><small>建议</small><b>{b}</b></div></li>
        ))}</ul>
      )}
      <div className="ob-acts"><ObBtn tone="paper" seed={552} onClick={onClose}>取消</ObBtn><ObBtn seed={553} size="lg" disabled={!n} onClick={() => { toast('已覆写所选成就/技能名称，可还原到覆写前版本'); onClose(); }}>应用 {n} 项</ObBtn></div>
    </ObSheet>
  );
}
