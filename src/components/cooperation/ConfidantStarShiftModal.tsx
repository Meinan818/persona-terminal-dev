import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '@/store';
import { useShallow } from 'zustand/react/shallow';
import { useBackHandler } from '@/utils/useBackHandler';
import type { Confidant } from '@/types';
import { TAROT_BY_ID } from '@/constants/tarot';
import { starShiftConfidant, type StarShiftResult } from '@/utils/confidantAI';

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
  const accent = card?.accent || 'rgb(var(--color-bond-rgb))';
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
          className="no-scrollbar w-full max-w-md max-h-[92vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-3xl shadow-2xl relative"
          onClick={(e) => e.stopPropagation()}
          style={{
            boxShadow: `0 20px 60px -20px ${accent}66, 0 0 0 1px ${accent}22`,
          }}
        >
          <AnimatePresence mode="wait">
            {/* ── 星移输入阶段 ─────────────────────── */}
            {stage === 'input' && (
              <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 space-y-4">
                <Header confidant={confidant} accent={accent} onClose={onClose} subtitle={`星移 · 余 ${charges}`} />
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
                    你觉得你们的关系发生了什么变化？（可不填）
                  </label>
                  <textarea
                    value={changeNote}
                    onChange={(e) => setChangeNote(e.target.value)}
                    rows={5}
                    maxLength={300}
                    placeholder="例如：最近几次见面 Ta 愿意和我谈更深入的事情了 / 吵了一架之后我们之间多了一份小心翼翼……"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                  <p className="text-[10px] text-gray-400 mt-1 text-right">{changeNote.length} / 300</p>
                </div>

                {recentActs.length > 0 && (
                  <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="px-3 py-2 text-[10px] font-bold tracking-widest text-gray-400">
                      最近 {recentActs.length} 条与 Ta 相关的记录（一同纳入星象推演）
                    </div>
                    <div className="max-h-40 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                      {recentActs.map((a, i) => (
                        <div key={i} className="px-3 py-2 text-[11px]">
                          <span className="text-gray-400 tabular-nums mr-2">{a.date}</span>
                          <span className="text-gray-700 dark:text-gray-200">{a.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleStartShift}
                  disabled={charges <= 0}
                  className="w-full py-3 rounded-xl text-white font-bold text-sm shadow-lg disabled:opacity-40"
                  style={{
                    background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                    boxShadow: `0 10px 28px -12px ${accent}80`,
                  }}
                >
                  ✧ 重新落墨（消耗 1 次）
                </motion.button>
              </motion.div>
            )}

            {/* ── AI 生成中 ────────────────────────── */}
            {stage === 'thinking' && (
              <motion.div key="thinking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6">
                <Header confidant={confidant} accent={accent} onClose={onClose} subtitle="星象正在重写这段关系" hideClose />
                <div className="py-12 text-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-3xl text-white"
                    style={{ background: `linear-gradient(135deg, ${accent}, ${accent}99)` }}
                  >
                    ✦
                  </motion.div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-4">
                    星移中……
                  </p>
                </div>
              </motion.div>
            )}

            {/* ── 预览（新旧对比） ──────────────────── */}
            {stage === 'preview' && result && (
              <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 space-y-4">
                <Header confidant={confidant} accent={accent} onClose={onClose} subtitle="预览新的落墨" />

                {result.summary && (
                  <div className="p-3 rounded-xl text-center" style={{ background: `${accent}14`, border: `1px solid ${accent}44` }}>
                    <div className="text-[10px] font-bold tracking-widest mb-1" style={{ color: accent }}>
                      ✧ 这次的变化
                    </div>
                    <div className="text-sm font-bold text-gray-800 dark:text-gray-100">
                      {result.summary}
                    </div>
                  </div>
                )}

                <DiffBlock title="关系描述" prev={confidant.description} next={result.description} accent={accent} />
                <DiffBlock title="解读" prev={confidant.aiInterpretation} next={result.interpretation} accent={accent} />
                <DiffBlock title="未来" prev={confidant.aiAdvice} next={result.advice} accent={accent} />

                {result.orientation !== confidant.orientation && (
                  <div className="p-2.5 rounded-lg text-xs bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-center">
                    牌面将从 <b>{confidant.orientation === 'upright' ? '正位' : '逆位'}</b> 调整为 <b>{result.orientation === 'upright' ? '正位' : '逆位'}</b>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setStage('input')}
                    className="py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300"
                  >
                    再想想
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleConfirm}
                    className="py-2.5 rounded-xl text-white text-sm font-bold shadow-md"
                    style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}
                  >
                    落墨
                  </motion.button>
                </div>
                {result.source === 'offline' && (
                  <div className="text-[10px] text-gray-400 text-center">· 本次为离线星移 ·</div>
                )}
              </motion.div>
            )}

            {/* ── 完成 ──────────────────────────────── */}
            {stage === 'done' && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="p-10 text-center space-y-3">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, rotate: [0, 15, 0] }}
                  transition={{ type: 'spring', damping: 10, stiffness: 200 }}
                  className="w-16 h-16 rounded-full mx-auto flex items-center justify-center text-3xl text-white"
                  style={{ background: accent }}
                >✧</motion.div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  这一次的落墨已经收进档案
                </p>
              </motion.div>
            )}

            {/* ── 错误 ──────────────────────────────── */}
            {stage === 'error' && (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-10 text-center space-y-3">
                <div className="text-3xl">☁</div>
                <p className="text-sm text-gray-700 dark:text-gray-200">{err || '出了点问题'}</p>
                <button
                  onClick={() => setStage('input')}
                  className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-medium"
                >
                  返回重试
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Header({
  confidant,
  accent,
  subtitle,
  onClose,
  hideClose,
}: {
  confidant: Confidant;
  accent: string;
  subtitle?: string;
  onClose: () => void;
  hideClose?: boolean;
}) {
  const card = TAROT_BY_ID[confidant.arcanaId];
  return (
    <div className="flex items-center justify-between mb-2">
      <div>
        <h2 className="text-base font-bold text-gray-900 dark:text-white">
          {confidant.name}
          <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${accent}22`, color: accent }}>
            Lv.{confidant.intimacy}
          </span>
        </h2>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
          《{card?.name}》{subtitle ? ` · ${subtitle}` : ''}
        </p>
      </div>
      {!hideClose && (
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 text-gray-500 flex items-center justify-center"
          aria-label="关闭"
        >✕</button>
      )}
    </div>
  );
}

function DiffBlock({ title, prev, next, accent }: { title: string; prev: string; next: string; accent: string }) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] font-bold tracking-widest text-gray-400">{title}</div>
      <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/60 text-xs text-gray-500 dark:text-gray-400 line-through decoration-gray-400/60">
        {prev || '（无）'}
      </div>
      <div className="p-3 rounded-xl text-sm text-gray-800 dark:text-gray-100"
           style={{ background: `${accent}10`, border: `1px solid ${accent}44` }}>
        {next}
      </div>
    </div>
  );
}
