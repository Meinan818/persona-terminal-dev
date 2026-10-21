/**
 * 账号与数据各区块（迁移自 v3 overlays/b.js：cloudHTML / privacyHTML / dataHTML / imagesHTML / ACCOUNT_CONFIRMS）。
 * 结构 = 真实 src/pages/Account.tsx 的 p5 分支（数据管理 DATA 在上：备份导出 / 从备份恢复 / 危险区域；云同步 CLOUD 在下：
 * 未配置 / 未登录（含登录已失效）/ 已登录账号卡 + 立即同步 + ↓拉取 + 和云端对一对 + SyncPrivacyPanel + 退出登录 + 永久删除云端账号）。
 * 长相 = v3 .ob-*。Account.p5r.tsx 组装；各弹层 openOverlay 打开完整组件。
 */
import { useState, type ReactNode } from 'react';
import { P5Tag } from '@/p5r-red/kit/P5Tag';
import { toast } from '@/p5r-red/kit/P5Toast';
import { P5Mask } from '@/p5r-red/kit/P5Mask';
import { openOverlay } from '@/p5r-red/shell/shellBus';
import { ATTR_ORDER, D } from '@/p5r-red/mock/data';
import { ObCard, ObRow, ObSw, ObMsg, ObNote, ObSub, ObLink, ObBtn, ObLi, BusyBtn, useMsgBox, ObConfirm, ObTa } from './ObKit';

export const TOTAL = ATTR_ORDER.reduce((s, k) => s + D.attrs[k].pts, 0);

/* ═════ 账号页确认框（Account.tsx 4 个 ConfirmDialog） ═════ */
export type AccountConfirmKind = 'logout' | 'reset' | 'deleteCloud' | 'pull';
let delFailOnce = true;
export function AccountConfirm({ kind, open, onClose, onDone }: { kind: AccountConfirmKind; open: boolean; onClose: () => void; onDone?: () => void }) {
  const done = (m: string) => () => { toast(m); onDone?.(); };
  switch (kind) {
    case 'logout': return <ObConfirm open={open} onClose={onClose} title="退出登录？" desc="退出后此设备将停止同步，但本机数据不会被删除。下次登录同一账号可继续。" confirm="确认退出" busy="退出中…" onConfirm={done('已退出登录 · 本机数据仍在')} />;
    case 'reset': return <ObConfirm open={open} onClose={onClose} title="确认重置数据" danger desc="此操作将删除所有用户数据，包括：" list={['所有行为记录', '所有成就进度', '所有技能解锁', '所有属性进度']} warn="此操作无法撤销！" confirm="确认重置" onConfirm={done('已重置所有数据')} />;
    case 'deleteCloud': return <ObConfirm open={open} onClose={onClose} title="永久删除云端账号？" danger desc="将删除：" list={['云端账号（邮箱 / UserID / 档案）', '云端同步的全部数据', '与好友的 COOP 关联']} warn="本机数据不受影响，仍完整保留在此设备上。" confirm="永久删除" busy="正在删除…" fail="注销失败：网络不可用，请稍后再试（再点一次演示成功）" failNow={() => { const f = delFailOnce; delFailOnce = !delFailOnce; return f; }} onConfirm={done('云端账号已永久删除')} />;
    default: return <ObConfirm open={open} onClose={onClose} title="从云端拉取数据？" desc={<>会用云端数据<b>覆盖本机</b>。如果本机有未同步的改动，请先点"立即同步到云端"。</>} confirm="确认拉取" busy="拉取中…" onConfirm={done('已从云端拉取')} />;
  }
}

/* ═════ 删除云端数据确认（SyncPrivacyPanel confirm） ═════ */
export function DeleteCloudDataConfirm({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone?: () => void }) {
  return (
    <ObConfirm open={open} onClose={onClose} title="确认删除云端数据？" desc="此操作不可撤销" danger confirm="确认删除" busy="删除中…" onConfirm={onDone}
      list={[<>仅清空你本账号在云端的所有 <code>user_data</code> 记录</>, <>本地数据 <b>不会</b> 被动到；浏览器里照常使用</>, '若再次触发"立即同步到云端"，本地数据会重新上传', '其他设备登录后，会看到云端为空，并可选择拉取本地覆盖']} />
  );
}

