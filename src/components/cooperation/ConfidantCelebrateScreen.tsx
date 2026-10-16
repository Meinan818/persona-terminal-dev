import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '@/store';
import type { Confidant } from '@/types';
import { TAROT_BY_ID } from '@/constants/tarot';
import { TarotCardSVG } from '@/components/astrology/TarotCardSVG';
import { INTIMACY_LABELS, buffsUnlockedInRange, formatBuffDisplay } from '@/utils/confidantLevels';
import '@/styles/confidant-celebrate.css';

/**
 * 羁绊升级「恭喜」整页 —— 2026-10-16 接回 App。
 *
 * 从已验收的概念 demo（outputs/bond-rankup-demo/index.html 的第二页）接回来的，
 * 取代原来藏在星移弹窗里的 celebrate 阶段（那个白卡片恭喜弹窗已删除）。
 * 信息一字不减：牌 / 等级 / 称谓 / 新解锁的能力 / 星移机会 / 两个按钮；
 * 版式换成本项目的 P3R 语言（平面色块 + 斜切 + 巨字），颜色全走 --p3r-*。
 *
 * 触发只有两条，都在组件之外判断：
 *   ① 升级演出点「确认」后 —— App 顶层的 ConfidantStarShiftInvite
 *   ② 打开同伴档案时补弹未庆祝的升级 —— ConfidantDetailModal
 *
 * portal 到 body 的原因与演出相同：App 的 `<div className="relative z-10">`
 * 是层叠上下文，留在树里的浮层对外只等效 z=10，会被任何 body 级 portal 压住。
 */

interface Props {
  confidant: Confidant;
  onClose: () => void;
  /** 点「使用星移」——由调用方决定接着弹星移弹窗还是别的 */
  onUseStarShift: () => void;
}

export function ConfidantCelebrateScreen({ confidant, onClose, onUseStarShift }: Props) {
  const settings = useAppStore(s => s.settings);

  const level = confidant.intimacy;
  const card = TAROT_BY_ID[confidant.arcanaId];
  const charges = confidant.starShiftCharges ?? 0;

  // 这次升级解锁了哪些能力：与升级演出的奖励胶囊共用同一口径（旧级之后、新级及以前）
  const unlocked = useMemo(
    () => buffsUnlockedInRange(confidant.buffs, level - 1, level),
    [confidant.buffs, level],
  );

  // Esc 逃生口：项目里其它庆祝浮层都保证「任何时刻能跳过」，这一页也不例外
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="cl-root"
      role="dialog"
      aria-modal="true"
      aria-label={`亲密度升级！${confidant.name} 达到亲密度 RANK ${level}`}
    >
      <div className="cl-wrap">
        <div className="cl-head cl-anim">
          <span className="tag">亲密度升级</span>
          <em className="en">INTIMACY UP</em>
        </div>

        <div className="cl-card cl-anim">
          {card && (
            <TarotCardSVG
              card={card}
              orientation={confidant.orientation}
              staticCard
              showOrientationTag={false}
            />
          )}
        </div>

        <div className="cl-rank cl-anim">
          RANK <b>{level}</b>
        </div>
        <div className="cl-sub cl-anim">
          《{card?.name ?? '塔罗'}》· {INTIMACY_LABELS[level] ?? ''}
        </div>
        <div className="cl-note cl-anim">亲密度到达 RANK {level}</div>

        {unlocked.length > 0 && (
          <div className="cl-panel cl-anim">
            <span className="k">新解锁的能力</span>
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

        <div className="cl-panel soft cl-anim">
          <span className="k">✧ 获得一次星移机会（余 {charges}）</span>
          <small>
            星移可以以当前的相处状态，为这段关系重新撰写描述、解读与未来；
            若关系发生质变（上一阶段 vs 现在），很值得用一次。
          </small>
        </div>

        {charges > 0 ? (
          <div className="cl-actions cl-anim">
            <button type="button" className="cl-btn ghost" onClick={onClose}>
              稍后再说
            </button>
            <button type="button" className="cl-btn main" onClick={onUseStarShift}>
              ✧ 使用星移
            </button>
          </div>
        ) : (
          <div className="cl-actions single cl-anim">
            <button type="button" className="cl-btn main" onClick={onClose}>
              欣然接受
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
