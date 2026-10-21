// recipe 加载：§3 时长上限表、repeatEvery 展开、schema/时间轴校验（skin:check 的运行时子集）、match 选择。
import type { EventName, Recipe, Track, PrimitiveName } from '../skins/_contract';

/** §3 上限（1 倍速，毫秒）：[完整/标准, 极简] */
export const CAPS: Record<string, [number, number]> = {
  'battle:start': [900, 350], 'turn:start': [300, 100], 'action': [1800, 600], 'action:enemy': [1500, 500],
  'unit:down': [500, 200], 'onemore': [450, 250], 'highlight': [3500, 1200], 'holdup': [1000, 400], 'allout': [3500, 1200],
  'talk:start': [800, 300], 'talk:result': [1200, 400], 'battle:end': [1500, 500], 'scene:enter': [600, 250], 'scene:leave': [600, 250],
  // M3 第二阶段 v1.3 提案（FX-MAP 🆕）：baton 0.6s、levelup 1.0s
  'baton': [600, 250], 'levelup': [1000, 400],
  'map:move': [800, 300], 'map:encounter': [900, 350], 'env:change': [600, 250], 'ui:open': [280, 150], 'ui:close': [280, 150],
};
export const capKey = (ev: EventName, side?: string) => (ev === 'action' && side === 'enemy' ? 'action:enemy' : ev);

/** §1 原语单项时长上限（用于校验） */
const PRIM_MAX: Partial<Record<PrimitiveName, number>> = {
  title: 800, radialBurst: 2200, hitStop: 90, shake: 400, flashSprite: 60, flashScreen: 200, afterimage: 300, slashLine: 200,
  damageNumber: 1100, tag: 920, shockwave: 520, rgbSplit: 150, cutin: 560, banner: 450, silhouetteDash: 1800, freezeFrame: 800,
  finishCard: 1000, totalDamage: 800, slashPanels: 900, maskWipe: 900, blockPush: 900, tvStatic: 600, glassShatter: 700,
  cardFlip: 500, cardShatter: 600, dateFlip: 900, bakedSwap: 400, portraitDown: 600, squashHit: 370,
  summon: 900, personaShow: 1100, eyeStrip: 700, onomatopoeia: 600, checkerFloor: 1200, ringSplash: 1000, batonPass: 800, showtimeLogo: 900, nameplate: 1200, pose: 1800, skinFilter: 1200,
  comicPanels: 1100, duoEntrance: 1100, duoStrike: 900, duoTitle: 1100, maskRip: 700,
};
export const IMPLEMENTED = new Set<PrimitiveName>([
  'tween', 'show', 'hide', 'sfx', 'vibrate', 'title', 'dim', 'radialBurst', 'hitStop', 'shake', 'flashSprite', 'flashScreen', 'squashHit',
  'particles', 'afterimage', 'slashLine', 'damageNumber', 'tag', 'shockwave', 'rgbSplit', 'cutin', 'speedLines', 'banner', 'silhouetteDash',
  'freezeFrame', 'finishCard', 'totalDamage', 'slashPanels', 'portraitDown', 'maskWipe', 'bakedSwap',
  'summon', 'personaShow', 'nameplate', 'pose', 'skinFilter', 'batonPass', 'showtimeLogo',
  'blockPush', 'tvStatic', 'glassShatter', 'cardFlip', 'cardShatter', 'dateFlip', 'eyeStrip', 'onomatopoeia', 'checkerFloor', 'ringSplash',
  'comicPanels', 'duoEntrance', 'duoStrike', 'duoTitle', 'maskRip',
] as PrimitiveName[]);

export function expand(r: Recipe): Track[] {
  const out: Track[] = [];
  for (const t of r.tracks) {
    if (t.repeatEvery && t.times) {
      for (let i = 0; i < t.times; i++) { const { repeatEvery, times, ...rest } = t; void repeatEvery; void times; out.push({ ...rest, at: t.at + i * t.repeatEvery }); }
    } else out.push(t);
  }
  return out.sort((a, b) => a.at - b.at);
}

export interface Issue { recipe: string; level: 'error' | 'warn'; msg: string }
export function validate(r: Recipe): Issue[] {
  const is: Issue[] = [], E = (msg: string) => is.push({ recipe: r.id, level: 'error', msg }), W = (msg: string) => is.push({ recipe: r.id, level: 'warn', msg });
  const cap = CAPS[capKey(r.event, r.match?.side)];
  if (!cap) E(`未知事件 ${r.event}`);
  else if (r.duration > cap[0]) E(`duration ${r.duration} > 上限 ${cap[0]}`);
  if ((r as any).handlers) E('含 handlers 字段（v1.1 已删除）');
  const tr = expand(r);
  if (tr.length > 64) E(`展开后轨道 ${tr.length} > 64`);
  let lastRgb = -1e9, lastShock = -1e9;
  for (const t of tr) {
    const end = t.at + (t.dur ?? 0);
    if (end > r.duration) E(`${t.prim}@${t.at} 结束于 ${end} > duration ${r.duration}`);
    const lim = PRIM_MAX[t.prim];
    if (lim && (t.dur ?? 0) > lim) E(`${t.prim} dur ${t.dur} > 原语上限 ${lim}`);
    if (t.prim === 'particles') {
      const life = (t.args.life as number) ?? 700;
      if (life > 900) E(`particles life ${life} > 900`);
      if (t.at + life > r.duration) E(`particles@${t.at} life ${life} 超出 duration`);
    }
    if (t.prim === 'rgbSplit') lastRgb = t.at;
    if (t.prim === 'shockwave') lastShock = t.at;
    if ((t.prim === 'rgbSplit' || t.prim === 'shockwave') && Math.abs(lastRgb - lastShock) < 150)
      W(`rgbSplit@${lastRgb} 与 shockwave@${lastShock} 相距 <150ms，引擎会推迟后者`);
    if (!IMPLEMENTED.has(t.prim)) W(`原语 ${t.prim} M3 第一阶段未实现，运行时按「已播完」处理`);
  }
  const hsMs = tr.filter((t) => t.prim === 'hitStop').reduce((a, t) => a + Math.min(90, (t.args.ms as number) ?? 70), 0);
  if (cap && r.duration + hsMs > cap[0]) E(`duration ${r.duration} + 停帧 ${hsMs} > 上限 ${cap[0]}（停帧冻结演出时钟，墙钟会超）`);
  if (r.hitMarks) {
    for (let i = 0; i < r.hitMarks.length; i++) {
      if (r.hitMarks[i] < 0) E('hitMark 为负');
      if (i && r.hitMarks[i] < r.hitMarks[i - 1]) E('hitMarks 未升序');
    }
    const last = r.hitMarks[r.hitMarks.length - 1];
    if (last > r.duration - 200) E(`末个 hitMark ${last} > duration−200`);
  }
  return is;
}

export interface MatchQuery { summon?: string; skillId?: string; element?: string; actorId?: string; partySize?: number; kind?: string; side?: string }
export function select(recipes: Recipe[], ev: EventName, q: MatchQuery): Recipe | undefined {
  let best: Recipe | undefined, bestScore = -1;
  for (const r of recipes) {
    if (r.event !== ev) continue;
    const m = r.match ?? {};
    let score = 0, ok = true;
    for (const [k, v] of Object.entries(m)) {
      if (k === 'env') continue;
      if ((q as any)[k] === v) score += k === 'skillId' ? 10 : 2; else { ok = false; break; }
    }
    if (ok && score > bestScore) { best = r; bestScore = score; }
  }
  return best;
}
