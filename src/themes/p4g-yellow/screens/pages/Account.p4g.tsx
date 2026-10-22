/**
 * 账号与数据（真实 src/pages/Account.tsx + components/settings/ImagesBackupBlock.tsx + auth/*）P4G 重制。
 * 数据管理 · DATA：提示条（可关）/ 备份导出（下载备份·复制 JSON·下载链接）/ 从备份恢复（粘贴 JSON·选文件/拖拽·确认导入）/ 记录配图 · 单独备份 / 危险区域（重置所有数据）
 * 云同步 · CLOUD：已登录（资料卡 + 账号管理 + UserID 横幅 + 总点数浮层 + 最近同步 / 立即同步到云端 · ↓ 拉取 · 和云端对一对 / 数据类目选择 / 退出登录 · 永久删除云端账号）
 *               未登录（说明 + 登录云端）/ 登录已失效（重新登录）/ 未配置。
 * 路由：?state=signed-in|signed-out|expired|unconfigured|no-uid|sync-error  ?sec=data|privacy
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { PageProps } from '@yellow/registry/types';
import { P4PageHeader, P4Section, P4Card, P4Button, P4Textarea, P4Avatar, IconClose, useToast } from '@yellow/kit';
import { CollageStagger, CollageItem, SignalGlitch } from '@yellow/fx';
import { navigate } from '@yellow/shell/shellBus';
import { cx } from '@yellow/lib/cx';
import { DevStateBar } from '@yellow/screens/pkg5/ui';
import { usePresence } from '@yellow/screens/pkg5/presence';
import { LoginModalView } from '@yellow/screens/overlays/LoginModal.p4g';
import { AccountManagePanelView } from '@yellow/screens/overlays/AccountManagePanel.p4g';
import { SyncPrivacySection } from '@yellow/screens/overlays/SyncPrivacyPanel.p4g';
import { AccountConfirmView, type ConfirmKind } from '@yellow/screens/overlays/AccountConfirms.p4g';
import { ATTRIBUTES, CLOUD_USER, TOTAL_LEVEL, TOTAL_POINTS } from '@yellow/mock/pkg5';

const Sub = ({ children }: { children: ReactNode }) => (
  <p className="mb-2 flex items-center gap-2 font-display text-body font-bold text-p4g-ink"><span aria-hidden className="h-4 w-2 -skew-x-12 bg-p4g-orange" />{children}</p>
);

export default function Account({ params }: PageProps) {
  const toast = useToast();
  const p = usePresence();
  const [state, setState] = useState(params.get('state') ?? 'signed-in');
  const [tip, setTip] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<null | 'ok' | 'err'>(null);
  const [link, setLink] = useState<null | { name: string; size: string }>(null);
  const [importJson, setImportJson] = useState('');
  const [fileLoaded, setFileLoaded] = useState(false);
  const [drag, setDrag] = useState(false);
  const [importing, setImporting] = useState(false);
  const [imgMsg, setImgMsg] = useState<string | null>(null);
  const [imgBusy, setImgBusy] = useState(false);
  const [uidCopied, setUidCopied] = useState(false);
  const [points, setPoints] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>('3 分钟前');
  const [confirm, setConfirm] = useState<ConfirmKind | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [login, setLogin] = useState(false);
  const [manage, setManage] = useState(false);
  const [uid, setUid] = useState<string | null>(CLOUD_USER.username);
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const dataRef = useRef<HTMLDivElement>(null);
  const privRef = useRef<HTMLDivElement>(null);
  const cloudRef = useRef<HTMLDivElement>(null);
  const sec = params.get('sec');
  // 演示：带 ?state=（登录态）但没指定 ?sec= 时，直接滚到「云同步」节，让该状态出现在首屏
  const focus = sec ?? (params.get('state') ? 'cloud' : null);
  useEffect(() => { const el = focus === 'data' ? dataRef.current : focus === 'privacy' ? privRef.current : focus === 'cloud' ? cloudRef.current : null; if (el) window.setTimeout(() => el.scrollIntoView({ block: 'start' }), 350); }, [focus]);
  useEffect(() => { setUid(state === 'no-uid' ? null : CLOUD_USER.username); }, [state]);
  const ask = (k: ConfirmKind) => { setConfirm(k); setConfirmOpen(true); };
  const signedIn = state === 'signed-in' || state === 'no-uid' || state === 'sync-error';

  const download = () => { const blob = new Blob([JSON.stringify({ user: { name: p.name }, attributes: ATTRIBUTES }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'maskaria-backup-2026-10-20.json'; a.click(); setLink({ name: 'maskaria-backup-2026-10-20.json', size: '186 KB' }); setTimeout(() => URL.revokeObjectURL(url), 2000); };
  const copyJson = () => { const s = JSON.stringify({ user: { name: p.name } }); (navigator.clipboard?.writeText(s) ?? Promise.reject()).then(() => { setCopyState('ok'); setMsg('已复制到剪贴板（186 KB）'); }, () => { setCopyState('err'); setMsg('复制失败，请尝试下载'); }); setTimeout(() => setCopyState(null), 1800); };
  const readFile = (f: File) => { const r = new FileReader(); r.onload = () => { setImportJson(String(r.result).slice(0, 4000)); setFileLoaded(true); }; r.onerror = () => setMsg('读取备份文件失败'); r.readAsText(f); };
  const doImport = () => { setImporting(true); window.setTimeout(() => { setImporting(false); if (!importJson.trim().startsWith('{')) { setMsg('导入失败：不是有效的备份 JSON'); return; } setMsg('导入成功！数据已恢复。'); setImportJson(''); setFileLoaded(false); }, 900); };

  return (
    <>
      <P4PageHeader title="账号与数据" en="ACCOUNT · DATA" onBack={() => navigate('menu')} hud={false} />
      <CollageStagger className="flex min-w-0 flex-col gap-7">
        {/* ── 数据管理 ── */}
        <CollageItem>
          <div ref={dataRef} className="scroll-mt-4">
            <P4Section title="数据管理" en="DATA">
              <div className="flex min-w-0 flex-col gap-4">
                {(tip || msg) && (
                  <div className="flex min-w-0 items-start gap-2 rounded-sm border-3 border-p4g-black bg-p4g-yellow px-3 py-2.5 text-p4g-black shadow-hard-sm">
                    <span aria-hidden className="mt-0.5 h-4 w-4 shrink-0 border-y-2 border-p4g-black p4g-hazard" />
                    <span className="min-w-0 flex-1 text-meta font-bold leading-relaxed">{msg ?? '数据保存在本地，已构建防护但以防万一如需清理浏览器缓存请注意备份数据哦'}</span>
                    <button type="button" aria-label="关闭提示" onClick={() => { if (msg) setMsg(null); else setTip(false); }} className="flex h-7 w-7 shrink-0 items-center justify-center"><IconClose size={14} /></button>
                  </div>
                )}
                <P4Card tone="paper">
                  <Sub>备份导出</Sub>
                  <div className="grid grid-cols-2 gap-2">
                    <P4Button variant="black" onClick={download}>下载备份</P4Button>
                    <P4Button variant="secondary" onClick={copyJson}>{copyState === 'ok' ? '已复制' : copyState === 'err' ? '复制失败' : '复制 JSON'}</P4Button>
                  </div>
                  {link && (
                    <div className="mt-2 flex min-w-0 items-center gap-2 rounded-xs border-thin border-p4g-line bg-p4g-surface px-2.5 py-2">
                      <span className="min-w-0 flex-1"><span className="block truncate font-display text-meta font-bold text-p4g-ink">{link.name}</span><span className="block text-2xs text-p4g-ink-soft">{link.size} · 点击打开或另存为</span></span>
                      <button type="button" aria-label="关闭下载提示" onClick={() => setLink(null)} className="shrink-0 p-1 text-p4g-ink"><IconClose size={12} /></button>
                    </div>
                  )}
                  <p className="mt-2 text-meta text-p4g-ink-soft">背景图与 API Key 不含在备份中。</p>
                </P4Card>
                <P4Card tone="paper">
                  <Sub>从备份恢复</Sub>
                  <P4Textarea rows={4} value={importJson} onChange={(e) => { setImportJson(e.target.value); setFileLoaded(false); }} placeholder='粘贴备份 JSON 文本（以 {"user":... 开头）' className="text-meta" />
                  <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) readFile(f); }} />
                  <button type="button" onClick={() => fileRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) readFile(f); }}
                    className={cx('mt-2 flex h-14 w-full min-w-0 items-center justify-center gap-2 rounded-sm border-3 border-dashed font-display text-body font-bold transition-transform', drag ? 'scale-[1.01] border-p4g-orange bg-p4g-yellow text-p4g-black' : fileLoaded ? 'border-p4g-success text-p4g-success' : 'border-p4g-line text-p4g-ink')}>
                    {fileLoaded ? '✓ 文件已加载' : <>📁 选择备份文件 <span className="opacity-60">或拖拽</span></>}
                  </button>
                  <P4Button variant="danger" block className="mt-2" disabled={!importJson.trim() || importing} onClick={doImport}>{importing ? '正在导入…' : '确认导入（会覆盖当前数据）'}</P4Button>
                  <p className="mt-2 text-meta font-bold text-p4g-danger">⚠️ 导入会清空并覆盖当前所有数据，操作前请先导出备份。</p>
                </P4Card>
                <P4Card tone="surface">
                  <div className="mb-1 flex min-w-0 items-baseline justify-between gap-2"><Sub>记录配图 · 单独备份</Sub><span className="shrink-0 p4g-num text-meta text-p4g-ink-soft">128 张 · 约 46.2 MB</span></div>
                  <p className="text-meta leading-relaxed text-p4g-ink-soft">图片不在主备份里，也不上云。换机时先导主备份恢复记录，再导图片包，图片会按记录挂回去。</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <P4Button variant="secondary" disabled={imgBusy} onClick={() => { setImgBusy(true); setTimeout(() => { setImgBusy(false); setImgMsg('图片包已生成：128 张，46.2 MB'); }, 900); }}>{imgBusy ? '处理中…' : '导出图片包'}</P4Button>
                    <P4Button variant="secondary" onClick={() => imgRef.current?.click()}>导入图片包</P4Button>
                  </div>
                  <input ref={imgRef} type="file" accept=".zip,application/zip,application/json" className="hidden" onChange={(e) => { e.target.value = ''; setImgMsg('已导入 120 张，跳过重复 6 张，2 张找不到所属记录（先导主备份再导图片包）'); }} />
                  {imgMsg && <p className="mt-2 rounded-xs bg-p4g-surface-2 px-2 py-1.5 text-meta font-bold text-p4g-ink">{imgMsg}{imgMsg.startsWith('图片包') && <span className="block text-2xs font-normal text-p4g-ink-soft">maskaria-images.zip（46.2 MB）· 点击另存为</span>}</p>}
                </P4Card>
                <div className="rounded-sm border-3 border-p4g-danger bg-p4g-surface-2 p-4">
                  <div className="mb-2 flex items-center gap-2"><span className="h-3 w-12 border-y-2 border-p4g-black p4g-hazard" /><span className="font-display text-meta font-bold tracking-widest text-p4g-danger">危险区域</span></div>
                  <P4Button variant="danger" block size="lg" onClick={() => ask('reset')}>重置所有数据</P4Button>
                  <p className="mt-2 text-meta font-bold text-p4g-danger">删除全部数据，无法恢复。</p>
                </div>
              </div>
            </P4Section>
          </div>
        </CollageItem>

        {/* ── 云同步 ── */}
        <CollageItem>
          <div ref={cloudRef} className="scroll-mt-4">
          <P4Section title="云同步" en="CLOUD">
            {state === 'unconfigured' ? (
              <P4Card tone="paper"><p className="text-body text-p4g-ink">云同步功能未配置。如需启用，请在 <code className="rounded-xs bg-p4g-black px-1.5 py-0.5 font-mono text-meta text-p4g-yellow">.env.local</code> 中设置 <code className="rounded-xs bg-p4g-orange px-1.5 py-0.5 font-mono text-meta text-p4g-black">VITE_PB_URL</code>。</p></P4Card>
            ) : !signedIn ? (
              <div className="flex min-w-0 flex-col gap-3">
                {state === 'expired' && (
                  <SignalGlitch active className="rounded-sm">
                    <div className="flex min-w-0 items-start gap-3 rounded-sm border-3 border-p4g-black bg-p4g-red px-4 py-3 text-white shadow-hard">
                      <span aria-hidden className="shrink-0 rounded-xs bg-p4g-black px-1.5 py-0.5 font-display text-2xs font-bold tracking-widest text-p4g-yellow">NO SIGNAL</span>
                      <div className="min-w-0"><p className="font-display text-body font-bold">云端登录已失效</p><p className="mt-0.5 text-meta leading-relaxed opacity-90">本机数据仍在。重新登录即可继续同步。</p></div>
                    </div>
                  </SignalGlitch>
                )}
                <P4Card tone="msg" className="w-full">
                  <p className="text-body leading-relaxed"><span className="mr-1 text-p4g-yellow">&gt;</span>登录后，您在本机的数据可以同步到云端，让多台设备共享同一份成长记录。</p>
                  <p className="mt-2 text-center text-meta font-bold text-p4g-yellow">— 登录仅需邮箱验证码，不需要密码 —</p>
                </P4Card>
                <P4Button size="lg" block onClick={() => setLogin(true)}>{state === 'expired' ? '重新登录' : '登录云端'}</P4Button>
              </div>
            ) : (
              <div className="flex min-w-0 flex-col gap-3">
                {/* 资料卡 */}
                <div className="relative min-w-0 overflow-visible rounded-sm border-3 border-p4g-black bg-p4g-black p-4 text-white shadow-hard-lg night:border-p4g-yellow">
                  <div aria-hidden className="absolute inset-x-0 top-0 h-2 p4g-candy-h" />
                  <div className="mt-1 flex min-w-0 items-center gap-3">
                    <P4Avatar src={p.avatar ?? undefined} name={p.name || '?'} size={56} ring="yellow" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-display text-h3 font-bold">{p.name || '未命名的客人'}</div>
                      {uid && (
                        <button type="button" title="点击复制" onClick={() => { navigator.clipboard?.writeText(uid).catch(() => undefined); setUidCopied(true); setTimeout(() => setUidCopied(false), 1500); }} className="flex max-w-full items-center gap-1 font-display text-meta font-bold text-p4g-yellow">
                          <span className="opacity-70">@</span><span className="truncate font-mono">{uid}</span><span className="shrink-0 text-2xs opacity-80">{uidCopied ? '✓ 已复制' : '· 点击复制'}</span>
                        </button>
                      )}
                      <div className="mt-0.5 truncate text-2xs text-white/70">☁ {CLOUD_USER.email}</div>
                    </div>
                    <button type="button" aria-label="账号管理" title="账号管理" onClick={() => setManage(true)} className="p4g-press relative flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border-3 border-p4g-yellow bg-p4g-yellow font-display text-h3 text-p4g-black">
                      ⚙{!uid && <span className="absolute -right-1.5 -top-1.5 h-3 w-3 rounded-pill border-2 border-p4g-black bg-p4g-red" />}
                    </button>
                  </div>
                  {!uid && (
                    <div className="mt-3 flex min-w-0 items-start gap-2 rounded-sm border-thin border-p4g-orange bg-p4g-orange/20 p-2.5">
                      <span className="text-body leading-none text-p4g-orange">⚠</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-meta font-bold leading-relaxed text-p4g-orange">你还没设置 UserID，好友系统无法找到你。</div>
                        <button type="button" onClick={() => setManage(true)} className="mt-0.5 font-display text-meta font-bold text-p4g-yellow underline decoration-2 underline-offset-4">现在就设一个 →</button>
                      </div>
                    </div>
                  )}
                  <div className="relative mt-3 flex min-w-0 items-center justify-between gap-2">
                    <button type="button" aria-label="查看总点数" onClick={() => setPoints((v) => !v)} className="p4g-press shrink-0 rounded-pill bg-p4g-yellow px-3 py-1 p4g-num text-meta text-p4g-black">LV {TOTAL_LEVEL} ▾</button>
                    <span className="min-w-0 truncate text-meta text-white/80">{syncing ? '同步中…' : lastSync ? `最近同步：${lastSync}` : '尚未同步'}</span>
                    {points && (
                      <div className="absolute left-0 top-10 z-10 w-60 rounded-sm border-3 border-p4g-black bg-p4g-surface-2 p-3 text-p4g-ink shadow-hard night:border-p4g-yellow">
                        <div className="mb-2 flex items-center justify-between">
                          <div><div className="font-display text-2xs font-bold tracking-widest text-p4g-ink-soft">总点数</div><div className="p4g-num text-h2 text-[color:var(--p4g-rank)]">{TOTAL_POINTS}</div></div>
                          <button type="button" aria-label="关闭" onClick={() => setPoints(false)} className="p-1"><IconClose size={14} /></button>
                        </div>
                        <div className="flex flex-col gap-1 border-t-2 pt-1.5" style={{ borderColor: 'var(--p4g-line-soft)' }}>
                          {ATTRIBUTES.map((a) => <div key={a.id} className="flex justify-between text-meta"><span className="font-bold">{a.displayName}</span><span className="p4g-num">{a.points}<span className="ml-1 text-2xs text-p4g-ink-soft">· Lv.{a.level}</span></span></div>)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {state === 'sync-error' && <p role="alert" className="rounded-sm border-3 border-p4g-black bg-p4g-red px-3 py-2 text-meta font-bold text-white">同步失败：网络连接失败，请稍后再试</p>}
                <div className="grid min-w-0 grid-cols-[1fr_auto] gap-2">
                  <P4Button size="lg" disabled={syncing} onClick={() => { setSyncing(true); setTimeout(() => { setSyncing(false); setLastSync('刚刚'); toast.success('已同步到云端'); }, 1200); }}>{syncing ? '同步中…' : '立即同步到云端'}</P4Button>
                  <P4Button size="lg" variant="secondary" disabled={syncing} onClick={() => ask('pull')}>↓ 拉取</P4Button>
                </div>
                <P4Button variant="black" block disabled={syncing} onClick={() => { window.location.hash = '#/overlay/account-sync-merge'; }}>和云端对一对（查阅并合并，避免误覆盖）</P4Button>
                <div ref={privRef} className="scroll-mt-4"><SyncPrivacySection defaultOpen={sec === 'privacy'} /></div>
                <P4Button variant="secondary" block onClick={() => ask('logout')}>退出登录</P4Button>
                <div className="text-center"><button type="button" onClick={() => ask('delete')} className="font-display text-meta font-bold text-p4g-danger underline decoration-2 underline-offset-4">永久删除云端账号</button></div>
              </div>
            )}
          </P4Section>
          </div>
        </CollageItem>
      </CollageStagger>

      <DevStateBar value={state} onChange={setState} items={[{ id: 'signed-in', label: '已登录' }, { id: 'no-uid', label: '未设 UserID' }, { id: 'sync-error', label: '同步失败' }, { id: 'signed-out', label: '未登录' }, { id: 'expired', label: '登录已失效' }, { id: 'unconfigured', label: '未配置' }]} />

      <AccountConfirmView kind={confirm} open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={(k) => { toast.success(({ reset: '数据已重置', pull: '已从云端拉取', logout: '已退出登录', delete: '云端账号已删除' })[k]); if (k === 'logout' || k === 'delete') setState('signed-out'); }} />
      <LoginModalView open={login} onClose={() => setLogin(false)} needConsent={state !== 'expired'} onLoggedIn={() => { setState('signed-in'); toast.success('欢迎回来'); }} />
      <AccountManagePanelView open={manage} onClose={() => setManage(false)} userId={uid} onUserIdChange={(v) => setUid(v)} />
    </>
  );
}
