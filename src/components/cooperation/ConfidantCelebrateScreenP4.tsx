/**
 * 羁绊升级「恭喜」整页 · 黄频道（P4 CALL SHEET）版。
 *
 * 版式照用户已验收的黄色 demo 第二页：奶油节目单纸张 + 蓝天角 + 黑条
 * + 蓝色斜切按钮。信息与 p3/p5 版一字不减：等级 / 称谓 / 新解锁能力 /
 * 星移机会 / 两个按钮。
 *
 * 卡牌不在这棵树里——公共层的 P4 监视器承担跨屏主体；这一页只留内容。
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '@/store';
import type { Confidant } from '@/types';
import { TAROT_BY_ID } from '@/constants/tarot';
import { tarotArtUrl } from '@/constants/tarotArt';
import { INTIMACY_LABELS, buffsUnlockedInRange, formatBuffDisplay } from '@/utils/confidantLevels';
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

const FLOWER = 'M-0.9 -1.559C-2.9 -4.3 -4.8 -12 0 -12C4.8 -12 2.9 -4.3 0.9 -1.559C2.274 -4.661 7.992 -10.157 10.392 -6C12.792 -1.843 5.174 0.361 1.8 0C5.174 -0.361 12.792 1.843 10.392 6C7.992 10.157 2.274 4.661 0.9 1.559C2.9 4.3 4.8 12 0 12C-4.8 12 -2.9 4.3 -0.9 1.559C-2.274 4.661 -7.992 10.157 -10.392 6C-12.792 1.843 -5.174 -0.361 -1.8 0C-5.174 0.361 -12.792 -1.843 -10.392 -6C-7.992 -10.157 -2.274 -4.661 -0.9 -1.559Z';

interface Props {
  confidant: Confidant;
  onClose: () => void;
  onUseStarShift: () => void;
}

export function ConfidantCelebrateScreenP4({ confidant, onClose, onUseStarShift }: Props) {
  const settings = useAppStore(s => s.settings);
  const root = ensureP4CinemaRoot();
  const pageRef = useRef<HTMLDivElement>(null);
  const leavingRef = useRef(false);

  const level = confidant.intimacy;
  const card = TAROT_BY_ID[confidant.arcanaId];
  const artUrl = tarotArtUrl(confidant.arcanaId, 'p4');
  const charges = confidant.starShiftCharges ?? 0;
  const levelText = String(level).padStart(2, '0');

  const unlocked = useMemo(
    () => buffsUnlockedInRange(confidant.buffs, level - 1, level),
    [confidant.buffs, level],
  );

  useEffect(() => {
    if (!root) return;
    const release = claimP4Cinema();
    setP4MonitorArt(artUrl);
    requestP4Pose('page2');
    const raf = window.requestAnimationFrame(() => {
      revealInP4(pageRef.current, lastP4RelayOrigin());
      scaleInP4(pageRef.current?.querySelector('.p2-wrap') ?? null, 1.08, 720);
      popInP4(pageRef.current?.querySelectorAll('.p2-anim') ?? [], 1);
    });
    return () => {
      window.cancelAnimationFrame(raf);
      release();
    };
  }, [artUrl, root]);

  const closeWithRelay = useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    void runP4Relay('COOPERATION', () => onClose(), 'app', { dir: -1, arc: -100, lift: 90 });
  }, [onClose]);

  const shiftWithRelay = useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    void runP4Relay('STAR SHIFT', () => onUseStarShift(), 'page3', { dir: 1, arc: 100, lift: 110 });
  }, [onUseStarShift]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeWithRelay();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeWithRelay]);

  if (!root) return null;

  return createPortal(
    <div
      ref={pageRef}
      className="page2 on"
      role="dialog"
      aria-modal="true"
      aria-label={`亲密度升级！${confidant.name} 达到亲密度 RANK ${level}`}
    >
      <div className="p2-bg" aria-hidden="true">
        <div className="p2-sun" />
        <div className="p2-sky">
          <i /><i /><i />
          <svg viewBox="-12 -12 24 24"><path d={FLOWER} /></svg>
        </div>
        <div className="p2-dots" />
        <svg className="p2-bloom" viewBox="-12 -12 24 24"><path d={FLOWER} /></svg>
      </div>
      <div className="p2-sheet" aria-hidden="true" />

      <div className="p2-wrap">
        <div className="p2-head p2-anim">
          <div>
            <span className="p2-kicker">CALL SHEET · EP.{levelText}</span>
            <h2 className="p2-title">亲密度升级</h2>
            <em className="p2-en">INTIMACY UP</em>
          </div>
        </div>

        <div className="p2-strip p2-anim">
          <i className="dot" /><b>本期节目</b><span>《{card?.name ?? '塔罗'}》· {INTIMACY_LABELS[level] ?? ''}</span><em>ON AIR</em>
        </div>

        <div className="p2-rank p2-anim"><small>本期等级</small><b>{levelText}</b></div>
        <div className="p2-sub p2-anim">关系阶段 · {INTIMACY_LABELS[level] ?? ''}</div>
        <div className="p2-note p2-anim">亲密度到达 RANK {level} · 本期节目通关</div>

        {unlocked.length > 0 && (
          <div className="p2-panel p2-anim">
            <span className="k">NEW UNLOCK / 新解锁的能力</span>
            {unlocked.map(b => {
              const d = formatBuffDisplay(b, confidant.arcanaId, settings.attributeNames);
              return (
                <div key={b.id}>
                  <b>{d.title}</b>
                  <small>{d.description}</small>
                </div>
              );
            })}
          </div>
        )}

        <div className="p2-panel soft p2-anim">
          <span className="k">STAR SHIFT / 获得一次星移机会（余 {charges}）</span>
          <small>
            星移可以以当前的相处状态，为这段关系重新撰写描述、解读与未来；若关系发生质变（上一阶段 vs 现在），很值得用一次。
          </small>
        </div>

        {charges > 0 ? (
          <div className="p2-actions p2-anim">
            <button className="p2-btn ghost" type="button" onClick={closeWithRelay}>稍后再说</button>
            <button className="p2-btn main" type="button" onClick={shiftWithRelay}><span>✦ 使用星移</span></button>
          </div>
        ) : (
          <div className="p2-actions single p2-anim">
            <button className="p2-btn main" type="button" onClick={closeWithRelay}><span>欣然接受</span></button>
          </div>
        )}
      </div>
    </div>,
    root,
  );
}
