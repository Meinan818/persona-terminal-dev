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
import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '@/store';
import type { Confidant } from '@/types';
import { TAROT_BY_ID } from '@/constants/tarot';
import { tarotArtUrl } from '@/constants/tarotArt';
import { INTIMACY_LABELS, buffsUnlockedInRange, formatBuffDisplay } from '@/utils/confidantLevels';
import { P5R, P5Dots } from '@/components/p5r/kit';
import { P5Rings, P5ScatterStars } from '@/components/cooperation/confidantP5Scenery';
import { claimP5Hero, lastP5SweepOrigin, p5ScaleInP5, popInP5, requestP5HeroPose, revealInP5, runP5Sweep, setP5HeroArt } from '@/components/cooperation/confidantP5Fx';
import '@/styles/confidant-celebrate-p5.css';

interface Props {
  confidant: Confidant;
  onClose: () => void;
  /** 点「使用星移」——由调用方决定接着弹星移弹窗还是别的 */
  onUseStarShift: () => void;
}

/**
 * 拼贴标题 —— **照 demo 的算法逐字复刻**（demo 的 collage()：mulberry32(333) +
 * 六组色调 + 每字 ±7° 微旋转）。
 *
 * 为什么不复用 kit 的 P5CollageTitle：那是别处（剪报标题通用件）的一套取色/取角规则，
 * 与本页 demo 的色块分布对不上（用户按像素比过：同一串字，每块纸片的底色与倾斜都不同）。
 * 这一页要的是「和 demo 一模一样」，所以把 demo 那段算法原样搬进来。
 */
const mulberry32 = (a: number) => () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** demo 的 tones 表：[底色, 文字色]，与 demo 同序 */
const COLLAGE_TONES: ReadonlyArray<readonly [string, string]> = [
  ['--cl5-red', '--cl5-paper'],
  ['--cl5-ink', '--cl5-paper'],
  ['--cl5-paper', '--cl5-ink'],
  ['--cl5-ink', '--cl5-red'],
  ['--cl5-paper', '--cl5-red'],
  ['--cl5-orange', '--cl5-ink'],
];

function collageTiles(text: string, seed: number) {
  const r = mulberry32(seed);
  return text.split('').map((ch, i) => {
    if (ch === ' ') {
      return { key: i, ch, bg: 'transparent', fg: 'var(--cl5-paper)', rot: '0deg' };
    }
    const tone = COLLAGE_TONES[Math.floor(r() * COLLAGE_TONES.length)];
    const rot = `${((r() * 2 - 1) * 7).toFixed(1)}deg`;
    return { key: i, ch, bg: `var(${tone[0]})`, fg: `var(${tone[1]})`, rot };
  });
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

  /**
   * 入场（照 demo `showPage2`）：上一屏的转场把这一页从点击点「圆形展开」出来 + 内容斜插错峰，
   * 同时主角牌从演出位滑到这一页内容列的左缘立着（牌面朝外）。
   *
   * 这一页是转场 apply() 时才挂载的新组件，自己拿不到点击点 —— 用 `lastP5SweepOrigin()` 接上一屏的圆心。
   */
  const rootRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = rootRef.current;
    const wrap = wrapRef.current;
    if (!root) return;
    // 占住主角牌（这一屏可能是从全局邀请进来的，也可能是档案里的本地浮层——两种都要有牌）
    const releaseHero = claimP5Hero();
    setP5HeroArt(artUrl);
    revealInP5(root, lastP5SweepOrigin());
    requestP5HeroPose('page2');
    if (wrap) {
      p5ScaleInP5(wrap);
      popInP5(wrap.querySelectorAll('.cl5-anim'), 1);
    }
    return releaseHero;
  }, [artUrl]);

  /** 点击点圆心（程序化点击的 clientX/Y 为 0 时退回元素中心，照 demo 的 originOf） */
  const originFrom = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX || r.left + r.width / 2, y: e.clientY || r.top + r.height / 2 };
  };

  return createPortal(
    <div
      ref={rootRef}
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

      <div className="cl5-wrap" ref={wrapRef} data-p5-hero-anchor="page2">
        {/* ① 页头：拼贴瓷砖标题 + 英文副标 */}
        <div className="cl5-head cl5-anim">
          <span className="cl5-tiles" aria-label="亲密度升级">
            {collageTiles('亲密度升级', 333).map(t => (
              <span
                key={t.key}
                className="cl5-tile"
                style={{ ['--bg' as string]: t.bg, ['--fg' as string]: t.fg, ['--rot' as string]: t.rot }}
              >
                {t.ch}
              </span>
            ))}
          </span>
          <em className="cl5-en">INTIMACY UP</em>
        </div>

        {/* ② 牌不放在页里 —— 由公共层的主角牌 #hero 承担（跨界面存活：它在内容列左缘立着）。
            ③ RANK 巨字（数字走亮红）+ ④ 称号副行 + ⑤ 说明行 */}
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
            <button
              type="button"
              className="cl5-btn ghost"
              onClick={e => {
                const origin = originFrom(e);
                void runP5Sweep('COOPERATION', () => {
                  requestP5HeroPose('app');
                  onClose();
                }, origin, -1);
              }}
            >
              稍后再说
            </button>
            <button
              type="button"
              className="cl5-btn main"
              onClick={e => {
                // 进星移：转场词 STAR SHIFT（照 demo showPage3）
                void runP5Sweep('STAR SHIFT', () => onUseStarShift(), originFrom(e), 1);
              }}
            >
              ✧ 使用星移
            </button>
          </div>
        ) : (
          <div className="cl5-actions single cl5-anim">
            <button
              type="button"
              className="cl5-btn main"
              onClick={e => {
                const origin = originFrom(e);
                void runP5Sweep('COOPERATION', () => {
                  requestP5HeroPose('app');
                  onClose();
                }, origin, -1);
              }}
            >
              欣然接受
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
