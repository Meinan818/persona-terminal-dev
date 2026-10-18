/**
 * P5 × P3 战斗规则切片（纯逻辑，无 UI）
 *
 * 验证 P5 的核心循环：
 *   弱点/暴击 → 1 More → Baton Pass → 全体倒地 → Hold Up
 *   → 总攻击 / 交涉收服 / 索要奖励 / 失败激怒
 * 外加：多人小队、多敌人、技术伤害、枪/防御/面具切换。
 *
 * 只做规则，不接正式 BattleEngine、不写正式存档。
 */

export const ELEMENTS = {
  knowledge: { label: '知识', en: 'PSY', status: 'confuse' },
  guts: { label: '勇气', en: 'PHYS', status: null },
  dexterity: { label: '灵巧', en: 'WIND', status: null },
  kindness: { label: '体贴', en: 'ICE', status: 'freeze' },
  charm: { label: '魅力', en: 'FIRE', status: 'burn' },
};

export const STATUS = {
  burn: { label: '燃烧', technicalWith: 'dexterity' },
  freeze: { label: '冻结', technicalWith: 'guts' },
  shock: { label: '触电', technicalWith: 'guts' },
  confuse: { label: '混乱', technicalWith: 'knowledge' },
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const roll = (rng, probability) => rng() < probability;

const PERSONALITY_MODS = {
  proud: { threaten: -20, flatter: 20, reason: 5, bribe: -5 },
  cowardly: { threaten: 25, flatter: 0, reason: 10, bribe: 10 },
  greedy: { threaten: -5, flatter: 5, reason: 0, bribe: 30 },
  wrathful: { threaten: 10, flatter: -15, reason: -10, bribe: 0 },
  calm: { threaten: -10, flatter: 5, reason: 25, bribe: 5 },
};

function makeSkill(id, name, element, power, sp, extra = {}) {
  return { id, name, element, power, sp, target: 'enemy', ...extra };
}

export function createDefaultBattle({ rng = Math.random } = {}) {
  const hero = {
    id: 'hero', name: '你', side: 'party', hp: 120, maxHp: 120, sp: 90, maxSp: 90,
    ammo: 3, isPlayer: true, activeMask: 'knowledge', switched: false, oneMoreUsed: false,
    guarding: false, attackUp: 0,
    masks: {
      knowledge: {
        name: '观测者', element: 'knowledge',
        skills: [
          makeSkill('starfall', '星落', 'knowledge', 36, 18, { status: 'confuse' }),
          makeSkill('echo', '回响', 'knowledge', 20, 8),
        ],
      },
      guts: {
        name: '反抗者', element: 'guts',
        skills: [
          makeSkill('thrust', '疾风刺', 'guts', 34, 12),
          makeSkill('endure', '不屈', 'guts', 0, 10, { target: 'self', guard: true }),
        ],
      },
      dexterity: {
        name: '织线者', element: 'dexterity',
        skills: [
          makeSkill('blade', '飞刃', 'dexterity', 32, 12),
          makeSkill('charge', '蓄力', 'dexterity', 0, 8, { target: 'self', attackUp: 1.3 }),
        ],
      },
    },
  };
  const allyHealer = {
    id: 'allyHealer', name: '守灯人', side: 'party', hp: 90, maxHp: 90, sp: 50, maxSp: 50,
    ammo: 0, isPlayer: false, guarding: false, attackUp: 0, oneMoreUsed: false,
    element: 'kindness',
    skills: [
      makeSkill('frost', '霜环', 'kindness', 24, 10, { status: 'freeze' }),
      makeSkill('heal', '微光', 'kindness', 30, 8, { target: 'ally', heal: true }),
    ],
  };
  const allyEcho = {
    id: 'allyEcho', name: '回声', side: 'party', hp: 85, maxHp: 85, sp: 50, maxSp: 50,
    ammo: 0, isPlayer: false, guarding: false, attackUp: 0, oneMoreUsed: false,
    element: 'charm',
    skills: [
      makeSkill('echoSlash', '回音斩', 'charm', 30, 12, { status: 'burn' }),
      makeSkill('inspire', '鼓舞', 'charm', 0, 8, { target: 'ally', attackUp: 1.3 }),
    ],
  };
  const enemies = [
    {
      id: 'a', name: '诡辩之影', hp: 72, maxHp: 72, attack: 14, weakness: 'guts', resist: 'knowledge',
      status: null, down: false, personality: 'proud', enraged: false,
      recruit: { name: '诡辩的假面', attribute: '知识', skillName: '诡辩', skillDesc: '下一次交涉时，先看穿对方的一句台词。' },
      reward: { sp: 30, item: '诡辩的碎片' },
    },
    {
      id: 'b', name: '刻薄之影', hp: 64, maxHp: 64, attack: 12, weakness: 'charm', resist: 'kindness',
      status: null, down: false, personality: 'greedy', enraged: false,
      recruit: { name: '刻薄的假面', attribute: '灵巧', skillName: '刻薄', skillDesc: '让敌人下一次攻击丢掉准头。' },
      reward: { sp: 24, item: '刻薄的碎片' },
    },
  ];
  return new P5Battle({ rng, party: [hero, allyHealer, allyEcho], enemies });
}

export class P5Battle {
  constructor({ rng = Math.random, party, enemies }) {
    this.rng = rng;
    this.party = party;
    this.enemies = enemies;
    this.round = 1;
    this.phase = 'party';
    this.currentId = party[0].id;
    this.extraId = null;
    this.extraPending = false;
    this.currentIsExtra = false;
    this.batonChain = 0;
    this.batonBoost = 0;
    this.result = null;
    this.log = [];
    this.push(`第 1 回合：${party.map(p => p.name).join(' / ')} vs ${enemies.map(e => e.name).join(' / ')}`);
  }

  push(text) {
    this.log.push(text);
    if (this.log.length > 90) this.log.splice(0, this.log.length - 90);
  }

  get actor() {
    return this.party.find(p => p.id === this.currentId && p.hp > 0) ?? null;
  }

  get aliveParty() {
    return this.party.filter(p => p.hp > 0);
  }

  get aliveEnemies() {
    return this.enemies.filter(e => e.hp > 0);
  }

  get allDown() {
    const alive = this.aliveEnemies;
    return alive.length > 0 && alive.every(e => e.down);
  }

  get elementOf() {
    const actor = this.actor;
    if (!actor) return 'knowledge';
    return actor.isPlayer ? actor.masks[actor.activeMask]?.element ?? 'knowledge' : actor.element;
  }

  get actions() {
    if (this.phase !== 'party' || !this.actor) return [];
    const actor = this.actor;
    const actions = [];
    const skills = actor.isPlayer ? actor.masks[actor.activeMask].skills : actor.skills;
    for (const item of skills) {
      actions.push({
        type: 'skill',
        id: item.id,
        label: item.name,
        detail: `${ELEMENTS[item.element]?.label ?? item.element} · ${item.target === 'ally' ? '我方' : item.target === 'self' ? '自身' : '敌方'}`,
        cost: item.sp,
        disabled: actor.sp < item.sp,
      });
    }
    actions.push({ type: 'basic', label: '普攻', detail: `${ELEMENTS[this.elementOf]?.label ?? '物理'} · 18`, cost: 0 });
    if (actor.isPlayer && actor.ammo > 0) {
      actions.push({ type: 'gun', label: '手枪', detail: `物理 · 26 · 弹药 ${actor.ammo}`, cost: 0 });
    }
    actions.push({ type: 'guard', label: '防御', detail: '本回合承伤减半', cost: 0 });
    if (actor.isPlayer) {
      for (const [maskId, mask] of Object.entries(actor.masks)) {
        if (maskId === actor.activeMask) continue;
        actions.push({ type: 'switchMask', id: maskId, label: `换面具 · ${mask.name}`, detail: ELEMENTS[mask.element]?.label ?? mask.element, cost: 0, free: true, disabled: actor.switched });
      }
    }
    if (this.enemies.some(e => e.hp > 0 && e.down) && this.aliveParty.length > 1) {
      for (const target of this.aliveParty) {
        if (target.id === actor.id) continue;
        actions.push({ type: 'batonPass', targetId: target.id, label: `BATON PASS → ${target.name}`, detail: `伤害 +${Math.min(3, this.batonChain + 1) * 25}%`, cost: 0 });
      }
    }
    return actions;
  }

  act(action) {
    if (this.phase !== 'party' || !this.actor) return { ok: false, reason: '现在不是你的回合。' };
    const actor = this.actor;
    if (action.type === 'switchMask') {
      if (!actor.isPlayer) return { ok: false, reason: '只有主角能换面具。' };
      if (actor.switched) return { ok: false, reason: '这一回合已经换过面具了。' };
      if (!actor.masks[action.id]) return { ok: false, reason: '没有这张面具。' };
      actor.activeMask = action.id;
      actor.switched = true;
      this.push(`你换上了「${actor.masks[action.id].name}」。`);
      return { ok: true };
    }
    const isExtra = this.extraId === actor.id && this.extraPending;
    this.currentIsExtra = isExtra;
    if (isExtra) this.extraPending = false;
    if (action.type === 'batonPass') {
      const target = this.party.find(p => p.id === action.targetId && p.hp > 0);
      if (!target || target.id === actor.id) return { ok: false, reason: '不能把回合传给自己。' };
      if (!this.enemies.some(e => e.hp > 0 && e.down)) return { ok: false, reason: '需要先让至少一个影子倒地。' };
      actor.acted = true;
      this.batonChain = clamp(this.batonChain + 1, 1, 3);
      this.batonBoost = this.batonChain * 0.25;
      this.currentId = target.id;
      this.extraId = target.id;
      this.extraPending = true;
      this.push(`BATON PASS → ${target.name}，伤害 +${this.batonChain * 25}%。`);
      return { ok: true };
    }
    if (action.type === 'guard') {
      actor.guarding = true;
      this.push(`${actor.name} 进入防御。`);
      this.afterAction(actor);
      return { ok: true };
    }
    if (action.type === 'basic' || action.type === 'gun') {
      const target = action.targetId
        ? this.aliveEnemies.find(e => e.id === action.targetId)
        : this.aliveEnemies[0];
      if (!target) return { ok: false, reason: '没有目标。' };
      if (action.type === 'gun') {
        if (actor.ammo <= 0) return { ok: false, reason: '没有子弹了。' };
        actor.ammo -= 1;
        this.hitEnemy(actor, target, { name: '手枪', element: 'guts', power: 26, crit: 0.2 });
      } else {
        this.hitEnemy(actor, target, { name: '普攻', element: this.elementOf, power: 18 });
      }
      this.afterAction(actor);
      return { ok: true };
    }
    if (action.type === 'skill') {
      const skills = actor.isPlayer ? actor.masks[actor.activeMask].skills : actor.skills;
      const item = skills.find(s => s.id === action.id);
      if (!item) return { ok: false, reason: '没有这个技能。' };
      if (actor.sp < item.sp) return { ok: false, reason: 'SP 不足。' };
      actor.sp -= item.sp;
      if (item.target === 'enemy') {
        const target = action.targetId
          ? this.aliveEnemies.find(e => e.id === action.targetId)
          : this.aliveEnemies[0];
        if (!target) return { ok: false, reason: '没有目标。' };
        this.hitEnemy(actor, target, item);
      } else if (item.target === 'ally' && item.heal) {
        const target = this.aliveParty.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
        const healed = Math.min(target.maxHp - target.hp, item.power);
        target.hp += healed;
        this.push(`${actor.name} 使用「${item.name}」→ ${target.name} 回复 ${healed} HP。`);
      } else if (item.target === 'ally' && item.attackUp) {
        const target = this.aliveParty.find(p => p.id !== actor.id) ?? actor;
        target.attackUp = Math.max(target.attackUp, item.attackUp);
        this.push(`${actor.name} 使用「${item.name}」→ ${target.name} 下一次攻击 ×${item.attackUp}。`);
      } else if (item.target === 'self' && item.guard) {
        actor.guarding = true;
        this.push(`${actor.name} 使用「${item.name}」→ 进入防御。`);
      } else if (item.target === 'self' && item.attackUp) {
        actor.attackUp = Math.max(actor.attackUp, item.attackUp);
        this.push(`${actor.name} 使用「${item.name}」→ 下一次攻击 ×${item.attackUp}。`);
      }
      this.afterAction(actor);
      return { ok: true };
    }
    return { ok: false, reason: '未知行动。' };
  }

  hitEnemy(actor, target, item) {
    const affinity = target.weakness === item.element ? 'weak' : target.resist === item.element ? 'resist' : 'normal';
    const technical = Boolean(target.status && STATUS[target.status]?.technicalWith === item.element);
    const crit = roll(this.rng, item.crit ?? 0.1);
    let mult = affinity === 'weak' ? 1.25 : affinity === 'resist' ? 0.5 : 1;
    if (technical) mult *= 1.5;
    if (crit) mult *= 1.5;
    if (this.batonBoost > 0) mult *= 1 + this.batonBoost;
    if (actor.attackUp > 1) mult *= actor.attackUp;
    const damage = Math.max(1, Math.round(item.power * mult));
    target.hp = Math.max(0, target.hp - damage);
    const labels = [];
    if (affinity === 'weak') labels.push('弱点');
    if (affinity === 'resist') labels.push('抗性');
    if (technical) labels.push('TECHNICAL');
    if (crit) labels.push('暴击');
    this.push(`${actor.name} 使用「${item.name}」→ ${target.name} 受到 ${damage} 伤害${labels.length ? `（${labels.join(' / ')}）` : ''}。`);
    if (item.status) {
      target.status = item.status;
      this.push(`${target.name} 陷入【${STATUS[item.status].label}】。`);
    }
    actor.attackUp = 0;
    this.batonBoost = 0;
    if ((affinity === 'weak' || crit || technical) && !target.down) {
      target.down = true;
      this.push(`${target.name} 倒下了。`);
      if (!actor.oneMoreUsed) {
        actor.oneMoreUsed = true;
        this.extraId = actor.id;
        this.extraPending = true;
        this.push(`${actor.name} 获得 1 MORE！`);
      }
    }
  }

  afterAction(actor) {
    if (this.aliveEnemies.length === 0) {
      this.phase = 'victory';
      this.result = { type: 'victory' };
      this.push('战斗胜利。');
      return;
    }
    if (this.allDown) {
      this.phase = 'holdUp';
      this.push('HOLD UP！所有影子都倒下了。');
      return;
    }
    if (this.currentIsExtra) {
      this.extraId = null;
      this.extraPending = false;
      this.currentIsExtra = false;
      this.finishActor(actor);
      return;
    }
    if (this.extraPending) return;
    this.finishActor(actor);
  }

  finishActor(actor) {
    actor.acted = true;
    if (this.extraId === actor.id && !this.extraPending) this.extraId = null;
    this.advance();
  }

  advance() {
    if (this.phase !== 'party') return;
    if (this.extraId) {
      this.currentId = this.extraId;
      return;
    }
    const next = this.party.find(p => p.hp > 0 && !p.acted);
    if (next) {
      this.currentId = next.id;
      return;
    }
    this.enemyPhase();
  }

  enemyPhase() {
    for (const enemy of this.aliveEnemies) {
      if (enemy.down) {
        this.push(`${enemy.name} 倒在地上，跳过了行动。`);
        enemy.down = false;
        continue;
      }
      const targets = this.aliveParty;
      const target = targets[Math.floor(this.rng() * targets.length)];
      if (!target) break;
      const raw = enemy.attack * (0.9 + this.rng() * 0.2) * (enemy.enraged ? 1.4 : 1);
      const damage = Math.max(1, Math.round(target.guarding ? raw * 0.5 : raw));
      target.hp = Math.max(0, target.hp - damage);
      this.push(`${enemy.name} 攻击 ${target.name}，造成 ${damage} 伤害${target.guarding ? '（防御减半）' : ''}。`);
      if (target.hp <= 0) this.push(`${target.name} 倒下了。`);
    }
    if (this.aliveParty.length === 0) {
      this.phase = 'defeat';
      this.result = { type: 'defeat' };
      this.push('全员倒下。战斗失败。');
      return;
    }
    for (const enemy of this.aliveEnemies) enemy.down = false;
    for (const member of this.party) {
      member.acted = false;
      member.guarding = false;
      member.oneMoreUsed = false;
      member.switched = false;
    }
    this.extraId = null;
    this.extraPending = false;
    this.currentIsExtra = false;
    this.batonChain = 0;
    this.batonBoost = 0;
    this.round++;
    this.currentId = this.aliveParty[0].id;
    this.push(`第 ${this.round} 回合。`);
  }

  holdUp(action) {
    if (this.phase !== 'holdUp') return { ok: false, reason: '现在不是 Hold Up。' };
    const actor = this.actor;
    if (action.type === 'allOut') {
      const power = 30 + this.aliveParty.length * 10;
      for (const enemy of this.aliveEnemies) {
        enemy.hp = Math.max(0, enemy.hp - power);
        enemy.down = false;
        this.push(`总攻击！${enemy.name} 受到 ${power} 伤害。`);
      }
      if (this.aliveEnemies.length === 0) {
        this.phase = 'victory';
        this.result = { type: 'victory' };
        this.push('总攻击收尾。战斗胜利。');
        return { ok: true };
      }
      this.phase = 'party';
      if (actor) this.finishActor(actor);
      return { ok: true };
    }
    if (action.type === 'negotiate') {
      const enemy = this.enemies.find(e => e.id === action.enemyId && e.hp > 0);
      if (!enemy) return { ok: false, reason: '没有这个影子。' };
      if (action.option === 'bribe' && this.actor.sp < 20) return { ok: false, reason: 'SP 不足 20。' };
      const base = 50 + (PERSONALITY_MODS[enemy.personality]?.[action.option] ?? 0) + 10 + (enemy.hp / enemy.maxHp < 0.35 ? 5 : 0);
      const finalChance = action.option === 'bribe' && this.actor.sp < 20 ? 0 : clamp(base, 10, 90);
      if (action.option === 'bribe') this.actor.sp -= 20;
      const success = roll(this.rng, finalChance / 100);
      this.push(`交涉（${action.option}）：把握 ${finalChance}% → ${success ? '成功' : '失败'}。`);
      if (success) {
        this.phase = 'negotiation';
        this.result = { type: 'negotiation', enemyId: enemy.id, enemyName: enemy.name, recruit: enemy.recruit, reward: enemy.reward };
        return { ok: true };
      }
      enemy.down = false;
      enemy.enraged = true;
      this.push(`${enemy.name} 被激怒了。`);
      this.phase = 'party';
      if (actor) this.finishActor(actor);
      return { ok: true };
    }
    if (action.type === 'continue') {
      for (const enemy of this.aliveEnemies) enemy.down = false;
      this.phase = 'party';
      this.push('你们没有理会它，继续战斗。');
      if (actor) this.finishActor(actor);
      return { ok: true };
    }
    return { ok: false, reason: '未知 Hold Up 行动。' };
  }

  chooseResult(type) {
    if (this.phase !== 'negotiation' || !this.result) return { ok: false, reason: '没有可领取的结果。' };
    const result = this.result;
    if (type === 'recruit') {
      this.result = { type: 'recruited', ...result.recruit };
    } else {
      this.result = { type: 'reward', ...result.reward };
    }
    this.phase = 'result';
    return { ok: true };
  }

  snapshot() {
    return {
      phase: this.phase,
      round: this.round,
      currentId: this.currentId,
      actor: this.actor?.name ?? null,
      extraId: this.extraId,
      batonChain: this.batonChain,
      batonBoost: this.batonBoost,
      party: this.party.map(p => ({ id: p.id, name: p.name, hp: p.hp, maxHp: p.maxHp, sp: p.sp, maxSp: p.maxSp, activeMask: p.activeMask, guarding: p.guarding })),
      enemies: this.enemies.map(e => ({ id: e.id, name: e.name, hp: e.hp, maxHp: e.maxHp, status: e.status, down: e.down, weakness: e.weakness, personality: e.personality, enraged: e.enraged })),
      result: this.result,
      log: [...this.log],
    };
  }
}
