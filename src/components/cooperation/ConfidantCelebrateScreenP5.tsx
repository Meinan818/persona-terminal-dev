/**
 * 羁绊升级「恭喜」整页 · 红频道（P5 红黑剪报）版 —— 计划 Wave 2。
 *
 * 为什么独立成文件、不在 p3 版里加条件分支：两版视觉语言是**结构性**差异
 * （p3 是平面色块 + 深蓝/浅底换色，p5 是黑底剪报 + 纸卡硬影错位），塞进同一套 JSX
 * 会变成满屏 `isP5 ? … : …`；独立成文件则 p3 侧零风险、整块可回滚。
 * 分流由 ConfidantCelebrateScreen.tsx 的包装组件按 useUiChannel() 决定 ——
 * **本文件不判频道**，它只在 p5 时被渲染。
 *
 * 版式是**用户已验收的**红版 demo（outputs/bond-rankup-demo-p5/index.html 第二页
 * `.page2` / `.p2-*`）的逐字复刻，DOM 结构一一对应：
 *   .cl5-head(+ .tile 拼贴 / .cl5-en) / .cl5-card(img) / .cl5-rank /
 *   .cl5-sub / .cl5-note / .cl5-panel×2 / .cl5-actions(.cl5-btn)
 *
 * ⚠ 首版曾用 kit 的近似件（P5Panel / TarotCardSVG）拼，与 demo 像素差异 14.17%；
 *   用户要求「极致复原」后改为：卡面走**频道专属的 P5 位图**（tarotArtUrl(id,'p5')，
 *   与 demo 同一套素材，不再用通用矢量牌）、面板走 demo 的单层 clip-path。
 *
 * 信息与 p3 版**一字不减**（计划的硬要求）：
 *   ① 页头（拼贴标题 + INTIMACY UP）  ② 塔罗牌  ③ RANK 巨字  ④ 称号副行
 *   ⑤ 说明行「亲密度到达 RANK n」  ⑥ 新解锁的能力（可能为空，为空时整块不渲染）
 *   ⑦ 星移机会块  ⑧ 按钮组（有星移次数→两键；无→单键「欣然接受」）
 *
 * 红频道不挂 .dark（见 ui/channel.ts 的 syncDarkClass 铁律），故不写 dark 变体。
 */
import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '@/store';
import type { Confidant } from '@/types';
import { TAROT_BY_ID } from '@/constants/tarot';
import { tarotArtUrl } from '@/constants/tarotArt';
import { INTIMACY_LABELS, buffsUnlockedInRange, formatBuffDisplay } from '@/utils/confidantLevels';
import { P5R, P5CollageTitle, P5Dots } from '@/components/p5r/kit';
import { P5Rings, P5ScatterStars } from '@/components/cooperation/confidantP5Scenery';
import '@/styles/confidant-celebrate-p5.css';

interface Props {
  confidant: Confidant;
  onClose: () => void;
  /** 点「使用星移」——由调用方决定接着弹星移弹窗还是别的 */
  onUseStarShift: () => void;
}

export function ConfidantCelebrateScreenP5({ confidant, onClose, onUseStarShift }: Props) {
  const settings = useAppStore(s => s.settings);

  const level = confidant.intimacy;
  const card = TAROT_BY_ID[confidant.arcanaId];
  const artUrl = tarotArtUrl(confidant.arcanaId, 'p5');
  const charges = confidant.starShiftCharges ?? 0;

  // 与 p3 版、与升级演出的奖励胶囊共用同一口径（旧级之后、新级及以前）
  const unlocked = useMemo(
    () => buffsUnlockedInRange(confidant.buffs, level - 1, level),
    [confidant.buffs, level],
  );

  // Esc 逃生口：与 p3 版同口径——任何时刻能跳过
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="cl5-root"
      role="dialog"
      aria-modal="true"
      aria-label={`亲密度升级！${confidant.name} 达到亲密度 RANK ${level}`}
      style={{
        ['--cl5-red' as string]: P5R.red,
        ['--cl5-red-deep' as string]: P5R.redDeep,
        ['--cl5-red-hot' as string]: P5R.redHot,
        ['--cl5-ink' as string]: P5R.ink,
        ['--cl5-paper' as string]: P5R.paper,
        ['--cl5-grey' as string]: P5R.grey,
        ['--cl5-grey-light' as string]: P5R.greyLight,
        ['--cl5-orange' as string]: P5R.orange,
      }}
    >
      {/* 布景（照 demo .scenery）：网点 + 同心星 + 两条猩红斜带 + 散落描边星 + 暗角 */}
      <div className="cl5-scenery" aria-hidden>
        <P5Dots className="cl5-halftone" dot={1} gap={10} color={P5R.paper} />
        <P5Rings className="cl5-rings" />
        <div className="cl5-slab cl5-slab-a" />
        <div className="cl5-slab cl5-slab-b" />
        <P5ScatterStars className="cl5-stars" />
        <div className="cl5-vignette" />
      </div>

      <div className="cl5-wrap">
        {/* ① 页头：拼贴瓷砖标题 + 英文副标 */}
        <div className="cl5-head cl5-anim">
          <P5CollageTitle text="亲密度升级" size={30} />
          <em className="cl5-en">INTIMACY UP</em>
        </div>

        {/* ② 塔罗牌：P5 频道位图（照 demo <img> 同一套素材）+ 纸边红硬影 */}
        <div className="cl5-card cl5-anim">
          {artUrl && <img src={artUrl} alt={card?.name ?? '塔罗'} />}
        </div>

        {/* ③ RANK 巨字（数字走亮红）+ ④ 称号副行 + ⑤ 说明行 */}
        <div className="cl5-rank cl5-anim">
          RANK <b>{level}</b>
        </div>
        <div className="cl5-sub cl5-anim">
          《{card?.name ?? '塔罗'}》· {INTIMACY_LABELS[level] ?? ''}
        </div>
        <div className="cl5-note cl5-anim">亲密度到达 RANK {level}</div>

        {/* ⑥ 新解锁的能力（纸卡）。无解锁时整块不渲染，与 p3 版一致 */}
        {unlocked.length > 0 && (
          <div className="cl5-panel cl5-anim">
            <span className="cl5-k">新解锁的能力</span>
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

        {/* ⑦ 星移机会（纸卡，与 ⑥ 同制式 —— 照 demo 第二页，两块都是纸面） */}
        <div className="cl5-panel cl5-anim">
          <span className="cl5-k">✧ 获得一次星移机会（余 {charges}）</span>
          <small>
            星移可以以当前的相处状态，为这段关系重新撰写描述、解读与未来；
            若关系发生质变（上一阶段 vs 现在），很值得用一次。
          </small>
        </div>

        {/* ⑧ 按钮组：与 p3 版同判据——有次数给两键，无次数给单键「欣然接受」 */}
        {charges > 0 ? (
          <div className="cl5-actions cl5-anim">
            <button type="button" className="cl5-btn ghost" onClick={onClose}>
              稍后再说
            </button>
            <button type="button" className="cl5-btn main" onClick={onUseStarShift}>
              ✧ 使用星移
            </button>
          </div>
        ) : (
          <div className="cl5-actions single cl5-anim">
            <button type="button" className="cl5-btn main" onClick={onClose}>
              欣然接受
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
