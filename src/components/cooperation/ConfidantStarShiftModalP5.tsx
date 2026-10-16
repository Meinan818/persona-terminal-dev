/**
 * 星移弹窗 · 红频道（P5 红黑剪报）版 —— 计划 Wave 3。
 *
 * 为什么独立成文件、不在 p3 版里加条件分支：两版视觉语言是**结构性**差异
 * （p3 是平面色块 + 浅底/深底换色，p5 是黑底剪报 + 纸卡硬影错位），塞进同一套 JSX
 * 会变成满屏 `isP5 ? … : …`；独立成文件则 p3 侧零风险、整块可回滚。
 * 分流由 ConfidantStarShiftModal.tsx 的包装组件按 useUiChannel() 决定 ——
 * **本文件不判频道**，它只在 p5 时被渲染。
 *
 * 业务逻辑（最近记录筛选 / AI 落墨 / 消耗次数）与 p3 版**共用同一个 hook**
 * （useStarShiftFlow.ts），所以两版行为天然一致，本文件只负责渲染。
 *
 * 五屏与 p3 版**一字不减**（计划的硬要求）：
 *   input    —— 页头（名·Lv / 《牌》· 星移·余 n / ✕）、变化标签、textarea（placeholder + 上限 300）、
 *               计数「n / 300」、最近 N 条记录的框（含条数）、按钮「✧ 重新落墨（消耗 1 次）」+ 次数为 0 时禁用
 *   thinking —— 页头（副题「星象正在重写这段关系」、无 ✕）、旋转标记、「星移中……」
 *   preview  —— 页头（副题「预览新的落墨」）、这次的变化（summary，条件）、
 *               三组新旧对比（关系描述 / 解读 / 未来）、牌面将调整（条件）、
 *               按钮「再想想 / 落墨」、「· 本次为离线星移 ·」（条件）
 *   done     —— ✧ 标记、「这一次的落墨已经收进档案」
 *   error    —— ☁、错误文本（兜底「出了点问题」）、按钮「返回重试」
 * 版式照**用户已验收的**红版 demo（outputs/bond-rankup-demo-p5/index.html 第三页）移植：
 * 黑底 + 纸卡/黑框斜切 + 硬影错位，色值全走 P5R 色板。
 *
 * 红频道不挂 .dark（见 ui/channel.ts 的 syncDarkClass 铁律），故不写 dark 变体。
 */
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef } from 'react';
import type { Confidant } from '@/types';
import { TAROT_BY_ID } from '@/constants/tarot';
import { tarotArtUrl } from '@/constants/tarotArt';
import { P5R } from '@/components/p5r/kit';
import { P5Rings, P5ScatterStars } from '@/components/cooperation/confidantP5Scenery';
import { useStarShiftFlow } from '@/components/cooperation/useStarShiftFlow';
import { lastP5SweepOrigin, p5ScaleInP5, popInP5, requestP5HeroPose, revealInP5, runP5Sweep, setP5HeroArt } from '@/components/cooperation/confidantP5Fx';
import '@/styles/confidant-starshift-p5.css';

interface Props {
  isOpen: boolean;
  confidant: Confidant | null;
  onClose: () => void;
}

