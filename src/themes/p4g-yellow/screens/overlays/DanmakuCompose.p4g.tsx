/**
 * 写一句鼓励（弹幕投稿，真实 src/components/danmaku/DanmakuCompose.tsx，居中 SheetModal）：
 * 说明「匿名发送弹幕鼓励一同努力的人，审核通过将会发出，慎言即可。还剩 N 次机会。」；输入；送出鼓励（送出中…）；
 * 成功「已送出。过审后，它会出现在同样卡住的人面前。」「过审后下次打开时会告诉你。」+「好」；
 * 冷却「还要等 N 天才能再发一条——留点时间给上一句」/ 无机会「暂时没有鼓励机会了」。?state=cooldown|empty|done
 */
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Button, P4Dialog, P4Textarea } from '@yellow/kit';

export default function DanmakuCompose({ open, onClose, params, tokens: tk }: OverlayProps & { tokens?: number }) {
  const st = params?.get('state');
  const [tokens, setTokens] = useState(tk ?? (st === 'empty' ? 0 : 2));
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(st === 'done');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (open) { setText(''); setDone(st === 'done'); setError(null); } }, [open]); // eslint-disable-line
  const send = () => {
    if (busy) return;
    if (tokens <= 0) { setError('暂时没有鼓励机会了'); return; }
    if (st === 'cooldown') { setError('还要等 3 天才能再发一条——留点时间给上一句'); return; }
    setBusy(true);
    setTimeout(() => { setBusy(false); setTokens((t) => t - 1); setDone(true); }, 700);
  };
  return (
    <P4Dialog open={open} onClose={onClose} title="写一句鼓励" speaker="匿名弹幕" actions="none" role="dialog">
      {done ? (
        <div className="space-y-3">
          <p className="text-body font-bold text-[color:var(--p4g-msg-ink)]">已送出。过审后，它会出现在同样卡住的人面前。</p>
          <p className="text-meta text-[color:var(--p4g-msg-ink)]/75">过审后下次打开时会告诉你。</p>
          <P4Button block onClick={onClose}>好</P4Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-meta leading-relaxed text-[color:var(--p4g-msg-ink)]/85">匿名发送弹幕鼓励一同努力的人，审核通过将会发出，慎言即可。还剩 <b className="p4g-num text-p4g-yellow">{tokens}</b> 次机会。</p>
          <P4Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="比如：我也熬过来了，你可以的" maxLength={30} showCount rows={2} aria-label="鼓励的话" />
          {error && <p className="text-meta font-bold text-[#ff8a7a]">{error}</p>}
          <P4Button block size="lg" disabled={!text.trim() || busy} onClick={send}>{busy ? '送出中…' : '送出鼓励'}</P4Button>
        </div>
      )}
    </P4Dialog>
  );
}