/* ═════ 云同步 · 数据类目选择 SyncPrivacyPanel ═════ */
const PRIV: [string, ReactNode, boolean, boolean?][] = [
  ['核心档案', '账号 / 五维属性 / 设置 —— 始终同步，保证账号在不同设备能正常加载', true, true],
  ['AI 模型 API', <>API Key（AI 摘要 / 谏言 / Persona / 同伴解读 都用这把钥匙）。<b>默认不上传</b>——钥匙留在本机最安全，代价是换设备要重填一次。打开则随同步上云，方便多设备共用同一把。</>, false],
  ['成长记录', '每日活动 / 成就 / 技能 / 岁时印章', true], ['星象 · 塔罗', '每日塔罗 / 中长期占卜 / 窥探命运 / 旧版每日事件', true],
  ['任务与总结', '待办 / 完成记录 / 周月总结 / 本周目标 / 倒计时 / 委托板', true], ['逆影战场', 'Persona / Shadow / 战斗状态 / 高塔区层', true],
  ['同伴', '同伴档案 / 同伴事件历史 / 谏言归档摘要（聊天原文永不上云）', true],
  ['愿望清单', '终极目标 / 子愿望 —— 默认只存本地；勾选后才随账号上云，换设备可恢复', false],
  ['助手 · 人格与记忆', '自定义人格 / 它记住的关于你的事 —— 默认只存本地；勾选后换设备助手还认得你。聊天原文永不上云', false],
];
export function PrivacyCard({ confirmOpen = false }: { confirmOpen?: boolean }) {
  const [on, setOn] = useState(PRIV.map((p) => p[2]));
  const [dlg, setDlg] = useState(confirmOpen);
  const [msg, setMsg] = useMsgBox();
  return (
    <ObCard title="云同步 · 数据类目选择" en="PRIVACY" seed={252} id="sec-privacy">
      <p className="ob-count">当前开启 <b>{on.filter(Boolean).length}</b> / {PRIV.length} 组</p>
      {PRIV.map(([l, hint, , lock], i) => (
        <ObRow key={l} label={l} hint={hint}>{lock ? <P5Tag tone="ink">必须同步</P5Tag> : null}<ObSw on={on[i]} label={`切换 ${l}`} locked={lock ? '核心档案必须同步' : undefined} onToggle={(v) => setOn(on.map((x, j) => (j === i ? v : x)))} /></ObRow>
      ))}
      <ObNote>关闭某组后，这些表将仅保留在本地；推送 / 拉取都会跳过它们，登录其他设备时不会看到这些数据。</ObNote>
      <div className="ob-danger"><span className="ob-danger-h">危险区</span><ObBtn seed={251} onClick={() => setDlg(true)}>🗑 删除云端数据</ObBtn><small>仅删除云端存档，本地数据完整保留。下次同步前云端都会是空的。</small>{msg}</div>
      <DeleteCloudDataConfirm open={dlg} onClose={() => setDlg(false)} onDone={() => setMsg(<ObMsg kind="ok">已删除云端 1,284 条记录。本地数据未动。</ObMsg>)} />
    </ObCard>
  );
}

