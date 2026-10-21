/**
 * PersonaStar —— 首页「人格指数」五角星（对应真实 FlowerChart + Dashboard 的花层/详情层逻辑）。
 *
 * 交互契约与真实 1:1：
 *   点某一维（星臂 / 标签）→ 星层 scale 1.38 / rotate 118° / 平移 12%,14% / opacity 0.18 沉为衬底、标签隐去
 *   → 原位展开属性详情（AttrDetailP4G）→ 点详情任意处倒放复原。点击处叠一圈独立波纹（不随星层旋转）。
 * 视觉：P4G Social Stats 五边形雷达 —— 黄黑大五角星底板 + 同心虚线五边形 + 橙色数据面，
 *   五个顶点挂 S.Link 式斜切黑签（名 + 大号斜体等级 + 称号）。字恒水平。
 * 只动 transform / opacity；低动效时星层改为淡化、不旋转。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useRef, type MouseEvent as RME } from 'react';
import type { Achievement, Attribute, AttributeId } from '@/types';
import { useLowMotion } from '@yellow/lib/prefs';
import { cx } from '@yellow/lib/cx';
import { P4Outline } from '@yellow/kit';
import { Sparkle4, RippleLayer, useRipples } from './bits';
import { ATTR_EN, LEVEL_THRESHOLDS, MASTERY_MAX_LEVEL, levelTitle, masteryOf, masteryTitle } from '@yellow/adapters/pkg1';

export interface StarItem { id: AttributeId; name: string; level: number; maxLevel: number; stars: number; points: number; title: string }

const ORDER: AttributeId[] = ['knowledge', 'guts', 'dexterity', 'kindness', 'charm'];
const polar = (i: number, r: number) => { const a = ((-90 + i * 72) * Math.PI) / 180; return [Math.cos(a) * r, Math.sin(a) * r] as const; };
const starPath = (R: number, r: number) => Array.from({ length: 10 }, (_, k) => { const [x, y] = polar(k / 2, k % 2 ? r : R); return `${k ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`; }).join(' ') + 'Z';
const pentagon = (r: number) => Array.from({ length: 5 }, (_, i) => polar(i, r).map((v) => v.toFixed(2)).join(',')).join(' ');

/** 标签位（相对容器 %）：顶 / 右上 / 右下 / 左下 / 左上 */
const LABEL_POS: { left: string; top: string }[] = [
  { left: '50%', top: '9.5%' },
  { left: '87%', top: '38%' },
  { left: '73%', top: '87%' },
  { left: '27%', top: '87%' },
  { left: '13%', top: '38%' },
];

