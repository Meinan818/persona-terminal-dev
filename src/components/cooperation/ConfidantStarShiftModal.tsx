import { motion, AnimatePresence } from 'motion/react';
import type { Confidant } from '@/types';
import { TAROT_BY_ID } from '@/constants/tarot';
import { useUiChannel } from '@/ui/useUiChannel';
import { confidantLiveryFor } from '@/components/cooperation/confidantLivery';
import { ConfidantStarShiftModalP5 } from '@/components/cooperation/ConfidantStarShiftModalP5';
import { ConfidantStarShiftModalP4 } from '@/components/cooperation/ConfidantStarShiftModalP4';
import { useStarShiftFlow } from '@/components/cooperation/useStarShiftFlow';
import '@/styles/confidant-starshift.css';

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
 * 颜色全走 --p3r-*，蓝 / 粉 / 黄 / 夜间自动跟随。
 *
 * 频道分流（Wave 3）：红频道（p5）走红黑剪报版 ConfidantStarShiftModalP5；
 * 黄频道（p4）走 P4 电视剪辑版；其余频道走下面这个 P3R 版实现。
 * 各版共用同一份业务逻辑（useStarShiftFlow），
 * 所以行为天然一致，切换只影响外观。
 */
export function ConfidantStarShiftModal(props: Props) {
  const livery = confidantLiveryFor(useUiChannel());
  if (livery === 'p5') return <ConfidantStarShiftModalP5 {...props} />;
  if (livery === 'p4') return <ConfidantStarShiftModalP4 {...props} />;
  return <StarShiftP3 {...props} />;
}

function StarShiftP3({ isOpen, confidant, onClose }: Props) {
  const {
    stage, setStage,
    changeNote, setChangeNote,
    result, err,
    recentActs, charges,
    handleStartShift, handleConfirm,
  } = useStarShiftFlow(isOpen, confidant, onClose);

  if (!isOpen || !confidant) return null;

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
