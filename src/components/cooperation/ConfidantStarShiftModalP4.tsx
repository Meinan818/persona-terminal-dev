/**
 * 星移弹窗 · 黄频道（P4 剪辑台）版。
 *
 * 版式照用户已验收的黄色 demo 第三页：奶油剪辑纸 + 蓝天角 + 黑色素材框
 * + 蓝色斜切主键。五屏（input / thinking / preview / done / error）与 p3/p5
 * 一字不减；业务逻辑共用 useStarShiftFlow，本文件只负责渲染。
 *
 * 转场/监视器在 confidantP4Cinema；本文件只做页面与内容。
 */
import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Confidant } from '@/types';
import { TAROT_BY_ID } from '@/constants/tarot';
import { tarotArtUrl } from '@/constants/tarotArt';
import { useStarShiftFlow } from '@/components/cooperation/useStarShiftFlow';
import {
  claimP4Cinema,
  ensureP4CinemaRoot,
  lastP4RelayOrigin,
  popInP4,
  requestP4Pose,
  revealInP4,
  runP4Relay,
  scaleInP4,
  setP4MonitorArt,
} from '@/components/cooperation/confidantP4Cinema';

const SPARK = 'M12 0C13.1 6.8 17.2 10.9 24 12C17.2 13.1 13.1 17.2 12 24C10.9 17.2 6.8 13.1 0 12C6.8 10.9 10.9 6.8 12 0Z';
const FLOWER = 'M-0.9 -1.559C-2.9 -4.3 -4.8 -12 0 -12C4.8 -12 2.9 -4.3 0.9 -1.559C2.274 -4.661 7.992 -10.157 10.392 -6C12.792 -1.843 5.174 0.361 1.8 0C5.174 -0.361 12.792 1.843 10.392 6C7.992 10.157 2.274 4.661 0.9 1.559C2.9 4.3 4.8 12 0 12C-4.8 12 -2.9 4.3 -0.9 1.559C-2.274 4.661 -7.992 10.157 -10.392 6C-12.792 1.843 -5.174 -0.361 -1.8 0C-5.174 0.361 -12.792 -1.843 -10.392 -6C-7.992 -10.157 -2.274 -4.661 -0.9 -1.559Z';

interface Props {
  isOpen: boolean;
  confidant: Confidant | null;
  onClose: () => void;
}