export function ConfidantStarShiftModalP5({ isOpen, confidant, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);

  /**
   * 收场统一走转场（照 demo `exitPage3`）：主角牌翻回背面退回右缘 → 整页圆形收拢。
   * ⚠ 这个包一层要有：hook 里的自动关屏（落墨成功 1400ms 后）与 Android 返回键都直接调 onClose，
   *   只有把它传进 hook，那两条路径才同样带上转场。
   */
  const closeWithSweep = useCallback((origin?: { x: number; y: number }) => {
    void runP5Sweep('COOPERATION', () => {
      requestP5HeroPose('app');
      onClose();
    }, origin ?? lastP5SweepOrigin(), -1);
  }, [onClose]);

  const {
    stage, setStage,
    changeNote, setChangeNote,
    result, err,
    recentActs, charges,
    handleStartShift, handleConfirm,
  } = useStarShiftFlow(isOpen, confidant, closeWithSweep);

  const artUrl = confidant ? tarotArtUrl(confidant.arcanaId, 'p5') : null;

  /**
   * 入场（照 demo `showPage3`）：整页自上一屏的点击点圆形展开 + 内容列缩小回弹，
   * 主角牌翻回背面退到内容列右缘（它在这一屏是「背面朝外」的待命态）。
   */
  useEffect(() => {
    if (!isOpen || !confidant) return;
    const overlay = overlayRef.current;
    setP5HeroArt(artUrl);
    if (overlay) {
      revealInP5(overlay, lastP5SweepOrigin());
      const wrap = overlay.querySelector('.sf5-sheet');
      p5ScaleInP5(wrap);
    }
    requestP5HeroPose('page3');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, confidant?.id]);

  /** 四屏切换：新屏的直接子元素斜插错峰入场（照 demo `sfGo` → `popIn(新屏直接子元素)`） */
  useEffect(() => {
    if (!isOpen) return;
    const id = requestAnimationFrame(() => {
      const body = overlayRef.current?.querySelector('.sf5-body');
      if (body) popInP5(body.children, 1);
    });
    return () => cancelAnimationFrame(id);
  }, [isOpen, stage]);

  if (!isOpen || !confidant) return null;

  return (
    <AnimatePresence>
      {/* ⚠ 外层黑遮罩**不做淡入**：上面那层（整页恭喜/演出）一卸载，底下压着的
          同伴详情弹窗会先露出来；遮罩若再慢悠悠淡入，用户就会看到「先闪出一个详情窗、
          再冒出星移窗」（2026-10-16 用户报）。遮罩立即不透明即可；卡片本身仍走 spring 入场。
          此条与 p3 版同口径，两版都不做淡入。 */}
      <motion.div
        ref={overlayRef}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="sf5-overlay"
        style={{
          ['--sf5-red' as string]: P5R.red,
          ['--sf5-red-deep' as string]: P5R.redDeep,
          ['--sf5-red-hot' as string]: P5R.redHot,
          ['--sf5-ink' as string]: P5R.ink,
          ['--sf5-paper' as string]: P5R.paper,
          ['--sf5-paper-dim' as string]: P5R.paperDim,
          ['--sf5-grey' as string]: P5R.grey,
          ['--sf5-grey-light' as string]: P5R.greyLight,
          ['--sf5-orange' as string]: P5R.orange,
        }}
        onClick={stage === 'thinking' ? undefined : e => closeWithSweep({ x: e.clientX, y: e.clientY })}
      >
        {/* 布景（照 demo 第三页的 .scenery）：网点 + 同心星 + 两条猩红斜带 + 散落描边星 + 暗角。
            首版这扇窗**没有布景**，只有一层半透明黑遮罩 —— 于是红版星移与 demo 差了整块底子，
            也是「居中白框卡片」观感的来源。 */}
        <div className="sf5-scenery" aria-hidden>
          <div className="sf5-halftone" />
          <P5Rings className="sf5-rings" />
          <div className="sf5-slab sf5-slab-a" />
          <div className="sf5-slab sf5-slab-b" />
          <P5ScatterStars className="sf5-stars" />
          <div className="sf5-vignette" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="sf5-sheet"
          data-p5-hero-anchor="page3"
          onClick={(e) => e.stopPropagation()}
        >
          <AnimatePresence mode="wait">
            {/* ── ① 星移输入阶段 ─────────────────────── */}
            {stage === 'input' && (
              <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="sf5-body">
                <SheetHead confidant={confidant} subtitle={`星移 · 余 ${charges}`} onClose={() => closeWithSweep()} />

                <div className="sf5-field">
                  <label className="sf5-label">你觉得你们的关系发生了什么变化？（可不填）</label>
                  {/* ⚠ 输入框要包一层：textarea 是替换元素，自身不吃 ::before/::after ——
                      demo 的纸面与红错版两层垫层挂在 .sf-inputw 上。 */}
                  <div className="sf5-inputw">
                    <textarea
                      className="sf5-input"
                      value={changeNote}
                      onChange={(e) => setChangeNote(e.target.value)}
                      rows={5}
                      maxLength={300}
                      placeholder="例如：最近几次见面 Ta 愿意和我谈更深入的事情了 / 吵了一架之后我们之间多了一份小心翼翼……"
                    />
                  </div>
                  <div className="sf5-count">{changeNote.length} / 300</div>
                </div>

                {recentActs.length > 0 && (
                  <div className="sf5-box">
                    <span className="k">最近 {recentActs.length} 条与 Ta 相关的记录（一同纳入星象推演）</span>
                    <div className="sf5-scroll">
                      {recentActs.map((a, i) => (
                        <div key={i} className="sf5-row">
                          <span className="d">{a.date}</span>
                          <span>{a.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="sf5-actions single">
                  <button
                    type="button"
                    className="sf5-btn main"
                    onClick={handleStartShift}
                    disabled={charges <= 0}
                  >
                    ✧ 重新落墨（消耗 1 次）
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── ② AI 生成中 ────────────────────────── */}
            {stage === 'thinking' && (
              <motion.div key="thinking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="sf5-body">
                <SheetHead confidant={confidant} subtitle="星象正在重写这段关系" onClose={() => closeWithSweep()} hideClose />
                <div className="sf5-center sf5-pad-lg">
                  <div className="sf5-spin">✦</div>
                  <p className="sf5-sub sf5-mt">星移中……</p>
                </div>
              </motion.div>
            )}

            {/* ── ③ 预览（新旧对比） ──────────────────── */}
            {stage === 'preview' && result && (
              <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="sf5-body">
                <SheetHead confidant={confidant} subtitle="预览新的落墨" onClose={() => closeWithSweep()} />

                {result.summary && (
                  <div className="sf5-box">
                    <span className="k">✧ 这次的变化</span>
                    <small className="sf5-strong">{result.summary}</small>
                  </div>
                )}

                <DiffBlock title="关系描述" prev={confidant.description} next={result.description} />
                <DiffBlock title="解读" prev={confidant.aiInterpretation} next={result.interpretation} />
                <DiffBlock title="未来" prev={confidant.aiAdvice} next={result.advice} />

                {result.orientation !== confidant.orientation && (
                  <div className="sf5-box">
                    <span className="k">牌面将调整</span>
                    <small>
                      从 <b>{confidant.orientation === 'upright' ? '正位' : '逆位'}</b> 改为{' '}
                      <b>{result.orientation === 'upright' ? '正位' : '逆位'}</b>
                    </small>
                  </div>
                )}

                <div className="sf5-actions">
                  <button type="button" className="sf5-btn ghost" onClick={() => setStage('input')}>
                    再想想
                  </button>
                  <button type="button" className="sf5-btn main" onClick={handleConfirm}>
                    落墨
                  </button>
                </div>

                {result.source === 'offline' && (
                  <div className="sf5-sub sf5-center">· 本次为离线星移 ·</div>
                )}
              </motion.div>
            )}

            {/* ── ④ 完成 ──────────────────────────────── */}
            {stage === 'done' && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="sf5-body">
                <div className="sf5-center sf5-pad">
                  <motion.div
                    className="sf5-done-mark"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1, rotate: [0, 15, 0] }}
                    transition={{ type: 'spring', damping: 10, stiffness: 200 }}
                  >
                    ✧
                  </motion.div>
                  <p className="sf5-sub sf5-mt">这一次的落墨已经收进档案</p>
                </div>
              </motion.div>
            )}

            {/* ── ⑤ 错误 ──────────────────────────────── */}
            {stage === 'error' && (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="sf5-body">
                <div className="sf5-center sf5-pad">
                  <div className="sf5-sub sf5-cloud">☁</div>
                  <p className="sf5-title sf5-mt-sm">{err || '出了点问题'}</p>
                </div>
                <div className="sf5-actions single">
                  <button type="button" className="sf5-btn ghost" onClick={() => setStage('input')}>
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

/** 页头：同伴名·Lv 的斜切标签 + 《牌》副标 + 关闭键（与 p3 版同为可选隐藏） */
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
  const cardName = TAROT_BY_ID[confidant.arcanaId]?.name;
  return (
    <div className="sf5-head">
      <div className="sf5-who">
        <span className="tag">{confidant.name} · Lv.{confidant.intimacy}</span>
        <span className="sf5-sub">
          《{cardName}》{subtitle ? ` · ${subtitle}` : ''}
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

/** 新旧对比：旧的一条划掉、新的一条高亮（照 demo 的 .sf-old / .sf-new） */
function DiffBlock({ title, prev, next }: { title: string; prev: string; next: string }) {
  return (
    <div className="sf5-body sf5-gap-sm">
      <span className="sf5-diff-title">{title}</span>
      <div className="sf5-old">{prev || '（无）'}</div>
      <div className="sf5-new">{next}</div>
    </div>
  );
}
