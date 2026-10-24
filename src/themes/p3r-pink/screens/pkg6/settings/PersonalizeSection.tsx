/** 设置 · 体验个性化（真实 Settings.tsx section=personalize）：属性 / 记账 / 属性名称 / 等级需求 / 等级称号 / 今日委托 AI 卡 / 关键词规则 / 逆影战场 */
import { useState } from 'react';
import type { AttributeId, AttributeLevelTitles } from '@real/types';
import { CfgBtn, CfgInput, CfgList, CfgRow, CfgSeg, CfgSelect, CfgSubhead, CfgToggle } from '../cfg';
import { attrLabel, updateSettings, useSettings } from '../settingsStore';
import { ATTRS, DEFAULT_LEVEL_TITLES, LEVEL_PRESETS } from '@pink/mock/pkg6';
import { LevelTitleModal } from '@pink/screens/overlays/SettingsLevelTitleModal.p3r';
import { NameMatchModal } from '@pink/screens/overlays/SettingsNameMatchModal.p3r';
import { ThresholdDialog, type ThresholdKind } from '@pink/screens/overlays/SettingsThresholdConfirm.p3r';
import { cx } from '@pink/lib/cx';
import { useAppStore } from '@/store';
import { generateAttributeLevelTitles } from '@/utils/attributeLevelTitles';
import { generatePresetNameMatches, type PresetNameMatchResult } from '@/utils/presetNameMatcher';
import { restorePresetNames } from '@/utils/presetNameApply';

const Pill = ({ children, tone = 'orange' }: { children: React.ReactNode; tone?: 'orange' | 'black' | 'green' }) => (
  <span className={cx('rounded-[2px] px-1.5 py-px font-heavy text-2xs font-bold', tone === 'orange' ? 'bg-p3r-coral text-p3r-ink' : tone === 'green' ? 'bg-p3r-mint text-p3r-ink' : 'bg-p3r-ink text-p3r-rose')}>{children}</span>
);

