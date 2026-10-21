/**
 * 写一句鼓励（弹幕投稿，真实 src/components/danmaku/DanmakuCompose.tsx，居中 SheetModal）：
 * 说明「匿名发送弹幕鼓励一同努力的人，审核通过将会发出，慎言即可。还剩 N 次机会。」；输入（比如：我也熬过来了，你可以的）；送出鼓励（送出中…）；
 * 成功「已送出。过审后，它会出现在同样卡住的人面前。」+「好」；冷却 / 无机会提示。?state=cooldown|empty|done
 * 送出成功 → 这一句作为「我的」弹幕从右侧飞入（演出直达：#/overlay/global-danmaku-layer?fx=send）。
 */
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@blue/registry/types';
import { P3Button, P3Field, P3Sheet, P3Textarea, P3R, slantClip } from '@blue/kit';
import { DanmakuLayer } from '@blue/screens/pkg2/cutins';

export default function DanmakuCompose({ open, onClose, params, tokens: tk, onSent }: OverlayProps & { tokens?: number; onSent?: (text: string) => void }) {
  const st = params?.get('state');
  const [tokens, setTokens] = useState(tk ?? (st === 'empty' ? 0 : 2));
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(st === 'done' ? '我也熬过来了，你可以的' : null);
  const [error, setError] = useState<string | null>(st === 'empty' ? '暂时没有鼓励机会了' : null);
  useEffect(() => { if (open) { setText(''); setDone(st === 'done' ? '我也熬过来了，你可以的' : null); setError(st === 'empty' ? '暂时没有鼓励机会了' : null); } }, [open]); // eslint-disable-line
  const send = () => {
    if (busy) return;
    if (tokens <= 0) { setError('暂时没有鼓励机会了'); return; }
    if (st === 'cooldown') { setError('还要等 3 天才能再发一条——留点时间给上一句'); return; }
    setBusy(true);
    window.setTimeout(() => { setBusy(false); setTokens((t) => t - 1); setDone(text.trim()); onSent?.(text.trim()); }, 900);
  };
  return (
    <P3Sheet open={open} onClose={onClose} position="center" title="写一句鼓励" en="ANONYMOUS" busy={busy}>
      {done ? (
        <div className="relative space-y-3">
          <div className="relative h-16 overflow-hidden" style={{ background: 'var(--p3r-mulberry)', clipPath: slantClip(10) }}>
            <DanmakuLayer items={[{ id: '', text: done, mine: true }, { id: '', text: '今天也辛苦了' }]} topBase={14} topStep={44} durBase={6} durStep={3} />
          </div>
          <p className="text-[15px] font-black" style={{ color: P3R.ink }}>已送出。过审后，它会出现在同样卡住的人面前。</p>
          <p className="text-[12px]" style={{ color: P3R.grey }}>过审后下次打开时会告诉你。</p>
          <P3Button block corner onClick={onClose}>好</P3Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[13px] leading-relaxed" style={{ color: P3R.inkSoft }}>匿名发送弹幕鼓励一同努力的人，审核通过将会发出，慎言即可。还剩 <b className="font-cond text-[16px]" style={{ color: P3R.roseInk }}>{tokens}</b> 次机会。</p>
          <P3Field count={`${text.length}/30`}><P3Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="比如：我也熬过来了，你可以的" maxLength={30} rows={2} aria-label="鼓励的话" /></P3Field>
          {error && <p className="text-[12px] font-black" style={{ color: 'var(--p3r-coral-ink)' }}>{error}</p>}
          <P3Button block size="lg" corner disabled={!text.trim() || tokens <= 0} busy={busy} busyText="送出中…" onClick={send}>送出鼓励</P3Button>
        </div>
      )}
    </P3Sheet>
  );
}