export function ConfidantStarShiftModalP4({ isOpen, confidant, onClose }: Props) {
  const root = ensureP4CinemaRoot();
  const pageRef = useRef<HTMLDivElement>(null);
  const leavingRef = useRef(false);
  const artUrl = confidant ? tarotArtUrl(confidant.arcanaId, 'p4') : null;

  const closeWithRelay = useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    void runP4Relay('COOPERATION', () => onClose(), 'app', { dir: -1, arc: -100, lift: 100 });
  }, [onClose]);

  const {
    stage, setStage,
    changeNote, setChangeNote,
    result, err,
    recentActs, charges,
    handleStartShift, handleConfirm,
  } = useStarShiftFlow(isOpen, confidant, closeWithRelay);

  useEffect(() => {
    if (!isOpen || !confidant || !artUrl || !root) return;
    const release = claimP4Cinema();
    setP4MonitorArt(artUrl);
    requestP4Pose('page3');
    const raf = window.requestAnimationFrame(() => {
      revealInP4(pageRef.current, lastP4RelayOrigin());
      scaleInP4(pageRef.current?.querySelector('.sf-wrap') ?? null, 1.08, 720);
      const active = pageRef.current?.querySelector('.sf-screen.on');
      if (active) popInP4(active.children, 1);
    });
    return () => {
      window.cancelAnimationFrame(raf);
      release();
    };
  }, [artUrl, confidant?.id, isOpen, root]);

  useEffect(() => {
    if (!isOpen) return;
    const raf = window.requestAnimationFrame(() => {
      const active = pageRef.current?.querySelector('.sf-screen.on');
      if (active) popInP4(active.children, 1);
    });
    return () => window.cancelAnimationFrame(raf);
  }, [isOpen, stage]);

  if (!isOpen || !confidant || !artUrl || !root) return null;

  const card = TAROT_BY_ID[confidant.arcanaId];
  const levelText = String(confidant.intimacy).padStart(2, '0');
  const tag = `${confidant.name} · Lv.${confidant.intimacy}`;
  const closeButton = (
    <button className="sf-x" type="button" data-sf-close aria-label="关闭" onClick={closeWithRelay}>✕</button>
  );

  return createPortal(
    <div ref={pageRef} className="page3 on" role="dialog" aria-modal="true" aria-label="星移剪辑">
      <div className="p3-bg" aria-hidden="true">
        <div className="sunrays" />
        <div className="halftone" />
        <svg className="p3-bloom" viewBox="-12 -12 24 24"><path d={FLOWER} /></svg>
      </div>

      <div className="sf-wrap">
        <section className={`sf-screen${stage === 'input' ? ' on' : ''}`} data-sf="input">
          <div className="sf-head">
            <div className="sf-who">
              <span className="tag2">{tag}</span>
              <span className="sub">《{card?.name ?? '塔罗'}》· 星移剪辑 · 余 {charges}</span>
            </div>
            {closeButton}
          </div>

          <div>
            <label className="sf-label" htmlFor="p4-sf-note">你觉得你们的关系发生了什么变化？（可不填）</label>
            <textarea
              className="sf-input"
              id="p4-sf-note"
              rows={4}
              maxLength={300}
              value={changeNote}
              onChange={e => setChangeNote(e.target.value)}
              placeholder="例如：最近几次见面 Ta 愿意和我谈更深入的事情了 / 吵了一架之后我们之间多了一份小心翼翼……"
            />
            <div className="sf-count"><span>{changeNote.length}</span> / 300</div>
          </div>

          {recentActs.length > 0 && (
            <div className="sf-box">
              <span className="k">最近 {recentActs.length} 条与 Ta 相关的素材（会一起纳入这次剪辑）</span>
              <div>
                {recentActs.map((a, i) => (
                  <div key={i} className="sf-row">
                    <span className="d">{a.date}</span>
                    <span>{a.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="sf-actions single">
            <button
              className="sf-btn main"
              type="button"
              onClick={() => void handleStartShift()}
              disabled={charges <= 0}
            >
              <span>✦ 重剪本期（消耗 1 次）</span>
            </button>
          </div>
        </section>

        <section className={`sf-screen${stage === 'thinking' ? ' on' : ''}`} data-sf="thinking">
          <div className="sf-head">
            <div className="sf-who">
              <span className="tag2">{tag}</span>
              <span className="sub">《{card?.name ?? '塔罗'}》· 星象正在重写这段关系</span>
            </div>
          </div>
          <div className="sf-center">
            <div className="tune-box" aria-hidden="true">
              <span className="tune-ring" />
              <svg className="tune-core" viewBox="0 0 24 24"><path d={SPARK} /></svg>
              <span className="tune-leds"><i /><i /><i /></span>
            </div>
            <div className="tune-bar" aria-hidden="true"><i /></div>
            <p className="sf-note">正在调频……</p>
            <p className="sf-note" style={{ maxWidth: 420, fontWeight: 600, lineHeight: 1.75 }}>
              星移会把最近的相处重新读一遍，再写下一版可能。
            </p>
          </div>
        </section>

        <section className={`sf-screen${stage === 'preview' ? ' on' : ''}`} data-sf="preview">
          <div className="sf-head">
            <div className="sf-who">
              <span className="tag2">{tag}</span>
              <span className="sub">《{card?.name ?? '塔罗'}》· 预览新的落墨</span>
            </div>
            {closeButton}
          </div>

          {result?.summary && (
            <div className="sf-box">
              <span className="k">✦ 这次的变化</span>
              <div style={{ fontSize: 'clamp(12px,1.6vw,14px)', fontWeight: 800, lineHeight: 1.7 }}>{result.summary}</div>
            </div>
          )}

          <div className="sf-diff">
            <span className="t">关系描述</span>
            <div className="sf-old">{confidant.description || '（无）'}</div>
            <div className="sf-new">{result?.description ?? ''}</div>
          </div>
          <div className="sf-diff">
            <span className="t">解读</span>
            <div className="sf-old">{confidant.aiInterpretation || '（无）'}</div>
            <div className="sf-new">{result?.interpretation ?? ''}</div>
          </div>
          <div className="sf-diff">
            <span className="t">未来</span>
            <div className="sf-old">{confidant.aiAdvice || '（无）'}</div>
            <div className="sf-new">{result?.advice ?? ''}</div>
          </div>

          {result && result.orientation !== confidant.orientation && (
            <div className="sf-box">
              <span className="k">牌面将调整</span>
              <div>
                从 <b>{confidant.orientation === 'upright' ? '正位' : '逆位'}</b> 改为{' '}
                <b>{result.orientation === 'upright' ? '正位' : '逆位'}</b>
              </div>
            </div>
          )}

          <div className="sf-actions">
            <button className="sf-btn ghost" type="button" onClick={() => setStage('input')}>再想想</button>
            <button className="sf-btn main" type="button" onClick={() => void handleConfirm()}><span>收录本剪</span></button>
          </div>

          {result?.source === 'offline' && (
            <div className="sf-note">· 本次为离线星移 ·</div>
          )}
        </section>

        <section className={`sf-screen${stage === 'done' ? ' on' : ''}`} data-sf="done">
          <div className="sf-head">
            <div className="sf-who">
              <span className="tag2">{tag}</span>
              <span className="sub">《{card?.name ?? '塔罗'}》· 本回放送完毕</span>
            </div>
          </div>
          <div className="sf-center">
            <div className="sf-done-mark">
              <svg viewBox="0 0 24 24" width="46" height="46" aria-hidden="true"><path d={SPARK} fill="var(--cream)" /></svg>
            </div>
            <h2 className="sf-done-title">本期已收录</h2>
            <p className="sf-note" style={{ fontSize: 'clamp(12px,1.7vw,15px)', color: 'var(--ink)', letterSpacing: '.08em' }}>
              新的关系描述、解读与未来已经收进档案
            </p>
            <span className="sf-done-tag">EP.{levelText} · COOPERATION</span>
          </div>
        </section>

        <section className={`sf-screen${stage === 'error' ? ' on' : ''}`} data-sf="error">
          <div className="sf-center">
            <div className="sf-error-mark">!</div>
            <p className="sf-note" style={{ fontSize: 'clamp(12px,1.7vw,15px)', color: 'var(--ink)', letterSpacing: '.1em' }}>
              {err || '星移没能完成，请稍后再试'}
            </p>
          </div>
          <div className="sf-actions single">
            <button className="sf-btn ghost" type="button" onClick={() => setStage('input')}>返回重试</button>
          </div>
        </section>
      </div>
    </div>,
    root,
  );
}
