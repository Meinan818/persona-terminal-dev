import { catalogPersonaChoices, createDefaultBattle } from './p5-combat-rules.js';
import { P5_ELEMENTS, P5_STATUS } from './p5r-battle-adapter.js';
import { PERSONALITIES } from './negotiation-rules.js';

const lab = document.querySelector('#lab');
const ELEMENTS = P5_ELEMENTS;
const STATUS = P5_STATUS;
const personaChoices = catalogPersonaChoices();
let heroPersonaId = 'arsene';
const newBattle = () => createDefaultBattle({
  heroPersonaIds: [
    heroPersonaId,
    ...['pixie', 'jack-o-lantern', 'angel'].filter(id => id !== heroPersonaId),
  ],
  activePersonaId: heroPersonaId,
});
let battle = newBattle();
let selectedEnemy = 'a';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pct = (value, max) => Math.max(0, Math.min(100, value / max * 100));

function notify(text) {
  let node = document.querySelector('.toast');
  if (!node) {
    node = document.createElement('p');
    node.className = 'toast';
    document.body.append(node);
  }
  node.textContent = text;
  node.classList.add('show');
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => node.classList.remove('show'), 2200);
}

function partyCard(member, current) {
  const persona = member.isPlayer ? member.masks[member.activeMask] : member.activePersona;
  const activePersona = persona?.name;
  const mask = activePersona && activePersona !== member.name ? ` · ${activePersona}` : '';
  return `<article class="unit ${current ? 'current' : ''} ${member.hp <= 0 ? 'dead' : ''}">
    <div><h2>${esc(member.name)}${esc(mask)}${persona ? ` <small>Lv.${persona.level}</small>` : ''}</h2><div class="meta">${member.guarding ? '<span class="chip">防御</span>' : ''}${member.hp <= 0 ? '<span class="chip down">倒下</span>' : ''}${persona ? `<span class="chip">力${persona.strength} 魔${persona.magic} 耐${persona.endurance} 速${persona.agility} 运${persona.luck}</span>` : ''}</div></div>
    <div class="bars">
      <div class="bar"><span>HP <b>${member.hp}</b>/${member.maxHp}</span><i style="--v:${pct(member.hp, member.maxHp)}%"></i></div>
      <div class="bar sp"><span>SP <b>${member.sp}</b>/${member.maxSp}</span><i style="--v:${pct(member.sp, member.maxSp)}%"></i></div>
    </div>
  </article>`;
}

function enemyCard(enemy) {
  const status = enemy.status ? `<span class="chip status">${esc(STATUS[enemy.status]?.label ?? enemy.status)}</span>` : '';
  const known = Object.entries(enemy.knownAffinities ?? {})
    .filter(([, affinity]) => affinity !== 'normal')
    .map(([element, affinity]) => `${ELEMENTS[element]?.label ?? element}${affinity === 'weak' ? '弱' : affinity === 'resist' ? '耐' : affinity === 'null' ? '无' : affinity === 'absorb' ? '吸' : '反'}`);
  const weakness = known.length ? `已发现 ${known.join(' / ')}` : '弱点未发现';
  return `<article class="unit enemy ${selectedEnemy === enemy.id ? 'selected' : ''} ${enemy.hp <= 0 ? 'dead' : ''}" data-target="${enemy.id}">
    <div><h2>${esc(enemy.name)}</h2><div class="meta"><span class="chip ${known.length ? 'weak' : ''}">${esc(weakness)}</span>${enemy.down ? '<span class="chip down">倒地</span>' : ''}${status}${enemy.enraged ? '<span class="chip">激怒</span>' : ''}${enemy.personality ? `<span class="chip">${esc(PERSONALITIES[enemy.personality]?.label ?? enemy.personality)}</span>` : ''}</div></div>
    <div class="bars"><div class="bar"><span>HP <b>${enemy.hp}</b>/${enemy.maxHp}</span><i style="--v:${pct(enemy.hp, enemy.maxHp)}%"></i></div></div>
  </article>`;
}

function actionButtons() {
  const actions = battle.actions;
  if (!actions.length) return '';
  return `<section class="actions"><h3>${esc(battle.actor?.name ?? '')} 的行动</h3><small>点敌人卡切换目标；换面具会消耗本回合行动。</small><div class="action-grid">${actions.map((action, index) => `<button class="action" data-action-index="${index}" ${action.disabled ? 'disabled' : ''}><b>${esc(action.label)}${action.cost ? ` · ${action.cost} SP` : ''}</b><small>${esc(action.detail)}</small></button>`).join('')}</div></section>`;
}

function holdUpPanel() {
  const enemy = battle.enemies.find(e => e.id === selectedEnemy) ?? battle.aliveEnemies[0];
  if (!enemy) return '';
  return `<section class="hold-up"><h3>HOLD UP！</h3><p>${esc(enemy.name)} 倒下了。你可以总攻击、交涉收服，或者继续打。</p><div class="hold-actions"><button class="primary" data-holdup="allOut">总攻击</button><button data-holdup="negotiate" data-option="threaten">威胁</button><button data-holdup="negotiate" data-option="flatter">讨好</button><button data-holdup="negotiate" data-option="reason">讲理</button><button data-holdup="negotiate" data-option="bribe">给 20 SP</button><button data-holdup="continue">继续战斗</button></div></section>`;
}