/* ═════ 云同步区 ═════ */
export const CLOUD_STATES: [string, string][] = [['signed-in', '已登录'], ['noid', '未设 UserID'], ['syncing', '同步中'], ['fail', '同步失败'], ['signed-out', '未登录'], ['expired', '登录失效'], ['unconf', '未配置']];
export function CloudCard({ state = 'signed-in' }: { state?: string }) {
  const [dlg, setDlg] = useState<AccountConfirmKind | null>(null);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useMsgBox(state === 'fail' ? <ObMsg kind="err">同步失败：Failed to fetch</ObMsg> : null);
  if (state === 'unconf') return <ObCard title="云同步" en="CLOUD" seed={601} id="sec-cloud"><p className="ob-p">云同步功能未配置。如需启用，请在 <code>.env.local</code> 中设置 <code>VITE_PB_URL</code>。</p></ObCard>;
  if (state === 'signed-out' || state === 'expired') return (
    <ObCard title="云同步" en="CLOUD" seed={603} id="sec-cloud">
      {state === 'expired' && <div className="ob-msg err"><b>云端登录已失效</b><br />本机数据仍在。重新登录即可继续同步。</div>}
      <p className="ob-p">登录后，您在本机的数据可以同步到云端，让多台设备共享同一份成长记录。</p>
      <p className="ob-foot">— 登录仅需邮箱验证码，不需要密码 —</p>
      <ObBtn seed={602} size="lg" className="ob-wide" onClick={() => openOverlay('account-login')}>登录云端</ObBtn>
    </ObCard>
  );
  const noid = state === 'noid', syncing = state === 'syncing';
  return (
    <>
      <ObCard title="云同步" en="CLOUD" seed={607} id="sec-cloud">
        <div className="ob-acc">
          <div className="ob-acc-av"><P5Mask w={54} tone="white" /></div>
          <div className="ob-acc-m"><b>{D.user.name}</b>
            {!noid && <button type="button" className="ob-uid" title="点击复制" onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? '@yeji_0610 ✓ 已复制' : <><span>@</span>yeji_0610 <i>· 点击复制</i></>}</button>}
            <small>{syncing ? '同步中…' : '最近同步：12 分钟前'}</small></div>
          <button type="button" className="ob-gear" aria-label="账号管理" title="账号管理" onClick={() => openOverlay('account-manage', { state: noid ? 'home-noid' : 'home' })}>⚙</button>
          <button type="button" className="ob-acc-pts" aria-label="查看总点数" onClick={() => toast(`总点数 ${TOTAL}`)}><small>总点数</small><b>{TOTAL}</b></button>
        </div>
        {noid && <div className="ob-msg warn">你还没设置 UserID，好友系统无法找到你。 <ObLink onClick={() => openOverlay('account-manage', { state: 'userid-new' })}>现在就设一个 →</ObLink></div>}
        {msg}
        <div className="ob-acts left">
          {syncing ? <ObBtn seed={604} disabled>同步中…</ObBtn> : <BusyBtn label="立即同步到云端" busy="同步中…" seed={604} msg="已同步到云端" sfxKey="success" to={setMsg} />}
          <ObBtn tone="ink" seed={605} onClick={() => setDlg('pull')}>↓ 拉取</ObBtn>
        </div>
        <ObLi onClick={() => openOverlay('account-sync-merge')}><b>和云端对一对（查阅并合并，避免误覆盖）</b><em>›</em></ObLi>
        <div className="ob-acts left"><ObBtn tone="paper" seed={606} onClick={() => setDlg('logout')}>退出登录</ObBtn><ObLink danger onClick={() => setDlg('deleteCloud')}>永久删除云端账号</ObLink></div>
      </ObCard>
      <PrivacyCard />
      {dlg && <AccountConfirm kind={dlg} open onClose={() => setDlg(null)} />}
    </>
  );
}

/* ═════ 记录配图 · 单独备份 ImagesBackupBlock ═════ */
export function ImagesBlock() {
  const [msg, setMsg] = useMsgBox();
  return (
    <div className="ob-imgbk"><div className="ob-imgbk-h"><b>记录配图 · 单独备份</b><small>128 张 · 约 46.2 MB</small></div>
      <p className="ob-hint">图片不在主备份里，也不上云。换机时先导主备份恢复记录，再导图片包，图片会按记录挂回去。</p>
      <div className="ob-acts left">
        <BusyBtn label="导出图片包" busy="处理中…" tone="ink" size="sm" seed={351} to={setMsg} msg={<>图片包已生成：128 张，46.2 MB<br />▸ maskaria-images-2026-10-20.zip（46.2 MB）· 点击另存为</>} fail="导出失败：存储空间不足" />
        <BusyBtn label="导入图片包" busy="处理中…" tone="paper" size="sm" seed={352} to={setMsg} msg="已导入 120 张，跳过重复 6 张，2 张找不到所属记录（先导主备份再导图片包）" fail="导入失败：不是图片包" />
      </div>
      <div className="ob-imgmsg">{msg}</div>
    </div>
  );
}

