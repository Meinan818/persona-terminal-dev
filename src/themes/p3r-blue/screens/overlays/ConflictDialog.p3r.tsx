/**
 * 冲突对话框（真实 src/components/auth/ConflictDialog.tsx）：首次登录两侧都有档案。
 * 「两个房间的档案」+ 说明；本机 / 云端对照（活动/任务/同伴/总结/每日塔罗/中长期占卜、合计 N 条、最近活动）；
 * 读不到 → 「—」未知 + 重试（?state=unknown）；建议；警示；「从云端下载并覆盖」「上传本地数据覆盖云端」「稍后再决定」。
 * 外观：P3R Status 对照表（两张拼贴卡并排，大号斜体数字）。
 */
import { useState } from 'react';
import type { OverlayProps } from '@blue/registry/types';
import { P6Dialog } from '@blue/screens/pkg6/dialog';
import { CONFLICT_ROWS } from '@blue/adapters/pkg6';
import { useToast } from '@blue/kit';
import { cx } from '@blue/lib/cx';

function Side({ title, name, rows, total, latest, loading, unknown, tone }: { title: string; name: string; rows: { label: string; v: number }[]; total: number; latest: string; loading: boolean; unknown: boolean; tone: 'local' | 'cloud' }) {
  return (
    <div className={cx('min-w-0 overflow-hidden rounded-none border-2 border-p3r-lilac/50', tone === 'local' ? 'bg-p3r-rose text-p3r-on-rose' : 'bg-p3r-blush-faint text-p3r-ink')}>
      <div className="flex min-w-0 items-center gap-1.5 bg-p3r-ink px-2.5 py-1 text-p3r-rose"><span aria-hidden>{tone === 'local' ? '机' : '云'}</span><b className="font-heavy text-body">{title}</b></div>
      <div className="px-2.5 py-1.5">
        <div className="truncate text-meta font-bold">{name}</div>
        <ul className="mt-1 grid grid-cols-1 gap-px">
          {rows.map((r) => <li key={r.label} className="flex min-w-0 items-baseline justify-between gap-2 text-meta"><span className="truncate">{r.label}</span><span className="font-cond tabular shrink-0 text-body">{unknown ? '—' : r.v}</span></li>)}
        </ul>
        <div className="mt-1.5 border-t-2 border-dashed border-p3r-lilac/30 pt-1 text-meta font-bold">{loading ? '读取中…' : `合计 ${unknown ? '—' : total} 条`}</div>
        <div className="text-2xs opacity-75">最近活动：{latest}</div>
      </div>
    </div>
  );
}

export default function ConflictDialog({ open, onClose, params }: OverlayProps) {
  const toast = useToast();
  const [unknown, setUnknown] = useState(params?.get('state') === 'unknown');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<'pull' | 'push' | null>(null);
  const local = CONFLICT_ROWS.map((r) => ({ label: r.label, v: r.local }));
  const cloud = CONFLICT_ROWS.map((r) => ({ label: r.label, v: r.cloud }));
  const lt = local.reduce((a, b) => a + b.v, 0), ct = cloud.reduce((a, b) => a + b.v, 0);
  const run = (k: 'pull' | 'push') => { setBusy(k); setTimeout(() => { setBusy(null); toast.success(k === 'pull' ? '已从云端下载并覆盖' : '已上传本地数据覆盖云端'); onClose(); }, 1000); };
  return (
    <P6Dialog open={open} onClose={onClose} wide speaker="云同步" icon="⌂" title="两个房间的档案" description="本机与云端都有档案。看一眼两边的大致情况，选择保留哪一份" busy={!!busy} busyText="处理中…" dismissible={false}
      choices={[{ id: 'pull', label: busy === 'pull' ? '处理中…' : '从云端下载并覆盖', hint: '保留云端档案 · 本机现有数据会被替换', primary: true }, { id: 'push', label: busy === 'push' ? '处理中…' : '上传本地数据覆盖云端', hint: '保留本机档案 · 云端现有数据会被替换' }, { id: 'later', label: '稍后再决定' }]}
      onChoice={(id) => (id === 'later' ? onClose() : run(id as 'pull' | 'push'))}>
      <div className="grid grid-cols-2 gap-2">
        <Side title="本机" name="结城理" rows={local} total={lt} latest="刚刚" loading={loading} unknown={unknown} tone="local" />
        <Side title="云端" name="云端档案" rows={cloud} total={ct} latest="3 天前" loading={loading} unknown={unknown} tone="cloud" />
      </div>
      {unknown ? (
        <div className="mt-2 rounded-none border-2 border-p3r-coral px-3 py-2 text-meta leading-relaxed">
          没能读到两侧的条目数（网络或登录态问题）。上面的「—」表示<strong className="text-p3r-rose">未知</strong>，不是 0；在读到数字之前，请不要凭这一屏做覆盖决定。
          <button type="button" onClick={() => { setLoading(true); setTimeout(() => { setLoading(false); setUnknown(false); }, 900); }} className="ml-2 rounded-none bg-p3r-rose px-2 py-0.5 font-heavy font-bold text-p3r-on-rose">{loading ? '读取中…' : '重试'}</button>
        </div>
      ) : (
        <p className="mt-2 text-meta leading-relaxed">建议：总条目数看上去<b className="text-p3r-rose">{lt >= ct ? '本机更多' : '云端更多'}</b>，如果不确定，优先选<b className="text-p3r-rose">{lt >= ct ? '「保留本机」' : '「保留云端」'}</b></p>
      )}
      <p className="mt-2 rounded-none bg-p3r-coral/85 px-3 py-2 text-meta font-bold text-p3r-on-ink">！ 被覆盖的一侧将永久消失，无法恢复。若想保险一点，可先到"设置 → 数据管理"导出本机备份。</p>
    </P6Dialog>
  );
}