export function PersonaStar({ items, selected, onSelect }: { items: StarItem[]; selected: AttributeId | null; onSelect: (id: AttributeId, e: RME) => void }) {
  const low = useLowMotion();
  const sorted = ORDER.map((id) => items.find((i) => i.id === id)!).filter(Boolean);
  const R = 100; // 星尖
  const ri = 40; // 星腰
  const data = sorted.map((it, i) => polar(i, 18 + (Math.min(it.level, it.maxLevel) / it.maxLevel) * 72 + Math.min(it.stars, 4) * 2.5));
  const showLabels = !selected;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[380px] select-none pt-1">
      {/* SVG 星盘 */}
      <svg viewBox="-130 -130 260 260" className="absolute inset-0 h-full w-full overflow-visible">
        {/* 外圈天气徽式同心环 */}
        <circle r={122} fill="none" stroke="var(--p4g-line)" strokeWidth={2} strokeDasharray="3 7" opacity={0.55} />
        <circle r={112} fill="none" stroke="var(--p4g-orange)" strokeWidth={5} opacity={0.9} strokeDasharray="60 10 6 10" />
        {/* 大五角星底板：黑描边 + 柠檬黄面 + 橙硬投影 */}
        <path d={starPath(R + 4, ri + 4)} transform="translate(5 6)" fill="var(--p4g-shadow-color)" opacity={0.9} />
        <path d={starPath(R + 4, ri + 4)} fill="var(--p4g-yellow-hi)" stroke="#111" strokeWidth={5} strokeLinejoin="miter" strokeMiterlimit={10} />
        {/* 同心五边形刻度（Lv 2/4/6/8/10）*/}
        {[0.2, 0.4, 0.6, 0.8, 1].map((k) => (
          <polygon key={k} points={pentagon(18 + k * 72)} fill="none" stroke="#111" strokeOpacity={k === 1 ? 0.55 : 0.28} strokeWidth={k === 1 ? 1.6 : 1} strokeDasharray={k === 1 ? undefined : '3 4'} />
        ))}
        {/* 轴线 */}
        {sorted.map((_, i) => { const [x, y] = polar(i, R); return <line key={i} x1={0} y1={0} x2={x} y2={y} stroke="#111" strokeOpacity={0.35} strokeWidth={1.2} />; })}
        {/* 数据面 */}
        <polygon points={data.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ')} fill="var(--p4g-orange)" fillOpacity={0.88} stroke="#111" strokeWidth={3.2} strokeLinejoin="round" />
        <polygon points={data.map(([x, y]) => `${(x * 0.62).toFixed(2)},${(y * 0.62).toFixed(2)}`).join(' ')} fill="#fff" fillOpacity={0.22} />
        {data.map(([x, y], i) => <rect key={i} x={x - 4.5} y={y - 4.5} width={9} height={9} transform={`rotate(45 ${x} ${y})`} fill="#111" stroke="var(--p4g-yellow)" strokeWidth={1.5} />)}
        {/* 中心：黑圆 + 黄四角星 */}
        <circle r={13} fill="#111" />
        <path d="M0 -10 C1 -3 3 -1 10 0 C3 1 1 3 0 10 C-1 3 -3 1 -10 0 C-3 -1 -1 -3 0 -10Z" fill="var(--p4g-yellow)" />
        {/* 星臂命中区（可点）：每一臂一个三角扇 */}
        {sorted.map((it, i) => {
          const [x1, y1] = polar(i - 0.5, ri + 10);
          const [x2, y2] = polar(i, R + 12);
          const [x3, y3] = polar(i + 0.5, ri + 10);
          return (
            <path key={it.id} d={`M0 0 L${x1} ${y1} L${x2} ${y2} L${x3} ${y3} Z`} fill="transparent" style={{ cursor: 'pointer' }}
              role="button" aria-label={`${it.name} Lv.${it.level}${it.stars ? ` 精通★${it.stars}` : ''}：查看详情`}
              onClick={(e) => onSelect(it.id, e as unknown as RME)} />
          );
        })}
      </svg>
      {/* 顶点标签（HTML，字恒水平）*/}
      {sorted.map((it, i) => (
        <motion.button
          key={it.id}
          type="button"
          tabIndex={showLabels ? 0 : -1}
          aria-label={`${it.name} Lv.${it.level}：查看详情`}
          onClick={(e) => onSelect(it.id, e)}
          className="absolute flex min-w-0 flex-col items-center"
          style={{ left: LABEL_POS[i].left, top: LABEL_POS[i].top, x: '-50%', y: '-50%', pointerEvents: showLabels ? 'auto' : 'none' }}
          initial={false}
          animate={{ opacity: showLabels ? 1 : 0, scale: showLabels || low ? 1 : 0.7 }}
          transition={{ duration: 0.16 }}
          whileTap={low ? undefined : { scale: 0.92 }}
        >
          <span className="relative flex items-end gap-1">
            <span className="bg-p4g-black px-1.5 py-[2px] font-display text-meta font-bold leading-none text-p4g-yellow shadow-[2px_2px_0_var(--p4g-orange)]" style={{ clipPath: 'polygon(4px 0,100% 0,calc(100% - 4px) 100%,0 100%)' }}>{it.name}</span>
          </span>
          <span className="flex items-baseline leading-none">
            <span className="font-display text-[10px] font-bold italic text-[color:var(--p4g-on-stage)]">Lv</span>
            <P4Outline size="clamp(26px,7.4vw,34px)" stroke={5} italic className="leading-none">{it.level}</P4Outline>
            {it.stars > 0 && <span className="ml-0.5 font-display text-meta font-bold text-p4g-orange [text-shadow:1px_1px_0_#111]">★{it.stars}</span>}
          </span>
          <span className="max-w-[92px] truncate rounded-xs bg-[color:var(--p4g-surface-2)] px-1 font-display text-[10px] font-bold leading-[14px] text-p4g-ink">{it.title}</span>
        </motion.button>
      ))}
      <Sparkle4 size={18} color="var(--p4g-white)" className="pointer-events-none absolute left-[20%] top-[18%] drop-shadow-[1px_1px_0_#111]" />
      <Sparkle4 size={14} color="var(--p4g-orange)" className="pointer-events-none absolute right-[18%] top-[62%]" />
    </div>
  );
}

