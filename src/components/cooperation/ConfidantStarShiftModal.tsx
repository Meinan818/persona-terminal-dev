import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '@/store';
import { useShallow } from 'zustand/react/shallow';
import { useBackHandler } from '@/utils/useBackHandler';
import type { Confidant } from '@/types';
import { TAROT_BY_ID } from '@/constants/tarot';
import { starShiftConfidant, type StarShiftResult } from '@/utils/confidantAI';
import '@/styles/confidant-starshift.css';

type Stage = 'input' | 'thinking' | 'preview' | 'done' | 'error';

interface Props {
  isOpen: boolean;
  confidant: Confidant | null;
  onClose: () => void;
}

/**
 * 星移弹窗 —— 只管「重新落墨」这一条流程：输入 → 生成中 → 预览 → 落墨 → 完成。
 *
 * ⚠ 2026-10-16 接回 App：原来的 celebrate 阶段（那个白卡片的「升级恭喜」弹窗）
 * 已整段删除，由一个独立的整页 ConfidantCelebrateScreen 取代（版式取自已验收的
 * 概念 demo outputs/bond-rankup-demo）。所以这里不再需要 initialMode，打开即输入阶段。
 *
 * 同一轮把剩下的四屏也换成了与恭喜页同一套 P3R 语言（平面色块 + 斜切 + 硬投影，
 * 见 confidant-starshift.css），不再用原来的灰白圆角卡片；
 * 颜色全走 --p3r-*，蓝 / 粉 / 红 / 黄 / 夜间自动跟随。
 */
