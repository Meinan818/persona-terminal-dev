// 关卡 JSON 读取器（Q4）：把 specs/levels/Lxx.json（Hark 用 gen_levels.py 生成，Codex/引擎只读不改）转成规则层 MapDef。
// 格式说明见 docs/level-format.md。JSON 是权威；这里只做「照录」转换，PH 数值的取法写在下面常量旁。
import {
  enemy, prop, JOKER, SKULL, PANTHER, MONA, FOX, QUEEN, NOIR, ERINA, KASUMI, CROW, TOSHIRO_ESCORT, SKILLS,
} from '../rules/data';
import type {
  BonusDef, CameraDef, ChestDef, DashLink, DoorDef, ElevatorDef, EnemyRole, EventAction, EventTrigger, LoseCondition,
  MapDef, MapEvent, SkillDef, SwitchDef, TileKind, UnitDef, Vec, WinCondition,
} from '../rules/types';

/** Q7：最大地图尺寸（宽 × 高）与最大高度层 */
export const MAX_W = 32;
export const MAX_H = 40;
export const MAX_LEVEL_HEIGHT = 3;

export type XY = [number, number];
/** JSON 里的敌人 / 增援单位（hp/攻击 = "PH" 时用 enemy() 同 role 默认值，见 PH_HP） */
export interface LevelUnitJson {
  id: string; name: string; role: EnemyRole; hp: number | 'PH'; pos: XY; zone?: string;
  isLeader?: boolean; isTarget?: boolean; protected?: boolean; staysInZone?: string; aiTarget?: string;
  gunRange?: number; hpFloor?: number; bossPhase?: number; facing?: XY; note?: string;
  /** Hark 调过的占位数值（PH-tuned，等正版数据再换） */
  phTuned?: boolean;
}
export interface LevelPropJson { id: string; kind: 'box' | 'barrel' | 'speaker' | 'flag'; pos: XY; hp?: number | 'PH'; aura?: number; bans?: ('melee' | 'gun' | 'skill')[]; note?: string; phTuned?: boolean }
export interface LevelEventJson { id: string; when: Record<string, unknown> & { type: string }; do: (Record<string, unknown> & { type: string })[]; repeat?: boolean }
/** 队列 Q4 文字里的 reinforcements[{turn 或 trigger, units}]（现有 L01–L10 用 events 表达；这里也支持） */
export interface ReinforcementJson { turn?: number; phase?: 'player' | 'enemy'; trigger?: Record<string, unknown> & { type: string }; units: LevelUnitJson[] }
export interface LevelJson {
  id: string; name: string; scene?: string; width: number; height: number;
  win: WinCondition; objective?: string; turnTarget: number;
  party: [string, number, number][]; party_extra?: [string, number, number][]; reserves?: string[];
  lose?: LoseCondition[];
  doors?: { id: string; cells: XY[]; open: boolean; everyTurns?: number }[];
  switches?: { id: string; pos: XY; kind: SwitchDef['kind']; doors?: string[]; elevator?: string }[];
  elevators?: { id: string; cells: XY[]; low: number; high: number; up: boolean }[];
  links?: { a: XY; b: XY; kind: DashLink['kind'] }[];
  cameras?: { id: string; pos: XY; cells: XY[]; spawn: LevelUnitJson[]; damage?: number }[];
  chests?: { id: string; pos: XY; reward: Record<string, number> }[];
  props?: LevelPropJson[];
  enemies: LevelUnitJson[];
  events?: LevelEventJson[];
  reinforcements?: ReinforcementJson[];
  bonus?: BonusDef[];
  intent?: string;
  unlockedZones?: string[];
  tiles: string[]; heights?: string[]; zones?: string[];
}

/** hp = "PH"：用 data.ts 现有地图里 enemy() 同 role 的默认 HP（Hark 拿到 p5t/0_list/data.md 正版数据后换数） */
export const PH_HP: Record<EnemyRole, number> = { shooter: 60, brute: 70, revenger: 80, shielder: 70, teleporter: 60, launcher: 80, supporter: 55 };
/** 物件 hp = "PH"（旗子/喇叭）：PH，待 Hark 给数 */
export const PH_PROP_HP = { flag: 60, speaker: 30 } as const; // 10-23 Hark 决定（PH-tuned）；L07 JSON 已写明 60/30

const PARTY: Record<string, UnitDef> = {
  joker: JOKER, skull: SKULL, panther: PANTHER, mona: MONA, fox: FOX, queen: QUEEN, noir: NOIR, erina: ERINA, kasumi: KASUMI, crow: CROW,
  toshiro: TOSHIRO_ESCORT,
};
const TILE: Record<string, TileKind> = { '.': 'floor', '#': 'wall', h: 'half', H: 'full', E: 'exit' };

