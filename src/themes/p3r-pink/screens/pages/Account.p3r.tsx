/**
 * 账号与数据（真实 src/pages/Account.tsx · p3 分支「p3-account-reference-v2」+ components/settings/ImagesBackupBlock.tsx + auth/*）粉白 P3R 重制。
 * P3PageHeader「账号与数据」→ SectionMark「数据管理 · DATA」：提示条（可关）/ 备份导出（分享/下载备份 · 复制 JSON）/ 从备份恢复（粘贴 · 选文件 / 拖拽 · 确认导入）
 *   / 记录配图 · 单独备份（导出 / 导入图片包）/ 危险区域（重置所有数据）
 * → SectionMark「云同步 · CLOUD」：已登录（资料卡：名字缺省「未命名的客人」/ UserID 点击复制 / 账号管理 / 未设 UserID「现在就设一个 →」/ 总点数浮层 / 最近同步…
 *   + 立即同步到云端 · ↓ 拉取 · 和云端对一对 + 数据类目选择 + 退出登录 · 永久删除云端账号）/ 未登录（说明 + 登录云端）/ 登录已失效（重新登录）/ 未配置。
 * 路由：?state=signed-in|signed-out|expired|unconfigured|no-uid|sync-error|syncing  ?sec=data|privacy|cloud。状态机改写自黄色版（只读参考）。
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { PageProps } from '@pink/registry/types';
import { P3PageHeader, SectionMark, P3Button, P3Textarea, P3Avatar, P3R, slantClip, tickClip, IconClose, useToast } from '@pink/kit';
import { P3Stagger, P3StaggerItem } from '@pink/fx';
import { navigate } from '@pink/shell/shellBus';
import { usePresence } from '@pink/screens/pkg5/presence';
import { GlassSlab } from '@pink/screens/pkg5/ui';
import { LoginModalView } from '@pink/screens/overlays/LoginModal.p3r';
import { AccountManagePanelView } from '@pink/screens/overlays/AccountManagePanel.p3r';
import { SyncPrivacySection } from '@pink/screens/overlays/SyncPrivacyPanel.p3r';
import { AccountConfirmView, type ConfirmKind } from '@pink/screens/overlays/AccountConfirms.p3r';
import { ATTRIBUTES, CLOUD_USER, TOTAL_LEVEL, TOTAL_POINTS } from '@pink/adapters/pkg5';

const Sub = ({ children, right }: { children: ReactNode; right?: ReactNode }) => (
  <div className="mb-2 flex min-w-0 items-center gap-2">
    <span aria-hidden className="h-[13px] w-[9px] shrink-0" style={{ background: P3R.blue, clipPath: 'polygon(32% 0, 100% 0, 68% 100%, 0 100%)' }} />
    <span className="min-w-0 truncate text-[15px] font-black" style={{ color: P3R.ink }}>{children}</span>
    {right && <span className="ml-auto shrink-0">{right}</span>}
  </div>
);
const Card = ({ children, tone }: { children: ReactNode; tone?: 'danger' }) => (
  <GlassSlab cut={14} style={tone === 'danger' ? { filter: 'none' } : undefined}>
    <div className="px-6 py-4" style={tone === 'danger' ? { background: 'rgb(var(--p3r-magenta-rgb) / 0.1)' } : undefined}>{children}</div>
  </GlassSlab>
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
  const [syncing, setSyncing] = useState(params.get('state') === 'syncing');
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
  const focus = sec ?? (params.get('state') ? 'cloud' : null);
  useEffect(() => { const el = focus === 'data' ? dataRef.current : focus === 'privacy' ? privRef.current : focus === 'cloud' ? cloudRef.current : null; if (el) window.setTimeout(() => el.scrollIntoView({ block: 'start' }), 380); }, [focus]);
  useEffect(() => { setUid(state === 'no-uid' ? null : CLOUD_USER.username); }, [state]);
  const ask = (k: ConfirmKind) => { setConfirm(k); setConfirmOpen(true); };
  const signedIn = state === 'signed-in' || state === 'no-uid' || state === 'sync-error' || state === 'syncing';
  const download = () => {
    const blob = new Blob([JSON.stringify({ user: { name: p.name }, attributes: ATTRIBUTES }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'maskaria-backup-2026-10-20.json'; a.click(); window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    setLink({ name: 'maskaria-backup-2026-10-20.json', size: '186 KB' });
  };
  const copyJson = () => {
    const s = JSON.stringify({ user: { name: p.name } });
    (navigator.clipboard ? navigator.clipboard.writeText(s) : Promise.reject(new Error('no clipboard'))).then(() => { setCopyState('ok'); setMsg('已复制到剪贴板（186 KB）'); }, () => { setCopyState('err'); setMsg('复制失败，请尝试「下载备份」'); });
    window.setTimeout(() => setCopyState(null), 1600);
  };
  const readFile = (f: File) => { const r = new FileReader(); r.onload = () => { setImportJson(String(r.result).slice(0, 4000)); setFileLoaded(true); }; r.onerror = () => setMsg('读取备份文件失败'); r.readAsText(f); };
  const doImport = () => { setImporting(true); window.setTimeout(() => { setImporting(false); if (!importJson.trim().startsWith('{')) { setMsg('导入失败：不是有效的备份 JSON'); return; } setMsg('导入成功！数据已恢复。'); setImportJson(''); setFileLoaded(false); }, 1100); };

  return (
    <div className="relative mx-auto min-w-0 max-w-2xl pb-8">
      <P3PageHeader title="账号与数据" en="ACCOUNT" onBack={() => navigate('settings')} />
      <P3Stagger className="flex min-w-0 flex-col gap-7">
        {/* ── 数据管理 ── */}
        <P3StaggerItem>
          <div ref={dataRef} className="scroll-mt-4">
            <SectionMark title="数据管理" en="DATA" tri className="mb-3" />
            <div className="flex min-w-0 flex-col gap-4">
              {(tip || msg) && (
                <div className="flex min-w-0 items-start gap-2 py-2.5 pl-5 pr-3" style={{ clipPath: slantClip(10), background: P3R.cyanPale }}>
                  <span aria-hidden className="mt-1 h-[10px] w-[12px] shrink-0" style={{ background: P3R.magenta, clipPath: tickClip }} />
                  <span className="min-w-0 flex-1 text-[13px] font-bold leading-relaxed" style={{ color: P3R.ink }}>{msg ?? '数据保存在本地，已构建防护但以防万一如需清理浏览器缓存请注意备份数据哦'}</span>
                  <button type="button" aria-label="关闭提示" onClick={() => { if (msg) setMsg(null); else setTip(false); }} className="flex h-7 w-7 shrink-0 items-center justify-center" style={{ color: P3R.inkSoft }}><IconClose size={14} /></button>
                </div>
              )}
              <Card>
                <Sub>备份导出</Sub>
                <div className="grid grid-cols-2 gap-2">
                  <P3Button tone="ink" onClick={download}>下载备份</P3Button>
                  <P3Button tone="soft" onClick={copyJson}>{copyState === 'ok' ? '已复制' : copyState === 'err' ? '复制失败' : '复制 JSON'}</P3Button>
                </div>
                {link && (
                  <div className="mt-2 flex min-w-0 items-center gap-2 py-2 pl-4 pr-2" style={{ background: 'var(--p3r-row)', clipPath: slantClip(8) }}>
                    <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-black" style={{ color: P3R.ink }}>{link.name}</span><span className="block text-[11px]" style={{ color: P3R.grey }}>{link.size} · 点击打开或另存为</span></span>
                    <button type="button" aria-label="关闭下载提示" onClick={() => setLink(null)} className="shrink-0 p-1" style={{ color: P3R.inkSoft }}><IconClose size={12} /></button>
                  </div>
                )}
                <p className="mt-2 text-[12px] font-bold" style={{ color: P3R.grey }}>背景图与 API Key 不会在备份中。</p>
              </Card>
              <Card>
                <Sub>从备份恢复</Sub>
                <P3Textarea rows={4} value={importJson} onChange={(e) => { setImportJson(e.target.value); setFileLoaded(false); }} placeholder='粘贴备份 JSON 文本（以 {"user":... 开头）' className="text-[13px]" />
                <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) readFile(f); }} />
                <button type="button" onClick={() => fileRef.current?.click()} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) readFile(f); }}
                  className="mt-2 flex h-14 w-full min-w-0 items-center justify-center gap-2 text-[14px] font-black transition-transform"
                  style={{ clipPath: slantClip(10), background: drag ? P3R.blue : fileLoaded ? P3R.cyanPale : 'transparent', color: drag ? P3R.onBlue : fileLoaded ? P3R.roseInk : P3R.inkSoft, boxShadow: drag || fileLoaded ? undefined : 'inset 0 0 0 2px rgb(var(--p3r-blue-rgb) / 0.45)', transform: drag ? 'scale(1.01)' : undefined }}>
                  {fileLoaded ? '✓ 文件已加载' : <>从文件管理器选择备份文件 <span className="opacity-60">或拖拽</span></>}
                </button>
                <P3Button tone="danger" block className="mt-2" disabled={!importJson.trim()} busy={importing} busyText="正在导入…" onClick={doImport}>确认导入（会覆盖当前数据）</P3Button>
                <p className="mt-2 text-[12px] font-black" style={{ color: 'var(--p3r-coral-ink)' }}>导入会清空并覆盖当前所有数据，操作前请先导出备份。</p>
              </Card>
              <Card>
                <Sub right={<span className="font-cond text-[13px]" style={{ color: P3R.grey }}>128 张 · 约 46.2 MB</span>}>记录配图 · 单独备份</Sub>
                <p className="text-[12px] leading-relaxed" style={{ color: P3R.inkSoft }}>图片不在主备份里，也不上云。换机时先导主备份恢复记录，再导图片包，图片会按记录挂回去。</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <P3Button tone="soft" busy={imgBusy} busyText="处理中…" onClick={() => { setImgBusy(true); setTimeout(() => { setImgBusy(false); setImgMsg('图片包已生成：128 张，46.2 MB'); }, 1000); }}>导出图片包</P3Button>
                  <P3Button tone="soft" onClick={() => imgRef.current?.click()}>从文件导入图片包</P3Button>
                </div>
                <input ref={imgRef} type="file" accept=".zip,application/zip,application/json" className="hidden" onChange={(e) => { e.target.value = ''; setImgMsg('已导入 120 张，跳过重复 6 张，2 张找不到所属记录（先导主备份再导图片包）'); }} />
                {imgMsg && <p className="mt-2 px-3 py-1.5 text-[12px] font-black" style={{ background: 'var(--p3r-row)', color: P3R.ink, clipPath: slantClip(6) }}>{imgMsg}{imgMsg.startsWith('图片包') && <span className="block text-[11px] font-bold" style={{ color: P3R.grey }}>maskaria-images.zip（46.2 MB）· 点击另存为</span>}</p>}
              </Card>
              <Card tone="danger">
                <div className="mb-2 flex items-center gap-2"><span aria-hidden className="h-[13px] w-[9px]" style={{ background: P3R.magenta, clipPath: tickClip }} /><span className="text-[13px] font-black tracking-widest" style={{ color: 'var(--p3r-coral-ink)' }}>危险区域</span></div>
                <P3Button tone="danger" block size="lg" onClick={() => ask('reset')}>重置所有数据</P3Button>
                <p className="mt-2 text-[12px] font-black" style={{ color: 'var(--p3r-coral-ink)' }}>删除全部数据，无法恢复。</p>
              </Card>
            </div>
          </div>
        </P3StaggerItem>

        {/* ── 云同步 ── */}
        <P3StaggerItem>
          <div ref={cloudRef} className="scroll-mt-4">
            <SectionMark title="云同步" en="CLOUD" tri className="mb-3" />
            {state === 'unconfigured' ? (
              <Card><p className="text-[14px] leading-relaxed" style={{ color: P3R.ink }}>云同步功能未配置。如需启用，请在 <code className="px-1.5 py-0.5 font-mono text-[12px]" style={{ background: P3R.ink, color: 'var(--p3r-on-ink)' }}>.env.local</code> 中设置 <code className="px-1.5 py-0.5 font-mono text-[12px]" style={{ background: P3R.blue, color: P3R.onBlue }}>VITE_PB_URL</code>。</p></Card>
            ) : !signedIn ? (
              <div className="flex min-w-0 flex-col gap-3">
                {state === 'expired' && (
                  <div className="flex min-w-0 items-start gap-3 py-3 pl-5 pr-4" style={{ clipPath: slantClip(12), background: P3R.magenta }}>
                    <span aria-hidden className="shrink-0 px-1.5 py-0.5 font-cond text-[10px] tracking-widest" style={{ background: P3R.ink, color: 'var(--pk-petal-a)', clipPath: slantClip(3) }}>SIGNAL LOST</span>
                    <div className="min-w-0 text-white"><p className="text-[15px] font-black">云端登录已失效</p><p className="mt-0.5 text-[12px] font-bold leading-relaxed opacity-95">本机数据仍在。重新登录即可继续同步。</p></div>
                  </div>
                )}
                <Card>
                  <p className="text-[14px] leading-relaxed" style={{ color: P3R.ink }}>登录后，您在本机的数据可以同步到云端，让多台设备共享同一份成长记录。</p>
                  <p className="mt-2 text-center text-[12px] font-black" style={{ color: P3R.roseInk }}>— 登录仅需邮箱验证码，不需要密码 —</p>
                </Card>
                <P3Button size="lg" block corner onClick={() => setLogin(true)}>{state === 'expired' ? '重新登录' : '登录云端'}</P3Button>
              </div>
            ) : (
              <div className="flex min-w-0 flex-col gap-3">
                {/* 资料卡 */}
                <div className="relative min-w-0" style={{ filter: 'drop-shadow(0 14px 28px rgb(var(--p3r-ink-rgb) / 0.14))' }}>
                  <div style={{ clipPath: slantClip(18), background: P3R.panel }}>
                    <div className="h-2" style={{ background: `linear-gradient(90deg, ${P3R.blue}, ${P3R.cyan})` }} />
                    <div className="flex min-w-0 items-center gap-3 px-6 pt-4">
                      <P3Avatar src={p.avatar ?? undefined} name={p.name || '?'} size={56} ring />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-heavy text-[20px]" style={{ color: P3R.ink }}>{p.name || '未命名的客人'}</div>
                        {uid && (
                          <button type="button" title="点击复制" onClick={() => { navigator.clipboard?.writeText(uid).catch(() => undefined); setUidCopied(true); setTimeout(() => setUidCopied(false), 1500); }} className="flex max-w-full items-center gap-1 text-[12px] font-black" style={{ color: P3R.roseInk }}>
                            <span className="opacity-70">@</span><span className="truncate font-mono">{uid}</span><span className="shrink-0 text-[11px] opacity-80">{uidCopied ? '✓ 已复制' : '· 点击复制'}</span>
                          </button>
                        )}
                        <div className="mt-0.5 truncate text-[11px] font-bold" style={{ color: P3R.grey }}>云端 · {CLOUD_USER.email}</div>
                      </div>
                      
                    </div>
                    {!uid && (
                      <div className="mx-6 mt-3 flex min-w-0 items-start gap-2 px-4 py-2.5" style={{ clipPath: slantClip(8), background: 'rgb(var(--p3r-magenta-rgb) / 0.12)' }}>
                        <span className="font-cond text-[16px] leading-none" style={{ color: 'var(--p3r-coral-ink)' }}>!</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[12px] font-black leading-relaxed" style={{ color: 'var(--p3r-coral-ink)' }}>你还没设置 UserID，好友系统无法找到你。</div>
                          <button type="button" onClick={() => setManage(true)} className="mt-0.5 text-[12px] font-black underline decoration-2 underline-offset-4" style={{ color: P3R.roseInk }}>现在就设一个 →</button>
                        </div>
                      </div>
                    )}
                    <div className="relative flex min-w-0 items-center justify-between gap-2 px-6 pb-4 pt-3">
                      <button type="button" aria-label="查看总点数" onClick={() => setPoints((v) => !v)} className="shrink-0 px-3 py-1 font-cond text-[14px]" style={{ clipPath: slantClip(5), background: P3R.blue, color: P3R.onBlue }}>LV {TOTAL_LEVEL} ▾</button>
                      <span className="min-w-0 flex-1 truncate text-[12px] font-bold" style={{ color: P3R.grey }}>{syncing ? '同步中…' : lastSync ? `最近同步：${lastSync}` : '尚未同步'}</span>
                      <button type="button" aria-label="账号管理" title="账号管理" onClick={() => setManage(true)} className="relative flex h-9 shrink-0 items-center justify-center px-3 text-[12px] font-black active:scale-95" style={{ clipPath: slantClip(7), background: P3R.ink, color: 'var(--p3r-on-ink)' }}>
                        账号管理{!uid && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full" style={{ background: P3R.magenta }} />}
                      </button>
                    </div>
                  </div>
                  {points && (
                    <div className="absolute left-4 top-[calc(100%-8px)] z-10 w-60 px-5 py-3" style={{ background: P3R.ink, clipPath: slantClip(10) }}>
                      <div className="mb-2 flex items-center justify-between">
                        <div><div className="font-cond text-[10px] tracking-widest" style={{ color: 'var(--pk-petal-a)' }}>总点数</div><div className="font-cond text-[26px] leading-none" style={{ color: P3R.blue }}>{TOTAL_POINTS}</div></div>
                        <button type="button" aria-label="关闭" onClick={() => setPoints(false)} className="p-1" style={{ color: 'var(--p3r-on-ink)' }}><IconClose size={14} /></button>
                      </div>
                      <div className="flex flex-col gap-1 border-t pt-1.5" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
                        {ATTRIBUTES.map((a) => <div key={a.id} className="flex justify-between text-[12px]" style={{ color: 'var(--p3r-on-ink)' }}><span className="font-black">{a.displayName}</span><span className="font-cond text-[14px]">{a.points}<span className="ml-1 text-[10px] opacity-70">· Lv.{a.level}</span></span></div>)}
                      </div>
                    </div>
                  )}
                </div>
                {state === 'sync-error' && <p role="alert" className="px-4 py-2 text-[12px] font-black text-white" style={{ background: P3R.magenta, clipPath: slantClip(8) }}>同步失败：网络连接失败，请稍后再试</p>}
                <div className="grid min-w-0 grid-cols-[1fr_auto] gap-2">
                  <P3Button size="lg" corner busy={syncing} busyText="同步中…" onClick={() => { setSyncing(true); setTimeout(() => { setSyncing(false); setLastSync('刚刚'); toast.success('已同步到云端'); }, 1300); }}>立即同步到云端</P3Button>
                  <P3Button size="lg" tone="soft" disabled={syncing} onClick={() => ask('pull')}>↓ 拉取</P3Button>
                </div>
                <P3Button tone="ink" block disabled={syncing} onClick={() => { window.location.hash = '#/overlay/account-sync-merge'; }}>和云端对一对（查阅并合并，避免误覆盖）</P3Button>
                <div ref={privRef} className="scroll-mt-4"><SyncPrivacySection defaultOpen={sec === 'privacy'} /></div>
                <P3Button tone="soft" block onClick={() => ask('logout')}>退出登录</P3Button>
                <div className="text-center"><button type="button" onClick={() => ask('delete')} className="text-[13px] font-black underline decoration-2 underline-offset-4" style={{ color: 'var(--p3r-coral-ink)' }}>永久删除云端账号</button></div>
              </div>
            )}
          </div>
        </P3StaggerItem>
      </P3Stagger>

      <AccountConfirmView kind={confirm} open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={(k) => { toast.success(({ reset: '数据已重置', pull: '已从云端拉取', logout: '已退出登录', delete: '云端账号已删除' })[k]); if (k === 'logout' || k === 'delete') setState('signed-out'); if (k === 'pull') setLastSync('刚刚'); }} />
      <LoginModalView open={login} onClose={() => setLogin(false)} needConsent={state !== 'expired'} onLoggedIn={() => { setState('signed-in'); toast.success('欢迎回来'); }} />
      <AccountManagePanelView open={manage} onClose={() => setManage(false)} userId={uid} onUserIdChange={(v) => setUid(v)} />
    </div>
  );
}