/* ═════ 数据管理（备份导出 / 从备份恢复 / 危险区域）—— 导出 / 恢复全流程 ═════ */
export const DATA_STATES: [string, string][] = [['idle', '常态'], ['exporting', '导出中'], ['download', '下载链接'], ['shared', 'App 分享'], ['copied', '已复制'], ['copyfail', '复制失败'], ['exportfail', '导出失败'], ['loaded', '文件已加载'], ['importing', '导入中'], ['imported', '导入成功'], ['importfail', '导入失败'], ['imgpack', '误导图片包'], ['readfail', '读文件失败']];
const EX: Record<string, ['ok' | 'err' | 'info', string]> = { exporting: ['info', '正在打包备份…'], shared: ['ok', '分享面板已打开，请选择保存位置（文件管理 / 云盘 / 邮件 等）'], copied: ['ok', '已复制到剪贴板（412.6 KB）'], copyfail: ['err', '复制失败，请尝试下载'], exportfail: ['err', '导出失败：QuotaExceededError'], imported: ['ok', '导入成功！数据已恢复。'], importfail: ['err', '导入失败：不是有效的 MASKARIA 备份（缺少 user 字段）'], imgpack: ['ok', '这是图片包：已导入 120 张，2 张找不到所属记录'], readfail: ['err', '读取备份文件失败'] };
export function DataCards({ state: init = 'idle' }: { state?: string }) {
  const [st, setSt] = useState(init);
  const [reset, setReset] = useState(false);
  const [over, setOver] = useState(false);
  const ex = EX[st];
  const loaded = ['loaded', 'importing', 'imported', 'importfail'].includes(st);
  const download = () => { setSt('exporting'); setTimeout(() => setSt('download'), 900); };
  const doImport = () => { setSt('importing'); setTimeout(() => setSt('imported'), 1100); };
  return (
    <>
      <ObCard title="数据管理" en="DATA" seed={614} id="sec-data">
        {ex && <div className={`ob-msg ${ex[0]} ob-dismiss`} role={ex[0] === 'err' ? 'alert' : 'status'}>{ex[1]}<button type="button" className="ob-x sm" aria-label="关闭提示" onClick={() => setSt('idle')}>✕</button></div>}
        <ObNote>数据保存在本地，已构建防护但以防万一如需清理浏览器缓存请注意备份数据哦</ObNote>
        <ObSub>备份导出</ObSub>
        <div className="ob-acts left">
          <ObBtn seed={611} disabled={st === 'exporting'} onClick={download}>{st === 'exporting' ? '导出中…' : '下载备份'}</ObBtn>
          <ObBtn tone="ink" seed={612} onClick={() => setSt(st === 'copied' ? 'copyfail' : 'copied')}>{st === 'copied' ? '已复制' : st === 'copyfail' ? '复制失败' : '复制 JSON'}</ObBtn>
          <ObBtn tone="paper" seed={613} onClick={() => setSt('shared')}>分享备份（App）</ObBtn>
        </div>
        {st === 'download' && <div className="ob-dl"><b>▸ maskaria-backup-2026-10-20.json</b><small>412.6 KB · 点击打开或另存为</small><button type="button" className="ob-x sm" aria-label="关闭下载提示" onClick={() => setSt('idle')}>✕</button></div>}
        <p className="ob-hint">背景图与 API Key 不会在备份中。</p>
        <ImagesBlock />
      </ObCard>
      <ObCard title="从备份恢复" en="RESTORE" seed={616} id="sec-restore">
        <ObTa key={String(loaded)} ph='粘贴备份 JSON 文本（以 {"user":.... 开头）' val={loaded ? '{"user":{"name":"野鸡",…},"attributes":[…]}' : ''} rows={3} aria="粘贴备份 JSON" />
        <button type="button" className={`ob-drop${loaded ? ' ok' : ''}${over ? ' over' : ''}`} onClick={() => setSt('loaded')}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); setSt('loaded'); }}>
          <b>{loaded ? '✓ 文件已加载' : '选择备份文件'}</b>{loaded ? null : <small>或拖拽</small>}</button>
        <ObBtn seed={615} size="lg" className="ob-wide" disabled={!loaded || st === 'importing'} onClick={doImport}>{st === 'importing' ? '正在导入…' : '确认导入（会覆盖当前数据）'}</ObBtn>
        <p className="ob-warn">导入会清空并覆盖当前所有数据，操作前请先导出备份。</p>
      </ObCard>
      <ObCard title="危险区域" en="DANGER" seed={618}>
        <ObBtn seed={617} size="lg" onClick={() => setReset(true)}>重置所有数据</ObBtn><p className="ob-warn">删除全部数据，无法恢复。</p>
      </ObCard>
      <AccountConfirm kind="reset" open={reset} onClose={() => setReset(false)} />
    </>
  );
}