function resultPanel() {
  if (battle.phase === 'negotiation' && battle.result) {
    return `<section class="result"><h3>它接受了条件。</h3><p>${esc(battle.result.enemyName)}：收服为「${esc(battle.result.recruit.name)}」，或拿走 ${battle.result.reward.sp} SP + ${esc(battle.result.reward.item)}。</p><div class="result-actions"><button data-result="recruit">收服为面具</button><button data-result="reward">索要奖励</button></div></section>`;
  }
  if (battle.phase === 'result' && battle.result) {
    return `<section class="result"><h3>${battle.result.type === 'recruited' ? `收服 ${esc(battle.result.name)}` : `获得 ${esc(battle.result.item)}`}</h3><p>${battle.result.type === 'recruited' ? esc(battle.result.skillDesc) : `SP +${battle.result.sp}。`}</p><div class="result-actions"><button data-reset="1">再来一局</button></div></section>`;
  }
  if (battle.phase === 'victory' || battle.phase === 'defeat') {
    return `<section class="result"><h3>${battle.phase === 'victory' ? '战斗胜利' : '全员倒下'}</h3><p>${battle.phase === 'victory' ? '这一场打完了。' : '试试先防御，或者用 Baton Pass 把回合交给更合适的人。'}</p><div class="result-actions"><button data-reset="1">再来一局</button></div></section>`;
  }
  return '';
}

function render() {
  const s = battle.snapshot();
  const current = battle.actor;
  const aliveEnemies = battle.aliveEnemies;
  if (!aliveEnemies.some(e => e.id === selectedEnemy)) selectedEnemy = aliveEnemies[0]?.id ?? '';
  lab.innerHTML = `<div class="persona-loadout"><label>主战 Persona<select data-persona-select>${personaChoices.map(persona => `<option value="${persona.id}" ${persona.id === heroPersonaId ? 'selected' : ''}>${esc(persona.name)} · Lv.${persona.level} · ${esc(persona.element)}</option>`).join('')}</select></label><small>切换主战 Persona 会重开一局；战斗中的换面具消耗回合。</small></div><div class="board">
    <div class="turnbar"><b>第 ${s.round} 回合 · ${esc(s.actor ?? '—')} 行动</b><span class="${s.batonChain ? 'baton' : ''}">${s.batonChain ? `BATON PASS ×${s.batonChain} · 伤害 +${s.batonChain * 25}%` : 'P5 核心循环实验'}</span></div>
    <section class="team" aria-label="我方">${battle.party.map(member => partyCard(member, member.id === current?.id)).join('')}</section>
    <section class="team" aria-label="敌方">${battle.enemies.map(enemyCard).join('')}</section>
    ${battle.phase === 'holdUp' ? holdUpPanel() : battle.phase === 'party' ? actionButtons() : resultPanel()}
  </div>
  <section class="log"><h3>战斗日志 / BATTLE LOG</h3><ol>${s.log.map(line => `<li>${esc(line)}</li>`).join('')}</ol></section>`;
  const log = lab.querySelector('.log ol');
  if (log) log.scrollTop = log.scrollHeight;
}

function act(index) {
  const action = battle.actions[index];
  if (!action) return;
  const payload = { ...action };
  if (['skill', 'basic', 'gun', 'analyze'].includes(action.type) && selectedEnemy) payload.targetId = selectedEnemy;
  const result = battle.act(payload);
  if (!result.ok) notify(result.reason);
  render();
}

function holdUp(action, option) {
  const enemy = battle.enemies.find(e => e.id === selectedEnemy) ?? battle.aliveEnemies[0];
  const payload = action === 'negotiate'
    ? { type: 'negotiate', enemyId: enemy?.id, option }
    : { type: action };
  const result = battle.holdUp(payload);
  if (!result.ok) notify(result.reason);
  render();
}

lab.addEventListener('click', event => {
  const target = event.target.closest('[data-target],[data-action-index],[data-holdup],[data-result],[data-reset]');
  if (!target) return;
  if (target.dataset.target) {
    selectedEnemy = target.dataset.target;
    render();
    return;
  }
  if (target.dataset.actionIndex) {
    act(Number(target.dataset.actionIndex));
    return;
  }
  if (target.dataset.holdup) {
    holdUp(target.dataset.holdup, target.dataset.option);
    return;
  }
  if (target.dataset.result) {
    const result = battle.chooseResult(target.dataset.result);
    if (!result.ok) notify(result.reason);
    render();
    return;
  }
  if (target.dataset.reset) {
    battle = newBattle();
    selectedEnemy = 'a';
    render();
  }
});

lab.addEventListener('change', event => {
  const select = event.target.closest('[data-persona-select]');
  if (!select) return;
  heroPersonaId = select.value;
  battle = newBattle();
  selectedEnemy = 'a';
  render();
});

render();