export const v = ([x, y]: XY): Vec => ({ x, y });

export class LevelError extends Error {}

function partyDef(id: string): UnitDef {
  const d = PARTY[id];
  if (!d) throw new LevelError(`未知我方角色 ${id}`);
  return { ...d, skills: [...d.skills] };
}

/** 敌人/增援单位 JSON → UnitDef（hpFloor 是比例 → 换成绝对 HP） */
export function enemyDef(u: LevelUnitJson): UnitDef {
  const hp = u.hp === 'PH' || u.hp == null ? PH_HP[u.role] : u.hp;
  const d = enemy(u.id, u.name, u.role, hp);
  if (u.zone) d.zone = u.zone;
  if (u.isLeader) d.isLeader = true;
  if (u.isTarget) d.isTarget = true;
  if (u.protected) d.protected = true;
  if (u.staysInZone) d.staysInZone = u.staysInZone;
  if (u.aiTarget) d.aiTarget = u.aiTarget;
  if (u.facing) d.facing = v(u.facing);
  if (u.gunRange != null) d.gun = { ...(d.gun ?? { power: 14 }), range: u.gunRange };
  if (u.hpFloor != null && u.hpFloor > 0) d.hpFloor = Math.floor(hp * u.hpFloor);
  return d;
}

export function propDef(p: LevelPropJson): UnitDef {
  const o: Partial<UnitDef> = {};
  if (p.kind === 'flag') {
    o.flagSide = 'enemy'; o.destructible = true; o.aura = p.aura ?? 3;
    o.maxHp = p.hp === 'PH' || p.hp == null ? PH_PROP_HP.flag : p.hp;
  }
  if (p.kind === 'speaker') {
    o.destructible = true; o.bans = p.bans; o.hardBan = true; // 关卡喇叭 = 硬禁用（Hark 10-23）
    o.maxHp = p.hp === 'PH' || p.hp == null ? PH_PROP_HP.speaker : p.hp;
  }
  return prop(p.id, p.kind, o);
}

function skillsOf(ids: unknown): SkillDef[] | undefined {
  if (!Array.isArray(ids)) return undefined;
  return ids.map((id) => (SKILLS as Record<string, SkillDef>)[String(id)]).filter(Boolean);
}

function trigger(w: Record<string, unknown> & { type: string }): EventTrigger {
  const t = { ...w } as Record<string, unknown>;
  if (Array.isArray(t.pos)) t.pos = v(t.pos as XY);
  return t as unknown as EventTrigger;
}

function action(a: Record<string, unknown> & { type: string }): EventAction {
  switch (a.type) {
    case 'spawn': return { type: 'spawn', units: (a.units as LevelUnitJson[]).map((u) => ({ def: enemyDef(u), pos: v(u.pos) })) };
    case 'moveUnit': return { type: 'moveUnit', unitId: String(a.unitId), pos: v(a.pos as XY) };
    case 'setUnit': {
      const patch = { ...(a.patch as Record<string, unknown>) } as Partial<UnitDef> & { skills?: unknown };
      const sk = skillsOf(patch.skills);
      if (sk) patch.skills = sk; else delete patch.skills;
      return { type: 'setUnit', unitId: String(a.unitId), patch: patch as Partial<UnitDef>, healRatio: a.healRatio as number | undefined, bossPhase: a.bossPhase as number | undefined };
    }
    default: return a as unknown as EventAction;
  }
}

/** 结构校验：尺寸、行长、字符、高度范围、坐标越界。返回错误列表（空 = 合法） */
export function validateLevel(j: LevelJson): string[] {
  const err: string[] = [];
  if (j.width < 1 || j.width > MAX_W || j.height < 1 || j.height > MAX_H) err.push(`尺寸 ${j.width}×${j.height} 超出 ${MAX_W}×${MAX_H}`);
  const rows = (name: string, r: string[] | undefined, ok: (c: string) => boolean) => {
    if (!r) return;
    if (r.length !== j.height) err.push(`${name} 行数 ${r.length} ≠ height ${j.height}`);
    r.forEach((row, y) => {
      if (row.length !== j.width) err.push(`${name}[${y}] 长度 ${row.length} ≠ width ${j.width}`);
      [...row].forEach((c, x) => { if (!ok(c)) err.push(`${name} (${x},${y}) 非法字符 '${c}'`); });
    });
  };
  rows('tiles', j.tiles, (c) => c in TILE);
  rows('heights', j.heights, (c) => /^[0-9]$/.test(c) && Number(c) <= MAX_LEVEL_HEIGHT);
  rows('zones', j.zones, (c) => /^[A-Z]$/.test(c));
  const inb = ([x, y]: XY) => x >= 0 && y >= 0 && x < j.width && y < j.height;
  const check = (what: string, p: XY) => { if (!inb(p)) err.push(`${what} 坐标 (${p}) 越界`); };
  j.party.forEach(([id, x, y]) => check(`party ${id}`, [x, y]));
  j.enemies.forEach((e) => check(`enemy ${e.id}`, e.pos));
  j.doors?.forEach((d) => d.cells.forEach((c) => check(`door ${d.id}`, c)));
  j.switches?.forEach((s) => check(`switch ${s.id}`, s.pos));
  j.chests?.forEach((c) => check(`chest ${c.id}`, c.pos));
  j.props?.forEach((p) => check(`prop ${p.id}`, p.pos));
  j.links?.forEach((l) => { check('link', l.a); check('link', l.b); });
  return err;
}