export function PersonalizeSection() {
  const s = useSettings();
  const settings = useAppStore((state) => state.settings);
  const [nameBusy, setNameBusy] = useState(false);
  const [nameMsg, setNameMsg] = useState('');
  const [nameModal, setNameModal] = useState(false);
  const [nameSuggestions, setNameSuggestions] = useState<PresetNameMatchResult | null>(null);
  const [titleBusy, setTitleBusy] = useState(false);
  const [titleMsg, setTitleMsg] = useState('');
  const [titleModal, setTitleModal] = useState(false);
  const [titleSuggestions, setTitleSuggestions] = useState<AttributeLevelTitles | null>(null);
  const [titleIdx, setTitleIdx] = useState(0);
  const [confirm, setConfirm] = useState<ThresholdKind | null>(null);
  const [confirmKind, setConfirmKind] = useState<ThresholdKind>('reset');
  const [kwOpen, setKwOpen] = useState(false);
  const [kwDraft, setKwDraft] = useState<Record<number, string>>({});
  const th = s.levelThresholds;
  const openConfirm = (k: ThresholdKind) => { setConfirmKind(k); setConfirm(k); };
  const tMeta = ATTRS[titleIdx];
  const matchNames = async () => {
    if (nameBusy) return;
    setNameBusy(true);
    setNameMsg('');
    try {
      setNameSuggestions(await generatePresetNameMatches(settings));
      setNameMsg('已生成建议，请选择要覆写的名称');
      setNameModal(true);
    } catch (e) {
      setNameMsg(e instanceof Error ? e.message : 'AI 匹配成就/技能名称失败');
    } finally {
      setNameBusy(false);
    }
  };
  const refreshTitles = async () => {
    if (titleBusy) return;
    setTitleBusy(true);
    setTitleMsg('');
    try {
      setTitleSuggestions(await generateAttributeLevelTitles(settings, settings.levelThresholds.length));
      setTitleMsg('已生成建议，请选择要刷新的属性');
      setTitleModal(true);
    } catch (e) {
      setTitleMsg(e instanceof Error ? e.message : '刷新等级称号失败');
    } finally {
      setTitleBusy(false);
    }
  };
  const restoreNames = async () => {
    if (nameBusy) return;
    setNameBusy(true);
    setNameMsg('');
    try {
      const restored = await restorePresetNames();
      setNameMsg(`已还原 ${restored} 项 AI 覆写前的成就/技能名称`);
    } catch (e) {
      setNameMsg(e instanceof Error ? e.message : '还原失败');
    } finally {
      setNameBusy(false);
    }
  };

  const addKw = (i: number) => {
    const v = (kwDraft[i] ?? '').trim(); if (!v) return;
    const r = s.keywordRules[i];
    if (!r.keywords.some((k) => k.toLowerCase() === v.toLowerCase())) {
      const next = [...s.keywordRules]; next[i] = { ...r, keywords: [...r.keywords, v] }; updateSettings({ keywordRules: next });
    }
    setKwDraft({ ...kwDraft, [i]: '' });
  };

  return (
    <div className="space-y-2">
      <CfgSubhead en="ATTRIBUTE">属性</CfgSubhead>
      <CfgList>
        <CfgRow inline label="逆流" badge={<Pill>实验性</Pill>} hint="连续3日某属性无增长，次日起每天该属性自动 −1，并在首页提前一天预警。">
          <CfgToggle ariaLabel="逆流" checked={s.countercurrentEnabled} onChange={(v) => updateSettings({ countercurrentEnabled: v })} />
        </CfgRow>
        <CfgRow inline label="记账" badge={<Pill tone="green">新</Pill>} hint="低摩擦记账：总余额 / 预算 / 结转 + 四轴觉察。数据始终只存本地、不上云。">
          <CfgToggle ariaLabel="记账" checked={s.ledgerEnabled} onChange={(v) => updateSettings({ ledgerEnabled: v })} />
        </CfgRow>
        {s.ledgerEnabled && (
          <>
            <CfgRow inline label="货币">
              <CfgSelect aria-label="货币" value={s.currency} onChange={(e) => updateSettings({ currency: e.target.value })}
                options={[['CNY', '¥ 人民币'], ['USD', '$ 美元'], ['EUR', '€ 欧元'], ['JPY', '¥ 日元'], ['GBP', '£ 英镑'], ['HKD', 'HK$ 港币'], ['KRW', '₩ 韩元']].map(([value, label]) => ({ value, label }))} />
            </CfgRow>
            <CfgRow inline label="消费评估" hint="记账时可评「值 / 不值」，值得 +1 SP，比例进月报"><CfgToggle ariaLabel="消费评估" checked={s.spendEvalEnabled} onChange={(v) => updateSettings({ spendEvalEnabled: v })} /></CfgRow>
            <CfgRow inline label="发薪日周期" hint="预算 / 今日可花 / 规划窗按发薪日切分周期；关则按自然月。"><CfgToggle ariaLabel="发薪日周期" checked={s.ledgerPayCycleEnabled} onChange={(v) => updateSettings({ ledgerPayCycleEnabled: v })} /></CfgRow>
            {s.ledgerPayCycleEnabled && (
              <CfgRow inline label="发薪日"><CfgSelect aria-label="发薪日" value={String(s.ledgerResetDay)} onChange={(e) => updateSettings({ ledgerResetDay: Number(e.target.value) })} options={Array.from({ length: 28 }, (_, i) => ({ value: String(i + 1), label: `每月 ${i + 1} 号` }))} /></CfgRow>
            )}
          </>
        )}
      </CfgList>

      {/* 属性名称 */}
      <CfgSubhead en="NAMES">属性名称</CfgSubhead>
      <CfgList>
        <CfgRow label={<>属性名称 <Pill tone="black">5 维</Pill></>} hint="给五个维度取个贴合你的名字，命名会立刻在整个房间里生效。"
          below={
            <div className="space-y-2">
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {ATTRS.map((a, i) => (
                  <label key={a.id} className="flex min-w-0 items-center gap-2 rounded-none bg-[rgb(var(--p3r-panel-rgb)/0.6)] px-2 py-1.5 text-p3r-ink">
                    <span className="font-cond tabular w-5 shrink-0 text-center text-meta">{i + 1}</span>
                    <span aria-hidden className="shrink-0 text-h3">{a.icon}</span>
                    <span className="min-w-0 flex-1">
                      <CfgInput aria-label={`${a.defaultLabel}的名称`} value={s.attributeNames[a.id]} placeholder={a.defaultLabel} maxLength={6}
                        onChange={(e) => updateSettings({ attributeNames: { ...s.attributeNames, [a.id]: e.target.value } })} className="h-9" />
                      <span className="mt-0.5 block text-2xs opacity-70">默认「{a.defaultLabel}」</span>
                    </span>
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <CfgBtn tone="primary" disabled={nameBusy} onClick={() => void matchNames()}>{nameBusy ? '匹配中…' : 'AI 匹配成就 / 技能名称'}</CfgBtn>
                <CfgBtn disabled={nameBusy || !s.hasPresetNameBackup} onClick={() => void restoreNames()}>还原</CfgBtn>
              </div>
              {nameMsg ? <p className="text-meta font-bold text-p3r-lilac-ink">{nameMsg}</p> : s.hasPresetNameBackup && <p className="text-meta opacity-75">当前有 AI 覆写记录，可还原到覆写前版本。</p>}
            </div>
          } />
      </CfgList>

      {/* 等级需求 */}
      <CfgSubhead en="LEVEL">等级需求</CfgSubhead>
      <CfgList>
        <CfgRow label={<>等级需求 <span className="font-cond tabular ml-1 text-meta">{th.length} / 10 级</span></>} hint="达到对应等级所需的累计点数（数值可随时调整；建议保持单调递增）。"
          below={
            <div className="space-y-2.5">
              <div role="radiogroup" aria-label="难度档" className="grid grid-cols-2 gap-2">
                {(['easy', 'hard'] as const).map((d) => {
                  const on = s.difficulty === d;
                  return (
                    <button key={d} type="button" role="radio" aria-checked={on} onClick={() => updateSettings({ difficulty: d, levelThresholds: th.map((v, i) => (i < 5 ? LEVEL_PRESETS[d][i] : v)) })}
                      className={cx('p6-press min-w-0 rounded-none border-2 px-3 py-2 text-left', on ? (d === 'hard' ? 'border-p3r-lilac/50 bg-p3r-coral text-p3r-on-ink' : 'border-p3r-lilac/50 bg-p3r-rose text-p3r-on-rose') + '' : 'border-dashed border-current')}>
                      <span className="block font-heavy text-lead font-bold">{d === 'easy' ? '简单' : '困难'}</span>
                      <span className="block text-2xs opacity-80">LV5 需 {LEVEL_PRESETS[d][4]} 点</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-2xs opacity-75">困难档的等级标签会换成一套专属配色——菜单、同伴塔罗、以及别人看到的你，都认得出来。</p>
              <ol className="grid grid-cols-1 gap-1">
                {th.map((v, i) => {
                  const isLast = i === th.length - 1; const canRemove = isLast && i >= 5;
                  return (
                    <li key={i} className="flex min-w-0 items-center gap-2 rounded-none bg-[rgb(var(--p3r-panel-rgb)/0.6)] px-2 py-1 text-p3r-ink">
                      <span className={cx('font-cond tabular w-[3.6em] shrink-0 rounded-[2px] px-1 text-center text-body', i >= 5 ? 'bg-p3r-lilac text-p3r-on-ink' : 'bg-p3r-ink text-p3r-rose')}>Lv.{i + 1}</span>
                      <CfgInput type="number" min={0} placeholder="需求点数" aria-label={`Lv.${i + 1} 需求点数`} value={v} className="h-9 font-num" onChange={(e) => { const n = [...th]; n[i] = parseInt(e.target.value) || 0; updateSettings({ levelThresholds: n }); }} />
                      <span className="shrink-0 text-meta">点</span>
                      {canRemove
                        ? <button type="button" aria-label="移除最高等级" title="移除最高等级" onClick={() => openConfirm('remove')} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-none bg-p3r-coral font-bold text-p3r-on-ink">✕</button>
                        : <span title={i < 5 ? 'Lv.1–5 不可删除' : ''} aria-label={i < 5 ? 'Lv.1–5 不可删除' : undefined} className="flex h-8 w-8 shrink-0 items-center justify-center opacity-40"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden fill="currentColor"><path d="M7 10V7a5 5 0 0 1 10 0v3h1v11H6V10h1Zm2 0h6V7a3 3 0 0 0-6 0v3Z" /></svg></span>}
                    </li>
                  );
                })}
              </ol>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                <CfgBtn tone="primary" disabled={th.length >= 10} onClick={() => openConfirm('add')}>+ 添加一级</CfgBtn>
                <CfgBtn title="恢复默认阈值" onClick={() => openConfirm('reset')}>↺ 默认</CfgBtn>
              </div>
            </div>
          } />

        {/* 等级称号 */}
        <CfgRow label="等级称号" hint="每个属性的 Lv 会显示一个四字称号；点击 AI 刷新会先生成建议，再选择要应用的属性。"
          below={
            <div className="space-y-2.5">
              <div className="flex flex-wrap gap-2">
                <CfgBtn tone="primary" disabled={titleBusy} onClick={() => void refreshTitles()}>{titleBusy ? '刷新中' : 'AI 刷新'}</CfgBtn>
                <CfgBtn onClick={() => { updateSettings({ levelTitles: JSON.parse(JSON.stringify(DEFAULT_LEVEL_TITLES)) }); setTitleMsg('已填入默认等级称号'); }}>默认</CfgBtn>
              </div>
              {titleMsg && <p className="text-meta font-bold text-p3r-lilac-ink">{titleMsg}</p>}
              <div className="rounded-none border-2 border-p3r-lilac/50 bg-p3r-blush-faint p-2.5 text-p3r-ink">
                <div className="flex min-w-0 items-center gap-2">
                  <button type="button" aria-label="上一个属性" onClick={() => setTitleIdx((i) => (i + 4) % 5)} className="p6-press h-9 w-9 shrink-0 rounded-full bg-p3r-ink font-heavy text-h3 font-bold text-p3r-rose">‹</button>
                  <span aria-hidden className="shrink-0 text-h2">{tMeta.icon}</span>
                  <div className="min-w-0 flex-1"><div className="truncate font-heavy text-lead font-bold">{attrLabel(s, tMeta.id)}</div><div className="truncate font-cond text-2xs uppercase tracking-[0.2em] text-p3r-ink-soft">{tMeta.id}</div></div>
                  <button type="button" aria-label="下一个属性" onClick={() => setTitleIdx((i) => (i + 1) % 5)} className="p6-press h-9 w-9 shrink-0 rounded-full bg-p3r-ink font-heavy text-h3 font-bold text-p3r-rose">›</button>
                </div>
                <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {th.map((_, li) => (
                    <label key={`${tMeta.id}-${li}`} className="flex min-w-0 items-center gap-2">
                      <span className="font-cond tabular w-[3.2em] shrink-0 text-meta">Lv.{li + 1}</span>
                      <CfgInput placeholder="四字称号" aria-label={`Lv.${li + 1} 称号`} maxLength={4} className="h-9"
                        value={s.levelTitles[tMeta.id as AttributeId][li] ?? ''}
                        onChange={(e) => { const n = { ...s.levelTitles }; n[tMeta.id] = [...n[tMeta.id]]; n[tMeta.id][li] = e.target.value; updateSettings({ levelTitles: n }); }} />
                    </label>
                  ))}
                </div>
                <div className="mt-2 flex justify-center gap-1.5">
                  {ATTRS.map((a, i) => <button key={a.id} type="button" onClick={() => setTitleIdx(i)} aria-label={`切换到${attrLabel(s, a.id)}`} className={cx('h-1.5 rounded-full transition-all', i === titleIdx ? 'w-5 bg-p3r-coral' : 'w-1.5 bg-p3r-lilac/30')} />)}
                </div>
              </div>
            </div>
          } />
        <CfgRow inline label="今日委托多一张 AI 写的" hint="委托板的今日委托在三张题库卡之外，每天再多一张按你最近的记录写的。会把最近 7 天的记录标题发给你配的 AI 服务；没配 AI 时不出现。">
          <CfgToggle ariaLabel="今日委托多一张 AI 写的" checked={s.lifeQuestAiCard} onChange={(v) => updateSettings({ lifeQuestAiCard: v })} />
        </CfgRow>
      </CfgList>

      {/* 关键词规则 */}
      <button type="button" onClick={() => setKwOpen((v) => !v)} aria-expanded={kwOpen} className="flex w-full min-w-0 items-center gap-2 text-left">
        <CfgSubhead en="KEYWORDS" className="min-w-0 flex-1">关键词规则</CfgSubhead>
        <Pill tone="black">命中即加分</Pill>
        <span aria-hidden className={cx('shrink-0 font-heavy text-[color:var(--p3r-coral-ink)] transition-transform', kwOpen && 'rotate-180')}>▼</span>
      </button>
      {kwOpen && (
        <div className="space-y-2">
          <p className="text-meta font-bold text-[color:var(--p3r-on-stage)]">记录中出现某属性的关键词时，自动为该属性 +1 点。回车或点 <b>+</b> 添加，点击标签可移除。</p>
          <div className="grid grid-cols-1 gap-2 wide-lg:grid-cols-2">
            {s.keywordRules.map((r, i) => {
              const a = ATTRS.find((x) => x.id === r.attribute)!;
              return (
                <div key={i} className="min-w-0 rounded-none border-2 border-p3r-lilac/50 bg-p3r-blush-faint p-2.5 text-p3r-ink">
                  <div className="flex min-w-0 items-center gap-2">
                    <span aria-hidden className="text-h3">{a.icon}</span>
                    <div className="min-w-0 flex-1"><div className="truncate font-heavy text-body font-bold">{attrLabel(s, r.attribute)}</div><div className="text-2xs text-p3r-ink-soft">命中后 <b className="text-p3r-lilac-ink">+{r.points}</b> 点</div></div>
                    <span className="shrink-0 font-cond tabular text-meta">{r.keywords.length} 词</span>
                  </div>
                  <div className="mt-2 flex min-w-0 flex-wrap gap-1">
                    {r.keywords.length === 0 ? <div className="text-meta italic text-p3r-grey">暂无关键词，下方输入回车添加</div>
                      : r.keywords.map((k, ki) => (
                        <button key={k + ki} type="button" title="点击移除" onClick={() => { const n = [...s.keywordRules]; n[i] = { ...r, keywords: r.keywords.filter((_, j) => j !== ki) }; updateSettings({ keywordRules: n }); }}
                          className="max-w-full truncate rounded-none bg-p3r-ink px-2 py-0.5 font-heavy text-meta font-bold text-p3r-rose hover:bg-p3r-coral hover:text-p3r-on-ink">{k} ×</button>
                      ))}
                  </div>
                  <div className="mt-2 flex min-w-0 gap-1.5">
                    <CfgInput className="h-9" placeholder="输入关键词后回车 / 点 +" value={kwDraft[i] ?? ''} onChange={(e) => setKwDraft({ ...kwDraft, [i]: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addKw(i); } }} />
                    <button type="button" aria-label="添加关键词" onClick={() => addKw(i)} className="p6-press h-9 w-9 shrink-0 rounded-none border-2 border-p3r-lilac/50 bg-p3r-rose font-bold text-p3r-on-rose">+</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 逆影战场 */}
      <CfgList className="pt-2">
        <CfgRow inline label="逆影战场" badge={!s.battleEnabled ? <Pill tone="black">已关闭</Pill> : undefined} hint="召唤 Persona，识破并击败内心的暗影。">
          {s.battleEnabled ? <CfgToggle ariaLabel="逆影战场" checked onChange={(v) => updateSettings({ battleEnabled: v })} /> : <CfgBtn tone="primary" onClick={() => updateSettings({ battleEnabled: true })}>开启</CfgBtn>}
        </CfgRow>
      </CfgList>

      <LevelTitleModal open={titleModal} suggestions={titleSuggestions} onClose={() => { setTitleModal(false); setTitleSuggestions(null); }} onApplied={(n) => setTitleMsg(`已刷新 ${n} 个属性的等级称号`)} />
      <NameMatchModal open={nameModal} suggestions={nameSuggestions} onClose={() => { setNameModal(false); setNameSuggestions(null); }} onApplied={() => setNameMsg('已覆写所选成就/技能名称，可还原到覆写前版本')} />
      <ThresholdDialog kind={confirmKind} open={!!confirm} onClose={() => setConfirm(null)} difficulty={s.difficulty} level={th.length} points={th[th.length - 1]}
        onConfirm={() => {
          if (confirmKind === 'reset') updateSettings({ levelThresholds: [...LEVEL_PRESETS[s.difficulty]] });
          else if (confirmKind === 'remove') updateSettings({ levelThresholds: th.slice(0, -1) });
          else updateSettings({ levelThresholds: [...th, (th[th.length - 1] ?? 0) + 150] });
        }} />
    </div>
  );
}