export function ConfidantStarShiftModal({ isOpen, confidant, onClose }: Props) {
  const { settings, consumeStarShift, confidantEvents, activities } = useAppStore(useShallow(s => ({ settings: s.settings, consumeStarShift: s.consumeStarShift, confidantEvents: s.confidantEvents, activities: s.activities })));

  const [stage, setStage] = useState<Stage>('input');
  const [changeNote, setChangeNote] = useState('');
  const [result, setResult] = useState<StarShiftResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStage('input');
      setChangeNote('');
      setResult(null);
      setErr(null);
    }
  }, [isOpen, confidant?.id]);

  // Android 返回键：
  //   - thinking 阶段（AI 生成星移内容）→ 点遮罩已被阻止，back 同样 no-op
  //   - 其余阶段 → 关闭弹窗（等同点 ✕ / 点遮罩）
  useBackHandler(isOpen, () => {
    if (stage === 'thinking') return;
    onClose();
  });

  // 截取最近 6 条与此同伴"一起做的事" ——
  // 严格只用 conversation 事件里用户自己输入的原话 + 当时馆长给的建议；
  // 不把 AI 的解读 narrative 再发回去，避免 AI 被自己之前的叙述带偏
  const recentActs = useMemo(() => {
    if (!confidant) return [] as Array<{ date: string; text: string }>;
    const convs = confidantEvents
      .filter(e => e.confidantId === confidant.id && e.type === 'conversation' && typeof e.userInput === 'string' && e.userInput!.trim())
      .slice(0, 10);
    const merged: Array<{ when: number; date: string; text: string }> = [];
    for (const e of convs) {
      const pieces = [`事件：${(e.userInput as string).trim()}`];
      if (e.advice && e.advice.trim()) pieces.push(`当时的建议：${e.advice.trim()}`);
      merged.push({
        when: new Date(e.createdAt).getTime(),
        date: e.date,
        text: pieces.join('\n'),
      });
    }
    // 另外补充一些"记录"里用户明确关联到 Ta 的条目（category=confidant）作为外部线索
    const related = activities
      .filter(a => a.confidantId === confidant.id)
      .slice(0, 10);
    for (const a of related) {
      // 活动 description 形如 `[同伴] 名字：事件`，这里只拿冒号后的事件
      const text = a.description.includes('：') ? a.description.split('：').slice(1).join('：') : a.description;
      merged.push({
        when: new Date(a.date).getTime(),
        date: new Date(a.date).toLocaleDateString('zh-CN'),
        text: `事件：${text}`,
      });
    }
    merged.sort((a, b) => b.when - a.when);
    return merged.slice(0, 6).map(m => ({ date: m.date, text: m.text }));
  }, [confidant, activities, confidantEvents]);

  if (!isOpen || !confidant) return null;

  const card = TAROT_BY_ID[confidant.arcanaId];
  const charges = confidant.starShiftCharges ?? 0;

  const handleStartShift = async () => {
    if (charges <= 0) return;
    setErr(null);
    setStage('thinking');
    try {
      const r = await starShiftConfidant({
        settings,
        confidantName: confidant.name,
        arcanaName: card?.name ?? '塔罗',
        orientation: confidant.orientation,
        currentLevel: confidant.intimacy,
        previousDescription: confidant.description,
        previousInterpretation: confidant.aiInterpretation,
        previousAdvice: confidant.aiAdvice,
        changeNote: changeNote.trim(),
        recentActivities: recentActs,
      });
      setResult(r);
      setStage('preview');
    } catch (e) {
      setErr(e instanceof Error ? e.message : '星移失败');
      setStage('error');
    }
  };

  const handleConfirm = async () => {
    if (!result) return;
    try {
      await consumeStarShift(confidant.id, {
        description: result.description,
        interpretation: result.interpretation,
        advice: result.advice,
        orientation: result.orientation,
        summary: result.summary,
      });
      setStage('done');
      setTimeout(() => onClose(), 1400);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '保存失败');
      setStage('error');
    }
  };

  return (
    <AnimatePresence>
      {/* ⚠ 外层黑遮罩**不做淡入**：上面那层（整页恭喜/演出）一卸载，底下压着的
          同伴详情弹窗会先露出来；遮罩若再慢悠悠淡入，用户就会看到「先闪出一个详情窗、
          再冒出星移窗」（2026-10-16 用户报）。遮罩立即不透明即可；卡片本身仍走 spring 入场。 */}
      <motion.div
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[180] flex items-center justify-center p-4 bg-black/75"
        onClick={stage === 'thinking' ? undefined : onClose}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 280 }}
          className="sf-sheet"
          onClick={(e) => e.stopPropagation()}
        >
          <AnimatePresence mode="wait">
            {/* ── 星移输入阶段 ─────────────────────── */}
            {stage === 'input' && (
              <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="sf-body">
                <SheetHead confidant={confidant} subtitle={`星移 · 余 ${charges}`} onClose={onClose} />

                <div className="sf-field">
                  <label className="sf-label">你觉得你们的关系发生了什么变化？（可不填）</label>
                  <textarea
                    className="sf-input"
                    value={changeNote}
                    onChange={(e) => setChangeNote(e.target.value)}
                    rows={5}
                    maxLength={300}
                    placeholder="例如：最近几次见面 Ta 愿意和我谈更深入的事情了 / 吵了一架之后我们之间多了一份小心翼翼……"
                  />
                  <div className="sf-count">{changeNote.length} / 300</div>
                </div>

                {recentActs.length > 0 && (
                  <div className="sf-box">
                    <span className="k">最近 {recentActs.length} 条与 Ta 相关的记录（一同纳入星象推演）</span>
                    <div className="sf-scroll">
                      {recentActs.map((a, i) => (
                        <div key={i} className="sf-row">
                          <span className="d">{a.date}</span>
                          {a.text}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="sf-actions single">
                  <button
                    type="button"
                    className="sf-btn main"
                    onClick={handleStartShift}
                    disabled={charges <= 0}
                  >
                    ✧ 重新落墨（消耗 1 次）
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── AI 生成中 ────────────────────────── */}
            {stage === 'thinking' && (
              <motion.div key="thinking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="sf-body">
                <SheetHead confidant={confidant} subtitle="星象正在重写这段关系" onClose={onClose} hideClose />
                <div className="sf-center" style={{ padding: '36px 0' }}>
                  <div className="sf-spin">✦</div>
                  <p className="sf-sub" style={{ marginTop: 16 }}>星移中……</p>
                </div>
              </motion.div>
            )}

            {/* ── 预览（新旧对比） ──────────────────── */}
            {stage === 'preview' && result && (
              <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="sf-body">
                <SheetHead confidant={confidant} subtitle="预览新的落墨" onClose={onClose} />

                {result.summary && (
                  <div className="sf-box">
                    <span className="k">✧ 这次的变化</span>
                    <small style={{ color: 'var(--sf-ink)', fontWeight: 900 }}>{result.summary}</small>
                  </div>
                )}

                <DiffBlock title="关系描述" prev={confidant.description} next={result.description} />
                <DiffBlock title="解读" prev={confidant.aiInterpretation} next={result.interpretation} />
                <DiffBlock title="未来" prev={confidant.aiAdvice} next={result.advice} />

                {result.orientation !== confidant.orientation && (
                  <div className="sf-box">
                    <span className="k">牌面将调整</span>
                    <small>
                      从 <b>{confidant.orientation === 'upright' ? '正位' : '逆位'}</b> 改为{' '}
                      <b>{result.orientation === 'upright' ? '正位' : '逆位'}</b>
                    </small>
                  </div>
                )}

                <div className="sf-actions">
                  <button type="button" className="sf-btn ghost" onClick={() => setStage('input')}>
                    再想想
                  </button>
                  <button type="button" className="sf-btn main" onClick={handleConfirm}>
                    落墨
                  </button>
                </div>

                {result.source === 'offline' && (
                  <div className="sf-sub sf-center">· 本次为离线星移 ·</div>
                )}
              </motion.div>
            )}

            {/* ── 完成 ──────────────────────────────── */}
            {stage === 'done' && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="sf-body">
                <div className="sf-center" style={{ padding: '24px 0' }}>
                  <motion.div
                    className="sf-done-mark"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1, rotate: [0, 15, 0] }}
                    transition={{ type: 'spring', damping: 10, stiffness: 200 }}
                  >
                    ✧
                  </motion.div>
                  <p className="sf-sub" style={{ marginTop: 16 }}>这一次的落墨已经收进档案</p>
                </div>
              </motion.div>
            )}

            {/* ── 错误 ──────────────────────────────── */}
            {stage === 'error' && (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="sf-body">
                <div className="sf-center" style={{ padding: '24px 0' }}>
                  <div className="sf-sub" style={{ fontSize: 28 }}>☁</div>
                  <p className="sf-title" style={{ marginTop: 12 }}>{err || '出了点问题'}</p>
                </div>
                <div className="sf-actions single">
                  <button type="button" className="sf-btn ghost" onClick={() => setStage('input')}>
                    返回重试
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/** 页头：斜切标签（同伴名 + 等级）+ 副题 + 关闭键 */
function SheetHead({
  confidant,
  subtitle,
  onClose,
  hideClose,
}: {
  confidant: Confidant;
  subtitle?: string;
  onClose: () => void;
  hideClose?: boolean;
}) {
  const card = TAROT_BY_ID[confidant.arcanaId];
  return (
    <div className="sf-head">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span className="tag">
          {confidant.name} · Lv.{confidant.intimacy}
        </span>
        <span className="sf-sub">
          《{card?.name}》{subtitle ? ` · ${subtitle}` : ''}
        </span>
      </div>
      {!hideClose && (
        <button type="button" className="close" onClick={onClose} aria-label="关闭">
          ✕
        </button>
      )}
    </div>
  );
}

/** 新旧对比：旧的一条划掉、新的一条高亮 */
function DiffBlock({ title, prev, next }: { title: string; prev: string; next: string }) {
  return (
    <div className="sf-body" style={{ gap: 6 }}>
      <span className="sf-box k" style={{ background: 'transparent', padding: 0 }}>{title}</span>
      <div className="sf-old">{prev || '（无）'}</div>
      <div className="sf-new">{next}</div>
    </div>
  );
}