/** 星层 + 详情层宿主：持有选中态与波纹，复刻真实 Dashboard 的 petalSection 结构 */
export function PersonaStarSection({ items, attributes, achievements, selected, onSelectedChange }: {
  items: StarItem[]; attributes: Attribute[]; achievements: Achievement[]; selected: AttributeId | null; onSelectedChange: (id: AttributeId | null) => void;
}) {
  const low = useLowMotion();
  const ref = useRef<HTMLDivElement>(null);
  const rp = useRipples();
  const sel = selected ? items.find((i) => i.id === selected) ?? null : null;
  return (
    <div ref={ref} className="relative overflow-hidden" style={{ minHeight: 'min(380px, calc(100vw - 32px))' }}>
      <motion.div
        className="absolute inset-x-0 top-0 z-0"
        initial={false}
        animate={selected
          ? (low ? { opacity: 0.16 } : { scale: 1.38, rotate: 118, x: '12%', y: '14%', opacity: 0.18 })
          : { scale: 1, rotate: 0, x: '0%', y: '0%', opacity: 1 }}
        transition={low ? { duration: 0.15 } : { type: 'spring', stiffness: 190, damping: 24 }}
        style={{ transformOrigin: 'center', pointerEvents: selected ? 'none' : 'auto' }}
      >
        <PersonaStar
          items={items}
          selected={selected}
          onSelect={(id, e) => {
            const r = ref.current?.getBoundingClientRect();
            if (r) rp.spawn(e.clientX - r.left, e.clientY - r.top);
            onSelectedChange(id);
          }}
        />
      </motion.div>
      <div className="relative z-10">
        <AnimatePresence mode="wait">
          {sel && (
            <AttrDetailP4G key={sel.id} item={sel} attribute={attributes.find((a) => a.id === sel.id)} achievements={achievements} onBack={() => onSelectedChange(null)} />
          )}
        </AnimatePresence>
      </div>
      <RippleLayer list={rp.list} remove={rp.remove} />
    </div>
  );
}

/**
 * AttrDetailP4G —— 对应真实 AttrDetailInlineP4：属性名/Lv/称号、进度（距 Lv.N+1 / 精通★N · 距下一颗 / 已达最高等级）、
 * 称号阶梯（◀ 现在）、精通星阶（满级时）、关联成就（空：这个方向还没有专属成就）、「点击任意处返回花瓣图 ▸」。
 * 视觉：P4G Status 页 —— 白字粗黑描边巨名 + 橙 LV 斜块 + 黑底 HP 式进度槽 + S.Link 行式阶梯。
 */
