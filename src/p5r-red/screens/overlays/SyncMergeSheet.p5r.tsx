/**
 * SyncMergeSheet 和云端对一对（真实 src/components/auth/SyncMergeSheet.tsx：推送时发现云端在别处改过 / 账号页「和云端对一对」）。
 * 视觉 = v3 b.js openMerge。?state=ready（对账完成）| loading（正在对账）| same（两边一样）| done（合并完成）| error（对账失败）。
 */
import { useState } from 'react';
import type { OverlayProps } from '@/p5r-red/registry/types';
import { ObSheet, ObMsg, ObNote, ObSeg, BusyBtn, ObBtn, useMsgBox } from './ObKit';

const MG: [string, number, number, number, number, number, string[], string[], string[]][] = [['成长记录', 412, 398, 16, 2, 3, ['10.19 晨跑 5 公里', '10.18 读书 2 小时'], ['10.12 吉他练习'], ['10.17 整理房间']], ['任务', 36, 41, 0, 5, 1, [], ['周末去美术馆', '背 50 个单词'], ['晨跑 5 公里']], ['同伴', 6, 6, 0, 0, 0, [], [], []]];
export default function SyncMergeSheet({ open, onClose, params }: OverlayProps) {
  const [st, setSt] = useState(params?.get('state') ?? 'ready');
  const [msg, setMsg] = useMsgBox();
  const dis = st !== 'ready';
  return (
    <ObSheet open={open} onClose={onClose} title="和云端对一对" seed={241} wide states={[['ready', '对账完成'], ['loading', '正在对账'], ['same', '两边一样'], ['done', '合并完成'], ['error', '对账失败']]} state={st} onState={setSt}>
      {st === 'done' ? (
        <><ObMsg kind="ok">合并完成：留下本机独有 16 条、云端独有 7 条，两边不同的 4 条按本机；已经推到云端。</ObMsg><div className="ob-acts"><ObBtn seed={242} size="lg" onClick={onClose}>好</ObBtn></div></>
      ) : (
        <>
          <p className="ob-p">推送时发现云端的成长记录、任务在别处改过。先看看两边差在哪，再决定怎么合。</p>
          {st === 'loading' && <ObMsg kind="info">正在对账…</ObMsg>}
          {st === 'error' && <ObMsg kind="err">对账失败：网络不可用</ObMsg>}
          {st === 'same' && <ObNote>两边一样，没什么要合的。</ObNote>}
          {st === 'ready' && (
            <>
              <div className="ob-mg">{MG.filter((t) => t[3] + t[4] + t[5]).map(([l, a, b, ol, oc, cf, sl, sc, sf]) => (
                <div key={l} className="ob-mg-t"><div className="ob-mg-h"><b>{l}</b><span>本机 {a} · 云端 {b}</span>{ol ? <em className="lo">只本机 {ol}</em> : null}{oc ? <em className="cl">只云端 {oc}</em> : null}{cf ? <em className="cf">不同 {cf}</em> : null}</div>
                  <div className="ob-mg-s">{sl.length ? <p><b className="lo">只本机：</b>{sl.join('；')}{ol > sl.length ? ' …' : ''}</p> : null}{sc.length ? <p><b className="cl">只云端：</b>{sc.join('；')}</p> : null}{sf.length ? <p><b className="cf">两边不同：</b>{sf.join('；')}</p> : null}</div>
                  {oc ? <label className="ob-check"><input type="checkbox" /><i /><span>合并时丢掉云端多出来的 {oc} 条（确认是我在这台设备上删掉的）</span></label> : null}</div>
              ))}</div>
              <div className="ob-row"><div className="ob-row-m"><b>两边都改过的 4 条，用哪边</b></div><div className="ob-row-c"><ObSeg opts={[['local', '本机'], ['cloud', '云端']]} sel="local" aria="冲突取哪边" /></div></div>
            </>
          )}
          <div className="ob-acts three">
            <BusyBtn label="以云端为准" busy="拉取中…" tone="paper" seed={243} disabled={dis} to={setMsg} msg="已用云端数据覆盖本机。" />
            <BusyBtn label="以本机为准" busy="推送中…" tone="paper" seed={244} disabled={dis} to={setMsg} msg="已用本机数据覆盖云端。" />
            <ObBtn seed={245} size="lg" disabled={dis} onClick={() => setSt('done')}>合并</ObBtn>
          </div>
          {msg}
          <ObNote>合并 = 两边都留：只本机有的留，只云端有的默认留（可按表丢弃），两边不同的按上面选的一边；成就和技能取解锁的那边，同一天的任务完成取次数多的。合并完会推到云端。</ObNote>
        </>
      )}
    </ObSheet>
  );
}