/** Q4 队列里的抽象格式视图：tiles[x][y] = { height, cover, zone } */
export interface CellInfo { kind: TileKind; height: number; cover: 'none' | 'half' | 'full'; zone: string | null }
export function cellAt(j: LevelJson, x: number, y: number): CellInfo {
  const kind = TILE[j.tiles[y][x]];
  return {
    kind,
    height: Number(j.heights?.[y]?.[x] ?? 0),
    cover: kind === 'half' ? 'half' : kind === 'full' ? 'full' : 'none',
    zone: j.zones?.[y]?.[x] ?? null,
  };
}

/** 关卡 JSON → MapDef（结构不合法抛 LevelError） */
export function loadLevel(j: LevelJson): MapDef {
  const errs = validateLevel(j);
  if (errs.length) throw new LevelError(`${j.id}: ${errs.join('; ')}`);
  const units: { def: UnitDef; pos: Vec }[] = [];
  for (const [id, x, y] of [...j.party, ...(j.party_extra ?? [])]) units.push({ def: partyDef(id), pos: { x, y } });
  for (const e of j.enemies) units.push({ def: enemyDef(e), pos: v(e.pos) });
  for (const p of j.props ?? []) units.push({ def: propDef(p), pos: v(p.pos) });
  const events: MapEvent[] = (j.events ?? []).map((e) => ({ id: e.id, when: trigger(e.when), do: e.do.map(action), repeat: e.repeat }));
  (j.reinforcements ?? []).forEach((r, i) => {
    const when: EventTrigger = r.trigger ? trigger(r.trigger) : { type: 'turn', turn: r.turn ?? 1, phase: r.phase ?? 'enemy' };
    events.push({ id: `reinf${i + 1}`, when, do: [{ type: 'spawn', units: r.units.map((u) => ({ def: enemyDef(u), pos: v(u.pos) })) }] });
  });
  const turnLimit = j.lose?.find((l): l is Extract<LoseCondition, { type: 'turnLimit' }> => l.type === 'turnLimit')?.n;
  const map: MapDef = {
    id: j.id, name: j.name, width: j.width, height: j.height,
    tiles: j.tiles.map((row) => [...row].map((c) => TILE[c])),
    heights: j.heights?.map((row) => [...row].map(Number)),
    zones: j.zones?.map((row) => [...row]),
    unlockedZones: j.zones ? (j.unlockedZones ?? ['A']) : undefined,
    links: (j.links ?? []).map((l) => ({ a: v(l.a), b: v(l.b), kind: l.kind })),
    units,
    reserves: (j.reserves ?? []).map(partyDef),
    win: JSON.parse(JSON.stringify(j.win)),
    objective: j.objective,
    turnTarget: j.turnTarget,
    turnLimit,
    lose: j.lose ? JSON.parse(JSON.stringify(j.lose)) : undefined,
    bonus: j.bonus,
    doors: (j.doors ?? []).map((d): DoorDef => ({ id: d.id, cells: d.cells.map(v), open: d.open, everyTurns: d.everyTurns })),
    switches: (j.switches ?? []).map((s): SwitchDef => ({ id: s.id, pos: v(s.pos), kind: s.kind, doors: s.doors, elevator: s.elevator })),
    elevators: (j.elevators ?? []).map((e): ElevatorDef => ({ id: e.id, cells: e.cells.map(v), low: e.low, high: e.high, up: e.up })),
    cameras: (j.cameras ?? []).map((c): CameraDef => ({ id: c.id, pos: v(c.pos), cells: c.cells.map(v), spawn: c.spawn.map((u) => ({ def: enemyDef(u), pos: v(u.pos) })), damage: c.damage })),
    chests: (j.chests ?? []).map((c): ChestDef => ({ id: c.id, pos: v(c.pos), reward: { ...c.reward } })),
    events,
  };
  return map;
}