export function AttrDetailP4G({ item, attribute, achievements, onBack }: { item: StarItem; attribute?: Attribute; achievements: Achievement[]; onBack: () => void }) {
  const low = useLowMotion();
  const thresholds = attribute?.levelThresholds ?? LEVEL_THRESHOLDS;
  const lvlMax = thresholds.length || 5;
  const level = item.level;
  const points = item.points;
  const isMax = level >= lvlMax;
  const cur = level > 1 ? thresholds[level - 1] : 0;
  const next = !isMax ? thresholds[level] : thresholds[lvlMax - 1];
  const mastery = isMax && lvlMax >= MASTERY_MAX_LEVEL ? masteryOf(points) : null;
  const stars = mastery?.stars ?? 0;
  const progress = mastery ? mastery.progress : isMax ? 1 : Math.max(0, Math.min(1, (points - cur) / Math.max(1, next - cur)));
  const progressLabel = isMax ? (mastery ? `精通 ★${stars} · 距下一颗` : '已达最高等级') : `距 Lv.${level + 1}`;
  const progressValue = isMax ? (mastery ? `${mastery.step - mastery.toNext}/${mastery.step}` : 'MAX') : `${points - cur}/${next - cur}`;
  const curTitle = stars > 0 ? masteryTitle(item.id, stars) : levelTitle(item.id, level);
  const related = achievements.filter((a) => a.condition.attribute === item.id || a.condition.type === 'all_attributes_max');
  const unlocked = related.filter((a) => a.unlocked).length;

  const container = { show: { transition: { staggerChildren: low ? 0 : 0.06, delayChildren: 0.03 } }, hide: { transition: { staggerChildren: low ? 0 : 0.04, staggerDirection: -1 as const } } };
  const fromRight = low ? { hide: { opacity: 0 }, show: { opacity: 1 } } : { hide: { x: '118%', opacity: 0 }, show: { x: '0%', opacity: 1 } };
  const spring = low ? { duration: 0.12 } : { type: 'spring' as const, stiffness: 250, damping: 26 };

  const Head = ({ children }: { children: string }) => (
    <div className="mb-1.5 flex min-w-0 items-center gap-1.5">
      <Sparkle4 size={13} color="var(--p4g-orange)" />
      <span className="font-display text-meta font-bold text-[color:var(--p4g-on-stage)]">{children}</span>
      <span aria-hidden className="h-[2px] min-w-[12px] flex-1 bg-[color:var(--p4g-on-stage)] opacity-40" />
    </div>
  );

  return (
    <motion.div className="relative cursor-pointer pb-2 pt-1" onClick={onBack} variants={container} initial="hide" animate="show" exit="hide" role="region" aria-label={`${item.name} 详情（点击任意处返回）`}>
      {/* 巨名 + LV 斜块 */}
      <motion.div
        className="relative origin-top-left"
        initial={low ? { opacity: 0 } : { x: '30%', y: 40, scale: 0.58, opacity: 0 }}
        animate={low ? { opacity: 1 } : { x: ['30%', '8%', '0%'], y: [40, -8, 0], scale: [0.58, 0.94, 1], opacity: 1, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1], times: [0, 0.58, 1] } }}
        exit={{ opacity: 0, transition: { duration: 0.18 } }}
      >
        <div className="flex min-w-0 items-end gap-2">
          <P4Outline size="clamp(44px,13vw,64px)" stroke={7} italic className="leading-none">{item.name}</P4Outline>
          <span className="mb-1 min-w-0 truncate font-display text-meta font-bold italic tracking-[0.18em] text-[color:var(--p4g-on-stage)] opacity-80">{ATTR_EN[item.id]}</span>
          <Sparkle4 size={20} color="var(--p4g-orange)" className="mb-2 shrink-0" />
        </div>
        <div className="mt-2.5 flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="relative inline-flex items-baseline gap-1 border-3 border-p4g-black bg-p4g-orange px-3 py-0.5 shadow-hard-sm" style={{ transform: 'skewX(-10deg)' }}>
            <span className="flex items-baseline gap-1" style={{ transform: 'skewX(10deg)' }}>
              <span className="font-display text-cap font-bold tracking-wider text-p4g-black">LV</span>
              <span className="p4g-num text-h2 leading-none text-p4g-black">{level}</span>
              {stars > 0 && <span className="p4g-num text-meta text-p4g-black">★{stars}</span>}
            </span>
          </span>
          <span className="min-w-0 truncate bg-p4g-black px-2 py-0.5 font-display text-lead font-bold text-white night:bg-p4g-yellow night:text-p4g-black">{curTitle}</span>
          <span className="ml-auto p4g-num text-meta text-[color:var(--p4g-on-stage)] opacity-75">{points} pt</span>
        </div>
      </motion.div>

      {/* 进度（HP 槽式）*/}
      <motion.div className="relative mt-4" variants={fromRight} transition={spring}>
        <div className="mb-1 flex items-baseline justify-between font-display text-cap font-bold text-[color:var(--p4g-on-stage)]">
          <span>{progressLabel}</span>
          <span className="p4g-num text-meta">{progressValue}</span>
        </div>
        <div className="relative h-[14px] w-full overflow-hidden rounded-[3px] border-2 border-p4g-black bg-p4g-black">
          <div className="absolute inset-y-[2px] left-[2px] right-[2px] origin-left rounded-[1px] bg-gradient-to-r from-p4g-orange to-p4g-yellow" style={{ transform: `scaleX(${progress})` }} />
          <div aria-hidden className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent 0 18px, rgba(0,0,0,.45) 18px 20px)' }} />
        </div>
      </motion.div>

      {/* 称号阶梯 */}
      <motion.div className="relative mt-4" variants={fromRight} transition={spring}>
        <Head>称号阶梯</Head>
        <div className="grid grid-cols-1 overflow-hidden rounded-sm border-3 border-p4g-line shadow-hard wide:grid-cols-2">
          {Array.from({ length: lvlMax }, (_, i) => {
            const lv = i + 1, reached = level >= lv, current = level === lv;
            return (
              <div key={lv} className={cx('relative flex min-w-0 items-center gap-2.5 px-3 py-1.5 text-body', current ? 'bg-p4g-select text-[color:var(--p4g-select-ink)]' : reached ? 'text-p4g-ink' : 'text-p4g-ink opacity-60')} style={current ? undefined : { background: reached ? 'var(--p4g-surface-grad)' : 'var(--p4g-surface-2)' }}>
                <span className={cx('w-12 shrink-0 font-display text-meta font-bold italic', !current && 'text-[color:var(--p4g-rank)]')}>Lv.{lv}</span>
                <span className="min-w-0 flex-1 truncate font-display font-bold">{levelTitle(item.id, lv)}</span>
                {current && <span className="shrink-0 font-display text-2xs font-bold text-p4g-orange">◀ 现在</span>}
                {!reached && <span className="shrink-0 p4g-num text-2xs">{thresholds[i] ?? 0} pt</span>}
                {!current && <span aria-hidden className="absolute inset-x-0 bottom-0 h-[2px]" style={{ background: i % 2 ? 'var(--p4g-separator-b)' : 'var(--p4g-separator-a)' }} />}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* 精通星阶（站上 Lv.10 才出现）*/}
      {mastery && (
        <motion.div className="relative mt-4" variants={fromRight} transition={spring}>
          <Head>{`精通 · 每 ${mastery.step} 点一颗星`}</Head>
          <div className="grid grid-cols-1 overflow-hidden rounded-sm border-3 border-p4g-line shadow-hard">
            {Array.from({ length: stars + 1 }, (_, k) => k + 1).map((k) => {
              const reached = k <= stars, current = k === stars && reached;
              return (
                <div key={k} className={cx('flex min-w-0 items-center gap-2.5 px-3 py-1.5 text-body', current ? 'bg-p4g-select text-[color:var(--p4g-select-ink)]' : 'text-p4g-ink', !reached && 'opacity-60')} style={current ? undefined : { background: 'var(--p4g-surface-grad)' }}>
                  <span className="w-12 shrink-0 font-display text-meta font-bold italic text-p4g-orange [text-shadow:1px_1px_0_#111]">★{k}</span>
                  <span className="min-w-0 flex-1 truncate font-display font-bold">{masteryTitle(item.id, k)}</span>
                  {current && <span className="shrink-0 font-display text-2xs font-bold text-p4g-orange">◀ 现在</span>}
                  {!reached && <span className="shrink-0 font-display text-2xs font-bold">还差 {mastery.toNext} pt</span>}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* 关联成就 */}
      <motion.div className="relative mt-4" variants={fromRight} transition={spring}>
        <Head>{`关联成就（${unlocked}/${related.length}）`}</Head>
        {related.length === 0 ? (
          <div className="rounded-sm border-3 border-dashed border-p4g-line bg-[color:var(--p4g-surface-2)] px-3 py-4 text-center font-display text-meta font-bold text-p4g-ink-soft">这个方向还没有专属成就</div>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none', touchAction: 'pan-x' }} onClick={(e) => e.stopPropagation()}>
            {related.map((a) => (
              <div key={a.id} className={cx('flex w-[136px] shrink-0 flex-col gap-1 rounded-sm border-3 border-p4g-black px-3 py-2.5 shadow-hard-sm', a.unlocked ? 'bg-p4g-orange text-p4g-black' : 'bg-[color:var(--p4g-surface-2)] text-p4g-ink')}>
                <div className="flex items-center gap-1.5">
                  <span aria-hidden className="text-[16px] leading-none">{a.icon}</span>
                  {a.unlocked ? <span className="ml-auto bg-p4g-black px-1 font-display text-2xs font-bold text-p4g-yellow">GET!</span> : <span className="ml-auto font-display text-2xs font-bold opacity-60">LOCKED</span>}
                </div>
                <span className="truncate font-display text-meta font-bold">{a.title}</span>
                <span className={cx('truncate text-2xs font-bold', a.unlocked ? 'text-p4g-black/70' : 'text-p4g-ink-soft')}>{a.description}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      <motion.div className="relative mt-3 font-display text-cap font-bold text-[color:var(--p4g-on-stage)] opacity-70" variants={fromRight} transition={spring}>
        点击任意处返回花瓣图 ▸
      </motion.div>
    </motion.div>
  );
}
